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

const merchantRegistry=JSON.parse(fs.readFileSync(path.join(__dirname,'..','data','merchant-registry.json'),'utf8'));
const merchantIds=new Set((merchantRegistry.merchants||[]).map(m=>m.id));
assert(merchantIds.size>0,'Merchant registry must not be empty');

for(const product of source.products||[]){
  assert(product.id&&typeof product.id==='string','Product is missing id');
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
