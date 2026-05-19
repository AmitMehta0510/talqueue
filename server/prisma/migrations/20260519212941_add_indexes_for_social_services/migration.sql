-- CreateIndex
CREATE INDEX "Community_collegeId_departmentId_autoJoinEligible_idx" ON "Community"("collegeId", "departmentId", "autoJoinEligible");

-- CreateIndex
CREATE INDEX "Community_companyId_autoJoinEligible_idx" ON "Community"("companyId", "autoJoinEligible");

-- CreateIndex
CREATE INDEX "CommunityMember_userId_active_idx" ON "CommunityMember"("userId", "active");

-- CreateIndex
CREATE INDEX "Connection_senderId_status_reviewedAt_idx" ON "Connection"("senderId", "status", "reviewedAt");

-- CreateIndex
CREATE INDEX "Connection_receiverId_status_reviewedAt_idx" ON "Connection"("receiverId", "status", "reviewedAt");

-- CreateIndex
CREATE INDEX "Connection_status_idx" ON "Connection"("status");

-- CreateIndex
CREATE INDEX "Education_userId_collegeId_departmentId_idx" ON "Education"("userId", "collegeId", "departmentId");

-- CreateIndex
CREATE INDEX "Experience_userId_employmentType_startDate_endDate_idx" ON "Experience"("userId", "employmentType", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "Follow_followerId_createdAt_idx" ON "Follow"("followerId", "createdAt");

-- CreateIndex
CREATE INDEX "Follow_followingId_createdAt_idx" ON "Follow"("followingId", "createdAt");
