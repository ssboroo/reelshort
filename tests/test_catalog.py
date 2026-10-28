import importlib.util
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location('catalog', Path(__file__).parents[1] / 'scripts/catalog.py')
c = importlib.util.module_from_spec(spec)
spec.loader.exec_module(c)
URL = 'https://www.reelshort.com/movie/example-123'


class CatalogTests(unittest.TestCase):
    def test_metadata_entities_and_no_video(self):
        row = c.extract('<meta content="A &amp; B" property="og:title"><meta name="description" content="Story"><meta property="og:image" content="https://cdn.example/poster.jpg"><video src="secret.mp4"></video>', URL)
        self.assertEqual(row['title'], 'A & B')
        self.assertEqual(row['description'], 'Story')
        self.assertEqual(row['cover_url'], 'https://cdn.example/poster.jpg')
        self.assertNotIn('video_url', row)

    def test_public_next_data_episode_counts_and_cover(self):
        html = '''<title>Movie</title><script id="__NEXT_DATA__" type="application/json">{"props":{"pageProps":{"data":{"book_id":"abc123","total":42,"paid_start":8,"book_pic":"https://cdn.example/cover.jpg","online_base":[{"chapter_id":"private-id"}]}}}}</script>'''
        row = c.extract(html, URL)
        self.assertEqual(row['book_id'], 'abc123')
        self.assertEqual(row['chapter_count'], 42)
        self.assertEqual(row['first_paid_episode'], 8)
        self.assertEqual(row['cover_url'], 'https://cdn.example/cover.jpg')
        self.assertNotIn('chapters', row)
        self.assertNotIn('video_url', row)

    def test_title_fallback(self):
        self.assertEqual(c.extract('<title>Film</title>', URL)['title'], 'Film')

    def test_invalid_urls(self):
        for url in ['http://www.reelshort.com/movie/a', 'https://evil.test/movie/a', 'https://www.reelshort.com@evil.test/movie/a', 'https://www.reelshort.com/login', 'https://www.reelshort.com:8443/movie/a']:
            with self.assertRaises(ValueError):
                c.canonical(url)

    def test_canonical(self):
        self.assertEqual(c.canonical(URL + '/?utm=x#foo'), URL)

    def test_block_page(self):
        with self.assertRaises(ValueError):
            c.extract('<title>Just a moment...</title>', URL)

    def test_sitemap_xml_parsing_filters_external_hosts(self):
        xml = '''<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://www.reelshort.com/movie/one</loc></url><url><loc>https://evil.test/movie/no</loc></url></urlset>'''
        self.assertEqual(c.sitemap_urls(xml), ['https://www.reelshort.com/movie/one'])

    def test_sitemap_discovery_obeys_robots_and_delay(self):
        calls = []
        delays = []
        def fake(url, kind):
            calls.append((url, kind))
            if url.endswith('/robots.txt'):
                return 'User-agent: *\nAllow: /\nCrawl-delay: 3\nSitemap: https://www.reelshort.com/sitemap.xml'
            if url.endswith('/sitemap.xml'):
                return '<urlset><url><loc>https://www.reelshort.com/movie/one</loc></url><url><loc>https://evil.test/movie/no</loc></url></urlset>'
            if url.endswith('/movie/one'):
                return '<title>One</title>'
            raise AssertionError(url)
        urls = c.discover_urls(limit=5, fetcher=fake, pause=delays.append)
        self.assertEqual(urls, ['https://www.reelshort.com/movie/one'])
        self.assertEqual(delays, [3])
        rows = c.collect(urls, fetcher=fake, pause=delays.append)
        self.assertEqual(rows[0]['title'], 'One')
        self.assertEqual(delays[-1], 3)

    def test_sitemap_discovery_requires_advertised_sitemap(self):
        def fake(url, kind):
            return 'User-agent: *\nAllow: /' if url.endswith('/robots.txt') else ''
        with self.assertRaisesRegex(ValueError, 'did not advertise'):
            c.discover_urls(fetcher=fake, pause=lambda _: None)

    def test_robots_denied_no_page_fetch(self):
        calls = []
        def fake(url, kind):
            calls.append(url)
            return 'User-agent: *\nDisallow: /movie/'
        with self.assertRaises(ValueError):
            c.collect([URL], fake, lambda _: None)
        self.assertEqual(len(calls), 1)

    def test_dedupe_and_delay(self):
        calls = []
        delays = []
        def fake(url, kind):
            calls.append(url)
            return 'User-agent: *\nAllow: /\nCrawl-delay: 5' if kind == 'text/plain' else '<title>Movie</title>'
        self.assertEqual(len(c.collect([URL, URL + '?a=b'], fake, delays.append)), 1)
        self.assertEqual(delays, [5])
        self.assertEqual(len(calls), 2)

    def test_network_error_stops(self):
        def fake(url, kind):
            raise RuntimeError('HTTP 403')
        with self.assertRaises(RuntimeError):
            c.collect([URL], fake, lambda _: None)


if __name__ == '__main__':
    unittest.main()
