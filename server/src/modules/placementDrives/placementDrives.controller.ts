import { Request, Response, NextFunction } from "express";
import * as service from "./placementDrives.service";

export const createPlacementDrive = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await service.createPlacementDrive(req.user!.id, req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const getDrivesForCollege = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const collegeId = req.params.collegeId as string;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const result = await service.getDrivesForCollege(collegeId, page, limit);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const getMyPostedDrives = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await service.getMyPostedDrives(req.user!.id);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const updatePlacementDrive = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await service.updatePlacementDrive(req.user!.id, req.params.id as string, req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const closePlacementDrive = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await service.closePlacementDrive(req.user!.id, req.params.id as string);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};
