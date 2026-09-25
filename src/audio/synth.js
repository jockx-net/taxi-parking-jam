// Procedural sound: the music loop and every effect are synthesised with the Web
// Audio API, so the game ships no audio files. All functions take an
// (Offline)AudioContext, a destination node and a start time, which lets them be
// rendered offline for checking.

const noiseBuffers = new WeakMap();

function noiseBuffer(ctx) {
  let buffer = noiseBuffers.get(ctx);
  if (!buffer) {
    buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    noiseBuffers.set(ctx, buffer);
  }
  return buffer;
}

function midiToHz(m) {
  return 440 * 2 ** ((m - 69) / 12);
}

// One enveloped oscillator note.
export function tone(ctx, dest, o) {
  const osc = ctx.createOscillator();
  osc.type = o.type ?? "sine";
  osc.frequency.setValueAtTime(o.freq, o.t);
  if (o.freqEnd) osc.frequency.exponentialRampToValueAtTime(o.freqEnd, o.t + o.dur);
  const gain = ctx.createGain();
  const attack = o.attack ?? 0.005;
  gain.gain.setValueAtTime(0.0001, o.t);
  gain.gain.linearRampToValueAtTime(o.gain ?? 0.2, o.t + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, o.t + o.dur);
  osc.connect(gain);
  let out = gain;
  if (o.lowpass) {
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(o.lowpass, o.t);
    if (o.lowpassEnd) filter.frequency.exponentialRampToValueAtTime(o.lowpassEnd, o.t + o.dur);
    gain.connect(filter);
    out = filter;
  }
  out.connect(dest);
  if (o.vibrato) {
    const lfo = ctx.createOscillator();
    lfo.frequency.value = o.vibrato.rate;
    const depth = ctx.createGain();
    depth.gain.value = o.vibrato.depth;
    lfo.connect(depth);
    depth.connect(osc.frequency);
    lfo.start(o.t);
    lfo.stop(o.t + o.dur + 0.05);
  }
  osc.start(o.t);
  osc.stop(o.t + o.dur + 0.05);
}

// One enveloped burst of filtered noise.
export function noise(ctx, dest, o) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx);
  src.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = o.type ?? "bandpass";
  filter.frequency.setValueAtTime(o.freq ?? 1000, o.t);
  if (o.freqEnd) filter.frequency.exponentialRampToValueAtTime(o.freqEnd, o.t + o.dur);
  filter.Q.value = o.q ?? 1;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, o.t);
  gain.gain.linearRampToValueAtTime(o.gain ?? 0.2, o.t + (o.attack ?? 0.003));
  gain.gain.exponentialRampToValueAtTime(0.0001, o.t + o.dur);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(dest);
  src.start(o.t, Math.random() * 0.5);
  src.stop(o.t + o.dur + 0.05);
}

// ---- sound effects ---------------------------------------------------------

