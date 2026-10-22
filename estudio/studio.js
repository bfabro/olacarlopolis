import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getDatabase, ref, get, set, update, push, onValue, query, limitToLast } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { getStorage, ref as storageRef, uploadBytesResumable, getDownloadURL, getBlob } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import { STUDIO_DURATIONS, STUDIO_EDIT_STYLES, STUDIO_EXPORT_QUALITIES, STUDIO_FORMATS, STUDIO_LIMITS, STUDIO_TEXT_PRESETS, STUDIO_TRANSITIONS, normalizeStudioProject, studioJobCostEstimate } from "../shared/studio-contracts.mjs?v=7";

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
const state = { user: null, profile: null, files: [], projects: [], activeProjectId: "", activeJobId: "", jobUnsubscribe: null, outputPreviewUrl: "", activeUploads: new Set(), cancelRequested: false, reviewingJobId: "", transcriptSegments: [], visualProject: null, visualPlan: null, visualSourceUrls: new Map() };
const viewTitles = { projects: "Meus projetos", editor: "Novo vídeo", visual: "Editor visual", processing: "Processamento", usage: "Uso e créditos" };
const statusLabels = { draft: "Rascunho", uploading: "Enviando", queued: "Na fila", analyzing: "Analisando", rendering: "Renderizando", awaiting_review: "Revisar legendas", cancel_requested: "Cancelando", deletion_queued: "Exclusão na fila", deleting: "Excluindo", cancelled: "Cancelado", completed: "Concluído", failed: "Falhou" };

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
}

function cleanFileName(name) {
  const parts = String(name || "arquivo").split(".");
  const extension = parts.length > 1 ? "." + parts.pop().replace(/[^a-zA-Z0-9]/g, "").toLowerCase() : "";
  const base = parts.join(".").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 70) || "arquivo";
  return base + extension;
}

