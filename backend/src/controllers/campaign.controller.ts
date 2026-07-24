import { RequestHandler } from "express";
import {
  createCampaign,
  listCampaigns,
  getCampaignDetail,
} from "../services/campaign.service";
import { authUser } from "../middleware/auth";
import { NotFoundError, ValidationError } from "../utils/errors";

export const create: RequestHandler = async (req, res) => {
  const { recruiterId } = authUser(req);
  const campaign = await createCampaign(recruiterId, req.body);
  res.status(201).json(campaign);
};

export const list: RequestHandler = async (req, res) => {
  const { recruiterId } = authUser(req);
  const campaigns = await listCampaigns(recruiterId);
  res.json(campaigns);
};

export const getById: RequestHandler = async (req, res) => {
  const { recruiterId } = authUser(req);
  const campaignId = Number(req.params.id);
  if (!Number.isInteger(campaignId) || campaignId <= 0) {
    throw new ValidationError("Invalid campaign id");
  }

  const campaign = await getCampaignDetail(campaignId, recruiterId);
  // 404 (not 403) on someone else's campaign so we don't confirm it exists.
  if (!campaign) {
    throw new NotFoundError("Campaign not found");
  }
  res.json(campaign);
};
