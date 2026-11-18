// Experimental source-bound score model. Never an executable price or admission.
import{marketStateHash,validateCreatorMarketState}from'./state.mjs';
import published from'./model-policy.json'with{type:'json'};
export const CREATOR_MODEL_POLICY=Object.freeze(published.policy);
export const CREATOR_MODEL_VERSION=CREATOR_MODEL_POLICY.version;
export const CREATOR_MODEL_HASH=marketStateHash(CREATOR_MODEL_POLICY);
if(published.sha256!==CREATOR_MODEL_HASH||CREATOR_MODEL_VERSION!=='creator-timed-score-v1')throw Error('Invalid creator pricing policy.');
export function estimateCreatorScoreWin(input,manifest,{now=Date.now(),allowHistorical=false}={}){
 const state=validateCreatorMarketState(input,manifest),policy=CREATOR_MODEL_POLICY;
 if(!Number.isSafeInteger(now)||now<0||!allowHistorical&&(now<state.observed_at-policy.max_future_skew_ms||now-state.observed_at>policy.max_source_age_ms))throw Error('Creator source observation is stale or unavailable.');
 const context={schema:'arena.creator-win-estimate.v1',model_version:CREATOR_MODEL_VERSION,model_hash:CREATOR_MODEL_HASH,feature_hash:state.state_hash,manifest_sha256:state.manifest_sha256,package_sha256:state.package_sha256,source_epoch:state.epoch,source_sequence:state.accepted_sequence,source_tick:state.source_tick,observed_at:state.observed_at,probability_scale:policy.probability_scale,calibration:'experimental_not_calibrated',executable_quote:false,state:state.status};
 if(state.status!=='live')return{...context,probabilities_ppm:state.status==='completed'&&state.winner!==null?state.outcomes.map(o=>o.outcome_id===state.winner?1000000:0):null,winner:state.winner};
 const n=BigInt(state.outcomes.length),total=state.outcomes.reduce((sum,o)=>sum+BigInt(o.score+policy.score_prior),0n),progress=BigInt(state.game_time_ms)*10000n/BigInt(state.duration_ms),weight=BigInt(policy.early_score_weight)+BigInt(policy.late_score_weight-policy.early_score_weight)*progress/10000n;
 const utilities=state.outcomes.map(o=>{const share=BigInt(o.score+policy.score_prior)*10000n/total,u=BigInt(policy.utility_base)+share*weight/10000n;return u**BigInt(policy.power);});
 const sum=utilities.reduce((a,b)=>a+b,0n),floor=BigInt(policy.probability_floor),free=BigInt(policy.probability_scale)-n*floor;
 const ranked=utilities.map((u,index)=>({index,value:floor+u*free/sum,remainder:u*free%sum}));let left=BigInt(policy.probability_scale)-ranked.reduce((sum,p)=>sum+p.value,0n);
 for(const row of [...ranked].sort((a,b)=>a.remainder===b.remainder?a.index-b.index:a.remainder>b.remainder?-1:1)){if(left===0n)break;row.value++;left--;}
 return{...context,probabilities_ppm:ranked.map(p=>Number(p.value)),winner:null};
}
