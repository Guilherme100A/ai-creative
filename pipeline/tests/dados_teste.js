// Monta um DADOS de teste com o estoque ORIGINAL do moveset, para a equivalência continuar verificável depois de limpezas:
// tudo o que está em moveset/ + o que foi para moveset/_descartados/ volta para a pasta de origem (arquivos vazios — o teste não lê os clipes);
// listas (_aprovados, _tags, _picos…) são copiadas; as outras pastas de DADOS (Pack de Memes etc.) entram por junção.
// uso: node tests/dados_teste.js  (imprime a pasta)  ·  require('./dados_teste').monta() → caminho
const fs=require('fs'),path=require('path'),os=require('os');
const {DADOS}=require('../paths');

// o estoque real está incompleto quando há clipes em moveset/_descartados
function incompleto(dados=DADOS){const d=path.join(dados,'moveset','_descartados');if(!fs.existsSync(d))return false;
 const tem=p=>fs.readdirSync(p).some(f=>{const q=path.join(p,f);return fs.statSync(q).isDirectory()?tem(q):f.endsWith('.mp4')});return tem(d);}

function monta(dados=DADOS,out=path.join(os.tmpdir(),'criativo_dados_teste')){
 fs.rmSync(out,{recursive:true,force:true});fs.mkdirSync(path.join(out,'moveset'),{recursive:true});
 const MV=path.join(dados,'moveset');
 const walk=(p,cb)=>{for(const f of fs.readdirSync(path.join(MV,p))){const q=p?p+'/'+f:f;if(fs.statSync(path.join(MV,q)).isDirectory())walk(q,cb);else cb(q);}};
 walk('',q=>{const desc=q.startsWith('_descartados/');const dst=desc?q.slice('_descartados/'.length):q;const t=path.join(out,'moveset',dst);
  fs.mkdirSync(path.dirname(t),{recursive:true});if(!desc&&/\.(json|txt|md)$/.test(q))fs.copyFileSync(path.join(MV,q),t);else if(!fs.existsSync(t))fs.writeFileSync(t,'');});
 for(const f of fs.readdirSync(dados)){if(f==='moveset'||f.startsWith('.'))continue;const src=path.join(dados,f);
  try{if(fs.statSync(src).isDirectory()&&path.resolve(src)!==path.resolve(__dirname,'..','..'))fs.symlinkSync(src,path.join(out,f),'junction');}catch(e){}}
 return out.split(path.sep).join('/');}

module.exports={monta,incompleto};
if(require.main===module)console.log(monta());
