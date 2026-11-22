# Rapport de finalisation — cahier des charges « Football Tunisia 2026 »

Projet : SEDDIK LEAGUE (ex-Football Tunisia 2026, renommé à la demande du propriétaire), https://football-tunisia-2026.onrender.com
Dépôt : `Seddikwass/seddik-fire`, branche `football-tunisia-2026`. Version livrée : **3.60.0**. Date : 22/11/2026.

Ce rapport répond au §15 du cahier des charges. Tout ce qui est marqué « fait » a été testé (tests automatisés et/ou navigateur réel) ; ce qui ne l'est pas est listé dans « Restant ».

## 1. Audit initial — problèmes classés par gravité

| Priorité | Problème constaté | État |
|---|---|---|
| P0 | Écran d'avant-match bloqué en 3.55.0 (import manquant) | Corrigé en 3.56.0, couvert par le test navigateur |
| P0 | Aucun autre blocage reproduit : menus, match complet, mi-temps, fin de match, sauvegarde, reprise (tests e2e mobile et en ligne) | Vérifié |
| P1 | Gardien qui « traversait » son but avant le plongeon, rattrapait des tirs déjà battus | Corrigé (3.56–3.57) : temps de réaction, vitesse bornée, batterie de 26 situations |
| P1 | Cartons tirés au hasard, pas de règle de l'avantage | Corrigé (3.57) : sanctions selon la Loi 12, avantage, carton au prochain arrêt |
| P1 | Pieds qui patinent, cadence de course trop rapide au trot | Corrigé (3.58) : fréquence de pas réelle, foulée liée à la vitesse |
| P1 | Joueurs qui tournent le dos au ballon pour se replacer | Corrigé (3.58) : recul et pas chassé face au jeu |
| P1 | Pas de manette ni de touches configurables sur PC | Corrigé (3.59) |
| P2 | Joueurs anguleux, tête trop grosse, taille « de guêpe » | Corrigé (3.58) : anatomie, lissage, éclairage, LOD |
| P2 | Rayures noires sur certains maillots (bug de facettes) | Corrigé (3.58) |
| P2 | Pas de caméra rapprochée | Corrigé (3.58) : TV proche / standard / large |
| P2 | Volume unique (public, effets, commentaires mélangés) | Corrigé (3.59) : 4 réglages indépendants |
| P2 | Pas de tutoriel, pas d'options d'accessibilité | Corrigé (3.59) : tutoriel interactif, taille du texte, contraste, mode daltonien, sous-titres |
| P2 | Pas de profil graphique automatique | Corrigé (3.59) : « Automatique » selon mémoire et cœurs de l'appareil |
| P3 | Tactiques « possession » et « jeu sur les ailes » absentes | Ajoutées (3.59), avec effet réel sur le choix des passes et des tirs |
| P3 | Hors-jeu et distance parcourue absents de l'écran de fin de match | Ajoutés (3.59) |
| P1 | Pas de pied fort / pied faible, précision indépendante de l'équilibre | Corrigé (3.60) : pied faible noté 1 à 5, pénalité de pivot |
| P3 | Pas de défis ni de récompenses | Ajoutés (3.60) : 10 défis, récompenses esthétiques uniquement |

Captures (dans `docs/audit/`) : accueil, paramètres, accessibilité activée, tutoriel en match et match, en version mobile (844×390) et ordinateur (1366×768).

## 2. Fichiers modifiés (3.55 → 3.59)

