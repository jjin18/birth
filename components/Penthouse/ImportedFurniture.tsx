'use client';
import { Suspense, useLayoutEffect, useMemo } from 'react';
import { useRoomModel, preloadRoomModel } from './useRoomModel';
import * as THREE from 'three';

const DESK_URL = '/models/herman-miller-motia-desk.glb';
const BED_URL = '/models/uploaded-bed-v2.glb';
const FLOOR_Y = .075;

function useFurniture(url: string, width: number) {
  const { scene } = useRoomModel(url);
  return useMemo(() => {
    const object = scene.clone(true);
    const showroomObjects: THREE.Object3D[] = [];
    object.traverse(node => {
      if (node instanceof THREE.Light || /BLOB|Ground_plane/i.test(node.name)) showroomObjects.push(node);
      if (node instanceof THREE.Mesh) {
        const materials = Array.isArray(node.material) ? node.material : [node.material];
        node.castShadow = materials.every(material => !material.transparent);
        node.receiveShadow = true;
      }
    });
    showroomObjects.forEach(node => node.removeFromParent());
    const bounds = new THREE.Box3().setFromObject(object);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const scale = width / size.x;
    object.scale.setScalar(scale);
    object.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
    return { object, height: size.y * scale };
  }, [scene, width]);
}

function DeskModel({ onSurface }: { onSurface: (height: number) => void }) {
  const { object, height } = useFurniture(DESK_URL, 2.9);
  useLayoutEffect(() => { onSurface(FLOOR_Y + height); }, [height, onSurface]);
  return <group name="herman-miller-motia-desk" position={[0, FLOOR_Y, 0]} dispose={null}><primitive object={object} /></group>;
}

export function ImportedDesk({ onSurface }: { onSurface: (height: number) => void }) {
  return <Suspense fallback={null}><DeskModel onSurface={onSurface} /></Suspense>;
}

function BedModel({ click }: { click: () => void }) {
  const { object } = useFurniture(BED_URL, 3.05);
  return <group name="uploaded-bed" position={[-3.2, FLOOR_Y, -.95]} dispose={null} onClick={event => { event.stopPropagation(); click(); }}><primitive object={object} /></group>;
}

export function ImportedBed({ click }: { click: () => void }) {
  return <Suspense fallback={null}><BedModel click={click} /></Suspense>;
}

preloadRoomModel(DESK_URL);
preloadRoomModel(BED_URL);
