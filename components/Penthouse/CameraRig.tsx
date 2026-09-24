'use client';
import { useEffect,useMemo,useRef } from 'react';
import { useFrame,useThree } from '@react-three/fiber';
import { OrbitControls,PerspectiveCamera,OrthographicCamera } from '@react-three/drei';
import * as THREE from 'three';
import type { OrbitControls as OrbitType } from 'three-stdlib';
import type { Focus } from '@/lib/cities';
import { containRoomCamera,roomOpening } from '@/lib/room-camera';

type V=[number,number,number];
type View={p:V;t:V;zoom:number};
const outside:Record<Focus,View>={home:{p:[11,9,14],t:[-2,.55,0],zoom:1},window:{p:[4,4.5,11],t:[0,1.7,-2],zoom:1.45},gloves:{p:[7,7,10],t:[-.55,.7,1.55],zoom:1.8},fortune:{p:[8,6,9],t:[2.2,1.1,2.1],zoom:1.8},paperclip:{p:[8,6,9],t:[2.6,1.1,1.9],zoom:1.8},wall:{p:[7,5,10],t:[-3.7,1.65,-.8],zoom:1.75},bed:{p:[7,7,10],t:[-2,0,-.4],zoom:1.25}};
const inside:Record<Focus,View>={home:{p:[4.4,2.35,5.4],t:[-.45,1.25,-.7],zoom:1},window:{p:[.8,2,2],t:[0,1.85,-3.5],zoom:1},gloves:{p:[1.5,2,4.25],t:[-.55,.75,1.55],zoom:1},fortune:{p:[4.2,2.05,4.2],t:[1.85,1.42,2.1],zoom:1},paperclip:{p:[4.3,2.2,3.8],t:[3,1.25,1.83],zoom:1},wall:{p:[-.7,2.1,2.4],t:[-4.8,2.1,-.6],zoom:1},bed:{p:[.5,2.1,2.2],t:[-2.4,.85,-.5],zoom:1}};

export default function CameraRig({focus,reset,interior}:{focus:Focus;reset:number;interior:boolean}){
 const {size}=useThree();
 const opening=roomOpening(size.width,size.height);
 return <>{interior?<PerspectiveCamera makeDefault position={opening.position} fov={opening.fov} near={.08} far={100}/>:<OrthographicCamera makeDefault position={outside.home.p} zoom={60} near={.1} far={100}/>}<Controller key={interior?'inside':'outside'} focus={focus} reset={reset} interior={interior}/></>;
}

function Controller({focus,reset,interior}:{focus:Focus;reset:number;interior:boolean}){
 const controls=useRef<OrbitType>(null),transition=useRef(true);
 const {camera,size}=useThree();
 const view=(interior?inside:outside)[focus],baseZoom=size.width<650?size.width/13.6:Math.min(size.width/17,100);
 const destination=useMemo(()=>new THREE.Vector3(...(interior&&focus==='home'?roomOpening(size.width,size.height).position:view.p)),[interior,focus,size.width,size.height]);
 const target=useMemo(()=>new THREE.Vector3(...(!interior&&focus==='home'&&size.width<650?[-.2,.3,0] as V:view.t)),[interior,focus,size.width]);
 useEffect(()=>{transition.current=true},[camera,focus,reset,size.width,size.height]);
 const contain=()=>{if(interior){containRoomCamera(camera.position);if(controls.current)camera.lookAt(controls.current.target)}};
 useFrame((_,delta)=>{
  if(controls.current&&transition.current){
   const blend=1-Math.exp(-delta*3);
   camera.position.lerp(destination,blend);controls.current.target.lerp(target,blend);
   if(camera instanceof THREE.OrthographicCamera){camera.zoom=THREE.MathUtils.lerp(camera.zoom,baseZoom*view.zoom,blend);camera.updateProjectionMatrix()}
   controls.current.update();
   if(camera.position.distanceTo(destination)<.008&&controls.current.target.distanceTo(target)<.008)transition.current=false;
  }
  // OrbitControls updates at priority -1; clamp at 0 before the composer renders.
  contain();
 });
 return <OrbitControls ref={controls} makeDefault enablePan={false} enableDamping dampingFactor={.08} minPolarAngle={interior?.9:.62} maxPolarAngle={interior?1.6:1.24} minAzimuthAngle={interior?-.15:.12} maxAzimuthAngle={interior?.85:1.25} minZoom={baseZoom*.55} maxZoom={baseZoom*3.2} minDistance={interior?1.4:0} maxDistance={interior?9:30} onChange={contain} onStart={()=>transition.current=false}/>;
}
