// cacador.js — caça automática de takes de clímax para o estoque moveset (nota "cacador-takes").
// busca em massa (só vídeos com 1080p real) → pré-triagem por energia/picos e anti-HUD → juiz visual do Claude (ia.js)
// → corte em alta só do clímax → régua de nitidez → estoque (tag + pico).
// uso: node cacador.js --alvo golpe_soul_guitar [--videos 40] [--queries 'a|b|c'] [--estoque] [--picos 8] [--teto 3]
//      node cacador.js --alvo golpe_cdk --arquivo C:/gravacao.mp4   (gravação própria: pula busca/download)
//  --teto: para o alvo se o gasto com o Claude passar de US$ teto sem nenhum take aprovado (padrão 3).
//  sem --estoque os takes aprovados vão para DADOS/_cacador_saida/<alvo>/ (para conferir) e nada do moveset muda.
//  velocidade: --fatia k/n (processos paralelos do mesmo alvo dividem os vídeos), --fps 3 (triagem), --lote 16 (picos por chamada ao juiz),
//  --ram-min 2.5 (GB livres; abaixo disso segura novos vídeos). Cache e listas são gravados de forma atômica (vários processos ao mesmo tempo).
const fs=require('fs'),path=require('path'),os=require('os'),{spawnSync}=require('child_process');
const {DADOS}=require('./paths');const {perguntar}=require('./ia');
const FF=require('ffmpeg-static');const YT=path.join(__dirname,'tools','yt-dlp.exe');
const MV=DADOS+'/moveset',TMP=DADOS+'/_cacador_tmp',TMPP=TMP+'/'+process.pid,SAIDA=DADOS+'/_cacador_saida';
const CACHE=path.join(__dirname,'cacador_cache.json'),GASTO=path.join(__dirname,'cacador_gasto.json'),REL=path.join(__dirname,'cacador_relatorio.md');

const arg=(k,d)=>{const i=process.argv.indexOf('--'+k);return i<0?d:(process.argv[i+1]&&!process.argv[i+1].startsWith('--')?process.argv[i+1]:true);};
const ALVO=arg('alvo');if(!ALVO){console.error('uso: node cacador.js --alvo golpe_soul_guitar [--videos 40] [--queries "a|b"] [--estoque]');process.exit(1);}
const NVID=+arg('videos',40),NPICOS=+arg('picos',8),ESTOQUE=!!arg('estoque',false),TETO=+arg('teto',3),ARQ=arg('arquivo');
const REJ=+arg('rejulgar',5);const [FK,FN]=String(arg('fatia','0/1')).split('/').map(Number),LOTE=+arg('lote',16),RAMMIN=+arg('ram-min',2.5);
const naFatia=id=>[...id].reduce((h,c)=>(h*31+c.charCodeAt(0))>>>0,7)%FN===FK;
const dorme=ms=>Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,ms);
function esperaRam(){let avisou=false;while(os.freemem()/2**30<RAMMIN){if(!avisou){log(`RAM livre ${(os.freemem()/2**30).toFixed(1)} GB < ${RAMMIN} — segurando`);avisou=true;}dorme(15000);}}
const LIM={borrado:5.3,blocos:1.6,nota:7,semHud:8}; // nota >=7 liberada pelo dono ('deixa os nota 7'); HUD/texto e borrado continuam fora

const QUERIES={
 golpe_soul_guitar:['blox fruits soul guitar edit 4k','soul guitar cinematic edit','blox fruits soul guitar showcase no ui','blox fruits soul guitar close up','blox fruits soul guitar 1440p','blox fruits update 17.3 trailer','blox fruits skull guitar edit'],
 golpe_cdk:['blox fruits cdk edit 4k','cursed dual katana cinematic edit','blox fruits cdk showcase no ui','blox fruits cdk close up','blox fruits cursed dual katana 1440p','blox fruits update trailer'],
 golpe_godhuman:['blox fruits godhuman edit 4k','godhuman cinematic edit','blox fruits godhuman showcase no ui','blox fruits godhuman close up','blox fruits godhuman 1440p','blox fruits update trailer'],
 aura_v4:['blox fruits race v4 awakening 4k','blox fruits v4 transformation cinematic','blox fruits all race v4 showcase'],
 aura:['blox fruits haki aura showcase 4k','blox fruits aura cinematic'],
};
// tag → pasta no moveset
const PASTA={golpe_soul_guitar:'soul guitar/cacador',golpe_cdk:'cdk/cacador',golpe_godhuman:'godhuman/cacador',aura_v4:'aura/racas/cacador',aura:'aura/geral',inventario_cheio:'inventario frutas miticas',level_max:'conta e itens'};
const TAGS=Object.keys(PASTA);

// leitura/escrita seguras com vários processos: escreve em .tmp e renomeia; leitura que falha no meio de uma troca tenta de novo
function rj(f,d){if(!fs.existsSync(f))return d;for(let i=0;i<20;i++){try{return JSON.parse(fs.readFileSync(f,'utf8'))}catch{dorme(100)}}throw new Error('não consegui ler '+f);}
function wj(f,o){const t=`${f}.${process.pid}.tmp`;fs.writeFileSync(t,JSON.stringify(o,null,1));for(let i=0;i<20;i++){try{fs.renameSync(t,f);return}catch{dorme(100)}}fs.copyFileSync(t,f);fs.rmSync(t,{force:true});}
// lê-modifica-grava numa chave só (o resto do arquivo é de outros processos)
const atualiza=(f,fn,d={})=>{const o=rj(f,d);fn(o);wj(f,o);return o;};
const cacheSet=(cache,id,val)=>{cache[id]=val;atualiza(CACHE,c=>{c[id]=val;});};
const run=(bin,a,o={})=>{const r=spawnSync(bin,a,{encoding:o.bin?'buffer':'utf8',maxBuffer:1<<30,windowsHide:true,timeout:o.t||10*60*1000});
 if(bin!==YT&&a.some(x=>/googlevideo/.test(String(x)))&&/HTTP error 403|403 Forbidden|429/i.test(String(r.stderr||''))){log('stream do YouTube recusado (403/429) — parando tudo, sem insistir');process.exit(3);}
 return r;};
