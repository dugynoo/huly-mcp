/**
 * Huly Process plugin operations (read-side).
 *
 * The @hcengineering/process npm package does not ship TypeScript declarations
 * at our SDK baseline (0.7.19) — see upstream issue hcengineering/platform#10881.
 * We use raw findAll/findOne with manually-defined class refs so we can talk
 * to a server running v0.7.423 (which has the full Process plugin live).
 *
 * @module
 */
import type { Class, Doc, Ref, Space } from "@hcengineering/core"
import { SortingOrder } from "@hcengineering/core"
import { Effect } from "effect"

import type {
  CancelExecutionParams,
  CancelExecutionResult,
  ExecutionStatus,
  GetProcessParams,
  ListExecutionsParams,
  ListExecutionsResult,
  ListProcessesParams,
  ListProcessesResult,
  ProcessSummary,
  StartProcessParams,
  StartProcessResult
} from "../../domain/schemas/processes.js"
import { ExecutionIdSchema, ProcessIdSchema } from "../../domain/schemas/processes.js"
import { normalizeForComparison } from "../../utils/normalize.js"
import { HulyClient, type HulyClientError } from "../client.js"
import { HulyError } from "../errors.js"
import { core } from "../huly-plugins.js"
import {
  type HulyExecution,
  type HulyProcess,
  type HulyState,
  processClassRef,
  refOf
} from "../types-extension/process.js"
import { clampLimit } from "./query-helpers.js"
import { toRef } from "./sdk-boundary.js"

type ProcessOpsError = HulyClientError | HulyError

const processClass: Ref<Class<HulyProcess>> = refOf<HulyProcess>(processClassRef.Process)
const executionClass: Ref<Class<HulyExecution>> = refOf<HulyExecution>(processClassRef.Execution)
const stateClass: Ref<Class<HulyState>> = refOf<HulyState>(processClassRef.State)

const toProcessSummary = (p: HulyProcess): ProcessSummary => ({
  id: ProcessIdSchema.make(p._id),
  name: p.name,
  description: p.description,
  masterTag: p.masterTag,
  autoStart: p.autoStart === true,
  automationOnly: p.automationOnly === true,
  parallelExecutionForbidden: p.parallelExecutionForbidden === true
})

const resolveProcess = (
  client: HulyClient["Type"],
  ref: string
): Effect.Effect<HulyProcess, ProcessOpsError> =>
  Effect.gen(function*() {
    const byId = yield* client.findOne<HulyProcess>(processClass, { _id: toRef<HulyProcess>(ref) })
    if (byId !== undefined) return byId

    const all = yield* client.findAll<HulyProcess>(processClass, {})
    const normalized = normalizeForComparison(ref)
    const matching = [...all].filter(p => normalizeForComparison(p.name) === normalized)
    if (matching.length === 1) return matching[0]
    if (matching.length === 0) {
      return yield* Effect.fail(new HulyError({ message: `Process '${ref}' not found.` }))
    }
    return yield* Effect.fail(
      new HulyError({
        message: `Process '${ref}' is ambiguous (${matching.length} matches). Pass the process ID instead.`
      })
    )
  })

export const listProcesses = (
  params: ListProcessesParams
): Effect.Effect<ListProcessesResult, ProcessOpsError, HulyClient> =>
  Effect.gen(function*() {
    const client = yield* HulyClient

    const query: Record<string, unknown> = params.masterTag !== undefined
      ? { masterTag: toRef<Doc>(params.masterTag) }
      : {}

    const limit = clampLimit(params.limit)
    const result = yield* client.findAll<HulyProcess>(
      processClass,
      query,
      { limit, sort: { name: SortingOrder.Ascending } }
    )
    const list = [...result]
    return {
      processes: list.map(toProcessSummary),
      total: list.length
    }
  })

export const getProcess = (
  params: GetProcessParams
): Effect.Effect<ProcessSummary, ProcessOpsError, HulyClient> =>
  Effect.gen(function*() {
    const client = yield* HulyClient
    const process = yield* resolveProcess(client, params.process)
    return toProcessSummary(process)
  })

