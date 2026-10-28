import {load} from 'cheerio';
import robotsParser from 'robots-parser';
export function movieURL(value){
 const u=new URL(value);
 if(u.protocol!=='https:'||!['www.reelshort.com','reelshort.com'].includes(u.hostname)||u.port||u.username||u.password||!/^\/movie\/[a-zA-Z0-9_%~-]+\/?$/.test(u.pathname))throw new Error('ReelShort киноны зөв холбоос оруулна уу.');
 return 'https://www.reelshort.com'+u.pathname.replace(/\/$/,'');
}
// Keep the public metadata contract consumed by api/metadata.mjs.
// JSON-LD/Next page data is untrusted and can change independently of the app.
export function parseMetadata(html){
 const $=load(html);
 const clean=(value,max)=>{
  if(typeof value!=='string')return '';
  const fragment=load(value);fragment('script,style').remove();
  return fragment.root().text().replace(/\s+/g,' ').trim().slice(0,max);
 };
 let data;
 try{data=JSON.parse($('#__NEXT_DATA__').text())?.props?.pageProps?.data;}catch{/* Fall back to standard HTML metadata. */}
 const pageTitle=clean($('title').text(),200);
 const ogTitle=clean($('meta[property="og:title"]').attr('content'),200);
 if(/captcha|just a moment|access denied|forbidden/i.test(pageTitle+' '+ogTitle))throw new Error('Мэдээллийг автоматаар авах боломжгүй. Нэрээ гараар оруулна уу.');
 const title=clean(data?.book_title,200)||ogTitle||pageTitle;
 if(!title)throw new Error('Мэдээллийг автоматаар авах боломжгүй. Нэрээ гараар оруулна уу.');
 const description=clean(data?.special_desc,5000)||clean($('meta[property="og:description"]').attr('content'),5000)||clean($('meta[name="description"]').attr('content'),5000);
 return {title,description};
}
async function read(url,type,fetcher){
 const res=await fetcher(url,{redirect:'error',signal:AbortSignal.timeout(8000),headers:{'User-Agent':'ReelShortMNCatalog/1.0','Accept':type}});
 if(!res.ok)throw new Error(`Эх сайт HTTP ${res.status} хариу өглөө. Нэрээ гараар оруулж болно.`);
 if(!res.headers.get('content-type')?.includes(type))throw new Error('Эх сайтын хариу тохирохгүй байна.');
 if(!res.body)throw new Error('Эх сайт хоосон хариу өглөө.');
 const reader=res.body.getReader();let size=0;const chunks=[];
 try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>1000000)throw new Error('Хуудасны хэмжээ хэтэрсэн.');chunks.push(value);}}finally{await reader.cancel();}
 return Buffer.concat(chunks).toString('utf8');
}
export async function getMetadata(value,fetcher=fetch){
 const url=movieURL(value);const robots=await read('https://www.reelshort.com/robots.txt','text/plain',fetcher);
 const policy=robotsParser('https://www.reelshort.com/robots.txt',robots);
 if(policy.isAllowed(url,'ReelShortMNCatalog')!==true)throw new Error('Эх сайт автомат мэдээлэл авахыг зөвшөөрөөгүй. Нэрээ гараар оруулна уу.');
 const delay=policy.getCrawlDelay('ReelShortMNCatalog')||0;
 if(delay>0)throw new Error('Эх сайт хүсэлтийн завсарлага шаардсан. Багц скриптийг ашиглах эсвэл гараар оруулна уу.');
 return {...parseMetadata(await read(url,'text/html',fetcher)),source_url:url};
}
