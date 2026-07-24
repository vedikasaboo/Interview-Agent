import jwt from "jsonwebtoken";
import { config } from "../config";

export interface TokenPayload {
  recruiterId: number;
  email: string;
}

// 24h expiry, expressed in seconds to sidestep @types/jsonwebtoken's fussy
// string-duration typing.
const EXPIRES_IN_SECONDS = 60 * 60 * 24;

export const signToken = (payload: TokenPayload): string =>
  jwt.sign(payload, config.JWT_SECRET, { expiresIn: EXPIRES_IN_SECONDS });

export const verifyToken = (token: string): TokenPayload => {
  const decoded = jwt.verify(token, config.JWT_SECRET);
  if (
    typeof decoded === "string" ||
    typeof decoded.recruiterId !== "number" ||
    typeof decoded.email !== "string"
  ) {
    throw new Error("Malformed token payload");
  }
  return { recruiterId: decoded.recruiterId, email: decoded.email };
};
