import { randomUUID } from "crypto";
import { prisma } from "../lib/prisma";
import { findOwnedCampaign } from "./campaign.service";
import { NotFoundError } from "../utils/errors";

interface AddCandidateInput {
  name: string;
  email: string;
}

export const addCandidate = async (
  campaignId: number,
  recruiterId: number,
  input: AddCandidateInput,
) => {
  const campaign = await findOwnedCampaign(campaignId, recruiterId);
  // 404 (not 403) on someone else's campaign so we don't confirm its existence.
  if (!campaign) {
    throw new NotFoundError("Campaign not found");
  }

  // interviewToken is the candidate's entire unauthenticated credential in
  // Phase 4 — must be unguessable, hence a UUID rather than a sequential id.
  return prisma.candidate.create({
    data: {
      name: input.name,
      email: input.email,
      interviewToken: randomUUID(),
      campaignId,
    },
  });
};
