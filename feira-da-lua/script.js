const FEIRA_DA_LUA_DATA = [
  {
    id: "barraca-pastel-da-praca",
    nome: "Pastel da Praça",
    categoria: "Lanches",
    descricao: "Pastéis sequinhos, porções e bebidas para comer na hora ou retirar.",
    whatsapp: "5543999001111",
    destaque: ["Mais pedidos", "Retirada na feira", "Entrega sob consulta"],
    cover: "linear-gradient(135deg,#ef4444,#f59e0b)",
    pos: { x: 7, y: 10 },
    produtos: [
      { nome: "Pastel de Carne", preco: 12, descricao: "Carne temperada e crocante." },
      { nome: "Pastel de Queijo", preco: 11, descricao: "Recheio cremoso de queijo." },
      { nome: "Porção de Batata", preco: 20, descricao: "Batata frita crocante." },
      { nome: "Refrigerante Lata", preco: 6, descricao: "350ml gelado." }
    ]
  },
  {
    id: "barraca-doce-sabor",
    nome: "Doce Sabor",
    categoria: "Doces",
    descricao: "Brigadeiros, bolos no pote e doces artesanais feitos na hora.",
    whatsapp: "5543999002222",
    destaque: ["Artesanal", "Doces fresquinhos"],
    cover: "linear-gradient(135deg,#ec4899,#8b5cf6)",
    pos: { x: 28, y: 10 },
    produtos: [
      { nome: "Bolo no Pote", preco: 10, descricao: "Sabores variados." },
      { nome: "Brigadeiro Gourmet", preco: 4.5, descricao: "Unidade." },
      { nome: "Palha Italiana", preco: 8, descricao: "Corte generoso." }
    ]
  },
  {
    id: "barraca-horta-fresca",
    nome: "Horta Fresca",
    categoria: "Hortifruti",
    descricao: "Verduras, legumes e frutas selecionadas direto do produtor.",
    whatsapp: "5543999003333",
    destaque: ["Produtor local", "Produtos do dia"],
    cover: "linear-gradient(135deg,#22c55e,#0ea5e9)",
    pos: { x: 50, y: 10 },
    produtos: [
      { nome: "Alface Crespa", preco: 4, descricao: "Unidade." },
      { nome: "Cheiro-verde", preco: 3, descricao: "Maço." },
      { nome: "Tomate 1kg", preco: 9, descricao: "Tomate maduro." },
      { nome: "Banana 1kg", preco: 7, descricao: "Banana da estação." }
    ]
  },
  {
    id: "barraca-artes-da-lua",
    nome: "Artes da Lua",
    categoria: "Artesanato",
    descricao: "Peças decorativas, lembranças e trabalhos manuais exclusivos.",
    whatsapp: "5543999004444",
    destaque: ["Feito à mão", "Presente criativo"],
    cover: "linear-gradient(135deg,#0ea5e9,#2563eb)",
    pos: { x: 71, y: 10 },
    produtos: [
      { nome: "Vela Artesanal", preco: 18, descricao: "Perfumes variados." },
      { nome: "Chaveiro Personalizado", preco: 15, descricao: "Modelos diferentes." },
      { nome: "Peça Decorativa", preco: 28, descricao: "Artesanato local." }
    ]
  },
  {
    id: "barraca-suco-viva",
    nome: "Suco Viva",
    categoria: "Bebidas",
    descricao: "Sucos naturais, água de coco e refrescos gelados.",
    whatsapp: "5543999005555",
    destaque: ["Natural", "Geladinho"],
    cover: "linear-gradient(135deg,#06b6d4,#10b981)",
    pos: { x: 18, y: 72 },
    produtos: [
      { nome: "Suco de Laranja", preco: 9, descricao: "Copo 400ml." },
      { nome: "Suco Detox", preco: 11, descricao: "Abacaxi, couve e gengibre." },
      { nome: "Água de Coco", preco: 8, descricao: "Garrafa." }
    ]
  },
  {
    id: "barraca-tempero-caseiro",
    nome: "Tempero Caseiro",
    categoria: "Temperos",
    descricao: "Molhos, conservas e temperos prontos para o dia a dia.",
    whatsapp: "5543999006666",
    destaque: ["Caseiro", "Leve para casa"],
    cover: "linear-gradient(135deg,#f97316,#dc2626)",
    pos: { x: 40, y: 72 },
    produtos: [
      { nome: "Molho de Pimenta", preco: 14, descricao: "Vidro 150ml." },
      { nome: "Conserva Especial", preco: 18, descricao: "Pote artesanal." },
      { nome: "Tempero Verde", preco: 9, descricao: "Pote refrigerado." }
    ]
  },
  {
    id: "barraca-sabores-da-roca",
    nome: "Sabores da Roça",
    categoria: "Quitandas",
    descricao: "Pães, bolos caseiros, cucas e biscoitos fresquinhos.",
    whatsapp: "5543999007777",
    destaque: ["Caseiro", "Saindo do forno"],
    cover: "linear-gradient(135deg,#d97706,#f59e0b)",
    pos: { x: 62, y: 72 },
    produtos: [
      { nome: "Cuca Caseira", preco: 22, descricao: "Tamanho médio." },
      { nome: "Pão Caseiro", preco: 14, descricao: "Unidade." },
      { nome: "Biscoito Colonial", preco: 16, descricao: "Pacote." }
    ]
  }
];

