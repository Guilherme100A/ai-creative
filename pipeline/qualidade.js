// checagem de qualidade dos criativos — as regras "nunca" do LEIA-ME_PIPELINE.md, seção 5.
// valida() roda antes do render (só lê o plano, não muda nada); erro = não renderiza.
const fs=require('fs');

// cenas que mostram o preço antigo (R$ 18,90)
const CENAS_PRECO_ANTIGO=['site_top','site_cta','brand_cta'];
// meme toca até o fim, no máx 2,4s ou a janela da fala dele (o que for maior) e até +0,8s além da frase.
// passar de 3,2s só acontece por bug.
const MEME_MAX=3.2;

function valida({R,shots,DUR,SENT,MV}){
 const erros=[],avisos=[];
 const ordem=Object.keys(SENT);const idx=[...R.order].map(c=>ordem.indexOf(c));
 if(idx.some(i=>i<0))erros.push(`ordem "${R.order}" tem frase que não existe no projeto`);
 else if(idx.some((v,i)=>i&&v<=idx[i-1]))erros.push(`frases fora da ordem original ("${R.order}") — reordenar foi reprovado como "bugado"`);
 if(R.reac&&R.reac!=='nenhuma')erros.push(`reações com emoji ("${R.reac}") — descontinuadas, use reac:"nenhuma"`);
 for(const s of shots){
  if(s.k==='mo'&&CENAS_PRECO_ANTIGO.includes(s.clip))erros.push(`cena "${s.clip}" mostra R$ 18,90 — use site_top2 / brand_cta3`);
  if(s.k==='box'&&!s.take)erros.push(`quadrado de gameplay em ${s.oS.toFixed(2)}s sem clipe (estoque vazio para essa arma?)`);
  else if(s.k==='box'&&s.first&&!fs.existsSync(`${MV}/${s.take}`))erros.push(`clipe não existe: ${s.take}`);
 }
 const memes=new Map();for(const s of shots)if(s.k==='meme'){const m=memes.get(s.meme)||{a:s.oS,b:s.oE};m.a=Math.min(m.a,s.oS);m.b=Math.max(m.b,s.oE);memes.set(s.meme,m);}
 for(const [m,{a,b}] of memes)if(b-a>MEME_MAX+0.05)erros.push(`meme ${m.id} dura ${(b-a).toFixed(2)}s (máx ${MEME_MAX}s)`);
 if(!shots.some(s=>s.k==='mo'&&s.clip==='brand_cta3'))avisos.push('sem o card final "SÓ R$ 17,90" (brand_cta3)');
 if(DUR>95)avisos.push(`vídeo longo: ${DUR.toFixed(1)}s`);
 const box=shots.filter(s=>s.k==='box'&&s.first);
 for(let i=1;i<box.length;i++)if(box[i].take===box[i-1].take)avisos.push(`mesmo clipe duas vezes seguidas: ${box[i].take}`);
 return {erros,avisos};
}

// sons proibidos: whoosh ("barulho de chupada"), trombeta
function checaSons(ev){
 return ev.filter(e=>/_removidos|whoosh|swoosh|trombeta|trumpet/i.test(e.f)).map(e=>`som proibido: ${e.f}`);
}

module.exports={valida,checaSons,CENAS_PRECO_ANTIGO};
