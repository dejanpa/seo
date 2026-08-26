import { db } from "@/db";
import { userLoginEvents } from "@/db/schema";

// Truncated because the column is only ever read back as a device hint in the
// admin console, and some clients send very long UA strings.
const MAX_USER_AGENT_LENGTH = 400;

/**
 * Append one sign-in to the audit log. Called from Better Auth's
 * `session.create.after` hook, so a failure here must never break the login —
 * the log is diagnostic, the session is the product.
 */
export async function recordLoginEvent(session: {
  userId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  impersonatedBy?: string | null;
}) {
  // An impersonated session is an admin acting as the user, not the user
  // signing in; recording it would make the log lie.
  if (session.impersonatedBy) return;

  try {
    await db.insert(userLoginEvents).values({
      id: crypto.randomUUID(),
      userId: session.userId,
      ipAddress: session.ipAddress || null,
      userAgent: session.userAgent?.slice(0, MAX_USER_AGENT_LENGTH) || null,
      // Written here rather than left to the column default: SQLite's
      // current_timestamp has no timezone marker, which the browser would then
      // read as local time.
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to record login event:", {
      userId: session.userId,
      error,
    });
  }
}
