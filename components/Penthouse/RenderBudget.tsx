'use client';
import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { FrameBudget, IDLE_FRAME_MS, QUALITY_DPR, SETTLE_MS, renderMode } from '@/lib/render-budget';

export default function RenderBudget({activity, occluded, onQuality}:{activity:string;occluded:boolean;onQuality:(tier:number)=>void}) {
  const { gl, get, invalidate, setFrameloop, setDpr } = useThree();
  const activeUntil = useRef(0), samplingAfter = useRef(0), lastFrame = useRef(0);
  const budget = useRef(new FrameBudget());
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
      samplingAfter.current = now + 700;
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
  useFrame(() => {
    const now = performance.now();
    const previousTier = budget.current.tier;
    const tier = budget.current.sample(now - lastFrame.current, now > samplingAfter.current && now < activeUntil.current);
    lastFrame.current = now;
    if (tier !== previousTier) {
      setDpr(Math.min(window.devicePixelRatio || 1, QUALITY_DPR[tier]));
      gl.domElement.dataset.qualityTier = String(tier);
      onQuality(tier);
    }
  });
  return null;
}
