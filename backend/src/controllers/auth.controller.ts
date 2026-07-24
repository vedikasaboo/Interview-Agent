import { RequestHandler } from "express";
import { authenticate } from "../services/auth.service";

export const login: RequestHandler = async (req, res) => {
  const result = await authenticate(req.body.email, req.body.password);
  res.json(result);
};
