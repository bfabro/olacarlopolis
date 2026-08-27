(() => {
  "use strict";

  const VALID_TYPES = new Set(["automovel", "imovel", "produto", "promocao", "servico"]);
  let openingKey = "";

  const normalize = (value = "") => String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, "")
    .toLowerCase();

  const sameId = (item = {}, id = "") => {
    const target = String(id || "").trim().toLowerCase();
    if (!target) return false;
    return [item.id, item.codRef, item.codigo]
      .some((value) => String(value || "").trim().toLowerCase() === target);
  };

  function buildUrl(type = "", id = "", route = "") {
    const url = new URL(window.location.href);
    url.pathname = url.pathname.replace(/index\.html$/i, "");
    url.search = "";
    url.searchParams.set("item", String(type || "").trim());
    url.searchParams.set("id", String(id || "").trim());
    url.hash = route ? (String(route).startsWith("#") ? route : `#${route}`) : "";
    return url.toString();
  }

  async function copyText(text = "") {
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return;
      } catch (error) {
        console.warn("Clipboard moderno indisponivel; usando copia compativel.", error);
      }
    }
    const field = document.createElement("textarea");
    field.value = text;
    field.setAttribute("readonly", "");
    field.style.cssText = "position:fixed;opacity:0;pointer-events:none";
    document.body.appendChild(field);
    field.select();
    const copied = document.execCommand("copy");
    field.remove();
    if (!copied) throw new Error("Clipboard indisponivel.");
  }

  function toast(message) {
    if (typeof window.mostrarToast === "function") {
      window.mostrarToast(message);
      return;
    }
    const element = document.createElement("div");
    element.className = "toast-compartilhar ativo";
    element.textContent = message;
    document.body.appendChild(element);
    setTimeout(() => element.remove(), 2300);
  }

  function configureModal(modal, { type = "", id = "", title = "item", route = "" } = {}) {
    const button = modal?.querySelector("[data-item-modal-share]");
    if (!button || !VALID_TYPES.has(type) || !String(id || "").trim()) {
      button?.remove();
      return;
    }
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (button.disabled) return;
      button.disabled = true;
      const icon = button.querySelector("i");
      try {
        await copyText(buildUrl(type, id, route));
        button.classList.add("is-copied");
        if (icon) icon.className = "fa-solid fa-check";
        button.setAttribute("aria-label", "Link copiado");
        button.title = "Link copiado";
        toast(`🔗 Link de ${title} copiado!`);
      } catch (error) {
        console.warn("Nao foi possivel copiar o link do item.", error);
        toast("❌ Não foi possível copiar o link.");
      } finally {
        setTimeout(() => {
          if (!document.body.contains(button)) return;
          button.disabled = false;
          button.classList.remove("is-copied");
          if (icon) icon.className = "fa-solid fa-share-nodes";
          button.setAttribute("aria-label", "Copiar link para compartilhar");
          button.title = "Copiar link para compartilhar";
        }, 1800);
      }
    });
  }

  function stores(api) {
    const byKey = new Map();
    (api.getCategories?.() || []).forEach((category) => {
      (category.establishments || []).forEach((store) => {
        const key = normalize(store.id || store.clienteId || store.nomeNormalizado || store.name || store.nome);
        if (key && !byKey.has(key)) byKey.set(key, store);
      });
    });
    Object.entries(window.__clientesPublicosCache || {}).forEach(([clientId, client]) => {
      const name = client?.nome || client?.name || client?.nomeFantasia || clientId;
      const key = normalize(client?.nomeNormalizado || clientId || name);
      if (!key || byKey.has(key)) return;
      byKey.set(key, { ...client, id: client.id || clientId, clienteId: clientId, nomeNormalizado: key, name, nome: name });
    });
    return [...byKey.values()];
  }

  async function prepareClients(api, refresh = false) {
    try { await api.loadClients?.(); } catch (error) { console.warn("Clientes publicos indisponiveis.", error); }
    if (refresh) {
      try { await api.refreshClients?.(); } catch (error) { console.warn("Atualizacao publica indisponivel.", error); }
    }
  }

  async function findProduct(api, id) {
    await prepareClients(api);
    const search = () => {
      for (const store of stores(api)) {
        const item = (api.getProducts?.(store) || []).find((entry) => sameId(entry, id));
        if (item) return item;
      }
      return null;
    };
    let item = search();
    if (!item) {
      await prepareClients(api, true);
      item = search();
    }
    return item;
  }

  async function findService(api, id) {
    await prepareClients(api);
    const search = () => { for (const store of stores(api)) { const item = (api.getServices?.(store) || []).find((entry) => sameId(entry, id)); if (item) return item; } return null; };
    let item = search(); if (!item) { await prepareClients(api, true); item = search(); } return item;
  }

  async function findPromotion(api, id) {
    await prepareClients(api);
    const search = () => (api.getPromotions?.() || []).find((item) => sameId(item, id)) || null;
    let item = search();
    if (!item) {
      await prepareClients(api, true);
      item = search();
    }
    return item ? api.promoToProduct?.(item) || item : null;
  }

  async function findAuto(api, id) {
    let remote = [];
    try { remote = await api.loadAutos?.() || []; } catch (error) { console.warn("Automoveis remotos indisponiveis.", error); }
    const byId = new Map((remote || []).map((item) => [String(item.id || item.codRef || ""), item]));
    for (const store of stores(api)) {
      (api.getStoreAutos?.(store, remote) || []).forEach((item) => {
        const key = String(item.id || item.codRef || "");
        if (key && !byId.has(key)) byId.set(key, item);
      });
    }
    return [...byId.values()].find((item) => sameId(item, id)) || null;
  }

  async function findProperty(api, id) {
    try {
      const items = await api.loadProperties?.() || [];
      window.__imoveisPublicosCache = items;
      return items.find((item) => sameId(item, id)) || null;
    } catch (error) {
      console.warn("Imoveis publicos indisponiveis.", error);
      return (window.__imoveisPublicosCache || []).find((item) => sameId(item, id)) || null;
    }
  }

  function consumeSharedItemUrl() {
    const url = new URL(window.location.href);
    url.searchParams.delete("item");
    url.searchParams.delete("id");
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  }

  async function openSharedItem() {
    const params = new URLSearchParams(window.location.search);
    const type = String(params.get("item") || "").trim().toLowerCase();
    const id = String(params.get("id") || "").trim();
    if (!VALID_TYPES.has(type) || !id) return false;
    const key = `${type}:${id}`;
    if (openingKey === key && document.querySelector(".imovel-detalhes-modal")) return true;
    const api = window.__itemShareApi;
    if (!api) return false;
    openingKey = key;
    let item = null;
    try {
      if (type === "automovel") item = await findAuto(api, id);
      if (type === "imovel") item = await findProperty(api, id);
      if (type === "produto") item = await findProduct(api, id);
      if (type === "promocao") item = await findPromotion(api, id);
      if (type === "servico") item = await findService(api, id);
      if (!item) {
        toast("Este item compartilhado não está mais disponível.");
        return false;
      }
      if (type === "automovel") api.openAuto?.(item);
      if (type === "imovel") api.openProperty?.(item);
      if (type === "produto") api.openProduct?.(item, "Produto");
      if (type === "promocao") api.openProduct?.(item, "Promocao");
      if (type === "servico") api.openService?.(item);
      consumeSharedItemUrl();
      return true;
    } finally {
      if (!item) openingKey = "";
    }
  }

  window.ItemShare = { buildUrl, configureModal, openSharedItem };
  window.addEventListener("load", () => setTimeout(openSharedItem, 350));
  window.addEventListener("popstate", () => setTimeout(openSharedItem, 0));
})();
