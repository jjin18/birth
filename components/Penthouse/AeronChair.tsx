'use client';
import { Suspense, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import MeshChair from './MeshChair';

const MODEL_URL = '/models/herman-miller-aeron.glb';
const DECODER_PATH = '/draco/';

function ChairModel() {
  const { scene } = useGLTF(MODEL_URL, DECODER_PATH);
  const chair = useMemo(() => {
    // The GLB is cached; only change our instance, not the source scene.
    const model = scene.clone(true);
    const showroomObjects: THREE.Object3D[] = [];
    model.traverse(object => {
      // Use the room's lights and real shadows instead of the export's setup.
      if (object instanceof THREE.Light || object.name.includes('BASE-BLOB')) {
        showroomObjects.push(object);
      }
      if (object instanceof THREE.Mesh) {
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        object.castShadow = materials.every(material => !material.transparent);
        object.receiveShadow = true;
      }
    });
    showroomObjects.forEach(object => object.removeFromParent());
    const bounds = new THREE.Box3().setFromObject(model);
    const center = bounds.getCenter(new THREE.Vector3());
    const scale = 1.48 / bounds.getSize(new THREE.Vector3()).y;
    model.scale.setScalar(scale);
    model.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
    return model;
  }, [scene]);

  // The supplied chair faces +Z; turn its seat toward the workstation.
  return <group name="herman-miller-aeron-chair" position={[-.32, .077, 1.14]} rotation={[0, Math.PI - .22, 0]} dispose={null}>
    <primitive object={chair} />
  </group>;
}

export default function AeronChair() {
  return <Suspense fallback={<MeshChair />}><ChairModel /></Suspense>;
}

useGLTF.preload(MODEL_URL, DECODER_PATH);
