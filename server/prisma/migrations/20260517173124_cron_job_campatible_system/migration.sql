-- CreateTable
CREATE TABLE "TrendingSnapshot" (
    "id" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "entityType" "FeedItemType" NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "velocityScore" DOUBLE PRECISION NOT NULL,
    "engagementDelta" DOUBLE PRECISION NOT NULL,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrendingSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecommendationCache" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "recommendationType" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecommendationCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TrendingSnapshot_entityType_idx" ON "TrendingSnapshot"("entityType");

-- CreateIndex
CREATE INDEX "TrendingSnapshot_score_idx" ON "TrendingSnapshot"("score");

-- CreateIndex
CREATE INDEX "RecommendationCache_userId_idx" ON "RecommendationCache"("userId");
