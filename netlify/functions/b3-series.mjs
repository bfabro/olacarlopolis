import tls from "node:tls";

if (typeof tls.getCACertificates === "function" && typeof tls.setDefaultCACertificates === "function") {
  tls.setDefaultCACertificates([...tls.getCACertificates("default"), ...tls.getCACertificates("system")]);
}

const HEADERS = { "access-control-allow-origin": "*", "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=45, stale-while-revalidate=60", "x-content-type-options": "nosniff" };
const cache = new Map();
const GROUPS = {
  brent: { commodity: ["BZ=F", "Petróleo Brent"], stocks: [["PETR4.SA", "PETR4"], ["PETR3.SA", "PETR3"], ["PRIO3.SA", "PRIO3"], ["RECV3.SA", "RECV3"]] },
  iron: { commodity: ["TIO=F", "Minério de ferro"], stocks: [["VALE3.SA", "VALE3"], ["CMIN3.SA", "CMIN3"], ["CSNA3.SA", "CSNA3"], ["GGBR4.SA", "GGBR4"]] },
  gold: { commodity: ["GC=F", "Ouro"], stocks: [["AURA33.SA", "AURA33"], ["GOLD11.SA", "GOLD11"]] },
  soy: { commodity: ["ZS=F", "Soja"], stocks: [["SLCE3.SA", "SLCE3"], ["AGRO3.SA", "AGRO3"], ["SOJA3.SA", "SOJA3"], ["RANI3.SA", "RANI3"]] },
  coffee: { commodity: ["KC=F", "Café"], stocks: [["JALL3.SA", "JALL3"], ["AGRO3.SA", "AGRO3"]] },
  sugar: { commodity: ["SB=F", "Açúcar"], stocks: [["SMTO3.SA", "SMTO3"], ["RAIZ4.SA", "RAIZ4"], ["JALL3.SA", "JALL3"]] }
};
const INDICES = {
  ibov: ["^BVSP", "Ibovespa"], spx: ["^GSPC", "S&P 500"], nasdaq: ["^IXIC", "Nasdaq"], dow: ["^DJI", "Dow Jones"],
  dax: ["^GDAXI", "DAX"], nikkei: ["^N225", "Nikkei 225"], china: ["000001.SS", "Xangai"]
};
const PERIODS = {
  "1d": { range: "1d", interval: "5m", intraday: true },
  "5d": { range: "5d", interval: "15m", intraday: true },
  "1mo": { range: "1mo", interval: "1d", intraday: false },
  "3mo": { range: "3mo", interval: "1d", intraday: false },
  "6mo": { range: "6mo", interval: "1d", intraday: false },
  "1y": { range: "1y", interval: "1d", intraday: false }
};

