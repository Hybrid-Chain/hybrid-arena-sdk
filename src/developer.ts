import {canonicalJson,validBaseUrl} from './protocol.js';
/** A separate scoped developer credential. This is never a game-source or wallet client. */
export class ArenaDeveloperClient {
 private origin:string;
 constructor(private config:{base_url:string;token:string;publisher_id:string;game_id:string},private transport:typeof fetch=fetch){
  this.origin=validBaseUrl(config.base_url);
  if(this.origin!=='https://hybrid-arena.com'&&!/^http:\/\/127\.0\.0\.1:\d+$/.test(this.origin))throw Error('Canonical Arena origin or literal loopback required');
  if(!/^dev_[a-f0-9]{24}\.[A-Za-z0-9_-]{43}$/.test(config.token)||!/^pub_[a-f0-9]{24}$/.test(config.publisher_id)||!/^g_[a-f0-9]{24}$/.test(config.game_id))throw Error('Invalid scoped developer configuration');
 }
 private async request(method:string,path:string,value?:unknown){const r=await this.transport(this.origin+path,{method,redirect:'error',signal:AbortSignal.timeout(15000),headers:{Authorization:'Bearer '+this.config.token,...(value?{'Content-Type':'application/json'}:{})},...(value?{body:canonicalJson(value)}:{})});if(!r.ok){let code='developer_request_rejected';try{code=(await r.json() as {error:string}).error??code;}catch{}throw Object.assign(Error(code),{code,status:r.status});}return r.json();}
 inspect(){return this.request('GET','/api/studio/automation?publisher='+this.config.publisher_id+'&game='+this.config.game_id);}
 command(value:Record<string,unknown>){if(!['release_create','rule_create'].includes(String(value.action))||!/^[a-f0-9]{32}$/.test(String(value.request_id??'')))throw Error('Draft release/rule and original 32-hex request ID required');if(value.publisher_id!==this.config.publisher_id||value.game_id!==this.config.game_id)throw Error('Developer credential binding mismatch');return this.request('POST','/api/studio/automation',value);}
}
