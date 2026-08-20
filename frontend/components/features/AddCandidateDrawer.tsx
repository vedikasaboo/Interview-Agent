"use client";

import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { api, ApiError, NetworkError } from "@/lib/api";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import type { Candidate, ParsedResume, Resume } from "@/types/models";

const detailsSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.email("Enter a valid email"),
});
type Details = z.infer<typeof detailsSchema>;
type FieldErrors = Partial<Record<keyof Details, string>>;

const MAX_BYTES = 5 * 1024 * 1024;

interface AddCandidateDrawerProps {
  open: boolean;
  campaignId: number;
  onClose: () => void;
  // Fired once the candidate row exists (after step 1) so the table refreshes;
  // does not close the drawer — step 2 (resume) continues in place.
  onCandidateCreated: (name: string) => void;
}

export function AddCandidateDrawer({
  open,
  campaignId,
  onClose,
  onCandidateCreated,
}: AddCandidateDrawerProps) {
  const [step, setStep] = useState<"details" | "resume">("details");
  const [created, setCreated] = useState<{ id: number; name: string } | null>(null);

  // step 1
  const [values, setValues] = useState<Details>({ name: "", email: "" });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  // step 2
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedResume | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setStep("details");
    setCreated(null);
    setValues({ name: "", email: "" });
    setErrors({});
    setFile(null);
    setUploadError(null);
    setParsed(null);
    firstFieldRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const submitDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = detailsSchema.safeParse(values);
    if (!result.success) {
      const fe: FieldErrors = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof FieldErrors;
        fe[key] ??= issue.message;
      }
      setErrors(fe);
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      const candidate = await api.post<Candidate>(
        `/api/campaigns/${campaignId}/candidates`,
        result.data,
      );
      setCreated({ id: candidate.id, name: candidate.name });
      onCandidateCreated(candidate.name);
      setStep("resume");
    } catch (err) {
      if (err instanceof ApiError && err.code === "CONFLICT") {
        setErrors({ email: "This candidate is already in this campaign." });
      } else if (err instanceof NetworkError) {
        setErrors({ email: "Couldn't reach the server. Try again." });
      } else {
        setErrors({ email: err instanceof ApiError ? err.message : "Something went wrong." });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const pickFile = (f: File | null) => {
    setUploadError(null);
    if (!f) return;
    if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) {
      setUploadError("Please choose a PDF file.");
      return;
    }
    if (f.size > MAX_BYTES) {
      setUploadError("File is too large (max 5MB).");
      return;
    }
    setFile(f);
  };

  const uploadResume = async () => {
    if (!file || !created) return;
    setUploading(true);
    setUploadError(null);
    try {
      const form = new FormData();
      form.append("resume", file);
      const resume = await api.post<Resume>(`/api/candidates/${created.id}/resume`, form);
      setParsed(resume.parsedData);
    } catch (err) {
      // 422 carries the parse reason; keep the drawer open so they can retry.
      if (err instanceof NetworkError) {
        setUploadError("Couldn't reach the server. Try again.");
      } else {
        setUploadError(err instanceof ApiError ? err.message : "Upload failed. Try again.");
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <div role="presentation" onClick={onClose} className="fixed inset-0 z-50 bg-ink/40">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Add candidate"
        onClick={(e) => e.stopPropagation()}
        className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col overflow-y-auto border-l border-border bg-surface-raised p-8"
      >
        <h2 className="font-display text-2xl text-ink">Add candidate</h2>

        {step === "details" && (
          <form onSubmit={submitDetails} noValidate className="mt-6 flex flex-1 flex-col gap-5">
            <Input
              ref={firstFieldRef}
              label="Name"
              value={values.name}
              onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
              error={errors.name}
            />
            <Input
              label="Email"
              type="email"
              value={values.email}
              onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))}
              error={errors.email}
            />
            <div className="mt-auto flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" loading={submitting} loadingText="Adding…">
                Continue
              </Button>
            </div>
          </form>
        )}

        {step === "resume" && created && (
          <div className="mt-6 flex flex-1 flex-col gap-5">
            <p className="text-sm text-ink-muted">
              Attach {created.name}&rsquo;s résumé (PDF). We&rsquo;ll parse it into structured data.
            </p>

            {parsed ? (
              <ParsedPreview parsed={parsed} />
            ) : (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragging(false);
                    pickFile(e.dataTransfer.files?.[0] ?? null);
                  }}
                  disabled={uploading}
                  className={`flex flex-col items-center justify-center rounded-md border border-dashed px-6 py-10 text-center transition-colors ${
                    dragging ? "border-accent bg-accent/5" : "border-border bg-surface"
                  } disabled:opacity-60`}
                >
                  {file ? (
                    <span className="text-sm text-ink">
                      {file.name}{" "}
                      <span className="font-mono text-xs text-ink-muted">
                        ({(file.size / 1024).toFixed(0)} KB)
                      </span>
                    </span>
                  ) : (
                    <span className="text-sm text-ink-muted">
                      Drop a PDF here, or <span className="text-accent">browse</span>
                    </span>
                  )}
                </button>

                {uploadError && <p className="text-sm text-error">{uploadError}</p>}
                {uploading && (
                  <p className="text-sm text-ink-muted">Parsing résumé — this takes a few seconds…</p>
                )}
              </>
            )}

            <div className="mt-auto flex justify-end gap-3">
              {parsed ? (
                <Button onClick={onClose}>Done</Button>
              ) : (
                <>
                  <Button variant="ghost" onClick={onClose} disabled={uploading}>
                    Skip for now
                  </Button>
                  <Button onClick={uploadResume} loading={uploading} loadingText="Parsing…" disabled={!file}>
                    Upload &amp; parse
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ParsedPreview({ parsed }: { parsed: ParsedResume | null }) {
  if (!parsed) {
    return <p className="text-sm text-success">Résumé saved.</p>;
  }
  const role = parsed.experience[0]?.role;
  return (
    <div className="rounded-md border border-border bg-surface p-4">
      <p className="text-sm font-semibold text-success">Parsed ✓</p>
      <p className="mt-2 text-sm text-ink">
        <span className="text-ink-muted">Name:</span> {parsed.name}
      </p>
      {role && (
        <p className="mt-1 text-sm text-ink">
          <span className="text-ink-muted">Role:</span> {role}
        </p>
      )}
      {parsed.skills.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {parsed.skills.slice(0, 12).map((skill) => (
            <span
              key={skill}
              className="rounded-sm border border-border bg-surface-raised px-2 py-0.5 font-mono text-xs text-ink-muted"
            >
              {skill}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
