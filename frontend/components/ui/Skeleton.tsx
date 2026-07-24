import { cn } from "@/lib/cn";

type SkeletonProps = React.ComponentPropsWithRef<"div">;

// Shared loading primitive. Size it with className (h-*, w-*). Soft opacity
// pulse (animate-pulse), ink at 6% — no shimmer gradient.
export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div aria-hidden="true" className={cn("animate-pulse rounded bg-ink/6", className)} {...props} />
  );
}
