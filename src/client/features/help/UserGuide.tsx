import { GuideView, type GuideContent } from "@/client/features/help/GuideView";
import { PRODUCT_NAME } from "@/shared/brand";

const NAV_GROUPS = [
  { group: "Overview", scope: "Project summary", pages: "Dashboard" },
  {
    group: "Research",
    scope: "Any domain, competitors included",
    pages: "Keyword Research, Domain Overview, Backlinks",
  },
  {
    group: "AI Visibility",
    scope: "How AI assistants answer about your market",
    pages: "Prompt Research, Prompt Explorer, Prompt Tracking",
  },
  {
    group: "My Site",
    scope: "Your domain only, with history",
    pages: "GSC Insights, Rank Tracking, Saved Keywords, Site Audit",
  },
  {
    group: "AI Tools",
    scope: "Agents and shared project context",
    pages: "Reports, Context, Agent setup",
  },
];

const STEPS = [
  {
    title: "Fill in the project Context",
    body: (
      <>
        <strong>AI Tools → Context.</strong> Write down what the site does, who
        the competitors are, and which pages matter. It is the one page that
        costs nothing and changes the quality of everything else — the SAM agent
        and the MCP tools read it instead of guessing.
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

const PAGE_GROUPS: GuideContent["pages"]["groups"] = [
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
    ],
  },
  {
    label: "AI Visibility — how assistants answer",
    cards: [
      {
        name: "Prompt Research",
        cost: true,
        body: "Questions people ask about a keyword, with ChatGPT's answers and the sources it cites. The questions come mostly from Google's “People also ask”, in US English.",
        input: "input: a keyword",
      },
      {
        name: "Prompt Explorer",
        cost: true,
        body: "The same prompt through ChatGPT, Claude, Gemini and Perplexity at once, plus the sources each one cites.",
        input: "input: a prompt",
      },
      {
        name: "Prompt Tracking",
        cost: true,
        body: "Asks your chosen prompts again on a schedule and tracks mentions, citations and competitors over time. The cost is shown before each collection.",
        input: "input: prompts + a schedule",
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
    label: "Agents and shared context",
    cards: [
      {
        name: "SAM",
        cost: true,
        body: "The SEO agent built into the project. Spends credits when it reaches for data.",
        input: "chat inside a project",
      },
      {
        name: "Agent setup",
        cost: false,
        body: `Connects Claude Code, Codex or another MCP client to your ${PRODUCT_NAME} instance, so research tools run straight from your editor or chat.`,
        input: "the app's MCP endpoint",
      },
      {
        name: "Reports",
        cost: false,
        body: "HTML reports a connected agent saves into the project. Read, print or export them here; they are not written by hand.",
        input: "written by an agent over MCP",
      },
      {
        name: "Context",
        cost: false,
        body: "What the site does, its competitors and key pages. SAM and connected agents read it instead of guessing.",
        input: "filled in by hand or by /seo-project-setup",
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

const CONTENT: GuideContent = {
  costLabels: { paid: "costs credits", free: "free" },
  organization: {
    title: "How the app is organized",
    intro: (
      <>
        Everything hangs off a <strong>project</strong>. A project is one domain
        plus its country and language. Everything you save — keywords, rank
        tracking, audits, the GSC connection — belongs to that project. Switch
        between them from <strong>Projects</strong> in the top left.
      </>
    ),
    menuIntro: (
      <>
        The left menu is split by <em>whose</em> domain is involved, which is
        the single most useful thing to remember:
      </>
    ),
    columns: ["Group", "Applies to", "Pages"],
    rows: NAV_GROUPS,
  },
  steps: {
    title: "Five steps, in this order",
    intro:
      "The order is not arbitrary: each step fills in data the next one uses.",
    items: STEPS,
  },
  pages: {
    title: "What each page does",
    legend: ({ paid, free }) => (
      <>
        {paid} means the call goes to DataForSEO and draws down your balance.{" "}
        {free} means a Google API or the local database.
      </>
    ),
    groups: PAGE_GROUPS,
  },
  selfHost: {
    trapsTitle: "Four things that surprise people",
    traps: SELF_HOST_TRAPS,
    commandsTitle: "Commands you will need",
    commandsIntro: (
      <>
        All of them run from the folder that holds <code>compose.yaml</code>.
      </>
    ),
    commands: COMMANDS,
  },
};

export function UserGuide() {
  return <GuideView content={CONTENT} />;
}
