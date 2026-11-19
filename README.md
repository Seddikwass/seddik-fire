# ⚽ Football Tunisia 2026

## Version 3.14.0 — caméra sportive et suivi des ballons aériens
- La caméra 3D relève progressivement son point de visée lorsque le ballon monte pour garder les centres, têtes, dégagements et frappes hautes visibles.
- Les ralentis utilisent la même information de hauteur de balle afin d'éviter les cadrages qui perdent le ballon dans les actions aériennes.
- Le cadrage recule modérément sur les écrans étroits pour conserver davantage de largeur de terrain et les appels des joueurs.
- Tests sur caméra au sol, trajectoire aérienne, ralenti et adaptation portrait.
- Versions interface, API, package Android et cache hors ligne alignées sur 3.14.0.

## Version 3.13.0 — pied de frappe contextuel et ralentis cohérents
- Le moteur calcule le côté du ballon par rapport à l'orientation du joueur et choisit le pied le mieux placé pour la frappe ou la passe.
- Le choix du pied est conservé dans les données du ralenti afin que la jambe animée reste la même pendant la relecture.
- Tests sur les deux côtés du joueur, l'enregistrement de replay et la transmission de la pose au renderer 3D.
- Versions interface, API, Android et cache hors ligne alignées sur 3.13.0.

## Version 3.12.0 — gestes techniques et contacts 3D
- Les frappes utilisent maintenant trois phases visibles : préparation de la jambe, contact puis suivi du geste, modulées par la puissance.
- Le contrôle orienté déplace la jambe de réception selon le côté du premier toucher et amortit la pose au moment du contact.
- Les têtes engagent davantage le buste et la tête, avec une ouverture des bras pour l'équilibre aérien.
- Les tacles glissés suivent une séquence d'engagement, d'extension puis de récupération au lieu d'abaisser le corps de façon constante.
- Tests de non-régression sur les phases de frappe, contrôle, tête et tacle, ainsi que sur la validité du maillage 3D.
- Versions de l'interface, de l'API, du package Android et du cache hors ligne alignées sur 3.12.0.

## Version 3.11.0 — grand chantier réalisme 3D
- Pelouse enrichie de micro-variations déterministes et de zones d'usure légères devant les buts.
- Filets de but maillés plus finement et architecture du stade enrichie : coursives, bandeaux de tribunes, charpente et supports de toiture.
- Densité des supporters, rangées de sièges, détails de terrain et animation de foule adaptés au profil graphique de l'appareil.
- Modèles joueurs avec oscillation verticale de course, inclinaison en virage, foulée plus longue au sprint et coordination bras/jambes affinée.
- Ballon avec panneaux noirs distribués plus naturellement et éclairage 3D avec contraste, modelé et reflet renforcés.
- Caméra rapprochée pour mieux lire les joueurs et les duels, tout en conservant le suivi du jeu.
- Tests de régression sur les profils graphiques, la géométrie de stade, la course, le sprint et les virages.
- Version interface, API, package Android et cache hors ligne alignés sur 3.11.0.

## Version 3.10.0 — défense plus intelligente et gardien anticipatif
- Les défenseurs se placent davantage entre l'attaquant et leur but, avec un léger décalage pour fermer la ligne de passe ou de centre.
- Le marquage tient compte de la qualité défensive et de la position du ballon, sans imposer de course brutale.
- Le gardien anticipe brièvement la trajectoire du ballon et ajuste sa profondeur sur la bissectrice du tir.
- Tests de régression sur le marquage côté but, le sens de jeu inverse, les limites de déplacement et l'anticipation du gardien.
- Version de l'interface, API, package Android et cache hors ligne alignés sur 3.10.0.

## Version 3.9.0 — appels diagonaux et solutions offensives
- Ajout d'un appel en diagonale dans le demi-espace pour offrir une quatrième option au porteur : profondeur, largeur, appui court et course diagonale.
- Sélection du coureur selon la vitesse, la finition, la technique, la pression adverse et l'espace déjà occupé par les autres appels.
- Les courses axiales et diagonales restent bornées par la ligne défensive estimée pour éviter les appels artificiellement hors-jeu.
- Tests de non-régression sur les quatre rôles, l'espacement, les situations de ligne défensive compacte et les attaques dans les deux sens.
- Version de l'interface, API, package Android et cache hors ligne alignés sur 3.9.0.

Jeu de football tunisien : **matchs 3D WebGL jouables** (caméra télé, 11 contre 11, IA, commandes tactiles) et **carrière de président** (Ligue 1 2026-27, Coupe de Tunisie, Ligue des Champions et Coupe de la Confédération CAF, élections, staff, transferts, médical, finances, infrastructures, supporters).

- **Web** : `server.js` (Node 20+, sans framework) sert le jeu et l'API (`/api`). Déployé sur Render.
- **Android** : `android-app/` (Capacitor 8) — APK de test + AAB compilés par GitHub Actions.
- **Données** : `public/js/data.js` (sources et date de vérification en tête du fichier) — modifiables sans code via `/admin.html`.

