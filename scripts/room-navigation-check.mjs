import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { build } from 'esbuild';
import { OrthographicCamera,PerspectiveCamera,Vector3 } from 'three';

const bundle=await build({stdin:{contents:`
export {roomHomeView,roomViewIsAway,containRoomCamera,cameraBounds} from './lib/room-camera';
export {prepareRoomCamera,startRoomViewTransition} from './lib/scene-camera';
export {syncRoomAO} from './lib/room-ao';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import RoomNavigation,{RoomNavigationContext} from './components/RoomNavigation';
export function renderNavigation(interior,canReset){return renderToStaticMarkup(<RoomNavigationContext.Provider value={{interior,canReset,toggle(){},reset(){}}}><RoomNavigation/></RoomNavigationContext.Provider>)}
export function renderStandalone(){return renderToStaticMarkup(<RoomNavigation/>)}
`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,format:'esm',platform:'node',jsx:'automatic',packages:'external'});
// Resolve external React imports against this repository, not a data: URL.
const executable=bundle.outputFiles[0].text.replace(/from "([^\"]+)"/g,(_,name)=>`from ${JSON.stringify(import.meta.resolve(name))}`);
const {roomHomeView,roomViewIsAway,containRoomCamera,cameraBounds,renderNavigation,renderStandalone,prepareRoomCamera,startRoomViewTransition,syncRoomAO}=await import('data:text/javascript;base64,'+Buffer.from(executable).toString('base64'));
const aoCalls=[],perspective=new PerspectiveCamera(),orthographic=new OrthographicCamera(),buffers={};
const ao={camera:perspective,configuration:{depthBufferType:1},buffers,configureAOPass:(depth,ortho)=>aoCalls.push(['ao',depth,ortho]),configureDenoisePass:(depth,ortho)=>aoCalls.push(['denoise',depth,ortho]),configureEffectCompositer:(depth,ortho)=>aoCalls.push(['composite',depth,ortho]),firstFrame:()=>aoCalls.push(['refresh'])};
syncRoomAO(ao,orthographic);assert.equal(ao.camera,orthographic);assert.equal(ao.buffers,buffers);
assert.deepEqual(aoCalls,[['ao',1,true],['denoise',1,true],['composite',1,true],['refresh']]);
syncRoomAO(ao,orthographic);assert.equal(aoCalls.length,4,'stable frames never rebuild ambient shadows');
aoCalls.length=0;syncRoomAO(ao,perspective);assert.deepEqual(aoCalls,[['ao',1,false],['denoise',1,false],['composite',1,false],['refresh']]);
for(const interior of [false,true,false,true])for(const [width,height] of [[1280,720],[390,667],[844,390]]){
 const camera=interior?new PerspectiveCamera(59,1,.08,100):new OrthographicCamera(-1,1,1,-1,.1,100);
 prepareRoomCamera(camera,interior,width,height,true);
 const home=roomHomeView(interior,width,height),direction=new Vector3();
 camera.getWorldDirection(direction);
 assert(direction.distanceTo(new Vector3(...home.target).sub(camera.position).normalize())<1e-10,'camera faces the room before its first frame');
 assert(camera.projectionMatrix.elements.every(Number.isFinite),'projection is ready before view switch');
 camera.position.x+=.1;
 prepareRoomCamera(camera,interior,width+10,height,false);
 assert.equal(camera.position.x,home.position[0]+.1,'resize does not teleport the camera');
 prepareRoomCamera(camera,interior,width,height,true);
 startRoomViewTransition(camera,interior,width,height);
 assert(camera.position.distanceTo(new Vector3(...home.position))>.1,'view switches retain a visible camera journey');
 if(interior){assert(camera.position.x<=cameraBounds.maxX&&camera.position.z<=cameraBounds.maxZ,'entry dolly stays inside the shell')}
 else assert(camera.zoom>home.zoom,'outside starts closer then gently pulls back');
 assert(camera.projectionMatrix.elements.every(Number.isFinite));
}
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
const navigationSource=await readFile('components/RoomNavigation.tsx','utf8');
assert(navigationSource.includes('<KeyRound size={17}')&&!navigationSource.includes('ScanEye')&&!navigationSource.includes('KeysIcon'),'both view buttons use one themed key icon');
const rig=await readFile('components/Penthouse/CameraRig.tsx','utf8');
assert(rig.includes('useLayoutEffect')&&rig.includes('set({camera});invalidate()')&&!rig.includes('<PerspectiveCamera'),'prepared cameras switch without a temporary default-camera restore');
const effects=await readFile('components/Penthouse/RoomEffects.tsx','utf8');
assert(effects.includes('camera={initialCamera.current}')&&effects.includes('setMainCamera(state.camera)'),'view changes reuse composer buffers and update the camera before drawing');
assert(effects.includes('new N8AOPostPass(scene,get().camera)')&&effects.includes('syncRoomAO(ao,state.camera)')&&!effects.includes('<N8AO '),'AO targets survive camera changes and update projection shaders');
assert(rig.includes('Math.min(delta,1/30)'),'resuming after a popup cannot skip the camera transition');
assert(rig.includes('parentElement?.getBoundingClientRect()')&&rig.includes('setSize(width,height'),'camera switches measure the new canvas before publishing its projection');
const budget=await readFile('components/Penthouse/RenderBudget.tsx','utf8');
assert(budget.includes('if (get().frameloop !== loop) setFrameloop(loop)'),'animation clock is not reset on every scheduled frame');
const experience=await readFile('components/Experience.tsx','utf8');
assert(experience.includes('[interior,setInterior]=useState(false)'),'first entrance is outside');
assert(experience.includes("const welcome=!interior&&focus==='home'"),'welcome copy stays out of the interior and focused views');
for(const text of ['Happy Birthday Ryan','You told me your dream was a high rise in each of these cities. I made you a little glimpse of that future as a reminder that the keys to your goals are closer than you think <3','I coded some mini games, click on the objects!'])assert(experience.includes(text));
assert(!experience.includes('Happy 22nd B-day Ryan'),'entrance uses the simplified birthday heading');
assert(!experience.includes('inert=')&&!experience.includes('RoomLoader'),'room environment and navigation are visible immediately without a loading cover');
assert(experience.includes('aria-busy={!roomReady}'),'loading progress remains available to assistive technology');
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
const entranceStyles=await readFile('app/interior.css','utf8');
assert(entranceStyles.includes('.experience[data-interior=false]>.scene-layer')&&!entranceStyles.includes('.experience[data-welcome=true]'),'object focus does not resize the outside canvas');
assert(experience.includes('<header className="birthday-heading" aria-hidden={!welcome}>')&&experience.includes('<footer className="birthday-message" aria-hidden={!welcome}>'),'hidden welcome text reserves the same grid space while zooming');
assert(entranceStyles.includes('.experience[data-welcome=false]>.birthday-message{visibility:hidden}'),'welcome text is hidden without layout reflow');
assert(!/room-loader|key-turn/.test(entranceStyles),'black loading cover and unused animation styles are removed');
assert(entranceStyles.includes('padding-bottom:clamp(12px,2svh,20px)')&&entranceStyles.includes('.birthday-games{margin-top:16px;'),'mini-games caption has breathing room above and below');
assert(entranceStyles.includes('.birthday-message{padding-bottom:10px}'),'short screens retain a gap before the city clocks');
assert(entranceStyles.includes('.view-controls .zoom-out{position:absolute;left:calc(100% + 8px);top:50%;transform:translateY(-50%)}'),'reset sits to the right without shifting the centered view toggle');
assert(!entranceStyles.includes('top:52px')&&!entranceStyles.includes('top:38px'),'old stacked-reset offsets are removed');
assert(entranceStyles.includes('--panel-top:calc(86px + env(safe-area-inset-top))')&&entranceStyles.includes('--panel-top:calc(52px + env(safe-area-inset-top))'),'popups reclaim the old second navigation row');
assert(entranceStyles.includes('clamp(24px,3vw,36px)')&&entranceStyles.includes('max-width:560px'),'entrance typography is smaller and the caption has a balanced line length');
assert.deepEqual(roomHomeView(false,1280,720).target,roomHomeView(false,390,667).target,'outside room stays centered under the heading on every screen');
const sceneReady=await readFile('components/Penthouse/SceneReady.tsx','utf8');
assert(sceneReady.includes('useProgress')&&sceneReady.includes('frames.current>=3'),'reveal waits for asset loading and complete rendered frames');
assert(!sceneReady.includes('useEffect'),'always-mounted canvas fallback cannot report false readiness');
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
assert(experience.includes("const onDogClick=useCallback(()=>{setDogReaction(value=>value+1);setFocus('dog')},[])"),'silent dog interaction opens the training game');
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
