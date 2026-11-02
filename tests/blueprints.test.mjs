import test from 'node:test';import assert from 'node:assert/strict';
import {BLUEPRINTS,starterPackage,validateGamePackage,createBlueprint,blueprintCommand,blueprintStep,blueprintCancel}from'../contracts/managed-game-v1/blueprints.mjs';
for(const b of BLUEPRINTS)test(b.id+' deterministic server clock, terminal score and cancellation',()=>{
 const pkg=starterPackage(b.id),a=createBlueprint(pkg,237);let s=blueprintCommand(a,'start',null).state;const replay=()=>{let s=blueprintCommand(a,'start',null).state;for(let i=0;i<300;i++){if(i%4===0)s=blueprintCommand(s,'input',s.target).state;s=blueprintStep(s,pkg).state;}return s;};s=replay();assert.deepEqual(s,replay());assert.equal(s.phase,'completed');assert.equal(s.tick,300);assert.equal(blueprintStep(s,pkg).events.length,0);assert.equal(a.phase,'waiting');assert.equal(blueprintCancel(a).events[0].type,'match_canceled');assert.equal(blueprintCancel(s).events.length,0);
});
test('packages reject executable fields, URL/dependency uploads and unsafe bounds',()=>{
 for(const v of [{...starterPackage(),code:'process.exit()'},{...starterPackage(),duration_seconds:1},{...starterPackage(),blueprint:'custom'},{...starterPackage(),palette:'url(javascript:x)'},{...starterPackage(),version:'../foo'}])assert.throws(()=>validateGamePackage(v));
 let s=blueprintCommand(createBlueprint(starterPackage(),1),'start',null).state;s=blueprintCommand(s,'input',0).state;assert.equal(blueprintCommand(s,'input',s.target).events.length,0);assert.throws(()=>blueprintCommand(s,'input',99));
});
