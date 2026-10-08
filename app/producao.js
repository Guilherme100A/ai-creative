// Esteira de produção do revisor: projetos, lotes, render e referências, numa fila (um job por vez — pouca RAM).
// Só roda os scripts da pipeline com argumentos validados; o servidor escuta apenas em 127.0.0.1.
const fs = require('fs');
const path = require('path');
const { spawn, spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const PIPE = path.join(ROOT, 'pipeline');
const { DADOS } = require(path.join(PIPE, 'paths'));
const PROJ_DIR = path.join(PIPE, 'projetos');
const EST_DIR = path.join(PIPE, 'estilos');
const VAR_DIR = path.join(ROOT, 'render', 'variacoes');
const VIDEO_EXT = /\.(mov|mp4|m4v|mkv|webm)$/i;
const NOME_OK = /^[a-z0-9_-]{1,40}$/i;

function readJSON(f, def) { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return def; } }

// ---------- fila ----------
const jobs = [];
let rodando = null;
function enfileirar(tipo, titulo, args) {
  const job = { id: String(Date.now()) + Math.floor(Math.random() * 1000), tipo, titulo, args, status: 'fila', log: [], criado: new Date().toISOString() };
  jobs.unshift(job); if (jobs.length > 50) jobs.length = 50;
  proximo(); return job;
}
function proximo() {
  if (rodando) return;
  const job = [...jobs].reverse().find(j => j.status === 'fila'); if (!job) return;
  rodando = job; job.status = 'rodando'; job.inicio = Date.now();
  const p = spawn(process.execPath, job.args, { cwd: PIPE, windowsHide: true });
  const add = d => { for (const l of String(d).split(/\r?\n/)) if (l.trim()) job.log.push(l); if (job.log.length > 400) job.log.splice(0, job.log.length - 400); };
  p.stdout.on('data', add); p.stderr.on('data', add);
  p.on('close', code => { job.status = code === 0 ? 'ok' : 'erro'; job.fim = Date.now(); job.codigo = code; rodando = null; proximo(); });
  p.on('error', e => { add(String(e)); job.status = 'erro'; rodando = null; proximo(); });
}

// ---------- leitura do estado ----------
function listaVideos() {
  const out = [];
  const scan = (d, depth) => { if (!fs.existsSync(d)) return; for (const f of fs.readdirSync(d)) { const p = path.join(d, f); let st; try { st = fs.statSync(p); } catch { continue; }
    if (st.isDirectory()) { if (depth > 0 && !/^(moveset|referencias|Pack de Memes|criativo|node_modules)/i.test(f)) scan(p, depth - 1); }
    else if (VIDEO_EXT.test(f)) out.push({ arquivo: path.relative(DADOS, p).split(path.sep).join('/'), mb: +(st.size / 1e6).toFixed(1) }); } };
  scan(DADOS, 2); return out;
}
function renderizados() { return new Set(fs.existsSync(VAR_DIR) ? fs.readdirSync(VAR_DIR).filter(f => /^criativo_v\d+\.mp4$/.test(f)).map(f => f.slice(9, -4)) : []); }
function estado() {
  const feitos = renderizados();
  const projetos = fs.existsSync(PROJ_DIR) ? fs.readdirSync(PROJ_DIR).filter(n => fs.existsSync(path.join(PROJ_DIR, n, 'projeto.json'))).map(n => {
    const p = readJSON(path.join(PROJ_DIR, n, 'projeto.json'), {});
    const ld = path.join(PROJ_DIR, n, 'lotes');
    const lotes = fs.existsSync(ld) ? fs.readdirSync(ld).map(f => readJSON(path.join(ld, f), null)).filter(Boolean).map(l => ({ lote: l.lote, estilo: l.estilo || null, ids: l.variacoes.map(v => v.id), feitos: l.variacoes.filter(v => feitos.has(v.id)).length })).sort((a, b) => b.lote - a.lote) : [];
    const videoOk = fs.existsSync(path.isAbsolute(p.video || '') ? p.video : path.join(DADOS, p.video || '_'));
    return { nome: n, descricao: p.descricao, origem: p.origem || 'manual', observacoes: p.observacoes || '', video: p.video, videoOk, fimFala: p.fimFala,
      frases: Object.entries(p.frases || {}).map(([id, [de, ate]]) => ({ id, de, ate, nome: (p.nomesFrases || {})[id] || '', opcional: (p.frasesOpcionais || []).includes(id) })),
      direcoes: Object.entries(p.direcoes || {}).map(([nome, d]) => ({ nome, de: d.s, ate: d.e >= 99 ? p.fimFala : d.e, tipo: d.v, oque: d.clip || d.wpn || d.pool || d.v })),
      memes: (p.memes || []).map(([de, ate, cat, prio]) => ({ de, ate, cat, prio })), lotes };
  }) : [];
  const estilos = fs.existsSync(EST_DIR) ? fs.readdirSync(EST_DIR).filter(f => f.endsWith('.json')).map(f => readJSON(path.join(EST_DIR, f), null)).filter(Boolean)
    .map(e => ({ nome: e.nome, descricao: e.descricao, origem: e.origem, fixo: e.fixo, fonte: e.fonte || null, queNaoDaParaFazer: e.queNaoDaParaFazer || [], dicasParaGravar: e.dicasParaGravar || '', metricas: e.metricas || null })) : [];
  const moveset = (() => { const m = path.join(DADOS, 'moveset'); let n = 0; const walk = d => { if (!fs.existsSync(d)) return; for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else if (f.endsWith('.mp4')) n++; } }; walk(m); return n; })();
  return { projetos, estilos, videos: listaVideos(), moveset, dados: DADOS, jobs: jobs.map(j => ({ ...j, log: j.log.slice(-60), args: undefined })) };
}

