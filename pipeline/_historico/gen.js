// Gera variações do criativo a partir de receitas (ordem das falas, cortes, takes, zooms, sons)
// uso: node gen.js <idVariacao|all>
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

// ---------- takes de gameplay ----------
const TAKES={};
for(const wpn of ['godhuman','cdk','soul guitar'])for(const sk of fs.readdirSync(path.join(MV,wpn)))for(const f of fs.readdirSync(path.join(MV,wpn,sk)))
 (TAKES[wpn]=TAKES[wpn]||[]).push(`${wpn}/${sk}/${f}`);
// takes ruins (câmera colada no personagem)
const BAD=['godhuman/Z - Soaring Beast/08-01-35_z_2.mp4'];
for(const k in TAKES)TAKES[k]=TAKES[k].filter(t=>!BAD.includes(t)).sort();

// ---------- direções visuais (em tempo da fala original) ----------
// tipo mo = animação em tela cheia, box = gameplay no quadrado, montage = vários quadrados seguidos
const DIR={
 hook:{s:2.1,e:3.5,v:'box',wpn:'any'},
 brandFb:{s:11.2,e:12.42,v:'mo',clip:'brand_feedback'},
 siteFb:{s:12.42,e:17.0,v:'mo',clip:'site_feedback'},
 siteFbLong:{s:11.2,e:15.9,v:'mo',clip:'site_feedback'},
 entrega:{s:20.7,e:23.3,v:'mo',clip:'brand_entrega'},
 siteTop:{s:34.7,e:38.3,v:'mo',clip:'site_top'},
 gh:{s:38.3,e:39.04,v:'box',wpn:'godhuman'},
 cdk:{s:39.04,e:39.76,v:'box',wpn:'cdk'},
 sg:{s:39.76,e:40.5,v:'box',wpn:'soul guitar'},
 montage:{s:40.5,e:46.8,v:'montage'},
 montageShort:{s:40.5,e:43.0,v:'montage'},
 siteFb2:{s:50.55,e:53.95,v:'mo',clip:'site_feedback2'},
 siteFb2Early:{s:47.1,e:50.4,v:'mo',clip:'site_feedback2'},
 siteCta:{s:56.55,e:59.0,v:'mo',clip:'site_cta'},
 brandCta:{s:59.0,e:99,v:'mo',clip:'brand_cta'},
 brandCtaLong:{s:56.55,e:99,v:'mo',clip:'brand_cta'},
};
const CLIPLEN={brand_feedback:1.5,site_feedback:4.5,brand_entrega:2.6,site_top:3.6,site_feedback2:3.4,site_cta:2.5,brand_cta:3.47};

// ---------- pacotes de som ----------
const PACKS={
 a:{whoosh:['whoosh/small_sweep.mp3','whoosh/air_sweep.mp3'],hit:'impacto/short_bass_hit.mp3',pop:'pop/bubble_pop.mp3',coin:'dinheiro/gold_coin_prize.mp3',notif:'notificacao/positive.mp3',zoom:null},
 b:{whoosh:['whoosh/fast_transition.mp3','whoosh/cinematic_fast.mp3'],hit:'impacto/whoosh_impact.mp3',pop:'pop/dry_pop.mp3',coin:'dinheiro/winning_coin.mp3',notif:'notificacao/unlock.mp3',zoom:'whoosh/fast_swoosh.mp3'},
 c:{whoosh:['whoosh/fast_sweep.mp3','whoosh/small_sweep.mp3'],hit:'impacto/cool_impact.mp3',pop:'pop/light_pop_whoosh.mp3',coin:'dinheiro/magical_coin_win.mp3',notif:'notificacao/scifi_confirm.mp3',zoom:null},
 d:{whoosh:['whoosh/air_woosh.mp3','whoosh/fast_swoosh.mp3'],hit:'impacto/short_bass_hit.mp3',pop:'pop/hard_pop_click.mp3',coin:'dinheiro/gold_coin_prize.mp3',notif:'notificacao/unlock_item.mp3',zoom:'whoosh/fast_swoosh.mp3'},
 e:{whoosh:['transicao/air_zoom_vacuum.mp3','whoosh/small_sweep.mp3'],hit:'impacto/whoosh_impact.mp3',pop:'pop/bubble_pop.mp3',coin:'dinheiro/winning_coin.mp3',notif:'notificacao/positive.mp3',zoom:null},
};
const LEVEL={whoosh:0.16,hit:0.22,pop:0.14,coin:0.12,notif:0.12,zoom:0.07};

