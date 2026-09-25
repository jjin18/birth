import * as THREE from 'three';

type StandardMaterial = THREE.MeshStandardMaterial;
type Layout = 'gb' | 'r';
type PackedSource = THREE.DataTexture['source'];
const patched = new WeakSet<THREE.Material>();
const packedSources = new WeakMap<THREE.Texture['source'], { layout: Layout; source: PackedSource }>();

// glTF stores roughness in G, metalness in B, and occlusion in R. R8/RG8
// retain those exact bytes at the original resolution without allocating
// four GPU channels. Color and normal maps are never changed.
export function applyPackedMaterial(material: StandardMaterial) {
  if (patched.has(material)) return;
  const roughness = material.roughnessMap?.userData.roomPackedChannels === 'gb';
  const metalness = material.metalnessMap?.userData.roomPackedChannels === 'gb';
  if (!roughness && !metalness) return;
  const compile = material.onBeforeCompile;
  const key = material.customProgramCacheKey();
  material.onBeforeCompile = function (shader, renderer) {
    compile.call(this, shader, renderer);
    if (roughness) shader.fragmentShader = shader.fragmentShader.replace(
      '#include <roughnessmap_fragment>',
      THREE.ShaderChunk.roughnessmap_fragment.replace('texelRoughness.g', 'texelRoughness.r'),
    );
    if (metalness) shader.fragmentShader = shader.fragmentShader.replace(
      '#include <metalnessmap_fragment>',
      THREE.ShaderChunk.metalnessmap_fragment.replace('texelMetalness.b', 'texelMetalness.g'),
    );
  };
  material.customProgramCacheKey = () => `${key}|room-channels-v1:${roughness}:${metalness}`;
  material.needsUpdate = true;
  patched.add(material);
}

function packSource(texture: THREE.Texture, layout: Layout) {
  const cached = packedSources.get(texture.source);
  if (cached?.layout === layout) return cached.source;
  // Restrict this to the opaque, unflipped linear-data images used by the
  // room GLBs. Unknown/custom formats keep the original rendering path.
  if (texture.type !== THREE.UnsignedByteType || texture.colorSpace !== THREE.NoColorSpace ||
      texture.flipY || texture.premultiplyAlpha || texture.mipmaps.length) return null;
  const image = texture.image as HTMLImageElement | ImageBitmap;
  if (!image?.width || !image?.height || 'data' in image) return null;
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  try {
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return null;
    context.drawImage(image, 0, 0);
    const rgba = context.getImageData(0, 0, image.width, image.height).data;
    const channels = layout === 'gb' ? 2 : 1;
    const data = new Uint8Array(image.width * image.height * channels);
    for (let pixel = 0, target = 0; pixel < rgba.length; pixel += 4) {
      // Avoid alpha unpremultiplication changing source bytes.
      if (rgba[pixel + 3] !== 255) return null;
      data[target++] = rgba[pixel + (layout === 'gb' ? 1 : 0)];
      if (layout === 'gb') data[target++] = rgba[pixel + 2];
    }
    const source = new THREE.Source({ data, width: image.width, height: image.height });
    packedSources.set(texture.source, { layout, source });
    return source;
  } finally {
    // Release the temporary full-RGBA canvas immediately. Keep the packed
    // bytes for context restoration; never close a still-shared ImageBitmap.
    canvas.width = canvas.height = 0;
  }
}

export function optimizeModelTextures(scenes: THREE.Object3D[]) {
  const materials = new Set<StandardMaterial>();
  for (const scene of scenes) scene.traverse(node => {
    if (!(node instanceof THREE.Mesh)) return;
    for (const material of Array.isArray(node.material) ? node.material : [node.material]) materials.add(material);
  });
  // Audit ALL bindings to each source, including UV-transform clones. An
  // image also used as color/normal/another map must not lose its channels.
  const usage = new Map<THREE.Texture['source'], Set<string>>();
  for (const material of materials) for (const [key, value] of Object.entries(material)) {
    if (!(value instanceof THREE.Texture)) continue;
    if (!usage.has(value.source)) usage.set(value.source, new Set());
    usage.get(value.source)!.add(key);
  }
  const replacements = new Map<THREE.Texture, THREE.DataTexture>();
  for (const material of materials) {
    for (const key of ['roughnessMap', 'metalnessMap', 'aoMap'] as const) {
      const texture = material[key];
      if (!texture || texture.userData.roomPackedChannels) continue;
      const roles = usage.get(texture.source)!;
      const layout: Layout | null = [...roles].every(role => role === 'roughnessMap' || role === 'metalnessMap') ? 'gb'
        : roles.size === 1 && roles.has('aoMap') ? 'r' : null;
      if (!layout) continue;
      let replacement = replacements.get(texture);
      if (!replacement) {
        let source: PackedSource | null = null;
        try { source = packSource(texture, layout); } catch { /* Safe fallback: retain the original map. */ }
        if (!source) continue;
        replacement = new THREE.DataTexture();
        THREE.Texture.prototype.copy.call(replacement, texture);
        replacement.source = source;
        replacement.format = layout === 'gb' ? THREE.RGFormat : THREE.RedFormat;
        replacement.internalFormat = null;
        replacement.unpackAlignment = 1;
        replacement.userData = { ...texture.userData, roomPackedChannels: layout };
        replacement.needsUpdate = true;
        replacements.set(texture, replacement);
      }
      material[key] = replacement;
    }
    applyPackedMaterial(material);
  }
  return { packedTextures: replacements.size };
}
