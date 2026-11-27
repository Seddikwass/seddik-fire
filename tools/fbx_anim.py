#!/usr/bin/env python3
"""V241 — lit une animation Mixamo (FBX binaire) et en extrait les positions des articulations
principales du squelette, échantillonnées dans le temps, au format des postures du jeu.

Usage : python3 tools/fbx_anim.py fichier.fbx [--frames 24] > anim.json
Aucun logiciel externe : lecteur FBX binaire + cinématique directe (numpy).
"""
import json, struct, sys, zlib, argparse
import numpy as np

# ---------- lecture du format FBX binaire ----------
def read_fbx(path):
    data = open(path, 'rb').read()
    assert data[:20] == b'Kaydara FBX Binary  ', 'pas un FBX binaire'
    ver = struct.unpack_from('<I', data, 23)[0]
    big = ver >= 7500
    def prop(o):
        t = chr(data[o]); o += 1
        if t == 'Y': return struct.unpack_from('<h', data, o)[0], o + 2
        if t == 'C': return data[o] != 0, o + 1
        if t == 'I': return struct.unpack_from('<i', data, o)[0], o + 4
        if t == 'F': return struct.unpack_from('<f', data, o)[0], o + 4
        if t == 'D': return struct.unpack_from('<d', data, o)[0], o + 8
        if t == 'L': return struct.unpack_from('<q', data, o)[0], o + 8
        if t in 'SR':
            n = struct.unpack_from('<I', data, o)[0]; o += 4; v = data[o:o + n]
            return (v.decode('utf-8', 'replace') if t == 'S' else v), o + n
        if t in 'fdlib':
            n, enc, clen = struct.unpack_from('<III', data, o); o += 12; raw = data[o:o + clen]; o += clen
            if enc == 1: raw = zlib.decompress(raw)
            dt = {'f': '<f4', 'd': '<f8', 'l': '<i8', 'i': '<i4', 'b': 'u1'}[t]
            return np.frombuffer(raw, dtype=dt, count=n), o
        raise ValueError('type ' + t)
    def node(o):
        if big: end, nprop, plen = struct.unpack_from('<QQQ', data, o); o += 24
        else: end, nprop, plen = struct.unpack_from('<III', data, o); o += 12
        nl = data[o]; o += 1
        if end == 0: return None, o
        name = data[o:o + nl].decode(); o += nl
        props = []
        for _ in range(nprop): v, o = prop(o); props.append(v)
        kids = []
        sentinel = 25 if big else 13
        while o < end - sentinel or (o < end and data[o:o + sentinel] != b'\0' * sentinel):
            k, o = node(o)
            if k is None: break
            kids.append(k)
        return {'n': name, 'p': props, 'c': kids}, end
    o = 27; top = []
    while o < len(data) - 200:
        nd, o2 = node(o)
        if nd is None: break
        top.append(nd); o = o2
    return top

def find(nodes, name): return [n for n in nodes if n['n'] == name]
def child(n, name):
    for k in n['c']:
        if k['n'] == name: return k
    return None

def p70(n):
    out = {}
    pp = child(n, 'Properties70')
    if pp:
        for P in pp['c']:
            if P['n'] == 'P': out[P['p'][0]] = P['p'][4:]
    return out

# ---------- squelette + courbes ----------
def euler_xyz(r):   # FBX : ordre XYZ par défaut (Mixamo), angles en degrés, rotation = Rz*Ry*Rx
    x, y, z = np.radians(r)
    cx, sx, cy, sy, cz, sz = np.cos(x), np.sin(x), np.cos(y), np.sin(y), np.cos(z), np.sin(z)
    Rx = np.array([[1, 0, 0], [0, cx, -sx], [0, sx, cx]]); Ry = np.array([[cy, 0, sy], [0, 1, 0], [-sy, 0, cy]]); Rz = np.array([[cz, -sz, 0], [sz, cz, 0], [0, 0, 1]])
    return Rz @ Ry @ Rx

