import { Response } from "express";
import asyncHandler from "shared/utils/asyncHandler";
import { successResponse } from "shared/utils/apiResponse";
import { getPresignedUrlSchema } from "./storage.validation";
import { generateUploadParameters } from "./storage.service";

export const getPresignedUrlHandler = asyncHandler(async (req: any, res: Response) => {
  const validatedData = getPresignedUrlSchema.parse(req.body);
  const userId = req.user.id;

  const result = await generateUploadParameters(userId, validatedData);

  res.status(200).json(
    successResponse(
      {
        uploadUrl: result.uploadUrl,
        fileUrl: result.fileUrl,
        key: result.key,
      },
      "Presigned URL generated successfully",
    ),
  );
});
