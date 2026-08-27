export const SAMPLE_RATE=44100;
export const PER_LETTER=0.35;
export const OVERLAP=0.5;
export const FREQ_LOW=180;
export const FREQ_HIGH=1800;

export function letterValue(ch){
  const c=ch.toUpperCase();
  return c>="A"&&c<="Z" ? c.charCodeAt(0)-64 : null;
}
export function letterFreq(v){
  const frac=(v-1)/25;
  return FREQ_LOW*Math.pow(FREQ_HIGH/FREQ_LOW,frac);
}
export function analyzeWord(word){
  const letters=[...word].filter(c=>letterValue(c)!==null);
  const n=letters.length;
  let duration=n?Math.max(0.6,PER_LETTER*(1+(n-1)*(1-OVERLAP*0.5))):0.6;
  const terms=letters.map((letter,i)=>{
    const value=letterValue(letter);
    const frequency=letterFreq(value);
    const phase=(value/26)*2*Math.PI;
    const center=(i+0.5)*PER_LETTER*(1-OVERLAP*0.5);
    const width=PER_LETTER*(0.5+OVERLAP);
    return {index:i+1,letter,value,frequency,phase,center,width};
  });
  if(terms.length){const last=terms.at(-1);duration=last.center+last.width+0.15;}
  const equationParts=terms.map(t=>({
    ...t,
    html:`a<sub>${t.index}</sub>(t)<span class="equation-times">·</span>sin(2π·${t.frequency.toFixed(1)}·t + ${t.phase.toFixed(3)})`,
    text:`a_${t.index}(t) * sin(2π * ${t.frequency.toFixed(1)} * t + ${t.phase.toFixed(3)})`
  }));
  return {
    input:word,letters:letters.join(""),terms,equationParts,
    equationText:equationParts.length?`f(t) = ${equationParts.map(p=>p.text).join(" + ")}`:"f(t) = 0",
    duration
  };
}
export function hannBump(t,center,width){
  const x=(t-center)/width;
  return Math.abs(x)>=1?0:0.5*(1+Math.cos(Math.PI*x));
}
export function renderWave(analysis,sampleRate=SAMPLE_RATE){
  const count=Math.max(1,Math.floor(sampleRate*analysis.duration));
  const signal=new Float32Array(count);
  for(const term of analysis.terms){
    for(let i=0;i<count;i++){
      const t=i/sampleRate;
      signal[i]+=hannBump(t,term.center,term.width)*Math.sin(2*Math.PI*term.frequency*t+term.phase);
    }
  }
  let peak=0;
  for(const x of signal) peak=Math.max(peak,Math.abs(x));
  if(peak>0) for(let i=0;i<signal.length;i++) signal[i]/=peak;
  return signal;
}
function writeString(view,offset,text){for(let i=0;i<text.length;i++)view.setUint8(offset+i,text.charCodeAt(i));}
function pcm(view,offset,signal){
  for(const x of signal){const s=Math.max(-1,Math.min(1,x));view.setInt16(offset,s<0?s*0x8000:s*0x7fff,true);offset+=2;}
}
export function encodeWav(signal,sampleRate=SAMPLE_RATE){
  const dataSize=signal.length*2,buffer=new ArrayBuffer(44+dataSize),view=new DataView(buffer);
  writeString(view,0,"RIFF");view.setUint32(4,36+dataSize,true);writeString(view,8,"WAVE");
  writeString(view,12,"fmt ");view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);
  view.setUint32(24,sampleRate,true);view.setUint32(28,sampleRate*2,true);view.setUint16(32,2,true);view.setUint16(34,16,true);
  writeString(view,36,"data");view.setUint32(40,dataSize,true);pcm(view,44,signal);
  return new Blob([buffer],{type:"audio/wav"});
}
export function sanitizeFilename(text){
  const safe=[...text].filter(c=>/[a-zA-Z0-9]/.test(c)).join("").toLowerCase();
  return `${safe||"word"}.wav`;
}
