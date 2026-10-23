import {DatabaseSync} from 'node:sqlite';
import {mkdirSync,lstatSync,openSync,closeSync,constants} from 'node:fs';
import {dirname,isAbsolute} from 'node:path';
export function privateDatabase(path: string): DatabaseSync {
  if (!isAbsolute(path)) throw new Error('Absolute private database path required');
  const dir = dirname(path);
  mkdirSync(dir,{recursive:true,mode:0o700});
  const parent = lstatSync(dir);
  if (!parent.isDirectory() || parent.isSymbolicLink() || parent.mode & 0o077 || parent.uid !== process.getuid?.()) throw new Error('Owner-only database directory required');
  try { closeSync(openSync(path,constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | constants.O_NOFOLLOW,0o600)); }
  catch (e) { if ((e as NodeJS.ErrnoException).code !== 'EEXIST') throw e; }
  const file = lstatSync(path);
  if (!file.isFile() || file.isSymbolicLink() || file.mode & 0o077 || file.uid !== process.getuid?.()) throw new Error('Owner-only database file required');
  const db = new DatabaseSync(path);
  db.exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000');
  return db;
}
