// Reads the Obsidian vault in ../data and emits JSON the web app fetches at runtime:
//   public/content/index.json        chapters, lesson list, search index
//   public/content/thumbs.json       one small diagram per chapter for the home cards
//   public/content/c/<chapter>.json  chapter (MOC) page
//   public/content/l/<lesson>.json   lesson body, diagrams, quiz, prev/next
//   public/content/cheat-sheet.json
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const WEB = path.resolve(here, '..');
const DATA = path.resolve(WEB, '../data');
const VIDEOS = path.resolve(WEB, '../videos');
const QUIZZES = path.resolve(WEB, 'quizzes');
const OUT = path.resolve(WEB, 'public/content');

const slugify = (s) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

function parseFrontmatter(src) {
  const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return { meta: {}, body: src };
  const meta = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (!kv) continue;
    let v = kv[2].trim();
    if (v.startsWith('[')) {
      try {
        v = JSON.parse(v);
      } catch {
        v = v
          .slice(1, -1)
          .split(',')
          .map((x) => x.trim().replace(/^["']|["']$/g, ''))
          .filter(Boolean);
      }
    }
    meta[kv[1]] = v;
  }
  return { meta, body: src.slice(m[0].length) };
}

// ---------- pass 1: collect chapters, lessons, diagrams ----------
const chapters = [];
const nameToRoute = new Map(); // note name / alias (lowercase) -> route
const diagramFiles = new Map(); // diagram name -> abs path

const chapterDirs = fs
  .readdirSync(DATA, { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^\d\d /.test(d.name))
  .map((d) => d.name)
  .sort();

for (const dir of chapterDirs) {
  const num = dir.slice(0, 2);
  const title = dir.slice(3);
  const abs = path.join(DATA, dir);
  const files = fs.readdirSync(abs).filter((f) => f.endsWith('.md'));
  const mocFile = files.find((f) => f.startsWith('_MOC'));
  const chapter = { id: num, num, title, dir, mocFile, lessons: [] };
  for (const f of files) {
    if (f === mocFile) continue;
    const name = f.replace(/\.md$/, '');
    const src = fs.readFileSync(path.join(abs, f), 'utf8');
    const { meta, body } = parseFrontmatter(src);
    chapter.lessons.push({ id: slugify(name), name, meta, body, chapterId: num });
  }
  const diagDir = path.join(abs, '_diagrams');
  if (fs.existsSync(diagDir)) {
    for (const f of fs.readdirSync(diagDir)) {
      if (f.endsWith('.excalidraw.md')) diagramFiles.set(f.replace(/\.excalidraw\.md$/, ''), path.join(diagDir, f));
    }
  }
  chapters.push(chapter);
}

for (const ch of chapters) {
  nameToRoute.set(ch.mocFile.replace(/\.md$/, '').toLowerCase(), `/c/${ch.id}`);
  for (const l of ch.lessons) {
    nameToRoute.set(l.name.toLowerCase(), `/l/${l.id}`);
  }
}
// aliases second so real names win on collisions
for (const ch of chapters) {
  for (const l of ch.lessons) {
    for (const a of [].concat(l.meta.aliases || [])) {
      const k = String(a).toLowerCase();
      if (!nameToRoute.has(k)) nameToRoute.set(k, `/l/${l.id}`);
    }
  }
}
nameToRoute.set('00 home', '/');
nameToRoute.set('exam cheat sheet', '/cheat-sheet');

// ---------- markdown transforms ----------
const unresolved = new Set();

function resolveLink(target) {
  const [page, heading] = target.split('#');
  const route = nameToRoute.get(page.trim().toLowerCase());
  if (!route) {
    unresolved.add(page.trim());
    return null;
  }
  return heading ? `${route}?h=${encodeURIComponent(heading.trim())}` : route;
}

// Transform outside fenced code blocks only.
function mapOutsideCode(md, fn) {
  const parts = md.split(/(^```[\s\S]*?^```)/m);
  return parts.map((p, i) => (i % 2 === 1 ? p : fn(p))).join('');
}

function transformMarkdown(md, usedDiagrams) {
  return mapOutsideCode(md, (text) =>
    text
      // static-image hint line under each embed
      .replace(/^\*[^\n]*\.svg\]\][^\n]*\*\s*$/gm, '')
      // diagram embeds -> fenced block rendered by the AnimatedDiagram component
      .replace(/!\[\[([^\]]+?)\.excalidraw\]\]/g, (_, name) => {
        usedDiagrams.add(name);
        return '\n```diagram\n' + name + '\n```\n';
      })
      .replace(/!\[\[[^\]]+\]\]/g, '')
      .replace(/\[\[([^\]]+?)\]\]/g, (_, inner) => {
        const [target, ...rest] = inner.split(/\\?\|/);
        const label = rest.length ? rest.join('|') : target.split('#').pop();
        const href = resolveLink(target);
        return href ? `[${label}](${href})` : `**${label}**`;
      })
  );
}

