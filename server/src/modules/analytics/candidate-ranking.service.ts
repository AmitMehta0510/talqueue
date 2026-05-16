import prisma from "shared/database/prisma";

import AppError from "shared/errors/AppError";

export const calculateCandidateFitScore =  async (
    candidateUserId: string,
    jobId: string
  ) => {

    //
    // Fetch candidate
    //
    const candidate =
      await prisma.user.findUnique({
        where: {
          id: candidateUserId,
        },

        include: {

          skills: {
            include: {
              skill: true,
            },
          },

          experiences: true,

          projectMemberships: {
            include: {
              project: true,
            },
          },

          activities: {
            orderBy: {
              createdAt: "desc",
            },

            take: 20,
          },
        },
      });

    if (!candidate) {
      throw new AppError(
        "Candidate not found",
        404
      );
    }

    //
    // Fetch job
    //
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

    //
    // REQUIRED SKILLS
    //
    const requiredSkills =
      (
        job.skillsRequired ||
        []
      ).map(
        (skill: string) =>
          skill.toLowerCase()
      );

    //
    // USER SKILLS
    //
    const userSkills =
      candidate.skills.map(
        (skill) =>
          skill.skill.name.toLowerCase()
      );

    //
    // MATCHED SKILLS
    //
    const matchedSkills =
      requiredSkills.filter(
        (skill: string) =>
          userSkills.includes(skill)
      );

    //
    // MISSING SKILLS
    //
    const missingSkills =
      requiredSkills.filter(
        (skill: string) =>
          !userSkills.includes(skill)
      );

    //
    // SKILLS SCORE
    //
    const skillsScore =
      requiredSkills.length > 0
        ? (
            matchedSkills.length /
            requiredSkills.length
          ) * 100
        : 0;

    //
    // EXPERIENCE SCORE
    //
    let experienceScore = 0;

    const verifiedExperiences =
      candidate.experiences.filter(
        (experience) =>
          experience.verified
      );

    experienceScore +=
      verifiedExperiences.length * 20;

    if (
      candidate.experiences.some(
        (experience) =>
          experience.isCurrent
      )
    ) {
      experienceScore += 20;
    }

    experienceScore =
      Math.min(
        experienceScore,
        100
      );

    //
    // PROJECT SCORE
    //
    const projects =
      candidate.projectMemberships.map(
        (membership) =>
          membership.project
      );

    const projectScore =
      projects.length > 0
        ? projects.reduce(
            (acc, project) =>
              acc +
              (
                project.engineeringScore ||
                0
              ),

            0
          ) / projects.length
        : 0;

    //
    // GITHUB SCORE
    //
    let githubScore = 0;

    for (const project of projects) {

      githubScore +=
        Math.min(
          project.starsCount *
            0.5,
          20
        );

      githubScore +=
        Math.min(
          project.commitCount *
            0.03,
          20
        );

      if (
        project.repoUpdatedAt
      ) {

        const diffDays =
          Math.floor(
            (
              Date.now() -
              new Date(
                project.repoUpdatedAt
              ).getTime()
            ) /
              (
                1000 *
                60 *
                60 *
                24
              )
          );

        if (diffDays <= 30) {
          githubScore += 10;
        }
      }
    }

    githubScore =
      Math.min(
        githubScore,
        100
      );

    //
    // TRUST SCORE
    //
    const trustMap = {
      BEGINNER: 20,
      EMERGING: 40,
      VERIFIED: 60,
      ADVANCED: 80,
      ELITE: 100,
    };

    const trustScore =
      trustMap[
        candidate.trustLevel
      ];

    //
    // HACKATHON SCORE
    //
    const hackathonWins =
      await prisma.hackathonWinner.count({
        where: {
          team: {
            members: {
              some: {
                userId:
                  candidateUserId,
              },
            },
          },
        },
      });

    const hackathonScore =
      Math.min(
        hackathonWins * 25,
        100
      );

    //
    // ACTIVITY SCORE
    //
    const recentActivities =
      candidate.activities.length;

    const activityScore =
      Math.min(
        recentActivities * 5,
        100
      );

    //
    // FINAL SCORE
    //
    const overallScore =
      (
        skillsScore * 0.30 +
        experienceScore * 0.15 +
        projectScore * 0.20 +
        githubScore * 0.10 +
        trustScore * 0.10 +
        hackathonScore * 0.10 +
        activityScore * 0.05
      );

    //
    // Strengths
    //
    const strengths = [];

    if (skillsScore >= 70) {
      strengths.push(
        "Strong skill match"
      );
    }

    if (projectScore >= 70) {
      strengths.push(
        "Strong engineering projects"
      );
    }

    if (trustScore >= 80) {
      strengths.push(
        "Highly trusted engineer"
      );
    }

    //
    // Weaknesses
    //
    const weaknesses = [];

    if (missingSkills.length > 0) {
      weaknesses.push(
        "Missing required skills"
      );
    }

    if (githubScore < 40) {
      weaknesses.push(
        "Weak GitHub activity"
      );
    }

    return {
      overallScore:
        Math.round(
          overallScore
        ),

      breakdown: {
        skillsScore:
          Math.round(
            skillsScore
          ),

        experienceScore:
          Math.round(
            experienceScore
          ),

        projectScore:
          Math.round(
            projectScore
          ),

        githubScore:
          Math.round(
            githubScore
          ),

        trustScore,

        hackathonScore,

        activityScore,
      },

      matchedSkills,

      missingSkills,

      strengths,

      weaknesses,

      recommendation:
        overallScore >= 80
          ? "Highly Recommended"
          : overallScore >= 60
          ? "Recommended"
          : "Needs Improvement",
    };
  };

