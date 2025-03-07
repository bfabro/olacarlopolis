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
  //////////////////////////// inicio
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
            <p>Promoçoes do <b>${establishment.name}.</b></p>

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
  <button class="fleyer-btn" data-name="${establishment.name}" style="background-color: #dfa529; color: white; border: none; padding: 5px 10px; border-radius: 5px; cursor: pointer;">
    Ver Fleyer
  </button>
  <div class="menu-content" id="menu-${encodeURIComponent(establishment.name)}" style="display: none; text-align: center;">
    <img src="${establishment.menuFlyer}" alt="Fleyer de ${establishment.name}" style="width: 100%; max-width: 400px; border-radius: 10px; margin-top: 10px;">
  </div>` : ""}


        </li>
      `).join('')}
    </ul>`;


    document.querySelectorAll(".menu-btn").forEach(button => {
      button.addEventListener("click", function () {
        const menuId = `menu-${encodeURIComponent(this.dataset.name)}`;
        const menuDiv = document.getElementById(menuId);

        // Verifica se o cardápio está visível (não possui a classe "hidden")
        if (menuDiv.classList.contains("hidden")) {
          // Abre o cardápio
          menuDiv.classList.remove("hidden");
          this.textContent = "Fechar Cardápio"; // Altera o texto do botão
          this.style.backgroundColor = "#ff3333"; // Muda a cor para vermelho
        } else {
          // Fecha o cardápio
          menuDiv.classList.add("hidden");
          this.textContent = "Ver Cardápio"; // Texto volta ao original
          this.style.backgroundColor = "#dfa529"; // Cor original (amarelo)
        }
      });
    });
/// para o fleyer
    document.querySelectorAll(".fleyer-btn").forEach(button => {
      button.addEventListener("click", function () {
        const menuId2 = `menu-${encodeURIComponent(this.dataset.name)}`;
        const menuDiv2 = document.getElementById(menuId2);

        // Verifica se o cardápio está visível (não possui a classe "hidden")
        if (menuDiv2.classList.contains("hidden")) {
          // Abre o cardápio
          menuDiv2.classList.remove("hidden");
          this.textContent = "Fechar Fleyer"; // Altera o texto do botão
          this.style.backgroundColor = "#ff3333"; // Muda a cor para vermelho
        } else {
          // Fecha o cardápio
          menuDiv2.classList.add("hidden");
          this.textContent = "Ver Fleyer"; // Texto volta ao original
          this.style.backgroundColor = "#dfa529"; // Cor original (amarelo)
        }
      });
    });


    

    document.querySelectorAll(".fleyer-btn").forEach(button => {
      button.addEventListener("click", function () {
        document.getElementById(`menu-${encodeURIComponent(this.dataset.name)}`).style.display = "block";
      });
    });


    


    document.querySelectorAll(".menu-btn").forEach(button => {
      button.addEventListener("click", function () {
        document.getElementById(`menu-${encodeURIComponent(this.dataset.name)}`).style.display = "block";
      });
    });


    document.querySelectorAll(".fechar-menu").forEach(button => {
      button.addEventListener("click", function () {
        this.parentElement.style.display = "none";
      });
    });


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
      link: lanchoneteLink, title: "Lanchonetes em Carlópolis", establishments: [
        { name: "Paiol", hours: "qua - dom 19 - 00h", address: "Av. Elson Soares, 767 ", contact: "(11) 99898-5930", delivery: "Sim / Sem Taxa", menuImage: "images/img_lanchonetes/cardapio_1.jpg" },
        { name: "Casarao", hours: "seg - seg - 19h - 00h e dom: 07 - 12h", address: "R. Benedito Salles, 341 ", contact: "(43) 2345-6789", delivery: "Sim / Com Taxa", menuImage: "images/img_lanchonetes/cardapio_2.jpg" },
      ]
    },

    {
      link: eventosLink , title: "Eventos em Carlópolis", establishments: [
        { name: "Calendario Eventos", contact: "(43) 2345-6789", menuFlyer: "images/img_informacoes/eventos/calendario_evento.png" },     
        { name: "Feira da Lua", hours: "sex 19 - 00h", address: "Praça Igreja Matriz ", contact: "(11) 99898-5930",menuFlyer: "images/img_informacoes/eventos/feira_lua_1.png" },
        { name: "Passeata contra a barriga", hours: "dom: 07 - 12h", address: "Av Turistica, 800", contact: "(43) 2345-6789", menuFlyer: "images/img_informacoes/eventos/corrida_10.jpg" },
        
      
      ]
    },



    {
      link: supermercadoLink, title: "Supermercados em Carlópolis", establishments: [
        { name: "Rocha", hours: "6h - 20h e dom: 06 - 12h", address: "Av. Elson Soares, 767 ", contact: "(11) 99898-5930", delivery: "Sim / Sem Taxa" },
        { name: "Carreiro", address: "R. Benedito Salles, 341 ", hours: "7h - 20h e dom: 07 - 12h", contact: "(43) 2345-6789", delivery: "Sim / Com Taxa" },
        { name: "Barateiro", address: "PR-218, 1168 ", hours: "8h - 21h e dom: 07 - 12h", contact: "(43) 3456-7890", delivery: "Sim / Sem Taxa" },
        { name: "Kelve", address: "PR-218, 1168 ", hours: "8h - 21h e dom: 07 - 12h", contact: "(43) 3456-7890", delivery: "Sim / Sem Taxa" },
        { name: "Zero Japan", address: "PR-218, 1168 ", hours: "8h - 21h e dom: 07 - 12h", contact: "(43) 3456-7890", delivery: "Sim / Sem Taxa" },
        { name: "Carriel", address: "PR-218, 1168 ", hours: "8h - 21h e dom: 07 - 12h", contact: "(43) 3456-7890", delivery: "Sim / Sem Taxa" },
        { name: "Compre Bem +", address: "PR-218, 1168 ", hours: "8h - 21h e dom: 07 - 12h", contact: "(43) 3456-7890", delivery: "Sim / Sem Taxa" },




      ]
    },



    {
      link: farmaciaLink, title: "Farmácias em Carlópolis", establishments: [
        { name: "DrogaMais ( Jorginho )", hours: "seg a sex: 8h - 18h e sab: 08 - 12h", address: "Rua Benedito Salles, 903", contact: "(43) 98411-9145" },
        { name: "Desconto Facil 1 ( Joao )", address: "R. Benedito Salles, 574", hours: "seg a sex: 8h - 18h e sab: 08 - 12h", contact: "(43) 3566-1119" },
        { name: "Santa Maria ( Aguera )" , address: "Praça Coronel Leite, nº 711", hours: "seg a sex: 8h - 18h e sab: 08 - 12h", contact: "(43) 3566-1471" },
        { name: "Farmashop ( Zurdo )" , address: "Praça Coronel Leite, nº 699", hours: "seg a sex: 8h - 18h e sab: 08 - 12h", contact: "(43) 3566-1471" },
        { name: "PopularMais( Jeremias )" , address: "R. Laurindo Franco de Godói, 787", hours: "seg a sex: 8h - 18h e sab: 08 - 12h", contact: "(43) 99647-6266" },
      
      
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
        { name: "DrogaMais (Jorginho) ", address: "Rua Benedito Salles, 903",  contact: "(43) 98411-9145",plantaoHorario: "Das 7h às 21h , Do dia 7 a 14  Março 2025"},
      ]
    }
  ];

  // Adicionar eventos para os links do menu
  categories.forEach(category => {
    category.link.addEventListener("click", function (event) {
      event.preventDefault();
      // Remove a classe ativa de todos os itens
      categories.forEach(cat => cat.link.classList.remove("active"));

      // Adiciona a classe ativa ao item clicado
      this.classList.add("active");

      // Carrega o conteúdo correspondente
      loadContent(category.title, category.establishments);

      // Expande a sidebar, se estiver fechada
      if (sidebar.classList.contains("close")) {
        sidebar.classList.remove("close");
      }

      // Fecha a sidebar SOMENTE em telas pequenas após clicar no menu
      if (window.innerWidth < 768) {
        setTimeout(() => {
          sidebar.classList.add("close");
        }, 100); // Pequeno delay para evitar que o clique feche imediatamente
      }

    });
  });






  // Fechar a sidebar ao clicar fora dela (em dispositivos móveis)
  document.addEventListener("click", function (event) {
    if (window.innerWidth < 768 && !sidebar.contains(event.target)) {
      sidebar.classList.add("close");
    }
  });





});