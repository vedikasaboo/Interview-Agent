import { RequestHandler } from "express";
import { addCandidate } from "../services/candidate.service";
import { authUser } from "../middleware/auth";
import { ValidationError } from "../utils/errors";

export const create: RequestHandler = async (req, res) => {
  const { recruiterId } = authUser(req);

  // validate() covers the body; the :id route param is coerced/checked here.
  const campaignId = Number(req.params.id);
  if (!Number.isInteger(campaignId) || campaignId <= 0) {
    throw new ValidationError("Invalid campaign id");
  }

  const candidate = await addCandidate(campaignId, recruiterId, req.body);
  res.status(201).json(candidate);
};
