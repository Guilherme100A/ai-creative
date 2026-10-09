// Cria um projeto (projetos/<nome>/projeto.json) a partir de um vídeo base novo — substitui escrever make_genN.js à mão.
// 1) confere/normaliza o vídeo (1080x1920, 30fps)  2) transcreve (Whisper local)  3) corrige nomes
// 4) rascunho por regras  5) o Claude (via CLI) decide frases, direções, memes e destaques usando o vídeo 2 como gabarito
// 6) valida tudo contra o que existe (cenas, estoque, categorias).
// uso: node novo_projeto.js <nome> <video> [--palavras arq.json] [--sem-ia] [--sobrescrever] [--descricao "..."]
const fs=require('fs'),path=require('path'),{execFileSync,spawnSync}=require('child_process');
const ff=require('ffmpeg-static'),fp=require('ffprobe-static').path;
const {DADOS}=require('./paths');const {perguntar}=require('./ia');
const {CENAS_PRECO_ANTIGO}=require('./qualidade');

const A=process.argv.slice(2);const flag=k=>A.includes(k);const opt=k=>{const i=A.indexOf(k);return i>=0?A[i+1]:null};
const POS=A.filter((a,i)=>!a.startsWith('--')&&!['--palavras','--descricao'].includes(A[i-1]));
const [NOME,VIDEO]=POS;
if(!NOME||!VIDEO||!/^[a-z0-9_-]+$/i.test(NOME)){console.error('uso: node novo_projeto.js <nome> <video> [--palavras arq.json] [--sem-ia] [--sobrescrever]');process.exit(1);}
const DIR=path.join(__dirname,'projetos',NOME);
if(fs.existsSync(path.join(DIR,'projeto.json'))&&!flag('--sobrescrever')){console.error(`projeto "${NOME}" já existe (use --sobrescrever)`);process.exit(1);}
fs.mkdirSync(path.join(DIR,'lotes'),{recursive:true});
const log=(...a)=>console.log('•',...a);
const fwd=p=>p.split(path.sep).join('/');

// ---------- 1) vídeo ----------
const probe=f=>JSON.parse(execFileSync(fp,['-v','error','-show_entries','format=duration:stream=codec_type,width,height,r_frame_rate','-of','json',f]));
// --sem-video: monta o projeto só com a transcrição (--palavras), sem o arquivo do vídeo nesta máquina
const SEMV=flag('--sem-video');if(SEMV&&!opt('--palavras')){console.error('--sem-video precisa de --palavras');process.exit(1);}
let src=path.resolve(VIDEO);if(!SEMV&&!fs.existsSync(src)){const d=path.join(DADOS,VIDEO);if(fs.existsSync(d))src=d;else{console.error('vídeo não encontrado: '+VIDEO);process.exit(1);}}
if(SEMV)src=path.join(DADOS,VIDEO);
const pr=SEMV?null:probe(src);const vs=SEMV?{width:1080,height:1920,r_frame_rate:'30/1'}:pr.streams.find(s=>s.codec_type==='video');
if(!SEMV&&!pr.streams.some(s=>s.codec_type==='audio')){console.error('o vídeo não tem áudio — o vídeo base precisa da fala');process.exit(1);}
const [fn,fd]=vs.r_frame_rate.split('/').map(Number);const fps=fn/(fd||1);
const DUR=SEMV?(()=>{const c=JSON.parse(fs.readFileSync(opt('--palavras'),'utf8')).chunks;const l=c[c.length-1].timestamp;return (l[1]??l[0])+1.5})():+pr.format.duration;
log(SEMV?`sem vídeo: duração estimada ${DUR.toFixed(1)}s`:`vídeo: ${vs.width}x${vs.height} ${fps.toFixed(2)}fps ${DUR.toFixed(1)}s`);
let base=src;
if(!SEMV&&(vs.width!==1080||vs.height!==1920||Math.abs(fps-30)>0.01)){
 if(vs.width>vs.height)console.warn('  aviso: vídeo horizontal — vai ser cortado no centro para 9:16. O ideal é gravar em pé.');
 base=path.join(DADOS,'videos',NOME+'.mp4');fs.mkdirSync(path.dirname(base),{recursive:true});
 log('normalizando para 1080x1920 30fps →',base);
 execFileSync(ff,['-v','error','-y','-i',src,'-vf','scale=1080:1920:force_original_aspect_ratio=increase:flags=lanczos,crop=1080:1920,fps=30,setsar=1','-c:v','libx264','-crf','14','-preset','slow','-pix_fmt','yuv420p','-c:a','aac','-b:a','256k',base],{stdio:'inherit'});
}
const rel=path.relative(DADOS,base);const VIDEO_REF=!rel.startsWith('..')&&!path.isAbsolute(rel)?fwd(rel):fwd(base);

