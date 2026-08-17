// Pagina publica de atualizacao de combustiveis - v3
(() => {
  const byId = (id) => document.getElementById(id);
  const state = { posto: "", email: "", password: "", station: null, user: null };
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

  function saoPauloDate(timestamp = Date.now()) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(new Date(timestamp)).reduce((result, part) => {
      if (part.type !== "literal") result[part.type] = part.value;
      return result;
    }, {});
    return `${parts.year}-${parts.month}-${parts.day}`;
  }

  function parsePrice(value) {
    const number = Number(String(value || "").trim().replace(",", "."));
    return Number.isFinite(number) ? Math.round(number * 1000) / 1000 : 0;
  }

  function safeStation(station = {}) {
    const products = Object.entries(station.combustiveis || {})
      .filter(([, product]) => product && product.ativo !== false)
      .map(([id, product]) => ({ id, nome: String(product.nome || id), preco: Number(product.preco || 0) || 0, atualizadoEm: String(product.atualizadoEm || "") }));
    return {
      id: state.posto,
      nome: String(station.nomeExibicao || station.razaoSocial || "Posto"),
      imagem: String(station.imagem || ""),
      endereco: String(station.endereco || ""),
      bairro: String(station.bairro || ""),
      combustiveis: products
    };
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
  function renderStation(station) {
    state.station = station;
    byId("fuelUpdateStationName").textContent = station.nome || "Posto";
    byId("fuelUpdateStationAddress").textContent = [station.endereco, station.bairro].filter(Boolean).join(" - ");
    byId("fuelUpdatePhoto").innerHTML = station.imagem
      ? `<img src="${escapeHtml(station.imagem)}" alt="Foto de ${escapeHtml(station.nome || "posto")}">`
      : '<i class="fa-solid fa-gas-pump"></i>';
    byId("fuelUpdateProducts").innerHTML = (station.combustiveis || []).map((product) => `
      <article class="fuel-update-product ${fuelVisualClass(product.nome)}" data-product-id="${escapeHtml(product.id)}">
        <div><strong>${escapeHtml(product.nome)}</strong><small>Ultima atualizacao: ${escapeHtml(dateLabel(product.atualizadoEm))}</small></div>
        <label><span>R$</span><input data-price type="text" inputmode="decimal" autocomplete="off" required value="${product.preco ? Number(product.preco).toFixed(3).replace(".", ",") : ""}" placeholder="0,000" aria-label="Preco de ${escapeHtml(product.nome)}"></label>
      </article>`).join("");
    show("content");
  }

  async function authenticateLink() {
    await auth.setPersistence(firebase.auth.Auth.Persistence.NONE);
    const credential = await auth.signInWithEmailAndPassword(state.email, state.password);
    const profileSnapshot = await db.ref(`usuariosByUid/${credential.user.uid}`).once("value");
    const profile = profileSnapshot.val() || {};
    const authorized = profile.status === "ativo"
      && profile.role === "cliente"
      && profile.postoCombustivelId === state.posto
      && profile.permissoes?.combustiveis_precos === true;
    if (!authorized) throw new Error("Este link foi revogado ou nao possui mais permissao.");
    state.user = credential.user;
  }

  async function load() {
    const params = new URLSearchParams(location.hash.replace(/^#/, ""));
    state.posto = params.get("posto") || "";
    state.email = params.get("email") || "";
    state.password = params.get("chave") || "";
    if (!state.posto || !state.email || !state.password) {
      byId("fuelUpdateErrorMessage").textContent = "Este link e antigo ou esta incompleto. Solicite um novo link ao Ola Carlopolis.";
      show("error");
      return;
    }
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
      byId("fuelUpdateErrorMessage").textContent = error?.code === "auth/wrong-password" || error?.code === "auth/user-not-found" || error?.code === "auth/invalid-login-credentials"
        ? "Este link foi revogado ou substituido. Solicite um novo link ao Ola Carlopolis."
        : (error.message || "Solicite um novo link ao Ola Carlopolis.");
      show("error");
    }
  }

  byId("fuelUpdateForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!state.user) return;
    const prices = {};
    let invalid = false;
    byId("fuelUpdateProducts")?.querySelectorAll("[data-product-id]").forEach((row) => {
      const input = row.querySelector("[data-price]");
      const price = parsePrice(input?.value);
      input?.setCustomValidity(price > 0 && price <= 99.999 ? "" : "Informe um preco valido.");
      if (!(price > 0 && price <= 99.999)) invalid = true;
      prices[row.dataset.productId] = price;
    });
    if (invalid || !event.currentTarget.reportValidity()) return;
    const button = byId("fuelUpdateSubmit");
    button.disabled = true;
    button.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Atualizando...';
    try {
      const now = Date.now();
      const date = saoPauloDate(now);
      await Promise.all(Object.entries(prices).map(([productId, price]) => {
        const base = `configuracoes/combustiveis/postos/${state.posto}/combustiveis/${productId}`;
        return db.ref(base).update({
          preco: price,
          atualizadoEm: date,
          atualizadoEmTimestamp: now,
          origemAtualizacao: "painel"
        });
      }));
      try {
        const historyId = db.ref(`combustiveisHistorico/${state.posto}`).push().key;
        await db.ref(`combustiveisHistorico/${state.posto}/${historyId}`).set({
          postoId: state.posto,
          postoNome: state.station.nome,
          origem: "painel",
          viaLink: true,
          uid: state.user.uid,
          email: state.email,
          atualizadoEm: date,
          atualizadoEmTimestamp: now,
          precos: prices
        });
      } catch (historyError) {
        console.warn("Precos salvos, mas o historico nao pode ser registrado.", historyError);
      }
      state.station.combustiveis = state.station.combustiveis.map((product) => ({ ...product, preco: prices[product.id], atualizadoEm: date }));
      byId("fuelUpdateConfirm").checked = false;
      show("success");
    } catch (error) {
      console.error("Falha ao atualizar os precos do posto.", error);
      alert(error?.code === "PERMISSION_DENIED" || error?.code === "permission_denied" ? "Este link nao possui mais permissao. Solicite um novo link." : "Nao foi possivel atualizar os precos agora.");
    } finally {
      button.disabled = false;
      button.innerHTML = '<i class="fa-solid fa-check"></i> Confirmar e atualizar precos';
    }
  });

  byId("fuelUpdateClose")?.addEventListener("click", () => {
    window.close();
    window.setTimeout(() => {
      if (!document.hidden) location.href = "./";
    }, 180);
  });
  byId("fuelUpdateAgain")?.addEventListener("click", () => renderStation(state.station));
  load();
})();