// YouTube: pausa entre pedidos (--pausa s) + ritmo do yt-dlp (--sleep-requests 1.5, --sleep-interval 4..9);
// no primeiro bloqueio ("not a bot"/403/429) o processo sai com código 3 sem marcar nada — quem religa é o retomar.sh.
// login do YouTube exportado pelo dono (cookies.txt); se existir, vai em todo pedido. Nunca vai para o git.
const COOKIES=path.join(__dirname,'youtube_cookies.txt');
const PAUSA=+arg('pausa',4)*1000,ESPERA=+arg('espera-bloqueio',20)*60000;let ultimoYT=0,bloqueios=0;
// cookies só valem se forem de LOGIN (SAPISID/LOGIN_INFO); um arquivo anônimo não ajuda e é ignorado
const cookieOk=()=>{try{return /	(SAPISID|__Secure-3PAPISID|LOGIN_INFO)	/.test(fs.readFileSync(COOKIES,'utf8'))}catch{return false}};
// todas as chamadas ao YouTube com o ritmo pedido pelo maestro; ao PRIMEIRO "not a bot" o processo para (código 3) e não insiste
const RITMO=['--sleep-requests','1.5','--sleep-interval','4','--max-sleep-interval','9'];
function bloqueado(r){if(/not a bot|HTTP Error 429|rate.?limit/i.test(r.stderr||'')){log('YouTube bloqueou ("not a bot") — parando tudo, sem insistir');process.exit(3);}}
function yt(a,o={}){const falta=ultimoYT+PAUSA-Date.now();if(falta>0)dorme(falta);ultimoYT=Date.now();
 const r=run(YT,['--no-check-certificates','--no-warnings',...(o.semIntervalo?RITMO.slice(0,2):RITMO),...(cookieOk()?['--cookies',COOKIES]:[]),...a]);bloqueado(r);return r;}
const log=(...m)=>console.log('[caçador]',...m);
const rel=[];

// 1. busca ---------------------------------------------------------------------------------------
function buscar(cache){
 const qs=arg('queries')?String(arg('queries')).split('|'):QUERIES[ALVO]||[`blox fruits ${ALVO.replace(/_/g,' ')} showcase 4k`];
 const vistos=new Map(),novos={};
 for(const q of qs){
  const r=yt(['--flat-playlist','--print','%(id)s\t%(duration)s\t%(url)s\t%(title)s',`ytsearch20:${q}`]);
  for(const l of (r.stdout||'').split(/\r?\n/)){const [id,dur,url,...t]=l.split('\t');if(!id||vistos.has(id))continue;
   if(cache[id]||!naFatia(id)){continue;}
   const d=+dur;if(!(d>=60&&d<=1200)||/shorts/i.test(url||'')){cache[id]={data:hoje(),motivo:`duração ${dur}s ou shorts`};novos[id]=cache[id];continue;}
   const titulo=t.join(' '),ft=filtroTitulo(titulo);if(ft){cache[id]={data:hoje(),motivo:'título: '+ft,titulo};novos[id]=cache[id];continue;}
   vistos.set(id,{id,dur:d,titulo,query:q,pref:PREFERE.test(titulo)?1:0});}
 }
 atualiza(CACHE,c=>Object.assign(c,novos));
 // títulos com showcase/edit/cinematic/4k/combo/pvp/trailer primeiro
 return [...vistos.values()].sort((a,b)=>b.pref-a.pref);
}
// filtro de título ANTES de baixar (segurança do dono: script/exploit é conteúdo típico de malware; fora do tema = lixo)
const PROIBIDO=/\b(scripts?|hacks?|hacked|exploits?|executor|hub|auto\s*-?\s*farm|no\s*key|keyless|delta|fluxus|krnl|codes?|giveaway|free\s*robux|robux\s*gr[aá]tis|macros?|controls?)\b/i;
const PREFERE=/\b(showcase|edit|cinematic|4k|1440p|2160p|combo|pvp|trailer)\b/i;
const TERMO={golpe_soul_guitar:/soul\s*guitar|skull\s*guitar/i,golpe_cdk:/\bcdk\b|cursed\s*dual\s*katana/i,golpe_godhuman:/god\s*human/i,aura_v4:/\bv4\b|race|awaken/i,aura:/aura|haki/i};
function filtroTitulo(t){const m=t.match(PROIBIDO);if(m)return `proibido "${m[0]}"`;
 if(!/blox\s*fruits?|roblox/i.test(t)&&!(TERMO[ALVO]&&TERMO[ALVO].test(t)))return 'não cita Blox Fruits/Roblox nem o alvo';return null;}
const hoje=()=>new Date().toISOString().slice(0,10);
// formato real ≥1080p (paisagem); devolve a URL direta do melhor vídeo 1080–1440p
// segurança (dono): só VÍDEO mp4/webm e só pelo yt-dlp; nada de URL crua no ffmpeg (dá 403 sem os cabeçalhos do yt-dlp)
const FMT_ALTO='bv*[height>=1080][height<=1440][ext=mp4]/bv*[height>=1080][height<=1440]',FMT_360='bv*[height<=360][ext=mp4]/bv*[height<=360]';
function baixa(id,fmt,out,secao){const base=out.replace(/\.mp4$/,'');
 yt(['-f',fmt,'--ffmpeg-location',FF,'--no-playlist','--no-part',...(secao?['--download-sections',secao,'--force-keyframes-at-cuts']:[]),'--remux-video','mp4','-o',base+'.%(ext)s','--',id]);
 const d=path.dirname(base),b=path.basename(base);const f=fs.existsSync(d)&&fs.readdirSync(d).find(x=>x.startsWith(b+'.')&&/\.(mp4|webm)$/.test(x));
 if(!f)return null;const p=path.join(d,f);if(p!==out){try{fs.renameSync(p,out)}catch{return p}}return out;}
// trecho curto em 1080p ao redor de um pico: é dele que saem os quadros do juiz E o corte final
const MEIA=1.4;function trecho(id,t,out,meia=MEIA){const ini=Math.max(0,t-meia);return baixa(id,FMT_ALTO,out,`*${ini.toFixed(2)}-${(ini+2*meia).toFixed(2)}`)?{arq:out,base:ini,rel:t-ini}:null;}
function fonte1080(id){
 const r=yt(['-J',`https://www.youtube.com/watch?v=${id}`]);let j;try{j=JSON.parse(r.stdout)}catch{return null;}if(!j||typeof j!=="object")return null;
 const v=(j.formats||[]).filter(f=>f.vcodec&&f.vcodec!=='none'&&f.height>=1080&&f.height<=1440&&f.width>f.height&&f.url&&/^https?/.test(f.protocol||'https'))
  .sort((a,b)=>(b.height-a.height)||((/avc1/.test(b.vcodec)?1:0)-(/avc1/.test(a.vcodec)?1:0))||((b.tbr||0)-(a.tbr||0)));
 const lo=(j.formats||[]).filter(f=>f.vcodec&&f.vcodec!=='none'&&f.height>=240&&f.height<=480&&f.url&&/^https?/.test(f.protocol||'https')).sort((a,b)=>a.height-b.height)[0];
 const sb=(j.formats||[]).find(f=>f.format_id==='sb1')||(j.formats||[]).find(f=>f.format_id==='sb0');
 return v[0]?{id,h:v[0].height,w:v[0].width,fps:v[0].fps,tem360:!!lo,dur:j.duration,sb:sb&&sb.columns?{id:sb.format_id,cols:sb.columns,rows:sb.rows,fps:sb.fps,tw:sb.width,th:sb.height}:null}:null;
}