async function yahooSeries(symbol, label, fresh = false, options = PERIODS["3mo"]) {
  const { range = "3mo", interval = "1d", intraday = false, from = null, to = null } = options; const key = `yahoo:${symbol}:${range}:${interval}:${from || ""}:${to || ""}`; const saved = cache.get(key);
  if (!fresh && saved && Date.now() - saved.time < 45 * 1000) return { ...saved.value, label };
  const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 9000);
  try {
    const period = from && to ? `period1=${Math.floor(new Date(`${from}T00:00:00Z`).getTime() / 1000)}&period2=${Math.floor(new Date(`${to}T23:59:59Z`).getTime() / 1000)}` : `range=${encodeURIComponent(range)}`;
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?${period}&interval=${encodeURIComponent(interval)}&events=history&includePrePost=false`;
    const response = await fetch(url, { signal: controller.signal, headers: { accept: "application/json", "user-agent": "Mozilla/5.0 OlaCarlopolis/2.0" } });
    if (!response.ok) throw new Error(`Série ${symbol}: ${response.status}`);
    const result = (await response.json()).chart?.result?.[0]; if (!result) throw new Error(`Série ${symbol} sem dados.`);
    const quote = result.indicators?.quote?.[0] || {}; const closes = result.indicators?.adjclose?.[0]?.adjclose || quote.close || [];
    const points = (result.timestamp || []).map((time, index) => ({ date: intraday ? new Date(time * 1000).toISOString() : new Date(time * 1000).toISOString().slice(0, 10), value: Number(closes[index]) })).filter((point) => Number.isFinite(point.value) && point.value > 0);
    if (points.length < (intraday ? 1 : 2)) throw new Error(`Série ${symbol} insuficiente.`);
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date()); const historicalCurrent = points.at(-1).value; const livePrice = Number(result.meta?.regularMarketPrice); const current = livePrice > 0 ? livePrice : historicalCurrent; const fallbackPrevious = points.at(-1)?.date === today ? points.at(-2)?.value : points.at(-1)?.value; const previousClose = Number(result.meta?.regularMarketPreviousClose) || fallbackPrevious; const at = (offset) => points.at(Math.max(-points.length, -1 - offset))?.value ?? current; const change = (offset) => offset === 1 && previousClose > 0 ? (current / previousClose - 1) * 100 : (current / at(offset)) * 100 - 100;
    const candles = (result.timestamp || []).map((time, index) => ({ date: new Date(time * 1000).toISOString().slice(0, 10), high: Number(quote.high?.[index]), low: Number(quote.low?.[index]), close: Number(quote.close?.[index]) })).filter((row) => row.high > 0 && row.low > 0 && row.close > 0);
    const reference = candles.at(candles.at(-1)?.date === today ? -2 : -1); let levels = null;
    if (reference) { const pivot = (reference.high + reference.low + reference.close) / 3; levels = { referenceDate: reference.date, pivot, resistance1: 2 * pivot - reference.low, resistance2: pivot + (reference.high - reference.low), support1: 2 * pivot - reference.high, support2: pivot - (reference.high - reference.low) }; }
    const value = { symbol, label, currency: result.meta?.currency || "", volume: Number(result.meta?.regularMarketVolume || 0), open: Number(result.meta?.regularMarketOpen || 0), current, change1d: change(1), change5d: change(5), change20d: change(20), marketTime: result.meta?.regularMarketTime ? new Date(result.meta.regularMarketTime * 1000).toISOString() : null, points, levels, period: { range, interval, intraday, from, to } };
    cache.set(key, { time: Date.now(), value }); return value;
  } finally { clearTimeout(timeout); }
}

async function overview(fresh = false) {
  const indexEntries = await Promise.all(Object.entries(INDICES).map(async ([id, [symbol, label]]) => [id, await yahooSeries(symbol, label, fresh)]));
  const extras = await Promise.all([yahooSeries("BRL=X", "Dólar/Real", fresh), yahooSeries("BZ=F", "Brent", fresh), yahooSeries("TIO=F", "Minério", fresh), yahooSeries("GC=F", "Ouro", fresh)]);
  const quoteDefs = [["PETR4.SA", "PETR4"], ["VALE3.SA", "VALE3"], ["ITUB4.SA", "ITUB4"], ["MGLU3.SA", "MGLU3"]];
  const quotes = await Promise.all(quoteDefs.map(([symbol, label]) => yahooSeries(symbol, label, fresh)));
  return { indices: Object.fromEntries(indexEntries), macro: { usdbrl: extras[0], brent: extras[1], iron: extras[2], gold: extras[3] }, quotes };
}

async function indexPeriod(periodId, from, to, fresh = false) {
  let options = PERIODS[periodId];
  if (from || to) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from || "") || !/^\d{4}-\d{2}-\d{2}$/.test(to || "")) throw new Error("Informe as duas datas no formato válido.");
    const start = new Date(`${from}T00:00:00Z`); const end = new Date(`${to}T23:59:59Z`); const span = end - start;
    if (!(span > 0) || span > 5 * 366 * 864e5) throw new Error("O intervalo personalizado deve ter entre 1 dia e 5 anos.");
    options = { range: "custom", interval: "1d", intraday: false, from, to };
  }
  if (!options) throw new Error("Período de gráfico inválido.");
  const entries = await Promise.all(Object.entries(INDICES).map(async ([id, [symbol, label]]) => {
    try { return [id, await yahooSeries(symbol, label, fresh, options)]; }
    catch (error) {
      if (periodId !== "1d" || !/insuficiente/i.test(error.message)) throw error;
      const fallback = await yahooSeries(symbol, label, fresh, { range: "5d", interval: "5m", intraday: true }); let start = 0;
      for (let index = 1; index < fallback.points.length; index += 1) if (new Date(fallback.points[index].date) - new Date(fallback.points[index - 1].date) > 4 * 36e5) start = index;
      return [id, { ...fallback, points: fallback.points.slice(start), period: { ...options, fallback: true } }];
    }
  }));
  return { indices: Object.fromEntries(entries), period: { id: from && to ? "custom" : periodId, ...options, fallback: entries.some(([, item]) => item.period?.fallback) } };
}

async function group(id) {
  const config = GROUPS[id]; if (!config) throw new Error("Grupo de commodity inválido.");
  const [commodity, ...stocks] = await Promise.all([yahooSeries(...config.commodity), ...config.stocks.map(([symbol, label]) => yahooSeries(symbol, label))]);
  return { id, commodity, stocks };
}

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: HEADERS, body: "" };
  if (event.httpMethod !== "GET") return { statusCode: 405, headers: HEADERS, body: JSON.stringify({ message: "Método não permitido." }) };
  try {
    const id = event.queryStringParameters?.group; const period = event.queryStringParameters?.period; const from = event.queryStringParameters?.from; const to = event.queryStringParameters?.to; const fresh = Boolean(event.queryStringParameters?.live); const data = id ? await group(id) : (period || from || to) ? await indexPeriod(period || "custom", from, to, fresh) : await overview(fresh);
    return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ source: "Yahoo Finance", updatedAt: new Date().toISOString(), delayed: true, ...data }) };
  } catch (error) { return { statusCode: 502, headers: { ...HEADERS, "cache-control": "no-store" }, body: JSON.stringify({ message: error.name === "AbortError" ? "A fonte demorou para responder." : error.message }) }; }
}
