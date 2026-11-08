# SUPER SEDDIK@JOUD — application Android

Application Android (Capacitor 8) qui embarque le jeu web et les publicités Google AdMob.

- Identifiant de l'application : `com.seddikjoud.superracing`
- Cible : Android 16 (API 36), minimum Android 7.0 (API 24)
- Publicités : vidéo récompensée (doubler les gains, bonus +1 000 $) et interstitiel 1 course sur 3 — fichier `ads.config.json`
- Compilation : chaque envoi sur la branche `sj-android` lance GitHub Actions ; le résultat (AAB non signé, APK de test, journal) est publié dans la branche `sj-android-builds`.
- La signature de l'AAB pour Google Play se fait avec la clé d'envoi (upload key), conservée hors du dépôt.
