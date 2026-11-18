import test from'node:test';import assert from'node:assert/strict';import{readFileSync}from'node:fs';
import{BLUEPRINTS,starterPackage,createBlueprint,blueprintCommand,blueprintStep,blueprintCancel}from'../contracts/managed-game-v1/blueprints.mjs';
import{projectManagedMarketState,validateCreatorMarketState,marketStateHash}from'../contracts/creator-markets-v1/state.mjs';
const manifest=JSON.parse(readFileSync(new URL('../examples/signal-rush/manifest.json',import.meta.url)));const original={matchId:'a'.repeat(32),epoch:'b'.repeat(32),observedAt:1000000};
const project=(s,pkg,sequence=1,m=manifest)=>projectManagedMarketState({gameManifest:m,gamePackage:pkg,gameState:s,...original,acceptedSequence:sequence});
test('all four actual managed engines project two original outcomes, clocks and terminal scores without private gameplay fields',()=>{
 for(const b of BLUEPRINTS){const m={...manifest,ruleset_id:b.id},pkg={...starterPackage(b.id),duration_seconds:20};let s=createBlueprint(pkg,237);const waiting=project(s,pkg,0,m);assert.equal(waiting.status,'waiting');assert.equal(waiting.outcomes.length,2);s=blueprintCommand(s,'start').state;const live=project(s,pkg,1,m);assert.equal(live.status,'live');assert.equal(live.winner,null);for(let n=0;n<200;n++)s=blueprintStep(s,pkg).state;const terminal=project(s,pkg,2,m);assert.equal(terminal.status,'completed');assert.equal(terminal.game_time_ms,20000);assert.deepEqual(terminal.outcomes.map(o=>o.score),s.scores);assert.equal(terminal.winner,s.scores[0]===s.scores[1]?null:manifest.outcomes[s.scores[0]>s.scores[1]?0:1].outcome_id);for(const field of ['seed','target','selection','last_action','captures','player','account'])assert(!Object.hasOwn(terminal,field));assert.deepEqual(validateCreatorMarketState(terminal,m),terminal);}
});
test('draws and cancellations never invent a winning outcome or source admission',()=>{
 const pkg=starterPackage(),state=createBlueprint(pkg,237);state.phase='completed';state.tick=state.duration;assert.equal(project(state,pkg).winner,null);const canceled=project(blueprintCancel(createBlueprint(pkg,237)).state,pkg);assert.equal(canceled.status,'canceled');assert.equal(canceled.winner,null);
});
test('manifest, outcome mapping, exact clock, original accepted sequence and source hash refuse substitutions',()=>{
 const pkg=starterPackage(),s=blueprintCommand(createBlueprint(pkg,237),'start').state;
 for(const change of [v=>v.source_tick++,v=>v.outcomes[0].outcome_id='other',v=>v.match_id='other',v=>v.player_name='private',v=>v.accepted_sequence=-1,v=>v.winner='a',v=>v.manifest_sha256='0'.repeat(64)]){const value=project(s,pkg);change(value);assert.throws(()=>validateCreatorMarketState(value,manifest));}
 assert.throws(()=>project(s,pkg,0));assert.throws(()=>project({...s,phase:'completed'},pkg));assert.throws(()=>project(s,{...pkg,blueprint:'robot-duel'}));assert.throws(()=>project(s,pkg,1,{...manifest,outcomes:[manifest.outcomes[0],manifest.outcomes[0]]}));
 const first=project(s,pkg);const changed=structuredClone(manifest);changed.game_version='0.2.0';assert.throws(()=>validateCreatorMarketState(first,changed));assert.notEqual(marketStateHash(changed),marketStateHash(manifest));
});
test('score model preserves genuine binary outcomes, integer probability partition, freshness and experimental provenance',async()=>{
 const{estimateCreatorScoreWin,CREATOR_MODEL_HASH,CREATOR_MODEL_POLICY}=await import('../contracts/creator-markets-v1/model.mjs');const pkg=starterPackage(),s=blueprintCommand(createBlueprint(pkg,237),'start').state,initial=project(s,pkg);
 const equal=estimateCreatorScoreWin(initial,manifest,{now:original.observedAt});assert.deepEqual(equal.probabilities_ppm,[500000,500000]);assert.equal(equal.model_hash,CREATOR_MODEL_HASH);assert.equal(equal.feature_hash,initial.state_hash);assert.equal(equal.executable_quote,false);assert.equal(equal.calibration,'experimental_not_calibrated');
 s.tick=200;s.scores=[100,2];const leading=project(s,pkg);const next=estimateCreatorScoreWin(leading,manifest,{now:original.observedAt});assert.equal(next.probabilities_ppm.length,2);assert(next.probabilities_ppm[0]>next.probabilities_ppm[1]);assert.equal(next.probabilities_ppm.reduce((a,b)=>a+b,0),1000000);assert(next.probabilities_ppm.every(p=>p>=2500));assert.throws(()=>estimateCreatorScoreWin(leading,manifest,{now:original.observedAt+3001}));assert.throws(()=>CREATOR_MODEL_POLICY.score_prior++);
 s.phase='completed';s.tick=s.duration;const terminal=estimateCreatorScoreWin(project(s,pkg,3),manifest,{now:original.observedAt});assert.deepEqual(terminal.probabilities_ppm,[1000000,0]);s.scores=[2,2];assert.equal(estimateCreatorScoreWin(project(s,pkg,3),manifest,{now:original.observedAt}).probabilities_ppm,null);
});
test('published managed source/model fixtures preserve exact schemas, hashes and deterministic forecasts',async()=>{
 const{default:Ajv}=await import('ajv');const{estimateCreatorScoreWin,CREATOR_MODEL_HASH,CREATOR_MODEL_POLICY}=await import('../contracts/creator-markets-v1/model.mjs');const root=new URL('../contracts/creator-markets-v1/',import.meta.url),read=name=>JSON.parse(readFileSync(new URL(name,root)));
 const validate=new Ajv({strict:true}).compile(read('state.schema.json'));for(const f of read('fixtures/managed-models.json').fixtures){assert(validate(f.snapshot));assert.deepEqual(validateCreatorMarketState(f.snapshot,f.manifest),f.snapshot);assert.deepEqual(estimateCreatorScoreWin(f.snapshot,f.manifest,{now:f.snapshot.observed_at}),f.estimate);assert.equal(f.estimate.probabilities_ppm.length,2);}
 assert.deepEqual(read('model-policy.json').policy,CREATOR_MODEL_POLICY);assert.equal(read('model-policy.json').sha256,CREATOR_MODEL_HASH);
});
test('rehashed early/fabricated timed results still fail semantic validation and real outcome cardinality stays intact',async()=>{
 const{estimateCreatorScoreWin}=await import('../contracts/creator-markets-v1/model.mjs'),pkg=starterPackage(),state=blueprintCommand(createBlueprint(pkg,237),'start').state;
 const rehash=v=>{delete v.state_hash;v.state_hash=marketStateHash(v);return v;};
 for(const mutate of [v=>{v.status='completed';v.winner='a';},v=>v.source_tick++,v=>v.game_time_ms=v.duration_ms,v=>v.outcomes[0].outcome_id='other']){const value=project(state,pkg);mutate(value);rehash(value);assert.throws(()=>validateCreatorMarketState(value,manifest));}
 for(const n of [2,3,4,16]){const m={...manifest,outcomes:Array.from({length:n},(_,i)=>({outcome_id:'outcome_'+i,label:'Outcome '+i}))},value=project(state,pkg);value.manifest_sha256=marketStateHash(m);value.outcomes=m.outcomes.map(o=>({outcome_id:o.outcome_id,score:0}));rehash(value);const model=estimateCreatorScoreWin(value,m,{now:original.observedAt});assert.equal(model.probabilities_ppm.length,n);assert.equal(model.probabilities_ppm.reduce((a,b)=>a+b,0),1000000);assert(model.probabilities_ppm.every(p=>p>=2500));}
});
test('creator contract byte pins cover source, schemas, policy and original engine fixtures',async()=>{
 const{createHash}=await import('node:crypto'),root=new URL('../contracts/creator-markets-v1/',import.meta.url),pins=JSON.parse(readFileSync(new URL('checksums.json',root)));for(const[path,hash]of Object.entries(pins.files))assert.equal(createHash('sha256').update(readFileSync(new URL(path,root))).digest('hex'),hash,path);
});
