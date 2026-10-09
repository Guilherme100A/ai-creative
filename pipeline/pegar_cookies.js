// Cookies do YouTube para o caçador, sem extensão: usa um perfil de Chrome SÓ do caçador (pipeline/.chrome_cacador, fora do git).
// A criptografia nova do Chrome amarra os cookies à pasta do perfil, então copiar o seu perfil não funciona (dá 0 cookies);
// com um perfil próprio, o próprio Chrome descriptografa e entrega pela porta de depuração.
// uso:  node pegar_cookies.js --login   → abre o Chrome nesse perfil: faça login no YouTube UMA vez e feche a janela
//       node pegar_cookies.js           → (automático) abre o perfil invisível e grava pipeline/youtube_cookies.txt
const fs=require('fs'),path=require('path'),{spawn,spawnSync}=require('child_process');
const LOGIN=process.argv.includes('--login');
const CHROME=['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',path.join(process.env.LOCALAPPDATA||'','Google/Chrome/Application/chrome.exe')].find(f=>fs.existsSync(f));
const PERFIL=path.join(__dirname,'.chrome_cacador');
const OUT=path.join(__dirname,'youtube_cookies.txt');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

async function cookies(){
 const PORT=9333+Math.floor(Math.random()*500);
 const ch=spawn(CHROME,['--headless=new',`--user-data-dir=${PERFIL}`,`--remote-debugging-port=${PORT}`,'--no-first-run','--no-default-browser-check','https://www.youtube.com/'],{stdio:'ignore'});
 let ws;try{
  let ver;for(let i=0;i<60&&!ver;i++){await sleep(250);try{ver=await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json();}catch{}}
  if(!ver)throw new Error('Chrome invisível não respondeu');
  await sleep(4000); // deixa o YouTube renovar os cookies da sessão
  ws=new WebSocket(ver.webSocketDebuggerUrl);await new Promise((ok,er)=>{ws.onopen=ok;ws.onerror=er;});
  const r=await new Promise(ok=>{ws.onmessage=m=>{const j=JSON.parse(m.data);if(j.id===1)ok(j);};ws.send(JSON.stringify({id:1,method:'Storage.getCookies'}));});
  return (r.result&&r.result.cookies||[]).filter(c=>/(^|\.)(youtube|google)\.com$/.test(c.domain.replace(/^\./,'')));
 }finally{try{ws&&ws.close();}catch{}ch.kill();await sleep(800);}
}

(async()=>{
 if(!CHROME){console.error('Chrome não encontrado');process.exit(1);}
 if(LOGIN||!fs.existsSync(PERFIL)){
  fs.mkdirSync(PERFIL,{recursive:true});
  console.log('>>> Abrindo o Chrome do caçador. Faça login no YouTube (conta Google) e depois FECHE essa janela.');
  const ch=spawn(CHROME,[`--user-data-dir=${PERFIL}`,'--no-first-run','--no-default-browser-check','https://accounts.google.com/ServiceLogin?service=youtube&continue=https://www.youtube.com/'],{stdio:'ignore'});
  await new Promise(r=>ch.on('exit',r));
  // o chrome.exe inicial pode sair antes da janela; espera o perfil ficar livre
  for(let i=0;i<600&&fs.existsSync(path.join(PERFIL,'SingletonLock'));i++)await sleep(1000);
 }
 const cs=await cookies();
 if(!cs.some(c=>/^(SID|__Secure-3PSID|LOGIN_INFO)$/.test(c.name))){console.error('o perfil do caçador ainda não está logado no YouTube — rode: node pegar_cookies.js --login');process.exit(2);}
 const linhas=cs.map(c=>[c.domain.startsWith('.')?c.domain:'.'+c.domain.replace(/^www\./,''),'TRUE',c.path,c.secure?'TRUE':'FALSE',Math.floor(c.expires>0?c.expires:Date.now()/1000+86400*30),c.name,c.value].join('\t'));
 fs.writeFileSync(OUT,'# Netscape HTTP Cookie File\n'+linhas.join('\n')+'\n');
 console.log(`${cs.length} cookies salvos em ${OUT}`);
 const t=spawnSync(path.join(__dirname,'tools','yt-dlp.exe'),['--no-check-certificates','--cookies',OUT,'--skip-download','--print','%(height)s','https://www.youtube.com/watch?v=K7YE6-2GwYI'],{encoding:'utf8',timeout:120000});
 console.log(/^\d+/m.test(t.stdout)?'TESTE OK: o YouTube liberou com os cookies.':'teste falhou: '+String(t.stderr||t.stdout).split('\n').filter(Boolean).pop());
})().catch(e=>{console.error('erro:',e.message);process.exit(1);});
