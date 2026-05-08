"use client"

import React from "react"

type Props = {
  children: React.ReactNode
  fallback?: React.ReactNode
  section?: string
}

type State = {
  hasError: boolean
  error: Error | null
}

/**
 * ErrorBoundary — catches render errors in insight sections.
 * Surfaces a minimal, non-alarming error state rather than
 * crashing the whole report page.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(
      `[ErrorBoundary] Section "${this.props.section ?? "unknown"}" crashed:`,
      error.message,
      info.componentStack,
    )
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="bg-card border border-border rounded-2xl p-7">
          <p className="text-sm font-medium text-foreground mb-1">
            This section couldn&apos;t load
          </p>
          <p className="text-xs text-muted-foreground mb-3">
            {this.state.error?.message ?? "An unexpected error occurred."}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="text-xs font-medium text-accent hover:text-accent/80 transition-colors"
          >
            Try again
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
