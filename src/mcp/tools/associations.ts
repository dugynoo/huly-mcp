/**
 * MCP tool definitions for Huly Associations / Relations.
 *
 * @module
 */
import {
  createAssociationParamsJsonSchema,
  createRelationParamsJsonSchema,
  deleteRelationParamsJsonSchema,
  listAssociationsParamsJsonSchema,
  listRelationsParamsJsonSchema,
  parseCreateAssociationParams,
  parseCreateRelationParams,
  parseDeleteRelationParams,
  parseListAssociationsParams,
  parseListRelationsParams
} from "../../domain/schemas.js"
import {
  createAssociation,
  createRelation,
  deleteRelation,
  listAssociations,
  listRelations
} from "../../huly/operations/associations.js"
import { createToolHandler, type RegisteredTool } from "./registry.js"

const CATEGORY = "associations" as const

export const associationTools: ReadonlyArray<RegisteredTool> = [
  {
    name: "list_associations",
    description:
      "List Huly Association definitions in the workspace. Each Association is a typed link between two document classes (e.g. Person ↔ Organization with cardinality 1:1 / 1:N / N:N). Filter by `classA` or `classB`.",
    category: CATEGORY,
    inputSchema: listAssociationsParamsJsonSchema,
    handler: createToolHandler(
      "list_associations",
      parseListAssociationsParams,
      listAssociations
    )
  },
  {
    name: "create_association",
    description:
      "Create a new Huly Association between two document classes. Idempotent: returns existing association if one already exists with the same (classA, classB, nameA, nameB) tuple.",
    category: CATEGORY,
    inputSchema: createAssociationParamsJsonSchema,
    handler: createToolHandler(
      "create_association",
      parseCreateAssociationParams,
      createAssociation
    )
  },
  {
    name: "list_relations",
    description:
      "List Huly Relations — concrete links between documents. Filter by `association` (ID), `docA` (source document ID), or `docB` (target document ID).",
    category: CATEGORY,
    inputSchema: listRelationsParamsJsonSchema,
    handler: createToolHandler(
      "list_relations",
      parseListRelationsParams,
      listRelations
    )
  },
  {
    name: "create_relation",
    description:
      "Link two documents through an existing Association. Idempotent: returns existing relation if one already connects (docA, docB) via the same association.",
    category: CATEGORY,
    inputSchema: createRelationParamsJsonSchema,
    handler: createToolHandler(
      "create_relation",
      parseCreateRelationParams,
      createRelation
    )
  },
  {
    name: "delete_relation",
    description:
      "Remove a Relation between two documents. Idempotent: returns deleted=false if the relation no longer exists.",
    category: CATEGORY,
    inputSchema: deleteRelationParamsJsonSchema,
    handler: createToolHandler(
      "delete_relation",
      parseDeleteRelationParams,
      deleteRelation
    )
  }
]
