# Resume-parser evaluation

Measures how well the extraction pipeline (`pdf.service` → `gemini.service`)
turns real resume PDFs into the structured schema, against a hand-labeled gold set.

## Layout

```
fixtures/   real resume PDFs        (gitignored — may contain personal info)
gold/       hand-labeled JSON       (committed — the labels are fine to share)
results/    timestamped run dumps   (gitignored — derived from fixtures)
run.ts      the runner
```

Pair a fixture with its gold by basename: `fixtures/ada.pdf` ↔ `gold/ada.json`.
Each gold file matches the `parsedResumeSchema` shape (see `src/services/resume.schema.ts`).

## Adding the gold set

1. Drop ~10 real resume PDFs into `fixtures/`.
2. For each, hand-write `gold/<name>.json` with the correct extraction.
3. Run it.

## Running

```
npm run eval:resumes
```

It runs the **same pipeline the route uses** (imported services, not HTTP) over
every fixture and prints per-fixture metrics plus an aggregate, and writes a JSON
dump under `results/`.

## Metrics

- **name** — exact match (case-insensitive)
- **skills** — precision / recall / F1 (set-based)
- **education / experience / projects** — entity-level Jaccard (keyed by
  degree+institution, role+company, and project name respectively)

`gold/jane-doe.json` is a committed **example** of the label format (its fixture
is synthetic and not shipped). Replace the set with your own labeled resumes.
