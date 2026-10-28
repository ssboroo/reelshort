import {useState} from 'react';
import {db} from './lib';
type Row={title:string;description:string;source_url:string;genre:string};
export function CatalogImport({reload}:{reload:()=>void}){
 const [rows,setRows]=useState<Row[]>([]),[selected,setSelected]=useState<Set<number>>(new Set()),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 async function read(file:File){
  setRows([]);setSelected(new Set());setMessage('');
  try{
   if(file.size>500000)throw new Error('Файл 500KB-аас бага байх ёстой.');
   const data:unknown=JSON.parse(await file.text());
   if(!Array.isArray(data)||data.length<1||data.length>50)throw new Error('1–50 кино бүхий JSON массив шаардлагатай.');
   const seen=new Set<string>();
   const result:Row[]=data.map(item=>{
    if(!item||typeof item!=='object'||typeof item.title!=='string'||!item.title.trim()||item.title.length>200||typeof item.source_url!=='string')throw new Error('Нэр эсвэл эх холбоос буруу байна.');
    const url=new URL(item.source_url);
    if(url.protocol!=='https:'||!['www.reelshort.com','reelshort.com'].includes(url.hostname)||url.port||url.username||url.password||!/^\/movie\/[A-Za-z0-9_%~-]+\/?$/.test(url.pathname))throw new Error('ReelShort киноны HTTPS холбоос шаардлагатай.');
    const source_url='https://www.reelshort.com'+url.pathname.replace(/\/$/,'');
    if(seen.has(source_url))throw new Error('Файл дотор давхардсан кино байна.');seen.add(source_url);
    if(item.description!==undefined&&typeof item.description!=='string')throw new Error('Тайлбар текст байх ёстой.');
    return {title:item.title.trim(),description:(item.description||'').slice(0,5000),source_url,genre:'Драм'};
   });setRows(result);setSelected(new Set(result.map((_,i)=>i)));
  }catch(e){setMessage(e instanceof Error?e.message:'Файл уншсангүй.');}
 }
 async function save(){if(!db||!selected.size)return;setBusy(true);setMessage('');try{
  const {data,error}=await db.rpc('import_catalog',{items:rows.filter((_,i)=>selected.has(i))});
  if(error)throw error;setMessage(`${data} кино нооргоор нэмэгдлээ. ${selected.size-Number(data)} давхардлыг алгаслаа.`);setRows([]);setSelected(new Set());reload();
 }catch(e){setMessage(e instanceof Error?e.message:typeof e==='object'&&e&&'message' in e?String(e.message):'Импорт амжилтгүй. 002 migration тохируулсан эсэхийг шалгана уу.');}finally{setBusy(false)}}
 return <section className="catalog-import"><h3>ReelShort каталог импортлох</h3><p>Скриптээс гаргасан JSON файлыг сонгоод нэр, тайлбарыг хянаж засна уу. Сонгосон кинонууд нийтлэгдээгүй ноорог болж хадгалагдана.</p><label>Каталогийн JSON<input disabled={busy} type="file" accept=".json,application/json" onChange={e=>{const f=e.target.files?.[0];if(f)void read(f);e.target.value=''}}/></label>
 {rows.map((row,i)=><div className="import-row" key={row.source_url}><label><input type="checkbox" disabled={busy} checked={selected.has(i)} onChange={e=>setSelected(old=>{const next=new Set(old);if(e.target.checked)next.add(i);else next.delete(i);return next})}/> Импортлох</label><a href={row.source_url} target="_blank" rel="noopener noreferrer">Эх хуудсыг нээх ↗</a><label>Нэр<input maxLength={200} disabled={busy} value={row.title} onChange={e=>setRows(old=>old.map((r,j)=>j===i?{...r,title:e.target.value}:r))}/></label><label>Тайлбар<textarea maxLength={5000} disabled={busy} value={row.description} onChange={e=>setRows(old=>old.map((r,j)=>j===i?{...r,description:e.target.value}:r))}/></label><label>Төрөл<select disabled={busy} value={row.genre} onChange={e=>setRows(old=>old.map((r,j)=>j===i?{...r,genre:e.target.value}:r))}>{['Драм','Романтик','Триллер','Инээдэм','Адал явдал'].map(g=><option key={g}>{g}</option>)}</select></label></div>)}
 {!!rows.length&&<button className="primary" disabled={busy||!selected.size||rows.some((r,i)=>selected.has(i)&&!r.title.trim())} onClick={()=>void save()}>{busy?'Хадгалж байна…':`${selected.size} киног нооргоор импортлох`}</button>}<p role="status">{message}</p></section>
}
