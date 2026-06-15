import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const departments = [
    {
      name: "Computer Science & Engineering",
      aliases: ["CSE", "CS", "Computer Science", "Computer Engineering", "Computer Science and Engineering"]
    },
    {
      name: "Information Technology",
      aliases: ["IT", "Information Tech", "Information Technology"]
    },
    {
      name: "Electronics & Communication Engineering",
      aliases: ["ECE", "Electronics", "Electronics and Communication", "Electronics & Communication"]
    },
    {
      name: "Electrical & Electronics Engineering",
      aliases: ["EEE", "Electrical", "Electrical Engineering", "Electrical & Electronics"]
    },
    {
      name: "Mechanical Engineering",
      aliases: ["ME", "Mechanical", "Mechanical Engineering", "Mech"]
    },
    {
      name: "Civil Engineering",
      aliases: ["CE", "Civil", "Civil Engineering"]
    },
    {
      name: "Chemical Engineering",
      aliases: ["Chemical", "Chemical Engineering"]
    },
    {
      name: "Aerospace Engineering",
      aliases: ["Aerospace", "Aeronautical", "Aerospace Engineering"]
    },
    {
      name: "Biotechnology",
      aliases: ["Biotech", "Biotechnology"]
    },
    {
      name: "Data Science & Artificial Intelligence",
      aliases: ["AI", "Data Science", "AI & DS", "Artificial Intelligence", "Data Science and AI"]
    }
  ];

  for (const dept of departments) {
    await prisma.standardDepartment.upsert({
      where: { name: dept.name },
      update: {
        aliases: dept.aliases
      },
      create: {
        name: dept.name,
        aliases: dept.aliases
      }
    });
  }

  console.log("Standard departments seeded successfully.");
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
