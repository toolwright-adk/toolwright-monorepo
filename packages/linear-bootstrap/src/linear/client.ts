import { LinearClient, LinearDocument } from "@linear/sdk";
import type {
  Project,
  ProjectMilestone,
  Issue,
  IssueLabel,
} from "@linear/sdk";
import {
  ExternalServiceError,
  withTiming,
  createLogger,
  type Logger,
} from "@toolwright-adk/shared";

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRateLimitError(err: unknown): boolean {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    if (msg.includes("rate limit") || msg.includes("429")) return true;
    const anyErr = err as unknown as Record<string, unknown>;
    if (anyErr.status === 429) return true;
    if (anyErr.response && typeof anyErr.response === "object") {
      const resp = anyErr.response as Record<string, unknown>;
      if (resp.status === 429) return true;
    }
  }
  return false;
}

async function withRetry<T>(
  label: string,
  fn: () => Promise<T>,
  logger: Logger,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      lastError = err;

      if (isRateLimitError(err) && attempt < MAX_RETRIES) {
        const delayMs = BASE_DELAY_MS * Math.pow(2, attempt - 1);
        logger.warn(
          { attempt, delayMs, label },
          `Rate limited on ${label}, retrying in ${delayMs}ms`,
        );
        await sleep(delayMs);
        continue;
      }
      throw err;
    }
  }

  throw lastError;
}

export class LinearApiClient {
  private client: LinearClient;
  private logger: Logger;

  constructor(logger?: Logger) {
    const apiKey = process.env.LINEAR_API_KEY;
    if (!apiKey) {
      throw new ExternalServiceError(
        "LINEAR_API_KEY environment variable is required",
        "linear",
      );
    }

    this.client = new LinearClient({ apiKey });
    this.logger = logger ?? createLogger("linear-bootstrap");
  }

  async createProject(input: {
    name: string;
    teamIds: string[];
    description?: string;
    targetDate?: string;
  }): Promise<Project> {
    const { result: payload } = await withTiming(
      "linear-create-project",
      () =>
        withRetry(
          "createProject",
          () => this.client.createProject(input),
          this.logger,
        ),
    );

    if (!payload.success) {
      throw new ExternalServiceError(
        `Failed to create project "${input.name}"`,
        "linear",
      );
    }

    const project = await payload.project;
    if (!project) {
      throw new ExternalServiceError(
        `Project created but could not be fetched: "${input.name}"`,
        "linear",
      );
    }

    this.logger.info(
      { projectId: project.id },
      `Created project "${input.name}"`,
    );
    return project;
  }

  async createMilestone(input: {
    name: string;
    projectId: string;
    description?: string;
    targetDate?: string;
    sortOrder?: number;
  }): Promise<ProjectMilestone> {
    const { result: payload } = await withTiming(
      "linear-create-milestone",
      () =>
        withRetry(
          "createMilestone",
          () => this.client.createProjectMilestone(input),
          this.logger,
        ),
    );

    if (!payload.success) {
      throw new ExternalServiceError(
        `Failed to create milestone "${input.name}"`,
        "linear",
      );
    }

    const milestone = await payload.projectMilestone;
    if (!milestone) {
      throw new ExternalServiceError(
        `Milestone created but could not be fetched: "${input.name}"`,
        "linear",
      );
    }

    this.logger.info(
      { milestoneId: milestone.id },
      `Created milestone "${input.name}"`,
    );
    return milestone;
  }

  async createIssue(input: {
    teamId: string;
    title: string;
    description?: string;
    priority?: number;
    estimate?: number;
    projectId?: string;
    projectMilestoneId?: string;
    labelIds?: string[];
    parentId?: string;
  }): Promise<Issue> {
    const { result: payload } = await withTiming("linear-create-issue", () =>
      withRetry(
        "createIssue",
        () => this.client.createIssue(input),
        this.logger,
      ),
    );

    if (!payload.success) {
      throw new ExternalServiceError(
        `Failed to create issue "${input.title}"`,
        "linear",
      );
    }

    const issue = await payload.issue;
    if (!issue) {
      throw new ExternalServiceError(
        `Issue created but could not be fetched: "${input.title}"`,
        "linear",
      );
    }

    this.logger.info(
      { issueId: issue.id },
      `Created issue "${input.title}"`,
    );
    return issue;
  }

  async createLabel(input: {
    name: string;
    teamId?: string;
    color?: string;
    description?: string;
  }): Promise<IssueLabel> {
    const { result: payload } = await withTiming("linear-create-label", () =>
      withRetry(
        "createLabel",
        () => this.client.createIssueLabel(input),
        this.logger,
      ),
    );

    if (!payload.success) {
      throw new ExternalServiceError(
        `Failed to create label "${input.name}"`,
        "linear",
      );
    }

    const label = await payload.issueLabel;
    if (!label) {
      throw new ExternalServiceError(
        `Label created but could not be fetched: "${input.name}"`,
        "linear",
      );
    }

    this.logger.info(
      { labelId: label.id },
      `Created label "${input.name}"`,
    );
    return label;
  }

  async setDependency(
    issueId: string,
    blockedByIssueId: string,
  ): Promise<void> {
    // depends_on means "issueId depends on blockedByIssueId"
    // In Linear: blockedByIssueId blocks issueId
    const { result: payload } = await withTiming(
      "linear-set-dependency",
      () =>
        withRetry(
          "setDependency",
          () =>
            this.client.createIssueRelation({
              issueId: blockedByIssueId,
              relatedIssueId: issueId,
              type: LinearDocument.IssueRelationType.Blocks,
            }),
          this.logger,
        ),
    );

    if (!payload.success) {
      throw new ExternalServiceError(
        `Failed to set dependency: ${blockedByIssueId} blocks ${issueId}`,
        "linear",
      );
    }

    this.logger.info(
      { issueId, blockedByIssueId },
      `Set dependency: ${blockedByIssueId} blocks ${issueId}`,
    );
  }

  async getProjectByName(name: string): Promise<Project | null> {
    const { result: connection } = await withTiming(
      "linear-get-project",
      () =>
        withRetry(
          "getProjectByName",
          () =>
            this.client.projects({
              filter: { name: { eqIgnoreCase: name } },
              first: 1,
            }),
          this.logger,
        ),
    );

    return connection.nodes[0] ?? null;
  }
}
