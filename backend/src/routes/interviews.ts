import { Router } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate";
import { requireAgentSecret } from "../middleware/agentAuth";
import { issueToken, submitResult } from "../controllers/interview.controller";

// What the agent posts after scoring the interview.
const resultSchema = z.object({
  transcript: z.string().min(1),
  summary: z.string().min(1),
  score: z.number().int().min(0).max(100),
  strengths: z.array(z.string()).default([]),
  concerns: z.array(z.string()).default([]),
  // Résumé claims the conversation did or didn't support.
  discrepancies: z
    .array(
      z.object({
        claim: z.string().min(1),
        finding: z.string().min(1),
        status: z.enum(["supported", "unsupported", "contradicted", "not_discussed"]),
      }),
    )
    .default([]),
});

const router = Router();

// Public: no requireAuth. The interviewToken in the path is the credential.
router.post("/:interviewToken/token", issueToken);

// Agent-only: service-to-service, guarded by the shared secret.
router.post("/:interviewToken/result", requireAgentSecret, validate(resultSchema), submitResult);

export default router;
