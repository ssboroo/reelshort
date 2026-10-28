import importlib.util
import unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location('catalog',Path(__file__).parents[1]/'scripts/catalog.py')
c=importlib.util.module_from_spec(spec);spec.loader.exec_module(c)
URL='https://www.reelshort.com/movie/example-123'
class CatalogTests(unittest.TestCase):
 def test_metadata_entities_and_no_video(self):
  row=c.extract('<meta content="A &amp; B" property="og:title"><meta name="description" content="Story"><video src="secret.mp4"></video>',URL)
  self.assertEqual(row['title'],'A & B');self.assertEqual(row['description'],'Story');self.assertNotIn('video_url',row)
 def test_title_fallback(self):self.assertEqual(c.extract('<title>Film</title>',URL)['title'],'Film')
 def test_invalid_urls(self):
  for url in ['http://www.reelshort.com/movie/a','https://evil.test/movie/a','https://www.reelshort.com@evil.test/movie/a','https://www.reelshort.com/login','https://www.reelshort.com:8443/movie/a']:
   with self.assertRaises(ValueError):c.canonical(url)
 def test_canonical(self):self.assertEqual(c.canonical(URL+'/?utm=x#foo'),URL)
 def test_block_page(self):
  with self.assertRaises(ValueError):c.extract('<title>Just a moment...</title>',URL)
 def test_robots_denied_no_page_fetch(self):
  calls=[]
  def fake(url,kind):calls.append(url);return 'User-agent: *\nDisallow: /movie/'
  with self.assertRaises(ValueError):c.collect([URL],fake,lambda _:None)
  self.assertEqual(len(calls),1)
 def test_dedupe_and_delay(self):
  calls=[];delays=[]
  def fake(url,kind):calls.append(url);return 'User-agent: *\nAllow: /\nCrawl-delay: 5' if kind=='text/plain' else '<title>Movie</title>'
  self.assertEqual(len(c.collect([URL,URL+'?a=b'],fake,delays.append)),1)
  self.assertEqual(delays,[5]);self.assertEqual(len(calls),2)
 def test_network_error_stops(self):
  def fake(url,kind):raise RuntimeError('HTTP 403')
  with self.assertRaises(RuntimeError):c.collect([URL],fake,lambda _:None)
if __name__=='__main__':unittest.main()
