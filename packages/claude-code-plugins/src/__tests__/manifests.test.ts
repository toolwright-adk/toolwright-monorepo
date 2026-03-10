import { readdir, readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect, beforeAll } from "vitest";
import { listPlugins, getPlugin, type PluginManifest } from "../manifests.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const manifestsDir = join(__dirname, "..", "..", "manifests");

describe("listPlugins", () => {
  let plugins: PluginManifest[];

  beforeAll(async () => {
    plugins = await listPlugins();
  });

  it("returns at least one plugin", () => {
    expect(plugins.length).toBeGreaterThan(0);
  });

  it("returns plugins matching manifest files on disk", async () => {
    const files = await readdir(manifestsDir);
    const jsonFiles = files.filter((f) => f.endsWith(".json"));
    expect(plugins).toHaveLength(jsonFiles.length);
  });
});

describe("getPlugin", () => {
  it("finds an existing plugin by name", async () => {
    const plugin = await getPlugin("linear-bootstrap");
    expect(plugin).toBeDefined();
    expect(plugin!.name).toBe("linear-bootstrap");
  });

  it("returns undefined for nonexistent plugin", async () => {
    const plugin = await getPlugin("nonexistent-plugin");
    expect(plugin).toBeUndefined();
  });
});

describe("manifest schema validation", () => {
  let plugins: PluginManifest[];

  beforeAll(async () => {
    plugins = await listPlugins();
  });

  it("every manifest has required fields", () => {
    for (const plugin of plugins) {
      expect(plugin.name, `missing name`).toBeTruthy();
      expect(
        plugin.description,
        `${plugin.name}: missing description`,
      ).toBeTruthy();
      expect(plugin.package, `${plugin.name}: missing package`).toBeTruthy();
    }
  });

  it("no duplicate plugin names", () => {
    const names = plugins.map((p) => p.name);
    const unique = new Set(names);
    expect(unique.size).toBe(names.length);
  });

  it("MCP config has valid structure when present", () => {
    for (const plugin of plugins) {
      if (plugin.mcp) {
        expect(
          plugin.mcp.command,
          `${plugin.name}: missing mcp.command`,
        ).toBeTruthy();
        expect(
          Array.isArray(plugin.mcp.args),
          `${plugin.name}: mcp.args not array`,
        ).toBe(true);
      }
    }
  });

  it("MCP command is npx or a scoped package path, not a bare binary", () => {
    for (const plugin of plugins) {
      if (plugin.mcp) {
        const cmd = plugin.mcp.command;
        const isSafe =
          cmd === "npx" ||
          cmd === "bunx" ||
          cmd === "node" ||
          cmd.startsWith("/") ||
          cmd.startsWith("./");
        expect(
          isSafe,
          `${plugin.name}: bare binary "${cmd}" — use npx -y instead`,
        ).toBe(true);
      }
    }
  });

  it("skill config has valid structure when present", () => {
    for (const plugin of plugins) {
      if (plugin.skill) {
        expect(
          ["package", "bundled"].includes(plugin.skill.source),
          `${plugin.name}: invalid skill.source "${plugin.skill.source}"`,
        ).toBe(true);
        expect(
          plugin.skill.path,
          `${plugin.name}: missing skill.path`,
        ).toBeTruthy();
      }
    }
  });
});

describe("manifest JSON integrity", () => {
  it("every .json file in manifests/ is valid JSON", async () => {
    const files = await readdir(manifestsDir);
    for (const f of files.filter((f) => f.endsWith(".json"))) {
      const content = await readFile(join(manifestsDir, f), "utf-8");
      expect(() => JSON.parse(content), `${f}: invalid JSON`).not.toThrow();
    }
  });
});