## Version 3.8.0 — déplacements collectifs et prévention des regroupements
- Écartement progressif entre coéquipiers proches pendant le replacement, le pressing et les appels offensifs.
- Évitement atténué pour le porteur afin de préserver le contrôle rapproché du ballon.
- Lissage des cibles conservé pour éviter les changements de direction brusques lorsque les joueurs se réorganisent.
- Tests de non-régression sur l'évitement, les distances de sécurité, les configurations symétriques et les joueurs superposés.
- Version de l'application, API et cache hors ligne alignés sur 3.8.0.

## Version 3.7.0 — tribunes vivantes, ombre du ballon et poses d'action
- Animation légère et déterministe des bras de supporters dans les tribunes, avec une réaction plus énergique pendant les buts.
- Ombre 3D du ballon élargie et adoucie progressivement selon sa hauteur au-dessus de la pelouse.
- Posture de tête et de buste synchronisée avec les têtes, premières touches et contacts physiques.
- Le plongeon du gardien tient aussi compte de sa hauteur et de son extension, en conservant les limites du maillage.
- Tests de régression sur l'ombre aérienne, les mouvements du public et les maillages pendant les gestes techniques.
- Version de l'application et cache hors ligne alignés sur 3.7.0.

## Version 3.6.0 — animations 3D des gestes techniques et des gardiens
- Transmission complète au rendu 3D des premières touches, déséquilibres, contacts, prises et dégagements du gardien.
- Les replays conservent les directions de contact, de tacle, de frappe, de première touche et la hauteur/extension des plongeons.
- Les frappes utilisent une impulsion de jambe dédiée et les appuis de course se mettent en retrait pendant les gestes.
- Le gardien déplace le buste et étend les bras selon la direction et l'extension du plongeon, avec des poses distinctes de prise et de dégagement.
- Le joueur amortit visuellement les contacts et déséquilibres au lieu de conserver une course neutre.
- Tests de non-régression dédiés aux canaux d'animation, aux poids de pose et aux données de replay.

## Version 3.5.0 — caméra 3D rapprochée et cadrage mobile
- Caméra de diffusion rapprochée : recul et hauteur réduits d'environ un quart par rapport au cadrage 3D précédent, pour mieux voir les joueurs, les duels et le ballon.
- Suivi de caméra relié au cadrage progressif du moteur de match : les déplacements restent fluides et le zoom d'action rapproche encore légèrement la scène dans les phases dangereuses.
- Recul et hauteur proportionnels au zoom pour préserver l'angle de vue, avec un champ vertical adapté aux écrans étroits.
- Tests de régression dédiés à la distance, au suivi, au zoom d'action et au mode ralenti.

## Version 3.4.0 — finition des joueurs et enrichissement du stade 3D
- Modèles des joueurs enrichis selon les profils physiques et les teintes de peau déjà présentes dans les données.
- Visages plus détaillés : yeux, pupilles, sourcils, nez et coiffures différenciées.
- Maillots avec insigne, passepoils, coutures et numéros visibles à l'avant et au dos ; shorts, chaussettes et chaussures affinés.
- Gants et poignets spécifiques pour les gardiens, avec des détails adaptés au niveau graphique.
- Tribunes plus denses avec sièges colorés, allées, supporters supplémentaires, bras levés et écharpes.
- Éclairage 3D enrichi par plusieurs directions de lumière et une composante spéculaire.
- Adaptation automatique : le moteur 3D bascule en détail réduit si la cadence devient insuffisante, puis restaure le profil choisi.
- Tests de maillage des joueurs et du stade en qualité basse et haute.

## Version 3.3.2 — correction du cercle central 3D
- Correction de la dernière coordonnée trigonométrique du cercle central, qui bloquait la génération complète du stade.
- Le test 3D construit le maillage réel en qualité basse et haute, vérifie le volume géométrique et rejette les coordonnées non finies.

## Version 3.3.1 — validation de la géométrie du stade 3D
- Correction du calcul de la ligne d'arc devant les surfaces de réparation pour éviter l'arrêt de l'initialisation WebGL.
- Test de construction réelle du maillage complet du stade, avec contrôle des coordonnées et des niveaux de détail bas/haut.
- Le test valide la création de la pelouse, des tribunes, des buts, des filets et des équipements avant la compilation.

## Version 3.3.0 — premier moteur de match 3D WebGL
- Passage du rendu de match à une scène WebGL en perspective 3D, avec caméra TV mobile qui suit le ballon.
- Terrain dimensionné, bandes de pelouse, lignes, surface de réparation, arcs, buts, poteaux et filets rendus en volume.
- Stade avec tribunes étagées, public, panneaux publicitaires, bancs techniques et projecteurs.
- Joueurs reconstruits en modèles 3D articulés : tête, torse, maillot, short, membres, chaussures et gants de gardien.
- Animations 3D synchronisées avec la simulation existante : course, appuis, tacles, plongeons, sauts, frappes et célébrations.
- Ballon sphérique animé avec ombre au sol ; le tableau de score et les commandes tactiles restent conservés en surimpression.
- Rendu WebGL local sans dépendance externe, donc compatible avec le cache hors ligne et le paquet Android ; retour automatique au rendu 2.5D si WebGL n'est pas disponible.
- Niveaux de détail bas, moyen et haut pour limiter la charge sur les téléphones modestes.

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
