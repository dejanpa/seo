import { isHostedClientAuthMode } from "@/lib/auth-mode";
import { PRODUCT_NAME } from "@/shared/brand";

const NAV_GROUPS = [
  { group: "Overview", scope: "Project summary", pages: "Dashboard" },
  {
    group: "Research",
    scope: "Any domain, competitors included",
    pages:
      "Keyword Research, Domain Overview, Backlinks, Brand Lookup, Prompt Explorer",
  },
  {
    group: "My Site",
    scope: "Your domain only, with history",
    pages: "GSC Insights, Rank Tracking, Saved Keywords, Site Audit",
  },
  { group: "Connect", scope: "Outside the app", pages: "AI & MCP" },
];

const STEPS = [
  {
    title: "Fill in the project Context",
    body: (
      <>
        <strong>Project settings → Context.</strong> Write down what the site
        does, who the competitors are, and which pages matter. It is the one
        page that costs nothing and changes the quality of everything else — the
        SAM agent and the MCP tools read it instead of guessing.
      </>
    ),
  },
  {
    title: "Read GSC Insights first",
    body: (
      <>
        Google already knows which queries you show up for. Start from real
        impressions and positions 5–20: those are the terms you are close on, so
        they are worth pushing. It is free and comes straight from Search
        Console.
      </>
    ),
  },
  {
    title: "Expand with Keyword Research, then save",
    body: (
      <>
        Feed in the terms from step 2, take the ideas with volume and
        difficulty, and hit <strong>Save</strong>. Saved keywords (with tags)
        are what rank tracking draws from — skip this and step 4 becomes typing
        by hand.
      </>
    ),
  },
  {
    title: "Load up Rank Tracking",
    body: (
      <>
        Add the keywords you saved in step 3, then run the first check to get a
        baseline to compare against. The cost depends on how many keywords you
        track and is shown before the run starts.
      </>
    ),
  },
  {
    title: "Run a Site Audit with Lighthouse",
    body: (
      <>
        Tick <strong>Include Lighthouse</strong> when starting the run to get
        speed measurements alongside the SEO findings. Without it the audit
        returns technical per-page findings only.
      </>
    ),
  },
];

type PageCard = { name: string; cost: boolean; body: string; input: string };

const PAGE_GROUPS: { label: string; cards: PageCard[] }[] = [
  {
    label: "Research — any domain",
    cards: [
      {
        name: "Keyword Research",
        cost: true,
        body: "Keyword ideas with monthly volume, difficulty and search intent. Keep the good ones with the Save button.",
        input: "input: a term or a list of terms",
      },
      {
        name: "Domain Overview",
        cost: true,
        body: "The SEO profile of any domain: estimated traffic, what it ranks for, where you are ahead or behind. This is where you look at competitors.",
        input: "input: a domain",
      },
      {
        name: "Backlinks",
        cost: true,
        body: "Who links to a domain, what changed recently, and which pages attract links.",
        input: "input: a domain",
      },
      {
        name: "Brand Lookup",
        cost: true,
        body: "How often ChatGPT and Google AI Overview mention a brand, in which prompts, and which sources they cite.",
        input: "input: a brand name or domain",
      },
      {
        name: "Prompt Explorer",
        cost: true,
        body: "The same prompt through ChatGPT, Claude, Gemini and Perplexity at once, plus the sources each one cites.",
        input: "input: a prompt",
      },
    ],
  },
  {
    label: "My Site — your domain",
    cards: [
      {
        name: "GSC Insights",
        cost: false,
        body: "Clicks, impressions, CTR and position from Search Console. The only source of real Google data rather than estimates.",
        input: "needs a connected Search Console",
      },
      {
        name: "Rank Tracking",
        cost: true,
        body: "Positions for the keywords you pick, over time. Cost grows with the number of keywords and is estimated before each run.",
        input: "input: a list of keywords",
      },
      {
        name: "Saved Keywords",
        cost: false,
        body: "Your own tagged list. Local database, not a single API call.",
        input: "filled from Keyword Research",
      },
      {
        name: "Site Audit",
        cost: true,
        body: "Crawls the site and reports technical findings per page. The optional Lighthouse pass adds speed measurements.",
        input: "input: a URL + max pages",
      },
    ],
  },
  {
    label: "Agent and integrations",
    cards: [
      {
        name: "SAM",
        cost: true,
        body: "The SEO agent built into the project. Spends credits when it reaches for data.",
        input: "chat inside a project",
      },
      {
        name: "AI & MCP",
        cost: false,
        body: `Connects Claude Code or Codex to your ${PRODUCT_NAME} instance — keyword research, SERP, domain and backlink tools straight from your editor.`,
        input: "the app's MCP endpoint",
      },
    ],
  },
];

