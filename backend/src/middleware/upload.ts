import { randomUUID } from "crypto";
import { extname } from "path";
import { mkdirSync } from "fs";
import { RequestHandler } from "express";
import multer from "multer";
import { config } from "../config";
import { ValidationError } from "../utils/errors";

// multer does not create the destination dir; ensure it exists at startup.
mkdirSync(config.UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: config.UPLOAD_DIR,
  filename: (_req, file, cb) => {
    // Never trust the client filename — generate our own, force a .pdf ext.
    const ext = extname(file.originalname).toLowerCase();
    cb(null, `${randomUUID()}${ext === ".pdf" ? ext : ".pdf"}`);
  },
});

const single = multer({
  storage,
  limits: { fileSize: config.MAX_UPLOAD_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    // MIME is all we can check here; content (magic bytes) is verified after
    // write, since fileFilter runs before any bytes are available.
    if (file.mimetype !== "application/pdf") {
      cb(new ValidationError("Only PDF files are accepted"));
      return;
    }
    cb(null, true);
  },
}).single("resume");

// Wraps multer so its errors (size limit, wrong field) reach the central error
// handler as ValidationError rather than raw 500s. fileFilter already rejects
// with a ValidationError, which passes straight through.
export const uploadResume: RequestHandler = (req, res, next) => {
  single(req, res, (err: unknown) => {
    if (!err) {
      next();
      return;
    }
    if (err instanceof multer.MulterError) {
      const message =
        err.code === "LIMIT_FILE_SIZE"
          ? "File is too large (max 5MB)"
          : "Upload a single PDF in the 'resume' field";
      next(new ValidationError(message));
      return;
    }
    next(err);
  });
};
