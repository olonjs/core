/**
 * Shared WebMCP enablement shape for Next admin (and any surface that opts in).
 * Mirrors apps/tenant-alpha App.tsx — enabled + namespace; no tool registration here.
 */
export function buildEnabledWebMcpConfig(namespace?: string): {
  enabled: true;
  namespace: string;
} {
  const resolvedNamespace =
    namespace ??
    (typeof window !== 'undefined' && typeof window.location?.href === 'string'
      ? window.location.href
      : '');

  return {
    enabled: true,
    namespace: resolvedNamespace,
  };
}