// ---------- 2) transcrição ----------
const PAL=path.join(DIR,'palavras.json');
if(opt('--palavras'))fs.copyFileSync(opt('--palavras'),PAL);
else if(!fs.existsSync(PAL)||flag('--sobrescrever')){log('transcrevendo com Whisper (alguns minutos)…');
 const r=spawnSync(process.execPath,[path.join(__dirname,'stt.mjs'),base,PAL,'Xenova/whisper-small'],{stdio:'inherit',cwd:__dirname});
 if(r.status!==0){console.error('transcrição falhou');process.exit(1);}}
const RAW=JSON.parse(fs.readFileSync(PAL,'utf8')).chunks.map(c=>({t:c.text.trim(),s:c.timestamp[0],e:Math.max(c.timestamp[1]??0,c.timestamp[0]+0.12)}));

// ---------- 3) correções (mesma lógica do motor) ----------
const GLOBAL=JSON.parse(fs.readFileSync(path.join(__dirname,'correcoes.json'),'utf8'));
function aplicaFix(W,fix){const F=fix.map(([seq,rep])=>[seq.map(x=>new RegExp(x)),rep]);const out=[];
 for(let i=0;i<W.length;i++){let done=false;for(const [seq,rep] of F){if(seq.every((re,k)=>W[i+k]&&re.test(W[i+k].t))){const last=W[i+seq.length-1];const p=(last.t.match(/[.,?!]$/)||[''])[0];out.push({t:rep+p,s:W[i].s,e:last.e});i+=seq.length-1;done=true;break;}}if(!done)out.push({...W[i]});}return out;}
let FIX=GLOBAL.fix;let W=aplicaFix(RAW,FIX);
const norm=t=>t.toUpperCase().replace(/[.,!?]+$/,'');
const SRC_END=+Math.min(DUR-0.05,W[W.length-1].e+1.5).toFixed(2);

// ---------- 4) rascunho por regras ----------
function frasesPorPausa(W){const out=[];let cur=[];
 W.forEach((w,i)=>{cur.push(w);const nx=W[i+1];if(!nx||/[.?!]$/.test(w.t)||nx.s-w.e>0.7){out.push(cur);cur=[];}});
 for(let i=0;i<out.length-1;i++){const a=out[i];if(a[a.length-1].e-a[0].s<1.2){out[i+1]=[...a,...out[i+1]];out.splice(i,1);i--;}}
 return out.map((g,i)=>({id:String.fromCharCode(65+i),de:+g[0].s.toFixed(2),ate:+g[g.length-1].e.toFixed(2),nome:g.slice(0,6).map(w=>w.t).join(' ')+(g.length>6?'…':''),opcional:false}));}
