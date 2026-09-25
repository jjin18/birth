'use client';
import { useEffect, useRef, useState } from 'react';
import { ARENA, CONTROLS, createMatch, poseFor, stepMatch, type Input, type Match } from '@/lib/fighter-game';
import { loadSprites, paintMatch, type Sprites } from '@/lib/fighter-sprites';

const gameCodes = new Set<string>(CONTROLS.flatMap(c => [c.left, c.right, c.jump, c.punch]));
export default function MiniFighter() {
  const canvas = useRef<HTMLCanvasElement>(null), arena = useRef<HTMLDivElement>(null);
  const keys = useRef(new Set<string>()), presses = useRef(new Set<string>());
  const pointers = useRef(new Map<number, string>()), sprites = useRef<Sprites | null>(null);
  const match = useRef<Match>(createMatch()), paused = useRef(false);
  const [view, setView] = useState({ phase: 'lobby', time: 60, hp: [100, 100], result: '', paused: false });
  const [assetState, setAssetState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  function clearInput() { keys.current.clear(); presses.current.clear(); pointers.current.clear(); }
  function publish() {
    const s = match.current;
    const next = { phase: s.phase, time: Math.ceil(s.time), hp: s.fighters.map(f => f.hp), result: s.result, paused: paused.current };
    setView(previous => previous.phase === next.phase && previous.time === next.time && previous.hp[0] === next.hp[0] && previous.hp[1] === next.hp[1] && previous.result === next.result && previous.paused === next.paused ? previous : next);
  }
  function start() {
    if (assetState !== 'ready') return;
    clearInput(); paused.current = false; match.current = createMatch('ready'); publish(); arena.current?.focus();
  }
  function resume() { clearInput(); paused.current = false; publish(); arena.current?.focus(); }

  useEffect(() => {
    let cancelled = false;
    setAssetState('loading');
    loadSprites().then(result => { if (!cancelled) { sprites.current = result; setAssetState('ready'); } }).catch(() => { if (!cancelled) setAssetState('error'); });
    return () => { cancelled = true; sprites.current = null; };
  }, [attempt]);

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (!gameCodes.has(event.code) || event.ctrlKey || event.metaKey || event.altKey) return;
      if (!['ready', 'fight'].includes(match.current.phase) || paused.current) return;
      event.preventDefault();
      if (!keys.current.has(event.code)) presses.current.add(event.code);
      keys.current.add(event.code);
    };
    const up = (event: KeyboardEvent) => { if (gameCodes.has(event.code)) { keys.current.delete(event.code); event.preventDefault(); } };
    const pause = () => { clearInput(); if (['ready', 'fight'].includes(match.current.phase)) { paused.current = true; publish(); } };
    const visibility = () => { if (document.hidden) pause(); };
    window.addEventListener('keydown', down); window.addEventListener('keyup', up); window.addEventListener('blur', pause);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      clearInput(); window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', pause);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, []);

  useEffect(() => {
    if (assetState !== 'ready') return;
    let frame = 0, last = 0, lastPublish = 0;
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const tick = (now: number) => {
      const s = match.current, dt = last ? Math.min((now - last) / 1000, .04) : 0; last = now;
      if (!paused.current) {
        const held = new Set([...keys.current, ...pointers.current.values()]);
        const inputs = CONTROLS.map(c => ({ left: held.has(c.left), right: held.has(c.right), jump: presses.current.has(c.jump), punch: held.has(c.punch) || presses.current.has(c.punch) })) as [Input, Input];
        stepMatch(s, inputs, dt);
      }
      presses.current.clear();
      const ctx = canvas.current?.getContext('2d');
      if (ctx && sprites.current) paintMatch(ctx, s, sprites.current, now, reducedMotion || paused.current);
      if (arena.current) {
        arena.current.dataset.phase = s.phase;
        arena.current.dataset.poses = s.fighters.map(f => poseFor(f, s.phase)).join(' ');
      }
      if (now - lastPublish > 100 || s.phase !== view.phase) { publish(); lastPublish = now; }
      // Static screens and paused games do not need a continuous render loop.
      if (!paused.current && ['ready', 'fight'].includes(s.phase)) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [assetState, view.phase, view.paused]);

  return <section className="fighter" aria-label="Two-player boxing">
    <div className="fighter-hud">
      <div><span>Jia <small>W A S D</small></span><meter aria-label="Jia health" min={0} max={100} value={view.hp[0]}/></div>
      <span className="fighter-timer" aria-label={`${view.time} seconds remaining`}>{view.time}</span>
      <div><span>Ryan <small>↑ ← ↓ →</small></span><meter aria-label="Ryan health" min={0} max={100} value={view.hp[1]}/></div>
    </div>
    <div className="fighter-arena" ref={arena} tabIndex={0} aria-label="Boxing arena. Jia uses A D to move, W to jump, S to punch. Ryan uses arrow keys to move and jump, down to punch.">
      <canvas ref={canvas} width={ARENA.width} height={ARENA.height} role="img" aria-label="Jia and Ryan boxing on a grey stage"/>
      {assetState === 'loading' && <div className="fighter-message" role="status">Loading fighters…</div>}
      {assetState === 'error' && <div className="fighter-message" role="alert"><p>Couldn’t load the fighters.</p><button className="fighter-button" onClick={() => setAttempt(n => n + 1)}>Try again</button></div>}
      {assetState === 'ready' && view.phase === 'ready' && <div className="fighter-ready" role="status">Ready</div>}
      {view.paused && <div className="fighter-message"><p>Paused</p><button className="fighter-button" onClick={resume}>Resume</button></div>}
    </div>
    <div className="fighter-match-bar">
      <span role="status" aria-live="polite">{view.result || (view.phase === 'lobby' ? 'Two players · One keyboard' : ' ')}</span>
      {(view.phase === 'lobby' || view.phase === 'finished') && <button className="fighter-button" disabled={assetState !== 'ready'} onClick={start}>{view.phase === 'finished' ? 'Rematch' : 'Start fight'}</button>}
    </div>
    <div className="fighter-controls">
      {CONTROLS.map(control => <div className="fighter-player-controls" key={control.name} role="group" aria-label={`${control.name} controls`}>
        <span>{control.name}</span>
        {(['left', 'right', 'jump', 'punch'] as const).map((action, i) => <button key={action} disabled={assetState !== 'ready' || !['ready', 'fight'].includes(view.phase) || view.paused} aria-label={`${control.name} ${action}`}
          onPointerDown={event => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); pointers.current.set(event.pointerId, control[action]); presses.current.add(control[action]); }}
          onPointerUp={event => pointers.current.delete(event.pointerId)} onPointerCancel={event => pointers.current.delete(event.pointerId)} onLostPointerCapture={event => pointers.current.delete(event.pointerId)}
        ><kbd>{control.labels[i]}</kbd><small>{action === 'left' ? 'Left' : action === 'right' ? 'Right' : action === 'jump' ? 'Jump' : 'Punch'}</small></button>)}
      </div>)}
    </div>
  </section>;
}
