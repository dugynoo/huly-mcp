/**
 * Lead write operations: create_lead, update_lead.
 *
 * @module
 */
import { AvatarType, type Organization as HulyOrganization, type Person } from "@hcengineering/contact"
import type { AttachedDoc, Data, DocumentUpdate, MarkupBlobRef, Ref, Sequence, Status } from "@hcengineering/core"
import { generateId, SortingOrder } from "@hcengineering/core"
import { makeRank } from "@hcengineering/rank"
import { Effect, Schema } from "effect"

import type {
  CreateLeadParams,
  CreateLeadResult,
  UpdateLeadParams,
  UpdateLeadResult
} from "../../domain/schemas/leads.js"
import { FunnelIdentifier, FunnelReference, LeadIdentifier } from "../../domain/schemas/leads.js"
import { normalizeForComparison } from "../../utils/normalize.js"
import { HulyClient, type HulyClientError } from "../client.js"
import type { FunnelNotFoundError } from "../errors-leads.js"
import { LeadNotFoundError } from "../errors-leads.js"
import { HulyConnectionError, type InvalidStatusError, type PersonNotFoundError } from "../errors.js"
import { contact, core } from "../huly-plugins.js"
import { leadClassIds } from "../lead-plugin.js"
import { extractUpdatedSequence, resolveAssignee } from "./issues-write.js"
import { findFunnel, funnelAsSpace, getFunnelStatuses, type HulyLead, resolveStatusByName } from "./leads.js"
import { toRef } from "./sdk-boundary.js"

const toLeadIdentifier = Schema.decodeSync(LeadIdentifier)

interface HulyLeadData {
  title: string
  identifier: string
  number: number
  status: Ref<Status>
  assignee: Ref<Person> | null
  description: MarkupBlobRef | null
  kind: string
  startDate: number | null
  rank: string
  dueDate: number | null
  isDone: boolean
  parents: ReadonlyArray<never>
}

/**
 * Find a customer organization by (normalized) name, or create it with the
 * lead:mixin:Customer mixin. An existing organization without the mixin gets it applied.
 */
const findOrCreateCustomerOrganization = (
  client: HulyClient["Type"],
  customerName: string
): Effect.Effect<Ref<HulyOrganization>, HulyClientError> =>
  Effect.gen(function*() {
    const normalized = normalizeForComparison(customerName)
    const organizations = yield* client.findAll<HulyOrganization>(contact.class.Organization, {})
    const existing = organizations.find((org) => normalizeForComparison(org.name) === normalized)

    if (existing !== undefined) {
      // eslint-disable-next-line no-restricted-syntax -- SDK boundary: mixin check uses string key lookup
      const isCustomer = (existing as unknown as Record<string, unknown>)[leadClassIds.mixin.Customer] !== undefined
      if (!isCustomer) {
        yield* client.createMixin(
          existing._id,
          existing._class,
          existing.space,
          leadClassIds.mixin.Customer,
          CUSTOMER_MIXIN_DATA
        )
      }
      return existing._id
    }

    const orgId = generateId<HulyOrganization>()
    const orgData: Data<HulyOrganization> = {
      name: customerName,
      city: "",
      members: 0,
      description: null,
      avatarType: AvatarType.COLOR
    }
    yield* client.createDoc(contact.class.Organization, contact.space.Contacts, orgData, orgId)
    yield* client.createMixin(
      orgId,
      contact.class.Organization,
      contact.space.Contacts,
      leadClassIds.mixin.Customer,
      CUSTOMER_MIXIN_DATA
    )
    return orgId
  })

// Upstream Customer mixin attribute; the lead plugin types are not published.
// eslint-disable-next-line no-restricted-syntax, @typescript-eslint/consistent-type-assertions -- SDK boundary: mixin attributes of the unpublished lead plugin
const CUSTOMER_MIXIN_DATA = { customerDescription: null } as never

// Lead numbers come from one workspace-wide Sequence doc attached to the Lead class
// (upstream CreateLead.svelte, created by the lead migration).
const nextLeadNumber = (
  client: HulyClient["Type"]
): Effect.Effect<number, HulyClientError | HulyConnectionError> =>
  Effect.gen(function*() {
    const sequence = yield* client.findOne<Sequence>(
      core.class.Sequence,
      { attachedTo: leadClassIds.class.Lead }
    )
    if (sequence === undefined) {
      return yield* new HulyConnectionError({
        message: "Lead sequence document (core:class:Sequence for lead:class:Lead) not found in the workspace"
      })
    }
    const incResult = yield* client.updateDoc(
      core.class.Sequence,
      core.space.Model,
      sequence._id,
      { $inc: { sequence: 1 } },
      true
    )
    const updated = extractUpdatedSequence(incResult)
    if (updated === undefined) {
      return yield* new HulyConnectionError({ message: "Lead sequence increment returned no updated value" })
    }
    return updated
  })

type CreateLeadError =
  | HulyClientError
  | HulyConnectionError
  | FunnelNotFoundError
  | InvalidStatusError
  | PersonNotFoundError

/**
 * Create a lead in a funnel. The customer organization is looked up by name
 * and created (with the Customer mixin) when missing.
 */
