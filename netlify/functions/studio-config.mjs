import { authenticate, firebaseJson, json } from "./_payment-core.mjs";

const LIMITS = {
  maxFiles: 10,
  maxVideoBytes: 250 * 1024 * 1024,
  maxImageBytes: 20 * 1024 * 1024,
  maxProjectBytes: 1024 * 1024 * 1024,
  maxOutputDurationSeconds: 90,
  retentionDays: 30,
  maxConcurrentJobsPerUser: 1
};

export default async (event) => {
  if (event.httpMethod !== "GET") return json({ error: "Metodo nao permitido." }, 405);
  try {
    const actor = await authenticate(event, { master: true });
    const flags = await firebaseJson("studioFeatureFlags") || {};
    return json({
      enabled: flags.enabled === true,
      environment: flags.environment || "development",
      billingEnabled: false,
      semanticAiEnabled: flags.semanticAiEnabled === true,
      limits: LIMITS,
      actor: { uid: actor.uid, role: actor.profile.role }
    });
  } catch (error) {
    return json({ error: error.message || "Falha ao consultar o Olá Studio." }, Number(error.status || 500));
  }
};
