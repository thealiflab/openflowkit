import { describe, expect, it } from 'vitest';
import { buildViewerUrl } from '../src/lib/viewerUrl.js';

describe('buildViewerUrl', () => {
  it('encodes DSL into the OpenFlowKit viewer hash', () => {
    const url = buildViewerUrl('flow: Hello\n[start] s\n[end] e\ns -> e');
    expect(url).toMatch(/^https:\/\/openflowkit\.com\/#\/view\?flow=/);

    const encoded = url.split('flow=')[1];
    expect(encoded).toBeTruthy();
    const decoded = decodeURIComponent(Buffer.from(encoded!, 'base64').toString('utf8'));
    expect(decoded).toContain('flow: Hello');
    expect(decoded).toContain('s -> e');
  });
});
