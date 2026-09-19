<div align="center">
  <img src="docs/jamino-cover.svg" alt="Jamino — a social universe for your people" width="100%" />

  <h1>Jamino</h1>
  <p><strong>A realtime social universe for conversations, shared rooms, music, video and stories.</strong></p>
  <p>
    <a href="https://github.com/Jaminooo/jaminoo"><img src="https://img.shields.io/github/stars/Jaminooo/jaminoo?style=flat-square&color=f59e0b" alt="GitHub stars" /></a>
    <a href="https://github.com/Jaminooo/jaminoo"><img src="https://img.shields.io/github/last-commit/Jaminooo/jaminoo?style=flat-square&color=8b5cf6" alt="Last commit" /></a>
    <a href="https://github.com/Jaminooo/jaminoo"><img src="https://img.shields.io/github/repo-size/Jaminooo/jaminoo?style=flat-square&color=38bdf8" alt="Repository size" /></a>
    <img src="https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js" alt="Next.js 15" />
    <img src="https://img.shields.io/badge/TypeScript-strict-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript strict" />
  </p>
  <p>
    <a href="#-what-is-jamino">What is Jamino?</a> ·
    <a href="#-product-surface">Product surface</a> ·
    <a href="#-quick-start">Quick start</a> ·
    <a href="#-architecture">Architecture</a> ·
    <a href="#-roadmap">Roadmap</a>
  </p>
</div>

<br />

> **Jamino is a social product laboratory.** It brings the feeling of a personal community dashboard together with the energy of a shared room, a media hub and a creative identity system.

## ✦ What is Jamino?

Jamino is a full-stack social platform built for people who want more than a feed. A user can create an identity, meet friends, enter a Jam, chat in realtime, listen to music together, discover videos, follow creators, and explore cinema without leaving the same experience.

The interface is designed around a dark frosted-glass visual language with expressive motion, responsive layouts and first-class Persian/English support. The codebase is intentionally modular: social primitives, media hubs and admin workflows are separate enough to evolve independently while sharing the same identity and session layer.

## ◈ Product surface

| Surface | What it enables |
| --- | --- |
| **Community** | Profiles, friends, requests, direct messages, public/private Jams and presence. |
| **Realtime rooms** | Group chat, reactions, invites, voice presence and synchronized room activity through Socket.IO. |
| **Music Hub** | Artists, albums, songs, playlists, favourites, history, queue voting, synced lyrics and shared playback. |
| **Video Hub** | Posts, Shorts, long-form video, uploads, thumbnails, comments, likes, saves, playlists and creator discovery. |
| **Creator Studio** | Creator applications, profiles, collaboration invites and live collaboration updates. |
| **Cinema Hub** | Movie and series catalogue, posters, subtitles, watch lists and Movie Jams. |
| **Tweet Hub** | Posts, replies, quotes, retweets, bookmarks, follows, mute and block controls. |
| **Admin Control Room** | Users, sessions, media, reports, messages, creators, music catalogue and cinema publishing workflows. |

## ⚡ Highlights

- **Realtime by default:** Socket.IO powers presence, room state, music, cinema sync, notifications and creator collaboration events.
- **Bilingual by design:** Custom FA/EN translations work with both RTL and LTR layouts.
- **One identity across every hub:** A single account, profile and session model connects the entire product surface.
- **Media-ready infrastructure:** Local persistent storage supports profile images, voice messages, video assets, cinema files and music media.
- **Responsive visual system:** Desktop workspaces, mobile navigation, frosted panels, motion transitions and theme-aware surfaces.
- **Admin-first operations:** Moderation, reporting, creator review, catalogue publishing and session control are treated as product features rather than afterthoughts.

## 🧱 Technology

| Layer | Choice |
| --- | --- |
| Application | Next.js 15 App Router, React 19, TypeScript |
| Styling | Tailwind CSS v4 plus a custom visual system in `src/app/globals.css` |
| Motion and icons | Framer Motion, Lucide React |
| Data | PostgreSQL with Prisma ORM and versioned migrations |
| Realtime | Socket.IO server and client |
| Client state | Zustand |
| Authentication | Secure credentials sessions with bcrypt; optional GitHub OAuth |
| Media | Local storage abstraction with range-aware media delivery |
| Audio and visuals | Howler, WaveSurfer, Recharts and Three.js capabilities |

