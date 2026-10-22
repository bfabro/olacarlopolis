# Olá Studio Pro 2.0 — ambiente protegido

## Estado desta entrega

O Olá Studio foi adicionado como uma aplicação estática separada em `/estudio/`, sem publicação nem ativação pública. A feature flag nasce desativada e o acesso de desenvolvimento exige:

1. usuário autenticado no Firebase;
2. perfil `master` em `usuariosByUid/{uid}`;
3. acesso pelo atalho protegido do Painel Admin, que inclui `?preview=1`.

O frontend não executa FFmpeg. Ele envia os arquivos diretamente ao Firebase Storage, registra o projeto e coloca um trabalho na fila da Realtime Database. Um worker Docker independente reclama o trabalho, renderiza e devolve o MP4 ao Storage.

## Fluxo funcional

`Upload direto → studioProjects → studioJobs → worker Docker → FFprobe/análise técnica → plano JSON local ou direção semântica opcional → editor visual → prévia reduzida ou FFmpeg Full HD → Storage → histórico/download`

O planejador local é identificado no JSON como `deterministic-technical`. Ele usa mudanças de cena, duração, presença de áudio, silêncio, exposição e movimento medidos pelo FFmpeg. Ele não é apresentado como análise semântica de IA. O plano de edição está na versão 6 e registra cenas, evidências técnicas, estrutura narrativa, ritmo, transições, camadas de texto, animações, logo, áudio, legendas, direção solicitada e parâmetros de exportação.

O Diretor por IA é uma escolha explícita do usuário. Quando configurado no worker, ele envia à API somente um conjunto limitado de quadros representativos, medições técnicas e transcrições locais, solicita uma resposta JSON estrita e mescla a direção recebida ao plano técnico já validado. A chave nunca vai ao navegador. Se a configuração estiver ausente, a API falhar ou a resposta for inválida, o trabalho continua pelo motor local e o resultado informa claramente o fallback.

## Aplicar configuração de desenvolvimento

As regras alteradas são `database.rules.json` e `storage.rules`. Antes de testar com dados reais, revise e publique somente essas regras no projeto Firebase correto. A configuração inicial da feature flag está em `migrations/2026-10-21_v9_ola-studio.json`; ela mantém `enabled: false`.

Nenhuma publicação é feita automaticamente por esta entrega.

## Executar o frontend local

Sirva a raiz do repositório por HTTP. Exemplo com uma ferramenta já disponível no computador:

```powershell
npx serve .
```

Abra `http://localhost:3000/estudio/?preview=1`. O domínio local precisa estar autorizado no Firebase Authentication. Entre com o Admin Master.

## Executar o worker

Pré-requisitos: Docker Desktop e um arquivo de service account do Firebase mantido fora do repositório.

```powershell
$env:FIREBASE_SERVICE_ACCOUNT_FILE = "C:\caminho-seguro\firebase-service-account.json"
docker compose -f studio-worker/docker-compose.yml up --build
```

O contêiner instala FFmpeg/FFprobe e limita o processo a 2 CPUs e 4 GB de RAM. O arquivo de credencial é montado somente para leitura. Nunca adicione essa credencial ao Git.

Variáveis opcionais:

- `FIREBASE_DATABASE_URL`
- `FIREBASE_STORAGE_BUCKET`
- `STUDIO_STARTUP_DELAY_MS`
- `STUDIO_POLL_INTERVAL_MS`
- `STUDIO_DATABASE_TIMEOUT_MS`
- `STUDIO_MAX_ATTEMPTS`
- `STUDIO_WORKER_ID`
- `STUDIO_FONT_FILE`
- `STUDIO_WHISPER_PATH`
- `STUDIO_WHISPER_MODEL`
- `STUDIO_WHISPER_THREADS`
- `STUDIO_WHISPER_WORD_THRESHOLD`
- `OPENAI_API_KEY` (somente no ambiente seguro do worker)
- `STUDIO_OPENAI_MODEL` (obrigatório junto com a chave; não há modelo presumido)
- `STUDIO_AI_TIMEOUT_MS`

A fila é consultada pela API REST autenticada do Firebase. A reserva usa ETag e `If-Match`, evitando que dois workers processem o mesmo trabalho. Leituras externas têm tempo limite para que uma conexão iniciada antes da rede do contêiner ficar pronta não bloqueie o worker indefinidamente.

