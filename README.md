# ⚽ Football Tunisia 2026

## Version 3.34.0 — gardiens spectaculaires et dribbles visibles
- Rotation du corps entier autour d'un pivot : le gardien plonge vraiment à l'horizontale, les bras tendus au-dessus de la tête vers le ballon, avec trois hauteurs (ras du sol, mi-hauteur, lucarne) et un déplacement latéral selon l'extension ; son ombre suit le plongeon.
- Gardien : posture d'attente fléchie (genoux pliés, buste en avant, mains ouvertes devant), prise à deux mains contre la poitrine, sortie aux poings bras tendus vers le ciel.
- Tacle glissé réaliste : buste couché en arrière, jambe d'attaque rasant la pelouse, jambe arrière repliée, bras d'appui au sol.
- Déséquilibres : le joueur bousculé bascule vers l'avant et sur le côté.
- Nouveau geste technique automatique — crochet / feinte de corps : quand le porteur change brusquement de direction face à un défenseur proche, il baisse l'épaule et passe la jambe au-dessus du ballon. Selon dribble et agilité contre défense, le défenseur peut être mis dans le vent (déséquilibré, ralenti, tacle retardé). Fréquence calibrée sur des simulations IA contre IA : environ 25 crochets réussis par match, sans changer l'équilibre buts/tirs.
- Le crochet est transmis en match en ligne et dans les ralentis.
- Tests : probabilité de réussite du crochet bornée et liée aux qualités des joueurs.

