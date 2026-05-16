import prisma from "shared/database/prisma";

import AppError from "shared/errors/AppError";
import { calculateJobRecommendationScore } from "./recommendation-engine.service";


export const toggleSaveJob =  async (
    userId: string,
    jobId: string
  ) => {

    const job =
      await prisma.job.findUnique({
        where: {
          id: jobId,
        },
      });

    if (!job) {
      throw new AppError(
        "Job not found",
        404
      );
    }

    const existingSave =
      await prisma.savedJob.findUnique({
        where: {
          userId_jobId: {
            userId,
            jobId,
          },
        },
      });

    // Unsave
    if (existingSave) {

      await prisma.savedJob.delete({
        where: {
          id: existingSave.id,
        },
      });

      return {
        saved: false,
      };
    }

    // Save
    await prisma.savedJob.create({
      data: {
        userId,
        jobId,
      },
    });

    return {
      saved: true,
    };
  };

export const getSavedJobs =  async (userId: string) => {

    return prisma.savedJob.findMany({
      where: {
        userId,
      },

      include: {
        job: {
          include: {
            company: true,
          },
        },
      },

      orderBy: {
        createdAt: "desc",
      },
    });
  };

export const getRecommendedJobs =  async (
    userId: string
  ) => {

    //
    // Jobs
    //
    const jobs =
      await prisma.job.findMany({

        where: {
          status: "OPEN",
        },

        include: {
          company: true,
        },

        take: 200,
      });

    //
    // Rank jobs
    //
    const ranked =
      await Promise.all(

        jobs.map(
          async (job) => {

            const recommendationScore =
              await calculateJobRecommendationScore(
                userId,
                job
              );

            return {

              ...job,

              recommendationScore,
            };
          }
        )
      );

    //
    // Sort
    //
    ranked.sort(
      (a, b) =>
        b.recommendationScore -
        a.recommendationScore
    );

    return ranked.slice(
      0,
      20
    );
  };

export const getTrendingJobs =  async () => {

    const jobs =
      await prisma.job.findMany({

        where: {
          status: "OPEN",
        },

        include: {

          company: true,

          _count: {
            select: {
              applications: true,
              savedBy: true,
            },
          },
        },

        take: 100,
      });

    const ranked =
      jobs.map(
        (job) => {

          let score = 0;

          //
          // Applications
          //
          score +=
            job._count
              .applications * 5;

          //
          // Saves
          //
          score +=
            job._count
              .savedBy * 8;

          //
          // Views
          //
          score +=
            job.views * 0.2;

          //
          // Featured
          //
          if (job.featured) {
            score += 50;
          }

          //
          // Freshness
          //
          const diffDays =
            Math.floor(
              (
                Date.now() -
                new Date(
                  job.createdAt
                ).getTime()
              ) /
                (
                  1000 *
                  60 *
                  60 *
                  24
                )
            );

          if (diffDays <= 7) {
            score += 40;
          }

          if (diffDays <= 30) {
            score += 20;
          }

          return {

            ...job,

            trendingScore:
              Math.round(
                score
              ),
          };
        }
      );

    ranked.sort(
      (a, b) =>
        b.trendingScore -
        a.trendingScore
    );

    return ranked.slice(
      0,
      15
    );
  };

export const getInternshipRecommendations =  async (
    userId: string) => {

    //
    // User
    //
    const user =
      await prisma.user.findUnique({

        where: {
          id: userId,
        },

        include: {

          skills: {
            include: {
              skill: true,
            },
          },

          projectMemberships: {
            include: {
              project: true,
            },
          },
        },
      });

    if (!user) {
      return [];
    }

    const userSkills =
      user.skills.map(
        (s) =>
          s.skill.name
            .toLowerCase()
      );

    //
    // Internship jobs
    //
    const jobs =
      await prisma.job.findMany({

        where: {
          type: "INTERNSHIP",

          status: "OPEN",
        },

        include: {
          company: true,
        },

        take: 100,
      });

    //
    // Ranking
    //
    const ranked =
      jobs.map(
        (job) => {

          let score = 0;

          //
          // Skill overlap
          //
          const matchedSkills =
            (
              job.skillsRequired ||
              []
            ).filter(
              (
                skill: string
              ) =>
                userSkills.includes(
                  skill.toLowerCase()
                )
            );

          score +=
            matchedSkills.length *
            20;

          //
          // Engineering score
          //
          score +=
            user.engineeringScore *
            0.05;

          //
          // Verified projects
          //
          const verifiedProjects =
            user.projectMemberships.filter(
              (
                membership
              ) =>
                membership.project
                  .verified
            ).length;

          score +=
            verifiedProjects * 25;

          //
          // Hackathon potential
          //
          if (
            user.trustLevel ===
            "EMERGING"
          ) {
            score += 20;
          }

          return {

            ...job,

            recommendationScore:
              Math.round(
                score
              ),
          };
        }
      );

    ranked.sort(
      (a, b) =>
        b.recommendationScore -
        a.recommendationScore
    );

    return ranked.slice(
      0,
      20
    );
  };