# Watch Hub playback follow-up — 2026-09-23

## What changed
- The title modal now mounts its player immediately and attempts muted playback while visible; the user can unmute with the existing player controls.
- Anime and cinema series load their episode lists and start with the first episode. Cinema title playback keeps its configured quality sources.
- Fixed the missing detail-modal layout and scrolling rules, including the mobile layout.
- The dedicated theater page also attempts muted playback when its player is visible.

## Validation
- `npx tsc --noEmit` passed.
- `npm run build` passed; existing lint warnings were reported in unrelated files.
- The bundled `/defaults/videos/demo.mp4` exists (10,474,662 bytes).
- Manual playback could not be checked: no Chrome browser runtime or local server was available in this session.
- Automated tests were not run.

## Remaining / next step
- Verify playback with an authenticated browser session and confirm audio can be unmuted.

## Glossary
- **Muted autoplay:** the browser may start visible media silently; the existing player controls let the viewer enable audio.
