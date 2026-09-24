'use client';
import { useEffect,useRef } from 'react';
import { useFrame,useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
export default function Lighting({onReady,lampOn}:{onReady:()=>void;lampOn:boolean}){
 const {gl,scene}=useThree();
 const ambient=useRef<THREE.AmbientLight>(null),hemi=useRef<THREE.HemisphereLight>(null),key=useRef<THREE.DirectionalLight>(null),fillA=useRef<THREE.PointLight>(null),fillB=useRef<THREE.PointLight>(null);
 useEffect(()=>{const gen=new THREE.PMREMGenerator(gl),room=new RoomEnvironment(),texture=gen.fromScene(room,.04);scene.environment=texture.texture;scene.environmentIntensity=.2;onReady();return()=>{scene.environment=null;texture.dispose();gen.dispose();room.dispose()}},[gl,scene,onReady]);
 useFrame((_,delta)=>{const blend=1-Math.exp(-delta*5);for(const [ref,on,off] of [[ambient,.42,.045],[hemi,1.1,.2],[key,2.4,.12],[fillA,14,0],[fillB,10,0]] as const){if(ref.current)ref.current.intensity=THREE.MathUtils.lerp(ref.current.intensity,lampOn?on:off,blend)}scene.environmentIntensity=THREE.MathUtils.lerp(scene.environmentIntensity,lampOn?.2:.025,blend)});
 return <><ambientLight ref={ambient} intensity={.42} color="#d8e3e5"/><hemisphereLight ref={hemi} args={['#b6d0e7','#6e5844',1.1]}/><directionalLight ref={key} position={[1,8,4]} intensity={2.4} color="#ffe2b6" castShadow shadow-mapSize={[2048,2048]} shadow-camera-left={-8} shadow-camera-right={8} shadow-camera-top={8} shadow-camera-bottom={-8} shadow-bias={-.0003} shadow-normalBias={.03}/><pointLight ref={fillA} position={[-2,3,-1]} intensity={14} color="#ffd491" distance={9}/><pointLight ref={fillB} position={[3,3,1]} intensity={10} color="#efcca3" distance={8}/></>;
}