// ---------- receitas das 10 variações ----------
const V=[
 {id:'v01',order:'ABCDEFGHIJK',jump:false,dirs:['hook','brandFb','siteFb','entrega','siteTop','gh','cdk','sg','montage','siteFb2','siteCta','brandCta'],zoom:[1,1.12],pack:'a',seed:1,hl:'&H6BF3C6&'},
 {id:'v02',order:'ACDEFGHIJK',jump:true,dirs:['hook','brandFb','siteFb','entrega','siteTop','gh','cdk','sg','montage','siteFb2','siteCta','brandCta'],zoom:[1.08,1,1.2],pack:'b',seed:2,hl:'&H00E1FF&'},
 {id:'v03',order:'HACDEJK',jump:true,dirs:['gh','cdk','sg','montageShort','brandFb','siteFb','entrega','siteFb2','siteCta','brandCta'],zoom:[1,1.15],pack:'c',seed:3,hl:'&H6BF3C6&'},
 {id:'v04',order:'ACEGHJK',jump:true,dirs:['hook','brandFb','siteFb','entrega','siteTop','gh','cdk','sg','montage','siteFb2','siteCta','brandCta'],zoom:[1.12,1],pack:'d',seed:4,hl:'&H6BF3C6&'},
 {id:'v05',order:'ABCEGHIJK',jump:false,dirs:['brandFb','siteFb','entrega','siteTop','gh','cdk','sg','montage','siteFb2Early','siteCta','brandCta'],zoom:[1,1.1,1.22],pack:'e',seed:5,hl:'&H00E1FF&'},
 {id:'v06',order:'HACEK',jump:true,dirs:['gh','cdk','sg','montage','siteFbLong','entrega','brandCtaLong'],zoom:[1.1,1],pack:'b',seed:6,hl:'&H6BF3C6&'},
 {id:'v07',order:'ABCDEFGHIJK',jump:true,dirs:['brandFb','siteFb','entrega','siteTop','gh','cdk','sg','montage','siteFb2','siteCta','brandCta'],zoom:[1,1.18],pack:'c',seed:7,hl:'&H6BF3C6&'},
 {id:'v08',order:'ACDGHEFIJK',jump:true,dirs:['hook','siteFbLong','siteTop','gh','cdk','sg','montage','entrega','siteFb2','siteCta','brandCta'],zoom:[1.15,1],pack:'a',seed:8,hl:'&H00E1FF&'},
 {id:'v09',order:'AGHCEJK',jump:true,dirs:['siteTop','gh','cdk','sg','montage','brandFb','siteFb','entrega','siteFb2','siteCta','brandCta'],zoom:[1,1.12,1.25],pack:'d',seed:9,hl:'&H6BF3C6&'},
 {id:'v10',order:'ABCDEFGHIJK',jump:true,dirs:['hook','brandFb','siteFb','entrega','siteTop','gh','cdk','sg','montage','siteFb2','siteCta','brandCta'],zoom:[1.1,1],pack:'e',seed:10,hl:'&H6BF3C6&',boxLen:0.9},
];

function rng(seed){let s=seed*2654435761%4294967296;return()=>{s=(s*1664525+1013904223)%4294967296;return s/4294967296}}

