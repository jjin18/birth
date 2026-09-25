'use client';
import { useEffect, useState } from 'react';
import { KeyRound } from 'lucide-react';

/** HTML/SVG only: visible before the 3D bundle loads, with no texture allocation. */
export default function RoomLoader({ready}:{ready:boolean}) {
 const [dismissed,setDismissed]=useState(false);
 useEffect(()=>{
  if(!ready)return;
  // A timer also completes the reveal when reduced motion disables transitions.
  const timer=setTimeout(()=>setDismissed(true),window.matchMedia('(prefers-reduced-motion: reduce)').matches?0:900);
  return()=>clearTimeout(timer);
 },[ready]);
 if(dismissed)return null;
 return <div className="room-loader" data-ready={ready} role="status" aria-label={ready?'Your room is ready':'Getting your keys ready'}><KeyRound className="room-loader-key" size={52} strokeWidth={1.25} aria-hidden="true"/></div>;
}
