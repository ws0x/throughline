import { NextRequest } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getDatabase, reports, users, insights } from "@/lib/db"
import { generateSection } from "@/lib/insights/generate"
import { eq, and } from "drizzle-orm"
import type { InsightSection } from "@/types"
import { SECTION_METADATA } from "@/types"
import type { SseEvent } from "@/lib/insights/schema"

export const dynamic = "force-dynamic"
// Allow 5 minutes — 14 parallel AI sections can take 60-90s total
export const maxDuration = 300

/** Ordered list of all 14 insight sections */
const ALL_SECTIONS: InsightSection[] = [
  // Tier 1 — Identity (read first)
  "core_identity",
  "signature_pattern",
  // Tier 2 — Acting
  "productivity_style",
  "decision_making",
  "daily_actions",
  "career_alignment",
  // Tier 3 — Others
  "communication_style",
  "collaboration_style",
  "leadership",
  "relationships",
  // Tier 4 — Mirror
  "blind_spots",
  "stress_patterns",
  "work_environment",
  "growth_opportunities",
]

/**
 * GET /api/generate?reportId=xxx
 *
 * Server-Sent Events (SSE) stream.
 * Generates all 14 insight sections in parallel and streams each one
 * to the client as it completes. Each section is also persisted to the DB.
 *
 * Events:
 *   progress  — { message, completed, total }
 *   section   — { section, content }
 *   error     — { section, error }
 *   complete  — { elapsed, total }
 */
export async function GET(req: NextRequest) {
  /* ── Auth ── */
  const { userId: clerkUserId } = await auth()
  if (!clerkUserId) {
    return new Response("Unauthorized", { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const reportId = searchParams.get("reportId")

  if (!reportId) {
    return new Response("reportId query param is required", { status: 400 })
  }

  /* ── SSE stream ── */
  const encoder = new TextEncoder()
  const start   = Date.now()
  let completedCount = 0

  function formatSSE(event: SseEvent): string {
    return `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`
  }

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: SseEvent) => {
        try {
          controller.enqueue(encoder.encode(formatSSE(event)))
        } catch {
          // Client disconnected — ignore enqueue errors
        }
      }

      try {
        const db = getDatabase()

        /* ── Verify report ownership ── */
        const userRow = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.clerkId, clerkUserId))
          .limit(1)
          .then((rows) => rows[0])

        if (!userRow) {
          send({ type: "error", section: "core_identity", error: "User not found" })
          controller.close()
          return
        }

        const reportRow = await db
          .select()
          .from(reports)
          .where(and(eq(reports.id, reportId), eq(reports.userId, userRow.id)))
          .limit(1)
          .then((rows) => rows[0])

        if (!reportRow) {
          send({ type: "error", section: "core_identity", error: "Report not found" })
          controller.close()
          return
        }

        if (!reportRow.themes || reportRow.themes.length < 5) {
          send({
            type: "error",
            section: "core_identity",
            error: "Report has not been extracted yet. Run /api/extract first.",
          })
          controller.close()
          return
        }

        /* ── Check for cached insights ── */
        const existingInsights = await db
          .select({ section: insights.section, content: insights.content })
          .from(insights)
          .where(eq(insights.reportId, reportId))

        const cachedSections = new Set(existingInsights.map((i) => i.section))

        // Stream cached sections immediately
        for (const existing of existingInsights) {
          send({
            type:    "section",
            section: existing.section as InsightSection,
            content: existing.content,
          })
          completedCount++
        }

        const sectionsToGenerate = ALL_SECTIONS.filter(
          (s) => !cachedSections.has(s),
        )

        if (sectionsToGenerate.length === 0) {
          // Everything cached — just complete
          send({
            type:    "complete",
            elapsed: Date.now() - start,
            total:   ALL_SECTIONS.length,
          })
          controller.close()
          return
        }

        send({
          type:      "progress",
          message:   `Generating ${sectionsToGenerate.length} sections…`,
          completed: completedCount,
          total:     ALL_SECTIONS.length,
        })

        const themes = reportRow.themes

        /* ── Generate all sections in parallel ── */
        await Promise.allSettled(
          sectionsToGenerate.map(async (section) => {
            const meta   = SECTION_METADATA[section]
            const result = await generateSection(section, themes)

            if (result.success) {
              // Persist to DB
              try {
                await db.insert(insights).values({
                  reportId,
                  section,
                  content: result.content,
                  model:   result.model,
                })
              } catch (dbError) {
                console.error(`[generate] Failed to save section "${section}":`, dbError)
              }

              completedCount++
              send({
                type:    "section",
                section,
                content: result.content,
              })

              console.log(
                `[generate] ✓ ${section} (${result.model}, ${result.tokens} tokens) ` +
                  `[${completedCount}/${ALL_SECTIONS.length}]`,
              )
            } else {
              send({
                type:    "error",
                section,
                error:   result.error,
              })
              console.warn(`[generate] ✗ ${section}: ${result.error}`)
            }

            // Progress update after each section
            send({
              type:      "progress",
              message:   `${meta.title} ${result.success ? "ready" : "failed"}`,
              completed: completedCount,
              total:     ALL_SECTIONS.length,
            })
          }),
        )

        /* ── Mark report as complete ── */
        if (completedCount >= ALL_SECTIONS.length * 0.8) {
          await db
            .update(reports)
            .set({ status: "complete" })
            .where(eq(reports.id, reportId))
        }

        send({
          type:    "complete",
          elapsed: Date.now() - start,
          total:   completedCount,
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        console.error("[generate] Stream error:", message)
        try {
          const send = (event: SseEvent) => {
            controller.enqueue(encoder.encode(formatSSE(event)))
          }
          send({ type: "error", section: "core_identity", error: message })
        } catch {
          // Ignore if controller already closed
        }
      } finally {
        try {
          controller.close()
        } catch {
          // Already closed
        }
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type":  "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection":    "keep-alive",
      "X-Accel-Buffering": "no", // Disable Nginx buffering on Vercel
    },
  })
}
