/* ============================================================
   hands-anim.js — realistic human-hand finger animation via
   forward kinematics. Each finger is drawn as 3 connected
   tapered phalanges (round-capped strokes) computed from real
   joint angles, so curls articulate like a true hand with no
   detachment. Thumb opposes across the palm.

   window.HandsAnim
     .mount(svgEl, exId, {speed, pausedAt, frozen}) -> controller{stop()}
       pausedAt (0..1) renders a single held pose (breakdown / freeze).
       otherwise runs a rAF loop.
     .DURATION[exId]  base cycle seconds (kept in sync with PHASES %)
   ============================================================ */
(function () {
  const SKIN = "#ecb78f", SKIN_HI = "#f3c9a6", NAIL = "#f7ddc9", SKO = "#b27c54";
  const D2R = Math.PI / 180;

  // ---- per-hand geometry (matches buildPipHands skeleton) ----
  function handGeom(side) {
    const cx = side === "l" ? 74 : 166;
    const inner = side === "l" ? 1 : -1;
    // index(inner) -> pinky(outer)
    const fx = [cx + inner * 21, cx + inner * 7, cx - inner * 7, cx - inner * 21];
    const fy = [150, 146, 148, 154];                    // knuckle arc
    const seg = [                                        // [L1,L2,L3] per finger
      [25, 17, 12], [28, 19, 13], [26, 18, 12], [20, 14, 10],
    ];
    const wd = [14.5, 15.5, 14.5, 12];                  // base widths
    return {
      cx, inner, fx, fy, seg, wd,
      thumb: { bx: cx + inner * 29, by: 176, seg: [25, 19], w: 16 },
    };
  }

  // forward-kinematics: list of joint points from base angles
  function chain(bx, by, lengths, baseAng, angs) {
    const pts = [[bx, by]];
    let ang = baseAng, x = bx, y = by;
    for (let i = 0; i < lengths.length; i++) {
      ang += angs[i];
      x += lengths[i] * Math.cos(ang);
      y += lengths[i] * Math.sin(ang);
      pts.push([x, y]);
    }
    return pts;
  }

  // tapered round-capped finger from a joint chain
  function digitSVG(pts, w, taper, tip) {
    const widths = pts.slice(1).map((_, i) => w * (1 - taper * i));
    let outline = "", fill = "";
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1], sw = widths[i];
      outline += `<line x1="${a[0].toFixed(1)}" y1="${a[1].toFixed(1)}" x2="${b[0].toFixed(1)}" y2="${b[1].toFixed(1)}" stroke="${SKO}" stroke-width="${sw + 4}" stroke-linecap="round"/>`;
      fill += `<line x1="${a[0].toFixed(1)}" y1="${a[1].toFixed(1)}" x2="${b[0].toFixed(1)}" y2="${b[1].toFixed(1)}" stroke="${SKIN}" stroke-width="${sw}" stroke-linecap="round"/>`;
    }
    // nail near the tip, along the last segment
    let nail = "";
    if (tip) {
      const p = pts[pts.length - 1], q = pts[pts.length - 2];
      const ang = Math.atan2(p[1] - q[1], p[0] - q[0]);
      const nx = p[0] - Math.cos(ang) * 3, ny = p[1] - Math.sin(ang) * 3;
      nail = `<ellipse cx="${nx.toFixed(1)}" cy="${ny.toFixed(1)}" rx="${(widths[widths.length-1]*0.3).toFixed(1)}" ry="${(widths[widths.length-1]*0.4).toFixed(1)}" fill="${NAIL}" transform="rotate(${(ang/D2R+90).toFixed(1)} ${nx.toFixed(1)} ${ny.toFixed(1)})"/>`;
    }
    return `<g>${outline}${fill}${nail}</g>`;
  }

  // render one hand's digits at the given pose
  function renderHand(g, side, pose) {
    const G = handGeom(side), s = G.inner;       // mirror sign
    let out = "";
    // fingers (draw pinky→index so index sits on top)
    for (let i = 3; i >= 0; i--) {
      const c = pose.fingers[i];
      const a1 = c * 78 * D2R, a2 = c * 100 * D2R, a3 = c * 58 * D2R;
      // base pointing up (-90°); flex bends toward palm (sign mirrored per hand)
      const pts = chain(G.fx[i], G.fy[i], G.seg[i], -90 * D2R, [s * a1, s * a2, s * a3].map(v => -v));
      out += digitSVG(pts, G.wd[i], 0.12, true);
    }
    // thumb: opposition op (0 out → 1 across palm) + tip flex
    const T = G.thumb, op = pose.thumb;
    const base = (-30 - op * 70) * s * D2R - 90 * D2R * 0;   // swing from out to across
    const tb = (-150 + s * (op * 64 - 8)) * D2R;             // base direction
    const tpts = chain(T.bx, T.by, T.seg, tb, [0, -s * op * 40 * D2R]);
    out += digitSVG(tpts, T.w, 0.14, true);
    g.innerHTML = out;
  }

  // ---------- per-move pose timelines (t in 0..1) ----------
  // helpers
  const seqPulse = (t, center, width, peak) => {
    let d = Math.abs(((t - center + 1) % 1)); if (d > 0.5) d = 1 - d;
    return d < width ? peak * (1 - d / width) : 0;
  };
  const ramp = (p, s, l) => Math.max(0, Math.min(1, (p - s) / l));
  const POSES = {
    // 1 Finger Tips — thumb taps index→middle→ring→pinky→back; both hands
    fingertips(t) {
      const centers = [0, 1 / 6, 2 / 6, 3 / 6];
      const f = [0, 1, 2, 3].map(i => {
        const up = seqPulse(t, centers[i], 0.1, 0.6);
        const back = i < 3 ? seqPulse(t, 1 - centers[i], 0.1, 0.6) : 0;
        return 0.06 + Math.max(up, back);
      });
      return { L: { fingers: f, thumb: 0.55 }, R: { fingers: f.slice(), thumb: 0.55 } };
    },
    // 2 Open & Close Race — L opens (thumb-first) while R closes (pinky-first), then swap
    openclose(t) {
      function opening(p) { // p 0→1 : fist → open, thumb leads
        return { fingers: [1 - ramp(p, .16, .22), 1 - ramp(p, .32, .22), 1 - ramp(p, .48, .22), 1 - ramp(p, .64, .22)], thumb: 1 - ramp(p, 0, .22) };
      }
      function closing(p) { // p 0→1 : open → fist, pinky leads
        return { fingers: [ramp(p, .48, .22), ramp(p, .32, .22), ramp(p, .16, .22), ramp(p, 0, .22)], thumb: ramp(p, .64, .22) };
      }
      if (t < 0.5) { const p = t / 0.5; return { L: opening(p), R: closing(p) }; }
      const p = (t - 0.5) / 0.5; return { L: closing(p), R: opening(p) };
    },
    // 3 Finger Twirls — cupped ball; the active finger pair circles (thumbs→index→…)
    twirls(t) {
      const cup = [.5, .5, .5, .5];
      const phase = Math.floor(t * 4) % 4;        // which pair is active
      const circ = Math.sin(t * Math.PI * 2 * 4); // fast twirl
      const f = cup.slice();
      if (phase >= 1) f[phase - 1] = 0.32 + 0.14 * circ;   // index/mid/ring pair eases out & circles
      const thumb = phase === 0 ? 0.5 + 0.25 * circ : 0.62;
      return { L: { fingers: f, thumb }, R: { fingers: f.slice(), thumb } };
    },
    // 4 Tap Pairs — fingers rest; named pairs lift (extend) in a 3-pattern cycle
    tappairs(t) {
      const rest = 0.5, lift = 0.04;
      const f = [rest, rest, rest, rest];
      const ph = t % 1;
      const set = ph < 1 / 3 ? [0, 1] : ph < 2 / 3 ? [1, 2, 3] : [0, 3];
      set.forEach(i => { f[i] = lift; });
      return { L: { fingers: f, thumb: 0.6 }, R: { fingers: f.slice(), thumb: 0.6 } };
    },
    // 5 Thumbs In, Thumbs Out — fists; thumbs pop out then tuck in
    thumbsinout(t) {
      const fist = [1, 1, 1, 1];
      const out = t < 0.5 ? 0 : 1;                 // 0 = thumb out, 1 = tucked
      return { L: { fingers: fist, thumb: out }, R: { fingers: fist.slice(), thumb: out } };
    },
  };

  function handOffset(exId, side, t) {
    if (exId === "twirls") { const s = side === "l" ? 1 : -1; return { x: s * 12, y: 4 }; } // bring hands together
    return null;
  }

  const DURATION = { fingertips: 3.8, openclose: 5.0, twirls: 3.4, tappairs: 2.4, thumbsinout: 2.6 };

  function apply(svg, exId, t) {
    const pose = (POSES[exId] || POSES.flip)(t);
    ["l", "r"].forEach(side => {
      const g = svg.querySelector(".digits-" + side);
      if (!g) return;
      renderHand(g, side, side === "l" ? pose.L : pose.R);
      const hand = svg.querySelector(".h-" + side);
      const off = handOffset(exId, side, t);
      if (hand && off) hand.setAttribute("transform", `translate(${off.x.toFixed(1)} ${off.y.toFixed(1)})`);
      else if (hand) hand.removeAttribute("transform");
    });
  }

  function mount(svg, exId, opts) {
    opts = opts || {};
    const dur = (DURATION[exId] || 3.4) / (opts.speed || 1);
    if (opts.pausedAt != null || opts.frozen) {
      apply(svg, exId, opts.pausedAt != null ? opts.pausedAt : 0);
      return { stop() {} };
    }
    let raf, t0 = performance.now();
    const loop = (now) => {
      const t = (((now - t0) / 1000) % dur) / dur;
      apply(svg, exId, t);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return { stop() { cancelAnimationFrame(raf); } };
  }

  window.HandsAnim = { mount, apply, DURATION };
})();
