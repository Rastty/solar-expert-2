#!/usr/bin/env python3
"""One-time independent, READ-ONLY WordPress publication eligibility for UPS guide.

Required before merging existing draft PR #296. This is NOT the publisher:
never submit a WP POST, update content, infer stock, or attempt a theme deploy.
Reuse the already-tested Core WordPress editorial 24h, taxonomy and collision
guards rather than copy their (DST-sensitive) logic.

Run on a clean GitHub Actions checkout of current main; the single existing
editorial writer has a separate one-shot source reviewed activation.
"""
from __future__ import annotations
from datetime import datetime,timezone,timedelta
import json
from pathlib import Path
import sys
from urllib import request,error

from scripts import editorial_release as e

MANIFEST=e.ROOT/'ops/editorial-manifests/solar-circulation-pump-ups-20261120-v1.json'
OUTPUT=e.ROOT/'artifacts/solar-ups-publish-readonly-eligibility.json'
EXPECTED_MAIN_REVISION=24
EXPECTED_NEXT_REVISION=25
EXPECTED_PREVIOUS='ops/editorial-manifests/solar-well-pump-ac-fullkit-bridge-20261121-v1.json'
EXACT_SLUG='zalozni-zdroj-pro-obehove-cerpadlo'
EXPECTED_SHA='6013b235a696ebf7b5524db5f837864a3fd5680ba32cedd9d52636ed2d2ceee7'
EXPECTED_SOURCE_COMMIT='2bfec97ea2a3af955087131e48289fe1dcff0b27'
MIN_UTC=datetime(2026,11,21,13,30,38,tzinfo=timezone.utc)


def require(value,why):
    if not value: raise e.Blocked(why)


def public_absence(slug):
    # A public 200 is a collision even if the Core WP REST posts endpoint
    # returned none (theme-level rewrite or stale cache). Never follow 30x.
    url=e.SITE+'/'+slug+'/'
    req=request.Request(url,headers={
        'Accept':'text/html','Cache-Control':'no-cache',
        'User-Agent':'SolarExpert-UPS-PostEligibility-GETonly/1.0'
    },method='GET')
    try:
        with e.OPENER.open(req,timeout=22) as res:
            require(res.url==url,'Public article canonical identity drift')
            require(res.status==404,'Public target slug already routes to a page')
            return '404'
    except error.HTTPError as ex:
        require(ex.code==404,'Public target status not 404')
        return '404'
    except (error.URLError,TimeoutError,OSError,ValueError):
        raise e.Blocked('Public post slug GET unavailable') from None


def check():
    now=datetime.now(timezone.utc)
    require(now>=MIN_UTC,'24-hour editorial window not yet open')
    control=json.loads(e.CONTROL.read_text('utf-8'))
    require(type(control) is dict and
            control.get('schema_version')==1 and
            control.get('mode')=='one_editorial_post' and
            control.get('enabled') is True and
            control.get('activation_revision')==EXPECTED_MAIN_REVISION and
            control.get('manifest')==EXPECTED_PREVIOUS,
            'Main editorial revision is no longer exactly 24; another writer may own it')
    m=json.loads(MANIFEST.read_text('utf-8'))
    e.validate_manifest(m)
    require(m.get('kind')=='post_create' and
            m.get('slug')==EXACT_SLUG and
            m.get('operation_id')=='solar-circulation-pump-ups-20261120-v1' and
            m.get('source_commit')==EXPECTED_SOURCE_COMMIT and
            m.get('source_sha256')==EXPECTED_SHA,
            'Reviewed source manifest identity drift')
    original=e.github_source(m)  # exact immutable commit + SHA256 + editorial safety
    require(e.sha(original)==EXPECTED_SHA,'Reviewed article body hash differs')
    category=e.category_id()
    # Existing publisher's authoritative GET-only canonical uniqueness check.
    # Calls exact slug posts/status:any, exact WordPress page slug/status:any,
    # and the fully paginated rolling 24-hour UTC new-post cooldown gate.
    decision,record=e.check_existing(m,original,category,for_update=False)
    require(decision=='needs_create' and record is None,
            'Target slug already exists or is not eligible for a new post')
    observed=public_absence(EXACT_SLUG)
    rows=e.wp('GET','/wp/v2/posts',query={
        'context':'edit','status':'publish','orderby':'date','order':'desc',
        'page':1,'per_page':1,'_fields':'id,slug,status,date,date_gmt'})
    require(type(rows) is list and len(rows)==1,
            'Cannot establish last published WordPress post')
    latest=rows[0]
    require(type(latest) is dict and
            type(latest.get('id')) is int and
            latest.get('status')=='publish',
            'Last published post identity drift')
    latest_at=e.parse_wp_gmt_utc(latest.get('date_gmt'))
    require(now-latest_at>=timedelta(hours=24) and latest_at<=now,
            'Last published WP post inside protected 24-hour window')
    return {'schema_version':1,'status':'eligible',
        'checked_at_utc':now.isoformat(),
        'operation_id':m['operation_id'],
        'source_commit':EXPECTED_SOURCE_COMMIT,
        'source_sha256':EXPECTED_SHA,
        'target_slug':EXACT_SLUG,'current_main_revision':24,
        'next_reviewed_revision':25,
        'publication_window_eligible':True,
        'current_wp_article_absent':True,
        'current_wp_page_slug_absent':True,
        'current_public_status':int(observed),
        'last_live_wp_post_id':latest['id'],
        'last_live_wp_post_gmt':latest_at.isoformat(),
        'since_last_new_post_hours':round((now-latest_at).total_seconds()/3600,2),
        'fresh_wp_cooldown_proved':True,
        'immutable_article_source_sha_verified':True,
        'wordpress_posts_written':0,'new_website_articles_created':0,
        'wordpress_catalog_writes':0,'theme_deployed':False,
        'publisher_pr_merged':False}

def main():
    try:
        data=check()
    except Exception as ex:
        # Sanitized reason, no WP body, login, token, URL query, user record
        # or source HTML in CI artifact/logs.
        cause=str(ex)
        allowed=('24-hour','Main editorial','Reviewed source','Reviewed article',
                 'Target slug','Public article','Public target','Public post',
                 'Cannot establish','Last published','WordPress','Missing')
        if not cause.startswith(allowed):cause='unknown preflight gate'
        data={'schema_version':1,'status':'blocked_no_write',
              'reason':cause[:140],
              'wordpress_posts_written':0,'new_website_articles_created':0,
              'publisher_pr_merged':False,'theme_deployed':False}
    OUTPUT.parent.mkdir(parents=True,exist_ok=True)
    OUTPUT.write_text(json.dumps(data,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
    print('SOLAR_UPS_PUBLISH_PREFLIGHT status='+data['status']+
          ' source_sha_verified='+str(data.get('immutable_article_source_sha_verified',False)).lower()+
          ' wp_slug_absent='+str(data.get('current_wp_article_absent',False)).lower()+
          ' cooldown_24h='+str(data.get('fresh_wp_cooldown_proved',False)).lower()+
          ' public_status='+str(data.get('current_public_status','unknown'))+
          ' writes=0')
    if data['status']!='eligible':sys.exit(2)

if __name__=='__main__':main()
