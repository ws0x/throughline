import Anthropic from "@anthropic-ai/sdk"

// Lazy singleton — avoids throwing at build time when env vars aren't set
let _client: Anthropic | null = null

export function getAnthropicClient(): Anthropic {
  if (!_client) {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      throw new Error(
        "ANTHROPIC_API_KEY is not set. " +
          "Copy .env.local.example → .env.local and add your key from https://console.anthropic.com",
      )
    }
    _client = new Anthropic({ apiKey })
  }
  return _client
}

/**
 * Model IDs — update here as new models are released.
 *
 * Cost strategy (Vercel Hobby / free tier):
 *   extract  → Haiku 4.5  — fast, cheap, structured extraction
 *   generate → Sonnet 4.6 — high quality insight generation
 *   identity → Sonnet 4.6 — Core Identity synthesis (upgrade to Opus 4.7 for premium)
 *   check    → Haiku 4.5  — lightweight specificity validation pass
 *
 * Estimated cost per report: ~$0.02–0.05 with prompt caching.
 */
export const MODELS = {
  extract:  "claude-haiku-4-5",
  generate: "claude-sonnet-4-6",
  identity: "claude-sonnet-4-6",
  check:    "claude-haiku-4-5",
} as const

export type ModelId = (typeof MODELS)[keyof typeof MODELS]

/**
 * Max output tokens per use-case.
 * Keep these tight — we use structured JSON outputs,
 * not open-ended prose.
 */
export const MAX_TOKENS = {
  extract:  512,   // 34 themes in JSON
  section:  1024,  // one insight section
  identity: 1536,  // richer Core Identity section
  check:    256,   // yes/no specificity verdict
} as const
