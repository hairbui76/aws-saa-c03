// Update-batch library: validates web/updates.json against the notes and derives
// the data the UI needs (index for the "what's new" popup, per-lesson markers).
// build-content.mjs does the rest of the file IO; only indexVideos touches the disk here.
import fs from 'node:fs';
import path from 'node:path';

export const slugify = (s) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const KINDS = ['new', 'updated', 'removed'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const NEW_QUIZ_COUNT = 5;

// `## ` heading texts of a note body, ignoring anything inside code fences.
export function noteHeadings(body) {
  const out = [];
  let fence = null;
  for (const raw of body.split(/\r?\n/)) {
    const line = raw.trim();
    const m = line.match(/^(`{3,}|~{3,})/);
    if (m) {
      if (!fence) fence = m[1][0];
      else if (fence === m[1][0]) fence = null;
      continue;
    }
    if (fence) continue;
    if (line.startsWith('## ')) out.push(line.slice(3).trim());
  }
  return out;
}

const isStrArray = (v) => Array.isArray(v) && v.every((x) => typeof x === 'string');

// Returns a list of error strings; empty means valid.
export function validateBatch(batch, notes) {
  const errs = [];
  const err = (msg) => errs.push(`updates.json: ${msg}`);
  if (!batch || typeof batch !== 'object') return ['updates.json: nội dung phải là một object'];

  if (typeof batch.id !== 'string' || !DATE_RE.test(batch.id)) err('"id" phải có dạng YYYY-MM-DD');
  if (typeof batch.date !== 'string' || !DATE_RE.test(batch.date)) err('"date" phải có dạng YYYY-MM-DD');
  if (typeof batch.title !== 'string' || !batch.title.trim()) err('"title" không được để trống');
  if (!isStrArray(batch.pages)) err('"pages" phải là mảng chuỗi');
  if (!isStrArray(batch.missing)) err('"missing" phải là mảng chuỗi');
  if (!batch.lessons || typeof batch.lessons !== 'object' || Array.isArray(batch.lessons)) {
    err('"lessons" phải là một object');
    return errs;
  }

  const byName = new Map(notes.map((n) => [n.name, n]));
  for (const [name, u] of Object.entries(batch.lessons)) {
    const note = byName.get(name);
    if (!note) {
      err(`"${name}" không phải tên một ghi chú trong data/`);
      continue;
    }
    if (!u || typeof u !== 'object') {
      err(`${name}: mục phải là một object`);
      continue;
    }
    const kind = u.kind;
    if (kind !== undefined && !KINDS.includes(kind)) {
      err(`${name}: kind "${kind}" không hợp lệ (chỉ nhận ${KINDS.join(', ')})`);
      continue;
    }
    const changed = u.changed ?? [];
    const dropped = u.dropped ?? [];
    if (!isStrArray(changed) || !isStrArray(dropped)) {
      err(`${name}: "changed" và "dropped" phải là mảng chuỗi`);
      continue;
    }

    if (kind && (typeof u.summary !== 'string' || !u.summary.trim())) err(`${name}: kind "${kind}" cần "summary"`);
    if (kind === 'updated' && !changed.length && !dropped.length) {
      err(`${name}: bài "updated" phải có ít nhất một mục trong "changed" hoặc "dropped"`);
    }
    if (!kind && !dropped.length) err(`${name}: không có "kind" thì "dropped" không được rỗng`);

    for (const [field, list] of [['changed', changed], ['dropped', dropped]]) {
      for (const h of list) {
        if (!note.headings.includes(h)) err(`${name}: heading "${h}" trong "${field}" không có trong ghi chú`);
      }
    }
    for (const h of changed) {
      if (dropped.includes(h)) err(`${name}: heading "${h}" nằm ở cả "changed" lẫn "dropped"`);
    }

    if (kind === 'new') {
      if (note.quizCount !== NEW_QUIZ_COUNT) err(`${name}: bài mới cần đúng ${NEW_QUIZ_COUNT} câu quiz (hiện có ${note.quizCount})`);
      if (note.diagramCount < 1) err(`${name}: bài mới cần ít nhất một sơ đồ`);
    }
    if ((kind === 'new' || kind === 'updated') && !note.videos.length) {
      err(`${name}: bài "${kind}" phải trỏ tới ít nhất một video của bản khóa mới`);
    }
    if (kind === 'removed' && note.videos.length) {
      err(`${name}: bài "removed" không được trỏ tới video của bản khóa mới`);
    }
  }
  return errs;
}

// Index for the popup / badges. Only lessons with a `kind` are listed; chapters
// with none are left out. Order follows `chapters`.
export function buildUpdatesIndex(batch, chapters) {
  if (!batch) return null;
  const counts = { new: 0, updated: 0, removed: 0 };
  const out = [];
  for (const ch of chapters) {
    const items = [];
    for (const l of ch.lessons) {
      const u = batch.lessons[l.name];
      if (!u || !u.kind) continue;
      counts[u.kind]++;
      items.push({ id: l.id, name: l.name, kind: u.kind, summary: u.summary });
    }
    if (items.length) out.push({ id: ch.id, num: ch.num, title: ch.title, items });
  }
  return {
    id: batch.id,
    date: batch.date,
    title: batch.title,
    pages: batch.pages,
    missing: batch.missing,
    counts,
    chapters: out,
  };
}

// Per-lesson view of the batch (heading ids match the client's slug()), or null.
export function lessonUpdate(batch, name) {
  const u = batch?.lessons?.[name];
  if (!u) return null;
  const toHeading = (title) => ({ title, id: slugify(title) });
  return {
    kind: u.kind,
    date: batch.date,
    summary: u.summary,
    changed: (u.changed ?? []).map(toHeading),
    dropped: (u.dropped ?? []).map(toHeading),
  };
}

// "123 Tiêu đề" (exactly 3 digits, one space) -> {num, title}; anything else, including old
// 4-digit numbers, -> null.
export function parseVideoRef(s) {
  const m = typeof s === 'string' ? s.match(/^(\d{3}) (\S.*)$/) : null;
  return m ? { num: m[1], title: m[2] } : null;
}

// Walks `dir` and maps each 3-digit lecture number to its mp4 path relative to `dir` (with "/").
// Missing directory -> empty map.
export function indexVideos(dir) {
  const out = new Map();
  const walk = (rel) => {
    const abs = path.join(dir, rel);
    let entries;
    try {
      entries = fs.readdirSync(abs, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      const sub = rel ? `${rel}/${e.name}` : e.name;
      const isDir = e.isDirectory() || (e.isSymbolicLink() && fs.statSync(path.join(dir, sub), { throwIfNoEntry: false })?.isDirectory());
      if (isDir) walk(sub);
      else {
        const m = e.name.match(/^(\d{3})_.*\.mp4$/);
        if (m && !out.has(m[1])) out.set(m[1], sub);
      }
    }
  };
  walk('');
  return out;
}

// Cross-checks the new course's manifest against the notes' `videos:` references.
//   manifestVideos [{video_order, title, section_order}], noteRefs [{name, videos: string[]}], allow Set of "NNN".
// unmapped: manifest videos no note references (and not in `allow`); unknown: refs that are malformed, point at a
// number not in the manifest, or whose title differs from the manifest's; multi: videos used by several notes (info only).
export function courseCoverage(manifestVideos, noteRefs, allow = new Set()) {
  const byNum = new Map(manifestVideos.map((v) => [String(v.video_order).padStart(3, '0'), v]));
  const users = new Map(); // num -> note names (valid refs only)
  const unknown = [];
  for (const n of noteRefs) {
    for (const raw of n.videos ?? []) {
      const ref = parseVideoRef(raw);
      const v = ref && byNum.get(ref.num);
      if (!v || v.title !== ref.title) {
        unknown.push({ name: n.name, ref: raw });
        continue;
      }
      const list = users.get(ref.num) ?? [];
      if (!list.includes(n.name)) list.push(n.name);
      users.set(ref.num, list);
    }
  }
  const unmapped = [...byNum]
    .filter(([num]) => !users.has(num) && !allow.has(num))
    .map(([num, v]) => ({ num, title: v.title, section: v.section_order }))
    .sort((a, b) => a.num.localeCompare(b.num));
  const multi = [...users]
    .filter(([, names]) => names.length > 1)
    .map(([num, names]) => ({ num, notes: names }))
    .sort((a, b) => a.num.localeCompare(b.num));
  return { unmapped, unknown, multi };
}
