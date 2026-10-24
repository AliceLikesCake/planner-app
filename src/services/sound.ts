// Sound effects (SPEC 4.1 "音效"). The AudioContext is created on the first call, which always
// comes from a tap, because iOS only allows audio that starts from a user gesture.
// Callers check the sound setting; these functions just play.

const BUBBLE = '/sounds/water-bubble.wav'
const GLITTER = '/sounds/fairy-glitter.wav'

let ctx: AudioContext | null = null
const buffers = new Map<string, Promise<AudioBuffer | null>>()

function audio(): AudioContext | null {
  if (!ctx) {
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    try {
      ctx = new AC()
    } catch {
      return null
    }
  }
  if (ctx.state === 'suspended') void ctx.resume().catch(() => {})
  return ctx
}

function load(c: AudioContext, url: string): Promise<AudioBuffer | null> {
  let pending = buffers.get(url)
  if (!pending) {
    pending = fetch(url)
      .then((r) => (r.ok ? r.arrayBuffer() : null))
      .then((raw) => (raw ? c.decodeAudioData(raw) : null))
      .catch(() => null)
    buffers.set(url, pending)
  }
  return pending
}

async function play(url: string, { rate = 1, at = 0, volume = 0.9 } = {}) {
  const c = audio()
  if (!c) return
  const buf = await load(c, url)
  if (!buf) return
  const src = c.createBufferSource()
  const gain = c.createGain()
  src.buffer = buf
  src.playbackRate.value = rate
  gain.gain.value = volume
  src.connect(gain)
  gain.connect(c.destination)
  src.start(c.currentTime + at)
}

/** A layer lands on the cake; `layer` counts from 1 and raises the pitch. */
export function playStack(layer: number) {
  return play(BUBBLE, { rate: Math.min(1.6, 0.9 + 0.06 * layer) })
}

/** Every task is done: the last bubble, then fairy glitter 0.18 s later. */
export function playAllDone() {
  return play(GLITTER, { at: 0.18, volume: 0.85 })
}

/** A habit bubble pops (SPEC 4.3). */
export function playPop() {
  return play(BUBBLE, { rate: 1.35 })
}

/** Un-completing a task: a synthesized falling "boing" (1.6f → 0.55f with a wobble, 0.3 s). */
export function playUndo(f = 420, dur = 0.3, volume = 0.16) {
  const c = audio()
  if (!c) return
  const t0 = c.currentTime
  const osc = c.createOscillator()
  const gain = c.createGain()
  const lfo = c.createOscillator()
  const depth = c.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(f * 1.6, t0)
  osc.frequency.exponentialRampToValueAtTime(f * 0.55, t0 + dur * 0.8)
  lfo.type = 'sine'
  lfo.frequency.setValueAtTime(16, t0)
  lfo.frequency.linearRampToValueAtTime(7, t0 + dur)
  depth.gain.setValueAtTime(f * 0.12, t0)
  depth.gain.exponentialRampToValueAtTime(f * 0.01, t0 + dur)
  lfo.connect(depth)
  depth.connect(osc.frequency)
  gain.gain.setValueAtTime(0.0001, t0)
  gain.gain.exponentialRampToValueAtTime(volume, t0 + 0.012)
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  osc.connect(gain)
  gain.connect(c.destination)
  osc.start(t0)
  lfo.start(t0)
  osc.stop(t0 + dur + 0.05)
  lfo.stop(t0 + dur + 0.05)
}

/** A short confirmation tone when sound is switched on. */
export function playSoundOn() {
  const c = audio()
  if (!c) return
  const t0 = c.currentTime
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(659, t0)
  gain.gain.setValueAtTime(0.0001, t0)
  gain.gain.exponentialRampToValueAtTime(0.12, t0 + 0.015)
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.15)
  osc.connect(gain)
  gain.connect(c.destination)
  osc.start(t0)
  osc.stop(t0 + 0.2)
}
