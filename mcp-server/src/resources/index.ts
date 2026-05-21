import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { AI_PROVIDERS, defaultBaseUrlFor, defaultModelFor } from '../lib/aiClient.js';
import { findStarterTemplate, STARTER_TEMPLATES } from '../lib/starterTemplates.js';

const DSL_CHEATSHEET = `# OpenFlow DSL Cheatsheet

flow: <Title>            # required header
direction: TB | LR       # default TB

# Nodes (declare before edges)
[start] s1
[end]   e1
[process]      step1: Friendly Label { color: "blue" }
[decision]     branch: Approved?     { color: "amber" }
[system]       api:    Internal API
[architecture] db:     Postgres     { archProvider: "aws", archResourceType: "database-rds" }
[browser]      web:    Dashboard
[mobile]       app:    Mobile App
[note]         n:      Latency 200ms

# Edges
s1 -> step1                 # default
step1 ==> api               # primary path
api  --> db                 # secondary
api  ..|error| n            # async / dotted
branch ->|Yes| step1
branch ->|No|  e1
`;

export function registerResources(server: McpServer): void {
  // Static cheatsheet — agents read it once to learn DSL surface.
  server.registerResource(
    'dsl-cheatsheet',
    'openflowkit://docs/dsl-cheatsheet',
    {
      title: 'OpenFlow DSL Cheatsheet',
      description: 'Quick reference for OpenFlow DSL node types, attributes, and edge styles.',
      mimeType: 'text/markdown',
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: 'text/markdown',
          text: DSL_CHEATSHEET,
        },
      ],
    })
  );

  // Provider catalog as a discoverable resource.
  server.registerResource(
    'providers',
    'openflowkit://providers',
    {
      title: 'Supported AI providers',
      description: 'JSON list of supported AI providers with default models and env-var names.',
      mimeType: 'application/json',
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: 'application/json',
          text: JSON.stringify(
            AI_PROVIDERS.map((provider) => ({
              provider,
              defaultModel: defaultModelFor(provider),
              defaultBaseUrl: defaultBaseUrlFor(provider) ?? null,
              envVar: `${provider.toUpperCase()}_API_KEY`,
              localFirst: provider === 'ollama',
            })),
            null,
            2
          ),
        },
      ],
    })
  );

  // Templates exposed both as a catalog and via per-name URI template.
  server.registerResource(
    'templates-catalog',
    'openflowkit://templates',
    {
      title: 'Starter template catalog',
      description: 'JSON list of all available starter templates (name, title, category, summary).',
      mimeType: 'application/json',
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: 'application/json',
          text: JSON.stringify(
            STARTER_TEMPLATES.map(({ name, title, category, summary }) => ({
              name,
              title,
              category,
              summary,
            })),
            null,
            2
          ),
        },
      ],
    })
  );

  server.registerResource(
    'template',
    new ResourceTemplate('openflowkit://templates/{name}', {
      list: async () => ({
        resources: STARTER_TEMPLATES.map((template) => ({
          uri: `openflowkit://templates/${template.name}`,
          name: template.name,
          title: template.title,
          description: template.summary,
          mimeType: 'text/plain',
        })),
      }),
      complete: {
        name: async (value) =>
          STARTER_TEMPLATES.filter((template) =>
            template.name.toLowerCase().startsWith(value.toLowerCase())
          ).map((template) => template.name),
      },
    }),
    {
      title: 'Starter template DSL',
      description: 'Returns the OpenFlow DSL body of the named starter template.',
      mimeType: 'text/plain',
    },
    async (uri, variables) => {
      const name = String(variables.name ?? '');
      const template = findStarterTemplate(name);
      if (!template) {
        throw new Error(`Unknown template "${name}".`);
      }
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'text/plain',
            text: template.dsl,
          },
        ],
      };
    }
  );
}
