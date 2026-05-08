import type { ThemeEntry, InsightSection } from "@/types"
import { SECTION_METADATA } from "@/types"

/* ── 34-theme reference corpus ─────────────────────────────────
   This is the CACHED portion of the system prompt.
   Included in every request — Anthropic caches it so subsequent
   requests within the same session don't re-process it.
─────────────────────────────────────────────────────────────── */

const THEME_DEFINITIONS: Record<string, string> = {
  // Executing
  Achiever:      "Constant drive; needs to accomplish something tangible every day. Measures worth by productivity.",
  Arranger:      "Orchestrates complex situations; finds the best configuration of resources and people.",
  Belief:        "Core values are unchanging; work must align with personal mission to feel meaningful.",
  Consistency:   "Treats everyone equally; rules create fairness and predictability.",
  Deliberative:  "Careful, considered; anticipates obstacles and identifies risks before acting.",
  Discipline:    "Needs structure, routine, and precision; creates order from chaos instinctively.",
  Focus:         "Sets goals, filters distractions, stays on course; impatient with tangents.",
  Responsibility: "Takes psychological ownership; follows through on commitments at all costs.",
  Restorative:   "Energized by problems; loves diagnosing what's broken and fixing it.",
  // Influencing
  Activator:     "Impatient with analysis-paralysis; believes the best learning is through action.",
  Command:       "Takes charge; not afraid of confrontation; has presence and directness.",
  Communication: "Finds words for ideas; loves stories, conversation, and presentation.",
  Competition:   "Measures performance against others; needs to win to feel successful.",
  Maximizer:     "Transforms good into great; focuses on strengths rather than weaknesses.",
  "Self-Assurance": "Confident in their own judgment; trusts internal compass over external validation.",
  Significance:  "Wants to be recognized as credible, important, and outstanding.",
  Woo:           "Breaks the ice instantly; loves meeting strangers and winning them over.",
  // Relationship Building
  Adaptability:  "Lives in the present; flexible and comfortable with ambiguity.",
  Developer:     "Sees potential in others; invests in their growth and celebrates small wins.",
  Connectedness: "Believes all things happen for a reason; bridge-builder across differences.",
  Empathy:       "Senses others' emotions as if they were their own; creates emotional safety.",
  Harmony:       "Seeks agreement; avoids conflict by finding common ground.",
  Includer:      "Aware of the excluded; expands the circle instinctively.",
  Individualization: "Fascinated by the unique qualities of each person; spots what makes someone tick.",
  Positivity:    "Contagious enthusiasm; sees the upside and raises the energy of any room.",
  Relator:       "Drawn to deep, authentic relationships over many surface-level ones.",
  // Strategic Thinking
  Analytical:    "Searches for reasons and causes; wants data before deciding.",
  Context:       "Learns from the past to understand the present; roots decisions in history.",
  Futuristic:    "Inspired by what could be; paints vivid pictures of the future.",
  Ideation:      "Fascinated by connections between disparate things; generates many ideas rapidly.",
  Input:         "Craves and collects information, knowledge, and artefacts.",
  Intellection:  "Introspective thinker; values thinking time and intellectual discussion.",
  Learner:       "Excited by the process of learning, not just the outcome.",
  Strategic:     "Sees patterns in complexity; identifies the best path through obstacles.",
}

export function buildThemeReferenceCorpus(): string {
  return Object.entries(THEME_DEFINITIONS)
    .map(([name, def]) => `- **${name}**: ${def}`)
    .join("\n")
}

/* ── System prompt builder ── */

/**
 * Builds the grounded system prompt.
 * The 34-theme reference corpus at the top will be CACHED by Anthropic
 * (shared across all users). The user's specific themes are appended
 * after, and are NOT cached.
 */
export function buildSystemPrompt(themes: ThemeEntry[]): string {
  const top10 = themes.slice(0, 10)
  const top5  = themes.slice(0, 5)

  const themeList = top10
    .map((t) => `  ${t.rank}. ${t.name} (${THEME_DEFINITIONS[t.name] ?? "see above"})`)
    .join("\n")

  const signatureNames = top5.map((t) => t.name).join(", ")

  return `You are Throughline, a behavioral intelligence assistant that generates highly specific, useful insights from CliftonStrengths 34 data.

## CliftonStrengths 34 reference

Every theme name you use MUST come from this list. Never invent theme names.

${buildThemeReferenceCorpus()}

## This user's profile

Top 10 themes (ranked 1–10, most dominant first):
${themeList}

Signature combination: ${signatureNames}

## Output format (REQUIRED)

Always respond with a single valid JSON object — no markdown, no explanation:

{
  "headline": "Declarative statement of 8–12 words about this section's core insight",
  "summary": "2-3 sentences. Direct, specific, grounded in their themes.",
  "evidence": [
    "Observation 1 — must name a specific theme. Example: Your Ideation at #3 means...",
    "Observation 2 — must name a specific theme.",
    "Observation 3 — optional, must name a specific theme."
  ],
  "actions": [
    { "when": "today", "text": "Specific action", "why": "ThemeName" },
    { "when": "this_week", "text": "Specific action", "why": "ThemeName" },
    { "when": "this_quarter", "text": "Specific action", "why": "ThemeName" }
  ],
  "watchOutFor": "Optional: 1 sentence about when a top theme becomes a liability. Only include if genuinely relevant."
}

## Non-negotiable quality rules

1. Every claim must reference at least one of this user's top 10 themes BY NAME.
2. "evidence" items must start with the theme name (e.g., "Your Strategic at #1 means...").
3. "actions.why" must be the exact name of one of their top 10 themes.
4. NO generic statements that could apply to anyone.
5. Tone: direct, second-person ("You", "Your"), no jargon, no motivational fluff.
6. "headline" must be a declarative statement, not a question or title.`
}

