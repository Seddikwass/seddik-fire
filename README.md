# Seddik Fire

## Nouveautés 2.44 — Objectif du lobby, « presque ! », records
- **Sous le bouton Jouer** : points qu’il manque pour le prochain palier du Pass Seddik, missions de la semaine faites (0/3), titre de saison et bonus du week-end.
- **Fin de partie** : « Nouveau record d’éliminations ! », « Plus que 2 places pour le Top 5 : rejoue ! », « Si près du Top 1 ! » pour donner envie de relancer une partie.

## Nouveautés 2.43 — Week-end ×2, objets exclusifs du Pass, douilles
- **Week-end ×2** : le samedi et le dimanche, l’XP de chaque partie et les points du Pass Seddik sont doublés (annonce dans le lobby).
- **Objets exclusifs du Pass Seddik** : Rangers rouges Tunisie au palier 10, Sac drapeau Tunisie au palier 20 (dans Personnaliser, une fois débloqués ils restent pour toujours).
- **Douilles éjectées** à chaque tir (laiton, rouges pour le fusil à pompe) : elles rebondissent, restent quelques secondes au sol et coulent dans l’eau.

## Nouveautés 2.42 — Animations des soldats
- **Touché** : le soldat recule à l’opposé du tir et son buste se tord.
- **Grenade** : le soldat arme en arrière puis lance d’un coup de buste.
- **Course** : balancement des hanches et buste qui avance à chaque pas.
- **Atterrissage** : choc puis rebond en touchant le sol.
- **Danse de victoire** : pas sur place, balancement et tour complet, en jeu et sur l’écran de fin (donc aussi sur la carte de victoire).
- Les animations existantes restent : marche, respiration, recul au tir, rechargement, coup de poing, chute à la mort, parachute. Tout est désactivé si le téléphone demande moins d’animations.

## Nouveautés 2.41 — Motivation : Pass Seddik, missions de la semaine, calendrier, grades tunisiens, carte de victoire
- **Pass Seddik** (nouveau bouton dans le lobby) : une saison par mois au nom tunisien (Olives de Sfax, Festival du Sahara de Douz, Neige d’Aïn Draham…). 30 paliers de 100 points de saison gagnés à chaque partie (survie, éliminations, Top 10, Top 5, victoire). Récompenses en XP, coffre tous les 5 paliers, titre de saison au palier 30.
- **Missions de la semaine** dans l’écran Missions : 3 grandes missions qui changent chaque lundi, récompense ×3.
- **Calendrier de connexion sur 7 jours** : fenêtre avec les 7 jours, coffre de +850 XP le 7e jour, puis le cycle recommence.
- **Grades militaires tunisiens** au lieu des ligues : Recrue, Caporal, Sergent, Lieutenant, Capitaine, Légende de Carthage (mêmes points).
- **Carte de victoire** à la fin de chaque partie : image 1080 × 1350 avec le soldat, le classement, les statistiques, le grade, la carte et le drapeau tunisien, à partager sur Facebook, WhatsApp ou TikTok.
- **Outil Mixamo → sprites** dans `tools/` (script Blender et guide `tools/MIXAMO.md`).

## Nouveautés 2.40 — Voix arabe et tunisienne réparée sur Android et sur le site
- **Android** : le module vocal refuse toute langue dont le code ne correspond pas exactement à celui annoncé par le moteur du téléphone. Le moteur Google annonce souvent l'arabe sous « ar-XA » : les demandes « ar-TN », « ar » et « ar-SA » étaient toutes refusées et le jeu se croyait sans voix arabe. Le jeu lit maintenant la vraie liste des langues et des voix du téléphone et utilise exactement le code et la voix arabes qu'il annonce. En cas de refus, il réessaie sans voix précise, puis avec « ar ».
- **Site (Render)** : quand le navigateur n'avait pas encore chargé ses voix, les premiers messages étaient perdus. Ils sont désormais dits avec la langue arabe, puis avec la voix arabe dès qu'elle est chargée.
- **Diagnostic** dans Réglages ▸ Radio : nombre de langues et de voix du téléphone et codes arabes trouvés.

