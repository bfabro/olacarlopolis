import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { browserLocalPersistence, getAuth, onAuthStateChanged, setPersistence, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getDatabase, ref, get, set, update, push, onValue, query, limitToLast } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { getStorage, ref as storageRef, uploadBytesResumable, getDownloadURL, getBlob } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import { STUDIO_DURATIONS, STUDIO_EDIT_STYLES, STUDIO_EXPORT_QUALITIES, STUDIO_FORMATS, STUDIO_LIBRARY_MUSIC, STUDIO_LIMITS, STUDIO_TEXT_PRESETS, STUDIO_TRANSITIONS, STUDIO_TRANSITION_SOUNDS, STUDIO_VISUAL_EFFECTS, normalizeStudioProject, studioJobCostEstimate } from "../shared/studio-contracts.mjs?v=12";
import { estimateProcessingTiming } from "../shared/studio-metrics.mjs?v=1";

const firebaseConfig = {
  apiKey: "AIzaSyDWHsZSHwVFpD88ChUywjw_GdZPifdrRGI",
  authDomain: "contadoracessos.firebaseapp.com",
  databaseURL: "https://contadoracessos-default-rtdb.firebaseio.com",
  projectId: "contadoracessos",
  storageBucket: "contadoracessos.firebasestorage.app",
  messagingSenderId: "521517291315",
  appId: "1:521517291315:web:74f8d878d2d8769460d046"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const storage = getStorage(app);
const $ = (id) => document.getElementById(id);
const STUDIO_RELEASE = Object.freeze({ label: "v50", date: "2026-10-25" });
const STORAGE_OPERATION_TIMEOUT_MS = 15000;
const state = { user: null, profile: null, featureFlags: {}, files: [], projects: [], logs: [], activeProjectId: "", activeJobId: "", jobUnsubscribe: null, outputPreviewUrl: "", transcriptReviewUrl: "", activeUploads: new Set(), cancelRequested: false, reviewingJobId: "", transcriptSegments: [], activeTranscriptIndex: -1, visualProject: null, visualPlan: null, visualSourceUrls: new Map(), selectedVisualVersionId: "", processingClock: null, currentTimingJob: null, processingCosts: [] };
const viewTitles = { projects: "Meus projetos", editor: "Novo vídeo", visual: "Editor visual", processing: "Processamento", usage: "Uso e créditos", logs: "Logs e erros" };
const statusLabels = { draft: "Rascunho", uploading: "Enviando", queued: "Na fila", analyzing: "Analisando", rendering: "Renderizando", awaiting_review: "Revisar legendas", cancel_requested: "Cancelando", deletion_queued: "Exclusão na fila", deleting: "Excluindo", cancelled: "Cancelado", completed: "Concluído", failed: "Falhou" };
const resumableStatuses = new Set(["queued", "analyzing", "rendering", "awaiting_review", "cancel_requested"]);
let hadAuthenticatedSession = false;
let logoutRequested = false;
let authPersistenceWarning = "";

const FIELD_HELP = Object.freeze({
  sourceFiles: { title: "Arquivos do vídeo", body: "Adicione vídeos e também imagens estáticas à sequência. Cada foto vira uma cena com duração ajustável no editor visual e pode ser reordenada junto com os vídeos. A IA usa a imagem real na análise e os originais são preservados." },
  directorMode: { title: "Modo do diretor", body: "Automático local faz uma montagem rápida usando qualidade, duração, áudio e movimento, sem interpretar o assunto. Diretor de IA entende quadros e falas para escolher cenas coerentes. Diretor Avançado examina vários momentos, preserva ordem e continuidade e constrói uma narrativa mais completa, usando mais processamento e IA." },
  directorBrief: { title: "Objetivo criativo", body: "Explique o resultado desejado: público, clima, pontos que devem aparecer e mensagem principal. Este texto orienta o Diretor de IA, mas não aparece escrito no vídeo." },
  generateAiScript: { title: "Criar roteiro e textos", body: "Quando ativado, a IA prepara um roteiro baseado apenas nos arquivos, transcrições e objetivo criativo. O roteiro poderá alimentar os textos das cenas e a narração." },
  enableAiNarration: { title: "Narrar com voz de IA", body: "Transforma o roteiro em locução. As frases são distribuídas ao longo do vídeo, as legendas acompanham a fala e a música é reduzida durante a voz." },
  aiNarrationVoice: { title: "Voz da narração", body: "Escolhe o timbre usado na locução. Marin e Cedar mudam somente a voz; não alteram o texto nem os cortes." },
  aiNarrationTone: { title: "Estilo da voz", body: "Define a interpretação: profissional é clara e neutra; acolhedora é próxima; energética tem ritmo publicitário; calma é suave e inspiradora." },
  transitionMode: { title: "Transição entre cenas", body: "Define como uma imagem passa para a próxima. Automática respeita o tema escolhido. Fade e dissolve são suaves; slide, whip e flash são mais enérgicos; hard cut troca sem efeito." },
  transitionDuration: { title: "Duração da transição", body: "Controla por quanto tempo duas cenas se misturam. Valores curtos deixam o vídeo ágil; valores maiores criam uma passagem suave e cinematográfica." },
  effectsProfile: { title: "Acabamento visual", body: "Natural preserva a imagem original. Profissional melhora cor e nitidez com discrição. Cinematográfico usa contraste e vinheta leves. Dinâmico realça cores e detalhes para Reels." },
  visualDirectorMode: { title: "Diretor da nova versão", body: "Escolha o nível de análise usado para refazer a montagem: técnica local rápida, interpretação do conteúdo por IA ou direção avançada com narrativa, continuidade e ordem temporal." },
  visualEffectsProfile: { title: "Efeitos da nova versão", body: "Define o tratamento real aplicado às imagens e vídeos na próxima renderização. O efeito também vale ao renderizar a timeline ajustada manualmente." },
  visualDirectorBrief: { title: "Objetivo da nova versão", body: "Orienta uma nova montagem por IA. Descreva público, clima, mensagem e cenas importantes. O texto não aparece no vídeo." },
  editingRhythm: { title: "Ritmo da montagem", body: "Suave mantém cenas mais longas; equilibrado combina contemplação e movimento; dinâmico cria cortes mais rápidos. O tema ainda define limites seguros para cada cena." },
  syncCutsToMusic: { title: "Sincronizar com a música", body: "Detecta batidas reais da trilha e aproxima os cortes delas. Trechos com fala são preservados para não cortar palavras." },
  exportFps: { title: "Taxa de quadros", body: "24 FPS dá aparência cinematográfica; 30 FPS é o padrão para redes sociais; 60 FPS deixa movimentos mais fluidos, mas aumenta o processamento e o arquivo." },
  exportQuality: { title: "Qualidade e bitrate", body: "Compacta gera arquivo menor; equilibrada oferece boa qualidade para redes sociais; alta preserva mais detalhes e produz um MP4 maior." },
  projectName: { title: "Nome do projeto", body: "Serve para identificar o trabalho em Meus projetos, Logs e Histórico. Não aparece dentro do vídeo." },
  videoTitle: { title: "Título no vídeo", body: "É a mensagem principal da abertura. Aparece na parte superior, normalmente nos primeiros segundos, com tamanho maior que os demais textos." },
  videoSubtitle: { title: "Texto complementar", body: "Aparece abaixo do título durante a abertura, em tamanho menor. Use uma frase curta para explicar ou contextualizar a mensagem principal." },
  sceneDescription: { title: "Descrição de uma cena", body: "Aparece na parte inferior aproximadamente no meio do vídeo, sobre uma cena de desenvolvimento. É útil para destacar atendimento, estrutura, benefício ou ambiente." },
  personName: { title: "Nome da pessoa", body: "Aparece na parte inferior junto do cargo, na primeira metade do vídeo. Se o cargo ficar vazio, somente o nome será mostrado." },
  personRole: { title: "Cargo ou função", body: "Completa o nome da pessoa, formando uma identificação como “Bruno — Consultor”. Não é exibido sozinho se o nome também estiver vazio." },
  offerText: { title: "Preço ou oferta", body: "Entra no centro do vídeo, com maior destaque e animação de impacto, por volta da metade da duração. Preencha apenas quando houver uma condição real." },
  promoText: { title: "Chamada promocional", body: "Aparece após a oferta, no centro, reforçando prazo, benefício ou condição especial." },
  closingText: { title: "Texto de encerramento", body: "Surge no centro nos segundos finais e prepara o fechamento da história antes da chamada final." },
  videoCta: { title: "Chamada final", body: "Aparece na parte inferior nos últimos segundos. Indique uma ação clara, como falar no WhatsApp, visitar o local ou conhecer o portal." },
  textPreset: { title: "Estilo visual dos textos", body: "Aplica um conjunto coerente de fonte, cor, fundo e animação. Clean é versátil; cinematográfico é elegante; oferta destaca preço; impacto usa linguagem visual de Reels." },
  textAnimation: { title: "Animação dos textos", body: "Define como cada texto entra e sai. Animações discretas favorecem vídeos institucionais; zoom, bounce e palavra por palavra combinam com peças rápidas." },
  textSizeScale: { title: "Tamanho geral dos textos", body: "Aumenta ou reduz todos os textos principais mantendo a proporção entre título, descrição, oferta e chamada final." },
  textColor: { title: "Cor do texto", body: "Define a cor principal das mensagens inseridas no vídeo. Prefira contraste alto com as imagens." },
  textPosition: { title: "Posição dos textos", body: "É a posição padrão. Alguns campos têm posição própria: título fica no topo, oferta no centro e chamada final na parte inferior." },
  textBackground: { title: "Fundo semitransparente", body: "Adiciona uma faixa escura discreta atrás do texto para melhorar a leitura em fotos claras ou movimentadas." },
  logoFile: { title: "Logo", body: "A logo aparece centralizada no encerramento, normalmente durante os últimos cinco segundos. PNG ou WebP com transparência produz o melhor resultado." },
  libraryMusic: { title: "Trilha original do Studio", body: "Escolhe uma música interna licenciada para o projeto. Horizonte calmo favorece turismo e imóveis; Conexão positiva combina com empresas; Pulso dinâmico é indicado para Reels e eventos." },
  musicFile: { title: "Música enviada", body: "Usa seu próprio arquivo de áudio e substitui a trilha interna. Envie somente música que você tenha autorização para utilizar." },
  voiceVolume: { title: "Volume da voz e som original", body: "Ajusta o áudio que já existe nos vídeos. Também influencia a presença da voz original em relação à música." },
  musicVolume: { title: "Volume da música", body: "Controla a intensidade da trilha de fundo. Durante narração, o Studio reduz a música automaticamente para priorizar a fala." },
  musicFadeSeconds: { title: "Fade da música", body: "Cria entrada e saída gradual da trilha. Um fade suave evita que a música comece ou termine de forma brusca." },
  transitionSound: { title: "Efeito nas transições", body: "Adiciona um efeito sonoro curto nas mudanças de cena. Suave é discreto; impacto reforça cortes; brilho combina com revelações e ofertas." },
  noiseReduction: { title: "Redução de ruído", body: "Aplica um filtro moderado contra ruído contínuo, como vento ou ventilador. Não reconstrói falas e pode ser deixado desligado em gravações limpas." },
  captionsEnabled: { title: "Transcrever e gerar legendas", body: "O Whisper local reconhece somente a fala do áudio original e incorpora cada legenda no instante da fala. Quando a narração de IA estiver ativa, ela entra apenas em cenas sem fala e sem pessoa visível; descrições automáticas não cobrem quem está falando." },
  captionMode: { title: "Apresentação das legendas", body: "Tradicional mostra a frase durante a fala. Dinâmica destaca palavras individualmente quando existem tempos reais por palavra. A narração de IA usa frase sincronizada para evitar marcação artificial." },
  captionPosition: { title: "Posição das legendas", body: "Inferior usa a área segura para redes sociais; centro pode ser útil quando a parte inferior da imagem contém informações importantes." },
  captionSizeScale: { title: "Tamanho das legendas", body: "Ajusta somente as legendas, sem alterar título, oferta ou outros textos do vídeo." },
  captionColor: { title: "Cor principal da legenda", body: "Define a cor das palavras comuns da legenda. Branco costuma oferecer a melhor leitura." },
  captionHighlightColor: { title: "Cor de destaque", body: "No modo dinâmico, identifica a palavra que está sendo falada. Não altera a legenda tradicional." },
  captionPrompt: { title: "Vocabulário e nomes próprios", body: "Informe nomes de empresas, pessoas, produtos ou lugares difíceis. Isso ajuda o Whisper a reconhecer a grafia correta e não aparece no vídeo." },
  captionReviewEnabled: { title: "Revisar antes de renderizar", body: "Pausa a criação depois da transcrição para você corrigir ou remover frases. Ao aprovar, o Studio continua do ponto salvo." }
});

const DIRECTOR_MODE_GUIDANCE = Object.freeze({
  local: Object.freeze({
    icon: "fa-gauge-high",
    title: "Automático local: montagem técnica e rápida",
    body: "Escolhe os melhores trechos pela qualidade da imagem, movimento, áudio, silêncios e duração. Organiza abertura, desenvolvimento e encerramento, mas não interpreta o assunto mostrado nas cenas.",
    detail: "Não usa a API de IA e não gera custo de IA. Indicado para testes rápidos e montagens simples."
  }),
  semantic: Object.freeze({
    icon: "fa-brain",
    title: "Diretor de IA: entende o conteúdo",
    body: "Analisa quadros representativos e falas transcritas para reconhecer o tema, escolher cenas coerentes e propor textos, roteiro e ordem de apresentação conforme o objetivo criativo.",
    detail: "Usa a API de IA e pode consumir créditos. Indicado quando o significado das cenas é importante."
  }),
  advanced: Object.freeze({
    icon: "fa-clapperboard",
    title: "Diretor Avançado: constrói uma narrativa completa",
    body: "Compara vários momentos de cada arquivo, procura continuidade entre cenas, reduz repetições e preserva a ordem cronológica das falas para criar uma história com começo, desenvolvimento e encerramento.",
    detail: "Usa mais análise, tempo e tokens de IA. Indicado para vídeos com várias gravações, pessoas falando ou uma sequência que precisa fazer sentido."
  })
});

document.querySelectorAll("[data-studio-version]").forEach((node) => { node.textContent = STUDIO_RELEASE.label; });
const authPersistenceReady = setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.warn("Não foi possível manter a sessão local do Studio.", error?.code || error?.message);
  authPersistenceWarning = "Este navegador bloqueou a permanência da sessão. O processamento continuará salvo e poderá ser retomado após entrar novamente.";
});

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
}

function updateDirectorModeDescription(selectId, outputId) {
  const select = $(selectId);
  const output = $(outputId);
  const guidance = DIRECTOR_MODE_GUIDANCE[select?.value] || DIRECTOR_MODE_GUIDANCE.local;
  if (!output) return;
  output.innerHTML = `<i class="fa-solid ${guidance.icon}" aria-hidden="true"></i><span><strong>${escapeHtml(guidance.title)}</strong>${escapeHtml(guidance.body)}<small>${escapeHtml(guidance.detail)}</small></span>`;
}

function editorFieldHelp(control) {
  if (!control) return null;
  if (control.name === "editStyle") {
    const style = STUDIO_EDIT_STYLES[control.value];
    const descriptions = {
      institucional: "Prioriza apresentação elegante e confiável, com cenas de 3,2 a 7 segundos, música discreta e transições suaves. Indicado para história da empresa, estrutura e equipe.",
      reels: "Cria montagem vertical mais rápida, com cenas de 1,25 a 3,5 segundos, cortes enérgicos e maior presença da música. Indicado para prender atenção rapidamente.",
      comercial: "Equilibra produto, benefício, preço e chamada para ação, com cenas de 2,1 a 5 segundos e ritmo promocional.",
      comercio_local: "Apresenta fachada, ambiente, atendimento e diferenciais da empresa com ritmo equilibrado e identidade próxima da cidade.",
      imoveis: "Mantém ambientes por mais tempo, usa movimentos e transições suaves e favorece a compreensão dos espaços.",
      gastronomia: "Valoriza detalhes de pratos, preparo e ambiente com aproximações e cortes dinâmicos.",
      eventos: "Prioriza momentos marcantes, energia e variedade de cenas, com cortes curtos e transições rápidas.",
      turismo: "Dá tempo para observar paisagens, utiliza cenas longas e passagens suaves com caráter contemplativo."
    };
    return { title: `Tema ${style?.label || control.value}`, body: descriptions[control.value] || "Este tema ajusta automaticamente ritmo, duração das cenas, transições e volume da música." };
  }
  if (control.name === "format") {
    const formats = { "9:16": "Vídeo vertical 1080 × 1920, ideal para Stories, Reels e tela cheia no celular.", "16:9": "Vídeo horizontal 1920 × 1080, indicado para YouTube, televisores e apresentações.", "1:1": "Vídeo quadrado 1080 × 1080, indicado para publicações no feed." };
    return { title: `Formato ${control.value}`, body: formats[control.value] };
  }
  if (control.name === "duration") return { title: `Duração de ${control.value} segundos`, body: `O vídeo final terá aproximadamente ${control.value} segundos. O Studio ajustará a quantidade e o tempo das cenas para preencher esse período sem acelerar os arquivos.` };
  return FIELD_HELP[control.id] || null;
}

