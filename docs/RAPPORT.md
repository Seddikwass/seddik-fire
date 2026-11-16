# Rapport final — Football Tunisia 2026 (v1.0.0)
*Rédigé le 16 novembre 2026. Réalisé par Claude (Anthropic) à partir du cahier des charges du 16/11/2026.*

## 1. Audit initial (phase 1)
| Point | Constat |
|---|---|
| Projet existant | **Aucun jeu de football** dans les dépôts du compte GitHub `Seddikwass`. Les jeux existants (Seddik Fire, SUPER SEDDIK@JOUD, Seddik en Force) vivent sur des branches du dépôt `seddik-fire`. |
| Décision | Projet **distinct** sur une nouvelle branche `football-tunisia-2026` (et `football-tunisia-builds` pour les fichiers Android). **Aucune branche existante n'a été modifiée** ; Super Seddik@Joud est intact (sauvegarde = branches Git inchangées). |
| Réutilisé | La chaîne de compilation Android éprouvée de Super Seddik@Joud (GitHub Actions + Capacitor 8 + AdMob), adaptée. |
| Environnement de Claude | Node 22, Java 21, Chromium (Playwright), PostgreSQL local de test. **Pas de SDK Android ni d'accès npm** → compilation Android sur GitHub Actions. Accès Render via l'outil Render, accès GitHub via le proxy Git de la session. |
| Risques identifiés | Licences (noms de clubs), données sportives à vérifier, base gratuite Render limitée à 1 et expirant à 30 jours, voix indisponible dans la WebView Android. |

## 2. Architecture
- **Client** (`public/`) : JavaScript natif en modules ES, **sans dépendance** (rapide, fonctionne hors ligne). Rendu du match en **Canvas 2D avec projection perspective** (2.5D, caméra télévisée) ; audio **entièrement synthétisé** (Web Audio : foule, sifflet, frappes, rythme de darbouka original) ; voix : `speechSynthesis` (navigateur) ou **plugin natif Android**.
- **Serveur** (`server.js`, `lib/store.js`) : Node.js, API REST (comptes, sauvegardes, historique, administration, données), **PostgreSQL** avec migrations versionnées et schéma dédié `ft26`, repli fichier en développement.
- **Android** (`android-app/`) : Capacitor 8, plein écran paysage, plugin TTS natif, AdMob récompensé, bouton retour, reprise après veille.
- Dépendances serveur : `pg` uniquement. Android : `@capacitor/*`, `@capacitor-community/admob`.

