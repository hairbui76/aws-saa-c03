// Minimal YAML-ish frontmatter reader shared by build-content.mjs and the course tools.
export function parseFrontmatter(src) {
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
