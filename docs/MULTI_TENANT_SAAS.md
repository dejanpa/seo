# Running OpenSEO as a multi-tenant SaaS

This describes the setup where strangers sign up on your deployment, each gets
their own isolated workspace, and you decide from an admin console what each of
them may use.

Nothing here is a separate product mode — it is the hosted auth mode plus the
local billing provider.

## What you get

- **Isolated workspaces.** Every signup creates its own organization. Projects,
  keywords, audits, rank tracking and Search Console connections are all scoped
  to `organization_id`, so one customer cannot read another's data.
- **Plans you own.** `plans`, `plan_features` and `organization_subscriptions`
  live in your database. A plan carries a monthly credit allowance and the set
  of features it unlocks.
- **An admin console** at `/admin`: every workspace, the plan it is on, its
  credit balance and history, and the controls to change any of it.

## What you do not get

There is no payment collection. Plans are assigned by an administrator. If you
want customers to self-serve an upgrade, you have to add a payment provider —
the schema leaves room for it, but no checkout exists.

## Required configuration

| Variable                                | Value             | Why                                                                                                                    |
| --------------------------------------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `AUTH_MODE`                             | `hosted`          | Email/password + Google signup, verification, captcha. Must be set for both the client build and the runtime.          |
| `BILLING_PROVIDER`                      | `local`           | Plans and credits come from your database instead of Autumn.                                                           |
| `ADMIN_EMAILS`                          | `you@example.com` | Comma-separated. These are always administrators, whatever the database says — this is how the first operator gets in. |
| `DATABASE_PROVIDER`                     | `postgres`        | Recommended for a real multi-tenant deployment. D1 also works.                                                         |
| `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` |                   | Standard hosted auth requirements.                                                                                     |
| `DATAFORSEO_API_KEY`                    |                   | You pay DataForSEO; customers spend the credits you grant them.                                                        |

## Setup

```bash
# 1. Apply migrations
npm run db:migrate:pg            # or db:migrate:prod for D1

# 2. Create the starting plans (free / pro / agency)
POSTGRES_DATABASE_URL=postgres://... npm run seed:plans -- --postgres
# D1: npm run seed:plans

# 3. Deploy with the variables above set
npm run deploy:postgres
```

Sign in with an `ADMIN_EMAILS` address and open **Admin** from the account menu
in the sidebar.

## How plans work

A plan grants **feature keys**. Two of them control broad access:

- `managed_service_access` — the floor for using the service at all.
- `paid_plan` — paid-only surfaces (AI Visibility, scheduled rank checks, site
  audits).

The rest map one-to-one onto the tools: `keyword_research`, `domain_overview`,
`backlinks`, `site_audit`, `rank_tracking`, `ai_citations`,
`ai_prompt_responses`, `local_seo`, `agent`. A workspace whose plan omits one of
these is refused **before** the call reaches DataForSEO, so a denied feature
costs you nothing.

Credits are the shared spend pool: **1000 credits = $1** of DataForSEO spend at
list price, with the platform markup applied on top. A plan's monthly allowance
is granted at the start of each billing period and does not roll over; top-up
credits granted by an administrator do roll over and are spent only after the
monthly allowance is gone.

Periods renew lazily — the first request after a period ends rolls it forward
and re-grants the allowance. No cron job is involved.

## Administering a workspace

From `/admin` you can:

- **Assign a plan**, optionally starting a fresh period with that plan's credits.
- **Adjust credits** in either bucket, with a note recorded on the ledger.
- **Suspend a workspace** — it keeps its data and balances but is refused by
  every entitlement check until reactivated.
- **Promote or revoke administrators.** The last administrator cannot be
  demoted, and an `ADMIN_EMAILS` administrator can only be removed by editing
  that variable.

Every credit movement — period grants, spends, operator adjustments — is
appended to `credit_ledger_entries` and shown on the workspace page, so you can
always answer "where did the credits go".

## Switching back to Autumn

Unset `BILLING_PROVIDER` (or set it to `autumn`). The admin console stays
readable but refuses plan and credit changes, since Autumn owns them there.

## One user, one workspace

Users cannot create or be invited into a second workspace
(`allowUserToCreateOrganization: false`, `invitationLimit: 0` in
`src/lib/auth-config.ts`). This is a billing invariant, not a UI limitation:
MCP API keys bill the user's first organization. Read the comment in that file
before lifting it.
