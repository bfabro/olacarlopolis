/* Painel B3 publico - v9 */
(() => {
  "use strict";
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  const money = (value) => Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const number = (value, digits = 0) => Number(value).toLocaleString("pt-BR", { maximumFractionDigits: digits });
  const percent = (value) => `${Number(value) > 0 ? "+" : ""}${number(value, 2)}%`;
  const dateBR = (value) => new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(`${value}T12:00:00Z`));
  const state = { tab: "resumo", news: [], newsUpdatedAt: null, commodity: "brent", index: "ibov", overview: null, overviewPromise: null, strength: null, strengthPromise: null, strengthTicker: "VALE3", strengthSort: "weight", strengthSortDirection: "desc", strengthView: "stocks", premarket: null, premarketPromise: null, premarketCommodity: "brent", groups: new Map(), groupRequests: new Map() };

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
      { id: "futures", time: 540, label: "Abertura de WIN e WDO", detail: "Futuros começam a formar a primeira referência local. Observe dólar, índice e o exterior antes de agir.", level: "high" },
      { id: "preopen", time: 585, label: "Pré-abertura das ações", detail: "Leilão entre 09:45 e 10:00. Preço teórico e desequilíbrio de ofertas podem mudar rapidamente.", level: "medium" },
      { id: "stocks", time: 600, label: "Abertura do mercado à vista", detail: "Janela de maior descoberta de preço. Evite confundir volatilidade inicial com tendência confirmada.", level: "high" },
      { id: "ny", time: nyOpen, label: `Abertura de Nova York (${nyLabel})`, detail: "S&P 500, Nasdaq, dólar e juros americanos podem aumentar a volatilidade da B3.", level: "high" },
      { id: "dollar", time: 950, label: "Formação do ajuste do dólar", detail: "Entre 15:50 e 16:00, a apuração do ajuste de DOL/WDO pode elevar o fluxo e a volatilidade.", level: "medium" },
      { id: "close", time: 1075, label: "Call de fechamento das ações", detail: "Das 17:55 às 18:00. Rebalanceamentos e ordens de fechamento podem distorcer o movimento final.", level: "high" },
      { id: "wdo-close", time: 1110, label: "Encerramento do WDO", detail: "Fim da negociação regular do minidólar às 18:30, conforme a grade vigente.", level: "low" }
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
    if (tab === "forca") { loadStrength(); if (state.strengthView === "commodities") loadPremarket(); }
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

  async function loadStrength(force = false) {
    if (state.strength && !force) { renderStrength(); return state.strength; } if (state.strengthPromise) return state.strengthPromise;
    const url = force ? `/api/b3-strength?live=${Date.now()}` : "/api/b3-strength";
    state.strengthPromise = apiJson(url).then((payload) => { state.strength = payload; if (!payload.items.some((item) => item.ticker === state.strengthTicker)) state.strengthTicker = payload.items[0]?.ticker; renderStrength(); return payload; }).catch((error) => { $("#strengthRanking").innerHTML = `<div class="chart-error"><strong>Força B3 temporariamente indisponível.</strong><span>${esc(error.message)}</span></div>`; $("#strengthChart").innerHTML = `<div class="chart-error"><strong>Gráfico indisponível.</strong><span>${esc(error.message)}</span></div>`; throw error; }).finally(() => { state.strengthPromise = null; }); return state.strengthPromise;
  }

  function renderStrength() {
    if (!state.strength) return; const items = state.strength.items; const net = items.reduce((sum, item) => sum + item.contribution, 0); const rising = items.filter((item) => item.change > 0).length; const topThree = [...items].sort((a, b) => b.weight - a.weight).slice(0, 3).reduce((sum, item) => sum + item.weight, 0);
    $("#strengthUpdatedAt").textContent = `${new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date(state.strength.updatedAt))} · possível atraso`;
    $("#strengthKpis").innerHTML = `<article><span>Peso monitorado</span><strong>${number(state.strength.totalWeight, 2)}%</strong><small>dos 12 maiores papéis</small></article><article><span>Contribuição estimada</span><strong class="${net >= 0 ? "positive" : "negative"}">${percent(net)}</strong><small>efeito aproximado no índice</small></article><article><span>Amplitude</span><strong>${rising} altas · ${items.length - rising} baixas</strong><small>entre os maiores pesos</small></article><article><span>Concentração do top 3</span><strong>${number(topThree, 2)}%</strong><small>VALE3, ITUB4 e PETR4</small></article>`;
    renderStrengthRanking(); renderStrengthChart(); renderStrengthAverageChart(); renderContributionChart(); renderStrengthInsights();
  }

  function renderStrengthRanking() {
    const valueFor = (item) => state.strengthSort === "impact" ? Math.abs(item.contribution) : state.strengthSort === "ticker" ? item.ticker : item[state.strengthSort]; const direction = state.strengthSortDirection === "asc" ? 1 : -1;
    const list = [...state.strength.items].sort((a, b) => { const av = valueFor(a); const bv = valueFor(b); return typeof av === "string" ? av.localeCompare(bv) * direction : (av - bv) * direction; }); const arrow = (column) => state.strengthSort === column ? (state.strengthSortDirection === "asc" ? " ↑" : " ↓") : ""; const totalWeight = state.strength.items.reduce((sum, item) => sum + item.weight, 0); const averageChange = state.strength.items.reduce((sum, item) => sum + item.change, 0) / state.strength.items.length; const totalImpact = state.strength.items.reduce((sum, item) => sum + item.contribution, 0);
    $("#strengthRanking").innerHTML = `<div class="strength-row strength-head"><span>#</span><button type="button" data-strength-column="ticker">Ação${arrow("ticker")}</button><button type="button" data-strength-column="weight">Peso${arrow("weight")}</button><button type="button" data-strength-column="current">Preço${arrow("current")}</button><button type="button" data-strength-column="change">Dia${arrow("change")}</button><button type="button" data-strength-column="contribution">Impacto${arrow("contribution")}</button></div>${list.map((item, index) => `<button class="strength-row ${item.ticker === state.strengthTicker ? "is-active" : ""}" type="button" data-strength-ticker="${item.ticker}"><span>${String(index + 1).padStart(2, "0")}</span><span><b>${item.ticker}</b><small>${esc(item.name)}</small></span><strong>${number(item.weight, 2)}%</strong><strong>${money(item.current)}</strong><strong class="${item.change >= 0 ? "positive" : "negative"}">${percent(item.change)}</strong><strong class="${item.contribution >= 0 ? "positive" : "negative"}">${percent(item.contribution)}</strong></button>`).join("")}<div class="strength-row strength-total-row"><span>Σ</span><span><b>TOTAL / MÉDIA</b><small>${state.strength.items.length} papéis</small></span><strong>${number(totalWeight, 2)}%<small>peso somado</small></strong><strong>—<small>não se soma</small></strong><strong class="${averageChange >= 0 ? "positive" : "negative"}">${percent(averageChange)}<small>média do dia</small></strong><strong class="${totalImpact >= 0 ? "positive" : "negative"}">${percent(totalImpact)}<small>impacto líquido</small></strong></div>`;
    $$('[data-strength-ticker]').forEach((button) => button.addEventListener("click", () => { state.strengthTicker = button.dataset.strengthTicker; renderStrengthRanking(); renderStrengthChart(); }));
    $$('[data-strength-column]').forEach((button) => button.addEventListener("click", () => { const column = button.dataset.strengthColumn; state.strengthSortDirection = state.strengthSort === column ? (state.strengthSortDirection === "desc" ? "asc" : "desc") : (column === "ticker" ? "asc" : "desc"); state.strengthSort = column; renderStrengthRanking(); }));
    $$('[data-strength-sort]').forEach((button) => button.classList.toggle("is-active", button.dataset.strengthSort === state.strengthSort));
  }

  function renderStrengthChart() {
    const item = state.strength.items.find((entry) => entry.ticker === state.strengthTicker) || state.strength.items[0]; if (!item) return; const points = item.points || []; $("#strengthChartTitle").textContent = `${item.ticker} · ${item.name}`; $("#strengthChartSector").textContent = item.sector; $("#strengthPrice").innerHTML = `<strong>${money(item.current)}</strong><span class="${item.change >= 0 ? "positive" : "negative"}">${percent(item.change)} no dia</span><small>Peso ${number(item.weight, 2)}% · impacto ${percent(item.contribution)}</small>`;
    if (points.length < 2) { $("#strengthChart").innerHTML = '<div class="chart-error"><strong>Série intradiária insuficiente.</strong><span>A cotação principal continua disponível.</span></div>'; return; }
    const width = 900; const height = 330; const pad = { left: 58, right: 20, top: 24, bottom: 35 }; const values = points.map((point) => point.value); if (item.previousClose > 0) values.push(item.previousClose); let min = Math.min(...values); let max = Math.max(...values); const margin = Math.max((max - min) * .12, max * .002); min -= margin; max += margin; const x = (index) => pad.left + index / Math.max(points.length - 1, 1) * (width - pad.left - pad.right); const y = (value) => pad.top + (max - value) / (max - min || 1) * (height - pad.top - pad.bottom); const path = points.map((point, index) => `${index ? "L" : "M"}${x(index).toFixed(1)},${y(point.value).toFixed(1)}`).join(" "); const area = `${path} L${x(points.length - 1)},${height - pad.bottom} L${x(0)},${height - pad.bottom} Z`; const color = item.change >= 0 ? "#07845b" : "#c94444"; const ticks = [0, .25, .5, .75, 1].map((part) => { const value = min + (max - min) * part; return `<g><line x1="${pad.left}" y1="${y(value)}" x2="${width - pad.right}" y2="${y(value)}"></line><text x="${pad.left - 8}" y="${y(value) + 3}" text-anchor="end">${number(value, 2)}</text></g>`; }).join(""); const timeTicks = [0, Math.floor((points.length - 1) / 2), points.length - 1].map((index) => `<text x="${x(index)}" y="${height - 9}" text-anchor="middle">${new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" }).format(new Date(points[index].time))}</text>`).join(""); const previousLine = item.previousClose > min && item.previousClose < max ? `<line class="previous-line" x1="${pad.left}" y1="${y(item.previousClose)}" x2="${width - pad.right}" y2="${y(item.previousClose)}"></line><text class="previous-label" x="${width - pad.right}" y="${y(item.previousClose) - 5}" text-anchor="end">fechamento anterior</text>` : "";
    $("#strengthChart").innerHTML = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Cotação intradiária de ${esc(item.ticker)}"><defs><linearGradient id="strengthArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".25"/><stop offset="1" stop-color="${color}" stop-opacity=".02"/></linearGradient></defs><g class="grid">${ticks}</g>${previousLine}<path class="strength-area" d="${area}" fill="url(#strengthArea)"></path><path class="strength-line" d="${path}" stroke="${color}"></path><g class="axis">${timeTicks}</g></svg><small class="chart-caption">Linha intradiária de 5 minutos · atualização automática a cada 60 segundos</small>`;
    const high = item.high || Math.max(...points.map((point) => point.value)); const low = item.low || Math.min(...points.map((point) => point.value)); $("#strengthRange").innerHTML = `<span><small>Abertura</small><strong>${item.open > 0 ? money(item.open) : "—"}</strong></span><span><small>Mínima</small><strong>${money(low)}</strong></span><span><small>Máxima</small><strong>${money(high)}</strong></span><span><small>Volume</small><strong>${number(item.volume)}</strong></span>`;
  }

  function renderStrengthAverageChart() {
    const items = state.strength.items.filter((item) => item.points?.length > 1); const container = $("#strengthAverageChart"); if (!items.length) { container.innerHTML = '<div class="chart-error">Séries insuficientes para calcular a média.</div>'; return; }
    const rows = new Map(); items.forEach((item) => { const first = item.points[0].value; item.points.forEach((point) => { const key = point.time; const row = rows.get(key) || []; row.push(point.value / first * 100); rows.set(key, row); }); }); let points = [...rows.entries()].filter(([, values]) => values.length >= Math.ceil(items.length * .75)).sort(([a], [b]) => a.localeCompare(b)).map(([time, values]) => ({ time, value: values.reduce((sum, value) => sum + value, 0) / values.length }));
    if (points.length < 2) { const size = Math.min(...items.map((item) => item.points.length)); points = Array.from({ length: size }, (_, index) => ({ time: items[0].points[index].time, value: items.reduce((sum, item) => sum + item.points[index].value / item.points[0].value * 100, 0) / items.length })); }
    const width = 1000; const height = 340; const pad = { left: 58, right: 20, top: 24, bottom: 38 }; const values = points.map((point) => point.value); let min = Math.min(...values, 100); let max = Math.max(...values, 100); const margin = Math.max((max - min) * .15, .15); min -= margin; max += margin; const x = (index) => pad.left + index / Math.max(points.length - 1, 1) * (width - pad.left - pad.right); const y = (value) => pad.top + (max - value) / (max - min || 1) * (height - pad.top - pad.bottom); const path = points.map((point, index) => `${index ? "L" : "M"}${x(index).toFixed(1)},${y(point.value).toFixed(1)}`).join(" "); const area = `${path} L${x(points.length - 1)},${height - pad.bottom} L${x(0)},${height - pad.bottom} Z`; const change = points.at(-1).value - 100; const color = change >= 0 ? "#2563eb" : "#c94444"; const ticks = [0, .25, .5, .75, 1].map((part) => { const value = min + (max - min) * part; return `<g><line x1="${pad.left}" y1="${y(value)}" x2="${width - pad.right}" y2="${y(value)}"></line><text x="${pad.left - 8}" y="${y(value) + 3}" text-anchor="end">${number(value, 2)}</text></g>`; }).join(""); const timeTicks = [0, Math.floor((points.length - 1) / 2), points.length - 1].map((index) => `<text x="${x(index)}" y="${height - 10}" text-anchor="middle">${new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" }).format(new Date(points[index].time))}</text>`).join("");
    container.innerHTML = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Média intradiária dos doze maiores papéis"><defs><linearGradient id="averageStrengthArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".24"/><stop offset="1" stop-color="${color}" stop-opacity=".02"/></linearGradient></defs><g class="grid">${ticks}</g><line class="average-base-line" x1="${pad.left}" y1="${y(100)}" x2="${width - pad.right}" y2="${y(100)}"></line><path class="strength-area" d="${area}" fill="url(#averageStrengthArea)"></path><path class="strength-line" d="${path}" stroke="${color}"></path><g class="axis">${timeTicks}</g></svg><small class="chart-caption">Base 100 na primeira cotação · média simples das séries intradiárias</small>`;
    const averageDay = items.reduce((sum, item) => sum + item.change, 0) / items.length; const rising = items.filter((item) => item.change > 0).length; const best = [...items].sort((a, b) => b.change - a.change)[0]; const worst = [...items].sort((a, b) => a.change - b.change)[0]; $("#strengthAverageValue").innerHTML = `<div><small>Índice médio agora</small><strong class="${change >= 0 ? "positive" : "negative"}">${number(points.at(-1).value, 2)}</strong></div><div><small>Desde a primeira cotação</small><span class="${change >= 0 ? "positive" : "negative"}">${percent(change)}</span></div><p>${change >= 0 ? "A cesta está, em média, acima" : "A cesta está, em média, abaixo"} do nível 100 usado como ponto inicial.</p>`; $("#strengthAverageSummary").innerHTML = `<div><span>Variação média no dia</span><strong class="${averageDay >= 0 ? "positive" : "negative"}">${percent(averageDay)}</strong><small>Média simples da coluna “Dia”</small></div><div><span>Amplitude da cesta</span><strong>${rising} altas · ${items.length - rising} baixas</strong><small>Quantidade de ações em cada direção</small></div><div><span>Maior alta</span><strong class="positive">${best.ticker} · ${percent(best.change)}</strong><small>Melhor desempenho entre os 12</small></div><div><span>Maior baixa</span><strong class="negative">${worst.ticker} · ${percent(worst.change)}</strong><small>Pior desempenho entre os 12</small></div>`; $("#strengthAverageAssets").innerHTML = items.map((item) => `<span>${item.ticker}</span>`).join("");
  }

  function renderContributionChart() {
    const items = [...state.strength.items].sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution)).slice(0, 10); const max = Math.max(...items.map((item) => Math.abs(item.contribution)), .001);
    $("#contributionChart").innerHTML = items.map((item) => { const size = Math.abs(item.contribution) / max * 50; const side = item.contribution >= 0 ? "up" : "down"; return `<div><span>${item.ticker}<small>${number(item.weight, 2)}% do IBOV</small></span><section><i class="${side}" style="width:${size}%"></i></section><strong class="${item.contribution >= 0 ? "positive" : "negative"}">${percent(item.contribution)}</strong></div>`; }).join("");
  }

  function renderStrengthInsights() {
    const items = state.strength.items; const net = items.reduce((sum, item) => sum + item.contribution, 0); const leader = [...items].sort((a, b) => b.contribution - a.contribution)[0]; const drag = [...items].sort((a, b) => a.contribution - b.contribution)[0]; const sectors = Object.entries(items.reduce((map, item) => { map[item.sector] = (map[item.sector] || 0) + item.contribution; return map; }, {})).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])); const rising = items.filter((item) => item.change > 0).length; const concentrated = Math.abs(leader.contribution) > Math.abs(net) * .6; const badge = $("#strengthBias"); badge.className = `badge ${net > .08 ? "positive" : net < -.08 ? "negative" : "neutral"}`; badge.textContent = net > .08 ? "Pressão positiva" : net < -.08 ? "Pressão negativa" : "Forças equilibradas";
    $("#strengthInsights").innerHTML = `<div><span>Principal força</span><strong class="positive">${leader.ticker} · ${percent(leader.contribution)}</strong><small>${leader.name} combina peso de ${number(leader.weight, 2)}% com variação de ${percent(leader.change)}.</small></div><div><span>Principal detrator</span><strong class="negative">${drag.ticker} · ${percent(drag.contribution)}</strong><small>${drag.name} é o maior freio entre os papéis monitorados.</small></div><div><span>Setor dominante</span><strong>${sectors[0][0]} · ${percent(sectors[0][1])}</strong><small>Efeito agregado das empresas desse setor na amostra.</small></div><div><span>Qualidade do movimento</span><strong>${rising}/${items.length} papéis em alta</strong><small>${concentrated ? "Movimento concentrado em poucos nomes; exige cautela." : "Movimento relativamente distribuído entre os maiores pesos."}</small></div>`;
  }

  function initStrength() {
    $$('[data-strength-sort]').forEach((button) => button.addEventListener("click", () => { state.strengthSort = button.dataset.strengthSort; state.strengthSortDirection = "desc"; if (state.strength) renderStrengthRanking(); }));
    $$('[data-strength-view]').forEach((button) => button.addEventListener("click", () => setStrengthView(button.dataset.strengthView)));
  }

  function setStrengthView(view) {
    state.strengthView = view; const commoditiesView = view === "commodities"; $("#strengthViewStocks").hidden = commoditiesView; $("#strengthViewCommodities").hidden = !commoditiesView; $("#strengthViewTitle").textContent = commoditiesView ? "Commodities que antecipam a abertura" : "Ações com mais força no Ibovespa";
    $$('[data-strength-view]').forEach((button) => { const active = button.dataset.strengthView === view; button.classList.toggle("is-active", active); button.setAttribute("aria-selected", String(active)); }); if (commoditiesView) loadPremarket(); else if (state.strength) renderStrength();
  }

  async function loadPremarket(force = false) {
    if (state.premarket && !force) { renderPremarket(); return state.premarket; } if (state.premarketPromise) return state.premarketPromise; const url = force ? `/api/b3-premarket?live=${Date.now()}` : "/api/b3-premarket";
    state.premarketPromise = apiJson(url).then((payload) => { state.premarket = payload; if (!payload.items.some((item) => item.id === state.premarketCommodity)) state.premarketCommodity = payload.items[0]?.id; renderPremarket(); return payload; }).catch((error) => { $("#premarketList").innerHTML = `<div class="chart-error"><strong>Commodities temporariamente indisponíveis.</strong><span>${esc(error.message)}</span></div>`; $("#premarketChart").innerHTML = `<div class="chart-error"><strong>Gráfico indisponível.</strong><span>${esc(error.message)}</span></div>`; throw error; }).finally(() => { state.premarketPromise = null; }); return state.premarketPromise;
  }

  function renderPremarket() {
    if (!state.premarket) return; const items = state.premarket.items; const brent = items.find((item) => item.id === "brent"); const iron = items.find((item) => item.id === "iron"); const positive = items.filter((item) => item.change > 0).length; const coreWeight = (brent?.directWeight || 0) + (iron?.directWeight || 0); const corePressure = brent && iron ? (brent.change * brent.directWeight + iron.change * iron.directWeight) / coreWeight : 0;
    $("#premarketUpdatedAt").textContent = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date(state.premarket.updatedAt)); $("#strengthUpdatedAt").textContent = `${$("#premarketUpdatedAt").textContent} · possível atraso`;
    const clock = marketMinutes(); $("#premarketPhase").textContent = clock.minutes < 540 ? "Preparação antes das 9h" : clock.minutes < 600 ? "Janela ativa: futuros abertos, ações fechadas" : "Ações abertas: valide se o sinal foi confirmado";
    $("#premarketKpis").innerHTML = `<article><span>Exposição petróleo + minério</span><strong>${number(coreWeight, 2)}%</strong><small>peso direto aproximado no Ibovespa</small></article><article><span>Pressão ponderada</span><strong class="${corePressure >= 0 ? "positive" : "negative"}">${percent(corePressure)}</strong><small>Brent e minério pelos pesos relacionados</small></article><article><span>Amplitude das commodities</span><strong>${positive} altas · ${items.length - positive} baixas</strong><small>na amostra monitorada</small></article>`;
    $("#premarketList").innerHTML = [...items].sort((a, b) => (b.directWeight || -1) - (a.directWeight || -1)).map((item, index) => `<button class="premarket-item ${item.id === state.premarketCommodity ? "is-active" : ""}" type="button" data-premarket-id="${item.id}"><span>${String(index + 1).padStart(2, "0")}</span><span><b>${esc(item.name)}</b><small>${item.intraday ? item.assets.join(" · ") : `D-1 · ${item.assets.join(" · ")}`}</small></span><strong>${item.directWeight == null ? "Influência indireta" : `${number(item.directWeight, 2)}% do IBOV`}</strong><strong class="${item.change >= 0 ? "positive" : "negative"}">${percent(item.change)}</strong></button>`).join(""); $$('[data-premarket-id]').forEach((button) => button.addEventListener("click", () => { state.premarketCommodity = button.dataset.premarketId; renderPremarket(); })); renderPremarketChart(); renderPremarketInsights(brent, iron, corePressure);
  }

  function renderPremarketChart() {
    const item = state.premarket.items.find((entry) => entry.id === state.premarketCommodity) || state.premarket.items[0]; if (!item) return; const points = item.points || []; $("#premarketChartTitle").textContent = item.name; $("#premarketChartWeight").textContent = item.directWeight == null ? "INFLUÊNCIA INDIRETA" : `${number(item.directWeight, 2)}% DO IBOV`; $("#premarketPrice").innerHTML = `<strong>${number(item.current, 2)}</strong><span class="${item.change >= 0 ? "positive" : "negative"}">${percent(item.change)} no dia</span><small>${esc(item.unit)}</small>`; $("#premarketAssets").innerHTML = `<p>${esc(item.note)}</p><div>${item.assets.map((asset) => `<span>${asset}</span>`).join("")}</div>`;
    if (points.length < 2) { $("#premarketChart").innerHTML = '<div class="chart-error"><strong>Série insuficiente.</strong><span>A cotação principal continua disponível.</span></div>'; return; } const width = 900; const height = 330; const pad = { left: 58, right: 20, top: 24, bottom: 35 }; const values = points.map((point) => point.value); if (item.previousClose > 0) values.push(item.previousClose); let min = Math.min(...values); let max = Math.max(...values); const margin = Math.max((max - min) * .12, max * .002); min -= margin; max += margin; const x = (index) => pad.left + index / Math.max(points.length - 1, 1) * (width - pad.left - pad.right); const y = (value) => pad.top + (max - value) / (max - min || 1) * (height - pad.top - pad.bottom); const path = points.map((point, index) => `${index ? "L" : "M"}${x(index).toFixed(1)},${y(point.value).toFixed(1)}`).join(" "); const color = item.change >= 0 ? "#07845b" : "#c94444"; const ticks = [0, .25, .5, .75, 1].map((part) => { const value = min + (max - min) * part; return `<g><line x1="${pad.left}" y1="${y(value)}" x2="${width - pad.right}" y2="${y(value)}"></line><text x="${pad.left - 8}" y="${y(value) + 3}" text-anchor="end">${number(value, 2)}</text></g>`; }).join(""); const label = (point) => item.intraday ? new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" }).format(new Date(point.time)) : new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", day: "2-digit", month: "2-digit" }).format(new Date(point.time)); const timeTicks = [0, Math.floor((points.length - 1) / 2), points.length - 1].map((index) => `<text x="${x(index)}" y="${height - 9}" text-anchor="middle">${label(points[index])}</text>`).join(""); $("#premarketChart").innerHTML = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Cotação de ${esc(item.name)}"><g class="grid">${ticks}</g><path class="strength-line" d="${path}" stroke="${color}"></path><g class="axis">${timeTicks}</g></svg><small class="chart-caption">${item.intraday ? "Futuros internacionais · intervalo de 5 minutos" : "Referência diária D-1 · série intradiária gratuita indisponível"}</small>`;
  }

  function renderPremarketInsights(brent, iron, pressure) {
    const badge = $("#premarketBias"); const aligned = brent && iron && Math.sign(brent.change) === Math.sign(iron.change); const tone = pressure > .25 ? "positive" : pressure < -.25 ? "negative" : "neutral"; badge.className = `badge ${tone}`; badge.textContent = tone === "positive" ? "Pressão favorável" : tone === "negative" ? "Pressão desfavorável" : "Sinais mistos"; $("#premarketInsights").innerHTML = `<div><span>Petróleo</span><strong class="${brent?.change >= 0 ? "positive" : "negative"}">Brent ${percent(brent?.change || 0)}</strong><small>Observe PETR4, PETR3 e PRIO3 no leilão e compare com as ADRs.</small></div><div><span>Mineração</span><strong class="${iron?.change >= 0 ? "positive" : "negative"}">Minério ${percent(iron?.change || 0)}</strong><small>Vale responde também a China, câmbio e prêmio/desconto do minério físico.</small></div><div><span>Convergência</span><strong>${aligned ? "Petróleo e minério alinhados" : "Sinais divergentes"}</strong><small>${aligned ? "Os dois maiores blocos apontam para o mesmo lado, mas ainda exigem confirmação." : "Evite extrapolar uma única commodity para todo o índice."}</small></div><div><span>Checklist 9h–10h</span><strong>WIN · WDO · ADRs · notícias</strong><small>Confirme se futuros locais e ativos no exterior validam a leitura das commodities.</small></div>`;
  }

  function renderIndices() {
    $("#indexButtons").innerHTML = [...indices, { id: "all", label: "Todas + média" }].map((item) => `<button class="index-button ${item.id === state.index ? "is-active" : ""}" type="button" data-index="${item.id}">${item.label}</button>`).join("");
    $$('[data-index]').forEach((button) => button.addEventListener("click", () => { state.index = button.dataset.index; renderSelectedIndex(); }));
  }

  function renderIndexSummary() {
    if (!state.overview) return; const listed = indices.map((item) => state.overview.indices[item.id]);
    $("#indexSummary").innerHTML = indices.slice(0, 4).map((item) => { const data = state.overview.indices[item.id]; const tone = data.change1d >= 0 ? "positive" : "negative"; return `<article><span>${item.label}</span><strong>${number(data.current, data.current < 1000 ? 2 : 0)}</strong><small class="${tone}">${percent(data.change1d)} no dia</small></article>`; }).join("");
    const sum = listed.reduce((total, item) => total + item.change1d, 0); const average = sum / listed.length; const highs = listed.filter((item) => item.change1d > 0).length;
    $("#aggregateStats").innerHTML = `<article><span>Soma das variações</span><strong class="${sum >= 0 ? "positive" : "negative"}">${percent(sum)}</strong></article><article><span>Média das bolsas</span><strong class="${average >= 0 ? "positive" : "negative"}">${percent(average)}</strong></article><article><span>Amplitude global</span><strong>${highs} altas · ${listed.length - highs} baixas</strong></article>`; renderInfluenceProbability(); updateLiveTimestamps();
  }

  function renderInfluenceProbability() {
    if (!state.overview) return; const weights = [
      ["spx", "S&P 500", 35], ["nasdaq", "Nasdaq", 20], ["dow", "Dow Jones", 10], ["dax", "DAX", 12], ["china", "Xangai", 15], ["nikkei", "Nikkei", 8]
    ];
    const entries = weights.map(([id, label, weight]) => { const change = state.overview.indices[id]?.change1d || 0; return { label, weight, change, contribution: change * weight / 100 }; });
    const pressure = entries.reduce((sum, item) => sum + item.contribution, 0); const highProbability = Math.max(10, Math.min(90, 50 + pressure * 18)); const lowProbability = 100 - highProbability; const maxContribution = Math.max(...entries.map((item) => Math.abs(item.contribution)), .01);
    const direction = highProbability >= 57 ? "Pressão externa mais favorável à alta" : highProbability <= 43 ? "Pressão externa mais favorável à baixa" : "Pressão externa equilibrada";
    $("#influenceProbability").innerHTML = `<div class="probability-head"><div><span>Leitura ponderada</span><strong>${direction}</strong></div><div class="probability-values"><b class="negative">${number(lowProbability, 0)}% baixa</b><b class="positive">${number(highProbability, 0)}% alta</b></div></div><div class="probability-track"><i style="width:${highProbability}%"></i></div><div class="influence-bars">${entries.map((item) => { const size = Math.abs(item.contribution) / maxContribution * 50; const side = item.contribution >= 0 ? "up" : "down"; return `<div><span>${item.label}<small>peso ${item.weight}%</small></span><section><i class="${side}" style="width:${size}%"></i></section><strong class="${item.change >= 0 ? "positive" : "negative"}">${percent(item.change)}</strong></div>`; }).join("")}</div>`;
  }

  function updateLiveTimestamps() {
    if (!state.overview?.updatedAt) return; const value = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date(state.overview.updatedAt));
    $("#indicesUpdated").textContent = `${value} · possível atraso da fonte`; $("#tradeUpdatedAt").textContent = `${value} · automática a cada 60s`;
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

  async function ensureOverview(force = false) {
    if (state.overview && !force) return state.overview; if (state.overviewPromise) return state.overviewPromise;
    const url = force ? `/api/b3-series?live=${Date.now()}` : "/api/b3-series";
    state.overviewPromise = apiJson(url).then((payload) => { state.overview = payload; renderQuotes(); renderIndexSummary(); renderAnalysis(); renderTradeContext(); if (state.tab === "bolsas") renderSelectedIndex(); return payload; }).finally(() => { state.overviewPromise = null; }); return state.overviewPromise;
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
    const marketValue = (event) => {
      if (!state.overview || !businessDay || clock.minutes < event.time) return ""; const { indices: idx, macro } = state.overview; const quote = (item, digits = 0) => item ? `${number(item.current, digits)} <b class="${item.change1d >= 0 ? "positive" : "negative"}">${percent(item.change1d)}</b>` : "—"; const opened = (item, digits = 0) => item?.open > 0 ? `abertura ${number(item.open, digits)} · atual ${quote(item, digits)}` : `valor atual ${quote(item, digits)}`;
      if (event.id === "futures") return `<span class="event-market-values"><em>Referências após a abertura</em><span>Ibovespa ${quote(idx.ibov)}</span><span>USD/BRL ${quote(macro.usdbrl, 4)}</span></span>`;
      if (event.id === "stocks" || event.id === "preopen") return `<span class="event-market-values"><em>Mercado à vista</em><span>Ibovespa: ${opened(idx.ibov)}</span></span>`;
      if (event.id === "ny") return `<span class="event-market-values"><em>Mercados dos EUA</em><span>S&amp;P 500: ${opened(idx.spx)}</span><span>Nasdaq: ${opened(idx.nasdaq)}</span></span>`;
      if (event.id === "dollar" || event.id === "wdo-close") return `<span class="event-market-values"><em>Referência cambial</em><span>USD/BRL: ${quote(macro.usdbrl, 4)}</span></span>`;
      if (event.id === "close") return `<span class="event-market-values"><em>Referência do fechamento</em><span>Ibovespa: ${quote(idx.ibov)}</span></span>`; return "";
    };
    $("#tradeTimeline").innerHTML = events.map((event) => `<div class="trade-event ${businessDay && clock.minutes >= event.time ? "is-past" : ""} ${next === event ? "is-next" : ""}"><time>${timeLabel(event.time)}</time><i class="${event.level}"></i><p><strong>${esc(event.label)}</strong><small>${esc(event.detail)}</small>${marketValue(event)}</p></div>`).join("");

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
    $("#tradeContext").innerHTML = `<div class="context-quotes">${items.map(([label, value, signal]) => `<span><small>${label}</small><strong class="${signal >= 0 ? "positive" : "negative"}">${value}</strong></span>`).join("")}</div>${levels ? `<div class="pivot-position"><span>Ibovespa está <b>${abovePivot ? "acima" : "abaixo"}</b> do pivô diário</span><strong>${number(levels.pivot, 0)}</strong><small>S1 ${number(levels.support1, 0)} · R1 ${number(levels.resistance1, 0)}</small></div>` : ""}<p class="source-note">Atualização automática com dados públicos; pode haver atraso e não substitui o book e o gráfico da corretora.</p>`; updateLiveTimestamps(); renderTradeTimeline();
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
    try { const payload = await apiJson(`/api/b3-news${force ? `?refresh=${Date.now()}` : ""}`); state.newsUpdatedAt = payload.updatedAt; state.news = (payload.items || []).sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt)).slice(0, 9); renderNews(); }
    catch (error) { const message = `<div class="panel-card"><strong>Notícias temporariamente indisponíveis.</strong><p class="source-note">${esc(error.message)}</p></div>`; $("#newsPreview").innerHTML = message; $("#newsFull").innerHTML = message; } finally { $("#refreshNews").disabled = false; }
  }
  function renderNews() {
    $("#newsPreview").innerHTML = state.news.slice(0, 3).map((item, index) => `<a class="news-mini" href="${esc(item.link)}" target="_blank" rel="noopener"><span class="news-number">0${index + 1}</span><span><strong>${esc(item.title)}</strong><small>${esc(item.source)} · ${esc(item.relativeDate)}</small></span></a>`).join("");
    $("#newsFull").innerHTML = state.news.map((item) => `<a class="news-card ${item.intradayImpact ? "has-intraday-impact" : ""}" href="${esc(item.link)}" target="_blank" rel="noopener"><span class="news-tag-row"><span class="news-tag">${esc(item.asset || "Mercado")}</span>${item.intradayImpact ? '<span class="intraday-live"><i></i> Impacto no day trade · em tempo real</span>' : ""}</span><h3>${esc(item.title)}</h3><p>${esc(item.description || "Abra para ler a notícia completa no veículo responsável.")}</p><span class="news-meta"><span>${esc(item.source)}</span><span>${esc(item.relativeDate)} ↗</span></span></a>`).join("");
    if (state.newsUpdatedAt) $("#newsUpdatedAt").textContent = `Atualizado às ${new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date(state.newsUpdatedAt))} · ordem cronológica`;
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
  initTicker(); renderCommodities(); renderIndices(); initDayTrade(); initStrength(); initTabs(); updateClock(); setInterval(updateClock, 60000); setInterval(() => { if (!document.hidden) { ensureOverview(true).catch(() => {}); if (state.tab === "forca") { loadStrength(true).catch(() => {}); if (state.strengthView === "commodities") loadPremarket(true).catch(() => {}); } } }, 60000); setInterval(() => { if (!document.hidden) loadNews(true); }, 300000);
  ensureOverview().catch((error) => { $("#quoteGrid").innerHTML = `<div class="panel-card" style="grid-column:1/-1"><strong>Cotações temporariamente indisponíveis.</strong><p class="source-note">${esc(error.message)}</p></div>`; $("#quotesUpdated").textContent = "Fonte indisponível"; }); loadNews();
})();
