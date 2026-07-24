// Left-pane brand for the auth SplitScreen. Layers (bottom → top):
//   1. cobalt glow — the fallback look when no photo is present
//   2. photo — public/login-art.png as a CSS background (cover, top-anchored).
//      A missing file 404s silently and the glow shows through — no broken icon.
//   3. legibility gradient (matches the design)
//   4. content — mono wordmark only
export function AuthBrand() {
  return (
    <>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_-10%,rgba(59,73,223,0.20),transparent_60%)]" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-cover"
        style={{ backgroundImage: "url(/login-art.png)", backgroundPosition: "center top" }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(6,15,32,0.55), rgba(6,15,32,0) 22%, rgba(6,15,32,0) 74%, rgba(6,15,32,0.6))",
        }}
      />
      <div className="relative z-10 flex h-full flex-col p-10 md:p-11">
        <span className="font-mono text-2xl font-bold tracking-[0.16em]">screener-agent</span>
      </div>
    </>
  );
}
