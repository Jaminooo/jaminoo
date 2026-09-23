-- Mirror uploaded media bytes into Postgres so they survive hosters with
-- ephemeral disk (Render free tier wipes uploads/ on every sleep/redeploy).
ALTER TABLE "Media" ADD COLUMN "data" BYTEA;