const state = {
  search: "",
  category: "",
  view: "cards",
  cart: loadCart()
};

const els = {
  cardsView: document.getElementById("cardsView"),
  mapView: document.getElementById("mapView"),
  mapCanvas: document.getElementById("mapCanvas"),
  searchInput: document.getElementById("searchInput"),
  categoryFilter: document.getElementById("categoryFilter"),
  viewCardsBtn: document.getElementById("viewCardsBtn"),
  viewMapBtn: document.getElementById("viewMapBtn"),
  stallModal: document.getElementById("stallModal"),
  stallModalContent: document.getElementById("stallModalContent"),
  cartDrawer: document.getElementById("cartDrawer"),
  cartContent: document.getElementById("cartContent"),
  cartCount: document.getElementById("cartCount"),
  cartTotalValue: document.getElementById("cartTotalValue"),
  floatingCartBtn: document.getElementById("floatingCartBtn"),
  floatingCartLabel: document.getElementById("floatingCartLabel"),
  openCartBtn: document.getElementById("openCartBtn"),
  clearCartBtn: document.getElementById("clearCartBtn"),
  customerName: document.getElementById("customerName"),
  customerPhone: document.getElementById("customerPhone"),
  customerAddress: document.getElementById("customerAddress"),
  customerNotes: document.getElementById("customerNotes"),
  stallTotal: document.getElementById("stallTotal"),
  productTotal: document.getElementById("productTotal"),
  categoryTotal: document.getElementById("categoryTotal"),
};

init();

function init() {
  populateCategoryFilter();
  loadCustomerData();
  attachEvents();
  renderStats();
  renderAll();
}

function attachEvents() {
  els.searchInput.addEventListener("input", (e) => {
    state.search = e.target.value.trim().toLowerCase();
    renderAll();
  });

  els.categoryFilter.addEventListener("change", (e) => {
    state.category = e.target.value;
    renderAll();
  });

  els.viewCardsBtn.addEventListener("click", () => setView("cards"));
  els.viewMapBtn.addEventListener("click", () => setView("map"));

  document.querySelectorAll("[data-close-modal]").forEach(btn =>
    btn.addEventListener("click", closeStallModal)
  );

  document.querySelectorAll("[data-close-cart]").forEach(btn =>
    btn.addEventListener("click", closeCart)
  );

  els.openCartBtn.addEventListener("click", openCart);
  els.floatingCartBtn.addEventListener("click", openCart);

  els.clearCartBtn.addEventListener("click", () => {
    if (!state.cart.length) return;
    if (!confirm("Deseja limpar todo o carrinho?")) return;
    state.cart = [];
    persistCart();
    renderCart();
    renderAll();
  });

  [els.customerName, els.customerPhone, els.customerAddress, els.customerNotes].forEach(input => {
    input.addEventListener("input", persistCustomerData);
  });
}

function renderAll() {
  renderCards();
  renderMap();
  renderCart();
}

function renderStats() {
  const categories = [...new Set(FEIRA_DA_LUA_DATA.map(item => item.categoria))];
  const products = FEIRA_DA_LUA_DATA.reduce((acc, stall) => acc + stall.produtos.length, 0);

  els.stallTotal.textContent = FEIRA_DA_LUA_DATA.length;
  els.productTotal.textContent = products;
  els.categoryTotal.textContent = categories.length;
}