function openFieldHelp(key, control = null) {
  const info = FIELD_HELP[key] || editorFieldHelp(control);
  if (!info) return;
  $("fieldHelpTitle").textContent = info.title;
  $("fieldHelpContent").innerHTML = `<p>${escapeHtml(info.body)}</p>`;
  const dialog = $("fieldHelpDialog");
  if (typeof dialog.showModal === "function") dialog.showModal();
  else dialog.setAttribute("open", "");
}

function closeFieldHelp() {
  const dialog = $("fieldHelpDialog");
  if (typeof dialog.close === "function" && dialog.open) dialog.close();
  else dialog.removeAttribute("open");
}

function openDirectorGuide() {
  const dialog = $("directorGuideDialog");
  if (typeof dialog.showModal === "function") dialog.showModal();
  else dialog.setAttribute("open", "");
}

function closeDirectorGuide() {
  const dialog = $("directorGuideDialog");
  if (typeof dialog.close === "function" && dialog.open) dialog.close();
  else dialog.removeAttribute("open");
}

async function copyDirectorGuidePrompt() {
  const field = $("directorGuidePrompt");
  const prompt = field?.value || "";
  try {
    await navigator.clipboard.writeText(prompt);
  } catch {
    field.focus();
    field.select();
    document.execCommand("copy");
    field.setSelectionRange(0, 0);
  }
  toast("Exemplo copiado. Adapte os campos entre colchetes antes de usar.");
}

function initializeEditorHelp() {
  document.querySelectorAll("#editorView label, #visualView label").forEach((label) => {
    const control = label.querySelector("input,select,textarea");
    const info = editorFieldHelp(control);
    if (!control || !info || label.querySelector(".field-help-button")) return;
    label.classList.add("has-field-help");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "field-help-button";
    button.setAttribute("aria-label", `Explicar ${info.title}`);
    button.dataset.helpTooltip = info.body;
    button.innerHTML = '<i class="fa-regular fa-circle-question"></i>';
    button.addEventListener("click", (event) => { event.preventDefault(); event.stopPropagation(); openFieldHelp("", control); });
    label.appendChild(button);
  });
  document.querySelectorAll("[data-help-key]").forEach((button) => {
    const info = FIELD_HELP[button.dataset.helpKey];
    if (info) button.dataset.helpTooltip = info.body;
    button.addEventListener("click", () => openFieldHelp(button.dataset.helpKey));
  });
}

function cleanFileName(name) {
  const parts = String(name || "arquivo").split(".");
  const extension = parts.length > 1 ? "." + parts.pop().replace(/[^a-zA-Z0-9]/g, "").toLowerCase() : "";
  const base = parts.join(".").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 70) || "arquivo";
  return base + extension;
}

async function privateOutputUrl(output) {
  if (output?.downloadUrl) return output.downloadUrl;
  if (!output?.storagePath) throw new Error("Arquivo de vídeo não encontrado.");
  const outputRef = storageRef(storage, output.storagePath);
  try {
    return await getDownloadURL(outputRef);
  } catch (error) {
    console.warn("O render não possui URL privada de streaming; usando download autenticado.", error);
    return URL.createObjectURL(await getBlob(outputRef));
  }
}

function withStudioTimeout(promise, message, timeoutMs = STORAGE_OPERATION_TIMEOUT_MS) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => { timer = window.setTimeout(() => reject(new Error(message)), timeoutMs); })
  ]).finally(() => window.clearTimeout(timer));
}

async function downloadProject(projectId) {
  const project = state.projects.find((item) => item.id === projectId);
  if (!project?.output) throw new Error("O vídeo final deste projeto não foi encontrado.");
  const url = await privateOutputUrl(project.output);
  const link = document.createElement("a");
  link.href = url;
  link.download = cleanFileName(project.output.fileName || `${project.name || "ola-studio"}.mp4`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  if (url.startsWith("blob:")) setTimeout(() => URL.revokeObjectURL(url), 60000);
}

function showDirectorResult(result) {
  const node = $("resultDirectorStatus");
  if (!node) return;
  if (!result?.requested) { node.classList.add("hidden"); node.textContent = ""; return; }
  node.classList.remove("hidden");
  node.classList.toggle("is-fallback", result.applied !== true);
  node.innerHTML = result.applied === true
    ? `<i class="fa-solid fa-wand-magic-sparkles"></i> Direção semântica aplicada por ${escapeHtml(result.provider || "IA configurada")}.`
    : `<i class="fa-solid fa-shield-halved"></i> A IA não foi aplicada; a montagem técnica local foi usada com segurança. ${escapeHtml(result.reason || "")}`;
}

async function showProjectVideo(projectId) {
  const project = state.projects.find((item) => item.id === projectId);
  if (!project?.output) throw new Error("O vídeo final deste projeto não foi encontrado.");
  state.activeProjectId = projectId;
  state.activeJobId = project.jobId || "";
  $("resultCard").classList.add("hidden");
  $("errorCard").classList.add("hidden");
  $("transcriptReviewCard").classList.add("hidden");
  $("processingStatusCard").classList.remove("hidden");
  $("cancelProcessingButton").classList.add("hidden");
  $("processingEyebrow").textContent = "Carregando vídeo";
  $("processingTitle").textContent = project.name || "Vídeo concluído";
  markProcessStep("complete");
  updateProgress(100, "Concluído", "Preparando a prévia protegida do vídeo.");
  resetProcessingLog("Carregando o histórico deste processamento.");
  switchView("processing");
  if (state.activeJobId) {
    const job = (await get(ref(db, `studioJobs/${state.user.uid}/${state.activeJobId}`))).val();
    if (job) { renderProcessingLog(job.events, job); updateProcessingTiming(job); }
  }
  if (state.outputPreviewUrl) URL.revokeObjectURL(state.outputPreviewUrl);
  const outputUrl = await privateOutputUrl(project.output);
  state.outputPreviewUrl = outputUrl.startsWith("blob:") ? outputUrl : "";
  $("previewPlayer").src = outputUrl;
  $("downloadVideo").href = outputUrl;
  $("downloadVideo").download = cleanFileName(project.output.fileName || `${project.name || "ola-studio"}.mp4`);
  showDirectorResult(project.directorResult);
  await loadAndRenderProjectCost(state.activeJobId, project.directorResult);
  $("processingStatusCard").classList.add("hidden");
  $("resultCard").classList.remove("hidden");
}

function showGate(id) {
  ["studioLoading", "studioLogin", "studioUnavailable", "studioApp"].forEach((key) => $(key)?.classList.toggle("hidden", key !== id));
}

let toastTimer;
function toast(message) {
  const node = $("studioToast");
  node.textContent = message;
  node.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => node.classList.add("hidden"), 3600);
}

