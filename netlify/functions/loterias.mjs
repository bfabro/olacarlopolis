// Agregador publico das Loterias CAIXA - v1
import tls from "node:tls";

// A CAIXA utiliza uma cadeia aceita pelo sistema operacional, mas nem sempre presente no pacote interno do Node.
if (typeof tls.getCACertificates === "function" && typeof tls.setDefaultCACertificates === "function") {
  tls.setDefaultCACertificates([...tls.getCACertificates("default"), ...tls.getCACertificates("system")]);
}
const CAIXA_BASE = "https://servicebus2.caixa.gov.br/portaldeloterias/api";
const CACHE_TTL_MS = 15 * 60 * 1000;
const MODALIDADES = ["megasena", "lotofacil", "quina", "lotomania", "timemania", "duplasena", "diadesorte", "supersete", "maismilionaria", "federal"];
const cache = new Map();
const BASE_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, OPTIONS",
  "access-control-allow-headers": "content-type",
  "content-type": "application/json; charset=utf-8",
  "x-content-type-options": "nosniff"
};

async function consultar(slug, force) {
  const salvo = cache.get(slug);
  if (!force && salvo && Date.now() - salvo.atualizadoEm < CACHE_TTL_MS) return { slug, ok: true, cache: true, data: salvo.data };
  try {
    const response = await fetch(`${CAIXA_BASE}/${slug}`, {
      cache: "no-store",
      headers: { accept: "application/json", "user-agent": "OlaCarlopolis/1.0" },
      signal: AbortSignal.timeout(12000)
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data || typeof data !== "object") throw new Error("Resposta indisponivel");
    cache.set(slug, { atualizadoEm: Date.now(), data });
    return { slug, ok: true, cache: false, data };
  } catch (error) {
    if (salvo?.data) return { slug, ok: true, cache: true, stale: true, data: salvo.data };
    return { slug, ok: false, message: "Resultado temporariamente indisponivel." };
  }
}

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: BASE_HEADERS, body: "" };
  if (event.httpMethod !== "GET") return { statusCode: 405, headers: BASE_HEADERS, body: JSON.stringify({ error: true, message: "Metodo nao permitido." }) };
  const force = event.queryStringParameters?.refresh === "1";
  const resultados = await Promise.all(MODALIDADES.map((slug) => consultar(slug, force)));
  const disponiveis = resultados.filter((item) => item.ok).length;
  return {
    statusCode: disponiveis ? 200 : 502,
    headers: { ...BASE_HEADERS, "cache-control": force ? "no-store" : "public, max-age=0, s-maxage=900, stale-while-revalidate=3600" },
    body: JSON.stringify({ fonte: "Loterias CAIXA", consultadoEm: new Date().toISOString(), cacheSegundos: 900, resultados })
  };
}
