import test from 'node:test';
import assert from 'node:assert/strict';
import { slug } from '../src/lib/content.ts';
import { slugify, noteHeadings, validateBatch, buildUpdatesIndex, lessonUpdate } from '../scripts/lib/updates.mjs';

const TIP = '🎯 Mẹo thi SAA-C03';

// Notes as build-content would collect them; one per batch category plus untouched ones.
const notes = [
  { name: 'AppFlow', chapterId: '01', headings: ['Khái niệm cốt lõi', TIP], videos: ['0272'], quizCount: 5, diagramCount: 1 },
  { name: 'Systems Manager', chapterId: '22', headings: ['Khái niệm cốt lõi'], videos: ['0301', '0302'], quizCount: 5, diagramCount: 1 },
  { name: 'Animals4life', chapterId: '00', headings: ['Tổng quan'], videos: [], quizCount: 0, diagramCount: 0 },
  { name: 'Exam Technique', chapterId: '00', headings: ['Question Technique', 'Time Management'], videos: ['0010'], quizCount: 5, diagramCount: 1 },
  { name: 'EC2', chapterId: '02', headings: ['Khái niệm cốt lõi'], videos: ['0100'], quizCount: 5, diagramCount: 2 },
];

const validBatch = () => ({
  id: '2026-11-10',
  date: '2026-11-10',
  title: 'Cập nhật theo bản khóa SAA-C03 mới (376 video)',
  pages: ['Exam Cheat Sheet: thêm mẹo mới'],
  missing: [],
  lessons: {
    AppFlow: { kind: 'updated', summary: 'Thêm giới hạn mới', changed: ['Khái niệm cốt lõi'], dropped: [] },
    'Systems Manager': { kind: 'new', summary: 'Bài mới về Systems Manager' },
    Animals4life: { kind: 'removed', summary: 'khóa mới dùng kịch bản Aus-E-Mart' },
    'Exam Technique': { dropped: ['Question Technique'] },
  },
});

test('slugify khớp slug() phía client', () => {
  for (const x of [TIP, 'Khái niệm cốt lõi', 'Cách hoạt động / Kiến trúc', 'Đổi tên: Data Firehose']) {
    assert.equal(slugify(x), slug(x));
  }
});

test('noteHeadings bỏ qua code fence', () => {
  assert.deepEqual(noteHeadings('## A\n```\n## not\n```\n## B '), ['A', 'B']);
});

test('validateBatch hợp lệ', () => {
  assert.deepEqual(validateBatch(validBatch(), notes), []);
});

// Each mutation must give exactly one error naming the note.
const cases = [
  ['key không phải ghi chú', (b) => { b.lessons['Không Có'] = { kind: 'new', summary: 'x' }; }, 'Không Có'],
  ['kind lạ', (b) => { b.lessons.AppFlow.kind = 'renamed'; }, 'AppFlow'],
  ['updated thiếu summary', (b) => { delete b.lessons.AppFlow.summary; }, 'AppFlow'],
  ['updated không có changed lẫn dropped', (b) => { b.lessons.AppFlow.changed = []; }, 'AppFlow'],
  ['heading không tồn tại', (b) => { b.lessons.AppFlow.changed = ['Mục ma']; }, 'AppFlow'],
  ['heading ở cả changed và dropped', (b) => { b.lessons.AppFlow.dropped = ['Khái niệm cốt lõi']; }, 'AppFlow'],
  ['không kind mà dropped rỗng', (b) => { b.lessons['Exam Technique'].dropped = []; }, 'Exam Technique'],
  ['new có quizCount 4', (b, n) => { n.find((x) => x.name === 'Systems Manager').quizCount = 4; }, 'Systems Manager'],
  ['new có diagramCount 0', (b, n) => { n.find((x) => x.name === 'Systems Manager').diagramCount = 0; }, 'Systems Manager'],
  ['new có videos rỗng', (b, n) => { n.find((x) => x.name === 'Systems Manager').videos = []; }, 'Systems Manager'],
  ['updated có videos rỗng', (b, n) => { n.find((x) => x.name === 'AppFlow').videos = []; }, 'AppFlow'],
  ['removed có videos', (b, n) => { n.find((x) => x.name === 'Animals4life').videos = ['0001']; }, 'Animals4life'],
];
for (const [label, mutate, name] of cases) {
  test(`validateBatch bắt lỗi: ${label}`, () => {
    const b = validBatch();
    const n = structuredClone(notes);
    mutate(b, n);
    const errs = validateBatch(b, n);
    assert.equal(errs.length, 1, errs.join('\n'));
    assert.ok(errs[0].startsWith('updates.json:'), errs[0]);
    assert.ok(errs[0].includes(name), errs[0]);
  });
}

