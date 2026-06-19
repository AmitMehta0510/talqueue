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
    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 20;

    const parsedPage = isNaN(page) || page < 1 ? 1 : page;
    const parsedLimit = isNaN(limit) || limit < 1 ? 20 : limit;

    const result = await service.getMyExternalApplications(userId, parsedPage, parsedLimit);
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
