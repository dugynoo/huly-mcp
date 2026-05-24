/**
 * Huly Association / Relation operations.
 *
 * Associations are class-level link definitions (e.g. "Person ←→ Organization");
 * Relations are per-document instances of that link. Both live under
 * `core:class:Association` / `core:class:Relation` (shipped with @hcengineering/core 0.7.19).
 *
 * @module
 */
import type { Association, Class, Doc, Relation, Space } from "@hcengineering/core"
import { Effect } from "effect"

import type {
  AssociationSummary,
  CreateAssociationParams,
  CreateAssociationResult,
  CreateRelationParams,
  CreateRelationResult,
  DeleteRelationParams,
  DeleteRelationResult,
  ListAssociationsParams,
  ListAssociationsResult,
  ListRelationsParams,
  ListRelationsResult,
  RelationSummary
} from "../../domain/schemas/associations.js"
import { AssociationIdSchema, RelationIdSchema } from "../../domain/schemas/associations.js"
import { HulyClient, type HulyClientError } from "../client.js"
import { HulyError } from "../errors.js"
import { core } from "../huly-plugins.js"
import { clampLimit } from "./query-helpers.js"
import { toRef } from "./sdk-boundary.js"

type AssociationOpsError = HulyClientError | HulyError

const toAssociationSummary = (a: Association): AssociationSummary => ({
  id: AssociationIdSchema.make(a._id),
  classA: a.classA,
  classB: a.classB,
  nameA: a.nameA,
  nameB: a.nameB,
  type: a.type
})

const toRelationSummary = (r: Relation): RelationSummary => ({
  id: RelationIdSchema.make(r._id),
  associationId: AssociationIdSchema.make(r.association),
  docA: r.docA,
  docB: r.docB
})

export const listAssociations = (
  params: ListAssociationsParams
): Effect.Effect<ListAssociationsResult, AssociationOpsError, HulyClient> =>
  Effect.gen(function*() {
    const client = yield* HulyClient

    const query: Record<string, unknown> = {
      ...(params.classA !== undefined ? { classA: toRef<Class<Doc>>(params.classA) } : {}),
      ...(params.classB !== undefined ? { classB: toRef<Class<Doc>>(params.classB) } : {})
    }

    const limit = clampLimit(params.limit)
    const result = yield* client.findAll<Association>(core.class.Association, query, { limit })
    const list = [...result]
    return {
      associations: list.map(toAssociationSummary),
      total: list.length
    }
  })

export const createAssociation = (
  params: CreateAssociationParams
): Effect.Effect<CreateAssociationResult, AssociationOpsError, HulyClient> =>
  Effect.gen(function*() {
    const client = yield* HulyClient

    const existing = yield* client.findOne<Association>(core.class.Association, {
      classA: toRef<Class<Doc>>(params.classA),
      classB: toRef<Class<Doc>>(params.classB),
      nameA: params.nameA,
      nameB: params.nameB
    })
    if (existing !== undefined) {
      return {
        associationId: AssociationIdSchema.make(existing._id),
        classA: existing.classA,
        classB: existing.classB,
        created: false
      }
    }

    const associationId = yield* client.createDoc<Association>(
      core.class.Association,
      toRef<Space>(core.space.Model),
      {
        classA: toRef<Class<Doc>>(params.classA),
        classB: toRef<Class<Doc>>(params.classB),
        nameA: params.nameA,
        nameB: params.nameB,
        type: params.type
      }
    )

    return {
      associationId: AssociationIdSchema.make(associationId),
      classA: params.classA,
      classB: params.classB,
      created: true
    }
  })

export const listRelations = (
  params: ListRelationsParams
): Effect.Effect<ListRelationsResult, AssociationOpsError, HulyClient> =>
  Effect.gen(function*() {
    const client = yield* HulyClient

    const query: Record<string, unknown> = {
      ...(params.association !== undefined ? { association: toRef<Association>(params.association) } : {}),
      ...(params.docA !== undefined ? { docA: toRef<Doc>(params.docA) } : {}),
      ...(params.docB !== undefined ? { docB: toRef<Doc>(params.docB) } : {})
    }

    const limit = clampLimit(params.limit)
    const result = yield* client.findAll<Relation>(core.class.Relation, query, { limit })
    const list = [...result]
    return {
      relations: list.map(toRelationSummary),
      total: list.length
    }
  })

export const createRelation = (
  params: CreateRelationParams
): Effect.Effect<CreateRelationResult, AssociationOpsError, HulyClient> =>
  Effect.gen(function*() {
    const client = yield* HulyClient

    const association = yield* client.findOne<Association>(core.class.Association, {
      _id: toRef<Association>(params.association)
    })
    if (association === undefined) {
      return yield* Effect.fail(
        new HulyError({ message: `Association '${params.association}' not found.` })
      )
    }

    const existing = yield* client.findOne<Relation>(core.class.Relation, {
      association: association._id,
      docA: toRef<Doc>(params.docA),
      docB: toRef<Doc>(params.docB)
    })
    if (existing !== undefined) {
      return {
        relationId: RelationIdSchema.make(existing._id),
        associationId: AssociationIdSchema.make(association._id),
        docA: existing.docA,
        docB: existing.docB,
        created: false
      }
    }

    const relationId = yield* client.createDoc<Relation>(
      core.class.Relation,
      toRef<Space>(core.space.Workspace),
      {
        association: association._id,
        docA: toRef<Doc>(params.docA),
        docB: toRef<Doc>(params.docB)
      }
    )

    return {
      relationId: RelationIdSchema.make(relationId),
      associationId: AssociationIdSchema.make(association._id),
      docA: params.docA,
      docB: params.docB,
      created: true
    }
  })

export const deleteRelation = (
  params: DeleteRelationParams
): Effect.Effect<DeleteRelationResult, AssociationOpsError, HulyClient> =>
  Effect.gen(function*() {
    const client = yield* HulyClient

    const existing = yield* client.findOne<Relation>(core.class.Relation, {
      _id: toRef<Relation>(params.relation)
    })
    if (existing === undefined) {
      return {
        relationId: RelationIdSchema.make(params.relation),
        deleted: false
      }
    }

    yield* client.removeDoc<Relation>(core.class.Relation, existing.space, existing._id)
    return {
      relationId: RelationIdSchema.make(existing._id),
      deleted: true
    }
  })
