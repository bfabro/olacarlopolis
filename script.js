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
  const churrasqueiroLink = document.querySelector("#menuChurrasqueiro");
  const farmaciaPlantaoLink = document.querySelector("#menufarmaciaPlantao");

  // Verifica se é um dispositivo móvel e retrai a sidebar
  if (window.innerWidth < 768) {
    sidebar.classList.add("close", "hoverable");
  }

  //////////////////////////////////////////////////////////
  // Alternar sidebar ao clicar no ícone do menu
  sidebarOpen.addEventListener("click", () => {
    sidebar.classList.remove("close"); // Expande a barra lateral
  });

  sidebarExpand.addEventListener("click", () => {
    sidebar.classList.remove("close", "hoverable");
  });

  sidebarClose.addEventListener("click", () => {
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
  submenuItems.forEach(item => {
    item.addEventListener("click", () => {
      submenuItems.forEach(i => i !== item && i.classList.remove("show_submenu"));
      item.classList.toggle("show_submenu");
    });
  });

  // Função para carregar conteúdo
  function loadContent(title, establishments) {
    contentArea.innerHTML = `<h2 class="highlighted">${title}</h2><br><ul>
      ${establishments.map(establishment => `
        <li>
          <strong class="highlighted">${establishment.name}</strong><br>
          ${establishment.hours ? `<b>Funcionamento:</b> ${establishment.hours}<br>` : ""}
          ${establishment.address ? `
            <b>Endereço: </b><a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(establishment.address)}" target="_blank" class="map-icon">
              <i class='bx bx-map'></i> 
            </a> ${establishment.address}</br>` : ""}
  <b>Contato:</b> ${establishment.contact} 
          <a href="https://wa.me/55${establishment.contact.replace(/[^0-9]/g, '')}?text=Vim%20por%20meio%20do%20site%20Ol%C3%A1%20Carl%C3%B3polis,%20poderia%20me%20ajudar?" target="_blank" class="whatsapp-icon">
            <i style="color:rgb(16, 155, 35)"class='bx bxl-whatsapp'></i>
          </a><br>
          ${establishment.delivery ? `<b>Entrega:</b> ${establishment.delivery}<br>` : ""}
         

          <button class="detalhes-btn" data-name="${establishment.name}" 
            data-contact="${establishment.contact}">
            Ver mais detalhes
          </button>
          <div class="detalhes-content" id="detalhes-${encodeURIComponent(establishment.name)}" style="display: none;">
            <p>Aqui você pode adicionar fotos e promoções para ${establishment.name}.</p>
            <button class="fechar-detalhes">Fechar</button>
          </div>
        </li>
      `).join('')}
    </ul>`;
  
    // Adicionar eventos aos botões de detalhes
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
  }

  // Carregar informações de categorias
  const categories = [
    {
      link: supermercadoLink, title: "Supermercados em Carlópolis", establishments: [
        { name: "Supermercado Rocha", hours: "6h - 20h e dom: 06 - 12h",address: "Av. Elson Soares, 767 ",  contact: "(11) 99898-5930", delivery: "Sim / Sem Taxa" },
        { name: "Supermercado Carreiro", address: "R. Benedito Salles, 341 ", hours: "7h - 20h e dom: 07 - 12h", contact: "(43) 2345-6789", delivery: "Sim / Com Taxa" },
        { name: "Supermercado Barateiro", address: "PR-218, 1168 ", hours: "8h - 21h e dom: 07 - 12h", contact: "(43) 3456-7890", delivery: "Sim / Sem Taxa" },
      ]
    },
    {
      link: farmaciaLink, title: "Farmácias em Carlópolis", establishments: [
        { name: "Farmácia Aguera",hours: "seg a sex: 8h - 18h e sab: 08 - 12h", address: "Rua D, 101",  contact: "(43) 4567-8901" },
        { name: "Farmácia Jorginho", address: "Rua E, 202", hours: "seg a sex: 8h - 18h e sab: 08 - 12h", contact: "(43) 5678-9012" },
        { name: "Farmácia João", address: "Rua F, 303", hours: "seg a sex: 8h - 18h e sab: 08 - 12h", contact: "(43) 6789-0123" },
      ]
    },
   
    {
      link: churrasqueiroLink, title: "Churrasqueiros em Carlópolis", establishments: [
        { name: "Pituka", contact: "(43) 7890-1234" },
        { name: "Gustavo", contact: "(43) 8901-2345" },
      ]
    },
    {
      link: farmaciaPlantaoLink, title: "Farmacia de Plantão", establishments: [
        { name: "Farma Mais", address: "Rua do calçadao, 123", hours: "7h - 21h e dom: 07 - 20h", contact: "(43) 3456-7890" },
      ]
    }
  ];

  // Adicionar eventos para os links do menu
  categories.forEach(category => {
    category.link.addEventListener("click", function (event) {
      event.preventDefault();
      loadContent(category.title, category.establishments);

      // Expande a sidebar ao clicar em um item
      sidebar.classList.remove("close");

      
    });
  });

  // Fechar a sidebar ao clicar fora dela (em dispositivos móveis)
  document.addEventListener("click", function (event) {
    if (window.innerWidth < 768 && !sidebar.contains(event.target)) {
      sidebar.classList.add("close");
    }
  });
});