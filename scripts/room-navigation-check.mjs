import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { build } from 'esbuild';
import { OrthographicCamera,Vector3 } from 'three';

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
assert(experience.includes('[interior,setInterior]=useState(false)'),'first entrance is outside');
assert(experience.includes("const welcome=!interior&&focus==='home'"),'welcome copy stays out of the interior and focused views');
for(const text of ['Happy Birthday Ryan','You told me your dream was a high rise in your favorite cities. I made you a little glimpse of that future as a reminder that the keys to your goals are closer than you think <3','I coded some mini games, click on the objects!'])assert(experience.includes(text));
assert(!experience.includes('Happy 22nd B-day Ryan'),'entrance uses the simplified birthday heading');
assert(experience.includes('inert={!roomReady}'),'covered room controls are not keyboard-focusable');
for(const [width,height] of [[1280,350],[390,270],[844,160]]){
 const home=roomHomeView(false,width,height);
 assert(home.zoom<=height/10,'outside room fits below the birthday heading and above the copy');
 const camera=new OrthographicCamera(-width/2,width/2,height/2,-height/2,.1,100);
 camera.position.set(...home.position);camera.lookAt(...home.target);camera.zoom=home.zoom;camera.updateProjectionMatrix();camera.updateMatrixWorld();
 for(const x of [-5.2,5.2])for(const y of [-.55,3.6])for(const z of [-3.7,3.6]){
  const projected=new Vector3(x,y,z).project(camera);
  assert(Math.abs(projected.x)<1&&Math.abs(projected.y)<1,'room geometry stays fully inside the entrance canvas');
 }
}
const loader=await readFile('components/RoomLoader.tsx','utf8');
assert(!/KeyRound|room-loader-key|Getting your keys ready|<img|<canvas/.test(loader),'opening key is removed with no replacement asset');
const entranceStyles=await readFile('app/interior.css','utf8');
assert(!/room-loader-key|key-turn/.test(entranceStyles),'unused key animation is removed');
assert(entranceStyles.includes('clamp(24px,3vw,36px)')&&entranceStyles.includes('max-width:560px'),'entrance typography is smaller and the caption has a balanced line length');
assert.deepEqual(roomHomeView(false,1280,720).target,roomHomeView(false,390,667).target,'outside room stays centered under the heading on every screen');
assert(loader.includes('setDismissed(true)'),'loader is removed after the fade');
const sceneReady=await readFile('components/Penthouse/SceneReady.tsx','utf8');
assert(sceneReady.includes('useProgress')&&sceneReady.includes('frames.current>=3'),'reveal waits for asset loading and complete rendered frames');
assert(!sceneReady.includes('useEffect'),'always-mounted canvas fallback cannot dismiss the loading cover');
assert(!experience.includes('Thinking about you'));
assert(experience.includes("setTip('Thank you for sleeping on the floor lol')"));
assert(!experience.includes('😈')&&!experience.includes('moment-emoji'),'bed uses the new message instead of an emoji');
assert(experience.includes('moment moment-message'),'bed and chair messages wrap on small screens');
assert(experience.includes("setTip('May your future have ergonomic support')"),'chair has its own requested message');
assert(!experience.includes('back-room'));
assert(experience.includes('formatCityTime(c,now)'),'city clocks share the daylight timer');
assert(experience.includes('aria-label={c.name}'),'clock updates preserve accessible toggle names');
assert(experience.includes("musicOpened&&<MusicPanel open={panel==='laptop'}"),'one player mounts after the first desk click and remains mounted when closed');
assert(experience.includes("if(next==='laptop')setMusicOpened(true)"),'no Spotify iframe before first desk interaction');
const music=await readFile('components/MusicPanel.tsx','utf8');
assert(music.includes('Some tunes for when you work'));
assert(!music.includes("Here's some music to help you with work."));
assert(!music.includes('Wow working')&&!music.includes('Play some music to relax.'));
assert(music.includes('open.spotify.com/embed/playlist/15lForQ8Rv1kFBmiqlOJKO'));
assert(!music.includes('autoplay=1'),'playback starts with user interaction');
const panelStyles=await readFile('app/panels.css','utf8');
assert(panelStyles.includes('.panel.music-panel{height:auto;'),'music popup wraps its player instead of reserving empty space');
assert(panelStyles.includes(".music-panel .panel-head h2{font:500 14px/1.4 'DM Sans',Arial,sans-serif;letter-spacing:.03em;color:var(--gold)}"),'music heading matches the small plain beige popup style');
assert(panelStyles.includes('.music-panel iframe{display:block;height:352px;')&&panelStyles.includes('@media(max-height:640px){.music-panel iframe{height:152px}}'),'Spotify uses its full or compact supported player height without stretching');
assert(!/dog-audio|playBark|dogStatus|Woof!|AudioContext/.test(experience),'dog clicks are silent and have no bark status/timers');
assert(experience.includes('const onDogClick=useCallback(()=>setDogReaction(value=>value+1),[])'),'silent dog reaction stays interactive');
const table=await readFile('components/Penthouse/FortuneTable.tsx','utf8');
assert.equal((table.match(/click=\{onFortune\}/g)||[]).length,2,'Panda box and notes share the same popup handler');
assert(!table.includes('onPaperclip'),'obsolete separate note click callback removed');
assert(table.includes('position={[-.45, .003, .12]}'),'note sits immediately in front of box');
const workstation=await readFile('components/Penthouse/Workstation.tsx','utf8');
assert(workstation.includes('onLaptop()'),'laptop click opens the music panel');
assert(workstation.includes('<group name="music-desk" onClick='),'the desk and its accessories share the in-page player');
assert.equal((workstation.match(/onLaptop\(\)/g)||[]).length,1,'one bubbling handler prevents duplicate music openings');
assert(workstation.includes('name="chair-message-trigger" onClick={event=>{event.stopPropagation();onChair()}}'),'chair clicks stop propagation and do not open Spotify');
assert((await readFile('components/Arcade.tsx','utf8')).includes('eyebrow="Fight Mode"'),'arcade heading preserves its separate tally');
assert(!workstation.includes('imac-reference.png'),'retired iMac wallpaper is never loaded');
assert(workstation.includes('<Screen music/>')&&workstation.includes('<meshBasicMaterial map={map} toneMapped={false}/>'),'iMac music display remains unlit and glare-free');
assert(workstation.includes('canvas.width=music?256:768')&&workstation.includes('texture.generateMipmaps=false'),'music screen has a small 144 KiB texture, no mipmap pyramid');
console.log('PASS: camera reset detection on desktop/mobile inside/outside, containment, icon-only accessible navigation and updated bed message.');
