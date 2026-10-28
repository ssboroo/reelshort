import {useState} from 'react';
import {db} from './lib';

type Row = {
 title: string;
 description: string;
 source_url: string;
 genre: string;
 cover_url?: string;
 chapter_count?: number;
 first_paid_episode?: number;
};

export function CatalogImport({reload}:{reload:()=>void}){
 const [rows,setRows]=useState<Row[]>([]);
 const [selected,setSelected]=useState<Set<number>>(new Set());
 const [message,setMessage]=useState('');
 const [busy,setBusy]=useState(false);

 async function read(file:File){
  setRows([]);setSelected(new Set());setMessage('');
  try{
   if(file.size>2_000_000)throw new Error('Файл 2MB-аас бага байх ёстой.');
   const data:unknown=JSON.parse(await file.text());
   if(!Array.isArray(data)||data.length<1||data.length>1000)throw new Error('1–1000 кино бүхий JSON массив шаардлагатай.');
   const seen=new Set<string>();
   const result:Row[]=data.map(item=>{
    if(!item||typeof item!=='object'||typeof item.title!=='string'||!item.title.trim()||item.title.length>200||typeof item.source_url!=='string')throw new Error('Нэр эсвэл эх холбоос буруу байна.');
    const url=new URL(item.source_url);
    if(url.protocol!=='https:'||!['www.reelshort.com','reelshort.com'].includes(url.hostname)||url.port||url.username||url.password||!/^\/movie\/[A-Za-z0-9_%~-]+\/?$/.test(url.pathname))throw new Error('ReelShort киноны HTTPS холбоос шаардлагатай.');
    const source_url='https://www.reelshort.com'+url.pathname.replace(/\/$/,'');
    if(seen.has(source_url))throw new Error('Файл дотор давхардсан кино байна.');
    seen.add(source_url);
    if(item.description!==undefined&&typeof item.description!=='string')throw new Error('Тайлбар текст байх ёстой.');
    let cover_url:string|undefined;
    const cover=item.cover_url||item.poster_url;
    if(cover!==undefined&&cover!==''){
     if(typeof cover!=='string')throw new Error('Постерын холбоос текст байх ёстой.');
     const image=new URL(cover);
     if(image.protocol!=='https:'||image.username||image.password||image.port)throw new Error('Постерын HTTPS холбоос шаардлагатай.');
     cover_url=image.href.slice(0,2000);
    }
    const numeric=(value:unknown,label:string):number|undefined=>{
     if(value===undefined||value===null||value==='')return undefined;
     const n=Number(value);
     if(!Number.isInteger(n)||n<0||n>1000)throw new Error(label+' 0–1000 бүхэл тоо байх ёстой.');
     return n;
    };
    return {
     title:item.title.trim(),
     description:(item.description||'').slice(0,5000),
     source_url,
     genre:typeof item.genre==='string'&&item.genre.trim()?item.genre.trim().slice(0,80):'Драм',
     ...(cover_url?{cover_url}:{}),
     ...(numeric(item.chapter_count,'Ангийн тоо')!==undefined?{chapter_count:numeric(item.chapter_count,'Ангийн тоо')}:{}),
     ...(numeric(item.first_paid_episode,'Төлбөртэй ангийн эхлэл')!==undefined?{first_paid_episode:numeric(item.first_paid_episode,'Төлбөртэй ангийн эхлэл')}:{}),
    };
   });
   setRows(result);setSelected(new Set(result.map((_,i)=>i)));
  }catch(e){setMessage(e instanceof Error?e.message:'Файл уншсангүй.');}
 }

 async function save(){
  if(!db||!selected.size)return;
  setBusy(true);setMessage('');
  try{
   const {data,error}=await db.rpc('import_catalog',{items:rows.filter((_,i)=>selected.has(i))});
   if(error)throw error;
   setMessage(`${data} кино нооргоор нэмэгдлээ. ${selected.size-Number(data)} давхардлыг алгаслаа.`);
   setRows([]);setSelected(new Set());reload();
  }catch(e){
   setMessage(e instanceof Error?e.message:typeof e==='object'&&e&&'message' in e?String(e.message):'Импорт амжилтгүй. Supabase-ийн migration-уудыг дарааллаар ажиллуулсан эсэхийг шалгана уу.');
  }finally{setBusy(false)}
 }

 return <section className="catalog-import">
  <h3>ReelShort каталог импортлох</h3>
  <p>Нийтэд ил байгаа нэр, тайлбар, постер, ангийн тоо болон төлбөртэй ангийн эхлэх дугаарыг JSON-оос импортолно. Видео файлыг татахгүй; эх сайт дээр үзэх холбоос хадгална.</p>
  <label>Каталогийн JSON<input disabled={busy} type="file" accept=".json,application/json" onChange={e=>{const f=e.target.files?.[0];if(f)void read(f);e.target.value=''}}/></label>
  {rows.map((row,i)=><div className="import-row" key={row.source_url}>
   <label><input type="checkbox" disabled={busy} checked={selected.has(i)} onChange={e=>setSelected(old=>{const next=new Set(old);if(e.target.checked)next.add(i);else next.delete(i);return next})}/> Импортлох</label>
   <a href={row.source_url} target="_blank" rel="noopener noreferrer">Эх хуудсыг нээх ↗</a>
   <label>Нэр<input maxLength={200} disabled={busy} value={row.title} onChange={e=>setRows(old=>old.map((r,j)=>j===i?{...r,title:e.target.value}:r))}/></label>
   <label>Тайлбар<textarea maxLength={5000} disabled={busy} value={row.description} onChange={e=>setRows(old=>old.map((r,j)=>j===i?{...r,description:e.target.value}:r))}/></label>
   <label>Постер HTTPS холбоос<input maxLength={2000} disabled={busy} value={row.cover_url||''} onChange={e=>setRows(old=>old.map((r,j)=>j===i?{...r,cover_url:e.target.value}:r))} placeholder="https://..."/></label>
   <label>Нийт ангийн тоо<input type="number" min="0" max="1000" disabled={busy} value={row.chapter_count??''} onChange={e=>setRows(old=>old.map((r,j)=>j===i?{...r,chapter_count:e.target.value===''?undefined:Number(e.target.value)}:r))}/></label>
   <label>Төлбөртэй анги эхлэх дугаар<input type="number" min="0" max="1000" disabled={busy} value={row.first_paid_episode??''} onChange={e=>setRows(old=>old.map((r,j)=>j===i?{...r,first_paid_episode:e.target.value===''?undefined:Number(e.target.value)}:r))}/></label>
   <label>Төрөл<select disabled={busy} value={row.genre} onChange={e=>setRows(old=>old.map((r,j)=>j===i?{...r,genre:e.target.value}:r))}>{['Драм','Романтик','Триллер','Инээдэм','Адал явдал'].map(g=><option key={g}>{g}</option>)}</select></label>
  </div>)}
  {!!rows.length&&<button className="primary" disabled={busy||!selected.size||rows.some((r,i)=>selected.has(i)&&(!r.title.trim()||(r.cover_url!==undefined&&!/^https:\/\//.test(r.cover_url))))} onClick={()=>void save()}>{busy?'Хадгалж байна…':`${selected.size} киног нооргоор импортлох`}</button>}
  <p role="status">{message}</p>
 </section>
}
