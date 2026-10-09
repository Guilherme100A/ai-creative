// farm_loop.js — farm de takes em loop (pedido do dono: "agente em loop farmando takes de todos os movesets").
// Busca e download pelo MCP do dono (mcp-media, aprovado por ele para tudo; não auditar a configuração dele);
// julgamento pelo juiz da esteira (cacador.js --arquivo, régua + conhecimento_blox + pesquisa_wiki).
// Aprovados vão para DADOS/_cacador_saida/<tag> para o dono conferir (não entram no estoque sozinhos).
// Para sozinho: resposta do MCP com bloqueio:true, gasto da noite no teto, ou nenhuma novidade em 2 voltas seguidas.
// uso: node farm_loop.js [--teto-noite 15] [--por-volta 4]
// saída: 0 = acabou a novidade, 10 = teto da noite (não religar), 11 = bloqueio:true (o farm.sh espera 45 min e tenta de novo), outro = erro (religa)
const fs=require('fs'),path=require('path'),{spawn,spawnSync}=require('child_process');
const {DADOS}=require('./paths');
const SERVIDOR='C:/Users/green/Downloads/mcp-youtube/src/server.js';
const SAIDA=DADOS+'/_cacador_saida',TMP=SAIDA+'/farm_tmp',LOG=SAIDA+'/logs/farm.log';
const ESTADO=path.join(__dirname,'farm_estado.json'),CACHE=path.join(__dirname,'cacador_cache.json'),GASTO=path.join(__dirname,'cacador_gasto.json');
const arg=(k,d)=>{const i=process.argv.indexOf('--'+k);return i<0?d:process.argv[i+1];};
const TETO_NOITE=+arg('teto-noite',15),POR_VOLTA=+arg('por-volta',4);
fs.mkdirSync(TMP,{recursive:true});fs.mkdirSync(path.dirname(LOG),{recursive:true});
const log=(...m)=>{const l=`${new Date().toLocaleString('pt-BR')} ${m.join(' ')}`;console.log(l);fs.appendFileSync(LOG,l+'\n');};
const rj=(f,d)=>{try{return JSON.parse(fs.readFileSync(f,'utf8'))}catch{return d}};
const wj=(f,o)=>fs.writeFileSync(f,JSON.stringify(o,null,1));

// buscas por alvo: SHOWCASE com câmera perto (PvP/bounty tem boneco minúsculo e HUD) + nomes dos golpes da pesquisa_wiki
const BUSCAS={
 golpe_godhuman:['godhuman showcase','godhuman showcase max mastery','godhuman fighting style showcase','godhuman soaring beast','godhuman sixth realm gun','godhuman heaven and earth','god human showcase blox fruits'],
 golpe_cdk:['cursed dual katana showcase','cdk showcase blox fruits','cdk showcase max mastery','cdk revolving ravager','cdk slayer of goliath','cursed dual katana cinematic'],
 golpe_soul_guitar:['skull guitar showcase','soul guitar showcase blox fruits','skull guitar max mastery showcase','skull guitar soul shaker','skull guitar el diablo'],
 aura_v4:['race v4 showcase blox fruits','ghoul v4 showcase','human v4 showcase','rabbit v4 showcase','all race v4 transformations blox fruits','v4 awakening cinematic blox fruits'],
 inventario_cheio:['blox fruits inventory all mythical fruits','rating my blox fruits inventory','blox fruits fruit storage tour','blox fruits all mythical fruits collection'],
};
const EXCLUIR=['pvp','bounty','hunting','hunt','vs','versus','noob to','script','hack','exploit','executor','hub','no key','macro','giveaway','free robux','codes','auto farm'];
const PROIBIDO=/\b(scripts?|hacks?|hacked|exploits?|executor|hub|auto\s*-?\s*farm|no\s*key|keyless|delta|fluxus|krnl|codes?|giveaway|free\s*robux|macros?)\b/i;

// ---- cliente MCP mínimo (stdio, JSON-RPC por linha) ----
let mcp,buf='',nid=0;const pend=new Map();
function ligarMcp(){return new Promise((ok,erro)=>{
 mcp=spawn(process.execPath,[SERVIDOR],{cwd:path.dirname(path.dirname(SERVIDOR)),stdio:['pipe','pipe','pipe'],windowsHide:true});
 mcp.stderr.on('data',()=>{});mcp.on('exit',c=>{for(const p of pend.values())p.erro(new Error('mcp-media saiu ('+c+')'));pend.clear();});
 mcp.stdout.setEncoding('utf8');mcp.stdout.on('data',d=>{buf+=d;let i;while((i=buf.indexOf('\n'))>=0){const l=buf.slice(0,i).trim();buf=buf.slice(i+1);if(!l)continue;
  let m;try{m=JSON.parse(l)}catch{continue}const p=pend.get(m.id);if(p){pend.delete(m.id);m.error?p.erro(new Error(m.error.message)):p.ok(m.result);}}});
 pedir('initialize',{protocolVersion:'2025-06-18',capabilities:{},clientInfo:{name:'farm_loop',version:'1'}}).then(r=>{mcp.stdin.write(JSON.stringify({jsonrpc:'2.0',method:'notifications/initialized'})+'\n');ok(r);},erro);});}
function pedir(method,params,ms=15*60000){return new Promise((ok,erro)=>{const id=++nid;const t=setTimeout(()=>{pend.delete(id);erro(new Error('timeout '+method))},ms);
 pend.set(id,{ok:r=>{clearTimeout(t);ok(r)},erro:e=>{clearTimeout(t);erro(e)}});mcp.stdin.write(JSON.stringify({jsonrpc:'2.0',id,method,params})+'\n');});}