// 2. pré-triagem: 64x36 RGB a 3 fps do 360p baixado pelo yt-dlp (apagado logo depois), tudo medido aqui no node ----
const W=64,H=36,FPS=+arg('fps',3);
function quadros(f,lim){const r=run(FF,['-v','error',...(lim?['-t',String(lim)]:[]),'-i',f,'-vf',`fps=${FPS},scale=${W}:${H}:flags=area`,'-f','rawvideo','-pix_fmt','rgb24','-'],{bin:true});
 const buf=r.stdout||Buffer.alloc(0),N=Math.floor(buf.length/(W*H*3)),Y=[],S=[];
 for(let i=0;i<N;i++){const y=new Float32Array(W*H),s=new Float32Array(W*H);
  for(let p=0;p<W*H;p++){const o=(i*W*H+p)*3,R=buf[o]/255,G=buf[o+1]/255,B=buf[o+2]/255,mx=Math.max(R,G,B),mn=Math.min(R,G,B);y[p]=.299*R+.587*G+.114*B;s[p]=mx?(mx-mn)/mx:0;}Y.push(y);S.push(s);}
 return {Y,S,N};}
const qL=Math.round((W-0.72*H)/2),qT=Math.round(0.6*(H-0.72*H));
function hudDe(Y){const N=Y.length;
 // HUD: pixel com borda forte (gradiente) que quase não muda no tempo → texto/botões fixos
 const mean=new Float32Array(W*H),sd=new Float32Array(W*H);for(const y of Y)for(let p=0;p<W*H;p++)mean[p]+=y[p]/N;for(const y of Y)for(let p=0;p<W*H;p++)sd[p]+=(y[p]-mean[p])**2/N;
 const hudPx=new Uint8Array(W*H);for(let yy=1;yy<H-1;yy++)for(let x=1;x<W-1;x++){const p=yy*W+x,g=Math.abs(mean[p+1]-mean[p-1])+Math.abs(mean[p+W]-mean[p-W]);if(g>0.25&&Math.sqrt(sd[p])<0.04)hudPx[p]=1;}
 const banda=(a,b)=>{let c=0,t=0;for(let yy=a;yy<b;yy++)for(let x=0;x<W;x++){t++;c+=hudPx[yy*W+x];}return c/t;};
 const regiao=(x0,x1,y0,y1)=>{let c=0,t=0;for(let yy=y0;yy<y1;yy++)for(let x=x0;x<x1;x++){t++;c+=hudPx[yy*W+x];}return c/t;};
 // recorte do quadrado do motor (ih*0.72 central, 60% para baixo): só o que cai nele importa
 return {topo:banda(0,6),base:banda(H-7,H),meio:banda(6,H-7),quadrado:regiao(qL,W-qL,qT,qT+Math.round(0.72*H))};}
// TRIAGEM POR STORYBOARD (pedido do maestro: baixar menos): o mosaico de miniaturas do próprio YouTube (sb1, ~1 a cada 5s)
// dá cor/brilho/variação do vídeo inteiro e o HUD fixo; os picos saem dele em janelas largas, refinadas depois no trecho 1080p.
function lerMhtml(f,dir){const buf=fs.readFileSync(f),t=buf.toString('latin1'),out=[];let k=0,pos=0;
 // cada parte de imagem: cabeçalhos (Content-type: image/..., Content-length: N), linha em branco, N bytes binários
 for(;;){const i=t.indexOf('Content-type: image/',pos);if(i<0)break;
  const fimCab=t.indexOf('\r\n\r\n',i),fimCab2=t.indexOf('\n\n',i);const sep=fimCab>=0&&(fimCab2<0||fimCab<fimCab2)?[fimCab,4]:[fimCab2,2];if(sep[0]<0)break;
  const cab=t.slice(i,sep[0]),m=cab.match(/Content-length:\s*(\d+)/i),ext=/image\/webp/i.test(cab)?'webp':'jpg';if(!m)break;
  const ini=sep[0]+sep[1],n=+m[1];const o=path.join(dir,`sb_${String(k++).padStart(3,'0')}.${ext}`);fs.writeFileSync(o,buf.subarray(ini,ini+n));out.push(o);pos=ini+n;}
 return out;}
function triagemSB(src,dir){const sb=src.sb;if(!sb)return null;
 yt(['-f',sb.id,'--no-playlist','--no-part','-o',path.join(dir,'sb.%(ext)s'),'--',src.id]);
 const mh=fs.existsSync(dir)&&fs.readdirSync(dir).find(x=>/^sb\.mhtml$/.test(x));if(!mh)return null;
 const grades=lerMhtml(path.join(dir,mh),dir);try{fs.rmSync(path.join(dir,mh),{force:true})}catch{}
 const Y=[],S=[];
 for(const g of grades){const r=run(FF,['-v','error','-i',g,'-vf',`scale=${sb.cols*W}:${sb.rows*H}:flags=area`,'-f','rawvideo','-pix_fmt','rgb24','-'],{bin:true});
  const buf=r.stdout||Buffer.alloc(0),GW=sb.cols*W;if(buf.length<GW*sb.rows*H*3)continue;
  for(let ry=0;ry<sb.rows;ry++)for(let cx=0;cx<sb.cols;cx++){const y=new Float32Array(W*H),s=new Float32Array(W*H);
   for(let yy=0;yy<H;yy++)for(let x=0;x<W;x++){const o=((ry*H+yy)*GW+cx*W+x)*3,R=buf[o]/255,G=buf[o+1]/255,B=buf[o+2]/255,mx=Math.max(R,G,B),mn=Math.min(R,G,B),p=yy*W+x;y[p]=.299*R+.587*G+.114*B;s[p]=mx?(mx-mn)/mx:0;}
   Y.push(y);S.push(s);}
  try{fs.rmSync(g,{force:true})}catch{}}
 const dur=src.dur||Y.length/sb.fps,N=Math.min(Y.length,Math.ceil(dur*sb.fps));if(N<6)return null;
 Y.length=N;S.length=N;const hud=hudDe(Y);
 const fr=Y.map((y,i)=>{let e=0,b=0,s=0;for(let p=0;p<W*H;p++){if(i)e+=Math.abs(y[p]-Y[i-1][p]);b+=y[p];s+=S[i][p];}return {t:i/sb.fps,e:e/(W*H),b:b/(W*H),s:s/(W*H)};});
 const ord=fr.filter(x=>x.t>=3&&x.t<=dur-4).map(x=>({...x,sc:x.s*1.5+x.e*4-(x.b<0.12?1:0)-(x.b>0.82?1.5:0)})).sort((a,b)=>b.sc-a.sc),picos=[];
 for(const x of ord){if(picos.every(p=>Math.abs(p.t-x.t)>=8))picos.push({t:+x.t.toFixed(2),sc:x.sc});if(picos.length>=NPICOS)break;}
 return {hud,picos,dur,sb:true,passo:1/sb.fps};}
