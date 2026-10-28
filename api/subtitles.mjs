import {createClient} from '@supabase/supabase-js';
import {translateAudio,validateWav} from '../server/subtitles.mjs';
export default {async fetch(req){
 const reply=(status,data)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
 if(req.method!=='POST')return reply(405,{error:'POST required'});
 const token=req.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1];
 if(!token)return reply(401,{error:'Шууд хадмал ашиглахын тулд нэвтэрнэ үү.'});
 const url=process.env.SUPABASE_URL||process.env.VITE_SUPABASE_URL,key=process.env.SUPABASE_ANON_KEY||process.env.VITE_SUPABASE_ANON_KEY;
 if(!url||!key||!process.env.OPENAI_API_KEY)return reply(503,{error:'Хадмалын серверийн тохиргоо дутуу байна.'});
 if(req.headers.get('content-type')!=='audio/wav')return reply(415,{error:'WAV audio required'});
 try{
  const db=createClient(url,key,{global:{headers:{Authorization:`Bearer ${token}`}},auth:{persistSession:false}});
  const auth=await db.auth.getUser(token);if(auth.error||!auth.data.user)return reply(401,{error:'Нэвтрэх хугацаа дууссан.'});
  // Read bounded bytes before calling any paid service.
  const reader=req.body?.getReader();if(!reader)return reply(400,{error:'Audio required'});
  const parts=[];let size=0;
  try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>192044)return reply(413,{error:'Аудио хэт том.'});parts.push(value);}}finally{await reader.cancel();}
  const bytes=Buffer.concat(parts);try{validateWav(bytes);}catch{return reply(400,{error:'Аудио формат буруу.'});}
  const allowed=await db.rpc('claim_subtitle_request');
  if(allowed.error)return reply(503,{error:'Хадмалын database migration тохируулна уу.'});
  if(!allowed.data)return reply(429,{error:'Хүсэлтийн эсвэл өдрийн хэрэглээний хязгаарт хүрлээ. Түр хүлээгээд дахин асаана уу.'});
  const signal=AbortSignal.any([req.signal,AbortSignal.timeout(20000)]);
  return reply(200,await translateAudio(bytes,{key:process.env.OPENAI_API_KEY,signal}));
 }catch{return reply(502,{error:'Хадмал боловсруулж чадсангүй. API кредит, холболт болон серверийн тохиргоог шалгана уу.'});}
}};
