import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { extractPdfText } from "./pdf.service";
import { parseResumeText, ResumeParseError } from "./resumeParser.service";
import { UnprocessableEntityError } from "../utils/errors";
import type { ParsedResume } from "./resume.schema";

const MIN_EXTRACTED_CHARS = 30;

// Lifecycle for a valid, owned PDF: mark PENDING, extract, parse, and on success
// reproject skills in one transaction. Every failure past this point sets FAILED
// (the file is kept so the recruiter can retry) and surfaces a 422 with the reason.
export async function saveAndParseResume(candidateId: number, rawFilePath: string, buffer: Buffer) {
  await prisma.resume.upsert({
    where: { candidateId },
    create: { candidateId, rawFilePath, parseStatus: "PENDING" },
    update: {
      rawFilePath,
      parseStatus: "PENDING",
      parsedData: Prisma.DbNull,
      parseError: null,
      parsedAt: null,
    },
  });

  const text = await extractPdfText(buffer);
  if (text.replace(/\s/g, "").length < MIN_EXTRACTED_CHARS) {
    // A valid PDF with no extractable text is almost always a scanned image.
    return failAndThrow(candidateId, "No extractable text — the PDF may be a scanned image");
  }

  let parsed: ParsedResume;
  try {
    parsed = await parseResumeText(text);
  } catch (err) {
    if (err instanceof ResumeParseError && err.rawResponse) {
      console.error("[resume] raw model response:", err.rawResponse);
    }
    const reason = err instanceof Error ? err.message : "Resume parsing failed";
    return failAndThrow(candidateId, reason);
  }

  return commitParsedResume(candidateId, parsed);
}

async function failAndThrow(candidateId: number, reason: string): Promise<never> {
  await prisma.resume.update({
    where: { candidateId },
    data: { parseStatus: "FAILED", parseError: reason, parsedData: Prisma.DbNull, parsedAt: null },
  });
  throw new UnprocessableEntityError(reason);
}

function commitParsedResume(candidateId: number, parsed: ParsedResume) {
  return prisma.$transaction(async (tx) => {
    const resume = await tx.resume.update({
      where: { candidateId },
      data: {
        // Prisma's Json input type doesn't model our optional-field unions; the
        // value is a plain JSON object, so the assertion is safe here.
        parsedData: parsed as unknown as Prisma.InputJsonValue,
        parseStatus: "SUCCESS",
        parseError: null,
        parsedAt: new Date(),
      },
    });

    // The JSON is authoritative; CandidateSkill is a derived index — rebuild it.
    await tx.candidateSkill.deleteMany({ where: { candidateId } });
    const uniqueSkills = [...new Set(parsed.skills.map((s) => s.trim()).filter(Boolean))];
    for (const name of uniqueSkills) {
      const skill = await tx.skill.upsert({ where: { name }, create: { name }, update: {} });
      await tx.candidateSkill.create({ data: { candidateId, skillId: skill.id } });
    }
    return resume;
  });
}
