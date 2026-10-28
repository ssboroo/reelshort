import {useEffect,useRef,useState,type RefObject} from 'react';
import {db} from './lib';
import {toWav} from './audio';
export function LiveSubtitles({videoRef}:{videoRef:RefObject<HTMLVideoElement|null>}){
 const [enabled,setEnabled]=useState(false),[starting,setStarting]=useState(false),[caption,setCaption]=useState(''),[status,setStatus]=useState('');
 const graph=useRef<{context:AudioContext;source:MediaElementAudioSourceNode;node:AudioWorkletNode;silent:GainNode}|null>(null);
 const active=useRef(false),epoch=useRef(0),abort=useRef<AbortController|null>(null),pending=useRef(false),expiry=useRef<ReturnType<typeof setTimeout>|null>(null),alive=useRef(true);
 function reset(){epoch.current++;abort.current?.abort();setCaption('');if(expiry.current)clearTimeout(expiry.current);graph.current?.node.port.postMessage({active:active.current&&!videoRef.current?.paused});}
 function stop(){active.current=false;setEnabled(false);reset();setStatus('Хадмал унтарсан');}
 useEffect(()=>{alive.current=true;const video=videoRef.current;const pause=()=>{reset();if(active.current)setStatus('Түр зогссон');};const play=()=>{reset();if(active.current)setStatus('Дууг сонсож байна…');};const seek=()=>reset();video?.addEventListener('pause',pause);video?.addEventListener('play',play);video?.addEventListener('seeking',seek);video?.addEventListener('ratechange',seek);return()=>{alive.current=false;active.current=false;epoch.current++;abort.current?.abort();if(expiry.current)clearTimeout(expiry.current);video?.removeEventListener('pause',pause);video?.removeEventListener('play',play);video?.removeEventListener('seeking',seek);video?.removeEventListener('ratechange',seek);const g=graph.current;if(g){g.node.port.onmessage=null;g.source.disconnect();g.node.disconnect();g.silent.disconnect();void g.context.close();graph.current=null;}}},[]);
 async function start(){
  if(!db){setStatus('Нэвтрэлт болон серверийн тохиргоо шаардлагатай.');return;}setStarting(true);
  try{
   const session=await db.auth.getSession();if(!session.data.session)throw new Error('Эхлээд нэвтэрнэ үү.');
   const video=videoRef.current;if(!video)throw new Error('Видео сонгоно уу.');
   if(!window.AudioContext||!window.isSecureContext)throw new Error('HTTPS болон Web Audio дэмждэг хөтөч хэрэгтэй.');
   if(!graph.current){
    const context=new AudioContext();
    try{await context.audioWorklet.addModule('/pcm-capture.js');if(!alive.current){await context.close();return;}
     const source=context.createMediaElementSource(video),node=new AudioWorkletNode(context,'pcm-capture'),silent=context.createGain();silent.gain.value=0;
     source.connect(context.destination);source.connect(node);node.connect(silent);silent.connect(context.destination);graph.current={context,source,node,silent};
     node.port.onmessage=async({data}:{data:Float32Array})=>{
      if(!active.current||video.paused||video.seeking)return;
      if(pending.current){setStatus('Холболт удаан: хоцорсон хэсгийг алгасаж байна.');return;}
      let energy=0;for(const v of data)energy+=v*v;if(Math.sqrt(energy/data.length)<0.002){setStatus('Яриа хүлээж байна. Дуу гарахгүй бол видеоны CORS тохиргоог шалгана уу.');return;}
      const version=epoch.current;pending.current=true;const control=new AbortController();abort.current=control;setStatus('Монгол руу орчуулж байна…');
      try{
       const session=await db!.auth.getSession();if(!session.data.session)throw new Error('Дахин нэвтэрнэ үү.');
       const res=await fetch('/api/subtitles',{method:'POST',headers:{Authorization:`Bearer ${session.data.session.access_token}`,'Content-Type':'audio/wav'},body:toWav(data,context.sampleRate),signal:AbortSignal.any([control.signal,AbortSignal.timeout(25000)])});
       if(!res.headers.get('content-type')?.includes('application/json'))throw new Error('Хадмалын сервер ажиллахгүй байна.');
       const result=await res.json();if(!res.ok)throw new Error(result.error||'Орчуулга амжилтгүй.');
       if(alive.current&&active.current&&epoch.current===version&&!video.paused){setCaption(result.text||'');setStatus('LIVE · Монгол хадмал');if(expiry.current)clearTimeout(expiry.current);expiry.current=setTimeout(()=>setCaption(''),5000);}
      }catch(e){if(alive.current&&epoch.current===version&&!control.signal.aborted){stop();setStatus(e instanceof Error?e.message:'Хадмалын алдаа.');}}finally{pending.current=false;}
     };
    }catch(e){await context.close();throw e;}
   }
   await graph.current.context.resume();if(!alive.current)return;active.current=true;setEnabled(true);reset();setStatus(video.paused?'Видео тоглуулна уу.':'Дууг сонсож байна…');
  }catch(e){if(alive.current)setStatus(e instanceof Error?e.message:'Хадмал асаасангүй.');}finally{if(alive.current)setStarting(false);}
 }
 return <div className="live-subtitles"><div className="live-controls"><button className={enabled?'primary small':'secondary small'} disabled={starting} onClick={()=>enabled?stop():void start()}>{starting?'Холбож байна…':enabled?'CC Монгол · Унтраах':'CC Монгол · Шууд хадмал'}</button><span role="status">{status}</span></div><p className="live-note">Асаахад видеоны дууг орчуулгын үйлчилгээнд илгээнэ. 4 секундийн хэсгээр боловсруулдаг тул хадмал хоцорч гарна.</p>{caption&&<div className="live-caption" aria-live="polite">{caption}</div>}</div>;
}
export function SubtitleStudio(){const [src,setSrc]=useState('');const video=useRef<HTMLVideoElement|null>(null);useEffect(()=>()=>{if(src)URL.revokeObjectURL(src)},[src]);return <section className="subtitle-studio"><div className="eyebrow">LIVE · МОНГОЛ ХАДМАЛ</div><h2>Видео тоглуул. Монгол хадмалтай үз.</h2><p>Өөрийн видео файлаа сонгоод тоглуулж, CC Монгол товчийг асаана уу. Видео файл төхөөрөмж дээрээ үлдэнэ; хадмал асаасан үед зөвхөн дууны хэсгүүд илгээгдэнэ.</p><label>Видео сонгох<input type="file" accept="video/*" onChange={e=>{const file=e.target.files?.[0];if(file)setSrc(URL.createObjectURL(file));e.target.value=''}}/></label>{src?<div className="studio-player" key={src}><video ref={video} src={src} controls playsInline/><LiveSubtitles videoRef={video}/></div>:<div className="empty">MP4, WebM зэрэг хөтөч тань дэмждэг видео сонгоно уу.</div>}</section>}