## O que o motor faz

- lê streams e duração com FFprobe;
- detecta mudanças de cena, silêncios, trechos escuros, congelados, desfocados e tremidos;
- mede nitidez por quadro e estabilidade por vetores reais de movimento do FFmpeg;
- pontua janelas técnicas e prioriza trechos melhores, mantendo diversidade de arquivos;
- organiza a montagem em abertura, desenvolvimento e encerramento sem inventar interpretação semântica;
- analisa a energia PCM da música, estima BPM e alinha cortes às batidas quando solicitado;
- preserva cenas com fala do ajuste automático à batida;
- oferece oito modelos: Institucional, Comercial, Reels, Comércio local, Imóveis, Gastronomia, Eventos e Turismo;
- cria cortes mínimos diferentes conforme o modelo selecionado;
- normaliza todo material para a proporção escolhida com `scale + crop`, sem deformar;
- cria áudio silencioso quando uma cena não possui áudio;
- oferece modo automático e doze transições selecionáveis: Fade, Cross Dissolve, Zoom In, Zoom Out, Slide, Wipe, Blur, Whip Pan, Flash, Match Cut técnico, Hard Cut e Dip to Black;
- aplica `xfade`, `zoompan`, `concat` e `acrossfade` conforme a transição;
- compõe transições de forma incremental, mantendo somente duas cenas na memória por etapa;
- normaliza áudio com `loudnorm`;
- permite ajustar globalmente o volume da voz e aplicar redução moderada de ruído contínuo;
- reduz a música durante o áudio principal com `sidechaincompress`;
- permite ajustar o volume e os fades de entrada e saída da música;
- compõe título, subtítulo, descrição, nome/cargo, oferta, chamada promocional, encerramento e CTA em camadas temporizadas;
- oferece seis estilos visuais e oito animações de texto: Fade, Slide Up, Slide Down, Typewriter, Zoom Pop, Bounce suave, Revelação e Palavra por palavra;
- permite configurar tamanho, cor, posição e fundo semitransparente dos textos;
- apresenta a logo no encerramento com tempo e tamanho definidos no plano;
- exporta H.264/AAC com `faststart`.

## Transcrição e legendas

O worker compila `whisper.cpp` v1.7.5 e executa localmente o modelo `ggml-tiny`, sem enviar o áudio a serviços externos. A composição pronta é convertida para PCM mono de 16 kHz e transcrita em português; assim os tempos permanecem alinhados mesmo depois dos cortes e transições.

Há dois modos reais de legenda incorporada ao MP4:

- tradicional, agrupada por frase;
- dinâmica, em ASS, com destaque progressivo de cada palavra conforme os timestamps do Whisper.

O usuário pode escolher posição, tamanho, cor principal, cor de destaque e fornecer nomes próprios como contexto. Se o binário ou o modelo não estiver disponível, o provedor retorna `disabled` e não inventa conteúdo. Na direção semântica, a transcrição local pode ser usada como evidência, mas continua opcional.

## Diretor por IA opcional

O modo padrão permanece `local`. Para habilitar o modo semântico em um ambiente protegido, configure `OPENAI_API_KEY` e `STUDIO_OPENAI_MODEL` somente no processo do worker e recrie o contêiner. A requisição usa a Responses API com Structured Outputs, `strict: true` e `store: false`. Nenhuma chave, custo ou chamada externa é ativada automaticamente por esta entrega.

O resultado registra provedor, modelo, uso retornado pela API, quantidade de quadros/transcrições e se houve fallback. O plano técnico continua sendo a fonte de durações e limites de renderização; a IA escolhe apenas candidatos reais previamente extraídos e não pode inventar uma mídia inexistente.

## Editor visual e versões

Projetos concluídos possuem a ação **Editar**. O navegador lê o plano JSON privado diretamente do Storage autenticado e apresenta:

- prévia reproduzível da última exportação ou da prévia reduzida;
- timeline com miniaturas dos arquivos reais;
- ordem das cenas;
- duração individual entre 0,5 e 15 segundos;
- transição de cada corte;
- título, subtítulo e chamada final;
- forma de onda calculada a partir do áudio real das mídias ou da música selecionada;
- camadas adicionais de texto com conteúdo, intervalo, posição e animação editáveis;
- comando para criar uma nova montagem automática preservando as versões anteriores;
- duração total recalculada considerando as sobreposições;
- histórico preservado das exportações.

