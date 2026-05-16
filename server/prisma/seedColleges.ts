import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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
    await prisma.college.create({
      data: college,
    });
  }

  console.log("Colleges seeded successfully!");
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });