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
      emailDomains: ["iitd.ac.in", "alumni.iitd.ac.in"],
    },

    {
      name: "NIT Kurukshetra",
      city: "Kurukshetra",
      state: "Haryana",
      emailDomains: ["nitkkr.ac.in"],
    },

    {
      name: "DTU",
      city: "Delhi",
      state: "Delhi",
      emailDomains: ["dtu.ac.in"],
    },

    {
      name: "IIIT Una",
      city: "Una",
      state: "Himachal Pradesh",
      emailDomains: ["iiitu.ac.in"],
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