function formatBytes(bytes) {
  const size = Number(bytes || 0);
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / 1024 / 1024).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MB`;
}

function formatDate(timestamp) {
  return timestamp ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(timestamp)) : "-";
}

function formatDuration(seconds) {
  const total = Math.max(0, Math.round(Number(seconds || 0)));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor(total % 3600 / 60);
  const remainder = total % 60;
  if (hours) return `${hours}h ${String(minutes).padStart(2, "0")}min`;
  if (minutes) return `${minutes}min ${String(remainder).padStart(2, "0")}s`;
  return `${remainder}s`;
}

function formatUsd(value) {
  return `US$ ${Number(value || 0).toLocaleString("pt-BR", { minimumFractionDigits: 6, maximumFractionDigits: 6 })}`;
}

function stopProcessingClock() {
  if (state.processingClock) clearInterval(state.processingClock);
  state.processingClock = null;
}

function paintProcessingTiming() {
  const job = state.currentTimingJob;
  if (!job) return;
  const timing = estimateProcessingTiming(job, state.processingCosts);
  $("processingElapsed").textContent = formatDuration(timing.elapsedSeconds);
  if (timing.complete) {
    $("processingRemaining").textContent = "Concluído";
    $("processingTotal").textContent = formatDuration(timing.totalSeconds);
    return;
  }
  $("processingRemaining").textContent = timing.calculating ? "Calculando…" : `${formatDuration(timing.remainingLowSeconds)}–${formatDuration(timing.remainingHighSeconds)}`;
  $("processingTotal").textContent = timing.calculating ? "Estimando…" : `aprox. ${formatDuration(timing.totalSeconds)}`;
}

function updateProcessingTiming(job) {
  state.currentTimingJob = { ...(job || {}) };
  paintProcessingTiming();
  stopProcessingClock();
  if (job && !["completed", "failed", "cancelled"].includes(job.status)) state.processingClock = setInterval(paintProcessingTiming, 1000);
}

function resetProcessingTiming() {
  stopProcessingClock();
  state.currentTimingJob = null;
  $("processingElapsed").textContent = "0s";
  $("processingRemaining").textContent = "Calculando…";
  $("processingTotal").textContent = "Estimando…";
}

async function loadProcessingCosts() {
  const snapshot = await get(query(ref(db, "studioAdminCosts"), limitToLast(100)));
  state.processingCosts = Object.entries(snapshot.val() || {}).map(([jobId, item]) => ({ jobId, ...(item || {}) })).filter((item) => item.uid === state.user?.uid);
  return state.processingCosts;
}

function renderCostDetails(cost = {}, ledger = {}, director = {}) {
  const node = $("resultCostDetails");
  if (!node) return;
  if (!Object.keys(cost).length && !Object.keys(ledger).length) { node.classList.add("hidden"); node.innerHTML = ""; return; }
  const aiUsed = director?.applied === true || (cost.aiProvider && cost.aiProvider !== "none");
  const tokens = Number(cost.aiUsage?.total_tokens || 0);
  const credits = Number(ledger.estimatedCredits ?? cost.estimatedCredits ?? 0);
  node.classList.remove("hidden");
  const narrationUsed = cost.narrationUsed === true;
  const narrationRendered = cost.narrationRendered !== false;
  const narrationTiming = Number(cost.narrationTimelineDurationSeconds || 0) > Number(cost.narrationDurationSeconds || 0) + 1
    ? `${formatDuration(cost.narrationDurationSeconds || 0)} de voz distribuídos até ${formatDuration(cost.narrationTimelineDurationSeconds)}`
    : formatDuration(cost.narrationDurationSeconds || 0);
  node.innerHTML = `<div><span><i class="fa-solid fa-stopwatch"></i> Tempo total</span><strong>${escapeHtml(formatDuration(cost.elapsedSeconds || 0))}</strong></div><div><span><i class="fa-solid fa-coins"></i> Créditos de processamento</span><strong>${credits} ${credits === 1 ? "crédito" : "créditos"}</strong><small>${Number(ledger.amount || 0) ? `${Number(ledger.amount)} debitado(s)` : "MVP sem débito real"}</small></div><div><span><i class="fa-solid fa-wand-magic-sparkles"></i> Diretor de IA</span><strong>${aiUsed ? formatUsd(cost.aiEstimatedCostUsd) : "Não utilizado"}</strong><small>${aiUsed ? `${escapeHtml(cost.aiModel || director.model || "IA")} • ${tokens.toLocaleString("pt-BR")} tokens` : "Montagem técnica local"}</small></div><div><span><i class="fa-solid fa-microphone-lines"></i> Narração por IA</span><strong>${narrationUsed ? formatUsd(cost.narrationEstimatedCostUsd) : "Não utilizada"}</strong><small>${narrationUsed ? `${escapeHtml(cost.narrationVoice || "voz IA")} • ${escapeHtml(narrationTiming)} • ${Number(cost.narrationCharacters || 0).toLocaleString("pt-BR")} caracteres • ${narrationRendered ? "voz e legendas sincronizadas" : "gerada, mas não sobreposta à fala original"}` : "Sem locução sintética"}</small></div>`;
}

async function loadAndRenderProjectCost(jobId, director = {}) {
  if (!jobId || !state.user) return $("resultCostDetails")?.classList.add("hidden");
  const [costSnapshot, ledgerSnapshot] = await Promise.all([get(ref(db, `studioAdminCosts/${jobId}`)), get(ref(db, `studioCreditLedger/${state.user.uid}/${jobId}`))]);
  renderCostDetails(costSnapshot.val() || {}, ledgerSnapshot.val() || {}, director);
}

function processingEventTime(timestamp) {
  return timestamp ? new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date(timestamp)) : "agora";
}

function normalizedProcessingEvents(events, fallbackJob) {
  const list = Object.entries(events || {}).map(([id, event]) => ({ id, ...(event || {}) }));
  if (!list.length && fallbackJob?.message) list.push({ id: "current", timestamp: fallbackJob.updatedAt || Date.now(), stage: fallbackJob.stage, status: fallbackJob.status, level: fallbackJob.status === "failed" ? "error" : "info", code: "current_status", message: fallbackJob.message });
  return list.filter((event) => event.message).sort((a, b) => Number(a.timestamp || 0) - Number(b.timestamp || 0)).slice(-60);
}

function renderProcessingLog(events, fallbackJob = null) {
  const root = $("processingLogList");
  if (!root) return;
  const list = normalizedProcessingEvents(events, fallbackJob);
  $("processingLogCount").textContent = `${list.length} ${list.length === 1 ? "evento" : "eventos"}`;
  if (!list.length) {
    root.innerHTML = '<li class="processing-log-empty">O histórico aparecerá assim que o processamento começar.</li>';
    return;
  }
  const stageNames = { upload: "Upload", queue: "Fila", probe: "Leitura", analysis: "Análise", planning: "Direção por IA", transcription: "Legendas", transcription_review: "Revisão", render: "Renderização", quality_review: "Controle de qualidade", upload_output: "Finalização", complete: "Concluído", failed: "Falha", cancelled: "Cancelado" };
  const icons = { info: "fa-circle-info", success: "fa-circle-check", warning: "fa-triangle-exclamation", error: "fa-circle-xmark" };
  root.innerHTML = list.map((event) => {
    const level = ["success", "warning", "error"].includes(event.level) ? event.level : "info";
    const details = Array.isArray(event.details) ? event.details : Object.values(event.details || {});
    const code = event.code && !["progress_update", "current_status"].includes(event.code) ? `<small class="processing-log-code">Código: ${escapeHtml(event.code)}</small>` : "";
    return `<li class="processing-log-event ${level}"><span class="processing-log-icon"><i class="fa-solid ${icons[level]}"></i></span><div><div class="processing-log-heading"><strong>${escapeHtml(stageNames[event.stage] || "Processamento")}</strong><time>${escapeHtml(processingEventTime(event.timestamp))}</time></div><p>${escapeHtml(event.message)}</p>${details.length ? `<ul>${details.slice(0, 8).map((detail) => `<li>${escapeHtml(detail)}</li>`).join("")}</ul>` : ""}${code}</div></li>`;
  }).join("");
  root.scrollTop = root.scrollHeight;
}

function resetProcessingLog(message = "Preparando o processamento.") {
  $("processingLogBody")?.classList.remove("hidden");
  $("processingLogToggle")?.setAttribute("aria-expanded", "true");
  renderProcessingLog({ local: { timestamp: Date.now(), stage: "upload", status: "uploading", level: "info", code: "current_status", message } });
  resetProcessingTiming();
}

function jobLogEvents(job) {
  const events = normalizedProcessingEvents(job.events, job);
  if (job.error?.message && !events.some((event) => event.level === "error" && event.message === job.error.message)) {
    events.push({ id: "job-error", timestamp: job.failedAt || job.updatedAt, stage: "failed", status: "failed", level: "error", code: job.error.code || "worker_error", message: job.error.message });
  }
  return events.sort((a, b) => Number(a.timestamp || 0) - Number(b.timestamp || 0));
}

function jobHasLogIssue(job) {
  return job.status === "failed" || Boolean(job.error) || jobLogEvents(job).some((event) => ["warning", "error"].includes(event.level));
}

function renderStudioLogs() {
  const root = $("studioLogsList");
  if (!root) return;
  const filter = $("logsFilter").value;
  const activeStatuses = new Set(["uploading", "queued", "analyzing", "rendering", "awaiting_review", "cancel_requested"]);
  const projects = new Map(state.projects.map((project) => [project.id, project]));
  const all = state.logs;
  const visible = all.filter((job) => filter === "errors" ? jobHasLogIssue(job) : filter === "active" ? activeStatuses.has(job.status) : filter === "completed" ? job.status === "completed" : true);
  $("logsJobCount").textContent = all.length;
  $("logsErrorCount").textContent = all.filter(jobHasLogIssue).length;
  if (!visible.length) {
    root.innerHTML = '<div class="empty-state"><i class="fa-solid fa-list-check"></i><h3>Nenhum registro neste filtro</h3><p>Altere o filtro ou atualize os logs.</p></div>';
    return;
  }
  const stageNames = { upload: "Upload", queue: "Fila", probe: "Leitura dos arquivos", analysis: "Análise técnica", planning: "Direção por IA", transcription: "Transcrição", transcription_review: "Revisão das legendas", render: "Renderização", quality_review: "Controle de qualidade", upload_output: "Salvamento", complete: "Concluído", failed: "Falha", cancelled: "Cancelado" };
  const icons = { info: "fa-circle-info", success: "fa-circle-check", warning: "fa-triangle-exclamation", error: "fa-circle-xmark" };
  root.innerHTML = visible.map((job) => {
    const project = projects.get(job.projectId) || {};
    const events = jobLogEvents(job);
    const issue = jobHasLogIssue(job);
    const latestError = [...events].reverse().find((event) => event.level === "error");
    const latestWarning = [...events].reverse().find((event) => event.level === "warning");
    const reason = job.error?.message || latestError?.message || latestWarning?.message || "";
    const eventHtml = events.length ? events.map((event) => {
      const level = ["success", "warning", "error"].includes(event.level) ? event.level : "info";
      const details = Array.isArray(event.details) ? event.details : Object.values(event.details || {});
      return `<li class="processing-log-event ${level}"><span class="processing-log-icon"><i class="fa-solid ${icons[level]}"></i></span><div><div class="processing-log-heading"><strong>${escapeHtml(stageNames[event.stage] || event.stage || "Processamento")}</strong><time>${escapeHtml(formatDate(event.timestamp))}</time></div><p>${escapeHtml(event.message)}</p>${details.length ? `<ul>${details.slice(0, 8).map((detail) => `<li>${escapeHtml(detail)}</li>`).join("")}</ul>` : ""}${event.code && event.code !== "progress_update" ? `<small class="processing-log-code">Código: ${escapeHtml(event.code)}</small>` : ""}</div></li>`;
    }).join("") : '<li class="processing-log-empty">Este processamento não registrou etapas detalhadas.</li>';
    return `<details class="studio-log-job ${issue ? "has-issue" : ""}" ${job.status === "failed" ? "open" : ""}><summary><span class="studio-log-status ${escapeHtml(job.status || "unknown")}"><i class="fa-solid ${issue ? "fa-triangle-exclamation" : job.status === "completed" ? "fa-circle-check" : "fa-clock"}"></i></span><span><strong>${escapeHtml(project.name || job.projectName || "Projeto sem nome")}</strong><small>${escapeHtml(statusLabels[job.status] || job.status || "Processamento")} • ${escapeHtml(formatDate(job.updatedAt || job.createdAt))}</small></span><span class="studio-log-summary-meta">${events.length} ${events.length === 1 ? "evento" : "eventos"}<i class="fa-solid fa-chevron-down"></i></span></summary>${reason ? `<div class="studio-log-reason ${job.status === "failed" ? "error" : "warning"}"><strong>${job.status === "failed" ? "Motivo do erro" : "Aviso encontrado"}</strong><p>${escapeHtml(reason)}</p>${job.error?.code ? `<code>${escapeHtml(job.error.code)}</code>` : ""}</div>` : ""}<ol class="processing-log-list studio-log-events">${eventHtml}</ol><div class="studio-log-identifiers"><span>Projeto: ${escapeHtml(job.projectId || "-")}</span><span>Processamento: ${escapeHtml(job.id || job.jobId || "-")}</span><span>Tentativa: ${Number(job.attempt || 0)}</span></div></details>`;
  }).join("");
}

async function loadLogs() {
  if (!state.user) return;
  const snapshot = await get(query(ref(db, `studioJobs/${state.user.uid}`), limitToLast(80)));
  state.logs = Object.entries(snapshot.val() || {}).map(([id, job]) => ({ id, ...(job || {}) })).sort((a, b) => Number(b.updatedAt || b.createdAt || 0) - Number(a.updatedAt || a.createdAt || 0));
  renderStudioLogs();
}

function selectedValue(name) {
  return document.querySelector(`input[name="${name}"]:checked`)?.value || "";
}

function currentDraft(sources = []) {
  return normalizeStudioProject({
    name: $("projectName").value,
    title: $("videoTitle").value,
    subtitle: $("videoSubtitle").value,
    sceneDescription: $("sceneDescription").value,
    personName: $("personName").value,
    personRole: $("personRole").value,
    offerText: $("offerText").value,
    promoText: $("promoText").value,
    closingText: $("closingText").value,
    callToAction: $("videoCta").value,
    style: selectedValue("editStyle"),
    format: selectedValue("format"),
    duration: Number(selectedValue("duration")),
    export: { fps: Number($("exportFps").value), quality: $("exportQuality").value },
    transition: $("transitionMode").value,
    transitionDuration: Number($("transitionDuration").value),
    effectsProfile: $("effectsProfile").value,
    editing: {
      rhythm: $("editingRhythm").value,
      syncToMusic: $("syncCutsToMusic").checked,
      prioritizeTechnicalQuality: true
    },
    director: {
      mode: $("directorMode").value,
      brief: $("directorBrief").value
    },
    narration: {
      generateScript: $("generateAiScript").checked,
      enabled: $("enableAiNarration").checked,
      voice: $("aiNarrationVoice").value,
      tone: $("aiNarrationTone").value,
      volume: 1
    },
    textDesign: {
      preset: $("textPreset").value,
      animation: $("textAnimation").value,
      sizeScale: Number($("textSizeScale").value) / 100,
      color: $("textColor").value,
      position: $("textPosition").value,
      background: $("textBackground").checked
    },
    captionsEnabled: $("captionsEnabled").checked,
    captions: {
      mode: $("captionMode").value,
      sizeScale: Number($("captionSizeScale").value) / 100,
      color: $("captionColor").value,
      highlightColor: $("captionHighlightColor").value,
      position: $("captionPosition").value,
      prompt: $("captionPrompt").value,
      reviewBeforeRender: $("captionReviewEnabled").checked
    },
    audio: {
      voiceVolume: Number($("voiceVolume").value) / 100,
      musicVolume: Number($("musicVolume").value) / 100,
      fadeSeconds: Number($("musicFadeSeconds").value),
      noiseReduction: $("noiseReduction").checked
    },
    libraryMusic: $("libraryMusic").value,
    transitionSound: $("transitionSound").value,
    sources
  });
}

function updateSummary() {
  const draft = currentDraft();
  const cost = studioJobCostEstimate(draft);
  $("summaryFiles").textContent = state.files.length;
  $("summaryStyle").textContent = STUDIO_EDIT_STYLES[draft.style].label;
  $("summaryFormat").textContent = draft.format;
  $("summaryDuration").textContent = `${draft.duration} segundos`;
  $("summaryExport").textContent = `${draft.export.fps} FPS • ${(draft.export.videoBitrateKbps / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} Mbps`;
  $("summaryCredits").textContent = `${cost.estimatedCredits} ${cost.estimatedCredits === 1 ? "crédito" : "créditos"}`;
}

function syncAiNarrationControls() {
  updateDirectorModeDescription("directorMode", "directorModeDescription");
  const semantic = ["semantic", "advanced"].includes($("directorMode").value);
  $("aiNarrationPanel").classList.toggle("hidden", !semantic);
  $("generateAiScript").disabled = !semantic;
  if (!semantic) { $("generateAiScript").checked = false; $("enableAiNarration").checked = false; }
  const scriptEnabled = semantic && $("generateAiScript").checked;
  $("enableAiNarration").disabled = !scriptEnabled;
  if (!scriptEnabled) $("enableAiNarration").checked = false;
  $("aiNarrationVoice").disabled = !$("enableAiNarration").checked;
  $("aiNarrationTone").disabled = !$("enableAiNarration").checked;
}

function applyTextPreset() {
  const preset = STUDIO_TEXT_PRESETS[$("textPreset").value] || STUDIO_TEXT_PRESETS.clean;
  $("textAnimation").value = preset.animation;
  $("textColor").value = preset.color;
  $("textBackground").checked = preset.background;
  updateSummary();
}

function updateTextSizeLabel() {
  $("textSizeValue").textContent = `${$("textSizeScale").value}%`;
}

function updateAudioCaptionLabels() {
  $("voiceVolumeValue").textContent = `${$("voiceVolume").value}%`;
  $("musicVolumeValue").textContent = `${$("musicVolume").value}%`;
  $("captionSizeValue").textContent = `${$("captionSizeScale").value}%`;
}

function switchView(name) {
  ["projects", "editor", "visual", "processing", "usage", "logs"].forEach((view) => $(`${view}View`)?.classList.toggle("hidden", view !== name));
  document.querySelectorAll("[data-studio-view]").forEach((button) => button.classList.toggle("active", button.dataset.studioView === name));
  $("studioViewTitle").textContent = viewTitles[name] || "Olá Studio";
  document.querySelector(".studio-shell")?.classList.remove("menu-open");
  if (name === "usage") loadUsage();
  if (name === "logs") loadLogs().catch((error) => toast(`Não foi possível carregar os logs: ${error.message}`));
  location.hash = name === "processing" ? "projects" : name;
}

function resetEditor() {
  state.files.forEach((item) => item.previewUrl && URL.revokeObjectURL(item.previewUrl));
  state.files = [];
  $("projectForm").reset();
  $("projectName").value = `Vídeo ${new Intl.DateTimeFormat("pt-BR").format(new Date())}`;
  $("logoFileLabel").innerHTML = '<i class="fa-regular fa-image"></i> Escolher PNG ou WebP';
  $("musicFileLabel").innerHTML = '<i class="fa-solid fa-music"></i> Escolher áudio';
  $("captionReviewEnabled").checked = true;
  syncAiNarrationControls();
  $("transcriptReviewCard").classList.add("hidden");
  showDirectorResult(null);
  state.reviewingJobId = "";
  state.transcriptSegments = [];
  updateTextSizeLabel();
  updateAudioCaptionLabels();
  renderMediaLibrary();
  updateSummary();
}

function openNewProject() {
  resetEditor();
  switchView("editor");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function validateIncomingFile(file) {
  const isVideo = file.type.startsWith("video/");
  const isImage = file.type.startsWith("image/");
  if (!isVideo && !isImage) return "Use somente imagens ou vídeos compatíveis.";
  if (isVideo && file.size > STUDIO_LIMITS.maxVideoBytes) return `${file.name}: vídeo acima de 250 MB.`;
  if (isImage && file.size > STUDIO_LIMITS.maxImageBytes) return `${file.name}: imagem acima de 20 MB.`;
  return "";
}

function addFiles(fileList) {
  const incoming = [...fileList];
  for (const file of incoming) {
    if (state.files.length >= STUDIO_LIMITS.maxFiles) { toast("O limite é de 10 arquivos por projeto."); break; }
    const error = validateIncomingFile(file);
    if (error) { toast(error); continue; }
    const duplicate = state.files.some((item) => item.file.name === file.name && item.file.size === file.size);
    if (!duplicate) state.files.push({ id: crypto.randomUUID(), file, previewUrl: URL.createObjectURL(file) });
  }
  const total = state.files.reduce((sum, item) => sum + item.file.size, 0);
  if (total > STUDIO_LIMITS.maxProjectBytes) {
    const removed = state.files.pop();
    if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);
    toast("O projeto ultrapassou o limite total de 1 GB.");
  }
  renderMediaLibrary();
  updateSummary();
}

function moveMedia(id, direction) {
  const index = state.files.findIndex((item) => item.id === id);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= state.files.length) return;
  [state.files[index], state.files[target]] = [state.files[target], state.files[index]];
  renderMediaLibrary();
}

function removeMedia(id) {
  const index = state.files.findIndex((item) => item.id === id);
  if (index < 0) return;
  const [removed] = state.files.splice(index, 1);
  if (removed.previewUrl) URL.revokeObjectURL(removed.previewUrl);
  renderMediaLibrary();
  updateSummary();
}

function renderMediaLibrary() {
  const root = $("mediaLibrary");
  if (!state.files.length) { root.innerHTML = ""; return; }
  root.innerHTML = state.files.map((item, index) => {
    const isImage = item.file.type.startsWith("image/");
    return `<article class="media-item" data-media-id="${item.id}">${isImage ? `<img class="media-thumb" src="${item.previewUrl}" alt="">` : `<div class="media-thumb media-icon"><i class="fa-solid fa-video"></i></div>`}<div class="media-details"><strong>${escapeHtml(item.file.name)}</strong><small>${isImage ? "Imagem" : "Vídeo"} • ${formatBytes(item.file.size)} • cena ${index + 1}</small></div><div class="media-actions"><button type="button" data-media-up="${item.id}" title="Mover para cima" ${index === 0 ? "disabled" : ""}><i class="fa-solid fa-arrow-up"></i></button><button type="button" data-media-down="${item.id}" title="Mover para baixo" ${index === state.files.length - 1 ? "disabled" : ""}><i class="fa-solid fa-arrow-down"></i></button><button type="button" data-media-remove="${item.id}" title="Remover"><i class="fa-solid fa-trash"></i></button></div></article>`;
  }).join("");
}

function updateProgress(percent, stage, message = "") {
  const safe = Math.max(0, Math.min(100, Number(percent || 0)));
  $("processingBar").style.width = `${safe}%`;
  $("processingPercent").textContent = `${Math.round(safe)}%`;
  $("processingStage").textContent = stage || "Processando";
  if (message) $("processingMessage").textContent = message;
}

function markProcessStep(step) {
  const order = ["upload", "queue", "analysis", "transcription", "render", "complete"];
  const activeIndex = Math.max(0, order.indexOf(step));
  document.querySelectorAll("[data-process-step]").forEach((item) => {
    const index = order.indexOf(item.dataset.processStep);
    item.classList.toggle("active", index === activeIndex);
    item.classList.toggle("done", index < activeIndex || step === "complete");
  });
}

function uploadFile(file, path, progressCallback) {
  return new Promise((resolve, reject) => {
    const task = uploadBytesResumable(storageRef(storage, path), file, { contentType: file.type, customMetadata: { originalName: file.name, ownerUid: state.user.uid } });
    state.activeUploads.add(task);
    task.on("state_changed", (snapshot) => progressCallback(snapshot.bytesTransferred, snapshot.totalBytes), (error) => {
      state.activeUploads.delete(task);
      reject(error);
    }, async () => {
      state.activeUploads.delete(task);
      resolve({ storagePath: path, downloadUrl: await getDownloadURL(task.snapshot.ref) });
    });
  });
}

async function uploadProjectAssets(projectId) {
  const bytesById = new Map();
  const totalBytes = state.files.reduce((sum, item) => sum + item.file.size, 0) + Number($("logoFile").files[0]?.size || 0) + Number($("musicFile").files[0]?.size || 0);
  const uploadOne = async (file, category, id) => {
    const path = `studio/${state.user.uid}/${category}/${projectId}/${Date.now()}-${cleanFileName(file.name)}`;
    const uploaded = await uploadFile(file, path, (sent) => {
      bytesById.set(id, sent);
      const aggregate = [...bytesById.values()].reduce((sum, value) => sum + value, 0);
      updateProgress(totalBytes ? aggregate / totalBytes * 25 : 25, "Enviando arquivos", `${Math.round(aggregate / 1024 / 1024)} MB enviados de ${Math.max(1, Math.round(totalBytes / 1024 / 1024))} MB.`);
    });
    return { ...uploaded, name: file.name, size: file.size, contentType: file.type };
  };
  const sources = [];
  for (let index = 0; index < state.files.length; index += 1) {
    const item = state.files[index];
    sources.push({ id: item.id, order: index, ...(await uploadOne(item.file, "originals", item.id)) });
  }
  const logoFile = $("logoFile").files[0];
  const musicFile = $("musicFile").files[0];
  const logo = logoFile ? await uploadOne(logoFile, "logos", "logo") : null;
  const music = musicFile ? await uploadOne(musicFile, "music", "music") : null;
  return { sources, logo, music };
}

async function submitProject(event) {
  event.preventDefault();
  if (!state.files.length) return toast("Adicione ao menos uma foto ou vídeo.");
  if (!$("projectName").value.trim()) return toast("Informe um nome para o projeto.");
  const activeJobs = state.projects.filter((item) => ["uploading", "queued", "analyzing", "rendering", "awaiting_review", "cancel_requested"].includes(item.status));
  if (activeJobs.length >= STUDIO_LIMITS.maxConcurrentJobsPerUser) return toast("Aguarde o processamento atual terminar antes de criar outro vídeo.");
  resetProcessingLog("Preparando o envio dos arquivos originais.");
  switchView("processing");
  $("resultCard").classList.add("hidden");
  $("errorCard").classList.add("hidden");
  $("transcriptReviewCard").classList.add("hidden");
  $("processingEyebrow").textContent = "Enviando arquivos";
  $("processingTitle").textContent = "Enviando seus arquivos";
  markProcessStep("upload");
  updateProgress(1, "Preparando upload", "Os arquivos originais serão mantidos com segurança.");
  const projectRef = push(ref(db, `studioProjects/${state.user.uid}`));
  const projectId = projectRef.key;
  state.activeProjectId = projectId;
  state.activeJobId = "";
  state.cancelRequested = false;
  $("processingStatusCard").classList.remove("hidden");
  $("cancelProcessingButton").classList.remove("hidden");
  $("cancelProcessingButton").disabled = false;
  try {
    const initialDraft = currentDraft();
    const now = Date.now();
    await set(projectRef, { ...initialDraft, sources: [], ownerUid: state.user.uid, status: "uploading", createdAt: now, updatedAt: now, retentionUntil: now + STUDIO_LIMITS.retentionDays * 86400000 });
    const assets = await uploadProjectAssets(projectId);
    const latestProject = (await get(projectRef)).val();
    if (state.cancelRequested || ["cancel_requested", "cancelled"].includes(latestProject?.status)) throw Object.assign(new Error("Criação cancelada."), { code: "studio_cancelled" });
    const project = normalizeStudioProject({ ...initialDraft, ...assets });
    const cost = studioJobCostEstimate(project);
    const jobRef = push(ref(db, `studioJobs/${state.user.uid}`));
    const jobId = jobRef.key;
    state.activeJobId = jobId;
    const job = { schemaVersion: 1, id: jobId, projectId, ownerUid: state.user.uid, status: "queued", progress: 25, stage: "queue", attempt: 0, createdAt: Date.now(), updatedAt: Date.now(), costEstimate: cost };
    await update(ref(db), { [`studioProjects/${state.user.uid}/${projectId}`]: { ...project, ownerUid: state.user.uid, status: "queued", jobId, costEstimate: cost, createdAt: now, updatedAt: Date.now(), retentionUntil: now + STUDIO_LIMITS.retentionDays * 86400000 }, [`studioJobs/${state.user.uid}/${jobId}`]: job, [`studioUsage/${state.user.uid}/estimates/${jobId}`]: { projectId, ...cost, status: "reserved", createdAt: Date.now() } });
    $("processingTitle").textContent = "Projeto enviado para a fila";
    markProcessStep("queue");
    updateProgress(25, "Aguardando worker", "O worker FFmpeg assumirá o processamento assim que estiver online.");
    watchJob(jobId, projectId);
  } catch (error) {
    if (state.cancelRequested || error?.code === "storage/canceled" || error?.code === "studio_cancelled") await finishClientCancellation(projectId);
    else await failLocalProject(projectId, error);
  }
}

async function finishClientCancellation(projectId) {
  state.jobUnsubscribe?.();
  state.jobUnsubscribe = null;
  const updates = { [`studioProjects/${state.user.uid}/${projectId}/status`]: "cancelled", [`studioProjects/${state.user.uid}/${projectId}/updatedAt`]: Date.now() };
  if (state.activeJobId) {
    updates[`studioJobs/${state.user.uid}/${state.activeJobId}/status`] = "cancelled";
    updates[`studioJobs/${state.user.uid}/${state.activeJobId}/stage`] = "cancelled";
    updates[`studioJobs/${state.user.uid}/${state.activeJobId}/message`] = "Criação cancelada pelo usuário.";
    updates[`studioJobs/${state.user.uid}/${state.activeJobId}/cancelledAt`] = Date.now();
    updates[`studioUsage/${state.user.uid}/estimates/${state.activeJobId}/status`] = "cancelled";
  }
  await update(ref(db), updates).catch(() => {});
  $("cancelProcessingButton").classList.add("hidden");
  toast("Criação cancelada.");
  await loadProjects();
  switchView("projects");
}

async function cancelProject(projectId = state.activeProjectId) {
  if (!projectId || !window.confirm("Deseja cancelar esta criação? O vídeo em processamento não será concluído.")) return;
  const projectSnapshot = await get(ref(db, `studioProjects/${state.user.uid}/${projectId}`));
  const project = projectSnapshot.val();
  if (!project || ["completed", "failed", "cancelled"].includes(project.status)) return toast("Este processamento já foi encerrado.");
  if (projectId === state.activeProjectId) {
    state.cancelRequested = true;
    state.activeUploads.forEach((task) => task.cancel());
  }
  const jobId = project.jobId || (projectId === state.activeProjectId ? state.activeJobId : "");
  let jobStatus = "cancelled";
  let jobMode = "final";
  if (jobId) {
    const jobSnapshot = await get(ref(db, `studioJobs/${state.user.uid}/${jobId}`));
    jobMode = jobSnapshot.val()?.mode || "final";
    if (["analyzing", "rendering"].includes(jobSnapshot.val()?.status)) jobStatus = "cancel_requested";
  }
  const now = Date.now();
  const projectStatus = jobMode === "preview" && jobStatus === "cancelled" ? "completed" : jobStatus;
  const updates = { [`studioProjects/${state.user.uid}/${projectId}/status`]: projectStatus, [`studioProjects/${state.user.uid}/${projectId}/updatedAt`]: now };
  if (jobId) {
    updates[`studioJobs/${state.user.uid}/${jobId}/status`] = jobStatus;
    updates[`studioJobs/${state.user.uid}/${jobId}/stage`] = jobStatus;
    updates[`studioJobs/${state.user.uid}/${jobId}/message`] = jobStatus === "cancel_requested" ? "Interrompendo o processamento em segurança." : "Criação cancelada pelo usuário.";
    updates[`studioJobs/${state.user.uid}/${jobId}/cancelRequestedAt`] = now;
    if (jobStatus === "cancelled") updates[`studioUsage/${state.user.uid}/estimates/${jobId}/status`] = "cancelled";
  }
  await update(ref(db), updates);
  if (jobStatus === "cancel_requested") {
    $("cancelProcessingButton").disabled = true;
    updateProgress(Number($("processingPercent").textContent.replace("%", "")) || 25, "Cancelando", "O worker está encerrando o FFmpeg e limpando os arquivos temporários.");
    toast("Cancelamento solicitado.");
  } else {
    toast("Criação cancelada.");
    await loadProjects();
    switchView("projects");
  }
}

async function failLocalProject(projectId, error) {
  console.error(error);
  if (projectId) await update(ref(db, `studioProjects/${state.user.uid}/${projectId}`), { status: "failed", updatedAt: Date.now(), error: { code: "frontend_error", message: String(error?.message || error).slice(0, 300) } }).catch(() => {});
  showProcessingError(String(error?.message || "Falha ao enviar o projeto."));
}

function showProcessingError(message) {
  $("processingTitle").textContent = "Processamento interrompido";
  $("processingMessage").textContent = "Revise a mensagem abaixo e tente novamente.";
  $("processingError").textContent = message;
  $("errorCard").classList.remove("hidden");
}

function timelineTime(seconds) {
  const value = Math.max(0, Number(seconds || 0));
  const minutes = Math.floor(value / 60);
  const remaining = (value % 60).toFixed(1).padStart(4, "0");
  return `${String(minutes).padStart(2, "0")}:${remaining}`;
}

function sanitizeTranscriptReviewSegments(segments = []) {
  const sanitized = [];
  let insideNonSpeechLabel = false;
  for (const segment of segments) {
    const text = String(segment?.text || "").replace(/\s+/g, " ").trim();
    if (insideNonSpeechLabel || text.includes("[")) {
      insideNonSpeechLabel = !text.includes("]");
      continue;
    }
    if (text.includes("]") || /^[♪♫♬]+$/.test(text)) {
      insideNonSpeechLabel = false;
      continue;
    }
    if (text) sanitized.push({ ...segment, text });
  }
  return sanitized;
}

function transcriptReviewSegmentCard(segment, index) {
  const uncertainWords = [...new Set((segment.words || [])
    .filter((word) => Number.isFinite(Number(word?.confidence)) && Number(word.confidence) < 0.62)
    .map((word) => String(word.text || "").trim())
    .filter(Boolean))].slice(0, 8);
  const warning = uncertainWords.length ? `<small class="transcript-confidence"><i class="fa-solid fa-triangle-exclamation"></i> Confira principalmente: ${escapeHtml(uncertainWords.join(", "))}</small>` : "";
  return `<article class="transcript-segment" data-transcript-segment="${index}"><button class="transcript-play-button" type="button" data-transcript-preview="${index}" aria-label="Ouvir trecho ${index + 1}"><i class="fa-solid fa-play"></i><span>${timelineTime(segment.start)} – ${timelineTime(segment.end)}</span><small>Ouvir trecho</small></button><label><span class="sr-only">Texto do trecho ${index + 1}</span>${warning}<textarea data-transcript-index="${index}" maxlength="300" aria-label="Trecho ${index + 1}">${escapeHtml(segment.text || "")}</textarea></label></article>`;
}

function updateTranscriptPreviewSelection(index) {
  state.activeTranscriptIndex = index;
  document.querySelectorAll("[data-transcript-segment]").forEach((card) => card.classList.toggle("active", Number(card.dataset.transcriptSegment) === index));
  const segment = state.transcriptSegments[index];
  if (segment) $("transcriptPreviewStatus").textContent = `Trecho ${index + 1} de ${state.transcriptSegments.length} • ${timelineTime(segment.start)} – ${timelineTime(segment.end)}`;
  $("transcriptPreviousButton").disabled = index <= 0;
  $("transcriptNextButton").disabled = index < 0 || index >= state.transcriptSegments.length - 1;
}

function previewTranscriptSegment(index, { play = true } = {}) {
  const segment = state.transcriptSegments[index];
  const player = $("transcriptReviewPlayer");
  if (!segment) return;
  updateTranscriptPreviewSelection(index);
  if (!player.src) return toast("A prévia deste processamento ainda não está disponível.");
  const seek = () => {
    const target = Math.max(0, Number(segment.start || 0) - 0.15);
    player.currentTime = Number.isFinite(player.duration) ? Math.min(target, Math.max(0, player.duration - 0.05)) : target;
    if (play) player.play().catch(() => toast("Use o botão de reprodução do vídeo para ouvir este trecho."));
  };
  if (player.readyState >= 1) seek();
  else player.addEventListener("loadedmetadata", seek, { once: true });
}

async function loadTranscriptReviewPreview(job) {
  const player = $("transcriptReviewPlayer");
  player.pause();
  player.removeAttribute("src");
  player.load();
  if (state.transcriptReviewUrl.startsWith("blob:")) URL.revokeObjectURL(state.transcriptReviewUrl);
  state.transcriptReviewUrl = "";
  const preview = job.transcriptReview?.preview;
  const available = Boolean(preview?.storagePath || preview?.downloadUrl);
  $("transcriptPreviousButton").disabled = !available;
  $("transcriptNextButton").disabled = !available;
  $("transcriptPreviewMessage").textContent = available ? "Clique em “Ouvir trecho” para reproduzir exatamente o momento correspondente." : "Este processamento foi iniciado antes da prévia por trecho. Novos vídeos permitirão revisar assistindo ao corte exato.";
  if (!available) return;
  try {
    const url = await privateOutputUrl(preview);
    state.transcriptReviewUrl = url;
    player.src = url;
    player.load();
  } catch (error) {
    console.error(error);
    $("transcriptPreviewMessage").textContent = `Não foi possível abrir a prévia: ${error.message}`;
  }
}

function clearTranscriptReviewPreview() {
  const player = $("transcriptReviewPlayer");
  player.pause();
  player.removeAttribute("src");
  player.load();
  if (state.transcriptReviewUrl.startsWith("blob:")) URL.revokeObjectURL(state.transcriptReviewUrl);
  state.transcriptReviewUrl = "";
  state.activeTranscriptIndex = -1;
}

function showTranscriptReview(job, projectId) {
  if (state.reviewingJobId === job.id && !$("transcriptReviewCard").classList.contains("hidden")) return;
  const rawSegments = Array.isArray(job.transcriptReview?.segments) ? job.transcriptReview.segments : Object.values(job.transcriptReview?.segments || {});
  state.reviewingJobId = job.id;
  state.transcriptSegments = sanitizeTranscriptReviewSegments(rawSegments.slice(0, 500));
  state.activeTranscriptIndex = -1;
  state.activeProjectId = projectId;
  state.activeJobId = job.id;
  $("processingStatusCard").classList.add("hidden");
  $("resultCard").classList.add("hidden");
  $("errorCard").classList.add("hidden");
  $("transcriptReviewCard").classList.remove("hidden");
  $("transcriptReviewCount").textContent = `${state.transcriptSegments.length} ${state.transcriptSegments.length === 1 ? "trecho" : "trechos"}`;
  $("transcriptReviewList").innerHTML = state.transcriptSegments.length ? state.transcriptSegments.map(transcriptReviewSegmentCard).join("") : '<p class="empty-copy">Nenhuma fala foi reconhecida. Você pode aprovar para continuar sem legendas.</p>';
  updateTranscriptPreviewSelection(-1);
  loadTranscriptReviewPreview(job);
  $("approveTranscriptButton").disabled = false;
  $("studioViewTitle").textContent = "Revisar legendas";
}

async function approveTranscriptReview() {
  const jobId = state.reviewingJobId;
  const projectId = state.activeProjectId;
  if (!jobId || !projectId) return;
  const button = $("approveTranscriptButton");
  button.disabled = true;
  try {
    const now = Date.now();
    const updates = {
      [`studioJobs/${state.user.uid}/${jobId}/transcriptReview/status`]: "approved",
      [`studioJobs/${state.user.uid}/${jobId}/transcriptReview/approvedAt`]: now,
      [`studioJobs/${state.user.uid}/${jobId}/transcriptReview/approvedBy`]: state.user.uid,
      [`studioJobs/${state.user.uid}/${jobId}/status`]: "queued",
      [`studioJobs/${state.user.uid}/${jobId}/stage`]: "queue",
      [`studioJobs/${state.user.uid}/${jobId}/progress`]: 88,
      [`studioJobs/${state.user.uid}/${jobId}/message`]: "Transcrição aprovada. Preparando a renderização final.",
      [`studioJobs/${state.user.uid}/${jobId}/updatedAt`]: now,
      [`studioProjects/${state.user.uid}/${projectId}/status`]: "queued",
      [`studioProjects/${state.user.uid}/${projectId}/updatedAt`]: now,
      [`studioUsage/${state.user.uid}/estimates/${jobId}/status`]: "reserved"
    };
    const reviewedSegments = state.transcriptSegments.map((segment) => ({ ...segment }));
    document.querySelectorAll("[data-transcript-index]").forEach((field) => {
      const index = Number(field.dataset.transcriptIndex);
      reviewedSegments[index].text = String(field.value || "").replace(/\s+/g, " ").trim().slice(0, 300);
    });
    updates[`studioJobs/${state.user.uid}/${jobId}/transcriptReview/segments`] = reviewedSegments.filter((segment) => segment.text);
    await update(ref(db), updates);
    state.reviewingJobId = "";
    state.transcriptSegments = [];
    clearTranscriptReviewPreview();
    $("transcriptReviewCard").classList.add("hidden");
    $("processingStatusCard").classList.remove("hidden");
    $("cancelProcessingButton").classList.remove("hidden");
    $("cancelProcessingButton").disabled = false;
    $("processingEyebrow").textContent = "Transcrição aprovada";
    $("processingTitle").textContent = "Renderização final na fila";
    markProcessStep("queue");
    updateProgress(88, "Aguardando worker", "As correções foram salvas. O vídeo final usará esta transcrição.");
    await loadProjects();
  } catch (error) {
    console.error(error);
    button.disabled = false;
    toast("Não foi possível salvar a revisão. Tente novamente.");
  }
}

async function openProjectProgress(projectId, { automatic = false } = {}) {
  const project = state.projects.find((item) => item.id === projectId) || (await get(ref(db, `studioProjects/${state.user.uid}/${projectId}`))).val();
  if (!project?.jobId) return toast("O processamento deste projeto não foi encontrado.");
  state.activeProjectId = projectId;
  state.activeJobId = project.jobId;
  state.cancelRequested = false;
  resetProcessingLog(automatic ? "Sessão recuperada. Reconectando ao processamento em andamento." : "Carregando os detalhes do processamento.");
  switchView("processing");
  watchJob(project.jobId, projectId);
  if (automatic) toast("Processamento retomado automaticamente.");
}

async function resumeLatestProcessing() {
  const project = state.projects.find((item) => resumableStatuses.has(item.status) && item.jobId);
  if (!project) return false;
  await openProjectProgress(project.id, { automatic: true });
  return true;
}

function watchJob(jobId, projectId) {
  state.jobUnsubscribe?.();
  state.jobUnsubscribe = onValue(ref(db, `studioJobs/${state.user.uid}/${jobId}`), async (snapshot) => {
    const job = snapshot.val();
    if (!job) return;
    renderProcessingLog(job.events, job);
    updateProcessingTiming(job);
    const step = job.status === "cancel_requested" ? (Number(job.progress || 0) >= 50 ? "render" : "analysis") : job.stage === "probe" || job.stage === "analysis" || job.stage === "planning" ? "analysis" : job.stage === "transcription" || job.stage === "transcription_review" ? "transcription" : ["render", "quality_review", "upload_output"].includes(job.stage) ? "render" : job.status === "completed" ? "complete" : job.status === "queued" ? "queue" : "upload";
    markProcessStep(step);
    updateProgress(job.progress || 25, statusLabels[job.status] || job.stage || "Processando", job.message || "O processamento continua no worker.");
    if (job.status === "awaiting_review") {
      showTranscriptReview(job, projectId);
      loadProjects();
      return;
    }
    if (job.status === "completed") {
      state.jobUnsubscribe?.();
      state.jobUnsubscribe = null;
      if (job.mode === "preview") {
        $("cancelProcessingButton").classList.add("hidden");
        await loadProjects();
        toast("Prévia rápida concluída.");
        await openVisualEditor(projectId, job.output);
        return;
      }
      $("processingTitle").textContent = "Seu vídeo está pronto";
      $("processingMessage").textContent = "Assista à prévia e baixe o MP4 em alta qualidade.";
      $("cancelProcessingButton").classList.add("hidden");
      $("transcriptReviewCard").classList.add("hidden");
      if (state.outputPreviewUrl) URL.revokeObjectURL(state.outputPreviewUrl);
      const outputUrl = await privateOutputUrl(job.output);
      state.outputPreviewUrl = outputUrl.startsWith("blob:") ? outputUrl : "";
      $("previewPlayer").src = outputUrl;
      $("downloadVideo").href = outputUrl;
      $("downloadVideo").download = `${cleanFileName(job.output?.fileName || "ola-studio.mp4")}`;
      showDirectorResult(job.director);
      await loadAndRenderProjectCost(jobId, job.director);
      $("resultCard").classList.remove("hidden");
      loadProjects();
    }
    if (job.status === "failed") {
      state.jobUnsubscribe?.();
      state.jobUnsubscribe = null;
      $("cancelProcessingButton").classList.add("hidden");
      $("transcriptReviewCard").classList.add("hidden");
      showProcessingError(job.error?.message || "O worker não conseguiu concluir a renderização.");
      loadProjects();
    }
    if (job.status === "cancelled") {
      state.jobUnsubscribe?.();
      state.jobUnsubscribe = null;
      state.cancelRequested = false;
      $("cancelProcessingButton").classList.add("hidden");
      $("transcriptReviewCard").classList.add("hidden");
      toast("Criação cancelada.");
      loadProjects().then(() => switchView("projects"));
    }
  });
}

async function regenerateProject(projectId, options = {}) {
  const snapshot = await get(ref(db, `studioProjects/${state.user.uid}/${projectId}`));
  const project = snapshot.val();
  if (!project?.sources?.length) return toast("Projeto sem arquivos de origem.");
  const directorMode = ["semantic", "advanced"].includes(options.directorMode) ? options.directorMode : options.directorMode === "local" ? "local" : (["semantic", "advanced"].includes(project.director?.mode) ? project.director.mode : "local");
  if (directorMode === "advanced" && state.featureFlags.advancedDirectorEnabled !== true) return toast("O Diretor Avançado não está habilitado neste ambiente.");
  const directorBrief = String(options.directorBrief ?? project.director?.brief ?? "").trim().slice(0, 1200);
  const effectsProfile = STUDIO_VISUAL_EFFECTS[options.effectsProfile] ? options.effectsProfile : (STUDIO_VISUAL_EFFECTS[project.effectsProfile] ? project.effectsProfile : "professional");
  const jobRef = push(ref(db, `studioJobs/${state.user.uid}`));
  const jobId = jobRef.key;
  const configuredProject = { ...project, director: { ...(project.director || {}), mode: directorMode, brief: directorBrief }, effectsProfile };
  const cost = studioJobCostEstimate(configuredProject);
  const now = Date.now();
  await update(ref(db), { [`studioJobs/${state.user.uid}/${jobId}`]: { schemaVersion: 2, id: jobId, projectId, ownerUid: state.user.uid, status: "queued", stage: "queue", progress: 25, attempt: 0, createdAt: now, updatedAt: now, costEstimate: cost }, [`studioProjects/${state.user.uid}/${projectId}/director`]: configuredProject.director, [`studioProjects/${state.user.uid}/${projectId}/effectsProfile`]: effectsProfile, [`studioProjects/${state.user.uid}/${projectId}/jobId`]: jobId, [`studioProjects/${state.user.uid}/${projectId}/status`]: "queued", [`studioProjects/${state.user.uid}/${projectId}/updatedAt`]: now, [`studioUsage/${state.user.uid}/estimates/${jobId}`]: { projectId, ...cost, status: "reserved", createdAt: now } });
  state.activeProjectId = projectId;
  state.activeJobId = jobId;
  state.cancelRequested = false;
  resetProcessingLog(`Nova montagem enviada com ${directorMode === "advanced" ? "Diretor Avançado" : directorMode === "semantic" ? "Diretor de IA" : "direção automática local"} e efeito ${STUDIO_VISUAL_EFFECTS[effectsProfile].label}.`);
  switchView("processing");
  $("processingStatusCard").classList.remove("hidden");
  $("cancelProcessingButton").classList.remove("hidden");
  $("cancelProcessingButton").disabled = false;
  $("resultCard").classList.add("hidden");
  $("errorCard").classList.add("hidden");
  $("transcriptReviewCard").classList.add("hidden");
  $("processingEyebrow").textContent = "Processando nova versão";
  $("processingTitle").textContent = "Nova versão na fila";
  markProcessStep("queue");
  updateProgress(25, "Aguardando worker", "Os arquivos originais serão reutilizados sem novo upload.");
  watchJob(jobId, projectId);
}

async function requestProjectDeletion(projectId) {
  const snapshot = await get(ref(db, `studioProjects/${state.user.uid}/${projectId}`));
  const project = snapshot.val();
  if (!project) return toast("Este projeto não foi encontrado ou já foi excluído.");
  if (["uploading", "queued", "analyzing", "rendering", "awaiting_review", "cancel_requested", "deletion_queued", "deleting"].includes(project.status)) return toast("Cancele ou aguarde o processamento atual antes de excluir.");
  const projectName = project.name || "Projeto sem nome";
  const confirmed = window.confirm(`Excluir permanentemente “${projectName}”?\n\nOs arquivos originais, logos, músicas, planos e vídeos renderizados deste projeto serão removidos. Esta ação não pode ser desfeita.`);
  if (!confirmed) return;
  const deletionToken = crypto.randomUUID();
  const jobRef = push(ref(db, `studioJobs/${state.user.uid}`));
  const jobId = jobRef.key;
  const now = Date.now();
  await update(ref(db), {
    [`studioJobs/${state.user.uid}/${jobId}`]: { schemaVersion: 1, id: jobId, projectId, ownerUid: state.user.uid, mode: "delete", deletionAuthorized: true, deletionToken, status: "queued", stage: "queue", progress: 25, attempt: 0, createdAt: now, updatedAt: now },
    [`studioProjects/${state.user.uid}/${projectId}/status`]: "deletion_queued",
    [`studioProjects/${state.user.uid}/${projectId}/jobId`]: jobId,
    [`studioProjects/${state.user.uid}/${projectId}/deletionRequest`]: { token: deletionToken, requestedBy: state.user.uid, confirmedAt: now },
    [`studioProjects/${state.user.uid}/${projectId}/updatedAt`]: now
  });
  state.activeProjectId = projectId;
  state.activeJobId = jobId;
  toast("Exclusão confirmada e enviada para a fila segura.");
  await loadProjects();
}

function watchDeletionJob(jobId, projectId) {
  state.jobUnsubscribe?.();
  state.jobUnsubscribe = onValue(ref(db, `studioJobs/${state.user.uid}/${jobId}`), async (snapshot) => {
    const job = snapshot.val();
    if (!job) return;
    if (["analyzing", "deleting"].includes(job.status)) {
      const project = state.projects.find((item) => item.id === projectId);
      if (project) project.status = "deleting";
      renderProjects();
    }
    if (job.status === "completed") {
      state.jobUnsubscribe?.();
      state.jobUnsubscribe = null;
      state.projects = state.projects.filter((item) => item.id !== projectId);
      renderProjects();
      toast("Projeto e mídias excluídos permanentemente.");
    }
    if (job.status === "failed") {
      state.jobUnsubscribe?.();
      state.jobUnsubscribe = null;
      await loadProjects();
      toast(job.error?.message || "Não foi possível excluir o projeto.");
    }
  });
}

async function readPrivateJson(storagePath) {
  if (!storagePath) throw new Error("Plano de edição não encontrado.");
  const fileRef = storageRef(storage, storagePath);
  const url = await withStudioTimeout(getDownloadURL(fileRef), "O endereço privado do plano demorou demais para carregar.");
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), STORAGE_OPERATION_TIMEOUT_MS);
  try {
    const response = await fetch(url, { cache: "no-store", signal: controller.signal });
    if (!response.ok) throw new Error(`O plano respondeu HTTP ${response.status}.`);
    return await response.json();
  } catch (error) {
    if (error?.name === "AbortError") throw new Error("O plano demorou demais para carregar. Verifique sua conexão e tente novamente.");
    throw error;
  } finally {
    window.clearTimeout(timer);
  }
}

function normalizeVisualPlan(plan) {
  const narration = plan?.narration || {};
  return {
    ...plan,
    effectsProfile: STUDIO_VISUAL_EFFECTS[plan?.effectsProfile] ? plan.effectsProfile : "professional",
    scenes: Array.isArray(plan?.scenes) ? plan.scenes : [],
    narration: {
      enabled: narration.enabled === true,
      generateScript: narration.generateScript === true,
      generated: narration.generated === true,
      reviewed: narration.reviewed === true,
      script: String(narration.script || ""),
      voice: ["marin", "cedar"].includes(narration.voice) ? narration.voice : "marin",
      tone: ["professional", "warm", "energetic", "calm"].includes(narration.tone) ? narration.tone : "professional",
      volume: Number(narration.volume || 1)
    }
  };
}

function syncVisualDirectionEffects() {
  if (!state.visualPlan) return;
  const profile = STUDIO_VISUAL_EFFECTS[$("visualEffectsProfile").value] ? $("visualEffectsProfile").value : "professional";
  state.visualPlan.effectsProfile = profile;
  state.visualPlan.scenes = (state.visualPlan.scenes || []).map((scene) => ({ ...scene, visualEffect: profile }));
}

function visualPlanDuration() {
  const scenes = state.visualPlan?.scenes || [];
  return Number(scenes.reduce((total, scene, index) => total + Number(scene.duration || 0) - (index ? Number(scene.transitionDuration || 0) : 0), 0).toFixed(3));
}

function syncVisualTexts() {
  if (!state.visualPlan) return;
  const values = { title: $("visualTitle").value.trim(), subtitle: $("visualSubtitle").value.trim(), call_to_action: $("visualCta").value.trim() };
  state.visualPlan.text = { title: values.title, subtitle: values.subtitle, callToAction: values.call_to_action };
  const duration = visualPlanDuration();
  const defaults = {
    title: { start: 0, end: Math.min(5, duration), position: "top", sizeScale: 1.2, slot: 0 },
    subtitle: { start: 0.4, end: Math.min(5.8, duration), position: "top", sizeScale: 0.82, slot: 1 },
    call_to_action: { start: Math.max(0, duration - 4.5), end: duration, position: "bottom", sizeScale: 1, slot: 0 }
  };
  const existing = new Map((state.visualPlan.textLayers || []).filter((layer) => ["title", "subtitle", "call_to_action"].includes(layer.type)).map((layer) => [layer.type, layer]));
  const other = (state.visualPlan.textLayers || []).filter((layer) => !Object.hasOwn(values, layer.type));
  state.visualPlan.textLayers = [...other, ...Object.entries(values).filter(([, value]) => value).map(([type, value]) => ({ ...defaults[type], ...(existing.get(type) || {}), type, value, ...(type === "call_to_action" ? { start: Math.max(0, duration - 4.5), end: duration } : {}) }))];
}

function transitionOptions(selected, first) {
  if (first) return '<option value="none">Início do vídeo</option>';
  return Object.values(STUDIO_TRANSITIONS).filter((item) => item.id !== "auto").map((item) => `<option value="${item.ffmpeg}" ${item.ffmpeg === selected ? "selected" : ""}>${escapeHtml(item.label)}</option>`).join("");
}

function visualTransitionDurationLimit(index) {
  if (!state.visualPlan?.scenes?.[index] || index < 1) return 0;
  const scene = state.visualPlan.scenes[index];
  const previous = state.visualPlan.scenes[index - 1];
  return Math.max(0.1, Math.min(1.5, Number(scene.duration || 0) / 2, Number(previous.duration || 0) / 2));
}

function clampVisualTransitionDuration(index, value) {
  const scene = state.visualPlan?.scenes?.[index];
  if (!scene || index < 1 || scene.transition === "hardcut") return 0;
  return Number(Math.max(0.1, Math.min(visualTransitionDurationLimit(index), Number(value || 0.35))).toFixed(2));
}

function visualWaveformSamples() {
  const direct = state.visualPlan?.audio?.waveform;
  if (direct?.method === "music-pcm-envelope-v1" && direct.samples?.length) return direct.samples;
  const sourceWaveforms = new Map((state.visualPlan?.analysis?.sources || []).map((source) => [source.sourceId, source.waveform]));
  if (![...sourceWaveforms.values()].some((waveform) => waveform?.available)) return direct?.samples || [];
  const scenes = state.visualPlan.scenes || [];
  const duration = visualPlanDuration();
  const timeline = [];
  let cursor = 0;
  scenes.forEach((scene, index) => {
    cursor -= index ? Number(scene.transitionDuration || 0) : 0;
    timeline.push({ start: cursor, end: cursor + Number(scene.duration || 0), scene });
    cursor += Number(scene.duration || 0);
  });
  return Array.from({ length: 120 }, (_, bin) => {
    const time = (bin + 0.5) / 120 * Math.max(0.1, duration);
    return Math.max(0, ...timeline.filter((item) => time >= item.start && time <= item.end).map((item) => {
      const waveform = sourceWaveforms.get(item.scene.sourceId);
      if (!waveform?.samples?.length) return 0;
      const source = (state.visualProject?.sources || []).find((entry) => entry.id === item.scene.sourceId);
      const sourceDuration = Number(waveform.duration || source?.duration || item.scene.duration || 1);
      const sourceTime = Number(item.scene.start || 0) + time - item.start;
      return Number(waveform.samples[Math.min(waveform.samples.length - 1, Math.max(0, Math.floor(sourceTime / sourceDuration * waveform.samples.length)))] || 0);
    }));
  });
}

function renderVisualWaveform() {
  const root = $("visualWaveform");
  const samples = visualWaveformSamples();
  if (!samples.length || !samples.some((value) => value > 0.002)) {
    root.className = "visual-waveform empty";
    root.textContent = "Sem áudio detectado neste plano";
    $("visualAudioLabel").textContent = "Nenhuma forma de onda disponível";
    return;
  }
  root.className = "visual-waveform";
  root.innerHTML = samples.map((value) => `<i style="height:${Math.max(4, Math.round(Number(value || 0) * 58))}px"></i>`).join("");
  $("visualAudioLabel").textContent = state.visualPlan.audio?.waveform?.method === "music-pcm-envelope-v1" ? "Energia real da trilha musical" : "Energia real da voz e do som original";
}

function renderVisualTextLayers() {
  const standard = new Set(["title", "subtitle", "call_to_action"]);
  const layers = (state.visualPlan?.textLayers || []).filter((layer) => !standard.has(layer.type));
  $("visualTextLayers").innerHTML = layers.length ? layers.map((layer) => `<article class="visual-text-layer" data-text-layer="${escapeHtml(layer.id)}"><textarea data-layer-field="value" maxlength="180" aria-label="Texto da camada">${escapeHtml(layer.value || "")}</textarea><button class="visual-text-layer-remove" data-layer-remove="${escapeHtml(layer.id)}" type="button" title="Remover camada"><i class="fa-solid fa-trash"></i></button><div class="visual-text-layer-fields"><label>Entrada<input data-layer-field="start" type="number" min="0" max="90" step="0.1" value="${Number(layer.start || 0).toFixed(1)}"></label><label>Saída<input data-layer-field="end" type="number" min="0.1" max="90" step="0.1" value="${Number(layer.end || 0).toFixed(1)}"></label><label>Posição<select data-layer-field="position"><option value="top" ${layer.position === "top" ? "selected" : ""}>Superior</option><option value="center" ${layer.position === "center" ? "selected" : ""}>Centro</option><option value="bottom" ${layer.position === "bottom" ? "selected" : ""}>Inferior</option></select></label><label>Animação<select data-layer-field="animation"><option value="fade" ${layer.animation === "fade" ? "selected" : ""}>Fade</option><option value="slide_up" ${layer.animation === "slide_up" ? "selected" : ""}>Slide Up</option><option value="slide_down" ${layer.animation === "slide_down" ? "selected" : ""}>Slide Down</option><option value="typewriter" ${layer.animation === "typewriter" ? "selected" : ""}>Máquina de escrever</option><option value="zoom_pop" ${layer.animation === "zoom_pop" ? "selected" : ""}>Zoom Pop</option><option value="soft_bounce" ${layer.animation === "soft_bounce" ? "selected" : ""}>Bounce suave</option><option value="reveal" ${layer.animation === "reveal" ? "selected" : ""}>Revelação</option><option value="word_by_word" ${layer.animation === "word_by_word" ? "selected" : ""}>Palavra por palavra</option></select></label><label>Fonte<select data-layer-field="font"><option value="sans" ${layer.font === "sans" ? "selected" : ""}>Moderna</option><option value="serif" ${layer.font === "serif" ? "selected" : ""}>Elegante</option><option value="mono" ${layer.font === "mono" ? "selected" : ""}>Técnica</option></select></label><label>Alinhamento<select data-layer-field="align"><option value="left" ${layer.align === "left" ? "selected" : ""}>Esquerda</option><option value="center" ${layer.align === "center" ? "selected" : ""}>Centro</option><option value="right" ${layer.align === "right" ? "selected" : ""}>Direita</option></select></label><label>Tamanho (${Math.round(Number(layer.sizeScale || 1) * 100)}%)<input data-layer-field="sizeScale" type="range" min="70" max="180" step="5" value="${Math.round(Number(layer.sizeScale || 1) * 100)}"></label><label>Margem<input data-layer-field="margin" type="number" min="24" max="180" step="4" value="${Number(layer.margin || 64)}"></label><label>Cor<input data-layer-field="color" type="color" value="${escapeHtml(layer.color || "#FFFFFF")}"></label><label>Contorno<input data-layer-field="outlineColor" type="color" value="${escapeHtml(layer.outlineColor || "#092B45")}"></label><label class="visual-layer-toggle"><input data-layer-field="background" type="checkbox" ${layer.background !== false ? "checked" : ""}><span>Fundo</span></label></div></article>`).join("") : '<p class="empty-copy">Nenhuma camada adicional. Você pode incluir descrições, ofertas ou observações.</p>';
}

