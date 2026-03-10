import { readdir, readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const manifestsDir = join(__dirname, "..", "manifests");

export interface PluginManifest {
  name: string;
  description: string;
  package: string;
  mcp?: {
    command: string;
    args: string[];
    env?: Record<string, string>;
  };
  skill?: {
    source: "package" | "bundled";
    path: string;
  };
}

export async function listPlugins(): Promise<PluginManifest[]> {
  const files = await readdir(manifestsDir);
  const manifests = await Promise.all(
    files
      .filter((f) => f.endsWith(".json"))
      .map(async (f) => {
        const content = await readFile(join(manifestsDir, f), "utf-8");
        return JSON.parse(content) as PluginManifest;
      }),
  );
  return manifests;
}

export async function getPlugin(
  name: string,
): Promise<PluginManifest | undefined> {
  const plugins = await listPlugins();
  return plugins.find((p) => p.name === name);
}
