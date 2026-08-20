import { prisma } from "../lib/prisma";
import { mintRoomToken } from "../lib/livekit";
import { config } from "../config";
import { NotFoundError } from "../utils/errors";

// Given a candidate's interviewToken (the unguessable UUID = the credential),
// mint a LiveKit room token with the candidate's context as metadata. Room name
// is derived from the token so the agent (Phase 5+) lands in the same room.
export async function issueInterviewAccess(interviewToken: string) {
  const candidate = await prisma.candidate.findUnique({
    where: { interviewToken },
    include: { campaign: true, resume: true },
  });
  if (!candidate) {
    throw new NotFoundError("Invalid or expired interview link");
  }

  // Only attach a résumé the parser actually succeeded on; otherwise null.
  const resume =
    candidate.resume?.parseStatus === "SUCCESS" ? candidate.resume.parsedData : null;

  // This metadata is exactly what Phase 7's agent reads to personalize the interview.
  const metadata = JSON.stringify({
    candidateId: candidate.id,
    candidateName: candidate.name,
    role: candidate.campaign.role,
    campaignTitle: candidate.campaign.title,
    resume,
  });

  const roomName = `interview-${interviewToken}`;
  const token = await mintRoomToken({
    identity: `candidate-${candidate.id}`,
    roomName,
    metadata,
  });

  return { token, url: config.LIVEKIT_URL, roomName, candidateName: candidate.name };
}
