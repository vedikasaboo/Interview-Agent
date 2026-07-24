"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { api, ApiError } from "@/lib/api";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";

const campaignSchema = z.object({
  title: z.string().min(1, "Title is required"),
  role: z.string().min(1, "Role is required"),
  description: z.string().optional(),
});

type CampaignValues = z.infer<typeof campaignSchema>;
type FieldErrors = Partial<Record<keyof CampaignValues, string>>;

export default function NewCampaignPage() {
  const router = useRouter();
  const [values, setValues] = useState<CampaignValues>({ title: "", role: "", description: "" });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = campaignSchema.safeParse(values);
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
    setFormError(null);
    setSubmitting(true);
    try {
      await api.post("/api/campaigns", parsed.data);
      router.replace("/dashboard");
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl px-10 py-10">
      <Link href="/dashboard" className="text-sm text-accent hover:text-accent-hover">
        ← Campaigns
      </Link>
      <h1 className="mt-3 font-display text-4xl text-ink">New campaign</h1>
      <form onSubmit={onSubmit} noValidate className="mt-8 flex flex-col gap-6">
        <Input
          label="Title"
          value={values.title}
          onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))}
          error={errors.title}
        />
        <Input
          label="Role / team"
          value={values.role}
          onChange={(e) => setValues((v) => ({ ...v, role: e.target.value }))}
          error={errors.role}
        />
        <Textarea
          label="Description"
          rows={5}
          helperText="Optional. Context the interviewer agent will use later."
          value={values.description}
          onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))}
          error={errors.description}
        />
        {formError && <p className="text-sm text-error">{formError}</p>}
        <div className="flex gap-3">
          <Button type="submit" loading={submitting} loadingText="Creating…">
            Create campaign
          </Button>
          <Link href="/dashboard">
            <Button type="button" variant="secondary">
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