function primaryVisualLayer() {
  return (state.visualPlan?.textLayers || []).find((layer) => layer.type === "title") || state.visualPlan?.textDesign || {};
}

function renderVisualPrimaryTextStyle() {
  const design = primaryVisualLayer();
  $("visualTextFont").value = design.font || "sans";
  $("visualTextSize").value = Math.round(Number(design.sizeScale || 1.2) * 100);
  $("visualTextColor").value = design.color || "#FFFFFF";
  $("visualTextOutline").value = design.outlineColor || "#092B45";
  $("visualTextAlign").value = design.align || "center";
  $("visualTextBackground").checked = design.background !== false;
  $("visualTextSizeValue").textContent = `${$("visualTextSize").value}%`;
}

function syncVisualPrimaryTextStyle() {
  if (!state.visualPlan) return;
  const size = Number($("visualTextSize").value) / 100;
  const design = { font: $("visualTextFont").value, sizeScale: size, color: $("visualTextColor").value, outlineColor: $("visualTextOutline").value, align: $("visualTextAlign").value, background: $("visualTextBackground").checked };
  state.visualPlan.textDesign = { ...(state.visualPlan.textDesign || {}), ...design };
  const scaleByType = { title: 1, subtitle: 0.72, call_to_action: 0.84 };
  (state.visualPlan.textLayers || []).forEach((layer) => {
    if (!Object.hasOwn(scaleByType, layer.type)) return;
    Object.assign(layer, design, { sizeScale: Number((size * scaleByType[layer.type]).toFixed(3)) });
  });
  $("visualTextSizeValue").textContent = `${$("visualTextSize").value}%`;
}

