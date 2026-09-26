import { OrthographicCamera, PerspectiveCamera } from 'three';
import { roomHomeView, roomOpening } from './room-camera';

export type RoomCamera = OrthographicCamera | PerspectiveCamera;

/** A bounded dolly on entry / pull-back on exit. Keep the camera in the new
 * shell's safe space instead of flying through opaque walls between projections. */
export function startRoomViewTransition(camera:RoomCamera,interior:boolean,width:number,height:number){
  const home=roomHomeView(interior,width,height);
  if(interior){camera.position.z+=1.8;camera.position.y+=.15}
  else {camera.position.y=home.position[1]*.78;camera.zoom=home.zoom*1.16}
  camera.lookAt(...home.target);camera.updateProjectionMatrix();camera.updateMatrixWorld();
}

/** Prepare projection AND orientation before publishing a camera to the scene. */
export function prepareRoomCamera(camera:RoomCamera, interior:boolean, width:number, height:number, reset:boolean){
  const home=roomHomeView(interior,width,height);
  if(camera instanceof PerspectiveCamera){
    camera.aspect=width/Math.max(1,height);
    camera.fov=roomOpening(width,height).fov;
  }else{
    camera.left=-width/2;camera.right=width/2;
    camera.top=height/2;camera.bottom=-height/2;
  }
  if(reset){camera.position.set(...home.position);camera.zoom=home.zoom;camera.lookAt(...home.target)}
  camera.updateProjectionMatrix();camera.updateMatrixWorld();
  return camera;
}
