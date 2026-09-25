'use client';
import { useGLTF } from '@react-three/drei';
import type { GLTFLoader } from 'three-stdlib';
import { optimizeModelTextures } from '@/lib/model-textures';
import { assetUrl } from '@/lib/asset-url';

const configured = new WeakSet<GLTFLoader>();
function configure(loader: GLTFLoader) {
  if (configured.has(loader)) return;
  loader.register(() => ({
    name: 'PENTHOUSE_lossless_texture_channels',
    afterRoot: result => { optimizeModelTextures(result.scenes); return null; },
  }));
  configured.add(loader);
}

export function useRoomModel(url: string) {
  return useGLTF(assetUrl(url), '/draco/', true, configure);
}

export function preloadRoomModel(url: string) {
  // Use the same extension for preloads: an unoptimized cached GLTF would
  // otherwise bypass the hook's loader configuration on first mount.
  useGLTF.preload(assetUrl(url), '/draco/', true, configure);
}
