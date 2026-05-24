/**
 * MCP tool definitions for Huly user presence (UserStatus).
 *
 * @module
 */
import { listUserStatusesParamsJsonSchema, parseListUserStatusesParams } from "../../domain/schemas.js"
import { listUserStatuses } from "../../huly/operations/user-statuses.js"
import { createToolHandler, type RegisteredTool } from "./registry.js"

const CATEGORY = "user-statuses" as const

export const userStatusTools: ReadonlyArray<RegisteredTool> = [
  {
    name: "list_user_statuses",
    description:
      "List Huly user presence records — who is currently online, with their account UUID and last status change timestamp. Filter by `online` (true/false) or `user` (account UUID). Read-only; presence is maintained server-side based on websocket connection state.",
    category: CATEGORY,
    inputSchema: listUserStatusesParamsJsonSchema,
    handler: createToolHandler(
      "list_user_statuses",
      parseListUserStatusesParams,
      listUserStatuses
    )
  }
]
