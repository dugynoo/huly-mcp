/**
 * Effect schemas for Huly user presence (UserStatus).
 *
 * `core:class:UserStatus` is a read-mostly record of who is online — the
 * server flips `online: true` on websocket open and `online: false` on close.
 *
 * @module
 */
import { JSONSchema, Schema } from "effect"

import { NonEmptyString } from "./shared.js"

export const UserStatusIdSchema = NonEmptyString.pipe(Schema.brand("UserStatusId"))
export type UserStatusId = Schema.Schema.Type<typeof UserStatusIdSchema>

export const UserStatusSummarySchema = Schema.Struct({
  id: UserStatusIdSchema,
  user: NonEmptyString,
  online: Schema.Boolean,
  modifiedOn: Schema.Number
}).annotations({
  title: "UserStatusSummary",
  description: "Summary of a UserStatus record (presence/last-seen for one user)"
})
export type UserStatusSummary = Schema.Schema.Type<typeof UserStatusSummarySchema>

export const ListUserStatusesParamsSchema = Schema.Struct({
  online: Schema.optional(Schema.Boolean.annotations({
    description: "If set, returns only users matching this online flag (true = currently connected, false = offline)."
  })),
  user: Schema.optional(NonEmptyString.annotations({
    description: "Optional account UUID to look up presence for a single user."
  })),
  limit: Schema.optional(Schema.Number.annotations({
    description: "Maximum number of status records to return (default: 50)"
  }))
}).annotations({
  title: "ListUserStatusesParams",
  description: "Parameters for listing Huly user presence records"
})
export type ListUserStatusesParams = Schema.Schema.Type<typeof ListUserStatusesParamsSchema>

export const ListUserStatusesResultSchema = Schema.Struct({
  statuses: Schema.Array(UserStatusSummarySchema),
  total: Schema.NonNegativeInt
}).annotations({
  title: "ListUserStatusesResult",
  description: "Result of list_user_statuses"
})
export type ListUserStatusesResult = Schema.Schema.Type<typeof ListUserStatusesResultSchema>

export const listUserStatusesParamsJsonSchema = JSONSchema.make(ListUserStatusesParamsSchema)
export const parseListUserStatusesParams = Schema.decodeUnknown(ListUserStatusesParamsSchema)
