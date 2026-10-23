import fs from "node:fs/promises";
import path from "node:path";
import { workerConfig } from "./config.mjs";
import { database } from "./firebase-client.mjs";
import { nextQueuedJob, claimJob, updateJob } from "./queue.mjs";
import { deleteProjectAssets, downloadAsset, downloadJson, uploadJson, uploadRender } from "./storage.mjs";
import { analyzeSources } from "./analyzer.mjs";
import { createTranscriptionProvider, prepareReviewedTranscription } from "./transcription.mjs";
import { createDeterministicPlan } from "./planner.mjs";
import { renderPlan } from "./renderer.mjs";
import { analyzeMusicRhythm } from "./rhythm.mjs";
import { createSemanticPlanner, markSemanticFallback, prepareSemanticEvidence, semanticFailureInfo } from "./ai-planner.mjs";
import { prepareVisualEditorPlan } from "./editor-plan.mjs";
import { generateLibraryMusic, generateTransitionSoundtrack, generatedAudioPaths } from "./sound-library.mjs";
import { createSpeechProvider } from "./tts-provider.mjs";

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function processDeletionJob(job, project) {
  const request = project.deletionRequest || {};
  if (job.deletionAuthorized !== true || !job.deletionToken || job.deletionToken !== request.token || request.requestedBy !== job.uid) throw new Error("A exclusão não possui confirmação válida do proprietário.");
  const jobsSnapshot = await database.ref(`studioJobs/${job.uid}`).get();
  const jobs = jobsSnapshot.val() || {};
  const active = Object.entries(jobs).find(([jobId, item]) => jobId !== job.jobId && item?.projectId === job.projectId && ["queued", "analyzing", "rendering", "awaiting_review", "cancel_requested"].includes(item?.status));
  if (active) throw new Error("Cancele o processamento ativo antes de excluir o projeto.");
  await updateJob(job.uid, job.jobId, { status: "deleting", stage: "deleting", progress: 55, message: "Excluindo somente os arquivos deste projeto." });
  const removed = await deleteProjectAssets(job.uid, job.projectId);
  const completedAt = Date.now();
  const updates = {
    [`studioProjects/${job.uid}/${job.projectId}`]: null,
    [`studioJobs/${job.uid}/${job.jobId}/status`]: "completed",
    [`studioJobs/${job.uid}/${job.jobId}/stage`]: "complete",
    [`studioJobs/${job.uid}/${job.jobId}/progress`]: 100,
    [`studioJobs/${job.uid}/${job.jobId}/message`]: "Projeto e mídias excluídos com autorização do usuário.",
    [`studioJobs/${job.uid}/${job.jobId}/deletedFiles`]: removed.deletedFiles,
    [`studioJobs/${job.uid}/${job.jobId}/completedAt`]: completedAt,
    [`studioJobs/${job.uid}/${job.jobId}/updatedAt`]: completedAt,
    [`studioCreditLedger/${job.uid}/${job.jobId}`]: { type: "deletion", amount: 0, projectId: job.projectId, jobId: job.jobId, description: "Exclusão autorizada do projeto e das mídias", createdAt: completedAt }
  };
  Object.entries(jobs).forEach(([jobId, item]) => {
    if (jobId === job.jobId || item?.projectId !== job.projectId) return;
    updates[`studioJobs/${job.uid}/${jobId}`] = null;
    updates[`studioUsage/${job.uid}/estimates/${jobId}`] = null;
  });
  await database.ref().update(updates);
}