def load(path):
    top = read_fbx(path)
    objs = find(top, 'Objects')[0]; conns = find(top, 'Connections')[0]
    models, curves, cnodes = {}, {}, {}
    for o in objs['c']:
        uid = o['p'][0]
        if o['n'] == 'Model':
            name = o['p'][1].split('\x00')[0]
            P = p70(o)
            models[uid] = {'name': name, 't': np.array(P.get('Lcl Translation', [0, 0, 0]), float), 'r': np.array(P.get('Lcl Rotation', [0, 0, 0]), float),
                           'pre': np.array(P.get('PreRotation', [0, 0, 0]), float), 'parent': None, 'ch': {}}
        elif o['n'] == 'AnimationCurve':
            kt = child(o, 'KeyTime')['p'][0].astype(np.float64) / 46186158000.0; kv = child(o, 'KeyValueFloat')['p'][0].astype(np.float64)
            curves[uid] = (kt, kv)
        elif o['n'] == 'AnimationCurveNode':
            cnodes[uid] = {'name': o['p'][1].split('\x00')[0], 'axes': {}, 'model': None, 'prop': None}
    for c in conns['c']:
        p = c['p']
        if p[0] == 'OO' and p[1] in models and p[2] in models: models[p[1]]['parent'] = p[2]
        elif p[0] == 'OP' and p[1] in curves and p[2] in cnodes: cnodes[p[2]]['axes'][p[3]] = curves[p[1]]
        elif p[0] == 'OP' and p[1] in cnodes and p[2] in models: cnodes[p[1]]['model'] = p[2]; cnodes[p[1]]['prop'] = p[3]
    for cn in cnodes.values():
        if cn['model'] is not None: models[cn['model']]['ch'][cn['prop']] = cn['axes']
    return models

def sample(axes, base, t):
    v = base.copy()
    for i, a in enumerate(['d|X', 'd|Y', 'd|Z']):
        if a in axes: kt, kv = axes[a]; v[i] = np.interp(t, kt, kv)
    return v

JOINTS = ['Hips', 'Spine2', 'Neck', 'Head', 'HeadTop_End', 'LeftArm', 'LeftForeArm', 'LeftHand', 'RightArm', 'RightForeArm', 'RightHand',
          'LeftUpLeg', 'LeftLeg', 'LeftFoot', 'LeftToeBase', 'RightUpLeg', 'RightLeg', 'RightFoot', 'RightToeBase']

def world_positions(models, t):
    cache = {}
    def W(uid):
        if uid in cache: return cache[uid]
        m = models[uid]
        tr = sample(m['ch'].get('Lcl Translation', {}), m['t'], t); ro = sample(m['ch'].get('Lcl Rotation', {}), m['r'], t)
        R = euler_xyz(m['pre']) @ euler_xyz(ro); M = np.eye(4); M[:3, :3] = R; M[:3, 3] = tr
        if m['parent'] is not None and m['parent'] in models: M = W(m['parent']) @ M
        cache[uid] = M; return M
    out = {}
    for uid, m in models.items():
        nm = m['name'].split(':')[-1]
        if nm in JOINTS: out[nm] = W(uid)[:3, 3].copy()
    return out

def main():
    ap = argparse.ArgumentParser(); ap.add_argument('fbx'); ap.add_argument('--frames', type=int, default=24); a = ap.parse_args()
    models = load(a.fbx)
    t1 = max((float(ax[0][-1]) for m in models.values() for ch in m['ch'].values() for ax in ch.values()), default=1.0)
    frames = []
    for k in range(a.frames):
        t = t1 * k / a.frames; P = world_positions(models, t)
        frames.append({j: [round(float(v), 2) for v in P[j]] for j in JOINTS if j in P})
    json.dump({'dur': round(t1, 3), 'frames': frames}, sys.stdout)

if __name__ == '__main__':
    main()
