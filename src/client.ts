import {canonicalJson,signRequest,validBaseUrl,MAX_BODY_BYTES} from './protocol.js';
import {validate} from './validate.js';
import {Outbox} from './outbox.js';
import type {ClientOptions,MatchRequest,EventBatch,Receipt} from './types.js';
import type {PendingRequest} from './outbox.js';
import {setTimeout as sleep} from 'node:timers/promises';
export class ArenaError extends Error {
  constructor(public readonly status: number, public readonly code: string, public readonly retryAfter: string | null = null) {
    super('Arena request failed: ' + code);
  }
  get retryable(): boolean { return this.status === 0 || this.status === 429 || this.status >= 500; }
}
/** Server-only client. No method grants game admission, settlement or payout authority. */
export class ArenaClient {
  private options: ClientOptions;
  private outbox: Outbox;
  constructor(options: ClientOptions) {
    this.options = {...options,baseUrl:validBaseUrl(options.baseUrl)};
    if (options.environment !== 'sandbox' || !/^[a-z0-9][a-z0-9_-]{0,63}$/.test(options.gameId) ||
      options.timeoutMs !== undefined && (!Number.isSafeInteger(options.timeoutMs) || options.timeoutMs < 1 || options.timeoutMs > 60000)) throw new Error('Invalid sandbox client configuration');
    signRequest({...this.options,method:'GET',path:'/v1/receipts/'+'0'.repeat(32),body:''});
    this.outbox = new Outbox(options.outboxPath,{base_url:this.options.baseUrl,publisher_id:options.publisherId,game_id:options.gameId,environment:options.environment});
  }
  private owned(value: {publisher_id:string;game_id:string}): void {
    if (value.publisher_id !== this.options.publisherId || value.game_id !== this.options.gameId) throw new Error('Request is outside client publisher/game binding');
  }
  queueMatch(value: MatchRequest): string {
    validate('MatchRequest',value); this.owned(value);
    return this.outbox.queue(value.request_id,'/v1/matches',value);
  }
  queueEvents(value: EventBatch): string {
    validate('EventBatch',value); this.owned(value);
    return this.outbox.queue(value.batch_id,'/v1/matches/'+value.match_id+'/events',value);
  }
  private async request(method: string, path: string, body = ''): Promise<unknown> {
    const headers = signRequest({...this.options,method,path,body});
    if (method === 'POST') headers['Content-Type'] = 'application/json';
    let response: Response;
    try {
      response = await fetch(this.options.baseUrl+path,{method,headers,body:method==='POST'?body:undefined,redirect:'error',signal:AbortSignal.timeout(this.options.timeoutMs??10000)});
    } catch { throw new ArenaError(0,'transport_unavailable'); }
    try {
      if (!(response.headers.get('content-type')??'').toLowerCase().startsWith('application/json') || !response.body) throw new ArenaError(response.status || 502,'invalid_response');
      let n = 0; const parts: Uint8Array[]=[];
      for await (const part of response.body as unknown as AsyncIterable<Uint8Array>) {
        n += part.length; if (n > MAX_BODY_BYTES) { await response.body.cancel().catch(()=>{}); throw new ArenaError(502,'response_too_large'); } parts.push(part);
      }
      const value = JSON.parse(Buffer.concat(parts).toString('utf8'));
      if (!response.ok) throw new ArenaError(response.status,typeof value.error==='string'&&/^[a-z_]+$/.test(value.error)?value.error:'remote_error',response.headers.get('retry-after'));
      return value;
    } catch (e) { if (e instanceof ArenaError) throw e; throw new ArenaError(502,'invalid_response'); }
  }
  private checked(value: unknown, pending: PendingRequest): Receipt {
    validate('Receipt',value); const r=value as Receipt, original=JSON.parse(pending.body);
    if (r.request_id !== pending.request_id || r.request_sha256 !== pending.digest || r.publisher_id !== this.options.publisherId ||
      r.game_id !== this.options.gameId || r.match_id !== original.match_id || r.epoch !== original.epoch ||
      r.kind !== (original.schema==='arena.game.match.v1'?'match.created':'events.accepted') ||
      (original.schema==='arena.game.events.v1' && (r.first_sequence!==original.first_sequence || r.last_sequence!==original.events.at(-1).sequence)) ||
      (original.schema==='arena.game.match.v1' && (r.first_sequence!==null || r.last_sequence!==0))) throw new ArenaError(502,'receipt_mismatch');
    return r;
  }
  async deliver(id: string): Promise<Receipt> {
    const pending = this.outbox.get(id);
    if (pending.receipt) return this.checked(JSON.parse(pending.receipt),pending);
    try {
      if (pending.attempts > 0) {
        try {
          const receipt=this.checked(await this.request('GET','/v1/receipts/'+id),pending);
          this.outbox.accepted(id,receipt); return receipt;
        } catch (e) { if (!(e instanceof ArenaError) || e.status !== 404) throw e; }
      }
      this.outbox.attempt(id); // Commit uncertainty before sending any bytes.
      const receipt=this.checked(await this.request(pending.method,pending.path,pending.body),pending);
      this.outbox.accepted(id,receipt); return receipt;
    } catch (e) { this.outbox.failed(id,e instanceof ArenaError?e.code:'invalid_receipt'); throw e; }
  }
  async flush(maxRequests = 100): Promise<Receipt[]> {
    if (!Number.isSafeInteger(maxRequests) || maxRequests < 1 || maxRequests > 10000) throw new Error('Invalid flush bound');
    const receipts: Receipt[]=[];
    for (const id of this.outbox.pending().slice(0,maxRequests)) receipts.push(await this.deliver(id));
    return receipts;
  }
  async deliverWithRetry(id: string, {maxAttempts=3,maxDelayMs=5000}: {maxAttempts?:number;maxDelayMs?:number} = {}): Promise<Receipt> {
    if (!Number.isSafeInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 10 || !Number.isSafeInteger(maxDelayMs) || maxDelayMs < 1 || maxDelayMs > 60000) throw new Error('Invalid retry bounds');
    for (let attempt=0;;attempt++) {
      try { return await this.deliver(id); }
      catch (e) {
        if (!(e instanceof ArenaError) || !e.retryable || attempt+1 >= maxAttempts) throw e;
        const header=e.retryAfter;
        const after=header===null?0:/^\d+$/.test(header)?Number(header)*1000:Math.max(0,Date.parse(header)-Date.now());
        if (Number.isFinite(after) && after > maxDelayMs) throw e; // Caller schedules a later retry; never retry before Retry-After.
        const ceiling=Math.min(maxDelayMs,250*2**attempt);
        await sleep(Math.max(Number.isFinite(after)?after:0,Math.floor(ceiling*(.5+Math.random()*.5))));
      }
    }
  }
  pending(): string[] { return this.outbox.pending(); }
  close(): void { this.outbox.close(); }
}
