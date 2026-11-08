#!/usr/bin/env bash
set -euo pipefail
ROOT=$(pwd)
# Version de Capacitor alignée sur celle demandée par le plugin AdMob
ADMOB_VER=$(npm view @capacitor-community/admob version)
npm view @capacitor-community/admob@$ADMOB_VER --json > admob-meta.json
PEER=$(python3 -c "
import json,re
d=json.load(open('admob-meta.json'))
for k in ('peerDependencies','devDependencies','dependencies'):
  v=(d.get(k) or {}).get('@capacitor/core')
  if v:
    print(re.findall(r'\d+',v)[0]);break
else: print(7)")
echo "admob=$ADMOB_VER capacitor-major=$PEER" | tee out/versions.txt
cat > package.json <<P
{"name":"seddik-fire","private":true,"version":"1.0.0"}
P
npm i --no-audit --no-fund @capacitor/core@^$PEER @capacitor/cli@^$PEER @capacitor/android@^$PEER @capacitor-community/admob@$ADMOB_VER
npx cap --version | tee -a out/versions.txt
npx cap add android
python3 patch.py
npx cap sync android
grep -E "compileSdk|targetSdk|minSdk" android/variables.gradle | tee -a out/versions.txt
cd android
chmod +x gradlew
./gradlew --no-daemon bundleRelease assembleDebug
cp app/build/outputs/bundle/release/app-release.aab "$ROOT/out/seddik-fire-unsigned.aab"
cp app/build/outputs/apk/debug/app-debug.apk "$ROOT/out/seddik-fire-test.apk"
echo BUILD_OK | tee -a "$ROOT/out/versions.txt"
