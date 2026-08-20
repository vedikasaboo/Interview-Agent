import { z } from "zod";
import { Type, type Schema } from "@google/genai";

// An absent optional is honest; an empty string is a fabricated field, so we
// normalize "" (or whitespace) to null before validating.
const optionalText = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? null : v),
  z.string().nullable().optional(),
);

// The one source of truth for the parsed-resume shape. Used to validate the
// LLM output before it touches the DB.
export const parsedResumeSchema = z.object({
  name: z.string().min(1),
  skills: z.array(z.string().min(1)),
  education: z.array(
    z.object({
      degree: z.string().min(1),
      institution: z.string().min(1),
      year: optionalText,
    }),
  ),
  experience: z.array(
    z.object({
      role: z.string().min(1),
      company: z.string().min(1),
      startDate: optionalText,
      endDate: optionalText,
      summary: optionalText,
    }),
  ),
  projects: z.array(
    z.object({
      name: z.string().min(1),
      technologies: z.array(z.string().min(1)),
      description: optionalText,
    }),
  ),
  // Research/academic work (papers, theses, ongoing investigations) — not a job
  // and not a software project, so it needs its own home. Defaulted so a model
  // that emits nothing here still validates.
  research: z
    .array(
      z.object({
        title: z.string().min(1),
        description: optionalText,
      }),
    )
    .default([]),
});

export type ParsedResume = z.infer<typeof parsedResumeSchema>;

// Gemini structured-output schema. Hand-written to mirror the zod schema above
// (no zod→Gemini converter dependency) — keep the two in sync. Optional fields
// are simply left out of each object's `required`.
export const geminiResumeSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING },
    skills: { type: Type.ARRAY, items: { type: Type.STRING } },
    education: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          degree: { type: Type.STRING },
          institution: { type: Type.STRING },
          year: { type: Type.STRING, nullable: true },
        },
        required: ["degree", "institution"],
      },
    },
    experience: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          role: { type: Type.STRING },
          company: { type: Type.STRING },
          startDate: { type: Type.STRING, nullable: true },
          endDate: { type: Type.STRING, nullable: true },
          summary: { type: Type.STRING, nullable: true },
        },
        required: ["role", "company"],
      },
    },
    projects: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          technologies: { type: Type.ARRAY, items: { type: Type.STRING } },
          description: { type: Type.STRING, nullable: true },
        },
        required: ["name", "technologies"],
      },
    },
    research: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          description: { type: Type.STRING, nullable: true },
        },
        required: ["title"],
      },
    },
  },
  required: ["name", "skills", "education", "experience", "projects", "research"],
};

// The shape spelled out for prompt-based providers (Groq's JSON mode has no
// separate responseSchema). Kept next to the schemas so all three stay in sync.
export const RESUME_JSON_SHAPE = `{
  "name": string,
  "skills": string[],
  "education": [{ "degree": string, "institution": string, "year"?: string }],
  "experience": [{ "role": string, "company": string, "startDate"?: string, "endDate"?: string, "summary"?: string }],
  "projects": [{ "name": string, "technologies": string[], "description"?: string }],
  "research": [{ "title": string, "description"?: string }]
}`;
