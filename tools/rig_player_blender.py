"""Free Blender auto-rig helper for SEDDIK LEAGUE player GLB.
Run: blender -b --python rig_player_blender.py -- input.glb output_rigged.glb
Requires Blender 3.6+ with built-in glTF import/export. No paid service/add-on.
"""
import bpy, sys, os
from mathutils import Vector

def args_after_dash():
    argv = sys.argv
    return argv[argv.index('--') + 1:] if '--' in argv else []

def clear_scene():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)

def main(src, dst):
    if not os.path.isfile(src):
        raise FileNotFoundError(src)
    clear_scene()
    bpy.ops.import_scene.gltf(filepath=src)
    meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    if not meshes:
        raise RuntimeError('No mesh objects found in input GLB')
    bpy.context.view_layer.update()
    corners = [o.matrix_world @ Vector(c) for o in meshes for c in o.bound_box]
    minz=min(v.z for v in corners); maxz=max(v.z for v in corners)
    minx=min(v.x for v in corners); maxx=max(v.x for v in corners)
    miny=min(v.y for v in corners); maxy=max(v.y for v in corners)
    scale=1.8/max(0.001,maxz-minz)
    cx=(minx+maxx)*0.5; cy=(miny+maxy)*0.5
    # Transform each imported object into a shared centered 1.8m character space.
    for o in meshes:
        world=o.matrix_world.copy()
        for v in o.data.vertices:
            p=world @ v.co
            v.co=Vector(((p.x-cx)*scale,(p.y-cy)*scale,(p.z-minz)*scale))
        o.matrix_world.identity()
        o.location=(0,0,0); o.rotation_euler=(0,0,0); o.scale=(1,1,1)
    bpy.context.view_layer.update()
    ad=bpy.data.armatures.new('SeddikLeague_PlayerRig')
    arm=bpy.data.objects.new('SeddikLeague_PlayerRig',ad)
    bpy.context.collection.objects.link(arm)
    bpy.context.view_layer.objects.active=arm; arm.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT')
    eb=ad.edit_bones
    def bone(name, head, tail, parent=None, connected=False):
        b=eb.new(name); b.head=Vector(head); b.tail=Vector(tail)
        if parent: b.parent=eb[parent]; b.use_connect=connected
        return b
    bone('root',(0,0,0),(0,0,.10))
    bone('pelvis',(0,0,.82),(0,0,1.00),'root')
    bone('spine',(0,0,.98),(0,0,1.22),'pelvis',True)
    bone('chest',(0,0,1.22),(0,0,1.42),'spine',True)
    bone('neck',(0,0,1.42),(0,0,1.53),'chest',True)
    bone('head',(0,0,1.53),(0,0,1.78),'neck',True)
    for side,sgn in [('L',1),('R',-1)]:
        bone('upper_arm.'+side,(sgn*.17,0,1.38),(sgn*.36,0,1.20),'chest')
        bone('forearm.'+side,(sgn*.36,0,1.20),(sgn*.48,0,1.00),'upper_arm.'+side,True)
        bone('hand.'+side,(sgn*.48,0,1.00),(sgn*.50,0,.92),'forearm.'+side,True)
        bone('thigh.'+side,(sgn*.10,0,.88),(sgn*.12,0,.48),'pelvis')
        bone('shin.'+side,(sgn*.12,0,.48),(sgn*.12,0,.12),'thigh.'+side,True)
        bone('foot.'+side,(sgn*.12,0,.12),(sgn*.12,.20,.06),'shin.'+side,True)
    bpy.ops.object.mode_set(mode='OBJECT')
    arm.select_set(False)
    for o in meshes: o.select_set(True)
    arm.select_set(True); bpy.context.view_layer.objects.active=arm
    try:
        bpy.ops.object.parent_set(type='ARMATURE_AUTO')
    except Exception as exc:
        raise RuntimeError('Auto weights failed; inspect mesh topology in Blender: '+str(exc))
    arm.animation_data_create()
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(filepath=dst,export_format='GLB',use_selection=False,
                               export_apply=True,export_animations=True)
    print('RIGGED_GLB OUTPUT:',dst)

if __name__ == '__main__':
    a=args_after_dash()
    if len(a)<2: raise SystemExit('Usage: blender -b --python rig_player_blender.py -- input.glb output_rigged.glb')
    main(os.path.abspath(a[0]),os.path.abspath(a[1]))
