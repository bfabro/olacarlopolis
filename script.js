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
  const churrasqueiroLink = document.querySelector("#menuChurrasqueiro");
  const farmaciaPlantaoLink = document.querySelector("#menufarmaciaPlantao");
  const lanchoneteLink = document.querySelector("#menuLanchonete");
  const eventosLink = document.querySelector("#menuEventos");  
  const banner = document.getElementById("banner");

  const subMenuLinks = document.querySelectorAll(".nav_link.sublink"); // Apenas subitens do menu
  const homeLink = document.querySelector(".nav_link[href='index.html']"); // Link "Início"

  // Função para esconder o banner e mostrar o conteúdo
  function mostrarConteudo() {
     if (banner) {
        banner.classList.add("hidden"); // Esconde o banner
     }
     if (contentArea) {
        contentArea.classList.remove("hidden"); // Mostra a área de conteúdo
     }
  }

  // Adiciona evento SOMENTE aos subitens do menu
  subMenuLinks.forEach(link => {
     link.addEventListener("click", function (event) {
        event.preventDefault(); // Evita recarregar a página
        mostrarConteudo(); // Esconde o banner e mostra o conteúdo
     });
  });

  // Garantir que ao clicar no "Início", a página recarregue corretamente
  if (homeLink) {
     homeLink.addEventListener("click", function (event) {
        event.preventDefault();
        window.location.href = "index.html"; // Recarrega a página
     });
  }

  // Garantir que ao acessar a home, o banner esteja visível e o conteúdo escondido
  if (window.location.pathname.includes("index.html")) {
     banner.classList.remove("hidden");
     contentArea.classList.add("hidden");
  }

  ///////////////////////////// fimmmmm 

  // Garante que ao recarregar a página inicial, o banner apareça
  if (window.location.pathname.includes("index.html")) {
     banner.classList.remove("hidden");
     contentArea.classList.add("hidden");
  }

  // Verifica se é um dispositivo móvel e retrai a sidebar
  if (window.innerWidth < 768) {
     sidebar.classList.add("close", "hoverable");
  }

  //////////////////////////////////////////////////////////
  // Alternar sidebar ao clicar no ícone do menu
  sidebarOpen.addEventListener("click", () => {
    sidebar.classList.toggle("close");
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
         <strong class="locais_nomes">${establishment.name}</strong><br>
         ${establishment.hours ? `<b>Funcionamento:</b> ${establishment.hours}<br>` : ""}
         ${establishment.plantaoHorario ? `<b class="highlight-plantao">Plantão:</b> <span class="plantao-text">${establishment.plantaoHorario}</span><br>` : ""}  <!-- Exibe o horário de plantão -->
         ${establishment.address ? `
           <b>Endereço: </b><a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(establishment.address)}" target="_blank" class="map-icon">
             <i class='bx bx-map'></i> 
           </a> ${establishment.address}</br>` : ""}
         <b>Contato:</b> ${establishment.contact} 
         <a href="https://api.whatsapp.com/send?phone=${establishment.contact.replace(/\D/g, '')}&text=${encodeURIComponent('Olá! Encontrei seu número no Olá Carlópolis e gostaria de uma informação!')}" target="_blank" class="whatsapp-icon">
           <i style="color:rgb(16, 155, 35)"class='bx bxl-whatsapp'></i>
         </a><br>
         ${establishment.delivery ? `<b>Entrega:</b> ${establishment.delivery}<br>` : ""}

         <button class="detalhes-btn" data-name="${establishment.name}" 
           data-contact="${establishment.contact}">
           + Informações
         </button>
         <div class="detalhes-content" id="detalhes-${encodeURIComponent(establishment.name)}" style="display: none;">
           <p>Promoções do <b>${establishment.name}.</b></p>
           </br>
           <button style="color:rgb(206, 24, 17)" class="fechar-detalhes">Fechar</button>
         </div>

         ${establishment.menuImage ? `
          <button class="menu-btn" data-name="${establishment.name}" style="background-color: #dfa529; color: white; border: none; padding: 5px 10px; border-radius: 5px; cursor: pointer;">
           Ver Cardápio
          </button>
          <div class="menu-content" id="menu-${encodeURIComponent(establishment.name)}" style="display: none; text-align: center;">
           <img src="${establishment.menuImage}" alt="Cardápio de ${establishment.name}" style="width: 100%; max-width: 400px; border-radius: 10px; margin-top: 10px;">
          </div>` : ""}

         ${establishment.menuFlyer ? `
          <button class="flyer-btn" data-name="${establishment.name}" style="background-color: #dfa529; color: white; border: none; padding: 5px 10px; border-radius: 5px; cursor: pointer;">
           Ver Flyer
          </button>
          <div class="menu-content" id="menu-${encodeURIComponent(establishment.name)}" style="display: none; text-align: center;">
           <img src="${establishment.menuFlyer}" alt="Flyer de ${establishment.name}" style="width: 100%; max-width: 400px; border-radius: 10px; margin-top: 10px;">
          </div>` : ""}
       </li>
     `).join('') }
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

     // Adicionar eventos para os botões de menu e flyer
     document.querySelectorAll(".menu-btn, .flyer-btn").forEach(button => {
        button.addEventListener("click", function () {
           const menuId = `menu-${encodeURIComponent(this.dataset.name)}`;
           const menuDiv = document.getElementById(menuId);

           // Alterna a exibição do cardápio ou flyer
           menuDiv.classList.toggle("hidden");
           this.textContent = menuDiv.classList.contains("hidden") ? `Ver ${this.classList.contains("menu-btn") ? "Cardápio" : "Flyer"}` : `Fechar ${this.classList.contains("menu-btn") ? "Cardápio" : "Flyer"}`;
           this.style.backgroundColor = menuDiv.classList.contains("hidden") ? "#dfa529" : "#ff3333"; // Alterar cor do botão
        });
     });
  }

  // Carregar informações de categorias
  const categories = [ /* categorias e estabelecimentos aqui (como no seu código original) */ ];

  // Adicionar eventos para os links do menu
  categories.forEach(category => {
     category.link.addEventListener("click", function (event) {
        event.preventDefault();
        categories.forEach(cat => cat.link.classList.remove("active"));
        this.classList.add("active");
        loadContent(category.title, category.establishments);

        if (sidebar.classList.contains("close")) {
           sidebar.classList.remove("close");
        }

        // Fecha a sidebar SOMENTE em telas pequenas após clicar no menu
        if (window.innerWidth < 768) {
          if (!sidebar.classList.contains("close")) { 
            setTimeout(() => {
              sidebar.classList.add("close");
            }, 300);
          }
        }
     });
  });

  document.addEventListener("click", function (event) {
    if (window.innerWidth < 768 && 
        !sidebar.contains(event.target) && 
        event.target !== sidebarOpen && 
        !event.target.closest(".menu_items")) {  
      sidebar.classList.add("close");
    }
  });

});
