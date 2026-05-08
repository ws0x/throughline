import { neon } from "@neondatabase/serverless"
import { drizzle } from "drizzle-orm/neon-http"
import * as schema from "./schema"

/**
 * Lazy Neon + Drizzle client.
 *
 * Uses the HTTP driver (neon-http) which is the correct choice for
 * Vercel serverless functions — no persistent TCP connections.
 */
function getDb() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is not set. " +
        "Add your Neon connection string to .env.local — " +
        "get it from https://console.neon.tech",
    )
  }

  const sql = neon(databaseUrl)
  return drizzle(sql, { schema })
}

// Singleton per cold-start to avoid re-initializing on every request
let _db: ReturnType<typeof getDb> | null = null

export function getDatabase() {
  if (!_db) {
    _db = getDb()
  }
  return _db
}

// Re-export schema types for convenience
export * from "./schema"