function rascunho(W,frases){
 const dirs=[];const livre=(s,e)=>!dirs.some(d=>d.de<e+0.05&&d.ate>s-0.05);
 const put=(d)=>{if(d.ate-d.de>=0.5&&livre(d.de,d.ate)){dirs.push(d);return true}return false};
 const frDe=w=>frases.find(f=>w.s>=f.de-0.06&&w.s<=f.ate);const last=frases[frases.length-1],first=frases[0];
 put({nome:'brandCta',de:+(last.de-0.05).toFixed(2),ate:99,tipo:'mo',clip:'brand_cta3',wpn:'',pool:'',motivo:'última frase: card final com o preço'});
 put({nome:'hookSite',de:+(first.de-0.03).toFixed(2),ate:+(first.de+1.12).toFixed(2),tipo:'mo',clip:'site_top2',wpn:'',pool:'',motivo:'abre mostrando o produto'});
 const nomes={};const nm=b=>{nomes[b]=(nomes[b]||0)+1;return nomes[b]>1?b+nomes[b]:b};
 W.forEach((w,i)=>{const u=norm(w.t);let wpn=null;if(u==='GODHUMAN')wpn='godhuman';else if(u==='CDK')wpn='cdk';else if(u==='SOUL'&&W[i+1]&&norm(W[i+1].t)==='GUITAR')wpn='soul guitar';
  if(!wpn)return;const end=wpn==='soul guitar'?W[i+1].e:w.e;const s=w.s-0.12;
  put({nome:nm(wpn==='godhuman'?'gh':wpn==='cdk'?'cdk':'sg'),de:+s.toFixed(2),ate:+Math.min(s+0.9,Math.max(s+0.55,end+0.05)).toFixed(2),tipo:'box',clip:'',wpn,pool:'',motivo:`fala "${w.t}"`});});
 const achar=(re,cond=()=>true)=>W.find(w=>re.test(norm(w.t))&&cond(w));
 let w=achar(/^(RAÇA|V4)$/);if(w)put({nome:'race',de:+(w.s-0.13).toFixed(2),ate:+(w.s+1.17).toFixed(2),tipo:'box',clip:'',wpn:'',pool:'race',motivo:'fala da raça V4'});
 w=achar(/^(FRUTAS|MÍSTICAS|MÍTICAS|INVENTÁRIO)$/);if(w)put({nome:'inv',de:+(w.s-0.09).toFixed(2),ate:+(w.s+0.76).toFixed(2),tipo:'box',clip:'',wpn:'',pool:'inv',motivo:'fala das frutas'});
 w=achar(/^BASIC-BUILD$/,x=>frDe(x)!==last);if(w)put({nome:'brandIntro',de:+(w.s-0.6).toFixed(2),ate:+(w.s+1.05).toFixed(2),tipo:'mo',clip:'brand_intro',wpn:'',pool:'',motivo:'primeira vez que fala a marca'});
 w=achar(/^(AUTOMATICAMENTE|ENTREGA|APROVADA)$/);if(w){const f=frDe(w);if(f)put({nome:'entrega',de:+(f.de-0.06).toFixed(2),ate:+(f.de+2.64).toFixed(2),tipo:'mo',clip:'brand_entrega',wpn:'',pool:'',motivo:'fala da entrega automática'});}
 w=achar(/^FEEDBACKS?$/,x=>livre(x.s-0.9,x.s+3.1));if(w)put({nome:'siteFb',de:+(w.s-0.9).toFixed(2),ate:+(w.s+3.1).toFixed(2),tipo:'mo',clip:'site_feedback',wpn:'',pool:'',motivo:'fala dos feedbacks'});
 w=achar(/^BÁSICO$/,x=>frDe(x)!==last);if(w){const f=frDe(w);if(f)put({nome:'siteTop',de:+(f.de-0.1).toFixed(2),ate:+(f.de+2.05).toFixed(2),tipo:'mo',clip:'site_top2',wpn:'',pool:'',motivo:'"o básico pronto"'});}
 // montagem: depois de citar armas, se a frase continua por 2s+
 for(const d of dirs.filter(d=>d.tipo==='box'&&d.wpn).sort((a,b)=>b.de-a.de)){const f=frases.find(f=>d.de>=f.de-0.2&&d.de<=f.ate);if(f&&f!==first&&f.ate-d.ate>=2){if(put({nome:'montage1',de:d.ate,ate:+(f.ate+0.14).toFixed(2),tipo:'montage',clip:'',wpn:'',pool:'',motivo:'resto da frase sobre a conta'}))break;}}
 w=achar(/^(JOGO|JOGAR)$/,x=>frDe(x)!==first&&frDe(x)!==last&&livre(x.s-1.45,x.s+0.12));if(w)put({nome:'jogo',de:+(w.s-1.45).toFixed(2),ate:+(w.s+0.12).toFixed(2),tipo:'box',clip:'',wpn:'any',pool:'',motivo:'"entrar no jogo"'});
 const pen=frases[frases.length-2];if(pen&&pen.ate-pen.de>3)put({nome:'final',de:+(pen.ate-1.7).toFixed(2),ate:+(pen.ate+0.1).toFixed(2),tipo:'box',clip:'',wpn:'any',pool:'',motivo:'fecho antes do CTA'});
 // memes por palavra-chave (dor/emoção da fala)
 const LEX={espera:/^(esperando|esperar|horas|dias|demora|missão|missões|farmar|farmando|grind)$/i,frustrado:/^(repetindo|repetir|cansado|cansativo|chato|gastando)$/i,choque:/^(caro|absurdo|insano)$/i,duvida:/^(dúvida|será|acreditar|confiar|golpe|medo)$/i,triste:/^(triste|infelizmente|perdeu|perder)$/i};
 const memes=[];
 W.forEach((w,i)=>{const t=w.t.replace(/[.,!?]+$/,'');for(const [cat,re] of Object.entries(LEX))if(re.test(t)){let j=i;while(j<W.length-1&&!/[.,?!]$/.test(W[j].t)&&W[j+1].s-w.s<2.6)j++;const de=+(w.s-0.2).toFixed(2),ate=+Math.min(W[j].e+0.1,w.s+2.6).toFixed(2);
  if(ate-de>=1&&!memes.some(m=>m[0]<ate&&m[1]>de))memes.push([de,ate,cat,0]);}});
 memes.forEach((m,k)=>m[3]=k<5?1:k<8?2:3);
 return {direcoes:dirs.sort((a,b)=>a.de-b.de),memes:memes.map(([de,ate,categoria,prioridade])=>({de,ate,categoria,prioridade,motivo:'palavra-chave'}))};
}
const frases0=frasesPorPausa(W);const R0=rascunho(W,frases0);
const rascunhoJSON={frases:frases0,...R0,destaques:GLOBAL.destaques,correcoes:[],observacoes:'rascunho por regras'};
fs.writeFileSync(path.join(DIR,'rascunho.json'),JSON.stringify(rascunhoJSON,null,1));
log(`rascunho: ${frases0.length} frases, ${R0.direcoes.length} direções, ${R0.memes.length} memes`);

