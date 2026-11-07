// Client code is statically exported to a public site, so no API key may be written into app/ or lib/.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const files = (dir) => readdirSync(join(root, dir), { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? files(join(dir, e.name)) : /\.(m?js|jsx)$/.test(e.name) ? [join(dir, e.name)] : []);

// Quoted 32-hex strings (Odds API and API-Sports key shape) and keys assigned to *_KEY / apiKey literals.
const patterns = [/['"`][0-9a-f]{32}['"`]/, /(_KEY|apiKey)\s*[=:]\s*['"][A-Za-z0-9]{12,}['"]/];

test('no API key literals in app/ or lib/', () => {
  const hits = [];
  for (const f of [...files('app'), ...files('lib')]) {
    readFileSync(join(root, f), 'utf8').split('\n').forEach((line, i) => {
      if (patterns.some((p) => p.test(line))) hits.push(`${f}:${i + 1}: ${line.trim()}`);
    });
  }
  assert.deepEqual(hits, []);
});
