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
  const claimed = { ...current, status: "analyzing", stage: "probe", progress: 31, attempt: Number(current.attempt || 0) + 1, workerId: workerConfig.workerId, startedAt: Date.now(), updatedAt: Date.now(), message: "Lendo metadados dos arquivos." };
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
  const response = await firebaseRequest(path, { method: "PATCH", body: JSON.stringify({ ...value, updatedAt: Date.now() }) });
  if (!response.ok) throw new Error(`Falha ao atualizar trabalho do Olá Studio: HTTP ${response.status}.`);
}
