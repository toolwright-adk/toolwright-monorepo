import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import {
  createLogger,
  runWithContext,
  generateRequestId,
  withTiming,
  error as toolError,
  ToolwrightError,
  ExternalServiceError,
} from "@toolwright-adk/shared";
import {
  GeneratePlanInputSchema,
  ValidatePlanInputObject,
  BootstrapProjectInputObject,
  AddEpicInputSchema,
  GenerateAndBootstrapInputSchema,
  IntrospectWorkspaceInputSchema,
  ListTeamsInputSchema,
} from "./types.js";
import { generatePlan } from "./tools/generate-plan.js";
import { validatePlanTool } from "./tools/validate-plan.js";
import { bootstrapProject } from "./tools/bootstrap-project.js";
import { addEpic } from "./tools/add-epic.js";
import { generateAndBootstrap } from "./tools/generate-and-bootstrap.js";
import { introspectWorkspace } from "./tools/introspect-workspace.js";
import { listTeams } from "./tools/list-teams.js";

const logger = createLogger("linear-bootstrap");

function handleToolError(err: unknown, toolName: string): CallToolResult {
  if (err instanceof ToolwrightError) {
    return { ...toolError(err) };
  }
  const message =
    err instanceof Error ? err.message : "An unexpected error occurred";
  const wrapped = new ExternalServiceError(
    `${toolName} failed: ${message}`,
    "unknown",
  );
  return { ...toolError(wrapped) };
}

export function createServer(): McpServer {
  const server = new McpServer({
    name: "linear-bootstrap",
    version: "0.1.0",
  });

  server.tool(
    "generate-plan",
    "Generate a structured project plan from a description. Returns a plan_id (cached server-side for 30 min) and summary statistics. Use plan_id with validate-plan or bootstrap-project.",
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
        return handleToolError(err, "generate-plan");
      }
    },
  );

  server.tool(
    "validate-plan",
    "Validate a project plan for structural issues. Accepts plan_id (from generate-plan) or inline plan object. Checks for circular dependencies, orphaned references, undefined milestones, and other problems.",
    ValidatePlanInputObject.shape,
    async (args): Promise<CallToolResult> => {
      const ctx = {
        requestId: generateRequestId(),
        serverName: "linear-bootstrap",
        toolName: "validate-plan",
        startedAt: Date.now(),
      };

      try {
        const { result } = await runWithContext(ctx, () =>
          withTiming("validate-plan", () => validatePlanTool(args)),
        );
        return { ...result };
      } catch (err) {
        return handleToolError(err, "validate-plan");
      }
    },
  );

  server.tool(
    "bootstrap-project",
    "Create a complete Linear project from a plan. Accepts plan_id (from generate-plan) or inline plan object. Creates project, milestones, labels, epics, issues, and dependencies. Set dry_run=true to validate only.",
    BootstrapProjectInputObject.shape,
    async (args): Promise<CallToolResult> => {
      const ctx = {
        requestId: generateRequestId(),
        serverName: "linear-bootstrap",
        toolName: "bootstrap-project",
        startedAt: Date.now(),
      };

      try {
        const { result } = await runWithContext(ctx, () =>
          withTiming("bootstrap-project", () => bootstrapProject(args, logger)),
        );
        return { ...result };
      } catch (err) {
        return handleToolError(err, "bootstrap-project");
      }
    },
  );

  server.tool(
    "add-epic",
    "Add a single epic with its child issues to an existing Linear project. Optionally wire to a milestone and apply label mappings.",
    AddEpicInputSchema.shape,
    async (args): Promise<CallToolResult> => {
      const ctx = {
        requestId: generateRequestId(),
        serverName: "linear-bootstrap",
        toolName: "add-epic",
        startedAt: Date.now(),
      };

      try {
        const { result } = await runWithContext(ctx, () =>
          withTiming("add-epic", () => addEpic(args, logger)),
        );
        return { ...result };
      } catch (err) {
        return handleToolError(err, "add-epic");
      }
    },
  );

  server.tool(
    "introspect-workspace",
    "Read team conventions from Linear: workflow states, labels, cycles, existing projects. Returns cached context (30-min TTL). Called automatically by generate-plan, or use standalone to inspect team setup.",
    IntrospectWorkspaceInputSchema.shape,
    async (args): Promise<CallToolResult> => {
      const ctx = {
        requestId: generateRequestId(),
        serverName: "linear-bootstrap",
        toolName: "introspect-workspace",
        startedAt: Date.now(),
      };

      try {
        const { result } = await runWithContext(ctx, () =>
          withTiming("introspect-workspace", () =>
            introspectWorkspace(args, logger),
          ),
        );
        return { ...result };
      } catch (err) {
        return handleToolError(err, "introspect-workspace");
      }
    },
  );

  server.tool(
    "generate-and-bootstrap",
    "Generate a project plan and immediately bootstrap it in Linear. Combines generate-plan + validate-plan + bootstrap-project into a single call. Set dry_run=true to generate and validate without creating anything.",
    GenerateAndBootstrapInputSchema.shape,
    async (args): Promise<CallToolResult> => {
      const ctx = {
        requestId: generateRequestId(),
        serverName: "linear-bootstrap",
        toolName: "generate-and-bootstrap",
        startedAt: Date.now(),
      };

      try {
        const { result } = await runWithContext(ctx, () =>
          withTiming("generate-and-bootstrap", () =>
            generateAndBootstrap(args, logger),
          ),
        );
        return { ...result };
      } catch (err) {
        return handleToolError(err, "generate-and-bootstrap");
      }
    },
  );

  server.tool(
    "list-teams",
    "List all Linear teams accessible to the configured API key. Returns team id, name, and key. Use this to discover team_id values for other tools.",
    ListTeamsInputSchema.shape,
    async (args): Promise<CallToolResult> => {
      const ctx = {
        requestId: generateRequestId(),
        serverName: "linear-bootstrap",
        toolName: "list-teams",
        startedAt: Date.now(),
      };

      try {
        const { result } = await runWithContext(ctx, () =>
          withTiming("list-teams", () => listTeams(args, logger)),
        );
        return { ...result };
      } catch (err) {
        return handleToolError(err, "list-teams");
      }
    },
  );

  return server;
}
