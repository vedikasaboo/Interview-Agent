import { Router } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate";
import { login } from "../controllers/auth.controller";

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

const router = Router();
router.post("/login", validate(loginSchema), login);

export default router;
