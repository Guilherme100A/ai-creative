// monta gen4.js (lote 4) a partir do gen3.js aplicando o feedback de todos os lotes
const fs=require('fs');
let s=fs.readFileSync(__dirname+'/gen3.js','utf8');
const rep=(a,b)=>{if(!s.includes(a))throw new Error('nao achei: '+a.slice(0,80));s=s.split(a).join(b);};
const block=(start,end,b)=>{const i0=s.indexOf(start);if(i0<0)throw new Error('bloco: '+start);const i1=s.indexOf(end,i0)+end.length;s=s.slice(0,i0)+b+s.slice(i1);};

// emojis: só os que funcionaram, centralizados acima da legenda, som de clique (sem trombeta/raio/estrela/gato)
block('const CUES=[','];',`const YT='C:/Users/rhian/Downloads/criativo/assets/sfx/youtube/';
const CUES=[
 [4.14,'1f914','pop',YT+'ui/pack_click.mp3',2],   // dúvida
 [6.75,'1f97a','shake',YT+'ui/pack_click.mp3',1], // "vou receber mesmo?"
 [24.8,'1f634','float',YT+'ui/pack_click.mp3',1], // esperando a pessoa
 [27.9,'1f62d','shake',YT+'ui/pack_click.mp3',2], // responder rápido
 [32.1,'1f91d','pop',YT+'ui/pack_click.mp3',2],   // confiança
 [37.4,'1f440','pop',YT+'ui/pack_click.mp3',1],   // interessante
 [48.9,'1f928','pop',YT+'ui/pack_click.mp3',1],   // acreditar
 [56.15,'2705','pop',YT+'ui/pack_click.mp3',2],   // decidir
 [59.05,'1f447','pop',YT+'ui/pack_click.mp3',2],  // saiba mais
];`);
// sons: pacotes do YouTube, poucos e baixos
block('const PACKS={','};',`const PACKS={
 y1:{mo:null,box:null,pop:YT+'ui/pack_click.mp3',coin:YT+'dinheiro/caixa_registradora.mp3',boom:null},
 y2:{mo:YT+'ui/pack_click.mp3',box:null,pop:YT+'ui/click.mp3',coin:YT+'dinheiro/pack_moeda_mario.mp3',boom:YT+'impacto/vine_boom.mp3'},
 y3:{mo:null,box:null,pop:YT+'ui/pack_iphone.mp3',coin:YT+'dinheiro/caixa_registradora.mp3',boom:YT+'impacto/vine_boom.mp3'},
};`);
block('const PACK_NAMES={','};',`const PACK_NAMES={y1:'YouTube: cliques + caixa registradora',y2:'YouTube: cliques + moeda Mario + vine boom',y3:'YouTube: iPhone + caixa registradora + vine boom'};`);
block('const LEVEL={','};','const LEVEL={memepack:0.12,mo:0.10,box:0.15,pop:0.09,coin:0.13,meme:0.09,boom:0.15};');
// só um som de compra (no card final) + vine boom quando a gameplay dos itens entra
rep("if(s.clip==='brand_cta')add(P.coin,s.oS+0.35,'coin');if(s.clip==='site_cta')add(P.coin,s.oS+1.2,'coin');});",
    "if(s.clip==='brand_cta')add(P.coin,s.oS+0.35,'coin');});\n {const g=shots.find(x=>x.k==='box'&&x.first&&x.oS>DUR*0.4);if(P.boom&&g)add(P.boom,g.oS,'boom');}");
// emoji centralizado acima da legenda
rep("const sc=style==='dance'?0.95:0.78;","const sc=0.62;");
{const a=s.indexOf("  let x,y;if(sh.k==='mo')"),b=s.indexOf('\n',s.indexOf("if(style==='dance')",a));s=s.slice(0,a)+"  const x=Math.round(540-240*sc),y=1130;"+s.slice(b);}
// som do meme opcional, curto
rep("add(CATALOG.pasta+'/'+s.audio,s.oS,'memepack',all[all.length-1].oE-s.oS+0.25)",
    "if(R.memeSom!==false)add(s.audio.includes(':')?s.audio:CATALOG.pasta+'/'+s.audio,s.oS,'memepack',Math.min(1.6,all[all.length-1].oE-s.oS+0.1))");
