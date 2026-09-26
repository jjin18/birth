import {GameWorld} from './world';
import {VALUE_COUNT,STATE_COUNT} from './brain';
import {SKILLS,type SkillProgress} from './training';
// Requested fresh start: leave v1 untouched as a recovery backup, not active progress.
export const SAVE_KEY='ryans-22nd-good-dog-v2';
const LIMIT=65536;
type Store=Pick<Storage,'getItem'|'setItem'>;
function pairs(value:unknown,length:number,min:number,max:number):[number,number][]{
 if(!Array.isArray(value)||value.length>length)throw Error('Invalid learning table');
 const seen=new Set<number>();
 return value.map(pair=>{
  if(!Array.isArray(pair)||pair.length!==2||!Number.isInteger(pair[0])||pair[0]<0||pair[0]>=length||seen.has(pair[0])||typeof pair[1]!=='number'||!Number.isFinite(pair[1])||pair[1]<min||pair[1]>max)throw Error('Invalid learning table');
  seen.add(pair[0]);return [pair[0],pair[1]];
 });
}
function integer(value:unknown,max:number){if(typeof value!=='number'||!Number.isInteger(value)||value<0||value>max)throw Error('Invalid save');return value}
export function serialize(world:GameWorld){
 const sparse=(array:Float32Array|Uint16Array)=>Array.from(array,(n,i)=>[i,Math.round(n*10000)/10000]).filter(([,n])=>n!==0);
 return JSON.stringify({version:1,seed:world.brain.seed,values:sparse(world.brain.values),visits:sparse(world.brain.visits),skills:world.training.skills,best:world.best,shows:world.shows});
}
export function deserialize(raw:string):GameWorld{
 if(raw.length>LIMIT)throw Error('Save file is too large');
 const data=JSON.parse(raw);if(!data||data.version!==1)throw Error('This is not a Good Dog save');
 const world=new GameWorld(integer(data.seed,4294967295));
 for(const [i,n] of pairs(data.values,VALUE_COUNT,-8,16))world.brain.values[i]=n;
 for(const [i,n] of pairs(data.visits,STATE_COUNT,0,65535)){if(!Number.isInteger(n))throw Error('Invalid visits');world.brain.visits[i]=n}
 for(const key of SKILLS){const p=data.skills?.[key];if(!p||typeof p.announced!=='boolean')throw Error('Invalid progress');world.training.skills[key]={successes:integer(p.successes,9999),rewards:integer(p.rewards,9999),announced:p.announced} satisfies SkillProgress}
 world.best=integer(data.best,100);world.shows=integer(data.shows,999999);return world;
}
export class SaveManager{
 private blocked=false;status='Saved on this device';
 constructor(private store:Store|null){}
 load(){try{const raw=this.store?.getItem(SAVE_KEY);if(raw)return deserialize(raw);if(!this.store)this.status='Storage unavailable. Export to keep your dog.'}catch{this.blocked=true;this.status='Previous save unreadable; preserved. Export this session to keep it.'}return new GameWorld()}
 save(world:GameWorld){
  if(this.blocked)return false;
  try{if(!this.store)throw Error();const raw=serialize(world);if(raw.length>LIMIT)throw Error();this.store.setItem(SAVE_KEY,raw);this.status='Saved on this device';return true}
  catch{this.status='Could not save. Export to keep your dog.';return false}
 }
 import(raw:string){const world=deserialize(raw);this.blocked=false;this.save(world);return world}
}
