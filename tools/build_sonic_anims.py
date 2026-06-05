import bpy, math, sys
from mathutils import Vector, Matrix
SRC = "/home/mats/MWM-AI/projects/wiggle-and-think/src/assets/anim/sonic_anim.glb"
OUT = sys.argv[sys.argv.index("--")+1]
B = "mixamorig:"
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=SRC)
arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')

def depth(b):
    d = 0
    while b.parent: b = b.parent; d += 1
    return d
ORDER = sorted([pb.name.replace(B, "") for pb in arm.pose.bones], key=lambda n: depth(arm.pose.bones[B + n].bone))
for pb in arm.pose.bones: pb.rotation_mode = 'QUATERNION'
def reset():
    for pb in arm.pose.bones: pb.matrix_basis = Matrix.Identity(4)

# ---- joint-position aim (armature frame: up=+Y, down=-Y, char-left=+X, fwd/face=-Z) ----
CHILD = {"Arm": "ForeArm", "ForeArm": "Hand", "UpLeg": "Leg", "Leg": "Foot", "Foot": "ToeBase",
         "Spine": "Spine1", "Spine1": "Spine2", "Spine2": "Neck", "Neck": "Head", "Head": "HeadTop_End"}
def aimv(name, child, tgt):
    pb = arm.pose.bones.get(B + name); cb = arm.pose.bones.get(B + child)
    if not pb or not cb: return
    bpy.context.view_layer.update()
    cur = (cb.matrix.translation - pb.matrix.translation)
    if cur.length < 1e-6: return
    q = cur.normalized().rotation_difference(Vector(tgt).normalized())
    M = pb.matrix.copy()
    pb.matrix = Matrix.Translation(M.translation) @ (q.to_matrix() @ M.to_3x3()).to_4x4()
    bpy.context.view_layer.update()
def set_pose(p):
    reset()
    for n in ORDER:
        if n not in p: continue
        base = n.replace("Left", "").replace("Right", "")
        ch = CHILD.get(base)
        if not ch: continue
        side = "Left" if n.startswith("Left") else ("Right" if n.startswith("Right") else "")
        t = p[n]
        aimv(n, side + ch, (t[0], t[1], -t[2]))   # forward is +Z in armature space; literals use -Z, flip here
    bpy.context.view_layer.update()

# direction shorthands (armature frame)
def v(x, y, z): return (x, y, z)
DOWN = (0, -1, 0)
def P(**k): return dict(k)

# straight-down stand (per leg) helper values reused a lot
LEGDN = dict(UpLeg=(0, -1, 0), Leg=(0, -1, -0.05))

