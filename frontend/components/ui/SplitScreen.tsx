import { cn } from "@/lib/cn";

interface SplitScreenProps {
  children: React.ReactNode; // right pane content
  aside?: React.ReactNode; // left navy pane; defaults to the wordmark
  className?: string;
}

// Auth + interview-room layout. Navy pane ~45%, content pane ~55%. The aside is
// positioned over the navy pane, so it can layer a gradient/photo behind content.
export function SplitScreen({ children, aside, className }: SplitScreenProps) {
  return (
    <div className={cn("flex min-h-screen flex-col md:flex-row", className)}>
      <aside className="relative shrink-0 overflow-hidden bg-ink text-surface md:w-[45%]">
        {aside ?? <DefaultBrand />}
      </aside>
      <main className="flex flex-1 items-center justify-center bg-surface p-6 md:p-12">
        {children}
      </main>
    </div>
  );
}

function DefaultBrand() {
  return (
    <div className="relative z-10 flex h-full flex-col justify-between p-10 md:p-11">
      <span className="font-mono text-2xl font-bold tracking-[0.14em]">screener-agent</span>
    </div>
  );
}
