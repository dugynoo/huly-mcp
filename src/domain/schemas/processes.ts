/**
 * Effect schemas for the Huly Process plugin MCP operations.
 *
 * Process classes are not bundled in @hcengineering/process@0.7.19 (our
 * baseline SDK version), so the operations layer uses raw findAll/findOne
 * with hand-rolled class refs (see `src/huly/types-extension/process.ts`).
 *
 * @module
 */
import { JSONSchema, Schema } from "effect"

import { NonEmptyString } from "./shared.js"

/**
 * Execution lifecycle status as exposed via MCP. Maps 1-to-1 to server enum
 * (ExecutionStatus = 'active' | 'done' | 'cancelled').
 */
export const ExecutionStatusSchema = Schema.Literal("active", "done", "cancelled").annotations({
  title: "ExecutionStatus",
  description: "Process execution lifecycle status"
})
export type ExecutionStatus = Schema.Schema.Type<typeof ExecutionStatusSchema>

export const ProcessIdSchema = NonEmptyString.pipe(Schema.brand("ProcessId"))
export type ProcessId = Schema.Schema.Type<typeof ProcessIdSchema>

export const ExecutionIdSchema = NonEmptyString.pipe(Schema.brand("ExecutionId"))
export type ExecutionId = Schema.Schema.Type<typeof ExecutionIdSchema>

export const ProcessSummarySchema = Schema.Struct({
  id: ProcessIdSchema,
  name: NonEmptyString,
  description: Schema.String,
  masterTag: NonEmptyString,
  autoStart: Schema.Boolean,
  automationOnly: Schema.Boolean,
  parallelExecutionForbidden: Schema.Boolean
}).annotations({
  title: "ProcessSummary",
  description: "Summary of a Huly Process definition"
})
export type ProcessSummary = Schema.Schema.Type<typeof ProcessSummarySchema>

export const ExecutionSummarySchema = Schema.Struct({
  id: ExecutionIdSchema,
  processId: ProcessIdSchema,
  processName: Schema.String,
  cardId: NonEmptyString,
  cardTitle: Schema.optional(Schema.String),
  status: ExecutionStatusSchema,
  currentStateId: Schema.optional(NonEmptyString),
  currentStateTitle: Schema.optional(Schema.String),
  hasError: Schema.Boolean,
  parentExecutionId: Schema.optional(ExecutionIdSchema)
}).annotations({
  title: "ExecutionSummary",
  description: "Summary of a Process execution against a card"
})
export type ExecutionSummary = Schema.Schema.Type<typeof ExecutionSummarySchema>

export const ListProcessesParamsSchema = Schema.Struct({
  masterTag: Schema.optional(NonEmptyString.annotations({
    description:
      "Optional master tag ref (e.g. 'card:masterTag:Ticket') to filter processes by the card class they operate on."
  })),
  limit: Schema.optional(Schema.Number.annotations({
    description: "Maximum number of processes to return (default: 50)"
  }))
}).annotations({
  title: "ListProcessesParams",
  description: "Parameters for listing Huly processes"
})
export type ListProcessesParams = Schema.Schema.Type<typeof ListProcessesParamsSchema>

export const GetProcessParamsSchema = Schema.Struct({
  process: NonEmptyString.annotations({
    description: "Process ID or display name"
  })
}).annotations({
  title: "GetProcessParams",
  description: "Parameters for fetching a single Huly process by ID or name"
})
export type GetProcessParams = Schema.Schema.Type<typeof GetProcessParamsSchema>

export const ListExecutionsParamsSchema = Schema.Struct({
  process: Schema.optional(NonEmptyString.annotations({
    description: "Filter by process ID or display name"
  })),
  card: Schema.optional(NonEmptyString.annotations({
    description: "Filter by card ID"
  })),
  status: Schema.optional(ExecutionStatusSchema.annotations({
    description: "Filter by execution status (active, done, cancelled)"
  })),
  limit: Schema.optional(Schema.Number.annotations({
    description: "Maximum number of executions to return (default: 50)"
  }))
}).annotations({
  title: "ListExecutionsParams",
  description: "Parameters for listing Huly process executions"
})
export type ListExecutionsParams = Schema.Schema.Type<typeof ListExecutionsParamsSchema>

export const ListProcessesResultSchema = Schema.Struct({
  processes: Schema.Array(ProcessSummarySchema),
  total: Schema.NonNegativeInt
}).annotations({
  title: "ListProcessesResult",
  description: "Result of list_processes"
})
export type ListProcessesResult = Schema.Schema.Type<typeof ListProcessesResultSchema>

export const ListExecutionsResultSchema = Schema.Struct({
  executions: Schema.Array(ExecutionSummarySchema),
  total: Schema.NonNegativeInt
}).annotations({
  title: "ListExecutionsResult",
  description: "Result of list_executions"
})
export type ListExecutionsResult = Schema.Schema.Type<typeof ListExecutionsResultSchema>

export const listProcessesParamsJsonSchema = JSONSchema.make(ListProcessesParamsSchema)
export const getProcessParamsJsonSchema = JSONSchema.make(GetProcessParamsSchema)
export const listExecutionsParamsJsonSchema = JSONSchema.make(ListExecutionsParamsSchema)

export const parseListProcessesParams = Schema.decodeUnknown(ListProcessesParamsSchema)
export const parseGetProcessParams = Schema.decodeUnknown(GetProcessParamsSchema)
export const parseListExecutionsParams = Schema.decodeUnknown(ListExecutionsParamsSchema)
