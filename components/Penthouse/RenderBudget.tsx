'use client';
import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { IDLE_FRAME_MS, SETTLE_MS, renderMode } from '@/lib/render-budget';

export default function RenderBudget({activity, occluded}:{activity:string;occluded:boolean}) {
  const { gl, get, invalidate, setFrameloop } = useThree();
  const activeUntil = useRef(0);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let disposed = false;
    const tick = () => {
      if (disposed) return;
      clearTimeout(timer);
      const mode = renderMode(document.hidden, occluded, performance.now(), activeUntil.current);
      gl.domElement.dataset.renderMode = mode;
      const loop = mode === 'paused' ? 'never' : 'demand';
      // setFrameloop resets the R3F clock, even if the value is unchanged.
      if (get().frameloop !== loop) setFrameloop(loop);
      gl.shadowMap.autoUpdate = mode === 'active';
      if (mode !== 'paused') {
        invalidate();
        timer = setTimeout(tick, mode === 'active' ? 16 : IDLE_FRAME_MS);
      }
    };
    const wake = () => {
      const now = performance.now();
      activeUntil.current = now + SETTLE_MS;
      gl.shadowMap.needsUpdate = true;
      tick();
    };
    const drag = (event: PointerEvent) => { if (event.buttons) wake(); };
    const visible = () => { if (!document.hidden) wake(); else tick(); };
    const canvas = gl.domElement;
    canvas.addEventListener('pointerdown', wake);
    canvas.addEventListener('pointermove', drag);
    canvas.addEventListener('wheel', wake, { passive: true });
    document.addEventListener('visibilitychange', visible);
    window.addEventListener('resize', wake);
    wake();
    return () => {
      disposed = true; clearTimeout(timer);
      canvas.removeEventListener('pointerdown', wake);
      canvas.removeEventListener('pointermove', drag);
      canvas.removeEventListener('wheel', wake);
      document.removeEventListener('visibilitychange', visible);
      window.removeEventListener('resize', wake);
      gl.shadowMap.autoUpdate = true;
    };
  }, [activity, occluded, gl, get, invalidate, setFrameloop]);
  return null;
}