export const createLead = (
  params: CreateLeadParams
): Effect.Effect<CreateLeadResult, CreateLeadError, HulyClient> =>
  Effect.gen(function*() {
    const client = yield* HulyClient
    const funnel = yield* findFunnel(client, params.funnel)
    const statuses = yield* getFunnelStatuses(client, funnel)

    // Status order follows the ProjectType, so the first entry is the default.
    const statusRef = params.status !== undefined
      ? yield* resolveStatusByName(statuses, params.status, params.funnel)
      : statuses[0]._id
    // Task type (kind) follows the funnel ProjectType: the one bound to the chosen status.
    const kind = statuses.find((status) => status._id === statusRef)?.taskType ?? leadClassIds.taskType.Lead

    const assigneeRef: Ref<Person> | null = params.assignee !== undefined
      ? (yield* resolveAssignee(client, params.assignee))._id
      : null

    const customerId = yield* findOrCreateCustomerOrganization(client, params.customer)

    const number = yield* nextLeadNumber(client)

    const leadId = generateId<HulyLead>()

    const lastLead = yield* client.findOne<HulyLead & { rank?: string }>(
      leadClassIds.class.Lead,
      { space: funnelAsSpace(funnel) },
      { sort: { rank: SortingOrder.Descending } }
    )
    const rank = makeRank(lastLead?.rank, undefined)

    const descriptionMarkupRef: MarkupBlobRef | null =
      params.description !== undefined && params.description.trim() !== ""
        ? yield* client.uploadMarkup(
          leadClassIds.class.Lead,
          leadId,
          "description",
          params.description,
          "markdown"
        )
        : null

    const identifier = `LEAD-${number}`
    const leadData: HulyLeadData = {
      title: params.title,
      identifier,
      number,
      status: statusRef,
      assignee: assigneeRef,
      description: descriptionMarkupRef,
      kind,
      startDate: null,
      rank,
      dueDate: null,
      isDone: false,
      parents: []
    }

    yield* client.addCollection(
      leadClassIds.class.Lead,
      funnelAsSpace(funnel),
      customerId,
      leadClassIds.mixin.Customer,
      "leads",
      // eslint-disable-next-line no-restricted-syntax -- SDK boundary: lead plugin types are not published, AttachedData cannot be derived
      leadData as never,
      toRef<HulyLead & AttachedDoc>(leadId)
    )

    return {
      identifier: toLeadIdentifier(identifier),
      id: leadId,
      funnelId: FunnelIdentifier.make(funnel._id)
    }
  })

type UpdateLeadError =
  | HulyClientError
  | HulyConnectionError
  | FunnelNotFoundError
  | LeadNotFoundError
  | InvalidStatusError
  | PersonNotFoundError

/**
 * Update a lead (status by name, title, markdown description, assignee).
 * Leads are looked up by identifier across funnels.
 */
export const updateLead = (
  params: UpdateLeadParams
): Effect.Effect<UpdateLeadResult, UpdateLeadError, HulyClient> =>
  Effect.gen(function*() {
    const client = yield* HulyClient

    const lead = yield* client.findOne<HulyLead>(
      leadClassIds.class.Lead,
      { identifier: params.lead }
    )
    if (lead === undefined) {
      return yield* new LeadNotFoundError({
        identifier: params.lead,
        funnel: FunnelIdentifier.make("(any)")
      })
    }

    const updateOps: DocumentUpdate<HulyLead> = {}
    let descriptionUpdatedInPlace = false

    if (params.title !== undefined) {
      updateOps.title = params.title
    }

    if (params.description !== undefined) {
      const text = params.description
      if (text.trim() === "") {
        updateOps.description = null
      } else {
        // Existing descriptions are rewritten in place, new ones get a fresh markup blob.
        const written = lead.description
          ? client.updateMarkup(leadClassIds.class.Lead, lead._id, "description", text, "markdown").pipe(
            Effect.as(undefined)
          )
          : client.uploadMarkup(leadClassIds.class.Lead, lead._id, "description", text, "markdown")
        const markupRef = yield* written
        descriptionUpdatedInPlace = markupRef === undefined
        if (markupRef !== undefined) updateOps.description = markupRef
      }
    }

    if (params.status !== undefined) {
      const funnel = yield* findFunnel(client, FunnelReference.make(lead.space))
      const statuses = yield* getFunnelStatuses(client, funnel)
      updateOps.status = yield* resolveStatusByName(statuses, params.status, funnel.name)
    }

    if (params.assignee !== undefined) {
      updateOps.assignee = params.assignee === null
        ? null
        : (yield* resolveAssignee(client, params.assignee))._id
    }

    if (Object.keys(updateOps).length === 0 && !descriptionUpdatedInPlace) {
      return { identifier: toLeadIdentifier(lead.identifier), updated: false }
    }

    if (Object.keys(updateOps).length > 0) {
      yield* client.updateDoc(leadClassIds.class.Lead, lead.space, lead._id, updateOps)
    }

    return { identifier: toLeadIdentifier(lead.identifier), updated: true }
  })