function populateCategoryFilter() {
  const categories = [...new Set(FEIRA_DA_LUA_DATA.map(item => item.categoria))].sort((a, b) => a.localeCompare(b, "pt-BR"));
  categories.forEach(category => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    els.categoryFilter.appendChild(option);
  });
}

function filteredStalls() {
  return FEIRA_DA_LUA_DATA.filter(stall => {
    const matchesCategory = !state.category || stall.categoria === state.category;
    const textBase = [
      stall.nome,
      stall.categoria,
      stall.descricao,
      ...stall.produtos.map(p => `${p.nome} ${p.descricao}`)
    ].join(" ").toLowerCase();

    const matchesSearch = !state.search || textBase.includes(state.search);
    return matchesCategory && matchesSearch;
  });
}

function renderCards() {
  const data = filteredStalls();
  els.cardsView.innerHTML = "";

  if (!data.length) {
    els.cardsView.innerHTML = `<div class="cart-empty" style="grid-column:1/-1">
      Nenhuma barraca encontrada com esse filtro.
    </div>`;
    return;
  }

  const template = document.getElementById("stallCardTemplate");

  data.forEach(stall => {
    const node = template.content.cloneNode(true);
    const card = node.querySelector(".stall-card");
    const image = node.querySelector(".stall-card__image");
    const categoryChip = node.querySelector(".category-chip");
    const stallName = node.querySelector(".stall-name");
    const productCount = node.querySelector(".product-count");
    const description = node.querySelector(".stall-description");
    const highlights = node.querySelector(".stall-highlights");
    const openBtn = node.querySelector(".btn-open-products");
    const whatsBtn = node.querySelector(".btn-whatsapp");

    image.style.setProperty("--stall-cover", stall.cover);
    categoryChip.textContent = stall.categoria;
    stallName.textContent = stall.nome;
    productCount.textContent = `${stall.produtos.length} produto${stall.produtos.length > 1 ? "s" : ""}`;
    description.textContent = stall.descricao;

    stall.destaque.forEach(item => {
      const span = document.createElement("span");
      span.className = "chip chip--outline";
      span.textContent = item;
      highlights.appendChild(span);
    });

    openBtn.addEventListener("click", () => openStallModal(stall.id));

    whatsBtn.href = buildDirectWhatsappLink(stall.whatsapp);
    whatsBtn.addEventListener("click", (e) => {
      if (!stall.whatsapp) e.preventDefault();
    });

    card.dataset.id = stall.id;
    els.cardsView.appendChild(node);
  });
}

function renderMap() {
  els.mapCanvas.innerHTML = "";
  filteredStalls().forEach(stall => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "map-stall";
    button.style.left = `${stall.pos.x}%`;
    button.style.top = `${stall.pos.y}%`;
    button.style.setProperty("transform", "translate(-50%, -50%)");
    button.innerHTML = `<b>${stall.nome}</b><span>${stall.categoria}</span>`;
    button.addEventListener("click", () => openStallModal(stall.id));
    els.mapCanvas.appendChild(button);
  });
}

function setView(view) {
  state.view = view;
  const cards = view === "cards";
  els.viewCardsBtn.classList.toggle("active", cards);
  els.viewMapBtn.classList.toggle("active", !cards);
  els.cardsView.classList.toggle("hidden", !cards);
  els.mapView.classList.toggle("hidden", cards);
}

