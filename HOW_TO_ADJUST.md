# How to adjust Wiggle & Think later

Plain-language guide for changing anything on **play.mwmai.no**. You don't need to
write code — for each thing below, just tell Claude *"change X"* and point at the
row. The file paths are so Claude (or you) knows exactly where to look.

> **The golden rule:** every change goes `edit source → build → deploy`.
> Claude does all three. Nothing is live until it's deployed.

---

## The two commands that publish a change

```bash
node build.mjs                                            # source → dist/
rsync -az --delete dist/ mats@204.168.244.173:/var/www/play/   # dist/ → live
```

Then commit + push so the repo matches:
```bash
git add -A && git commit -m "..." && git push origin main
```

To preview locally before deploying: `node build.mjs` then open `dist/index.html`
(or serve `dist/` and visit it). What you see in `dist/` is exactly what deploys.

---

## "I want to change…" → where it lives

| What you want to change | File | What to tell Claude |
|---|---|---|
| **An exercise's name, kid-text, steps, easy/tricky tips** | `src/assets/data.js` (the big list of exercises) | "On exercise N (name), change the wording to …" |
| **The on-screen captions during the move** (the synced breakdown) | `src/assets/data.js` → `window.PHASES` | "Change the phase captions for exercise N to …" |
| **Add / remove / reorder exercises** | `src/assets/data.js` | "Add a new exercise that does …" / "Drop exercise N" / "Move N before M" |
| **Which character does a move** (Sonic vs 3D Pip floor-creature vs 3D hands vs flat mascot) | `src/assets/data.js` → `rig:` + `window.SONIC_MAP` / `window.FLOOR_MAP` | "Make exercise N use Sonic / the hands / the floor creature" |
| **The guided session order** (the "play all" routine) | `src/assets/data.js` → `window.SESSION` | "Put these moves in the session, in this order …" |
| **A Sonic standing/jump/balance pose** (how the move actually looks) | `tools/build_sonic_anims.py` → rebakes `src/assets/anim/sonic_anim.glb` | "Sonic's arms are wrong on windmill — fix the pose" |
| **A hand shape or finger drill** (the Clever-Hands moves) | `src/assets/hands3d.js` (`SHAPES`, `POSES`, `DURATION`) | "Make the beak tighter" / "Add a new finger drill that …" |
| **A floor / all-fours move** (bear, crab, inch, cat-cow, dog) | `src/assets/floor3d.js` | "The dog pose should round its back more" |
| **Sounds / music cues** | `src/assets/audio.js` | "Make the drum louder / change the count sound" |
| **Colors, fonts, card look** | `src/assets/char.css`, `app.css` | "Make the cards rounder / change the blue" |
| **Guide overlays** (centre line, breathing ring) | `src/assets/player.jsx` → `Overlay()` | "Add a midline guide to exercise N" |
| **Phone layout** | `src/assets/app.css` (the `@media (max-width:880px)` block) | "On phone the buttons are cut off — fix it" |

---

## How the 28 exercises are drawn (so you know what's possible)

Every exercise is a real 3D character now — there are **four** renderers:

1. **3D Sonic** — standing / jumping / balance moves + body drum. Poses are
   hand-authored in Blender (`tools/build_sonic_anims.py`) and baked into one file
   (`sonic_anim.glb`). Changing a Sonic pose = edit that script, re-run Blender,
   redeploy. This is the most involved one.
2. **3D hand rig** (`hands3d.js`) — the 8 Clever-Hands finger moves (21-28).
   Shapes are palm / fist / beak / point / peace, plus the counting & rps drills.
   Easy to tweak — it's plain math, no Blender.
3. **3D Pip creature** (`floor3d.js`) — the 5 floor / all-fours moves.
4. **Flat SVG mascot** — the fallback. *Currently nothing uses it* (all 28 are 3D),
   but it's still the safety net if a 3D move is ever removed from its map.

A move uses Sonic if its id is in `window.SONIC_MAP`, the floor creature if in
`window.FLOOR_MAP`, the hands if its `rig` is `"hands"`, otherwise the flat mascot.

---

## Checking a change actually worked

- **Hand moves:** `node tools/diag_hands.cjs` renders each finger drill as a
  4-photo strip (start → middle → end) so you can see the shapes without opening
  a browser. Output lands in `tools/diag-out/` (git-ignored).
- **Live site:** when Claude curls the site to verify, it must use the versioned
  URL (`assets/data.js?v=…`), not the bare path — the bare path is edge-cached and
  can look stale even when the deploy is fine. For you in a browser, a hard refresh
  (Ctrl-Shift-R, or pull-to-refresh on phone) always shows the current version.

---

## Notes / limits

- **Sonic is SEGA's character** — this site is personal / non-commercial only.
  Don't put ads on it or sell it.
- First load is a few MB (the 3D models). Fine on wifi; not optimised for slow
  mobile data yet.
- Full technical history + the rig gotchas live in the session handoff at
  `~/MWM-AI/memory/handoff-wiggle-and-think-2026-06-05.md`. Start a new session
  by saying **"wiggle-and-think"** and Claude will pick it up from there.
