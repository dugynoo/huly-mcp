import { describe, it } from "@effect/vitest"
import { Effect } from "effect"
import { expect } from "vitest"
import { leadTools } from "../../../src/mcp/tools/leads.js"

describe("Lead MCP Tools", () => {
  it.effect("registers list_funnels tool", () =>
    Effect.gen(function*() {
      const tool = leadTools.find(t => t.name === "list_funnels")
      expect(tool).toBeDefined()
      expect(tool?.category).toBe("leads")
      expect(tool?.description).toContain("funnel")
      expect(tool?.inputSchema).toBeDefined()
      expect(typeof tool?.handler).toBe("function")
    }))

  it.effect("registers list_leads tool", () =>
    Effect.gen(function*() {
      const tool = leadTools.find(t => t.name === "list_leads")
      expect(tool).toBeDefined()
      expect(tool?.category).toBe("leads")
      expect(tool?.description).toContain("lead")
      expect(tool?.inputSchema).toBeDefined()
      expect(typeof tool?.handler).toBe("function")
    }))

  it.effect("registers get_lead tool", () =>
    Effect.gen(function*() {
      const tool = leadTools.find(t => t.name === "get_lead")
      expect(tool).toBeDefined()
      expect(tool?.category).toBe("leads")
      expect(tool?.description).toContain("lead")
      expect(tool?.inputSchema).toBeDefined()
      expect(typeof tool?.handler).toBe("function")
    }))

  it.effect("registers create_lead with attachment guidance", () =>
    Effect.gen(function*() {
      const tool = leadTools.find(t => t.name === "create_lead")
      expect(tool).toBeDefined()
      expect(tool?.description).toContain("add_attachment")
      expect(tool?.description).toContain("lead:class:Lead")
    }))

  it.effect("registers update_lead tool", () =>
    Effect.gen(function*() {
      expect(leadTools.find(t => t.name === "update_lead")).toBeDefined()
    }))

  it.effect("has exactly 5 tools", () =>
    Effect.gen(function*() {
      expect(leadTools).toHaveLength(5)
    }))

  it.effect("all tools have unique names", () =>
    Effect.gen(function*() {
      const names = leadTools.map(t => t.name)
      expect(new Set(names).size).toBe(names.length)
    }))
})
