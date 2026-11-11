import tls from "node:tls";

if (typeof tls.getCACertificates === "function" && typeof tls.setDefaultCACertificates === "function") {
  tls.setDefaultCACertificates([...tls.getCACertificates("default"), ...tls.getCACertificates("system")]);
}

const HEADERS = { "access-control-allow-origin": "*", "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=45, stale-while-revalidate=60", "x-content-type-options": "nosniff" };
const COMMODITIES = [
  { id: "brent", symbol: "BZ=F", name: "Petróleo Brent", unit: "US$/barril", directWeight: 15.51, assets: ["PETR4", "PETR3", "PRIO3", "BRAV3"], note: "Receita das produtoras; câmbio e política de preços podem alterar o efeito." },
  { id: "iron", symbol: "TIO=F", name: "Minério de ferro", unit: "US$/tonelada", directWeight: 11.85, assets: ["VALE3", "CMIN3", "GGBR4", "CSNA3", "USIM5"], note: "Vale e mineradoras têm relação mais direta; nas siderúrgicas, minério também é custo." },
  { id: "copper", symbol: "HG=F", name: "Cobre", unit: "US$ cents/libra", directWeight: 1.54, assets: ["GGBR4", "CSNA3", "USIM5"], note: "Termômetro de atividade industrial global e do complexo de metais." },
  { id: "soy", symbol: "ZS=F", name: "Soja", unit: "US$ cents/bushel", directWeight: null, assets: ["SLCE3", "AGRO3", "SOJA3"], note: "Influência relevante no agro, mas sem peso direto material nos maiores componentes atuais do Ibovespa." },
  { id: "gold", symbol: "GC=F", name: "Ouro", unit: "US$/onça", directWeight: null, assets: ["AURA33", "GOLD11"], note: "Proxy de aversão ao risco; impacto no Ibovespa é principalmente macro e indireto." }
];
const cache = new Map();

async function quote(config, fresh = false) {
  const saved = cache.get(config.id); if (!fresh && saved && Date.now() - saved.time < 45_000) return saved.value;
  const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 9000);
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(config.symbol)}?range=1d&interval=5m&includePrePost=true&events=history`;
    const response = await fetch(url, { signal: controller.signal, headers: { accept: "application/json", "user-agent": "Mozilla/5.0 OlaCarlopolis/2.0" } }); if (!response.ok) throw new Error(`${config.name}: ${response.status}`);
    const result = (await response.json()).chart?.result?.[0]; if (!result) throw new Error(`${config.name}: sem dados`); const meta = result.meta || {}; const closes = result.indicators?.quote?.[0]?.close || [];
    let points = (result.timestamp || []).map((time, index) => ({ time: new Date(time * 1000).toISOString(), value: Number(closes[index]) })).filter((point) => point.value > 0); let current = Number(meta.regularMarketPrice) || points.at(-1)?.value; let previousClose = Number(meta.regularMarketPreviousClose) || Number(meta.chartPreviousClose); let marketTime = meta.regularMarketTime ? new Date(meta.regularMarketTime * 1000).toISOString() : points.at(-1)?.time; let intraday = points.length > 1 && marketTime && Date.now() - new Date(marketTime).getTime() < 7 * 86_400_000;
    if (!intraday) {
      const dailyUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(config.symbol)}?range=1mo&interval=1d&events=history`; const dailyResponse = await fetch(dailyUrl, { signal: controller.signal, headers: { accept: "application/json", "user-agent": "Mozilla/5.0 OlaCarlopolis/2.0" } }); if (!dailyResponse.ok) throw new Error(`${config.name}: referência diária indisponível`); const daily = (await dailyResponse.json()).chart?.result?.[0]; const dailyCloses = daily?.indicators?.quote?.[0]?.close || []; points = (daily?.timestamp || []).map((time, index) => ({ time: new Date(time * 1000).toISOString(), value: Number(dailyCloses[index]) })).filter((point) => point.value > 0).slice(-10); current = points.at(-1)?.value; previousClose = points.at(-2)?.value; marketTime = points.at(-1)?.time;
    }
    const change = current > 0 && previousClose > 0 ? (current / previousClose - 1) * 100 : 0; const value = { ...config, current, previousClose, change, marketTime, intraday, points }; cache.set(config.id, { time: Date.now(), value }); return value;
  } finally { clearTimeout(timeout); }
}

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: HEADERS, body: "" };
  if (event.httpMethod !== "GET") return { statusCode: 405, headers: HEADERS, body: JSON.stringify({ message: "Método não permitido." }) };
  try {
    const fresh = Boolean(event.queryStringParameters?.live); const settled = await Promise.allSettled(COMMODITIES.map((item) => quote(item, fresh))); const items = settled.filter((item) => item.status === "fulfilled").map((item) => item.value); const errors = settled.filter((item) => item.status === "rejected").map((item) => item.reason?.message || "Falha desconhecida"); if (items.length < 3) throw new Error("Poucas commodities responderam para uma leitura confiável.");
    return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ source: "Yahoo Finance", updatedAt: new Date().toISOString(), delayed: true, directWeightDate: "2026-11-11", items, errors }) };
  } catch (error) { return { statusCode: 502, headers: { ...HEADERS, "cache-control": "no-store" }, body: JSON.stringify({ message: error.name === "AbortError" ? "A fonte demorou para responder." : error.message }) }; }
}
