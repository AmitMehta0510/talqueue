import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import AppError from "../errors/AppError";
import logger from "../logger";

const errorMiddleware = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Always log the error for audit / debugging purposes
  logger.error("Unhandled request error", { err });

  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: err.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
  }

  // Handle generic / system errors securely to avoid leaking sensitive information
  const statusCode = err.statusCode || 500;
  const message = statusCode === 500
    ? "Something went wrong on our end. Please try again in a moment."
    : (err.message || "An unexpected error occurred");

  return res.status(statusCode).json({
    success: false,
    message,
  });
};

export default errorMiddleware;
