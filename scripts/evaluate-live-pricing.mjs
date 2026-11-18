#!/usr/bin/env node
// Explicit offline tool. No network, service configuration or live model writes.
import{readFileSync,lstatSync,writeFileSync}from'node:fs';
import{evaluateStarQuestHistory}from'../contracts/live-markets-v1/evaluate.mjs';
try{
 const[input,output,...extra]=process.argv.slice(2);if(!input||extra.length)throw Error('Usage: node scripts/evaluate-live-pricing.mjs input.json [new-report.json]');
 const info=lstatSync(input);if(!info.isFile()||info.isSymbolicLink()||info.size>67108864)throw Error('Choose a regular dataset file of at most 64 MiB.');
 const report=JSON.stringify(evaluateStarQuestHistory(JSON.parse(readFileSync(input,'utf8'))),null,2)+'\n';
 if(output)writeFileSync(output,report,{flag:'wx',mode:0o600});else process.stdout.write(report);
}catch(error){process.stderr.write(error.message+'\n');process.exitCode=1;}
