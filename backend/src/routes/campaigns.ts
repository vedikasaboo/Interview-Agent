import { Router } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate";
import { requireAuth } from "../middleware/auth";
import * as campaign from "../controllers/campaign.controller";
import * as candidate from "../controllers/candidate.controller";

const createCampaignSchema = z.object({
  title: z.string().min(1),
  role: z.string().min(1),
  description: z.string().optional(),
});

const addCandidateSchema = z.object({
  name: z.string().min(1),
  email: z.email(),
});

const router = Router();

// Every campaign route requires auth.
router.use(requireAuth);

router.post("/", validate(createCampaignSchema), campaign.create);
router.get("/", campaign.list);
router.get("/:id", campaign.getById);
router.post("/:id/candidates", validate(addCandidateSchema), candidate.create);

export default router;
