-- Creator publishing workflow
ALTER TABLE "VideoPost" ADD COLUMN "workflowStatus" TEXT NOT NULL DEFAULT 'PUBLISHED';
ALTER TABLE "VideoPost" ADD COLUMN "publishAt" TIMESTAMP(3);
CREATE INDEX "VideoPost_workflowStatus_publishAt_idx" ON "VideoPost"("workflowStatus", "publishAt");
