// App logic with fretboard, licks, backing
const fretCanvas = document.getElementById('fretboard');
const ctx = fretCanvas.getContext('2d');
const keySel = document.getElementById('keySel');
const scaleSel = document.getElementById('scaleSel');
const progSel = document.getElementById('progSel');
const tempo = document.getElementById('tempo');
const tempoOut = document.getElementById('tempoOut');
const playBtn = document.getElementById('playBtn');
const stopBtn = document.getElementById('stopBtn');
const lickBtn = document.getElementById('lickBtn');
const copyTabBtn = document.getElementById('copyTab');
const tabEl = document.getElementById('tab');

tempo.addEventListener('input', () => tempoOut.textContent = tempo.value);

const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const TUNING = ['E2','A2','D3','G3','B3','E4'];
function noteToMidi(n){const name=n.slice(0,-1);const oct=parseInt(n.slice(-1));const idx=NOTE_NAMES.indexOf(name);return 12*(oct+1)+idx;}

let frets = 16;
function resizeCanvas(){const r=window.devicePixelRatio||1;fretCanvas.width=fretCanvas.clientWidth*r;fretCanvas.height=fretCanvas.clientHeight*r;ctx.setTransform(r,0,0,r,0,0);drawFretboard();}
window.addEventListener('resize', resizeCanvas);resizeCanvas();

function drawFretboard(scaleSet=new Set(), rootPC=-1, chordTones=new Set()){
  const w=fretCanvas.clientWidth, h=fretCanvas.clientHeight;
  ctx.clearRect(0,0,w,h);
  const margin=20; const fbW=w-margin*2, fbH=h-margin*2;
  roundRect(ctx, margin, margin, fbW, fbH, 12); ctx.fillStyle='#0b1628'; ctx.fill();
  ctx.strokeStyle='#1f2937'; ctx.lineWidth=2;
  for(let f=0; f<=frets; f++){const x=margin+(fbW)*(f/frets);ctx.beginPath();ctx.moveTo(x,margin);ctx.lineTo(x,margin+fbH);ctx.stroke();if([3,5,7,9,12,15].includes(f)){ctx.fillStyle='#0e7490';ctx.beginPath();ctx.arc(x-2, margin+fbH/2, f===12?6:4, 0, Math.PI*2);ctx.fill();}}
  const strings=6;
  for(let s=0;s<strings;s++){const y=margin+fbH*(s/(strings-1));ctx.strokeStyle='#334155';ctx.lineWidth=2+(strings-1-s)*0.3;ctx.beginPath();ctx.moveTo(margin,y);ctx.lineTo(margin+fbW,y);ctx.stroke();}
  for(let s=0;s<6;s++){const openMidi=noteToMidi(TUNING[s]);
    for(let f=0; f<=frets; f++){const m=openMidi+f; const pc=m%12;
      if(scaleSet.has(pc)){const x=margin+(fbW)*(f/frets); const y=margin+fbH*(s/(5));
        const isRoot=(pc===rootPC); const isChordTone=chordTones.has(pc);
        ctx.fillStyle=isRoot?'#60a5fa':(isChordTone?'#f59e0b':'#22c55e'); ctx.beginPath(); ctx.arc(x,y,isRoot?10:8,0,Math.PI*2); ctx.fill();
      }
    }
  }
}
function roundRect(ctx,x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}

const SCALES={major:[0,2,4,5,7,9,11],mixolydian:[0,2,4,5,7,9,10],majorPent:[0,2,4,7,9],blues:[0,3,5,6,7,10]};
const CHORD_TONES={major:[0,4,7],dominant7:[0,4,7,10]};
function pcOf(noteName){return NOTE_NAMES.indexOf(noteName);}
function buildScaleSet(key,scale){const rootPC=pcOf(key);const pcs=new Set(SCALES[scale].map(i=>(rootPC+i)%12));return {pcs, rootPC};}
function chordTonesFor(degree,key){const rootPC=pcOf(key);let offset=0, tones=CHORD_TONES.major; if(degree==='IV'){offset=5; tones=CHORD_TONES.major;} if(degree==='V'){offset=7; tones=CHORD_TONES.dominant7;} return new Set(tones.map(i => (rootPC+offset+i)%12));}
function refresh(){const key=keySel.value;const scale=scaleSel.value;const {pcs}=buildScaleSet(key,scale);const chords=chordTonesFor('I',key);drawFretboard(pcs, pcOf(key), chords);} [keySel, scaleSel].forEach(el => el.addEventListener('change', refresh)); refresh();

