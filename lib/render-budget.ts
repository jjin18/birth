/** Keep slow breathing alive while idle; full rate is reserved for interaction. */
export const IDLE_FRAME_MS = 1000 / 15;
export const SETTLE_MS = 4500;
export const QUALITY_DPR = [1.6, 1.2, 1] as const;
export function renderMode(hidden: boolean, occluded: boolean, now: number, activeUntil: number) {
  return hidden || (occluded && now >= activeUntil) ? 'paused' : now < activeUntil ? 'active' : 'idle';
}

/** Only sample interactive frames, never the deliberately throttled idle loop. */
export class FrameBudget {
  private samples = 0;
  private elapsed = 0;
  tier = 0;
  sample(milliseconds: number, active: boolean) {
    if (!active || milliseconds > 150) { this.samples = 0; this.elapsed = 0; return this.tier; }
    this.elapsed += milliseconds;
    if (++this.samples >= 90) {
      if (this.elapsed / this.samples > 32 && this.tier < 2) this.tier++;
      this.samples = 0; this.elapsed = 0;
    }
    return this.tier;
  }
}
