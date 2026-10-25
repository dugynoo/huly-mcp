import {
  createLeadParamsJsonSchema,
  getLeadParamsJsonSchema,
  listFunnelsParamsJsonSchema,
  listLeadsParamsJsonSchema,
  parseCreateLeadParams,
  parseGetLeadParams,
  parseListFunnelsParams,
  parseListLeadsParams,
  parseUpdateLeadParams,
  updateLeadParamsJsonSchema
} from "../../domain/schemas/leads.js"
import { createLead, updateLead } from "../../huly/operations/leads-write.js"
import { getLead, listFunnels, listLeads } from "../../huly/operations/leads.js"
import { createToolHandler, type RegisteredTool } from "./registry.js"

const CATEGORY = "leads" as const

export const leadTools: ReadonlyArray<RegisteredTool> = [
  {
    name: "list_funnels",
    description:
      "List all Huly sales funnels (lead pipelines). Returns each funnel's stable ID and display name, sorted by name. Supports filtering by archived status.",
    category: CATEGORY,
    inputSchema: listFunnelsParamsJsonSchema,
    handler: createToolHandler(
      "list_funnels",
      parseListFunnelsParams,
      listFunnels
    )
  },
  {
    name: "list_leads",
    description:
      "Query Huly leads in a funnel with optional filters. Pass the funnel ID returned by list_funnels, or a funnel name for convenience lookup. Returns leads sorted by modification date (newest first). Supports filtering by status, assignee, and title search.",
    category: CATEGORY,
    inputSchema: listLeadsParamsJsonSchema,
    handler: createToolHandler(
      "list_leads",
      parseListLeadsParams,
      listLeads
    )
  },
  {
    name: "get_lead",
    description:
      "Retrieve full details for a Huly lead including markdown description, customer name, funnel ID and funnel name, and status. Lead identifiers follow the upstream Huly format like 'LEAD-1'.",
    category: CATEGORY,
    inputSchema: getLeadParamsJsonSchema,
    handler: createToolHandler(
      "get_lead",
      parseGetLeadParams,
      getLead
    )
  },
  {
    name: "create_lead",
    description:
      "Create a lead in a Huly funnel. 'customer' is an organization name: an existing organization with a matching name is reused, otherwise a new one is created with the Customer mixin. Optional markdown description, initial status name and assignee. Returns the LEAD-N identifier, the lead id and the funnel id. To attach files, use add_attachment with objectClass 'lead:class:Lead', objectId set to the returned id and space set to the returned funnelId.",
    category: CATEGORY,
    inputSchema: createLeadParamsJsonSchema,
    handler: createToolHandler(
      "create_lead",
      parseCreateLeadParams,
      createLead
    )
  },
  {
    name: "update_lead",
    description:
      "Update a Huly lead identified by LEAD-N. Updates only provided fields: status (by name), title, markdown description, assignee (email or name, null to unassign).",
    category: CATEGORY,
    inputSchema: updateLeadParamsJsonSchema,
    handler: createToolHandler(
      "update_lead",
      parseUpdateLeadParams,
      updateLead
    )
  }
]
