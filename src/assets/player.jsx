/* player.jsx — Player (single exercise) + Session (guided routine)
   with multi-phase animation, synced pose breakdown & guide overlays */

function midBpm(ex) { return Math.round((ex.bpm[0] + ex.bpm[1]) / 2); }
function tintOf(ex) { return `color-mix(in srgb, ${ex.theme.accent} 16%, #fff8e8)`; }

/* free-running animation speed (no music) */
const SPEEDS = { slow: 0.28, normal: 0.8, fast: 1.3 };
/* beat-locked multiplier (music on): how many BEATS-cycles one move cycle takes.
   2 = half speed and still on the beat. Keeps Slow actually slow with music on. */
const BEAT_MUL = { slow: 2, normal: 1, fast: 0.7 };

/* which SFX each Clever-Hands move plays as its phases advance */
const SFX_FOR = {
  // bimanual swap drills: a soft click each time the hands switch shapes
  palmbeak: () => "tap",
  fistpalm: () => "tap",
  pointpalm: () => "tap",
  peacepalm: () => "tap",
  beakfist: () => "tap",
  beaktalk: () => "tap",
  fingercount: () => "tap",
  rps: () => "tap",
  fistflat: () => "whoosh",
};
function useStepSfx(exId, active, playing) {
  const prev = React.useRef(-1);
  React.useEffect(() => {
    if (!playing) { prev.current = active; return; }
    if (active !== prev.current) {
      const f = SFX_FOR[exId];
      if (f) { const s = f(active); if (s) window.PipAudio.sfx(s); }
      prev.current = active;
    }
  }, [active, playing, exId]);
}
function SpeedPicker({ val, onChange }) {
  return (
    <div className="speedpick">
      <span className="lbl">Speed</span>
      {[["slow", "🐢", "Slow"], ["normal", "🚶", "Go"], ["fast", "🐇", "Fast"]].map(([k, e, l]) =>
        <button key={k} className={"spd" + (val === k ? " on" : "")} onClick={() => onChange(k)} title={l}>
          <span className="e">{e}</span>{l}
        </button>)}
    </div>
  );
}

/* phase clock — keeps the live caption + highlighted breakdown row in step
   with the looping CSS animation (both start at mount) */
