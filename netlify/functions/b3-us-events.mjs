import tls from "node:tls";

if (typeof tls.getCACertificates === "function" && typeof tls.setDefaultCACertificates === "function") {
  tls.setDefaultCACertificates([...tls.getCACertificates("default"), ...tls.getCACertificates("system")]);
}

const HEADERS = { "access-control-allow-origin": "*", "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=1800, stale-while-revalidate=3600", "x-content-type-options": "nosniff" };
const BLS_ICS = "https://www.bls.gov/schedule/news_release/bls.ics";
const FOMC_URL = "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm";

const RULES = [
  { match: /consumer price index/i, label: "CPI · inflação ao consumidor", importance: "high", good: "Abaixo do esperado tende a aliviar juros e dólar, favorecendo bolsa e setores domésticos.", bad: "Acima do esperado pode elevar Treasury yields e dólar, pressionando emergentes, varejo e construção." },
  { match: /producer price index/i, label: "PPI · inflação ao produtor", importance: "high", good: "Abaixo do esperado reduz pressão inflacionária e pode apoiar fluxo para ativos de risco.", bad: "Acima do esperado reforça juros altos por mais tempo e pode pressionar Ibovespa e real." },
  { match: /employment situation/i, label: "Payroll · emprego nos EUA", importance: "high", good: "Emprego saudável sem aceleração forte de salários favorece crescimento com juros mais estáveis.", bad: "Dado muito quente pode elevar juros; queda forte do emprego pode aumentar temor de recessão. Ambos podem gerar volatilidade." },
  { match: /job openings|labor turnover/i, label: "JOLTS · vagas de emprego", importance: "medium", good: "Desaceleração moderada perto do esperado pode aliviar juros sem sinalizar recessão.", bad: "Vagas muito acima do esperado elevam pressão salarial; queda abrupta aumenta medo de desaceleração." },
  { match: /employment cost index/i, label: "ECI · custo do trabalho", importance: "high", good: "Custo do trabalho abaixo do esperado tende a aliviar inflação de serviços e juros americanos.", bad: "Custo acima do esperado pode fortalecer dólar e juros, desfavorecendo ativos brasileiros sensíveis à taxa." },
  { match: /productivity and costs/i, label: "Produtividade e custos", importance: "medium", good: "Produtividade maior e custos menores ajudam o cenário de inflação sem sacrificar crescimento.", bad: "Custos maiores com produtividade fraca podem elevar juros e reduzir apetite por risco." },
  { match: /import and export price/i, label: "Preços de importação/exportação", importance: "medium", good: "Preços abaixo do esperado aliviam inflação importada e podem reduzir pressão sobre juros.", bad: "Alta acima do esperado reforça inflação e pode fortalecer dólar e Treasury yields." }
];

function unfold(text) { return text.replace(/\r?\n[ \t]/g, "").replace(/\\,/g, ",").replace(/\\n/gi, " ").trim(); }
function nyDate(year, month, day, hour, minute) {
  const target = Date.UTC(year, month - 1, day, hour, minute); let value = target;
  for (let index = 0; index < 3; index += 1) { const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date(value)); const row = Object.fromEntries(parts.map((part) => [part.type, part.value])); const observed = Date.UTC(Number(row.year), Number(row.month) - 1, Number(row.day), Number(row.hour) % 24, Number(row.minute)); value += target - observed; }
  return new Date(value);
}
function parseStart(value) {
  const raw = value.split(":").at(-1)?.trim() || ""; const match = raw.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(?:\d{2})?(Z)?$/); if (!match) return null; const [, year, month, day, hour, minute, utc] = match; return utc ? new Date(Date.UTC(+year, +month - 1, +day, +hour, +minute)) : nyDate(+year, +month, +day, +hour, +minute);
}
function localFields(date) { const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(date); const row = Object.fromEntries(parts.map((part) => [part.type, part.value])); return { localDate: `${row.year}-${row.month}-${row.day}`, time: Number(row.hour) * 60 + Number(row.minute), timeLabel: `${row.hour}:${row.minute}` }; }
function toEvent(date, rule, source, sourceUrl, confirmed = true) { return { id: `us-${date.toISOString()}-${rule.label}`, country: "US", dateTime: date.toISOString(), ...localFields(date), label: rule.label, importance: rule.importance, level: rule.importance, detail: confirmed ? "Divulgação confirmada em calendário oficial dos Estados Unidos." : "Horário recorrente; confirme a divulgação na fonte oficial.", good: rule.good, bad: rule.bad, source, sourceUrl, confirmed }; }

