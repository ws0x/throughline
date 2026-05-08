import type { Metadata } from "next"
import { Inter, Fraunces } from "next/font/google"
import { ClerkProvider } from "@clerk/nextjs"
import "./globals.css"

/* ─── Fonts ─── */
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
})

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  axes: ["opsz"], // optical size axis — crisp at large display sizes
})

/* ─── Metadata ─── */
export const metadata: Metadata = {
  title: {
    default: "Throughline — Your Strengths, Clarified",
    template: "%s — Throughline",
  },
  description:
    "Turn your Gallup CliftonStrengths 34 report into a personalized life operating manual. " +
    "13 sections of clear, actionable insight — built on your exact themes.",
  keywords: [
    "CliftonStrengths",
    "Gallup",
    "strengths assessment",
    "personality insights",
    "career alignment",
    "productivity",
  ],
  openGraph: {
    title: "Throughline — Your Strengths, Clarified",
    description:
      "Upload your CliftonStrengths PDF and get 13 sections of personalized, actionable insight.",
    type: "website",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        className={`${inter.variable} ${fraunces.variable}`}
        suppressHydrationWarning
      >
        <body className="min-h-screen antialiased">{children}</body>
      </html>
    </ClerkProvider>
  )
}
