import { ARENA, poseFor, type FighterName, type Match, type Pose } from './fighter-game';

type Frame = { rect: [number, number, number, number]; anchor: number; height: number; clip?: [number, number][] };
// The atlas keeps each supplied pose's proportions; anchors align feet, not glove width.
export const FRAMES: Record<FighterName, Record<Pose, Frame>> = {
  Jia: {
    tpose: { rect: [15, 0, 520, 525], anchor: 265, height: 250 },
    ready: { rect: [575, 0, 365, 522], anchor: 758, height: 250 },
    punch: { rect: [995, 0, 530, 523], anchor: 1220, height: 250 },
    jump: { rect: [65, 557, 480, 380], anchor: 320, height: 184 },
    hurt: { rect: [625, 525, 280, 478], anchor: 775, height: 226 },
    fall: { rect: [990, 632, 540, 363], anchor: 1255, height: 174 },
  },
  Ryan: {
    tpose: { rect: [10, 0, 610, 586], anchor: 305, height: 258, clip: [[10,0],[620,0],[620,210],[505,310],[500,586],[10,586]] },
    ready: { rect: [545, 38, 399, 550], anchor: 743, height: 243, clip: [[640,38],[944,38],[944,588],[545,588],[545,330],[640,210]] },
    punch: { rect: [960, 43, 576, 545], anchor: 1210, height: 243 },
    jump: { rect: [62, 587, 480, 395], anchor: 306, height: 182 },
    hurt: { rect: [615, 587, 310, 427], anchor: 770, height: 202 },
    fall: { rect: [980, 680, 556, 344], anchor: 1260, height: 165 },
  },
};
export type Sprites = Record<FighterName, HTMLImageElement>;
export const SPRITE_URLS = { Jia: '/arcade/jia-poses.webp', Ryan: '/arcade/ryan-poses.webp' };
export const CHARACTER_SCALE = { Jia: .85, Ryan: 1 } as const;

export async function loadSprites(): Promise<Sprites> {
  const entries = await Promise.all(Object.entries(SPRITE_URLS).map(async ([name, url]) => {
    const image = new Image();
    image.src = url;
    await image.decode();
    return [name, image] as const;
  }));
  return Object.fromEntries(entries) as Sprites;
}

export function paintMatch(ctx: CanvasRenderingContext2D, match: Match, sprites: Sprites, now: number, reducedMotion = false) {
  ctx.clearRect(0, 0, ARENA.width, ARENA.height);
  const background = ctx.createLinearGradient(0, 0, 0, ARENA.height);
  background.addColorStop(0, '#66635f'); background.addColorStop(1, '#77736e');
  ctx.fillStyle = background; ctx.fillRect(0, 0, ARENA.width, ARENA.height);
  ctx.fillStyle = '#5b5955'; ctx.fillRect(0, ARENA.floor + 3, ARENA.width, 70);
  ctx.fillStyle = '#ffffff15'; ctx.fillRect(0, ARENA.floor + 3, ARENA.width, 1);
  for (const f of [...match.fighters].sort((a, b) => Number(a.fallen) - Number(b.fallen))) {
    const pose = poseFor(f, match.phase), spec = FRAMES[f.name][pose];
    const [sx, sy, sw, sh] = spec.rect, scale = spec.height / sh * CHARACTER_SCALE[f.name];
    const height = sh * scale;
    const breathing = !reducedMotion && pose === 'ready' && match.phase !== 'finished' ? Math.sin(now * .004) * 1.4 : 0;
    ctx.fillStyle = '#25232130'; ctx.beginPath();
    ctx.ellipse(f.x, ARENA.floor + 5, f.fallen ? 92 : 49 - f.y * .14, 7 - f.y * .035, 0, 0, Math.PI * 2); ctx.fill();
    ctx.save();
    ctx.translate(f.x, ARENA.floor - f.y + breathing);
    // Front-facing T pose stays symmetrical; all action poses face the opponent.
    ctx.scale(pose === 'tpose' ? 1 : f.facing, 1);
    const dx = (sx - spec.anchor) * scale, dy = -height;
    if (spec.clip) {
      ctx.beginPath();
      spec.clip.forEach(([x, y], index) => { const px = (x - spec.anchor) * scale, py = (y - sy) * scale + dy; if (!index) ctx.moveTo(px, py); else ctx.lineTo(px, py); });
      ctx.closePath(); ctx.clip();
    }
    ctx.drawImage(sprites[f.name], sx, sy, sw, sh, dx, dy, sw * scale, height);
    ctx.restore();
  }
}
