import prisma from "shared/database/prisma";

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

export const createHackathon = async (userId: string, data: any) => {
  //
  // Generate slug
  //
  const slug = data.title?.toLowerCase()?.replace(/\s+/g, "-");

  //
  // Create hackathon
  //
  const hackathon = await prisma.hackathon.create({
    data: {
      //
      // BASIC
      //
      title: data.title,

      slug,

      shortDescription: data.shortDescription,

      description: data.description,

      bannerUrl: data.bannerUrl,

      logoUrl: data.logoUrl,

      //
      // TIMELINE
      //
      startDate: new Date(data.startDate),

      endDate: new Date(data.endDate),

      registrationDeadline: new Date(data.registrationDeadline),

      //
      // PARTICIPATION
      //
      maxTeamSize: data.maxTeamSize,

      tracks: data.tracks,

      rules: data.rules,

      prizes: data.prizes,

      judgingCriteria: data.judgingCriteria,

      //
      // ORGANIZER
      //
      organizerName: data.organizerName,

      organizerWebsite: data.organizerWebsite,

      organizerType: data.organizerType,

      sponsorName: data.sponsorName,

      sponsorWebsite: data.sponsorWebsite,

      //
      // LOCATION
      //
      mode: data.mode,

      location: data.location,

      //
      // EXTERNAL
      //
      isExternal: data.isExternal || false,

      sourcePlatform: data.sourcePlatform,

      externalUrl: data.externalUrl,

      //
      // STATUS
      //
      status: data.status || "DRAFT",

      //
      // RELATION
      //
      createdById: userId,
    },
  });

  //
  // Small creation reward
  //
  addReputation(
    userId,

    "HACKATHON_CREATED",

    10,

    "Created a hackathon",

    {
      hackathonId: hackathon.id,
    },
  ).catch(console.error);

  //
  // Activity
  //
  createActivity(
    userId,

    "HACKATHON_CREATED",

    "Created a hackathon",

    `Created hackathon "${hackathon.title}"`,

    {
      hackathonId: hackathon.id,
    },
  ).catch(console.error);

  return hackathon;
};

