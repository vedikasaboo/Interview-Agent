import { cn } from "@/lib/cn";

interface EmptyStateProps {
  title: string;
  description?: string;
  // Typically a <Button>. Kept as a node so EmptyState doesn't depend on Button.
  action?: React.ReactNode;
  className?: string;
}

// No illustration — empty space over decoration. Display serif headline, one
// muted helper line, one action.
export function EmptyState({ title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-20 text-center", className)}>
      <h2 className="font-display text-2xl text-ink">{title}</h2>
      {description && <p className="mt-2 max-w-sm text-sm text-ink-muted">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
