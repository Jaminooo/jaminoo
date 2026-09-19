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
