import { BAR, SFX, scheduleBar } from "./synth.js";

// Owns the Web Audio graph for the whole game: a looping music track, one-shot
// sound effects and a continuous engine hum that follows how many taxis move.
// Browsers keep audio locked until the first tap or key press; Phaser unlocks
// its context then and we start the music from that moment.
class GameAudio {
  constructor() {
    this.ctx = null;
    this.musicTimer = null;
    this.barIndex = 0;
    this.nextBarTime = 0;
    this.lastStep = 0;
    this.engine = null;
  }

  attach(sound) {
    if (this.ctx || !sound || !sound.context) return;
    this.ctx = sound.context;
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.8;
    this.master.connect(this.ctx.destination);
    this.music = this.ctx.createGain();
    this.music.gain.value = 0.55;
    this.music.connect(this.master);
    this.sfx = this.ctx.createGain();
    this.sfx.gain.value = 1;
    this.sfx.connect(this.master);

    // Browsers keep audio locked until the first tap or key press, so start the
    // music now if allowed and otherwise on the first gesture.
    const begin = () => {
      this.ctx.resume().then(() => {
        if (this.ready) {
          this.startMusic();
          for (const type of ["pointerdown", "keydown", "touchstart"]) window.removeEventListener(type, begin);
        }
      });
    };
    for (const type of ["pointerdown", "keydown", "touchstart"]) window.addEventListener(type, begin);
    begin();
  }

  get ready() {
    return !!this.ctx && this.ctx.state === "running";
  }

  play(name) {
    if (!this.ctx) return;
    if (!this.ready) {
      this.ctx.resume();
      return;
    }
    if (name === "footstep") {
      const now = this.ctx.currentTime;
      if (now - this.lastStep < 0.05) return; // a crowd of walkers is one soft patter
      this.lastStep = now;
    }
    SFX[name](this.ctx, this.sfx, this.ctx.currentTime + 0.005);
  }

  startMusic() {
    if (!this.ctx || this.musicTimer) return;
    this.ctx.resume();
    this.nextBarTime = this.ctx.currentTime + 0.1;
    const pump = () => {
      if (!this.ready) return;
      const now = this.ctx.currentTime;
      if (this.nextBarTime < now) this.nextBarTime = now + 0.05; // fell behind (e.g. hidden tab)
      while (this.nextBarTime < now + 0.7) {
        scheduleBar(this.ctx, this.music, this.barIndex++, this.nextBarTime);
        this.nextBarTime += BAR;
      }
    };
    pump();
    this.musicTimer = setInterval(pump, 150);
  }

  // Continuous engine hum: louder and slightly higher with more taxis moving.
  setTraffic(moving) {
    if (!this.ready) return;
    if (!this.engine) this.engine = this.buildEngine();
    const now = this.ctx.currentTime;
    const level = moving > 0 ? Math.min(0.1, 0.03 + 0.012 * moving) : 0;
    this.engine.gain.gain.setTargetAtTime(level, now, 0.2);
    const base = 48 + 3 * Math.min(moving, 6);
    this.engine.low.frequency.setTargetAtTime(base, now, 0.3);
    this.engine.high.frequency.setTargetAtTime(base * 1.5, now, 0.3);
  }

  buildEngine() {
    const ctx = this.ctx;
    const low = ctx.createOscillator();
    low.type = "sawtooth";
    low.frequency.value = 48;
    const high = ctx.createOscillator();
    high.type = "sawtooth";
    high.frequency.value = 72;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 260;
    const rumble = ctx.createGain();
    rumble.gain.value = 0.7;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 11;
    const lfoDepth = ctx.createGain();
    lfoDepth.gain.value = 0.3;
    lfo.connect(lfoDepth);
    lfoDepth.connect(rumble.gain);
    const gain = ctx.createGain();
    gain.gain.value = 0;
    low.connect(filter);
    high.connect(filter);
    filter.connect(rumble);
    rumble.connect(gain);
    gain.connect(this.sfx);
    for (const node of [low, high, lfo]) node.start();
    return { low, high, gain };
  }
}

export const audio = new GameAudio();
