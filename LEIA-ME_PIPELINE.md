# Pipeline de criativos Basic-Build: guia completo

Este documento explica **tudo** o que foi construído para gerar os criativos (anúncios verticais) da Basic-Build. Com ele, outra sessão do Claude ou outra pessoa consegue reproduzir o resultado e continuar de onde parou.

> **Produto:** conta de Blox Fruits pronta (Godhuman + CDK + Soul Guitar, level máximo, às vezes raça V4 e frutas míticas). Marca: **Basic-Build**.
> **Preço oficial: R$ 17,90.** O site de staging ainda mostrava R$ 18,90, mas o dono confirmou que vai mudar. **Use sempre 17,90.**
> **Formato:** UGC (uma pessoa falando para a câmera), editado com gameplay, memes, site em 3D e legenda palavra por palavra.

---

## 0. Esteira (desde out/2026): o jeito atual de produzir

Não se escreve mais `make_genN.js` / `genN.js` à mão. Tudo passa pelo **revisor → aba Produzir** (`Abrir revisor.bat`), ou pelos mesmos comandos dentro de `pipeline\`:

```
Vídeo base novo ─► node novo_projeto.js <nome> <video>
   (normaliza 1080x1920/30fps, Whisper, correções, e o Claude decide frases/direções/memes/destaques
    usando o vídeo 2 aprovado como gabarito) ─► projetos/<nome>/projeto.json
Referência (link ou vídeo) ─► node referencia.js <link|arquivo> <estilo>
   (métricas + folhas de frames + o Claude lê o estilo) ─► estilos/<estilo>.json
Lote ─► node novo_lote.js <projeto> [--n 10] [--estilo X]
   (sorteia receitas puxando para o que você aprovou em feedback/preferencias.json, sem IA)
Render ─► node motor.js <projeto> <lote> [ids|all]   (um motor só para todos os vídeos)
Revisar no app ─► feedback ─► preferencias.json ─► o próximo lote já puxa para o que você gostou
```

- **`motor.js`** substitui gen6/gen7/genN. Ele foi montado a partir do `gen7.js` e **renderiza idêntico**. `node tests/equivalencia.js "gen7.js" "motor.js base2 7"` compara os ~870 comandos de render sem precisar do vídeo base.
- **Dados por vídeo** ficam em `pipeline\projetos\<nome>\projeto.json`: `frases`, `nomesFrases`, `frasesOpcionais`, `direcoes`, `memes`, `destaques`, `fix`, `moedaEm`. Os lotes ficam em `projetos\<nome>\lotes\loteN.json`. Já existem `base1` (gen6, à mão), `base1_claude` (o mesmo vídeo editado pelo Claude) e `base2` (gen7, lote 7).
- **Checagem de qualidade (`qualidade.js`)** roda antes de cada render e barra: frase reordenada, emoji, cena com R$ 18,90, quadrado sem clipe, meme longo demais, whoosh/trombeta. `node motor.js <p> <lote> all --plano` mostra o plano e a checagem sem renderizar.
- **IA = Claude Code CLI** (`ia.js` chama `claude -p --json-schema`). Usa o login do Claude Code, **sem chave de API**. Só roda ao criar um projeto (1 chamada por vídeo base) e ao ler uma referência (1 por referência). Lote e render não usam IA. `--sem-ia` usa só as regras.
- **Correções globais do Whisper** ficam em `pipeline\correcoes.json` e valem para todo vídeo novo.
- **Estoque de gameplay:** só entram os clipes do YouTube listados em `moveset\_aprovados.txt`, um por linha; para vetar um, apague a linha. Gravação própria (sem `yt_` no nome) entra sempre.

## 1. Visão geral do fluxo (histórico, lotes 1 a 7)

```
Gravação de gameplay (PC, ultrawide)
   └─► cortar cada uso de skill pela barra de cooldown ─► Downloads/moveset/...
Vídeo base (pessoa falando, 1080x1920)
   └─► transcrição com tempo de cada palavra (Whisper local)
