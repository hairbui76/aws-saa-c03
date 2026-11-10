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
