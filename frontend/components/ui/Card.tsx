import { cn } from "@/lib/cn";

interface CardProps extends React.ComponentPropsWithRef<"div"> {
  clickable?: boolean;
}

// Presentational. For a navigable card, wrap it in a <Link> — that provides the
// interactivity and the global focus ring; `clickable` only adds the hover cue.
export function Card({ clickable = false, className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-surface-raised p-6",
        clickable && "cursor-pointer transition-colors duration-[120ms] hover:border-ink/20",
        className,
      )}
      {...props}
    />
  );
}