function visualSourceAnalysis(sourceId) {
  return (state.visualPlan?.analysis?.sources || []).find((source) => source.sourceId === sourceId) || {};
}

function visualSourceDuration(scene) {
  const analysis = visualSourceAnalysis(scene.sourceId);
  return Math.max(0.5, Number(analysis.duration || analysis.waveform?.duration || (Number(scene.start || 0) + Number(scene.duration || 0))));
}

function visualTrimMarkup(scene, index, image) {
  if (image) return "";
  const sourceDuration = visualSourceDuration(scene);
  const start = Math.max(0, Math.min(Number(scene.start || 0), sourceDuration - 0.5));
  const end = Math.max(start + 0.5, Math.min(sourceDuration, start + Number(scene.duration || 0)));
  const left = start / sourceDuration * 100;
  const right = end / sourceDuration * 100;
  return `<div class="visual-trim-control"><div class="visual-trim-label"><span>Recorte do arquivo</span><output data-scene-trim-label="${index}">${start.toFixed(1)}s – ${end.toFixed(1)}s</output></div><div class="visual-trim-ranges" style="--trim-left:${left.toFixed(3)}%;--trim-right:${right.toFixed(3)}%"><span></span><input data-scene-trim-start="${index}" type="range" min="0" max="${sourceDuration.toFixed(3)}" step="0.1" value="${start.toFixed(3)}" aria-label="Início do recorte"><input data-scene-trim-end="${index}" type="range" min="0" max="${sourceDuration.toFixed(3)}" step="0.1" value="${end.toFixed(3)}" aria-label="Fim do recorte"></div></div>`;
}

