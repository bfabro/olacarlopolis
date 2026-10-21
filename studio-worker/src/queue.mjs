import { database } from "./firebase-client.mjs";
import { workerConfig } from "./config.mjs";

export async function nextQueuedJob() {
  const snapshot = await database.ref("studioJobs").get();
  const root = snapshot.val() || {};
  const jobs = Object.entries(root).flatMap(([uid, items]) => Object.entries(items || {}).map(([jobId, job]) => ({ uid, jobId, ...job })));
  return jobs.filter((job) => job.status === "queued" && Number(job.attempt || 0) < workerConfig.maxAttempts).sort((a, b) => Number(a.createdAt || 0) - Number(b.createdAt || 0))[0] || null;
}

export async function claimJob(candidate) {
  const jobRef = database.ref(`studioJobs/${candidate.uid}/${candidate.jobId}`);
  const result = await jobRef.transaction((job) => {
    if (!job || job.status !== "queued" || Number(job.attempt || 0) >= workerConfig.maxAttempts) return;
    return { ...job, status: "analyzing", stage: "probe", progress: 31, attempt: Number(job.attempt || 0) + 1, workerId: workerConfig.workerId, startedAt: Date.now(), updatedAt: Date.now(), message: "Lendo metadados dos arquivos." };
  });
  return result.committed ? { uid: candidate.uid, jobId: candidate.jobId, ...result.snapshot.val() } : null;
}

export function updateJob(uid, jobId, value) {
  return database.ref(`studioJobs/${uid}/${jobId}`).update({ ...value, updatedAt: Date.now() });
}
