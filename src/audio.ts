export function toWav(samples:Float32Array,rate:number):ArrayBuffer{
 const count=Math.floor(samples.length*16000/rate),buffer=new ArrayBuffer(44+count*2),view=new DataView(buffer);
 const text=(offset:number,s:string)=>{for(let i=0;i<s.length;i++)view.setUint8(offset+i,s.charCodeAt(i))};
 text(0,'RIFF');view.setUint32(4,buffer.byteLength-8,true);text(8,'WAVE');text(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,16000,true);view.setUint32(28,32000,true);view.setUint16(32,2,true);view.setUint16(34,16,true);text(36,'data');view.setUint32(40,count*2,true);
 for(let i=0;i<count;i++){const start=Math.floor(i*rate/16000),end=Math.max(start+1,Math.floor((i+1)*rate/16000));let sum=0;for(let j=start;j<end;j++)sum+=samples[j]||0;const v=Math.max(-1,Math.min(1,sum/(end-start)));view.setInt16(44+i*2,v<0?v*32768:v*32767,true);}return buffer;
}
