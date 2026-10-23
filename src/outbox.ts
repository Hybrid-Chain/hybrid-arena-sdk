import type {DatabaseSync} from 'node:sqlite';
import {privateDatabase} from './private-db.js';
import {canonicalJson,sha256,MAX_BODY_BYTES} from './protocol.js';
import type {Receipt} from './types.js';
export interface PendingRequest {
  request_id: string; method: 'POST'; path: string; body: string;
  digest: string; attempts: number; receipt: string | null;
}
export class Outbox {
  private db: DatabaseSync;
  constructor(path: string, binding: Record<string,string>) {
    this.db = privateDatabase(path);
    try {
      this.db.exec('CREATE TABLE IF NOT EXISTS target(binding TEXT NOT NULL); CREATE TABLE IF NOT EXISTS requests(ordinal INTEGER PRIMARY KEY, request_id TEXT UNIQUE NOT NULL, method TEXT NOT NULL, path TEXT NOT NULL, body TEXT NOT NULL, digest TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, receipt TEXT, last_error TEXT)');
      this.db.exec('BEGIN IMMEDIATE');
      try {
        const target = canonicalJson(binding);
        const existing = this.db.prepare('SELECT binding FROM target').get() as {binding:string} | undefined;
        if (existing && existing.binding !== target) throw new Error('Outbox destination or publisher binding changed');
        if (!existing) this.db.prepare('INSERT INTO target(binding) VALUES(?)').run(target);
        this.db.exec('COMMIT');
      } catch (e) { this.db.exec('ROLLBACK'); throw e; }
    } catch (e) { this.db.close(); throw e; }
  }
  queue(id: string, path: string, value: unknown): string {
    const body = canonicalJson(value), digest = sha256(body);
    if (Buffer.byteLength(body) > MAX_BODY_BYTES) throw new Error('Request exceeds body limit');
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const old = this.db.prepare('SELECT path,body FROM requests WHERE request_id=?').get(id) as {path:string;body:string} | undefined;
      if (old && (old.path !== path || old.body !== body)) throw new Error('Request ID already binds different terms');
      if (!old) {
        const n = this.db.prepare('SELECT count(*) AS n FROM requests').get() as {n:number};
        if (n.n >= 10000) throw new Error('Reference outbox capacity reached');
        this.db.prepare("INSERT INTO requests(request_id,method,path,body,digest) VALUES(?,'POST',?,?,?)").run(id,path,body,digest);
      }
      this.db.exec('COMMIT'); return id;
    } catch (e) { this.db.exec('ROLLBACK'); throw e; }
  }
  get(id: string): PendingRequest {
    const row = this.db.prepare('SELECT * FROM requests WHERE request_id=?').get(id) as unknown as PendingRequest | undefined;
    if (!row || sha256(row.body) !== row.digest) throw new Error('Unknown or corrupted outbox request');
    return row;
  }
  pending(): string[] { return (this.db.prepare('SELECT request_id FROM requests WHERE receipt IS NULL ORDER BY ordinal').all() as {request_id:string}[]).map(x=>x.request_id); }
  attempt(id: string): void { this.db.prepare('UPDATE requests SET attempts=attempts+1 WHERE request_id=?').run(id); }
  accepted(id: string, receipt: Receipt): void { this.db.prepare('UPDATE requests SET receipt=?,last_error=NULL WHERE request_id=?').run(canonicalJson(receipt),id); }
  failed(id: string, code: string): void { this.db.prepare('UPDATE requests SET last_error=? WHERE request_id=?').run(code,id); }
  close(): void { this.db.close(); }
}
