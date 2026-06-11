import { Effect } from "effect"

import type { DedupPlannerTodosParams } from "../../domain/schemas.js"
import type { DedupPlannerTodosResult } from "../../domain/schemas/time.js"
import { HulyClient, type HulyClientError } from "../client.js"
import { time, tracker } from "../huly-plugins.js"
import { toRef } from "./sdk-boundary.js"

type DedupPlannerTodosError = HulyClientError

/* eslint-disable @typescript-eslint/consistent-type-imports -- inline type for generic */
type HulyProjectToDo = import("@hcengineering/time").ProjectToDo
type HulyTrackerIssue = import("@hcengineering/tracker").Issue
/* eslint-enable @typescript-eslint/consistent-type-imports */

/**
 * De-duplicate Planner ToDos.
 *
 * The Huly server occasionally creates more than one ProjectToDo per issue for the
 * same owner (an at-least-once trigger delivery / non-idempotent auto-todo), which
 * makes tickets appear multiple times in Planner. This groups ToDos by (issue, owner),
 * keeps a single one per group (preferring a scheduled slot > not-done > oldest) and
 * removes the rest via removeCollection. Dry-run unless `apply` is true.
 */
export const dedupPlannerTodos = (
  params: DedupPlannerTodosParams
): Effect.Effect<DedupPlannerTodosResult, DedupPlannerTodosError, HulyClient> =>
  Effect.gen(function*() {
    const client = yield* HulyClient

    const todos = yield* client.findAll<HulyProjectToDo>(time.class.ProjectToDo, {})

    // Group by (issue, owner): two ToDos with the same attachedTo + user are duplicates.
    const groups = new Map<string, Array<HulyProjectToDo>>()
    for (const todo of todos) {
      const key = `${todo.attachedTo}|${todo.user}`
      const existing = groups.get(key)
      if (existing === undefined) groups.set(key, [todo])
      else existing.push(todo)
    }

    // In each duplicate group keep one (workslots desc -> not-done -> oldest), delete the rest.
    const toDelete: Array<HulyProjectToDo> = []
    for (const arr of groups.values()) {
      if (arr.length <= 1) continue
      const sorted = [...arr].sort((a, b) => {
        if (a.workslots !== b.workslots) return b.workslots - a.workslots
        const aDone = a.doneOn != null ? 1 : 0
        const bDone = b.doneOn != null ? 1 : 0
        if (aDone !== bDone) return aDone - bDone
        return (a.createdOn ?? 0) - (b.createdOn ?? 0)
      })
      for (let i = 1; i < sorted.length; i++) toDelete.push(sorted[i])
    }

    // Resolve issue identifiers for the report (and optional project scoping).
    const issueIds = Array.from(new Set(toDelete.map((todo) => todo.attachedTo)))
      .map(toRef<HulyTrackerIssue>)
    const issues = issueIds.length > 0
      ? yield* client.findAll<HulyTrackerIssue>(tracker.class.Issue, { _id: { $in: issueIds } })
      : []
    const identifierById = new Map<string, string>(issues.map((issue) => [issue._id, issue.identifier]))

    const projectPrefix = params.project !== undefined ? `${params.project}-` : undefined
    const targets = projectPrefix === undefined
      ? toDelete
      : toDelete.filter((todo) => (identifierById.get(todo.attachedTo) ?? "").startsWith(projectPrefix))

    const apply = params.apply === true
    if (apply) {
      for (const todo of targets) {
        yield* client.removeCollection(
          time.class.ProjectToDo,
          todo.space,
          todo._id,
          todo.attachedTo,
          todo.attachedToClass,
          todo.collection
        )
      }
    }

    const affectedGroups = new Set(targets.map((todo) => `${todo.attachedTo}|${todo.user}`)).size

    return {
      applied: apply,
      totalTodos: todos.length,
      duplicateGroups: affectedGroups,
      removedCount: targets.length,
      removed: targets.map((todo) => ({
        issue: identifierById.get(todo.attachedTo),
        todoId: todo._id,
        done: todo.doneOn != null
      }))
    }
  })
