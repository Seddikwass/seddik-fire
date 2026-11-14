# Seddik Fire

## Version 2.15
- Fluidité : détails fixes du sol (usure, marques, relief) dessinés une fois par tuile et réutilisés ; soldats mis en cache (tenue, arme, équipement, pas de marche), animations de tir, rechargement et coup de poing toujours en direct ; arbres allégés sur téléphone. Carte forêt : environ 19 000 → 4 500 opérations de dessin par image.

## Version 2.14
- Fluidité sur téléphone : suppression des effets plein écran coûteux sur mobile (filtre couleur CSS du terrain, flou derrière le HUD, passe de lumière en mode « screen », nuages).
- Visibilité : caméra plus proche sur téléphone (surtout en portrait), arbres estompés autour du joueur, repère orange avec flèche de direction visible à travers le feuillage, coéquipiers cerclés de bleu.
- HUD compact en portrait : bouton Recharger rond, armes et soins plus petits, consignes plus discrètes.

## Version 2.13
- Vue 3D et caméra au dos retirées : retour à la vue de dessus, plus lisible et plus fluide.
- Caméra cinématique améliorée : suivi amorti sans à-coups, cadrage automatique du joueur et de l'adversaire pendant un échange de tirs, légère ouverture en course, rapprochement à l'arrêt, glissement vers la victime à chaque élimination, souffle de caméra portée très discret (désactivé si « réduire les animations »).

## Version 2.12
- Caméra au dos : soldats modélisés en 3D (jambes et bras animés, gilet, sac, casque ou coiffure, arme tenue en position de tir), ombre au sol et anneau du joueur.
- Objets des cartes en volume : conteneurs, caisses, sacs de sable, voitures, pompes, rochers, silos, fontaines.
- Vue dégagée : arbres et murs trop proches de la caméra retirés, bords des feuillages lissés.
- Performance : couche dynamique allégée et détails de surface réservés à la vue standard.

## Version 2.11 — vraie 3D pour la caméra au dos du joueur

- Bâtiments en volume : murs extrudés à hauteur réaliste, toits, fenêtres, ombrage par face.
- Arbres debout (feuillus, pins, palmiers) et buissons, toujours de face, avec brume au loin.
- Ce qui se trouve entre la caméra et le soldat devient ajouré pour ne jamais le cacher.
- Soldat placé plus haut à l'écran (au-dessus du panneau des armes) ; caméra un peu plus basse et plus proche.
- Les ennemis derrière un mur ne sont plus visibles à travers.
- Fluidité : le sol vient de la texture de la carte envoyée une seule fois à la carte graphique (net, avec mipmaps), seule une petite couche dynamique est redessinée à chaque image ; résolution 3D et filtres CSS allégés.
- Cache hors ligne : `seddik-fire-v211`.

## Version 2.10 — 15 personnages jouables