export const rankJobCandidates =  async (
    recruiterId: string,
    jobId: string
  ) => {

    //
    // Fetch job
    //
    const job =  await prisma.job.findUnique({
        where: {
          id: jobId,
        },

        include: {
          applications: {
            include: {
              applicant: {
                include: {
                  profile: true,
                },
              },
            },
          },
        },
      });

    if (!job) {
      throw new AppError(
        "Job not found",
        404
      );
    }

    //
    // Authorization
    //
    if (
      job.postedById !==
      recruiterId
    ) {
      throw new AppError(
        "Unauthorized",
        403
      );
    }

    //
    // Rank candidates
    //
    const rankedCandidates =  await Promise.all(
        job.applications.map(
          async (
            application
          ) => {

            const fitAnalysis =
              await calculateCandidateFitScore(
                application.applicantId,
                jobId
              );

              const recruiterInsights =
  await generateRecruiterInsights(
    application.applicantId
  );

            return {

              applicationId:
                application.id,

              candidate: {
                id:
                  application
                    .applicant
                    .id,

                username:
                  application
                    .applicant
                    .username,

                profile:
                  application
                    .applicant
                    .profile,
              },

              applicationStatus:
                application.status,

              fitAnalysis,
              recruiterInsights,
            };
          }
        )
      );

    //
    // Sort descending
    //
    rankedCandidates.sort(
      (a, b) =>
        b.fitAnalysis
          .overallScore -
        a.fitAnalysis
          .overallScore
    );

    //
    // Rank positions
    //
    return rankedCandidates.map(
      (
        candidate,
        index
      ) => ({
        rank:
          index + 1,

        ...candidate,
      })
    );
  };  

export const generateRecruiterInsights =  async (
    candidateUserId: string
  ) => {

    //
    // User
    //
    const user =
      await prisma.user.findUnique({
        where: {
          id: candidateUserId,
        },

        include: {

          activities: true,

          projectMemberships: {
            include: {
              project: true,
            },
          },

          experiences: true,
        },
      });

    if (!user) {
      return null;
    }

    //
    // Projects
    //
    const projects =
      user.projectMemberships.map(
        (membership) =>
          membership.project
      );

    //
    // Verified projects
    //
    const verifiedProjects =
      projects.filter(
        (project) =>
          project.verified
      ).length;

    //
    // GitHub strength
    //
    let githubStrength = 0;

    for (const project of projects) {

      githubStrength +=
        Math.min(
          project.commitCount *
            0.03,
          25
        );

      githubStrength +=
        Math.min(
          project.starsCount *
            0.5,
          25
        );

      githubStrength +=
        Math.min(
          project.forksCount *
            0.3,
          15
        );

      //
      // Freshness
      //
      if (
        project.repoUpdatedAt
      ) {

        const diffDays =
          Math.floor(
            (
              Date.now() -
              new Date(
                project.repoUpdatedAt
              ).getTime()
            ) /
              (
                1000 *
                60 *
                60 *
                24
              )
          );

        if (diffDays <= 30) {
          githubStrength += 10;
        }
      }
    }

    githubStrength =
      Math.min(
        Math.round(
          githubStrength
        ),
        100
      );

    //
    // Engineering consistency
    //
    const recentActivities =
      user.activities.filter(
        (activity) => {

          const diffDays =
            Math.floor(
              (
                Date.now() -
                new Date(
                  activity.createdAt
                ).getTime()
              ) /
                (
                  1000 *
                  60 *
                  60 *
                  24
                )
            );

          return diffDays <= 30;
        }
      );

    const engineeringConsistency =
      Math.min(
        recentActivities.length *
          5,
        100
      );

    //
    // Open source strength
    //
    const publicProjects =
      projects.filter(
        (project) =>
          project.repoVisibility ===
          "PUBLIC"
      );

    let openSourceStrength =
      publicProjects.length * 10;

    openSourceStrength +=
      publicProjects.reduce(
        (
          acc,
          project
        ) =>
          acc +
          Math.min(
            project.contributorsCount *
              2,
            10
          ),

        0
      );

    openSourceStrength =
      Math.min(
        openSourceStrength,
        100
      );

    //
    // Collaboration score
    //
    const collaborationProjects =
      projects.filter(
        (project) =>
          project.contributorsCount >=
          2
      );

    const collaborationScore =
      Math.min(
        collaborationProjects.length *
          15,
        100
      );

    //
    // Hiring readiness
    //
    let hiringReadiness =
      "LOW";

    if (
      user.trustLevel ===
        "ADVANCED" ||
      user.trustLevel ===
        "ELITE"
    ) {
      hiringReadiness =
        "HIGH";
    } else if (
      verifiedProjects >= 1
    ) {
      hiringReadiness =
        "MEDIUM";
    }

    return {

      trustLevel:
        user.trustLevel,

      verifiedProjects,

      githubStrength,

      engineeringConsistency,

      openSourceStrength,

      collaborationScore,

      hiringReadiness,
    };
  };  