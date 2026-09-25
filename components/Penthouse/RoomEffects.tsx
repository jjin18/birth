'use client';
import { useRef } from 'react';
import { useFrame,useThree } from '@react-three/fiber';
import { EffectComposer,N8AO,ToneMapping,Vignette } from '@react-three/postprocessing';
import { EffectComposer as Composer,ToneMappingMode } from 'postprocessing';

export default function RoomEffects({quality}:{quality:number}){
 const camera=useThree(state=>state.camera);
 const initialCamera=useRef(camera),composer=useRef<Composer>(null);
 useFrame(state=>{
  // Keep the composer/render targets alive across projection changes. The wrapper
  // otherwise disposes them whenever its camera prop changes (a blank frame).
  // Synchronize all passes after camera controls, before the composer at priority 1.
  if(composer.current)composer.current.setMainCamera(state.camera);
  else state.gl.render(state.scene,state.camera);
 },.5);
 return <EffectComposer ref={composer} camera={initialCamera.current} multisampling={0}>
  {quality<2?<N8AO aoRadius={.35} distanceFalloff={1.1} intensity={1.4} quality="low" halfRes/>:<></>}
  <ToneMapping mode={ToneMappingMode.ACES_FILMIC}/><Vignette offset={.3} darkness={.22}/>
 </EffectComposer>;
}
