import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { AI_PROVIDERS, callAi, type AiProvider } from '../lib/aiClient.js';
import { OPENFLOW_DSL_SYSTEM_PROMPT } from '../lib/dslSystemPrompt.js';
import { stripCodeFences } from '../lib/dslSanitizer.js';
import { lintOpenFlowDsl } from '../lib/dslLinter.js';
import { describeError, toolError } from '../lib/errors.js';

const CONVERSION_PROMPT = `
Convert the Mermaid diagram below into OpenFlow DSL. Preserve every node,
every edge, every direction header, every label, and every subgraph.

- Map Mermaid \`flowchart TD\` / \`graph TD\` → \`direction: TB\`.
- Map Mermaid \`flowchart LR\` / \`graph LR\` → \`direction: LR\`.
- Use OpenFlow node types based on intent: [start]/[end] for entry/exit,
  [decision] for diamond shapes, [process] for rectangles, [system] for
  rounded backend services, [browser]/[mobile] when labels imply UI,
  [architecture] when the label clearly names a cloud resource.
- Preserve edge labels via \`->|label|\`.
- Edge styles: Mermaid \`==>\` → OpenFlow \`==>\`; \`-.->\` → \`..\`; \`-->\` → \`->\`.

Output ONLY the OpenFlow DSL — no prose, no markdown fences.
`;

export function registerMermaidToDsl(server: McpServer): void {
  server.registerTool(
    'mermaid_to_openflow_dsl',
    {
      title: 'Convert Mermaid → OpenFlow DSL',
      description:
        'Convert a Mermaid flowchart (or compatible diagram type) into OpenFlow DSL ' +
        'so it can be opened, edited, and exported by OpenFlowKit. AI-driven for ' +
        'high-fidelity intent preservation across edge cases.',
      inputSchema: {
        mermaidSource: z.string().min(3).describe('The full Mermaid source.'),
        provider: z.enum(AI_PROVIDERS as [AiProvider, ...AiProvider[]]).describe('AI provider to call.'),
        apiKey: z.string().optional(),
        model: z.string().optional(),
        baseUrl: z.string().url().optional(),
      },
    },
    async (args) => {
      try {
        const userPrompt = [
          'MERMAID SOURCE:',
          '```mermaid',
          args.mermaidSource.trim(),
          '```',
          '',
          CONVERSION_PROMPT,
        ].join('\n');

        const raw = await callAi({
          provider: args.provider,
          apiKey: args.apiKey,
          model: args.model,
          baseUrl: args.baseUrl,
          systemPrompt: OPENFLOW_DSL_SYSTEM_PROMPT,
          userPrompt,
          // Low temperature for faithful structural conversion.
          temperature: 0.2,
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
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        return toolError(`Mermaid → OpenFlow conversion failed: ${describeError(error)}`);
      }
    }
  );
}
