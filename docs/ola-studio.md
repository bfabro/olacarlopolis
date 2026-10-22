# Olá Studio — MVP protegido

## Estado desta entrega

O Olá Studio foi adicionado como uma aplicação estática separada em `/estudio/`, sem publicação nem ativação pública. A feature flag nasce desativada e o acesso de desenvolvimento exige:

1. usuário autenticado no Firebase;
2. perfil `master` em `usuariosByUid/{uid}`;
3. acesso pelo atalho protegido do Painel Admin, que inclui `?preview=1`.

O frontend não executa FFmpeg. Ele envia os arquivos diretamente ao Firebase Storage, registra o projeto e coloca um trabalho na fila da Realtime Database. Um worker Docker independente reclama o trabalho, renderiza e devolve o MP4 ao Storage.

## Fluxo funcional

`Upload direto → studioProjects → studioJobs → worker Docker → FFprobe/análise técnica → plano JSON → FFmpeg → Storage → prévia/download`

O planejador atual é identificado no JSON como `deterministic-technical`. Ele usa mudanças de cena, duração, presença de áudio e silêncio. Ele não é apresentado como análise semântica de IA.

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

A fila é consultada pela API REST autenticada do Firebase. A reserva usa ETag e `If-Match`, evitando que dois workers processem o mesmo trabalho. Leituras externas têm tempo limite para que uma conexão iniciada antes da rede do contêiner ficar pronta não bloqueie o worker indefinidamente.

## O que o motor faz

- lê streams e duração com FFprobe;
- detecta mudanças de cena e silêncios;
- cria cortes mínimos diferentes para Institucional, Reels e Comercial;
- normaliza todo material para a proporção escolhida com `scale + crop`, sem deformar;
- cria áudio silencioso quando uma cena não possui áudio;
- aplica `xfade` e `acrossfade`;
- compõe transições de forma incremental, mantendo somente duas cenas na memória por etapa;
- normaliza áudio com `loudnorm`;
- reduz a música durante o áudio principal com `sidechaincompress`;
- insere logo, título, texto complementar e CTA;
- exporta H.264/AAC com `faststart`.

## Legendas e IA

O contrato de transcrição existe, mas o provedor padrão é explicitamente `disabled`. Por isso nenhuma legenda falsa é gerada. Para a próxima etapa:

1. implementar um `TranscriptionProvider` server-side;
2. gerar SRT com timestamps reais;
3. implementar um `SemanticPlanner` que receba quadros representativos, transcrição e metadados;
4. validar a resposta pelo contrato de `shared/studio-contracts.mjs`;
5. comparar custo/qualidade com o plano técnico antes de habilitar por créditos.

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

## Preparação comercial

Os caminhos `studioCredits`, `studioCreditLedger`, `studioUsage` e `studioAdminCosts` já estão isolados. O MVP registra estimativa e consumo com valor financeiro zero. Mercado Pago e Asaas não são chamados. A futura cobrança deverá reservar créditos antes da fila, consumir após sucesso e estornar automaticamente em falhas.
