import {createClient} from '@supabase/supabase-js';
import {getMetadata} from '../server/metadata.mjs';
export default {async fetch(req){
 const reply=(status,data,headers={})=>Response.json(data,{status,headers:{'Cache-Control':'no-store',...headers}});
 if(req.method!=='POST'){return reply(405,{error:'POST required'},{Allow:'POST'});}
 const url=process.env.SUPABASE_URL||process.env.VITE_SUPABASE_URL;
 const key=process.env.SUPABASE_ANON_KEY||process.env.VITE_SUPABASE_ANON_KEY;
 if(!url||!key)return reply(503,{error:'Серверийн Supabase тохиргоо дутуу. Гараар үргэлжлүүлж болно.'});
 const token=req.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1];
 if(!token)return reply(401,{error:'Нэвтрэх шаардлагатай.'});
 try{
  const db=createClient(url,key,{global:{headers:{Authorization:`Bearer ${token}`}},auth:{persistSession:false}});
  const {data,error}=await db.auth.getUser(token);if(error||!data.user)return reply(401,{error:'Нэвтрэх хугацаа дууссан.'});
  const admin=await db.rpc('is_admin');if(admin.error||admin.data!==true)return reply(403,{error:'Админ эрх шаардлагатай.'});
  // Database-backed rate limit works across serverless instances.
  const allowed=await db.rpc('claim_metadata_request');
  if(allowed.error)return reply(503,{error:'003 migration тохируулаагүй. Гараар үргэлжлүүлж болно.'});
  if(!allowed.data)return reply(429,{error:'10 секунд хүлээгээд дахин оролдоно уу.'});
  const body=await req.json();
  if(typeof body?.url!=='string'||body.url.length>2048)return reply(400,{error:'Холбоос буруу.'});
  return reply(200,await getMetadata(body.url));
 }catch(e){return reply(422,{error:e instanceof Error?e.message:'Мэдээлэл авсангүй. Гараар оруулна уу.'});}
}};
