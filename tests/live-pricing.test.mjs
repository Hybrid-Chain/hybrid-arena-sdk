import test from'node:test';import assert from'node:assert/strict';import{readFileSync}from'node:fs';
import{estimateStarQuestWin,validateStarQuestFeatures,pricingHash,MODEL_HASH,MODEL_POLICY}from'../contracts/live-markets-v1/starquest-model.mjs';
const fixtures=JSON.parse(readFileSync(new URL('../contracts/live-markets-v1/fixtures/starquest-features.json',import.meta.url),'utf8')).fixtures;
const rehash=s=>{delete s.observation_hash;s.observation_hash=pricingHash(s);return s;};
test('all source fixtures retain exact hashes and deterministic million-part probabilities',()=>{
 for(const {snapshot:s}of fixtures){assert.deepEqual(validateStarQuestFeatures(s),s);const first=estimateStarQuestWin(s,{now:s.observed_at});const second=estimateStarQuestWin(structuredClone(s),{now:s.observed_at});assert.deepEqual(first,second);assert.equal(first.probabilities_ppm.reduce((a,b)=>a+b,0),1000000);assert.equal(first.model_hash,MODEL_HASH);assert.equal(first.executable_quote,false);assert.equal(first.calibration,'experimental_not_calibrated');}
});
test('symmetric four-house initial states start at equal priors; damage is not a direct probability',()=>{
 for(const {name,snapshot:s}of fixtures){const r=estimateStarQuestWin(s,{now:s.observed_at});if(name.endsWith('-initial'))assert.deepEqual(r.probabilities_ppm,[250000,250000,250000,250000]);else{assert.ok(r.probabilities_ppm[1]<r.probabilities_ppm[3]);assert.notEqual(r.probabilities_ppm[1],Math.round(s.outcomes[1].station_hull_milli/s.outcomes[1].station_max_hull_milli*1000000));}}
});
test('a lost station and inactive fleet do not erase a timed points leader from possible outcomes',()=>{
 const s=structuredClone(fixtures[0].snapshot);s.elapsed_ms=1100000;s.source_tick=66000;s.outcomes[1].station_hull_milli=0;s.outcomes[1].station_destroyed=true;s.outcomes[1].gameplay_active=false;s.outcomes[1].score=100000;
 rehash(s);const r=estimateStarQuestWin(s,{now:s.observed_at});assert.ok(r.probabilities_ppm[1]>r.probabilities_ppm[0]);assert.ok(r.probabilities_ppm[1]<1000000);
});
test('stale, altered, unknown, cross-ruleset and private-field observations never generate estimates',()=>{
 const original=fixtures[0].snapshot;assert.throws(()=>estimateStarQuestWin(original,{now:original.observed_at+3001}));assert.throws(()=>estimateStarQuestWin(original,{now:original.observed_at-501}));
 for(const mutate of [s=>s.outcomes[0].score++,s=>s.account='private',s=>s.outcomes[0].nickname='private',s=>s.outcomes[0].fleet_alive=100,s=>s.ruleset='unknown',s=>s.source_tick=-1]){const s=structuredClone(original);mutate(s);assert.throws(()=>estimateStarQuestWin(s,{now:s.observed_at}));}
});
test('completed winner, void/draw and not-yet-final decisive observations are separate from live quotes',()=>{
 const s=structuredClone(fixtures[0].snapshot);s.status='completed';s.winner=2;s.outcomes.forEach((o,i)=>o.terminal_winner=i===2);rehash(s);const win=estimateStarQuestWin(s,{now:s.observed_at});assert.equal(win.state,'completed');assert.deepEqual(win.probabilities_ppm,[0,0,1000000,0]);
 s.winner=null;s.outcomes.forEach(o=>o.terminal_winner=false);rehash(s);assert.equal(estimateStarQuestWin(s,{now:s.observed_at}).probabilities_ppm,null);
 s.status='live';s.outcomes.forEach((o,i)=>{o.terminal_winner=null;o.gameplay_active=i===0;});rehash(s);const waiting=estimateStarQuestWin(s,{now:s.observed_at});assert.equal(waiting.state,'awaiting_result');assert.equal(waiting.probabilities_ppm,null);assert.equal(waiting.winner,null);
});
test('model constants and nested coefficients cannot change behind a published model hash',()=>{
 assert.throws(()=>MODEL_POLICY.weights.capture[0]++);assert.throws(()=>MODEL_POLICY.weights.capture=[1]);assert.equal(pricingHash(MODEL_POLICY),MODEL_HASH);
});

test('published model policy, golden outputs, schemas and checksums match exact implementation bytes',async()=>{
 const {default:Ajv}=await import('ajv');const dir=new URL('../contracts/live-markets-v1/',import.meta.url);
 const json=file=>JSON.parse(readFileSync(new URL(file,dir),'utf8'));
 assert.equal(json('model-policy.json').sha256,MODEL_HASH);assert.deepEqual(json('model-policy.json').policy,MODEL_POLICY);
 const schema=new Ajv({strict:true,allErrors:true}).compile(json('features.schema.json'));
 for(const f of fixtures){assert.ok(schema(f.snapshot),JSON.stringify(schema.errors));assert.deepEqual(estimateStarQuestWin(f.snapshot,{now:f.snapshot.observed_at}),json('fixtures/model-golden.json').models.find(g=>g.name===f.name).estimate);}
 const {createHash}=await import('node:crypto');for(const[file,hash]of Object.entries(json('checksums.json').files))assert.equal(createHash('sha256').update(readFileSync(new URL(file,dir))).digest('hex'),hash,file);
 const entry=await import('@hybrid-chain/arena-sdk/pricing');assert.equal(entry.MODEL_HASH,MODEL_HASH);
});