function generateLick(){const key=keySel.value;const scale=scaleSel.value;const rootPC=pcOf(key);const pcs=SCALES[scale].map(i=>(rootPC+i)%12);const pool=[];
  for(let s=0;s<6;s++){const open=noteToMidi(TUNING[s]);for(let f=0;f<=16;f++){const pc=(open+f)%12; if(pcs.includes(pc)&&f>=2&&f<=10) pool.push({s,f,pc});}}
  const notes=[]; for(let i=0;i<8;i++) notes.push(pool[Math.floor(Math.random()*pool.length)]);
  const rootChoices=pool.filter(n=>n.pc===rootPC); if(rootChoices.length) notes[notes.length-1]=rootChoices[Math.floor(Math.random()*rootChoices.length)];
  const strings=[[],[],[],[],[],[]];
  for(let i=0;i<8;i++){for(let s=0;s<6;s++) strings[5-s].push('---'); const n=notes[i]; const lineIdx=5-n.s; strings[lineIdx][strings[lineIdx].length-1]=(n.f<10?`-${n.f}-`:`${n.f}`);}
  const names=['e','B','G','D','A','E']; let out=''; for(let i=0;i<6;i++) out+=names[i]+'|'+strings[i].join('')+'|\n'; tabEl.textContent=out;}
lickBtn.addEventListener('click', generateLick); copyTabBtn.addEventListener('click', ()=> navigator.clipboard.writeText(tabEl.textContent||''));

let actx, playing=false, schedulerTimer=null;
function midiFreq(m){return 440*Math.pow(2,(m-69)/12);}
function playNote(time,midi,dur=0.2,type='sine',gain=0.2){const o=actx.createOscillator(); const g=actx.createGain(); o.type=type; o.frequency.value=midiFreq(m); o.connect(g); g.connect(master); g.gain.setValueAtTime(0,time); g.gain.linearRampToValueAtTime(gain,time+0.005); g.gain.linearRampToValueAtTime(0.0001,time+dur); o.start(time); o.stop(time+dur+0.01);}
let master;
function start(){if(playing) return; actx=new (window.AudioContext||window.webkitAudioContext)(); master=actx.createGain(); master.connect(actx.destination); master.gain.value=0.5; playing=true; schedule();}
function stop(){if(!playing) return; playing=false; if(schedulerTimer) clearTimeout(schedulerTimer); try{actx.close();}catch(e){}}
document.getElementById('playBtn').addEventListener('click', start);
document.getElementById('stopBtn').addEventListener('click', stop);
function schedule(){if(!playing) return; const bpm=parseInt(tempo.value,10); const spb=60/bpm; const now=(actx&&actx.currentTime)||0; const key=keySel.value;
  const degrees=(progSel.value==='I-IV-V')?['I','I','I','I','IV','IV','I','I','V','V','I','I']:(progSel.value==='I-V'?['I','I','V','V','I','I','V','V']:['I','I','I','I','I','I','I','I']);
  let t=now+0.05; const beatsPerMeasure=4;
  function degRootMidi(deg){const ROOTS={'C':{'I':36,'IV':41,'V':43},'D':{'I':38,'IV':43,'V':45},'E':{'I':40,'IV':45,'V':47},'G':{'I':43,'IV':48,'V':50},'A':{'I':45,'IV':50,'V':52}}; const map=ROOTS[key]||ROOTS['G']; return map[deg];}
  const scale=scaleSel.value; const {pcs}=buildScaleSet(key,scale); drawFretboard(pcs, pcOf(key), chordTonesFor(degrees[0], key));
  for(let m=0;m<degrees.length;m++){const deg=degrees[m]; const root=degRootMidi(deg);
    for(let beat=0; beat<beatsPerMeasure; beat++){const isBoom=(beat%2===0); if(isBoom){playNote(t,root,0.12,'triangle',0.25);} else {const chordSet=chordTonesFor(deg,key); const triad=Array.from(chordSet).slice(0,3).map(pc=>52+((pc-(52%12)+12)%12)); triad.forEach((midi,i)=>playNote(t,midi+i*4,0.08,'square',0.12));} t+=spb;}}
  schedulerTimer=setTimeout(schedule, spb*beatsPerMeasure*1000*2);
}
window.addEventListener('beforeinstallprompt', ()=>{});
