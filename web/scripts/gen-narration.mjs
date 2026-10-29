// One-off generator for diagram voice-over scripts (run locally, results are committed).
//   node scripts/gen-narration.mjs            submit a batch for lessons whose narration is missing/stale, wait, write files
//   node scripts/gen-narration.mjs --resume <batch_id>   collect an already-submitted batch
// Needs public/content (run `npm run content` first) and ANTHROPIC_API_KEY.
// Output: narration/<lessonId>.json = { [diagramName]: { sig, steps: string[] } }
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Anthropic from '@anthropic-ai/sdk';
import { buildModel, stepContents, stepSig } from '../src/lib/diagram.ts';

const here = path.dirname(fileURLToPath(import.meta.url));
const WEB = path.resolve(here, '..');
const CONTENT = path.join(WEB, 'public/content');
const OUT = path.join(WEB, 'narration');
fs.mkdirSync(OUT, { recursive: true });

const SYSTEM = `Bạn viết lời thuyết minh (voice-over) tiếng Việt cho các sơ đồ động trong một web học ôn thi AWS Certified Solutions Architect – Associate (SAA-C03).
Mỗi sơ đồ được vẽ ra từng bước. Với mỗi bước, bạn viết đúng một đoạn thuyết minh; đoạn này được đọc bằng giọng TTS trong lúc bước đó đang được vẽ.

Yêu cầu nội dung:
- Đúng số bước và đúng thứ tự đã cho. Bước 0 giới thiệu sơ đồ nói về điều gì. Nếu bước cuối là các ghi chú/mẹo thi (⚠, 🎯) thì nói như một lời nhắc khi đi thi.
- Giải thích điều đang diễn ra ở bước đó và vì sao, dựa vào nội dung bài học; đừng chỉ đọc lại nhãn trên sơ đồ.
- Mỗi bước 1–2 câu, khoảng 15–40 từ. Giọng văn nói tự nhiên, thân thiện, ngắn gọn như giảng viên đang chỉ vào sơ đồ.
- Chỉ dùng thông tin có trong bài học và sơ đồ.

Yêu cầu để đọc thành tiếng:
- Không dùng markdown, ký hiệu hay emoji: không viết →, ⇒, ①, ≥, ≤, ~, /, *, #. Viết thành chữ: "đi tới", "lớn hơn hoặc bằng", "khoảng", "hoặc".
- Giữ tên dịch vụ và thuật ngữ AWS bằng tiếng Anh (ví dụ NAT Gateway, Security Group, read replica).
- CIDR đọc dạng "10.16.0.0 trên 16". Số lớn viết bằng chữ số bình thường.`;

const SCHEMA = {
  type: 'object',
  properties: {
    diagrams: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          steps: { type: 'array', items: { type: 'string' } },
        },
        required: ['name', 'steps'],
        additionalProperties: false,
      },
    },
  },
  required: ['diagrams'],
  additionalProperties: false,
};

const index = JSON.parse(fs.readFileSync(path.join(CONTENT, 'index.json'), 'utf8'));
const lessonIds = index.chapters.flatMap((c) => c.lessons.map((l) => l.id));

function loadExisting(id) {
  try {
    return JSON.parse(fs.readFileSync(path.join(OUT, `${id}.json`), 'utf8'));
  } catch {
    return {};
  }
}

// ---- build requests ----
const jobs = []; // { customId, lessonId, diagrams: [{name, sig, n}] }
const requests = [];
for (const id of lessonIds) {
  const lesson = JSON.parse(fs.readFileSync(path.join(CONTENT, 'l', `${id}.json`), 'utf8'));
  const existing = loadExisting(id);
  const todo = [];
  for (const [name, d] of Object.entries(lesson.diagrams)) {
    const model = buildModel(d);
    const sig = stepSig(model);
    if (existing[name]?.sig === sig) continue;
    const steps = model.steps.map((s, i) => {
      const parts = stepContents(model, i).join('; ').slice(0, 700);
      return `Bước ${i}: ${s.caption ? `[caption] ${s.caption} | ` : ''}[hiện ra] ${parts}`;
    });
    todo.push({ name, sig, n: model.steps.length, text: `Sơ đồ "${name}" — ${model.steps.length} bước:\n${steps.join('\n')}` });
  }
  if (!todo.length) continue;
  const body = lesson.body.replace(/```diagram\n[^\n]*\n```/g, '');
  const customId = `l${String(jobs.length).padStart(3, '0')}`;
  jobs.push({ customId, lessonId: id, diagrams: todo.map(({ name, sig, n }) => ({ name, sig, n })) });
  requests.push({
    custom_id: customId,
    params: {
      model: 'claude-opus-5-5',
      max_tokens: 16000,
      output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
      system: SYSTEM,
      messages: [
        {
          role: 'user',
          content: `<lesson title="${lesson.title}" chapter="${lesson.chapterId} ${lesson.chapterTitle}">\nTL;DR: ${lesson.tldr}\n\n${body}\n</lesson>\n\n<diagrams>\n${todo
            .map((t) => t.text)
            .join('\n\n')}\n</diagrams>\n\nViết thuyết minh cho từng sơ đồ trên. Trả về JSON: diagrams = [{ name (đúng tên sơ đồ), steps (mảng chuỗi, đúng số bước) }].`,
        },
      ],
    },
  });
}

