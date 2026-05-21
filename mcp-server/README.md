<div align="center">

# OpenFlowKit MCP Server

**Turn Claude Desktop, Cursor, Windsurf, or any MCP client into a first-class diagramming agent.**

[![npm](https://img.shields.io/npm/v/@openflowkit/mcp-server?style=flat-square&color=f97316)](https://www.npmjs.com/package/@openflowkit/mcp-server)
[![MIT License](https://img.shields.io/badge/License-MIT-f97316.svg?style=flat-square)](https://github.com/Vrun-design/openflowkit/blob/main/LICENSE)
[![Node 18+](https://img.shields.io/badge/Node-18%2B-339933.svg?style=flat-square)](https://nodejs.org/)

</div>

---

Ship architecture, flowcharts, sequences, and pipelines from inside your AI assistant.
Generate, edit, validate, convert, and analyse — all local-first, BYOK, $0 infra.

```
You:    Create a flowchart for a checkout flow with a promo-code branch
Claude: [calls generate_diagram_from_prompt]
        → returns OpenFlow DSL + lint report
You:    Add a Stripe webhook node after payment
Claude: [calls edit_diagram]
        → returns updated DSL, every existing node id preserved
You:    Convert it to Mermaid for the README
Claude: [calls openflow_dsl_to_mermaid]
        → returns Mermaid block, ready to paste
```

---

## Install

```bash
# No install required — npx fetches the latest published version
npx -y @openflowkit/mcp-server

# Or install globally
npm install -g @openflowkit/mcp-server
openflowkit-mcp
```

Requires **Node 18+**.

---

## Claude Desktop setup

Edit your Claude Desktop config:

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "openflowkit": {
      "command": "npx",
      "args": ["-y", "@openflowkit/mcp-server"],
      "env": {
        "OPENAI_API_KEY": "sk-...",
        "ANTHROPIC_API_KEY": "sk-ant-..."
      }
    }
  }
}
```

Restart Claude Desktop. You should see **openflowkit** in the tool picker.

### Cursor / Windsurf / other MCP clients

Point the client at the `npx -y @openflowkit/mcp-server` command with the same env vars.
The server speaks the standard MCP stdio protocol — no client-specific configuration.

### Ollama (fully local, no API key)

```json
{
  "mcpServers": {
    "openflowkit": {
      "command": "npx",
      "args": ["-y", "@openflowkit/mcp-server"]
    }
  }
}
```

Then ask: *"Use openflowkit with provider=ollama and model=llama3.2 to generate a flowchart of …"*.
Ollama runs on `http://localhost:11434` by default — make sure the daemon is started.

---

## Tools

| Tool | What it does | Needs AI? |
|---|---|---|
| `generate_diagram_from_prompt` | Natural language → OpenFlow DSL | Yes |
| `edit_diagram` | Modify existing DSL, preserving every node id | Yes |
| `mermaid_to_openflow_dsl` | Convert Mermaid → OpenFlow DSL | Yes |
| `openflow_dsl_to_mermaid` | Convert OpenFlow DSL → Mermaid | Yes |
| `codebase_to_diagram` | Scan a local repo → draft architecture diagram | Yes |
| `validate_openflow_dsl` | Lint DSL with structured diagnostics | **No** |
| `analyze_codebase` | Detect cloud platform + services from local repo | **No** |
| `list_starter_templates` | Browse built-in starter templates | **No** |
| `get_starter_template` | Fetch a named starter template (DSL body) | **No** |
| `list_supported_ai_providers` | Discover provider ids + default models | **No** |
| `list_diagram_node_types` | OpenFlow DSL reference | **No** |
| `server_info` | Version + capability self-test | **No** |

Half the surface works **without any API key** — perfect for local-first workflows.

---

## Resources

The server exposes these MCP resources so agents can `read` them directly:

| URI | Description |
|---|---|
| `openflowkit://docs/dsl-cheatsheet` | Quick reference for OpenFlow DSL syntax |
| `openflowkit://providers` | JSON list of supported AI providers + defaults |
| `openflowkit://templates` | Catalog of starter templates |
| `openflowkit://templates/{name}` | DSL body of a named starter template (supports completion) |

---

## Prompts

Pre-built prompt templates clients can offer users as starting points:

- `flowchart_from_description` — Guides the assistant to create a flowchart from a plain-text description.
- `convert_mermaid_to_openflow` — Guides the assistant to convert a Mermaid block into OpenFlow DSL.
- `architecture_from_codebase` — Guides the assistant to draft an architecture diagram from a local repo.

---

## Supported AI providers

BYOK to any of these. Set env vars at MCP server launch or pass per-tool with the `apiKey` argument.

| Provider | Env var | Default model |
|---|---|---|
| `openai` | `OPENAI_API_KEY` | `gpt-4o-mini` |
| `anthropic` | `ANTHROPIC_API_KEY` | `claude-haiku-4-5` |
| `gemini` | `GEMINI_API_KEY` | `gemini-2.5-flash-lite` |
| `groq` | `GROQ_API_KEY` | `meta-llama/llama-4-scout-17b-16e-instruct` |
| `mistral` | `MISTRAL_API_KEY` | `mistral-small-latest` |
| `openrouter` | `OPENROUTER_API_KEY` | `google/gemini-2.5-flash` |
| `cerebras` | `CEREBRAS_API_KEY` | `gpt-oss-120b` |
| `nvidia` | `NVIDIA_API_KEY` | `meta/llama-4-scout-17b-16e-instruct` |
| `ollama` | *(not needed, runs on `localhost:11434`)* | `llama3.2` |
| `custom` | `CUSTOM_API_KEY` + `baseUrl` arg | `gpt-4o` |

---

## Privacy & cost

- **No telemetry.** The server never phones home.
- **No infra cost.** Runs entirely on your machine.
- **BYOK only.** AI calls go from your machine directly to the provider you chose with the key you supplied. The server is a thin pass-through.
- **Local-first by default.** Eight of the twelve tools work with no network access at all.

---

## Examples

### Generate a flowchart

```text
User: Create a checkout flow with shipping address validation,
      payment, and email confirmation.

Claude: [tool call] generate_diagram_from_prompt({
  prompt: "Checkout flow with shipping validation, payment, email confirmation",
  provider: "anthropic"
})
```

Returns clean OpenFlow DSL plus a lint report:

```text
flow: Checkout
direction: TB

[start] start
[process] address: Enter shipping address { icon: "MapPin", color: "blue" }
[decision] valid: Address valid? { color: "amber" }
[process] payment: Take payment { icon: "CreditCard", color: "violet" }
[process] email: Send confirmation { icon: "Mail", color: "blue" }
[end] done: Order complete { color: "emerald" }
[end] fix: Fix address { color: "red" }

start ==> address
address -> valid
valid ->|Yes| payment
valid ->|No|  fix
payment ==> email
email   ==> done
```

### Convert a README Mermaid block

```text
User: Convert this Mermaid into OpenFlow DSL: <paste>

Claude: [tool call] mermaid_to_openflow_dsl({ mermaidSource: "...", provider: "openai" })
```

### Draft an architecture diagram from a local repo

```text
User: Draft an architecture diagram for the project at ~/code/my-app.

Claude: [tool call] codebase_to_diagram({
  rootPath: "/Users/me/code/my-app",
  provider: "gemini"
})
```

---

## Development

This package lives in the [openflowkit monorepo](https://github.com/Vrun-design/openflowkit).

```bash
# From the repo root
npm install --workspace=mcp-server
npm run --workspace=mcp-server build
npm run --workspace=mcp-server test:run

# Run locally against the MCP Inspector
npx @modelcontextprotocol/inspector dist/index.js
```

The MCP Inspector gives you a UI to manually call every tool, browse every
resource, and exercise every prompt — perfect for verifying behaviour before
pointing a real client at the server.

---

## License

MIT — see [LICENSE](https://github.com/Vrun-design/openflowkit/blob/main/LICENSE).

---

<div align="center">

Made by the [OpenFlowKit](https://openflowkit.com) team — the open-source diagramming studio for developers.

</div>
