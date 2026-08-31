import crypto from "node:crypto";

const DEFAULT_DATABASE_URL = "https://contadoracessos-default-rtdb.firebaseio.com";
const DEFAULT_FIREBASE_API_KEY = "AIzaSyDWHsZSHwVFpD88ChUywjw_GdZPifdrRGI";

export function env(name) {
  return globalThis.Netlify?.env?.get?.(name) || globalThis.process?.env?.[name] || "";
}

export function json(body, status = 200) {
  return { statusCode: status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" }, body: JSON.stringify(body) };
}

export function cleanText(value, max = 180) {
  return String(value || "").trim().slice(0, max);
}

export function safeTxid(value) {
  const txid = cleanText(value, 64).replace(/[^a-zA-Z0-9_-]/g, "");
  return txid.length >= 3 ? txid : "";
}

function databaseSettings() {
  const databaseUrl = (env("FIREBASE_DATABASE_URL") || DEFAULT_DATABASE_URL).replace(/\/$/, "");
  const databaseAuth = env("FIREBASE_DATABASE_AUTH");
  if (!databaseAuth) throw new Error("FIREBASE_DATABASE_AUTH nao configurado no servidor.");
  return { databaseUrl, databaseAuth };
}

export async function firebaseJson(path, options = {}) {
  const settings = databaseSettings();
  const url = settings.databaseUrl + "/" + path + ".json?auth=" + encodeURIComponent(settings.databaseAuth);
  const response = await fetch(url, { ...options, cache: "no-store", headers: { "content-type": "application/json", ...(options.headers || {}) } });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error("Firebase respondeu HTTP " + response.status + (detail ? ": " + detail.slice(0, 180) : "") + ".");
  }
  if (response.status === 204) return null;
  return response.json();
}

export async function authenticate(event, { master = false } = {}) {
  const authorization = String(event.headers?.authorization || event.headers?.Authorization || "");
  const idToken = authorization.replace(/^Bearer\s+/i, "").trim();
  if (!idToken) throw Object.assign(new Error("Sessao administrativa nao informada."), { status: 401 });
  const apiKey = env("FIREBASE_WEB_API_KEY") || DEFAULT_FIREBASE_API_KEY;
  const lookup = await fetch("https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=" + encodeURIComponent(apiKey), {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ idToken })
  });
  if (!lookup.ok) throw Object.assign(new Error("Sessao expirada ou invalida."), { status: 401 });
  const account = (await lookup.json())?.users?.[0];
  if (!account?.localId) throw Object.assign(new Error("Usuario nao identificado."), { status: 401 });
  const profile = await firebaseJson("usuariosByUid/" + account.localId);
  if (!profile || profile.status === "inativo") throw Object.assign(new Error("Usuario sem acesso ao painel."), { status: 403 });
  if (master && profile.role !== "master") throw Object.assign(new Error("Somente o Admin Master pode realizar esta operacao."), { status: 403 });
  return { uid: account.localId, email: account.email || profile.email || "", profile };
}

function encryptionKey() {
  const seed = env("PAYMENT_ENCRYPTION_KEY") || env("FIREBASE_DATABASE_AUTH");
  if (!seed) throw new Error("Chave de criptografia da integracao nao configurada.");
  return crypto.createHash("sha256").update(seed).digest();
}

function encryptSecrets(value = {}) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return { version: 1, iv: iv.toString("base64"), tag: cipher.getAuthTag().toString("base64"), data: ciphertext.toString("base64") };
}

function decryptSecrets(envelope) {
  if (!envelope?.iv || !envelope?.tag || !envelope?.data) return {};
  const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(envelope.iv, "base64"));
  decipher.setAuthTag(Buffer.from(envelope.tag, "base64"));
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(envelope.data, "base64")), decipher.final()]).toString("utf8"));
}

export async function readIntegrationConfig() {
  const stored = await firebaseJson("integracoesPagamento/configuracao");
  if (!stored) return { public: {}, secrets: {} };
  return { public: stored.public || {}, secrets: decryptSecrets(stored.secure) };
}

