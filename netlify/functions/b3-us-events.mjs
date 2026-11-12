import tls from "node:tls";

if (typeof tls.getCACertificates === "function" && typeof tls.setDefaultCACertificates === "function") {
  tls.setDefaultCACertificates([...tls.getCACertificates("default"), ...tls.getCACertificates("system")]);
}

const HEADERS = { "access-control-allow-origin": "*", "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=1800, stale-while-revalidate=3600", "x-content-type-options": "nosniff" };
const BLS_ICS = "https://www.bls.gov/schedule/news_release/bls.ics";
const FOMC_URL = "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm";
const PUBLIC_CALENDAR = "https://nfs.faireconomy.media/ff_calendar_thisweek.json";
const PUBLIC_CALENDAR_PRIMARY = "https://showmytrades.com/api/public/calendar/v1?currency=USD&impact=all&days=8";

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
function supplementalRule(title) {
  if (/FOMC.*Speaks|Fed.*Speaks|Fed's.*speech/i.test(title)) return { label: title.replace(/FOMC Member /i, "Discurso de ").replace(/Fed's (.+) speech/i, "Discurso de $1 (Fed)").replace(/\s+Speaks$/i, " (Fed)"), good: "Tom mais favorável a cortes pode reduzir juros e dólar, apoiando a B3.", bad: "Tom mais duro pode elevar Treasury yields e dólar, pressionando ações brasileiras." };
  if (/Continuing Jobless Claims/i.test(title)) return { label: "Pedidos contínuos de seguro-desemprego", good: "Queda moderada indica emprego resiliente sem choque relevante para os juros.", bad: "Alta acima do esperado pode sinalizar enfraquecimento do mercado de trabalho." };
  if (/Crude Oil Inventories|Crude Oil Stocks Change/i.test(title)) return { label: "Estoques de petróleo bruto · EIA", good: "Queda maior que a esperada tende a apoiar o petróleo e pode favorecer PETR4, PETR3 e PRIO3.", bad: "Aumento acima do esperado pode pressionar petróleo e produtoras; confirme câmbio e produção." };
  if (/Heating Oil Stocks Change/i.test(title)) return { label: "Estoques de óleo de aquecimento · EIA", good: "Queda dos estoques pode sustentar derivados e preço do petróleo.", bad: "Acúmulo acima do esperado pode sinalizar demanda mais fraca por derivados." };
  if (/Gasoline Stocks Change/i.test(title)) return { label: "Estoques de gasolina · EIA", good: "Queda maior que a esperada pode apoiar margens e petróleo.", bad: "Alta dos estoques pode sinalizar consumo menor e pressionar o complexo de energia." };
  if (/Distillate Stocks Change/i.test(title)) return { label: "Estoques de destilados · EIA", good: "Queda dos estoques pode apoiar preços de diesel e petróleo.", bad: "Aumento acima do esperado pode pesar sobre energia e produtoras." };
  if (/Existing Home Sales/i.test(title)) return { label: "Vendas de casas usadas", good: "Dado firme perto do esperado sustenta atividade sem gerar surpresa forte de juros.", bad: "Queda relevante sinaliza desaceleração; alta excessiva pode elevar expectativa de juros." };
  if (/Bond Auction|Note Auction/i.test(title)) return { label: title.replace(/(\d+)-(?:y|Year) (?:Bond|Note) Auction/i, "$1 anos · leilão de Treasury"), good: "Demanda forte e rendimento menor tendem a aliviar juros globais e favorecer emergentes.", bad: "Demanda fraca e rendimento maior podem fortalecer dólar e pressionar a B3." };
  if (/Federal Budget Balance|Monthly Budget Statement/i.test(title)) return { label: "Balanço orçamentário federal", good: "Déficit menor que o esperado pode aliviar pressão sobre títulos e juros longos.", bad: "Déficit maior pode pressionar Treasury yields e reduzir apetite por risco." };
  if (/Retail Sales/i.test(title)) return { label: "Vendas no varejo dos EUA", good: "Crescimento moderado sustenta atividade sem pressionar excessivamente os juros.", bad: "Dado muito forte pode elevar juros; muito fraco aumenta receio de desaceleração." };
  if (/Consumer Confidence|Michigan/i.test(title)) return { label: "Confiança do consumidor", good: "Confiança estável ou melhor sustenta atividade e apetite por risco.", bad: "Queda forte pode sinalizar consumo mais fraco e aumentar aversão ao risco." };
  if (/ISM|PMI/i.test(title)) return { label: title.replace(/m\/m|q\/q|y\/y/gi, "").trim(), good: "Atividade acima de 50 e próxima do esperado favorece crescimento sem choque de juros.", bad: "Contração ou surpresa inflacionária pode pressionar bolsas e moedas emergentes." };
  if (/GDP/i.test(title)) return { label: "PIB dos Estados Unidos", good: "Crescimento saudável perto do esperado apoia ativos de risco e commodities.", bad: "Fraqueza relevante aumenta temor de recessão; surpresa forte pode elevar juros." };
  return { label: title, good: "Resultado favorável ao crescimento e à inflação tende a apoiar o apetite por risco.", bad: "Surpresa desfavorável pode elevar volatilidade, dólar e juros americanos." };
}
async function supplementalEvents(now) {
  const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    let rows; let sourceUrl = PUBLIC_CALENDAR_PRIMARY; let source = "ShowMyTrades · calendário público";
    try {
      const response = await fetch(PUBLIC_CALENDAR_PRIMARY, { signal: controller.signal, headers: { accept: "application/json", "user-agent": "OlaCarlopolis-EconomicCalendar/1.0" } });
      if (!response.ok) throw new Error(`ShowMyTrades ${response.status}`);
      const payload = await response.json(); rows = (payload.events || []).map((item) => ({ ...item, country: item.currency, date: item.time, impact: item.impact?.[0]?.toUpperCase() + item.impact?.slice(1) }));
    } catch (primaryError) {
      const response = await fetch(PUBLIC_CALENDAR, { signal: controller.signal, headers: { accept: "application/json", "user-agent": "OlaCarlopolis-EconomicCalendar/1.0" } });
      if (!response.ok) throw new Error(`${primaryError.message}; agenda reserva ${response.status}`);
      rows = await response.json(); sourceUrl = PUBLIC_CALENDAR; source = "Forex Factory · exportação pública";
    }
    const selectedLow = /FOMC.*Speaks|Fed.*Speaks|Fed's.*speech|Crude Oil Inventories|Existing Home Sales|Bond Auction|Note Auction|Federal Budget Balance|Retail Sales|Consumer Confidence|Michigan|ISM|PMI|GDP/i;
    return rows.filter((item) => item.country === "USD" && (item.impact === "High" || item.impact === "Medium" || selectedLow.test(item.title))).map((item) => { const date = new Date(item.date); const rule = supplementalRule(item.title); const importance = item.impact === "High" ? "high" : item.impact === "Medium" ? "medium" : "low"; return { ...toEvent(date, { ...rule, importance }, source, sourceUrl, item.confidence === "official"), detail: "Evento de agenda complementar; confirme horário e resultado na fonte oficial.", calendarType: "supplemental", forecast: item.forecast || null, previous: item.previous || null, actual: item.actual || null, originalTitle: item.title }; }).filter((event) => new Date(event.dateTime) >= new Date(now.getTime() - 6 * 36e5) && new Date(event.dateTime) <= new Date(now.getTime() + 8 * 864e5));
  }
  finally { clearTimeout(timeout); }
}
function family(label = "") { if (/seguro-desemprego|Unemployment Claims|Initial Jobless Claims/i.test(label)) return "claims"; if (/PPI|inflação ao produtor/i.test(label)) return "ppi"; if (/CPI|inflação ao consumidor/i.test(label)) return "cpi"; return label.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); }

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: HEADERS, body: "" };
  if (event.httpMethod !== "GET") return { statusCode: 405, headers: HEADERS, body: JSON.stringify({ message: "Método não permitido." }) };
  const now = new Date(); let official = []; let supplemental = []; const errors = [];
  try { official = await blsEvents(now); } catch (error) { errors.push(error.message); }
  try { supplemental = await supplementalEvents(now); } catch (error) { errors.push(error.message); }
  const base = [...official, weeklyClaims(now), ...fomcEvents(now)]; supplemental.forEach((extra) => { const existing = base.find((item) => item.localDate === extra.localDate && item.time === extra.time && family(item.label) === family(extra.originalTitle)); if (existing) { existing.forecast = extra.forecast; existing.previous = extra.previous; existing.calendarSource = "Agenda pública complementar"; } else base.push(extra); }); const items = base.filter((item, index, array) => array.findIndex((other) => other.id === item.id) === index).sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime));
  return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ source: "BLS, U.S. Department of Labor, Federal Reserve e agenda pública complementar", updatedAt: now.toISOString(), timezone: "America/Sao_Paulo", items, errors }) };
}
