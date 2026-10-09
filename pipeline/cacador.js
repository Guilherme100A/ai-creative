// cacador.js — caça automática de takes de clímax para o estoque moveset (nota "cacador-takes").
// busca em massa (só vídeos com 1080p real) → pré-triagem por energia/picos e anti-HUD → juiz visual do Claude (ia.js)
// → corte em alta só do clímax → régua de nitidez → estoque (tag + pico).
// uso: node cacador.js --alvo golpe_soul_guitar [--videos 40] [--queries 'a|b|c'] [--estoque] [--picos 8] [--teto 3]
//      node cacador.js --alvo golpe_cdk --arquivo C:/gravacao.mp4   (gravação própria: pula busca/download)
//  --teto: para o alvo se o gasto com o Claude passar de US$ teto sem nenhum take aprovado (padrão 3).
//  sem --estoque os takes aprovados vão para DADOS/_cacador_saida/<alvo>/ (para conferir) e nada do moveset muda.
const fs=require('fs'),path=require('path'),{spawnSync}=require('child_process');
const {DADOS}=require('./paths');const {perguntar}=require('./ia');
const FF=require('ffmpeg-static');const YT=path.join(__dirname,'tools','yt-dlp.exe');
const MV=DADOS+'/moveset',TMP=DADOS+'/_cacador_tmp',SAIDA=DADOS+'/_cacador_saida';
const CACHE=path.join(__dirname,'cacador_cache.json'),GASTO=path.join(__dirname,'cacador_gasto.json'),REL=path.join(__dirname,'cacador_relatorio.md');

const arg=(k,d)=>{const i=process.argv.indexOf('--'+k);return i<0?d:(process.argv[i+1]&&!process.argv[i+1].startsWith('--')?process.argv[i+1]:true);};
const ALVO=arg('alvo');if(!ALVO){console.error('uso: node cacador.js --alvo golpe_soul_guitar [--videos 40] [--queries "a|b"] [--estoque]');process.exit(1);}
const NVID=+arg('videos',40),NPICOS=+arg('picos',8),ESTOQUE=!!arg('estoque',false),TETO=+arg('teto',3),ARQ=arg('arquivo');
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

const rj=(f,d)=>{try{return JSON.parse(fs.readFileSync(f,'utf8'))}catch{return d}};
const wj=(f,o)=>fs.writeFileSync(f,JSON.stringify(o,null,1));
const run=(bin,a,o={})=>spawnSync(bin,a,{encoding:o.bin?'buffer':'utf8',maxBuffer:1<<30,windowsHide:true,timeout:o.t||10*60*1000});
const yt=a=>run(YT,['--no-check-certificates','--no-warnings',...a]);
const log=(...m)=>console.log('[caçador]',...m);
const rel=[];

// 1. busca ---------------------------------------------------------------------------------------
function buscar(cache){
 const qs=arg('queries')?String(arg('queries')).split('|'):QUERIES[ALVO]||[`blox fruits ${ALVO.replace(/_/g,' ')} showcase 4k`];
 const vistos=new Map();
 for(const q of qs){
  const r=yt(['--flat-playlist','--print','%(id)s\t%(duration)s\t%(url)s\t%(title)s',`ytsearch20:${q}`]);
  for(const l of (r.stdout||'').split(/\r?\n/)){const [id,dur,url,...t]=l.split('\t');if(!id||vistos.has(id))continue;
   if(cache[id]){continue;}
   const d=+dur;if(!(d>=60&&d<=1200)||/shorts/i.test(url||'')){cache[id]={data:hoje(),motivo:`duração ${dur}s ou shorts`};continue;}
   vistos.set(id,{id,dur:d,titulo:t.join(' '),query:q});}
 }
 return [...vistos.values()];
}
const hoje=()=>new Date().toISOString().slice(0,10);
// formato real ≥1080p (paisagem); devolve a URL direta do melhor vídeo 1080–1440p
function fonte1080(id){
 const r=yt(['-J',`https://www.youtube.com/watch?v=${id}`]);let j;try{j=JSON.parse(r.stdout)}catch{return null;}
 const v=(j.formats||[]).filter(f=>f.vcodec&&f.vcodec!=='none'&&f.height>=1080&&f.height<=1440&&f.width>f.height&&f.url&&/^https?/.test(f.protocol||'https'))
  .sort((a,b)=>(b.height-a.height)||((/avc1/.test(b.vcodec)?1:0)-(/avc1/.test(a.vcodec)?1:0))||((b.tbr||0)-(a.tbr||0)));
 return v[0]?{url:v[0].url,h:v[0].height,w:v[0].width,fps:v[0].fps}:null;
}

