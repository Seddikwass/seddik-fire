# Application Android — Football Tunisia 2026

## Architecture
- **Capacitor 8** : le jeu web (`public/`) est embarqué dans l'application (fonctionne **hors ligne**, sans attendre le serveur Render).
- Identifiant : `com.footballtunisia.ft2026` · minSdk 24 (Android 7) · targetSdk/compileSdk 36 · orientation paysage, plein écran immersif, écran maintenu allumé pendant le jeu.
- **Commentaires vocaux** : la WebView Android ne fournit pas `speechSynthesis` ; un **plugin natif** (`android-app/native/java/NativeTtsPlugin.java`) utilise le moteur de synthèse vocale du téléphone (français, arabe). Le jeu bascule automatiquement sur ce plugin dans l'application.
- **Publicités** : `@capacitor-community/admob`, publicités **récompensées uniquement** (3/jour max, jamais pendant un match ou une transaction). Identifiants de **test** Google dans `android-app/ads.config.json`.
- **Bouton retour** Android : ferme une fenêtre, met le match en pause, revient à l'accueil ; **mise en veille** : sauvegarde immédiate + pause du match + coupure du son, reprise propre.
- **Réseau** : l'API (comptes/synchronisation) est appelée sur `https://football-tunisia-2026.onrender.com` (`android-app/app.config.json`), CORS autorisé pour la WebView. En cas de réseau instable : messages clairs et jeu hors ligne.
- Permissions : `INTERNET` (Capacitor), `AD_ID` (AdMob). Aucune autre.

## Compilation (GitHub Actions)
Le SDK Android n'est pas disponible dans l'environnement de développement de Claude : la compilation se fait sur GitHub Actions (`.github/workflows/ft26-android.yml`) à chaque `push` sur `football-tunisia-2026` (ou via **Actions → Run workflow**).
Résultat publié dans la branche **`football-tunisia-builds`** : `football-tunisia-2026-test.apk`, l'AAB, `build.log`, `versions.txt`, `SHA256SUMS.txt`, `STATUS.txt`.
Le numéro de version Android (`versionCode`) = numéro de compilation GitHub.

## Signature
| Fichier | Signature | Usage |
|---|---|---|
| `football-tunisia-2026-test.apk` | clé de débogage Android | installation directe pour les tests |
| `…-unsigned.aab` | aucune | à signer (ci-dessous) |
| `…-release-signed.aab` | votre clé d'envoi | Google Play |

**Automatiser la signature** (recommandé) : GitHub → dépôt → Settings → Secrets and variables → Actions → ajouter :
`ANDROID_KEYSTORE_BASE64` (contenu du fichier `.jks` encodé en base64), `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`. Les compilations suivantes produisent alors un AAB et un APK de publication signés.

**Signer manuellement un AAB** :
```bash
keytool -genkeypair -v -keystore upload.jks -alias ft26 -keyalg RSA -keysize 2048 -validity 10000   # une seule fois
jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 -keystore upload.jks football-tunisia-2026-unsigned.aab ft26
jarsigner -verify football-tunisia-2026-unsigned.aab
```
⚠ Conservez la clé et ses mots de passe hors du dépôt (jamais dans Git). Avec « Signature d'application Play », une clé d'envoi perdue peut être réinitialisée par Google.

## Installer l'APK de test
1. Télécharger `football-tunisia-2026-test.apk` sur le téléphone.
2. Autoriser « Installer des applications inconnues » pour le navigateur / gestionnaire de fichiers.
3. Ouvrir le fichier → Installer. (Désinstaller une ancienne version si la signature diffère.)

## Plan de test sur appareil (à réaliser — Claude n'a pas d'appareil physique)
| # | Test | Attendu |
|---|---|---|
| 1 | Lancement, icône, écran de démarrage | logo, chargement < 3 s, paysage plein écran |
| 2 | Match : joystick + 4 boutons, multitouch (courir + tirer) | réactif, boutons lisibles, aucun blocage |
| 3 | Son : premier toucher → ambiance, sifflet, but | sons audibles |
| 4 | Voix : Paramètres → « Tester » (FR puis AR) | voix du téléphone (installer la voix arabe si absente) |
| 5 | Veille pendant un match puis réveil | match en pause, reprise sans perte |
| 6 | Bouton retour | pause / retour / sortie |
| 7 | Mode avion → avancer la carrière → réseau | jeu hors ligne, synchronisation ensuite |
| 8 | Publicité récompensée (accueil carrière) | pub de test AdMob, +20 000 DT |
| 9 | Huawei P20 (EMUI, sans services Google) | jeu OK ; publicités AdMob indisponibles (message), voix selon moteur TTS installé |
| 10 | Petits/grands écrans, tablette | interface adaptée (options de taille des boutons) |

Différences WebView / navigateur gérées : synthèse vocale (plugin natif), audio débloqué au premier toucher, stockage local persistant de l'application, orientation forcée, reprise après veille (`appStateChange`), service worker désactivé dans l'application.