Assets: site em 3D, cards de marca, fontes, sons, memes, estoque do YouTube
   └─► gerador genN.js monta N variações ("lote") a partir de receitas
Revisor (app local) ─► você aprova/reprova + estrelas + motivo
   └─► feedback.json ─► Claude lê ─► ajusta as regras ─► próximo lote
```

---

## 2. Pastas

Os caminhos ficam todos em `pipeline\paths.js`. Nenhum script tem mais `C:\Users\<nome>` fixo.
- `ROOT` = esta pasta `criativo`. Ela tem assets, render, feedback e pipeline.
- `DADOS` = onde ficam `moveset\`, os vídeos base `copy_*.mov` e o Pack de Memes. Por padrão é a pasta **acima** de `criativo`. Para usar outra: `set CRIATIVO_DADOS=D:\minha\pasta`.
- Em `assets\memes\catalogo.json`, os caminhos são relativos: `pasta` é relativa a `DADOS` e os áudios `assets/...` são relativos a `ROOT`.

(Na tabela abaixo, "Downloads" = `DADOS`.)

| Pasta | O que tem |
|---|---|
| `moveset\` | Estoque de gameplay, **sem áudio nos clipes do YouTube** |
| `moveset\godhuman\Z - Soaring Beast`, `X - Heaven and Earth`, `C - Sixth Realm Gun`, `showcase` | Clipes por skill. `07-52-54_*` e `08-01-35_*` são gravações próprias (com som do jogo). `yt_*` vêm do YouTube |
| `moveset\cdk\Z - Revolving Ravager`, `X - Slayer of Goliath`, `showcase` | Igual |
| `moveset\soul guitar\Z - Soul Shaker`, `X - El Diablo`, `showcase` | Igual. No jogo, o painel aparece como "Skull Guitar" |
| `moveset\racas v4\<Angel/Cyborg/Ghoul/Human/Mink/Shark/geral>` | Transformações V4 (do YouTube) |
| `moveset\inventario frutas miticas\` | Inventário e frutas (do YouTube) |
| `moveset\conta e itens\` | Abas de armas com CDK e Soul Guitar |
| `moveset\combos\` | Combos |
| `copy_7C70940D-...mov` | Vídeo base 1 (62s), lotes 1 a 6 |
| `copy_9DC70B42-...mov` | Vídeo base 2 (83s), lote 7 |
| `Pack de Memes 2.0-20261007T130021Z-1-001\Pack de Memes 2.0\` | Pack de memes do usuário: IMAGENS, VÍDEOS, ÁUDIOS. **Não mover:** o catálogo aponta pra cá |
| `criativo\assets\site\` | Prints do site **na versão mobile** (o usuário pediu: "só mobile, a versão PC é ruim") |
| `criativo\assets\fontes\` | `Sniglet-ExtraBold` (legenda), `SpaceMono-Bold` (logo e tags), `LuckiestGuy` (antiga) |
| `criativo\assets\motion\` | Animações prontas (mp4 1080x1920) + `mask_box.png` (máscara arredondada 920px) |
| `criativo\assets\sfx\youtube\<dinheiro/impacto/reacao/triste/ui/vibe>` | **Sons em uso.** Cada um tem um `.fonte.txt` com o link |
| `criativo\assets\sfx\{dinheiro,impacto,meme,notificacao,pop}` | Sons do Mixkit (lotes 1 e 2) |
| `criativo\assets\sfx\_removidos\` | Whooshes que o usuário **odiou** ("barulho de chupada"). Não usar |
| `criativo\assets\memes\catalogo.json` | Memes curados por categoria + áudio de cada categoria |
| `criativo\assets\memes\sheet_*.jpg` | Folhas numeradas do pack (V001…, I001…) |
| `criativo\assets\reacoes\` | Emojis animados Noto (lottie). **Descontinuados:** o usuário pediu pra tirar |
| `criativo\render\variacoes\` | Vídeos finais `criativo_vNN.mp4` + `_receitas_loteN.json` + `_resumo_*.json` |
| `criativo\render\criativo_basic_build.mp4` | Primeiro criativo, antes das variações |
| `criativo\app\` | Revisor: `server.js`, `index.html`, `Abrir revisor.bat` |
| `criativo\feedback\feedback.json` | Feedback do usuário por variação (status, nota, texto, momentos) |
| `criativo\feedback\preferencias.json` | Aprendizado consolidado, gerado pelo app |
| `criativo\pipeline\` | **Todos os scripts** (ver seção 4). Tem `node_modules` instalado |

---

## 3. Ferramentas

Tudo roda no Windows, com **Node.js 24**. Python **não** está instalado.

| Ferramenta | Pra quê | Onde |
|---|---|---|
| `ffmpeg-static` / `ffprobe-static` (npm) | Corte, composição, legenda (libass), mixagem | `pipeline\node_modules` |
| `playwright-core` + Chromium | Renderizar animações HTML frame a frame (site 3D, cards, quadrado 3D, emojis) | Chromium já em `%LOCALAPPDATA%\ms-playwright` (chromium-1243). Se faltar: `npx playwright install chromium` |
| `@huggingface/transformers` | Whisper local (transcrição com tempo de cada palavra) | modelo **`Xenova/whisper-small`** (o `onnx-community/...` **não** dá timestamps por palavra) |
| `lottie-web` | Emojis animados Noto (descontinuado) | |
| `pipeline\tools\yt-dlp.exe` | Baixar áudio e vídeo do YouTube | Precisa de **`--no-check-certificates`**, porque o Cloudflare WARP do PC intercepta o SSL |
| Mixkit | Sons gratuitos (lotes 1 e 2) | `https://assets.mixkit.co/active_storage/sfx/<id>/<id>-preview.mp3` |
| Google Fonts | Fontes (TTF estático via `fonts.googleapis.com/css2?family=X` com User-Agent `Wget/1.0`) | |
| Noto Emoji Animation | `https://fonts.gstatic.com/s/e/notoemoji/latest/<codepoint>/lottie.json` (CC BY 4.0) | |

