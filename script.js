document.addEventListener("DOMContentLoaded", function () {
  const body = document.querySelector("body");
  const darkLight = document.querySelector("#darkLight");
  const sidebar = document.querySelector(".sidebar");
  const contentArea = document.querySelector(".content_area");
  const submenuItems = document.querySelectorAll(".submenu_item");
  // responsavel em mostrar o menu
  const sidebarOpen = document.querySelector("#sidebarOpen");
  const sidebarClose = document.querySelector(".collapse_sidebar");
  const sidebarExpand = document.querySelector(".expand_sidebar");

  const farmaciaLink = document.querySelector("#menuFarmacia");
  const supermercadoLink = document.querySelector("#menuMercado");
  const comercioLink = document.querySelector("#menuComercio");

  //////////////////////////////////////////////////////////
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

  //////////////////////////////////////////////////////////
  comercioLink.addEventListener("click", () => {
    sidebar.classList.toggle("close");
    sidebar.classList.toggle("hoverable");
  });
  /////////////////////////////////////////////////
  supermercadoLink.addEventListener("click", () => {
    sidebar.classList.toggle("close");
    sidebar.classList.toggle("hoverable");
  });
  /////////////////////////////////////////////////
  farmaciaLink.addEventListener("click", () => {
    sidebar.classList.toggle("close");
    sidebar.classList.toggle("hoverable");
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
submenuItems.forEach(item => {
  item.addEventListener("click", () => {
    submenuItems.forEach(i => i !== item && i.classList.remove("show_submenu"));
    item.classList.toggle("show_submenu");
  });
});

  // Fechar sidebar em telas pequenas
  if (window.innerWidth < 768) {
    sidebar.classList.add("close");

  } else {
    sidebar.classList.remove("close");
  }


  // Função para expandir o menu quando um item pai for clicado
  function expandSidebar() {
    if (window.innerWidth < 768 && sidebar.classList.contains("close")) {
      sidebar.classList.remove("close");
    }
  }

  // Função para fechar o menu depois de selecionar um item
  function closeSidebar() {
    if (window.innerWidth < 768) {
      sidebar.classList.add("close");
    }
  }

  // Adicionar eventos para os menus pai
  // Ao clicar, apenas garantir que a sidebar não feche em telas grandes
  [comercioLink, supermercadoLink, farmaciaLink].forEach((menu) => {
    menu.addEventListener("click", () => {
      if (window.innerWidth >= 768) {
        sidebar.classList.remove("close");
      }
    });
  });

  // Carregar conteúdo e fechar sidebar depois de selecionar um item
  function loadContent(title, items) {
    contentArea.innerHTML = `<h2>${title}</h2><br><ul>${items
      .map((item) => `<li>🛒 ${item}</li>`)
      .join("")}</ul>`;
    // closeSidebar(); // Fecha o menu após carregar o conteúdo
    sidebar.classList.remove("close"); // Sempre manter aberto após atualização
  }


  // Fechar sidebar em telas pequenas
  if (window.innerWidth < 768) {
    sidebar.classList.remove("close"); // Garante que comece aberto no celular
  }



  // Função para carregar conteúdo
  function loadContent(title, establishments) {
    contentArea.innerHTML = `<h2 class="highlighted">${title}</h2><br><ul>${establishments.map(establishment => `
    <li>
      <strong class="highlighted">${establishment.name}</strong><br>
      <b>Endereço:</b> ${establishment.address}<br>
      <b>Horário de Funcionamento:</b> ${establishment.hours}<br>
      <b>Contato:</b> ${establishment.contact}<br><br>
    </li>`).join('')}</ul>`;

  }


  // Carregar informações de categorias
  const categories = [
    {
      link: supermercadoLink, title: "Supermercadosx em Carlópolis", establishments: [
        { name: "Supermercado Rocha", address: "Rua A, 123", hours: "8h - 18h", contact: "(43) 1234-5678" },
        { name: "Supermercado Carreiro", address: "Rua B, 456", hours: "7h - 19h", contact: "(43) 2345-6789" },
        { name: "Mercado do Barateiro", address: "Rua C, 789", hours: "9h - 21h e dom: 06 - 12h", contact: "(43) 3456-7890" },
      ]
    },
    {
      link: farmaciaLink, title: "Farmácias em Carlópolis", establishments: [
        { name: "Farmácia Aguera", address: "Rua D, 101", hours: "8h - 18h", contact: "(43) 4567-8901" },
        { name: "Farmácia Jorginho", address: "Rua E, 202", hours: "8h - 20h", contact: "(43) 5678-9012" },
        { name: "Farmácia João", address: "Rua F, 303", hours: "7h - 19h", contact: "(43) 6789-0123" },
      ]
    },
    {
      link: comercioLink, title: "Comércios em Carlópolis", establishments: [
        { name: "Comércio A", address: "Rua G, 404", hours: "8h - 18h", contact: "(43) 7890-1234" },
        { name: "Comércio B", address: "Rua H, 505", hours: "9h - 19h", contact: "(43) 8901-2345" },
        { name: "Comércio C", address: "Rua I, 606", hours: "10h - 20h", contact: "(43) 9012-3456" },
      ]
    }
  ];

  categories.forEach(category => {
    category.link.addEventListener("click", function (event) {
      event.preventDefault();
      loadContent(category.title, category.establishments);
      sidebar.classList.add("close"); // Garante que a sidebar fica aberta
    });
  });







});
