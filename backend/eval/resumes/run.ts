import { readdir, readFile, writeFile, mkdir } from "fs/promises";
import { join, basename, extname } from "path";
import { extractPdfText } from "../../src/services/pdf.service";
import { parseResumeText } from "../../src/services/resumeParser.service";
import { parsedResumeSchema, type ParsedResume } from "../../src/services/resume.schema";

// Runs the SAME extraction pipeline the route uses (service imports, not HTTP)
// over every fixture PDF and scores the output against a hand-labeled gold file.
// fixtures/<name>.pdf  ↔  gold/<name>.json

const DIR = join(process.cwd(), "eval", "resumes");
const FIXTURES = join(DIR, "fixtures");
const GOLD = join(DIR, "gold");
const RESULTS = join(DIR, "results");

const norm = (s: string) => s.trim().toLowerCase();

// Precision/recall/F1 for a set of strings (skills).
function setMetrics(pred: string[], gold: string[]) {
  const p = new Set(pred.map(norm));
  const g = new Set(gold.map(norm));
  let tp = 0;
  for (const x of p) if (g.has(x)) tp++;
  const precision = p.size ? tp / p.size : g.size ? 0 : 1;
  const recall = g.size ? tp / g.size : 1;
  const f1 = precision + recall ? (2 * precision * recall) / (precision + recall) : 0;
  return { precision, recall, f1 };
}

// Entity-level Jaccard: how much the predicted set of entity keys overlaps gold.
function jaccard(pred: string[], gold: string[]) {
  const p = new Set(pred.map(norm));
  const g = new Set(gold.map(norm));
  if (p.size === 0 && g.size === 0) return 1;
  let inter = 0;
  for (const x of p) if (g.has(x)) inter++;
  const union = p.size + g.size - inter;
  return union ? inter / union : 1;
}

const eduKey = (e: ParsedResume["education"][number]) => `${e.degree}|${e.institution}`;
const expKey = (e: ParsedResume["experience"][number]) => `${e.role}|${e.company}`;
const projKey = (p: ParsedResume["projects"][number]) => p.name;
const researchKey = (r: ParsedResume["research"][number]) => r.title;

interface Row {
  fixture: string;
  nameMatch: boolean;
  skills: ReturnType<typeof setMetrics>;
  eduJaccard: number;
  expJaccard: number;
  projJaccard: number;
  researchJaccard: number;
}

async function main() {
  await mkdir(RESULTS, { recursive: true });

  let pdfs: string[] = [];
  try {
    pdfs = (await readdir(FIXTURES)).filter((f) => extname(f).toLowerCase() === ".pdf").sort();
  } catch {
    // fixtures/ absent
  }
  if (pdfs.length === 0) {
    console.log(
      "No fixtures found in eval/resumes/fixtures/.\n" +
        "Add real resume PDFs there and a matching hand-labeled gold JSON in eval/resumes/gold/\n" +
        "(same basename, e.g. fixtures/ada.pdf ↔ gold/ada.json), then re-run.",
    );
    return;
  }

  const rows: Row[] = [];
  for (const pdf of pdfs) {
    const base = basename(pdf, extname(pdf));
    let gold: ParsedResume;
    try {
      gold = parsedResumeSchema.parse(JSON.parse(await readFile(join(GOLD, `${base}.json`), "utf8")));
    } catch {
      console.log(`SKIP ${base}: missing or invalid gold/${base}.json`);
      continue;
    }

    const buffer = await readFile(join(FIXTURES, pdf));
    const text = await extractPdfText(buffer);
    const pred = await parseResumeText(text);

    const row: Row = {
      fixture: base,
      nameMatch: norm(pred.name) === norm(gold.name),
      skills: setMetrics(pred.skills, gold.skills),
      eduJaccard: jaccard(pred.education.map(eduKey), gold.education.map(eduKey)),
      expJaccard: jaccard(pred.experience.map(expKey), gold.experience.map(expKey)),
      projJaccard: jaccard(pred.projects.map(projKey), gold.projects.map(projKey)),
      researchJaccard: jaccard(pred.research.map(researchKey), gold.research.map(researchKey)),
    };
    rows.push(row);
    console.log(
      `${base.padEnd(22)} name:${row.nameMatch ? "✓" : "✗"}  ` +
        `skillsF1:${row.skills.f1.toFixed(2)}  edu:${row.eduJaccard.toFixed(2)}  ` +
        `exp:${row.expJaccard.toFixed(2)}  proj:${row.projJaccard.toFixed(2)}  ` +
        `res:${row.researchJaccard.toFixed(2)}`,
    );
  }

  if (rows.length === 0) return;

  const n = rows.length;
  const avg = (f: (r: Row) => number) => rows.reduce((s, r) => s + f(r), 0) / n;
  const aggregate = {
    n,
    nameAccuracy: rows.filter((r) => r.nameMatch).length / n,
    skillsPrecision: avg((r) => r.skills.precision),
    skillsRecall: avg((r) => r.skills.recall),
    skillsF1: avg((r) => r.skills.f1),
    eduJaccard: avg((r) => r.eduJaccard),
    expJaccard: avg((r) => r.expJaccard),
    projJaccard: avg((r) => r.projJaccard),
    researchJaccard: avg((r) => r.researchJaccard),
  };

  console.log(`\nAGGREGATE (n=${n})`);
  console.log(`  name accuracy:  ${(aggregate.nameAccuracy * 100).toFixed(0)}%`);
  console.log(
    `  skills P/R/F1:  ${aggregate.skillsPrecision.toFixed(2)}/${aggregate.skillsRecall.toFixed(2)}/${aggregate.skillsF1.toFixed(2)}`,
  );
  console.log(`  education J:    ${aggregate.eduJaccard.toFixed(2)}`);
  console.log(`  experience J:   ${aggregate.expJaccard.toFixed(2)}`);
  console.log(`  projects J:     ${aggregate.projJaccard.toFixed(2)}`);
  console.log(`  research J:     ${aggregate.researchJaccard.toFixed(2)}`);

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outPath = join(RESULTS, `${stamp}.json`);
  await writeFile(outPath, JSON.stringify({ timestamp: new Date().toISOString(), rows, aggregate }, null, 2));
  console.log(`\nWrote ${outPath}`);
}

main().catch((e) => {
  console.error("eval failed:", e?.message);
  process.exit(1);
});
