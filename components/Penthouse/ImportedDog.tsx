'use client';
import { Suspense, useEffect, useMemo } from 'react';
import { useRoomModel, preloadRoomModel } from './useRoomModel';
import { applyPackedMaterial } from '@/lib/model-textures';
import * as THREE from 'three';

const MODEL_URL = '/models/dog-on-bed.glb';

function DogModel() {
  const { scene } = useRoomModel(MODEL_URL);
  const { object, materials } = useMemo(() => {
    const object = scene.clone(true);
    const materials: THREE.MeshStandardMaterial[] = [];
    object.traverse(node => {
      if (!(node instanceof THREE.Mesh)) return;
      node.castShadow = true;
      node.receiveShadow = true;
      const copyMaterial = (source: THREE.MeshStandardMaterial) => {
        const material = source.clone();
        // This scan includes both the dog and its bed, and has no skeleton.
        // Keep its vertices intact. Clock-based deformation stretched the mesh
        // when the demand renderer resumed with a reset clock after a popup.
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
  }, [scene]);
  useEffect(() => () => materials.forEach(material => material.dispose()), [materials]);
  return <group name="imported-dog-and-bed" dispose={null}><primitive object={object} /></group>;
}

export default function ImportedDog(_props: { reaction: number }) {
  return <Suspense fallback={null}><DogModel /></Suspense>;
}

preloadRoomModel(MODEL_URL);
