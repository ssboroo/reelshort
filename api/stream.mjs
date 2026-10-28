import {series, episode, proxy, bookIdOf} from '../server/reelshort.mjs';

export const maxDuration = 30;

export default { async fetch(req) {
  const u = new URL(req.url);
  const src = u.searchParams.get('src');

  /* --- HLS proxy: m3u8 дахин бичих + .ts дамжуулах --- */
  if (src) {
    const target = Buffer.from(src, 'base64url').toString('utf8');
    const isPlaylist = /\.m3u8(\?|$)/.test(target);
    const up = await fetch(target, {
      headers: {'User-Agent': 'Mozilla/5.0', Referer: 'https://www.reelshort.com/',
                ...(req.headers.get('Range') ? {Range: req.headers.get('Range')} : {})},
    });
    const h = new Headers(up.headers);
    h.set('Access-Control-Allow-Origin', '*');
    h.set('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges');
    h.set('Cache-Control', isPlaylist
      ? 'public, s-maxage=21600, stale-while-revalidate=86400'
      : 'public, s-maxage=31536000, immutable');
    if (!isPlaylist) return new Response(up.body, {status: up.status, headers: h});

    const abs = (x) => new URL(x, target).href;
    const out = (await up.text()).split('\n').map((line) => {
      const t = line.trim(); if (!t) return line;
      if (t[0] === '#') return t.replace(/URI="([^"]+)"/g, (_, x) => `URI="${proxy(abs(x))}"`);
      return proxy(abs(t));
    }).join('\n');
    h.set('Content-Type', 'application/vnd.apple.mpegurl');
    h.delete('Content-Length');
    return new Response(out, {status: 200, headers: h});
  }

  /* --- Цуврал / анги --- */
  const book = bookIdOf(u.searchParams.get('book') || '');
  if (!book) return Response.json({error: 'book_id буруу.'}, {status: 400});
  const n = u.searchParams.get('n');
  try {
    const data = n === null
      ? await series(book)
      : { ...(await episode(book, Number(n))), sources: null };
    if (n !== null) {
      data.direct = data.qualities;                       // CORS зөвшөөрвөл шууд
      data.sources = Object.fromEntries(
        Object.entries(data.qualities).map(([k, v]) => [k, proxy(v)]));
    }
    return Response.json(data, {headers: {
      'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=86400',
      'Access-Control-Allow-Origin': '*',
    }});
  } catch (e) {
    return Response.json({error: e instanceof Error ? e.message : String(e)}, {status: 422});
  }
}};
