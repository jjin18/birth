'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Plus, RotateCcw } from 'lucide-react';
import Modal from './Modal';
import { ROUND_MS, MAX_CHALLENGE_LENGTH, normalizeTypingChallenge, enterTypingText, expireTypingRun, freshTypingRun, typingPassages, typingStats, typingRating } from '@/lib/typing-game';
import { getTyping, addTypingChallenge, startTypingRound, finishTypingRound, type SharedChallenge, type TypingBest } from '@/lib/typing-api';
import '@/app/typing.css';

export default function TypingGame({ close }: { close: () => void }) {
  const [passageId, setPassageId] = useState<string>(typingPassages[0].id);
  const [run, setRun] = useState(freshTypingRun);
  const [now, setNow] = useState(0);
  const [notice, setNotice] = useState('');
  const [passages, setPassages] = useState<SharedChallenge[]>([...typingPassages]);
  const [best, setBest] = useState<TypingBest>(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const [addError, setAddError] = useState('');
  const [saving, setSaving] = useState(false);
  const mounted = useRef(false);
  const round = useRef<{promise:Promise<{id:string}|null>;submitted:boolean}|null>(null);
  const input = useRef<HTMLInputElement>(null);
  const prompt = useRef<HTMLDivElement>(null);
  const passage = passages.find(item => item.id === passageId) ?? passages[0];
  const done = run.finishedAt !== null;
  const stats = typingStats(run, passage.text, now);
  const rating = typingRating(stats.exactWpm, stats.exactAccuracy, run.startedAt !== null);
  const complete = run.text.length === passage.text.length;
  const hasErrors = run.text.split('').some((char, i) => char !== passage.text[i]);

  useEffect(() => {
    mounted.current = true;
    const refresh = () => { void getTyping().then(data => { if (mounted.current) { setPassages(data.challenges); setBest(data.best); } }).catch(() => { if (mounted.current) setNotice('Shared scores unavailable.'); }); };
    refresh();
    window.addEventListener('focus', refresh);
    return () => { mounted.current = false; window.removeEventListener('focus', refresh); };
  }, []);

  useEffect(() => {
    if (adding) return;
    const frame = requestAnimationFrame(() => input.current?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(frame);
  }, [adding]);

  useEffect(() => {
    if (run.startedAt === null || done) return;
    const timer = setInterval(() => {
      const time = performance.now();
      setNow(time);
      setRun(current => expireTypingRun(current, time));
    }, 100);
    return () => clearInterval(timer);
  }, [run.startedAt, done]);

  useEffect(() => {
    const ticket = round.current;
    if (!done || !ticket || ticket.submitted || run.startedAt === null || run.finishedAt === null) return;
    ticket.submitted = true;
    const result = { text: run.text, attempts: run.attempts, mistakes: run.mistakes, elapsed: run.finishedAt - run.startedAt };
    void ticket.promise.then(start => {
      if (!start) throw Error('Score not saved.');
      return finishTypingRound({ id: start.id, ...result });
    }).then(data => { if (mounted.current) setBest(data.best); }).catch(() => {
      if (mounted.current && round.current === ticket) setNotice('Score not saved.');
    });
  }, [done, run]);

  useEffect(() => {
    const box = prompt.current;
    const caret = box?.querySelector<HTMLElement>('.typing-current');
    if (!box || !caret) return;
    const bottom = caret.offsetTop + caret.offsetHeight;
    if (bottom > box.scrollTop + box.clientHeight - 12) box.scrollTop = bottom - box.clientHeight + 24;
    if (caret.offsetTop < box.scrollTop + 12) box.scrollTop = Math.max(0, caret.offsetTop - 24);
  }, [run.text, passageId]);

  function restart(id = passage.id) {
    setPassageId(id);
    round.current = null;
    setRun(freshTypingRun());
    setNow(0);
    setNotice('');
    if (prompt.current) prompt.current.scrollTop = 0;
    input.current?.focus({ preventScroll: true });
  }

  function type(text: string) {
    const time = performance.now();
    if (run.startedAt === null && text && !round.current) round.current = { promise: startTypingRound(passage.id, crypto.randomUUID()).catch(() => null), submitted: false };
    setNow(time);
    setNotice('');
    setRun(current => enterTypingText(current, text, passage.text, time));
  }

  async function addChallenge() {
    if (saving) return;
    const text = normalizeTypingChallenge(draft);
    if (!text) { setAddError('Add some text first.'); return; }
    if (text.length > MAX_CHALLENGE_LENGTH) { setAddError(`Keep it under ${MAX_CHALLENGE_LENGTH} characters.`); return; }
    setSaving(true); setAddError('');
    try {
      const data = await addTypingChallenge(text);
      if (!mounted.current) return;
      setPassages(data.challenges); setBest(data.best);
      restart(data.id); setAdding(false); setDraft('');
    } catch (error) { if (mounted.current) setAddError(error instanceof Error ? error.message : 'Could not save. Try again.'); }
    finally { if (mounted.current) setSaving(false); }
  }

  let offset = 0;
  return <Modal title="" eyebrow="Typing speedrun" ariaLabel="Typing speedrun" close={close} className="typing-panel" headerActions={<>
    <span className="typing-best" title="All-time best, shared across players">Best {best ? `${best.wpm} WPM` : '—'}</span>
    <div className="typing-controls" role="group" aria-label="Original typing stories">
      {typingPassages.slice(0, 2).map(item => <button key={item.id} type="button" className="typing-story" aria-pressed={!adding && passage.id === item.id} disabled={saving} onClick={() => { restart(item.id); setAdding(false); }}>{item.id === 'chud' ? 'Chud' : 'Chad'}</button>)}
      <button type="button" className="icon-button typing-add" aria-label="Add typing challenge" title="Add a shared challenge" aria-expanded={adding} disabled={saving} onClick={() => { restart(); setAdding(value => !value); setAddError(''); }}><Plus size={17}/></button>
    </div>
  </>}>
    {adding ? <form className="typing-add-form" onSubmit={event => { event.preventDefault(); addChallenge(); }}>
      <label className="typing-sr-only" htmlFor="typing-new-challenge">New typing challenge</label>
      <textarea id="typing-new-challenge" autoFocus placeholder="Add a challenge for everyone..." value={draft} maxLength={MAX_CHALLENGE_LENGTH} disabled={saving} onChange={event => { setDraft(event.target.value); setAddError(''); }} aria-describedby={addError ? 'typing-add-error' : undefined}/>
      {addError&&<p id="typing-add-error" className="typing-feedback" role="alert">{addError}</p>}
      <div className="typing-actions"><button type="button" className="secondary-button" disabled={saving} onClick={() => setAdding(false)}>Cancel</button><button type="submit" className="gold-button" disabled={saving || !draft.trim()}>{saving ? 'Saving...' : 'Add'}</button></div>
    </form> : <>
    <dl className="typing-stats">
      <div><dt>Time left</dt><dd className={done ? 'typing-time-complete' : undefined}>{done ? ((ROUND_MS - stats.elapsed) / 1000).toFixed(2) : stats.remaining}<small>s</small></dd></div>
      <div><dt>Speed</dt><dd>{stats.wpm}<small>WPM</small></dd></div>
      <div><dt>Accuracy</dt><dd>{stats.accuracy}<small>%</small></dd></div>
      <div title="Game score = min(correct WPM, 100) × (accuracy / 100)². Uses exact elapsed time and unrounded accuracy; displayed to two decimals."><dt>Rating</dt><dd className="typing-rating">{rating === null ? '—' : rating.toFixed(2)}<small>/100</small></dd></div>
    </dl>
    <p id="typing-instructions" className="typing-sr-only">Type the text below, including capitals and punctuation. The {ROUND_MS / 1000}-second timer starts with your first letter and stops when you reach the last character or time runs out. Backspace corrects mistakes before you finish.</p>
    <p id="typing-target" className="typing-sr-only">Text to type: {passage.text}</p>
    <div ref={prompt} className="typing-passage" aria-hidden="true">
      {passage.text.match(/\S+\s*/g)!.map((word, wordIndex) => <span className="typing-word" key={wordIndex}>{[...word].map(char => {
        const index = offset;
        offset += char.length;
        const state = index < run.text.length ? run.text.slice(index, index + char.length) === char ? 'typing-correct' : 'typing-wrong' : 'typing-pending';
        return <span key={index} className={`${state}${index === run.text.length && !done ? ' typing-current' : ''}`}>{char}</span>;
      })}</span>)}
    </div>
    <div className="typing-progress" role="progressbar" aria-label="Correct text" aria-valuenow={stats.progress} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${stats.progress}%` }}/></div>
    <label className="typing-sr-only" htmlFor="typing-input">Type the passage</label>
    <input ref={input} id="typing-input" type="text" value={run.text} onChange={event => type(event.target.value)} readOnly={done} maxLength={passage.text.length} aria-describedby="typing-instructions typing-target typing-feedback" autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} placeholder="Type to start..." onPaste={event => { event.preventDefault(); setNotice('Type it out!'); }} onDrop={event => event.preventDefault()}/>
    <div className="typing-footer">
      <p id="typing-feedback" className="typing-feedback" role="status">{notice || (done ? (complete ? (hasErrors ? 'Finished.' : 'Lore mastered.') : "Time's up!") : hasErrors ? 'Fix the red letters.' : '')}{done&&<span className="typing-sr-only"> {stats.wpm} words per minute, {stats.accuracy}% accuracy. Rating: {rating?.toFixed(2)} out of 100.</span>}</p>
      <div className="typing-actions"><button type="button" className="secondary-button" onClick={() => restart()}><RotateCcw size={14}/>Retry</button><button type="button" className="gold-button" onClick={() => restart(passages[(passages.findIndex(item => item.id === passage.id) + 1) % passages.length].id)}>Next text<ArrowRight size={14}/></button></div>
    </div>
    </>}
  </Modal>;
}
