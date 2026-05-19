-- CreateIndex
CREATE INDEX "CodingProfile_userId_idx" ON "CodingProfile"("userId");

-- CreateIndex
CREATE INDEX "Department_collegeId_idx" ON "Department"("collegeId");

-- CreateIndex
CREATE INDEX "Education_userId_idx" ON "Education"("userId");

-- CreateIndex
CREATE INDEX "Education_collegeId_idx" ON "Education"("collegeId");

-- CreateIndex
CREATE INDEX "Education_departmentId_idx" ON "Education"("departmentId");

-- CreateIndex
CREATE INDEX "Experience_userId_idx" ON "Experience"("userId");

-- CreateIndex
CREATE INDEX "Experience_companyId_idx" ON "Experience"("companyId");

-- CreateIndex
CREATE INDEX "Profile_collegeId_idx" ON "Profile"("collegeId");

-- CreateIndex
CREATE INDEX "Profile_departmentId_idx" ON "Profile"("departmentId");

-- CreateIndex
CREATE INDEX "UserSkill_skillId_idx" ON "UserSkill"("skillId");
