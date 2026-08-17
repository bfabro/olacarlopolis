// Pagina publica de atualizacao de combustiveis - v1
(() => {
  const byId = (id) => document.getElementById(id);
  const state = { posto: "", token: "", station: null };

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

  function parsePrice(value) {
    const number = Number(String(value || "").trim().replace(",", "."));
    return Number.isFinite(number) ? Math.round(number * 1000) / 1000 : 0;
  }

  function renderStation(station) {
    state.station = station;
    byId("fuelUpdateStationName").textContent = station.nome || "Posto";
    byId("fuelUpdateStationAddress").textContent = [station.endereco, station.bairro].filter(Boolean).join(" - ");
    byId("fuelUpdatePhoto").innerHTML = station.imagem
      ? `<img src="${escapeHtml(station.imagem)}" alt="Foto de ${escapeHtml(station.nome || "posto")}">`
      : '<i class="fa-solid fa-gas-pump"></i>';
    byId("fuelUpdateProducts").innerHTML = (station.combustiveis || []).map((product) => `
      <article class="fuel-update-product" data-product-id="${escapeHtml(product.id)}">
        <div><strong>${escapeHtml(product.nome)}</strong><small>Ultima atualizacao: ${escapeHtml(dateLabel(product.atualizadoEm))}</small></div>
        <label><span>R$</span><input data-price type="text" inputmode="decimal" autocomplete="off" required value="${product.preco ? Number(product.preco).toFixed(3).replace(".", ",") : ""}" placeholder="0,000" aria-label="Preco de ${escapeHtml(product.nome)}"></label>
      </article>`).join("");
    show("content");
  }

  async function callApi(action, prices = null) {
    const response = await fetch("/api/atualizar-combustivel", {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      cache: "no-store",
      body: JSON.stringify({ action, posto: state.posto, token: state.token, precos: prices })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.success) throw new Error(payload.message || "Nao foi possivel continuar.");
    return payload;
  }

  async function load() {
    const params = new URLSearchParams(location.hash.replace(/^#/, ""));
    state.posto = params.get("posto") || "";
    state.token = params.get("token") || "";
    if (!state.posto || !state.token) {
      byId("fuelUpdateErrorMessage").textContent = "Este link esta incompleto. Solicite um novo link ao Ola Carlopolis.";
      show("error");
      return;
    }
    show("loading");
    try {
      const payload = await callApi("load");
      if (!payload.posto?.combustiveis?.length) throw new Error("Este posto ainda nao possui combustiveis habilitados.");
      renderStation(payload.posto);
    } catch (error) {
      byId("fuelUpdateErrorMessage").textContent = error.message || "Solicite um novo link ao Ola Carlopolis.";
      show("error");
    }
  }

  byId("fuelUpdateForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const prices = {};
    let invalid = false;
    byId("fuelUpdateProducts")?.querySelectorAll("[data-product-id]").forEach((row) => {
      const price = parsePrice(row.querySelector("[data-price]")?.value);
      row.querySelector("[data-price]")?.setCustomValidity(price > 0 && price <= 99.999 ? "" : "Informe um preco valido.");
      if (!(price > 0 && price <= 99.999)) invalid = true;
      prices[row.dataset.productId] = price;
    });
    if (invalid || !event.currentTarget.reportValidity()) return;
    const button = byId("fuelUpdateSubmit");
    button.disabled = true;
    button.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Atualizando...';
    try {
      const payload = await callApi("update", prices);
      state.station = payload.posto;
      byId("fuelUpdateConfirm").checked = false;
      show("success");
    } catch (error) {
      alert(error.message || "Nao foi possivel atualizar os precos agora.");
    } finally {
      button.disabled = false;
      button.innerHTML = '<i class="fa-solid fa-check"></i> Confirmar e atualizar precos';
    }
  });

  byId("fuelUpdateAgain")?.addEventListener("click", () => renderStation(state.station));
  load();
})();
