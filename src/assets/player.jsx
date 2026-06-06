/* player.jsx — Player (single exercise) + Session (guided routine)
   with multi-phase animation, synced pose breakdown & guide overlays */

function midBpm(ex) { return Math.round((ex.bpm[0] + ex.bpm[1]) / 2); }
function tintOf(ex) { return `color-mix(in srgb, ${ex.theme.accent} 16%, #fff8e8)`; }

const SPEEDS = { slow: 0.5, normal: 0.85, fast: 1.35 };

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
        <div className="sub">{bpm} BPM · {ex.duration}</div>
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
function MoveBody({ ex, spd, frozen, setDur, active }) {
  return (
    <div className="player-body">
      <div className="pleft">
        <div className="pstage-wrap" style={{ background: `color-mix(in srgb, ${ex.theme.accent} 10%, #fff)` }}>
          <Overlay ex={ex} />
          <PipStage ex={ex} className="pstage" frozen={frozen} speed={SPEEDS[spd]} onMeasure={setDur} />
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
  const frozenRef = React.useRef(setFrozen); frozenRef.current = setFrozen;
  const active = usePhaseClock(frozen ? 0 : dur, window.PHASES[ex.id]);
  useStepSfx(ex.id, active, playing);

  React.useEffect(() => {
    setBpm(midBpm(ex)); setFrozen(false); setPlaying(false);
    window.PipAudio.stop();
    return () => window.PipAudio.stop();
  }, [ex.id]);

  React.useEffect(() => {
    if (!playing) { window.PipAudio.stop(); setFrozen(false); return; }
    window.PipAudio.ensure();
    window.PipAudio.start(ex.band, bpm, ex.id === "freeze" ? {
      freeze: true,
      onFreeze: () => frozenRef.current(true),
      onUnfreeze: () => frozenRef.current(false),
    } : { sfx: ex.id });
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

      <MoveBody ex={ex} spd={spd} frozen={frozen} setDur={setDur} active={frozen ? (window.PHASES[ex.id] || []).length - 1 : active} />

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

/* ---------------- guided Session ---------------- */
const SESSION_SECS = { breathe: 75, freeze: 90, default: 55 };
function secsFor(ex) { return SESSION_SECS[ex.id] || SESSION_SECS.default; }

function Session({ onClose, soundOn }) {
  const list = React.useMemo(() => window.SESSION.map(id => EXERCISES.find(e => e.id === id)), []);
  const [idx, setIdx] = React.useState(0);
  const [left, setLeft] = React.useState(secsFor(list[0]));
  const [running, setRunning] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [frozen, setFrozen] = React.useState(false);
  const [spd, setSpd] = React.useState("slow");
  const [dur, setDur] = React.useState(0);
  const frozenRef = React.useRef(setFrozen); frozenRef.current = setFrozen;
  const ex = list[idx];
  const active = usePhaseClock(frozen ? 0 : dur, window.PHASES[ex.id]);
  useStepSfx(ex.id, active, running && soundOn);

  React.useEffect(() => {
    if (done) { window.PipAudio.stop(); return; }
    if (running && soundOn) {
      window.PipAudio.ensure();
      window.PipAudio.start(ex.band, midBpm(ex), ex.id === "freeze" ? {
        freeze: true,
        onFreeze: () => frozenRef.current(true),
        onUnfreeze: () => frozenRef.current(false),
      } : { sfx: ex.id });
    } else { window.PipAudio.stop(); setFrozen(false); }
    return () => window.PipAudio.stop();
  }, [idx, running, done, soundOn]);

  React.useEffect(() => {
    if (!running || done) return;
    const t = setInterval(() => setLeft(l => l - 1), 1000);
    return () => clearInterval(t);
  }, [running, done, idx]);

  React.useEffect(() => { if (left <= 0 && running) next(); }, [left]);

  function next() {
    if (idx >= list.length - 1) { setDone(true); setRunning(false); return; }
    const ni = idx + 1; setIdx(ni); setLeft(secsFor(list[ni])); setFrozen(false);
  }
  function start() { setRunning(true); }

  if (done) {
    return (
      <div className="player" style={{ background: "var(--bg)" }}>
        <div className="pbar"><div className="sp" style={{ flex: 1 }} /><button className="close-x" onClick={onClose}>{I.close}</button></div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative" }}>
          <Confetti />
          <div style={{ width: 260, height: 260 }}><PipStage ex={EXERCISES.find(e => e.id === "jacks")} className="pstage" speed={SPEEDS[spd]} /></div>
          <h1 style={{ fontFamily: "var(--display)", fontSize: 46, margin: "10px 0 6px" }}>Great moving! 🎉</h1>
          <p style={{ fontSize: 20, color: "var(--ink-soft)" }}>You finished your wiggle session.</p>
          <div style={{ display: "flex", gap: 14, marginTop: 12 }}>
            <button className="btn green" onClick={() => { setIdx(0); setLeft(secsFor(list[0])); setDone(false); setRunning(true); }}>Do it again</button>
            <button className="btn ghost" onClick={onClose}>Back to moves</button>
          </div>
        </div>
      </div>
    );
  }

  const mm = String(Math.floor(Math.max(0, left) / 60)).padStart(1, "0");
  const ss = String(Math.max(0, left) % 60).padStart(2, "0");

  return (
    <div className="player" style={{ "--pbg": tintOf(ex), background: tintOf(ex) }}>
      <div className="pbar wrap" style={{ maxWidth: "none", width: "100%" }}>
        <span className="num" style={{ background: ex.theme.accent, color: "#fff" }}>{ex.n}</span>
        <div className="phead"><div className="title">{ex.name}</div><div className="gtag">Session · move {idx + 1} of {list.length}</div></div>
        <div className="sp" style={{ flex: 1 }} />
        <span className="timer-ring">{mm}:{ss}</span>
        <button className="close-x" onClick={onClose} style={{ marginLeft: 14 }}>{I.close}</button>
      </div>

      <MoveBody ex={ex} spd={spd} frozen={frozen} setDur={setDur} active={frozen ? (window.PHASES[ex.id] || []).length - 1 : active} />

      <div className="controls">
        <div className="progress">
          {list.map((e, i) =>
            <div key={i} className={"pdot" + (i < idx ? " done" : "")} title={e.name}
              style={{ cursor: "pointer" }} onClick={() => { setIdx(i); setLeft(secsFor(list[i])); setFrozen(false); }}>
              <div className="fill" style={{ width: i === idx ? `${100 - (left / secsFor(ex)) * 100}%` : undefined }} />
            </div>)}
        </div>
        <SpeedPicker val={spd} onChange={setSpd} />
        {!running
          ? <button className="btn green" onClick={start}>{I.play} Start</button>
          : <button className="btn ghost sm" onClick={() => setRunning(false)}>Pause</button>}
        <button className="btn sm" onClick={next}>Next {I.right}</button>
        <span className="upnext">{idx < list.length - 1 ? "Up next: " + list[idx + 1].name : "Last one!"}</span>
      </div>
    </div>
  );
}

Object.assign(window, { Player, Session });
