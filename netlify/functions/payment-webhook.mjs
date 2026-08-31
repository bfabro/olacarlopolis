import {
  cleanText, confirmChargePaid, constantTimeEqual, firebaseJson, json,
  normalizeAmount, readIntegrationConfig, registerEvent, safeTxid, valueAt
} from "./_payment-core.mjs";

function parseBody(event) {
  try { return JSON.parse(event.body || "{}"); } catch { return {}; }
}

async function mercadoPagoPayment(body, secrets) {
  const paymentId = cleanText(body.data?.id || body.id || body.resource?.split("/").pop(), 120);
  if (!paymentId) throw new Error("Notificacao do Mercado Pago sem ID do pagamento.");
  const response = await fetch("https://api.mercadopago.com/v1/payments/" + encodeURIComponent(paymentId), {
    headers: { accept: "application/json", authorization: "Bearer " + secrets.accessToken }, cache: "no-store"
  });
  const payment = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error("Mercado Pago nao confirmou o evento (HTTP " + response.status + ").");
  return {
    providerPaymentId: String(payment.id || paymentId),
    txid: safeTxid(payment.external_reference),
    status: String(payment.status || "").toLowerCase(),
    amount: normalizeAmount(payment.transaction_amount),
    paidAt: Date.parse(payment.date_approved || payment.date_last_updated || "") || Date.now(),
    paid: payment.status === "approved"
  };
}

async function asaasPayment(event, body, config, secrets) {
  const tokenHeader = "asaas-access-token";
  const receivedToken = event.headers?.[tokenHeader] || event.headers?.[tokenHeader.toLowerCase()] || "";
  if (!secrets.webhookSecret || !constantTimeEqual(receivedToken, secrets.webhookSecret)) throw Object.assign(new Error("Token do webhook Asaas invalido."), { status: 401 });
  const paymentId = cleanText(body.payment?.id, 120);
  if (!paymentId) throw new Error("Notificacao Asaas sem ID do pagamento.");
  const base = config.environment === "sandbox" ? "https://api-sandbox.asaas.com" : "https://api.asaas.com";
  const response = await fetch(base + "/v3/payments/" + encodeURIComponent(paymentId), {
    headers: { accept: "application/json", access_token: secrets.accessToken }, cache: "no-store"
  });
  const payment = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error("Asaas nao confirmou o evento (HTTP " + response.status + ").");
  const status = String(payment.status || "").toUpperCase();
  return {
    providerPaymentId: String(payment.id || paymentId),
    txid: safeTxid(payment.externalReference),
    status,
    amount: normalizeAmount(payment.value || payment.netValue),
    paidAt: Date.parse(payment.paymentDate || payment.confirmedDate || "") || Date.now(),
    paid: ["CONFIRMED", "RECEIVED", "RECEIVED_IN_CASH"].includes(status)
  };
}

function genericPayment(event, body, config, secrets) {
  const headerName = config.webhookTokenHeader || "x-payment-token";
  const receivedToken = event.headers?.[headerName] || event.headers?.[headerName.toLowerCase()] || "";
  if (!secrets.webhookSecret || !constantTimeEqual(receivedToken, secrets.webhookSecret)) throw Object.assign(new Error("Token do webhook personalizado invalido."), { status: 401 });
  const status = cleanText(valueAt(body, config.statusField || "status"), 80).toLowerCase();
  const paidStatuses = String(config.paidStatuses || "paid,approved,confirmed,received").split(",").map((item) => item.trim().toLowerCase()).filter(Boolean);
  return {
    providerPaymentId: cleanText(valueAt(body, config.transactionIdField || "transactionId"), 120),
    txid: safeTxid(valueAt(body, config.txidField || "txid")),
    status,
    amount: normalizeAmount(valueAt(body, config.amountField || "amount")),
    paidAt: Date.parse(valueAt(body, "paidAt") || "") || Date.now(),
    paid: paidStatuses.includes(status)
  };
}

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") return json({}, 204);
  if (event.httpMethod !== "POST") return json({ success: false, message: "Metodo nao permitido." }, 405);
  let provider = "";
  try {
    const body = parseBody(event);
    const stored = await readIntegrationConfig();
    if (!stored.public.enabled) return json({ success: false, message: "Integracao desativada." }, 503);
    provider = stored.public.provider || "generic";
    let payment;
    if (provider === "mercadopago") payment = await mercadoPagoPayment(body, stored.secrets);
    else if (provider === "asaas") payment = await asaasPayment(event, body, stored.public, stored.secrets);
    else payment = genericPayment(event, body, stored.public, stored.secrets);
    if (!payment.txid) throw new Error("Pagamento sem txid ou referencia externa.");
    const charge = await firebaseJson("pagamentosIntegracao/cobrancas/" + payment.txid);
    if (!charge) {
      await registerEvent({ provider, status: "unmatched", txid: payment.txid, providerPaymentId: payment.providerPaymentId, providerStatus: payment.status, message: "Cobranca nao localizada." });
      return json({ success: true, matched: false });
    }
    if (!payment.paid) {
      await firebaseJson("pagamentosIntegracao/cobrancas/" + payment.txid, {
        method: "PATCH", body: JSON.stringify({ providerStatus: payment.status, providerPaymentId: payment.providerPaymentId, updatedAt: Date.now() })
      });
      await registerEvent({ provider, status: "received", txid: payment.txid, clientId: charge.clientId, providerPaymentId: payment.providerPaymentId, providerStatus: payment.status });
      return json({ success: true, paid: false });
    }
    const result = await confirmChargePaid(charge, payment);
    await registerEvent({ provider, status: "paid", txid: payment.txid, clientId: result.clientId, clientName: charge.clientName || "", amount: result.amount, providerPaymentId: payment.providerPaymentId, providerStatus: payment.status, paidAt: result.paidAt });
    return json({ success: true, paid: true, txid: payment.txid });
  } catch (error) {
    console.error("Falha no webhook de pagamentos.", error);
    try { await registerEvent({ provider, status: "error", message: cleanText(error.message, 240) }); } catch {}
    return json({ success: false, message: error.message || "Falha ao processar pagamento." }, error.status || 500);
  }
}
