import type { DatabaseSync } from 'node:sqlite';

/** Keep saved IDs stable while allowing new fortunes to be appended. */
export function initializeFortuneStorage(db:DatabaseSync) {
 db.exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL;
  CREATE TABLE IF NOT EXISTS opened_fortunes (
   id INTEGER PRIMARY KEY CHECK(id >= 0),
   request_id TEXT NOT NULL UNIQUE, opened_by TEXT NOT NULL, opened_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS fortune_resets (
   reset_key TEXT PRIMARY KEY, reset_at TEXT NOT NULL, archived_count INTEGER NOT NULL
  );`);
 const table=db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='opened_fortunes'").get() as {sql:string};
 if(!/CHECK\s*\(id\s*>=\s*0\s*AND\s*id\s*<\s*200\)/i.test(table.sql))return;
 // The original Railway schema capped IDs at 199. Rebuild it transactionally:
 // either every existing row/request/date survives, or the old table stays intact.
 db.exec('BEGIN IMMEDIATE');
 try {
  db.exec(`CREATE TABLE opened_fortunes_expanded (
    id INTEGER PRIMARY KEY CHECK(id >= 0),
    request_id TEXT NOT NULL UNIQUE, opened_by TEXT NOT NULL, opened_at TEXT NOT NULL
   );
   INSERT INTO opened_fortunes_expanded SELECT id,request_id,opened_by,opened_at FROM opened_fortunes;
   DROP TABLE opened_fortunes;
   ALTER TABLE opened_fortunes_expanded RENAME TO opened_fortunes;
   COMMIT;`);
 }catch(error){db.exec('ROLLBACK');throw error}
}

/** A reset must never be undone by the old Sites import on a later restart. */
export function hasFortuneReset(db:DatabaseSync) {
 return Boolean(db.prepare('SELECT 1 FROM fortune_resets LIMIT 1').get());
}

/** Operator-only, opt-in maintenance; there is deliberately no public reset API. */
export function resetFortunesOnce(db:DatabaseSync,resetKey:string) {
 if(!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/.test(resetKey))throw Error('Invalid fortune reset key');
 db.exec('BEGIN IMMEDIATE');
 try {
  if(db.prepare('SELECT 1 FROM fortune_resets WHERE reset_key=?').get(resetKey)){
   db.exec('COMMIT');return {applied:false,archived:0};
  }
  db.exec(`CREATE TABLE IF NOT EXISTS fortune_reset_backup (
   reset_key TEXT NOT NULL, id INTEGER NOT NULL, request_id TEXT NOT NULL,
   opened_by TEXT NOT NULL, opened_at TEXT NOT NULL, PRIMARY KEY(reset_key,id)
  )`);
  const archived=Number(db.prepare(`INSERT INTO fortune_reset_backup
   SELECT ?,id,request_id,opened_by,opened_at FROM opened_fortunes`).run(resetKey).changes);
  db.exec('DELETE FROM opened_fortunes');
  db.prepare('INSERT INTO fortune_resets VALUES (?,?,?)').run(resetKey,new Date().toISOString(),archived);
  db.exec('COMMIT');return {applied:true,archived};
 }catch(error){db.exec('ROLLBACK');throw error}
}
