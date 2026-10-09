// checagem de qualidade dos criativos — as regras "nunca" do LEIA-ME_PIPELINE.md, seção 5.
// valida() roda antes do render (só lê o plano, não muda nada); erro = não renderiza.
const fs=require('fs');

// cenas que mostram o preço antigo (R$ 18,90)
const CENAS_PRECO_ANTIGO=['site_top','site_cta','brand_cta'];
// meme toca até o fim, no máx 2,4s ou a janela da fala dele (o que for maior) e até +0,8s além da frase.
// passar de 3,2s só acontece por bug.
const MEME_MAX=3.2;
const CORTES_MAX=4.5; // cortes visíveis a cada 10s

// o id vira vt/<id> e render/variacoes/criativo_<id>.mp4 (globais): repetido em dois lotes = um render atropela o outro
function lotesComId(id){const P=require('path').join(__dirname,'projetos');const achou=[];
 for(const p of fs.existsSync(P)?fs.readdirSync(P):[]){const ld=require('path').join(P,p,'lotes');if(!fs.existsSync(ld))continue;
  for(const f of fs.readdirSync(ld))try{if(JSON.parse(fs.readFileSync(require('path').join(ld,f),'utf8')).variacoes.some(v=>v.id===id))achou.push(p+'/'+f);}catch{}}
 return achou;}

const _dur={};
function durClipe(f){if(f in _dur)return _dur[f];try{const fp=require('ffprobe-static').path;_dur[f]=+require('child_process').execFileSync(fp,['-v','error','-show_entries','format=duration','-of','csv=p=0',f]).toString().trim()||null;}catch{_dur[f]=null;}return _dur[f];}

function valida({R,shots,DUR,SENT,MV}){
 const erros=[],avisos=[];
 const dup=lotesComId(R.id);if(dup.length>1)erros.push(`id ${R.id} existe em mais de um lote (${dup.join(', ')}) — os renders se atropelam; renomeie um deles`);
 const ordem=Object.keys(SENT);const idx=[...R.order].map(c=>ordem.indexOf(c));
 if(idx.some(i=>i<0))erros.push(`ordem "${R.order}" tem frase que não existe no projeto`);
 else if(idx.some((v,i)=>i&&v<=idx[i-1]))erros.push(`frases fora da ordem original ("${R.order}") — reordenar foi reprovado como "bugado"`);
 // paleta do site: destaque só verde-limão (&H6BF3C6&); amarelo/rosa reprovados pelo dono
 if(R.fx&&(R.hl||[]).some(c=>!/6BF3C6/i.test(c)))erros.push('cor de destaque fora da paleta do site (só o verde-limão #C6F36B) — o dono reprovou o amarelo');
 if(R.cap==='faixa')erros.push('legenda com faixa/caixa escura — lei do dono: legenda branca sem contorno e sem caixa (cap:"sombra")');
 if(R.reac&&R.reac!=='nenhuma')erros.push(`reações com emoji ("${R.reac}") — descontinuadas, use reac:"nenhuma"`);
 for(const s of shots){
  if(s.k==='mo'&&CENAS_PRECO_ANTIGO.includes(s.clip))erros.push(`cena "${s.clip}" mostra R$ 18,90 — use site_top2 / brand_cta3`);
  if(s.k==='box'&&!s.take)erros.push(`quadrado de gameplay em ${s.oS.toFixed(2)}s sem clipe (estoque vazio para essa arma?)`);
  else if(s.k==='box'&&s.first&&!fs.existsSync(`${MV}/${s.take}`))erros.push(`clipe não existe: ${s.take}`);
 }
 // congelamento: gameplay mais longa que o clipe vira quadro parado ("o vídeo bugou" — v999, aura de 1,4s num trecho de 2,6s)
 if(R.fx){const uso=new Map();for(const s of shots)if((s.k==='box'||s.k==='split')&&s.take)uso.set(s.take,(uso.get(s.take)||0)+(s.oE-s.oS));
  for(const [t,seg] of uso){const d=durClipe(`${MV}/${t}`);if(d!=null&&seg>d-0.15)erros.push(`clipe curto demais: ${t.split('/').pop()} tem ${d.toFixed(1)}s e o vídeo pede ${seg.toFixed(1)}s — ia congelar o último quadro`);}}
 const memes=new Map();for(const s of shots)if(s.k==='meme'){const m=memes.get(s.meme)||{a:s.oS,b:s.oE};m.a=Math.min(m.a,s.oS);m.b=Math.max(m.b,s.oE);memes.set(s.meme,m);}
 for(const [m,{a,b}] of memes)if(b-a>MEME_MAX+0.05)erros.push(`meme ${m.id} dura ${(b-a).toFixed(2)}s (máx ${MEME_MAX}s)`);
 // ritmo: os vídeos que o dono deu nota 4 têm 3–4,4 cortes a cada 10s (plano médio 2,2–3,3s); o v990 reprovado ("muito corte
 // feio, cortes aleatórios") tinha 6,8. Conta toda troca visível: tipo, cena, clipe, meme ou enquadramento dela.
 if(R.fx){let cortes=0;for(let i=1;i<shots.length;i++){const a=shots[i-1],b=shots[i];
   if(a.k!==b.k||a.clip!==b.clip||a.take!==b.take||a.meme!==b.meme||(a.k==='th'&&a.z!==b.z))cortes++;}
  const porDez=cortes/DUR*10;
  if(porDez>CORTES_MAX)erros.push(`cortes demais: ${porDez.toFixed(1)} a cada 10s (máx ${CORTES_MAX}; os aprovados pelo dono têm 3–4,4) — tire efeitos/inserts ou junte planos`);
  else if(porDez>CORTES_MAX-0.7)avisos.push(`ritmo no limite: ${porDez.toFixed(1)} cortes a cada 10s`);}
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
