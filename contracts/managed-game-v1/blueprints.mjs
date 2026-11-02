// Reviewed, data-only game packages. No executable uploads, URLs or dependencies.
export const BLUEPRINT_VERSION='2026-11-01.1';
export const BLUEPRINTS=[
 {id:'signal-rush',title:'Signal Rush',genre:'Reaction',description:'Capture the lit cell before the bot. Every capture is scored by the server.',cells:9,action:'Capture'},
 {id:'drone-dash',title:'Drone Dash',genre:'Racing',description:'Pick the open flight lane. Clear gates to advance against the bot.',cells:3,action:'Choose lane'},
 {id:'robot-duel',title:'Robot Duel',genre:'Arena battle',description:'Find the exposed armor slot. Land hits while the opponent returns fire.',cells:3,action:'Fire'},
 {id:'core-control',title:'Core Control',genre:'Objective control',description:'Hold the active sector. Timed control earns points against the bot.',cells:3,action:'Hold sector'}
];
const exact=(v,keys)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).sort().join(',')===[...keys].sort().join(',');
export function validateGamePackage(v){
 if(!exact(v,['schema','blueprint','version','duration_seconds','bot_difficulty','palette'])||v.schema!=='arena.managed-game.v1'||!BLUEPRINTS.some(b=>b.id===v.blueprint)||!/^\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(v.version)||!Number.isSafeInteger(v.duration_seconds)||v.duration_seconds<20||v.duration_seconds>90||!['easy','normal','hard'].includes(v.bot_difficulty)||!['teal','orange','pink'].includes(v.palette))throw Error('invalid_game_package');
 return structuredClone(v);
}
export const starterPackage=(blueprint='signal-rush')=>validateGamePackage({schema:'arena.managed-game.v1',blueprint,version:'0.1.0',duration_seconds:30,bot_difficulty:'normal',palette:'teal'});
export function createBlueprint(pkg,seed){validateGamePackage(pkg);if(!Number.isSafeInteger(seed)||seed<1||seed>4294967295)throw Error('invalid_seed');return {blueprint:pkg.blueprint,phase:'waiting',tick:0,duration:pkg.duration_seconds*10,seed,target:0,selection:-1,scores:[0,0],last_action:-100,captures:0};}
function random(s){s.seed=(Math.imul(1664525,s.seed)+1013904223)>>>0;return s.seed/4294967296;}
function points(s,index,amount){s.scores[index]+=amount;return [{type:'game_event',game_time_ms:s.tick*100,payload:{name:'arena.objective',values:{outcome_index:index,amount}}},{type:'score_changed',game_time_ms:s.tick*100,payload:{outcome_id:index,score:s.scores[index]}}];}
export function blueprintCommand(value,action,cell){const s=structuredClone(value),events=[];if(action==='start'){if(s.phase!=='waiting')throw Error('match_already_started');s.phase='live';return {state:s,events:[{type:'match_started',game_time_ms:0,payload:{}}]};}
 const b=BLUEPRINTS.find(b=>b.id===s.blueprint);if(action!=='input'||!Number.isInteger(cell)||cell<0||cell>=b.cells)throw Error('invalid_input');
 if(s.phase!=='live')throw Error('match_not_live');if(s.tick-s.last_action<3)return {state:s,events,accepted:false};s.last_action=s.tick;
 if(['drone-dash','core-control'].includes(s.blueprint)){s.selection=cell;return {state:s,events,accepted:true};}
 if(cell!==s.target)return {state:s,events,accepted:false};s.captures++;events.push(...points(s,0,s.blueprint==='robot-duel'?3:1));s.target=(s.target+1+Math.floor(random(s)*(b.cells-1)))%b.cells;return {state:s,events,accepted:true};
}
export function blueprintStep(value,pkg){const s=structuredClone(value),events=[];if(s.phase!=='live')return {state:s,events};s.tick++;const rate={easy:0.035,normal:0.065,hard:0.1}[pkg.bot_difficulty];
 if(random(s)<rate)events.push(...points(s,1,s.blueprint==='robot-duel'?3:1));
 if(['drone-dash','core-control'].includes(s.blueprint)&&s.tick%10===0&&s.selection===s.target)events.push(...points(s,0,s.blueprint==='drone-dash'?2:1));
 if(s.tick%(s.blueprint==='core-control'?30:10)===0)s.target=Math.floor(random(s)*BLUEPRINTS.find(b=>b.id===s.blueprint).cells);
 if(s.tick%20===0)events.push({type:'game_event',game_time_ms:s.tick*100,payload:{name:'arena.heartbeat',values:{tick:s.tick}}});
 if(s.tick>=s.duration){s.phase='completed';events.push({type:'game_event',game_time_ms:s.tick*100,payload:{name:'arena.metric_coverage',values:{metric_index:3,from_ms:0,to_ms:s.tick*100}}});events.push({type:'match_completed',game_time_ms:s.tick*100,payload:{winner:s.scores[0]===s.scores[1]?null:s.scores[0]>s.scores[1]?0:1,scores:s.scores.map((score,outcome_id)=>({outcome_id,score}))}});}
 return {state:s,events};
}
export function blueprintCancel(value){const s=structuredClone(value);if(['completed','canceled'].includes(s.phase))return {state:s,events:[]};s.phase='canceled';return {state:s,events:[{type:'match_canceled',game_time_ms:s.tick*100,payload:{reason:'operator_canceled'}}]};}
