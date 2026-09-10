/**
 * Gates for webmcp-feature-check.mjs (Task 3 — plan 001).
 * Run: node --test scripts/prebuild-webmcp-feature-check.test.mjs
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SCRIPT = path.join(__dirname, 'webmcp-feature-check.mjs');
const PKG = path.join(ROOT, 'package.json');

describe('next verify:webmcp script', () => {
  it('probes document.modelContextProtocol (the surface ensureWebMcpRuntime assigns)', () => {
    assert.ok(fs.existsSync(SCRIPT), `missing ${SCRIPT}`);
    const src = fs.readFileSync(SCRIPT, 'utf8');
    assert.match(src, /document\.modelContextProtocol/);
    // modelContextTesting is never assigned by the runtime — probing it is a false negative.
    assert.doesNotMatch(src, /modelContextTesting/);
    assert.doesNotMatch(src, /navigator\.modelContext/);
  });

  it('is wired as verify:webmcp; Next has no prebuild (everything is runtime)', () => {
    const pkg = JSON.parse(fs.readFileSync(PKG, 'utf8'));
    assert.equal(pkg.scripts?.['verify:webmcp'], 'node scripts/webmcp-feature-check.mjs');
    assert.equal(pkg.scripts?.prebuild, undefined);
    assert.doesNotMatch(pkg.scripts?.build ?? '', /webmcp-feature-check|sync-pages-to-public|bake/);
  });
});
