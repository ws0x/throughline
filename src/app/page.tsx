import Link from "next/link"
import { Show } from "@clerk/nextjs"
import LandingNav from "@/components/landing/nav"
import { DOMAIN_COLORS } from "@/types"

/* ─── Static data ─── */

const DOMAINS = ["executing", "influencing", "relationship", "strategic"] as const

const FEATURES = [
  {
    domain: "executing" as const,
    label: "Actionable",
    title: "13 insight categories",
    description:
      "From productivity style to stress patterns — every section surfaces something you can act on today, this week, or this quarter.",
  },
  {
    domain: "strategic" as const,
    label: "Grounded",
    title: "Built on your exact themes",
    description:
      "Every insight references your specific ranked themes by name. Nothing generic. Nothing that could apply to someone with a different profile.",
  },
  {
    domain: "relationship" as const,
    label: "Human",
    title: "Written for people, not reports",
    description:
      "Direct, second-person language. No jargon, no corporate tone. It reads like a trusted advisor who actually studied your results.",
  },
]

const SECTIONS = [
  "Core Strength Identity",
  "Productivity Style",
  "Career Alignment",
  "Blind Spots & Overuse Risks",
  "Decision-Making Patterns",
  "Collaboration Style",
  "Stress Patterns",
  "Daily Action Plan",
]

/* ─── Page ─── */

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background">
      <LandingNav />

      {/* ── Hero ── */}
      <section className="max-w-5xl mx-auto px-6 sm:px-10 pt-16 pb-28">
        {/* Domain signal */}
        <div className="flex items-center gap-2.5 mb-10">
          {DOMAINS.map((domain) => (
            <span
              key={domain}
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: DOMAIN_COLORS[domain] }}
              aria-hidden="true"
            />
          ))}
          <span className="text-xs font-medium text-muted-foreground tracking-widest uppercase ml-1">
            CliftonStrengths 34
          </span>
        </div>

        {/* Headline */}
        <h1 className="font-display text-5xl sm:text-6xl lg:text-[4.5rem] font-semibold text-foreground leading-[1.07] tracking-tight mb-7 max-w-3xl">
          Turn your strengths report into a life operating&nbsp;manual.
        </h1>

        {/* Sub-headline */}
        <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed mb-12 max-w-2xl">
          Upload your Gallup CliftonStrengths PDF and receive 13 sections of
          clear, personalized insight — your productivity style, blind spots,
          career alignment, and a daily action plan built around your exact
          themes.
        </p>

        {/* CTA row */}
        <div className="flex flex-wrap items-center gap-4">
          <Show
            when="signed-out"
            fallback={
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 bg-foreground text-background px-6 py-3.5 rounded-xl text-sm font-medium hover:bg-foreground/90 transition-colors duration-200"
              >
                Go to dashboard
                <ArrowRight />
              </Link>
            }
          >
            <Link
              href="/sign-up"
              className="inline-flex items-center gap-2 bg-foreground text-background px-6 py-3.5 rounded-xl text-sm font-medium hover:bg-foreground/90 transition-colors duration-200"
            >
              Upload your report
              <ArrowRight />
            </Link>
          </Show>
          <p className="text-sm text-muted-foreground">
            Free to try · No credit card
          </p>
        </div>
      </section>

      {/* ── Feature cards ── */}
      <section className="max-w-5xl mx-auto px-6 sm:px-10 pb-24">
        <div className="grid sm:grid-cols-3 gap-5">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="bg-card rounded-2xl p-7 border border-border"
            >
              <span
                className="inline-block text-xs font-semibold px-2.5 py-1 rounded-lg mb-5"
                style={{
                  backgroundColor: `${DOMAIN_COLORS[feature.domain]}1A`,
                  color: DOMAIN_COLORS[feature.domain],
                }}
              >
                {feature.label}
              </span>
              <h3 className="font-display text-lg font-semibold text-foreground mb-2.5 leading-snug">
                {feature.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Section preview strip ── */}
      <section className="border-t border-border">
        <div className="max-w-5xl mx-auto px-6 sm:px-10 py-16">
          <p className="text-xs font-medium text-muted-foreground tracking-widest uppercase mb-8">
            What you&rsquo;ll receive
          </p>
          <div className="flex flex-wrap gap-3">
            {SECTIONS.map((section) => (
              <span
                key={section}
                className="text-sm text-muted-foreground bg-muted px-3.5 py-1.5 rounded-full border border-border"
              >
                {section}
              </span>
            ))}
            <span className="text-sm text-muted-foreground bg-muted px-3.5 py-1.5 rounded-full border border-border">
              +&nbsp;5&nbsp;more
            </span>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border">
        <div className="max-w-5xl mx-auto px-6 sm:px-10 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="font-display text-sm font-semibold text-foreground">
            Throughline
          </span>
          <p className="text-xs text-muted-foreground">
            Built with Gallup&rsquo;s CliftonStrengths framework. Not affiliated
            with Gallup, Inc.
          </p>
        </div>
      </footer>
    </main>
  )
}

/* ── Inline icon ── */
function ArrowRight() {
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
      />
    </svg>
  )
}
