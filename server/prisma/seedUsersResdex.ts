/**
 * Seed Script: seedUsersResdex.ts
 *
 * Creates 8 detailed dummy software engineering student profiles in the database
 * and triggers syncUserToResdex for each, so the users_resdex Elasticsearch index
 * gets populated for search testing.
 *
 * Prerequisites (run once before this script):
 *   npx ts-node prisma/seedColleges.ts
 *   npx ts-node prisma/seedSkills.ts
 *
 * Run with:
 *   npx ts-node -r tsconfig-paths/register prisma/seedUsersResdex.ts
 *
 * Idempotent: uses upsert on email/username for users, upsert on company name/slug.
 */

import { PrismaClient, EmploymentType } from "@prisma/client";
import bcrypt from "bcryptjs";
import { syncUserToResdex } from "../src/services/resdexSyncService";
import { initElasticsearchIndices } from "../src/services/elasticIndexManager";

const prisma = new PrismaClient();

// ─── Helpers ────────────────────────────────────────────────────────────────

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function getOrCreateCollege(name: string) {
  const key = slugify(name);
  return prisma.college.upsert({
    where: { normalizedKey: key },
    update: {},
    create: { name, normalizedKey: key },
  });
}

async function getOrCreateSkill(skillName: string) {
  return prisma.skill.upsert({
    where: { name: skillName },
    update: {},
    create: { name: skillName },
  });
}

async function getOrCreateCompany(name: string, industry: string) {
  const slug = slugify(name);
  return prisma.company.upsert({
    where: { slug },
    update: {},
    create: { name, slug, industry },
  });
}

// ─── Candidate Profile Data ──────────────────────────────────────────────────

