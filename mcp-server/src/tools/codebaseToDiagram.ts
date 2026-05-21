import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { AI_PROVIDERS, callAi, type AiProvider } from '../lib/aiClient.js';
import { OPENFLOW_DSL_SYSTEM_PROMPT } from '../lib/dslSystemPrompt.js';
import { stripCodeFences } from '../lib/dslSanitizer.js';
import { lintOpenFlowDsl } from '../lib/dslLinter.js';
import { buildArchitectureSummary, scanCodebase } from '../lib/codebaseScanner.js';
import { describeError, toolError } from '../lib/errors.js';

export function registerCodebaseToDiagram(server: McpServer): void {
  server.registerTool(
    'codebase_to_diagram',
    {
      title: 'Codebase → architecture diagram',
      description:
        'Scan a local codebase, summarise its detected services / cloud platform / ' +
        'top-level structure, and ask an AI provider to draft an OpenFlow DSL ' +
        'architecture diagram from that summary. Returns clean DSL + lint report.',
      inputSchema: {
        rootPath: z.string().describe('Absolute path to the project root directory.'),
        maxFiles: z.number().int().min(1).max(5000).optional(),
        provider: z.enum(AI_PROVIDERS as [AiProvider, ...AiProvider[]]).describe('AI provider to call.'),
        apiKey: z.string().optional(),
        model: z.string().optional(),
        baseUrl: z.string().url().optional(),
      },
    },
    async (args) => {
      try {
        const scan = await scanCodebase(args.rootPath, args.maxFiles ?? 500);
        const summary = buildArchitectureSummary(scan);

        const userPrompt = [
          'Build an architecture diagram that reflects this codebase.',
          'Prefer [architecture] nodes for detected cloud services and label them with the detected name.',
          'Use [system] for internal services inferred from the top directories.',
          'Aim for 8–15 nodes, edges between layers, and `direction: LR` if the structure is pipeline-like.',
          '',
          'CODEBASE SUMMARY:',
          summary,
        ].join('\n');

        const raw = await callAi({
          provider: args.provider,
          apiKey: args.apiKey,
          model: args.model,
          baseUrl: args.baseUrl,
          systemPrompt: OPENFLOW_DSL_SYSTEM_PROMPT,
          userPrompt,
          temperature: 0.3,
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
                  scanSummary: summary,
                  lint: {
                    ok: lint.ok,
                    declaredNodeIds: lint.declaredNodeIds,
                    edgeCount: lint.edgeCount,
                    diagnostics: lint.diagnostics,
                  },
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        return toolError(`Codebase → diagram failed: ${describeError(error)}`);
      }
    }
  );
}
