import {readFileSync} from 'node:fs';
import {Ajv} from 'ajv';
const schemas = JSON.parse(readFileSync(new URL('../contracts/game-provider-v1/schemas.json',import.meta.url),'utf8'));
const ajv = new Ajv({strict: true, allErrors: true});
ajv.addSchema(schemas);
export function validate(name: 'GameManifest' | 'MatchRequest' | 'EventBatch' | 'Receipt', value: unknown): void {
  if (!ajv.validate(schemas.$id + '#/$defs/' + name, value)) throw new Error('Invalid ' + name);
}
