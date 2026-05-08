import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/report(.*)",
  "/api/upload(.*)",
  "/api/generate(.*)",
  "/api/extract(.*)",
  "/api/export(.*)",
])

// These routes are public — no auth required
// const isPublicRoute = createRouteMatcher([
//   "/api/webhooks/(.*)",
//   "/api/health",
// ])

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
}
