/* Painel B3 publico - v2 */
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
    const paths = usable.map((item) => { const d = item.points.map((point, index) => `${index ? "L" : "M"}${x(point.date).toFixed(1)},${y(point.value).toFixed(1)}`).join(" "); return `<path d="${d}" stroke="${item.color}"/><circle cx="${x(item.points.at(-1).date)}" cy="${y(item.points.at(-1).value)}" r="4" fill="${item.color}"/>`; }).join("");
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
    const payload = state.groups.get(id); if (!payload) return; const average = { label: `Média: ${payload.stocks.map((stock) => stock.label).join(" + ")}`, color: "#146aa2", points: averageSeries(payload.stocks) };
    renderLineChart($("#commodityChart"), [normalizeSeries(payload.commodity, payload.commodity.label, "#0a9667"), average], `${payload.commodity.label} comparado à média das ações relacionadas`);
  }

  function renderIndices() {
    $("#indexButtons").innerHTML = indices.map((item) => `<button class="index-button ${item.id === state.index ? "is-active" : ""}" type="button" data-index="${item.id}">${item.label}</button>`).join("");
    $$('[data-index]').forEach((button) => button.addEventListener("click", () => { state.index = button.dataset.index; renderSelectedIndex(); }));
  }

  function renderIndexSummary() {
    if (!state.overview) return; $("#indexSummary").innerHTML = indices.slice(0, 4).map((item) => { const data = state.overview.indices[item.id]; const tone = data.change1d >= 0 ? "positive" : "negative"; return `<article><span>${item.label}</span><strong>${number(data.current, data.current < 1000 ? 2 : 0)}</strong><small class="${tone}">${percent(data.change1d)} no dia</small></article>`; }).join("");
  }

  function renderSelectedIndex() {
    if (!state.overview) return; const data = state.overview.indices[state.index]; if (!data) return;
    $$('[data-index]').forEach((button) => button.classList.toggle("is-active", button.dataset.index === state.index)); $("#indexTitle").textContent = data.label; renderLineChart($("#indexChart"), [normalizeSeries(data, data.label, "#0a7a61")], `Evolução do ${data.label}`);
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
  }

  async function loadNews(force = false) {
    $("#refreshNews").disabled = true;
    try { const payload = await apiJson(`/api/b3-news${force ? "?refresh=1" : ""}`); state.news = (payload.items || []).slice(0, 3); renderNews(); }
    catch (error) { const message = `<div class="panel-card"><strong>Notícias temporariamente indisponíveis.</strong><p class="source-note">${esc(error.message)}</p></div>`; $("#newsPreview").innerHTML = message; $("#newsFull").innerHTML = message; } finally { $("#refreshNews").disabled = false; }
  }
  function renderNews() {
    $("#newsPreview").innerHTML = state.news.map((item, index) => `<a class="news-mini" href="${esc(item.link)}" target="_blank" rel="noopener"><span class="news-number">0${index + 1}</span><span><strong>${esc(item.title)}</strong><small>${esc(item.source)} · ${esc(item.relativeDate)}</small></span></a>`).join("");
    $("#newsFull").innerHTML = state.news.map((item) => `<a class="news-card" href="${esc(item.link)}" target="_blank" rel="noopener"><span class="news-tag">${esc(item.asset || "Mercado")}</span><h3>${esc(item.title)}</h3><p>${esc(item.description || "Abra para ler a notícia completa no veículo responsável.")}</p><span class="news-meta"><span>${esc(item.source)}</span><span>${esc(item.relativeDate)} ↗</span></span></a>`).join("");
  }

  let futuresRequest = null;
  async function loadFutures() {
    if (futuresRequest) return futuresRequest;
    futuresRequest = apiJson("/api/b3-futures").then((payload) => { $("#d1Futures").innerHTML = payload.contracts.map((item) => `<article class="d1-card"><div><span>${esc(item.asset)} · ${esc(item.symbol)}</span><small>${dateBR(item.date)} · contratos negociados</small></div><strong>${number(item.tradedContracts)}</strong><p>Ajuste ${number(item.settlement, 2)} <b class="${item.changePercent >= 0 ? "positive" : "negative"}">${percent(item.changePercent)}</b></p></article>`).join(""); const latest = payload.contracts.map((item) => item.date).sort().at(-1); $("#contractsUpdated").textContent = `Negociados D−1: ${dateBR(latest)} · posições em aberto: 09/11/2026`; return payload; }).catch((error) => { futuresRequest = null; $("#d1Futures").innerHTML = `<div class="chart-error"><strong>Fechamento D−1 indisponível.</strong><span>${esc(error.message)}</span></div>`; throw error; }); return futuresRequest;
  }

  function updateClock() {
    const now = new Date(); const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(now); const values = Object.fromEntries(parts.map((part) => [part.type, part.value])); const minutes = Number(values.hour) * 60 + Number(values.minute); const open = !["Sat", "Sun"].includes(values.weekday) && minutes >= 600 && minutes <= 1075;
    $("#marketStatus").textContent = open ? "Mercado em negociação" : "Mercado fechado"; $(".status-dot").classList.toggle("open", open); $("#marketClock").textContent = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(now);
  }

  $("#refreshNews").addEventListener("click", () => loadNews(true));
  initTicker(); renderCommodities(); renderIndices(); initTabs(); updateClock(); setInterval(updateClock, 60000);
  ensureOverview().catch((error) => { $("#quoteGrid").innerHTML = `<div class="panel-card" style="grid-column:1/-1"><strong>Cotações temporariamente indisponíveis.</strong><p class="source-note">${esc(error.message)}</p></div>`; $("#quotesUpdated").textContent = "Fonte indisponível"; }); loadNews();
})();
