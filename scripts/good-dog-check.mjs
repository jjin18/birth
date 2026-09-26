import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {readFile,stat} from 'node:fs/promises';
const result=await build({stdin:{contents:"export * from './lib/good-dog/world';export * from './lib/good-dog/save';export * from './lib/good-dog/brain';",resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'node'});
const {GameWorld,OWNER_X,serialize,deserialize,SaveManager,SAVE_KEY,encode}=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
function show(world){world.start();const before=serialize(world);world.startShow();for(let i=0;world.show&&i<500;i++)world.tick(100);assert(world.result,'show always terminates');const after=JSON.parse(serialize(world)),old=JSON.parse(before);assert.deepEqual(after.values,old.values,'shows must not train the policy');assert.deepEqual(after.visits,old.visits);assert.equal(after.seed,old.seed);return world.result.score}
function train(world,goal,count){
 world.start();
 for(let round=0;round<count;round++){
  // A patient player repeats the cue, rewarding only appropriate choices.
  if(goal==='fetch'){if(world.dog.holding){world.command('call');for(let i=0;i<120&&world.dog.holding;i++)world.tick(100)}world.throwBall()}
  else world.command(goal);
  for(let i=0;i<240;i++){
   world.tick(100);const credit=world.treatCredit;
   if(credit?.goal===goal){const good=goal==='fetch'?['walk','run','pickup'].includes(credit.action)||(credit.action==='return'&&world.dog.holding)||(credit.action==='drop'&&Math.abs(world.dog.x-OWNER_X)<.055):goal==='sit'?credit.action==='sit':['lie','roll'].includes(credit.action);if(good)world.treat()}
   if(world.goal==='none')break;
  }
 }
}
let untrained=0,trained=0;const samples=[];
for(let seed=1;seed<=16;seed++){
 const dog=new GameWorld(seed*7381);const baseline=show(dog);untrained+=baseline;
 train(dog,'fetch',24);train(dog,'sit',12);train(dog,'roll',16);
 const score=show(dog);trained+=score;samples.push([baseline,score]);
 assert(dog.brain.values.every(Number.isFinite));
 assert(serialize(dog).length<65536);
 const restored=deserialize(serialize(dog));assert.equal(serialize(restored),serialize(dog),'local save round trip');
 assert(dog.training.skills.fetch.successes>0&&dog.training.skills.sit.successes>0&&dog.training.skills.roll.successes>0,JSON.stringify({seed,skills:dog.training.skills}));
}
console.log('Learning comparison:',JSON.stringify({samples,untrained:untrained/16,trained:trained/16}));
assert(trained>untrained+16*20,'actual rewarded training should improve mean show score by at least 20');
assert(trained/16>=65,'trained dog should complete most of the show');
const a=new GameWorld(45),b=new GameWorld(45);a.start();b.start();a.throwBall();b.throwBall();for(let i=0;i<200;i++){a.tick(100);b.tick(100)}assert.equal(serialize(a),serialize(b),'fixed seed and actions are reproducible');
a.running=false;const frozen=serialize(a),time=a.time;a.tick(999999);assert.equal(a.time,time);assert.equal(serialize(a),frozen);
const store=new Map(),manager=new SaveManager({getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v)});manager.save(a);assert.equal(serialize(manager.load()),serialize(a));
store.set(SAVE_KEY,'bad');const damaged=new SaveManager({getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)});const fresh=damaged.load();assert.equal(damaged.save(fresh),false);assert.equal(store.get(SAVE_KEY),'bad','corrupt save is not silently overwritten');
const unavailable=new SaveManager(null);unavailable.load();assert.equal(unavailable.save(a),false);
for(const raw of ['{}','null','x'.repeat(65537),JSON.stringify({...JSON.parse(serialize(a)),values:[[0,Infinity]]}),JSON.stringify({...JSON.parse(serialize(a)),values:[[0,1],[0,2]]})])assert.throws(()=>deserialize(raw));
const reinforced=new GameWorld(55);reinforced.start();reinforced.throwBall();for(let i=0;i<7;i++)reinforced.tick(100);const credit=reinforced.current,index=encode(reinforced.situation()),before=reinforced.brain.value(index,credit.action);assert(reinforced.treat());assert(reinforced.brain.value(index,credit.action)>before);assert.equal(reinforced.treat(),false,'no unlimited treat stacking');
const html=await readFile('public/good-dog.html','utf8');assert(html.includes("connect-src 'none'"));assert(!/\b(?:fetch|XMLHttpRequest|WebSocket)\s*\(/.test(html));assert(!/<(?:script|link|img)\b[^>]*(?:src|href)=["']https?:/i.test(html));
let assetBytes=0;for(const file of ['poses','ball-poses','ryan','ryan-crouching','ryan-treat','tennis-ball','play-ball'])assetBytes+=(await stat(`public/dog/${file}.webp`)).size;
assert(assetBytes<250000);assert(Buffer.byteLength(html)<370000);
assert(!/Export dog|Import dog|Website and offline saves are separate/.test(html));
console.log('PASS: rewarded learning, all three tricks, deterministic ticks, fair show, bounded saves, corruption safeguards, offline/no-network budget.');