## 3. Fonctionnalités réalisées
### Match (phase 2)
- 11 contre 11 sur terrain réglementaire (105 × 68 m), ballon physique en 3D (hauteur, rebonds, frottements, poteaux, barre), tribunes animées aux couleurs du club, panneaux publicitaires fictifs, projecteurs.
- **Commandes tactiles** : joystick dynamique, Tir (maintenir = puissance, orientation au joystick), Passe, Profondeur, Sprint ; en défense les boutons deviennent **Tacle / Changer / Pressing**. Côté gaucher, taille des boutons réglable. Clavier sur PC.
- **IA** : placement par formation et lignes, appels en profondeur, soutien, centres, têtes, pressing (1 ou 2 joueurs selon la consigne), marquage, couverture, gardien (placement sur l'angle, sorties, plongeons, arrêts, parades en corner), transitions.
- Règles : touches, corners, six-mètres, coups francs, **penaltys**, cartons jaunes/rouges (expulsion), blessures, mi-temps avec changement de côté, temps additionnel, 5 remplacements, changement de mentalité/pressing en pause.
- **Ralenti** automatique après chaque but (caméra rapprochée, passable), commentaires texte + voix (français/arabe), radar, score et chrono.
- Paramètres : durée (3 à 15 min), difficulté, assistance passe/tir, qualité graphique, 30/60 i/s, ralentis.
- **Simulation rapide** d'un match ou de la fin d'un match.

### Compétitions (phases 3 et 5)
- **Ligue 1 2026-27 : 16 clubs vérifiés** (voir §6), 30 journées aller/retour, classement (points, différence, buts), forme, buteurs, calendrier.
- **Ligue 2** (structure extensible, 16 clubs, poule unique simplifiée), **montées/descentes** (3, à confirmer).
- **Coupe de Tunisie** (32 clubs, tirages, élimination directe, tirs au but), **Supercoupe**.
- **Ligue des Champions CAF** et **Coupe de la Confédération CAF** : 4 groupes de 4, quarts, demies et finale **aller-retour** (cumul, tirs au but, pas de buts à l'extérieur), qualifications automatiques d'une saison à l'autre (2 places C1, 3e + vainqueur de coupe en C2).

### Carrière et gestion (phase 4)
- Choix du club (16 clubs de L1) ou **club fictif** personnalisé (nom, sigle, ville, stade, couleurs), difficulté, objectifs sportif et financier, **saisons multiples** (vieillissement, progression, retraites, jeunes du centre de formation, réputation, palmarès, historique).
- **Président & élections** : confiance des membres, mandats de 2 saisons, candidats adverses avec programmes, choix de programme, actions de campagne, promesses (vérifiées la saison suivante), vote simulé selon résultats/finances/satisfaction/réputation, **vote de confiance extraordinaire** en cas de crise, démission, défaite = fin du mandat avec offres d'autres clubs.
- **Staff** : 10 postes obligatoires (entraîneur, 2 adjoints, préparateur physique, entraîneur des gardiens, directeur sportif, directeur financier, médecin-chef, 2 kinés, 2 recruteurs, responsable formation), attributs, salaires, contrats, recrutement négocié, renouvellement, licenciement avec indemnités, **effets mesurables** (force, progression, prix, sponsors, blessures, précision du recrutement, qualité des jeunes).
- **Transferts** : marché filtrable (poste, âge, nationalité, note, potentiel, prix, salaire, contrat, libres, nom), notes estimées selon les recruteurs, offres avec indemnité, bonus, % à la revente, **échange de joueur**, salaire, prime à la signature, durée, rôle ; **prêts** (part de salaire, option d'achat) ; contre-offres ; **offres concurrentes** ; offres reçues (accepter/refuser/contre-offre) ; liste des transferts ; résiliation ; prolongations avec demandes et mécontentement ; **confirmation obligatoire**, blocage des doublons, contrôle du budget et du plafond salarial, soldes négatifs interdits par défaut.
- **Effectif** : fiches complètes (postes, âge, pied, taille, 7 attributs, moral, forme, potentiel, valeur, historique), titulaires/remplaçants/réserve/jeunes, capitaine, numéros, rôles. **Entraînement** collectif (intensité, thème) et individuel. **Tactique** : 6 formations, mentalité, pressing, largeur, ligne défensive, tireurs de penalty/coups francs/corners, consignes individuelles (utilisées par le moteur de match).
- **Médical** : blessures (type, gravité, durée, phase soins/rééducation/réathlétisation, risque de rechute), examen/diagnostic, 3 protocoles (standard, intensif, prudent) avec coûts et effets, charge et fatigue, influence du staff et du centre médical sans prévisibilité totale.
- **Finances** : billetterie (prix réglable), abonnements, sponsors (3 offres), droits TV, produits dérivés, primes de compétition, ventes ; salaires, staff, primes de victoire, entretien, formation, soins, déplacements ; emprunts bancaires, rapport par poste, journal des opérations. Barèmes simulés.
- **Infrastructures** : stade, pelouse, éclairage, centre d'entraînement, académie, centre médical (5 niveaux, travaux avec délai). **Supporters** : satisfaction, affluence, ambiance, affiches à forte rivalité, pression médiatique.
- **Publicité récompensée** facultative (3/jour, +20 000 DT), jamais pendant un match ou une transaction ; bannières et interstitiels **non utilisés** ; aucun achat intégré.

### Plateformes, comptes et sauvegardes (phases 6 et 7)
- Interface **français / arabe (RTL)**, anglais partiel (architecture prête). Menus demandés : Accueil, Carrière, Match, Effectif, Tactique, Transferts, Staff, Finances, Infrastructures, Compétitions, Classements, Paramètres (+ Médical, Président).
- Sauvegarde locale automatique après chaque décision, export/import de fichier, comptes en ligne (scrypt, jetons HMAC), synchronisation prudente avec détection de conflit, historique des 5 dernières révisions, jeu hors ligne (PWA + service worker), messages réseau compréhensibles.
- Panneau d'administration `/admin.html` : correction des clubs sans code, statistiques, export/restauration complets.

## 4. Livrables et preuves
| Livrable | Statut | Preuve |
|---|---|---|
| Version web Render | ✅ en ligne | https://football-tunisia-2026.onrender.com — service `srv-dbtgsn8ae00c73dd5big`, déploiement `live`, journaux : « démarrage version 1.0.0 », « serveur à l'écoute port 10000 » |
| Code source | ✅ | dépôt `Seddikwass/seddik-fire`, branche `football-tunisia-2026` |
| APK de test | ✅ compilé (compilation n° 2, `BUILD SUCCESSFUL`) | branche `football-tunisia-builds`, SHA-256 dans `SHA256SUMS.txt` ; contenu vérifié (jeu, URL API, plugin TTS) |
| AAB Google Play | ✅ compilé, **signé** avec une clé d'envoi générée pour le propriétaire (`jarsigner -verify` : « jar verified ») | fichier remis au propriétaire avec la clé |
| Base persistante | ⚠ **à activer** (voir §5) | code PostgreSQL testé sur un vrai PostgreSQL 16 local |

## 5. Tests réalisés
| Test | Résultat |
|---|---|
| `tests/career.test.mjs` — 2 saisons complètes (44 matchs/saison pour le club), transferts, doublon bloqué, staff, infrastructures, élection, sauvegarde/restauration JSON | ✅ (aussi exécuté dans GitHub Actions) |
| `tests/api.test.mjs` — inscription, mot de passe invalide, doublon, connexion, sauvegarde invalide refusée, révisions, **conflit 409**, jeton falsifié, **redémarrage du serveur : sauvegarde conservée**, admin (jeton faux refusé), données admin, export sans mot de passe en clair, restauration | ✅ sur fichier **et sur PostgreSQL 16 réel** (schéma `ft26` isolé, table `public.users` étrangère intacte) |
| `tests/e2e.mjs` — Chromium, écran de téléphone 844×390 tactile : 27 écrans, création de carrière, sponsor, toutes les rubriques, match joué au joystick et aux boutons, pause, simulation de fin, résultat enregistré, avance du calendrier, **rechargement de la page → carrière restaurée**, arabe, match IA contre IA | ✅ **aucune erreur JavaScript** — captures dans `docs/captures/` |
| `tests/match-sim.mjs` — IA contre IA sur 90 min | ≈ 2 à 3 buts, 14 tirs, 180 passes (≈ 65 % réussies), 15 fautes par match |
| `tests/match-user.mjs` — joueur automatique utilisant uniquement les commandes (joystick, passe, tir, tacle, changement) | ✅ buts marqués et encaissés, commandes fonctionnelles |
| Build Android GitHub Actions | ✅ compilation n° 2 (la n° 1 a échoué : ressource `splash` manquante, corrigée) |
| Mode production sans base | ✅ comptes désactivés avec message clair (aucune fausse promesse de sauvegarde) |

**Non réalisé par Claude** (pas d'accès) : test sur téléphone Android physique / Huawei P20, publication Google Play. Le plan de test sur appareil est dans `docs/ANDROID.md`.

## 6. Données sportives — vérification (16/11/2026)
- 16 clubs de Ligue 1 2026-27 : classement 2026-27 (thestatsapi.com) croisé avec le classement final 2025-26 et les montées de Ligue 2 (rsssf.org « Tunisia 2025/26 ») — relégués JS Kairouanaise, AS Soliman, AS Gabès ; promus ES Hammam-Sousse, PS Sakiet Eddaïer, CS Hammam-Lif.
- Champion 2025-26 : Club Africain ; Coupe 2025-26 : Espérance (1-0 contre ES Zarzis). Qualifiés CAF : Club Africain, Espérance (C1) ; CS Sfaxien (C2) ; **2e place C2 incertaine** (Stade Tunisien mis par défaut).
- **Données incertaines signalées dans le jeu** : nombre de relégués 2026-27, critères de départage LNFP, format de la Supercoupe, liste de Ligue 2 2026-27, formats CAF (préliminaires non modélisés), couleurs et stades de certains petits clubs, forces des clubs africains.
- **Fictif** : tous les joueurs, entraîneurs et membres du staff (aucun effectif réel reproduit), sponsors, barèmes financiers, écussons (dessins géométriques originaux).

## 7. Bugs connus et limites
1. Graphismes : personnages dessinés en 2.5D (pas de modèles 3D animés type moteur 3D).
2. Pas de hors-jeu ; coups francs joués comme une relance (pas de visée dédiée) ; séances de tirs au but simulées (non jouées).
3. Ligue 2 en poule unique ; CAF sans tours préliminaires.
4. Réussite des passes de l'IA ≈ 65 % (un peu basse) ; possession affichée calculée sur la partie jouée en cas de simulation de fin.
5. Comptes en ligne inactifs tant que `DATABASE_URL` n'est pas défini.
6. Anglais partiel ; pas de version iOS.
7. Consentement publicitaire : choix « personnalisées / non personnalisées » dans les paramètres ; le formulaire Google UMP (obligatoire pour l'Espace économique européen) n'est pas intégré.

**Reproduire un bug** : noter la version (`/api/health`), exporter la carrière (Paramètres → Exporter), décrire les étapes ; le moteur de match se rejoue avec `tests/match-sim.mjs`.

## 8. Reste à faire (actions du propriétaire)
1. **Base PostgreSQL payante** + variable `DATABASE_URL` (`docs/DEPLOIEMENT.md` §3).
2. Ajouter les **4 secrets GitHub** de signature pour que chaque compilation produise un AAB/APK signé (`docs/ANDROID.md`).
3. **Compte AdMob** : identifiants réels dans `android-app/ads.config.json`, puis `"test": false`.
4. Tester l'APK sur téléphone (plan de test) et remonter les écarts.
5. Google Play Console : fiche (`docs/FICHE-PLAY.md`), captures, politique de confidentialité (`/privacy.html` — compléter éditeur et contact), questionnaire de contenu, test fermé (12 testeurs × 14 jours pour un nouveau compte personnel).
6. **Licences** avant diffusion publique : noms et identités des clubs (clubs, LNFP/FTF), éventuellement compétitions CAF ; en l'absence d'accord, remplacer par des clubs fictifs via `/admin.html`.

## 9. Licences
- Code, graphismes, sons et textes : créations originales du projet. Aucun asset, logo, interface, musique ou commentaire de Dream League Soccer ou d'un autre jeu.
- Dépendances : Capacitor (MIT), @capacitor-community/admob (MIT), node-postgres (MIT).
- Les marques des clubs et compétitions appartiennent à leurs détenteurs ; utilisées ici comme données de démonstration.
