'use client';
import { Canvas, type ThreeEvent } from '@react-three/fiber';
import { RoundedBox, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { Lamp, Dog } from './RoomObjects';
import Lighting from './Lighting';
import FortuneTable from './FortuneTable';
import Backdrop from './Backdrop';
import type { SkyMode } from '@/lib/daylight';
import { RoomMaterials,Surface,type SurfaceKind } from './Materials';
import Workstation from './Workstation';
import { ImportedBed } from './ImportedFurniture';
import CameraRig from './CameraRig';
import InteriorEnvelope from './InteriorEnvelope';
import { windowDimensions } from '@/lib/room-dimensions';
import { EffectComposer,N8AO,ToneMapping,Vignette } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import { type Focus } from '@/lib/cities';
type Vec=[number,number,number];
type Props={interior:boolean;city:number;focus:Focus;reset:number;onInteract:(f:Focus)=>void;onReady:()=>void;lampOn:boolean;onLampToggle:()=>void;dogReaction:number;onDogClick:()=>void;fortuneCount:number;skyMode:SkyMode;onSkyUnavailable:(unavailable:boolean)=>void};
const palette={wood:'#9a6b45',woodDark:'#503c2e',cream:'#ddd0b7',gold:'#c59e63',wall:'#7d7d76',black:'#242929'};
const woodColors=new Set(['#9a6b45','#503c2e','#a77b52','#93704f','#a07d58','#ab815a','#9e7550','#ad865d','#684d36','#493e32']);
const fabricColors=new Set(['#a89c82','#958e7e','#a39273','#9b8a6a','#a59577','#798071','#c3b497']);
function Box({p,s,c,r=0,rotation,children,...props}:{p:Vec;s:Vec;c:string;r?:number;rotation?:Vec;children?:React.ReactNode;onClick?:(e:ThreeEvent<MouseEvent>)=>void}){const kind:SurfaceKind=woodColors.has(c)?'wood':fabricColors.has(c)?'fabric':c==='#c6c0ae'?'stone':'paint';const radius=r||(s.every(n=>n>.035)?.006:0);return radius?<RoundedBox args={s} radius={radius} smoothness={3} position={p} rotation={rotation} castShadow receiveShadow {...props}><Surface color={c} kind={kind}/>{children}</RoundedBox>:<mesh position={p} rotation={rotation} castShadow receiveShadow {...props}><boxGeometry args={s}/><Surface color={c} kind={kind}/>{children}</mesh>}
function MemoryWall({click}:{click:()=>void}){return <group position={[-4.88,2.12,-.62]} rotation={[0,Math.PI/2,0]} onClick={e=>{e.stopPropagation();click()}}><Box p={[0,0,-.03]} s={[2.35,1.53,.06]} c="#897958" r={.015}/>{[[-.72,.26,.09],[-.04,.28,-.1],[.67,.21,.05],[-.55,-.4,-.09],[.31,-.38,.07]].map(([x,y,r],i)=><group key={i} position={[x,y,.02]} rotation={[0,0,r]}><Box p={[0,0,.02]} s={[.48,.61,.015]} c={i===3?'#cfb984':'#eee5ce'}/><Box p={[0,.055,.033]} s={[.4,.37,.008]} c={['#707f7a','#a18773','#515f69','#cab789','#8b817a'][i]}/><Box p={[0,.31,.04]} s={[.16,.07,.014]} c="#bca885" rotation={[0,0,-.2]}/>{i!==3&&<><Box p={[-.05,.01,.04]} s={[.04,.16,.01]} c="#dcc5a0"/><Box p={[.07,-.12,.04]} s={[.23,.015,.01]} c="#8d8071"/></>}</group>)}</group>}
function Room({onInteract,lampOn,onLampToggle,dogReaction,onDogClick,fortuneCount,interior}:Props){const window=windowDimensions(interior);return <group>{interior&&<InteriorEnvelope/>}<Box p={[0,-.25,0]} s={[10.3,.5,7.15]} c="#3a403e" r={.045}/><Box p={[0,.01,0]} s={[10,.08,6.95]} c="#a77b52"/>{Array.from({length:25},(_,i)=>{const x=-4.8+i*.4;return <group key={i}>{[-2.32,0,2.32].map((z,j)=><Box key={j} p={[x,.06,z]} s={[.385,.025,2.307]} c={['#93704f','#a07d58','#ab815a','#9e7550','#ad865d'][(i+j*2)%5]}/>)}</group>})}<Box p={[-5,1.7,0]} s={[.18,3.4,7]} c="#b9b9ae"/><Box p={[-4.87,.19,0]} s={[.055,.22,6.9]} c="#aaa48e"/><Box p={[-4.9,3.39,0]} s={[.28,.13,7.05]} c="#bbb19d"/><Box p={[0,window.top+.06,-3.38]} s={[10.2,.15,.32]} c="#c0b49d"/>
  <group onClick={e=>{e.stopPropagation();onInteract('window')}}><Box p={[0,.24,-3.43]} s={[10,.4,.14]} c="#303a3a"/><Box p={[0,window.top,-3.43]} s={[10,.12,.12]} c="#303a3a"/>{[-4.93,-3.28,-1.64,0,1.64,3.28,4.93].map(x=><Box key={x} p={[x,window.center,-3.43]} s={[.06,window.height,.1]} c="#263330"/>)}<mesh position={[0,window.center,-3.48]}><planeGeometry args={[9.87,window.height-.12]}/><meshPhysicalMaterial color="#a7beb9" transparent opacity={.055} roughness={.1} metalness={.2} side={THREE.DoubleSide}/></mesh></group>
  <ImportedBed click={()=>onInteract('bed')}/><Workstation/><MemoryWall click={()=>onInteract('wall')}/><FortuneTable count={fortuneCount} onFortune={()=>onInteract('fortune')} onPaperclip={()=>onInteract('paperclip')} onGloves={()=>onInteract('gloves')}/>
  <Lamp on={lampOn} toggle={onLampToggle}/><Dog reaction={dogReaction} click={onDogClick}/>
 </group>}
export default function Scene(props:Props){return <Canvas camera={{position:[4.4,2.35,5.4],fov:59,near:.08,far:100}} shadows={{type:THREE.PCFShadowMap}} dpr={[1,1.6]} gl={{antialias:true,alpha:true,powerPreference:'high-performance'}} fallback={<div className="loading"><p>Your browser needs WebGL to enter the penthouse.</p></div>}><Lighting onReady={props.onReady} lampOn={props.lampOn} skyMode={props.skyMode}/><CameraRig focus={props.focus} reset={props.reset} interior={props.interior}/><RoomMaterials><Room {...props}/></RoomMaterials><Backdrop interior={props.interior} city={props.city} mode={props.skyMode} onUnavailable={props.onSkyUnavailable}/><ContactShadows position={[0,-.54,0]} opacity={.36} scale={25} blur={2.5} far={5} resolution={256} frames={1}/><EffectComposer multisampling={0}><N8AO aoRadius={.35} distanceFalloff={1.1} intensity={1.4} quality="low" halfRes/><ToneMapping mode={ToneMappingMode.ACES_FILMIC}/><Vignette offset={.3} darkness={.22}/></EffectComposer></Canvas>;}
