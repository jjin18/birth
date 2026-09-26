import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build} from 'esbuild';
const bundle=await build({entryPoints:['lib/good-dog/bark.ts'],bundle:true,write:false,format:'esm',platform:'node',metafile:true});
assert.deepEqual(Object.keys(bundle.metafile.inputs),['lib/good-dog/bark.ts'],'sound has no world, training, save or storage dependency');
const {mountBarkAudio}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
globalThis.document=Object.assign(new EventTarget(),{hidden:false});globalThis.window=new EventTarget();
class Audio extends EventTarget{
 paused=true;currentTime=0;plays=0;loads=0;reject=false;
 play(){this.plays++;this.paused=false;return this.reject?Promise.reject(Error('Playback blocked')):Promise.resolve()}
 pause(){this.paused=true}
 removeAttribute(name){delete this[name]}
 load(){this.loads++}
}
class Button extends EventTarget{
 label={textContent:''};attributes=new Map();
 querySelector(){return this.label}
 setAttribute(key,value){this.attributes.set(key,value)}
 click(){this.dispatchEvent(new Event('click'))}
}
const audio=new Audio(),button=new Button(),status={textContent:''};
const bark=mountBarkAudio(audio,button,status,'/dog/bark.mp3');
assert.equal(audio.plays,0,'never autoplay');assert.equal(audio.preload,'none','do not slow down graphics with audio preload');
assert.equal(button.label.textContent,'Bark');assert.equal(status.textContent,'','no idle helper text');
button.click();await Promise.resolve();assert.equal(audio.plays,1);assert.equal(button.label.textContent,'Stop bark');
audio.currentTime=1;button.click();assert(audio.paused);assert.equal(audio.currentTime,0);assert.equal(audio.plays,1,'repeat click stops instead of overlapping');
button.click();await Promise.resolve();audio.dispatchEvent(new Event('ended'));assert.equal(button.label.textContent,'Bark');assert.equal(button.attributes.get('aria-pressed'),'false');
audio.reject=true;button.click();await Promise.resolve();assert.match(status.textContent,/Could not play/);assert.equal(button.label.textContent,'Bark');
audio.reject=false;button.click();await Promise.resolve();document.hidden=true;document.dispatchEvent(new Event('visibilitychange'));assert(audio.paused,'hidden page stops sound');
document.hidden=false;button.click();await Promise.resolve();window.dispatchEvent(new Event('pagehide'));assert(audio.paused);
button.click();await Promise.resolve();bark.setDisabled(true);assert(audio.paused,'starting a throw or reward stops an existing bark');assert.equal(button.disabled,true);const blockedPlays=audio.plays;button.click();assert.equal(audio.plays,blockedPlays,'disabled sound rejects activation even if an event is dispatched');
bark.setDisabled(false);button.click();await Promise.resolve();assert.equal(audio.plays,blockedPlays+1,'bark is available again after the action');
bark.dispose();const plays=audio.plays;button.click();assert.equal(audio.plays,plays,'unmount removes listeners');assert(audio.paused);assert.equal(audio.loads,1);assert.equal(audio.src,undefined,'unmount releases audio');
const html=await readFile('public/good-dog.html','utf8');assert(html.includes('media-src data:;'));assert(html.includes('data:audio/mpeg;base64,'));
const source=await readFile('lib/good-dog/ui.ts','utf8');assert(source.includes('data-bark aria-pressed'));assert(!source.includes('data-action="bark"'),'bark bypasses the learning command handler');assert(source.includes('bark.dispose();'));
assert(/class="gd-primary"[^\n]+data-bark/.test(source),'bark shares the primary action row');assert(source.includes('bark.setDisabled(!assetsReady||!canBark(world))'));assert(!html.includes('Just for fun · no effect on learning'));
assert(source.includes('>Reward ♥</button>'),'short reward label keeps the original heart');
assert(!source.slice(source.indexOf('<details class="gd-details"'),source.indexOf('</details>')).includes('—'),'How he learns has no em dashes');
const worldBundle=await build({stdin:{contents:"export * from './lib/good-dog/world';export * from './lib/good-dog/presentation';",resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'node'});
const {GameWorld,canBark}=await import('data:text/javascript;base64,'+Buffer.from(worldBundle.outputFiles[0].text).toString('base64'));
const world=new GameWorld(123);assert(canBark(world));world.start();world.throwBall();assert(!canBark(world),'locked immediately at throw');
for(let i=0;i<400&&world.goal!=='none';i++){assert(!canBark(world),'locked through fetch, pickup and return');world.tick(100)}
assert.equal(world.goal,'none');assert(canBark(world),'available after return');assert(world.treat());assert(!canBark(world),'locked immediately on successful reward');
for(let i=0;i<10;i++)world.tick(100);assert(!canBark(world),'locked throughout the heart/petting animation');world.tick(100);assert(canBark(world),'available after the reward animation');
console.log('PASS: click-only bark, stop/replay, no overlapping audio, recoverable errors, tab/close cleanup, offline audio, no RL dependency.');
