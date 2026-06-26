import "../src/shared/config/loadEnv";
import prisma from "../src/shared/database/prisma";
import bcrypt from "bcryptjs";

async function main() {
  console.log("🚀 Seeding Staging Sandbox specific test data...");

  const passwordHash = await bcrypt.hash("Password123!", 10);

  // 1. Create or Update TPO User
  const tpoUser = await prisma.user.upsert({
    where: { email: "tpo@seed.dev" },
    update: {
      username: "tpo_admin",
      password: passwordHash,
      primaryRole: "TPO",
    },
    create: {
      email: "tpo@seed.dev",
      username: "tpo_admin",
      password: passwordHash,
      primaryRole: "TPO",
      status: "ACTIVE",
    },
  });
  console.log(`   ✅ TPO User seeded: ${tpoUser.email} (id: ${tpoUser.id})`);

  // Ensure TPO Profile exists
  await prisma.profile.upsert({
    where: { userId: tpoUser.id },
    update: { fullName: "TPO Officer DTU" },
    create: {
      userId: tpoUser.id,
      fullName: "TPO Officer DTU",
    },
  });

  // 2. Create or Update Recruiter User
  const recruiterUser = await prisma.user.upsert({
    where: { email: "recruiter@seed.dev" },
    update: {
      username: "recruiter_admin",
      password: passwordHash,
      primaryRole: "RECRUITER",
    },
    create: {
      email: "recruiter@seed.dev",
      username: "recruiter_admin",
      password: passwordHash,
      primaryRole: "RECRUITER",
      status: "ACTIVE",
    },
  });
  console.log(`   ✅ Recruiter User seeded: ${recruiterUser.email} (id: ${recruiterUser.id})`);

  // Ensure Recruiter Profile exists
  await prisma.profile.upsert({
    where: { userId: recruiterUser.id },
    update: { fullName: "Google Lead Recruiter" },
    create: {
      userId: recruiterUser.id,
      fullName: "Google Lead Recruiter",
    },
  });

  // 3. Link TPO User to DTU College
  const college = await prisma.college.findFirst({
    where: { normalizedKey: "dtu" },
  });

  if (college) {
    await prisma.college.update({
      where: { id: college.id },
      data: { tpoUserId: tpoUser.id },
    });
    console.log(`   ✅ TPO User linked to College: ${college.name}`);
  } else {
    console.warn("   ⚠️ College DTU not found, please run seedColleges first!");
  }

  // 4. Create/Get Company & Link Recruiter as CompanyAdmin
  const company = await prisma.company.upsert({
    where: { slug: "google" },
    update: { verified: true },
    create: {
      name: "Google",
      slug: "google",
      industry: "Technology",
      verified: true,
    },
  });
  console.log(`   ✅ Company Google ensured (id: ${company.id})`);

  // Create CompanyAdmin record
  await prisma.companyAdmin.upsert({
    where: {
      userId_companyId_officeCity: {
        userId: recruiterUser.id,
        companyId: company.id,
        officeCity: "Mountain View",
      },
    },
    update: {},
    create: {
      userId: recruiterUser.id,
      companyId: company.id,
      officeCity: "Mountain View",
      grantedById: recruiterUser.id, // Grant to self for testing
    },
  });
  console.log(`   ✅ Recruiter linked as CompanyAdmin for Google`);

  // 5. Create a Mock Job for Google posted by Recruiter
  const job = await prisma.job.upsert({
    where: { slug: "google-backend-engineer-staging" },
    update: {
      postedById: recruiterUser.id,
      status: "OPEN",
    },
    create: {
      title: "Backend Engineer",
      slug: "google-backend-engineer-staging",
      description: "We are looking for a Senior Node.js and PostgreSQL backend engineer.",
      requirements: "Node.js, TypeScript, Postgres, Redis",
      responsibilities: "Design secure backend systems, implement API endpoints.",
      status: "OPEN",
      type: "FULL_TIME",
      companyId: company.id,
      postedById: recruiterUser.id,
    },
  });
  console.log(`   ✅ Mock Job seeded: ${job.title} (slug: ${job.slug})`);

  // 6. Find a seeded student candidate to create a JobApplication
  const student = await prisma.user.findFirst({
    where: { email: "aarav.sharma@seed.dev" },
  });

  if (student) {
    // Create JobApplication if it doesn't exist
    const existingApp = await prisma.jobApplication.findFirst({
      where: {
        jobId: job.id,
        applicantId: student.id,
      },
    });

    if (!existingApp) {
      await prisma.jobApplication.create({
        data: {
          jobId: job.id,
          applicantId: student.id,
          status: "APPLIED",
          coverLetter: "I would love to join Google as a backend engineer. I have experience with React, Node.js and Postgres.",
        },
      });
      console.log(`   ✅ Mock JobApplication created for student: ${student.email}`);
    } else {
      console.log("   ℹ️ Mock JobApplication already exists");
    }
  } else {
    console.warn("   ⚠️ Student candidate aarav.sharma@seed.dev not found. Please run seedUsersResdex first!");
  }

  console.log("🎉 Staging Sandbox specific test data seeded successfully!");
}

main()
  .catch((error) => {
    console.error("❌ Sandbox seeding failed:", error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
