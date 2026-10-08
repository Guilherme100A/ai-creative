// Revisor de criativos + esteira de produção — servidor local (sem dependências)
// Rode: node server.js  →  abra http://localhost:4317
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const VAR_DIR = path.join(ROOT, 'render', 'variacoes');
const FB_DIR = path.join(ROOT, 'feedback');
const FB_FILE = path.join(FB_DIR, 'feedback.json');
const PREF_FILE = path.join(FB_DIR, 'preferencias.json');
const PORT = process.env.PORT || 4317;
const P = require('./producao');
fs.mkdirSync(FB_DIR, { recursive: true });

const SENT_NAMES = {
  A: 'Pergunta inicial (vou receber mesmo?)', B: 'Acho normal pensar isso', C: 'Feedbacks na Basic-Build',
  D: 'Ver outras pessoas recebendo', E: 'Entrega automática', F: 'Compra simples / confiança',
  G: 'O que pode vir na conta', H: 'Godhuman, CDK, Soul Guitar…', I: 'Não precisa acreditar em mim',
  J: 'Veja os feedbacks e a entrega', K: 'CTA: saiba mais',
};
const PACK_NAMES = { a: 'Sons suaves', b: 'Sons cinematográficos', c: 'Sons leves', d: 'Sons com punch', e: 'Sons de vácuo/zoom' };

function readJSON(f, def) { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return def; } }

// características de cada variação, usadas para aprender o gosto
const HL_NAMES = { '&H6BF3C6&': 'Verde-limão', '&H00E1FF&': 'Amarelo', '&HB469FF&': 'Rosa' };
const REAC_NAMES = { leve: 'Poucas reações', media: 'Reações médias', muita: 'Muitas reações' };
// nomes das frases de cada projeto (lotes novos); lotes antigos sem projeto usam SENT_NAMES
function nomesDoProjeto(nome) { const p = nome && P.readJSON(path.join(P.PROJ_DIR, nome, 'projeto.json'), null); return p && p.nomesFrases ? p.nomesFrases : SENT_NAMES; }
function variacoes() {
  const receitas = fs.readdirSync(VAR_DIR).filter(f => f.startsWith('_receitas')).flatMap(f => readJSON(path.join(VAR_DIR, f), []));
  const resumo = {};
  for (const f of fs.readdirSync(VAR_DIR).filter(f => f.startsWith('_resumo_'))) for (const r of readJSON(path.join(VAR_DIR, f), [])) resumo[r.id] = r;
  return receitas
    .filter(r => fs.existsSync(path.join(VAR_DIR, `criativo_${r.id}.mp4`)))
    .sort((a, b) => a.id.localeCompare(b.id))
    .map(r => {
      const dur = resumo[r.id]?.duracao ?? null;
      const zmax = Math.max(...r.zoom);
      const hl = [].concat(r.hl);
      const lote = r.lote || 1;
      const feats = {
        'Abertura': r.order[0] === 'H' ? 'Abre com gameplay' : r.order.startsWith('AG') ? 'Pergunta → itens' : r.dirs.includes('hookSite') ? 'Pergunta + site + gameplay' : 'Abre com a pergunta',
        'Cortes': !r.jump ? 'Fala natural (com pausas)' : r.gap != null && r.gap < 0.25 ? 'Cortes bem rápidos' : 'Cortes rápidos (sem pausas)',
        'Ordem da fala': [...r.order].every((c, k, a) => !k || c > a[k - 1]) ? 'Ordem original' : 'Ordem mexida',
        'Duração': dur == null ? '?' : dur < 40 ? 'Curto (<40s)' : dur < 55 ? 'Médio (40–55s)' : 'Longo (55s+)',
        'Gancho': r.dirs.includes('hook') ? 'Gameplay no gancho' : 'Sem gameplay no gancho',
        'Sons': lote === 1 ? 'Whooshes (lote 1)' : (r.packName || r.pack),
        'Reações': REAC_NAMES[r.reac] || 'Sem reações',
        'Memes no quadrado': ({ poucos: 'Poucos memes', medios: 'Memes médios', muitos: 'Muitos memes' })[r.memes] || 'Sem memes',
        'Som dos memes': !r.memes ? '—' : r.memeSom === false ? 'Meme sem som' : typeof r.memeSom === 'number' ? 'Som só em alguns memes' : 'Som em todos os memes',
        'Quadrado do meme': !r.memes ? '—' : lote >= 5 ? 'Meme sem 3D (completo)' : 'Meme em 3D (cortado)',
        'Raça V4 e inventário': r.raceInv ? 'Mostra raça V4 + inventário' : 'Só gameplay das armas',
        'Cor da imagem': r.grade === 'vivo' ? 'Cor viva' : r.grade === 'quente' ? 'Cor quente' : 'Sem correção de cor',
        'Legenda': r.cap === 'faixa' ? 'Legenda com faixa' : r.cap === 'sombra' ? 'Legenda só com sombra' : 'Legenda com contorno',
        'Zoom na fala': zmax >= 1.2 ? 'Zoom forte' : 'Zoom leve',
        'Cor de destaque': hl.length > 1 ? 'Várias cores' : (HL_NAMES[hl[0]] || hl[0]),
        'Ritmo dos quadrados': r.boxLen && r.boxLen < 1 ? 'Quadrados rápidos' : 'Quadrados normais',
      };
      return { id: r.id, lote, arquivo: `criativo_${r.id}.mp4`, duracao: dur, ordem: r.order, projeto: r.projeto || null, partes: [...r.order].map(c => nomesDoProjeto(r.projeto)[c] || c), feats, takes: resumo[r.id]?.takes || [] };
    });
}

