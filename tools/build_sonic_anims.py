import bpy, math, sys
from mathutils import Vector, Matrix
SRC = "/home/mats/MWM-AI/projects/wiggle-and-think/src/assets/anim/sonic_anim.glb"
OUT = sys.argv[sys.argv.index("--")+1]
B="mixamorig:"
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=SRC)
arm=next(o for o in bpy.data.objects if o.type=='ARMATURE')
def depth(b):
    d=0
    while b.parent: b=b.parent; d+=1
    return d
ORDER=sorted([pb.name.replace(B,"") for pb in arm.pose.bones], key=lambda n: depth(arm.pose.bones[B+n].bone))
for pb in arm.pose.bones: pb.rotation_mode='QUATERNION'
def reset():
    for pb in arm.pose.bones: pb.matrix_basis=Matrix.Identity(4)
def set_pose_local(p):
    reset()
    for n in ORDER:
        if n in p:
            pb=arm.pose.bones[B+n]
            pb.rotation_mode='XYZ'; pb.rotation_euler=tuple(math.radians(a) for a in p[n]); pb.rotation_mode='QUATERNION'
    bpy.context.view_layer.update()

def P(**k): return dict(k)
MOVES={
 "march":[(1,P(RightUpLeg=(-98,0,0),RightLeg=(80,0,0),LeftArm=(72,0,0),LeftForeArm=(42,0,0),RightArm=(-30,0,0))),
          (13,P(LeftUpLeg=(-98,0,0),LeftLeg=(80,0,0),RightArm=(72,0,0),RightForeArm=(42,0,0),LeftArm=(-30,0,0))),
          (25,P(RightUpLeg=(-98,0,0),RightLeg=(80,0,0),LeftArm=(72,0,0),LeftForeArm=(42,0,0),RightArm=(-30,0,0)))],
 "tree":[(1,P(RightUpLeg=(-55,35,0),RightLeg=(125,0,0),LeftArm=(150,0,0),RightArm=(150,0,0))),
         (30,P(RightUpLeg=(-58,35,0),RightLeg=(122,0,0),LeftArm=(156,0,0),RightArm=(144,0,0))),
         (60,P(RightUpLeg=(-55,35,0),RightLeg=(125,0,0),LeftArm=(150,0,0),RightArm=(150,0,0)))],
 "airplane":[(1,P(Spine=(55,0,0),Spine1=(8,0,0),RightUpLeg=(55,0,0),LeftArm=(0,-95,0),RightArm=(0,95,0))),
             (30,P(Spine=(58,0,0),Spine1=(8,0,0),RightUpLeg=(60,0,0),LeftArm=(0,-100,0),RightArm=(0,100,0))),
             (60,P(Spine=(55,0,0),Spine1=(8,0,0),RightUpLeg=(55,0,0),LeftArm=(0,-95,0),RightArm=(0,95,0)))],
 "flamingo":[(1,P(RightUpLeg=(-78,18,0),RightLeg=(70,0,0),LeftArm=(0,-92,0),RightArm=(0,92,0))),
             (10,P(RightUpLeg=(-70,18,0),RightLeg=(60,0,0),LeftArm=(0,-100,0),RightArm=(0,100,0))),
             (20,P(RightUpLeg=(-78,18,0),RightLeg=(70,0,0),LeftArm=(0,-92,0),RightArm=(0,92,0)))],
 "tightrope":[(1,P(LeftArm=(0,-95,0),RightArm=(0,95,0),RightUpLeg=(-28,0,0),RightLeg=(30,0,0))),
              (16,P(LeftArm=(0,-98,0),RightArm=(0,98,0),LeftUpLeg=(-28,0,0),LeftLeg=(30,0,0))),
              (32,P(LeftArm=(0,-95,0),RightArm=(0,95,0),RightUpLeg=(-28,0,0),RightLeg=(30,0,0)))],
 "windmill":[(1,P(LeftArm=(0,-95,0),RightArm=(0,95,0))),
             (15,P(Spine=(72,18,0),Spine1=(10,0,0),LeftArm=(120,-20,0),RightArm=(0,60,0))),
             (30,P(LeftArm=(0,-95,0),RightArm=(0,95,0))),
             (45,P(Spine=(72,-18,0),Spine1=(10,0,0),RightArm=(120,20,0),LeftArm=(0,-60,0))),
             (60,P(LeftArm=(0,-95,0),RightArm=(0,95,0)))],
 "breathe":[(1,P(LeftArm=(0,-12,0),RightArm=(0,12,0))),
            (30,P(LeftArm=(120,-45,0),RightArm=(120,45,0))),
            (60,P(LeftArm=(0,-12,0),RightArm=(0,12,0)))],
}
KEEP={"Jumping Jacks","Clapping","Jump","Hip Hop Dancing","Running","Jumping","Breathing Idle","Waving"}
# rename/keep real clips, delete junk
todel=[]
for a in list(bpy.data.actions):
    base=a.name[:-9] if a.name.endswith("_Armature") else a.name
    if base in KEEP: a.name=base; a.use_fake_user=True
    else: todel.append(a)
for a in todel: bpy.data.actions.remove(a)
# author customs
def build_action(name,frames):
    arm.animation_data_clear(); act=bpy.data.actions.new(name); arm.animation_data_create(); arm.animation_data.action=act
    for fr,pose in frames:
        bpy.context.scene.frame_set(fr); set_pose_local(pose)
        for pb in arm.pose.bones: pb.keyframe_insert("rotation_quaternion",frame=fr)
    for fc in act.fcurves:
        for kp in fc.keyframe_points: kp.interpolation='BEZIER'
    act.use_fake_user=True
for nm,frames in MOVES.items(): build_action(nm,frames)
# keep animation_data block (ACTIONS export needs it); leave last action assigned
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=OUT,export_format='GLB',export_animations=True,
    export_animation_mode='ACTIONS',export_skins=True,export_yup=True,use_selection=False)
import os; print("EXPORTED",OUT,os.path.getsize(OUT)//1024,"KB")
print("ACTIONS_FINAL", sorted(a.name for a in bpy.data.actions))
