import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const ONE_DAY_MS=24*60*60*1000;
export const PRICE_FRESHNESS_DAYS=30;
export const WARNING_DAYS=7;

function dateOnly(value){
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return null;
  const time=Date.parse(value+'T00:00:00Z');
  if(!Number.isFinite(time)||new Date(time).toISOString().slice(0,10)!==value)return null;
  return time;
}

export function offerFreshness(verifiedAt,nowValue=new Date(),warningDays=WARNING_DAYS){
  const now=new Date(nowValue);
  if(Number.isNaN(now.getTime()))throw new TypeError('Invalid as-of UTC timestamp');
  if(!Number.isInteger(warningDays)||warningDays<0||warningDays>PRICE_FRESHNESS_DAYS)throw new TypeError('Invalid warning day window');
  const verifiedMs=dateOnly(verifiedAt);
  if(verifiedMs===null)return{state:'unknown',age_days:null,days_until_stale:null,first_stale_utc:null};
  // Use the same floor-to-whole-days convention as product-matcher.verificationState.
  // The first stale UTC calendar date is verified_at + 31 days, not +30 days.
  const age=Math.floor((now.getTime()-verifiedMs)/ONE_DAY_MS);
  const until=PRICE_FRESHNESS_DAYS+1-age;
  const firstStale=new Date(verifiedMs+(PRICE_FRESHNESS_DAYS+1)*ONE_DAY_MS).toISOString().slice(0,10);
  if(age<0)return{state:'future_dated',age_days:age,days_until_stale:until,first_stale_utc:firstStale};
  return {
    state:age>PRICE_FRESHNESS_DAYS?'stale':until<=warningDays?'expiring_soon':'fresh',
    age_days:age,days_until_stale:until,first_stale_utc:firstStale,
  };
}

export function reviewCatalogFreshness(catalog,nowValue=new Date(),warningDays=WARNING_DAYS){
  if(!catalog||!Array.isArray(catalog.products)||!Array.isArray(catalog.bundle_deals)){
    throw new TypeError('Expected catalog.products and catalog.bundle_deals');
  }
  const now=new Date(nowValue);
  if(Number.isNaN(now.getTime()))throw new TypeError('Invalid as-of UTC timestamp');
  const results=[],keys=new Set();
  for(const [kind,records] of [['product',catalog.products],['bundle',catalog.bundle_deals]]){
    for(const item of records){
      if(!item||typeof item.id!=='string'||!item.id)throw new TypeError('Catalog record missing ID');
      let offers=item.offers;
      if(!Array.isArray(offers)||!offers.length){
        if(['unavailable','discontinued'].includes(item.availability))continue;
        offers=[{merchant:item.merchant,verified_at:item.verified_at,source_url:item.source_url,price_czk:item.price_czk}];
      }
      for(const offer of offers){
        if(!offer||typeof offer.merchant!=='string'||!offer.merchant)throw new TypeError('Catalog offer missing merchant for '+item.id);
        const key=kind+'|'+item.id+'|'+offer.merchant;
        if(keys.has(key))throw new TypeError('Duplicate catalog offer '+key);
        keys.add(key);
        results.push({
          kind,product_id:item.id,merchant:offer.merchant,
          verified_at:offer.verified_at||null,
          source_url:offer.source_url||null,
          ...offerFreshness(offer.verified_at,now,warningDays),
        });
      }
    }
  }
  const counts={fresh:0,expiring_soon:0,stale:0,unknown:0,future_dated:0};
  for(const entry of results)counts[entry.state]++;
  const byKind={product:results.filter(x=>x.kind==='product').length,bundle:results.filter(x=>x.kind==='bundle').length};
  const attention=results.filter(x=>x.state!=='fresh').sort((a,b)=>{
    const weight={stale:0,unknown:1,future_dated:2,expiring_soon:3};
    return weight[a.state]-weight[b.state]||(a.days_until_stale??Infinity)-(b.days_until_stale??Infinity)
      ||a.product_id.localeCompare(b.product_id)||a.merchant.localeCompare(b.merchant);
  });
  return {
    checked_at_utc:now.toISOString(),
    source_catalog_verified_at:catalog.verifiedAt||null,
    policy:{price_freshness_days:PRICE_FRESHNESS_DAYS,warning_days:warningDays},
    semantics:'Read-only date check; does not verify retailer price, product identity, stock, merchant availability, affiliate clicks or conversions. No dates are auto-refreshed.',
    total_offers:results.length,by_kind:byKind,counts,attention,results,
  };
}

