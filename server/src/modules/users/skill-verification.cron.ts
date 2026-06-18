import cron from "node-cron";
import prisma from "shared/database/prisma";
import { verifyUserSkills } from "./skill-verification.service";

export const startSkillVerificationCron = () => {
  //
  // Every day at midnight (0 0 * * *)
  //
  cron.schedule(
    "0 0 * * *",
    async () => {
      console.log("[Skill Verification Cron] Starting periodic skill verification...");

      try {
        // Query users with at least one unverified skill and a linked GitHub profile URL
        const users = await prisma.user.findMany({
          where: {
            skills: {
              some: {
                verified: false,
              },
            },
            profile: {
              githubUrl: {
                not: null,
                notIn: [""],
              },
            },
          },
          select: {
            id: true,
          },
        });

        console.log(`[Skill Verification Cron] Found ${users.length} users with self-claimed skills to verify.`);

        for (const user of users) {
          try {
            console.log(`[Skill Verification Cron] Starting verification for user ID: ${user.id}`);
            const result = await verifyUserSkills(user.id);
            console.log(`[Skill Verification Cron] User ${user.id}: ${result.message}`);
            
            // Wait 2 seconds to avoid rate limiting bursts
            await new Promise((resolve) => setTimeout(resolve, 2000));
          } catch (err: any) {
            console.error(`[Skill Verification Cron] Error verifying user ${user.id}:`, err.message);
          }
        }

        console.log("[Skill Verification Cron] Completed periodic skill verification.");
      } catch (error) {
        console.error("[Skill Verification Cron] Periodic execution failed:", error);
      }
    }
  );
};
