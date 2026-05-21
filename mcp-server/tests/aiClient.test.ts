import { describe, expect, it } from 'vitest';
import { AI_PROVIDERS, defaultBaseUrlFor, defaultModelFor } from '../src/lib/aiClient.js';

describe('AI provider catalog', () => {
  it('exports every supported provider', () => {
    expect(AI_PROVIDERS).toContain('ollama');
    expect(AI_PROVIDERS).toContain('openai');
    expect(AI_PROVIDERS).toContain('anthropic');
  });

  it('returns a default model for every provider', () => {
    for (const provider of AI_PROVIDERS) {
      expect(defaultModelFor(provider), provider).toBeTruthy();
    }
  });

  it('returns a default base URL for OpenAI-compatible providers', () => {
    expect(defaultBaseUrlFor('openai')).toMatch(/openai/);
    expect(defaultBaseUrlFor('ollama')).toMatch(/localhost/);
  });

  it('returns undefined for providers with custom transport', () => {
    expect(defaultBaseUrlFor('anthropic')).toBeUndefined();
    expect(defaultBaseUrlFor('gemini')).toBeUndefined();
    expect(defaultBaseUrlFor('custom')).toBeUndefined();
  });
});