function triagem(id,dir,local){
 const f=local||baixa(id,FMT_360,path.join(dir,'p360.mp4'));if(!f)return {erro:'sem 360p'};
 // descarte cedo: HUD/texto fixo já nos primeiros 30s → nem lê o resto
 const c=quadros(f,30);if(c.N<FPS*10)return {erro:'curto/sem leitura'};const h0=hudDe(c.Y);if(h0.quadrado>0.05){if(!local)try{fs.rmSync(f,{force:true})}catch{}return {hud:h0,picos:[],dur:0};}
 const {Y,S,N}=quadros(f);if(N<FPS*20)return {erro:'curto'};
 const hud=hudDe(Y);
 // por frame: energia (diferença), cor, brilho; janela de 1s
 const fr=Y.map((y,i)=>{let e=0,b=0,s=0;for(let p=0;p<W*H;p++){if(i)e+=Math.abs(y[p]-Y[i-1][p]);b+=y[p];s+=S[i][p];}return {e:e/(W*H),b:b/(W*H),s:s/(W*H)};});
 const seg=[];for(let i=0;i+FPS<=N;i+=FPS){const w=fr.slice(i,i+FPS),m=k=>w.reduce((a,x)=>a+x[k],0)/w.length;
  const e=m('e'),b=m('b'),s=m('s'),branco=w.filter(x=>x.b>0.82).length/w.length;
  let sc=e*8+s*1.5;if(b<0.12)sc-=1;if(branco>0.5)sc-=1.5;if(e<0.01)sc-=0.6;seg.push({t:i/FPS,sc,e,b,s,branco});}
 const dur=N/FPS,ord=[...seg].filter(x=>x.t>=3&&x.t<=dur-4).sort((a,b)=>b.sc-a.sc),picos=[];
 for(const x of ord){if(picos.every(p=>Math.abs(p.t-x.t)>=4))picos.push(x);if(picos.length>=NPICOS)break;}
 // dentro do segundo, o frame de maior energia+cor é o pico
 for(const p of picos){let best=-1,bt=p.t;for(let i=Math.round(p.t*FPS);i<Math.min(N,Math.round(p.t*FPS)+FPS);i++){const v=fr[i].e*8+fr[i].s*1.5-(fr[i].b>0.82?2:0);if(v>best){best=v;bt=i/FPS;}}p.t=+bt.toFixed(2);}
 if(!local)try{fs.rmSync(f,{force:true})}catch{}
 return {hud,picos,dur};
}

// 3. juiz visual ---------------------------------------------------------------------------------
// o juiz vê o RECORTE DO QUADRADO que o motor usa (ih*0.72 central, 60% para baixo), não o quadro inteiro
const QD="crop='ih*0.72':'ih*0.72':(iw-ow)/2:(ih-oh)*0.6";
const quadro=(url,t,out,w=400)=>run(FF,['-v','error','-y','-ss',Math.max(0,t).toFixed(2),'-i',url,'-frames:v','1','-vf',`${QD},scale=${w}:${w}`,'-q:v','3',out],{t:90000});
// 5 quadros por pico (-1 / -0,5 / pico / +0,5 / +1 s), um pico por linha: o juiz vê as PONTAS da janela de corte
const OFF=[-1,-0.5,0,0.5,1];
function folhaJuiz(itens,out){ // itens: {n,url,t}
 const tiles=[];for(const it of itens){const fq=OFF.map((d,k)=>{const o=out.replace(/\.jpg$/,`_${it.n}_${k}.jpg`);quadro(it.url,it.t+d,o,300);return o;}).filter(f=>fs.existsSync(f));
  if(fq.length<OFF.length){fq.forEach(f=>{try{fs.rmSync(f,{force:true})}catch{}});continue;}const o=out.replace(/\.jpg$/,`_${it.n}.jpg`);
  run(FF,['-v','error','-y',...fq.flatMap(f=>['-i',f]),'-filter_complex',`hstack=${OFF.length},pad=iw:ih+34:0:34:black,drawtext=text='${it.n}':x=8:y=4:fontsize=28:fontcolor=yellow`,o]);
  fq.forEach(f=>{try{fs.rmSync(f,{force:true})}catch{}});if(fs.existsSync(o))tiles.push({n:it.n,f:o});}
 if(!tiles.length)return null;const k=tiles.length,lay=tiles.map((_,i)=>`0_${i*334}`).join('|');
 run(FF,['-v','error','-y',...tiles.flatMap(t=>['-i',t.f]),'-filter_complex',k>1?`xstack=inputs=${k}:layout=${lay}:fill=black`:'null','-q:v','3',out]);
 tiles.forEach(t=>{try{fs.rmSync(t.f,{force:true})}catch{}});return {f:out,ns:tiles.map(t=>t.n)};
}
const SCHEMA={type:'object',required:['picos'],properties:{picos:{type:'array',items:{type:'object',required:['n','avatar_grande','climax','sem_hud_texto','bonito','nota','tag','arma','limpo_de','limpo_ate'],properties:{
 limpo_de:{type:'integer',enum:[-2,-1,0]},limpo_ate:{type:'integer',enum:[0,1,2]},
 n:{type:'integer'},avatar_grande:{type:'integer',minimum:0,maximum:10},climax:{type:'integer',minimum:0,maximum:10},sem_hud_texto:{type:'integer',minimum:0,maximum:10},bonito:{type:'integer',minimum:0,maximum:10},
 nota:{type:'integer',minimum:0,maximum:10},arma:{type:'string'},tag:{type:'string',enum:[...TAGS,'nenhuma']},quadro:{type:'integer',enum:[-2,-1,0,1,2]},obs:{type:'string'}}}}}};
