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
  // Resume parsing (Phase 3c). Provider is swappable; default Groq because
  // Gemini's free tier is frequently 503-overloaded. Both keys required so a
  // switch is a one-line env change with no redeploy.
  LLM_PROVIDER: z.enum(["groq", "gemini"]).default("groq"),
  GROQ_API_KEY: z.string().min(1),
  GROQ_MODEL: z.string().default("openai/gpt-oss-120b"),
  // gemini-2.5-flash now 404s "no longer available to new users"; -latest alias
  // is deprecation-proof. Override via GEMINI_MODEL to pin a version.
  GEMINI_API_KEY: z.string().min(1),
  GEMINI_MODEL: z.string().default("gemini-flash-latest"),
  UPLOAD_DIR: z.string().default("uploads"),
  MAX_UPLOAD_BYTES: z.coerce.number().int().default(5 * 1024 * 1024),
  // LiveKit (Phase 4). Secret stays backend-only — the frontend only ever gets a
  // short-lived room token the backend mints.
  LIVEKIT_URL: z.string().min(1),
  LIVEKIT_API_KEY: z.string().min(1),
  LIVEKIT_API_SECRET: z.string().min(1),
  // Shared secret the agent uses to write interview results (Phase 8). The
  // agent has no DB access, so this route is its only way to persist anything.
  AGENT_SHARED_SECRET: z.string().min(1),
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
