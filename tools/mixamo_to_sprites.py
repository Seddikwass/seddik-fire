# Seddik Fire — Mixamo (FBX) -> planche de sprites vue de dessus, pour le jeu 2D.
# Blender 3.6 à 4.x, gratuit. Utilisation (dans un terminal) :
#   blender -b -P mixamo_to_sprites.py -- --fbx dossier_ou_fichier.fbx --out sprites --dirs 8 --frames 12 --size 160 --elev 70
# Pour chaque fichier .fbx : une planche PNG (une ligne par direction, une colonne par image)
# + un fichier JSON qui décrit la planche (taille des cases, directions, images, vitesse).
# Direction 0 = le soldat regarde vers la droite (est), puis sens des aiguilles d'une montre,
# comme l'angle du joueur dans le jeu.
import bpy, mathutils, sys, os, json, math, argparse, tempfile
import numpy as np

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
ap = argparse.ArgumentParser()
ap.add_argument('--fbx', required=True, help='fichier .fbx Mixamo ou dossier de .fbx')
ap.add_argument('--out', default='sprites')
ap.add_argument('--dirs', type=int, default=8, help='nombre de directions (8 ou 16)')
ap.add_argument('--frames', type=int, default=12, help='images par animation')
ap.add_argument('--size', type=int, default=160, help='taille d une case en pixels')
ap.add_argument('--elev', type=float, default=70, help='angle de la caméra : 90 = vue de dessus pure')
ap.add_argument('--fps', type=int, default=15)
a = ap.parse_args(argv)

files = [a.fbx] if a.fbx.lower().endswith('.fbx') else sorted(
    os.path.join(a.fbx, f) for f in os.listdir(a.fbx) if f.lower().endswith('.fbx'))
os.makedirs(a.out, exist_ok=True)
tmp = tempfile.mkdtemp()


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    engines = [e.identifier for e in bpy.types.RenderSettings.bl_rna.properties['engine'].enum_items]
    sc.render.engine = 'BLENDER_EEVEE_NEXT' if 'BLENDER_EEVEE_NEXT' in engines else 'BLENDER_EEVEE'
    sc.render.film_transparent = True
    sc.render.resolution_x = sc.render.resolution_y = a.size
    sc.render.resolution_percentage = 100
    sc.render.image_settings.file_format = 'PNG'
    sc.render.image_settings.color_mode = 'RGBA'
    try:
        sc.view_settings.view_transform = 'Standard'
    except Exception:
        pass
    return sc


def setup(sc):
    meshes = [o for o in sc.objects if o.type == 'MESH']
    arm = next((o for o in sc.objects if o.type == 'ARMATURE'), None)
    if not meshes or not arm:
        raise RuntimeError('Le FBX doit contenir le personnage : téléchargez-le « With Skin » sur Mixamo.')
    # taille du personnage (hauteur) pour cadrer la caméra
    zs, xy = [], []
    for o in meshes:
        for c in o.bound_box:
            w = o.matrix_world @ mathutils.Vector(c)
            zs.append(w.z); xy.append(max(abs(w.x), abs(w.y)))
    h = max(zs) - min(zs)
    tgt = bpy.data.objects.new('cible', None); sc.collection.objects.link(tgt)
    tgt.location = (0, 0, min(zs) + h * .45)
    cam_d = bpy.data.cameras.new('cam'); cam_d.type = 'ORTHO'; cam_d.ortho_scale = max(h, max(xy) * 2) * 1.25
    cam = bpy.data.objects.new('cam', cam_d); sc.collection.objects.link(cam); sc.camera = cam
    phi = math.radians(90 - a.elev); D = h * 6
    cam.location = (0, -D * math.sin(phi), tgt.location.z + D * math.cos(phi))
    con = cam.constraints.new('TRACK_TO'); con.target = tgt; con.track_axis = 'TRACK_NEGATIVE_Z'; con.up_axis = 'UP_Y'
    sun_d = bpy.data.lights.new('soleil', 'SUN'); sun_d.energy = 4
    sun = bpy.data.objects.new('soleil', sun_d); sc.collection.objects.link(sun)
    sun.rotation_euler = (math.radians(35), math.radians(15), math.radians(-30))
    if sc.world is None:
        sc.world = bpy.data.worlds.new('monde')
    sc.world.color = (0.35, 0.35, 0.35)
    return arm


def render_anim(path):
    sc = reset()
    bpy.ops.import_scene.fbx(filepath=path, automatic_bone_orientation=True)
    arm = setup(sc)
    act = arm.animation_data.action if arm.animation_data and arm.animation_data.action else None
    f0, f1 = (int(act.frame_range[0]), int(act.frame_range[1])) if act else (1, 1)
    n = max(1, min(a.frames, f1 - f0 + 1))
    picks = [round(f0 + (f1 - f0) * i / n) for i in range(n)] if n > 1 else [f0]
    S = a.size
    sheet = np.zeros((a.dirs * S, n * S, 4), dtype=np.float32)
    for d in range(a.dirs):
        ang = 2 * math.pi * d / a.dirs
        arm.rotation_euler[2] = math.radians(90) - ang  # Mixamo regarde vers -Y
        for i, fr in enumerate(picks):
            sc.frame_set(fr)
            fp = os.path.join(tmp, 'f.png'); sc.render.filepath = fp
            bpy.ops.render.render(write_still=True)
            img = bpy.data.images.load(fp, check_existing=False)
            px = np.array(img.pixels[:], dtype=np.float32).reshape(S, S, 4)[::-1]
            bpy.data.images.remove(img)
            sheet[d * S:(d + 1) * S, i * S:(i + 1) * S] = px
    name = os.path.splitext(os.path.basename(path))[0].lower().replace(' ', '_')
    out = bpy.data.images.new(name, n * S, a.dirs * S, alpha=True)
    out.pixels = sheet[::-1].ravel().tolist()
    out.filepath_raw = os.path.join(os.path.abspath(a.out), name + '.png'); out.file_format = 'PNG'; out.save()
    with open(os.path.join(a.out, name + '.json'), 'w', encoding='utf8') as f:
        json.dump({'anim': name, 'image': name + '.png', 'cell': S, 'dirs': a.dirs, 'frames': n,
                   'fps': a.fps, 'dir0': 'est, puis sens horaire', 'elev': a.elev}, f, ensure_ascii=False, indent=1)
    print('OK', name, a.dirs, 'directions x', n, 'images')


for p in files:
    try:
        render_anim(p)
    except Exception as e:
        print('ERREUR', p, e)