function renderVisualAudioMixer() {
  const audio = state.visualPlan?.audio || {};
  const libraryTrack = state.visualPlan?.music?.libraryTrack || "none";
  const transitionSound = state.visualPlan?.soundEffects?.preset || "none";
  $("visualLibraryMusic").value = STUDIO_LIBRARY_MUSIC[libraryTrack] ? libraryTrack : "none";
  $("visualTransitionSound").value = STUDIO_TRANSITION_SOUNDS[transitionSound] ? transitionSound : "none";
  $("visualLibraryMusic").disabled = Boolean(state.visualProject?.music);
  $("visualLibraryMusic").title = state.visualProject?.music ? "A música enviada tem prioridade neste projeto." : "Trilha original gerada localmente.";
  $("visualVoiceVolume").value = Math.round(Number(audio.voiceVolume ?? 1) * 100);
  $("visualMusicVolume").value = Math.round(Number(audio.musicVolume ?? 0.18) * 100);
  $("visualMusicFade").value = Number(audio.fadeSeconds ?? 1.2);
  $("visualNoiseReduction").checked = audio.noiseReduction === true;
  $("visualMusicDucking").checked = state.visualPlan?.music?.duckDuringSpeech !== false;
  $("visualVoiceVolumeValue").textContent = `${$("visualVoiceVolume").value}%`;
  $("visualMusicVolumeValue").textContent = `${$("visualMusicVolume").value}%`;
  $("visualMusicFadeValue").textContent = `${Number($("visualMusicFade").value).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}s`;
  const narration = state.visualPlan?.narration || {};
  $("visualNarrationEnabled").checked = narration.enabled === true;
  $("visualNarrationVoice").value = ["marin", "cedar"].includes(narration.voice) ? narration.voice : "marin";
  $("visualNarrationTone").value = ["professional", "warm", "energetic", "calm"].includes(narration.tone) ? narration.tone : "professional";
  $("visualNarrationScript").value = narration.script || "";
  updateVisualNarrationStatus();
}

function updateVisualNarrationStatus() {
  const enabled = $("visualNarrationEnabled").checked;
  const script = $("visualNarrationScript").value.trim();
  $("visualNarrationVoice").disabled = !enabled;
  $("visualNarrationTone").disabled = !enabled;
  $("visualNarrationScript").disabled = !enabled;
  $("visualNarrationStatus").textContent = !enabled ? "Desativada" : script ? "Pronta para gerar" : "Roteiro necessário";
  $("visualNarrationStatus").classList.toggle("is-warning", enabled && !script);
  $("visualNarrationHelp").textContent = enabled && !script ? "Preencha o roteiro para evitar um vídeo sem voz." : "A voz e as legendas serão sincronizadas e distribuídas ao longo do vídeo.";
}

function syncVisualAudioMixer() {
  if (!state.visualPlan) return;
  const libraryTrack = STUDIO_LIBRARY_MUSIC[$("visualLibraryMusic").value] ? $("visualLibraryMusic").value : "none";
  const transitionSound = STUDIO_TRANSITION_SOUNDS[$("visualTransitionSound").value] ? $("visualTransitionSound").value : "none";
  state.visualPlan.audio = {
    ...(state.visualPlan.audio || {}),
    voiceVolume: Number($("visualVoiceVolume").value) / 100,
    musicVolume: Number($("visualMusicVolume").value) / 100,
    fadeSeconds: Number($("visualMusicFade").value),
    noiseReduction: $("visualNoiseReduction").checked
  };
  state.visualPlan.music = { ...(state.visualPlan.music || {}), enabled: Boolean(state.visualProject?.music) || libraryTrack !== "none", source: state.visualProject?.music ? "upload" : libraryTrack !== "none" ? "original-library" : "none", libraryTrack, duckDuringSpeech: $("visualMusicDucking").checked };
  state.visualPlan.soundEffects = { preset: transitionSound, source: transitionSound !== "none" ? "original-library" : "none" };
  state.visualPlan.narration = {
    ...(state.visualPlan.narration || {}),
    enabled: $("visualNarrationEnabled").checked,
    script: $("visualNarrationScript").value.trim(),
    voice: $("visualNarrationVoice").value,
    tone: $("visualNarrationTone").value,
    reviewed: true,
    rendered: false
  };
  $("visualVoiceVolumeValue").textContent = `${$("visualVoiceVolume").value}%`;
  $("visualMusicVolumeValue").textContent = `${$("visualMusicVolume").value}%`;
  $("visualMusicFadeValue").textContent = `${Number($("visualMusicFade").value).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}s`;
  updateVisualNarrationStatus();
}

function renderVisualExportSettings() {
  const settings = state.visualPlan?.export || {};
  $("visualExportFps").value = String(settings.fps || 30);
  $("visualExportQuality").value = STUDIO_EXPORT_QUALITIES[settings.quality] ? settings.quality : "balanced";
}

function syncVisualExportSettings() {
  if (!state.visualPlan) return;
  const quality = STUDIO_EXPORT_QUALITIES[$("visualExportQuality").value] || STUDIO_EXPORT_QUALITIES.balanced;
  state.visualPlan.export = { fps: Number($("visualExportFps").value), quality: quality.id, codec: "h264", audioCodec: "aac", videoBitrateKbps: quality.videoBitrateKbps, audioBitrateKbps: quality.audioBitrateKbps };
}

function renderVisualTimeline() {
  const plan = state.visualPlan;
  if (!plan) return;
  plan.duration = visualPlanDuration();
  $("visualTotalDuration").textContent = `${plan.duration.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}s`;
  renderVisualWaveform();
  const sourceById = new Map((state.visualProject?.sources || []).map((source) => [source.id, source]));
  $("visualTimeline").innerHTML = plan.scenes.map((scene, index) => {
    const source = sourceById.get(scene.sourceId) || {};
    const url = state.visualSourceUrls.get(scene.sourceId) || "";
    const image = String(source.contentType || visualSourceAnalysis(scene.sourceId).contentType || "").startsWith("image/");
    const media = !url
      ? `<div class="visual-scene-media visual-scene-placeholder"><i class="fa-solid fa-photo-film"></i><span>Carregando mídia…</span></div>`
      : image
        ? `<img class="visual-scene-media" src="${escapeHtml(url)}" alt="Cena ${index + 1}">`
        : `<video class="visual-scene-media" src="${escapeHtml(url)}#t=${Math.max(0, Number(scene.start || 0)).toFixed(2)}" muted preload="metadata"></video>`;
    const transitionDuration = index ? clampVisualTransitionDuration(index, scene.transitionDuration) : 0;
    scene.transitionDuration = transitionDuration;
    const transitionDurationField = index ? `<label>Duração da transição<input data-scene-transition-duration="${index}" type="number" min="0.1" max="${visualTransitionDurationLimit(index).toFixed(2)}" step="0.05" value="${transitionDuration.toFixed(2)}" ${scene.transition === "hardcut" ? "disabled" : ""}></label>` : "";
    return `<article class="visual-scene" data-visual-scene="${index}"><span class="visual-scene-index">${index + 1}</span>${media}<div class="visual-scene-info"><strong>${escapeHtml(source.name || `Arquivo ${Number(scene.sourceIndex || 0) + 1}`)}</strong><label>Duração da cena<input data-scene-duration="${index}" type="number" min="0.5" max="${Math.min(15, visualSourceDuration(scene)).toFixed(1)}" step="0.1" value="${Number(scene.duration || 0).toFixed(1)}"></label><label>Transição<select data-scene-transition="${index}" ${index === 0 ? "disabled" : ""}>${transitionOptions(scene.transition, index === 0)}</select></label>${transitionDurationField}${visualTrimMarkup(scene, index, image)}</div><div class="visual-scene-actions"><button type="button" data-scene-up="${index}" ${index === 0 ? "disabled" : ""} title="Mover antes"><i class="fa-solid fa-arrow-up"></i></button><button type="button" data-scene-down="${index}" ${index === plan.scenes.length - 1 ? "disabled" : ""} title="Mover depois"><i class="fa-solid fa-arrow-down"></i></button></div></article>`;
  }).join("");
}

function renderVisualVersions() {
  const versions = Object.values(state.visualProject?.versions || {}).sort((a, b) => Number(b.number || 0) - Number(a.number || 0));
  $("visualVersionHistory").innerHTML = versions.length ? versions.map((version) => {
    const summary = version.summary || {};
    const exportSettings = summary.export || {};
    const details = [
      summary.duration ? `${Number(summary.duration).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}s` : "",
      summary.sceneCount ? `${Number(summary.sceneCount)} cenas` : "",
      exportSettings.fps ? `${Number(exportSettings.fps)} FPS` : "",
      exportSettings.quality ? (STUDIO_EXPORT_QUALITIES[exportSettings.quality]?.label || exportSettings.quality) : ""
    ].filter(Boolean).join(" • ");
    const selected = state.selectedVisualVersionId === version.id;
    return `<article class="visual-version${selected ? " is-selected" : ""}"><div class="visual-version-copy"><span><strong>Versão ${Number(version.number || 1)}</strong><small>${escapeHtml(version.source === "visual-editor" ? "Editor visual" : "Montagem automática")} • ${formatDate(version.completedAt)}</small></span>${details ? `<em>${escapeHtml(details)}</em>` : ""}</div><div class="visual-version-actions"><button type="button" data-version-open="${escapeHtml(version.id)}" title="Reproduzir esta versão" aria-label="Reproduzir versão ${Number(version.number || 1)}"><i class="fa-solid fa-play"></i></button><button type="button" data-version-download="${escapeHtml(version.id)}" title="Baixar esta versão" aria-label="Baixar versão ${Number(version.number || 1)}"><i class="fa-solid fa-download"></i></button><button type="button" data-version-restore="${escapeHtml(version.id)}" title="Carregar plano desta versão no editor" aria-label="Editar a partir da versão ${Number(version.number || 1)}" ${version.planStoragePath ? "" : "disabled"}><i class="fa-solid fa-clock-rotate-left"></i></button></div></article>`;
  }).join("") : '<p class="empty-copy">A primeira versão aparecerá aqui após a próxima exportação.</p>';
}

async function setVisualPreview(output) {
  if (!output) { $("visualPreviewPlayer").removeAttribute("src"); return; }
  if (state.outputPreviewUrl) URL.revokeObjectURL(state.outputPreviewUrl);
  const url = await privateOutputUrl(output);
  state.outputPreviewUrl = url.startsWith("blob:") ? url : "";
  $("visualPreviewPlayer").src = url;
}

async function openVisualEditor(projectId, preferredOutput = null) {
  const cachedProject = state.projects.find((item) => item.id === projectId);
  const snapshot = cachedProject?.editorPlan ? null : await get(ref(db, `studioProjects/${state.user.uid}/${projectId}`));
  const project = { id: projectId, ...(snapshot?.val() || cachedProject || {}) };
  if (!project.sources?.length) throw new Error("Este projeto não possui arquivos de origem.");
  let planPath = "";
  let inlinePlan = project.editorPlan || null;
  if (project.jobId && !inlinePlan) {
    const job = (await get(ref(db, `studioJobs/${state.user.uid}/${project.jobId}`))).val();
    planPath = job?.plan?.storagePath || "";
    inlinePlan = job?.editorPlan || inlinePlan;
  }
  const latestVersion = Object.values(project.versions || {}).sort((a, b) => Number(b.number || 0) - Number(a.number || 0))[0] || null;
  if (!planPath) planPath = latestVersion?.planStoragePath || "";
  inlinePlan = inlinePlan || latestVersion?.editorPlan || null;
  state.visualProject = project;
  toast("Abrindo o editor e carregando o plano…");
  state.visualPlan = normalizeVisualPlan(inlinePlan || await readPrivateJson(planPath));
  if (!state.visualPlan.scenes.length) throw new Error("Este projeto não possui cenas editáveis.");
  state.selectedVisualVersionId = Object.values(project.versions || {}).sort((a, b) => Number(b.number || 0) - Number(a.number || 0))[0]?.id || "";
  state.activeProjectId = projectId;
  state.visualSourceUrls = new Map();
  $("visualProjectName").textContent = project.name || "Ajuste sua montagem";
  $("visualDirectorMode").value = ["semantic", "advanced"].includes(project.director?.mode) ? project.director.mode : "local";
  $("visualDirectorBrief").value = project.director?.brief || "";
  $("visualEffectsProfile").value = STUDIO_VISUAL_EFFECTS[state.visualPlan.effectsProfile || project.effectsProfile] ? (state.visualPlan.effectsProfile || project.effectsProfile) : "professional";
  const visualAdvancedOption = [...$("visualDirectorMode").options].find((option) => option.value === "advanced");
  if (visualAdvancedOption) visualAdvancedOption.hidden = state.featureFlags.advancedDirectorEnabled !== true;
  if ($("visualDirectorMode").value === "advanced" && state.featureFlags.advancedDirectorEnabled !== true) $("visualDirectorMode").value = "local";
  updateDirectorModeDescription("visualDirectorMode", "visualDirectorModeDescription");
  $("visualTitle").value = state.visualPlan.text?.title || "";
  $("visualSubtitle").value = state.visualPlan.text?.subtitle || "";
  $("visualCta").value = state.visualPlan.text?.callToAction || "";
  renderVisualPrimaryTextStyle();
  renderVisualAudioMixer();
  renderVisualExportSettings();
  renderVisualTimeline();
  renderVisualTextLayers();
  renderVisualVersions();
  switchView("visual");
  $("visualPreviewNotice").textContent = "Editor aberto. As mídias e a última prévia estão sendo carregadas em segundo plano.";
  const mediaResults = await Promise.allSettled(project.sources.map(async (source) => {
    const url = source.downloadUrl || await withStudioTimeout(getDownloadURL(storageRef(storage, source.storagePath)), `A mídia ${source.name || "do projeto"} demorou para carregar.`);
    state.visualSourceUrls.set(source.id, url);
  }));
  renderVisualTimeline();
  const unavailable = mediaResults.filter((result) => result.status === "rejected").length;
  if (unavailable) toast(`Editor aberto. ${unavailable} mídia(s) não carregaram agora, mas os ajustes continuam disponíveis.`);
  try {
    await withStudioTimeout(setVisualPreview(preferredOutput || project.output || project.preview), "A prévia demorou para carregar.");
    $("visualPreviewNotice").textContent = preferredOutput || project.preview ? "Prévia reduzida atualizada com o plano editado." : "Exibindo a última exportação Full HD. Gere uma prévia leve para conferir novos ajustes.";
  } catch (error) {
    $("visualPreviewNotice").textContent = "O editor está disponível, mas a última prévia não pôde ser carregada agora.";
    toast(error.message);
  }
}

