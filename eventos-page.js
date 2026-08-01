/* eventos-page.js - tela publica dedicada de eventos - v3 */
(function () {
  "use strict";

  const ROUTE = "#eventos";
  const MODE_KEY = "ola_carlopolis_eventos_cards_v1";
  let refreshTimers = [];

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function richText(value) {
    return escapeHtml(String(value || "").replace(/<br\s*\/?\s*>/gi, "\n"))
      .replace(/\r?\n/g, "<br>");
  }

  function validExternalUrl(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    try {
      const normalized = /^https?:\/\//i.test(raw) ? raw : `https://${raw.replace(/^@/, "instagram.com/")}`;
      const url = new URL(normalized);
      return ["http:", "https:"].includes(url.protocol) ? url.href : "";
    } catch (_) {
      return "";
    }
  }

  function getEvents() {
    try {
      return window.__eventosPageApi?.getEvents?.() || [];
    } catch (error) {
      console.warn("Nao foi possivel carregar os eventos.", error);
      return [];
    }
  }

  function formatDate(event) {
    return window.__eventosPageApi?.formatDate?.(event) || event?.date || event?.data || "Data a confirmar";
  }

  function cardsMode() {
    try {
      const stored = localStorage.getItem(MODE_KEY);
      return stored === null ? true : stored === "true";
    } catch (_) {
      return true;
    }
  }

  function setCardsMode(active) {
    try {
      localStorage.setItem(MODE_KEY, String(Boolean(active)));
    } catch (_) {}
  }

  function eventLink(event) {
    return validExternalUrl(event?.linkEvento || event?.instagram || event?.link || event?.url || "");
  }

  function eventImage(event) {
    return String(event?.image || event?.imagem || "").trim();
  }

  function cardTemplate(event, index) {
    const title = event?.name || event?.nome || event?.titulo || "Evento";
    const date = formatDate(event);
    const address = event?.address || event?.local || "Local a confirmar";
    const description = event?.infoAdicional || event?.descricao || event?.description || "Mais informacoes serao divulgadas em breve.";
    const image = eventImage(event);
    const link = eventLink(event);

    return `
      <article class="eventos-public-card" data-event-index="${index}" tabindex="0" role="button" aria-label="Ver detalhes de ${escapeHtml(title)}">
        <div class="eventos-public-media">
          ${image
            ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(title)}" loading="lazy" decoding="async">`
            : `<div class="eventos-public-placeholder"><i class="fa-regular fa-calendar-days"></i></div>`}
          <span class="eventos-public-badge"><i class="fa-solid fa-calendar-check"></i> Evento</span>
        </div>
        <div class="eventos-public-content">
          <div class="eventos-public-heading">
            <div>
              <span class="eventos-public-date"><i class="fa-regular fa-calendar"></i> ${escapeHtml(date)}</span>
              <h3>${escapeHtml(title)}</h3>
            </div>
          </div>
          <p class="eventos-public-location"><i class="fa-solid fa-location-dot"></i><span>${escapeHtml(address)}</span></p>
          <p class="eventos-public-description">${richText(description)}</p>
          <div class="eventos-public-actions">
            <button type="button" class="eventos-details-btn" data-event-details="${index}"><i class="fa-solid fa-circle-info"></i><span>Ver detalhes</span></button>
            ${link ? `<a href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer" class="eventos-link-btn"><i class="fa-brands fa-instagram"></i><span>Publicacao</span></a>` : ""}
          </div>
        </div>
      </article>`;
  }

  function closeModal() {
    closeExpandedImage();
    document.querySelector(".eventos-detail-modal")?.remove();
    document.body.classList.remove("eventos-modal-open");
  }

  function closeExpandedImage() {
    document.querySelector(".eventos-image-viewer")?.remove();
    document.body.classList.remove("eventos-image-open");
  }

  function openExpandedImage(image, title) {
    if (!image) return;
    closeExpandedImage();
    const viewer = document.createElement("div");
    viewer.className = "eventos-image-viewer";
    viewer.setAttribute("role", "dialog");
    viewer.setAttribute("aria-modal", "true");
    viewer.setAttribute("aria-label", `Imagem completa de ${title}`);
    viewer.innerHTML = `
      <div class="eventos-image-viewer-box">
        <button type="button" class="eventos-image-viewer-close" aria-label="Fechar imagem"><i class="fa-solid fa-xmark"></i></button>
        <img src="${escapeHtml(image)}" alt="${escapeHtml(title)}">
        <span class="eventos-image-viewer-caption"><i class="fa-solid fa-magnifying-glass"></i> Encarte completo</span>
      </div>`;
    document.body.appendChild(viewer);
    document.body.classList.add("eventos-image-open");
    viewer.querySelector(".eventos-image-viewer-close")?.addEventListener("click", closeExpandedImage);
    viewer.addEventListener("click", (clickEvent) => {
      if (clickEvent.target === viewer) closeExpandedImage();
    });
    viewer.querySelector(".eventos-image-viewer-close")?.focus();
  }

  function openModal(event) {
    closeModal();
    const title = event?.name || event?.nome || event?.titulo || "Evento";
    const date = formatDate(event);
    const address = event?.address || event?.local || "Local a confirmar";
    const description = event?.infoAdicional || event?.descricao || event?.description || "Mais informacoes serao divulgadas em breve.";
    const image = eventImage(event);
    const link = eventLink(event);
    const modal = document.createElement("div");
    modal.className = "eventos-detail-modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-label", title);
    modal.innerHTML = `
      <div class="eventos-detail-dialog">
        <button type="button" class="eventos-detail-close" aria-label="Fechar detalhes">&times;</button>
        <div class="eventos-detail-media">
          ${image ? `<button type="button" class="eventos-detail-image-button" aria-label="Ampliar imagem completa de ${escapeHtml(title)}"><img src="${escapeHtml(image)}" alt="${escapeHtml(title)}"><span><i class="fa-solid fa-expand"></i> Ver imagem completa</span></button>` : `<div class="eventos-public-placeholder"><i class="fa-regular fa-calendar-days"></i></div>`}
        </div>
        <div class="eventos-detail-content">
          <span class="eventos-detail-kicker">Agenda de Carlópolis</span>
          <h2>${escapeHtml(title)}</h2>
          <div class="eventos-detail-facts">
            <div><i class="fa-regular fa-calendar"></i><span><small>Data</small><strong>${escapeHtml(date)}</strong></span></div>
            <div><i class="fa-solid fa-location-dot"></i><span><small>Local</small><strong>${escapeHtml(address)}</strong></span></div>
          </div>
          <div class="eventos-detail-description">${richText(description)}</div>
          ${link ? `<a href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer" class="eventos-detail-link"><i class="fa-brands fa-instagram"></i> Ver publicacao do evento</a>` : ""}
        </div>
      </div>`;
    document.body.appendChild(modal);
    document.body.classList.add("eventos-modal-open");
    modal.querySelector(".eventos-detail-image-button")?.addEventListener("click", () => openExpandedImage(image, title));
    modal.querySelector(".eventos-detail-close")?.focus();
  }

  function bindPage(page, events) {
    const switchInput = page.querySelector("#eventosModoCards");
    switchInput?.addEventListener("change", () => {
      const active = Boolean(switchInput.checked);
      setCardsMode(active);
      page.classList.toggle("eventos-cards-mode", active);
      switchInput.closest(".eventos-cards-switch")?.classList.toggle("is-active", active);
      switchInput.closest(".eventos-cards-switch")?.setAttribute("aria-pressed", String(active));
    });

    page.querySelectorAll("[data-event-index]").forEach((card) => {
      const open = () => openModal(events[Number(card.dataset.eventIndex)]);
      card.addEventListener("click", (clickEvent) => {
        if (clickEvent.target.closest("a")) return;
        open();
      });
      card.addEventListener("keydown", (keyEvent) => {
        if (keyEvent.key === "Enter" || keyEvent.key === " ") {
          keyEvent.preventDefault();
          open();
        }
      });
    });
  }

  function renderPage() {
    if ((location.hash || "").toLowerCase() !== ROUTE) return;
    const contentArea = document.querySelector(".content_area");
    if (!contentArea) return;
    const events = getEvents();
    const cards = cardsMode();
    document.body.classList.add("home-quick-banner-route-hidden");
    contentArea.classList.remove("hidden");
    contentArea.removeAttribute("style");
    contentArea.innerHTML = `
      <section class="imoveis-wrap eventos-public-page ${cards ? "eventos-cards-mode" : ""}">
        <h2 class="highlighted eventos-public-title"><span><i class="fa-regular fa-calendar-days"></i> EVENTOS</span></h2>
        <aside class="im-filtros painel-filtros eventos-public-toolbar">
          <div class="eventos-toolbar-topbar">
            <div class="eventos-public-count" aria-label="Total de eventos"><i class="fa-regular fa-calendar-check"></i><strong>${events.length}</strong><span>${events.length === 1 ? "evento" : "eventos"}</span></div>
            <label class="switch eventos-cards-switch ${cards ? "is-active" : ""}" aria-pressed="${cards}" title="Mostrar eventos em cards menores">
              <input type="checkbox" id="eventosModoCards" ${cards ? "checked" : ""}>
              <span class="track"><span class="thumb"></span></span>
              <span>Cards</span>
            </label>
          </div>
        </aside>
        <div class="eventos-public-list">
          ${events.length ? events.map(cardTemplate).join("") : `<div class="eventos-public-empty"><i class="fa-regular fa-calendar-xmark"></i><h3>Nenhum evento programado</h3><p>Novas datas aparecerao aqui assim que forem divulgadas.</p></div>`}
        </div>
      </section>`;
    bindPage(contentArea.querySelector(".eventos-public-page"), events);
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  function scheduleRefresh() {
    refreshTimers.forEach(clearTimeout);
    refreshTimers = [600, 1800].map((delay) => setTimeout(renderPage, delay));
  }

  function openEventsPage() {
    closeModal();
    if ((location.hash || "").toLowerCase() !== ROUTE) location.hash = ROUTE;
    renderPage();
    scheduleRefresh();
  }

  document.addEventListener("click", (event) => {
    const trigger = event.target.closest('#menuEventos, [data-home-quick-action="eventos"], .botao-menu-topo[data-target="eventos"]');
    if (!trigger) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    openEventsPage();
  }, true);

  document.addEventListener("click", (event) => {
    const modal = event.target.closest(".eventos-detail-modal");
    if (!modal) return;
    if (event.target === modal || event.target.closest(".eventos-detail-close")) closeModal();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (document.querySelector(".eventos-image-viewer")) closeExpandedImage();
    else closeModal();
  });

  window.addEventListener("hashchange", () => {
    closeModal();
    if ((location.hash || "").toLowerCase() === ROUTE) {
      renderPage();
      scheduleRefresh();
    }
  });

  window.addEventListener("DOMContentLoaded", () => {
    if ((location.hash || "").toLowerCase() === ROUTE) {
      renderPage();
      scheduleRefresh();
    }
  });

  window.mostrarEventosPublicos = openEventsPage;
})();
