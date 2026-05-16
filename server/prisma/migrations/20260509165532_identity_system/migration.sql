-- CreateTable
CREATE TABLE "CodingProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "username" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CodingProfile_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CodingProfile" ADD CONSTRAINT "CodingProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
