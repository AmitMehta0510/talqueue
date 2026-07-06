-- AlterTable: add country column to Profile
ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "country" TEXT;

-- CreateIndex: index on Profile.country
CREATE INDEX IF NOT EXISTS "Profile_country_idx" ON "Profile"("country");
