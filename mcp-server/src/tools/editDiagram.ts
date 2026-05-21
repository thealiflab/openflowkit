import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { AI_PROVIDERS, callAi, type AiProvider } from '../lib/aiClient.js';
import { OPENFLOW_DSL_EDIT_PREAMBLE, OPENFLOW_DSL_SYSTEM_PROMPT } from '../lib/dslSystemPrompt.js';
import { stripCodeFences } from '../lib/dslSanitizer.js';
import { lintOpenFlowDsl } from '../lib/dslLinter.js';
import { describeError, toolError } from '../lib/errors.js';

export function registerEditDiagram(server: McpServer): void {
  server.registerTool(
    'edit_diagram',
    {
      title: 'Edit an existing diagram',
      description:
        'Modify an existing OpenFlow DSL diagram via natural-language instructions. ' +
        'Preserves every node id verbatim; only the changes you describe are applied. ' +
        'Returns the full updated DSL.',
      inputSchema: {
        currentDsl: z
          .string()
          .min(1, 'currentDsl is required')
          .describe('The existing diagram in OpenFlow DSL.'),
        instructions: z
          .string()
          .min(3)
          .describe('What you want to change. Be specific (e.g. "add a Redis cache between API and DB").'),
        provider: z
          .enum(AI_PROVIDERS as [AiProvider, ...AiProvider[]])
          .describe('AI provider to call.'),
        apiKey: z.string().optional().describe('BYOK API key. Optional if env var is set.'),
        model: z.string().optional().describe('Specific model id.'),
        baseUrl: z.string().url().optional().describe('Override API base URL.'),
        temperature: z.number().min(0).max(2).optional(),
      },
    },
    async (args) => {
      try {
        const systemPrompt = OPENFLOW_DSL_EDIT_PREAMBLE + OPENFLOW_DSL_SYSTEM_PROMPT;
        const userPrompt = [
          'CURRENT DIAGRAM:',
          '```',
          args.currentDsl.trim(),
          '```',
          '',
          'REQUESTED CHANGE:',
          args.instructions,
        ].join('\n');

        const raw = await callAi({
          provider: args.provider,
          apiKey: args.apiKey,
          model: args.model,
          baseUrl: args.baseUrl,
          temperature: args.temperature,
          systemPrompt,
          userPrompt,
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
        return toolError(`Diagram edit failed: ${describeError(error)}`);
      }
    }
  );
}
