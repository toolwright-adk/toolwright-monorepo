import express, { type Express } from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createServer } from "./server.js";

export interface HttpServerOptions {
  /** Port to listen on (default: 3000, or PORT env var) */
  port?: number;
  /** Path for the MCP endpoint (default: "/mcp") */
  mcpPath?: string;
}

/**
 * Creates an Express app with Streamable HTTP MCP transport.
 * Stateless — each request gets a fresh server instance.
 */
export function createHttpApp(options?: HttpServerOptions): Express {
  const mcpPath = options?.mcpPath ?? "/mcp";

  const app = express();
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.post(mcpPath, async (req, res) => {
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

  return app;
}

/**
 * Creates and starts an HTTP MCP server. Returns the listening server instance.
 */
export function startHttpServer(options?: HttpServerOptions) {
  const port = options?.port ?? parseInt(process.env.PORT ?? "3000");
  const app = createHttpApp(options);
  const server = app.listen(port, () => {
    console.error(`Linear Bootstrap MCP server listening on port ${port}`);
  });
  return server;
}
