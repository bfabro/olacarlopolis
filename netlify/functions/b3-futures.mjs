import tls from "node:tls";

if (typeof tls.getCACertificates === "function" && typeof tls.setDefaultCACertificates === "function") {
  tls.setDefaultCACertificates([...tls.getCACertificates("default"), ...tls.getCACertificates("system")]);
}

const HEADERS = { "access-control-allow-origin": "*", "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=900, stale-while-revalidate=1800", "x-content-type-options": "nosniff" };

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: HEADERS, body: "" };
  if (event.httpMethod !== "GET") return { statusCode: 405, headers: HEADERS, body: JSON.stringify({ message: "Método não permitido." }) };
  try {
    const response = await fetch("https://brapi.dev/api/v2/futures/quote?symbols=WINZ26,WDOZ26", { headers: { accept: "application/json", "user-agent": "OlaCarlopolis-Futures/2.0" } });
    if (!response.ok) throw new Error(`Futuros indisponíveis (${response.status}).`);
    const payload = await response.json(); const contracts = (payload.quotes || []).map((item) => ({ symbol: item.symbol, asset: item.underlyingAsset, name: item.assetDescription, date: new Date(Number(item.date) * 1000).toISOString().slice(0, 10), settlement: Number(item.settlement), changePercent: Number(item.oscillationPct || 0), tradedContracts: Number(item.volume || 0), trades: Number(item.trades || 0) }));
    return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ source: "brapi.dev / B3 EOD", updatedAt: new Date().toISOString(), contracts }) };
  } catch (error) { return { statusCode: 502, headers: { ...HEADERS, "cache-control": "no-store" }, body: JSON.stringify({ message: error.message }) }; }
}
