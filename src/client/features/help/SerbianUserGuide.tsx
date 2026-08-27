import { isHostedClientAuthMode } from "@/lib/auth-mode";
import { PRODUCT_NAME } from "@/shared/brand";

const NAV_GROUPS = [
  {
    group: "Overview",
    scope: "Sažetak projekta",
    pages: "Dashboard",
  },
  {
    group: "Research",
    scope: "Bilo koji domen — i konkurencija",
    pages:
      "Keyword Research, Domain Overview, Backlinks, Brand Lookup, Prompt Explorer",
  },
  {
    group: "My Site",
    scope: "Samo tvoj domen, sa istorijom",
    pages: "GSC Insights, Rank Tracking, Saved Keywords, Site Audit",
  },
  { group: "Connect", scope: "Van aplikacije", pages: "AI & MCP" },
];

const STEPS = [
  {
    title: "Popuni Context projekta",
    body: (
      <>
        <strong>Project settings → Context.</strong> Upiši čime se sajt bavi, ko
        su konkurenti i koje su ključne strane. Ovo je jedina stranica koja ne
        troši ništa, a menja kvalitet svega ostalog — SAM agent i MCP alati
        čitaju odavde umesto da nagađaju.
      </>
    ),
  },
  {
    title: "Pogledaj GSC Insights",
    body: (
      <>
        Google već zna za koje upite se prikazuješ. Kreni od stvarnih impresija
        i pozicija 5–20 — to su reči gde si blizu, pa ih vredi gurnuti.
        Besplatno je, ide direktno iz Search Console-a.
      </>
    ),
  },
  {
    title: "Proširi kroz Keyword Research pa sačuvaj",
    body: (
      <>
        Ubaci pojmove iz koraka 2, uzmi ideje sa volumenom i težinom, i klikni{" "}
        <strong>Save</strong>. Sačuvane reči (sa tagovima) su izvor za rank
        tracking — bez ovog koraka korak 4 je ručno kucanje.
      </>
    ),
  },
  {
    title: "Napuni Rank Tracking",
    body: (
      <>
        Dodaj sačuvane reči iz koraka 3, pa pokreni prvu proveru — dobijaš nultu
        tačku za poređenje. Cena zavisi od broja reči i vidi se pre pokretanja.
      </>
    ),
  },
  {
    title: "Pokreni Site Audit sa Lighthouse-om",
    body: (
      <>
        Uključi <strong>Include Lighthouse</strong> pri pokretanju da uz SEO
        nalaze dobiješ i merenje brzine. Bez toga audit vraća samo tehničke
        nalaze po strani.
      </>
    ),
  },
];

type PageCard = { name: string; cost: boolean; body: string; input: string };

const PAGE_GROUPS: { label: string; cards: PageCard[] }[] = [
  {
    label: "Research — bilo koji domen",
    cards: [
      {
        name: "Keyword Research",
        cost: true,
        body: "Ideje za ključne reči, mesečni volumen, težina i namera pretrage. Rezultate čuvaš dugmetom Save.",
        input: "unos: pojam ili lista pojmova",
      },
      {
        name: "Domain Overview",
        cost: true,
        body: "SEO profil bilo kog domena: procenjen saobraćaj, za šta rangira, gde ti bežiš ili zaostaješ. Ovde gledaš konkurenciju.",
        input: "unos: domen",
      },
      {
        name: "Backlinks",
        cost: true,
        body: "Ko linkuje ka domenu, šta se promenilo skoro i koje strane privlače linkove.",
        input: "unos: domen",
      },
      {
        name: "Brand Lookup",
        cost: true,
        body: "Koliko ChatGPT i Google AI Overview pominju neki brend, u kojim promptima i uz koje izvore.",
        input: "unos: naziv brenda ili domen",
      },
      {
        name: "Prompt Explorer",
        cost: true,
        body: "Isti prompt kroz ChatGPT, Claude, Gemini i Perplexity odjednom — i koje izvore svaki citira.",
        input: "unos: prompt",
      },
    ],
  },
  {
    label: "My Site — tvoj domen",
    cards: [
      {
        name: "GSC Insights",
        cost: false,
        body: "Klikovi, impresije, CTR i pozicija iz Search Console-a. Jedini izvor stvarnih Google podataka, ne procene.",
        input: "traži povezan Search Console",
      },
      {
        name: "Rank Tracking",
        cost: true,
        body: "Pozicije odabranih reči kroz vreme. Cena raste sa brojem reči — postoji procena pre pokretanja.",
        input: "unos: lista ključnih reči",
      },
      {
        name: "Saved Keywords",
        cost: false,
        body: "Tvoja lista sa tagovima. Lokalna baza, bez ijednog API poziva.",
        input: "puni se iz Keyword Research-a",
      },
      {
        name: "Site Audit",
        cost: true,
        body: "Krolovanje sajta i tehnički nalazi po strani. Opcioni Lighthouse dodaje merenje brzine.",
        input: "unos: URL + maks. broj strana",
      },
    ],
  },
  {
    label: "Agent i integracije",
    cards: [
      {
        name: "SAM",
        cost: true,
        body: "Ugrađeni SEO agent u projektu. Troši kredit kada poseže za podacima.",
        input: "chat u okviru projekta",
      },
      {
        name: "AI & MCP",
        cost: false,
        body: "Kači Claude Code ili Codex na tvoju instancu — alati za keyword research, SERP, domene i backlinks direktno iz editora.",
        input: "MCP endpoint aplikacije",
      },
    ],
  },
];

