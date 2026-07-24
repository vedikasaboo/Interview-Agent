import "dotenv/config";
import { z } from "zod";

// Every env var this backend depends on is validated here, once. Unknown keys
// (LiveKit, SMTP, etc. used by later phases) are ignored, not rejected.
const schema = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(1),
  BCRYPT_COST: z.coerce.number().int().min(4).max(31).default(10),
  PORT: z.coerce.number().int().default(4000),
  FRONTEND_URL: z.url().default("http://localhost:3000"),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const problems = parsed.error.issues
    .map((issue) => `  ${issue.path.join(".")}: ${issue.message}`)
    .join("\n");
  console.error(`Invalid environment variables:\n${problems}`);
  process.exit(1);
}

export const config = parsed.data;
