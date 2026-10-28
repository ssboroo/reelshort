#!/usr/bin/env python3
"""Public page metadata only. No video extraction, cookies or access-control bypass."""
import argparse
import json
import time
from html.parser import HTMLParser
from urllib.parse import urlsplit, urlunsplit
from urllib.request import Request, urlopen
from urllib.robotparser import RobotFileParser

AGENT = 'ReelShortMNCatalog/1.0'

def canonical(value):
    u = urlsplit(value)
    if u.scheme != 'https' or u.hostname not in ('reelshort.com', 'www.reelshort.com') or u.port or u.username or u.password:
        raise ValueError('Only HTTPS reelshort.com page URLs are allowed')
    if not u.path.startswith('/movie/'):
        raise ValueError('Expected a /movie/ detail page URL')
    return urlunsplit(('https', 'www.reelshort.com', u.path.rstrip('/'), '', ''))

class Metadata(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.meta = {}; self.in_title = False; self.title = ''
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'meta':
            self.meta[(attrs.get('property') or attrs.get('name') or '').lower()] = attrs.get('content', '')
        if tag == 'title': self.in_title = True
    def handle_endtag(self, tag):
        if tag == 'title': self.in_title = False
    def handle_data(self, data):
        if self.in_title: self.title += data

def extract(html, url):
    p = Metadata(); p.feed(html)
    title = (p.meta.get('og:title') or p.title).strip()
    if not title or any(s in title.lower() for s in ['access denied', 'just a moment', 'captcha', 'forbidden']):
        raise ValueError('No usable page title; page may be blocked')
    return {'source_url': canonical(url), 'title': title[:200],
            'description': (p.meta.get('og:description') or p.meta.get('description') or '').strip()[:5000],
            'genre': 'Драм'}

def fetch_text(url, content_type):
    req = Request(url, headers={'User-Agent': AGENT, 'Accept': content_type})
    with urlopen(req, timeout=20) as r:
        # No cross-origin redirects, logins or alternate hosts.
        if urlsplit(r.url).hostname not in ('www.reelshort.com', 'reelshort.com'):
            raise ValueError('Unexpected redirect host')
        if content_type == 'text/html': canonical(r.url)
        if content_type not in r.headers.get('Content-Type', ''):
            raise ValueError('Unexpected content type')
        data = r.read(2_000_001)
        if len(data) > 2_000_000: raise ValueError('Response exceeds 2MB limit')
        return data.decode('utf-8', errors='replace')

def collect(urls, fetcher=fetch_text, pause=time.sleep):
    urls = list(dict.fromkeys(canonical(u) for u in urls))
    if not urls or len(urls) > 50: raise ValueError('Provide between 1 and 50 movie URLs')
    robots = RobotFileParser(); robots.parse(fetcher('https://www.reelshort.com/robots.txt', 'text/plain').splitlines())
    result = []
    for url in urls:
        if not robots.can_fetch(AGENT, url): raise ValueError('robots.txt disallows: ' + url)
        pause(max(2, robots.crawl_delay(AGENT) or 0))
        result.append(extract(fetcher(url, 'text/html'), url))
    return result

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('urls', help='UTF-8 file with one ReelShort /movie/ URL per line')
    parser.add_argument('--output', default='catalog.json')
    args = parser.parse_args()
    try:
        with open(args.urls, encoding='utf-8') as f: urls = [x.strip() for x in f if x.strip() and not x.startswith('#')]
        rows = collect(urls)
        # Write only after every page succeeds; do not replace existing output.
        with open(args.output, 'x', encoding='utf-8') as f: json.dump(rows, f, ensure_ascii=False, indent=2)
        print(f'Collected {len(rows)} records. Review in Admin before importing.')
    except Exception as e:
        parser.exit(1, f'Collection stopped: {e}\nNo access bypass attempted.\n')
