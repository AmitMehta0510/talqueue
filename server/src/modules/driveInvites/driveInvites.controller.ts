import { Request, Response, NextFunction } from "express";
import AppError from "shared/errors/AppError";
import * as service from "./driveInvites.service";

export const sendInvite = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await service.sendInvite(req.user!.id, req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const listInvitesForCollege = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit } = req.query;
    const result = await service.listInvitesForCollege(
      req.user!.id,
      req.params.collegeId as string,
      page ? Number(page) : undefined,
      limit ? Number(limit) : undefined,
    );
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const listSentInvitesByCollege = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit } = req.query;
    const result = await service.listSentInvitesByCollege(
      req.user!.id,
      req.params.collegeId as string,
      page ? Number(page) : undefined,
      limit ? Number(limit) : undefined,
    );
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const listInvitesSentByCompany = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit } = req.query;
    const result = await service.listInvitesSentByCompany(
      req.user!.id,
      req.params.companyId as string,
      page ? Number(page) : undefined,
      limit ? Number(limit) : undefined,
    );
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const respondToInvite = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { action } = req.body;
    if (!["ACCEPT", "REJECT"].includes(action)) {
      throw new AppError("Invalid input parameter options payload value provided", 400);
    }
    const result = await service.respondToInvite(req.user!.id, req.params.inviteId as string, action);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const withdrawInvite = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await service.withdrawInvite(req.user!.id, req.params.inviteId as string);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};