function usePhaseClock(dur, phases) {
  const [idx, setIdx] = React.useState(0);
  React.useEffect(() => {
    if (!dur || !phases || !phases.length) { setIdx(0); return; }
    let raf, cur = -1; const t0 = performance.now();
    const loop = (t) => {
      const pct = ((((t - t0) / 1000) % dur) / dur) * 100;
      let a = 0;
      for (let i = 0; i < phases.length; i++) if (pct >= phases[i].p) a = i;
      if (a !== cur) { cur = a; setIdx(a); }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [dur, phases]);
  return idx;
}

/* guide overlays: midline for cross-body moves, travel arrows for moves that
   go somewhere, plus the figure-8 trail & breathing pacer */
function Overlay({ ex }) {
  const mid = ["march", "windmill"].includes(ex.id);
  const travel = { bear: 1, inch: 1, tightrope: 1, crab: 2 }[ex.id];
  const a = ex.theme.accent;
  return (
    <React.Fragment>
      {mid && <div className="midline" style={{ borderColor: a }} aria-hidden="true" />}
      {travel === 1 && <div className="travel" style={{ color: a }} aria-hidden="true">{I.right}{I.right}</div>}
      {travel === 2 && <div className="travel two" style={{ color: a }} aria-hidden="true">{I.left}{I.right}</div>}
      {ex.id === "breathe" &&
        <div className="breathe-pacer" aria-hidden="true"><div className="bp-ring" style={{ borderColor: `color-mix(in srgb, ${a} 60%, #fff)` }}><span className="bp-txt" style={{ color: a }}>breathe</span></div></div>}
    </React.Fragment>
  );
}

/* a small dot row that lights in sequence (counting / pattern cue) */
function CountDots({ ex, n }) {
  n = n || 4;
  const [on, setOn] = React.useState(0);
  React.useEffect(() => {
    const seq = n === 4 ? [0, 1, 2, 3, 2, 1] : [0, 1, 2];
    let i = 0;
    const t = setInterval(() => { i = (i + 1) % seq.length; setOn(seq[i]); }, 600);
    return () => clearInterval(t);
  }, [n]);
  return (
    <div className="countdots" aria-hidden="true">
      {Array.from({ length: n }, (_, i) =>
        <span key={i} className={"cd" + (i === on ? " on" : "")}
          style={i === on ? { background: ex.theme.accent, color: "#fff", borderColor: ex.theme.accent } : null}>{i + 1}</span>)}
    </div>
  );
}

/* the synced step-by-step pose breakdown (same character, frozen at each key moment) */
function Breakdown({ ex, speed, active }) {
  const phases = window.PHASES[ex.id] || [];
  return (
    <div className="breakdown">
      <div className="bd-title">The whole move — step by step</div>
      <div className="bd-list">
        {phases.map((ph, i) => (
          <React.Fragment key={i}>
            {i > 0 && <div className="bd-arrow" aria-hidden="true">↓</div>}
            <div className={"bd-row" + (i === active ? " on" : "")} style={i === active ? { borderColor: ex.theme.accent } : null}>
              <div className="bd-fig" style={{ background: `color-mix(in srgb, ${ex.theme.accent} 9%, #fff)` }}>
                <PipStage ex={ex} className="posefig" speed={speed} pausedAt={ph.p / 100} frozen={ph.freeze} />
              </div>
              <div className="bd-cap"><span className="bd-n" style={{ background: ex.theme.accent }}>{i + 1}</span><span>{ph.t}</span></div>
            </div>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

function AdultNote({ ex }) {
  return (
    <details className="adultnote">
      <summary>{I.book} Words &amp; grown-up notes</summary>
      <ol className="wordsteps">
        {ex.steps.map((s, i) => <li key={i}>{s}</li>)}
      </ol>
      <p><b>Builds:</b> {ex.activates}</p>
      <p><b>Evidence:</b> <span className={"evi " + ex.evidence}>{ex.evidence}</span> &nbsp; <b>Safety:</b> {ex.safety}</p>
    </details>
  );
}

function MusicBar({ ex, bpm, setBpm, playing, onToggle }) {
  const b = window.BANDS[ex.band];
  return (
    <div className="musicchip">
      <button className="play" onClick={onToggle} aria-label={playing ? "Pause music" : "Play music"}>
        {playing ? I.pause : I.play}
      </button>
      <div>
        <div className="lbl">Music: {b.name} <BandPill band={ex.band} small /></div>
        <div className="sub">{playing && window.PipAudio.state.title ? "♪ " + window.PipAudio.state.title + " · " : ""}{bpm} BPM · {ex.duration}</div>
      </div>
      <div className="bpm-slider" style={{ marginLeft: 8 }}>
        🐢
        <input type="range" min={ex.bpm[0]} max={ex.bpm[1]} value={bpm}
          onChange={e => setBpm(+e.target.value)} style={{ width: 90 }} />
        🐇
      </div>
    </div>
  );
}

/* the shared stage + breakdown body used by Player and Session */
function MoveBody({ ex, spd, frozen, setDur, active, lockBpm }) {
  return (
    <div className="player-body">
      <div className="pleft">
        <div className="pstage-wrap" style={{ background: `color-mix(in srgb, ${ex.theme.accent} 10%, #fff)` }}>
          <Overlay ex={ex} />
          <PipStage ex={ex} className="pstage" frozen={frozen} speed={SPEEDS[spd]} onMeasure={setDur} lockBpm={lockBpm} beatMul={BEAT_MUL[spd]} />
          {frozen && <div className="freeze-ov"><div className="card2">❄ FREEZE!</div></div>}
        </div>
        <div className="livecap">
          <span className="lc-n">{active + 1}</span>
          {(window.PHASES[ex.id] || [])[active] ? window.PHASES[ex.id][active].t : ex.kid}
        </div>
      </div>
      <div className="pright">
        <div className="kidline">{ex.kid}</div>
        <Breakdown ex={ex} speed={SPEEDS[spd]} active={active} />
        {(ex.easy || ex.tricky) &&
          <div className="grow-row">
            {ex.easy && <div className="grow easy"><span className="tag">Easier</span>{ex.easy}</div>}
            {ex.tricky && <div className="grow tricky"><span className="tag">Trickier</span>{ex.tricky}</div>}
          </div>}
        {ex.think && <div className="think">{I.spark}<div><b>Try this:</b> {ex.think}</div></div>}
        <AdultNote ex={ex} />
      </div>
    </div>
  );
}

/* ---------------- single-exercise Player ---------------- */
function Player({ ex, index, total, onNav, onClose, soundOn }) {
  const [bpm, setBpm] = React.useState(midBpm(ex));
  const [playing, setPlaying] = React.useState(false);
  const [frozen, setFrozen] = React.useState(false);
  const [spd, setSpd] = React.useState("slow");
  const [dur, setDur] = React.useState(0);
  const [lockBpm, setLockBpm] = React.useState(null);
  const frozenRef = React.useRef(setFrozen); frozenRef.current = setFrozen;
  const active = usePhaseClock(frozen ? 0 : dur, window.PHASES[ex.id]);
  useStepSfx(ex.id, active, playing);

  React.useEffect(() => {
    setBpm(midBpm(ex)); setFrozen(false); setPlaying(false);
    window.PipAudio.stop();
    if (window.PipAudio.preload) window.PipAudio.preload(ex.band);   // fetch the band's track early
    return () => window.PipAudio.stop();
  }, [ex.id]);

  React.useEffect(() => {
    if (!playing) { window.PipAudio.stop(); setFrozen(false); setLockBpm(null); return; }
    window.PipAudio.ensure();
    window.PipAudio.start(ex.band, bpm, ex.id === "freeze" ? {
      freeze: true,
      onFreeze: () => frozenRef.current(true),
      onUnfreeze: () => frozenRef.current(false),
    } : { sfx: ex.id });
    setLockBpm(window.PipAudio.state.bpm);   // effective BPM — animations lock to the beat
  }, [playing, bpm, ex.id]);

  function toggle() { if (soundOn) setPlaying(p => !p); }

  return (
    <div className="player" style={{ "--pbg": tintOf(ex), background: tintOf(ex) }}>
      <div className="pbar wrap" style={{ maxWidth: "none", width: "100%" }}>
        <span className="num" style={{ background: ex.theme.accent, color: "#fff" }}>{ex.n}</span>
        <div className="phead">
          <div className="title">{ex.name}</div>
          <div className="gtag">{ex.group}</div>
        </div>
        <div className="sp" style={{ flex: 1 }} />
        <button className="close-x" onClick={onClose} aria-label="Close">{I.close}</button>
      </div>

      <MoveBody ex={ex} spd={spd} frozen={frozen} setDur={setDur} active={frozen ? (window.PHASES[ex.id] || []).length - 1 : active} lockBpm={playing && !frozen ? lockBpm : null} />

      <div className="controls">
        <button className="navbtn" onClick={() => onNav(-1)} disabled={index === 0} aria-label="Previous">{I.left}</button>
        <MusicBar ex={ex} bpm={bpm} setBpm={setBpm} playing={playing} onToggle={toggle} />
        <SpeedPicker val={spd} onChange={setSpd} />
        {!soundOn && <span className="upnext">Sound is off — turn it on up top 🔈</span>}
        <div className="sp" style={{ flex: 1 }} />
        <span className="upnext">{index + 1} / {total}</span>
        <button className="navbtn" onClick={() => onNav(1)} disabled={index === total - 1} aria-label="Next">{I.right}</button>
      </div>
    </div>
  );
}

/* ---------------- guided Session — its own full-screen page ----------------
   Three stages, none of which show the home page's copy:
     intro → a quiet lobby card (what's coming, how long, pick a pace)
     run   → one big stage, one caption, one timer; detail hidden in a drawer
     done  → the celebration
   A 3-2-1 cue card covers every move change so it never cuts abruptly.        */
const SESSION_SECS = { breathe: 75, freeze: 90, default: 55 };
function secsFor(ex) { return SESSION_SECS[ex.id] || SESSION_SECS.default; }
function mmss(s) { s = Math.max(0, s); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); }

/* circular countdown for the current move */
function TimerDial({ left, total }) {
  const R = 22, C = 2 * Math.PI * R;
  const frac = total ? Math.max(0, Math.min(1, left / total)) : 0;
  return (
    <div className="tdial">
      <svg viewBox="0 0 56 56" width="56" height="56">
        <circle cx="28" cy="28" r={R} className="td-bg" />
        <circle cx="28" cy="28" r={R} className="td-fg"
          strokeDasharray={C} strokeDashoffset={C * (1 - frac)} />
      </svg>
      <span className="td-txt">{mmss(left)}</span>
    </div>
  );
}

function SessionIntro({ list, spd, setSpd, onStart, onClose }) {
  const total = list.reduce((a, e) => a + secsFor(e), 0);
  return (
    <div className="sess sess-intro">
      <button className="close-x sess-x" onClick={onClose} aria-label="Close">{I.close}</button>
      <div className="si-card">
        <div className="si-kicker"><Mark /> Guided session</div>
        <h1>Ready to wiggle?</h1>
        <p className="si-sub">
          Pip takes you through {list.length} moves, one after the other.
          Follow along, the music and the timer do the rest.
        </p>
        <div className="si-pills">
          <span className="si-pill"><b>{list.length}</b> moves</span>
          <span className="si-pill"><b>{Math.round(total / 60)}</b> minutes</span>
          <span className="si-pill">ends <b>calm</b></span>
        </div>
        <div className="si-strip">
          {list.map((e, i) => (
            <div className="si-move" key={e.id} style={{ borderColor: `color-mix(in srgb, ${e.theme.accent} 45%, #fff)` }}>
              <span className="si-n" style={{ background: e.theme.accent }}>{i + 1}</span>
              <span className="si-nm">{e.name}</span>
              <span className="si-s">{secsFor(e)}s</span>
            </div>))}
        </div>
        <div className="si-actions">
          <SpeedPicker val={spd} onChange={setSpd} />
          <button className="btn green big" onClick={onStart}>{I.play} Let's go!</button>
        </div>
      </div>
    </div>
  );
}

function SessionCue({ ex, n, total, count }) {
  return (
    <div className="sess-cue" style={{ background: `color-mix(in srgb, ${ex.theme.accent} 22%, #fff8e8)` }}>
      <div className="sc-card">
        <div className="sc-lbl">Move {n} of {total}</div>
        <div className="sc-name" style={{ color: ex.theme.accent }}>{ex.name}</div>
        <div className="sc-kid">{ex.kid}</div>
        <div className="sc-count" style={{ background: ex.theme.accent }} key={count}>{count}</div>
      </div>
    </div>
  );
}

function Session({ onClose, soundOn }) {
  const list = React.useMemo(() => window.SESSION.map(id => EXERCISES.find(e => e.id === id)), []);
  const [stage, setStage] = React.useState("intro");    // intro | run | done
  const [idx, setIdx] = React.useState(0);
  const [left, setLeft] = React.useState(secsFor(list[0]));
  const [paused, setPaused] = React.useState(false);
  const [cue, setCue] = React.useState(0);              // 3-2-1 before each move
  const [frozen, setFrozen] = React.useState(false);
  const [spd, setSpd] = React.useState("slow");
  const [dur, setDur] = React.useState(0);
  const [lockBpm, setLockBpm] = React.useState(null);
  const [drawer, setDrawer] = React.useState(false);
  const frozenRef = React.useRef(setFrozen); frozenRef.current = setFrozen;
  const ex = list[idx];
  const ticking = stage === "run" && !paused && !cue;
  const active = usePhaseClock(frozen ? 0 : dur, window.PHASES[ex.id]);
  useStepSfx(ex.id, active, ticking && soundOn);

  /* music follows the current move; it starts under the cue card so the beat is
     already going when the move appears */
  React.useEffect(() => {
    if (stage !== "run" || paused || !soundOn) { window.PipAudio.stop(); setFrozen(false); setLockBpm(null); return; }
    window.PipAudio.ensure();
    window.PipAudio.start(ex.band, midBpm(ex), ex.id === "freeze" ? {
      freeze: true,
      onFreeze: () => frozenRef.current(true),
      onUnfreeze: () => frozenRef.current(false),
    } : { sfx: ex.id });
    setLockBpm(window.PipAudio.state.bpm);
    const ni = list[idx + 1];
    if (ni && window.PipAudio.preload) window.PipAudio.preload(ni.band);
    return () => window.PipAudio.stop();
  }, [idx, stage, paused, soundOn]);

  React.useEffect(() => { if (stage === "done") window.PipAudio.stop(); }, [stage]);

  React.useEffect(() => {
    if (!cue) return;
    const t = setTimeout(() => setCue(c => c - 1), 900);
    return () => clearTimeout(t);
  }, [cue]);

  React.useEffect(() => {
    if (!ticking) return;
    const t = setInterval(() => setLeft(l => l - 1), 1000);
    return () => clearInterval(t);
  }, [ticking, idx]);

  React.useEffect(() => { if (left <= 0 && stage === "run") next(); }, [left]);

  function goto(i) { setIdx(i); setLeft(secsFor(list[i])); setFrozen(false); setDrawer(false); setCue(3); }
  function next() { if (idx >= list.length - 1) { setStage("done"); return; } goto(idx + 1); }
  function prev() { if (idx > 0) goto(idx - 1); }
  function start() { setIdx(0); setLeft(secsFor(list[0])); setPaused(false); setStage("run"); setCue(3); }

  if (stage === "intro")
    return <SessionIntro list={list} spd={spd} setSpd={setSpd} onStart={start} onClose={onClose} />;

  if (stage === "done") {
    return (
      <div className="sess sess-done">
        <button className="close-x sess-x" onClick={onClose} aria-label="Close">{I.close}</button>
        <Confetti />
        <div className="sd-inner">
          <div className="sd-stage"><PipStage ex={EXERCISES.find(e => e.id === "jacks")} className="pstage" speed={SPEEDS[spd]} /></div>
          <h1>Great moving! 🎉</h1>
          <p>You finished all {list.length} moves. Body woken up, brain switched on.</p>
          <div className="sd-actions">
            <button className="btn green" onClick={start}>Do it again</button>
            <button className="btn ghost" onClick={onClose}>Back to the moves</button>
          </div>
        </div>
      </div>
    );
  }

  const caption = (window.PHASES[ex.id] || [])[active];
  return (
    <div className="sess sess-run" style={{ "--pbg": tintOf(ex), "--acc": ex.theme.accent, background: tintOf(ex) }}>
      <div className="sr-top">
        <div className="sr-seg">
          {list.map((e, i) =>
            <button key={e.id} className={"seg" + (i < idx ? " done" : "") + (i === idx ? " now" : "")}
              title={e.name} aria-label={"Go to " + e.name} onClick={() => goto(i)}>
              <span className="fill" style={i === idx ? { width: `${100 - (left / secsFor(ex)) * 100}%` } : undefined} />
            </button>)}
        </div>
        <div className="sr-head">
          <div className="sr-name">{ex.name}</div>
          <div className="sr-sub">Move {idx + 1} of {list.length} · {ex.group}</div>
        </div>
        <TimerDial left={Math.max(0, left)} total={secsFor(ex)} />
        <button className="close-x sr-x" onClick={onClose} aria-label="End session">{I.close}</button>
      </div>

      <div className="sr-stage-wrap">
        <div className="sr-stage">
          <Overlay ex={ex} />
          <PipStage ex={ex} className="pstage" frozen={frozen} speed={SPEEDS[spd]}
            onMeasure={setDur} lockBpm={ticking && soundOn && !frozen ? lockBpm : null} beatMul={BEAT_MUL[spd]} />
          {frozen && <div className="freeze-ov"><div className="card2">❄ FREEZE!</div></div>}
        </div>
        <div className="sr-cap">
          <span className="lc-n" style={{ background: ex.theme.accent }}>{active + 1}</span>
          <span>{caption ? caption.t : ex.kid}</span>
        </div>
      </div>

      {drawer &&
        <div className="sr-drawer">
          <div className="srd-h">How the move goes</div>
          <ol>{ex.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
          {ex.easy && <p><b>Easier:</b> {ex.easy}</p>}
          {ex.tricky && <p><b>Trickier:</b> {ex.tricky}</p>}
        </div>}

      <div className="sr-bottom">
        <button className="navbtn" onClick={prev} disabled={idx === 0} aria-label="Previous move">{I.left}</button>
        <button className="play sr-play" onClick={() => setPaused(p => !p)} aria-label={paused ? "Resume" : "Pause"}>
          {paused ? I.play : I.pause}
        </button>
        <button className="navbtn" onClick={next} aria-label="Next move">{I.right}</button>
        <SpeedPicker val={spd} onChange={setSpd} />
        <button className={"btn ghost sm sr-steps" + (drawer ? " on" : "")} onClick={() => setDrawer(d => !d)}>
          {I.book} {drawer ? "Hide steps" : "Steps"}
        </button>
        <div className="sp" style={{ flex: 1 }} />
        <span className="sr-next">{idx < list.length - 1 ? "Up next: " + list[idx + 1].name : "Last one!"}</span>
      </div>

      {cue > 0 && <SessionCue ex={ex} n={idx + 1} total={list.length} count={cue} />}
    </div>
  );
}

Object.assign(window, { Player, Session });
