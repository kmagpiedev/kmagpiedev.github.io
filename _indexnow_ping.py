# -*- coding: utf-8 -*-
"""IndexNow ping: sitemap.xml의 모든 URL을 빙(IndexNow)에 제출.

사용법: 배포(push) 후에 실행
    python _indexnow_ping.py

특정 URL만 제출하고 싶으면:
    python _indexnow_ping.py https://www.kmagpie.com/tools/salary/
"""
import json
import sys
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

HOST = "www.kmagpie.com"
KEY = "50ff0413848d4f87a07354db31545c48"
KEY_LOCATION = f"https://{HOST}/{KEY}.txt"
SITEMAP = Path(__file__).with_name("sitemap.xml")
ENDPOINT = "https://api.indexnow.org/indexnow"


def sitemap_urls():
    ns = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    root = ET.parse(SITEMAP).getroot()
    return [el.text.strip() for el in root.findall("sm:url/sm:loc", ns) if el.text]


def main():
    urls = sys.argv[1:] or sitemap_urls()
    if not urls:
        print("제출할 URL이 없습니다.")
        return
    payload = {
        "host": HOST,
        "key": KEY,
        "keyLocation": KEY_LOCATION,
        "urlList": urls[:10000],
    }
    req = urllib.request.Request(
        ENDPOINT,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json; charset=utf-8"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as res:
            print(f"IndexNow 제출 완료: {len(urls)}개 URL (HTTP {res.status})")
    except urllib.error.HTTPError as e:
        print(f"제출 실패: HTTP {e.code} - {e.read().decode('utf-8', 'ignore')}")


if __name__ == "__main__":
    main()