export function publicIntegrationConfig(config = {}, secrets = {}) {
  return { ...config, accessTokenConfigured: Boolean(secrets.accessToken), webhookSecretConfigured: Boolean(secrets.webhookSecret), updatedAt: Number(config.updatedAt || 0) };
}

export async function saveIntegrationConfig(publicConfig, incomingSecrets = {}, actor = {}) {
  const existing = await readIntegrationConfig();
  const secrets = { ...existing.secrets };
  for (const key of ["accessToken", "webhookSecret"]) {
    const value = cleanText(incomingSecrets[key], 600);
    if (value) secrets[key] = value;
  }
  if (incomingSecrets.clearAccessToken === true) delete secrets.accessToken;
  if (incomingSecrets.clearWebhookSecret === true) delete secrets.webhookSecret;
  const storedPublic = {
    enabled: publicConfig.enabled === true,
    provider: ["mercadopago", "asaas", "generic"].includes(publicConfig.provider) ? publicConfig.provider : "generic",
    environment: publicConfig.environment === "sandbox" ? "sandbox" : "production",
    webhookTokenHeader: cleanText(publicConfig.webhookTokenHeader, 80).toLowerCase() || "x-payment-token",
    txidField: cleanText(publicConfig.txidField, 120) || "txid",
    statusField: cleanText(publicConfig.statusField, 120) || "status",
    transactionIdField: cleanText(publicConfig.transactionIdField, 120) || "transactionId",
    amountField: cleanText(publicConfig.amountField, 120) || "amount",
    paidStatuses: cleanText(publicConfig.paidStatuses, 240) || "paid,approved,confirmed,received",
    updatedAt: Date.now(), updatedBy: actor.uid || ""
  };
  await firebaseJson("integracoesPagamento/configuracao", { method: "PUT", body: JSON.stringify({ public: storedPublic, secure: encryptSecrets(secrets) }) });
  return publicIntegrationConfig(storedPublic, secrets);
}

export function valueAt(source, path) {
  return cleanText(path, 120).split(".").filter(Boolean).reduce((value, key) => value?.[key], source);
}

