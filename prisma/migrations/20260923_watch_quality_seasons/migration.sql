ALTER TABLE "CinemaVideo" ADD COLUMN IF NOT EXISTS "qualitySources" TEXT NOT NULL DEFAULT '{}';
ALTER TABLE "AnimeEpisode" ADD COLUMN IF NOT EXISTS "season" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "AnimeEpisode" ADD COLUMN IF NOT EXISTS "qualitySources" TEXT NOT NULL DEFAULT '{}';
CREATE TABLE IF NOT EXISTS "CinemaEpisode" (
  "id" SERIAL NOT NULL,
  "cinemaVideoId" INTEGER NOT NULL,
  "season" INTEGER NOT NULL DEFAULT 1,
  "number" INTEGER NOT NULL DEFAULT 1,
  "title" TEXT NOT NULL DEFAULT '',
  "externalUrl" TEXT NOT NULL DEFAULT '',
  "qualitySources" TEXT NOT NULL DEFAULT '{}',
  "thumbnailUrl" TEXT NOT NULL DEFAULT '',
  "subtitlesUrl" TEXT NOT NULL DEFAULT '',
  "durationSec" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CinemaEpisode_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CinemaEpisode_cinemaVideoId_fkey" FOREIGN KEY ("cinemaVideoId") REFERENCES "CinemaVideo"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "CinemaEpisode_cinemaVideoId_season_number_key" ON "CinemaEpisode"("cinemaVideoId", "season", "number");
CREATE INDEX IF NOT EXISTS "CinemaEpisode_cinemaVideoId_season_number_idx" ON "CinemaEpisode"("cinemaVideoId", "season", "number");