Para reinstalar em outra máquina: `cd criativo\pipeline && npm install`. Confira se existe `node_modules\ffmpeg-static\ffmpeg.exe`.

---

## 4. Scripts (`criativo\pipeline\`)

### 4.1 Cortar os movesets pela barra de cooldown (`scan.js`, `scan2.js`, `events.js`, `cut.js`)
- A gravação é **3440x1440 a 60fps** (ultrawide). O painel de skills fica no canto inferior direito, e cada linha (`[Z]`, `[X]`, `[C]`) ganha uma **barra cinza** que fica **cheia enquanto a skill está ativa** e depois **diminui** (cooldown).
- `scan2.js <video> <csv>`: lê só o painel (`crop 600x420 em x=2840 y=980`, escala de cinza, 30fps). Para cada frame, ele:
  - **identifica a arma** pelo título, comparando IoU com um template binarizado (GODHUMAN em y≈1000; CDK e Skull Guitar em y≈1110);
  - **mede a largura da barra** em 3 faixas, y=1176, 1286 e 1388 (Godhuman Z/X/C; CDK e Skull usam as faixas 2 e 3).
- `events.js`: **início** = a barra vai de menos de 480px para 480px ou mais (cheia); **fim** = a barra começa a diminuir. Gera o `events.json`.
- `cut.js <video> <pastaMoveset> <prefixo> <duração> [events.json]`: corta com **1s antes e 1s depois**, como o usuário pediu, e salva em `moveset/<arma>/<Tecla - Skill>/<prefixo>_<tecla>_<n>.mp4`.
- Para recortar em vertical, o personagem fica perto do centro (x≈1710, y≈800). O recorte do quadrado usado é `crop=980:980:1220:330`. Take ruim conhecido: `godhuman/Z/08-01-35_z_2.mp4` (câmera colada).

