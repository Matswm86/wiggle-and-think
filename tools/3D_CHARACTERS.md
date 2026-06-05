# Building animated 3D characters for the web (playbook)

How the 3D characters in this project work, and the exact, hard-won process to
add or fix one. Written after getting **Sonic doing real Mixamo motion-capture**
and **realistic 3D hands** rendering in a plain React + Three.js static site
(`play.mwmai.no`). Read this before touching `sonic3d.js` / `hands3d.js` or
adding a new character — it will save you the multi-day rabbit hole we already
went down.

---

## 0. TL;DR decision tree

- **Model ships its own animation clip(s)** (e.g. the rigged hand's "Open/Close")
  → sample that clip for clean poses, blend per-bone. → *Pattern A*.
- **You want a character to play EXTERNAL mocap** (e.g. Mixamo "Jumping Jacks")
  → the model MUST be cleanly rigged on a standard skeleton. If it's a random
  Sketchfab/marketplace export, **assume its rig is broken** and re-rig it
  through Mixamo first, then retarget in Blender. → *Pattern B*.
- Either way: render through ONE shared WebGL renderer and **pose bones by
  directly interpolating clip tracks — do NOT use `THREE.AnimationMixer`** (see
  the gotchas; it blanks these skinned meshes).

---

## 1. The runtime architecture (how a 3D rig plugs into the site)

The site is React (UMD) + transpiled JSX, no bundler. A 3D rig is an **ES module**
(`hands3d.js`, `sonic3d.js`) that sets a `window.*3D` global and renders to a
plain 2D `<canvas>` via an offscreen WebGL renderer.

1. **`data.js`** (classic script, loads first) exposes a plain map of which
   exercises use the rig, e.g. `window.SONIC_MAP = { jacks:"Jumping Jacks", ... }`.
   This must be available *synchronously* so `PipStage` can decide rig-vs-mascot
   on first render.
2. **`pip.js` → `pipHTML(ex)`**: if the exercise uses the rig, return
   `` `<canvas class="pip-s pip3d-canvas"></canvas>` `` instead of the SVG mascot.
3. **`ui.jsx` → `PipStage` effect**: if `window.SONIC_MAP[ex.id]`, size the
   canvas (`clientWidth * dpr`) and call `window.Sonic3D.mount(canvas, ex.id, opts)`.
   The deferred module may not have run yet, so: `if (window.Sonic3D) start();
   else window.addEventListener("sonic3d-ready", start, { once:true })`. The
   module dispatches `new Event("sonic3d-ready")` after setting the global.
4. **The engine module** (`sonic3d.js`):
   - ONE `WebGLRenderer({ alpha:true, preserveDrawingBuffer:true })`, fixed RES.
   - On a render: pose the skeleton, `renderer.render(scene, camera)`, then
     `ctx.drawImage(renderer.domElement, 0,0,w,h)` onto the target 2D canvas.
   - **Live** (only the open player's main stage): a `requestAnimationFrame`
     loop. **Static** (28-card grid + step thumbnails): render one frame.
     `isMain = className.includes("pstage")`. This keeps **one** WebGL context
     for all cards (browsers cap WebGL contexts ~16).
5. **`index.html`**: `<script type="module" src="assets/sonic3d.js?v=..">`.
   Imports must be **relative** (`./vendor/three.module.min.js`), NOT an
   importmap — an inline importmap is blocked by the strict CSP.
6. **`build.mjs`**: copy `assets/vendor` (Three + GLTFLoader + utils),
   `assets/models`, and `assets/anim` (the `.glb`s). Module `.js` files are
   copied verbatim (not transpiled).
7. **CSP** (Caddy, `play.mwmai.no`): GLTF embedded-texture decode needs
   `blob:` in **`connect-src` + `img-src` + `worker-src`**. Without it the model
   loads but renders untextured/black.

---

## 2. Pattern A — model with a bundled animation (the hands)

`rigged_hand.glb` ships an "Open/Close" clip. We never hand-author finger
rotations (that mangled the rig). Instead:

1. Load the glb. Sample the bundled clip across its whole duration with a
   `THREE.AnimationMixer` **at load time only** (`mixer.setTime`, read each
   bone `.quaternion`), and keep the **least-curled** frame as `openQ` and the
   **most-curled** as `closedQ` per bone. (The clip loops open→fist→open, so the
   endpoints are both "open" — scan the whole thing, don't just grab t=0/end.)
2. Pose a finger by **slerping** its bones `openQ → closedQ` by a 0..1 curl.
   Shapes are just curl arrays: palm `[0,0,0,0]`, fist `[1,1,1,1]`,
   point `[0,1,1,1]`, peace `[0,0,1,1]`, beak `[.6,.6,.6,.6]+adduct`.
3. Mirror for the left hand with `SkeletonUtils.clone` + a parent `scale.x = -1`
   and `material.side = DoubleSide`.
4. Orient front-facing by computing a basis from bones (wrist→middle-tip = up,
   index→pinky = across, cross = palm normal) and applying its inverse quaternion.

Lesson: **use the model's own clean poses; don't invent bone rotations** for an
unfamiliar rig — you don't know its joint limits, axes, or rest pose.

---

## 3. Pattern B — character + external Mixamo mocap (Sonic)

This is the one that took days. The short version: **a random rigged Sonic from
Sketchfab cannot play external Mixamo clips** — its rig is subtly broken. The fix
is a clean re-rig + a Blender retarget, all doable **headless** (no Blender MCP).

### 3a. Get a CLEAN rig (Mixamo, ~5 min, manual)
Mixamo's auto-rigger produces a clean standard skeleton.
- Mixamo only accepts **FBX / OBJ / ZIP** (not GLB). Convert your model to an FBX
  **mesh with the rig stripped**: `tools/blender_glb_to_fbx.py`
  (`blender --background --python tools/blender_glb_to_fbx.py -- in.glb out.fbx`).
- Upload that FBX to mixamo.com → place the auto-rigger markers → **Download**
  the rigged character: FBX Binary, **T-pose, With Skin**.

### 3b. Retarget the clips onto it (Blender, headless)
`tools/blender_retarget.py` (run with the system/portable `blender`):
```
blender --background --python tools/blender_retarget.py -- \
  <sonic_rigged.fbx> <orig_textured.glb> <out.glb> <dir_of_mixamo_clip_fbx>
```
What it does:
1. Import the Mixamo-rigged Sonic (target).
2. For each Mixamo clip FBX: import (source armature + action), add a
   **`COPY_ROTATION` constraint** on every target bone pointing at the matching
   source bone, **`target_space = owner_space = 'WORLD'`** (world-space copy is
   what absorbs bind/axis differences), then **`bpy.ops.nla.bake(...,
   visual_keying=True, clear_constraints=True)`**. Rename + `use_fake_user`.
3. **Restore textures** (Mixamo flattens materials to default → white body):
   import the original textured glb, match meshes by **vertex count**, copy the
   original material slots onto the re-rigged meshes.
4. Export one GLB, `export_animation_mode='ACTIONS'`, `export_skins=True`.

Bone-name normalisation (they differ at every stage):
`mixamorig:Hips` (Mixamo FBX) vs `mixamorig:Hips_01` (glТF export suffix) vs
`mixamorigHips` (some FBX importers drop the colon). Normalise:
`name.replace(/^mixamorig:?/,'').replace(/_\d+$/,'')`.

### 3c. Play the baked clips at runtime
The clips are now **native to the model's own skeleton**, so:
- `gltf.animations` → for each wanted clip, `track.createInterpolant()` per
  `*.quaternion` track, mapped to the bone by exact name.
- `poseAt(t)`: `bone.quaternion.set(...interp.evaluate(t*dur))`. **No retarget
  math, no AnimationMixer.**
- Frame the camera from the bbox (`Box3.setFromObject`) — Mixamo FBX is ~100×
  (cm) scale, so never hard-code distances; size the shadow plane + the key
  light's shadow frustum to `bbox.size.y` too.

---

## 4. Gotchas we actually hit (each cost hours)

- **Blank canvas, no errors, sensible bone positions, mesh gone** = the skinned
  mesh exploded from a rig mismatch. The model renders at *bind* but any
  external/absolute bone pose collapses it. Root cause: a broken/re-exported rig.
  Cure: clean Mixamo re-rig (§3a). Do not try to fix it with retarget math.
- **`THREE.AnimationMixer` blanks these skinned meshes** even with correct
  animations (the model's geometry is tiny, ~0.03, scaled up ~28× by node
  transforms; the mixer's binding doesn't survive it). **Use direct track
  interpolation** (`createInterpolant().evaluate`) instead — it always worked.
- **JS bind-relative retarget math (`tBind·sBind⁻¹·clip`) is NOT enough** when
  the export changed bone *axes* (not just rest rotation). Only a DCC
  (Blender world-space constraints) fixes axis changes. Don't burn time on the
  math path for a broken rig.
- **Mixamo strips textures** on the re-rigged download → restore by vertex-count
  material transfer (§3b.3).
- **Inline importmap is blocked by `script-src 'self'`** — vendor Three with
  relative imports instead, and rewrite the addon files' `from 'three'` to a
  relative path if you keep them as bare-specifier modules.
- **glTF embedded textures need `blob:`** in `connect-src`/`img-src`/`worker-src`.
- **Per-card WebGL contexts hit the browser cap** — one shared renderer, static
  snapshots for cards/thumbnails, live loop only for the open player.

---

## 5. Tools / environment

- Blender 4.2 LTS portable tarball runs headless with bundled glTF + FBX I/O:
  `https://download.blender.org/release/Blender4.2/blender-4.2.3-linux-x64.tar.xz`
  → extract → `./blender --background --python script.py -- args`.
- The interactive **blender-mcp / Claude Blender connector** exists but needs
  Blender open + the addon + an MCP entry in the Claude config; it's *not*
  required — headless scripting is better for batch retargets.
- Mixamo requires a free Adobe login (so the upload/download steps are manual).
- Three.js + GLTFLoader + SkeletonUtils are vendored under `src/assets/vendor/`.

---

## 6. Adding a new animated character (checklist)

1. Get/clean a rig (§2 if it ships clips, §3a if you want external mocap).
2. Retarget/bake if needed (§3b) → a `.glb` with the mesh + named actions.
3. New `<name>3d.js` modelled on `sonic3d.js` (shared renderer, `poseAt` direct
   interpolation, `mount` live/static, `*-ready` event).
4. `data.js`: `window.<NAME>_MAP = { exId: "Clip Name", ... }`.
5. `pip.js` `pipHTML`: return the canvas for those exercises.
6. `ui.jsx` `PipStage`: branch that mounts the engine (wait on the ready event).
7. `index.html`: `<script type="module">`. `build.mjs`: copy the `.glb`.
8. Verify headless with Playwright (load over http, sample painted pixels, screenshot)
   BEFORE deploying — "no console errors" ≠ "it rendered". Then deploy + live-check.
