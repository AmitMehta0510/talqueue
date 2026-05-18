-- AlterTable
ALTER TABLE "RecommendationImpression" ADD COLUMN     "position" INTEGER;

-- CreateTable
CREATE TABLE "UserRecommendation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "recommendedUserId" TEXT NOT NULL,
    "recommendationType" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "reason" TEXT,
    "clicked" BOOLEAN NOT NULL DEFAULT false,
    "dismissed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserRecommendation_userId_idx" ON "UserRecommendation"("userId");

-- AddForeignKey
ALTER TABLE "UserRecommendation" ADD CONSTRAINT "UserRecommendation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRecommendation" ADD CONSTRAINT "UserRecommendation_recommendedUserId_fkey" FOREIGN KEY ("recommendedUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
