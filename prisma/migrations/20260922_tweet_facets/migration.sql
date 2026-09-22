-- Tweet text facets (styled ranges): [{"s":0,"e":5,"t":"b"}]
-- Separate from 20260920_tweet_hub_production because it was released already;
-- IF NOT EXISTS keeps this safe to apply on any environment regardless of
-- whether a rolling deploy previously created the columns.
ALTER TABLE "Tweet" ADD COLUMN IF NOT EXISTS "facets" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "Draft" ADD COLUMN IF NOT EXISTS "facets" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "ScheduledTweet" ADD COLUMN IF NOT EXISTS "facets" TEXT NOT NULL DEFAULT '[]';