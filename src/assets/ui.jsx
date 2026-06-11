/* ui.jsx — shared components & icons (exported to window) */

function usesSonic(ex) { return ex.rig !== "hands" && window.SONIC_MAP && window.SONIC_MAP[ex.id]; }
function usesFloor(ex) { return window.FLOOR_MAP && window.FLOOR_MAP[ex.id]; }
function pipHTML(ex, extra) {
  if (usesSonic(ex) || usesFloor(ex)) return `<canvas class="pip-s pip3d-canvas" width="320" height="320"></canvas>`;
  let s = ex.rig === "quad" ? buildPipQ(ex.theme)
        : ex.rig === "crab" ? buildPipCrab(ex.theme)
        : ex.rig === "hands" ? buildPipHands(ex.theme)
        : buildPip(ex.theme);
  const cls = ex.anim + (extra ? " " + extra : "");
  return s.replace(/class="(pip[-\w]*)"/, `class="$1 ${cls}"`);
}

function PipStage({ ex, className, frozen, speed, pausedAt, onMeasure, lockBpm }) {
  const ref = React.useRef(null);
  const html = React.useMemo(() => pipHTML(ex, frozen ? "frozen" : ""), [ex.id, frozen]);
  // beat-lock: while music plays, one animation cycle = BEATS[ex] music beats,
  // so the move lands on the beat. dur/speed = cycle secs → speed = dur*bpm/(60*beats)
  const beatSpd = (dur) => {
    const n = lockBpm && window.BEATS && window.BEATS[ex.id];
    return n ? (dur * lockBpm) / (60 * n) : 0;
  };
  React.useEffect(() => {
    const el = ref.current; if (!el) return;
    const spd = speed || 1;
    // 3D Sonic character (sonic3d.js) for the standing exercises. Same shared-GL
    // pattern: live on the main player stage, static snapshot elsewhere.
    if (usesSonic(ex)) {
      let ctrl = null, canceled = false;
      const start = () => {
        if (canceled || !window.Sonic3D) return;
        const canvas = el.querySelector("canvas"); if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.max(64, Math.round((rect.width || 320) * dpr));
        canvas.height = Math.max(64, Math.round((rect.height || 320) * dpr));
        const isMain = (className || "").includes("pstage");
        const pAt = pausedAt != null ? pausedAt : (isMain && !frozen ? null : 0.3);
        const sp = beatSpd(window.Sonic3D.DURATION[ex.id] || 2.0) || spd;
        ctrl = window.Sonic3D.mount(canvas, ex.id, { speed: sp, pausedAt: pAt, frozen });
        if (onMeasure) onMeasure((window.Sonic3D.DURATION[ex.id] || 2.0) / sp);
      };
      if (window.Sonic3D) start();
      else window.addEventListener("sonic3d-ready", start, { once: true });
      return () => { canceled = true; window.removeEventListener("sonic3d-ready", start); if (ctrl) ctrl.stop(); };
    }
    // 3D Pip creature (floor3d.js) for the all-fours floor moves. Same shared-GL
    // blit pattern: live on the player stage, static snapshot elsewhere.
    if (usesFloor(ex)) {
      let ctrl = null, canceled = false;
      const start = () => {
        if (canceled || !window.Floor3D) return;
        const canvas = el.querySelector("canvas"); if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.max(64, Math.round((rect.width || 320) * dpr));
        canvas.height = Math.max(64, Math.round((rect.height || 320) * dpr));
        const isMain = (className || "").includes("pstage");
        const pAt = pausedAt != null ? pausedAt : (isMain && !frozen ? null : 0.3);
        const sp = beatSpd(window.Floor3D.DURATION[ex.id] || 2.6) || spd;
        ctrl = window.Floor3D.mount(canvas, ex.id, { speed: sp, pausedAt: pAt, frozen });
        if (onMeasure) onMeasure((window.Floor3D.DURATION[ex.id] || 2.6) / sp);
      };
      if (window.Floor3D) start();
      else window.addEventListener("floor3d-ready", start, { once: true });
      return () => { canceled = true; window.removeEventListener("floor3d-ready", start); if (ctrl) ctrl.stop(); };
    }
    // realistic 3D hands rig → WebGL (hands3d.js). Live only on the main player
    // stage; cards & step thumbnails render a single static pose (one shared GL ctx).
    if (ex.rig === "hands") {
      let ctrl = null, canceled = false;
      const start = () => {
        if (canceled || !window.Hands3D) return;
        const canvas = el.querySelector("canvas"); if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.max(64, Math.round((rect.width || 300) * dpr));
        canvas.height = Math.max(64, Math.round((rect.height || 300) * dpr));
        const isMain = (className || "").includes("pstage");
        const pAt = pausedAt != null ? pausedAt : (isMain && !frozen ? null : 0.28);
        const sp = beatSpd(window.Hands3D.DURATION[ex.id] || 3.4) || spd;
        ctrl = window.Hands3D.mount(canvas, ex.id, { speed: sp, pausedAt: pAt, frozen });
        if (onMeasure) onMeasure((window.Hands3D.DURATION[ex.id] || 3.4) / sp);
      };
      if (window.Hands3D) start();
      else window.addEventListener("hands3d-ready", start, { once: true });
      return () => { canceled = true; window.removeEventListener("hands3d-ready", start); if (ctrl) ctrl.stop(); };
    }
    // CSS-driven rigs (biped / quad)
    let dur = 0;
    el.querySelectorAll("g").forEach(g => {
      // eyes blink on their own clock — never part of the move timing or freeze
      if (g.classList.contains("eyes")) return;
      if (g.dataset.base === undefined) {
        const d = getComputedStyle(g).animationDuration;
        g.dataset.base = (d && d !== "0s") ? String(parseFloat(d)) : "";
      }
      if (g.dataset.base) {
        const d = parseFloat(g.dataset.base) / spd;
        dur = Math.max(dur, d);
        g.style.animationDuration = d + "s";
        if (pausedAt != null) {
          g.style.animationDelay = (-pausedAt * d) + "s";
          g.style.animationPlayState = "paused";
        } else {
          g.style.animationDelay = "0s";
          g.style.animationPlayState = frozen ? "paused" : "running";
        }
      }
    });
    if (onMeasure && dur) onMeasure(dur);
  }, [html, speed, pausedAt, frozen, ex.id, lockBpm]);
  return <div ref={ref} className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}

