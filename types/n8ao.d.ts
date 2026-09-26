declare module 'n8ao' {
 import type {Camera,Scene} from 'three';
 import {Pass} from 'postprocessing';
 export class N8AOPostPass extends Pass {
  constructor(scene:Scene,camera:Camera,width?:number,height?:number);
  camera:Camera;
  configuration:{depthBufferType:number;aoRadius:number;distanceFalloff:number;intensity:number;halfRes:boolean};
  setQualityMode(mode:string):void;
  configureAOPass(depth:number,ortho?:boolean):void;
  configureDenoisePass(depth:number,ortho?:boolean):void;
  configureEffectCompositer(depth:number,ortho?:boolean):void;
  firstFrame():void;
 }
}
