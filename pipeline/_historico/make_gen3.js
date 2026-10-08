// monta gen3.js a partir do gen2.js + trechos de memes
const fs=require('fs');
let s=fs.readFileSync(__dirname+'/gen2.js','utf8');
const rep=(a,b)=>{if(!s.includes(a))throw new Error('nao achei: '+a.slice(0,80));s=s.split(a).join(b);};
const i0=s.indexOf('// ---------- receitas do lote 2 ----------'),i1=s.indexOf('];',i0)+2;
s=s.slice(0,i0)+fs.readFileSync(__dirname+'/gen3_receitas.txt','utf8')+s.slice(i1);
rep(' vis.sort((a,b)=>a.oS-b.oS);\n const ENTRIES',fs.readFileSync(__dirname+'/gen3_memes.txt','utf8')+' vis.sort((a,b)=>a.oS-b.oS);\n const ENTRIES');
rep("for(const v of vis)if(v.k==='box'){v.pose","for(const v of vis)if(v.k==='box'||v.k==='meme'){v.pose");
rep('  else{const gss=0.9+s.off;',fs.readFileSync(__dirname+'/gen3_render.txt','utf8')+'  else{const gss=0.9+s.off;');
rep("const inBox=o=>shots.some(s=>s.k==='box'&&","const inBox=o=>shots.some(s=>(s.k==='box'||s.k==='meme')&&");
rep("if(!sh||sh.k==='box')continue;","if(!sh||sh.k==='box'||sh.k==='meme')continue;");
rep("const add=(f,at,cat)=>{if(!f)return;const pk=PEAKS[f];",
    "const add=(f,at,cat,start)=>{if(!f)return;const pk=PEAKS[f]||peakOf(f);if(start){ev.push({f,t:at,gain:+Math.min(2.5,LEVEL[cat]/pk.rms).toFixed(3),len:Math.min(pk.dur,start)});return;}");
rep("reac.forEach(r=>add(r.snd,r.o+0.12,'meme'));",
    "reac.forEach(r=>add(r.snd,r.o+0.12,'meme'));\n shots.filter(s=>s.k==='meme'&&s.first).forEach(s=>{const all=shots.filter(x=>x.k==='meme'&&x.meme===s.meme);add(CATALOG.pasta+'/'+s.audio,s.oS,'memepack',all[all.length-1].oE-s.oS+0.25);});");
rep("ev.forEach(e=>ins.push('-i',`${SFX}/${e.f}`));","ev.forEach(e=>ins.push('-i',e.f.includes(':')?e.f:`${SFX}/${e.f}`));");
rep("const LEVEL={mo:0.13,","const LEVEL={memepack:0.16,mo:0.13,");
rep("lote:2,duracao","lote:3,memes:shots.filter(s=>s.k==='meme'&&s.first).map(s=>s.meme.id),duracao");
rep("'_receitas_lote2.json'),JSON.stringify(V.map(R=>({...R,lote:2,","'_receitas_lote3.json'),JSON.stringify(V.map(R=>({...R,lote:3,");
rep("'_resumo_lote2_'","'_resumo_lote3_'");
rep("const DENS={leve:1,media:2,muita:3};","const DENS={nenhuma:0,leve:1,media:2,muita:3};");
rep("// Lote 2 de variações","// Lote 3 de variações (lote 2 + memes do pack em quadrado 3D)\n// Lote 2 de variações");
fs.writeFileSync(__dirname+'/gen3.js',s);console.log('gen3.js ok');
