// monta gen6.js (lote 6) a partir do gen5.js — feedback do lote 5
const fs=require('fs');
let s=fs.readFileSync(__dirname+'/gen5.js','utf8');
const rep=(a,b)=>{if(!s.includes(a))throw new Error('nao achei: '+a.slice(0,90));s=s.split(a).join(b);};
const block=(start,end,b)=>{const i0=s.indexOf(start);if(i0<0)throw new Error('bloco: '+start);const i1=s.indexOf(end,i0)+end.length;s=s.slice(0,i0)+b+s.slice(i1);};
// meme não passa muito da frase (máx 0,8s além da fala e 2,4s no total)
rep("b2=a+Math.min(3.0,Math.max(b-a,m.dur-0.15));","b2=a+Math.min(2.4,b-a+0.8,Math.max(b-a,m.dur-0.15));");
// clipes do YouTube: só skills limpas (sem showcase genérico)
rep("const YT_OK=/yt_0_OnhJ_uG_M_(z_[5-9]|x_[4-7]|show_[45])|yt_jxigCtDU2mg_|yt_b6Gqb4yiiF4_(z_[1-5]|x_[15]|show_1)|yt_-LTjZd-SATc_/;",
    "const YT_OK=/yt_0_OnhJ_uG_M_(z_[5-9]|x_[4-7])|yt_b6Gqb4yiiF4_(z_[1-5]|x_[15])/;");
// raça V4 só do vídeo cinematográfico; inventário só rolagem limpa e abas da conta
rep("const POOLS={race:listAll('racas v4').filter(f=>!f.includes('/geral/')),inv:[...listAll('inventario frutas miticas'),...listAll('conta e itens').filter(f=>/conta_[13]/.test(f))]};",
    "const POOLS={race:listAll('racas v4').filter(f=>f.includes('M3V5GmdqLLI')&&!f.includes('/geral/')),inv:[...listAll('inventario frutas miticas').filter(f=>f.includes('ypbBSUJsN44')),...listAll('conta e itens').filter(f=>/conta_[13]/.test(f))]};");
block('// ---------- receitas do lote 5','\n];',`// ---------- receitas do lote 6 (feedback do lote 5) ----------
const RI=["hookSite","hook","brandFb","siteFb","entrega","siteTop","gh","cdk","sg","montage1","race","inv","montageB","siteFb2","siteCta","brandCta"];
const V=[
 {id:'v51',order:'ACDEFGHIJK',gap:0.28,dirs:RI,zoom:[1,1.15],pack:'y2',seed:51,hl:[YEL],reac:'nenhuma',memes:'muitos',memeSom:0.4,grade:'vivo',cap:'sombra',raceInv:true},
 {id:'v52',order:'ACDEFGHIJK',gap:0.28,dirs:RI,zoom:[1.12,1],pack:'y1',seed:52,hl:[YEL],reac:'nenhuma',memes:'medios',memeSom:0.5,grade:'quente',cap:'sombra',raceInv:true},
 {id:'v53',order:'ACDEFGHJK',gap:0.28,dirs:RI,zoom:[1.12,1],pack:'y3',seed:53,hl:[YEL],reac:'nenhuma',memes:'medios',memeSom:0.4,grade:'quente',cap:'sombra',raceInv:true},
 {id:'v54',order:'ACDEFGHIJK',gap:0.28,dirs:RI,zoom:[1.08,1,1.2],pack:'y1',seed:54,hl:[YEL],reac:'nenhuma',memes:'muitos',memeSom:0.3,grade:'vivo',cap:'sombra',raceInv:true},
 {id:'v55',order:'ACDEFGHIJK',gap:0.28,dirs:RI,zoom:[1,1.12],pack:'y2',seed:55,hl:[YEL,LIME],reac:'nenhuma',memes:'muitos',memeSom:0.5,grade:'vivo',cap:'sombra',raceInv:true},
 {id:'v56',order:'ACDEFGHIJK',gap:0.2,dirs:RI,zoom:[1.12,1],pack:'y3',seed:56,hl:[YEL],reac:'nenhuma',memes:'medios',memeSom:0.3,grade:'quente',cap:'sombra',raceInv:true},
 {id:'v57',order:'ACDEFGHIJK',gap:0.28,dirs:RI,zoom:[1,1.15],pack:'y1',seed:57,hl:[YEL],reac:'nenhuma',memes:'muitos',memeSom:0.4,grade:'quente',cap:'faixa',raceInv:true},
 {id:'v58',order:'ACDEFGHJK',gap:0.28,dirs:RI,zoom:[1.1,1],pack:'y2',seed:58,hl:[YEL],reac:'nenhuma',memes:'medios',memeSom:0.5,grade:'vivo',cap:'sombra',raceInv:true},
 {id:'v59',order:'ACDEFGHIJK',gap:0.28,dirs:['hookSite',...STD],zoom:[1.12,1],pack:'y3',seed:59,hl:[YEL],reac:'nenhuma',memes:'muitos',memeSom:0.4,grade:'vivo',cap:'sombra',raceInv:false},
 {id:'v60',order:'ACDEFGHIJK',gap:0.28,dirs:RI,zoom:[1,1.15],pack:'y2',seed:60,hl:[YEL],reac:'nenhuma',memes:'muitos',memeSom:0.4,grade:'vivo',cap:'sombra',raceInv:true,boxLen:1.5},
];`);
rep('lote:5,','lote:6,');
rep("'_receitas_lote5.json')","'_receitas_lote6.json')");
rep("'_resumo_lote5_'","'_resumo_lote6_'");
rep('// Lote 5 de variações','// Lote 6 de variações — legenda com sombra, meme no tempo certo, só clipes limpos\n// Lote 5 de variações');
fs.writeFileSync(__dirname+'/gen6.js',s);console.log('gen6.js ok');
