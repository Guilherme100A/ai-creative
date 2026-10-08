// Lote 4 de variações — feedback de todos os lotes (memes curados, sons do YouTube, sem emoji nos cantos)
// Lote 3 de variações (lote 2 + memes do pack em quadrado 3D)
// Lote 2 de variações — aplica o feedback do lote 1:
// sem whoosh ("barulho de chupada"), ordem original da fala, gancho mostrando o produto,
// mais cor, reações animadas (carinha triste, gato dançando...) com sons de meme.
// uso: node gen2.js <ids|all|--receitas>
const {execFileSync}=require('child_process');const fs=require('fs');const path=require('path');
const ff=require('ffmpeg-static');
const D='C:/Users/rhian/Downloads';
const BASE=D+'/copy_7C70940D-340D-4468-8D9F-35E228D90892.mov';
const MV=D+'/moveset',MO=D+'/criativo/assets/motion',SFX=D+'/criativo/assets/sfx',FONTS=D+'/criativo/assets/fontes';
const OUTDIR=D+'/criativo/render/variacoes';fs.mkdirSync(OUTDIR,{recursive:true});
const PEAKS=require('./sfx_peaks.json');
const FPS=30,fr=t=>Math.round(t*FPS);
const run=a=>execFileSync(ff,['-v','error','-y',...a],{stdio:'inherit'});

// ---------- falas ----------
let W=require('./base_words.json').chunks.map(c=>({t:c.text.trim(),s:c.timestamp[0],e:Math.max(c.timestamp[1]??0,c.timestamp[0]+0.12)}));
const fix=[[/^blocks$/i,'Blox'],[/^Besky$/,'Basic-Build',1],[/^God$/,'Godhuman',1],[/^Rasa$/,'Raça'],[/^serve$/,'saiba'],[/^Basic$/,'Basic-Build',1]];
{const W2=[];for(let i=0;i<W.length;i++){const w={...W[i]};for(const [re,rep,merge] of fix)if(re.test(w.t)){if(merge){const nx=W[i+1];const p=(nx.t.match(/[.,?!]$/)||[''])[0];w.t=rep+p;w.e=nx.e;i++;}else w.t=w.t.replace(re,rep);break;}W2.push(w);}W=W2;}
const SENT={A:[0.6,7.52],B:[7.66,9.14],C:[9.28,14.4],D:[14.58,20.52],E:[20.74,28.58],F:[28.76,34.56],G:[34.76,38.16],H:[38.34,46.74],I:[47.14,50.3],J:[50.62,56.3],K:[56.64,61.1]};
const SRC_END=62.4;

// ---------- takes ----------
const TAKES={};
for(const wpn of ['godhuman','cdk','soul guitar'])for(const sk of fs.readdirSync(path.join(MV,wpn)))for(const f of fs.readdirSync(path.join(MV,wpn,sk)))
 (TAKES[wpn]=TAKES[wpn]||[]).push(`${wpn}/${sk}/${f}`);
const BAD=['godhuman/Z - Soaring Beast/08-01-35_z_2.mp4'];
for(const k in TAKES)TAKES[k]=TAKES[k].filter(t=>!BAD.includes(t)).sort();

// ---------- direções visuais ----------
const DIR={
 hookSite:{s:1.0,e:2.1,v:'mo',clip:'site_top'},
 hook:{s:2.1,e:3.5,v:'box',wpn:'any'},
 brandFb:{s:11.2,e:12.42,v:'mo',clip:'brand_feedback'},
 siteFb:{s:12.42,e:17.0,v:'mo',clip:'site_feedback'},
 entrega:{s:20.7,e:23.3,v:'mo',clip:'brand_entrega'},
 siteTop:{s:34.7,e:38.3,v:'mo',clip:'site_top'},
 gh:{s:38.3,e:39.04,v:'box',wpn:'godhuman'},
 cdk:{s:39.04,e:39.76,v:'box',wpn:'cdk'},
 sg:{s:39.76,e:40.5,v:'box',wpn:'soul guitar'},
 montage:{s:40.5,e:46.8,v:'montage'},
 siteFb2:{s:50.55,e:53.95,v:'mo',clip:'site_feedback2'},
 siteCta:{s:56.55,e:59.0,v:'mo',clip:'site_cta'},
 brandCta:{s:59.0,e:99,v:'mo',clip:'brand_cta'},
};
const CLIPLEN={brand_feedback:1.5,site_feedback:4.5,brand_entrega:2.6,site_top:3.6,site_feedback2:3.4,site_cta:2.5,brand_cta:3.47};
const STD=['hook','brandFb','siteFb','entrega','siteTop','gh','cdk','sg','montage','siteFb2','siteCta','brandCta'];

