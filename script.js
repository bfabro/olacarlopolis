document.addEventListener("DOMContentLoaded", function () {
  const body = document.querySelector("body");
  const darkLight = document.querySelector("#darkLight");
  const sidebar = document.querySelector(".sidebar");
  const contentArea = document.querySelector(".content_area");
  const submenuItems = document.querySelectorAll(".submenu_item");
  const sidebarOpen = document.querySelector("#sidebarOpen");
  const sidebarClose = document.querySelector(".collapse_sidebar");
  const sidebarExpand = document.querySelector(".expand_sidebar");
  const banner = document.getElementById("banner");
  const subMenuLinks = document.querySelectorAll(".nav_link.sublink"); // Apenas subitens do menu
  const homeLink = document.querySelector(".nav_link[href='index.html']"); // Link "Início"
  const searchInput = document.getElementById("searchSidebar");

  const clearSearch = document.getElementById("clearSearch");
  // Inicio pesquisa nome no menu lateral
  // volta aqui


  document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("content_area").classList.remove("hidden");
  });
  if (!searchInput) return; // Evita erro se o campo de busca não existir

  // Carregar informações de categorias
  const categories = [{
    link: document.querySelector("#menuLanchonete"),
    title: "Lanchonetes em Carlópolis",
    establishments: [{
      name: "Paiol",
      hours: "qua - dom 19 - 00h",
      address: "Av. Elson Soares, 767 ",
      contact: "(11) 99898-5930",
      delivery: "Sim / Sem Taxa",
      facebook: "www.facebook.com/uahh",
      instagram: "www.instagram.com/uahh",
      site: "www.google.com",
      menuImage: "images/comercios/lanchonete/paiol/cardapio_1.jpg",
      info: " <strong>Promoção especial:</strong><ul>Compre 1 pizza e ganhe uma sobremesa grátis!</br>Desconto de 15% para pedidos acima de R$ 50,00. </ul> " // Informação personalizada      
    },
    {
      name: "Casarao",
      hours: "seg - seg - 19h - 00h e dom: 07 - 12h",
      address: "R. Benedito Salles, 341 ",
      contact: "(43) 2345-6789",
      delivery: "Sim / Com Taxa",
      facebook: "www.facebook.com/uahh",
      instagram: "www.instagram.com/uahh",
      site: "www.google.com",
      menuImage: "images/comercios/lanchonete/casarao/casarao.png",
      info: "Palavra Chave: <strong>Supimpa</strong>. Use no pedido e ganhe 1% de desconto!" // Informação personalizada
    },
    ]
  },

  {

    link: document.querySelector("#menuEventos"),
    title: "Eventos em Carlópolis",
    establishments: [{
      name: "Calendario Eventos",
      contact: "(43) 2345-6789",
      menuFlyer: "images/info_uteis/eventos/evento_1/calendario_evento.png"

    },
    {
      name: "Feira da Lua",
      hours: "sex 19 - 00h",
      address: "Praça Igreja Matriz ",
      contact: "(11) 99898-5930",
      menuFlyer: "images/info_uteis/eventos/evento_2/feira_lua_1.png"
    },
    {
      name: "Passeata contra a barriga",
      hours: "dom: 07 - 12h",
      address: "Av Turistica, 800",
      contact: "(43) 2345-6789",
      menuFlyer: "images/info_uteis/eventos/evento_3/corrida_10.jpg"
    },


    ]
  },


  {
    link: document.querySelector("#menuMercado"),
    title: "Supermercados em Carlópolis",
    establishments: [{
      name: "Rocha",
      hours: "6h - 20h e dom: 06 - 12h",
      address: "Av. Elson Soares, 767 ",
      contact: "(11) 99898-5930",
      delivery: "Sim / Sem Taxa"
    },
    {
      name: "Carreiro",
      address: "R. Benedito Salles, 341 ",
      hours: "7h - 20h e dom: 07 - 12h",
      contact: "(43) 2345-6789",
      delivery: "Sim / Com Taxa"
    },
    {
      name: "Barateiro",
      address: "PR-218, 1168 ",
      hours: "8h - 21h e dom: 07 - 12h",
      contact: "(43) 3456-7890",
      delivery: "Sim / Sem Taxa"
    },
    {
      name: "Kelve",
      address: "PR-218, 1168 ",
      hours: "8h - 21h e dom: 07 - 12h",
      contact: "(43) 3456-7890",
      delivery: "Sim / Sem Taxa"
    },
    {
      name: "Zero Japan",
      address: "PR-218, 1168 ",
      hours: "8h - 21h e dom: 07 - 12h",
      contact: "(43) 3456-7890",
      delivery: "Sim / Sem Taxa"
    },
    {
      name: "Carriel",
      address: "PR-218, 1168 ",
      hours: "8h - 21h e dom: 07 - 12h",
      contact: "(43) 3456-7890",
      delivery: "Sim / Sem Taxa"
    },
    {
      name: "Compre Bem +",
      address: "PR-218, 1168 ",
      hours: "8h - 21h e dom: 07 - 12h",
      contact: "(43) 3456-7890",
      delivery: "Sim / Sem Taxa"
    },


    ]
  },


  {
    link: document.querySelector("#menuFarmacia"),
    title: "Farmácias em Carlópolis",
    establishments: [{

      image: "images/comercios/farmacia/drogamais.png",
      name: "DrogaMais ( Jorginho )",
      hours: "seg a sex: 8h - 18h e sab: 08 - 12h",
      address: "Rua Benedito Salles, 903",
      contact: "(43) 98411-9145",
      delivery: "Sim / Sem Taxa",
      facebook: "www.facebook.com/uahh",
      instagram: "www.instagram.com/uahh",
      site: "www.google.com"
    },
    {
      image: "images/comercios/farmacia/farmafacil.png",
      name: "Desconto Facil 1 ( Joao )",
      address: "R. Benedito Salles, 574",
      hours: "seg a sex: 8h - 18h e sab: 08 - 12h",
      contact: "(43) 3566-1119",
      delivery: "Sim / Sem Taxa",
      facebook: "www.facebook.com/uahh",
      instagram: "www.instagram.com/uahh",
      site: "www.google.com"
    },
    {
      image: "images/comercios/farmacia/santamaria.png",
      name: "Santa Maria ( Aguera )",
      address: "Praça Coronel Leite, nº 711",
      hours: "seg a sex: 8h - 18h e sab: 08 - 12h",
      contact: "(43) 3566-1471",
      delivery: "Sim / Sem Taxa",
      facebook: "www.facebook.com/uahh",
      instagram: "www.instagram.com/uahh",
      site: "www.google.com"
    },
    {
      image: "images/comercios/farmacia/masterfarma.png",
      name: "MasterFarma ( Zurdo )",
      address: "R. Laurindo Franco de Godoi, 90",
      hours: "seg a sex: 8h - 18h e sab: 08 - 12h",
      contact: "(43) 3566-1471",
      delivery: "Sim / Sem Taxa",
      facebook: "www.facebook.com/uahh",
      instagram: "www.instagram.com/uahh",
      site: "www.google.com"
    },
    {
      image: "images/comercios/farmacia/drogamais.png",
      name: "PopularMais( Jeremias )",
      address: "R. Laurindo Franco de Godói, 787",
      hours: "seg a sex: 8h - 18h e sab: 08 - 12h",
      contact: "(43) 3566-1471",
      delivery: "Sim / Sem Taxa",
      facebook: "www.facebook.com/uahh",
      instagram: "www.instagram.com/uahh",
      site: "www.google.com"
    },


    ]
  },

  {
    link: document.querySelector("#menuChurrasqueiro"),
    title: "Churrasqueiros em Carlópolis",
    establishments: [{
      name: "Pituka",
      contact: "(43) 7890-1234"
    },
    {
      name: "Gustavo",
      contact: "(43) 8901-2345"
    },
    ]
  },

  {
    link: document.querySelector("#menuBabas"),
    title: "Babas em Carlópolis",
    establishments: [{
      name: "Maria",
      contact: "(43) 7890-1234"
    },
    {
      name: "Antonia",
      contact: "(43) 8901-2345"
    },
    ]
  },

  {
    link: document.querySelector("#menuDiarista"),
    title: "Diarias em Carlópolis",
    establishments: [{
      name: "Rose",
      contact: "(43) 7890-1234"
    },
    {
      name: "Maria",
      contact: "(43) 8901-2345"
    },
    ]
  },

  {
    link: document.querySelector("#menuEletricista"),
    title: "Eletrecistas em Carlópolis",
    establishments: [{
      name: "Juca",
      contact: "(43) 7890-1234"
    },
    {
      name: "Jurandir",
      contact: "(43) 8901-2345"
    },
    ]
  },

  {
    link: document.querySelector("#menuEncanador"),
    title: "Encanador em Carlópolis",
    establishments: [{
      name: "Rubens",
      contact: "(43) 7890-1234"
    },
    {
      name: "Jose",
      contact: "(43) 8901-2345"
    },
    ]
  },

  {
    link: document.querySelector("#menuGuiaPesca"),
    title: "Guia de Pesca em Carlópolis",
    establishments: [{
      name: "Fabio Sushimoto",
      contact: "(43) 7890-1234"
    },
    {
      name: "Thiago Aguera",
      contact: "(43) 8901-2345"
    },
    ]
  },

  {
    link: document.querySelector("#menuJardineiro"),
    title: "Jardineiros em Carlópolis",
    establishments: [{
      name: "Antonio Gil",
      contact: "(43) 7890-1234"
    },
    {
      name: "Ruan",
      contact: "(43) 8901-2345"
    },
    ]
  },

  {
    link: document.querySelector("#menuMarceneiro"),
    title: "Marceneiros em Carlópolis",
    establishments: [{
      name: "Pedro alvez",
      contact: "(43) 7890-1234"
    },
    {
      name: "Rodrigo",
      contact: "(43) 8901-2345"
    },
    ]
  },

  {
    link: document.querySelector("#menuPedreiro"),
    title: "Pedreiros em Carlópolis",
    establishments: [{
      name: "Denis centurion",
      contact: "(43) 7890-1234"
    },
    {
      name: "Kauan",
      contact: "(43) 8901-2345"
    },
    ]
  },

  {
    link: document.querySelector("#menuPintor"),
    title: "Pintor em Carlópolis",
    establishments: [{
      name: "Rafael portes",
      contact: "(43) 7890-1234"
    },
    {
      name: "Yuri",
      contact: "(43) 8901-2345"
    },
    ]
  },

  {
    link: document.querySelector("#menuVeterinario"),
    title: "Veterinario em Carlópolis",
    establishments: [{
      name: "Celso Golçalves",
      contact: "(43) 7890-1234"
    },
    {
      name: "Jurandir Machado",
      contact: "(43) 8901-2345"
    },
    ]
  },

  {

    link: document.querySelector("#menufarmaciaPlantao"),

    title: "Farmacia de Plantão",
    establishments: [{
      name: "MasterFarma ( Zurdo ) ",
      address: "R. Laurindo Franco de Godoi, 90",
      contact: "(43) 99951-1540",
      plantaoHorario: "Das 7h às 21h , Do dia 7 a 14  Março 2025",
      delivery: "Sim / Sem Taxa",
      image: "images/info_uteis/farmacia_plantao/masterFarma.png"

    },]
  },

  {

    link: document.querySelector("#menuHorarioOnibus"),
    title: "Hoario de Onibus em Carlópolis",
    establishments: [{
      name: "Princesa",
      contact: "(43) 2345-6789",
      menuFlyer: "images/img_informacoes/eventos/calendario_evento.png"
    },
    {
      name: "Feira da Lua",
      hours: "sex 19 - 00h",
      address: "Praça Igreja Matriz ",
      contact: "(11) 99898-5930",
      menuFlyer: "images/img_informacoes/eventos/feira_lua_1.png"
    },
    {
      name: "Passeata contra a barriga",
      hours: "dom: 07 - 12h",
      address: "Av Turistica, 800",
      contact: "(43) 2345-6789",
      menuFlyer: "images/img_informacoes/eventos/corrida_10.jpg"
    },


    ]
  },




  {
    link: document.querySelector("#menuMotoCenter"),

    title: "Moto Center",
    establishments: [{


      name: "Binho Moto Center ",
      hours: "seg a sex: 8h - 18h e sab: 08 - 12h",
      address: "R. Laurindo Franco de Godoi, 90",
      contact: "(43) 99951-1540",
      delivery: "Sim / Sem Taxa"


    },]
  },


  {
    link: document.querySelector("#menuAcougue"),

    title: "Açougues",
    establishments: [{


      name: "Açougue do Carlinho ",
      hours: "seg a sex: 8h - 18h e sab: 08 - 12h",
      address: "R. Laurindo Franco de Godoi, 90",
      contact: "(43) 99951-1540",
      delivery: "Sim / Sem Taxa"


    },]
  },

  {
    link: document.querySelector("#menuAgropecuaria"),

    title: "Agropecuarias",
    establishments: [{



      name: "Vida Nova",
      hours: "seg a sex: 8h - 18h e sab: 08 - 12h",
      address: "R. Laurindo Franco de Godoi, 90",
      contact: "(43) 99951-1540",
      delivery: "Sim / Sem Taxa"


    },]
  },

  {
    link: document.querySelector("#menuAutoCenter"),

    title: "Auto Center",
    establishments: [{



      name: "Auto center bairro",
      hours: "seg a sex: 8h - 18h e sab: 08 - 12h",
      address: "R. Laurindo Franco de Godoi, 90",
      contact: "(43) 99951-1540",
      delivery: "Sim / Sem Taxa"


    },]
  },

  {
    link: document.querySelector("#menuBrinquedos"),

    title: "Loja de Brinquedos",
    establishments: [{


      name: "Filho Otaviano",
      hours: "seg a sex: 8h - 18h e sab: 08 - 12h",
      address: "R. Laurindo Franco de Godoi, 90",
      contact: "(43) 99951-1540",
      delivery: "Sim / Sem Taxa"




    },]
  },

  {
    link: document.querySelector("#menuDiskGas"),

    title: "Deposito de Gas",
    establishments: [{



      name: "Lia Gas",
      hours: "seg a sex: 8h - 18h e sab: 08 - 12h",
      address: "R. Laurindo Franco de Godoi, 90",
      contact: "(43) 99951-1540",
      delivery: "Sim / Sem Taxa"


    },]
  },

  {
    link: document.querySelector("#menuFuneraria"),

    title: "Funerarias",
    establishments: [{

      name: "Bom Jesus",
      hours: "seg a sex: 8h - 18h e sab: 08 - 12h",
      address: "R. Laurindo Franco de Godoi, 90",
      contact: "(43) 99951-1540",
      delivery: "Sim / Sem Taxa"

    },]
  },

  {
    link: document.querySelector("#menuMaterialContrucao"),

    title: "Material de Construção",
    establishments: [{




      name: "Carriel",
      hours: "seg a sex: 8h - 18h e sab: 08 - 12h",
      address: "R. Laurindo Franco de Godoi, 90",
      contact: "(43) 99951-1540",
      delivery: "Sim / Sem Taxa"

    },]
  },

  {
    link: document.querySelector("#menuPadaria"),

    title: "Padarias",
    establishments: [{


      name: "Bom Jesus",
      hours: "seg a sex: 8h - 18h e sab: 08 - 12h",
      address: "R. Laurindo Franco de Godoi, 90",
      contact: "(43) 99951-1540",
      delivery: "Sim / Sem Taxa"




    },]
  },

  {
    link: document.querySelector("#menuPetShop"),

    title: "Pet Shop",
    establishments: [{


      name: "Paraiso dos Animais",
      hours: "seg a sex: 8h - 18h e sab: 08 - 12h",
      address: "R. Laurindo Franco de Godoi, 90",
      contact: "(43) 99951-1540",
      delivery: "Sim / Sem Taxa"



    },]
  },

  {
    link: document.querySelector("#menuQuitanda"),

    title: "Quitanda",
    establishments: [{


      name: "Pimenta Doce",
      hours: "seg a sex: 8h - 18h e sab: 08 - 12h",
      address: "R. Laurindo Franco de Godoi, 90",
      contact: "(43) 99951-1540",
      delivery: "Sim / Sem Taxa"


    },]
  },

  {
    link: document.querySelector("#menuRestaurantes"),

    title: "Restaurante",
    establishments: [{



      name: "Delfino",
      hours: "seg a sex: 8h - 18h e sab: 08 - 12h",
      address: "R. Laurindo Franco de Godoi, 90",
      contact: "(43) 99951-1540",
      delivery: "Sim / Sem Taxa"


    },]
  },

  {
    link: document.querySelector("#menuPapelaria"),

    title: "Papelaria",
    establishments: [{



      name: "Haruo",
      hours: "seg a sex: 8h - 18h e sab: 08 - 12h",
      address: "R. Laurindo Franco de Godoi, 90",
      contact: "(43) 99951-1540",





    },]
  },

  {
    link: document.querySelector("#menuImobiliaria"),

    title: "Imobiliaria",
    establishments: [{


      name: "Rafael Bandeira",
      hours: "seg a sex: 8h - 18h e sab: 08 - 12h",
      address: "R. Laurindo Franco de Godoi, 90",
      contact: "(43) 99951-1540",



    },]
  },

  {
    link: document.querySelector("#menuAdega"),

    title: "Adegas",
    establishments: [{


      name: "Adega Cuenca",
      hours: "seg a sex: 8h - 18h e sab: 08 - 12h",
      address: "R. Laurindo Franco de Godoi, 90",
      contact: "(43) 99951-1540",
      delivery: "Sim / Sem Taxa"


    },]
  }










  ]; // fim dos setores
  // Mostrar ou esconder o ícone "x" com base no conteúdo do campo de pesquisa
  searchInput.addEventListener("input", function () {
    if (searchInput.value.trim() !== "") {
      clearSearch.style.display = "block"; // Mostra o ícone "x"
    } else {
      clearSearch.style.display = "none"; // Esconde o ícone "x"
    }
  });

  // Limpar o campo de pesquisa quando o ícone "x" for clicado
  clearSearch.addEventListener("click", function () {
    searchInput.value = ""; // Limpa o campo de pesquisa
    clearSearch.style.display = "none"; // Esconde o ícone "x"
    searchInput.dispatchEvent(new Event("input")); // Dispara o evento de input para atualizar a pesquisa
  });

  searchInput.addEventListener("input", function () {
    const filter = searchInput.value.toLowerCase();
    let foundInMenu = false;
    let foundInEstablishments = false;

    // Se o campo de pesquisa estiver vazio, mostrar todos os itens do menu novamente
    if (filter === "") {
      document.querySelectorAll(".menu_items .nav_link, .menu_items .submenu_item").forEach(item => {
        item.style.display = "flex";
      });

      // Garante que o menu lateral expanda completamente
      sidebar.style.height = "auto";
      return;
    }



    // Pesquisar dentro do menu lateral
    document.querySelectorAll(".menu_items .nav_link, .menu_items .submenu_item").forEach(item => {
      const text = item.textContent.toLowerCase();
      if (text.includes(filter)) {
        item.style.display = "flex";
        foundInMenu = true;
      } else {
        item.style.display = "none";
      }
    });

    // Pesquisar dentro das categorias e carregar o conteúdo correspondente
    categories.forEach(category => {
      category.establishments.forEach(establishment => {
        const dataString = Object.values(establishment).join(" ").toLowerCase();

        if (dataString.includes(filter)) {
          foundInEstablishments = true;

          // Carrega automaticamente a categoria correspondente
          loadContent(category.title, category.establishments);

          // Simula um clique no menu correspondente
          if (category.link) {
            category.link.classList.add("active");
          }

          // Expande a sidebar se estiver fechada
          if (sidebar.classList.contains("close")) {
            sidebar.classList.remove("close");
          }
        }
      });
    });
    // Se nenhum resultado for encontrado, exibe uma mensagem
    if (!foundInMenu && !foundInEstablishments) {
      contentArea.innerHTML = "<h2>Nenhum resultado encontrado!</h2>";
    }

  });


  // Função para carregar conteúdo
  function loadContent(title, establishments) {
    contentArea.classList.remove("hidden");


    contentArea.innerHTML = `<h2 class="highlighted">${title}</h2><br><ul>
   ${establishments.map(establishment => `
     <li>  
     
       <!-- Exibe a imagem do estabelecimento, se existir -->
${establishment.image ? `
            <img src="${establishment.image}" alt="Imagem de ${establishment.name}">
          ` : ""}

     
     <strong class="locais_nomes">${establishment.name}</strong><br>
       ${establishment.hours ? `<b>Funcionamento:</b> ${establishment.hours}<br>` : ""}
       ${establishment.plantaoHorario ? `<b class="highlight-plantao">Plantão:</b> <span class="plantao-text">${establishment.plantaoHorario}</span><br>` : ""}  <!-- Exibe o horário de plantão -->
       ${establishment.address ? `
         <b>Endereço: </b>${establishment.address}</br>` : ""}

           <b>Contato:</b> ${establishment.contact} 
       <br>
       ${establishment.delivery ? `<b>Entrega:</b> ${establishment.delivery}<br>` : ""}
      
   <!-- Ícones de redes sociais e contato -->
          <div class="social-icons">
            ${establishment.address ? `
              <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(establishment.address)}" target="_blank" class="icon-link">
                <i style="color:rgb(250, 9, 9);" class='bx bx-map'></i> Localização
              </a>
            ` : ""}
           
            ${establishment.contact ? `
              <a href="https://api.whatsapp.com/send?phone=${establishment.contact.replace(/\D/g, '')}&text=${encodeURIComponent('Olá! Encontrei seu número no Olá Carlópolis e gostaria de uma informação!')}" target="_blank" class="icon-link">
                <i class='bx bxl-whatsapp' style="color: #25D366;"></i> WhatsApp
              </a>
            ` : ""} 
             </div>  <div class="social-icons">
            ${establishment.facebook ? `
              <a href="${establishment.facebook}" target="_blank" class="icon-link">
                <i class='bx bxl-facebook' style="color: #1877F2;"></i> Facebook
              </a>
            ` : ""}
            
            ${establishment.instagram ? `
              <a href="${establishment.instagram}" target="_blank" class="icon-link">
                <i class='bx bxl-instagram' style="color: #E4405F;"></i> Instagram
              </a>
            ` : ""}
            
            ${establishment.site ? `
              <a href="${establishment.site}" target="_blank" class="icon-link">
                <i class='bx bx-globe'></i> Site
              </a>
            ` : ""}
          </div>
</br>


<!-- Botão de + Informações -->
          <button class="detalhes-btn" data-name="${establishment.name}">
            + Informações
          </button>
          <div class="detalhes-content" id="detalhes-${encodeURIComponent(establishment.name)}" style="display: none;">
            <p>${establishment.info}</p> <!-- Exibe a informação personalizada -->
            <br>
            
          </div>

        ${establishment.menuImage ? `
         <button class="menu-btn" data-name="${establishment.name}" style=" #dfa529; color: white; border: none; padding: 5px 10px; border-radius: 5px; cursor: pointer;">
          Ver Cardápio
          </button>
          <div class="menu-content" id="menu-${encodeURIComponent(establishment.name)}" style="display: none; text-align: center;">
            <img src="${establishment.menuImage}" alt="Cardápio de ${establishment.name}" style="width: 100%; max-width: 400px; border-radius: 10px; margin-top: 10px;">
             </div>` : ""}

                ${establishment.menuFlyer ? `
                <button class="flyer-btn" data-name="${establishment.name}" style=" #dfa529; color: white; border: none; padding: 5px 10px; border-radius: 5px; cursor: pointer;">
                  Ver Flyer
                </button>
                <div class="menu-content" id="menu-${encodeURIComponent(establishment.name)}" style="display: none; text-align: center;">
                  <img src="${establishment.menuFlyer}" alt="Flyer de ${establishment.name}" style="width: 100%; max-width: 400px; border-radius: 10px; margin-top: 10px;">
                </div>` : ""}


     </li>
   `).join('')}
 </ul>`;

    ///// inicio
// Função para alternar a exibição de um elemento
function toggleElement(button, elementId, openText, closeText, openColor, closeColor) {
  const element = document.getElementById(elementId);

  if (!element) {
    console.error(`Elemento #${elementId} não encontrado.`);
    return;
  }

  // Alterna a exibição do elemento
  if (element.style.display === "none" || element.style.display === "") {
    element.style.display = "block"; // Mostra o elemento
    button.textContent = closeText; // Atualiza o texto do botão
    button.style.backgroundColor = openColor; // Muda a cor do botão
  } else {
    element.style.display = "none"; // Esconde o elemento
    button.textContent = openText; // Retorna o texto original
    button.style.backgroundColor = closeColor; // Retorna a cor original
  }
}

// Eventos para o Cardápio
document.querySelectorAll(".menu-btn").forEach(button => {
  button.addEventListener("click", function () {
    const menuId = `menu-${encodeURIComponent(this.dataset.name)}`;
    toggleElement(this, menuId, "Ver Cardápio", "Fechar Cardápio", "#ff3333", "#dfa529");
  });
});

// Eventos para o Flyer
document.querySelectorAll(".flyer-btn").forEach(button => {
  button.addEventListener("click", function () {
    const flyerId = `menu-${encodeURIComponent(this.dataset.name)}`;
    toggleElement(this, flyerId, "Ver Flyer", "Fechar Flyer", "#ff3333", "#dfa529");
  });
});

// Eventos para as Informações
document.querySelectorAll(".detalhes-btn").forEach(button => {
  button.addEventListener("click", function () {
    const infoId = `detalhes-${encodeURIComponent(this.dataset.name)}`;
    toggleElement(this, infoId, "+ Informações", "Fechar Informações", "#ff3333", "#007bff");
  });
});

// Eventos para fechar o Cardápio, Flyer e Informações
document.querySelectorAll(".fechar-menu, .fechar-flyer, .fechar-detalhes").forEach(button => {
  button.addEventListener("click", function () {
    this.parentElement.style.display = "none"; // Fecha o elemento pai
  });
});



  }



  // Fim pesquisa nome no menu lateral


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

      // Retrai a sidebar em dispositivos móveis
      if (window.innerWidth < 768) {
        sidebar.classList.add("close");
      }
    });
  });

  // Garantir que ao clicar no "Início", a página recarregue corretamente
  if (homeLink) {
    homeLink.addEventListener("click", function (event) {
      event.preventDefault();
      window.location.href = "index.html"; // Recarrega a página
    });
  }


  ///////////////////////////// fimmmmm 

  // Garante que ao recarregar a página inicial, o banner apareça
  if (window.location.pathname.includes("index.html")) {
    contentArea.classList.remove("hidden"); // Garante que o conteúdo apareça
  }


  // Verifica se é um dispositivo móvel e retrai a sidebar
  if (window.innerWidth < 768) {
    sidebar.classList.add("close", "hoverable");
  }


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
    item.addEventListener("click", (event) => {
      event.stopPropagation(); // Evita que o clique feche a sidebar

      // Verifica se já está aberto
      const isOpen = item.classList.contains("show_submenu");

      // Fecha todos os submenus antes de abrir o atual
      submenuItems.forEach(i => i.classList.remove("show_submenu"));

      // Se não estava aberto, abre novamente
      if (!isOpen) {
        item.classList.add("show_submenu");
      }
    });
  });



  //aaaaaaaaaaaaaaaa bbbb

  // Adicionar eventos para os links do menu
  categories.forEach(category => {
    if (category.link) {  // 🔹 Só adicionamos o evento se o link existir
      category.link.addEventListener("click", function (event) {
        event.preventDefault();
        // Remove a classe ativa de todos os itens
        categories.forEach(cat => cat.link?.classList.remove("active"));
        // Adiciona a classe ativa ao item clicado
        this.classList.add("active");
        // Carrega o conteúdo correspondente
        loadContent(category.title, category.establishments);

        // Expande a sidebar, se estiver fechada
        if (sidebar.classList.contains("close")) {
          sidebar.classList.remove("close");
        }
      });
    }
  });


  document.addEventListener("click", function (event) {
    if (window.innerWidth < 768 &&
      !sidebar.contains(event.target) &&
      event.target !== sidebarOpen &&
      !event.target.closest(".submenu_item") && !event.target.closest(".menu_content") &&
      !event.target.closest(".menu_items")) {
      sidebar.classList.add("close");
    }
  });




});