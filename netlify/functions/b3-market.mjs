import tls from "node:tls";

if (typeof tls.getCACertificates === "function" && typeof tls.setDefaultCACertificates === "function") {
  tls.setDefaultCACertificates([...tls.getCACertificates("default"), ...tls.getCACertificates("system")]);
}

const HEADERS = { "access-control-allow-origin": "*", "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=120, stale-while-revalidate=300", "x-content-type-options": "nosniff" };
const ASSETS = ["PETR4", "VALE3", "ITUB4", "MGLU3"];

async function quote(symbol) {
  const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 7000);
  try {
    const response = await fetch(`https://brapi.dev/api/v2/stocks/quote?symbols=${symbol}`, { signal: controller.signal, headers: { accept: "application/json", "user-agent": "OlaCarlopolis-MarketPanel/1.0" } });
    if (!response.ok) throw new Error(`brapi ${response.status}`);
    const payload = await response.json(); const item = payload.results?.[0]?.data || payload.results?.[0];
    if (!item || !Number.isFinite(Number(item.regularMarketPrice))) throw new Error("Cotação inválida");
    return { symbol, name: item.shortName || item.longName || symbol, price: Number(item.regularMarketPrice), changePercent: Number(item.regularMarketChangePercent || 0), volume: Number(item.regularMarketVolume || 0) };
  } finally { clearTimeout(timeout); }
}

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: HEADERS, body: "" };
  if (event.httpMethod !== "GET") return { statusCode: 405, headers: HEADERS, body: JSON.stringify({ message: "Método não permitido." }) };
  try {
    const settled = await Promise.allSettled(ASSETS.map(quote)); const results = settled.filter((item) => item.status === "fulfilled").map((item) => item.value);
    if (!results.length) throw new Error("Nenhuma cotação disponível agora.");
    return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ source: "brapi.dev", updatedAt: new Date().toISOString(), delayed: true, results }) };
  } catch (error) { return { statusCode: 502, headers: { ...HEADERS, "cache-control": "no-store" }, body: JSON.stringify({ message: error.message }) }; }
}
