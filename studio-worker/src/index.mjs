import fs from "node:fs/promises";
import path from "node:path";
import { workerConfig } from "./config.mjs";
import { database } from "./firebase-client.mjs";
import { nextQueuedJob, claimJob, updateJob } from "./queue.mjs";
import { downloadAsset, uploadJson, uploadRender } from "./storage.mjs";
import { analyzeSources } from "./analyzer.mjs";
import { createTranscriptionProvider } from "./transcription.mjs";
import { createDeterministicPlan } from "./planner.mjs";
import { renderPlan } from "./renderer.mjs";

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

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
    ensureNotCancelled();
    const analyzed = await analyzeSources(sources, async (done, total) => updateJob(job.uid, job.jobId, { stage: "analysis", status: "analyzing", progress: 32 + Math.round(done / total * 16), message: `Analisando arquivo ${done} de ${total}.` }), cancellation.signal);
    const totalSourceDuration = analyzed.reduce((sum, source) => sum + (source.contentType.startsWith("video/") ? Number(source.metadata.duration || 0) : 0), 0);
    if (sources.length > 10) throw new Error("O projeto excede o limite de 10 arquivos.");
    if (totalSourceDuration > 600) throw new Error("A duração total dos vídeos de origem excede 10 minutos.");
    const transcription = project.captionsEnabled ? await createTranscriptionProvider().transcribe(analyzed) : { available: false, provider: "disabled", segments: [] };
    ensureNotCancelled();
    const plan = createDeterministicPlan(project, analyzed, { transcription });
    const planStoragePath = `studio/${job.uid}/plans/${job.projectId}/${job.jobId}.json`;
    await uploadJson(plan, planStoragePath);
    await updateJob(job.uid, job.jobId, { stage: "render", status: "rendering", progress: 50, message: "Plano técnico concluído. Renderizando cenas.", plan: { storagePath: planStoragePath, planner: plan.planner } });
    const outputPath = await renderPlan({
      plan, sources: analyzed, outputDir, logoPath: logo?.localPath || "", musicPath: music?.localPath || "",
      signal: cancellation.signal,
      progress: async (stage, done, total) => {
        const base = stage === "segments" ? 50 : stage === "transitions" ? 82 : 90;
        const span = stage === "segments" ? 31 : stage === "transitions" ? 8 : 7;
        await updateJob(job.uid, job.jobId, { stage: "render", status: "rendering", progress: Math.min(97, base + Math.round(done / total * span)), message: stage === "segments" ? `Renderizando cena ${done} de ${total}.` : stage === "transitions" ? "Aplicando transições." : "Aplicando identidade visual e áudio." });
      }
    });
    ensureNotCancelled();
    await updateJob(job.uid, job.jobId, { stage: "upload_output", status: "rendering", progress: 98, message: "Salvando o MP4 final." });
    const storagePath = `studio/${job.uid}/renders/${job.projectId}/${job.jobId}.mp4`;
    const output = await uploadRender(outputPath, storagePath);
    ensureNotCancelled();
    const elapsedSeconds = Math.round((Date.now() - started) / 1000);
    const cost = { elapsedSeconds, outputBytes: output.size, inputFiles: sources.length, processingUnits: job.costEstimate?.processingUnits || 0, estimatedCredits: job.costEstimate?.estimatedCredits || 0, workerId: workerConfig.workerId, createdAt: Date.now() };
    const updates = {};
    updates[`studioJobs/${job.uid}/${job.jobId}/status`] = "completed";
    updates[`studioJobs/${job.uid}/${job.jobId}/stage`] = "complete";
    updates[`studioJobs/${job.uid}/${job.jobId}/progress`] = 100;
    updates[`studioJobs/${job.uid}/${job.jobId}/message`] = "Vídeo concluído.";
    updates[`studioJobs/${job.uid}/${job.jobId}/output`] = output;
    updates[`studioJobs/${job.uid}/${job.jobId}/completedAt`] = Date.now();
    updates[`studioJobs/${job.uid}/${job.jobId}/updatedAt`] = Date.now();
    updates[`studioProjects/${job.uid}/${job.projectId}/status`] = "completed";
    updates[`studioProjects/${job.uid}/${job.projectId}/output`] = output;
    updates[`studioProjects/${job.uid}/${job.projectId}/updatedAt`] = Date.now();
    updates[`studioUsage/${job.uid}/estimates/${job.jobId}/status`] = "consumed";
    updates[`studioUsage/${job.uid}/estimates/${job.jobId}/completedAt`] = Date.now();
    updates[`studioCreditLedger/${job.uid}/${job.jobId}`] = { type: "processing", amount: 0, estimatedCredits: cost.estimatedCredits, projectId: job.projectId, jobId: job.jobId, description: "Processamento do MVP sem cobrança", createdAt: Date.now() };
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
        [`studioProjects/${job.uid}/${job.projectId}/status`]: "cancelled",
        [`studioProjects/${job.uid}/${job.projectId}/updatedAt`]: cancelledAt,
        [`studioUsage/${job.uid}/estimates/${job.jobId}/status`]: "cancelled"
      });
      return;
    }
    const errorMessage = error?.signal === "SIGKILL" ? "O renderizador excedeu a memória disponível. Reduza a duração ou tente novamente após atualizar o worker." : String(error?.message || error).slice(0, 500);
    await updateJob(job.uid, job.jobId, { status: "failed", stage: "failed", progress: 100, message: "Falha no processamento.", failedAt: Date.now(), error: { code: "worker_error", message: errorMessage } });
    await database.ref(`studioProjects/${job.uid}/${job.projectId}`).update({ status: "failed", updatedAt: Date.now(), error: { code: "worker_error", message: errorMessage } });
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
