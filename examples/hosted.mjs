// Explicit synthetic hosted acceptance. No source secret is embedded in this file.
import {readFileSync,writeFileSync,lstatSync,mkdirSync,existsSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {ArenaClient,canonicalJson,newId,sha256} from '../dist/index.js';
const [configPath,manifestPath,stateArg]=process.argv.slice(2);
if(!configPath||!manifestPath||!stateArg)throw Error('Provide private key configuration, registered manifest and private state directory.');
const f=lstatSync(configPath);if(!f.isFile()||f.isSymbolicLink()||f.mode&0o077||f.uid!==process.getuid())throw Error('Owner-only source key file required');
const c=JSON.parse(readFileSync(configPath)),manifest=JSON.parse(readFileSync(manifestPath));
if(c.base_url!=='https://hybrid-arena.com'||c.environment!=='sandbox'||manifest.publisher_id!==c.publisher_id||manifest.game_id!==c.game_id)throw Error('Hosted sandbox release binding required');
const state=resolve(stateArg);mkdirSync(state,{recursive:true,mode:0o700});const d=lstatSync(state);if(!d.isDirectory()||d.isSymbolicLink()||d.mode&0o077)throw Error('Private state directory required');
const path=join(state,'sample.json'),binding=sha256(canonicalJson(manifest));let saved;
if(existsSync(path)){const s=lstatSync(path);if(!s.isFile()||s.isSymbolicLink()||s.mode&0o077)throw Error('Private sample file required');saved=JSON.parse(readFileSync(path));if(saved.binding!==binding)throw Error('Do not replace an existing sample release binding');}
else{const match_id=newId(),epoch=newId(),outcomes=manifest.outcomes.map(o=>o.outcome_id);saved={binding,match:{schema:'arena.game.match.v1',publisher_id:c.publisher_id,game_id:c.game_id,game_version:manifest.game_version,ruleset_id:manifest.ruleset_id,ruleset_version:manifest.ruleset_version,request_id:newId(),match_id,epoch,participants:[],activity:'synthetic'},batch:{schema:'arena.game.events.v1',publisher_id:c.publisher_id,game_id:c.game_id,batch_id:newId(),match_id,epoch,first_sequence:1,previous_batch_sha256:null,events:[{event_id:newId(),sequence:1,type:'match_started',game_time_ms:0,payload:{}},{event_id:newId(),sequence:2,type:'game_event',game_time_ms:1000,payload:{name:'demo.hit',values:{damage:1}}},{event_id:newId(),sequence:3,type:'match_completed',game_time_ms:2000,payload:{winner:outcomes[0],scores:outcomes.map((outcome_id,i)=>({outcome_id,score:i===0?1:0}))}}]}};writeFileSync(path,canonicalJson(saved),{mode:0o600,flag:'wx'});}
const client=new ArenaClient({baseUrl:c.base_url,publisherId:c.publisher_id,gameId:c.game_id,keyId:c.key_id,secretHex:c.secret_hex,environment:'sandbox',outboxPath:join(state,'outbox.sqlite')});
try{client.queueMatch(saved.match);client.queueEvents(saved.batch);const receipts=await client.flush();console.log(JSON.stringify({activity:'synthetic',match_id:saved.match.match_id,receipt_count:receipts.length,pending:client.pending().length,payout_authority:false}));}finally{client.close();}