### 4.2 Site e animações (`shot.js`, `motion.html`, `scenes.json`, `render_motion.js`)
- `shot.js`: Playwright no **iPhone** (390x844, DPR 3) tira print da página inteira do site `https://basic-build-staging.rhianszlafaiete.workers.dev/` e salva em `site.png` (1170x10137).
- `motion.html`: página 1080x1920 com `window.render(t)` determinístico. Tem dois tipos de cena:
  - `brand`: pílula "BASIC-BUILD" em Space Mono + itens com ícone SVG. Os itens usam **Archivo Black 52px, sem contorno**, porque o usuário achou a letra redonda pouco séria.
  - `site`: o print num plano 3D (perspectiva, rotateX/Y/Z, rolagem de `y0` até `y1` em px do print, zoom `z0` até `z1`, brilho passando).
- `scenes.json`: as cenas. Duração em segundos, que entra no `CLIPLEN` do gerador:
  - `brand_feedback` 1.5
  - `site_feedback` 4.5 (seção "Quem já comprou")
  - `brand_entrega` 2.6
  - `site_top` 3.6 (mostra o preço antigo, não usar com 17,90)
  - `site_top2` 2.2 (para antes do preço)
  - `site_feedback2` 3.4
  - `site_cta` 2.5 (mostra 18,90, não usar)
  - `brand_cta` 3.47 (18,90, não usar)
  - `brand_intro` 1.9
  - `brand_cta2` 4.2 (sem preço)
  - **`brand_cta3` 4.2 ("SÓ R$ 17,90", em uso)**
- `node render_motion.js "<pasta motion>" nome1,nome2`: renderiza os frames e gera um mp4 por cena.
- Os textos dos itens precisam caber em 1080px. "CLICA ABAIXO E PEGUE A SUA" estourou.

### 4.3 Transcrição (`stt.mjs`)
`node stt.mjs <video> <saida.json> Xenova/whisper-small`. Saída: `chunks[{text, timestamp:[ini,fim]}]` por palavra. Já existem:
- `base_words.json`: vídeo base 1
- `base2_words.json`: vídeo base 2

O Whisper erra nomes, então cada gerador tem uma lista **FIX** de correção:
- "blocks" → Blox
- "Besky Build", "Base Key Build", "BaseK Build", "base que bill" → Basic-Build
- "God Human", "God of Human" → Godhuman
- "Rasa" → Raça
- "serve a mais" → saiba mais
- "Leve ao" → Level
- "apagacar o" → pagar caro
- "17 ,90" → 17,90
- "e -mail" → e-mail

### 4.4 Quadrado 3D e quadrado de meme (`box3d.html`, `box3d.js`)
- Recebe uma pasta de frames JPG 860x860 e gera **PNGs transparentes 1080x1920** com o card no centro.
- **Gameplay:** o card fica em perspectiva (rotateX/Y), com lâminas atrás simulando espessura, sombra e brilho. A entrada é um destes efeitos, que se alternam: `flip`, `rise`, `pop`, `swing`.
- **Meme:** `flat:true` gera um quadrado normal **sem 3D**, só com um pop de entrada. O usuário pediu memes sem 3D.
- Fundo do quadrado: a pessoa **desfocada** (`gblur sigma 28`, um pouco mais escura).

