import prisma from "shared/database/prisma";
import AppError from "shared/errors/AppError";

interface CreateExternalApplicationData {
  jobId?: string;
  jobTitle: string;
  companyName: string;
  companyLogoUrl?: string;
  applyUrl?: string;
  location?: string;
  jobType?: string;
  status?: "APPLIED" | "PHONE_SCREEN" | "TECHNICAL_ROUND" | "HR_ROUND" | "OFFER_RECEIVED" | "REJECTED" | "WITHDRAWN";
  notes?: string;
  appliedAt?: string;
}

interface UpdateExternalApplicationData {
  status: "APPLIED" | "PHONE_SCREEN" | "TECHNICAL_ROUND" | "HR_ROUND" | "OFFER_RECEIVED" | "REJECTED" | "WITHDRAWN";
  notes?: string;
}

// CREATE
export const createExternalApplication = async (
  userId: string,
  data: CreateExternalApplicationData,
) => {
  // If jobId provided, verify the job exists
  if (data.jobId) {
    const job = await prisma.job.findUnique({
      where: { id: data.jobId },
      select: { id: true },
    });
    if (!job) throw new AppError("Job not found", 404);
  }

  // Prevent duplicate external tracking for same job
  if (data.jobId) {
    const existing = await prisma.externalJobApplication.findFirst({
      where: { userId, jobId: data.jobId },
      select: { id: true },
    });
    if (existing) throw new AppError("Already tracking this application", 400);
  }

  return prisma.externalJobApplication.create({
    data: {
      userId,
      jobId: data.jobId || null,
      jobTitle: data.jobTitle,
      companyName: data.companyName,
      companyLogoUrl: data.companyLogoUrl,
      applyUrl: data.applyUrl,
      location: data.location,
      jobType: data.jobType,
      status: data.status || "APPLIED",
      notes: data.notes,
      appliedAt: data.appliedAt ? new Date(data.appliedAt) : new Date(),
    },
  });
};

// GET MINE
export const getMyExternalApplications = async (userId: string) => {
  return prisma.externalJobApplication.findMany({
    where: { userId },
    orderBy: { appliedAt: "desc" },
  });
};

// UPDATE STATUS
export const updateExternalApplicationStatus = async (
  userId: string,
  id: string,
  data: UpdateExternalApplicationData,
) => {
  const record = await prisma.externalJobApplication.findFirst({
    where: { id, userId },
    select: { id: true },
  });

  if (!record) throw new AppError("Application not found", 404);

  return prisma.externalJobApplication.update({
    where: { id },
    data: {
      status: data.status,
      notes: data.notes !== undefined ? data.notes : undefined,
    },
  });
};

// DELETE
export const deleteExternalApplication = async (userId: string, id: string) => {
  const record = await prisma.externalJobApplication.findFirst({
    where: { id, userId },
    select: { id: true },
  });

  if (!record) throw new AppError("Application not found", 404);

  return prisma.externalJobApplication.delete({ where: { id } });
};
