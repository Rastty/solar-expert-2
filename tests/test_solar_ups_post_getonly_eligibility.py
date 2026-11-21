"""No-write regression for the independent live UPS publication eligibility gate."""
import json
from datetime import datetime,timedelta,timezone
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from scripts import solar_ups_post_getonly_eligibility as m


class GetOnlyEligibilityTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.c=Path(self.tmp.name)/"control.json"
        self.manifest=Path(self.tmp.name)/"ups-manifest.json"
        source=json.loads(m.MANIFEST.read_text("utf-8"))
        self.manifest.write_text(json.dumps(source),encoding="utf-8")
        self.control={
            "schema_version":1,"mode":"one_editorial_post","enabled":True,
            "activation_revision":24,"manifest":m.EXPECTED_PREVIOUS}
        self.c.write_text(json.dumps(self.control),encoding="utf-8")
        for fixture in (
          patch.object(m.e,"CONTROL",self.c),
          patch.object(m,"MANIFEST",self.manifest),
          patch.object(m,"MIN_UTC",datetime(2020,1,1,tzinfo=timezone.utc))):
            fixture.start()
            self.addCleanup(fixture.stop)

    def run_proof(self,latest):
        requests=[]
        def wp(method,route,*,query=None,body=None):
            requests.append((method,route,query,body))
            self.assertEqual(method,"GET","No mutation may be performed")
            self.assertIsNone(body)
            self.assertEqual(route,"/wp/v2/posts")
            self.assertEqual(query.get("page"),1)
            return [{"id":1641,"slug":"old-safe-guide","status":"publish",
                     "date":"2026-11-20T14:30:38",
                     "date_gmt":latest}]
        with patch.object(m.e,"github_source",return_value="IMMUTABLE_STUB"), \
             patch.object(m.e,"sha",return_value=m.EXPECTED_SHA), \
             patch.object(m.e,"category_id",return_value=2), \
             patch.object(m.e,"check_existing",return_value=("needs_create",None)), \
             patch.object(m,"public_absence",return_value="404"), \
             patch.object(m.e,"wp",side_effect=wp) as get:
            report=m.check()
        self.assertEqual(len(requests),1)
        self.assertEqual(report["status"],"eligible")
        self.assertEqual(report["current_wp_article_absent"],True)
        self.assertEqual(report["current_wp_page_slug_absent"],True)
        self.assertEqual(report["fresh_wp_cooldown_proved"],True)
        self.assertEqual(report["source_sha256"],m.EXPECTED_SHA)
        self.assertEqual(report["current_public_status"],404)
        self.assertEqual(report["wordpress_posts_written"],0)
        self.assertFalse(report["publisher_pr_merged"])
        self.assertGreaterEqual(report["since_last_new_post_hours"],24)
        get.assert_called_once()
        return report

    def test_good_existing_control_and_old_published_post_never_write(self):
        self.run_proof("2020-01-01T00:00:00")

    def test_revision_drift_refuses_unaudited_other_publisher(self):
        self.c.write_text(json.dumps({**self.control,"activation_revision":25}))
        with patch.object(m.e,"wp",side_effect=AssertionError("must not touch WordPress")), \
             patch.object(m.e,"github_source",side_effect=AssertionError("no source read")):
            with self.assertRaises(m.e.Blocked):
                m.check()

    def test_no_duplicate_even_if_all_other_contracts_match(self):
        with patch.object(m.e,"github_source",return_value="IMMUTABLE_STUB"), \
             patch.object(m.e,"sha",return_value=m.EXPECTED_SHA), \
             patch.object(m.e,"category_id",return_value=2), \
             patch.object(m.e,"check_existing",return_value=("already_live_verified",{"id":91})), \
             patch.object(m,"public_absence",side_effect=AssertionError("should stop before public probe")):
            with self.assertRaises(m.e.Blocked):
                m.check()

    def test_source_digest_drift_blocks_before_wp_access(self):
        with patch.object(m.e,"github_source",return_value="CORRUPTED"), \
             patch.object(m.e,"sha",return_value="0"*64), \
             patch.object(m.e,"category_id",side_effect=AssertionError("no WP call")):
            with self.assertRaises(m.e.Blocked):
                m.check()

    def test_last_post_inside_24h_fails_even_if_other_probes_claim_eligible(self):
        recent=(datetime.now(timezone.utc)-timedelta(minutes=30)).strftime("%Y-%m-%dT%H:%M:%S")
        with patch.object(m.e,"github_source",return_value="IMMUTABLE_STUB"), \
             patch.object(m.e,"sha",return_value=m.EXPECTED_SHA), \
             patch.object(m.e,"category_id",return_value=2), \
             patch.object(m.e,"check_existing",return_value=("needs_create",None)), \
             patch.object(m,"public_absence",return_value="404"), \
             patch.object(m.e,"wp",return_value=[{"id":2001,"slug":"new",
                "status":"publish","date":recent,"date_gmt":recent}]):
            with self.assertRaises(m.e.Blocked):
                m.check()


if __name__=="__main__":
    unittest.main()
