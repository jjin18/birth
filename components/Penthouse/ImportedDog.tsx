'use client';
import { Suspense, useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useRoomModel, preloadRoomModel } from './useRoomModel';
import { applyPackedMaterial } from '@/lib/model-textures';
import * as THREE from 'three';

const MODEL_URL = '/models/dog-on-bed.glb';

function DogModel({ reaction }: { reaction: number }) {
  const { scene } = useRoomModel(MODEL_URL);
  const uniforms = useMemo(() => ({ dogTime: { value: 0 }, dogBark: { value: 0 } }), []);
  const { object, materials } = useMemo(() => {
    const object = scene.clone(true);
    const materials: THREE.MeshStandardMaterial[] = [];
    object.traverse(node => {
      if (!(node instanceof THREE.Mesh)) return;
      node.castShadow = true;
      node.receiveShadow = true;
      const copyMaterial = (source: THREE.MeshStandardMaterial) => {
        const material = source.clone();
        // This is a single unrigged mesh. Move only the dog's upper body;
        // the bed and blanket stay planted on the floor.
        material.onBeforeCompile = shader => {
          Object.assign(shader.uniforms, uniforms);
          shader.vertexShader = 'uniform float dogTime;\nuniform float dogBark;\n' + shader.vertexShader;
          shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `
            #include <begin_vertex>
            float bodyWeight = smoothstep(0.32, 0.5, position.y);
            transformed.y += bodyWeight * (sin(dogTime * 2.0) * 0.002 + dogBark * 0.009);
          `);
        };
        material.customProgramCacheKey = () => 'dog-gentle-breath-v1';
        applyPackedMaterial(material);
        materials.push(material);
        return material;
      };
      node.material = Array.isArray(node.material) ? node.material.map(copyMaterial) : copyMaterial(node.material);
    });
    const bounds = new THREE.Box3().setFromObject(object);
    const center = bounds.getCenter(new THREE.Vector3());
    const size = bounds.getSize(new THREE.Vector3());
    const scale = 1.36 / Math.max(size.x, size.z);
    object.scale.setScalar(scale);
    object.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
    return { object, materials };
  }, [scene, uniforms]);
  useEffect(() => () => materials.forEach(material => material.dispose()), [materials]);
  const previousReaction = useRef(reaction), barkAt = useRef(-100);
  useFrame(({ clock }) => {
    const time = clock.elapsedTime;
    if (reaction !== previousReaction.current) { previousReaction.current = reaction; barkAt.current = time; }
    uniforms.dogTime.value = time;
    const elapsed = time - barkAt.current;
    uniforms.dogBark.value = elapsed < .8 ? Math.max(0, Math.sin(elapsed * 20)) * Math.exp(-elapsed * 3) : 0;
  });
  return <group name="imported-dog-and-bed" dispose={null}><primitive object={object} /></group>;
}

export default function ImportedDog({ reaction }: { reaction: number }) {
  return <Suspense fallback={null}><DogModel reaction={reaction} /></Suspense>;
}

preloadRoomModel(MODEL_URL);
