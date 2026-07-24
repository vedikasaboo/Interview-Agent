import { RequestHandler } from "express";
import { createRecruiter } from "../services/recruiter.service";

export const create: RequestHandler = async (req, res) => {
  const recruiter = await createRecruiter(req.body);
  res.status(201).json(recruiter);
};