/* ── Section-specific user prompts ── */

export function buildSectionPrompt(
  section: InsightSection,
  themes:  ThemeEntry[],
): string {
  const meta    = SECTION_METADATA[section]
  const top5    = themes.slice(0, 5).map((t) => t.name).join(", ")
  const allTop  = themes.slice(0, 10).map((t) => `${t.name}(#${t.rank})`).join(", ")

  const sectionInstructions: Record<InsightSection, string> = {
    core_identity: `Generate the "Core Strength Identity" section.

This is the most important section — the user will read it first and refer back to it often.
Write a synthesis of who this person is at their best, based on their top themes working together.
Do NOT list themes one by one. Describe the emergent character they create as a system.

User's top 5: ${top5}
Full top 10: ${allTop}

The headline should capture their essence in 10 words. Example: "You build momentum by thinking ahead and acting decisively."`,

    signature_pattern: `Generate the "Signature Pattern" section.

Describe how this person's top 3-5 themes interact and reinforce each other.
Identify the emergent quality this combination creates — something that would be different with a different set of themes.
Use the metaphor of a "signature move" — what do they naturally do that others notice?

User's top 5: ${top5}`,

    productivity_style: `Generate the "Productivity Style" section.

Describe how this person works best: their natural rhythm, energy patterns, what conditions help them produce their best work.
Address: when they work best, how they prefer to structure tasks, what drains vs energizes them.
Include at least one "today" action that can be done in under 10 minutes.

User's top 5: ${top5}`,

    decision_making: `Generate the "Decision-Making Patterns" section.

How does this person make decisions? What information do they need? Where do they get stuck?
Address: their natural process, what slows them down, how to make better decisions by leveraging their themes.
Be honest about the friction points — don't only describe strengths.

User's top 5: ${top5}`,

    daily_actions: `Generate the "Daily Action Recommendations" section.

Create 5 ritual-level habits (not grand strategies) this person could adopt TODAY.
These should be small, specific, and directly tied to their top themes.
One action per theme from their top 5.
Actions should be concrete enough to start in the next 24 hours.

User's top 5: ${top5}`,

    career_alignment: `Generate the "Career Alignment" section.

What role archetypes energize this person? Which ones drain them?
Be specific: name actual job functions, environments, responsibilities — not broad categories like "leadership roles."
Include the "watch out for" field — which career traps commonly snare people with this theme combination?

User's top 5: ${top5}`,

    communication_style: `Generate the "Communication Style" section.

How does this person naturally communicate? How do they process information best?
Address: preferred communication mode, how they handle conflict, what makes them feel heard.
Include practical advice for working with this person.

User's top 5: ${top5}`,

    collaboration_style: `Generate the "Collaboration Style" section.

What role do they naturally take in teams? What do they contribute that others often can't?
Where do they get frustrated with collaborators?
Include actionable advice for setting expectations with teammates.

User's top 5: ${top5}`,

    leadership: `Generate the "Leadership Tendencies" section.

What kind of leader does this theme combination naturally create?
Address: how they motivate, their blind spots as a leader, and what leadership style fits them best.
Do NOT assume they are or want to be a manager. Frame leadership as influence, not title.

User's top 5: ${top5}`,

    relationships: `Generate the "Relationship Dynamics" section.

How do they build and maintain relationships? What do they need in a relationship (personal or professional)?
What patterns emerge from their theme combination that affect how they connect with people?

User's top 5: ${top5}`,

    blind_spots: `Generate the "Blind Spots & Overuse Risks" section.

This is the most honest, self-awareness-building section. Be direct.
For each of their top 3-4 themes, identify the specific liability that emerges when it's overused.
Use a specific scenario, not a vague warning.

Include a "watchOutFor" field — the most likely blind spot to manifest in daily life.

User's top 5: ${top5}`,

    stress_patterns: `Generate the "Stress Patterns" section.

What triggers stress for this person (based on their themes)?
What behaviors do they exhibit under stress that others notice?
What genuinely restores them (tied to their themes, not generic self-care advice)?

User's top 5: ${top5}`,

    work_environment: `Generate the "Ideal Work Environment" section.

What physical, social, and structural conditions allow this person to do their best work?
Be concrete: open office vs private, async vs sync, autonomy vs clear direction, etc.
Include a "watchOutFor" — the most common mismatch between their themes and typical workplaces.

User's top 5: ${top5}`,

    growth_opportunities: `Generate the "Growth Opportunities" section.

This is about themes ranked 25-34 — the areas where they have the least natural talent.
Do NOT frame this as "fix your weaknesses." Frame it as "where to partner up or build smart systems."
Identify 2-3 lower themes and suggest how to work around them, not through them.
Be specific about what this person should STOP trying to do alone.

User's all themes: ${allTop}`,
  }

  return (
    sectionInstructions[section] ??
    `Generate the "${meta.title}" section. Topic: ${meta.description}. User's top 5: ${top5}`
  )
}
