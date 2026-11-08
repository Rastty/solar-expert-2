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

Workflow `.github/workflows/solar-editorial-publisher.yml` testuje PR bez jakéhokoli WordPress přístupu. Na výchozí `main` může zpracovat právě jednu v `ops/editorial-release.json` zapnutou operaci **pouze při prvním běhu nového push commitu měnícího tento kontrolní soubor**, nikoli při hodinovém běhu. Tento režim neumožňuje samovolné automatické dávky bez nové zkontrolované manifestové změny.

1. Nejprve `--prepare` bez zápisu stáhne přesně připnutý obsah a ověří SHA, kvalitní minimální text, bezpečné odkazy, napěťové a proudové upozornění, kategorii, existující post/status nebo absenci slugu. Při `post_create` zkontroluje, že v uplynulých 24 hodinách **na celém webu nebyl nový publikovaný post**.
2. Před změnou se pouze na efemérním GitHub runneru připraví prewrite kopie původního raw HTML (u vytvoření záznam o absenci), očekávaná nová verze a hashe. Protože repozitář je **veřejný**, obyčejný GitHub Actions artifact není privátní úložiště. Snapshot se proto **ještě před nahráním zašifruje** pomocí OpenSSL AES-256-CBC se salt + PBKDF2 (200 000 iterací, SHA-256), klíčem odvozeným od existujícího WordPress Application Password z GitHub Secrets. GitHub uchovává 30 dní **pouze soubor `editorial-prewrite-private.enc`**, nikdy syrový `.json` jako artifact. Šifrování i úspěšný upload jsou povinné podmínky pro jakýkoli zápis do WP. Plná původní podoba zůstává po dobu jobu jen v pracovním adresáři runneru pro následné porovnání. Při rotaci aplikačního hesla počítejte s tím, že pro dešifrování starších archivů bude potřeba původní heslo; nerozesílat ani neukládat jeho hodnotu do veřejných repozitářů nebo logů.
3. `--apply` ještě jednou nezávisle přečte aktuální WP post / seznam slugů, znovu ověří identitu, přesnou stávající verzi a obsah připraveného archivu a provede maximálně **jeden POST**.
4. Zkontroluje post ID, skutečně publikovaný stav, kanonickou URL, kategorii, přesný SHA256 těla postu a že nikdo nevytvořil duplicitní slug. Veřejné načtení URL je navíc **best effort** a má samostatný stav `public_content_seen|public_pending|public_unavailable`.
5. Po nejasné odpovědi, timeoutu, 5xx, změně obsahu nebo nedoloženém výsledku **nikdy automaticky neopakuje POST**. Zanechá `outcome_unknown_do_not_retry` nebo `readback_inconclusive_do_not_retry` a je nutné ručně zkontrolovat skutečný stav.
6. **Proti opakování napříč běhy:** produkční writer může nastartovat pouze **první pokus** události `push` na `main` (`github.run_attempt == 1`), a jen když je v rozsahu push skutečně změněn `ops/editorial-release.json`. Hodinový `schedule`, `workflow_dispatch`, údržbový push bez změny řízení ani ruční **Re-run jobs** nesmí spustit WordPress POST. Novou operaci je třeba explicitně přepnout přes zkontrolovaný Git PR do `main`; jen změna článku ve větvi `dev` nepublikuje. Po nejasném POST výsledku je vyžadována nezávislá read-only kontrola webu před jakýmkoli novým publikovacím commitem; nepřepínat starý manifest znovu.

## Ochrana WordPress obsahu ve veřejných GitHub artefaktech

Samotný název „private“ v názvu Actions artefaktu nezaručuje soukromí: repozitář je veřejný a artefakty mohou stáhnout uživatelé s oprávněním číst repozitář. Publikační workflow proto vyžaduje šifrování **před** `actions/upload-artifact` a ukládá jen ciphertext, nikoli kopii syrového těla původního článku.

Pro ověřené oprávněné obnovení je potřeba původní WordPress Application Password použitý při daném běhu a jeho archiv `editorial-prewrite-private.enc`. Po bezpečném načtení hesla do lokální proměnné prostředí (bez vypisování v historii příkazů) lze použít stejný `openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -md sha256 -in editorial-prewrite-private.enc -out editorial-prewrite-restored.json -pass env:SOLAR_WP_APP_PASSWORD`. Před případným použitím obnoveného obsahu musí být nezávisle ověřen identifikátor operace, kanonický slug, `original_sha256`, stav WordPressu a vhodný rollback postup; dešifrování **není** samo o sobě povolení přepsat produkci.

Pro důvěrnost se využívá náhodná salt OpenSSL. Integrita při obnově se musí zvlášť ověřit proti očekávanému SHA256; AES-CBC bez samostatné autentizace nelze používat jako důkaz nepozměněného obsahu. Tento archiv není náhradou plné obnovy databáze nebo médií a zde neotevírá rizikovou release větev `dev`.

