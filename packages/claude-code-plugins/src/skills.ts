import { readdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const skillsDir = join(__dirname, "..", "skills");

export interface SkillInfo {
  name: string;
  dir: string;
  skillMdPath: string;
}

export async function listSkills(): Promise<SkillInfo[]> {
  const entries = await readdir(skillsDir, { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory())
    .map((e) => ({
      name: e.name,
      dir: join(skillsDir, e.name),
      skillMdPath: join(skillsDir, e.name, "SKILL.md"),
    }));
}

export function getSkillPath(name: string): string {
  return join(skillsDir, name, "SKILL.md");
}