- `public/js/match.js` : machine à états du gardien, temps de réaction, sorties aériennes, penalty (pari), calibrage des arrêts ; avantage et sanctions Loi 12 ; replacement face au jeu ; cadence de course ; styles « possession » / « ailes » ; distance parcourue ; radar en mode daltonien ; sous-titres désactivables.
- `public/js/renderer3d.js` : normales lissées, anatomie (tête, cou, trapèzes, maillot, short, avant-bras, mains), éclairage enveloppant et occlusion, LOD par joueur, foulée et recul, geste d'avantage de l'arbitre, caméra réglable.
- `public/js/app.js` : touches configurables, manette (API Gamepad), tutoriel interactif, accessibilité, volumes séparés, qualité automatique, statistiques de fin de match, provenance des tenues, historique des compositions.
- `public/js/audio.js` : bus séparés effets / public / commentaires.
- `public/js/tactics.js` : préréglages Possession et Jeu sur les ailes.
- `public/js/data.js`, `public/js/lineups.js` : compositions réconciliées et du 22/11/2026, historique par match, provenance des tenues.
- `public/js/storage.js`, `public/js/i18n.js`, `public/styles.css`, `public/js/commentary.js` : réglages, traductions, styles, commentaires « avantage ».
- `public/js/challenges.js` (nouveau) : défis et récompenses esthétiques.
- Tests : `tests/keeper.test.mjs`, `tests/referee.test.mjs`, `tests/challenges.test.mjs` (nouveaux), `tests/career.test.mjs`, `tests/match-motion.test.mjs`.

## 3. Tests réalisés

- Suite automatique `npm test` : 22 suites, toutes réussies (règles, score, chronomètre, classement, sauvegarde, gardien 26 situations × 20 essais, arbitrage, tactique, rendu, réseau).
- Navigateur réel (Chromium, rendu WebGL logiciel) : parcours complet mobile (`tests/e2e.mjs`), match en ligne à deux joueurs (`tests/online-e2e.mjs`), et contrôle de cette version sur mobile **et** ordinateur : réglages d'accessibilité appliqués, touche remappée enregistrée, manette simulée qui déplace le joueur, tutoriel qui progresse, aucune erreur JavaScript.
- Simulation de 40 matchs : environ 60-70 % d'arrêts sur tirs cadrés, 1,5 but par match de 5 minutes, ~0,4 carton jaune et 0,04 rouge par match court.
- Non testé ici : appareils Android physiques (pas d'appareil ni de SDK dans cet environnement) ; manette physique (testée par simulation de l'API).

## 4. Maillots — confirmation par équipe

Toutes les tenues sont **non officielles** : couleurs et motifs du club, sans logo ni sponsor, faute de licence (cahier des charges §2). Statut « à confirmer » tant qu'une photo de match datée n'a pas été validée.

