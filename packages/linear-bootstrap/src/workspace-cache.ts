import type { WorkspaceContext } from "./types.js";

const cache = new Map<
  string,
  { context: WorkspaceContext; expiresAt: number }
>();
const TTL_MS = 30 * 60 * 1000; // 30 minutes

export function storeWorkspaceContext(
  teamId: string,
  context: WorkspaceContext,
): void {
  const now = Date.now();
  for (const [id, entry] of cache) {
    if (now > entry.expiresAt) cache.delete(id);
  }
  cache.set(teamId, { context, expiresAt: now + TTL_MS });
}

export function retrieveWorkspaceContext(
  teamId: string,
): WorkspaceContext | undefined {
  const entry = cache.get(teamId);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    cache.delete(teamId);
    return undefined;
  }
  return entry.context;
}

/** Reset cache — for testing only */
export function clearWorkspaceCache(): void {
  cache.clear();
}
