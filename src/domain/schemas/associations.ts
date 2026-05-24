/**
 * Effect schemas for Huly Association / Relation operations.
 *
 * Associations describe a typed link between two document classes (e.g.
 * "Person → Organization with role"). Relations are the actual instances
 * between concrete documents.
 *
 * @module
 */
import { JSONSchema, Schema } from "effect"

import { NonEmptyString } from "./shared.js"

export const AssociationTypeSchema = Schema.Literal("1:1", "1:N", "N:N").annotations({
  title: "AssociationType",
  description: "Cardinality of an Association"
})
export type AssociationType = Schema.Schema.Type<typeof AssociationTypeSchema>

export const AssociationIdSchema = NonEmptyString.pipe(Schema.brand("AssociationId"))
export type AssociationId = Schema.Schema.Type<typeof AssociationIdSchema>

export const RelationIdSchema = NonEmptyString.pipe(Schema.brand("RelationId"))
export type RelationId = Schema.Schema.Type<typeof RelationIdSchema>

export const AssociationSummarySchema = Schema.Struct({
  id: AssociationIdSchema,
  classA: NonEmptyString,
  classB: NonEmptyString,
  nameA: NonEmptyString,
  nameB: NonEmptyString,
  type: AssociationTypeSchema
}).annotations({
  title: "AssociationSummary",
  description: "Summary of an Association definition"
})
export type AssociationSummary = Schema.Schema.Type<typeof AssociationSummarySchema>

export const RelationSummarySchema = Schema.Struct({
  id: RelationIdSchema,
  associationId: AssociationIdSchema,
  docA: NonEmptyString,
  docB: NonEmptyString
}).annotations({
  title: "RelationSummary",
  description: "Summary of a Relation between two documents"
})
export type RelationSummary = Schema.Schema.Type<typeof RelationSummarySchema>

export const ListAssociationsParamsSchema = Schema.Struct({
  classA: Schema.optional(NonEmptyString.annotations({
    description: "Optional class ref (e.g. 'contact:class:Person') to filter associations whose A-side matches."
  })),
  classB: Schema.optional(NonEmptyString.annotations({
    description: "Optional class ref to filter associations whose B-side matches."
  })),
  limit: Schema.optional(Schema.Number.annotations({
    description: "Maximum number of associations to return (default: 50)"
  }))
}).annotations({
  title: "ListAssociationsParams",
  description: "Parameters for listing Huly Associations"
})
export type ListAssociationsParams = Schema.Schema.Type<typeof ListAssociationsParamsSchema>

export const CreateAssociationParamsSchema = Schema.Struct({
  classA: NonEmptyString.annotations({
    description: "Source class ref (e.g. 'contact:class:Person')"
  }),
  classB: NonEmptyString.annotations({
    description: "Target class ref (e.g. 'contact:class:Organization')"
  }),
  nameA: NonEmptyString.annotations({
    description: "Label shown for the link from a document of classA (e.g. 'works at')"
  }),
  nameB: NonEmptyString.annotations({
    description: "Label shown for the link from a document of classB (e.g. 'has employee')"
  }),
  type: AssociationTypeSchema.annotations({
    description: "Cardinality: 1:1 / 1:N / N:N"
  })
}).annotations({
  title: "CreateAssociationParams",
  description: "Parameters for creating a Huly Association"
})
export type CreateAssociationParams = Schema.Schema.Type<typeof CreateAssociationParamsSchema>

export const CreateAssociationResultSchema = Schema.Struct({
  associationId: AssociationIdSchema,
  classA: NonEmptyString,
  classB: NonEmptyString,
  created: Schema.Boolean
}).annotations({
  title: "CreateAssociationResult",
  description: "Result of create_association"
})
export type CreateAssociationResult = Schema.Schema.Type<typeof CreateAssociationResultSchema>

