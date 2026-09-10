import { describe, expect, it, vi } from 'vitest';
import { bootstrapVisitorWebMcpRuntime } from './bootstrapVisitorWebMcpRuntime';

describe('bootstrapVisitorWebMcpRuntime', () => {
  it('calls ensureWebMcpRuntime once (polyfill only — no tool registration)', () => {
    const ensureWebMcpRuntime = vi.fn();
    bootstrapVisitorWebMcpRuntime({ ensureWebMcpRuntime });
    expect(ensureWebMcpRuntime).toHaveBeenCalledTimes(1);
  });
});
