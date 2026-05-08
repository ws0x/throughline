import { SignUp } from "@clerk/nextjs"
import Link from "next/link"

export const metadata = {
  title: "Create account",
}

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Minimal nav */}
      <div className="px-6 sm:px-10 py-6">
        <Link
          href="/"
          className="font-display text-xl font-semibold text-foreground tracking-tight hover:opacity-80 transition-opacity"
        >
          Throughline
        </Link>
      </div>

      {/* Clerk sign-up widget, centered */}
      <div className="flex-1 flex items-center justify-center px-4 pb-16">
        <SignUp />
      </div>
    </div>
  )
}
