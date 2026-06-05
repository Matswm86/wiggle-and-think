# Wiggle & Think — brain-activation movement games for kids (4–7)

Live: **https://play.mwmai.no**

A free, science-grounded movement site: **28 exercises** (20 full-body + 8
"Clever Hands" finger/coordination moves), an articulated mascot ("Pip") whose
poses are real CSS-keyframe movements, **realistic 3D hands** (Three.js/WebGL +
a rigged glTF model, `hands3d.js`) for the finger close-ups, a synced
step-by-step pose breakdown, a guided session mode, and an in-browser Web-Audio
beat engine (no audio files, no licensing). The honest-science framing (no
Brain-Gym / hemisphere / BDNF myths) comes from the research docs in
`src/_research/` (ETNIMU is the finger-move source).

### 3D hands (cards 21–25)
`hands3d.js` loads `assets/models/rigged_hand.glb` (rigged, 69-bone, textured),
mirrors it for the left hand, and rotates the real finger bones (flexion =
bone local-X) per exercise. ONE shared offscreen WebGLRenderer feeds every
canvas (live on the player stage; static snapshots for the grid + thumbnails)
to stay under the browser WebGL-context cap. Three.js is vendored under
`assets/vendor/` with **relative** imports (no importmap) so the strict CSP
holds. **Deploy note:** the `play.mwmai.no` CSP needs `blob:` in
`connect-src` + `img-src` + `worker-src` for glTF embedded-texture decode.
Pose choreography lives in `POSES`/`poseHand` and can be tuned with a
Playwright WebGL-screenshot harness.

## MERGE NOTE (important)
The design engine regenerates the app from the *original* demo, so a fresh
`Brain activation kids.zip` will NOT contain the local enhancement layers
(sound `sfxStep`, responsive/TV CSS, dynamic shadow / eye-blink / breathing
belly, card focus). When adopting a new design drop: take the new files as the
base, then re-apply those four patch layers (they are append-only blocks +
small inline edits, all documented in git/this tree). See the 2026-06-05 merge.

## Layout
```
src/
  index.html            # shell (React UMD + transpiled assets, no CDN)
  assets/
    data.js             # the 20 exercises + PHASES + BANDS + SESSION
    pip.js              # articulated SVG mascot (biped / quadruped / crab rigs)
    audio.js            # Web-Audio beat engine (bands A–E) + per-exercise SFX
    char.css            # rig pivots, eye-blink, breathing belly
    anim.css            # per-exercise keyframe movements + dynamic jump shadow
    app.css             # site styling
    *.jsx               # React components (transpiled to .js at build)
    vendor/             # React 18.3.1 production UMD (self-hosted)
  _research/            # the two source research/animation-brief docs
build.mjs               # JSX→JS transpile + vendor React → dist/  (no in-browser Babel)
verify.mjs / live-verify.mjs  # headless-browser render + console-error checks
dist/                   # built static site (what gets deployed)
```

## Build & verify
```bash
node build.mjs      # → dist/  (strict-CSP, no unpkg, no unsafe-eval)
node verify.mjs     # headless render of dist/ + screenshots + error capture
```

## Deploy
```bash
rsync -az --delete dist/ mats@204.168.244.173:/var/www/play/
# Caddy vhost: play.mwmai.no → /var/www/play (already configured)
ssh mats@204.168.244.173 'sudo systemctl reload caddy'
node live-verify.mjs   # end-to-end test against the live domain
```

## What changed from the original demo
- **Architecture:** pre-transpiled JSX + self-hosted React → dropped the 3 MB
  in-browser Babel and the unpkg dependency; serves under a strict CSP
  (`script-src 'self'`, no `unsafe-eval`). Fast first paint on tablets.
- **Sound at each exercise:** kept the per-band groove and added a movement-SFX
  layer (`audio.js` `sfxStep`) — jump boing+landing thud, body-drum
  stomp-stomp-clap-pat, flamingo hops, arm whooshes, heel-toe step ticks,
  inhale/exhale breath chimes.
- **More realistic / clearer animation:** dynamic ground shadow that shrinks &
  fades when the character is airborne (jumps + flamingo hop), eye-blink for
  life (on its own clock, excluded from move timing & the pose filmstrip), and
  a breathing belly that balloons on the calm-down breath.