## Nouveautés 2.39 — Voix tunisienne en partie réparée, cartes plus grandes et plus nettes
- **Voix en partie réparée** : au début d'une partie, le moteur vocal d'Android n'est souvent pas encore prêt. La 2.38 prenait ce premier refus pour « voix absente » et restait muette toute la partie (le bouton Tester marchait car le moteur était déjà prêt). Désormais le jeu réessaie, met les messages en file d'attente au lieu de se couper l'un l'autre, et prépare le moteur vocal dès l'appui sur JOUER.
- **Cartes plus grandes** : caméra rapprochée d'environ 16 % sur téléphone (6 % sur ordinateur) ; arbres, bâtiments, hôtels, souks et panneaux sont plus grands. Le bouton de zoom reste disponible.
- **Détails plus nets** : décors au sol, souks, panneaux et particularités dessinés en 1,35× plus de pixels sur téléphone (1,5× sur ordinateur), avec un cache limité pour la mémoire.

## Nouveautés 2.38 — Voix arabe et tunisienne réparée, hôtels, ponts, trains, lobby moderne
- **Voix de la radio en arabe et en tunisien réparée** : le jeu cherche une voix réellement installée sur le téléphone (tunisienne, puis arabe générale, saoudienne, égyptienne, émiratie, marocaine, algérienne). Avant, il demandait « ar-TN » puis « ar-SA » et restait muet si le téléphone n'avait que la voix arabe générale.
- **Nouveaux boutons** dans Réglages ▸ Radio : « ▶ Tester la voix », état de la voix sur l'appareil, et « Installer la voix arabe » qui ouvre l'installation des voix Android si elle manque. Si aucune voix n'existe, un message le dit au lieu de rester silencieux.
- **Hôtels** dans les villes touristiques (Hammamet, Yasmine, Nabeul, Kélibia, Sousse, Port El Kantaoui, Skanès, Mahdia, Djerba, Tozeur, Nefta, Douz, Tabarka, Gammarth, Bizerte, Kerkennah, Matmata, Tunis) : façade blanche, balcons à parasols, atrium vitré, panneaux solaires, piscine avec transats.
- **Ponts** : canal de Bizerte et son pont mobile, pont d'El Kantara entre les deux îles Kerkennah.
- **Trains** : TGM de Gammarth à Carthage (Sidi Bou Saïd), métro du Sahel (Sousse, Monastir, Mahdia), Lézard Rouge (Gafsa).
- **Lobby moderne** : la carte choisie s'affiche en plein écran derrière le soldat, avec un dégradé cinématographique.
- Plus aucun bâtiment qui se chevauche sur les 23 cartes.

