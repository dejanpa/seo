import { GuideView, type GuideContent } from "@/client/features/help/GuideView";
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
    pages: "Keyword Research, Domain Overview, Backlinks",
  },
  {
    group: "AI Visibility",
    scope: "Kako AI asistenti odgovaraju o tvom tržištu",
    pages: "Prompt Research, Prompt Explorer, Prompt Tracking",
  },
  {
    group: "My Site",
    scope: "Samo tvoj domen, sa istorijom",
    pages: "GSC Insights, Rank Tracking, Saved Keywords, Site Audit",
  },
  {
    group: "AI Tools",
    scope: "Agenti i zajednički kontekst projekta",
    pages: "Reports, Context, Agent setup",
  },
];

const STEPS = [
  {
    title: "Popuni Context projekta",
    body: (
      <>
        <strong>AI Tools → Context.</strong> Upiši čime se sajt bavi, ko su
        konkurenti i koje su ključne strane. Ovo je jedina stranica koja ne
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

const PAGE_GROUPS: GuideContent["pages"]["groups"] = [
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
    ],
  },
  {
    label: "AI Visibility — kako asistenti odgovaraju",
    cards: [
      {
        name: "Prompt Research",
        cost: true,
        body: "Pitanja koja ljudi postavljaju o nekoj reči, sa ChatGPT odgovorima i izvorima koje citira. Pitanja dolaze uglavnom iz Google „People also ask”, na američkom engleskom.",
        input: "unos: ključna reč",
      },
      {
        name: "Prompt Explorer",
        cost: true,
        body: "Isti prompt kroz ChatGPT, Claude, Gemini i Perplexity odjednom — i koje izvore svaki citira.",
        input: "unos: prompt",
      },
      {
        name: "Prompt Tracking",
        cost: true,
        body: "Po rasporedu ponovo postavlja izabrane promptove i prati pominjanja, citate i konkurente kroz vreme. Cena se vidi pre svakog prikupljanja.",
        input: "unos: promptovi + raspored",
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
    label: "Agenti i zajednički kontekst",
    cards: [
      {
        name: "SAM",
        cost: true,
        body: "Ugrađeni SEO agent u projektu. Troši kredit kada poseže za podacima.",
        input: "chat u okviru projekta",
      },
      {
        name: "Agent setup",
        cost: false,
        body: `Kači Claude Code, Codex ili drugi MCP klijent na tvoju ${PRODUCT_NAME} instancu — alati za istraživanje direktno iz editora ili chata.`,
        input: "MCP endpoint aplikacije",
      },
      {
        name: "Reports",
        cost: false,
        body: "HTML izveštaji koje povezani agent sačuva u projekat. Ovde ih čitaš, štampaš ili izvoziš; ne pišu se ručno.",
        input: "piše ih agent preko MCP-a",
      },
      {
        name: "Context",
        cost: false,
        body: "Čime se sajt bavi, konkurenti i ključne strane. SAM i povezani agenti čitaju odavde umesto da nagađaju.",
        input: "popunjava se ručno ili kroz /seo-project-setup",
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

const CONTENT: GuideContent = {
  costLabels: { paid: "troši", free: "besplatno" },
  organization: {
    title: "Kako je aplikacija organizovana",
    intro: (
      <>
        Sve visi o <strong>projektu</strong>. Projekat je jedan domen plus
        njegova zemlja i jezik. Sve što sačuvaš — ključne reči, rank tracking,
        auditi, GSC veza — pripada tom projektu. Prebacuješ se preko{" "}
        <strong>Projects</strong> gore levo.
      </>
    ),
    menuIntro: (
      <>
        Levi meni je podeljen po tome <em>čiji</em> je domen u pitanju, i to je
        najkorisnija stvar koju treba da zapamtiš:
      </>
    ),
    columns: ["Grupa", "Na šta se odnosi", "Stranice"],
    rows: NAV_GROUPS,
  },
  steps: {
    title: "Pet koraka, ovim redom",
    intro:
      "Redosled nije proizvoljan: svaki korak puni podatke koje sledeći koristi.",
    items: STEPS,
  },
  pages: {
    title: "Šta koja stranica radi",
    legend: ({ paid, free }) => (
      <>
        {paid} znači da poziv ide na DataForSEO i skida sa tvog kredita. {free}{" "}
        znači Google API ili lokalna baza.
      </>
    ),
    groups: PAGE_GROUPS,
  },
  selfHost: {
    trapsTitle: "Četiri stvari koje iznenade",
    traps: SELF_HOST_TRAPS,
    commandsTitle: "Komande koje ti trebaju",
    commandsIntro: (
      <>
        Sve se izvršava iz foldera u kome stoji <code>compose.yaml</code>.
      </>
    ),
    commands: COMMANDS,
  },
};

export function SerbianUserGuide() {
  return <GuideView content={CONTENT} />;
}
