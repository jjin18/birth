import type { DatabaseSync } from 'node:sqlite';

/** Keep saved IDs stable while allowing new fortunes to be appended. */
export function initializeFortuneStorage(db:DatabaseSync) {
 db.exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL;
  CREATE TABLE IF NOT EXISTS opened_fortunes (
   id INTEGER PRIMARY KEY CHECK(id >= 0),
   request_id TEXT NOT NULL UNIQUE, opened_by TEXT NOT NULL, opened_at TEXT NOT NULL
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
