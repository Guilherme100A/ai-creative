// Monta o criativo: segmentos -> concat -> legendas ASS -> mix de áudio
const {execFileSync}=require('child_process');const fs=require('fs');const path=require('path');
const ff=require('ffmpeg-static');
const D='C:/Users/rhian/Downloads';
const BASE=D+'/copy_7C70940D-340D-4468-8D9F-35E228D90892.mov';
const MV=D+'/moveset',MO=D+'/criativo/assets/motion',SFX=D+'/criativo/assets/sfx',FONTS=D+'/criativo/assets/fontes';
const OUT=D+'/criativo/render/criativo_basic_build.mp4';
const TMP=path.join(__dirname,'seg');fs.rmSync(TMP,{recursive:true,force:true});fs.mkdirSync(TMP);
const DUR=62.47;
const gp=(f,ss,crop)=>({k:'gp',f:MV+'/'+f,ss,crop});
// [inicio, fim, segmento]
const TL=[
 [0,1.28,{k:'th',z:1.0}],
 [1.28,2.4,gp('godhuman/Z - Soaring Beast/07-52-54_z_1.mp4',0.9)],
 [2.4,3.52,gp('soul guitar/X - El Diablo/08-01-35_x_2.mp4',0.9)],
 [3.52,7.62,{k:'th',z:1.15}],
 [7.62,11.0,{k:'th',z:1.0}],
 [11.0,12.5,{k:'mo',f:'brand_feedback'}],
 [12.5,17.0,{k:'mo',f:'site_feedback'}],
 [17.0,20.72,{k:'th',z:1.15}],
 [20.72,23.32,{k:'mo',f:'brand_entrega'}],
 [23.32,28.72,{k:'th',z:1.0}],
 [28.72,31.42,{k:'th',z:1.15}],
 [31.42,34.72,{k:'th',z:1.0}],
 [34.72,38.32,{k:'mo',f:'site_top'}],
 [38.32,39.08,gp('godhuman/Z - Soaring Beast/08-01-35_z_1.mp4',0.9)],
 [39.08,39.8,gp('cdk/Z - Revolving Ravager/08-01-35_z_1.mp4',0.9)],
 [39.8,40.62,gp('soul guitar/X - El Diablo/08-01-35_x_1.mp4',0.9)],
 [40.62,41.9,gp('godhuman/C - Sixth Realm Gun/08-01-35_c_1.mp4',0.9)],
 [41.9,43.1,gp('cdk/X - Slayer of Goliath/08-01-35_x_1.mp4',0.9)],
 [43.1,44.3,gp('soul guitar/Z - Soul Shaker/08-01-35_z_1.mp4',0.9)],
 [44.3,45.5,gp('godhuman/X - Heaven and Earth/08-01-35_x_1.mp4',0.9)],
 [45.5,46.72,gp('cdk/Z - Revolving Ravager/08-01-35_z_2.mp4',0.9)],
 [46.72,50.58,{k:'th',z:1.15}],
 [50.58,53.98,{k:'mo',f:'site_feedback2'}],
 [53.98,56.5,{k:'th',z:1.0}],
 [56.5,59.0,{k:'mo',f:'site_cta'}],
 [59.0,DUR,{k:'mo',f:'brand_cta'}],
];
// quadrado da gameplay: posição na tela e recorte em volta do boneco (frame ultrawide 3440x1440)
const BOX={x:180,y:130,size:720},SHIFT=330,CROP={w:440,x:1490,y:580};
const CAP_Y=1480,CAP_Y_GP=1660;
const run=a=>execFileSync(ff,['-v','error','-y',...a],{stdio:'inherit'});
const fr=t=>Math.round(t*30);
const thCrop=z=>{const w=Math.round(1080/z/2)*2,h=Math.round(1920/z/2)*2;return `crop=${w}:${h}:${(1080-w)/2}:${Math.round((1920-h)*0.3)},scale=1080:1920:flags=lanczos`};
const list=[];
TL.forEach(([a,b,s],i)=>{
 const n=fr(b)-fr(a),id=String(i).padStart(2,'0'),o=path.join(TMP,`s${id}.mp4`);
 let args;
 if(s.k==='th')args=['-ss',a.toFixed(3),'-i',BASE,'-vf',`${thCrop(s.z)},fps=30,setsar=1`];
 else if(s.k==='gp'){const C=s.crop||CROP; // fundo: ela falando; frente: quadrado arredondado com a gameplay focada no boneco
  const d=(n/30).toFixed(3),ys=`'${BOX.y}+90*pow(max(0,1-t/0.16),2)'`;
  args=['-ss',a.toFixed(3),'-i',BASE,'-ss',String(s.ss),'-i',s.f,
   '-loop','1','-framerate','30','-i',MO+'/mask_quadrado.png','-loop','1','-framerate','30','-i',MO+'/borda_quadrado.png','-filter_complex',
   `[0:v]fps=30,split[p1][p2];[p1]crop=1080:${1920-SHIFT}:0:0[low];[p2]crop=1080:40:0:0,scale=1080:${SHIFT},gblur=sigma=12[top];[top][low]vstack[bg];`+
   `[1:v]fps=30,crop=${C.w}:${C.w}:${C.x}:${C.y},scale=w='${BOX.size}*(1+0.12*min(1,t/${d}))':h=-2:eval=frame:flags=lanczos,crop=${BOX.size}:${BOX.size},eq=saturation=1.25:contrast=1.06,format=rgba[fg0];`+
   `[2:v]format=gray[m];[fg0][m]alphamerge[fg];`+
   `[bg][fg]overlay=${BOX.x}:${ys}:shortest=1[o1];[o1][3:v]overlay=${BOX.x}:${ys}:shortest=1,setsar=1[out]`,
   '-map','[out]'];
  s.wav=path.join(TMP,`s${id}.wav`);
  execFileSync(ff,['-v','error','-y','-ss',String(s.ss),'-i',s.f,'-t',d,'-vn','-ac','2','-ar','48000',s.wav]);}
 else args=['-i',MO+'/'+s.f+'.mp4','-vf','fps=30,tpad=stop_mode=clone:stop_duration=1,setsar=1'];
 run([...args,'-frames:v',String(n),'-an','-c:v','libx264','-crf','17','-preset','fast','-pix_fmt','yuv420p',o]);
 list.push(`file '${o.split(path.sep).join('/')}'`);
});
fs.writeFileSync(path.join(TMP,'list.txt'),list.join('\n'));
run(['-f','concat','-safe','0','-i',path.join(TMP,'list.txt'),'-c','copy',path.join(TMP,'video.mp4')]);

