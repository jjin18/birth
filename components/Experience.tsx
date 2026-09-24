'use client';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';
import { RotateCcw, X, MousePointer2, ArrowUpRight, Heart, Image as ImageIcon, Swords, BedDouble, LampFloor, Dog, Cookie, Paperclip } from 'lucide-react';
import { cities, type Focus } from '@/lib/cities';
import { playBark } from '@/lib/dog-audio';
import { getFortunes } from '@/lib/fortune-api';
import WallPanel from './WallPanel';
import Arcade from './Arcade';
import FortunePanel from './FortunePanel';
const Scene = dynamic(()=>import('./Penthouse/Scene'), {ssr:false,loading:()=> <div className="loading"><span className="loading-ring"/><p>Turning the lights on…</p></div>});
export default function Experience(){
 const [city,setCity]=useState(0),[focus,setFocus]=useState<Focus>('home'),[reset,setReset]=useState(0),[tip,setTip]=useState(''),[time,setTime]=useState(''),[panel,setPanel]=useState<Focus>('home');
 const [lampOn,setLampOn]=useState(true),[dogReaction,setDogReaction]=useState(0),[dogStatus,setDogStatus]=useState(''),[fortuneCount,setFortuneCount]=useState(0),[fortuneRequestId,setFortuneRequestId]=useState('');
 const windowSeen=useRef(false),dogTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const onReady=useCallback(()=>{},[]);
 const toggleLamp=useCallback(()=>setLampOn(value=>!value),[]);
 const onDogClick=useCallback(()=>{setDogReaction(value=>value+1);void playBark().then(played=>{if(played)setDogStatus('Woof!')}).catch(()=>setDogStatus('Sound is unavailable in this browser.'));if(dogTimer.current)clearTimeout(dogTimer.current);dogTimer.current=setTimeout(()=>setDogStatus(''),2200)},[]);
 const interact=useCallback((next:Focus)=>{if(next==='fortune')setFortuneRequestId(crypto.randomUUID());setFocus(next)},[]);
 useEffect(()=>()=>{if(dogTimer.current)clearTimeout(dogTimer.current)},[]);
 useEffect(()=>{const refresh=()=>{void getFortunes().then(data=>setFortuneCount(data.fortunes.length)).catch(()=>{})};refresh();window.addEventListener('focus',refresh);return()=>window.removeEventListener('focus',refresh)},[]);
 useEffect(()=>{const tick=()=>setTime(new Intl.DateTimeFormat('en',{timeZone:cities[city].zone,hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date()));tick();const t=setInterval(tick,10000);return()=>clearInterval(t)},[city]);
 useEffect(()=>{const timers:ReturnType<typeof setTimeout>[]=[];setPanel('home');setTip('');
  if(['wall','gloves','fortune','paperclip'].includes(focus))timers.push(setTimeout(()=>setPanel(focus),700));
  if(focus==='bed'){setTip('😈  Thinking about you.');timers.push(setTimeout(()=>{setTip('');setFocus('home')},2800))}
  if(focus==='window'&&!windowSeen.current){windowSeen.current=true;setTip('You said you wanted a high-rise in every major city.');timers.push(setTimeout(()=>setTip("So here’s one."),3500));timers.push(setTimeout(()=>{setTip('');setFocus('home')},7000))}
  return()=>timers.forEach(clearTimeout);
 },[focus]);
 function home(){setFocus('home');setPanel('home');setReset(x=>x+1)}
 return <main className="experience">
  <div className="scene-layer"><Scene city={city} focus={focus} reset={reset} onInteract={interact} onReady={onReady} lampOn={lampOn} onLampToggle={toggleLamp} dogReaction={dogReaction} onDogClick={onDogClick} fortuneCount={fortuneCount}/></div>
  <header className="topbar"><a href="/" className="wordmark"><span className="logo-mark">22</span><span>PENTHOUSE <b>22</b><small>A LITTLE PLACE FOR US</small></span></a><div className="dedication">FOR RYAN, WITH LOVE <Heart size={12}/></div><button className="icon-button" title="Reset the view" aria-label="Reset the view" onClick={home}><RotateCcw size={17}/></button></header>
  <section className="intro"><p className="eyebrow">THE KEYS ARE YOURS</p><h1>Welcome home,<br/><em>birthday boy.</em></h1><p>One room. Many cities.<br/>A lot of future.</p><div className="little-line"/></section>
  <aside className="city-label"><span className="city-number">0{city+1} / 05</span><h2>{cities[city].name}</h2><span>{cities[city].country} <i/> {time}</span><p>{cities[city].weather}</p></aside>
  <div className="room-actions" aria-label="Explore the apartment">
   <button aria-label="Our wall" onClick={()=>interact('wall')}><ImageIcon size={17}/><span>Our wall</span><ArrowUpRight size={13}/></button>
   <button aria-label="Boxing gloves · play Mini Fighter" title="Boxing gloves · play Mini Fighter" onClick={()=>interact('gloves')}><Swords size={17}/><span>Boxing gloves</span></button>
   <button aria-label={lampOn?'Turn the lamp off':'Turn the lamp on'} title={lampOn?'Turn the lamp off':'Turn the lamp on'} aria-pressed={lampOn} onClick={toggleLamp}><LampFloor size={17}/></button>
   <button aria-label="Say hello to the dog" title="Say hello to the dog" onClick={onDogClick}><Dog size={17}/></button>
   <button aria-label="Panda Express · open a fortune cookie" title="Panda Express · open a fortune cookie" onClick={()=>interact('fortune')}><Cookie size={17}/></button>
   <button aria-label="Paper clip · saved fortunes" title={'Paper clip · '+fortuneCount+' saved fortunes'} onClick={()=>interact('paperclip')}><Paperclip size={17}/></button>
   <button aria-label="Bed Easter egg" title="The bed" onClick={()=>interact('bed')}><BedDouble size={17}/></button>
  </div>
  <footer className="bottom-bar"><div className="explore-hint"><MousePointer2 size={14}/><span>Drag to look around <i>·</i> Click to discover</span></div><nav className="city-selector" aria-label="Choose your city">{cities.map((c,i)=><button key={c.id} aria-pressed={city===i} onClick={()=>{setCity(i);home()}}><span className="city-dot"/>{c.name}</button>)}</nav><span className="floor-label">FLOOR 22 <span>↗</span></span></footer>
  {(tip||dogStatus)&&<div className="moment" role="status">{tip||dogStatus}</div>}
  {focus!=='home'&&focus!=='bed'&&<button className="back-room" onClick={home}><X size={15}/> Back to the room</button>}
  {panel==='wall'&&<WallPanel close={home}/>}
  {panel==='gloves'&&<Arcade close={home}/>}
  {(panel==='fortune'||panel==='paperclip')&&<FortunePanel mode={panel} requestId={fortuneRequestId} close={home} onCollection={setFortuneCount} onOpenClip={()=>interact('paperclip')} onAnother={()=>interact('fortune')}/>}
 </main>
}
