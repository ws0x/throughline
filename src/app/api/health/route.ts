import { NextResponse } from "next/server"
import { getAnthropicClient, MODELS } from "@/lib/anthropic"

// Force dynamic — never cache health checks
export const dynamic = "force-dynamic"

/**
 * GET /api/health
 *
 * Smoke-tests the Anthropic SDK connection.
 * Returns model latency and token usage.
 * Verify M0 with: curl http://localhost:3000/api/health
 */
export async function GET() {
  const start = Date.now()

  try {
    const client = getAnthropicClient()

    const response = await client.messages.create({
      model: MODELS.extract,
      max_tokens: 10,
      messages: [{ role: "user", content: "ping" }],
    })

    return NextResponse.json({
      status:      "ok",
      model:       MODELS.extract,
      latency_ms:  Date.now() - start,
      input_tokens:  response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
      timestamp:   new Date().toISOString(),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)

    console.error("[health] Anthropic ping failed:", message)

    return NextResponse.json(
      {
        status:    "error",
        error:     message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
