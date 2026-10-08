// Transforma um vídeo de referência (arquivo ou link: Biblioteca de Anúncios do Facebook, TikTok, YouTube…) num estilo
// que o motor sabe fazer: estilos/<nome>.json. Mede ritmo de cortes, cor e gancho; o Claude (CLI) olha as folhas de frames.
// O estilo só ajusta parâmetros dentro da "receita boa" — as regras "nunca" continuam valendo.
// uso: node referencia.js <arquivo|url> <nome> [--sem-ia]
// depois: node novo_lote.js <projeto> --estilo <nome>
const fs=require('fs'),path=require('path'),{execFileSync,spawnSync}=require('child_process');
const ff=require('ffmpeg-static'),fp=require('ffprobe-static').path;
const {DADOS}=require('./paths');const {perguntar}=require('./ia');
const A=process.argv.slice(2);const [FONTE,NOME]=A.filter(a=>!a.startsWith('--'));
if(!FONTE||!NOME||!/^[a-z0-9_-]+$/i.test(NOME)){console.error('uso: node referencia.js <arquivo|url> <nome> [--sem-ia]');process.exit(1);}
const RDIR=path.join(DADOS,'referencias',NOME);fs.mkdirSync(RDIR,{recursive:true});
const log=(...a)=>console.log('•',...a);

// ---------- 1) pega o vídeo ----------
let video;
if(/^https?:\/\//i.test(FONTE)){
 log('baixando a referência…');
 const r=spawnSync(path.join(__dirname,'tools','yt-dlp.exe'),['--no-check-certificates','--no-playlist','-f','bv*[height<=1280]+ba/b','--merge-output-format','mp4','--ffmpeg-location',path.dirname(ff),'-o',path.join(RDIR,'ref.%(ext)s'),FONTE],{stdio:'inherit'});
 video=fs.readdirSync(RDIR).map(f=>path.join(RDIR,f)).find(f=>/^ref\.(mp4|mkv|webm|mov)$/i.test(path.basename(f)));
 if(r.status!==0||!video){console.error('não consegui baixar. Na Biblioteca de Anúncios, abra o anúncio, baixe o vídeo e passe o arquivo.');process.exit(1);}
}else{if(!fs.existsSync(FONTE)){console.error('arquivo não encontrado: '+FONTE);process.exit(1);}video=path.join(RDIR,'ref'+path.extname(FONTE));fs.copyFileSync(FONTE,video);}

// ---------- 2) métricas ----------
const pr=JSON.parse(execFileSync(fp,['-v','error','-show_entries','format=duration:stream=codec_type,width,height','-of','json',video]));
const vs=pr.streams.find(s=>s.codec_type==='video');const DUR=+pr.format.duration;
const meta=vf=>spawnSync(ff,['-v','error','-i',video,'-an','-vf',vf,'-f','null','-'],{encoding:'utf8',maxBuffer:64<<20}).stdout||'';
const cortes=[...meta("select='gt(scene,0.3)',metadata=print:file=-").matchAll(/pts_time:([\d.]+)/g)].map(m=>+m[1]);
const sats=[...meta('fps=2,scale=320:-2,signalstats,metadata=print:key=lavfi.signalstats.SATAVG:file=-').matchAll(/SATAVG=([\d.]+)/g)].map(m=>+m[1]);
const satMedia=sats.length?sats.reduce((a,b)=>a+b,0)/sats.length:0;
const M={duracao:+DUR.toFixed(1),formato:`${vs.width}x${vs.height}`,vertical:vs.height>vs.width,cortes:cortes.length,
 planoMedio:+(DUR/(cortes.length+1)).toFixed(2),cortesPorSegundo:+(cortes.length/DUR).toFixed(2),
 primeiroCorte:cortes.length?+cortes[0].toFixed(2):null,cortesNos3s:cortes.filter(t=>t<3).length,saturacao:+satMedia.toFixed(1)};
log('métricas:',JSON.stringify(M));

// ---------- 3) folhas de frames ----------
const geral=path.join(RDIR,'folha_geral.jpg'),gancho=path.join(RDIR,'folha_gancho.jpg');
const lbl="drawtext=fontfile='C\\:/Windows/Fonts/arial.ttf':text='%{pts\\:hms}':x=6:y=6:fontsize=20:fontcolor=yellow:box=1:boxcolor=black@0.6";
const temFonte=fs.existsSync('C:/Windows/Fonts/arial.ttf');
execFileSync(ff,['-v','error','-y','-i',video,'-vf',`fps=${(20/DUR).toFixed(4)},scale=240:-2${temFonte?','+lbl:''},tile=5x4`,'-frames:v','1','-q:v','3',geral]);
execFileSync(ff,['-v','error','-y','-t','3','-i',video,'-vf',`fps=4,scale=240:-2${temFonte?','+lbl:''},tile=4x3`,'-frames:v','1','-q:v','3',gancho]);
log('folhas:',geral,'|',gancho);

