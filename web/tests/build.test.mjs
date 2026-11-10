import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const WEB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(WEB, 'public/content');
const build = (env = {}) =>
  spawnSync('node', ['scripts/build-content.mjs'], { cwd: WEB, env: { ...process.env, ...env }, encoding: 'utf8' });

test('build reads the update batch, works without one, and rejects an unknown lesson', { timeout: 180000 }, () => {
  try {
    // 1. the committed web/updates.json
    let r = build();
    assert.equal(r.status, 0, r.stderr);
    assert.ok(fs.existsSync(path.join(OUT, 'updates.json')), 'updates.json written');
    assert.match(r.stdout, /updates: \d+ mới, \d+ cập nhật, \d+ không còn trong khóa/);

    // 2. no batch file: no updates.json, no `u` on any lesson
    r = build({ SAA_UPDATES: '/không/có.json' });
    assert.equal(r.status, 0, r.stderr);
    assert.ok(!fs.existsSync(path.join(OUT, 'updates.json')), 'no updates.json');
    const index = JSON.parse(fs.readFileSync(path.join(OUT, 'index.json'), 'utf8'));
    for (const ch of index.chapters) for (const l of ch.lessons) assert.ok(!('u' in l), `${l.id} has no u`);
    for (const f of fs.readdirSync(path.join(OUT, 'l'))) {
      const l = JSON.parse(fs.readFileSync(path.join(OUT, 'l', f), 'utf8'));
      assert.ok(!('update' in l), `${f} has no update`);
      for (const lec of l.lectures) assert.ok(lec.video === null || typeof lec.video === 'string');
    }

    // 3. a batch naming a note that does not exist fails the build
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'saa-updates-'));
    try {
      const file = path.join(tmp, 'updates.json');
      fs.writeFileSync(
        file,
        JSON.stringify({
          id: '2026-11-10',
          date: '2026-11-10',
          title: 'x',
          pages: [],
          missing: [],
          lessons: { 'Không có bài này': { kind: 'removed', summary: 's', dropped: ['x'] } },
        })
      );
      r = build({ SAA_UPDATES: file });
      assert.notEqual(r.status, 0);
      assert.match(r.stderr, /Không có bài này/);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  } finally {
    execFileSync('node', ['scripts/build-content.mjs'], { cwd: WEB, stdio: 'ignore' });
  }
});
