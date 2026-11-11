import tls from "node:tls";

if (typeof tls.getCACertificates === "function" && typeof tls.setDefaultCACertificates === "function") {
  tls.setDefaultCACertificates([...tls.getCACertificates("default"), ...tls.getCACertificates("system")]);
}

const HEADERS = { "access-control-allow-origin": "*", "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=45, stale-while-revalidate=60", "x-content-type-options": "nosniff" };
const STOCKS = [
  ["VALE3.SA", "VALE3", "Vale", "Mineração", 9.97],
  ["ITUB4.SA", "ITUB4", "Itaú Unibanco", "Bancos", 9.18],
  ["PETR4.SA", "PETR4", "Petrobras PN", "Petróleo", 8.28],
  ["PETR3.SA", "PETR3", "Petrobras ON", "Petróleo", 5.18],
  ["AXIA3.SA", "AXIA3", "Axia Energia", "Energia", 4.62],
  ["SBSP3.SA", "SBSP3", "Sabesp", "Saneamento", 3.94],
  ["EMBJ3.SA", "EMBJ3", "Embraer", "Indústria", 3.46],
  ["ITSA4.SA", "ITSA4", "Itaúsa", "Financeiro", 3.34],
  ["WEGE3.SA", "WEGE3", "WEG", "Indústria", 3.11],
  ["BBDC4.SA", "BBDC4", "Bradesco", "Bancos", 3.10],
  ["B3SA3.SA", "B3SA3", "B3", "Financeiro", 3.01],
  ["BPAC11.SA", "BPAC11", "BTG Pactual", "Bancos", 2.78]
];
const cache = new Map();

async function intraday(definition, fresh = false) {
  const [symbol, ticker, name, sector, weight] = definition; const saved = cache.get(symbol);
  if (!fresh && saved && Date.now() - saved.time < 45_000) return saved.value;
  const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 9000);
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=5m&includePrePost=false&events=history`;
    const response = await fetch(url, { signal: controller.signal, headers: { accept: "application/json", "user-agent": "Mozilla/5.0 OlaCarlopolis/2.0" } });
    if (!response.ok) throw new Error(`${ticker}: fonte respondeu ${response.status}`);
    const result = (await response.json()).chart?.result?.[0]; if (!result) throw new Error(`${ticker}: sem dados`);
    const meta = result.meta || {}; const closes = result.indicators?.quote?.[0]?.close || [];
    const points = (result.timestamp || []).map((time, index) => ({ time: new Date(time * 1000).toISOString(), value: Number(closes[index]) })).filter((point) => point.value > 0);
    const current = Number(meta.regularMarketPrice) || points.at(-1)?.value; const previousClose = Number(meta.regularMarketPreviousClose) || Number(meta.chartPreviousClose); const change = current > 0 && previousClose > 0 ? (current / previousClose - 1) * 100 : 0;
    const value = { symbol, ticker, name, sector, weight, current, previousClose, open: Number(meta.regularMarketOpen) || points[0]?.value || 0, high: Number(meta.regularMarketDayHigh) || Math.max(...points.map((point) => point.value)), low: Number(meta.regularMarketDayLow) || Math.min(...points.map((point) => point.value)), volume: Number(meta.regularMarketVolume || 0), change, contribution: weight * change / 100, marketTime: meta.regularMarketTime ? new Date(meta.regularMarketTime * 1000).toISOString() : null, points };
    cache.set(symbol, { time: Date.now(), value }); return value;
  } finally { clearTimeout(timeout); }
}

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: HEADERS, body: "" };
  if (event.httpMethod !== "GET") return { statusCode: 405, headers: HEADERS, body: JSON.stringify({ message: "Método não permitido." }) };
  try {
    const fresh = Boolean(event.queryStringParameters?.live); const results = await Promise.allSettled(STOCKS.map((stock) => intraday(stock, fresh)));
    const items = results.filter((result) => result.status === "fulfilled").map((result) => result.value); const errors = results.filter((result) => result.status === "rejected").map((result) => result.reason?.message || "Falha desconhecida");
    if (items.length < 6) throw new Error("Poucos papéis responderam para uma leitura confiável.");
    return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ source: "Yahoo Finance", weightSource: "Carteira teórica do Ibovespa", weightDate: "2026-11-11", updatedAt: new Date().toISOString(), delayed: true, totalWeight: STOCKS.reduce((sum, item) => sum + item[4], 0), items, errors }) };
  } catch (error) { return { statusCode: 502, headers: { ...HEADERS, "cache-control": "no-store" }, body: JSON.stringify({ message: error.name === "AbortError" ? "A fonte demorou para responder." : error.message }) }; }
}
