"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/authStore";

// Persistent left rail for all protected pages (rendered by (protected)/layout).
export function DashboardNav() {
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);

  const signOut = () => {
    logout();
    router.replace("/login");
  };

  return (
    <nav className="flex w-52 shrink-0 flex-col border-r border-border bg-surface-raised py-7">
      <span className="px-6 pb-8 font-mono text-lg font-bold tracking-[0.1em] text-ink">
        screener-agent
      </span>

      <Link
        href="/dashboard"
        className="relative bg-ink/[0.04] px-6 py-2.5 text-sm font-semibold text-ink"
      >
        <span className="absolute inset-y-0 left-0 w-0.5 bg-accent" />
        Campaigns
      </Link>

      <span className="flex items-center justify-between px-6 py-2.5 text-sm text-ink-muted/70">
        Candidates
        <span className="rounded-[3px] border border-border px-1.5 py-px font-mono text-[9px] tracking-[0.06em]">
          SOON
        </span>
      </span>

      <button
        type="button"
        onClick={signOut}
        className="mt-auto px-6 py-2.5 text-left text-sm text-ink-muted transition-colors hover:text-ink"
      >
        Sign out
      </button>
    </nav>
  );
}
