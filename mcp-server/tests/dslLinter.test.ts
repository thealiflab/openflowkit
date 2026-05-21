import { describe, expect, it } from 'vitest';
import { lintOpenFlowDsl } from '../src/lib/dslLinter.js';

describe('lintOpenFlowDsl', () => {
  it('accepts a minimal valid DSL', () => {
    const result = lintOpenFlowDsl(`flow: Hello\ndirection: TB\n[start] s1\n[end] e1\ns1 -> e1`);
    expect(result.ok).toBe(true);
    expect(result.hasHeader).toBe(true);
    expect(result.declaredNodeIds).toEqual(['s1', 'e1']);
    expect(result.edgeCount).toBe(1);
  });

  it('flags missing header as a warning, not an error', () => {
    const result = lintOpenFlowDsl(`[start] s1\n[end] e1\ns1 -> e1`);
    expect(result.ok).toBe(true);
    expect(result.diagnostics.some((d) => d.severity === 'warning' && /header/i.test(d.message))).toBe(true);
  });

  it('flags undeclared edge endpoints', () => {
    const result = lintOpenFlowDsl(`flow: T\n[start] s1\ns1 -> ghost`);
    expect(result.diagnostics.some((d) => d.message.includes('ghost'))).toBe(true);
  });

  it('flags duplicate node ids', () => {
    const result = lintOpenFlowDsl(`flow: T\n[process] a: A\n[process] a: B`);
    expect(result.diagnostics.some((d) => d.message.toLowerCase().includes('more than once'))).toBe(true);
  });

  it('returns an error when no nodes are declared', () => {
    const result = lintOpenFlowDsl(`flow: T\ndirection: TB`);
    expect(result.ok).toBe(false);
    expect(result.diagnostics.some((d) => d.severity === 'error')).toBe(true);
  });

  it('parses labeled decision edges', () => {
    const result = lintOpenFlowDsl(
      `flow: T\n[decision] d: Q?\n[end] yes: Yes\n[end] no: No\nd ->|Yes| yes\nd ->|No| no`
    );
    expect(result.ok).toBe(true);
    expect(result.edgeCount).toBe(2);
  });
});