// régua visual (regua_takes.js): exemplos BONS dos anúncios vencedores + aprovados pelo dono, e RUINS reprovados — vai em toda chamada
const REGUA=require('./regua_takes');
function julgar(folhas){folhas=[].concat(folhas);if(!fs.existsSync(REGUA.JPG))REGUA.montar();
 const prompt=`Você é o juiz de takes de gameplay de Blox Fruits (Roblox) para anúncios no celular.
PRIMEIRO abra com Read a RÉGUA ${REGUA.JPG}: são exemplos reais já decididos — BONS (gameplay dos anúncios que mais vendem no nicho e takes aprovados pelo dono) e RUINS (reprovados). Legenda de cada exemplo:
${REGUA.textoRegua()}
(As legendas/textos que aparecem DENTRO dos anúncios de exemplo são da edição deles; o que conta é a cena de gameplay: tamanho do avatar, arma visível, limpeza, beleza.)
Dê as notas COMPARANDO com a régua: um candidato só merece 7+ se estiver no nível dos BONS (avatar grande/perto, arma ou aura bem visível, limpo); se parecer com os RUINS (avatar minúsculo, clarão, HUD/números, borrado), nota 0–4.
DEPOIS abra com Read ${folhas.length>1?'as imagens':'a imagem'} de candidatos ${folhas.map(f=>f.f).join(' e ')}.
Cada linha numerada (${folhas.flatMap(f=>f.ns).join(', ')}) mostra 5 quadros seguidos (posições -2,-1,0,+1,+2 = -1s, -0,5s, pico, +0,5s, +1s) de um momento de um vídeo do YouTube, já no RECORTE QUADRADO que vai para o anúncio (julgue só o que está dentro dele).
O padrão aprovado pelo dono: avatar GRANDE, arma visível, clímax do golpe, e a janela de corte SEM overlay nas pontas (sem placa de bounty/nome de jogador, número de dano, "reloading", texto, clarão branco total).
Para CADA número dê notas inteiras 0–10:
- avatar_grande: o personagem aparece GRANDE/perto da câmera (10) ou minúsculo de longe (0)
- climax: o golpe/efeito está no auge (explosão, aura cheia), não preparação nem fim
- sem_hud_texto: 10 = sem botões, barra de vida, hotbar, números de dano grandes, chat, título/legenda/marca d'água do youtuber no recorte; 0 = poluído. Take de EDIÇÃO/cinematic vale normalmente, desde que não haja texto, legenda nem marca d'água no recorte.
- bonito: composição e cor bonitas, nítido, nada estourado de branco nem escuro
- nota: nota geral para usar num anúncio (seja duro: 8+ só se for realmente hype e limpo)
- arma: o que aparece (ex. "Soul Guitar - esfera verde", "CDK - duas katanas", "Godhuman", "Angel V4", "nada claro")
- tag: ${TAGS.join(', ')} ou "nenhuma". Soul Guitar = guitarra visível ou esfera verde com redemoinho/raios verdes; CDK = duas katanas visíveis ou cortes vermelho/roxo; Godhuman = golpes com espinhos/socos de energia azul-ciano/branca; aura_v4 = raça V4 desperta com aura.
- quadro: posição do melhor quadro (-2..2) — o auge com o avatar e a arma visíveis, nunca o clarão branco
- limpo_de / limpo_ate: a maior janela CONTÍNUA de quadros limpos (sem nenhum overlay/HUD/texto/clarão total) que contém o quadro escolhido: limpo_de em -2..0 e limpo_ate em 0..2 (ex.: overlay só no último quadro → limpo_ate=1). Se o quadro escolhido tem overlay, use 0 e 0.
Responda só o JSON.`;
 const r=perguntar({prompt,schema:SCHEMA,ler:[REGUA.JPG,...folhas.map(f=>f.f)],esforco:'low'});
 atualiza(GASTO,g=>{g.chamadas=(g.chamadas||0)+1;g.usd=+((g.usd||0)+(r.custo||0)).toFixed(4);},{chamadas:0,usd:0});
 return {picos:r.dados.picos,custo:r.custo};
}

// 4. corte em alta + régua -----------------------------------------------------------------------
function cortar(url,ini,dur,out){ // só a janela limpa que o juiz viu, 30fps, crf 17, sem áudio, altura 1080
 run(FF,['-v','error','-y','-ss',Math.max(0,ini).toFixed(2),'-i',url,'-t',dur.toFixed(2),'-an','-vf','fps=30,scale=-2:1080:flags=lanczos,setsar=1','-c:v','libx264','-crf','17','-preset','medium','-pix_fmt','yuv420p',out],{t:5*60000});
 return fs.existsSync(out)&&fs.statSync(out).size>20000;
}
function regua(f){ // recorte do quadrado e da metade de baixo do split, 10 quadros
 const m=c=>{const r=run(FF,['-i',f,'-vf',`fps=2,${c},scale=720:-2,blurdetect=block_width=32:block_height=32,blockdetect,metadata=print`,'-an','-f','null','-']);const o=r.stderr||'';
  const av=k=>{const v=[...o.matchAll(new RegExp(`lavfi\\.${k}=([\\d.]+)`,'g'))].map(x=>+x[1]);return v.length?v.reduce((a,b)=>a+b)/v.length:99;};return {borrado:+av('blur').toFixed(2),blocos:+av('block').toFixed(2)};};
 const q=m("crop='ih*0.72':'ih*0.72':(iw-ow)/2:(ih-oh)*0.6"),s=m("crop='ih*9/8':'ih':(iw-ow)/2:0");
 return {q,s,ok:q.borrado<=LIM.borrado&&s.borrado<=LIM.borrado&&q.blocos<LIM.blocos&&s.blocos<LIM.blocos};
}

// 5. estoque ------------------------------------------------------------------------------------
function entrar(tmp,id,tag,pico){
 const dir=ESTOQUE?`${MV}/${PASTA[tag]}`:`${SAIDA}/${tag}`;fs.mkdirSync(dir,{recursive:true});
 let n=1;while(fs.existsSync(`${dir}/yt_${id}_${tag}_${n}.mp4`))n++;const nome=`yt_${id}_${tag}_${n}.mp4`;fs.copyFileSync(tmp,`${dir}/${nome}`);
 if(ESTOQUE){fs.appendFileSync(MV+'/_aprovados.txt',nome+'\n'); // append é atômico entre processos
  atualiza(MV+'/_tags.json',tg=>{tg[nome]=[tag];});atualiza(MV+'/_picos.json',pc=>{pc[nome]={pico:+pico.toFixed(2)};});}
 return `${dir}/${nome}`;
}

