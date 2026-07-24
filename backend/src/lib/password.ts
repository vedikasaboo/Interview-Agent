import bcrypt from "bcrypt";
import { config } from "../config";

// Async bcrypt only — the sync variants block the event loop for the full
// hashing time (~hundreds of ms at cost 10+).
export const hashPassword = (plain: string): Promise<string> =>
  bcrypt.hash(plain, config.BCRYPT_COST);

export const verifyPassword = (plain: string, hash: string): Promise<boolean> =>
  bcrypt.compare(plain, hash);
