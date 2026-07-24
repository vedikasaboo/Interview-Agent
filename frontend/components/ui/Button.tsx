import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ComponentPropsWithRef<"button"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  // Swapped in for children while loading (e.g. "Signing in…").
  loadingText?: string;
}

// Accent is intentionally NOT a fill here — it's reserved for links/focus/small
// highlights. The primary action is navy.
const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-ink text-surface hover:bg-ink/90",
  secondary: "border border-border bg-transparent text-ink hover:bg-ink/5",
  ghost: "bg-transparent text-ink hover:bg-ink/5",
  destructive: "bg-error text-surface hover:bg-error/90",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  loadingText,
  disabled,
  children,
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      aria-busy={loading || undefined}
      disabled={disabled || loading}
      className={cn(
        // Only color transitions — no transform bounce. Focus ring is the
        // global :focus-visible rule in globals.css.
        "inline-flex items-center justify-center gap-2 rounded-md font-sans font-semibold transition-colors duration-[120ms]",
        "disabled:pointer-events-none disabled:opacity-50",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {loading && <Spinner />}
      {loading ? loadingText ?? children : children}
    </button>
  );
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z" />
    </svg>
  );
}
