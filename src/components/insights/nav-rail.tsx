"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import type { InsightSection } from "@/types"
import { SECTION_METADATA, DOMAIN_COLORS } from "@/types"
import type { InsightMap } from "@/hooks/use-insight-stream"

const SECTIONS_IN_ORDER: InsightSection[] = [
  "core_identity", "signature_pattern",
  "productivity_style", "decision_making", "daily_actions", "career_alignment",
  "communication_style", "collaboration_style", "leadership", "relationships",
  "blind_spots", "stress_patterns", "work_environment", "growth_opportunities",
]

const TIER_LABELS: Record<number, string> = {
  1: "Identity",
  2: "Acting",
  3: "With others",
  4: "Self-awareness",
}

const TIER_COLORS: Record<number, string> = {
  1: DOMAIN_COLORS.strategic,
  2: DOMAIN_COLORS.executing,
  3: DOMAIN_COLORS.relationship,
  4: DOMAIN_COLORS.influencing,
}

type NavRailProps = {
  insights:        InsightMap
  activeSection?:  InsightSection | "actions"
  onSectionClick:  (section: InsightSection | "actions") => void
  totalSections:   number
  className?:      string
}

export function NavRail({
  insights,
  activeSection,
  onSectionClick,
  totalSections,
  className,
}: NavRailProps) {
  const completedCount = Object.keys(insights).length
  const progressPct    = Math.round((completedCount / totalSections) * 100)

  // Group sections by tier
  const tiers = [1, 2, 3, 4]

  return (
    <nav
      className={cn(
        "flex flex-col gap-1 text-sm select-none",
        className,
      )}
      aria-label="Report sections"
    >
      {/* Progress summary */}
      <div className="px-3 pb-4 border-b border-border mb-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
          <span>Sections</span>
          <span className="font-medium text-foreground">
            {completedCount}/{totalSections}
          </span>
        </div>
        <div className="h-1 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-accent rounded-full transition-all duration-700"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {tiers.map((tier) => {
        const tierSections = SECTIONS_IN_ORDER.filter(
          (s) => SECTION_METADATA[s].tier === tier,
        )

        return (
          <div key={tier} className="mb-3">
            <p
              className="text-[10px] font-semibold uppercase tracking-wider px-3 mb-1"
              style={{ color: TIER_COLORS[tier] }}
            >
              {TIER_LABELS[tier]}
            </p>
            {tierSections.map((section) => {
              const meta      = SECTION_METADATA[section]
              const isReady   = !!insights[section]
              const isActive  = activeSection === section

              return (
                <button
                  key={section}
                  onClick={() => onSectionClick(section)}
                  className={cn(
                    "w-full text-left px-3 py-1.5 rounded-lg flex items-center gap-2.5 transition-colors duration-150",
                    isActive
                      ? "bg-muted text-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
                  )}
                  aria-current={isActive ? "true" : undefined}
                >
                  {/* Status dot */}
                  <span
                    className={cn(
                      "w-1.5 h-1.5 rounded-full flex-shrink-0 transition-colors duration-300",
                      isReady ? "opacity-100" : "opacity-25",
                    )}
                    style={{
                      backgroundColor: isReady ? TIER_COLORS[tier] : "#6B6B6B",
                    }}
                  />
                  <span className="truncate text-xs leading-relaxed">
                    {meta.title}
                  </span>
                </button>
              )
            })}
          </div>
        )
      })}

      {/* Action plan entry */}
      <div className="mt-1 pt-3 border-t border-border">
        <button
          onClick={() => onSectionClick("actions")}
          className={cn(
            "w-full text-left px-3 py-1.5 rounded-lg flex items-center gap-2.5 transition-colors duration-150",
            activeSection === "actions"
              ? "bg-muted text-foreground font-medium"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
          )}
          aria-current={activeSection === "actions" ? "true" : undefined}
        >
          <span
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: DOMAIN_COLORS.executing }}
          />
          <span className="text-xs">Action Plan</span>
        </button>
      </div>
    </nav>
  )
}
