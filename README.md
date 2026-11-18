# ⚽ Football Tunisia 2026

Jeu de football tunisien : **matchs en 2.5D jouables** (caméra télé, 11 contre 11, IA, commandes tactiles) et **carrière de président** (Ligue 1 2026-27, Coupe de Tunisie, Ligue des Champions et Coupe de la Confédération CAF, élections, staff, transferts, médical, finances, infrastructures, supporters).

- **Web** : `server.js` (Node 20+, sans framework) sert le jeu et l'API (`/api`). Déployé sur Render.
- **Android** : `android-app/` (Capacitor 8) — APK de test + AAB compilés par GitHub Actions.
- **Données** : `public/js/data.js` (sources et date de vérification en tête du fichier) — modifiables sans code via `/admin.html`.

## Version 3.2.0 — tirs cadrés mesurés et gardiens plus réactifs
- Un tir cadré est comptabilisé au moment où il est réellement arrêté dans le cadre ou lorsqu'il entre dans le but ; la visée initiale ne suffit plus.
- Les arrêts et les buts ne sont comptés qu'une fois, et les frappes hors cadre ne gonflent plus la statistique des tirs cadrés.
- Les têtes suivent la même règle de comptage que les frappes au pied.
- Les appuis latéraux du gardien varient selon sa note et le temps restant avant l'arrivée du tir.
- Le banc IA contre IA utilise une graine déterministe et six matchs dans les tests automatiques afin de rendre les comparaisons reproductibles.

## Version 3.1.0 — conduite de balle et foulée plus naturelles
- La cadence des foulées dépend de la vitesse et de l'attribut de vitesse, avec une transition progressive entre marche, course et sprint.
- La conduite du ballon alterne des touches courtes et des poussées plus longues selon la vitesse, le dribble, la technique et la fatigue.
- Les joueurs techniques gardent le ballon plus près du pied, y compris en accélération.
- L'IA évalue les positions futures des adversaires sur ses couloirs de conduite et réduit son allure quand l'espace se ferme.
- Le sprint du porteur est réservé aux couloirs réellement dégagés.
- Tests dédiés à la cadence, au contrôle rapproché, à la fatigue et aux limites des touches de balle.

## Version 3.0.1 — projection des joueurs stabilisée
- Correction de la silhouette pour les déplacements vers la profondeur : compression horizontale contrôlée sans incliner ni écraser le corps.
- Le profil latéral reste complet quand le joueur traverse le terrain et le sprite se retourne proprement dans le sens opposé.
- Tests renforcés sur les orientations de face, de profil et en profondeur.

## Version 3.0.0 — mouvement professionnel et orientation des joueurs
- Accélération vectorielle : la poussée maximale est identique en ligne droite et en diagonale, avec inertie de course conservée.
- Freinage d'approche : les joueurs réduisent leur vitesse avant le point de replacement au lieu de le dépasser et de zigzaguer.
- Consignes IA amorties : les changements de cibles tactiques sont progressifs pour limiter les hésitations et les à-coups.
- Orientation du corps projetée depuis l'angle réel de déplacement : les joueurs ne restent plus dessinés de profil quand ils courent vers le haut ou le bas du terrain.
- La cadence des jambes est recalibrée et les gestes de passe, tir, tête et première touche suivent l'orientation du joueur.
- Rendu des maillots et du visage enrichi par des ombrages et des contours discrets.
- Tests dédiés au freinage, à l'accélération diagonale, au lissage tactique et à la matrice de projection.

## Version 2.9.0 — gestes de tacle et ralentis enrichis
- Tacle glissé animé en trois temps : engagement, extension de la jambe et reprise d'appui.
- Les bras s'écartent pour équilibrer le geste, tandis que le joueur descend légèrement vers le sol.
- La durée de l'animation varie entre un tacle réussi, une tentative courte et une intervention sur ballon libre.
- Les ralentis enregistrent la réaction au contact et la durée exacte du tacle pour reproduire le même mouvement.
- Tests dédiés à la progression, à l'extension, à la récupération et aux limites des animations.

## Version 2.8.0 — duels physiques et équilibre des frappes
- Les impacts entre adversaires sont répartis selon le physique, l'agilité et l'endurance : un joueur robuste garde mieux son équilibre.
- L'impulsion transmise à chaque joueur varie avec sa masse athlétique au lieu d'être parfaitement symétrique.
- Les animations de contact et de déséquilibre sont déclenchées selon la sévérité réelle du choc.
- La visée automatique cherche une zone latérale plus ambitieuse ; les qualités du tireur continuent de déterminer la précision.
- Tests sur les contacts, l'avantage physique, la fatigue et la profondeur de visée.

