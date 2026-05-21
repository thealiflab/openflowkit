import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { AI_PROVIDERS, callAi, type AiProvider } from '../lib/aiClient.js';
import { OPENFLOW_DSL_SYSTEM_PROMPT } from '../lib/dslSystemPrompt.js';
import { stripCodeFences } from '../lib/dslSanitizer.js';
import { lintOpenFlowDsl } from '../lib/dslLinter.js';
import { describeError, toolError } from '../lib/errors.js';

export function registerGenerateDiagram(server: McpServer): void {
  server.registerTool(
    'generate_diagram_from_prompt',
    {
      title: 'Generate diagram from prompt',
      description:
        'Generate a brand-new OpenFlow DSL diagram from a natural-language description. ' +
        'Returns clean DSL (no markdown fences) plus a lint report. ' +
        'Requires BYOK to any supported AI provider.',
      inputSchema: {
        prompt: z
          .string()
          .min(3, 'Prompt is required')
          .describe('Natural-language description of the diagram to create.'),
        provider: z
          .enum(AI_PROVIDERS as [AiProvider, ...AiProvider[]])
          .describe('Which AI provider to call. Use list_supported_ai_providers to discover.'),
        apiKey: z
          .string()
          .optional()
          .describe(
            'BYOK API key for the chosen provider. Optional if the corresponding ' +
              '<PROVIDER>_API_KEY env var is set. Ollama does not require a key.'
          ),
        model: z
          .string()
          .optional()
          .describe('Specific model id (e.g. "gpt-4o-mini"). Defaults to a sensible per-provider choice.'),
        baseUrl: z
          .string()
          .url()
          .optional()
          .describe('Override the API base URL (for self-hosted gateways or custom deployments).'),
        temperature: z
          .number()
          .min(0)
          .max(2)
          .optional()
          .describe('Sampling temperature. Defaults to 0.4 for a balance of variety and structure.'),
      },
    },
    async (args) => {
      try {
        const raw = await callAi({
          provider: args.provider,
          apiKey: args.apiKey,
          model: args.model,
          baseUrl: args.baseUrl,
          temperature: args.temperature,
          systemPrompt: OPENFLOW_DSL_SYSTEM_PROMPT,
          userPrompt: args.prompt,
        });
        const dsl = stripCodeFences(raw);
        const lint = lintOpenFlowDsl(dsl);

        return {
          content: [
            { type: 'text' as const, text: dsl },
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  lint: {
                    ok: lint.ok,
                    declaredNodeIds: lint.declaredNodeIds,
                    edgeCount: lint.edgeCount,
                    diagnostics: lint.diagnostics,
                  },
                  provider: args.provider,
                  model: args.model ?? '(default)',
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        return toolError(`Diagram generation failed: ${describeError(error)}`);
      }
    }
  );
}
