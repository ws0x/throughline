import { currentUser } from "@clerk/nextjs/server"
import { auth } from "@clerk/nextjs/server"
import { getDatabase, reports, users } from "@/lib/db"
import { eq, desc } from "drizzle-orm"
import Link from "next/link"
import UploadZone from "@/components/upload/upload-zone"
import { formatRelativeTime } from "@/lib/utils"

export const metadata = {
  title: "Dashboard",
}

async function getUserReports(clerkUserId: string) {
  try {
    const db = getDatabase()

    const userRow = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.clerkId, clerkUserId))
      .limit(1)
      .then((rows) => rows[0])

    if (!userRow) return []

    return db
      .select()
      .from(reports)
      .where(eq(reports.userId, userRow.id))
      .orderBy(desc(reports.uploadedAt))
      .limit(20)
  } catch {
    // Return empty array if DB isn't configured yet
    return []
  }
}

export default async function DashboardPage() {
  const [user, { userId: clerkUserId }] = await Promise.all([
    currentUser(),
    auth(),
  ])

  const existingReports = clerkUserId
    ? await getUserReports(clerkUserId)
    : []

  const firstName = user?.firstName ?? "there"

  return (
    <div className="max-w-5xl mx-auto px-6 sm:px-10 py-12">
      {/* Page header */}
      <div className="flex items-center justify-between mb-12">
        <Link
          href="/"
          className="font-display text-xl font-semibold text-foreground tracking-tight hover:opacity-80 transition-opacity"
        >
          Throughline
        </Link>
      </div>

      {/* Welcome + upload */}
      <div className="mb-16">
        <h1 className="font-display text-4xl sm:text-5xl font-semibold text-foreground mb-3 leading-tight">
          {existingReports.length === 0
            ? `Welcome, ${firstName}.`
            : `Your reports`}
        </h1>
        {existingReports.length === 0 && (
          <p className="text-muted-foreground text-lg mb-10 max-w-xl">
            Upload your CliftonStrengths 34 PDF to generate your personal
            operating manual — 13 sections of insight built on your exact
            themes.
          </p>
        )}

        {existingReports.length === 0 && (
          <div className="max-w-2xl">
            <UploadZone />
          </div>
        )}
      </div>

      {/* Existing reports */}
      {existingReports.length > 0 && (
        <div className="space-y-6">
          {/* Upload new */}
          <div className="max-w-2xl mb-10">
            <UploadZone />
          </div>

          <h2 className="font-display text-2xl font-semibold text-foreground mb-4">
            Previous reports
          </h2>

          <div className="grid sm:grid-cols-2 gap-4">
            {existingReports.map((report) => (
              <ReportCard key={report.id} report={report} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Report card ── */

type ReportRow = Awaited<ReturnType<typeof getUserReports>>[number]

function ReportCard({ report }: { report: ReportRow }) {
  const isReady = report.status === "complete"
  const isFailed = report.status === "failed"

  const statusLabel: Record<string, string> = {
    pending:    "Queued",
    processing: "Processing…",
    complete:   "Ready",
    failed:     "Failed",
  }

  const statusColor: Record<string, string> = {
    pending:    "text-muted-foreground",
    processing: "text-influencing",
    complete:   "text-relationship",
    failed:     "text-destructive",
  }

  const card = (
    <div
      className={`bg-card border border-border rounded-2xl p-5 transition-all duration-200 ${
        isReady
          ? "hover:border-accent/40 hover:shadow-sm cursor-pointer"
          : "cursor-default"
      }`}
    >
      {/* File name */}
      <p className="font-medium text-foreground text-sm mb-1 truncate">
        {report.fileName}
      </p>

      {/* Theme count */}
      {report.themes && (
        <p className="text-xs text-muted-foreground mb-3">
          {report.themes.length} themes extracted
        </p>
      )}

      {/* Footer row */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {formatRelativeTime(report.uploadedAt)}
        </span>
        <span className={`text-xs font-medium ${statusColor[report.status]}`}>
          {statusLabel[report.status]}
        </span>
      </div>

      {isFailed && (
        <p className="text-xs text-destructive mt-2">
          Upload again to retry.
        </p>
      )}
    </div>
  )

  if (isReady) {
    return (
      <Link href={`/report/${report.id}`} key={report.id}>
        {card}
      </Link>
    )
  }

  return card
}
