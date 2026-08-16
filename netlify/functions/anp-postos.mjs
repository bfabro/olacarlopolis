// Proxy oficial da API de Revendedores ANP - v1
const ANP_ENDPOINT = "https://revendedoresapi.anp.gov.br/v1/combustivel";

const HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, OPTIONS",
  "access-control-allow-headers": "content-type",
  "content-type": "application/json; charset=utf-8",
  "x-content-type-options": "nosniff"
};

function normalizarMunicipio(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase()
    .slice(0, 80);
}

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: HEADERS, body: "" };
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, headers: HEADERS, body: JSON.stringify({ error: true, message: "Metodo nao permitido." }) };
  }

  const municipio = normalizarMunicipio(event.queryStringParameters?.municipio);
  const uf = String(event.queryStringParameters?.uf || "").trim().toUpperCase().replace(/[^A-Z]/g, "").slice(0, 2);
  if (!municipio || uf.length !== 2) {
    return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: true, message: "Informe municipio e UF." }) };
  }

  try {
    const url = new URL(ANP_ENDPOINT);
    url.searchParams.set("municipio", municipio);
    url.searchParams.set("uf", uf);
    const response = await fetch(url, {
      headers: { accept: "application/json", "user-agent": "OlaCarlopolis/1.0" },
      signal: AbortSignal.timeout(15000)
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload) throw new Error(`ANP respondeu com status ${response.status}.`);
    return {
      statusCode: 200,
      headers: { ...HEADERS, "cache-control": "public, max-age=300, s-maxage=3600" },
      body: JSON.stringify({
        fonte: "Agencia Nacional do Petroleo, Gas Natural e Biocombustiveis - ANP",
        consultadoEm: new Date().toISOString(),
        municipio,
        uf,
        postos: Array.isArray(payload.data) ? payload.data : []
      })
    };
  } catch (error) {
    console.error("Falha ao consultar postos na ANP.", error);
    return { statusCode: 502, headers: HEADERS, body: JSON.stringify({ error: true, message: "Nao foi possivel consultar a ANP agora." }) };
  }
}
