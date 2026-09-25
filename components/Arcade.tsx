'use client';
import Modal from './Modal';
import MiniFighter from './MiniFighter';
import '@/app/arcade.css';

export default function Arcade({close}:{close:()=>void}) {
 return <Modal title="Jia vs. Ryan" eyebrow="LOCAL MULTIPLAYER" close={close} wide className="arcade-panel">
  <MiniFighter/>
 </Modal>;
}
