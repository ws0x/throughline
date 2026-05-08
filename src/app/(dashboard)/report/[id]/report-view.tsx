"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Link from "next/link"
import { motion } from "motion/react"
import { useInsightStream } from "@/hooks/use-insight-stream"
import { InsightCard, InsightCardSkeleton } from "@/components/insights/insight-card"
import { NavRail } from "@/components/insights/nav-rail"
import { DomainWheel } from "@/components/insights/domain-wheel"
import { ActionPlan } from "@/components/insights/action-plan"
import { ErrorBoundary } from "@/components/ui/error-boundary"
import type { InsightSection, ThemeEntry, ReportStatus } from "@/types"
import { DOMAIN_COLORS } from "@/types"
import type { InsightContentInput } from "@/lib/insights/schema"
import { cn } from "@/lib/utils"

const TOTAL_SECTIONS = 14

const SECTIONS_BY_TIER: Record<number, InsightSection[]> = {
  1: ["core_identity", "signature_pattern"],
  2: ["productivity_style", "decision_making", "daily_actions", "career_alignment"],
  3: ["communication_style", "collaboration_style", "leadership", "relationships"],
  4: ["blind_spots", "stress_patterns", "work_environment", "growth_opportunities"],
}

const TIER_LABELS: Record<number, string> = {
  1: "Identity",
  2: "Acting",
  3: "With others",
  4: "Self-aware",
}

type ReportViewProps = {
  reportId:        string
  fileName:        string
  themes:          ThemeEntry[]
  initialInsights: Partial<Record<InsightSection, InsightContentInput>>
  reportStatus:    ReportStatus
}

