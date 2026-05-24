import type { DocumentQuery, Ref, Status, WithLookup } from "@hcengineering/core"
import type { ProjectType, TaskType } from "@hcengineering/task"
import type { Issue as HulyIssue, Project as HulyProject } from "@hcengineering/tracker"
import { IssuePriority } from "@hcengineering/tracker"
import { Effect } from "effect"

import type { IssuePriority as IssuePriorityStr } from "../../domain/schemas/issues.js"
import type { NonNegativeNumber } from "../../domain/schemas/shared.js"
import { PositiveNumber } from "../../domain/schemas/shared.js"
import { normalizeForComparison } from "../../utils/normalize.js"
import { HulyClient, type HulyClientError } from "../client.js"
import { HulyError, InvalidStatusError, IssueNotFoundError, ProjectNotFoundError } from "../errors.js"
import { core, task, tracker } from "../huly-plugins.js"
import { findOneOrFail } from "./query-helpers.js"

// Huly API uses 0 as sentinel for "not set" on numeric fields like estimation and remainingTime.
// Confirmed: creating an issue without estimation stores 0, not null/undefined.
// Converts sentinel 0 → undefined; positive values → branded PositiveNumber.
export const zeroAsUnset = (value: NonNegativeNumber): PositiveNumber | undefined =>
  value > 0 ? PositiveNumber.make(value) : undefined

type ProjectWithType = WithLookup<HulyProject> & {
  $lookup?: { type?: ProjectType }
}

export const findProject = (
  projectIdentifier: string
): Effect.Effect<
  { client: HulyClient["Type"]; project: HulyProject },
  ProjectNotFoundError | HulyClientError,
  HulyClient
> =>
  Effect.gen(function*() {
    const client = yield* HulyClient

    const project = yield* findOneOrFail(
      client,
      tracker.class.Project,
      { identifier: projectIdentifier } satisfies DocumentQuery<HulyProject>,
      () => new ProjectNotFoundError({ identifier: projectIdentifier })
    )

    return { client, project }
  })

export type StatusInfo = {
  _id: Ref<Status>
  name: string
  isDone: boolean
  isCanceled: boolean
}

/**
 * Find project with its ProjectType lookup to get status information.
 * This avoids querying IssueStatus directly which can fail on some workspaces.
 *
 * If Status query fails (known bug on some workspaces), falls back to using
 * status refs without resolved names.
 */
export const findProjectWithStatuses = (
  projectIdentifier: string
): Effect.Effect<
  {
    client: HulyClient["Type"]
    project: HulyProject
    statuses: Array<StatusInfo>
    defaultStatusId: Ref<Status> | undefined
  },
  ProjectNotFoundError | HulyClientError,
  HulyClient
> =>
  Effect.gen(function*() {
    const client = yield* HulyClient

    const project = yield* findOneOrFail<ProjectWithType, ProjectNotFoundError>(
      client,
      tracker.class.Project,
      { identifier: projectIdentifier } satisfies DocumentQuery<ProjectWithType>,
      () => new ProjectNotFoundError({ identifier: projectIdentifier }),
      { lookup: { type: task.class.ProjectType } }
    )

    const projectType = project.$lookup?.type
    const statuses: Array<StatusInfo> = []

    if (projectType?.statuses) {
      const statusRefs = projectType.statuses.map(s => s._id)
      if (statusRefs.length > 0) {
        // Try to query Status documents for names
        // On some workspaces this fails with deserialization errors
        const statusDocsResult = yield* Effect.either(
          client.findAll<Status>(
            core.class.Status,
            { _id: { $in: statusRefs } }
          )
        )

        if (statusDocsResult._tag === "Right") {
          for (const doc of statusDocsResult.right) {
            const categoryStr = doc.category ? doc.category : ""
            statuses.push({
              _id: doc._id,
              name: doc.name,
              isDone: categoryStr === task.statusCategory.Won,
              isCanceled: categoryStr === task.statusCategory.Lost
            })
          }
        } else {
          // Fallback: use refs without names if Status query fails
          // This allows operations to work even with malformed workspace data
          yield* Effect.logWarning(
            `Status query failed for project ${projectIdentifier}, using fallback. `
              + `Category-based filtering (open/done/canceled) will use name heuristics. `
              + `Error: ${statusDocsResult.left.message}`
          )
          for (const ps of projectType.statuses) {
            const name = ps._id.split(":").pop() ?? "Unknown"
            const nameLower = name.toLowerCase()
            const isDone = nameLower.includes("done")
              || nameLower.includes("complete")
              || nameLower.includes("finished")
              || nameLower.includes("resolved")
              || nameLower.includes("closed")
            const isCanceled = nameLower.includes("cancel")
              || nameLower.includes("reject")
              || nameLower.includes("abort")
              || nameLower.includes("wontfix")
              || nameLower.includes("invalid")
            statuses.push({
              _id: ps._id,
              name,
              isDone,
              isCanceled
            })
          }
        }
      }
    }

    // project.defaultIssueStatus is typed as required Ref<IssueStatus> in the SDK,
    // but is undefined or "" at runtime when no explicit default was chosen at project creation.
    const defaultStatusId: Ref<Status> | undefined = project.defaultIssueStatus || statuses[0]?._id

    return { client, project, statuses, defaultStatusId }
  })

export const parseIssueIdentifier = (
  identifier: string | number,
  projectIdentifier: string
): { fullIdentifier: string; number: number | null } => {
  const idStr = String(identifier).trim()

  const match = idStr.match(/^([A-Z]+)-(\d+)$/i)
  if (match) {
    return {
      fullIdentifier: `${match[1].toUpperCase()}-${match[2]}`,
      number: parseInt(match[2], 10)
    }
  }

  const numMatch = idStr.match(/^\d+$/)
  if (numMatch) {
    const num = parseInt(idStr, 10)
    return {
      fullIdentifier: `${projectIdentifier.toUpperCase()}-${num}`,
      number: num
    }
  }

  return { fullIdentifier: idStr, number: null }
}

