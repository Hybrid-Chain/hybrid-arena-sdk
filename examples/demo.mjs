// Start `npm run sandbox`, then run this with an explicit loopback base URL.
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {ArenaClient} from '../dist/index.js';
const baseUrl=process.argv[2];
if(!baseUrl||new URL(baseUrl).hostname!=='127.0.0.1'||new URL(baseUrl).protocol!=='http:')throw Error('Explicit loopback URL required');
const fixture=name=>JSON.parse(readFileSync(new URL('../contracts/game-provider-v1/fixtures/'+name,import.meta.url)));
const client=new ArenaClient({baseUrl,publisherId:'demo-studio',gameId:'demo-duel',keyId:'demo-key',secretHex:'01'.repeat(32),environment:'sandbox',outboxPath:resolve('.arena/node-demo/outbox.sqlite')});
try{client.queueMatch(fixture('demo-match.json'));client.queueEvents(fixture('demo-events.json'));console.log(JSON.stringify(await client.flush(),null,2));}finally{client.close();}