## Version 3.33.0 — joueurs refaits, gestes réalistes, stade vivant
- Correction de fond : les volumes du corps (buste, bassin, tête, chaussures) étaient alignés sur les axes du stade et ne tournaient pas avec le joueur (buste « tonneau », chaussures de travers). Ils sont désormais orientés dans le repère du joueur et suivent l'inclinaison du buste.
- Nouvelles proportions : poitrine, épaules et bassin distincts, short à mi-cuisse avec genoux visibles, chaussettes avec revers, chaussures avec semelle, tête ovale avec coiffure ajustée.
- Squelette articulé cuisse/tibia et bras/avant-bras (cinématique directe) : foulée naturelle avec flexion du genou au retour de jambe, balancier des bras enfin opposé aux jambes (ils allaient du même côté).
- Gestes distincts : passe intérieure (pied ouvert, geste court), frappe (jambe d'appui fléchie, jambe de frappe qui traverse haut, buste au-dessus du ballon, bras d'équilibre), lob (buste en arrière), armement visible quand on maintient le bouton de tir, jeu de tête (coudes levés, cambrure en l'air puis coup de buste), touche (ballon au-dessus de la tête puis lancer), célébration bras au ciel.
- Numéros de maillot corrigés : ils étaient affichés à l'envers (tête en bas) ; petit numéro devant, grand numéro dans le dos, lisibles dans le bon sens.
- Caméra TV : la caméra ne part plus dans les tribunes sur les ailes ; sur un corner, elle cadre la surface et les joueurs au lieu du drapeau de coin.
- Stade : panneaux LED animés (balayage lumineux, clignotement après un but), banderoles rayées des supporters sous le balcon, drapeaux au bord des toits qui ondulent avec la foule.
- Présentation d'avant-match : le bandeau de commentaire ne transparaît plus derrière.
- Tests : cadrage des corners et des ailes.

## Version 3.32.0 — ralentis façon télévision
- Chaque but est rejoué sous trois angles : caméra principale, caméra derrière le but, puis caméra rapprochée au bord du terrain qui accompagne le ballon.
- Volet de transition animé aux couleurs du club qui a marqué (« FT 26 ») entre les angles, au début et à la fin du ralenti.
- Habillage TV : pastille « RALENTI 1/3 » avec le nom de l'angle et une barre de progression en bas à gauche, à la place du grand panneau qui cachait l'action ; bandeau cinéma.
- Joystick et boutons masqués pendant le ralenti pour une image propre ; un toucher passe toujours le ralenti.
- Tests : plan de réalisation à trois angles, caméras finies et bien placées.

## Version 3.31.0 — joueurs plus naturels
- Correction majeure : au repos ou en course, la jambe de frappe de chaque joueur restait tendue en « grand écart ». Le suivi de frappe n'apparaît désormais que juste après une frappe, puis s'efface en douceur.
- Posture d'attente réaliste : appuis légèrement écartés et respiration discrète quand le joueur est arrêté.
- Coiffures variées et stables par joueur : courte, rasée, afro, dégradé, longue, banane, crâne rasé, barbe ; six couleurs de cheveux.
- Ombres au sol plus douces sur deux couches, décalées comme sous les projecteurs, au lieu d'une tache noire.
- Célébration de but : petits sauts en plus des bras levés.
- Tests : aucun grand écart au repos, suivi de frappe visible, diversité des coiffures.

## Version 3.30.0 — refonte graphique du match
- Caméra de retransmission rapprochée (≈ 23 m de haut, ≈ 30 m en retrait, angle plus serré) : joueurs environ 2,5 fois plus grands à l'écran.
- Nouveau stade : tribunes en gradins sur deux anneaux autour des quatre côtés, balcons aux couleurs du club, toits avec rampe lumineuse, angles fermés, ciel nocturne en dégradé.
- Foule dense et vivante : jusqu'à ~13 000 supporters (haut), ~6 800 (moyen), ~1 700 (bas), aux couleurs de l'équipe à domicile, section visiteurs, écharpes levées, sièges vides ; animation calculée par la carte graphique (aucun coût processeur), qui s'emballe sur les occasions et explose après un but.
- Pelouse plus naturelle : bandes de tonte franches, nuances fondues, usure devant les buts et au rond central ; brume atmosphérique en profondeur.
- Panneaux LED lumineux aux couleurs des clubs autour du terrain.
- Écran de but nettoyé : suppression des faisceaux et silhouettes parasites, plus de texte fantôme « BUT ! », commentaire masqué pendant la bannière ; panneau arrondi et confettis discrets.
- Interface : commentaire en pastille à accent jaune, annonces (corner, penalty…) en pastille au lieu d'un grand texte brut, mini-carte plus petite avec lignes du terrain, statistiques en direct réservées aux grands écrans pour dégager le terrain sur téléphone.
- Tests : densité et animation de la foule, budget de sommets du stade.

## Version 3.29.0 — match en ligne
- Nouveau mode 🌐 Match en ligne (menu principal) : match de 5 minutes contre un ami, en temps réel.
- Salon par code de 4 caractères (sans caractères ambigus), bouton de partage ; l'ami entre le code et choisit un autre club ; erreurs claires (code inconnu, salon complet, club déjà pris).
- Le serveur Render fait tourner la simulation officielle (60 images/s) avec deux joueurs humains et envoie l'état ~15 fois par seconde ; chaque téléphone l'affiche avec un lissage et envoie joystick, sprint, tir, passes, pressing, changement de joueur et consignes rapides.
- Déconnexion : l'IA prend le relais ; reprise du match possible depuis le même appareil ; abandon depuis le menu (défaite 3-0).
- Classement en ligne (points, victoires, nuls, défaites, différence de buts). Attention : sans base PostgreSQL persistante, il est remis à zéro à chaque redéploiement.
- Serveur WebSocket écrit sans dépendance (lib/ws.js) ; salons et boucle de simulation dans lib/multiplayer.js ; moteur à deux humains dans public/js/netmatch.js ; client dans public/js/online.js. L'application Android se connecte au serveur Render.
- Tests : tests/multiplayer.test.mjs (serveur réel, deux clients, reconnexion, abandon, classement) et tests/online-e2e.mjs (deux navigateurs qui s'affrontent).

## Version 3.28.0 — compétitions africaines
- Tirage des groupes CAF par chapeaux (selon le niveau des clubs) avec protection par pays : jamais deux clubs du même pays dans un groupe (vérifié sur 240 groupes) ; tirage annoncé dans l'actualité, drapeaux des pays dans les groupes.
- Quarts de finale tirés au sort : premier de groupe contre deuxième d'un autre groupe (et d'un autre pays si possible), retour chez le premier ; demi-finales en tirage intégral ; chaque tirage du club est annoncé.
- Déplacements selon la distance réelle depuis Tunis (de ~530 km à Tripoli à ~7 000 km à Johannesburg) : coût du voyage, durée de vol, fatigue immédiate et fatigue de voyage qui freine la récupération les semaines suivantes.
- Avant-match : carte du déplacement et carte « Rotation conseillée » listant les titulaires fatigués, avec un bouton qui fait tourner l'effectif (remplaçant frais au même poste, gardien préservé).
- Correction d'une faute de français : « déplacement au Caire » au lieu de « à Le Caire ».
- Nouveau module public/js/caf.js et tests tests/caf.test.mjs.

## Version 3.27.0 — centre de formation
- Nouvel écran 🎓 Formation : équipe U19 séparée de l'effectif professionnel (20 places), bourses mensuelles, niveau de l'académie, responsable de la formation et précision des recruteurs.
- Détection régionale : missions de 3 à 5 semaines dans le Grand Tunis, le Sahel, Sfax et le Centre-Est, le Nord-Ouest, le Sud ou la diaspora ; profils de joueurs propres à chaque région ; talents plus rares et missions plus chères dans la diaspora.
- Potentiel estimé sous forme de fourchette, plus précise avec de meilleurs recruteurs ; un talent non signé est perdu au bout d'une dizaine de semaines.
- Progression hebdomadaire des U19 selon l'académie, le responsable de la formation, l'âge et le moral, sur les attributs clés de leur poste.
- Promotion en équipe première (statut d'espoir, premier contrat pro) ; à 20 ans, un U19 signe pro s'il a le niveau, sinon il quitte le club.
- Prêts de développement (23 ans au plus) vers des clubs choisis selon le temps de jeu attendu ; le jeune prêté progresse d'autant plus qu'il joue ; bilan affiché au retour. Correction : auparavant, les joueurs prêtés ne progressaient pas du tout.
- La fournée annuelle du centre de formation rejoint désormais les U19 au lieu de l'effectif professionnel.
- Nouveau module public/js/youth.js et tests tests/youth.test.mjs.

## Version 3.26.0 — mercato en plusieurs tours, agents et clauses
- Club vendeur : jusqu'à 3 tours de négociation ; contre-propositions dégressives (le club cède un peu plus à chaque tour) ; il honore toujours sa propre contre-offre ; offre insultante (moins de 55 % du prix) = discussions rompues 4 semaines.
- Agents des joueurs (gourmand, raisonnable, proche du joueur) : salaire, prime à la signature et commission ; au premier contact l'agent annonce ses conditions, puis se rapproche de vos offres selon sa souplesse (3 tours au plus).
- Clauses libératoires : exigées par les joueurs ambitieux dont le niveau dépasse le club ; inscrites au contrat. Payer la clause d'un joueur court-circuite son club ; un club adverse riche peut lever la clause d'un de vos joueurs si elle est sous-évaluée.
- Boutons « Accepter » sur les contre-propositions du club et de l'agent, « Négocier » pour ajuster une offre dans le même dossier (compteur de tours conservé), bouton « Payer la clause ».
- La commission d'agent est débitée à la signature et affichée dans la confirmation ; agent et clause visibles sur la fiche joueur.
- Nouveau module public/js/transfers.js et tests tests/transfers.test.mjs.

## Version 3.25.0 — vestiaire vivant
- Nouvel onglet Effectif › Vestiaire : ambiance du groupe (pondérée par l'influence des leaders et du capitaine), cohésion, joueurs mécontents, temps de jeu réel de chacun comparé à l'attente de son rôle.
- Attentes de temps de jeu par rôle (joueur clé 75 %, titulaire 55 %, rotation 22 %, espoir 8 %) sur les 8 derniers matchs ; titulaire = 1, entré en jeu = ½, blessés épargnés.
- Personnalités : leader, professionnel, tempérament, discret — elles changent la réaction aux entretiens et au manque de temps de jeu.
- Entretiens individuels (un tous les 3 matchs) : féliciter, exiger plus, promettre du temps de jeu, rassurer, accepter ou refuser une demande de départ.
- Promesses suivies sur 5 matchs : tenue = confiance, rompue = forte déception, moral en baisse et cohésion touchée.
- Réunions d'équipe (une tous les 4 matchs) : motiver, apaiser, hausser le ton — l'effet dépend de l'ambiance et des derniers résultats.
- Crise de vestiaire quand plusieurs joueurs (dont un cadre) sont mécontents : cohésion et moral s'érodent, actualité dédiée.
- Le moral pèse désormais sur le rendement en match (−3 % à +2 % sur les attributs).
- Calibrage : saison simulée sans mauvaise gestion = ambiance bonne, pas de vague de demandes de départ.
- Nouveau module public/js/dressing.js et tests tests/dressing.test.mjs.

## Version 3.24.0 — tactique en direct
- Bouton 📋 en match : cinq consignes rapides sans mettre pause (Bloc bas, Contre-attaque, Équilibré, Pressing haut, Tout pour l'attaque) ; touches 1 à 5 au clavier.
- Menu pause : changement de formation en direct, largeur, ligne défensive, consignes rapides, jauges de fatigue de chaque joueur (cartons et blessures signalés).
- Changement de formation par affectation optimale (algorithme hongrois) : chaque joueur rejoint la case la plus proche de son poste, latéraux conservés dans leur couloir, aucun défenseur envoyé en attaque ; fonctionne aussi à dix.
- Conseils de l'adjoint applicables en un geste : blessé, épuisé, averti exposé à l'expulsion (remplaçant au même poste proposé), consigne offensive quand l'équipe est menée, défensive pour préserver une avance ; alerte discrète pendant le jeu pour un joueur blessé ou épuisé.
- Tes consignes sont appliquées telles quelles : l'IA ne modifie plus en cachette la mentalité de ton équipe selon le score (seules les équipes dirigées par l'IA s'adaptent).
- Effet mesuré : hauteur moyenne de l'équipe environ 12 m plus haute en « Tout pour l'attaque » qu'en « Bloc bas ».
- Correction : l'annonce du derby au coup d'envoi n'est plus écrasée par une annonce générique.
- Nouveau module public/js/tactics.js et tests tests/tactics.test.mjs.

## Version 3.23.0 — commentaire contextuel et ambiance de stade
- Nouveau module public/js/commentary.js : commentaire en français, anglais (auparavant le texte français était lu par une voix anglaise) et arabe avec touches de derja tunisienne.
- Buts commentés selon le contexte : triplé, doublé, but tardif décisif, égalisation, prise d'avantage, penalty, coup franc direct, tête, frappe lointaine, contre son camp, festival offensif.
- Annonces désormais déclenchées : coup d'envoi (derby de la capitale Espérance – Club Africain, chocs entre grands clubs), reprise de la seconde période, corners, dernières minutes, temps forts de domination, arrêts décisifs en fin de match, résultat final (victoire ou nul), tirs au but phrase par phrase.
- Plus de répétition immédiate de la même phrase.
- Public synthétisé (aucun enregistrement) : « ooooh » sur les occasions manquées et les poteaux, applaudissements sur les arrêts, sifflets contre les fautes adverses et les cartons reçus, soupir sur un but encaissé, chants rythmés (claquements de mains et darbouka) plus fréquents quand l'équipe à domicile mène.
- Niveaux sonores mesurés hors ligne dans Chrome : aucune saturation, sifflet de l'arbitre au-dessus des sifflets du public.
- Tests ajoutés : tests/commentary.test.mjs.

## Version 3.22.0 — tirs au but jouables
- Séance de tirs au but jouable à la fin d'un match à élimination directe à égalité : Coupe de Tunisie, Supercoupe, et matchs retour CAF à égalité au cumul.
- Règles IFAB : tirage au sort, alternance stricte, 5 tirs chacun, fin anticipée dès qu'une équipe ne peut plus revenir, puis mort subite ; tous les joueurs tirent avant qu'un même joueur tire deux fois, gardien en dernier.
- Au tir : joystick pour viser (haut/bas, vers l'arrière pour lever), maintenir TIR pour la puissance ; cible dans le but et jauge de puissance ; trop de puissance = risque au-dessus.
- Dans les buts : joystick haut/bas au moment de la frappe pour plonger.
- Modèle calibré sur les statistiques réelles : environ 72 % de réussite, 18 % d'arrêts, 10 % à côté ou sur le poteau.
- Tableau de séance (pastilles vertes/rouges), horloge « TAB », boutons adaptés, résultat enregistré dans la carrière (score t.a.b. réel au lieu d'un tirage au hasard).
- « Simuler la fin » ou quitter : la séance est résolue avec le même modèle.
- Match rapide : option « Tirs au but en cas d'égalité ».
- Nouveau module public/js/shootout.js et tests tests/shootout.test.mjs.

## Version 3.21.0 — coups de pied arrêtés aux normes
- Correction majeure : pendant les arrêts de jeu, les joueurs se replacent réellement (ils restaient figés et le ballon se téléportait vers le tireur).
- Le tireur ne peut plus partir balle au pied sur une touche, un engagement, un coup franc, un corner ou un penalty ; le ballon reste au point de remise en jeu jusqu'à la frappe.
- Aucun tacle possible avant que le ballon soit joué ; défenseurs à 9,15 m sur coups francs, corners et engagements.
- Mur sur coup franc (1 à 4 joueurs selon la distance) à 9,15 m, côté premier poteau ; l'arbitre attend qu'il soit formé ; le mur saute à la frappe.
- Frappe de coup franc brossée : le ballon passe au-dessus du mur puis plonge sous la barre ; dosage de la puissance et de l'effet selon la technique.
- Repère de visée en pointillés (frappe en rouge, passe en blanc) sur les coups de pied arrêtés, orientable au joystick.
- La jauge de puissance de tir s'affiche aussi en mode 3D.
- Corners : plus de temps pour que les joueurs montent dans la surface.
- Mesure : environ 9 % de buts sur coups francs directs à 21 m (taux réel 6 à 10 %).
- Tests ajoutés (mur, position du tireur, verrouillage, scénario complet de coup franc joueur).

## Version 3.20.0 — commandes de match aux standards actuels
- Changement de joueur intelligent : priorité au défenseur placé entre le ballon et le but, plutôt qu'au plus proche déjà dépassé.
- Changement automatique en défense (assistance activée) quand le joueur contrôlé est loin de l'action et que le joystick est relâché.
- Défense assistée : le joueur contrôlé cadre le porteur côté but au lieu de rentrer en position.
- Bouton PASSE contextuel : centre automatique dans la surface depuis le couloir près de la ligne de but adverse.
- Tacles utilisateur moins souvent sifflés.
- La difficulté règle l'intensité défensive de l'IA (engagement des tacles, lecture des passes) face au joueur humain : Facile nettement plus accessible, Légende plus exigeante.
- Tests ajoutés dans tests/match-flow.test.mjs ; versions alignées sur 3.20.0.

## Version 3.19.0 — rythme de match réaliste
- Le porteur du ballon conduit quand l'espace existe, passe sous pression réelle, cherche la passe qui fait progresser et ne garde plus le ballon indéfiniment.
- Les défenseurs temporisent côté but à distance de tacle et choisissent le moment de l'intervention selon leur qualité défensive, au lieu de tacler en continu.
- Interceptions réalistes : un adversaire ne capte plus automatiquement une passe rapide qui passe à un mètre ; la distance à la trajectoire, la vitesse du ballon et la lecture défensive décident.
- Les lignes de passe tiennent compte du défenseur collé au passeur ; l'IA ne sert plus un partenaire déjà hors-jeu.
- Temps de contrôle à la réception lié à la qualité de la première touche.
- Résultat mesuré sur un match IA contre IA de 5 minutes : environ 10 tirs (≈ 48 % cadrés) au lieu de 2, ≈ 73 % de passes réussies au lieu de 62 %, 1 à 2 fautes au lieu de 20, hors-jeu rares au lieu de 13, jeu effectif beaucoup moins haché.
- Nouveau fichier de tests tests/match-flow.test.mjs.
- Version de l'application, API, paquet Android et cache hors ligne alignés sur 3.19.0.

## Version 3.18.0 — plongeons des gardiens et tacles plus naturels
- Les plongeons 3D distinguent maintenant l'impulsion, la phase de vol et l'atterrissage.
- Le bras le plus proche du ballon s'étend davantage, tandis que l'autre sert de contrepoids pour une posture de gardien plus crédible.
- Les tacles glissés ouvrent les bras pour stabiliser le corps et accompagner la récupération.
- Correction d'une extension de jambe parasite : un joueur qui ne tacle pas ne conserve plus une pose de tacle en arrière-plan.
- Tests dédiés aux phases du plongeon, à la dissymétrie des bras et à la neutralité des poses au repos.
- Version de l'application, API, paquet Android et cache hors ligne alignés sur 3.18.0.

## Version 3.17.0 — animation corporelle pilotée par l'accélération
- Le moteur de simulation transmet au rendu 3D l'accélération et la décélération réelles des joueurs.
- Les départs explosifs renforcent légèrement l'inclinaison du buste, la poussée des jambes et le contrebalancement des bras.
- Le freinage prépare les appuis et raccourcit la foulée avant un arrêt ou une réorientation.
- Le signal de mouvement est enregistré dans les images de ralenti pour préserver les mêmes gestes pendant la relecture.
- Tests sur accélération, freinage, stabilité des valeurs et transmission vers les replays.
- Versions interface, API, package Android et cache hors ligne alignées sur 3.17.0.

## Version 3.16.0 — défense, inertie et contacts plus naturels
- Marquage défensif individuel : les attaquants dangereux sont distribués entre des défenseurs distincts selon leur menace, la proximité du ballon, leur vitesse et le temps d'approche.
- Les défenseurs conservent une cible de marquage cohérente tout en gardant une pondération de leur position de bloc pour éviter les courses de poursuite exagérées.
- Les changements de direction réduisent progressivement la vitesse cible selon l'angle et la vitesse du joueur, avec une réponse commune aux commandes et à l'IA.
- La physique sépare maintenant deux joueurs exactement superposés à l'aide d'une normale déterministe, au lieu de les laisser coincés au même point.
- Tests sur les affectations uniques, les attaques dans les deux sens, les demi-tours et les collisions à distance nulle.
- Versions interface, API, package Android et cache hors ligne alignées sur 3.16.0.

## Version 3.15.0 — décisions offensives plus réalistes
- L'IA évalue la qualité d'une frappe selon la distance, l'angle, la pression défensive, la finition, la technique et la fatigue du tireur.
- Le placement du gardien intervient dans l'évaluation de l'ouverture de tir ; une ligne de passe dégagée diminue la tendance aux frappes forcées.
- Le délai de réflexion appartient désormais à chaque joueur porteur du ballon, pour éviter qu'un changement de possession hérite du délai d'un autre joueur.
- Tests sur les tirs proches, lointains, sous pression et depuis un angle fermé.
- Versions interface, API, package Android et cache hors ligne alignées sur 3.15.0.

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
