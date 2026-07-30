/**
 * Static gates for generate_inkwell_next.sh (TDD for the Next Inkwell generator).
 * Run: node --test scripts/generate-inkwell-next.test.mjs
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.resolve(__dirname, '../templates/generate_inkwell_next.sh');

function readScript() {
  assert.ok(fs.existsSync(SCRIPT), `missing ${SCRIPT}`);
  return fs.readFileSync(SCRIPT, 'utf8');
}

describe('generate_inkwell_next.sh harness gates', () => {
  it('exists and is a bash script', () => {
    const src = readScript();
    assert.match(src, /^#!\/usr\/bin\/env bash|^#!\/bin\/bash/m);
  });

  it('must not target Vite-only surfaces', () => {
    const src = readScript();
    assert.doesNotMatch(src, /cat > index\.html/);
    assert.doesNotMatch(src, /cat > src\/index\.css/);
    assert.doesNotMatch(src, /cat > src\/App\.tsx/);
    assert.doesNotMatch(src, /from ['"]@\/components\/ThemeProvider['"]/);
    assert.doesNotMatch(src, /useTheme\s*\(/);
  });

  it('must write Next theme bridge to app/globals.css', () => {
    const src = readScript();
    assert.match(src, /cat > app\/globals\.css/);
    assert.match(src, /\[data-theme=["']light["']\]/);
  });

  it('must verify Next admin wiring instead of App.tsx', () => {
    const src = readScript();
    assert.match(src, /AdminStudioClient/);
    assert.doesNotMatch(src, /verifying App\.tsx/);
  });

  it('must cd to tenant root (parent of templates/) before writing files', () => {
    const src = readScript();
    assert.match(src, /cd "\$\(cd "\$\(dirname "\$\{BASH_SOURCE\[0\]\}"\)\/\.\." && pwd\)"/);
  });

  it('must wipe tenant content surfaces without DNA denylist', () => {
    const src = readScript();
    assert.match(src, /Wiping tenant content surfaces/);
    assert.match(src, /find src\/components -mindepth 1 -maxdepth 1 ! -name 'ui' ! -name 'admin'/);
    assert.match(src, /rm -rf \\\s*\n\s*src\/collections/m);
    assert.match(src, /rm -rf \\\s*\n[\s\S]*?src\/data\/pages/m);
    assert.match(src, /cat > src\/lib\/VisitorSection\.tsx/);
    assert.match(src, /EmptyTenantView empty-branch/);
    assert.doesNotMatch(src, /from '@\/components\/books-list'/);
    assert.doesNotMatch(src, /src\/components\/books-list/);
  });
});

describe('generate_inkwell_next.sh collection-ref model', () => {
  it('emits posts tag-refs helper', () => {
    const src = readScript();
    assert.match(src, /cat > src\/collections\/posts\/tag-refs\.ts/);
    assert.match(src, /export function resolveTagId/);
    assert.match(src, /export function postHasTag/);
  });

  it('uses ui:collection-ref:tags on posts schema (not string ui:list tags)', () => {
    const src = readScript();
    assert.match(src, /ui:collection-ref:tags/);
    assert.match(src, /CollectionPointerSchema/);
    // posts schema must not regress to string-only tags list widget
    assert.doesNotMatch(
      src,
      /tags: z\.array\(z\.string\(\)\)\.describe\('ui:list'\)/,
    );
  });

  it('authors post tags as \$ref pointers in posts.json', () => {
    const src = readScript();
    assert.match(src, /"\$ref": "\.\.\/tags\/tags\.json#\//);
  });

  it('emits nested dynamic page paths posts/[slug] and tags/[slug]', () => {
    const src = readScript();
    assert.match(src, /cat > src\/data\/pages\/posts\/\[slug\]\.json/);
    assert.match(src, /cat > src\/data\/pages\/tags\/\[slug\]\.json/);
    assert.doesNotMatch(src, /cat > src\/data\/pages\/post-detail\.json/);
    assert.doesNotMatch(src, /cat > src\/data\/pages\/tag-detail\.json/);
    assert.match(src, /src\/data\/pages\/posts \\/);
    assert.match(src, /src\/data\/pages\/tags \\/);
  });

  it('wires relation Views through tag-refs helpers', () => {
    const src = readScript();
    assert.match(src, /from '@\/collections\/posts\/tag-refs'/);
    assert.match(src, /resolveTagId/);
    assert.match(src, /isResolvedTag/);
    assert.match(src, /postHasTag/);
  });
});
