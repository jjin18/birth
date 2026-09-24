'use client';
import { Suspense, useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

const MODEL_URL = '/models/uploaded-floor-lamp.glb';

function LampModel({ on }: { on: boolean }) {
  const { scene } = useGLTF(MODEL_URL, '/draco/');
  const glow = useMemo(() => ({ value: on ? .55 : 0 }), []);
  const { object, materials } = useMemo(() => {
    const object = scene.clone(true);
    const materials: THREE.MeshStandardMaterial[] = [];
    object.traverse(node => {
      if (!(node instanceof THREE.Mesh)) return;
      node.castShadow = true;
      node.receiveShadow = true;
      const copyMaterial = (source: THREE.MeshStandardMaterial) => {
        const material = source.clone();
        // The supplied mesh combines the wood stem and fabric shade. Limit
        // the warm emission to the shade, leaving the original wood untouched.
        material.onBeforeCompile = shader => {
          shader.uniforms.lampGlow = glow;
          shader.vertexShader = 'varying float lampModelY;\n' + shader.vertexShader;
          shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nlampModelY = position.y;');
          shader.fragmentShader = 'uniform float lampGlow;\nvarying float lampModelY;\n' + shader.fragmentShader;
          shader.fragmentShader = shader.fragmentShader.replace('#include <emissivemap_fragment>', `
            #include <emissivemap_fragment>
            float shadeMask = smoothstep(0.235, 0.26, lampModelY);
            totalEmissiveRadiance += vec3(1.0, 0.67, 0.30) * lampGlow * shadeMask;
          `);
        };
        material.customProgramCacheKey = () => 'uploaded-lamp-shade-glow-v1';
        materials.push(material);
        return material;
      };
      node.material = Array.isArray(node.material) ? node.material.map(copyMaterial) : copyMaterial(node.material);
    });
    const bounds = new THREE.Box3().setFromObject(object);
    const center = bounds.getCenter(new THREE.Vector3());
    const scale = 2.32 / bounds.getSize(new THREE.Vector3()).y;
    object.scale.setScalar(scale);
    object.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
    return { object, materials };
  }, [scene, glow]);
  useEffect(() => () => materials.forEach(material => material.dispose()), [materials]);
  useFrame((_, delta) => { glow.value = THREE.MathUtils.lerp(glow.value, on ? .55 : 0, 1 - Math.exp(-delta * 6)); });
  return <group name="uploaded-floor-lamp" dispose={null}><primitive object={object} /></group>;
}

export default function ImportedLamp({ on }: { on: boolean }) {
  const bulb = useRef<THREE.PointLight>(null);
  useFrame((_, delta) => {
    if (bulb.current) bulb.current.intensity = THREE.MathUtils.lerp(bulb.current.intensity, on ? 18 : 0, 1 - Math.exp(-delta * 6));
  });
  return <>
    <Suspense fallback={null}><LampModel on={on} /></Suspense>
    <pointLight name="room-lamp-light" ref={bulb} position={[0, 2.0, 0]} color="#ffcf8e" intensity={on ? 18 : 0} distance={7} decay={2} />
  </>;
}

useGLTF.preload(MODEL_URL, '/draco/');
