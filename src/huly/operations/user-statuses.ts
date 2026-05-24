/**
 * Huly user presence (UserStatus) operations.
 *
 * `core:class:UserStatus` ships in @hcengineering/core 0.7.19. Server writes
 * `online: true/false` based on websocket connection state; MCP exposes it
 * read-only as a presence check ("is this account currently connected?").
 *
 * @module
 */
import type { UserStatus } from "@hcengineering/core"
import { SortingOrder } from "@hcengineering/core"
import { Effect } from "effect"

import type {
  ListUserStatusesParams,
  ListUserStatusesResult,
  UserStatusSummary
} from "../../domain/schemas/user-statuses.js"
import { UserStatusIdSchema } from "../../domain/schemas/user-statuses.js"
import { HulyClient, type HulyClientError } from "../client.js"
import { core } from "../huly-plugins.js"
import { clampLimit } from "./query-helpers.js"

type UserStatusOpsError = HulyClientError

const toUserStatusSummary = (s: UserStatus): UserStatusSummary => ({
  id: UserStatusIdSchema.make(s._id),
  user: s.user,
  online: s.online === true,
  modifiedOn: s.modifiedOn
})

export const listUserStatuses = (
  params: ListUserStatusesParams
): Effect.Effect<ListUserStatusesResult, UserStatusOpsError, HulyClient> =>
  Effect.gen(function*() {
    const client = yield* HulyClient

    const query: Record<string, unknown> = {
      ...(params.online !== undefined ? { online: params.online } : {}),
      ...(params.user !== undefined ? { user: params.user } : {})
    }

    const limit = clampLimit(params.limit)
    const result = yield* client.findAll<UserStatus>(
      core.class.UserStatus,
      query,
      { limit, sort: { modifiedOn: SortingOrder.Descending } }
    )
    const list = [...result]
    return {
      statuses: list.map(toUserStatusSummary),
      total: list.length
    }
  })
