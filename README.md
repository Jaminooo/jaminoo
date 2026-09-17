# Jamino

> User panel with friends, rooms ("Jams") and realtime chat. Next.js 15 App Router with a dark frosted-glass identity.

## Stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 15 (App Router) + Tailwind CSS v4 |
| Motion | Framer Motion |
| Icons | Lucide React |
| Auth | Credentials (bcrypt) + GitHub OAuth (optional) |
| DB | Prisma + PostgreSQL |
| Uploads | Local `./uploads` (≤5 profile photos per user, deleteable) |
| State | Zustand |
| i18n | Custom (FA / EN, RTL + LTR) |
| Themes | Custom (dark / light / system / anime) |

## Features

- Auth: signup (username/password + security question), login, forgot-password via security question, GitHub OAuth
- Profile: preset `JaminoAvatar`s + uploaded photos as profile picture, edit details, change password, copy user ID (`JM-xxxx`)
- Friends: search by ID/username, send/accept/decline/remove requests
- Jams: create public/private rooms, realtime-feel chat (polling), invite friends

## Getting started

```bash
npm install
npx prisma migrate deploy   # apply PostgreSQL migrations
npm run dev                 # http://localhost:3000
```

`.env`:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?schema=public"
NEXT_PUBLIC_BASE_URL="http://localhost:3000"
COOKIE_SECURE="0"           # set to "1" behind HTTPS
GITHUB_CLIENT_ID=""         # optional OAuth
GITHUB_CLIENT_SECRET=""
GITHUB_REDIRECT_URI="http://localhost:3000/api/auth/github/callback"
UPLOAD_DIR="uploads"   # use the Render Persistent Disk mount path in production
```

Production:

```bash
npm run build
npm run start   # applies migrations, then starts Next.js + Socket.IO
```

For Render uploads, attach a Persistent Disk to the Web Service and set `UPLOAD_DIR` to its mount path (for example `/opt/render/project/src/uploads`). Profile photos, voice messages, video assets, and music files all use this path; without a persistent disk, Render's ephemeral filesystem is cleared on deploy/restart.

## Git workflow

- `main` — production-ready
- `dev` — daily development (PRs merge here first)
- `feat/*` — feature branches off `dev`

## Roadmap

- [x] Port prototype to Next.js
- [x] Realtime chat & friends via WebSocket (socket.io)
- [ ] Scalable object storage for multi-instance deployments
- [ ] Music slot in rooms
