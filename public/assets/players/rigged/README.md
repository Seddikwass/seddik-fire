# Rigged player asset — integration staging

- File: `player.glb`
- Source: `kendrekaran/striker-3d`, Quaternius humanoid asset
- License: CC0 1.0 Universal (public domain dedication); see `LICENSE-quaternius.txt`.
- Purpose: candidate rigged humanoid for the SEDDIK LEAGUE match renderer.
- Status: asset staged only. It is **not yet loaded in the game** and must not replace procedural players until skeleton, animation clips, camera alignment, player-action mapping, mobile performance, and offline loading are validated.
- Animation note: the source sample uses non-football actions; football-specific retargeting or authored clips are still required.

## Visual preview bench

The page `/rigged-player-preview.html` is a separate visual inspection bench for the staged CC0 GLB. It loads the asset from the same application origin and reports the animation clips found by the browser's model viewer.

This is intentionally not wired into `renderer3d.js` yet. The current match renderer uses a custom WebGL geometry pipeline; replacing the procedural player requires skeleton/clip retargeting, team-kit material mapping, match-pose synchronization, and mobile/offline validation. Keep the procedural renderer as the fallback until those checks pass.
