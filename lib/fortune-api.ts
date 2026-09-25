import { fortunes, fortunePoolSize, fortuneKindForOpening, type SavedFortune } from './fortunes';

type Collection = { fortunes: SavedFortune[]; total: number };
type Opening = { fortune?: SavedFortune; exhausted?: boolean; total: number };
const unavailable = 'The paper clip could not be reached. Please try again; this opening will not use a second fortune.';
const signIn = 'The paper clip is unavailable on this address. Please reopen the apartment and try again.';

class FortuneRequestError extends Error {
  constructor(message: string, readonly retryable = false) { super(message); }
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function savedFortune(value: unknown): value is SavedFortune {
  return record(value) && Number.isInteger(value.id) && (value.id as number) >= 0 &&
    (value.id as number) < fortunes.length && typeof value.openedAt === 'string' && Number.isFinite(Date.parse(value.openedAt));
}
function collection(value: unknown): value is Collection {
  return record(value) && value.total === fortunePoolSize && Array.isArray(value.fortunes) &&
    value.fortunes.length <= fortunes.length && value.fortunes.every(savedFortune) &&
    new Set(value.fortunes.map(note => note.id)).size === value.fortunes.length;
}
function opening(value: unknown): value is Opening {
  return record(value) && value.total === fortunePoolSize &&
    ((savedFortune(value.fortune) && !value.exhausted) || (value.exhausted === true && value.fortune === undefined));
}

async function readResult<T>(response: Response, valid: (data: unknown) => data is T): Promise<T> {
  // A sign-in redirect, empty proxy error, or truncated body isn't an API
  // object. Never leak JSON parser errors or interpret it as an empty archive.
  if (response.status === 401 || response.redirected) throw new FortuneRequestError(signIn);
  if (response.status === 403) throw new FortuneRequestError('Please reopen the apartment and try again.');
  const retryable = response.ok || response.status === 408 || response.status === 429 || response.status >= 500;
  const text = await response.text();
  const contentType = response.headers.get('content-type') || '';
  let data: unknown;
  if (text.trim() && /application\/(?:[\w.+-]+\+)?json\b/i.test(contentType)) {
    try { data = JSON.parse(text); } catch { /* Handled as an invalid response below. */ }
  }
  if (!response.ok) {
    const message = record(data) && typeof data.error === 'string' ? data.error : unavailable;
    throw new FortuneRequestError(message, retryable);
  }
  if (!valid(data)) throw new FortuneRequestError(unavailable, true);
  return data;
}

async function request<T>(init: RequestInit, valid: (data: unknown) => data is T): Promise<T> {
  // POST retries deliberately reuse init.body/requestId. The database's
  // unique request ID returns the same saved note even if a reply was lost.
  for (let attempt = 0; attempt < 3; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    let failure: FortuneRequestError;
    try {
      const response = await fetch('/api/fortunes', {
        ...init, credentials: 'same-origin', cache: 'no-store', signal: controller.signal,
        headers: { Accept: 'application/json', ...init.headers },
      });
      return await readResult(response, valid);
    } catch (error) {
      failure = error instanceof FortuneRequestError ? error : new FortuneRequestError(unavailable, true);
    } finally { clearTimeout(timeout); }
    if (!failure.retryable || attempt === 2) throw failure;
    await new Promise(resolve => setTimeout(resolve, attempt === 0 ? 250 : 750));
  }
  throw new FortuneRequestError(unavailable);
}

export function getFortunes() { return request({ method: 'GET' }, collection); }
// A fresh page visit starts a new rhythm. Retries/duplicate mounts do not count
// as extra cookies; the second successful opening requests an inside joke.
const openedThisVisit=new Set<string>();
const pendingOpenings=new Map<string,Promise<Opening>>();
export function openFortune(requestId: string) {
  const pending=pendingOpenings.get(requestId);if(pending)return pending;
  const kind=fortuneKindForOpening(openedThisVisit.size+1);
  const result=request({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requestId,kind }) }, opening)
   .then(data=>{if(data.fortune)openedThisVisit.add(requestId);return data})
   .finally(()=>pendingOpenings.delete(requestId));
  pendingOpenings.set(requestId,result);return result;
}
