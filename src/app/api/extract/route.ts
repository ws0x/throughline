import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getDatabase, reports, users } from "@/lib/db"
import { extractThemesFromPdf } from "@/lib/pdf/extract"
import { eq, and } from "drizzle-orm"

export const dynamic = "force-dynamic"
// Allow up to 60s — PDF extraction can take 10–20s on first run
export const maxDuration = 60

/**
 * POST /api/extract
 * Body: { reportId: string }
 *
 * Fetches the stored PDF, extracts CliftonStrengths themes via Haiku 4.5,
 * validates against the canonical 34-theme list, and saves to the DB.
 *
 * Updates report status: pending → processing → complete | failed
 */
export async function POST(req: NextRequest) {
  /* ── Auth ── */
  const { userId: clerkUserId } = await auth()
  if (!clerkUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  /* ── Parse body ── */
  let reportId: string
  try {
    const body = await req.json()
    reportId = body?.reportId
    if (!reportId || typeof reportId !== "string") {
      throw new Error("Missing reportId")
    }
  } catch {
    return NextResponse.json(
      { error: "Request body must be JSON with a reportId field." },
      { status: 400 },
    )
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
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const reportRow = await db
      .select()
      .from(reports)
      .where(and(eq(reports.id, reportId), eq(reports.userId, userRow.id)))
      .limit(1)
      .then((rows) => rows[0])

    if (!reportRow) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 })
    }

    if (reportRow.status === "complete" && reportRow.themes) {
      // Already extracted — return cached result
      return NextResponse.json({ themes: reportRow.themes, cached: true })
    }

    /* ── Mark as processing ── */
    await db
      .update(reports)
      .set({ status: "processing" })
      .where(eq(reports.id, reportId))

    /* ── Fetch PDF from Vercel Blob ── */
    const pdfResponse = await fetch(reportRow.blobUrl)
    if (!pdfResponse.ok) {
      throw new Error(`Failed to fetch PDF from storage: ${pdfResponse.status}`)
    }
    const pdfBuffer = await pdfResponse.arrayBuffer()

    /* ── Extract themes ── */
    const start = Date.now()
    const result = await extractThemesFromPdf(pdfBuffer, reportRow.fileName)
    const elapsed = Date.now() - start

    if (!result.success) {
      // Mark as failed, surface error to client
      await db
        .update(reports)
        .set({ status: "failed" })
        .where(eq(reports.id, reportId))

      console.warn(`[extract] Failed for report ${reportId}: ${result.error}`)
      return NextResponse.json({ error: result.error }, { status: 422 })
    }

    /* ── Save themes to DB ── */
    await db
      .update(reports)
      .set({
        themes:      result.themes,
        status:      "processing", // stays processing until insights are generated
        processedAt: new Date(),
      })
      .where(eq(reports.id, reportId))

    console.log(
      `[extract] Report ${reportId}: extracted ${result.themes.length} themes in ${elapsed}ms`,
    )

    return NextResponse.json({
      themes:  result.themes,
      elapsed: elapsed,
      cached:  false,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`[extract] Unhandled error for report ${reportId}:`, message)

    // Try to mark as failed in DB
    try {
      const db = getDatabase()
      await db
        .update(reports)
        .set({ status: "failed" })
        .where(eq(reports.id, reportId))
    } catch {
      // Ignore secondary failure
    }

    return NextResponse.json(
      { error: "Extraction failed. Please try again." },
      { status: 500 },
    )
  }
}
