import { describe, expect, it } from 'vitest';
import { buildEnabledWebMcpConfig } from './buildEnabledWebMcpConfig';

describe('buildEnabledWebMcpConfig', () => {
  it('enables WebMCP with empty namespace when window is unavailable', () => {
    expect(buildEnabledWebMcpConfig()).toEqual({
      enabled: true,
      namespace: '',
    });
  });

  it('uses window.location.href as namespace when provided', () => {
    expect(buildEnabledWebMcpConfig('http://127.0.0.1:3000/admin')).toEqual({
      enabled: true,
      namespace: 'http://127.0.0.1:3000/admin',
    });
  });
});
