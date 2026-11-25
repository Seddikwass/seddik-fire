# SEDDIK LEAGUE — free player GLB rigging helper

This helper prepares a **static humanoid GLB** for a first skeletal deformation test using Blender's built-in automatic weights. It does not generate motion clips and does not itself connect the GLB to the in-game WebGL renderer.

## Free local workflow

1. Install Blender 3.6+ (free) and download the player's optimized GLB.
2. Place `tools/rig_player_blender.py` beside the GLB.
3. Run from a terminal:

```bash
blender -b --python tools/rig_player_blender.py -- professional-soccer-standing.glb player_rigged.glb
```

4. Open `player_rigged.glb` in Blender and test the bone rotations. Inspect shoulder, hip, knee and ankle deformation before using it in a match.

## Important limitations

- This is a first-pass, proportion-based humanoid skeleton. It assumes an upright character about 1.8m tall, with forward along +Y.
- Blender automatic weights can fail on disconnected accessory meshes or produce poor deformation where the source mesh is not anatomically separated. Correct weights manually in Blender if needed.
- The script does **not** create football animations (idle, run, sprint, pass, shot, tackle, goalkeeper, celebration).
- The current match renderer is custom WebGL. A separate implementation step is required to load glTF skin data and apply joint matrices to the GPU shader; this helper alone must not be described as a deployed player-model replacement.
- Review the model's commercial-use license before shipping it publicly.

No paid credits, subscriptions, or cloud rigging service are used.
