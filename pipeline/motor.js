// Motor de criativos — um só para todos os vídeos e lotes (substitui gen6/gen7/genN).
// O que é de cada vídeo fica em projetos/<nome>/projeto.json; cada lote em projetos/<nome>/lotes/loteN.json.
// uso: node motor.js <projeto> <lote> [ids|all] [--receitas] [--plano] [--forcar]
//   --receitas  só escreve render/variacoes/_receitas_loteN.json (o revisor usa)
//   --plano     não renderiza: mostra os shots e a checagem de qualidade
//   --forcar    renderiza mesmo com erro na checagem de qualidade
// Montado a partir do gen7.js: o render é idêntico (ver tests/equivalencia.js).
const {execFileSync}=require('child_process');const fs=require('fs');const path=require('path');
const ff=require('ffmpeg-static');
const {ROOT,DADOS,catalogo}=require('./paths');
const ARGS=process.argv.slice(2),FLAGS=new Set(ARGS.filter(a=>a.startsWith('--'))),POS=ARGS.filter(a=>!a.startsWith('--'));
const PROJ_NOME=POS[0],LOTE_ARG=POS[1];
const PROJ_DIR=path.join(__dirname,'projetos',PROJ_NOME||'_');
if(!PROJ_NOME||!LOTE_ARG||!fs.existsSync(path.join(PROJ_DIR,'projeto.json'))){console.error('uso: node motor.js <projeto> <lote> [ids|all] [--receitas] [--plano] [--forcar]');process.exit(1);}
const PROJ=JSON.parse(fs.readFileSync(path.join(PROJ_DIR,'projeto.json'),'utf8'));
const D=DADOS;
const BASE=path.isAbsolute(PROJ.video)?PROJ.video.split(path.sep).join('/'):D+'/'+PROJ.video;
const {valida,checaSons}=require('./qualidade');
const MV=D+'/moveset',MO=ROOT+'/assets/motion',SFX=ROOT+'/assets/sfx',FONTS=ROOT+'/assets/fontes';
const OUTDIR=ROOT+'/render/variacoes';fs.mkdirSync(OUTDIR,{recursive:true});
const PEAKS=require('./sfx_peaks.json');
const FPS=30,fr=t=>Math.round(t*FPS);
const run=a=>execFileSync(ff,['-v','error','-y',...a],{stdio:'inherit'});

// ---------- falas ----------
let W=JSON.parse(fs.readFileSync(path.join(PROJ_DIR,PROJ.palavras),'utf8')).chunks.map(c=>({t:c.text.trim(),s:c.timestamp[0],e:Math.max(c.timestamp[1]??0,c.timestamp[0]+0.12)}));
const FIX=(PROJ.fix||[]).map(([seq,rep])=>[seq.map(x=>new RegExp(x)),rep]);
{const W2=[];for(let i=0;i<W.length;i++){let done=false;for(const [seq,rep] of FIX){if(seq.every((re,k)=>W[i+k]&&re.test(W[i+k].t))){const last=W[i+seq.length-1];const p=(last.t.match(/[.,?!]$/)||[''])[0];W2.push({t:rep+p,s:W[i].s,e:last.e});i+=seq.length-1;done=true;break;}}if(!done)W2.push({...W[i]});}W=W2;}
const SENT=PROJ.frases;
const SRC_END=PROJ.fimFala;const ALLS=Object.keys(SENT).join('');

// ---------- takes ----------
const TAKES={};
for(const wpn of ['godhuman','cdk','soul guitar'])for(const sk of fs.readdirSync(path.join(MV,wpn)))for(const f of fs.readdirSync(path.join(MV,wpn,sk)))
 (TAKES[wpn]=TAKES[wpn]||[]).push(`${wpn}/${sk}/${f}`);
