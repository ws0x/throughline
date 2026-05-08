import { pgTable, uuid, text, jsonb, timestamp, pgEnum } from "drizzle-orm/pg-core"
import type { ThemeEntry, InsightContent, InsightSection } from "@/types"

/* ── Enums ── */

export const reportStatusEnum = pgEnum("report_status", [
  "pending",
  "processing",
  "complete",
  "failed",
])

/* ── Users ── */

export const users = pgTable("users", {
  id:        uuid("id").primaryKey().defaultRandom(),
  clerkId:   text("clerk_id").notNull().unique(),
  email:     text("email").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
})

/* ── Reports ── */

export const reports = pgTable("reports", {
  id:          uuid("id").primaryKey().defaultRandom(),
  userId:      uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  fileName:    text("file_name").notNull(),
  blobUrl:     text("blob_url").notNull(),
  /** Extracted ThemeEntry[34] — populated after extraction */
  themes:      jsonb("themes").$type<ThemeEntry[]>(),
  status:      reportStatusEnum("status").notNull().default("pending"),
  uploadedAt:  timestamp("uploaded_at").notNull().defaultNow(),
  processedAt: timestamp("processed_at"),
})

/* ── Insights ── */

export const insights = pgTable("insights", {
  id:          uuid("id").primaryKey().defaultRandom(),
  reportId:    uuid("report_id")
    .notNull()
    .references(() => reports.id, { onDelete: "cascade" }),
  section:     text("section").$type<InsightSection>().notNull(),
  /** Full InsightContent JSON */
  content:     jsonb("content").$type<InsightContent>().notNull(),
  generatedAt: timestamp("generated_at").notNull().defaultNow(),
  model:       text("model").notNull(),
})

/* ── Inferred types for use in application code ── */

export type User          = typeof users.$inferSelect
export type NewUser       = typeof users.$inferInsert
export type Report        = typeof reports.$inferSelect
export type NewReport     = typeof reports.$inferInsert
export type Insight       = typeof insights.$inferSelect
export type NewInsight    = typeof insights.$inferInsert
