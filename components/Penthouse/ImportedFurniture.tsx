'use client';
import { Suspense, useLayoutEffect, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { DetailedBed, DetailedSofa } from './SoftFurnishings';

const DESK_URL = '/models/herman-miller-motia-desk.glb';
const SOFA_URL = '/models/herman-miller-sofa.glb';
const BED_URL = '/models/uploaded-bed.glb';
const FLOOR_Y = .075;

function useFurniture(url: string, width: number) {
  const { scene } = useGLTF(url, '/draco/');
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

function SofaModel() {
  const { object } = useFurniture(SOFA_URL, 2.55);
  return <group name="herman-miller-sofa" position={[-2.6, FLOOR_Y, 2.44]} rotation={[0, Math.PI, 0]} dispose={null}><primitive object={object} /></group>;
}

export function ImportedSofa() {
  return <Suspense fallback={<DetailedSofa />}><SofaModel /></Suspense>;
}

function BedModel({ click }: { click: () => void }) {
  const { object } = useFurniture(BED_URL, 2.62);
  return <group name="uploaded-bed" position={[-2.5, FLOOR_Y, -.35]} dispose={null} onClick={event => { event.stopPropagation(); click(); }}><primitive object={object} /></group>;
}

export function ImportedBed({ click }: { click: () => void }) {
  return <Suspense fallback={<DetailedBed click={click} />}><BedModel click={click} /></Suspense>;
}

useGLTF.preload(DESK_URL, '/draco/');
useGLTF.preload(SOFA_URL, '/draco/');
useGLTF.preload(BED_URL, '/draco/');
