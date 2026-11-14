# Seddik Fire — appli Android (Capacitor + AdMob)

Branche de construction de l'appli Google Play. Chaque envoi sur cette branche lance
GitHub Actions, qui fabrique le .aab (non signé) et un .apk de test, publiés sur la
branche `android-out`.

- `www/` : le jeu (copie de la version en ligne)
- `ads.json` : identifiants AdMob (actuellement les identifiants de TEST de Google) et numéro de version
- `res/` : icônes

## Mettre le jeu à jour dans l'appli

1. Copier `index.html`, `manifest.webmanifest`, `privacy.html` et `icons/` de la branche `main` dans `www/`.
2. Si `buildGround`, `genWorld`, `decoCity` ou `gradeCanvas` ont changé, les textures de `www/ground/` ne correspondent plus (leur nom contient une empreinte de ce code) : il faut les régénérer, sinon le jeu les recalcule au lancement et elles pèsent pour rien dans l'appli.
3. Augmenter `versionCode` dans `ads.json` à chaque envoi sur Google Play.

Version actuelle : 2.10.0 (versionCode 73), 18 cartes, textures `h8tm4k`.
