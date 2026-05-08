import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"

/**
 * Dashboard layout — all routes inside (dashboard) are protected.
 * The middleware handles the primary redirect, but this is a
 * server-side safety net for direct navigation.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { userId } = await auth()

  if (!userId) {
    redirect("/sign-in")
  }

  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  )
}
