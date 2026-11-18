// Offline evaluation only. Input hashes do not authenticate a source or grant
// execution authority. Never import this module into a live quote decision.
import{MODEL_VERSION,MODEL_HASH,estimateStarQuestWin,validateStarQuestFeatures,pricingHash}from'./starquest-model.mjs';
const exact=(v,keys)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).sort().join(',')===[...keys].sort().join(',');
const need=ok=>{if(!ok)throw Error('Invalid or incomplete match evaluation dataset.');};
const average=values=>values.reduce((a,b)=>a+b,0)/values.length;
export function evaluateStarQuestHistory(input){
 need(exact(input,['schema','model_version','model_hash','matches'])&&input.schema==='arena.pricing-evaluation-input.v1'&&input.model_version===MODEL_VERSION&&input.model_hash===MODEL_HASH&&Array.isArray(input.matches)&&input.matches.length>0&&input.matches.length<=500);
 const seen=new Set(),rows=[];let development=0,draws=0,observations=0,awaiting=0,totalFrames=0;
 for(const item of input.matches){
  need(exact(item,['match_id','split','observations','terminal'])&&/^[a-f0-9]{32}$/.test(item.match_id)&&!seen.has(item.match_id)&&['development','evaluation'].includes(item.split)&&Array.isArray(item.observations)&&item.observations.length>0&&item.observations.length<=20000);seen.add(item.match_id);totalFrames+=item.observations.length;need(totalFrames<=100000);
  const terminal=validateStarQuestFeatures(item.terminal);need(terminal.status==='completed'&&terminal.match_id===item.match_id);
  let priorTick=-1,priorTime=-1;const predictions=[];
  for(const raw of item.observations){
   const f=validateStarQuestFeatures(raw);
   need(f.status==='live'&&f.match_id===terminal.match_id&&f.mode===terminal.mode&&f.ruleset===terminal.ruleset&&f.source_epoch===terminal.source_epoch&&f.source_tick>priorTick&&f.observed_at>=priorTime&&f.source_tick<terminal.source_tick&&f.observed_at<=terminal.observed_at&&f.time_limit_ms===terminal.time_limit_ms&&f.idle_time_limit_ms===terminal.idle_time_limit_ms);
   priorTick=f.source_tick;priorTime=f.observed_at;
   const model=estimateStarQuestWin(f,{allowHistorical:true,now:f.observed_at});
   if(model.state==='awaiting_result'){if(item.split==='evaluation')awaiting++;continue;}
   need(model.state==='live'&&model.probabilities_ppm!==null);
   predictions.push(model.probabilities_ppm.map(p=>p/1000000));
  }
  if(item.split==='development'){development++;continue;}
  observations+=item.observations.length;
  if(terminal.winner===null){draws++;continue;}
  need(predictions.length>0);
  const winner=terminal.winner;
  rows.push({mode:terminal.mode,frames:predictions.length,brier:average(predictions.map(p=>p.reduce((sum,q,i)=>sum+(q-Number(i===winner))**2,0))),log_loss:average(predictions.map(p=>-Math.log(p[winner]))),predictions,winner});
 }
 // Average each original match first. A long game cannot dominate a short one.
 const metrics=group=>group.length?{matches:group.length,brier:average(group.map(r=>r.brier)),log_loss:average(group.map(r=>r.log_loss)),equal_prior_brier:.75,equal_prior_log_loss:-Math.log(.25)}:null;
 const buckets=Array.from({length:10},(_,index)=>({lower:index/10,upper:(index+1)/10,weight:0,probability:0,observed:0}));
 for(const row of rows)for(const p of row.predictions)for(let i=0;i<4;i++){
  const bucket=buckets[Math.min(9,Math.floor(p[i]*10))],weight=1/(rows.length*row.frames*4);bucket.weight+=weight;bucket.probability+=p[i]*weight;bucket.observed+=Number(i===row.winner)*weight;
 }
 return{schema:'arena.pricing-evaluation-report.v1',model_version:MODEL_VERSION,model_hash:MODEL_HASH,dataset_hash:pricingHash(input),source_authenticity_verified:false,calibrated:false,executable_quote:false,financial_execution:false,parameter_fit_performed:false,weighting:'equal_original_matches_then_frames',development_matches_excluded:development,drawn_matches_excluded:draws,evaluation_observations:observations,awaiting_result_observations_excluded:awaiting,metrics:metrics(rows),by_mode:Object.fromEntries(['battlefield','bombing','capture','transport'].map(mode=>[mode,metrics(rows.filter(r=>r.mode===mode))])),calibration_buckets:buckets.map(b=>({lower:b.lower,upper:b.upper,weight:b.weight,mean_probability:b.weight?b.probability/b.weight:null,observed_fraction:b.weight?b.observed/b.weight:null})),limitations:['Offline input has not been source-authenticated by this evaluator.','Held-out labels are supplied by the operator; no independent acceptance or calibration is established.','Drawn outcomes are excluded because the four-outcome forecast has no draw category.','No live quote, order, grant, settlement or wallet operation is performed.']};
}
