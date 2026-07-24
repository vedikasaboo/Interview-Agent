"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/lib/authStore";
import { Skeleton } from "@/components/ui/Skeleton";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const hydrate = useAuthStore((s) => s.hydrate);

  // Zustand action identities are stable, so this runs exactly once.
  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  if (!hasHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <Skeleton className="h-2 w-40" />
      </div>
    );
  }
  return <>{children}</>;
}
