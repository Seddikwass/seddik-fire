#!/usr/bin/env python3
"""Enregistre les consignes de l'équipe radio en fichiers audio (audio/radio/<langue>-<situation>.mp3).

Le texte est lu dans index.html, entre /*RADIO_LINES_BEGIN*/ et /*RADIO_LINES_END*/ : la voix reste
toujours identique au texte affiché. Synthèse : Piper (voix neuronales libres, exécutées hors ligne).
Rien n'est refait si le texte et les voix n'ont pas changé.
"""
import hashlib, json, re, shutil, subprocess, sys, tempfile, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'audio' / 'radio'
BASE = 'https://huggingface.co/rhasspy/piper-voices/resolve/main/'
VOICES = {
    'fr': 'fr/fr_FR/siwis/medium/fr_FR-siwis-medium',
    'en': 'en/en_GB/northern_english_male/medium/en_GB-northern_english_male-medium',
    'ar': 'ar/ar_JO/kareem/medium/ar_JO-kareem-medium',
}
VOICE_OF = {'fr': 'fr', 'en': 'en', 'ar': 'ar', 'tn': 'ar'}
SALT = 'radio-v1'

def lines():
    html = (ROOT / 'index.html').read_text(encoding='utf-8')
    m = re.search(r'/\*RADIO_LINES_BEGIN\*/(.*?)/\*RADIO_LINES_END\*/', html, re.S)
    if not m: sys.exit('RADIO_LINES introuvable dans index.html')
    return json.loads(m.group(1))

def spoken(text):
    # « INGÉNIEUR : tu approches… » → « Ingénieur. Tu approches… » (évite la lecture lettre par lettre des majuscules)
    text = text.replace('’', "'")
    if ':' in text:
        role, rest = text.split(':', 1)
        role = role.strip(); rest = rest.strip()
        if role.isupper(): role = role.capitalize()
        text = role + '. ' + rest[:1].upper() + rest[1:]
    return text

def fetch(url, dest):
    if dest.exists(): return
    print('téléchargement', url, flush=True)
    with urllib.request.urlopen(url, timeout=120) as r, open(dest, 'wb') as f: shutil.copyfileobj(r, f)

def main():
    data = lines()
    digest = hashlib.sha256((json.dumps(data, sort_keys=True, ensure_ascii=False) + json.dumps(VOICES, sort_keys=True) + SALT).encode()).hexdigest()[:16]
    index = OUT / 'index.json'
    if index.exists():
        old = json.loads(index.read_text(encoding='utf-8'))
        if old.get('hash') == digest and all((OUT / f).exists() for f in old.get('files', [])):
            print('voix déjà à jour', digest); return
    if not shutil.which('piper'): sys.exit('piper absent (pip install piper-tts)')
    work = Path(tempfile.mkdtemp())
    cards = {}
    for key, path in VOICES.items():
        fetch(BASE + path + '.onnx', work / (key + '.onnx'))
        fetch(BASE + path + '.onnx.json', work / (key + '.onnx.json'))
        card_url = BASE + path.rsplit('/', 1)[0] + '/MODEL_CARD'
        try:
            with urllib.request.urlopen(card_url, timeout=60) as r: cards[key] = r.read().decode('utf-8', 'replace')
        except Exception as e: cards[key] = 'MODEL_CARD indisponible : %s' % e
        print('==== MODEL_CARD', key, '====\n' + cards[key], flush=True)
    OUT.mkdir(parents=True, exist_ok=True)
    for old in OUT.glob('*.mp3'): old.unlink()
    files = []
    for situation, by_lang in data.items():
        for lang, text in by_lang.items():
            voice = VOICE_OF.get(lang)
            if not voice: continue
            wav = work / f'{lang}-{situation}.wav'
            mp3 = OUT / f'{lang}-{situation}.mp3'
            subprocess.run(['piper', '--model', str(work / (voice + '.onnx')), '--output_file', str(wav), '--length_scale', '0.93', '--sentence_silence', '0.18'],
                           input=spoken(text).encode('utf-8'), check=True, capture_output=True)
            subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', str(wav),
                            '-af', 'silenceremove=start_periods=1:start_threshold=-45dB,loudnorm=I=-15:TP=-1.5:LRA=7',
                            '-ac', '1', '-ar', '24000', '-b:a', '48k', str(mp3)], check=True)
            files.append(mp3.name)
            print('ok', mp3.name, mp3.stat().st_size, flush=True)
    index.write_text(json.dumps({'hash': digest, 'engine': 'Piper', 'voices': VOICES, 'files': sorted(files)}, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    print('voix enregistrées :', len(files))

if __name__ == '__main__':
    main()
