# Rapport gardien — batterie de 26 situations

Généré par `REPORT=1 node tests/keeper.test.mjs` le 2026-11-22 sur le moteur réel (IA gardien, notes de l'effectif chargé). Résultats d'une exécution déterministe (graines fixes).

| # | Type | Situation | Issues sur 20 essais | États observés | Vitesse max gardien |
|---|---|---|---|---|---|
| 1 | tir | Frappe axiale lente au sol, 18 m | arrêt 20 | track → dive → recover | 2.7 m/s |
| 2 | tir | Frappe axiale moyenne, 16 m | arrêt 18, but 2 | track → dive → recover | 3.7 m/s |
| 3 | tir | Frappe puissante plein axe, 20 m | arrêt 20 | track | 2.4 m/s |
| 4 | tir | Tir rasant poteau gauche, 16 m | arrêt 13, but 7 | track → dive | 7.4 m/s |
| 5 | tir | Tir rasant poteau droit, 16 m | but 9, arrêt 11 | track → dive | 7.4 m/s |
| 6 | tir | Lucarne gauche puissante, 22 m | arrêt 3, but 17 | track → dive | 7.4 m/s |
| 7 | tir | Lucarne droite puissante, 22 m | arrêt 3, but 17 | track → dive | 7.4 m/s |
| 8 | tir | Mi-hauteur à mi-distance du poteau, 17 m | arrêt 15, but 5 | track → dive | 7.0 m/s |
| 9 | tir | Tir croisé depuis l angle de la surface | but 6, arrêt 14 | track → dive | 7.4 m/s |
| 10 | tir | Frappe enroulée petit filet, 14 m | but 9, arrêt 11 | track → dive | 7.4 m/s |
| 11 | tir | Face-à-face à 9 m, frappe placée | but 20 | track → dive | 7.0 m/s |
| 12 | tir | Face-à-face à 7 m, frappe sur le gardien | arrêt 18, but 2 | track | 1.5 m/s |
| 13 | tir | Tir de loin, 30 m, au-dessus de la tête | arrêt 19, but 1 | track → dive | 3.2 m/s |
| 14 | tir | Tir de loin, 32 m, au sol | arrêt 18, but 2 | track → dive → recover | 7.0 m/s |
| 15 | tir | Tête à 7 m vers le sol | prise 20 | track → dive | 7.0 m/s |
| 16 | tir | Tête piquée au second poteau | prise 20 | track → dive | 7.1 m/s |
| 17 | tir | Penalty côté fort | but 19, arrêt 1 | track → dive | 7.0 m/s |
| 18 | tir | Penalty au centre à mi-hauteur | arrêt 16, but 4 | track | 2.0 m/s |
| 19 | tir | Tir non cadré à côté | sortie 20 | track | 2.5 m/s |
| 20 | centre | Centre flottant dans les six mètres, premier poteau | captage 20 | set → claim → hold | 5.8 m/s |
| 21 | centre | Centre flottant au point des six mètres | captage 20 | set → claim → hold | 7.0 m/s |
| 22 | centre | Centre rentrant au second poteau | captage 20 | set → claim → hold | 7.9 m/s |
| 23 | centre | Corner sortant tombant à 5 m | captage 18, boxe 2 | set → claim → hold → punch | 6.2 m/s |
| 24 | centre | Corner rentrant sur le gardien | captage 19, boxe 1 | set → claim → hold → punch | 2.4 m/s |
| 25 | centre | Centre en retrait au point de penalty | aucune 20 | set | 4.9 m/s |
| 26 | centre | Centre lointain vers 13 m | aucune 20 | set | 4.5 m/s |

Tirs cadrés arrêtés ou captés : 240/360 (67 %). Sorties aériennes réussies (captage ou boxe) sur centres dans les six mètres : 100/100.

Limites : trajectoires injectées sans effet (spin) ni défenseurs ; les animations restent procédurales (pas de capture de mouvement).
