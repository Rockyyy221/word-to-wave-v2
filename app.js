import {SAMPLE_RATE,analyzeWord,renderWave,encodeWav,sanitizeFilename} from "./word-to-wave.js";

const $=id=>document.getElementById(id);
const form=$("convertForm"),input=$("wordInput"),status=$("status"),results=$("results");
const resultTitle=$("resultTitle"),generatedWord=$("generatedWord"),generatedEquation=$("generatedEquation");
const contributions=$("contributions"),termTable=$("termTable"),duration=$("duration"),letterCount=$("letterCount");
const canvas=$("waveform"),play=$("playButton"),download=$("downloadButton"),copy=$("copyEquationButton");

let analysis=null,signal=null,audio=null,url=null;

function highlight(index){
  document.querySelectorAll(".equation-term,.contribution-card,tbody tr").forEach(el=>{
    el.classList.toggle("is-highlighted",el.dataset.index===String(index));
  });
}
function clearHighlight(){document.querySelectorAll(".is-highlighted").forEach(e=>e.classList.remove("is-highlighted"));}

function renderEquation(a){
  generatedEquation.innerHTML="";
  if(!a.equationParts.length){generatedEquation.textContent="f(t) = 0";return;}
  const prefix=document.createElement("span");prefix.className="equation-prefix";prefix.innerHTML="<i>f(t)</i> =";generatedEquation.append(prefix);
  a.equationParts.forEach((p,i)=>{
    const term=document.createElement("span");term.className="equation-term";term.dataset.index=p.index;term.innerHTML=p.html;term.title=`${p.letter}: ${p.frequency.toFixed(1)} Hz, phase ${p.phase.toFixed(3)}`;
    term.onmouseenter=()=>highlight(p.index);term.onfocus=()=>highlight(p.index);generatedEquation.append(term);
    if(i<a.equationParts.length-1){const plus=document.createElement("span");plus.className="equation-plus";plus.textContent="+";generatedEquation.append(plus);}
  });
}
function renderContributions(terms){
  contributions.innerHTML="";
  terms.forEach(t=>{
    const card=document.createElement("article");card.className="contribution-card";card.dataset.index=t.index;card.tabIndex=0;
    card.innerHTML=`<div class="letter-symbol">${t.letter}</div><div class="contribution-info"><div class="contribution-equation"><i>a</i><sub>${t.index}</sub>(t) · sin(2π·${t.frequency.toFixed(1)}·t + ${t.phase.toFixed(3)})</div><div class="contribution-details"><span>${t.frequency.toFixed(1)} Hz</span><span>phase ${t.phase.toFixed(3)} rad</span><span>peak ${t.center.toFixed(2)} s</span><span>width ${t.width.toFixed(2)} s</span></div></div>`;
    card.onmouseenter=()=>highlight(t.index);card.onfocus=()=>highlight(t.index);contributions.append(card);
  });
}
function renderTable(terms){
  termTable.innerHTML="";
  terms.forEach(t=>{
    const row=document.createElement("tr");row.dataset.index=t.index;
    row.innerHTML=`<td>${t.index}</td><td><strong>${t.letter}</strong></td><td>${t.value}</td><td>${t.frequency.toFixed(1)} Hz</td><td>${t.phase.toFixed(3)} rad</td><td>${t.center.toFixed(2)} s</td><td>${t.width.toFixed(2)} s</td>`;
    row.onmouseenter=()=>highlight(t.index);termTable.append(row);
  });
}
function drawWave(active=null){
  if(!signal)return;
  const dpr=Math.min(devicePixelRatio||1,2),width=Math.max(320,Math.floor(canvas.clientWidth*dpr)),height=260;
  canvas.width=width;canvas.height=height;const ctx=canvas.getContext("2d");
  ctx.fillStyle="#fbfaf6";ctx.fillRect(0,0,width,height);
  ctx.strokeStyle="#d7d2c8";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,height/2);ctx.lineTo(width,height/2);ctx.stroke();
  const step=Math.max(1,Math.floor(signal.length/width));
  ctx.strokeStyle="#171717";ctx.lineWidth=1.5;ctx.beginPath();
  for(let x=0;x<width;x++){const y=height/2-signal[Math.min(signal.length-1,x*step)]*height*.39;x?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.stroke();
  if(analysis) for(const t of analysis.terms){
    const x1=((Math.max(0,t.center-t.width)/analysis.duration)*width),x2=((Math.min(analysis.duration,t.center+t.width)/analysis.duration)*width);
    ctx.strokeStyle=active===t.index?"#d85b35":"#e5e0d7";
    ctx.beginPath();ctx.moveTo(x1,18);ctx.lineTo(x1,height-18);ctx.stroke();
    ctx.beginPath();ctx.moveTo(x2,18);ctx.lineTo(x2,height-18);ctx.stroke();
  }
}
function stop(){if(audio){audio.pause();audio.currentTime=0;audio=null;}play.textContent="▶ Play";}
function cleanup(){if(url){URL.revokeObjectURL(url);url=null;}}
async function copyEquation(){
  if(!analysis)return;
  try{await navigator.clipboard.writeText(analysis.equationText);const old=copy.textContent;copy.textContent="✓ Copied";setTimeout(()=>copy.textContent=old,1400);}
  catch{status.textContent="Copy is unavailable in this browser.";}
}
function convert(){
  stop();cleanup();
  const raw=input.value.trim();
  if(!raw){results.classList.add("hidden");status.textContent="Enter at least one letter.";return;}
  const a=analyzeWord(raw);
  if(!a.terms.length){results.classList.add("hidden");status.textContent="No A–Z letters were found.";return;}
  analysis=a;status.textContent="";
  resultTitle.textContent=`Generated from “${a.letters}”`;generatedWord.textContent=a.letters;
  duration.textContent=`${a.duration.toFixed(2)} s`;letterCount.textContent=`${a.terms.length} ${a.terms.length===1?"letter":"letters"}`;
  renderEquation(a);renderContributions(a.terms);renderTable(a.terms);
  signal=renderWave(a);drawWave();
  const blob=encodeWav(signal,SAMPLE_RATE);cleanup();url=URL.createObjectURL(blob);
  download.href=url;download.download=sanitizeFilename(a.input);download.classList.remove("disabled-link");download.removeAttribute("aria-disabled");
  audio=new Audio(url);play.disabled=false;copy.disabled=false;
  audio.onended=()=>{play.textContent="▶ Play";drawWave();clearHighlight();};
  audio.ontimeupdate=()=>{
    const t=audio.currentTime,active=a.terms.find(x=>t>=x.center-x.width&&t<=x.center+x.width);
    drawWave(active?.index??null);active?highlight(active.index):clearHighlight();
  };
  results.classList.remove("hidden");results.scrollIntoView({behavior:"smooth",block:"start"});
}
form.addEventListener("submit",e=>{e.preventDefault();convert();});
play.addEventListener("click",async()=>{
  if(!audio)return;
  if(audio.paused){try{await audio.play();play.textContent="Ⅱ Pause";}catch{status.textContent="Press Play again to start audio.";}}
  else{audio.pause();play.textContent="▶ Play";}
});
copy.addEventListener("click",copyEquation);
window.addEventListener("resize",()=>drawWave());
input.focus();