| Club | Domicile | Extérieur | 3e tenue | Statut | Dernier onze |
|---|---|---|---|---|---|
| Espérance Sportive de Tunis | stripes #d4141c/#f7c600 manches #d4141c · short #111111 | plain #1a2340/#d4141c · short #1a2340 | — | à confirmer | 22/11/2026 |
| Club Africain | hoops #e30613/#ffffff · short #ffffff | plain #ffffff/#e30613 · short #e30613 | plain #141414/#e30613 · short #141414 | à confirmer | 22/11/2026 |
| Club Sportif Sfaxien | stripes #111111/#ffffff manches #ffffff · short #111111 | plain #151515/#ffffff · short #151515 | plain #cfe6f2/#111111 · short #cfe6f2 | à confirmer | 21/11/2026 |
| Étoile Sportive du Sahel | plain #c8102e/#ffffff · short #ffffff | plain #ffffff/#c8102e · short #ffffff | plain #141414/#c9ccd2 · short #141414 | à confirmer | 21/11/2026 |
| Stade Tunisien | stripes3 #6b1022/#0f6b35 · short #ffffff | plain #0c5a2e/#b5121b manches #b5121b · short #0c5a2e | — | à confirmer | 21/11/2026 |
| US Monastirienne | centerStripe #ffffff/#1d4fa3 manches #1d4fa3 · short #1d4fa3 | centerStripe #1c1c1e/#3a3a3e · short #1c1c1e | — | à confirmer | 21/11/2026 |
| ES Zarzis | stripes #d71920/#f6c400 · short #f6c400 | plain #ffffff/#d71920 · short #ffffff | — | prototype aux couleurs du club | 22/11/2026 |
| ES Métlaoui | stripes #c8161d/#f4c20d · short #c8161d | plain #ffffff/#c8161d · short #ffffff | — | prototype aux couleurs du club | 20/11/2026 |
| JS El Omrane | chestBand #1d3f9a/#f2c200 · short #1d3f9a | stripes #ffffff/#1d3f9a · short #ffffff | — | prototype aux couleurs du club | 21/11/2026 |
| US Ben Guerdane | stripes #ffd400/#151515 · short #151515 | plain #151515/#ffd400 · short #151515 | — | prototype aux couleurs du club | 22/11/2026 |
| AS Marsa | stripes #f4c20d/#0e7a3a · short #0e7a3a | plain #0e7a3a/#f4c20d · short #0e7a3a | — | prototype aux couleurs du club | 20/11/2026 |
| CA Bizertin | plain #f5d000/#111111 · short #111111 | plain #ffffff/#c9a227 · short #111111 | — | prototype aux couleurs du club | 21/11/2026 |
| Olympique de Béja | checkers #d71a21/#ffffff · short #ffffff | plain #ffffff/#d71a21 · short #ffffff | — | prototype aux couleurs du club | 20/11/2026 |
| ES Hammam-Sousse | plain #f2c500/#151515 · short #151515 | plain #151515/#f2c500 · short #151515 | — | prototype aux couleurs du club | 20/11/2026 |
| PS Sakiet Eddaïer | plain #0d6e3a/#f0f0f0 · short #f0f0f0 | plain #f0f0f0/#0d6e3a · short #0d6e3a | — | prototype aux couleurs du club | 20/11/2026 |
| CS Hammam-Lif | stripes #0b7a3b/#ffffff · short #ffffff | plain #ffffff/#0b7a3b · short #ffffff | plain #5b2a86/#ffffff · short #5b2a86 | prototype aux couleurs du club | 20/11/2026 |


Gardiens : tenue différenciée générée automatiquement. Le choix domicile/extérieur/3e tenue est fait automatiquement pour éviter les confusions de couleurs.

## 5. Bugs et limites restants

- Les joueurs restent modélisés par le code (pas de modèles 3D sculptés ni de capture de mouvement) : un rendu de niveau console demanderait des assets 3D professionnels.
- Les lucarnes puissantes ne rentrent qu'environ une fois sur deux (un peu bas) ; les têtes injectées en test sont toujours captées (vitesse d'arrivée trop faible). À recalibrer.
- La distance parcourue est mesurée sur la durée réellement jouée (match accéléré) : elle n'est pas comparable aux ~11 km d'un vrai match de 90 minutes, d'où l'absence de conversion.
- Logos, maillots officiels, voix de commentateurs réels : nécessitent des licences écrites (voir `docs/LICENCES-ASSETS.md` et `docs/DEMANDE-AUTORISATION-COMMENTATEURS.md`).
- Application Android : pas de SDK ici, l'APK doit être générée sur un poste équipé (`android-app/`).
- Compositions : publiées par les médias, à revalider sur la feuille de match officielle de la FTF ; postes des nouveaux joueurs estimés.

## 6. Lancement local et configuration

```bash
git clone https://github.com/Seddikwass/seddik-fire.git && cd seddik-fire && git checkout football-tunisia-2026
npm install
PORT=3000 node server.js          # http://localhost:3000 (stockage fichier local)
DATABASE_URL=postgres://... node server.js   # stockage PostgreSQL (comme en production)
npm test                          # suite complète
```

## 7. Retour à la version précédente

- Sur Render : tableau de bord du service → *Deploys* → choisir le déploiement précédent → *Rollback*.
- Dans Git : `git revert <commit>` puis pousser ; ou redéployer un commit connu (3.59.0 = `a1cbff5`, 3.58.0 = `234ed59`, 3.57.0 = `009214c`).
- État stable de référence sauvegardé : branche `stable-v3.54.0` (commit `e0fc42c`).
- Cache : le service worker est versionné (`ft26-v<version>`) ; chaque nouvelle version invalide l'ancien cache au premier chargement.
