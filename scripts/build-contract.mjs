// Reproducible canonical contract artifacts. Run explicitly when changing v1.
import {writeFileSync,readFileSync,readdirSync} from 'node:fs';
import {createHash,createHmac} from 'node:crypto';
const base=new URL('../contracts/game-provider-v1/',import.meta.url);
const save=(name,value)=>writeFileSync(new URL(name,base),JSON.stringify(value,null,2)+'\n');
const id={type:'string',pattern:'^[a-z0-9][a-z0-9_-]{0,63}$'};
const uuid={type:'string',pattern:'^[a-f0-9]{32}$'};
const hash={type:'string',pattern:'^[a-f0-9]{64}$'};
const integer={type:'integer',minimum:-9007199254740991,maximum:9007199254740991};
const nat={...integer,minimum:0};
const version={type:'string',pattern:'^[0-9]+\\.[0-9]+\\.[0-9]+(?:-[a-z0-9.-]+)?$',maxLength:64};
const time={type:'string',pattern:'^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\\.[0-9]{1,9})?Z$',maxLength:40};
const ref=name=>({$ref:'#/$defs/'+name});
const obj=(properties,required=Object.keys(properties))=>({type:'object',additionalProperties:false,properties,required});
const arr=(items,minItems=0,maxItems=100)=>({type:'array',items,minItems,maxItems});
const binding={publisher_id:id,game_id:id,game_version:version,ruleset_id:id,ruleset_version:version};
const defs={
 Outcome:obj({outcome_id:id,label:{type:'string',minLength:1,maxLength:64}}),
 Participant:obj({actor_id:id,outcome_id:id}),
 Score:obj({outcome_id:id,score:integer}),
 GameManifest:obj({schema:{const:'arena.game.manifest.v1'},...binding,
  outcomes:arr(ref('Outcome'),2,16),capabilities:obj({spectate:{type:'boolean'},join:{type:'boolean'},replays:{type:'boolean'}}),
  clock:obj({kind:{enum:['simulation','server']},precision_ms:{type:'integer',minimum:1,maximum:60000},tick_rate_hz:{type:'integer',minimum:1,maximum:1000}},['kind','precision_ms'])}),
 MatchRequest:obj({schema:{const:'arena.game.match.v1'},...binding,request_id:uuid,match_id:uuid,epoch:uuid,participants:arr(ref('Participant'),0,64)}),
 Event:null,
 EventBatch:obj({schema:{const:'arena.game.events.v1'},publisher_id:id,game_id:id,batch_id:uuid,match_id:uuid,epoch:uuid,
  first_sequence:{...nat,minimum:1},previous_batch_sha256:{anyOf:[hash,{type:'null'}]},events:arr(ref('Event'),1,100)}),
 Receipt:obj({schema:{const:'arena.game.receipt.v1'},request_id:uuid,kind:{enum:['match.created','events.accepted']},
  publisher_id:id,game_id:id,match_id:uuid,epoch:uuid,request_sha256:hash,manifest_sha256:hash,
  first_sequence:{anyOf:[{...nat,minimum:1},{type:'null'}]},last_sequence:nat,
  state:{enum:['created','live','held','completed','canceled']},accepted_at:time,
  assurance:{const:'local_reference_only'},anchor:{type:'null'},payout_authorized:{const:false}}),
 Error:obj({error:{type:'string',pattern:'^[a-z_]+$'},expected_sequence:nat},['error'])
};
const extension= obj({name:{type:'string',pattern:'^[a-z][a-z0-9_]*\\.[a-z][a-z0-9_.-]*$',maxLength:96},
 actor_id:id,target_actor_id:id,values:{type:'object',maxProperties:32,propertyNames:{pattern:'^[a-z][a-z0-9_]{0,47}$'},additionalProperties:{anyOf:[integer,{type:'boolean'}]}}},['name','values']);
const payloads={match_started:obj({}),score_changed:ref('Score'),game_event:extension,
 match_completed:obj({winner:{anyOf:[id,{type:'null'}]},scores:arr(ref('Score'),2,16)}),
 match_canceled:obj({reason:{enum:['operator_canceled','source_unavailable','invalid_match']}}),
 source_gap:obj({reason:{enum:['missing_events','source_restart','integrity_failure']}})};
defs.Event={oneOf:Object.entries(payloads).map(([type,payload])=>obj({event_id:uuid,sequence:{...nat,minimum:1},type:{const:type},game_time_ms:nat,source_tick:nat,occurred_at:time,payload},['event_id','sequence','type','game_time_ms','payload']))};
save('schemas.json',{$schema:'http://json-schema.org/draft-07/schema#',$id:'https://hybrid-arena.com/integrations/games/provider-v1/schemas.json',title:'Arena game provider v1 (local reference)', $defs:defs});
const schema=name=>({$ref:'./schemas.json#/$defs/'+name});
const signatures=['Key-Id','Publisher','Environment','Timestamp','Nonce'].map(n=>({name:'X-Arena-'+n,in:'header',required:true,schema:{type:'string'}}));
const responses=(name,code='200')=>({[code]:{description:'Local reference result; no financial authority.',content:{'application/json':{schema:schema(name)}}},...Object.fromEntries([400,401,403,404,409,413,429,503].map(n=>[n,{description:'Protocol failure; preserve original request identity and terms.',content:{'application/json':{schema:schema('Error')}}}]))});
const post=(operationId,body,name,parameters=[],code='200')=>({operationId,security:[{GameSignature:[]}],parameters:[...signatures,...parameters],requestBody:{required:true,content:{'application/json':{schema:schema(body)}}},responses:responses(name,code)});
save('openapi.json',{openapi:'3.1.0',info:{title:'Arena generic game provider — local reference',version:'2026-10-23.1',description:'Experimental local contract; generic hosted Arena ingestion is not deployed.'},
 servers:[{url:'http://127.0.0.1:8789',description:'Disposable loopback sandbox only'}],
 'x-production-writes-available':false,'x-value-movement':false,
 paths:{'/v1/matches':{post:post('createReferenceMatch','MatchRequest','Receipt',[],'201')},
 '/v1/matches/{match_id}/events':{post:post('appendReferenceEvents','EventBatch','Receipt',[{name:'match_id',in:'path',required:true,schema:uuid}])},
 '/v1/receipts/{request_id}':{get:{operationId:'recoverReferenceReceipt',security:[{GameSignature:[]}],parameters:[...signatures,{name:'request_id',in:'path',required:true,schema:uuid}],responses:responses('Receipt')}},
 '/v1/status':{get:{operationId:'referenceStatus',security:[],responses:{200:{description:'Local availability, production ingestion false, payout authority false.'}}}}},
 components:{securitySchemes:{GameSignature:{type:'apiKey',in:'header',name:'X-Arena-Signature',description:'ARENA-GAME-HMAC-V1. See README for exact canonical bytes, publisher/environment binding and fresh nonce.'}}}});
