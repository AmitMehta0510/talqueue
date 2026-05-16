import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
const skills = [
  // Programming Languages
  "JavaScript",
  "TypeScript",
  "Java",
  "Python",
  "C",
  "C++",
  "C#",
  "Go",
  "Rust",
  "PHP",
  "Kotlin",
  "Swift",

  // Frontend
  "HTML",
  "CSS",
  "Tailwind CSS",
  "Bootstrap",
  "Material UI",
  "React",
  "Next.js",
  "Redux",
  "Vue.js",
  "Nuxt.js",
  "Angular",
  "Svelte",

  // Backend
  "Node.js",
  "Express.js",
  "NestJS",
  "Spring Boot",
  "Hibernate",
  "Django",
  "Flask",
  "FastAPI",
  "Laravel",
  "ASP.NET Core",

  // Databases
  "PostgreSQL",
  "MySQL",
  "MongoDB",
  "Redis",
  "SQLite",
  "Oracle",
  "Microsoft SQL Server",
  "Firebase",

  // ORM / Database Tools
  "Prisma",
  "Mongoose",
  "Sequelize",
  "TypeORM",

  // DevOps / Cloud
  "Docker",
  "Kubernetes",
  "AWS",
  "Azure",
  "Google Cloud Platform",
  "Nginx",
  "Linux",
  "CI/CD",
  "GitHub Actions",

  // APIs / Authentication
  "REST API",
  "GraphQL",
  "JWT Authentication",
  "OAuth",
  "Socket.IO",

  // Testing
  "Jest",
  "Mocha",
  "Cypress",
  "Playwright",

  // Version Control
  "Git",
  "GitHub",
  "GitLab",

  // Mobile Development
  "React Native",
  "Flutter",
  "Android Development",
  "iOS Development",

  // Software Engineering Concepts
  "Data Structures",
  "Algorithms",
  "Object-Oriented Programming",
  "System Design",
  "Microservices",
  "Design Patterns",
  "Operating Systems",
  "DBMS",
  "Computer Networks",

  // AI / ML
  "Machine Learning",
  "Deep Learning",
  "TensorFlow",
  "PyTorch",

  // Other Tools
  "Webpack",
  "Vite",
  "Babel",
  "Figma",
  "Postman"
];

  for (const skill of skills) {
    await prisma.skill.upsert({
      where: {
        name: skill,
      },

      update: {},

      create: {
        name: skill,
      },
    });
  }

  console.log("Skills seeded");
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });