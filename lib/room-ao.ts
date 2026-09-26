import type {Camera} from 'three';
import type {N8AOPostPass} from 'n8ao';

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