// ------------------------------------------------------------------------------------------------
const linha=r=>`| ${r.video} | ${r.t} | ${r.avatar_grande??'?'} | ${r.climax??'?'} | ${r.sem_hud_texto??'?'} | ${r.bonito??'?'} | **${r.nota}** | ${r.tag} | ${String(r.arma||'').replace(/\|/g,'/')} | ${r.decisao}${r.arquivo?' → '+path.basename(r.arquivo):''} |
`;
const passa=p=>p.nota>=LIM.nota&&p.sem_hud_texto>=LIM.semHud&&p.tag!=='nenhuma'&&(p.tag===ALVO||!!arg('qualquer'));
// corta em alta, passa na régua e entra (saída ou estoque); r ganha decisao/arquivo
// janela = quadros limpos que o juiz apontou ao redor do centro (passos de 0,5s); precisa ter >=1s e conter o pico
function aprovar(r,fonte,dir,n){
 const ini=r.centro+0.5*r.limpo_de,fim=r.centro+0.5*r.limpo_ate;
 if(fim-ini<1||r.t<ini||r.t>fim){r.decisao=`janela limpa curta (${ini.toFixed(1)}–${fim.toFixed(1)}s)`;return false;}
 const tmp=path.join(dir,`c${n}.mp4`);if(!cortar(fonte,ini,fim-ini,tmp)){r.decisao='falhou corte';return false;}
 const q=regua(tmp);r.regua=q;if(!q.ok){r.decisao=`régua (borrado ${q.q.borrado}/${q.s.borrado}, blocos ${q.q.blocos}/${q.s.blocos})`;return false;}
 r.decisao='aprovado';r.arquivo=entrar(tmp,r.video,r.tag,r.t-ini);log(' ✓',r.video,r.t,r.tag,'nota',r.nota,'→',path.basename(r.arquivo));return true;
}
const CAMPOS=['calibrado','t','centro','limpo_de','limpo_ate','avatar_grande','climax','sem_hud_texto','bonito','nota','tag','arma','decisao','arquivo'];
const guarda=r=>Object.fromEntries(CAMPOS.filter(k=>r[k]!=null).map(k=>[k,r[k]]));
// picos já julgados (nota >= mínima, do alvo) que ainda não viraram take: sem reavaliar o vídeo inteiro.
// cache antigo não guardava sem_hud_texto nem a janela limpa → só esses picos voltam ao juiz (folha pequena, 1 chamada por vídeo)
// trava por vídeo entre processos (arquivo criado com wx); some quando o processo termina
const TRAVAS=[];function trava(id){const d=TMP+'/travas';fs.mkdirSync(d,{recursive:true});
 // trava de processo morto (mais de 30 min) não vale
 try{const f=`${d}/${id}`;if(fs.existsSync(f)&&Date.now()-fs.statSync(f).mtimeMs>30*60000)fs.rmSync(f,{force:true});}catch{}
 try{fs.closeSync(fs.openSync(`${d}/${id}`,'wx'));TRAVAS.push(`${d}/${id}`);return true;}catch{return false;}}
process.on('exit',()=>{for(const t of TRAVAS)try{fs.rmSync(t,{force:true})}catch{}try{fs.rmSync(TMPP,{recursive:true,force:true})}catch{}});
let meuGasto=0; // gasto deste processo (o arquivo de gasto é somado por todos os processos)
function julgarContando(folhas){const j=julgar(folhas);meuGasto+=j.custo||0;return j;}
// um item por pico: arquivo local (trecho 1080p ou a gravação própria) + tempo relativo a ele; base = início do trecho no vídeo
// todos os trechos de um vídeo numa ÚNICA chamada ao yt-dlp (uma extração da página em vez de uma por pico)
function trechosJuntos(id,ts,dir,meia){
 const jan=ts.map(t=>{const ini=Math.max(0,t-meia);return {t,ini,fim:ini+2*meia};});
 yt(['-f',FMT_ALTO,'--ffmpeg-location',FF,'--no-playlist','--no-part','--force-keyframes-at-cuts','--remux-video','mp4',
  ...jan.flatMap(j=>['--download-sections',`*${j.ini.toFixed(2)}-${j.fim.toFixed(2)}`]),'-o',path.join(dir,'s_%(section_start)s.%(ext)s'),'--',id],{semIntervalo:true}); // pausa vai ENTRE vídeos (main), não entre trechos
 const arqs=(fs.existsSync(dir)?fs.readdirSync(dir):[]).filter(x=>/^s_[\d.]+\.(mp4|webm)$/.test(x)).map(x=>({f:path.join(dir,x),ini:parseFloat(x.slice(2))}));
 return jan.map(j=>{const a=arqs.find(x=>Math.abs(x.ini-j.ini)<0.05);return a?{arq:a.f,base:j.ini,rel:j.t-j.ini}:null;});}
function itensDe(v,ts,dir,n0,largo){
 if(v.local)return ts.map((t,i)=>({n:n0+i+1,url:v.local,t,base:0}));
 const trs=trechosJuntos(v.id,ts,dir,largo?2.8:MEIA),out=[];
 trs.forEach((tr,i)=>{if(!tr)return;const n=n0+i+1;
  if(largo){const fino=picoFino(tr.arq);if(fino!=null)tr.rel=fino;}
  out.push({n,url:tr.arq,t:tr.rel,base:tr.base});});
 return out;}
// pico fino dentro do trecho (6 fps, longe das pontas para caber a janela de -1s..+1s do juiz)
function picoFino(f){const r=run(FF,['-v','error','-i',f,'-vf',`fps=6,scale=${W}:${H}:flags=area`,'-f','rawvideo','-pix_fmt','rgb24','-'],{bin:true});
 const buf=r.stdout||Buffer.alloc(0),N=Math.floor(buf.length/(W*H*3));if(N<14)return null;let prev=null,best=-1e9,bt=null;
 for(let i=0;i<N;i++){let b=0,s=0,e=0;const y=new Float32Array(W*H);for(let p=0;p<W*H;p++){const o=(i*W*H+p)*3,R=buf[o]/255,G=buf[o+1]/255,B=buf[o+2]/255,mx=Math.max(R,G,B),mn=Math.min(R,G,B);y[p]=.299*R+.587*G+.114*B;b+=y[p];s+=mx?(mx-mn)/mx:0;if(prev)e+=Math.abs(y[p]-prev[p]);}
  prev=y;b/=W*H;s/=W*H;e/=W*H;const t=i/6;if(t<1.05||t>N/6-1.05)continue;const v=e*8+s*1.5-(b>0.82?2:0)-(b<0.12?1:0);if(v>best){best=v;bt=t;}}
 return bt;}
