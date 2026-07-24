"use client";

import { useId } from "react";
import { cn } from "@/lib/cn";

interface TextareaProps extends React.ComponentPropsWithRef<"textarea"> {
  label?: string;
  helperText?: string;
  error?: string;
}

// Box-variant sibling of Input, for multi-line fields. Same label/helper/error
// contract so forms read consistently.
export function Textarea({ label, helperText, error, id, className, ...props }: TextareaProps) {
  const generatedId = useId();
  const textareaId = id ?? generatedId;
  const descriptionId = error || helperText ? `${textareaId}-description` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={textareaId} className="text-sm font-medium text-ink">
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        aria-invalid={error ? true : undefined}
        aria-describedby={descriptionId}
        className={cn(
          "w-full rounded-md border border-border bg-surface-raised px-3 py-2 text-ink transition-colors duration-[120ms] placeholder:text-ink-muted hover:border-ink/20 focus:border-ink",
          "disabled:cursor-not-allowed disabled:opacity-50",
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
