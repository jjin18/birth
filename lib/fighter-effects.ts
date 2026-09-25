import { ARENA, type Fighter, type Pose } from './fighter-game';

// Small, deterministic canvas paths: no particles to retain, images to load,
// random allocations, screen shake, or full-screen flashing.
export function paintMotion(ctx: CanvasRenderingContext2D, f: Fighter, pose: Pose, scale: number, now: number, reducedMotion: boolean, foreground = false) {
  if (pose === 'tpose') return;
  ctx.save();
  ctx.translate(f.x, ARENA.floor - f.y);
  ctx.scale(f.facing * scale, scale);
  ctx.lineCap = 'round';
  const curve = (x1:number,y1:number,cx:number,cy:number,x2:number,y2:number,width:number,color:string) => {
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath(); ctx.moveTo(x1,y1); ctx.quadraticCurveTo(cx,cy,x2,y2); ctx.stroke();
  };
  if (!foreground && pose === 'punch') {
    ctx.globalAlpha = reducedMotion ? .55 : Math.min(1, f.attack / .09);
    const sweep = reducedMotion ? 0 : (1 - f.attack / .26) * 15;
    curve(-80,-184,30,-252-sweep,150,-202,2.3,'#fff2decc');
    curve(-62,-207,41,-241-sweep,154,-197,1,'#fffaf3dd');
    curve(-54,-155,74,-124+sweep,145,-183,1.8,'#f7e5c8bb');
    curve(-12,-151,91,-144+sweep,151,-183, .8,'#fff9edcc');
    for (let i=0;i<3;i++) curve(-95-i*11,-175+i*11,-54,-180+i*11,11,-179+i*11,1.4-i*.3,'#fdf4dd80');
  }
  if (!foreground && (pose === 'jump' || f.y > 5)) {
    ctx.globalAlpha = reducedMotion ? .4 : .7;
    const sweep = reducedMotion ? 0 : Math.min(20, f.y * .12);
    curve(-81,22+sweep,-134,-83,-38,-178,2.2,'#fff0d7c9');
    curve(-98,15+sweep,-146,-81,-76,-137,1,'#fffaf1aa');
    curve(70,29+sweep,108,-40,64,-98,1.1,'#fff0d7a8');
    // Takeoff streaks stretch toward the floor instead of following the character.
    if (!reducedMotion && f.vy > 0) {
      ctx.globalAlpha = Math.max(0, 1 - f.y / 180) * .7;
      curve(-31,30,-43,65,-37,Math.min(f.y / scale,115),1.7,'#fff1d4b0');
      curve(27,34,43,72,52,Math.min(f.y / scale,110),1,'#fff1d490');
    }
  }
  if (!foreground && f.move && f.y === 0 && !f.hurt && !f.fallen) {
    ctx.globalAlpha = reducedMotion ? .25 : .45;
    const direction = f.move * f.facing;
    const slide = reducedMotion ? 0 : now * .08 % 14;
    for (let i=0;i<3;i++) curve(-direction*(48+slide),-8-i*9,-direction*78,-12-i*9,-direction*(101+i*9),-5-i*9,1.5-i*.3,'#f5e6cf9c');
  }
  if (foreground && pose === 'hurt') {
    const progress = reducedMotion ? .4 : Math.min(1, (1 - f.hurt / .3) * 1.5);
    const radius = 18 + progress * 28;
    ctx.translate(31,-145); ctx.globalAlpha = reducedMotion ? .55 : Math.min(1,f.hurt/.12);
    ctx.strokeStyle = '#fff0d5'; ctx.lineWidth = 1.5;
    for (let i=0;i<10;i++) {
      const angle = i * Math.PI / 5 + .18;
      const inner = radius * .55, outer = radius * (i%2 ? 1 : 1.25);
      ctx.beginPath(); ctx.moveTo(Math.cos(angle)*inner,Math.sin(angle)*inner); ctx.lineTo(Math.cos(angle)*outer,Math.sin(angle)*outer); ctx.stroke();
    }
    ctx.beginPath();
    for (let i=0;i<16;i++) { const angle=i*Math.PI/8, r=i%2?5:15; const x=Math.cos(angle)*r,y=Math.sin(angle)*r;if(!i)ctx.moveTo(x,y);else ctx.lineTo(x,y); }
    ctx.closePath(); ctx.fillStyle='#ffe7b7d9'; ctx.fill();
    ctx.strokeStyle='#ad493c';ctx.lineWidth=.9;ctx.stroke();
  }
  if (!foreground && pose === 'fall') {
    ctx.globalAlpha=.45;
    curve(-122,-9,-158,-73,-112,-116,1.5,'#fff0d2ba');
    curve(-137,-7,-167,-48,-153,-84,.8,'#fff7e5a0');
    curve(73,3,115,-5,137,2,1.4,'#ead6bdaa');
  }
  ctx.restore();
}