# =====================================================================
# MOVES — each a list of (frame, pose). pose = boneName -> world-dir target.
# Distinct, readable choreography; clean limbs because aim is exact.
# =====================================================================
MOVES = {
 # MARCH (cam 3/4): high knee + opposite-arm forward swing, alternating
 "march": [
   (1,  P(RightUpLeg=(0,0.55,-0.85), RightLeg=(0,-1,-0.15), LeftUpLeg=(0,-1,0), LeftLeg=(0,-1,-0.05),
          LeftArm=(0,0.05,-1), LeftForeArm=(0,0.05,-1), RightArm=(0,-0.2,1), RightForeArm=(0,-0.2,0.95))),
   (15, P(LeftUpLeg=(0,0.55,-0.85), LeftLeg=(0,-1,-0.15), RightUpLeg=(0,-1,0), RightLeg=(0,-1,-0.05),
          RightArm=(0,0.05,-1), RightForeArm=(0,0.05,-1), LeftArm=(0,-0.2,1), LeftForeArm=(0,-0.2,0.95))),
   (30, P(RightUpLeg=(0,0.55,-0.85), RightLeg=(0,-1,-0.15), LeftUpLeg=(0,-1,0), LeftLeg=(0,-1,-0.05),
          LeftArm=(0,0.05,-1), LeftForeArm=(0,0.05,-1), RightArm=(0,-0.2,1), RightForeArm=(0,-0.2,0.95)))],

 # TREE (front): one foot to opposite calf, knee out; arms overhead like branches. switch legs.
 "tree": [
   (1,  P(RightUpLeg=(-0.45,-0.7,0), RightLeg=(0.5,0.45,0), LeftUpLeg=(0,-1,0), LeftLeg=(0,-1,-0.05),
          LeftArm=(0.4,0.9,0), LeftForeArm=(0.35,0.96,0), RightArm=(-0.4,0.9,0), RightForeArm=(-0.35,0.96,0))),
   (30, P(RightUpLeg=(-0.45,-0.72,0), RightLeg=(0.52,0.43,0), LeftUpLeg=(0,-1,0), LeftLeg=(0,-1,-0.05),
          LeftArm=(0.45,0.88,0), LeftForeArm=(0.4,0.95,0), RightArm=(-0.35,0.92,0), RightForeArm=(-0.3,0.96,0))),
   (31, P(LeftUpLeg=(0.45,-0.7,0), LeftLeg=(-0.5,0.45,0), RightUpLeg=(0,-1,0), RightLeg=(0,-1,-0.05),
          LeftArm=(0.4,0.9,0), LeftForeArm=(0.35,0.96,0), RightArm=(-0.4,0.9,0), RightForeArm=(-0.35,0.96,0))),
   (60, P(LeftUpLeg=(0.45,-0.72,0), LeftLeg=(-0.52,0.43,0), RightUpLeg=(0,-1,0), RightLeg=(0,-1,-0.05),
          LeftArm=(0.45,0.88,0), LeftForeArm=(0.4,0.95,0), RightArm=(-0.35,0.92,0), RightForeArm=(-0.3,0.96,0)))],

 # AIRPLANE (cam slight 3/4): hinge forward, back leg lifted straight, arms out as wings
 "airplane": [
   (1,  P(Spine=(0,0.55,-0.84), Spine1=(0,0.5,-0.86), Spine2=(0,0.6,-0.8), Neck=(0,0.35,-0.94), Head=(0,0.4,-0.9),
          RightUpLeg=(0,-0.25,0.97), RightLeg=(0,-0.2,0.98), LeftUpLeg=(0,-1,0), LeftLeg=(0,-1,-0.05),
          LeftArm=(1,0.05,0), LeftForeArm=(1,0.05,0), RightArm=(-1,0.05,0), RightForeArm=(-1,0.05,0))),
   (30, P(Spine=(0,0.5,-0.86), Spine1=(0,0.45,-0.89), Spine2=(0,0.55,-0.83), Neck=(0,0.35,-0.94), Head=(0,0.4,-0.9),
          RightUpLeg=(0,-0.32,0.95), RightLeg=(0,-0.28,0.96), LeftUpLeg=(0,-1,0), LeftLeg=(0,-1,-0.05),
          LeftArm=(1,0.12,0), LeftForeArm=(1,0.12,0), RightArm=(-1,0.12,0), RightForeArm=(-1,0.12,0))),
   (60, P(Spine=(0,0.55,-0.84), Spine1=(0,0.5,-0.86), Spine2=(0,0.6,-0.8), Neck=(0,0.35,-0.94), Head=(0,0.4,-0.9),
          RightUpLeg=(0,-0.25,0.97), RightLeg=(0,-0.2,0.98), LeftUpLeg=(0,-1,0), LeftLeg=(0,-1,-0.05),
          LeftArm=(1,0.05,0), LeftForeArm=(1,0.05,0), RightArm=(-1,0.05,0), RightForeArm=(-1,0.05,0)))],

 # FLAMINGO (cam slight 3/4): one knee high in front, wings out, little hops; switch legs
 "flamingo": [
   (1,  P(RightUpLeg=(0,0.62,-0.78), RightLeg=(0,-1,-0.1), LeftUpLeg=(0,-1,0), LeftLeg=(0,-1,-0.05),
          LeftArm=(1,0.15,0), LeftForeArm=(1,0.15,0), RightArm=(-1,0.15,0), RightForeArm=(-1,0.15,0))),
   (8,  P(RightUpLeg=(0,0.5,-0.86), RightLeg=(0,-1,-0.1), LeftUpLeg=(0,-1,0), LeftLeg=(0,-1,-0.05),
          LeftArm=(1,0.28,0), LeftForeArm=(1,0.28,0), RightArm=(-1,0.28,0), RightForeArm=(-1,0.28,0))),
   (16, P(RightUpLeg=(0,0.62,-0.78), RightLeg=(0,-1,-0.1), LeftUpLeg=(0,-1,0), LeftLeg=(0,-1,-0.05),
          LeftArm=(1,0.15,0), LeftForeArm=(1,0.15,0), RightArm=(-1,0.15,0), RightForeArm=(-1,0.15,0))),
   (17, P(LeftUpLeg=(0,0.62,-0.78), LeftLeg=(0,-1,-0.1), RightUpLeg=(0,-1,0), RightLeg=(0,-1,-0.05),
          LeftArm=(1,0.15,0), LeftForeArm=(1,0.15,0), RightArm=(-1,0.15,0), RightForeArm=(-1,0.15,0))),
   (32, P(LeftUpLeg=(0,0.62,-0.78), LeftLeg=(0,-1,-0.1), RightUpLeg=(0,-1,0), RightLeg=(0,-1,-0.05),
          LeftArm=(1,0.15,0), LeftForeArm=(1,0.15,0), RightArm=(-1,0.15,0), RightForeArm=(-1,0.15,0)))],

 # TIGHTROPE (cam 3/4 side): arms out wide, slow heel-toe steps forward, slight lean
 "tightrope": [
   (1,  P(Spine=(0,0.95,-0.2), RightUpLeg=(0,-0.7,-0.6), RightLeg=(0,-1,-0.1), LeftUpLeg=(0,-0.95,0.25), LeftLeg=(0,-1,0.1),
          LeftArm=(1,0.05,-0.3), LeftForeArm=(1,0.05,-0.3), RightArm=(-1,0.05,-0.3), RightForeArm=(-1,0.05,-0.3))),
   (16, P(Spine=(0,0.95,-0.2), LeftUpLeg=(0,-0.7,-0.6), LeftLeg=(0,-1,-0.1), RightUpLeg=(0,-0.95,0.25), RightLeg=(0,-1,0.1),
          LeftArm=(1,0.05,-0.3), LeftForeArm=(1,0.05,-0.3), RightArm=(-1,0.05,-0.3), RightForeArm=(-1,0.05,-0.3))),
   (32, P(Spine=(0,0.95,-0.2), RightUpLeg=(0,-0.7,-0.6), RightLeg=(0,-1,-0.1), LeftUpLeg=(0,-0.95,0.25), LeftLeg=(0,-1,0.1),
          LeftArm=(1,0.05,-0.3), LeftForeArm=(1,0.05,-0.3), RightArm=(-1,0.05,-0.3), RightForeArm=(-1,0.05,-0.3)))],

 # WINDMILL (front): T, then reach hand to opposite foot, up, other side
 "windmill": [
   (1,  P(LeftArm=(1,0.05,0), LeftForeArm=(1,0.05,0), RightArm=(-1,0.05,0), RightForeArm=(-1,0.05,0))),
   (15, P(Spine=(0,0.35,-0.9), Spine1=(0,0.3,-0.95), Neck=(0,0.2,-0.95),
          RightArm=(0.55,-0.8,-0.15), RightForeArm=(0.55,-0.82,-0.1), LeftArm=(0.2,0.7,0.2), LeftForeArm=(0.2,0.75,0.15))),
   (30, P(LeftArm=(1,0.05,0), LeftForeArm=(1,0.05,0), RightArm=(-1,0.05,0), RightForeArm=(-1,0.05,0))),
   (45, P(Spine=(0,0.35,-0.9), Spine1=(0,0.3,-0.95), Neck=(0,0.2,-0.95),
          LeftArm=(-0.55,-0.8,-0.15), LeftForeArm=(-0.55,-0.82,-0.1), RightArm=(-0.2,0.7,0.2), RightForeArm=(-0.2,0.75,0.15))),
   (60, P(LeftArm=(1,0.05,0), LeftForeArm=(1,0.05,0), RightArm=(-1,0.05,0), RightForeArm=(-1,0.05,0)))],

 # BREATHE (front): big rainbow — arms rise overhead (in), float down (out)
 "breathe": [
   (1,  P(LeftArm=(0.5,-0.85,0), LeftForeArm=(0.5,-0.85,0), RightArm=(-0.5,-0.85,0), RightForeArm=(-0.5,-0.85,0))),
   (30, P(LeftArm=(0.4,0.9,0), LeftForeArm=(0.32,0.95,0), RightArm=(-0.4,0.9,0), RightForeArm=(-0.32,0.95,0))),
   (60, P(LeftArm=(0.5,-0.85,0), LeftForeArm=(0.5,-0.85,0), RightArm=(-0.5,-0.85,0), RightForeArm=(-0.5,-0.85,0)))],

 # MAGIC NUMBERS (front): both arms up-forward (pointer drawing), hands in front of chest, NOT face
 "magicnumbers": [
   (1,  P(LeftArm=(0.3,0.4,-0.86), LeftForeArm=(0.28,0.5,-0.82), RightArm=(-0.3,0.4,-0.86), RightForeArm=(-0.28,0.5,-0.82))),
   (20, P(LeftArm=(0.18,0.45,-0.87), LeftForeArm=(0.16,0.55,-0.82), RightArm=(-0.18,0.45,-0.87), RightForeArm=(-0.16,0.55,-0.82))),
   (40, P(LeftArm=(0.34,0.36,-0.87), LeftForeArm=(0.32,0.46,-0.83), RightArm=(-0.34,0.36,-0.87), RightForeArm=(-0.32,0.46,-0.83))),
   (60, P(LeftArm=(0.3,0.4,-0.86), LeftForeArm=(0.28,0.5,-0.82), RightArm=(-0.3,0.4,-0.86), RightForeArm=(-0.28,0.5,-0.82)))],

 # LAZY-8 (front): one arm forward-up tracing, sweeps side to side (ov8 overlay shows the 8)
 "lazy8": [
   (1,  P(RightArm=(-0.45,0.35,-0.82), RightForeArm=(-0.45,0.4,-0.8), LeftArm=(0.4,-0.85,0), LeftForeArm=(0.4,-0.85,0))),
   (20, P(RightArm=(0.05,0.5,-0.86), RightForeArm=(0.05,0.55,-0.83), LeftArm=(0.4,-0.85,0), LeftForeArm=(0.4,-0.85,0))),
   (40, P(RightArm=(0.45,0.35,-0.82), RightForeArm=(0.45,0.4,-0.8), LeftArm=(0.4,-0.85,0), LeftForeArm=(0.4,-0.85,0))),
   (60, P(RightArm=(-0.45,0.35,-0.82), RightForeArm=(-0.45,0.4,-0.8), LeftArm=(0.4,-0.85,0), LeftForeArm=(0.4,-0.85,0)))],

 # NOSE & EAR (front): one hand up over head, other up to face; switch (best-effort cross-body)
 "noseear": [
   (1,  P(RightArm=(-0.1,0.88,-0.2), RightForeArm=(0.2,0.55,-0.4), LeftArm=(0.12,0.45,-0.82), LeftForeArm=(0.05,0.8,-0.4))),
   (20, P(LeftArm=(0.1,0.88,-0.2), LeftForeArm=(-0.2,0.55,-0.4), RightArm=(-0.12,0.45,-0.82), RightForeArm=(-0.05,0.8,-0.4))),
   (40, P(RightArm=(-0.1,0.88,-0.2), RightForeArm=(0.2,0.55,-0.4), LeftArm=(0.12,0.45,-0.82), LeftForeArm=(0.05,0.8,-0.4)))],

 # FIST & FLAT (front): one arm out to the side, other hand to chest; swap
 "fistflat": [
   (1,  P(RightArm=(-1,0.05,0), RightForeArm=(-1,0.05,0), LeftArm=(0.15,0.1,-0.8), LeftForeArm=(-0.1,0.55,-0.5))),
   (20, P(LeftArm=(1,0.05,0), LeftForeArm=(1,0.05,0), RightArm=(-0.15,0.1,-0.8), RightForeArm=(0.1,0.55,-0.5))),
   (40, P(RightArm=(-1,0.05,0), RightForeArm=(-1,0.05,0), LeftArm=(0.15,0.1,-0.8), LeftForeArm=(-0.1,0.55,-0.5)))],

 # BODY DRUM (cam 3/4): stomp R, stomp L, CLAP (hands meet chest), PAT (thighs)
 "drum": [
   (1,  P(RightUpLeg=(0,0.5,-0.82), RightLeg=(0,-1,-0.1), LeftUpLeg=(0,-1,0), LeftLeg=(0,-1,-0.05),
          LeftArm=(0.25,-0.35,-0.55), LeftForeArm=(0.1,0.1,-0.95), RightArm=(-0.25,-0.35,-0.55), RightForeArm=(-0.1,0.1,-0.95))),
   (12, P(LeftUpLeg=(0,0.5,-0.82), LeftLeg=(0,-1,-0.1), RightUpLeg=(0,-1,0), RightLeg=(0,-1,-0.05),
          LeftArm=(0.25,-0.35,-0.55), LeftForeArm=(0.1,0.1,-0.95), RightArm=(-0.25,-0.35,-0.55), RightForeArm=(-0.1,0.1,-0.95))),
   (30, P(LeftArm=(0.18,0.12,-0.82), LeftForeArm=(-0.12,0.18,-0.9), RightArm=(-0.18,0.12,-0.82), RightForeArm=(0.12,0.18,-0.9))),
   (44, P(LeftArm=(0.28,-0.6,-0.5), LeftForeArm=(0.2,-0.72,-0.4), RightArm=(-0.28,-0.6,-0.5), RightForeArm=(-0.2,-0.72,-0.4))),
   (52, P(RightUpLeg=(0,0.5,-0.82), RightLeg=(0,-1,-0.1), LeftUpLeg=(0,-1,0), LeftLeg=(0,-1,-0.05),
          LeftArm=(0.25,-0.35,-0.55), LeftForeArm=(0.1,0.1,-0.95), RightArm=(-0.25,-0.35,-0.55), RightForeArm=(-0.1,0.1,-0.95)))],

 # STAR JUMP (front): explode to a big X — arms up-out AND legs apart — then back together
 "starjump": [
   (1,  P(LeftArm=(0.32,-0.9,0), LeftForeArm=(0.32,-0.9,0), RightArm=(-0.32,-0.9,0), RightForeArm=(-0.32,-0.9,0),
          LeftUpLeg=(0,-1,0), LeftLeg=(0,-1,-0.05), RightUpLeg=(0,-1,0), RightLeg=(0,-1,-0.05))),
   (14, P(LeftArm=(0.72,0.66,0), LeftForeArm=(0.74,0.62,0), RightArm=(-0.72,0.66,0), RightForeArm=(-0.74,0.62,0),
          LeftUpLeg=(0.55,-0.82,0), LeftLeg=(0.5,-0.86,0), RightUpLeg=(-0.55,-0.82,0), RightLeg=(-0.5,-0.86,0))),
   (28, P(LeftArm=(0.32,-0.9,0), LeftForeArm=(0.32,-0.9,0), RightArm=(-0.32,-0.9,0), RightForeArm=(-0.32,-0.9,0),
          LeftUpLeg=(0,-1,0), LeftLeg=(0,-1,-0.05), RightUpLeg=(0,-1,0), RightLeg=(0,-1,-0.05)))],
}

