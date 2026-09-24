# Community loading and recovery states — 2026-09-24

## Delivered

- Added reusable, accessible loading and retry feedback for lists.
- Separated initial loading, request failure, and truly empty results in Groups, Friends, and the DM inbox.
- Added delayed friend-search loading feedback and cancelled stale search responses when the query changes.
- Refreshed the DM inbox from live new-message and read events.
- Preserved existing group, friend, and messaging APIs.

## Validation

- `npx tsc --noEmit` passed.
- `git diff --check` passed.
- Local `/` returned HTTP 200 after compilation.
- Unit tests and production build were not run; the development server remains active.
- Chrome visual inspection is not available in this session.

## Remaining

- Continue refining community room and message composition behavior, then review the rendered screens visually when browser control is available.

## Glossary

- **Stale search response:** a result from an earlier query arriving after the user has already changed the search text.
