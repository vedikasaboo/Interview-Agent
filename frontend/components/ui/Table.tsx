import { cn } from "@/lib/cn";

// Compound primitive: styling lives here, composition stays with the caller.
// Import the parts directly (no barrel). Hairline row separators, no vertical
// rules, no zebra.

export function Table({ className, ...props }: React.ComponentPropsWithRef<"table">) {
  return (
    <div className="w-full overflow-x-auto">
      <table className={cn("w-full border-collapse text-sm", className)} {...props} />
    </div>
  );
}

export function TableHeader({ className, ...props }: React.ComponentPropsWithRef<"thead">) {
  return <thead className={cn("border-b border-border", className)} {...props} />;
}

export function TableBody({ className, ...props }: React.ComponentPropsWithRef<"tbody">) {
  return <tbody {...props} className={className} />;
}

export function TableRow({ className, ...props }: React.ComponentPropsWithRef<"tr">) {
  return (
    <tr
      className={cn(
        "border-b border-border transition-colors duration-[120ms] last:border-0 hover:bg-ink/[0.03]",
        className,
      )}
      {...props}
    />
  );
}

// Right-aligns and sets mono — for scores, counts, IDs.
interface TableHeadProps extends React.ComponentPropsWithRef<"th"> {
  numeric?: boolean;
}
interface TableCellProps extends React.ComponentPropsWithRef<"td"> {
  numeric?: boolean;
}

export function TableHead({ numeric = false, className, ...props }: TableHeadProps) {
  return (
    <th
      scope="col"
      className={cn(
        "px-4 pb-3 text-left align-middle text-[11px] font-medium uppercase tracking-[0.06em] text-ink-muted",
        numeric && "text-right",
        className,
      )}
      {...props}
    />
  );
}

export function TableCell({ numeric = false, className, ...props }: TableCellProps) {
  return (
    <td
      className={cn(
        "h-14 px-4 align-middle text-ink",
        numeric && "text-right font-mono tabular-nums",
        className,
      )}
      {...props}
    />
  );
}