KEEP = {"Jumping Jacks", "Clapping", "Jump", "Hip Hop Dancing", "Running", "Jumping", "Breathing Idle", "Waving"}
todel = []
for a in list(bpy.data.actions):
    base = a.name[:-9] if a.name.endswith("_Armature") else a.name
    if base in KEEP: a.name = base; a.use_fake_user = True
    else: todel.append(a)
for a in todel: bpy.data.actions.remove(a)

def build_action(name, frames):
    arm.animation_data_clear(); act = bpy.data.actions.new(name); arm.animation_data_create(); arm.animation_data.action = act
    for fr, pose in frames:
        bpy.context.scene.frame_set(fr); set_pose(pose)
        for pb in arm.pose.bones: pb.keyframe_insert("rotation_quaternion", frame=fr)
    for fc in act.fcurves:
        for kp in fc.keyframe_points: kp.interpolation = 'BEZIER'
    act.use_fake_user = True
for nm, frames in MOVES.items(): build_action(nm, frames)

bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', export_animations=True,
    export_animation_mode='ACTIONS', export_skins=True, export_yup=True, use_selection=False)
import os; print("EXPORTED", OUT, os.path.getsize(OUT) // 1024, "KB")
print("ACTIONS_FINAL", sorted(a.name for a in bpy.data.actions))
