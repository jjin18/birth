'use client';
import Modal from './Modal';
import MiniFighter from './MiniFighter';

export default function Arcade({close}:{close:()=>void}) {
 return <Modal title="Jia vs. Ryan." eyebrow="JIA + RYAN ARCADE" close={close} wide>
  <MiniFighter/>
 </Modal>;
}
