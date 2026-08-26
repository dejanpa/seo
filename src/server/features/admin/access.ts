import { getAuthMode } from "@/lib/auth-mode";
import type { EnsuredUserContext } from "@/middleware/ensure-user/types";
import { AdminRepository } from "@/server/features/admin/repositories/AdminRepository";
import {
  isBootstrapAdminEmail,
  roleListIncludesAdmin,
} from "@/server/features/admin/roles";
import { AppError } from "@/server/lib/errors";
import { getOptionalEnvValue } from "@/server/lib/runtime-env";

export async function isAdminUser(
  context: Pick<EnsuredUserContext, "userId" | "userEmail">,
): Promise<boolean> {
  // local_noauth is a private single-operator deployment with no login at all —
  // the one user there is the administrator by definition. Every other mode has
  // real identities, so admin has to be granted explicitly.
  if (getAuthMode(await getOptionalEnvValue("AUTH_MODE")) === "local_noauth") {
    return true;
  }

  if (await isBootstrapAdminEmail(context.userEmail)) return true;

  const record = await AdminRepository.getUserById(context.userId);
  return roleListIncludesAdmin(record?.role);
}

export async function assertAdminUser(
  context: Pick<EnsuredUserContext, "userId" | "userEmail">,
) {
  if (await isAdminUser(context)) return;
  throw new AppError("FORBIDDEN", "Administrator access required");
}
