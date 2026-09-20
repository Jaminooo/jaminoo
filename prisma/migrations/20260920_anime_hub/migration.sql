-- Anime Hub: catalog, episodes, synced watch-together and hub-scoped roles.

CREATE TYPE "AnimeType" AS ENUM ('TV', 'MOVIE', 'OVA', 'SPECIAL');
CREATE TYPE "AnimeStatus" AS ENUM ('FINISHED', 'AIRING', 'UPCOMING');

CREATE TABLE "Anime" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "original" TEXT NOT NULL DEFAULT '',
    "overview" TEXT NOT NULL DEFAULT '',
    "coverFile" TEXT NOT NULL DEFAULT '',
    "trailerUrl" TEXT NOT NULL DEFAULT '',
    "type" "AnimeType" NOT NULL DEFAULT 'TV',
    "status" "AnimeStatus" NOT NULL DEFAULT 'FINISHED',
    "year" INTEGER NOT NULL DEFAULT 0,
    "episodes" INTEGER NOT NULL DEFAULT 0,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "genres" TEXT NOT NULL DEFAULT '[]',
    "studio" TEXT NOT NULL DEFAULT '',
    "colorFrom" INTEGER NOT NULL DEFAULT 260,
    "colorTo" INTEGER NOT NULL DEFAULT 340,
    "visibility" TEXT NOT NULL DEFAULT 'PUBLIC',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Anime_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Anime_slug_key" ON "Anime"("slug");
CREATE INDEX "Anime_visibility_id_idx" ON "Anime"("visibility", "id");
CREATE INDEX "Anime_type_status_idx" ON "Anime"("type", "status");
CREATE INDEX "Anime_rating_idx" ON "Anime"("rating");
CREATE INDEX "Anime_year_idx" ON "Anime"("year");

CREATE TABLE "AnimeEpisode" (
    "id" SERIAL NOT NULL,
    "animeId" INTEGER NOT NULL,
    "slug" TEXT NOT NULL DEFAULT '',
    "title" TEXT NOT NULL,
    "number" INTEGER NOT NULL DEFAULT 0,
    "externalUrl" TEXT NOT NULL DEFAULT '',
    "thumbnailUrl" TEXT NOT NULL DEFAULT '',
    "subtitlesUrl" TEXT NOT NULL DEFAULT '',
    "durationSec" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AnimeEpisode_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AnimeEpisode_animeId_number_idx" ON "AnimeEpisode"("animeId", "number");
ALTER TABLE "AnimeEpisode" ADD CONSTRAINT "AnimeEpisode_animeId_fkey" FOREIGN KEY ("animeId") REFERENCES "Anime"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "AdminRole" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'HUB',
    "scope" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AdminRole_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AdminRole_userId_key" ON "AdminRole"("userId");
CREATE INDEX "AdminRole_role_scope_idx" ON "AdminRole"("role", "scope");
ALTER TABLE "AdminRole" ADD CONSTRAINT "AdminRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Watch-together state carried on the Jam.
ALTER TABLE "Jam" ADD COLUMN "currentAnimeEpisodeId" INTEGER;
ALTER TABLE "Jam" ADD COLUMN "currentAnimePlaying" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Jam" ADD COLUMN "currentAnimePosition" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Jam" ADD COLUMN "currentAnimeStartedAt" TIMESTAMP(3);
ALTER TABLE "Jam" ADD CONSTRAINT "Jam_currentAnimeEpisodeId_fkey" FOREIGN KEY ("currentAnimeEpisodeId") REFERENCES "AnimeEpisode"("id") ON DELETE SET NULL ON UPDATE CASCADE;
