import {test} from 'node:test';
import assert from 'node:assert/strict';
import {movieURL,parseMetadata,getMetadata} from '../server/metadata.mjs';
test('canonical URLs and SSRF rejection',()=>{
 assert.equal(movieURL('https://reelshort.com/movie/test-123/?a=2'),'https://www.reelshort.com/movie/test-123');
 for(const u of ['http://reelshort.com/movie/x','https://evil.com/movie/x','https://reelshort.com.evil.com/movie/x','https://user@reelshort.com/movie/x','https://reelshort.com:8080/movie/x','https://reelshort.com/login'])assert.throws(()=>movieURL(u));
});
test('metadata decoded without video fields',()=>{
 assert.deepEqual(parseMetadata('<meta content="A &amp; B" property="og:title"><meta name="description" content="Hello"><video src="private.mp4">'),{title:'A & B',description:'Hello'});
 assert.throws(()=>parseMetadata('<title>Just a moment</title>'));
});
test('robots blocks HTML request',async()=>{
 let calls=0;
 await assert.rejects(()=>getMetadata('https://reelshort.com/movie/x',async()=>{calls++;return new Response('User-agent: *\nDisallow: /movie/',{headers:{'content-type':'text/plain'}})}));
 assert.equal(calls,1);
});
test('403 stops without retry or bypass',async()=>{
 let calls=0;await assert.rejects(()=>getMetadata('https://reelshort.com/movie/x',async()=>{calls++;return new Response('',{status:403})}),/403/);assert.equal(calls,1);
});
test('successful allowed public metadata',async()=>{
 const result=await getMetadata('https://reelshort.com/movie/x',async(url,opts)=>{
 assert.equal(opts.redirect,'error');return new Response(url.endsWith('robots.txt')?'User-agent: *\nAllow: /':'<title>Movie</title>',{headers:{'content-type':url.endsWith('robots.txt')?'text/plain':'text/html'}});
 });assert.equal(result.title,'Movie');assert.equal(result.source_url,'https://www.reelshort.com/movie/x');
});
test('oversize payload rejected',async()=>{
 await assert.rejects(()=>getMetadata('https://reelshort.com/movie/x',async()=>new Response('a'.repeat(1000001),{headers:{'content-type':'text/plain'}})),/хэмжээ/);
});
import endpoint from '../api/metadata.mjs';
test('endpoint rejects GET and unauthenticated POST before fetching',async()=>{
 const get=await endpoint.fetch(new Request('https://test/api/metadata'));assert.equal(get.status,405);assert.equal(get.headers.get('Allow'),'POST');
 const oldURL=process.env.SUPABASE_URL,oldKey=process.env.SUPABASE_ANON_KEY;
 process.env.SUPABASE_URL='https://example.supabase.co';process.env.SUPABASE_ANON_KEY='public-placeholder';
 try{const post=await endpoint.fetch(new Request('https://test/api/metadata',{method:'POST'}));assert.equal(post.status,401);}finally{if(oldURL===undefined)delete process.env.SUPABASE_URL;else process.env.SUPABASE_URL=oldURL;if(oldKey===undefined)delete process.env.SUPABASE_ANON_KEY;else process.env.SUPABASE_ANON_KEY=oldKey;}
});
test('Next page metadata tolerates reordered script attributes and strips markup',()=>{
 const data={props:{pageProps:{data:{book_title:'A &amp; B',special_desc:'<p>A story</p><script>bad()</script><p> about love.</p>',video_url:'private.mp4'}}}};
 const html=`<script type="application/json" nonce="example" id="__NEXT_DATA__">${JSON.stringify(data).replace(/</g,'\\u003c')}</script>`;
 assert.deepEqual(parseMetadata(html),{title:'A & B',description:'A story about love.'});
});
test('malformed Next JSON and unexpected value types fall back to HTML',()=>{
 for(const json of ['{bad','null',JSON.stringify({props:{pageProps:{data:{book_title:{bad:true},special_desc:42}}}})]){
  assert.deepEqual(parseMetadata(`<script id="__NEXT_DATA__">${json}</script><meta property="og:title" content="Fallback"><meta name="description" content="Description">`),{title:'Fallback',description:'Description'});
 }
});
test('challenge page is rejected even with embedded book metadata',()=>{
 assert.throws(()=>parseMetadata('<title>Access Denied</title><script id="__NEXT_DATA__">{"props":{"pageProps":{"data":{"book_title":"Movie"}}}}</script>'));
});
test('metadata bounds and empty pages',()=>{
 assert.throws(()=>parseMetadata('<html></html>'));
 const row=parseMetadata(`<meta property="og:title" content="${'a'.repeat(250)}"><meta name="description" content="${'b'.repeat(6000)}">`);
 assert.equal(row.title.length,200);assert.equal(row.description.length,5000);
});
