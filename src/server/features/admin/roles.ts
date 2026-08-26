import { getOptionalEnvValue } from "@/server/lib/runtime-env";

export const ADMIN_ROLE = "admin";

/** Better Auth stores `role` as a comma-separated list. */
export function roleListIncludesAdmin(role: string | null | undefined) {
  if (!role) return false;
  return role
    .split(",")
    .map((entry) => entry.trim())
    .includes(ADMIN_ROLE);
}

/**
 * Bootstrap escape hatch. The first operator has no way to grant themselves the
 * admin role through the UI they cannot open yet, and demoting the last admin
 * would otherwise lock everyone out permanently, so these emails are always
 * admins regardless of what the database says.
 */
async function getBootstrapAdminEmails(): Promise<ReadonlySet<string>> {
  const raw = await getOptionalEnvValue("ADMIN_EMAILS");
  if (!raw) return new Set<string>();
  return new Set(
    raw
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export async function isBootstrapAdminEmail(email: string) {
  return (await getBootstrapAdminEmails()).has(email.trim().toLowerCase());
}
