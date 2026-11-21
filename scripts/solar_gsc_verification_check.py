"""Read-only check of the site-owner verification tag in public HTML <head>.

Visible markup does not grant Search Console API access or prove indexing.
"""
import json
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.request import Request, urlopen

URL = "https://solar-expert.cz/"
TOKEN = "hujCeWvQvCEarTLarASc5xPutIKgcKaCbd92LTHvpTY"
OUTPUT = Path("artifacts/solar-gsc-meta-readonly.json")


class MetaCounter(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.in_head = False
        self.head_seen = False
        self.head_closed = False
        self.total_tags = 0
        self.exact_matches = 0

    def handle_starttag(self, tag, attrs):
        name = tag.lower()
        if name == "head" and not self.head_closed:
            self.in_head = self.head_seen = True
        if name == "meta" and self.in_head:
            data = {str(k).lower(): v for k, v in attrs}
            if (data.get("name") or "").lower() == "google-site-verification":
                self.total_tags += 1
                if data.get("content") == TOKEN:
                    self.exact_matches += 1

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)

    def handle_endtag(self, tag):
        if tag.lower() == "head":
            self.in_head = False
            self.head_closed = True


def inspect_html(html):
    counter = MetaCounter()
    counter.feed(html)
    return {
        "head_present": counter.head_seen and counter.head_closed,
        "exact_matching_tags_in_head": counter.exact_matches,
        "total_google_verification_tags_in_head": counter.total_tags,
        "verified_on_live_html": counter.head_seen and counter.head_closed and counter.exact_matches == 1,
    }


def read_live():
    result = {
        "schema_version": 1,
        "site": URL,
        "checked_at_utc": datetime.now(timezone.utc).isoformat(),
        "measurement": "public_html_owner_tag_not_google_search_console_api",
        "writes": 0,
        "theme_deploy_authorized": False,
        "verification_status": "unavailable",
        "head_present": None,
        "exact_matching_tags_in_head": None,
        "total_google_verification_tags_in_head": None,
        "verified_on_live_html": False,
    }
    try:
        request = Request(URL, headers={"User-Agent": "SolarExpert-GSC-ReadOnly/1.0", "Accept": "text/html"})
        with urlopen(request, timeout=18) as response:
            if response.status != 200 or response.url != URL:
                return result
            if "text/html" not in response.headers.get("Content-Type", "").lower():
                return result
            data = response.read(2_000_001)
        if len(data) > 2_000_000:
            return result
        observed = inspect_html(data.decode("utf-8", errors="replace"))
        result.update(observed)
        result["verification_status"] = "tag_present" if observed["verified_on_live_html"] else "tag_missing_or_not_in_head"
    except (OSError, ValueError, UnicodeError):
        pass
    return result


def main():
    result = read_live()
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(result, sort_keys=True, indent=2) + "\n", encoding="utf-8")
    print("SOLAR_GSC_META status=" + result["verification_status"] +
          " exact=" + str(result["exact_matching_tags_in_head"]) +
          " writes=0; API authorization not checked")


if __name__ == "__main__":
    main()
