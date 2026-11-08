#!/usr/bin/env bash
# Compilation de l'application Android (exécutée par GitHub Actions)
set -euo pipefail
cd "$(dirname "$0")"
echo "== Node $(node --version), Java $(java -version 2>&1 | head -1)"

npm install --no-audit --no-fund
echo "== Capacitor : $(npx cap --version)"

# page du jeu + identifiants publicitaires + pont Capacitor
node -e '
const fs = require("fs"), path = require("path");
const ads = JSON.parse(fs.readFileSync("ads.config.json", "utf8"));
let html = fs.readFileSync("game.html", "utf8");
const cfg = { rewarded: ads.rewarded, interstitial: ads.interstitial, test: !!ads.test };
let core = "";
for (const f of ["node_modules/@capacitor/core/dist/capacitor.js", "node_modules/@capacitor/core/dist/capacitor.min.js"]) if (fs.existsSync(f)) { fs.copyFileSync(f, "www/capacitor.js"); core = "<script src=\"capacitor.js\"></script>"; break; }
console.log("capacitor.js :", core ? "inclus" : "absent (pont natif seul)");
html = html.replace("</title>", "</title>\n" + core + "<script>window.SJ_ADS = " + JSON.stringify(cfg) + ";</script>");
fs.writeFileSync("www/index.html", html);
'

rm -rf android
npx cap add android
BUILD_NUMBER="${BUILD_NUMBER:-1}" node scripts/setup-android.mjs
npx cap sync android

cd android
chmod +x gradlew
./gradlew --no-daemon --stacktrace bundleRelease assembleDebug
cd ..
mkdir -p dist
cp android/app/build/outputs/bundle/release/app-release.aab dist/super-seddik-joud-unsigned.aab
cp android/app/build/outputs/apk/debug/app-debug.apk dist/super-seddik-joud-test.apk
grep -E "versionCode|versionName|targetSdk|compileSdk|minSdk" android/app/build.gradle android/variables.gradle > dist/versions.txt || true
ls -la dist
