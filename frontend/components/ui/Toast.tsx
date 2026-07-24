"use client";

import { useEffect } from "react";

interface ToastProps {
  message: string;
  onDismiss: () => void;
  duration?: number;
}

// Minimal confirmation toast: bottom-right, border-only (no shadow, per the
// system), auto-dismisses. Controlled by the parent's message state.
export function Toast({ message, onDismiss, duration = 2600 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, duration);
    return () => clearTimeout(timer);
  }, [onDismiss, duration]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 right-6 z-[60] flex items-center gap-2.5 rounded-md border border-border bg-surface-raised px-4 py-3 text-sm text-ink"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-success" />
      {message}
    </div>
  );
}
