import { Howl } from 'howler';

type SoundName = 'shuffle' | 'chip' | 'applause' | 'fold' | 'click' | 'coin' | 'win' | 'tick' | 'deal';

// ─── Procedural WAV synthesis — no external audio files needed ───────────────

function pcmToDataUrl(samples: Float32Array, sampleRate = 22050): string {
  const blockAlign = 2;
  const dataSize = samples.length * blockAlign;
  const buf = new ArrayBuffer(44 + dataSize);
  const v = new DataView(buf);
  const ws = (o: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  ws(0, 'RIFF'); v.setUint32(4, 36 + dataSize, true);
  ws(8, 'WAVE'); ws(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true);
  v.setUint16(22, 1, true); v.setUint32(24, sampleRate, true);
  v.setUint32(28, sampleRate * blockAlign, true); v.setUint16(32, blockAlign, true);
  v.setUint16(34, 16, true); ws(36, 'data'); v.setUint32(40, dataSize, true);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  const bytes = new Uint8Array(buf);
  let binary = '';
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return 'data:audio/wav;base64,' + btoa(binary);
}

const sr = 22050;
function buffer(dur: number): Float32Array { return new Float32Array(Math.floor(sr * dur)); }
function tone(out: Float32Array, freq: number, start: number, dur: number, vol: number, decay = 18) {
  const s0 = Math.floor(start * sr);
  const n = Math.floor(dur * sr);
  for (let i = 0; i < n && s0 + i < out.length; i++) {
    const t = i / sr;
    out[s0 + i] += Math.sin(2 * Math.PI * freq * t) * Math.exp(-t * decay) * vol;
  }
}

function makeShuffle() { const o = buffer(0.35); for (let i = 0; i < o.length; i++) { const t = i / sr; o[i] = (Math.random() * 2 - 1) * Math.exp(-t * 9) * (1 - Math.exp(-t * 80)) * 0.45; } return pcmToDataUrl(o); }
function makeChip() { const o = buffer(0.18); tone(o, 820, 0, 0.18, 0.5, 30); tone(o, 1300, 0, 0.18, 0.3, 30); tone(o, 2200, 0, 0.18, 0.15, 30); return pcmToDataUrl(o); }
function makeApplause() { const o = buffer(1.6); for (let i = 0; i < o.length; i++) { const t = i / sr; const env = Math.min(t * 4, 1) * Math.exp(-Math.max(0, t - 0.8) * 2.5); o[i] = (Math.random() * 2 - 1) * env * 0.4; } return pcmToDataUrl(o); }
function makeFold() { const o = buffer(0.28); for (let i = 0; i < o.length; i++) { const t = i / sr; const f = 700 * Math.exp(-t * 8) + 150; o[i] = (Math.sin(2 * Math.PI * f * t) * 0.5 + (Math.random() * 2 - 1) * 0.15) * Math.exp(-t * 10) * 0.5; } return pcmToDataUrl(o); }
function makeClick() { const o = buffer(0.08); tone(o, 520, 0, 0.05, 0.4, 40); tone(o, 880, 0, 0.04, 0.25, 50); return pcmToDataUrl(o); }
function makeCoin() { const o = buffer(0.26); tone(o, 988, 0, 0.26, 0.4, 14); tone(o, 1319, 0.02, 0.24, 0.35, 14); return pcmToDataUrl(o); }
function makeWin() { const o = buffer(1.0); const notes = [523, 659, 784, 1047]; notes.forEach((f, i) => { tone(o, f, i * 0.1, 0.6, 0.32, 6); tone(o, f * 2, i * 0.1, 0.4, 0.12, 8); }); return pcmToDataUrl(o); }
function makeTick() { const o = buffer(0.04); for (let i = 0; i < o.length; i++) { const t = i / sr; o[i] = (Math.random() * 2 - 1) * Math.exp(-t * 120) * 0.5; } tone(o, 1200, 0, 0.03, 0.3, 80); return pcmToDataUrl(o); }

class SoundManagerClass {
  private sounds = new Map<SoundName, Howl>();
  private muted = false;

  init() {
    const defs: [SoundName, () => string][] = [
      ['shuffle', makeShuffle], ['chip', makeChip], ['applause', makeApplause], ['fold', makeFold],
      ['click', makeClick], ['coin', makeCoin], ['win', makeWin], ['tick', makeTick], ['deal', makeShuffle],
    ];
    for (const [name, gen] of defs) {
      try { this.sounds.set(name, new Howl({ src: [gen()], format: ['wav'], volume: 0.5 })); } catch { /* audio blocked until gesture */ }
    }
  }

  play(name: SoundName, volume = 0.5) {
    if (this.muted) return;
    const h = this.sounds.get(name);
    if (h) { h.volume(volume); h.play(); }
  }

  toggleMute() { this.muted = !this.muted; return this.muted; }
  get isMuted() { return this.muted; }
}

export const SoundManager = new SoundManagerClass();
