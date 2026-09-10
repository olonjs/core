import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const visitorPagePath = path.join(root, 'app', '[[...slug]]', 'page.tsx');

describe('visitor page WebMCP wiring', () => {
  it('mounts WebMcpVisitorRuntime on the public catch-all', () => {
    const source = readFileSync(visitorPagePath, 'utf8');
    expect(source).toContain("from '@/components/webmcp/WebMcpVisitorRuntime'");
    expect(source).toContain('<WebMcpVisitorRuntime');
  });
});