export const SFX = {
  click(ctx, dest, t) {
    tone(ctx, dest, { type: "square", freq: 1100, freqEnd: 650, t, dur: 0.06, gain: 0.09, lowpass: 3500 });
    noise(ctx, dest, { t, dur: 0.02, gain: 0.05, type: "highpass", freq: 3000 });
  },

  select(ctx, dest, t) {
    tone(ctx, dest, { type: "triangle", freq: 620, freqEnd: 940, t, dur: 0.09, gain: 0.2 });
    tone(ctx, dest, { type: "sine", freq: 1240, t: t + 0.04, dur: 0.07, gain: 0.08 });
  },

  deny(ctx, dest, t) {
    tone(ctx, dest, { type: "sawtooth", freq: 170, freqEnd: 120, t, dur: 0.16, gain: 0.16, lowpass: 700 });
    tone(ctx, dest, { type: "sawtooth", freq: 158, freqEnd: 110, t: t + 0.13, dur: 0.16, gain: 0.16, lowpass: 700 });
  },

  engineStart(ctx, dest, t) {
    tone(ctx, dest, { type: "sawtooth", freq: 36, freqEnd: 92, t, dur: 0.7, gain: 0.3, attack: 0.05, lowpass: 240, lowpassEnd: 800, vibrato: { rate: 24, depth: 4 } });
    tone(ctx, dest, { type: "sawtooth", freq: 54, freqEnd: 138, t, dur: 0.7, gain: 0.12, attack: 0.05, lowpass: 400, lowpassEnd: 1000 });
    noise(ctx, dest, { t, dur: 0.55, gain: 0.07, type: "lowpass", freq: 300, freqEnd: 900, attack: 0.05 });
  },

  doorOpen(ctx, dest, t) {
    tone(ctx, dest, { type: "square", freq: 210, freqEnd: 150, t, dur: 0.05, gain: 0.12, lowpass: 900 }); // latch
    noise(ctx, dest, { t: t + 0.05, dur: 0.42, gain: 0.13, type: "bandpass", freq: 500, freqEnd: 2200, q: 2, attack: 0.04 }); // slide
    tone(ctx, dest, { type: "square", freq: 190, freqEnd: 140, t: t + 0.5, dur: 0.06, gain: 0.09, lowpass: 900 }); // end stop
  },

  doorSlam(ctx, dest, t) {
    noise(ctx, dest, { t, dur: 0.14, gain: 0.45, type: "lowpass", freq: 900, freqEnd: 180, attack: 0.002 });
    tone(ctx, dest, { type: "sine", freq: 150, freqEnd: 48, t, dur: 0.22, gain: 0.55, attack: 0.002 });
    noise(ctx, dest, { t, dur: 0.05, gain: 0.25, type: "highpass", freq: 2500, attack: 0.001 });
  },

  ding(ctx, dest, t) {
    tone(ctx, dest, { type: "sine", freq: 1568, t, dur: 1.1, gain: 0.3, attack: 0.002 });
    tone(ctx, dest, { type: "sine", freq: 3136, t, dur: 0.6, gain: 0.1, attack: 0.002 });
    tone(ctx, dest, { type: "sine", freq: 2349, t, dur: 0.8, gain: 0.07, attack: 0.002 });
  },

  footstep(ctx, dest, t) {
    const pitch = 0.85 + Math.random() * 0.3;
    noise(ctx, dest, { t, dur: 0.05, gain: 0.13, type: "bandpass", freq: 1500 * pitch, q: 0.9, attack: 0.001 });
    tone(ctx, dest, { type: "sine", freq: 190 * pitch, freqEnd: 90, t, dur: 0.06, gain: 0.09, attack: 0.001 });
  },

  pop(ctx, dest, t) {
    tone(ctx, dest, { type: "sine", freq: 520, freqEnd: 980, t, dur: 0.1, gain: 0.16, attack: 0.003 });
  },

  fanfare(ctx, out, t) {
    const dest = ctx.createGain(); // trim the whole flourish so the stacked notes don't clip
    dest.gain.value = 0.6;
    dest.connect(out);
    const run = [72, 76, 79, 84];
    run.forEach((m, i) => {
      const at = t + i * 0.13;
      tone(ctx, dest, { type: "square", freq: midiToHz(m), t: at, dur: 0.16, gain: 0.13, lowpass: 3800 });
      tone(ctx, dest, { type: "triangle", freq: midiToHz(m - 12), t: at, dur: 0.16, gain: 0.16 });
    });
    const chordAt = t + 0.56;
    [72, 76, 79, 84, 88].forEach((m) => {
      tone(ctx, dest, { type: "square", freq: midiToHz(m), t: chordAt, dur: 1.5, gain: 0.08, attack: 0.01, lowpass: 3200, vibrato: { rate: 6, depth: 4 } });
      tone(ctx, dest, { type: "triangle", freq: midiToHz(m - 12), t: chordAt, dur: 1.5, gain: 0.1, attack: 0.01 });
    });
    noise(ctx, dest, { t: chordAt, dur: 1.2, gain: 0.1, type: "highpass", freq: 6000, attack: 0.005 }); // cymbal
    tone(ctx, dest, { type: "sine", freq: 130, freqEnd: 55, t: chordAt, dur: 0.3, gain: 0.35 }); // kick
  },

  gameOver(ctx, dest, t) {
    // a sad trombone: wah wah wah wahhh
    const notes = [
      { f: 233, e: 220, at: 0, d: 0.4 },
      { f: 220, e: 208, at: 0.45, d: 0.4 },
      { f: 208, e: 196, at: 0.9, d: 0.4 },
      { f: 196, e: 156, at: 1.35, d: 1.3 },
    ];
    for (const n of notes) {
      const at = t + n.at;
      tone(ctx, dest, {
        type: "sawtooth",
        freq: n.f,
        freqEnd: n.e,
        t: at,
        dur: n.d,
        gain: 0.22,
        attack: 0.04,
        lowpass: 500,
        lowpassEnd: 1500,
        vibrato: n.d > 1 ? { rate: 5.5, depth: 6 } : null,
      });
    }
  },
};

