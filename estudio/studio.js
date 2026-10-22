import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getDatabase, ref, get, set, update, push, onValue, query, limitToLast } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { getStorage, ref as storageRef, uploadBytesResumable, getDownloadURL, getBlob } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import { STUDIO_DURATIONS, STUDIO_EDIT_STYLES, STUDIO_FORMATS, STUDIO_LIMITS, STUDIO_TEXT_PRESETS, normalizeStudioProject, studioJobCostEstimate } from "../shared/studio-contracts.mjs?v=2";

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
const state = { user: null, profile: null, files: [], projects: [], activeProjectId: "", activeJobId: "", jobUnsubscribe: null, outputPreviewUrl: "", activeUploads: new Set(), cancelRequested: false };
const viewTitles = { projects: "Meus projetos", editor: "Novo vídeo", processing: "Processamento", usage: "Uso e créditos" };
const statusLabels = { draft: "Rascunho", uploading: "Enviando", queued: "Na fila", analyzing: "Analisando", rendering: "Renderizando", cancel_requested: "Cancelando", cancelled: "Cancelado", completed: "Concluído", failed: "Falhou" };

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

async function showProjectVideo(projectId) {
  const project = state.projects.find((item) => item.id === projectId);
  if (!project?.output) throw new Error("O vídeo final deste projeto não foi encontrado.");
  state.activeProjectId = projectId;
  state.activeJobId = project.jobId || "";
  $("resultCard").classList.add("hidden");
  $("errorCard").classList.add("hidden");
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
    transition: $("transitionMode").value,
    transitionDuration: Number($("transitionDuration").value),
    textDesign: {
      preset: $("textPreset").value,
      animation: $("textAnimation").value,
      sizeScale: Number($("textSizeScale").value) / 100,
      color: $("textColor").value,
      position: $("textPosition").value,
      background: $("textBackground").checked
    },
    captionsEnabled: $("captionsEnabled").checked,
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

function switchView(name) {
  ["projects", "editor", "processing", "usage"].forEach((view) => $(`${view}View`)?.classList.toggle("hidden", view !== name));
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
  updateTextSizeLabel();
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
  const order = ["upload", "queue", "analysis", "render", "complete"];
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
  const activeJobs = state.projects.filter((item) => ["uploading", "queued", "analyzing", "rendering", "cancel_requested"].includes(item.status));
  if (activeJobs.length >= STUDIO_LIMITS.maxConcurrentJobsPerUser) return toast("Aguarde o processamento atual terminar antes de criar outro vídeo.");
  switchView("processing");
  $("resultCard").classList.add("hidden");
  $("errorCard").classList.add("hidden");
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
  if (jobId) {
    const jobSnapshot = await get(ref(db, `studioJobs/${state.user.uid}/${jobId}`));
    if (["analyzing", "rendering"].includes(jobSnapshot.val()?.status)) jobStatus = "cancel_requested";
  }
  const now = Date.now();
  const updates = { [`studioProjects/${state.user.uid}/${projectId}/status`]: jobStatus, [`studioProjects/${state.user.uid}/${projectId}/updatedAt`]: now };
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

function watchJob(jobId, projectId) {
  state.jobUnsubscribe?.();
  state.jobUnsubscribe = onValue(ref(db, `studioJobs/${state.user.uid}/${jobId}`), async (snapshot) => {
    const job = snapshot.val();
    if (!job) return;
    const step = job.status === "cancel_requested" ? (Number(job.progress || 0) >= 50 ? "render" : "analysis") : job.stage === "probe" || job.stage === "analysis" || job.stage === "planning" ? "analysis" : job.stage === "render" || job.stage === "upload_output" ? "render" : job.status === "completed" ? "complete" : job.status === "queued" ? "queue" : "upload";
    markProcessStep(step);
    updateProgress(job.progress || 25, statusLabels[job.status] || job.stage || "Processando", job.message || "O processamento continua no worker.");
    if (job.status === "completed") {
      state.jobUnsubscribe?.();
      state.jobUnsubscribe = null;
      $("processingTitle").textContent = "Seu vídeo está pronto";
      $("processingMessage").textContent = "Assista à prévia e baixe o MP4 em alta qualidade.";
      $("cancelProcessingButton").classList.add("hidden");
      if (state.outputPreviewUrl) URL.revokeObjectURL(state.outputPreviewUrl);
      const outputUrl = await privateOutputUrl(job.output);
      state.outputPreviewUrl = outputUrl.startsWith("blob:") ? outputUrl : "";
      $("previewPlayer").src = outputUrl;
      $("downloadVideo").href = outputUrl;
      $("downloadVideo").download = `${cleanFileName(job.output?.fileName || "ola-studio.mp4")}`;
      $("resultCard").classList.remove("hidden");
      loadProjects();
    }
    if (job.status === "failed") {
      state.jobUnsubscribe?.();
      state.jobUnsubscribe = null;
      $("cancelProcessingButton").classList.add("hidden");
      showProcessingError(job.error?.message || "O worker não conseguiu concluir a renderização.");
      loadProjects();
    }
    if (job.status === "cancelled") {
      state.jobUnsubscribe?.();
      state.jobUnsubscribe = null;
      state.cancelRequested = false;
      $("cancelProcessingButton").classList.add("hidden");
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
  $("processingEyebrow").textContent = "Processando nova versão";
  $("processingTitle").textContent = "Nova versão na fila";
  markProcessStep("queue");
  updateProgress(25, "Aguardando worker", "Os arquivos originais serão reutilizados sem novo upload.");
  watchJob(jobId, projectId);
}

async function loadProjects() {
  if (!state.user) return;
  const snapshot = await get(query(ref(db, `studioProjects/${state.user.uid}`), limitToLast(30)));
  const value = snapshot.val() || {};
  state.projects = Object.entries(value).map(([id, project]) => ({ id, ...project })).sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0));
  renderProjects();
}

function renderProjects() {
  const root = $("projectsGrid");
  if (!state.projects.length) { root.innerHTML = '<div class="empty-state"><i class="fa-solid fa-film"></i><h3>Nenhum projeto ainda</h3><p>Seu primeiro vídeo aparecerá aqui.</p></div>'; return; }
  root.innerHTML = state.projects.map((project) => {
    const completed = project.status === "completed";
    const failed = project.status === "failed";
    const cancelled = project.status === "cancelled";
    const active = ["uploading", "queued", "analyzing", "rendering", "cancel_requested"].includes(project.status);
    const open = completed && (project.output?.storagePath || project.output?.downloadUrl) ? `<button type="button" data-project-open="${project.id}"><i class="fa-solid fa-circle-play"></i> Abrir</button>` : "";
    const download = completed && (project.output?.storagePath || project.output?.downloadUrl) ? `<button type="button" data-project-download="${project.id}"><i class="fa-solid fa-download"></i> Baixar</button>` : "";
    const cancel = active ? `<button type="button" data-project-cancel="${project.id}"><i class="fa-solid fa-ban"></i> Cancelar</button>` : "";
    const regenerate = active ? "" : `<button type="button" data-project-regenerate="${project.id}"><i class="fa-solid fa-rotate"></i> Nova versão</button>`;
    return `<article class="project-card"><div class="project-cover"><span class="project-status ${completed ? "completed" : failed ? "failed" : cancelled ? "cancelled" : ""}">${escapeHtml(statusLabels[project.status] || project.status || "Projeto")}</span><i class="fa-solid ${project.format === "9:16" ? "fa-mobile-screen" : project.format === "1:1" ? "fa-square" : "fa-display"}"></i></div><div class="project-body"><h3>${escapeHtml(project.name || "Projeto sem nome")}</h3><p>${escapeHtml(STUDIO_EDIT_STYLES[project.style]?.label || project.style)} • ${escapeHtml(project.format)} • ${Number(project.duration || 0)}s</p><div class="project-meta"><span><i class="fa-regular fa-calendar"></i> ${formatDate(project.updatedAt)}</span><span><i class="fa-regular fa-images"></i> ${project.sources?.length || 0} arquivos</span></div><div class="project-actions">${open}${download}${cancel}${regenerate}</div></div></article>`;
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
$("projectForm").addEventListener("submit", submitProject);
$("logoFile").addEventListener("change", () => { const file = $("logoFile").files[0]; if (file && file.size > 8 * 1024 * 1024) { $("logoFile").value = ""; return toast("A logo deve ter no máximo 8 MB."); } $("logoFileLabel").innerHTML = `<i class="fa-regular fa-image"></i> ${escapeHtml(file?.name || "Escolher PNG ou WebP")}`; });
$("musicFile").addEventListener("change", () => { const file = $("musicFile").files[0]; if (file && file.size > STUDIO_LIMITS.maxAudioBytes) { $("musicFile").value = ""; return toast("A música deve ter no máximo 25 MB."); } $("musicFileLabel").innerHTML = `<i class="fa-solid fa-music"></i> ${escapeHtml(file?.name || "Escolher áudio")}`; });
$("projectsGrid").addEventListener("click", (event) => {
  const open = event.target.closest("[data-project-open]");
  const download = event.target.closest("[data-project-download]");
  const cancel = event.target.closest("[data-project-cancel]");
  const regenerate = event.target.closest("[data-project-regenerate]");
  if (open) showProjectVideo(open.dataset.projectOpen).catch((error) => toast(error.message));
  if (download) downloadProject(download.dataset.projectDownload).catch((error) => toast(error.message));
  if (cancel) cancelProject(cancel.dataset.projectCancel).catch((error) => toast(error.message));
  if (regenerate) regenerateProject(regenerate.dataset.projectRegenerate).catch((error) => toast(error.message));
});
$("cancelProcessingButton").addEventListener("click", () => cancelProject().catch((error) => toast(error.message)));
$("backToProjects").addEventListener("click", () => { $("previewPlayer").pause(); switchView("projects"); });
$("regenerateVideo").addEventListener("click", () => state.activeProjectId && regenerateProject(state.activeProjectId).catch((error) => toast(error.message)));