- Les noms sont ceux des personnages à choisir dans le menu (et non plus des adversaires) : Seddik, Dali, Nouh, Joseph, Haroun, Mazen, Yassine, Aziz, Nour, Emna, Yasmine, Skander, Molka, Rayhane, Arafet.
- Seddik est en tête de la liste, marqué « Le plus fort » (casque d'élite doré, tenue noire) ; sa tenue n'est pas portée par les adversaires.
- Six nouvelles tenues : Seddik, Nour, Emna, Yasmine, Molka, Rayhane.
- Sans pseudo, le nom du personnage choisi est utilisé en partie.
- Adversaires : retour à la liste de noms d'origine ; plus d'adversaire « Seddik ».
- Cache hors ligne : `seddik-fire-v210`.

## Version 2.9 — caméra au dos du joueur, Gabès, Seddik le plus fort

- Caméra « au dos du joueur » (remplace « derrière le joueur ») : caméra basse et proche, collée au dos du soldat, qui se replace toujours derrière lui sur téléphone. Le soldat est grand, net et au centre-bas de l'écran.
- Soldats debout en vue 3D : chaque soldat est dessiné face à la caméra, à la bonne taille selon la distance, avec une ombre au sol et un anneau sous le joueur. Les ennemis cachés dans un bâtiment ou dans la nuit restent cachés.
- Image plus nette : sol plus net en 3D, moins de grain et d'ombres de nuages, contraste un peu plus fort ; halo lumineux sous le joueur en vue du dessus.
- Carte Kairouan retirée, remplacée par « Gabès & Matmata » (oasis de Chenini, port, souk de Jara, Matmata).
- Cache hors ligne : `seddik-fire-v209`.

## Version 2.8 — vraie vue derrière le joueur et 18 cartes

Caméra « derrière le joueur » (Réglages → Caméra)
- Vue 3D en perspective : caméra basse placée derrière le soldat, sol qui s'étend jusqu'à l'horizon, ciel et brume au loin (WebGL).
- Le soldat est en bas de l'écran, au-dessus du HUD ; la vue tourne quand il tourne et se fige pendant la visée.
- Visée à la souris, flèche de zone, indicateurs de dégâts, textes flottants et nuit (lampe torche, lampadaires) projetés correctement.
- Si l'appareil n'a pas WebGL, la vue tournée vue du dessus de la version 2.7 prend le relais.

10 nouvelles cartes tunisiennes
- Grand Tunis, Sousse & Monastir, Sfax & Kerkennah, Bizerte & Ras Jebel, Tabarka & Aïn Draham, Tozeur & Nefta, Tataouine & Ksour, Le Kef & Jugurtha, Gafsa & Bassin minier.
- Chacune reprend le relief d'une carte de base (ville, côte, île du Sud, Cap Bon, forêt, plaines, désert, hautes terres) avec sa propre disposition, ses villes, ses couleurs et sa météo.
- Ajoutées au Parcours ; traduites en anglais et en arabe.
- Cache hors ligne : `seddik-fire-v208`.

## Version 2.7 — caméra derrière le joueur

- Nouveau réglage « Caméra : derrière le joueur » (Réglages, bouton Caméra : cinématique → derrière le joueur → standard).
- La vue se rapproche et tourne pour que le soldat regarde toujours vers le haut de l'écran, avec plus de champ devant lui.
- Les commandes suivent la caméra : pousser vers le haut = avancer ; à gauche/droite = tourner. Pendant la visée ou le tir, la vue se fige pour viser précisément.
- En véhicule, la caméra se place derrière le véhicule.
- Barres de vie, prime et indicateurs de dégâts restent lisibles dans la vue tournée.
- Cache hors ligne : `seddik-fire-v207`.

## Version 2.6 — suspense, réalisme et finitions

Suspense et motivation
- Annonces Top 10, Top 5, Top 3 et « Duel final » avec son et tremblement.
- Prime : l'adversaire le plus dangereux (3 éliminations ou plus) est marqué en or ; l'éliminer rapporte +250 XP et des points de ligue.
- Santé basse : battement de cœur et bords rouges qui pulsent sous 30 PV.
- Compte à rebours sonore dans les 5 dernières secondes avant le rétrécissement de la zone.
- Connexion quotidienne : bonus d'XP qui grandit avec la série de jours (jusqu'à 7).

Réalisme et graphismes
- Reflets du soleil qui scintillent sur la mer et les lacs.
- Visée laser sur les fusils de précision.
- Le large se fond dans la mer sans ligne visible.
- Cache hors ligne : `seddik-fire-v206`.

## Version 2.5 — ligues, rapport de partie, carrière

- Ligues : Bronze, Argent, Or, Platine, Diamant, Légende. Chaque partie (hors Entraînement) fait gagner ou perdre des points selon le classement, les éliminations et la difficulté ; la mise d'entrée augmente avec la ligue.
- Rapport de fin de partie : précision, tirs à la tête, plus longue élimination, distance parcourue, évolution dans la ligue.
- Écran Carrière (bouton sous les statistiques du menu) : taux de victoire, ratio, précision, temps de jeu, progression vers la ligue suivante.
- Cache hors ligne : `seddik-fire-v205`.

## Version 2.4 — caméra cinématique

