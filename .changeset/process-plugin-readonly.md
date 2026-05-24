---
"@dugynoo/huly-mcp": minor
---

Add read-side support for the Huly **Process** plugin (server-side feature in v0.7.382+, missing from baseline `@hcengineering/process` package).

**New tools**
- `list_processes` — enumerate workflow definitions in the workspace, optionally filter by master tag.
- `get_process` — fetch a single process by ID or display name.
- `list_executions` — enumerate live or completed workflow runs against cards, filterable by process / card / status.

**Implementation**

Class refs (`process:class:Process`, `process:class:Execution`, `process:class:State`) are defined in `src/huly/types-extension/process.ts`, mirroring the canonical definitions from `hcengineering/platform@v0.7.423`. Generic `findAll`/`findOne` primitives in the 0.7.19 SDK pass the refs through to the server, which is already running the newer schema.

**Why this layout**

The `@hcengineering/*` packages on npm currently ship without TypeScript declarations (see upstream issue [hcengineering/platform#10881](https://github.com/hcengineering/platform/issues/10881)). Pinning to 0.7.19 keeps the rest of the codebase type-safe; manual declarations are added per-plugin as needed until upstream re-publishes with `types/`.

Write-side process operations (`run_process`, `transition`, `cancel_execution`) are intentionally deferred until the workflow-method invocation surface is mapped out.
