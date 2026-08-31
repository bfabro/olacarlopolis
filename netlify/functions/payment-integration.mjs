import {
  authenticate, cleanText, firebaseJson, json, publicIntegrationConfig,
  readIntegrationConfig, saveIntegrationConfig
} from "./_payment-core.mjs";

function parseBody(event) {
  try { return JSON.parse(event.body || "{}"); } catch { return {}; }
}

function providerLabel(provider) {
  return { mercadopago: "Mercado Pago", asaas: "Asaas", generic: "Webhook personalizado" }[provider] || "Nao configurado";
}

async function testProvider(config, secrets) {
  if (!secrets.accessToken && config.provider !== "generic") throw new Error("Informe o token de acesso do provedor.");
  if (config.provider === "generic") {
    if (!secrets.webhookSecret) throw new Error("Informe o token secreto que o provedor enviara no webhook.");
    return { success: true, message: "Configuracao do webhook personalizado validada." };
  }
  const url = config.provider === "mercadopago"
    ? "https://api.mercadopago.com/v1/payment_methods"
    : (config.environment === "sandbox" ? "https://api-sandbox.asaas.com" : "https://api.asaas.com") + "/v3/payments?limit=1";
  const headers = config.provider === "mercadopago"
    ? { authorization: "Bearer " + secrets.accessToken }
    : { access_token: secrets.accessToken };
  const response = await fetch(url, { headers: { accept: "application/json", ...headers }, cache: "no-store" });
  if (!response.ok) throw new Error(providerLabel(config.provider) + " recusou as credenciais (HTTP " + response.status + ").");
  return { success: true, message: "Conexao com " + providerLabel(config.provider) + " confirmada." };
}

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") return json({}, 204);
  try {
    const actor = await authenticate(event, { master: true });
    const body = parseBody(event);
    const action = cleanText(body.action || event.queryStringParameters?.action, 30) || "get";
    if (event.httpMethod === "GET" || action === "get") {
      const stored = await readIntegrationConfig();
      const [charges, events] = await Promise.all([
        firebaseJson("pagamentosIntegracao/cobrancas"),
        firebaseJson("pagamentosIntegracao/eventos")
      ]);
      const sortedCharges = Object.values(charges || {}).sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0)).slice(0, 200);
      const sortedEvents = Object.entries(events || {}).map(([id, value]) => ({ id, ...value })).sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0)).slice(0, 100);
      return json({ success: true, config: publicIntegrationConfig(stored.public, stored.secrets), charges: sortedCharges, events: sortedEvents });
    }
    if (event.httpMethod !== "POST") return json({ success: false, message: "Metodo nao permitido." }, 405);
    if (action === "save") {
      const config = await saveIntegrationConfig(body.config || {}, body.secrets || {}, actor);
      return json({ success: true, config, message: "Integracao salva com as credenciais protegidas no servidor." });
    }
    if (action === "test") {
      const stored = await readIntegrationConfig();
      const result = await testProvider(stored.public, stored.secrets);
      return json(result);
    }
    return json({ success: false, message: "Acao invalida." }, 400);
  } catch (error) {
    console.error("Falha na configuracao de pagamentos.", error);
    return json({ success: false, message: error.message || "Falha na integracao de pagamentos." }, error.status || 500);
  }
}
