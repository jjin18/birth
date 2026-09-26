import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build} from 'esbuild';
import sharp from 'sharp';
const bundle=await build({stdin:{contents:"export * from './lib/good-dog/world';export * from './lib/good-dog/presentation';",resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'node'});
const {GameWorld,OWNER_X,dogSprite,POSE_ROWS,activityLabel,feedback,ballFlight,fetchPhase,isPettingReward}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const dog=new GameWorld(42);dog.start();dog.throwBall(.78);
assert.equal(ballFlight(dog).x,OWNER_X);
for(let i=0;i<6;i++){dog.tick(100);assert.equal(dog.current,null,'dog waits for the ball to land');assert(ballFlight(dog).lift>=0&&ballFlight(dog).lift<=52)}
dog.tick(100);assert.equal(ballFlight(dog).x,.78);assert.equal(ballFlight(dog).lift,0);
dog.dog.holding=true;dog.dog.facing=-1;dog.current={action:'return'};
assert.deepEqual(dogSprite(dog),{sheet:'ball',pose:12,mirror:false});
dog.dog.facing=1;assert.deepEqual(dogSprite(dog),{sheet:'ball',pose:13,mirror:false});
dog.current=null;assert.equal(dogSprite(dog).pose,14);
dog.command('call');assert.equal(dog.goal,'fetch','calling never abandons a carried fetch');
const label=activityLabel(dog);for(const action of ['idle','sit','look','return']){dog.current={action};assert.equal(activityLabel(dog),label,'headline does not flicker through micro-actions')}
dog.current={action:'drop'};assert.equal(dogSprite(dog).pose,15);
assert.deepEqual(POSE_ROWS.map(r=>r.top),[0,216,432,648],'uniform caption-free atlas cells');
const played=new GameWorld(123);played.start();played.throwBall();
for(let i=0;i<400&&played.goal!=='none';i++)played.tick(100);
assert.equal(played.goal,'none');const completed=played.treatCredit;assert(completed.success);
for(let i=0;i<200;i++)played.tick(100);
assert.equal(played.treatCredit,completed,'completed pose remains available while user reads');
assert.equal(played.dog.posture,'sit');assert.equal(played.dog.facing,-1);
assert.equal(played.canTreat,true,'no short reward timeout after success');assert(feedback(played).includes('brought it back'));
const beforeTreat=JSON.stringify({dogX:played.dog.x,ball:played.ball,flight:ballFlight(played)});
played.treat();assert(feedback(played).includes('Good dog')||feedback(played).includes('learned'));
assert.equal(JSON.stringify({dogX:played.dog.x,ball:played.ball,flight:ballFlight(played)}),beforeTreat,'reward never moves the dog or ball');
assert(isPettingReward(played),'empty-mouthed dog beside Ryan uses petting reference');
played.dog.holding=true;assert(!isPettingReward(played),'never replace a carrying pose with an empty mouth');
played.dog.holding=false;played.dog.x=.7;assert(!isPettingReward(played),'reward cannot teleport a distant dog');played.dog.x=OWNER_X;
for(let i=0;i<11;i++)played.tick(100);assert(!isPettingReward(played),'reward pose expires');
assert.equal(played.pose(),3,'reward does not make a seated dog jump to a standing pose');
played.dog.facing=1;played.command('call');assert.equal(played.dog.facing,-1);assert.equal(played.dog.posture,'sit');assert.equal(played.goal,'none');
const source=await readFile('lib/good-dog/ui.ts','utf8');assert(!source.includes('gd-mouth-ball'),'carrying uses supplied artwork instead of floating overlay');
assert(source.includes("world.dog.holding||spec.sheet==='ball'"),'world ball is hidden when sprite already contains one');
assert(!source.includes("phase==='reward'?`calc"),'ball coordinates do not follow status labels');
assert(source.includes('renderedThrow!==world.lastThrow'),'new throws cannot interpolate from the last round');
assert(source.includes('Train your dog!'));
// A stale rewarded fetch used to create a phantom ball during show tricks.
played.startShow();let trickTicks=0;
for(let i=0;i<500&&played.show;i++){
 const prevRound=played.show.round,prevX=played.ball.x,prevAction=played.current?.action;
 played.tick(100);
 if(played.show?.round===prevRound&&played.ball.x!==prevX)assert.equal(prevAction,'drop','only dropping moves a resting ball');
 if(played.show&&(played.goal==='sit'||played.goal==='roll')){trickTicks++;assert(!played.ball.visible);assert.notEqual(fetchPhase(played),'reward')}
 assert(!isPettingReward(played),'evaluation cannot replay training reward art');
}
assert(trickTicks>0);
for(const [name,rows] of [['poses',4],['ball-poses',1]]){
 const {data,info}=await sharp(`public/dog/${name}.webp`).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 assert.equal(info.width,1152);assert.equal(info.height,162*rows);
 for(let row=0;row<rows;row++)for(let col=0;col<4;col++){
  for(let x=0;x<288;x++)for(const y of [0,161])assert(data[((row*162+y)*info.width+col*288+x)*4+3]<16,`${name} pose ${row*4+col} top/bottom intact`);
  for(let y=0;y<162;y++)for(const x of [0,287])assert(data[((row*162+y)*info.width+col*288+x)*4+3]<16,`${name} pose ${row*4+col} sides intact`);
 }
}
assert(!source.includes('Export dog')&&!source.includes('data-save')&&!source.includes('data-import'));
assert(source.includes('data-action="show"')&&source.includes("d:'show'"),'Dog show and its keyboard shortcut remain available');
assert(source.includes('Dog show (train first)')&&source.includes('Q-table is frozen'),'show copy distinguishes training from evaluation');
assert(source.includes('tabular Q-learning')&&source.includes('State space · 160')&&source.includes('Action space · 10'),'help explains the real learning algorithm and spaces');
const model=await readFile('components/Penthouse/ImportedDog.tsx','utf8');
assert(!/dogBark|dogTime|Math.exp|useFrame|transformed.y/.test(model),'scanned dog cannot be deformed by a reset clock');
assert(model.includes('applyPackedMaterial(material)'),'lossless channel-packing memory savings retained');
console.log('PASS: carry/return/drop sprites, caption clipping, tennis arc, stable labels, delayed rewards, quiet saves and clock-reset deformation regression.');
