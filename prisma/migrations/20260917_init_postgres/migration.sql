-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "SRequest" AS ENUM ('PENDING', 'FRIENDS');

-- CreateEnum
CREATE TYPE "JType" AS ENUM ('PUBLIC', 'PRIVATE');

-- CreateEnum
CREATE TYPE "SInvite" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL DEFAULT '',
    "passwordHash" TEXT,
    "questionId" INTEGER,
    "answerHash" TEXT,
    "avatarId" INTEGER NOT NULL DEFAULT 0,
    "bio" TEXT NOT NULL DEFAULT '',
    "github" BOOLEAN NOT NULL DEFAULT false,
    "githubLogin" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ONLINE',
    "statusText" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "bannedUntil" TIMESTAMP(3),
    "bannedReason" TEXT NOT NULL DEFAULT '',
    "profilePhotoId" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "token" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "device" TEXT NOT NULL DEFAULT '',
    "country" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("token")
);

-- CreateTable
CREATE TABLE "FriendRequest" (
    "id" SERIAL NOT NULL,
    "fromId" INTEGER NOT NULL,
    "toId" INTEGER NOT NULL,
    "status" "SRequest" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FriendRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Jam" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "desc" TEXT NOT NULL DEFAULT '',
    "type" "JType" NOT NULL DEFAULT 'PUBLIC',
    "kind" TEXT NOT NULL DEFAULT 'CHAT',
    "ownerId" INTEGER NOT NULL,
    "closed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentSongId" INTEGER,
    "currentStartedAt" TIMESTAMP(3),
    "currentPlaying" BOOLEAN NOT NULL DEFAULT false,
    "currentPosition" INTEGER NOT NULL DEFAULT 0,
    "currentCinemaVideoId" INTEGER,
    "currentCinemaStartedAt" TIMESTAMP(3),
    "currentCinemaPlaying" BOOLEAN NOT NULL DEFAULT false,
    "currentCinemaPosition" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Jam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JamMember" (
    "jamId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JamMember_pkey" PRIMARY KEY ("jamId","userId")
);

