// Deterministic server-side Testnet estimates. This module cannot place orders,
// grant credits, create liquidity, establish source truth or authorize a payout.
import {createHash} from 'node:crypto';
import published from './model-policy.json' with {type:'json'};
const freeze=value=>{if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;};
const canonical=value=>Array.isArray(value)?'['+value.map(canonical).join(',')+']':value&&typeof value==='object'?'{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+canonical(value[key])).join(',')+'}':JSON.stringify(value);
export function pricingHash(value){return createHash('sha256').update(canonical(value)).digest('hex');}
export const MODEL_VERSION='starquest-score-health-v1';
export const MODEL_POLICY=freeze(published.policy);
export const MODEL_HASH=pricingHash(MODEL_POLICY);
if(published.sha256!==MODEL_HASH||MODEL_POLICY.version!==MODEL_VERSION)throw Error('Invalid model policy.');
const exact=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).sort().join(',')===[...keys].sort().join(',');
const whole=(value,max=1000000000)=>Number.isSafeInteger(value)&&value>=0&&value<=max;
const demand=ok=>{if(!ok)throw Error('Invalid or unavailable pricing observation.');};
const rootKeys=['schema','game','source_epoch','match_id','mode','ruleset','source_tick','observed_at','elapsed_ms','status','winner','completion_reason','time_limit_ms','idle_time_limit_ms','idle_time_limit_active','safe_radius_milli','capture_carrier_team','bomb_carrier_team','bomb_fuse_remaining_ms','outcomes','observation_hash'];
const outcomeKeys=['outcome','score','station_hull_milli','station_max_hull_milli','station_destroyed','modules_alive','modules_total','fleet_alive','fleet_total','fleet_hull_milli','fleet_shield_milli','fleet_max_hull_milli','fleet_max_shield_milli','captures','transport_deliveries','transport_cargo_milli','transport_hull_milli','gameplay_active','terminal_winner'];
const nullableTeam=value=>value===null||whole(value,3),nullableCount=value=>value===null||whole(value);
export function validateStarQuestFeatures(value){
 demand(exact(value,rootKeys)&&value.schema==='starquest.pricing-features.v1'&&value.game==='starquest');
 demand(/^[a-f0-9]{32}$/.test(value.match_id)&&/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(value.source_epoch));
 demand(Object.hasOwn(MODEL_POLICY.weights,value.mode)&&(value.ruleset===value.mode||value.mode==='battlefield'&&value.ruleset==='battle_royale_v1'));
 demand(['source_tick','elapsed_ms','safe_radius_milli'].every(key=>whole(value[key]))&&whole(value.observed_at,Number.MAX_SAFE_INTEGER)&&value.observed_at>0);
 demand(Math.abs(value.elapsed_ms*60-value.source_tick*1000)<=1000);
 demand(['live','completed'].includes(value.status)&&nullableTeam(value.winner)&&(value.status==='completed'||value.winner===null));
 demand(value.completion_reason===null||value.status==='completed'&&value.completion_reason==='time_limit');
 demand(nullableCount(value.time_limit_ms)&&nullableCount(value.idle_time_limit_ms)&&typeof value.idle_time_limit_active==='boolean'&&(!value.idle_time_limit_active||value.idle_time_limit_ms!==null));
 demand(value.ruleset!=='battle_royale_v1'||value.time_limit_ms===1200000);
 demand(nullableTeam(value.capture_carrier_team)&&nullableTeam(value.bomb_carrier_team)&&nullableCount(value.bomb_fuse_remaining_ms));
 demand(Array.isArray(value.outcomes)&&value.outcomes.length===4);
 value.outcomes.forEach((outcome,index)=>{
  demand(exact(outcome,outcomeKeys)&&outcome.outcome===index);
  demand(['score','station_hull_milli','station_max_hull_milli','modules_alive','modules_total','fleet_alive','fleet_total','fleet_hull_milli','fleet_shield_milli','fleet_max_hull_milli','fleet_max_shield_milli','captures','transport_deliveries'].every(key=>whole(outcome[key])));
  demand(outcome.station_hull_milli<=outcome.station_max_hull_milli&&outcome.modules_alive<=outcome.modules_total&&outcome.fleet_alive<=outcome.fleet_total&&outcome.fleet_hull_milli<=outcome.fleet_max_hull_milli&&outcome.fleet_shield_milli<=outcome.fleet_max_shield_milli);
  demand(nullableCount(outcome.transport_cargo_milli)&&(outcome.transport_cargo_milli===null||outcome.transport_cargo_milli<=1000)&&nullableCount(outcome.transport_hull_milli));
  demand(typeof outcome.station_destroyed==='boolean'&&typeof outcome.gameplay_active==='boolean');
  demand(value.status==='completed'?outcome.terminal_winner===(value.winner===index):outcome.terminal_winner===null);
 });
 const{observation_hash,...facts}=value;demand(typeof observation_hash==='string'&&/^[a-f0-9]{64}$/.test(observation_hash)&&pricingHash(facts)===observation_hash);
 return structuredClone(value);
}
const bp=(value,total)=>total?BigInt(value)*10000n/BigInt(total):0n;
function partition(values){
 const total=values.reduce((a,b)=>a+b,0n),base=BigInt(MODEL_POLICY.probability_floor),free=BigInt(MODEL_POLICY.probability_scale)-4n*base;
 const ranked=values.map((value,index)=>({index,value:base+value*free/total,remainder:value*free%total}));
 let left=BigInt(MODEL_POLICY.probability_scale)-ranked.reduce((sum,item)=>sum+item.value,0n);
 for(const item of[...ranked].sort((a,b)=>a.remainder===b.remainder?a.index-b.index:a.remainder>b.remainder?-1:1)){if(left===0n)break;item.value++;left--;}
 return ranked.map(item=>Number(item.value));
}
export function estimateStarQuestWin(input,{now=Date.now(),allowHistorical=false}={}){
 const snapshot=validateStarQuestFeatures(input);demand(whole(now,Number.MAX_SAFE_INTEGER));
 if(!allowHistorical)demand(now>=snapshot.observed_at-MODEL_POLICY.max_future_skew_ms&&now-snapshot.observed_at<=MODEL_POLICY.max_source_age_ms);
 const context={schema:'arena.win-estimate.v1',model_version:MODEL_VERSION,model_hash:MODEL_HASH,feature_hash:snapshot.observation_hash,source_epoch:snapshot.source_epoch,source_tick:snapshot.source_tick,observed_at:snapshot.observed_at,probability_scale:1000000,calibration:'experimental_not_calibrated',executable_quote:false};
 if(snapshot.status==='completed')return{...context,state:'completed',probabilities_ppm:snapshot.winner===null?null:snapshot.outcomes.map(outcome=>outcome.outcome===snapshot.winner?1000000:0),winner:snapshot.winner};
 if(snapshot.outcomes.filter(outcome=>outcome.gameplay_active).length<=1)return{...context,state:'awaiting_result',probabilities_ppm:null,winner:null};
 const totalScore=snapshot.outcomes.reduce((sum,outcome)=>sum+outcome.score,0)+MODEL_POLICY.score_prior*4;
 const objectives=snapshot.outcomes.map(outcome=>snapshot.mode==='capture'?outcome.captures*1000+(snapshot.capture_carrier_team===outcome.outcome?350:0):snapshot.mode==='transport'?outcome.transport_deliveries*1000+(outcome.transport_cargo_milli??0):snapshot.mode==='bombing'?(snapshot.bomb_carrier_team===outcome.outcome?1000:0):outcome.fleet_alive*1000);
 const totalObjective=objectives.reduce((a,b)=>a+b,0)+MODEL_POLICY.objective_prior_milli*4;
 const deadline=snapshot.time_limit_ms??(snapshot.idle_time_limit_active?snapshot.idle_time_limit_ms:null);
 const progress=deadline?bp(Math.min(snapshot.elapsed_ms,deadline),deadline):0n;
 const weights=MODEL_POLICY.weights[snapshot.mode].map(BigInt);
 const utilities=snapshot.outcomes.map((outcome,index)=>{
  const metrics=[outcome.station_destroyed?0n:bp(outcome.station_hull_milli,outcome.station_max_hull_milli),bp(outcome.fleet_hull_milli,outcome.fleet_max_hull_milli),bp(outcome.fleet_shield_milli,outcome.fleet_max_shield_milli),bp(outcome.modules_alive,outcome.modules_total),bp(outcome.score+MODEL_POLICY.score_prior,totalScore)*4n,bp(objectives[index]+MODEL_POLICY.objective_prior_milli,totalObjective)*4n];
  const scoreWeight=weights[4]*(10000n+3n*progress*progress/10000n)/10000n;
  const utility=BigInt(MODEL_POLICY.utility_base)+metrics.reduce((sum,metric,i)=>sum+metric*(i===4?scoreWeight:weights[i])/10000n,0n);
  return utility**BigInt(MODEL_POLICY.power);
 });
 return{...context,state:'live',probabilities_ppm:partition(utilities),winner:null};
}
