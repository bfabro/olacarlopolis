// Agregador publico das Loterias CAIXA - v1
export const config = { runtime: "edge" };

const CAIXA_BASE = "https://servicebus2.caixa.gov.br/portaldeloterias/api";
const CACHE_TTL_MS = 15 * 60 * 1000;
const MODALIDADES = ["megasena", "lotofacil", "quina", "lotomania", "timemania", "duplasena", "diadesorte", "supersete", "maismilionaria", "federal"];
const cache = new Map();

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

export default async function handler(request) {
  const url = new URL(request.url);
  const force = url.searchParams.get("refresh") === "1";
  const resultados = await Promise.all(MODALIDADES.map((slug) => consultar(slug, force)));
  const disponiveis = resultados.filter((item) => item.ok).length;
  const headers = {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
    "x-content-type-options": "nosniff",
    "cache-control": force ? "no-store" : "public, max-age=0, s-maxage=900, stale-while-revalidate=3600"
  };
  return new Response(JSON.stringify({ fonte: "Loterias CAIXA", consultadoEm: new Date().toISOString(), cacheSegundos: 900, resultados }), { status: disponiveis ? 200 : 502, headers });
}
