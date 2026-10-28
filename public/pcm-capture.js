class PCMCapture extends AudioWorkletProcessor {
 constructor(){super();this.buffer=new Float32Array(sampleRate*4);this.offset=0;this.active=false;this.port.onmessage=({data})=>{this.active=data.active;this.offset=0;};}
 process(inputs){
  const channels=inputs[0];if(!this.active||!channels?.length)return true;
  for(let i=0;i<channels[0].length;i++){
   let value=0;for(const channel of channels)value+=channel[i]||0;
   this.buffer[this.offset++]=value/channels.length;
   if(this.offset===this.buffer.length){const block=this.buffer;this.port.postMessage(block,[block.buffer]);this.buffer=new Float32Array(sampleRate*4);this.offset=0;}
  }return true;
 }
}
registerProcessor('pcm-capture',PCMCapture);
