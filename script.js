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

  // Alternar sidebar
  sidebarOpen.addEventListener("click", () => {
      sidebar.classList.toggle("close");
  });

  sidebarExpand.addEventListener("click", () => {
      sidebar.classList.remove("close", "hoverable");
  });

  sidebarClose.addEventListener("click", () => {
      sidebar.classList.add("close", "hoverable");
  });


  ////////////////////////////////////////////////
  // Alternar sidebar
  supermercadoLink.addEventListener("click", () => {
    sidebar.classList.toggle("close");
});

supermercadoLink.addEventListener("click", () => {
  sidebar.classList.remove("close", "hoverable");
});

supermercadoLink.addEventListener("click", () => {
  sidebar.classList.add("close", "hoverable");
});
///
farmaciaLink.addEventListener("click", () => {
  sidebar.classList.toggle("close");
});

farmaciaLink.addEventListener("click", () => {
sidebar.classList.remove("close", "hoverable");
});

farmaciaLink.addEventListener("click", () => {
sidebar.classList.add("close", "hoverable");
});

  /////////////////////////////////////////////////

  sidebar.addEventListener("mouseenter", () => {
      if (sidebar.classList.contains("hoverable")) {
          sidebar.classList.remove("close");
      }
  });

  sidebar.addEventListener("mouseleave", () => {
      if (sidebar.classList.contains("hoverable")) {
          sidebar.classList.add("close");
      }
  });

  // Alternar tema escuro/claro
  darkLight.addEventListener("click", () => {
      body.classList.toggle("dark");
      darkLight.classList.toggle("bx-moon");
      darkLight.classList.toggle("bx-sun");
  });

  // Alternar submenu
  submenuItems.forEach((item, index) => {
      item.addEventListener("click", () => {
          item.classList.toggle("show_submenu");
          submenuItems.forEach((item2, index2) => {
              if (index !== index2) {
                  item2.classList.remove("show_submenu");
              }
          });
      });
  });

  // Fechar sidebar em telas pequenas
  if (window.innerWidth < 768) {
      sidebar.classList.add("close");
  } else {
      sidebar.classList.remove("close");
  }

  // Função para carregar conteúdo dinâmico
  function loadContent(title, items) {
      contentArea.innerHTML = `<h2>${title}</h2><br><ul>${items.map(item => `<li>🛒 ${item}</li>`).join('')}</ul>`;
  }

  // Carregar informações de supermercados
  supermercadoLink.addEventListener("click", function (event) {
      event.preventDefault();
      loadContent("Supermercados em Carlópolis", ["Supermercado Rocha", "Supermercado Carreiro", "Mercado do Barateiro"]);
  });

  
  // Carregar informações de farmácias
  farmaciaLink.addEventListener("click", function (event) {
      event.preventDefault();
      loadContent("Farmácias em Carlópolis", ["Aguera", "Jorginho", "João"]);
  });
});
