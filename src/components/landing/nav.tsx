"use client"

import Link from "next/link"
import { useAuth } from "@clerk/nextjs"
import { SignInButton, SignUpButton, SignOutButton, UserButton } from "@clerk/nextjs"

export default function LandingNav() {
  const { isSignedIn, isLoaded } = useAuth()

  return (
    <nav className="flex items-center justify-between px-6 sm:px-10 py-6 max-w-5xl mx-auto w-full">
      {/* Wordmark */}
      <Link
        href="/"
        className="font-display text-xl font-semibold text-foreground tracking-tight hover:opacity-80 transition-opacity"
      >
        Throughline
      </Link>

      {/* Auth controls */}
      <div className="flex items-center gap-2 min-h-[36px]">
        {/* Skeleton to prevent layout shift while Clerk loads */}
        {!isLoaded && <div className="w-28 h-8 rounded-lg bg-muted animate-pulse" />}

        {isLoaded && !isSignedIn && (
          <>
            <SignInButton mode="modal">
              <button className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200 px-3 py-2 rounded-lg hover:bg-muted">
                Sign in
              </button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button className="text-sm font-medium bg-foreground text-background px-4 py-2 rounded-lg hover:bg-foreground/90 transition-colors duration-200">
                Get started
              </button>
            </SignUpButton>
          </>
        )}

        {isLoaded && isSignedIn && (
          <>
            <Link
              href="/dashboard"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200 px-3 py-2 rounded-lg hover:bg-muted mr-1"
            >
              Dashboard
            </Link>
            <UserButton />
          </>
        )}
      </div>
    </nav>
  )
}