const listAll=d=>{const out=[];const walk=p=>{for(const f of fs.readdirSync(path.join(MV,p))){const q=p+'/'+f;if(fs.statSync(path.join(MV,q)).isDirectory())walk(q);else if(f.endsWith('.mp4'))out.push(q);}};walk(d);return out.sort();};
const POOLS={race:listAll('racas v4').filter(f=>f.includes('M3V5GmdqLLI')&&!f.includes('/geral/')),inv:[...listAll('inventario frutas miticas').filter(f=>f.includes('ypbBSUJsN44')),...listAll('conta e itens').filter(f=>/conta_[13]/.test(f))]};
const BAD=['godhuman/Z - Soaring Beast/08-01-35_z_2.mp4'];
const YT_OK=/yt_0_OnhJ_uG_M_(z_[5-9]|x_[4-7])|yt_b6Gqb4yiiF4_(z_[1-5]|x_[15])/;
// clipes do YouTube conferidos um a um (um nome de arquivo por linha) — vale junto com YT_OK
const APROV=new Set((fs.existsSync(MV+'/_aprovados.txt')?fs.readFileSync(MV+'/_aprovados.txt','utf8'):'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean));
const ytOk=t=>YT_OK.test(t)||APROV.has(path.basename(t));
for(const k in TAKES)TAKES[k]=TAKES[k].filter(t=>!BAD.includes(t)&&(!path.basename(t).startsWith('yt_')||ytOk(t))).sort();

// ---------- direções visuais ----------
const DIR=PROJ.direcoes;
const CLIPLEN={brand_feedback:1.5,site_feedback:4.5,brand_entrega:2.6,site_top:3.6,site_top2:2.2,site_feedback2:3.4,site_cta:2.5,brand_cta:3.47,brand_intro:1.9,brand_cta2:4.2,brand_cta3:4.2};
const STD=PROJ.direcoesPadrao;

// ---------- reações (tempo da fala original) ----------
// [tempo, emoji, movimento, som, prioridade]  prioridade 1 = sempre que tiver reação
const YT=ROOT+'/assets/sfx/youtube/';
const CUES=(PROJ.reacoes||[]).map(([t,e,st,snd,p])=>[t,e,st,YT+snd,p]);
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
const CATALOG=catalogo();
// [início, fim (tempo da fala original), categoria, prioridade]
const MEME_CUES=PROJ.memes||[];
const MDENS={poucos:1,medios:2,muitos:3};
const LEVEL_MEMEPACK=0.16;
const peakCache={};
function peakOf(f){if(peakCache[f])return peakCache[f];
 const raw=execFileSync(ff,['-v','error','-i',f,'-t','6','-ac','1','-ar','8000','-f','f32le','-']);const a=new Float32Array(raw.buffer,raw.byteOffset,raw.length/4);
 const win=160;let best=0,bt=0;for(let i=0;i+win<a.length;i+=40){let s=0;for(let j=i;j<i+win;j++)s+=a[j]*a[j];if(s>best){best=s;bt=i}}
 const fp=require('ffprobe-static').path;let dur=a.length/8000;try{dur=+execFileSync(fp,['-v','error','-show_entries','format=duration','-of','csv=p=0',f]).toString().trim()}catch(e){}
 return peakCache[f]={peak:(bt+win/2)/8000,dur,rms:Math.max(0.05,Math.sqrt(best/win))};}

// ---------- receitas do lote (projetos/<nome>/lotes/loteN.json) ----------
const COR={amarelo:YEL,limao:LIME,rosa:PINK};
const LOTE_FILE=path.join(PROJ_DIR,'lotes',/\.json$/.test(LOTE_ARG)?LOTE_ARG:`lote${LOTE_ARG}.json`);
const LOTE_J=JSON.parse(fs.readFileSync(LOTE_FILE,'utf8'));const LOTE=LOTE_J.lote;
const V=LOTE_J.variacoes.map(v=>({...v,dirs:v.dirs==null||v.dirs==='padrao'?STD:Array.isArray(v.dirs)?v.dirs:STD.filter(d=>!(v.dirs.sem||[]).includes(d)),hl:(v.hl||['amarelo']).map(c=>COR[c]||c)}));
const HL_RE=new RegExp('^('+(PROJ.destaques||[]).map(w=>w.toUpperCase().replace(/[.*+?^${}()|[\]\\-]/g,'\\$&')).join('|')+')$');


function rng(seed){let s=seed*2654435761%4294967296;return()=>{s=(s*1664525+1013904223)%4294967296;return s/4294967296}}

// ---------- efeitos opcionais (R.fx) — sem fx o render é o mesmo de sempre ----------
// musica:{mood,db}  abertura:true  legendaSite:false  gancho:"TEXTO"|true  legenda:"grande"  progresso:true  nitidez:true  punch:true
// fase 2: corTema:true  telaCheia:true  speed:true  precoGigante:true  memeSeco:true  memeCurado:true  ctaCurto:true  masterOk:true  pico:true  boxSeco:true  boxGrande:true  aura:true
const MUS=ROOT+'/assets/musica';
// pico: segundo do auge de cada clipe (moveset/_picos.json, chave = caminho ou nome do arquivo); telaCheia: só clipes de moveset/_tela_cheia.txt
const lerPicos=()=>{try{return JSON.parse(fs.readFileSync(MV+'/_picos.json','utf8'))}catch(e){return null}};
// aura: clipes de avatar parado brilhando em moveset/aura/<godhuman|cdk|soul guitar|racas/<Raça>|geral> (começam em {aura:seg} do _picos.json)
const auraPool=g=>fs.existsSync(path.join(MV,'aura',g))?listAll('aura/'+g):[];
const lerTela=()=>fs.existsSync(MV+'/_tela_cheia.txt')?new Set(fs.readFileSync(MV+'/_tela_cheia.txt','utf8').split(/\r?\n/).map(x=>path.basename(x.trim())).filter(Boolean)):null;
// abertura: quantos frames do começo de uma cena são escuros (fade do fundo); cache em assets/motion/_abertura.json
const ABRE_F=MO+'/_abertura.json';
function aberturaDe(clip){const f=`${MO}/${clip}.mp4`,mt=fs.statSync(f).mtimeMs;let C={};try{C=JSON.parse(fs.readFileSync(ABRE_F,'utf8'))}catch(e){}
 if(C[clip]&&C[clip].mt===mt)return C[clip].off;
 const out=execFileSync(ff,['-v','error','-i',f,'-frames:v','45','-vf','signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=-','-f','null','-']).toString();
 const y=[...out.matchAll(/YAVG=([\d.]+)/g)].map(m=>+m[1]);const alvo=0.9*Math.max(...y);const k=Math.max(0,y.findIndex(v=>v>=alvo));
 C[clip]={mt,yavg:y.map(Math.round),off:+(k/FPS).toFixed(3)};fs.writeFileSync(ABRE_F,JSON.stringify(C,null,1));return C[clip].off;}
// speed: linhas brancas radiais (PNG transparente gerado uma vez em assets/motion/speedlines.png)
function speedLines(){const f=MO+'/speedlines.png';if(!fs.existsSync(f)){const a="'255*gt(sin(atan2(Y-960,X-540)*140)*sin(atan2(Y-960,X-540)*53+1),0.72)*clip((hypot(X-540,Y-960)-430)/420,0,1)'";
 run(['-f','lavfi','-i','color=c=white:s=1080x1920','-frames:v','1','-vf',`format=rgba,geq=r=255:g=255:b=255:a=${a}`,f]);}return f;}
// corTema: cor da palavra-chave pelo tema — preço verde, marca lilás, itens (e o resto dos destaques) amarelo
const VERDE='&H5AE63C&',LILAS='&HFF8CC8&',PRECO_RE=/^(R\$|\d+,\d\d|REAIS|DEZESSETE)$/;
const temaCor=u=>PRECO_RE.test(u)?VERDE:/BASIC/.test(u)?LILAS:YEL;
// gancho: *trecho* fica amarelo; quebra em até 2 linhas que caibam em 1000px (Archivo Black ≈0,62 em por letra maiúscula)
function ganchoASS(txt){const pal=txt.toUpperCase().split(/\s+/).filter(Boolean);const larg=ws=>ws.join(' ').replace(/\*/g,'').length*0.62;
 let best=[pal],bw=larg(pal);for(let i=1;i<pal.length;i++){const w=Math.max(larg(pal.slice(0,i)),larg(pal.slice(i)));if(w<bw){bw=w;best=[pal.slice(0,i),pal.slice(i)];}}
 const size=Math.min(120,Math.floor(1000/bw));let amarelo=false;
 const pinta=w=>w.split(/(\*)/).map(p=>{if(p==='*'){amarelo=!amarelo;return amarelo?`{\\c${YEL}}`:'{\\c&HFFFFFF&}'}return p}).join('');
 return {size,txt:best.map(l=>l.map(pinta).join(' ')).join('\\N')};}

function build(R){
 const rand=rng(R.seed);const pick=a=>a[Math.floor(rand()*a.length)];const jump=R.gap!=null;
 const TMP=path.join(__dirname,'vt',R.id);fs.rmSync(TMP,{recursive:true,force:true});fs.mkdirSync(TMP,{recursive:true});
 // 1) pedaços de fala
 const pieces=[];
 for(const id of R.order){const [s0,s1]=SENT[id];const ws=W.filter(w=>w.s>=s0-0.05&&w.s<=s1);
  let cur=[ws[0]];const groups=[];
  for(let i=1;i<ws.length;i++){if(jump&&ws[i].s-ws[i-1].e>R.gap){groups.push(cur);cur=[];}cur.push(ws[i]);}groups.push(cur);
  groups.forEach(g=>{const li=W.indexOf(g[g.length-1]),nx=W[li+1],pv=W[W.indexOf(g[0])-1];pieces.push({sent:id,s:Math.max(0,g[0].s-0.07,pv?pv.e+0.01:0),e:Math.min(SRC_END,g[g.length-1].e+0.13,nx?nx.s-0.02:99)});});}
 if(!jump)for(let i=0;i<pieces.length-1;i++){const a=pieces[i],b=pieces[i+1];if(b.s>a.e&&b.s-a.e<0.7&&ALLS.indexOf(b.sent)===ALLS.indexOf(a.sent)+1)a.e=b.s;}
 let t=0;for(const p of pieces){p.o=t;t+=p.e-p.s;p.oe=t;}
 const TAIL=0.9,DUR=t+TAIL;
 const s2o=src=>{for(const p of pieces)if(src>=p.s-1e-6&&src<=p.e+1e-6)return p.o+(src-p.s);return null};
 const o2p=o=>pieces.find(p=>o>=p.o-1e-6&&o<p.oe-1e-6)||pieces[pieces.length-1];
 const o2s=o=>{const p=o2p(o);return Math.min(p.e,p.s+(o-p.o))};

 // 2) direções -> saída
 const used=new Set();const takeFor=wpn=>{const ALL3=[...TAKES.godhuman,...TAKES.cdk,...TAKES['soul guitar']],own=ALL3.filter(t=>!path.basename(t).startsWith('yt_'));const pool=wpn==='any'?(own.length?own:ALL3):TAKES[wpn];
  let cand=pool.filter(x=>!used.has(x));if(!cand.length)cand=pool;const x=pick(cand);used.add(x);return x};
 const AURA=!!(R.fx&&R.fx.aura);const pegaAura=pl=>{let c=pl.filter(x=>!used.has(x));if(!c.length)c=pl;const x=pick(c);used.add(x);return x;};
 const auraDe=g=>AURA?(g==='any'?[...auraPool('geral'),...auraPool('godhuman'),...auraPool('cdk'),...auraPool('soul guitar')]:auraPool(g)):[]; // aura: montage, 'any' e raça
 let vis=[];
 for(const name of R.dirs){const d=DIR[name];const parts=pieces.filter(p=>p.e>d.s&&p.s<d.e);if(!parts.length)continue;
  let oS=Infinity,oE=-Infinity;for(const p of parts){oS=Math.min(oS,p.o+Math.max(0,d.s-p.s));oE=Math.max(oE,p.o+(Math.min(d.e,p.e)-p.s));}
  if(d.e>=99)oE=DUR;
  if(d.v==='mo'){if(d.e>=99&&R.fx&&R.fx.ctaCurto)oS=Math.max(oS,DUR-3.5); // ctaCurto: card final só nos últimos ~3,5s
   oE=Math.min(oE,oS+CLIPLEN[d.clip]+(d.e>=99?9:0));vis.push({k:'mo',clip:d.clip,oS,oE});}
  else if(d.v==='box'&&(d.wpn==='any'?auraDe('any'):d.pool==='race'?auraDe('racas'):[]).length){const pl=d.wpn==='any'?auraDe('any'):auraDe('racas');vis.push({k:'box',take:pegaAura(pl),aura:true,pool:d.pool,oS,oE});}
  else if(d.v==='box'){let take;if(d.pool){const pl=POOLS[d.pool].filter(x=>!used.has(x));take=pick(pl.length?pl:POOLS[d.pool]);used.add(take);}else take=takeFor(d.wpn);vis.push({k:'box',take,pool:d.pool,oS,oE});}
  else{const L=R.boxLen||1.8;const n=Math.max(1,Math.round((oE-oS)/L));const ws=['godhuman','cdk','soul guitar'];let k=Math.floor(rand()*3);
   for(let i=0;i<n;i++){const ap=auraDe(ws[(k+i)%3]);vis.push({k:'box',take:ap.length?pegaAura(ap):takeFor(ws[(k+i)%3]),...(ap.length?{aura:true}:{}),oS:oS+(oE-oS)*i/n,oE:oS+(oE-oS)*(i+1)/n});}}}
 // memes: só entram onde não tem animação nem gameplay
 const usedM=new Set();const CUR=!!(R.fx&&R.fx.memeCurado); // memeCurado: começa em m.ini e usa o som curado do meme (m.som)
 for(const [ms,me,cat,prio] of MEME_CUES){if(prio>MDENS[R.memes])continue;const near=(x,dir)=>{let v=s2o(x);if(v!=null)return v;for(const p of pieces){if(dir<0&&p.s<=x&&x>p.e)v=p.oe;if(dir>0&&p.s>x&&v==null)v=p.o;}return v;};const a=near(ms,1),b=near(me,-1);if(a==null||b==null||b-a<0.6)continue;
  if(vis.some(v=>v.oS<b+0.1&&v.oE>a-0.1))continue;if(CUR&&vis.some(v=>v.k==='meme'&&a<v.oE+6&&b>v.oS-6))continue;const C=CATALOG.categorias[cat];
  let cand=C.memes.filter(m=>!usedM.has(m.id));if(!cand.length)cand=C.memes;const m=pick(cand);usedM.add(m.id);
  let b2=b;if(m.tipo==='video'){b2=a+Math.min(2.4,b-a+0.8,Math.max(b-a,m.dur-(CUR?m.ini||0:0)-0.15));const nx=vis.filter(v=>v.oS>=a).sort((x,y)=>x.oS-y.oS)[0];if(nx)b2=Math.min(b2,nx.oS-0.05);b2=Math.min(b2,DUR-0.5);if(b2<b)b2=b;}
  vis.push({k:'meme',cat,meme:m,audio:CUR&&'som' in m?(pick(C.audios),m.som):pick(C.audios),som:rand()<(R.memeSom??0.5),oS:a,oE:b2});}
 vis.sort((a,b)=>a.oS-b.oS);
 const ENTRIES=['flip','rise','pop','swing'];let bi=Math.floor(rand()*4);
 for(const v of vis)if(v.k==='box'||v.k==='meme'){v.pose=bi%2?1:-1;v.entry=ENTRIES[(bi+Math.floor(rand()*2))%4];bi++;}
 const full=[];let cur=0;for(const v of vis){if(v.oS<cur)v.oS=cur;if(v.oE-v.oS<0.2)continue;if(v.oS>cur+0.02)full.push({k:'th',oS:cur,oE:v.oS});full.push(v);cur=v.oE;}
 if(cur<DUR-0.02)full.push({k:'th',oS:cur,oE:DUR});
 const cuts=pieces.map(p=>p.o).slice(1);let shots=[];
 for(const v of full){let a=v.oS;const cs=cuts.filter(c=>c>v.oS+0.05&&c<v.oE-0.05);for(const c of [...cs,v.oE]){shots.push({...v,oS:a,oE:c,off:a-v.oS,first:a===v.oS,vd:v.oE-v.oS});a=c;}}
 const FX=R.fx||{};
 const PICOS=FX.pico||FX.aura?lerPicos():null,TELA=FX.telaCheia?lerTela():null;
 const cheia=s=>!!FX.telaCheia&&(TELA?s.pool!=='inv'&&TELA.has(path.basename(s.take)):!s.pool); // gameplay em tela cheia (só clipe limpo da lista)
 // início do clipe: padrão 0,15 (YouTube) / 0,9 (gravação); com pico, o auge cai a ~40% do shot (nunca antes do padrão)
 const iniClipe=(s,isYT)=>{const p=PICOS&&(PICOS[s.take]??PICOS[path.basename(s.take)]);const b=isYT?0.15:0.9;if(s.aura&&p&&p.aura!=null)return Math.max(b,p.aura); // aura: começa no melhor trecho
  const v=p==null||!FX.pico?null:typeof p==='object'?p.pico:p;return v==null?b:Math.max(b,v-0.4*s.vd);};const ganchoTxt=FX.gancho===true?PROJ.gancho:FX.gancho;
 // abertura: cena logo no início começa no 0 (some o fiapo dela antes) e pula o fade escuro da cena
 if(FX.abertura){if(shots[0].k==='th'&&shots[1]&&shots[1].k==='mo'&&shots[1].first&&shots[0].oE<0.3){shots=shots.slice(1);shots[0].oS=0;}
  if(shots[0].k==='mo'){const k=aberturaDe(shots[0].clip);for(let j=0;j<shots.length&&(j===0||(shots[j].k==='mo'&&!shots[j].first));j++)shots[j].off+=k;}}
 let zi=0;for(const s of shots)if(s.k==='th'){s.z=R.zoom[zi%R.zoom.length];zi++;}
 // punch: degrau de zoom (×1,10, segurando até o corte) em até 4 palavras de destaque, espaçadas ≥5s
 if(FX.punch){let ult=-9,n=0;for(const p of pieces)for(const w of W){if(n>=4||w.s<p.s||w.s>=p.e)continue;const u=w.t.toUpperCase().replace(/[.,!?]$/,'');if(!HL_RE.test(u))continue;const o=p.o+(w.s-p.s)-0.03;
   const k=shots.findIndex(x=>x.k==='th'&&o-x.oS>=0.15&&x.oE-o>=0.35);if(k<0||o-ult<5)continue;const a=shots[k];shots.splice(k,1,{...a,oE:o},{...a,oS:o,off:a.off+(o-a.oS),first:false,z:+(a.z*1.1).toFixed(3),punch:true});ult=o;n++;}}
 const shotAt=o=>shots.find(s=>o>=s.oS&&o<s.oE);
 // checagem de qualidade (regras aprendidas com o feedback) — antes de gastar tempo renderizando
 const q=valida({R,shots,DUR,SENT,MEME_CUES,MV});
 for(const w of q.avisos)console.warn(`[${R.id}] aviso: ${w}`);
 if(q.erros.length){for(const e of q.erros)console.error(`[${R.id}] ERRO: ${e}`);if(!FLAGS.has('--forcar')&&!FLAGS.has('--plano'))throw new Error(`${R.id}: reprovado na checagem de qualidade (use --forcar para ignorar)`);}
 if(FLAGS.has('--plano'))return {id:R.id,duracao:+DUR.toFixed(2),erros:q.erros,avisos:q.avisos,shots:shots.map(s=>({k:s.k,de:+s.oS.toFixed(2),ate:+s.oE.toFixed(2),...(s.clip?{clip:s.clip}:{}),...(s.take?{take:s.take}:{}),...(s.meme?{meme:s.meme.id,cat:s.cat}:{}),...(s.z?{zoom:s.z}:{})}))};

 // 3) render dos shots (com correção de cor nela)
 const G=GRADE[R.grade];
 const thCrop=z=>{const w=Math.round(1080/z/2)*2,h=Math.round(1920/z/2)*2;return `crop=${w}:${h}:${(1080-w)/2}:${Math.round((1920-h)*0.3)},scale=1080:1920:flags=lanczos`};
 const list=[],gameAudio=[];
 // speed lines nos primeiros 0,3s do gameplay, mesmo se um corte da fala dividir o shot (cheias até 0,08s, somem até 0,28s)
 const slIn=s=>['-loop','1','-t',(0.3-s.off).toFixed(3),'-i',speedLines()];
 const slFade=s=>{const a0=Math.min(1,Math.max(0.05,1-(s.off-0.08)/0.2)),st=Math.max(0,0.08-s.off);return `format=rgba,colorchannelmixer=aa=${a0.toFixed(3)},fade=t=out:st=${st.toFixed(3)}:d=${Math.max(0.03,0.28-Math.max(s.off,0.08)).toFixed(3)}:alpha=1`;};
 shots.forEach((s,i)=>{const n=fr(s.oE)-fr(s.oS);if(n<=0)return;const o=path.join(TMP,`s${String(i).padStart(3,'0')}.mp4`);const src=o2s(s.oS);let args;
  if(s.k==='th'){let fxv='';
   // nitidez: unsharp leve + vinheta suave
   if(FX.nitidez)fxv+=',unsharp=5:5:0.45:5:5:0,vignette=angle=PI/7';
   args=['-ss',src.toFixed(3),'-i',BASE,'-vf',`${thCrop(s.z)},${G},fps=30${fxv},setsar=1`];}
  else if(s.k==='mo')args=['-ss',s.off.toFixed(3),'-i',`${MO}/${s.clip}.mp4`,'-vf',`fps=30,tpad=stop_mode=clone:stop_duration=10${ganchoTxt&&i===0?',scale=810:1440:flags=lanczos,pad=1080:2000:135:560:color=0x07080a,crop=1080:1920:0:0':''},setsar=1`]; // com gancho, o site de abertura fica a 75% e mais baixo
  else if(s.k==='meme'){ // meme no quadrado 3D arredondado, centro, com ela desfocada atrás
   const fd=path.join(TMP,`bf${i}`),od=path.join(TMP,`bo${i}`);fs.mkdirSync(fd);fs.mkdirSync(od);const file=CATALOG.pasta+'/'+s.meme.arquivo;
   const inArgs=s.meme.tipo==='video'?['-stream_loop','-1','-ss',((CUR&&s.meme.ini!=null?s.meme.ini:0.1)+s.off).toFixed(3),'-i',file]:['-loop','1','-i',file];
   run([...inArgs,'-frames:v',String(n),'-vf',"fps=30,crop='min(iw,ih)':'min(iw,ih)',scale=860:860:flags=lanczos,setsar=1",'-q:v','2',path.join(fd,'f%04d.jpg')]);
   execFileSync('node',[path.join(__dirname,'box3d.js'),JSON.stringify({frames:fd,out:od,n:fs.readdirSync(fd).length,entry:s.entry,pose:s.pose,off:s.off,flat:true,...(FX.memeSeco?{seco:true}:{})})],{stdio:'inherit'});
   args=['-ss',src.toFixed(3),'-i',BASE,'-framerate','30','-i',path.join(od,'o%04d.png'),'-filter_complex',
    `[0:v]${thCrop(1)},${G},fps=30,gblur=sigma=28,eq=brightness=-0.1[bg];[1:v]tpad=stop_mode=clone:stop_duration=2[fg];[bg][fg]overlay=0:0,setsar=1[out]`,'-map','[out]'];}
  else if(cheia(s)){ // telaCheia: gameplay de arma em tela cheia (9:16 do clipe, leve zoom); speed: linhas + punch 1,08→1,0 na entrada
   const isYT=path.basename(s.take).startsWith('yt_');const gss=iniClipe(s,isYT)+s.off;const ent=FX.speed&&s.off<0.28;
   const crop=isYT?"crop='ih*9/16/1.04':'ih/1.04':(iw-ow)/2:(ih-oh)/2":'crop=780:1386:1320:27';
   const g=`[0:v]fps=30,${crop},scale=1080:1920:flags=lanczos,eq=saturation=1.2:contrast=1.04${ent?`,zoompan=z='1+0.08*pow(1-min(1,(on+${fr(s.off)})/6),2)':d=1:x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':s=1080x1920:fps=30`:''},setsar=1`;
   args=['-ss',gss.toFixed(3),'-i',`${MV}/${s.take}`,...(ent?slIn(s):[]),'-filter_complex',ent?`${g}[g];[1:v]${slFade(s)}[sl];[g][sl]overlay=0:0:eof_action=pass[out]`:`${g}[out]`,'-map','[out]'];
   if(!isYT){const wav=path.join(TMP,`g${i}.wav`);execFileSync(ff,['-v','error','-y','-ss',gss.toFixed(3),'-i',`${MV}/${s.take}`,'-t',(s.oE-s.oS).toFixed(3),'-vn','-ac','2','-ar','48000','-af',`afade=t=in:d=0.03,afade=t=out:st=${Math.max(0,s.oE-s.oS-0.05).toFixed(3)}:d=0.05`,wav]);
   gameAudio.push([wav,s.oS]);}}
  else{const isYT=path.basename(s.take).startsWith('yt_');const gss=iniClipe(s,isYT)+s.off;
   const BX=FX.boxGrande?980:860; // boxGrande: quadrado 3D de 980px (padrão 860)
   const vf=!isYT?`crop=980:980:1220:330,scale=${BX}:${BX}:flags=lanczos`:s.pool==='inv'?`scale=${BX}:-2:flags=lanczos,pad=${BX}:${BX}:0:(oh-ih)/2:color=0x16171a`:`crop='ih*0.72':'ih*0.72':(iw-ow)/2:(ih-oh)*0.6,scale=${BX}:${BX}:flags=lanczos`;
   const fd=path.join(TMP,`bf${i}`),od=path.join(TMP,`bo${i}`);fs.mkdirSync(fd);fs.mkdirSync(od);
   run(['-ss',gss.toFixed(3),'-i',`${MV}/${s.take}`,'-frames:v',String(n),'-vf',`fps=30,${vf},eq=saturation=1.2:contrast=1.04`,'-q:v','2',path.join(fd,'f%04d.jpg')]);
   execFileSync('node',[path.join(__dirname,'box3d.js'),JSON.stringify({frames:fd,out:od,n:fs.readdirSync(fd).length,entry:s.entry,pose:s.pose,off:s.off,...(FX.boxSeco?{seco:true}:{}),...(FX.boxGrande?{tam:980}:{})})],{stdio:'inherit'});
   args=['-ss',src.toFixed(3),'-i',BASE,'-framerate','30','-i',path.join(od,'o%04d.png'),'-filter_complex',
    `[0:v]${thCrop(1)},${G},fps=30,gblur=sigma=28,eq=brightness=-0.1[bg];[1:v]tpad=stop_mode=clone:stop_duration=2[fg];[bg][fg]overlay=0:0,setsar=1[out]`,'-map','[out]'];
   if(FX.speed&&s.off<0.28&&!s.pool){args.splice(args.indexOf('-filter_complex'),0,...slIn(s)); // speed também no quadrado 3D
    const k=args.indexOf('-filter_complex')+1;args[k]=args[k].replace('setsar=1[out]',`setsar=1[o0];[2:v]${slFade(s)}[sl];[o0][sl]overlay=0:0:eof_action=pass[out]`);}
   if(!isYT){const wav=path.join(TMP,`g${i}.wav`);execFileSync(ff,['-v','error','-y','-ss',gss.toFixed(3),'-i',`${MV}/${s.take}`,'-t',(s.oE-s.oS).toFixed(3),'-vn','-ac','2','-ar','48000','-af',`afade=t=in:d=0.03,afade=t=out:st=${Math.max(0,s.oE-s.oS-0.05).toFixed(3)}:d=0.05`,wav]);
   gameAudio.push([wav,s.oS]);}}
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
 const inBox=o=>shots.some(s=>((s.k==='box'&&!cheia(s))||s.k==='meme')&&o>=s.oS-0.03&&o<s.oE); // gameplay em tela cheia leva legenda
 // zona da legenda: box (sem legenda), site (sem legenda com legendaSite:false), brand (legenda mais baixa), n (normal)
 const zona=o=>{if(inBox(o))return 'box';if(FX.legendaSite===false){const s=shotAt(o);if(s&&s.k==='mo')return /^site_/.test(s.clip)?'site':/^brand_/.test(s.clip)?'brand':'n';}return 'n';};
 const ws=[];for(const p of pieces)for(const w of W)if(w.s>=p.s&&w.s<p.e)ws.push({...w,o:p.o+(w.s-p.s),oe:p.o+(Math.min(w.e,p.e)-p.s)});
 const groups=[];let g=[];
 ws.forEach((w,i)=>{g.push(w);const txt=g.map(x=>x.t).join(' ');const nx=ws[i+1];
  if(/[.,?!]$/.test(w.t)||!nx||(FX.legenda==='grande'?(txt+' '+nx.t).length>9:txt.length>=12)||g.length>=(FX.legenda==='grande'?2:3)||nx.o-w.oe>0.25||zona(nx.o)!==zona(w.o)){groups.push(g);g=[];}});
 const HL=HL_RE;
 const ts=t=>{const h=Math.floor(t/3600),m=Math.floor(t%3600/60),s=(t%60).toFixed(2).padStart(5,'0');return `${h}:${String(m).padStart(2,'0')}:${s}`};
 const style=R.cap==='faixa'
  ?`Style: C,Sniglet,92,&H00FFFFFF,&H00FFFFFF,&H28111111,&H00000000,-1,0,0,0,100,100,0,0,3,18,0,5,70,70,0,1`
  :FX.legenda==='grande'?`Style: C,Sniglet,130,&H00FFFFFF,&H00FFFFFF,&H00000000,&H50000000,-1,0,0,0,100,100,0,0,1,0,7,5,70,70,0,1` // grande: sombra mais firme (ainda sem contorno)
  :`Style: C,Sniglet,100,&H00FFFFFF,&H00FFFFFF,&H00000000,&H96000000,-1,0,0,0,100,100,0,0,1,0,5,5,70,70,0,1`;
 let ass=`[Script Info]\nScriptType: v4.00+\nPlayResX: 1080\nPlayResY: 1920\nWrapStyle: 0\n\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\n${style}\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n`;
 // gancho: título grande no topo nos primeiros ~2,2s (branco com sombra, sem contorno; *trecho* em amarelo)
 if(ganchoTxt){const G2=ganchoASS(ganchoTxt);
  ass=ass.replace(/\n\n\[Events\]/,`\nStyle: G,Archivo Black,${G2.size},&H00FFFFFF,&H00FFFFFF,&H00000000,&H8C000000,0,0,0,0,100,100,0,0,1,0,7,8,40,40,0,1\n\n[Events]`);
  ass+=`Dialogue: 2,${ts(0)},${ts(Math.min(2.2,DUR))},G,,0,0,0,,{\\an8\\pos(540,470)\\fad(0,220)\\fscx60\\fscy60\\t(0,140,\\fscx108\\fscy108)\\t(140,240,\\fscx100\\fscy100)}${G2.txt}\n`;}
 let hi=0;const lim=t=>t.replace(/\{[^}]*\}/g,''); // legenda grande: sobe para a parede (y=1300) e palavra comprida encolhe para caber em ~85% da largura
 groups.forEach((g,i)=>{const z=zona(g[0].o);if(z==='box'||z==='site')return;let s=g[0].o;const nx=groups[i+1];const e=Math.min(nx?nx[0].o:g[g.length-1].oe+0.4,g[g.length-1].oe+0.6,DUR);
  if(FX.speed&&FX.telaCheia){const sh=shots.find(x=>x.k==='box'&&cheia(x)&&x.first&&s>=x.oS-0.03&&s<x.oS+0.3);if(sh){s=sh.oS+0.3;if(s>e-0.15)return;}} // speed: legenda só depois das linhas (~0,3s)
  const txt=g.map(w=>{const u=w.t.toUpperCase().replace(/[.,!]$/,'');if(HL.test(u)||HL.test(u.replace(/\?$/,''))||(FX.corTema&&PRECO_RE.test(u))){const c=FX.corTema?temaCor(u):R.hl[hi++%R.hl.length];return `{\\c${c}}${u}{\\c&HFFFFFF&}`}return u}).join(' ');
  ass+=`Dialogue: 1,${ts(s)},${ts(e)},C,,0,0,0,,{\\pos(540,${z==='brand'?1700:FX.legenda==='grande'?1300:1470})${FX.legenda==='grande'&&lim(txt).length>10?'\\fs'+Math.round(1300/lim(txt).length):''}\\fscx80\\fscy80\\t(0,80,\\fscx106\\fscy106)\\t(80,150,\\fscx100\\fscy100)}${txt}\n`;});
 // precoGigante: "R$ 17,90" verde gigante no alto (na parede, acima da cabeça) por ~1,2s quando ela fala o preço (sem moedaEm: logo depois do gancho, antes dos 3s)
 if(FX.precoGigante){const o=PROJ.moedaEm!=null?s2o(PROJ.moedaEm):ganchoTxt?2.25:1.0;
  if(o!=null&&o+1.2<DUR){ass=ass.replace(/\n\n\[Events\]/,`\nStyle: P,Archivo Black,250,&H00${VERDE.slice(2,8)},&H00FFFFFF,&H00000000,&H78000000,0,0,0,0,100,100,0,0,1,0,9,5,40,40,0,1\n\n[Events]`);
   ass+=`Dialogue: 3,${ts(o)},${ts(o+1.2)},P,,0,0,0,,{\\an5\\pos(540,480)\\fad(0,150)\\fscx40\\fscy40\\t(0,120,\\fscx112\\fscy112)\\t(120,200,\\fscx100\\fscy100)}{\\fs120}R$ {\\fs250}17,90\n`;}}
 fs.writeFileSync(path.join(TMP,'legenda.ass'),ass);

 // 6) sons
 const P=PACKS[R.pack];const ev=[];
 const add=(f,at,cat,start)=>{if(!f)return;const pk=PEAKS[f]||peakOf(f);if(start){ev.push({f,t:at,gain:+Math.min(2.5,LEVEL[cat]/pk.rms).toFixed(3),len:Math.min(pk.dur,start)});return;}const gain=Math.min(2.5,LEVEL[cat]/pk.rms);ev.push({f,t:at-pk.peak,gain:+gain.toFixed(3),len:Math.min(pk.dur,cat==='meme'?2.2:pk.peak+0.9)});};
 shots.forEach((s,i)=>{if(!s.first||i===0)return;const prev=shots[i-1];
  if(s.k==='mo')add(P.mo,s.oS,'mo');else if(s.k==='box'&&prev.k!=='box')add(P.box,s.oS,'box');});
 const items={brand_feedback:[0.35,0.7],brand_entrega:[0.25,0.75,1.3],brand_cta:[0.35,0.75,1.4],brand_intro:[0.35,0.75,1.15],brand_cta2:[0.35,0.75,1.25],brand_cta3:[0.75,1.25]};
 shots.filter(s=>s.k==='mo'&&s.first).forEach(s=>{(items[s.clip]||[]).forEach(x=>{if(s.oS+x<s.oE)add(P.pop,s.oS+x,'pop')});
  });
 {const o=PROJ.moedaEm==null?null:s2o(PROJ.moedaEm);if(o!=null)add(P.coin,o,'coin');}
 {const c=shots.find(x=>x.k==='mo'&&x.clip==='brand_cta3'&&x.first);if(c)add(P.coin,c.oS+0.35,'coin');}
 {const g=shots.find(x=>x.k==='box'&&x.first&&x.oS>DUR*0.4);if(P.boom&&g)add(P.boom,g.oS,'boom');}
 reac.forEach(r=>add(r.snd,r.o+0.12,'meme'));
 shots.filter(s=>s.k==='meme'&&s.first).forEach(s=>{const all=shots.filter(x=>x.k==='meme'&&x.meme===s.meme);const len=Math.min(1.6,all[all.length-1].oE-s.oS+0.1);if(!s.som||!s.audio)return;let f=s.audio;
  if(CUR&&f==='proprio'){f=path.join(TMP,`ms_${s.meme.id}.wav`);execFileSync(ff,['-v','error','-y','-ss',String(s.meme.ini??0.1),'-i',CATALOG.pasta+'/'+s.meme.arquivo,'-t','2.5','-vn','-ac','2','-ar','48000',f]);} // som do próprio vídeo do meme, a partir de ini
  else if(CUR&&/^assets\//.test(f))f=ROOT+'/'+f;
  add(f.includes(':')?f:CATALOG.pasta+'/'+f,s.oS,'memepack',len);});
 {const q2=checaSons(ev);if(q2.length){for(const e of q2)console.error(`[${R.id}] ERRO: ${e}`);if(!FLAGS.has('--forcar'))throw new Error(R.id+': som proibido');}}
 const ins=['-i',path.join(TMP,'video.mp4'),'-i',BASE];
 ev.forEach(e=>ins.push('-i',e.f.includes(':')?e.f:`${SFX}/${e.f}`));gameAudio.forEach(([w])=>ins.push('-i',w));
 const nA=2+ev.length+gameAudio.length;
 reac.forEach(r=>ins.push('-framerate','30','-itsoffset',r.o.toFixed(3),'-i',path.join(stkDir(r),'s%04d.png')));
 const esc=p=>p.split(path.sep).join('/').replace(':','\\:');
 let fc='',vl='[0:v]';
 reac.forEach((r,j)=>{fc+=`[${nA+j}:v]scale=${Math.round(480*r.sc)}:-1[k${j}];${vl}[k${j}]overlay=${r.x}:${r.y}:eof_action=pass[v${j}];`;vl=`[v${j}]`;});
 // música de fundo: entra depois de tudo (não muda os índices das outras entradas); faixa escolhida por seed dentro do mood
 let mus=null;
 if(FX.musica){const MC=JSON.parse(fs.readFileSync(MUS+'/catalogo.json','utf8'));const fx=MC.faixas.filter(f=>f.mood===(FX.musica.mood||'energia'));
  if(fx.length){const f=fx[Math.floor(rng(R.seed+77)()*fx.length)];mus={...f,idx:nA+reac.length};ins.push('-stream_loop','-1','-ss',String(f.inicioSom||0),'-i',`${MUS}/${f.arquivo}`);}}
 // progresso: barra amarela fina no topo, enchendo do início ao fim
 const vsub=FX.progresso?'[vs]':'[v]';
 fc+=`${vl}subtitles=filename='${esc(path.join(TMP,'legenda.ass'))}':fontsdir='${esc(FONTS)}'${vsub};`;
 if(FX.progresso)fc+=`color=c=0xFFE100:s=1080x9:r=30:d=${DUR.toFixed(3)}[pb];[vs][pb]overlay=x='-w+w*t/${DUR.toFixed(3)}':y=0:eof_action=pass[v];`;
 pieces.forEach((p,i)=>{fc+=`[1:a]atrim=${p.s.toFixed(3)}:${p.e.toFixed(3)},asetpts=PTS-STARTPTS,aresample=48000,afade=t=in:d=0.015,afade=t=out:st=${(p.e-p.s-0.02).toFixed(3)}:d=0.02[p${i}];`;});
 fc+=`${pieces.map((_,i)=>`[p${i}]`).join('')}concat=n=${pieces.length}:v=0:a=1,apad=pad_dur=${TAIL+0.2},loudnorm=I=-15:TP=-1.5,aresample=48000[voz];`;
 const labs=[];
 ev.forEach((e,i)=>{const ms=Math.max(0,Math.round(e.t*1000));fc+=`[${i+2}:a]aresample=48000,atrim=0:${e.len.toFixed(3)},afade=t=out:st=${Math.max(0,e.len-0.2).toFixed(3)}:d=0.2,volume=${e.gain},adelay=${ms}|${ms}[e${i}];`;labs.push(`[e${i}]`);});
 gameAudio.forEach(([,at],j)=>{const ms=Math.round(at*1000);fc+=`[${ev.length+2+j}:a]volume=0.45,adelay=${ms}|${ms}[g${j}];`;labs.push(`[g${j}]`);});
 // música ~db abaixo da voz (voz = -15 LUFS), ducking com a voz como chave, fades, +3 dB no card final
 if(mus){const ganho=(-15+(FX.musica.db??-16))-mus.lufs;const cta=shots.find(x=>x.k==='mo'&&x.clip==='brand_cta3'&&x.first);
  fc+=`[voz]asplit=2[vz][vk];[${mus.idx}:a]aresample=48000,aformat=channel_layouts=stereo,atrim=0:${DUR.toFixed(3)},volume=${ganho.toFixed(1)}dB,afade=t=in:d=0.3,afade=t=out:st=${Math.max(0,DUR-1.2).toFixed(3)}:d=1.2${cta?`,volume=3dB:enable='gte(t,${cta.oS.toFixed(3)})'`:''}[mu];`;
  fc+=`[mu][vk]sidechaincompress=threshold=0.06:ratio=3:attack=20:release=350:knee=4[mus];`;labs.push('[mus]');}
 // master: com qualquer fx (fx:{masterOk:true} basta) o limiter tem oversampling 4x, teto -3 dBFS e sem auto-level (true peak < -1 dBTP depois do AAC)
 fc+=`${mus?'[vz]':'[voz]'}${labs.join('')}amix=inputs=${labs.length+1}:normalize=0:duration=first,${R.fx?"aresample=192000,alimiter=limit=0.7:level=0,aresample=48000":"alimiter=limit=0.95"}[a]`;
 const OUT=`${OUTDIR}/criativo_${R.id}.mp4`;
 run([...ins,'-filter_complex',fc,'-map','[v]','-map','[a]','-t',DUR.toFixed(3),'-c:v','libx264','-crf','19','-preset','medium','-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-movflags','+faststart',OUT]);
 const desc={id:R.id,lote:LOTE,projeto:PROJ.nome,memes:shots.filter(s=>s.k==='meme'&&s.first).map(s=>s.meme.id),duracao:+DUR.toFixed(2),ordem:R.order,reacoes:reac.map(r=>r.emoji),sons:ev.length,takes:[...used],...(R.fx?{fx:R.fx,...(mus?{musica:mus.arquivo}:{})}:{})};
 console.log(JSON.stringify(desc));return desc;
}
if(FLAGS.has('--receitas')){fs.writeFileSync(path.join(OUTDIR,`_receitas_lote${LOTE}.json`),JSON.stringify(V.map(R=>({...R,lote:LOTE,jump:R.gap!=null,packName:PACK_NAMES[R.pack],projeto:PROJ.nome})),null,1));process.exit(0);}
// lock de render: um render por vez na máquina (pouca RAM; vt/ não se atropela). Outro render vivo → espera em loop até liberar
function travaRender(){const L=path.join(__dirname,'vt','_render.lock');fs.mkdirSync(path.dirname(L),{recursive:true});
 const vivo=pid=>{try{process.kill(pid,0);return true}catch(e){return e.code==='EPERM'}};let avisou=false;
 for(;;){try{const fd=fs.openSync(L,'wx');fs.writeSync(fd,String(process.pid));fs.closeSync(fd);break;}catch(e){if(e.code!=='EEXIST')throw e;}
  let pid=0,idade=0;try{pid=parseInt(fs.readFileSync(L,'utf8'))||0;idade=Date.now()-fs.statSync(L).mtimeMs}catch(e){continue}
  if(pid?!vivo(pid):idade>10000){try{fs.unlinkSync(L)}catch(e){}continue;} // dono morreu (ou lock vazio antigo): libera
  if(!avisou){console.log(`aguardando outro render terminar (pid ${pid||'?'})...`);avisou=true;}
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,3000);}
 const solta=()=>{try{if(parseInt(fs.readFileSync(L,'utf8'))===process.pid)fs.unlinkSync(L)}catch(e){}};
 process.on('exit',solta);for(const sg of ['SIGINT','SIGTERM'])process.on(sg,()=>process.exit(130));}
if(!FLAGS.has('--plano'))travaRender();
const which=POS[2]||'all';const res=[];
for(const R of V)if(which==='all'||which.split(',').includes(R.id))res.push(build(R));
if(FLAGS.has('--plano')){console.log(JSON.stringify(res,null,1));process.exit(res.some(r=>r.erros.length)?2:0);}
fs.writeFileSync(path.join(OUTDIR,`_resumo_lote${LOTE}_`+which.replace(/,/g,'_')+'.json'),JSON.stringify(res,null,1));
