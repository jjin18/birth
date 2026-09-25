'use client';
import { useEffect,useState,type CSSProperties } from 'react';
import { Cookie } from 'lucide-react';
import type { SavedFortune } from '@/lib/fortunes';
import { COOKIE_HOLD_MS,COOKIE_SHAKE_MS,COOKIE_CRACK_MS,COOKIE_REVEAL_MS } from '@/lib/cookie-motion';
import FortuneSlip from './FortuneSlip';

const crumbs=[
 [-105,44,-145,8],[-77,57,100,11],[-51,38,-210,7],[-25,63,135,6],
 [23,51,220,9],[49,68,-160,7],[79,40,170,10],[108,59,-240,6],
 [-130,72,230,5],[-63,86,-290,5],[62,79,310,6],[135,65,-220,5],
];
export default function FortuneCrack({note,onRevealed}:{note:SavedFortune;onRevealed:()=>void}){
 const [imageReady,setImageReady]=useState(false),[imageFailed,setImageFailed]=useState(false);
 const [phase,setPhase]=useState<'loading'|'intact'|'cracked'|'revealed'>('loading');
 useEffect(()=>{
  if(!imageReady)return;
  setPhase('intact');
  const crack=setTimeout(()=>setPhase('cracked'),COOKIE_CRACK_MS);
  const reveal=setTimeout(()=>{setPhase('revealed');onRevealed()},COOKIE_REVEAL_MS);
  return()=>{clearTimeout(crack);clearTimeout(reveal)};
 },[imageReady,onRevealed]);
 useEffect(()=>{
  if(!imageReady||window.matchMedia('(prefers-reduced-motion: reduce)').matches||typeof navigator.vibrate!=='function')return;
  let vibrated=false;
  const pulse=(pattern:number[])=>{if(document.visibilityState!=='visible')return;try{vibrated=navigator.vibrate(pattern)||vibrated}catch{/* Optional enhancement: unsupported devices stay silent. */}};
  const shake=setTimeout(()=>pulse([12,35,12]),COOKIE_HOLD_MS);
  const anticipation=setTimeout(()=>pulse([12,50,16,45,20]),COOKIE_CRACK_MS-600);
  const crack=setTimeout(()=>pulse([28,35,18]),COOKIE_CRACK_MS);
  return()=>{clearTimeout(shake);clearTimeout(anticipation);clearTimeout(crack);if(vibrated){try{navigator.vibrate(0)}catch{}}};
 },[imageReady,note.id]);
 const fallback=<Cookie className="cookie-image-fallback" strokeWidth={1.25} aria-hidden="true"/>;
 return <div className="fortune-reveal fortune-crack" data-cookie-phase={phase} style={{'--cookie-hold':COOKIE_HOLD_MS+'ms','--cookie-shake':COOKIE_SHAKE_MS+'ms'} as CSSProperties}>
  <div className="cookie-crack-stage">
   {imageFailed?<div className="cookie-whole" role="img" aria-label="Unbroken fortune cookie">{fallback}</div>:<img className="cookie-whole" src="/textures/fortune-cookie.png" alt="Unbroken fortune cookie" width={800} height={696} onLoad={()=>setImageReady(true)} onError={()=>{setImageFailed(true);setImageReady(true)}}/>}
   <div className="cookie-half cookie-half-left" aria-hidden="true">{imageFailed?fallback:<img src="/textures/fortune-cookie.png" alt="" width={800} height={696}/>}</div>
   <div className="cookie-half cookie-half-right" aria-hidden="true">{imageFailed?fallback:<img src="/textures/fortune-cookie.png" alt="" width={800} height={696}/>}</div>
   {!imageFailed&&<div className="cookie-crumbs" aria-hidden="true">{crumbs.map(([x,y,spin,size],i)=><span key={i} className="cookie-crumb" style={{'--crumb-x':x+'px','--crumb-y':y+'px','--crumb-spin':spin+'deg','--crumb-size':size+'px','--crumb-delay':i*18+'ms'} as CSSProperties}><img src="/textures/fortune-cookie.png" alt=""/></span>)}</div>}
  </div>
  <div className="cookie-unfolding-paper" aria-hidden={phase==='loading'||phase==='intact'}><FortuneSlip note={note}/></div>
 </div>;
}
