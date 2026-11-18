# ⚽ Football Tunisia 2026

Jeu de football tunisien : **matchs en 2.5D jouables** (caméra télé, 11 contre 11, IA, commandes tactiles) et **carrière de président** (Ligue 1 2026-27, Coupe de Tunisie, Ligue des Champions et Coupe de la Confédération CAF, élections, staff, transferts, médical, finances, infrastructures, supporters).

- **Web** : `server.js` (Node 20+, sans framework) sert le jeu et l'API (`/api`). Déployé sur Render.
- **Android** : `android-app/` (Capacitor 8) — APK de test + AAB compilés par GitHub Actions.
- **Données** : `public/js/data.js` (sources et date de vérification en tête du fichier) — modifiables sans code via `/admin.html`.

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
