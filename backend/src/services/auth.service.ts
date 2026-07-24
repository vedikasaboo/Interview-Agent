import { findRecruiterByEmail } from "./recruiter.service";
import { verifyPassword } from "../lib/password";
import { signToken } from "../lib/jwt";
import { UnauthorizedError } from "../utils/errors";

export const authenticate = async (email: string, password: string) => {
  const recruiter = await findRecruiterByEmail(email);

  // Same error for unknown email and wrong password — no user enumeration.
  if (!recruiter || !(await verifyPassword(password, recruiter.passwordHash))) {
    throw new UnauthorizedError("Invalid email or password");
  }

  const token = signToken({ recruiterId: recruiter.id, email: recruiter.email });
  return {
    token,
    recruiter: { id: recruiter.id, name: recruiter.name, company: recruiter.company },
  };
};
