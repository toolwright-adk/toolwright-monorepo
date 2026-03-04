import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import {
  createLogger,
  runWithContext,
  generateRequestId,
  withTiming,
  error as toolError,
  ToolwrightError,
} from "@toolwright-adk/shared";
import { GeneratePlanInputSchema } from "./types.js";
import { generatePlan } from "./tools/generate-plan.js";

const logger = createLogger("linear-bootstrap");

const server = new McpServer({
  name: "linear-bootstrap",
  version: "0.1.0",
});

server.tool(
  "generate-plan",
  "Generate a structured project plan from a description. Returns milestones, epics, and issues without creating anything in Linear.",
  GeneratePlanInputSchema.shape,
  async (args): Promise<CallToolResult> => {
    const ctx = {
      requestId: generateRequestId(),
      serverName: "linear-bootstrap",
      toolName: "generate-plan",
      startedAt: Date.now(),
    };

    try {
      const { result } = await runWithContext(ctx, () =>
        withTiming("generate-plan", () => generatePlan(args, logger)),
      );
      return { ...result };
    } catch (err) {
      if (err instanceof ToolwrightError) {
        return { ...toolError(err) };
      }
      throw err;
    }
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