// ---- legendas ----
let W=require('./base_words.json').chunks.map(c=>({t:c.text.trim(),s:c.timestamp[0],e:c.timestamp[1]??c.timestamp[0]+.3}));
const fix=[[/^blocks$/i,'Blox'],[/^Besky$/,'Basic-Build',1],[/^God$/,'Godhuman',1],[/^Rasa$/,'Raça'],[/^serve$/,'saiba'],[/^Basic$/,'Basic-Build',1]];
const W2=[];for(let i=0;i<W.length;i++){const w={...W[i]};for(const [re,rep,merge] of fix)if(re.test(w.t)){if(merge){const nx=W[i+1];const p=(nx.t.match(/[.,?!]$/)||[''])[0];w.t=rep+p;w.e=nx.e;i++;}else w.t=w.t.replace(re,rep);break;}W2.push(w);}
W=W2;
const HL=/^(GODHUMAN|CDK|SOUL|GUITAR|BASIC-BUILD|FEEDBACKS|AUTOMÁTICA|RAÇA|V4|MÍSTICAS|CONFIANÇA|BLOX|FRUITS|SAIBA)$/;
const groups=[];let g=[];
W.forEach((w,i)=>{g.push(w);const txt=g.map(x=>x.t).join(' ');const nx=W[i+1];
 const brk=/[.,?!]$/.test(w.t)||!nx||txt.length>=11||g.length>=3||(nx&&nx.s-w.e>0.25);if(brk){groups.push(g);g=[];}});
const ts=t=>{const h=Math.floor(t/3600),m=Math.floor(t%3600/60),s=(t%60).toFixed(2).padStart(5,'0');return `${h}:${String(m).padStart(2,'0')}:${s}`};
const inGp=t=>TL.some(([a,b,s])=>s.k==='gp'&&t>=a-0.05&&t<b);
let ass=`[Script Info]\nScriptType: v4.00+\nPlayResX: 1080\nPlayResY: 1920\nWrapStyle: 2\n\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\n`+
 `Style: C,Luckiest Guy,108,&H00FFFFFF,&H00FFFFFF,&H00000000,&H96000000,0,0,0,0,100,100,1,0,1,11,7,5,40,40,0,1\n`+
 `Style: K,Luckiest Guy,64,&H00FFFFFF,&H00FFFFFF,&H00000000,&H96000000,0,0,0,0,100,100,1,0,1,9,5,5,40,40,0,1\n\n`+
 `[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n`;