export const getHackathons = async () => {
  const hackathons = await prisma.hackathon.findMany({
    where: {
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

  //
  // Ranking engine
  //
  const rankedHackathons = hackathons
    .map((hackathon) => {
      let score = 0;

      //
      // Verified hackathon
      //
      if (hackathon.verified) {
        score += 100;
      }

      //
      // Featured
      //
      if (hackathon.featured) {
        score += 60;
      }

      //
      // External recognized source
      //
      if (hackathon.isExternal) {
        score += 40;
      }

      //
      // Registration activity
      //
      score += hackathon._count.registrations * 2;

      //
      // Submission quality
      //
      score += hackathon._count.submissions * 5;

      //
      // Judges
      //
      score += hackathon._count.judges * 10;

      //
      // Winners declared
      //
      score += hackathon._count.winners * 15;

      //
      // Freshness
      //
      const daysOld = Math.floor(
        (Date.now() - new Date(hackathon.createdAt).getTime()) /
          (1000 * 60 * 60 * 24),
      );

      //
      // Newer events boost
      //
      score += Math.max(30 - daysOld, 0);

      //
      // Status scoring
      //
      if (hackathon.status === "LIVE") {
        score += 50;
      }

      if (hackathon.status === "COMPLETED") {
        score += 30;
      }

      if (hackathon.status === "ARCHIVED") {
        score -= 20;
      }

      return {
        ...hackathon,

        rankingScore: score,
      };
    })
    .sort((a, b) => b.rankingScore - a.rankingScore)
    .slice(0, 50);

  return rankedHackathons;
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
      //
      // ORGANIZER
      //
      createdBy: {
        include: {
          profile: true,
        },
      },

      //
      // REGISTRATIONS
      //
      registrations: {
        include: {
          team: {
            include: {
              members: {
                include: {
                  user: {
                    include: {
                      profile: true,
                    },
                  },
                },
              },
            },
          },
        },

        orderBy: {
          createdAt: "desc",
        },
      },

      //
      // SUBMISSIONS
      //
      submissions: {
        include: {
          project: {
            include: {
              owner: {
                include: {
                  profile: true,
                },
              },

              members: {
                include: {
                  user: {
                    include: {
                      profile: true,
                    },
                  },
                },
              },
            },
          },

          team: true,

          evaluations: {
            include: {
              judge: {
                include: {
                  user: {
                    include: {
                      profile: true,
                    },
                  },
                },
              },
            },
          },

          winners: true,
        },

        orderBy: [
          {
            engineeringScore: "desc",
          },

          {
            submittedAt: "desc",
          },
        ],
      },

      //
      // JUDGES
      //
      judges: {
        include: {
          user: {
            include: {
              profile: true,
            },
          },
        },
      },

      //
      // WINNERS
      //
      winners: {
        include: {
          submission: {
            include: {
              project: true,
              team: true,
            },
          },
        },

        orderBy: {
          position: "asc",
        },
      },

      //
      // COUNTS
      //
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

  //
  // View count increment
  //
  await prisma.hackathon.update({
    where: {
      id: hackathonId,
    },

    data: {
      viewCount: {
        increment: 1,
      },
    },
  });

  //
  // Derived analytics
  //
  const submissions = hackathon.submissions || [];

  const registrations = hackathon.registrations || [];

  const judges = hackathon.judges || [];

  const winners = hackathon.winners || [];

  const totalEngineeringScore = submissions.reduce(
    (acc: number, submission: any) => acc + (submission.engineeringScore || 0),

    0,
  );

  const averageEngineeringScore =
    submissions.length > 0 ? totalEngineeringScore / submissions.length : 0;

  //
  // Verified submissions
  //
  const verifiedSubmissionCount = submissions.filter(
    (submission: any) => submission.verifiedProject,
  ).length;

  //
  // Attach analytics
  //
  return {
    ...hackathon,

    analytics: {
      averageEngineeringScore,

      verifiedSubmissionCount,

      totalProjects: submissions.length,

      totalTeams: registrations.length,

      totalJudges: judges.length,

      totalWinners: winners.length,
    },
  };
};

export const registerTeamForHackathon = async (
  userId: string,
  hackathonId: string,
  teamId: string,
) => {
  //
  // Fetch hackathon
  //
  const hackathon = await prisma.hackathon.findUnique({
    where: {
      id: hackathonId,
    },
  });

  if (!hackathon) {
    throw new AppError("Hackathon not found", 404);
  }

  //
  // Prevent deleted/archived
  //
  if (hackathon.status === "DELETED" || hackathon.status === "ARCHIVED") {
    throw new AppError("Hackathon unavailable", 400);
  }

  //
  // Deadline check
  //
  if (new Date() > hackathon.registrationDeadline) {
    throw new AppError("Registration closed", 400);
  }

  //
  // Team membership validation
  //
  const membership = await prisma.teamMember.findFirst({
    where: {
      teamId,
      userId,
    },
  });

  if (!membership) {
    throw new AppError("Not a team member", 403);
  }

  //
  // Fetch full team
  //
  const team = await prisma.team.findUnique({
    where: {
      id: teamId,
    },

    include: {
      members: true,

      projects: true,

      hackathonRegistrations: true,
    },
  });

  if (!team) {
    throw new AppError("Team not found", 404);
  }

  //
  // Team size validation
  //
  const memberCount = team.members.length;

  if (memberCount > hackathon.maxTeamSize) {
    throw new AppError("Team exceeds maximum allowed size", 400);
  }

  //
  // Duplicate registration prevention
  //
  const existingRegistration = await prisma.hackathonRegistration.findUnique({
    where: {
      hackathonId_teamId: {
        hackathonId,
        teamId,
      },
    },
  });

  if (existingRegistration) {
    throw new AppError("Team already registered", 400);
  }

  //
  // Team credibility scoring
  //
  let credibilityScore = 0;

  //
  // Team reputation
  //
  credibilityScore += team.reputationScore || 0;

  //
  // Completed projects
  //
  credibilityScore += (team.completedProjectsCount || 0) * 20;

  //
  // Verified projects
  //
  const verifiedProjects = team.projects.filter(
    (project) => project.verified,
  ).length;

  credibilityScore += verifiedProjects * 30;

  //
  // Existing hackathon history
  //
  credibilityScore += team.hackathonRegistrations.length * 5;

  //
  // Determine registration quality
  //
  let rewardPoints = 5;

  if (credibilityScore >= 300) {
    rewardPoints = 20;
  } else if (credibilityScore >= 150) {
    rewardPoints = 15;
  } else if (credibilityScore >= 60) {
    rewardPoints = 10;
  }

  //
  // Create registration
  //
  const registration = await prisma.hackathonRegistration.create({
    data: {
      hackathonId,
      teamId,
    },
  });

  //
  // Increment registration count
  //
  await prisma.hackathon.update({
    where: {
      id: hackathonId,
    },

    data: {
      registrationCount: {
        increment: 1,
      },
    },
  });

  //
  // Team reputation
  //
  addTeamReputation(
    teamId,

    rewardPoints,
  ).catch(console.error);

  //
  // Reward team members
  //
  rewardTeamMembers(
    teamId,

    "HACKATHON_REGISTERED",

    rewardPoints,

    "Registered for hackathon",

    {
      hackathonId,
    },
  ).catch(console.error);

  //
  // Activities
  //
  await Promise.all(
    team.members.map((member) =>
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
  );

  //
  // Notify organizer
  //

  const requester = await prisma.user.findUnique({
    where: {
      id: userId,
    },

    include: {
      profile: true,
    },
  });

  createNotification({
    userId: hackathon.createdById,

    type: "SYSTEM",

    title: "New Hackathon Registration",

    message: `${requester?.profile?.fullName || requester?.username} registered team "${team.name}" for your hackathon`,
  }).catch(console.error);

  //
  // Team collaboration affinity
  //
  await Promise.all(
    team.members.map(async (member) => {
      await calculateUserAffinity(member.userId, hackathon.createdById);

      await calculateUserAffinity(hackathon.createdById, member.userId);
    }),
  );

  return registration;
};

export const submitProjectToHackathon = async (
  userId: string,
  hackathonId: string,
  data: any,
) => {
  //
  // Registration validation
  //
  const registration = await prisma.hackathonRegistration.findUnique({
    where: {
      hackathonId_teamId: {
        hackathonId,
        teamId: data.teamId,
      },
    },

    include: {
      hackathon: true,
      team: true,
    },
  });

  if (!registration) {
    throw new AppError("Team not registered", 400);
  }

  if (registration.status !== "APPROVED") {
    throw new AppError("Registration not approved", 400);
  }

  //
  // Team membership validation
  //
  const membership = await prisma.teamMember.findFirst({
    where: {
      teamId: data.teamId,
      userId,
    },
  });

  if (!membership) {
    throw new AppError("Not a team member", 403);
  }

  //
  // Project membership validation
  //
  const projectMember = await prisma.projectMember.findFirst({
    where: {
      projectId: data.projectId,

      userId,
    },
  });

  if (!projectMember) {
    throw new AppError("You are not part of this project", 403);
  }

  //
  // Fetch project
  //
  const project = await prisma.project.findUnique({
    where: {
      id: data.projectId,
    },
  });

  if (!project) {
    throw new AppError("Project not found", 404);
  }

  //
  // Prevent deleted project
  //
  if (project.status === "DELETED") {
    throw new AppError("Deleted project cannot be submitted", 400);
  }

  //
  // Validate that all
  // project members belong
  // to submitting team
  //
  const projectMembers = await prisma.projectMember.findMany({
    where: {
      projectId: data.projectId,
    },

    select: {
      userId: true,
    },
  });

  const teamMembers = await prisma.teamMember.findMany({
    where: {
      teamId: data.teamId,
    },

    select: {
      userId: true,
    },
  });

  const teamMemberIds = new Set(teamMembers.map((m) => m.userId));

  const invalidMembers = projectMembers.filter(
    (member) => !teamMemberIds.has(member.userId),
  );

  if (invalidMembers.length > 0) {
    throw new AppError(
      "Some project members are not part of the submitting team.",
      400,
    );
  }

  //
  // GitHub required
  //
  if (!project.githubUrl) {
    throw new AppError("GitHub repository required for submission", 400);
  }

  //
  // Calculate engineering score
  //
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

  //
  // Determine submission reward
  //
  let rewardPoints = 10;

  if (engineeringScore >= 150) {
    rewardPoints = 50;
  } else if (engineeringScore >= 80) {
    rewardPoints = 30;
  } else if (engineeringScore >= 40) {
    rewardPoints = 20;
  }

  //
  // Existing submission
  //
  const existingSubmission = await prisma.hackathonSubmission.findUnique({
    where: {
      hackathonId_teamId: {
        hackathonId,
        teamId: data.teamId,
      },
    },
  });

  let submission;

  //
  // Update existing
  //
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
    submission = await prisma.hackathonSubmission.create({
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
    });

    //
    // Increment submission count
    //
    await prisma.hackathon.update({
      where: {
        id: hackathonId,
      },

      data: {
        submissionCount: {
          increment: 1,
        },
      },
    });

    //
    // Team reputation
    //
    addTeamReputation(
      data.teamId,

      rewardPoints,
    ).catch(console.error);

    //
    // Reward team members
    //
    rewardTeamMembers(
      data.teamId,

      "HACKATHON_SUBMISSION",

      rewardPoints,

      "Submitted hackathon project",

      {
        hackathonId,

        projectId: data.projectId,
      },
    ).catch(console.error);

    //
    // Activities
    //
    const teamMembers = await prisma.teamMember.findMany({
      where: {
        teamId: data.teamId,
      },
    });

    await Promise.all(
      teamMembers.map((member) =>
        createActivity(
          member.userId,

          "HACKATHON_SUBMITTED",

          "Submitted hackathon project",

          `Submitted "${project.title}" to hackathon "${registration.hackathon.title}"`,

          {
            hackathonId,

            projectId: data.projectId,
          },
        ),
      ),
    );
  }

  //
  // Notify organizer

  const submitter = await prisma.user.findUnique({
    where: {
      id: userId,
    },

    include: {
      profile: true,
    },
  });

  createNotification({
    userId: registration.hackathon.createdById,

    type: "SYSTEM",

    title: "New Hackathon Submission",

    message: `${submitter?.profile?.fullName || submitter?.username} submitted project for team "${registration.team.name}"`,
  }).catch(console.error);

  //
  // Notify team owner
  //
  const owner = await prisma.teamMember.findFirst({
    where: {
      teamId: data.teamId,

      role: "OWNER",
    },
  });

  if (owner && owner.userId !== userId) {
    createNotification({
      userId: owner.userId,

      type: "SYSTEM",

      title: "Hackathon Submission Updated",

      message: `${submitter?.profile?.fullName || submitter?.username} submitted your team's project to hackathon`,
    }).catch(console.error);
  }

  //
  // Team collaboration affinity
  //
  await Promise.all(
    teamMembers.map(async (member) => {
      await calculateUserAffinity(
        member.userId,
        registration.hackathon.createdById,
      );

      await calculateUserAffinity(
        registration.hackathon.createdById,
        member.userId,
      );
    }),
  );

  //
  // Project collaboration affinity
  //
  await Promise.all(
    projectMembers.map(async (member) => {
      await calculateUserAffinity(userId, member.userId);
    }),
  );

  return submission;
};

export const reviewRegistration = async (
  organizerId: string,
  registrationId: string,
  status: "APPROVED" | "REJECTED",
) => {
  //
  // Fetch registration
  //
  const registration = await prisma.hackathonRegistration.findUnique({
    where: {
      id: registrationId,
    },

    include: {
      hackathon: true,

      team: {
        include: {
          members: true,
        },
      },
    },
  });

  if (!registration) {
    throw new AppError("Registration not found", 404);
  }

  //
  // Authorization
  //
  if (registration.hackathon.createdById !== organizerId) {
    throw new AppError("Unauthorized", 403);
  }

  //
  // Prevent re-review
  //
  if (registration.status !== "PENDING") {
    throw new AppError("Registration already reviewed", 400);
  }

  //
  // Update status
  //
  const updatedRegistration = await prisma.hackathonRegistration.update({
    where: {
      id: registrationId,
    },

    data: {
      status,

      reviewedAt: new Date(),
    },
  });

  //
  // Approval rewards
  //
  if (status === "APPROVED") {
    //
    // Team reputation
    //
    addTeamReputation(
      registration.teamId,

      10,
    ).catch(console.error);

    //
    // Reward all members
    //
    rewardTeamMembers(
      registration.teamId,

      "HACKATHON_APPROVED",

      5,

      "Hackathon registration approved",

      {
        hackathonId: registration.hackathonId,
      },
    ).catch(console.error);
  } else {
    //
    // Small rejection penalty
    //
    addTeamReputation(
      registration.teamId,

      -2,
    ).catch(console.error);
  }

  //
  // Activities for all members
  //
  await Promise.all(
    registration.team.members.map((member) =>
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
  );

  //
  // Notify team owner
  //
  const owner = await prisma.teamMember.findFirst({
    where: {
      teamId: registration.teamId,

      role: "OWNER",
    },
  });
  const organizer = await prisma.user.findUnique({
    where: {
      id: organizerId,
    },

    include: {
      profile: true,
    },
  });

  if (owner) {
    createNotification({
      userId: owner.userId,

      type: "SYSTEM",

      title:
        status === "APPROVED"
          ? "Hackathon Registration Approved"
          : "Hackathon Registration Rejected",

      message:
        status === "APPROVED"
          ? `${organizer?.profile?.fullName || organizer?.username} approved your team for "${registration.hackathon.title}"`
          : `${organizer?.profile?.fullName || organizer?.username} rejected your team from "${registration.hackathon.title}"`,
    }).catch(console.error);
  }

  //
  // Affinity updates
  //
  await Promise.all(
    registration.team.members.map(async (member) => {
      await calculateUserAffinity(organizerId, member.userId);

      await calculateUserAffinity(member.userId, organizerId);
    }),
  );

  return updatedRegistration;
};

export const archiveHackathon = async (
  organizerId: string,
  hackathonId: string,
) => {
  //
  // Fetch hackathon
  //
  const hackathon = await prisma.hackathon.findUnique({
    where: {
      id: hackathonId,
    },
  });

  if (!hackathon) {
    throw new AppError("Hackathon not found", 404);
  }

  //
  // Authorization
  //
  if (hackathon.createdById !== organizerId) {
    throw new AppError("Unauthorized", 403);
  }

  //
  // Prevent duplicate archive
  //
  if (hackathon.status === "ARCHIVED") {
    throw new AppError("Hackathon already archived", 400);
  }

  //
  // Archive
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
  // Activity
  //
  createActivity(
    organizerId,

    "HACKATHON_ARCHIVED",

    "Archived a hackathon",

    `Archived hackathon "${hackathon.title}"`,

    {
      hackathonId,
    },
  ).catch(console.error);

  return updatedHackathon;
};

export const deleteHackathon = async (
  organizerId: string,
  hackathonId: string,
) => {
  //
  // Fetch hackathon
  //
  const hackathon = await prisma.hackathon.findUnique({
    where: {
      id: hackathonId,
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
    throw new AppError("Hackathon not found", 404);
  }

  //
  // Authorization
  //
  if (hackathon.createdById !== organizerId) {
    throw new AppError("Unauthorized", 403);
  }

  //
  // Prevent duplicate delete
  //
  if (hackathon.status === "DELETED") {
    throw new AppError("Hackathon already deleted", 400);
  }

  //
  // Calculate penalty
  //
  let penalty = -20;

  //
  // Registrations existed
  //
  penalty -= hackathon._count.registrations * 2;

  //
  // Submissions existed
  //
  penalty -= hackathon._count.submissions * 5;

  //
  // Judges existed
  //
  penalty -= hackathon._count.judges * 10;

  //
  // Winners existed
  //
  penalty -= hackathon._count.winners * 15;

  //
  // Limit max penalty
  //
  penalty = Math.max(penalty, -150);

  //
  // Soft delete
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
  // Reputation penalty
  //
  await addReputation(
    organizerId,

    "HACKATHON_DELETED",

    penalty,

    "Deleted hackathon",

    {
      hackathonId,
    },
  );

  //
  // Activity
  //
  createActivity(
    organizerId,

    "HACKATHON_DELETED",

    "Deleted a hackathon",

    `Deleted hackathon "${hackathon.title}"`,

    {
      hackathonId,
    },
  ).catch(console.error);

  return updatedHackathon;
};

export const assignJudgeToHackathon = async (
  organizerId: string,
  hackathonId: string,
  data: any,
) => {
  //
  // Fetch hackathon
  //
  const hackathon = await prisma.hackathon.findUnique({
    where: {
      id: hackathonId,
    },
  });

  if (!hackathon) {
    throw new AppError("Hackathon not found", 404);
  }

  //
  // Authorization
  //
  if (hackathon.createdById !== organizerId) {
    throw new AppError("Unauthorized", 403);
  }

  //
  // Prevent organizer self-judge
  //
  if (organizerId === data.userId) {
    throw new AppError("Organizer cannot be judge", 400);
  }

  //
  // Judge existence
  //
  const judge = await prisma.user.findUnique({
    where: {
      id: data.userId,
    },

    include: {
      profile: true,
    },
  });

  if (!judge) {
    throw new AppError("Judge not found", 404);
  }

  //
  // Duplicate prevention
  //
  const existingJudge = await prisma.hackathonJudge.findUnique({
    where: {
      hackathonId_userId: {
        hackathonId,
        userId: data.userId,
      },
    },
  });

  if (existingJudge) {
    throw new AppError("Judge already assigned", 400);
  }

  //
  // Create judge assignment
  //
  const assignment = await prisma.hackathonJudge.create({
    data: {
      hackathonId,

      userId: data.userId,

      expertise: data.expertise,

      bio: data.bio,

      canEvaluateOwnTeam: false,
    },

    include: {
      user: {
        include: {
          profile: true,
        },
      },

      hackathon: true,
    },
  });

  //
  // Increment judge count
  //
  await prisma.hackathon.update({
    where: {
      id: hackathonId,
    },

    data: {
      judgeCount: {
        increment: 1,
      },
    },
  });

  //
  // Activity
  //
  createActivity(
    data.userId,

    "HACKATHON_JUDGE_ASSIGNED",

    "Assigned as hackathon judge",

    `Assigned as judge for "${hackathon.title}"`,

    {
      hackathonId,
    },
  ).catch(console.error);

  //
  // Notification
  //
  const organizer = await prisma.user.findUnique({
    where: {
      id: organizerId,
    },

    include: {
      profile: true,
    },
  });

  createNotification({
    userId: data.userId,

    type: "HACKATHON_JUDGING",

    title: "Assigned As Judge",

    message: `${organizer?.profile?.fullName || organizer?.username} assigned you as judge for "${hackathon.title}"`,
  }).catch(console.error);

  //
  // Affinity
  //
  await calculateUserAffinity(organizerId, data.userId);

  await calculateUserAffinity(data.userId, organizerId);

  return assignment;
};

export const evaluateSubmission = async (
  judgeUserId: string,
  submissionId: string,
  data: any,
) => {
  //
  // Fetch submission
  //
  const submission = await prisma.hackathonSubmission.findUnique({
    where: {
      id: submissionId,
    },

    include: {
      hackathon: true,

      project: {
        include: {
          members: true,
        },
      },

      team: {
        include: {
          members: true,
        },
      },

      evaluations: true,
    },
  });

  if (!submission) {
    throw new AppError("Submission not found", 404);
  }

  //
  // Judge validation
  //
  const judge = await prisma.hackathonJudge.findUnique({
    where: {
      hackathonId_userId: {
        hackathonId: submission.hackathonId,

        userId: judgeUserId,
      },
    },
  });

  if (!judge) {
    throw new AppError("You are not a judge for this hackathon", 403);
  }

  //
  // Prevent self judging
  //
  const isTeamMember = submission.team.members.some(
    (member) => member.userId === judgeUserId,
  );

  if (isTeamMember && !judge.canEvaluateOwnTeam) {
    throw new AppError("Cannot evaluate your own team", 400);
  }

  //
  // Prevent duplicate evaluation
  //
  const existingEvaluation = await prisma.hackathonEvaluation.findUnique({
    where: {
      submissionId_judgeId: {
        submissionId,

        judgeId: judge.id,
      },
    },
  });

  if (existingEvaluation) {
    throw new AppError("Submission already evaluated", 400);
  }

  //
  // Calculate total score
  //
  const innovationScore = data.innovationScore || 0;

  const technicalScore = data.technicalScore || 0;

  const scalabilityScore = data.scalabilityScore || 0;

  const designScore = data.designScore || 0;

  const businessScore = data.businessScore || 0;

  const presentationScore = data.presentationScore || 0;

  //
  // Weighted scoring
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
  // Verified project boost
  //
  if (submission.verifiedProject) {
    totalScore += 2;
  }

  //
  // Engineering score boost
  //
  totalScore += (submission.engineeringScore || 0) / 100;

  //
  // Create evaluation
  //
  const evaluation = await prisma.hackathonEvaluation.create({
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
  // Recalculate final score
  //
  const evaluations = await prisma.hackathonEvaluation.findMany({
    where: {
      submissionId,
    },
  });

  const averageScore =
    evaluations.reduce(
      (acc, item) => acc + (item.totalScore || 0),

      0,
    ) / evaluations.length;

  //
  // Engineering quality score
  //
  const engineeringScore = Math.min(
    Math.round(
      averageScore * 10 +
        (submission.project.verified ? 15 : 0) +
        Math.min(submission.project.contributorsCount * 2, 20) +
        Math.min(submission.project.starsCount, 20),
    ),
    100,
  );

  //
  // Update submission
  //
  await prisma.hackathonSubmission.update({
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

  //
  // Reward judge
  //
  await addReputation(
    judgeUserId,

    "HACKATHON_EVALUATED",

    5,

    "Evaluated hackathon submission",

    {
      hackathonId: submission.hackathonId,

      submissionId,
    },
  );

  //
  // Judge activity
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
  ).catch(console.error);

  //
  // Notify team owner
  //
  const owner = submission.team.members.find(
    (member) => member.role === "OWNER",
  );

  const judgeUser = await prisma.user.findUnique({
    where: {
      id: judgeUserId,
    },

    include: {
      profile: true,
    },
  });

  if (owner) {
    createNotification({
      userId: owner.userId,

      type: "HACKATHON_JUDGING",

      title: "Submission Evaluated",

      message: `${judgeUser?.profile?.fullName || judgeUser?.username} reviewed your submission for "${submission.hackathon.title}"`,
    }).catch(console.error);
  }

  //
  // Recalculate member engineering scores
  //
  await Promise.all(
    submission.team.members.map(async (member) => {
      await calculateEngineeringScore(member.userId);
    }),
  );

  //
  // Judge affinity with team
  //
  await Promise.all(
    submission.team.members.map(async (member) => {
      await calculateUserAffinity(judgeUserId, member.userId);

      await calculateUserAffinity(member.userId, judgeUserId);
    }),
  );

  return evaluation;
};

export const getHackathonLeaderboard = async (hackathonId: string) => {
  //
  // Fetch hackathon
  //
  const hackathon = await prisma.hackathon.findUnique({
    where: {
      id: hackathonId,
    },
  });

  if (!hackathon) {
    throw new AppError("Hackathon not found", 404);
  }

  //
  // Fetch scored submissions
  //
  const submissions = await prisma.hackathonSubmission.findMany({
    where: {
      hackathonId,

      status: "SCORED",
    },

    include: {
      team: {
        include: {
          members: {
            include: {
              user: {
                include: {
                  profile: true,
                },
              },
            },
          },
        },
      },

      project: {
        include: {
          owner: {
            include: {
              profile: true,
            },
          },

          members: {
            include: {
              user: {
                include: {
                  profile: true,
                },
              },
            },
          },
        },
      },

      evaluations: true,
    },
  });

  //
  // Ranking algorithm
  //
  const rankedSubmissions = submissions
    .map((submission) => {
      let rankingScore = submission.finalScore || 0;

      //
      // Verified project boost
      //
      if (submission.project.verified) {
        rankingScore += 2;
      }

      //
      // Completed project boost
      //
      if (submission.project.status === "COMPLETED") {
        rankingScore += 1;
      }

      //
      // Contributors boost
      //
      rankingScore +=
        Math.min(
          submission.project.contributorsCount || 0,

          5,
        ) * 0.2;

      //
      // Live deployment boost
      //
      if (submission.project.deploymentStatus === "LIVE") {
        rankingScore += 1;
      }

      return {
        ...submission,

        rankingScore,
      };
    })

    //
    // Sort descending
    //
    .sort((a, b) => b.rankingScore - a.rankingScore)

    //
    // Assign rank
    //
    .map((submission, index) => ({
      rank: index + 1,

      ...submission,
    }));

  //
  // Persist ranking positions
  //
  await Promise.all(
    rankedSubmissions.map((submission) =>
      prisma.hackathonSubmission.update({
        where: {
          id: submission.id,
        },

        data: {
          rankingPosition: submission.rank,
        },
      }),
    ),
  );

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
  // Fetch hackathon
  //
  const hackathon = await prisma.hackathon.findUnique({
    where: {
      id: hackathonId,
    },
  });

  if (!hackathon) {
    throw new AppError("Hackathon not found", 404);
  }

  //
  // Authorization
  //
  if (hackathon.createdById !== organizerId) {
    throw new AppError("Unauthorized", 403);
  }

  //
  // Prevent duplicate declaration
  //
  if (hackathon.status === "COMPLETED") {
    throw new AppError("Winners already declared", 400);
  }

  //
  // Fetch leaderboard submissions
  //
  const submissions = await prisma.hackathonSubmission.findMany({
    where: {
      hackathonId,

      status: "SCORED",
    },

    include: {
      evaluations: true,

      project: true,

      team: {
        include: {
          members: true,
        },
      },
    },

    orderBy: {
      rankingPosition: "asc",
    },
  });

  //
  // Minimum submissions
  //
  if (submissions.length < 1) {
    throw new AppError("No scored submissions found", 400);
  }

  //
  // Top 3 winners
  //
  const winners = submissions.slice(0, 3);

  const positions = [1, 2, 3];

  const rewards = {
    1: 150,
    2: 100,
    3: 60,
  };

  //
  // Declare winners
  //
  for (let index = 0; index < winners.length; index++) {
    const submission = winners[index];

    const position = positions[index];

    //
    // Minimum evaluation protection
    //
    if (submission.evaluations.length < 2) {
      continue;
    }

    //
    // Winner entry
    //
    await prisma.hackathonWinner.create({
      data: {
        hackathonId,

        submissionId: submission.id,

        teamId: submission.teamId,

        position,

        score: submission.finalScore || 0,
      },
    });

    //
    // Team reputation
    //
    await addTeamReputation(
      submission.teamId,

      rewards[position as 1 | 2 | 3],
    );

    //
    // Reward members
    //
    const organizer = await prisma.user.findUnique({
      where: {
        id: organizerId,
      },

      include: {
        profile: true,
      },
    });

    await Promise.all(
      submission.team.members.map(async (member) => {
        //
        // Reputation
        //
        await addReputation(
          member.userId,

          "HACKATHON_WON",

          rewards[position as 1 | 2 | 3],

          `Won ${position}${position === 1 ? "st" : position === 2 ? "nd" : "rd"} place in hackathon`,

          {
            hackathonId,
          },
        );

        //
        // Activity
        //
        await createActivity(
          member.userId,

          "HACKATHON_WON",

          "Won a hackathon",

          `Won ${position}${position === 1 ? "st" : position === 2 ? "nd" : "rd"} place in "${hackathon.title}"`,

          {
            hackathonId,
          },
        );

        //
        // Notification
        //
        createNotification({
          userId: member.userId,

          type: "HACKATHON_WINNER",

          title: "Hackathon Winner",

          message: `${organizer?.profile?.fullName || organizer?.username} declared your team ${position}${position === 1 ? "st" : position === 2 ? "nd" : "rd"} place winner in "${hackathon.title}"`,
        }).catch(console.error);

        //
        // Winner badge
        //
        await awardBadge(
          member.userId,

          position === 1 ? "hackathon-champion" : "hackathon-winner",
        );

        // Recalculate engineering score
        await calculateEngineeringScore(member.userId);
        //
        // Organizer affinity
        //
        await calculateUserAffinity(organizerId, member.userId);

        await calculateUserAffinity(member.userId, organizerId);

        //
        // Team affinity
        //
        await Promise.all(
          submission.team.members.map(async (otherMember) => {
            if (otherMember.userId !== member.userId) {
              await calculateUserAffinity(member.userId, otherMember.userId);
            }
          }),
        );
      }),
    );
  }

  //
  // Lock hackathon
  //
  await prisma.hackathon.update({
    where: {
      id: hackathonId,
    },

    data: {
      status: "COMPLETED",
    },
  });

  return {
    success: true,

    winnersDeclared: winners.length,
  };
};
