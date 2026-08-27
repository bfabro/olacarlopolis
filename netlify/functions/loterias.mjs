// Agregador publico das Loterias CAIXA - v3
import tls from "node:tls";
import { carregarResultados } from "../../shared/loterias-core.mjs";

if (typeof tls.getCACertificates === "function" && typeof tls.setDefaultCACertificates === "function") {
  tls.setDefaultCACertificates([...tls.getCACertificates("default"), ...tls.getCACertificates("system")]);
}
const BASE_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, OPTIONS",
  "access-control-allow-headers": "content-type",
  "content-type": "application/json; charset=utf-8",
  "x-content-type-options": "nosniff"
};

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: BASE_HEADERS, body: "" };
  if (event.httpMethod !== "GET") return { statusCode: 405, headers: BASE_HEADERS, body: JSON.stringify({ error: true, message: "Metodo nao permitido." }) };
  const force = event.queryStringParameters?.refresh === "1";
  const resultados = await carregarResultados(force);
  const disponiveis = resultados.filter((item) => item.ok).length;
  return {
    statusCode: disponiveis ? 200 : 502,
    headers: { ...BASE_HEADERS, "cache-control": "no-store, no-cache, must-revalidate", pragma: "no-cache", expires: "0" },
    body: JSON.stringify({ fonte: "Loterias CAIXA", consultadoEm: new Date().toISOString(), cacheSegundos: 0, resultados })
  };
}
