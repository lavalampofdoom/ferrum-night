export class GameAudio {
  ctx: AudioContext | null = null;
  muted = false;

  unlock() {
    if (!this.ctx) {
      const C = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new C();
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }

  tone(freq: number, dur: number, type: OscillatorType = "square", gain = 0.05) {
    if (this.muted || !this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(this.ctx.destination);
    o.start(t);
    o.stop(t + dur);
  }

  hit() {
    this.tone(180, 0.08, "square", 0.06);
    this.tone(90, 0.12, "sawtooth", 0.03);
  }
  swing() {
    this.tone(420, 0.06, "triangle", 0.04);
  }
  pickup() {
    this.tone(660, 0.08, "square", 0.04);
    this.tone(880, 0.1, "square", 0.03);
  }
  groan() {
    this.tone(70, 0.35, "sawtooth", 0.025);
  }
  chop() {
    this.tone(140, 0.1, "square", 0.05);
  }
  door() {
    this.tone(220, 0.12, "triangle", 0.04);
  }
  craft() {
    this.tone(520, 0.08, "square", 0.04);
  }
  hurt() {
    this.tone(110, 0.18, "sawtooth", 0.07);
  }
  shoot() {
    this.tone(320, 0.05, "square", 0.06);
    this.tone(90, 0.1, "sawtooth", 0.04);
  }
}