## Version 2.7.0 — plongeons des gardiens et réactions aux tirs
- Les plongeons distinguent les frappes basses, les tirs à mi-hauteur et les ballons vers les lucarnes.
- L'extension des bras et la durée de l'animation varient selon la distance latérale, la vitesse du tir, le temps de réaction et la note du gardien.
- Les replays conservent la hauteur et l'extension du plongeon pour éviter une animation différente au ralenti.
- Tests de non-régression sur les plongeons gauche/droite, bas/haut et les réactions tardives.

## Version 2.6.0 — appels offensifs et soutien collectif
- Le porteur dispose de trois solutions coordonnées : appel en profondeur, soutien extérieur et appui court.
- Les appels de profondeur sont plafonnés derrière le deuxième dernier adversaire pour éviter les courses artificiellement hors-jeu.
- Les rôles sont attribués à des joueurs distincts, en tenant compte du poste, des qualités et de la pression adverse.
- Les tests couvrent les lignes défensives compactes et les deux sens d'attaque.

## Version 2.5.0 — pressing collectif et couverture des lignes
- Pressing réparti en rôles : premier défenseur sur le porteur, deuxième en couverture intérieure, troisième en fermeture du couloir opposé selon l'intensité.
- Attribution des rôles selon le temps d'interception, la vitesse et la forme physique ; gardiens et joueurs expulsés exclus.
- Le bloc défensif conserve sa structure au lieu d'envoyer plusieurs joueurs au même endroit.
- Version affichée dans l'interface alignée sur la version du moteur et du serveur.
- Tests de répartition, de couverture, d'exclusion et de cibles valides ajoutés.

## Version 2.4.0 — passes et frappes plus intelligentes
- Évaluation des lignes de passe sur la durée réelle du ballon : les trajectoires tiennent compte des adversaires qui se déplacent pour couper la passe, pas seulement de leur position au départ.
- Choix du receveur enrichi par l'espace estimé à l'arrivée et la sécurité de la trajectoire.
- Dispersion des frappes recalibrée selon la finition, la technique, la pression, l'équilibre et la puissance demandée ; une frappe puissante reste plus difficile à maîtriser.
- Gardiens : portée et probabilité d'arrêt selon la note, le placement latéral, la hauteur, la vitesse du tir et le temps de réaction ; les frappes en lucarne gardent un avantage offensif.
- Visée automatique vers le côté opposé au gardien, tout en conservant la visée manuelle du joueur et les limites physiques du but.
- Tests dédiés aux interceptions statiques et anticipées, à la précision des tireurs et à la visée face au gardien.

## Version 2.3.0 — caméra de match plus vivante
- Caméra broadcast légèrement anticipée sur la vitesse et la direction du ballon.
- Zoom d'action progressif lorsque le jeu entre dans le dernier tiers offensif ou qu'une frappe est déclenchée.
- Cadrage de replay conservé, avec transitions douces pour éviter les mouvements brusques.
- Tests sur l'anticipation, les limites de zoom et le maintien du cadrage ralenti.

## Version 2.2.0 — règle du hors-jeu
- Position de hors-jeu calculée au départ de chaque passe selon le ballon, la moitié de terrain et le deuxième dernier adversaire.
- Le drapeau n'est sifflé que lorsque le joueur en position intervient sur le ballon ; la reprise revient à l'équipe adverse à l'endroit de l'infraction.
- Les corners, six mètres, touches et engagements sont exemptés.
- Commentaire de hors-jeu en français et en arabe.
- Statistique et événement de hors-jeu intégrés au rapport du match.
- Tests dédiés aux deux sens d'attaque, à l'alignement défensif et aux exceptions de remise en jeu.

## Version 2.1.0 — intelligence de match, conduite et duels
- IA du porteur : évaluation de plusieurs couloirs courts avec anticipation des déplacements adverses ; la progression reste privilégiée lorsque l'axe est libre.
- Mouvement des joueurs : accélération et rotation adaptées à la vitesse, à l'agilité, à la technique, au physique et à la fatigue.
- Tacles : probabilité de récupération et de faute évaluée selon les attributs, l'orientation, la distance, la vitesse de fermeture et une approche par derrière.
- Ballon dévié après un tacle : l'impulsion tient davantage compte du mouvement des deux joueurs.
- Statistiques de match : tentatives de tacle et tacles gagnés comptabilisés.
- Tests de non-régression ajoutés sur les couloirs de conduite, la fatigue et l'équilibre des duels.

