-- Project context export: "Eurovik" (eurovik.rs)
-- Source: local Docker instance (localhost:3001), project
-- 3f8d90b6-1e5d-4db9-93b6-1dc89d9f54e0
--
-- BEFORE RUNNING: replace __ORG_ID__ below with the organization id this
-- project should belong to on the target deployment. It appears once, in the
-- INSERT below.
-- Everything else (project id, section keys, competitor/page ids) is carried
-- over unchanged, so re-running this file is idempotent.
--
--   sqlite3 <d1.sqlite> < eurovik-project-context.sql
--   -- or, on Cloudflare D1:
--   wrangler d1 execute DB --remote --file eurovik-project-context.sql

BEGIN;

-- project
INSERT OR REPLACE INTO projects (id, organization_id, name, domain, created_at, archived_at, location_code, language_code) VALUES ('3f8d90b6-1e5d-4db9-93b6-1dc89d9f54e0', '__ORG_ID__', 'Eurovik', 'eurovik.rs', '2026-08-26 00:11:21', NULL, 2688, 'sr');

-- context sections (5)
INSERT OR REPLACE INTO project_context_sections (project_id, key, title, content, updated_at, updated_by) VALUES ('3f8d90b6-1e5d-4db9-93b6-1dc89d9f54e0', 'business_overview', NULL, 'Eurovik doo, Pančevo (PIB 106852616), online prodavnica tehničke opreme za tržište Srbije. Osnovano 2010, sajt www.eurovik.rs na OpenCart platformi, jezik sr-Latn, cene u RSD sa PDV. Preko 5.000 proizvoda.

Asortiman po glavnim granama:
video nadzor (kamere, DVR/NVR snimači, kompleti, hard diskovi), LED rasveta (trake, paneli, reflektori, sijalice, plafonjere, spoljna i solarna), alarmi, protivpožarni sistemi, interfoni, kontrola pristupa, barijere, motori za kapije, mrežna oprema, ozvučenje, kablovi, računari i IT oprema (monitori, digital signage), nosači za TV, alati i oprema.

Brendovi: Dahua, Hikvision, Ezviz, Imou, Paradox, Braytron, Eurolamp, Klaxon, Philips, Xwave, Havit, NEBO i drugi.

Kupci su mešani. B2C su vlasnici kuća i stanova koji sami biraju opremu i često je sami montiraju, pa im treba objašnjenje pre nego cena. B2B su instalateri, firme, upravnici zgrada i poljoprivredna gazdinstva.

Uslovi kupovine: besplatna dostava preko 5.000 RSD, garancija po Zakonu o zaštiti potrošača RS. Kontakt: Moše Pijade 68, 26000 Pančevo, 013/300805, 062/261398, office@eurovik.rs.', '2026-08-26T09:59:16.312Z', 'mcp');
INSERT OR REPLACE INTO project_context_sections (project_id, key, title, content, updated_at, updated_by) VALUES ('3f8d90b6-1e5d-4db9-93b6-1dc89d9f54e0', 'current_goal', NULL, 'Rast organskog saobraćaja na informacione upite oko video nadzora i bezbednosti, jer dovode publiku koja tek razmišlja o kupovini. Uporedo, čišćenje indeksa da bi crawl budžet išao na strane koje prodaju.

Šta je konkretno u toku (plan od 08.08.2026):
1. Blog klasteri po prioritetu. Objavljeni: "Komšija mi snima dvorište" i "Pravilnik o video nadzoru, primer". Sledeći: toki voki i radio stanice (PMR446 bez dozvole naspram licenciranih frekvencija), ugradnja i zamena interfona u zgradi, video nadzor za plac i poljoprivredno gazdinstvo, rikverc i 360 kamera za auto.
2. Konsolidacija kanibalizacije. Klaster "DVR ili NVR" (postovi 83 i 72 se biju), klaster "cena video nadzora" (post 91 protiv starog cenovnika), montaža LED trake (stari post protiv posta 109).
3. Index bloat. "Crawled, currently not indexed" pao sa 11.682 u junu na 8.130 na dan 28.07.2026. Ostaje near duplicate klaster Visilica xE27 60W (111 varijanti, od toga 61 aktivan i rasprodat) i generički naslovi slušalica bez brenda i modela.
4. Opisi kategorija i proizvoda po internim pravilima, sa FAQPage schema.

Merilo je Search Console. Na dan 26.08.2026, poslednjih 28 dana: 11.714 klikova, 275.931 impresija, CTR 4,2 posto, prosečna pozicija 8,0.', '2026-08-26T09:59:16.312Z', 'mcp');
INSERT OR REPLACE INTO project_context_sections (project_id, key, title, content, updated_at, updated_by) VALUES ('3f8d90b6-1e5d-4db9-93b6-1dc89d9f54e0', 'custom:tehnicki-kontekst', 'Tehnički kontekst i izvori', 'Sajt radi na OpenCart platformi, jezik sr-Latn, cene u RSD sa PDV.

Sadržaj se ne piše slobodno, nego po internim pravilima koja stoje kod vlasnika u /Users/dejanstamenkovic/0-Eurovik: proizvodi/PRAVILA.md, kategorije/PRAVILA.md i SEO/llms.txt sa punom mapom kategorija. Pre pisanja bilo kog opisa pročitati ta pravila, sažetak je u sekciji Writing preferences.

Tehničko stanje koje utiče na SEO odluke:

Crawl budžet je oko 2.100 strana dnevno i zdrav. robots.txt blokira filter i sort parametre (mfp, search, sortiranje, limit-24 do limit-100, tag, utm). Paginacija /page-N je NAMERNO ostavljena otvorena jer pomaže otkrivanju dubokih proizvoda, ne blokirati je.

.htaccess nosi blok „404 FIX” sa redirect pravilima za stare OpenCart rute, AMP URL-ove, ugašene kategorije i slike indeksirane kao strane (vraćaju 410). Pri promeni strukture kategorija proveriti taj blok.

seo_keyword (URL slug) proizvoda i kategorija se nikad ne menja.

Indeksacija: „Crawled, currently not indexed” pao sa 11.682 u junu na 8.130 krajem jula. Ostatak je većinom legitiman long tail, plus jedan pravi near duplicate klaster (Visilica xE27 60W, 111 varijanti sa identičnim naslovom osim M šifre).', '2026-08-26T10:20:48.959Z', 'mcp');
INSERT OR REPLACE INTO project_context_sections (project_id, key, title, content, updated_at, updated_by) VALUES ('3f8d90b6-1e5d-4db9-93b6-1dc89d9f54e0', 'positioning', NULL, 'Specijalizovana prodavnica za bezbednosnu i elektro opremu, ne opšti tehno marketplace. Prednost je dubina u uskim granama: 4G kamere sa SIM karticom, solarne, PTZ, spoljne, kamere za bebe i lažne kamere stoje kao odvojene kategorije, svaka sa svojim opisom, umesto da budu filter unutar jedne strane.

Druga prednost je sadržaj koji objašnjava izbor. Kupac u ovoj kategoriji prvo bira tip, pa tek onda brend, pa se pozicioniramo kao izvor koji razjasni razliku (DVR naspram NVR, CVI naspram TVI naspram IP, kada solarna kamera ima smisla a kada nema) i tek onda prodaje.

Trust: firma sa adresom, PIB-om i telefonom u Pančevu, 14 godina rada, garancija po srpskom zakonu i servisna podrška. To je ono što sivi uvoz preko stranih marketplace platformi nema, a to je i glavni razlog zašto neko plati više ovde.

Cenovno nismo najjeftiniji i ne treba da se tako predstavljamo. Argument je da znaš šta si kupio i da imaš kome da se javiš.', '2026-08-26T09:59:16.312Z', 'mcp');
INSERT OR REPLACE INTO project_context_sections (project_id, key, title, content, updated_at, updated_by) VALUES ('3f8d90b6-1e5d-4db9-93b6-1dc89d9f54e0', 'writing_preferences', NULL, 'Destilat internih pravila iz proizvodi/PRAVILA.md i kategorije/PRAVILA.md. Važi za opise proizvoda, kategorija i blog tekstove.

Jezik i ton:
Srpski, latinica. Kupcu se obraćamo sa "ti", nikad sa "Vi". Ton je razgovor sa kupcem koji je ušao u radnju, ne katalog i ne reklama. Svaka rečenica nosi informaciju, bez filera.

Interpunkcija:
Crtica se ne koristi kao interpunkcijski znak. Ni em dash, ni en dash, ni obična crtica. Umesto nje idu zarez, tačka, dve tačke ili zagrada. Obična crtica je dozvoljena samo u polju model, u šifri proizvođača (IPC-HFW1639TC-S6) i u oznakama standarda (Wi-Fi).

Zabranjene fraze:
visokokvalitetan, vrhunski kvalitet, pažljivo izrađen, savršen izbor za, idealan za, odlično rešenje, nudi mnogo prednosti, moderan dizajn, lako se koristi, zadovoljava sve vaše potrebe, jedan od najboljih na tržištu, lider u industriji, Zamislite, Predstavljamo, Otkrijte, Revolucionarno, Ne propustite.

Umesto prideva ide broj:
ne "visokokvalitetan materijal" nego "kućište od čelika debljine 1,2 mm, ne savija se ni pod punim opterećenjem". Ne "idealan za kancelariju" nego "ako ti radi 8 sati dnevno u pozadini, nećeš ga ni čuti, 35 dB na maksimumu". Minimum 5 konkretnih brojeva ili merenja po opisu proizvoda.

Struktura:
Prva rečenica nikad ne počinje imenom proizvoda ni imenom kategorije, nego scenarijem ili problemom kupca. H3 se ne dodaje samo zbog SEO. FAQ pitanja su uvek H3 unutar H2 "Najčešća pitanja".

Dužine:
proizvod 300 do 600 reči, pod-podkategorija 250 do 500, podkategorija 400 do 800, glavna kategorija 800 do 1500, blog 800 do 2500.

Potkrepljenost:
svaki procenat ili poređenje traži imenovan izvor ili omekšavanje ("znatno", "višestruko"). Izmišljen izvor nikad. Zakon se uvek imenuje konkretno, nikad "po zakonu". Anegdote iz prakse i prvolične brojke tipa "14 godina iskustva" prolaze bez izvora.

Schema i tehnika:
u opis ide isključivo FAQPage JSON-LD, uvek sa 5 pitanja. Nikad OG tagovi, Twitter tagovi, Product schema ni head tagovi u opisu. Postojeći YouTube embed se pri prepisu opisa nikad ne briše, samo se premesti u zasebnu H2 sekciju pre FAQ-a. seo_keyword (URL slug) se nikad ne menja.', '2026-08-26T09:59:16.312Z', 'mcp');

-- competitors (8)
INSERT OR REPLACE INTO project_competitors (id, project_id, domain, name, notes, updated_at, updated_by) VALUES ('6cb23812-4915-4cb6-9f3a-44a1f96e1900', '3f8d90b6-1e5d-4db9-93b6-1dc89d9f54e0', 'avmarket.rs', 'AV Market', 'AV i bezbednosna oprema. Najveći procenjeni saobraćaj u uzorku (ETV 584), medijana pozicije 1 na delu upita.', '2026-08-26T10:20:48.959Z', 'mcp');
INSERT OR REPLACE INTO project_competitors (id, project_id, domain, name, notes, updated_at, updated_by) VALUES ('aa5f082a-d381-4485-8ad4-f3b8bdae5107', '3f8d90b6-1e5d-4db9-93b6-1dc89d9f54e0', 'borikplus.rs', 'Borik Plus', 'Bezbednosna i elektro oprema, medijana pozicije 7.', '2026-08-26T10:20:48.959Z', 'mcp');
INSERT OR REPLACE INTO project_competitors (id, project_id, domain, name, notes, updated_at, updated_by) VALUES ('84d49370-6155-4466-a694-3f1c3205d387', '3f8d90b6-1e5d-4db9-93b6-1dc89d9f54e0', 'cctv.rs', 'CCTV.rs', 'Specijalista za video nadzor. Slabija prosečna pozicija (33) ali medijana 8, znači jak na uskom skupu upita.', '2026-08-26T10:20:48.959Z', 'mcp');
INSERT OR REPLACE INTO project_competitors (id, project_id, domain, name, notes, updated_at, updated_by) VALUES ('251d74d5-5f8b-422a-84ec-ebc3809d299c', '3f8d90b6-1e5d-4db9-93b6-1dc89d9f54e0', 'elementa.rs', 'Elementa', 'Veliki opšti tehno retailer. ETV ~20.106 na 1.238 rangiranih ključnih reči, DR 57. Najjači u: kamere za video nadzor #2 (ETV 583), led reflektor #1 (katalog hub), plafonjere #4-#9. Slabiji u: led trake #9, led neonke #7, solarni reflektor #12. Backlink profil: 5.784 linka, 261 referring domena, 16 linkova sa eurovik.rs uzajamno. Fizičke prodavnice Subotica daju 5.400/m brendiranih upita. Napadamo LED trake edukativnim sadržajem.', '2026-08-26T11:51:14.135Z', 'sam');
INSERT OR REPLACE INTO project_competitors (id, project_id, domain, name, notes, updated_at, updated_by) VALUES ('dd968969-ce24-44fc-9cac-1c998e98995a', '3f8d90b6-1e5d-4db9-93b6-1dc89d9f54e0', 'gigatron.rs', 'Gigatron', 'Opšti tehno retail. Nije specijalista ali uzima komercijalne upite snagom brenda i domena. Ne meriti se sadržajem, nego dubinom kategorija.', '2026-08-26T10:20:48.959Z', 'mcp');
INSERT OR REPLACE INTO project_competitors (id, project_id, domain, name, notes, updated_at, updated_by) VALUES ('64cc0651-1687-44a9-a9ba-ee89ddf79122', '3f8d90b6-1e5d-4db9-93b6-1dc89d9f54e0', 'jakov.rs', 'Jakov', 'Elektro oprema, medijana pozicije 6 uz slabu prosečnu (34), profil sličan našem.', '2026-08-26T10:20:48.959Z', 'mcp');
INSERT OR REPLACE INTO project_competitors (id, project_id, domain, name, notes, updated_at, updated_by) VALUES ('107ca19a-5c18-4534-abd2-d8d7a977ba36', '3f8d90b6-1e5d-4db9-93b6-1dc89d9f54e0', 'shoppster.rs', 'Shoppster', 'Opšti marketplace, medijana pozicije 4. Isti obrazac kao Gigatron.', '2026-08-26T10:20:48.959Z', 'mcp');
INSERT OR REPLACE INTO project_competitors (id, project_id, domain, name, notes, updated_at, updated_by) VALUES ('c6777e14-d339-4cd6-9049-1cf0c7436438', '3f8d90b6-1e5d-4db9-93b6-1dc89d9f54e0', 'svezavideonadzor.rs', 'Sve za video nadzor', 'Uski specijalista za video nadzor. ETV ~1.870 na 83 rangirane ključne reči, DR 50, backlink profil pretežno spam (lobi-info, goglasi, web.app). #1 za "kamere za video nadzor" i "video nadzor", #20 za "wifi kamere" (mi #2). Nemaju LED, solarne, toki voki, grejanje. Asortiman: kamere, snimači, alarmi, interfoni, kontrola pristupa, IP telefonija. Najdirektniji konkurent u niši.', '2026-08-26T11:21:21.344Z', 'sam');

-- key pages (14)
INSERT OR REPLACE INTO project_key_pages (id, project_id, url, role, topic, notes, updated_at, updated_by) VALUES ('ba5e0339-1727-4f66-87d0-294ad23a7b32', '3f8d90b6-1e5d-4db9-93b6-1dc89d9f54e0', 'https://eurovik.rs', 'hub', 'Početna', '2.201 klik, pozicija 7,3 na 90 dana. Najjača pojedinačna strana.', '2026-08-26T10:20:48.959Z', 'mcp');
INSERT OR REPLACE INTO project_key_pages (id, project_id, url, role, topic, notes, updated_at, updated_by) VALUES ('0d814c92-5566-4370-9820-5bb4cf58536c', '3f8d90b6-1e5d-4db9-93b6-1dc89d9f54e0', 'https://eurovik.rs/alarm', 'hub', 'Alarmni sistemi', 'Glavna grana bez vidljivog organskog saobraćaja u top 25. Najveći neiskorišćen hub.', '2026-08-26T10:20:48.959Z', 'mcp');
INSERT OR REPLACE INTO project_key_pages (id, project_id, url, role, topic, notes, updated_at, updated_by) VALUES ('16dc791c-1529-45e5-9eb9-d56225f105b0', '3f8d90b6-1e5d-4db9-93b6-1dc89d9f54e0', 'https://eurovik.rs/blog/kako-izabrati-plafonski-ventilator', 'spoke', 'Izbor plafonskog ventilatora', '1.675 klikova na 72.758 impresija, najveći doseg na sajtu. CTR samo 2,3 posto pri poziciji 6,4, pa su naslov i snippet ovde vredniji od novog sadržaja.', '2026-08-26T10:20:48.959Z', 'mcp');
INSERT OR REPLACE INTO project_key_pages (id, project_id, url, role, topic, notes, updated_at, updated_by) VALUES ('cfa58268-25ad-41b4-85f9-90815d638399', '3f8d90b6-1e5d-4db9-93b6-1dc89d9f54e0', 'https://eurovik.rs/blog/kako-samostalno-montirati-led-traku-u-vasem-stanu', 'spoke', 'Montaža LED trake', '729 klikova, pozicija 6,2. Kanibalizuje se sa novijim postom 109, planirana konsolidacija ili 301.', '2026-08-26T10:20:48.959Z', 'mcp');
INSERT OR REPLACE INTO project_key_pages (id, project_id, url, role, topic, notes, updated_at, updated_by) VALUES ('9fbbf83a-e48c-4362-b6dc-dfdd94af4511', '3f8d90b6-1e5d-4db9-93b6-1dc89d9f54e0', 'https://eurovik.rs/blog/zakon-o-video-nadzoru-u-srbiji-sta-treba-da-znate', 'spoke', 'Zakon o video nadzoru', '1.618 klikova, pozicija 4,3, CTR 5,5 posto. Nosač celog pravno-informacionog klastera, na njega se vezuju postovi o komšiji koji snima i o pravilniku.', '2026-08-26T10:20:48.959Z', 'mcp');
INSERT OR REPLACE INTO project_key_pages (id, project_id, url, role, topic, notes, updated_at, updated_by) VALUES ('3073577a-c70f-4ca8-846d-99494d4a7011', '3f8d90b6-1e5d-4db9-93b6-1dc89d9f54e0', 'https://eurovik.rs/interfoni', 'money', 'Interfoni', '690 klikova, pozicija 5,7, CTR 6,2 posto. Zajedno sa podkategorijama audio i video interfoni čini klaster od oko 1.400 klikova.', '2026-08-26T10:20:48.959Z', 'mcp');
INSERT OR REPLACE INTO project_key_pages (id, project_id, url, role, topic, notes, updated_at, updated_by) VALUES ('443e2265-7e5a-4ff5-bad1-d6d4b9d58fd3', '3f8d90b6-1e5d-4db9-93b6-1dc89d9f54e0', 'https://eurovik.rs/led-rasveta', 'hub', 'LED rasveta', 'Isti obrazac kao video nadzor hub, van top 25. Podkategorije rade posao umesto njega.', '2026-08-26T10:20:48.959Z', 'mcp');
INSERT OR REPLACE INTO project_key_pages (id, project_id, url, role, topic, notes, updated_at, updated_by) VALUES ('513db72f-8b02-47b2-b89d-7680d95a3703', '3f8d90b6-1e5d-4db9-93b6-1dc89d9f54e0', 'https://eurovik.rs/led-rasveta/led-neonke', 'money', 'LED neonke', '682 klika, pozicija 5,3, CTR 6,6 posto. Najbolji odnos pozicije i CTR-a u LED grani.', '2026-08-26T10:20:48.959Z', 'mcp');
INSERT OR REPLACE INTO project_key_pages (id, project_id, url, role, topic, notes, updated_at, updated_by) VALUES ('4b7feaac-9e8d-40d9-9b43-c42311b45328', '3f8d90b6-1e5d-4db9-93b6-1dc89d9f54e0', 'https://eurovik.rs/led-rasveta/led-reflektori/solarni-reflektori', 'money', 'Solarni reflektori', '662 klika, pozicija 6,9. Sezonska, leto je vrh. U planu je vodič za izbor jer na srpskom SERP-u nema nijednog, samo product strane.', '2026-08-26T10:20:48.959Z', 'mcp');
INSERT OR REPLACE INTO project_key_pages (id, project_id, url, role, topic, notes, updated_at, updated_by) VALUES ('925ebdac-1eff-4d91-bf55-d2d030d5767f', '3f8d90b6-1e5d-4db9-93b6-1dc89d9f54e0', 'https://eurovik.rs/video-nadzor', 'hub', 'Video nadzor', 'Glavna grana, ali NIJE u top 25 strana po klikovima. Saobraćaj nose podkategorije, hub sam po sebi ne rangira. Prostor za rast.', '2026-08-26T10:20:48.959Z', 'mcp');
INSERT OR REPLACE INTO project_key_pages (id, project_id, url, role, topic, notes, updated_at, updated_by) VALUES ('54125601-75f0-45b5-8a23-4a72d9bd0c6b', '3f8d90b6-1e5d-4db9-93b6-1dc89d9f54e0', 'https://eurovik.rs/video-nadzor/kamere', 'money', 'Kamere za video nadzor', '1.734 klika, 53.389 impresija, pozicija 10,2. Najveća kategorija po dosegu, ali CTR samo 3,2 posto. Pomeranje sa 10 na 5 je najveći pojedinačni dobitak na sajtu.', '2026-08-26T10:20:48.959Z', 'mcp');
INSERT OR REPLACE INTO project_key_pages (id, project_id, url, role, topic, notes, updated_at, updated_by) VALUES ('9bcdfbdc-8174-42ab-86d4-92dc37bbe65d', '3f8d90b6-1e5d-4db9-93b6-1dc89d9f54e0', 'https://eurovik.rs/video-nadzor/kamere/auto-kamere', 'money', 'Auto kamere', '1.124 klika, pozicija 6,4, CTR 4,6 posto. Vezano za planirani blog o rikverc i 360 kamerama.', '2026-08-26T10:20:48.959Z', 'mcp');
INSERT OR REPLACE INTO project_key_pages (id, project_id, url, role, topic, notes, updated_at, updated_by) VALUES ('5b07298e-23f6-4f27-a19b-7f95cfb6a736', '3f8d90b6-1e5d-4db9-93b6-1dc89d9f54e0', 'https://eurovik.rs/video-nadzor/kamere/wifi-kamere', 'money', 'WiFi kamere', '1.185 klikova, 48.990 impresija, pozicija 7,4, CTR 2,4 posto. Doseg velik, CTR nizak, kandidat za prepravku naslova i meta opisa.', '2026-08-26T10:20:48.959Z', 'mcp');
INSERT OR REPLACE INTO project_key_pages (id, project_id, url, role, topic, notes, updated_at, updated_by) VALUES ('587faa4f-b036-424d-8bb9-e4d0d8d40836', '3f8d90b6-1e5d-4db9-93b6-1dc89d9f54e0', 'https://eurovik.rs/video-nadzor/kompleti-nadzora', 'money', 'Kompleti za video nadzor', '421 klik na 13.229 impresija, pozicija 19,2. Najslabija pozicija među velikim kategorijama, jasna meta.', '2026-08-26T10:20:48.959Z', 'mcp');

-- research log (3)
INSERT OR REPLACE INTO project_research_log (id, project_id, entry_date, summary, created_by, created_at) VALUES ('6cb3b649-1e1b-406a-bd5f-f7f93333a03a', '3f8d90b6-1e5d-4db9-93b6-1dc89d9f54e0', '2026-08-26', 'SERP konkurenti izvuceni preko DataForSEO za 6 komercijalnih upita (kamere za video nadzor, video nadzor, led trake, alarm za kucu, video interfon, led reflektor), 20 domena. Top strane povucene iz Search Console, dimenzija page, prozor 23.05 do 23.08.2026. Konkurenti i kljucne strane upisani odavde, ne treba ponavljati.', 'mcp', '2026-08-26T10:19:35.234Z');
INSERT OR REPLACE INTO project_research_log (id, project_id, entry_date, summary, created_by, created_at) VALUES ('8c4d4100-ef35-4d17-8282-13f151cedbf3', '3f8d90b6-1e5d-4db9-93b6-1dc89d9f54e0', '2026-08-26', 'Competitor analysis: svezavideonadzor.rs. Verdict: uzak specijalista za video nadzor, ETV ~1.870, 83 rangirane ključne reči, backlink profil pretežno spam. Snaga: #1 za "kamere za video nadzor" i "video nadzor" (hub-optimizacija). Slabost: #20 za "wifi kamere" (mi #2). Najveća šansa za nas: WiFi/info upiti i kategorije van video nadzora.', 'sam', '2026-08-26T11:21:21.594Z');
INSERT OR REPLACE INTO project_research_log (id, project_id, entry_date, summary, created_by, created_at) VALUES ('0806e6f1-ac09-4e5e-b475-0c52fac08a47', '3f8d90b6-1e5d-4db9-93b6-1dc89d9f54e0', '2026-08-26', 'Competitor analysis: elementa.rs. Verdict: veliki opšti tehno retail, ETV ~20.106 na 1.238 rangiranih ključnih reči, DR 57. Snaga: kamere za video nadzor #2 (ETV 583), led reflektor #1 (hub dominacija), plafonjere top 10. Slabost: led trake #9, led neonke #7 (mi #1), solarni reflektor #12 (mi #4). Najveća šansa za nas: LED trake edukativni sadržaj, zadržavanje prednosti na solarni i neonke, napad na LED trake klaster.', 'sam', '2026-08-26T11:51:16.029Z');

COMMIT;
