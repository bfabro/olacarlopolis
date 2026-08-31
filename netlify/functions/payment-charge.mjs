import crypto from "node:crypto";
import {
  authenticate, cleanText, json, normalizeAmount, readIntegrationConfig,
  recordCharge, safeTxid, firebaseJson
} from "./_payment-core.mjs";

function parseBody(event) {
  try { return JSON.parse(event.body || "{}"); } catch { return {}; }
}

function webhookUrl(event) {
  const host = event.headers?.["x-forwarded-host"] || event.headers?.host || "";
  const protocol = event.headers?.["x-forwarded-proto"] || "https";
  return host ? protocol + "://" + host + "/api/payment-webhook" : "";
}

function asaasBase(environment) {
  return environment === "sandbox" ? "https://api-sandbox.asaas.com" : "https://api.asaas.com";
}

async function createMercadoPagoCharge({ config, secrets, txid, amount, email, description, event }) {
  const response = await fetch("https://api.mercadopago.com/v1/payments", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: "Bearer " + secrets.accessToken,
      "x-idempotency-key": crypto.createHash("sha256").update(txid).digest("hex").slice(0, 32)
    },
    body: JSON.stringify({
      transaction_amount: amount,
      description,
      payment_method_id: "pix",
      external_reference: txid,
      notification_url: webhookUrl(event) || undefined,
      payer: { email }
    })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || data.cause?.[0]?.description || "Mercado Pago nao gerou a cobranca.");
  const transaction = data.point_of_interaction?.transaction_data || {};
  return {
    providerPaymentId: String(data.id || ""),
    pixCode: String(transaction.qr_code || ""),
    qrUrl: transaction.qr_code_base64 ? "data:image/png;base64," + transaction.qr_code_base64 : "",
    ticketUrl: String(transaction.ticket_url || "")
  };
}

async function asaasRequest(config, secrets, path, options = {}) {
  const response = await fetch(asaasBase(config.environment) + "/v3/" + path, {
    ...options,
    headers: { accept: "application/json", "content-type": "application/json", access_token: secrets.accessToken, ...(options.headers || {}) }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.errors?.[0]?.description || "Asaas recusou a operacao (HTTP " + response.status + ").");
  return data;
}

async function asaasCustomer(config, secrets, client, clientId, email) {
  const query = await asaasRequest(config, secrets, "customers?externalReference=" + encodeURIComponent(clientId) + "&limit=1");
  if (query.data?.[0]?.id) return query.data[0].id;
  const cpfCnpj = String(client.cnpj || client.cpfCnpj || client.cpf || "").replace(/\D/g, "");
  const payload = { name: cleanText(client.nome || client.name || clientId, 120), email: cleanText(client.email || email, 160), externalReference: clientId, notificationDisabled: true };
  if (cpfCnpj) payload.cpfCnpj = cpfCnpj;
  const created = await asaasRequest(config, secrets, "customers", { method: "POST", body: JSON.stringify(payload) });
  if (!created.id) throw new Error("Asaas nao retornou o identificador do cliente.");
  return created.id;
}

async function createAsaasCharge({ config, secrets, txid, amount, email, description, client, clientId }) {
  const customer = await asaasCustomer(config, secrets, client, clientId, email);
  const dueDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const payment = await asaasRequest(config, secrets, "payments", {
    method: "POST",
    body: JSON.stringify({ customer, billingType: "PIX", value: amount, dueDate, description, externalReference: txid })
  });
  const pix = await asaasRequest(config, secrets, "payments/" + encodeURIComponent(payment.id) + "/pixQrCode");
  return {
    providerPaymentId: String(payment.id || ""),
    pixCode: String(pix.payload || pix.encodedImage || ""),
    qrUrl: pix.encodedImage ? "data:image/png;base64," + pix.encodedImage : "",
    ticketUrl: String(payment.invoiceUrl || "")
  };
}

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") return json({}, 204);
  if (event.httpMethod !== "POST") return json({ success: false, message: "Metodo nao permitido." }, 405);
  try {
    const actor = await authenticate(event);
    const body = parseBody(event);
    const txid = safeTxid(body.txid);
    const clientId = cleanText(body.clientId, 90);
    const amount = normalizeAmount(body.amount);
    const months = Array.isArray(body.months) ? body.months.map((item) => cleanText(item, 20)).filter((item) => /^\d{4}-\d{2}$/.test(item)).slice(0, 12) : [];
    if (!txid || !clientId || amount <= 0 || !months.length) throw Object.assign(new Error("Dados da cobranca incompletos."), { status: 400 });
    const canManage = actor.profile.role === "master" || actor.profile.role === "admin";
    if (!canManage && actor.profile.clienteId !== clientId) throw Object.assign(new Error("Cliente nao autorizado para esta cobranca."), { status: 403 });
    const client = await firebaseJson("clientes/" + clientId);
    if (!client) throw Object.assign(new Error("Cliente nao encontrado."), { status: 404 });
    const stored = await readIntegrationConfig();
    if (!stored.public.enabled) return json({ success: true, mode: "static", integrationEnabled: false });
    const provider = stored.public.provider || "generic";
    const email = cleanText(client.email || actor.email, 160);
    const description = "Plano Ola Carlopolis - " + months.join(", ");
    let generated = { providerPaymentId: "", pixCode: "", qrUrl: "", ticketUrl: "" };
    if (provider === "mercadopago") {
      if (!stored.secrets.accessToken) throw new Error("Token do Mercado Pago nao configurado.");
      if (!email) throw new Error("O cliente precisa ter um email para gerar o Pix no Mercado Pago.");
      generated = await createMercadoPagoCharge({ config: stored.public, secrets: stored.secrets, txid, amount, email, description, event });
    } else if (provider === "asaas") {
      if (!stored.secrets.accessToken) throw new Error("Token do Asaas nao configurado.");
      generated = await createAsaasCharge({ config: stored.public, secrets: stored.secrets, txid, amount, email, description, client, clientId });
    }
    await recordCharge({
      txid, clientId, clientName: client.nome || client.name || clientId, months,
      planType: body.planType, amount, provider, providerPaymentId: generated.providerPaymentId, status: "pending"
    });
    return json({ success: true, mode: generated.pixCode ? "dynamic" : "static", integrationEnabled: true, provider, ...generated });
  } catch (error) {
    console.error("Falha ao gerar cobranca integrada.", error);
    return json({ success: false, message: error.message || "Nao foi possivel gerar a cobranca integrada." }, error.status || 500);
  }
}
