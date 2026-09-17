-- Persistent social moments and creator collaboration invites.
CREATE TABLE "JamMoment" (
    "id" TEXT NOT NULL,
    "jamId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'HIGHLIGHT',
    "note" TEXT NOT NULL DEFAULT '',
    "snapshot" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JamMoment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VideoCollabInvite" (
    "id" SERIAL NOT NULL,
    "postId" INTEGER NOT NULL,
    "fromId" INTEGER NOT NULL,
    "toId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "message" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VideoCollabInvite_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "VideoCollabInvite_postId_toId_key" ON "VideoCollabInvite"("postId", "toId");
CREATE INDEX "JamMoment_jamId_createdAt_idx" ON "JamMoment"("jamId", "createdAt");
CREATE INDEX "VideoCollabInvite_toId_status_createdAt_idx" ON "VideoCollabInvite"("toId", "status", "createdAt");

ALTER TABLE "JamMoment" ADD CONSTRAINT "JamMoment_jamId_fkey" FOREIGN KEY ("jamId") REFERENCES "Jam"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "JamMoment" ADD CONSTRAINT "JamMoment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VideoCollabInvite" ADD CONSTRAINT "VideoCollabInvite_postId_fkey" FOREIGN KEY ("postId") REFERENCES "VideoPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VideoCollabInvite" ADD CONSTRAINT "VideoCollabInvite_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VideoCollabInvite" ADD CONSTRAINT "VideoCollabInvite_toId_fkey" FOREIGN KEY ("toId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
