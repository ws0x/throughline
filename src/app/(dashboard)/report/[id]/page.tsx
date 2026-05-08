import { auth } from "@clerk/nextjs/server"
import { notFound, redirect } from "next/navigation"
import { getDatabase, reports, users, insights } from "@/lib/db"
import { eq, and } from "drizzle-orm"
import type { InsightSection } from "@/types"
import type { InsightContentInput } from "@/lib/insights/schema"
import ReportView from "./report-view"

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  return { title: "Your Strengths Report" }
}

async function getReportData(reportId: string, clerkUserId: string) {
  const db = getDatabase()

  const userRow = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkId, clerkUserId))
    .limit(1)
    .then((rows) => rows[0])

  if (!userRow) return null

  const reportRow = await db
    .select()
    .from(reports)
    .where(and(eq(reports.id, reportId), eq(reports.userId, userRow.id)))
    .limit(1)
    .then((rows) => rows[0])

  if (!reportRow) return null

  const existingInsights = await db
    .select({ section: insights.section, content: insights.content })
    .from(insights)
    .where(eq(insights.reportId, reportId))

  const insightMap: Partial<Record<InsightSection, InsightContentInput>> = {}
  for (const row of existingInsights) {
    insightMap[row.section as InsightSection] = row.content as InsightContentInput
  }

  return {
    report:     reportRow,
    insightMap,
  }
}

export default async function ReportPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { userId: clerkUserId } = await auth()

  if (!clerkUserId) redirect("/sign-in")

  let data
  try {
    data = await getReportData(id, clerkUserId)
  } catch {
    // DB not configured yet — show empty state
    data = null
  }

  if (!data) notFound()

  const { report, insightMap } = data

  // If extraction hasn't happened yet, redirect to dashboard
  if (report.status === "pending" || (!report.themes && report.status !== "processing")) {
    redirect("/dashboard")
  }

  return (
    <ReportView
      reportId={id}
      fileName={report.fileName}
      themes={report.themes ?? []}
      initialInsights={insightMap}
      reportStatus={report.status}
    />
  )
}
