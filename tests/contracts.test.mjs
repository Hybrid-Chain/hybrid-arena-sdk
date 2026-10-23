import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash,createHmac} from 'node:crypto';
import Ajv from 'ajv';
const base=new URL('../contracts/game-provider-v1/',import.meta.url);
const json=f=>JSON.parse(readFileSync(new URL(f,base)));
const schemas=json('schemas.json'),ajv=new Ajv({allErrors:true,strict:true});ajv.addSchema(schemas);
const validate=(name,v)=>ajv.validate(schemas.$id+'#/$defs/'+name,v);
test('versioned contract files and fixtures have pinned checksums',()=>{
 for(const [p,hash] of Object.entries(json('checksums.json').files))assert.equal(createHash('sha256').update(readFileSync(new URL(p,base))).digest('hex'),hash,p);
});
test('game manifests describe two and four outcomes without changing existing source protocols',()=>{
 for(const f of ['demo-manifest','cs2-mapping','starquest-mapping'])assert.ok(validate('GameManifest',json('fixtures/'+f+'.json')),JSON.stringify(ajv.errors));
 assert.equal(json('fixtures/starquest-mapping.json').outcomes.length,4);
 assert.equal(json('fixtures/cs2-mapping.json').outcomes.length,2);
});
test('match, ordered lifecycle and typed game event fixtures pass schemas',()=>{
 assert.ok(validate('MatchRequest',json('fixtures/demo-match.json')),JSON.stringify(ajv.errors));
 assert.ok(validate('EventBatch',json('fixtures/demo-events.json')),JSON.stringify(ajv.errors));
});
test('unknown authority, native identity, nonintegral clocks and untyped facts fail',()=>{
 for(const mutate of [v=>v.payout_authorized=true,v=>v.steam_id='fixture-private',v=>v.participants[0].email='private@example.invalid']){
  const v=json('fixtures/demo-match.json');mutate(v);assert.equal(validate('MatchRequest',v),false);
 }
 for(const mutate of [v=>v.events[0].game_time_ms=.25,v=>v.events[0].payload.winner='a',v=>v.events[1].payload.values.damage=1.5,v=>v.events[0].sequence=0]){
  const v=json('fixtures/demo-events.json');mutate(v);assert.equal(validate('EventBatch',v),false);
 }
});
test('published signing fixture binds exact body, target and publisher/environment',()=>{
 const v=json('fixtures/signing-vector.json');assert.equal(v.fixture_only,true);
 assert.equal(createHash('sha256').update(v.body_utf8).digest('hex'),v.body_sha256);
 assert.equal(createHmac('sha256',Buffer.from(v.secret_hex,'hex')).update(v.canonical_text).digest('hex'),v.signature);
 assert.notEqual(createHmac('sha256',Buffer.from(v.secret_hex,'hex')).update(v.canonical_text.replace('sandbox','production')).digest('hex'),v.signature);
});
test('reference paths cannot be mistaken for live Arena operations or payouts',()=>{
 const m=json('manifest.json'),o=json('openapi.json');
 assert.equal(m.production_ingestion,false);assert.equal(m.payout_authority,false);assert.deepEqual(m.production_paths,[]);
 assert.equal(o['x-production-writes-available'],false);assert.ok(o.servers.every(s=>s.url.startsWith('http://127.0.0.1:')));
 for(const [path,methods] of Object.entries(o.paths))for(const op of Object.values(methods)){
  if(path!=='/v1/status')assert.deepEqual(op.security,[{GameSignature:[]}]);
  for(const p of path.matchAll(/\{([^}]+)\}/g))assert.ok(op.parameters.some(x=>x.name===p[1]&&x.in==='path'&&x.required));
 }
 const receipt=schemas.$defs.Receipt.properties;assert.equal(receipt.payout_authorized.const,false);assert.equal(receipt.anchor.type,'null');
});