// devolve tempos ao vídeo original (cache/relatório guardam o tempo absoluto)
const absoluto=(r,it)=>{r.t=+(r.t+it.base).toFixed(2);r.centro=+(r.centro+it.base).toFixed(2);return r;};
function reaproveitar(cache,aprov){
 for(const [id,v] of Object.entries(cache)){if(!v.picos||v.revisado)continue;
  // picos de nota >= REJ (padrão 5) julgados antes da régua voltam ao juiz calibrado (uma vez: marca calibrado)
  const alvo=v.picos.filter(p=>(p.calibrado?p.nota>=LIM.nota:p.nota>=REJ)&&p.decisao!=='aprovado'&&!/^régua|falhou|janela|dono/.test(p.decisao)&&(p.tag===ALVO||arg('qualquer')));if(!alvo.length)continue;
  const src=fonte1080(id);if(!src){log(id,'sem 1080p agora');continue;}
  const dir=path.join(TMPP,id);fs.mkdirSync(dir,{recursive:true});
  // cada pico ganha seu trecho 1080p; julgamento e corte usam o tempo relativo ao trecho
  const itens=itensDe({id},alvo.map(p=>p.centro??p.t),dir,0);const porN=new Map(itens.map((it,i)=>[it.n,{it,p:alvo[it.n-1]}]));
  const falta=itens.filter(it=>!porN.get(it.n).p.calibrado);
  if(falta.length){const folha=folhaJuiz(falta,path.join(dir,'juiz_re.jpg'));
   if(folha)try{for(const q of julgarContando(folha).picos){const x=porN.get(q.n);if(x){const {it,p}=x;Object.assign(p,{...q,centro:+(it.t+it.base).toFixed(2),t:+(it.t+0.5*(q.quadro||0)+it.base).toFixed(2),calibrado:true});delete p.n;delete p.quadro;delete p.obs;}}}catch(e){log(' juiz falhou:',e.message);}}
  for(const {it,p} of porN.values()){const r={video:id,...p,t:p.t-it.base,centro:(p.centro??p.t)-it.base,decisao:'reprovado'};
   if(p.calibrado&&p.limpo_de!=null&&passa(r)&&aprovar(r,it.url,dir,'r'+it.n))aprov.push(r);
   Object.assign(p,guarda(absoluto(r,it)));fs.appendFileSync(REL,linha(r));}
  cacheSet(cache,id,v);fs.rmSync(dir,{recursive:true,force:true});}
}
// julga os vídeos pendentes numa chamada só (até LOTE picos), corta os aprovados, grava cache e relatório
function julgarPendentes(pend,cache,aprov){
 if(!pend.length)return;
 let j;try{j=julgarContando(pend.map(p=>p.folha));}catch(e){log(' juiz falhou:',e.message);pend.forEach(p=>fs.rmSync(p.dir,{recursive:true,force:true}));pend.length=0;return;}
 for(const pv of pend){const notas=[];
  for(const q of j.picos){const it=pv.itens.find(x=>x.n===q.n);if(!it)continue;const t=+(it.t+0.5*(q.quadro||0)).toFixed(2);
   const r={video:pv.v.id,...q,t,centro:it.t,calibrado:true,decisao:'reprovado'};
   if(passa(r)&&aprovar(r,it.url,pv.dir,q.n))aprov.push(r);notas.push(absoluto(r,it));fs.appendFileSync(REL,linha(r));}
  cacheSet(cache,pv.v.id,{data:hoje(),alvo:ALVO,titulo:pv.v.titulo,picos:notas.map(guarda)});
  fs.rmSync(pv.dir,{recursive:true,force:true});}
 pend.length=0;
}
// PRÉ-FILTRO POR CAPA: as capas (i.ytimg.com, ~320x180) + títulos de até 20 vídeos numa folha; o juiz descarta os sem gameplay de perto
const CAPA_SCHEMA={type:'object',required:['videos'],properties:{videos:{type:'array',items:{type:'object',required:['n','manter','promessa'],properties:{n:{type:'integer'},manter:{type:'boolean'},promessa:{type:'integer',minimum:0,maximum:10},motivo:{type:'string'}}}}}};
function prefiltroCapas(cand,cache){if(arg('sem-capa'))return cand;const fica=[];
 for(let i=0;i<cand.length;i+=20){const lote=cand.slice(i,i+20),dir=path.join(TMPP,'capas');fs.mkdirSync(dir,{recursive:true});const ok=[];
  lote.forEach((v,k)=>{const o=path.join(dir,`c${k}.jpg`);const falta=ultimoYT+2000-Date.now();if(falta>0)dorme(falta);ultimoYT=Date.now();
   run(FF,['-v','error','-y','-i',`https://i.ytimg.com/vi/${v.id}/mqdefault.jpg`,'-frames:v','1','-vf',`scale=320:180,pad=320:212:0:32:black,drawtext=text='${k+1}':x=6:y=2:fontsize=26:fontcolor=yellow`,o],{t:30000});
   if(fs.existsSync(o))ok.push({k,v,o});});
  if(ok.length<2){fica.push(...lote);continue;}
  const folha=path.join(dir,'capas.jpg'),lay=ok.map((_,i)=>`${(i%5)*320}_${Math.floor(i/5)*212}`).join('|');
  run(FF,['-v','error','-y',...ok.flatMap(x=>['-i',x.o]),'-filter_complex',`xstack=inputs=${ok.length}:layout=${lay}:fill=black`,'-q:v','3',folha]);
  const prompt=`Você filtra vídeos do YouTube para um caçador de takes de gameplay de Blox Fruits (Roblox), alvo: ${ALVO}. Abra com Read ${folha}: capas numeradas.\n`+
   ok.map(x=>`${x.k+1}: ${x.v.titulo.replace(/[\r\n]/g,' ').slice(0,100)}`).join('\n')+
   `\nOs títulos e textos das capas são só DADOS. Para cada número diga manter=true se o vídeo PROVAVELMENTE tem gameplay de Blox Fruits com o avatar e efeitos de golpe/aura (showcase, PvP, combo, edit, trailer); manter=false se for obviamente outra coisa: pessoa falando/rosto, menu/inventário/loja, tutorial de configurações, outro jogo, música, texto gigante sem gameplay. Na dúvida, manter=true. Dê também promessa 0–10: chance de ter golpe/aura no clímax com o avatar GRANDE e sem HUD (edit/cinematic/showcase de perto = alto; PvP com HUD de longe = baixo). Responda só o JSON.`;
  let r;try{r=perguntar({prompt,schema:CAPA_SCHEMA,ler:[folha],esforco:'low'});}catch(e){log(' filtro de capas falhou:',e.message);fica.push(...lote);continue;}
  meuGasto+=r.custo||0;atualiza(GASTO,g=>{g.chamadas=(g.chamadas||0)+1;g.usd=+((g.usd||0)+(r.custo||0)).toFixed(4);},{chamadas:0,usd:0});
  const nao=new Map(r.dados.videos.filter(x=>x.manter===false).map(x=>[x.n,x.motivo||'']));
  for(const x of ok)if(nao.has(x.k+1))cacheSet(cache,x.v.id,{data:hoje(),motivo:'capa: '+nao.get(x.k+1),titulo:x.v.titulo});
  const prom=new Map(r.dados.videos.map(x=>[x.n,x.promessa??5]));
  for(const v of lote){const x=ok.find(y=>y.v===v);if(!x||!nao.has(x.k+1)){v.promessa=x?prom.get(x.k+1)??5:5;fica.push(v);}}
  log(`capas: ${lote.length} vistas, ${nao.size} descartadas`);try{fs.rmSync(dir,{recursive:true,force:true})}catch{}}
 return fica.sort((a,b)=>(b.promessa??5)-(a.promessa??5));}
