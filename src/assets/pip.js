/* ============================================================
   pip.js — articulated mascot. Two-segment limbs (real elbows &
   knees with joint caps), hands with fingers, little shoes/paws.
   window.buildPip(theme)    biped, front
   window.buildPipQ(theme)   quadruped, side (faces right)
   window.buildPipCrab(theme) crab, supine table, side
   Upper segments keep classes .arm-l/.arm-r/.leg-l/.leg-r so all
   existing animations still drive them; lower segments are
   .fore-l/.fore-r/.shin-l/.shin-r (animated for some moves).
   ============================================================ */
(function () {
  const OUT = "#26343c";
  const ORANGE = "#ff7b54";   // LEFT limbs
  const BLUE = "#4d96ff";     // RIGHT limbs
  const PINK = "#ff9bb0";

  function dflt(t) {
    t = t || {};
    return {
      body: t.body || "#2cb6a3", belly: t.belly || "#fff1d6",
      accent: t.accent || "#1d8f80", ears: t.ears || "round",
      outline: t.outline || OUT,
      armL: t.armL || ORANGE, armR: t.armR || BLUE,
      legL: t.legL || ORANGE, legR: t.legR || BLUE,
      tail: t.tail || (t.accent || "#1d8f80"),
    };
  }

  // ---- detailed hand with 4 fingers + thumb (fingers point down) ----
  function hand(x, y, col, o, dir) {
    dir = dir || 1;
    const fin = (fx, h) => `<rect x="${fx}" y="${y}" width="6" height="${h}" rx="3" fill="${col}" stroke="${o}" stroke-width="3"/>`;
    return `<g class="hand">
      ${fin(x - 12, 15)}${fin(x - 5.5, 18)}${fin(x + 0.5, 17)}${fin(x + 6.5, 14)}
      <rect x="${x + 8 * dir + (dir < 0 ? -7 : 0)}" y="${y - 5}" width="7" height="13" rx="3.5"
        fill="${col}" stroke="${o}" stroke-width="3" transform="rotate(${38 * dir} ${x + 10 * dir} ${y})"/>
      <rect x="${x - 14}" y="${y - 13}" width="28" height="19" rx="9" fill="${col}" stroke="${o}" stroke-width="4"/>
    </g>`;
  }

  // ---- little shoe (toe points by dir) ----
  function foot(x, y, col, o, dir) {
    dir = dir || 1;
    const a = x - 13, b = x + 19 * dir;
    return `<g class="foot"><path d="M ${x - 12 * 1} ${y - 9}
      q ${-7 * 1} 17 ${4} 19 l ${16 * dir} 0 q ${8 * dir} -1 ${6 * dir} -10 q ${-1 * dir} -9 ${-11 * dir} -9 z"
      fill="${col}" stroke="${o}" stroke-width="4" stroke-linejoin="round"/></g>`;
  }

  // ---- paw for quadruped ----
  function paw(x, y, col, o) {
    return `<g><ellipse cx="${x}" cy="${y}" rx="15" ry="11" fill="${col}" stroke="${o}" stroke-width="4"/>
      <circle cx="${x - 6}" cy="${y + 3}" r="3" fill="${o}" opacity=".4"/>
      <circle cx="${x}" cy="${y + 4}" r="3" fill="${o}" opacity=".4"/>
      <circle cx="${x + 6}" cy="${y + 3}" r="3" fill="${o}" opacity=".4"/></g>`;
  }

  function ears(t) {
    const o = t.outline, a = t.accent, b = t.body;
    switch (t.ears) {
      case "bear": return `<circle cx="86" cy="52" r="22" fill="${b}" stroke="${o}" stroke-width="4"/><circle cx="154" cy="52" r="22" fill="${b}" stroke="${o}" stroke-width="4"/><circle cx="86" cy="52" r="10" fill="${a}"/><circle cx="154" cy="52" r="10" fill="${a}"/>`;
      case "cat": return `<path d="M70,58 L78,18 L104,46 Z" fill="${b}" stroke="${o}" stroke-width="4" stroke-linejoin="round"/><path d="M170,58 L162,18 L136,46 Z" fill="${b}" stroke="${o}" stroke-width="4" stroke-linejoin="round"/><path d="M76,52 L80,30 L94,46 Z" fill="${a}"/><path d="M164,52 L160,30 L146,46 Z" fill="${a}"/>`;
      case "dog": return `<ellipse cx="74" cy="64" rx="16" ry="30" fill="${a}" stroke="${o}" stroke-width="4"/><ellipse cx="166" cy="64" rx="16" ry="30" fill="${a}" stroke="${o}" stroke-width="4"/>`;
      case "antennae": return `<g stroke="${o}" stroke-width="5" stroke-linecap="round"><path d="M104,46 Q98,18 92,12" fill="none"/><path d="M136,46 Q142,18 148,12" fill="none"/></g><circle cx="91" cy="11" r="7" fill="${a}" stroke="${o}" stroke-width="3"/><circle cx="149" cy="11" r="7" fill="${a}" stroke="${o}" stroke-width="3"/>`;
      case "flamingo": return `<path d="M104,40 Q120,2 150,16 Q126,18 134,44 Z" fill="${a}" stroke="${o}" stroke-width="4" stroke-linejoin="round"/>`;
      case "crown": return `<path d="M86,46 L92,18 L110,36 L120,12 L130,36 L148,18 L154,46 Z" fill="${a}" stroke="${o}" stroke-width="4" stroke-linejoin="round"/>`;
      case "star": return `<path d="M120,4 l7,20 21,1 -16,14 6,21 -18,-12 -18,12 6,-21 -16,-14 21,-1 z" fill="${a}" stroke="${o}" stroke-width="3.5" stroke-linejoin="round"/>`;
      case "snow": return `<g stroke="${a}" stroke-width="4" stroke-linecap="round"><path d="M120,14 v22 M110,20 l20,12 M130,20 l-20,12"/></g>`;
      case "leaf": return `<path d="M120,42 Q104,10 120,2 Q136,10 120,42 Z" fill="${a}" stroke="${o}" stroke-width="4"/>`;
      case "none": return ``;
      default: return `<circle cx="86" cy="54" r="18" fill="${b}" stroke="${o}" stroke-width="4"/><circle cx="154" cy="54" r="18" fill="${b}" stroke="${o}" stroke-width="4"/>`;
    }
  }

  function face() {
    return `
      <g class="eyes">
        <ellipse cx="101" cy="84" rx="13" ry="15" fill="#fff" stroke="${OUT}" stroke-width="3"/>
        <ellipse cx="139" cy="84" rx="13" ry="15" fill="#fff" stroke="${OUT}" stroke-width="3"/>
        <circle cx="104" cy="87" r="6" fill="#2a2018"/><circle cx="142" cy="87" r="6" fill="#2a2018"/>
        <circle cx="106" cy="85" r="2" fill="#fff"/><circle cx="144" cy="85" r="2" fill="#fff"/>
      </g>
      <circle cx="83" cy="104" r="9" fill="${PINK}" opacity="0.85"/><circle cx="157" cy="104" r="9" fill="${PINK}" opacity="0.85"/>
      <path d="M104,106 Q120,122 136,106" fill="none" stroke="#3a2a20" stroke-width="5" stroke-linecap="round"/>`;
  }

  // ---------- BIPED ----------
  window.buildPip = function (theme) {
    const t = dflt(theme), o = t.outline;
    // arm: shoulder(sx,152) -> elbow(sx,200) -> wrist(sx,242)
    const arm = (side, sx, col) => `
      <g class="arm arm-${side}">
        <rect x="${sx - 11}" y="150" width="22" height="52" rx="11" fill="${col}" stroke="${o}" stroke-width="4"/>
        <g class="fore fore-${side}">
          <rect x="${sx - 10}" y="198" width="20" height="46" rx="10" fill="${col}" stroke="${o}" stroke-width="4"/>
          ${hand(sx, 244, col, o, side === "l" ? -1 : 1)}
        </g>
        <circle cx="${sx}" cy="200" r="9" fill="${col}" stroke="${o}" stroke-width="3.5"/>
      </g>`;
    // leg: hip(hx,246) -> knee(hx,280) -> ankle(hx,304)
    const leg = (side, hx, col) => `
      <g class="leg leg-${side}">
        <rect x="${hx - 13}" y="244" width="26" height="40" rx="13" fill="${col}" stroke="${o}" stroke-width="4"/>
        <g class="shin shin-${side}">
          <rect x="${hx - 12}" y="280" width="24" height="28" rx="12" fill="${col}" stroke="${o}" stroke-width="4"/>
          ${foot(hx, 306, col, o, side === "l" ? -1 : 1)}
        </g>
        <circle cx="${hx}" cy="280" r="10.5" fill="${col}" stroke="${o}" stroke-width="3.5"/>
      </g>`;
    return `
    <svg class="pip" viewBox="0 0 240 330" xmlns="http://www.w3.org/2000/svg">
      <ellipse class="shadow" cx="120" cy="320" rx="64" ry="12"/>
      <g class="char">
        ${leg("r", 136, t.legR)}
        ${leg("l", 104, t.legL)}
        <g class="upper">
          <ellipse class="torso" cx="120" cy="190" rx="56" ry="58" fill="${t.body}" stroke="${o}" stroke-width="4"/>
          <ellipse class="belly" cx="120" cy="198" rx="34" ry="40" fill="${t.belly}"/>
          ${arm("r", 166, t.armR)}
          ${arm("l", 74, t.armL)}
          <g class="head">
            ${ears(t)}
            <circle cx="120" cy="86" r="48" fill="${t.body}" stroke="${o}" stroke-width="4"/>
            ${face()}
          </g>
        </g>
      </g>
    </svg>`;
  };

  // ---------- QUADRUPED ----------
  window.buildPipQ = function (theme) {
    const t = dflt(theme), o = t.outline;
    // limb: shoulder/hip (x,196) -> knee (x,244) -> floor paw (x,290), slight bend baked
    const qlimb = (cls, x, col, bend) => `
      <g class="${cls}">
        <rect x="${x - 9}" y="194" width="18" height="54" rx="9" fill="${col}" stroke="${o}" stroke-width="4"/>
        <g transform="rotate(${bend} ${x} 244)">
          <rect x="${x - 9}" y="242" width="18" height="50" rx="9" fill="${col}" stroke="${o}" stroke-width="4"/>
          ${paw(x + 2, 292, col, o)}
        </g>
        <circle cx="${x}" cy="244" r="9" fill="${col}" stroke="${o}" stroke-width="3.5"/>
      </g>`;
    const far = t.accent;
    return `
    <svg class="pip-q" viewBox="0 0 240 330" xmlns="http://www.w3.org/2000/svg">
      <ellipse class="shadow" cx="120" cy="306" rx="100" ry="12"/>
      <g class="q-char">
        <g class="q-tail"><path d="M52,182 Q22,176 26,200 Q40,192 56,196 Z" fill="${t.tail}" stroke="${o}" stroke-width="4" stroke-linejoin="round"/></g>
        ${qlimb("q-arm-f", 150, far, -6)}
        ${qlimb("q-leg-f", 84, far, 6)}
        <g class="q-body">
          <ellipse cx="118" cy="186" rx="74" ry="42" fill="${t.body}" stroke="${o}" stroke-width="4"/>
          <ellipse cx="120" cy="204" rx="48" ry="22" fill="${t.belly}" opacity="0.9"/>
        </g>
        ${qlimb("q-arm-n", 158, t.legL, -8)}
        ${qlimb("q-leg-n", 92, t.legR, 8)}
        <g class="q-head">
          ${qears(t)}
          <circle cx="184" cy="164" r="40" fill="${t.body}" stroke="${o}" stroke-width="4"/>
          <ellipse cx="200" cy="160" rx="11" ry="13" fill="#fff" stroke="${o}" stroke-width="3"/>
          <circle cx="203" cy="163" r="5.5" fill="#2a2018"/>
          <circle cx="186" cy="188" r="7" fill="${PINK}" opacity="0.85"/>
          <path d="M198,180 Q210,188 218,180" fill="none" stroke="#3a2a20" stroke-width="4.5" stroke-linecap="round"/>
        </g>
      </g>
    </svg>`;
  };

  function qears(t) {
    const o = t.outline, a = t.accent, b = t.body;
    switch (t.ears) {
      case "bear": return `<circle cx="172" cy="130" r="16" fill="${b}" stroke="${o}" stroke-width="4"/><circle cx="172" cy="130" r="7" fill="${a}"/>`;
      case "cat": return `<path d="M166,136 L168,106 L188,128 Z" fill="${b}" stroke="${o}" stroke-width="4" stroke-linejoin="round"/>`;
      case "dog": return `<ellipse cx="168" cy="148" rx="13" ry="24" fill="${a}" stroke="${o}" stroke-width="4"/>`;
      case "antennae": return `<path d="M192,130 Q198,106 204,100" fill="none" stroke="${o}" stroke-width="5" stroke-linecap="round"/><circle cx="205" cy="99" r="6" fill="${a}" stroke="${o}" stroke-width="3"/>`;
      default: return `<circle cx="170" cy="134" r="13" fill="${b}" stroke="${o}" stroke-width="4"/>`;
    }
  }

  // ---------- CRAB (supine table) ----------
  window.buildPipCrab = function (theme) {
    const t = dflt(theme), o = t.outline;
    // limb from table (x,150) down to floor; knee mid, hand/foot at bottom
    const limb = (cls, x, col, isHand) => `
      <g class="${cls}">
        <rect x="${x - 9}" y="150" width="18" height="74" rx="9" fill="${col}" stroke="${o}" stroke-width="4"/>
        <g transform="translate(0,0)">
          <rect x="${x - 9}" y="222" width="18" height="64" rx="9" fill="${col}" stroke="${o}" stroke-width="4"/>
          ${isHand ? hand(x, 288, col, o, 1) : `<ellipse cx="${x + 2}" cy="290" rx="15" ry="9" fill="${col}" stroke="${o}" stroke-width="4"/>`}
        </g>
        <circle cx="${x}" cy="223" r="9" fill="${col}" stroke="${o}" stroke-width="3.5"/>
      </g>`;
    return `
    <svg class="pip-c" viewBox="0 0 240 330" xmlns="http://www.w3.org/2000/svg">
      <ellipse class="shadow" cx="120" cy="308" rx="96" ry="12"/>
      <g class="c-char">
        ${limb("c-arm", 160, t.accent, true)}
        ${limb("c-leg", 104, t.accent, false)}
        ${limb("c-arm", 172, t.armR, true)}
        ${limb("c-leg", 92, t.legL, false)}
        <g class="c-body">
          <ellipse cx="120" cy="150" rx="66" ry="30" fill="${t.body}" stroke="${o}" stroke-width="4"/>
          <ellipse cx="120" cy="146" rx="46" ry="18" fill="${t.belly}" opacity="0.92"/>
        </g>
        <g class="c-head">
          <circle cx="196" cy="128" r="26" fill="${t.body}" stroke="${o}" stroke-width="4"/>
          <g stroke="${o}" stroke-width="4" stroke-linecap="round"><path d="M188,108 L184,90" fill="none"/><path d="M204,108 L208,90" fill="none"/></g>
          <circle cx="184" cy="88" r="7" fill="#fff" stroke="${o}" stroke-width="3"/><circle cx="208" cy="88" r="7" fill="#fff" stroke="${o}" stroke-width="3"/>
          <circle cx="184" cy="89" r="3" fill="#2a2018"/><circle cx="208" cy="89" r="3" fill="#2a2018"/>
          <circle cx="186" cy="138" r="6" fill="${PINK}" opacity="0.85"/>
          <path d="M188,132 Q196,140 206,132" fill="none" stroke="#3a2a20" stroke-width="4.5" stroke-linecap="round"/>
        </g>
      </g>
    </svg>`;
  };

  // ---------- HANDS CLOSE-UP (two REALISTIC 3D hands; rendered by hands3d.js via WebGL) ----------
  // PipStage detects rig:"hands", sizes this canvas, and hands it to window.Hands3D.
  window.buildPipHands = function () {
    return `<canvas class="pip-h pip3d-canvas" width="300" height="300"></canvas>`;
  };
})();
