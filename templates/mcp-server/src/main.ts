import { Actor } from "apify";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

await Actor.init();

const server = new McpServer({
  name: "{{server-name}}",
  version: "0.1.0",
});

// Register tools here:
// server.tool("tool-name", "description", { ...schema }, async (args) => { ... });

const transport = new StdioServerTransport();
await server.connect(transport);

await Actor.exit();
