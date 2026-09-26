export const ROUND_MS = 60_000;
export const MAX_CHALLENGE_LENGTH = 400;

export function normalizeTypingChallenge(text: string) {
  return text.trim().replace(/\s+/g, ' ').replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"');
}


export const typingPassages = [
  { id: 'chud', label: 'Chud lore', text: 'Once upon a time there was a chud in a far away land in Alabama who moved to San Diego, then Providence, Rhode Island then San Francisco.' },
  { id: 'chad', label: 'Chad lore', text: 'Once upon a time there was a chad in a far away land in Canada who was born in Japan but then moved to OTTAWA. Memorize that city. Ottawa. Ottawa. Ottawa. Then moved to Vancouver, then San Francisco.' },
  { id: 'aura', label: 'Brain rot', text: 'Bro really said let him cook and then burned the entire kitchen. Negative aura. The group chat is in shambles. Chat, is this a canon event or am I just cooked?' },
  { id: 'side-quest', label: 'Brain rot', text: 'The sigma left the function to complete a side quest: acquire matcha, pet the dog, and touch grass. Generational aura. Immaculate rizz. Not a single thought behind those eyes.' },
  { id: 'ottawa', label: 'Brain rot', text: 'Chat, lock in. The city is Ottawa. Not Toronto. Not Ohio. Ottawa. Bro has the entire map unlocked and still cannot remember the lore. This is not a skill issue. This is a geography incident.' },
  { id: 'delulu', label: 'Brain rot', text: 'Delulu is the solulu. My dog is the CEO of yap, my keyboard has plot armor, and my last two brain cells are fighting for third place. We are so back. No cap. Respectfully, what is this lore?' },
] as const;

export type TypingRun = {
  text: string;
  attempts: number;
  mistakes: number;
  startedAt: number | null;
  finishedAt: number | null;
};

export function freshTypingRun(): TypingRun {
  return { text: '', attempts: 0, mistakes: 0, startedAt: null, finishedAt: null };
}

export function expireTypingRun(run: TypingRun, now: number): TypingRun {
  if (run.finishedAt !== null || run.startedAt === null || now < run.startedAt + ROUND_MS) return run;
  return { ...run, finishedAt: run.startedAt + ROUND_MS };
}

// Count newly entered characters, including replacements. Backspace does not
// erase earlier mistakes, so correcting a word cannot inflate accuracy.
export function enterTypingText(run: TypingRun, raw: string, target: string, now: number): TypingRun {
  const current = expireTypingRun(run, now);
  if (current.finishedAt !== null) return current;
  const text = raw.replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"').replace(/\u00a0/g, ' ').slice(0, target.length);
  if (text === current.text) return current;
  let prefix = 0, suffix = 0;
  while (prefix < text.length && prefix < current.text.length && text[prefix] === current.text[prefix]) prefix++;
  while (suffix < text.length - prefix && suffix < current.text.length - prefix && text[text.length - 1 - suffix] === current.text[current.text.length - 1 - suffix]) suffix++;
  let mistakes = current.mistakes;
  for (let i = prefix; i < text.length - suffix; i++) if (text[i] !== target[i]) mistakes++;
  return {
    text,
    attempts: current.attempts + text.length - prefix - suffix,
    mistakes,
    startedAt: current.startedAt ?? now,
    // Reaching the end finishes the test, even with earlier errors. Those
    // errors still count against accuracy and speed; the timer cannot run on.
    finishedAt: text.length === target.length ? now : null,
  };
}

export function typingStats(run: TypingRun, target: string, now: number) {
  const elapsed = run.startedAt === null ? 0 : Math.min(ROUND_MS, Math.max(0, (run.finishedAt ?? now) - run.startedAt));
  const correct = run.text.split('').reduce((total, char, index) => total + Number(char === target[index]), 0);
  const exactWpm = elapsed < 1000 && run.finishedAt === null ? 0 : (correct / 5) / (Math.max(1000, elapsed) / 60_000);
  const exactAccuracy = run.attempts ? (run.attempts - run.mistakes) / run.attempts * 100 : 100;
  return {
    elapsed,
    exactWpm,
    exactAccuracy,
    remaining: Math.max(0, Math.ceil((ROUND_MS - elapsed) / 1000)),
    wpm: Math.round(exactWpm),
    accuracy: Math.round(exactAccuracy),
    progress: Math.round(correct / target.length * 100),
    correct,
  };
}

// A game score, not a standardized typing assessment. 100 correct WPM at 100%
// accuracy earns 100. Cap speed BEFORE the accuracy penalty so extra speed
// cannot cancel mistakes. Use unrounded inputs; round only for display.
export function typingRating(wpm: number, accuracy: number, started: boolean) {
  if (!started) return null;
  return Math.min(100, Math.max(0, wpm)) * (Math.max(0, Math.min(100, accuracy)) / 100) ** 2;
}
