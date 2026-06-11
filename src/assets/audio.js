/* ============================================================
   audio.js — in-browser beat engine. No audio files, no
   licensing: every groove is synthesised with Web Audio at the
   exact BPM band the exercise calls for (bands A–E).
   Public API on window.PipAudio:
     ensure()                       create/resume context (on a gesture)
     start(band, bpm, opts)         opts: {freeze, onFreeze, onUnfreeze}
     stop()
     setVolume(0..1)
     state  {playing, band, bpm}
   ============================================================ */
window.PipAudio = (function () {
  let ctx = null, master = null, noiseBuf = null;
  let timer = null;
  let step = 0;                 // 16th-note counter within a bar (0..15)
  let nextTime = 0;
  let spb = 0.5;                // seconds per beat
  const LOOK = 0.025, AHEAD = 0.12;
  let band = "C";
  let freezeMode = false, frozen = false, unfreezeAt = 0, barsLeft = 3;
  let sfxId = null, barCount = 0;
  let cb = {};
  const state = { playing: false, band: "C", bpm: 110 };

  function ensure() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = 0.55;
      // warm master chain: lowpass takes off the synthetic top end, the
      // compressor glues, and a small synthesized room stops the dry
      // oscillator "chiptune" feel. master → lp → comp → out, with a
      // pre-lowpass reverb send (highpassed so the kick stays clean).
      const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 8200; lp.Q.value = 0.4;
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -18; comp.knee.value = 22; comp.ratio.value = 4;
      comp.attack.value = 0.004; comp.release.value = 0.18;
      master.connect(lp); lp.connect(comp); comp.connect(ctx.destination);
      const ir = ctx.createBuffer(2, ctx.sampleRate * 1.6, ctx.sampleRate);
      for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c);
        for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2.4);
      }
      const verb = ctx.createConvolver(); verb.buffer = ir;
      const vhp = ctx.createBiquadFilter(); vhp.type = "highpass"; vhp.frequency.value = 260;
      const vg = ctx.createGain(); vg.gain.value = 0.16;
      master.connect(vhp); vhp.connect(verb); verb.connect(vg); vg.connect(comp);
      // one shared noise buffer
      const n = ctx.sampleRate * 1;
      noiseBuf = ctx.createBuffer(1, n, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function setVolume(v) { if (master) master.gain.value = Math.max(0, Math.min(1, v)); }

  // ---- instruments (warm / acoustic-leaning, no raw square or saw) ----
  function kick(t, gain = 1) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(118, t);
    o.frequency.exponentialRampToValueAtTime(44, t + 0.11);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.85 * gain, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.17);
    o.connect(g).connect(master); o.start(t); o.stop(t + 0.19);
  }
  function noise(t, dur, hp, gain) {
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = "highpass"; f.frequency.value = hp;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(master); s.start(t); s.stop(t + dur + 0.02);
  }
  // shaker: a soft band-limited "chick" — replaces the harsh hi-hat
  function shaker(t, gain = 0.12) {
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 5400; f.Q.value = 1.1;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.055);
    s.connect(f).connect(g).connect(master); s.start(t); s.stop(t + 0.08);
  }
  const hat = shaker;
  // real-clap character: three micro-bursts through a bandpass
  function clap(t, gain = 0.5) {
    for (const [dt, k] of [[0, 0.6], [0.012, 0.8], [0.026, 1]]) {
      const s = ctx.createBufferSource(); s.buffer = noiseBuf;
      const f = ctx.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 1500; f.Q.value = 0.8;
      const g = ctx.createGain();
      g.gain.setValueAtTime(gain * k * 0.8, t + dt);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dt + (k === 1 ? 0.16 : 0.03));
      s.connect(f).connect(g).connect(master); s.start(t + dt); s.stop(t + dt + 0.2);
    }
  }
  function tone(t, freq, dur, gain, type = "triangle") {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(master); o.start(t); o.stop(t + dur + 0.02);
  }
  // kalimba: warm music-box pluck — sine fundamental + two fast-dying partials
  function kalimba(t, freq, gain = 0.2) {
    for (const [mul, k, dec] of [[1, 1, 0.55], [3.03, 0.28, 0.07], [6.21, 0.12, 0.03]]) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "sine"; o.frequency.value = freq * mul;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(gain * k, t + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dec);
      o.connect(g).connect(master); o.start(t); o.stop(t + dec + 0.03);
    }
  }
  // pluck: a soft "string" — triangle through a fast-closing lowpass
  function pluck(t, freq, gain = 0.3, dec = 0.3) {
    const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = "triangle"; o.frequency.value = freq;
    f.type = "lowpass"; f.Q.value = 0.7;
    f.frequency.setValueAtTime(Math.min(freq * 7, 4200), t);
    f.frequency.exponentialRampToValueAtTime(Math.max(freq * 1.6, 120), t + 0.12);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dec);
    o.connect(f).connect(g).connect(master); o.start(t); o.stop(t + dec + 0.03);
  }
  // strum: a chord rolled on the kalimba (12 ms between strings)
  function strum(t, freqs, gain = 0.1) { freqs.forEach((f, i) => kalimba(t + i * 0.012, f, gain)); }
  // pad: three softly-detuned triangles behind a lowpass — warm chord bed
  function pad(t, freqs, dur, gain = 0.05) {
    const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 950; f.Q.value = 0.4;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + dur * 0.35);
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    f.connect(g); g.connect(master);
    for (const fr of freqs) for (const det of [0.9965, 1.0035]) {
      const o = ctx.createOscillator(); o.type = "triangle"; o.frequency.value = fr * det;
      o.connect(f); o.start(t); o.stop(t + dur + 0.02);
    }
  }
  // soft two-partial tick (replaces the square-wave woodblock)
  function woodblock(t, freq = 900, gain = 0.3) {
    tone(t, freq, 0.045, gain * 0.8, "sine"); tone(t, freq * 2.4, 0.025, gain * 0.3, "sine");
  }
  function bell(t, freq, gain = 0.2) { kalimba(t, freq, gain); }

  // ---- character SFX (movement sounds) ------------------------------
  // boing: springy pitch-up — the take-off of a jump/hop
  function boing(t, gain = 0.5) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(180, t);
    o.frequency.exponentialRampToValueAtTime(620, t + 0.18);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
    o.connect(g).connect(master); o.start(t); o.stop(t + 0.26);
  }
  // thud: soft padded landing — low body + a little floor noise
  function thud(t, gain = 0.7) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(120, t);
    o.frequency.exponentialRampToValueAtTime(60, t + 0.1);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    o.connect(g).connect(master); o.start(t); o.stop(t + 0.18);
    noise(t, 0.09, 320, gain * 0.5);
  }
  // stomp: heavier foot than thud — for the body drum
  function stomp(t, gain = 0.8) { thud(t, gain); noise(t, 0.05, 180, gain * 0.4); }
  // pat: muffled thigh-pat — mid noise burst
  function pat(t, gain = 0.4) { noise(t, 0.08, 600, gain); }
  // whoosh: a swept arm — filtered noise rising then falling
  function whoosh(t, gain = 0.3) {
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = "bandpass"; f.Q.value = 1.2;
    f.frequency.setValueAtTime(500, t);
    f.frequency.exponentialRampToValueAtTime(2400, t + 0.18);
    f.frequency.exponentialRampToValueAtTime(500, t + 0.36);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.12);
    g.gain.linearRampToValueAtTime(0.0001, t + 0.36);
    s.connect(f).connect(g).connect(master); s.start(t); s.stop(t + 0.4);
  }
  // breath chime: a soft glassy note (rise = in, fall = out)
  function breathChime(t, up, gain = 0.16) {
    const o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain();
    o.type = "sine"; o2.type = "sine";
    const f0 = up ? 392 : 523.25, f1 = up ? 523.25 : 392;
    o.frequency.setValueAtTime(f0, t); o.frequency.linearRampToValueAtTime(f1, t + 1.4);
    o2.frequency.setValueAtTime(f0 * 2, t); o2.frequency.linearRampToValueAtTime(f1 * 2, t + 1.4);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.5);
    g.gain.linearRampToValueAtTime(0.0001, t + 1.7);
    o.connect(g); o2.connect(g); g.connect(master);
    o.start(t); o2.start(t); o.stop(t + 1.8); o2.stop(t + 1.8);
  }

  // ---- harmony: a 4-bar C-major loop per band ------------------------
  // chord = {root: bass Hz, tones: [3 chord tones around C4]}
  const CHORDS = {
    C:  { root: 65.41, tones: [261.63, 329.63, 392.00] },
    G:  { root: 98.00, tones: [246.94, 293.66, 392.00] },
    Am: { root: 55.00, tones: [220.00, 261.63, 329.63] },
    F:  { root: 87.31, tones: [220.00, 261.63, 349.23] },
  };
  const PROG = {
    A: ["C", "Am", "F", "C"],
    B: ["C", "F", "C", "G"],
    C: ["C", "Am", "F", "G"],
    D: ["C", "G", "Am", "F"],
    E: ["C", "C", "F", "G"],
  };
  // 2-bar melodic riffs: step (0..31) → [chord-tone index, octave mult]
  const RIFFS = {
    B: { 0: [0, 1], 4: [1, 1], 8: [2, 1], 12: [1, 1], 16: [2, 1], 22: [1, 1], 26: [0, 1] },
    C: { 0: [0, 1], 3: [1, 1], 6: [2, 1], 10: [1, 1], 12: [2, 1], 16: [1, 1], 19: [2, 1], 24: [0, 2], 28: [2, 1] },
    D: { 0: [0, 2], 4: [2, 1], 8: [1, 2], 12: [2, 1], 16: [0, 2], 20: [2, 1], 24: [2, 2], 26: [1, 2], 28: [0, 2] },
  };

  // ---- per-band groove: called each 16th step -----------------------
  // barCount is incremented at s===0 BEFORE this runs, so the whole bar
  // sees one stable chord. Freeze pauses bars without breaking the loop.
  function groove(t, s) {
    const beat = s % 4 === 0;            // quarter-note
    const onB = Math.floor(s / 4);       // which beat (0..3)
    const bar = Math.max(0, barCount - 1);
    const ch = CHORDS[(PROG[band] || PROG.C)[bar % 4]];
    const riff = RIFFS[band];
    const rn = riff && riff[(bar % 2) * 16 + s];
    switch (band) {
      case "A": // calm — slow chord bed + a gentle kalimba arpeggio, no drums
        if (s === 0) pad(t, ch.tones.map((f) => f / 2), spb * 4.4, 0.06);
        if (beat && onB < 3) kalimba(t, ch.tones[[0, 1, 2][onB]], 0.11);
        if (s === 14) kalimba(t, ch.tones[1] / 2, 0.07);
        break;
      case "B": // steady march — walking feel, rim on the off-beats
        if (onB === 0 || onB === 2) kick(t, 0.8);
        if (onB === 1 || onB === 3) woodblock(t, 1700, 0.28);
        if (s % 2 === 0) shaker(t, beat ? 0.1 : 0.06);
        if (s === 0) pluck(t, ch.root, 0.34, 0.4);
        if (s === 8) pluck(t, ch.root * 1.5, 0.26, 0.35);
        if (s === 4 || s === 12) strum(t, ch.tones, 0.06);
        if (rn) kalimba(t, ch.tones[rn[0]] * rn[1], 0.13);
        break;
      case "C": { // moderate bounce — light swing, playful kalimba
        const sw = s % 2 === 1 ? spb * 0.09 : 0;     // swung 16ths
        if (onB === 0 || onB === 2) kick(t, 0.8);
        if (onB === 1 || onB === 3) woodblock(t + sw, 1500, 0.24);
        if (s % 2 === 0) shaker(t, beat ? 0.11 : 0.06); else shaker(t + sw, 0.045);
        if (s === 0) pluck(t, ch.root, 0.36, 0.42);
        if (s === 8) pluck(t, ch.root * 1.5, 0.24, 0.3);
        if (s === 14) pluck(t + sw, ch.root * 2, 0.16, 0.18);
        if (rn) kalimba(t + sw, ch.tones[rn[0]] * rn[1], 0.14);
        break;
      }
      case "D": // high energy — four-on-the-floor, driving octave bass
        if (beat) kick(t, 0.9);
        if (onB === 1 || onB === 3) clap(t, 0.4);
        if (s % 2 === 0) shaker(t, s % 4 === 2 ? 0.13 : 0.07);
        if (s % 4 === 2) pluck(t, ch.root * (onB % 2 ? 2 : 1), 0.26, 0.2);
        if (s === 0) pluck(t, ch.root, 0.34, 0.3);
        if (rn) pluck(t, ch.tones[rn[0]] * rn[1] * 2, 0.12, 0.16);
        break;
      case "E": // rhythm-led — big clear pulse, the beat IS the game
        if (beat) { kick(t, 0.95); clap(t, 0.45); }
        if (s % 4 === 2) shaker(t, 0.12);
        if (s === 0) pluck(t, ch.root, 0.3, 0.5);
        break;
    }
  }

  // ---- per-exercise SFX overlay; return true to play SOLO (skip groove) ----
  function sfxStep(t, s) {
    if (!sfxId) return false;
    const onB = Math.floor(s / 4), beat = s % 4 === 0;
    switch (sfxId) {
      case "kanga": case "starjump":   // one big jump per bar
        if (s === 0) boing(t, 0.5);
        if (s === 10) thud(t, 0.6);
        return false;
      case "jacks":                    // two lighter hops per bar
        if (s === 0 || s === 8) boing(t, 0.3);
        if (s === 5 || s === 13) thud(t, 0.4);
        return false;
      case "flamingo":                 // light hop on every beat
        if (beat) boing(t, 0.28);
        return false;
      case "drum":                     // STOMP STOMP CLAP PAT — clean, solo
        if (beat) hat(t, 0.09);
        if (onB === 0 || onB === 1) { if (beat) stomp(t, 0.72); }
        else if (onB === 2) { if (beat) clap(t, 0.6); }
        else { if (beat) pat(t, 0.5); }
        return true;
      case "clap":                     // crisp extra claps on the beat
        if (beat) clap(t, 0.4);
        return false;
      case "windmill":                 // arm swoosh down to each foot
        if (s === 4 || s === 12) whoosh(t, 0.26);
        return false;
      case "beaktalk":                 // a soft tick as the beaks take turns
        if (s === 0 || s === 8) woodblock(t, 660, 0.13);
        return false;
      case "tightrope":                // heel-toe step ticks
        if (s === 0 || s === 8) woodblock(t, 520, 0.16);
        return false;
      case "bear": case "crab": case "inch":   // soft padded steps
        if (s === 2 || s === 10) woodblock(t, 600, 0.15);
        return false;
      case "breathe":                  // slow inhale/exhale chime, one per bar
        if (s === 0) breathChime(t, barCount % 2 === 0);
        return true;
    }
    return false;
  }

  function playStep(t, s) {
    if (s === 0) barCount++;   // bump first so the whole bar shares one chord
    const solo = sfxStep(t, s);
    if (!solo) groove(t, s);
  }

  function schedule() {
    while (nextTime < ctx.currentTime + AHEAD) {
      if (freezeMode) {
        if (frozen) {
          if (ctx.currentTime >= unfreezeAt) {
            frozen = false; barsLeft = 2 + Math.floor(Math.random() * 4);
            cb.onUnfreeze && cb.onUnfreeze();
          }
        } else {
          playStep(nextTime, step);
        }
        // advance + handle bar boundary for freeze trigger
        step = (step + 1) % 16;
        if (step === 0 && !frozen) {
          barsLeft--;
          if (barsLeft <= 0) {
            frozen = true;
            unfreezeAt = nextTime + 1.4 + Math.random() * 1.8;
            cb.onFreeze && cb.onFreeze();
          }
        }
      } else {
        playStep(nextTime, step);
        step = (step + 1) % 16;
      }
      nextTime += spb / 4;   // 16th note
    }
  }

  function start(b, bpm, opts) {
    ensure();
    stop();
    band = b || "C";
    state.band = band; state.bpm = bpm; state.playing = true;
    spb = 60 / (bpm || 110);
    step = 0; barCount = 0; nextTime = ctx.currentTime + 0.06;
    opts = opts || {};
    sfxId = opts.sfx || null;
    freezeMode = !!opts.freeze; frozen = false;
    barsLeft = 2 + Math.floor(Math.random() * 3);
    cb = { onFreeze: opts.onFreeze, onUnfreeze: opts.onUnfreeze };
    timer = setInterval(schedule, LOOK * 1000);
  }

  function stop() {
    if (timer) { clearInterval(timer); timer = null; }
    state.playing = false; frozen = false; freezeMode = false;
  }

  // ---- one-shot sound effects (phase-synced cues for the Clever Hands moves) ----
  function sfx(name) {
    if (!ctx) return;
    const t = ctx.currentTime + 0.01;
    switch (name) {
      case "tap":    tone(t, 880, 0.09, 0.3, "triangle"); tone(t + 0.005, 1320, 0.06, 0.16, "sine"); break;
      case "clap":   clap(t, 0.6); break;
      case "whoosh": noise(t, 0.18, 500, 0.18); tone(t, 300, 0.16, 0.12, "sine"); break;
      case "trace":  tone(t, 520, 0.5, 0.14, "sine"); break;
      case "chime":  bell(t, 660, 0.22); bell(t + 0.18, 880, 0.18); break;
    }
  }

  return { ensure, start, stop, setVolume, sfx, state };
})();