// ---------- reações (tempo da fala original) ----------
// [tempo, emoji, movimento, som, prioridade]  prioridade 1 = sempre que tiver reação
const YT='C:/Users/rhian/Downloads/criativo/assets/sfx/youtube/';
const CUES=[
 [4.14,'1f914','pop',YT+'ui/pack_click.mp3',2],   // dúvida
 [6.75,'1f97a','shake',YT+'ui/pack_click.mp3',1], // "vou receber mesmo?"
 [24.8,'1f634','float',YT+'ui/pack_click.mp3',1], // esperando a pessoa
 [27.9,'1f62d','shake',YT+'ui/pack_click.mp3',2], // responder rápido
 [32.1,'1f91d','pop',YT+'ui/pack_click.mp3',2],   // confiança
 [37.4,'1f440','pop',YT+'ui/pack_click.mp3',1],   // interessante
 [48.9,'1f928','pop',YT+'ui/pack_click.mp3',1],   // acreditar
 [56.15,'2705','pop',YT+'ui/pack_click.mp3',2],   // decidir
 [59.05,'1f447','pop',YT+'ui/pack_click.mp3',2],  // saiba mais
];
const DENS={nenhuma:0,leve:1,media:2,muita:3};

// ---------- sons (sem whoosh) ----------
const PACKS={
 y1:{mo:null,box:null,pop:YT+'ui/pack_click.mp3',coin:YT+'dinheiro/caixa_registradora.mp3',boom:null},
 y2:{mo:YT+'ui/pack_click.mp3',box:null,pop:YT+'ui/click.mp3',coin:YT+'dinheiro/pack_moeda_mario.mp3',boom:YT+'impacto/vine_boom.mp3'},
 y3:{mo:null,box:null,pop:YT+'ui/pack_iphone.mp3',coin:YT+'dinheiro/caixa_registradora.mp3',boom:YT+'impacto/vine_boom.mp3'},
};
const PACK_NAMES={y1:'YouTube: cliques + caixa registradora',y2:'YouTube: cliques + moeda Mario + vine boom',y3:'YouTube: iPhone + caixa registradora + vine boom'};
const LEVEL={memepack:0.12,mo:0.10,box:0.15,pop:0.09,coin:0.13,meme:0.09,boom:0.15};
const GRADE={quente:'eq=saturation=1.32:contrast=1.06:brightness=0.015,colorbalance=rs=0.05:gs=0.01:bs=-0.05',vivo:'eq=saturation=1.5:contrast=1.09,colorbalance=rm=0.03:bm=0.03'};
const LIME='&H6BF3C6&',YEL='&H00E1FF&',PINK='&HB469FF&';