async function processJob(job) {
  const started = Date.now();
  const workDir = path.join(workerConfig.workRoot, job.uid, job.jobId);
  const jobRef = database.ref(`studioJobs/${job.uid}/${job.jobId}`);
  const cancellation = new AbortController();
  const cancellationListener = jobRef.on("value", (snapshot) => {
    if (["cancel_requested", "cancelled"].includes(snapshot.val()?.status)) cancellation.abort();
  });
  const ensureNotCancelled = () => {
    if (cancellation.signal.aborted) throw Object.assign(new Error("Processamento cancelado pelo usuário."), { code: "studio_cancelled" });
  };
  await fs.mkdir(workDir, { recursive: true });
  try {
    const projectSnap = await database.ref(`studioProjects/${job.uid}/${job.projectId}`).get();
    const project = projectSnap.val();
    if (!project) throw new Error("Projeto nao encontrado.");
    if (job.mode === "delete") {
      await processDeletionJob(job, project);
      return;
    }
    const sourceDir = path.join(workDir, "sources");
    const outputDir = path.join(workDir, "output");
    await fs.mkdir(sourceDir, { recursive: true });
    await fs.mkdir(outputDir, { recursive: true });
    const sources = [];
    const ordered = [...(project.sources || [])].sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
    for (let index = 0; index < ordered.length; index += 1) {
      ensureNotCancelled();
      sources.push(await downloadAsset(ordered[index], sourceDir, `source-${String(index + 1).padStart(2, "0")}`));
    }
    ensureNotCancelled();
    const logo = await downloadAsset(project.logo, sourceDir, "logo");
    const music = await downloadAsset(project.music, sourceDir, "music");
    const audioPaths = generatedAudioPaths(workDir);
    const requestedLibraryMusic = job.planOverride?.music?.libraryTrack || project.libraryMusic || "none";
    const musicPath = music?.localPath || await generateLibraryMusic(requestedLibraryMusic, project.duration, audioPaths.music, cancellation.signal);
    ensureNotCancelled();
    const analyzed = await analyzeSources(sources, async (done, total) => updateJob(job.uid, job.jobId, { stage: "analysis", status: "analyzing", progress: 32 + Math.round(done / total * 16), message: `Analisando arquivo ${done} de ${total}.` }), cancellation.signal);
    const totalSourceDuration = analyzed.reduce((sum, source) => sum + (source.contentType.startsWith("video/") ? Number(source.metadata.duration || 0) : 0), 0);
    if (sources.length > 10) throw new Error("O projeto excede o limite de 10 arquivos.");
    if (totalSourceDuration > 600) throw new Error("A duração total dos vídeos de origem excede 10 minutos.");
    await updateJob(job.uid, job.jobId, { stage: "analysis", status: "analyzing", progress: 49, message: musicPath ? "Analisando o ritmo real da música." : "Montando a narrativa técnica." });
    const rhythm = await analyzeMusicRhythm(musicPath, workDir, cancellation.signal);
    const technicalPlan = createDeterministicPlan(project, analyzed, { rhythm });
    const ownedPlanPrefix = `studio/${job.uid}/plans/${job.projectId}/`;
    const reusablePlanPath = job.transcriptReview?.status === "approved" && String(job.plan?.storagePath || "").startsWith(ownedPlanPrefix) ? job.plan.storagePath : "";
    const reusablePlan = reusablePlanPath ? await downloadJson(reusablePlanPath).catch(() => null) : null;
    let plan = reusablePlan || (job.planOverride ? prepareVisualEditorPlan(job.planOverride, technicalPlan, analyzed) : technicalPlan);
    if (!reusablePlan && !job.planOverride && project.director?.mode === "semantic") {
      const semanticPlanner = createSemanticPlanner();
      if (!semanticPlanner.enabled) {
        const fallback = { code: "ai_not_configured", message: "O Diretor de IA não está configurado neste worker. A montagem técnica local continuará normalmente." };
        plan = markSemanticFallback(technicalPlan, fallback.message, fallback);
        await updateJob(job.uid, job.jobId, { message: fallback.message, event: { level: "warning", code: fallback.code, message: fallback.message } });
      } else {
        try {
          await updateJob(job.uid, job.jobId, { stage: "planning", status: "analyzing", progress: 49, message: "O diretor de IA está analisando quadros, transcrições e o objetivo criativo." });
          const sourceTranscriptionProvider = await createTranscriptionProvider();
          const evidence = await prepareSemanticEvidence(analyzed, workDir, { signal: cancellation.signal, transcriptionProvider: sourceTranscriptionProvider, prompt: project.captions?.prompt || "", maxFrames: workerConfig.aiMaxFrames });
          if (evidence.warnings.length) {
            const count = evidence.warnings.length;
            const message = `${count} ${count === 1 ? "mídia não gerou quadro para a IA e foi ignorada" : "mídias não geraram quadros para a IA e foram ignoradas"}. A análise continuará com ${evidence.frames.length} ${evidence.frames.length === 1 ? "quadro válido" : "quadros válidos"}.`;
            await updateJob(job.uid, job.jobId, { stage: "planning", status: "analyzing", progress: 49, message, event: { level: "warning", code: "ai_evidence_partial", message, details: evidence.warnings.map((warning) => warning.message).slice(0, 6) } });
          }
          plan = await semanticPlanner.createPlan({ project, basePlan: technicalPlan, evidence, analyzedSources: analyzed, signal: cancellation.signal });
          await updateJob(job.uid, job.jobId, { stage: "planning", status: "analyzing", progress: 50, message: "Direção por IA concluída e validada. Preparando a renderização.", event: { level: "success", code: "ai_direction_applied", message: `Direção por IA aplicada com ${evidence.frames.length} ${evidence.frames.length === 1 ? "quadro visual" : "quadros visuais"}.` } });
        } catch (error) {
          if (error?.code === "studio_cancelled" || cancellation.signal.aborted) throw error;
          console.warn(`[${job.jobId}] Diretor de IA indisponível; usando plano local:`, error.message);
          const fallback = semanticFailureInfo(error);
          plan = markSemanticFallback(technicalPlan, fallback.message, fallback);
          await updateJob(job.uid, job.jobId, { stage: "planning", status: "analyzing", progress: 50, message: fallback.message, event: { level: "warning", code: fallback.code, message: `${fallback.message} Nenhum arquivo original foi alterado.` } });
        }
      }
    }
    const directorResult = job.planOverride
      ? { requested: false, applied: false, editorApplied: true, updatedAt: Date.now() }
      : project.director?.mode === "semantic"
      ? { requested: true, applied: plan.aiDirector?.applied === true, provider: plan.planner?.provider || "", model: plan.planner?.model || "", reason: plan.aiDirector?.reason || "", code: plan.aiDirector?.code || "", updatedAt: Date.now() }
      : { requested: false, applied: false, updatedAt: Date.now() };
    const planStoragePath = `studio/${job.uid}/plans/${job.projectId}/${job.jobId}.json`;
    const soundEffectsPath = await generateTransitionSoundtrack(plan.soundEffects?.preset || "none", plan, audioPaths.effects, cancellation.signal);
    await uploadJson(plan, planStoragePath);
    const editorPlan = JSON.parse(JSON.stringify(plan));
    await database.ref(`studioProjects/${job.uid}/${job.projectId}`).update({ directorResult, editorPlan });
    await updateJob(job.uid, job.jobId, { stage: "render", status: "rendering", progress: 50, message: plan.planner?.type === "semantic-ai" ? "Direção por IA concluída. Renderizando as cenas selecionadas." : plan.planner?.fallback ? `${plan.aiDirector?.reason || "A IA não pôde ser aplicada"} Renderizando com a montagem técnica local.` : "Plano técnico concluído. Renderizando cenas.", plan: { storagePath: planStoragePath, planner: plan.planner }, editorPlan, director: directorResult });
    const approvedTranscription = project.captionsEnabled && job.transcriptReview?.status === "approved"
      ? prepareReviewedTranscription(job.transcriptReview, project.duration)
      : null;
    const transcriptionProvider = project.captionsEnabled && !approvedTranscription ? await createTranscriptionProvider() : null;
    const rendered = await renderPlan({
      plan, sources: analyzed, outputDir, logoPath: logo?.localPath || "", musicPath, soundEffectsPath,
      speechProvider: plan.narration?.enabled ? createSpeechProvider() : null,
      renderProfile: job.mode === "preview" ? "preview" : "final",
      transcriptionProvider,
      approvedTranscription,
      pauseForTranscriptReview: project.captions?.reviewBeforeRender === true && !approvedTranscription,
      signal: cancellation.signal,
      progress: async (stage, done, total) => {
        const transcriptionStage = stage === "transcription" || stage === "transcription_review";
        const base = stage === "segments" ? 50 : stage === "transitions" ? 76 : transcriptionStage ? 85 : stage === "narration" ? 91 : 94;
        const span = stage === "segments" ? 25 : stage === "transitions" ? 8 : transcriptionStage ? 6 : stage === "narration" ? 3 : 3;
        const message = stage === "segments" ? `Renderizando cena ${done} de ${total}.` : stage === "transitions" ? "Aplicando transições." : stage === "transcription_review" ? "Preparando a transcrição para sua revisão." : stage === "transcription" ? "Transcrevendo a fala em português para gerar legendas." : stage === "narration" ? "Gerando a narração por inteligência artificial." : "Aplicando identidade visual, legendas e áudio.";
        await updateJob(job.uid, job.jobId, { stage: transcriptionStage ? stage : "render", status: "rendering", progress: Math.min(97, base + Math.round(done / total * span)), message });
      }
    });
    await uploadJson(rendered.plan, planStoragePath);
    if (rendered.reviewRequired) {
      const reviewAt = Date.now();
      await database.ref().update({
        [`studioJobs/${job.uid}/${job.jobId}/status`]: "awaiting_review",
        [`studioJobs/${job.uid}/${job.jobId}/stage`]: "transcription_review",
        [`studioJobs/${job.uid}/${job.jobId}/progress`]: 88,
        [`studioJobs/${job.uid}/${job.jobId}/message`]: "Revise a transcrição antes da renderização final.",
        [`studioJobs/${job.uid}/${job.jobId}/transcriptReview`]: { ...rendered.transcription, status: "pending", createdAt: reviewAt },
        [`studioJobs/${job.uid}/${job.jobId}/updatedAt`]: reviewAt,
        [`studioProjects/${job.uid}/${job.projectId}/status`]: "awaiting_review",
        [`studioProjects/${job.uid}/${job.projectId}/updatedAt`]: reviewAt,
        [`studioUsage/${job.uid}/estimates/${job.jobId}/status`]: "awaiting_review"
      });
      return;
    }
    const outputPath = rendered.outputPath;
    ensureNotCancelled();
    await updateJob(job.uid, job.jobId, { stage: "upload_output", status: "rendering", progress: 98, message: "Salvando o MP4 final." });
    const storagePath = job.mode === "preview"
      ? `studio/${job.uid}/renders/${job.projectId}/previews/${job.jobId}.mp4`
      : `studio/${job.uid}/renders/${job.projectId}/${job.jobId}.mp4`;
    const output = await uploadRender(outputPath, storagePath);
    ensureNotCancelled();
    const elapsedSeconds = Math.round((Date.now() - started) / 1000);
    const renderedEditorPlan = JSON.parse(JSON.stringify(rendered.plan));
    const cost = { elapsedSeconds, outputBytes: output.size, inputFiles: sources.length, processingUnits: job.costEstimate?.processingUnits || 0, estimatedCredits: job.costEstimate?.estimatedCredits || 0, aiProvider: plan.planner?.type === "semantic-ai" ? plan.planner.provider : "none", aiModel: plan.planner?.type === "semantic-ai" ? plan.planner.model : "none", aiUsage: plan.aiDirector?.usage || null, aiEstimatedCostUsd: Number(plan.aiDirector?.estimatedCostUsd || 0), narrationUsed: plan.narration?.rendered === true, narrationProvider: plan.narration?.provider || "none", narrationModel: plan.narration?.model || "none", narrationVoice: plan.narration?.voice || "", narrationCharacters: Number(plan.narration?.characters || 0), narrationDurationSeconds: Number(plan.narration?.durationSeconds || 0), narrationTimelineDurationSeconds: Number(plan.narration?.timelineDurationSeconds || 0), narrationEstimatedCostUsd: Number(plan.narration?.estimatedCostUsd || 0), workerId: workerConfig.workerId, createdAt: Date.now() };
    const updates = {};
    updates[`studioJobs/${job.uid}/${job.jobId}/status`] = "completed";
    updates[`studioJobs/${job.uid}/${job.jobId}/stage`] = "complete";
    updates[`studioJobs/${job.uid}/${job.jobId}/progress`] = 100;
    updates[`studioJobs/${job.uid}/${job.jobId}/message`] = "Vídeo concluído.";
    updates[`studioJobs/${job.uid}/${job.jobId}/output`] = output;
    updates[`studioJobs/${job.uid}/${job.jobId}/editorPlan`] = renderedEditorPlan;
    updates[`studioJobs/${job.uid}/${job.jobId}/completedAt`] = Date.now();
    updates[`studioJobs/${job.uid}/${job.jobId}/updatedAt`] = Date.now();
    updates[`studioProjects/${job.uid}/${job.projectId}/status`] = "completed";
    updates[`studioProjects/${job.uid}/${job.projectId}/editorPlan`] = renderedEditorPlan;
    if (job.mode === "preview") updates[`studioProjects/${job.uid}/${job.projectId}/preview`] = output;
    else updates[`studioProjects/${job.uid}/${job.projectId}/output`] = output;
    updates[`studioProjects/${job.uid}/${job.projectId}/updatedAt`] = Date.now();
    if (job.mode !== "preview") {
      const versionId = job.versionId || job.jobId;
      const versionNumber = Math.max(1, Number(job.versionNumber || project.versionCounter || 0) + (job.versionNumber ? 0 : 1));
      updates[`studioProjects/${job.uid}/${job.projectId}/versionCounter`] = versionNumber;
      updates[`studioProjects/${job.uid}/${job.projectId}/versions/${versionId}`] = {
        id: versionId,
        number: versionNumber,
        jobId: job.jobId,
        output,
        planStoragePath,
        editorPlan: renderedEditorPlan,
        source: job.planOverride ? "visual-editor" : "automatic",
        summary: {
          schemaVersion: Number(plan.schemaVersion || 1),
          duration: Number(plan.duration || 0),
          format: plan.format || project.format || "9:16",
          sceneCount: Array.isArray(plan.scenes) ? plan.scenes.length : 0,
          title: String(plan.text?.title || "").slice(0, 160),
          export: {
            fps: Number(plan.export?.fps || 30),
            quality: plan.export?.quality || "balanced",
            videoBitrateKbps: Number(plan.export?.videoBitrateKbps || 8000)
          }
        },
        createdAt: job.createdAt || Date.now(),
        completedAt: Date.now()
      };
    }
    updates[`studioUsage/${job.uid}/estimates/${job.jobId}/status`] = "consumed";
    updates[`studioUsage/${job.uid}/estimates/${job.jobId}/completedAt`] = Date.now();
    updates[`studioCreditLedger/${job.uid}/${job.jobId}`] = { type: job.mode === "preview" ? "preview" : "processing", amount: 0, estimatedCredits: cost.estimatedCredits, processingUnits: cost.processingUnits, aiUsed: cost.aiProvider !== "none", aiProvider: cost.aiProvider, aiModel: cost.aiModel, aiEstimatedCostUsd: cost.aiEstimatedCostUsd, aiTokens: Number(cost.aiUsage?.total_tokens || 0), narrationUsed: cost.narrationUsed, narrationProvider: cost.narrationProvider, narrationModel: cost.narrationModel, narrationVoice: cost.narrationVoice, narrationCharacters: cost.narrationCharacters, narrationDurationSeconds: cost.narrationDurationSeconds, narrationTimelineDurationSeconds: cost.narrationTimelineDurationSeconds, narrationEstimatedCostUsd: cost.narrationEstimatedCostUsd, elapsedSeconds: cost.elapsedSeconds, projectId: job.projectId, jobId: job.jobId, description: job.mode === "preview" ? "Prévia reduzida sem cobrança" : "Processamento do MVP sem cobrança", createdAt: Date.now() };
    updates[`studioAdminCosts/${job.jobId}`] = { uid: job.uid, projectId: job.projectId, ...cost };
    await database.ref().update(updates);
  } catch (error) {
    console.error(`[${job.jobId}]`, error);
    if (error?.code === "studio_cancelled" || cancellation.signal.aborted) {
      const cancelledAt = Date.now();
      await database.ref().update({
        [`studioJobs/${job.uid}/${job.jobId}/status`]: "cancelled",
        [`studioJobs/${job.uid}/${job.jobId}/stage`]: "cancelled",
        [`studioJobs/${job.uid}/${job.jobId}/message`]: "Criação cancelada pelo usuário.",
        [`studioJobs/${job.uid}/${job.jobId}/cancelledAt`]: cancelledAt,
        [`studioJobs/${job.uid}/${job.jobId}/updatedAt`]: cancelledAt,
        [`studioProjects/${job.uid}/${job.projectId}/status`]: job.mode === "preview" ? "completed" : "cancelled",
        [`studioProjects/${job.uid}/${job.projectId}/updatedAt`]: cancelledAt,
        [`studioUsage/${job.uid}/estimates/${job.jobId}/status`]: "cancelled"
      });
      return;
    }
    const errorMessage = error?.signal === "SIGKILL" ? "O renderizador excedeu a memória disponível. Reduza a duração ou tente novamente após atualizar o worker." : String(error?.message || error).slice(0, 500);
    await updateJob(job.uid, job.jobId, { status: "failed", stage: "failed", progress: 100, message: "Falha no processamento.", failedAt: Date.now(), error: { code: "worker_error", message: errorMessage } });
    if (job.mode === "delete") {
      const remainingProject = await database.ref(`studioProjects/${job.uid}/${job.projectId}`).get();
      if (remainingProject.exists()) await database.ref(`studioProjects/${job.uid}/${job.projectId}`).update({ status: "failed", updatedAt: Date.now(), error: { code: "worker_error", message: errorMessage } });
      return;
    }
    await database.ref(`studioProjects/${job.uid}/${job.projectId}`).update(job.mode === "preview"
      ? { status: "completed", updatedAt: Date.now(), previewError: { code: "worker_error", message: errorMessage } }
      : { status: "failed", updatedAt: Date.now(), error: { code: "worker_error", message: errorMessage } });
  } finally {
    jobRef.off("value", cancellationListener);
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}

async function loop() {
  await fs.mkdir(workerConfig.workRoot, { recursive: true });
  console.log(`Olá Studio worker ${workerConfig.workerId} iniciado.`);
  await wait(workerConfig.startupDelayMs);
  for (;;) {
    try {
      const candidate = await nextQueuedJob();
      if (!candidate) { await wait(workerConfig.pollIntervalMs); continue; }
      const job = await claimJob(candidate);
      if (job) await processJob(job);
    } catch (error) {
      console.error("Falha no ciclo do worker:", error);
      await wait(workerConfig.pollIntervalMs);
    }
  }
}

loop().catch((error) => { console.error(error); process.exitCode = 1; });