### 4.5 Gerador de variações (`gen7.js`, montado por `make_gen7.js`)
Cada lote foi gerado por um `genN.js`. O `make_genN.js` cria o `genN.js` a partir do anterior, trocando blocos de texto. Os antigos estão em `pipeline\_historico\`. **O mais atual é `gen7.js`** (vídeo base 2).

Conceitos dentro do gerador:
- **`SENT`**: frases do vídeo base, com `[inicio, fim]` em segundos da fala original e uma letra (A, B, C…). A **`order`** da receita escolhe quais frases entram e em que ordem. Pular uma frase inteira é ok. Reordenar foi reprovado como "bugado".
- **Jump cut (`gap`)**: dentro de uma frase, pausas maiores que `gap` (0.28 ou 0.2s) são cortadas. Cada pedaço vai até no máximo 0.13s depois da palavra, **sem invadir a próxima palavra**. Esse bug foi corrigido no lote 7, porque gerava "LEVEL LEVEL".
- **`DIR`**: o que aparece na tela em cada trecho da fala. Os tipos são:
  - `mo`: animação em tela cheia;
  - `box`: gameplay no quadrado 3D. O campo `wpn` define a arma (`godhuman`, `cdk`, `soul guitar` ou `any`, que só usa gravação própria) e `pool` define o estoque (`race` para raça V4, `inv` para inventário);
  - `montage`: vários quadrados seguidos, com duração `boxLen`.
- **`MEME_CUES`**: `[ini, fim, categoria, prioridade]` em tempo da fala. A densidade (`poucos`=1, `medios`=2, `muitos`=3) filtra pela prioridade. O meme só entra onde não tem animação nem gameplay. Ele toca **até o fim**, limitado a **2,4s e no máximo 0,8s além da frase** (antes "passava do tempo"). O som do meme só toca em parte deles (`memeSom` 0.3 a 0.5).
- **Shots**: a linha do tempo é quebrada nos cortes. São 4 tipos:
  - `th`: ela falando, com zoom em degraus `[1, 1.12…]` e correção de cor (`quente` ou `vivo`);
  - `mo`: animação;
  - `box`: gameplay;
  - `meme`: meme.
- **Legenda (ASS/libass)**: Sniglet 100, grupos de até 3 palavras (12 caracteres), entrada em pop, posição y=1470, **sem legenda durante quadrado de gameplay ou meme**. Palavras-chave em **amarelo** (`HL`). Estilos:
  - `sombra`: sem contorno, só sombra. **O preferido.**
  - `faixa`: caixa escura.
- **Sons**: pacotes `y1`/`y2`/`y3` com sons do YouTube, em volume baixo:
  - clique leve ao entrar em animação;
  - pop nos itens dos cards;
  - **caixa registradora ou moeda só no preço** (fala "17,90" e card final);
  - vine boom opcional quando a gameplay dos itens entra;
  - som original do jogo nos quadrados que são gravação própria (os do YouTube não têm áudio).
- **Mixagem**: voz com `loudnorm I=-15`, sons alinhados pelo **pico** (`sfx_peaks.json` / `peakOf`), `alimiter`.
- **Saída**: H.264 CRF 19, AAC 192k, 1080x1920 a 30fps, `+faststart`.

Comandos (rodar dentro de `criativo\pipeline`):
```
node make_gen7.js            # (re)monta gen7.js a partir do gen6.js
node gen7.js --receitas      # escreve render/variacoes/_receitas_lote7.json (o app usa)
node gen7.js v61             # gera uma variação
node gen7.js all             # gera o lote inteiro (~4–5 min por vídeo de 80s)
```
As pastas temporárias `vt\<id>` (shots) e `stk\` (emojis) podem ser apagadas depois.

### 4.6 Revisor (`criativo\app`)
- `node server.js` sobe em **http://localhost:4317**, ou dê dois cliques em `Abrir revisor.bat`.
- Lê todos os `_receitas*.json` e mostra só as variações que têm mp4.
- Calcula as **características** de cada variação: abertura, cortes, ordem, duração, gancho, sons, reações, memes, som dos memes, quadrado do meme, raça V4 e inventário, cor, legenda, zoom, destaque, ritmo.
- **Abas:**
  - **Revisar:** player, aprovar/reprovar, estrelas de 1 a 5, motivos, texto, "marcar momento". Atalhos: A, R, 1-5, setas, M.
  - **Ranking:** ordena pela nota. Sem nota, aprovado vale 3,5 e reprovado 1,5.
  - **Aprendizado:** taxa de aprovação e média de estrelas por característica, mais o "seu criativo ideal".
- Salva em `feedback\feedback.json` e `feedback\preferencias.json`.
- Ao adicionar uma característica nova numa receita, coloque também em `variacoes()` no `server.js`.

### 4.7 Memes (`memecat.js`, `catalogo.json`)
- `memecat.js` gera as folhas numeradas do pack (V001… para vídeos, I001… para imagens).
- `catalogo.json` (curado depois do feedback de que "teve meme random") tem as categorias:
  - **triste**: V016 Lindinha chorando, V022 Bob Esponja, V073 Pedro Pascal, V053 menino chorando, I030
  - **espera**: V021 Mr. Bean, V096 cachorro com sono, V097 escritório
  - **frustrado**: V080 CJ, V094 Homer, V093 facepalm, I061 Homem-Aranha, I091 "this is fine"
  - **duvida**: V010 The Rock, V018 Kanye, I059 macaco olhando de lado, V051 Joey
  - **sucesso**: V066 brinde do Leo, I098 "perfect", V089 Bob joinha, I002 macaco joinha
  - **danca**: V025, V030, V104
  - **choque**: V007 Shaq, V013 IShowSpeed, V064, I022
- Cada categoria tem 1 ou 2 áudios do `sfx\youtube` (violino triste, grilos, ronco "mimimi", bruh, huh, sucesso, choque…).
- O recorte do meme é quadrado no centro (`min(iw,ih)`). Vídeo em loop se precisar. Imagem fica parada.

### 4.8 Estoque do YouTube (feito por 5 subagentes em paralelo)
- Busca: `yt-dlp --flat-playlist --print "%(duration)s | %(id)s | %(title)s" "ytsearch8:<termo>"`.
- Download só do vídeo: `-f "bv*[height<=1080][ext=mp4]"`.
- Folhas de contato com timestamp (`drawtext %{pts\:hms}`), escolha dos trechos olhando as folhas e corte com `-an`.
- Depois de cortar, os brutos foram **apagados**.
- Nem todo clipe do YouTube é limpo, porque muitos têm texto do youtuber por cima. O gerador usa uma **whitelist** (`YT_OK`):
  - CDK: `yt_b6Gqb4yiiF4_(z_1-5|x_1|x_5)`
  - Soul Guitar: `yt_0_OnhJ_uG_M_(z_5-9|x_4-7)`
  - Raça V4: só `M3V5GmdqLLI` (cinematográfico, sem interface)
  - Inventário: só `ypbBSUJsN44` + `conta_1` e `conta_3`
- **Direitos:** os clipes do YouTube e os sons de meme são de terceiros. Funcionam como referência. Para anúncio pago, o ideal é usar gravação própria.

---

## 5. O que o usuário aprendeu a gostar: regras que valem

Histórico condensado do feedback, de onde cada regra veio:

| Lote | Feedback principal | Regra resultante |
|---|---|---|
| 1 | "barulho de chupada" irritante (whoosh); v02 "mais rápido, gostosinho"; reordenar ficou "bugado"; v05 "seco, sem cores, lento"; v06 "começou de uma vez, sem hook"; v07 "tem que mostrar o produto"; v03 gostou do "barulho das compras" | **Sem whoosh.** Ordem original da fala. Cortes rápidos. Mais cor. Gancho mostrando o produto. Som de moeda ok |
| 2 | Emojis em excesso, mal posicionados nos cantos; raio e estrelinha feios; trombeta horrível; "muitos takes de vídeo"; notas 4 = v12, v18 (sem a frase B, destaque amarelo) | Poucos quadrados de gameplay (mais longos). Destaque **amarelo** |
| 3 (v25) | Memes do pack em quadrado: aprovado (4★), mas "memes meio random", "sons cagados", "muito som de compra no final" | Memes curados por contexto. **Um** som de compra |
| 4 | Pediu sons do YouTube; meme não precisa ter som sempre; **quadrado do meme sem 3D**; deixar o meme **completar**; **tirar emoji de vez**; **tirar contorno preto da legenda**; letra redonda nos cards pouco séria | Emoji = nunca. Meme flat e completo. Som em parte dos memes. Legenda sem contorno. Cards em Archivo Black |
| 5 | Notas 4: gostou da **legenda só com sombra** (v42) e do tempo dos memes; "cuidado com o tempo do meme que às vezes passa"; "clipes meio aleatórios"; "ali em itens" | Meme limitado a +0,8s da frase. Só clipes do YouTube limpos e certeiros |
| 6 | Sem feedback escrito ainda | |
| 7 | Vídeo base novo, mesmas regras; preço R$ 17,90 | Card `brand_cta3` |

**Receita "boa" atual** (ponto de partida para qualquer lote novo):
- Abre com o **site mobile em 3D** (1º segundo) e, logo depois, **gameplay da arma que ela citar** no momento em que fala o nome.
- Cortes rápidos (`gap 0.28`), ordem original. Pode pular 1 ou 2 frases de enchimento.
- Zoom em degraus `[1, 1.12]` ou `[1, 1.15]`, cor `vivo` ou `quente`.
- Legenda Sniglet **só com sombra**, destaque **amarelo** nas palavras-chave, **sem legenda durante quadrados**.
- **Memes** do pack curados, num quadrado **sem 3D**, centralizado, com ela desfocada atrás, tocando até o fim (≤ 2,4s). Som só em ~40% deles.
- **Gameplay** no quadrado **3D** com entradas animadas. Poucos takes. Raça V4 e inventário quando ela falar disso.
- Cards de marca sérios. Site de feedbacks quando ela falar de feedback. Card final com **SÓ R$ 17,90**.
- **Nunca:** whoosh, trombeta, emoji, contorno preto na legenda, preço 18,90, reordenar frases, memes aleatórios, clipe com texto de outro youtuber.
- **Out/2026 (feedback do dono):**
  - **Legenda:** sempre branca sem contorno e sem caixa ("faixa" é barrada pela checagem).
  - **"R$ 17,90" gigante solto na tela (`fx.precoGigante`):** REPROVADO ("ficou muito ruim").
  - **Gameplay:** tem que mostrar o AUGE do golpe/aura, não um momento aleatório (`fx.pico` + `moveset/_picos.json`).
  - **Gameplay em tela cheia (`fx.telaCheia`):** desligada, porque só 1 de 42 clipes do estoque fica limpo em tela cheia. Volta com gameplay própria gravada sem HUD.
  - **Som do meme:** tem que combinar com a imagem (curado por meme no catálogo).
  - **Linha sem UGC (voz em off, pausada):** o dono reprovou o vz04 porque os takes eram de avatares diferentes (um youtuber por clipe). Esse formato só funciona com UM avatar consistente, ou seja, gameplay própria. Retomar quando ela existir (ver pipeline/roteiros_curtos.md).

---

## 6. Como fazer

> Use a seção 0 (esteira). Os passos abaixo são o jeito antigo, mantido como referência.
> - Novo lote: `node novo_lote.js base2`, depois `node motor.js base2 <N> all`, ou "Gerar lote" → "Renderizar" no app.
> - Novo vídeo: copie para a pasta de dados e rode `node novo_projeto.js base3 <video>`. Confira a linha do tempo no app ("Editar projeto" se quiser ajustar) e gere o lote.
> - Regra nova: se for de render, mude o `motor.js` e rode `tests/equivalencia.js` para ver o que mudou. Se for uma regra "nunca", entra em `qualidade.js`. Se for de edição, vai no prompt do `novo_projeto.js`.

### 6.1 Novo lote com o mesmo vídeo base (antigo)
1. Leia `criativo\feedback\feedback.json` (só os ids do último lote) e `preferencias.json`.
2. `copy make_gen7.js make_gen8.js`. No novo arquivo:
   - troque a fonte para `gen7.js`;
   - substitua o bloco de receitas (`// ---------- receitas do lote 7` até `\n];`) por v71…v80;
   - troque `lote:7`→`lote:8`, `_receitas_lote7`→`_receitas_lote8` e `_resumo_lote7_`→`_resumo_lote8_`.
   - Ajuste regras novas com `rep(...)`.