O frontend nunca grava arquivos na pasta de renders. Ele envia uma cópia do plano editado ao trabalho privado da fila. O worker verifica novamente IDs de origem, limites, transições, tempos e duração total antes de executar FFmpeg. A prévia rápida usa exatamente esse plano em 360 × 640, 640 × 360 ou 480 × 480, com codificação acelerada; a exportação final mantém Full HD. Uma prévia cancelada ou com falha não remove o último vídeo final do projeto.

Quando a opção de revisão está ativa, o primeiro processamento pausa em `awaiting_review` depois da transcrição. A interface apresenta cada trecho com seus tempos reais e permite corrigir ou remover o texto. Ao aprovar, o mesmo trabalho retorna à fila, reutiliza os originais privados e renderiza o MP4 com a versão revisada. Palavras alteradas recebem distribuição temporal limitada ao próprio trecho; nenhuma palavra adicional é criada pelo worker.

## Limites e retenção

- 10 mídias por projeto;
- 250 MB por vídeo;
- 20 MB por imagem;
- 8 MB para a logo;
- 1 GB por projeto;
- saída de até 90 segundos;
- um processamento simultâneo por usuário no frontend;
- retenção registrada para 30 dias;
- originais não são apagados pelo worker.

A exclusão automática ainda não está ativa. Ela deve ser implementada como tarefa separada, com aviso e trilha de auditoria antes de remover qualquer original.

## Validação da composição profissional

O teste `studio-worker/test/phase1-render.integration.test.mjs` executa FFmpeg real dentro do Docker. Ele renderiza as doze transições, gera um MP4 vertical 1080 × 1920 com textos animados em português e logo, e valida resolução, duração e existência do arquivo final.

Os testes da Fase 2 validam também a faixa ASS dinâmica, a música com ducking e fades, além de uma transcrição completa executada pelo modelo Whisper local com timestamps por palavra. O teste da Fase 3 cria mídias sintéticas temporárias, confirma a rejeição de trecho escuro/congelado, detecta pulsos de 120 BPM e exporta um MP4 com o plano técnico escolhido. O teste da Fase 4 extrai quadros reais com FFmpeg, simula apenas a resposta estruturada do provedor sem consumir API paga, valida o plano semântico e exporta o MP4 resultante. O teste da Fase 5 altera texto, camadas adicionais, ordem, duração e transição no mesmo plano, calcula a forma de onda do áudio real, gera uma prévia reduzida e uma exportação Full HD e compara duração e conteúdo estruturado entre as duas.

```powershell
$env:STUDIO_INTEGRATION = "1"
docker compose -f studio-worker/docker-compose.yml run --rm -e STUDIO_INTEGRATION=1 ola-studio-worker node --test test/phase1-render.integration.test.mjs test/phase2-audio-captions.integration.test.mjs test/phase2-transcription.integration.test.mjs test/phase2-review-workflow.integration.test.mjs test/phase3-analysis.integration.test.mjs test/phase4-ai-director.integration.test.mjs test/phase5-editor.integration.test.mjs
```

O teste usa apenas mídias sintéticas temporárias e as remove ao terminar; nenhum dado demonstrativo é gravado no Firebase.

## Fases ainda não concluídas

- calibração contínua dos limiares de desfoque e tremor com vídeos reais de diferentes aparelhos;
- biblioteca licenciada de músicas;
- avaliação de custo/qualidade do Diretor por IA com um modelo de produção escolhido pelo responsável (a integração existe, mas permanece sem credencial e sem modelo por padrão);
- ajuste por arraste das bordas dos clipes e edição visual da mixagem de áudio diretamente na timeline.

Esses itens permanecem explicitamente fora da interface funcional até possuírem processamento real e testes próprios.

## Preparação comercial

Os caminhos `studioCredits`, `studioCreditLedger`, `studioUsage` e `studioAdminCosts` já estão isolados. O MVP registra estimativa e consumo com valor financeiro zero. Mercado Pago e Asaas não são chamados. A futura cobrança deverá reservar créditos antes da fila, consumir após sucesso e estornar automaticamente em falhas.
