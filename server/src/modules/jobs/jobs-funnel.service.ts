/**
 * @file modules/jobs/jobs-funnel.service.ts
 *
 * Job Application Funnel Analytics — Recruiter Dashboard
 * ────────────────────────────────────────────────────────
 * Provides funnel and pipeline metrics for recruiters viewing their own posted jobs.
 *
 * Two views:
 *   1. Portfolio summary  — getRecruiterFunnelSummary()
 *      Aggregate across ALL jobs posted by this recruiter.
 *      → total views, saves, applies, shortlisted, hired, avg. conversion rate.
 *
 *   2. Per-job deep dive  — getJobFunnelAnalytics(jobId, recruiterId)
 *      Full funnel + daily application timeline + status breakdown.
 *      Auth-guarded: only the recruiter who posted the job can see it.
 *
 * Data sources:
 *   - Job.views               (incremented on each job detail view)
 *   - SavedJob rows           (users who saved the job)
 *   - JobApplication rows     (grouped by status)
 *   - JobApplication.shortlistedAt / interviewScheduledAt / hiredAt / rejectedAt
 *
 * No external analytics DB needed — queries Postgres via Prisma.
 * Query complexity is low: indexed on jobId, postedById, status.
 */

import prisma from "shared/database/prisma";
import AppError from "shared/errors/AppError";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FunnelStage {
  stage:           string;
  count:           number;
  conversionRate:  number | null;  // % from previous stage, null for first stage
}

export interface JobFunnelSummary {
  jobId:            string;
  jobTitle:         string;
  jobSlug:          string;
  status:           string;
  postedAt:         Date;
  views:            number;
  saves:            number;
  applications:     number;
  shortlisted:      number;
  interview:        number;
  hired:            number;
  rejected:         number;
  applyRate:        number;   // applications / views %
  shortlistRate:    number;   // shortlisted / applications %
  hireRate:         number;   // hired / applications %
}

export interface DailyApplicationPoint {
  date:  string;   // "YYYY-MM-DD"
  count: number;
}

export interface ApplicantRow {
  applicationId:   string;
  applicantId:     string;
  fullName:        string;
  avatarUrl:       string | null;
  headline:        string | null;
  reputationScore: number;
  engineeringScore: number;
  status:          string;
  appliedAt:       Date;
  shortlistedAt:   Date | null;
  interviewAt:     Date | null;
  hiredAt:         Date | null;
  rejectedAt:      Date | null;
  resumeUrl:       string | null;
  coverLetter:     string | null;
}

export interface JobFunnelAnalytics {
  job: {
    id:          string;
    title:       string;
    slug:        string;
    status:      string;
    postedAt:    Date;
    closingAt:   Date | null;
    workMode:    string | null;
    type:        string;
    location:    string | null;
    company:     { name: string; logoUrl: string | null };
  };
  funnel:          FunnelStage[];
  statusBreakdown: Record<string, number>;
  dailyTimeline:   DailyApplicationPoint[];
  applicants:      ApplicantRow[];
  topSkillsApplied: { skill: string; count: number }[];
}

// ─── Auth guard ───────────────────────────────────────────────────────────────

async function assertJobOwnership(jobId: string, recruiterId: string) {
  const job = await prisma.job.findUnique({
    where:  { id: jobId },
    select: { id: true, postedById: true, deletedAt: true },
  });
  if (!job || job.deletedAt) throw new AppError("Job not found", 404);
  if (job.postedById !== recruiterId) {
    throw new AppError("You do not have access to this job's analytics", 403);
  }
  return job;
}

// ─── Portfolio summary (all jobs) ────────────────────────────────────────────

/**
 * Returns aggregate funnel metrics across ALL jobs posted by this recruiter.
 * Sorted by most recently posted.
 */