// ---------- memes do pack (quadrado arredondado 3D no centro, fundo desfocado) ----------
const CATALOG=require('C:/Users/rhian/Downloads/criativo/assets/memes/catalogo.json');
// [início, fim (tempo da fala original), categoria, prioridade]
const MEME_CUES=[
 [6.45,7.75,'triste',1],     // "será que eu vou receber mesmo?"
 [24.6,25.9,'espera',1],     // "esperando a pessoa ficar online"
 [48.7,49.95,'duvida',1],    // "acreditar no que eu estou falando"
 [27.4,28.65,'frustrado',2], // "torcendo para responder rápido"
 [31.9,33.0,'sucesso',2],    // "passar mais confiança"
 [55.7,56.5,'sucesso',2],    // "antes de decidir"
 [3.85,4.95,'duvida',3],     // "a primeira dúvida"
 [33.55,34.65,'danca',3],    // "pela primeira vez"
];
const MDENS={poucos:1,medios:2,muitos:3};
const LEVEL_MEMEPACK=0.16;
const peakCache={};
function peakOf(f){if(peakCache[f])return peakCache[f];
 const raw=execFileSync(ff,['-v','error','-i',f,'-t','6','-ac','1','-ar','8000','-f','f32le','-']);const a=new Float32Array(raw.buffer,raw.byteOffset,raw.length/4);
 const win=160;let best=0,bt=0;for(let i=0;i+win<a.length;i+=40){let s=0;for(let j=i;j<i+win;j++)s+=a[j]*a[j];if(s>best){best=s;bt=i}}
 const fp=require('ffprobe-static').path;let dur=a.length/8000;try{dur=+execFileSync(fp,['-v','error','-show_entries','format=duration','-of','csv=p=0',f]).toString().trim()}catch(e){}
 return peakCache[f]={peak:(bt+win/2)/8000,dur,rms:Math.max(0.05,Math.sqrt(best/win))};}

// ---------- receitas do lote 4 (feedback dos lotes 1, 2 e 3) ----------
const V=[
 {id:'v31',order:'ACDEFGHIJK',gap:0.28,dirs:STD,zoom:[1.12,1],pack:'y1',seed:31,hl:[YEL],reac:'nenhuma',memes:'medios',memeSom:true,grade:'quente',cap:'contorno'},
 {id:'v32',order:'ACDEFGHIJK',gap:0.28,dirs:['hookSite',...STD],zoom:[1.08,1,1.2],pack:'y3',seed:32,hl:[YEL],reac:'nenhuma',memes:'muitos',memeSom:true,grade:'vivo',cap:'contorno'},
 {id:'v33',order:'ACDEFGHIJK',gap:0.28,dirs:['hookSite',...STD],zoom:[1.12,1],pack:'y1',seed:33,hl:[YEL],reac:'leve',memes:'medios',memeSom:true,grade:'quente',cap:'contorno',boxLen:2.0},
 {id:'v34',order:'ACDEFGHJK',gap:0.28,dirs:STD,zoom:[1.1,1],pack:'y2',seed:34,hl:[YEL],reac:'nenhuma',memes:'muitos',memeSom:false,grade:'vivo',cap:'contorno'},
 {id:'v35',order:'ACDEFGHIJK',gap:0.28,dirs:['hookSite',...STD],zoom:[1,1.12],pack:'y3',seed:35,hl:[YEL,LIME],reac:'nenhuma',memes:'muitos',memeSom:true,grade:'quente',cap:'contorno'},
 {id:'v36',order:'ACDEFGHIJK',gap:0.2,dirs:STD,zoom:[1.12,1],pack:'y1',seed:36,hl:[YEL],reac:'nenhuma',memes:'medios',memeSom:true,grade:'vivo',cap:'contorno',boxLen:1.5},
 {id:'v37',order:'ACDEFGHIJK',gap:0.28,dirs:['hookSite',...STD],zoom:[1.08,1,1.2],pack:'y2',seed:37,hl:[YEL],reac:'leve',memes:'muitos',memeSom:false,grade:'vivo',cap:'contorno'},
 {id:'v38',order:'ACDEFGHJK',gap:0.28,dirs:STD,zoom:[1.12,1],pack:'y3',seed:38,hl:[YEL],reac:'nenhuma',memes:'medios',memeSom:true,grade:'quente',cap:'faixa'},
 {id:'v39',order:'ACDEFGHIJK',gap:0.28,dirs:['hookSite',...STD],zoom:[1,1.15],pack:'y2',seed:39,hl:[YEL],reac:'nenhuma',memes:'muitos',memeSom:true,grade:'vivo',cap:'contorno'},
 {id:'v40',order:'ACDEFGHIJK',gap:0.28,dirs:STD,zoom:[1.12,1],pack:'y1',seed:40,hl:[YEL,LIME],reac:'nenhuma',memes:'poucos',memeSom:true,grade:'quente',cap:'contorno'},
];


