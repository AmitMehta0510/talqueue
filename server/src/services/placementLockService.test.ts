import { describe, test, expect, vi, beforeEach } from "vitest";
import prisma from "shared/database/prisma";
import { processPlacementSelection } from "./placementLockService";
import { PlacementDriveApplicationStatus, CollegeOfferPolicy } from "@prisma/client";

vi.mock("shared/database/prisma", () => {
  return {
    default: {
      $transaction: vi.fn(),
      placementDriveApplication: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
        groupBy: vi.fn(),
      },
      college: {
        findUnique: vi.fn(),
      },
      education: {
        count: vi.fn(),
      },
    },
  };
});

describe("Placement Lock Service & Policy Engine", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    
    // Mock $transaction to simply run the callback with the mocked prisma client
    vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
      return callback(prisma);
    });

    vi.mocked(prisma.placementDriveApplication.groupBy).mockResolvedValue([]);
  });

  test("should update status to SELECTED and not trigger freeze lock if policy allows it", async () => {
    // Student has no other selected applications
    vi.mocked(prisma.placementDriveApplication.findUnique).mockResolvedValueOnce({
      id: "app-1",
      userId: "student-1",
      driveId: "drive-1",
      status: PlacementDriveApplicationStatus.APPLIED,
      drive: {
        id: "drive-1",
        driveTitle: "Dream Corp",
        targetCollegeId: "college-1",
        isDreamCompany: true,
        salaryMax: 1200000,
        salaryMin: 1000000,
        college: {
          id: "college-1",
          offerPolicy: CollegeOfferPolicy.DREAM_EXCEPTION,
        },
      },
    } as any);

    // No existing SELECTED applications
    vi.mocked(prisma.placementDriveApplication.findMany).mockResolvedValueOnce([]); // for isStudentLocked
    vi.mocked(prisma.placementDriveApplication.findMany).mockResolvedValueOnce([]); // for evaluatePolicyLock

    // Mock College offerPolicy query inside evaluatePolicyLock / isStudentLocked
    vi.mocked(prisma.college.findUnique).mockResolvedValue({
      id: "college-1",
      offerPolicy: CollegeOfferPolicy.DREAM_EXCEPTION,
    } as any);

    const updateMock = vi.mocked(prisma.placementDriveApplication.update).mockResolvedValueOnce({
      id: "app-1",
      status: PlacementDriveApplicationStatus.SELECTED,
      drive: { id: "drive-1", driveTitle: "Dream Corp", targetCollegeId: "college-1" },
    } as any);

    const result = await processPlacementSelection("student-1", "drive-1", 1200000);

    expect(result.application.status).toBe(PlacementDriveApplicationStatus.SELECTED);
    expect(result.locked).toBe(false);
    expect(updateMock).toHaveBeenCalledWith({
      where: { id: "app-1" },
      data: { status: PlacementDriveApplicationStatus.SELECTED },
      include: {
        drive: {
          select: { id: true, driveTitle: true, targetCollegeId: true },
        },
      },
    });
    expect(prisma.placementDriveApplication.updateMany).not.toHaveBeenCalled();
  });

  test("should throw error if the student is already locked due to prior selection freeze", async () => {
    vi.mocked(prisma.placementDriveApplication.findUnique).mockResolvedValueOnce({
      id: "app-2",
      userId: "student-1",
      driveId: "drive-2",
      status: PlacementDriveApplicationStatus.APPLIED,
      drive: {
        id: "drive-2",
        targetCollegeId: "college-1",
        college: { id: "college-1", offerPolicy: CollegeOfferPolicy.ONE_OFFER_LOCK },
      },
    } as any);

    // Mock college policy
    vi.mocked(prisma.college.findUnique).mockResolvedValue({
      id: "college-1",
      offerPolicy: CollegeOfferPolicy.ONE_OFFER_LOCK,
    } as any);

    // Student has a SELECTED application in a non-dream company (which causes a lock)
    vi.mocked(prisma.placementDriveApplication.findMany).mockResolvedValueOnce([
      {
        id: "app-old",
        status: PlacementDriveApplicationStatus.SELECTED,
        drive: {
          id: "drive-old",
          driveTitle: "Service Corp",
          isDreamCompany: false,
          salaryMax: 400000,
        },
      },
    ] as any);

    await expect(
      processPlacementSelection("student-1", "drive-2", 600000)
    ).rejects.toThrow("Student is already locked due to a prior selection freeze");
  });

  test("should trigger lock and withdraw other applications if package is above superDreamThreshold", async () => {
    vi.mocked(prisma.placementDriveApplication.findUnique).mockResolvedValueOnce({
      id: "app-3",
      userId: "student-2",
      driveId: "drive-3",
      status: PlacementDriveApplicationStatus.APPLIED,
      drive: {
        id: "drive-3",
        targetCollegeId: "college-1",
        isDreamCompany: true, // is a dream company, but package meets super dream
        college: { id: "college-1", offerPolicy: CollegeOfferPolicy.DREAM_EXCEPTION },
      },
    } as any);

    vi.mocked(prisma.college.findUnique).mockResolvedValue({
      id: "college-1",
      offerPolicy: CollegeOfferPolicy.DREAM_EXCEPTION,
    } as any);

    // No existing SELECTED applications
    vi.mocked(prisma.placementDriveApplication.findMany).mockResolvedValueOnce([]); // for isStudentLocked
    vi.mocked(prisma.placementDriveApplication.findMany).mockResolvedValueOnce([]); // for evaluatePolicyLock

    vi.mocked(prisma.placementDriveApplication.update).mockResolvedValueOnce({
      id: "app-3",
      status: PlacementDriveApplicationStatus.SELECTED,
      drive: { id: "drive-3", driveTitle: "Super Dream Corp", targetCollegeId: "college-1" },
    } as any);

    const updateManyMock = vi.mocked(prisma.placementDriveApplication.updateMany).mockResolvedValueOnce({ count: 2 } as any);

    const result = await processPlacementSelection("student-2", "drive-3", 1600000); // 16 LPA (exceeds default 15 LPA super dream)

    expect(result.locked).toBe(true);
    expect(result.freezeReason).toContain("Super Dream threshold");
    expect(updateManyMock).toHaveBeenCalledWith({
      where: {
        userId: "student-2",
        status: {
          in: [
            PlacementDriveApplicationStatus.APPLIED,
            PlacementDriveApplicationStatus.SHORTLISTED,
            PlacementDriveApplicationStatus.INTERVIEW_R1,
            PlacementDriveApplicationStatus.INTERVIEW_R2,
            PlacementDriveApplicationStatus.INTERVIEW_R3,
          ],
        },
        NOT: { driveId: "drive-3" },
      },
      data: {
        status: PlacementDriveApplicationStatus.WITHDRAWN,
      },
    });
  });

  test("should lock under ONE_OFFER_LOCK policy when selected for a non-dream company", async () => {
    vi.mocked(prisma.placementDriveApplication.findUnique).mockResolvedValueOnce({
      id: "app-4",
      userId: "student-3",
      driveId: "drive-4",
      status: PlacementDriveApplicationStatus.APPLIED,
      drive: {
        id: "drive-4",
        targetCollegeId: "college-2",
        isDreamCompany: false,
        college: { id: "college-2", offerPolicy: CollegeOfferPolicy.ONE_OFFER_LOCK },
      },
    } as any);

    vi.mocked(prisma.college.findUnique).mockResolvedValue({
      id: "college-2",
      offerPolicy: CollegeOfferPolicy.ONE_OFFER_LOCK,
    } as any);

    vi.mocked(prisma.placementDriveApplication.findMany).mockResolvedValueOnce([]); // for isStudentLocked
    vi.mocked(prisma.placementDriveApplication.findMany).mockResolvedValueOnce([]); // for evaluatePolicyLock

    vi.mocked(prisma.placementDriveApplication.update).mockResolvedValueOnce({
      id: "app-4",
      status: PlacementDriveApplicationStatus.SELECTED,
      drive: { id: "drive-4", driveTitle: "Regular Corp", targetCollegeId: "college-2" },
    } as any);

    const updateManyMock = vi.mocked(prisma.placementDriveApplication.updateMany).mockResolvedValueOnce({ count: 1 } as any);

    const result = await processPlacementSelection("student-3", "drive-4", 600000);

    expect(result.locked).toBe(true);
    expect(result.freezeReason).toContain("ONE_OFFER_LOCK and this is not a dream company");
    expect(updateManyMock).toHaveBeenCalled();
  });
});
