import { readFile, unlink } from "fs/promises";
import { RequestHandler } from "express";
import { authUser } from "../middleware/auth";
import { findOwnedCandidate } from "../services/candidate.service";
import { saveAndParseResume } from "../services/resume.service";
import { isPdfBuffer } from "../services/pdf.service";
import { NotFoundError, ValidationError } from "../utils/errors";

// POST /api/candidates/:id/resume — multer has already saved the file by now.
export const upload: RequestHandler = async (req, res) => {
  const { recruiterId } = authUser(req);
  const candidateId = Number(req.params.id);
  const file = req.file;

  // Delete the just-uploaded file before rejecting, so prechecks don't orphan it.
  // (Parse failures inside the service keep the file so the recruiter can retry.)
  const rejectAndClean = async (err: Error): Promise<never> => {
    if (file) await unlink(file.path).catch(() => {});
    throw err;
  };

  if (!file) {
    throw new ValidationError("No resume file uploaded (field 'resume')");
  }
  if (!Number.isInteger(candidateId) || candidateId <= 0) {
    return rejectAndClean(new ValidationError("Invalid candidate id"));
  }

  // Ownership: 404 (not 403) so we don't confirm the candidate exists elsewhere.
  const owned = await findOwnedCandidate(candidateId, recruiterId);
  if (!owned) {
    return rejectAndClean(new NotFoundError("Candidate not found"));
  }

  // Magic-byte check — the spoofable MIME/extension already passed multer.
  const buffer = await readFile(file.path);
  if (!isPdfBuffer(buffer)) {
    return rejectAndClean(new ValidationError("File is not a valid PDF"));
  }

  const resume = await saveAndParseResume(candidateId, file.path, buffer);
  res.status(200).json(resume);
};
