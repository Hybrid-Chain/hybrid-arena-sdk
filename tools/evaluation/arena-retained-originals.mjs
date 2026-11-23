// Operator-only offline read of public-safe game/model tables. Not an SDK API,
// source authentication, calibration, live model selection or financial action.
import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import {lstatSync,realpathSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,join,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {MODEL_VERSION,MODEL_HASH,validateStarQuestFeatures,estimateStarQuestWin,pricingHash} from '../../contracts/live-markets-v1/starquest-model.mjs';
import {evaluateStarQuestHistory} from '../../contracts/live-markets-v1/evaluate.mjs';
const need=(ok,reason)=>{if(!ok)throw Error(reason);};
const protocol=Object.freeze({schema:'arena.original-pricing-selection.v1',maximum_candidates:400,maximum_rows_per_match:20000,maximum_frames_per_match:40,development_fraction:0.8,selection:'latest_original_first_observation_then_match_id',split:'chronological_complete_matches_before_validation',sampling:'first_original_per_tick_then_uniform_original_frame_indexes',held_heads:'excluded',draws:'retained_for_original_evaluator_exclusion',parameter_fit:false});
export const SELECTION_PROTOCOL=protocol;
function view(raw,match){
 need(raw?.schema==='arena.live-pricing.v1'&&raw.network==='testnet'&&raw.executable_quote===false&&raw.value_movement===false&&raw.source_authority==='arena_observed_authenticated_api','invalid_original_envelope');
 const f=validateStarQuestFeatures(raw.features);need(f.match_id===match,'cross_match_features');
 const model=estimateStarQuestWin(f,{allowHistorical:true,now:f.observed_at});need(pricingHash(model)===pricingHash(raw.estimate),'changed_original_model');return {features:f,estimate:model};
}
export function collectOriginalPricing(db){
 db.exec('PRAGMA query_only=ON');db.exec('BEGIN');
 try{
  const heads=db.prepare(`SELECT h.match_id,h.feature_hash,o.payload,l.payload AS live_payload,
   (SELECT observed FROM testnet_model_observations first INDEXED BY testnet_model_match_history WHERE first.match_id=h.match_id ORDER BY first.id LIMIT 1) AS first_observed
   FROM testnet_model_heads h JOIN testnet_model_observations o ON o.match_id=h.match_id AND o.feature_hash=h.feature_hash
   LEFT JOIN live_matches l ON l.id=h.match_id
   WHERE h.hold_reason IS NULL AND json_extract(o.payload,'$.features.status')='completed'
   ORDER BY first_observed DESC,h.match_id DESC LIMIT 400`).all().sort((a,b)=>a.first_observed-b.first_observed||a.match_id.localeCompare(b.match_id));
  const getRows=db.prepare('SELECT id,payload FROM testnet_model_observations INDEXED BY testnet_model_match_history WHERE match_id=? ORDER BY id LIMIT 20001');
  const cutoff=Math.floor(heads.length*protocol.development_fraction),matches=[],excluded={},digest=createHash('sha256');let originalRows=0,duplicates=0,coincident=0;
  const cohort=heads.map((h,i)=>({match_id:h.match_id,first_observed:h.first_observed,split:i<cutoff?'development':'evaluation'}));
  for(let index=0;index<heads.length;index++){
   const h=heads[index],split=cohort[index].split;
   try{
    const terminal=view(JSON.parse(h.payload),h.match_id).features;need(terminal.status==='completed'&&terminal.observation_hash===h.feature_hash,'missing_original_terminal');
    const live=h.live_payload?JSON.parse(h.live_payload):null;need(live?.match_id===h.match_id&&live.game==='starquest'&&live.status==='completed'&&live.mode===terminal.mode&&live.ruleset===terminal.ruleset&&live.winner===terminal.winner,'source_terminal_disagreement');
    const rows=getRows.all(h.match_id);need(rows.length<=protocol.maximum_rows_per_match,'too_many_original_rows');
    let priorTick=-1,priorTime=-1;const frames=[];
    for(const row of rows){
     originalRows++;digest.update(JSON.stringify([row.id,createHash('sha256').update(row.payload).digest('hex')])+String.fromCharCode(10));
     const v=view(JSON.parse(row.payload),h.match_id),f=v.features;
     need(f.mode===terminal.mode&&f.ruleset===terminal.ruleset&&f.source_epoch===terminal.source_epoch&&f.time_limit_ms===terminal.time_limit_ms&&f.idle_time_limit_ms===terminal.idle_time_limit_ms,'changed_original_match');
     if(f.status==='completed'){need(f.observation_hash===terminal.observation_hash,'conflicting_original_terminal');continue;}
     need(f.status==='live'&&f.source_tick>=priorTick&&f.observed_at>=priorTime,'original_clock_rewind');
     const repeated=f.source_tick===priorTick;priorTick=f.source_tick;priorTime=f.observed_at;
     if(f.source_tick>=terminal.source_tick||f.observed_at>terminal.observed_at){coincident++;continue;}
     if(repeated){duplicates++;continue;}
     frames.push(f);
    }
    need(frames.length>0,'no_original_live_frames');
    const count=Math.min(frames.length,protocol.maximum_frames_per_match),observations=Array.from({length:count},(_,i)=>frames[count===1?0:Math.floor(i*(frames.length-1)/(count-1))]);
    need(observations.some(f=>estimateStarQuestWin(f,{allowHistorical:true,now:f.observed_at}).state==='live'),'no_original_live_forecast');
    matches.push({match_id:h.match_id,split,observations,terminal});
   }catch(error){const reason=/^[a-z_]+$/.test(error.message)?error.message:'invalid_original_features';excluded[split+':'+reason]=(excluded[split+':'+reason]??0)+1;}
  }
  need(matches.length>0,'No admissible complete original matches.');
  return {dataset:{schema:'arena.pricing-evaluation-input.v1',model_version:MODEL_VERSION,model_hash:MODEL_HASH,matches},selection:{schema:'arena.original-pricing-selection-report.v1',protocol,protocol_hash:pricingHash(protocol),candidate_matches:heads.length,original_cohort_hash:pricingHash(cohort),original_rows_read:originalRows,original_payload_sequence_sha256:digest.digest('hex'),retained_matches:matches.length,retained_live_frames:matches.reduce((n,m)=>n+m.observations.length,0),development_matches:matches.filter(m=>m.split==='development').length,evaluation_matches:matches.filter(m=>m.split==='evaluation').length,repeated_original_ticks_not_resampled:duplicates,nonpreterminal_frames_excluded:coincident,excluded_matches:excluded,source_authenticity_verified:false,independent_human_acceptance:false,parameter_fit_performed:false,private_account_tables_read:false,database_writes:false,network_requests:0}};
 }finally{db.exec('ROLLBACK');}
}
export function evaluateRetainedFile(database,output){
 const source=resolve(database),destination=resolve(output),info=lstatSync(source),parent=lstatSync(dirname(destination));
 need(info.isFile()&&!info.isSymbolicLink()&&realpathSync(source)===source&&info.uid===process.getuid(),'Choose an original regular database owned by this operator.');
 need(parent.isDirectory()&&!parent.isSymbolicLink()&&parent.uid===process.getuid()&&!(parent.mode&0o077),'Choose a private operator-owned output parent.');
 const db=new DatabaseSync(source,{readOnly:true});let collected;try{collected=collectOriginalPricing(db);}finally{db.close();}
 const bytes=JSON.stringify(collected.dataset);need(Buffer.byteLength(bytes)<=67108864,'Selected dataset exceeds the original 64 MiB bound.');
 const report=evaluateStarQuestHistory(collected.dataset);mkdirSync(destination,{mode:0o700});
 writeFileSync(join(destination,'dataset.json'),bytes+String.fromCharCode(10),{flag:'wx',mode:0o600});
 writeFileSync(join(destination,'report.json'),JSON.stringify(report,null,2)+String.fromCharCode(10),{flag:'wx',mode:0o600});
 const selection={...collected.selection,dataset_file_sha256:createHash('sha256').update(bytes+String.fromCharCode(10)).digest('hex'),dataset_hash:report.dataset_hash};
 writeFileSync(join(destination,'selection.json'),JSON.stringify(selection,null,2)+String.fromCharCode(10),{flag:'wx',mode:0o600});return {report,selection};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{const[database,output,...extra]=process.argv.slice(2);need(database&&output&&!extra.length,'Usage: node tools/evaluation/arena-retained-originals.mjs original.sqlite new-private-output-directory');const result=evaluateRetainedFile(database,output);process.stdout.write(JSON.stringify(result)+String.fromCharCode(10));}
 catch(error){process.stderr.write(error.message+String.fromCharCode(10));process.exitCode=1;}
}
