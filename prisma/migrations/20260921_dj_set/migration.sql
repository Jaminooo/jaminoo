-- DJ Set: guest participants, guest sessions, collective skip votes.
-- Wipes all legacy jams (kinds CHAT/MOVIE/ANIME/HANGOUT) per product decision.
-- New jams are music-only sessions.

-- Cleanup: remove legacy jams and all dependent rows (members, messages,
-- reactions, invites, moments, queue items, queue votes) via cascade.
DELETE FROM "Jam";

-- AlterTable
ALTER TABLE "User" ADD COLUMN "isGuest" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "guestUntil" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Session" ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'USER';

-- CreateTable
CREATE TABLE "JamSkipVote" (
    "id" SERIAL NOT NULL,
    "jamId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "songId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JamSkipVote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "JamSkipVote_jamId_userId_songId_key" ON "JamSkipVote"("jamId", "userId", "songId");

-- CreateIndex
CREATE INDEX "JamSkipVote_jamId_songId_idx" ON "JamSkipVote"("jamId", "songId");

-- AddForeignKey
ALTER TABLE "JamSkipVote" ADD CONSTRAINT "JamSkipVote_jamId_fkey" FOREIGN KEY ("jamId") REFERENCES "Jam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JamSkipVote" ADD CONSTRAINT "JamSkipVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;