// Vídeo base dos criativos sem UGC: gameplay em TELA CHEIA (1080x1920, 30fps) cobrindo a voz em off, áudio = voz.
// Cortes de ~0,8–1,4s (ritmo do nicho); quando a voz cita uma arma/raça/inventário, o corte cai na palavra
// e entra o clipe daquilo (tempos de palavras.json). Estoque: moveset/ (yt_* só os de _aprovados.txt; gravação própria sempre).
// uso: node base_gameplay.js <voz.mp3> <palavras.json> <saida.mp4> [--seed N] [--pular inv,race]
//   --pular: citações que não ganham clipe próprio (ex.: inv, enquanto o estoque de inventário for só a loja Fruit Dealer)
// saída extra: <saida>.json com a lista de planos (o que entrou e quando)
const fs=require('fs'),path=require('path'),{execFileSync,spawnSync}=require('child_process');
const ff=require('ffmpeg-static'),fp=require('ffprobe-static').path;
const {DADOS}=require('./paths');
const A=process.argv.slice(2);const opt=k=>{const i=A.indexOf(k);return i>=0?A[i+1]:null};
const [VOZ,PAL,OUT]=A.filter((a,i)=>!a.startsWith('--')&&!['--seed','--pular'].includes(A[i-1]));
const PULAR=(opt('--pular')||'').split(',').filter(Boolean);
if(!VOZ||!PAL||!OUT){console.error('uso: node base_gameplay.js <voz.mp3> <palavras.json> <saida.mp4> [--seed N]');process.exit(1);}
const SEED=+(opt('--seed')||1);
const FPS=30,TAIL=2.0;
const run=a=>execFileSync(ff,['-v','error','-y',...a],{stdio:'inherit'});
const dur=f=>+execFileSync(fp,['-v','error','-show_entries','format=duration','-of','csv=p=0',f]).toString().trim();
function rng(seed){let s=seed*2654435761%4294967296;return()=>{s=(s*1664525+1013904223)%4294967296;return s/4294967296}}
const rand=rng(SEED);

