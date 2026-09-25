'use client';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cities, type Focus } from '@/lib/cities';
import { playBark } from '@/lib/dog-audio';
import { getFortunes } from '@/lib/fortune-api';
import WallPanel from './WallPanel';
import FortunePanel from './FortunePanel';
import RoomNavigation, { RoomNavigationContext } from './RoomNavigation';
import { getDaylight } from '@/lib/daylight';

const Arcade = dynamic(() => import('./Arcade'), { ssr: false });

const Scene = dynamic(()=>import('./Penthouse/Scene'), {ssr:false,loading:()=> <div className="loading" role="status" aria-label="Loading the room"><span className="loading-ring"/></div>});
export default function Experience(){
 const [city,setCity]=useState(0),[focus,setFocus]=useState<Focus>('home'),[reset,setReset]=useState(0),[tip,setTip]=useState(''),[panel,setPanel]=useState<Focus>('home');
 const [lampOn,setLampOn]=useState(true),[dogReaction,setDogReaction]=useState(0),[dogStatus,setDogStatus]=useState(''),[fortuneCount,setFortuneCount]=useState(0),[fortuneRequestId,setFortuneRequestId]=useState('');
 const [interior,setInterior]=useState(true),[cameraAway,setCameraAway]=useState(false);
 const [now,setNow]=useState<Date|null>(null),[skyUnavailable,setSkyUnavailable]=useState(false);
 const daylight=useMemo(()=>now?getDaylight(cities[city],now):null,[city,now]);
 const skyMode=daylight?.mode??'dark';
 const windowSeen=useRef(false),dogTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const onReady=useCallback(()=>{},[]);
 const toggleLamp=useCallback(()=>setLampOn(value=>!value),[]);
 const onDogClick=useCallback(()=>{setDogReaction(value=>value+1);void playBark().then(played=>{if(played)setDogStatus('Woof!')}).catch(()=>setDogStatus('Sound is unavailable in this browser.'));if(dogTimer.current)clearTimeout(dogTimer.current);dogTimer.current=setTimeout(()=>setDogStatus(''),2200)},[]);
 const interact=useCallback((next:Focus)=>{if(next==='fortune')setFortuneRequestId(crypto.randomUUID());setFocus(next)},[]);
 useEffect(()=>()=>{if(dogTimer.current)clearTimeout(dogTimer.current)},[]);
 useEffect(()=>{const refresh=()=>{void getFortunes().then(data=>setFortuneCount(data.fortunes.length)).catch(()=>{})};refresh();window.addEventListener('focus',refresh);return()=>window.removeEventListener('focus',refresh)},[]);
 useEffect(()=>{const tick=()=>setNow(new Date());tick();const timer=setInterval(tick,30000);const refresh=()=>{if(document.visibilityState==='visible')tick()};document.addEventListener('visibilitychange',refresh);window.addEventListener('focus',tick);return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',refresh);window.removeEventListener('focus',tick)}},[]);
 useEffect(()=>{const timers:ReturnType<typeof setTimeout>[]=[];setPanel('home');setTip('');
  if(['wall','gloves','fortune','paperclip'].includes(focus))timers.push(setTimeout(()=>setPanel(focus),700));
  if(focus==='bed'){setTip('😈');timers.push(setTimeout(()=>{setTip('');setFocus('home')},2800))}
  if(focus==='window'&&!windowSeen.current){windowSeen.current=true;timers.push(setTimeout(()=>setFocus('home'),7000))}
  return()=>timers.forEach(clearTimeout);
 },[focus]);
 function home(){setFocus('home');setPanel('home');setTip('');setReset(x=>x+1)}
 return <RoomNavigationContext.Provider value={{interior,canReset:focus!=='home'||cameraAway,reset:home,toggle:()=>{setInterior(value=>!value);home()}}}><main className="experience" data-sky-mode={skyMode} data-sky-choice="auto" data-city={cities[city].id} data-interior={interior}>
  <div className="scene-layer"><Scene interior={interior} city={city} focus={focus} reset={reset} onInteract={interact} onReady={onReady} lampOn={lampOn} onLampToggle={toggleLamp} dogReaction={dogReaction} onDogClick={onDogClick} fortuneCount={fortuneCount} skyMode={skyMode} onSkyUnavailable={setSkyUnavailable} onViewChange={setCameraAway}/></div>
  <RoomNavigation/>
  <nav className="city-selector room-city-selector" aria-label="Choose your city">{cities.map((c,i)=><button key={c.id} aria-pressed={city===i} onClick={()=>{setCity(i);home()}}><span className="city-dot"/>{c.name}</button>)}</nav>
  {focus==='window'&&skyUnavailable&&<div className="sky-controls"><p className="sky-caption" role="status">Skyline unavailable — try another city.</p></div>}
  {(tip||dogStatus)&&<div className={`moment${tip?' moment-emoji':''}`} role="status">{tip||dogStatus}</div>}
  {panel==='wall'&&<WallPanel close={home}/>}
  {panel==='gloves'&&<Arcade close={home}/>}
  {(panel==='fortune'||panel==='paperclip')&&<FortunePanel mode={panel} requestId={fortuneRequestId} close={home} onCollection={setFortuneCount} onOpenClip={()=>interact('paperclip')} onAnother={()=>interact('fortune')}/>}
 </main></RoomNavigationContext.Provider>;
}
