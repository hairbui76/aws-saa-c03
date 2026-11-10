// Lists diagrams whose voice-over is missing or stale, and checks narration is up to date.
//   node scripts/narration-todo.mjs [--check] [lessonId...]
// Reads public/content/l/*.json (run `npm run content` first) and narration/<lessonId>.json.
// Without --check: prints every diagram with no narration or a different `sig`, with its step contents (the input
//   for writing narration/<lessonId>.json: { [diagramName]: { sig, steps: string[] } }).
// With --check: exit 1 if any diagram has a stale sig (any lesson), or a diagram of a "new" lesson (web/updates.json,
//   kind "new") has no narration.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildModel, stepContents, stepSig } from '../src/lib/diagram.ts';
import { slugify } from './lib/updates.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const WEB = path.resolve(here, '..');
const CONTENT = path.join(WEB, 'public/content');
const NARRATION = path.join(WEB, 'narration');
const UPDATES = process.env.SAA_UPDATES || path.join(WEB, 'updates.json');

const args = process.argv.slice(2);
const check = args.includes('--check');
const only = args.filter((a) => !a.startsWith('--'));

const readJson = (p, fallback) => {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return fallback;
  }
};

const lessonDir = path.join(CONTENT, 'l');
if (!fs.existsSync(lessonDir)) {
  console.error(`narration-todo: ${path.relative(process.cwd(), lessonDir) || lessonDir} not found. Run "npm run content" first.`);
  process.exit(2);
}

const batch = readJson(UPDATES, null);
const newIds = new Set(Object.entries(batch?.lessons ?? {}).filter(([, u]) => u?.kind === 'new').map(([name]) => slugify(name)));

const ids = fs.readdirSync(lessonDir).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5)).sort();
for (const id of only) {
  if (!ids.includes(id)) {
    console.error(`narration-todo: unknown lesson id "${id}"`);
    process.exit(2);
  }
}

let missingCount = 0;
let staleCount = 0;
const failures = [];
for (const id of only.length ? only : ids) {
  const lesson = readJson(path.join(lessonDir, `${id}.json`), null);
  if (!lesson?.diagrams) continue;
  const narration = readJson(path.join(NARRATION, `${id}.json`), {});
  for (const [name, d] of Object.entries(lesson.diagrams)) {
    const model = buildModel(d);
    const sig = stepSig(model);
    const have = narration[name];
    if (have?.sig === sig) continue;
    const state = have ? 'stale' : 'missing';
    if (state === 'missing') missingCount++;
    else staleCount++;
    if (state === 'stale') failures.push(`${id} / ${name}: stale narration`);
    if (state === 'missing' && newIds.has(id)) failures.push(`${id} / ${name}: new lesson, no narration`);
    console.log(`${id} / ${name} [${state}${newIds.has(id) ? ', new lesson' : ''}]`);
    console.log(`  sig: ${sig}`);
    console.log(`  steps: ${model.steps.length}${have ? ` (narrated: ${have.steps.length})` : ''}`);
    model.steps.forEach((s, i) => console.log(`  ${i}. ${s.caption ? `[caption] ${s.caption} | ` : ''}${stepContents(model, i).join('; ').slice(0, 700)}`));
  }
}
console.log(`\nnarration: ${missingCount} missing, ${staleCount} stale`);
if (check) {
  if (failures.length) {
    console.error(`\nnarration --check FAILED (${failures.length}):`);
    for (const f of failures) console.error(`  ${f}`);
    process.exit(1);
  }
  console.log('narration --check OK');
}