// ---- music -----------------------------------------------------------------

export const BPM = 128;
export const BEAT = 60 / BPM;
export const BAR = BEAT * 4;
export const LOOP_BARS = 8;

// A bright, bouncy loop in C major: C  G  Am  F  C  G  F  G. Melody: eight
// eighth-notes per bar (MIDI numbers, null = rest).
const CHORDS = [
  { root: 48, tones: [60, 64, 67] }, // C
  { root: 43, tones: [59, 62, 67] }, // G
  { root: 45, tones: [57, 60, 64] }, // Am
  { root: 41, tones: [57, 60, 65] }, // F
  { root: 48, tones: [60, 64, 67] }, // C
  { root: 43, tones: [59, 62, 67] }, // G
  { root: 41, tones: [57, 60, 65] }, // F
  { root: 43, tones: [59, 62, 67] }, // G
];

const MELODY = [
  [76, null, 79, null, 76, 79, 84, null],
  [74, null, 79, null, 83, 79, 74, null],
  [72, null, 76, null, 81, null, 76, 72],
  [81, null, 84, null, 81, 77, null, 81],
  [76, 79, 84, null, 83, 79, 76, null],
  [74, null, 83, null, 79, null, 74, 79],
  [77, 81, 84, 81, 77, null, 81, 79],
  [83, null, 86, null, 79, null, 76, 79],
];

export function scheduleBar(ctx, dest, barIndex, t) {
  const bar = barIndex % LOOP_BARS;
  const chord = CHORDS[bar];
  const eighth = BEAT / 2;

  // melody
  MELODY[bar].forEach((m, i) => {
    if (m === null) return;
    const at = t + i * eighth;
    tone(ctx, dest, { type: "square", freq: midiToHz(m), t: at, dur: eighth * 1.6, gain: 0.05, attack: 0.008, lowpass: 3000 });
    tone(ctx, dest, { type: "triangle", freq: midiToHz(m), t: at, dur: eighth * 1.6, gain: 0.08, attack: 0.008 });
  });

  // plucky off-beat chords
  for (let i = 0; i < 8; i++) {
    if (i % 2 === 0) continue;
    const at = t + i * eighth;
    for (const m of chord.tones) tone(ctx, dest, { type: "square", freq: midiToHz(m - 12), t: at, dur: eighth * 0.8, gain: 0.018, lowpass: 1800 });
  }

  // bouncy bass: root on the beat, fifth on the "and" of two and four
  for (let beat = 0; beat < 4; beat++) {
    const at = t + beat * BEAT;
    const note = beat % 2 === 0 ? chord.root : chord.root + 7;
    tone(ctx, dest, { type: "triangle", freq: midiToHz(note), t: at, dur: BEAT * 0.8, gain: 0.2, attack: 0.006, lowpass: 600 });
  }

  // drums: kick on 1 and 3, snare on 2 and 4, hats on the off-beats
  for (let beat = 0; beat < 4; beat++) {
    const at = t + beat * BEAT;
    if (beat % 2 === 0) tone(ctx, dest, { type: "sine", freq: 120, freqEnd: 45, t: at, dur: 0.16, gain: 0.3, attack: 0.002 });
    else noise(ctx, dest, { t: at, dur: 0.12, gain: 0.09, type: "bandpass", freq: 1800, q: 0.8, attack: 0.002 });
    noise(ctx, dest, { t: at + eighth, dur: 0.04, gain: 0.04, type: "highpass", freq: 7000, attack: 0.001 });
  }
}