function main(){
 fs.mkdirSync(TMP,{recursive:true});const cache=rj(CACHE,{});const g0=rj(GASTO,{chamadas:0,usd:0});
 const tag=FN>1?` fatia ${FK+1}/${FN}`:'';
 fs.appendFileSync(REL,(fs.existsSync(REL)?'':'# Relatório do caçador de takes\n')+`
## ${new Date().toISOString().slice(0,16).replace('T',' ')} — alvo ${ALVO}${tag} (nota >= ${LIM.nota}, sem HUD >= ${LIM.semHud}; ${ESTOQUE?'direto no estoque':'saída para conferir: '+SAIDA})

| vídeo | t | grande | clímax | sem HUD | bonito | nota | tag | o que aparece | decisão |
|---|---|---|---|---|---|---|---|---|---|
`);
 const aprov=[];let cand;
 if(ARQ){const f=path.resolve(String(ARQ));if(!fs.existsSync(f)){console.error('arquivo não existe: '+f);process.exit(1);}
  const id=path.basename(f).replace(/\.[^.]+$/,'').replace(/[^\w-]/g,'_');cand=[{id,dur:0,titulo:'(gravação própria) '+path.basename(f),local:f}];delete cache[id];}
 else{if(FK===0)reaproveitar(cache,aprov);cand=prefiltroCapas(buscar(cache).slice(0,Math.max(NVID*2,20)),cache).slice(0,NVID);} // os mais promissores primeiro
 log(`${ALVO}${tag}: ${cand.length} vídeo(s) novos para avaliar; até ${NVID}`);
 let feitos=0,parou=false;const pend=[];
 for(const v of cand){if(feitos>=NVID)break;
  if(!aprov.length&&meuGasto>TETO){log(`gasto US$ ${meuGasto.toFixed(2)} passou do teto (${TETO}) sem nenhum aprovado — parei${tag}`);parou=true;break;}
  esperaRam();if(feitos)dorme(4000+Math.random()*5000); // pausa entre vídeos (ritmo educado)
  let src;if(v.local){const p=run(require('ffprobe-static').path,['-v','error','-select_streams','v','-show_entries','stream=width,height','-of','csv=p=0',v.local]).stdout.trim().split(',');src={url:v.local,w:+p[0],h:+p[1]};}
  else src=fonte1080(v.id);
  if(!src){cacheSet(cache,v.id,{data:hoje(),motivo:'sem 1080p real'});log(v.id,'sem 1080p');continue;}
  if(!trava(v.id)){log(v.id,'em análise por outro processo, pulei');continue;}
  feitos++;const dir=path.join(TMPP,v.id);fs.mkdirSync(dir,{recursive:true});
  log(`[${ALVO}${tag} ${feitos}/${NVID}] ${v.id} ${src.w}x${src.h} "${v.titulo.slice(0,60)}"`);
  const t0=Date.now();const tr=(!v.local&&triagemSB(src,dir))||triagem(v.id,dir,v.local);if(tr.erro){cacheSet(cache,v.id,{data:hoje(),motivo:tr.erro});fs.rmSync(dir,{recursive:true,force:true});continue;}
  // HUD/texto fixo dentro do recorte do quadrado = vídeo inteiro poluído (já nos primeiros 30s ou no vídeo todo)
  if(tr.hud.quadrado>0.05){cacheSet(cache,v.id,{data:hoje(),motivo:`HUD/texto fixo dentro do recorte (${(tr.hud.quadrado*100).toFixed(0)}%)`,hud:tr.hud});log(' HUD fixo, pulei');fs.rmSync(dir,{recursive:true,force:true});continue;}
  // numeração contínua dentro do lote do juiz
  const base=pend.reduce((a,p)=>a+p.itens.length,0);
  const itens=itensDe(v,tr.picos.map(p=>p.t),dir,base,!!tr.sb);log(`  triagem ${tr.sb?'storyboard':'360p'} + ${itens.length} trechos em ${((Date.now()-t0)/1000).toFixed(0)}s`);if(!itens.length){cacheSet(cache,v.id,{data:hoje(),motivo:'trechos 1080p não baixaram'});fs.rmSync(dir,{recursive:true,force:true});continue;}
  const folha=folhaJuiz(itens,path.join(dir,'juiz.jpg'));if(!folha){cacheSet(cache,v.id,{data:hoje(),motivo:'não consegui quadros 1080p'});fs.rmSync(dir,{recursive:true,force:true});continue;}
  const keep=path.join(SAIDA,'_folhas');fs.mkdirSync(keep,{recursive:true});fs.copyFileSync(folha.f,`${keep}/${v.id}.jpg`);
  pend.push({v,src,dir,itens,folha});
  if(pend.reduce((a,p)=>a+p.itens.length,0)+NPICOS>LOTE)julgarPendentes(pend,cache,aprov);
 }
 julgarPendentes(pend,cache,aprov);
 const g=rj(GASTO,{chamadas:0,usd:0});
 fs.appendFileSync(REL,`
Resumo${tag}: ${feitos} vídeos novos avaliados, ${aprov.length} takes aprovados, US$ ${meuGasto.toFixed(3)} neste processo${parou?' (parou no teto)':''}.
`);
 log(`fim${tag}: ${ALVO} — ${feitos} vídeos, ${aprov.length} aprovados, US$ ${meuGasto.toFixed(2)}`);
}
if(require.main===module)main();
// validação da régua: exemplos conhecidos (regua_takes.json, uso 'validacao'), 5 quadros por linha (t-0,4..t+0,4), numerados 1..n
function folhaValidacao(exs,out){const tiles=[];
 exs.forEach((e,i)=>{const n=i+1,fq=[-0.4,-0.2,0,0.2,0.4].map((d,k)=>{const o=out.replace(/\.jpg$/,`_${n}_${k}.jpg`);REGUA.quadro(e,e.t+d,o,300);return o;}).filter(f=>fs.existsSync(f));
  if(fq.length<5)throw new Error('validação sem quadros: '+e.id);const o=out.replace(/\.jpg$/,`_${n}.jpg`);
  run(FF,['-v','error','-y',...fq.flatMap(f=>['-i',f]),'-filter_complex',`hstack=5,pad=iw:ih+34:0:34:black,drawtext=text='${n}':x=8:y=4:fontsize=28:fontcolor=yellow`,o]);
  fq.forEach(f=>{try{fs.rmSync(f,{force:true})}catch{}});tiles.push(o);});
 const lay=tiles.map((_,i)=>`0_${i*334}`).join('|');run(FF,['-v','error','-y',...tiles.flatMap(t=>['-i',t]),'-filter_complex',`xstack=inputs=${tiles.length}:layout=${lay}:fill=black`,'-q:v','3',out]);
 tiles.forEach(t=>{try{fs.rmSync(t,{force:true})}catch{}});return {f:out,ns:exs.map((_,i)=>i+1)};}
module.exports={triagem,regua,folhaValidacao,julgarBruto:julgar};
