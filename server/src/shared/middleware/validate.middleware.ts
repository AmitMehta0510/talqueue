import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";

type ValidationTarget = "body" | "query" | "params";

/**
 * Express middleware factory that validates a request against a Zod schema.
 *
 * On success  — replaces req[target] with the parsed (coerced + stripped) data
 *               so downstream handlers receive clean, typed input.
 * On failure  — responds with HTTP 400 and a structured error list matching the
 *               same envelope format used by the global error middleware.
 *
 * @param schema - Zod schema to validate against.
 * @param target - Which part of the request to validate (default: "body").
 *
 * @example
 *   router.put("/me", protect, validate(UpdateProfileSchema), updateMe);
 *   router.get("/search", protect, validate(SearchQuerySchema, "query"), search);
 */
export function validate(schema: ZodSchema, target: ValidationTarget = "body") {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);

    if (!result.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: result.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      });
      return;
    }

    // Replace the raw request data with the parsed (coerced + stripped) output
    // so controllers always receive clean, type-safe values.
    (req as any)[target] = result.data;
    next();
  };
}