export const findIssueInProject = (
  client: HulyClient["Type"],
  project: HulyProject,
  identifierStr: string
): Effect.Effect<HulyIssue, IssueNotFoundError | HulyClientError> =>
  Effect.gen(function*() {
    const { fullIdentifier, number } = parseIssueIdentifier(
      identifierStr,
      project.identifier
    )

    const issue = (yield* client.findOne<HulyIssue>(
      tracker.class.Issue,
      {
        space: project._id,
        identifier: fullIdentifier
      }
    )) ?? (number !== null
      ? yield* client.findOne<HulyIssue>(
        tracker.class.Issue,
        {
          space: project._id,
          number
        }
      )
      : undefined)
    if (issue === undefined) {
      return yield* new IssueNotFoundError({
        identifier: identifierStr,
        project: project.identifier
      })
    }

    return issue
  })

export const findProjectAndIssue = (
  params: { project: string; identifier: string }
): Effect.Effect<
  { client: HulyClient["Type"]; project: HulyProject; issue: HulyIssue },
  ProjectNotFoundError | IssueNotFoundError | HulyClientError,
  HulyClient
> =>
  Effect.gen(function*() {
    const { client, project } = yield* findProject(params.project)
    const issue = yield* findIssueInProject(client, project, params.identifier)
    return { client, project, issue }
  })

const priorityToStringMap = {
  [IssuePriority.Urgent]: "urgent",
  [IssuePriority.High]: "high",
  [IssuePriority.Medium]: "medium",
  [IssuePriority.Low]: "low",
  [IssuePriority.NoPriority]: "no-priority"
} as const satisfies Record<IssuePriority, IssuePriorityStr>

export const priorityToString = (priority: IssuePriority): IssuePriorityStr => priorityToStringMap[priority]

const stringToPriorityMap = {
  "urgent": IssuePriority.Urgent,
  "high": IssuePriority.High,
  "medium": IssuePriority.Medium,
  "low": IssuePriority.Low,
  "no-priority": IssuePriority.NoPriority
} as const satisfies Record<IssuePriorityStr, IssuePriority>

export const stringToPriority = (priority: IssuePriorityStr): IssuePriority => stringToPriorityMap[priority]

export const resolveStatusByName = (
  statuses: Array<StatusInfo>,
  statusName: string,
  project: string
): Effect.Effect<Ref<Status>, InvalidStatusError> => {
  const normalizedInput = normalizeForComparison(statusName)
  const matchingStatus = statuses.find(
    s => normalizeForComparison(s.name) === normalizedInput
  )
  if (matchingStatus === undefined) {
    return Effect.fail(new InvalidStatusError({ status: statusName, project }))
  }
  return Effect.succeed(matchingStatus._id)
}

/**
 * Resolve a task type within a project's project type by ID or display name,
 * and return its statuses (scoped to that task type) as StatusInfo[].
 *
 * Uses the project's `type: Ref<ProjectType>` field to scope the lookup, so
 * the same task type name in another project type will not match.
 *
 * Falls back to ref-derived names if `core.class.Status` query fails — same
 * fallback strategy as `findProjectWithStatuses`.
 */
export const resolveTaskTypeForProject = (
  client: HulyClient["Type"],
  project: HulyProject,
  taskTypeRef: string
): Effect.Effect<
  { taskType: TaskType; statuses: Array<StatusInfo> },
  HulyError | HulyClientError
> =>
  Effect.gen(function*() {
    const taskTypes = yield* client.findAll<TaskType>(
      task.class.TaskType,
      { parent: project.type }
    )

    const normalizedInput = normalizeForComparison(taskTypeRef)
    const matching = taskTypes.filter(tt =>
      tt._id === taskTypeRef
      || normalizeForComparison(tt.name) === normalizedInput
    )

    if (matching.length !== 1) {
      return yield* Effect.fail(
        new HulyError({
          message: matching.length === 0
            ? `Task type '${taskTypeRef}' not found in project '${project.identifier}'. `
              + `Available: ${taskTypes.map(t => t.name).join(", ") || "(none)"}.`
            : `Task type '${taskTypeRef}' is ambiguous in project '${project.identifier}'. `
              + `Pass the task type ID instead.`
        })
      )
    }

    const taskType = matching[0]
    const statusRefs = taskType.statuses

    const statuses: Array<StatusInfo> = []
    if (statusRefs.length > 0) {
      const statusDocsResult = yield* Effect.either(
        client.findAll<Status>(core.class.Status, { _id: { $in: [...statusRefs] } })
      )

      if (statusDocsResult._tag === "Right") {
        for (const doc of statusDocsResult.right) {
          const categoryStr = doc.category ? doc.category : ""
          statuses.push({
            _id: doc._id,
            name: doc.name,
            isDone: categoryStr === task.statusCategory.Won,
            isCanceled: categoryStr === task.statusCategory.Lost
          })
        }
      } else {
        // Fallback: use refs without resolved names if Status query fails
        for (const ref of statusRefs) {
          const name = ref.split(":").pop() ?? "Unknown"
          const nameLower = name.toLowerCase()
          statuses.push({
            _id: ref,
            name,
            isDone: nameLower.includes("done") || nameLower.includes("complete"),
            isCanceled: nameLower.includes("cancel")
          })
        }
      }
    }

    return { taskType, statuses }
  })
