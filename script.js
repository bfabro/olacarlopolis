document.addEventListener("DOMContentLoaded", function () {
  const body = document.querySelector("body");
  const darkLight = document.querySelector("#darkLight");
  const sidebar = document.querySelector(".sidebar");
  const contentArea = document.querySelector(".content_area");
  const submenuItems = document.querySelectorAll(".submenu_item");

  const sidebarOpen = document.querySelector("#sidebarOpen");
  const sidebarClose = document.querySelector(".collapse_sidebar");
  const sidebarExpand = document.querySelector(".expand_sidebar");

  const farmaciaLink = document.querySelector("#menuFarmacia");
  const supermercadoLink = document.querySelector("#menuMercado");
  const comercioLink = document.querySelector("#menuComercio");

  //////////////////////////////////////////////////////////
  // 🟢 Alternar sidebar
  sidebarOpen.addEventListener("click", () => {
    sidebar.classList.toggle("close");
  });

  sidebarExpand.addEventListener("click", () => {
    sidebar.classList.remove("close", "hoverable");
  });

  sidebarClose.addEventListener("click", () => {
    sidebar.classList.add("close", "hoverable");
  });

  //////////////////////////////////////////////////////////
  // 🟢 Garantir que ao clicar no menu lateral, ele expanda (em telas menores)
  function expandSidebar() {
    if (window.innerWidth < 768) {
      sidebar.classList.remove("close");
    }
  }

  //////////////////////////////////////////////////////////
  // 🟢 Alternar submenu ao clicar
  submenuItems.forEach((item) => {
    item.addEventListener("click", () => {
      item.classList.toggle("show_submenu");
    });
  });

  //////////////////////////////////////////////////////////
  // 🟢 Sidebar fecha em telas pequenas ao carregar a página
  function adjustSidebarOnLoad() {
    if (window.innerWidth < 768) {
      sidebar.classList.add("close");
    } else {
      sidebar.classList.remove("close");
    }
  }

  adjustSidebarOnLoad();
  window.addEventListener("resize", adjustSidebarOnLoad);

  //////////////////////////////////////////////////////////
  // 🟢 Função para carregar conteúdo dinâmico
  function loadContent(title, items) {
    contentArea.innerHTML = `<h2>${title}</h2><br><ul>${items
      .map((item) => `<li>🛒 ${item}</li>`)
      .join("")}</ul>`;     
    
  }

  //////////////////////////////////////////////////////////
  // 🟢 Função genérica para os menus
  function setupMenuClick(link, title, items) {
    link.addEventListener("click", function (event) {
      event.preventDefault();
      loadContent(title, items);
    });
  }

  setupMenuClick(supermercadoLink, "Supermercados em Carlópolis", [
    "Supermercado Rocha",
    "Supermercado Carreiro",
    "Mercado do Barateiro",
  ]);

  setupMenuClick(farmaciaLink, "Farmácias em Carlópolis", [
    "Aguera",
    "Jorginho",
    "João",
  ]);

  //////////////////////////////////////////////////////////
  // 🟢 Alternar tema escuro/claro
  darkLight.addEventListener("click", () => {
    body.classList.toggle("dark");
    darkLight.classList.toggle("bx-moon");
    darkLight.classList.toggle("bx-sun");
  });



  document.querySelector(".search_bar input").addEventListener("input", function () {
    let searchTerm = this.value.toLowerCase();
    let items = document.querySelectorAll(".nav_link");
  
    items.forEach(item => {
      let text = item.textContent.toLowerCase();
      if (text.includes(searchTerm)) {
        item.style.display = "block";
      } else {
        item.style.display = "none";
      }
    });
  });
});
