/* eslint-disable import-x/no-unused-modules -- shim file: types are mirrored from upstream and exported for downstream extensions (transitions/triggers/logs) added incrementally; do not delete unused declarations */
/**
 * TypeScript interface definitions for the Huly Process plugin
 * (introduced server-side around v0.7.382, missing from the @hcengineering/process
 *  npm package because 0.7.411+ tarballs ship without .d.ts files — see upstream
 *  issue hcengineering/platform#10881).
 *
 * Mirrors the canonical definitions in
 *   github.com/hcengineering/platform/blob/v0.7.423/plugins/process/src/index.ts
 *
 * Scope: read-side only (Process, Execution, ExecutionLog, State, Transition, Trigger).
 * Mutating operations (run/cancel/transition) are reserved for a follow-up patch
 * once we map out the workflow methods (`process:method:*`) we want to expose.
 *
 * @module
 */
import type { Class, Doc, Ref, Tx } from "@hcengineering/core"

/**
 * Class reference strings as published by Huly's process plugin. These are the
 * runtime IDs we pass to client.findAll/findOne/createDoc. Server expects the
 * exact `process:class:<Name>` form.
 *
 * Source: plugins/process/src/index.ts → `plugin(processId, { class: { ... } })`
 */
export const processClassRef = {
  Process: "process:class:Process",
  Execution: "process:class:Execution",
  ExecutionLog: "process:class:ExecutionLog",
  State: "process:class:State",
  Transition: "process:class:Transition",
  Trigger: "process:class:Trigger",
  Method: "process:class:Method",
  ProcessFunction: "process:class:ProcessFunction",
  ProcessToDo: "process:class:ProcessToDo",
  ApproveRequest: "process:class:ApproveRequest",
  ProcessCustomEvent: "process:class:ProcessCustomEvent",
  EventButton: "process:class:EventButton",
  UpdateCriteriaComponent: "process:class:UpdateCriteriaComponent"
} as const

export type ProcessClassRef = (typeof processClassRef)[keyof typeof processClassRef]

/**
 * Execution lifecycle status. Matches the server-side enum.
 */
export type ExecutionStatus = "active" | "done" | "cancelled"

/**
 * Execution log entry action types.
 */
export type ExecutionLogAction = "started" | "transition" | "rollback"

/**
 * A Process is a workflow definition attached to a card class (masterTag).
 * Server source: `export interface Process extends Doc`.
 */
export interface HulyProcess extends Doc {
  /** The card class (master tag) this process operates on. */
  readonly masterTag: Ref<Doc>
  readonly name: string
  readonly description: string
  /**
   * When true, multiple concurrent executions of this process on the same card
   * are forbidden.
   */
  readonly parallelExecutionForbidden?: boolean
  /** Auto-start the process when a matching card is created. */
  readonly autoStart?: boolean
  /** Process can only be started via automation (not manually). */
  readonly automationOnly?: boolean
  /** Context variables tracked across execution steps. */
  readonly context: Record<string, unknown>
  readonly resultType?: unknown
}

/**
 * A live or completed run of a Process against a specific card.
 * Server source: `export interface Execution extends Doc`.
 */
export interface HulyExecution extends Doc {
  readonly process: Ref<HulyProcess>
  readonly currentState: Ref<HulyState>
  readonly card: Ref<Doc>
  /** Stack of transaction batches that can be undone via rollback. */
  readonly rollback: Array<Array<Tx>>
  readonly error?: ReadonlyArray<HulyExecutionError> | null
  readonly context: Record<string, unknown>
  readonly result?: unknown
  readonly parentId?: Ref<HulyExecution>
  readonly status: ExecutionStatus
}

export interface HulyExecutionError {
  readonly error: string
  readonly props: Record<string, unknown>
  readonly intlProps: Record<string, string>
  readonly transition: Ref<HulyTransition> | undefined
}

/**
 * Audit-trail entry attached to an Execution.
 * Server source: `export interface ExecutionLog extends Doc`.
 */
export interface HulyExecutionLog extends Doc {
  readonly execution: Ref<HulyExecution>
  readonly card: Ref<Doc>
  readonly process: Ref<HulyProcess>
  readonly transition?: Ref<HulyTransition>
  readonly action: ExecutionLogAction
}

/**
 * A workflow state within a Process.
 * Server source: `export interface State extends Doc`.
 */
export interface HulyState extends Doc {
  readonly process: Ref<HulyProcess>
  readonly title: string
  readonly rank: string
}

/**
 * Definition of a state-to-state transition with attached trigger and actions.
 * Server source: `export interface Transition extends Doc`.
 */
export interface HulyTransition extends Doc {
  readonly process: Ref<HulyProcess>
  readonly from: Ref<HulyState> | null
  readonly to: Ref<HulyState>
  readonly actions: ReadonlyArray<unknown>
  readonly trigger: Ref<HulyTrigger>
  readonly triggerParams: Record<string, unknown>
  readonly rank: string
}

/**
 * Trigger types that can fire a transition (manual, on-create, on-change, ...).
 * Server source: `export interface Trigger extends Doc`.
 */
export interface HulyTrigger extends Doc {
  readonly icon: string
  readonly label: string
  readonly requiredParams: ReadonlyArray<string>
  readonly init: boolean
  readonly auto?: boolean
}

/**
 * Typed helper: cast a string to a class ref for the Huly Doc subtype. Lets us
 * pass `processClassRef.Process` to generic CRUD primitives that expect
 * `Ref<Class<T>>`.
 *
 * SDK boundary: the @hcengineering/core SDK exposes `Ref<Class<T>>` as a
 * branded string but does not expose the brand constructor for class refs.
 * The double cast is the only way to pass our manually-mirrored ref strings
 * (e.g. "process:class:Process") through that typed slot. Confined to this
 * shim module — operations code never casts directly.
 */
// eslint-disable-next-line no-restricted-syntax -- SDK boundary cast; see jsdoc above
export const refOf = <T extends Doc>(classRef: string): Ref<Class<T>> => classRef as unknown as Ref<Class<T>>
