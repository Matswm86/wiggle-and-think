> **Full playbook: [`3D_CHARACTERS.md`](3D_CHARACTERS.md)** — architecture, both rig patterns,
> the Blender retarget pipeline, and every gotcha. Read it before adding/fixing a 3D character.

# Sonic animation pipeline (Blender, headless)

The site's Sonic (`src/assets/anim/sonic_anim.glb`) = a clean Mixamo re-rig of
Sonic with 8 Mixamo mocap clips retargeted + baked on, plus the original
textures restored. Built headless with Blender 4.2:

1. `blender_glb_to_fbx.py` — strip the (broken Sketchfab) rig from a Sonic GLB,
   export a clean mesh FBX to upload to mixamo.com (auto-rig → download rigged FBX).
2. `blender_retarget.py` — import the Mixamo-rigged Sonic FBX + the 8 Mixamo clip
   FBX, world-space constraint-retarget each clip onto Sonic, bake, restore the
   original textures by vertex-count mesh match, export one GLB with all actions.

Run: `blender --background --python tools/blender_retarget.py -- <sonic_rigged.fbx> <orig_sonic.glb> <out.glb> <clip_fbx_dir>`

Runtime (`sonic3d.js`) interpolates each clip's rotation tracks directly onto the
bones (an AnimationMixer blanks this skinned mesh). Clips are native to the
skeleton, so no retargeting math is needed in-browser.
