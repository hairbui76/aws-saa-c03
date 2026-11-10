// Checks that every video of the new course is referenced by a note's `videos:` and that every reference is valid.
//   node scripts/course-coverage.mjs <manifest.json> [--allow <file>] [--section N]...
// --allow: lines "NNN  reason" (blank lines and # comments ignored) for videos deliberately left unmapped.
// --section: restrict `unmapped` to these course sections (repeatable); `unknown` is always checked for every note.
// Exit 1 when `unmapped` (after filtering) or `unknown` is not empty.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { courseCoverage } from './lib/updates.mjs';
import { parseFrontmatter } from './lib/frontmatter.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.resolve(here, '../../data');

const args = process.argv.slice(2);
let manifestPath = null;
let allowPath = null;
const sections = new Set();
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--allow') allowPath = args[++i];
  else if (args[i] === '--section') sections.add(Number(args[++i]));
  else if (!manifestPath) manifestPath = args[i];
  else {
    console.error(`Unexpected argument: ${args[i]}`);
    process.exit(2);
  }
}
if (!manifestPath || [...sections].some(Number.isNaN)) {
  console.error('Usage: node scripts/course-coverage.mjs <manifest.json> [--allow <file>] [--section N]...');
  process.exit(2);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const sectionTitles = new Map(manifest.videos.map((v) => [v.section_order, v.section_title]));

const allow = new Set();
if (allowPath) {
  if (fs.existsSync(allowPath)) {
    for (const line of fs.readFileSync(allowPath, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*(\d{3})(?:\s|$)/);
      if (m) allow.add(m[1]);
    }
  } else console.warn(`(allow file not found: ${allowPath}; treated as empty)`);
}

// same note discovery as build-content.mjs: chapter folders "NN Title" with an _MOC file; skip the MOC itself
const noteRefs = [];
for (const d of fs.readdirSync(DATA, { withFileTypes: true }).filter((e) => e.isDirectory() && /^\d\d /.test(e.name))) {
  const files = fs.readdirSync(path.join(DATA, d.name)).filter((f) => f.endsWith('.md'));
  if (!files.some((f) => f.startsWith('_MOC'))) continue;
  for (const f of files) {
    if (f.startsWith('_MOC')) continue;
    const { meta } = parseFrontmatter(fs.readFileSync(path.join(DATA, d.name, f), 'utf8'));
    noteRefs.push({ name: f.replace(/\.md$/, ''), videos: meta.videos ? [].concat(meta.videos).map(String) : [] });
  }
}

const r = courseCoverage(manifest.videos, noteRefs, allow);
const unmapped = sections.size ? r.unmapped.filter((u) => sections.has(u.section)) : r.unmapped;

console.log(`notes: ${noteRefs.length}, videos: ${manifest.videos.length}, allowed: ${allow.size}${sections.size ? `, sections: ${[...sections].join(',')}` : ''}`);
console.log(`\nunmapped (${unmapped.length}):`);
const bySection = new Map();
for (const u of unmapped) bySection.set(u.section, [...(bySection.get(u.section) ?? []), u]);
for (const [s, list] of [...bySection].sort((a, b) => a[0] - b[0])) {
  console.log(`  section ${s} ${sectionTitles.get(s) ?? ''} (${list.length})`);
  for (const u of list) console.log(`    ${u.num} ${u.title}`);
}
console.log(`\nunknown (${r.unknown.length}):`);
for (const u of r.unknown) console.log(`  ${u.name}: "${u.ref}"`);
console.log(`\nmulti-use (info, ${r.multi.length}):`);
for (const m of r.multi) console.log(`  ${m.num}: ${m.notes.join(', ')}`);

process.exit(unmapped.length || r.unknown.length ? 1 : 0);
