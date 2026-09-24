'use client';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';
import { RotateCcw, X, MousePointer2, ArrowUpRight, Heart, Image as ImageIcon, Laptop as LaptopIcon, BedDouble } from 'lucide-react';
import { cities, type Focus } from '@/lib/cities';
import WallPanel from './WallPanel';
import Arcade from './Arcade';
const Scene = dynamic(()=>import('./Penthouse/Scene'), {ssr:false,loading:()=> <div className="loading"><span className="loading-ring"/><p>Turning the lights on…</p></div>});
export default function Experience(){
 const [city,setCity]=useState(0),[focus,setFocus]=useState<Focus>('home'),[reset,setReset]=useState(0),[tip,setTip]=useState(''),[time,setTime]=useState(''),[ready,setReady]=useState(false),[panel,setPanel]=useState<Focus>('home');
 const windowSeen=useRef(false);
 const onReady=useCallback(()=>setReady(true),[]);
 useEffect(()=>{const tick=()=>setTime(new Intl.DateTimeFormat('en',{timeZone:cities[city].zone,hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date()));tick();const t=setInterval(tick,10000);return()=>clearInterval(t)},[city]);
 useEffect(()=>{const timers:ReturnType<typeof setTimeout>[]=[];setPanel('home');setTip('');
  if(focus==='wall'||focus==='laptop')timers.push(setTimeout(()=>setPanel(focus),700));
  if(focus==='bed'){setTip('😈  Thinking about you.');timers.push(setTimeout(()=>{setTip('');setFocus('home')},2800))}
  if(focus==='window'&&!windowSeen.current){windowSeen.current=true;setTip('You said you wanted a high-rise in every major city.');timers.push(setTimeout(()=>setTip("So here’s one."),3500));timers.push(setTimeout(()=>{setTip('');setFocus('home')},7000))}
  return()=>timers.forEach(clearTimeout);
 },[focus]);
 function home(){setFocus('home');setPanel('home');setReset(x=>x+1)}
 return <main className="experience">
  <div className="scene-layer"><Scene city={city} focus={focus} reset={reset} onInteract={setFocus} onReady={onReady}/></div>
  <header className="topbar"><a href="/" className="wordmark"><span className="logo-mark">22</span><span>PENTHOUSE <b>22</b><small>A LITTLE PLACE FOR US</small></span></a><div className="dedication">FOR RYAN, WITH LOVE <Heart size={12}/></div><button className="icon-button" title="Reset the view" aria-label="Reset the view" onClick={home}><RotateCcw size={17}/></button></header>
  <section className="intro"><p className="eyebrow">THE KEYS ARE YOURS</p><h1>Welcome home,<br/><em>birthday boy.</em></h1><p>One room. Many cities.<br/>A lot of future.</p><div className="little-line"/></section>
  <aside className="city-label"><span className="city-number">0{city+1} / 05</span><h2>{cities[city].name}</h2><span>{cities[city].country} <i/> {time}</span><p>{cities[city].weather}</p></aside>
  <div className="room-actions" aria-label="Explore the apartment"><button onClick={()=>setFocus('wall')}><ImageIcon size={17}/><span>Our wall</span><ArrowUpRight size={13}/></button><button onClick={()=>setFocus('laptop')}><LaptopIcon size={17}/><span>The arcade</span><ArrowUpRight size={13}/></button><button aria-label="Bed Easter egg" title="The bed" onClick={()=>setFocus('bed')}><BedDouble size={17}/></button></div>
  <footer className="bottom-bar"><div className="explore-hint"><MousePointer2 size={14}/><span>Drag to look around <i>·</i> Click to discover</span></div><nav className="city-selector" aria-label="Choose your city">{cities.map((c,i)=><button key={c.id} aria-pressed={city===i} onClick={()=>{setCity(i);setFocus('home')}}><span className="city-dot"/>{c.name}</button>)}</nav><span className="floor-label">FLOOR 22 <span>↗</span></span></footer>
  {tip&&<div className="moment" role="status">{tip}</div>}
  {focus!=='home'&&focus!=='bed'&&<button className="back-room" onClick={home}><X size={15}/> Back to the room</button>}
  {panel==='wall'&&<WallPanel close={home}/>}
  {panel==='laptop'&&<Arcade close={home}/>}
 </main>
}
