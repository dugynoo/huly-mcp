---
"@dugynoo/huly-mcp": minor
---

Add `taskType` parameter to `create_issue` and `update_issue` to support custom Huly task types (e.g., `"Ticket"`, `"Bug"`).

**Problem**: Issues created via MCP always used the default `tracker.taskTypes.Issue` kind, even in projects with custom task types. Statuses from custom task types would be accepted by the server but render as "Unknown" / fall back to "Backlog" in the Huly UI because the task type and status workflow did not match.

**Fix**: 
- New helper `resolveTaskTypeForProject` queries `task.class.TaskType` filtered by `parent: project.type` and resolves by name (case-insensitive) or ID, returning the task type plus its scoped statuses.
- `create_issue` accepts optional `taskType` and uses the resolved task type's `_id` for the `kind` field, with status candidates scoped to that task type's workflow.
- `update_issue` accepts optional `taskType` to switch an existing issue's task type; pass `status` alongside to set a status valid in the new workflow.
- Default behavior is unchanged when `taskType` is omitted.