## 🗺️ Architecture

```mermaid
flowchart LR
  Browser[Browser / PWA]
  App[Next.js App Router]
  API[Route Handlers]
  Live[Socket.IO Server]
  DB[(PostgreSQL)]
  Files[(Persistent Upload Storage)]
  Admin[Admin Control Room]

  Browser --> App
  Browser <-->|WebSocket| Live
  App --> API
  API --> DB
  API --> Files
  Live --> DB
  Admin --> API
  Admin <-->|Live events| Live
```

The application keeps request/response work in Next.js route handlers and uses the custom Node server for WebSocket-backed room state. Prisma migrations define the database contract. Media files are stored outside the database while metadata, ownership and access rules remain queryable through Prisma.

## 🚀 Quick start

### Requirements

- Node.js 20 or newer
- PostgreSQL 14 or newer
- npm

### Install and run

```bash
git clone https://github.com/Jaminooo/jaminoo.git
cd jaminoo
npm install
cp .env.example .env
```

Set `DATABASE_URL` in `.env`, then apply the schema and start the development server:

```bash
npx prisma migrate deploy
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?schema=public"
NEXT_PUBLIC_BASE_URL="http://localhost:3000"
COOKIE_SECURE="0"
GITHUB_CLIENT_ID=""
GITHUB_CLIENT_SECRET=""
GITHUB_REDIRECT_URI="http://localhost:3000/api/auth/github/callback"
UPLOAD_DIR="uploads"
```

`COOKIE_SECURE` should be set to `1` when the application is served through HTTPS. In production, point `UPLOAD_DIR` at a persistent disk or an object-storage-backed mount. The database stores media metadata, but uploaded bytes must live on persistent storage so deploys and restarts do not remove them.

## 🛠️ Useful commands

```bash
npm run dev          # Start Next.js in development mode
npm run build        # Build the production application
npm run start        # Apply migrations and start Next.js + Socket.IO
npm run db:generate  # Generate the Prisma client
npm run db:push      # Push the current Prisma schema
npm run db:reset     # Reset the development database
npx tsc --noEmit     # Run the strict TypeScript check
```

## 📁 Repository map

```text
src/
├── app/              Pages, layouts and API route handlers
├── components/       Product surfaces and reusable UI components
├── lib/              Sessions, Prisma, media, realtime and domain services
├── messages/          FA / EN translation dictionaries
├── providers/        Theme and i18n providers
└── store/             Zustand application state

prisma/
├── migrations/       Versioned PostgreSQL migrations
└── schema.prisma     Domain model and relations

docs/                 Project documentation assets
server.js             Custom Next.js + Socket.IO production server
```

## 🔐 Security and operations

Jamino uses HTTP-only session cookies, bcrypt password hashing, session expiry, session limits, admin checks, upload validation, media access checks and production security headers. The application also supports reports, bans, creator review and session revocation through the admin surface.

For production, use HTTPS, a managed PostgreSQL instance, persistent media storage and a deployment target that can keep the Socket.IO process available. When running multiple application instances, replace local media storage and in-memory realtime assumptions with shared infrastructure.

## 🧭 Roadmap

- [x] Port the original prototype to a modular Next.js application
- [x] Realtime chat, presence and shared room state
- [x] Creator applications, collaboration studio and admin operations
- [ ] Shared object storage for multi-instance media delivery
- [ ] Dedicated Cinema player with episode and season management
- [ ] More complete live moderation and analytics streams
- [ ] Music slots inside every compatible Jam
- [ ] Automated test coverage for core API and session flows

## 🤝 Contributing

Create a feature branch from `dev`, keep changes focused, run `npx tsc --noEmit` and `npm run build`, then open a pull request. The `main` branch is reserved for production-ready changes.

```bash
git checkout dev
git checkout -b feat/your-feature
npm run build
git push origin feat/your-feature
```

## License

No open-source license has been declared yet. Until a license is added, the repository should be treated as **all rights reserved**.

## References

[1]: https://nextjs.org/docs "Next.js Documentation"
[2]: https://www.prisma.io/docs "Prisma Documentation"
[3]: https://socket.io/docs/v4/ "Socket.IO Documentation"
[4]: https://www.postgresql.org/docs/ "PostgreSQL Documentation"

<div align="center">
  <br />
  <sub>Built with intention for the people who make a place feel alive.</sub>
</div>
