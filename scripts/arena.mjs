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
  arena starter NEW_DIRECTORY
  arena minigame --config FILE --manifest FILE --state DIR [--port 8790]

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
 }else if(command==='starter'){
  if(args.length!==1)throw Error('Use arena starter NEW_DIRECTORY');
  const dir=resolve(args[0]);if(existsSync(dir))throw Error('Choose a new directory');mkdirSync(dir,{mode:0o700});mkdirSync(dir+'/vendor');
  const root=new URL('../examples/signal-rush/',import.meta.url);
  for(const name of ['engine.mjs','index.html'])writeFileSync(dir+'/'+name,readFileSync(new URL(name,root)));
  const server=readFileSync(new URL('server.mjs',root),'utf8').replace("from'../../dist/index.js'","from'@hybrid-chain/arena-sdk'").replace("from'../../dist/private-db.js'","from'./private-db.mjs'");writeFileSync(dir+'/server.mjs',server);
  writeFileSync(dir+'/private-db.mjs',readFileSync(new URL('../dist/private-db.js',import.meta.url)));
  writeFileSync(dir+'/manifest.json',JSON.stringify(demoManifest,null,2)+'\n');
  writeFileSync(dir+'/package.json',JSON.stringify({name:'arena-signal-rush-starter',private:true,type:'module',scripts:{start:'node server.mjs'},dependencies:{'@hybrid-chain/arena-sdk':'file:./vendor/arena-sdk.tgz'}},null,2)+'\n');
  writeFileSync(dir+'/.gitignore','node_modules/\nprivate/\n.arena/\n*.sqlite*\narena-source-key.json\n');
  writeFileSync(dir+'/README.md','# Signal Rush starter\n\nDownload the SDK npm tarball from the GitHub release and save it as vendor/arena-sdk.tgz, then run npm install. The SDK is not published to the npm registry.\n\nStart the loopback Arena reference receiver. Follow examples/signal-rush/README.md in the SDK for the public local fixture configuration; save it outside source with mode0600. Run npm start -- /private/config.json manifest.json /private/signal-state. Open http://127.0.0.1:8790.\n\nFor hosted Testnet delivery, use your own Studio source key and exact registered two-outcome manifest. Secrets stay server-side. This loopback reference has one local player seat; public hosting needs TLS, admission, abuse controls and review. No command deploys or grants wallet authority.\n');
  console.log(JSON.stringify({created:dir,scope:'editable_loopback_reference_game',credentials_created:false,payout_authority:false}));
 }else if(command==='minigame'){
  const options={};for(let i=0;i<args.length;i++){if(!['--config','--manifest','--state','--port'].includes(args[i])||options[args[i]]!==undefined||!args[i+1])throw Error('Invalid mini-game option');options[args[i]]=args[++i];}
  if(!options['--config']||!options['--manifest']||!options['--state'])throw Error('Mini-game requires --config, --manifest and --state');
  const {lstatSync}=await import('node:fs');const file=lstatSync(options['--config']);if(!file.isFile()||file.isSymbolicLink()||file.mode&0o077||file.uid!==process.getuid())throw Error('Owner-only source configuration required');
  const {createSignalServer}=await import('../examples/signal-rush/server.mjs');const game=createSignalServer({config:JSON.parse(readFileSync(options['--config'])),manifest:JSON.parse(readFileSync(options['--manifest'])),statePath:resolve(options['--state'])});
  console.log(JSON.stringify({url:await game.listen(Number(options['--port']??8790)),scope:'reference_game',activity:'mixed',payout_authority:false}));let closing=false;const close=async()=>{if(closing)return;closing=true;await game.close();};process.once('SIGINT',close);process.once('SIGTERM',close);
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