function rng(seed){let s=seed*2654435761%4294967296;return()=>{s=(s*1664525+1013904223)%4294967296;return s/4294967296}}

function build(R){
 const rand=rng(R.seed);const pick=a=>a[Math.floor(rand()*a.length)];const jump=R.gap!=null;
 const TMP=path.join(__dirname,'vt',R.id);fs.rmSync(TMP,{recursive:true,force:true});fs.mkdirSync(TMP,{recursive:true});
 // 1) pedaços de fala
 const pieces=[];
 for(const id of R.order){const [s0,s1]=SENT[id];const ws=W.filter(w=>w.s>=s0-0.05&&w.s<=s1);
  let cur=[ws[0]];const groups=[];
  for(let i=1;i<ws.length;i++){if(jump&&ws[i].s-ws[i-1].e>R.gap){groups.push(cur);cur=[];}cur.push(ws[i]);}groups.push(cur);
  groups.forEach(g=>pieces.push({sent:id,s:Math.max(0,g[0].s-0.07),e:Math.min(SRC_END,g[g.length-1].e+0.13)}));}
 if(!jump)for(let i=0;i<pieces.length-1;i++){const a=pieces[i],b=pieces[i+1];if(b.s>a.e&&b.s-a.e<0.7&&'ABCDEFGHIJK'.indexOf(b.sent)==='ABCDEFGHIJK'.indexOf(a.sent)+1)a.e=b.s;}
 let t=0;for(const p of pieces){p.o=t;t+=p.e-p.s;p.oe=t;}
 const TAIL=0.9,DUR=t+TAIL;
 const s2o=src=>{for(const p of pieces)if(src>=p.s-1e-6&&src<=p.e+1e-6)return p.o+(src-p.s);return null};
 const o2p=o=>pieces.find(p=>o>=p.o-1e-6&&o<p.oe-1e-6)||pieces[pieces.length-1];
 const o2s=o=>{const p=o2p(o);return Math.min(p.e,p.s+(o-p.o))};

 // 2) direções -> saída
 const used=new Set();const takeFor=wpn=>{const pool=wpn==='any'?[...TAKES.godhuman,...TAKES.cdk,...TAKES['soul guitar']]:TAKES[wpn];
  let cand=pool.filter(x=>!used.has(x));if(!cand.length)cand=pool;const x=pick(cand);used.add(x);return x};
 let vis=[];
 for(const name of R.dirs){const d=DIR[name];const parts=pieces.filter(p=>p.e>d.s&&p.s<d.e);if(!parts.length)continue;
  let oS=Infinity,oE=-Infinity;for(const p of parts){oS=Math.min(oS,p.o+Math.max(0,d.s-p.s));oE=Math.max(oE,p.o+(Math.min(d.e,p.e)-p.s));}
  if(d.e>=99)oE=DUR;
  if(d.v==='mo'){oE=Math.min(oE,oS+CLIPLEN[d.clip]+(d.e>=99?9:0));vis.push({k:'mo',clip:d.clip,oS,oE});}
  else if(d.v==='box')vis.push({k:'box',take:takeFor(d.wpn),oS,oE});
  else{const L=R.boxLen||1.8;const n=Math.max(1,Math.round((oE-oS)/L));const ws=['godhuman','cdk','soul guitar'];let k=Math.floor(rand()*3);
   for(let i=0;i<n;i++)vis.push({k:'box',take:takeFor(ws[(k+i)%3]),oS:oS+(oE-oS)*i/n,oE:oS+(oE-oS)*(i+1)/n});}}
 // memes: só entram onde não tem animação nem gameplay
 const usedM=new Set();
 for(const [ms,me,cat,prio] of MEME_CUES){if(prio>MDENS[R.memes])continue;const near=(x,dir)=>{let v=s2o(x);if(v!=null)return v;for(const p of pieces){if(dir<0&&p.s<=x&&x>p.e)v=p.oe;if(dir>0&&p.s>x&&v==null)v=p.o;}return v;};const a=near(ms,1),b=near(me,-1);if(a==null||b==null||b-a<0.6)continue;
  if(vis.some(v=>v.oS<b+0.1&&v.oE>a-0.1))continue;const C=CATALOG.categorias[cat];
  let cand=C.memes.filter(m=>!usedM.has(m.id));if(!cand.length)cand=C.memes;const m=pick(cand);usedM.add(m.id);
  vis.push({k:'meme',cat,meme:m,audio:pick(C.audios),oS:a,oE:b});}
 vis.sort((a,b)=>a.oS-b.oS);
 const ENTRIES=['flip','rise','pop','swing'];let bi=Math.floor(rand()*4);
 for(const v of vis)if(v.k==='box'||v.k==='meme'){v.pose=bi%2?1:-1;v.entry=ENTRIES[(bi+Math.floor(rand()*2))%4];bi++;}
 const full=[];let cur=0;for(const v of vis){if(v.oS<cur)v.oS=cur;if(v.oE-v.oS<0.2)continue;if(v.oS>cur+0.02)full.push({k:'th',oS:cur,oE:v.oS});full.push(v);cur=v.oE;}
 if(cur<DUR-0.02)full.push({k:'th',oS:cur,oE:DUR});
 const cuts=pieces.map(p=>p.o).slice(1);const shots=[];
 for(const v of full){let a=v.oS;const cs=cuts.filter(c=>c>v.oS+0.05&&c<v.oE-0.05);for(const c of [...cs,v.oE]){shots.push({...v,oS:a,oE:c,off:a-v.oS,first:a===v.oS});a=c;}}
 let zi=0;for(const s of shots)if(s.k==='th'){s.z=R.zoom[zi%R.zoom.length];zi++;}
 const shotAt=o=>shots.find(s=>o>=s.oS&&o<s.oE);

 // 3) render dos shots (com correção de cor nela)
 const G=GRADE[R.grade];
 const thCrop=z=>{const w=Math.round(1080/z/2)*2,h=Math.round(1920/z/2)*2;return `crop=${w}:${h}:${(1080-w)/2}:${Math.round((1920-h)*0.3)},scale=1080:1920:flags=lanczos`};
 const list=[],gameAudio=[];
 shots.forEach((s,i)=>{const n=fr(s.oE)-fr(s.oS);if(n<=0)return;const o=path.join(TMP,`s${String(i).padStart(3,'0')}.mp4`);const src=o2s(s.oS);let args;
  if(s.k==='th')args=['-ss',src.toFixed(3),'-i',BASE,'-vf',`${thCrop(s.z)},${G},fps=30,setsar=1`];
  else if(s.k==='mo')args=['-ss',s.off.toFixed(3),'-i',`${MO}/${s.clip}.mp4`,'-vf','fps=30,tpad=stop_mode=clone:stop_duration=10,setsar=1'];
  else if(s.k==='meme'){ // meme no quadrado 3D arredondado, centro, com ela desfocada atrás
   const fd=path.join(TMP,`bf${i}`),od=path.join(TMP,`bo${i}`);fs.mkdirSync(fd);fs.mkdirSync(od);const file=CATALOG.pasta+'/'+s.meme.arquivo;
   const inArgs=s.meme.tipo==='video'?['-stream_loop','-1','-ss',(0.1+s.off).toFixed(3),'-i',file]:['-loop','1','-i',file];
   run([...inArgs,'-frames:v',String(n),'-vf',"fps=30,crop='min(iw,ih)':'min(iw,ih)',scale=860:860:flags=lanczos,setsar=1",'-q:v','2',path.join(fd,'f%04d.jpg')]);
   execFileSync('node',[path.join(__dirname,'box3d.js'),JSON.stringify({frames:fd,out:od,n:fs.readdirSync(fd).length,entry:s.entry,pose:s.pose,off:s.off})],{stdio:'inherit'});
   args=['-ss',src.toFixed(3),'-i',BASE,'-framerate','30','-i',path.join(od,'o%04d.png'),'-filter_complex',
    `[0:v]${thCrop(1)},${G},fps=30,gblur=sigma=28,eq=brightness=-0.1[bg];[1:v]tpad=stop_mode=clone:stop_duration=2[fg];[bg][fg]overlay=0:0,setsar=1[out]`,'-map','[out]'];}
  else{const gss=0.9+s.off;
   const fd=path.join(TMP,`bf${i}`),od=path.join(TMP,`bo${i}`);fs.mkdirSync(fd);fs.mkdirSync(od);
   run(['-ss',gss.toFixed(3),'-i',`${MV}/${s.take}`,'-frames:v',String(n),'-vf','fps=30,crop=980:980:1220:330,scale=860:860:flags=lanczos,eq=saturation=1.25:contrast=1.05','-q:v','2',path.join(fd,'f%04d.jpg')]);
   execFileSync('node',[path.join(__dirname,'box3d.js'),JSON.stringify({frames:fd,out:od,n:fs.readdirSync(fd).length,entry:s.entry,pose:s.pose,off:s.off})],{stdio:'inherit'});
   args=['-ss',src.toFixed(3),'-i',BASE,'-framerate','30','-i',path.join(od,'o%04d.png'),'-filter_complex',
    `[0:v]${thCrop(1)},${G},fps=30,gblur=sigma=28,eq=brightness=-0.1[bg];[1:v]tpad=stop_mode=clone:stop_duration=2[fg];[bg][fg]overlay=0:0,setsar=1[out]`,'-map','[out]'];
   const wav=path.join(TMP,`g${i}.wav`);execFileSync(ff,['-v','error','-y','-ss',gss.toFixed(3),'-i',`${MV}/${s.take}`,'-t',(s.oE-s.oS).toFixed(3),'-vn','-ac','2','-ar','48000','-af',`afade=t=in:d=0.03,afade=t=out:st=${Math.max(0,s.oE-s.oS-0.05).toFixed(3)}:d=0.05`,wav]);
   gameAudio.push([wav,s.oS]);}
  run([...args,'-frames:v',String(n),'-an','-c:v','libx264','-crf','18','-preset','fast','-pix_fmt','yuv420p',o]);
  list.push(`file '${o.split(path.sep).join('/')}'`);});
 fs.writeFileSync(path.join(TMP,'list.txt'),list.join('\n'));
 run(['-f','concat','-safe','0','-i',path.join(TMP,'list.txt'),'-c','copy',path.join(TMP,'video.mp4')]);

 // 4) reações (não aparecem em cima dos quadrados de gameplay)
 const reac=[];let side=Math.floor(rand()*2);
 for(const [st,emoji,style,snd,prio] of CUES){if(prio>DENS[R.reac])continue;const o=s2o(st);if(o==null)continue;
  const sh=shotAt(o);if(!sh||sh.k==='box'||sh.k==='meme')continue;const dur=style==='dance'?Math.min(1.8,DUR-o-0.05):1.3;if(dur<0.6)continue;
  if(reac.length&&o-reac[reac.length-1].o<1.2)continue;
  const tilt=Math.round((rand()-0.5)*16);const sc=0.62;
  const x=Math.round(540-240*sc),y=1130;
  side^=1;reac.push({o,emoji,style,snd,dur,tilt,sc,x:Math.round(x),y});}
 if(reac.length)execFileSync('node',[path.join(__dirname,'sticker.js'),JSON.stringify(reac.map(r=>({emoji:r.emoji,style:r.style,dur:r.dur,tilt:r.tilt})))],{stdio:'inherit'});
 const stkDir=r=>path.join(__dirname,'stk',`${r.emoji}_${r.style}_${Math.round(r.dur*30)}_${r.tilt}`);

 // 5) legendas
 const inBox=o=>shots.some(s=>(s.k==='box'||s.k==='meme')&&o>=s.oS-0.03&&o<s.oE);
 const ws=[];for(const p of pieces)for(const w of W)if(w.s>=p.s&&w.s<p.e)ws.push({...w,o:p.o+(w.s-p.s),oe:p.o+(Math.min(w.e,p.e)-p.s)});
 const groups=[];let g=[];
 ws.forEach((w,i)=>{g.push(w);const txt=g.map(x=>x.t).join(' ');const nx=ws[i+1];
  if(/[.,?!]$/.test(w.t)||!nx||txt.length>=12||g.length>=3||nx.o-w.oe>0.25||inBox(nx.o)!==inBox(w.o)){groups.push(g);g=[];}});
 const HL=/^(GODHUMAN|CDK|SOUL|GUITAR|BASIC-BUILD|FEEDBACKS|AUTOMÁTICA|RAÇA|V4|MÍSTICAS|CONFIANÇA|BLOX|FRUITS|SAIBA|PIX|RECEBER|MESMO\?|WHATSAPP|RÁPIDO|INTERESSANTE|DECIDIR|TIKTOK)$/;
 const ts=t=>{const h=Math.floor(t/3600),m=Math.floor(t%3600/60),s=(t%60).toFixed(2).padStart(5,'0');return `${h}:${String(m).padStart(2,'0')}:${s}`};
 const style=R.cap==='faixa'
  ?`Style: C,Sniglet,92,&H00FFFFFF,&H00FFFFFF,&H28111111,&H00000000,-1,0,0,0,100,100,0,0,3,18,0,5,70,70,0,1`
  :`Style: C,Sniglet,100,&H00FFFFFF,&H00FFFFFF,&H00000000,&H8C000000,-1,0,0,0,100,100,0,0,1,10,6,5,70,70,0,1`;
 let ass=`[Script Info]\nScriptType: v4.00+\nPlayResX: 1080\nPlayResY: 1920\nWrapStyle: 0\n\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\n${style}\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n`;
 let hi=0;
 groups.forEach((g,i)=>{if(inBox(g[0].o))return;const s=g[0].o,nx=groups[i+1];const e=Math.min(nx?nx[0].o:g[g.length-1].oe+0.4,g[g.length-1].oe+0.6,DUR);
  const txt=g.map(w=>{const u=w.t.toUpperCase().replace(/[.,!]$/,'');if(HL.test(u)||HL.test(u.replace(/\?$/,''))){const c=R.hl[hi++%R.hl.length];return `{\\c${c}}${u}{\\c&HFFFFFF&}`}return u}).join(' ');
  ass+=`Dialogue: 1,${ts(s)},${ts(e)},C,,0,0,0,,{\\pos(540,1470)\\fscx80\\fscy80\\t(0,80,\\fscx106\\fscy106)\\t(80,150,\\fscx100\\fscy100)}${txt}\n`;});
 fs.writeFileSync(path.join(TMP,'legenda.ass'),ass);

 // 6) sons
 const P=PACKS[R.pack];const ev=[];
 const add=(f,at,cat,start)=>{if(!f)return;const pk=PEAKS[f]||peakOf(f);if(start){ev.push({f,t:at,gain:+Math.min(2.5,LEVEL[cat]/pk.rms).toFixed(3),len:Math.min(pk.dur,start)});return;}const gain=Math.min(2.5,LEVEL[cat]/pk.rms);ev.push({f,t:at-pk.peak,gain:+gain.toFixed(3),len:Math.min(pk.dur,cat==='meme'?2.2:pk.peak+0.9)});};
 shots.forEach((s,i)=>{if(!s.first||i===0)return;const prev=shots[i-1];
  if(s.k==='mo')add(P.mo,s.oS,'mo');else if(s.k==='box'&&prev.k!=='box')add(P.box,s.oS,'box');});
 const items={brand_feedback:[0.35,0.7],brand_entrega:[0.25,0.75,1.3],brand_cta:[0.35,0.75,1.4]};
 shots.filter(s=>s.k==='mo'&&s.first).forEach(s=>{(items[s.clip]||[]).forEach(x=>{if(s.oS+x<s.oE)add(P.pop,s.oS+x,'pop')});
  if(s.clip==='brand_cta')add(P.coin,s.oS+0.35,'coin');});
 {const g=shots.find(x=>x.k==='box'&&x.first&&x.oS>DUR*0.4);if(P.boom&&g)add(P.boom,g.oS,'boom');}
 reac.forEach(r=>add(r.snd,r.o+0.12,'meme'));
 shots.filter(s=>s.k==='meme'&&s.first).forEach(s=>{const all=shots.filter(x=>x.k==='meme'&&x.meme===s.meme);if(R.memeSom!==false)add(s.audio.includes(':')?s.audio:CATALOG.pasta+'/'+s.audio,s.oS,'memepack',Math.min(1.6,all[all.length-1].oE-s.oS+0.1));});
 const ins=['-i',path.join(TMP,'video.mp4'),'-i',BASE];
 ev.forEach(e=>ins.push('-i',e.f.includes(':')?e.f:`${SFX}/${e.f}`));gameAudio.forEach(([w])=>ins.push('-i',w));
 const nA=2+ev.length+gameAudio.length;
 reac.forEach(r=>ins.push('-framerate','30','-itsoffset',r.o.toFixed(3),'-i',path.join(stkDir(r),'s%04d.png')));
 const esc=p=>p.split(path.sep).join('/').replace(':','\\:');
 let fc='',vl='[0:v]';
 reac.forEach((r,j)=>{fc+=`[${nA+j}:v]scale=${Math.round(480*r.sc)}:-1[k${j}];${vl}[k${j}]overlay=${r.x}:${r.y}:eof_action=pass[v${j}];`;vl=`[v${j}]`;});
 fc+=`${vl}subtitles=filename='${esc(path.join(TMP,'legenda.ass'))}':fontsdir='${esc(FONTS)}'[v];`;
 pieces.forEach((p,i)=>{fc+=`[1:a]atrim=${p.s.toFixed(3)}:${p.e.toFixed(3)},asetpts=PTS-STARTPTS,aresample=48000,afade=t=in:d=0.015,afade=t=out:st=${(p.e-p.s-0.02).toFixed(3)}:d=0.02[p${i}];`;});
 fc+=`${pieces.map((_,i)=>`[p${i}]`).join('')}concat=n=${pieces.length}:v=0:a=1,apad=pad_dur=${TAIL+0.2},loudnorm=I=-15:TP=-1.5,aresample=48000[voz];`;
 const labs=[];
 ev.forEach((e,i)=>{const ms=Math.max(0,Math.round(e.t*1000));fc+=`[${i+2}:a]aresample=48000,atrim=0:${e.len.toFixed(3)},afade=t=out:st=${Math.max(0,e.len-0.2).toFixed(3)}:d=0.2,volume=${e.gain},adelay=${ms}|${ms}[e${i}];`;labs.push(`[e${i}]`);});
 gameAudio.forEach(([,at],j)=>{const ms=Math.round(at*1000);fc+=`[${ev.length+2+j}:a]volume=0.45,adelay=${ms}|${ms}[g${j}];`;labs.push(`[g${j}]`);});
 fc+=`[voz]${labs.join('')}amix=inputs=${labs.length+1}:normalize=0:duration=first,alimiter=limit=0.95[a]`;
 const OUT=`${OUTDIR}/criativo_${R.id}.mp4`;
 run([...ins,'-filter_complex',fc,'-map','[v]','-map','[a]','-t',DUR.toFixed(3),'-c:v','libx264','-crf','19','-preset','medium','-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-movflags','+faststart',OUT]);
 const desc={id:R.id,lote:4,memes:shots.filter(s=>s.k==='meme'&&s.first).map(s=>s.meme.id),duracao:+DUR.toFixed(2),ordem:R.order,reacoes:reac.map(r=>r.emoji),sons:ev.length,takes:[...used]};
 console.log(JSON.stringify(desc));return desc;
}
if(process.argv[2]==='--receitas'){fs.writeFileSync(path.join(OUTDIR,'_receitas_lote4.json'),JSON.stringify(V.map(R=>({...R,lote:4,jump:R.gap!=null,packName:PACK_NAMES[R.pack]})),null,1));process.exit(0);}
const which=process.argv[2]||'all';const res=[];
for(const R of V)if(which==='all'||which.split(',').includes(R.id))res.push(build(R));
fs.writeFileSync(path.join(OUTDIR,'_resumo_lote4_'+which.replace(/,/g,'_')+'.json'),JSON.stringify(res,null,1));
