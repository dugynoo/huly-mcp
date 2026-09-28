---
"@dugynoo/huly-mcp": minor
---

`list_comments` now includes thread replies. Each comment that has replies carries a `replies` array (oldest first) with `id`, `body`, `authorId` and timestamps. Previously replies under issue comments were not readable at all, because `list_thread_replies` only works for channel messages.
