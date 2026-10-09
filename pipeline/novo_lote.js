// Gera um lote novo de receitas para um projeto, sem IA: sorteia dentro da "receita boa" puxando para o que
// você aprovou no revisor (feedback/preferencias.json). Um estilo (estilos/<nome>.json) pode fixar ou limitar escolhas.
// uso: node novo_lote.js <projeto> [--n 10] [--estilo nome] [--lote N]
// depois: node motor.js <projeto> <N> all
const fs=require('fs'),path=require('path'),{spawnSync}=require('child_process');
const {ROOT}=require('./paths');
const A=process.argv.slice(2);const opt=k=>{const i=A.indexOf(k);return i>=0?A[i+1]:null};
const PROJ_NOME=A[0];const PDIR=path.join(__dirname,'projetos',PROJ_NOME||'_');
if(!PROJ_NOME||!fs.existsSync(path.join(PDIR,'projeto.json'))){console.error('uso: node novo_lote.js <projeto> [--n 10] [--estilo nome] [--lote N]');process.exit(1);}
const PROJ=JSON.parse(fs.readFileSync(path.join(PDIR,'projeto.json'),'utf8'));
const N=+(opt('--n')||10);
const readJSON=(f,d)=>{try{return JSON.parse(fs.readFileSync(f,'utf8'))}catch{return d}};

// ---------- estilo ----------
const ESTILO=opt('--estilo')?readJSON(path.join(__dirname,'estilos',opt('--estilo')+'.json'),null):null;
if(opt('--estilo')&&!ESTILO){console.error('estilo não encontrado: estilos/'+opt('--estilo')+'.json');process.exit(1);}

// ---------- o que já existe (ids e lotes) ----------
const VAR=path.join(ROOT,'render','variacoes');const ids=[],lotes=[];
for(const f of fs.readdirSync(VAR).filter(f=>f.startsWith('_receitas')))for(const r of readJSON(path.join(VAR,f),[])){ids.push(r.id);lotes.push(r.lote||1);}
for(const p of fs.readdirSync(path.join(__dirname,'projetos'))){const ld=path.join(__dirname,'projetos',p,'lotes');if(!fs.existsSync(ld))continue;
 for(const f of fs.readdirSync(ld)){const j=readJSON(path.join(ld,f),null);if(!j)continue;lotes.push(j.lote);for(const v of j.variacoes||[])ids.push(v.id);}}
const LOTE=+(opt('--lote')||Math.max(0,...lotes)+1);
let nextId=Math.max(0,...ids.map(i=>+String(i).replace(/\D/g,'')||0))+1;

// ---------- preferências aprendidas ----------
const PREF=readJSON(path.join(ROOT,'feedback','preferencias.json'),{caracteristicas:[]});
const score=(grupo,valor)=>{const c=(PREF.caracteristicas||[]).find(c=>c.grupo===grupo&&c.valor===valor);return c?c.score:0.5};
const PACK_NAMES={y1:'YouTube: cliques + caixa registradora',y2:'YouTube: cliques + moeda Mario + vine boom',y3:'YouTube: iPhone + caixa registradora + vine boom'};
// cada dimensão: opções dentro da receita boa + como o revisor chama essa opção (para puxar a nota)
const DIM={
 gap:{op:[0.28,0.2],grupo:'Cortes',rot:v=>v<0.25?'Cortes bem rápidos':'Cortes rápidos (sem pausas)'},
 zoom:{op:[[1,1.15],[1.12,1],[1,1.12],[1.1,1]],grupo:'Zoom na fala',rot:v=>Math.max(...v)>=1.2?'Zoom forte':'Zoom leve'},
 pack:{op:['y1','y2','y3'],grupo:'Sons',rot:v=>PACK_NAMES[v]},
 grade:{op:['vivo','quente'],grupo:'Cor da imagem',rot:v=>v==='vivo'?'Cor viva':'Cor quente'},
 memes:{op:['muitos','medios'],grupo:'Memes no quadrado',rot:v=>v==='muitos'?'Muitos memes':'Memes médios'},
 memeSom:{op:[0.3,0.4,0.5]},
 boxLen:{op:[null,1.5]},
 // efeitos novos (R.fx): sorteados para o revisor aprender qual você prefere
 musica:{op:['energia','leve','tech'],grupo:'Música de fundo',rot:v=>({energia:'Música: energia',leve:'Música: leve',tech:'Música: tech'})[v]},
 gancho:{op:[true,false],grupo:'Título no gancho',rot:v=>v?'Com título no gancho':'Sem título no gancho'},
 progresso:{op:[true,false],grupo:'Barra de progresso',rot:v=>v?'Com barra de progresso':'Sem barra de progresso'},
};
// lei do dono: legenda branca sem contorno e sem caixa — sempre "sombra"
const CAP='sombra';
// sempre ligados nos lotes novos: 1º frame claro, sem legenda brigando com o site, nitidez nela
// (aprovado pelo crítico: v981 fase 1 + v982/v983 fase 2 — cor por tema, gameplay em tela cheia, speed lines, meme seco/curado, CTA curto, master corrigido)
// telaCheia fica DESLIGADO: só 1 de 42 clipes do estoque fica limpo em tela cheia (HUD, dano, flash) — volta quando houver gameplay própria sem HUD
// precoGigante foi REPROVADO pelo dono ("17,90 gigante ficou muito ruim") — não religar sem ele pedir
const FX_FIXO={abertura:true,legendaSite:false,nitidez:true,legenda:'grande',punch:true,memeCurado:true,memeSeco:true,corTema:true,speed:true,ctaCurto:true,masterOk:true,pico:true,boxSeco:true,boxGrande:true,aura:true,zoomFrase:true};
// vocab (clipe escolhido pela etiqueta do que ele mostra) só liga quando o Garimpo entregou moveset/_tags.json — sem ele, toda a gameplay seria pulada
if(fs.existsSync(path.join(require('./paths').DADOS,'moveset','_tags.json')))FX_FIXO.vocab=true;
const temMusica=fs.existsSync(path.join(ROOT,'assets','musica','catalogo.json'));
const rng=(seed=>()=>{seed=(seed*1664525+1013904223)%4294967296;return seed/4294967296})(LOTE*7919+N);
// peso = nota aprendida ao cubo (puxa forte para o que você aprovou), com piso para ainda explorar um pouco
function sorteia(nome){const d=DIM[nome];let op=d.op;
 const fx=['musica','gancho','progresso'].includes(nome);const F=ESTILO&&(fx?ESTILO.fx:ESTILO.fixo);
 const fixo=F&&F[nome]!==undefined?F[nome]:undefined;if(fixo!==undefined)return fx&&nome==='musica'&&fixo&&typeof fixo==='object'?fixo.mood:fixo;
 if(ESTILO&&ESTILO.opcoes&&ESTILO.opcoes[nome])op=ESTILO.opcoes[nome];
 const w=op.map(v=>d.grupo?Math.max(0.08,score(d.grupo,d.rot(v)))**3:1);const tot=w.reduce((a,b)=>a+b,0);let r=rng()*tot;
 for(let i=0;i<op.length;i++){r-=w[i];if(r<=0)return op[i];}return op[op.length-1];}

