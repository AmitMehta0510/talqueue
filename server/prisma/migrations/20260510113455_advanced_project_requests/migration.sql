-- AlterTable
ALTER TABLE "ProjectJoinRequest" ADD COLUMN     "withdrawnAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ProjectRoleRequirement" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "slots" INTEGER NOT NULL DEFAULT 1,
    "filledSlots" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectRoleRequirement_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ProjectRoleRequirement" ADD CONSTRAINT "ProjectRoleRequirement_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
