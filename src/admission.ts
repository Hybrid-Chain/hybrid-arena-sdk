import{createHmac}from'node:crypto';import{canonicalJson,newId,sha256,validBaseUrl}from'./protocol.js';
export function signPracticeAdmission(c:{keyId:string;publisherId:string;secretHex:string},method:'GET'|'POST',body='',timestamp=String(Math.floor(Date.now()/1000)),nonce=newId()){
 if(!/^src_[a-f0-9]{24}$/.test(c.keyId)||!/^pub_[a-f0-9]{24}$/.test(c.publisherId)||!/^[a-f0-9]{64}$/.test(c.secretHex)||!/^\d{1,12}$/.test(timestamp)||!/^[a-f0-9]{32}$/.test(nonce))throw Error('Invalid admission signing parameters');
 const value=['ARENA-PRACTICE-ADMISSION-V1',method,'/v1/practice-admissions',c.publisherId,'sandbox',timestamp,nonce,sha256(body)].join('\n');return{'X-Arena-Key-Id':c.keyId,'X-Arena-Publisher':c.publisherId,'X-Arena-Environment':'sandbox','X-Arena-Timestamp':timestamp,'X-Arena-Nonce':nonce,'X-Arena-Signature':createHmac('sha256',Buffer.from(c.secretHex,'hex')).update(value).digest('hex')};
}
export class PracticeAdmissionClient{
 private origin:string;constructor(private c:{baseUrl:string;keyId:string;publisherId:string;secretHex:string},private transport:typeof fetch=fetch){this.origin=validBaseUrl(c.baseUrl);}
 private async request(method:'GET'|'POST',v?:unknown){const body=v?canonicalJson(v):'';const r=await this.transport(this.origin+'/v1/practice-admissions',{method,redirect:'error',signal:AbortSignal.timeout(10000),headers:{...signPracticeAdmission(this.c,method,body),...(v?{'Content-Type':'application/json'}:{})},...(v?{body}:{})});if(!r.ok)throw Object.assign(Error('Source admission rejected'),{status:r.status});return r.json();}
 pending(){return this.request('GET');}
 /** Flush authoritative events first; persist this exact response and retry it unchanged. */
 decide(v:Record<string,unknown>){return this.request('POST',v);}
}
