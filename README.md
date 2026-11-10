# Seddik Fire

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
