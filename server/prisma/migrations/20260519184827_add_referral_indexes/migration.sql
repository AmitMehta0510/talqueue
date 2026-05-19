-- CreateIndex
CREATE INDEX "ReferralRequest_requesterId_createdAt_idx" ON "ReferralRequest"("requesterId", "createdAt");

-- CreateIndex
CREATE INDEX "ReferralRequest_receiverId_status_idx" ON "ReferralRequest"("receiverId", "status");

-- CreateIndex
CREATE INDEX "ReferralRequest_companyId_status_idx" ON "ReferralRequest"("companyId", "status");
