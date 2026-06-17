import { Request, Response, NextFunction } from "express";
import * as service from "./placementDrives.service";
import { PlacementDriveApplicationStatus } from "@prisma/client";
import asyncHandler from "shared/utils/asyncHandler";

export const createPlacementDrive = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.createPlacementDrive(req.user!.id, req.body);
  res.status(201).json({ success: true, data: result });
});

export const getDrivesForCollege = asyncHandler(async (req: Request, res: Response) => {
  const collegeId = req.params.collegeId as string;
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const result = await service.getDrivesForCollege(collegeId, page, limit);
  res.json({ success: true, data: result });
});

export const getAllDrivesForCollege = asyncHandler(async (req: Request, res: Response) => {
  const { collegeId } = req.params;
  const isTpoOrCdcr = await service.isCollegeAdminOrCdcr(req.user!.id, collegeId as string);
  if (!isTpoOrCdcr) {
    res.status(403).json({ success: false, message: "Unauthorized" });
    return;
  }
  const result = await service.getAllDrivesForCollege(collegeId as string);
  res.json({ success: true, data: result });
});

export const getMyPostedDrives = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.getMyPostedDrives(req.user!.id);
  res.json({ success: true, data: result });
});

export const updatePlacementDrive = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.updatePlacementDrive(req.user!.id, req.params.id as string, req.body);
  res.json({ success: true, data: result });
});

export const closePlacementDrive = asyncHandler(async (req: Request, res: Response) => {
  await service.closePlacementDrive(req.user!.id, req.params.id as string);
  res.json({ success: true });
});

// ─── ELIGIBILITY PRE-CHECK ───────────────────────────────────────────────────

export const checkEligibility = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.checkDriveEligibility(req.user!.id, req.params.id as string);
  res.json({ success: true, data: result });
});

// ─── STUDENT APPLICATIONS ────────────────────────────────────────────────────

export const applyToDrive = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.applyToDrive(req.user!.id, req.params.id as string, req.body.note);
  res.status(201).json({ success: true, data: result });
});

export const getMyDriveApplications = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.getMyDriveApplications(req.user!.id);
  res.json({ success: true, data: result });
});

export const getDriveApplicants = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.getDriveApplicants(req.user!.id, req.params.id as string);
  res.json({ success: true, data: result });
});

export const updateApplicationStatus = asyncHandler(async (req: Request, res: Response) => {
  const rawStatus = req.body.status as string;
  // Validate it's a known enum value
  const validStatuses = Object.values(PlacementDriveApplicationStatus) as string[];
  if (!validStatuses.includes(rawStatus)) {
    res.status(400).json({
      success: false,
      message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
    });
    return;
  }
  const result = await service.updateApplicationStatus(
    req.user!.id,
    req.params.applicationId as string,
    rawStatus as PlacementDriveApplicationStatus,
  );
  res.json({ success: true, data: result });
});
