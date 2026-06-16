import { Request, Response, NextFunction } from "express";
import * as service from "./externalApplications.service";

export const createExternalApplication = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const result = await service.createExternalApplication(userId, req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const getMyExternalApplications = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const result = await service.getMyExternalApplications(userId);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const updateExternalApplicationStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const id = req.params.id as string;
    const result = await service.updateExternalApplicationStatus(userId, id, req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const deleteExternalApplication = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const id = req.params.id as string;
    await service.deleteExternalApplication(userId, id);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};
