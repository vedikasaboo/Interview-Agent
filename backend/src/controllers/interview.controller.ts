import { RequestHandler } from "express";
import { issueInterviewAccess } from "../services/interview.service";
import { NotFoundError } from "../utils/errors";

// Public — authed by the unguessable interviewToken itself, not a recruiter JWT.
export const issueToken: RequestHandler = async (req, res) => {
  const { interviewToken } = req.params;
  if (typeof interviewToken !== "string") {
    throw new NotFoundError("Invalid or expired interview link");
  }
  const access = await issueInterviewAccess(interviewToken);
  res.json(access);
};
