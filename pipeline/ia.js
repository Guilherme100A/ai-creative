// IA da esteira via Claude Code CLI (claude -p) — usa o login/plano do Claude Code, sem chave de API.
// Uma chamada = uma resposta JSON validada pelo schema (--json-schema).
const {spawnSync}=require('child_process');const fs=require('fs');const path=require('path');

function claudeBin(){
 if(process.env.CLAUDE_BIN)return process.env.CLAUDE_BIN;
 if(process.platform==='win32'){
  // o "claude" do npm no Windows é um atalho .cmd; o Node precisa do .exe de verdade
  const dirs=[process.env.APPDATA&&path.join(process.env.APPDATA,'npm'),...(process.env.PATH||'').split(';')].filter(Boolean);
  for(const d of dirs){for(const c of [path.join(d,'node_modules','@anthropic-ai','claude-code','bin','claude.exe'),path.join(d,'claude.exe')])if(fs.existsSync(c))return c;}
 }
 return 'claude';
}

// prompt: texto; schema: JSON Schema da resposta; ler: arquivos (ex. imagens) que a IA pode abrir com Read
function perguntar({prompt,schema,ler=[],modelo,esforco,timeoutMs=15*60*1000}){
 const dirs=[...new Set(ler.map(f=>path.dirname(path.resolve(f))))];
 const args=['-p','--output-format','json','--json-schema',JSON.stringify(schema),'--strict-mcp-config','--max-turns',ler.length?'12':'4',
  '--tools',ler.length?'Read':'',...(ler.length?['--allowedTools','Read']:[]),...dirs.flatMap(d=>['--add-dir',d])];
 if(modelo)args.push('--model',modelo);
 if(esforco)args.push('--effort',esforco);
 const r=spawnSync(claudeBin(),args,{input:prompt,encoding:'utf8',timeout:timeoutMs,maxBuffer:64<<20,windowsHide:true});
 if(r.error)throw new Error(`não consegui rodar o Claude Code CLI (${r.error.code||r.error.message}). Ele está instalado e logado? Teste: claude -p "oi"`);
 let j;try{j=JSON.parse(r.stdout);}catch{throw new Error('resposta inesperada do claude: '+(r.stdout||r.stderr||'').slice(0,400));}
 if(j.is_error)throw new Error('claude: '+(j.result||'erro'));
 if(j.structured_output==null)throw new Error('claude não devolveu JSON estruturado: '+String(j.result).slice(0,300));
 return {dados:j.structured_output,custo:j.total_cost_usd,modelo:Object.keys(j.modelUsage||{})[0]};
}

module.exports={perguntar,claudeBin};
