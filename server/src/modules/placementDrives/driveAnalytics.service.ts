import prisma from "shared/database/prisma";
import AppError from "shared/errors/AppError";

export interface PlacementStats {
  summary: {
    totalDrives: number;
    totalApplicants: number;
    totalSelected: number;
    placementPercent: number | null;
    avgPackageLPA: number | null;
    maxPackageLPA: number | null;
    totalInternshipDrives: number;
  };
  byBranch: Array<{
    branch: string;
    total: number;
    selected: number;
    placementPercent: number;
  }>;
  byCompany: Array<{
    companyId: string;
    companyName: string;
    companyLogo?: string | null;
    offers: number;
    avgPackageLPA: number | null;
  }>;
  recentDrives: Array<{
    id: string;
    title: string;
    driveType: string;
    status: string;
    companyName?: string | null;
    applicants: number;
    selected: number;
    driveDate?: string | null;
  }>;
}

export const getCollegePlacementStats = async (
  collegeId: string,
  academicYear?: number,
): Promise<PlacementStats> => {
  // Validate college exists
  const college = await prisma.college.findUnique({
    where: { id: collegeId },
    select: { id: true },
  });
  if (!college) throw new AppError("College not found", 404);

  // ── Date filter bounds ──────────────────────────────────────────────────────
  // Academic year: e.g. 2024 means Aug 2024 – Jul 2025
  let dateFilter: { gte?: Date; lte?: Date } | undefined;
  if (academicYear) {
    dateFilter = {
      gte: new Date(`${academicYear}-08-01T00:00:00Z`),
      lte: new Date(`${academicYear + 1}-07-31T23:59:59Z`),
    };
  }

  // ── Fetch all drives for this college ───────────────────────────────────────
  const drives = await prisma.placementDrive.findMany({
    where: {
      targetCollegeId: collegeId,
      ...(dateFilter ? { driveDate: dateFilter } : {}),
    },
    select: {
      id: true,
      driveTitle: true,
      driveType: true,
      status: true,
      driveDate: true,
      salaryMin: true,
      salaryMax: true,
      companyId: true,
      company: {
        select: {
          name: true,
          logoUrl: true,
        },
      },
      applications: {
        select: {
          id: true,
          status: true,
          user: {
            select: {
              profile: {
                select: {
                  departmentId: true,
                  department: { select: { name: true } },
                },
              },
              educations: {
                where: { collegeId, current: true },
                select: { fieldOfStudy: true, departmentId: true },
                take: 1,
              },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // ── Summary stats ───────────────────────────────────────────────────────────
  const totalDrives = drives.length;
  const totalInternshipDrives = drives.filter((d) => d.driveType === "INTERNSHIP").length;

  let totalApplicants = 0;
  let totalSelected = 0;
  const salaries: number[] = [];

  for (const drive of drives) {
    totalApplicants += drive.applications.length;
    const selectedCount = drive.applications.filter((a) => a.status === "SELECTED").length;
    totalSelected += selectedCount;
    if (selectedCount > 0 && drive.salaryMax) {
      salaries.push(drive.salaryMax);
    } else if (selectedCount > 0 && drive.salaryMin) {
      salaries.push(drive.salaryMin);
    }
  }

  const placementPercent: number | null =
    totalApplicants > 0 ? Math.round((totalSelected / totalApplicants) * 1000) / 10 : null;

  const toLPA = (lakh: number | null): number | null =>
    lakh !== null && lakh !== undefined ? Math.round((lakh / 100000) * 10) / 10 : null;

  const avgPackageLPA: number | null =
    salaries.length > 0
      ? toLPA(Math.round(salaries.reduce((a: number, b: number) => a + b, 0) / salaries.length))
      : null;
  const maxPackageLPA: number | null = salaries.length > 0 ? toLPA(Math.max(...salaries)) : null;

  // ── By branch ───────────────────────────────────────────────────────────────
  const branchMap = new Map<string, { total: number; selected: number }>();

  for (const drive of drives) {
    for (const app of drive.applications) {
      const branch =
        app.user?.educations?.[0]?.fieldOfStudy ||
        app.user?.profile?.department?.name ||
        "Unspecified";
      const current = branchMap.get(branch) || { total: 0, selected: 0 };
      current.total++;
      if (app.status === "SELECTED") current.selected++;
      branchMap.set(branch, current);
    }
  }

  const byBranch = Array.from(branchMap.entries())
    .map(([branch, stats]) => ({
      branch,
      total: stats.total,
      selected: stats.selected,
      placementPercent:
        stats.total > 0 ? Math.round((stats.selected / stats.total) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.total - a.total);

  // ── By company ──────────────────────────────────────────────────────────────
  const companyMap = new Map<
    string,
    { name: string; logo?: string | null; offers: number; packages: number[] }
  >();

  for (const drive of drives) {
    const key = drive.companyId;
    const displayName = drive.company.name;
    const logo = drive.company.logoUrl;
    const existing = companyMap.get(key) || { name: displayName, logo, offers: 0, packages: [] as number[] };

    const selected = drive.applications.filter((a) => a.status === "SELECTED").length;
    existing.offers += selected;
    if (selected > 0 && drive.salaryMax) existing.packages.push(drive.salaryMax);
    companyMap.set(key, existing);
  }

  const byCompany = Array.from(companyMap.entries())
    .filter(([, v]) => v.offers > 0)
    .map(([companyId, v]) => ({
      companyId,
      companyName: v.name,
      companyLogo: v.logo,
      offers: v.offers,
      avgPackageLPA:
        v.packages.length > 0
          ? toLPA(Math.round(v.packages.reduce((a: number, b: number) => a + b, 0) / v.packages.length))
          : null,
    }))
    .sort((a, b) => b.offers - a.offers)
    .slice(0, 10);

  // ── Recent drives ───────────────────────────────────────────────────────────
  const recentDrives = drives.slice(0, 8).map((d) => ({
    id: d.id,
    title: d.driveTitle,
    driveType: d.driveType as string,
    status: d.status,
    companyName: d.company.name,
    applicants: d.applications.length,
    selected: d.applications.filter((a) => a.status === "SELECTED").length,
    driveDate: d.driveDate?.toISOString() || null,
  }));

  return {
    summary: {
      totalDrives,
      totalApplicants,
      totalSelected,
      placementPercent,
      avgPackageLPA,
      maxPackageLPA,
      totalInternshipDrives,
    },
    byBranch,
    byCompany,
    recentDrives,
  };
};

// ─── Student Placement Probability ────────────────────────────────────────────

export interface PlacementProbabilityResult {
  probability: number; // 0–100
  factors: {
    engineeringScore: number;   // 0–40
    cgpa: number;               // 0–25
    verifiedSkills: number;     // 0–20
    liveProjects: number;       // 0–10
    experience: number;         // 0–5
  };
  recommendation: string;
}

/**
 * Computes a student's placement probability (0–100%) using a weighted scoring model.
 * Factors and their max contribution:
 *  - Engineering Score  → 40 pts  (normalized from 0–10,000)
 *  - CGPA               → 25 pts  (CGPA / 10 × 25)
 *  - Verified Skills    → 20 pts  (3 pts per skill, capped at 20)
 *  - Live Projects      → 10 pts  (5 pts each, capped at 10)
 *  - Experience tenure  → 5 pts   (1 pt per 6 months, capped at 5)
 */
export const getStudentPlacementProbability = async (
  userId: string,
): Promise<PlacementProbabilityResult> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      engineeringScore: true,
      // CGPA lives on Education records, not Profile
      educations: {
        select: { cgpa: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      // Verified skills — relation name on User is 'skills' (UserSkill[])
      skills: {
        where: { verified: true },
        select: { id: true },
      },
      // Live projects — relation name on User is 'ownedProjects' (Project[])
      ownedProjects: {
        where: { liveUrl: { not: null } },
        select: { id: true },
        take: 10,
      },
      // Experience tenure
      experiences: {
        select: { startDate: true, endDate: true },
      },
    },
  });

  if (!user) throw new AppError("User not found", 404);

  // ── Factor 1: Engineering Score (0–40) ─────────────────────────────────────
  const rawScore = user.engineeringScore ?? 0;
  const engineeringFactor = Math.min(Math.round((rawScore / 10_000) * 40), 40);

  // ── Factor 2: CGPA (0–25) ──────────────────────────────────────────────────
  const cgpa = user.educations[0]?.cgpa ?? 0;
  const cgpaFactor = Math.min(Math.round((cgpa / 10) * 25), 25);

  // ── Factor 3: Verified Skills (0–20) ──────────────────────────────────────
  const verifiedSkillsCount = user.skills.length;
  const skillsFactor = Math.min(verifiedSkillsCount * 3, 20);

  // ── Factor 4: Live Projects (0–10) ────────────────────────────────────────
  const liveProjectsCount = user.ownedProjects.length;
  const projectsFactor = Math.min(liveProjectsCount * 5, 10);

  // ── Factor 5: Experience tenure in months (0–5) ───────────────────────────
  let totalExperienceMonths = 0;
  for (const exp of user.experiences) {
    if (exp.startDate) {
      const end = exp.endDate ?? new Date();
      const diffMs = end.getTime() - new Date(exp.startDate).getTime();
      totalExperienceMonths += diffMs / (1000 * 60 * 60 * 24 * 30);
    }
  }
  const experienceFactor = Math.min(Math.floor(totalExperienceMonths / 6), 5);

  const probability = engineeringFactor + cgpaFactor + skillsFactor + projectsFactor + experienceFactor;

  // ── Recommendation ────────────────────────────────────────────────────────
  let recommendation: string;
  if (probability >= 80) {
    recommendation = "Highly placeable — strong engineering portfolio and CGPA. Prioritise for referrals.";
  } else if (probability >= 60) {
    recommendation = "Good placement odds. Recommend adding 1–2 more verified projects and verified skills.";
  } else if (probability >= 40) {
    recommendation = "Moderate risk. Improve CGPA if possible, complete profile, and add live project links.";
  } else {
    recommendation = "High placement risk. Needs significant profile improvement before next drive.";
  }

  return {
    probability: Math.min(probability, 100),
    factors: {
      engineeringScore: engineeringFactor,
      cgpa: cgpaFactor,
      verifiedSkills: skillsFactor,
      liveProjects: projectsFactor,
      experience: experienceFactor,
    },
    recommendation,
  };
};
