# Interview-Agent

## What this is

A recruiter hiring platform where first-round job interviews are conducted by an AI over voice.

**Recruiter side:** signs up, creates hiring campaigns, adds candidates with their resume PDFs, reviews scored results.
**Candidate side:** receives one emailed link with a unique token, opens it, has a spoken conversation with an AI interviewer, done. No account, no login.

---

## HOW TO WORK WITH ME — read this first, it overrides default behaviour

I am building this to learn. I am a 3rd-year CSE student. If you write this project for me, it is worthless to me. Follow these rules:

**Do not write complete files or features unless I explicitly ask.** Default to explaining the approach and then writing it after my approval.

**When I ask "how do I do X":** explain the concept, describe the shape of the solution, point me at the relevant API/docs. Show at most a small illustrative snippet — not the finished implementation.

**Be direct.** No softening, no "great question", no praising code that isn't good. If my approach is wrong, say so plainly and explain why.

**Push back on non-principled fixes.** If I try to paper over a problem instead of solving it, call it out.

**Explain before generating.** If I do ask for code, explain what it will do and why before writing it.

**When I ask you to just write something, that's fine** — but ask if I want to understand it first.

---

## FIX ROOT CAUSES, NOT SYMPTOMS

This is a hard rule. When something breaks, find out *why* before changing anything.

**Diagnose before editing.** State what you think the actual cause is and how you know. If you don't know yet, say so and tell me what would confirm it — don't start changing code and see if the error goes away.

**Never do these:**
- Wrapping something in try/except to make an error disappear without knowing what threw it
- Adding a null check where the real question is why the value is null
- `sleep()` or retries to work around a race condition or ordering bug
- Hardcoding a value that failed to load, instead of fixing why it didn't load
- Adding a special case for the input that broke, when the logic is wrong for a whole class of inputs
- Adding a second piece of state to compensate for the first one being wrong
- Changing a test/assertion so it passes, instead of fixing the code
- `as any`, `@ts-ignore`, or silencing a linter to move past a type error

**If a fix touches more than one place to handle the same underlying issue, stop.** That's a sign the abstraction is wrong. Say so and propose the structural fix instead.

**If the real fix is large and I want a quick patch to keep moving, that's allowed** — but say explicitly that it's a patch, what the actual problem is, and add a `TODO` naming the root cause. Never let a workaround be silently mistaken for a solution.

**Same error twice = stop patching.** If a bug recurs in a different place, the cause is structural. Say so.

**Read the actual error.** Full stack trace, the real message. Don't pattern-match on the error type and guess. When it's an API/library failure, check what the service actually returned before theorising.

---

## CODE STRUCTURE AND QUALITY

Build this like production code, not a student project. I want it to survive being read by an interviewer.

**File structure — keep to this, don't sprawl:**

```
backend/
  prisma/
    schema.prisma
  src/
    routes/          # one file per resource: campaigns.ts, candidates.ts, auth.ts
    controllers/     # request/response handling only
    services/        # business logic — the actual work
    middleware/      # auth, error handling, validation, uploads
    lib/             # prisma client, livekit token minting, mailer
    utils/
    config/          # env parsing and validation, in ONE place
    index.ts
  dbms/              # raw .sql for Phase 10 — deliberately outside Prisma

frontend/
  app/               # routes only — pages stay thin
  components/
    ui/              # dumb, reusable
    features/        # feature-specific composites
  lib/               # api client, livekit client helpers
  hooks/
  types/

agent/
  src/
    agent.py         # entrypoint + session wiring ONLY
    prompts.py       # prompt construction
    context.py       # candidate context extraction/normalisation
    evaluation.py    # end-of-interview scoring
    backend_client.py# HTTP calls to the backend
    config.py        # env loading
```

**Rules:**

- **One responsibility per file.** If a file does two unrelated things, split it.
- **Routes stay thin.** A route handler validates input, calls a service, returns a response. Business logic lives in services — never in the route.
- **No secrets or magic values inline.** Env vars are read and validated in exactly one config module, then imported. Not `process.env.X` scattered across twenty files.
- **Errors are handled centrally.** One error-handling middleware in the backend. Route handlers don't each invent their own error shape.
- **Consistent naming.** Pick a convention per language and hold it — don't mix `camelCase` and `snake_case` in the same layer.
- **Types are real.** No `any` as an escape hatch. If typing something is hard, that usually means the data shape is unclear — fix that.
- **No dead code, no commented-out blocks, no `console.log` left behind.** Delete it; git remembers.
- **If a file passes ~300 lines, flag it** and suggest how to split it.
- **Comments explain *why*, not *what*.** The code says what it does. Comment the non-obvious decision.

**Tell me when I'm creating a structural problem** — a god file, logic in the wrong layer, duplicated business rules, a service reaching into another service's internals. Say it at the time, not later.

---

## Architecture

Three separate services, run simultaneously in three terminals:

```
frontend (Next.js, :3000)  ──►  backend (Express + Prisma, :4000)  ──►  MySQL
                    │                        │
                    └──► LiveKit Room ◄───────┘
                              ▲
                              │
                    agent (Python, LiveKit Agents)
```

### Two boundaries that must not be crossed

1. **Frontend never touches the database or holds secrets.** It asks the backend for everything. If a LiveKit key ends up in frontend code, something is routed wrong.

2. **The agent has no database access.** It is a separate Python process. It communicates with the backend at exactly two moments:
   - **Session start:** backend → agent, indirectly, via candidate context embedded as metadata in the LiveKit token
   - **Session end:** agent → backend, via an authenticated HTTP POST with the transcript and score

---

## Stack

| Piece | Choice |
|---|---|
| Frontend | Next.js (App Router) |
| Backend | Express + Prisma |
| DB | MySQL (local) |
| Realtime audio | LiveKit Cloud (free tier) |
| STT | Groq Whisper |
| LLM | Gemini (`gemini-2.5-flash`), swappable by env var |
| TTS | Groq `playai-tts` or Gemini `gemini-2.5-flash-preview-tts` |
| VAD | Silero (LiveKit plugin, local) |

Everything runs locally. No deployment in scope.

---

## Known gotchas (learned the hard way)

- **Gemini preview model names expire.** `gemini-2.5-flash-native-audio-preview-12-2025` no longer exists — this caused a "the key doesn't work" wild goose chase when the key was fine. When anything model-related breaks, list available models first:
  `curl -s "https://generativelanguage.googleapis.com/v1beta/models?key=KEY" | grep '"name"'`
- **No realtime/bidirectional Gemini model is available** on the current AI Studio key. Must use the three-piece STT→LLM→TTS pipeline, not a combined audio model.
- **LiveKit's Google plugin wants `GOOGLE_API_KEY`**, not `GEMINI_API_KEY`.
- **PlayAI TTS requires accepting model terms** in the Groq console before it works.
- **Gmail app passwords** are shown with spaces for readability — strip them in `.env`.
- **MySQL passwords with special characters** must be URL-encoded in `DATABASE_URL` (`@` → `%40`).
- **Prisma allows multi-path cascade conflicts through `db push` without warning.** If two FK paths reach the same table with different `onDelete` actions (e.g. Cascade one way, Restrict the other), the schema validates and pushes clean — but at runtime InnoDB's evaluation order decides which action fires, so the same delete can succeed or throw depending on which path is processed first. Trace every delete root manually before pushing. Prisma won't catch it.
- **FK cascade deletes in MySQL don't fire triggers.** If a delete-trigger ever seems not to run, this is why. (Doesn't affect the Phase 10b `AFTER UPDATE` trigger — filed away for later.)
- **Express 5 auto-forwards async errors** to the central handler.
  The asyncHandler wrapper the Express 4 world required is dead
  weight — don't add it.
- **TypeScript 7 native compiler dropped `moduleResolution: node10`.**
  Use `nodenext` in tsconfig instead.
- **Zustand persist with SSR: use `skipHydration: true` and rehydrate manually in a mount effect.** Otherwise client-only auto-rehydration runs at module load, so the first client render differs from the server render → React hydration mismatch. Same compounding lesson as the multi-path cascade one: the tool does something automatic that only bites at the boundary (here, SSR vs client), and validates/builds clean until then.

---

## Build phases

Full plan lives in `interview-agent-build-plan.md`. Summary:

- **Phase -1** — accounts, keys, MySQL, `.gitignore`
- **Phase 0** — three empty projects that start without crashing
- **Phase 1** — full Prisma schema (all tables, including ones not used until Phase 8/10)
- **Phase 2** — backend auth + campaign API, tested via curl
- **Phase 3** — frontend recruiter UI
- **Phase 3b** — candidate invite flow (token + email)
- **Phase 3c** — resume upload + LLM parsing to structured JSON (recruiter-side)
- **Phase 4** — LiveKit token issuance with candidate context as metadata
- **Phase 5** — agent v1: joins room, says one hardcoded line, no LLM
- **Phase 6** — agent v2: real STT→LLM→TTS interview loop
- **Phase 7** — inject candidate context into the agent's prompt
- **Phase 8** — transcript capture, LLM scoring, authenticated writeback to backend
- **Phase 9** — recruiter results view
- **Phase 10** — DBMS module: transactions, triggers, analytics SQL, indexing proof

**Rule: each phase ends with a working checkpoint before moving on.** Never debug two unknown things at once. This is why Phase 5 exists with no AI in it at all — it proves the voice plumbing works before a model is introduced.

---

## Current status

**Phase: 3 pages built & verified (typecheck + all routes 200). Manual click-through is the checkpoint. Next: Phase 3b (candidate invite email) or 3c (resume upload/parse).**

Rebuilt from scratch this session (2026-07-23) — earlier notes had claimed progress that wasn't on disk.

Phase 0 — done, each verified booting:
- backend: Express 5 + TypeScript (CommonJS), `GET /health` → 200 on :4000
- frontend: Next.js (App Router, TS, Tailwind, no `src/`, alias `@/*`) → 200 on :3000
- agent: bare `src/agent.py` runs under system python3 (3.8 — recreate venv with 3.9+ at Phase 5, LiveKit Agents needs it)
- single root git repo, per-folder `.gitignore`; both `.env` files confirmed ignored, nothing committed yet

Phase 1 — done, verified via SQL against `interview_agent`:
- `prisma/schema.prisma` written (the designed schema); `db push` clean; client generated
- 10 tables, all snake_case; cascade chain landed as designed (booking→candidate & booking→interview_slot both CASCADE; campaign→recruiter & candidate_skill→skill RESTRICT; audit_log has NO FK — decoupled for the Phase 10b trigger)
- **Prisma pinned to 6.x (6.19.3).** Prisma 7 removed `url = env(...)` from the datasource (needs `prisma.config.ts` + a driver adapter) — do NOT let `npm update` bump to 7 or `db push` breaks.

Phase 2 — done, verified end-to-end via a scripted flow (signup → login → me → campaign → candidate):
- Layered: `config/` (env via zod, validated once) · `lib/` (prisma, jwt, password) · `middleware/` (auth, error, validate) · `services/` · `controllers/` · `routes/`. Routes thin, services do the work.
- Routes: `POST /api/recruiters`, `POST /api/auth/login`, `GET /api/me`, `POST /api/campaigns`, `GET /api/campaigns` (+`_count`), `POST /api/campaigns/:id/candidates`.
- JWT (Bearer, 24h) · bcrypt cost 10 · zod validation · central error middleware (Prisma P2002→409, P2025→404) · same-message login (no user enumeration) · ownership check returns 404 (not 403) · cross-recruiter isolation verified.
- **Tooling drift pinned:** TypeScript came in as 7.0.2 (native compiler) — `moduleResolution: node10` was removed, so tsconfig uses `module`/`moduleResolution: nodenext` (emits CJS, no `type:module`). No `asyncHandler` — Express 5 auto-forwards async errors.

