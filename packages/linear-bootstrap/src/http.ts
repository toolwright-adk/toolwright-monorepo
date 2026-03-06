import express, { type Express } from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createServer } from "./server.js";

export interface HttpServerOptions {
  /** Port to listen on (default: 3000, or PORT env var) */
  port?: number;
  /** Host to bind to (default: "127.0.0.1", or HOST env var). Set to "0.0.0.0" to expose to the network. */
  host?: string;
  /** Path for the MCP endpoint (default: "/mcp") */
  mcpPath?: string;
  /** Bearer token for authentication (default: MCP_HTTP_TOKEN env var). When set, all requests must include Authorization: Bearer <token>. */
  token?: string;
}

/**
 * Creates an Express app with Streamable HTTP MCP transport.
 * Stateless — each request gets a fresh server instance.
 */
export function createHttpApp(options?: HttpServerOptions): Express {
  const mcpPath = options?.mcpPath ?? "/mcp";
  const token = options?.token ?? process.env.MCP_HTTP_TOKEN;

  const app = express();
  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  if (token) {
    app.use(mcpPath, (req, res, next) => {
      const auth = req.headers.authorization;
      if (auth !== `Bearer ${token}`) {
        res.status(401).json({
          jsonrpc: "2.0",
          error: { code: -32600, message: "Unauthorized" },
          id: null,
        });
        return;
      }
      next();
    });
  }

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
  const host = options?.host ?? process.env.HOST ?? "127.0.0.1";
  const app = createHttpApp(options);
  const server = app.listen(port, host, () => {
    console.error(`Linear Bootstrap MCP server listening on ${host}:${port}`);
  });
  return server;
}
