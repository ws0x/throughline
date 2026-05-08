import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { Webhook } from "svix"
import { getDatabase, users } from "@/lib/db"
import { eq } from "drizzle-orm"

export const dynamic = "force-dynamic"

type ClerkUserEvent = {
  type: "user.created" | "user.updated" | "user.deleted"
  data: {
    id: string
    email_addresses: Array<{ email_address: string; id: string }>
    primary_email_address_id: string
  }
}

/**
 * POST /api/webhooks/clerk
 *
 * Syncs Clerk user events (created/updated/deleted) into our DB.
 * Configure this URL in Clerk Dashboard → Webhooks.
 * Set CLERK_WEBHOOK_SECRET in .env.local.
 */
export async function POST(req: NextRequest) {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error("[webhook/clerk] CLERK_WEBHOOK_SECRET is not set")
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 })
  }

  /* ── Verify Svix signature ── */
  const headerPayload = await headers()
  const svixId        = headerPayload.get("svix-id")
  const svixTimestamp = headerPayload.get("svix-timestamp")
  const svixSignature = headerPayload.get("svix-signature")

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json(
      { error: "Missing Svix headers" },
      { status: 400 },
    )
  }

  const body = await req.text()

  let event: ClerkUserEvent
  try {
    const wh = new Webhook(webhookSecret)
    event = wh.verify(body, {
      "svix-id":        svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ClerkUserEvent
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }

  /* ── Handle events ── */
  const db = getDatabase()
  const { type, data } = event

  try {
    if (type === "user.created") {
      const primaryEmail = data.email_addresses.find(
        (e) => e.id === data.primary_email_address_id,
      )?.email_address ?? ""

      await db.insert(users).values({
        clerkId: data.id,
        email:   primaryEmail,
      }).onConflictDoNothing()

      console.log(`[webhook/clerk] Created user ${data.id} (${primaryEmail})`)
    }

    if (type === "user.updated") {
      const primaryEmail = data.email_addresses.find(
        (e) => e.id === data.primary_email_address_id,
      )?.email_address ?? ""

      await db
        .update(users)
        .set({ email: primaryEmail })
        .where(eq(users.clerkId, data.id))

      console.log(`[webhook/clerk] Updated user ${data.id}`)
    }

    if (type === "user.deleted") {
      // Cascade deletes reports + insights via FK constraints
      await db.delete(users).where(eq(users.clerkId, data.id))
      console.log(`[webhook/clerk] Deleted user ${data.id}`)
    }
  } catch (error) {
    console.error(`[webhook/clerk] DB error for ${type}:`, error)
    return NextResponse.json({ error: "DB operation failed" }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
