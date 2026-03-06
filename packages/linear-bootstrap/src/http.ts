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
  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.all(mcpPath, async (req, res) => {
    const server = createServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });
    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch {
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: { code: -32603, message: "Internal server error" },
          id: null,
        });
      }
    } finally {
      res.on("close", () => {
        transport.close().catch(() => {});
        server.close().catch(() => {});
      });
    }
  });

  return app;
}

/**
 * Creates and starts an HTTP MCP server. Returns the listening server instance.
 */
export function startHttpServer(options?: HttpServerOptions) {
  const rawPort = options?.port ?? parseInt(process.env.PORT ?? "3000");
  if (isNaN(rawPort) || rawPort < 1 || rawPort > 65535) {
    throw new Error(
      `Invalid PORT: "${process.env.PORT}". Must be a number between 1 and 65535.`,
    );
  }
  const port = rawPort;
  const app = createHttpApp(options);
  const server = app.listen(port, () => {
    console.error(`Linear Bootstrap MCP server listening on port ${port}`);
  });
  return server;
}
