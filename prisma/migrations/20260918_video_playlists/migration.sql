-- CreateTable
CREATE TABLE "VideoPlaylist" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VideoPlaylist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoPlaylistItem" (
    "id" SERIAL NOT NULL,
    "playlistId" INTEGER NOT NULL,
    "postId" INTEGER NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "pos" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VideoPlaylistItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VideoPlaylist_userId_createdAt_idx" ON "VideoPlaylist"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "VideoPlaylist_userId_name_key" ON "VideoPlaylist"("userId", "name");

-- CreateIndex
CREATE INDEX "VideoPlaylistItem_playlistId_pos_idx" ON "VideoPlaylistItem"("playlistId", "pos");

-- CreateIndex
CREATE INDEX "VideoPlaylistItem_postId_idx" ON "VideoPlaylistItem"("postId");

-- CreateIndex
CREATE UNIQUE INDEX "VideoPlaylistItem_playlistId_postId_key" ON "VideoPlaylistItem"("playlistId", "postId");

-- AddForeignKey
ALTER TABLE "VideoPlaylist" ADD CONSTRAINT "VideoPlaylist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoPlaylistItem" ADD CONSTRAINT "VideoPlaylistItem_playlistId_fkey" FOREIGN KEY ("playlistId") REFERENCES "VideoPlaylist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoPlaylistItem" ADD CONSTRAINT "VideoPlaylistItem_postId_fkey" FOREIGN KEY ("postId") REFERENCES "VideoPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

