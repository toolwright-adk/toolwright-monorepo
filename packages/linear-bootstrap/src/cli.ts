import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";

const transport = new StdioServerTransport();
const server = createServer();
try {
  await server.connect(transport);
} catch (err) {
  console.error("Failed to start MCP server:", err);
  process.exit(1);
}
