import { Prisma } from "@prisma/client";
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

interface Discrepancy {
  claim: string;
  finding: string;
  status: "supported" | "unsupported" | "contradicted" | "not_discussed";
}

interface InterviewResultInput {
  transcript: string;
  summary: string;
  score: number;
  strengths: string[];
  concerns: string[];
  discrepancies: Discrepancy[];
}

// Written by the agent at the end of an interview (Phase 8). The result and the
// candidate's new state go in one transaction so a partial write can't leave a
// scored interview with an un-updated candidate.
export async function saveInterviewResult(
  interviewToken: string,
  input: InterviewResultInput,
) {
  const candidate = await prisma.candidate.findUnique({ where: { interviewToken } });
  if (!candidate) {
    throw new NotFoundError("Invalid interview token");
  }

  return prisma.$transaction(async (tx) => {
    // Upsert keyed on candidateId: the agent may retry, and a retry must not
    // create a second result row.
    const result = await tx.interviewResult.upsert({
      where: { candidateId: candidate.id },
      create: {
        candidateId: candidate.id,
        transcript: input.transcript,
        summary: input.summary,
        score: input.score,
        strengths: input.strengths as unknown as Prisma.InputJsonValue,
        concerns: input.concerns as unknown as Prisma.InputJsonValue,
        discrepancies: input.discrepancies as unknown as Prisma.InputJsonValue,
      },
      update: {
        transcript: input.transcript,
        summary: input.summary,
        score: input.score,
        strengths: input.strengths as unknown as Prisma.InputJsonValue,
        concerns: input.concerns as unknown as Prisma.InputJsonValue,
        discrepancies: input.discrepancies as unknown as Prisma.InputJsonValue,
      },
    });

    // Score lives only on InterviewResult (Phase 1 decision) — the candidate
    // record just records that the interview happened.
    await tx.candidate.update({
      where: { id: candidate.id },
      data: { status: "INTERVIEWED", interviewedAt: new Date() },
    });

    return result;
  });
}