// ---------- estoque ----------
const MV=DADOS+'/moveset';
const APROV=new Set((fs.existsSync(MV+'/_aprovados.txt')?fs.readFileSync(MV+'/_aprovados.txt','utf8'):'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean));
const BAD=['godhuman/Z - Soaring Beast/08-01-35_z_2.mp4']; // e os proprio_testing_* (cortes de teste: quadro pequeno no meio da tela preta, ficam borrados ampliados) e yt_f-Nr9Kj2GiM_* ("Soaring Beast"/"Safe Zone" gravados na imagem)
const listAll=d=>{const out=[];const walk=p=>{if(!fs.existsSync(path.join(MV,p)))return;for(const f of fs.readdirSync(path.join(MV,p))){const q=p+'/'+f;if(fs.statSync(path.join(MV,q)).isDirectory())walk(q);else if(f.endsWith('.mp4'))out.push(q);}};walk(d);return out.sort();};
const ok=q=>!BAD.includes(q)&&!/_testing_|yt_f-Nr9Kj2GiM_/.test(q)&&(!path.basename(q).startsWith('yt_')||APROV.has(path.basename(q)));
const POOL={godhuman:listAll('godhuman'),cdk:listAll('cdk'),'soul guitar':listAll('soul guitar'),race:listAll('racas v4').filter(f=>!f.includes('/geral/')),inv:listAll('inventario frutas miticas')};
for(const k in POOL)POOL[k]=POOL[k].filter(ok);
// raças: só as que mostram o avatar inteiro (as outras são close cortado/borrado — Coruja, v984)
const RACAS_BOAS=['racas v4/Angel/yt_M3V5GmdqLLI_angel_3.mp4'];
if(POOL.race.some(q=>RACAS_BOAS.includes(q)))POOL.race=POOL.race.filter(q=>RACAS_BOAS.includes(q));
// abertura: clipes com o avatar visível no meio do efeito (o 1º segundo precisa de personagem, não de tela chapada)
const ABERTURAS=['cdk/Z - Revolving Ravager/yt_b6Gqb4yiiF4_z_2.mp4','godhuman/X - Heaven and Earth/yt_-LTjZd-SATc_x_4.mp4','cdk/X - Slayer of Goliath/yt_b6Gqb4yiiF4_x_2.mp4'].filter(q=>fs.existsSync(path.join(MV,q))&&ok(q));
const ARMAS=['godhuman','cdk','soul guitar'];
// fundo para o título e o preço: avatar visível sem explosão (a métrica sozinha escolhe campo vazio ou explosão — Coruja, vz03)
const CALMOS=['godhuman/X - Heaven and Earth/yt_-LTjZd-SATc_x_4.mp4','cdk/showcase/yt_x79zOeaTwxg_s_1.mp4','godhuman/showcase/yt_-LTjZd-SATc_s_1.mp4'];
// quando a voz cita a arma: clipes em que dá para reconhecer o item (marcados à mão olhando os quadros); o resto do estoque é efeito genérico
const CITA={cdk:['cdk/showcase/yt_x79zOeaTwxg_s_1.mp4','cdk/showcase/yt_12ILz_85W-E_s_1.mp4','cdk/X - Slayer of Goliath/yt_4xce-YThibY_x_1.mp4'],
 godhuman:['godhuman/X - Heaven and Earth/yt_-LTjZd-SATc_x_4.mp4','godhuman/showcase/yt_-LTjZd-SATc_s_1.mp4'],
 'soul guitar':['soul guitar/Z - Soul Shaker/yt_0_OnhJ_uG_M_z_5.mp4','soul guitar/showcase/yt_0_OnhJ_uG_M_s_3.mp4']};
const INFO={};const info=q=>INFO[q]||(INFO[q]={dur:dur(path.join(MV,q)),own:!path.basename(q).startsWith('yt_')});
// área útil do clipe (tira tarja preta: as gravações próprias de teste vêm num quadro menor dentro de 3440x1440) e 9:16 no centro dela
const CAIXA={};function caixaDe(q){if(CAIXA[q])return CAIXA[q];
 const r=spawnSync(ff,['-hide_banner','-i',path.join(MV,q),'-vf','fps=4,cropdetect=limit=24:round=2:reset=0','-f','null','-'],{encoding:'utf8'});
 const ms=[...(r.stderr||'').matchAll(/crop=(\d+):(\d+):(\d+):(\d+)/g)];if(!ms.length)throw new Error('cropdetect falhou: '+q);
 const [w,h,x,y]=ms[ms.length-1].slice(1).map(Number);return CAIXA[q]={w,h,x,y};}
// 16:9 do YouTube: corta 13% de cima e 5% de baixo (títulos de edição tipo "Revolving Ravager" e avisos do jogo — Coruja, vz02)
const cropDe=q=>{if(/inventario/.test(q))return 'null';const c=caixaDe(q);const yt=!info(q).own;let h=yt?c.h*0.82:c.h/1.04,w=h*9/16;if(w>c.w){w=c.w;h=w*16/9;}w=Math.floor(w/2)*2;h=Math.floor(h/2)*2;
 const y=yt?c.y+Math.round(c.h*0.13):c.y+Math.round((c.h-h)/2);return `crop=${w}:${h}:${c.x+Math.round((c.w-w)/2)}:${y}`;}; // personagem no centro
// métrica por 0,1s do que aparece na tela (cache em gameplay_metricas.json): brilho, cor e movimento de cada quadro
const MET_F=path.join(__dirname,'gameplay_metricas.json');const MET=fs.existsSync(MET_F)?JSON.parse(fs.readFileSync(MET_F,'utf8')):{};
function metrica(q){const f=path.join(MV,q),mt=fs.statSync(f).mtimeMs,cr=cropDe(q);if(MET[q]&&MET[q].mt===mt&&MET[q].crop===cr)return MET[q].f;
 const out=execFileSync(ff,['-v','error','-i',f,'-vf',`fps=10,${cr},scale=90:160,signalstats,metadata=print:file=-`,'-f','null','-']).toString();
 const fr=out.split(/frame:\d+/).slice(1).map(b=>{const g=k=>+((b.match(new RegExp('lavfi\\.signalstats\\.'+k+'=([\\d.]+)'))||[])[1]||0);return [Math.round(g('YAVG')),Math.round(g('SATAVG')),Math.round(g('YDIF'))]});
 if(!fr.length)throw new Error('métrica vazia: '+q);
 MET[q]={mt,crop:cr,f:fr};fs.writeFileSync(MET_F,JSON.stringify(MET));return fr;}
// nota de um quadro: normal = cor + movimento, sem flash nem tela escura; calmo = fundo escuro e quieto para o texto (preço/título) ler bem
const nota=([y,sat,dif],calmo)=>calmo?100-dif*3-(sat>60?(sat-60)*1.5:0)-(y>150?1000:y>100?(y-100)*4:0)-(y<30?300:0)
 :sat+2*dif-(y>165?1000:y>150?(y-150)*6:0)-(y<35?300:y<45?40:0);
// melhor janela [ss, ss+len] dentro do clipe (evita trechos já usados do mesmo clipe); no calmo o pior quadro também conta (uma explosão no meio estraga o texto)
function janela(q,len,usadas=[],calmo=false){const sc=metrica(q).map(x=>nota(x,calmo)),I=info(q),ini=I.own?0.6:0.1,fim=I.dur-0.05-len;let best=ini,bv=-1e9;
 for(let t=ini;t<=Math.max(ini,fim)+1e-6;t+=0.1){if(usadas.some(([a,b])=>t<b&&t+len>a))continue;const a=Math.round(t*10),b=Math.max(a+1,Math.round((t+len)*10));const sl=sc.slice(a,b);const v=sl.reduce((x,y)=>x+y,0)/Math.max(1,sl.length)+(calmo?Math.min(...sl):0);if(v>bv){bv=v;best=t;}}
 return {ss:+best.toFixed(2),v:bv};}

// ---------- palavras -> momentos que pedem um clipe específico ----------
const W=JSON.parse(fs.readFileSync(PAL,'utf8')).chunks.map(c=>({t:c.text.trim(),s:c.timestamp[0],e:c.timestamp[1]??c.timestamp[0]+0.2}));
const norm=t=>t.toUpperCase().replace(/[.,!?;:…"]+/g,'');
const EV=[];
W.forEach((w,i)=>{const u=norm(w.t),nx=W[i+1]?norm(W[i+1].t):'';let k=null;
 if(/^GOD ?HUMAN$/.test(u))k='godhuman';else if(u==='CDK')k='cdk';else if(u==='SOUL'&&nx==='GUITAR')k='soul guitar';
 else if(/^(V4|RAÇA|RAÇAS)$/.test(u))k='race';else if(/^(FRUTAS?|MÍTICAS?|INVENTÁRIO)$/.test(u))k='inv';
 if(PULAR.includes(k))k=null;
 if(k&&!(EV.length&&EV[EV.length-1].k===k&&w.s-EV[EV.length-1].t<1.2))EV.push({t:Math.max(0,+(w.s-0.08).toFixed(3)),k,palavra:w.t});});
const FIM_VOZ=W[W.length-1].e;const VDUR=dur(VOZ);const END=+(Math.max(FIM_VOZ,VDUR)+TAIL).toFixed(3);

// ---------- planos ----------
// pontos de corte forçados nos eventos; entre eles, enchimento com armas alternadas
const pts=[{t:0,k:null},...EV.filter(e=>e.t>0.4),{t:END,k:'fim'}];if(EV.length&&EV[0].t<=0.4)pts[0].k=EV[0].k;
const shots=[];let ult=null;
const fill=(a,b)=>{const L=b-a;if(L<=0.01)return;let n=Math.max(1,Math.round(L/1.1));while(n>1&&L/n<0.75)n--;
 const cuts=[a];for(let i=1;i<n;i++)cuts.push(a+L*i/n+(rand()-0.5)*0.25);cuts.push(b);
 for(let i=0;i<n;i++){let k;do k=ARMAS[Math.floor(rand()*3)];while(k===ult);shots.push({a:cuts[i],b:cuts[i+1],k,motivo:'ritmo'});ult=k;}};
for(let i=0;i<pts.length-1;i++){const a=pts[i].t,b=pts[i+1].t;
 if(pts[i].k){const len=Math.min(b-a,pts[i].k==='race'&&PULAR.includes('inv')?2.2:pts[i].k==='race'||pts[i].k==='inv'?1.5:1.35); // sem clipe de inventário, a raça segura até "fruta mítica"
  if(b-a-len<0.6){shots.push({a,b,k:pts[i].k,motivo:'fala'});ult=pts[i].k;}else{shots.push({a,b:a+len,k:pts[i].k,motivo:'fala'});ult=pts[i].k;fill(a+len,b);}}
 else fill(a,b);}
// planos alinhados a frames
for(const s of shots){s.a=Math.round(s.a*FPS)/FPS;s.b=Math.round(s.b*FPS)/FPS;}

// trechos calmos onde tem texto grande para ler: título (até 2,3s) e o preço falado
const PRECO=W.find(w=>/^\d+,\d\d/.test(w.t));const calmos=[[0.9,2.3],...(PRECO?[[PRECO.s-0.2,PRECO.e+0.4]]:[])];
// citação de arma também: trecho calmo mostra o item (avatar com a arma), não a explosão que esconde ele (Coruja, vz03)
shots.forEach((s,i)=>{if(i>0&&(calmos.some(([a,b])=>s.a<b&&s.b>a)||(s.motivo==='fala'&&CITA[s.k]&&s.k!=='soul guitar')))s.calmo=true;}); // soul guitar: nenhum clipe mostra a guitarra; calmo só deixa o avatar minúsculo
// ---------- escolha do clipe e do trecho ----------
const usados=new Map(),trechos={};
// abertura: o 1º plano (se não for citação) é o clipe mais forte do estoque — gameplay com efeito, nada parado
if(shots[0].motivo==='ritmo'){const len=shots[0].b-shots[0].a;let best=null;for(const k of ARMAS)for(const q of POOL[k].filter(q=>!ABERTURAS.length||ABERTURAS.includes(q))){if(info(q).dur<len+0.3)continue;const j=janela(q,len);if(!best||j.v>best.v)best={...j,q,k};}
 if(best){Object.assign(shots[0],{k:best.k,clip:best.q,ss:best.ss,len:+len.toFixed(3),motivo:'abertura (clipe mais forte)'});usados.set(best.q,1);trechos[best.q]=[[best.ss,best.ss+len]];}}
for(const s of shots){if(s.clip)continue;const cita=s.motivo==='fala'&&CITA[s.k]?CITA[s.k].filter(q=>POOL[s.k].includes(q)):[];const reserva=Object.values(CITA).flat();const calmoRitmo=s.calmo&&s.motivo==='ritmo'?CALMOS.filter(q=>ok(q)&&fs.existsSync(path.join(MV,q))):[];
 const livres=calmoRitmo.length?calmoRitmo:POOL[s.k].filter(q=>!reserva.includes(q)); // título/preço na tela: avatar visível e fundo quieto (lista curada)
 const pool=cita.length?cita:livres.length?livres:POOL[s.k]; // clipes onde o item aparece ficam guardados para quando a voz cita o item
 const len=s.b-s.a;
 // entre os clipes menos usados (que cabem), fica o que tem o melhor trecho — um clipe estourado/escuro perde para outro da mesma arma
 const cabe=pool.filter(c=>info(c).dur-(info(c).own?0.6:0.1)>=len+0.05);const base=cabe.length?cabe:pool;
 const minU=Math.min(...base.map(c=>usados.get(c)||0));let q=null,j=null;
 for(const c of base.filter(c=>(usados.get(c)||0)<=minU+(minU>0?1:0))){const jj=janela(c,len,trechos[c]||[],!!s.calmo);const v=jj.v-(usados.get(c)||0)*15+rand()*4;if(!j||v>j.vv){q=c;j={...jj,vv:v};}}
 usados.set(q,(usados.get(q)||0)+1);
 (trechos[q]=trechos[q]||[]).push([j.ss,j.ss+len]);
 s.clip=q;s.ss=j.ss;s.len=+len.toFixed(3);s.k=ARMAS.find(k=>POOL[k].includes(q))||s.k;}

// ---------- render ----------
const TMP=path.join(__dirname,'vt','_base_'+path.basename(OUT,'.mp4'));fs.rmSync(TMP,{recursive:true,force:true});fs.mkdirSync(TMP,{recursive:true});
const COR='eq=saturation=1.2:contrast=1.05';
const list=[];
shots.forEach((s,i)=>{const n=Math.round(s.b*FPS)-Math.round(s.a*FPS);if(n<=0)return;const f=path.join(MV,s.clip);const o=path.join(TMP,`p${String(i).padStart(3,'0')}.mp4`);
 let args;
 if(s.k==='inv') // inventário é largo: inteiro no meio, com ele mesmo desfocado no fundo
  args=['-ss',String(s.ss),'-i',f,'-filter_complex',`[0:v]fps=30,split[x][y];[x]scale=-2:1920,crop=1080:1920,gblur=sigma=30,eq=brightness=-0.12[bg];[y]scale=1080:-2:flags=lanczos,${COR}[fg];[bg][fg]overlay=0:(H-h)/2,setsar=1[out]`,'-map','[out]'];
 else{args=['-ss',String(s.ss),'-i',f,'-vf',`fps=30,${cropDe(s.clip)},scale=1080:1920:flags=lanczos,${COR},setsar=1`];}
 run([...args,'-frames:v',String(n),'-an','-c:v','libx264','-crf','16','-preset','fast','-pix_fmt','yuv420p','-r','30',o]);
 list.push(`file '${o.split(path.sep).join('/')}'`);});
fs.writeFileSync(path.join(TMP,'list.txt'),list.join('\n'));
fs.mkdirSync(path.dirname(path.resolve(OUT)),{recursive:true});
run(['-f','concat','-safe','0','-i',path.join(TMP,'list.txt'),'-i',VOZ,'-map','0:v','-map','1:a','-c:v','copy','-af','apad','-ar','48000','-c:a','aac','-b:a','256k','-t',String(END),OUT]);
fs.writeFileSync(OUT.replace(/\.mp4$/,'')+'.json',JSON.stringify({voz:VOZ,palavras:PAL,seed:SEED,duracao:END,eventos:EV,planos:shots.map(s=>({de:+s.a.toFixed(3),ate:+s.b.toFixed(3),k:s.k,clip:s.clip,ss:s.ss,motivo:s.motivo+(s.calmo?' (calmo)':'')}))},null,1));
fs.rmSync(TMP,{recursive:true,force:true});
console.log(`ok: ${OUT} (${END.toFixed(1)}s, ${shots.length} planos, ${EV.length} citações: ${EV.map(e=>e.k+'@'+e.t.toFixed(2)).join(' ')})`);
