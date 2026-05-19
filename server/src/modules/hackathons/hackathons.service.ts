import prisma from "shared/database/prisma";
import { Prisma } from "@prisma/client";

import AppError from "shared/errors/AppError";

import { createNotification } from "modules/notificatios/notifications.service";
import {
  addReputation,
  addTeamReputation,
  rewardTeamMembers,
  awardBadge,
} from "modules/reputation/reputation.service";

import { createActivity } from "modules/activities/activity.service";
import { calculateEngineeringScore } from "modules/reputation/engineering-score.service";
import { calculateTrustLevel } from "modules/engineering/engineering-trust.service";
import { calculateUserAffinity } from "modules/affinity/affinity.service";
import { trackInteraction } from "modules/interaction/interaction-tracking.service";

import slugify from "slugify";

export const createHackathon = async (userId: string, data: any) => {
  const slug = slugify(data.title, {
    lower: true,
    strict: true,
    trim: true,
  });

  const hackathon = await prisma.hackathon.create({
    data: {
      title: data.title,

      slug,

      shortDescription: data.shortDescription,

      description: data.description,

      bannerUrl: data.bannerUrl,

      logoUrl: data.logoUrl,

      startDate: new Date(data.startDate),

      endDate: new Date(data.endDate),

      registrationDeadline: new Date(data.registrationDeadline),

      maxTeamSize: data.maxTeamSize,

      tracks: data.tracks,

      rules: data.rules,

      prizes: data.prizes,

      judgingCriteria: data.judgingCriteria,

      organizerName: data.organizerName,

      organizerWebsite: data.organizerWebsite,

      organizerType: data.organizerType,

      sponsorName: data.sponsorName,

      sponsorWebsite: data.sponsorWebsite,

      mode: data.mode,

      location: data.location,

      isExternal: Boolean(data.isExternal),

      sourcePlatform: data.sourcePlatform,

      externalUrl: data.externalUrl,

      status: data.status || "DRAFT",

      createdById: userId,
    },

    include: {
      createdBy: {
        include: {
          profile: true,
        },
      },
    },
  });

  // Non-blocking side effects
  void Promise.all([
    addReputation(userId, "HACKATHON_CREATED", 10, "Created a hackathon", {
      hackathonId: hackathon.id,
    }),

    createActivity(
      userId,
      "HACKATHON_CREATED",
      "Created a hackathon",
      `Created hackathon "${hackathon.title}"`,
      {
        hackathonId: hackathon.id,
      },
    ),
  ]).catch(console.error);

  return hackathon;
};

const DAY_MS = 1000 * 60 * 60 * 24;

const calculateHackathonRankingScore = (hackathon: any) => {
  let score = 0;

  if (hackathon.verified) {
    score += 100;
  }

  if (hackathon.featured) {
    score += 60;
  }

  if (hackathon.isExternal) {
    score += 40;
  }

  score += hackathon._count.registrations * 2;

  score += hackathon._count.submissions * 5;

  score += hackathon._count.judges * 10;

  score += hackathon._count.winners * 15;

  const daysOld = Math.floor(
    (Date.now() - new Date(hackathon.createdAt).getTime()) / DAY_MS,
  );

  score += Math.max(30 - daysOld, 0);

  switch (hackathon.status) {
    case "LIVE":
      score += 50;
      break;

    case "COMPLETED":
      score += 30;
      break;

    case "ARCHIVED":
      score -= 20;
      break;
  }

  return score;
};

export const getHackathons = async () => {
  const hackathons = await prisma.hackathon.findMany({
    where: {
      deletedAt: null,

      NOT: {
        status: "DELETED",
      },
    },

    include: {
      _count: {
        select: {
          registrations: true,
          submissions: true,
          judges: true,
          winners: true,
        },
      },

      createdBy: {
        include: {
          profile: true,
        },
      },
    },

    take: 100,
  });

  return hackathons
    .map((hackathon) => ({
      ...hackathon,

      rankingScore: calculateHackathonRankingScore(hackathon),
    }))
    .sort((a, b) => b.rankingScore - a.rankingScore)
    .slice(0, 50);
};