export function normalizeAmount(value) {
  if (typeof value === "number") return Math.round(value * 100) / 100;
  const text = String(value || "").trim().replace(/\s/g, "");
  const normalized = text.includes(",") ? text.replace(/\./g, "").replace(",", ".") : text;
  const number = Number(normalized.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(number) ? Math.round(number * 100) / 100 : 0;
}

export async function recordCharge(charge = {}) {
  const txid = safeTxid(charge.txid);
  if (!txid) throw new Error("txid da cobranca invalido.");
  const existing = await firebaseJson("pagamentosIntegracao/cobrancas/" + txid);
  const payload = {
    ...(existing || {}), txid,
    clientId: cleanText(charge.clientId, 90), clientName: cleanText(charge.clientName, 140),
    months: Array.isArray(charge.months) ? charge.months.map((item) => cleanText(item, 20)).filter(Boolean).slice(0, 12) : [],
    planType: cleanText(charge.planType, 30), amount: normalizeAmount(charge.amount), provider: cleanText(charge.provider, 30),
    providerPaymentId: cleanText(charge.providerPaymentId, 120), status: cleanText(charge.status, 40) || existing?.status || "pending",
    createdAt: Number(existing?.createdAt || Date.now()), updatedAt: Date.now()
  };
  await firebaseJson("pagamentosIntegracao/cobrancas/" + txid, { method: "PUT", body: JSON.stringify(payload) });
  return payload;
}

export async function registerEvent(eventData = {}) {
  const id = Date.now() + "_" + crypto.randomBytes(5).toString("hex");
  await firebaseJson("pagamentosIntegracao/eventos/" + id, { method: "PUT", body: JSON.stringify({ ...eventData, createdAt: Date.now() }) });
  return id;
}

export async function confirmChargePaid(charge, payment = {}) {
  const txid = safeTxid(charge?.txid);
  const clientId = cleanText(charge?.clientId, 90);
  if (!txid || !clientId) throw new Error("Cobranca sem cliente vinculado.");
  const amount = normalizeAmount(payment.amount || charge.amount);
  if (charge.amount > 0 && amount > 0 && Math.abs(charge.amount - amount) > 0.01) {
    throw new Error("Valor recebido diferente do valor da cobranca.");
  }
  const paidAt = Number(payment.paidAt || Date.now());
  const finance = await firebaseJson("clientesFinanceiro/" + clientId) || {};
  const paidMonths = Array.isArray(charge.months) && charge.months.length ? charge.months : [new Date().toISOString().slice(0, 7)];
  const currentOpen = Array.isArray(finance.mesesEmAberto) ? finance.mesesEmAberto : [];
  const remainingOpen = currentOpen.filter((month) => !paidMonths.includes(month));
  const rootUpdates = {
    ["pagamentosIntegracao/cobrancas/" + txid + "/status"]: "paid",
    ["pagamentosIntegracao/cobrancas/" + txid + "/paidAt"]: paidAt,
    ["pagamentosIntegracao/cobrancas/" + txid + "/providerPaymentId"]: cleanText(payment.providerPaymentId, 120),
    ["pagamentosIntegracao/cobrancas/" + txid + "/updatedAt"]: Date.now(),
    ["clientesFinanceiro/" + clientId + "/pagamentoStatus"]: remainingOpen.length ? "em_aberto" : "pago",
    ["clientesFinanceiro/" + clientId + "/mesesEmAberto"]: remainingOpen,
    ["clientesFinanceiro/" + clientId + "/competenciaPagamento"]: paidMonths[paidMonths.length - 1],
    ["clientesFinanceiro/" + clientId + "/ultimoPagamentoMes"]: paidMonths[paidMonths.length - 1],
    ["clientesFinanceiro/" + clientId + "/updatedAt"]: Date.now(),
    ["clientesFinanceiro/" + clientId + "/updatedBy"]: "integracao_pagamento",
    ["clientesFinanceiro/" + clientId + "/origem"]: "webhook"
  };
  paidMonths.forEach((month) => {
    const base = "clientesFinanceiro/" + clientId + "/faturas/" + month;
    const invoiceValue = normalizeAmount(finance.faturas?.[month]?.valorTotal) || Math.round((amount / paidMonths.length) * 100) / 100;
    rootUpdates[base + "/mes"] = month;
    rootUpdates[base + "/status"] = "pago";
    rootUpdates[base + "/valorTotal"] = invoiceValue;
    rootUpdates[base + "/pagoEm"] = paidAt;
    rootUpdates[base + "/txid"] = txid;
    rootUpdates[base + "/providerPaymentId"] = cleanText(payment.providerPaymentId, 120);
    rootUpdates[base + "/updatedAt"] = Date.now();
  });
  if (finance.solicitacaoPlano?.status && finance.solicitacaoPlano.status !== "pago") {
    const planBase = "clientesFinanceiro/" + clientId;
    rootUpdates[planBase + "/solicitacaoPlano/status"] = "pago";
    rootUpdates[planBase + "/solicitacaoPlano/pagoEm"] = paidAt;
    rootUpdates[planBase + "/solicitacaoPlano/confirmadoPor"] = "integracao_pagamento";
    if (finance.solicitacaoPlano.tipoPlano) rootUpdates[planBase + "/tipoPlano"] = finance.solicitacaoPlano.tipoPlano;
    if (finance.solicitacaoPlano.valorPlano) rootUpdates[planBase + "/valorPlano"] = finance.solicitacaoPlano.valorPlano;
  }
  await firebaseJson("", { method: "PATCH", body: JSON.stringify(rootUpdates) });
  return { clientId, txid, paidMonths, amount, paidAt };
}

export function constantTimeEqual(left, right) {
  const a = Buffer.from(String(left || ""));
  const b = Buffer.from(String(right || ""));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
