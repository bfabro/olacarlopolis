// Proxy oficial da API de Revendedores ANP - v2 sem cache
export const config = { runtime: "edge" };

const ANP_ENDPOINT = "https://revendedoresapi.anp.gov.br/v1/combustivel";

function normalizarMunicipio(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9 ]+/g, " ").replace(/\s+/g, " ").trim().toUpperCase().slice(0, 80);
}

export default async function handler(request) {
  const requestUrl = new URL(request.url);
  const municipio = normalizarMunicipio(requestUrl.searchParams.get("municipio"));
  const uf = String(requestUrl.searchParams.get("uf") || "").trim().toUpperCase().replace(/[^A-Z]/g, "").slice(0, 2);
  const headers = { "content-type": "application/json; charset=utf-8", "access-control-allow-origin": "*", "x-content-type-options": "nosniff" };
  if (!municipio || uf.length !== 2) return new Response(JSON.stringify({ error: true, message: "Informe municipio e UF." }), { status: 400, headers });

  try {
    const url = new URL(ANP_ENDPOINT);
    url.searchParams.set("municipio", municipio);
    url.searchParams.set("uf", uf);
    const response = await fetch(url, { cache: "no-store", headers: { accept: "application/json", "cache-control": "no-cache", "user-agent": "OlaCarlopolis/1.0" }, signal: AbortSignal.timeout(15000) });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload) throw new Error(`ANP respondeu com status ${response.status}.`);
    return new Response(JSON.stringify({ fonte: "Agencia Nacional do Petroleo, Gas Natural e Biocombustiveis - ANP", consultadoEm: new Date().toISOString(), municipio, uf, postos: Array.isArray(payload.data) ? payload.data : [] }), {
      headers: { ...headers, "cache-control": "no-store, no-cache, must-revalidate", pragma: "no-cache", expires: "0" }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: true, message: "Nao foi possivel consultar a ANP agora." }), { status: 502, headers });
  }
}
