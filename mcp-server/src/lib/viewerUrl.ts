/**
 * Build a shareable URL that opens the OpenFlowKit viewer with the given DSL
 * pre-loaded. Matches `encodeDslForViewer` in the web app: btoa(encodeURIComponent(dsl)).
 *
 * Override the base origin with OPENFLOWKIT_APP_URL (e.g. http://localhost:5173
 * for local dev). Defaults to https://openflowkit.com.
 */
const DEFAULT_APP_URL = 'https://openflowkit.com';

function getAppBaseUrl(): string {
  const fromEnv = process.env.OPENFLOWKIT_APP_URL?.trim();
  if (fromEnv && fromEnv.length > 0) {
    return fromEnv.replace(/\/+$/, '');
  }
  return DEFAULT_APP_URL;
}

function encodeDsl(dsl: string): string {
  // Buffer is always available in Node; matches browser btoa(encodeURIComponent(...))
  return Buffer.from(encodeURIComponent(dsl), 'utf8').toString('base64');
}

/** URL that opens the DSL in OpenFlowKit's read-only viewer. */
export function buildViewerUrl(dsl: string): string {
  return `${getAppBaseUrl()}/#/view?flow=${encodeDsl(dsl)}`;
}