async function privateOutputUrl(output) {
  if (output?.downloadUrl) return output.downloadUrl;
  if (!output?.storagePath) throw new Error("Arquivo final não encontrado.");
  const outputRef = storageRef(storage, output.storagePath);
  try {
    return await getDownloadURL(outputRef);
  } catch (error) {
    console.warn("O render não possui URL privada de streaming; usando download autenticado.", error);
    return URL.createObjectURL(await getBlob(outputRef));
  }
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
  switchView("processing");
  if (state.outputPreviewUrl) URL.revokeObjectURL(state.outputPreviewUrl);
  const outputUrl = await privateOutputUrl(project.output);
  state.outputPreviewUrl = outputUrl.startsWith("blob:") ? outputUrl : "";
  $("previewPlayer").src = outputUrl;
  $("downloadVideo").href = outputUrl;
  $("downloadVideo").download = cleanFileName(project.output.fileName || `${project.name || "ola-studio"}.mp4`);
  showDirectorResult(project.directorResult);
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
    editing: {
      rhythm: $("editingRhythm").value,
      syncToMusic: $("syncCutsToMusic").checked,
      prioritizeTechnicalQuality: true
    },
    director: {
      mode: $("directorMode").value,
      brief: $("directorBrief").value
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
  ["projects", "editor", "visual", "processing", "usage"].forEach((view) => $(`${view}View`)?.classList.toggle("hidden", view !== name));
  document.querySelectorAll("[data-studio-view]").forEach((button) => button.classList.toggle("active", button.dataset.studioView === name));
  $("studioViewTitle").textContent = viewTitles[name] || "Olá Studio";
  document.querySelector(".studio-shell")?.classList.remove("menu-open");
  if (name === "usage") loadUsage();
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

function showTranscriptReview(job, projectId) {
  if (state.reviewingJobId === job.id && !$("transcriptReviewCard").classList.contains("hidden")) return;
  const rawSegments = Array.isArray(job.transcriptReview?.segments) ? job.transcriptReview.segments : Object.values(job.transcriptReview?.segments || {});
  state.reviewingJobId = job.id;
  state.transcriptSegments = rawSegments.slice(0, 500);
  state.activeProjectId = projectId;
  state.activeJobId = job.id;
  $("processingStatusCard").classList.add("hidden");
  $("resultCard").classList.add("hidden");
  $("errorCard").classList.add("hidden");
  $("transcriptReviewCard").classList.remove("hidden");
  $("transcriptReviewCount").textContent = `${state.transcriptSegments.length} ${state.transcriptSegments.length === 1 ? "trecho" : "trechos"}`;
  $("transcriptReviewList").innerHTML = state.transcriptSegments.length ? state.transcriptSegments.map((segment, index) => `<label class="transcript-segment"><span>${timelineTime(segment.start)} – ${timelineTime(segment.end)}</span><textarea data-transcript-index="${index}" maxlength="300" aria-label="Trecho ${index + 1}">${escapeHtml(segment.text || "")}</textarea></label>`).join("") : '<p class="empty-copy">Nenhuma fala foi reconhecida. Você pode aprovar para continuar sem legendas.</p>';
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
    document.querySelectorAll("[data-transcript-index]").forEach((field) => {
      const index = Number(field.dataset.transcriptIndex);
      updates[`studioJobs/${state.user.uid}/${jobId}/transcriptReview/segments/${index}/text`] = String(field.value || "").replace(/\s+/g, " ").trim().slice(0, 300);
    });
    await update(ref(db), updates);
    state.reviewingJobId = "";
    state.transcriptSegments = [];
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

async function openProjectReview(projectId) {
  const project = state.projects.find((item) => item.id === projectId) || (await get(ref(db, `studioProjects/${state.user.uid}/${projectId}`))).val();
  if (!project?.jobId) return toast("A revisão deste projeto não foi encontrada.");
  state.activeProjectId = projectId;
  state.activeJobId = project.jobId;
  state.cancelRequested = false;
  switchView("processing");
  watchJob(project.jobId, projectId);
}

function watchJob(jobId, projectId) {
  state.jobUnsubscribe?.();
  state.jobUnsubscribe = onValue(ref(db, `studioJobs/${state.user.uid}/${jobId}`), async (snapshot) => {
    const job = snapshot.val();
    if (!job) return;
    const step = job.status === "cancel_requested" ? (Number(job.progress || 0) >= 50 ? "render" : "analysis") : job.stage === "probe" || job.stage === "analysis" || job.stage === "planning" ? "analysis" : job.stage === "transcription" || job.stage === "transcription_review" ? "transcription" : job.stage === "render" || job.stage === "upload_output" ? "render" : job.status === "completed" ? "complete" : job.status === "queued" ? "queue" : "upload";
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

async function regenerateProject(projectId) {
  const snapshot = await get(ref(db, `studioProjects/${state.user.uid}/${projectId}`));
  const project = snapshot.val();
  if (!project?.sources?.length) return toast("Projeto sem arquivos de origem.");
  const jobRef = push(ref(db, `studioJobs/${state.user.uid}`));
  const jobId = jobRef.key;
  const cost = studioJobCostEstimate(project);
  await update(ref(db), { [`studioJobs/${state.user.uid}/${jobId}`]: { schemaVersion: 1, id: jobId, projectId, ownerUid: state.user.uid, status: "queued", stage: "queue", progress: 25, attempt: 0, createdAt: Date.now(), updatedAt: Date.now(), costEstimate: cost }, [`studioProjects/${state.user.uid}/${projectId}/jobId`]: jobId, [`studioProjects/${state.user.uid}/${projectId}/status`]: "queued", [`studioProjects/${state.user.uid}/${projectId}/updatedAt`]: Date.now(), [`studioUsage/${state.user.uid}/estimates/${jobId}`]: { projectId, ...cost, status: "reserved", createdAt: Date.now() } });
  state.activeProjectId = projectId;
  state.activeJobId = jobId;
  state.cancelRequested = false;
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
  const blob = await getBlob(storageRef(storage, storagePath));
  return JSON.parse(await blob.text());
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
  $("visualVoiceVolume").value = Math.round(Number(audio.voiceVolume ?? 1) * 100);
  $("visualMusicVolume").value = Math.round(Number(audio.musicVolume ?? 0.18) * 100);
  $("visualMusicFade").value = Number(audio.fadeSeconds ?? 1.2);
  $("visualNoiseReduction").checked = audio.noiseReduction === true;
  $("visualMusicDucking").checked = state.visualPlan?.music?.duckDuringSpeech !== false;
  $("visualVoiceVolumeValue").textContent = `${$("visualVoiceVolume").value}%`;
  $("visualMusicVolumeValue").textContent = `${$("visualMusicVolume").value}%`;
  $("visualMusicFadeValue").textContent = `${Number($("visualMusicFade").value).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}s`;
}

function syncVisualAudioMixer() {
  if (!state.visualPlan) return;
  state.visualPlan.audio = {
    ...(state.visualPlan.audio || {}),
    voiceVolume: Number($("visualVoiceVolume").value) / 100,
    musicVolume: Number($("visualMusicVolume").value) / 100,
    fadeSeconds: Number($("visualMusicFade").value),
    noiseReduction: $("visualNoiseReduction").checked
  };
  state.visualPlan.music = { ...(state.visualPlan.music || {}), duckDuringSpeech: $("visualMusicDucking").checked };
  $("visualVoiceVolumeValue").textContent = `${$("visualVoiceVolume").value}%`;
  $("visualMusicVolumeValue").textContent = `${$("visualMusicVolume").value}%`;
  $("visualMusicFadeValue").textContent = `${Number($("visualMusicFade").value).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}s`;
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
    const media = image
      ? `<img class="visual-scene-media" src="${escapeHtml(url)}" alt="Cena ${index + 1}">`
      : `<video class="visual-scene-media" src="${escapeHtml(url)}#t=${Math.max(0, Number(scene.start || 0)).toFixed(2)}" muted preload="metadata"></video>`;
    return `<article class="visual-scene" data-visual-scene="${index}"><span class="visual-scene-index">${index + 1}</span>${media}<div class="visual-scene-info"><strong>${escapeHtml(source.name || `Arquivo ${Number(scene.sourceIndex || 0) + 1}`)}</strong><label>Duração<input data-scene-duration="${index}" type="number" min="0.5" max="${Math.min(15, visualSourceDuration(scene)).toFixed(1)}" step="0.1" value="${Number(scene.duration || 0).toFixed(1)}"></label><label>Transição<select data-scene-transition="${index}" ${index === 0 ? "disabled" : ""}>${transitionOptions(scene.transition, index === 0)}</select></label>${visualTrimMarkup(scene, index, image)}</div><div class="visual-scene-actions"><button type="button" data-scene-up="${index}" ${index === 0 ? "disabled" : ""} title="Mover antes"><i class="fa-solid fa-arrow-up"></i></button><button type="button" data-scene-down="${index}" ${index === plan.scenes.length - 1 ? "disabled" : ""} title="Mover depois"><i class="fa-solid fa-arrow-down"></i></button></div></article>`;
  }).join("");
}

function renderVisualVersions() {
  const versions = Object.values(state.visualProject?.versions || {}).sort((a, b) => Number(b.number || 0) - Number(a.number || 0));
  $("visualVersionHistory").innerHTML = versions.length ? versions.map((version) => `<div class="visual-version"><span><strong>Versão ${Number(version.number || 1)}</strong><small>${escapeHtml(version.source === "visual-editor" ? "Editor visual" : "Montagem automática")} • ${formatDate(version.completedAt)}</small></span><button type="button" data-version-open="${escapeHtml(version.id)}" title="Reproduzir esta versão"><i class="fa-solid fa-play"></i></button></div>`).join("") : '<p class="empty-copy">A primeira versão aparecerá aqui após a próxima exportação.</p>';
}

async function setVisualPreview(output) {
  if (!output) { $("visualPreviewPlayer").removeAttribute("src"); return; }
  if (state.outputPreviewUrl) URL.revokeObjectURL(state.outputPreviewUrl);
  const url = await privateOutputUrl(output);
  state.outputPreviewUrl = url.startsWith("blob:") ? url : "";
  $("visualPreviewPlayer").src = url;
}

async function openVisualEditor(projectId, preferredOutput = null) {
  const snapshot = await get(ref(db, `studioProjects/${state.user.uid}/${projectId}`));
  const project = { id: projectId, ...(snapshot.val() || {}) };
  if (!project.sources?.length) throw new Error("Este projeto não possui arquivos de origem.");
  let planPath = "";
  if (project.jobId) {
    const job = (await get(ref(db, `studioJobs/${state.user.uid}/${project.jobId}`))).val();
    planPath = job?.plan?.storagePath || "";
  }
  if (!planPath) planPath = Object.values(project.versions || {}).sort((a, b) => Number(b.number || 0) - Number(a.number || 0))[0]?.planStoragePath || "";
  state.visualProject = project;
  state.visualPlan = await readPrivateJson(planPath);
  state.activeProjectId = projectId;
  state.visualSourceUrls = new Map();
  await Promise.all(project.sources.map(async (source) => {
    const url = source.downloadUrl || await getDownloadURL(storageRef(storage, source.storagePath));
    state.visualSourceUrls.set(source.id, url);
  }));
  $("visualProjectName").textContent = project.name || "Ajuste sua montagem";
  $("visualTitle").value = state.visualPlan.text?.title || "";
  $("visualSubtitle").value = state.visualPlan.text?.subtitle || "";
  $("visualCta").value = state.visualPlan.text?.callToAction || "";
  renderVisualPrimaryTextStyle();
  renderVisualAudioMixer();
  renderVisualExportSettings();
  renderVisualTimeline();
  renderVisualTextLayers();
  renderVisualVersions();
  await setVisualPreview(preferredOutput || project.output || project.preview);
  $("visualPreviewNotice").textContent = preferredOutput || project.preview ? "Prévia reduzida atualizada com o plano editado." : "Exibindo a última exportação Full HD. Gere uma prévia leve para conferir novos ajustes.";
  switchView("visual");
}

async function openVisualVersion(versionId) {
  const version = state.visualProject?.versions?.[versionId];
  if (!version?.output) return toast("Arquivo desta versão não encontrado.");
  await setVisualPreview(version.output);
  $("visualPreviewNotice").textContent = `Reproduzindo a versão ${Number(version.number || 1)} preservada no histórico.`;
}

async function enqueueVisualRender(mode) {
  if (!state.visualPlan || !state.visualProject) return;
  syncVisualTexts();
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
    const open = completed && (project.output?.storagePath || project.output?.downloadUrl) ? `<button type="button" data-project-open="${project.id}"><i class="fa-solid fa-circle-play"></i> Abrir</button>` : "";
    const download = completed && (project.output?.storagePath || project.output?.downloadUrl) ? `<button type="button" data-project-download="${project.id}"><i class="fa-solid fa-download"></i> Baixar</button>` : "";
    const edit = completed && project.jobId ? `<button type="button" data-project-edit="${project.id}"><i class="fa-solid fa-sliders"></i> Editar</button>` : "";
    const cancel = active && !deletionActive ? `<button type="button" data-project-cancel="${project.id}"><i class="fa-solid fa-ban"></i> Cancelar</button>` : "";
    const regenerate = active ? "" : `<button type="button" data-project-regenerate="${project.id}"><i class="fa-solid fa-rotate"></i> Nova versão</button>`;
    const remove = active ? "" : `<button type="button" class="danger" data-project-delete="${project.id}"><i class="fa-solid fa-trash-can"></i> Excluir</button>`;
    const director = project.director?.mode === "semantic" ? `<span><i class="fa-solid fa-wand-magic-sparkles"></i> ${project.directorResult?.applied ? "Direção por IA" : "IA solicitada"}</span>` : "";
    return `<article class="project-card"><div class="project-cover"><span class="project-status ${completed ? "completed" : failed ? "failed" : cancelled ? "cancelled" : project.status === "awaiting_review" ? "review" : ["deletion_queued", "deleting"].includes(project.status) ? "deleting" : ""}">${escapeHtml(statusLabels[project.status] || project.status || "Projeto")}</span><i class="fa-solid ${project.format === "9:16" ? "fa-mobile-screen" : project.format === "1:1" ? "fa-square" : "fa-display"}"></i></div><div class="project-body"><h3>${escapeHtml(project.name || "Projeto sem nome")}</h3><p>${escapeHtml(STUDIO_EDIT_STYLES[project.style]?.label || project.style)} • ${escapeHtml(project.format)} • ${Number(project.duration || 0)}s</p><div class="project-meta"><span><i class="fa-regular fa-calendar"></i> ${formatDate(project.updatedAt)}</span><span><i class="fa-regular fa-images"></i> ${project.sources?.length || 0} arquivos</span>${director}</div><div class="project-actions">${review}${open}${edit}${download}${cancel}${regenerate}${remove}</div></div></article>`;
  }).join("");
}

async function loadUsage() {
  if (!state.user) return;
  const [creditsSnap, usageSnap, ledgerSnap] = await Promise.all([get(ref(db, `studioCredits/${state.user.uid}`)), get(ref(db, `studioUsage/${state.user.uid}`)), get(query(ref(db, `studioCreditLedger/${state.user.uid}`), limitToLast(30)))]);
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
  $("usageHistory").innerHTML = entries.length ? entries.map((item) => `<div class="usage-entry"><span><strong>${escapeHtml(item.description || item.type || "Movimentação")}</strong><small>${formatDate(item.createdAt)}</small></span><b>${Number(item.amount || 0) > 0 ? "+" : ""}${Number(item.amount || 0)}</b></div>`).join("") : '<p class="empty-copy">Nenhum consumo registrado.</p>';
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
  const flagSnap = await get(ref(db, "studioFeatureFlags/enabled"));
  const previewAuthorized = new URLSearchParams(location.search).get("preview") === "1";
  if (flagSnap.val() !== true && !previewAuthorized) {
    $("unavailableMessage").textContent = "A feature flag do Olá Studio está desativada. Abra o acesso protegido pelo Painel Admin para testar o MVP.";
    showGate("studioUnavailable");
    return;
  }
  $("userName").textContent = state.profile.nome || "Admin Master";
  $("userEmail").textContent = user.email || state.profile.email || "";
  $("userInitial").textContent = String(state.profile.nome || user.email || "A").trim().charAt(0).toUpperCase();
  showGate("studioApp");
  resetEditor();
  await loadProjects();
  switchView(location.hash === "#editor" ? "editor" : location.hash === "#usage" ? "usage" : "projects");
}

$("loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  $("loginButton").disabled = true;
  $("loginMessage").textContent = "";
  try { await signInWithEmailAndPassword(auth, $("loginEmail").value.trim(), $("loginPassword").value); }
  catch (error) { $("loginMessage").textContent = error.code === "auth/invalid-credential" ? "E-mail ou senha inválidos." : "Não foi possível entrar. Tente novamente."; }
  finally { $("loginButton").disabled = false; }
});

onAuthStateChanged(auth, (user) => user ? authorize(user).catch((error) => { console.error(error); $("unavailableMessage").textContent = "Não foi possível validar o acesso ao Studio."; showGate("studioUnavailable"); }) : showGate("studioLogin"));

document.querySelectorAll("[data-studio-view]").forEach((button) => button.addEventListener("click", () => switchView(button.dataset.studioView)));
document.querySelectorAll("[data-new-project]").forEach((button) => button.addEventListener("click", openNewProject));
$("logoutButton").addEventListener("click", () => signOut(auth));
$("mobileMenuButton").addEventListener("click", () => document.querySelector(".studio-shell").classList.toggle("menu-open"));
$("refreshProjects").addEventListener("click", () => loadProjects().then(() => toast("Projetos atualizados.")));
$("dropZone").addEventListener("click", () => $("sourceFiles").click());
$("dropZone").addEventListener("keydown", (event) => { if (["Enter", " "].includes(event.key)) { event.preventDefault(); $("sourceFiles").click(); } });
$("sourceFiles").addEventListener("change", (event) => { addFiles(event.target.files); event.target.value = ""; });
["dragenter", "dragover"].forEach((type) => $("dropZone").addEventListener(type, (event) => { event.preventDefault(); $("dropZone").classList.add("dragging"); }));
["dragleave", "drop"].forEach((type) => $("dropZone").addEventListener(type, (event) => { event.preventDefault(); $("dropZone").classList.remove("dragging"); }));
$("dropZone").addEventListener("drop", (event) => addFiles(event.dataTransfer.files));
$("mediaLibrary").addEventListener("click", (event) => { const up = event.target.closest("[data-media-up]"); const down = event.target.closest("[data-media-down]"); const remove = event.target.closest("[data-media-remove]"); if (up) moveMedia(up.dataset.mediaUp, -1); if (down) moveMedia(down.dataset.mediaDown, 1); if (remove) removeMedia(remove.dataset.mediaRemove); });
$("projectForm").addEventListener("change", updateSummary);
$("projectForm").addEventListener("input", updateSummary);
$("textPreset").addEventListener("change", applyTextPreset);
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
  const edit = event.target.closest("[data-project-edit]");
  const remove = event.target.closest("[data-project-delete]");
  if (open) showProjectVideo(open.dataset.projectOpen).catch((error) => toast(error.message));
  if (download) downloadProject(download.dataset.projectDownload).catch((error) => toast(error.message));
  if (cancel) cancelProject(cancel.dataset.projectCancel).catch((error) => toast(error.message));
  if (regenerate) regenerateProject(regenerate.dataset.projectRegenerate).catch((error) => toast(error.message));
  if (review) openProjectReview(review.dataset.projectReview).catch((error) => toast(error.message));
  if (edit) openVisualEditor(edit.dataset.projectEdit).catch((error) => toast(error.message));
  if (remove) requestProjectDeletion(remove.dataset.projectDelete).catch((error) => toast(error.message));
});
$("cancelProcessingButton").addEventListener("click", () => cancelProject().catch((error) => toast(error.message)));
$("cancelTranscriptReviewButton").addEventListener("click", () => cancelProject().catch((error) => toast(error.message)));
$("approveTranscriptButton").addEventListener("click", approveTranscriptReview);
$("backToProjects").addEventListener("click", () => { $("previewPlayer").pause(); switchView("projects"); });
$("regenerateVideo").addEventListener("click", () => state.activeProjectId && regenerateProject(state.activeProjectId).catch((error) => toast(error.message)));
$("visualBackProjects").addEventListener("click", () => { $("visualPreviewPlayer").pause(); switchView("projects"); });
[$("visualTitle"), $("visualSubtitle"), $("visualCta")].forEach((field) => field.addEventListener("input", syncVisualTexts));
[$("visualTextFont"), $("visualTextSize"), $("visualTextColor"), $("visualTextOutline"), $("visualTextAlign"), $("visualTextBackground")].forEach((field) => field.addEventListener("input", syncVisualPrimaryTextStyle));
[$("visualVoiceVolume"), $("visualMusicVolume"), $("visualMusicFade"), $("visualNoiseReduction"), $("visualMusicDucking")].forEach((field) => field.addEventListener("input", syncVisualAudioMixer));
[$("visualExportFps"), $("visualExportQuality")].forEach((field) => field.addEventListener("change", syncVisualExportSettings));
$("visualGeneratePreview").addEventListener("click", () => enqueueVisualRender("preview").catch((error) => toast(error.message)));
$("visualRenderFinal").addEventListener("click", () => enqueueVisualRender("final").catch((error) => toast(error.message)));
$("visualRegenerateAutomatic").addEventListener("click", () => {
  if (!state.visualProject || !window.confirm("Gerar uma montagem automática nova? Seus vídeos e versões anteriores serão preservados.")) return;
  regenerateProject(state.visualProject.id).catch((error) => toast(error.message));
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
  if (duration) {
    const scene = state.visualPlan.scenes[Number(duration.dataset.sceneDuration)];
    scene.duration = Math.max(0.5, Math.min(15, visualSourceDuration(scene) - Number(scene.start || 0), Number(duration.value || 0.5)));
    scene.transitionDuration = Math.min(Number(scene.transitionDuration || 0), scene.duration / 2);
  }
  if (transition) state.visualPlan.scenes[Number(transition.dataset.sceneTransition)].transition = transition.value;
  renderVisualTimeline();
  syncVisualTexts();
});
$("visualVersionHistory").addEventListener("click", (event) => {
  const button = event.target.closest("[data-version-open]");
  if (button) openVisualVersion(button.dataset.versionOpen).catch((error) => toast(error.message));
});
