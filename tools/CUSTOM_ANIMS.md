# Custom Sonic Animations — authoring pipeline (2026-06-05)

Mixamo has no faithful clips for the kids-PE/yoga moves, so we hand-author them as
keyframed poses on the clean Sonic rig and bake into `src/assets/anim/sonic_anim.glb`
alongside the real Mixamo clips. Engine plays them via direct quaternion-track
interpolation (`sonic3d.js`), so only ROTATION is used (no root translation).

## Run it
```
/tmp/blender/blender -b -P tools/build_sonic_anims.py -- /tmp/sonic_new.glb
cp /tmp/sonic_new.glb src/assets/anim/sonic_anim.glb
node build.mjs && rsync -az --delete dist/ mats@204.168.244.173:/var/www/play/
```
The script imports the current GLB (keeps mesh + 8 baked Mixamo clips + textures),
renames the real clips to clean names, drops import junk, authors the `MOVES` dict as
new actions, and re-exports. Verify after: animation names must be clean (no
`_Armature`), textures must survive — check with the GLB JSON dump.

## Rig facts (hard-won — see git history of this session)
- Mixamo skeleton `mixamorig:*`. World after glTF import: **+Z up, −Y forward
  (face), +X = character's LEFT**. (Bone-local +Y does NOT match the visible limb —
  glTF joint-axis skew — so pose by LOCAL EULER, not world-aim.)
- Author with `set_pose_local({Bone:(rx,ry,rz)deg})`. `reset()` first.
  **Must `arm.animation_data_clear()` before posing** or the imported action overrides
  your basis on eval. **Do NOT clear animation_data before export** or ACTIONS-mode
  export drops all animations (keep the block, leave one action assigned).
- Camera/framing: fix once from the REST pose (height = bbox **Z**), like
  `sonic3d.js frameCamera`. Exclude the stray `Icosphere` mesh from bbox.

## Calibrated pose vocabulary (right side; mirror left by negating the Y value)
| Intent | Bones (deg) |
|---|---|
| arm out to side (T) | `Arm Y=+90` (left `Y=-90`) |
| arm forward | `Arm X=+75` · back `X=-30` |
| arm up / overhead | `Arm X≈+150` (forward-up; pure Y abduction only reaches horizontal) |
| forearm bend | `ForeArm X=+40` |
| high knee (march) | `UpLeg X=-95, Leg X=+80` |
| leg back (airplane) | `UpLeg X=+55` |
| foot-to-calf (tree) | `UpLeg X=-55 Y=+35, Leg X=+125` |
| spine bend forward | `Spine X=+55..72 (+Spine1 X≈+10)` |

## Status
- ✅ Faithful now (baked): **jacks, clap, kanga, freeze** (Mixamo) +
  **starjump** (→Jumping Jacks) + custom **march, tree, airplane, flamingo,
  tightrope, windmill, breathe**.
- ⏳ Queued (still on a generic clip — sequence / fine-hand): **simon** (listen→move),
  **drum** (stomp-clap-pat), **lazy8** (figure-8 trace), **fistflat**, **magicnumbers**,
  **noseear** (cross-body hand work — may read poorly on a whole-body character).
- 🚧 Floor / all-fours (**bear, crab, inch, catcow, dog**): stay on SVG mascot until
  the engine + bake get **hips-translation** support (COPY_LOCATION on hips in the
  bake + apply the hips `.position` track in `sonic3d.js poseAt` + re-fit camera).

Quality bar: stylized but clearly correct. Refine `MOVES` angles and re-run.
