import prisma from "shared/database/prisma";

export const calculateProjectScore = (project: any) => {
  let score = 0;

  if (project.verified) {
    score += 100;
  }

  if (project.status === "COMPLETED") {
    score += 50;
  }

  if (project.liveUrl) {
    score += 40;
  }

  if (project.githubUrl) {
    score += 30;
  }

  score += project.contributorsCount * 5;

  score += Math.min(project.starsCount || 0, 50);

  score += (project.forksCount || 0) * 2;

  if (project.hackathonSubmissions) {
    score += project.hackathonSubmissions.length * 20;
  }

  const freshnessDate =
    project.repoUpdatedAt || project.createdAt;

  if (freshnessDate) {
    const daysOld = Math.floor(
      (Date.now() -
        new Date(freshnessDate).getTime()) /
        (1000 * 60 * 60 * 24),
    );

    score += Math.max(30 - daysOld, 0);
  }

  if (project.status === "ARCHIVED") {
    score -= 30;
  }

  return score;
};

export const getProjectTrustLevel = (
  score: number,
) => {
  if (score >= 200) {
    return "ELITE";
  }

  if (score >= 120) {
    return "HIGH";
  }

  if (score >= 60) {
    return "MEDIUM";
  }

  return "LOW";
};

export const getProjectMembers = async (
  projectId: string,
) => {
  return prisma.projectMember.findMany({
    where: {
      projectId,
    },

    select: {
      userId: true,
    },
  });
};