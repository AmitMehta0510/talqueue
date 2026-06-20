import prisma from "./prisma";

export async function ensureRolesExist() {
  try {
    const roleCount = await prisma.role.count();
    if (roleCount === 0) {
      console.log("[Startup] Role table is empty. Running auto-seed for default roles...");
      const roles = [
        "STUDENT",
        "PROFESSOR",
        "PROFESSIONAL",
        "RECRUITER",
        "ADMIN",
        "SUPER_ADMIN",
        "PLATFORM_ADMIN",
        "COLLEGE_ADMIN",
        "COLLEGE_DIRECTOR",
        "COMPANY_ADMIN",
      ];
      for (const role of roles) {
        await prisma.role.upsert({
          where: { name: role },
          update: {},
          create: { name: role },
        });
      }
      console.log("[Startup] Auto-seeded default roles successfully.");
    }
  } catch (error) {
    console.error("[Startup] Failed to check/seed default roles:", error);
  }
}
