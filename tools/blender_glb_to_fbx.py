import bpy, sys, os
SRC = sys.argv[sys.argv.index("--")+1]
OUT = sys.argv[sys.argv.index("--")+2]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=SRC)
# delete armatures (Mixamo will add a clean rig); keep mesh in its rest pose
arms = [o for o in bpy.data.objects if o.type=='ARMATURE']
meshes = [o for o in bpy.data.objects if o.type=='MESH']
print("meshes:", len(meshes), "armatures:", len(arms))
for m in meshes:
    # remove armature modifiers so the mesh exports as a plain static mesh
    for mod in list(m.modifiers):
        if mod.type=='ARMATURE': m.modifiers.remove(mod)
    m.parent = None
for a in arms:
    bpy.data.objects.remove(a, do_unlink=True)
# select meshes, export FBX with embedded textures, Y-up
bpy.ops.object.select_all(action='DESELECT')
for m in [o for o in bpy.data.objects if o.type=='MESH']: m.select_set(True)
bpy.ops.export_scene.fbx(filepath=OUT, use_selection=True, path_mode='COPY', embed_textures=True,
    object_types={'MESH'}, axis_forward='-Z', axis_up='Y', mesh_smooth_type='FACE', bake_space_transform=False)
print("EXPORTED", OUT, os.path.getsize(OUT)//1024, "KB")
