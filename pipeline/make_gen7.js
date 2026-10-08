// monta gen7.js (lote 7) — mesmo sistema do lote 6, para o vídeo novo (copy_9DC70B42...)
const fs=require('fs');
let s=fs.readFileSync(__dirname+'/gen6.js','utf8');
const rep=(a,b)=>{if(!s.includes(a))throw new Error('nao achei: '+a.slice(0,90));s=s.split(a).join(b);};
const lineRep=(start,b)=>{const i0=s.indexOf(start);if(i0<0)throw new Error('linha: '+start);const i1=s.indexOf('\n',i0);s=s.slice(0,i0)+b+s.slice(i1);};
const block=(start,end,b)=>{const i0=s.indexOf(start);if(i0<0)throw new Error('bloco: '+start);const i1=s.indexOf(end,i0)+end.length;s=s.slice(0,i0)+b+s.slice(i1);};

rep("const BASE=D+'/copy_7C70940D-340D-4468-8D9F-35E228D90892.mov';","const BASE=D+'/copy_9DC70B42-AAC8-4AD9-B7EA-CE126A2CD8FD.mov';");
rep("require('./base_words.json')","require('./base2_words.json')");
// correções da transcrição (sequências de palavras)
lineRep("const fix=[",`const FIX=[[[/^Base$/,/^Key$/,/^Build/],'Basic-Build'],[[/^BaseK$/,/^Build/],'Basic-Build'],[[/^base$/,/^que$/,/^bill$/,/^e$/],'Basic-Build'],
 [[/^God$/,/^of$/,/^Human/],'Godhuman'],[[/^God$/,/^Human/],'Godhuman'],[[/^Blocks$/],'Blox'],[[/^BASIC$/],'básico'],[[/^Leve$/,/^ao$/],'Level'],[[/^e$/,/^-mail/],'e-mail'],[[/^apagacar$/,/^o$/],'pagar caro'],[[/^17$/,/^,90/],'17,90']];`);
