import { Router } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate";
import { create } from "../controllers/recruiter.controller";

const createRecruiterSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
  name: z.string().min(1),
  company: z.string().min(1),
});

const router = Router();
router.post("/", validate(createRecruiterSchema), create);

export default router;
