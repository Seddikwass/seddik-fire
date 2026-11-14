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
# Synthèse vocale native pour la radio d'équipe (version compatible avec Capacitor $PEER, facultative)
TTS_VER=$( (npm view "@capacitor-community/text-to-speech@*" peerDependencies --json 2>/dev/null || echo '{}') | PEER=$PEER python3 -c "
import json,os,re,sys
try: d=json.load(sys.stdin)
except Exception: d={}
P=os.environ['PEER'];best=None
items=d.items() if isinstance(d,dict) and not ('@capacitor/core' in d) else []
def key(v): return [int(x) for x in re.findall(r'\d+',v)[:3]]
for v,peer in items:
  if '-' in v or not isinstance(peer,dict): continue
  c=peer.get('@capacitor/core','')
  m=re.findall(r'\d+',c)
  if m and m[0]==P and (best is None or key(v)>key(best)): best=v
print(best or '')" )
if [ -n "$TTS_VER" ]; then npm i --no-audit --no-fund @capacitor-community/text-to-speech@$TTS_VER && echo "tts=$TTS_VER" | tee -a out/versions.txt || echo "tts=echec" | tee -a out/versions.txt; else echo "tts=aucune" | tee -a out/versions.txt; fi
npx cap --version | tee -a out/versions.txt
npx cap add android
python3 patch.py
npx cap sync android
grep -E "compileSdk|targetSdk|minSdk" android/variables.gradle | tee -a out/versions.txt
cd android
chmod +x gradlew
sed -i 's/networkTimeout=[0-9]*/networkTimeout=180000/' gradle/wrapper/gradle-wrapper.properties
ok=0
for t in 1 2 3; do
  if ./gradlew --no-daemon bundleRelease assembleRelease; then ok=1; break; fi
  echo "Nouvel essai ($t)"; sleep 20
done
[ $ok = 1 ]
cp app/build/outputs/bundle/release/app-release.aab "$ROOT/out/seddik-fire-unsigned.aab"
BT=$(ls -d $ANDROID_HOME/build-tools/* | sort -V | tail -1)
keytool -genkeypair -keystore test.jks -storepass testtest -keypass testtest -alias test -keyalg RSA -keysize 2048 -validity 3650 -dname "CN=Seddik Fire Test" >/dev/null 2>&1
$BT/zipalign -f -p 4 app/build/outputs/apk/release/app-release-unsigned.apk aligned.apk
$BT/apksigner sign --ks test.jks --ks-pass pass:testtest --out "$ROOT/out/seddik-fire-test.apk" aligned.apk
$BT/apksigner verify "$ROOT/out/seddik-fire-test.apk" && echo APK_SIGNED_OK
echo BUILD_OK | tee -a "$ROOT/out/versions.txt"