// ---------- ações ----------
function criarJob(b) {
  const node = f => path.join(PIPE, f);
  if (b.tipo === 'projeto') {
    if (!NOME_OK.test(b.nome || '')) throw new Error('nome do projeto: só letras, números, _ e -');
    const v = String(b.video || ''); const abs = path.isAbsolute(v) ? v : path.join(DADOS, v);
    if (!VIDEO_EXT.test(v) || !fs.existsSync(abs)) throw new Error('vídeo não encontrado: ' + v);
    const args = [node('novo_projeto.js'), b.nome, abs]; if (b.semIA) args.push('--sem-ia'); if (b.sobrescrever) args.push('--sobrescrever');
    return enfileirar('projeto', `Projeto ${b.nome}`, args);
  }
  if (b.tipo === 'lote') {
    if (!NOME_OK.test(b.projeto || '') || !fs.existsSync(path.join(PROJ_DIR, b.projeto, 'projeto.json'))) throw new Error('projeto inválido');
    const n = Math.max(1, Math.min(20, +b.n || 10)); const args = [node('novo_lote.js'), b.projeto, '--n', String(n)];
    if (b.estilo) { if (!NOME_OK.test(b.estilo) || !fs.existsSync(path.join(EST_DIR, b.estilo + '.json'))) throw new Error('estilo inválido'); args.push('--estilo', b.estilo); }
    return enfileirar('lote', `Lote novo de ${b.projeto} (${n}${b.estilo ? ', ' + b.estilo : ''})`, args);
  }
  if (b.tipo === 'render') {
    if (!NOME_OK.test(b.projeto || '') || !/^\d+$/.test(String(b.lote))) throw new Error('projeto/lote inválido');
    let ids = b.ids || 'all'; if (ids === 'faltando') { const l = readJSON(path.join(PROJ_DIR, b.projeto, 'lotes', `lote${b.lote}.json`), null); if (!l) throw new Error('lote não existe'); const f = renderizados(); ids = l.variacoes.map(v => v.id).filter(i => !f.has(i)).join(','); if (!ids) throw new Error('nada faltando nesse lote'); }
    if (!/^(all|v\d+(,v\d+)*)$/.test(ids)) throw new Error('ids inválidos');
    return enfileirar('render', `Render ${b.projeto} lote ${b.lote} (${ids === 'all' ? 'todos' : ids})`, [node('motor.js'), b.projeto, String(b.lote), ids]);
  }
  if (b.tipo === 'referencia') {
    if (!NOME_OK.test(b.nome || '')) throw new Error('nome do estilo: só letras, números, _ e -');
    const f = String(b.fonte || ''); const ok = /^https?:\/\/\S+$/i.test(f) || (VIDEO_EXT.test(f) && fs.existsSync(path.isAbsolute(f) ? f : path.join(DADOS, f)));
    if (!ok) throw new Error('referência: cole um link ou envie um vídeo');
    const args = [node('referencia.js'), /^https?:/i.test(f) ? f : (path.isAbsolute(f) ? f : path.join(DADOS, f)), b.nome]; if (b.semIA) args.push('--sem-ia');
    return enfileirar('referencia', `Referência ${b.nome}`, args);
  }
  throw new Error('tipo de job desconhecido');
}

function plano(projeto, lote, id) {
  if (!NOME_OK.test(projeto) || !/^\d+$/.test(lote) || !/^v\d+$/.test(id)) throw new Error('parâmetros inválidos');
  const r = spawnSync(process.execPath, [path.join(PIPE, 'motor.js'), projeto, lote, id, '--plano'], { cwd: PIPE, encoding: 'utf8', maxBuffer: 32 << 20 });
  try { return JSON.parse(r.stdout)[0]; } catch { throw new Error((r.stderr || r.stdout || 'falhou').slice(0, 500)); }
}

// upload direto para DADOS/uploads (vídeo base ou referência)
function upload(req, res, nome, send) {
  const safe = path.basename(String(nome || '')).replace(/[^\w.\- ]/g, '_');
  if (!VIDEO_EXT.test(safe)) return send(res, 400, { erro: 'envie um vídeo (.mov, .mp4, .mkv, .webm)' });
  const dir = path.join(DADOS, 'uploads'); fs.mkdirSync(dir, { recursive: true });
  const dest = path.join(dir, safe); const ws = fs.createWriteStream(dest);
  req.pipe(ws); ws.on('finish', () => send(res, 200, { ok: true, arquivo: path.relative(DADOS, dest).split(path.sep).join('/') }));
  ws.on('error', e => send(res, 500, { erro: String(e) }));
}

function salvarProjeto(nome, texto) {
  if (!NOME_OK.test(nome)) throw new Error('nome inválido');
  const f = path.join(PROJ_DIR, nome, 'projeto.json'); if (!fs.existsSync(f)) throw new Error('projeto não existe');
  const j = JSON.parse(texto); for (const k of ['video', 'palavras', 'frases', 'fimFala', 'direcoes', 'direcoesPadrao']) if (!(k in j)) throw new Error('falta o campo ' + k);
  fs.copyFileSync(f, f.replace(/\.json$/, `.bak_${Date.now()}.json`)); fs.writeFileSync(f, JSON.stringify(j, null, 1));
}

module.exports = { estado, criarJob, plano, upload, salvarProjeto, PROJ_DIR, readJSON };
