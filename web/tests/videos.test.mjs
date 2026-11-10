import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseVideoRef, indexVideos } from '../scripts/lib/updates.mjs';

test('parseVideoRef reads a 3-digit reference', () => {
  assert.deepEqual(parseVideoRef('123 Amazon AppFlow'), { num: '123', title: 'Amazon AppFlow' });
});

test('parseVideoRef rejects other shapes, including old 4-digit numbers', () => {
  assert.equal(parseVideoRef('0272 Amazon AppFlow'), null);
  assert.equal(parseVideoRef('12 Short'), null);
  assert.equal(parseVideoRef('123Amazon'), null);
  assert.equal(parseVideoRef('123  Two spaces'), null);
  assert.equal(parseVideoRef(''), null);
});

test('indexVideos maps 3-digit numbers to relative mp4 paths', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'saa-videos-'));
  try {
    fs.mkdirSync(path.join(dir, '14_A'));
    fs.writeFileSync(path.join(dir, '14_A', '123_x.mp4'), '');
    fs.writeFileSync(path.join(dir, '14_A', '123_x.en.vtt'), '');
    fs.writeFileSync(path.join(dir, 'b.mp4'), '');
    assert.deepEqual(indexVideos(dir), new Map([['123', '14_A/123_x.mp4']]));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('indexVideos on a missing directory is empty', () => {
  assert.equal(indexVideos('/không/có').size, 0);
});

test('courseCoverage reports unmapped, unknown and multi-use videos', async () => {
  const { courseCoverage } = await import('../scripts/lib/updates.mjs');
  const manifest = [
    { video_order: 1, title: 'Intro', section_order: 1 },
    { video_order: 2, title: 'Shared', section_order: 1 },
    { video_order: 3, title: 'Outro', section_order: 2 },
  ];
  const notes = [
    { name: 'A', videos: ['001 Intro', '002 Shared'] },
    { name: 'B', videos: ['002 Shared', '009 Nowhere'] },
  ];
  const r = courseCoverage(manifest, notes, new Set(['003']));
  assert.deepEqual(r.unmapped, []);
  assert.deepEqual(r.unknown, [{ name: 'B', ref: '009 Nowhere' }]);
  assert.deepEqual(r.multi, [{ num: '002', notes: ['A', 'B'] }]);
  assert.deepEqual(courseCoverage(manifest, notes, new Set()).unmapped, [{ num: '003', title: 'Outro', section: 2 }]);
});

test('courseCoverage treats a wrong title or malformed ref as unknown', async () => {
  const { courseCoverage } = await import('../scripts/lib/updates.mjs');
  const manifest = [{ video_order: 1, title: 'Intro', section_order: 1 }];
  const notes = [{ name: 'A', videos: ['001 Intro', '001 Other title', '0001 Intro', 'junk'] }];
  const r = courseCoverage(manifest, notes, new Set());
  assert.deepEqual(r.unknown, [
    { name: 'A', ref: '001 Other title' },
    { name: 'A', ref: '0001 Intro' },
    { name: 'A', ref: 'junk' },
  ]);
  assert.deepEqual(r.unmapped, []); // 001 is still referenced by a valid ref
});
