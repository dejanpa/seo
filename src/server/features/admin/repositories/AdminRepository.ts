import { and, asc, count, desc, eq, isNull, like, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  member,
  organization,
  organizationSubscriptions,
  plans,
  projects,
  user,
} from "@/db/schema";

// The console lists organizations, not users: one user owns exactly one
// workspace (enforced in auth-config.ts), but delegated deployments
// (local_noauth, Cloudflare Access) create organizations with no member row at
// all. Driving the query from `organization` keeps those visible, and the left
// joins keep a workspace listed before its subscription row exists — a user who
// signed up but has not made a billable call yet.
const workspaceColumns = {
  userId: user.id,
  userName: user.name,
  userEmail: user.email,
  emailVerified: user.emailVerified,
  role: user.role,
  banned: user.banned,
  userCreatedAt: user.createdAt,
  organizationId: organization.id,
  organizationName: organization.name,
  organizationSlug: organization.slug,
  organizationCreatedAt: organization.createdAt,
  planId: organizationSubscriptions.planId,
  planSlug: plans.slug,
  planName: plans.name,
  status: organizationSubscriptions.status,
  monthlyRemaining: organizationSubscriptions.monthlyRemaining,
  topupRemaining: organizationSubscriptions.topupRemaining,
  currentPeriodEnd: organizationSubscriptions.currentPeriodEnd,
};

function workspaceQuery() {
  return db
    .select(workspaceColumns)
    .from(organization)
    .leftJoin(member, eq(member.organizationId, organization.id))
    .leftJoin(user, eq(user.id, member.userId))
    .leftJoin(
      organizationSubscriptions,
      eq(organizationSubscriptions.organizationId, organization.id),
    )
    .leftJoin(plans, eq(plans.id, organizationSubscriptions.planId));
}

function searchFilter(search: string | undefined) {
  const term = search?.trim().toLowerCase();
  if (!term) return undefined;
  const pattern = `%${term}%`;
  return or(
    like(sql`lower(${user.email})`, pattern),
    like(sql`lower(${user.name})`, pattern),
    like(sql`lower(${organization.name})`, pattern),
  );
}

async function listWorkspaces(args: {
  search?: string;
  limit: number;
  offset: number;
}) {
  return workspaceQuery()
    .where(searchFilter(args.search))
    .orderBy(desc(organization.createdAt), asc(organization.id))
    .limit(args.limit)
    .offset(args.offset);
}

async function countWorkspaces(search?: string) {
  const [row] = await db
    .select({ value: count() })
    .from(organization)
    .leftJoin(member, eq(member.organizationId, organization.id))
    .leftJoin(user, eq(user.id, member.userId))
    .where(searchFilter(search));
  return row?.value ?? 0;
}

async function getWorkspace(organizationId: string) {
  const [row] = await workspaceQuery()
    .where(eq(organization.id, organizationId))
    .limit(1);
  return row ?? null;
}

async function findOrganizationIdForUser(userId: string) {
  const [row] = await db
    .select({ organizationId: member.organizationId })
    .from(member)
    .where(eq(member.userId, userId))
    .orderBy(asc(member.createdAt))
    .limit(1);
  return row?.organizationId ?? null;
}

async function listWorkspaceProjects(organizationId: string) {
  return db
    .select({
      id: projects.id,
      name: projects.name,
      domain: projects.domain,
      createdAt: projects.createdAt,
    })
    .from(projects)
    .where(
      and(
        eq(projects.organizationId, organizationId),
        isNull(projects.archivedAt),
      ),
    )
    .orderBy(desc(projects.createdAt));
}

async function getUserById(userId: string) {
  const [row] = await db
    .select()
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  return row ?? null;
}

async function setUserRole(userId: string, role: string | null) {
  await db.update(user).set({ role }).where(eq(user.id, userId));
}

async function countAdmins() {
  const [row] = await db
    .select({ value: count() })
    .from(user)
    .where(like(sql`lower(${user.role})`, "%admin%"));
  return row?.value ?? 0;
}

export const AdminRepository = {
  listWorkspaces,
  countWorkspaces,
  getWorkspace,
  findOrganizationIdForUser,
  listWorkspaceProjects,
  getUserById,
  setUserRole,
  countAdmins,
} as const;