const SELF_HOST_TRAPS = [
  {
    title: (
      <>
        Always open <code>localhost:3001</code>
      </>
    ),
    body: (
      <>
        Never <code>127.0.0.1:3001</code>. Google OAuth builds its{" "}
        <code>redirect_uri</code> from the address the browser used, so the
        other form breaks the Search Console connection. Docker Desktop offers
        exactly the wrong one.
      </>
    ),
  },
  {
    title: <>Rank tracking does not run on its own</>,
    body: (
      <>
        The config may say “weekly”, but a Docker deployment has no cron. A
        check only happens when you start it by hand from the Rank Tracking
        page.
      </>
    ),
  },
  {
    title: <>The app does not show your credit balance</>,
    body: (
      <>
        On a self-hosted install you pay DataForSEO directly, so the balance
        lives on dataforseo.com or behind the command below.
      </>
    ),
  },
  {
    title: <>The MCP endpoint has no authentication</>,
    body: (
      <>
        While the container runs in <code>local_noauth</code> mode,{" "}
        <code>localhost:3001/mcp</code> accepts calls without a key and answers
        any origin. Shut it down when you are not using it.
      </>
    ),
  },
];

// The compose service is still named `open-seo` in compose.yaml, so the
// commands below keep that name even though the product is branded differently.
const COMMANDS = `# start / stop
docker compose up -d
docker compose down

# after editing .env — a plain restart is not enough
docker compose up -d --force-recreate open-seo

# DataForSEO credit balance (a free call)
docker compose exec -T open-seo node -e '
fetch("https://api.dataforseo.com/v3/appendix/user_data",
  {headers:{Authorization:"Basic "+process.env.DATAFORSEO_API_KEY}})
  .then(r=>r.json())
  .then(j=>console.log(j.tasks[0].result[0].money))'

# logs
docker compose logs -f --tail 50`;

function CostBadge({ cost }: { cost: boolean }) {
  return cost ? (
    <span className="badge badge-warning badge-sm shrink-0">costs credits</span>
  ) : (
    <span className="badge badge-success badge-sm shrink-0">free</span>
  );
}

export function UserGuide() {
  // Docker/OAuth gotchas and terminal commands only apply to a self-hosted
  // container; on the hosted service they would be actively misleading.
  const isSelfHosted = !isHostedClientAuthMode();

  return (
    <div className="space-y-10">
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">How the app is organized</h2>
        <p className="text-sm leading-relaxed text-base-content/80">
          Everything hangs off a <strong>project</strong>. A project is one
          domain plus its country and language. Everything you save — keywords,
          rank tracking, audits, the GSC connection — belongs to that project.
          Switch between them from <strong>Projects</strong> in the top left.
        </p>
        <p className="text-sm leading-relaxed text-base-content/80">
          The left menu is split by <em>whose</em> domain is involved, which is
          the single most useful thing to remember:
        </p>
        <div className="overflow-x-auto rounded-lg border border-base-300">
          <table className="table table-sm">
            <thead>
              <tr>
                <th>Group</th>
                <th>Applies to</th>
                <th>Pages</th>
              </tr>
            </thead>
            <tbody>
              {NAV_GROUPS.map((row) => (
                <tr key={row.group}>
                  <td className="font-medium whitespace-nowrap">{row.group}</td>
                  <td className="text-base-content/70">{row.scope}</td>
                  <td className="text-base-content/70">{row.pages}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Five steps, in this order</h2>
        <p className="text-sm leading-relaxed text-base-content/80">
          The order is not arbitrary: each step fills in data the next one uses.
        </p>
        <ol className="space-y-3">
          {STEPS.map((step, index) => (
            <li
              key={step.title}
              className="flex gap-3 rounded-lg border border-base-300 p-4"
            >
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {index + 1}
              </span>
              <div className="space-y-1">
                <h3 className="font-semibold">{step.title}</h3>
                <p className="text-sm leading-relaxed text-base-content/70">
                  {step.body}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">What each page does</h2>
        <p className="text-sm leading-relaxed text-base-content/80">
          <span className="badge badge-warning badge-sm">costs credits</span>{" "}
          means the call goes to DataForSEO and draws down your balance.{" "}
          <span className="badge badge-success badge-sm">free</span> means a
          Google API or the local database.
        </p>

        {PAGE_GROUPS.map((group) => (
          <div key={group.label} className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-widest text-base-content/40">
              {group.label}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {group.cards.map((card) => (
                <div
                  key={card.name}
                  className="space-y-1.5 rounded-lg border border-base-300 p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold">{card.name}</h3>
                    <CostBadge cost={card.cost} />
                  </div>
                  <p className="text-sm leading-relaxed text-base-content/70">
                    {card.body}
                  </p>
                  <p className="font-mono text-xs text-base-content/50">
                    {card.input}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      {isSelfHosted ? (
        <>
          <section className="space-y-3">
            <h2 className="text-xl font-semibold">
              Four things that surprise people
            </h2>
            <div className="space-y-3">
              {SELF_HOST_TRAPS.map((trap, index) => (
                <div
                  key={index}
                  className="space-y-1 rounded-lg border-l-2 border-warning bg-base-200/40 p-4"
                >
                  <h3 className="font-semibold">{trap.title}</h3>
                  <p className="text-sm leading-relaxed text-base-content/70">
                    {trap.body}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">Commands you will need</h2>
            <p className="text-sm leading-relaxed text-base-content/80">
              All of them run from the folder that holds{" "}
              <code>compose.yaml</code>.
            </p>
            <pre className="overflow-x-auto rounded-lg border border-base-300 bg-base-200 p-4 text-xs leading-relaxed">
              <code>{COMMANDS}</code>
            </pre>
          </section>
        </>
      ) : null}
    </div>
  );
}
