import prisma from "shared/database/prisma";

import AppError from "shared/errors/AppError";

import { rankJobCandidates } from "../analytics/candidate-ranking.service";

import { getFastestGrowingEngineers } from "../analytics/leaderboard.service";

export const getRecruiterDashboard = async (recruiterId: string) => {
  // Recruiter
  const recruiter = await prisma.user.findUnique({
    where: {
      id: recruiterId,
    },

    include: {
      profile: true,
    },
  });

  if (!recruiter) {
    throw new AppError("Recruiter not found", 404);
  }

  // Jobs
  const jobs = await prisma.job.findMany({
    where: {
      postedById: recruiterId,
    },

    include: {
      applications: true,
    },

    orderBy: {
      createdAt: "desc",
    },
  });

  // Analytics
  let totalApplications = 0;

  let totalShortlisted = 0;

  let totalInterviews = 0;

  let totalHired = 0;

  for (const job of jobs) {
    totalApplications += job.applications.length;

    totalShortlisted += job.applications.filter(
      (application) => application.status === "SHORTLISTED",
    ).length;

    totalInterviews += job.applications.filter(
      (application) => application.status === "INTERVIEW",
    ).length;

    totalHired += job.applications.filter(
      (application) => application.status === "HIRED",
    ).length;
  }

  // Candidate ranking
  const rankedCandidates = [];

  for (const job of jobs) {
    const ranked = await rankJobCandidates(recruiterId, job.id);

    rankedCandidates.push(...ranked);
  }

  // Remove duplicates
  const uniqueCandidates = new Map();

  for (const candidate of rankedCandidates) {
    const existing = uniqueCandidates.get(candidate.candidate.id);

    if (
      !existing ||
      candidate.fitAnalysis.overallScore > existing.fitAnalysis.overallScore
    ) {
      uniqueCandidates.set(candidate.candidate.id, candidate);
    }
  }

  // Final top candidates
  const topCandidates = Array.from(uniqueCandidates.values())
    .sort((a, b) => b.fitAnalysis.overallScore - a.fitAnalysis.overallScore)
    .slice(0, 10);

  // Average candidate score
  const averageCandidateScore =
    topCandidates.length > 0
      ? topCandidates.reduce(
          (acc, candidate) => acc + candidate.fitAnalysis.overallScore,

          0,
        ) / topCandidates.length
      : 0;

  // Most demanded skills
  const skillMap = new Map();

  for (const job of jobs) {
    for (const skill of job.skillsRequired || []) {
      const count = skillMap.get(skill) || 0;

      skillMap.set(skill, count + 1);
    }
  }

  const mostDemandedSkills = Array.from(skillMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([skill]) => skill);

  // Fastest growing engineers
  const fastestGrowingEngineers = await getFastestGrowingEngineers(5);

  return {
    recruiter: {
      id: recruiter.id,

      username: recruiter.username,

      profile: recruiter.profile,
    },

    analytics: {
      totalJobs: jobs.length,

      totalApplications,

      totalShortlisted,

      totalInterviews,

      totalHired,

      averageCandidateScore: Math.round(averageCandidateScore),
    },

    jobs: jobs.map((job) => ({
      id: job.id,

      title: job.title,

      applicationsCount: job.applications.length,

      shortlistedCount: job.applications.filter(
        (application) => application.status === "SHORTLISTED",
      ).length,

      hiredCount: job.applications.filter(
        (application) => application.status === "HIRED",
      ).length,
    })),

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

export const getJobPipeline = async (recruiterId: string, jobId: string) => {
  const job = await prisma.job.findFirst({
    where: {
      id: jobId,
      postedById: recruiterId,
      deletedAt: null,
    },
    select: {
      id: true,
      title: true,
      skillsRequired: true,
    },
  });

  if (!job) {
    throw new AppError("Job not found or unauthorized", 404);
  }

  const applications = await prisma.jobApplication.findMany({
    where: {
      jobId,
    },
    include: {
      applicant: {
        include: {
          profile: true,
          skills: {
            include: {
              skill: true,
            },
          },
          badges: {
            include: {
              badge: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const allApplicantsIds = applications.map((app) => app.applicantId);
  const experiences = allApplicantsIds.length
    ? await prisma.experience.findMany({
        where: {
          userId: { in: allApplicantsIds },
        },
      })
    : [];

  const experienceMap = new Map<string, typeof experiences>();
  for (const exp of experiences) {
    const list = experienceMap.get(exp.userId) || [];
    list.push(exp);
    experienceMap.set(exp.userId, list);
  }

  const columns: Record<string, any[]> = {
    APPLIED: [],
    VIEWED: [],
    SHORTLISTED: [],
    INTERVIEW: [],
    HIRED: [],
    REJECTED: [],
  };

  const jobSkills = (job.skillsRequired || []).map((s: string) => s.toLowerCase());

  for (const app of applications) {
    const applicant = app.applicant;
    const profile = applicant.profile;
    const applicantSkills = applicant.skills.map((s) => s.skill.name.toLowerCase());
    const matchedSkills = applicantSkills.filter((s) => jobSkills.includes(s));

    const userExps = experienceMap.get(applicant.id) || [];
    const totalExps = userExps.length;
    const verifiedExps = userExps.filter((e) => e.verified).length;
    const suspiciousExps = userExps.filter((e) => e.suspicious).length;

    let totalVerificationScore = 0;
    for (const e of userExps) {
      totalVerificationScore += e.verificationScore || 0;
    }
    const avgVerificationScore = totalExps > 0 ? Math.round(totalVerificationScore / totalExps) : 0;

    const trustBadges = applicant.badges.map((b) => ({
      name: b.badge.name,
      rarity: b.badge.rarity,
      category: b.badge.category,
    }));

    const card = {
      id: app.id,
      status: app.status,
      appliedAt: app.createdAt,
      resumeUrl: app.resumeUrl,
      coverLetter: app.coverLetter,
      recruiterNotes: app.recruiterNotes,
      candidate: {
        id: applicant.id,
        fullName: profile?.fullName || applicant.username,
        username: applicant.username,
        avatarUrl: profile?.avatarUrl,
        headline: profile?.headline,
        engineeringScore: applicant.engineeringScore,
        trustLevel: applicant.trustLevel,
        reputationScore: applicant.reputationScore,
      },
      skillsMatch: {
        matched: matchedSkills,
        totalRequired: jobSkills.length,
        matchPercentage: jobSkills.length > 0 ? Math.round((matchedSkills.length / jobSkills.length) * 100) : 0,
      },
      verificationMetrics: {
        totalExperiences: totalExps,
        verifiedExperiences: verifiedExps,
        suspiciousExperiences: suspiciousExps,
        averageVerificationScore: avgVerificationScore,
        isVerifiedEngineer: applicant.verifiedEngineer,
      },
      badges: trustBadges,
    };

    if (app.status in columns) {
      columns[app.status].push(card);
    } else {
      columns.APPLIED.push(card);
    }
  }

  return {
    job: {
      id: job.id,
      title: job.title,
    },
    pipeline: columns,
  };
};