lineRep("{const W2=[];",`{const W2=[];for(let i=0;i<W.length;i++){let done=false;for(const [seq,rep] of FIX){if(seq.every((re,k)=>W[i+k]&&re.test(W[i+k].t))){const last=W[i+seq.length-1];const p=(last.t.match(/[.,?!]$/)||[''])[0];W2.push({t:rep+p,s:W[i].s,e:last.e});i+=seq.length-1;done=true;break;}}if(!done)W2.push({...W[i]});}W=W2;}`);
lineRep("const SENT={",`const SENT={A:[0.88,11.28],B:[11.82,20.84],C:[21.72,23.88],D:[24.56,30.22],E:[30.8,32.18],F:[32.9,38.16],G:[38.78,42.38],H:[43.14,50.9],I:[52.24,54.88],J:[55.36,61.6],K:[62.34,64.38],L:[64.82,70.18],M:[70.96,76.7],N:[77.6,81.42]};`);
rep("const SRC_END=62.4;","const SRC_END=82.9;const ALLS='ABCDEFGHIJKLMN';");
rep("'ABCDEFGHIJK'.indexOf(b.sent)==='ABCDEFGHIJK'.indexOf(a.sent)+1","ALLS.indexOf(b.sent)===ALLS.indexOf(a.sent)+1");
block("const DIR={","\n};",`const DIR={
 hookSite:{s:0.85,e:2.0,v:'mo',clip:'site_top2'},       // abre mostrando o produto
 gh:{s:3.3,e:3.95,v:'box',wpn:'godhuman'},              // "pegando Godhuman"
 cdk:{s:3.95,e:4.55,v:'box',wpn:'cdk'},                 // "CDK"
 brandIntro:{s:22.85,e:24.5,v:'mo',clip:'brand_intro'}, // "criamos a Basic-Build"
 siteTop:{s:30.7,e:32.85,v:'mo',clip:'site_top2'},      // "você precisa do básico pronto"
 gh2:{s:33.8,e:34.6,v:'box',wpn:'godhuman'},            // "level máximo, Godhuman"
 cdk2:{s:34.6,e:35.3,v:'box',wpn:'cdk'},                // "CDK"
 montage1:{s:35.3,e:38.3,v:'montage'},                  // "tudo preparado pra entrar e jogar"
 race:{s:40.45,e:41.75,v:'box',pool:'race'},            // "raça Full V4"
 inv:{s:41.85,e:42.7,v:'box',pool:'inv'},               // "frutas místicas"
 entrega:{s:55.3,e:58.0,v:'mo',clip:'brand_entrega'},   // "compra aprovada, dados automaticamente"
 jogo:{s:62.9,e:64.5,v:'box',wpn:'any'},                // "comprar, receber e entrar no jogo"
 siteFb:{s:66.3,e:70.3,v:'mo',clip:'site_feedback'},    // "feedbacks de quem já comprou"
 final:{s:75.0,e:76.8,v:'box',wpn:'any'},               // "começar de onde realmente importa"
 brandCta:{s:77.55,e:99,v:'mo',clip:'brand_cta3'},      // "Basic-Build... clica abaixo" (SÓ R$ 17,90)
};`);
lineRep("const CLIPLEN={","const CLIPLEN={brand_feedback:1.5,site_feedback:4.5,brand_entrega:2.6,site_top:3.6,site_top2:2.2,site_feedback2:3.4,site_cta:2.5,brand_cta:3.47,brand_intro:1.9,brand_cta2:4.2,brand_cta3:4.2};");
lineRep("const STD=[","const STD=['hookSite','gh','cdk','brandIntro','siteTop','gh2','cdk2','montage1','race','inv','entrega','jogo','siteFb','final','brandCta'];");
block("const MEME_CUES=[","\n];",`const MEME_CUES=[
 [14.85,16.6,'espera',1],    // "fazendo missão, formando material"
 [17.4,18.95,'frustrado',1], // "repetindo a mesma coisa"
 [29.1,30.25,'choque',1],    // "pagar caro por isso"
 [53.0,54.9,'espera',1],     // "esperando alguém te entregar"
 [65.3,66.3,'duvida',1],     // "se ainda estiver em dúvida"
 [27.0,28.95,'duvida',2],    // "conta cheia de coisa que nem vai usar"
 [44.7,47.4,'espera',2],     // "gastar horas ou até dias construindo"
 [72.6,74.85,'frustrado',2], // "continuar gastando seu tempo"
 [8.6,11.3,'choque',3],      // "seu tempo vale muito mais"
];`);
rep("const items={brand_feedback:[0.35,0.7],brand_entrega:[0.25,0.75,1.3],brand_cta:[0.35,0.75,1.4]};","const items={brand_feedback:[0.35,0.7],brand_entrega:[0.25,0.75,1.3],brand_cta:[0.35,0.75,1.4],brand_intro:[0.35,0.75,1.15],brand_cta2:[0.35,0.75,1.25],brand_cta3:[0.75,1.25]};");
rep("if(s.clip==='brand_cta')add(P.coin,s.oS+0.35,'coin');});","});\n {const o=s2o(50.62);if(o!=null)add(P.coin,o,'coin');}\n {const c=shots.find(x=>x.k==='mo'&&x.clip==='brand_cta3'&&x.first);if(c)add(P.coin,c.oS+0.35,'coin');}");
lineRep(" const HL=/^("," const HL=/^(GODHUMAN|CDK|BASIC-BUILD|V4|RAÇA|FULL|MÍSTICAS|LEVEL|MÁXIMO|BLOX|FRUITS|17,90|AUTOMATICAMENTE|FEEDBACKS|PARAR|BÁSICO|HORAS|DIAS|ZERO|E-MAIL|JOGAR|JOGO)$/;");
block('// ---------- receitas do lote 6','\n];',`// ---------- receitas do lote 7 (vídeo novo, com o aprendizado dos lotes 1–6) ----------
const RI=STD;
const V=[
 {id:'v61',order:'ABCDEFGHIJKLMN',gap:0.28,dirs:RI,zoom:[1,1.15],pack:'y2',seed:61,hl:[YEL],reac:'nenhuma',memes:'muitos',memeSom:0.4,grade:'vivo',cap:'sombra',raceInv:true},
 {id:'v62',order:'ABCDEFGHJKLMN',gap:0.28,dirs:RI,zoom:[1.12,1],pack:'y1',seed:62,hl:[YEL],reac:'nenhuma',memes:'medios',memeSom:0.5,grade:'quente',cap:'sombra',raceInv:true},
 {id:'v63',order:'ABCDEFGHIJKLN',gap:0.28,dirs:RI,zoom:[1.12,1],pack:'y3',seed:63,hl:[YEL],reac:'nenhuma',memes:'muitos',memeSom:0.4,grade:'quente',cap:'sombra',raceInv:true},
 {id:'v64',order:'ABCDEFGHJKLN',gap:0.2,dirs:RI,zoom:[1.08,1,1.2],pack:'y2',seed:64,hl:[YEL],reac:'nenhuma',memes:'medios',memeSom:0.3,grade:'vivo',cap:'sombra',raceInv:true},
 {id:'v65',order:'ABCDEFGHIJKLMN',gap:0.28,dirs:RI,zoom:[1,1.12],pack:'y1',seed:65,hl:[YEL,LIME],reac:'nenhuma',memes:'muitos',memeSom:0.5,grade:'vivo',cap:'sombra',raceInv:true},
 {id:'v66',order:'ABCDEFGHJKLMN',gap:0.28,dirs:RI,zoom:[1.12,1],pack:'y3',seed:66,hl:[YEL],reac:'nenhuma',memes:'muitos',memeSom:0.4,grade:'quente',cap:'faixa',raceInv:true},
 {id:'v67',order:'ABCDEFGHIJKLN',gap:0.2,dirs:RI,zoom:[1,1.15],pack:'y2',seed:67,hl:[YEL],reac:'nenhuma',memes:'medios',memeSom:0.4,grade:'vivo',cap:'sombra',raceInv:true},
 {id:'v68',order:'ABCDEFGHJKLN',gap:0.28,dirs:RI,zoom:[1.1,1],pack:'y1',seed:68,hl:[YEL],reac:'nenhuma',memes:'muitos',memeSom:0.3,grade:'quente',cap:'sombra',raceInv:true},
 {id:'v69',order:'ABCDEFGHIJKLMN',gap:0.28,dirs:RI.filter(d=>d!=='race'&&d!=='inv'),zoom:[1.12,1],pack:'y3',seed:69,hl:[YEL],reac:'nenhuma',memes:'muitos',memeSom:0.4,grade:'vivo',cap:'sombra',raceInv:false},
 {id:'v70',order:'ABCDEFGHJKLMN',gap:0.28,dirs:RI,zoom:[1,1.15],pack:'y2',seed:70,hl:[YEL],reac:'nenhuma',memes:'muitos',memeSom:0.4,grade:'vivo',cap:'sombra',raceInv:true,boxLen:1.5},
];`);
// corte nunca invade a palavra seguinte (evitava palavra/áudio repetido)
rep("groups.forEach(g=>pieces.push({sent:id,s:Math.max(0,g[0].s-0.07),e:Math.min(SRC_END,g[g.length-1].e+0.13)}));}",
    "groups.forEach(g=>{const li=W.indexOf(g[g.length-1]),nx=W[li+1],pv=W[W.indexOf(g[0])-1];pieces.push({sent:id,s:Math.max(0,g[0].s-0.07,pv?pv.e+0.01:0),e:Math.min(SRC_END,g[g.length-1].e+0.13,nx?nx.s-0.02:99)});});}");
rep('lote:6,','lote:7,');
rep("'_receitas_lote6.json')","'_receitas_lote7.json')");
rep("'_resumo_lote6_'","'_resumo_lote7_'");
rep('// Lote 6 de variações','// Lote 7 de variações — vídeo novo (copy_9DC70B42), mesmo sistema do lote 6\n// Lote 6 de variações');
fs.writeFileSync(__dirname+'/gen7.js',s);console.log('gen7.js ok');