// ---------- 5) IA (Claude Code CLI) ----------
const SCENES=JSON.parse(fs.readFileSync(path.join(__dirname,'scenes.json'),'utf8'));
const CLIPS=Object.keys(SCENES).filter(k=>!CENAS_PRECO_ANTIGO.includes(k));
const CATS=Object.keys(JSON.parse(fs.readFileSync(path.join(__dirname,'..','assets','memes','catalogo.json'),'utf8')).categorias);
const SCHEMA={type:'object',additionalProperties:false,required:['frases','direcoes','memes','destaques','gancho','correcoes','observacoes'],properties:{
 frases:{type:'array',items:{type:'object',additionalProperties:false,required:['id','de','ate','nome','opcional'],properties:{id:{type:'string'},de:{type:'number'},ate:{type:'number'},nome:{type:'string'},opcional:{type:'boolean'}}}},
 direcoes:{type:'array',items:{type:'object',additionalProperties:false,required:['nome','de','ate','tipo','clip','wpn','pool','motivo'],properties:{nome:{type:'string'},de:{type:'number'},ate:{type:'number'},tipo:{type:'string',enum:['mo','box','montage']},clip:{type:'string',enum:['',...CLIPS]},wpn:{type:'string',enum:['','godhuman','cdk','soul guitar','any']},pool:{type:'string',enum:['','race','inv']},motivo:{type:'string'}}}},
 memes:{type:'array',items:{type:'object',additionalProperties:false,required:['de','ate','categoria','prioridade','motivo'],properties:{de:{type:'number'},ate:{type:'number'},categoria:{type:'string',enum:CATS},prioridade:{type:'integer',enum:[1,2,3]},motivo:{type:'string'}}}},
 destaques:{type:'array',items:{type:'string'}},
 correcoes:{type:'array',items:{type:'object',additionalProperties:false,required:['de','para'],properties:{de:{type:'array',items:{type:'string'}},para:{type:'string'}}}},
 gancho:{type:'string'},
 observacoes:{type:'string'}}};
