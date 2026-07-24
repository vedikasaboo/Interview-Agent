import { cn } from "@/lib/cn";

// Mirrors the backend CandidateStatus enum.
type CandidateStatus = "INVITED" | "SCHEDULED" | "INTERVIEWED" | "PASSED" | "REJECTED";

interface StatusTagProps {
  status: CandidateStatus;
  className?: string;
}

// Uppercase enum labels, all desaturated. Emphasis rises INVITED (neutral fill)
// → SCHEDULED (ink outline) → INTERVIEWED (ink fill); PASSED/REJECTED are muted
// success/error tints. Exact treatments from the design catalog.
const statusClasses: Record<CandidateStatus, string> = {
  INVITED: "bg-neutral text-ink-muted border border-border",
  SCHEDULED: "bg-transparent text-ink border border-ink",
  INTERVIEWED: "bg-ink text-surface-raised border border-ink",
  PASSED: "bg-success/10 text-success border border-success/35",
  REJECTED: "bg-error/10 text-error border border-error/35",
};

export function StatusTag({ status, className }: StatusTagProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm px-2 py-0.5 text-[11px] font-semibold tracking-[0.04em]",
        statusClasses[status],
        className,
      )}
    >
      {status}
    </span>
  );
}
