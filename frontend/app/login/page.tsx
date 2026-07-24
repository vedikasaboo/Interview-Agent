"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/authStore";
import { ApiError, NetworkError } from "@/lib/api";
import { SplitScreen } from "@/components/ui/SplitScreen";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { AuthBrand } from "@/components/features/AuthBrand";

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      router.replace("/dashboard");
    } catch (err) {
      if (err instanceof NetworkError) {
        setError("Couldn't reach the server — check your connection or try again.");
      } else if (err instanceof ApiError && err.status === 401) {
        // Same 401 for unknown email and wrong password — one generic message,
        // so we don't reveal which field was wrong.
        setError("Invalid email or password.");
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SplitScreen aside={<AuthBrand />}>
      <div className="w-full max-w-sm">
        <h1 className="font-display text-4xl text-ink">Log in</h1>
        <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-6">
          <Input
            variant="underline"
            label="Email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            variant="underline"
            label="Password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <p className="text-sm text-error">{error}</p>}
          <Button type="submit" loading={submitting} loadingText="Logging in…" className="w-full">
            Log in
          </Button>
        </form>
        <p className="mt-6 text-sm text-ink-muted">
          No account?{" "}
          <Link href="/signup" className="text-accent hover:text-accent-hover">
            Sign up
          </Link>
        </p>
      </div>
    </SplitScreen>
  );
}
