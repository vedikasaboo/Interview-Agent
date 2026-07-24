type ClassValue = string | false | null | undefined;

// Minimal class joiner (clsx-lite): filters falsy values, joins with spaces.
// Deliberately no tailwind-merge — these primitives compose additively, so a
// consumer's className appends rather than overrides. If real conflict
// resolution is ever needed, swap this for clsx + tailwind-merge.
export const cn = (...classes: ClassValue[]): string =>
  classes.filter(Boolean).join(" ");
