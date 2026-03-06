import { Actor } from "apify";
import express from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createServer } from "@toolwright-adk/linear-bootstrap";

await Actor.init();

const input = (await Actor.getInput()) as Record<string, string> | null;
if (input) {
  for (const [key, value] of Object.entries(input)) {
    if (value && process.env[key]) {
      console.log(`Skipping input "${key}": already set in environment`);
    } else if (value) {
      process.env[key] = value;
    }
  }
}

const app = express();
app.use(express.json());

// Apify readiness probe
app.get("/", (req, res) => {
  if (req.headers["x-apify-container-server-readiness-probe"]) {
    res.end("ok\n");
    return;
  }
  res.status(404).end();
});

// Stateless MCP request handler — new server instance per request
app.post("/mcp", async (req, res) => {
  const server = createServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
  res.on("close", () => {
    transport.close();
    server.close();
  });
});

const PORT = parseInt(process.env.APIFY_CONTAINER_PORT ?? "3000");
app.listen(PORT);
