import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldShowWhatsNew, newerBatchId, chapterUpdateCounts } from '../src/lib/updates.ts';

test('shouldShowWhatsNew: chỉ khi có đợt mà chưa xem đúng đợt đó', () => {
  assert.equal(shouldShowWhatsNew(null, '2026-11-10'), true);
  assert.equal(shouldShowWhatsNew('2026-11-10', '2026-11-10'), false);
  assert.equal(shouldShowWhatsNew('2026-11-10', undefined), false);
  assert.equal(shouldShowWhatsNew(undefined, '2026-11-10'), true);
  assert.equal(shouldShowWhatsNew(null, undefined), false);
  assert.equal(shouldShowWhatsNew('2026-11-10', '2027-01-02'), true);
});

test('newerBatchId: giá trị lớn hơn, bỏ qua giá trị rỗng', () => {
  assert.equal(newerBatchId('2026-11-10', undefined), '2026-11-10');
  assert.equal(newerBatchId(undefined, '2026-11-10'), '2026-11-10');
  assert.equal(newerBatchId('2026-11-10', '2027-01-02'), '2027-01-02');
  assert.equal(newerBatchId('2027-01-02', '2026-11-10'), '2027-01-02');
  assert.equal(newerBatchId(null, null), null);
  assert.equal(newerBatchId('', null), null);
});

test('chapterUpdateCounts: đếm theo loại', () => {
  assert.deepEqual(chapterUpdateCounts([{ u: 'new' }, { u: 'updated' }, { u: 'updated' }, {}]), { new: 1, updated: 2, removed: 0 });
  assert.deepEqual(chapterUpdateCounts([]), { new: 0, updated: 0, removed: 0 });
  assert.deepEqual(chapterUpdateCounts([{ u: 'removed' }]), { new: 0, updated: 0, removed: 1 });
});