const jobsFile = path.join(OUT, '.jobs.json');
const client = new Anthropic();

// --sample <lessonId>: run one lesson synchronously to check the prompt, write nothing
if (process.argv[2] === '--sample') {
  const i = jobs.findIndex((j) => j.lessonId === process.argv[3]);
  if (i < 0) throw new Error('lesson not found or already narrated');
  const msg = await client.messages.create(requests[i].params);
  console.log(msg.stop_reason, msg.usage);
  for (const d of JSON.parse(msg.content.find((b) => b.type === 'text').text).diagrams) {
    console.log(`\n## ${d.name} (${d.steps.length}/${jobs[i].diagrams.find((x) => x.name === d.name)?.n})`);
    d.steps.forEach((s, k) => console.log(`${k}. ${s}`));
  }
  process.exit(0);
}
let batchId = process.argv[2] === '--resume' ? process.argv[3] : null;

if (!batchId) {
  if (!requests.length) {
    console.log('narration: everything up to date');
    process.exit(0);
  }
  const diagramCount = jobs.reduce((n, j) => n + j.diagrams.length, 0);
  console.log(`narration: submitting ${requests.length} lessons / ${diagramCount} diagrams`);
  const batch = await client.messages.batches.create({ requests });
  batchId = batch.id;
  fs.writeFileSync(jobsFile, JSON.stringify({ batchId, jobs }, null, 1));
  console.log(`batch ${batchId} submitted`);
} else {
  Object.assign(jobs, JSON.parse(fs.readFileSync(jobsFile, 'utf8')).jobs);
}

let batch;
for (;;) {
  batch = await client.messages.batches.retrieve(batchId);
  const c = batch.request_counts;
  console.log(`${new Date().toISOString()} ${batch.processing_status} processing=${c.processing} ok=${c.succeeded} err=${c.errored}`);
  if (batch.processing_status === 'ended') break;
  await new Promise((r) => setTimeout(r, 60_000));
}

const byId = new Map(jobs.map((j) => [j.customId, j]));
let ok = 0;
let bad = 0;
const usage = { input: 0, output: 0 };
for await (const res of await client.messages.batches.results(batchId)) {
  const job = byId.get(res.custom_id);
  if (!job) continue;
  if (res.result.type !== 'succeeded') {
    console.log(`! ${job.lessonId}: ${res.result.type}`);
    bad++;
    continue;
  }
  const msg = res.result.message;
  usage.input += msg.usage.input_tokens;
  usage.output += msg.usage.output_tokens;
  if (msg.stop_reason !== 'end_turn') {
    console.log(`! ${job.lessonId}: stop_reason ${msg.stop_reason}`);
    bad++;
    continue;
  }
  const text = msg.content.find((b) => b.type === 'text')?.text || '';
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    console.log(`! ${job.lessonId}: invalid JSON`);
    bad++;
    continue;
  }
  const out = loadExisting(job.lessonId);
  for (const d of job.diagrams) {
    const got = parsed.diagrams.find((x) => x.name === d.name) || parsed.diagrams[job.diagrams.indexOf(d)];
    if (!got || got.steps.length !== d.n) {
      console.log(`! ${job.lessonId} / ${d.name}: expected ${d.n} steps, got ${got?.steps.length}`);
      bad++;
      continue;
    }
    out[d.name] = { sig: d.sig, steps: got.steps.map((s) => s.trim()) };
    ok++;
  }
  fs.writeFileSync(path.join(OUT, `${job.lessonId}.json`), JSON.stringify(out, null, 1));
}
const cost = (usage.input * 2 + usage.output * 10) / 1e6; // Opus 5.5 batch pricing
console.log(`narration: ${ok} diagrams written, ${bad} problems; tokens in=${usage.input} out=${usage.output} (~$${cost.toFixed(2)})`);
if (bad) console.log('re-run the script to retry the failed ones');
