CREATE TABLE "MediaCatalogItem" (
  "id" SERIAL NOT NULL,
  "kind" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "original" TEXT NOT NULL DEFAULT '',
  "synopsis" TEXT NOT NULL DEFAULT '',
  "genres" TEXT NOT NULL DEFAULT '[]',
  "coverUrl" TEXT NOT NULL DEFAULT '',
  "backdropUrl" TEXT NOT NULL DEFAULT '',
  "studio" TEXT NOT NULL DEFAULT '',
  "status" TEXT NOT NULL DEFAULT 'ONGOING',
  "year" INTEGER NOT NULL DEFAULT 0,
  "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "episodes" INTEGER NOT NULL DEFAULT 0,
  "chapters" INTEGER NOT NULL DEFAULT 0,
  "featured" BOOLEAN NOT NULL DEFAULT false,
  "published" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MediaCatalogItem_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MediaCatalogItem_slug_key" ON "MediaCatalogItem"("slug");
CREATE INDEX "MediaCatalogItem_kind_published_featured_idx" ON "MediaCatalogItem"("kind", "published", "featured");
CREATE INDEX "MediaCatalogItem_kind_updatedAt_idx" ON "MediaCatalogItem"("kind", "updatedAt");
CREATE TABLE "MediaChapter" (
  "id" SERIAL NOT NULL,
  "itemId" INTEGER NOT NULL,
  "number" INTEGER NOT NULL,
  "title" TEXT NOT NULL DEFAULT '',
  "pages" TEXT NOT NULL DEFAULT '[]',
  "published" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MediaChapter_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MediaChapter_itemId_number_key" ON "MediaChapter"("itemId", "number");
CREATE INDEX "MediaChapter_itemId_number_idx" ON "MediaChapter"("itemId", "number");
ALTER TABLE "MediaChapter" ADD CONSTRAINT "MediaChapter_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "MediaCatalogItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Initial editable library entries. Admin can edit or remove these after migration.
INSERT INTO "MediaCatalogItem" ("kind","slug","title","original","synopsis","genres","studio","status","year","score","episodes","chapters","featured","published","updatedAt") VALUES
('ANIME','solo-leveling','Solo Leveling','俺だけレベルアップな件','A hunter discovers a system that lets him grow beyond every limit.','["Action","Fantasy"]','A-1 Pictures','ONGOING',2025,9.1,25,0,true,true,CURRENT_TIMESTAMP),
('ANIME','frieren-anime','Frieren: Beyond Journey’s End','葬送のフリーレン','An elf mage begins a quieter journey after the hero party has already won.','["Fantasy","Drama"]','Madhouse','ONGOING',2024,9.3,28,0,true,true,CURRENT_TIMESTAMP),
('ANIME','jujutsu-kaisen','Jujutsu Kaisen','呪術廻戦','Curses, sorcerers and a dangerous new generation collide.','["Action","Supernatural"]','MAPPA','ONGOING',2025,8.8,47,0,false,true,CURRENT_TIMESTAMP),
('ANIME','vinland-saga','Vinland Saga','ヴィンランド・サガ','A brutal coming-of-age story set against the Viking world.','["Action","Historical"]','Wit Studio','FINISHED',2023,9.0,48,0,false,true,CURRENT_TIMESTAMP),
('MANGA','one-piece','One Piece','ワンピース','Wano — Final Saga. Follow the Straw Hats in the Jamino reader.','["Adventure","Action","Comedy","Fantasy"]','Toei Animation','ONGOING',2025,8.9,0,1188,true,true,CURRENT_TIMESTAMP),
('MANGA','aot','Attack on Titan','進撃の巨人','The Final Season.','["Action","Dark Fantasy","Drama"]','Wit Studio / MAPPA','FINISHED',2023,8.8,0,139,false,true,CURRENT_TIMESTAMP),
('MANGA','jujutsu','Jujutsu Kaisen','呪術廻戦','Shinjuku Showdown.','["Action","Supernatural","Fantasy"]','MAPPA','ONGOING',2025,8.8,0,271,false,true,CURRENT_TIMESTAMP),
('MANGA','frieren','Frieren: Beyond Journey’s End','葬送のフリーレン','The Goddess of Destruction.','["Fantasy","Drama","Adventure"]','Madhouse','ONGOING',2025,9.2,0,140,true,true,CURRENT_TIMESTAMP),
('MANGA','chainsaw','Chainsaw Man','チェンソーマン','The Global Horror.','["Action","Dark Comedy","Horror"]','MAPPA','ONGOING',2025,8.7,0,190,false,true,CURRENT_TIMESTAMP),
('MANGA','vinland','Vinland Saga','ヴィンランド・サガ','The Colony of Vinland.','["Action","Drama","Historical"]','Wit Studio / MAPPA','FINISHED',2024,8.9,0,214,false,true,CURRENT_TIMESTAMP),
('MANGA','bocchi','Bocchi the Rock!','ぼっち・ざ・ろっく！','Guitar, Girl and the World.','["Comedy","Music","Slice of Life"]','CloverWorks','ONGOING',2025,8.4,0,92,false,true,CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;
