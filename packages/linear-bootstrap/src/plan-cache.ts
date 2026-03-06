import { randomUUID } from "node:crypto";
import { PlanValidationError } from "@toolwright-adk/shared";
import type { Plan } from "./types.js";

/**
 * In-memory plan cache. Process-local — plan_id references are only valid
 * within the same process and expire after 30 minutes. Under horizontal
 * scaling or multi-process deployments, use generate-and-bootstrap (single
 * request) or pass inline plan objects instead of plan_id references.
 */
const cache = new Map<string, { plan: Plan; expiresAt: number }>();
const TTL_MS = 30 * 60 * 1000; // 30 minutes
const MAX_ENTRIES = 50;

export function storePlan(plan: Plan): string {
  const now = Date.now();

  // Evict expired entries first
  for (const [id, entry] of cache) {
    if (now > entry.expiresAt) cache.delete(id);
  }

  // If still at capacity, evict the oldest entry
  while (cache.size >= MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
    else break;
  }

  const id = randomUUID();
  cache.set(id, { plan, expiresAt: now + TTL_MS });
  return id;
}

export function retrievePlan(id: string): Plan | undefined {
  const entry = cache.get(id);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    cache.delete(id);
    return undefined;
  }
  return entry.plan;
}

export function resolvePlan(args: { plan?: Plan; plan_id?: string }): Plan {
  if (args.plan) return args.plan;
  if (args.plan_id) {
    const plan = retrievePlan(args.plan_id);
    if (!plan) {
      throw new PlanValidationError(
        `Plan not found for plan_id "${args.plan_id}". Plans expire after 30 minutes.`,
        { plan_id: args.plan_id },
      );
    }
    return plan;
  }
  throw new PlanValidationError("Either plan or plan_id is required", {});
}

/** Reset cache — for testing only */
export function clearPlanCache(): void {
  cache.clear();
}
