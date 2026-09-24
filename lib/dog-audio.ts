// A short, locally synthesized double bark. Audio starts only from a user gesture.
let context: AudioContext | null = null;
let lastBark = -Infinity;

export async function playBark(): Promise<boolean> {
  const now = performance.now();
  if (now - lastBark < 650) return false;
  const Audio = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Audio) throw new Error('Sound is not supported by this browser.');
  context ??= new Audio();
  await context.resume();
  if (context.state !== 'running') throw new Error('Tap again to enable sound.');
  lastBark = now;

  const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * .64), context.sampleRate);
  const samples = buffer.getChannelData(0);
  for (const [start, duration, pitch] of [[0, .19, 170], [.29, .24, 145]]) {
    let phase = 0;
    let noise = 0;
    for (let i = 0; i < Math.floor(duration * context.sampleRate); i++) {
      const t = i / context.sampleRate;
      const u = t / duration;
      const envelope = Math.min(1, t / .009) * Math.pow(1 - u, 1.7);
      const frequency = pitch * (1.5 - .75 * u) * (1 + .035 * Math.sin(t * 140));
      phase += 2 * Math.PI * frequency / context.sampleRate;
      noise = .5 * noise + .5 * (Math.random() * 2 - 1);
      const voice = Math.sin(phase) + .5 * Math.sin(phase * 2.04) + .22 * Math.sin(phase * 4.07);
      samples[Math.floor(start * context.sampleRate) + i] = Math.tanh((voice * .6 + noise * 1.15) * 2) * envelope * .7;
    }
  }
  const source = context.createBufferSource();
  source.buffer = buffer;
  const filter = context.createBiquadFilter();
  filter.type = 'bandpass'; filter.frequency.value = 950; filter.Q.value = .55;
  const volume = context.createGain(); volume.gain.value = .43;
  source.connect(filter).connect(volume).connect(context.destination);
  source.onended = () => { source.disconnect(); filter.disconnect(); volume.disconnect(); };
  source.start();
  return true;
}