async function ferramenta(nome,args){const r=await pedir('tools/call',{name:nome,arguments:args});const txt=(r.content||[]).map(c=>c.text||'').join('');
 let d;try{d=JSON.parse(txt)}catch{d={texto:txt}}
 if(JSON.stringify(d).includes('"bloqueio":true')){log(`mcp-media respondeu bloqueio:true em ${nome} — pausando o farm (espera e tenta mais tarde)`);process.exit(11);}
 if(r.isError)throw new Error(`${nome}: ${txt.slice(0,300)}`);return d;}

// ---- volta de farm ----
const gastoAgora=()=>rj(GASTO,{usd:0}).usd||0;
async function novosDoAlvo(alvo,est){const vistos=new Set([...Object.keys(rj(CACHE,{})),...(est.vistos||[])]);
 const qs=BUSCAS[alvo].map(q=>({query:q,max_resultados:25,excluir_termos:EXCLUIR,...(est.pagina[alvo+'|'+q]?{pagina:est.pagina[alvo+'|'+q]}:{})}));
 const r=await ferramenta('buscar_videos_lote',{queries:qs,compacto:true});const out=[];
 for(const it of r.items||[]){if(it.status!=='ok')continue;const q=it.input.query;if(it.data.next_page)est.pagina[alvo+'|'+q]=it.data.next_page;
  for(const v of it.data.items||[]){const d=v.duration_seconds||0;
   if(vistos.has(v.id)||out.some(o=>o.id===v.id)||v.vertical||v.is_short)continue;
   if(PROIBIDO.test(v.title||'')||EXCLUIR.some(e=>new RegExp(`\\b${e}\\b`,'i').test(v.title||'')))continue;
   if(d&&(d<25||d>1500))continue;out.push({id:v.id,titulo:v.title,dur:d});}}
 return out;}
function julgar(alvo,arq){const r=spawnSync(process.execPath,[path.join(__dirname,'cacador.js'),'--alvo',alvo,'--arquivo',arq,'--picos','12','--teto','3','--espalha'],{cwd:__dirname,encoding:'utf8',timeout:40*60000,windowsHide:true});
 const o=(r.stdout||'')+(r.stderr||'');for(const l of o.split(/\r?\n/))if(/✓|fim:|erro|Error|sem pesquisa/.test(l))log('  ',l.trim());
 if(r.status===2&&/sem pesquisa/.test(o))return 'sem_wiki';if(r.status!==0)throw new Error(`cacador saiu ${r.status}: ${o.slice(-400)}`);return 'ok';}

async function main(){
 const est=rj(ESTADO,{inicio:new Date().toISOString(),gasto0:gastoAgora(),voltas:0,vazias:0,pagina:{},vistos:[],aprovados:0,por_alvo:{}});
 if(!est.gasto0&&est.gasto0!==0)est.gasto0=gastoAgora();
 await ligarMcp();log(`farm ligado — teto da noite US$ ${TETO_NOITE}, ${POR_VOLTA} vídeos por alvo por volta`);
 for(;;){est.voltas++;let novidade=0;
  for(const alvo of Object.keys(BUSCAS)){
   const gasto=gastoAgora()-est.gasto0;if(gasto>=TETO_NOITE){log(`teto da noite atingido (US$ ${gasto.toFixed(2)}) — parando`);wj(ESTADO,est);process.exit(10);}
   let lista;try{lista=(await novosDoAlvo(alvo,est)).slice(0,POR_VOLTA);}catch(e){log(`busca ${alvo} falhou: ${e.message}`);continue;}
   log(`volta ${est.voltas} · ${alvo}: ${lista.length} vídeos novos`);
   for(const v of lista){novidade++;est.vistos.push(v.id);wj(ESTADO,est);
    const arq=`${TMP}/${v.id}.mp4`;
    try{const d=await ferramenta('baixar_video',{id:v.id,destino:arq,audio:false,resolucao:'1080p'});
     if(!fs.existsSync(arq)||(d.altura&&d.altura<1080)){log(`  ${v.id} sem 1080p (${d.altura||'?'}p) — pulei`);try{fs.rmSync(arq,{force:true})}catch{}continue;}
     log(`  ${v.id} "${String(v.titulo).slice(0,60)}" (${v.dur}s) baixado — juiz`);
     const antes=fs.readdirSync(SAIDA,{recursive:true}).filter(f=>/\.mp4$/.test(f)&&!/farm_tmp|gh_showcase/.test(f)).length;
     if(julgar(alvo,arq)==='sem_wiki'){log(`  ${alvo} sem pesquisa_wiki — alvo pulado até pesquisarem`);delete BUSCAS[alvo];break;}
     const depois=fs.readdirSync(SAIDA,{recursive:true}).filter(f=>/\.mp4$/.test(f)&&!/farm_tmp|gh_showcase/.test(f)).length;
     est.aprovados+=depois-antes;est.por_alvo[alvo]=(est.por_alvo[alvo]||0)+(depois-antes);
    }catch(e){log(`  ${v.id} falhou: ${e.message}`);if(/mcp-media saiu/.test(e.message))throw e;}
    finally{try{fs.rmSync(arq,{force:true})}catch{}wj(ESTADO,est);}}}
  log(`fim da volta ${est.voltas}: ${novidade} vídeos, aprovados na noite ${est.aprovados} ${JSON.stringify(est.por_alvo)}, gasto US$ ${(gastoAgora()-est.gasto0).toFixed(2)}`);
  est.vazias=novidade?0:est.vazias+1;wj(ESTADO,est);if(est.vazias>=2){log('2 voltas sem vídeo novo — farm terminou');process.exit(0);}
  await new Promise(r=>setTimeout(r,60000));}
}
main().catch(e=>{log('ERRO: '+(e.stack||e.message));process.exit(1);});
