-- CreateTable
CREATE TABLE "public"."news_items" (
    "id" TEXT NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "content" TEXT NOT NULL,
    "version" TEXT,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "news_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."news_read_statuses" (
    "id" TEXT NOT NULL,
    "lastReadAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "news_read_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "news_items_publishedAt_idx" ON "public"."news_items"("publishedAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "news_read_statuses_userId_key" ON "public"."news_read_statuses"("userId");

-- AddForeignKey
ALTER TABLE "public"."news_read_statuses" ADD CONSTRAINT "news_read_statuses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