3. `node make_gen8.js && node gen8.js --receitas && node gen8.js v71`. Confira com uma folha de contato:
   `ffmpeg -i criativo_v71.mp4 -vf "fps=1.5,scale=120:213,tile=13x10" -frames:v 1 folha.png`
4. `node gen8.js all`, em segundo plano. Se o servidor do app já estiver ligado, basta atualizar a página.

### 6.2 Novo vídeo base
1. `ffmpeg -i <video>` para conferir a resolução (o esperado é 1080x1920 a 30fps) e a duração.
2. `node stt.mjs <video> baseN_words.json Xenova/whisper-small`. Leia o texto e as palavras com tempo.
3. Num `make_genN.js` novo, baseado no `make_gen7.js`, troque:
   - `BASE` e o arquivo de palavras;
   - `FIX` (nomes errados);
   - `SENT` (frases);
   - `SRC_END` e `ALLS`;
   - `DIR` (o que mostrar em cada fala: site no começo, arma quando citar, card de marca quando falar "Basic-Build", raça V4/inventário, entrega automática, feedbacks, CTA no fim);
   - `MEME_CUES` (dores e emoções da fala → categoria);
   - `HL` (palavras-chave);
   - o tempo do som de moeda (palavra do preço).
4. Se precisar, crie cenas novas em `scenes.json` e `render_motion.js`.
5. Gere 1 de teste, confira e gere o lote.