function build(R){
 const rand=rng(R.seed);const pick=a=>a[Math.floor(rand()*a.length)];
 const TMP=path.join(__dirname,'vt',R.id);fs.rmSync(TMP,{recursive:true,force:true});fs.mkdirSync(TMP,{recursive:true});
 // 1) pedaços de fala (tempo da fala original), na ordem da receita
 const pieces=[];
 for(const id of R.order){const [s0,s1]=SENT[id];const ws=W.filter(w=>w.s>=s0-0.05&&w.s<=s1);
  let cur=[ws[0]];const groups=[];
  for(let i=1;i<ws.length;i++){if(R.jump&&ws[i].s-ws[i-1].e>0.28){groups.push(cur);cur=[];}cur.push(ws[i]);}groups.push(cur);
  groups.forEach(g=>pieces.push({sent:id,s:Math.max(0,g[0].s-0.07),e:Math.min(SRC_END,g[g.length-1].e+0.13)}));}
 // sem jump cut: mantém a pausa natural entre frases seguidas do original
 if(!R.jump)for(let i=0;i<pieces.length-1;i++){const a=pieces[i],b=pieces[i+1];if(b.s>a.e&&b.s-a.e<0.7&&R.order.indexOf(b.sent)===R.order.indexOf(a.sent)+1&&'ABCDEFGHIJK'.indexOf(b.sent)==='ABCDEFGHIJK'.indexOf(a.sent)+1){a.e=b.s;}}
 let t=0;for(const p of pieces){p.o=t;t+=p.e-p.s;p.oe=t;}
 const TAIL=0.7,DUR=t+TAIL;
 const s2o=src=>{for(const p of pieces)if(src>=p.s-1e-6&&src<=p.e+1e-6)return p.o+(src-p.s);return null};
 const o2p=o=>pieces.find(p=>o>=p.o-1e-6&&o<p.oe-1e-6)||pieces[pieces.length-1];
 const o2s=o=>{const p=o2p(o);return Math.min(p.e,p.s+(o-p.o))};

 // 2) direções -> intervalos na saída
 const used=new Set();const takeFor=wpn=>{const pool=wpn==='any'?[...TAKES.godhuman,...TAKES.cdk,...TAKES['soul guitar']]:TAKES[wpn];
  let cand=pool.filter(x=>!used.has(x));if(!cand.length)cand=pool;const x=pick(cand);used.add(x);return x};
 let vis=[];
 for(const name of R.dirs){const d=DIR[name];const parts=pieces.filter(p=>p.e>d.s&&p.s<d.e);if(!parts.length)continue;
  let oS=Infinity,oE=-Infinity;for(const p of parts){oS=Math.min(oS,p.o+Math.max(0,d.s-p.s));oE=Math.max(oE,p.o+(Math.min(d.e,p.e)-p.s));}
  if(d.e>=99)oE=DUR;
  if(d.v==='mo'){oE=Math.min(oE,oS+CLIPLEN[d.clip]+(d.e>=99?9:0));vis.push({k:'mo',clip:d.clip,oS,oE});}
  else if(d.v==='box')vis.push({k:'box',take:takeFor(d.wpn),oS,oE});
  else{const L=R.boxLen||1.2;const n=Math.max(1,Math.round((oE-oS)/L));const ws=['godhuman','cdk','soul guitar'];let k=Math.floor(rand()*3);
   for(let i=0;i<n;i++)vis.push({k:'box',take:takeFor(ws[(k+i)%3]),oS:oS+(oE-oS)*i/n,oE:oS+(oE-oS)*(i+1)/n});}}
 vis.sort((a,b)=>a.oS-b.oS);
 const ENTRIES=R.entries||['flip','rise','pop','swing'];let bi=Math.floor(rand()*4);
 for(const v of vis)if(v.k==='box'){v.pose=bi%2?1:-1;v.entry=ENTRIES[(bi+Math.floor(rand()*2))%ENTRIES.length];bi++;}
 // resolve sobreposições e preenche buracos com ela falando
 const full=[];let cur=0;for(const v of vis){if(v.oS<cur)v.oS=cur;if(v.oE-v.oS<0.2)continue;if(v.oS>cur+0.02)full.push({k:'th',oS:cur,oE:v.oS});full.push(v);cur=v.oE;}
 if(cur<DUR-0.02)full.push({k:'th',oS:cur,oE:DUR});
 // 3) quebra nos cortes da fala (jump cuts) -> shots
 const cuts=pieces.map(p=>p.o).slice(1);const shots=[];
 for(const v of full){let a=v.oS;const cs=cuts.filter(c=>c>v.oS+0.05&&c<v.oE-0.05);for(const c of [...cs,v.oE]){shots.push({...v,oS:a,oE:c,off:a-v.oS,first:a===v.oS});a=c;}}
 // zoom: troca a cada shot novo dela falando
 let zi=0;for(const s of shots)if(s.k==='th'){s.z=R.zoom[zi%R.zoom.length];zi++;}

 // 4) render dos shots
 const thCrop=z=>{const w=Math.round(1080/z/2)*2,h=Math.round(1920/z/2)*2;return `crop=${w}:${h}:${(1080-w)/2}:${Math.round((1920-h)*0.3)},scale=1080:1920:flags=lanczos`};
 const list=[],gameAudio=[];
 shots.forEach((s,i)=>{const n=fr(s.oE)-fr(s.oS);if(n<=0)return;const o=path.join(TMP,`s${String(i).padStart(3,'0')}.mp4`);const src=o2s(s.oS);let args;
  if(s.k==='th')args=['-ss',src.toFixed(3),'-i',BASE,'-vf',`${thCrop(s.z)},fps=30,setsar=1`];
  else if(s.k==='mo')args=['-ss',s.off.toFixed(3),'-i',`${MO}/${s.clip}.mp4`,'-vf','fps=30,tpad=stop_mode=clone:stop_duration=10,setsar=1'];
  else{const gss=0.9+s.off;
   // quadrado 3D: frames da gameplay -> página com perspectiva -> PNGs transparentes
   const fd=path.join(TMP,`bf${i}`),od=path.join(TMP,`bo${i}`);fs.mkdirSync(fd);fs.mkdirSync(od);
   run(['-ss',gss.toFixed(3),'-i',`${MV}/${s.take}`,'-frames:v',String(n),'-vf','fps=30,crop=980:980:1220:330,scale=860:860:flags=lanczos,eq=saturation=1.15','-q:v','2',path.join(fd,'f%04d.jpg')]);
   const got=fs.readdirSync(fd).length;
   execFileSync('node',[path.join(__dirname,'box3d.js'),JSON.stringify({frames:fd,out:od,n:got,entry:s.entry,pose:s.pose,off:s.off})],{stdio:'inherit'});
   args=['-ss',src.toFixed(3),'-i',BASE,'-framerate','30','-i',path.join(od,'o%04d.png'),'-filter_complex',
    `[0:v]${thCrop(1)},fps=30,gblur=sigma=28,eq=brightness=-0.12:saturation=0.9[bg];`+
    `[1:v]tpad=stop_mode=clone:stop_duration=2[fg];[bg][fg]overlay=0:0,setsar=1[out]`,'-map','[out]'];
   const wav=path.join(TMP,`g${i}.wav`);execFileSync(ff,['-v','error','-y','-ss',gss.toFixed(3),'-i',`${MV}/${s.take}`,'-t',(s.oE-s.oS).toFixed(3),'-vn','-ac','2','-ar','48000','-af',`afade=t=in:d=0.03,afade=t=out:st=${Math.max(0,s.oE-s.oS-0.05).toFixed(3)}:d=0.05`,wav]);
   gameAudio.push([wav,s.oS]);}
  run([...args,'-frames:v',String(n),'-an','-c:v','libx264','-crf','18','-preset','fast','-pix_fmt','yuv420p',o]);
  list.push(`file '${o.split(path.sep).join('/')}'`);});
 fs.writeFileSync(path.join(TMP,'list.txt'),list.join('\n'));
 run(['-f','concat','-safe','0','-i',path.join(TMP,'list.txt'),'-c','copy',path.join(TMP,'video.mp4')]);

 // 5) legendas (sem legenda nos quadrados de gameplay)
 const inBox=o=>shots.some(s=>s.k==='box'&&o>=s.oS-0.03&&o<s.oE);
 const ws=[];for(const p of pieces)for(const w of W)if(w.s>=p.s&&w.s<p.e)ws.push({...w,o:p.o+(w.s-p.s),oe:p.o+(Math.min(w.e,p.e)-p.s)});
 const groups=[];let g=[];
 ws.forEach((w,i)=>{g.push(w);const txt=g.map(x=>x.t).join(' ');const nx=ws[i+1];
  if(/[.,?!]$/.test(w.t)||!nx||txt.length>=12||g.length>=3||nx.o-w.oe>0.25||inBox(nx.o)!==inBox(w.o)){groups.push(g);g=[];}});
 const HL=/^(GODHUMAN|CDK|SOUL|GUITAR|BASIC-BUILD|FEEDBACKS|AUTOMÁTICA|RAÇA|V4|MÍSTICAS|CONFIANÇA|BLOX|FRUITS|SAIBA|PIX)$/;
 const ts=t=>{const h=Math.floor(t/3600),m=Math.floor(t%3600/60),s=(t%60).toFixed(2).padStart(5,'0');return `${h}:${String(m).padStart(2,'0')}:${s}`};
 let ass=`[Script Info]\nScriptType: v4.00+\nPlayResX: 1080\nPlayResY: 1920\nWrapStyle: 0\n\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\n`+
  `Style: C,Sniglet,100,&H00FFFFFF,&H00FFFFFF,&H00000000,&H8C000000,-1,0,0,0,100,100,0,0,1,10,6,5,70,70,0,1\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n`;
 groups.forEach((g,i)=>{if(inBox(g[0].o))return;const s=g[0].o,nx=groups[i+1];const e=Math.min(nx?nx[0].o:g[g.length-1].oe+0.4,g[g.length-1].oe+0.6,DUR);
  const txt=g.map(w=>{const u=w.t.toUpperCase().replace(/[.,!]$/,'');return HL.test(u.replace(/\?$/,''))?`{\\c${R.hl}}${u}{\\c&HFFFFFF&}`:u}).join(' ');
  ass+=`Dialogue: 1,${ts(s)},${ts(e)},C,,0,0,0,,{\\pos(540,1470)\\fscx80\\fscy80\\t(0,80,\\fscx106\\fscy106)\\t(80,150,\\fscx100\\fscy100)}${txt}\n`;});
 fs.writeFileSync(path.join(TMP,'legenda.ass'),ass);

 // 6) sons: poucos e no lugar certo (pico do som alinhado com o corte)
 const P=PACKS[R.pack];const ev=[];const add=(f,at,cat)=>{if(!f)return;const pk=PEAKS[f];const gain=Math.min(2.5,LEVEL[cat]/pk.rms);ev.push({f,t:at-pk.peak,gain:+gain.toFixed(3),len:Math.min(pk.dur,pk.peak+0.9)});};
 let wi=0;shots.forEach((s,i)=>{if(!s.first||i===0)return;const prev=shots[i-1];
  if(s.k==='mo')add(P.whoosh[wi++%2],s.oS,'whoosh');
  else if(s.k==='box'&&prev.k!=='box')add(P.hit,s.oS,'hit');
  else if(s.k==='box')add(P.whoosh[wi++%2],s.oS,'whoosh');
  else if(prev.k!=='th')add(P.whoosh[wi++%2],s.oS,'whoosh');
  else if(P.zoom&&s.z!==prev.z)add(P.zoom,s.oS,'zoom');});
 const items={brand_feedback:[0.35,0.7],brand_entrega:[0.25,0.75,1.3],brand_cta:[0.35,0.75,1.4]};
 shots.filter(s=>s.k==='mo'&&s.first).forEach(s=>{(items[s.clip]||[]).forEach(x=>{if(s.oS+x<s.oE)add(P.pop,s.oS+x,'pop')});
  if(s.clip==='brand_cta')add(P.coin,s.oS+0.35,'coin');if(s.clip==='site_cta')add(P.coin,s.oS+1.2,'coin');
  if(s.clip==='site_feedback'||s.clip==='site_feedback2')add(P.notif,s.oS+0.6,'notif');});
 const ins=['-i',path.join(TMP,'video.mp4'),'-i',BASE];
 ev.forEach(e=>ins.push('-i',`${SFX}/${e.f}`));gameAudio.forEach(([w])=>ins.push('-i',w));
 const esc=p=>p.split(path.sep).join('/').replace(':','\\:');
 // voz: concatena os pedaços com micro-fade para não estalar
 let fc=`[0:v]subtitles=filename='${esc(path.join(TMP,'legenda.ass'))}':fontsdir='${esc(FONTS)}'[v];`;
 pieces.forEach((p,i)=>{fc+=`[1:a]atrim=${p.s.toFixed(3)}:${p.e.toFixed(3)},asetpts=PTS-STARTPTS,aresample=48000,afade=t=in:d=0.015,afade=t=out:st=${(p.e-p.s-0.02).toFixed(3)}:d=0.02[p${i}];`;});
 fc+=`${pieces.map((_,i)=>`[p${i}]`).join('')}concat=n=${pieces.length}:v=0:a=1,apad=pad_dur=${TAIL+0.2},loudnorm=I=-15:TP=-1.5,aresample=48000[voz];`;
 const labs=[];
 ev.forEach((e,i)=>{const ms=Math.max(0,Math.round(e.t*1000));fc+=`[${i+2}:a]aresample=48000,atrim=0:${e.len.toFixed(3)},afade=t=out:st=${Math.max(0,e.len-0.15).toFixed(3)}:d=0.15,volume=${e.gain},adelay=${ms}|${ms}[e${i}];`;labs.push(`[e${i}]`);});
 gameAudio.forEach(([,at],j)=>{const ms=Math.round(at*1000);fc+=`[${ev.length+2+j}:a]volume=0.45,adelay=${ms}|${ms}[g${j}];`;labs.push(`[g${j}]`);});
 fc+=`[voz]${labs.join('')}amix=inputs=${labs.length+1}:normalize=0:duration=first,alimiter=limit=0.95[a]`;
 const OUT=`${OUTDIR}/criativo_${R.id}.mp4`;
 run([...ins,'-filter_complex',fc,'-map','[v]','-map','[a]','-t',DUR.toFixed(3),'-c:v','libx264','-crf','19','-preset','medium','-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-movflags','+faststart',OUT]);
 const desc={id:R.id,duracao:+DUR.toFixed(2),ordem:R.order,jumpcut:R.jump,pacote_som:R.pack,sons:ev.length,takes:[...used]};
 console.log(JSON.stringify(desc));return desc;
}
if(process.argv[2]==='--receitas'){fs.writeFileSync(path.join(OUTDIR,'_receitas.json'),JSON.stringify(V.map(R=>({...R,packInfo:PACKS[R.pack]})),null,1));process.exit(0);}
const which=process.argv[2]||'all';const res=[];
for(const R of V)if(which==='all'||which.split(',').includes(R.id))res.push(build(R));
fs.writeFileSync(path.join(OUTDIR,'_resumo_'+which.replace(/,/g,'_')+'.json'),JSON.stringify(res,null,1));