async function blsEvents(now) {
  const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 8000);
  try { const response = await fetch(BLS_ICS, { signal: controller.signal, headers: { accept: "text/calendar", "user-agent": "OlaCarlopolis-EconomicCalendar/1.0" } }); if (!response.ok) throw new Error(`BLS ${response.status}`); const calendar = unfold(await response.text()); return calendar.split("BEGIN:VEVENT").slice(1).map((block) => { const startLine = block.match(/DTSTART[^\r\n]*/i)?.[0]; const summary = block.match(/SUMMARY:([^\r\n]*)/i)?.[1]; const date = startLine ? parseStart(startLine) : null; const rule = RULES.find((item) => item.match.test(summary || "")); return date && rule ? toEvent(date, rule, "BLS", "https://www.bls.gov/schedule/2026/home.htm") : null; }).filter(Boolean).filter((event) => new Date(event.dateTime) >= new Date(now.getTime() - 2 * 36e5) && new Date(event.dateTime) <= new Date(now.getTime() + 21 * 864e5)); }
  finally { clearTimeout(timeout); }
}
function weeklyClaims(now) { const ny = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit", weekday: "short" }).formatToParts(now); const row = Object.fromEntries(ny.map((part) => [part.type, part.value])); const offsets = { Sun: 4, Mon: 3, Tue: 2, Wed: 1, Thu: 0, Fri: 6, Sat: 5 }; const base = new Date(Date.UTC(+row.year, +row.month - 1, +row.day + offsets[row.weekday])); const date = nyDate(base.getUTCFullYear(), base.getUTCMonth() + 1, base.getUTCDate(), 8, 30); const rule = { label: "Pedidos de seguro-desemprego", importance: "medium", good: "Número perto ou abaixo do esperado sustenta atividade; reação é melhor se não elevar muito os juros.", bad: "Alta forte indica enfraquecimento do emprego; queda excessiva pode pressionar juros. Compare sempre com o consenso." }; return toEvent(date, rule, "U.S. Department of Labor", "https://www.dol.gov/ui/data.pdf", false); }
function fomcEvents(now) { const dates = [nyDate(2026, 12, 9, 14, 0)]; const rule = { label: "FOMC · decisão de juros", importance: "high", good: "Tom mais favorável a cortes tende a reduzir dólar e juros, apoiando emergentes e ações sensíveis a taxas.", bad: "Tom mais duro ou juros acima do esperado pode fortalecer dólar e pressionar Ibovespa, varejo e construção." }; return dates.filter((date) => date >= now && date <= new Date(now.getTime() + 45 * 864e5)).map((date) => toEvent(date, rule, "Federal Reserve", FOMC_URL)); }

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: HEADERS, body: "" };
  if (event.httpMethod !== "GET") return { statusCode: 405, headers: HEADERS, body: JSON.stringify({ message: "Método não permitido." }) };
  const now = new Date(); let official = []; const errors = [];
  try { official = await blsEvents(now); } catch (error) { errors.push(error.message); }
  const items = [...official, weeklyClaims(now), ...fomcEvents(now)].filter((item, index, array) => array.findIndex((other) => other.id === item.id) === index).sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime));
  return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ source: "BLS, U.S. Department of Labor e Federal Reserve", updatedAt: now.toISOString(), timezone: "America/Sao_Paulo", items, errors }) };
}
