// Personnalise le projet Android généré par « npx cap add android » :
// SDK cible Android 16, version, AdMob, paysage, plein écran, icônes, écran de démarrage.
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const A = path.join(root, 'android');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const cap = JSON.parse(fs.readFileSync(path.join(root, 'capacitor.config.json'), 'utf8'));
const ads = JSON.parse(fs.readFileSync(path.join(root, 'ads.config.json'), 'utf8'));
const read = f => fs.readFileSync(f, 'utf8');
const write = (f, s) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, s); };
const must = (cond, msg) => { if (!cond) { console.error('ERREUR setup : ' + msg); process.exit(1); } };

// 1) niveaux de SDK
const vg = path.join(A, 'variables.gradle');
let v = read(vg);
const setVar = (k, val) => { const re = new RegExp(`(${k}\\s*=\\s*)\\d+`); if (re.test(v)) v = v.replace(re, `$1${val}`); else v = v.replace(/ext\s*\{/, m => `${m}\n    ${k} = ${val}`); };
setVar('minSdkVersion', 24); setVar('compileSdkVersion', 36); setVar('targetSdkVersion', 36);
write(vg, v);

// 2) numéro de version (versionCode = numéro de compilation GitHub)
const bg = path.join(A, 'app', 'build.gradle');
let b = read(bg);
const code = parseInt(process.env.BUILD_NUMBER || '1', 10);
b = b.replace(/versionCode\s+\d+/, `versionCode ${code}`).replace(/versionName\s+"[^"]*"/, `versionName "${pkg.version}"`);
must(b.includes(`versionCode ${code}`), 'versionCode introuvable dans app/build.gradle');
write(bg, b);

// 3) manifeste : identifiant d'application AdMob, paysage, autorisation identifiant publicitaire
const mf = path.join(A, 'app', 'src', 'main', 'AndroidManifest.xml');
let m = read(mf);
if (!m.includes('com.google.android.gms.ads.APPLICATION_ID'))
  m = m.replace(/<application([^>]*)>/, `<application$1>\n        <meta-data android:name="com.google.android.gms.ads.APPLICATION_ID" android:value="@string/admob_app_id" />`);
m = m.replace(/<activity([^>]*?)android:name="\.MainActivity"/, (all, pre) => all.includes('screenOrientation') ? all : `<activity${pre}android:screenOrientation="sensorLandscape"\n            android:name=".MainActivity"`);
if (!m.includes('com.google.android.gms.permission.AD_ID')) m = m.replace(/<\/manifest>/, `    <uses-permission android:name="com.google.android.gms.permission.AD_ID" />\n</manifest>`);
must(m.includes('APPLICATION_ID') && m.includes('sensorLandscape'), 'manifeste non modifié');
write(mf, m);

// 4) textes : nom de l'application, identifiant AdMob
const sf = path.join(A, 'app', 'src', 'main', 'res', 'values', 'strings.xml');
let s = read(sf);
const esc = x => x.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/'/g, "\\'").replace(/@/g, '\\@');
s = s.replace(/(<string name="app_name">)[^<]*(<\/string>)/, `$1${esc(cap.appName)}$2`).replace(/(<string name="title_activity_main">)[^<]*(<\/string>)/, `$1${esc(cap.appName)}$2`);
if (!s.includes('admob_app_id')) s = s.replace(/<\/resources>/, `    <string name="admob_app_id">${ads.appId}</string>\n</resources>`);
write(sf, s);

// 5) ressources : supprimer les images de démarrage du modèle, copier icônes + écran de démarrage
const res = path.join(A, 'app', 'src', 'main', 'res');
for (const d of fs.readdirSync(res)) {
  const full = path.join(res, d);
  if (d.startsWith('drawable')) for (const f of fs.readdirSync(full)) if (/^splash\.(png|9\.png|jpg|webp)$/.test(f)) fs.rmSync(path.join(full, f));
}
const copyDir = (src, dst) => { for (const f of fs.readdirSync(src)) { const a = path.join(src, f), c = path.join(dst, f); if (fs.statSync(a).isDirectory()) { fs.mkdirSync(c, { recursive: true }); copyDir(a, c); } else fs.copyFileSync(a, c); } };
copyDir(path.join(root, 'native', 'res'), res);
// une seule définition de la couleur de fond d'icône
for (const f of fs.readdirSync(path.join(res, 'values'))) {
  if (f === 'ic_launcher_background.xml' || !f.endsWith('.xml')) continue;
  const p = path.join(res, 'values', f), t = read(p), t2 = t.replace(/\s*<color name="ic_launcher_background">[^<]*<\/color>/g, '');
  if (t2 !== t) write(p, t2);
}
const adaptive = `<?xml version="1.0" encoding="utf-8"?>\n<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n    <background android:drawable="@color/ic_launcher_background"/>\n    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>\n</adaptive-icon>\n`;
write(path.join(res, 'mipmap-anydpi-v26', 'ic_launcher.xml'), adaptive);
write(path.join(res, 'mipmap-anydpi-v26', 'ic_launcher_round.xml'), adaptive);

// 6) activité principale (plein écran immersif)
const javaDir = path.join(A, 'app', 'src', 'main', 'java', ...cap.appId.split('.'));
must(fs.existsSync(path.join(javaDir, 'MainActivity.java')), 'MainActivity.java introuvable : ' + javaDir);
fs.copyFileSync(path.join(root, 'native', 'MainActivity.java'), path.join(javaDir, 'MainActivity.java'));

console.log(`setup OK : versionCode ${code}, versionName ${pkg.version}, AdMob ${ads.test ? 'TEST' : 'réel'} (${ads.appId})`);
