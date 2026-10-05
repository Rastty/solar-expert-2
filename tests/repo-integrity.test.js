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

for(const product of source.products||[]){
  assert(product.id&&typeof product.id==='string','Product is missing id');
  if(Number(product.parallel_max_units||1)>1){
    assert(product.type==='battery','Only battery products may declare parallel_max_units: '+product.id);
    assert(Number.isInteger(Number(product.parallel_max_units))&&Number(product.parallel_max_units)>=2,'parallel_max_units must be an integer >=2: '+product.id);
    assert(/^https:\/\//.test(product.parallel_evidence_url||''),'Parallel battery evidence URL must be HTTPS: '+product.id);
    assert(/^\d{4}-\d{2}-\d{2}$/.test(product.parallel_verified_at||''),'Parallel battery evidence must be date-stamped: '+product.id);
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
    }
    const primary=product.offers.find(o=>o.merchant===product.merchant);
    assert(primary,'Primary merchant must exist in offers for '+product.id);
    assert(Number(product.price_czk)===Number(primary.price_czk),'Primary price must match primary offer for '+product.id);
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
  'jak-funguji-solarni-panely-na-plochych-strechach':'kotveni-fotovoltaickych-panelu-na-ploche-strese'
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


assert(leadCore.includes("function solar_expert_solar_lead_slugs()"),'Solar lead CTA must be bounded by an explicit allowlist');
assert(leadCore.includes("'eon-solar'"),'Solar lead CTA must use the canonical E.ON solar lead key');
assert(leadCore.includes("https://www.eon.cz/domacnosti/usporne-technologie/solar/"),'Solar lead CTA must retain a safe public fallback');
assert(leadCore.includes("data-se-placement=\"solar_legacy_article\""),'Solar lead CTA must expose a stable measurement placement');
for(const slug of ['fve-panely-na-strechu','fotovoltaika-na-eternitovou-strechu','kotveni-fotovoltaickych-panelu-na-ploche-strese','velikost-rozmery-a-hmotnost-solarnich-panelu']){
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
assert(composerJs.includes('batteryBank.quantity === 1'),'Bundle deal must be limited to single-battery bundles');
assert(builderJs.includes('Paralelní bateriový bank'),'Builder checklist must surface parallel-bank verification');
assert(builderTemplate.includes("b.batteryQuantity||1"),'Builder must render battery quantity');
assert(builderTemplate.includes('kWh celkem'),'Builder must render total battery-bank energy');
