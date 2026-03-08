import { listPlugins } from "./manifests.js";
import { listSkills } from "./skills.js";

const command = process.argv[2];

async function main() {
  switch (command) {
    case "list": {
      const plugins = await listPlugins();
      const skills = await listSkills();

      console.log("MCP Plugin Bundles:");
      for (const p of plugins) {
        console.log(`  ${p.name} — ${p.description}`);
      }

      console.log("\nStandalone Skills:");
      for (const s of skills) {
        console.log(`  ${s.name} — ${s.skillMdPath}`);
      }
      break;
    }

    case "install": {
      // TODO: write MCP config + symlink skills into ~/.claude/skills/
      console.log(
        "Install not yet implemented. Copy skill directories manually for now.",
      );
      console.log("Skills are located at:");
      const skills = await listSkills();
      for (const s of skills) {
        console.log(`  ${s.dir}`);
      }
      break;
    }

    default:
      console.log("Usage: toolwright-plugins <list|install>");
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