-- CreateTable
CREATE TABLE "JamMessage" (
    "id" SERIAL NOT NULL,
    "jamId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'TEXT',
    "text" TEXT NOT NULL DEFAULT '',
    "mediaId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JamMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Media" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'IMAGE',
    "filename" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "userA" INTEGER NOT NULL,
    "userB" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DmMessage" (
    "id" SERIAL NOT NULL,
    "convId" TEXT NOT NULL,
    "senderId" INTEGER NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'TEXT',
    "text" TEXT NOT NULL DEFAULT '',
    "mediaId" TEXT,
    "seenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DmMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JamInvite" (
    "id" SERIAL NOT NULL,
    "jamId" TEXT NOT NULL,
    "fromId" INTEGER NOT NULL,
    "toId" INTEGER NOT NULL,
    "status" "SInvite" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JamInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reaction" (
    "id" SERIAL NOT NULL,
    "jamMsgId" INTEGER,
    "dmMsgId" INTEGER,
    "emoji" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Artist" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "coverFile" TEXT NOT NULL DEFAULT '',
    "bio" TEXT NOT NULL DEFAULT '',
    "country" TEXT NOT NULL DEFAULT '',
    "genres" TEXT NOT NULL DEFAULT '[]',
    "debutYear" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Artist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Album" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "artistId" INTEGER NOT NULL,
    "year" INTEGER NOT NULL DEFAULT 0,
    "type" TEXT NOT NULL DEFAULT 'ALBUM',
    "label" TEXT NOT NULL DEFAULT '',
    "desc" TEXT NOT NULL DEFAULT '',
    "coverFile" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Album_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Song" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "artistId" INTEGER NOT NULL,
    "featArtistIds" TEXT NOT NULL DEFAULT '[]',
    "albumId" INTEGER,
    "trackNo" INTEGER NOT NULL DEFAULT 0,
    "durationSec" INTEGER NOT NULL DEFAULT 0,
    "genres" TEXT NOT NULL DEFAULT '[]',
    "producer" TEXT NOT NULL DEFAULT '',
    "label" TEXT NOT NULL DEFAULT '',
    "year" INTEGER NOT NULL DEFAULT 0,
    "explicit" BOOLEAN NOT NULL DEFAULT false,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "lyrics" TEXT NOT NULL DEFAULT '',
    "lrc" TEXT NOT NULL DEFAULT '',
    "coverFile" TEXT NOT NULL DEFAULT '',
    "audioFile" TEXT NOT NULL DEFAULT '',
    "audioLink" TEXT NOT NULL DEFAULT '',
    "plays" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Song_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MusicPlaylist" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "desc" TEXT NOT NULL DEFAULT '',
    "coverFile" TEXT NOT NULL DEFAULT '',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MusicPlaylist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MusicPlaylistSong" (
    "id" SERIAL NOT NULL,
    "playlistId" INTEGER NOT NULL,
    "songId" INTEGER NOT NULL,
    "pos" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "MusicPlaylistSong_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JamQueueItem" (
    "id" SERIAL NOT NULL,
    "jamId" TEXT NOT NULL,
    "songId" INTEGER NOT NULL,
    "addedBy" INTEGER NOT NULL,
    "pos" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JamQueueItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SongFavorite" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "songId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SongFavorite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SongPlayHistory" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "songId" INTEGER NOT NULL,
    "jamId" TEXT,
    "playedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SongPlayHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserMusicPlaylist" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "desc" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserMusicPlaylist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserMusicPlaylistItem" (
    "id" SERIAL NOT NULL,
    "playlistId" INTEGER NOT NULL,
    "songId" INTEGER NOT NULL,
    "pos" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "UserMusicPlaylistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JamQueueVote" (
    "id" SERIAL NOT NULL,
    "jamId" TEXT NOT NULL,
    "queueItemId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JamQueueVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "payload" TEXT NOT NULL DEFAULT '{}',
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageReport" (
    "id" SERIAL NOT NULL,
    "reporterId" INTEGER NOT NULL,
    "jamMessageId" INTEGER,
    "dmMessageId" INTEGER,
    "videoPostId" INTEGER,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreatorApplication" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "hub" TEXT NOT NULL,
    "channelName" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "bio" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL DEFAULT '',
    "links" TEXT NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewNote" TEXT NOT NULL DEFAULT '',
    "reviewerId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "CreatorApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoPost" (
    "id" SERIAL NOT NULL,
    "authorId" INTEGER NOT NULL,
    "assetId" TEXT,
    "thumbnailAssetId" TEXT,
    "title" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "kind" TEXT NOT NULL DEFAULT 'POST',
    "mediaType" TEXT NOT NULL DEFAULT 'TEXT',
    "externalUrl" TEXT NOT NULL DEFAULT '',
    "thumbnailUrl" TEXT NOT NULL DEFAULT '',
    "subtitlesUrl" TEXT NOT NULL DEFAULT '',
    "durationSec" INTEGER NOT NULL DEFAULT 0,
    "visibility" TEXT NOT NULL DEFAULT 'PUBLIC',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VideoPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoLike" (
    "id" SERIAL NOT NULL,
    "postId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VideoLike_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoSave" (
    "id" SERIAL NOT NULL,
    "postId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VideoSave_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoComment" (
    "id" SERIAL NOT NULL,
    "postId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VideoComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreatorFollow" (
    "id" SERIAL NOT NULL,
    "followerId" INTEGER NOT NULL,
    "creatorId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreatorFollow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CinemaVideo" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "kind" TEXT NOT NULL DEFAULT 'MOVIE',
    "externalUrl" TEXT NOT NULL DEFAULT '',
    "thumbnailUrl" TEXT NOT NULL DEFAULT '',
    "subtitlesUrl" TEXT NOT NULL DEFAULT '',
    "durationSec" INTEGER NOT NULL DEFAULT 0,
    "visibility" TEXT NOT NULL DEFAULT 'PUBLIC',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CinemaVideo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_githubLogin_key" ON "User"("githubLogin");

-- CreateIndex
CREATE UNIQUE INDEX "User_profilePhotoId_key" ON "User"("profilePhotoId");

-- CreateIndex
CREATE UNIQUE INDEX "FriendRequest_fromId_toId_key" ON "FriendRequest"("fromId", "toId");

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_userA_userB_key" ON "Conversation"("userA", "userB");

-- CreateIndex
CREATE UNIQUE INDEX "Reaction_jamMsgId_userId_emoji_key" ON "Reaction"("jamMsgId", "userId", "emoji");

-- CreateIndex
CREATE UNIQUE INDEX "Reaction_dmMsgId_userId_emoji_key" ON "Reaction"("dmMsgId", "userId", "emoji");

-- CreateIndex
CREATE UNIQUE INDEX "Artist_name_key" ON "Artist"("name");

-- CreateIndex
CREATE INDEX "Song_artistId_idx" ON "Song"("artistId");

-- CreateIndex
CREATE INDEX "Song_albumId_idx" ON "Song"("albumId");

-- CreateIndex
CREATE UNIQUE INDEX "MusicPlaylist_name_key" ON "MusicPlaylist"("name");

-- CreateIndex
CREATE UNIQUE INDEX "MusicPlaylistSong_playlistId_songId_key" ON "MusicPlaylistSong"("playlistId", "songId");

-- CreateIndex
CREATE INDEX "SongFavorite_userId_createdAt_idx" ON "SongFavorite"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SongFavorite_userId_songId_key" ON "SongFavorite"("userId", "songId");

-- CreateIndex
CREATE INDEX "SongPlayHistory_userId_playedAt_idx" ON "SongPlayHistory"("userId", "playedAt");

-- CreateIndex
CREATE INDEX "SongPlayHistory_songId_playedAt_idx" ON "SongPlayHistory"("songId", "playedAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserMusicPlaylist_userId_name_key" ON "UserMusicPlaylist"("userId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "UserMusicPlaylistItem_playlistId_songId_key" ON "UserMusicPlaylistItem"("playlistId", "songId");

-- CreateIndex
CREATE INDEX "JamQueueVote_jamId_queueItemId_idx" ON "JamQueueVote"("jamId", "queueItemId");

-- CreateIndex
CREATE UNIQUE INDEX "JamQueueVote_queueItemId_userId_key" ON "JamQueueVote"("queueItemId", "userId");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_createdAt_idx" ON "Notification"("userId", "readAt", "createdAt");

-- CreateIndex
CREATE INDEX "MessageReport_status_createdAt_idx" ON "MessageReport"("status", "createdAt");

-- CreateIndex
CREATE INDEX "CreatorApplication_hub_status_createdAt_idx" ON "CreatorApplication"("hub", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CreatorApplication_userId_hub_key" ON "CreatorApplication"("userId", "hub");

-- CreateIndex
CREATE INDEX "VideoPost_kind_visibility_id_idx" ON "VideoPost"("kind", "visibility", "id");

-- CreateIndex
CREATE INDEX "VideoPost_authorId_createdAt_idx" ON "VideoPost"("authorId", "createdAt");

-- CreateIndex
CREATE INDEX "VideoLike_userId_createdAt_idx" ON "VideoLike"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "VideoLike_postId_userId_key" ON "VideoLike"("postId", "userId");

-- CreateIndex
CREATE INDEX "VideoSave_userId_createdAt_idx" ON "VideoSave"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "VideoSave_postId_userId_key" ON "VideoSave"("postId", "userId");

-- CreateIndex
CREATE INDEX "VideoComment_postId_createdAt_idx" ON "VideoComment"("postId", "createdAt");

-- CreateIndex
CREATE INDEX "CreatorFollow_creatorId_createdAt_idx" ON "CreatorFollow"("creatorId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CreatorFollow_followerId_creatorId_key" ON "CreatorFollow"("followerId", "creatorId");

-- CreateIndex
CREATE INDEX "CinemaVideo_kind_visibility_id_idx" ON "CinemaVideo"("kind", "visibility", "id");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_profilePhotoId_fkey" FOREIGN KEY ("profilePhotoId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FriendRequest" ADD CONSTRAINT "FriendRequest_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FriendRequest" ADD CONSTRAINT "FriendRequest_toId_fkey" FOREIGN KEY ("toId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Jam" ADD CONSTRAINT "Jam_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Jam" ADD CONSTRAINT "Jam_currentSongId_fkey" FOREIGN KEY ("currentSongId") REFERENCES "Song"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Jam" ADD CONSTRAINT "Jam_currentCinemaVideoId_fkey" FOREIGN KEY ("currentCinemaVideoId") REFERENCES "CinemaVideo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JamMember" ADD CONSTRAINT "JamMember_jamId_fkey" FOREIGN KEY ("jamId") REFERENCES "Jam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JamMember" ADD CONSTRAINT "JamMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JamMessage" ADD CONSTRAINT "JamMessage_jamId_fkey" FOREIGN KEY ("jamId") REFERENCES "Jam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JamMessage" ADD CONSTRAINT "JamMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JamMessage" ADD CONSTRAINT "JamMessage_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Media" ADD CONSTRAINT "Media_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_userA_fkey" FOREIGN KEY ("userA") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_userB_fkey" FOREIGN KEY ("userB") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DmMessage" ADD CONSTRAINT "DmMessage_convId_fkey" FOREIGN KEY ("convId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DmMessage" ADD CONSTRAINT "DmMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DmMessage" ADD CONSTRAINT "DmMessage_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JamInvite" ADD CONSTRAINT "JamInvite_jamId_fkey" FOREIGN KEY ("jamId") REFERENCES "Jam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JamInvite" ADD CONSTRAINT "JamInvite_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JamInvite" ADD CONSTRAINT "JamInvite_toId_fkey" FOREIGN KEY ("toId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_jamMsgId_fkey" FOREIGN KEY ("jamMsgId") REFERENCES "JamMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_dmMsgId_fkey" FOREIGN KEY ("dmMsgId") REFERENCES "DmMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Album" ADD CONSTRAINT "Album_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Song" ADD CONSTRAINT "Song_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Song" ADD CONSTRAINT "Song_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "Album"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MusicPlaylistSong" ADD CONSTRAINT "MusicPlaylistSong_playlistId_fkey" FOREIGN KEY ("playlistId") REFERENCES "MusicPlaylist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MusicPlaylistSong" ADD CONSTRAINT "MusicPlaylistSong_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JamQueueItem" ADD CONSTRAINT "JamQueueItem_jamId_fkey" FOREIGN KEY ("jamId") REFERENCES "Jam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JamQueueItem" ADD CONSTRAINT "JamQueueItem_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JamQueueItem" ADD CONSTRAINT "JamQueueItem_addedBy_fkey" FOREIGN KEY ("addedBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SongFavorite" ADD CONSTRAINT "SongFavorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SongFavorite" ADD CONSTRAINT "SongFavorite_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SongPlayHistory" ADD CONSTRAINT "SongPlayHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SongPlayHistory" ADD CONSTRAINT "SongPlayHistory_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserMusicPlaylist" ADD CONSTRAINT "UserMusicPlaylist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserMusicPlaylistItem" ADD CONSTRAINT "UserMusicPlaylistItem_playlistId_fkey" FOREIGN KEY ("playlistId") REFERENCES "UserMusicPlaylist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserMusicPlaylistItem" ADD CONSTRAINT "UserMusicPlaylistItem_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JamQueueVote" ADD CONSTRAINT "JamQueueVote_jamId_fkey" FOREIGN KEY ("jamId") REFERENCES "Jam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JamQueueVote" ADD CONSTRAINT "JamQueueVote_queueItemId_fkey" FOREIGN KEY ("queueItemId") REFERENCES "JamQueueItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JamQueueVote" ADD CONSTRAINT "JamQueueVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageReport" ADD CONSTRAINT "MessageReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageReport" ADD CONSTRAINT "MessageReport_jamMessageId_fkey" FOREIGN KEY ("jamMessageId") REFERENCES "JamMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageReport" ADD CONSTRAINT "MessageReport_dmMessageId_fkey" FOREIGN KEY ("dmMessageId") REFERENCES "DmMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageReport" ADD CONSTRAINT "MessageReport_videoPostId_fkey" FOREIGN KEY ("videoPostId") REFERENCES "VideoPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreatorApplication" ADD CONSTRAINT "CreatorApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoPost" ADD CONSTRAINT "VideoPost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoPost" ADD CONSTRAINT "VideoPost_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoPost" ADD CONSTRAINT "VideoPost_thumbnailAssetId_fkey" FOREIGN KEY ("thumbnailAssetId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoLike" ADD CONSTRAINT "VideoLike_postId_fkey" FOREIGN KEY ("postId") REFERENCES "VideoPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoLike" ADD CONSTRAINT "VideoLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoSave" ADD CONSTRAINT "VideoSave_postId_fkey" FOREIGN KEY ("postId") REFERENCES "VideoPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoSave" ADD CONSTRAINT "VideoSave_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoComment" ADD CONSTRAINT "VideoComment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "VideoPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoComment" ADD CONSTRAINT "VideoComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreatorFollow" ADD CONSTRAINT "CreatorFollow_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreatorFollow" ADD CONSTRAINT "CreatorFollow_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
