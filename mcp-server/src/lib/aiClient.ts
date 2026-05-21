/**
 * Thin BYOK AI client. Targets the OpenAI-compatible chat completions API
 * which all major providers (OpenAI, Anthropic-compat, Gemini-compat,
 * Groq, Mistral, OpenRouter, Ollama, local) speak today.
 *
 * Anthropic native is special-cased because their schema differs.
 */

export type AiProvider =
  | 'openai'
  | 'anthropic'
  | 'gemini'
  | 'groq'
  | 'mistral'
  | 'openrouter'
  | 'cerebras'
  | 'nvidia'
  | 'ollama'
  | 'custom';

const DEFAULT_BASE_URLS: Record<Exclude<AiProvider, 'anthropic' | 'gemini' | 'custom'>, string> = {
  openai: 'https://api.openai.com/v1',
  groq: 'https://api.groq.com/openai/v1',
  mistral: 'https://api.mistral.ai/v1',
  openrouter: 'https://openrouter.ai/api/v1',
  cerebras: 'https://api.cerebras.ai/v1',
  nvidia: 'https://integrate.api.nvidia.com/v1',
  ollama: 'http://localhost:11434/v1',
};

const DEFAULT_MODELS: Record<AiProvider, string> = {
  openai: 'gpt-4o-mini',
  anthropic: 'claude-haiku-4-5',
  gemini: 'gemini-2.5-flash-lite',
  groq: 'meta-llama/llama-4-scout-17b-16e-instruct',
  mistral: 'mistral-small-latest',
  openrouter: 'google/gemini-2.5-flash',
  cerebras: 'gpt-oss-120b',
  nvidia: 'meta/llama-4-scout-17b-16e-instruct',
  ollama: 'llama3.2',
  custom: 'gpt-4o',
};

export interface AiCallOptions {
  provider: AiProvider;
  apiKey?: string;
  model?: string;
  baseUrl?: string;
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  signal?: AbortSignal;
}

export function defaultModelFor(provider: AiProvider): string {
  return DEFAULT_MODELS[provider];
}

export function defaultBaseUrlFor(provider: AiProvider): string | undefined {
  if (provider === 'anthropic' || provider === 'gemini' || provider === 'custom') return undefined;
  return DEFAULT_BASE_URLS[provider];
}

function resolveKey(provider: AiProvider, apiKey?: string): string {
  if (apiKey) return apiKey;
  // Ollama runs locally and ignores Authorization, so a placeholder is fine.
  if (provider === 'ollama') return 'ollama';
  const envKey = process.env[`${provider.toUpperCase()}_API_KEY`];
  if (envKey) return envKey;
  throw new Error(
    `Missing API key for "${provider}". Pass an "apiKey" tool argument or set ${provider.toUpperCase()}_API_KEY in the environment.`
  );
}

async function callAnthropic(options: AiCallOptions): Promise<string> {
  const key = resolveKey(options.provider, options.apiKey);
  const model = options.model || DEFAULT_MODELS.anthropic;
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      temperature: options.temperature ?? 0.4,
      system: options.systemPrompt,
      messages: [{ role: 'user', content: options.userPrompt }],
    }),
    signal: options.signal,
  });
  if (!response.ok) {
    throw new Error(`Anthropic API error ${response.status}: ${await response.text()}`);
  }
  const data = (await response.json()) as { content?: Array<{ type: string; text?: string }> };
  const text = data.content?.find((part) => part.type === 'text')?.text;
  if (!text) throw new Error('Anthropic response contained no text content.');
  return text;
}

async function callGemini(options: AiCallOptions): Promise<string> {
  const key = resolveKey(options.provider, options.apiKey);
  const model = options.model || DEFAULT_MODELS.gemini;
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: options.systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: options.userPrompt }] }],
        generationConfig: { temperature: options.temperature ?? 0.4 },
      }),
      signal: options.signal,
    }
  );
  if (!response.ok) {
    throw new Error(`Gemini API error ${response.status}: ${await response.text()}`);
  }
  const data = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('');
  if (!text) throw new Error('Gemini response contained no text content.');
  return text;
}

async function callOpenAICompatible(options: AiCallOptions): Promise<string> {
  const key = resolveKey(options.provider, options.apiKey);
  const model = options.model || DEFAULT_MODELS[options.provider];
  const baseUrl =
    options.baseUrl ||
    (options.provider === 'custom'
      ? undefined
      : DEFAULT_BASE_URLS[options.provider as Exclude<AiProvider, 'anthropic' | 'gemini' | 'custom'>]);
  if (!baseUrl) {
    throw new Error(`No base URL configured for provider "${options.provider}". Pass "baseUrl".`);
  }
  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      temperature: options.temperature ?? 0.4,
      messages: [
        { role: 'system', content: options.systemPrompt },
        { role: 'user', content: options.userPrompt },
      ],
    }),
    signal: options.signal,
  });
  if (!response.ok) {
    throw new Error(
      `${options.provider} API error ${response.status}: ${await response.text()}`
    );
  }
  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error(`${options.provider} response contained no text content.`);
  return text;
}

export async function callAi(options: AiCallOptions): Promise<string> {
  if (options.provider === 'anthropic') return callAnthropic(options);
  if (options.provider === 'gemini') return callGemini(options);
  return callOpenAICompatible(options);
}

export const AI_PROVIDERS: AiProvider[] = [
  'openai',
  'anthropic',
  'gemini',
  'groq',
  'mistral',
  'openrouter',
  'cerebras',
  'nvidia',
  'ollama',
  'custom',
];
