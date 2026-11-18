// Creator market-state source contract. A content hash is not source admission,
// an executable quote, a ledger receipt, anti-cheat or native finality.
import{createHash}from'node:crypto';import{Ajv}from'ajv';import sourceSchemas from'../game-provider-v1/schemas.json'with{type:'json'};
import{validateGamePackage}from'../managed-game-v1/blueprints.mjs';
const ajv=new Ajv({strict:true,allErrors:true});ajv.addSchema(sourceSchemas);
const exact=(v,keys)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).sort().join(',')===[...keys].sort().join(',');
const whole=v=>Number.isSafeInteger(v)&&v>=0;
const uuid=v=>typeof v==='string'&&/^[a-f0-9]{32}$/.test(v);
const canonical=v=>Array.isArray(v)?'['+v.map(canonical).join(',')+']':v&&typeof v==='object'?'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}':JSON.stringify(v);
export const marketStateHash=v=>createHash('sha256').update(canonical(v)).digest('hex');
function manifest(value){if(!ajv.validate(sourceSchemas.$id+'#/$defs/GameManifest',value)||new Set(value.outcomes.map(o=>o.outcome_id)).size!==value.outcomes.length)throw Error('Invalid immutable game manifest.');return value;}
const need=ok=>{if(!ok)throw Error('Invalid or unavailable creator market state.');};
export function validateCreatorMarketState(value,gameManifest){
 const m=manifest(gameManifest);
 need(exact(value,['schema','rule_family','publisher_id','game_id','manifest_sha256','package_sha256','match_id','epoch','accepted_sequence','source_tick','game_time_ms','observed_at','status','duration_ms','outcomes','winner','state_hash'])&&value.schema==='arena.creator-market-state.v1'&&value.rule_family==='timed_score_v1');
 need(value.publisher_id===m.publisher_id&&value.game_id===m.game_id&&value.manifest_sha256===marketStateHash(m)&&typeof value.package_sha256==='string'&&/^[a-f0-9]{64}$/.test(value.package_sha256)&&uuid(value.match_id)&&uuid(value.epoch));
 need(whole(value.accepted_sequence)&&whole(value.source_tick)&&whole(value.game_time_ms)&&whole(value.observed_at)&&value.observed_at>0&&whole(value.duration_ms)&&value.duration_ms>0&&value.game_time_ms<=value.duration_ms&&value.duration_ms<=86400000);
 need(m.clock.kind==='simulation'&&Number.isInteger(m.clock.tick_rate_hz)&&Number.isSafeInteger(value.game_time_ms*m.clock.tick_rate_hz)&&Number.isSafeInteger(value.source_tick*1000)&&Math.abs(value.game_time_ms*m.clock.tick_rate_hz-value.source_tick*1000)<m.clock.precision_ms*m.clock.tick_rate_hz);
 need(['waiting','live','completed','canceled','held'].includes(value.status)&&Array.isArray(value.outcomes)&&value.outcomes.length===m.outcomes.length);
 for(let i=0;i<value.outcomes.length;i++){const o=value.outcomes[i];need(exact(o,['outcome_id','score'])&&o.outcome_id===m.outcomes[i].outcome_id&&Number.isSafeInteger(o.score)&&o.score>=0&&o.score<=1000000000);}
 need(value.winner===null||value.status==='completed'&&m.outcomes.some(o=>o.outcome_id===value.winner));
 need(value.status!=='live'||value.game_time_ms<value.duration_ms);
 if(value.status==='completed'){
  need(value.game_time_ms===value.duration_ms);
  const best=Math.max(...value.outcomes.map(o=>o.score)),leaders=value.outcomes.filter(o=>o.score===best);
  need(value.winner===(leaders.length===1?leaders[0].outcome_id:null));
 }
 need(value.status!=='waiting'||value.accepted_sequence===0&&value.source_tick===0);
 need(value.status==='waiting'||value.accepted_sequence>0);
 const{state_hash,...facts}=value;need(typeof state_hash==='string'&&state_hash===marketStateHash(facts));return structuredClone(value);
}
export function projectManagedMarketState({gameManifest,gamePackage,gameState,matchId,epoch,acceptedSequence,observedAt}){
 const m=manifest(gameManifest),pkg=validateGamePackage(gamePackage),s=gameState;
 need(m.game_version===pkg.version&&m.ruleset_id===pkg.blueprint&&m.ruleset_version==='1.0.0'&&m.outcomes.length===2&&m.clock.kind==='simulation'&&m.clock.tick_rate_hz===10&&m.clock.precision_ms===100);
 need(s&&s.blueprint===pkg.blueprint&&['waiting','live','completed','canceled'].includes(s.phase)&&whole(s.tick)&&s.duration===pkg.duration_seconds*10&&s.tick<=s.duration&&Array.isArray(s.scores)&&s.scores.length===2&&s.scores.every(v=>whole(v)&&v<=1000000000));
 need(s.phase!=='waiting'||s.tick===0&&s.scores.every(score=>score===0));need(s.phase!=='completed'||s.tick===s.duration);
 const winner=s.phase==='completed'&&s.scores[0]!==s.scores[1]?m.outcomes[s.scores[0]>s.scores[1]?0:1].outcome_id:null;
 const facts={schema:'arena.creator-market-state.v1',rule_family:'timed_score_v1',publisher_id:m.publisher_id,game_id:m.game_id,manifest_sha256:marketStateHash(m),package_sha256:marketStateHash(pkg),match_id:matchId,epoch,accepted_sequence:acceptedSequence,source_tick:s.tick,game_time_ms:s.tick*100,observed_at:observedAt,status:s.phase,duration_ms:pkg.duration_seconds*1000,outcomes:s.scores.map((score,i)=>({outcome_id:m.outcomes[i].outcome_id,score})),winner};
 return validateCreatorMarketState({...facts,state_hash:marketStateHash(facts)},m);
}