const SELF_HOST_TRAPS = [
  {
    title: (
      <>
        Otvaraj isključivo <code>localhost:3001</code>
      </>
    ),
    body: (
      <>
        Nikad <code>127.0.0.1:3001</code>. Google OAuth gradi{" "}
        <code>redirect_uri</code> iz adrese koju je browser koristio, pa ti
        drugi oblik obara povezivanje sa Search Console-om. Docker Desktop nudi
        baš pogrešnu varijantu.
      </>
    ),
  },
  {
    title: <>Rank tracking se ne pokreće sam</>,
    body: (
      <>
        Konfiguracija može da piše „weekly“, ali u Docker režimu nema cron-a.
        Provera se dešava samo kad je ručno pokreneš sa Rank Tracking stranice.
      </>
    ),
  },
  {
    title: <>Stanje kredita se ne vidi u aplikaciji</>,
    body: (
      <>
        Kod self-hosted instalacije plaćaš DataForSEO direktno, pa stanje gledaš
        na dataforseo.com ili komandom ispod.
      </>
    ),
  },
  {
    title: <>MCP endpoint je bez autentikacije</>,
    body: (
      <>
        Dok kontejner radi u <code>local_noauth</code> režimu,{" "}
        <code>localhost:3001/mcp</code> prima pozive bez ključa i odgovara
        svakom poreklu. Ugasi ga kad ne koristiš.
      </>
    ),
  },
];

// The compose service is still named `open-seo` in compose.yaml, so the
// commands below keep that name even though the product is branded differently.
const COMMANDS = `# pokreni / ugasi
docker compose up -d
docker compose down

# posle izmene u .env — obican restart se preskace
docker compose up -d --force-recreate open-seo

# stanje DataForSEO kredita (besplatan poziv)
docker compose exec -T open-seo node -e '
fetch("https://api.dataforseo.com/v3/appendix/user_data",
  {headers:{Authorization:"Basic "+process.env.DATAFORSEO_API_KEY}})
  .then(r=>r.json())
  .then(j=>console.log(j.tasks[0].result[0].money))'

# logovi
docker compose logs -f --tail 50`;

function CostBadge({ cost }: { cost: boolean }) {
  return cost ? (
    <span className="badge badge-warning badge-sm shrink-0">troši</span>
  ) : (
    <span className="badge badge-success badge-sm shrink-0">besplatno</span>
  );
}

export function SerbianUserGuide() {
  // Docker/OAuth gotchas and terminal commands only apply to a self-hosted
  // container; on the hosted service they would be actively misleading.
  const isSelfHosted = !isHostedClientAuthMode();

  return (
    <div className="h-full overflow-auto bg-base-100 px-4 py-8 pb-24 md:px-6 md:py-10 md:pb-8">
      <div className="mx-auto w-full max-w-3xl space-y-10">
        <header className="space-y-2 border-b border-base-300 pb-6">
          <p className="text-xs font-medium uppercase tracking-widest text-base-content/40">
            Priručnik
          </p>
          <h1 className="text-3xl font-bold tracking-tight">
            Kako se koristi {PRODUCT_NAME}
          </h1>
          <p className="text-sm leading-relaxed text-base-content/70">
            Šta koja stranica radi, kojim redom da ih koristiš, i gde se troši
            kredit.
          </p>
        </header>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">
            Kako je aplikacija organizovana
          </h2>
          <p className="text-sm leading-relaxed text-base-content/80">
            Sve visi o <strong>projektu</strong>. Projekat je jedan domen plus
            njegova zemlja i jezik. Sve što sačuvaš — ključne reči, rank
            tracking, auditi, GSC veza — pripada tom projektu. Prebacuješ se
            preko <strong>Projects</strong> gore levo.
          </p>
          <p className="text-sm leading-relaxed text-base-content/80">
            Levi meni je podeljen po tome <em>čiji</em> je domen u pitanju, i to
            je najkorisnija stvar koju treba da zapamtiš:
          </p>
          <div className="overflow-x-auto rounded-lg border border-base-300">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>Grupa</th>
                  <th>Na šta se odnosi</th>
                  <th>Stranice</th>
                </tr>
              </thead>
              <tbody>
                {NAV_GROUPS.map((row) => (
                  <tr key={row.group}>
                    <td className="font-medium whitespace-nowrap">
                      {row.group}
                    </td>
                    <td className="text-base-content/70">{row.scope}</td>
                    <td className="text-base-content/70">{row.pages}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Pet koraka, ovim redom</h2>
          <p className="text-sm leading-relaxed text-base-content/80">
            Redosled nije proizvoljan: svaki korak puni podatke koje sledeći
            koristi.
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
          <h2 className="text-xl font-semibold">Šta koja stranica radi</h2>
          <p className="text-sm leading-relaxed text-base-content/80">
            <span className="badge badge-warning badge-sm">troši</span> znači da
            poziv ide na DataForSEO i skida sa tvog kredita.{" "}
            <span className="badge badge-success badge-sm">besplatno</span>{" "}
            znači Google API ili lokalna baza.
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
                Četiri stvari koje iznenade
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
              <h2 className="text-xl font-semibold">Komande koje ti trebaju</h2>
              <p className="text-sm leading-relaxed text-base-content/80">
                Sve se izvršava iz foldera u kome stoji{" "}
                <code>compose.yaml</code>.
              </p>
              <pre className="overflow-x-auto rounded-lg border border-base-300 bg-base-200 p-4 text-xs leading-relaxed">
                <code>{COMMANDS}</code>
              </pre>
            </section>
          </>
        ) : null}
      </div>
    </div>
  );
}