## Nouveautés 2.37 — Radio en arabe et en tunisien, particularités réelles de chaque lieu
- **Radio d'équipe en arabe standard (الفصحى) et en tunisien (الدارجة)**, avec le prénom du joueur au début de chaque message, à l'écrit et à la voix. Nouveau réglage « Langue de la radio » : comme le jeu, tunisien, arabe, français, anglais. Voix arabe du téléphone (voix tunisienne si l'appareil en a une). La voix d'équipe est réactivée une fois pour tous.
- **Particularités réelles** : flamants roses (lac de Tunis, salines de Thyna, chotts, Kerkennah, Bizerte), caravanes de dromadaires (Douz, Ong Jemel, Nefta, Djerba, Matmata), calèches (Tozeur, Hammamet, Sousse, Houmt Souk), dinosaures de Tataouine, train Lézard Rouge sur sa voie entre les mines de Gafsa, piscines romaines de Gafsa, mosaïques romaines (Carthage, Dougga, Sbeitla, El Jem, Thyna, Kerkouane), dolmens (Le Kef, Siliana), phoques moines de La Galite, fauconnerie d'El Haouaria, tentes bédouines, parasols et transats sur les plages des stations.
- **Mausolée Bourguiba à Monastir** : marbre blanc, coupole dorée, coupoles vertes et deux minarets.

## Nouveautés 2.36 — Audit du cahier des charges, phase 1
- **Interface honnête** : l'écran d'accueil annonçait « 30 guerriers · 6 cartes » ; il affiche maintenant « Battle royale tunisien · 23 cartes · vous contre 29 soldats IA ».
- **« Combattants » au lieu de « joueurs »** dans les modes et le bandeau du lobby (français, anglais, arabe), car les adversaires sont des soldats contrôlés par l'IA : le jeu n'a pas de multijoueur en ligne.
- **Vérifié** : 30 combattants actifs (vous + 29 IA), sauvegarde des parties, victoires, éliminations, XP et missions quotidiennes conservée après actualisation.

## Nouveautés 2.35 — La carte choisie est toujours celle jouée
- **Correction** : en mode Parcours, l'étape imposait sa carte et ignorait la carte choisie (l'étape 1 donnait toujours l'Île de Seddik). Désormais la carte choisie est toujours celle jouée, dans tous les modes. Choisir une étape propose sa carte, qu'on peut ensuite changer.
- **Les 50 étapes ont la carte de leur nom** : Dunes de Douz au Sahara, Mer de Mahdia à Mahdia, Îles Kerkennah à Kerkennah, Gafsa la Rouge à Gafsa…
- **La radio dit le nom du joueur à chaque conseil** : nom saisi dans le lobby, sinon nom du soldat affiché en jeu.
- **Souks dans toutes les médinas** : étals à auvents rayés, tapis kilim, paniers d'épices, poteries de Nabeul et Guellala, lanternes et géraniums dans les ruelles.
- **HUD modernisé** : panneaux givrés, chiffres nets, arme active soulignée d'un liseré lumineux, nouveau bouton de tir, messages de côté plus lisibles.

## Nouveautés 2.34 — Chaque carte se reconnaît en partie, la radio t'appelle par ton nom
- **La radio de l'équipe t'appelle par ton prénom** : « Wassim, la zone se referme… », dans toutes les langues, à l'écrit et à la voix (une fois sur deux pour les conseils courants, toujours pour les messages importants).
- **Panneaux d'entrée bleu et blanc** devant chaque lieu de la carte (Médina de Sousse, Ksar Ouled Soltane, Chott el-Jérid…), posés au sol.
- **Arrivée dans un lieu** : le nom du lieu et de la carte s'affiche sur le côté (« 📍 Médina de Sousse · Sousse & Monastir »).
- **Vraies dunes du Sahara** (barkhanes avec face éclairée, face d'avalanche ombrée et rides) : Grand Erg, Douz, Ong Jemel, Tataouine.
- **Image plus claire** : vignette, étalonnage et teinte du sol allégés, voile de sable et brouillard réduits de moitié.

## Nouveautés 2.33 — Un plan entièrement différent pour chaque carte, d'après la géographie réelle
- **18 plans dessinés à la main** : chaque carte a sa côte, ses plans d'eau et ses lieux placés comme dans la réalité.
- **Géographie réelle** : Chott el-Jérid au sud de Tozeur, lac de Bizerte, presqu'île de Mahdia (Cap Afrique), Djerba entourée par la mer avec Zarzis sur le continent, chenal entre les deux îles de Kerkennah, îlot de Kerkennah au large de Sfax, île de La Galite avec Galiton, lac de Tunis à Carthage, presqu'île du Cap Bon, côte nord de Tabarka sur les hautes terres, lagune de Korba, salines de Thyna, Grand Erg et oasis du Sud.
- **Chaque lieu a son vrai type** : médinas fortifiées avec remparts, portes et place centrale (Sousse, Sfax, Mahdia, Hammamet, Nabeul, Le Kef, Tozeur en briques, Bizerte), oasis et palmeraies (Tozeur, Nefta, Kébili, Douz, Chenini de Gabès, El Hamma), ksour (Ksar Ouled Soltane, Ksar Hadada), mines de phosphate (Métlaoui, Redeyef, Moularès, Oum Larayes, Gafsa), ruines romaines (Carthage, Dougga, Sbeitla, Thyna, Salakta, Zaghouan), cimetière marin de Mahdia, hôtels en bord de mer (Hammamet, Yasmine, Port El Kantaoui, Skanès, Djerba, Gammarth), oliveraies de Sfax et du Sahel, orangeraies du Cap Bon, champs de blé de Béja et Jendouba, Table de Jugurtha, village de potiers de Guellala et de Nabeul.
- **Routes** reliant les lieux sans traverser l'eau.

## Nouveautés 2.32 — Des cartes vraiment différentes en partie
- **Disposition propre à chaque carte** : 19 cartes partageaient le même squelette (routes, médina, base, ksar, oasis, port aux mêmes endroits). Désormais chaque carte a sa disposition : miroir nord/sud selon la carte, déformation propre à chaque carte (base, médina, oasis, port et routes déplacés ensemble) et forme de médina différente (grille, rue, croix, anneau, terrasses).
- **Port propre à chaque carte** : marina de plaisance (Sidi Bou Saïd, Hammamet, Sousse), port de pêche avec barques tunisiennes colorées, filets et jarres à poulpes (Djerba, Kerkennah avec felouques à voile, Mahdia, Kélibia, La Galite), port de commerce avec cargos et grues (Sfax, Bizerte, Gabès). Plus de conteneurs dans les ports de pêche ni à l'intérieur.
- **Plus de mer à l'intérieur des terres** : chott salé à Tozeur, Tataouine et au Sahara, lac de barrage au Kef, à Gafsa et dans les hautes terres. Chaque carte côtière a aussi la couleur de mer qui lui est propre.
- **Sol propre à chaque carte** : croûte de sel et canaux d'irrigation des oasis (Tozeur, Gabès), rides de sable, grès rouge (Tataouine, Gafsa), calcaire et éboulis (Le Kef), roche volcanique et lichens (La Galite), terre labourée des oliveraies (Sfax, Sahel, Cap Bon), terre rouge et tessons (Djerba), litière de forêt et fougères (Tabarka), alfa, prairies de coquelicots.
- **Ksar seulement dans le Sud** : dans le Nord, il est remplacé par un village.
- **Étalonnage des couleurs propre à chaque carte**, sur téléphone comme sur ordinateur.

## Nouveautés 2.31 — Une vraie image pour chaque carte
- **Choix de la carte repensé** : chacune des 23 cartes a sa propre image, prise dans la carte elle-même (monuments, maisons, arbres, côte), au lieu du même fond pour toutes.
- **Grand aperçu** de la carte choisie, avec un léger zoom animé, son nom, son type de terrain et ses lieux.
- **Cartes à image pleine** avec badge de terrain (Île, Côte, Désert, Ville, Forêt, Montagne), contour lumineux sur la carte choisie et défilement automatique jusqu'à elle.

## Nouveautés 2.30 — Chaque carte a son architecture et ses monuments
- **Maisons selon la région** : briques ocre à motifs à Tozeur, ghorfas en argile à Tataouine et Gabès, menzels blanchis à la chaux à Djerba et Kerkennah, blanc et bleu à Sidi Bou Saïd, tuiles rouges à Tabarka, Bizerte et au Kef, pierre grise au Kef, à Gafsa et à La Galite, immeubles coloniaux à Tunis.
- **Monuments propres à chaque carte** : forts (fort génois de Tabarka, Borj El Kebir à Djerba et Mahdia, Kélibia, Hammamet, Bizerte), kasbahs (Le Kef, Gafsa, Tataouine), ribats de Sousse et Monastir, amphithéâtres (El Jem, Carthage), portes de médina (Skifa Kahla, Bab Bhar, Sfax), horloge de l'avenue Bourguiba, phares, mosquées en briques du Jérid, maison troglodyte de Matmata.
- **Arbres propres à chaque carte** : palmiers dattiers et palmeraies (Tozeur, Gabès, Djerba, Kerkennah), chênes-lièges de Kroumirie, pins d'Alep, ficus des avenues de Tunis, cyprès, jasmin d'Hammamet, orangeraies du Cap Bon, oliveraies de Sfax et du Sahel.
- **Teinte du sol propre à chaque carte** : sable rouge à Tataouine, ocre à Tozeur, vert en Kroumirie, roche volcanique à La Galite…

## Nouveautés 2.29 — Soldats et vie propres à chaque carte
- **Tenues des soldats selon la carte** : chacune des 23 cartes a sa propre tenue de camouflage (3 variantes par carte), par exemple sable au Sahara, blanc et bleu à Sidi Bou Saïd, vert à la Forêt, gris anthracite à Tunis. La nuit, les tenues sont plus sombres.
- **Nouvel équipement** : chèche ou foulard dans les couleurs de la carte, avec pan qui flotte en marchant, et écusson du drapeau tunisien sur l'épaule ; poussière de sable ou boue sur les tenues selon le terrain.
- **Vie propre à chaque carte** : traces de pas dans le sable et sur les plages, ronds dans l'eau quand on y marche, mouettes sur les côtes et les îles, pigeons en ville, rapaces au-dessus du désert et des montagnes, tourbillons de sable dans le désert, feuilles qui tombent en forêt.

## Version 2.28
- Chasse au trésor : 6 trésors propres à chaque carte (clé de la médina, rose des sables, corail rouge de Tabarka, fossile de Tataouine, cage d'oiseau de Sidi Bou Saïd, poterie de Guellala, poulpe de Kerkennah…). Compteur à gauche, +40 XP par trésor et +300 XP pour les 6.
- Gourmandises tunisiennes à ramasser : glace (+20 PV et vitesse), thé à la menthe (rechargement rapide), harissa (dégâts +20 %), bambalouni (+35 PV), dattes (PV et énergie), et coffres au butin rare. Marchands de glaces dans chaque ville.
- Décors propres à chaque carte : dromadaires et tentes bédouines (désert, Djerba, Gabès), felouques de pêche (côtes et îles), ruines romaines et mosaïques (Le Kef, Carthage, Sousse, Mahdia, Tunis), greniers ksouriens (Tataouine), terrils de phosphate (Gafsa), chênes-lièges écorcés (Tabarka, forêt).
- Soldats encore plus nets sur téléphone.

## Version 2.27
- Cinq nouvelles cartes tunisiennes : Sidi Bou Saïd & Carthage (village blanc et bleu), Hammamet & Nabeul (médina, deux mosquées), Mahdia (presqu'île fatimide), Îles Kerkennah (palmiers et pêcheries traditionnelles « charfia » en mer), Île de La Galite (île sauvage). Sols pré-calculés inclus dans l'application Android.
- Nouvelles options en partie :
  - Point de passage : touchez la grande carte pour poser un repère (flèche et distance au bord de l'écran) ; touchez-le à nouveau pour le retirer.
  - Gaucher : joystick à droite, tir et actions à gauche, armes à droite.
  - Ligne de visée : courte, longue ou masquée.
  - Mini-carte : normale ou grande.

## Version 2.26
- Cartes 100 % tunisiennes :
  - Nouvelles maisons blanchies à la chaux autour des lieux habités : toit-terrasse, petite coupole, volets et portes bleus, linge, pots de fleurs, château d'eau, bougainvillier.
  - Une mosquée par carte (deux en ville) : grande coupole, petites coupoles, créneaux et minaret carré au toit de tuiles vertes.
  - Cafés au bord des routes avec auvent rayé bleu et blanc.
  - En ville et ailleurs, une partie des toits existants repeints à la tunisienne ; en ville, le plus grand bâtiment près de la médina prend l'allure d'une mosquée (intérieur et butin inchangés).
  - Végétation : palmiers le long de la côte, oliveraies en rangées, haies de figuiers de Barbarie le long des pistes, bougainvilliers fleuris, orangers.
- Les nouveaux bâtiments n'ont pas de porte (obstacles et abris) ; le sol pré-calculé des cartes Android reste valable.

## Version 2.25
- Mouvements : marche précise quand le joystick est poussé à moitié, course au-delà ; sprint automatique joystick à fond (+14 %, poussière, vibration légère, Maj sur ordinateur), interrompu par le tir, la visée, le rechargement et les soins.
- En visant : pas chassé un peu plus lent, recul plus lent (déplacement plus réaliste).
- Course verrouillée : glissez le pouce gauche loin du joystick (vibration), relâchez, le soldat continue de courir ; touchez à gauche pour arrêter. Indicateur orange en bas à gauche.

## Version 2.24
- Trois nouvelles caméras (bouton caméra sous Pause, touche C, ou Réglages) :
  - Au dos : la vue tourne pour que le soldat regarde toujours vers le haut de l'écran, avec plus d'espace devant lui ; commandes adaptées à la rotation.
  - Drone : vue haute et large, dérive douce, repère du joueur agrandi, équerres de visée dans les coins.
  - Proche : vue rapprochée (+32 %) et suivi plus vif.
- Les caméras cinématique et standard restent disponibles.

## Version 2.23
- Joueurs plus visibles : soldats plus grands par défaut, contour rouge pour les ennemis et bleu pour les coéquipiers, arbres estompés au-dessus de tout soldat (pas seulement le joueur).
- Cartes : tuiles de détails plus nettes (y compris sur téléphone), touffes d'herbe et cailloux plus grands et plus contrastés.
- Caméra : bouton de zoom rapide sous Pause (proche / normale / large), molette de la souris et touches + / - sur ordinateur.

## Version 2.22
- Plus d'espace pour jouer : cartes d'armes compactes rangées sous les messages (zone du pouce gauche libre), messages limités à 4 lignes et plus petits, soins et barre de vie réduits, bouton « Monter » compact aussi en paysage.
- Caméra un peu plus large sur téléphone pour voir davantage autour du joueur.
- Étalonnage des couleurs par type de carte sur téléphone (désert chaud, forêt verte, ville neutre, côte bleutée, coucher de soleil, vignettage), en une seule couche précalculée.

## Version 2.21
- Armes : les cartes d'armes sont sur le côté gauche pendant la partie (colonne à mi-hauteur en portrait et sur ordinateur, en bas à gauche en paysage).
- Bâtiments : toits mis en cache avec usure réaliste (taches, coulures, bords assombris, grain).
- Joueurs : ombre douce projetée par la silhouette du soldat et son arme.
- Bouton « Monter » : le texte ne déborde plus de l'écran en portrait.

## Version 2.20
- Cartes : ombre de contact douce au pied des bâtiments, murs, conteneurs, véhicules garés et rochers ; variations de couleur à grande échelle sur le terrain.
- Joueurs : soldats dessinés plus nets (suréchantillonnage 1,6× sur ordinateur, 1,3× sur téléphone).
- Visibilité : boutons d'action (Monter, Ramasser) plus compacts et collés au bord droit sur téléphone en portrait.

## Version 2.19
- Centre de l'écran dégagé pendant la bataille : bandeaux (top 10, duel final, prime…), radio du QG et éliminations s'affichent en petites lignes dans la liste de messages en haut à gauche (repère doré pour les alertes, vert pour la radio).
- Plus de mots flottants au-dessus des ennemis ; chiffres de dégâts désactivés par défaut (réactivables dans Réglages).

## Version 2.18
- Festival des vainqueurs : feux d'artifice, confettis, bandeau « Victoire » avec trophée, fanfare de trompettes, tambour et clameur de la foule ; version spéciale pour le champion des 50 étapes.
- Arbres : tous les arbres dessinés une fois avec volume (côté éclairé, ombre propre) et feuillage détaillé, puis réutilisés.
- Véhicules : volume éclairé par le soleil et contour qui les détache du terrain.
- Mer : vagues qui se forment et se brisent au large.

## Version 2.17
- Parcours : grille des 50 étapes pour rejouer n'importe quelle étape débloquée ; difficulté croissante (adversaires plus nombreux et plus précis, gilets dès l'étape 9, casques dès la 15, armes principales dès la 19, plus de points de vie dès la 35).
- Profils : plusieurs joueurs sur le même appareil, chacun avec sa propre progression ; sauvegarde automatique toutes les 15 s en partie et dès que l'application passe en arrière-plan.
- Radio d'équipe : le QG conseille pendant la bataille (atterrissage, arme, zone, santé, ennemis avec direction et distance, tirs reçus, grenades, rechargement, survivants restants, largage, victoire), à la voix ou par écrit, dans la langue du jeu.
- Langues : français, anglais, arabe, espagnol, allemand, italien, portugais, turc, russe (menu de choix de langue).
- Ville : voitures garées détaillées (pare-brise, toit, phares, feux, rétroviseurs, pick-up, taxi), motos garées, lampadaires, poubelles, jardinières, bornes et bancs le long des avenues.

## Version 2.16
- Joueurs : rendu détaillé pour tous les soldats et à tous les niveaux de qualité (recul, rechargement et coups intégrés), image plus nette, volume éclairé par le soleil, contour doux qui détache le soldat du terrain.
- Cartes : nouveaux détails au sol selon le type de carte — prairie (touffes d'herbe, fleurs, cailloux, terre nue), forêt (feuilles mortes, fougères, champignons, branches, mousse), désert (rides de sable, buissons secs, cailloux, terre craquelée), ville (déchets, taches, herbes folles), routes (taches d'huile, fissures, plaques d'égout, rapiéçages), bord de mer (coquillages, algues, galets).
- Tous ces détails sont dessinés une seule fois et réutilisés : pas de perte de fluidité.

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
