import { z } from "zod";
import { PLAN_FEATURE_KEYS } from "@/shared/plan-features";

const planFeatureKeySchema = z.enum(PLAN_FEATURE_KEYS);
const organizationIdSchema = z.string().min(1);
const planIdSchema = z.string().min(1);
const noteSchema = z.string().trim().max(500).optional();

export const listWorkspacesSchema = z.object({
  search: z.string().trim().max(200).optional(),
  page: z.number().int().min(1).optional(),
});

export const workspaceDetailSchema = z.object({
  organizationId: organizationIdSchema,
});

const planBodySchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(500).nullish(),
  monthlyCredits: z.number().int().min(0).max(100_000_000),
  priceUsdCents: z.number().int().min(0).max(10_000_000),
  sortOrder: z.number().int().min(0).max(1000),
  featureKeys: z.array(planFeatureKeySchema).max(PLAN_FEATURE_KEYS.length),
});

export const createPlanSchema = planBodySchema.extend({
  // Lowercase handle used by seeds and support scripts; kept URL-safe.
  slug: z
    .string()
    .trim()
    .min(1)
    .max(40)
    .regex(/^[a-z0-9][a-z0-9-]*$/, "Use lowercase letters, digits and dashes"),
});

export const updatePlanSchema = planBodySchema.extend({
  planId: planIdSchema,
});

export const planIdActionSchema = z.object({ planId: planIdSchema });

export const setPlanArchivedSchema = z.object({
  planId: planIdSchema,
  archived: z.boolean(),
});

export const assignPlanSchema = z.object({
  organizationId: organizationIdSchema,
  planId: planIdSchema,
  // Start a fresh billing period with the new plan's allowance. Off when an
  // operator is only correcting which plan a workspace is recorded on.
  resetCredits: z.boolean(),
  note: noteSchema,
});

export const adjustCreditsSchema = z.object({
  organizationId: organizationIdSchema,
  monthlyDelta: z.number().int().min(-100_000_000).max(100_000_000),
  topupDelta: z.number().int().min(-100_000_000).max(100_000_000),
  note: noteSchema,
});

export const setWorkspaceStatusSchema = z.object({
  organizationId: organizationIdSchema,
  status: z.enum(["active", "suspended"]),
  note: noteSchema,
});

export const setUserAdminSchema = z.object({
  userId: z.string().min(1),
  isAdmin: z.boolean(),
});
