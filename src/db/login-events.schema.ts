import { sql } from "drizzle-orm";
import { index, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { user } from "./better-auth-schema";

// One row per successful sign-in, written when Better Auth creates a session.
// The `session` table cannot answer "when did this account sign in" for the
// admin console: rows there are live sessions only, deleted on sign-out and on
// expiry. This table is append-only and outlives them.
export const userLoginEvents = sqliteTable(
  "user_login_events",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(current_timestamp)`),
  },
  (table) => [
    index("user_login_events_user_created_idx").on(
      table.userId,
      table.createdAt,
    ),
  ],
);
