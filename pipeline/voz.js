// Voz em off (ElevenLabs) para os criativos sem UGC: roteiro (txt) -> voz.mp3 + palavras.json
// palavras.json sai no MESMO formato do Whisper ({chunks:[{text,timestamp:[ini,fim]}]}, uma entrada por palavra),
// montado a partir do alinhamento por caractere do endpoint /with-timestamps.
// Roteiro: texto normal; [mostra|fala] = a legenda mostra "mostra" e a voz fala "fala". Ex.: [17,90|dezessete e noventa]
// Linhas começando com # são comentário.
// uso: node voz.js <roteiro.txt> <pasta_saida> [--voz liam|nassif|<voice_id>] [--forcar]   (não regenera se o texto não mudou)
//      node voz.js --status                                 (caracteres usados no mês)
// Chave: ELEVENLABS_API_KEY no .env da raiz (nunca imprimir). Gasto registrado em pipeline/voz_gasto.json.
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const {ROOT}=require('./paths');
// vozes: a Nassif (escolha do dono) só funciona pela API em plano pago; até lá, Liam (premade, a mais natural em pt-BR no teste)
const VOZES={nassif:'Fjiik8aKXNDjmxd1Q2jF',liam:'TX3LPaxmHKxFdv7VOQHJ',charlie:'IKne3meq5aSn9XLyUdCD',adam:'pNInz6obpgDQGcFmaJgB'};
const VOZ_ARG=(()=>{const i=process.argv.indexOf('--voz');return i>=0?process.argv[i+1]:null})()||process.env.VOZ_ID||'liam';
const VOICE=VOZES[VOZ_ARG]||VOZ_ARG;
const MODELO=process.env.VOZ_MODELO||'eleven_v4';
const GASTO=path.join(__dirname,'voz_gasto.json');
const A=process.argv.slice(2);const flag=k=>A.includes(k);const POS=A.filter((a,i)=>!a.startsWith('--')&&A[i-1]!=='--voz');

function chave(){const env=fs.readFileSync(path.join(ROOT,'.env'),'utf8');const m=env.match(/^\s*ELEVENLABS_API_KEY\s*=\s*"?([^"\r\n]+)"?/m);
 if(!m)throw new Error('ELEVENLABS_API_KEY não está no .env');return m[1].trim();}
async function api(rota,opts={}){const r=await fetch('https://api.elevenlabs.io'+rota,{...opts,headers:{'xi-api-key':chave(),'Content-Type':'application/json',...(opts.headers||{})}});
 const txt=await r.text();if(!r.ok)throw new Error(`ElevenLabs ${r.status}: ${txt.slice(0,400)}`);return JSON.parse(txt);}
async function uso(){const s=await api('/v1/user/subscription');return {usados:s.character_count,limite:s.character_limit,renova:s.next_character_count_reset_unix?new Date(s.next_character_count_reset_unix*1000).toISOString().slice(0,10):null};}

// roteiro -> texto falado + tokens de legenda com a faixa de caracteres que cada um ocupa no texto falado
function parse(txt){const linhas=txt.split(/\r?\n/).filter(l=>!/^\s*#/.test(l)).map(l=>l.trim()).filter(Boolean);
 const src=linhas.join(' ');let fala='';const tokens=[];
 const re=/\[([^\]|]+)\|([^\]]+)\]|(\S+)|(\s+)/g;let m;
 while((m=re.exec(src))){
  if(m[4]){if(!fala.endsWith(' '))fala+=' ';continue;}
  if(m[1]){const a=fala.length;fala+=m[2].trim();tokens.push({text:m[1].trim(),a,b:fala.length});}
  else{const a=fala.length;fala+=m[3];tokens.push({text:m[3],a,b:fala.length});}}
 // "[17,90|...]," — pontuação logo depois do colchete gruda na palavra anterior
 const out=[];for(const t of tokens){if(/^[.,!?;:…]+$/.test(t.text)&&out.length){out[out.length-1].text+=t.text;out[out.length-1].b=t.b;}else out.push(t);}
 return {fala:fala.trim(),tokens:out};}

function palavras(tokens,al){const S=al.character_start_times_seconds,E=al.character_end_times_seconds,C=al.characters;
 return tokens.map(t=>{let a=t.a,b=t.b-1;while(a<b&&/[\s"“”'(]/.test(C[a]))a++;while(b>a&&/[\s.,!?;:…"”')]/.test(C[b]))b--;
  return {text:' '+t.text,timestamp:[+S[a].toFixed(3),+E[b].toFixed(3)]};});}

async function main(){
 if(flag('--status')){const u=await uso();console.log(`ElevenLabs: ${u.usados}/${u.limite} caracteres usados no mês (renova ${u.renova})`);return;}
 const [ROT,OUT]=POS;if(!ROT||!OUT){console.error('uso: node voz.js <roteiro.txt> <pasta_saida> [--voz liam|nassif|<id>] [--forcar] | node voz.js --status');process.exit(1);}
 const {fala,tokens}=parse(fs.readFileSync(ROT,'utf8'));fs.mkdirSync(OUT,{recursive:true});
 const hash=crypto.createHash('sha1').update(MODELO+VOICE+fala).digest('hex').slice(0,12);
 const META=path.join(OUT,'voz_meta.json');
 if(fs.existsSync(META)&&JSON.parse(fs.readFileSync(META,'utf8')).hash===hash&&!flag('--forcar')){console.log('voz já gerada para este texto (use --forcar para gastar de novo):',OUT);return;}
 const antes=await uso();
 console.log(`gerando voz: ${fala.length} caracteres (mês: ${antes.usados}/${antes.limite})`);
 if(antes.usados+fala.length>antes.limite)throw new Error('sem saldo de caracteres no mês');
 const r=await api(`/v1/text-to-speech/${VOICE}/with-timestamps?output_format=mp3_44100_128`,{method:'POST',body:JSON.stringify({text:fala,model_id:MODELO})});
 const al=r.alignment;if(!al||al.characters.join('')!==fala)console.warn('  aviso: alinhamento não bate 1:1 com o texto — conferir palavras.json');
 fs.writeFileSync(path.join(OUT,'voz.mp3'),Buffer.from(r.audio_base64,'base64'));
 const chunks=palavras(tokens,al);
 fs.writeFileSync(path.join(OUT,'palavras.json'),JSON.stringify({text:chunks.map(c=>c.text).join(''),chunks},null,1));
 fs.writeFileSync(path.join(OUT,'alinhamento.json'),JSON.stringify(al));
 const depois=await uso().catch(()=>null);
 fs.writeFileSync(META,JSON.stringify({hash,modelo:MODELO,voz:VOICE,fala,caracteres:fala.length,criadoEm:new Date().toISOString()},null,1));
 const G=fs.existsSync(GASTO)?JSON.parse(fs.readFileSync(GASTO,'utf8')):[];
 G.push({data:new Date().toISOString(),roteiro:path.relative(ROOT,path.resolve(ROT)).split(path.sep).join('/'),caracteres:fala.length,voz:VOZ_ARG,mes:depois?`${depois.usados}/${depois.limite}`:null});
 fs.writeFileSync(GASTO,JSON.stringify(G,null,1));
 const last=chunks[chunks.length-1];
 console.log(`ok: ${OUT}/voz.mp3 (${last.timestamp[1].toFixed(1)}s, ${chunks.length} palavras) — mês: ${depois?depois.usados:'?'}/${antes.limite}`);
}
if(require.main===module)main().catch(e=>{console.error(e.message);process.exit(1);});
module.exports={parse,palavras};
