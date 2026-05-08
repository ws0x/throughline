"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "motion/react"
import { cn } from "@/lib/utils"
import type { InsightSection } from "@/types"
import { SECTION_METADATA } from "@/types"
import type { InsightMap } from "@/hooks/use-insight-stream"
import type { InsightActionInput } from "@/lib/insights/schema"

type ActionWithMeta = InsightActionInput & {
  section: InsightSection
  sectionTitle: string
  done: boolean
  id: string
}

const WHEN_ORDER = ["today", "this_week", "this_quarter"] as const
const WHEN_LABELS: Record<string, string> = {
  today:        "Do today",
  this_week:    "This week",
  this_quarter: "This quarter",
}
const WHEN_COLORS: Record<string, string> = {
  today:        "#C4713A",
  this_week:    "#D4962A",
  this_quarter: "#4A5E8C",
}

function buildActions(insights: InsightMap): ActionWithMeta[] {
  const actions: ActionWithMeta[] = []
  for (const [section, content] of Object.entries(insights)) {
    if (!content) continue
    const meta = SECTION_METADATA[section as InsightSection]
    content.actions.forEach((action, i) => {
      actions.push({
        ...action,
        section:      section as InsightSection,
        sectionTitle: meta.title,
        done:         false,
        id:           `${section}-${i}`,
      })
    })
  }
  return actions
}

type ActionPlanProps = {
  insights:  InsightMap
  className?: string
}

export function ActionPlan({ insights, className }: ActionPlanProps) {
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set())
  const [showDone, setShowDone] = useState(false)

  const rawActions = buildActions(insights)
  const allActions = rawActions.map((a) => ({ ...a, done: doneIds.has(a.id) }))

  const toggle = (id: string) => {
    setDoneIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const doneCount = doneIds.size
  const totalCount = allActions.length

  return (
    <div className={cn("", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-display text-2xl font-semibold text-foreground mb-1">
            Your Action Plan
          </h2>
          <p className="text-sm text-muted-foreground">
            {totalCount} actions across all sections ·{" "}
            <span className="text-relationship font-medium">{doneCount} done</span>
          </p>
        </div>

        {doneCount > 0 && (
          <button
            onClick={() => setShowDone((s) => !s)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {showDone ? "Hide done" : `Show done (${doneCount})`}
          </button>
        )}
      </div>

      {/* Progress bar */}
      {totalCount > 0 && (
        <div className="mb-8">
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-relationship rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${(doneCount / totalCount) * 100}%` }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          </div>
        </div>
      )}

      {/* Grouped by timeframe */}
      <div className="space-y-10">
        {WHEN_ORDER.map((when) => {
          const group = allActions.filter(
            (a) => a.when === when && (showDone || !a.done),
          )
          if (group.length === 0) return null

          return (
            <div key={when}>
              <div className="flex items-center gap-3 mb-4">
                <span
                  className="text-xs font-bold uppercase tracking-wider"
                  style={{ color: WHEN_COLORS[when] }}
                >
                  {WHEN_LABELS[when]}
                </span>
                <div
                  className="flex-1 h-px"
                  style={{ backgroundColor: `${WHEN_COLORS[when]}25` }}
                />
                <span className="text-xs text-muted-foreground">
                  {group.filter((a) => !a.done).length} remaining
                </span>
              </div>

              <div className="space-y-3">
                <AnimatePresence initial={false}>
                  {group.map((action) => (
                    <motion.div
                      key={action.id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20, height: 0, marginBottom: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ActionItem
                        action={action}
                        done={action.done}
                        onToggle={() => toggle(action.id)}
                        when={when}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )
        })}
      </div>

      {doneCount === totalCount && totalCount > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mt-10 text-center py-8 rounded-2xl border border-border bg-muted/40"
        >
          <p className="font-display text-xl font-semibold text-foreground mb-1">
            All {totalCount} actions done 🎉
          </p>
          <p className="text-sm text-muted-foreground">
            Check back as you hit new milestones.
          </p>
        </motion.div>
      )}
    </div>
  )
}

/* ── Single action item ── */

function ActionItem({
  action,
  done,
  onToggle,
  when,
}: {
  action: ActionWithMeta
  done:   boolean
  onToggle: () => void
  when: string
}) {
  return (
    <div
      className={cn(
        "flex gap-3 p-4 rounded-xl border transition-colors duration-200",
        done
          ? "border-border/50 bg-muted/30 opacity-50"
          : "border-border bg-card hover:bg-muted/20",
      )}
    >
      {/* Checkbox */}
      <button
        onClick={onToggle}
        className="flex-shrink-0 mt-0.5"
        aria-label={done ? "Mark incomplete" : "Mark complete"}
      >
        <div
          className={cn(
            "w-5 h-5 rounded border-2 flex items-center justify-center transition-all",
            done
              ? "bg-relationship border-relationship"
              : "border-border hover:border-accent",
          )}
        >
          {done && (
            <svg
              className="w-3 h-3 text-white"
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

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm leading-relaxed mb-1", done && "line-through")}>
          {action.text}
        </p>
        <div className="flex items-center gap-2">
          <span
            className="text-xs font-medium"
            style={{ color: WHEN_COLORS[when] }}
          >
            {action.why}
          </span>
          <span className="text-xs text-muted-foreground">·</span>
          <span className="text-xs text-muted-foreground truncate">
            {action.sectionTitle}
          </span>
        </div>
      </div>
    </div>
  )
}
