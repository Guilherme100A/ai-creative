// Prova que dois geradores renderizam igual, sem precisar renderizar (nem do vídeo base):
// roda cada um em modo simulado, captura todo comando ffmpeg/node e todo arquivo escrito, e compara.
// uso: node tests/equivalencia.js "gen7.js" "motor.js base2 7" [ids]
const path=require('path'),fs=require('fs'),{spawnSync}=require('child_process');
const PIPE=path.resolve(__dirname,'..');

if(process.argv[2]==='--captura'){ // processo filho: instrumenta e roda o gerador
 const [,,,out,script,...rest]=process.argv;
 const cp=require('child_process');const real=cp.execFileSync,realW=fs.writeFileSync;const log=[];
 cp.execFileSync=(cmd,args,opts)=>{const b=path.basename(String(cmd)).toLowerCase().replace('.exe','');
  // leituras (pico dos sons, duração) rodam de verdade; o resto só é registrado
  if(b.startsWith('ffprobe')||(b.startsWith('ffmpeg')&&args[args.length-1]==='-'))return real(cmd,args,opts);
  log.push({cmd:b,args});return Buffer.alloc(0);};
 fs.writeFileSync=(p,c,...r)=>{const s=String(p);
  if(/[\\/]render[\\/]variacoes[\\/]/.test(s)){log.push({grava:path.basename(s),conteudo:String(c)});return;} // não mexe nos arquivos reais
  if(/[\\/]vt[\\/]/.test(s))log.push({grava:path.relative(PIPE,s),conteudo:String(c)});
  return realW(p,c,...r);};
 process.argv=[process.argv[0],path.join(PIPE,script),...rest];
 process.on('exit',()=>realW(out,JSON.stringify(log)));
 require(path.join(PIPE,script));
 return;
}

const [A,B,ids='all']=process.argv.slice(2);
const cap=(cmdline,tag)=>{const [script,...rest0]=cmdline.split(' ');
 // o motor barra receitas antigas que quebram leis novas (ex.: legenda "faixa"); aqui só importa comparar o render
 const rest=script==='motor.js'?[...rest0,'--forcar']:rest0;const out=path.join(require('os').tmpdir(),`equiv_${tag}.json`);
 const r=spawnSync(process.execPath,[__filename,'--captura',out,script,...rest,ids],{cwd:PIPE,stdio:['ignore','ignore','inherit']});
 if(r.status!==0)throw new Error(cmdline+' falhou');return JSON.parse(fs.readFileSync(out,'utf8'));};
const a=cap(A,'a'),b=cap(B,'b');
// o resumo ganhou o campo "projeto" no motor; o resto tem que ser idêntico
const norm=x=>x.grava&&/^_resumo_/.test(x.grava)?{...x,conteudo:JSON.stringify(JSON.parse(x.conteudo).map(({projeto,...r})=>r))}:x;
const ka=a.map(norm).map(x=>JSON.stringify(x)),kb=b.map(norm).map(x=>JSON.stringify(x));
let dif=0;for(let i=0;i<Math.max(ka.length,kb.length);i++)if(ka[i]!==kb[i]){if(dif<3)console.log(`diferença no passo ${i}:\n A: ${(ka[i]||'(nada)').slice(0,400)}\n B: ${(kb[i]||'(nada)').slice(0,400)}`);dif++;}
const n=k=>a.filter(x=>x.cmd===k).length;
console.log(`${A}  vs  ${B}  [${ids}]`);
console.log(`passos: ${ka.length} vs ${kb.length} (ffmpeg: ${n('ffmpeg')}, quadros 3D: ${n('node')}, arquivos: ${a.filter(x=>x.grava).length})`);
console.log(dif?`DIFERENTE: ${dif} passos`:'IDÊNTICO: mesmos comandos de render, mesmas legendas, mesmos arquivos');
process.exit(dif?1:0);
