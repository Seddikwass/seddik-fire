# SEDDIK LEAGUE — Audit initial et état du lot 0/1/2 (22/11/2026)

Référence : cahier des charges « SEDDIK LEAGUE — Cahier des charges pour Claude », v1.0 du 22/11/2026.

## 1. État réel constaté au démarrage

| Élément | Constat |
|---|---|
| Dépôt / branche | `Seddikwass/seddik-fire`, branche `football-tunisia-2026`, à jour avec `origin` |
| Dernière version | 3.51.0, commit `3c5157a` (21/11/2026), déployée et *live* sur Render |
| Service Render | `football-tunisia-2026` (Francfort, Node.js, offre gratuite), `npm install --omit=dev` / `node server.js`, contrôle `/api/health` |
| Persistance | PostgreSQL si `DATABASE_URL` est fourni, sinon stockage fichier non persistant (offre gratuite) — **risque P0** : comptes et sauvegardes en ligne perdus à chaque redéploiement sans base PostgreSQL |
| Secrets | Aucun secret dans le code ; `SESSION_SECRET` et `ADMIN_TOKEN` générés par Render ; arrêt du serveur si `SESSION_SECRET` manque en production |
| Code client | ~10 250 lignes JS (moteur de match, rendu WebGL maison, carrière, audio, en ligne) sans dépendance d'exécution |
| Tests | 19 suites automatisées (`npm test`) + 2 scénarios navigateur (`tests/e2e.mjs`, `tests/online-e2e.mjs`) |
| Android | Projet Capacitor (`android-app/`), identifiant `com.footballtunisia.ft2026`. **Aucun SDK Android dans cet environnement de travail : pas de build APK/AAB possible ici.** Le build se fait avec `android-app/build.sh` sur une machine équipée (Android Studio / SDK 34+). |
| Modèles 3D | Joueurs construits par code (ellipsoïdes et cylindres) ; aucun fichier GLB/glTF, aucun rig, aucune texture PBR |
| Écussons | Badges typographiques générés par le jeu (non officiels) ; aucun fichier de club sous licence |
| Voix | Synthèse vocale du système (navigateur / Android), aucune voix enregistrée |

## 2. Risques et priorités

**P0**
- Persistance en ligne : brancher une base PostgreSQL (plan payant Render ou autre) avant toute communication publique.
- Exactitude des données : les compositions importées sont un snapshot multi-sources (voir §4) à revalider sur les feuilles FTF.
- Droits : noms réels des joueurs, maillots, écussons et voix exigent des autorisations avant une publication commerciale (Google Play). L'option « noms fictifs » existe déjà dans les réglages.
- Build Android : à produire et signer hors de cet environnement (SDK absent).

**P1**
- Rendu « premium » des joueurs : nécessite des modèles GLB riggés, des animations capturées et des textures PBR réalisés par un artiste 3D (ou achetés sous licence). Le moteur actuel est procédural ; il faut ajouter un chargeur glTF + skinning dans `renderer3d.js` (WebGL1) — chantier de plusieurs semaines.
- Commentaires enregistrés : moteur d'événements déjà en place (`commentary.js`), il manque les enregistrements sous contrat.

**P2**
- Compétitions supplémentaires, entraînement guidé, profils graphiques plus fins.

## 3. Livré dans cette version (3.52.0)

- **Lot 1 — Rebranding** : nom SEDDIK LEAGUE (titre, écran de chargement, accueil, manifeste PWA, nom de l'application Android, panneaux du stade, présentation d'avant-match, documentation), nouveau logo et nouvelles icônes originaux (`public/brand/mark.svg`). Identifiant Android, URL Render, clés de stockage et sauvegardes **inchangés**.
- **Système VAR** basé sur l'état du moteur (aucune décision « aléatoire » affichée) :
  - l'arbitre assistant laisse passer environ un hors-jeu serré sur deux (marge < 55 cm) ; si l'action finit en but dans la même possession, la VAR l'annule après le ralenti (score, buteur, passeur, résumé, note et statistiques corrigés, coup franc pour la défense) ;
  - lignes de hors-jeu tracées pendant le ralenti (défenseur en bleu, attaquant en rouge) ;
  - penalty sifflé à tort pour une faute à moins d'un mètre de la surface : visionnage, puis coup franc ;
  - en match hors ligne, chaque but passe un « contrôle de routine » affiché ;
  - les passeurs ne voient plus toujours un hors-jeu de quelques centimètres : les hors-jeu (signalés ou non) existent désormais en match ;
  - test de non-régression : le score est toujours égal au nombre de buts validés dans le résumé.
