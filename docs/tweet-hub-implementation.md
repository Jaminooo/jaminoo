# Tweet Hub — Production Implementation Checklist

Scope: upgrade the existing Tweet Hub (Twitter/X-style SPA) into a production-quality platform. No AI features. Reuse existing services/APIs/Prisma/Socket.IO/i18n/UI. Incremental refactoring — preserve current behavior unless the phase explicitly replaces it.

Statuses: **Not started** · **In progress** · **Implemented** · **Tested**

---

## PHASE 1 — Foundation

| # | Item | Status |
|---|------|--------|
| 1.1 | Consolidated report-reason constants (single source, tweet + message) | Implemented |
| 1.2 | Media kind consistency (IMAGE / IMAGE_ASSET / VIDEO_ASSET via helpers) | Implemented |
| 1.3 | Notification consolidation (one canonical `/api/notifications`; remove `/api/tweets/notifications`) | Implemented |
| 1.4 | Shared validation / error handling for tweet APIs | Implemented |
| 1.5 | DB foundations: models, indexes, migration SQL for all later phases | Implemented |
| 1.6 | Notification preferences (per-kind opt-out) | Implemented |

## PHASE 2 — Tweet Core

| # | Item | Status |
|---|------|--------|
| 2.1 | Threads (compose consecutive replies; thread view) | Implemented |
| 2.2 | Pinned tweets on profile | Implemented |
| 2.3 | Polls (compose, render, vote, expiry) | Implemented |
| 2.4 | Tweet views / impressions (counter + de-dup) | Implemented |
| 2.5 | Persistent hashtag registry + hashtag feed | Implemented |
| 2.6 | Persistent mention registry + mention autocomplete | Implemented |
| 2.7 | Link preview cards (safe fetch + cache) | Implemented |

## PHASE 3 — Social Graph

| # | Item | Status |
|---|------|--------|
| 3.1 | Private accounts + follow requests | Implemented |
| 3.2 | Mutual followers (follows-you / mutual signals in lists) | Implemented |
| 3.3 | Lists (create, join, feed, share) | Implemented |
| 3.4 | Bookmark collections (folders) | Implemented |

## PHASE 4 — Feed & Discovery

| # | Item | Status |
|---|------|--------|
| 4.1 | For You feed with documented deterministic ranking | Implemented |
| 4.2 | Trends rewrite (persisted hashtags + engagement velocity) | Implemented |
| 4.3 | Advanced search (operators: from:, to:, since:, until:, min_faves:, filter:) | Implemented |

For You ranking (source of truth: `src/lib/tweet-ranking.ts`): candidate pool = the 400 most recent top-level tweets in a 7-day window (private/blocked/muted authors excluded). `recency = max(0, 1 - ageMs/7d)`; `score = floor(1000·recency) + min(500,likes) + 2·min(300,retweets) + min(300,replies) + min(200,quotes) + 80 if mutual + 40 if I follow`. Sorted by (score desc, id desc), paginated with an offset cursor.
Trends: `velocity = 3·mentions + likes + 2·retweets + 2·replies` over the persisted hashtag registry in the last 48h, with a 7-day fallback.

## PHASE 5 — Engagement & Content Tools

| # | Item | Status |
|---|------|--------|
| 5.1 | Drafts (autosave + restore) | Implemented |
| 5.2 | Scheduled tweets (queue + server worker) | Implemented |
| 5.3 | Creator analytics (impressions, engagement rate) | Implemented |
| 5.4 | Rich reply surfaces (reply-to chip + author labels) | Not started |

## PHASE 6 — Realtime

| # | Item | Status |
|---|------|--------|
| 6.1 | Socket events for tweet create/update/delete + client listeners | Implemented |
| 6.2 | Live like/repost/notification badge updates | Implemented |

## PHASE 7 — Messaging

| # | Item | Status |
|---|------|--------|
| 7.1 | DM entry point from Tweet Hub profile/conversation | Implemented |
| 7.2 | Message button + deep-link to existing DM panel | Implemented |

## PHASE 8 — Moderation & Security

| # | Item | Status |
|---|------|--------|
| 8.1 | Rate limits on like/retweet/follow/block/report/poll endpoints | Implemented |
| 8.2 | Admin audit trail for tweet moderation actions | Implemented |
| 8.3 | Report dedupe + status lifecycle already present; align reasons | Implemented |

## PHASE 9 — UX Polish

| # | Item | Status |
|---|------|--------|
| 9.1 | Keyboard shortcuts (n = new tweet, / = search) | Implemented |
| 9.2 | Loading skeletons + empty/error states coverage | Not started |
| 9.3 | RTL consistency for polls/previews | Not started |
| 9.4 | Autosave drafts indicator | Not started |

## PHASE 10 — Testing & Hardening

| # | Item | Status |
|---|------|--------|
| 10.1 | vitest setup (devDependency) | Implemented |
| 10.2 | Unit tests: hashtag/mention extraction, search parser, poll validation, ranking | Not started |
| 10.3 | Full `tsc --noEmit`, `npm run build`, `prisma validate` green | Not started |