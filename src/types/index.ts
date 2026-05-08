// ─────────────────────────────────────────────
//  Throughline — Shared TypeScript Types
// ─────────────────────────────────────────────

/* ── Strength domains ── */

export type StrengthDomain =
  | "executing"
  | "influencing"
  | "relationship"
  | "strategic"

export const DOMAIN_DISPLAY_NAMES: Record<StrengthDomain, string> = {
  executing:    "Executing",
  influencing:  "Influencing",
  relationship: "Relationship Building",
  strategic:    "Strategic Thinking",
}

export const DOMAIN_COLORS: Record<StrengthDomain, string> = {
  executing:    "#C4713A",
  influencing:  "#D4962A",
  relationship: "#4A8C6F",
  strategic:    "#4A5E8C",
}

/* ── Theme ── */

export type ThemeEntry = {
  rank:   number          // 1–34
  name:   string          // e.g. "Ideation"
  domain: StrengthDomain
}

/**
 * Canonical CliftonStrengths 34 themes with their domains.
 * Used to validate extracted themes and ground AI prompts.
 */
export const CLIFTON_THEMES: Record<string, StrengthDomain> = {
  // Executing
  Achiever:      "executing",
  Arranger:      "executing",
  Belief:        "executing",
  Consistency:   "executing",
  Deliberative:  "executing",
  Discipline:    "executing",
  Focus:         "executing",
  Responsibility: "executing",
  Restorative:   "executing",
  // Influencing
  Activator:        "influencing",
  Command:          "influencing",
  Communication:    "influencing",
  Competition:      "influencing",
  Maximizer:        "influencing",
  "Self-Assurance": "influencing",
  Significance:     "influencing",
  Woo:              "influencing",
  // Relationship Building
  Adaptability:     "relationship",
  Developer:        "relationship",
  Connectedness:    "relationship",
  Empathy:          "relationship",
  Harmony:          "relationship",
  Includer:         "relationship",
  Individualization:"relationship",
  Positivity:       "relationship",
  Relator:          "relationship",
  // Strategic Thinking
  Analytical:   "strategic",
  Context:      "strategic",
  Futuristic:   "strategic",
  Ideation:     "strategic",
  Input:        "strategic",
  Intellection: "strategic",
  Learner:      "strategic",
  Strategic:    "strategic",
} as const

/* ── Insight sections ── */

export type InsightSection =
  | "core_identity"
  | "signature_pattern"
  | "productivity_style"
  | "decision_making"
  | "daily_actions"
  | "career_alignment"
  | "communication_style"
  | "collaboration_style"
  | "leadership"
  | "relationships"
  | "blind_spots"
  | "stress_patterns"
  | "work_environment"
  | "growth_opportunities"

export type InsightTier = 1 | 2 | 3 | 4

export type SectionMeta = {
  title:       string
  tier:        InsightTier
  description: string
  model:       "generate" | "identity"
}

export const SECTION_METADATA: Record<InsightSection, SectionMeta> = {
  // Tier 1 — Identity
  core_identity: {
    title:       "Core Strength Identity",
    tier:        1,
    description: "Who you are at your best",
    model:       "identity",
  },
  signature_pattern: {
    title:       "Signature Pattern",
    tier:        1,
    description: "How your top themes interact",
    model:       "identity",
  },
  // Tier 2 — Acting
  productivity_style: {
    title:       "Productivity Style",
    tier:        2,
    description: "Your natural work rhythm and energy patterns",
    model:       "generate",
  },
  decision_making: {
    title:       "Decision-Making Patterns",
    tier:        2,
    description: "How you decide well, and where you stall",
    model:       "generate",
  },
  daily_actions: {
    title:       "Daily Action Recommendations",
    tier:        2,
    description: "Ritual-level habits aligned to your top themes",
    model:       "generate",
  },
  career_alignment: {
    title:       "Career Alignment",
    tier:        2,
    description: "Role archetypes that energize you, and ones that drain",
    model:       "generate",
  },
  // Tier 3 — Others
  communication_style: {
    title:       "Communication Style",
    tier:        3,
    description: "How you express and receive information",
    model:       "generate",
  },
  collaboration_style: {
    title:       "Collaboration Style",
    tier:        3,
    description: "How you work best with others",
    model:       "generate",
  },
  leadership: {
    title:       "Leadership Tendencies",
    tier:        3,
    description: "Your natural leadership approach",
    model:       "generate",
  },
  relationships: {
    title:       "Relationship Dynamics",
    tier:        3,
    description: "How you build and maintain connections",
    model:       "generate",
  },
  // Tier 4 — Mirror
  blind_spots: {
    title:       "Blind Spots & Overuse Risks",
    tier:        4,
    description: "When your top themes become liabilities",
    model:       "generate",
  },
  stress_patterns: {
    title:       "Stress Patterns",
    tier:        4,
    description: "What triggers you, and what restores you",
    model:       "generate",
  },
  work_environment: {
    title:       "Ideal Work Environment",
    tier:        4,
    description: "Physical, social, and structural conditions where you thrive",
    model:       "generate",
  },
  growth_opportunities: {
    title:       "Growth Opportunities",
    tier:        4,
    description: "Lower-ranked themes worth developing intentionally",
    model:       "generate",
  },
}

/* ── Insight content schema ── */

export type InsightAction = {
  when: "today" | "this_week" | "this_quarter"
  text: string  // the action itself
  why:  string  // which theme drives this
}

export type InsightContent = {
  headline:      string          // ≤12 words, declarative
  summary:       string          // 2–3 sentences
  evidence:      string[]        // theme-grounded observations
  actions:       InsightAction[] // 3–5 concrete actions
  watchOutFor?:  string          // optional liability note
}

/* ── DB record shapes ── */

export type ReportStatus = "pending" | "processing" | "complete" | "failed"

export type Report = {
  id:           string
  userId:       string
  fileName:     string
  blobUrl:      string
  themes:       ThemeEntry[]
  status:       ReportStatus
  uploadedAt:   Date
  processedAt?: Date
}

export type InsightRecord = {
  id:          string
  reportId:    string
  section:     InsightSection
  content:     InsightContent
  generatedAt: Date
  model:       string
}
