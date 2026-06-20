-- CreateIndex (F4: Unique index on CdcrMember for college-wide members where departmentId is NULL)
CREATE UNIQUE INDEX cdcr_legacy_college_wide_idx
  ON "CdcrMember" ("userId", "collegeId")
  WHERE "departmentId" IS NULL;

-- CreateIndex (F5: Duplicate/conflict prevention partial index on CollegeRequest)
CREATE INDEX college_request_dedup_idx
  ON "CollegeRequest" ("aisheCode", "bankAccountNumber")
  WHERE "status" IN ('PENDING', 'VERIFIED');
