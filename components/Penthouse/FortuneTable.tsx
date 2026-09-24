'use client';
import { Suspense, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import PandaTakeout from './PandaTakeout';
import Paperclip from './Paperclip';
import { BoxingGloves } from './RoomObjects';

const MODEL_URL = '/models/girard-flower-table.glb';
const FLOOR_Y = .075;
type Props = { count: number; onFortune: () => void; onPaperclip: () => void; onGloves: () => void };

function TableAndObjects({ count, onFortune, onPaperclip, onGloves }: Props) {
  const { scene } = useGLTF(MODEL_URL, '/draco/');
  const { object, surfaceY } = useMemo(() => {
    const object = scene.clone(true);
    const showroom: THREE.Object3D[] = [];
    object.traverse(node => {
      if (node instanceof THREE.Light || /BLOB|Ground_plane/i.test(node.name)) showroom.push(node);
      if (node instanceof THREE.Mesh) { node.castShadow = true; node.receiveShadow = true; }
    });
    showroom.forEach(node => node.removeFromParent());
    const bounds = new THREE.Box3().setFromObject(object);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const scale = 2.28 / size.x;
    object.scale.setScalar(scale);
    object.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
    return { object, surfaceY: FLOOR_Y + size.y * scale };
  }, [scene]);
  return <>
    <group name="uploaded-flower-table" position={[0, FLOOR_Y, 0]} dispose={null}><primitive object={object} /></group>
    <group name="tabletop-objects" position={[0, surfaceY + .004, 0]}>
      <PandaTakeout position={[-.45, 0, -.19]} click={onFortune} />
      <Paperclip position={[.14, .003, -.35]} scale={.32} count={count} click={onPaperclip} />
      <BoxingGloves position={[-.06, .005, .6]} scale={.7} click={onGloves} />
    </group>
  </>;
}

export default function FortuneTable(props: Props) {
  return <group name="fortune-table" position={[2.3, 0, 2.1]}><Suspense fallback={null}><TableAndObjects {...props} /></Suspense></group>;
}

useGLTF.preload(MODEL_URL, '/draco/');
