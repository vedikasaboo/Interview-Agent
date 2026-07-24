"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { useAuthStore } from "@/lib/authStore";
import { api, ApiError, NetworkError } from "@/lib/api";
import { SplitScreen } from "@/components/ui/SplitScreen";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { AuthBrand } from "@/components/features/AuthBrand";

// Mirrors the backend's zod constraints so users see errors before the round-trip.
const signupSchema = z.object({
  name: z.string().min(1, "Name is required"),
  company: z.string().min(1, "Company is required"),
  email: z.email("Enter a valid email"),
  password: z.string().min(8, "At least 8 characters"),
});

type SignupValues = z.infer<typeof signupSchema>;
type FieldErrors = Partial<Record<keyof SignupValues, string>>;

export default function SignupPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const [values, setValues] = useState<SignupValues>({ name: "", company: "", email: "", password: "" });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const set = (key: keyof SignupValues) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setValues((v) => ({ ...v, [key]: e.target.value }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = signupSchema.safeParse(values);
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
      await api.post("/api/recruiters", parsed.data);
      // Auto-login with the same credentials, then into the app.
      await login(parsed.data.email, parsed.data.password);
      router.replace("/dashboard");
    } catch (err) {
      if (err instanceof NetworkError) {
        setFormError("Couldn't reach the server — check your connection or try again.");
      } else if (err instanceof ApiError && err.code === "CONFLICT") {
        setErrors({ email: "An account with this email already exists." });
      } else {
        setFormError("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SplitScreen aside={<AuthBrand />}>
      <div className="w-full max-w-sm">
        <h1 className="font-display text-4xl text-ink">Create account</h1>
        <form onSubmit={onSubmit} noValidate className="mt-8 flex flex-col gap-6">
          <Input variant="underline" label="Name" value={values.name} onChange={set("name")} error={errors.name} />
          <Input variant="underline" label="Company" value={values.company} onChange={set("company")} error={errors.company} />
          <Input
            variant="underline"
            label="Email"
            type="email"
            autoComplete="email"
            value={values.email}
            onChange={set("email")}
            error={errors.email}
          />
          <Input
            variant="underline"
            label="Password"
            type="password"
            autoComplete="new-password"
            value={values.password}
            onChange={set("password")}
            error={errors.password}
          />
          {formError && <p className="text-sm text-error">{formError}</p>}
          <Button type="submit" loading={submitting} loadingText="Creating…" className="w-full">
            Create account
          </Button>
        </form>
        <p className="mt-6 text-sm text-ink-muted">
          Have an account?{" "}
          <Link href="/login" className="text-accent hover:text-accent-hover">
            Log in
          </Link>
        </p>
      </div>
    </SplitScreen>
  );
}