### 6.3 Novos clipes de gameplay próprios
Grave (o ideal é ultrawide 3440x1440, com o painel de skills visível) e rode `scan2.js` → `events.js` → `cut.js`. Se a resolução for outra, as coordenadas do painel em `scan2.js` precisam ser medidas de novo (olhe um frame).

---

## 7. Problemas conhecidos

- **Pouca memória:** o Claude Code mata processos em segundo plano quando o PC fica sem RAM (cerca de 4 GB livres de 16). Gere **um lote por vez**, de forma sequencial, e feche o navegador pesado. Se cair, gere só os ids que faltaram (`node gen7.js v65,v66`).
- **SSL no yt-dlp:** use `--no-check-certificates` (Cloudflare WARP).
- **Vídeos do YouTube corrompidos:** `MoDaHnxQV8M` veio estragado duas vezes. Descartado.
- **Escape em scripts:** gerar JS via heredoc no Git Bash quebra `\\`. Escreva os arquivos com o editor (Write/Edit) em vez de `cat <<EOF` ou `sed` com barras.
- **Clipes do YouTube sem áudio:** o gerador não extrai som deles (`isYT`).
- **Draco V4:** não há clipe. Inventário com míticas é escasso; **o ideal é o usuário gravar o próprio inventário.**
- **Preço:** cenas antigas (`site_top`, `site_cta`, `brand_cta`) mostram R$ 18,90. Use `site_top2` e `brand_cta3`. A checagem de qualidade barra essas cenas, por isso as receitas antigas do `base1` (lote 6) não renderizam mais pelo motor.
- **Estoque refeito do YouTube (08/out/2026):** as gravações próprias (`07-52-54_*`, `08-01-35_*`) não estavam nesta máquina. O estoque atual tem 50 clipes do YouTube, todos conferidos frame a frame. O inventário é a lista da loja de frutas (versão antiga do jogo), não um inventário de verdade, e 6 clipes de raça estão em câmera lenta (1,1–1,5x). CDK X e o showcase de Godhuman têm poucos clipes. **Gravação própria continua sendo o ideal** (som do jogo, direitos, inventário real).
- **Saturação medida não serve para saber a cor:** "vivo" e "quente" dão 20–22 de SATAVG, porque as inserções dominam a imagem. Quem julga a cor de uma referência é o Claude, olhando os frames.
- **`claude -p --bare` não funciona aqui** (não lê o login). O `ia.js` usa `--tools "" --strict-mcp-config` para a chamada ficar leve (~3k tokens de contexto).