export const ListRelationsParamsSchema = Schema.Struct({
  association: Schema.optional(NonEmptyString.annotations({
    description: "Association ID to filter relations by"
  })),
  docA: Schema.optional(NonEmptyString.annotations({
    description: "Document ID on the A-side"
  })),
  docB: Schema.optional(NonEmptyString.annotations({
    description: "Document ID on the B-side"
  })),
  limit: Schema.optional(Schema.Number.annotations({
    description: "Maximum number of relations to return (default: 50)"
  }))
}).annotations({
  title: "ListRelationsParams",
  description: "Parameters for listing Huly Relations"
})
export type ListRelationsParams = Schema.Schema.Type<typeof ListRelationsParamsSchema>

export const CreateRelationParamsSchema = Schema.Struct({
  association: AssociationIdSchema.annotations({
    description: "Association ID this relation belongs to"
  }),
  docA: NonEmptyString.annotations({
    description: "Document ID on the A-side"
  }),
  docB: NonEmptyString.annotations({
    description: "Document ID on the B-side"
  })
}).annotations({
  title: "CreateRelationParams",
  description: "Parameters for linking two documents through an Association"
})
export type CreateRelationParams = Schema.Schema.Type<typeof CreateRelationParamsSchema>

export const CreateRelationResultSchema = Schema.Struct({
  relationId: RelationIdSchema,
  associationId: AssociationIdSchema,
  docA: NonEmptyString,
  docB: NonEmptyString,
  created: Schema.Boolean
}).annotations({
  title: "CreateRelationResult",
  description: "Result of create_relation"
})
export type CreateRelationResult = Schema.Schema.Type<typeof CreateRelationResultSchema>

export const DeleteRelationParamsSchema = Schema.Struct({
  relation: RelationIdSchema.annotations({
    description: "Relation ID to delete"
  })
}).annotations({
  title: "DeleteRelationParams",
  description: "Parameters for deleting a Relation"
})
export type DeleteRelationParams = Schema.Schema.Type<typeof DeleteRelationParamsSchema>

export const DeleteRelationResultSchema = Schema.Struct({
  relationId: RelationIdSchema,
  deleted: Schema.Boolean
}).annotations({
  title: "DeleteRelationResult",
  description: "Result of delete_relation"
})
export type DeleteRelationResult = Schema.Schema.Type<typeof DeleteRelationResultSchema>

export const ListAssociationsResultSchema = Schema.Struct({
  associations: Schema.Array(AssociationSummarySchema),
  total: Schema.NonNegativeInt
}).annotations({
  title: "ListAssociationsResult",
  description: "Result of list_associations"
})
export type ListAssociationsResult = Schema.Schema.Type<typeof ListAssociationsResultSchema>

export const ListRelationsResultSchema = Schema.Struct({
  relations: Schema.Array(RelationSummarySchema),
  total: Schema.NonNegativeInt
}).annotations({
  title: "ListRelationsResult",
  description: "Result of list_relations"
})
export type ListRelationsResult = Schema.Schema.Type<typeof ListRelationsResultSchema>

export const listAssociationsParamsJsonSchema = JSONSchema.make(ListAssociationsParamsSchema)
export const createAssociationParamsJsonSchema = JSONSchema.make(CreateAssociationParamsSchema)
export const listRelationsParamsJsonSchema = JSONSchema.make(ListRelationsParamsSchema)
export const createRelationParamsJsonSchema = JSONSchema.make(CreateRelationParamsSchema)
export const deleteRelationParamsJsonSchema = JSONSchema.make(DeleteRelationParamsSchema)

export const parseListAssociationsParams = Schema.decodeUnknown(ListAssociationsParamsSchema)
export const parseCreateAssociationParams = Schema.decodeUnknown(CreateAssociationParamsSchema)
export const parseListRelationsParams = Schema.decodeUnknown(ListRelationsParamsSchema)
export const parseCreateRelationParams = Schema.decodeUnknown(CreateRelationParamsSchema)
export const parseDeleteRelationParams = Schema.decodeUnknown(DeleteRelationParamsSchema)
