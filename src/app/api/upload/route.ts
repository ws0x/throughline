import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { put } from "@vercel/blob"
import { getDatabase, reports, users } from "@/lib/db"
import { eq } from "drizzle-orm"

export const dynamic = "force-dynamic"

const MAX_FILE_SIZE = 15 * 1024 * 1024  // 15 MB
const ALLOWED_TYPES = ["application/pdf"]

/**
 * POST /api/upload
 *
 * Accepts a PDF file, stores it in Vercel Blob, and creates
 * a report record in the database with status "pending".
 *
 * Returns: { reportId, blobUrl }
 */
export async function POST(req: NextRequest) {
  /* ── Auth ── */
  const { userId: clerkUserId } = await auth()
  if (!clerkUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  /* ── Parse form data ── */
  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 })
  }

  const file = formData.get("file")
  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { error: "No file provided. Send a 'file' field in FormData." },
      { status: 400 },
    )
  }

  /* ── Validate file ── */
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: `File must be a PDF. Received: ${file.type}` },
      { status: 422 },
    )
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: `File too large. Maximum size is 15 MB. Received: ${(file.size / 1024 / 1024).toFixed(1)} MB` },
      { status: 422 },
    )
  }

  if (file.size < 1024) {
    return NextResponse.json(
      { error: "File appears to be empty or corrupt." },
      { status: 422 },
    )
  }

  try {
    const db = getDatabase()

    /* ── Resolve internal user ID ── */
    let userRow = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.clerkId, clerkUserId))
      .limit(1)
      .then((rows) => rows[0])

    // Auto-create user row on first upload (webhook may not have fired yet)
    if (!userRow) {
      const inserted = await db
        .insert(users)
        .values({ clerkId: clerkUserId, email: "unknown@placeholder.com" })
        .returning({ id: users.id })
      userRow = inserted[0]
    }

    /* ── Upload to Vercel Blob ── */
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
    const blobPath = `reports/${userRow.id}/${Date.now()}_${safeName}`

    const blob = await put(blobPath, file, {
      access: "public",
      contentType: "application/pdf",
    })

    /* ── Create DB record ── */
    const [report] = await db
      .insert(reports)
      .values({
        userId:   userRow.id,
        fileName: file.name,
        blobUrl:  blob.url,
        status:   "pending",
      })
      .returning({ id: reports.id })

    console.log(`[upload] Created report ${report.id} for user ${userRow.id} — ${file.name} (${(file.size / 1024).toFixed(0)} KB)`)

    return NextResponse.json({
      reportId: report.id,
      blobUrl:  blob.url,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error("[upload] Failed:", message)

    return NextResponse.json(
      { error: "Upload failed. Please try again." },
      { status: 500 },
    )
  }
}
