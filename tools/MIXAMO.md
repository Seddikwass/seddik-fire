# Animations Mixamo pour Seddik Fire (gratuit)

Le jeu est en 2D, vu de dessus. On utilise Mixamo pour animer un soldat 3D, puis Blender pour le photographier d'en haut sous 8 angles. Le résultat est une planche d'images (sprite sheet) que le jeu peut afficher.

## 1. Mixamo (navigateur, compte Adobe gratuit) : mixamo.com
1. Onglet **Characters** : choisissez un soldat (par exemple « Swat » ou « Soldier »), ou importez votre propre modèle : Mixamo le rigge automatiquement.
2. Onglet **Animations** : cherchez et téléchargez chacune de ces animations :
   - `Rifle Idle`, `Rifle Run`, `Rifle Walk`, `Firing Rifle`, `Reloading`
   - `Pistol Idle`, `Pistol Run`, `Shooting` (pistolet)
   - `Crouch Idle`, `Throw Grenade`, `Dying`, `Falling Idle` (parachute), `Hard Landing`
   - Danses de victoire : `Hip Hop Dancing`, `Victory`, `Salute`
3. Pour les déplacements, cochez **In Place** (sinon le soldat sort du cadre).
4. Téléchargement : **Format FBX Binary**, **Skin : With Skin**, **Frames per second : 30**.
5. Mettez tous les fichiers `.fbx` dans un même dossier, par exemple `mixamo/`.

## 2. Blender (gratuit) : blender.org
Ouvrez un terminal dans le dossier `tools/` et lancez :

```
blender -b -P mixamo_to_sprites.py -- --fbx ../mixamo --out ../assets/sprites --dirs 8 --frames 12 --size 160 --elev 70
```

- `--dirs 8` : 8 directions (16 pour plus de fluidité, mais une image plus lourde).
- `--frames 12` : 12 images par animation.
- `--size 160` : taille d'une case en pixels.
- `--elev 70` : inclinaison de la caméra (90 = vue de dessus pure, comme le jeu ; 70 montre un peu le corps).

Pour chaque animation, vous obtenez `rifle_run.png` (8 lignes × 12 colonnes) et `rifle_run.json`.

## 3. Compresser (facultatif) : squoosh.app
Passez les PNG dans Squoosh (OxiPNG ou WebP) pour réduire leur poids de 50 à 70 %.

## 4. Envoyer à Claude
Envoyez-moi les fichiers `.png` et `.json` (ou mettez-les dans `assets/sprites/` sur GitHub). Je branche le code qui choisit la bonne image selon la direction et l'action du soldat : courir, tirer, recharger, tomber, danser à la victoire.

## Autres ressources gratuites utiles
- Modèles 3D CC0 (libres même en commercial) : quaternius.com, kenney.nl
- Textures : polyhaven.com, ambientcg.com
- Bruitages : freesound.org (vérifier la licence de chaque son), jsfxr
- Musique : LMMS ou BandLab (darbouka, mezoued)
- Cartes : Tiled Map Editor

Licence Mixamo : les personnages et animations peuvent être utilisés gratuitement dans un jeu commercial ; seule la revente des fichiers bruts est interdite.