const tilt=[-3,2,-1,3,-2,1];
groups.forEach((g,i)=>{const s=g[0].s,nx=groups[i+1];const e=Math.min(nx?nx[0].s:g[g.length-1].e+0.4,g[g.length-1].e+0.6);
 const txt=g.map(w=>{const u=w.t.toUpperCase().replace(/[.,!]$/,'');return HL.test(u.replace(/\?$/,''))?`{\\c&H6BF3C6&}${u}{\\c&HFFFFFF&}`:u}).join(' ');
 const y=inGp(s)?CAP_Y_GP:CAP_Y;
 ass+=`Dialogue: 1,${ts(s)},${ts(e)},C,,0,0,0,,{\\pos(540,${y})\\frz${tilt[i%6]}\\fscx60\\fscy60\\t(0,90,\\fscx112\\fscy112)\\t(90,170,\\fscx100\\fscy100)}${txt}\n`;});
// nome da arma + skill em cima do quadrado
const WN={godhuman:'GODHUMAN',cdk:'CDK','soul guitar':'SOUL GUITAR'};
TL.forEach(([a,b,s])=>{if(s.k!=='gp')return;const parts=s.f.split('/');const wpn=WN[parts[parts.length-3]];const [key,name]=parts[parts.length-2].split(' - ');
 ass+=`Dialogue: 2,${ts(a)},${ts(b)},K,,0,0,0,,{\\pos(540,${BOX.y+BOX.size+60})\\fscx50\\fscy50\\t(0,100,\\fscx108\\fscy108)\\t(100,160,\\fscx100\\fscy100)}{\\c&H6BF3C6&}${wpn} {\\c&HFFFFFF&}${name.toUpperCase()} [${key}]\n`;});
fs.writeFileSync(path.join(TMP,'legenda.ass'),ass);
fs.copyFileSync(path.join(TMP,'legenda.ass'),D+'/criativo/render/legenda.ass');

// ---- áudio: voz + som do jogo + sfx ----
const ev=[]; // [arquivo, tempo, volume]
TL.forEach(([a,,s],i)=>{if(i===0)return;
 if(s.k==='gp'){ev.push(['impacto',a,0.5],['swipe',a-0.08,0.35]);}
 else ev.push([i%2?'whoosh':'swipe',a-0.2,s.k==='mo'?0.45:0.3]);
 if(s.k==='mo')ev.push(['pop',a+0.05,0.4]);});
ev.push(['boom',1.28,0.6],['riser',38.32-1.25,0.5],['boom',38.32,0.7]);
groups.forEach(g=>ev.push(['click',g[0].s,0.22]));
const items={11.0:[0.35,0.7],20.72:[0.25,0.75,1.3],59.0:[0.75,1.4]};
for(const [t0,ats] of Object.entries(items))ats.forEach(x=>ev.push(['pop',+t0+x,0.45]));
ev.push(['kaching',59.35,0.55],['kaching',57.2,0.45]);
const types=[...new Set(ev.map(e=>e[0]))];
const gpw=TL.filter(([,,s])=>s.k==='gp');
const inputs=['-i',path.join(TMP,'video.mp4'),'-i',BASE];types.forEach(f=>inputs.push('-i',`${SFX}/${f}.wav`));gpw.forEach(([,,s])=>inputs.push('-i',s.wav));
const esc=p=>p.split(path.sep).join('/').replace(':','\\:');
let fc=`[0:v]subtitles=filename='${esc(path.join(TMP,'legenda.ass'))}':fontsdir='${esc(FONTS)}'[v];[1:a]loudnorm=I=-15:TP=-1.5,aresample=48000[voz];`;
const labs=[];
types.forEach((f,k)=>{const es=ev.filter(e=>e[0]===f);fc+=`[${k+2}:a]aresample=48000,asplit=${es.length}${es.map((_,j)=>`[${f}${j}]`).join('')};`;
 es.forEach((e,j)=>{const ms=Math.max(0,Math.round(e[1]*1000));fc+=`[${f}${j}]volume=${e[2]},adelay=${ms}|${ms}[e${f}${j}];`;labs.push(`[e${f}${j}]`);});});
gpw.forEach(([a],j)=>{const ms=Math.round(a*1000);fc+=`[${types.length+2+j}:a]volume=0.55,adelay=${ms}|${ms}[g${j}];`;labs.push(`[g${j}]`);});
fc+=`[voz]${labs.join('')}amix=inputs=${labs.length+1}:normalize=0:duration=first,alimiter=limit=0.95[a]`;
run([...inputs,'-filter_complex',fc,'-map','[v]','-map','[a]','-t',String(DUR),'-c:v','libx264','-crf','18','-preset','medium','-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-movflags','+faststart',OUT]);
console.log('OK',OUT,'| sfx:',ev.length,'| audio do jogo:',gpw.length);
