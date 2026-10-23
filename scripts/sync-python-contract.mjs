import {mkdirSync,copyFileSync} from 'node:fs';
const target=new URL('../python/src/hybrid_arena_sdk/contracts/',import.meta.url);
mkdirSync(target,{recursive:true});
for(const file of ['schemas.json','checksums.json'])copyFileSync(new URL('../contracts/game-provider-v1/'+file,import.meta.url),new URL(file,target));
copyFileSync(new URL('../LICENSE',import.meta.url),new URL('../python/LICENSE',import.meta.url));
