import bpy, re, os, sys
SONIC_FBX = sys.argv[sys.argv.index("--")+1]
ORIG_GLB  = sys.argv[sys.argv.index("--")+2]
OUTGLB    = sys.argv[sys.argv.index("--")+3]
FBXDIR    = sys.argv[sys.argv.index("--")+4]
FILES = ["Jumping Jacks","Jump","Jumping","Running","Clapping","Breathing Idle","Hip Hop Dancing","Waving"]
def norm(n): return re.sub(r'_\d+$','',re.sub(r'^mixamorig:?','',n))
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=SONIC_FBX)
sonic = next(o for o in bpy.data.objects if o.type=='ARMATURE')
sonic_meshes = [o for o in bpy.data.objects if o.type=='MESH']
if sonic.animation_data and sonic.animation_data.action: sonic.animation_data.action=None
# --- retarget + bake the 8 clips ---
baked=[]
for fname in FILES:
    before=set(bpy.data.objects)
    bpy.ops.import_scene.fbx(filepath=os.path.join(FBXDIR,fname+".fbx"))
    src=next(o for o in (set(bpy.data.objects)-before) if o.type=='ARMATURE')
    fr=int(round(src.animation_data.action.frame_range[1]))
    sm={norm(b.name):b.name for b in src.pose.bones}
    bpy.context.view_layer.objects.active=sonic; bpy.ops.object.mode_set(mode='POSE')
    for pb in sonic.pose.bones:
        s=sm.get(norm(pb.name))
        if s:
            c=pb.constraints.new('COPY_ROTATION'); c.target=src; c.subtarget=s; c.target_space='WORLD'; c.owner_space='WORLD'
    bpy.ops.pose.select_all(action='SELECT')
    bpy.ops.nla.bake(frame_start=1,frame_end=max(2,fr),only_selected=False,visual_keying=True,clear_constraints=True,bake_types={'POSE'})
    bpy.ops.object.mode_set(mode='OBJECT')
    a=sonic.animation_data.action; a.name=fname; a.use_fake_user=True; baked.append(a.name); sonic.animation_data.action=None
    bpy.data.objects.remove(src, do_unlink=True)
print("baked:",baked)
# --- restore textures: import original, match meshes by vertex count, copy materials ---
before=set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=ORIG_GLB)
orig_objs=set(bpy.data.objects)-before
orig_by_vcount={}
for o in orig_objs:
    if o.type=='MESH' and len(o.data.materials):
        orig_by_vcount.setdefault(len(o.data.vertices), o)
moved=0
for m in sonic_meshes:
    src=orig_by_vcount.get(len(m.data.vertices))
    if src:
        m.data.materials.clear()
        for mat in src.data.materials: m.data.materials.append(mat)
        moved+=1
print("texture transfer: matched", moved, "of", len(sonic_meshes), "meshes")
for o in list(orig_objs): bpy.data.objects.remove(o, do_unlink=True)
bpy.ops.export_scene.gltf(filepath=OUTGLB,export_format='GLB',export_animations=True,export_animation_mode='ACTIONS',export_skins=True,export_yup=True)
print("EXPORTED",OUTGLB,os.path.getsize(OUTGLB)//1024,"KB")
