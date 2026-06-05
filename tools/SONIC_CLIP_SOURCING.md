# Sonic Clip Sourcing — making every move faithful (2026-06-05)

Goal: Sonic on **all 23 non-hands exercises** (the 5 Clever-Hands rigs — palmbeak,
fistpalm, pointpalm, peacepalm, beakfist — stay as the 3D hands rig, untouched).

## How a clip gets wired (so the list below is actionable)
1. Download the Mixamo FBX **In Place** (no root travel — Sonic animates on the spot).
   "In Place" checkbox where the clip offers it; otherwise pick the in-place variant.
2. Drop the FBX in the bake input dir; the **filename, the action name, and the
   `SONIC_MAP` value must all be identical** (e.g. `Marching.fbx` → `march:"Marching"`).
3. Add the name to `FILES` in `tools/blender_retarget.py`, rerun the Blender bake →
   regenerates `src/assets/anim/sonic_anim.glb`. Add the `SONIC_MAP[exId]` entry in
   `src/assets/data.js`. DURATION is auto-derived. Build + deploy.

## ⚠️ Two hard engine limits (read before promising "Sonic everywhere")
- **Rotation only.** The bake uses a COPY_ROTATION constraint (`blender_retarget.py:25`)
  and the runtime interpolates only `*.quaternion` tracks (`sonic3d.js poseAt`). Root /
  hips **translation is dropped**. Fine for any UPRIGHT move. NOT fine for all-fours /
  floor moves — the hips never drop, so the character stays standing while limbs flail.
- **To do floor moves on Sonic** (bear, crab, inch, cat-cow, dog) needs a 3-part patch,
  not just a download: (a) add a COPY_LOCATION constraint on the hips to the bake,
  (b) apply the hips `.position` track in `sonic3d.js`, (c) re-fit the camera/ground to
  the moving box. Doable, but quality is not guaranteed — budget a visual check and a
  mascot fallback per move.

---

## TIER 1 — already baked & genuinely faithful → KEEP, no download (4)
| Ex | Clip (baked) | Note |
|---|---|---|
| jacks (Jumping Jacks) | `Jumping Jacks` | exact |
| clap (Clap & Echo) | `Clapping` | exact |
| kanga (Kangaroo Jumps) | `Jump` | vertical two-foot jump = faithful |
| freeze (Freeze Dance) | `Hip Hop Dancing` | dance; the FREEZE overlay covers the stop |

## TIER 2 — UPRIGHT, faithful Mixamo clip exists → DOWNLOAD + BAKE (7)
Rotation-only bake is fine for all of these.

| Ex | Mixamo search → download as | Confidence | What the clip must show |
|---|---|---|---|
| march (Cross-Crawl March) | `Marching` (or "March In Place") | HIGH | march on the spot, arms swing opposite to knees |
| starjump (Star Jumps) | `Star Jump` (fallback: reuse `Jumping Jacks`) | MED | explosive jump, arms+legs out to a star, land feet together |
| tree (Tree Pose) | `Yoga` / `Tree Pose` (Mixamo Yoga pack) | MED | stand on one leg, other foot to calf, hands up |
| airplane (Airplane/Warrior-3) | `Warrior Pose` / `Yoga` | MED | hinge forward, one leg lifts straight back, arms wing out |
| tightrope (Tightrope Walk) | `Balancing` / `Tightrope Walk` | MED | slow heel-toe walk along a line, arms out wide |
| windmill (Windmill Toe-Touch) | `Toe Touch` / `Standing Toe Touch` | MED | feet wide, reach one hand down to the opposite foot, back up to a T |
| breathe (Starfish Breathing) | KEEP `Breathing Idle` (optional upgrade: `Deep Breath`) | OK | calm standing breath; current baked clip is acceptable |

## TIER 3a — FLOOR / all-fours: clip may exist BUT needs the translation patch (5)
Do the 3-part engine/bake patch first, then download. Expect a visual-quality pass.

| Ex | Mixamo search → download as | Confidence | Risk |
|---|---|---|---|
| bear (Bear Crawl) | `Bear Crawl` / `Crawling` (In Place) | MED | hips must drop to floor (patch) |
| dog (Downward Dog) | `Yoga` / `Downward Dog` | MED | inverted-V; needs hips height |
| catcow (Cat-Cow) | `Cat Cow` / `Cat Stretch` | MED | on hands+knees; needs hips height |
| inch (Inchworm) | `Inchworm` (fitness pack) — may not exist | LOW | likely custom if absent |
| crab (Crab Walk) | `Crab Walk` — rarely in library | LOW | likely custom if absent |

## TIER 3b — NO faithful Mixamo clip → custom Blender animation (or keep mascot) (6)
These are not single mocap motions. A generic clip (Running/Waving/Idle) is exactly the
"not true to the exercise" problem we are removing. Options per move: author a short
custom animation on the clean Sonic rig (the rig + pipeline exist), OR leave on the
accurate SVG mascot. Recommend deciding per-move — do not ship a vibe-match.

| Ex | Why no clip | Suggested path |
|---|---|---|
| simon (Simon Says) | it's a listening game, not one motion | custom: idle → does a called move; or mascot |
| drum (Body Drum) | stomp-stomp-clap-pat sequence | custom 4-beat loop; or mascot |
| lazy8 (Lazy-8 air trace) | arm traces a figure-8 | custom arm-trace synced to the ov8 overlay; or mascot |
| flamingo (Flamingo Hop) | one-leg hop, wings out | `Hopping`/`Balance` is partial; custom or mascot |
| fistflat (Fist & Flat Swap) | arm-out fist/flat swap | custom; or mascot |
| magicnumbers (Magic Numbers) | draw mirrored numbers, both arms | custom; or mascot |
| noseear (Nose & Ear Switch) | cross-body nose/ear touch | custom; or mascot |

---

## What I need from you (the fetch batch)
Log into Mixamo (free Adobe login), search each **TIER 2** term, download the closest
faithful match **In Place** as FBX named exactly per the table (7 files). If you want to
attempt the floor moves, also grab the **TIER 3a** ones and tell me — I'll do the
translation patch first. TIER 3b I'll bring back to you with custom-animation vs mascot
recommendations before doing anything.

Honest scope: ~7 quick wins (Tier 2), ~5 floor moves gated on an engine patch (Tier 3a),
~6 with no faithful clip (Tier 3b). "Sonic on everything, all faithful" is reachable but
is not just 18 downloads — it's 7 downloads + 1 engine/bake patch + ~6 custom animations.
