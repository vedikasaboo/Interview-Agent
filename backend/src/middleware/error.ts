import { ErrorRequestHandler } from "express";
import { Prisma } from "@prisma/client";
import { AppError, ConflictError, NotFoundError } from "../utils/errors";

// Registered last. Must keep all four params so Express treats it as an error
// handler (it detects them by arity). `_next` is unused but required.
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  let appError: AppError | null = null;

  if (err instanceof AppError) {
    appError = err;
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      appError = new ConflictError("A record with these values already exists");
    } else if (err.code === "P2025") {
      appError = new NotFoundError("Record not found");
    }
  }

  if (appError) {
    res.status(appError.statusCode).json({
      error: {
        code: appError.code,
        message: appError.message,
        ...(appError.details !== undefined ? { details: appError.details } : {}),
      },
    });
    return;
  }

  // Unknown error: log the real thing server-side, leak nothing to the client.
  console.error("Unhandled error:", err);
  res.status(500).json({
    error: { code: "INTERNAL_ERROR", message: "Something went wrong" },
  });
};
