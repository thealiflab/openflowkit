import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { MCP_SERVER_NAME, MCP_SERVER_VERSION } from './lib/version.js';
import { registerGenerateDiagram } from './tools/generateDiagram.js';
import { registerEditDiagram } from './tools/editDiagram.js';
import { registerValidateDsl } from './tools/validateDsl.js';
import { registerMermaidToDsl } from './tools/mermaidToDsl.js';
import { registerDslToMermaid } from './tools/dslToMermaid.js';
import { registerAnalyzeCodebase } from './tools/analyzeCodebase.js';
import { registerCodebaseToDiagram } from './tools/codebaseToDiagram.js';
import { registerListTemplates } from './tools/listTemplates.js';
import { registerGetTemplate } from './tools/getTemplate.js';
import { registerDiscoveryTools } from './tools/discovery.js';
import { registerResources } from './resources/index.js';
import { registerPrompts } from './prompts/index.js';

export function createServer(): McpServer {
  const server = new McpServer({
    name: MCP_SERVER_NAME,
    version: MCP_SERVER_VERSION,
  });

  registerGenerateDiagram(server);
  registerEditDiagram(server);
  registerValidateDsl(server);
  registerMermaidToDsl(server);
  registerDslToMermaid(server);
  registerAnalyzeCodebase(server);
  registerCodebaseToDiagram(server);
  registerListTemplates(server);
  registerGetTemplate(server);
  registerDiscoveryTools(server);
  registerResources(server);
  registerPrompts(server);

  return server;
}