function openStallModal(stallId) {
  const stall = FEIRA_DA_LUA_DATA.find(item => item.id === stallId);
  if (!stall) return;

  const cartForThisStall = state.cart.filter(item => item.stallId === stallId);

  els.stallModalContent.innerHTML = `
    <div class="stall-modal">
      <div class="stall-modal__top">
        <div class="stall-modal__cover" style="--stall-cover:${stall.cover}"></div>
        <div class="stall-modal__info">
          <span class="chip chip--soft">${stall.categoria}</span>
          <h2>${stall.nome}</h2>
          <p>${stall.descricao}</p>
          <div class="inline-list">
            ${stall.destaque.map(item => `<span class="chip chip--outline">${item}</span>`).join("")}
          </div>
          <p class="helper-text" style="margin-top:14px;">
            Escolha os produtos abaixo. O pedido será separado por barraca no final.
          </p>
        </div>
      </div>

      <div class="products-grid">
        ${stall.produtos.map(product => {
          const cartItem = cartForThisStall.find(item => item.productName === product.nome);
          const qty = cartItem ? cartItem.quantity : 0;
          return `
            <article class="product-card">
              <div class="product-card__top">
                <div>
                  <h4>${product.nome}</h4>
                  <p>${product.descricao || ""}</p>
                </div>
              </div>
              <div class="product-card__footer">
                <strong class="price">${formatCurrency(product.preco)}</strong>
                <div class="qty-control">
                  <button class="qty-btn" data-action="minus" data-stall-id="${stall.id}" data-product-name="${escapeAttr(product.nome)}">−</button>
                  <span class="qty-value">${qty}</span>
                  <button class="qty-btn" data-action="plus" data-stall-id="${stall.id}" data-product-name="${escapeAttr(product.nome)}">+</button>
                </div>
              </div>
            </article>
          `;
        }).join("")}
      </div>
    </div>
  `;

  els.stallModal.classList.remove("hidden");
  els.stallModal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";

  els.stallModalContent.querySelectorAll(".qty-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const action = btn.dataset.action;
      const stallId = btn.dataset.stallId;
      const productName = btn.dataset.productName;
      updateCartItem(stallId, productName, action === "plus" ? 1 : -1);
      openStallModal(stallId);
    });
  });
}

function closeStallModal() {
  els.stallModal.classList.add("hidden");
  els.stallModal.setAttribute("aria-hidden", "true");
  restorePageScroll();
}

