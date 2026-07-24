import { Request, RequestHandler } from "express";
import { verifyToken } from "../lib/jwt";
import { UnauthorizedError } from "../utils/errors";

// Verifies the Bearer token and attaches only the verified claim we need.
// No DB hydration here — routes that need the full recruiter fetch it themselves.
export const requireAuth: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return next(new UnauthorizedError("Missing or malformed Authorization header"));
  }

  const token = header.slice("Bearer ".length).trim();
  try {
    const payload = verifyToken(token);
    req.user = { recruiterId: payload.recruiterId };
    next();
  } catch {
    next(new UnauthorizedError("Invalid or expired token"));
  }
};

// Narrows req.user for protected controllers without a non-null assertion.
// requireAuth guarantees it's set; this stays honest if a route forgets the guard.
export const authUser = (req: Request): { recruiterId: number } => {
  if (!req.user) {
    throw new UnauthorizedError("Not authenticated");
  }
  return req.user;
};
