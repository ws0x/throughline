"use client"

import { useEffect, useRef, useState } from "react"
import type { InsightSection } from "@/types"
import type { InsightContentInput, SseEvent } from "@/lib/insights/schema"

export type StreamStatus =
  | "idle"
  | "connecting"
  | "streaming"
  | "complete"
  | "error"

export type InsightMap = Partial<Record<InsightSection, InsightContentInput>>

export type StreamProgress = {
  completed: number
  total:     number
  message:   string
}

/**
 * useInsightStream — connects to the SSE endpoint and populates
 * insights as they stream in. Handles reconnection, cleanup, and
 * pre-populated data (for already-generated reports).
 */
export function useInsightStream(
  reportId:  string,
  initial?:  InsightMap,
) {
  const [status,   setStatus]   = useState<StreamStatus>(initial ? "complete" : "idle")
  const [insights, setInsights] = useState<InsightMap>(initial ?? {})
  const [progress, setProgress] = useState<StreamProgress>({
    completed: initial ? Object.keys(initial).length : 0,
    total:     14,
    message:   "",
  })
  const [error, setError] = useState<string | null>(null)

  const esRef = useRef<EventSource | null>(null)

  useEffect(() => {
    // If we already have all 14 sections, don't connect
    if (initial && Object.keys(initial).length >= 14) return

    const es = new EventSource(`/api/generate?reportId=${reportId}`)
    esRef.current = es

    setStatus("connecting")

    es.onopen = () => {
      setStatus("streaming")
      setError(null)
    }

    es.addEventListener("section", (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data) as SseEvent & { type: "section" }
        setInsights((prev) => ({
          ...prev,
          [data.section]: data.content,
        }))
      } catch {
        console.error("[stream] Failed to parse section event:", e.data)
      }
    })

    es.addEventListener("progress", (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data) as SseEvent & { type: "progress" }
        setProgress({
          completed: data.completed,
          total:     data.total,
          message:   data.message,
        })
      } catch {
        // Ignore malformed progress events
      }
    })

    es.addEventListener("error", (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data) as SseEvent & { type: "error" }
        console.warn(`[stream] Section error (${data.section}):`, data.error)
        // Don't set error state for individual section failures
      } catch {
        // Generic connection error
        setError("Connection lost. Some sections may be missing.")
        setStatus("error")
      }
    })

    es.addEventListener("complete", (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data) as SseEvent & { type: "complete" }
        setStatus("complete")
        setProgress((prev) => ({ ...prev, completed: data.total }))
        console.log(`[stream] Complete — ${data.total} sections in ${data.elapsed}ms`)
      } catch {
        setStatus("complete")
      }
      es.close()
    })

    es.onerror = () => {
      if (es.readyState === EventSource.CLOSED) {
        setStatus("error")
        setError("Connection closed unexpectedly.")
      }
    }

    return () => {
      es.close()
      esRef.current = null
    }
  }, [reportId]) // eslint-disable-line react-hooks/exhaustive-deps

  return { insights, status, progress, error }
}