export default function ReportView({
  reportId,
  fileName,
  themes,
  initialInsights,
}: ReportViewProps) {
  const { insights, status, progress, error } = useInsightStream(reportId, initialInsights)

  const [activeSection, setActiveSection] = useState<InsightSection | "actions">(
    "core_identity",
  )
  const sectionRefs  = useRef<Map<InsightSection, HTMLElement>>(new Map())
  const isScrolling  = useRef(false)
  const top5         = themes.slice(0, 5)

  /* ── IntersectionObserver: track which section is in view ── */
  useEffect(() => {
    if (activeSection === "actions") return

    const observer = new IntersectionObserver(
      (entries) => {
        if (isScrolling.current) return
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible.length > 0) {
          const sec = visible[0].target.getAttribute("data-section") as InsightSection | null
          if (sec) setActiveSection(sec)
        }
      },
      { rootMargin: "-15% 0px -70% 0px", threshold: 0 },
    )

    sectionRefs.current.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [insights, activeSection])

  /* ── NavRail click handler ── */
  const handleSectionClick = useCallback(
    (section: InsightSection | "actions") => {
      setActiveSection(section)
      if (section === "actions") {
        window.scrollTo({ top: 0, behavior: "smooth" })
        return
      }
      const el = document.getElementById(`section-${section}`)
      if (el) {
        isScrolling.current = true
        el.scrollIntoView({ behavior: "smooth", block: "start" })
        setTimeout(() => { isScrolling.current = false }, 1000)
      }
    },
    [],
  )

  /* ── Helpers ── */
  const registerRef = useCallback(
    (section: InsightSection) => (el: HTMLElement | null) => {
      if (el) sectionRefs.current.set(section, el)
      else    sectionRefs.current.delete(section)
    },
    [],
  )

  return (
    <div className="min-h-screen bg-background">
      {/* ── Top nav ── */}
      <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border px-6 sm:px-10 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link
            href="/"
            className="font-display text-lg font-semibold text-foreground tracking-tight hover:opacity-80 transition-opacity"
          >
            Throughline
          </Link>
          <div className="flex items-center gap-4">
            <p className="text-xs text-muted-foreground hidden sm:block truncate max-w-48">
              {fileName}
            </p>
            <Link
              href="/dashboard"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Dashboard
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Body: NavRail + main ── */}
      <div className="max-w-6xl mx-auto px-6 sm:px-10 py-10 lg:flex lg:gap-10 lg:items-start pb-24 lg:pb-10">

        {/* NavRail — desktop only, sticky */}
        <aside className="hidden lg:block w-52 flex-shrink-0">
          <div className="sticky top-24">
            <NavRail
              insights={insights}
              activeSection={activeSection}
              onSectionClick={handleSectionClick}
              totalSections={TOTAL_SECTIONS}
            />
          </div>
        </aside>

        {/* Main content column */}
        <main className="flex-1 min-w-0">

          {/* ── Hero card: profile + DomainWheel ── */}
          <div className="mb-10 p-7 bg-card border border-border rounded-2xl">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Strengths Profile
                </p>
                {top5[0] && (
                  <h1 className="font-display text-2xl sm:text-3xl font-semibold text-foreground mb-4 leading-tight">
                    {top5[0].name}
                    {top5[1] && (
                      <span className="text-muted-foreground/60"> · {top5[1].name}</span>
                    )}
                  </h1>
                )}
                <div className="flex flex-wrap gap-2">
                  {top5.map((theme) => (
                    <span
                      key={theme.name}
                      className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border"
                      style={{
                        borderColor:     `${DOMAIN_COLORS[theme.domain]}40`,
                        color:            DOMAIN_COLORS[theme.domain],
                        backgroundColor: `${DOMAIN_COLORS[theme.domain]}10`,
                      }}
                    >
                      <span className="font-mono text-[10px] opacity-70">#{theme.rank}</span>
                      {theme.name}
                    </span>
                  ))}
                  {themes.length > 5 && (
                    <span className="text-xs text-muted-foreground px-2.5 py-1">
                      +{themes.length - 5} more
                    </span>
                  )}
                </div>
              </div>

              {themes.length > 0 && (
                <div className="flex-shrink-0">
                  <DomainWheel themes={themes} size={160} />
                </div>
              )}
            </div>
          </div>

          {/* ── Streaming progress bar ── */}
          {(status === "streaming" || status === "connecting") && (
            <div className="mb-8">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                <span>{progress.message || "Generating your insights…"}</span>
                <span>{progress.completed}/{progress.total}</span>
              </div>
              <div className="h-1 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-accent rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.round((progress.completed / progress.total) * 100)}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              </div>
            </div>
          )}

          {/* ── Error banner ── */}
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* ── Action Plan view ── */}
          {activeSection === "actions" ? (
            <ActionPlan insights={insights} />
          ) : (
            /* ── Tier sections ── */
            [1, 2, 3, 4].map((tier) => {
              const sections = SECTIONS_BY_TIER[tier]
              const hasAny   = sections.some((s) => insights[s])

              if (!hasAny && status === "complete") return null

              return (
                <section key={tier} className="mb-12">
                  <div className="flex items-center gap-3 mb-5">
                    <h2 className="font-display text-lg font-semibold text-foreground">
                      {TIER_LABELS[tier]}
                    </h2>
                    <div className="flex-1 h-px bg-border" />
                  </div>

                  <div
                    className={cn(
                      "grid gap-5",
                      tier === 1 ? "grid-cols-1" : "sm:grid-cols-2",
                    )}
                  >
                    {sections.map((section, idx) => {
                      const content = insights[section]

                      if (!content) {
                        if (status === "streaming" || status === "connecting") {
                          return <InsightCardSkeleton key={section} />
                        }
                        return null
                      }

                      return (
                        <div
                          key={section}
                          id={`section-${section}`}
                          data-section={section}
                          ref={registerRef(section)}
                        >
                          <ErrorBoundary section={section}>
                            <InsightCard
                              section={section}
                              content={content}
                              variant={tier === 1 ? "hero" : "standard"}
                              index={idx}
                            />
                          </ErrorBoundary>
                        </div>
                      )
                    })}
                  </div>
                </section>
              )
            })
          )}

          {/* ── Complete footer ── */}
          {status === "complete" && activeSection !== "actions" && (
            <div className="text-center py-8 border-t border-border mt-4">
              <p className="text-sm text-muted-foreground mb-4">
                All {progress.completed} sections ready
              </p>
              <div className="flex items-center justify-center gap-3">
                <a
                  href={`/api/export/${reportId}?format=pdf`}
                  className="text-sm font-medium text-foreground bg-muted border border-border px-4 py-2 rounded-lg hover:bg-muted/80 transition-colors"
                >
                  Export PDF
                </a>
                <a
                  href={`/api/export/${reportId}?format=markdown`}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Export Markdown
                </a>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ── Mobile bottom tab bar ── */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur border-t border-border">
        <div className="flex items-stretch overflow-x-auto scrollbar-none">
          {([1, 2, 3, 4] as const).map((tier) => {
            const firstSection = SECTIONS_BY_TIER[tier][0]
            const isActive     = SECTIONS_BY_TIER[tier].includes(
              activeSection as InsightSection,
            )
            return (
              <button
                key={tier}
                onClick={() => handleSectionClick(firstSection)}
                className={cn(
                  "flex-1 min-w-0 py-3 px-2 text-center transition-colors",
                  isActive ? "text-foreground" : "text-muted-foreground",
                )}
              >
                <span className="text-[11px] font-medium block truncate">
                  {TIER_LABELS[tier]}
                </span>
              </button>
            )
          })}
          <button
            onClick={() => handleSectionClick("actions")}
            className={cn(
              "flex-1 min-w-0 py-3 px-2 text-center transition-colors",
              activeSection === "actions" ? "text-foreground" : "text-muted-foreground",
            )}
          >
            <span className="text-[11px] font-medium block truncate">Actions</span>
          </button>
        </div>
      </div>
    </div>
  )
}
