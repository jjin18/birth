/** Limit idle work, not image quality. Hidden/covered scenes still stop entirely. */
export const IDLE_FRAME_MS = 1000 / 15;
export const SETTLE_MS = 4500;
/** Sharp on high-density screens, bounded to avoid unbounded GPU allocation. */
export const MAX_ROOM_DPR = 2;
export function renderMode(hidden: boolean, occluded: boolean, now: number, activeUntil: number) {
  return hidden || occluded ? 'paused' : now < activeUntil ? 'active' : 'idle';
}
