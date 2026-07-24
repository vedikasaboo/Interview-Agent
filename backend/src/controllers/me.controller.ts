import { RequestHandler } from "express";
import { findRecruiterById } from "../services/recruiter.service";
import { authUser } from "../middleware/auth";
import { UnauthorizedError } from "../utils/errors";

// The one place req.user is hydrated into a full recruiter (see auth middleware).
export const getMe: RequestHandler = async (req, res) => {
  const { recruiterId } = authUser(req);
  const recruiter = await findRecruiterById(recruiterId);
  if (!recruiter) {
    throw new UnauthorizedError("Recruiter no longer exists");
  }
  res.json(recruiter);
};
