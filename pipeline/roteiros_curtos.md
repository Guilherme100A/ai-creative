# Roteiros curtos para gravar (20–28 s) — formato dos vencedores do nicho

## Linha sem UGC — status (PAUSADA em 08/10/2026)

**Por que pausou:** o dono assistiu o `criativo_vz04.mp4` e reprovou. Cada clipe do YouTube mostra um avatar diferente, e o formato sem UGC precisa de **um avatar só**, sempre o mesmo. Isso só existe com gameplay própria gravada. Não gastar mais caracteres da ElevenLabs até retomar.

**Condição para retomar:** gameplay própria de **1 avatar** (o mesmo em tudo), **sem HUD** (sem barra de skills, notificações, "Safe Zone" etc.), com **vários takes** de cada coisa: Godhuman, CDK (espadas visíveis), Soul Guitar (guitarra visível), raça V4, inventário de frutas míticas, avatar parado com aura (para o título e o preço) e o avatar equipado. O ideal é gravar em 16:9 cheio, com o avatar no centro.

**O que já está pronto:**
- `pipeline/voz.js`: roteiro (txt) vira `voz.mp3` + `palavras.json`, no mesmo formato do Whisper, usando o endpoint `/with-timestamps` da ElevenLabs. `[17,90|dezessete e noventa]` faz a legenda mostrar "17,90" enquanto a voz fala por extenso. Se o texto não mudou, não gera de novo. O gasto fica registrado em `pipeline/voz_gasto.json`, e `node voz.js --status` mostra o saldo do mês.
  - Uso: `node voz.js <roteiro.txt> <pasta_saida> [--voz liam|nassif|<voice_id>]`. Modelo `eleven_v4`, chave `ELEVENLABS_API_KEY` no `.env`.
  - **Para trocar pela Nassif:** é preciso assinar um plano pago da ElevenLabs. No free, a API recusa vozes da biblioteca com erro 402; o plano pago também libera o uso comercial. Depois é só usar `--voz nassif` (`Fjiik8aKXNDjmxd1Q2jF`) ou mudar o padrão `'liam'` em `voz.js`. Enquanto isso, a voz é a premade **Liam**.
  - Gasto até a pausa: 574 caracteres (3 testes de voz + o roteiro V1). O mês estava em 2.458/10.000.
- `pipeline/base_gameplay.js`: monta o vídeo base 1080x1920 30fps com gameplay em TELA CHEIA cobrindo a voz, e o áudio é a voz.
  - O corte cai na palavra que cita a arma ou a raça.
  - Mede cada clipe (cor, movimento, flash branco, tela escura; cache em `gameplay_metricas.json`) e escolhe o melhor trecho.
  - Usa trechos calmos, com o avatar visível, embaixo do título e do preço.
  - Tem listas curadas: `ABERTURAS`, `CITA` (clipes em que o item aparece) e `CALMOS`.
  - Corta o texto de edição dos vídeos do YouTube.
  - Uso: `node base_gameplay.js <voz.mp3> <palavras.json> <saida.mp4> [--seed N] [--pular inv]`.
  - Com gameplay própria, basta trocar as listas curadas pelos takes novos.
- Projeto `voz_v1` (roteiro em `pipeline/roteiros_voz/v1.txt`, lote 99, `vz01`…`vz04`).
  - Fluxo: `node novo_projeto.js voz_v1 videos/voz_v1.mp4 --palavras <palavras.json> --sem-ia`, depois o projeto editado à mão, depois `novo_lote.js --estilo viral`, depois `motor.js`.
  - Decisões do formato: sem quadros de gameplay (`box`) e sem site no 1º segundo; abre com gameplay e o título; meme só em momento de dor; card final só nos últimos ~3s; usar o prefixo de id `vz` para não colidir com os outros lotes.
  - Coruja: vz01 5/10, vz03 7/10, vz04 7/10. O que faltava (no review da vz04): espadas do CDK na palavra "CDK", Soul Guitar sem orbe genérico, veto de popup e de flash embaixo da legenda.

---

Base: `pipeline/referencias_nicho.md` (22 anúncios que mais rodam na Biblioteca de Anúncios).

**O que eles têm em comum:**
- A fala começa no frame 0, sem "oi".
- O preço aparece antes dos 3 s.
- Logo em seguida vem o que tem na conta.
- Depois uma prova (entrega automática, feedbacks).
- Fecha com um CTA curto e urgente.

**Como gravar:**
- Celular em pé, câmera frontal na altura dos olhos, do peito para cima, com espaço acima da cabeça.
- Luz de janela de frente e parede lisa.
- Frases curtas, com uma pausa pequena entre cada ideia (o motor corta as pausas).
- Grave 2 ou 3 takes de cada roteiro.
- Fale "dezessete e noventa" com clareza.

Cada roteiro vira um projeto: `node novo_projeto.js <nome> <video>`. O Claude monta a edição sozinho.

---

## R1 — Dor + preço (o mais seguro)
> Para de perder horas farmando level no Blox Fruits.
> Por **dezessete e noventa** você pega uma conta já pronta:
> level máximo, Godhuman, CDK e Soul Guitar.
> Pagou no Pix, os dados chegam na hora, automático.
> É só entrar e jogar.
> Clica em saiba mais e pega a sua na Basic-Build.

*Na tela:* gameplay do Godhuman quando ela fala o nome, "17,90" gigante em verde, card da entrega, card final.

## R2 — Comparação (o que mais aparece no topo)
> Conta de cem reais ou conta de **dezessete e noventa**?
> A de dezessete e noventa já vem com level máximo,
> Godhuman, CDK e Soul Guitar.
> E às vezes ainda vem com raça V4 e fruta mítica.
> Entrega automática no Pix, na hora.
> Clica em saiba mais antes que acabe.

*Na tela:* título no gancho "R$ 100 OU *R$ 17,90*?" e montagem das armas.

## R3 — Achado / sorte (estilo esquete)
> Gente, olha o que eu achei: conta de Blox Fruits pronta por **dezessete e noventa**.
> Level máximo, Godhuman, CDK, Soul Guitar…
> eu comprei, paguei no Pix e o login chegou na hora.
> Já tô jogando.
> O link tá aqui embaixo, na Basic-Build.

*Na tela:* meme de surpresa no "olha o que eu achei" e inventário/armas na lista.

## R4 — Objeção (para quem tem medo de golpe)
> "Será que eu recebo mesmo?" Recebe, e na hora.
> Conta de Blox Fruits pronta por **dezessete e noventa**, com
> level máximo, Godhuman, CDK e Soul Guitar.
> Pagou no Pix, o login aparece na tela e vai pro seu e-mail.
> Olha os feedbacks de quem já comprou.
> Clica em saiba mais.

*Na tela:* título "SERÁ QUE EU *RECEBO*?", site de feedbacks e card da entrega.

---

**Dicas que valem para todos:**
- Não cite TikTok nem outra plataforma; o anúncio roda no Meta.
- Termine sempre com "clica em saiba mais", que é o texto do botão do anúncio.
- Se puder, grave também 15 s do inventário real da conta (frutas míticas, armas equipadas, "Lv. 2800"). Todos os vencedores mostram isso.
