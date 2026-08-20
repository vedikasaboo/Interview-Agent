import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { uploadResume } from "../middleware/upload";
import { upload } from "../controllers/resume.controller";

const router = Router();

// Auth → multer (saves the PDF) → controller (ownership, magic bytes, parse).
router.post("/:id/resume", requireAuth, uploadResume, upload);

export default router;
