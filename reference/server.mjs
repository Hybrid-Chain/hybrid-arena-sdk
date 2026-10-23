import {createServer} from 'node:http';
import {timingSafeEqual} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {privateDatabase} from '../dist/private-db.js';
import {canonicalJson,sha256,signRequest,MAX_BODY_BYTES,CONTRACT_VERSION} from '../dist/protocol.js';
import {validate} from '../dist/validate.js';

export const demoManifest=JSON.parse(readFileSync(new URL('../contracts/game-provider-v1/fixtures/demo-manifest.json',import.meta.url)));
// Public fixture authority, valid only in the disposable loopback sandbox.
export const demoKey={keyId:'demo-key',publisherId:'demo-studio',gameId:'demo-duel',environment:'sandbox',secretHex:'01'.repeat(32)};
class Failure extends Error {
  constructor(status,code,extra={}) { super(code); this.status=status;this.code=code;this.extra=extra; }
}
const fail=(status,code,extra)=>{throw new Failure(status,code,extra);};

export function createReferenceServer({databasePath,manifest=demoManifest,keys=[demoKey],now=Date.now,onAfterCommit}={}) {
  validate('GameManifest',manifest);
  const outcomes=new Set(manifest.outcomes.map(o=>o.outcome_id));
  if(outcomes.size!==manifest.outcomes.length)throw Error('Duplicate outcomes');
  const keyIds=new Set(),secrets=new Set();
  for(const k of keys){
    signRequest({...k,method:'GET',path:'/v1/receipts/'+'0'.repeat(32),body:''});
    if(keyIds.has(k.keyId)||secrets.has(k.secretHex)||!/^[a-z0-9][a-z0-9_-]{0,63}$/.test(k.gameId)||
      k.enabled!==undefined&&typeof k.enabled!=='boolean'||
      [k.notBefore,k.expires].some(v=>v!==undefined&&(!Number.isSafeInteger(v)||v<0))||
      k.notBefore!==undefined&&k.expires!==undefined&&k.expires<=k.notBefore)throw Error('Duplicate or invalid source scope');
    keyIds.add(k.keyId);secrets.add(k.secretHex);
  }
  const manifestHash=sha256(canonicalJson(manifest)),db=privateDatabase(databasePath);
  db.exec(`CREATE TABLE IF NOT EXISTS binding(manifest_sha256 TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS nonces(key_id TEXT NOT NULL,nonce TEXT NOT NULL,expires INTEGER NOT NULL,PRIMARY KEY(key_id,nonce));
    CREATE TABLE IF NOT EXISTS matches(id TEXT PRIMARY KEY,epoch TEXT NOT NULL,doc TEXT NOT NULL,state TEXT NOT NULL,last_sequence INTEGER NOT NULL,last_time INTEGER NOT NULL,last_tick INTEGER,last_batch TEXT);
    CREATE TABLE IF NOT EXISTS events(match_id TEXT NOT NULL,sequence INTEGER NOT NULL,event_id TEXT NOT NULL,doc TEXT NOT NULL,PRIMARY KEY(match_id,sequence),UNIQUE(match_id,event_id));
    CREATE TABLE IF NOT EXISTS receipts(request_id TEXT PRIMARY KEY,method TEXT NOT NULL,path TEXT NOT NULL,digest TEXT NOT NULL,doc TEXT NOT NULL);`);
  const tx=fn=>{db.exec('BEGIN IMMEDIATE');try{const r=fn();db.exec('COMMIT');return r;}catch(e){db.exec('ROLLBACK');throw e;}};
  try {tx(()=>{
    const bound=db.prepare('SELECT manifest_sha256 AS digest FROM binding').get();
    if(bound&&bound.digest!==manifestHash)throw Error('Reference release binding changed; preserve original database');
    if(!bound)db.prepare('INSERT INTO binding VALUES(?)').run(manifestHash);
  });}catch(e){db.close();throw e;}
  function authenticate(req,body) {
    if(req.headers.origin||req.headers.cookie||req.headers.authorization)fail(403,'browser_authority_rejected');
    const header=n=>{
      const name='x-arena-'+n;
      if(req.rawHeaders.filter((_,i)=>i%2===0&&req.rawHeaders[i].toLowerCase()===name).length!==1)fail(401,'invalid_signature');
      const v=req.headers[name];if(typeof v!=='string')fail(401,'invalid_signature');return v;
    };
    const keyId=header('key-id'),publisher=header('publisher'),environment=header('environment');
    const timestamp=header('timestamp'),nonce=header('nonce'),signature=header('signature');
    const key=keys.find(k=>k.keyId===keyId);
    if(!key||key.enabled===false||key.notBefore!==undefined&&key.notBefore>now()||key.expires!==undefined&&key.expires<=now()||
      key.publisherId!==publisher||key.environment!==environment||!/^\d{1,12}$/.test(timestamp)||Math.abs(now()/1000-Number(timestamp))>60||
      !/^[a-f0-9]{32}$/.test(nonce)||!/^[a-f0-9]{64}$/.test(signature))fail(401,'invalid_signature');
    let expected;
    try{expected=signRequest({...key,method:req.method,path:req.url,body,timestamp,nonce})['X-Arena-Signature'];}catch{fail(401,'invalid_signature');}
    if(!timingSafeEqual(Buffer.from(signature,'hex'),Buffer.from(expected,'hex')))fail(401,'invalid_signature');
    if(key.publisherId!==manifest.publisher_id||key.gameId!==manifest.game_id)fail(403,'scope_rejected');
    tx(()=>{
      db.prepare('DELETE FROM nonces WHERE expires<=?').run(now());
      if(db.prepare('SELECT 1 FROM nonces WHERE key_id=? AND nonce=?').get(keyId,nonce))fail(409,'nonce_replay');
      if(db.prepare('SELECT count(*) AS n FROM nonces WHERE key_id=?').get(keyId).n>=6000)fail(429,'nonce_capacity');
      db.prepare('INSERT INTO nonces VALUES(?,?,?)').run(keyId,nonce,now()+120000);
    });
    return key;
  }
  function parsed(body,schema){
    let value;
    try {value=JSON.parse(body);if(canonicalJson(value)!==body)fail(400,'noncanonical_json');validate(schema,value);}
    catch(e){if(e instanceof Failure)throw e;fail(400,'invalid_payload');}
    if(value.publisher_id!==manifest.publisher_id||value.game_id!==manifest.game_id)fail(403,'scope_rejected');
    return value;
  }
  function original(id,method,path,digest){
    const r=db.prepare('SELECT * FROM receipts WHERE request_id=?').get(id);
    if(r&&(r.method!==method||r.path!==path||r.digest!==digest))fail(409,'request_conflict');
    return r?JSON.parse(r.doc):null;
  }
  function receipt(id,kind,value,digest,state,first,last){
    const r={schema:'arena.game.receipt.v1',request_id:id,kind,publisher_id:manifest.publisher_id,game_id:manifest.game_id,
      match_id:value.match_id,epoch:value.epoch,request_sha256:digest,manifest_sha256:manifestHash,
      first_sequence:first,last_sequence:last,state,accepted_at:new Date(now()).toISOString(),assurance:'local_reference_only',anchor:null,payout_authorized:false};
    validate('Receipt',r);return r;
  }
  function saveReceipt(req,id,digest,r){db.prepare('INSERT INTO receipts VALUES(?,?,?,?,?)').run(id,req.method,req.url,digest,canonicalJson(r));return r;}
  function createMatch(req,body){
    const value=parsed(body,'MatchRequest'),digest=sha256(body);
    return tx(()=>{
      const old=original(value.request_id,req.method,req.url,digest);if(old)return {receipt:old,replayed:true};
      if(['game_version','ruleset_id','ruleset_version'].some(k=>value[k]!==manifest[k]))fail(409,'release_mismatch');
      if(new Set(value.participants.map(p=>p.actor_id)).size!==value.participants.length||value.participants.some(p=>!outcomes.has(p.outcome_id)))fail(400,'invalid_participants');
      if(db.prepare('SELECT 1 FROM matches WHERE id=?').get(value.match_id))fail(409,'match_conflict');
      if(db.prepare('SELECT count(*) AS n FROM matches').get().n>=10000)fail(503,'reference_capacity');
      db.prepare("INSERT INTO matches VALUES(?,?,?,'created',0,0,NULL,NULL)").run(value.match_id,value.epoch,canonicalJson(value));
      return {receipt:saveReceipt(req,value.request_id,digest,receipt(value.request_id,'match.created',value,digest,'created',null,0)),replayed:false};
    });
  }
  function append(req,body,pathId){
    const value=parsed(body,'EventBatch'),digest=sha256(body);
    if(value.match_id!==pathId)fail(400,'match_path_mismatch');
    return tx(()=>{
      const old=original(value.batch_id,req.method,req.url,digest);if(old)return {receipt:old,replayed:true};
      const row=db.prepare('SELECT * FROM matches WHERE id=?').get(value.match_id);
      if(!row)fail(404,'match_not_found');
      if(row.epoch!==value.epoch)fail(409,'epoch_mismatch');
      if(['held','completed','canceled'].includes(row.state))fail(409,'match_closed');
      if(value.first_sequence!==row.last_sequence+1)fail(409,'sequence_gap',{expected_sequence:row.last_sequence+1});
      if(value.previous_batch_sha256!==row.last_batch)fail(409,'batch_chain_mismatch');
      const actors=new Set(JSON.parse(row.doc).participants.map(p=>p.actor_id));
      let state=row.state,time=row.last_time,tick=row.last_tick,sequence=row.last_sequence;
      for(let i=0;i<value.events.length;i++){
        const e=value.events[i],p=e.payload;
        if(e.sequence!==sequence+1||e.game_time_ms<time||e.source_tick!==undefined&&tick!==null&&e.source_tick<tick)fail(409,'event_order_rejected');
        if(e.occurred_at){const d=new Date(e.occurred_at);if(!Number.isFinite(d.getTime())||d.toISOString().slice(0,19)!==e.occurred_at.slice(0,19))fail(400,'invalid_occurrence_time');}
        if(e.type==='match_started'){if(state!=='created')fail(409,'duplicate_start');state='live';}
        else if(e.type==='source_gap'){state='held';}
        else if(e.type==='match_canceled'){state='canceled';}
        else {
          if(state!=='live')fail(409,'match_not_live');
          if(e.type==='score_changed'&&!outcomes.has(p.outcome_id))fail(400,'invalid_outcome');
          if(e.type==='game_event'&&[p.actor_id,p.target_actor_id].some(a=>a!==undefined&&!actors.has(a)))fail(400,'unbound_actor');
          if(e.type==='match_completed'){
            if(p.winner!==null&&!outcomes.has(p.winner)||p.scores.length!==outcomes.size||new Set(p.scores.map(s=>s.outcome_id)).size!==outcomes.size||p.scores.some(s=>!outcomes.has(s.outcome_id)))fail(400,'invalid_result');
            state='completed';
          }
        }
        if(['held','completed','canceled'].includes(state)&&i!==value.events.length-1)fail(409,'terminal_not_last');
        if(db.prepare('SELECT 1 FROM events WHERE match_id=? AND event_id=?').get(value.match_id,e.event_id))fail(409,'event_id_conflict');
        db.prepare('INSERT INTO events VALUES(?,?,?,?)').run(value.match_id,e.sequence,e.event_id,canonicalJson(e));
        sequence=e.sequence;time=e.game_time_ms;if(e.source_tick!==undefined)tick=e.source_tick;
      }
      db.prepare('UPDATE matches SET state=?,last_sequence=?,last_time=?,last_tick=?,last_batch=? WHERE id=?').run(state,sequence,time,tick,digest,value.match_id);
      return {receipt:saveReceipt(req,value.batch_id,digest,receipt(value.batch_id,'events.accepted',value,digest,state,value.first_sequence,sequence)),replayed:false};
    });
  }
  async function bodyOf(req){
    let size=0;const chunks=[];
    for await(const b of req){size+=b.length;if(size>MAX_BODY_BYTES)fail(413,'body_too_large');chunks.push(b);}
    try{return new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks));}
    catch{fail(400,'invalid_utf8');}
  }
  const server=createServer(async(req,res)=>{
    const reply=(status,value)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(canonicalJson(value));};
    try {
      if(req.method==='GET'&&req.url==='/v1/status')return reply(200,{schema:'arena.game.reference-status.v1',contract_version:CONTRACT_VERSION,scope:'local_reference_only',production_ingestion:false,payout_authority:false,chain_publication:false});
      const matchPath=/^\/v1\/matches\/([a-f0-9]{32})\/events$/.exec(req.url??''),receiptPath=/^\/v1\/receipts\/([a-f0-9]{32})$/.exec(req.url??'');
      if(!(req.method==='POST'&&(req.url==='/v1/matches'||matchPath)||req.method==='GET'&&receiptPath))fail(404,'route_not_found');
      const body=await bodyOf(req);
      if(req.method==='GET'&&body||req.method==='POST'&&!/^application\/json(?:;\s*charset=utf-8)?$/i.test(req.headers['content-type']??''))fail(400,'invalid_body');
      authenticate(req,body);
      if(receiptPath){const r=db.prepare('SELECT doc FROM receipts WHERE request_id=?').get(receiptPath[1]);if(!r)fail(404,'receipt_not_found');return reply(200,JSON.parse(r.doc));}
      const result=matchPath?append(req,body,matchPath[1]):createMatch(req,body);
      if(!result.replayed&&onAfterCommit?.(result.receipt)){res.destroy();return;}
      reply(matchPath?200:201,result.receipt);
    }catch(e){if(!res.destroyed)reply(e instanceof Failure?e.status:500,{error:e instanceof Failure?e.code:'reference_failure',...(e instanceof Failure?e.extra:{})});}
  });
  server.requestTimeout=10000;server.headersTimeout=10000;
  return {
    async listen(port=0){if(!Number.isSafeInteger(port)||port<0||port>65535)throw Error('Invalid port');await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});return 'http://127.0.0.1:'+server.address().port;},
    async close(){if(server.listening)await new Promise(resolve=>{server.close(resolve);server.closeAllConnections();});db.close();},
    counts(){return {matches:db.prepare('SELECT count(*) AS n FROM matches').get().n,events:db.prepare('SELECT count(*) AS n FROM events').get().n,receipts:db.prepare('SELECT count(*) AS n FROM receipts').get().n};}
  };
}
