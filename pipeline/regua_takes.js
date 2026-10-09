// regua_takes.js — régua visual do juiz de takes (cacador.js).
// Lê pipeline/regua_takes.json e monta pipeline/regua_takes.jpg: exemplos BONS (anúncios vencedores do nicho + takes aprovados
// pelo dono) e RUINS (reprovados/descartados), cada um com nota e porquê. O juiz recebe essa folha em toda chamada.
// uso: node regua_takes.js            → monta a régua
//      node regua_takes.js --validar  → monta a folha de validação (exemplos 'validacao', ordem embaralhada) e roda o juiz às cegas
const fs=require('fs'),path=require('path'),{spawnSync}=require('child_process');
const {DADOS,ffEsc}=require('./paths');const FF=require('ffmpeg-static');
const JSONF=path.join(__dirname,'regua_takes.json'),JPG=path.join(__dirname,'regua_takes.jpg');
const FONTE=ffEsc(path.join(__dirname,'SpaceMono-Bold.ttf').split(path.sep).join('/'));
const TMP=path.join(DADOS,'_cacador_tmp','regua');
const run=a=>spawnSync(FF,a,{encoding:'utf8',windowsHide:true,maxBuffer:1<<26});
const CROP={quadrado:"crop='ih*0.72':'ih*0.72':(iw-ow)/2:(ih-oh)*0.6",centro:"crop=iw:iw:0:(ih-iw)/2",proprio:'crop=980:980:1220:330'};
const caminho=a=>/^(moveset|referencias)\//.test(a)?path.join(DADOS,a):path.join(__dirname,a);

function quadro(e,t,out,lado){const r=run(['-v','error','-y','-ss',Math.max(0,t).toFixed(2),'-i',caminho(e.arquivo),'-frames:v','1','-vf',`${CROP[e.recorte]||CROP.quadrado},scale=${lado}:${lado}`,'-q:v','3',out]);return fs.existsSync(out);}
// um bloco: quadro 300x300 + legenda (id, BOM/RUIM, nota, porquê)
function bloco(e,i){const img=path.join(TMP,`r${i}.jpg`),txt=path.join(TMP,`r${i}.txt`),out=path.join(TMP,`b${i}.jpg`);
 if(!quadro(e,e.t,img,300))throw new Error('sem quadro: '+e.id+' '+e.arquivo);
 const pq=String(e.porque||'').replace(/['"]/g,'');const linhas=[];let l='';for(const w of pq.split(' ')){if((l+' '+w).trim().length>27){linhas.push(l.trim());l=w;}else l+=' '+w;}if(l.trim())linhas.push(l.trim());
 fs.writeFileSync(txt,linhas.slice(0,4).join('\n'));
 const cor=e.tipo==='bom'?'0x7CFC00':'0xFF5050',titulo=`${e.id} ${e.tipo==='bom'?'BOM':'RUIM'} nota ${e.nota}`;
 run(['-v','error','-y','-i',img,'-vf',`pad=300:420:0:0:black,drawtext=fontfile='${FONTE}':text='${titulo}':x=6:y=304:fontsize=20:fontcolor=${cor},drawtext=fontfile='${FONTE}':textfile='${ffEsc(txt.split(path.sep).join('/'))}':x=6:y=330:fontsize=14:fontcolor=white:line_spacing=4`,'-q:v','3',out]);
 return out;}
function grade(arquivos,out,porLinha=5){const k=arquivos.length,lay=arquivos.map((_,i)=>`${(i%porLinha)*300}_${Math.floor(i/porLinha)*420}`).join('|');
 run(['-v','error','-y',...arquivos.flatMap(f=>['-i',f]),'-filter_complex',`xstack=inputs=${k}:layout=${lay}:fill=black`,'-q:v','3',out]);return out;}

function montar(){fs.mkdirSync(TMP,{recursive:true});const ex=JSON.parse(fs.readFileSync(JSONF,'utf8')).exemplos.filter(e=>e.uso==='regua');
 const bons=ex.filter(e=>e.tipo==='bom'),ruins=ex.filter(e=>e.tipo==='ruim');
 const fs1=[...bons,...ruins].map((e,i)=>bloco(e,i));grade(fs1,JPG);fs.rmSync(TMP,{recursive:true,force:true});
 console.log(`régua: ${bons.length} bons + ${ruins.length} ruins → ${JPG}`);return JPG;}

// texto da régua para o prompt (o juiz também lê a imagem)
function textoRegua(){const ex=JSON.parse(fs.readFileSync(JSONF,'utf8')).exemplos.filter(e=>e.uso==='regua');
 return ex.map(e=>`${e.id} (${e.tipo==='bom'?'BOM':'RUIM'}, nota ${e.nota}): ${e.porque}`).join('\n');}

module.exports={montar,textoRegua,JPG,JSONF,quadro,CROP,caminho};

if(require.main===module){
 if(!process.argv.includes('--validar')){montar();process.exit(0);}
 // validação às cegas: exemplos 'validacao' embaralhados, 5 quadros por linha (t-0,4..t+0,4), juiz com a régua
 process.argv.push('--alvo','validacao');
 const {folhaValidacao,julgarBruto}=require('./cacador.js');
 const ex=JSON.parse(fs.readFileSync(JSONF,'utf8')).exemplos.filter(e=>e.uso==='validacao');
 const ord=ex.map(e=>({e,r:Math.random()})).sort((a,b)=>a.r-b.r).map(x=>x.e);
 fs.mkdirSync(TMP,{recursive:true});if(!fs.existsSync(JPG))montar();fs.mkdirSync(TMP,{recursive:true});
 const folha=folhaValidacao(ord,path.join(TMP,'validacao.jpg'));
 fs.copyFileSync(folha.f,path.join(__dirname,'regua_validacao.jpg'));
 const j=julgarBruto(folha);
 const linhas=ord.map((e,i)=>{const p=j.picos.find(x=>x.n===i+1)||{};const ok=e.tipo==='bom'?p.nota>=7:p.nota<=4;return {id:e.id,tipo:e.tipo,nota:p.nota,sem_hud:p.sem_hud_texto,grande:p.avatar_grande,ok,arma:p.arma,arquivo:e.arquivo};});
 for(const l of linhas)console.log(`${l.ok?'OK ':'ERR'} ${l.id.padEnd(4)} ${l.tipo.padEnd(5)} nota ${l.nota} (grande ${l.grande}, sem HUD ${l.sem_hud}) — ${l.arma}`);
 const acertos=linhas.filter(l=>l.ok).length;console.log(`acertos: ${acertos}/${linhas.length}  custo US$ ${(j.custo||0).toFixed(3)}`);
 fs.writeFileSync(path.join(__dirname,'regua_validacao.json'),JSON.stringify({data:new Date().toISOString(),acertos,total:linhas.length,linhas},null,1));
 fs.rmSync(TMP,{recursive:true,force:true});
}
