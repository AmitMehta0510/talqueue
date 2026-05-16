import prisma from "shared/database/prisma";

import AppError from "shared/errors/AppError";

import {
  rankJobCandidates,
} from "../analytics/candidate-ranking.service";

import {
  getFastestGrowingEngineers,
} from "../analytics/leaderboard.service";

export const getRecruiterDashboard =  async (
    recruiterId: string
  ) => {

    //
    // Recruiter
    //
    const recruiter =
      await prisma.user.findUnique({
        where: {
          id: recruiterId,
        },

        include: {
          profile: true,
        },
      });

    if (!recruiter) {
      throw new AppError(
        "Recruiter not found",
        404
      );
    }

    //
    // Jobs
    //
    const jobs =
      await prisma.job.findMany({

        where: {
          postedById:
            recruiterId,
        },

        include: {

          applications: true,
        },

        orderBy: {
          createdAt:
            "desc",
        },
      });

    //
    // Analytics
    //
    let totalApplications = 0;

    let totalShortlisted = 0;

    let totalInterviews = 0;

    let totalHired = 0;

    for (const job of jobs) {

      totalApplications +=
        job.applications.length;

      totalShortlisted +=
        job.applications.filter(
          (
            application
          ) =>
            application.status ===
            "SHORTLISTED"
        ).length;

      totalInterviews +=
        job.applications.filter(
          (
            application
          ) =>
            application.status ===
            "INTERVIEW"
        ).length;

      totalHired +=
        job.applications.filter(
          (
            application
          ) =>
            application.status ===
            "HIRED"
        ).length;
    }

    //
    // Candidate ranking
    //
    const rankedCandidates =
      [];

    for (const job of jobs) {

      const ranked =
        await rankJobCandidates(
          recruiterId,
          job.id
        );

      rankedCandidates.push(
        ...ranked
      );
    }

    //
    // Remove duplicates
    //
    const uniqueCandidates =
      new Map();

    for (
      const candidate of
      rankedCandidates
    ) {

      const existing =
        uniqueCandidates.get(
          candidate.candidate.id
        );

      if (
        !existing ||
        candidate.fitAnalysis
          .overallScore >
          existing.fitAnalysis
            .overallScore
      ) {

        uniqueCandidates.set(
          candidate.candidate.id,
          candidate
        );
      }
    }

    //
    // Final top candidates
    //
    const topCandidates =
      Array.from(
        uniqueCandidates.values()
      )
        .sort(
          (a, b) =>
            b.fitAnalysis
              .overallScore -
            a.fitAnalysis
              .overallScore
        )
        .slice(0, 10);

    //
    // Average candidate score
    //
    const averageCandidateScore =
      topCandidates.length > 0
        ? topCandidates.reduce(
            (
              acc,
              candidate
            ) =>
              acc +
              candidate
                .fitAnalysis
                .overallScore,

            0
          ) /
          topCandidates.length
        : 0;

    //
    // Most demanded skills
    //
    const skillMap =
      new Map();

    for (const job of jobs) {

      for (
        const skill of
        (
          job.skillsRequired ||
          []
        )
      ) {

        const count =
          skillMap.get(
            skill
          ) || 0;

        skillMap.set(
          skill,
          count + 1
        );
      }
    }

    const mostDemandedSkills =
      Array.from(
        skillMap.entries()
      )
        .sort(
          (a, b) =>
            b[1] - a[1]
        )
        .slice(0, 5)
        .map(
          (
            [skill]
          ) => skill
        );

    //
    // Fastest growing engineers
    //
    const fastestGrowingEngineers =
      await getFastestGrowingEngineers(
        5
      );

    return {

      recruiter: {
        id:
          recruiter.id,

        username:
          recruiter.username,

        profile:
          recruiter.profile,
      },

      analytics: {

        totalJobs:
          jobs.length,

        totalApplications,

        totalShortlisted,

        totalInterviews,

        totalHired,

        averageCandidateScore:
          Math.round(
            averageCandidateScore
          ),
      },

      jobs: jobs.map(
        (job) => ({

          id:
            job.id,

          title:
            job.title,

          applicationsCount:
            job.applications
              .length,

          shortlistedCount:
            job.applications.filter(
              (
                application
              ) =>
                application.status ===
                "SHORTLISTED"
            ).length,

          hiredCount:
            job.applications.filter(
              (
                application
              ) =>
                application.status ===
                "HIRED"
            ).length,
        })
      ),

      topCandidates,

      fastestGrowingEngineers,

      hiringInsights: {

        mostDemandedSkills,

        verifiedCandidatePreference:
          "Candidates with verified projects rank significantly higher",

        strongestSignal:
          "Engineering score strongly correlates with recruiter shortlisting",
      },

      recommendations: [

        "Prioritize verified engineers for faster hiring",

        "Candidates with live deployments perform better in interviews",

        "Hackathon winners show strong execution ability",
      ],
    };
  };