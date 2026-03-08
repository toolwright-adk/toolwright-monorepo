---
name: temporal-awareness
description: |
  Gives Claude Code persistent awareness of time passing, session duration, and temporal context.
  Helps Claude react naturally to late-night sessions, long conversations, compaction events,
  and time-sensitive user cues like "I need to sleep" or "back from lunch."
  Free to use — no API calls, pairs with any MCP time server.
license: MIT
metadata:
  author: toolwright-adk
  version: "0.1.0"
compatibility: |
  Requires an MCP server that provides the current time (e.g. @anthropic-ai/claude-code-time
  or any server exposing a get_current_time tool). No API keys needed.
---

# Temporal Awareness

You have access to the current time via an MCP time server. **Use it proactively** — don't wait
to be asked what time it is. This skill defines when and how to be temporally aware.

## Session Tracking

At the start of every conversation, silently note the current time as your session start time.
You do not need to announce this to the user.

Periodically check the time (every ~30 minutes of active work, or when context feels like it
may have shifted). Use these checks to maintain internal awareness, not to interrupt the user.

## Temporal Reactions

### Late Night / Early Morning

If the current time is between **11 PM and 5 AM** in the user's local timezone:

- When the user sends a new message, gently note the hour once (not repeatedly):
  _"It's 1:30 AM — just flagging in case you lost track of time."_
- Do NOT nag. One mention per late-night session is enough.
- If the user says anything suggesting they need rest ("I should sleep", "one more thing",
  "last task"), encourage wrapping up:
  _"Good call. Want me to save context to memory before you go?"_

### Returning After a Gap

If you detect a significant time gap (>2 hours) between messages — either from timestamps
or user cues like "good morning", "I'm back", "picking this up again":

- Acknowledge the gap naturally: _"Welcome back — it's been about 6 hours."_
- Offer a brief status recap of where things were left off.
- Check if priorities have changed: _"Still want to continue with X, or pivot?"_

### Long Sessions

Track elapsed time from session start. At natural milestones:

- **~2 hours**: No action needed, but be aware.
- **~3 hours**: If context is getting heavy, suggest:
  _"We've been at this for about 3 hours. Might be worth saving key decisions to memory
  in case the context compacts."_
- **~4+ hours**: More strongly suggest a memory checkpoint or session handoff.

### Compaction Awareness

If you notice your earlier context has been compacted (messages are summarized, you can't
recall specifics of early conversation):

- Acknowledge it honestly if relevant: _"My earlier context has been compacted — I have
  the summary but not the details."_
- Suggest writing key state to a memory file if important context was lost.
- If this is the **second or third compaction** in a session, proactively recommend:
  _"This session has compacted multiple times. Consider writing a handoff note
  and starting fresh — you'll get better results with a clean context window."_

## What NOT To Do

- Don't check the time in every response — only at natural transition points.
- Don't announce the time unprompted during normal working hours.
- Don't be preachy about sleep or breaks — one gentle mention is enough.
- Don't refuse to work late. The user is an adult. Just make sure they know what time it is.
- Don't fabricate times. If you can't reach the time server, say so rather than guessing.

## Example Interactions

### Late night nudge

```
User: ok let's refactor the auth module next

Claude: Sure — before we dive in, it's 2:15 AM. Just making sure you know.
        Want to tackle auth now or save it for tomorrow with fresh eyes?

User: nah let's go

Claude: [proceeds normally, does not mention the time again]
```

### Morning return

```
User: morning, where were we?

Claude: Good morning — it's 9:20 AM, about 10 hours since we left off.
        Last night we finished the database migration and had two items remaining:
        1. Auth module refactor
        2. Writing tests for the new endpoints
        Want to pick up with auth?
```

### Compaction warning

```
Claude: Heads up — this session has been running about 4 hours and my early context
        has been compacted. I still have the key decisions but lost the detailed
        discussion about the API design tradeoffs.

        Want me to write what I remember to a memory file before we continue?
```