// ---------- diagrams ----------
function loadDiagram(name) {
  const file = diagramFiles.get(name);
  if (!file) return null;
  const src = fs.readFileSync(file, 'utf8');
  const m = src.match(/```json\r?\n([\s\S]*?)\r?\n```/);
  if (!m) return null;
  const j = JSON.parse(m[1]);
  const els = j.elements
    .filter((e) => !e.isDeleted)
    .map((e) => {
      const o = {
        id: e.id,
        type: e.type,
        x: r(e.x),
        y: r(e.y),
        w: r(e.width),
        h: r(e.height),
        stroke: e.strokeColor,
        seed: e.seed,
      };
      if (e.backgroundColor && e.backgroundColor !== 'transparent') o.bg = e.backgroundColor;
      if (e.strokeWidth !== 2) o.sw = e.strokeWidth;
      if (e.strokeStyle !== 'solid') o.dash = e.strokeStyle;
      if (e.roundness) o.round = 1;
      if (e.opacity !== 100) o.op = e.opacity;
      if (e.type === 'text') {
        o.text = e.text;
        o.fs = e.fontSize;
        o.align = e.textAlign;
        if (e.containerId) o.cid = e.containerId;
      }
      if (e.type === 'arrow' || e.type === 'line') {
        o.pts = e.points.map(([a, b]) => [r(a), r(b)]);
        if (e.startBinding) o.from = e.startBinding.elementId;
        if (e.endBinding) o.to = e.endBinding.elementId;
        if (e.startArrowhead) o.sa = 1;
        if (e.endArrowhead) o.ea = 1;
      }
      return o;
    });
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const e of els) {
    const xs = e.pts ? e.pts.map((p) => e.x + p[0]) : [e.x, e.x + e.w];
    const ys = e.pts ? e.pts.map((p) => e.y + p[1]) : [e.y, e.y + e.h];
    minX = Math.min(minX, ...xs);
    maxX = Math.max(maxX, ...xs);
    minY = Math.min(minY, ...ys);
    maxY = Math.max(maxY, ...ys);
  }
  const pad = 16;
  return { box: [r(minX - pad), r(minY - pad), r(maxX - minX + 2 * pad), r(maxY - minY + 2 * pad)], els };
}
function r(n) {
  return Math.round(n * 10) / 10;
}

// ---------- videos ----------
const videoByNum = new Map();
if (fs.existsSync(VIDEOS)) {
  for (const f of fs.readdirSync(VIDEOS)) {
    const m = f.match(/^(\d{4})_.*\.mp4$/i);
    if (m) videoByNum.set(m[1], f);
  }
}

// ---------- quizzes ----------
const quizByLesson = new Map();
if (fs.existsSync(QUIZZES)) {
  for (const f of fs.readdirSync(QUIZZES).filter((f) => f.endsWith('.json'))) {
    try {
      const q = JSON.parse(fs.readFileSync(path.join(QUIZZES, f), 'utf8'));
      for (const [name, qs] of Object.entries(q.lessons || {})) quizByLesson.set(name.toLowerCase(), qs);
    } catch (e) {
      console.warn(`! quiz file ${f} is not valid JSON yet: ${e.message}`);
    }
  }
}

// ---------- pass 2: build output ----------
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, 'l'), { recursive: true });
fs.mkdirSync(path.join(OUT, 'c'), { recursive: true });
const write = (p, obj) => fs.writeFileSync(path.join(OUT, p), JSON.stringify(obj));

function splitTitle(body, fallback) {
  const m = body.match(/^#\s+(.+)\r?\n/m);
  if (!m) return { title: fallback, rest: body };
  return { title: m[1].trim(), rest: body.slice(m.index + m[0].length) };
}

function extractTldr(md) {
  const m = md.match(/^>\s*\*\*TL;DR:\*\*\s*([\s\S]*?)(?:\r?\n(?!>)|$)/m);
  if (!m) return '';
  return m[1]
    .replace(/\r?\n>\s*/g, ' ')
    .replace(/\[\[([^\]|]+?)(?:\\?\|([^\]]+))?\]\]/g, (_, a, b) => b || a)
    .trim();
}