- Tremblement fluide (plus de saccades aléatoires) et recul de la vue à chaque tir, plus marqué au fusil à pompe et au fusil de précision.
- En véhicule : la vue s'élargit avec la vitesse et regarde plus loin devant. En intérieur : elle se resserre.
- Élimination : légère impulsion de zoom. Atterrissage : impact.
- Mort : bandes cinéma, la caméra glisse vers l'adversaire qui vous a éliminé, avec son nom. Victoire : gros plan sur le vainqueur.
- Réglage « Caméra : cinématique / standard » pour revenir à l'ancienne vue. Respecte « réduire les animations » du système.
- Cache hors ligne : `seddik-fire-v204`.

## Version 2.3 — combats de nuit, tirs à la tête, options modernes

Réalisme
- Heure du combat au choix dans le menu : Jour (du matin au coucher du soleil) ou Nuit. De nuit, l'obscurité est percée par la lampe torche du joueur, les lampadaires, les phares, les feux et la lueur des tirs ; les adversaires voient moins loin.
- Tirs à la tête : 10 % des balles (26 % au fusil de précision) infligent jusqu'à +60 % de dégâts, réduits par le casque.
- Séries d'éliminations annoncées (double, triple, série).

Options (Réglages)
- Tir auto : le soldat vise et tire seul sur l'adversaire visible à portée (tactile).
- Chiffres de dégâts, Sang, Compteur d'images par seconde : activables ou non.

Divers
- Cache hors ligne : `seddik-fire-v203`.

## Version 2.2 — application Android à jour

- L'application Android (branche `android`, Capacitor + AdMob) embarque maintenant cette version du jeu, avec les textures pré-rendues des 8 cartes.
- Numéro de version affiché dans Réglages.
- Vérifié : une partie complète jusqu'à la dernière zone, et le test des armes, soins, grenades, véhicules, largage et zone rouge, sans erreur.
- Cache hors ligne : `seddik-fire-v202`.

## Version 2.1 — cartes Côte et Sahara réparées, difficulté, partage

Corrections
- Cartes « Côte méditerranéenne » et « Sahara & Sud » : la génération du monde plantait (`hash is not defined`), un bloc de dessin y avait été collé par erreur. Il est replacé dans le rendu, les deux cartes se génèrent entièrement.
- Écran de fin sur ordinateur et tablette : les statistiques étaient décalées à droite.
- Menu en portrait : le bouton Jouer était tout en bas d'une page de trois écrans ; il reste maintenant visible en bas de l'écran. Cartes en bandeau défilant, barre du haut sur deux lignes.
- Bords de carte côté mer : plus de cadre rectangulaire visible, la mer se fond dans le large.

Améliorations
- Réglage « Difficulté » (Facile / Normale / Difficile) pour les adversaires.
- Bouton « Partager » sur l'écran de fin (partage natif du téléphone, sinon copie du résultat).
- Noms et descriptions des 9 personnages traduits en anglais et en arabe.
- Cache hors ligne : `seddik-fire-v201`.

## Version 2.0 — corrections, trois langues et finitions

Corrections
- Le changement de langue plantait au chargement (script hors de portée du jeu) : réécrit et intégré au moteur.
- La grille « Choisir un combattant » restait vide : elle affiche maintenant les vrais personnages et la sélection fonctionne.
- Un soldat générique fixe masquait l'aperçu du personnage choisi : supprimé, l'aperçu montre le personnage réellement sélectionné.
- Le module « combat 3D » contenait une erreur de syntaxe et ne s'exécutait jamais ; l'aperçu 3D dépendait d'un CDN externe (indisponible hors ligne et dans l'APK). Les deux sont retirés : chargement plus léger, plus aucune dépendance externe hormis les polices.
- Menu : la colonne centrale débordait et coupait le soldat sur téléphone en paysage et sur ordinateur.

Améliorations
- Trois langues : français, English, العربية (droite à gauche). Détection automatique selon la langue du téléphone, bouton de langue dans le menu, choix mémorisé.
- Débuts plus justes : 4 secondes de protection à l'atterrissage et dégâts des adversaires réduits pendant les 6 premières parties (hors Parcours).
- Bords de carte : plage et hauts-fonds à la place de la coupure droite terre/mer.
- Cache hors ligne : `seddik-fire-v200`.

