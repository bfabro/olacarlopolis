/* client-gallery.js - galeria publica de fotos dos clientes - v1 */
(function () {
  "use strict";

  let activeGallery = null;

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function normalizeGallery(group = {}) {
    const seen = new Set();
    const images = (Array.isArray(group.imagens) ? group.imagens : [])
      .map((source, originalIndex) => ({ source: String(source || "").trim(), originalIndex }))
      .filter(({ source }) => source && !seen.has(source) && seen.add(source));
    return {
      name: String(group.nome || "cliente").trim(),
      images
    };
  }

  function closeGallery() {
    activeGallery?.modal?.remove();
    activeGallery = null;
    document.body.classList.remove("client-gallery-open");
  }

  function orderedImages(images, mainIndex) {
    const main = images.find((image) => image.originalIndex === mainIndex) || images[0];
    return [main, ...images.filter((image) => image !== main)];
  }

  function overviewTemplate(gallery, mainIndex) {
    const ordered = orderedImages(gallery.images, mainIndex);
    const main = ordered[0];
    const side = ordered.slice(1, 7);
    const hidden = Math.max(0, ordered.length - 7);
    const mobileThumbs = ordered.slice(1, 4);
    const mobileHidden = Math.max(0, ordered.length - 4);

    return `
      <section class="client-gallery-overview" data-gallery-overview>
        <div class="client-gallery-composition">
          <button type="button" class="client-gallery-main" data-gallery-image="${main.originalIndex}" aria-label="Ampliar foto 1 de ${ordered.length}">
            <img src="${escapeHtml(main.source)}" alt="Foto principal de ${escapeHtml(gallery.name)}">
            <span class="client-gallery-main-count">1/${ordered.length}</span>
          </button>
          <div class="client-gallery-side">
            ${side.map((image, index) => {
              const isLast = index === side.length - 1 && hidden > 0;
              return `<button type="button" class="client-gallery-side-item" ${isLast ? "data-gallery-show-all" : `data-gallery-image="${image.originalIndex}"`} aria-label="${isLast ? `Ver mais ${hidden} fotos` : `Ampliar foto ${index + 2}`}">
                <img src="${escapeHtml(image.source)}" alt="Foto ${index + 2} de ${escapeHtml(gallery.name)}" loading="lazy">
                ${isLast ? `<span class="client-gallery-more">+${hidden} fotos</span>` : ""}
              </button>`;
            }).join("")}
          </div>
          <div class="client-gallery-mobile-thumbs">
            ${mobileThumbs.map((image, index) => {
              const isLast = index === mobileThumbs.length - 1 && mobileHidden > 0;
              return `<button type="button" ${isLast ? "data-gallery-show-all" : `data-gallery-image="${image.originalIndex}"`} aria-label="${isLast ? `Ver mais ${mobileHidden} fotos` : `Ampliar foto ${index + 2}`}">
                <img src="${escapeHtml(image.source)}" alt="Foto ${index + 2}" loading="lazy">
                ${isLast ? `<span class="client-gallery-more">+${mobileHidden}</span>` : ""}
              </button>`;
            }).join("")}
          </div>
        </div>
        ${ordered.length > 1 ? `<button type="button" class="client-gallery-show-all" data-gallery-show-all><i class="fa-solid fa-images"></i> Ver todas as fotos</button>` : ""}
      </section>
      <section class="client-gallery-all" data-gallery-all hidden>
        <div class="client-gallery-all-grid">
          ${gallery.images.map((image, index) => `<button type="button" data-gallery-image="${image.originalIndex}" aria-label="Ampliar foto ${index + 1}"><img src="${escapeHtml(image.source)}" alt="Foto ${index + 1} de ${escapeHtml(gallery.name)}" loading="lazy"></button>`).join("")}
        </div>
        <button type="button" class="client-gallery-back-summary" data-gallery-back-summary><i class="fa-solid fa-arrow-left"></i> Voltar ao resumo</button>
      </section>`;
  }

  function viewerTemplate(gallery) {
    return `
      <section class="client-gallery-viewer" data-gallery-viewer hidden>
        <button type="button" class="client-gallery-viewer-back" data-gallery-viewer-back><i class="fa-solid fa-arrow-left"></i><span>Voltar à galeria</span></button>
        <div class="client-gallery-stage" data-gallery-stage>
          <button type="button" class="client-gallery-nav prev" data-gallery-prev aria-label="Foto anterior"><i class="fa-solid fa-chevron-left"></i></button>
          <img data-gallery-viewer-image src="" alt="">
          <button type="button" class="client-gallery-nav next" data-gallery-next aria-label="Próxima foto"><i class="fa-solid fa-chevron-right"></i></button>
          <span class="client-gallery-counter" data-gallery-counter></span>
        </div>
        <div class="client-gallery-viewer-thumbs" data-gallery-viewer-thumbs>
          ${gallery.images.map((image, index) => `<button type="button" data-gallery-thumb="${image.originalIndex}" aria-label="Ir para foto ${index + 1}"><img src="${escapeHtml(image.source)}" alt="Miniatura ${index + 1}" loading="lazy"></button>`).join("")}
        </div>
      </section>`;
  }

  function renderViewer(index) {
    if (!activeGallery) return;
    const { modal, gallery } = activeGallery;
    const position = gallery.images.findIndex((image) => image.originalIndex === index);
    activeGallery.position = position >= 0 ? position : 0;
    const current = gallery.images[activeGallery.position];
    const image = modal.querySelector("[data-gallery-viewer-image]");
    if (image) {
      image.src = current.source;
      image.alt = `Foto ${activeGallery.position + 1} de ${gallery.name}`;
    }
    const counter = modal.querySelector("[data-gallery-counter]");
    if (counter) counter.textContent = `${activeGallery.position + 1} de ${gallery.images.length}`;
    modal.querySelectorAll("[data-gallery-thumb]").forEach((thumb) => {
      const selected = Number(thumb.dataset.galleryThumb) === current.originalIndex;
      thumb.classList.toggle("is-active", selected);
      thumb.setAttribute("aria-current", selected ? "true" : "false");
      if (selected) thumb.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    });
  }

  function openViewer(index) {
    if (!activeGallery) return;
    activeGallery.modal.querySelector("[data-gallery-overview]").hidden = true;
    activeGallery.modal.querySelector("[data-gallery-all]").hidden = true;
    activeGallery.modal.querySelector("[data-gallery-viewer]").hidden = false;
    activeGallery.modal.classList.add("is-viewer");
    renderViewer(index);
  }

  function showOverview(showAll = false) {
    if (!activeGallery) return;
    const { modal } = activeGallery;
    modal.classList.remove("is-viewer");
    modal.querySelector("[data-gallery-viewer]").hidden = true;
    modal.querySelector("[data-gallery-overview]").hidden = showAll;
    modal.querySelector("[data-gallery-all]").hidden = !showAll;
  }

  function moveViewer(step) {
    if (!activeGallery) return;
    const length = activeGallery.gallery.images.length;
    activeGallery.position = (activeGallery.position + step + length) % length;
    renderViewer(activeGallery.gallery.images[activeGallery.position].originalIndex);
  }

  function bindGallery(modal) {
    modal.querySelector("[data-gallery-close]")?.addEventListener("click", closeGallery);
    modal.querySelectorAll("[data-gallery-image]").forEach((button) => {
      button.addEventListener("click", () => openViewer(Number(button.dataset.galleryImage)));
    });
    modal.querySelectorAll("[data-gallery-show-all]").forEach((button) => {
      button.addEventListener("click", () => showOverview(true));
    });
    modal.querySelector("[data-gallery-back-summary]")?.addEventListener("click", () => showOverview(false));
    modal.querySelector("[data-gallery-viewer-back]")?.addEventListener("click", () => showOverview(false));
    modal.querySelector("[data-gallery-prev]")?.addEventListener("click", () => moveViewer(-1));
    modal.querySelector("[data-gallery-next]")?.addEventListener("click", () => moveViewer(1));
    modal.querySelectorAll("[data-gallery-thumb]").forEach((button) => {
      button.addEventListener("click", () => renderViewer(Number(button.dataset.galleryThumb)));
    });
    modal.addEventListener("click", (event) => {
      if (event.target === modal) closeGallery();
    });
    const stage = modal.querySelector("[data-gallery-stage]");
    let touchStartX = 0;
    stage?.addEventListener("touchstart", (event) => {
      touchStartX = event.changedTouches?.[0]?.clientX || 0;
    }, { passive: true });
    stage?.addEventListener("touchend", (event) => {
      const delta = (event.changedTouches?.[0]?.clientX || 0) - touchStartX;
      if (Math.abs(delta) > 45) moveViewer(delta > 0 ? -1 : 1);
    }, { passive: true });
  }

  function openGallery(group, initialIndex = 0) {
    const gallery = normalizeGallery(group);
    if (!gallery.images.length) return;
    closeGallery();
    const modal = document.createElement("div");
    modal.className = "client-gallery-modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-label", `Fotos de ${gallery.name}`);
    modal.innerHTML = `
      <div class="client-gallery-dialog">
        <header class="client-gallery-header"><h2>Fotos de ${escapeHtml(gallery.name)}</h2><button type="button" data-gallery-close aria-label="Fechar galeria">&times;</button></header>
        <div class="client-gallery-body">
          ${overviewTemplate(gallery, initialIndex)}
          ${viewerTemplate(gallery)}
        </div>
      </div>`;
    document.body.appendChild(modal);
    document.body.classList.add("client-gallery-open");
    activeGallery = { modal, gallery, position: 0 };
    bindGallery(modal);
    modal.querySelector("[data-gallery-close]")?.focus();
  }

  document.addEventListener("click", (event) => {
    const card = event.target.closest?.("[data-loja-foto]");
    if (!card) return;
    const item = window.__lojaFotosDetalhes?.[card.dataset.lojaFoto];
    const group = item?.slug ? window.__lojaFotosGrupos?.[item.slug] : null;
    if (!group) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    openGallery(group, Number(item.index) || 0);
  }, true);

  document.addEventListener("keydown", (event) => {
    if (!activeGallery) return;
    if (event.key === "Escape") {
      if (activeGallery.modal.classList.contains("is-viewer")) showOverview(false);
      else closeGallery();
    }
    if (!activeGallery?.modal.classList.contains("is-viewer")) return;
    if (event.key === "ArrowLeft") moveViewer(-1);
    if (event.key === "ArrowRight") moveViewer(1);
  });

  window.ClientGallery = { open: openGallery, close: closeGallery };
})();