export const getHackathonById = async (
  userId: string | undefined,
  hackathonId: string,
) => {
  const hackathon = await prisma.hackathon.findUnique({
    where: {
      id: hackathonId,
    },
    include: {
      createdBy: {
        include: {
          profile: true,
        },
      },
      _count: {
        select: {
          registrations: true,
          submissions: true,
          judges: true,
          winners: true,
        },
      },
    },
  });

  if (!hackathon) {
    throw new AppError("Hackathon not found", 404);
  }

  const [registrations, submissions, judges, winners] = await Promise.all([
    prisma.hackathonRegistration.findMany({
      where: {
        hackathonId,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 50,
      select: {
        id: true,
        status: true,
        createdAt: true,
        team: {
          select: {
            id: true,
            name: true,
            reputationScore: true,
            completedProjectsCount: true,
            members: {
              select: {
                role: true,
                user: {
                  select: {
                    id: true,
                    username: true,
                    profile: {
                      select: {
                        fullName: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    }),

    prisma.hackathonSubmission.findMany({
      where: {
        hackathonId,
      },
      orderBy: [
        {
          engineeringScore: "desc",
        },
        {
          submittedAt: "desc",
        },
      ],
      take: 100,
      select: {
        id: true,
        githubUrl: true,
        demoUrl: true,
        videoUrl: true,
        presentationUrl: true,
        description: true,
        techStack: true,
        status: true,
        score: true,
        finalScore: true,
        engineeringScore: true,
        verifiedProject: true,
        submittedAt: true,
        reviewedAt: true,
        project: {
          select: {
            id: true,
            title: true,
            verified: true,
            status: true,
            contributorsCount: true,
            deploymentStatus: true,
            owner: {
              select: {
                id: true,
                username: true,
                profile: {
                  select: {
                    fullName: true,
                  },
                },
              },
            },
            members: {
              select: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    profile: {
                      select: {
                        fullName: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        team: {
          select: {
            id: true,
            name: true,
            reputationScore: true,
            completedProjectsCount: true,
          },
        },
        evaluations: {
          select: {
            id: true,
            judge: {
              select: {
                id: true,
                user: {
                  select: {
                    id: true,
                    username: true,
                    profile: {
                      select: {
                        fullName: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        winners: {
          select: {
            id: true,
            position: true,
            score: true,
          },
        },
      },
    }),

    prisma.hackathonJudge.findMany({
      where: {
        hackathonId,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            profile: {
              select: {
                fullName: true,
              },
            },
          },
        },
      },
    }),

    prisma.hackathonWinner.findMany({
      where: {
        hackathonId,
      },
      orderBy: {
        position: "asc",
      },
      select: {
        id: true,
        position: true,
        score: true,
        submission: {
          select: {
            id: true,
            project: {
              select: {
                id: true,
                title: true,
              },
            },
            team: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    }),
  ]);

  // Non-blocking view increment
  prisma.hackathon
    .update({
      where: {
        id: hackathonId,
      },
      data: {
        viewCount: {
          increment: 1,
        },
      },
    })
    .catch(console.error);

  if (userId) {
    trackInteraction(userId, {
      targetId: hackathonId,
      targetType: "HACKATHON",
      interactionType: "VIEW",
    }).catch(console.error);
  }

  const totalEngineeringScore = submissions.reduce(
    (acc, submission) => acc + (submission.engineeringScore || 0),
    0,
  );

  const averageEngineeringScore =
    submissions.length > 0 ? totalEngineeringScore / submissions.length : 0;

  const verifiedSubmissionCount = submissions.filter(
    (submission) => submission.verifiedProject,
  ).length;

  return {
    ...hackathon,
    registrations,
    submissions,
    judges,
    winners,
    analytics: {
      averageEngineeringScore,
      verifiedSubmissionCount,
      totalProjects: submissions.length,
      totalTeams: hackathon._count.registrations,
      totalJudges: hackathon._count.judges,
      totalWinners: hackathon._count.winners,
    },
  };
};

export const registerTeamForHackathon = async (
  userId: string,
  hackathonId: string,
  teamId: string,
) => {
  const [hackathon, membership] = await Promise.all([
    prisma.hackathon.findUnique({
      where: {
        id: hackathonId,
      },

      select: {
        id: true,
        title: true,
        createdById: true,
        registrationDeadline: true,
        maxTeamSize: true,
        status: true,
      },
    }),

    prisma.teamMember.findFirst({
      where: {
        teamId,
        userId,
      },

      select: {
        id: true,
      },
    }),
  ]);

  if (!hackathon) {
    throw new AppError("Hackathon not found", 404);
  }

  if (!membership) {
    throw new AppError("Not a team member", 403);
  }

  if (hackathon.status === "DELETED" || hackathon.status === "ARCHIVED") {
    throw new AppError("Hackathon unavailable", 400);
  }

  if (new Date() > hackathon.registrationDeadline) {
    throw new AppError("Registration closed", 400);
  }

  const [team, existingRegistration] = await Promise.all([
    prisma.team.findUnique({
      where: {
        id: teamId,
      },

      include: {
        members: {
          select: {
            userId: true,
          },
        },

        projects: {
          select: {
            verified: true,
          },
        },

        _count: {
          select: {
            hackathonRegistrations: true,
          },
        },
      },
    }),

    prisma.hackathonRegistration.findUnique({
      where: {
        hackathonId_teamId: {
          hackathonId,
          teamId,
        },
      },

      select: {
        id: true,
      },
    }),
  ]);

  if (!team) {
    throw new AppError("Team not found", 404);
  }

  if (existingRegistration) {
    throw new AppError("Team already registered", 400);
  }

  if (team.members.length > hackathon.maxTeamSize) {
    throw new AppError("Team exceeds maximum allowed size", 400);
  }

  // Credibility score
  let credibilityScore = 0;

  credibilityScore += team.reputationScore || 0;

  credibilityScore += (team.completedProjectsCount || 0) * 20;

  credibilityScore +=
    team.projects.filter((project) => project.verified).length * 30;

  credibilityScore += team._count.hackathonRegistrations * 5;

  let rewardPoints = 5;

  if (credibilityScore >= 300) {
    rewardPoints = 20;
  } else if (credibilityScore >= 150) {
    rewardPoints = 15;
  } else if (credibilityScore >= 60) {
    rewardPoints = 10;
  }

  // Atomic registration + counter increment
  const [registration] = await prisma.$transaction([
    prisma.hackathonRegistration.create({
      data: {
        hackathonId,
        teamId,
      },
    }),

    prisma.hackathon.update({
      where: {
        id: hackathonId,
      },

      data: {
        registrationCount: {
          increment: 1,
        },
      },
    }),
  ]);

  // Background side effects
  void Promise.all([
    addTeamReputation(teamId, rewardPoints),

    rewardTeamMembers(
      teamId,
      "HACKATHON_REGISTERED",
      rewardPoints,
      "Registered for hackathon",
      {
        hackathonId,
      },
    ),

    ...team.members.map((member) =>
      createActivity(
        member.userId,
        "HACKATHON_REGISTERED",
        "Registered for hackathon",
        `Registered for "${hackathon.title}"`,
        {
          hackathonId,
        },
      ),
    ),

    createNotification({
      userId: hackathon.createdById,

      type: "SYSTEM",

      title: "New Hackathon Registration",

      message: `A new team registered for "${hackathon.title}"`,
    }),

    ...team.members.flatMap((member) => [
      calculateUserAffinity(member.userId, hackathon.createdById),

      calculateUserAffinity(hackathon.createdById, member.userId),
    ]),
  ]).catch(console.error);

  return registration;
};

export const submitProjectToHackathon = async (
  userId: string,
  hackathonId: string,
  data: any,
) => {
  const [team, project] = await Promise.all([
    prisma.team.findUnique({
      where: {
        id: data.teamId,
      },
      select: {
        id: true,
        reputationScore: true,
        completedProjectsCount: true,
        members: {
          select: {
            userId: true,
            role: true,
          },
        },
        projects: {
          where: {
            verified: true,
          },
          select: {
            id: true,
          },
        },
        _count: {
          select: {
            hackathonRegistrations: true,
          },
        },
        hackathonRegistrations: {
          where: {
            hackathonId,
          },
          select: {
            id: true,
            status: true,
            hackathon: {
              select: {
                id: true,
                title: true,
                createdById: true,
                registrationDeadline: true,
                maxTeamSize: true,
                status: true,
              },
            },
          },
        },
        hackathonSubmissions: {
          where: {
            hackathonId,
          },
          select: {
            id: true,
          },
        },
      },
    }),

    prisma.project.findUnique({
      where: {
        id: data.projectId,
      },
      select: {
        id: true,
        title: true,
        verified: true,
        githubUrl: true,
        liveUrl: true,
        videoDemoUrl: true,
        starsCount: true,
        contributorsCount: true,
        techStack: true,
        status: true,
        members: {
          select: {
            userId: true,
          },
        },
      },
    }),
  ]);

  if (!team) {
    throw new AppError("Team not found", 404);
  }

  const registration = team.hackathonRegistrations[0];
  const existingSubmission = team.hackathonSubmissions[0];
  const membership = team.members.some((member) => member.userId === userId);

  if (!registration) {
    throw new AppError("Team not registered", 400);
  }

  if (registration.status !== "APPROVED") {
    throw new AppError("Registration not approved", 400);
  }

  if (!membership) {
    throw new AppError("Not a team member", 403);
  }

  if (!project) {
    throw new AppError("Project not found", 404);
  }

  if (project.status === "DELETED") {
    throw new AppError("Deleted project cannot be submitted", 400);
  }

  if (!project.githubUrl) {
    throw new AppError("GitHub repository required", 400);
  }

  const teamMemberIds = new Set(team.members.map((m) => m.userId));

  const invalidMembers = project.members.filter(
    (member) => !teamMemberIds.has(member.userId),
  );

  if (invalidMembers.length > 0) {
    throw new AppError(
      "Some project members are not part of the submitting team.",
      400,
    );
  }

  // Engineering score
  let engineeringScore = 0;

  if (project.verified) {
    engineeringScore += 100;
  }

  if (project.liveUrl) {
    engineeringScore += 40;
  }

  if (project.videoDemoUrl) {
    engineeringScore += 20;
  }

  engineeringScore += Math.min(project.starsCount, 50);

  engineeringScore += project.contributorsCount * 5;

  let rewardPoints = 10;

  if (engineeringScore >= 150) {
    rewardPoints = 50;
  } else if (engineeringScore >= 80) {
    rewardPoints = 30;
  } else if (engineeringScore >= 40) {
    rewardPoints = 20;
  }

  let submission;

  if (existingSubmission) {
    submission = await prisma.hackathonSubmission.update({
      where: {
        id: existingSubmission.id,
      },

      data: {
        githubUrl: project.githubUrl,

        demoUrl: data.demoUrl || project.liveUrl,

        videoUrl: project.videoDemoUrl,

        presentationUrl: data.presentationUrl,

        description: data.description,

        techStack: project.techStack || undefined,

        projectId: data.projectId,

        verifiedProject: project.verified,

        engineeringScore,

        submittedAt: new Date(),
      },
    });
  } else {
    const [createdSubmission] = await prisma.$transaction([
      prisma.hackathonSubmission.create({
        data: {
          hackathonId,

          teamId: data.teamId,

          projectId: data.projectId,

          githubUrl: project.githubUrl,

          demoUrl: data.demoUrl || project.liveUrl,

          videoUrl: project.videoDemoUrl,

          presentationUrl: data.presentationUrl,

          description: data.description,

          techStack: project.techStack || undefined,

          verifiedProject: project.verified,

          engineeringScore,
        },
      }),

      prisma.hackathon.update({
        where: {
          id: hackathonId,
        },

        data: {
          submissionCount: {
            increment: 1,
          },
        },
      }),
    ]);

    submission = createdSubmission;

    void Promise.all([
      addTeamReputation(data.teamId, rewardPoints),

      rewardTeamMembers(
        data.teamId,
        "HACKATHON_SUBMISSION",
        rewardPoints,
        "Submitted hackathon project",
        {
          hackathonId,
          projectId: data.projectId,
        },
      ),

      ...team.members.map((member) =>
        createActivity(
          member.userId,
          "HACKATHON_SUBMITTED",
          "Submitted hackathon project",
          `Submitted "${project.title}" to "${registration.hackathon.title}"`,
          {
            hackathonId,
            projectId: data.projectId,
          },
        ),
      ),
    ]).catch(console.error);
  }

  const owner = team.members.find((member) => member.role === "OWNER");

  void Promise.all([
    createNotification({
      userId: registration.hackathon.createdById,

      type: "SYSTEM",

      title: "New Hackathon Submission",

      message: `A new project was submitted to "${registration.hackathon.title}"`,
    }),

    ...(owner && owner.userId !== userId
      ? [
          createNotification({
            userId: owner.userId,

            type: "SYSTEM",

            title: "Hackathon Submission Updated",

            message: "Your team's project was submitted",
          }),
        ]
      : []),

    ...team.members.flatMap((member) => [
      calculateUserAffinity(member.userId, registration.hackathon.createdById),

      calculateUserAffinity(registration.hackathon.createdById, member.userId),
    ]),

    ...project.members.map((member) =>
      calculateUserAffinity(userId, member.userId),
    ),
  ]).catch(console.error);

  return submission;
};

export const reviewRegistration = async (
  organizerId: string,
  registrationId: string,
  status: "APPROVED" | "REJECTED",
) => {
  const registration = await prisma.hackathonRegistration.findUnique({
    where: {
      id: registrationId,
    },

    include: {
      hackathon: {
        select: {
          id: true,
          title: true,
          createdById: true,
        },
      },

      team: {
        include: {
          members: {
            select: {
              userId: true,
            },
          },
        },
      },
    },
  });

  if (!registration) {
    throw new AppError("Registration not found", 404);
  }

  if (registration.hackathon.createdById !== organizerId) {
    throw new AppError("Unauthorized", 403);
  }

  if (registration.status !== "PENDING") {
    throw new AppError("Registration already reviewed", 400);
  }

  const updatedRegistration = await prisma.hackathonRegistration.update({
    where: {
      id: registrationId,
    },

    data: {
      status,

      reviewedAt: new Date(),
    },
  });

  const reputationDelta = status === "APPROVED" ? 10 : -2;

  void Promise.all([
    addTeamReputation(registration.teamId, reputationDelta),

    ...(status === "APPROVED"
      ? [
          rewardTeamMembers(
            registration.teamId,
            "HACKATHON_APPROVED",
            5,
            "Hackathon registration approved",
            {
              hackathonId: registration.hackathonId,
            },
          ),
        ]
      : []),

    ...registration.team.members.map((member) =>
      createActivity(
        member.userId,
        status === "APPROVED" ? "HACKATHON_APPROVED" : "HACKATHON_REJECTED",

        status === "APPROVED"
          ? "Hackathon registration approved"
          : "Hackathon registration rejected",

        status === "APPROVED"
          ? `Approved for "${registration.hackathon.title}"`
          : `Rejected from "${registration.hackathon.title}"`,

        {
          hackathonId: registration.hackathonId,
        },
      ),
    ),

    ...registration.team.members.flatMap((member) => [
      calculateUserAffinity(organizerId, member.userId),

      calculateUserAffinity(member.userId, organizerId),
    ]),
  ]).catch(console.error);

  return updatedRegistration;
};

export const archiveHackathon = async (
  organizerId: string,
  hackathonId: string,
) => {
  //
  // OWNERSHIP + STATUS VALIDATION
  //
  const hackathon = await prisma.hackathon.findFirst({
    where: {
      id: hackathonId,

      createdById: organizerId,
    },

    select: {
      id: true,
      title: true,
      status: true,
    },
  });

  if (!hackathon) {
    throw new AppError("Hackathon not found or unauthorized", 404);
  }

  //
  // PREVENT DUPLICATE ARCHIVE
  //
  if (hackathon.status === "ARCHIVED") {
    throw new AppError("Hackathon already archived", 400);
  }

  //
  // SOFT ARCHIVE
  //
  const updatedHackathon = await prisma.hackathon.update({
    where: {
      id: hackathonId,
    },

    data: {
      status: "ARCHIVED",

      archivedAt: new Date(),
    },
  });

  //
  // NON BLOCKING SIDE EFFECTS
  //
  void Promise.all([
    createActivity(
      organizerId,

      "HACKATHON_ARCHIVED",

      "Archived a hackathon",

      `Archived hackathon "${hackathon.title}"`,

      {
        hackathonId,
      },
    ),
  ]).catch(console.error);

  return updatedHackathon;
};

export const deleteHackathon = async (
  organizerId: string,
  hackathonId: string,
) => {
  //
  // FETCH HACKATHON + COUNTS
  //
  const hackathon = await prisma.hackathon.findFirst({
    where: {
      id: hackathonId,

      createdById: organizerId,
    },

    include: {
      _count: {
        select: {
          registrations: true,

          submissions: true,

          judges: true,

          winners: true,
        },
      },
    },
  });

  if (!hackathon) {
    throw new AppError("Hackathon not found or unauthorized", 404);
  }

  //
  // PREVENT DUPLICATE DELETE
  //
  if (hackathon.status === "DELETED") {
    throw new AppError("Hackathon already deleted", 400);
  }

  //
  // PENALTY CALCULATION
  //
  let penalty = -20;

  penalty -= hackathon._count.registrations * 2;

  penalty -= hackathon._count.submissions * 5;

  penalty -= hackathon._count.judges * 10;

  penalty -= hackathon._count.winners * 15;

  //
  // MAX PENALTY CAP
  //
  penalty = Math.max(penalty, -150);

  //
  // SOFT DELETE
  //
  const updatedHackathon = await prisma.hackathon.update({
    where: {
      id: hackathonId,
    },

    data: {
      status: "DELETED",

      deletedAt: new Date(),
    },
  });

  //
  // NON BLOCKING SIDE EFFECTS
  //
  void Promise.all([
    //
    // REPUTATION PENALTY
    //
    addReputation(
      organizerId,

      "HACKATHON_DELETED",

      penalty,

      "Deleted hackathon",

      {
        hackathonId,
      },
    ),

    //
    // ACTIVITY
    //
    createActivity(
      organizerId,

      "HACKATHON_DELETED",

      "Deleted a hackathon",

      `Deleted hackathon "${hackathon.title}"`,

      {
        hackathonId,
      },
    ),
  ]).catch(console.error);

  return updatedHackathon;
};

export const assignJudgeToHackathon = async (
  organizerId: string,
  hackathonId: string,
  judgeUserId: string,
) => {
  const [hackathon, existingJudge] = await Promise.all([
    prisma.hackathon.findUnique({
      where: {
        id: hackathonId,
      },

      select: {
        id: true,
        title: true,
        createdById: true,
      },
    }),

    prisma.hackathonJudge.findUnique({
      where: {
        hackathonId_userId: {
          hackathonId,
          userId: judgeUserId,
        },
      },

      select: {
        id: true,
      },
    }),
  ]);

  if (!hackathon) {
    throw new AppError("Hackathon not found", 404);
  }

  if (hackathon.createdById !== organizerId) {
    throw new AppError("Unauthorized", 403);
  }

  if (existingJudge) {
    throw new AppError("Judge already assigned", 400);
  }

  const [judgeAssignment] = await prisma.$transaction([
    prisma.hackathonJudge.create({
      data: {
        hackathonId,
        userId: judgeUserId,
      },

      include: {
        user: {
          include: {
            profile: true,
          },
        },
      },
    }),

    prisma.hackathon.update({
      where: {
        id: hackathonId,
      },

      data: {
        judgeCount: {
          increment: 1,
        },
      },
    }),
  ]);

  void Promise.all([
    createNotification({
      userId: judgeUserId,

      actorId: organizerId,

      type: "SYSTEM",

      title: "Assigned as Hackathon Judge",

      message: `You were assigned as a judge for "${hackathon.title}"`,
    }),

    addReputation(
      judgeUserId,

      "HACKATHON_JUDGE",

      20,

      "Assigned as hackathon judge",

      {
        hackathonId,
      },
    ),

    createActivity(
      judgeUserId,

      "HACKATHON_JUDGE",

      "Assigned as judge",

      `Assigned as judge for "${hackathon.title}"`,

      {
        hackathonId,
      },
    ),

    calculateUserAffinity(organizerId, judgeUserId),

    calculateUserAffinity(judgeUserId, organizerId),
  ]).catch(console.error);

  return judgeAssignment;
};

export const evaluateSubmission = async (
  judgeUserId: string,
  submissionId: string,
  data: {
    innovationScore?: number;
    technicalScore?: number;
    scalabilityScore?: number;
    designScore?: number;
    businessScore?: number;
    presentationScore?: number;
    feedback?: string;
  },
) => {
  //
  // FETCH SUBMISSION + JUDGE RELATION
  //
  const submission = await prisma.hackathonSubmission.findUnique({
    where: {
      id: submissionId,
    },

    select: {
      hackathonId: true,
      verifiedProject: true,
      engineeringScore: true,
      project: {
        select: {
          title: true,
          verified: true,
          contributorsCount: true,
          starsCount: true,
        },
      },
      team: {
        select: {
          members: {
            select: {
              userId: true,
              role: true,
            },
          },
        },
      },
      hackathon: {
        select: {
          title: true,
          judges: {
            where: {
              userId: judgeUserId,
            },
            select: {
              id: true,
              canEvaluateOwnTeam: true,
            },
          },
        },
      },
    },
  });

  if (!submission) {
    throw new AppError("Submission not found", 404);
  }

  const judge = submission.hackathon.judges[0];

  if (!judge) {
    throw new AppError("You are not a judge for this hackathon", 403);
  }

  //
  // SELF JUDGING PROTECTION
  //
  const isTeamMember = submission.team.members.some(
    (member) => member.userId === judgeUserId,
  );

  if (isTeamMember && !judge.canEvaluateOwnTeam) {
    throw new AppError("Cannot evaluate your own team", 400);
  }

  //
  // DUPLICATE EVALUATION
  //
  //
  // SCORE NORMALIZATION
  //
  const innovationScore = data.innovationScore || 0;

  const technicalScore = data.technicalScore || 0;

  const scalabilityScore = data.scalabilityScore || 0;

  const designScore = data.designScore || 0;

  const businessScore = data.businessScore || 0;

  const presentationScore = data.presentationScore || 0;

  //
  // WEIGHTED TOTAL SCORE
  //
  let totalScore =
    (innovationScore * 1.5 +
      technicalScore * 2 +
      scalabilityScore * 1.5 +
      designScore * 1 +
      businessScore * 1 +
      presentationScore * 1) /
    8;

  //
  // VERIFIED PROJECT BOOST
  //
  if (submission.verifiedProject) {
    totalScore += 2;
  }

  //
  // ENGINEERING BOOST
  //
  totalScore += (submission.engineeringScore || 0) / 100;

  const judgeUserPromise = prisma.user.findUnique({
    where: {
      id: judgeUserId,
    },

    select: {
      username: true,

      profile: {
        select: {
          fullName: true,
        },
      },
    },
  });

  //
  // TRANSACTION:
  // CREATE EVALUATION + RECALCULATE SCORE
  //
  let evaluation;

  try {
    evaluation = await prisma.$transaction(async (tx) => {
      //
      // CREATE EVALUATION
      //
      const createdEvaluation = await tx.hackathonEvaluation.create({
        data: {
          hackathonId: submission.hackathonId,

          submissionId,

          judgeId: judge.id,

          innovationScore,

          technicalScore,

          scalabilityScore,

          designScore,

          businessScore,

          presentationScore,

          totalScore,

          feedback: data.feedback,
        },
      });

      //
      // AGGREGATE AVG SCORE
      //
      const aggregate = await tx.hackathonEvaluation.aggregate({
        where: {
          submissionId,
        },

        _avg: {
          totalScore: true,
        },
      });

      const averageScore = aggregate._avg.totalScore || 0;

      //
      // ENGINEERING QUALITY SCORE
      //
      const engineeringScore = Math.min(
        Math.round(
          averageScore * 10 +
            (submission.project?.verified ? 15 : 0) +
            Math.min((submission.project?.contributorsCount || 0) * 2, 20) +
            Math.min(submission.project?.starsCount || 0, 20),
        ),
        100,
      );

      //
      // UPDATE SUBMISSION
      //
      await tx.hackathonSubmission.update({
        where: {
          id: submissionId,
        },

        data: {
          finalScore: averageScore,

          score: averageScore,

          engineeringScore,

          status: "SCORED",

          reviewedAt: new Date(),
        },
      });

      return createdEvaluation;
    });
  } catch (error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002" &&
      Array.isArray(error.meta?.target) &&
      (error.meta.target as string[]).includes("submissionId_judgeId")
    ) {
      throw new AppError("Submission already evaluated", 400);
    }

    throw error;
  }

  //
  // TEAM OWNER
  //
  const owner = submission.team.members.find(
    (member) => member.role === "OWNER",
  );

  //
  // NON BLOCKING SIDE EFFECTS
  //
  const judgeUser = await judgeUserPromise;

  void Promise.all([
    //
    // JUDGE REWARD
    //
    addReputation(
      judgeUserId,

      "HACKATHON_EVALUATED",

      5,

      "Evaluated hackathon submission",

      {
        hackathonId: submission.hackathonId,

        submissionId,
      },
    ),

    //
    // ACTIVITY
    //
    createActivity(
      judgeUserId,

      "HACKATHON_SUBMISSION_REVIEWED",

      "Reviewed hackathon submission",

      `Reviewed submission for "${submission.hackathon.title}"`,

      {
        hackathonId: submission.hackathonId,

        submissionId,
      },
    ),

    //
    // OWNER NOTIFICATION
    //
    ...(owner
      ? [
          createNotification({
            userId: owner.userId,

            type: "HACKATHON_JUDGING",

            title: "Submission Evaluated",

            message: `${judgeUser?.profile?.fullName || judgeUser?.username} reviewed your submission for "${submission.hackathon.title}"`,
          }),
        ]
      : []),

    //
    // ENGINEERING SCORE RECALC
    //
    ...submission.team.members.map((member) =>
      calculateEngineeringScore(member.userId),
    ),

    //
    // AFFINITIES
    //
    ...submission.team.members.flatMap((member) => [
      calculateUserAffinity(judgeUserId, member.userId),

      calculateUserAffinity(member.userId, judgeUserId),
    ]),
  ]).catch(console.error);

  return evaluation;
};

export const getHackathonLeaderboard = async (hackathonId: string) => {
  const hackathon = await prisma.hackathon.findUnique({
    where: {
      id: hackathonId,
    },
    select: {
      id: true,
    },
  });

  if (!hackathon) {
    throw new AppError("Hackathon not found", 404);
  }

  const submissions = await prisma.hackathonSubmission.findMany({
    where: {
      hackathonId,
      status: "SCORED",
    },
    select: {
      id: true,
      teamId: true,
      finalScore: true,
      rankingPosition: true,
      project: {
        select: {
          id: true,
          title: true,
          verified: true,
          status: true,
          contributorsCount: true,
          deploymentStatus: true,
          owner: {
            select: {
              id: true,
              username: true,
              profile: {
                select: {
                  fullName: true,
                },
              },
            },
          },
          members: {
            select: {
              user: {
                select: {
                  id: true,
                  username: true,
                  profile: {
                    select: {
                      fullName: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
      team: {
        select: {
          id: true,
          members: {
            select: {
              user: {
                select: {
                  id: true,
                  username: true,
                  profile: {
                    select: {
                      fullName: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
      evaluations: {
        select: {
          id: true,
        },
      },
    },
    orderBy: {
      finalScore: "desc",
    },
  });

  const rankedSubmissions = submissions
    .map((submission) => {
      let rankingScore = submission.finalScore || 0;

      if (submission.project.verified) {
        rankingScore += 2;
      }

      if (submission.project.status === "COMPLETED") {
        rankingScore += 1;
      }

      rankingScore +=
        Math.min(submission.project.contributorsCount || 0, 5) * 0.2;

      if (submission.project.deploymentStatus === "LIVE") {
        rankingScore += 1;
      }

      return {
        ...submission,
        rankingScore,
      };
    })
    .sort((a, b) => b.rankingScore - a.rankingScore)
    .map((submission, index) => ({
      rank: index + 1,
      ...submission,
    }));

  return {
    hackathon,
    totalSubmissions: rankedSubmissions.length,
    leaderboard: rankedSubmissions,
  };
};

export const declareHackathonWinners = async (
  organizerId: string,
  hackathonId: string,
) => {
  //
  // FETCH HACKATHON
  //
  const hackathon = await prisma.hackathon.findUnique({
    where: {
      id: hackathonId,
    },

    select: {
      id: true,
      title: true,
      status: true,
      createdById: true,
    },
  });

  if (!hackathon) {
    throw new AppError("Hackathon not found", 404);
  }

  //
  // AUTHORIZATION
  //
  if (hackathon.createdById !== organizerId) {
    throw new AppError("Unauthorized", 403);
  }

  //
  // PREVENT DUPLICATES
  //
  if (hackathon.status === "COMPLETED") {
    throw new AppError("Winners already declared", 400);
  }

  //
  // FETCH LEADERBOARD
  //
  const submissions = await prisma.hackathonSubmission.findMany({
    where: {
      hackathonId,
      status: "SCORED",
    },
    select: {
      id: true,
      teamId: true,
      finalScore: true,
      project: {
        select: {
          id: true,
          title: true,
          verified: true,
          status: true,
          contributorsCount: true,
          deploymentStatus: true,
        },
      },
      team: {
        select: {
          id: true,
          members: {
            select: {
              userId: true,
            },
          },
        },
      },
      evaluations: {
        select: {
          id: true,
        },
        take: 2,
      },
    },
    orderBy: {
      finalScore: "desc",
    },
  });

  if (submissions.length < 1) {
    throw new AppError("No scored submissions found", 400);
  }

  const rankedSubmissions = submissions
    .map((submission) => {
      let rankingScore = submission.finalScore || 0;

      if (submission.project.verified) {
        rankingScore += 2;
      }

      if (submission.project.status === "COMPLETED") {
        rankingScore += 1;
      }

      rankingScore +=
        Math.min(submission.project.contributorsCount || 0, 5) * 0.2;

      if (submission.project.deploymentStatus === "LIVE") {
        rankingScore += 1;
      }

      return {
        ...submission,
        rankingScore,
      };
    })
    .sort((a, b) => b.rankingScore - a.rankingScore);

  //
  // TOP 3
  //
  const winners = rankedSubmissions.slice(0, 3);

  const rewards = {
    1: 150,
    2: 100,
    3: 60,
  };

  //
  // ORGANIZER
  //
  const organizer = await prisma.user.findUnique({
    where: {
      id: organizerId,
    },

    select: {
      username: true,

      profile: {
        select: {
          fullName: true,
        },
      },
    },
  });

  //
  // PREPARE WINNER ENTRIES
  //
  const winnerEntries: any[] = [];

  for (let index = 0; index < winners.length; index++) {
    const submission = winners[index];

    //
    // MINIMUM EVALUATIONS
    //
    if (submission.evaluations.length < 2) {
      continue;
    }

    const position = index + 1;

    winnerEntries.push({
      hackathonId,

      submissionId: submission.id,

      teamId: submission.teamId,

      position,

      score: submission.finalScore || 0,
    });
  }

  //
  // TRANSACTION:
  // CREATE WINNERS + COMPLETE HACKATHON
  //
  await prisma.$transaction([
    prisma.hackathonWinner.createMany({
      data: winnerEntries,
    }),

    prisma.hackathon.update({
      where: {
        id: hackathonId,
      },

      data: {
        status: "COMPLETED",

        completedAt: new Date(),

        winnerCount: winnerEntries.length,
      },
    }),
  ]);

  //
  // SIDE EFFECTS
  //
  const sideEffects: Promise<any>[] = [];

  for (let index = 0; index < winnerEntries.length; index++) {
    const winner = winnerEntries[index];

    const submission = winners[index];

    const reward = rewards[winner.position as 1 | 2 | 3];

    //
    // TEAM REWARD
    //
    sideEffects.push(addTeamReputation(submission.teamId, reward));

    //
    // MEMBER REWARDS
    //
    for (const member of submission.team.members) {
      sideEffects.push(
        addReputation(
          member.userId,

          "HACKATHON_WON",

          reward,

          `Won ${winner.position}${winner.position === 1 ? "st" : winner.position === 2 ? "nd" : "rd"} place in hackathon`,

          {
            hackathonId,
          },
        ),
      );

      sideEffects.push(
        createActivity(
          member.userId,

          "HACKATHON_WON",

          "Won a hackathon",

          `Won ${winner.position}${winner.position === 1 ? "st" : winner.position === 2 ? "nd" : "rd"} place in "${hackathon.title}"`,

          {
            hackathonId,
          },
        ),
      );

      sideEffects.push(
        createNotification({
          userId: member.userId,

          type: "HACKATHON_WINNER",

          title: "Hackathon Winner",

          message: `${organizer?.profile?.fullName || organizer?.username} declared your team ${winner.position}${winner.position === 1 ? "st" : winner.position === 2 ? "nd" : "rd"} place winner in "${hackathon.title}"`,
        }),
      );

      sideEffects.push(
        awardBadge(
          member.userId,

          winner.position === 1 ? "hackathon-champion" : "hackathon-winner",
        ),
      );

      sideEffects.push(calculateEngineeringScore(member.userId));

      //
      // ORGANIZER AFFINITY
      //
      sideEffects.push(calculateUserAffinity(organizerId, member.userId));

      sideEffects.push(calculateUserAffinity(member.userId, organizerId));

      //
      // TEAM AFFINITY
      //
      for (const otherMember of submission.team.members) {
        if (otherMember.userId !== member.userId) {
          sideEffects.push(
            calculateUserAffinity(member.userId, otherMember.userId),
          );
        }
      }
    }
  }

  //
  // EXECUTE SIDE EFFECTS
  //
  void Promise.all(sideEffects).catch(console.error);

  return {
    success: true,

    winnersDeclared: winnerEntries.length,
  };
};
