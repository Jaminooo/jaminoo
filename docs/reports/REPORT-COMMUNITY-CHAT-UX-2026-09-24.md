# Community chat workflow polish — 2026-09-24

## Delivered

- Added a mobile channel picker to group chat, where the desktop channel sidebar is hidden on phones.
- Separated group-message loading, error, and empty states, with retry and protection against older channel requests replacing newer results.
- Added loading and retry feedback when opening direct messages and during reconnect polling.
- Kept message drafts when sending fails in direct messages and listening rooms.
- Added feedback when voice-message recording cannot access a microphone, and labeled the composer input for assistive technology.
- Marked the group member manager as a labeled dialog and exposed its open state to the trigger.

## Validation

- `npx tsc --noEmit` passed.
- `git diff --check` passed.
- Local `/` returned HTTP 200 after the live app compile.
- Unit tests and production build were not run; the dev server remains active.
- Chrome visual inspection is unavailable in this session.

## Remaining

- Continue the media workspace and player interaction pass; review all changed screens visually once browser control is available.

## Glossary

- **Request ordering:** ignoring an older response if the user has already switched to a newer channel.