// ranking: nota (estrelas) manda; sem nota, aprovado vale 3.5 e reprovado 1.5
function ranking(vars, fb) {
  return vars.map(v => {
    const f = fb[v.id] || {};
    const score = f.nota ? f.nota : f.status === 'aprovado' ? 3.5 : f.status === 'reprovado' ? 1.5 : null;
    return { id: v.id, lote: v.lote, duracao: v.duracao, status: f.status || null, nota: f.nota || null, score, texto: f.texto || '' };
  }).filter(r => r.score != null).sort((a, b) => b.score - a.score || (a.status === 'aprovado' ? -1 : 1));
}

// aprendizado: taxa de aprovação por característica + motivos mais citados
function aprender(vars, fb) {
  const byId = Object.fromEntries(vars.map(v => [v.id, v]));
  const stats = {};
  const motivos = { aprovado: {}, reprovado: {} };
  let aprov = 0, total = 0;
  for (const [id, f] of Object.entries(fb)) {
    if (!f.status || !byId[id]) continue;
    total++; const ok = f.status === 'aprovado'; if (ok) aprov++;
    for (const [k, val] of Object.entries(byId[id].feats)) {
      const key = k + '||' + val;
      stats[key] = stats[key] || { grupo: k, valor: val, aprov: 0, n: 0, ids: [], notaSoma: 0, notaN: 0 };
      stats[key].n++; if (ok) stats[key].aprov++; stats[key].ids.push(id); if (f.nota) { stats[key].notaSoma += f.nota; stats[key].notaN++; }
    }
    for (const t of f.tags || []) motivos[f.status][t] = (motivos[f.status][t] || 0) + 1;
  }
  const base = total ? aprov / total : 0.5;
  const lista = Object.values(stats).map(s => ({ ...s, notaMedia: s.notaN ? s.notaSoma / s.notaN : null, taxa: s.aprov / s.n, score: (s.aprov + base * 2) / (s.n + 2) }))
    .sort((a, b) => b.score - a.score);
  // perfil: o melhor valor de cada grupo, se tiver evidência
  const grupos = {};
  for (const s of lista) (grupos[s.grupo] = grupos[s.grupo] || []).push(s);
  const perfil = [];
  for (const [g, arr] of Object.entries(grupos)) {
    if (arr.length < 2) continue;
    const best = arr[0], worst = arr[arr.length - 1];
    if (best.n >= 1 && best.score - worst.score >= 0.15) perfil.push({ grupo: g, prefere: best.valor, evita: worst.valor, confianca: Math.min(1, (best.n + worst.n) / 6) });
  }
  const top = o => Object.entries(o).sort((a, b) => b[1] - a[1]);
  return { avaliados: total, aprovados: aprov, taxaGeral: base, caracteristicas: lista, perfil: perfil.sort((a, b) => b.confianca - a.confianca), motivosAprovacao: top(motivos.aprovado), motivosReprovacao: top(motivos.reprovado),
    notas: Object.entries(fb).filter(([, f]) => f.texto || (f.momentos || []).length).map(([id, f]) => ({ id, status: f.status, texto: f.texto, momentos: f.momentos })) };
}

