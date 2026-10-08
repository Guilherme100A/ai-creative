// monta gen5.js (lote 5) a partir do gen4.js — feedback do lote 4 + estoque novo do YouTube
const fs=require('fs');
let s=fs.readFileSync(__dirname+'/gen4.js','utf8');
const rep=(a,b)=>{if(!s.includes(a))throw new Error('nao achei: '+a.slice(0,90));s=s.split(a).join(b);};
const block=(start,end,b)=>{const i0=s.indexOf(start);if(i0<0)throw new Error('bloco: '+start);const i1=s.indexOf(end,i0)+end.length;s=s.slice(0,i0)+b+s.slice(i1);};

// estoque novo: raças V4 e inventário/conta
rep("const BAD=[","const listAll=d=>{const out=[];const walk=p=>{for(const f of fs.readdirSync(path.join(MV,p))){const q=p+'/'+f;if(fs.statSync(path.join(MV,q)).isDirectory())walk(q);else if(f.endsWith('.mp4'))out.push(q);}};walk(d);return out.sort();};\nconst POOLS={race:listAll('racas v4').filter(f=>!f.includes('/geral/')),inv:[...listAll('inventario frutas miticas'),...listAll('conta e itens').filter(f=>/conta_[13]/.test(f))]};\nconst BAD=[");
// clipes do YouTube nas armas: só os limpos (sem texto do youtuber); gancho sempre com gravação própria
rep("for(const k in TAKES)TAKES[k]=TAKES[k].filter(t=>!BAD.includes(t)).sort();",
    "const YT_OK=/yt_0_OnhJ_uG_M_(z_[5-9]|x_[4-7]|show_[45])|yt_jxigCtDU2mg_|yt_b6Gqb4yiiF4_(z_[1-5]|x_[15]|show_1)|yt_-LTjZd-SATc_/;\nfor(const k in TAKES)TAKES[k]=TAKES[k].filter(t=>!BAD.includes(t)&&(!path.basename(t).startsWith('yt_')||YT_OK.test(t))).sort();");
rep("const takeFor=wpn=>{const pool=wpn==='any'?[...TAKES.godhuman,...TAKES.cdk,...TAKES['soul guitar']]:TAKES[wpn];",
    "const takeFor=wpn=>{const pool=wpn==='any'?[...TAKES.godhuman,...TAKES.cdk,...TAKES['soul guitar']].filter(t=>!path.basename(t).startsWith('yt_')):TAKES[wpn];");
rep(" montage:{s:40.5,e:46.8,v:'montage'},"," montage:{s:40.5,e:46.8,v:'montage'},\n montage1:{s:40.5,e:41.62,v:'montage'},\n race:{s:41.62,e:42.66,v:'box',pool:'race'},\n inv:{s:42.66,e:43.62,v:'box',pool:'inv'},\n montageB:{s:43.62,e:46.8,v:'montage'},");
rep("else if(d.v==='box')vis.push({k:'box',take:takeFor(d.wpn),oS,oE});",
    "else if(d.v==='box'){let take;if(d.pool){const pl=POOLS[d.pool].filter(x=>!used.has(x));take=pick(pl.length?pl:POOLS[d.pool]);used.add(take);}else take=takeFor(d.wpn);vis.push({k:'box',take,pool:d.pool,oS,oE});}");
// memes: duram até o fim (máx 3s), só alguns com som
rep("vis.push({k:'meme',cat,meme:m,audio:pick(C.audios),oS:a,oE:b});}",
    "let b2=b;if(m.tipo==='video'){b2=a+Math.min(3.0,Math.max(b-a,m.dur-0.15));const nx=vis.filter(v=>v.oS>=a).sort((x,y)=>x.oS-y.oS)[0];if(nx)b2=Math.min(b2,nx.oS-0.05);b2=Math.min(b2,DUR-0.5);if(b2<b)b2=b;}\n  vis.push({k:'meme',cat,meme:m,audio:pick(C.audios),som:rand()<(R.memeSom??0.5),oS:a,oE:b2});}");
