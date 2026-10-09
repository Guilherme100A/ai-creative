// Pega os cookies do YouTube do seu Chrome logado, sem extensão (o próprio Chrome descriptografa).
// O Chrome trava o arquivo de cookies enquanto está aberto: feche o Chrome quando o script pedir (uns 10s) e reabra depois.
// uso: node pegar_cookies.js [--perfil "Profile 3"]   → grava pipeline/youtube_cookies.txt (fora do git)
const fs=require('fs'),path=require('path'),os=require('os'),{spawn,execSync,spawnSync}=require('child_process');
const A=process.argv.slice(2);const PERFIL=A.includes('--perfil')?A[A.indexOf('--perfil')+1]:'Profile 3';
const CHROME=['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',path.join(process.env.LOCALAPPDATA||'','Google/Chrome/Application/chrome.exe')].find(f=>fs.existsSync(f));
const UD=path.join(process.env.LOCALAPPDATA,'Google','Chrome','User Data');
const OUT=path.join(__dirname,'youtube_cookies.txt');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const chromeAberto=()=>/chrome\.exe/i.test(execSync('tasklist /FI "IMAGENAME eq chrome.exe" /NH',{encoding:'utf8'}));

(async()=>{
 if(!CHROME){console.error('Chrome não encontrado');process.exit(1);}
 if(!fs.existsSync(path.join(UD,PERFIL,'Network','Cookies'))){console.error(`perfil "${PERFIL}" sem cookies em ${UD}`);process.exit(1);}
 if(chromeAberto()){console.log('>>> FECHE o Chrome agora (todas as janelas). Esperando…');while(chromeAberto())await sleep(1000);}
 // cópia mínima do perfil: Local State (chave) + cookies do perfil como "Default"
 const T=fs.mkdtempSync(path.join(os.tmpdir(),'chrome_cookies_'));
 fs.mkdirSync(path.join(T,'Default','Network'),{recursive:true});
 fs.copyFileSync(path.join(UD,'Local State'),path.join(T,'Local State'));
 fs.copyFileSync(path.join(UD,PERFIL,'Network','Cookies'),path.join(T,'Default','Network','Cookies'));
 console.log('cópia feita — pode reabrir o Chrome.');
 const PORT=9333+Math.floor(Math.random()*500);
 const ch=spawn(CHROME,['--headless=new',`--user-data-dir=${T}`,'--profile-directory=Default',`--remote-debugging-port=${PORT}`,'--no-first-run','--no-default-browser-check','about:blank'],{stdio:'ignore'});
 let ws;try{
  let ver;for(let i=0;i<40&&!ver;i++){await sleep(250);try{ver=await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json();}catch{}}
  if(!ver)throw new Error('Chrome invisível não respondeu');
  ws=new WebSocket(ver.webSocketDebuggerUrl);await new Promise((ok,er)=>{ws.onopen=ok;ws.onerror=er;});
  const r=await new Promise(ok=>{ws.onmessage=m=>{const j=JSON.parse(m.data);if(j.id===1)ok(j);};ws.send(JSON.stringify({id:1,method:'Storage.getCookies'}));});
  const cs=(r.result&&r.result.cookies||[]).filter(c=>/(^|\.)(youtube|google)\.com$/.test(c.domain.replace(/^\./,'')));
  if(!cs.some(c=>/SID|LOGIN_INFO/.test(c.name)))console.warn('aviso: não achei cookie de login — o perfil está logado no YouTube?');
  const linhas=cs.map(c=>[c.domain.startsWith('.')?c.domain:'.'+c.domain.replace(/^www\./,''),'TRUE',c.path,c.secure?'TRUE':'FALSE',Math.floor(c.expires>0?c.expires:Date.now()/1000+86400*30),c.name,c.value].join('\t'));
  fs.writeFileSync(OUT,'# Netscape HTTP Cookie File\n'+linhas.join('\n')+'\n');
  console.log(`${cs.length} cookies salvos em ${OUT}`);
 }finally{try{ws&&ws.close();}catch{}ch.kill();await sleep(800);fs.rmSync(T,{recursive:true,force:true});}
 // teste rápido
 const t=spawnSync(path.join(__dirname,'tools','yt-dlp.exe'),['--no-check-certificates','--cookies',OUT,'--skip-download','--print','%(height)s','https://www.youtube.com/watch?v=K7YE6-2GwYI'],{encoding:'utf8',timeout:120000});
 console.log(/^\d+/m.test(t.stdout)?'TESTE OK: o YouTube liberou com os cookies.':'teste falhou: '+String(t.stderr||t.stdout).split('\n').filter(Boolean).pop());
})().catch(e=>{console.error('erro:',e.message);process.exit(1);});
