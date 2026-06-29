import { describe, test, expect, vi, beforeEach } from "vitest";

vi.mock("shared/database/prisma", () => ({
  default: {
    college: {
      findUnique: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("services/mailQueue", () => ({
  enqueueEmail: vi.fn(),
}));

import prisma from "shared/database/prisma";
import { getPublicBatchStudentsHandler } from "./colleges.controller";
import AppError from "shared/errors/AppError";

vi.mock("shared/utils/asyncHandler", () => ({
  default: (fn: any) =>
    async (req: any, res: any, next: any) => {
      try {
        await fn(req, res, next);
      } catch (err) {
        next(err);
      }
    },
}));

function mockReq(params: Record<string, string> = {}) {
  return { params } as any;
}

function mockRes() {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe("getPublicBatchStudentsHandler tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("returns 400 if graduationYear is not a valid number", async () => {
    const req = mockReq({ collegeId: "college-1", graduationYear: "abc" });
    const res = mockRes();
    const next = vi.fn();

    await getPublicBatchStudentsHandler(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    const error = next.mock.calls[0][0];
    expect(error.statusCode).toBe(400);
    expect(error.message).toContain("Invalid graduation year");
  });

  test("returns 404 if college does not exist", async () => {
    const req = mockReq({ collegeId: "college-invalid", graduationYear: "2026" });
    const res = mockRes();
    const next = vi.fn();

    (prisma.college.findUnique as any).mockResolvedValue(null);

    await getPublicBatchStudentsHandler(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    const error = next.mock.calls[0][0];
    expect(error.statusCode).toBe(404);
    expect(error.message).toContain("College not found");
  });

  test("returns 200 with college data and safe student profiles list", async () => {
    const req = mockReq({ collegeId: "college-ok", graduationYear: "2026" });
    const res = mockRes();
    const next = vi.fn();

    (prisma.college.findUnique as any).mockResolvedValue({ name: "IIT Delhi" });
    
    const mockStudents = [
      {
        id: "s1",
        username: "student1",
        engineeringScore: 92,
        profile: { fullName: "Aarav Sharma", avatarUrl: "avatar1.png" },
        skills: [{ skill: { name: "TypeScript" } }],
      },
    ];
    (prisma.user.findMany as any).mockResolvedValue(mockStudents);

    await getPublicBatchStudentsHandler(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalled();

    const responseBody = res.json.mock.calls[0][0];
    expect(responseBody.data).toEqual({
      collegeName: "IIT Delhi",
      graduationYear: 2026,
      students: mockStudents,
    });
  });
});
