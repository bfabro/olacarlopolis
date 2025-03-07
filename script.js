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
          <strong class="highlighted">${establishment.name}</strong><br>
          ${establishment.hours ? `<b>Funcionamento:</b> ${establishment.hours}<br>` : ""}
          ${establishment.address ? `
            <b>Endereço: </b><a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(establishment.address)}" target="_blank" class="map-icon">
              <i class='bx bx-map'></i> 
            </a> ${establishment.address}</br>` : ""}
  <b>Contato:</b> ${establishment.contact} 
           <a href="https://api.whatsapp.com/send?phone=${establishment.contact.replace(/\D/g, '')}&text=${encodeURIComponent('Olá! Encontrei seu número no Olá Carlópolis e gostaria de uma informação. Pode me atender?')}" target="_blank" class="whatsapp-icon">
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



  ${establishment.menuImages && establishment.menuImages.length > 0 ? `<button class="menu-btn" data-name="${establishment.name}" style="background-color: red; color: white; border: none; padding: 8px 12px; border-radius: 5px; cursor: pointer; display: block; margin-top: 10px;">Ver Cardápio</button>
          <div class="menu-content" id="menu-${encodeURIComponent(establishment.name)}" style="display: none; text-align: center;">
            <div class="carousel">
              <button class="prev" onclick="prevSlide('${establishment.name}')">&#10094;</button>
              <div class="carousel-images">
                ${establishment.menuImages.map((img, index) => `
                  <img src="${img}" class="carousel-img" data-index="${index}" style="display: ${index === 0 ? 'block' : 'none'}; width: 100%; max-width: 400px; border-radius: 10px; margin-top: 10px;">
                `).join('')}
              </div>
              <button class="next" onclick="nextSlide('${establishment.name}')">&#10095;</button>
            </div>
            <button class="fechar-menu">Fechar Cardápio</button>
          </div>` : "<p style='color: red; font-weight: bold;'>Nenhum cardápio disponível</p>"}



        </li>
      `).join('')}
    </ul>`;


    
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

  window.nextSlide = function(name) {
    const images = document.querySelectorAll(`#menu-${encodeURIComponent(name)} .carousel-img`);
    let currentIndex = Array.from(images).findIndex(img => img.style.display === 'block');
    images[currentIndex].style.display = 'none';
    let nextIndex = (currentIndex + 1) % images.length;
    images[nextIndex].style.display = 'block';
  };

  window.prevSlide = function(name) {
    const images = document.querySelectorAll(`#menu-${encodeURIComponent(name)} .carousel-img`);
    let currentIndex = Array.from(images).findIndex(img => img.style.display === 'block');
    images[currentIndex].style.display = 'none';
    let prevIndex = (currentIndex - 1 + images.length) % images.length;
    images[prevIndex].style.display = 'block';
  };

  if (lanchoneteLink) {
    lanchoneteLink.addEventListener("click", function (event) {
      event.preventDefault();
      loadContent("Lanchonetes em Carlópolis", [
        { name: "Paiol", hours: "qua - dom 19 - 00h", address: "Av. Elson Soares, 767 ", contact: "(11) 99898-5930", delivery: "Sim / Sem Taxa", menuImages: ["images/img_lanchonetes/cardapio_2.jpg", "images/img_lanchonetes/cardapio_1.jpg"] },
        { name: "Casarao", hours: "seg - seg - 19h - 00h", address: "R. Benedito Salles, 341 ", contact: "(43) 2345-6789", delivery: "Sim / Com Taxa", menuImages: ["images/img_lanchonetes/cardapio_1.jpg", "images/img_lanchonetes/cardapio_1.jpg"] }
      ]);
    });
  }
  
  // Carregar informações de categorias
  const categories = [
    


    {
      link: supermercadoLink, title: "Supermercados em Carlópolis", establishments: [
        { name: "Supermercado Rocha", hours: "6h - 20h e dom: 06 - 12h", address: "Av. Elson Soares, 767 ", contact: "(11) 99898-5930", delivery: "Sim / Sem Taxa" },
        { name: "Supermercado Carreiro", address: "R. Benedito Salles, 341 ", hours: "7h - 20h e dom: 07 - 12h", contact: "(43) 2345-6789", delivery: "Sim / Com Taxa" },
        { name: "Supermercado Barateiro", address: "PR-218, 1168 ", hours: "8h - 21h e dom: 07 - 12h", contact: "(43) 3456-7890", delivery: "Sim / Sem Taxa" },
      ]
    },












    {
      link: farmaciaLink, title: "Farmácias em Carlópolis", establishments: [
        { name: "Farmácia Aguera", hours: "seg a sex: 8h - 18h e sab: 08 - 12h", address: "Rua D, 101", contact: "(43) 4567-8901" },
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