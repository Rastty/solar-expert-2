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
