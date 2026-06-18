import { UserStatus } from "@prisma/client";
import prisma from "shared/database/prisma";
import elasticClient from "./elasticClient";

/**
 * Synchronizes a user's profile and resume search index (Resdex) to Elasticsearch.
 * Fetches the user, profile, education history, experience history, and verified skills.
 * Computes experience years, highest CGPA, and latest graduation year.
 * Fail-soft: Logs errors but does not block the main process execution.
 */
export function syncUserToResdex(userId: string): void {
  prisma.user
    .findUnique({
      where: { id: userId },
      include: {
        profile: true,
        skills: {
          where: { verified: true },
          include: { skill: { select: { name: true } } },
        },
        experiences: {
          include: { company: { select: { name: true } } },
        },
        educations: {
          include: { college: { select: { name: true } } },
        },
      },
    })
    .then(async (user) => {
      if (!user) {
        console.warn(`[Resdex Sync] User with ID '${userId}' not found. Skipping sync.`);
        return;
      }

      // Check if user is inactive or banned
      if (user.status === UserStatus.BANNED || user.status === UserStatus.INACTIVE) {
        try {
          await elasticClient.delete({
            index: "users_resdex",
            id: user.id,
          });
          console.log(`[Resdex Sync] Removed inactive/banned user '${user.id}' from Elasticsearch resdex index.`);
        } catch (delErr: any) {
          if (delErr?.meta?.statusCode !== 404) {
            console.error(`[Resdex Sync] Failed to delete user '${user.id}' from ES resdex:`, delErr?.message || delErr);
          }
        }
        return;
      }

      const profile = user.profile;
      
      // Calculate total experience years dynamically
      let totalExpMs = 0;
      if (user.experiences && user.experiences.length > 0) {
        for (const exp of user.experiences) {
          const start = new Date(exp.startDate).getTime();
          const end = exp.endDate ? new Date(exp.endDate).getTime() : Date.now();
          if (!isNaN(start) && !isNaN(end) && end >= start) {
            totalExpMs += (end - start);
          }
        }
      }
      // Convert ms to years and round to nearest integer
      const experienceYears = Math.round(totalExpMs / (365.25 * 24 * 60 * 60 * 1000));

      // Extract highest CGPA and latest graduation year (highest endYear) from educations
      let cgpa = 0.0;
      let graduationYear = profile?.graduationYear || null;

      if (user.educations && user.educations.length > 0) {
        for (const edu of user.educations) {
          if (edu.cgpa !== null && edu.cgpa !== undefined && edu.cgpa > cgpa) {
            cgpa = edu.cgpa;
          }
          if (edu.endYear !== null && edu.endYear !== undefined) {
            if (graduationYear === null || edu.endYear > graduationYear) {
              graduationYear = edu.endYear;
            }
          }
        }
      }

      // Format education college names
      const education = (user.educations || []).map((edu) => ({
        collegeName: edu.college?.name || edu.customCollegeName || "Unknown College",
      }));

      // Format experience company names
      const experience = (user.experiences || []).map((exp) => ({
        companyName: exp.company?.name || exp.companyName || "Unknown Company",
      }));

      // Gather verified skills as string array
      const verified_skills = (user.skills || [])
        .map((us) => us.skill?.name)
        .filter((name): name is string => typeof name === "string");

      const doc = {
        fullName: profile?.fullName || user.username,
        about: profile?.bio || "",
        education,
        experience,
        verified_skills,
        cgpa,
        graduationYear,
        experienceYears,
      };

      await elasticClient.index({
        index: "users_resdex",
        id: user.id,
        document: doc,
      });

      console.log(`[Resdex Sync] Successfully synced candidate profile for '${doc.fullName}' (${user.id}) to Elasticsearch.`);
    })
    .catch((error) => {
      console.error(`[Resdex Sync] Failed to sync candidate profile '${userId}' to Elasticsearch:`, error?.message || error);
    });
}
