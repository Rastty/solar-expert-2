import test from 'node:test';
import assert from 'node:assert/strict';
import {extractAffiliateConfig,assessAffiliateReadiness,fetchPublicHomepage} from '../tools/live-affiliate-readiness.mjs';

const eHub='https://ehub.cz/system/scripts/click.php?a_aid=secret-publisher&a_bid=secret-campaign';
const config={affiliateBases:{'battery-cz':eHub,'solar-import-cz':eHub},
  affiliateMap:{products:{},leads:{}}};
const health={theme_version:'0.12.27',affiliate_merchant_bases:2};
const response=(html,status=200)=>({
  status,redirected:false,headers:new Headers(),
  body:new ReadableStream({start(controller){controller.enqueue(new TextEncoder().encode(html));controller.close();}})
});

test('extracts only localized JSON, without evaluating remote JavaScript',()=>{
  const html='<script>var SolarExpertConfig = '+JSON.stringify(config)+'; alert("NEVER EXECUTE");</script>';
  assert.deepEqual(extractAffiliateConfig(html),config);
  assert.throws(()=>extractAffiliateConfig('<script>var SolarExpertConfig = window.location;</script>'),/not a JSON object/);
  assert.throws(()=>extractAffiliateConfig('<script>var SolarExpertConfig = {notJSON:1};</script>'),SyntaxError);
});

test('counts recognizable public eHub bases but never claims commission or release',()=>{
  const report=assessAffiliateReadiness(config,health,'2026-11-18T12:00:00Z');
  assert.equal(report.status,'observed');
  assert.equal(report.qualified_ehub_bases,2);
  assert.equal(report.configured_bases,2);
  assert.equal(report.release_authorized,false);
  assert.equal(report.checked_at_utc,'2026-11-18T12:00:00.000Z');
  const reportString=JSON.stringify(report);
  assert(!reportString.includes('secret-publisher'));
  assert(!reportString.includes('secret-campaign'));
  assert(!reportString.includes('a_aid'));
});

test('invalid, unclassified, empty and health-mismatched bases are distinguished',()=>{
  const broken=assessAffiliateReadiness({affiliateBases:{'battery-cz':'#','eon-cz':'javascript:alert(1)'}},health);
  assert.equal(broken.status,'invalid_bases');
  assert.equal(broken.invalid_bases,2);
  const nonEhub=assessAffiliateReadiness({affiliateBases:{'ampul-eu':'https://approved-network.example/redirect?id=x'}},null);
  assert.equal(nonEhub.status,'unclassified_networks');
  assert.equal(nonEhub.unclassified_external_bases,1);
  assert.equal(assessAffiliateReadiness({},null).status,'missing_bases');
  assert.equal(assessAffiliateReadiness(config,{...health,affiliate_merchant_bases:3}).status,'health_count_mismatch');
  assert.equal(assessAffiliateReadiness({affiliateBases:{'battery-cz':'https://ehub.cz/system/scripts/click.php?a_aid=x'}},null).status,'invalid_bases');
});

test('homepage probe is exactly one fixed GET and never visits a tracking URL',async()=>{
  const called=[];
  const text=await fetchPublicHomepage(async(url,options)=>{
    called.push(url);
    assert.equal(options.method,'GET');
    assert.equal(options.redirect,'manual');
    assert.equal(options.headers.Authorization,undefined);
    return response('public homepage');
  });
  assert.equal(text,'public homepage');
  assert.deepEqual(called,['https://solar-expert.cz/']);
  await assert.rejects(fetchPublicHomepage(async()=>response('redirect',302)),/not HTTP 200/);
  await assert.rejects(fetchPublicHomepage(async()=>({...response('too large'),headers:new Headers({'content-length':'1000000'})})),/Oversize/);
});
