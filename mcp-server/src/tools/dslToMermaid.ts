import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { AI_PROVIDERS, callAi, type AiProvider } from '../lib/aiClient.js';
import { stripCodeFences } from '../lib/dslSanitizer.js';
import { describeError, toolError } from '../lib/errors.js';

const CONVERSION_SYSTEM = `
You convert OpenFlow DSL diagrams into Mermaid syntax. Output ONLY valid
Mermaid — no prose, no markdown fences.

Rules:
- direction: TB → \`flowchart TD\`; direction: LR → \`flowchart LR\`.
- Use node shapes that reflect the OpenFlow type: [decision] → diamond
  \`{...}\`; [start]/[end] → stadium \`([...])\`; everything else → \`[...]\`.
- Preserve labels exactly (quote them with double quotes if they contain
  punctuation or spaces).
- Preserve edge labels with \`-->|label|\` syntax.
- \`==>\` stays as \`==>\`; \`..\` becomes \`-.->\`; \`->\` becomes \`-->\`.
- Output a single Mermaid block, nothing else.
`;

export function registerDslToMermaid(server: McpServer): void {
  server.registerTool(
    'openflow_dsl_to_mermaid',
    {
      title: 'Convert OpenFlow DSL → Mermaid',
      description:
        'Convert an OpenFlow DSL diagram into Mermaid syntax for use in GitHub READMEs, ' +
        'docs sites, or any tool that renders Mermaid natively.',
      inputSchema: {
        dsl: z.string().min(3).describe('OpenFlow DSL source.'),
        provider: z.enum(AI_PROVIDERS as [AiProvider, ...AiProvider[]]).describe('AI provider to call.'),
        apiKey: z.string().optional(),
        model: z.string().optional(),
        baseUrl: z.string().url().optional(),
      },
    },
    async (args) => {
      try {
        const raw = await callAi({
          provider: args.provider,
          apiKey: args.apiKey,
          model: args.model,
          baseUrl: args.baseUrl,
          systemPrompt: CONVERSION_SYSTEM,
          userPrompt: ['OPENFLOW DSL:', '```', args.dsl.trim(), '```'].join('\n'),
          temperature: 0.2,
        });
        return {
          content: [{ type: 'text' as const, text: stripCodeFences(raw) }],
        };
      } catch (error) {
        return toolError(`OpenFlow → Mermaid conversion failed: ${describeError(error)}`);
      }
    }
  );
}
