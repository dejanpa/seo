# Syncing with upstream open-seo

This fork tracks [every-app/open-seo](https://github.com/every-app/open-seo)
(`origin`) and adds local billing, the admin console, Rankloupe branding and a
few research features on top. It is kept up to date by **merging** upstream,
not by rebasing or copying, so each sync only has to deal with what upstream
changed since the last one.

## Doing a sync

```bash
git fetch origin
git switch -c upstream-sync-<version> <current fork branch>
git merge origin/main
```

Most of the fork lives in files upstream does not have, so conflicts come from
the few places where it has to touch upstream files:

| Upstream file                                                                         | What the fork adds                                                                                          |
| ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `src/server/billing/subscription.ts`                                                  | Replaced by a dispatcher. Upstream's version lives on in `autumn-subscription.ts`: take their change there. |
| `src/server/billing/billing-account.ts`, `src/server/workflows/RankCheckWorkflow.ts`  | Read the local provider when `BILLING_PROVIDER=local`.                                                      |
| `src/server/lib/dataforseo/client.ts`, `pricing.ts`                                   | A credit feature on every entry (the value upstream derives from the path) and the fork's seven endpoints.  |
| `src/lib/auth-config.ts`, `src/lib/auth.ts`                                           | The Better Auth `admin()` plugin and the sign-in log hook.                                                  |
| `src/client/features/integrations/GoogleConnectionCard.tsx`, `src/routes/_app/ai.tsx` | Plan locks.                                                                                                 |
| `src/client/features/keywords/page/*`, `.../state/useKeywordResearchController.ts`    | The keyword panels, search plan and PDF button.                                                             |
| Anything user-facing that says "OpenSEO"                                              | `PRODUCT_NAME` from `src/shared/brand.ts`.                                                                  |

After resolving:

- Run `pnpm sync-plugin-skills` and re-apply the Rankloupe wording to any new
  public skill in `.agents/skills` (see the list in
  `scripts/sync-plugin-skills.mjs`).
- `grep -rn "OpenSEO\\|openseo.so" src` for new user-facing strings and links.
  Leave the `OpenSEO-Audit` / `OpenSEO-Onboarding` crawler user agents alone:
  site owners allowlist them.
- If upstream added migrations with the same numbers as fork ones, regenerate
  the fork's with `pnpm db:generate` so they come after upstream's, and follow
  the D1 rename step below when deploying.
- `pnpm exec tsc --noEmit && pnpm exec vitest run && pnpm lint && pnpm knip &&
pnpm build`, then `pnpm test:e2e:keywords` and `pnpm test:e2e:domain`.

## Deploying the v0.1.12 sync to the Docker deployment

This sync renamed the fork's two migrations so they run after upstream's:

| Was (already applied in production) | Now                          |
| ----------------------------------- | ---------------------------- |
| `0043_plans_and_admin.sql`          | `0055_plans_and_admin.sql`   |
| `0044_user_login_events.sql`        | `0056_user_login_events.sql` |

Their SQL is identical, but `wrangler d1 migrations apply` remembers migrations
by file name. Without the rename below, the new container's entrypoint tries to
create the plans tables again, fails, and restarts in a loop. Upstream's own
`0043`–`0054` migrations have different names and apply normally.

1. **Check the image setting.** `compose.yaml` runs `OPEN_SEO_IMAGE`, which
   defaults to upstream's published image (upstream code, without this fork).
   Production must run an image built from this repository:

   ```bash
   docker build -f deploy/docker/Dockerfile -t rankloupe:v0.1.12 .
   ```

   and `.env` must have `OPEN_SEO_IMAGE=rankloupe:v0.1.12`. The Dockerfile moved
   from the repository root to `deploy/docker/` in this sync.

2. **Stop the old container and back up the database.** The old image is
   still the one in `.env`, so `docker compose run` uses it with the data
   volume attached:

   ```bash
   docker compose stop open-seo
   docker compose run --rm -T --no-deps --entrypoint sh open-seo \
     -c 'tar czf - .wrangler/state' > d1-backup-$(date +%F).tgz
   ```

3. **Rename the two migration rows**, still with the old image:

   ```bash
   docker compose run --rm -T --no-deps --entrypoint pnpm open-seo \
     exec wrangler d1 execute DB --local --command \
     "UPDATE d1_migrations SET name = '0055_plans_and_admin.sql' WHERE name = '0043_plans_and_admin.sql';
      UPDATE d1_migrations SET name = '0056_user_login_events.sql' WHERE name = '0044_user_login_events.sql';"
   ```

4. **Switch to the new image** (`OPEN_SEO_IMAGE=rankloupe:v0.1.12` in `.env`)
   and start it: `docker compose up -d --force-recreate open-seo`, then
   `docker compose logs -f open-seo`. Expect the preflight to pass, the twelve
   upstream migrations to apply, and a full build (several minutes). The
   hosted-mode preflight requires `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET`,
   `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.

5. **Check:** sign in, open Admin, run one keyword search. The container now
   also runs scheduled jobs (`scripts/selfhost-scheduler.mjs`), so weekly rank
   checks run on their own instead of only from the Rank Tracking page.

If anything fails, roll back by restoring the backup, not by only switching the
image: the old image still has `0043_plans_and_admin.sql` under its old name, so
on the renamed database it would try to create the plans tables again.

```bash
docker compose stop open-seo
# set OPEN_SEO_IMAGE back to the previous image in .env, then:
docker compose run --rm -T --no-deps --entrypoint sh open-seo \
  -c 'rm -rf .wrangler/state && tar xzf -' < d1-backup-<date>.tgz
docker compose up -d --force-recreate open-seo
```
