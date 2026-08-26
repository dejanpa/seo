import { sql } from "drizzle-orm";
import { index, pgTable, text } from "drizzle-orm/pg-core";
import { user } from "./better-auth-schema";

// Postgres mirror of ../login-events.schema.ts.
const isoNow = sql`to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`;

export const userLoginEvents = pgTable(
  "user_login_events",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: text("created_at").notNull().default(isoNow),
  },
  (table) => [
    index("user_login_events_user_created_idx").on(
      table.userId,
      table.createdAt,
    ),
  ],
);
