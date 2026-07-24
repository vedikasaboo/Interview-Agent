"use client";

import { useId } from "react";
import { cn } from "@/lib/cn";

type InputVariant = "box" | "underline";

interface InputProps extends React.ComponentPropsWithRef<"input"> {
  label?: string;
  helperText?: string;
  error?: string;
  variant?: InputVariant;
}

const variantClasses: Record<InputVariant, string> = {
  // Box focus: border darkens to ink, plus the global accent ring.
  box: "rounded-md border border-border bg-surface-raised px-3 py-2 hover:border-ink/20 focus:border-ink",
  // Underline suppresses the global box ring (a rectangle around an underline
  // field fights its whole point) and indicates focus by darkening the underline
  // to ink — a clear, no-layout-shift focus state (matches the design).
  underline:
    "rounded-none border-0 border-b border-border bg-transparent px-0 py-2 hover:border-ink/40 focus:border-ink focus-visible:outline-none",
};

export function Input({
  label,
  helperText,
  error,
  variant = "box",
  id,
  className,
  ...props
}: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const descriptionId = error || helperText ? `${inputId}-description` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-ink">
          {label}
        </label>
      )}
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={descriptionId}
        className={cn(
          "w-full text-ink transition-colors duration-[120ms] placeholder:text-ink-muted",
          "disabled:cursor-not-allowed disabled:opacity-50",
          variantClasses[variant],
          error && "border-error focus:border-error",
          className,
        )}
        {...props}
      />
      {(error || helperText) && (
        <p id={descriptionId} className={cn("text-sm", error ? "text-error" : "text-ink-muted")}>
          {error ?? helperText}
        </p>
      )}
    </div>
  );
}
