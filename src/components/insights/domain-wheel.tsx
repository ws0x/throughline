"use client"

import { useEffect, useRef } from "react"
import { motion } from "motion/react"
import type { ThemeEntry, StrengthDomain } from "@/types"
import { DOMAIN_COLORS, DOMAIN_DISPLAY_NAMES } from "@/types"

type DomainCount = Record<StrengthDomain, number>

function countByDomain(themes: ThemeEntry[]): DomainCount {
  return themes.reduce<DomainCount>(
    (acc, t) => ({ ...acc, [t.domain]: (acc[t.domain] ?? 0) + 1 }),
    { executing: 0, influencing: 0, relationship: 0, strategic: 0 },
  )
}

function polarToCartesian(
  cx: number,
  cy: number,
  r: number,
  angleDeg: number,
) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function describeArc(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number,
): string {
  const gap = 2 // degrees gap between segments
  const s = polarToCartesian(cx, cy, r, startAngle + gap / 2)
  const e = polarToCartesian(cx, cy, r, endAngle - gap / 2)
  const largeArc = endAngle - startAngle > 180 ? 1 : 0
  return `M ${s.x.toFixed(3)} ${s.y.toFixed(3)} A ${r} ${r} 0 ${largeArc} 1 ${e.x.toFixed(3)} ${e.y.toFixed(3)}`
}

const DOMAIN_ORDER: StrengthDomain[] = [
  "executing",
  "influencing",
  "relationship",
  "strategic",
]

type DomainWheelProps = {
  themes: ThemeEntry[]
  size?: number
  className?: string
}

export function DomainWheel({
  themes,
  size = 160,
  className,
}: DomainWheelProps) {
  const counts = countByDomain(themes)
  const total  = themes.length || 34
  const cx = size / 2
  const cy = size / 2
  const outerR = size / 2 - 8
  const innerR = outerR - 22

  // Build arc segments
  let currentAngle = 0
  const segments = DOMAIN_ORDER.map((domain) => {
    const count = counts[domain]
    const angle = (count / total) * 360
    const start = currentAngle
    const end   = currentAngle + angle
    currentAngle += angle
    return { domain, count, start, end }
  })

  const dominantDomain = DOMAIN_ORDER.reduce((a, b) =>
    counts[a] >= counts[b] ? a : b,
  )

  return (
    <div className={className}>
      <div className="flex flex-col sm:flex-row items-center gap-6">
        {/* SVG wheel */}
        <div className="relative flex-shrink-0">
          <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            aria-label="Domain distribution wheel"
            role="img"
          >
            {segments.map(({ domain, start, end }, i) => {
              if (end - start < 0.5) return null
              return (
                <motion.path
                  key={domain}
                  d={describeArc(cx, cy, outerR, start, end)}
                  stroke={DOMAIN_COLORS[domain]}
                  strokeWidth={22}
                  fill="none"
                  strokeLinecap="round"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{
                    pathLength: { duration: 0.8, delay: i * 0.15, ease: "easeOut" },
                    opacity:    { duration: 0.3, delay: i * 0.15 },
                  }}
                />
              )
            })}
          </svg>

          {/* Center label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span
              className="text-2xl font-display font-semibold"
              style={{ color: DOMAIN_COLORS[dominantDomain] }}
            >
              {counts[dominantDomain]}
            </span>
            <span className="text-[10px] text-muted-foreground text-center leading-tight px-2">
              {DOMAIN_DISPLAY_NAMES[dominantDomain].split(" ")[0]}
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
          {DOMAIN_ORDER.map((domain) => (
            <div key={domain} className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: DOMAIN_COLORS[domain] }}
              />
              <div className="min-w-0">
                <p className="text-xs font-medium text-foreground leading-none mb-0.5">
                  {counts[domain]}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {DOMAIN_DISPLAY_NAMES[domain]}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