function send(res, code, body, type = 'application/json') {
  res.writeHead(code, { 'Content-Type': type + '; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}

function serveVideo(req, res, file) {
  const p = path.join(VAR_DIR, path.basename(file));
  if (!fs.existsSync(p)) return send(res, 404, { erro: 'não encontrado' });
  const size = fs.statSync(p).size;
  const range = req.headers.range;
  if (range) {
    const [s, e] = range.replace('bytes=', '').split('-');
    const start = parseInt(s, 10), end = e ? parseInt(e, 10) : Math.min(start + 4 * 1024 * 1024, size - 1);
    res.writeHead(206, { 'Content-Range': `bytes ${start}-${end}/${size}`, 'Accept-Ranges': 'bytes', 'Content-Length': end - start + 1, 'Content-Type': 'video/mp4' });
    fs.createReadStream(p, { start, end }).pipe(res);
  } else {
    res.writeHead(200, { 'Content-Length': size, 'Content-Type': 'video/mp4', 'Accept-Ranges': 'bytes' });
    fs.createReadStream(p).pipe(res);
  }
}

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/') return send(res, 200, fs.readFileSync(path.join(__dirname, 'index.html')), 'text/html');
  if (url.pathname.startsWith('/video/')) return serveVideo(req, res, decodeURIComponent(url.pathname.slice(7)));
  if (url.pathname === '/api/estado' && req.method === 'GET') {
    const vars = variacoes(), fb = readJSON(FB_FILE, {});
    return send(res, 200, { variacoes: vars, feedback: fb, aprendizado: aprender(vars, fb), ranking: ranking(vars, fb) });
  }
  if (url.pathname === '/api/feedback' && req.method === 'POST') {
    let body = '';
    req.on('data', c => { body += c; if (body.length > 1e6) req.destroy(); });
    req.on('end', () => {
      try {
        const { id, ...dados } = JSON.parse(body);
        const fb = readJSON(FB_FILE, {});
        fb[id] = { ...fb[id], ...dados, atualizadoEm: new Date().toISOString() };
        fs.writeFileSync(FB_FILE, JSON.stringify(fb, null, 2));
        const vars = variacoes(), ap = aprender(vars, fb);
        const rk = ranking(vars, fb);
        fs.writeFileSync(PREF_FILE, JSON.stringify({ geradoEm: new Date().toISOString(), ...ap, ranking: rk }, null, 2));
        send(res, 200, { ok: true, feedback: fb, aprendizado: ap, ranking: rk });
      } catch (e) { send(res, 400, { erro: String(e) }); }
    });
    return;
  }
  // ---------- esteira de produção ----------
  const body = fn => { let b = ''; req.on('data', c => { b += c; if (b.length > 5e6) req.destroy(); }); req.on('end', () => { try { fn(b); } catch (e) { send(res, 400, { erro: e.message }); } }); };
  if (url.pathname === '/api/producao' && req.method === 'GET') return send(res, 200, P.estado());
  if (url.pathname === '/api/job' && req.method === 'POST') return body(b => { const j = P.criarJob(JSON.parse(b)); send(res, 200, { ok: true, id: j.id }); });
  if (url.pathname === '/api/upload' && req.method === 'POST') return P.upload(req, res, url.searchParams.get('nome'), send);
  if (url.pathname === '/api/plano' && req.method === 'GET') { try { return send(res, 200, P.plano(url.searchParams.get('projeto'), url.searchParams.get('lote'), url.searchParams.get('id'))); } catch (e) { return send(res, 400, { erro: e.message }); } }
  if (url.pathname === '/api/projeto' && req.method === 'GET') { const n = url.searchParams.get('nome') || ''; const f = path.join(P.PROJ_DIR, path.basename(n), 'projeto.json'); return fs.existsSync(f) ? send(res, 200, fs.readFileSync(f, 'utf8'), 'application/json') : send(res, 404, { erro: 'não existe' }); }
  if (url.pathname === '/api/projeto' && req.method === 'PUT') return body(b => { P.salvarProjeto(url.searchParams.get('nome') || '', b); send(res, 200, { ok: true }); });
  send(res, 404, { erro: 'rota não encontrada' });
}).listen(PORT, '127.0.0.1', () => console.log(`Revisor de criativos rodando em http://localhost:${PORT}`));
