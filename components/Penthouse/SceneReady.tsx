'use client';
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useProgress } from '@react-three/drei';

/** Wait for models AND the skyline, then allow a few complete rendered frames.
 * Lighting alone is not sufficient: furniture has its own Suspense boundaries.
 */
export default function SceneReady({onReady}:{onReady:()=>void}) {
 const active=useProgress(state=>state.active);
 const settled=useRef(0),frames=useRef(0),complete=useRef(false);
 useFrame((_,delta)=>{
  if(complete.current)return;
  if(active){settled.current=0;frames.current=0;return}
  settled.current+=Math.min(delta,.1);frames.current++;
  if(settled.current>=.35&&frames.current>=3){complete.current=true;onReady()}
 });
 return null;
}

/** Canvas fallback HTML is mounted even when WebGL works; it must not signal ready. */
export function WebGLFallback() {
 return <div className="loading"><p>Your browser needs WebGL to enter the penthouse.</p></div>;
}
