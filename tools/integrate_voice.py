#!/usr/bin/env python3
"""V232 — intègre la voix réelle de Wassim dans les conseils de l'équipe radio.

Usage :
  python3 tools/integrate_voice.py --lang tn vocal1.ogg [vocal2.ogg ...]
  python3 tools/integrate_voice.py --lang fr --start 17 vocal3.m4a   # reprendre à la phrase 17

Les vocaux (WhatsApp .ogg/.opus, .m4a, .mp3, .wav…) sont lus dans l'ordre, nettoyés
(coupe-bas, réduction de bruit, volume normalisé), découpés sur les silences
(une pause d'au moins 0,7 s entre deux phrases), puis chaque phrase est affectée,
dans l'ordre du texte à lire (tools/TEXTE-VOIX.txt), à sa situation radio.
Résultat : audio/voix/<langue>-<situation>.mp3 + audio/voix/index.json.
Le jeu joue ces fichiers en priorité, pour tous les joueurs, à la place de la voix de synthèse.
"""
import argparse, json, re, subprocess, sys, tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'audio' / 'voix'
DRIVER_ORDER = ['aziz', 'rania', 'skander', 'yosra', 'fares', 'ines', 'omar', 'salma',
                'nader', 'maya', 'kais', 'lina', 'mehdi', 'amira', 'walid', 'rim']


def radio_lines():
    s = (ROOT / 'index.html').read_text(encoding='utf-8')
    a = s.index('/*RADIO_LINES_BEGIN*/') + len('/*RADIO_LINES_BEGIN*/')
    return json.loads(s[a:s.index('/*RADIO_LINES_END*/')])


def script_keys():
    lines = radio_lines()
    return ['n_' + d for d in DRIVER_ORDER] + [k for k in lines if not k.startswith('n_')]


def run(cmd):
    return subprocess.run(cmd, capture_output=True, text=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--lang', default='tn', choices=['tn', 'ar', 'fr', 'en'])
    ap.add_argument('--start', type=int, default=1, help='numéro de la première phrase contenue dans ces vocaux')
    ap.add_argument('--silence', type=float, default=0.7, help='pause minimale entre deux phrases (s)')
    ap.add_argument('--keys', default='', help='liste explicite de situations, séparées par des virgules')
    ap.add_argument('files', nargs='+')
    a = ap.parse_args()
    keys = a.keys.split(',') if a.keys else script_keys()[a.start - 1:]
    OUT.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as td:
        td = Path(td)
        lst = td / 'list.txt'
        parts = []
        for i, f in enumerate(a.files):
            w = td / f'in{i}.wav'
            r = run(['ffmpeg', '-y', '-v', 'error', '-i', f, '-ac', '1', '-ar', '44100', str(w)])
            if r.returncode: sys.exit(f'lecture impossible : {f}\n{r.stderr}')
            parts.append(w)
        lst.write_text(''.join(f"file '{p}'\n" for p in parts))
        full = td / 'full.wav'
        # nettoyage : coupe-bas (souffle, vent), réduction de bruit douce, coupe-haut
        run(['ffmpeg', '-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', str(lst),
             '-af', 'highpass=f=85,afftdn=nf=-28,lowpass=f=9000', str(full)])
        r = run(['ffmpeg', '-v', 'info', '-i', str(full), '-af', f'silencedetect=noise=-36dB:d={a.silence}', '-f', 'null', '-'])
        dur = float(run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(full)]).stdout.strip())
        starts = [float(x) for x in re.findall(r'silence_start: ([\d.]+)', r.stderr)]
        ends = [float(x) for x in re.findall(r'silence_end: ([\d.]+)', r.stderr)]
        segs, t = [], 0.0
        for s0, e0 in zip(starts, ends + [dur]):
            if s0 - t > 0.3: segs.append((t, s0))
            t = e0
        if dur - t > 0.3: segs.append((t, dur))
        print(f'{len(segs)} phrases détectées, {len(keys)} attendues à partir de la phrase {a.start}')
        done = []
        for (s0, e0), k in zip(segs, keys):
            out = OUT / f'{a.lang}-{k}.mp3'
            run(['ffmpeg', '-y', '-v', 'error', '-ss', f'{max(0, s0 - 0.08):.3f}', '-to', f'{e0 + 0.12:.3f}', '-i', str(full),
                 '-af', 'afade=t=in:d=0.03,loudnorm=I=-15:TP=-1.5:LRA=7', '-ar', '44100', '-b:a', '96k', str(out)])
            done.append(out.name)
            print(f'  {k:10s} {e0 - s0:5.2f}s -> {out.name}')
    files = sorted(p.name for p in OUT.glob('*.mp3'))
    (OUT / 'index.json').write_text(json.dumps({'files': files}, ensure_ascii=False, indent=0))
    print(f'{len(done)} phrases intégrées ; audio/voix contient {len(files)} fichiers')


if __name__ == '__main__':
    main()
