import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const normalizeKey = (value: string) =>
  value
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

async function main() {
  const colleges = [
    {
      name: "IIT Delhi",
      city: "Delhi",
      state: "Delhi",
    },

    {
      name: "NIT Kurukshetra",
      city: "Kurukshetra",
      state: "Haryana",
    },

    {
      name: "DTU",
      city: "Delhi",
      state: "Delhi",
    },

    {
      name: "IIIT Una",
      city: "Una",
      state: "Himachal Pradesh",
    },
  ];

  for (const college of colleges) {
    await prisma.college.upsert({
      where: {
        normalizedKey: normalizeKey(college.name),
      },

      update: college,

      create: {
        ...college,
        normalizedKey: normalizeKey(college.name),
      },
    });
  }

  console.log("Colleges seeded successfully!");
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
