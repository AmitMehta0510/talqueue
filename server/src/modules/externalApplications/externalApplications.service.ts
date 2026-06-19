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
  // If jobId provided, verify the job exists and prevent duplicate tracking
  if (data.jobId) {
    const [job, existing] = await Promise.all([
      prisma.job.findUnique({
        where: { id: data.jobId },
        select: { id: true },
      }),
      prisma.externalJobApplication.findFirst({
        where: { userId, jobId: data.jobId },
        select: { id: true },
      }),
    ]);
    if (!job) throw new AppError("Job not found", 404);
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
export const getMyExternalApplications = async (
  userId: string,
  page = 1,
  limit = 20,
) => {
  const safeLimit = Math.min(limit, 50);
  const skip = (page - 1) * safeLimit;

  return prisma.externalJobApplication.findMany({
    where: { userId },
    orderBy: { appliedAt: "desc" },
    skip,
    take: safeLimit,
  });
};

// UPDATE STATUS
export const updateExternalApplicationStatus = async (
  userId: string,
  id: string,
  data: UpdateExternalApplicationData,
) => {
  try {
    return await prisma.externalJobApplication.update({
      where: {
        id_userId: { id, userId },
      },
      data: {
        status: data.status,
        notes: data.notes !== undefined ? data.notes : undefined,
      },
    });
  } catch (err: any) {
    if (err.code === "P2025") {
      throw new AppError("Application not found", 404);
    }
    throw err;
  }
};

// DELETE
export const deleteExternalApplication = async (userId: string, id: string) => {
  try {
    return await prisma.externalJobApplication.delete({
      where: {
        id_userId: { id, userId },
      },
    });
  } catch (err: any) {
    if (err.code === "P2025") {
      throw new AppError("Application not found", 404);
    }
    throw err;
  }
};
