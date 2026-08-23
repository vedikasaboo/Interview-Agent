import { RequestHandler } from "express";
import { issueInterviewAccess, saveInterviewResult } from "../services/interview.service";
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

// Written by the agent at the end of an interview. Guarded by requireAgentSecret.
export const submitResult: RequestHandler = async (req, res) => {
  const { interviewToken } = req.params;
  if (typeof interviewToken !== "string") {
    throw new NotFoundError("Invalid interview token");
  }
  const result = await saveInterviewResult(interviewToken, req.body);
  res.status(201).json(result);
};