function openCart() {
  els.cartDrawer.classList.remove("hidden");
  els.cartDrawer.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeCart() {
  els.cartDrawer.classList.add("hidden");
  els.cartDrawer.setAttribute("aria-hidden", "true");
  restorePageScroll();
}

function restorePageScroll() {
  const modalOpen = !els.stallModal.classList.contains("hidden");
  const cartOpen = !els.cartDrawer.classList.contains("hidden");
  if (!modalOpen && !cartOpen) {
    document.body.style.overflow = "";
  }
}

function updateCartItem(stallId, productName, delta) {
  const stall = FEIRA_DA_LUA_DATA.find(item => item.id === stallId);
  if (!stall) return;
  const product = stall.produtos.find(item => item.nome === productName);
  if (!product) return;

  const index = state.cart.findIndex(item => item.stallId === stallId && item.productName === productName);

  if (index >= 0) {
    state.cart[index].quantity += delta;
    if (state.cart[index].quantity <= 0) {
      state.cart.splice(index, 1);
    }
  } else if (delta > 0) {
    state.cart.push({
      stallId,
      stallName: stall.nome,
      whatsapp: stall.whatsapp,
      productName: product.nome,
      unitPrice: product.preco,
      quantity: 1
    });
  }

  persistCart();
  renderCart();
}

function renderCart() {
  const totalItems = state.cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalValue = state.cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

  els.cartCount.textContent = totalItems;
  els.cartTotalValue.textContent = formatCurrency(totalValue);

  if (totalItems > 0) {
    els.floatingCartBtn.classList.remove("hidden");
    els.floatingCartLabel.textContent = `${totalItems} item${totalItems > 1 ? "s" : ""} no carrinho`;
  } else {
    els.floatingCartBtn.classList.add("hidden");
  }

  if (!state.cart.length) {
    els.cartContent.innerHTML = `
      <div class="cart-empty">
        Seu carrinho está vazio.<br>
        Abra uma barraca e adicione os produtos para enviar o pedido.
      </div>
    `;
    return;
  }

  const grouped = groupCartByStall(state.cart);
  els.cartContent.innerHTML = grouped.map(group => {
    const subtotal = group.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const whatsappLink = buildOrderWhatsappLink(group);

    return `
      <section class="cart-stall">
        <div class="cart-stall__header">
          <div>
            <span class="chip chip--soft">${group.category || "Barraca"}</span>
            <h3 style="margin:8px 0 0;">${group.stallName}</h3>
          </div>
          <span class="chip chip--outline">${group.items.length} item${group.items.length > 1 ? "s" : ""}</span>
        </div>

        <div class="cart-items">
          ${group.items.map(item => `
            <div class="cart-item">
              <div class="cart-item__name">
                <strong>${item.productName}</strong>
                <small>${formatCurrency(item.unitPrice)} cada</small>
              </div>
              <div class="qty-control">
                <button class="qty-btn" data-cart-stall-id="${group.stallId}" data-cart-product-name="${escapeAttr(item.productName)}" data-cart-action="minus">−</button>
                <span class="qty-value">${item.quantity}</span>
                <button class="qty-btn" data-cart-stall-id="${group.stallId}" data-cart-product-name="${escapeAttr(item.productName)}" data-cart-action="plus">+</button>
              </div>
              <strong>${formatCurrency(item.unitPrice * item.quantity)}</strong>
            </div>
          `).join("")}
        </div>

        <div class="cart-stall__footer">
          <div class="cart-stall__subtotal">
            <span>Subtotal</span>
            <strong>${formatCurrency(subtotal)}</strong>
          </div>
          <a class="whatsapp-order-btn" href="${whatsappLink}" target="_blank" rel="noopener">
            <i class="fa-brands fa-whatsapp"></i> Enviar pedido para ${group.stallName}
          </a>
        </div>
      </section>
    `;
  }).join("");

  els.cartContent.querySelectorAll("[data-cart-action]").forEach(btn => {
    btn.addEventListener("click", () => {
      updateCartItem(
        btn.dataset.cartStallId,
        btn.dataset.cartProductName,
        btn.dataset.cartAction === "plus" ? 1 : -1
      );
    });
  });
}

function groupCartByStall(cart) {
  const groups = [];
  cart.forEach(item => {
    let group = groups.find(entry => entry.stallId === item.stallId);
    if (!group) {
      const stall = FEIRA_DA_LUA_DATA.find(entry => entry.id === item.stallId);
      group = {
        stallId: item.stallId,
        stallName: item.stallName,
        whatsapp: item.whatsapp,
        category: stall?.categoria || "",
        items: []
      };
      groups.push(group);
    }
    group.items.push(item);
  });
  return groups;
}

function buildOrderWhatsappLink(group) {
  const customer = getCustomerData();
  const subtotal = group.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

  const lines = [
    "Olá! Gostaria de fazer este pedido da Feira da Lua:",
    "",
    `Barraca: ${group.stallName}`,
    "",
    ...group.items.map(item => `• ${item.quantity}x ${item.productName} — ${formatCurrency(item.unitPrice * item.quantity)}`),
    "",
    `Subtotal: ${formatCurrency(subtotal)}`,
    "",
    `Nome: ${customer.name || "-"}`,
    `Telefone: ${customer.phone || "-"}`,
    `Endereço / referência: ${customer.address || "-"}`,
    `Observação geral: ${customer.notes || "-"}`,
    "",
    "Pedido enviado pela página da Feira da Lua."
  ];

  return `https://wa.me/${onlyDigits(group.whatsapp)}?text=${encodeURIComponent(lines.join("\n"))}`;
}

function buildDirectWhatsappLink(number) {
  const digits = onlyDigits(number);
  return digits ? `https://wa.me/${digits}` : "#";
}

function persistCart() {
  localStorage.setItem("feiraLuaCart", JSON.stringify(state.cart));
}

function loadCart() {
  try {
    return JSON.parse(localStorage.getItem("feiraLuaCart")) || [];
  } catch {
    return [];
  }
}

function persistCustomerData() {
  const data = getCustomerData();
  localStorage.setItem("feiraLuaCustomer", JSON.stringify(data));
}

function loadCustomerData() {
  try {
    const data = JSON.parse(localStorage.getItem("feiraLuaCustomer")) || {};
    els.customerName.value = data.name || "";
    els.customerPhone.value = data.phone || "";
    els.customerAddress.value = data.address || "";
    els.customerNotes.value = data.notes || "";
  } catch {}
}

function getCustomerData() {
  return {
    name: els.customerName.value.trim(),
    phone: els.customerPhone.value.trim(),
    address: els.customerAddress.value.trim(),
    notes: els.customerNotes.value.trim()
  };
}

function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(value);
}

function onlyDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

function escapeAttr(value) {
  return String(value).replaceAll('"', "&quot;");
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeStallModal();
    closeCart();
  }
});