// ---------- 4) traduz em estilo ----------
// por regras (fallback): ritmo de corte -> jump cut / quadros / memes; saturação -> cor
const regras={gap:M.planoMedio<1.3?0.2:0.28,boxLen:M.planoMedio<1.3?1.5:1.8,memes:M.planoMedio<2?'muitos':'medios',grade:M.saturacao>=35?'vivo':M.saturacao<12?'quente':undefined,cap:'sombra',zoomForte:M.planoMedio<1.0};
const SCHEMA={type:'object',additionalProperties:false,required:['descricao','gancho','gap','boxLen','memes','grade','cap','zoomForte','queNaoDaParaFazer','dicasParaGravar'],properties:{
 descricao:{type:'string'},gancho:{type:'string'},
 gap:{type:'number',enum:[0.28,0.2]},boxLen:{type:'number',enum:[1.8,1.5]},memes:{type:'string',enum:['medios','muitos']},
 grade:{type:'string',enum:['vivo','quente']},cap:{type:'string',enum:['sombra','faixa']},zoomForte:{type:'boolean'},
 queNaoDaParaFazer:{type:'array',items:{type:'string'}},dicasParaGravar:{type:'string'}}};
let IA=null;
if(!A.includes('--sem-ia')){log('pedindo a leitura do estilo ao Claude (CLI)…');
 const prompt=`Você analisa anúncios de referência para a Basic-Build (conta pronta de Blox Fruits, R$ 17,90; anúncios verticais UGC: pessoa falando + gameplay num quadrado 3D + memes + legenda palavra por palavra).
Abra e olhe as duas imagens com a ferramenta Read:
- ${geral} — 20 frames do vídeo inteiro, com o tempo em amarelo
- ${gancho} — os 3 primeiros segundos, 4 frames por segundo
Métricas medidas: ${JSON.stringify(M)}

O que o motor JÁ faz (não liste isso como faltando): jump cuts na fala com zoom em degraus; print do site mobile em 3D (perspectiva, rolando, brilho) inclusive abrindo o vídeo; cards da marca BASIC-BUILD com itens e ícones ("O básico pronto", "Entrega automática / Pagou no Pix", "Só R$ 17,90 / Clica abaixo"); site de feedbacks "Quem já comprou" em 3D; gameplay das armas num quadrado 3D com a pessoa desfocada atrás; memes de reação num quadrado reto; legenda palavra por palavra com destaque amarelo; sons de clique, moeda no preço e vine boom.
Obs.: a saturação medida é pouco confiável (as inserções dominam); julgue a cor pelos frames, olhando a pele e o fundo da pessoa.

Traduza o estilo da referência para os controles do nosso motor (só existem estes):
- gap: 0.28 = jump cuts rápidos (padrão), 0.2 = cortes bem rápidos/frenéticos
- boxLen: 1.8 = quadros de gameplay normais, 1.5 = quadros rápidos
- memes: medios ou muitos (memes de reação num quadrado)
- grade: vivo (saturado, punchy) ou quente (tons quentes, mais natural)
- cap: sombra (legenda branca só com sombra — a preferida do dono) ou faixa (caixa escura atrás)
- zoomForte: true se a referência usa zooms fortes/punch-ins na pessoa
Regras do dono que valem sempre (não sugira o contrário): sem whoosh, sem emoji, legenda sem contorno preto, ordem original da fala, nada de meme aleatório.
Em "queNaoDaParaFazer" liste o que a referência faz e o motor ainda não sabe (ex.: tela dividida, texto grande no topo, transição X). Em "dicasParaGravar", o que a pessoa deveria fazer ao gravar o vídeo base para chegar nesse estilo. Responda em português.`;
 try{const r=perguntar({prompt,schema:SCHEMA,ler:[geral,gancho],esforco:'high'});IA=r.dados;log(`Claude respondeu (${r.modelo})`);}
 catch(e){console.warn('  aviso: IA indisponível, estilo só pelas métricas —',e.message);}}
const S=IA||{...regras,descricao:`ritmo de ${M.planoMedio}s por plano, saturação ${M.saturacao}`,gancho:M.primeiroCorte!=null?`primeiro corte em ${M.primeiroCorte}s`:'sem cortes',queNaoDaParaFazer:[],dicasParaGravar:''};
const estilo={nome:NOME,descricao:S.descricao,fonte:FONTE,origem:IA?'claude':'metricas',metricas:M,gancho:S.gancho,
 fixo:{gap:S.gap,grade:S.grade,memes:S.memes,cap:S.cap,boxLen:S.boxLen===1.5?1.5:null},
 opcoes:{zoom:S.zoomForte?[[1,1.2],[1.2,1],[1,1.15]]:[[1,1.15],[1.12,1],[1,1.12]]},
 queNaoDaParaFazer:S.queNaoDaParaFazer,dicasParaGravar:S.dicasParaGravar,folhas:[geral,gancho],criadoEm:new Date().toISOString()};
fs.mkdirSync(path.join(__dirname,'estilos'),{recursive:true});
fs.writeFileSync(path.join(__dirname,'estilos',NOME+'.json'),JSON.stringify(estilo,null,1));
console.log(`\nestilo salvo: estilos/${NOME}.json (origem: ${estilo.origem})\n  ${estilo.descricao}\n  fixo: ${JSON.stringify(estilo.fixo)}`);
if(estilo.queNaoDaParaFazer.length)console.log('  o motor ainda não faz:',estilo.queNaoDaParaFazer.join('; '));
if(estilo.dicasParaGravar)console.log('  dica para gravar:',estilo.dicasParaGravar);
console.log(`\nuse: node novo_lote.js <projeto> --estilo ${NOME}`);