// meme encaixa mesmo se o fim cair num corte (pega o ponto mais próximo)
rep("const a=s2o(ms),b=s2o(me);","const near=(x,dir)=>{let v=s2o(x);if(v!=null)return v;for(const p of pieces){if(dir<0&&p.s<=x&&x>p.e)v=p.oe;if(dir>0&&p.s>x&&v==null)v=p.o;}return v;};const a=near(ms,1),b=near(me,-1);");
// memes: "confiança" vira sucesso (o estiloso ficou aleatório)
rep("[31.9,33.0,'estilo',2],     // \"passar mais confiança\"","[31.9,33.0,'sucesso',2],    // \"passar mais confiança\"");
// menos takes de gameplay: quadrados mais longos
rep("const L=R.boxLen||1.2;","const L=R.boxLen||1.8;");
// receitas do lote 4
block('// ---------- receitas do lote 3 ----------','];',`// ---------- receitas do lote 4 (feedback dos lotes 1, 2 e 3) ----------
const V=[
 {id:'v31',order:'ACDEFGHIJK',gap:0.28,dirs:STD,zoom:[1.12,1],pack:'y1',seed:31,hl:[YEL],reac:'nenhuma',memes:'medios',memeSom:true,grade:'quente',cap:'contorno'},
 {id:'v32',order:'ACDEFGHIJK',gap:0.28,dirs:['hookSite',...STD],zoom:[1.08,1,1.2],pack:'y3',seed:32,hl:[YEL],reac:'nenhuma',memes:'muitos',memeSom:true,grade:'vivo',cap:'contorno'},
 {id:'v33',order:'ACDEFGHIJK',gap:0.28,dirs:['hookSite',...STD],zoom:[1.12,1],pack:'y1',seed:33,hl:[YEL],reac:'leve',memes:'medios',memeSom:true,grade:'quente',cap:'contorno',boxLen:2.0},
 {id:'v34',order:'ACDEFGHJK',gap:0.28,dirs:STD,zoom:[1.1,1],pack:'y2',seed:34,hl:[YEL],reac:'nenhuma',memes:'muitos',memeSom:false,grade:'vivo',cap:'contorno'},
 {id:'v35',order:'ACDEFGHIJK',gap:0.28,dirs:['hookSite',...STD],zoom:[1,1.12],pack:'y3',seed:35,hl:[YEL,LIME],reac:'nenhuma',memes:'muitos',memeSom:true,grade:'quente',cap:'contorno'},
 {id:'v36',order:'ACDEFGHIJK',gap:0.2,dirs:STD,zoom:[1.12,1],pack:'y1',seed:36,hl:[YEL],reac:'nenhuma',memes:'medios',memeSom:true,grade:'vivo',cap:'contorno',boxLen:1.5},
 {id:'v37',order:'ACDEFGHIJK',gap:0.28,dirs:['hookSite',...STD],zoom:[1.08,1,1.2],pack:'y2',seed:37,hl:[YEL],reac:'leve',memes:'muitos',memeSom:false,grade:'vivo',cap:'contorno'},
 {id:'v38',order:'ACDEFGHJK',gap:0.28,dirs:STD,zoom:[1.12,1],pack:'y3',seed:38,hl:[YEL],reac:'nenhuma',memes:'medios',memeSom:true,grade:'quente',cap:'faixa'},
 {id:'v39',order:'ACDEFGHIJK',gap:0.28,dirs:['hookSite',...STD],zoom:[1,1.15],pack:'y2',seed:39,hl:[YEL],reac:'nenhuma',memes:'muitos',memeSom:true,grade:'vivo',cap:'contorno'},
 {id:'v40',order:'ACDEFGHIJK',gap:0.28,dirs:STD,zoom:[1.12,1],pack:'y1',seed:40,hl:[YEL,LIME],reac:'nenhuma',memes:'poucos',memeSom:true,grade:'quente',cap:'contorno'},
];`);
rep('lote:3,','lote:4,');
rep("'_receitas_lote3.json')","'_receitas_lote4.json')");
rep("'_resumo_lote3_'","'_resumo_lote4_'");
rep('// Lote 3 de variações','// Lote 4 de variações — feedback de todos os lotes (memes curados, sons do YouTube, sem emoji nos cantos)\n// Lote 3 de variações');
fs.writeFileSync(__dirname+'/gen4.js',s);console.log('gen4.js ok');