const transcr=W=>W.map(w=>`${w.s.toFixed(2)} ${w.t}`).join('\n');

// vocabulário visual (pipeline/vocabulario.json): o que tem que aparecer para cada palavra
function vocabTexto(){try{const V=JSON.parse(fs.readFileSync(path.join(__dirname,'vocabulario.json'),'utf8')).conceitos;
 return Object.entries(V).map(([k,c])=>`- ${k} (${c.gatilhos.slice(0,4).join(', ')}): ${c.visual}${c.nao_serve?' — NÃO serve: '+c.nao_serve.join('; '):''}`).join('\n');}catch{return '';}}

function promptIA(){
 const G=JSON.parse(fs.readFileSync(path.join(__dirname,'projetos','base2','projeto.json'),'utf8'));
 const GW=aplicaFix(JSON.parse(fs.readFileSync(path.join(__dirname,'projetos','base2','palavras.json'),'utf8')).chunks.map(c=>({t:c.text.trim(),s:c.timestamp[0],e:Math.max(c.timestamp[1]??0,c.timestamp[0]+0.12)})),G.fix);
 const gab={frases:Object.entries(G.frases).map(([id,[de,ate]])=>({id,de,ate})),direcoes:Object.entries(G.direcoes).map(([nome,d])=>({nome,de:d.s,ate:d.e,tipo:d.v,clip:d.clip||'',wpn:d.wpn||'',pool:d.pool||''})),memes:G.memes.map(([de,ate,categoria,prioridade])=>({de,ate,categoria,prioridade}))};
 const cenas=CLIPS.map(k=>{const s=SCENES[k];return `- ${k} (${s.dur}s): ${s.type==='site'?'print do site mobile em 3D':'card da marca "'+(s.tag||'')+'": '+(s.items||[]).map(i=>i.text).join(' / ')}`}).join('\n');
 return `Você é o editor dos criativos (anúncios verticais UGC) da Basic-Build: conta pronta de Blox Fruits (Godhuman + CDK + Soul Guitar, level máximo, às vezes raça V4 e frutas míticas). Preço: R$ 17,90.
O vídeo é uma pessoa falando para a câmera; a edição coloca por cima animações, gameplay num quadrado 3D e memes. Sua tarefa: para um VÍDEO BASE NOVO, decidir as frases, o que aparece na tela em cada trecho, onde entram memes e quais palavras ficam em amarelo. Um motor renderiza a partir disso.

## Regras aprendidas com o feedback do dono (valem sempre)
- Abre com o site mobile em 3D no 1º segundo (site_top2) e, logo depois, gameplay da arma que ela citar NO MOMENTO em que fala o nome.
- Gameplay (tipo box) só quando a fala pede: arma citada (wpn), raça V4 (pool race), frutas/inventário (pool inv). Poucos quadrados, nada de gameplay aleatório. "any" = gameplay genérica para falas tipo "entrar no jogo".
- AURA: nas falas sobre a conta ser forte/completa/itens raros ("tudo pronto", "itens que muita gente passa horas tentando conseguir") use tipo montage (vira montagem de AURA: avatar brilhando) ou box com wpn "any". Golpe de arma (wpn) só quando ela cita a arma.
- Card da marca (brand_intro) quando ela fala "Basic-Build" pela primeira vez; site de feedbacks quando fala de feedback; brand_entrega quando fala da entrega automática.
- A última frase (o CTA) termina com o card final brand_cta3 ("SÓ R$ 17,90"): ate = 99 (vai até o fim).
- Nunca cenas com R$ 18,90 (site_top, site_cta, brand_cta) — já foram removidas da lista.
- Memes: só em momentos de dor/emoção da fala (espera, frustração, dúvida, choque, tristeza, sucesso). Nada de meme aleatório. Janela de 1 a 2,8s. Prioridade 1 = os mais certeiros (entram sempre), 2 = médios, 3 = só no modo "muitos memes". Memes não podem ficar onde já tem direção (o motor pula).
- Frases: não reordenar; pode marcar como opcional (opcional=true) uma frase de enchimento que pode ser pulada sem quebrar o sentido. A primeira e a última nunca são opcionais.
- Direções não podem se sobrepor. Tempos em segundos da fala original. Duração de uma animação (mo) = a duração da cena (abaixo); quadros de gameplay de arma ~0,6–0,9s; raça ~1,3s; montage = vários quadros seguidos de armas diferentes (2–3s) quando a fala continua sobre a conta.
- Destaques (amarelo): nomes de itens, marca, preço, palavras de dor (HORAS, DIAS, ZERO) e de ação (JOGAR). Em MAIÚSCULAS, exatamente como a palavra aparece (com acento).
- Correções: o Whisper erra nomes (ex.: "Base Key Build" → "Basic-Build", "God Human" → "Godhuman", "Blocks" → "Blox"). Já aplicamos estas correções globais: ${GLOBAL.fix.map(([s,r])=>`${s.map(x=>x.replace(/[\^$]/g,'')).join(' ')}→${r}`).join('; ')}. Se ainda sobrar erro de transcrição na fala nova, devolva em "correcoes" com as palavras EXATAMENTE como aparecem na transcrição abaixo.

## Vocabulário visual (o que TEM que aparecer para cada palavra; sem clipe certo, não ponha nada)
${vocabTexto()}
Mapeamento nas direções: godhuman/cdk/soul_guitar → box com wpn; raca_v4 → box pool race; inventario_frutas → box pool inv; conta_forte → montage; entrega/feedbacks/marca → a cena (mo) indicada.

## Cenas disponíveis (tipo mo)
${cenas}

## Categorias de meme
${CATS.join(', ')}

## GABARITO — vídeo 2, editado à mão e aprovado pelo dono
Transcrição (tempo palavra):
${transcr(GW)}

Decisões aprovadas:
${JSON.stringify(gab)}

## VÍDEO NOVO (${DUR.toFixed(1)}s)
Transcrição (tempo palavra), já com as correções globais:
${transcr(W)}

Rascunho automático por regras (pode corrigir à vontade; é só ponto de partida):
${JSON.stringify({frases:frases0,direcoes:R0.direcoes,memes:R0.memes})}

Em "gancho", escreva o TÍTULO grande que aparece nos primeiros 2 segundos (em MAIÚSCULAS, 2 a 5 palavras, no máx. 28 caracteres, sem emoji): a dor ou a promessa mais forte da fala, para parar o scroll. Ponha entre *asteriscos* a palavra que fica amarela (uma só). Ex.: "PARE DE *FARMAR* LEVEL".

Devolva o projeto do vídeo novo no formato pedido. Em "observacoes", diga em português o que achou do vídeo e qualquer ponto que o dono deveria conferir.`;
}

