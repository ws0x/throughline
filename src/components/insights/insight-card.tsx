"use client"

import { useState } from "react"
import { motion } from "motion/react"
import { cn } from "@/lib/utils"
import type { InsightContentInput } from "@/lib/insights/schema"
import type { InsightSection } from "@/types"
import { SECTION_METADATA, DOMAIN_COLORS } from "@/types"

const ACTION_LABELS: Record<string, string> = {
  today:        "Today",
  this_week:    "This week",
  this_quarter: "This quarter",
}

const ACTION_COLORS: Record<string, string> = {
  today:        "#C4713A",
  this_week:    "#D4962A",
  this_quarter: "#4A5E8C",
}

const TIER_COLORS: Record<number, string> = {
  1: DOMAIN_COLORS.strategic,
  2: DOMAIN_COLORS.executing,
  3: DOMAIN_COLORS.relationship,
  4: DOMAIN_COLORS.influencing,
}

/* ── Skeleton ── */

export function InsightCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "bg-card border border-border rounded-2xl p-7 space-y-4 animate-pulse",
        className,
      )}
    >
      <div className="h-3 w-24 bg-muted rounded-full" />
      <div className="h-6 w-3/4 bg-muted rounded-lg" />
      <div className="space-y-2">
        <div className="h-3 w-full bg-muted rounded" />
        <div className="h-3 w-5/6 bg-muted rounded" />
        <div className="h-3 w-4/5 bg-muted rounded" />
      </div>
    </div>
  )
}

/* ── InsightCard ── */

type InsightCardProps = {
  section:    InsightSection
  content:    InsightContentInput
  variant?:   "hero" | "standard" | "compact"
  className?: string
  index?:     number // for stagger delay
}

export function InsightCard({
  section,
  content,
  variant = "standard",
  className,
  index = 0,
}: InsightCardProps) {
  const [expanded, setExpanded] = useState(variant === "hero")
  const meta      = SECTION_METADATA[section]
  const tierColor = TIER_COLORS[meta.tier] ?? "#6B6B6B"

  if (variant === "compact") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
        className={cn(
          "bg-card border border-border rounded-xl p-5 cursor-pointer",
          "hover:border-accent/40 hover:shadow-sm transition-all duration-200",
          className,
        )}
        onClick={() => setExpanded((e) => !e)}
      >
        <p className="text-xs font-medium text-muted-foreground mb-1">{meta.title}</p>
        <p className="font-display text-base font-semibold text-foreground leading-snug line-clamp-2">
          {content.headline}
        </p>
      </motion.div>
    )
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "bg-card border border-border rounded-2xl overflow-hidden",
        "hover:shadow-sm transition-shadow duration-200",
        variant === "hero" && "shadow-sm",
        className,
      )}
    >
      {/* Header */}
      <div className="px-7 pt-7 pb-5">
        <div className="flex items-center justify-between mb-4">
          <span
            className="text-xs font-semibold px-2.5 py-1 rounded-lg"
            style={{
              backgroundColor: `${tierColor}18`,
              color:           tierColor,
            }}
          >
            {meta.title}
          </span>
          {variant === "standard" && (
            <button
              onClick={() => setExpanded((e) => !e)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors p-1 rounded"
              aria-expanded={expanded}
            >
              {expanded ? "↑ Less" : "↓ More"}
            </button>
          )}
        </div>

        <h3
          className={cn(
            "font-display font-semibold text-foreground leading-tight",
            variant === "hero"
              ? "text-2xl sm:text-3xl"
              : "text-xl",
          )}
        >
          {content.headline}
        </h3>
      </div>

      {/* Summary */}
      <div className="px-7 pb-5">
        <p className="text-muted-foreground leading-relaxed text-sm sm:text-base">
          {content.summary}
        </p>
      </div>

      {/* Expanded body */}
      {expanded && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          {/* Evidence */}
          {content.evidence.length > 0 && (
            <div className="px-7 pb-5 border-t border-border pt-5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Why this is true for you
              </p>
              <ul className="space-y-2.5">
                {content.evidence.map((item, i) => (
                  <li key={i} className="flex gap-3 text-sm text-foreground">
                    <span className="text-muted-foreground mt-0.5 flex-shrink-0">→</span>
                    <span className="leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions */}
          {content.actions.length > 0 && (
            <div className="px-7 pb-5 border-t border-border pt-5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Actions
              </p>
              <div className="space-y-2.5">
                {content.actions.map((action, i) => (
                  <ActionRow key={i} action={action} />
                ))}
              </div>
            </div>
          )}

          {/* Watch out */}
          {content.watchOutFor && (
            <div className="px-7 pb-7 border-t border-border pt-5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Watch out for
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed italic">
                {content.watchOutFor}
              </p>
            </div>
          )}
        </motion.div>
      )}

      {/* Collapsed expand prompt */}
      {variant === "standard" && !expanded && (
        <div className="px-7 pb-5">
          <button
            onClick={() => setExpanded(true)}
            className="text-xs font-medium text-accent hover:text-accent/80 transition-colors"
          >
            See evidence + actions →
          </button>
        </div>
      )}
    </motion.article>
  )
}

/* ── ActionRow ── */

function ActionRow({ action }: { action: InsightContentInput["actions"][0] }) {
  const [done, setDone] = useState(false)
  const color = ACTION_COLORS[action.when] ?? "#6B6B6B"

  return (
    <div
      className={cn(
        "flex gap-3 p-3 rounded-xl border transition-colors duration-200",
        done
          ? "border-border/50 bg-muted/40 opacity-55"
          : "border-border bg-muted/20 hover:bg-muted/50",
      )}
    >
      <button
        onClick={() => setDone((d) => !d)}
        className="flex-shrink-0 mt-0.5"
        aria-label={done ? "Mark incomplete" : "Mark complete"}
      >
        <div
          className={cn(
            "w-4 h-4 rounded border-2 flex items-center justify-center transition-all",
            done
              ? "bg-relationship border-relationship"
              : "border-border hover:border-accent",
          )}
        >
          {done && (
            <svg
              className="w-2.5 h-2.5 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.5 12.75l6 6 9-13.5"
              />
            </svg>
          )}
        </div>
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <span
            className="text-xs font-semibold px-1.5 py-0.5 rounded"
            style={{ backgroundColor: `${color}18`, color }}
          >
            {ACTION_LABELS[action.when]}
          </span>
          <span className="text-xs text-muted-foreground truncate">
            via {action.why}
          </span>
        </div>
        <p className={cn("text-sm leading-relaxed", done && "line-through")}>
          {action.text}
        </p>
      </div>
    </div>
  )
}
