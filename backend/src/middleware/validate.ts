import { RequestHandler } from "express";
import { z } from "zod";
import { ValidationError } from "../utils/errors";

// Validates and replaces req.body with the parsed (typed, stripped) result.
// Failures flow through the central error handler like everything else.
export const validate =
  <T>(schema: z.ZodType<T>): RequestHandler =>
  (req, _res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));
      return next(new ValidationError("Invalid request body", details));
    }
    req.body = result.data;
    next();
  };
