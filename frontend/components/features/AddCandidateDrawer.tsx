"use client";

import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { api, ApiError } from "@/lib/api";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.email("Enter a valid email"),
});

type Values = z.infer<typeof schema>;
type FieldErrors = Partial<Record<keyof Values, string>>;

interface AddCandidateDrawerProps {
  open: boolean;
  campaignId: number;
  onClose: () => void;
  onCreated: (candidateName: string) => void;
}

// Right-side drawer over the campaign detail. Pragmatic a11y: role=dialog +
// Escape + backdrop close + autofocus (no focus trap yet).
export function AddCandidateDrawer({ open, campaignId, onClose, onCreated }: AddCandidateDrawerProps) {
  const [values, setValues] = useState<Values>({ name: "", email: "" });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setValues({ name: "", email: "" });
    setErrors({});
    firstFieldRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      const fieldErrors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof FieldErrors;
        fieldErrors[key] ??= issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      await api.post(`/api/campaigns/${campaignId}/candidates`, parsed.data);
      onCreated(parsed.data.name);
    } catch (err) {
      if (err instanceof ApiError && err.code === "CONFLICT") {
        setErrors({ email: "This candidate is already in this campaign." });
      } else {
        setErrors({ email: err instanceof ApiError ? err.message : "Something went wrong." });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div role="presentation" onClick={onClose} className="fixed inset-0 z-50 bg-ink/40">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Add candidate"
        onClick={(e) => e.stopPropagation()}
        className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-border bg-surface-raised p-8"
      >
        <h2 className="font-display text-2xl text-ink">Add candidate</h2>
        <form onSubmit={onSubmit} noValidate className="mt-6 flex flex-1 flex-col gap-5">
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
              Add candidate
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
