import { timingSafeEqual } from "crypto";
import { RequestHandler } from "express";
import { config } from "../config";
import { UnauthorizedError } from "../utils/errors";

const HEADER = "x-agent-secret";

// Constant-time comparison so a wrong secret can't be discovered by timing.
// Lengths must match first — timingSafeEqual throws on differing lengths.
function secretMatches(provided: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(config.AGENT_SHARED_SECRET);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Guards routes the Python agent writes to. This is service-to-service auth —
// no recruiter JWT is involved, and no candidate can reach these routes.
export const requireAgentSecret: RequestHandler = (req, _res, next) => {
  const provided = req.header(HEADER);
  if (!provided || !secretMatches(provided)) {
    return next(new UnauthorizedError("Invalid agent credentials"));
  }
  next();
};
