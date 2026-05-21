import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

/**
 * Prompts are reusable templates that MCP clients can offer users as
 * starting points. They steer the model toward the right OpenFlowKit tool
 * with the right arguments.
 */
export function registerPrompts(server: McpServer): void {
  server.registerPrompt(
    'flowchart_from_description',
    {
      title: 'Create a flowchart from a description',
      description:
        'Guides the assistant to call generate_diagram_from_prompt with a flowchart-shaped DSL.',
      argsSchema: {
        description: z
          .string()
          .describe('What the flowchart should represent (e.g. "checkout flow with promo code branch").'),
        provider: z
          .string()
          .optional()
          .describe('Which AI provider to use (defaults to the model orchestrating you).'),
      },
    },
    ({ description, provider }) => ({
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text:
              `Use the OpenFlowKit MCP tool \`generate_diagram_from_prompt\` to create a flowchart.\n\n` +
              `Description:\n${description}\n\n` +
              `Provider preference: ${provider ?? '(your choice)'}.\n\n` +
              `After generation, return the DSL together with a short summary of the flow.`,
          },
        },
      ],
    })
  );

  server.registerPrompt(
    'convert_mermaid_to_openflow',
    {
      title: 'Convert a Mermaid diagram to OpenFlow DSL',
      description: 'Guides the assistant to call mermaid_to_openflow_dsl on the provided Mermaid source.',
      argsSchema: {
        mermaidSource: z.string().describe('The Mermaid diagram to convert.'),
      },
    },
    ({ mermaidSource }) => ({
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text:
              `Use the OpenFlowKit MCP tool \`mermaid_to_openflow_dsl\` to convert this Mermaid source into OpenFlow DSL.\n\n` +
              `Mermaid source:\n\`\`\`mermaid\n${mermaidSource}\n\`\`\`\n\n` +
              `Return the resulting DSL plus the lint report.`,
          },
        },
      ],
    })
  );

  server.registerPrompt(
    'architecture_from_codebase',
    {
      title: 'Draft an architecture diagram from a local codebase',
      description: 'Guides the assistant to call codebase_to_diagram on a local project path.',
      argsSchema: {
        rootPath: z.string().describe('Absolute path to the project root.'),
      },
    },
    ({ rootPath }) => ({
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text:
              `Call the OpenFlowKit MCP tool \`codebase_to_diagram\` on rootPath=\`${rootPath}\`.\n\n` +
              `If the scan returns interesting services, follow up with \`edit_diagram\` to refine layout or labels.\n\n` +
              `Finally, summarise the architecture in plain English for the user.`,
          },
        },
      ],
    })
  );
}