let IA=null;
if(!flag('--sem-ia')){log('pedindo a edição ao Claude (CLI)…');
 try{const r=perguntar({prompt:promptIA(),schema:SCHEMA,esforco:'high'});IA=r.dados;log(`Claude respondeu (${r.modelo}${r.custo!=null?`, ~US$ ${r.custo.toFixed(2)} equivalente`:''})`);fs.writeFileSync(path.join(DIR,'ia.json'),JSON.stringify(IA,null,1));}
 catch(e){console.warn('  aviso: IA indisponível, ficando com o rascunho por regras —',e.message);}}
const P=IA||rascunhoJSON;

// ---------- 6) valida e monta o projeto ----------
const avisos=[];
const esc=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
// a IA às vezes manda "Basic Beauty" como um item só; a transcrição tem uma palavra por item
for(const c0 of P.correcoes||[]){const de=c0.de.flatMap(t=>t.trim().split(/\s+/)).filter(Boolean);
 if(de.length&&c0.para)FIX=[...FIX,[de.map((t,k)=>'^'+esc(t.replace(/[.,!?]+$/,''))+(k<de.length-1?'$':'')),c0.para]];}
const fr=[...P.frases].filter(f=>f.ate>f.de&&f.de>=0&&f.de<DUR).sort((a,b)=>a.de-b.de);
const frases={},nomesFrases={},opcionais=[];
fr.forEach((f,i)=>{const id=String.fromCharCode(65+i);frases[id]=[+f.de.toFixed(2),+Math.min(f.ate,SRC_END).toFixed(2)];nomesFrases[id]=f.nome;if(f.opcional&&i>0&&i<fr.length-1)opcionais.push(id);});
if(fr.length>26)avisos.push('mais de 26 frases — agrupe frases curtas');
const direcoes={};const usadas=[];
for(const d of [...P.direcoes].sort((a,b)=>a.de-b.de)){
 let nome=d.nome.replace(/[^a-z0-9_]/gi,'')||'d';while(direcoes[nome])nome+='_';
 const fim=d.ate>=SRC_END-0.3||d.ate>=99?99:+d.ate.toFixed(2);const ate=fim>=99?SRC_END:fim;
 if(usadas.some(([a,b])=>a<ate-0.05&&b>d.de+0.05)){avisos.push(`direção "${d.nome}" sobreposta — descartada`);continue;}
 let x;
 if(d.tipo==='mo'){if(!CLIPS.includes(d.clip)){avisos.push(`direção "${d.nome}": cena inválida "${d.clip}"`);continue;}x={s:+d.de.toFixed(2),e:fim,v:'mo',clip:d.clip};}
 else if(d.tipo==='box'){if(d.pool)x={s:+d.de.toFixed(2),e:fim,v:'box',pool:d.pool};else if(d.wpn)x={s:+d.de.toFixed(2),e:fim,v:'box',wpn:d.wpn};else{avisos.push(`direção "${d.nome}": quadrado sem arma/estoque`);continue;}}
 else x={s:+d.de.toFixed(2),e:fim,v:'montage'};
 direcoes[nome]=x;usadas.push([d.de,ate]);}
