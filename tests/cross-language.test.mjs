import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {ArenaClient,ArenaError,newId} from '../dist/index.js';
import {createReferenceServer,demoKey} from '../reference/server.mjs';
const run=promisify(execFile),python=process.env.ARENA_PYTHON??'python3';
const root=new URL('../',import.meta.url).pathname;
const program=`import json,sys
from hybrid_arena_sdk import ArenaClient,ArenaError
options=json.loads(sys.argv[1]);fixture=json.load(open(sys.argv[2]));mode=sys.argv[3]
with ArenaClient(**options) as c:
 if mode=='initialize':
  c.queue_match(fixture['match']);c.deliver(fixture['match']['request_id']);c.queue_events(fixture['batch'])
  try: c.deliver(fixture['batch']['batch_id'])
  except ArenaError as e:
   assert e.status==0;print(json.dumps({'lost_response':True}))
  else: raise AssertionError('Expected lost committed response')
 else:
  r=c.deliver(fixture['batch']['batch_id']);assert not r['payout_authorized'] and r['anchor'] is None
  assert not c.pending();print(json.dumps({'state':r['state'],'digest':r['request_sha256']}))
`;
for(const [initial,resume] of [['python','typescript'],['typescript','python']])test(`${initial} durable outbox recovers in ${resume} after receiver restart without duplicate effects`,async()=>{
 const dir=mkdtempSync(join(tmpdir(),'arena-sdk-cross-'));let service,c;
 try {
  const match=JSON.parse(readFileSync(new URL('../contracts/game-provider-v1/fixtures/demo-match.json',import.meta.url)));
  const batch=JSON.parse(readFileSync(new URL('../contracts/game-provider-v1/fixtures/demo-events.json',import.meta.url)));
  Object.assign(match,{request_id:newId(),match_id:newId(),epoch:newId()});Object.assign(batch,{batch_id:newId(),match_id:match.match_id,epoch:match.epoch});batch.events.forEach(e=>e.event_id=newId());
  const fixturePath=join(dir,'fixture.json');writeFileSync(fixturePath,JSON.stringify({match,batch}));
  let drop=true;service=createReferenceServer({databasePath:join(dir,'receiver.sqlite'),onAfterCommit:r=>r.kind==='events.accepted'&&drop?(drop=false,true):false});
  const url=await service.listen(),port=Number(new URL(url).port);
  const options={...demoKey,baseUrl:url,outboxPath:join(dir,'shared-outbox.sqlite')};
  const pyOptions={base_url:url,publisher_id:demoKey.publisherId,game_id:demoKey.gameId,key_id:demoKey.keyId,secret_hex:demoKey.secretHex,environment:'sandbox',outbox_path:options.outboxPath};
  const py=async mode=>JSON.parse((await run(python,['-c',program,JSON.stringify(pyOptions),fixturePath,mode],{env:{...process.env,PYTHONPATH:root+'python/src'},timeout:20000})).stdout);
  if(initial==='python')assert.equal((await py('initialize')).lost_response,true);
  else {
   c=new ArenaClient(options);c.queueMatch(match);await c.deliver(match.request_id);c.queueEvents(batch);
   await assert.rejects(()=>c.deliver(batch.batch_id),e=>e instanceof ArenaError&&e.status===0);c.close();c=null;
  }
  assert.deepEqual(service.counts(),{matches:1,events:3,receipts:2});await service.close();service=null;
  service=createReferenceServer({databasePath:join(dir,'receiver.sqlite')});await service.listen(port);
  if(resume==='python')assert.equal((await py('resume')).state,'completed');
  else {c=new ArenaClient(options);assert.equal((await c.deliver(batch.batch_id)).state,'completed');assert.deepEqual(c.pending(),[]);c.close();c=null;}
  assert.deepEqual(service.counts(),{matches:1,events:3,receipts:2});
 }finally{c?.close();await service?.close();rmSync(dir,{recursive:true,force:true});}
});
test('Python wheel contracts are identical to the canonical schemas',()=>{
 for(const file of ['schemas.json','checksums.json'])assert.deepEqual(readFileSync(new URL('../python/src/hybrid_arena_sdk/contracts/'+file,import.meta.url)),readFileSync(new URL('../contracts/game-provider-v1/'+file,import.meta.url)));
});