async function openVisualVersion(versionId) {
  const version = state.visualProject?.versions?.[versionId];
  if (!version?.output) return toast("Arquivo desta versão não encontrado.");
  await setVisualPreview(version.output);
  state.selectedVisualVersionId = versionId;
  renderVisualVersions();
  $("visualPreviewNotice").textContent = `Reproduzindo a versão ${Number(version.number || 1)} preservada no histórico.`;
}

async function downloadVisualVersion(versionId) {
  const version = state.visualProject?.versions?.[versionId];
  if (!version?.output) throw new Error("Arquivo desta versão não encontrado.");
  const url = await privateOutputUrl(version.output);
  const link = document.createElement("a");
  link.href = url;
  link.download = cleanFileName(version.output.fileName || `${state.visualProject.name || "ola-studio"}-v${Number(version.number || 1)}.mp4`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  if (url.startsWith("blob:")) setTimeout(() => URL.revokeObjectURL(url), 60000);
}

async function restoreVisualVersion(versionId) {
  const version = state.visualProject?.versions?.[versionId];
  if (!version?.planStoragePath && !version?.editorPlan) throw new Error("O plano desta versão não está disponível.");
  if (!window.confirm(`Carregar o plano da versão ${Number(version.number || 1)}? Ajustes ainda não renderizados no editor serão substituídos, mas nenhum vídeo será apagado.`)) return;
  const plan = normalizeVisualPlan(version.editorPlan || await readPrivateJson(version.planStoragePath));
  const sourceIds = new Set((state.visualProject.sources || []).map((source) => source.id));
  if (!Array.isArray(plan?.scenes) || !plan.scenes.length || plan.scenes.some((scene) => !sourceIds.has(scene.sourceId))) throw new Error("O plano desta versão não corresponde mais aos arquivos do projeto.");
  state.visualPlan = plan;
  state.selectedVisualVersionId = versionId;
  $("visualTitle").value = plan.text?.title || "";
  $("visualSubtitle").value = plan.text?.subtitle || "";
  $("visualCta").value = plan.text?.callToAction || "";
  $("visualEffectsProfile").value = STUDIO_VISUAL_EFFECTS[plan.effectsProfile] ? plan.effectsProfile : "professional";
  renderVisualPrimaryTextStyle();
  renderVisualAudioMixer();
  renderVisualExportSettings();
  renderVisualTimeline();
  renderVisualTextLayers();
  renderVisualVersions();
  if (version.output) await setVisualPreview(version.output);
  $("visualPreviewNotice").textContent = `Plano da versão ${Number(version.number || 1)} carregado para edição. Renderize para criar uma nova versão sem alterar as anteriores.`;
  toast(`Versão ${Number(version.number || 1)} carregada no editor.`);
}

async function enqueueVisualRender(mode) {
  if (!state.visualPlan || !state.visualProject) return;
  syncVisualTexts();
  syncVisualAudioMixer();
  syncVisualDirectionEffects();
  if (state.visualPlan.narration?.enabled && !state.visualPlan.narration?.script) return toast("Preencha o roteiro da narração antes de gerar o vídeo.");
  state.visualPlan.duration = visualPlanDuration();
  if (!(state.visualPlan.duration > 0 && state.visualPlan.duration <= 90)) return toast("A timeline deve ter no máximo 90 segundos.");
  const jobRef = push(ref(db, `studioJobs/${state.user.uid}`));
  const jobId = jobRef.key;
  const now = Date.now();
  const versionNumber = Number(state.visualProject.versionCounter || 0) + 1;
  const versionId = mode === "preview" ? "" : `version-${versionNumber}-${now}`;
  const cost = studioJobCostEstimate({ ...state.visualProject, duration: Math.min(90, Math.max(15, state.visualPlan.duration)) });
  const job = { schemaVersion: 2, id: jobId, projectId: state.visualProject.id, ownerUid: state.user.uid, mode, planOverride: JSON.parse(JSON.stringify(state.visualPlan)), versionId, versionNumber, status: "queued", stage: "queue", progress: 25, attempt: 0, createdAt: now, updatedAt: now, costEstimate: cost };
  await update(ref(db), {
    [`studioJobs/${state.user.uid}/${jobId}`]: job,
    [`studioProjects/${state.user.uid}/${state.visualProject.id}/jobId`]: jobId,
    [`studioProjects/${state.user.uid}/${state.visualProject.id}/status`]: "queued",
    [`studioProjects/${state.user.uid}/${state.visualProject.id}/duration`]: state.visualPlan.duration,
    [`studioProjects/${state.user.uid}/${state.visualProject.id}/title`]: state.visualPlan.text?.title || "",
    [`studioProjects/${state.user.uid}/${state.visualProject.id}/subtitle`]: state.visualPlan.text?.subtitle || "",
    [`studioProjects/${state.user.uid}/${state.visualProject.id}/callToAction`]: state.visualPlan.text?.callToAction || "",
    [`studioProjects/${state.user.uid}/${state.visualProject.id}/updatedAt`]: now,
    [`studioUsage/${state.user.uid}/estimates/${jobId}`]: { projectId: state.visualProject.id, ...cost, status: "reserved", mode, createdAt: now }
  });
  state.activeProjectId = state.visualProject.id;
  state.activeJobId = jobId;
  resetProcessingLog(mode === "preview" ? "Prévia rápida enviada para a fila." : "Nova versão enviada para a fila de renderização.");
  switchView("processing");
  $("processingStatusCard").classList.remove("hidden");
  $("resultCard").classList.add("hidden");
  $("errorCard").classList.add("hidden");
  $("cancelProcessingButton").classList.remove("hidden");
  $("cancelProcessingButton").disabled = false;
  $("processingEyebrow").textContent = mode === "preview" ? "Prévia rápida" : `Versão ${versionNumber}`;
  $("processingTitle").textContent = mode === "preview" ? "Gerando prévia reduzida" : "Renderizando nova versão";
  markProcessStep("queue");
  updateProgress(25, "Aguardando worker", "O mesmo plano da timeline será processado pelo FFmpeg.");
  watchJob(jobId, state.visualProject.id);
}

async function loadProjects() {
  if (!state.user) return;
  const snapshot = await get(query(ref(db, `studioProjects/${state.user.uid}`), limitToLast(30)));
  const value = snapshot.val() || {};
  state.projects = Object.entries(value).map(([id, project]) => ({ id, ...project })).sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0));
  renderProjects();
  const deletion = state.projects.find((project) => ["deletion_queued", "deleting"].includes(project.status) && project.jobId);
  if (deletion) watchDeletionJob(deletion.jobId, deletion.id);
}

function renderProjects() {
  const root = $("projectsGrid");
  if (!state.projects.length) { root.innerHTML = '<div class="empty-state"><i class="fa-solid fa-film"></i><h3>Nenhum projeto ainda</h3><p>Seu primeiro vídeo aparecerá aqui.</p></div>'; return; }
  root.innerHTML = state.projects.map((project) => {
    const completed = project.status === "completed";
    const failed = project.status === "failed";
    const cancelled = project.status === "cancelled";
    const deletionActive = ["deletion_queued", "deleting"].includes(project.status);
    const active = deletionActive || ["uploading", "queued", "analyzing", "rendering", "awaiting_review", "cancel_requested"].includes(project.status);
    const review = project.status === "awaiting_review" && project.jobId ? `<button type="button" data-project-review="${project.id}"><i class="fa-solid fa-closed-captioning"></i> Revisar legendas</button>` : "";
    const progress = active && !deletionActive && project.jobId ? `<button type="button" data-project-progress="${project.id}"><i class="fa-solid fa-chart-line"></i> Acompanhar</button>` : "";
    const open = completed && (project.output?.storagePath || project.output?.downloadUrl) ? `<button type="button" data-project-open="${project.id}"><i class="fa-solid fa-circle-play"></i> Abrir</button>` : "";
    const download = completed && (project.output?.storagePath || project.output?.downloadUrl) ? `<button type="button" data-project-download="${project.id}"><i class="fa-solid fa-download"></i> Baixar</button>` : "";
    const edit = completed && project.jobId ? `<button type="button" data-project-edit="${project.id}"><i class="fa-solid fa-sliders"></i> Editar</button>` : "";
    const cancel = active && !deletionActive ? `<button type="button" data-project-cancel="${project.id}"><i class="fa-solid fa-ban"></i> Cancelar</button>` : "";
    const hasSources = Array.isArray(project.sources) && project.sources.length > 0;
    const regenerate = active || !hasSources ? "" : `<button type="button" data-project-regenerate="${project.id}"><i class="fa-solid fa-rotate"></i> Nova versão</button>`;
    const remove = active ? "" : `<button type="button" class="danger" data-project-delete="${project.id}"><i class="fa-solid fa-trash-can"></i> Excluir</button>`;
    const director = cancelled && !hasSources
      ? `<span><i class="fa-solid fa-circle-info"></i> Cancelado antes da IA e da voz</span>`
      : ["semantic", "advanced"].includes(project.director?.mode) ? `<span><i class="fa-solid fa-wand-magic-sparkles"></i> ${project.directorResult?.applied ? (project.directorResult?.advanced ? "Direção avançada" : "Direção por IA") : "IA solicitada"}</span>` : "";
    return `<article class="project-card"><div class="project-cover"><span class="project-status ${completed ? "completed" : failed ? "failed" : cancelled ? "cancelled" : project.status === "awaiting_review" ? "review" : ["deletion_queued", "deleting"].includes(project.status) ? "deleting" : ""}">${escapeHtml(statusLabels[project.status] || project.status || "Projeto")}</span><i class="fa-solid ${project.format === "9:16" ? "fa-mobile-screen" : project.format === "1:1" ? "fa-square" : "fa-display"}"></i></div><div class="project-body"><h3>${escapeHtml(project.name || "Projeto sem nome")}</h3><p>${escapeHtml(STUDIO_EDIT_STYLES[project.style]?.label || project.style)} • ${escapeHtml(project.format)} • ${Number(project.duration || 0)}s</p><div class="project-meta"><span><i class="fa-regular fa-calendar"></i> ${formatDate(project.updatedAt)}</span><span><i class="fa-regular fa-images"></i> ${project.sources?.length || 0} arquivos</span>${director}</div><div class="project-actions">${review}${progress}${open}${edit}${download}${cancel}${regenerate}${remove}</div></div></article>`;
  }).join("");
}

async function loadUsage() {
  if (!state.user) return;
  const [creditsSnap, usageSnap, ledgerSnap] = await Promise.all([get(ref(db, `studioCredits/${state.user.uid}`)), get(ref(db, `studioUsage/${state.user.uid}`)), get(query(ref(db, `studioCreditLedger/${state.user.uid}`), limitToLast(30))), loadProcessingCosts()]);
  const credits = creditsSnap.val() || {};
  const usage = usageSnap.val() || {};
  const ledger = ledgerSnap.val() || {};
  const completed = state.projects.filter((item) => item.status === "completed");
  $("creditBalance").textContent = Number(credits.balance || 0).toLocaleString("pt-BR");
  $("processedCount").textContent = completed.length;
  $("processedMinutes").textContent = `${(completed.reduce((sum, item) => sum + Number(item.duration || 0), 0) / 60).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} min renderizados`;
  const units = Object.values(usage.estimates || {}).reduce((sum, item) => sum + Number(item.processingUnits || 0), 0);
  $("processingUnits").textContent = units.toLocaleString("pt-BR");
  const entries = Object.entries(ledger).map(([id, item]) => ({ id, ...item })).sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
  const costs = new Map(state.processingCosts.map((item) => [item.jobId, item]));
  const projects = new Map(state.projects.map((item) => [item.id, item]));
  $("usageHistory").innerHTML = entries.length ? entries.map((item) => {
    const cost = costs.get(item.jobId) || {};
    const project = projects.get(item.projectId) || {};
    const aiUsed = cost.aiProvider && cost.aiProvider !== "none";
    const creditsUsed = Number(item.estimatedCredits ?? cost.estimatedCredits ?? 0);
    const tokens = Number(cost.aiUsage?.total_tokens || 0);
    const narration = cost.narrationUsed === true ? ` • Narração ${escapeHtml(cost.narrationVoice || "IA")} (${formatUsd(cost.narrationEstimatedCostUsd)})` : "";
    return `<div class="usage-entry usage-entry-detailed"><span><strong>${escapeHtml(project.name || item.description || item.type || "Processamento")}</strong><small>${formatDate(item.createdAt)} • ${escapeHtml(formatDuration(cost.elapsedSeconds || 0))}</small><em>${aiUsed ? `${cost.aiMode === "advanced" ? "IA avançada" : "IA"} ${escapeHtml(cost.aiModel || cost.aiProvider)} • ${tokens.toLocaleString("pt-BR")} tokens • ${formatUsd(cost.aiEstimatedCostUsd)}${narration}` : "IA não utilizada"}</em></span><b>${creditsUsed} ${creditsUsed === 1 ? "crédito" : "créditos"}<small>${Number(item.amount || 0) ? `${Number(item.amount)} debitado(s)` : "0 debitado • MVP"}</small></b></div>`;
  }).join("") : '<p class="empty-copy">Nenhum consumo registrado.</p>';
}

async function authorize(user) {
  state.user = user;
  const profileSnap = await get(ref(db, `usuariosByUid/${user.uid}`));
  state.profile = profileSnap.val();
  if (!state.profile || state.profile.status === "inativo" || state.profile.role !== "master") {
    $("unavailableMessage").textContent = "Nesta primeira etapa, somente o Admin Master pode acessar o Olá Studio.";
    showGate("studioUnavailable");
    return;
  }
  const flagSnap = await get(ref(db, "studioFeatureFlags"));
  const featureFlags = flagSnap.val() || {};
  state.featureFlags = featureFlags;
  const previewAuthorized = new URLSearchParams(location.search).get("preview") === "1";
  if (featureFlags.enabled !== true && !previewAuthorized) {
    $("unavailableMessage").textContent = "A feature flag do Olá Studio está desativada. Abra o acesso protegido pelo Painel Admin para testar o MVP.";
    showGate("studioUnavailable");
    return;
  }
  const advancedOption = [...$("directorMode").options].find((option) => option.value === "advanced");
  if (advancedOption) advancedOption.hidden = featureFlags.advancedDirectorEnabled !== true;
  if (featureFlags.advancedDirectorEnabled !== true && $("directorMode").value === "advanced") $("directorMode").value = "local";
  $("userName").textContent = state.profile.nome || "Admin Master";
  $("userEmail").textContent = user.email || state.profile.email || "";
  $("userInitial").textContent = String(state.profile.nome || user.email || "A").trim().charAt(0).toUpperCase();
  showGate("studioApp");
  resetEditor();
  await loadProcessingCosts();
  await loadProjects();
  hadAuthenticatedSession = true;
  if (authPersistenceWarning) toast(authPersistenceWarning);
  const resumed = await resumeLatestProcessing();
  if (!resumed) switchView(location.hash === "#editor" ? "editor" : location.hash === "#usage" ? "usage" : location.hash === "#logs" ? "logs" : "projects");
}

$("loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  $("loginButton").disabled = true;
  $("loginMessage").textContent = "";
  try { await authPersistenceReady; await signInWithEmailAndPassword(auth, $("loginEmail").value.trim(), $("loginPassword").value); }
  catch (error) { $("loginMessage").textContent = error.code === "auth/invalid-credential" ? "E-mail ou senha inválidos." : "Não foi possível entrar. Tente novamente."; }
  finally { $("loginButton").disabled = false; }
});

