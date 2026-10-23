import crypto from "node:crypto";
import { firebaseApp } from "./firebase-client.mjs";
import { workerConfig } from "./config.mjs";
import { withTimeout } from "./process-utils.mjs";

const queueUrl = (path) => `${workerConfig.databaseURL.replace(/\/$/, "")}/${path}.json`;

async function firebaseRequest(path, options = {}) {
  const token = await withTimeout(
    firebaseApp.options.credential.getAccessToken(),
    workerConfig.databaseTimeoutMs,
    "Autenticação da fila do Olá Studio"
  );
  return withTimeout(
    fetch(queueUrl(path), {
      ...options,
      headers: {
        Authorization: `Bearer ${token.access_token}`,
        "Content-Type": "application/json",
        ...(options.headers || {})
      }
    }),
    workerConfig.databaseTimeoutMs,
    "Acesso à fila do Olá Studio"
  );
}

export async function nextQueuedJob() {
  const response = await firebaseRequest("studioJobs");
  if (!response.ok) throw new Error(`Falha ao ler a fila do Olá Studio: HTTP ${response.status}.`);
  const root = await response.json() || {};
  const jobs = Object.entries(root).flatMap(([uid, items]) => Object.entries(items || {}).map(([jobId, job]) => ({ uid, jobId, ...job })));
  return jobs.filter((job) => job.status === "queued" && Number(job.attempt || 0) < workerConfig.maxAttempts).sort((a, b) => Number(a.createdAt || 0) - Number(b.createdAt || 0))[0] || null;
}

export async function claimJob(candidate) {
  const path = `studioJobs/${encodeURIComponent(candidate.uid)}/${encodeURIComponent(candidate.jobId)}`;
  const currentResponse = await firebaseRequest(path, { headers: { "X-Firebase-ETag": "true" } });
  if (!currentResponse.ok) throw new Error(`Falha ao reservar trabalho do Olá Studio: HTTP ${currentResponse.status}.`);
  const current = await currentResponse.json();
  if (!current || current.status !== "queued" || Number(current.attempt || 0) >= workerConfig.maxAttempts) return null;
  const claimedAt = Date.now();
  const claimedEventId = `${claimedAt}-${crypto.randomUUID().slice(0, 8)}`;
  const claimed = { ...current, status: "analyzing", stage: "probe", progress: 31, attempt: Number(current.attempt || 0) + 1, workerId: workerConfig.workerId, startedAt: claimedAt, updatedAt: claimedAt, message: "Lendo metadados dos arquivos.", events: { ...(current.events || {}), [claimedEventId]: { timestamp: claimedAt, stage: "probe", status: "analyzing", level: "info", code: "worker_claimed", message: "Worker iniciado. Lendo metadados dos arquivos." } } };
  const claimResponse = await firebaseRequest(path, {
    method: "PUT",
    headers: { "If-Match": currentResponse.headers.get("etag") || "null_etag" },
    body: JSON.stringify(claimed)
  });
  if (claimResponse.status === 412) return null;
  if (!claimResponse.ok) throw new Error(`Falha ao confirmar reserva do Olá Studio: HTTP ${claimResponse.status}.`);
  return { uid: candidate.uid, jobId: candidate.jobId, ...claimed };
}

export async function updateJob(uid, jobId, value) {
  const path = `studioJobs/${encodeURIComponent(uid)}/${encodeURIComponent(jobId)}`;
  const updatedAt = Date.now();
  const { event, ...jobValue } = value || {};
  const eventMessage = String(event?.message || jobValue.message || "").replace(/[\r\n]+/g, " ").trim().slice(0, 500);
  const patch = { ...jobValue, updatedAt };
  if (eventMessage) {
    const eventId = `${updatedAt}-${crypto.randomUUID().slice(0, 8)}`;
    const level = ["info", "success", "warning", "error"].includes(event?.level)
      ? event.level
      : jobValue.status === "failed" ? "error" : jobValue.status === "completed" ? "success" : "info";
    patch[`events/${eventId}`] = {
      timestamp: updatedAt,
      stage: String(event?.stage || jobValue.stage || "processing").slice(0, 40),
      status: String(event?.status || jobValue.status || "processing").slice(0, 40),
      level,
      code: String(event?.code || "progress_update").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80),
      message: eventMessage,
      ...(Array.isArray(event?.details) && event.details.length ? { details: event.details.map((detail) => String(detail || "").replace(/[\r\n]+/g, " ").trim().slice(0, 240)).filter(Boolean).slice(0, 8) } : {})
    };
  }
  const response = await firebaseRequest(path, { method: "PATCH", body: JSON.stringify(patch) });
  if (!response.ok) throw new Error(`Falha ao atualizar trabalho do Olá Studio: HTTP ${response.status}.`);
}
