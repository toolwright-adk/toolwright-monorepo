import { access, readFile } from "node:fs/promises";
import { describe, it, expect, beforeAll } from "vitest";
import { listSkills, getSkillPath, type SkillInfo } from "../skills.js";

describe("listSkills", () => {
  let skills: SkillInfo[];

  beforeAll(async () => {
    skills = await listSkills();
  });

  it("returns at least one skill", () => {
    expect(skills.length).toBeGreaterThan(0);
  });

  it("each skill has required fields", () => {
    for (const skill of skills) {
      expect(skill.name, "missing name").toBeTruthy();
      expect(skill.dir, `${skill.name}: missing dir`).toBeTruthy();
      expect(
        skill.skillMdPath,
        `${skill.name}: missing skillMdPath`,
      ).toBeTruthy();
    }
  });

  it("each skill SKILL.md file exists on disk", async () => {
    for (const skill of skills) {
      await expect(
        access(skill.skillMdPath),
        `${skill.name}: SKILL.md not found at ${skill.skillMdPath}`,
      ).resolves.toBeUndefined();
    }
  });
});

describe("getSkillPath", () => {
  it("returns a path ending in SKILL.md", () => {
    const path = getSkillPath("temporal-awareness");
    expect(path).toMatch(/\/temporal-awareness\/SKILL\.md$/);
  });
});

describe("SKILL.md content validation", () => {
  let skills: SkillInfo[];

  beforeAll(async () => {
    skills = await listSkills();
  });

  it("each SKILL.md has YAML frontmatter with name field", async () => {
    for (const skill of skills) {
      const content = await readFile(skill.skillMdPath, "utf-8");
      expect(
        content.startsWith("---"),
        `${skill.name}: missing frontmatter delimiter`,
      ).toBe(true);
      const endIdx = content.indexOf("---", 3);
      expect(endIdx, `${skill.name}: unclosed frontmatter`).toBeGreaterThan(3);

      const frontmatter = content.slice(3, endIdx);
      expect(
        frontmatter.includes("name:"),
        `${skill.name}: frontmatter missing name field`,
      ).toBe(true);
    }
  });

  it("each SKILL.md has a description in frontmatter", async () => {
    for (const skill of skills) {
      const content = await readFile(skill.skillMdPath, "utf-8");
      const endIdx = content.indexOf("---", 3);
      const frontmatter = content.slice(3, endIdx);
      expect(
        frontmatter.includes("description:"),
        `${skill.name}: frontmatter missing description`,
      ).toBe(true);
    }
  });

  it("each SKILL.md has markdown content after frontmatter", async () => {
    for (const skill of skills) {
      const content = await readFile(skill.skillMdPath, "utf-8");
      const endIdx = content.indexOf("---", 3);
      const body = content.slice(endIdx + 3).trim();
      expect(
        body.length,
        `${skill.name}: empty body after frontmatter`,
      ).toBeGreaterThan(0);
    }
  });
});