function handleAuthState(user) {
  if (user) {
    logoutRequested = false;
    authorize(user).catch((error) => { console.error(error); $("unavailableMessage").textContent = "Não foi possível validar o acesso ao Studio."; showGate("studioUnavailable"); });
    return;
  }
  state.jobUnsubscribe?.();
  state.jobUnsubscribe = null;
  stopProcessingClock();
  state.user = null;
  state.profile = null;
  if (hadAuthenticatedSession) $("loginMessage").textContent = logoutRequested ? "Você saiu do Studio. Seus projetos e processamentos continuam salvos." : "Sua sessão terminou. Entre novamente para retomar automaticamente o processamento.";
  showGate("studioLogin");
}

authPersistenceReady.finally(() => onAuthStateChanged(auth, handleAuthState));

initializeEditorHelp();
document.querySelectorAll("[data-studio-view]").forEach((button) => button.addEventListener("click", () => switchView(button.dataset.studioView)));
document.querySelectorAll("[data-new-project]").forEach((button) => button.addEventListener("click", openNewProject));
$("logoutButton").addEventListener("click", () => { logoutRequested = true; signOut(auth); });
$("mobileMenuButton").addEventListener("click", () => document.querySelector(".studio-shell").classList.toggle("menu-open"));
$("refreshProjects").addEventListener("click", () => loadProjects().then(() => toast("Projetos atualizados.")));
$("refreshLogs").addEventListener("click", () => loadLogs().then(() => toast("Logs atualizados.")));
$("logsFilter").addEventListener("change", renderStudioLogs);
$("fieldHelpClose").addEventListener("click", closeFieldHelp);
$("fieldHelpOk").addEventListener("click", closeFieldHelp);
$("fieldHelpDialog").addEventListener("click", (event) => { if (event.target === $("fieldHelpDialog")) closeFieldHelp(); });
document.querySelectorAll("[data-director-guide]").forEach((button) => button.addEventListener("click", openDirectorGuide));
$("directorGuideClose").addEventListener("click", closeDirectorGuide);
$("directorGuideDone").addEventListener("click", closeDirectorGuide);
$("copyDirectorGuidePrompt").addEventListener("click", () => copyDirectorGuidePrompt().catch((error) => toast(error?.message || "Não foi possível copiar o exemplo.")));
$("directorGuideDialog").addEventListener("click", (event) => { if (event.target === $("directorGuideDialog")) closeDirectorGuide(); });
$("dropZone").addEventListener("click", () => $("sourceFiles").click());
$("dropZone").addEventListener("keydown", (event) => { if (["Enter", " "].includes(event.key)) { event.preventDefault(); $("sourceFiles").click(); } });
$("sourceFiles").addEventListener("change", (event) => { addFiles(event.target.files); event.target.value = ""; });
$("pickVideos").addEventListener("click", (event) => { event.stopPropagation(); $("sourceVideos").click(); });
$("pickImages").addEventListener("click", (event) => { event.stopPropagation(); $("sourceImages").click(); });
$("sourceVideos").addEventListener("change", (event) => { addFiles(event.target.files); event.target.value = ""; });
$("sourceImages").addEventListener("change", (event) => { addFiles(event.target.files); event.target.value = ""; });
["dragenter", "dragover"].forEach((type) => $("dropZone").addEventListener(type, (event) => { event.preventDefault(); $("dropZone").classList.add("dragging"); }));
["dragleave", "drop"].forEach((type) => $("dropZone").addEventListener(type, (event) => { event.preventDefault(); $("dropZone").classList.remove("dragging"); }));
$("dropZone").addEventListener("drop", (event) => addFiles(event.dataTransfer.files));
$("mediaLibrary").addEventListener("click", (event) => { const up = event.target.closest("[data-media-up]"); const down = event.target.closest("[data-media-down]"); const remove = event.target.closest("[data-media-remove]"); if (up) moveMedia(up.dataset.mediaUp, -1); if (down) moveMedia(down.dataset.mediaDown, 1); if (remove) removeMedia(remove.dataset.mediaRemove); });
$("projectForm").addEventListener("change", updateSummary);
$("projectForm").addEventListener("input", updateSummary);
$("textPreset").addEventListener("change", applyTextPreset);
$("directorMode").addEventListener("change", syncAiNarrationControls);
$("generateAiScript").addEventListener("change", syncAiNarrationControls);
$("enableAiNarration").addEventListener("change", syncAiNarrationControls);
$("textSizeScale").addEventListener("input", updateTextSizeLabel);
[$("voiceVolume"), $("musicVolume"), $("captionSizeScale")].forEach((input) => input.addEventListener("input", updateAudioCaptionLabels));
$("projectForm").addEventListener("submit", submitProject);
$("logoFile").addEventListener("change", () => { const file = $("logoFile").files[0]; if (file && file.size > 8 * 1024 * 1024) { $("logoFile").value = ""; return toast("A logo deve ter no máximo 8 MB."); } $("logoFileLabel").innerHTML = `<i class="fa-regular fa-image"></i> ${escapeHtml(file?.name || "Escolher PNG ou WebP")}`; });
$("musicFile").addEventListener("change", () => { const file = $("musicFile").files[0]; if (file && file.size > STUDIO_LIMITS.maxAudioBytes) { $("musicFile").value = ""; return toast("A música deve ter no máximo 25 MB."); } $("musicFileLabel").innerHTML = `<i class="fa-solid fa-music"></i> ${escapeHtml(file?.name || "Escolher áudio")}`; });
$("projectsGrid").addEventListener("click", (event) => {
  const open = event.target.closest("[data-project-open]");
  const download = event.target.closest("[data-project-download]");
  const cancel = event.target.closest("[data-project-cancel]");
  const regenerate = event.target.closest("[data-project-regenerate]");
  const review = event.target.closest("[data-project-review]");
  const progress = event.target.closest("[data-project-progress]");
  const edit = event.target.closest("[data-project-edit]");
  const remove = event.target.closest("[data-project-delete]");
  if (open) showProjectVideo(open.dataset.projectOpen).catch((error) => toast(error.message));
  if (download) downloadProject(download.dataset.projectDownload).catch((error) => toast(error.message));
  if (cancel) cancelProject(cancel.dataset.projectCancel).catch((error) => toast(error.message));
  if (regenerate) openVisualEditor(regenerate.dataset.projectRegenerate).then(() => toast("Escolha novamente o diretor e os efeitos antes de gerar a nova versão.")).catch((error) => toast(error.message));
  if (review) openProjectProgress(review.dataset.projectReview).catch((error) => toast(error.message));
  if (progress) openProjectProgress(progress.dataset.projectProgress).catch((error) => toast(error.message));
  if (edit) openVisualEditor(edit.dataset.projectEdit).catch((error) => toast(error.message));
  if (remove) requestProjectDeletion(remove.dataset.projectDelete).catch((error) => toast(error.message));
});
$("cancelProcessingButton").addEventListener("click", () => cancelProject().catch((error) => toast(error.message)));
$("processingLogToggle").addEventListener("click", () => {
  const body = $("processingLogBody");
  const expanded = $("processingLogToggle").getAttribute("aria-expanded") === "true";
  $("processingLogToggle").setAttribute("aria-expanded", String(!expanded));
  body.classList.toggle("hidden", expanded);
});
$("cancelTranscriptReviewButton").addEventListener("click", () => cancelProject().catch((error) => toast(error.message)));
$("approveTranscriptButton").addEventListener("click", approveTranscriptReview);
$("transcriptReviewList").addEventListener("click", (event) => {
  const button = event.target.closest("[data-transcript-preview]");
  if (button) previewTranscriptSegment(Number(button.dataset.transcriptPreview));
});
$("transcriptReviewList").addEventListener("focusin", (event) => {
  const field = event.target.closest("[data-transcript-index]");
  if (field) previewTranscriptSegment(Number(field.dataset.transcriptIndex), { play: false });
});
$("transcriptPreviousButton").addEventListener("click", () => previewTranscriptSegment(Math.max(0, state.activeTranscriptIndex - 1)));
$("transcriptNextButton").addEventListener("click", () => previewTranscriptSegment(Math.min(state.transcriptSegments.length - 1, state.activeTranscriptIndex + 1)));
$("transcriptReviewPlayer").addEventListener("timeupdate", () => {
  const segment = state.transcriptSegments[state.activeTranscriptIndex];
  const player = $("transcriptReviewPlayer");
  if (segment && !player.paused && player.currentTime >= Number(segment.end || 0)) player.pause();
});
$("backToProjects").addEventListener("click", () => { $("previewPlayer").pause(); switchView("projects"); });
$("regenerateVideo").addEventListener("click", () => state.activeProjectId && openVisualEditor(state.activeProjectId).then(() => toast("Escolha novamente o diretor e os efeitos antes de gerar a nova versão.")).catch((error) => toast(error.message)));
$("visualBackProjects").addEventListener("click", () => { $("visualPreviewPlayer").pause(); switchView("projects"); });
[$("visualTitle"), $("visualSubtitle"), $("visualCta")].forEach((field) => field.addEventListener("input", syncVisualTexts));
$("visualEffectsProfile").addEventListener("change", syncVisualDirectionEffects);
$("visualDirectorMode").addEventListener("change", () => updateDirectorModeDescription("visualDirectorMode", "visualDirectorModeDescription"));
[$("visualTextFont"), $("visualTextSize"), $("visualTextColor"), $("visualTextOutline"), $("visualTextAlign"), $("visualTextBackground")].forEach((field) => field.addEventListener("input", syncVisualPrimaryTextStyle));
[$("visualVoiceVolume"), $("visualMusicVolume"), $("visualMusicFade"), $("visualNoiseReduction"), $("visualMusicDucking"), $("visualLibraryMusic"), $("visualTransitionSound"), $("visualNarrationEnabled"), $("visualNarrationVoice"), $("visualNarrationTone"), $("visualNarrationScript")].forEach((field) => field.addEventListener("input", syncVisualAudioMixer));
[$("visualExportFps"), $("visualExportQuality")].forEach((field) => field.addEventListener("change", syncVisualExportSettings));
$("visualGeneratePreview").addEventListener("click", () => enqueueVisualRender("preview").catch((error) => toast(error.message)));
$("visualRenderFinal").addEventListener("click", () => enqueueVisualRender("final").catch((error) => toast(error.message)));
$("visualRegenerateAutomatic").addEventListener("click", () => {
  if (!state.visualProject) return;
  const mode = $("visualDirectorMode").value;
  const modeLabel = mode === "advanced" ? "Diretor Avançado" : mode === "semantic" ? "Diretor de IA" : "automático local";
  if (!window.confirm(`Gerar uma montagem nova com ${modeLabel}? A timeline atual e as versões anteriores serão preservadas.`)) return;
  regenerateProject(state.visualProject.id, { directorMode: mode, directorBrief: $("visualDirectorBrief").value, effectsProfile: $("visualEffectsProfile").value }).catch((error) => toast(error.message));
});
$("visualAddTextLayer").addEventListener("click", () => {
  const layers = state.visualPlan?.textLayers || [];
  if (layers.length >= 20) return toast("O limite é de 20 camadas de texto por vídeo.");
  const duration = visualPlanDuration();
  layers.push({ id: `custom-${crypto.randomUUID()}`, type: "custom", value: "Novo texto", start: Math.min(1, Math.max(0, duration - 1)), end: Math.min(duration, 5), animation: "fade", position: "center", align: "center", font: "sans", sizeScale: 1, color: "#FFFFFF", outlineColor: "#092B45", background: true, margin: 64, slot: 0 });
  state.visualPlan.textLayers = layers;
  renderVisualTextLayers();
});
$("visualTextLayers").addEventListener("click", (event) => {
  const remove = event.target.closest("[data-layer-remove]");
  if (!remove) return;
  state.visualPlan.textLayers = (state.visualPlan.textLayers || []).filter((layer) => layer.id !== remove.dataset.layerRemove);
  renderVisualTextLayers();
});
const updateVisualTextLayer = (event) => {
  const field = event.target.closest("[data-layer-field]");
  const card = event.target.closest("[data-text-layer]");
  if (!field || !card) return;
  const layer = (state.visualPlan.textLayers || []).find((item) => item.id === card.dataset.textLayer);
  if (!layer) return;
  const key = field.dataset.layerField;
  if (key === "background") layer[key] = field.checked;
  else if (key === "sizeScale") layer[key] = Number(field.value || 100) / 100;
  else if (["start", "end", "margin"].includes(key)) layer[key] = Number(field.value || 0);
  else layer[key] = field.value;
};
$("visualTextLayers").addEventListener("input", updateVisualTextLayer);
$("visualTextLayers").addEventListener("change", updateVisualTextLayer);
$("visualTimeline").addEventListener("click", (event) => {
  const up = event.target.closest("[data-scene-up]");
  const down = event.target.closest("[data-scene-down]");
  const index = Number(up?.dataset.sceneUp ?? down?.dataset.sceneDown);
  if (!Number.isInteger(index)) return;
  const target = index + (up ? -1 : 1);
  if (target < 0 || target >= state.visualPlan.scenes.length) return;
  [state.visualPlan.scenes[index], state.visualPlan.scenes[target]] = [state.visualPlan.scenes[target], state.visualPlan.scenes[index]];
  state.visualPlan.scenes[0].transition = "none";
  state.visualPlan.scenes[0].transitionDuration = 0;
  state.visualPlan.scenes.slice(1).forEach((scene) => { if (!scene.transition || scene.transition === "none") { scene.transition = "fade"; scene.transitionDuration = 0.35; } });
  renderVisualTimeline();
});
$("visualTimeline").addEventListener("input", (event) => {
  const startHandle = event.target.closest("[data-scene-trim-start]");
  const endHandle = event.target.closest("[data-scene-trim-end]");
  if (!startHandle && !endHandle) return;
  const index = Number(startHandle?.dataset.sceneTrimStart ?? endHandle?.dataset.sceneTrimEnd);
  const card = event.target.closest("[data-visual-scene]");
  const startInput = card?.querySelector("[data-scene-trim-start]");
  const endInput = card?.querySelector("[data-scene-trim-end]");
  const scene = state.visualPlan.scenes[index];
  if (!scene || !startInput || !endInput) return;
  const sourceDuration = visualSourceDuration(scene);
  let start = Math.max(0, Math.min(sourceDuration - 0.5, Number(startInput.value || 0)));
  let end = Math.max(0.5, Math.min(sourceDuration, Number(endInput.value || sourceDuration)));
  if (startHandle) start = Math.max(end - 15, Math.min(start, end - 0.5));
  if (endHandle) end = Math.min(start + 15, Math.max(end, start + 0.5));
  startInput.value = start.toFixed(3);
  endInput.value = end.toFixed(3);
  scene.start = Number(start.toFixed(3));
  scene.duration = Number((end - start).toFixed(3));
  card.querySelector("[data-scene-duration]").value = scene.duration.toFixed(1);
  card.querySelector("[data-scene-trim-label]").textContent = `${start.toFixed(1)}s – ${end.toFixed(1)}s`;
  const ranges = card.querySelector(".visual-trim-ranges");
  ranges.style.setProperty("--trim-left", `${(start / sourceDuration * 100).toFixed(3)}%`);
  ranges.style.setProperty("--trim-right", `${(end / sourceDuration * 100).toFixed(3)}%`);
  const video = card.querySelector("video");
  if (video) video.currentTime = start;
  state.visualPlan.duration = visualPlanDuration();
  $("visualTotalDuration").textContent = `${state.visualPlan.duration.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}s`;
  renderVisualWaveform();
  syncVisualTexts();
});
$("visualTimeline").addEventListener("change", (event) => {
  const duration = event.target.closest("[data-scene-duration]");
  const transition = event.target.closest("[data-scene-transition]");
  const transitionDuration = event.target.closest("[data-scene-transition-duration]");
  if (duration) {
    const index = Number(duration.dataset.sceneDuration);
    const scene = state.visualPlan.scenes[index];
    scene.duration = Math.max(0.5, Math.min(15, visualSourceDuration(scene) - Number(scene.start || 0), Number(duration.value || 0.5)));
    scene.transitionDuration = clampVisualTransitionDuration(index, scene.transitionDuration);
    if (state.visualPlan.scenes[index + 1]) state.visualPlan.scenes[index + 1].transitionDuration = clampVisualTransitionDuration(index + 1, state.visualPlan.scenes[index + 1].transitionDuration);
  }
  if (transition) {
    const index = Number(transition.dataset.sceneTransition);
    const scene = state.visualPlan.scenes[index];
    scene.transition = transition.value;
    scene.transitionDuration = clampVisualTransitionDuration(index, scene.transitionDuration || 0.35);
  }
  if (transitionDuration) {
    const index = Number(transitionDuration.dataset.sceneTransitionDuration);
    state.visualPlan.scenes[index].transitionDuration = clampVisualTransitionDuration(index, transitionDuration.value);
  }
  renderVisualTimeline();
  syncVisualTexts();
});
$("visualVersionHistory").addEventListener("click", (event) => {
  const open = event.target.closest("[data-version-open]");
  const download = event.target.closest("[data-version-download]");
  const restore = event.target.closest("[data-version-restore]");
  if (open) openVisualVersion(open.dataset.versionOpen).catch((error) => toast(error.message));
  if (download) downloadVisualVersion(download.dataset.versionDownload).catch((error) => toast(error.message));
  if (restore) restoreVisualVersion(restore.dataset.versionRestore).catch((error) => toast(error.message));
});
