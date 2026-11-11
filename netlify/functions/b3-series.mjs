import tls from "node:tls";

if (typeof tls.getCACertificates === "function" && typeof tls.setDefaultCACertificates === "function") {
  tls.setDefaultCACertificates([...tls.getCACertificates("default"), ...tls.getCACertificates("system")]);
}

const HEADERS = { "access-control-allow-origin": "*", "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=300, stale-while-revalidate=900", "x-content-type-options": "nosniff" };
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

async function yahooSeries(symbol, label) {
  const key = `yahoo:${symbol}`; const saved = cache.get(key);
  if (saved && Date.now() - saved.time < 10 * 60 * 1000) return { ...saved.value, label };
  const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 9000);
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=3mo&interval=1d&events=history`;
    const response = await fetch(url, { signal: controller.signal, headers: { accept: "application/json", "user-agent": "Mozilla/5.0 OlaCarlopolis/2.0" } });
    if (!response.ok) throw new Error(`Série ${symbol}: ${response.status}`);
    const result = (await response.json()).chart?.result?.[0]; if (!result) throw new Error(`Série ${symbol} sem dados.`);
    const quote = result.indicators?.quote?.[0] || {}; const closes = result.indicators?.adjclose?.[0]?.adjclose || quote.close || [];
    const points = (result.timestamp || []).map((time, index) => ({ date: new Date(time * 1000).toISOString().slice(0, 10), value: Number(closes[index]) })).filter((point) => Number.isFinite(point.value) && point.value > 0);
    if (points.length < 2) throw new Error(`Série ${symbol} insuficiente.`);
    const current = points.at(-1).value; const at = (offset) => points.at(Math.max(-points.length, -1 - offset))?.value ?? current; const change = (offset) => (current / at(offset) - 1) * 100;
    const candles = (result.timestamp || []).map((time, index) => ({ date: new Date(time * 1000).toISOString().slice(0, 10), high: Number(quote.high?.[index]), low: Number(quote.low?.[index]), close: Number(quote.close?.[index]) })).filter((row) => row.high > 0 && row.low > 0 && row.close > 0);
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date()); const reference = candles.at(candles.at(-1)?.date === today ? -2 : -1); let levels = null;
    if (reference) { const pivot = (reference.high + reference.low + reference.close) / 3; levels = { referenceDate: reference.date, pivot, resistance1: 2 * pivot - reference.low, resistance2: pivot + (reference.high - reference.low), support1: 2 * pivot - reference.high, support2: pivot - (reference.high - reference.low) }; }
    const value = { symbol, label, currency: result.meta?.currency || "", volume: Number(result.meta?.regularMarketVolume || 0), current, change1d: change(1), change5d: change(5), change20d: change(20), points, levels };
    cache.set(key, { time: Date.now(), value }); return value;
  } finally { clearTimeout(timeout); }
}

async function overview() {
  const indexEntries = await Promise.all(Object.entries(INDICES).map(async ([id, [symbol, label]]) => [id, await yahooSeries(symbol, label)]));
  const extras = await Promise.all([yahooSeries("BRL=X", "Dólar/Real"), yahooSeries("BZ=F", "Brent"), yahooSeries("TIO=F", "Minério"), yahooSeries("GC=F", "Ouro")]);
  const quoteDefs = [["PETR4.SA", "PETR4"], ["VALE3.SA", "VALE3"], ["ITUB4.SA", "ITUB4"], ["MGLU3.SA", "MGLU3"]];
  const quotes = await Promise.all(quoteDefs.map(([symbol, label]) => yahooSeries(symbol, label)));
  return { indices: Object.fromEntries(indexEntries), macro: { usdbrl: extras[0], brent: extras[1], iron: extras[2], gold: extras[3] }, quotes };
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
    const id = event.queryStringParameters?.group; const data = id ? await group(id) : await overview();
    return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ source: "Yahoo Finance", updatedAt: new Date().toISOString(), delayed: true, ...data }) };
  } catch (error) { return { statusCode: 502, headers: { ...HEADERS, "cache-control": "no-store" }, body: JSON.stringify({ message: error.name === "AbortError" ? "A fonte demorou para responder." : error.message }) }; }
}
