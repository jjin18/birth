import type {Camera} from 'three';
import type {N8AOPostPass} from 'n8ao';

/** N8AO temporarily hides opaque meshes while rendering transparent layers.
 * Those auxiliary renders must read, never rebuild, the main scene's shadows.
 * Otherwise idle rendering freezes the empty shadow maps left by this pass. */
export function protectRoomShadowMaps(pass:N8AOPostPass){
 const render=pass.render.bind(pass);
 pass.render=(renderer,...args)=>{
  const shadows=renderer.shadowMap;
  const autoUpdate=shadows.autoUpdate,needsUpdate=shadows.needsUpdate;
  shadows.autoUpdate=false;shadows.needsUpdate=false;
  try{return render(renderer,...args)}
  finally{shadows.autoUpdate=autoUpdate;shadows.needsUpdate=needsUpdate}
 };
}

/** N8AO doesn't implement Pass.mainCamera. Keep its targets and update its
 * camera AND projection-specific shaders instead of recreating the pass. */
export function syncRoomAO(pass:N8AOPostPass,camera:Camera){
 if(pass.camera===camera)return;
 const orthographic=(value:Camera)=>'isOrthographicCamera' in value&&!!value.isOrthographicCamera;
 const changedProjection=orthographic(pass.camera)!==orthographic(camera);
 pass.camera=camera;
 if(changedProjection){
  const depth=pass.configuration.depthBufferType,ortho=orthographic(camera);
  pass.configureAOPass(depth,ortho);
  pass.configureDenoisePass(depth,ortho);
  pass.configureEffectCompositer(depth,ortho);
 }
 pass.firstFrame();
}
