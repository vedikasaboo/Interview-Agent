import { Router } from "express";
import { issueToken } from "../controllers/interview.controller";

const router = Router();

// Public: no requireAuth. The interviewToken in the path is the credential.
router.post("/:interviewToken/token", issueToken);

export default router;
