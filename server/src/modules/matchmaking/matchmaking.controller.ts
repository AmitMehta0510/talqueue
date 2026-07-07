import { Response } from "express";
import asyncHandler from "shared/utils/asyncHandler";
import { successResponse } from "shared/utils/apiResponse";
import AppError from "shared/errors/AppError";
import { findComplementaryTeammates } from "./matchmaking.service";

/**
 * GET /api/v1/matchmaking/teammates
 *
 * Returns engineers whose primary skill category complements the
 * authenticated user's dominant skill category. Useful for finding
 * hackathon teammates or project collaborators.
 *
 * Query params:
 *   limit? — number of results to return (default 10, max 25)
 */
export const teammatesHandler = asyncHandler(async (req: any, res: Response) => {
  const user = req.user;
  if (!user) throw new AppError("Authentication required.", 401);

  const limit = Math.min(parseInt(req.query?.limit as string) || 10, 25);
  const result = await findComplementaryTeammates(user.id, limit);

  return res.status(200).json(
    successResponse(
      result,
      `Found ${result.matches.length} complementary teammate(s) for ${result.userCategory} developer.`,
    ),
  );
});
