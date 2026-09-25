'use client';
import { useEffect, useState } from 'react';

/** A plain fade into the finished room, with no loading icon or extra assets. */
export default function RoomLoader({ready}:{ready:boolean}) {
 const [dismissed,setDismissed]=useState(false);
 useEffect(()=>{
  if(!ready)return;
  // A timer also completes the reveal when reduced motion disables transitions.
  const timer=setTimeout(()=>setDismissed(true),window.matchMedia('(prefers-reduced-motion: reduce)').matches?0:900);
  return()=>clearTimeout(timer);
 },[ready]);
 if(dismissed)return null;
 return <div className="room-loader" data-ready={ready} role="status" aria-label={ready?'Your room is ready':'Loading the room'}/>;
}
