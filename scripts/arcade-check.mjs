import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';
const bundle = await build({entryPoints:['lib/fighter-game.ts'],bundle:true,write:false,format:'esm',platform:'node'});
const {createMatch,stepMatch,poseFor,IDLE_INPUT,CONTROLS,ARENA,PUNCH_DAMAGE}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const input=(values={})=>({...IDLE_INPUT,...values});
const advance=(m,seconds,a=input(),b=input())=>{for(let t=0;t<seconds;t+=.01)stepMatch(m,[a,b],.01)};
let m=createMatch();
assert.deepEqual(m.fighters.map(f=>poseFor(f,m.phase)),['tpose','tpose']);
m=createMatch('ready'); advance(m,.5,input({right:true,punch:true}),input({left:true,punch:true}));
assert.equal(m.fighters[0].x,260); assert.equal(m.fighters[1].x,700);
assert.deepEqual(m.fighters.map(f=>poseFor(f,m.phase)),['ready','ready']);
advance(m,.6); assert.equal(m.phase,'fight');
const initial=m.fighters.map(f=>f.x); advance(m,4);
assert.deepEqual(m.fighters.map(f=>f.x),initial,'no bot movement');
assert.deepEqual(m.fighters.map(f=>f.hp),[100,100],'no bot attack');
stepMatch(m,[input({right:true}),input({left:true})],.04);
assert(m.fighters[0].x>260&&m.fighters[1].x<700,'both players move simultaneously');
stepMatch(m,[input({jump:true}),input({jump:true})],.02);
assert.deepEqual(m.fighters.map(f=>poseFor(f,m.phase)),['jump','jump']);
let jumpPeak=0;for(let i=0;i<135;i++){stepMatch(m,[input(),input()],.01);jumpPeak=Math.max(jumpPeak,m.fighters[0].y);assert.equal(m.fighters[0].y,m.fighters[1].y,'both jump to exactly the same height');}
assert(jumpPeak>170&&jumpPeak<190,'jump is over twice the original height'); assert(m.fighters.every(f=>f.y===0));
// Each player can independently hurt and knock out the other.
for(const attacker of [0,1]){
 m=createMatch('fight'); m.fighters[0].x=420; m.fighters[1].x=530;
 const actions=[input(),input()]; actions[attacker]=input({punch:true});
 stepMatch(m,actions,.01); assert.equal(poseFor(m.fighters[attacker],m.phase),'punch');
 const damage=PUNCH_DAMAGE[m.fighters[attacker].name];
 advance(m,.08,...actions); assert.equal(m.fighters[1-attacker].hp,100-damage); assert.equal(poseFor(m.fighters[1-attacker],m.phase),'hurt');
 const hp=m.fighters[1-attacker].hp; advance(m,.1); assert.equal(m.fighters[1-attacker].hp,hp,'one hit per punch');
 m.fighters[1-attacker].hp=damage; m.fighters[0].x=420; m.fighters[1].x=530; m.fighters[attacker].cooldown=0;
 advance(m,.12,...actions); assert.equal(m.phase,'finished'); assert.equal(poseFor(m.fighters[1-attacker],m.phase),'fall');
 const final=JSON.stringify(m); advance(m,2,...actions); assert.equal(JSON.stringify(m),final,'finished match is frozen');
}
m=createMatch('fight');m.fighters[0].x=420;m.fighters[1].x=530;m.fighters.forEach(f=>f.hp=8);
advance(m,.1,input({punch:true}),input({punch:true})); assert.equal(m.result,'Draw');assert(m.fighters.every(f=>f.fallen),'simultaneous KO');
m=createMatch('fight'); m.fighters[0].x=600; m.fighters[1].x=300;stepMatch(m,[input(),input()],.01);
assert.deepEqual(m.fighters.map(f=>f.facing),[-1,1],'sprites face each other after swapping sides');
advance(m,8,input({right:true}),input({left:true}));assert.equal(m.fighters[0].x,ARENA.right);assert.equal(m.fighters[1].x,ARENA.left);
m=createMatch('fight');m.time=.01;m.fighters[0].hp=80;stepMatch(m,[input(),input()],.02);assert.equal(m.result,'Ryan wins');assert.equal(poseFor(m.fighters[0],m.phase),'fall');
m=createMatch('fight');m.time=.01;stepMatch(m,[input(),input()],.02);assert.equal(m.result,'Draw');assert(m.fighters.every(f=>!f.fallen));
assert.deepEqual(CONTROLS.map(c=>[c.left,c.right,c.jump,c.punch]),[['KeyA','KeyD','KeyW','KeyS'],['ArrowLeft','ArrowRight','ArrowUp','ArrowDown']]);
assert.deepEqual(PUNCH_DAMAGE,{Jia:10,Ryan:8},'Ryan punches are deliberately 20% weaker');
for(const attacker of [0,1]){
 const defender=1-attacker;
 m=createMatch('fight');m.fighters[0].x=420;m.fighters[1].x=530;
 const actions=[input(),input()];actions[defender]=input({jump:true});stepMatch(m,actions,.01);advance(m,.15);
 actions[defender]=input();actions[attacker]=input({punch:true});advance(m,.15,...actions);
 assert.equal(m.fighters[defender].hp,100,'either player can evade a punch by jumping above it');
 m=createMatch('fight');m.fighters[0].x=410;m.fighters[1].x=550;
 actions[defender]=input(defender===0?{left:true}:{right:true});advance(m,.15,...actions);
 assert.equal(m.fighters[defender].hp,100,'either player can step out of range during punch windup');
}
const spriteBundle=await build({entryPoints:['lib/fighter-sprites.ts'],bundle:true,write:false,format:'esm',platform:'node'});
const {CHARACTER_SCALE,FRAMES}=await import('data:text/javascript;base64,'+Buffer.from(spriteBundle.outputFiles[0].text).toString('base64'));
assert.equal(CHARACTER_SCALE.Jia,.85);assert.equal(CHARACTER_SCALE.Ryan,1);
for(const pose of Object.keys(FRAMES.Jia))assert(FRAMES.Jia[pose].height*CHARACTER_SCALE.Jia<FRAMES.Ryan[pose].height*CHARACTER_SCALE.Ryan,`Jia is smaller in ${pose}`);
for(const name of ['Jia','Ryan'])for(const frame of Object.values(FRAMES[name])){
 const scale=frame.height/frame.rect[3]*CHARACTER_SCALE[name];
 const top=(frame.rect[1]-frame.baseline)*scale;
 const sole=(frame.baseline-frame.rect[1])*scale;
 assert.equal(top+sole,0,'every pose pins its shoe baseline to the same floor, regardless of scale');
 assert(frame.baseline>frame.rect[1]&&frame.baseline<=frame.rect[1]+frame.rect[3]);
}
let bytes=0;
for(const file of ['jia-poses.webp','ryan-poses.webp']){
 const source=await readFile('public/arcade/'+file); bytes+=source.length;
 const meta=await sharp(source).metadata(); assert(meta.hasAlpha); assert.equal(meta.width,1536);assert.equal(meta.height,1024);
}
assert(bytes<2*1024*1024,'arcade art budget: 2 MiB combined');
const scoreBundle=await build({entryPoints:['lib/fighter-score.ts'],bundle:true,write:false,format:'esm',platform:'node'});
const {parseScores,addWin,matchWinner}=await import('data:text/javascript;base64,'+Buffer.from(scoreBundle.outputFiles[0].text).toString('base64'));
assert.deepEqual(parseScores(null),{Jia:0,Ryan:0});assert.deepEqual(parseScores('{broken'),{Jia:0,Ryan:0});assert.deepEqual(parseScores('{"Jia":-1,"Ryan":7}'),{Jia:0,Ryan:0});
let scores=addWin(parseScores(null),matchWinner('Jia wins'));scores=addWin(scores,matchWinner('Ryan wins'));scores=addWin(scores,matchWinner('Draw'));assert.deepEqual(scores,{Jia:1,Ryan:1});assert.deepEqual(parseScores(JSON.stringify(scores)),scores);
const fighterSource=await readFile('components/MiniFighter.tsx','utf8');assert(!fighterSource.includes('Two players · One keyboard'));assert(fighterSource.includes('recorded.current!==s'),'record each completed match once');assert(fighterSource.includes("view.phase==='fight'&&view.time<=10"));
assert(!(await readFile('components/Arcade.tsx','utf8')).includes('Jia vs. Ryan'));assert((await readFile('app/arcade.css','utf8')).includes('.fighter-final-seconds .fighter-arena::after{opacity:1}'));
console.log(`PASS: local-only two-player controls, all six poses, fair trades, collisions, bounds, knockouts, draw, timeout, rematch reset; two alpha atlases ${(bytes/1024).toFixed(0)} KiB.`);
