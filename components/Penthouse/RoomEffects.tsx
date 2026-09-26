'use client';
import { useLayoutEffect,useRef,useState } from 'react';
import { useFrame,useThree } from '@react-three/fiber';
import { EffectComposer,ToneMapping,Vignette } from '@react-three/postprocessing';
import { EffectComposer as Composer,ToneMappingMode } from 'postprocessing';
import { N8AOPostPass } from 'n8ao';
import { syncRoomAO,protectRoomShadowMaps } from '@/lib/room-ao';

export default function RoomEffects(){
 const camera=useThree(state=>state.camera);
 const scene=useThree(state=>state.scene),get=useThree(state=>state.get);
 const initialCamera=useRef(camera),composer=useRef<Composer>(null);
 const [ao,setAO]=useState<N8AOPostPass|null>(null);
 useLayoutEffect(()=>{
  const pass=new N8AOPostPass(scene,get().camera);
  protectRoomShadowMaps(pass);
  Object.assign(pass.configuration,{aoRadius:.35,distanceFalloff:1.1,intensity:1.4,halfRes:true});
  pass.setQualityMode('Medium');setAO(pass);
  return()=>{
   // Pass.dispose covers textures/targets, but N8AO's triangle wrappers also
   // own shader materials. Do not dispose their shared triangle geometry.
   for(const [key,value] of Object.entries(pass))if(key.endsWith('Quad'))value?.material?.dispose();
   pass.dispose();
  };
 },[scene,get]);
 useFrame(state=>{
  // Keep the composer/render targets alive across projection changes. The wrapper
  // otherwise disposes them whenever its camera prop changes (a blank frame).
  // Synchronize all passes after camera controls, before the composer at priority 1.
  if(ao)syncRoomAO(ao,state.camera);
  if(composer.current)composer.current.setMainCamera(state.camera);
  else state.gl.render(state.scene,state.camera);
 },.5);
 return <EffectComposer ref={composer} camera={initialCamera.current} multisampling={4}>
  {ao&&<primitive object={ao} dispose={null}/>}
  <ToneMapping mode={ToneMappingMode.ACES_FILMIC}/><Vignette offset={.3} darkness={.22}/>
 </EffectComposer>;
}
