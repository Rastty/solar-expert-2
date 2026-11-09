# Solar Expert: nákupní SEO příležitosti — 13. 10. 2026

## Co máme doloženo

Nejnovější dostupný **Prometheus GSC read-only monitor**, dokončený 12. 10. 2026 UTC: [Actions run 38298682882](https://github.com/Rastty/prometheus-growth-os/actions/runs/38298682882).

- Posledních **28 dní**: 94 měřených URL, **5 kliknutí / 1 042 zobrazení** (nikoliv hledanost klíčových slov na českém trhu).
- Posledních **90 dní**: 120 URL, **15 kliknutí / 3 456 zobrazení**.
- Silný existující technický near-win: `/kolik-panelu-je-potreba-na-jeden-string/` **91 impresí / průměrná pozice 9,85** za 90 dní, ale obsah byl změněn 5. 10. a je pod 28denní ochranou.
- Přímé nákupní dotazy: `fotovoltaika na eternitovou střechu` **23 impresí / pozice 11,26**; `tepelné čerpadlo samsung recenze` **31 impresí / pozice 10,52**. Obě URL jsou po čerstvém přepisu pod ochranou; **nepřepisovat znovu**.
- Počáteční indexační dluh: 10 z 24 sledovaných nedávno upravených stránek teprve čekalo na první crawl; 12 čekalo na nový crawl a pouze dvě už Google prokazatelně navštívil po poslední změně. Proto nový článek potřebuje interní odkazy, Yoast Index/Follow, sitemap, nikoli bezhlavé přepisování starého obsahu.

## Co NEMÁME doloženo

**Nemáme placený Keyword Planner/Ahrefs/Semrush export měsíčních hledaností pro nové exact-match fráze.** Zobrazení v Search Console jsou imprese *našeho webu*, **nikoliv** objem celé poptávky. Nízkou konkurenci nelze slíbit pouhým počtem výsledků vyhledávače.

Rychlé veřejné SERP posouzení 13. 10.: u modelů **SmartSolar 100/20, 100/30, 100/50** se objevují produktové stránky, ceníky a některé technické návody, včetně relevantního konkurenčního [průvodce Victron](https://cpv24.pl/cs/navody/vyber-mppt-panelum/). Čistě transakční produktové výrazy tedy nemusí být lehké. Naše hypotéza je specifická *rozhodovací mezera*: panel 400 W + **12 V versus 24 V** + přesná kompatibilita + český nákupní nástroj; konkurence je **předběžný kvalitativní odhad**, ne ověřené nízké KD.

## První testované články — vydat jako originální, ne jako přepis existujících near-winů

| Priorita | Nová stránka | Primární nákupní intent | Důkaz/hypotéza | Cesta k výnosu |
|---|---|---|---|---|
| P1 | `/jak-vybrat-mppt-regulator-pro-400w-panel/` | koupě konkrétního regulátoru podle 400Wp, 12/24 V | Přilehlé GSC string/MPPT dotazy potvrzují technickou poptávku; přesná fráze bez kvantifikace | článek → MPPT kalkulačka → tři cenové nabídky, včetně VSelektro |
| P1 | `/solarni-sestava-na-chatu-pro-lednici/` | složit sestavu na reálnou spotřebu lednice 230 V | Viditelná poptávka ve veřejné odborné [poradně i-EKIS](https://efekt.gov.cz/cz/ekis/i-ekis/81569), ale **bez měření hledanosti**; přesný podtyp je odlišný od obecného Builderu | článek → Builder → 12/24 V panely + baterie + měnič + MPPT |

Obě URL jsou nové, jejich primární otázky jsou vzájemně odlišné a nekanibalizují výklad stringů na původním 91impresovém URL. Text musí být skutečný nákupní rádce, ne generické Top 10 a ne stránky s uměle doplněným affiliate URL. Produktové provize zůstávají soukromě ve WP a odkazy se generují jen v nástrojích.

## Backlog po prvním indexačním běhu, NEpublikovat naslepo

1. `/baterie-lifepo4-na-chatu-12v-nebo-24v/`: možná samostatná otázka BMS/energie, vyžaduje kontrolu query overlap s článkem pro lednici a již existujícím Battery Selectorem.
2. `/menic-pro-lednici-rozbehovy-proud/`: silný nákupní moment; jako samostatný článek jen po doložení odlišné hledanosti a nezanedbatelného intentu (jinak rozšířit rodičovský článek).
3. `/mppt-pro-dva-panely-400w/`: 2S versus 2P; zvažovat teprve po prvních výsledcích článku pro jeden 400W panel, aby nedošlo ke kanibalizaci.
4. Znovu vyhodnotit již přepsané GSC near-winy po **28 finálních dnech** od poslední obsahové změny a po recrawlu, ne hned po publikaci.

## Měření

- **Den 0:** publikace, veřejné HTTP 200, kanonická URL, index/follow, post sitemap, interní odkazy z indexované homepage a kategorického archivu.
- **Dny 7/14:** URL inspection / první crawl, query mix, případné technické blokace; nehodnotit CTR bez dostatečných zobrazení.
- **Den 28:** měřit GSC imprese, pozice, kliky nových URL a zdrojové referraly → `tool_exposure` → `affiliate_click`. Kvalitativní SERP/KD hypotézu aktualizovat z výsledků. Provize se potvrzují jen v eHUB, ne z webové události kliknutí.
- **Ochrana:** neobnovovat datum `verified_at` obchodních cen bez reálného ověření. Neměnit frozen Selector Core, technické ranking pravidlo, ani stávající canonical/redirect URL.

Technické zdroje v textech: aktuální manuály [Victron 100/20](https://www.victronenergy.com/media/pg/Manual_SmartSolar_MPPT_75-10_up_to_100-20/en/technical-specifications.html), [Victron 100/30–100/50](https://www.victronenergy.com/media/pg/Manual_SmartSolar_MPPT_100-30__100-50/en/technical-specifications.html), [EU JRC PVGIS](https://joint-research-centre.ec.europa.eu/photovoltaic-geographical-information-system-pvgis/using-pvgis-5/pvgis-5-tools/grid-connected-pv_en).
