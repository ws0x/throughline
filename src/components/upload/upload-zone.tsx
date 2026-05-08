"use client"

import { useCallback, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { cn, formatFileSize } from "@/lib/utils"

type UploadState =
  | { phase: "idle" }
  | { phase: "dragover" }
  | { phase: "uploading"; progress: number }
  | { phase: "extracting" }
  | { phase: "error"; message: string }
  | { phase: "success"; reportId: string }

/**
 * UploadZone — drag-and-drop PDF upload with inline status.
 *
 * Flow:
 *  1. User drops or selects a PDF
 *  2. POST /api/upload → receives reportId + blobUrl
 *  3. POST /api/extract → extracts themes
 *  4. Redirects to /report/[reportId]
 */
export default function UploadZone() {
  const router  = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [state, setState] = useState<UploadState>({ phase: "idle" })

  /* ── Drag handlers ── */
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setState({ phase: "dragover" })
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setState({ phase: "idle" })
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  /* ── File processing ── */
  async function processFile(file: File) {
    // Client-side validation
    if (file.type !== "application/pdf") {
      setState({ phase: "error", message: "Please upload a PDF file." })
      return
    }

    const MAX_SIZE = 15 * 1024 * 1024
    if (file.size > MAX_SIZE) {
      setState({
        phase: "error",
        message: `File too large (${formatFileSize(file.size)}). Maximum is 15 MB.`,
      })
      return
    }

    /* ── Step 1: Upload ── */
    setState({ phase: "uploading", progress: 0 })

    const formData = new FormData()
    formData.append("file", file)

    let reportId: string
    try {
      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body:   formData,
      })

      if (!uploadRes.ok) {
        const err = await uploadRes.json().catch(() => ({ error: "Upload failed" }))
        throw new Error(err.error ?? "Upload failed")
      }

      const uploadData = await uploadRes.json()
      reportId = uploadData.reportId
    } catch (error) {
      setState({
        phase: "error",
        message: error instanceof Error ? error.message : "Upload failed. Please try again.",
      })
      return
    }

    /* ── Step 2: Extract themes ── */
    setState({ phase: "extracting" })

    try {
      const extractRes = await fetch("/api/extract", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ reportId }),
      })

      if (!extractRes.ok) {
        const err = await extractRes.json().catch(() => ({ error: "Extraction failed" }))
        throw new Error(err.error ?? "Could not read your report")
      }
    } catch (error) {
      setState({
        phase: "error",
        message:
          error instanceof Error
            ? error.message
            : "Could not read your report. Make sure it's a genuine Gallup CliftonStrengths PDF.",
      })
      return
    }

    /* ── Step 3: Redirect to report ── */
    setState({ phase: "success", reportId })
    router.push(`/report/${reportId}`)
  }

  /* ── Render ── */
  return (
    <div className="w-full">
      {/* Drop zone */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        disabled={state.phase === "uploading" || state.phase === "extracting" || state.phase === "success"}
        className={cn(
          "w-full border-2 border-dashed rounded-2xl p-14 text-center transition-all duration-200",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          "disabled:cursor-not-allowed",
          state.phase === "idle" &&
            "border-border hover:border-accent/60 hover:bg-accent/[0.03] cursor-pointer",
          state.phase === "dragover" &&
            "border-accent bg-accent/[0.06] scale-[1.01]",
          (state.phase === "uploading" || state.phase === "extracting") &&
            "border-border bg-muted cursor-default",
          state.phase === "error" &&
            "border-destructive/40 bg-destructive/[0.03] cursor-pointer",
          state.phase === "success" &&
            "border-relationship/40 bg-relationship/[0.03] cursor-default",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          onChange={handleFileChange}
          className="sr-only"
          tabIndex={-1}
        />

        {/* Content by phase */}
        {state.phase === "idle" && <IdleContent />}
        {state.phase === "dragover" && <DragoverContent />}
        {state.phase === "uploading" && <UploadingContent />}
        {state.phase === "extracting" && <ExtractingContent />}
        {state.phase === "success" && <SuccessContent />}
        {state.phase === "error" && (
          <ErrorContent message={state.message} />
        )}
      </button>

      {/* Retry link after error */}
      {state.phase === "error" && (
        <p className="text-center text-xs text-muted-foreground mt-3">
          <button
            onClick={() => setState({ phase: "idle" })}
            className="underline underline-offset-2 hover:text-foreground transition-colors"
          >
            Try again
          </button>
        </p>
      )}
    </div>
  )
}

/* ── Sub-components ── */

function IdleContent() {
  return (
    <>
      <UploadIcon className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
      <p className="font-medium text-foreground mb-1">
        Drop your Gallup report here
      </p>
      <p className="text-sm text-muted-foreground mb-4">
        or click to browse your files
      </p>
      <span className="text-xs text-muted-foreground bg-muted border border-border px-3 py-1 rounded-full">
        PDF · up to 15 MB
      </span>
    </>
  )
}

function DragoverContent() {
  return (
    <>
      <UploadIcon className="w-10 h-10 text-accent mx-auto mb-4" />
      <p className="font-medium text-accent">Release to upload</p>
    </>
  )
}

function UploadingContent() {
  return (
    <>
      <Spinner className="w-8 h-8 text-accent mx-auto mb-4" />
      <p className="font-medium text-foreground mb-1">Uploading…</p>
      <p className="text-sm text-muted-foreground">Sending your report to the server</p>
    </>
  )
}

function ExtractingContent() {
  return (
    <>
      <Spinner className="w-8 h-8 text-accent mx-auto mb-4" />
      <p className="font-medium text-foreground mb-1">Reading your report…</p>
      <p className="text-sm text-muted-foreground">
        Identifying your 34 CliftonStrengths themes
      </p>
    </>
  )
}

function SuccessContent() {
  return (
    <>
      <CheckIcon className="w-10 h-10 text-relationship mx-auto mb-4" />
      <p className="font-medium text-foreground mb-1">Report ready!</p>
      <p className="text-sm text-muted-foreground">Taking you to your insights…</p>
    </>
  )
}

function ErrorContent({ message }: { message: string }) {
  return (
    <>
      <AlertIcon className="w-10 h-10 text-destructive mx-auto mb-4" />
      <p className="font-medium text-foreground mb-1">Something went wrong</p>
      <p className="text-sm text-muted-foreground max-w-xs mx-auto">{message}</p>
    </>
  )
}

/* ── Icons ── */

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
    </svg>
  )
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  )
}

function AlertIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
    </svg>
  )
}

function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cn(className, "animate-spin")} fill="none" viewBox="0 0 24 24" aria-hidden>
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}
