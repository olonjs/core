'use client';

import { useEffect } from 'react';
import { bootstrapVisitorWebMcpRuntime } from '@/lib/webmcp/bootstrapVisitorWebMcpRuntime';

/**
 * Client island: WebMCP imperative API on public pages (readResource / listTools empty).
 * Must not import @olonjs/studio.
 */
export function WebMcpVisitorRuntime() {
  useEffect(() => {
    bootstrapVisitorWebMcpRuntime();
  }, []);

  return null;
}
