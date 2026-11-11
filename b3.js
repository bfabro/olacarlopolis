/* Painel B3 publico - v4 */
(() => {
  "use strict";
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  const money = (value) => Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const number = (value, digits = 0) => Number(value).toLocaleString("pt-BR", { maximumFractionDigits: digits });
  const percent = (value) => `${Number(value) > 0 ? "+" : ""}${number(value, 2)}%`;
  const dateBR = (value) => new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(`${value}T12:00:00Z`));
  const state = { tab: "resumo", news: [], commodity: "brent", index: "ibov", overview: null, overviewPromise: null, groups: new Map(), groupRequests: new Map() };

  const commodities = [
    { id: "brent", title: "Petróleo Brent", group: "Energia", icon: "BR", assets: ["PETR4", "PETR3", "PRIO3", "RECV3"], summary: "Alta do Brent tende a elevar a receita em reais das produtoras. Refino, câmbio, política de preços e produção podem alterar o efeito." },
    { id: "iron", title: "Minério de ferro", group: "Metais", icon: "FE", assets: ["VALE3", "CMIN3", "CSNA3", "GGBR4"], summary: "A demanda chinesa e o preço do minério afetam mineradoras diretamente e siderúrgicas de forma combinada com aço, carvão e câmbio." },
    { id: "gold", title: "Ouro", group: "Metais", icon: "AU", assets: ["AURA33", "GOLD11"], summary: "O ouro costuma reagir a juros reais, dólar e aversão ao risco. AURA33 tem ainda risco operacional e cambial; GOLD11 acompanha o metal." },
    { id: "soy", title: "Soja", group: "Agrícola", icon: "SO", assets: ["SLCE3", "AGRO3", "SOJA3", "RANI3"], summary: "Preço internacional e câmbio influenciam receitas do agro. Custos, clima, produtividade e hedge definem quanto chega ao resultado." },
    { id: "coffee", title: "Café e agro", group: "Agrícola", icon: "CF", assets: ["JALL3", "AGRO3"], summary: "Esta cesta compara o café internacional com a média normalizada de JALL3 e AGRO3. É uma referência visual de correlação, não uma relação causal perfeita." },
    { id: "sugar", title: "Açúcar", group: "Agrícola", icon: "AC", assets: ["SMTO3", "RAIZ4", "JALL3"], summary: "O mix açúcar/etanol, petróleo e câmbio altera a rentabilidade de usinas. Dívida e produtividade também são decisivas." }
  ];
  const indices = [
    { id: "ibov", label: "Ibovespa" }, { id: "spx", label: "S&P 500" }, { id: "nasdaq", label: "Nasdaq" },
    { id: "dow", label: "Dow Jones" }, { id: "dax", label: "DAX" }, { id: "nikkei", label: "Nikkei 225" }, { id: "china", label: "Xangai" }
  ];

  function newYorkOpenMinutes(now = new Date()) {
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    for (let hour = 12; hour <= 15; hour += 1) {
      const candidate = new Date(Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day), hour, 30));
      const ny = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "2-digit", minute: "2-digit", hour12: false }).format(candidate);
      if (ny === "09:30") {
        const sp = new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit", hour12: false }).format(candidate).split(":").map(Number);
        return sp[0] * 60 + sp[1];
      }
    }
    return 690;
  }

  function tradeEvents(now = new Date()) {
    const nyOpen = newYorkOpenMinutes(now); const nyLabel = `${String(Math.floor(nyOpen / 60)).padStart(2, "0")}:${String(nyOpen % 60).padStart(2, "0")}`;
    return [
      { time: 540, label: "Abertura de WIN e WDO", detail: "Futuros começam a formar a primeira referência local. Observe dólar, índice e o exterior antes de agir.", level: "high" },
      { time: 585, label: "Pré-abertura das ações", detail: "Leilão entre 09:45 e 10:00. Preço teórico e desequilíbrio de ofertas podem mudar rapidamente.", level: "medium" },
      { time: 600, label: "Abertura do mercado à vista", detail: "Janela de maior descoberta de preço. Evite confundir volatilidade inicial com tendência confirmada.", level: "high" },
      { time: nyOpen, label: `Abertura de Nova York (${nyLabel})`, detail: "S&P 500, Nasdaq, dólar e juros americanos podem aumentar a volatilidade da B3.", level: "high" },
      { time: 950, label: "Formação do ajuste do dólar", detail: "Entre 15:50 e 16:00, a apuração do ajuste de DOL/WDO pode elevar o fluxo e a volatilidade.", level: "medium" },
      { time: 1075, label: "Call de fechamento das ações", detail: "Das 17:55 às 18:00. Rebalanceamentos e ordens de fechamento podem distorcer o movimento final.", level: "high" },
      { time: 1110, label: "Encerramento do WDO", detail: "Fim da negociação regular do minidólar às 18:30, conforme a grade vigente.", level: "low" }
    ].sort((a, b) => a.time - b.time);
  }

  async function apiJson(url) {
    const response = await fetch(url, { cache: "no-store" }); const type = response.headers.get("content-type") || "";
    if (!type.includes("application/json")) throw new Error("A prévia foi aberta sem o servidor das APIs.");
    const payload = await response.json(); if (!response.ok) throw new Error(payload.message || `Falha ${response.status}`); return payload;
  }

  function initTicker() {
    const script = document.createElement("script"); script.src = "https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js"; script.async = true;
    script.textContent = JSON.stringify({ symbols: [
      { proName: "BMFBOVESPA:IBOV", title: "Ibovespa" }, { proName: "BMFBOVESPA:PETR4", title: "Petrobras" }, { proName: "BMFBOVESPA:VALE3", title: "Vale" },
      { proName: "FX_IDC:USDBRL", title: "Dólar" }, { proName: "TVC:UKOIL", title: "Brent" }, { proName: "FOREXCOM:SPXUSD", title: "S&P 500" }
    ], showSymbolLogo: true, isTransparent: true, displayMode: "adaptive", colorTheme: "dark", locale: "br" });
    $(".ticker-shell .tradingview-widget-container").appendChild(script);
  }

  function renderTechnical() {
    const container = $("#technicalWidget"); if (container.querySelector("script")) return;
    container.innerHTML = '<div class="tradingview-widget-container__widget"></div>';
    const script = document.createElement("script"); script.src = "https://s3.tradingview.com/external-embedding/embed-widget-technical-analysis.js"; script.async = true;
    script.textContent = JSON.stringify({ interval: "1D", width: "100%", height: 400, isTransparent: true, symbol: "BMFBOVESPA:IBOV", showIntervalTabs: true, displayMode: "multiple", locale: "br", colorTheme: "light" });
    container.appendChild(script);
  }

  function activateTab(tab) {
    state.tab = tab;
    $$(".tab").forEach((button) => { const active = button.dataset.tab === tab; button.classList.toggle("is-active", active); button.setAttribute("aria-selected", String(active)); });
    $$(".tab-panel").forEach((panel) => { const active = panel.dataset.panel === tab; panel.hidden = !active; panel.classList.toggle("is-active", active); });
    if (tab === "commodities") loadCommodity(state.commodity);
    if (tab === "bolsas") ensureOverview().then(renderSelectedIndex).catch(showIndexError);
    if (tab === "analise") { ensureOverview().then(renderAnalysis).catch(() => {}); renderTechnical(); }
    if (tab === "daytrade") ensureOverview().then(renderTradeContext).catch(() => {});
    if (tab === "contratos") loadFutures();
    history.replaceState(null, "", `#${tab}`);
  }

  function initTabs() {
    $$(".tab").forEach((button) => button.addEventListener("click", () => activateTab(button.dataset.tab)));
    $$('[data-open-tab]').forEach((button) => button.addEventListener("click", () => { activateTab(button.dataset.openTab); $(".tabs").scrollIntoView({ behavior: "smooth" }); }));
    const hash = location.hash.slice(1); activateTab($(`.tab[data-tab="${hash}"]`) ? hash : "resumo");
  }

  function normalizeSeries(series, label, color) {
    const first = series.points?.[0]?.value || 1;
    return { label, color, points: (series.points || []).map((point) => ({ date: point.date, value: point.value / first * 100 })) };
  }

  function averageSeries(stocks) {
    const normalized = stocks.map((stock) => normalizeSeries(stock, stock.label, "")).filter((stock) => stock.points.length);
    const values = new Map(); normalized.forEach((stock) => stock.points.forEach((point) => { const row = values.get(point.date) || []; row.push(point.value); values.set(point.date, row); }));
    return [...values.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, row]) => ({ date, value: row.reduce((sum, value) => sum + value, 0) / row.length }));
  }

  function renderLineChart(container, series, caption) {
    const usable = series.filter((item) => item.points?.length > 1);
    if (!usable.length) { container.innerHTML = '<div class="chart-error">Série histórica indisponível.</div>'; return; }
    const dates = [...new Set(usable.flatMap((item) => item.points.map((point) => point.date)))].sort();
    const allValues = usable.flatMap((item) => item.points.map((point) => point.value)); let min = Math.min(...allValues); let max = Math.max(...allValues);
    const spread = Math.max(max - min, 2); min -= spread * .12; max += spread * .12;
    const width = 900, height = 360, left = 54, right = 18, top = 24, bottom = 44; const innerW = width - left - right, innerH = height - top - bottom;
    const x = (date) => left + dates.indexOf(date) / Math.max(dates.length - 1, 1) * innerW; const y = (value) => top + (max - value) / (max - min) * innerH;
    const grids = Array.from({ length: 5 }, (_, index) => { const value = max - index * (max - min) / 4; const yy = y(value); return `<line x1="${left}" y1="${yy}" x2="${width - right}" y2="${yy}"/><text x="${left - 8}" y="${yy + 4}" text-anchor="end">${number(value, 1)}</text>`; }).join("");
    const paths = usable.map((item) => { const d = item.points.map((point, index) => `${index ? "L" : "M"}${x(point.date).toFixed(1)},${y(point.value).toFixed(1)}`).join(" "); return `<path d="${d}" stroke="${item.color}" style="stroke-width:${item.width || 3}px"/><circle cx="${x(item.points.at(-1).date)}" cy="${y(item.points.at(-1).value)}" r="4" fill="${item.color}"/>`; }).join("");
    const ticks = [dates[0], dates[Math.floor((dates.length - 1) / 2)], dates.at(-1)].filter(Boolean).map((date) => `<text class="date" x="${x(date)}" y="${height - 14}" text-anchor="middle">${dateBR(date)}</text>`).join("");
    const legend = usable.map((item) => { const change = item.points.at(-1).value - 100; return `<span><i style="background:${item.color}"></i><b>${esc(item.label)}</b><small class="${change >= 0 ? "positive" : "negative"}">${percent(change)} no período</small></span>`; }).join("");
    container.innerHTML = `<div class="chart-legend">${legend}</div><svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(caption)}"><g class="grid">${grids}</g><g class="axis">${ticks}</g><g class="lines">${paths}</g></svg><small class="chart-caption">Base 100 no início do período · últimos três meses · fechamento diário</small>`;
  }

  function renderCommodities() {
    $("#commodityList").innerHTML = commodities.map((item) => `<button class="commodity-button ${item.id === state.commodity ? "is-active" : ""}" type="button" data-commodity="${item.id}"><span class="commodity-symbol">${item.icon}</span><span><strong>${item.title}</strong><small>${item.group} · ${item.assets.join(" · ")}</small></span><b>›</b></button>`).join("");
    $$('[data-commodity]').forEach((button) => button.addEventListener("click", () => { state.commodity = button.dataset.commodity; selectCommodityMeta(); loadCommodity(state.commodity); })); selectCommodityMeta();
  }

  function selectCommodityMeta() {
    const item = commodities.find((entry) => entry.id === state.commodity) || commodities[0];
    $$('[data-commodity]').forEach((button) => button.classList.toggle("is-active", button.dataset.commodity === item.id)); $("#commodityKicker").textContent = item.group; $("#commodityTitle").textContent = item.title;
    $("#commodityImpact").innerHTML = `<p>${esc(item.summary)}</p><div class="asset-chips">${item.assets.map((asset) => `<span class="asset-chip">${asset}</span>`).join("")}</div>`;
  }

  async function loadCommodity(id) {
    selectCommodityMeta(); const container = $("#commodityChart"); if (state.groups.has(id)) { renderCommodityChart(id); return; }
    container.innerHTML = '<div class="chart-loading">Carregando commodity e média das ações…</div>';
    try { let request = state.groupRequests.get(id); if (!request) { request = apiJson(`/api/b3-series?group=${encodeURIComponent(id)}`); state.groupRequests.set(id, request); } const payload = await request; state.groups.set(id, payload); if (state.commodity === id && state.tab === "commodities") renderCommodityChart(id); }
    catch (error) { state.groupRequests.delete(id); if (state.commodity === id) container.innerHTML = `<div class="chart-error"><strong>Não foi possível carregar o gráfico.</strong><span>${esc(error.message)}</span></div>`; }
  }

  function renderCommodityChart(id) {
    const payload = state.groups.get(id); if (!payload) return; const average = { label: `Média: ${payload.stocks.map((stock) => stock.label).join(" + ")}`, color: "#2563eb", points: averageSeries(payload.stocks) };
    renderLineChart($("#commodityChart"), [normalizeSeries(payload.commodity, payload.commodity.label, "#dc2626"), average], `${payload.commodity.label} comparado à média das ações relacionadas`);
  }

  function renderIndices() {
    $("#indexButtons").innerHTML = [...indices, { id: "all", label: "Todas + média" }].map((item) => `<button class="index-button ${item.id === state.index ? "is-active" : ""}" type="button" data-index="${item.id}">${item.label}</button>`).join("");
    $$('[data-index]').forEach((button) => button.addEventListener("click", () => { state.index = button.dataset.index; renderSelectedIndex(); }));
  }

  function renderIndexSummary() {
    if (!state.overview) return; const listed = indices.map((item) => state.overview.indices[item.id]);
    $("#indexSummary").innerHTML = indices.slice(0, 4).map((item) => { const data = state.overview.indices[item.id]; const tone = data.change1d >= 0 ? "positive" : "negative"; return `<article><span>${item.label}</span><strong>${number(data.current, data.current < 1000 ? 2 : 0)}</strong><small class="${tone}">${percent(data.change1d)} no dia</small></article>`; }).join("");
    const sum = listed.reduce((total, item) => total + item.change1d, 0); const average = sum / listed.length; const highs = listed.filter((item) => item.change1d > 0).length;
    $("#aggregateStats").innerHTML = `<article><span>Soma das variações</span><strong class="${sum >= 0 ? "positive" : "negative"}">${percent(sum)}</strong></article><article><span>Média das bolsas</span><strong class="${average >= 0 ? "positive" : "negative"}">${percent(average)}</strong></article><article><span>Amplitude global</span><strong>${highs} altas · ${listed.length - highs} baixas</strong></article>`;
  }

  function renderSelectedIndex() {
    if (!state.overview) return; $$('[data-index]').forEach((button) => button.classList.toggle("is-active", button.dataset.index === state.index));
    if (state.index === "all") {
      const colors = ["#dc2626", "#2563eb", "#7c3aed", "#ea580c", "#0891b2", "#ca8a04", "#db2777"]; const listed = indices.map((item, index) => normalizeSeries(state.overview.indices[item.id], item.label, colors[index]));
      const average = { label: "Média global", color: "#071c2b", width: 5, points: averageSeries(indices.map((item) => state.overview.indices[item.id])) }; $("#indexTitle").textContent = "Todas as bolsas + média global";
      renderLineChart($("#indexChart"), [...listed, average], "Comparação de todas as bolsas e sua média global"); return;
    }
    const data = state.overview.indices[state.index]; if (!data) return; $("#indexTitle").textContent = data.label; renderLineChart($("#indexChart"), [normalizeSeries(data, data.label, "#0a7a61")], `Evolução do ${data.label}`);
  }
  function showIndexError(error) { $("#indexChart").innerHTML = `<div class="chart-error"><strong>Bolsas temporariamente indisponíveis.</strong><span>${esc(error.message)}</span></div>`; }

  async function ensureOverview() {
    if (state.overview) return state.overview;
    if (!state.overviewPromise) state.overviewPromise = apiJson("/api/b3-series").then((payload) => { state.overview = payload; renderQuotes(); renderIndexSummary(); renderAnalysis(); return payload; }).catch((error) => { state.overviewPromise = null; throw error; }); return state.overviewPromise;
  }

  function renderQuotes() {
    if (!state.overview) return; const quotes = state.overview.quotes || [];
    $("#quoteGrid").innerHTML = quotes.map((quote) => { const tone = quote.change1d > 0 ? "positive" : quote.change1d < 0 ? "negative" : "neutral"; return `<article class="quote-card"><div class="quote-top"><div><span class="quote-ticker">${esc(quote.label)}</span><span class="quote-name">B3 · fechamento mais recente</span></div><span class="quote-change ${tone}">${percent(quote.change1d)}</span></div><strong class="quote-price">${money(quote.current)}</strong><div class="quote-foot"><span>Volume ${number(quote.volume || 0)}</span><span>Dados públicos</span></div></article>`; }).join("");
    $("#quotesUpdated").textContent = `Atualizado ${new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(state.overview.updatedAt))} · Yahoo Finance`;
    const average = quotes.reduce((sum, quote) => sum + quote.change1d, 0) / Math.max(quotes.length, 1); const bias = $("#marketBias"); bias.className = `badge ${average > .35 ? "positive" : average < -.35 ? "negative" : "neutral"}`; bias.textContent = average > .35 ? "Amostra com viés positivo" : average < -.35 ? "Amostra com viés negativo" : "Leitura mista na amostra";
  }

  function renderAnalysis() {
    if (!state.overview) return; const { indices: idx, macro } = state.overview;
    const signals = [
      { label: "Ibovespa 5d", value: idx.ibov.change5d, weight: 1.5 }, { label: "S&P 500 1d", value: idx.spx.change1d, weight: .8 }, { label: "Nasdaq 1d", value: idx.nasdaq.change1d, weight: .6 },
      { label: "Dólar/Real 1d", value: -macro.usdbrl.change1d, weight: .7 }, { label: "Brent 5d", value: macro.brent.change5d, weight: .45 }, { label: "Minério 5d", value: macro.iron.change5d, weight: .55 }
    ];
    const score = signals.reduce((sum, item) => sum + Math.max(-3, Math.min(3, item.value)) * item.weight, 0) / signals.reduce((sum, item) => sum + item.weight, 0); const positiveCount = signals.filter((item) => item.value > .15).length; const negativeCount = signals.filter((item) => item.value < -.15).length; const confidence = Math.abs(positiveCount - negativeCount) >= 4 ? "convergência forte" : Math.abs(positiveCount - negativeCount) >= 2 ? "convergência moderada" : "sinais divididos";
    const direction = score > .65 ? "Viés provável de alta" : score < -.65 ? "Viés provável de baixa" : "Direção lateral ou indefinida"; const tone = score > .65 ? "positive" : score < -.65 ? "negative" : "neutral";
    const title = $("#directionTitle"); title.textContent = direction; title.className = tone; $("#directionCard").dataset.tone = tone; $("#directionText").textContent = `Leitura quantitativa com ${confidence}. O placar combina tendência recente, exterior, câmbio, petróleo e minério; não é previsão nem recomendação.`; $("#directionNeedle").style.left = `${Math.max(5, Math.min(95, 50 + score * 13))}%`;
    $("#directionSignals").innerHTML = signals.map((item) => `<span><small>${item.label}</small><strong class="${item.value >= 0 ? "positive" : "negative"}">${percent(item.value)}</strong></span>`).join(""); $("#analysisTimestamp").textContent = `Consolidado em ${new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(state.overview.updatedAt))}.`;
    const levels = idx.ibov.levels; if (levels) { const current = idx.ibov.current; const rows = [["S2", levels.support2, "support"], ["S1", levels.support1, "support"], ["Pivô", levels.pivot, "pivot"], ["R1", levels.resistance1, "resistance"], ["R2", levels.resistance2, "resistance"]]; $("#supportLevels").innerHTML = rows.map(([label, value, type]) => `<span class="${type}"><small>${label}</small><strong>${number(value, 0)}</strong><em>${value < current ? "abaixo" : value > current ? "acima" : "no preço"}</em></span>`).join("") + `<p>Ibovespa atual: <b>${number(current, 0)}</b> · referência: ${dateBR(levels.referenceDate)}. Níveis aproximados, não ordens de operação.</p>`; }
  }

  function marketMinutes(now = new Date()) {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(now);
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return { weekday: values.weekday, minutes: Number(values.hour) * 60 + Number(values.minute) };
  }

  function renderTradeTimeline(now = new Date()) {
    const clock = marketMinutes(now); const businessDay = !["Sat", "Sun"].includes(clock.weekday); const events = tradeEvents(now); const next = businessDay ? events.find((event) => event.time > clock.minutes) : null;
    const timeLabel = (minutes) => `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
    $("#tradeTimeline").innerHTML = events.map((event) => `<div class="trade-event ${businessDay && clock.minutes >= event.time ? "is-past" : ""} ${next === event ? "is-next" : ""}"><time>${timeLabel(event.time)}</time><i class="${event.level}"></i><p><strong>${esc(event.label)}</strong><small>${esc(event.detail)}</small></p></div>`).join("");

    let phase = "Mercado fechado"; let phaseText = "Use o período sem negociação para preparar níveis, cenários e limite de perda."; let tone = "neutral";
    if (businessDay && clock.minutes >= 535 && clock.minutes < 540) { phase = "Pré-abertura dos futuros"; phaseText = "Confira exterior, dólar e agenda antes do início de WIN e WDO."; tone = "attention"; }
    else if (businessDay && clock.minutes >= 540 && clock.minutes < 585) { phase = "Futuros em negociação"; phaseText = "WIN e WDO já negociam; ações ainda não abriram. O primeiro movimento pode não sobreviver à abertura do à vista."; tone = "active"; }
    else if (businessDay && clock.minutes >= 585 && clock.minutes < 600) { phase = "Pré-abertura das ações"; phaseText = "Observe preço teórico, volume e desequilíbrio do leilão sem antecipar uma entrada."; tone = "attention"; }
    else if (businessDay && clock.minutes >= 600 && clock.minutes < 615) { phase = "Abertura: volatilidade elevada"; phaseText = "Primeiros 15 minutos: espere estrutura, liquidez e confirmação do nível planejado."; tone = "attention"; }
    else if (businessDay && clock.minutes >= 615 && clock.minutes < 1075) { phase = "Pregão regular em andamento"; phaseText = "Valide tendência, gatilho, stop e retorno potencial antes de enviar a ordem."; tone = "active"; }
    else if (businessDay && clock.minutes >= 1075 && clock.minutes < 1080) { phase = "Call de fechamento"; phaseText = "Ações estão em leilão de fechamento; spreads e execução seguem dinâmica própria."; tone = "attention"; }
    else if (businessDay && clock.minutes >= 1080 && clock.minutes < 1110) { phase = "Ações encerradas; derivativos abertos"; phaseText = "WIN/WDO ainda podem negociar, mas a referência do mercado à vista já fechou."; tone = "active"; }
    $("#tradeNow").dataset.tone = tone; $("#tradePhase").textContent = phase; $("#tradePhaseText").textContent = phaseText;
    if (next) { $("#nextEventTime").textContent = timeLabel(next.time); $("#nextEventLabel").textContent = next.label; }
    else { $("#nextEventTime").textContent = "Próximo pregão"; $("#nextEventLabel").textContent = "Revise a agenda econômica antes da abertura"; }
  }

  function renderTradeContext() {
    if (!state.overview) return; const { indices: idx, macro } = state.overview; const levels = idx.ibov.levels; const abovePivot = levels ? idx.ibov.current >= levels.pivot : null;
    const score = (idx.ibov.change1d * 1.2) + (idx.spx.change1d * .7) + (idx.nasdaq.change1d * .5) - (macro.usdbrl.change1d * .6) + (macro.brent.change1d * .25);
    const badge = $("#tradeContextBadge"); const tone = score > .8 ? "positive" : score < -.8 ? "negative" : "neutral"; badge.className = `badge ${tone}`; badge.textContent = score > .8 ? "Contexto mais favorável à alta" : score < -.8 ? "Contexto mais favorável à baixa" : "Contexto misto";
    const items = [
      ["Ibovespa", percent(idx.ibov.change1d), idx.ibov.change1d],
      ["S&P 500", percent(idx.spx.change1d), idx.spx.change1d],
      ["Dólar/real", percent(macro.usdbrl.change1d), -macro.usdbrl.change1d],
      ["Petróleo Brent", percent(macro.brent.change1d), macro.brent.change1d]
    ];
    $("#tradeContext").innerHTML = `<div class="context-quotes">${items.map(([label, value, signal]) => `<span><small>${label}</small><strong class="${signal >= 0 ? "positive" : "negative"}">${value}</strong></span>`).join("")}</div>${levels ? `<div class="pivot-position"><span>Ibovespa está <b>${abovePivot ? "acima" : "abaixo"}</b> do pivô diário</span><strong>${number(levels.pivot, 0)}</strong><small>S1 ${number(levels.support1, 0)} · R1 ${number(levels.resistance1, 0)}</small></div>` : ""}<p class="source-note">Contexto calculado com fechamentos públicos; pode haver atraso e não substitui o book e o gráfico da corretora.</p>`;
  }

  function updateTradeChecklist() {
    const checks = $$('#tradeChecklist input[type="checkbox"]'); const done = checks.filter((input) => input.checked).length; $("#tradeCheckText").textContent = `${done} de ${checks.length} itens confirmados`; $("#tradeCheckBar").style.width = `${done / checks.length * 100}%`;
  }

  function calculateTradeRisk() {
    const capital = Number($("#riskCapital").value); const riskPercent = Number($("#riskPercent").value); const entry = Number($("#riskEntry").value); const stop = Number($("#riskStop").value); const output = $("#riskResult");
    if (!(capital > 0 && riskPercent > 0 && entry > 0 && stop > 0)) { output.innerHTML = "<span>Preencha entrada e stop para estimar a posição.</span>"; return; }
    const distance = Math.abs(entry - stop); if (!distance) { output.innerHTML = '<span class="negative">Entrada e stop precisam ser diferentes.</span>'; return; }
    const riskBudget = capital * riskPercent / 100; const byRisk = Math.floor(riskBudget / distance); const byCapital = Math.floor(capital / entry); const quantity = Math.max(0, Math.min(byRisk, byCapital)); const effectiveRisk = quantity * distance; const target = stop < entry ? entry + distance * 2 : entry - distance * 2;
    output.innerHTML = `<div><small>Risco planejado</small><strong>${money(riskBudget)}</strong></div><div><small>Quantidade máxima</small><strong>${number(quantity)} ações</strong></div><div><small>Risco estimado</small><strong>${money(effectiveRisk)}</strong></div><div><small>Alvo teórico de 2R</small><strong>${money(target)}</strong></div>`;
  }

  function initDayTrade() {
    renderTradeTimeline(); $$('#tradeChecklist input[type="checkbox"]').forEach((input) => input.addEventListener("change", updateTradeChecklist));
    $("#resetTradeChecklist").addEventListener("click", () => { $$('#tradeChecklist input[type="checkbox"]').forEach((input) => { input.checked = false; }); updateTradeChecklist(); });
    ["#riskCapital", "#riskPercent", "#riskEntry", "#riskStop"].forEach((selector) => $(selector).addEventListener("input", calculateTradeRisk)); updateTradeChecklist(); calculateTradeRisk();
  }

  async function loadNews(force = false) {
    $("#refreshNews").disabled = true;
    try { const payload = await apiJson(`/api/b3-news${force ? "?refresh=1" : ""}`); state.news = (payload.items || []).slice(0, 9); renderNews(); }
    catch (error) { const message = `<div class="panel-card"><strong>Notícias temporariamente indisponíveis.</strong><p class="source-note">${esc(error.message)}</p></div>`; $("#newsPreview").innerHTML = message; $("#newsFull").innerHTML = message; } finally { $("#refreshNews").disabled = false; }
  }
  function renderNews() {
    $("#newsPreview").innerHTML = state.news.slice(0, 3).map((item, index) => `<a class="news-mini" href="${esc(item.link)}" target="_blank" rel="noopener"><span class="news-number">0${index + 1}</span><span><strong>${esc(item.title)}</strong><small>${esc(item.source)} · ${esc(item.relativeDate)}</small></span></a>`).join("");
    $("#newsFull").innerHTML = state.news.map((item) => `<a class="news-card" href="${esc(item.link)}" target="_blank" rel="noopener"><span class="news-tag">${esc(item.asset || "Mercado")}</span><h3>${esc(item.title)}</h3><p>${esc(item.description || "Abra para ler a notícia completa no veículo responsável.")}</p><span class="news-meta"><span>${esc(item.source)}</span><span>${esc(item.relativeDate)} ↗</span></span></a>`).join("");
  }

  let futuresRequest = null;
  async function loadFutures() {
    if (futuresRequest) return futuresRequest;
    futuresRequest = apiJson("/api/b3-futures").then((payload) => { $("#d1Futures").innerHTML = payload.contracts.map((item) => `<article class="d1-card"><div><span>${esc(item.asset)} · ${esc(item.symbol)}</span><small>${dateBR(item.date)} · contratos negociados</small></div><strong>${number(item.tradedContracts)}</strong><p>Ajuste ${number(item.settlement, 2)} <b class="${item.changePercent >= 0 ? "positive" : "negative"}">${percent(item.changePercent)}</b></p></article>`).join(""); const latest = payload.contracts.map((item) => item.date).sort().at(-1); $("#contractsUpdated").textContent = `Negociados D−1: ${dateBR(latest)} · posições em aberto: 09/11/2026`; return payload; }).catch((error) => { futuresRequest = null; $("#d1Futures").innerHTML = `<div class="chart-error"><strong>Fechamento D−1 indisponível.</strong><span>${esc(error.message)}</span></div>`; throw error; }); return futuresRequest;
  }

  function updateClock() {
    const now = new Date(); const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(now); const values = Object.fromEntries(parts.map((part) => [part.type, part.value])); const minutes = Number(values.hour) * 60 + Number(values.minute); const open = !["Sat", "Sun"].includes(values.weekday) && minutes >= 600 && minutes <= 1075;
    $("#marketStatus").textContent = open ? "Mercado em negociação" : "Mercado fechado"; $(".status-dot").classList.toggle("open", open); $("#marketClock").textContent = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(now); renderTradeTimeline(now);
  }

  $("#refreshNews").addEventListener("click", () => loadNews(true));
  initTicker(); renderCommodities(); renderIndices(); initDayTrade(); initTabs(); updateClock(); setInterval(updateClock, 60000);
  ensureOverview().catch((error) => { $("#quoteGrid").innerHTML = `<div class="panel-card" style="grid-column:1/-1"><strong>Cotações temporariamente indisponíveis.</strong><p class="source-note">${esc(error.message)}</p></div>`; $("#quotesUpdated").textContent = "Fonte indisponível"; }); loadNews();
})();
