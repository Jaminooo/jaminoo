# Jamino 🎧

> User panel with friends, rooms ("Jams") and realtime chat. Designed with an AuthKit-inspired dark, frosted-glass identity.

## Status

**Phase 1 — HTML prototype (functional).** Pure HTML/CSS/JS with a `localStorage` backend, built to validate flows before the real stack:
- Auth: signup (username/password + security question), login, forgot-password via security question, mock GitHub OAuth
- Profile: 12 preset SVG avatars, edit details, change password, copy user ID (`JM-xxxx`)
- Friends: search by ID/username, send/accept/decline/remove requests, view friend profiles
- Jams: create public/private rooms, realtime chat, invite friends, planned music slot
- Live sync across browser tabs via the `storage` event

## Try it

Open `jam/index.html` directly in a browser — no server needed.

Seed users: `sara` (1001) `kaveh` (1002) `nila` (1003) `rumi` (1004). New users auto-join public jams and get a pending friend request from `sara`.

## Next steps (planned real stack)

| Layer | Choice |
|---|---|
| Frontend | Next.js 15 (App Router), Tailwind CSS v4 |
| Motion | Framer Motion |
| Icons | Lucide React |
| Auth | Auth.js v5 (GitHub OAuth + credentials) |
| DB | Prisma + PostgreSQL (Supabase) |
| Uploads | Cloudflare R2 (≤5 profile files per user, deleteable) |
| State | Zustand |
| i18n | next-intl (FA / EN, RTL + LTR) |
| Themes | next-themes (dark / light + custom) |
| Realtime | Socket.IO or Ably |
| Forms | React Hook Form + Zod |

## Git workflow

- `main` — production-ready
- `dev` — daily development (PRs merge here first)
- `feat/*` — feature branches off `dev`

## Roadmap

- [ ] Port prototype to Next.js
- [ ] GitHub OAuth + credentials auth (real)
- [ ] Friends system persisted
- [ ] Jams + realtime chat
- [ ] Profile picture uploads (≤5, server-deleted when removed)
- [ ] FA/EN i18n + RTL/LTR
- [ ] Multi-theme system
- [ ] Music sharing in jams

## License

Private until further notice.