-- AlterTable
ALTER TABLE "College" ADD COLUMN     "country" TEXT;

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "country" TEXT;

-- AlterTable
ALTER TABLE "Department" ADD COLUMN     "hod" TEXT;

-- CreateTable
CREATE TABLE "CollegeAdmin" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "collegeId" TEXT NOT NULL,
    "grantedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CollegeAdmin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyAdmin" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "officeCity" TEXT,
    "grantedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanyAdmin_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CollegeAdmin_collegeId_idx" ON "CollegeAdmin"("collegeId");

-- CreateIndex
CREATE INDEX "CollegeAdmin_userId_idx" ON "CollegeAdmin"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CollegeAdmin_userId_collegeId_key" ON "CollegeAdmin"("userId", "collegeId");

-- CreateIndex
CREATE INDEX "CompanyAdmin_companyId_idx" ON "CompanyAdmin"("companyId");

-- CreateIndex
CREATE INDEX "CompanyAdmin_userId_idx" ON "CompanyAdmin"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyAdmin_userId_companyId_officeCity_key" ON "CompanyAdmin"("userId", "companyId", "officeCity");

-- CreateIndex
CREATE INDEX "College_country_idx" ON "College"("country");

-- AddForeignKey
ALTER TABLE "CollegeAdmin" ADD CONSTRAINT "CollegeAdmin_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollegeAdmin" ADD CONSTRAINT "CollegeAdmin_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "College"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollegeAdmin" ADD CONSTRAINT "CollegeAdmin_grantedById_fkey" FOREIGN KEY ("grantedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyAdmin" ADD CONSTRAINT "CompanyAdmin_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyAdmin" ADD CONSTRAINT "CompanyAdmin_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyAdmin" ADD CONSTRAINT "CompanyAdmin_grantedById_fkey" FOREIGN KEY ("grantedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