// 2. pré-triagem: 64x36 RGB a 4 fps do stream de 360p, tudo medido aqui no node -------------------
const W=64,H=36,FPS=4;
function triagem(id,dir,local){
 const f=local||path.join(dir,'p360.mp4');
 if(!local){const d=yt(['-f','bv*[height<=360][ext=mp4]/bv*[height<=360]','-o',f,'--',id]);if(!fs.existsSync(f))return {erro:'sem 360p '+(d.stderr||'').slice(0,120)};}
 const r=run(FF,['-v','error','-i',f,'-vf',`fps=${FPS},scale=${W}:${H}:flags=area`,'-f','rawvideo','-pix_fmt','rgb24','-'],{bin:true});
 const buf=r.stdout,N=Math.floor(buf.length/(W*H*3));if(N<FPS*20)return {erro:'curto'};
 const Y=[],S=[];for(let i=0;i<N;i++){const y=new Float32Array(W*H),s=new Float32Array(W*H);
  for(let p=0;p<W*H;p++){const o=(i*W*H+p)*3,R=buf[o]/255,G=buf[o+1]/255,B=buf[o+2]/255,mx=Math.max(R,G,B),mn=Math.min(R,G,B);y[p]=.299*R+.587*G+.114*B;s[p]=mx?(mx-mn)/mx:0;}Y.push(y);S.push(s);}
 // HUD: pixel com borda forte (gradiente) que quase não muda no tempo → texto/botões fixos
 const mean=new Float32Array(W*H),sd=new Float32Array(W*H);for(const y of Y)for(let p=0;p<W*H;p++)mean[p]+=y[p]/N;for(const y of Y)for(let p=0;p<W*H;p++)sd[p]+=(y[p]-mean[p])**2/N;
 const hudPx=new Uint8Array(W*H);for(let yy=1;yy<H-1;yy++)for(let x=1;x<W-1;x++){const p=yy*W+x,g=Math.abs(mean[p+1]-mean[p-1])+Math.abs(mean[p+W]-mean[p-W]);if(g>0.25&&Math.sqrt(sd[p])<0.04)hudPx[p]=1;}
 const banda=(a,b)=>{let c=0,t=0;for(let yy=a;yy<b;yy++)for(let x=0;x<W;x++){t++;c+=hudPx[yy*W+x];}return c/t;};
 const regiao=(x0,x1,y0,y1)=>{let c=0,t=0;for(let yy=y0;yy<y1;yy++)for(let x=x0;x<x1;x++){t++;c+=hudPx[yy*W+x];}return c/t;};
 // recorte do quadrado do motor (ih*0.72 central, 60% para baixo): só o que cai nele importa
 const qL=Math.round((W-0.72*H)/2),qT=Math.round(0.6*(H-0.72*H));
 const hud={topo:banda(0,6),base:banda(H-7,H),meio:banda(6,H-7),quadrado:regiao(qL,W-qL,qT,qT+Math.round(0.72*H))};
 // por frame: energia (diferença), cor, brilho; janela de 1s
 const fr=Y.map((y,i)=>{let e=0,b=0,s=0;for(let p=0;p<W*H;p++){if(i)e+=Math.abs(y[p]-Y[i-1][p]);b+=y[p];s+=S[i][p];}return {e:e/(W*H),b:b/(W*H),s:s/(W*H)};});
 const seg=[];for(let i=0;i+FPS<=N;i+=FPS){const w=fr.slice(i,i+FPS),m=k=>w.reduce((a,x)=>a+x[k],0)/w.length;
  const e=m('e'),b=m('b'),s=m('s'),branco=w.filter(x=>x.b>0.82).length/w.length;
  let sc=e*8+s*1.5;if(b<0.12)sc-=1;if(branco>0.5)sc-=1.5;if(e<0.01)sc-=0.6;seg.push({t:i/FPS,sc,e,b,s,branco});}
 const dur=N/FPS,ord=[...seg].filter(x=>x.t>=3&&x.t<=dur-4).sort((a,b)=>b.sc-a.sc),picos=[];
 for(const x of ord){if(picos.every(p=>Math.abs(p.t-x.t)>=4))picos.push(x);if(picos.length>=NPICOS)break;}
 // dentro do segundo, o frame de maior energia+cor é o pico
 for(const p of picos){let best=-1,bt=p.t;for(let i=Math.round(p.t*FPS);i<Math.min(N,Math.round(p.t*FPS)+FPS);i++){const v=fr[i].e*8+fr[i].s*1.5-(fr[i].b>0.82?2:0);if(v>best){best=v;bt=i/FPS;}}p.t=+bt.toFixed(2);}
 if(!local)fs.rmSync(f,{force:true});
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
  if(fq.length<OFF.length){fq.forEach(f=>fs.rmSync(f,{force:true}));continue;}const o=out.replace(/\.jpg$/,`_${it.n}.jpg`);
  run(FF,['-v','error','-y',...fq.flatMap(f=>['-i',f]),'-filter_complex',`hstack=${OFF.length},pad=iw:ih+34:0:34:black,drawtext=text='${it.n}':x=8:y=4:fontsize=28:fontcolor=yellow`,o]);
  fq.forEach(f=>fs.rmSync(f,{force:true}));if(fs.existsSync(o))tiles.push({n:it.n,f:o});}
 if(!tiles.length)return null;const k=tiles.length,lay=tiles.map((_,i)=>`0_${i*334}`).join('|');
 run(FF,['-v','error','-y',...tiles.flatMap(t=>['-i',t.f]),'-filter_complex',k>1?`xstack=inputs=${k}:layout=${lay}:fill=black`:'null','-q:v','3',out]);
 tiles.forEach(t=>fs.rmSync(t.f,{force:true}));return {f:out,ns:tiles.map(t=>t.n)};
}
const SCHEMA={type:'object',required:['picos'],properties:{picos:{type:'array',items:{type:'object',required:['n','avatar_grande','climax','sem_hud_texto','bonito','nota','tag','arma','limpo_de','limpo_ate'],properties:{
 limpo_de:{type:'integer',enum:[-2,-1,0]},limpo_ate:{type:'integer',enum:[0,1,2]},
 n:{type:'integer'},avatar_grande:{type:'integer',minimum:0,maximum:10},climax:{type:'integer',minimum:0,maximum:10},sem_hud_texto:{type:'integer',minimum:0,maximum:10},bonito:{type:'integer',minimum:0,maximum:10},
 nota:{type:'integer',minimum:0,maximum:10},arma:{type:'string'},tag:{type:'string',enum:[...TAGS,'nenhuma']},quadro:{type:'integer',enum:[-2,-1,0,1,2]},obs:{type:'string'}}}}}};
