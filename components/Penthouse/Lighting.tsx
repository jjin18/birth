'use client';
import { useLayoutEffect,useRef } from 'react';
import { useFrame,useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { skyAtmosphere,type SkyMode } from '@/lib/daylight';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
export default function Lighting({lampOn,skyMode,shadowSize=2048}:{lampOn:boolean;skyMode:SkyMode;shadowSize?:number}){
 const {gl,scene}=useThree();
 const daylight=skyAtmosphere[skyMode];
 const initial=useRef({ambient:(lampOn?.16:.035)+daylight.ambient,hemisphere:(lampOn?.48:.15)+daylight.hemisphere,key:lampOn?.85:.1,fillA:lampOn?2.2:0,fillB:lampOn?1.6:0,environment:(lampOn?.2:.025)+daylight.environment}).current;
 const ambient=useRef<THREE.AmbientLight>(null),hemi=useRef<THREE.HemisphereLight>(null),key=useRef<THREE.DirectionalLight>(null),fillA=useRef<THREE.PointLight>(null),fillB=useRef<THREE.PointLight>(null);
 useLayoutEffect(()=>{const gen=new THREE.PMREMGenerator(gl),room=new RoomEnvironment(),texture=gen.fromScene(room,.04);scene.environment=texture.texture;scene.environmentIntensity=initial.environment;return()=>{scene.environment=null;texture.dispose();gen.dispose();room.dispose()}},[gl,scene,initial]);
 useFrame((_,delta)=>{const blend=1-Math.exp(-delta*5);for(const [ref,on,off] of [[ambient,.16+daylight.ambient,.035+daylight.ambient],[hemi,.48+daylight.hemisphere,.15+daylight.hemisphere],[key,.85,.1],[fillA,2.2,0],[fillB,1.6,0]] as const){if(ref.current)ref.current.intensity=THREE.MathUtils.lerp(ref.current.intensity,lampOn?on:off,blend)}scene.environmentIntensity=THREE.MathUtils.lerp(scene.environmentIntensity,(lampOn?.2:.025)+daylight.environment,blend)});
 return <><ambientLight ref={ambient} intensity={initial.ambient} color="#d8e3e5"/><hemisphereLight ref={hemi} args={['#b6d0e7','#6e5844',initial.hemisphere]}/><directionalLight key={`key-${shadowSize}`} ref={key} position={[1,3.2,4]} intensity={initial.key} color="#ffe2b6" castShadow shadow-mapSize={[shadowSize,shadowSize]} shadow-camera-left={-8} shadow-camera-right={8} shadow-camera-top={8} shadow-camera-bottom={-8} shadow-bias={-.0003} shadow-normalBias={.015} shadow-radius={4}/><directionalLight key={`sun-${shadowSize}`} position={[-2,4.8,-6]} intensity={skyMode==='day'?1.8:skyMode==='sunset'?.8:.04} color={daylight.color} castShadow shadow-mapSize={[shadowSize,shadowSize]} shadow-camera-left={-7} shadow-camera-right={7} shadow-camera-top={7} shadow-camera-bottom={-7} shadow-bias={-.0002} shadow-normalBias={.015} shadow-radius={4}/><pointLight ref={fillA} position={[-2,2.5,-1]} intensity={initial.fillA} color="#ffd491" distance={9}/><pointLight ref={fillB} position={[3,2.5,1]} intensity={initial.fillB} color="#efcca3" distance={8}/></>;
}