const letras=Object.keys(PROJ.frases).join('');const opc=PROJ.frasesOpcionais||[];
const temRaca=Object.values(PROJ.direcoes).some(d=>d.pool==='race'||d.pool==='inv');
const vistos=new Set();const V=[];
for(let tent=0;V.length<N&&tent<500;tent++){
 const r={gap:sorteia('gap'),zoom:sorteia('zoom'),pack:sorteia('pack'),grade:sorteia('grade'),memes:sorteia('memes'),memeSom:sorteia('memeSom'),boxLen:sorteia('boxLen'),
  musica:temMusica?sorteia('musica'):false,gancho:PROJ.gancho?sorteia('gancho'):false,progresso:sorteia('progresso')};
 let order=letras;if(opc.length&&rng()<0.35){const tira=opc[Math.floor(rng()*opc.length)];order=letras.replace(tira,'');}
 // versão curta (cortes.js): estilo com fixo.corte = nome do corte, ou "sortear"
 const corteNome=ESTILO&&ESTILO.fixo&&ESTILO.fixo.corte;
 if(corteNome){const cs=(PROJ.cortes||[]).filter(c=>corteNome==='sortear'||c.nome===corteNome);
  if(!cs.length){console.error(`o projeto não tem o corte "${corteNome}" — rode: node cortes.js ${PROJ_NOME}`);process.exit(1);}
  order=cs[Math.floor(rng()*cs.length)].ordem;}
 const chave=JSON.stringify({...r,order});if(vistos.has(chave))continue;vistos.add(chave);
 const id='v'+nextId++;
 const fx={...FX_FIXO,...(ESTILO&&ESTILO.fx?Object.fromEntries(Object.entries(ESTILO.fx).filter(([k])=>!['musica','gancho','progresso'].includes(k))):{})};
 if(r.musica)fx.musica={mood:r.musica,db:-16};if(r.gancho)fx.gancho=true;if(r.progresso)fx.progresso=true;
 const v={id,order,gap:r.gap,dirs:'padrao',zoom:r.zoom,pack:r.pack,seed:+id.slice(1),hl:['amarelo'],reac:'nenhuma',memes:r.memes,memeSom:r.memeSom,grade:r.grade,cap:CAP,raceInv:temRaca,fx};
 if(r.boxLen)v.boxLen=r.boxLen;
 V.push(v);}
const out={lote:LOTE,projeto:PROJ_NOME,estilo:ESTILO?ESTILO.nome:null,criadoEm:new Date().toISOString(),variacoes:V};
const OUT=path.join(PDIR,'lotes',`lote${LOTE}.json`);
if(fs.existsSync(OUT)){console.error('já existe '+OUT);process.exit(1);}
fs.writeFileSync(OUT,JSON.stringify(out,null,1));
console.log(`lote ${LOTE} (${PROJ_NOME}${ESTILO?', estilo '+ESTILO.nome:''}): ${V.map(v=>v.id).join(', ')}`);

// receitas para o revisor + checagem de qualidade de todas, sem renderizar
spawnSync(process.execPath,[path.join(__dirname,'motor.js'),PROJ_NOME,String(LOTE),'--receitas'],{stdio:'inherit'});
const pl=spawnSync(process.execPath,[path.join(__dirname,'motor.js'),PROJ_NOME,String(LOTE),'all','--plano'],{encoding:'utf8',maxBuffer:64<<20});
let ok=true;try{for(const p of JSON.parse(pl.stdout)){const st=p.erros.length?'ERRO: '+p.erros.join('; '):p.avisos.length?'aviso: '+p.avisos.join('; '):'ok';if(p.erros.length)ok=false;console.log(`  ${p.id} ${p.duracao}s — ${st}`);}}
catch{console.error(pl.stderr||pl.stdout);ok=false;}
console.log(ok?`\npronto para renderizar: node motor.js ${PROJ_NOME} ${LOTE} all`:'\ncorrija os erros acima antes de renderizar');
process.exit(ok?0:2);
