import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  createTestContext,
  assertToolSuccess,
} from "@toolwright-adk/shared/testing";
import { createLogger } from "@toolwright-adk/shared";

// Create a mock function that can be reset between tests
const mockListTeamsFn = vi.fn();

// Mock the LinearApiClient module with a factory that returns our mock
vi.mock("../linear/client.js", () => ({
  LinearApiClient: vi.fn().mockImplementation(() => ({
    listTeams: mockListTeamsFn,
  })),
}));

import { listTeams } from "../tools/list-teams.js";

const logger = createLogger("test", { level: "error" });

describe("listTeams", () => {
  let ctx: ReturnType<typeof createTestContext>;

  beforeEach(() => {
    ctx = createTestContext({ LINEAR_API_KEY: "test-key" });
    mockListTeamsFn.mockReset();
  });

  afterEach(async () => {
    await ctx.teardown();
  });

  it("returns list of teams", async () => {
    const mockTeams = [
      { id: "team-1", name: "Engineering", key: "ENG" },
      { id: "team-2", name: "Design", key: "DES" },
    ];
    mockListTeamsFn.mockResolvedValue(mockTeams);

    const result = await listTeams({} as Record<string, never>, logger);
    assertToolSuccess(result);
    expect(result._meta?.data).toEqual(mockTeams);
  });

  it("propagates ExternalServiceError from client", async () => {
    const { ExternalServiceError } = await import("@toolwright-adk/shared");
    mockListTeamsFn.mockRejectedValue(
      new ExternalServiceError("API failed", "linear"),
    );

    await expect(
      listTeams({} as Record<string, never>, logger),
    ).rejects.toThrow("API failed");
  });
});
