import { prisma } from "../lib/prisma";

interface CreateCampaignInput {
  title: string;
  role: string;
  description?: string;
}

export const createCampaign = (recruiterId: number, input: CreateCampaignInput) =>
  prisma.campaign.create({
    data: { ...input, recruiterId },
  });

// Candidate count baked in so the dashboard list doesn't need N+1 fetches.
export const listCampaigns = (recruiterId: number) =>
  prisma.campaign.findMany({
    where: { recruiterId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { candidates: true } } },
  });

// Scoped by recruiterId: returns the campaign only if this recruiter owns it,
// otherwise null. This is the ownership check for nested candidate routes.
export const findOwnedCampaign = (campaignId: number, recruiterId: number) =>
  prisma.campaign.findFirst({ where: { id: campaignId, recruiterId } });

// Detail view: the campaign plus its candidates, still scoped by ownership.
export const getCampaignDetail = (campaignId: number, recruiterId: number) =>
  prisma.campaign.findFirst({
    where: { id: campaignId, recruiterId },
    include: { candidates: { orderBy: { appliedAt: "desc" } } },
  });
