-- Tweet Hub production upgrade: private accounts, pins, polls, hashtags,
-- mentions, views, notification prefs, drafts, scheduled tweets, lists.

-- User: private account flag + pinned tweet.
ALTER TABLE "User" ADD COLUMN "isPrivate" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "pinnedTweetId" INTEGER;
CREATE UNIQUE INDEX "User_pinnedTweetId_key" ON "User"("pinnedTweetId");

-- Tweet: cached view counter.
ALTER TABLE "Tweet" ADD COLUMN "views" INTEGER NOT NULL DEFAULT 0;

-- Hashtag registry + join.
CREATE TABLE "Hashtag" (
    "id" SERIAL NOT NULL,
    "tag" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Hashtag_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Hashtag_tag_key" ON "Hashtag"("tag");
CREATE INDEX "Hashtag_id_idx" ON "Hashtag"("id");

CREATE TABLE "TweetHashtag" (
    "id" SERIAL NOT NULL,
    "tweetId" INTEGER NOT NULL,
    "hashtagId" INTEGER NOT NULL,
    "pos" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "TweetHashtag_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "TweetHashtag_tweetId_hashtagId_key" ON "TweetHashtag"("tweetId", "hashtagId");
CREATE INDEX "TweetHashtag_hashtagId_id_idx" ON "TweetHashtag"("hashtagId", "id");
CREATE INDEX "TweetHashtag_tweetId_id_idx" ON "TweetHashtag"("tweetId", "id");
ALTER TABLE "TweetHashtag" ADD CONSTRAINT "TweetHashtag_tweetId_fkey" FOREIGN KEY ("tweetId") REFERENCES "Tweet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TweetHashtag" ADD CONSTRAINT "TweetHashtag_hashtagId_fkey" FOREIGN KEY ("hashtagId") REFERENCES "Hashtag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Mentions join.
CREATE TABLE "TweetMention" (
    "id" SERIAL NOT NULL,
    "tweetId" INTEGER NOT NULL,
    "mentionedId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TweetMention_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "TweetMention_tweetId_mentionedId_key" ON "TweetMention"("tweetId", "mentionedId");
CREATE INDEX "TweetMention_mentionedId_id_idx" ON "TweetMention"("mentionedId", "id");
ALTER TABLE "TweetMention" ADD CONSTRAINT "TweetMention_tweetId_fkey" FOREIGN KEY ("tweetId") REFERENCES "Tweet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TweetMention" ADD CONSTRAINT "TweetMention_mentionedId_fkey" FOREIGN KEY ("mentionedId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Polls.
CREATE TABLE "Poll" (
    "id" SERIAL NOT NULL,
    "tweetId" INTEGER NOT NULL,
    "question" TEXT NOT NULL DEFAULT '',
    "durationMinutes" INTEGER NOT NULL DEFAULT 1440,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Poll_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Poll_tweetId_key" ON "Poll"("tweetId");
ALTER TABLE "Poll" ADD CONSTRAINT "Poll_tweetId_fkey" FOREIGN KEY ("tweetId") REFERENCES "Tweet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "PollOption" (
    "id" SERIAL NOT NULL,
    "pollId" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    CONSTRAINT "PollOption_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PollOption_pollId_idx" ON "PollOption"("pollId");
ALTER TABLE "PollOption" ADD CONSTRAINT "PollOption_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "Poll"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "PollVote" (
    "id" SERIAL NOT NULL,
    "tweetId" INTEGER NOT NULL,
    "pollId" INTEGER NOT NULL,
    "optionId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PollVote_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PollVote_pollId_userId_key" ON "PollVote"("pollId", "userId");
CREATE INDEX "PollVote_tweetId_userId_idx" ON "PollVote"("tweetId", "userId");
CREATE INDEX "PollVote_optionId_idx" ON "PollVote"("optionId");
ALTER TABLE "PollVote" ADD CONSTRAINT "PollVote_tweetId_fkey" FOREIGN KEY ("tweetId") REFERENCES "Tweet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PollVote" ADD CONSTRAINT "PollVote_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "Poll"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PollVote" ADD CONSTRAINT "PollVote_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "PollOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PollVote" ADD CONSTRAINT "PollVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Tweet views (deduped per viewer-scope per day).
CREATE TABLE "TweetView" (
    "id" SERIAL NOT NULL,
    "tweetId" INTEGER NOT NULL,
    "viewerId" INTEGER,
    "scope" TEXT NOT NULL DEFAULT 'unique',
    "day" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "count" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "TweetView_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "TweetView_tweetId_viewerId_scope_day_key" ON "TweetView"("tweetId", "viewerId", "scope", "day");
CREATE INDEX "TweetView_tweetId_day_idx" ON "TweetView"("tweetId", "day");
ALTER TABLE "TweetView" ADD CONSTRAINT "TweetView_tweetId_fkey" FOREIGN KEY ("tweetId") REFERENCES "Tweet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TweetView" ADD CONSTRAINT "TweetView_viewerId_fkey" FOREIGN KEY ("viewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Notification preferences.
CREATE TABLE "NotificationPreference" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "NotificationPreference_userId_kind_key" ON "NotificationPreference"("userId", "kind");
CREATE INDEX "NotificationPreference_userId_idx" ON "NotificationPreference"("userId");
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Drafts.
CREATE TABLE "Draft" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "text" TEXT NOT NULL DEFAULT '',
    "mediaIds" TEXT NOT NULL DEFAULT '[]',
    "quotedTweetId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Draft_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Draft_userId_idx" ON "Draft"("userId");
CREATE UNIQUE INDEX "Draft_userId_key" ON "Draft"("userId");
ALTER TABLE "Draft" ADD CONSTRAINT "Draft_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Scheduled tweets.
CREATE TABLE "ScheduledTweet" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "text" TEXT NOT NULL DEFAULT '',
    "mediaIds" TEXT NOT NULL DEFAULT '[]',
    "replyToId" INTEGER,
    "publishAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMP(3),
    CONSTRAINT "ScheduledTweet_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ScheduledTweet_status_publishAt_idx" ON "ScheduledTweet"("status", "publishAt");
CREATE INDEX "ScheduledTweet_userId_publishAt_idx" ON "ScheduledTweet"("userId", "publishAt");
ALTER TABLE "ScheduledTweet" ADD CONSTRAINT "ScheduledTweet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Lists.
CREATE TABLE "TweetList" (
    "id" SERIAL NOT NULL,
    "ownerId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "isPrivate" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TweetList_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "TweetList_ownerId_name_key" ON "TweetList"("ownerId", "name");
CREATE INDEX "TweetList_ownerId_createdAt_idx" ON "TweetList"("ownerId", "createdAt");
ALTER TABLE "TweetList" ADD CONSTRAINT "TweetList_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "TweetListMember" (
    "id" SERIAL NOT NULL,
    "listId" INTEGER NOT NULL,
    "memberId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TweetListMember_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "TweetListMember_listId_memberId_key" ON "TweetListMember"("listId", "memberId");
CREATE INDEX "TweetListMember_memberId_idx" ON "TweetListMember"("memberId");
ALTER TABLE "TweetListMember" ADD CONSTRAINT "TweetListMember_listId_fkey" FOREIGN KEY ("listId") REFERENCES "TweetList"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TweetListMember" ADD CONSTRAINT "TweetListMember_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "TweetListTweet" (
    "id" SERIAL NOT NULL,
    "listId" INTEGER NOT NULL,
    "tweetId" INTEGER NOT NULL,
    "addedBy" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TweetListTweet_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "TweetListTweet_listId_tweetId_key" ON "TweetListTweet"("listId", "tweetId");
CREATE INDEX "TweetListTweet_tweetId_idx" ON "TweetListTweet"("tweetId");
ALTER TABLE "TweetListTweet" ADD CONSTRAINT "TweetListTweet_listId_fkey" FOREIGN KEY ("listId") REFERENCES "TweetList"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TweetListTweet" ADD CONSTRAINT "TweetListTweet_tweetId_fkey" FOREIGN KEY ("tweetId") REFERENCES "Tweet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Phase 3.1 — private accounts: follow-request handshake
CREATE TABLE "TweetFollowRequest" (
    "id" SERIAL NOT NULL,
    "requesterId" INTEGER NOT NULL,
    "targetId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TweetFollowRequest_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "TweetFollowRequest_requesterId_targetId_key" ON "TweetFollowRequest"("requesterId", "targetId");
CREATE INDEX "TweetFollowRequest_targetId_status_idx" ON "TweetFollowRequest"("targetId", "status");
ALTER TABLE "TweetFollowRequest" ADD CONSTRAINT "TweetFollowRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TweetFollowRequest" ADD CONSTRAINT "TweetFollowRequest_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Phase 3.4 — bookmark collections (folders)
CREATE TABLE "TweetBookmarkCollection" (
    "id" SERIAL NOT NULL,
    "ownerId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TweetBookmarkCollection_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "TweetBookmarkCollection_ownerId_name_key" ON "TweetBookmarkCollection"("ownerId", "name");
CREATE INDEX "TweetBookmarkCollection_ownerId_createdAt_idx" ON "TweetBookmarkCollection"("ownerId", "createdAt");
ALTER TABLE "TweetBookmarkCollection" ADD CONSTRAINT "TweetBookmarkCollection_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TweetBookmark" ADD COLUMN "collectionId" INTEGER;
CREATE INDEX "TweetBookmark_collectionId_createdAt_idx" ON "TweetBookmark"("collectionId", "createdAt");
ALTER TABLE "TweetBookmark" ADD CONSTRAINT "TweetBookmark_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "TweetBookmarkCollection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Pin FK.
ALTER TABLE "User" ADD CONSTRAINT "User_pinnedTweetId_fkey" FOREIGN KEY ("pinnedTweetId") REFERENCES "Tweet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Faster profile search used by lists/mentions.
CREATE INDEX "User_username_idx" ON "User"("username");

-- Phase 8.2 — admin moderation audit trail for tweet actions.
CREATE TABLE "TweetMod" (
    "id" SERIAL NOT NULL,
    "tweetId" INTEGER,
    "adminId" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TweetMod_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "TweetMod_tweetId_createdAt_idx" ON "TweetMod"("tweetId", "createdAt");
CREATE INDEX "TweetMod_adminId_createdAt_idx" ON "TweetMod"("adminId", "createdAt");
ALTER TABLE "TweetMod" ADD CONSTRAINT "TweetMod_tweetId_fkey" FOREIGN KEY ("tweetId") REFERENCES "Tweet"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TweetMod" ADD CONSTRAINT "TweetMod_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- Tweet text facets (styled ranges): [{"s":0,"e":5,"t":"b"}]
ALTER TABLE "Tweet" ADD COLUMN "facets" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "Draft" ADD COLUMN "facets" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "ScheduledTweet" ADD COLUMN "facets" TEXT NOT NULL DEFAULT '[]';