rep("if(R.memeSom!==false)add(","if(s.som)add(");
// meme em quadrado normal (sem 3D)
{const a=s.indexOf("else if(s.k==='meme')");const b=s.indexOf("off:s.off})",a);s=s.slice(0,b)+"off:s.off,flat:true})"+s.slice(b+"off:s.off})".length);}
// gameplay: clipes do YouTube (1920x1080, sem áudio) têm recorte e início diferentes
rep("else{const gss=0.9+s.off;","else{const isYT=path.basename(s.take).startsWith('yt_');const gss=(isYT?0.15:0.9)+s.off;\n   const vf=!isYT?'crop=980:980:1220:330,scale=860:860:flags=lanczos':s.pool==='inv'?'scale=860:-2:flags=lanczos,pad=860:860:0:(oh-ih)/2:color=0x16171a':\"crop='ih*0.72':'ih*0.72':(iw-ow)/2:(ih-oh)*0.6,scale=860:860:flags=lanczos\";");
rep("'-vf','fps=30,crop=980:980:1220:330,scale=860:860:flags=lanczos,eq=saturation=1.25:contrast=1.05'","'-vf',`fps=30,${vf},eq=saturation=1.2:contrast=1.04`");
rep("const wav=path.join(TMP,`g${i}.wav`);execFileSync(","if(!isYT){const wav=path.join(TMP,`g${i}.wav`);execFileSync(");
rep("   gameAudio.push([wav,s.oS]);}\n  run(","   gameAudio.push([wav,s.oS]);}}\n  run(");
// legenda sem contorno preto: faixa ou sombra
rep("  :`Style: C,Sniglet,100,&H00FFFFFF,&H00FFFFFF,&H00000000,&H8C000000,-1,0,0,0,100,100,0,0,1,10,6,5,70,70,0,1`;",
    "  :`Style: C,Sniglet,100,&H00FFFFFF,&H00FFFFFF,&H00000000,&H96000000,-1,0,0,0,100,100,0,0,1,0,5,5,70,70,0,1`;");
// receitas do lote 5
const RI=['hookSite','hook','brandFb','siteFb','entrega','siteTop','gh','cdk','sg','montage1','race','inv','montageB','siteFb2','siteCta','brandCta'];
block('// ---------- receitas do lote 4','];',`// ---------- receitas do lote 5 (feedback do lote 4 + raças V4 e inventário) ----------
const RI=${JSON.stringify(RI)};
const V=[
 {id:'v41',order:'ACDEFGHIJK',gap:0.28,dirs:RI,zoom:[1.12,1],pack:'y1',seed:41,hl:[YEL],reac:'nenhuma',memes:'medios',memeSom:0.5,grade:'quente',cap:'faixa',raceInv:true},
 {id:'v42',order:'ACDEFGHIJK',gap:0.28,dirs:RI,zoom:[1,1.15],pack:'y2',seed:42,hl:[YEL],reac:'nenhuma',memes:'muitos',memeSom:0.4,grade:'vivo',cap:'sombra',raceInv:true},
 {id:'v43',order:'ACDEFGHJK',gap:0.28,dirs:RI,zoom:[1.12,1],pack:'y3',seed:43,hl:[YEL],reac:'nenhuma',memes:'medios',memeSom:0.5,grade:'quente',cap:'faixa',raceInv:true},
 {id:'v44',order:'ACDEFGHIJK',gap:0.28,dirs:RI,zoom:[1.08,1,1.2],pack:'y1',seed:44,hl:[YEL],reac:'nenhuma',memes:'muitos',memeSom:0.3,grade:'vivo',cap:'sombra',raceInv:true},
 {id:'v45',order:'ACDEFGHIJK',gap:0.28,dirs:RI.filter(d=>d!=='hookSite'),zoom:[1.12,1],pack:'y3',seed:45,hl:[YEL],reac:'nenhuma',memes:'medios',memeSom:0.5,grade:'quente',cap:'faixa',raceInv:true},
 {id:'v46',order:'ACDEFGHIJK',gap:0.28,dirs:RI,zoom:[1,1.12],pack:'y2',seed:46,hl:[YEL,LIME],reac:'nenhuma',memes:'muitos',memeSom:0.5,grade:'vivo',cap:'faixa',raceInv:true},
 {id:'v47',order:'ACDEFGHIJK',gap:0.2,dirs:RI,zoom:[1.12,1],pack:'y1',seed:47,hl:[YEL],reac:'nenhuma',memes:'medios',memeSom:0.3,grade:'quente',cap:'sombra',raceInv:true},
 {id:'v48',order:'ACDEFGHIJK',gap:0.28,dirs:['hookSite',...STD],zoom:[1,1.15],pack:'y3',seed:48,hl:[YEL],reac:'nenhuma',memes:'muitos',memeSom:0.5,grade:'vivo',cap:'faixa',raceInv:false},
 {id:'v49',order:'ACDEFGHJK',gap:0.28,dirs:RI,zoom:[1.1,1],pack:'y2',seed:49,hl:[YEL],reac:'nenhuma',memes:'medios',memeSom:0.4,grade:'quente',cap:'sombra',raceInv:true},
 {id:'v50',order:'ACDEFGHIJK',gap:0.28,dirs:RI,zoom:[1.12,1],pack:'y1',seed:50,hl:[YEL],reac:'nenhuma',memes:'muitos',memeSom:0.5,grade:'vivo',cap:'faixa',raceInv:true,boxLen:1.5},
];`);
rep('lote:4,','lote:5,');
rep("'_receitas_lote4.json')","'_receitas_lote5.json')");
rep("'_resumo_lote4_'","'_resumo_lote5_'");
rep('// Lote 4 de variações','// Lote 5 de variações — memes sem 3D e completos, sem emoji, legenda sem contorno, raças V4 + inventário\n// Lote 4 de variações');
fs.writeFileSync(__dirname+'/gen5.js',s);console.log('gen5.js ok');
