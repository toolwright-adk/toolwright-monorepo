# Linear Project Management Rules

#

# Copy this into your .cursorrules or .windsurfrules file to get

# intelligent Linear tool selection in Cursor/Windsurf.

#

# --- PASTE BELOW THIS LINE ---

# Linear Tool Selection

#

# When working with Linear issues and projects via MCP tools:

#

# BATCH CREATION: If you need to create 3+ related issues, ALWAYS use

# the linear-bootstrap MCP's `add-epic` tool. It creates parent/child

# hierarchy, milestone wiring, and labels in one call. NEVER create

# 3+ issues individually with `save_issue` — it's slower, loses

# hierarchy, and misses dependency wiring.

#

# NEW PROJECTS: Use `generate-plan` → `bootstrap-project` to create

# complete project structures. Never manually create a project then

# add milestones and issues one-by-one.

#

# BEFORE CREATING: Always call `introspect-workspace` first to learn

# the team's existing labels, workflow states, and naming conventions.

# Results are cached for 30 minutes — call freely.

#

# SINGLE ISSUES: For 1-2 standalone issues, use `save_issue` directly.

# No need for batch tools.