export function freshnessSummaryMarkdown(report){
  const lines=[
    '## Solar Expert — catalog price evidence watch',
    '',
    'As of UTC: **'+report.checked_at_utc+'**. Policy: stale after **'+report.policy.price_freshness_days+'** whole days; early warning within **'+report.policy.warning_days+'** days of expiry.',
    '',
    '| Total offers | Product offers | Bundle offers | Fresh | Expiring soon | Stale | Unknown | Future-dated |',
    '|---:|---:|---:|---:|---:|---:|---:|---:|',
    '| '+report.total_offers+' | '+report.by_kind.product+' | '+report.by_kind.bundle+' | '+report.counts.fresh+' | '+report.counts.expiring_soon+' | '+report.counts.stale+' | '+report.counts.unknown+' | '+report.counts.future_dated+' |',
    '',
    '> This is **date evidence monitoring only**. HTTP 200, scheduled probes or age checks must NEVER advance verified_at, change seller prices, invent stock, or simulate affiliate clicks. Revisit exact retailer-owned SKU pages before editing catalog data. Existing 30-day price hiding remains active.',
  ];
  if(report.attention.length){
    lines.push('','### Actionable offer-level re-verification queue','',
      '| State | Kind | Product / set ID | Merchant | Last verified | First stale UTC | Days until stale |',
      '|---|---|---|---|---|---|---:|');
    for(const x of report.attention){
      lines.push('| '+x.state+' | '+x.kind+' | `'+x.product_id.replaceAll('|','%7C')+'` | `'+x.merchant.replaceAll('|','%7C')+'` | '+(x.verified_at||'unknown')+' | '+(x.first_stale_utc||'unknown')+' | '+(x.days_until_stale??'—')+' |');
    }
  } else lines.push('','No offers require a date-evidence recheck within the configured warning window.');
  return lines.join('\n')+'\n';
}

if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try {
    const source=fs.readFileSync(path.join(root,'data/product-seed.json'),'utf8');
    const runtime=fs.readFileSync(path.join(root,'assets/data/product-seed.json'),'utf8');
    if(source!==runtime)throw new TypeError('Catalog source/runtime mirrors differ; no trust in freshness report');
    const report=reviewCatalogFreshness(JSON.parse(source),process.env.CATALOG_NOW_UTC||new Date());
    const outputDir=path.join(root,'artifacts');
    fs.mkdirSync(outputDir,{recursive:true});
    fs.writeFileSync(path.join(outputDir,'catalog-freshness.json'),JSON.stringify(report,null,2)+'\n');
    const md=freshnessSummaryMarkdown(report);
    process.stdout.write(md);
    if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,md);
    if(report.counts.stale||report.counts.unknown||report.counts.future_dated){
      process.stdout.write('::warning::Catalog date evidence requires review: '+report.counts.stale+' stale, '+report.counts.unknown+' unknown, '+report.counts.future_dated+' future-dated. No automatic catalog edits.\n');
    } else if(report.counts.expiring_soon) {
      process.stdout.write('::notice::'+report.counts.expiring_soon+' catalog offers approaching 30-day evidence expiry.\n');
    }
    // Expired evidence is a manual supplier verification queue, not a deploy or CI failure.
    // Bad source/runtime parity or malformed catalogs do fail closed above.
  } catch(error) {
    console.error('Catalog freshness monitor input/consistency error:',error?.message||error);
    process.exitCode=1;
  }
}
