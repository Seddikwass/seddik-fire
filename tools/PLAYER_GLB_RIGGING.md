# SEDDIK LEAGUE — joueur GLB et rig gratuit

Un fichier skinné a été généré à partir du modèle source fourni, avec un squelette humanoïde (20 joints), des poids automatiques par proximité des segments, et deux clips simples (« Idle » et « RunCycle »). Le fichier a été vérifié comme GLB 2.0 parsable et son maillage est lisible par trimesh.

## Limites du rig généré

- Le rig et les clips sont une première passe heuristique; les déformations n'ont pas été examinées dans Blender et peuvent nécessiter des corrections manuelles.
- Les clips ne couvrent pas les animations football complètes (passe, tir, tacle, gardien, célébration).
- Le fichier riggé est fourni séparément comme package de travail; il n'est pas encore versionné dans le dépôt.
- Le renderer de match est un WebGL personnalisé. Il faut encore implémenter un loader glTF skinné, l'application des matrices d'os au GPU et le raccordement des poses de match aux clips.
- La version de production n'a pas été remplacée par ce modèle et aucun déploiement Render n'est revendiqué.

## Script Blender gratuit

Le script `tools/rig_player_blender.py` permet de tenter une autre passe d'auto-rigging avec Blender 3.6+ et ses poids automatiques intégrés. Aucun service payant ni crédit cloud n'est requis.

## Vérification commerciale

Vérifier la licence du modèle source avant distribution commerciale.
