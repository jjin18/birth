import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {build} from 'esbuild';

const compiled=await build({stdin:{contents:"export * from './lib/good-dog/world';export * from './lib/good-dog/save';export * from './lib/fighter-score';export * from './server/fortune-storage';",resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'node'});
const {GameWorld,SaveManager,SAVE_KEY,serialize,SCORE_KEY,parseScores,initializeFortuneStorage,resetFortunesOnce}=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));

const trained=new GameWorld(42);
trained.brain.values[4]=3.5;trained.brain.visits[0]=25;
trained.training.skills.fetch={successes:18,rewards:12,announced:true};
trained.best=89;trained.shows=6;
const previousDog=serialize(trained),previousBoxing=JSON.stringify({Jia:8,Ryan:12});
const entries=new Map([['ryans-22nd-good-dog-v1',previousDog],['birthday-boxing-wins-v1',previousBoxing],['unrelated-date-board','preserve me']]);
const storage={getItem:key=>entries.get(key)??null,setItem:(key,value)=>entries.set(key,value)};
assert.equal(SAVE_KEY,'ryans-22nd-good-dog-v2');
assert.equal(SCORE_KEY,'birthday-boxing-wins-v2');
const manager=new SaveManager(storage),fresh=manager.load();
assert.equal(serialize(fresh),serialize(new GameWorld()),'learning, returns, rewards, best and show count all restart');
assert.deepEqual(parseScores(storage.getItem(SCORE_KEY)),{Jia:0,Ryan:0});
manager.save(fresh);storage.setItem(SCORE_KEY,JSON.stringify({Jia:0,Ryan:0}));
assert.equal(storage.getItem('ryans-22nd-good-dog-v1'),previousDog,'old dog progress remains recoverable');
assert.equal(storage.getItem('birthday-boxing-wins-v1'),previousBoxing,'old win totals remain recoverable');
assert.equal(storage.getItem('unrelated-date-board'),'preserve me');
fresh.training.skills.sit.successes=1;manager.save(fresh);
assert.equal(manager.load().training.skills.sit.successes,1,'subsequent reloads preserve new progress');

const db=new DatabaseSync(':memory:');
try {
 initializeFortuneStorage(db);
 db.exec("CREATE TABLE wall_entries (id TEXT PRIMARY KEY,note TEXT,src TEXT); CREATE TABLE wall_uploads (id TEXT PRIMARY KEY,bytes INTEGER); INSERT INTO wall_entries VALUES ('memory','keep this note','/wall-images/keep.webp'); INSERT INTO wall_uploads VALUES ('keep',4321)");
 const wallBefore=db.prepare('SELECT * FROM wall_entries').all(),uploadsBefore=db.prepare('SELECT * FROM wall_uploads').all();
 db.prepare('INSERT INTO opened_fortunes VALUES (?,?,?,?)').run(0,'first','room','2026-09-25T00:00:00Z');
 const fortunesBefore=db.prepare('SELECT * FROM opened_fortunes').all();
 assert.deepEqual(resetFortunesOnce(db,'minigames-reset-20260926-v2'),{applied:true,archived:1});
 assert.equal(db.prepare('SELECT COUNT(*) AS n FROM opened_fortunes').get().n,0);
 assert.deepEqual(db.prepare('SELECT id,request_id,opened_by,opened_at FROM fortune_reset_backup').all(),fortunesBefore);
 assert.deepEqual(db.prepare('SELECT * FROM wall_entries').all(),wallBefore,'date-board notes and photo references are unchanged');
 assert.deepEqual(db.prepare('SELECT * FROM wall_uploads').all(),uploadsBefore,'date-board uploads are unchanged');
 db.prepare('INSERT INTO opened_fortunes VALUES (?,?,?,?)').run(1,'new-note','room','2026-09-26T00:00:00Z');
 assert.deepEqual(resetFortunesOnce(db,'minigames-reset-20260926-v2'),{applied:false,archived:0});
 assert.equal(db.prepare('SELECT COUNT(*) AS n FROM opened_fortunes').get().n,1,'a restart never resets new openings');
}finally{db.close()}
console.log('PASS: fresh dog learning and boxing totals, recoverable previous progress, one-time fortune reset, date-board data untouched.');
