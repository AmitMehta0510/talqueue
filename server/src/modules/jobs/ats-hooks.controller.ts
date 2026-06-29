import { Request, Response } from "express";
import prisma from "shared/database/prisma";
import AppError from "shared/errors/AppError";
import asyncHandler from "shared/utils/asyncHandler";
import { successResponse } from "shared/utils/apiResponse";
import slugify from "slugify";
import { syncJobsToElasticBulk } from "services/elasticSync";

/**
 * Greenhouse Webhook Handler
 * Endpoint: POST /api/v1/jobs/ats/greenhouse/:companyId
 */
export const greenhouseWebhookHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const companyId = req.params.companyId as string;
    const { action, payload } = req.body;

    // 1. Verify target company exists
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true, name: true, slug: true, headquarters: true, websiteUrl: true },
    });
    if (!company) {
      throw new AppError("Company not found", 404);
    }

    // 2. Validate webhook signature/secret if configured
    const greenhouseSecret = process.env.GREENHOUSE_WEBHOOK_SECRET;
    if (greenhouseSecret) {
      const signature = req.headers["x-greenhouse-signature"];
      const signatureStr = Array.isArray(signature) ? signature[0] : signature;
      if (!signatureStr || signatureStr !== greenhouseSecret) {
        throw new AppError("Invalid Greenhouse webhook signature", 401);
      }
    }

    // 3. Handle action payloads
    if (action === "ping") {
      return res.status(200).json(successResponse({ status: "ok" }, "Greenhouse webhook active"));
    }

    const greenhouseJob = payload?.job;
    if (!greenhouseJob || !greenhouseJob.id) {
      throw new AppError("Malformed Greenhouse webhook payload: missing job info", 400);
    }

    const externalId = String(greenhouseJob.id);
    const title = greenhouseJob.name || "Software Engineer";
    const status = greenhouseJob.status === "open" ? "OPEN" : "CLOSED";
    const location = greenhouseJob.offices?.[0]?.name || company.headquarters || "Remote";
    const description = greenhouseJob.notes || "Apply on company's careers site.";
    const applyUrl = company.websiteUrl ? `${company.websiteUrl}/careers` : null;

    const slug = slugify(`${company.slug}-${title}-${externalId}`, { lower: true, strict: true });

    // 4. Upsert Job record
    const job = await prisma.job.upsert({
      where: { slug },
      create: {
        companyId: company.id,
        title,
        slug,
        description,
        requirements: "See description for details.",
        responsibilities: "See description for details.",
        location,
        type: "FULL_TIME",
        workMode: "ONSITE",
        applyUrl,
        skillsRequired: [],
        status,
        externalJobId: externalId,
        atsSource: "greenhouse",
      },
      update: {
        title,
        description,
        location,
        status,
        atsSource: "greenhouse",
      },
    });

    // 5. Sync to Elasticsearch index
    try {
      await syncJobsToElasticBulk([job.id]);
    } catch (err) {
      console.error("[Greenhouse Webhook] Elasticsearch sync failure:", err);
    }

    return res.status(200).json(
      successResponse(
        { jobId: job.id, status: job.status },
        `Greenhouse job ${action} processed successfully`
      )
    );
  }
);

/**
 * Lever Webhook Handler
 * Endpoint: POST /api/v1/jobs/ats/lever/:companyId
 */
export const leverWebhookHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const companyId = req.params.companyId as string;
    const { event, data } = req.body;

    // 1. Verify target company exists
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true, name: true, slug: true, headquarters: true, websiteUrl: true },
    });
    if (!company) {
      throw new AppError("Company not found", 404);
    }

    // 2. Validate Lever Signature if webhook secret configured
    const leverSecret = process.env.LEVER_WEBHOOK_SECRET;
    if (leverSecret) {
      const signature = req.headers["x-lever-signature"];
      const signatureStr = Array.isArray(signature) ? signature[0] : signature;
      if (!signatureStr || signatureStr !== leverSecret) {
        throw new AppError("Invalid Lever webhook signature", 401);
      }
    }

    // 3. Process candidate stage change or job events
    if (event === "ping") {
      return res.status(200).json(successResponse({ status: "ok" }, "Lever webhook active"));
    }

    if (!data || !data.id) {
      throw new AppError("Malformed Lever webhook payload: missing job info", 400);
    }

    const externalId = String(data.id);
    const title = data.text || "Software Engineer";
    const status = data.state === "published" ? "OPEN" : "CLOSED";
    const location = data.categories?.location || company.headquarters || "Remote";
    const description = data.description || "Apply on company's careers site.";
    const applyUrl = data.hostedUrl || (company.websiteUrl ? `${company.websiteUrl}/careers` : null);

    const slug = slugify(`${company.slug}-${title}-${externalId}`, { lower: true, strict: true });

    // 4. Upsert Job record
    const job = await prisma.job.upsert({
      where: { slug },
      create: {
        companyId: company.id,
        title,
        slug,
        description,
        requirements: "See description for details.",
        responsibilities: "See description for details.",
        location,
        type: "FULL_TIME",
        workMode: "ONSITE",
        applyUrl,
        skillsRequired: [],
        status,
        externalJobId: externalId,
        atsSource: "lever",
      },
      update: {
        title,
        description,
        location,
        status,
        applyUrl,
        atsSource: "lever",
      },
    });

    // 5. Sync to Elasticsearch index
    try {
      await syncJobsToElasticBulk([job.id]);
    } catch (err) {
      console.error("[Lever Webhook] Elasticsearch sync failure:", err);
    }

    return res.status(200).json(
      successResponse(
        { jobId: job.id, status: job.status },
        `Lever job ${event} processed successfully`
      )
    );
  }
);
