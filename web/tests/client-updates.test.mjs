import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldShowWhatsNew, newerBatchId, chapterUpdateCounts, updateCountParts, viDate, headingMarks } from '../src/lib/updates.ts';

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

test('updateCountParts: chỉ các phần khác 0, theo thứ tự mới, cập nhật, không còn', () => {
  assert.deepEqual(updateCountParts({ new: 2, updated: 3, removed: 1 }).map((p) => p.text), [
    '2 bài mới',
    '3 cập nhật',
    '1 không còn trong khóa',
  ]);
  assert.deepEqual(updateCountParts({ new: 0, updated: 3, removed: 0 }), [{ kind: 'updated', text: '3 cập nhật' }]);
  assert.deepEqual(updateCountParts({ new: 0, updated: 0, removed: 0 }), []);
});

test('viDate: ISO -> dd/mm/yyyy', () => {
  assert.equal(viDate('2026-11-10'), '10/11/2026');
});

test('headingMarks: id -> changed/dropped, không có update thì rỗng', () => {
  assert.deepEqual(headingMarks(undefined), {});
  assert.deepEqual(
    headingMarks({ changed: [{ title: 'A b', id: 'a-b' }], dropped: [{ title: 'C', id: 'c' }] }),
    { 'a-b': 'changed', c: 'dropped' },
  );
});