const CANDIDATES = [
  {
    email: "aarav.sharma@seed.dev",
    username: "aarav_sharma",
    fullName: "Aarav Sharma",
    bio: "Full-stack developer passionate about distributed systems and cloud-native applications. Open to SDE-1 roles.",
    headline: "Final Year CSE @ IIT Delhi | Full-Stack & Cloud Enthusiast",
    cgpa: 9.1,
    graduationYear: 2025,
    college: "IIT Delhi",
    degree: "B.Tech",
    fieldOfStudy: "Computer Science and Engineering",
    startYear: 2021,
    skills: ["TypeScript", "React", "Node.js", "PostgreSQL", "Docker", "AWS"],
    experiences: [
      {
        company: "Google",
        industry: "Technology",
        title: "Software Engineering Intern",
        type: EmploymentType.INTERN,
        startDate: new Date("2024-05-01"),
        endDate: new Date("2024-07-31"),
        description: "Worked on internal tooling for Google Cloud Console using TypeScript and React.",
      },
    ],
  },
  {
    email: "priya.nair@seed.dev",
    username: "priya_nair",
    fullName: "Priya Nair",
    bio: "Machine learning engineer with a strong background in NLP and computer vision. Looking for research or applied ML roles.",
    headline: "ML Engineer | IIT Bombay | NLP & CV",
    cgpa: 9.4,
    graduationYear: 2025,
    college: "IIT Bombay",
    degree: "B.Tech",
    fieldOfStudy: "Electrical Engineering with Minor in CS",
    startYear: 2021,
    skills: ["Python", "TensorFlow", "PyTorch", "Machine Learning", "Natural Language Processing (NLP)", "Scikit-learn"],
    experiences: [
      {
        company: "Microsoft",
        industry: "Technology",
        title: "Research Intern",
        type: EmploymentType.INTERN,
        startDate: new Date("2024-06-01"),
        endDate: new Date("2024-08-31"),
        description: "Contributed to Azure Cognitive Services NLP pipeline improvements using PyTorch.",
      },
    ],
  },
  {
    email: "karan.verma@seed.dev",
    username: "karan_verma",
    fullName: "Karan Verma",
    bio: "Backend developer with 1 year of internship experience at Indian startups. Specializes in REST APIs and microservices.",
    headline: "Backend Engineer | DTU | Node.js & Go",
    cgpa: 8.2,
    graduationYear: 2025,
    college: "DTU",
    degree: "B.Tech",
    fieldOfStudy: "Software Engineering",
    startYear: 2021,
    skills: ["Node.js", "Go", "PostgreSQL", "Redis", "Docker", "REST API"],
    experiences: [
      {
        company: "Razorpay",
        industry: "Fintech",
        title: "Backend Intern",
        type: EmploymentType.INTERN,
        startDate: new Date("2024-01-15"),
        endDate: new Date("2024-06-15"),
        description: "Built payment reconciliation microservices using Go and PostgreSQL.",
      },
      {
        company: "Flipkart",
        industry: "E-Commerce",
        title: "SDE Intern",
        type: EmploymentType.INTERN,
        startDate: new Date("2023-06-01"),
        endDate: new Date("2023-08-31"),
        description: "Improved catalog API response times by 30% through Redis caching.",
      },
    ],
  },
  {
    email: "sneha.gupta@seed.dev",
    username: "sneha_gupta",
    fullName: "Sneha Gupta",
    bio: "Frontend developer with a knack for pixel-perfect UIs and smooth animations. Former design intern at a product startup.",
    headline: "Frontend Developer | NIT Kurukshetra | React & Next.js",
    cgpa: 8.7,
    graduationYear: 2025,
    college: "NIT Kurukshetra",
    degree: "B.Tech",
    fieldOfStudy: "Computer Science",
    startYear: 2021,
    skills: ["React", "Next.js", "TypeScript", "Tailwind CSS", "Figma", "GraphQL"],
    experiences: [
      {
        company: "Zepto",
        industry: "Quick Commerce",
        title: "Frontend Intern",
        type: EmploymentType.INTERN,
        startDate: new Date("2024-05-01"),
        endDate: new Date("2024-07-31"),
        description: "Redesigned the checkout funnel in React + Next.js, improving conversion by 12%.",
      },
    ],
  },
  {
    email: "rohan.mehta@seed.dev",
    username: "rohan_mehta",
    fullName: "Rohan Mehta",
    bio: "DevOps and cloud engineer focused on Kubernetes and CI/CD pipelines. Previously part of CDCR at college.",
    headline: "DevOps Engineer | IIT Delhi | K8s & AWS",
    cgpa: 8.5,
    graduationYear: 2024,
    college: "IIT Delhi",
    degree: "B.Tech",
    fieldOfStudy: "Computer Science",
    startYear: 2020,
    skills: ["Docker", "Kubernetes", "AWS", "Terraform", "GitHub Actions", "Linux"],
    experiences: [
      {
        company: "Amazon",
        industry: "Technology",
        title: "SDE Intern",
        type: EmploymentType.INTERN,
        startDate: new Date("2023-06-01"),
        endDate: new Date("2023-08-31"),
        description: "Automated deployment pipelines for internal tools using AWS CodePipeline and Terraform.",
      },
      {
        company: "Infosys",
        industry: "IT Services",
        title: "DevOps Trainee",
        type: EmploymentType.FULL_TIME,
        startDate: new Date("2024-07-01"),
        endDate: undefined,
        description: "Working on Kubernetes cluster management and GitOps for enterprise clients.",
        isCurrent: true,
      },
    ],
  },
  {
    email: "divya.krishna@seed.dev",
    username: "divya_krishna",
    fullName: "Divya Krishna",
    bio: "Data engineer and analytics enthusiast. Built ETL pipelines and dashboards for a fintech startup.",
    headline: "Data Engineer | IIT Madras | Spark & Airflow",
    cgpa: 8.9,
    graduationYear: 2025,
    college: "IIT Madras",
    degree: "B.Tech",
    fieldOfStudy: "Data Science",
    startYear: 2021,
    skills: ["Python", "Apache Spark", "Apache Kafka", "Apache Airflow", "BigQuery", "Pandas"],
    experiences: [
      {
        company: "PhonePe",
        industry: "Fintech",
        title: "Data Engineering Intern",
        type: EmploymentType.INTERN,
        startDate: new Date("2024-04-01"),
        endDate: new Date("2024-09-30"),
        description: "Designed Kafka-based real-time transaction analytics pipeline serving 1M+ events/day.",
      },
    ],
  },
  {
    email: "arjun.singh@seed.dev",
    username: "arjun_singh",
    fullName: "Arjun Singh",
    bio: "Security researcher and ethical hacker. CTF enthusiast with multiple top-10 finishes.",
    headline: "Cybersecurity Engineer | DTU | Pentesting & AppSec",
    cgpa: 7.8,
    graduationYear: 2025,
    college: "DTU",
    degree: "B.Tech",
    fieldOfStudy: "Information Technology",
    startYear: 2021,
    skills: ["Cybersecurity", "Penetration Testing", "Ethical Hacking", "Python", "Linux", "OWASP"],
    experiences: [
      {
        company: "Zscaler",
        industry: "Cybersecurity",
        title: "Security Research Intern",
        type: EmploymentType.INTERN,
        startDate: new Date("2024-06-01"),
        endDate: new Date("2024-08-31"),
        description: "Performed vulnerability assessments and wrote SIEM detection rules for cloud security products.",
      },
    ],
  },
  {
    email: "ananya.bose@seed.dev",
    username: "ananya_bose",
    fullName: "Ananya Bose",
    bio: "Mobile developer specializing in cross-platform apps with Flutter. Published 2 apps on Play Store.",
    headline: "Mobile Developer | NIT Kurukshetra | Flutter & Firebase",
    cgpa: 8.3,
    graduationYear: 2025,
    college: "NIT Kurukshetra",
    degree: "B.Tech",
    fieldOfStudy: "Computer Science",
    startYear: 2021,
    skills: ["Flutter", "Dart", "Firebase", "React Native", "Android Development", "REST API"],
    experiences: [
      {
        company: "Swiggy",
        industry: "Food Delivery",
        title: "Mobile Intern",
        type: EmploymentType.INTERN,
        startDate: new Date("2024-05-15"),
        endDate: new Date("2024-08-15"),
        description: "Developed Flutter-based merchant onboarding app with Firebase integration.",
      },
    ],
  },
];

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🚀 Starting Resdex seed script...\n");

  // Initialize Elasticsearch indices and mappings
  await initElasticsearchIndices();

  const hashedPassword = await bcrypt.hash("Password123!", 10);

  const seededUserIds: string[] = [];

  for (const candidate of CANDIDATES) {
    console.log(`\n📦 Seeding: ${candidate.fullName} (${candidate.email})`);

    // 1. Upsert User
    const user = await prisma.user.upsert({
      where: { email: candidate.email },
      update: { username: candidate.username },
      create: {
        email: candidate.email,
        username: candidate.username,
        password: hashedPassword,
        status: "ACTIVE",
      },
    });

    // 2. Upsert Profile
    await prisma.profile.upsert({
      where: { userId: user.id },
      update: {
        fullName: candidate.fullName,
        bio: candidate.bio,
        headline: candidate.headline,
        graduationYear: candidate.graduationYear,
      },
      create: {
        userId: user.id,
        fullName: candidate.fullName,
        bio: candidate.bio,
        headline: candidate.headline,
        graduationYear: candidate.graduationYear,
      },
    });

    // 3. Lookup or create college
    const college = await getOrCreateCollege(candidate.college);

    // 4. Upsert Education (match by userId + collegeId + fieldOfStudy if possible)
    const existingEdu = await prisma.education.findFirst({
      where: { userId: user.id, collegeId: college.id },
    });

    if (!existingEdu) {
      await prisma.education.create({
        data: {
          userId: user.id,
          collegeId: college.id,
          degree: candidate.degree,
          fieldOfStudy: candidate.fieldOfStudy,
          startYear: candidate.startYear,
          endYear: candidate.graduationYear,
          cgpa: candidate.cgpa,
        },
      });
    } else {
      await prisma.education.update({
        where: { id: existingEdu.id },
        data: {
          degree: candidate.degree,
          fieldOfStudy: candidate.fieldOfStudy,
          startYear: candidate.startYear,
          endYear: candidate.graduationYear,
          cgpa: candidate.cgpa,
        },
      });
    }

    // 5. Upsert Skills (verified = true for Resdex testing)
    for (const skillName of candidate.skills) {
      const skill = await getOrCreateSkill(skillName);
      await prisma.userSkill.upsert({
        where: { userId_skillId: { userId: user.id, skillId: skill.id } },
        update: { verified: true, level: "ADVANCED" },
        create: {
          userId: user.id,
          skillId: skill.id,
          verified: true,
          level: "ADVANCED",
          verificationSource: "seed_script",
        },
      });
    }

    // 6. Upsert Experiences
    for (const exp of candidate.experiences) {
      const company = await getOrCreateCompany(exp.company, exp.industry);

      const existingExp = await prisma.experience.findFirst({
        where: { userId: user.id, companyId: company.id, title: exp.title },
      });

      if (!existingExp) {
        await prisma.experience.create({
          data: {
            userId: user.id,
            companyId: company.id,
            companyName: exp.company,
            title: exp.title,
            employmentType: exp.type,
            startDate: exp.startDate,
            endDate: exp.endDate,
            isCurrent: (exp as any).isCurrent ?? false,
            description: exp.description,
          },
        });
      }
    }

    seededUserIds.push(user.id);
    console.log(`   ✅ DB records created for ${candidate.fullName} (id: ${user.id})`);
  }

  // ─── Trigger Elasticsearch Sync ────────────────────────────────────────────
  console.log("\n🔄 Triggering Elasticsearch sync for all seeded users...");
  for (const userId of seededUserIds) {
    syncUserToResdex(userId);
  }

  // Wait for fire-and-forget async ops to complete before disconnecting
  console.log("⏳ Waiting 3 seconds for ES sync to complete...");
  await new Promise((resolve) => setTimeout(resolve, 3000));

  console.log(`\n✅ Resdex seed complete! ${seededUserIds.length} candidate(s) seeded and synced to Elasticsearch.`);
  console.log("\n🔍 Test the search API:");
  console.log("   POST /api/v1/resdex/search");
  console.log('   Body: { "skills": ["Python"], "minCgpa": 8.5 }');
}

main()
  .catch((err) => {
    console.error("❌ Seed script failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
