'use client';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cities, formatCityTime, type Focus } from '@/lib/cities';
import { getFortunes } from '@/lib/fortune-api';
import FortunePanel from './FortunePanel';
import RoomNavigation, { RoomNavigationContext } from './RoomNavigation';
import { getDaylight } from '@/lib/daylight';
import RoomLoader from './RoomLoader';
import RoomSceneBoundary from './RoomSceneBoundary';

const Arcade = dynamic(() => import('./Arcade'), { ssr: false });
const MusicPanel = dynamic(() => import('./MusicPanel'), { ssr: false });
const WallPanel = dynamic(() => import('./WallPanel'), { ssr: false });

const Scene = dynamic(()=>import('./Penthouse/Scene'), {ssr:false});
export default function Experience(){
 const [city,setCity]=useState(0),[focus,setFocus]=useState<Focus>('home'),[reset,setReset]=useState(0),[tip,setTip]=useState(''),[panel,setPanel]=useState<Focus>('home');
 const [lampOn,setLampOn]=useState(true),[dogReaction,setDogReaction]=useState(0),[fortuneCount,setFortuneCount]=useState(0),[fortuneRequestId,setFortuneRequestId]=useState('');
 const [interior,setInterior]=useState(false),[cameraAway,setCameraAway]=useState(false);
 const [musicOpened,setMusicOpened]=useState(false);
 const [roomReady,setRoomReady]=useState(false);
 const [now,setNow]=useState<Date|null>(null),[skyUnavailable,setSkyUnavailable]=useState(false);
 const daylight=useMemo(()=>now?getDaylight(cities[city],now):null,[city,now]);
 const skyMode=daylight?.mode??'dark';
 const windowSeen=useRef(false);
 const onReady=useCallback(()=>setRoomReady(true),[]);
 const toggleLamp=useCallback(()=>setLampOn(value=>!value),[]);
 const onDogClick=useCallback(()=>setDogReaction(value=>value+1),[]);
 const interact=useCallback((next:Focus)=>{if(next==='fortune')setFortuneRequestId(crypto.randomUUID());if(next==='laptop')setMusicOpened(true);setFocus(next)},[]);
 useEffect(()=>{const refresh=()=>{void getFortunes().then(data=>setFortuneCount(data.fortunes.length)).catch(()=>{})};refresh();window.addEventListener('focus',refresh);return()=>window.removeEventListener('focus',refresh)},[]);
 useEffect(()=>{const tick=()=>setNow(new Date());tick();const timer=setInterval(tick,30000);const refresh=()=>{if(document.visibilityState==='visible')tick()};document.addEventListener('visibilitychange',refresh);window.addEventListener('focus',tick);return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',refresh);window.removeEventListener('focus',tick)}},[]);
 useEffect(()=>{const timers:ReturnType<typeof setTimeout>[]=[];setPanel('home');setTip('');
  if(['wall','gloves','fortune','paperclip','laptop'].includes(focus))timers.push(setTimeout(()=>setPanel(focus),700));
  if(focus==='bed'){setTip('😈');timers.push(setTimeout(()=>{setTip('');setFocus('home')},2800))}
  if(focus==='window'&&!windowSeen.current){windowSeen.current=true;timers.push(setTimeout(()=>setFocus('home'),7000))}
  return()=>timers.forEach(clearTimeout);
 },[focus]);
 function home(){setFocus('home');setPanel('home');setTip('');setReset(x=>x+1)}
 const welcome=!interior&&focus==='home';
 return <RoomNavigationContext.Provider value={{interior,canReset:focus!=='home'||cameraAway,reset:home,toggle:()=>{setInterior(value=>!value);home()}}}><main className="experience" inert={!roomReady} aria-busy={!roomReady} data-sky-mode={skyMode} data-sky-choice="auto" data-city={cities[city].id} data-interior={interior} data-welcome={welcome}>
  {welcome&&<header className="birthday-heading"><h1>Happy 22nd B-day Ryan</h1></header>}
  <div className="scene-layer"><RoomSceneBoundary onReady={onReady}><Scene interior={interior} city={city} focus={focus} reset={reset} onInteract={interact} onReady={onReady} lampOn={lampOn} onLampToggle={toggleLamp} dogReaction={dogReaction} onDogClick={onDogClick} fortuneCount={fortuneCount} skyMode={skyMode} onSkyUnavailable={setSkyUnavailable} onViewChange={setCameraAway}/></RoomSceneBoundary></div>
  <RoomNavigation/>
  {welcome&&<footer className="birthday-message"><p>{'You told me your dream was a high rise in your favorite cities. I made you a little glimpse of that future as a reminder that the keys to your goals are closer than you think <3'}</p><p className="birthday-games">I coded some games for when you want to relax from work</p></footer>}
  <nav className="city-selector room-city-selector" aria-label="Choose your city">{cities.map((c,i)=><button key={c.id} aria-label={c.name} aria-describedby={`city-time-${c.id}`} aria-pressed={city===i} onClick={()=>{setCity(i);home()}}><time id={`city-time-${c.id}`} className="city-local-time" dateTime={now?.toISOString()}>{formatCityTime(c,now)}</time><span className="city-toggle-name"><span className="city-dot"/>{c.name}</span></button>)}</nav>
  {focus==='window'&&skyUnavailable&&<div className="sky-controls"><p className="sky-caption" role="status">Skyline unavailable — try another city.</p></div>}
  {tip&&<div className="moment moment-emoji" role="status">{tip}</div>}
  {panel==='wall'&&<WallPanel close={home}/>}
  {panel==='gloves'&&<Arcade close={home}/>}
  {musicOpened&&<MusicPanel open={panel==='laptop'} close={home}/>}
  {(panel==='fortune'||panel==='paperclip')&&<FortunePanel key={panel+'-'+fortuneRequestId} mode={panel} requestId={fortuneRequestId} close={home} onCollection={setFortuneCount} onOpenClip={()=>interact('paperclip')} onAnother={()=>interact('fortune')}/>}
 </main><RoomLoader ready={roomReady}/></RoomNavigationContext.Provider>;
}
