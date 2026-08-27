// Loterias publicas - v10
(() => {
  "use strict";

  const CACHE_KEY = "ola_carlopolis_loterias_cache_v4";
  const CACHE_TTL = 2 * 60 * 1000;
  const AUTO_REFRESH_MS = 60 * 1000;
  const HISTORY_CACHE_TTL = 5 * 60 * 1000;
  const HISTORY_DAYS = 30;
  const HISTORY_BATCH_SIZE = 6;
  const HISTORY_MAX_CONTESTS = 36;
  const CAIXA_DIRECT_BASE = "https://servicebus2.caixa.gov.br/portaldeloterias/api";
  const HISTORY_FALLBACK_BASE = "https://loteriascaixa-api.herokuapp.com/api";
  const EXPECTED_NUMBERS = { megasena: 6, lotofacil: 15, quina: 5, lotomania: 20, timemania: 7, duplasena: 6, diadesorte: 7, supersete: 7, maismilionaria: 6, federal: 5 };
  const HOME_TITLE = document.title;
  const GAME_CONFIG = [
    { slug: "megasena", nome: "Mega-Sena", grupo: "principais", icon: "fa-clover", regra: "Escolha de 6 a 20 números entre 60. São sorteados 6 números e há prêmio para quem acerta 4, 5 ou 6." },
    { slug: "lotofacil", nome: "Lotofácil", grupo: "principais", icon: "fa-circle-dot", regra: "Escolha de 15 a 20 números entre 25. São sorteados 15 números e há prêmio para quem acerta de 11 a 15." },
    { slug: "quina", nome: "Quina", grupo: "principais", icon: "fa-dice-five", regra: "Escolha de 5 a 15 números entre 80. São sorteados 5 números e há prêmio para quem acerta 2, 3, 4 ou 5." },
    { slug: "maismilionaria", nome: "+Milionária", grupo: "outras", icon: "fa-gem", regra: "Escolha ao menos 6 números entre 50 e 2 Trevos entre 6. A premiação combina os acertos dos números com os Trevos." },
    { slug: "lotomania", nome: "Lotomania", grupo: "outras", icon: "fa-braille", regra: "Escolha 50 números entre 100. São sorteados 20 e há prêmio para 15, 16, 17, 18, 19 ou 20 acertos — e também para nenhum acerto." },
    { slug: "timemania", nome: "Timemania", grupo: "outras", icon: "fa-futbol", regra: "Escolha 10 números entre 80 e um Time do Coração. São sorteados 7 números e um time; há prêmio de 3 a 7 acertos ou pelo time sorteado." },
    { slug: "duplasena", nome: "Dupla Sena", grupo: "outras", icon: "fa-layer-group", regra: "Escolha de 6 a 15 números entre 50. A mesma aposta participa de dois sorteios no concurso e premia 3, 4, 5 ou 6 acertos." },
    { slug: "diadesorte", nome: "Dia de Sorte", grupo: "outras", icon: "fa-calendar-day", regra: "Escolha de 7 a 15 números entre 31 e um Mês de Sorte. São sorteados 7 números e um mês, com prêmios a partir de 4 acertos e também para o Mês de Sorte." },
    { slug: "supersete", nome: "Super Sete", grupo: "outras", icon: "fa-table-cells-large", regra: "O volante tem 7 colunas com dígitos de 0 a 9. Escolha ao menos um por coluna; é sorteado um dígito em cada coluna e há prêmio de 3 a 7 acertos." },
    { slug: "federal", nome: "Loteria Federal", grupo: "outras", icon: "fa-ticket", regra: "Compre um bilhete inteiro ou uma fração já numerada. Você pode ganhar pelos cinco prêmios principais e também por aproximações e combinações do número." }
  ];
  function betCombination(total, selected) {
    let result = 1;
    for (let index = 1; index <= selected; index += 1) result = result * (total - selected + index) / index;
    return Math.round(result);
  }

  function betValue(value) {
    return Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  function combinationPriceRows(minimum, maximum, selected, basePrice, suffix = "") {
    return Array.from({ length: maximum - minimum + 1 }, (_, index) => {
      const quantity = minimum + index;
      return [`${quantity}${suffix}`, betValue(betCombination(quantity, selected) * basePrice)];
    });
  }

  const BET_PRICE_TABLES = {
    megasena: { headers: ["Números", "Valor da aposta"], rows: combinationPriceRows(6, 20, 6, 6) },
    lotofacil: { headers: ["Números", "Valor da aposta"], rows: combinationPriceRows(15, 20, 15, 3.5) },
    quina: { headers: ["Números", "Valor da aposta"], rows: combinationPriceRows(5, 15, 5, 3) },
    maismilionaria: {
      headers: ["Nº", "Trevos", "Apostas", "Valor"],
      rows: Array.from({ length: 7 }, (_, numberIndex) => Array.from({ length: 5 }, (_, cloverIndex) => {
        const numbers = numberIndex + 6;
        const clovers = cloverIndex + 2;
        const simpleBets = betCombination(numbers, 6) * betCombination(clovers, 2);
        return [String(numbers), String(clovers), simpleBets.toLocaleString("pt-BR"), betValue(simpleBets * 6)];
      })).flat()
    },
    lotomania: { headers: ["Quantidade", "Valor da aposta"], rows: [["50 números", "R$ 3,00"]] },
    timemania: { headers: ["Quantidade", "Valor da aposta"], rows: [["10 números + Time do Coração", "R$ 3,50"]] },
    duplasena: { headers: ["Números", "Valor da aposta"], rows: combinationPriceRows(6, 15, 6, 3) },
    diadesorte: { headers: ["Números + Mês de Sorte", "Valor da aposta"], rows: combinationPriceRows(7, 15, 7, 2.5) },
    supersete: {
      headers: ["Números marcados", "Valor da aposta"],
      rows: [3, 6, 12, 24, 48, 96, 192, 384, 576, 864, 1296, 1944, 2916, 4374, 6561].map((value, index) => [String(index + 7), betValue(value)])
    },
    federal: {
      headers: ["Bilhete / fração", "Valor"],
      rows: [["1 fração — extração regular", "R$ 4,00"], ["Bilhete inteiro — extração regular", "R$ 40,00"], ["1 fração — Enricou ou Natal", "R$ 10,00"], ["Bilhete inteiro — Enricou ou Natal", "R$ 100,00"]]
    }
  };
  const state = { resultados: [], consultadoEm: "", stale: false, loading: false, open: false, filter: "todas", query: "", savedNodes: null, previousHash: "", lastTrigger: null, refreshTimer: null, historyCache: new Map() };
  let originalDescription = "";

  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  const normalize = (value) => String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9+]+/g, " ").trim();
  const gameConfig = (slug) => GAME_CONFIG.find((item) => item.slug === slug) || { slug, nome: slug, grupo: "outras", icon: "fa-ticket" };
  const number = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
  const metricKey = (value) => normalize(value).replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "geral";
  const brazilDateKey = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
  function trackLotteryAction(action, slug = "geral") {
    try {
      if (!window.firebase?.database) return;
      window.firebase.database().ref(`metricasLoterias/${brazilDateKey()}/${metricKey(slug)}/${metricKey(action)}`)
        .transaction((current) => Number(current || 0) + 1)
        .catch((error) => console.warn("Nao foi possivel registrar a acao da loteria.", error));
    } catch (error) {
      console.warn("Nao foi possivel registrar a acao da loteria.", error);
    }
  }
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

  function brazilDateNumber(value = new Date()) {
    const parts = Object.fromEntries(new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(value).map((part) => [part.type, part.value]));
    return Number(`${parts.year}${parts.month}${parts.day}`);
  }

  function resultDateNumber(value) {
    const match = String(value || "").match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    return match ? Number(`${match[3]}${match[2]}${match[1]}`) : 0;
  }

  function normalizeDirectResult(data) {
    if (!data || typeof data !== "object") return null;
    return {
      ...data,
      numero: data.numero ?? data.numeroDoConcurso,
      listaDezenas: data.listaDezenas ?? data.dezenas ?? [],
      listaDezenasSegundoSorteio: data.listaDezenasSegundoSorteio ?? data.dezenasSegundoSorteio ?? []
    };
  }

  function validDirectResult(data, slug) {
    const expected = EXPECTED_NUMBERS[slug] || 1;
    const resultDate = resultDateNumber(data?.dataApuracao);
    return number(data?.numero) > 0 && Array.isArray(data?.listaDezenas) && data.listaDezenas.length >= expected && resultDate > 0 && resultDate <= brazilDateNumber();
  }

  async function fetchCaixaDirect(path) {
    const response = await fetch(`${CAIXA_DIRECT_BASE}/${path}?t=${Date.now()}`, { cache: "no-store", mode: "cors", headers: { accept: "application/json" }, signal: AbortSignal.timeout(10000) });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data) throw new Error(`CAIXA HTTP ${response.status}`);
    return normalizeDirectResult(data);
  }

  function normalizeHistoryFallback(data, slug) {
    if (!data || typeof data !== "object") return null;
    const dezenas = Array.isArray(data.dezenas) ? data.dezenas : [];
    return {
      ...data,
      numero: data.numero ?? data.concurso,
      dataApuracao: data.dataApuracao ?? data.data,
      listaDezenas: slug === "duplasena" && dezenas.length >= 12 ? dezenas.slice(0, 6) : data.listaDezenas ?? dezenas,
      listaDezenasSegundoSorteio: slug === "duplasena" && dezenas.length >= 12 ? dezenas.slice(6, 12) : data.listaDezenasSegundoSorteio ?? data.dezenasSegundoSorteio ?? [],
      nomeTimeCoracaoMesSorte: data.nomeTimeCoracaoMesSorte ?? data.timeCoracao ?? data.mesSorte ?? ""
    };
  }

  async function fetchHistoryContest(slug, contest) {
    try {
      const official = await fetchCaixaDirect(`${slug}/${contest}`);
      if (validDirectResult(official, slug)) return official;
    } catch (error) { }
    try {
      const response = await fetch(`${HISTORY_FALLBACK_BASE}/${slug}/${contest}?t=${Date.now()}`, { cache: "no-store", mode: "cors", headers: { accept: "application/json" }, signal: AbortSignal.timeout(10000) });
      const data = normalizeHistoryFallback(await response.json().catch(() => null), slug);
      return response.ok && validDirectResult(data, slug) ? data : null;
    } catch (error) { return null; }
  }

  async function fetchLatestValidDirect(slug, currentItem) {
    let latest = null;
    let specific = null;
    try { latest = await fetchCaixaDirect(slug); } catch (error) { }
    const reference = latest || currentItem?.data;
    const currentContest = number(reference?.numero);
    const today = brazilDateNumber();
    const nextDateReached = resultDateNumber(reference?.dataProximoConcurso) > 0 && resultDateNumber(reference?.dataProximoConcurso) <= today;
    const federalLatestIsOlder = slug === "federal" && resultDateNumber(reference?.dataApuracao) > 0 && resultDateNumber(reference?.dataApuracao) < today;
    const informedNext = number(reference?.numeroConcursoProximo);
    const nextContest = informedNext || (currentContest && (nextDateReached || federalLatestIsOlder) ? currentContest + 1 : 0);
    if ((nextDateReached || federalLatestIsOlder) && nextContest > currentContest) {
      try { specific = await fetchCaixaDirect(`${slug}/${nextContest}`); } catch (error) { }
    }
    const candidates = [specific, latest, currentItem?.data]
      .filter((data) => validDirectResult(data, slug))
      .sort((a, b) => number(b.numero) - number(a.numero));
    const chosen = candidates[0];
    if (!chosen || chosen === currentItem?.data) return currentItem || { slug, ok: false, message: "Resultado temporariamente indisponível." };
    return { ...(currentItem || {}), slug, ok: true, cache: false, stale: false, localFallback: false, origem: "CAIXA/direto", data: chosen };
  }

  async function enrichWithDirectResults(resultados = []) {
    const bySlug = new Map(resultados.map((item) => [item.slug, item]));
    return Promise.all(GAME_CONFIG.map((config) => fetchLatestValidDirect(config.slug, bySlug.get(config.slug))));
  }

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
        let resultados = payload.resultados.map((item) => {
          if (item.ok && item.data) return item;
          const fallback = cachedMap.get(item.slug);
          return fallback?.data ? { ...fallback, stale: true, localFallback: true } : item;
        });
        resultados = await enrichWithDirectResults(resultados);
        const normalized = { resultados, consultadoEm: payload.consultadoEm || new Date().toISOString(), stale: resultados.some((item) => item.stale || item.localFallback) };
        if (resultados.some((item) => item.ok && item.data)) saveCache(normalized);
        return normalized;
      } catch (error) { lastError = error; }
    }
    const directResults = await enrichWithDirectResults(cached?.resultados || []);
    if (directResults.some((item) => item.ok && item.data)) {
      const normalized = { resultados: directResults, consultadoEm: new Date().toISOString(), stale: directResults.some((item) => item.stale || item.localFallback) };
      saveCache(normalized);
      return normalized;
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

  function betPricesMarkup(slug) {
    const table = BET_PRICE_TABLES[slug];
    if (!table?.rows?.length) return "";
    return `<section class="lottery-bet-prices is-${esc(slug)}" aria-label="Valores das apostas"><h4><i class="fa-solid fa-coins"></i> Valores das apostas</h4><div class="lottery-bet-prices-scroll"><table><thead><tr>${table.headers.map((header) => `<th scope="col">${esc(header)}</th>`).join("")}</tr></thead><tbody>${table.rows.map((row) => `<tr>${row.map((cell, index) => `<${index === 0 ? "th" : "td"}${index === 0 ? ' scope="row"' : ""}>${esc(cell)}</${index === 0 ? "th" : "td"}>`).join("")}</tr>`).join("")}</tbody></table></div><small>Valores oficiais consultados em 26/08/2026. Confirme antes de apostar.</small></section>`;
  }

  function cardMarkup(config, item) {
    if (!item?.ok || !item.data) return `<article class="lottery-card lottery-${config.slug} is-unavailable"><div class="lottery-card-heading"><span class="lottery-game-icon"><i class="fa-solid ${config.icon}"></i></span><h3>${esc(config.nome)}</h3></div><p>Resultado temporariamente indisponível.</p><button type="button" data-lottery-retry><i class="fa-solid fa-rotate"></i> Tentar novamente</button></article>`;
    const data = item.data;
    const estimated = number(data.valorEstimadoProximoConcurso);
    const label = estimated ? compactMoney(estimated) : config.slug === "federal" ? "Veja as faixas" : "Não informado";
    return `<article class="lottery-card lottery-${config.slug} ${config.slug === "megasena" && data.acumulado ? "is-highlighted" : ""}" data-lottery-card="${config.slug}">
      <div class="lottery-card-heading"><span class="lottery-game-icon"><i class="fa-solid ${config.icon}"></i></span><div><div class="lottery-title-row"><h3>${esc(config.nome)}</h3>${data.acumulado ? `<span class="lottery-accumulated"><i class="fa-solid fa-arrow-trend-up"></i> Acumulou</span>` : ""}</div><small>Concurso ${esc(data.numero || "—")} • ${esc(data.dataApuracao || "Data não informada")}</small></div></div>
      ${balls(data.listaDezenas, config.slug)}
      <div class="lottery-draw-summary">
      <div class="lottery-prize"><span>${estimated ? "Prêmio estimado do próximo concurso" : "Premiação do concurso"}</span><strong>${esc(label)}</strong></div>
      ${data.dataProximoConcurso ? `<p class="lottery-next"><i class="fa-regular fa-calendar"></i><span><small>Próximo sorteio</small><strong>${esc(dateFull(data.dataProximoConcurso))}</strong></span></p>` : ""}
      </div>
      ${specialMarkup(data, config.slug)}
      ${item.stale ? `<p class="lottery-card-stale"><i class="fa-solid fa-clock-rotate-left"></i> Último resultado disponível</p>` : ""}
      <details class="lottery-rules" data-lottery-rules="${config.slug}"><summary><span><i class="fa-solid fa-circle-question"></i> Regras do jogo</span><i class="fa-solid fa-chevron-down lottery-rules-chevron"></i></summary><div><p>${esc(config.regra || "Consulte as regras oficiais desta modalidade nos canais das Loterias CAIXA.")}</p>${betPricesMarkup(config.slug)}</div></details>
      <div class="lottery-card-actions"><button type="button" class="lottery-history-button" data-lottery-history="${config.slug}"><i class="fa-solid fa-clock-rotate-left"></i> Histórico</button><button type="button" class="lottery-details-button" data-lottery-details="${config.slug}">Ver detalhes <i class="fa-solid fa-arrow-right"></i></button></div>
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
    root.querySelectorAll("[data-lottery-history]").forEach((button) => button.addEventListener("click", () => {
      trackLotteryAction("historico", button.dataset.lotteryHistory);
      openHistory(button.dataset.lotteryHistory, button);
    }));
    root.querySelectorAll("[data-lottery-details]").forEach((button) => button.addEventListener("click", () => {
      trackLotteryAction("detalhes", button.dataset.lotteryDetails);
      openDetails(button.dataset.lotteryDetails, button);
    }));
    root.querySelectorAll("[data-lottery-rules]").forEach((details) => details.addEventListener("toggle", () => {
      if (details.open) trackLotteryAction("regras", details.dataset.lotteryRules);
    }));
    root.querySelectorAll("[data-lottery-retry]").forEach((button) => button.addEventListener("click", () => {
      trackLotteryAction("tentar_novamente");
      loadResults(true);
    }));
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

  function historyCutoffNumber() {
    const cutoff = new Date(Date.now() - HISTORY_DAYS * 24 * 60 * 60 * 1000);
    return brazilDateNumber(cutoff);
  }

  async function loadHistory(slug) {
    const cached = state.historyCache.get(slug);
    if (cached && Date.now() - cached.savedAt < HISTORY_CACHE_TTL) return cached.items;
    const current = resultFor(slug)?.data;
    const currentContest = number(current?.numero);
    if (!currentContest) return [];
    const cutoff = historyCutoffNumber();
    const items = validDirectResult(current, slug) && resultDateNumber(current.dataApuracao) >= cutoff ? [current] : [];
    let nextContest = currentContest - 1;
    for (let loaded = 0; loaded < HISTORY_MAX_CONTESTS; loaded += HISTORY_BATCH_SIZE) {
      const contestNumbers = Array.from({ length: HISTORY_BATCH_SIZE }, (_, index) => nextContest - index).filter((contest) => contest > 0);
      const batch = await Promise.all(contestNumbers.map((contest) => fetchHistoryContest(slug, contest)));
      let reachedCutoff = false;
      batch.forEach((data) => {
        if (!validDirectResult(data, slug)) return;
        if (resultDateNumber(data.dataApuracao) < cutoff) reachedCutoff = true;
        else if (!items.some((item) => number(item.numero) === number(data.numero))) items.push(data);
      });
      if (reachedCutoff || !contestNumbers.length) break;
      nextContest -= HISTORY_BATCH_SIZE;
    }
    items.sort((a, b) => number(b.numero) - number(a.numero));
    state.historyCache.set(slug, { savedAt: Date.now(), items });
    return items;
  }

  function historyNumbersMarkup(data, slug) {
    const main = Array.isArray(data.listaDezenas) ? data.listaDezenas : [];
    const second = Array.isArray(data.listaDezenasSegundoSorteio) ? data.listaDezenasSegundoSorteio : [];
    const trevos = Array.isArray(data.trevosSorteados) ? data.trevosSorteados : [];
    const line = (values, extraClass = "") => `<div class="lottery-history-numbers ${slug === "federal" ? "is-federal" : ""} ${extraClass}">${values.map((value) => `<span>${esc(value)}</span>`).join("")}</div>`;
    return `${line(main)}${second.length ? `<small>Segundo sorteio</small>${line(second, "is-second")}` : ""}${trevos.length ? `<small>Trevos</small>${line(trevos, "is-trevo")}` : ""}`;
  }

  function historyListMarkup(items, slug) {
    if (!items.length) return `<div class="lottery-history-empty"><i class="fa-solid fa-calendar-xmark"></i><p>Nenhum sorteio foi encontrado nos últimos 30 dias.</p></div>`;
    return `<div class="lottery-history-summary"><strong>${items.length}</strong><span>${items.length === 1 ? "sorteio encontrado" : "sorteios encontrados"} nos últimos 30 dias</span></div><div class="lottery-history-list">${items.map((data, index) => `<article class="lottery-history-item ${index === 0 ? "is-latest" : ""}"><div class="lottery-history-meta"><div><span>${index === 0 ? "Mais recente" : "Concurso"}</span><strong>${esc(data.numero)}</strong></div><time>${esc(dateFull(data.dataApuracao))}</time></div>${historyNumbersMarkup(data, slug)}${String(data.nomeTimeCoracaoMesSorte || "").replace(/\0/g, "").trim() ? `<p><i class="fa-solid fa-star"></i> ${esc(String(data.nomeTimeCoracaoMesSorte).replace(/\0/g, "").trim())}</p>` : ""}</article>`).join("")}</div>`;
  }

  async function openHistory(slug, trigger) {
    const item = resultFor(slug);
    if (!item?.data) return;
    closeDetails(false);
    state.lastTrigger = trigger || document.activeElement;
    const config = gameConfig(slug);
    const modal = document.createElement("div");
    modal.className = "lottery-modal";
    modal.dataset.lotteryModal = "true";
    modal.dataset.lotteryHistoryModal = slug;
    modal.innerHTML = `<section class="lottery-dialog lottery-history-dialog lottery-${slug}" role="dialog" aria-modal="true" aria-labelledby="lotteryHistoryTitle" tabindex="-1"><header><div><span>${esc(config.nome)}</span><h2 id="lotteryHistoryTitle">Histórico de sorteios</h2><p>Resultados realizados nos últimos 30 dias</p></div><button type="button" data-lottery-modal-close aria-label="Fechar histórico"><i class="fa-solid fa-xmark"></i></button></header><div class="lottery-dialog-body"><div class="lottery-history-loading"><i class="fa-solid fa-spinner fa-spin"></i><strong>Carregando histórico...</strong><span>Consultando os concursos anteriores na Caixa.</span></div></div></section>`;
    document.body.appendChild(modal);
    document.body.classList.add("lottery-modal-open");
    modal.querySelector("[data-lottery-modal-close]")?.focus();
    modal.querySelector("[data-lottery-modal-close]")?.addEventListener("click", () => closeDetails());
    modal.addEventListener("click", (event) => { if (event.target === modal) closeDetails(); });
    try {
      const items = await loadHistory(slug);
      const body = document.querySelector(`[data-lottery-history-modal="${slug}"] .lottery-dialog-body`);
      if (body) body.innerHTML = historyListMarkup(items, slug);
    } catch (error) {
      const body = document.querySelector(`[data-lottery-history-modal="${slug}"] .lottery-dialog-body`);
      if (body) body.innerHTML = `<div class="lottery-history-empty is-error"><i class="fa-solid fa-triangle-exclamation"></i><p>Não foi possível carregar o histórico agora.</p><button type="button" data-lottery-history-retry>Tentar novamente</button></div>`;
      body?.querySelector("[data-lottery-history-retry]")?.addEventListener("click", () => {
        trackLotteryAction("tentar_historico", slug);
        openHistory(slug, trigger);
      });
    }
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
    area.querySelector("#lotteryShare")?.addEventListener("click", () => { trackLotteryAction("compartilhar"); share(); });
    area.querySelector("#lotteryShare")?.addEventListener("keydown", (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); trackLotteryAction("compartilhar"); share(); } });
    area.querySelector("#lotteryRetry")?.addEventListener("click", () => { trackLotteryAction("atualizar"); loadResults(true); });
    area.querySelectorAll("[data-lottery-filter]").forEach((button) => button.addEventListener("click", () => {
      state.filter = button.dataset.lotteryFilter || "todas";
      trackLotteryAction(`filtro_${state.filter}`);
      area.querySelectorAll("[data-lottery-filter]").forEach((item) => item.classList.toggle("is-active", item === button));
      renderCards();
    }));
    area.querySelector("#lotterySearch")?.addEventListener("input", (event) => { state.query = event.target.value; renderCards(); });
  }

  async function loadResults(force = false, silent = false) {
    if (state.loading) return;
    state.loading = true;
    const results = document.getElementById("lotteryResults");
    const retry = document.getElementById("lotteryRetry");
    if (results && (!silent || !state.resultados.length)) results.innerHTML = skeleton();
    retry?.classList.add("is-loading");
    try {
      const payload = await fetchPayload(force);
      const previousContests = new Map(state.resultados.map((item) => [item.slug, number(item.data?.numero)]));
      state.resultados = payload.resultados || [];
      state.resultados.forEach((item) => {
        if (previousContests.has(item.slug) && previousContests.get(item.slug) !== number(item.data?.numero)) state.historyCache.delete(item.slug);
      });
      state.consultadoEm = payload.consultadoEm || new Date().toISOString();
      state.stale = Boolean(payload.stale);
      renderStatus();
      renderCards();
      const selected = routeSlug();
      if (selected) setTimeout(() => document.querySelector(`[data-lottery-card="${selected}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 80);
    } catch (error) {
      if (silent && state.resultados.length) {
        state.stale = true;
        renderStatus();
        return;
      }
      if (results) results.innerHTML = `<div class="lottery-load-error"><i class="fa-solid fa-triangle-exclamation"></i><h2>Não foi possível carregar os resultados neste momento.</h2><p>Você pode tentar novamente em alguns instantes.</p><button id="lotteryErrorRetry" type="button"><i class="fa-solid fa-rotate"></i> Tentar novamente</button></div>`;
      document.getElementById("lotteryErrorRetry")?.addEventListener("click", () => { trackLotteryAction("tentar_novamente"); loadResults(true); });
    } finally { state.loading = false; retry?.classList.remove("is-loading"); }
  }

  function pageMarkup() {
    return `<main class="lottery-page">
      <div class="page-header lottery-page-header"><h2><i class="fa-solid fa-clover"></i> Resultados das Loterias</h2><i id="lotteryShare" class="fa-solid fa-share-nodes share-btn" role="button" tabindex="0" aria-label="Compartilhar resultados das loterias"></i></div>
      <section class="lottery-intro"><span class="lottery-intro-icon"><i class="fa-solid fa-clover"></i></span><div class="lottery-intro-copy"><span class="lottery-kicker">Informação oficial</span><p>Confira os últimos resultados e os prêmios estimados das Loterias CAIXA.</p></div><div id="lotteryStatus" class="lottery-status" aria-live="polite"><span><i class="fa-solid fa-spinner fa-spin"></i> Atualizando resultados...</span></div></section>
      <section class="lottery-tools" aria-label="Filtros de loterias"><div class="lottery-filter-chips"><button type="button" class="is-active" data-lottery-filter="todas">Todas</button><button type="button" data-lottery-filter="megasena">Mega-Sena</button><button type="button" data-lottery-filter="lotofacil">Lotofácil</button><button type="button" data-lottery-filter="quina">Quina</button><button type="button" data-lottery-filter="outras">Outras</button></div><label class="lottery-search"><i class="fa-solid fa-magnifying-glass"></i><span class="sr-only">Buscar loteria</span><input id="lotterySearch" type="search" placeholder="Buscar loteria" autocomplete="off"></label><button id="lotteryRetry" class="lottery-refresh" type="button" title="Atualizar resultados"><i class="fa-solid fa-rotate"></i><span>Atualizar</span></button></section>
      <div id="lotteryResults" class="lottery-results" aria-live="polite">${skeleton()}</div>
      <footer class="lottery-disclaimer"><i class="fa-solid fa-circle-info"></i><div><p>Dados informativos obtidos das Loterias CAIXA. Confira sempre o resultado nos canais oficiais.</p><a href="https://loterias.caixa.gov.br/" target="_blank" rel="noopener noreferrer">Consultar resultados oficiais nas Loterias CAIXA <i class="fa-solid fa-arrow-up-right-from-square"></i></a><small>O Olá Carlópolis apenas divulga informações de caráter informativo e não realiza apostas. Os resultados e valores devem ser confirmados nos canais oficiais das Loterias CAIXA. Aposte com responsabilidade. Proibido para menores de 18 anos.</small></div></footer>
    </main>`;
  }

  function stopAutoRefresh() {
    if (state.refreshTimer) clearInterval(state.refreshTimer);
    state.refreshTimer = null;
  }

  function startAutoRefresh() {
    stopAutoRefresh();
    state.refreshTimer = setInterval(() => {
      if (state.open && document.visibilityState === "visible") loadResults(true, true);
    }, AUTO_REFRESH_MS);
  }

  async function showPage(selectedSlug = "") {
    const area = captureContentArea();
    if (!area) return;
    const wasOpen = state.open;
    state.open = true;
    if (!wasOpen) trackLotteryAction("abrir_tela");
    document.body.classList.add("lottery-route-open");
    setMetadata(true);
    if (!area.querySelector(".lottery-page")) area.innerHTML = pageMarkup();
    const page = area.querySelector(".lottery-page");
    if (page && page.dataset.eventsBound !== "true") {
      bindPageEvents(area);
      page.dataset.eventsBound = "true";
    }
    window.scrollTo({ top: 0, behavior: "auto" });
    const hadResults = state.resultados.length > 0;
    if (hadResults) { renderStatus(); renderCards(); }
    await loadResults(true, hadResults);
    startAutoRefresh();
    if (selectedSlug) setTimeout(() => document.querySelector(`[data-lottery-card="${selectedSlug}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 100);
  }

  function closePage() {
    stopAutoRefresh();
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
    stopAutoRefresh();
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
    }
    handleHash();
  });
  window.addEventListener("hashchange", handleHash);
  document.addEventListener("visibilitychange", () => {
    if (state.open && document.visibilityState === "visible") loadResults(true, true);
  });

  window.mostrarLoterias = showPage;
  window.abrirLoterias = openRoute;
  window.fecharLoteriasDetalhes = closeDetails;
})();
