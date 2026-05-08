import { z } from "zod"
import type { InsightSection } from "@/types"

/* ── InsightAction ── */

export const InsightActionSchema = z.object({
  when: z.enum(["today", "this_week", "this_quarter"]),
  text: z.string().min(10).max(300),
  why:  z.string().min(2).max(100), // name of the driving theme
})

/* ── InsightContent ── */

export const InsightContentSchema = z.object({
  headline:     z.string().min(5).max(120),   // ≤12 words, declarative
  summary:      z.string().min(50).max(600),   // 2–3 sentences
  evidence:     z.array(z.string().min(20).max(400)).min(2).max(6),
  actions:      z.array(InsightActionSchema).min(3).max(5),
  watchOutFor:  z.string().min(20).max(300).optional(),
})

export type InsightContentInput = z.infer<typeof InsightContentSchema>
export type InsightActionInput  = z.infer<typeof InsightActionSchema>

/* ── SSE event types ── */

export type SseEvent =
  | {
      type: "section"
      section: InsightSection
      content: InsightContentInput
    }
  | {
      type: "error"
      section: InsightSection
      error:   string
    }
  | {
      type: "progress"
      message: string
      completed: number
      total:     number
    }
  | {
      type:    "complete"
      elapsed: number
      total:   number
    }
