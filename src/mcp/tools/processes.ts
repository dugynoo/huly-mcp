/**
 * MCP tool definitions for the Huly Process plugin (read-side).
 *
 * @module
 */
import {
  getProcessParamsJsonSchema,
  listExecutionsParamsJsonSchema,
  listProcessesParamsJsonSchema,
  parseGetProcessParams,
  parseListExecutionsParams,
  parseListProcessesParams
} from "../../domain/schemas.js"
import { getProcess, listExecutions, listProcesses } from "../../huly/operations/processes.js"
import { createToolHandler, type RegisteredTool } from "./registry.js"

const CATEGORY = "processes" as const

export const processTools: ReadonlyArray<RegisteredTool> = [
  {
    name: "list_processes",
    description:
      "List Huly Process definitions in the workspace. Each Process is a workflow attached to a card class (master tag). Optionally filter by `masterTag` to find processes for a specific card type. Read-only.",
    category: CATEGORY,
    inputSchema: listProcessesParamsJsonSchema,
    handler: createToolHandler(
      "list_processes",
      parseListProcessesParams,
      listProcesses
    )
  },
  {
    name: "get_process",
    description:
      "Fetch a single Huly Process definition by ID or display name. Returns name, description, master tag, and start/automation flags. Read-only.",
    category: CATEGORY,
    inputSchema: getProcessParamsJsonSchema,
    handler: createToolHandler(
      "get_process",
      parseGetProcessParams,
      getProcess
    )
  },
  {
    name: "list_executions",
    description:
      "List Process Executions — live or completed workflow runs against specific cards. Filter by `process` (ID or name), `card` (card ID), or `status` (active/done/cancelled). Each execution row includes the current workflow state and an error flag. Read-only.",
    category: CATEGORY,
    inputSchema: listExecutionsParamsJsonSchema,
    handler: createToolHandler(
      "list_executions",
      parseListExecutionsParams,
      listExecutions
    )
  }
]
