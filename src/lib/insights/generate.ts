import { getAnthropicClient, MODELS, MAX_TOKENS } from "@/lib/anthropic"
import { InsightContentSchema, type InsightContentInput } from "./schema"
import { buildSystemPrompt, buildSectionPrompt } from "./prompts"
import type { ThemeEntry, InsightSection } from "@/types"
import { SECTION_METADATA } from "@/types"

type GenerateResult =
  | { success: true;  content: InsightContentInput; model: string; tokens: number }
  | { success: false; error: string }

/**
 * Generate a single insight section for a user's theme profile.
 *
 * Uses prompt caching: the system prompt (with 34-theme reference corpus)
 * is marked as cacheable — subsequent calls within the same session
 * reuse it at a ~90% token cost reduction.
 */
export async function generateSection(
  section: InsightSection,
  themes:  ThemeEntry[],
): Promise<GenerateResult> {
  const client = getAnthropicClient()
  const meta   = SECTION_METADATA[section]
  const model  = meta.model === "identity" ? MODELS.identity : MODELS.generate

  const systemPromptText = buildSystemPrompt(themes)
  const sectionPromptText = buildSectionPrompt(section, themes)

  let rawText = ""

  try {
    const response = await client.messages.create({
      model,
      max_tokens: meta.tier <= 2 ? MAX_TOKENS.identity : MAX_TOKENS.section,
      system: [
        {
          type: "text",
          text: systemPromptText,
          // Mark as cacheable — shared across all users
          // (the 34-theme reference corpus is the expensive part)
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        {
          role: "user",
          content: sectionPromptText,
        },
      ],
    })

    rawText = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("")

    // Extract JSON from the response
    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return {
        success: false,
        error:   `No JSON found in model response for section "${section}"`,
      }
    }

    const parsed = JSON.parse(jsonMatch[0])
    const validated = InsightContentSchema.safeParse(parsed)

    if (!validated.success) {
      return {
        success: false,
        error:   `Schema validation failed for "${section}": ${validated.error.message}`,
      }
    }

    // Specificity check: ensure at least one evidence item names a theme
    const topThemeNames = themes.slice(0, 10).map((t) => t.name)
    const hasThemeReference = validated.data.evidence.some((e) =>
      topThemeNames.some((name) => e.includes(name)),
    )

    if (!hasThemeReference) {
      // Retry once with a more explicit instruction
      return generateSectionWithRetry(section, themes, model)
    }

    const totalTokens = response.usage.input_tokens + response.usage.output_tokens

    return {
      success: true,
      content: validated.data,
      model,
      tokens:  totalTokens,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`[generate] Section "${section}" failed:`, message)
    return { success: false, error: message }
  }
}

/**
 * Retry with a stronger grounding instruction.
 * Called when the first attempt produced generic output.
 */
async function generateSectionWithRetry(
  section: InsightSection,
  themes:  ThemeEntry[],
  model:   string,
): Promise<GenerateResult> {
  const client = getAnthropicClient()

  const systemPromptText  = buildSystemPrompt(themes)
  const sectionPromptText = buildSectionPrompt(section, themes)
  const topNames          = themes.slice(0, 5).map((t) => t.name).join(", ")

  const retryInstruction = `${sectionPromptText}

IMPORTANT REMINDER: Every single "evidence" item MUST start with the theme name.
For example: "Your ${themes[0]?.name ?? "top theme"} at #1 means..."
Do NOT write anything that could apply to someone with different themes.
The themes to reference are: ${topNames}.`

  try {
    const response = await client.messages.create({
      model:      model,
      max_tokens: MAX_TOKENS.section,
      system: [
        {
          type: "text",
          text: systemPromptText,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: retryInstruction }],
    })

    const rawText = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("")

    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return { success: false, error: `Retry also failed to produce JSON for "${section}"` }
    }

    const parsed    = JSON.parse(jsonMatch[0])
    const validated = InsightContentSchema.safeParse(parsed)

    if (!validated.success) {
      return {
        success: false,
        error:   `Retry validation failed for "${section}": ${validated.error.message}`,
      }
    }

    return {
      success: true,
      content: validated.data,
      model,
      tokens:  response.usage.input_tokens + response.usage.output_tokens,
    }
  } catch (error) {
    return {
      success: false,
      error:   error instanceof Error ? error.message : String(error),
    }
  }
}
