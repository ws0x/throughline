import { getAnthropicClient, MODELS, MAX_TOKENS } from "@/lib/anthropic"
import { CLIFTON_THEMES, type ThemeEntry, type StrengthDomain } from "@/types"
import { z } from "zod"

/* ── Zod schema for extracted themes ── */

const ThemeSchema = z.object({
  rank:   z.number().int().min(1).max(34),
  name:   z.string().min(2).max(50),
  domain: z.enum(["executing", "influencing", "relationship", "strategic"]),
})

const ExtractionSchema = z.object({
  themes: z
    .array(ThemeSchema)
    .min(10, "Expected at least 10 CliftonStrengths themes")
    .max(34, "CliftonStrengths reports have exactly 34 themes"),
})

export type ExtractionResult =
  | { success: true;  themes: ThemeEntry[] }
  | { success: false; error: string }

/* ── Main extraction function ── */

/**
 * Extract ranked CliftonStrengths themes from a PDF file buffer.
 *
 * Uses Claude Haiku 4.5 with PDF vision for extraction.
 * Validates against the canonical 34-theme list.
 */
export async function extractThemesFromPdf(
  fileBuffer: ArrayBuffer,
  fileName: string,
): Promise<ExtractionResult> {
  const client = getAnthropicClient()

  const base64Pdf = Buffer.from(fileBuffer).toString("base64")

  const systemPrompt = buildExtractionSystemPrompt()

  try {
    const response = await client.messages.create({
      model:      MODELS.extract,
      max_tokens: MAX_TOKENS.extract,
      system:     systemPrompt,
      messages: [
        {
          role: "user",
          content: [
            {
              type:   "document",
              source: {
                type:       "base64",
                media_type: "application/pdf",
                data:       base64Pdf,
              },
            },
            {
              type: "text",
              text:
                "Extract all CliftonStrengths themes from this Gallup report. " +
                "Return them as a JSON object matching the schema exactly. " +
                "Include all themes visible in the report, ranked from 1 (top) to 34 (bottom).",
            },
          ],
        },
      ],
    })

    // Parse the response text as JSON
    const rawText = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("")

    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return {
        success: false,
        error:   "Could not find JSON in model response. Is this a CliftonStrengths PDF?",
      }
    }

    const parsed = JSON.parse(jsonMatch[0])
    const validated = ExtractionSchema.safeParse(parsed)

    if (!validated.success) {
      return {
        success: false,
        error:   `Invalid theme structure: ${validated.error.message}`,
      }
    }

    // Enrich with canonical domain data (model may miss a few)
    const enriched: ThemeEntry[] = validated.data.themes.map((t) => ({
      rank:   t.rank,
      name:   t.name,
      domain: resolveThemeDomain(t.name) ?? t.domain,
    }))

    // Validate that theme names are from the official list
    const unknownThemes = enriched.filter(
      (t) => !CLIFTON_THEMES[t.name],
    )
    if (unknownThemes.length > 5) {
      return {
        success: false,
        error:
          `Too many unrecognized theme names: ${unknownThemes.map((t) => t.name).join(", ")}. ` +
          "Please upload a genuine Gallup CliftonStrengths 34 report.",
      }
    }

    return { success: true, themes: enriched }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error("[extract] PDF extraction failed:", message)

    return {
      success: false,
      error:   `Extraction failed: ${message}`,
    }
  }
}

/* ── Helpers ── */

function resolveThemeDomain(name: string): StrengthDomain | null {
  return (CLIFTON_THEMES[name] as StrengthDomain) ?? null
}

function buildExtractionSystemPrompt(): string {
  return `You are a CliftonStrengths report parser. Your ONLY job is to extract structured data from Gallup CliftonStrengths PDF reports.

Extract the ranked list of CliftonStrengths themes. Return ONLY valid JSON matching this exact schema — no explanation, no markdown:

{
  "themes": [
    { "rank": 1, "name": "Strategic", "domain": "strategic" },
    { "rank": 2, "name": "Achiever", "domain": "executing" },
    ...
  ]
}

Domain values must be exactly one of: "executing", "influencing", "relationship", "strategic"

The 34 CliftonStrengths themes and their domains:
${Object.entries(CLIFTON_THEMES)
  .map(([name, domain]) => `- ${name}: ${domain}`)
  .join("\n")}

If you cannot find a ranked list of themes in the document, return:
{"themes": []}

Return nothing except the JSON object.`
}