const demo={schema:'arena.game.manifest.v1',publisher_id:'demo-studio',game_id:'demo-duel',game_version:'0.1.0',ruleset_id:'duel',ruleset_version:'1.0.0',outcomes:[{outcome_id:'a',label:'Team A'},{outcome_id:'b',label:'Team B'}],capabilities:{spectate:false,join:false,replays:false},clock:{kind:'simulation',precision_ms:17,tick_rate_hz:60}};
save('fixtures/demo-manifest.json',demo);
const match={schema:'arena.game.match.v1',publisher_id:demo.publisher_id,game_id:demo.game_id,game_version:demo.game_version,ruleset_id:demo.ruleset_id,ruleset_version:demo.ruleset_version,request_id:'1'.repeat(32),match_id:'2'.repeat(32),epoch:'3'.repeat(32),participants:[{actor_id:'pilot-a',outcome_id:'a'},{actor_id:'pilot-b',outcome_id:'b'}]};
save('fixtures/demo-match.json',match);
const events={schema:'arena.game.events.v1',publisher_id:demo.publisher_id,game_id:demo.game_id,batch_id:'4'.repeat(32),match_id:match.match_id,epoch:match.epoch,first_sequence:1,previous_batch_sha256:null,events:[
 {event_id:'5'.repeat(32),sequence:1,type:'match_started',game_time_ms:0,source_tick:0,payload:{}},
 {event_id:'6'.repeat(32),sequence:2,type:'game_event',game_time_ms:1000,source_tick:60,payload:{name:'demo.hit',actor_id:'pilot-a',target_actor_id:'pilot-b',values:{damage:10}}},
 {event_id:'7'.repeat(32),sequence:3,type:'match_completed',game_time_ms:2000,source_tick:120,payload:{winner:'a',scores:[{outcome_id:'a',score:2},{outcome_id:'b',score:0}]}}
]};
save('fixtures/demo-events.json',events);
save('fixtures/cs2-mapping.json',{...demo,game_id:'cs2-fixture',ruleset_id:'duel-mr5',clock:{kind:'server',precision_ms:16,tick_rate_hz:64}});
save('fixtures/starquest-mapping.json',{...demo,game_id:'starquest-fixture',ruleset_id:'battlefield',outcomes:['tokugawa','hibernia','colos','red-star'].map(outcome_id=>({outcome_id,label:outcome_id})),clock:{kind:'simulation',precision_ms:17,tick_rate_hz:60}});
const canonical=v=>v===null||typeof v!=='object'?JSON.stringify(v):Array.isArray(v)?'['+v.map(canonical).join(',')+']':'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}';
const body=canonical(match),digest=createHash('sha256').update(body).digest('hex');
const signing=['ARENA-GAME-HMAC-V1','POST','/v1/matches','demo-studio','sandbox','1792785600','a'.repeat(32),digest].join('\n');
save('fixtures/signing-vector.json',{fixture_only:true,secret_hex:'01'.repeat(32),method:'POST',path:'/v1/matches',publisher_id:'demo-studio',environment:'sandbox',timestamp:'1792785600',nonce:'a'.repeat(32),body_utf8:body,body_sha256:digest,canonical_text:signing,signature:createHmac('sha256',Buffer.from('01'.repeat(32),'hex')).update(signing).digest('hex')});
save('manifest.json',{schema:'arena.game-provider-manifest.v1',version:'2026-10-23.1',sdk_version:'0.1.0-alpha.1',status:'local_sandbox_available',scope:'local_reference_only',source_repository:'https://github.com/Hybrid-Chain/hybrid-arena-sdk',production_ingestion:false,partner_write_auth:false,payout_authority:false,chain_publication:false,openapi:'openapi.json',schemas:'schemas.json',guide:'README.md',production_paths:[],limits:{body_bytes:262144,events_per_batch:100,actors_per_match:64,outcomes:16,json_depth:20,clock_skew_seconds:60,nonce_retention_seconds:120}});
const paths=['README.md','schemas.json','openapi.json','manifest.json',...readdirSync(new URL('fixtures/',base)).map(n=>'fixtures/'+n)];
save('checksums.json',{schema:'arena.contract-checksums.v1',version:'2026-10-23.1',files:Object.fromEntries(paths.sort().map(p=>[p,createHash('sha256').update(readFileSync(new URL(p,base))).digest('hex')]))});
