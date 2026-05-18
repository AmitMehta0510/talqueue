/*
  Warnings:

  - A unique constraint covering the columns `[entityId,entityType]` on the table `TrendingSnapshot` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "TrendingSnapshot_entityId_entityType_key" ON "TrendingSnapshot"("entityId", "entityType");
