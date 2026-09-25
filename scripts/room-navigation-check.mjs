import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { build } from 'esbuild';

const bundle=await build({stdin:{contents:`
export {roomHomeView,roomViewIsAway,containRoomCamera,cameraBounds} from './lib/room-camera';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import RoomNavigation,{RoomNavigationContext} from './components/RoomNavigation';
export function renderNavigation(interior,canReset){return renderToStaticMarkup(<RoomNavigationContext.Provider value={{interior,canReset,toggle(){},reset(){}}}><RoomNavigation/></RoomNavigationContext.Provider>)}
export function renderStandalone(){return renderToStaticMarkup(<RoomNavigation/>)}
`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,format:'esm',platform:'node',jsx:'automatic',packages:'external'});
// Resolve external React imports against this repository, not a data: URL.
const executable=bundle.outputFiles[0].text.replace(/from "([^\"]+)"/g,(_,name)=>`from ${JSON.stringify(import.meta.resolve(name))}`);
const {roomHomeView,roomViewIsAway,containRoomCamera,cameraBounds,renderNavigation,renderStandalone}=await import('data:text/javascript;base64,'+Buffer.from(executable).toString('base64'));
const point=([x,y,z])=>({x,y,z});
for(const interior of [true,false])for(const [width,height] of [[1280,850],[390,844]]){
 const home=roomHomeView(interior,width,height),position=point(home.position),target=point(home.target);
 assert.equal(roomViewIsAway(position,target,home.zoom,home),false,'opening has no reset control');
 assert.equal(roomViewIsAway({...position,z:position.z-1},target,home.zoom,home),true,'manual dolly is detected');
 assert.equal(roomViewIsAway({...position,x:position.x+.4},target,home.zoom,home),true,'orbit is detected');
 assert.equal(roomViewIsAway(position,{...target,x:target.x+1},home.zoom,home),true,'object focus is detected');
 assert.equal(roomViewIsAway(position,target,home.zoom*1.4,home),true,'orthographic zoom is detected');
 assert.equal(roomViewIsAway(position,target,home.zoom*.7,home),true,'manual zoom-out is resettable too');
 assert.equal(roomViewIsAway({...position,x:position.x+.001},target,home.zoom*1.0001,home),false,'settling does not flicker');
}
for(const x of [-100,0,100])for(const y of [-100,0,100])for(const z of [-100,0,100]){
 const p={x,y,z};containRoomCamera(p);
 assert(p.x>=cameraBounds.minX&&p.x<=cameraBounds.maxX&&p.y>=cameraBounds.minY&&p.y<=cameraBounds.maxY&&p.z>=cameraBounds.minZ&&p.z<=cameraBounds.maxZ);
}
for(const interior of [true,false]){
 const opening=renderNavigation(interior,false),focused=renderNavigation(interior,true);
 assert(opening.includes(interior?'Step outside':'Step inside'));
 assert(!opening.includes('Zoom out'));
 assert(focused.includes('aria-label="Zoom out"'));
 assert(!focused.includes('>Zoom out<'),'reset has an accessible name but no visible text');
 assert.equal((focused.match(/<button/g)||[]).length,2);
}
assert.equal(renderStandalone(),'','isolated arcade has no room controls');
const experience=await readFile('components/Experience.tsx','utf8');
assert(!experience.includes('Thinking about you'));
assert(experience.includes("setTip('😈')"));
assert(!experience.includes('back-room'));
assert(experience.includes('formatCityTime(c,now)'),'city clocks share the daylight timer');
assert(experience.includes('aria-label={c.name}'),'clock updates preserve accessible toggle names');
assert(experience.includes("panel==='laptop'&&<MusicPanel"),'music player mounts only when the laptop opens');
const music=await readFile('components/MusicPanel.tsx','utf8');
assert(music.includes('Wow working in your virtual life too.')&&music.includes('Play some music to relax.'));
assert(music.includes('open.spotify.com/embed/playlist/15lForQ8Rv1kFBmiqlOJKO'));
assert(!music.includes('autoplay=1'),'playback starts with user interaction');
assert(!/dog-audio|playBark|dogStatus|Woof!|AudioContext/.test(experience),'dog clicks are silent and have no bark status/timers');
assert(experience.includes('const onDogClick=useCallback(()=>setDogReaction(value=>value+1),[])'),'silent dog reaction stays interactive');
const table=await readFile('components/Penthouse/FortuneTable.tsx','utf8');
assert.equal((table.match(/click=\{onFortune\}/g)||[]).length,2,'Panda box and notes share the same popup handler');
assert(!table.includes('onPaperclip'),'obsolete separate note click callback removed');
assert(table.includes('position={[-.45, .003, .12]}'),'note sits immediately in front of box');
const workstation=await readFile('components/Penthouse/Workstation.tsx','utf8');
assert(workstation.includes('onLaptop()'),'laptop click opens the music panel');
assert(!workstation.includes('imac-reference.png'),'retired iMac wallpaper is never loaded');
assert(workstation.includes('<meshBasicMaterial color="#050607" toneMapped={false}/>'),'iMac screen is unlit black without reflection/glare');
console.log('PASS: camera reset detection on desktop/mobile inside/outside, containment, icon-only accessible navigation and emoji-only bed message.');
