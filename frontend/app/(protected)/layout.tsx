"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/authStore";
import { Skeleton } from "@/components/ui/Skeleton";
import { DashboardNav } from "@/components/features/DashboardNav";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    // Only redirect once hydration has settled — redirecting while unknown would
    // bounce a logged-in user who is just refreshing. replace() keeps /login out
    // of history so Back doesn't return here.
    if (hasHydrated && !token) {
      router.replace("/login");
    }
  }, [hasHydrated, token, router]);

  // State 1: storage not restored yet — skeleton, no redirect.
  if (!hasHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <Skeleton className="h-2 w-40" />
      </div>
    );
  }
  // State 2: hydrated, no token — redirect in flight; render nothing.
  if (!token) {
    return null;
  }
  // State 3: hydrated + token — the app shell (persistent rail + main).
  return (
    <div className="flex min-h-screen">
      <DashboardNav />
      <main className="flex-1 overflow-x-hidden">{children}</main>
    </div>
  );
}
