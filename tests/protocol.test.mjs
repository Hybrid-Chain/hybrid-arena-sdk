import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync,chmodSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {canonicalJson,sha256,signRequest,Outbox,ArenaClient,ArenaError} from '../dist/index.js';
const vector=JSON.parse(readFileSync(new URL('../contracts/game-provider-v1/fixtures/signing-vector.json',import.meta.url)));
test('TypeScript signs the published cross-language vector exactly',()=>{
 assert.equal(canonicalJson(JSON.parse(vector.body_utf8)),vector.body_utf8);
 const headers=signRequest({method:vector.method,path:vector.path,publisherId:vector.publisher_id,environment:vector.environment,keyId:'demo-key',secretHex:vector.secret_hex,body:vector.body_utf8,timestamp:vector.timestamp,nonce:vector.nonce});
 assert.equal(headers['X-Arena-Signature'],vector.signature);assert.equal(sha256(vector.body_utf8),vector.body_sha256);
});
test('explicit retries are bounded and never run ahead of Retry-After',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'arena-sdk-retry-'));
 const c=new ArenaClient({baseUrl:'http://127.0.0.1:8789',publisherId:'demo-studio',gameId:'demo-duel',keyId:'demo-key',secretHex:'01'.repeat(32),environment:'sandbox',outboxPath:join(dir,'outbox.sqlite')});
 try{
  let calls=0;c.deliver=async()=>{calls++;throw new ArenaError(503,'temporary','3600');};
  await assert.rejects(()=>c.deliverWithRetry('fixture',{maxDelayMs:10}),e=>e.retryAfter==='3600');assert.equal(calls,1);
  calls=0;c.deliver=async()=>{calls++;throw new ArenaError(503,'temporary');};
  await assert.rejects(()=>c.deliverWithRetry('fixture',{maxAttempts:2,maxDelayMs:1}));assert.equal(calls,2);
  calls=0;c.deliver=async()=>{calls++;throw new ArenaError(403,'scope_rejected');};
  await assert.rejects(()=>c.deliverWithRetry('fixture'));assert.equal(calls,1);
 }finally{c.close();rmSync(dir,{recursive:true,force:true});}
});
test('canonical encoding preserves UTF-8 and rejects ambiguous numeric/unicode/authority values',()=>{
 assert.equal(canonicalJson({z:'🛰️ café',a:1}),'{"a":1,"z":"🛰️ café"}');
 for(const v of [NaN,Infinity,1.5,9007199254740992,undefined,new Date(),{a:undefined},{a:'\ud800'},{'é':1}])assert.throws(()=>canonicalJson(v));
 const v={};v.self=v;assert.throws(()=>canonicalJson(v));
 for(const path of ['/v1/matches?x=1','https://wrong.invalid/v1/matches','/v1/%6datches'])assert.throws(()=>signRequest({method:'POST',path,publisherId:'demo-studio',environment:'sandbox',keyId:'demo-key',secretHex:vector.secret_hex,body:'{}'}));
});
test('durable outbox retains exact terms and target binding across reopen',()=>{
 const dir=mkdtempSync(join(tmpdir(),'arena-sdk-outbox-')),path=join(dir,'outbox.sqlite'),target={base_url:'http://127.0.0.1:8789',publisher_id:'demo-studio',game_id:'demo-duel',environment:'sandbox'};
 let o;
 try{
  o=new Outbox(path,target);o.queue('a'.repeat(32),'/v1/matches',{a:1});o.attempt('a'.repeat(32));o.close();
  o=new Outbox(path,target);assert.equal(o.get('a'.repeat(32)).body,'{"a":1}');assert.equal(o.get('a'.repeat(32)).attempts,1);
  assert.throws(()=>o.queue('a'.repeat(32),'/v1/matches',{a:2}));o.close();o=null;
  assert.throws(()=>new Outbox(path,{...target,base_url:'http://127.0.0.1:9999'}));
  chmodSync(dir,0o755);assert.throws(()=>new Outbox(path,target));
 }finally{o?.close();rmSync(dir,{recursive:true,force:true});}
});
