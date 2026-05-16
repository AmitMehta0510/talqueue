import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const roles = [
    "STUDENT",
    "PROFESSOR",
    "PROFESSIONAL",
    "RECRUITER",
    "ADMIN"
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role },
      update: {},
      create: { name: role }
    });
  }

  console.log("Roles seeded");
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });