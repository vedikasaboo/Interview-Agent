# Interview-Agent — Build Plan

A from-scratch rebuild of the recruiter hiring + AI voice interview platform, built by you in Claude Code, using entirely free-tier services.

---

## 1. Architecture (what you're building)

```
┌─────────────┐      ┌──────────────┐      ┌─────────────────┐
│  Frontend    │◄────►│   Backend    │◄────►│   MySQL/MariaDB │
│  (Next.js)   │      │ (Express +   │      │   (via Prisma)  │
│  port 3000   │      │  Prisma)     │      └─────────────────┘
│              │      │  port 4000   │
└──────┬───────┘      └──────┬───────┘
       │                     │
       │  joins room         │  issues room token
       ▼                     ▼
┌─────────────────────────────────────┐
│           LiveKit Room               │
│  (WebRTC audio/video transport)      │
└──────┬───────────────────┬───────────┘
       │                   │
   Candidate           Python Agent
   (browser mic)       (STT → LLM → TTS)
```

Three independent services that only talk to each other through the room token / API calls — you can build and test each one mostly in isolation.

---

## 2. Tech stack (all free tier)

| Piece | Choice | Why |
|---|---|---|
| Frontend | Next.js (App Router) | Already scaffolded in your repo structure |
| Backend | Express + Prisma | Typed DB access, simple REST API |
| DB | MySQL/MariaDB, local | Free, no hosting needed while building |
| Realtime transport | LiveKit Cloud (Build tier) | 5,000 WebRTC min + 1,000 agent min/month free |
| LLM | Gemini (`gemini-2.5-flash`) | Free tier, key verified working. Try a 3.x flash model later and compare. |
| STT | Groq Whisper | Free tier. Gemini's STT needs GCP service-account credentials, not just an AI Studio key — not worth the setup tax. |
| TTS | Groq (`playai-tts`) or Gemini (`gemini-2.5-flash-preview-tts`) | Both available on free tier; try either, whichever the LiveKit plugin handles more cleanly |
| VAD | Silero (via LiveKit plugin) | Local, free, no API needed |

**Model names expire.** `gemini-2.5-flash-native-audio-preview-12-2025` from the original code no longer exists — that was the actual cause of the "Gemini key doesn't work" problem, not the key. Before debugging anything model-related, list what's actually available:
```bash
curl -s "https://generativelanguage.googleapis.com/v1beta/models?key=YOUR_KEY" | grep '"name"'
```

**Important architectural note:** your original code used `google.realtime.RealtimeModel` — a combined audio-in/audio-out model where one call did STT+LLM+TTS together. That model has been retired, and nothing on the current AI Studio key list exposes a realtime/streaming method (`gemini-omni-flash-preview` supports only `generateContent`, so it can't hold a live audio stream). Your rebuild therefore uses the **traditional three-piece pipeline**: separate `stt`, `llm`, and `tts` objects passed into `AgentSession`. They don't have to come from the same vendor — mixing Groq and Gemini is fine.

---

## 3. Build phases

Each phase has a goal, what you should understand *before* moving on, and a checkpoint to confirm it works. Code is yours to write — come back with specific errors/blockers rather than asking for finished files.

### Phase -1 — Prerequisites (do before writing any code)
- LiveKit Cloud account → get `LIVEKIT_URL`, `API_KEY`, `API_SECRET`
- Groq account → API key (used for STT, and optionally TTS)
- Google AI Studio key → `GOOGLE_API_KEY` (used for LLM). Note LiveKit's Google plugin expects this exact variable name, not `GEMINI_API_KEY`.
- MySQL/MariaDB installed locally and running
- Gmail app password (for the invite emails in Phase 3b)
- `.gitignore` with `.env` in it, in every folder, before your first commit
- **Accept the PlayAI TTS model terms in the Groq console** (console.groq.com playground → select `playai-tts`). The TTS endpoint returns errors until you do, and it's an easy thing to forget and then spend an hour debugging in Phase 5.

### Phase 0 — Scaffolding
- Set up the three folders (`frontend`, `backend`, `agent`) as separate projects
- Get "hello world" running on all three: Next.js dev server, Express server responding to a health-check route, a bare Python script
- **Checkpoint:** all three run simultaneously without conflicting ports

### Phase 1 — Prisma schema (DB design)

Design the **whole** schema now, including tables you won't use until Phase 9/10. Retrofitting later means migration pain.

- `Recruiter` — auth credentials, company
- `Campaign` — job posting, belongs to a recruiter
- `Candidate` — belongs to a campaign; needs `interviewToken` (unique), `status` (enum: invited/scheduled/interviewed/passed/rejected), `score` (nullable int), `appliedAt`, `interviewedAt`
- `Resume` — parsed resume data tied to a candidate (store structured JSON + raw file path)
- `InterviewSlot` — time, capacity, belongs to campaign *(needed in Phase 10a)*
- `InterviewResult` — transcript, summary, score, belongs to candidate *(needed in Phase 9)*
- `AuditLog` — candidate id, old status, new status, timestamp *(written by trigger in Phase 10b)*

Relations: Recruiter → many Campaigns → many Candidates → one Resume + one InterviewResult

- Run `npx prisma generate` + `npx prisma db push`
- **Concepts to understand:** 1-to-many relations, `@relation` foreign keys, why `db push` ≠ migrations
- **Checkpoint:** open Prisma Studio (`npx prisma studio`) and see all tables matching your design

### Phase 2 — Backend: auth + campaign API
- `POST /api/users/create` — recruiter signup
- `POST /api/login` — returns a session token
- `POST /api/campaigns`, `GET /api/campaigns` — create/list campaigns
- `POST /api/campaigns/:id/candidates` — add a candidate to a campaign
- **Concepts to understand:** password hashing (don't store plaintext — use bcrypt), what a session/JWT token actually is
- **Checkpoint:** full CRUD flow works via `curl` or Postman before touching the frontend

### Phase 3 — Frontend: recruiter side
- Login page → dashboard → create campaign → view candidates
- Wire these to the backend API routes from Phase 2
- **Checkpoint:** a recruiter can log in and create a campaign end-to-end through the UI

### Phase 3b — Candidate invite flow
- When a recruiter adds a candidate, generate a unique `interviewToken` (UUID)
- The "add candidate" form takes name, email, and their resume PDF together — resume upload is part of this flow, not a separate step (see Phase 3c)
- Send an email via SMTP (nodemailer + Gmail app password) containing the link: `http://localhost:3000/interview/<token>`
- **Why this matters:** this is the only way a candidate ever reaches the interview page — without it, there's no candidate-side entry point
- **Checkpoint:** you receive an email with a working link at your own address

### Phase 3c — Resume upload + parsing

Moved earlier deliberately: this is completely independent of LiveKit, and Phase 4 needs its output. Build and test it standalone with no agent, no room, no voice.

- **Upload (recruiter-side — decided):** the recruiter attaches the PDF when adding a candidate to a campaign. Frontend `resume/` page with a file input; backend route accepting the PDF (multer or similar), saving the file, linking it to the candidate. Parsing runs here, ahead of time — not while a candidate waits. If extraction fails (scanned image, weird layout), you find out and fix it before the interview instead of during it.
- **Extract text:** PDF → raw text via a library (`pdf-parse` in Node, `pdfplumber` in Python). Output will be messy — jumbled columns, stray bullet characters. That's expected.
- **Structure it:** one LLM call with a strict prompt — *"Return only JSON with exactly these keys: name, skills[], education[{degree, institution}], experience[{role, company}], projects[{name, technologies[]}]. No markdown, no explanation."* Then parse it.
- **Store:** save the JSON into the `Resume` table
- **Evaluate it (do this — it's your edge):** hand-label ~10 resumes as a gold set and measure whether your parser actually gets the fields right. Track what it misses. This turns "I called an LLM" into "I built and evaluated an extraction pipeline," which is a materially different claim on a resume or in an interview.
- **Known failure modes to watch for:** invented fields that aren't in the source, inconsistent key names between runs, silently dropped entries, JSON wrapped in code fences that breaks parsing
- **Checkpoint:** upload a PDF, get back clean structured JSON stored in the DB, with measured accuracy on your gold set

### Phase 4 — LiveKit token issuance
- Backend route: given a candidate's `interviewToken`, look up the candidate, then mint a LiveKit access token (needs `LIVEKIT_API_KEY`/`SECRET`)
- **Critical:** embed the candidate's context (name, role, skills, resume JSON) as **metadata on the token**. This is exactly what `_extract_candidate_context` reads in Phase 7 — if you skip it here, Phase 7 has nothing to read.
- Room name should be derived from the interview token so agent and candidate land in the same room
- Frontend `interview/[interviewToken]` page: fetch token, connect to LiveKit room, publish mic
- **Concepts to understand:** why the LiveKit secret lives only in the backend, never the frontend; what a room token actually authorizes (room name, participant identity, permissions, metadata)
- **Checkpoint:** you can join the room from a browser tab and see yourself connected in the LiveKit Cloud dashboard — no agent yet

### Phase 5 — Agent v1: bare handshake
- Python agent joins the same room, waits for the candidate, says one hardcoded line via TTS, then exits
- No LLM yet — this phase is purely "does the plumbing work"
- **Concepts to understand:** `JobContext`, `ctx.connect()`, `ctx.wait_for_participant()`, worker dispatch
- **Checkpoint:** you hear the agent speak when you join the room as a candidate

### Phase 6 — Agent v2: real interview loop
- Wire up `AgentSession` with a mixed pipeline: Groq Whisper for `stt`, Gemini for `llm`, Groq or Gemini for `tts`
- Groq's endpoints are OpenAI-compatible, so LiveKit's `openai` plugin classes pointed at `base_url="https://api.groq.com/openai/v1"` should work. Gemini uses LiveKit's `google` plugin with `GOOGLE_API_KEY`.
- **Make the LLM swappable by config, not hardcoded:** read `LLM_PROVIDER` from env and pick the object with an if-statement. Lets you compare Gemini vs Groq interview quality, and keeps you working if one provider is down. Don't build automatic runtime failover — in a live voice call, a failed call plus a retry means the candidate sits in silence, which is worse than just failing.
- Add VAD + turn detection (same as your existing code — `silero.VAD`, `MultilingualModel`)
- Write your own system prompt (don't copy — design what *your* interviewer should ask/prioritize)
- **Concepts to understand:** the STT→LLM→TTS pipeline vs. realtime combined models; turn detection (why an agent needs to know when a human has *finished* talking, not just started)
- **Checkpoint:** a full spoken conversation — you answer a question, it follows up intelligently

### Phase 7 — Candidate context injection
- Pull candidate name/role/skills from participant metadata (like `_extract_candidate_context` in your existing code) and inject into the prompt
- **Checkpoint:** the agent greets you by name and asks about a specific fake "project" you set in test metadata

### Phase 8 — Scoring + writeback (the missing link)

The agent is a separate Python process with **no database access**. It cannot save anything on its own. This phase builds the bridge.

- **8a — Transcript capture:** collect the conversation turns during the session (LiveKit's session gives you transcription events / conversation history)
- **8b — Evaluation:** when the interview ends (`on_exit` or session close), make one final LLM call that takes the full transcript and returns a structured JSON verdict: `{score: 0-100, summary: "...", strengths: [...], concerns: [...]}`
- **8c — Writeback:** the agent POSTs that JSON to a new backend route, e.g. `POST /api/interviews/:interviewToken/result`, which writes to `InterviewResult` and updates the candidate's `status` and `score`
- **Secure it:** that route must not be publicly writable — use a shared secret header between agent and backend
- **Concepts to understand:** why the agent talks to your API rather than the DB directly (separation of concerns, one place owning DB writes)
- **Checkpoint:** finish an interview, then see the score and transcript appear in the DB

### Phase 9 — Recruiter results view
- Display transcript, summary, and score on the recruiter dashboard
- **Checkpoint:** full loop closed — recruiter creates campaign → invites candidate → candidate interviews → recruiter sees scored results

---

### Phase 10 — DBMS module (interview scheduling + analytics)

This phase exists specifically to demonstrate real SQL/DBMS usage — not CRUD through an ORM. Write the queries in this phase as **raw SQL** (Prisma's `$queryRaw` / `$executeRaw`, or a direct `mysql2` connection), not `prisma.model.findMany()`. That distinction is the whole point.

**Where this fits in the product:** Phase 3b emails the candidate a link that drops them straight into an interview. Slot booking inserts a step between those: the emailed link first lands on a "pick your slot" page, they book one, and only then do they get access to the interview room at that time. Decide now whether you want scheduling to be real (interview page checks the booked time) or just a parallel feature that exists for the DBMS deliverable. Either is defensible — but know which one you're doing so the two flows don't contradict each other.

**10a — Slot booking with transactions**
- Recruiter creates `InterviewSlot` rows (time, campaign, capacity)
- Candidate books a slot: wrap the check-and-book in an explicit transaction with `SELECT ... FOR UPDATE` to lock the row, so two simultaneous bookings can't both succeed
- Simulate the race condition yourself (two requests fired at once) and show it fails safely instead of double-booking
- **What this proves:** you understand transactions, locking, and ACID — not just that you called `BEGIN`

**10b — Audit trail via trigger**
- Write a MySQL `AFTER UPDATE` trigger on `Candidate` that inserts a row into `AuditLog` (old status, new status, timestamp) whenever `status` changes
- Do NOT do this in application code — the point is the trigger fires even if someone updates the row from a raw SQL client, proving it's enforced at the DB layer
- **What this proves:** triggers, DB-level integrity enforcement

**10c — Analytics queries**
Write these as raw SQL, not Prisma helpers:
- Pass rate per campaign: `JOIN` Campaign → Candidate, `GROUP BY` campaign, `COUNT`/`CASE WHEN` for pass ratio
- Rank candidates within a campaign by score: window function (`RANK() OVER (PARTITION BY campaign_id ORDER BY score DESC)`)
- Average time-to-interview: `TIMESTAMPDIFF` between application and interview timestamps
- **What this proves:** joins, aggregation, window functions, subqueries

**10d — Indexing proof**
- Seed the `Candidate` table with a few thousand fake rows
- Run a skill-search query, capture `EXPLAIN` output (full table scan)
- Add an index on the relevant column, re-run, capture `EXPLAIN` again (index used, fewer rows scanned)
- Keep both `EXPLAIN` outputs — this before/after is the single most convincing artifact you can show
- **What this proves:** you understand query plans, not just that indexes exist

**10e — Stored procedure (optional but cheap to add)**
- Wrap the "finalize interview result" logic (update candidate status + insert audit log + compute final score) into a single stored procedure called from the backend
- **What this proves:** procedural SQL, encapsulating multi-step logic at the DB layer

Keep the raw `.sql` files (trigger definition, stored procedure, the analytics queries, both `EXPLAIN` outputs) in a `/dbms` folder in your repo — that's your evidence, independent of whatever the app's UI looks like.

---

## 4. Suggested order of attack

**Block A (no AI voice, pure web dev):** Phases -1 → 0 → 1 → 2 → 3 → 3b → 3c → 4
CRUD, auth, email, resume parsing, LiveKit plumbing. The only AI here is the resume parser, which is a plain HTTP call — no audio, no realtime, nothing that can fail mysteriously.

**Block B (the agent):** Phases 5 → 6 → 7
Where the actual learning is. Build v1 dead simple before touching the LLM.

**Block C (closing the loop):** Phases 8 → 9
Scoring, writeback, results UI.

**Block D (DBMS deliverable):** Phase 10
Can be done any time after Phase 1, but 10c/10d are more convincing once there's real data flowing.

### Dependency warnings
- **Phase 3c → Phase 4:** resume JSON must exist before you can embed it in the token metadata
- **Phase 4 → Phase 7:** the candidate metadata must be embedded in the LiveKit token in Phase 4, or Phase 7 has nothing to extract
- **Phase -1 → Phase 5:** PlayAI model terms must be accepted in the Groq console or TTS fails silently
- **Phase 1 → Phase 8/10:** the schema must already contain `InterviewResult`, `InterviewSlot`, `AuditLog`, `status`, `score`
- **Phase 8 → Phase 10c:** analytics queries rank by `score`, which only exists once writeback works

Good next step: start Phase -1/0/1 in Claude Code, and come back here when you hit something confusing or broken — that's when walking through it together is most useful.