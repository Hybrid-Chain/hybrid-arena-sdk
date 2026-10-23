#!/usr/bin/env node
import {readFileSync,mkdirSync,writeFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {ArenaClient,validate,newId,sha256,canonicalJson} from '../dist/index.js';
import {createReferenceServer,demoKey,demoManifest} from '../reference/server.mjs';
const [command,...args]=process.argv.slice(2);
const help=`Hybrid Arena SDK — local reference preview

  arena sandbox --demo [--state DIR] [--port 8789]
  arena demo --base-url http://127.0.0.1:8789 [--state DIR]
  arena validate manifest.json
  arena scaffold NEW_DIRECTORY

Fixture credentials are public and usable only in a disposable loopback sandbox.
No command deploys to Arena, signs a wallet action or publishes chain evidence.`;
const fixtures=new URL('../contracts/game-provider-v1/fixtures/',import.meta.url);
const json=name=>JSON.parse(readFileSync(new URL(name,fixtures),'utf8'));
try {
 if(!command||command==='--help'){console.log(help);}
 else if(command==='validate'){
  if(args.length!==1)throw Error('Use arena validate manifest.json');
  const manifest=JSON.parse(readFileSync(resolve(args[0]),'utf8'));validate('GameManifest',manifest);canonicalJson(manifest);
  if(new Set(manifest.outcomes.map(o=>o.outcome_id)).size!==manifest.outcomes.length)throw Error('Duplicate outcomes');
  console.log(JSON.stringify({valid:true,contract:'2026-10-23.1',production_ingestion:false}));
 }else if(command==='scaffold'){
  if(args.length!==1)throw Error('Use arena scaffold NEW_DIRECTORY');
  const dir=resolve(args[0]);if(existsSync(dir))throw Error('Choose a new directory');mkdirSync(dir,{mode:0o700});
  writeFileSync(dir+'/manifest.json',JSON.stringify(demoManifest,null,2)+'\n');
  writeFileSync(dir+'/match.json',JSON.stringify(json('demo-match.json'),null,2)+'\n');
  writeFileSync(dir+'/events.json',JSON.stringify(json('demo-events.json'),null,2)+'\n');
  writeFileSync(dir+'/README.md','# Arena local game scaffold\n\nThese are synthetic game facts and public fixture authority. Validate manifest.json, run the loopback sandbox and SDK demo, then adapt the typed facts to your own authoritative server. Existing source interfaces need their reviewed adapter; this scaffold grants no hosted publishing or payout authority.\n');
  console.log(JSON.stringify({created:dir,files:['manifest.json','match.json','events.json','README.md']}));
 }else if(command==='sandbox'||command==='demo'){
  const options={};
  for(let i=0;i<args.length;i++){
   const arg=args[i];if(arg==='--demo'){if(options.demo)throw Error('Duplicate option');options.demo=true;continue;}
   if(!['--state','--port','--base-url'].includes(arg)||options[arg]!==undefined||!args[i+1]||args[i+1].startsWith('--'))throw Error('Invalid option');options[arg]=args[++i];
  }
  const state=resolve(options['--state']??'.arena/'+command);
  if(command==='sandbox'){
   if(!options.demo||options['--base-url'])throw Error('Reference sandbox requires --demo');
   const port=Number(options['--port']??8789);
   const service=createReferenceServer({databasePath:state+'/receiver.sqlite'});const url=await service.listen(port);
   console.log(JSON.stringify({local_url:url,scope:'local_reference_only',fixture_authority:true,production_ingestion:false,payout_authority:false}));
   let closing=false;const close=async()=>{if(closing)return;closing=true;await service.close();};
   process.once('SIGINT',close);process.once('SIGTERM',close);
  }else{
   if(!options['--base-url']||options['--port']||options.demo)throw Error('Demo requires an explicit --base-url');
   const u=new URL(options['--base-url']);if(u.protocol!=='http:'||u.hostname!=='127.0.0.1')throw Error('Demo runs only against literal IPv4 loopback');
   const client=new ArenaClient({...demoKey,baseUrl:options['--base-url'],outboxPath:state+'/outbox.sqlite'});
   try{
    const match=json('demo-match.json'),events=json('demo-events.json');
    // Stable fixture IDs make rerunning this exact demo recover the same receipts.
    client.queueMatch(match);client.queueEvents(events);const receipts=await client.flush();
    console.log(JSON.stringify({scope:'local_reference_only',receipts:receipts.map(r=>({request_id:r.request_id,state:r.state,request_sha256:r.request_sha256})),pending:client.pending().length,payout_authority:false,chain_publication:false}));
   }finally{client.close();}
  }
 }else throw Error('Unknown command');
}catch(e){console.error(JSON.stringify({error:e.code??'sdk_command_failed',message:e.code?'Inspect the original request and retry/recover it without changing terms.':e.message}));process.exitCode=1;}
