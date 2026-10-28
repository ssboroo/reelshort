import {load} from 'cheerio';
import {movieURL} from './metadata.mjs';

// 403-ийн гол шалтгаан: бот UA. Браузер UA болгоно.
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const HDR = {'User-Agent': UA, Accept: 'text/html', 'Accept-Language': 'en-US,en;q=0.9'};

async function read(url, fetcher = fetch) {
  const res = await fetcher(url, {
    redirect: 'follow', signal: AbortSignal.timeout(12000), headers: HDR,
  });
  if (!res.ok) throw new Error(`Эх сайт HTTP ${res.status} хариу өглөө.`);
  const reader = res.body.getReader(); let size = 0; const chunks = [];
  try { for (;;) { const {done, value} = await reader.read(); if (done) break;
    size += value.length; if (size > 3_000_000) throw new Error('Хуудасны хэмжээ хэтэрсэн.');
    chunks.push(value); } } finally { await reader.cancel(); }
  return Buffer.concat(chunks).toString('utf8');
}

function nextData(html) {
  const m = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  return m ? JSON.parse(m[1]) : null;
}

export const bookIdOf = (v) => (v.match(/([0-9a-f]{24})(?:\/)?$/) || [])[1] || null;

/* Цуврал: book_id-ээс л бүх анги. slug шаардлагагүй. */
export async function series(bookId, fetcher = fetch) {
  const html = await read(`https://www.reelshort.com/movie/${bookId}`, fetcher);
  const d = nextData(html)?.props?.pageProps?.data;
  if (!d?.book_id) throw new Error('Хуудлын бүтэц өөрчлөгдсөн байна.');
  const slug = (html.match(/<link rel="canonical" href="[^"]*\/movie\/([^"]+)"/) || [])[1]
    ?.replace(`-${bookId}`, '') || '';
  return {
    book_id: d.book_id, title: d.book_title, cover: d.book_pic,
    description: String(d.special_desc || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 5000),
    tags: (d.tag_list || []).map((t) => t.text), total: d.total,
    paid_start: d.paid_start, slug,
    chapters: (d.online_base || []).map((c) => ({
      n: c.serial_number, id: c.chapter_id, thumb: c.video_pic,
      trailer: c.chapter_type === 2, paid: c.serial_number >= (d.paid_start || 1e9),
    })),
  };
}

/* Анги: тоглуулах линкийг ЗӨВХӨН энэ үед шийднэ. */
export async function episode(bookId, n, fetcher = fetch) {
  const s = await series(bookId, fetcher);
  const ch = s.chapters.find((c) => c.n === n) || s.chapters.find((c) => c.trailer);
  if (!ch) throw new Error('Анги олдсонгүй.');
  const path = ch.trailer
    ? `/episodes/trailer-${s.slug}-${bookId}-${ch.id}`
    : `/episodes/episode-${ch.n}-${s.slug}-${bookId}-${ch.id}`;
  const html = await read('https://www.reelshort.com' + path, fetcher);
  const $ = load(html);
  const q = {};
  $('li.option-item').each((_, el) => {
    const u = $(el).attr('url'), def = $(el).attr('definition');
    if (u && def) q[def] = u;
  });
  if (!Object.keys(q).length) {
    const v = html.match(/"video_url":"([^"]+)"/);
    if (v) q['720P'] = v[1];
  }
  if (!Object.keys(q).length) throw new Error('Видео линк олдсонгүй.');
  return {title: s.title, n, chapter_id: ch.id, qualities: q};
}

export const proxy = (u) => `/api/stream?src=${Buffer.from(u).toString('base64url')}`;
