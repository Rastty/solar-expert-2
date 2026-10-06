const fs=require('fs');
const path=require('path');
const assert=require('assert');

const sourcePath=path.join(__dirname,'..','data','product-seed.json');
const activePath=path.join(__dirname,'..','assets','data','product-seed.json');
const source=JSON.parse(fs.readFileSync(sourcePath,'utf8'));
const active=JSON.parse(fs.readFileSync(activePath,'utf8'));

assert.deepStrictEqual(active,source,'Active frontend catalog must exactly match data/product-seed.json');

const forbiddenKeys=new Set(['affiliate_url','affiliateUrl','deeplink','tracking_url','trackingUrl']);
function walk(value,where='root'){
  if(Array.isArray(value)){value.forEach((v,i)=>walk(v,where+'['+i+']'));return;}
  if(!value||typeof value!=='object')return;
  for(const [key,val] of Object.entries(value)){
    assert(!forbiddenKeys.has(key),'Public catalog contains forbidden affiliate field '+where+'.'+key);
    walk(val,where+'.'+key);
  }
}
walk(source,'catalog');

assert(Array.isArray(source.bundle_deals),'Catalog bundle deals must be an array');
const productIds=new Set((source.products||[]).map(p=>p.id));
const dealIds=new Set();
for(const deal of source.bundle_deals){
  assert(deal.id&&!dealIds.has(deal.id),'Bundle deal id must be unique: '+deal.id);
  dealIds.add(deal.id);
  assert(Array.isArray(deal.components)&&deal.components.length>=2,'Bundle deal must reference at least two components: '+deal.id);
  for(const componentId of deal.components){
    assert(productIds.has(componentId),'Bundle deal references unknown product '+componentId+' in '+deal.id);
  }
  assert(Number(deal.price_czk)>0,'Bundle deal price must be positive: '+deal.id);
  assert(/^https:\/\//.test(deal.source_url||''),'Bundle deal source must be HTTPS: '+deal.id);
  assert(deal.availability==='in_stock','Only verified in-stock bundle deals may be active: '+deal.id);
}

const merchantRegistry=JSON.parse(fs.readFileSync(path.join(__dirname,'..','data','merchant-registry.json'),'utf8'));
const merchantIds=new Set((merchantRegistry.merchants||[]).map(m=>m.id));
assert(merchantIds.size>0,'Merchant registry must not be empty');
const verifiedDate=/^\d{4}-\d{2}-\d{2}$/;

for(const product of source.products||[]){
  assert(product.id&&typeof product.id==='string','Product is missing id');
  if(Number(product.parallel_max_units||1)>1){
    assert(product.type==='battery','Only battery products may declare parallel_max_units: '+product.id);
    assert(Number.isInteger(Number(product.parallel_max_units))&&Number(product.parallel_max_units)>=2,'parallel_max_units must be an integer >=2: '+product.id);
    assert(/^https:\/\//.test(product.parallel_evidence_url||''),'Parallel battery evidence URL must be HTTPS: '+product.id);
    assert(verifiedDate.test(product.parallel_verified_at||''),'Parallel battery evidence must be date-stamped: '+product.id);
  }
  if(product.lifepo4_charge_supported===false){
    assert(String(product.charger_note||'').trim().length>20,'Lead-acid-only charger must document the chemistry limitation: '+product.id);
    assert(/^https:\/\//.test(product.charger_evidence_url||''),'Charger chemistry evidence URL must be HTTPS: '+product.id);
    assert(verifiedDate.test(product.charger_verified_at||''),'Charger chemistry evidence must be date-stamped: '+product.id);
  }
  assert(merchantIds.has(product.merchant),'Unknown primary merchant '+product.merchant+' for '+product.id);
  if(Array.isArray(product.offers)){
    const offerMerchants=new Set();
    for(const offer of product.offers){
      assert(merchantIds.has(offer.merchant),'Unknown offer merchant '+offer.merchant+' for '+product.id);
      assert(!offerMerchants.has(offer.merchant),'Duplicate offer merchant '+offer.merchant+' for '+product.id);
      offerMerchants.add(offer.merchant);
      assert(/^https:\/\//.test(offer.source_url||''),'Offer source must be HTTPS for '+product.id+'@'+offer.merchant);
      assert(Number(offer.price_czk)>0,'Offer price must be positive for '+product.id+'@'+offer.merchant);
      if((offer.availability||product.availability)!=='discontinued'){
        assert(verifiedDate.test(offer.verified_at||product.verified_at||''),'Active priced offer must be date-verified: '+product.id+'@'+offer.merchant);
      }
    }
    const primary=product.offers.find(o=>o.merchant===product.merchant);
    assert(primary,'Primary merchant must exist in offers for '+product.id);
    assert(Number(product.price_czk)===Number(primary.price_czk),'Primary price must match primary offer for '+product.id);
  }else if(Number(product.price_czk)>0 && product.availability!=='discontinued'){
    assert(verifiedDate.test(product.verified_at||''),'Active priced product must be date-verified: '+product.id);
  }
}

const manifestPath=path.join(__dirname,'..','content','manifest.json');
const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
assert(Array.isArray(manifest.items),'content/manifest.json must expose items[]');

const seen=new Set();
for(const item of manifest.items){
  assert(item.type==='page'||item.type==='post','Unsupported manifest type for '+item.slug);
  assert(item.slug&&typeof item.slug==='string','Manifest item is missing slug');
  assert(item.file&&typeof item.file==='string','Manifest item '+item.slug+' is missing file');
  assert(item.file.startsWith('content/'),'Managed content must stay under content/: '+item.file);
  const key=item.type+':'+item.slug;
  assert(!seen.has(key),'Duplicate managed content slug '+key);
  seen.add(key);
  const filePath=path.join(__dirname,'..',item.file);
  assert(fs.existsSync(filePath),'Managed content file does not exist: '+item.file);
}

console.log('Solar Expert repository integrity checks passed');


const deploy=JSON.parse(fs.readFileSync(path.join(__dirname,'..','deploy.json'),'utf8'));
assert(deploy.repository==='Rastty/solar-expert-2','deploy.json repository mismatch');
assert(deploy.branch==='dev','deploy.json must target dev for release-candidate deployment');
assert(deploy.package_type==='theme','deploy.json package_type must be theme');
const deployThemeRoot=path.resolve(path.join(__dirname,'..'),deploy.theme_path||'.');
assert(fs.existsSync(path.join(deployThemeRoot,'style.css')),'deploy.json must point to a valid WordPress theme root containing style.css');
assert(fs.existsSync(path.join(deployThemeRoot,'functions.php')),'deploy.json theme root must contain functions.php');
assert(deploy.production_requires_manual_approval===true,'Production deployment must require manual approval');
if(deploy.plugin_path){
  assert(fs.existsSync(path.join(__dirname,'..',deploy.plugin_path)),'Configured plugin_path must exist');
}


const publicTemplateFiles=['front-page.php','header.php','footer.php'];
const draftManagedPages=new Set(
  manifest.items
    .filter(item=>item.type==='page'&&item.create_if_missing===true&&(item.status_if_new||'draft')!=='publish')
    .map(item=>item.slug)
);
for(const file of publicTemplateFiles){
  const content=fs.readFileSync(path.join(__dirname,'..',file),'utf8');
  for(const slug of draftManagedPages){
    const unsafe="home_url('/"+slug+"/')";
    assert(!content.includes(unsafe),'Managed draft page must not be linked directly from '+file+': '+slug);
  }
}


for(const item of manifest.items){
  if(item.publish_ready){
    assert(item.type==='page','publish_ready currently supports reviewed pages only: '+item.slug);
    assert(item.status==='publish','publish_ready pages must publish existing managed drafts: '+item.slug);
    assert(item.status_if_new==='publish','publish_ready pages must publish when created: '+item.slug);
  }
}

const managedContentSlugs=new Set(manifest.items.map(x=>x.slug));
for(const item of manifest.items.filter(x=>x.publish_ready&&x.file)){
  const html=fs.readFileSync(path.join(__dirname,'..',item.file),'utf8');
  const hrefs=[...html.matchAll(/href=["']\/([^"'#?]+)\/?["']/g)].map(m=>m[1].replace(/\/$/,''));
  for(const slug of hrefs){
    assert(managedContentSlugs.has(slug),'Internal tool link from '+item.slug+' targets unmanaged content: '+slug);
  }
}


const corePhp=fs.readFileSync(path.join(__dirname,'..','inc','core.php'),'utf8');
assert(corePhp.includes("get_option('solar_expert_affiliate_bases'"),'Health/settings core must load affiliate bases');
assert(corePhp.includes("'affiliate_merchant_bases' => count($bases)"),'Health payload must expose affiliate merchant base count');
assert(corePhp.includes("function solar_expert_affiliate_coverage("),'Affiliate coverage must be computed from catalog offers and private mappings');
assert(corePhp.includes("'affiliate_recommendable_offer_coverage_pct'"),'Health payload must expose recommendable offer monetization coverage');
assert(corePhp.includes("'affiliate_recommendable_product_coverage_pct'"),'Health payload must expose recommendable product monetization coverage');
assert(corePhp.includes("'affiliate_monetized_merchants'"),'Health payload must expose monetized merchant count');
assert(corePhp.includes("function solar_expert_lead_coverage("),'Lead-gen coverage must account for base-link monetization');
assert(corePhp.includes("'affiliate_monetized_lead_targets'"),'Health payload must expose monetized lead target count');
assert(corePhp.includes("'affiliate_lead_coverage_pct'"),'Health payload must expose lead-gen monetization coverage');
assert(corePhp.includes("get_file_data($style_file"),'Health must read release metadata directly from deployed style.css');
assert(corePhp.includes("'build_marker' => 'dev-rc-' . $theme_version"),'Health build marker must use the directly-read deployed theme version');
assert(corePhp.includes("register_setting('solar_expert_settings','solar_expert_affiliate_bases'"),'Affiliate bases must be registered as a WordPress setting');


const solarCore=fs.readFileSync(path.join(__dirname,'..','inc','core.php'),'utf8');
assert(solarCore.includes("add_theme_page('Solar Expert','Solar Expert','edit_theme_options'"),'Solar Expert settings must use theme-management capability');
assert(solarCore.includes("option_page_capability_solar_expert_settings"),'Settings submission must use matching capability override');


const settingsCore=fs.readFileSync(path.join(__dirname,'..','inc','core.php'),'utf8');
assert(settingsCore.includes("admin_post_solar_expert_save_settings"),'Solar Expert settings must have a dedicated admin save handler');
assert(settingsCore.includes("admin_url('admin-post.php')"),'Solar Expert settings form must bypass options.php');
assert(!settingsCore.includes('<form method="post" action="options.php">'),'Solar Expert settings must not post to options.php');
assert(settingsCore.includes("wp_nonce_field('solar_expert_save_settings')"),'Solar Expert settings save must be nonce protected');


const contentSyncCore=fs.readFileSync(path.join(__dirname,'..','inc','core.php'),'utf8');
assert(contentSyncCore.includes("admin_post_solar_expert_sync_content"),'Managed content sync must have a dedicated admin handler');
assert(contentSyncCore.includes("solar_expert_sync_managed_content(true)"),'Managed content sync button must force manifest synchronization');
assert(contentSyncCore.includes("wp_nonce_field('solar_expert_sync_content')"),'Managed content sync must be nonce protected');


const seoCore=fs.readFileSync(path.join(__dirname,'..','inc','core.php'),'utf8');
assert(seoCore.includes("Solární kalkulačka: panely, baterie a měnič | Solar Expert"),'Homepage SEO title must be explicit and decision-engine focused');
assert(seoCore.includes('meta name="description"'),'Managed SEO pages must expose a meta description when no SEO plugin owns it');


const rescueRedirects={
  'veda-o-ztrate-ucinnosti-solarnich-panelu-v-prubehu-casu':'rychlost-degradace-je-dulezita-pri-vyberu-solarnich-panelu',
  'jak-funguji-solarni-panely-na-plochych-strechach':'kotveni-fotovoltaickych-panelu-na-ploche-strese',
  'kotveni-fotovoltaickych-panelu-na-ploche-strese-2':'kotveni-fotovoltaickych-panelu-na-ploche-strese'
};
const allManagedSlugs=new Set(manifest.items.map(x=>x.slug));
for(const [source,target] of Object.entries(rescueRedirects)){
  assert(source!==target,'SEO rescue redirect must not loop: '+source);
  assert(allManagedSlugs.has(target),'SEO rescue redirect target must be managed: '+target);
}
const rescueRequired=[
  'rychlost-degradace-je-dulezita-pri-vyberu-solarnich-panelu',
  'kotveni-fotovoltaickych-panelu-na-ploche-strese',
  'velikost-rozmery-a-hmotnost-solarnich-panelu'
];
for(const slug of rescueRequired){
  const item=manifest.items.find(x=>x.slug===slug);
  assert(item&&item.preserve_status===true,'SEO rescue rewrite must preserve existing post status: '+slug);
  assert(item.file&&fs.existsSync(path.join(__dirname,'..',item.file)),'SEO rescue rewrite file missing: '+slug);
}
assert(seoCore.includes("veda-o-ztrate-ucinnosti-solarnich-panelu-v-prubehu-casu"),'Degradation duplicate redirect must be registered');
assert(seoCore.includes("jak-funguji-solarni-panely-na-plochych-strechach"),'Flat-roof duplicate redirect must be registered');
assert(seoCore.includes("'kotveni-fotovoltaickych-panelu-na-ploche-strese-2' => 'kotveni-fotovoltaickych-panelu-na-ploche-strese'"),'Duplicate flat-roof -2 URL must redirect to canonical guide');
assert(seoCore.includes("is_singular(array('page','post'))"),'SEO metadata must support managed posts as well as pages');


const gscNearWinSlugs=['fotovoltaika-vykon-na-m2','co-je-1-kwp','jak-zapojit-solarni-panely'];
for(const slug of gscNearWinSlugs){
  assert(seoCore.includes("'"+slug+"' => array("),'GSC-driven near-win pages must have dedicated SEO metadata: '+slug);
  const item=manifest.items.find(x=>x.slug===slug);
  assert(item&&item.file&&fs.existsSync(path.join(__dirname,'..',item.file)),'GSC-driven rewrite must remain managed: '+slug);
}
assert(fs.existsSync(path.join(__dirname,'..','docs','GSC_BASELINE.md')),'Prometheus GSC baseline document must exist');
const gscBaseline=fs.readFileSync(path.join(__dirname,'..','docs','GSC_BASELINE.md'),'utf8');
assert(gscBaseline.includes('1,713'),'GSC baseline must preserve measured historical impressions');
assert(gscBaseline.includes('/fotovoltaika-vykon-na-m2/'),'GSC baseline must include the strongest Wp/m² near-win URL');


const freshNearWins=['kolik-panelu-je-potreba-na-jeden-string','fotovoltaika-na-eternitovou-strechu'];
for(const slug of freshNearWins){
  const item=manifest.items.find(x=>x.slug===slug);
  assert(item&&item.preserve_status===true,'Fresh GSC near-win rewrite must remain managed and preserve status: '+slug);
  assert(item.file&&fs.existsSync(path.join(__dirname,'..',item.file)),'Fresh GSC near-win content file missing: '+slug);
  assert(seoCore.includes("'"+slug+"' => array("),'Fresh GSC near-win must have dedicated SEO metadata: '+slug);
}
const footerPhp=fs.readFileSync(path.join(__dirname,'..','footer.php'),'utf8');
for(const slug of ['solarni-sestava-na-chatu','vyber-baterii','mppt-kalkulacka','vyber-menice','quote-checker']){
  assert(footerPhp.includes("solar_expert_public_url('"+slug+"'"),'Sitewide footer must expose published tool for crawl discovery: '+slug);
}
const freshGscDoc=fs.readFileSync(path.join(__dirname,'..','docs','GSC_BASELINE.md'),'utf8');
assert(freshGscDoc.includes('3,284 impressions'),'Fresh Prometheus GSC snapshot must be recorded');
assert(freshGscDoc.includes('/kolik-panelu-je-potreba-na-jeden-string/'),'Fresh GSC baseline must preserve strongest solar near-win');


const leadCore=fs.readFileSync(path.join(__dirname,'..','inc','core.php'),'utf8');
assert(leadCore.includes("function solar_expert_heat_pump_lead_slugs()"),'Heat-pump lead CTA must be bounded by an explicit allowlist');
assert(leadCore.includes("'eon-heat-pump'"),'Heat-pump lead CTA must use the canonical lead key');
assert(leadCore.includes("https://www.eon.cz/domacnosti/usporne-technologie/tepelne-cerpadlo/"),'Heat-pump CTA must retain a safe public fallback');
assert(leadCore.includes("data-se-placement=\"heat_pump_legacy_article\""),'Heat-pump lead CTA must expose a stable measurement placement');
const leadRuntime=fs.readFileSync(path.join(__dirname,'..','assets','js','lead-cta.js'),'utf8');
assert(leadRuntime.includes("data-se-lead-id"),'Lead runtime must resolve declared lead ids');
const affiliateAdapter=fs.readFileSync(path.join(__dirname,'..','assets','js','affiliate-adapter.js'),'utf8');
assert(affiliateAdapter.includes("trackLead(id, placement, fallback)"),'Affiliate adapter must track lead-gen clicks');
assert(affiliateAdapter.includes("event:'lead_click'"),'Lead-gen clicks must emit a dedicated dataLayer event');
const functionsPhp=fs.readFileSync(path.join(__dirname,'..','functions.php'),'utf8');
assert(functionsPhp.includes("'solar-expert-leads'"),'Lead runtime must be enqueued sitewide');
const quoteCheckerTpl=fs.readFileSync(path.join(__dirname,'..','template-parts','quote-checker.php'),'utf8');
assert(quoteCheckerTpl.includes('data-se-lead-id="eon-solar"'),'Quote Checker result must expose monetized E.ON solar next step');
assert(quoteCheckerTpl.includes('data-se-placement="quote_checker_result"'),'Quote Checker E.ON CTA must expose a dedicated analytics placement');
assert(quoteCheckerTpl.includes('/solarni-sestava-na-chatu/'),'Quote Checker result must retain an owned Builder next step before outbound comparison');


const comboSlug='kolik-stoji-fotovoltaika-s-tepelnym-cerpadlem';
const comboItem=manifest.items.find(x=>x.slug===comboSlug);
assert(comboItem&&comboItem.preserve_status===true,'Combined FVE + heat-pump near-win must remain managed and preserve status');
assert(comboItem.file&&fs.existsSync(path.join(__dirname,'..',comboItem.file)),'Combined FVE + heat-pump rewrite file missing');
assert(seoCore.includes("'"+comboSlug+"' => array("),'Combined FVE + heat-pump near-win must have dedicated SEO metadata');
const comboHtml=fs.readFileSync(path.join(__dirname,'..',comboItem.file),'utf8');
assert(comboHtml.includes('data-se-lead-id="eon-heat-pump"'),'Combined FVE + heat-pump page must expose E.ON lead CTA');
assert(comboHtml.includes('/quote-checker/'),'Combined FVE + heat-pump page must route into Quote Checker');
assert(comboHtml.includes('/solarni-sestava-na-chatu/'),'Combined FVE + heat-pump page must route into Builder');
assert(comboHtml.includes('ověřeno říjen 2026'),'Time-sensitive price benchmark must be explicitly date-stamped');


assert(leadCore.includes("function solar_expert_append_heat_pump_related_links"),'Heat-pump cluster must expose a dedicated related-links renderer');
assert(leadCore.includes('data-se-related="heat-pump-cluster"'),'Heat-pump cluster must expose related-guide marker');
assert(leadCore.includes("/nejlepsi-tepelna-cerpadla-se-zdrojem-vzduchu/"),'Heat-pump cluster must link the comparison hub');
assert(leadCore.includes("/prumerna-spotreba-tepelneho-cerpadla/"),'Heat-pump cluster must link the consumption guide');
assert(leadCore.includes("/kolik-stoji-fotovoltaika-s-tepelnym-cerpadlem/"),'Heat-pump cluster must link the FVE + heat-pump decision page');

assert(leadCore.includes("function solar_expert_solar_lead_slugs()"),'Solar lead CTA must be bounded by an explicit allowlist');
assert(leadCore.includes("'eon-solar'"),'Solar lead CTA must use the canonical E.ON solar lead key');
assert(leadCore.includes("https://www.eon.cz/domacnosti/usporne-technologie/solar/"),'Solar lead CTA must retain a safe public fallback');
assert(leadCore.includes("data-se-placement=\"solar_legacy_article\""),'Solar lead CTA must expose a stable measurement placement');
assert(leadCore.includes("home_url('/quote-checker/')"),'Solar lead CTA must route through Quote Checker before outbound E.ON comparison');
for(const slug of ['fve-panely-na-strechu','fotovoltaika-na-eternitovou-strechu','kotveni-fotovoltaickych-panelu-na-ploche-strese','velikost-rozmery-a-hmotnost-solarnich-panelu','fotovoltaika-vykon-na-m2','kolik-vyrobi-fotovoltaika-za-rok','fotovoltaika-na-pozemku']){
  assert(leadCore.includes("'"+slug+"'"),'Solar lead allowlist must include GSC-backed planning page: '+slug);
}


const boundarySlug='umisteni-tepelneho-cerpadla-od-hranice-pozemku-souseda';
const boundaryItem=manifest.items.find(x=>x.slug===boundarySlug);
assert(boundaryItem&&boundaryItem.preserve_status===true,'Heat-pump boundary near-win must remain managed and preserve status');
assert(boundaryItem.file&&fs.existsSync(path.join(__dirname,'..',boundaryItem.file)),'Heat-pump boundary rewrite file missing');
assert(seoCore.includes("'"+boundarySlug+"' => array("),'Heat-pump boundary near-win must have dedicated SEO metadata');
const boundaryHtml=fs.readFileSync(path.join(__dirname,'..',boundaryItem.file),'utf8');
assert(boundaryHtml.includes('MMR'),'Heat-pump boundary guide must cite current MMR methodology');
assert(boundaryHtml.includes('data-se-lead-id="eon-heat-pump"'),'Heat-pump boundary guide must retain bounded E.ON lead CTA');
assert(boundaryHtml.includes('neexistuje jedno univerzální pravidlo'),'Heat-pump boundary guide must reject a fake universal setback');
assert(!boundaryHtml.includes('musí být minimálně 2 metry'),'Heat-pump boundary guide must not invent a universal two-metre setback');
assert(seoCore.includes("'castecne-zastineni-a-solarni-panely' => array("),'Fresh top-5 shading page should get CTR-focused metadata without content rewrite');
assert(seoCore.includes("'nataceni-solarnich-panelu-za-sluncem' => array("),'Tracker near-win must get CTR-focused metadata without content rewrite');
assert(seoCore.includes("'tepelna-cerpadla-mitsubishi-vyhody-nevyhody-ceny-vlastnosti' => array("),'Mitsubishi Ecodan near-win must get CTR-focused metadata without content rewrite');


const cleaningSlug='cisteni-solarnich-panelu-proc-kdy-jak';
const cleaningItem=manifest.items.find(x=>x.slug===cleaningSlug);
assert(cleaningItem&&cleaningItem.preserve_status===true,'Canonical cleaning guide must preserve existing post status');
assert(cleaningItem.file&&fs.existsSync(path.join(__dirname,'..',cleaningItem.file)),'Canonical cleaning guide file missing');
assert(seoCore.includes("'"+cleaningSlug+"' => array("),'Canonical cleaning guide must have dedicated SEO metadata');
assert(seoCore.includes("'jak-vycistit-solarni-panely-pruvodce-cistenim-solaru' => 'cisteni-solarnich-panelu-proc-kdy-jak'"),'Solar-panel cleaning duplicate redirect must be registered');
assert('jak-vycistit-solarni-panely-pruvodce-cistenim-solaru'!==cleaningSlug,'Cleaning redirect must not loop');


assert(leadCore.includes("home_url('/kolik-stoji-fotovoltaika-s-tepelnym-cerpadlem/')"),'Heat-pump legacy CTA must route through owned combined-system page before outbound lead');
assert(affiliateAdapter.includes("id && id.startsWith('eon-') ? 'eon-cz' : null"),'E.ON lead ids must resolve through the shared eon-cz merchant base');
assert(leadCore.includes("! empty($bases['eon-cz'])"),'WordPress lead diagnostics must recognize one shared E.ON merchant base');


const samsungSlug='recenze-tepelneho-cerpadla-samsung-klady-zapory-a-naklady';
const samsungItem=manifest.items.find(x=>x.slug===samsungSlug);
assert(samsungItem&&samsungItem.preserve_status===true,'Samsung review near-win must remain managed and preserve status');
assert(samsungItem.file&&fs.existsSync(path.join(__dirname,'..',samsungItem.file)),'Samsung review rewrite file missing');
assert(seoCore.includes("'"+samsungSlug+"' => array("),'Samsung review near-win must have dedicated SEO metadata');
const samsungHtml=fs.readFileSync(path.join(__dirname,'..',samsungItem.file),'utf8');
assert(samsungHtml.includes('EHS R290'),'Samsung review must cover current R290 platform');
assert(samsungHtml.includes('data-se-lead-id="eon-heat-pump"'),'Samsung review must retain bounded comparison lead CTA');
assert(!samsungHtml.includes('Renewable Heat Incentive'),'Samsung review must not contain obsolete UK RHI advice');
assert(!samsungHtml.includes('90 000 do 300 000'),'Samsung review must not keep stale undated price range');
assert(samsungHtml.includes('nejde o placenou recenzi Samsungu'),'Samsung review must disclose methodology and independence');


assert(seoCore.includes("function solar_expert_schema_graph()"),'Structured data graph must be registered');
assert(seoCore.includes("'@type' => 'WebApplication'"),'Structured data must describe published decision tools');
assert(seoCore.includes("'@type' => 'Article'"),'Structured data must describe legacy editorial posts');
assert(seoCore.includes("'@type' => 'BreadcrumbList'"),'Structured data must include breadcrumb context');
assert(seoCore.includes("defined('WPSEO_VERSION') || defined('RANK_MATH_VERSION') || defined('AIOSEO_VERSION')"),'Structured data must stand down when a major SEO plugin owns schema');
for(const slug of ['solarni-sestava-na-chatu','vyber-baterii','mppt-kalkulacka','vyber-menice','quote-checker']){
  assert(seoCore.includes("'"+slug+"'"),'Structured data allowlist must include decision tool: '+slug);
}
assert(seoCore.includes("'proc-se-solarni-panely-neprehrivaji' => array("),'Fresh top-10 overheating page should get CTR-focused metadata without body rewrite');


const categoryPhp=fs.readFileSync(path.join(__dirname,'..','category.php'),'utf8');
assert(categoryPhp.includes("is_category('baterie')"),'Battery category must be a dedicated decision hub');
assert(categoryPhp.includes("solar_expert_public_url('vyber-baterii')"),'Battery category hub must route users into Battery Selector');
assert(seoCore.includes("is_category('baterie')"),'Battery category must have dedicated SEO metadata');
assert(seoCore.includes("'@type' => 'CollectionPage'"),'Category archives must expose CollectionPage structured data');
assert(footerPhp.includes("/category/baterie/"),'Battery knowledge hub must receive a sitewide internal link');


const singlePhp=fs.readFileSync(path.join(__dirname,'..','single.php'),'utf8');
assert(singlePhp.includes("Aktualizováno"),'Single posts must expose visible freshness');
assert(singlePhp.includes("get_the_modified_date"),'Single posts must use WordPress modified date');
assert(singlePhp.includes("solar_expert_public_url('solarni-sestava-na-chatu'"),'Single post CTA must route to the dedicated Builder page when published');


const selectorsJs=fs.readFileSync(path.join(__dirname,'..','assets','js','selectors.js'),'utf8');
assert(selectorsJs.includes("event:'selector_engaged'"),'Selectors must emit a one-shot engagement event');
assert(selectorsJs.includes("engagementTracked"),'Selector analytics must suppress repeated engagement events');
assert(selectorsJs.includes("this.run(false)"),'Selector initialization must not count as user engagement');


const builderTemplate=fs.readFileSync(path.join(__dirname,'..','template-parts','solar-builder.php'),'utf8');
assert(builderTemplate.includes('Výhodnější set baterie + měnič'),'Builder template must show verified bundle deal savings');
assert(builderTemplate.includes('trackBundleDeal'),'Builder bundle-deal CTA must emit dedicated analytics');
assert(affiliateAdapter.includes('resolveBundleDeal(deal)'),'Affiliate adapter must resolve bundle deals through merchant base links');
assert(affiliateAdapter.includes("event:'bundle_deal_click'"),'Bundle deal clicks must emit a dedicated dataLayer event');


const builderJs=fs.readFileSync(path.join(__dirname,'..','assets','js','builder.js'),'utf8');
const composerJs=fs.readFileSync(path.join(__dirname,'..','assets','js','bundle-composer.js'),'utf8');
assert(composerJs.includes('batteryBankCandidates(products, sizing, tier)'),'Bundle composer must support verified battery banks');
assert(composerJs.includes('batteryBank.unitPrice + inverterPrice'),'Bundle deal must be evaluated against exactly one battery plus inverter');
assert(composerJs.includes('extraBatteryUnits = Math.max(0, batteryBank.quantity - 1)'),'Multi-battery bundle pricing must account for extra battery units explicitly');
assert(composerJs.includes('batteryBank.unitPrice * bundleDeal.extraBatteryUnits'),'Extra battery modules must be added at verified unit price');
assert(builderJs.includes('Paralelní bateriový bank'),'Builder checklist must surface parallel-bank verification');
assert(builderTemplate.includes("b.batteryQuantity||1"),'Builder must render battery quantity');
assert(builderTemplate.includes('kWh celkem'),'Builder must render total battery-bank energy');


const builderLogic=fs.readFileSync(path.join(__dirname,'..','assets','js','builder.js'),'utf8');
assert(builderLogic.includes('get incompleteBundles()'),'Builder must keep incomplete tiers available for transparency messaging');
assert(builderTemplate.includes('x-for="b in completeBundles"'),'Builder must render only technically complete bundle tiers');
assert(builderTemplate.includes('Neúplné cenové úrovně nezobrazujeme'),'Builder must explain why incomplete tiers are hidden');
assert(!builderTemplate.includes('zatím neúplná varianta'),'Builder must not present incomplete tier cards as user-facing recommendations');
assert(builderTemplate.includes('Raději nezobrazíme neověřenou kombinaci'),'Zero-result state must prefer no recommendation over weak technical evidence');


assert(contentSyncCore.includes("function solar_expert_content_sync_state()"),'Managed content sync must expose deterministic drift state');
assert(contentSyncCore.includes("managed-content-sync-v2-yoast-meta"),'Managed content fingerprint must change when Yoast sync semantics change');
assert(contentSyncCore.includes("solar_expert_seo_meta($slug)"),'Managed content sync must resolve the shared SEO map by slug');
assert(contentSyncCore.includes("update_post_meta($id, '_yoast_wpseo_title'"),'Managed content sync must persist SEO titles into Yoast meta');
assert(contentSyncCore.includes("update_post_meta($id, '_yoast_wpseo_metadesc'"),'Managed content sync must persist SEO descriptions into Yoast meta');
assert(contentSyncCore.includes("add_action('init', 'solar_expert_schedule_content_sync'"),'Git deploys must schedule a bounded managed-content sync');
assert(contentSyncCore.includes("wp_next_scheduled('solar_expert_async_content_sync')"),'Async content sync must not be scheduled repeatedly');
assert(contentSyncCore.includes("wp_schedule_single_event(time() + 10, 'solar_expert_async_content_sync')"),'Async content sync must use a prompt one-shot delayed event');
assert(contentSyncCore.includes("get_transient('solar_expert_content_sync_lock')"),'Async content sync must use a concurrency lock');
assert(contentSyncCore.includes("delete_transient('solar_expert_content_sync_lock')"),'Async content sync lock must be released');
assert(contentSyncCore.includes("'content_sync_status'"),'Public health payload must expose content sync status');
assert(contentSyncCore.includes("'content_sync_required'"),'Public health payload must expose whether managed content is stale');
assert(contentSyncCore.includes("'content_sync_errors'"),'Public health payload must expose managed-content sync errors');
assert(settingsCore.includes('Managed content: CURRENT'),'Admin diagnostics must show a current managed-content state');
assert(settingsCore.includes('Automatický sync je naplánovaný'),'Admin diagnostics must explain pending automatic sync');


const annualSlug='kolik-vyrobi-fotovoltaika-za-rok';
const annualItem=manifest.items.find(x=>x.slug===annualSlug);
assert(annualItem&&annualItem.preserve_status===true,'Annual FVE output near-win must remain managed and preserve status');
assert(annualItem.file&&fs.existsSync(path.join(__dirname,'..',annualItem.file)),'Annual FVE output rewrite file missing');
assert(seoCore.includes("'"+annualSlug+"' => array("),'Annual FVE output near-win must have dedicated SEO metadata');
const annualHtml=fs.readFileSync(path.join(__dirname,'..',annualItem.file),'utf8');
assert(annualHtml.includes('PVGIS'),'Annual FVE output guide must use locality-aware PVGIS methodology');
assert(annualHtml.includes('specifický výnos'),'Annual FVE output guide must explain specific yield');
assert(!annualHtml.includes('1 200 – 1 500'),'Annual FVE output guide must not keep the stale universal Czech production range');
assert(annualHtml.includes('/solarni-sestava-na-chatu/'),'Annual FVE output guide must route users into Builder');
assert(seoCore.includes("'kompletni-pruvodce-velikosti-solarnich-panelu' => 'velikost-rozmery-a-hmotnost-solarnich-panelu'"),'Duplicate size guide must 301 to the stronger managed dimensions guide');


const hpVsBoilerSlug='tepelne-cerpadlo-nebo-elektrokotel';
const hpVsBoilerItem=manifest.items.find(x=>x.slug===hpVsBoilerSlug);
assert(hpVsBoilerItem&&hpVsBoilerItem.preserve_status===true,'Heat-pump vs electric-boiler near-win must remain managed');
assert(hpVsBoilerItem.file&&fs.existsSync(path.join(__dirname,'..',hpVsBoilerItem.file)),'Heat-pump vs electric-boiler rewrite file missing');
assert(seoCore.includes("'"+hpVsBoilerSlug+"' => array("),'Heat-pump vs electric-boiler guide must have dedicated SEO metadata');
const hpVsBoilerHtml=fs.readFileSync(path.join(__dirname,'..',hpVsBoilerItem.file),'utf8');
assert(hpVsBoilerHtml.includes('12 000 kWh'),'Heating comparison should include a transparent worked energy example');
assert(hpVsBoilerHtml.includes('data-se-lead-id="eon-heat-pump"'),'Heating comparison must expose bounded E.ON comparison lead CTA');
assert(hpVsBoilerHtml.includes('/kolik-stoji-fotovoltaika-s-tepelnym-cerpadlem/'),'Heating comparison must link into the combined FVE + heat-pump decision page');
assert(!hpVsBoilerHtml.includes('třikrát levnější v provozních nákladech'),'Heating comparison must not keep the old universal 3x-cheaper claim');
assert(!hpVsBoilerHtml.includes('v zimě záložní zdroj tepla'),'Heating comparison must not claim every heat pump always requires backup heating');


const bestHpSlug='nejlepsi-tepelna-cerpadla-se-zdrojem-vzduchu';
const bestHpItem=manifest.items.find(x=>x.slug===bestHpSlug);
assert(bestHpItem&&bestHpItem.preserve_status===true,'Best heat-pumps guide must remain managed');
assert(bestHpItem.file&&fs.existsSync(path.join(__dirname,'..',bestHpItem.file)),'Best heat-pumps guide file missing');
assert(seoCore.includes("'"+bestHpSlug+"' => array("),'Best heat-pumps guide must have dedicated SEO metadata');
const bestHpHtml=fs.readFileSync(path.join(__dirname,'..',bestHpItem.file),'utf8');
for(const family of ['Altherma 4 H','aroTHERM plus 2026','S2125','Vitocal 250-A','THERMA V R290']){
  assert(bestHpHtml.includes(family),'Best heat-pumps guide must include current verified family: '+family);
}
assert(bestHpHtml.includes('nejspolehlivější tepelné čerpadlo'),'Best heat-pumps guide must address reliability intent explicitly');
assert(bestHpHtml.includes('data-se-lead-id="eon-heat-pump"'),'Best heat-pumps guide must retain bounded comparison lead CTA');
assert(bestHpHtml.includes('/kolik-stoji-fotovoltaika-s-tepelnym-cerpadlem/'),'Best heat-pumps guide must route into combined FVE decision page');
assert(!bestHpHtml.includes('výběr 10 nejlepších'),'Best heat-pumps guide must not revert to the stale unmethodical Top-10 framing');
assert(!bestHpHtml.includes('ve Velké Británii'),'Best heat-pumps guide must not retain UK-market framing');


const lgSlug='tepelne-cerpadla-lg-vyhody-nevyhody-ceny';
const lgItem=manifest.items.find(x=>x.slug===lgSlug);
assert(lgItem&&lgItem.preserve_status===true,'LG review near-win must remain managed');
assert(lgItem.file&&fs.existsSync(path.join(__dirname,'..',lgItem.file)),'LG review rewrite file missing');
assert(seoCore.includes("'"+lgSlug+"' => array("),'LG review near-win must have dedicated SEO metadata');
const lgHtml=fs.readFileSync(path.join(__dirname,'..',lgItem.file),'utf8');
assert(lgHtml.includes('THERMA V R290'),'LG review must cover current R290 platform');
assert(lgHtml.includes('75 °C'),'LG review must cover current high-temperature capability with caveats');
assert(lgHtml.includes('data-se-lead-id="eon-heat-pump"'),'LG review must retain bounded comparison lead CTA');
assert(!lgHtml.includes('120000 až 400000'),'LG review must not keep stale undated installation-price range');
assert(!lgHtml.includes('patří k nejlepším na trhu'),'LG review must avoid unsupported best-on-market claims');
assert(lgHtml.includes('nejde o placenou recenzi LG'),'LG review must disclose methodology and independence');


const viessmannSlug='recenze-tepelneho-cerpadla-viessman-klady-zapory-a-naklady';
const viessmannItem=manifest.items.find(x=>x.slug===viessmannSlug);
assert(viessmannItem&&viessmannItem.preserve_status===true,'Viessmann review near-win must remain managed');
assert(viessmannItem.file&&fs.existsSync(path.join(__dirname,'..',viessmannItem.file)),'Viessmann review rewrite file missing');
assert(seoCore.includes("'"+viessmannSlug+"' => array("),'Viessmann review near-win must have dedicated SEO metadata');
const viessmannHtml=fs.readFileSync(path.join(__dirname,'..',viessmannItem.file),'utf8');
assert(viessmannHtml.includes('Vitocal 250-A'),'Viessmann review must focus on the current Vitocal 250-A platform');
assert(viessmannHtml.includes('R290'),'Viessmann review must cover current R290 platform');
assert(viessmannHtml.includes('data-se-lead-id="eon-heat-pump"'),'Viessmann review must retain bounded comparison lead CTA');
assert(!viessmannHtml.includes('Renewable Heat Incentive'),'Viessmann review must not keep obsolete UK RHI guidance');
assert(!viessmannHtml.includes('120 000 korun do více než 350 000'),'Viessmann review must not keep stale undated price range');
assert(viessmannHtml.includes('nejde o placenou recenzi Viessmannu'),'Viessmann review must disclose methodology and independence');


const legacyCleanupCore=fs.readFileSync(path.join(__dirname,'..','inc','core.php'),'utf8');
assert(legacyCleanupCore.includes('solar_expert_quarantine_legacy_frontend_plugins'),'Legacy frontend quarantine must be scoped and explicit');
assert(legacyCleanupCore.includes("function_exists('snp_footer')"),'Ninja Popups footer output must be quarantined');
assert(legacyCleanupCore.includes("MTSNB_Shared"),'MyThemeShop notification bar object callbacks must be targeted by class');
assert(legacyCleanupCore.includes("display_bar"),'Legacy notification-bar display callback must be removed');
assert(legacyCleanupCore.includes("display_hidden_bars"),'Legacy delayed notification-bar callback must be removed');
assert(legacyCleanupCore.includes("wpsabox_author_box"),'Simple Author Box content injection must be removed');
assert(legacyCleanupCore.includes("Simple_Author_Box"),'Simple Author Box styles/scripts must be removed by class signature');
assert(legacyCleanupCore.includes("SeoAutomatedLinkBuilding\\\\Plugin"),'SEO Automated Link Building content mutation must be targeted by exact class');
assert(legacyCleanupCore.includes("changeContent"),'SEO Automated Link Building the_content callback must be removed');
for(const legacyPath of [
  '/plugins/mts-wp-notification-bar/',
  '/plugins/arscode-ninja-popups/',
  '/plugins/simple-author-box/',
  '/plugins/seo-automated-link-building/'
]){
  assert(legacyCleanupCore.includes(legacyPath),'Legacy frontend asset path must be quarantined: '+legacyPath);
}
assert(legacyCleanupCore.includes('if ( is_admin() )'),'Legacy quarantine must leave WordPress admin behavior untouched');
assert(!legacyCleanupCore.includes("remove_all_actions('wp_footer'"),'Legacy cleanup must never remove all wp_footer callbacks');
assert(!legacyCleanupCore.includes("remove_all_filters('the_content'"),'Legacy cleanup must never remove all the_content filters');


const groundPvSlug='fotovoltaika-na-pozemku';
const groundPvItem=manifest.items.find(x=>x.slug===groundPvSlug);
assert(groundPvItem&&groundPvItem.create_if_missing===true,'Ground-mounted PV guide must be managed and creatable');
assert(groundPvItem.type==='post'&&groundPvItem.status_if_new==='publish','Ground-mounted PV guide must publish explicitly as a managed post');
assert(groundPvItem.file&&fs.existsSync(path.join(__dirname,'..',groundPvItem.file)),'Ground-mounted PV guide file missing');
assert(seoCore.includes("'"+groundPvSlug+"' => array("),'Ground-mounted PV guide must have dedicated SEO metadata');
const groundPvHtml=fs.readFileSync(path.join(__dirname,'..',groundPvItem.file),'utf8');
assert(groundPvHtml.includes('12. 1. 2026'),'Ground-mounted PV guide must cite current MMR methodology date');
assert(groundPvHtml.includes('249/2025'),'Ground-mounted PV guide must cite the current renewable-permitting law');
assert(groundPvHtml.includes('/mppt-kalkulacka/'),'Ground-mounted PV guide must route into MPPT tool');
assert(groundPvHtml.includes('/solarni-sestava-na-chatu/'),'Ground-mounted PV guide must route into Builder');
assert(!groundPvHtml.includes('do 100 kW bez povolení'),'Ground-mounted PV guide must not claim a universal no-permit rule');
assert(groundPvHtml.includes('Limit 100 kW je důležitý, ale sám o sobě nestačí'),'Ground-mounted PV guide must explicitly reject simplistic 100kW permitting advice');


const wiringHtml=fs.readFileSync(path.join(__dirname,'..','content','rewrites','jak-zapojit-solarni-panely.html'),'utf8');
assert(wiringHtml.includes('Schéma zapojení solárních panelů pro 12V systém'),'12V wiring query intent must remain explicit');
assert(wiringHtml.includes('Varianta 2S'),'12V wiring guide must show a series example');
assert(wiringHtml.includes('Varianta 2P'),'12V wiring guide must show a parallel example');
assert(wiringHtml.includes('panely se běžně nepřipojují „jen tak“ přímo na 12V baterii'),'12V wiring guide must reject direct-panel-to-battery interpretation');
assert(wiringHtml.includes('/mppt-kalkulacka/'),'12V wiring guide must route into MPPT calculator');
const wiringStyle=fs.readFileSync(path.join(__dirname,'..','style.css'),'utf8');
assert(wiringStyle.includes('.se-code'),'Technical wiring diagrams must have readable responsive styling');


const selectorJs=fs.readFileSync(path.join(__dirname,'..','assets','js','selectors.js'),'utf8');
const batterySelectorTemplate=fs.readFileSync(path.join(__dirname,'..','template-parts','battery-selector.php'),'utf8');
assert(selectorJs.includes('batteryBankCandidatesAll'),'Battery Selector must use shared verified bank logic');
assert(batterySelectorTemplate.includes("(r.quantity||1)+'× '"),'Battery Selector must render bank quantity');
assert(batterySelectorTemplate.includes('r.totalEnergyWh'),'Battery Selector must render total bank energy');
assert(batterySelectorTemplate.includes('r.totalDischargeA'),'Battery Selector must render total discharge current');
assert(batterySelectorTemplate.includes('r.totalPrice'),'Battery Selector must render total bank price');
assert(batterySelectorTemplate.includes('Ověřený paralelní bank'),'Battery Selector must explain parallel-bank installation checks');


assert(builderTemplate.includes('Set obsahuje 1× baterii + měnič'),'Builder must explain multi-bank set composition');
assert(affiliateAdapter.includes('extraBatteryUnits'),'Bundle analytics must include extra battery units');
assert(affiliateAdapter.includes('bankSavingsCzk'),'Bundle analytics must include whole-bank savings');


for(const product of source.products||[]){
  if(['budget','best','premium'].includes(product.tier)){
    assert(product.availability!=='on_request','Active recommended catalog products must not use on_request availability: '+product.id);
  }
}


assert(seoCore.includes("function solar_expert_catalog_price_freshness("),'Server diagnostics must aggregate catalog price freshness');
assert(seoCore.includes("'catalog_price_stale'"),'Health payload must expose stale catalog price count');
assert(seoCore.includes("'catalog_price_verification_unknown'"),'Health payload must expose unknown-verification price count');
assert(settingsCore.includes('<h2>Price freshness</h2>'),'Solar Expert admin must show catalog price freshness');
assert(settingsCore.includes('Známě starší snapshot než 30 dní'),'Admin diagnostics must explain stale-price behavior');
assert(affiliateAdapter.includes("price_freshness: freshness"),'Affiliate offers must expose price freshness state');
assert(affiliateAdapter.includes("freshness === 'stale' ? null"),'Affiliate offer UI must suppress known stale prices');
assert(composerJs.includes("verificationState(deal.verified_at) === 'stale'"),'Bundle composer must ignore known stale set prices');

const heatPumpConsumptionSlug='prumerna-spotreba-tepelneho-cerpadla';
const heatPumpConsumptionItem=manifest.items.find(x=>x.slug===heatPumpConsumptionSlug);
assert(heatPumpConsumptionItem&&heatPumpConsumptionItem.preserve_status===true,'Heat-pump consumption canonical must be managed without changing publication status');
assert(heatPumpConsumptionItem.file&&fs.existsSync(path.join(__dirname,'..',heatPumpConsumptionItem.file)),'Heat-pump consumption rewrite file missing');
assert(seoCore.includes("'prumerna-spotreba-tepelneho-cerpadla' => array("),'Heat-pump consumption canonical must have dedicated SEO metadata');
assert(seoCore.includes("'spotreba-tepelneho-cerpadla-v-kwh' => 'prumerna-spotreba-tepelneho-cerpadla'"),'Duplicate heat-pump consumption URL must 301 to the canonical guide');
const daikinSlug='prehled-vzduchovych-tepelnych-cerpadel-daikin';
const daikinItem=manifest.items.find(x=>x.slug===daikinSlug);
assert(daikinItem&&daikinItem.preserve_status===true,'Daikin buyer guide must be managed without changing publication status');
assert(daikinItem.file&&fs.existsSync(path.join(__dirname,'..',daikinItem.file)),'Daikin buyer guide rewrite file missing');
assert(seoCore.includes("'prehled-vzduchovych-tepelnych-cerpadel-daikin' => array("),'Daikin buyer guide must have dedicated SEO metadata');

const airWaterSlug='tepelne-cerpadlo-vzduch-voda-jak-funguje-a-kolik-stoji';
const airWaterItem=manifest.items.find(x=>x.slug===airWaterSlug);
assert(airWaterItem&&airWaterItem.preserve_status===true,'Air-water canonical guide must be managed and preserve status');
assert(airWaterItem.file&&fs.existsSync(path.join(__dirname,'..',airWaterItem.file)),'Air-water rewrite file missing');
assert(seoCore.includes("'tepelna-cerpadla-vzduch-vzduch-vs-vzduch-voda' => 'tepelne-cerpadlo-vzduch-voda-jak-funguje-a-kolik-stoji'"),'Overlapping air-air vs air-water URL must redirect to the canonical air-water guide');

const copSlug='cop-tepelneho-cerpadla-se-zdrojem-vzduchu-vysvetleni-zdroj-tepelneho-cerpadla';
const copItem=manifest.items.find(x=>x.slug===copSlug);
assert(copItem&&copItem.preserve_status===true,'COP/SCOP canonical guide must be managed and preserve status');
assert(copItem.file&&fs.existsSync(path.join(__dirname,'..',copItem.file)),'COP/SCOP rewrite file missing');
assert(seoCore.includes("'ucinnost-tepelneho-cerpadla-se-zdrojem-vzduchu' => 'cop-tepelneho-cerpadla-se-zdrojem-vzduchu-vysvetleni-zdroj-tepelneho-cerpadla'"),'Overlapping efficiency URL must redirect to the canonical COP/SCOP guide');
assert(seoCore.includes("'"+airWaterSlug+"' => array("),'Air-water guide must have dedicated SEO metadata');
assert(seoCore.includes("'"+copSlug+"' => array("),'COP/SCOP guide must have dedicated SEO metadata');
const heatPumpPrincipleSlug='jak-funguje-tepelne-cerpadlo';
const heatPumpPrincipleItem=manifest.items.find(x=>x.slug===heatPumpPrincipleSlug);
assert(heatPumpPrincipleItem&&heatPumpPrincipleItem.preserve_status===true,'Heat-pump principle guide must remain managed and preserve status');
assert(heatPumpPrincipleItem.file&&fs.existsSync(path.join(__dirname,'..',heatPumpPrincipleItem.file)),'Heat-pump principle rewrite file missing');
assert(seoCore.includes("'"+heatPumpPrincipleSlug+"' => array("),'Heat-pump principle guide must have dedicated SEO metadata');

const lifespanSlug='jak-dlouho-vydrzi-tepelna-cerpadla';
const lifespanItem=manifest.items.find(x=>x.slug===lifespanSlug);
assert(lifespanItem&&lifespanItem.preserve_status===true,'Heat-pump lifespan guide must remain managed and preserve status');
assert(lifespanItem.file&&fs.existsSync(path.join(__dirname,'..',lifespanItem.file)),'Heat-pump lifespan rewrite file missing');
assert(seoCore.includes("'"+lifespanSlug+"' => array("),'Heat-pump lifespan guide must have dedicated SEO metadata');
assert(leadCore.includes("'jak-dlouho-vydrzi-tepelna-cerpadla'"),'Heat-pump lifespan guide must participate in the bounded E.ON/related-links funnel');

const solarPrincipleSlug='solarni-panel-definice-a-fakta';
const solarPrincipleItem=manifest.items.find(x=>x.slug===solarPrincipleSlug);
assert(solarPrincipleItem&&solarPrincipleItem.preserve_status===true,'Solar principle guide must remain managed and preserve status');
assert(solarPrincipleItem.file&&fs.existsSync(path.join(__dirname,'..',solarPrincipleItem.file)),'Solar principle rewrite file missing');
assert(seoCore.includes("'"+solarPrincipleSlug+"' => array("),'Solar principle guide must have dedicated SEO metadata');
const solarPrincipleHtml=fs.readFileSync(path.join(__dirname,'..',solarPrincipleItem.file),'utf8');
assert(!solarPrincipleHtml.includes('Britannica'),'Solar principle guide must not retain copied Britannica-style legacy content');

const pvtSlug='vysvetleni-solarnich-panelu-pv-t';
const pvtItem=manifest.items.find(x=>x.slug===pvtSlug);
assert(pvtItem&&pvtItem.preserve_status===true,'PVT guide must remain managed and preserve status');
assert(pvtItem.file&&fs.existsSync(path.join(__dirname,'..',pvtItem.file)),'PVT rewrite file missing');
assert(seoCore.includes("'"+pvtSlug+"' => array("),'PVT guide must have dedicated SEO metadata');
const pvtHtml=fs.readFileSync(path.join(__dirname,'..',pvtItem.file),'utf8');
assert(!pvtHtml.includes('Renewable Heat Incentive'),'PVT guide must not contain obsolete UK incentive guidance');
assert(!pvtHtml.includes('85 %'),'PVT guide must not keep unsupported legacy combined-efficiency marketing claims');

const winterPvSlug='vykon-solarnich-panelu-v-zime-ma-smysl-odmetat-snih';
const winterPvItem=manifest.items.find(x=>x.slug===winterPvSlug);
assert(winterPvItem&&winterPvItem.preserve_status===true,'Winter PV canonical guide must remain managed and preserve status');
assert(winterPvItem.file&&fs.existsSync(path.join(__dirname,'..',winterPvItem.file)),'Winter PV rewrite file missing');
assert(seoCore.includes("'"+winterPvSlug+"' => array("),'Winter PV guide must have dedicated SEO metadata');
assert(seoCore.includes("'co-dela-fotovoltaika-kdyz-je-zima' => 'vykon-solarnich-panelu-v-zime-ma-smysl-odmetat-snih'"),'Duplicate winter PV URL must redirect to the canonical winter guide');
const winterPvHtml=fs.readFileSync(path.join(__dirname,'..',winterPvItem.file),'utf8');
assert(!winterPvHtml.includes('vlažnou vodou'),'Winter PV guide must not recommend legacy risky de-icing advice');
assert(!winterPvHtml.includes('zahradního fukaru'),'Winter PV guide must not keep legacy ad-hoc snow-removal advice');

const realPvSlug='realny-vykon-solarnich-panelu';
const realPvItem=manifest.items.find(x=>x.slug===realPvSlug);
assert(realPvItem&&realPvItem.preserve_status===true,'Real-world PV performance guide must remain managed and preserve status');
assert(realPvItem.file&&fs.existsSync(path.join(__dirname,'..',realPvItem.file)),'Real-world PV performance rewrite file missing');
assert(seoCore.includes("'"+realPvSlug+"' => array("),'Real-world PV performance guide must have dedicated SEO metadata');
const realPvHtml=fs.readFileSync(path.join(__dirname,'..',realPvItem.file),'utf8');
assert(realPvHtml.includes('STC'),'Real-world PV performance guide must explain STC');
assert(realPvHtml.includes('/quote-checker/'),'Real-world PV performance guide must route into Quote Checker');

const panelBuyerSlug='jak-vybrat-solarni-panely-pro-vas-domov';
const panelBuyerItem=manifest.items.find(x=>x.slug===panelBuyerSlug);
assert(panelBuyerItem&&panelBuyerItem.preserve_status===true,'Panel buyer guide must remain managed');
assert(seoCore.includes("'"+panelBuyerSlug+"' => array("),'Panel buyer guide must have dedicated SEO metadata');
assert(leadCore.includes("'jak-vybrat-solarni-panely-pro-vas-domov'"),'Panel buyer guide must participate in the bounded E.ON solar funnel');
assert(seoCore.includes("'recenze-solarnich-panelu-nezavisle-informace-o-solarni-energii' => 'jak-vybrat-solarni-panely-pro-vas-domov'"),'Copied legacy panel-review URL must redirect to the owned buyer guide');
const panelBuyerHtml=fs.readFileSync(path.join(__dirname,'..',panelBuyerItem.file),'utf8');
assert(panelBuyerHtml.includes('Kiwa PVEL'),'Panel buyer guide must retain independent reliability criteria');
assert(panelBuyerHtml.includes('IEC 61215'),'Panel buyer guide must retain module qualification guidance');
assert(panelBuyerHtml.includes('IEC 61730'),'Panel buyer guide must retain safety qualification guidance');

const hpTempSlug='minimalni-a-maximalni-teploty-tepelneho-cerpadla';
const hpTempItem=manifest.items.find(x=>x.slug===hpTempSlug);
assert(hpTempItem&&hpTempItem.preserve_status===true,'Heat-pump temperature-limit guide must remain managed and preserve status');
assert(hpTempItem.file&&fs.existsSync(path.join(__dirname,'..',hpTempItem.file)),'Heat-pump temperature-limit rewrite file missing');
assert(seoCore.includes("'"+hpTempSlug+"' => array("),'Heat-pump temperature-limit guide must have dedicated SEO metadata');
assert(leadCore.includes("'minimalni-a-maximalni-teploty-tepelneho-cerpadla'"),'Heat-pump temperature-limit guide must participate in E.ON heat-pump funnel');

const metalRoofSlug='kovove-stresni-krytiny-nejlepsi-volba-pro-solarni-panely';
const metalRoofItem=manifest.items.find(x=>x.slug===metalRoofSlug);
assert(metalRoofItem&&metalRoofItem.preserve_status===true,'Metal-roof PV guide must remain managed and preserve status');
assert(metalRoofItem.file&&fs.existsSync(path.join(__dirname,'..',metalRoofItem.file)),'Metal-roof PV rewrite file missing');
assert(seoCore.includes("'"+metalRoofSlug+"' => array("),'Metal-roof PV guide must have dedicated SEO metadata');
assert(leadCore.includes("'kovove-stresni-krytiny-nejlepsi-volba-pro-solarni-panely'"),'Metal-roof PV guide must participate in E.ON solar funnel');

const monoPolySlug='monokrystalicke-vs-polykrystalicke-solarni-panely';
const monoPolyItem=manifest.items.find(x=>x.slug===monoPolySlug);
assert(monoPolyItem&&monoPolyItem.preserve_status===true,'Mono-vs-poly guide must remain managed and preserve status');
assert(monoPolyItem.file&&fs.existsSync(path.join(__dirname,'..',monoPolyItem.file)),'Mono-vs-poly rewrite file missing');
assert(seoCore.includes("'"+monoPolySlug+"' => array("),'Mono-vs-poly guide must have dedicated SEO metadata');
const monoPolyHtml=fs.readFileSync(path.join(__dirname,'..',monoPolyItem.file),'utf8');
assert(monoPolyHtml.includes('TOPCon'),'Mono-vs-poly guide must reflect current cell-technology context');
assert(monoPolyHtml.includes('/jak-vybrat-solarni-panely-pro-vas-domov/'),'Mono-vs-poly guide must route into the owned panel buyer guide');
assert(seoCore.includes("'jak-funguji-solarni-panely-na-plochych-strechach' => 'kotveni-fotovoltaickych-panelu-na-ploche-strese'"),'Residual flat-roof guide must redirect to canonical mounting guide');

const builderUxJs=fs.readFileSync(path.join(__dirname,'..','assets','js','builder.js'),'utf8');
const builderUxTpl=fs.readFileSync(path.join(__dirname,'..','template-parts','solar-builder.php'),'utf8');
assert(builderUxJs.includes('catalogLoading:true'),'Builder must expose an explicit catalog loading state');
assert(builderUxJs.includes('catalogError:false'),'Builder must expose an explicit catalog error state');
assert(builderUxJs.includes("if(!r.ok)throw new Error('catalog_http_'"),'Builder must reject failed catalog HTTP responses');
assert(builderUxJs.includes('if(this.result)this.bundles=window.SolarExpertBundleComposer.compose'),'Late catalog load must refresh an already calculated Builder result');
assert(builderUxTpl.includes('x-show="catalogLoading"'),'Builder template must display catalog loading feedback');
assert(builderUxTpl.includes('x-show="catalogError"'),'Builder template must display catalog error feedback');
assert(seoCore.includes("add_filter('wpseo_metadesc', 'solar_expert_wpseo_metadesc', 20)"),'Solar Expert metadata must pass through Yoast');
assert(seoCore.includes("add_filter('wpseo_title', 'solar_expert_wpseo_title', 20)"),'Solar Expert titles must pass through Yoast');
assert(seoCore.includes("function solar_expert_seo_meta($slug_override = '')"),'SEO map must support deterministic slug lookup for managed sync');
const seoMapStart=seoCore.indexOf("function solar_expert_seo_meta(");
const seoMapEnd=seoCore.indexOf("function solar_expert_document_title",seoMapStart);
const managedSeoBlock=seoCore.slice(seoMapStart,seoMapEnd);
for(const item of manifest.items){
  assert(managedSeoBlock.includes("'"+item.slug+"' => array("),'Managed content SEO map missing slug: '+item.slug);
}

const batterySelectorJs=fs.readFileSync(path.join(__dirname,'..','assets','js','selectors.js'),'utf8');
const batterySelectorTpl=fs.readFileSync(path.join(__dirname,'..','template-parts','battery-selector.php'),'utf8');
assert(batterySelectorJs.includes('catalogLoading:true,catalogError:false'),'Battery Selector must expose explicit catalog loading state');
assert(batterySelectorJs.includes('get requiredBatteryKwh()'),'Battery Selector must expose calculated required capacity');
assert(batterySelectorJs.includes('get requiredDischargeA()'),'Battery Selector must expose calculated discharge-current requirement');
assert(batterySelectorJs.includes("if(!r.ok)throw new Error('catalog_http_'"),'Selector catalog loader must reject failed HTTP responses');
for(const id of ['se-battery-voltage','se-battery-daily-kwh','se-battery-autonomy','se-battery-inverter-w']){
  assert(batterySelectorTpl.includes('for="'+id+'"'),'Battery Selector label must target '+id);
  assert(batterySelectorTpl.includes('id="'+id+'"'),'Battery Selector control id missing: '+id);
}
assert(batterySelectorTpl.includes('x-show="catalogLoading"'),'Battery Selector must show catalog loading feedback');
assert(batterySelectorTpl.includes('x-show="catalogError"'),'Battery Selector must show catalog error feedback');
assert(batterySelectorTpl.includes("!catalogLoading && !catalogError && !matches.length"),'Battery Selector must distinguish no-match from loading/error state');

const mpptSelectorJs=fs.readFileSync(path.join(__dirname,'..','assets','js','selectors.js'),'utf8');
const mpptSelectorTpl=fs.readFileSync(path.join(__dirname,'..','template-parts','mppt-selector.php'),'utf8');
assert(mpptSelectorJs.includes('catalogLoading:true,catalogError:false'),'MPPT Selector must expose explicit catalog loading state');
assert(mpptSelectorJs.includes('get requiredChargeA()'),'MPPT Selector must expose required charge current');
assert(mpptSelectorJs.includes('get inputValid()'),'MPPT Selector must validate Voc/Vmp and positive inputs');
for(const id of ['se-mppt-voltage','se-mppt-panel-wp','se-mppt-panel-voc','se-mppt-panel-vmp','se-mppt-series-count']){
  assert(mpptSelectorTpl.includes('for="'+id+'"'),'MPPT Selector label must target '+id);
  assert(mpptSelectorTpl.includes('id="'+id+'"'),'MPPT Selector control id missing: '+id);
}
assert(mpptSelectorTpl.includes('x-show="!inputValid"'),'MPPT Selector must show invalid-input feedback');
assert(mpptSelectorTpl.includes('x-show="catalogLoading"'),'MPPT Selector must show catalog loading feedback');
assert(mpptSelectorTpl.includes('x-show="catalogError"'),'MPPT Selector must show catalog error feedback');
assert(mpptSelectorTpl.includes("!catalogLoading && !catalogError && inputValid && !matches.length"),'MPPT Selector must distinguish catalog gap from loading/error/invalid input');

const inverterSelectorJs=fs.readFileSync(path.join(__dirname,'..','assets','js','selectors.js'),'utf8');
const inverterSelectorTpl=fs.readFileSync(path.join(__dirname,'..','template-parts','inverter-selector.php'),'utf8');
assert(inverterSelectorJs.includes('catalogLoading:true,catalogError:false'),'Inverter Selector must expose explicit catalog loading state');
assert(inverterSelectorJs.includes('get inputValid()'),'Inverter Selector must validate continuous and surge inputs');
assert(inverterSelectorJs.includes('get requiredDcA()'),'Inverter Selector must expose continuous DC current requirement');
assert(inverterSelectorJs.includes('get peakDcA()'),'Inverter Selector must expose peak DC current requirement');
for(const id of ['se-inverter-voltage','se-inverter-continuous','se-inverter-peak']){
  assert(inverterSelectorTpl.includes('for="'+id+'"'),'Inverter Selector label must target '+id);
  assert(inverterSelectorTpl.includes('id="'+id+'"'),'Inverter Selector control id missing: '+id);
}
assert(inverterSelectorTpl.includes('x-show="!inputValid"'),'Inverter Selector must show invalid-input feedback');
assert(inverterSelectorTpl.includes('x-show="catalogLoading"'),'Inverter Selector must show catalog loading feedback');
assert(inverterSelectorTpl.includes('x-show="catalogError"'),'Inverter Selector must show catalog error feedback');
assert(inverterSelectorTpl.includes("!catalogLoading && !catalogError && inputValid && !matches.length"),'Inverter Selector must distinguish no-match from loading/error/invalid input');

const quoteCheckerJsUx=fs.readFileSync(path.join(__dirname,'..','assets','js','quote-checker.js'),'utf8');
const quoteCheckerTplUx=fs.readFileSync(path.join(__dirname,'..','template-parts','quote-checker.php'),'utf8');
assert(quoteCheckerJsUx.includes('batteryBmsA:null'),'Quote Checker must expose optional BMS-current input');
assert(quoteCheckerJsUx.includes('get inputValid()'),'Quote Checker must validate core numeric inputs');
assert(quoteCheckerJsUx.includes("push('bms','Baterie / BMS proud','fail'"),'Quote Checker must flag clearly insufficient BMS current');
assert(quoteCheckerJsUx.includes("push('bms','Baterie / BMS proud','warn'"),'Quote Checker must warn on marginal BMS current');
assert(quoteCheckerTplUx.includes('id="se-quote-battery-bms-a"'),'Quote Checker BMS input id missing');
assert(quoteCheckerTplUx.includes('for="se-quote-battery-bms-a"'),'Quote Checker BMS label association missing');
assert(quoteCheckerTplUx.includes('x-show="inputError"'),'Quote Checker must expose invalid-input feedback');
for(const id of ['se-quote-daily-kwh','se-quote-season','se-quote-autonomy','se-quote-load-w','se-quote-surge-w','se-quote-panel-wp','se-quote-battery-kwh','se-quote-inverter-w','se-quote-inverter-peak-w','se-quote-system-voltage','se-quote-price']){
  assert(quoteCheckerTplUx.includes('for="'+id+'"'),'Quote Checker label must target '+id);
  assert(quoteCheckerTplUx.includes('id="'+id+'"'),'Quote Checker control id missing: '+id);
}

assert(seoCore.includes("add_filter('robots_txt', 'solar_expert_robots_txt', 99, 2)"),'robots.txt must be normalized by the theme');
assert(seoCore.includes("Disallow: /wp-admin/"),'robots.txt must protect wp-admin');
assert(seoCore.includes("Allow: /wp-admin/admin-ajax.php"),'robots.txt must allow admin-ajax');
assert(seoCore.includes("Sitemap: "), 'robots.txt must expose a valid sitemap directive');
assert(seoCore.includes("home_url('/sitemap_index.xml')"),'robots.txt must point at the Yoast sitemap index');

const mitsubishiSlug='tepelna-cerpadla-mitsubishi-vyhody-nevyhody-ceny-vlastnosti';
const mitsubishiItem=manifest.items.find(x=>x.slug===mitsubishiSlug);
assert(mitsubishiItem&&mitsubishiItem.preserve_status===true,'Mitsubishi Ecodan guide must remain managed and preserve status');
assert(mitsubishiItem.file&&fs.existsSync(path.join(__dirname,'..',mitsubishiItem.file)),'Mitsubishi Ecodan rewrite file missing');
assert(seoCore.includes("'tepelna-cerpadla-mitsubishi-vyhody-nevyhody-ceny-vlastnosti' => array("),'Mitsubishi Ecodan ranking-protection metadata must remain present');
const mitsubishiHtml=fs.readFileSync(path.join(__dirname,'..',mitsubishiItem.file),'utf8');
assert(mitsubishiHtml.includes('Ecodan Ultra Quiet'),'Mitsubishi guide must retain Ultra Quiet ranking intent');
assert(mitsubishiHtml.includes('PUZ-WZ'),'Mitsubishi guide must cover current R290 PUZ-WZ platform');
assert(mitsubishiHtml.includes('75 °C'),'Mitsubishi guide must retain current high-temperature operating context');
assert(!mitsubishiHtml.includes('dolar'),'Mitsubishi guide must not retain translated dollar-price guidance');
assert(!mitsubishiHtml.includes('MCS020'),'Mitsubishi guide must not retain UK-specific legacy certification guidance');
assert(seoCore.includes("'mohou-solarni-panely-pohanet-vzduchove-tepelne-cerpadlo' => 'kolik-stoji-fotovoltaika-s-tepelnym-cerpadlem'"),'Translated FVE plus heat-pump article must redirect to canonical decision guide');

const apartmentPvSlug='navratnost-fotovoltaicke-elektrarny-v-bytovem-dome';
const apartmentPvItem=manifest.items.find(x=>x.slug===apartmentPvSlug);
assert(apartmentPvItem&&apartmentPvItem.preserve_status===true,'Apartment-building PV ROI guide must remain managed and preserve status');
assert(apartmentPvItem.file&&fs.existsSync(path.join(__dirname,'..',apartmentPvItem.file)),'Apartment-building PV ROI rewrite file missing');
assert(seoCore.includes("'"+apartmentPvSlug+"' => array("),'Apartment-building PV ROI guide must have dedicated SEO metadata');
const apartmentPvHtml=fs.readFileSync(path.join(__dirname,'..',apartmentPvItem.file),'utf8');
assert(apartmentPvHtml.includes('EDC'),'Apartment-building PV ROI guide must cover EDC sharing');
assert(apartmentPvHtml.includes('bezúročný úvěr'),'Apartment-building PV ROI guide must reflect 2026 NZÚ financing');
assert(!apartmentPvHtml.includes('7 a 15 lety'),'Apartment-building PV ROI guide must not retain fake universal payback range');
assert(!apartmentPvHtml.includes('2 až 3 kWh'),'Apartment-building PV ROI guide must not retain fixed battery-per-kWp sizing');
assert(!apartmentPvHtml.includes('výnosu kolem 20%'),'Apartment-building PV ROI guide must not retain unsupported investment-return claims');

const overheatingSlug='proc-se-solarni-panely-neprehrivaji';
const overheatingItem=manifest.items.find(x=>x.slug===overheatingSlug);
assert(overheatingItem&&overheatingItem.preserve_status===true,'Overheating explainer must remain managed and preserve status');
assert(overheatingItem.file&&fs.existsSync(path.join(__dirname,'..',overheatingItem.file)),'Overheating explainer rewrite file missing');
assert(seoCore.includes("'proc-se-solarni-panely-neprehrivaji' => array("),'Overheating top-ranking SEO metadata must remain present');
const overheatingHtml=fs.readFileSync(path.join(__dirname,'..',overheatingItem.file),'utf8');
assert(overheatingHtml.includes('teplotní koeficient Pmax'),'Overheating explainer must teach temperature coefficient');
assert(overheatingHtml.includes('/realny-vykon-solarnich-panelu/'),'Overheating explainer must route to real-world performance guide');
assert(overheatingHtml.includes('/chlazeni-fotovoltaickych-panelu/'),'Overheating explainer must keep cooling-method intent separate');
assert(!overheatingHtml.includes('termálních izolátorů'),'Overheating explainer must not retain unsupported legacy cooling advice');
assert(!overheatingHtml.includes('panely umístěné ve stínu mají nižší teplotu'),'Overheating explainer must not recommend shading panels as thermal management');

const pvCoolingSlug='chlazeni-fotovoltaickych-panelu';
const pvCoolingItem=manifest.items.find(x=>x.slug===pvCoolingSlug);
assert(pvCoolingItem&&pvCoolingItem.preserve_status===true,'PV cooling guide must remain managed and preserve status');
assert(pvCoolingItem.file&&fs.existsSync(path.join(__dirname,'..',pvCoolingItem.file)),'PV cooling rewrite file missing');
assert(seoCore.includes("'chlazeni-fotovoltaickych-panelu' => array("),'PV cooling guide must have dedicated SEO metadata');
const pvCoolingHtml=fs.readFileSync(path.join(__dirname,'..',pvCoolingItem.file),'utf8');
assert(pvCoolingHtml.includes('Pasivní chlazení'),'PV cooling guide must cover passive cooling');
assert(pvCoolingHtml.includes('Vodní chlazení'),'PV cooling guide must cover water cooling');
assert(pvCoolingHtml.includes('/vysvetleni-solarnich-panelu-pv-t/'),'PV cooling guide must separate PVT intent');
assert(pvCoolingHtml.includes('/proc-se-solarni-panely-neprehrivaji/'),'PV cooling guide must cross-link the temperature/overheating intent');
assert(!pvCoolingHtml.includes('chlazení je klíčovým prvkem'),'PV cooling guide must not retain universal active-cooling claims');

const trackerSlug='nataceni-solarnich-panelu-za-sluncem';
const trackerItem=manifest.items.find(x=>x.slug===trackerSlug);
assert(trackerItem&&trackerItem.preserve_status===true,'Solar tracker guide must remain managed and preserve status');
assert(trackerItem.file&&fs.existsSync(path.join(__dirname,'..',trackerItem.file)),'Solar tracker rewrite file missing');
assert(seoCore.includes("'nataceni-solarnich-panelu-za-sluncem' => array("),'Solar tracker top-ranking SEO metadata must remain present');
const trackerHtml=fs.readFileSync(path.join(__dirname,'..',trackerItem.file),'utf8');
assert(trackerHtml.includes('Backtracking'),'Solar tracker guide must explain backtracking');
assert(trackerHtml.includes('Wind-stow'),'Solar tracker guide must explain wind-stow');
assert(trackerHtml.includes('Jednoosý vs. dvouosý tracker'),'Solar tracker guide must compare tracker types');
assert(trackerHtml.includes('/kolik-vyrobi-fotovoltaika-za-rok/'),'Solar tracker guide must route into annual-yield methodology');
assert(!trackerHtml.includes('Text odpovědi'),'Solar tracker guide must not retain placeholder FAQ content');

const positioningSlug='polohovani-solarnich-panelu';
const positioningItem=manifest.items.find(x=>x.slug===positioningSlug);
assert(positioningItem&&positioningItem.preserve_status===true,'Fixed panel positioning guide must remain managed and preserve status');
assert(positioningItem.file&&fs.existsSync(path.join(__dirname,'..',positioningItem.file)),'Fixed panel positioning rewrite file missing');
assert(seoCore.includes("'polohovani-solarnich-panelu' => array("),'Fixed panel positioning guide must have dedicated SEO metadata');
assert(leadCore.includes("'polohovani-solarnich-panelu'"),'Fixed panel positioning guide must participate in bounded E.ON solar funnel');
const positioningHtml=fs.readFileSync(path.join(__dirname,'..',positioningItem.file),'utf8');
assert(positioningHtml.includes('východ–západ'),'Positioning guide must compare east-west and south-facing layouts');
assert(positioningHtml.includes('PVGIS'),'Positioning guide must route orientation decisions through PVGIS');
assert(positioningHtml.includes('/nataceni-solarnich-panelu-za-sluncem/'),'Positioning guide must separate fixed-positioning and tracker intents');
assert(positioningHtml.includes('/castecne-zastineni-a-solarni-panely/'),'Positioning guide must account for shading intent');
assert(!positioningHtml.includes('vysokou latitudou'),'Positioning guide must not retain translated tracker generalizations');

const pvHubSlug='vse-o-solarnich-panelech-a-fotovoltaice';
const pvHubItem=manifest.items.find(x=>x.slug===pvHubSlug);
assert(pvHubItem&&pvHubItem.preserve_status===true,'Photovoltaic hub must remain managed and preserve status');
assert(pvHubItem.file&&fs.existsSync(path.join(__dirname,'..',pvHubItem.file)),'Photovoltaic hub rewrite file missing');
assert(seoCore.includes("'vse-o-solarnich-panelech-a-fotovoltaice' => array("),'Photovoltaic hub must have dedicated SEO metadata');
assert(leadCore.includes("'vse-o-solarnich-panelech-a-fotovoltaice'"),'Photovoltaic hub must participate in bounded E.ON solar funnel');
const pvHubHtml=fs.readFileSync(path.join(__dirname,'..',pvHubItem.file),'utf8');
for(const href of ['/jak-vybrat-solarni-panely-pro-vas-domov/','/mppt-kalkulacka/','/vyber-menice/','/vyber-baterii/','/quote-checker/','/solarni-sestava-na-chatu/']){
  assert(pvHubHtml.includes(href),'Photovoltaic hub must route to '+href);
}
assert(!pvHubHtml.includes('250 000 až 600 000 Kč'),'Photovoltaic hub must not retain stale universal FVE pricing');
assert(!pvHubHtml.includes('7 až 10 lety'),'Photovoltaic hub must not retain stale universal payback claims');
assert(!pvHubHtml.includes('25 000 až 45 000 Kč'),'Photovoltaic hub must not retain stale price-per-kWp claims');
assert(!pvHubHtml.includes('tepelné energie na elektrickou'),'Photovoltaic hub must not misdescribe photovoltaic conversion');

const firstPartyFunctions=fs.readFileSync(path.join(__dirname,'..','functions.php'),'utf8');
const firstPartyCore=fs.readFileSync(path.join(__dirname,'..','inc','core.php'),'utf8');
const firstPartyAnalytics=fs.readFileSync(path.join(__dirname,'..','assets','js','analytics.js'),'utf8');
assert(firstPartyFunctions.includes("wp_enqueue_script('solar-expert-analytics'"),'First-party funnel collector must be enqueued');
assert(firstPartyFunctions.includes("array('solar-expert-analytics')"),'First-party funnel collector must be enqueued before affiliate tracking');
assert(firstPartyFunctions.includes("wp_enqueue_script('solar-expert-quote-checker',$uri.'/assets/js/quote-checker.js',array('solar-expert-analytics')"),'Quote Checker must load after first-party analytics');
assert(firstPartyFunctions.includes("rest_url('solar-expert/v1/funnel-event')"),'Analytics collector must receive the first-party REST endpoint');
assert(firstPartyCore.includes("register_rest_route('solar-expert/v1', '/funnel-event'"),'First-party funnel REST route must stay registered');
assert(firstPartyCore.includes("get_option('solar_expert_funnel_daily'"),'Funnel collector must use aggregate daily storage');
assert(firstPartyCore.includes("34 * DAY_IN_SECONDS"),'Funnel collector must prune storage to a 35-day rolling window');
assert(firstPartyCore.includes("<h2>Money funnel</h2>"),'Admin diagnostics must expose the money funnel summary');
assert(firstPartyCore.includes("'merchants'=>$merchants"),'Funnel summary must retain merchant attribution');
assert(firstPartyCore.includes("'placements'=>$placements"),'Funnel summary must retain placement attribution');
assert(firstPartyCore.includes("Outbound clicks by merchant"),'Admin diagnostics must expose merchant click attribution');
assert(firstPartyCore.includes("Outbound clicks by placement"),'Admin diagnostics must expose placement click attribution');
const builderOfferTpl=fs.readFileSync(path.join(__dirname,'..','template-parts','solar-builder.php'),'utf8');
assert(builderOfferTpl.includes('se-offer-best'),'Builder must visibly distinguish a verified cheaper merchant offer');
assert(firstPartyCore.includes("'funnel_tracking' => 'first_party_v1'"),'Health payload must expose first-party funnel tracking state');
for(const eventName of ['tool_view','tool_start','solar_builder_complete','selector_engaged','quote_checker_complete','affiliate_click','bundle_deal_click','lead_click']){
  assert(firstPartyAnalytics.includes("'"+eventName+"'"),'Analytics collector must whitelist '+eventName);
}
assert(firstPartyAnalytics.includes("keepalive:true"),'Funnel POST must survive outbound navigation when possible');
assert(!firstPartyAnalytics.includes('localStorage'),'First-party funnel collector must not use localStorage');
assert(!firstPartyAnalytics.includes('document.cookie'),'First-party funnel collector must not set or read cookies');


const lgReviewPath=path.join(__dirname,'..','content','rewrites','tepelna-cerpadla-lg-vyhody-nevyhody-ceny.html');
assert(fs.existsSync(lgReviewPath),'LG heat-pump review near-win must exist');

const lgReview=fs.readFileSync(path.join(__dirname,'..','content','rewrites','tepelna-cerpadla-lg-vyhody-nevyhody-ceny.html'),'utf8');
assert(lgReview.includes('LG THERMA V'),'LG review must identify the current THERMA V platform');
assert(lgReview.includes('forum.tzb-info.cz'),'LG review must preserve independent owner-experience context');
assert(lgReview.includes('data-se-lead-id="eon-heat-pump"'),'LG review must retain the comparison lead path');

const autoDeployPath=path.join(__dirname,'..','.github','workflows','auto-deploy-dev.yml');
assert(fs.existsSync(autoDeployPath),'Gated Solar Expert auto-deploy workflow must exist');
const autoDeploy=fs.readFileSync(autoDeployPath,'utf8');
assert(autoDeploy.includes('SOLAR_EXPERT_DEPLOY_URL'),'Auto-deploy must use a repository secret for the Push-to-Deploy URL');
assert(autoDeploy.includes('sleep 15'),'Auto-deploy must allow GitHub branch ZIP generation to settle before calling Deployer');
assert(!autoDeploy.includes('curl -sSL -X POST'),'Deployer trigger itself must use GET because the production host rejects POST with HTTP 422');
assert(autoDeploy.includes("https://solar-expert.cz/wp-json/dfg/v1/package_update"),'Auto-deploy must normalize to the documented Deployer REST endpoint');
assert(autoDeploy.includes("package=solar-expert-2"),'Auto-deploy must target the installed Solar Expert theme package');
assert(autoDeploy.includes("html.unescape"),'Auto-deploy must tolerate an HTML-escaped URL copied from the plugin UI');
assert(autoDeploy.includes('Cache-Control: no-cache, no-store, max-age=0'),'Deployer trigger must bypass intermediary caches without changing the endpoint query contract');
assert(autoDeploy.includes('-w "%{http_code}"'),'Auto-deploy must validate Deployer HTTP status');
assert(autoDeploy.includes("jq -r '.success // true'"),'Auto-deploy should honor an explicit JSON failure when the plugin returns JSON');
assert(autoDeploy.includes('Deployer for Git failed with HTTP'),'Auto-deploy must fail on a non-200 Deployer response');
assert(autoDeploy.includes('Deployer for Git rejected the deployment'),'Auto-deploy must fail on an explicit JSON rejection');
assert(autoDeploy.includes('package_slug'),'Auto-deploy diagnostics must expose the returned package slug without exposing the secret');
assert(autoDeploy.includes('select(.name=="validate")'),'Auto-deploy must wait for the validate check');
assert(autoDeploy.includes('/commits/${GITHUB_SHA}/pulls'),'Auto-deploy must resolve the merged PR for the dev commit');
assert(autoDeploy.includes('select(.name=="preview")'),'Auto-deploy must require the merged PR WordPress preview check');
assert(autoDeploy.includes('No merged pull request into dev'),'Auto-deploy must block direct pushes that bypass PR preview');
assert(autoDeploy.includes('/wp-json/solar-expert/v1/health'),'Auto-deploy must verify production health');
assert(autoDeploy.includes('content_sync_required'),'Auto-deploy must wait for managed-content sync to become current');
assert(autoDeploy.includes('Health endpoint temporarily unavailable or returned invalid JSON'),'Auto-deploy must retry transient health transport failures');
assert(!autoDeploy.includes('wp-cron.php?'),'Auto-deploy must not depend on WP-Cron for release-critical managed-content convergence');
assert(!autoDeploy.includes('doing_wp_cron=$(date'),'Auto-deploy must not forge the WordPress cron lock token');
assert(autoDeploy.includes('deploy_probe=${GITHUB_SHA}'),'Auto-deploy health probes must use a unique release cache-buster');
assert(autoDeploy.includes('Cache-Control: no-cache, no-store, max-age=0'),'Auto-deploy health probes must explicitly bypass intermediary caches');
assert(autoDeploy.includes('timeout-minutes: 15'),'Auto-deploy must leave enough time for asynchronous managed-content convergence');
assert(autoDeploy.includes('sleep 5'),'Auto-deploy must allow a short deploy switchover grace period');
assert(autoDeploy.includes('branches:\n      - dev'),'Auto-deploy must be scoped to the dev branch');

assert(!autoDeploy.includes("python - <<'PY'"),'Auto-deploy workflow must avoid unindented heredocs that break YAML parsing');

assert(autoDeploy.includes('Deployer URL shape:'),'Auto-deploy diagnostics must expose only non-secret URL shape metadata');

assert(corePhp.includes("wp_schedule_single_event(time() + 10, 'solar_expert_async_content_sync')"),'Managed content sync should be scheduled promptly after deploy');

assert(corePhp.includes("function solar_expert_deploy_sync("),'Theme must expose a deterministic deploy-sync callback');
assert(corePhp.includes("'/deploy-sync'"),'Theme must register the managed-content deploy-sync REST route');
assert(corePhp.includes("managed-content-sync-v1"),'Deploy-sync must require an explicit fixed intent');
assert(corePhp.includes("hash_equals($live_version, $expected_version)"),'Deploy-sync must reject version-mismatched release requests');
assert(autoDeploy.includes('name: Converge managed content'),'Auto-deploy must explicitly converge managed content after the Deployer trigger');
assert(autoDeploy.includes('/wp-json/solar-expert/v1/deploy-sync'),'Auto-deploy must call the deterministic managed-content sync endpoint');
assert(autoDeploy.includes("'.ok == true and .content_sync_required == false and .content_sync_errors == 0'"),'Auto-deploy must require a clean sync result before health verification');
