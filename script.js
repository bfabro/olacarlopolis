document.addEventListener("DOMContentLoaded", function () {
  const body = document.querySelector("body");
  const darkLight = document.querySelector("#darkLight");
  const sidebar = document.querySelector(".sidebar");
  const contentArea = document.querySelector(".content_area");
  const submenuItems = document.querySelectorAll(".submenu_item");

  // Links do menu lateral
  const menuLinks = {
    comercio: document.querySelector("#menuComercio"),
    supermercado: document.querySelector("#menuMercado"),
    farmacia: document.querySelector("#menuFarmacia"),
    churrasqueiro: document.querySelector("#menuChurrasqueiro"),
    farmaciaPlantao: document.querySelector("#menufarmaciaPlantao"),
  };

  // Alternar sidebar (fechar/abrir)
  function toggleSidebar() {
    if (window.innerWidth < 768) {
      sidebar.classList.toggle("close");
    }
  }

  // Ajustar sidebar em telas grandes (fixa no desktop)
  function adjustSidebar() {
    if (window.innerWidth >= 768) {
      sidebar.classList.remove("close");
    } else {
      sidebar.classList.add("close");
    }
  }

  // Chamar a função ao carregar a página e ao redimensionar
  adjustSidebar();
  window.addEventListener("resize", adjustSidebar);

  // Expandir item do menu quando a sidebar estiver retraída (celular)
  function expandMenuOnClick(event) {
    if (window.innerWidth < 768 && sidebar.classList.contains("close")) {
      sidebar.classList.remove("close"); // Expande a sidebar
      event.stopPropagation(); // Evita que outros eventos interfiram
    }
  }

  // Aplicar evento de clique nos menus principais para expandir
  Object.values(menuLinks).forEach((menu) => {
    menu.addEventListener("click", expandMenuOnClick);
  });

  // Alternar submenu
  submenuItems.forEach(item => {
    item.addEventListener("click", () => {
      submenuItems.forEach(i => i !== item && i.classList.remove("show_submenu"));
      item.classList.toggle("show_submenu");
    });
  });

  // Alternar tema escuro/claro
  darkLight.addEventListener("click", () => {
    body.classList.toggle("dark");
    darkLight.classList.toggle("bx-moon");
    darkLight.classList.toggle("bx-sun");
  });

  // Função para carregar conteúdo dinamicamente
  function loadContent(title, establishments) {
    contentArea.innerHTML = `<h2 class="highlighted">${title}</h2><br><ul>
      ${establishments.map(establishment => `
        <li>
          <strong class="highlighted">${establishment.name}</strong><br>
          ${establishment.address ? `<b>Endereço:</b> ${establishment.address}<br>` : ""}
          ${establishment.hours ? `<b>Horário de Funcionamento:</b> ${establishment.hours}<br>` : ""}
          <b>Contato:</b> ${establishment.contact}<br>
          <button class="detalhes-btn" data-name="${establishment.name}">
            Ver mais detalhes
          </button>
          <div class="detalhes-content" id="detalhes-${encodeURIComponent(establishment.name)}" style="display: none;">
            <p>Aqui você pode adicionar fotos e promoções para ${establishment.name}.</p>
            <button class="fechar-detalhes">Fechar</button>
          </div>
        </li>
      `).join('')}
    </ul>`;

    // Adicionar eventos aos botões "Ver mais detalhes"
    document.querySelectorAll(".detalhes-btn").forEach(button => {
      button.addEventListener("click", function () {
        const detalhesDiv = document.getElementById(`detalhes-${encodeURIComponent(this.dataset.name)}`);
        detalhesDiv.style.display = "block";
      });
    });

    // Evento para fechar os detalhes
    document.querySelectorAll(".fechar-detalhes").forEach(button => {
      button.addEventListener("click", function () {
        this.parentElement.style.display = "none";
      });
    });

    // Após selecionar um item no submenu, a sidebar se retrai (se for no celular)
    if (window.innerWidth < 768) {
      sidebar.classList.add("close");
    }
  }

  // Dados das categorias de estabelecimentos
  const categories = [
    {
      link: menuLinks.supermercado, title: "Supermercados em Carlópolis", establishments: [
        { name: "Supermercado Rocha", address: "Rua A, 123", hours: "8h - 18h", contact: "(43) 1234-5678" },
        { name: "Supermercado Carreiro", address: "Rua B, 456", hours: "7h - 19h", contact: "(43) 2345-6789" },
        { name: "Mercado do Barateiro", address: "Rua C, 789", hours: "9h - 21h e dom: 06 - 12h", contact: "(43) 3456-7890" },
      ]
    },
    {
      link: menuLinks.farmacia, title: "Farmácias em Carlópolis", establishments: [
        { name: "Farmácia Aguera", address: "Rua D, 101", hours: "8h - 18h", contact: "(43) 4567-8901" },
        { name: "Farmácia Jorginho", address: "Rua E, 202", hours: "8h - 20h", contact: "(43) 5678-9012" },
        { name: "Farmácia João", address: "Rua F, 303", hours: "7h - 19h", contact: "(43) 6789-0123" },
      ]
    },
    {
      link: menuLinks.comercio, title: "Comércios em Carlópolis", establishments: [
        { name: "Comércio A", address: "Rua G, 404", hours: "8h - 18h", contact: "(43) 7890-1234" },
        { name: "Comércio B", address: "Rua H, 505", hours: "9h - 19h", contact: "(43) 8901-2345" },
        { name: "Comércio C", address: "Rua I, 606", hours: "10h - 20h", contact: "(43) 9012-3456" },
      ]
    },
    {
      link: menuLinks.churrasqueiro, title: "Churrasqueiros em Carlópolis", establishments: [
        { name: "Pituka", contact: "(43) 7890-1234" },
        { name: "Gustavo", contact: "(43) 8901-2345" },
      ]
    },
    {
      link: menuLinks.farmaciaPlantao, title: "Farmácia de Plantão", establishments: [
        { name: "Farma Mais", address: "Rua do Calçadão, 123", hours: "7h - 21h e dom: 07 - 20h", contact: "(43) 3456-7890" },
      ]
    }
  ];

  // Aplicar os eventos aos menus das categorias
  categories.forEach(category => {
    category.link.addEventListener("click", function (event) {
      event.preventDefault();
      loadContent(category.title, category.establishments);
    });
  });

});
