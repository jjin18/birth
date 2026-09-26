import type {IncomingMessage,ServerResponse} from 'node:http';
import type {DatabaseSync} from 'node:sqlite';
import {randomUUID} from 'node:crypto';
import {typingPassages,normalizeTypingChallenge,MAX_CHALLENGE_LENGTH,ROUND_MS} from '../lib/typing-game';

class TypingError extends Error { constructor(public status:number,message:string){super(message)} }
function json(res:ServerResponse,status:number,value:unknown){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(value))}
async function body(req:IncomingMessage){
  if(req.headers['content-type']?.split(';')[0]!=='application/json')throw new TypingError(415,'Send JSON.');
  if(Number(req.headers['content-length']||0)>8192)throw new TypingError(413,'Message too large.');
  const chunks:Buffer[]=[];let bytes=0;
  for await(const chunk of req){bytes+=chunk.length;if(bytes>8192)throw new TypingError(413,'Message too large.');chunks.push(chunk)}
  try{const data=JSON.parse(Buffer.concat(chunks).toString());if(!data||typeof data!=='object'||Array.isArray(data))throw Error();return data}catch{throw new TypingError(400,'Invalid message.')}
}

export function createTyping(db:DatabaseSync,clock:()=>number=Date.now){
  // Additive, isolated tables on the existing persistent Railway volume.
  // Reopening or redeploying never resets challenges, records, or other games.
  db.exec(`CREATE TABLE IF NOT EXISTS typing_challenges(id TEXT PRIMARY KEY,text TEXT NOT NULL UNIQUE,created INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS typing_best(id INTEGER PRIMARY KEY CHECK(id=1),wpm INTEGER NOT NULL,accuracy INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS typing_rounds(id TEXT PRIMARY KEY,challenge_id TEXT NOT NULL,started INTEGER NOT NULL,finished INTEGER NOT NULL DEFAULT 0);`);
  const seed=db.prepare('INSERT OR IGNORE INTO typing_challenges(id,text,created) VALUES(?,?,?)');
  typingPassages.forEach((passage,i)=>seed.run(passage.id,passage.text,i));
  const best=()=>db.prepare('SELECT wpm,accuracy FROM typing_best WHERE id=1').get()??null;
  const list=()=>db.prepare('SELECT id,text FROM typing_challenges ORDER BY created,id').all();
  let window=clock(),reads=0,writes=0,adds=0;
  return async function typing(req:IncomingMessage,res:ServerResponse,url:URL){
    try{
      const method=req.method||'GET',path=url.pathname;
      if(clock()-window>=60000){window=clock();reads=0;writes=0;adds=0}
      if(method==='GET'?++reads>240:++writes>120)throw new TypingError(429,'Try again in a minute.');
      if(path==='/api/typing'&&method==='GET')return json(res,200,{challenges:list(),best:best()});
      if(method!=='POST')throw new TypingError(405,'Method not allowed.');
      if(req.headers.origin!==url.origin||req.headers['sec-fetch-site']==='cross-site')throw new TypingError(403,'Open this game on the website to save.');
      const value=await body(req);
      if(path==='/api/typing/challenges'){
        if(++adds>12)throw new TypingError(429,'Try adding another challenge in a minute.');
        if(typeof value.text!=='string'||value.text.length>MAX_CHALLENGE_LENGTH)throw new TypingError(400,'Use up to 400 characters.');
        const text=normalizeTypingChallenge(value.text);
        if(!text||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(text))throw new TypingError(400,'Add some readable text.');
        const existing=db.prepare('SELECT id FROM typing_challenges WHERE text=?').get(text) as {id:string}|undefined;
        if(existing)return json(res,200,{id:existing.id,challenges:list(),best:best()});
        const count=Number((db.prepare('SELECT COUNT(*) AS n FROM typing_challenges').get() as {n:number}).n);
        if(count>=200)throw new TypingError(409,'The shared challenge list is full.');
        const id=randomUUID();db.prepare('INSERT INTO typing_challenges VALUES(?,?,?)').run(id,text,clock());
        return json(res,201,{id,challenges:list(),best:best()});
      }
      if(path==='/api/typing/start'){
        if(typeof value.id!=='string'||!/^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/.test(value.id)||typeof value.challengeId!=='string')throw new TypingError(400,'Invalid round.');
        if(!db.prepare('SELECT 1 FROM typing_challenges WHERE id=?').get(value.challengeId))throw new TypingError(404,'Challenge not found.');
        // Only temporary tickets expire, never saved challenges or high scores.
        db.prepare('DELETE FROM typing_rounds WHERE started<?').run(clock()-24*60*60*1000);
        db.prepare('INSERT OR IGNORE INTO typing_rounds(id,challenge_id,started) VALUES(?,?,?)').run(value.id,value.challengeId,clock());
        const ticket=db.prepare('SELECT challenge_id,finished FROM typing_rounds WHERE id=?').get(value.id) as {challenge_id:string;finished:number};
        if(ticket.challenge_id!==value.challengeId||ticket.finished)throw new TypingError(409,'Start a new round.');
        return json(res,200,{id:value.id});
      }
      if(path==='/api/typing/finish'){
        if(typeof value.id!=='string')throw new TypingError(400,'Invalid round.');
        const ticket=db.prepare('SELECT r.started,r.finished,c.text FROM typing_rounds r JOIN typing_challenges c ON c.id=r.challenge_id WHERE r.id=?').get(value.id) as {started:number;finished:number;text:string}|undefined;
        if(!ticket)throw new TypingError(404,'Round expired.');
        if(ticket.finished)return json(res,200,{best:best()}); // Idempotent retry.
        if(typeof value.text!=='string'||value.text.length>ticket.text.length||!Number.isInteger(value.attempts)||value.attempts<value.text.length||value.attempts>4000||!Number.isInteger(value.mistakes)||value.mistakes<0||value.mistakes>value.attempts||!Number.isFinite(value.elapsed)||value.elapsed<0||value.elapsed>ROUND_MS)throw new TypingError(400,'Invalid result.');
        const serverElapsed=clock()-ticket.started;
        if(serverElapsed>5*60*1000||serverElapsed+2000<value.elapsed)throw new TypingError(400,'Round timing is invalid.');
        if(value.text!==ticket.text&&value.elapsed!==ROUND_MS)throw new TypingError(400,'Finish the round first.');
        const correct=value.text.split('').reduce((n:number,char:string,i:number)=>n+Number(char===ticket.text[i]),0);
        if(value.mistakes<value.text.length-correct||value.attempts-value.mistakes<correct)throw new TypingError(400,'Invalid accuracy.');
        // Recompute, never trust a submitted WPM/high-score field. Network
        // latency can lower a score slightly, but cannot shorten a full round.
        const elapsed=value.text===ticket.text?Math.max(1000,value.elapsed,Math.min(ROUND_MS,serverElapsed)):ROUND_MS;
        const wpm=Math.round((correct/5)/(elapsed/60000));
        const accuracy=value.attempts?Math.round((value.attempts-value.mistakes)/value.attempts*100):100;
        if(wpm>400)throw new TypingError(400,'Result is too fast. Try a new round.');
        db.exec('BEGIN IMMEDIATE');
        try{
          db.prepare('UPDATE typing_rounds SET finished=1 WHERE id=?').run(value.id);
          db.prepare(`INSERT INTO typing_best(id,wpm,accuracy) VALUES(1,?,?) ON CONFLICT(id) DO UPDATE SET wpm=excluded.wpm,accuracy=excluded.accuracy WHERE excluded.wpm>typing_best.wpm OR (excluded.wpm=typing_best.wpm AND excluded.accuracy>typing_best.accuracy)`).run(wpm,accuracy);
          db.exec('COMMIT');
        }catch(error){db.exec('ROLLBACK');throw error}
        return json(res,200,{best:best()});
      }
      throw new TypingError(404,'Not found.');
    }catch(error){
      if(error instanceof TypingError)return json(res,error.status,{error:error.message});
      console.error('Typing storage request failed');return json(res,503,{error:'Could not save. Please try again.'});
    }
  };
}
