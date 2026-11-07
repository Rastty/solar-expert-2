# Solar Expert – oddělený GitHub → WordPress editor (2026-11-07)

## Účel a zásadní rozdíl proti deployi tématu

Produkční web `solar-expert.cz` používá WordPress téma z větve **`dev`**. Vydání tématu mění také spravovaný obsah a **vyžaduje** nezávislou revizi, skutečnou zálohu databáze+médií a obnovovací test podle [#148](https://github.com/Rastty/solar-expert-2/issues/148) / [#142](https://github.com/Rastty/solar-expert-2/pull/142).

Tento menší editor je záměrně v oddělené **výchozí větvi `main`**, kde může běžet samostatný GitHub Actions workflow. Je určen pouze pro **jeden nový redakční příspěvek nebo jednu přesně identifikovanou aktualizaci příspěvku**, nikdy pro plugin, téma, full SQL, redirect, affiliate tracking, produkty, kategoriální bulk akce ani změnu WordPress globálních voleb. Jednotlivé redakční WordPress REST zápisy se tak nemusí čekat na celý theme release.

**Stav návrhu:** kontrolní soubor `ops/editorial-release.json` má `enabled=false`. Samotné vytvoření tohoto PR ani zelené offline testy **žádný WordPress zápis nespustí**. Při chybějících přihlašovacích údajích vydá workflow výsledek `configuration_missing` a nic nepublikuje.

## Přístup – jednorázové nastavení, nikdy necommitovat hesla

V `Rastty/solar-expert-2 → Settings → Secrets and variables → Actions` se ukládají **repository secrets**:

- `SOLAR_WP_USER` – jméno odděleného uživatele s nejmenšími potřebnými právy (zpravidla Editor; musí smět upravovat konkrétní vlastní/cizí post podle oprávnění).
- `SOLAR_WP_APP_PASSWORD` – *WordPress Application Password* vytvořené jen pro tohoto publikačního uživatele. Není to běžné login heslo.
- `GITHUB_TOKEN` – poskytuje GitHub Actions automaticky v rozsahu `contents: read`; žádný vlastní PAT není potřeba.

Přihlašovací údaje nejsou dostupné na `pull_request` testovací větvi, nejsou předávány checkoutu ani archivaci a nemají se zobrazovat v komentářích PR, v dokumentech nebo v logách. V případě úniku WordPress aplikační heslo zrušit.

## Git jako skutečný zdroj článku

Každá publikace je samostatný zkontrolovaný manifest a **neměnný přesný Git commit** obsahující:

`content/rewrites/<slug>.html`

Tento soubor může být i ve stále otevřeném redakčním PR (například [#153](https://github.com/Rastty/solar-expert-2/pull/153)), protože `main` publikátor jej stahuje přes GitHub Contents API s **přesným 40znakovým commit SHA a obsahovým SHA256**. Nepoužívá proměnlivé `dev` ani název PR větve jako identitu článku.

V `ops/editorial-manifests/<operation-id>.json` jsou ověřené hodnoty: `schema_version=1`, `authorization=owner_standing_editorial`, `kind=post_create|post_update`, unikátní `operation_id`, kanonický `slug`, `title`, `excerpt`, `category_slug=solarni-panely`, `source_commit`, `source_file`, `source_sha256` a podle režimu buď `expect_absent=true`, nebo přesné `post_id`, `expected_modified_gmt`, `expected_current_sha256`.

Příklad struktury pro **nový** článek (nejde o připravenou konkrétní operaci ani platnou SHA pro živé použití):

```json
{
  "schema_version": 1,
  "authorization": "owner_standing_editorial",
  "kind": "post_create",
  "operation_id": "solar-unique-buyer-topic-20261108-v1",
  "slug": "unikatni-technicky-pruvodce-2026",
  "expected_status": "publish",
  "category_slug": "solarni-panely",
  "title": "Nový ověřený průvodce pro kupující: konkrétní rozhodnutí",
  "excerpt": "Unikátní odborný nákupní průvodce, který vysvětluje kompatibilitu a následný technický výběr.",
  "source_commit": "<PŘESNÉ GIT SHA40>",
  "source_file": "content/rewrites/unikatni-technicky-pruvodce-2026.html",
  "source_sha256": "<SHA256 PŘESNÉHO OBSAHU SOUBORU>",
  "expect_absent": true
}
```

Pro úpravu již publikovaného článku navíc použít `kind=post_update`, `post_id`, `expected_modified_gmt` a `expected_current_sha256` získané z **aktuálního autorizovaného GET** bez úprav jiného obsahu. Úprava obsahuje celý nový zdroj, ale přepíše jej až po shodě SHA256 stávajícího plného raw HTML a přesného data změny. Pokud mezitím někdo článek upraví, **zápis se zablokuje**, nikdy nevynutí.

## Jedno zveřejnění = jeden bezpečný zápis

Workflow `.github/workflows/solar-editorial-publisher.yml` testuje PR bez jakéhokoli WordPress přístupu. Na výchozí `main` může zpracovat právě jednu v `ops/editorial-release.json` zapnutou operaci.

1. Nejprve `--prepare` bez zápisu stáhne přesně připnutý obsah a ověří SHA, kvalitní minimální text, bezpečné odkazy, napěťové a proudové upozornění, kategorii, existující post/status nebo absenci slugu. Při `post_create` zkontroluje, že v uplynulých 24 hodinách **na celém webu nebyl nový publikovaný post**.
2. Před změnou se vygeneruje **soukromá prewrite kopie** celé původní raw body postu (pro create záznam o absenci), očekávaná nová verze a hashe. Je nahrána jako GitHub Actions artifact s 30denní retencí. **Úspěšný upload je podmínkou spuštění zápisu.**
3. `--apply` ještě jednou nezávisle přečte aktuální WP post / seznam slugů, znovu ověří identitu, přesnou stávající verzi a obsah připraveného archivu a provede maximálně **jeden POST**.
4. Zkontroluje post ID, skutečně publikovaný stav, kanonickou URL, kategorii, přesný SHA256 těla postu a že nikdo nevytvořil duplicitní slug. Veřejné načtení URL je navíc **best effort** a má samostatný stav `public_content_seen|public_pending|public_unavailable`.
5. Po nejasné odpovědi, timeoutu, 5xx, změně obsahu nebo nedoloženém výsledku **nikdy automaticky neopakuje POST**. Zanechá `outcome_unknown_do_not_retry` nebo `readback_inconclusive_do_not_retry` a je nutné ručně zkontrolovat skutečný stav.
6. Při opakovaném hodinovém běhu už hotová operace vrátí `already_live_verified` (**0 nových zápisů**). Novou operaci je třeba explicitně přepnout přes Git PR do `main`. Jen změna obsahu na proměnlivé větvi `dev` žádné WordPress publikování nespouští.

## Záměrná bezpečnostní omezení

- Jeden globální `concurrency` zámek proti současným běhům tohoto workflow. **Nekryje externí WordPress editory**; proto se kontroluje SHA + `modified_gmt` znovu těsně před zápisem. WordPress Core REST neposkytuje atomické compare-and-swap, závod mezi posledním GET a POST není matematiky vyloučen.
- Samostatná ruční WordPress publikace ani přímý WPVibe zápis není automaticky blokován tímto workflow. Hodinový portfolio worker musí udržet jediného odpovědného zapisovatele.
- `post_create` záměrně nepublikuje během prvních 24 hodin od posledního publikovaného příspěvku na webu. Pokud se WordPress kalendář či REST stav nedá ověřit, chybějící důkaz neznamená povolení zápisu.
- PHP/JavaScript, formuláře, skripty, event handlery, externí obrázky, nešifrované odkazy a natvrdo vložené přesměrovací affiliate URL jsou odmítány. Externí HTTPS citace zůstávají povolené.
- Tato archivace **nenahrazuje celou databázi/mediální snapshot** před výměnou tématu ani nezaručuje bezpečnou elektrickou instalaci. Zůstávají oddělené blokace theme release #142 a #148.
- WooCommerce, produkty, ceny, zásoby, affiliate účty, síťové komponenty, návrh jištění a instalace, neověřené Growatt/PV Isc a hromadné SEO změny nejsou předmětem této publikační autorizace.

## Reálný startovací důkaz

WordPress příspěvek **#1618** `/solarni-panel-na-karavan-200w/` byl už skutečně publikován přes autorizovaný REST; příspěvek **#1615** byl upraven a ověřen. Git redakční zdroj je v [PR #153](https://github.com/Rastty/solar-expert-2/pull/153). **Tato již hotová publikace nesmí být znovu vytvářena ani automaticky replayována.** Nový výše popsaný Actions mechanismus začíná vypnutý a teprve po kontrole kódu a oprávnění získá vlastní první kontrolovaný běh. Dokud není doložen jeho první skutečný `wp_verified` receipt, nelze tvrdit, že GitHub přímo samostatně publikuje.
