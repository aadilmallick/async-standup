import { auth, currentUser } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import {
  organizationMembers,
  organizations,
  recurringStandupSchedules,
  standupSessions,
  standupTemplates,
  users,
  type Organization,
  type RecurringStandupSchedule,
  type StandupSession,
  type StandupTemplate,
  type User,
} from "@/db/schema";
import { generatePublicSlug } from "@/lib/slugs";

export class AuthError extends Error {
  status = 401;
  constructor(message = "Not authenticated") {
    super(message);
    this.name = "AuthError";
  }
}

export class AccessError extends Error {
  status = 403;
  constructor(message = "Forbidden") {
    super(message);
    this.name = "AccessError";
  }
}

export class NotFoundError extends Error {
  status = 404;
  constructor(message = "Not found") {
    super(message);
    this.name = "NotFoundError";
  }
}

export interface AuthContext {
  user: User;
  organization: Organization;
}

/**
 * Resolves the current Clerk user, upserting a local `users` row on first
 * sight. Throws AuthError when unauthenticated.
 */
export async function getCurrentUserOrThrow(): Promise<User> {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) throw new AuthError();

  const existing = await db
    .select()
    .from(users)
    .where(eq(users.clerkUserId, clerkUserId))
    .limit(1);
  if (existing[0]) return existing[0];

  const cu = await currentUser();
  const email =
    cu?.emailAddresses.find((e) => e.id === cu.primaryEmailAddressId)
      ?.emailAddress ??
    cu?.emailAddresses[0]?.emailAddress ??
    "";
  const name =
    [cu?.firstName, cu?.lastName].filter(Boolean).join(" ") ||
    cu?.username ||
    null;

  const inserted = await db
    .insert(users)
    .values({ clerkUserId, email, name })
    .onConflictDoUpdate({
      target: users.clerkUserId,
      set: { email, name, updatedAt: new Date() },
    })
    .returning();
  return inserted[0];
}

/**
 * Ensures the current user exists and belongs to an organization, creating a
 * default workspace on first login (MVP single-org-per-user model).
 */
export async function ensureUserAndOrg(): Promise<AuthContext> {
  const user = await getCurrentUserOrThrow();

  const membership = await db
    .select()
    .from(organizationMembers)
    .where(eq(organizationMembers.userId, user.id))
    .limit(1);

  if (membership[0]) {
    const org = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, membership[0].organizationId))
      .limit(1);
    if (org[0]) return { user, organization: org[0] };
  }

  const orgName = user.name ? `${user.name}'s Workspace` : "My Workspace";
  const created = await db
    .insert(organizations)
    .values({ name: orgName, slug: `ws-${generatePublicSlug()}` })
    .returning();
  const organization = created[0];

  await db
    .insert(organizationMembers)
    .values({
      organizationId: organization.id,
      userId: user.id,
      role: "owner",
    })
    .onConflictDoNothing();

  return { user, organization };
}

/** Returns the current auth context (user + organization). */
export async function getCurrentOrganizationOrThrow(): Promise<AuthContext> {
  return ensureUserAndOrg();
}

/** Throws AccessError unless the user is a member of the organization. */
export async function assertUserCanAccessOrganization(
  userId: string,
  organizationId: string
): Promise<void> {
  const membership = await db
    .select({ id: organizationMembers.id })
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.userId, userId),
        eq(organizationMembers.organizationId, organizationId)
      )
    )
    .limit(1);
  if (!membership[0]) throw new AccessError();
}

/** Loads a template, asserting it belongs to the caller's organization. */
export async function assertTemplateAccess(
  templateId: string
): Promise<AuthContext & { template: StandupTemplate }> {
  const ctx = await getCurrentOrganizationOrThrow();
  const rows = await db
    .select()
    .from(standupTemplates)
    .where(
      and(
        eq(standupTemplates.id, templateId),
        eq(standupTemplates.organizationId, ctx.organization.id)
      )
    )
    .limit(1);
  if (!rows[0]) throw new NotFoundError("Template not found");
  return { ...ctx, template: rows[0] };
}

/** Loads a session, asserting it belongs to the caller's organization. */
export async function assertSessionAccess(
  sessionId: string
): Promise<AuthContext & { session: StandupSession }> {
  const ctx = await getCurrentOrganizationOrThrow();
  const rows = await db
    .select()
    .from(standupSessions)
    .where(
      and(
        eq(standupSessions.id, sessionId),
        eq(standupSessions.organizationId, ctx.organization.id)
      )
    )
    .limit(1);
  if (!rows[0]) throw new NotFoundError("Session not found");
  return { ...ctx, session: rows[0] };
}

/** Loads a recurring schedule, asserting org ownership. */
export async function assertScheduleAccess(
  scheduleId: string
): Promise<AuthContext & { schedule: RecurringStandupSchedule }> {
  const ctx = await getCurrentOrganizationOrThrow();
  const rows = await db
    .select()
    .from(recurringStandupSchedules)
    .where(
      and(
        eq(recurringStandupSchedules.id, scheduleId),
        eq(recurringStandupSchedules.organizationId, ctx.organization.id)
      )
    )
    .limit(1);
  if (!rows[0]) throw new NotFoundError("Schedule not found");
  return { ...ctx, schedule: rows[0] };
}
