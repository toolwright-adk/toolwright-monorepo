import { randomUUID } from "node:crypto";
import { PlanValidationError } from "@toolwright-adk/shared";
import type { Plan } from "./types.js";

const cache = new Map<string, { plan: Plan; expiresAt: number }>();
const TTL_MS = 30 * 60 * 1000; // 30 minutes

export function storePlan(plan: Plan): string {
  // Evict expired entries opportunistically
  const now = Date.now();
  for (const [id, entry] of cache) {
    if (now > entry.expiresAt) cache.delete(id);
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

export function resolvePlan(args: {
  plan?: Plan;
  plan_id?: string;
}): Plan {
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
