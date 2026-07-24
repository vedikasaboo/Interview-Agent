"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

interface CopyButtonProps {
  value: string;
  className?: string;
}

export function CopyButton({ value, className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard can reject (insecure context / denied permission); the token
      // is still visible to select manually, so there's nothing to recover.
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? "Copied" : "Copy interview token"}
      className={cn(
        "text-ink-muted transition-colors hover:text-accent",
        copied && "text-success",
        className,
      )}
    >
      {copied ? (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path d="M2.5 6.5 5 9l4.5-5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <rect x="3.5" y="3.5" width="6" height="6" rx="1" stroke="currentColor" />
          <rect x="1.5" y="1.5" width="6" height="6" rx="1" fill="var(--surface)" stroke="currentColor" />
        </svg>
      )}
    </button>
  );
}