function julgar(folha){
 const prompt=`Você é o juiz de takes de gameplay de Blox Fruits (Roblox) para anúncios no celular. Abra a imagem ${folha.f} com Read.
Cada linha numerada (${folha.ns.join(', ')}) mostra 5 quadros seguidos (posições -2,-1,0,+1,+2 = -1s, -0,5s, pico, +0,5s, +1s) de um momento de um vídeo do YouTube, já no RECORTE QUADRADO que vai para o anúncio (julgue só o que está dentro dele).
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
 const r=perguntar({prompt,schema:SCHEMA,ler:[folha.f],esforco:'low'});
 const g=rj(GASTO,{chamadas:0,usd:0});g.chamadas++;g.usd=+(g.usd+(r.custo||0)).toFixed(4);wj(GASTO,g);
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
 if(ESTOQUE){const ap=fs.readFileSync(MV+'/_aprovados.txt','utf8').split(/\r?\n/).filter(Boolean);if(!ap.includes(nome))fs.writeFileSync(MV+'/_aprovados.txt',[...ap,nome].join('\n')+'\n');
  const tg=rj(MV+'/_tags.json',{});tg[nome]=[tag];wj(MV+'/_tags.json',tg);const pc=rj(MV+'/_picos.json',{});pc[nome]={pico:+pico.toFixed(2)};wj(MV+'/_picos.json',pc);}
 return `${dir}/${nome}`;
}

// ------------------------------------------------------------------------------------------------
const linha=r=>`| ${r.video} | ${r.t} | ${r.avatar_grande??'?'} | ${r.climax??'?'} | ${r.sem_hud_texto??'?'} | ${r.bonito??'?'} | **${r.nota}** | ${r.tag} | ${String(r.arma||'').replace(/\|/g,'/')} | ${r.decisao}${r.arquivo?' → '+path.basename(r.arquivo):''} |
`;
const passa=p=>p.nota>=LIM.nota&&p.sem_hud_texto>=LIM.semHud&&p.tag!=='nenhuma'&&(p.tag===ALVO||!!arg('qualquer'));
// corta em alta, passa na régua e entra (saída ou estoque); r ganha decisao/arquivo
// janela = quadros limpos que o juiz apontou ao redor do centro (passos de 0,5s); precisa ter >=1s e conter o pico
function aprovar(r,src,dir,n){
 const ini=r.centro+0.5*r.limpo_de,fim=r.centro+0.5*r.limpo_ate;
 if(fim-ini<1||r.t<ini||r.t>fim){r.decisao=`janela limpa curta (${ini.toFixed(1)}–${fim.toFixed(1)}s)`;return false;}
 const tmp=path.join(dir,`c${n}.mp4`);if(!cortar(src.url,ini,fim-ini,tmp)){r.decisao='falhou corte';return false;}
 const q=regua(tmp);r.regua=q;if(!q.ok){r.decisao=`régua (borrado ${q.q.borrado}/${q.s.borrado}, blocos ${q.q.blocos}/${q.s.blocos})`;return false;}
 r.decisao='aprovado';r.arquivo=entrar(tmp,r.video,r.tag,r.t-ini);log(' ✓',r.video,r.t,r.tag,'nota',r.nota,'→',path.basename(r.arquivo));return true;
}
const CAMPOS=['t','centro','limpo_de','limpo_ate','avatar_grande','climax','sem_hud_texto','bonito','nota','tag','arma','decisao','arquivo'];
const guarda=r=>Object.fromEntries(CAMPOS.filter(k=>r[k]!=null).map(k=>[k,r[k]]));
// picos já julgados (nota >= mínima, do alvo) que ainda não viraram take: sem reavaliar o vídeo inteiro.
// cache antigo não guardava sem_hud_texto nem a janela limpa → só esses picos voltam ao juiz (folha pequena, 1 chamada por vídeo)
function reaproveitar(cache,aprov){
 for(const [id,v] of Object.entries(cache)){if(!v.picos||v.revisado)continue;
  const alvo=v.picos.filter(p=>p.nota>=LIM.nota&&p.decisao!=='aprovado'&&!/^régua|falhou|janela/.test(p.decisao)&&(p.tag===ALVO||arg('qualquer')));if(!alvo.length)continue;
  const src=fonte1080(id);if(!src){log(id,'sem 1080p agora');continue;}
  const dir=path.join(TMP,id);fs.mkdirSync(dir,{recursive:true});
  const falta=alvo.filter(p=>p.limpo_de==null);
  if(falta.length){const itens=falta.map((p,i)=>({n:i+1,url:src.url,t:p.centro??p.t}));const folha=folhaJuiz(itens,path.join(dir,'juiz_re.jpg'));
   if(folha)try{for(const q of julgar(folha).picos){const p=falta[q.n-1],c=itens[q.n-1];if(p){Object.assign(p,{...q,centro:c.t,t:+(c.t+0.5*(q.quadro||0)).toFixed(2)});delete p.n;delete p.quadro;delete p.obs;}}}catch(e){log(' juiz falhou:',e.message);}}
  for(const p of alvo){const r={video:id,...p,decisao:'reprovado'};
   if(p.limpo_de!=null&&passa(r)&&aprovar(r,src,dir,'r'+Math.round(p.t*100)))aprov.push(r);
   Object.assign(p,guarda(r));fs.appendFileSync(REL,linha(r));}
  wj(CACHE,cache);fs.rmSync(dir,{recursive:true,force:true});}
}
function main(){
 fs.mkdirSync(TMP,{recursive:true});const cache=rj(CACHE,{});const g0=rj(GASTO,{chamadas:0,usd:0});
 fs.appendFileSync(REL,(fs.existsSync(REL)?'':'# Relatório do caçador de takes\n')+`
## ${new Date().toISOString().slice(0,16).replace('T',' ')} — alvo ${ALVO} (nota >= ${LIM.nota}, sem HUD >= ${LIM.semHud}; ${ESTOQUE?'direto no estoque':'saída para conferir: '+SAIDA})

| vídeo | t | grande | clímax | sem HUD | bonito | nota | tag | o que aparece | decisão |
|---|---|---|---|---|---|---|---|---|---|
`);
 const aprov=[];let cand;
 if(ARQ){const f=path.resolve(String(ARQ));if(!fs.existsSync(f)){console.error('arquivo não existe: '+f);process.exit(1);}
  const id=path.basename(f).replace(/\.[^.]+$/,'').replace(/[^\w-]/g,'_');cand=[{id,dur:0,titulo:'(gravação própria) '+path.basename(f),local:f}];delete cache[id];}
 else{reaproveitar(cache,aprov);cand=buscar(cache);wj(CACHE,cache);}
 log(`${cand.length} vídeo(s) novos para avaliar; até ${NVID}`);
 let feitos=0;
 for(const v of cand){if(feitos>=NVID)break;
  const gasto=rj(GASTO,{usd:0}).usd-g0.usd;if(!aprov.length&&gasto>TETO){log(`gasto US$ ${gasto.toFixed(2)} passou do teto (${TETO}) sem nenhum aprovado — parei este alvo`);break;}
  let src;if(v.local){const p=run(require('ffprobe-static').path,['-v','error','-select_streams','v','-show_entries','stream=width,height','-of','csv=p=0',v.local]).stdout.trim().split(',');src={url:v.local,w:+p[0],h:+p[1]};}
  else src=fonte1080(v.id);
  if(!src){cache[v.id]={data:hoje(),motivo:'sem 1080p real'};wj(CACHE,cache);log(v.id,'sem 1080p');continue;}
  feitos++;const dir=path.join(TMP,v.id);fs.mkdirSync(dir,{recursive:true});
  log(`[${feitos}/${NVID}] ${v.id} ${src.w}x${src.h} "${v.titulo.slice(0,60)}"`);
  const tr=triagem(v.id,dir,v.local);if(tr.erro){cache[v.id]={data:hoje(),motivo:tr.erro};wj(CACHE,cache);fs.rmSync(dir,{recursive:true,force:true});continue;}
  // HUD/texto fixo dentro do recorte do quadrado = vídeo inteiro poluído
  if(tr.hud.quadrado>0.05){cache[v.id]={data:hoje(),motivo:`HUD/texto fixo dentro do recorte (${(tr.hud.quadrado*100).toFixed(0)}%)`,hud:tr.hud};wj(CACHE,cache);log(' HUD fixo, pulei');fs.rmSync(dir,{recursive:true,force:true});continue;}
  const itens=tr.picos.map((p,i)=>({n:i+1,url:src.url,t:p.t,sc:p.sc}));
  const folha=folhaJuiz(itens,path.join(dir,'juiz.jpg'));if(!folha){cache[v.id]={data:hoje(),motivo:'não consegui quadros 1080p'};wj(CACHE,cache);fs.rmSync(dir,{recursive:true,force:true});continue;}
  const keep=path.join(SAIDA,'_folhas');fs.mkdirSync(keep,{recursive:true});fs.copyFileSync(folha.f,`${keep}/${v.id}.jpg`);
  let j;try{j=julgar(folha);}catch(e){log(' juiz falhou:',e.message);fs.rmSync(dir,{recursive:true,force:true});continue;}
  const notas=[];
  for(const p of j.picos){const it=itens.find(x=>x.n===p.n);if(!it)continue;const t=+(it.t+0.5*(p.quadro||0)).toFixed(2);
   const r={video:v.id,...p,t,centro:it.t,decisao:'reprovado'};notas.push(r);
   if(passa(r)&&aprovar(r,src,dir,p.n))aprov.push(r);fs.appendFileSync(REL,linha(r));}
  cache[v.id]={data:hoje(),alvo:ALVO,titulo:v.titulo,picos:notas.map(guarda)};wj(CACHE,cache);
  fs.rmSync(dir,{recursive:true,force:true});
 }
 const g=rj(GASTO,{chamadas:0,usd:0});
 fs.appendFileSync(REL,`
Resumo: ${feitos} vídeos novos avaliados, ${aprov.length} takes aprovados, ${g.chamadas-g0.chamadas} chamadas ao Claude (US$ ${(g.usd-g0.usd).toFixed(3)}).
`);
 log(`fim: ${feitos} vídeos, ${aprov.length} aprovados, US$ ${(g.usd-g0.usd).toFixed(2)}; relatório em ${REL}`);
}
if(require.main===module)main();
module.exports={triagem,regua};
