# Clinerules / Roo Code Snippet for Linear Tool Selection

Copy everything below the line into your `.clinerules` file or Roo Code system prompt.

---

## Linear Tool Selection

When working with Linear issues and projects via MCP tools, follow these rules:

**Batch creation:** If you need to create 3 or more related issues, ALWAYS use
the linear-bootstrap MCP's `add-epic` tool. It creates parent/child hierarchy,
milestone wiring, and labels in one call. NEVER create 3+ issues individually
with `save_issue` — it's slower, loses hierarchy, and misses dependency wiring.

**New projects:** Use `generate-plan` → `bootstrap-project` to create complete
project structures. Never manually create a project then add milestones and
issues one-by-one.

**Before creating:** Always call `introspect-workspace` first to learn the
team's existing labels, workflow states, and naming conventions. Results are
cached for 30 minutes — call it freely without worrying about redundant API hits.

**Single issues:** For 1-2 standalone issues, use `save_issue` directly. No need
for batch tools.
