"""Offline publisher guarantees. NEVER uses live WordPress or GitHub in tests."""
import json
import os
import shutil
import subprocess
from datetime import datetime, timedelta, timezone
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from scripts import editorial_release as e


def article():
    lead = (
        "<p>Jak zvolit správný 12V LiFePO4 systém? "
        "Změřte denní odběr, napětí Voc a proud Isc panelů. "
        "Neexistuje univerzálně bezpečné doporučení.</p>\n"
    )
    return (
        lead * 40
        + "<h2>Technické ověření</h2><p>Voc za mrazu a Vmp za horka. "
        "Proud Isc paralelních stringů se sčítá.</p>"
        + "<p><a href='/vyber-baterii/'>Baterie</a> "
        "<a href='/mppt-kalkulacka/'>MPPT</a> "
        "<a href='/vyber-menice/'>Měnič</a></p>"
        + "<h2>Výpočet autonomie</h2><p>Výsledek je modelový.</p>"
        + "<h2>Primární zdroje</h2><p><a "
        "href='https://www.victronenergy.com/media/pg/'>Manuál výrobce</a></p>"
    )


SLUG = "solarni-panel-na-karavan-200w"


def manifest(source, *, kind="post_create"):
    m = {
        "schema_version": 1,
        "authorization": "owner_standing_editorial",
        "kind": kind,
        "operation_id": "solar-karavan-original-guide-20261107-v1",
        "slug": SLUG,
        "expected_status": "publish",
        "category_slug": "solarni-panely",
        "title": "Solární panel na karavan 200 W: baterie a MPPT bezpečně",
        "excerpt": "Co kontrolovat u solárního panelu kolem 200 W na karavanu, u LiFePO4 baterie, MPPT a skutečných parametrů panelu.",
        "source_commit": "a" * 40,
        "source_file": "content/rewrites/" + SLUG + ".html",
        "source_sha256": e.sha(source),
    }
    if kind == "post_create":
        m["expect_absent"] = True
    else:
        m.update(post_id=1618, expected_current_sha256=e.sha("OLD_BODY"),
                 expected_modified_gmt="2026-11-07T12:00:00")
    return m


def existing(content, *, id=1618):
    return {
        "id": id,
        "slug": SLUG,
        "status": "publish",
        "modified_gmt": "2026-11-07T12:00:00",
        "link": e.SITE + "/" + SLUG + "/",
        "categories": [2],
        "content": {"raw": content},
    }


class FakeWordPress:
    def __init__(self, *, existing_post=None, fail_write=False, recently_published=False,
                 missing_post_id=False, recent_pages=None):
        self.record = existing_post
        self.fail_write = fail_write
        self.recently_published = recently_published
        self.missing_post_id = missing_post_id
        self.recent_pages = recent_pages
        self.recent_get_pages = []
        self.posts = 0
        self.reads = 0

    def __call__(self, method, route, *, query=None, body=None):
        if method == "GET":
            self.reads += 1
            if route == "/wp/v2/categories":
                return [{"id": 2, "slug": "solarni-panely"}]
            if route == "/wp/v2/posts" and query and query.get("slug"):
                return [self.record] if self.record else []
            if route == "/wp/v2/pages":
                return []
            if route == "/wp/v2/posts" and query and query.get("orderby") == "date":
                assert query.get("order") == "desc"
                assert query.get("status") == "publish"
                assert query.get("per_page") == 100
                assert query.get("context") == "edit"
                assert "after" not in query and "after_gmt" not in query
                page = query["page"]
                self.recent_get_pages.append(page)
                if self.recent_pages is not None:
                    return self.recent_pages.get(page, [])
                if self.recently_published:
                    return [{"id": 9, "date": "2026-11-07T14:00:00",
                             "date_gmt": "2026-11-07T13:00:00", "status": "publish"}]
                return []
            if route.startswith("/wp/v2/posts/"):
                if self.record is None:
                    raise e.Blocked("post missing")
                return dict(self.record)
            raise AssertionError("Unexpected GET " + route)
        self.posts += 1
        if self.fail_write:
            raise e.Blocked("WP POST network unknown")
        assert route in ("/wp/v2/posts", "/wp/v2/posts/1618")
        if route == "/wp/v2/posts":
            self.record = existing(body["content"])
        else:
            assert self.record is not None
            self.record = {**self.record, "content": {"raw": body["content"]},
                           "modified_gmt": "2026-11-07T12:03:00"}
        return {} if self.missing_post_id else dict(self.record)


class PublisherTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.backup = Path(self.tmp.name) / "prewrite.json"
        self.report = Path(self.tmp.name) / "receipt.json"
        self.patches = [
            patch.object(e, "BACKUP", self.backup),
            patch.object(e, "RECEIPT", self.report),
        ]
        for item in self.patches:
            item.start()
            self.addCleanup(item.stop)
        self.html = article()
        self.m = manifest(self.html)

    def test_disabled_by_default_no_credentials_and_no_write(self):
        operation = e.load_operation()
        self.assertIsNone(operation)
        with patch.object(e, "wp", side_effect=AssertionError("no request permitted")):
            self.assertIsNone(e.load_operation())

    def test_exact_slug_source_commit_and_standing_scope_required(self):
        e.validate_manifest(self.m)
        for key, value in [
            ("source_commit", "dev"), ("source_file", "../../evil.html"),
            ("source_sha256", "0" * 63), ("authorization", "automatic_unreviewed"),
            ("category_slug", "other"), ("expected_status", "draft"),
            ("operation_id", "solar-short"),
        ]:
            bad = {**self.m, key: value}
            with self.subTest(key=key), self.assertRaises(e.Blocked):
                e.validate_manifest(bad)
        bad = {**self.m, "batch": ["post1", "post2"]}
        with self.assertRaises(e.Blocked):
            e.validate_manifest(bad)

    def test_editorial_source_is_substantial_with_safe_buyer_navigation(self):
        e.validate_html(self.html, SLUG)
        for danger in [
            "<script>alert(1)</script>",
            '<a href="javascript:alert(1)">call</a>',
            '<a href="https://ehub.cz/system/scripts/click.php?a_aid=x">track</a>',
            '<iframe src="https://other.site/x"></iframe>',
            '<img src="https://untrusted.site/image.jpg">',
            '<a href="//evil.com/a">protocol relative</a>',
            '<span onclick="send()">event handler</span>',
        ]:
            with self.subTest(danger=danger), self.assertRaises(e.Blocked):
                e.validate_html(self.html + danger, SLUG)
        with self.assertRaises(e.Blocked):
            e.validate_html("<p>thin</p>", SLUG)

    def test_new_post_requires_a_private_backup_before_exactly_one_write(self):
        wp = FakeWordPress()
        d = e.sha(e.canonical(self.m))
        with patch.object(e, "github_source", return_value=self.html), patch.object(e, "wp", new=wp):
            e.prepare(self.m, d)
            self.assertEqual(wp.posts, 0)
            self.assertTrue(self.backup.is_file())
            snapshot = json.loads(self.backup.read_text())
            self.assertEqual(snapshot["source_sha256"], e.sha(self.html))
            self.assertEqual(snapshot["prestate"], "needs_create")
            with patch.dict(os.environ, {"SOLAR_EDITORIAL_LIVE": "YES"}), patch.object(e, "public_probe", return_value="public_pending"):
                e.apply(self.m, d)
            self.assertEqual(wp.posts, 1)
            self.assertEqual(json.loads(self.report.read_text())["status"], "wp_verified")
            self.assertEqual(wp.record["content"]["raw"], self.html)
            self.assertEqual(wp.record["status"], "publish")
            self.assertEqual(wp.record["categories"], [2])
            # Repeated workflow runs are not a license for another post.
            with patch.dict(os.environ, {"SOLAR_EDITORIAL_LIVE": "YES"}):
                e.apply(self.m, d)
            self.assertEqual(wp.posts, 1)
            self.assertEqual(json.loads(self.report.read_text())["status"], "already_live_verified")

    def test_slug_collision_different_content_is_never_overwritten(self):
        wp = FakeWordPress(existing_post=existing("unrelated post body"))
        with patch.object(e, "github_source", return_value=self.html), patch.object(e, "wp", new=wp):
            with self.assertRaises(e.Blocked):
                e.prepare(self.m, e.sha(e.canonical(self.m)))
        self.assertEqual(wp.posts, 0)
        self.assertFalse(self.backup.exists())

    def test_recent_new_post_rejects_another_creating_post(self):
        wp = FakeWordPress(recently_published=True)
        with patch.object(e, "github_source", return_value=self.html), patch.object(e, "wp", new=wp):
            with self.assertRaises(e.Blocked):
                e.prepare(self.m, e.sha(e.canonical(self.m)))
        self.assertFalse(self.backup.exists())
        self.assertEqual(wp.posts, 0)


    @staticmethod
    def wp_row(identifier, date_gmt, site_local_date):
        return {"id": identifier, "date_gmt": date_gmt, "date": site_local_date,
                "status": "publish"}

    def test_cet_24h_utc_boundary_does_not_use_local_after_filter(self):
        now = datetime(2026, 11, 7, 17, 0, tzinfo=timezone.utc)
        recent = self.wp_row(99, "2026-11-06T17:30:00", "2026-11-06T18:30:00")
        wp = FakeWordPress(recent_pages={1: [recent]})
        with patch.object(e, "wp", new=wp), self.assertRaises(e.Blocked):
            e.recent_posts_gate(now_utc=now)
        self.assertEqual(wp.recent_get_pages, [1])
        old = self.wp_row(99, "2026-11-06T16:30:00", "2026-11-06T17:30:00")
        wp = FakeWordPress(recent_pages={1: [old]})
        with patch.object(e, "wp", new=wp):
            e.recent_posts_gate(now_utc=now)
        self.assertEqual(wp.recent_get_pages, [1])

    def test_cest_24h_utc_boundary_does_not_miss_earlier_local_day(self):
        now = datetime(2026, 7, 11, 12, 0, tzinfo=timezone.utc)
        recent = self.wp_row(88, "2026-07-10T12:30:00", "2026-07-10T14:30:00")
        wp = FakeWordPress(recent_pages={1: [recent]})
        with patch.object(e, "wp", new=wp), self.assertRaises(e.Blocked):
            e.recent_posts_gate(now_utc=now)
        old = self.wp_row(88, "2026-07-10T11:30:00", "2026-07-10T13:30:00")
        with patch.object(e, "wp", new=FakeWordPress(recent_pages={1: [old]})):
            e.recent_posts_gate(now_utc=now)

    def test_autumn_dst_backshift_does_not_open_second_publication_slot(self):
        # Prague jumps from +02:00 to +01:00 on 2026-10-25.
        # The comparisons must depend ONLY on UTC date_gmt.
        now = datetime(2026, 10, 25, 1, 30, tzinfo=timezone.utc)
        recent = self.wp_row(77, "2026-10-24T01:45:00", "2026-10-24T03:45:00")
        with patch.object(e, "wp", new=FakeWordPress(recent_pages={1: [recent]})), self.assertRaises(e.Blocked):
            e.recent_posts_gate(now_utc=now)
        old = self.wp_row(77, "2026-10-24T01:00:00", "2026-10-24T03:00:00")
        with patch.object(e, "wp", new=FakeWordPress(recent_pages={1: [old]})):
            e.recent_posts_gate(now_utc=now)

    def test_paginates_over_100_posts_without_trusting_first_page(self):
        # 120 posts published 25-50 hours ago. The first page is FULL,
        # but its last local date is still inside the conservative UTC
        # ordering margin. The gate must read page 2 (not assume 100 is all).
        now = datetime(2026, 11, 7, 17, 0, tzinfo=timezone.utc)
        one = [self.wp_row(i + 1, "2026-11-06T16:00:00",
                           "2026-11-06T17:00:00") for i in range(100)]
        two = [self.wp_row(i + 101, "2026-11-05T09:00:00",
                           "2026-11-05T10:00:00") for i in range(20)]
        wp = FakeWordPress(recent_pages={1: one, 2: two})
        with patch.object(e, "wp", new=wp):
            e.recent_posts_gate(now_utc=now)
        self.assertEqual(wp.recent_get_pages, [1, 2])

    def test_more_than_100_recent_posts_blocks_publication(self):
        now = datetime(2026, 11, 7, 17, 0, tzinfo=timezone.utc)
        recent = [self.wp_row(i+1, "2026-11-07T12:00:00",
                              "2026-11-07T13:00:00") for i in range(100)]
        older = [self.wp_row(101, "2026-11-06T10:00:00",
                             "2026-11-06T11:00:00")]
        wp = FakeWordPress(recent_pages={1: recent, 2: older})
        with patch.object(e, "wp", new=wp), self.assertRaises(e.Blocked):
            e.recent_posts_gate(now_utc=now)
        self.assertEqual(wp.recent_get_pages, [1])

    def test_invalid_gmt_absent_gmt_and_unsorted_pages_fail_closed(self):
        now = datetime(2026, 11, 7, 17, 0, tzinfo=timezone.utc)
        for invalid in (None, "", "2026-11-31T01:00:00", "2026-11-06T10:00:00+02:00"):
            with self.subTest(gmt=invalid):
                wp = FakeWordPress(recent_pages={
                    1: [self.wp_row(4, invalid, "2026-11-06T11:00:00")]
                })
                with patch.object(e, "wp", new=wp), self.assertRaises(e.Blocked):
                    e.recent_posts_gate(now_utc=now)
        wrong = [self.wp_row(1, "2026-11-06T09:00:00", "2026-11-06T11:00:00"),
                 self.wp_row(2, "2026-11-06T08:00:00", "2026-11-06T13:00:00")]
        with patch.object(e, "wp", new=FakeWordPress(recent_pages={1: wrong})), self.assertRaises(e.Blocked):
            e.recent_posts_gate(now_utc=now)

    def test_truncated_rest_page_or_nonterminating_pagination_is_blocked(self):
        now = datetime(2026, 11, 7, 17, 0, tzinfo=timezone.utc)
        too_many = [self.wp_row(i+1, "2026-11-06T16:00:00",
                                "2026-11-06T17:00:00") for i in range(101)]
        with patch.object(e, "wp", new=FakeWordPress(recent_pages={1: too_many})), self.assertRaises(e.Blocked):
            e.recent_posts_gate(now_utc=now)
        full = too_many[:100]
        wp = FakeWordPress(recent_pages={i: full for i in range(1, 31)})
        with patch.object(e, "wp", new=wp), self.assertRaises(e.Blocked):
            e.recent_posts_gate(now_utc=now)
        self.assertEqual(wp.recent_get_pages[-1], 30)

    def test_existing_post_requires_exact_hash_and_modified_before_an_edit(self):
        m = manifest(self.html, kind="post_update")
        wp = FakeWordPress(existing_post=existing("OLD_BODY"))
        with patch.object(e, "github_source", return_value=self.html), patch.object(e, "wp", new=wp):
            e.prepare(m, e.sha(e.canonical(m)))
            self.assertEqual(wp.posts, 0)
            wp.record["content"]["raw"] = "OTHER_EDITOR_CHANGED"
            with patch.dict(os.environ, {"SOLAR_EDITORIAL_LIVE": "YES"}), self.assertRaises(e.Blocked):
                e.apply(m, e.sha(e.canonical(m)))
        self.assertEqual(wp.posts, 0, "Never overwrite a live editor after original-content drift")

    def test_exact_existing_post_update_is_one_post_and_repeat_is_zero(self):
        m = manifest(self.html, kind="post_update")
        wp = FakeWordPress(existing_post=existing("OLD_BODY"))
        d = e.sha(e.canonical(m))
        with patch.object(e, "github_source", return_value=self.html), patch.object(e, "wp", new=wp):
            e.prepare(m, d)
            with patch.dict(os.environ, {"SOLAR_EDITORIAL_LIVE": "YES"}), patch.object(e, "public_probe", return_value="public_pending"):
                e.apply(m, d)
                e.apply(m, d)
        self.assertEqual(wp.posts, 1)
        self.assertEqual(e.sha(wp.record["content"]["raw"]), m["source_sha256"])

    def test_ambiguous_post_response_must_never_be_retried(self):
        wp = FakeWordPress(fail_write=True)
        d = e.sha(e.canonical(self.m))
        with patch.object(e, "github_source", return_value=self.html), patch.object(e, "wp", new=wp):
            e.prepare(self.m, d)
            with patch.dict(os.environ, {"SOLAR_EDITORIAL_LIVE": "YES"}), self.assertRaises(e.Blocked):
                e.apply(self.m, d)
        self.assertEqual(wp.posts, 1)
        self.assertEqual(json.loads(self.report.read_text())["status"], "outcome_unknown_do_not_retry")


    def test_post_without_response_id_is_uncertain_even_if_wordpress_wrote(self):
        wp = FakeWordPress(missing_post_id=True)
        d = e.sha(e.canonical(self.m))
        with patch.object(e, "github_source", return_value=self.html), patch.object(e, "wp", new=wp):
            e.prepare(self.m, d)
            with patch.dict(os.environ, {"SOLAR_EDITORIAL_LIVE": "YES"}), self.assertRaises(e.Blocked):
                e.apply(self.m, d)
        self.assertEqual(wp.posts, 1, "Server made exactly one WordPress write")
        self.assertIsNotNone(wp.record, "The actual server-side content may have been published")
        receipt = json.loads(self.report.read_text())
        self.assertEqual(receipt["status"], "outcome_unknown_do_not_retry")
        self.assertEqual(receipt["writes_attempted"], 1)
        self.assertEqual(receipt["reason"], "missing_post_id")

    def test_workflow_secret_scope_and_artifact_order(self):
        source = (e.ROOT / ".github/workflows/solar-editorial-publisher.yml").read_text()
        self.assertIn("branches: [main]", source)
        self.assertIn("cancel-in-progress: false", source)
        self.assertIn("persist-credentials: false", source)
        self.assertIn("github.event_name == 'push'", source)
        self.assertIn("github.run_attempt == 1", source)
        self.assertIn("steps.activation.outputs.armed == 'true'", source)
        self.assertIn("git diff --name-only", source)
        self.assertIn("ops/editorial-release.json", source)
        self.assertIn("fetch-depth: 0", source)
        self.assertIn("steps.prepare.outputs.status == 'prepared'", source)
        self.assertIn("retention-days: 30", source)
        encrypt = source.index("name: Encrypt PREWRITE snapshot")
        upload = source.index("name: Archive ENCRYPTED PREWRITE WordPress snapshot")
        write = source.index("name: ONE guarded WordPress REST write")
        self.assertLess(encrypt, upload)
        self.assertLess(upload, write)
        self.assertIn("openssl enc -aes-256-cbc -salt -pbkdf2 -iter 200000 -md sha256", source)
        self.assertIn("-pass env:SOLAR_WP_APP_PASSWORD", source)
        self.assertIn("path: artifacts/editorial-prewrite-private.enc", source[upload:write])
        self.assertNotIn("path: artifacts/editorial-prewrite-private.json", source[upload:write])
        self.assertIn("if-no-files-found: error", source[upload:write])
        self.assertNotIn("wpvibe", source.lower())
        # Avoid secrets on checkout, offline tests or job-wide environment.
        self.assertGreater(source.index("SOLAR_WP_APP_PASSWORD"), source.index("name: Exact Git source"))


    def test_public_repository_artifact_encryption_roundtrip(self):
        if not shutil.which("openssl"):
            self.skipTest("OpenSSL CLI is required on the Github Actions Ubuntu runner")
        original = b'{"original_content":"PRIVATE_OLD_WP_BODY_DO_NOT_EXPOSE","source_body":"PUBLIC_ARTICLE"}'
        original_file = Path(self.tmp.name) / "prewrite-private.json"
        encrypted_file = Path(self.tmp.name) / "prewrite-private.enc"
        recovered_file = Path(self.tmp.name) / "recovered.json"
        original_file.write_bytes(original)
        key_environment = {**os.environ, "SOLAR_WP_APP_PASSWORD": "fake-test-password-only"}
        options = ["-aes-256-cbc", "-salt", "-pbkdf2", "-iter", "200000",
                   "-md", "sha256"]
        subprocess.run(["openssl", "enc", *options, "-in", str(original_file),
                        "-out", str(encrypted_file), "-pass", "env:SOLAR_WP_APP_PASSWORD"],
                       check=True, env=key_environment, capture_output=True)
        ciphertext = encrypted_file.read_bytes()
        self.assertTrue(ciphertext.startswith(b"Salted__"))
        self.assertNotIn(b"PRIVATE_OLD_WP_BODY_DO_NOT_EXPOSE", ciphertext)
        self.assertNotIn(b"PUBLIC_ARTICLE", ciphertext)
        subprocess.run(["openssl", "enc", "-d", *options,
                        "-in", str(encrypted_file), "-out", str(recovered_file),
                        "-pass", "env:SOLAR_WP_APP_PASSWORD"],
                       check=True, env=key_environment, capture_output=True)
        self.assertEqual(recovered_file.read_bytes(), original)


if __name__ == "__main__":
    unittest.main()
