import {
  createWorkSlotParamsJsonSchema,
  CreateWorkSlotResultSchema,
  dedupPlannerTodosParamsJsonSchema,
  DedupPlannerTodosResultSchema,
  DetailedTimeReportSchema,
  getDetailedTimeReportParamsJsonSchema,
  getTimeReportParamsJsonSchema,
  listTimeSpendReportsParamsJsonSchema,
  ListTimeSpendReportsResultSchema,
  listWorkSlotsParamsJsonSchema,
  ListWorkSlotsResultSchema,
  logTimeParamsJsonSchema,
  LogTimeResultSchema,
  parseCreateWorkSlotParams,
  parseDedupPlannerTodosParams,
  parseGetDetailedTimeReportParams,
  parseGetTimeReportParams,
  parseListTimeSpendReportsParams,
  parseListWorkSlotsParams,
  parseLogTimeParams,
  parseStartTimerParams,
  parseStopTimerParams,
  startTimerParamsJsonSchema,
  StartTimerResultSchema,
  stopTimerParamsJsonSchema,
  StopTimerResultSchema,
  TimeReportSummarySchema
} from "../../domain/schemas.js"
import {
  createWorkSlot,
  dedupPlannerTodos,
  getDetailedTimeReport,
  getTimeReport,
  listTimeSpendReports,
  listWorkSlots,
  logTime,
  startTimer,
  stopTimer
} from "../../huly/operations/time.js"
import { createEncodedToolHandler, type RegisteredTool } from "./registry.js"

const CATEGORY = "time tracking" as const

export const timeTools: ReadonlyArray<RegisteredTool> = [
  {
    name: "log_time",
    description:
      "Log time spent on a Huly issue. Records a time entry with optional description. Time value is in minutes.",
    category: CATEGORY,
    inputSchema: logTimeParamsJsonSchema,
    handler: createEncodedToolHandler(
      "log_time",
      parseLogTimeParams,
      logTime,
      LogTimeResultSchema
    )
  },
  {
    name: "get_time_report",
    description:
      "Get time tracking report for a specific Huly issue. Shows total time, estimation, remaining time, and all time entries.",
    category: CATEGORY,
    inputSchema: getTimeReportParamsJsonSchema,
    handler: createEncodedToolHandler(
      "get_time_report",
      parseGetTimeReportParams,
      getTimeReport,
      TimeReportSummarySchema
    )
  },
  {
    name: "list_time_spend_reports",
    description:
      "List all time entries across issues. Supports filtering by project and date range. Returns entries sorted by date (newest first).",
    category: CATEGORY,
    inputSchema: listTimeSpendReportsParamsJsonSchema,
    handler: createEncodedToolHandler(
      "list_time_spend_reports",
      parseListTimeSpendReportsParams,
      listTimeSpendReports,
      ListTimeSpendReportsResultSchema
    )
  },
  {
    name: "get_detailed_time_report",
    description:
      "Get detailed time breakdown for a project. Shows total time grouped by issue and by employee. Supports date range filtering.",
    category: CATEGORY,
    inputSchema: getDetailedTimeReportParamsJsonSchema,
    handler: createEncodedToolHandler(
      "get_detailed_time_report",
      parseGetDetailedTimeReportParams,
      getDetailedTimeReport,
      DetailedTimeReportSchema
    )
  },
  {
    name: "list_work_slots",
    description:
      "List scheduled work slots. Shows planned time blocks attached to ToDos. Supports filtering by employee and date range.",
    category: CATEGORY,
    inputSchema: listWorkSlotsParamsJsonSchema,
    handler: createEncodedToolHandler(
      "list_work_slots",
      parseListWorkSlotsParams,
      listWorkSlots,
      ListWorkSlotsResultSchema
    )
  },
  {
    name: "create_work_slot",
    description: "Create a scheduled work slot. Attaches a time block to a ToDo for planning purposes.",
    category: CATEGORY,
    inputSchema: createWorkSlotParamsJsonSchema,
    handler: createEncodedToolHandler(
      "create_work_slot",
      parseCreateWorkSlotParams,
      createWorkSlot,
      CreateWorkSlotResultSchema
    )
  },
  {
    name: "start_timer",
    description:
      "Start a client-side timer on a Huly issue. Validates the issue exists and returns a start timestamp. Use log_time to record the elapsed time when done.",
    category: CATEGORY,
    inputSchema: startTimerParamsJsonSchema,
    handler: createEncodedToolHandler(
      "start_timer",
      parseStartTimerParams,
      startTimer,
      StartTimerResultSchema
    )
  },
  {
    name: "stop_timer",
    description:
      "Stop a client-side timer on a Huly issue. Returns the stop timestamp. Calculate elapsed time from start/stop timestamps and use log_time to record it.",
    category: CATEGORY,
    inputSchema: stopTimerParamsJsonSchema,
    handler: createEncodedToolHandler(
      "stop_timer",
      parseStopTimerParams,
      stopTimer,
      StopTimerResultSchema
    )
  },
  {
    name: "dedup_planner_todos",
    description: "Remove duplicate Planner ToDo items that the Huly server sometimes creates more than once per issue "
      + "(causing tickets to appear multiple times in Planner). Groups ToDos by issue and owner, keeps one per "
      + "group (preferring a scheduled, then not-done, then oldest entry) and removes the rest. Dry-run by default; "
      + "pass apply=true to actually delete. Optionally scope to a single project via the project parameter.",
    category: CATEGORY,
    inputSchema: dedupPlannerTodosParamsJsonSchema,
    handler: createEncodedToolHandler(
      "dedup_planner_todos",
      parseDedupPlannerTodosParams,
      dedupPlannerTodos,
      DedupPlannerTodosResultSchema
    )
  }
]