const plain = (s) => s.replace(/\*\*|`/g, '').replace(/\[\[([^\]|]+?)(?:\\?\|([^\]]+))?\]\]/g, (_, a, b) => b || a);

const index = { chapters: [], search: [] };
const thumbs = {};
const flatOrder = [];
let diagramCount = 0;
let quizCount = 0;

for (const ch of chapters) {
  const mocSrc = fs.readFileSync(path.join(DATA, ch.dir, ch.mocFile), 'utf8');
  const { body: mocBody } = parseFrontmatter(mocSrc);
  const { rest: mocRest } = splitTitle(mocBody, ch.title);
  const description = plain(mocRest.trim().split(/\r?\n\r?\n/)[0]);

  // learning path order + one-line summaries from "Lộ trình học"
  const order = [];
  const summaries = new Map();
  const pathSec = mocRest.match(/## Lộ trình học\r?\n([\s\S]*?)(?=\r?\n## |$)/);
  if (pathSec) {
    for (const line of pathSec[1].split(/\r?\n/)) {
      const m = line.match(/^\d+\.\s+\[\[([^\]|]+?)(?:\\?\|[^\]]+)?\]\]\s*:?\s*(.*)$/);
      if (m) {
        order.push(m[1].trim().toLowerCase());
        summaries.set(m[1].trim().toLowerCase(), plain(m[2].trim()));
      }
    }
  }
  const rank = (l) => {
    const i = order.indexOf(l.name.toLowerCase());
    return i === -1 ? 1000 : i;
  };
  ch.lessons.sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));

  // chapter page body: drop the intro paragraph, nav line and learning path (rendered from `lessons`)
  const mocUsed = new Set();
  const mocMd = transformMarkdown(
    mocRest
      .replace(/^[^\n]*\r?\n\r?\n/, '')
      .replace(/^← .*$/m, '')
      .replace(/## Lộ trình học\r?\n[\s\S]*?(?=\r?\n## |$)/, ''),
    mocUsed
  );

  const chEntry = {
    id: ch.id,
    num: ch.num,
    title: ch.title,
    description,
    lessons: ch.lessons.map((l) => ({
      id: l.id,
      title: l.name,
      summary: summaries.get(l.name.toLowerCase()) || '',
      quiz: (quizByLesson.get(l.name.toLowerCase()) || []).length,
    })),
  };
  index.chapters.push(chEntry);
  write(`c/${ch.id}.json`, { ...chEntry, body: mocMd });

  for (const l of ch.lessons) flatOrder.push({ ch, l });
}

flatOrder.forEach(({ ch, l }, i) => {
  const used = new Set();
  const { title, rest } = splitTitle(l.body, l.name);
  const tldr = extractTldr(rest);
  // drop the TL;DR blockquote from the body; the page renders it as a card
  const body = transformMarkdown(rest.replace(/^>\s*\*\*TL;DR:\*\*[\s\S]*?(?=\r?\n(?!>)|$)/m, '').trim(), used);
  const diagrams = {};
  for (const name of used) {
    const d = loadDiagram(name);
    if (d) {
      diagrams[name] = d;
      diagramCount++;
      if (!thumbs[ch.id]) thumbs[ch.id] = d;
    }
  }
  const lectures = [].concat(l.meta.lessons || []).map((s) => {
    const num = String(s).slice(0, 4);
    return { num, title: String(s).slice(5), video: videoByNum.get(num) || null };
  });
  const quiz = quizByLesson.get(l.name.toLowerCase()) || [];
  quizCount += quiz.length;
  const prev = flatOrder[i - 1];
  const next = flatOrder[i + 1];
  write(`l/${l.id}.json`, {
    id: l.id,
    title,
    name: l.name,
    chapterId: ch.id,
    chapterTitle: ch.title,
    aliases: [].concat(l.meta.aliases || []),
    tldr,
    body,
    diagrams,
    lectures,
    quiz,
    prev: prev ? { id: prev.l.id, title: prev.l.name } : null,
    next: next ? { id: next.l.id, title: next.l.name } : null,
  });
  index.search.push({ id: l.id, t: l.name, a: [].concat(l.meta.aliases || []).join(' · '), c: ch.id, d: tldr.slice(0, 220) });
});

// cheat sheet
{
  const src = fs.readFileSync(path.join(DATA, 'Exam Cheat Sheet.md'), 'utf8');
  const { body } = parseFrontmatter(src);
  const { title, rest } = splitTitle(body, 'Exam Cheat Sheet');
  write('cheat-sheet.json', { title, body: transformMarkdown(rest, new Set()) });
}

write('index.json', index);
write('thumbs.json', thumbs);

const lessonTotal = flatOrder.length;
const withQuiz = flatOrder.filter(({ l }) => quizByLesson.has(l.name.toLowerCase())).length;
console.log(
  `content: ${chapters.length} chapters, ${lessonTotal} lessons, ${diagramCount} diagrams, ` +
    `${quizCount} quiz questions (${withQuiz}/${lessonTotal} lessons), ${videoByNum.size} local videos`
);
if (unresolved.size) console.log(`  unresolved wikilinks (rendered bold): ${[...unresolved].slice(0, 15).join(', ')}${unresolved.size > 15 ? '…' : ''}`);
