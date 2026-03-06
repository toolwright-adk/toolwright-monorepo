#!/usr/bin/env tsx
/**
 * Dogfood script — use linear-bootstrap to create its own Linear project.
 * Usage: source .env && tsx scripts/dogfood.ts
 */
// env vars should be exported before running
import { generatePlanCore } from "../src/tools/generate-plan.js";
import { validatePlan } from "../src/tools/validate-plan.js";
import { bootstrapProject } from "../src/tools/bootstrap-project.js";
import { storePlan } from "../src/plan-cache.js";
import { createLogger } from "@toolwright-adk/shared";

const logger = createLogger("dogfood");
const TEAM_ID = "d9b92479-945e-4e25-a2ff-5703ee3919a6"; // Toolwright

const description = `Linear Bootstrap MCP Server — ship the v1.0 release.

This is an MCP server that generates and bootstraps Linear projects from natural language descriptions. It's part of the toolwright-adk monorepo.

Remaining work for v1.0:
- Fix duplicate epic title validation (titles can collide silently)
- Add cache size caps to prevent memory exhaustion in long-running servers
- Validate sort_order on milestones (currently accepts floats/negatives)
- Scope getProjectByName to team for correct idempotency
- Add reconciliation to add-epic so partial failures can be retried
- Extract registerTool helper to reduce server.ts boilerplate
- Publish @toolwright-adk/shared and @toolwright-adk/linear-bootstrap to npm
- Add integration tests against real Linear API (behind env flag)
- Improve JSON extraction from LLM responses (handle preamble/trailing text)
- Add error details to MCP text content for better client compatibility`;

const mode = process.argv[2] ?? "plan";

async function main() {
  console.log("Generating plan...\n");
  const { plan, summary } = await generatePlanCore(
    {
      description,
      team_id: TEAM_ID,
      complexity: "small",
      project_type: "feature",
    },
    logger,
  );

  console.log("=== Plan Summary ===");
  console.log(JSON.stringify(summary, null, 2));
  console.log("\n=== Milestones ===");
  for (const ms of plan.milestones) {
    console.log(`  ${ms.sort_order}. ${ms.name} — ${ms.description}`);
  }
  console.log("\n=== Epics ===");
  for (const epic of plan.epics) {
    console.log(`\n  [${epic.milestone}] ${epic.title}`);
    console.log(`    ${epic.description}`);
    for (const issue of epic.issues) {
      const deps = issue.depends_on.length
        ? ` (depends: ${issue.depends_on.join(", ")})`
        : "";
      console.log(`      - [P${issue.priority}] ${issue.title}${deps}`);
    }
  }

  const validation = validatePlan(plan, undefined, "small");
  console.log("\n=== Validation ===");
  console.log(`Valid: ${validation.valid}`);
  if (validation.errors.length)
    console.log("Errors:", JSON.stringify(validation.errors, null, 2));
  if (validation.warnings.length)
    console.log("Warnings:", JSON.stringify(validation.warnings, null, 2));

  if (mode === "bootstrap" && validation.valid) {
    console.log("\n=== Bootstrapping... ===");
    const result = await bootstrapProject(
      { plan, team_id: TEAM_ID, dry_run: false },
      logger,
    );
    console.log("\n=== Bootstrap Result ===");
    console.log(JSON.stringify(result._meta?.data, null, 2));
  } else if (mode !== "bootstrap") {
    console.log("\nDry run. Pass 'bootstrap' as arg to create in Linear.");
    const planId = storePlan(plan);
    console.log(`Plan cached as: ${planId}`);
  }
}

main().catch((err) => {
  console.error(err);
  if (err.details)
    console.error("Details:", JSON.stringify(err.details, null, 2));
  process.exit(1);
});