- **Lot 2 — Compositions** : dernier onze publié des 16 clubs, avec match, date, source, URL et statut (`official` / « à revalider »). Les postes non fournis par la source sont estimés par le jeu et marqués « estimé » dans l'effectif.

## 4. Données à revalider (contrôle humain requis)

Correspondances de graphie retenues entre la source et l'effectif existant :

| Club | Nom dans la source | Nom dans le jeu | Remarque |
|---|---|---|---|
| css | Jacques Mbé | Jack Mbe | correspondance nom — graphie à valider |
| css | Rayen Derbeli | Rayane Derbali | correspondance nom — graphie à valider |
| usm | A. Slimane | Ahmed Slimane | correspondance initiale — graphie à valider |
| usm | Y. Herch | Youssef Herch | correspondance initiale — graphie à valider |
| usm | A. Benga Youssouf | Aboubakar Benga Youssouf | correspondance nom — graphie à valider |
| usm | R. Boukadida | Rayan Boukadida | correspondance initiale — graphie à valider |
| usm | M. Ghorbel | Mahmoud Ghorbel | correspondance initiale — graphie à valider |
| usm | A. Boulila | Adem Boulila | correspondance initiale — graphie à valider |
| usm | C. El Djebali | Chaïm El Djebali | correspondance nom — graphie à valider |
| usm | O. Diane | Ousmane Diané | correspondance initiale — graphie à valider |
| usm | R. Bouchniba | Raed Bouchniba | correspondance initiale — graphie à valider |
| usm | Y. Amri | Yassine Amri | correspondance initiale — graphie à valider |
| ess | R. Gazzeh | Raed Gazzeh | correspondance initiale — graphie à valider |
| ess | N. Ferjani | Najeh Ferjani | correspondance initiale — graphie à valider |
| ess | A. Amri | Abdallah Amri | correspondance initiale — graphie à valider |
| ess | B. Diarra | Boubacar Diarra | correspondance initiale — graphie à valider |
| ess | W. Kechrida | Wajdi Kechrida | correspondance initiale — graphie à valider |
| ess | O. Ambrose | Ambrose Ochigbo | correspondance initiale — graphie à valider |
| ess | O. Diakhaté | Ousmane Diakité | correspondance initiale — graphie à valider |
| ess | O. Abid | Oussama Abid | correspondance initiale — graphie à valider |
| est | Jesús Castillo | Castillo | correspondance nom — graphie à valider |
| est | Mohamed Belhadj Mahmoud | Mohamed Hadj Mahmoud | correspondance nom — graphie à valider |

Autres points :
- **EST** : la fiche du club et La Presse (même match du 07/11) divergent sur 3 titulaires ; la source club est retenue (ordre de priorité du cahier des charges).
- **ESHS / PSSE** : l'URL Derbista porte la date du 21/10 pour un match du 20/11.
- **ST** : postes appuyés sur une ancienne feuille ordonnée par lignes ; autres postes estimés.
- Pour les clubs sans effectif réel complet (11 clubs), seuls les 11 titulaires sont réels ; le reste de l'effectif est généré (noms fictifs signalés comme tels dans le jeu).

## 5. Plan de rollback

Render conserve les déploiements précédents : en cas de régression, relancer le déploiement du commit précédent (`3c5157a`, v3.51.0) depuis le tableau de bord Render ou via `git revert` puis redéploiement. Les sauvegardes locales (localStorage) ne sont pas modifiées par ce lot.
