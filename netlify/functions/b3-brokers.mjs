import tls from "node:tls";

if (typeof tls.getCACertificates === "function" && typeof tls.setDefaultCACertificates === "function") {
  tls.setDefaultCACertificates([...tls.getCACertificates("default"), ...tls.getCACertificates("system")]);
}

const HEADERS = { "access-control-allow-origin": "*", "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=300, stale-while-revalidate=900", "x-content-type-options": "nosniff" };
const MONTH_CODES = { 1: "F", 2: "G", 3: "H", 4: "J", 5: "K", 6: "M", 7: "N", 8: "Q", 9: "U", 10: "V", 11: "X", 12: "Z" };

const BROKERS = [
  { name: "XP Investimentos", profile: "Varejo e institucional", indexScore: 92, dollarScore: 84, focus: "WIN, WDO e ações líquidas", watch: "Observe concentração de agressões e mudanças rápidas perto da abertura e de dados macro." },
  { name: "BTG Pactual", profile: "Institucional", indexScore: 91, dollarScore: 89, focus: "Índice, dólar e arbitragem", watch: "Fluxos grandes podem estar ligados a hedge e arbitragem; confirme se preço e volume caminham juntos." },
  { name: "Morgan Stanley", profile: "Estrangeiro institucional", indexScore: 90, dollarScore: 87, focus: "Índice e fluxo estrangeiro", watch: "Atuação pode refletir alocação global. Compare com S&P 500, Treasury e DXY." },
  { name: "Merrill Lynch", profile: "Estrangeiro institucional", indexScore: 89, dollarScore: 86, focus: "Ações, índice e câmbio", watch: "Movimentos persistentes ganham relevância quando acompanham bancos, Vale e Petrobras." },
  { name: "Itaú Corretora", profile: "Banco e institucional", indexScore: 88, dollarScore: 86, focus: "Índice, dólar e tesouraria", watch: "Separe execução de clientes de possível hedge da tesouraria; uma única ordem não define direção." },
  { name: "UBS Brasil", profile: "Estrangeiro institucional", indexScore: 86, dollarScore: 88, focus: "Fluxo estrangeiro e derivativos", watch: "Observe continuidade após a abertura americana e reação do dólar ao fluxo externo." },
  { name: "J.P. Morgan", profile: "Estrangeiro institucional", indexScore: 84, dollarScore: 93, focus: "Câmbio, juros e índice", watch: "Temas de juros dos EUA e risco fiscal costumam ampliar a importância do fluxo cambial." },
  { name: "Bradesco / Ágora", profile: "Banco e varejo", indexScore: 83, dollarScore: 80, focus: "Ações, WIN e WDO", watch: "Acompanhe se a atuação aparece distribuída ou concentrada em poucos níveis de preço." },
  { name: "Santander Corretora", profile: "Banco e institucional", indexScore: 82, dollarScore: 90, focus: "Dólar, juros e índice", watch: "No WDO, compare a agressão com DXY, curva de juros e notícias fiscais locais." },
  { name: "Safra", profile: "Banco e alta renda", indexScore: 77, dollarScore: 82, focus: "Câmbio e ações", watch: "Ordens podem ser proteção de carteira; procure repetição e aceitação de preço antes de interpretar." },
  { name: "Genial Investimentos", profile: "Varejo e institucional", indexScore: 73, dollarScore: 68, focus: "WIN, WDO e ações", watch: "Fluxo de varejo pode aumentar ruído. Dê mais peso quando houver volume e rompimento confirmado." },
  { name: "Banco Inter", profile: "Digital e varejo", indexScore: 65, dollarScore: 62, focus: "Varejo em índice e dólar", watch: "Use como leitura complementar de participação, nunca isoladamente como sinal de entrada." }
].map((item) => ({ ...item, combinedScore: Math.round(item.indexScore * .55 + item.dollarScore * .45) }));

function frontSymbols(now = new Date()) {
  let wdoYear = now.getUTCFullYear(); const month = now.getUTCMonth() + 1; const day = now.getUTCDate();
  let wdoMonth = month + 1; if (wdoMonth > 12) { wdoMonth = 1; wdoYear += 1; }
  let winYear = now.getUTCFullYear(); const winMonths = [2, 4, 6, 8, 10, 12]; let winMonth = winMonths.find((value) => value > month || (value === month && day <= 14)); if (!winMonth) { winMonth = 2; winYear += 1; }
  return { WIN: `WIN${MONTH_CODES[winMonth]}${String(winYear).slice(-2)}`, WDO: `WDO${MONTH_CODES[wdoMonth]}${String(wdoYear).slice(-2)}` };
}

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
async function fetchJson(url, retry = true) {
  const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 9000);
  try { const response = await fetch(url, { signal: controller.signal, headers: { accept: "application/json", "user-agent": "OlaCarlopolis-Brokers/1.0" } }); if (response.status === 429 && retry) { await wait(900); return fetchJson(url, false); } if (!response.ok) throw new Error(`Fonte respondeu ${response.status}`); return response.json(); }
  finally { clearTimeout(timeout); }
}

function normalizeHistory(payload) {
  const future = payload?.future || {}; return { symbol: future.symbol, asset: future.underlyingAsset, name: future.assetDescription, points: (future.history || []).map((item) => ({ date: new Date(Number(item.date) * 1000).toISOString().slice(0, 10), settlement: Number(item.settlement || 0), close: Number(item.close || 0), changePercent: Number(item.oscillationPct || 0), volume: Number(item.volume || 0), trades: Number(item.trades || 0) })).sort((a, b) => a.date.localeCompare(b.date)).slice(-20) };
}

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: HEADERS, body: "" };
  if (event.httpMethod !== "GET") return { statusCode: 405, headers: HEADERS, body: JSON.stringify({ message: "Método não permitido." }) };
  const symbols = frontSymbols(); const quoteUrl = `https://brapi.dev/api/v2/futures/quote?symbols=${symbols.WIN},${symbols.WDO}`; const historyUrls = [symbols.WIN, symbols.WDO].map((symbol) => `https://brapi.dev/api/v2/futures/historical?symbol=${symbol}&sortOrder=asc`); const settle = async (url) => { try { return { status: "fulfilled", value: await fetchJson(url) }; } catch (reason) { return { status: "rejected", reason }; } };
  const results = [await settle(quoteUrl)]; for (const url of historyUrls) { await wait(350); results.push(await settle(url)); } const errors = results.filter((item) => item.status === "rejected").map((item) => item.reason?.message || "Fonte indisponível");
  const quotes = results[0].status === "fulfilled" ? (results[0].value.quotes || []).map((item) => ({ symbol: item.symbol, asset: item.underlyingAsset, date: new Date(Number(item.date) * 1000).toISOString().slice(0, 10), settlement: Number(item.settlement || 0), close: Number(item.close || 0), changePercent: Number(item.oscillationPct || 0), volume: Number(item.volume || 0), trades: Number(item.trades || 0), financialVolume: Number(item.financialVolume || 0) })) : [];
  const history = results.slice(1).filter((item) => item.status === "fulfilled").map((item) => normalizeHistory(item.value));
  return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ source: "B3 participantes + brapi.dev futuros EOD", updatedAt: new Date().toISOString(), methodology: "Seleção editorial de participantes relevantes; não é ranking oficial de volume nem posição líquida por corretora.", marketDataNotice: "Cotações atuais formam apenas uma leitura de pressão. Ajuste, volume e negócios dos contratos são dados de fim de dia.", symbols, brokers: BROKERS, quotes, history, errors }) };
}
