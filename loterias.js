// Loterias publicas - v1
(() => {
  "use strict";

  const CACHE_KEY = "ola_carlopolis_loterias_cache_v1";
  const CACHE_TTL = 15 * 60 * 1000;
  const HOME_TITLE = document.title;
  const GAME_CONFIG = [
    { slug: "megasena", nome: "Mega-Sena", grupo: "principais", icon: "fa-clover" },
    { slug: "lotofacil", nome: "Lotofácil", grupo: "principais", icon: "fa-circle-dot" },
    { slug: "quina", nome: "Quina", grupo: "principais", icon: "fa-dice-five" },
    { slug: "maismilionaria", nome: "+Milionária", grupo: "outras", icon: "fa-gem" },
    { slug: "lotomania", nome: "Lotomania", grupo: "outras", icon: "fa-braille" },
    { slug: "timemania", nome: "Timemania", grupo: "outras", icon: "fa-futbol" },
    { slug: "duplasena", nome: "Dupla Sena", grupo: "outras", icon: "fa-layer-group" },
    { slug: "diadesorte", nome: "Dia de Sorte", grupo: "outras", icon: "fa-calendar-day" },
    { slug: "supersete", nome: "Super Sete", grupo: "outras", icon: "fa-table-cells-large" },
    { slug: "federal", nome: "Loteria Federal", grupo: "outras", icon: "fa-ticket" }
  ];
  const state = { resultados: [], consultadoEm: "", stale: false, loading: false, open: false, filter: "todas", query: "", savedNodes: null, previousHash: "", lastTrigger: null };
  let originalDescription = "";

  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  const normalize = (value) => String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9+]+/g, " ").trim();
  const gameConfig = (slug) => GAME_CONFIG.find((item) => item.slug === slug) || { slug, nome: slug, grupo: "outras", icon: "fa-ticket" };
  const number = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
  const money = (value) => number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });
  const compactMoney = (value) => {
    const amount = number(value);
    if (!amount) return "Não informado";
    if (amount >= 1000000) return `R$ ${(amount / 1000000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} ${amount >= 2000000 ? "milhões" : "milhão"}`;
    if (amount >= 1000) return `R$ ${(amount / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil`;
    return money(amount);
  };
  const parseDate = (value) => {
    const match = String(value || "").match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    return match ? new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]), 12) : null;
  };
  const dateFull = (value) => {
    const date = parseDate(value);
    if (!date) return String(value || "Não informada");
    const weekday = new Intl.DateTimeFormat("pt-BR", { weekday: "long" }).format(date);
    return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)}, ${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}`;
  };
  const updatedAt = (value) => {
    const date = new Date(value || 0);
    return Number.isNaN(date.getTime()) ? "Horário não informado" : date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  };
  const resultFor = (slug) => state.resultados.find((item) => item.slug === slug);

  function readCache() {
    try {
      const parsed = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
      return parsed && Array.isArray(parsed.resultados) ? parsed : null;
    } catch (error) { return null; }
  }

  function saveCache(payload) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ...payload, savedAt: Date.now() })); } catch (error) { }
  }

  async function fetchPayload(force = false) {
    const cached = readCache();
    if (!force && cached && Date.now() - number(cached.savedAt) < CACHE_TTL) return { ...cached, fromCache: true };
    const suffix = force ? `?refresh=1&t=${Date.now()}` : "";
    const endpoints = [`/api/loterias${suffix}`, `/.netlify/functions/loterias${suffix}`];
    let lastError = null;
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, { cache: "no-store", headers: { accept: "application/json" } });
        const payload = await response.json().catch(() => null);
        if (!response.ok || !payload || !Array.isArray(payload.resultados)) throw new Error("Serviço indisponível");
        const cachedMap = new Map((cached?.resultados || []).map((item) => [item.slug, item]));
        const resultados = payload.resultados.map((item) => {
          if (item.ok && item.data) return item;
          const fallback = cachedMap.get(item.slug);
          return fallback?.data ? { ...fallback, stale: true, localFallback: true } : item;
        });
        const normalized = { resultados, consultadoEm: payload.consultadoEm || new Date().toISOString(), stale: resultados.some((item) => item.stale || item.localFallback) };
        if (resultados.some((item) => item.ok && item.data)) saveCache(normalized);
        return normalized;
      } catch (error) { lastError = error; }
    }
    if (cached) return { ...cached, stale: true, fromCache: true };
    throw lastError || new Error("Não foi possível carregar os resultados.");
  }

  function skeleton() {
    return `<div class="lottery-skeleton-grid" aria-hidden="true">${Array.from({ length: 6 }, () => `<div class="lottery-skeleton-card"><span></span><strong></strong><div></div><p></p></div>`).join("")}</div>`;
  }

  function routeSlug() {
    const match = (location.hash || "").toLowerCase().match(/^#loterias-([a-z0-9]+)$/);
    return match && GAME_CONFIG.some((item) => item.slug === match[1]) ? match[1] : "";
  }

  function setMetadata(open) {
    const meta = document.querySelector('meta[name="description"]');
    if (meta && !originalDescription) originalDescription = meta.content;
    document.title = open ? "Resultados das Loterias | Olá Carlópolis" : HOME_TITLE;
    if (meta) meta.content = open ? "Confira os últimos resultados e os prêmios estimados das Loterias CAIXA no Olá Carlópolis." : originalDescription;
  }

  function captureContentArea() {
    const area = document.querySelector(".content_area");
    if (!area || area.querySelector(".lottery-page")) return area;
    const fragment = document.createDocumentFragment();
    while (area.firstChild) fragment.appendChild(area.firstChild);
    state.savedNodes = fragment;
    return area;
  }

  function restoreContentArea() {
    const area = document.querySelector(".content_area");
    if (!area || !state.savedNodes) return;
    area.replaceChildren(state.savedNodes);
    state.savedNodes = null;
  }

  function specialMarkup(data, slug, detailed = false) {
    const parts = [];
    if (Array.isArray(data.listaDezenasSegundoSorteio) && data.listaDezenasSegundoSorteio.length) parts.push(`<div class="lottery-special"><strong>Segundo sorteio</strong>${balls(data.listaDezenasSegundoSorteio, slug, "Dezenas do segundo sorteio")}</div>`);
    if (Array.isArray(data.trevosSorteados) && data.trevosSorteados.length) parts.push(`<div class="lottery-special"><strong>Trevos sorteados</strong>${balls(data.trevosSorteados, slug, "Trevos sorteados", "trevo")}</div>`);
    if (String(data.nomeTimeCoracaoMesSorte || "").replace(/\0/g, "").trim()) {
      const label = slug === "diadesorte" ? "Mês da Sorte" : slug === "timemania" ? "Time do Coração" : "Informação adicional";
      parts.push(`<div class="lottery-extra-line"><strong>${label}</strong><span>${esc(String(data.nomeTimeCoracaoMesSorte).replace(/\0/g, "").trim())}</span></div>`);
    }
    if (detailed && Array.isArray(data.listaResultadoEquipeEsportiva) && data.listaResultadoEquipeEsportiva.length) parts.push(`<div class="lottery-special"><strong>Resultado esportivo</strong><p>${esc(data.listaResultadoEquipeEsportiva.map((item) => item.nomeTime || item.nome || "").filter(Boolean).join(", "))}</p></div>`);
    return parts.join("");
  }

  function balls(values, slug, label = "Dezenas sorteadas", kind = "numero") {
    const list = Array.isArray(values) ? values.filter((value) => value !== null && value !== undefined && String(value).trim()) : [];
    if (!list.length) return `<p class="lottery-no-numbers">Dezenas não informadas.</p>`;
    return `<div class="lottery-balls ${slug === "federal" ? "is-federal" : ""}" aria-label="${esc(label)}">${list.map((value, index) => `<span class="lottery-ball ${kind === "trevo" ? "is-trevo" : ""}" aria-label="${kind === "trevo" ? "Trevo" : "Número"} ${index + 1}: ${esc(value)}">${esc(value)}</span>`).join("")}</div>`;
  }

  function cardMarkup(config, item) {
    if (!item?.ok || !item.data) return `<article class="lottery-card lottery-${config.slug} is-unavailable"><div class="lottery-card-heading"><span class="lottery-game-icon"><i class="fa-solid ${config.icon}"></i></span><h3>${esc(config.nome)}</h3></div><p>Resultado temporariamente indisponível.</p><button type="button" data-lottery-retry><i class="fa-solid fa-rotate"></i> Tentar novamente</button></article>`;
    const data = item.data;
    const estimated = number(data.valorEstimadoProximoConcurso);
    const label = estimated ? compactMoney(estimated) : config.slug === "federal" ? "Veja as faixas" : "Não informado";
    return `<article class="lottery-card lottery-${config.slug} ${config.slug === "megasena" && data.acumulado ? "is-highlighted" : ""}" data-lottery-card="${config.slug}">
      <div class="lottery-card-heading"><span class="lottery-game-icon"><i class="fa-solid ${config.icon}"></i></span><div><h3>${esc(config.nome)}</h3><small>Concurso ${esc(data.numero || "—")} • ${esc(data.dataApuracao || "Data não informada")}</small></div>${data.acumulado ? `<span class="lottery-accumulated">Acumulou</span>` : ""}</div>
      <div class="lottery-prize"><span>${estimated ? "Prêmio estimado do próximo concurso" : "Premiação do concurso"}</span><strong>${esc(label)}</strong></div>
      ${data.dataProximoConcurso ? `<p class="lottery-next"><i class="fa-regular fa-calendar"></i><span><small>Próximo sorteio</small><strong>${esc(dateFull(data.dataProximoConcurso))}</strong></span></p>` : ""}
      ${balls(data.listaDezenas, config.slug)}
      ${specialMarkup(data, config.slug)}
      ${item.stale ? `<p class="lottery-card-stale"><i class="fa-solid fa-clock-rotate-left"></i> Último resultado disponível</p>` : ""}
      <button type="button" class="lottery-details-button" data-lottery-details="${config.slug}">Ver detalhes <i class="fa-solid fa-arrow-right"></i></button>
    </article>`;
  }

  function filteredGames() {
    const query = normalize(state.query);
    return GAME_CONFIG.filter((config) => {
      const filterOk = state.filter === "todas" || state.filter === config.slug || (state.filter === "outras" && config.grupo === "outras");
      return filterOk && (!query || normalize(`${config.nome} ${config.slug}`).includes(query));
    });
  }

  function renderCards() {
    const box = document.getElementById("lotteryResults");
    if (!box) return;
    const games = filteredGames();
    const featured = games.filter((item) => item.grupo === "principais");
    const others = games.filter((item) => item.grupo === "outras");
    box.innerHTML = games.length ? `${featured.length ? `<section class="lottery-section"><div class="lottery-section-title"><span>Em destaque</span><h2>Principais resultados</h2></div><div class="lottery-featured-grid">${featured.map((config) => cardMarkup(config, resultFor(config.slug))).join("")}</div></section>` : ""}${others.length ? `<section class="lottery-section"><div class="lottery-section-title"><span>Outras modalidades</span><h2>Mais resultados</h2></div><div class="lottery-other-grid">${others.map((config) => cardMarkup(config, resultFor(config.slug))).join("")}</div></section>` : ""}` : `<div class="lottery-empty"><i class="fa-solid fa-magnifying-glass"></i><h2>Nenhuma loteria encontrada</h2><p>Altere o filtro ou o termo pesquisado.</p></div>`;
    bindCardEvents(box);
  }

  function renderStatus() {
    const status = document.getElementById("lotteryStatus");
    if (!status) return;
    status.innerHTML = `${state.stale ? `<span class="lottery-stale-notice"><i class="fa-solid fa-clock-rotate-left"></i> Exibindo a última atualização disponível.</span>` : ""}<span><i class="fa-regular fa-clock"></i> Atualizado em ${esc(updatedAt(state.consultadoEm))}</span>`;
  }

  function bindCardEvents(root) {
    root.querySelectorAll("[data-lottery-details]").forEach((button) => button.addEventListener("click", () => openDetails(button.dataset.lotteryDetails, button)));
    root.querySelectorAll("[data-lottery-retry]").forEach((button) => button.addEventListener("click", () => loadResults(true)));
  }

  function detailRows(data) {
    const rows = Array.isArray(data.listaRateioPremio) ? data.listaRateioPremio : [];
    if (!rows.length) return `<p class="lottery-detail-empty">Faixas de premiação não informadas.</p>`;
    return `<div class="lottery-prize-table"><div class="lottery-prize-row is-head"><span>Faixa</span><span>Ganhadores</span><span>Prêmio por ganhador</span></div>${rows.map((row, index) => {
      const winners = number(row.numeroDeGanhadores);
      const prize = number(row.valorPremio);
      const prizeText = !winners && index === 0 ? "Nenhum ganhador — prêmio acumulado" : prize > 0 ? money(prize) : "Não informado";
      return `<div class="lottery-prize-row"><strong>${esc(row.descricaoFaixa || `Faixa ${row.faixa || index + 1}`)}</strong><span data-label="Ganhadores">${winners.toLocaleString("pt-BR")}</span><span data-label="Prêmio por ganhador">${esc(prizeText)}</span></div>`;
    }).join("")}</div>`;
  }

  function winnersMarkup(data) {
    const cities = Array.isArray(data.listaMunicipioUFGanhadores) ? data.listaMunicipioUFGanhadores.filter((item) => item?.municipio || item?.uf) : [];
    if (!cities.length) return "";
    return `<section class="lottery-detail-section"><h3>Cidades dos ganhadores</h3><div class="lottery-winner-cities">${cities.map((item) => `<span><i class="fa-solid fa-location-dot"></i>${esc([item.municipio, item.uf].filter(Boolean).join(" / "))}${item.serie ? ` • Série ${esc(item.serie)}` : ""}</span>`).join("")}</div></section>`;
  }

  function openDetails(slug, trigger) {
    const item = resultFor(slug);
    if (!item?.data) return;
    closeDetails(false);
    state.lastTrigger = trigger || document.activeElement;
    const config = gameConfig(slug);
    const data = item.data;
    const modal = document.createElement("div");
    modal.className = "lottery-modal";
    modal.dataset.lotteryModal = "true";
    modal.innerHTML = `<section class="lottery-dialog lottery-${slug}" role="dialog" aria-modal="true" aria-labelledby="lotteryDetailTitle" tabindex="-1">
      <header><div><span>${esc(config.nome)}</span><h2 id="lotteryDetailTitle">Concurso ${esc(data.numero || "—")}</h2><p>Apuração em ${esc(data.dataApuracao || "data não informada")}</p></div><button type="button" data-lottery-modal-close aria-label="Fechar detalhes"><i class="fa-solid fa-xmark"></i></button></header>
      <div class="lottery-dialog-body">
        <section class="lottery-detail-hero"><div><span>${data.acumulado ? "Prêmio acumulado" : "Prêmio estimado do próximo concurso"}</span><strong>${number(data.valorEstimadoProximoConcurso) ? money(data.valorEstimadoProximoConcurso) : "Não informado"}</strong>${data.dataProximoConcurso ? `<small>Próximo sorteio: ${esc(dateFull(data.dataProximoConcurso))}</small>` : ""}</div>${balls(data.listaDezenas, slug)}</section>
        ${specialMarkup(data, slug, true)}
        <section class="lottery-detail-grid">
          <div><span>Local do sorteio</span><strong>${esc(data.localSorteio || "Não informado")}</strong></div>
          <div><span>Município / UF</span><strong>${esc(data.nomeMunicipioUFSorteio || "Não informado")}</strong></div>
          <div><span>Valor arrecadado</span><strong>${number(data.valorArrecadado) ? money(data.valorArrecadado) : "Não informado"}</strong></div>
          <div><span>Situação</span><strong>${data.acumulado ? "Acumulado" : "Concluído"}</strong></div>
        </section>
        ${data.observacao ? `<section class="lottery-detail-section"><h3>Observação oficial</h3><p>${esc(data.observacao)}</p></section>` : ""}
        <section class="lottery-detail-section"><h3>Faixas de premiação</h3>${detailRows(data)}</section>
        ${winnersMarkup(data)}
      </div>
    </section>`;
    document.body.appendChild(modal);
    document.body.classList.add("lottery-modal-open");
    modal.querySelector("[data-lottery-modal-close]")?.focus();
    modal.querySelector("[data-lottery-modal-close]")?.addEventListener("click", () => closeDetails());
    modal.addEventListener("click", (event) => { if (event.target === modal) closeDetails(); });
  }

  function closeDetails(returnFocus = true) {
    const modal = document.querySelector("[data-lottery-modal]");
    if (!modal) return;
    modal.remove();
    document.body.classList.remove("lottery-modal-open");
    if (returnFocus) state.lastTrigger?.focus?.();
  }

  async function share() {
    const url = `${location.origin}${location.pathname.replace(/index\.html$/i, "")}#loterias`;
    const data = { title: "Resultados das Loterias | Olá Carlópolis", text: "Confira os resultados e os próximos prêmios das loterias no Olá Carlópolis!", url };
    try {
      if (navigator.share) await navigator.share(data);
      else { await navigator.clipboard.writeText(url); window.mostrarToast?.("Link das loterias copiado!"); }
    } catch (error) { if (!error || !["AbortError", "NotAllowedError"].includes(error.name)) window.mostrarToast?.("Não foi possível compartilhar."); }
  }

  function bindPageEvents(area) {
    area.querySelector("#lotteryBack")?.addEventListener("click", closePage);
    area.querySelector("#lotteryShare")?.addEventListener("click", share);
    area.querySelector("#lotteryRetry")?.addEventListener("click", () => loadResults(true));
    area.querySelectorAll("[data-lottery-filter]").forEach((button) => button.addEventListener("click", () => {
      state.filter = button.dataset.lotteryFilter || "todas";
      area.querySelectorAll("[data-lottery-filter]").forEach((item) => item.classList.toggle("is-active", item === button));
      renderCards();
    }));
    area.querySelector("#lotterySearch")?.addEventListener("input", (event) => { state.query = event.target.value; renderCards(); });
  }

  async function loadResults(force = false) {
    if (state.loading) return;
    state.loading = true;
    const results = document.getElementById("lotteryResults");
    const retry = document.getElementById("lotteryRetry");
    if (results) results.innerHTML = skeleton();
    retry?.classList.add("is-loading");
    try {
      const payload = await fetchPayload(force);
      state.resultados = payload.resultados || [];
      state.consultadoEm = payload.consultadoEm || new Date().toISOString();
      state.stale = Boolean(payload.stale);
      renderStatus();
      renderCards();
      renderHomeSummary();
      const selected = routeSlug();
      if (selected) setTimeout(() => document.querySelector(`[data-lottery-card="${selected}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 80);
    } catch (error) {
      if (results) results.innerHTML = `<div class="lottery-load-error"><i class="fa-solid fa-triangle-exclamation"></i><h2>Não foi possível carregar os resultados neste momento.</h2><p>Você pode tentar novamente em alguns instantes.</p><button id="lotteryErrorRetry" type="button"><i class="fa-solid fa-rotate"></i> Tentar novamente</button></div>`;
      document.getElementById("lotteryErrorRetry")?.addEventListener("click", () => loadResults(true));
    } finally { state.loading = false; retry?.classList.remove("is-loading"); }
  }

  function pageMarkup() {
    return `<main class="lottery-page">
      <header class="lottery-hero"><div class="lottery-hero-actions"><button id="lotteryBack" type="button"><i class="fa-solid fa-arrow-left"></i><span>Voltar</span></button><button id="lotteryShare" type="button"><i class="fa-solid fa-share-nodes"></i><span>Compartilhar</span></button></div><div class="lottery-hero-copy"><span class="lottery-hero-icon"><i class="fa-solid fa-clover"></i></span><div><span class="lottery-kicker">Informação oficial</span><h1>Resultados das Loterias</h1><p>Confira os últimos resultados e os prêmios estimados das Loterias CAIXA.</p></div></div><div id="lotteryStatus" class="lottery-status" aria-live="polite"><span><i class="fa-solid fa-spinner fa-spin"></i> Atualizando resultados...</span></div></header>
      <section class="lottery-tools" aria-label="Filtros de loterias"><div class="lottery-filter-chips"><button type="button" class="is-active" data-lottery-filter="todas">Todas</button><button type="button" data-lottery-filter="megasena">Mega-Sena</button><button type="button" data-lottery-filter="lotofacil">Lotofácil</button><button type="button" data-lottery-filter="quina">Quina</button><button type="button" data-lottery-filter="outras">Outras</button></div><label class="lottery-search"><i class="fa-solid fa-magnifying-glass"></i><span class="sr-only">Buscar loteria</span><input id="lotterySearch" type="search" placeholder="Buscar loteria" autocomplete="off"></label><button id="lotteryRetry" class="lottery-refresh" type="button" title="Atualizar resultados"><i class="fa-solid fa-rotate"></i><span>Atualizar</span></button></section>
      <div id="lotteryResults" class="lottery-results" aria-live="polite">${skeleton()}</div>
      <footer class="lottery-disclaimer"><i class="fa-solid fa-circle-info"></i><div><p>Dados informativos obtidos das Loterias CAIXA. Confira sempre o resultado nos canais oficiais.</p><a href="https://loterias.caixa.gov.br/" target="_blank" rel="noopener noreferrer">Consultar resultados oficiais nas Loterias CAIXA <i class="fa-solid fa-arrow-up-right-from-square"></i></a><small>O Olá Carlópolis apenas divulga informações de caráter informativo e não realiza apostas. Os resultados e valores devem ser confirmados nos canais oficiais das Loterias CAIXA. Aposte com responsabilidade. Proibido para menores de 18 anos.</small></div></footer>
    </main>`;
  }

  async function showPage(selectedSlug = "") {
    const area = captureContentArea();
    if (!area) return;
    state.open = true;
    document.body.classList.add("lottery-route-open");
    setMetadata(true);
    if (!area.querySelector(".lottery-page")) area.innerHTML = pageMarkup();
    const page = area.querySelector(".lottery-page");
    if (page && page.dataset.eventsBound !== "true") {
      bindPageEvents(area);
      page.dataset.eventsBound = "true";
    }
    window.scrollTo({ top: 0, behavior: "auto" });
    if (!state.resultados.length || state.stale) await loadResults(false);
    else { renderStatus(); renderCards(); }
    if (selectedSlug) setTimeout(() => document.querySelector(`[data-lottery-card="${selectedSlug}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 100);
  }

  function closePage() {
    closeDetails(false);
    const previous = state.previousHash && !state.previousHash.startsWith("#loterias") ? state.previousHash : "";
    state.open = false;
    document.body.classList.remove("lottery-route-open");
    setMetadata(false);
    if (previous) {
      state.savedNodes = null;
      history.back();
    } else {
      history.replaceState(null, "", `${location.pathname}${location.search}`);
      restoreContentArea();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    state.previousHash = "";
  }

  function renderHomeSummary() {
    const section = document.getElementById("lotteryHomeSummary");
    if (!section || !state.resultados.length) return;
    const available = GAME_CONFIG.map((config) => ({ config, item: resultFor(config.slug) })).filter(({ item }) => item?.ok && item.data);
    if (!available.length) return;
    const chosen = available.sort((a, b) => number(b.item.data.valorEstimadoProximoConcurso) - number(a.item.data.valorEstimadoProximoConcurso))[0];
    const data = chosen.item.data;
    section.classList.remove("hidden");
    section.innerHTML = `<div class="lottery-home-icon"><i class="fa-solid fa-clover"></i></div><div class="lottery-home-copy"><span>Loterias</span><strong>${esc(chosen.config.nome)}${data.acumulado ? " acumulada" : ""}</strong><small>${number(data.valorEstimadoProximoConcurso) ? `Prêmio estimado: ${esc(compactMoney(data.valorEstimadoProximoConcurso))}` : "Confira o último resultado"}${data.dataProximoConcurso ? ` • ${esc(dateFull(data.dataProximoConcurso))}` : ""}</small></div><button type="button" data-lottery-home-open>Ver resultados <i class="fa-solid fa-arrow-right"></i></button>`;
    section.querySelector("[data-lottery-home-open]")?.addEventListener("click", () => openRoute(""));
  }

  function openRoute(slug = "", trigger = null) {
    state.previousHash = location.hash && !location.hash.startsWith("#loterias") ? location.hash : "";
    state.lastTrigger = trigger || document.activeElement;
    const target = slug ? `#loterias-${slug}` : "#loterias";
    if (location.hash === target) showPage(slug);
    else location.hash = target;
    document.querySelector(".sidebar")?.classList.toggle("close", window.innerWidth < 768 || document.querySelector(".sidebar")?.classList.contains("close"));
  }

  function handleHash() {
    const hash = (location.hash || "").toLowerCase();
    if (hash === "#loterias" || /^#loterias-[a-z0-9]+$/.test(hash)) return showPage(routeSlug());
    if (!state.open) return;
    closeDetails(false);
    state.open = false;
    document.body.classList.remove("lottery-route-open");
    setMetadata(false);
    if (!hash) restoreContentArea();
    else state.savedNodes = null;
  }

  document.addEventListener("keydown", (event) => {
    const modal = document.querySelector("[data-lottery-modal]");
    if (!modal) return;
    if (event.key === "Escape") { closeDetails(); return; }
    if (event.key !== "Tab") return;
    const focusable = [...modal.querySelectorAll('button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])')].filter((element) => !element.disabled && element.offsetParent !== null);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("menuLoterias")?.addEventListener("click", (event) => { event.preventDefault(); openRoute("", event.currentTarget); });
    const cached = readCache();
    if (cached) {
      state.resultados = cached.resultados || [];
      state.consultadoEm = cached.consultadoEm || "";
      state.stale = Date.now() - number(cached.savedAt) >= CACHE_TTL;
      renderHomeSummary();
    }
    const lotteryRoute = (location.hash || "").toLowerCase().startsWith("#loterias");
    handleHash();
    if (!lotteryRoute) {
      fetchPayload(false).then((payload) => {
        state.resultados = payload.resultados || [];
        state.consultadoEm = payload.consultadoEm || "";
        state.stale = Boolean(payload.stale);
        renderHomeSummary();
      }).catch(() => { });
    }
  });
  window.addEventListener("hashchange", handleHash);

  window.mostrarLoterias = showPage;
  window.abrirLoterias = openRoute;
  window.fecharLoteriasDetalhes = closeDetails;
})();
