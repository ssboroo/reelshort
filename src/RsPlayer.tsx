import React,{forwardRef,useEffect,useRef,useState} from 'react';

/* .m3u8 → hls.js, бусад → шууд <video>. LiveSubtitles-ийн videoRef-тэй нийцнэ. */
export const HlsVideo=forwardRef<HTMLVideoElement,React.VideoHTMLAttributes<HTMLVideoElement>&{src:string}>(
 function HlsVideo({src,...rest},ref){
  const local=useRef<HTMLVideoElement|null>(null);
  useEffect(()=>{
   const v=local.current; if(!v||!src) return;
   if(!/\.m3u8(\?|$)/.test(src)){ v.src=src; return; }
   let hls:{destroy():void}|null=null, dead=false;
   import('hls.js').then(({default:Hls})=>{
    if(dead) return;
    if(Hls.isSupported()){ const h=new Hls({maxBufferLength:30}); h.loadSource(src); h.attachMedia(v); hls=h; }
    else v.src=src;
   });
   return()=>{dead=true;hls?.destroy();};
  },[src]);
  return <video {...rest} ref={node=>{local.current=node; if(typeof ref==='function')ref(node); else if(ref)ref.current=node;}}/>;
 });

export function useReelShort(bookId:string|null){
 const [chapters,setChapters]=useState<{n:number;title:string;paid:boolean}[]>([]);
 const [error,setError]=useState('');
 useEffect(()=>{
  if(!bookId){setChapters([]);return;} let alive=true; setError('');
  fetch(`/api/stream?book=${bookId}`).then(r=>r.json()).then(d=>{
   if(!alive) return;
   if(d.error){setError(d.error);return;}
   setChapters(d.chapters.map((c:any)=>({n:c.n,title:c.trailer?'Трейлер':`Анги ${c.n}`,paid:c.paid})));
  }).catch(e=>alive&&setError(String(e)));
  return()=>{alive=false};
 },[bookId]);
 return {chapters,error};
}

export function useRsSource(bookId:string|null,n:number|null){
 const [sources,setSources]=useState<Record<string,string>|null>(null);
 useEffect(()=>{
  if(!bookId||n===null){setSources(null);return;} let alive=true; setSources(null);
  fetch(`/api/stream?book=${bookId}&n=${n}`).then(r=>r.json()).then(d=>{
   if(alive&&!d.error) setSources(d.sources);
  }).catch(()=>{});
  return()=>{alive=false};
 },[bookId,n]);
 return sources;
}
