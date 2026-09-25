export type FighterName = 'Jia' | 'Ryan';
export type Pose = 'tpose' | 'ready' | 'punch' | 'jump' | 'hurt' | 'fall';
export type Phase = 'lobby' | 'ready' | 'fight' | 'finished';
export type Fighter = {
  name: FighterName; x: number; y: number; vy: number; hp: number;
  facing: 1 | -1; move: number; attack: number; cooldown: number; hurt: number; hit: boolean; fallen: boolean;
};
export type Match = { fighters: [Fighter, Fighter]; phase: Phase; ready: number; time: number; result: string };
export type Input = { left: boolean; right: boolean; jump: boolean; punch: boolean };
export const IDLE_INPUT: Input = { left: false, right: false, jump: false, punch: false };
export const PUNCH_DAMAGE: Record<FighterName, number> = { Jia: 10, Ryan: 8 };
export const JUMP_SPEED = 600;
export const ROUND_SECONDS = 30;
export const ARENA = { width: 960, height: 520, floor: 453, left: 140, right: 820 };
export const CONTROLS = [
  { name: 'Jia', left: 'KeyA', right: 'KeyD', jump: 'KeyW', punch: 'KeyS', labels: ['A', 'D', 'W', 'S'] },
  { name: 'Ryan', left: 'ArrowLeft', right: 'ArrowRight', jump: 'ArrowUp', punch: 'ArrowDown', labels: ['←', '→', '↑', '↓'] },
] as const;

export function createMatch(phase: Phase = 'lobby'): Match {
  const fighter = (name: FighterName, x: number, facing: 1 | -1): Fighter => ({
    name, x, facing, y: 0, vy: 0, hp: 100, move: 0, attack: 0, cooldown: 0, hurt: 0, hit: false, fallen: false,
  });
  return { fighters: [fighter('Jia', 260, 1), fighter('Ryan', 700, -1)], phase, ready: 1, time: ROUND_SECONDS, result: '' };
}

export function poseFor(fighter: Fighter, phase: Phase): Pose {
  if (phase === 'lobby') return 'tpose';
  if (fighter.fallen) return 'fall';
  if (fighter.hurt > 0) return 'hurt';
  if (fighter.attack > 0) return 'punch';
  if (fighter.y > 1 || fighter.vy > 0) return 'jump';
  return 'ready';
}

const bound = (x: number) => Math.max(ARENA.left, Math.min(ARENA.right, x));

// Both fighters take the same input/physics path. There is no computer opponent.
export function stepMatch(match: Match, inputs: readonly [Input, Input], seconds: number) {
  const dt = Math.max(0, Math.min(seconds, .04));
  if (match.phase === 'lobby' || match.phase === 'finished') return;
  if (match.phase === 'ready') {
    match.ready = Math.max(0, match.ready - dt);
    if (!match.ready) match.phase = 'fight';
    return;
  }
  match.time = Math.max(0, match.time - dt);
  const [a, b] = match.fighters;
  for (const [i, f] of match.fighters.entries()) {
    const input = inputs[i];
    f.cooldown = Math.max(0, f.cooldown - dt);
    f.hurt = Math.max(0, f.hurt - dt);
    f.attack = Math.max(0, f.attack - dt);
    f.move = f.hurt ? 0 : Number(input.right) - Number(input.left);
    if (!f.attack) f.facing = f.x <= match.fighters[1 - i].x ? 1 : -1;
    if (!f.hurt) {
      f.x = bound(f.x + f.move * 205 * dt);
      if (input.jump && f.y === 0) f.vy = JUMP_SPEED;
      if (input.punch && !f.cooldown) { f.attack = .26; f.cooldown = .48; f.hit = false; }
    }
    f.y = Math.max(0, f.y + f.vy * dt);
    f.vy = f.y > 0 ? f.vy - 1050 * dt : 0;
  }
  // Grounded bodies cannot walk through each other. A jump can switch sides.
  if (Math.abs(a.y - b.y) < 45 && Math.abs(a.x - b.x) < 78) {
    const direction = a.x <= b.x ? 1 : -1;
    const middle = Math.max(ARENA.left + 39, Math.min(ARENA.right - 39, (a.x + b.x) / 2));
    a.x = middle - direction * 39;
    b.x = middle + direction * 39;
  }
  // Resolve both contacts before applying damage, so simultaneous punches are fair.
  const contacts = match.fighters.map((f, i) => {
    const target = match.fighters[1 - i];
    const distance = (target.x - f.x) * f.facing;
    return f.attack > .06 && f.attack < .20 && !f.hit && distance > 0 && distance < 150 && Math.abs(f.y - target.y) < 68;
  });
  contacts.forEach((contact, i) => {
    if (!contact) return;
    const attacker = match.fighters[i], target = match.fighters[1 - i];
    attacker.hit = true;
    target.hp = Math.max(0, target.hp - PUNCH_DAMAGE[attacker.name]);
    target.hurt = .30;
    target.attack = 0;
    target.x = bound(target.x + attacker.facing * 15);
  });
  if (!a.hp || !b.hp || !match.time) {
    match.phase = 'finished';
    match.result = a.hp === b.hp ? 'Draw' : `${a.hp > b.hp ? a.name : b.name} wins`;
    for (const f of match.fighters) {
      f.fallen = f.hp === 0 || f.hp < match.fighters.find(other => other !== f)!.hp;
      f.attack = 0; f.hurt = 0; f.y = 0; f.vy = 0; f.move = 0;
    }
  }
}
