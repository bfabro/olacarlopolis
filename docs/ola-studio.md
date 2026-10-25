# Olá Studio Pro 2.0 — ambiente protegido

## Estado desta entrega

O Olá Studio foi adicionado como uma aplicação estática separada em `/estudio/`, sem publicação nem ativação pública. A feature flag nasce desativada e o acesso de desenvolvimento exige:

1. usuário autenticado no Firebase;
2. perfil `master` em `usuariosByUid/{uid}`;
3. acesso pelo atalho protegido do Painel Admin, que inclui `?preview=1`.

O frontend não executa FFmpeg. Ele envia os arquivos diretamente ao Firebase Storage, registra o projeto e coloca um trabalho na fila da Realtime Database. Um worker Docker independente reclama o trabalho, renderiza e devolve o MP4 ao Storage.

## Fluxo funcional

`Upload direto → studioProjects → studioJobs → worker Docker → FFprobe/análise técnica → plano JSON local ou direção semântica opcional → editor visual → prévia reduzida ou FFmpeg Full HD → Storage → histórico/download`

O planejador local é identificado no JSON como `deterministic-technical`. Ele usa mudanças de cena, duração, presença de áudio, silêncio, exposição e movimento medidos pelo FFmpeg. Ele não é apresentado como análise semântica de IA. O plano de edição está na versão 8 e registra cenas, evidências técnicas, estrutura narrativa, ritmo, transições, camadas de texto, animações, logo, áudio, legendas, direção solicitada e parâmetros de exportação.

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
$env:AVG_WEB_SHIELD_CA_FILE = "C:\caminho-seguro\avg-web-shield-root.pem"
docker build --secret id=avg_web_shield_ca,src="$env:AVG_WEB_SHIELD_CA_FILE" -f studio-worker/Dockerfile -t ola-studio-worker:local-v46 .
docker compose --env-file studio-worker/.env -f studio-worker/docker-compose.yml up -d --no-build
```

O contêiner instala FFmpeg/FFprobe e limita o processo a 2 CPUs e 4 GB de RAM. A credencial e o certificado local são montados somente para leitura. O certificado também é entregue ao BuildKit como segredo temporário para o `npm install`, sem ser incorporado à imagem e sem desativar a verificação TLS. Nunca adicione a credencial ou o certificado ao Git. A compilação direta evita uma incompatibilidade observada entre Docker Compose Bake, segredos locais e caminhos do Windows; o Compose continua responsável por iniciar o worker já compilado.

No Diretor de IA avançado, a fala humana detectada ativa automaticamente a transcrição e as legendas, mesmo sem seleção manual do campo de legendas. Os cortes escolhidos são normalizados pela ordem dos arquivos e pelo tempo original de cada gravação para preservar a sequência cronológica; a composição final é transcrita novamente para sincronizar a legenda com os cortes efetivamente renderizados.

Variáveis opcionais:

- `FIREBASE_DATABASE_URL`
- `FIREBASE_STORAGE_BUCKET`
- `AVG_WEB_SHIELD_CA_FILE` (certificado raiz local usado somente quando há inspeção HTTPS, como o Web Shield do AVG)
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
- `STUDIO_OPENAI_MODEL` (padrão protegido: `gpt-6-luna`; só é usado quando existe `OPENAI_API_KEY`)
- `STUDIO_AI_TIMEOUT_MS`
- `STUDIO_AI_MAX_FRAMES` (padrão 6)
- `STUDIO_ADVANCED_DIRECTOR_ENABLED` (`false` por padrão)
- `STUDIO_ADVANCED_AI_MAX_FRAMES` (padrão 12, máximo 18)
- `STUDIO_RENDER_QUALITY_ENABLED` (`true` por padrão)
- `STUDIO_AI_IMAGE_DETAIL` (`low` por padrão ou `high`)
- `STUDIO_AI_INPUT_USD_PER_MILLION` e `STUDIO_AI_OUTPUT_USD_PER_MILLION` para a estimativa auditável de custo

A fila é consultada pela API REST autenticada do Firebase. A reserva usa ETag e `If-Match`, evitando que dois workers processem o mesmo trabalho. Leituras externas têm tempo limite para que uma conexão iniciada antes da rede do contêiner ficar pronta não bloqueie o worker indefinidamente.

## O que o motor faz

- lê streams e duração com FFprobe;
- detecta mudanças de cena, silêncios, trechos escuros, congelados, desfocados e tremidos;
- mede nitidez por quadro e estabilidade por vetores reais de movimento do FFmpeg;
- adapta os limiares de exposição, movimento e desfoque aos percentis de cada vídeo, sempre dentro de faixas seguras;
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
- compõe todas as transições em um único grafo do FFmpeg, sem recodificar repetidamente o trecho acumulado;
- usa codificação intermediária acelerada e preserva o perfil escolhido na exportação final;
- normaliza áudio com `loudnorm`;
- permite ajustar globalmente o volume da voz e aplicar redução moderada de ruído contínuo;
- reduz a música durante o áudio principal com `sidechaincompress`;
- permite ajustar o volume e os fades de entrada e saída da música;
- oferece três trilhas instrumentais originais geradas localmente pelo FFmpeg, sem incorporar obras de terceiros;
- oferece efeitos originais Suave, Impacto e Brilho sincronizados às transições;
- dá prioridade ao arquivo musical enviado pelo usuário quando ele escolhe uma trilha própria licenciada;
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

Quando a narração por IA está ativa, o Studio usa uma trilha híbrida. Cenas com fala humana preservam o áudio original e exibem somente a transcrição sincronizada; descrições automáticas não são sobrepostas a esses trechos. A IA identifica cenas com pessoa visível e só cria voz e legenda descritiva para cenas sem fala e sem pessoa. A agenda da locução respeita as janelas silenciosas detectadas e combina a legenda humana e a legenda narrada em uma única faixa ASS ordenada.

Fotos JPEG, PNG e WebP podem ser inseridas na mesma sequência dos vídeos. Cada imagem vira uma cena real, com duração e posição ajustáveis no editor, sem substituição por conteúdo demonstrativo.

O usuário pode escolher posição, tamanho, cor principal, cor de destaque e fornecer nomes próprios como contexto. Se o binário ou o modelo não estiver disponível, o provedor retorna `disabled` e não inventa conteúdo. Na direção semântica, a transcrição local pode ser usada como evidência, mas continua opcional.

## Diretor por IA opcional

O modo padrão permanece `local`. Para habilitar o modo semântico em um ambiente protegido, configure `OPENAI_API_KEY` somente no processo do worker e recrie o contêiner. O modelo padrão recomendado é `gpt-6-luna`, adequado ao fluxo de alto volume e baixo custo; ele pode ser substituído por `STUDIO_OPENAI_MODEL`. A requisição usa a Responses API com Structured Outputs, `strict: true`, `store: false`, no máximo seis quadros e detalhe visual baixo por padrão. Nenhuma chave, cobrança ou chamada externa é ativada automaticamente por esta entrega.

O resultado registra provedor, modelo, uso retornado pela API, estimativa de custo em dólar, quantidade de quadros/transcrições e se houve fallback. A estimativa utiliza somente os tokens efetivamente retornados pelo provedor e as tarifas configuradas no worker. O plano técnico continua sendo a fonte de durações e limites de renderização; a IA escolhe apenas candidatos reais previamente extraídos e não pode inventar uma mídia inexistente.

Quando **Criar roteiro e textos por cena** está ativo, a resposta estruturada também traz um texto curto factual para cada cena e um roteiro limitado à duração escolhida. Campos sem evidência segura ficam vazios. A opção **Narrar o roteiro com voz de IA** envia somente o roteiro aprovado pelo plano ao endpoint de voz, usa `STUDIO_OPENAI_TTS_MODEL` (por padrão `gpt-4o-mini-tts`) e oferece as vozes `marin` e `cedar`. Durante a locução, o FFmpeg reduz música e áudio original por sidechain e mistura a voz sem remover os originais.

A interface identifica explicitamente a locução como voz gerada por inteligência artificial. O custo da direção e o custo da voz são registrados separadamente. Como a API de voz não retorna a mesma contagem de tokens da Responses API, o Studio mede a duração real do WAV, registra caracteres e calcula uma estimativa usando `STUDIO_TTS_USD_PER_MINUTE` (padrão atual: US$ 0,015/minuto). A tarifa permanece configurável para acompanhar mudanças do provedor; o valor exato deve ser conferido no painel de uso da conta.

A preparação visual tenta primeiro o ponto técnico selecionado de cada vídeo e, se necessário, tenta novamente o início da mídia. Quando um arquivo isolado ainda não produz um quadro válido, somente essa evidência é ignorada; as demais mídias e transcrições continuam disponíveis para a direção semântica. O trabalho só usa fallback local quando a própria direção por IA não pode ser concluída ou validada.

A tela de processamento apresenta um histórico persistido no próprio trabalho, com horário, etapa, avisos, códigos de suporte e detalhes compreensíveis. Mensagens destinadas ao usuário não exibem chaves, caminhos temporários nem respostas brutas do provedor. O histórico permanece disponível ao reabrir um vídeo concluído.

A versão própria do Olá Studio é exibida nas telas de acesso, na barra superior e na marca lateral. Toda alteração do Studio deve incrementar esse identificador junto das versões gerais do site, painel e service worker.

A autenticação solicita persistência local explícita ao Firebase. Se a sessão terminar ou o usuário sair durante uma renderização, o worker continua processando no servidor. Depois de entrar novamente, o Studio busca o projeto ativo do próprio usuário, reconecta ao job e reabre automaticamente o andamento e seu histórico. Os cards ativos também oferecem a ação **Acompanhar**. O progresso não é exposto sem autenticação.

O processamento mostra tempo decorrido, uma faixa dinâmica de tempo restante e a previsão total. A estimativa combina o progresso atual com a mediana histórica de segundos por unidade de processamento do próprio usuário; por isso é apresentada como faixa, nunca como promessa exata. Ao concluir, o tempo total real substitui a previsão.

Os detalhes de consumo distinguem créditos estimados de processamento, débito efetivo e custo estimado do provedor de IA. Enquanto a cobrança estiver desativada, o ledger registra `amount: 0`, ainda que exiba os créditos calculados. Quando o Diretor de IA é aplicado, a tela informa modelo, tokens retornados pelo provedor e custo estimado em dólar, sem expor a chave da API.

## Editor visual e versões

Projetos concluídos possuem a ação **Editar**. O navegador lê o plano JSON privado diretamente do Storage autenticado e apresenta:

- prévia reproduzível da última exportação ou da prévia reduzida;
- seleção de 24, 30 ou 60 FPS e perfis de bitrate compacto, equilibrado ou alto;
- timeline com miniaturas dos arquivos reais;
- ordem das cenas;
- duração individual entre 0,5 e 15 segundos;
- transição de cada corte e duração individual da sobreposição, limitada automaticamente pela duração das duas cenas;
- título, subtítulo e chamada final;
- forma de onda calculada a partir do áudio real das mídias ou da música selecionada;
- recorte do início e do fim de cada vídeo por alças na timeline;
- mixagem de voz e música, fades, redução moderada de ruído e ducking configuráveis;
- camadas adicionais de texto com conteúdo, intervalo, posição e animação editáveis;
- fonte, tamanho, cor, contorno, alinhamento, fundo e margem ajustáveis nos textos;
- comando para criar uma nova montagem automática preservando as versões anteriores;
- duração total recalculada considerando as sobreposições;
- histórico preservado das exportações, com reprodução e download individual;
- restauração segura do plano JSON de qualquer versão anterior para continuar a edição e gerar uma nova versão sem sobrescrever os renders existentes;
- resumo técnico por versão com duração, quantidade de cenas, FPS e perfil de qualidade.

O frontend nunca grava arquivos na pasta de renders. Ele envia uma cópia do plano editado ao trabalho privado da fila. O worker verifica novamente IDs de origem, limites, transições, tempos e duração total antes de executar FFmpeg. A prévia rápida usa exatamente esse plano em 360 × 640, 640 × 360 ou 480 × 480, com codificação acelerada; a exportação final mantém Full HD. Uma prévia cancelada ou com falha não remove o último vídeo final do projeto.

As configurações de exportação também pertencem ao plano versionado. O usuário pode escolher 24, 30 ou 60 FPS e os perfis Compacto (4,5 Mbps), Equilibrado (8 Mbps) ou Alto (12 Mbps). O worker não aceita valores livres: normaliza a configuração para H.264/AAC e aplica limites de bitrate, buffer e áudio conhecidos. A estimativa de processamento considera resolução, FPS, qualidade, estilo e legendas, mas a cobrança permanece desativada.

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
- nenhum arquivo é removido automaticamente;
- projetos inativos podem ser excluídos manualmente em **Meus projetos**, sempre após confirmação explícita.

A exclusão manual remove somente os originais, logos, músicas, planos e renders pertencentes ao projeto confirmado. O worker confere o usuário, o projeto, o token da confirmação e a ausência de outro processamento ativo antes de agir. O registro financeiro de auditoria é preservado sem cobrança. A operação é permanente e idempotente: se houver uma falha parcial, ela pode ser solicitada novamente com segurança. A exclusão automática continua desativada e não deve ser ativada sem aviso prévio e uma política aprovada.

## Validação da composição profissional

O teste `studio-worker/test/phase1-render.integration.test.mjs` executa FFmpeg real dentro do Docker. Ele renderiza as doze transições, gera um MP4 vertical 1080 × 1920 com textos animados em português e logo, e valida resolução, duração e existência do arquivo final.

Os testes da Fase 2 validam também a faixa ASS dinâmica, a música com ducking e fades, além de uma transcrição completa executada pelo modelo Whisper local com timestamps por palavra. O teste da Fase 3 cria mídias sintéticas temporárias, confirma a rejeição de trecho escuro/congelado, detecta pulsos de 120 BPM e exporta um MP4 com o plano técnico escolhido. O teste da Fase 4 extrai quadros reais com FFmpeg, simula apenas a resposta estruturada do provedor sem consumir API paga, valida o plano semântico e exporta o MP4 resultante. O teste da Fase 5 altera texto, camadas adicionais, ordem, duração e transição no mesmo plano, calcula a forma de onda do áudio real, gera uma prévia reduzida e uma exportação Full HD e compara duração e conteúdo estruturado entre as duas. O teste da Fase 6 gera uma trilha e efeitos originais, mistura-os ao áudio principal e confirma vídeo, áudio, resolução e duração no MP4 final. O teste da Fase 7 cobre os dez critérios finais em uma montagem de cinco vídeos e 30 segundos: título animado, texto de cena, logo, legenda, música com ducking, transições, prévia, Full HD e nova renderização após editar o título. O teste da Fase 8 confirma a agenda de narração somente em janelas sem fala/pessoa, a união das legendas humanas e narradas e a preservação da música de fundo.

```powershell
$env:STUDIO_INTEGRATION = "1"
docker compose -f studio-worker/docker-compose.yml run --rm -e STUDIO_INTEGRATION=1 ola-studio-worker node --test test/phase1-render.integration.test.mjs test/phase2-audio-captions.integration.test.mjs test/phase2-transcription.integration.test.mjs test/phase2-review-workflow.integration.test.mjs test/phase3-analysis.integration.test.mjs test/phase4-ai-director.integration.test.mjs test/phase5-editor.integration.test.mjs test/phase6-sound-library.integration.test.mjs test/phase7-acceptance.integration.test.mjs test/phase8-narration-timeline.integration.test.mjs test/phase9-advanced-director.test.mjs
```

Os testes usam mídias temporárias e as removem ao terminar; nenhum dado demonstrativo é gravado no Firebase. Para calibrar sem alterar os arquivos reais ou o Firebase, monte uma pasta de vídeos em modo somente leitura e execute:

```powershell
docker run --rm --mount "type=bind,source=C:\pasta\dos\videos,target=/calibration,readonly" ola-studio-worker:local-v30 node scripts/calibrate-media.mjs /calibration
docker run --rm --mount "type=bind,source=C:\pasta\dos\videos,target=/calibration,readonly" ola-studio-worker:local-v30 node scripts/validate-real-media.mjs /calibration
```

Em 22/10/2026, a calibração local analisou seis vídeos reais (97,094 s, um vertical e cinco horizontais) e 99 janelas. Na validação final, cinco vídeos reais (82,416 s de origem) geraram uma prévia vertical de 30 s, 360 × 640, com doze cenas, vídeo e áudio. O teste automatizado adicional exportou os mesmos 30 s em Full HD 1080 × 1920 e confirmou todos os critérios de aceitação. Os arquivos originais permaneceram somente leitura e os resultados temporários foram removidos após a verificação.

## Validações externas ainda necessárias

- ampliar periodicamente a calibração com vídeos de outros aparelhos, ambientes escuros e movimentos mais intensos;
- executar uma avaliação semântica paga com a credencial de produção para medir custo e qualidade reais do modelo escolhido.

As trilhas e os efeitos disponíveis na interface são originais e gerados pelo próprio sistema; por isso não dependem de licenças de catálogos externos. A avaliação paga permanece desativada até uma credencial ser fornecida ao worker, nunca ao frontend.

## Diretor Audiovisual Inteligente v44

A auditoria da v43 classificou como operacionais o corte técnico, detecção de problemas, transcrição, timeline, transições, narração, mixagem, logs, versões e retomada de tarefas. A direção semântica existia parcialmente: usava um quadro representativo por origem, não mantinha um modelo explícito de continuidade global, não movimentava fotografias dentro da cena e não inspecionava objetivamente o MP4 final. Reconhecimento semântico de pessoas, ações, objetos e assuntos continua dependente do provedor visual externo; o worker local não rotula esses elementos como se fossem IA.

A v44 acrescenta, de modo modular:

- amostragem temporal balanceada entre origens, com quadros do início, meio, fim, mudanças de cena, pontuação técnica e direção predominante de câmera;
- Diretor Avançado com Structured Outputs, escolha somente entre candidatos e timestamps reais, proposta narrativa global, justificativa, intenção de continuidade, destaque, transição, orientação musical e encerramento;
- validação do plano contra as origens reais, preservando a duração e os limites do plano técnico;
- cache por assinatura de arquivo para metadados, análise técnica e transcrição semântica, sem guardar o vídeo inteiro em memória;
- leitura estrutural da trilha em introdução, crescimento, corpo, trecho calmo, pico e encerramento, além de BPM e batidas;
- movimentos Ken Burns, pan horizontal/vertical e zoom progressivo em fotografias, com easing e reenquadramento normalizado;
- destaques automáticos curtos em área segura somente quando a evidência permite; cenas com pessoa ou fala não recebem descrição concorrente;
- controle de qualidade do MP4 final para stream de vídeo/áudio, duração, trechos pretos, congelamento prolongado, nível de áudio, limites de legendas/textos e repetição imediata de cenas;
- distinção explícita entre verificações objetivas e revisão humana de narrativa, enquadramento, emoção e acabamento;
- métricas comparativas estruturais e uma rubrica humana, sem fabricar resultados quando não há material real de avaliação.

O controle de qualidade não tenta corrigir automaticamente um defeito ambíguo. Uma falha objetiva impede a entrega e gera código e mensagem nos logs; um ponto não conclusivo vira aviso para revisão humana. `repairAttempts` permanece zero nesta versão porque nenhuma correção destrutiva ou subjetiva foi considerada segura para aplicação automática.

### Ativação e retorno seguro

O modo avançado permanece oculto e desativado por padrão. Para validá-lo em desenvolvimento, configure simultaneamente:

```env
STUDIO_ADVANCED_DIRECTOR_ENABLED=true
STUDIO_ADVANCED_AI_MAX_FRAMES=12
STUDIO_RENDER_QUALITY_ENABLED=true
```

e grave `studioFeatureFlags/advancedDirectorEnabled: true` no ambiente protegido. A chave `OPENAI_API_KEY` e `STUDIO_OPENAI_MODEL` continuam somente no worker. Para retornar à versão anterior, defina a flag do banco e `STUDIO_ADVANCED_DIRECTOR_ENABLED` como `false`; os modos local e semântico padrão permanecem intactos. O uso adicional aparece no histórico como `aiMode: advanced`, com tokens e custo estimado retornados pelo provedor.

O script `node studio-worker/scripts/compare-directors.mjs plano-local.json plano-avancado.json` compara dois planos reais. Para as seis categorias solicitadas — produto, gastronomia, imóvel, evento, institucional e mistura de fala com fotos — é necessário fornecer mídias autorizadas e avaliar os dois renders com a rubrica registrada; a v44 não inventa notas criativas nem resultados de campo.

## Preparação comercial

Os caminhos `studioCredits`, `studioCreditLedger`, `studioUsage` e `studioAdminCosts` já estão isolados. O MVP registra estimativa e consumo com valor financeiro zero. Mercado Pago e Asaas não são chamados. A futura cobrança deverá reservar créditos antes da fila, consumir após sucesso e estornar automaticamente em falhas.