## UTC a stránkování: nezávisle připomínkovaná oprava 2026-11-07

Při revizi [PR #154](https://github.com/Rastty/solar-expert-2/pull/154) byl nalezen problém původní kontroly 24h publikací: filtr WordPress REST `after` s časem bez zóny může WordPress interpretovat podle místního `date` a na českém webu propustit článek o 1–2 hodiny předčasně.

**Opravené pravidlo:** `recent_posts_gate()` neodesílá žádný serverový `after` filtr. Čte `/wp/v2/posts` se `status=publish`, `context=edit`, `orderby=date`, `order=desc`, `per_page=100`, `page=N` a s poli `id,slug,status,date,date_gmt`. Každé `date_gmt` musí být skutečně parsovatelný kalendářní datum/čas **UTC**, bez místního přeinterpretování. Pokud je jediné datum `date_gmt >= nyní_UTC−24h`, další `post_create` se zablokuje.

WordPress řadí podle lokálního `date`, proto se `date` používá **pouze** k ověření monotónního řazení a k konzervativnímu ukončení stránkování, když je nejstarší lokální datum alespoň 14 hodin **před** UTC hranicí. Čtrnáctihodinová rezerva pokrývá i záporné časové zóny a přechody CET/CEST; bez bezpečně prokázaného konce skenu se kontrola nevydá za úspěšnou. U plné stránky 100 pokračuje na další stránku; víc než 30 plných, nedostatečně starých stránek, nekonzistentní pořadí, neplatná data, chybějící stav nebo čas publikace => **fail closed**. Nepoužívá se žádné hádané místní `after` ani přeskočení prvních 100 záznamů.

**Ověření na živém REST, pouze GET:** `solar-expert.cz` dne 7. 11. 2026 úspěšně vrátilo přesný produkční dotaz s `per_page=100`, `status=publish` a oběma datovými poli pro 100 publikovaných příspěvků, sestupně seřazených podle `date`. Nejnovější položka WP **#1618**, `date_gmt=2026-11-07T13:00:39`; nejstarší na první stránce WP **#1304** z roku 2025. Poslední nový příspěvek je tedy při dnešním běhu v UTC 24h okně a další nový článek by byl bezpečně odmítnut. To je pouze ověření dostupného API, **nikoli první skutečná GitHub Actions publikace**.

**Offline testy:** fixované okamžiky CET a CEST, podzimní posun času, přesná 24h hrana, 101+ záznamů a více stránek, chybná či chybějící `date_gmt`, rozbité řazení a limit stránkování. Nezávislý schvalovatel musí zkontrolovat opravený SHA PR, ne považovat starší komentář `COMMENTED` za schválení.

## Záměrná bezpečnostní omezení

- Jeden globální `concurrency` zámek proti současným běhům tohoto workflow. **Nekryje externí WordPress editory**; proto se kontroluje SHA + `modified_gmt` znovu těsně před zápisem. WordPress Core REST neposkytuje atomické compare-and-swap, závod mezi posledním GET a POST není matematiky vyloučen.
- Samostatná ruční WordPress publikace ani přímý WPVibe zápis není automaticky blokován tímto workflow. Hodinový portfolio worker musí udržet jediného odpovědného zapisovatele.
- `post_create` záměrně nepublikuje během prvních 24 hodin od posledního publikovaného příspěvku na webu. Pokud se WordPress kalendář či REST stav nedá ověřit, chybějící důkaz neznamená povolení zápisu.
- PHP/JavaScript, formuláře, skripty, event handlery, externí obrázky, nešifrované odkazy a natvrdo vložené přesměrovací affiliate URL jsou odmítány. Externí HTTPS citace zůstávají povolené.
- Tato archivace **nenahrazuje celou databázi/mediální snapshot** před výměnou tématu ani nezaručuje bezpečnou elektrickou instalaci. Zůstávají oddělené blokace theme release #142 a #148.
- WooCommerce, produkty, ceny, zásoby, affiliate účty, síťové komponenty, návrh jištění a instalace, neověřené Growatt/PV Isc a hromadné SEO změny nejsou předmětem této publikační autorizace.

## Reálný startovací důkaz

WordPress příspěvek **#1618** `/solarni-panel-na-karavan-200w/` byl už skutečně publikován přes autorizovaný REST; příspěvek **#1615** byl upraven a ověřen. Git redakční zdroj je v [PR #153](https://github.com/Rastty/solar-expert-2/pull/153). **Tato již hotová publikace nesmí být znovu vytvářena ani automaticky replayována.** Nový výše popsaný Actions mechanismus začíná vypnutý a teprve po kontrole kódu a oprávnění získá vlastní první kontrolovaný běh. Dokud není doložen jeho první skutečný `wp_verified` receipt, nelze tvrdit, že GitHub přímo samostatně publikuje.