Limites connues
- Les descriptions longues des personnages et les noms de lieux restent en français (masquées dans les autres langues pour les descriptions).
- L'APK généré par GitHub Actions est un APK de test (debug). La publication Google Play demande un AAB signé avec la clé de l'application.

## Version 1.37 — progression renforcée sur 50 étapes

- Les 50 étapes conservent leurs cartes régionales tunisiennes et leurs noms de lieux.
- Progression rééquilibrée : les premières missions commencent avec 12 combattants, puis l'effectif augmente graduellement jusqu'à 30.
- Difficulté IA renforcée et graduelle, avec plafond de compétence adapté aux étapes avancées.
- Tempête plus exigeante au fil du parcours.
- Indicateur de menace croissant ajouté aux données de chaque étape.


## Version 1.36 — soldat moderne par défaut

- Le profil initial d'une nouvelle installation sélectionne désormais le Raider moderne, équipé d'un casque balistique et d'un gilet porte-plaques, plutôt qu'un personnage stylisé.
- Les choix de personnages déjà enregistrés restent conservés pour ne pas écraser la sélection du joueur.
- Cache mobile incrémenté vers v136.


## Version 1.35 — finitions tactiques et identité des soldats

- Remplacement des pseudonymes fantaisie des adversaires par des prénoms tunisiens et indicatifs d'unités crédibles.
- Ajout de détails de finition sur les chaussures tactiques : renfort avant, laçage et œillets, visibles en haute qualité.
- Cache du service worker incrémenté pour forcer le chargement de cette version sur mobile.


## Version 1.34 — détails d'équipement des soldats

- Ajout de poches utilitaires latérales, coutures de fixation, sangles et boucles sur les gilets tactiques.
- Détails intégrés au sprite du soldat pour rester visibles pendant les déplacements et les combats.


## Version 1.33 — ajustement du quartier de pêche du Cap Bon

- Déplacement du petit port de pêche vers une zone côtière libre pour éviter le chevauchement avec le port principal.


## Version 1.32 — soldats IA et silhouettes d'îles

- Les adversaires IA choisissent désormais uniquement des silhouettes de soldats de terrain (treillis, casque et équipement), en excluant les combattants fantaisie.
- Djerba et le Cap Bon ont des lignes de côte distinctes, avec des baies et des avancées de terrain propres à chaque carte.
- Les repères régionaux et les nouveaux quartiers restent déterministes d'une partie à l'autre.


## Version 1.31 — soldats et identités régionales

- Silhouette des opérateurs tactiques enrichie : antenne radio, épaulières renforcées et insigne tunisien visible.
- Djerba : nouveau quartier de houchs, ruelles et cour centrale autour du secteur Houmt Souk.
- Cap Bon : fermes et parcelles agricoles, village côtier et petit quartier de pêche.
- Rues et bâtiments régionaux générés de façon déterministe pour conserver une carte stable à chaque partie.


Battle royale vu du dessus pour téléphone : 30 joueurs sautent sur l'île de Seddik, ramassent armes et soins, et survivent à la tempête de feu.

Site statique (index.html, manifest, service worker hors ligne). Hébergé sur Render, emballé pour Google Play avec PWABuilder.

## Version 1.30 — repères régionaux et parcours

- Nouvelles cartes régionales inspirées de Djerba–Zarzis et du Cap Bon–Kélibia.
- Quatre opérateurs supplémentaires et équipements tactiques différenciés.
- Pick-up tactique et 4×4 blindé conduisibles, avec projecteurs dynamiques.
- Bateaux côtiers et feux de circulation animés dans la grande ville.
- Cache hors ligne renouvelé : `seddik-fire-v127`.

- Palmeraies, maisons blanches et coupoles inspirées de l'architecture de Djerba.
- Vergers d'agrumes du Cap Bon et petit phare côtier.
- Détails régionaux déterministes, dessinés uniquement dans la zone visible pour préserver les performances.

- Les 50 étapes du parcours répartissent désormais les cartes entre les huit environnements, dont Djerba et le Cap Bon.
- Le descriptif du mode Parcours indique la carte réellement utilisée pour l'étape sélectionnée.

- Les huit repères de chaque nouvelle carte régionale sont repositionnés sur les secteurs correspondants du terrain.
