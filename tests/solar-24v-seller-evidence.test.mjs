import test from 'node:test';
import assert from 'node:assert/strict';
import {capture,parseProductJsonLd,qualifySchema,daysUntilQuoteExpiry,TARGETS,REST} from '../tools/solar-24v-seller-evidence.mjs';

function productSchema(sku,price='14690',availability='InStock',currency='CZK'){
  return '<!doctype html><html><head><script type="application/ld+json">'+
    JSON.stringify({'@context':'https://schema.org','@type':'Product',sku,
      name:'Exact product',offers:{'@type':'Offer',price,
      priceCurrency:currency,availability:'https://schema.org/'+availability}})+
    '</script></head><body>Source</body></html>';
}
test('frontend 30-day quote window countdown never silently refreshes evidence',()=>{
  const now=new Date('2026-11-21T11:55:00Z');
  assert.equal(daysUntilQuoteExpiry('2026-11-07',now),16);
  assert.equal(daysUntilQuoteExpiry('2026-11-07',new Date('2026-12-07T12:00:00Z')),0);
  assert.equal(daysUntilQuoteExpiry('2026-11-07',new Date('2026-12-08T00:00:00Z')),-1);
  assert.equal(daysUntilQuoteExpiry('2026-11-22',now),null);
  assert.equal(daysUntilQuoteExpiry('2026-02-31',now),null);
  assert.equal(daysUntilQuoteExpiry('bad',now),null);
});

test('exact same SKU CZK price and stock accepted from Product JSON-LD',()=>{
  assert.deepEqual(qualifySchema(productSchema('E8286'),'E8286'),{
    status:'verified_source_quote',price_czk:14690,availability:'in_stock'});
  assert.equal(parseProductJsonLd(productSchema('E8286')).length,1);
});
test('wrong SKU, wrong currency, no offers and conflicting quotes fail closed',()=>{
  assert.equal(qualifySchema(productSchema('E0000'),'E8286').status,'identity_not_proven');
  assert.equal(qualifySchema(productSchema('E8286','14690','InStock','EUR'),'E8286').status,
    'exact_sku_no_complete_structured_quote');
  assert.equal(qualifySchema(productSchema('E8286','14,690'),'E8286').status,
    'exact_sku_no_complete_structured_quote');
  const conflict='<script type="application/ld+json">'+JSON.stringify({
    '@type':'Product',sku:'E8286',offers:[
      {price:'14690',priceCurrency:'CZK',availability:'https://schema.org/InStock'},
      {price:'15200',priceCurrency:'CZK',availability:'https://schema.org/InStock'}]
  })+'</script>';
  assert.equal(qualifySchema(conflict,'E8286').status,'ambiguous_same_sku_quotes');
});
test('nested @graph and productID strict match supported, no script execution',()=>{
  const html='<script type="application/ld+json">'+JSON.stringify({
    '@graph':[{'@type':'WebSite',name:'Shop'},
      {'@type':['Thing','Product'],productID:'E7358',
      offers:[{price:2984,priceCurrency:'CZK',availability:'http://schema.org/OutOfStock'}]}]})+
    '</script>';
  assert.deepEqual(qualifySchema(html,'E7358'),{
    status:'verified_source_quote',price_czk:2984,availability:'out_of_stock'});
  assert.equal(qualifySchema('<script>process.exit(1)</script>','E7358').status,
    'identity_not_proven');
});
test('four exact source GETs, no eHub, no date overwrite and distinct changed quote',async()=>{
  const catalog={products:Array.from({length:24},(_,i)=>({
    id:'other-'+i,sku:'unused',offers:[]}))};
  for(let i=0;i<TARGETS.length;i++){
    const t=TARGETS[i];
    catalog.products[i]={id:t.id,sku:t.sku,offers:[{
      merchant:t.merchant,source_url:'https://'+t.host+'/exact-product-'+t.sku+'/',
      price_czk:[14690,7431,2984,2251][i],availability:'in_stock',
      verified_at:'2026-11-07'
    }]};
  }
  const prices=[14690,7431,3010,2251];
  const calls=[];
  const fake=async (url,options)=>{
    calls.push({url,method:options.method,redirect:options.redirect});
    let body,contentType;
    if(url===REST){
      body=JSON.stringify(catalog);contentType='application/json';
    }else{
      const i=TARGETS.findIndex(t=>url.includes(t.sku));
      assert.ok(i>=0,'unexpected merchant URL');
      body=productSchema(TARGETS[i].sku,String(prices[i]));
      contentType='text/html; charset=UTF-8';
    }
    const res=new Response(body,{status:200,headers:{'content-type':contentType}});
    Object.defineProperty(res,'url',{value:url});
    return res;
  };
  const report=await capture(fake,new Date('2026-11-21T11:55:00Z'));
  assert.equal(report.selected_source_product_count,4);
  assert.equal(report.observed_verified,4);
  assert.equal(report.observed_changed,1);
  assert.equal(report.observed_unknown,0);
  assert.equal(report.earliest_catalog_quote_days_remaining,16);
  assert.equal(report.quotes_expiring_within_7_days,0);
  assert.ok(report.rows.every(x=>x.days_until_30day_quote_expiry===16));
  assert.deepEqual(report.rows.map(x=>x.observation_status),
    ['same_quote','same_quote','quote_changed','same_quote']);
  assert.ok(report.rows.every(x=>x.observed_at_utc==='2026-11-21T11:55:00.000Z'));
  assert.equal(report.rows[2].catalog_price_czk,2984);
  assert.equal(report.rows[2].observed_price_czk,3010);
  assert.equal(report.automatic_catalog_date_refresh,false);
  assert.equal(report.wordpress_writes,0);
  assert.equal(report.affiliate_network_gets,0);
  assert.equal(calls.length,5,'one first-party REST, exactly four shop GETs');
  assert.ok(calls.every(x=>x.method==='GET'&&x.redirect==='manual'));
  assert.ok(calls.every(x=>!x.url.includes('ehub.cz')));
});
test('blocked/redirect seller is unknown, never considered in stock',async()=>{
  const catalog={products:Array.from({length:24},(_,i)=>({
    id:'other-'+i,sku:'unused',offers:[]}))};
  for(let i=0;i<TARGETS.length;i++){
    const t=TARGETS[i];
    catalog.products[i]={id:t.id,sku:t.sku,offers:[{
      merchant:t.merchant,source_url:'https://'+t.host+'/exact-product-'+t.sku+'/',
      price_czk:5000,availability:'in_stock',verified_at:'2026-11-07'
    }]};
  }
  const fake=async (url)=>{
    const json=url===REST;
    const res=new Response(json?JSON.stringify(catalog):'redirect blocked',
      {status:json?200:302,headers:{'content-type':json?'application/json':'text/html'}});
    Object.defineProperty(res,'url',{value:url});
    return res;
  };
  const report=await capture(fake,new Date('2026-11-21T11:55:00Z'));
  assert.equal(report.observed_verified,0);
  assert.equal(report.observed_unknown,4);
  assert.ok(report.rows.every(x=>x.observed_at_utc===null));
  assert.ok(report.rows.every(x=>x.observation_status==='fetch_unverified'));
});
