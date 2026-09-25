'use client';
import { useEffect,type CSSProperties } from 'react';
import type { SavedFortune } from '@/lib/fortunes';
import { COOKIE_HOLD_MS,COOKIE_SHAKE_MS,COOKIE_CRACK_MS } from '@/lib/cookie-motion';
import FortuneSlip from './FortuneSlip';

const crumbs=[
 [-105,44,-145,8],[-77,57,100,11],[-51,38,-210,7],[-25,63,135,6],
 [23,51,220,9],[49,68,-160,7],[79,40,170,10],[108,59,-240,6],
 [-130,72,230,5],[-63,86,-290,5],[62,79,310,6],[135,65,-220,5],
];
export default function FortuneCrack({note}:{note:SavedFortune}){
 useEffect(()=>{
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches||typeof navigator.vibrate!=='function')return;
  let vibrated=false;
  const pulse=(pattern:number[])=>{if(document.visibilityState!=='visible')return;try{vibrated=navigator.vibrate(pattern)||vibrated}catch{/* Optional enhancement: unsupported devices stay silent. */}};
  const shake=setTimeout(()=>pulse([12,35,12]),COOKIE_HOLD_MS);
  const crack=setTimeout(()=>pulse([28,35,18]),COOKIE_CRACK_MS);
  return()=>{clearTimeout(shake);clearTimeout(crack);if(vibrated){try{navigator.vibrate(0)}catch{}}};
 },[note.id]);
 return <div className="fortune-reveal fortune-crack" style={{'--cookie-hold':COOKIE_HOLD_MS+'ms','--cookie-shake':COOKIE_SHAKE_MS+'ms','--cookie-crack-delay':COOKIE_CRACK_MS+'ms','--cookie-paper-delay':(COOKIE_CRACK_MS+150)+'ms'} as CSSProperties}>
  <div className="cookie-crack-stage">
   <img className="cookie-whole" src="/textures/fortune-cookie.png" alt="Unbroken fortune cookie" width={800} height={696}/>
   <div className="cookie-half cookie-half-left"><img src="/textures/fortune-cookie.png" alt="Golden baked fortune cookie" width={800} height={696}/></div>
   <div className="cookie-half cookie-half-right" aria-hidden="true"><img src="/textures/fortune-cookie.png" alt="" width={800} height={696}/></div>
   <div className="cookie-crumbs" aria-hidden="true">{crumbs.map(([x,y,spin,size],i)=><span key={i} className="cookie-crumb" style={{'--crumb-x':x+'px','--crumb-y':y+'px','--crumb-spin':spin+'deg','--crumb-size':size+'px','--crumb-delay':(COOKIE_CRACK_MS+i*18)+'ms'} as CSSProperties}><img src="/textures/fortune-cookie.png" alt=""/></span>)}</div>
  </div>
  <div className="cookie-unfolding-paper"><FortuneSlip note={note}/></div>
 </div>;
}
