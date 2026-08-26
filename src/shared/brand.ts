/**
 * The product name as users see it — window title, wordmark, transactional
 * email, in-app prose. Everything user-facing reads it from here so a rebrand
 * is one edit rather than a sweep through the UI.
 *
 * Deliberately not applied to infrastructure identifiers (the Worker name, D1
 * database, R2 bucket) or the MCP server id: those are addresses that existing
 * deployments and connected clients resolve, and renaming them is a migration,
 * not a string change.
 */
export const PRODUCT_NAME = "Rankloupe";

/**
 * Address users are pointed at for help — in-app support pages, the audit
 * failure notice, and the answer both chat agents give when they are unsure.
 * Kept here with the product name so a rebrand moves them together.
 */
export const SUPPORT_EMAIL = "support@cortexlabs.cloud";

/**
 * GitHub repository the in-app Skills installer points at — `npx skills add`
 * and the manual clone on the AI page both read it from here.
 *
 * Point this at your own fork before inviting users: the commands are shown to
 * them verbatim, and the repository has to be public for `npx skills add` to
 * resolve it.
 */
export const SKILLS_REPO = "dejanpa/seo";

/** Directory name `git clone` creates for SKILLS_REPO. */
export const SKILLS_REPO_DIR = SKILLS_REPO.split("/")[1];

/**
 * Public URL of this deployment. Used only where a real origin is needed before
 * one is known — server-side rendering (no `window`), the chat agent's stored
 * origin fallback, and the MCP server's advertised metadata. Anything running
 * in the browser prefers `window.location.origin`, so this is a fallback, not
 * the source of truth.
 */
export const APP_URL = "https://seo.auto-ai.cloud";

// Marketing site that owns the legal pages users accept at signup. Kept private
// to this module: only the two pages below are linked from the app.
const MARKETING_SITE = "https://cortexlabs.cloud";

/** Terms users agree to when they create an account. */
export const TERMS_URL = `${MARKETING_SITE}/terms`;

/** Privacy policy linked next to the terms on the signup form. */
export const PRIVACY_URL = `${MARKETING_SITE}/privacy-policy`;