export const listExecutions = (
  params: ListExecutionsParams
): Effect.Effect<ListExecutionsResult, ProcessOpsError, HulyClient> =>
  Effect.gen(function*() {
    const client = yield* HulyClient

    // Resolve `process` filter to an ID up-front so the executions query can be
    // a tight server-side filter instead of a client-side scan.
    const processFilter: Ref<HulyProcess> | undefined = params.process !== undefined
      ? (yield* resolveProcess(client, params.process))._id
      : undefined

    const query: Record<string, unknown> = {
      ...(processFilter !== undefined ? { process: processFilter } : {}),
      ...(params.card !== undefined ? { card: toRef<Doc>(params.card) } : {}),
      ...(params.status !== undefined ? { status: params.status satisfies ExecutionStatus } : {})
    }

    const limit = clampLimit(params.limit)
    const result = yield* client.findAll<HulyExecution>(
      executionClass,
      query,
      { limit }
    )
    const executions = [...result]

    // Best-effort enrich with process + state names. If either lookup fails,
    // we still return the execution rows with bare IDs.
    const processIds = Array.from(new Set(executions.map(e => e.process)))
    const stateIds = Array.from(new Set(executions.map(e => e.currentState)))

    const processList: ReadonlyArray<HulyProcess> = processIds.length > 0
      ? [...(yield* client.findAll<HulyProcess>(processClass, { _id: { $in: processIds } }))]
      : []
    const processNameById: ReadonlyMap<string, string> = new Map(
      processList.map(p => [p._id, p.name] as const)
    )

    const stateList: ReadonlyArray<HulyState> = stateIds.length > 0
      ? [...(yield* client.findAll<HulyState>(stateClass, { _id: { $in: stateIds } }))]
      : []
    const stateTitleById: ReadonlyMap<string, string> = new Map(
      stateList.map(s => [s._id, s.title] as const)
    )

    return {
      executions: executions.map(e => ({
        id: ExecutionIdSchema.make(e._id),
        processId: ProcessIdSchema.make(e.process),
        processName: processNameById.get(e.process) ?? "",
        cardId: e.card,
        status: e.status,
        currentStateId: e.currentState,
        currentStateTitle: stateTitleById.get(e.currentState),
        hasError: Array.isArray(e.error) && e.error.length > 0,
        ...(e.parentId !== undefined ? { parentExecutionId: ExecutionIdSchema.make(e.parentId) } : {})
      })),
      total: executions.length
    }
  })

export const startProcess = (
  params: StartProcessParams
): Effect.Effect<StartProcessResult, ProcessOpsError, HulyClient> =>
  Effect.gen(function*() {
    const client = yield* HulyClient
    const process = yield* resolveProcess(client, params.process)

    const firstState = yield* client.findOne<HulyState>(
      stateClass,
      { process: process._id },
      { sort: { rank: SortingOrder.Ascending } }
    )
    if (firstState === undefined) {
      return yield* Effect.fail(
        new HulyError({
          message: `Process '${process.name}' has no States defined. Configure a workflow before starting executions.`
        })
      )
    }

    // SDK boundary: HulyExecution is a shim mirroring the upstream Process
    // plugin interface (see types-extension/process.ts). Data<HulyExecution>
    // wants `context: ExecutionContext` (a branded record); we pass `{}`
    // because the server initialises the context map from the process
    // definition on trigger fire.
    // eslint-disable-next-line no-restricted-syntax -- SDK boundary cast for shim Data type
    const executionAttrs = {
      process: process._id,
      currentState: firstState._id,
      card: toRef<Doc>(params.card),
      rollback: [],
      context: {},
      status: "active"
    } as unknown as Parameters<typeof client.createDoc<HulyExecution>>[2]

    const executionId = yield* client.createDoc<HulyExecution>(
      executionClass,
      toRef<Space>(core.space.Workspace),
      executionAttrs
    )

    return {
      executionId: ExecutionIdSchema.make(executionId),
      processId: ProcessIdSchema.make(process._id),
      cardId: params.card,
      currentStateId: firstState._id,
      status: "active" satisfies ExecutionStatus
    }
  })

export const cancelExecution = (
  params: CancelExecutionParams
): Effect.Effect<CancelExecutionResult, ProcessOpsError, HulyClient> =>
  Effect.gen(function*() {
    const client = yield* HulyClient
    const execution = yield* client.findOne<HulyExecution>(executionClass, {
      _id: toRef<HulyExecution>(params.execution)
    })
    if (execution === undefined) {
      return yield* Effect.fail(
        new HulyError({ message: `Execution '${params.execution}' not found.` })
      )
    }
    if (execution.status === "cancelled") {
      return {
        executionId: ExecutionIdSchema.make(execution._id),
        status: "cancelled" satisfies ExecutionStatus,
        cancelled: false
      }
    }

    const updateOps: Parameters<typeof client.updateDoc<HulyExecution>>[3] = {
      status: "cancelled" satisfies HulyExecution["status"]
    }
    yield* client.updateDoc<HulyExecution>(
      executionClass,
      execution.space,
      execution._id,
      updateOps
    )

    return {
      executionId: ExecutionIdSchema.make(execution._id),
      status: "cancelled" satisfies ExecutionStatus,
      cancelled: true
    }
  })