/* ---- icons ---- */
const I = {
  play: <svg viewBox="0 0 24 24" width="24" height="24"><path d="M7 5l12 7-12 7z" fill="currentColor"/></svg>,
  pause: <svg viewBox="0 0 24 24" width="24" height="24"><rect x="6" y="5" width="4" height="14" rx="1.5" fill="currentColor"/><rect x="14" y="5" width="4" height="14" rx="1.5" fill="currentColor"/></svg>,
  close: <svg viewBox="0 0 24 24" width="22" height="22"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"/></svg>,
  left: <svg viewBox="0 0 24 24" width="26" height="26"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  right: <svg viewBox="0 0 24 24" width="26" height="26"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  sound: <svg viewBox="0 0 24 24" width="22" height="22"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16 8c1.6 1.2 1.6 6.8 0 8M18.5 6c2.8 2 2.8 10 0 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  mute: <svg viewBox="0 0 24 24" width="22" height="22"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16 9l5 5M21 9l-5 5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/></svg>,
  spark: <svg viewBox="0 0 24 24" width="20" height="20"><path d="M12 3l1.6 5.2L19 10l-5.4 1.8L12 17l-1.6-5.2L5 10l5.4-1.8z" fill="currentColor"/></svg>,
  book: <svg viewBox="0 0 24 24" width="20" height="20"><path d="M4 5c3-1 6-1 8 0v14c-2-1-5-1-8 0zM20 5c-3-1-6-1-8 0v14c2-1 5-1 8 0z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>,
};

function Mark() {
  return (
    <svg className="mark" viewBox="0 0 40 40">
      <ellipse cx="20" cy="35" rx="11" ry="3" fill="rgba(38,52,60,.15)"/>
      <circle cx="13" cy="11" r="4.5" fill="#2cb6a3" stroke="#26343c" strokeWidth="2.2"/>
      <circle cx="27" cy="11" r="4.5" fill="#2cb6a3" stroke="#26343c" strokeWidth="2.2"/>
      <circle cx="20" cy="20" r="13" fill="#2cb6a3" stroke="#26343c" strokeWidth="2.6"/>
      <circle cx="15.5" cy="18" r="3.4" fill="#fff" stroke="#26343c" strokeWidth="1.4"/>
      <circle cx="24.5" cy="18" r="3.4" fill="#fff" stroke="#26343c" strokeWidth="1.4"/>
      <circle cx="16" cy="19" r="1.6" fill="#2a2018"/><circle cx="25" cy="19" r="1.6" fill="#2a2018"/>
      <path d="M16 24q4 3 8 0" fill="none" stroke="#2a2018" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}

function BandPill({ band, small }) {
  const b = window.BANDS[band];
  return <span className={"bandtag b" + band} title={b.name + " · " + b.range}>♪ {small ? band : b.name}</span>;
}

function Confetti() {
  const cols = ["#ff7b54", "#4d96ff", "#2e8a64", "#ffd166", "#b06fd0"];
  const dots = React.useMemo(() => Array.from({ length: 14 }, (_, i) => ({
    l: Math.random() * 100, t: Math.random() * 100, s: 8 + Math.random() * 16,
    c: cols[i % cols.length], d: Math.random() * 3
  })), []);
  return <>{dots.map((d, i) =>
    <span key={i} className="dot" style={{
      left: d.l + "%", top: d.t + "%", width: d.s, height: d.s, background: d.c,
      animation: `floaty ${3 + d.d}s ease-in-out ${d.d}s infinite`
    }} />)}</>;
}

Object.assign(window, { PipStage, pipHTML, I, Mark, BandPill, Confetti });