test('validateBatch kiểm tra id/date', () => {
  const b = validBatch();
  b.id = '2026-11';
  const errs = validateBatch(b, notes);
  assert.equal(errs.length, 1);
  assert.ok(errs[0].includes('id'));
  const c = validBatch();
  c.date = '10/11/2026';
  const errs2 = validateBatch(c, notes);
  assert.equal(errs2.length, 1);
  assert.ok(errs2[0].includes('date'));
});

const chapters = [
  { id: '00', num: '00', title: 'Course and Exam', lessons: [{ id: 'animals4life', name: 'Animals4life' }, { id: 'exam-technique', name: 'Exam Technique' }] },
  { id: '01', num: '01', title: 'Intro', lessons: [{ id: 'appflow', name: 'AppFlow' }] },
  { id: '02', num: '02', title: 'Compute', lessons: [{ id: 'ec2', name: 'EC2' }] },
  { id: '22', num: '22', title: 'Systems Manager', lessons: [{ id: 'systems-manager', name: 'Systems Manager' }] },
];

test('buildUpdatesIndex', () => {
  const idx = buildUpdatesIndex(validBatch(), chapters);
  assert.deepEqual(idx.counts, { new: 1, updated: 1, removed: 1 });
  assert.equal(idx.id, '2026-11-10');
  assert.equal(idx.date, '2026-11-10');
  assert.deepEqual(idx.pages, ['Exam Cheat Sheet: thêm mẹo mới']);
  assert.deepEqual(idx.missing, []);
  // chapter 02 has nothing -> dropped; chapter order follows input
  assert.deepEqual(idx.chapters.map((c) => c.id), ['00', '01', '22']);
  // dropped-only lesson is neither listed nor counted
  assert.deepEqual(idx.chapters[0].items, [
    { id: 'animals4life', name: 'Animals4life', kind: 'removed', summary: 'khóa mới dùng kịch bản Aus-E-Mart' },
  ]);
  assert.deepEqual(idx.chapters[1].items[0], { id: 'appflow', name: 'AppFlow', kind: 'updated', summary: 'Thêm giới hạn mới' });
  assert.equal(idx.chapters[2].num, '22');
  assert.equal(idx.chapters[2].title, 'Systems Manager');
});

test('buildUpdatesIndex giữ thứ tự bài theo chapters', () => {
  const b = validBatch();
  b.lessons.EC2 = { kind: 'updated', summary: 's', changed: ['Khái niệm cốt lõi'] };
  const reversed = [{ id: '00', num: '00', title: 'X', lessons: [{ id: 'b', name: 'Systems Manager' }, { id: 'a', name: 'Animals4life' }] }];
  const idx = buildUpdatesIndex(b, reversed);
  assert.deepEqual(idx.chapters[0].items.map((i) => i.name), ['Systems Manager', 'Animals4life']);
});

test('buildUpdatesIndex null', () => {
  assert.equal(buildUpdatesIndex(null, chapters), null);
});

test('lessonUpdate', () => {
  const b = validBatch();
  b.lessons.AppFlow.changed = [TIP];
  const u = lessonUpdate(b, 'AppFlow');
  assert.deepEqual(u.changed, [{ title: TIP, id: slugify(TIP) }]);
  assert.deepEqual(u.dropped, []);
  assert.equal(u.kind, 'updated');
  assert.equal(u.date, '2026-11-10');
  assert.equal(u.summary, 'Thêm giới hạn mới');
  const d = lessonUpdate(b, 'Exam Technique');
  assert.equal(d.kind, undefined);
  assert.deepEqual(d.dropped, [{ title: 'Question Technique', id: 'question-technique' }]);
  assert.equal(lessonUpdate(b, 'EC2'), null);
  assert.equal(lessonUpdate(null, 'AppFlow'), null);
});
