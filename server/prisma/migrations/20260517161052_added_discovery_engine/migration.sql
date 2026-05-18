-- CreateTable
CREATE TABLE "RecommendationImpression" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "entityType" "FeedItemType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "shownCount" INTEGER NOT NULL DEFAULT 1,
    "clicked" BOOLEAN NOT NULL DEFAULT false,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "dismissed" BOOLEAN NOT NULL DEFAULT false,
    "score" DOUBLE PRECISION,
    "source" TEXT,
    "lastShownAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecommendationImpression_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeedAnalytics" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "entityType" "FeedItemType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "impression" BOOLEAN NOT NULL DEFAULT false,
    "clicked" BOOLEAN NOT NULL DEFAULT false,
    "liked" BOOLEAN NOT NULL DEFAULT false,
    "saved" BOOLEAN NOT NULL DEFAULT false,
    "shared" BOOLEAN NOT NULL DEFAULT false,
    "applied" BOOLEAN NOT NULL DEFAULT false,
    "watchTime" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeedAnalytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecommendationSnapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "topSkills" JSONB,
    "topInterests" JSONB,
    "topCommunities" JSONB,
    "dominantRole" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecommendationSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RecommendationImpression_userId_idx" ON "RecommendationImpression"("userId");

-- CreateIndex
CREATE INDEX "RecommendationImpression_entityType_entityId_idx" ON "RecommendationImpression"("entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "RecommendationImpression_userId_entityType_entityId_key" ON "RecommendationImpression"("userId", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "FeedAnalytics_userId_idx" ON "FeedAnalytics"("userId");

-- CreateIndex
CREATE INDEX "FeedAnalytics_entityType_entityId_idx" ON "FeedAnalytics"("entityType", "entityId");

-- AddForeignKey
ALTER TABLE "RecommendationImpression" ADD CONSTRAINT "RecommendationImpression_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedAnalytics" ADD CONSTRAINT "FeedAnalytics_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecommendationSnapshot" ADD CONSTRAINT "RecommendationSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