const memes=(P.memes||[]).filter(m=>m.ate-m.de>=0.6&&CATS.includes(m.categoria)).map(m=>[+m.de.toFixed(2),+m.ate.toFixed(2),m.categoria,m.prioridade]);
const destaques=[...new Set((P.destaques&&P.destaques.length?P.destaques:GLOBAL.destaques).map(w=>w.toUpperCase().replace(/[.,!?]+$/,'')))];
const Wf=aplicaFix(RAW,FIX);const preco=Wf.find(w=>/^\d+,\d{2}/.test(w.t));
if(!preco)avisos.push('não achei o preço falado — sem som de moeda na fala (o card final ainda tem)');
else if(!/^17,90/.test(preco.t))avisos.push(`preço falado é "${preco.t}" — o oficial é R$ 17,90`);
if(!Object.values(direcoes).some(d=>d.clip==='brand_cta3'))avisos.push('sem card final brand_cta3');
const proj={nome:NOME,descricao:opt('--descricao')||`Vídeo base ${NOME} (${DUR.toFixed(0)}s)`,video:VIDEO_REF,palavras:'palavras.json',fix:FIX,frases,nomesFrases,frasesOpcionais:opcionais,fimFala:SRC_END,
 direcoes,direcoesPadrao:Object.keys(direcoes),reacoes:[],memes,destaques,moedaEm:preco?+preco.s.toFixed(2):null,gancho:(P.gancho||'').trim().toUpperCase().slice(0,40)||null,
 origem:IA?'claude':'regras',observacoes:P.observacoes||'',criadoEm:new Date().toISOString()};
fs.writeFileSync(path.join(DIR,'projeto.json'),JSON.stringify(proj,null,1));
console.log(`\nprojeto salvo: projetos/${NOME}/projeto.json  (origem: ${proj.origem})`);
console.log(`  ${fr.length} frases, ${Object.keys(direcoes).length} direções, ${memes.length} memes, ${destaques.length} destaques`);
for(const a of avisos)console.log('  aviso:',a);
if(proj.observacoes)console.log('\nobservações:',proj.observacoes);
console.log(`\npróximo passo: node novo_lote.js ${NOME}`);
