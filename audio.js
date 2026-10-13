// Web Audio 합성 효과음/배경음 (에셋 파일 없음)
const PENTA = [0, 2, 4, 7, 9];
export class Sound {
  constructor() { this.ctx = null; this.bgm = true; this.sfx = true; this.vol = 0.6; this.started = false; this.step = 0; }
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    this.ctx = new AC(); this.master = this.ctx.createGain(); this.master.gain.value = this.vol; this.master.connect(this.ctx.destination);
    this.musicG = this.ctx.createGain(); this.musicG.gain.value = this.bgm ? 0.5 : 0; this.musicG.connect(this.master);
    this.sfxG = this.ctx.createGain(); this.sfxG.gain.value = this.sfx ? 0.8 : 0; this.sfxG.connect(this.master);
    // 약한 리버브 대용 딜레이
    this.delay = this.ctx.createDelay(1); this.delay.delayTime.value = 0.32; const fb = this.ctx.createGain(); fb.gain.value = 0.35;
    this.delay.connect(fb); fb.connect(this.delay); this.delay.connect(this.master);
    this.started = true; this.startMusic();
  }
  setVol(v) { this.vol = v; if (this.master) this.master.gain.value = v; }
  setBgm(on) { this.bgm = on; if (this.musicG) this.musicG.gain.value = on ? 0.5 : 0; }
  setSfx(on) { this.sfx = on; if (this.sfxG) this.sfxG.gain.value = on ? 0.8 : 0; }
  tone(freq, dur, type = 'sine', vol = 0.2, dest = null, when = 0, send = 0.3) {
    if (!this.ctx) return; const t = this.ctx.currentTime + when;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain(); o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest || this.sfxG); if (send) { const s = this.ctx.createGain(); s.gain.value = send; g.connect(s); s.connect(this.delay); }
    o.start(t); o.stop(t + dur + 0.05);
  }
  noteHz(deg, oct = 0) { const o = Math.floor(deg / 5), n = PENTA[((deg % 5) + 5) % 5]; return 261.63 * Math.pow(2, (n + 12 * (o + oct)) / 12); }
  click(combo = 1) { if (!this.ctx) return; this.tone(this.noteHz(Math.floor(Math.random() * 5), 1 + (combo > 1.5 ? 1 : 0)), 0.5, 'sine', 0.16); }
  coin() { this.tone(880, 0.25, 'triangle', 0.1); this.tone(1320, 0.3, 'sine', 0.08, null, 0.06); }
  bloom() { [0, 2, 4].forEach((d, i) => this.tone(this.noteHz(d + 5, 1), 0.7, 'sine', 0.12, null, i * 0.07)); }
  discover() { [0, 1, 2, 3, 4, 5, 7].forEach((d, i) => this.tone(this.noteHz(d + 5, 1), 0.9, 'triangle', 0.12, null, i * 0.09)); }
  buy() { this.tone(523, 0.18, 'square', 0.05); this.tone(784, 0.3, 'triangle', 0.1, null, 0.08); }
  err() { this.tone(160, 0.25, 'sawtooth', 0.07, null, 0, 0); }
  water() { if (!this.ctx) return; for (let i = 0; i < 4; i++) this.tone(900 + Math.random() * 600, 0.12, 'sine', 0.05, null, i * 0.05, 0.1); }
  magic() { [0, 2, 4, 7, 9].forEach((d, i) => this.tone(this.noteHz(d, 2) , 0.5, 'sine', 0.08, null, i * 0.05)); }
  weed() { this.tone(110, 0.5, 'sawtooth', 0.07, null, 0, 0); this.tone(98, 0.6, 'square', 0.04, null, 0.1, 0); }
  star() { this.tone(1568, 0.5, 'sine', 0.1); this.tone(2093, 0.6, 'sine', 0.07, null, 0.08); }
  active() { [0, 2, 4, 7].forEach((d, i) => this.tone(this.noteHz(d + 5, 0), 0.8, 'sine', 0.12, null, i * 0.08)); }
  startMusic() {
    const chords = [[0, 2, 4], [-1, 1, 3], [-3, 0, 2], [-2, 0, 3]];
    const loop = () => {
      if (!this.ctx) return;
      if (this.bgm) {
        const ch = chords[Math.floor(this.step / 8) % 4];
        if (this.step % 8 === 0) ch.forEach((d, i) => this.tone(this.noteHz(d - 5, 0), 7.5, 'sine', 0.07, this.musicG, i * 0.04, 0.4));
        if (Math.random() < 0.7) this.tone(this.noteHz(ch[Math.floor(Math.random() * 3)] + 5 * (1 + Math.floor(Math.random() * 2)), 0), 1.6, 'triangle', 0.05, this.musicG, 0, 0.5);
        this.step++;
      }
      this.timer = setTimeout(loop, 900);
    };
    loop();
  }
  night(on) { // 귀뚜라미 소리
    if (!this.ctx || !this.sfx || !on || Math.random() > 0.35) return;
    for (let i = 0; i < 3; i++) this.tone(4200, 0.04, 'square', 0.012, null, i * 0.07, 0);
  }
}
