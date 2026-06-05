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
      master.gain.value = 0.5;
      master.connect(ctx.destination);
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

  // ---- instruments -------------------------------------------------
  function kick(t, gain = 1) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(48, t + 0.12);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.9 * gain, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    o.connect(g).connect(master); o.start(t); o.stop(t + 0.2);
  }
  function noise(t, dur, hp, gain) {
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = "highpass"; f.frequency.value = hp;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(master); s.start(t); s.stop(t + dur + 0.02);
  }
  function clap(t, gain = 0.5) { noise(t, 0.13, 1100, gain); }
  function hat(t, gain = 0.18) { noise(t, 0.04, 7000, gain); }
  function tone(t, freq, dur, gain, type = "triangle") {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(master); o.start(t); o.stop(t + dur + 0.02);
  }
  function pad(t, freq, dur, gain = 0.16) {
    const o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain();
    o.type = "sine"; o2.type = "sine"; o.frequency.value = freq; o2.frequency.value = freq * 2.001;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + dur * 0.4);
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    o.connect(g); o2.connect(g); g.connect(master);
    o.start(t); o2.start(t); o.stop(t + dur); o2.stop(t + dur);
  }
  function woodblock(t, freq = 900, gain = 0.3) { tone(t, freq, 0.06, gain, "square"); }
  function bell(t, freq, gain = 0.2) { tone(t, freq, 0.35, gain, "triangle"); }

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

  // pentatonic-ish note pools (Hz)
  const PENTA = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25];
  const CALM  = [261.63, 329.63, 392.0, 523.25, 392.0, 329.63]; // gentle arpeggio loop

  // ---- per-band groove: called each 16th step -----------------------
  function groove(t, s) {
    const beat = s % 4 === 0;            // quarter-note
    const onB = Math.floor(s / 4);       // which beat (0..3)
    switch (band) {
      case "A": // calm — soft arpeggio, no drums
        if (s % 8 === 0) pad(t, CALM[(onB) % CALM.length] / 2, spb * 2.2, 0.12);
        if (beat) bell(t, CALM[onB % CALM.length], 0.10);
        break;
      case "B": // steady march
        if (onB === 0 || onB === 2) kick(t, 0.95);
        if (onB === 1 || onB === 3) clap(t, 0.4);
        if (s % 2 === 0) hat(t, 0.10);
        if (s === 0) tone(t, 130.81, 0.18, 0.18, "sawtooth"); // low bass pulse
        break;
      case "C": // moderate bounce
        if (onB === 0 || onB === 2) kick(t, 0.85);
        if (s % 4 === 2) woodblock(t, 760, 0.22);
        if (s === 6 || s === 14) bell(t, PENTA[(s) % PENTA.length], 0.16);
        if (s % 2 === 1) hat(t, 0.08);
        break;
      case "D": // high energy four-on-the-floor
        if (beat) kick(t, 0.95);
        if (onB === 1 || onB === 3) clap(t, 0.45);
        hat(t, s % 2 ? 0.16 : 0.10);
        if (s === 0 || s === 10) bell(t, PENTA[(onB + 2) % PENTA.length], 0.18);
        break;
      case "E": // rhythm-led — big clear pulse, every beat
        if (beat) { kick(t, 1.0); clap(t, 0.5); }
        if (s % 4 === 2) hat(t, 0.14);
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
      case "lazy8":                    // a soft trace swoosh each loop
        if (s === 0) whoosh(t, 0.18);
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
    const solo = sfxStep(t, s);
    if (!solo) groove(t, s);
    if (s === 0) barCount++;
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
