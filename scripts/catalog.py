#!/usr/bin/env python3
"""Collect public ReelShort catalog metadata only; never download or extract video files."""
import argparse
import json
import re
import time
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from urllib.parse import urlsplit, urlunsplit
from urllib.request import Request, urlopen
from urllib.robotparser import RobotFileParser

AGENT = 'ReelShortMNCatalog/1.0'
HOSTS = ('reelshort.com', 'www.reelshort.com')


def canonical(value):
    u = urlsplit(value)
    if u.scheme != 'https' or u.hostname not in HOSTS or u.port or u.username or u.password:
        raise ValueError('Only HTTPS reelshort.com page URLs are allowed')
    if not u.path.startswith('/movie/'):
        raise ValueError('Expected a /movie/ detail page URL')
    return urlunsplit(('https', 'www.reelshort.com', u.path.rstrip('/'), '', ''))


class Metadata(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.meta = {}
        self.in_title = False
        self.title = ''

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'meta':
            self.meta[(attrs.get('property') or attrs.get('name') or '').lower()] = attrs.get('content', '')
        if tag == 'title':
            self.in_title = True

    def handle_endtag(self, tag):
        if tag == 'title':
            self.in_title = False

    def handle_data(self, data):
        if self.in_title:
            self.title += data


def extract(html, url):
    p = Metadata()
    p.feed(html)
    title = (p.meta.get('og:title') or p.title).strip()
    if not title or any(s in title.lower() for s in ('access denied', 'just a moment', 'captcha', 'forbidden')):
        raise ValueError('No usable page title; page may be blocked')
    row = {
        'source_url': canonical(url),
        'title': title[:200],
        'description': (p.meta.get('og:description') or p.meta.get('description') or '').strip()[:5000],
        'genre': 'Драм',
    }
    image = (p.meta.get('og:image') or p.meta.get('twitter:image') or '').strip()
    if image.startswith('https://') and not any(c.isspace() for c in image):
        row['cover_url'] = image[:2000]

    # Read only public metadata embedded in the page. Never inspect video/source URLs.
    match = re.search(r'<script[^>]+id=["\']__NEXT_DATA__["\'][^>]*>(.*?)</script>', html, re.S)
    if match:
        try:
            props = json.loads(match.group(1)).get('props', {}).get('pageProps', {})
            data = props.get('data', {}) if isinstance(props, dict) else {}
            if isinstance(data, dict):
                if data.get('book_id') is not None:
                    row['book_id'] = str(data['book_id'])[:100]
                if data.get('total') is not None and str(data['total']).isdigit():
                    row['chapter_count'] = max(0, min(1000, int(data['total'])))
                if data.get('paid_start') is not None and str(data['paid_start']).isdigit():
                    row['first_paid_episode'] = max(0, min(1000, int(data['paid_start'])))
                cover = data.get('book_pic')
                if isinstance(cover, str) and cover.startswith('https://') and not any(c.isspace() for c in cover):
                    row['cover_url'] = cover[:2000]
        except (json.JSONDecodeError, TypeError, AttributeError, ValueError):
            pass
    return row


def fetch_text(url, content_type):
    req = Request(url, headers={'User-Agent': AGENT, 'Accept': content_type})
    with urlopen(req, timeout=20) as response:
        if urlsplit(response.url).hostname not in HOSTS:
            raise ValueError('Unexpected redirect host')
        if content_type == 'text/html':
            canonical(response.url)
        actual_type = response.headers.get('Content-Type', '').lower()
        xml_ok = content_type in ('application/xml', 'text/xml') and ('application/xml' in actual_type or 'text/xml' in actual_type)
        if content_type not in actual_type and not xml_ok:
            raise ValueError('Unexpected content type')
        data = response.read(2_000_001)
        if len(data) > 2_000_000:
            raise ValueError('Response exceeds 2MB limit')
        return data.decode('utf-8', errors='replace')


def read_robots(fetcher=fetch_text):
    text = fetcher('https://www.reelshort.com/robots.txt', 'text/plain')
    parser = RobotFileParser()
    parser.parse(text.splitlines())
    return parser, text


def sitemap_urls(xml_text):
    """Return sitemap or movie URLs from a public sitemap XML document."""
    try:
        root = ET.fromstring(xml_text)
    except ET.ParseError as exc:
        raise ValueError('Sitemap XML is invalid') from exc
    found = []
    for node in root.iter():
        if node.tag.rsplit('}', 1)[-1] == 'loc' and node.text:
            value = node.text.strip()
            if value.startswith('https://') and urlsplit(value).hostname in HOSTS:
                found.append(value)
    return found


def discover_urls(limit=1000, fetcher=fetch_text, pause=time.sleep):
    """Discover movie detail URLs from sitemaps explicitly listed by robots.txt."""
    if not 1 <= limit <= 10000:
        raise ValueError('Limit must be between 1 and 10000')
    robots, robots_text = read_robots(fetcher)
    sitemap_links = re.findall(r'(?im)^\s*sitemap:\s*(https://\S+)\s*$', robots_text)
    if not sitemap_links:
        raise ValueError('robots.txt did not advertise a sitemap; supply URLs manually')
    queue = list(dict.fromkeys(sitemap_links))
    visited = set()
    movies = []
    while queue and len(movies) < limit:
        sitemap = queue.pop(0)
        if sitemap in visited:
            continue
        visited.add(sitemap)
        if urlsplit(sitemap).hostname not in HOSTS or not robots.can_fetch(AGENT, sitemap):
            continue
        pause(max(2, robots.crawl_delay(AGENT) or 0))
        xml_text = fetcher(sitemap, 'application/xml')
        for value in sitemap_urls(xml_text):
            if urlsplit(value).path.lower().endswith(('.xml', '.xml.gz')):
                if value not in visited and len(queue) < 1000:
                    queue.append(value)
            elif '/movie/' in urlsplit(value).path:
                try:
                    url = canonical(value)
                except ValueError:
                    continue
                if robots.can_fetch(AGENT, url) and url not in movies:
                    movies.append(url)
                    if len(movies) >= limit:
                        break
    if not movies:
        raise ValueError('No permitted /movie/ URLs found in the advertised sitemaps')
    return movies


def collect(urls, fetcher=fetch_text, pause=time.sleep):
    urls = list(dict.fromkeys(canonical(u) for u in urls))
    if not urls or len(urls) > 10000:
        raise ValueError('Provide between 1 and 10000 movie URLs')
    robots, _ = read_robots(fetcher)
    result = []
    for url in urls:
        if not robots.can_fetch(AGENT, url):
            raise ValueError('robots.txt disallows: ' + url)
        pause(max(2, robots.crawl_delay(AGENT) or 0))
        result.append(extract(fetcher(url, 'text/html'), url))
    return result


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('urls', nargs='?', help='UTF-8 file with one ReelShort /movie/ URL per line')
    parser.add_argument('--discover', action='store_true', help='discover movie URLs from sitemaps listed in robots.txt')
    parser.add_argument('--limit', type=int, default=1000, help='maximum URLs to discover (1–10000)')
    parser.add_argument('--output', default='catalog.json')
    args = parser.parse_args()
    try:
        if args.discover:
            urls = discover_urls(args.limit)
        elif args.urls:
            with open(args.urls, encoding='utf-8') as file:
                urls = [line.strip() for line in file if line.strip() and not line.startswith('#')]
        else:
            parser.error('provide urls.txt or use --discover')
        rows = collect(urls)
        # Exclusive creation prevents accidental replacement of a previous catalog.
        with open(args.output, 'x', encoding='utf-8') as file:
            json.dump(rows, file, ensure_ascii=False, indent=2)
        print(f'Collected {len(rows)} public metadata records. Review them before importing.')
    except Exception as exc:
        parser.exit(1, f'Collection stopped: {exc}\nNo access-control bypass attempted.\n')