export async function getRecruiterFunnelSummary(
  recruiterId: string,
): Promise<{
  summary: JobFunnelSummary[];
  totals: {
    totalViews:       number;
    totalSaves:       number;
    totalApplications: number;
    totalShortlisted:  number;
    totalHired:        number;
    avgApplyRate:      number;
    avgShortlistRate:  number;
    avgHireRate:       number;
  };
}> {
  // Fetch all active jobs with status breakdowns in one parallel query
  const [jobs, applications, saves] = await Promise.all([
    prisma.job.findMany({
      where:   { postedById: recruiterId, deletedAt: null },
      select: {
        id: true, title: true, slug: true,
        status: true, views: true, createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    }),

    prisma.jobApplication.groupBy({
      by:   ["jobId", "status"],
      where: {
        job: { postedById: recruiterId, deletedAt: null },
      },
      _count: { id: true },
    }),

    prisma.savedJob.groupBy({
      by:   ["jobId"],
      where: { job: { postedById: recruiterId, deletedAt: null } },
      _count: { id: true },
    }),
  ]);

  // Index application counts by jobId+status
  const appCountMap = new Map<string, Record<string, number>>();
  for (const row of applications) {
    const key = row.jobId;
    if (!appCountMap.has(key)) appCountMap.set(key, {});
    appCountMap.get(key)![row.status] = row._count.id;
  }

  // Index save counts by jobId
  const saveMap = new Map<string, number>(saves.map((s) => [s.jobId, s._count.id]));

  const summary: JobFunnelSummary[] = jobs.map((job) => {
    const counts = appCountMap.get(job.id) ?? {};
    const views        = job.views;
    const savedCount   = saveMap.get(job.id) ?? 0;
    const appCount     = Object.values(counts).reduce((a, b) => a + b, 0);
    const shortlisted  = counts["SHORTLISTED"] ?? 0;
    const interview    = counts["INTERVIEW"]   ?? 0;
    const hired        = counts["HIRED"]       ?? 0;
    const rejected     = counts["REJECTED"]    ?? 0;

    return {
      jobId:          job.id,
      jobTitle:       job.title,
      jobSlug:        job.slug,
      status:         job.status,
      postedAt:       job.createdAt,
      views,
      saves:          savedCount,
      applications:   appCount,
      shortlisted,
      interview,
      hired,
      rejected,
      applyRate:      views > 0  ? +(appCount    / views  * 100).toFixed(1) : 0,
      shortlistRate:  appCount > 0 ? +(shortlisted / appCount * 100).toFixed(1) : 0,
      hireRate:       appCount > 0 ? +(hired       / appCount * 100).toFixed(1) : 0,
    };
  });

  // Aggregate totals
  const totals = summary.reduce(
    (acc, j) => ({
      totalViews:        acc.totalViews        + j.views,
      totalSaves:        acc.totalSaves        + j.saves,
      totalApplications: acc.totalApplications + j.applications,
      totalShortlisted:  acc.totalShortlisted  + j.shortlisted,
      totalHired:        acc.totalHired        + j.hired,
      avgApplyRate:      0,
      avgShortlistRate:  0,
      avgHireRate:       0,
    }),
    { totalViews: 0, totalSaves: 0, totalApplications: 0, totalShortlisted: 0, totalHired: 0, avgApplyRate: 0, avgShortlistRate: 0, avgHireRate: 0 },
  );

  totals.avgApplyRate = totals.totalViews > 0
    ? +(totals.totalApplications / totals.totalViews * 100).toFixed(1) : 0;
  totals.avgShortlistRate = totals.totalApplications > 0
    ? +(totals.totalShortlisted  / totals.totalApplications * 100).toFixed(1) : 0;
  totals.avgHireRate = totals.totalApplications > 0
    ? +(totals.totalHired        / totals.totalApplications * 100).toFixed(1) : 0;

  return { summary, totals };
}

// ─── Per-job deep dive ────────────────────────────────────────────────────────

/**
 * Full funnel analytics for a single job.
 * Auth-guarded: only the posting recruiter can call this.
 */
export async function getJobFunnelAnalytics(
  jobId:       string,
  recruiterId: string,
): Promise<JobFunnelAnalytics> {
  await assertJobOwnership(jobId, recruiterId);

  const [job, applications, saves] = await Promise.all([
    prisma.job.findUnique({
      where:  { id: jobId },
      select: {
        id: true, title: true, slug: true, status: true,
        views: true, createdAt: true, applicationDeadline: true,
        workMode: true, type: true, location: true,
        company: { select: { name: true, logoUrl: true } },
      },
    }),

    prisma.jobApplication.findMany({
      where:  { jobId },
      select: {
        id: true, status: true, createdAt: true,
        shortlistedAt: true, interviewScheduledAt: true,
        hiredAt: true, rejectedAt: true,
        resumeUrl: true, coverLetter: true,
        applicant: {
          select: {
            id: true, reputationScore: true, engineeringScore: true,
            profile: { select: { fullName: true, avatarUrl: true, headline: true } },
            skills: {
              select: { skill: { select: { name: true } } },
              take: 5,
              orderBy: { createdAt: "desc" },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),

    prisma.savedJob.count({ where: { jobId } }),
  ]);

  if (!job) throw new AppError("Job not found", 404);

  // ── Status breakdown ─────────────────────────────────────────────────────────
  const statusBreakdown: Record<string, number> = {};
  for (const app of applications) {
    statusBreakdown[app.status] = (statusBreakdown[app.status] ?? 0) + 1;
  }

  const totalApps   = applications.length;
  const views       = job.views;
  const shortlisted = statusBreakdown["SHORTLISTED"] ?? 0;
  const interview   = statusBreakdown["INTERVIEW"]   ?? 0;
  const hired       = statusBreakdown["HIRED"]       ?? 0;
  const rejected    = statusBreakdown["REJECTED"]    ?? 0;

  // ── Funnel ───────────────────────────────────────────────────────────────────
  const funnel: FunnelStage[] = [
    { stage: "Views",       count: views,       conversionRate: null },
    { stage: "Saves",       count: saves,       conversionRate: views      > 0 ? +(saves       / views      * 100).toFixed(1) : null },
    { stage: "Applications",count: totalApps,   conversionRate: views      > 0 ? +(totalApps   / views      * 100).toFixed(1) : null },
    { stage: "Shortlisted", count: shortlisted, conversionRate: totalApps  > 0 ? +(shortlisted / totalApps  * 100).toFixed(1) : null },
    { stage: "Interview",   count: interview,   conversionRate: shortlisted > 0 ? +(interview   / shortlisted * 100).toFixed(1) : null },
    { stage: "Hired",       count: hired,       conversionRate: interview  > 0 ? +(hired       / interview  * 100).toFixed(1) : null },
  ];

  // ── Daily timeline (applications per day) ────────────────────────────────────
  const dailyMap = new Map<string, number>();
  for (const app of applications) {
    const day = app.createdAt.toISOString().split("T")[0];
    dailyMap.set(day, (dailyMap.get(day) ?? 0) + 1);
  }
  const dailyTimeline: DailyApplicationPoint[] = [...dailyMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));

  // ── Top skills among applicants ───────────────────────────────────────────────
  const skillCounter = new Map<string, number>();
  for (const app of applications) {
    for (const us of app.applicant.skills) {
      const name = us.skill.name;
      skillCounter.set(name, (skillCounter.get(name) ?? 0) + 1);
    }
  }
  const topSkillsApplied = [...skillCounter.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([skill, count]) => ({ skill, count }));

  // ── Applicant rows ───────────────────────────────────────────────────────────
  const applicants: ApplicantRow[] = applications.map((app) => ({
    applicationId:    app.id,
    applicantId:      app.applicant.id,
    fullName:         app.applicant.profile?.fullName ?? "Unknown",
    avatarUrl:        app.applicant.profile?.avatarUrl ?? null,
    headline:         app.applicant.profile?.headline ?? null,
    reputationScore:  app.applicant.reputationScore,
    engineeringScore: app.applicant.engineeringScore,
    status:           app.status,
    appliedAt:        app.createdAt,
    shortlistedAt:    app.shortlistedAt,
    interviewAt:      app.interviewScheduledAt,
    hiredAt:          app.hiredAt,
    rejectedAt:       app.rejectedAt,
    resumeUrl:        app.resumeUrl,
    coverLetter:      app.coverLetter,
  }));

  return {
    job: {
      id:        job.id,
      title:     job.title,
      slug:      job.slug,
      status:    job.status,
      postedAt:  job.createdAt,
      closingAt: job.applicationDeadline,
      workMode:  job.workMode,
      type:      job.type,
      location:  job.location,
      company:   job.company,
    },
    funnel,
    statusBreakdown,
    dailyTimeline,
    applicants,
    topSkillsApplied,
  };
}
