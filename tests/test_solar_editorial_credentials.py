"""Offline validation of credential smoke-check GET-only behavior."""
import io
import json
from contextlib import redirect_stdout
from unittest import TestCase, main
from unittest.mock import patch
from urllib import error

from scripts import editorial_credentials_check as c


class Response:
    status = 200
    def __init__(self, payload):
        self.payload = payload
    def __enter__(self):
        return self
    def __exit__(self, *args):
        return False
    def read(self, size):
        return json.dumps(self.payload).encode()


class FakeOpener:
    def __init__(self, *, capabilities=None, fail_http=None):
        self.methods = []
        self.capabilities = capabilities or {
            "edit_posts": True,
            "publish_posts": True,
            "edit_others_posts": True,
        }
        self.fail_http = fail_http
    def open(self, req, timeout=20):
        self.methods.append(req.get_method())
        assert req.full_url.startswith("https://solar-expert.cz/wp-json/wp/v2/")
        if self.fail_http is not None:
            raise error.HTTPError(req.full_url, self.fail_http, "test", None, None)
        if "/users/me" in req.full_url:
            return Response({"id": 12, "capabilities": self.capabilities})
        if "/categories" in req.full_url:
            return Response([{"id": 2, "slug": "solarni-panely"}])
        if "/posts/1618" in req.full_url:
            return Response({"id": 1618, "slug": "solarni-panel-na-karavan-200w", "content": {"raw": "<p>safe</p>"}})
        raise AssertionError("Unexpected route")


class ReadinessTest(TestCase):
    def call(self, opener, creds=True):
        out = io.StringIO()
        env = {"SOLAR_WP_USER": "editor_test", "SOLAR_WP_APP_PASSWORD": "private-test-value"}
        if not creds:
            env = {"SOLAR_WP_USER": "", "SOLAR_WP_APP_PASSWORD": ""}
        with patch.dict("os.environ", env), patch.object(c.request, "build_opener", return_value=opener), redirect_stdout(out):
            code = c.main()
        return code, out.getvalue()

    def test_readiness_only_gets_and_never_echoes_secrets(self):
        wp = FakeOpener()
        code, report = self.call(wp)
        self.assertEqual(code, 0)
        self.assertEqual(wp.methods, ["GET", "GET", "GET"])
        self.assertIn("status=ready", report)
        self.assertIn("writes=0", report)
        self.assertNotIn("private-test-value", report)
        self.assertNotIn("editor_test", report)

    def test_missing_password_does_not_make_request(self):
        wp = FakeOpener()
        code, report = self.call(wp, creds=False)
        self.assertEqual(code, 2)
        self.assertEqual(wp.methods, [])
        self.assertIn("status=configuration_missing", report)

    def test_non_editor_cannot_pass(self):
        wp = FakeOpener(capabilities={"edit_posts": True, "publish_posts": False})
        code, report = self.call(wp)
        self.assertEqual(code, 3)
        self.assertEqual(wp.methods, ["GET"])
        self.assertIn("insufficient_editor_permissions", report)

    def test_http_denial_cannot_pass(self):
        wp = FakeOpener(fail_http=401)
        code, report = self.call(wp)
        self.assertEqual(code, 6)
        self.assertEqual(wp.methods, ["GET"])
        self.assertIn("status=http_401", report)


if __name__ == "__main__":
    main()
