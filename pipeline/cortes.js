// Versões curtas de um vídeo base (os vencedores do nicho têm 20–28s; nossos vídeos inteiros, 55–80s).
// O Claude (CLI) escolhe quais frases manter — sempre na ordem original — e o script mede a duração real.
// Salva em projeto.json → cortes: [{nome, ordem, duracao, motivo}]. Lote: node novo_lote.js <projeto> --estilo curto
// uso: node cortes.js <projeto>
const fs=require('fs'),path=require('path');const {perguntar}=require('./ia');
const NOME=process.argv[2];const F=path.join(__dirname,'projetos',NOME||'_','projeto.json');
if(!NOME||!fs.existsSync(F)){console.error('uso: node cortes.js <projeto>');process.exit(1);}
const P=JSON.parse(fs.readFileSync(F,'utf8'));
const W=JSON.parse(fs.readFileSync(path.join(path.dirname(F),P.palavras),'utf8')).chunks.map(c=>({t:c.text.trim(),s:c.timestamp[0],e:Math.max(c.timestamp[1]??0,c.timestamp[0]+0.12)}));
const ids=Object.keys(P.frases);
// duração de cada frase depois dos jump cuts (mesma regra do motor com gap 0.28)
const durFrase=id=>{const [s0,s1]=P.frases[id];const ws=W.filter(w=>w.s>=s0-0.05&&w.s<=s1);let d=0,g=[ws[0]];
 const fecha=g=>{d+=Math.min(g[g.length-1].e+0.13,s1+0.2)-Math.max(0,g[0].s-0.07)};
 for(let i=1;i<ws.length;i++){if(ws[i].s-ws[i-1].e>0.28){fecha(g);g=[];}g.push(ws[i]);}fecha(g);return d;};
const D=Object.fromEntries(ids.map(id=>[id,+durFrase(id).toFixed(2)]));
const texto=id=>{const [s0,s1]=P.frases[id];return W.filter(w=>w.s>=s0-0.05&&w.s<=s1).map(w=>w.t).join(' ');};
const tabela=ids.map(id=>`${id} (${D[id]}s): ${texto(id)}`).join('\n');
const SCHEMA={type:'object',additionalProperties:false,required:['cortes'],properties:{cortes:{type:'array',items:{type:'object',additionalProperties:false,required:['nome','ordem','motivo'],properties:{nome:{type:'string'},ordem:{type:'string'},motivo:{type:'string'}}}}}};
const prompt=`Você edita anúncios verticais da Basic-Build (conta pronta de Blox Fruits, R$ 17,90). Os anúncios vencedores do nicho têm 20–28 s, falam a dor/promessa e o preço cedo e fecham com CTA. Este vídeo base tem as frases abaixo (letra, duração já com jump cuts, texto):

${tabela}

Monte 3 versões curtas escolhendo um SUBCONJUNTO das frases, SEMPRE na ordem original (letras em ordem crescente; reordenar é proibido). Cada versão tem que fazer sentido sozinha: gancho forte na 1ª frase escolhida, o que vem na conta, preço se ela falar, confiança/entrega se couber, e a ÚLTIMA frase do vídeo (o CTA, letra ${ids[ids.length-1]}) sempre no fim. Metas de duração (soma das durações): "curto" 22–30 s, "medio" 30–40 s, "gancho_forte" 25–35 s começando pela frase de maior impacto possível. Não corte no meio de uma ideia que a frase seguinte completa.
Devolva nome, ordem (string de letras, ex. "ACFHK") e motivo (1 frase).`;
console.log('• pedindo os cortes ao Claude (CLI)…');
const r=perguntar({prompt,schema:SCHEMA,esforco:'high'});
const cortes=[];
for(const c of r.dados.cortes){const ord=[...c.ordem.toUpperCase()].filter(x=>ids.includes(x));const idx=ord.map(x=>ids.indexOf(x));
 if(!ord.length||idx.some((v,i)=>i&&v<=idx[i-1])){console.warn('  descartado (ordem inválida):',c.nome,c.ordem);continue;}
 if(ord[ord.length-1]!==ids[ids.length-1])ord.push(ids[ids.length-1]);
 const dur=+ord.reduce((a,x)=>a+D[x],0).toFixed(1);cortes.push({nome:c.nome.replace(/[^a-z0-9_]/gi,'').toLowerCase()||'curto',ordem:ord.join(''),duracao:dur,motivo:c.motivo});}
P.cortes=cortes;fs.writeFileSync(F,JSON.stringify(P,null,1));
for(const c of cortes)console.log(`  ${c.nome}: ${c.ordem} ≈ ${c.duracao}s — ${c.motivo}`);
console.log(`\nsalvo em projetos/${NOME}/projeto.json (cortes). Lote: node novo_lote.js ${NOME} --estilo curto`);
