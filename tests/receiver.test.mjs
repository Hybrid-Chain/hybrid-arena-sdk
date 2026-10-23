import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createReferenceServer,demoKey} from '../reference/server.mjs';
import {ArenaClient,ArenaError,newId,canonicalJson,signRequest,sha256} from '../dist/index.js';
const fixture=n=>JSON.parse(readFileSync(new URL('../contracts/game-provider-v1/fixtures/'+n+'.json',import.meta.url)));
function fresh(){const match=fixture('demo-match'),batch=fixture('demo-events');match.request_id=newId();match.match_id=newId();match.epoch=newId();Object.assign(batch,{batch_id:newId(),match_id:match.match_id,epoch:match.epoch});batch.events.forEach(e=>e.event_id=newId());return {match,batch};}
async function sandbox(fn,options={}){
 const dir=mkdtempSync(join(tmpdir(),'arena-sdk-receiver-'));
 const service=createReferenceServer({databasePath:join(dir,'receiver.sqlite'),...options});
 try{const url=await service.listen();await fn({dir,service,url});}finally{await service.close();rmSync(dir,{recursive:true,force:true});}
}
const options=(url,path)=>({...demoKey,baseUrl:url,outboxPath:path});
async function raw(url,method,path,value,key=demoKey,extra={},bodyOverride){
 const body=bodyOverride??(value===undefined?'':canonicalJson(value));
 const headers={...signRequest({...key,method,path,body}),...(method==='POST'?{'Content-Type':'application/json'}:{}),...extra};
 const r=await fetch(url+path,{method,headers,body:method==='POST'?body:undefined,redirect:'manual'});return {status:r.status,body:await r.json(),headers};
}
test('real HTTP server accepts lifecycle once; source acknowledgments carry no payout/anchor authority',()=>sandbox(async({dir,service,url})=>{
 const c=new ArenaClient(options(url,join(dir,'outbox.sqlite'))),{match,batch}=fresh();
 try{c.queueMatch(match);c.queueEvents(batch);const r=await c.flush();assert.deepEqual(r.map(x=>x.state),['created','completed']);
  assert.equal(r[1].payout_authorized,false);assert.equal(r[1].anchor,null);assert.equal(r[1].assurance,'local_reference_only');
  assert.deepEqual(service.counts(),{matches:1,events:3,receipts:2});
  assert.equal((await raw(url,'POST','/v1/matches/'+match.match_id+'/events',batch)).status,200);
  assert.deepEqual(service.counts(),{matches:1,events:3,receipts:2});
 }finally{c.close();}
}));
test('lost committed event response survives receiver/client restart and recovers one receipt',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'arena-sdk-lost-'));let service,client;
 try{
  let dropped=false;
  service=createReferenceServer({databasePath:join(dir,'server.sqlite'),onAfterCommit:r=>{if(r.kind==='events.accepted'&&!dropped){dropped=true;return true;}return false;}});
  const url=await service.listen(),port=Number(new URL(url).port),{match,batch}=fresh();
  client=new ArenaClient(options(url,join(dir,'outbox.sqlite')));client.queueMatch(match);await client.deliver(match.request_id);client.queueEvents(batch);
  await assert.rejects(()=>client.deliver(batch.batch_id),e=>e instanceof ArenaError&&e.status===0);
  assert.deepEqual(service.counts(),{matches:1,events:3,receipts:2});client.close();client=null;await service.close();service=null;
  service=createReferenceServer({databasePath:join(dir,'server.sqlite')});await service.listen(port);
  client=new ArenaClient(options(url,join(dir,'outbox.sqlite')));const recovered=await client.deliver(batch.batch_id);
  assert.equal(recovered.state,'completed');assert.equal(recovered.request_sha256,sha256(canonicalJson(batch)));assert.deepEqual(client.pending(),[]);
  assert.deepEqual(service.counts(),{matches:1,events:3,receipts:2});
 }finally{client?.close();await service?.close();rmSync(dir,{recursive:true,force:true});}
});
test('wrong scopes, stale clocks, reused nonces and browser authority are rejected',()=>sandbox(async({url})=>{
 const {match}=fresh();
 assert.equal((await raw(url,'POST','/v1/matches',match,{...demoKey,publisherId:'other'})).status,401);
 assert.equal((await raw(url,'POST','/v1/matches',match,{...demoKey,gameId:'other'}, {'Origin':'https://elsewhere.invalid'})).status,403);
 const body=canonicalJson(match),path='/v1/matches',old=signRequest({...demoKey,method:'POST',path,body,timestamp:'1'});
 assert.equal((await raw(url,'POST',path,match,demoKey,old)).status,401);
 const a=await raw(url,'POST',path,match);
 assert.equal(a.status,201);assert.equal((await raw(url,'POST',path,match,demoKey,a.headers)).status,409);
 const fake={...match,publisher_id:'another-studio',request_id:newId(),match_id:newId()};
 assert.equal((await raw(url,'POST',path,fake)).status,403);
}));
test('revoked source key cannot read a previously accepted receipt',()=>{
 const keys=[{...demoKey}];return sandbox(async({url})=>{
  const {match}=fresh();assert.equal((await raw(url,'POST','/v1/matches',match)).status,201);
  keys[0].enabled=false;assert.equal((await raw(url,'GET','/v1/receipts/'+match.request_id)).status,401);
 },{keys});
});
test('conflicting IDs, release changes, malformed canonical JSON and invalid actors do not commit',()=>sandbox(async({service,url})=>{
 const {match,batch}=fresh();assert.equal((await raw(url,'POST','/v1/matches',match)).status,201);
 assert.equal((await raw(url,'POST','/v1/matches',{...match,epoch:newId()})).status,409);
 const bad=fresh().match;bad.game_version='0.2.0';assert.equal((await raw(url,'POST','/v1/matches',bad)).status,409);
 assert.equal((await raw(url,'POST','/v1/matches',match,demoKey,{},' '+canonicalJson(match))).status,400);
 const altered=structuredClone(batch);altered.events[1].payload.actor_id='outsider';
 assert.equal((await raw(url,'POST','/v1/matches/'+match.match_id+'/events',altered)).status,400);
 assert.deepEqual(service.counts(),{matches:1,events:0,receipts:1});
 const valid=await raw(url,'POST','/v1/matches/'+match.match_id+'/events',batch);assert.equal(valid.status,200);
 const conflict=structuredClone(batch);conflict.events[2].payload.winner='b';
 assert.equal((await raw(url,'POST','/v1/matches/'+match.match_id+'/events',conflict)).status,409);
}));
test('sequence gaps, wrong epochs, nonmonotonic clocks and duplicate event IDs roll back atomically',()=>sandbox(async({service,url})=>{
 const {match,batch}=fresh();await raw(url,'POST','/v1/matches',match);const path='/v1/matches/'+match.match_id+'/events';
 for(const change of [b=>b.first_sequence=2,b=>b.epoch=newId(),b=>b.events[2].game_time_ms=0,b=>b.events[2].source_tick=1,b=>b.events[1].event_id=b.events[0].event_id,b=>b.previous_batch_sha256='a'.repeat(64)]){
  const b=structuredClone(batch);b.batch_id=newId();change(b);assert.equal((await raw(url,'POST',path,b)).status,409);assert.equal(service.counts().events,0);
 }
 assert.equal((await raw(url,'POST',path,batch)).status,200);assert.equal(service.counts().events,3);
}));
test('source gap holds the match; exact retries recover while fresh later events remain closed',()=>sandbox(async({service,url})=>{
 const {match,batch}=fresh();await raw(url,'POST','/v1/matches',match);batch.events=[batch.events[0],{event_id:newId(),sequence:2,type:'source_gap',game_time_ms:500,payload:{reason:'missing_events'}}];
 const path='/v1/matches/'+match.match_id+'/events',r=await raw(url,'POST',path,batch);assert.equal(r.body.state,'held');assert.equal((await raw(url,'POST',path,batch)).status,200);
 const next={...batch,batch_id:newId(),first_sequence:3,previous_batch_sha256:sha256(canonicalJson(batch)),events:[{event_id:newId(),sequence:3,type:'match_canceled',game_time_ms:500,payload:{reason:'source_unavailable'}}]};
 assert.equal((await raw(url,'POST',path,next)).status,409);assert.equal(service.counts().events,2);
}));
test('multi-batch chaining, terminal-last, complete outcomes and cancellation are enforced',()=>sandbox(async({url,service})=>{
 const {match,batch}=fresh();await raw(url,'POST','/v1/matches',match);const path='/v1/matches/'+match.match_id+'/events';
 const first={...batch,events:[batch.events[0]]};assert.equal((await raw(url,'POST',path,first)).status,200);
 const second={...batch,batch_id:newId(),first_sequence:2,previous_batch_sha256:sha256(canonicalJson(first)),events:batch.events.slice(1)};
 const bad=structuredClone(second);bad.events[1].payload.scores=[{outcome_id:'a',score:2},{outcome_id:'a',score:0}];assert.equal((await raw(url,'POST',path,bad)).status,400);assert.equal(service.counts().events,1);
 assert.equal((await raw(url,'POST',path,second)).body.state,'completed');
 const {match:m2,batch:b2}=fresh();await raw(url,'POST','/v1/matches',m2);b2.events=[{event_id:newId(),sequence:1,type:'match_canceled',game_time_ms:0,payload:{reason:'operator_canceled'}}];
 assert.equal((await raw(url,'POST','/v1/matches/'+m2.match_id+'/events',b2)).body.state,'canceled');
}));
test('client rejects foreign destinations and cannot mutate an already queued request',()=>sandbox(async({dir,url})=>{
 assert.throws(()=>new ArenaClient(options('http://remote.invalid',join(dir,'no.sqlite'))));
 const c=new ArenaClient(options(url,join(dir,'outbox.sqlite'))),{match}=fresh();
 try{c.queueMatch(match);assert.throws(()=>c.queueMatch({...match,epoch:newId()}));assert.throws(()=>c.queueMatch({...fresh().match,publisher_id:'other'}));}
 finally{c.close();}
}));
test('four-outcome source uses declared outcomes and does not infer a winner from score rank',async()=>{
 const manifest=fixture('starquest-mapping');
 await sandbox(async({url})=>{
  const {match,batch}=fresh(),key={...demoKey,gameId:manifest.game_id};
  Object.assign(match,{game_id:manifest.game_id,ruleset_id:manifest.ruleset_id,participants:[{actor_id:'pilot-a',outcome_id:'tokugawa'},{actor_id:'pilot-b',outcome_id:'hibernia'}]});batch.game_id=manifest.game_id;
  batch.events[2].payload={winner:'hibernia',scores:manifest.outcomes.map((o,i)=>({outcome_id:o.outcome_id,score:4-i}))};
  assert.equal((await raw(url,'POST','/v1/matches',match,key)).status,201);
  assert.equal((await raw(url,'POST','/v1/matches/'+match.match_id+'/events',batch,key)).body.state,'completed');
 },{manifest,keys:[{...demoKey,gameId:manifest.game_id}]});
});
