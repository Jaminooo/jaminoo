# Icon route cleanup — 2026-09-23

## Delivered

- Removed the duplicate public icon so Next.js has one `/icon.svg` source.
- Kept the app icon route and updated it to the square violet/cyan brand mark used by the manifest and service worker.

## Validation

- `GET /icon.svg` returns `200 image/svg+xml` from the running local server.
- The home route continues to return HTTP 200.
