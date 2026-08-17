// Pagina publica de atualizacao de combustiveis - v5
(() => {
  const byId = (id) => document.getElementById(id);
  const state = { posto: "", email: "", password: "", station: null, user: null, promotions: {}, editingPromoId: "" };
  const firebaseConfig = {
    apiKey: "AIzaSyDWHsZSHwVFpD88ChUywjw_GdZPifdrRGI",
    authDomain: "contadoracessos.firebaseapp.com",
    databaseURL: "https://contadoracessos-default-rtdb.firebaseio.com",
    projectId: "contadoracessos",
    storageBucket: "contadoracessos.firebasestorage.app",
    messagingSenderId: "521517291315",
    appId: "1:521517291315:web:74f8d878d2d8769460d046"
  };
  const app = firebase.apps.length ? firebase.app() : firebase.initializeApp(firebaseConfig);
  const auth = app.auth();
  const db = app.database();

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
  }

  function show(name) {
    ["Loading", "Error", "Content", "Success"].forEach((key) => byId(`fuelUpdate${key}`)?.classList.toggle("hidden", key.toLowerCase() !== name));
  }

  function dateLabel(value) {
    const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return match ? `${match[3]}/${match[2]}/${match[1]}` : "Ainda nao atualizado";
  }

  function dateTimeLabel(timestamp) {
    if (!Number(timestamp)) return "";
    return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(Number(timestamp)));
  }

  function localDateTimeValue(timestamp) {
    const date = new Date(Number(timestamp) || Date.now());
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
  }

  function saoPauloDate(timestamp = Date.now()) {
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" })
      .formatToParts(new Date(timestamp)).reduce((result, part) => { if (part.type !== "literal") result[part.type] = part.value; return result; }, {});
    return `${parts.year}-${parts.month}-${parts.day}`;
  }

  function parsePrice(value) {
    const number = Number(String(value || "").trim().replace(",", "."));
    return Number.isFinite(number) ? Math.round(number * 1000) / 1000 : 0;
  }

  function normalizePromotion(promotion) {
    if (!promotion || promotion.ativo !== true) return null;
    const price = parsePrice(promotion.preco);
    const start = Number(promotion.inicioEmTimestamp || 0);
    const end = Number(promotion.fimEmTimestamp || 0);
    return price > 0 && start > 0 && end > start ? { ativo: true, preco: price, inicioEmTimestamp: start, fimEmTimestamp: end } : null;
  }

  function safeStation(station = {}) {
    const products = Object.entries(station.combustiveis || {}).filter(([, product]) => product && product.ativo !== false).map(([id, product]) => ({
      id, nome: String(product.nome || id), preco: Number(product.preco || 0) || 0,
      atualizadoEm: String(product.atualizadoEm || ""), promocao: normalizePromotion(product.promocao)
    }));
    return { id: state.posto, nome: String(station.nomeExibicao || station.razaoSocial || "Posto"), imagem: String(station.imagem || ""), endereco: String(station.endereco || ""), bairro: String(station.bairro || ""), combustiveis: products };
  }

  function fuelVisualClass(name) {
    const normalized = String(name || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (normalized.includes("gasolina") && normalized.includes("aditiv")) return "fuel-type-gasoline-additive";
    if (normalized.includes("gasolina")) return "fuel-type-gasoline";
    if (normalized.includes("etanol") || normalized.includes("alcool")) return "fuel-type-ethanol";
    if (normalized.includes("diesel") && normalized.includes("s10")) return "fuel-type-diesel-s10";
    if (normalized.includes("diesel")) return "fuel-type-diesel";
    if (normalized.includes("gnv") || normalized.includes("gas natural")) return "fuel-type-gnv";
    return "fuel-type-other";
  }

  function promotionSummary(productId) {
    const promotion = state.promotions[productId];
    return promotion ? `<span class="fuel-promo-summary"><i class="fa-solid fa-tag"></i> R$ ${Number(promotion.preco).toFixed(3).replace(".", ",")} ate ${escapeHtml(dateTimeLabel(promotion.fimEmTimestamp))}</span>` : "";
  }

  function bindProductActions() {
    byId("fuelUpdateProducts")?.querySelectorAll("[data-promo-toggle]").forEach((input) => {
      input.addEventListener("change", () => {
        const productId = input.closest("[data-product-id]")?.dataset.productId || "";
        if (!input.checked) { delete state.promotions[productId]; renderStation(state.station, false); return; }
        openPromoModal(productId);
      });
    });
    byId("fuelUpdateProducts")?.querySelectorAll("[data-promo-edit]").forEach((button) => button.addEventListener("click", () => openPromoModal(button.closest("[data-product-id]")?.dataset.productId || "")));
  }

  function renderStation(station, resetValues = true) {
    const draftPrices = resetValues ? {} : Object.fromEntries([...byId("fuelUpdateProducts")?.querySelectorAll("[data-product-id]") || []].map((row) => [row.dataset.productId, row.querySelector("[data-price]")?.value || ""]));
    state.station = station;
    if (resetValues) {
      state.promotions = Object.fromEntries((station.combustiveis || []).filter((product) => product.promocao).map((product) => [product.id, { ...product.promocao }]));
      const storedName = localStorage.getItem(`fuel-update-responsible:${state.posto}`) || "";
      if (byId("fuelUpdateResponsible") && !byId("fuelUpdateResponsible").value) byId("fuelUpdateResponsible").value = storedName;
    }
    byId("fuelUpdateStationName").textContent = station.nome || "Posto";
    byId("fuelUpdateStationAddress").textContent = [station.endereco, station.bairro].filter(Boolean).join(" - ");
    byId("fuelUpdatePhoto").innerHTML = station.imagem ? `<img src="${escapeHtml(station.imagem)}" alt="Foto de ${escapeHtml(station.nome || "posto")}">` : '<i class="fa-solid fa-gas-pump"></i>';
    byId("fuelUpdateProducts").innerHTML = (station.combustiveis || []).map((product) => `
      <article class="fuel-update-product ${fuelVisualClass(product.nome)}" data-product-id="${escapeHtml(product.id)}">
        <div class="fuel-product-copy"><strong>${escapeHtml(product.nome)}</strong><small>Ultima atualizacao: ${escapeHtml(dateLabel(product.atualizadoEm))}</small>${promotionSummary(product.id)}</div>
        <label class="fuel-price-field"><span>R$</span><input data-price type="text" inputmode="decimal" autocomplete="off" required value="${draftPrices[product.id] ?? (product.preco ? Number(product.preco).toFixed(3).replace(".", ",") : "")}" placeholder="0,000" aria-label="Preco de ${escapeHtml(product.nome)}"></label>
        <div class="fuel-promo-control"><label><input data-promo-toggle type="checkbox" ${state.promotions[product.id] ? "checked" : ""}> Preco promocional</label>${state.promotions[product.id] ? '<button data-promo-edit type="button"><i class="fa-solid fa-pen"></i> Editar</button>' : ""}</div>
      </article>`).join("");
    bindProductActions();
    show("content");
  }

  function openPromoModal(productId) {
    if (!productId) return;
    state.editingPromoId = productId;
    const product = state.station?.combustiveis?.find((item) => item.id === productId);
    const promotion = state.promotions[productId];
    byId("fuelPromoTitle").textContent = `Promocao - ${product?.nome || "Combustivel"}`;
    byId("fuelPromoPrice").value = promotion?.preco ? Number(promotion.preco).toFixed(3).replace(".", ",") : "";
    byId("fuelPromoStart").value = localDateTimeValue(promotion?.inicioEmTimestamp || Date.now());
    byId("fuelPromoEnd").value = localDateTimeValue(promotion?.fimEmTimestamp || (Date.now() + 86400000));
    byId("fuelPromoModal").classList.remove("hidden");
    byId("fuelPromoPrice").focus();
  }

  function closePromoModal(cancelled = false) {
    const productId = state.editingPromoId;
    byId("fuelPromoModal").classList.add("hidden");
    state.editingPromoId = "";
    if (cancelled && productId && !state.promotions[productId]) renderStation(state.station, false);
  }

  byId("fuelPromoSave")?.addEventListener("click", () => {
    const price = parsePrice(byId("fuelPromoPrice")?.value);
    const start = new Date(byId("fuelPromoStart")?.value || "").getTime();
    const end = new Date(byId("fuelPromoEnd")?.value || "").getTime();
    const regular = parsePrice(byId("fuelUpdateProducts")?.querySelector(`[data-product-id="${CSS.escape(state.editingPromoId)}"] [data-price]`)?.value);
    if (!(price > 0 && price <= 99.999)) { alert("Informe um preco promocional valido."); return; }
    if (regular > 0 && price >= regular) { alert("O preco promocional deve ser menor que o valor normal."); return; }
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) { alert("A validade deve ser posterior ao inicio da promocao."); return; }
    state.promotions[state.editingPromoId] = { ativo: true, preco: price, inicioEmTimestamp: start, fimEmTimestamp: end };
    closePromoModal();
    renderStation(state.station, false);
  });
  byId("fuelPromoCancel")?.addEventListener("click", () => closePromoModal(true));
  byId("fuelPromoClose")?.addEventListener("click", () => closePromoModal(true));

  async function authenticateLink() {
    await auth.setPersistence(firebase.auth.Auth.Persistence.NONE);
    const credential = await auth.signInWithEmailAndPassword(state.email, state.password);
    const profileSnapshot = await db.ref(`usuariosByUid/${credential.user.uid}`).once("value");
    const profile = profileSnapshot.val() || {};
    const authorized = profile.status === "ativo" && profile.role === "cliente" && profile.postoCombustivelId === state.posto && profile.permissoes?.combustiveis_precos === true;
    if (!authorized) throw new Error("Este link foi revogado ou nao possui mais permissao.");
    state.user = credential.user;
  }

  async function load() {
    const params = new URLSearchParams(location.hash.replace(/^#/, ""));
    state.posto = params.get("posto") || ""; state.email = params.get("email") || ""; state.password = params.get("chave") || "";
    if (!state.posto || !state.email || !state.password) { byId("fuelUpdateErrorMessage").textContent = "Este link e antigo ou esta incompleto. Solicite um novo link ao Ola Carlopolis."; show("error"); return; }
    show("loading");
    try {
      await authenticateLink();
      const stationSnapshot = await db.ref(`configuracoes/combustiveis/postos/${state.posto}`).once("value");
      if (!stationSnapshot.exists()) throw new Error("Posto nao encontrado.");
      const station = safeStation(stationSnapshot.val());
      if (!station.combustiveis.length) throw new Error("Este posto ainda nao possui combustiveis habilitados.");
      renderStation(station);
    } catch (error) {
      console.error("Falha ao validar o link do posto.", error);
      byId("fuelUpdateErrorMessage").textContent = ["auth/wrong-password", "auth/user-not-found", "auth/invalid-login-credentials"].includes(error?.code) ? "Este link foi revogado ou substituido. Solicite um novo link ao Ola Carlopolis." : (error.message || "Solicite um novo link ao Ola Carlopolis.");
      show("error");
    }
  }

  byId("fuelUpdateForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!state.user) return;
    const responsible = String(byId("fuelUpdateResponsible")?.value || "").trim().replace(/\s+/g, " ");
    if (responsible.length < 3) { byId("fuelUpdateResponsible")?.focus(); alert("Informe o nome de quem esta realizando a atualizacao."); return; }
    const prices = {}; let invalid = false;
    byId("fuelUpdateProducts")?.querySelectorAll("[data-product-id]").forEach((row) => {
      const input = row.querySelector("[data-price]"); const price = parsePrice(input?.value);
      input?.setCustomValidity(price > 0 && price <= 99.999 ? "" : "Informe um preco valido.");
      if (!(price > 0 && price <= 99.999) || (state.promotions[row.dataset.productId] && state.promotions[row.dataset.productId].preco >= price)) invalid = true;
      prices[row.dataset.productId] = price;
    });
    if (invalid || !event.currentTarget.reportValidity()) { alert("Confira os valores. O preco promocional deve ser menor que o valor normal."); return; }
    const button = byId("fuelUpdateSubmit"); button.disabled = true; button.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Atualizando...';
    try {
      const now = Date.now(); const date = saoPauloDate(now); const updates = {}; const changes = {};
      Object.entries(prices).forEach(([productId, price]) => {
        const product = state.station.combustiveis.find((item) => item.id === productId) || {};
        const promotion = state.promotions[productId] ? { ...state.promotions[productId], responsavelNome: responsible, atualizadoEmTimestamp: now } : null;
        const base = `configuracoes/combustiveis/postos/${state.posto}/combustiveis/${productId}`;
        updates[`${base}/preco`] = price; updates[`${base}/atualizadoEm`] = date; updates[`${base}/atualizadoEmTimestamp`] = now; updates[`${base}/origemAtualizacao`] = "painel"; updates[`${base}/promocao`] = promotion;
        changes[productId] = { nome: product.nome || productId, precoAnterior: Number(product.preco || 0), precoNovo: price, promocaoAnterior: product.promocao || null, promocaoNova: promotion };
      });
      const historyId = db.ref(`combustiveisHistorico/${state.posto}`).push().key;
      updates[`combustiveisHistorico/${state.posto}/${historyId}`] = { postoId: state.posto, postoNome: state.station.nome, origem: "painel", viaLink: true, responsavelNome: responsible, uid: state.user.uid, email: state.email, atualizadoEm: date, atualizadoEmTimestamp: now, precos: prices, alteracoes: changes };
      await db.ref().update(updates);
      localStorage.setItem(`fuel-update-responsible:${state.posto}`, responsible);
      state.station.combustiveis = state.station.combustiveis.map((product) => ({ ...product, preco: prices[product.id], atualizadoEm: date, promocao: state.promotions[product.id] ? { ...state.promotions[product.id], responsavelNome: responsible, atualizadoEmTimestamp: now } : null }));
      byId("fuelUpdateConfirm").checked = false; show("success");
    } catch (error) {
      console.error("Falha ao atualizar os precos do posto.", error);
      alert(error?.code === "PERMISSION_DENIED" || error?.code === "permission_denied" ? "Este link nao possui mais permissao. Solicite um novo link." : "Nao foi possivel atualizar os precos agora.");
    } finally { button.disabled = false; button.innerHTML = '<i class="fa-solid fa-check"></i> Confirmar e atualizar precos'; }
  });

  byId("fuelUpdateClose")?.addEventListener("click", () => { window.close(); window.setTimeout(() => { if (!document.hidden) location.href = "./"; }, 180); });
  byId("fuelUpdateAgain")?.addEventListener("click", () => renderStation(state.station));
  load();
})();