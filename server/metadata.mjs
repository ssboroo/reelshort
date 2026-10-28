import {load} from 'cheerio';
import robotsParser from 'robots-parser';
export function movieURL(value){
 const u=new URL(value);
 if(u.protocol!=='https:'||!['www.reelshort.com','reelshort.com'].includes(u.hostname)||u.port||u.username||u.password||!/^\/movie\/[a-zA-Z0-9_%~-]+\/?$/.test(u.pathname))throw new Error('ReelShort киноны зөв холбоос оруулна уу.');
 return 'https://www.reelshort.com'+u.pathname.replace(/\/$/,'');
}
export function parseMetadata(html){
 const $=load(html);const title=($('meta[property="og:title"]').attr('content')||$('title').text()).trim().slice(0,200);
 if(!title||/captcha|just a moment|access denied|forbidden/i.test(title))throw new Error('Мэдээллийг автоматаар авах боломжгүй. Нэрээ гараар оруулна уу.');
 return {title,description:($('meta[property="og:description"]').attr('content')||$('meta[name="description"]').attr('content')||'').trim().slice(0,5000)};
}
async function read(url,type,fetcher){
 const res=await fetcher(url,{redirect:'error',signal:AbortSignal.timeout(8000),headers:{'User-Agent':'ReelShortMNCatalog/1.0','Accept':type}});
 if(!res.ok)throw new Error(`Эх сайт HTTP ${res.status} хариу өглөө. Нэрээ гараар оруулж болно.`);
 if(!res.headers.get('content-type')?.includes(type))throw new Error('Эх сайтын хариу тохирохгүй байна.');
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
