# Olá Studio Pro 2.0 — ambiente protegido

## Estado desta entrega

O Olá Studio foi adicionado como uma aplicação estática separada em `/estudio/`, sem publicação nem ativação pública. A feature flag nasce desativada e o acesso de desenvolvimento exige:

1. usuário autenticado no Firebase;
2. perfil `master` em `usuariosByUid/{uid}`;
3. acesso pelo atalho protegido do Painel Admin, que inclui `?preview=1`.

O frontend não executa FFmpeg. Ele envia os arquivos diretamente ao Firebase Storage, registra o projeto e coloca um trabalho na fila da Realtime Database. Um worker Docker independente reclama o trabalho, renderiza e devolve o MP4 ao Storage.

## Fluxo funcional

`Upload direto → studioProjects → studioJobs → worker Docker → FFprobe/análise técnica → plano JSON → FFmpeg → Storage → prévia/download`

O planejador atual é identificado no JSON como `deterministic-technical`. Ele usa mudanças de cena, duração, presença de áudio e silêncio. Ele não é apresentado como análise semântica de IA. O plano de edição está na versão 3 e registra cenas, transições, camadas de texto, animações, logo, áudio, legendas e parâmetros de exportação.

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

A fila é consultada pela API REST autenticada do Firebase. A reserva usa ETag e `If-Match`, evitando que dois workers processem o mesmo trabalho. Leituras externas têm tempo limite para que uma conexão iniciada antes da rede do contêiner ficar pronta não bloqueie o worker indefinidamente.

## O que o motor faz

- lê streams e duração com FFprobe;
- detecta mudanças de cena e silêncios;
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

O usuário pode escolher posição, tamanho, cor principal, cor de destaque e fornecer nomes próprios como contexto. Se o binário ou o modelo não estiver disponível, o provedor retorna `disabled` e não inventa conteúdo. A edição manual da transcrição antes da renderização e o diretor semântico por IA continuam reservados para as próximas etapas.

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

Os testes da Fase 2 validam também a faixa ASS dinâmica, a música com ducking e fades, além de uma transcrição completa executada pelo modelo Whisper local com timestamps por palavra.

```powershell
$env:STUDIO_INTEGRATION = "1"
docker compose -f studio-worker/docker-compose.yml run --rm -e STUDIO_INTEGRATION=1 ola-studio-worker node --test test/phase1-render.integration.test.mjs test/phase2-audio-captions.integration.test.mjs test/phase2-transcription.integration.test.mjs
```

O teste usa apenas mídias sintéticas temporárias e as remove ao terminar; nenhum dado demonstrativo é gravado no Firebase.

## Fases ainda não concluídas

- revisão e edição manual da transcrição antes da renderização final;
- detecção técnica de desfoque, escuridão, tremor e duplicidade;
- sincronização de cortes com batidas e biblioteca licenciada de músicas;
- diretor semântico por IA configurável;
- timeline visual, prévia de baixa resolução e histórico completo de versões.

Esses itens permanecem explicitamente fora da interface funcional até possuírem processamento real e testes próprios.

## Preparação comercial

Os caminhos `studioCredits`, `studioCreditLedger`, `studioUsage` e `studioAdminCosts` já estão isolados. O MVP registra estimativa e consumo com valor financeiro zero. Mercado Pago e Asaas não são chamados. A futura cobrança deverá reservar créditos antes da fila, consumir após sucesso e estornar automaticamente em falhas.
