-- Auto-DJ: when a music jam's queue runs empty and Auto-DJ is enabled,
-- the room keeps playing songs picked from the members' collective taste.

-- AlterTable
ALTER TABLE "Jam" ADD COLUMN "autodj" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Jam" ADD COLUMN "currentAutoDj" BOOLEAN NOT NULL DEFAULT false;