## Version 2.0.0 — refonte visuelle du match 2.5D
- Pelouse procédurale haute définition : brins courbes et micro-reflets, avec une densité adaptée aux profils graphique bas, moyen et haut.
- Zones d'usure subtiles autour du rond central et des surfaces pour donner plus de matière au terrain sans masquer les lignes.
- Tribunes enrichies par des silhouettes de supporters animées, désactivées automatiquement lorsque l'appareil manque de puissance.
- Joueurs mieux articulés : genoux et coudes visibles, appuis plus lisibles pendant la course et les gestes techniques.
- Ballon retravaillé avec volume lumineux, coutures de panneaux et ombre qui s'élargit et s'atténue pendant les ballons aériens.
- Commandes tactiles plus généreuses en mode paysage, avec adaptation aux petits écrans et maintien des zones de sécurité.
- Tests de non-régression ajoutés sur les matériaux du terrain et les ombres du ballon ; version de cache hors ligne renouvelée.

## Version 1.9.0 — sécurité API et fiabilité HTTP
- En-têtes HTTP renforcés : HSTS, protection MIME, politique de référent, contrôle de cadres et permissions navigateur minimales.
- Limiteur d'API à fenêtre glissante : le nettoyage mémoire conserve les tentatives encore dans les 15 minutes.
- Rejet des corps JSON trop volumineux avec réponse 413 sans couper brutalement la connexion.
- Résolution statique des chemins durcie contre les préfixes de répertoire trompeurs ; erreurs 404 avec en-têtes de sécurité.
- Tests API dédiés aux en-têtes de sécurité, au cache et à la version en service.

## Version 1.8.0 — ambiance sonore de stade
- Ambiance des tribunes synthétisée en trois bandes (grave, médium, aigu) pour une sensation de stade plus ample.
- L'équilibre fréquentiel suit l'intensité du match ; les buts renforcent temporairement la clameur et les percussions originales.
- Aucune piste ou captation audio protégée n'est utilisée ; le moteur reste Web Audio natif.
- Test automatique du graphe audio et des événements sonores dans un environnement simulé.

## Version 1.7.0 — adaptation graphique en temps réel
- Mesure lissée de la durée des images, en respectant la cible 30/60 FPS choisie.
- Réduit temporairement foule détaillée, texture de pelouse et faisceaux lorsque la cadence reste trop basse ; restaure les effets après une période stable.
- La simulation, la physique, les commandes et la durée du match ne changent jamais avec ce mode.
- Seuils et hystérésis couverts par des tests de non-régression.

## Version 1.6.0 — présentation stade et diffusion télévisée
- Pelouse enrichie d'une texture procédurale déterministe, mise en cache une fois par match et désactivée en qualité basse.
- Éclairage de stade renforcé : faisceaux des projecteurs et zones lumineuses douces sur le terrain.
- Terrain complété avec drapeaux de corner, zones techniques et marquages plus nets.
- Tableau de score type diffusion sportive, adapté à la largeur de l'écran ; le panneau statistiques ne masque plus le terrain sur les téléphones.
- Marges de sécurité Android/iOS appliquées aux commandes, à la pause et au joystick.
- Tests de géométrie du HUD sur mobile et ordinateur ajoutés à la suite de non-régression.

## Versions antérieures
La v1.5.0 a introduit la rotation de ballon déterministe en replay et les annonces d'état des commandes tactiles. La v1.4.0 a ajouté l'adaptation du rendu aux capacités matérielles.

## Démarrer en local
```bash
npm install          # installe pg (facultatif en local)
node server.js       # http://localhost:3000 — stockage fichier data/dev-db.json si DATABASE_URL absent
npm test             # tests carrière (2 saisons simulées) + API
node tests/match-sim.mjs 6     # banc d'essai de l'IA de match (90 min, sans rendu)
node tests/e2e.mjs   # test navigateur complet (Playwright) avec captures dans shots/
```

## Arborescence
| Dossier | Contenu |
|---|---|
| `public/` | jeu (HTML/CSS/JS modules ES, aucune dépendance) : `js/match.js` moteur de match, `js/career.js` carrière, `js/app.js` interface, `js/audio.js` sons synthétisés + voix, `js/storage.js` sauvegardes, `admin.html` administration |
| `server.js`, `lib/store.js` | serveur HTTP, API comptes/sauvegardes/admin, PostgreSQL ou fichier |
| `android-app/` | projet Capacitor, plugin natif de synthèse vocale, icônes, script de build |
| `.github/workflows/ft26-android.yml` | compilation Android → branche `football-tunisia-builds` |
| `docs/` | déploiement, Android, rapport final, fiche Google Play |
| `tests/` | tests automatisés |

Voir `docs/DEPLOIEMENT.md`, `docs/ANDROID.md` et `docs/RAPPORT.md`.
