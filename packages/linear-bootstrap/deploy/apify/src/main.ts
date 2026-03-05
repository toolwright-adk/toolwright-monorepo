import { Actor } from "apify";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "@toolwright-adk/linear-bootstrap";

await Actor.init();

const input = (await Actor.getInput()) as Record<string, string> | null;
if (input) {
  for (const [key, value] of Object.entries(input)) {
    if (value && !process.env[key]) {
      process.env[key] = value;
    }
  }
}

const server = createServer();
const transport = new StdioServerTransport();
await server.connect(transport);
