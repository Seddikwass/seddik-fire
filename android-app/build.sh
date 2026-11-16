#!/usr/bin/env bash
# Compilation de l'application Android (exécutée par GitHub Actions, SDK Android requis)
set -euo pipefail
cd "$(dirname "$0")"
echo "== Node $(node --version), Java $(java -version 2>&1 | head -1)"
npm install --no-audit --no-fund
echo "== Capacitor : $(npx cap --version)"

# 1) copie du jeu web (dossier public/) dans www/
rm -rf www && mkdir -p www && cp -r ../public/. www/
rm -f www/sw.js www/admin.html
# 2) configuration injectée : API Render, AdMob, pont Capacitor
node -e '
const fs = require("fs");
const ads = JSON.parse(fs.readFileSync("ads.config.json", "utf8"));
const app = JSON.parse(fs.readFileSync("app.config.json", "utf8"));
let core = "";
for (const f of ["node_modules/@capacitor/core/dist/capacitor.js"]) if (fs.existsSync(f)) { fs.copyFileSync(f, "www/capacitor.js"); core = "<script src=\"capacitor.js\"></script>"; }
console.log("capacitor.js :", core ? "inclus" : "absent");
let html = fs.readFileSync("www/index.html", "utf8");
const cfg = "<script>window.FT26_API=" + JSON.stringify(app.apiBase) + ";window.FT_ADS=" + JSON.stringify({ rewarded: ads.rewarded, test: !!ads.test }) + ";</script>";
html = html.replace("</title>", "</title>\n" + core + cfg);
fs.writeFileSync("www/index.html", html);
'
rm -rf android
npx cap add android
BUILD_NUMBER="${BUILD_NUMBER:-1}" node scripts/setup-android.mjs
npx cap sync android

cd android
chmod +x gradlew
SIGN_ARGS=""
if [ -n "${ANDROID_KEYSTORE_BASE64:-}" ]; then
  echo "== Signature de publication : clé fournie par les secrets GitHub"
  echo "$ANDROID_KEYSTORE_BASE64" | base64 -d > ../upload.jks
  SIGN_ARGS="-Pandroid.injected.signing.store.file=$(cd .. && pwd)/upload.jks -Pandroid.injected.signing.store.password=$ANDROID_KEYSTORE_PASSWORD -Pandroid.injected.signing.key.alias=$ANDROID_KEY_ALIAS -Pandroid.injected.signing.key.password=$ANDROID_KEY_PASSWORD"
fi
./gradlew --no-daemon --stacktrace bundleRelease assembleDebug assembleRelease $SIGN_ARGS
cd ..
mkdir -p dist
if [ -n "$SIGN_ARGS" ]; then
  cp android/app/build/outputs/bundle/release/app-release.aab dist/football-tunisia-2026-release-signed.aab
  cp android/app/build/outputs/apk/release/app-release.apk dist/football-tunisia-2026-release-signed.apk 2>/dev/null || true
else
  cp android/app/build/outputs/bundle/release/app-release.aab dist/football-tunisia-2026-unsigned.aab
fi
cp android/app/build/outputs/apk/debug/app-debug.apk dist/football-tunisia-2026-test.apk
rm -f upload.jks
grep -E "versionCode|versionName|targetSdk|compileSdk|minSdk" android/app/build.gradle android/variables.gradle > dist/versions.txt || true
( cd dist && sha256sum * > SHA256SUMS.txt )
ls -la dist