Phase 3 (frontend) — in progress:
- Design system — **imported from Claude Design** ("Screener Agent" catalog, project `b5f95ada…`, via the DesignSync tool). Same palette; new type system: **DM Serif Display** (headings, `font-display`) + **Space Grotesk** (body, `font-sans`) + **JetBrains Mono** (`font-mono`, also the wordmark + card titles, used bold). Tailwind v4 CSS-first — tokens in `app/globals.css` `@theme inline` (no `tailwind.config.ts`). Added `--neutral #EDEBE3` (INVITED tag / subtle fills). Borders need explicit `border-border`; global 2px cobalt focus ring.
- Design deltas from the first build: nav rail now persists across all protected pages (in `(protected)/layout.tsx`); status tags UPPERCASE with per-status treatments; candidate table gained a **Score** column ("—" until Phase 8/9) and cobalt names; card titles are mono-bold; add-candidate is a **drawer + toast** (`AddCandidateDrawer`, `Toast`), not a modal; login navy pane uses a gradient (real bg photo lives in the design project, not pulled into code).
- Design doc also specs 7 future surfaces (candidate result, settings, interview landing/room/complete, token expired) — deferred to their phases; they inherit this system.
- Auth wiring done, verified (typecheck clean, `/` boots 200, no SSR/circular-import errors): `lib/api.ts` (fetch owner, Bearer from `useAuthStore.getState().token`, typed `ApiError`, 401→logout+redirect with `skip401Handler`), `lib/authStore.ts` (Zustand+persist, `token`/`recruiter`/`hasHydrated`/`isLoading`, `login`/`logout`/`hydrate`, `skipHydration:true`), `app/providers/AuthProvider.tsx`, `app/(protected)/layout.tsx` (three-state guard). `frontend/.env.local` holds `NEXT_PUBLIC_API_URL` (gitignored).
- `ui/` primitives built (`components/ui/`): Button, Input (box+underline), Textarea, Card, Skeleton, Table (compound), StatusTag, EmptyState, SplitScreen, CopyButton + `lib/cn.ts`. The two inline skeletons now use the shared `<Skeleton>`.
- Pages built & verified (typecheck clean both sides; all routes render 200): `login`, `signup` (client zod, auto-login), `(protected)/dashboard` (nav rail + campaign grid, skeleton/empty/error), `(protected)/campaigns/new`, `(protected)/campaigns/[id]` (Table + AddCandidateModal + token CopyButton). `app/page.tsx` → server redirect to `/dashboard`.
- **All pages are client components** — forced: the Bearer token is client-only, so protected fetches run after hydration via `hooks/useCampaigns` + `useCampaign`. Data hooks own loading/error/refetch; pages stay declarative.
- **Added backend endpoint** `GET /api/campaigns/:id` (ownership-checked, includes candidates) — Phase 2 only had the list. Verified: candidates included, unknown id → 404, no token → 401.
- Next-16 note: dynamic-route `params` is a Promise — unwrapped with React `use()` in `[id]/page.tsx`.
- Judgment calls: add-candidate is a modal (keeps context, table refreshes in place) with pragmatic a11y (role=dialog/Escape/backdrop/autofocus, no focus-trap); nav rail is dashboard-scoped (sub-pages use back/cancel links); wordmark is "screener-agent" on auth pages while `SplitScreen`'s default says "Interview Agent" — naming still inconsistent across the app.

- **Error handling fixed:** `lib/api.ts` now throws `NetworkError` when `fetch` never reaches the server (backend down/offline), distinct from `ApiError` (a real HTTP response). Login/signup branch on it — network → "Couldn't reach the server…", 401 → "Invalid email or password." Verified: real `api.ts` against a dead port throws `NetworkError`.
- **Full recruiter flow verified in a real headless browser** (puppeteer, `--no-save`): demo login → create campaign → open → add candidate via drawer → row renders; the DOM-rendered interview token matches the DB token exactly. This is the user-clean check, not just compile-clean.

Env: MySQL 9.7 running locally, `DATABASE_URL` works, DB exists. LiveKit / Groq / Gemini / SMTP keys are populated in `.env` — needed Phase 4 onward.

Next: manual click-through to confirm the recruiter flow, then Phase 3b (candidate invite email) / 3c (resume upload + parse). Both frontend and backend must be running (`:3000` + `:4000`).

---

## Conventions

- Secrets in `.env`, never committed. `.gitignore` in every folder.
- Backend owns all database writes. Nothing else writes to MySQL directly.
- Phase 10 SQL lives in `/dbms` as raw `.sql` files — that work is deliberately *not* done through Prisma.