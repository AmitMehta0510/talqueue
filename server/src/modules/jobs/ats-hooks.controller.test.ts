import { describe, test, expect, vi, beforeEach } from "vitest";

// Mock imports before controller evaluation
vi.mock("shared/database/prisma", () => ({
  default: {
    company: {
      findUnique: vi.fn(),
    },
    job: {
      upsert: vi.fn(),
    },
  },
}));

vi.mock("services/elasticSync", () => ({
  syncJobsToElasticBulk: vi.fn().mockResolvedValue(undefined),
}));

import prisma from "shared/database/prisma";
import {
  greenhouseWebhookHandler,
  leverWebhookHandler,
} from "./ats-hooks.controller";
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

describe("ATS Integration Webhook Handlers", () => {
  let req: any;
  let res: any;
  let next: any;

  beforeEach(() => {
    vi.clearAllMocks();
    req = {
      params: { companyId: "comp-123" },
      body: {},
      headers: {},
    };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    next = vi.fn();
  });

  describe("Greenhouse Webhook", () => {
    test("should fail if company does not exist", async () => {
      vi.mocked(prisma.company.findUnique).mockResolvedValue(null);

      await greenhouseWebhookHandler(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(404);
      expect(error.message).toBe("Company not found");
    });

    test("should verify ping action successfully", async () => {
      vi.mocked(prisma.company.findUnique).mockResolvedValue({
        id: "comp-123",
        name: "Test Corp",
        slug: "test-corp",
      } as any);

      req.body = { action: "ping" };

      await greenhouseWebhookHandler(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "Greenhouse webhook active",
        })
      );
    });

    test("should reject missing job details payload", async () => {
      vi.mocked(prisma.company.findUnique).mockResolvedValue({
        id: "comp-123",
        name: "Test Corp",
        slug: "test-corp",
      } as any);

      req.body = { action: "job_post_created", payload: {} };

      await greenhouseWebhookHandler(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(400);
    });

    test("should upsert greenhouse job posting successfully", async () => {
      vi.mocked(prisma.company.findUnique).mockResolvedValue({
        id: "comp-123",
        name: "Test Corp",
        slug: "test-corp",
        headquarters: "Mumbai",
        websiteUrl: "https://testcorp.com",
      } as any);

      req.body = {
        action: "job_post_created",
        payload: {
          job: {
            id: 8877,
            name: "Backend Developer",
            status: "open",
            notes: "Remote allowed",
            offices: [{ name: "Mumbai" }],
          },
        },
      };

      vi.mocked(prisma.job.upsert).mockResolvedValue({
        id: "job-8877",
        status: "OPEN",
      } as any);

      await greenhouseWebhookHandler(req, res, next);

      expect(prisma.job.upsert).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: { jobId: "job-8877", status: "OPEN" },
        })
      );
    });
  });

  describe("Lever Webhook", () => {
    test("should process lever webhook ping events", async () => {
      vi.mocked(prisma.company.findUnique).mockResolvedValue({
        id: "comp-123",
        name: "Test Corp",
        slug: "test-corp",
      } as any);

      req.body = { event: "ping" };

      await leverWebhookHandler(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "Lever webhook active",
        })
      );
    });

    test("should upsert lever job updates successfully", async () => {
      vi.mocked(prisma.company.findUnique).mockResolvedValue({
        id: "comp-123",
        name: "Test Corp",
        slug: "test-corp",
        websiteUrl: "https://testcorp.com",
      } as any);

      req.body = {
        event: "jobCreated",
        data: {
          id: "lever-99",
          text: "Infrastructure Engineer",
          state: "published",
          description: "Scale things",
          categories: { location: "Remote" },
        },
      };

      vi.mocked(prisma.job.upsert).mockResolvedValue({
        id: "job-lever-99",
        status: "OPEN",
      } as any);

      await leverWebhookHandler(req, res, next);

      expect(prisma.job.upsert).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: { jobId: "job-lever-99", status: "OPEN" },
        })
      );
    });
  });
});
