document.addEventListener("DOMContentLoaded", function () {


  let contadorAnterior = 0;
  const contadorEl = document.getElementById("contador");
  const iconeEl = document.getElementById("iconeUsuarios");
  
  // Cor padrão do ícone ao iniciar
  if (iconeEl) {
    iconeEl.style.color = "#808080";
  }
  
  onlineUsersRef.on("value", (snapshot) => {
    const userCount = snapshot.numChildren();
  
    // Atualiza somente o número visível
    if (contadorEl) {
      contadorEl.textContent = userCount;
    }
  
    // Se aumentou, aplica efeito no ícone
    if (iconeEl && userCount > contadorAnterior) {
      iconeEl.style.color = "red";
      iconeEl.classList.add("pulsando");
  
      setTimeout(() => {
        iconeEl.style.color = "#808080";
        iconeEl.classList.remove("pulsando");
      }, 5000);
    }
  
    contadorAnterior = userCount;


});





/////////







// Função para registrar o acesso diário
function registrarAcesso() {
  const hoje = new Date().toISOString().slice(0, 10);
  const refTotal = firebase.database().ref(`acessosPorDia/${hoje}/total`);
  const refDetalhado = firebase.database().ref(`acessosPorDia/${hoje}/detalhados`).push();

  refTotal.transaction((acessos) => (acessos || 0) + 1);

  function salvarDados(info) {
    refDetalhado.set({
      ip: info.ip || "sem_ip",
      cidade: info.city || "Desconhecida",
      estado: info.region || "UF",
      pais: info.country || "BR",
      provedor: info.provider || "Desconhecido",
      latitude: info.latitude || null,
      longitude: info.longitude || null,
      timezone: info.timezone || "Indefinido",
      horario: new Date().toLocaleTimeString(),
      navegador: navigator.userAgent,
      idioma: navigator.language,
      plataforma: navigator.platform,
      pagina: window.location.href,
      referrer: document.referrer || "acesso direto",
      tela: `${window.screen.width}x${window.screen.height}`,
      dispositivo: /Mobi|Android/i.test(navigator.userAgent) ? "mobile" : "desktop"
    });

    // NOVO: registrar usuário único
    if (info.ip) {
      const refUsuarioUnico = firebase.database().ref(`usuariosUnicos/${hoje}/${info.ip}`);
      refUsuarioUnico.set(true);
    }
  }

  // Tenta com ipwho.is
  fetch("https://ipwho.is/")
    .then((res) => res.json())
    .then((data) => {
      if (!data.success) throw new Error("Falhou no ipwho.is");
      salvarDados({
        ip: data.ip,
        city: data.city,
        region: data.region,
        country: data.country,
        provider: data.connection?.isp,
        latitude: data.latitude,
        longitude: data.longitude,
        timezone: data.timezone
      });
    })
    .catch(() => {
      // Fallback: tenta com ipapi.co
      fetch("https://ipapi.co/json/")
        .then((res) => res.json())
        .then((data) => {
          if (!data.city) throw new Error("Falhou no ipapi.co");
          salvarDados({
            ip: data.ip,
            city: data.city,
            region: data.region,
            country: data.country,
            provider: data.org,
            latitude: data.latitude,
            longitude: data.longitude,
            timezone: data.timezone
          });
        })
        .catch(() => {
          // Segundo fallback: ipinfo.io
          fetch("https://ipinfo.io/json?token=50e0b3cf789df2")
            .then((res) => res.json())
            .then((data) => {
              salvarDados({
                ip: data.ip,
                city: data.city,
                region: data.region,
                country: data.country,
                provider: data.org,
                latitude: data.loc?.split(',')[0],
                longitude: data.loc?.split(',')[1],
                timezone: data.timezone
              });
            })
            .catch((error) => {
              console.warn("Não foi possível obter localização:", error);
              salvarDados({});
            });
        });
    });
}

registrarAcesso();

  
    // pagou? defina por s pago n nao pago // PAGx
    const statusEstabelecimentos = {




      // COMERCIOS:

      //academia
      lobofitness:"s",

      //AÇAI
      turminhadoaçai:"s",

      //Açougue
      açouguecuritiba: "s",

      // ADEGAS
      adegacuenca: "s",
      assao:"s",
  
      //ADVOCACIA
  
      advocaciaabilio: "s",
  
      
      
  
      // Agropecuaria
      agrovida: "s",
      armazemrei:"s",

      //agencia turismo
      cvccarlopolis:"s",

        // assistencia celular
        oficinadocelular:"s",
      




      //confecção
      yellowjeans:"s",
  
      // borracharia
      vidanova: "s",
  // deposito de gas
  liagas:"s",


      //farmacia
      elshaday: "s",
      farmais: "s",
      descontofacil1: "s",
      drogamais: "s",
      masterfarma: "s",
      popularmais: "s",  
      santamaria: "s",
      saudefarma: "s",
      popular: "s",
      biofarma: "s",
      farmaciadavila: "s",

      //ferro velho
      reidoferro:"s",

      //feira da lua
      feiradalua:"s",

      // mercearia
      seiza:"s",

      //mototaxi
      mototaximodesto: "s",

      // padaria
      bomjesus:"s",
      sãofrancisco:"s",
      prelie:"s",
      
  
      //pizzaria
      fornalhapizzaria: "s",
  
      // quitanda
      pimentadoce: "s",
  
      //lanchonete
      ocasarao: "s", // Casarao pagou
      
      ione:"s",
  
      //supermercado
      mercadorocha: "s", // Mercado Rocha pagou
      carreiro: "s", // Carreiro pagou
      comprebemmais:"s",
      obarateiro: "s", // O Barateiro pagou
      kelve: "s", // Kelve não pagou
      rocha: "s", // Rocha pagou
      zerojapan:"s",
  
      // pesqueiro
      peskepagueaguamarine: "s",

      // restaurantes
      assadãodorussão:"s",
      cabanas:"s",
      delfino:"s",
      portal:"s",
      neia:"s",
      paiol: "s", // Paiol pagou
      restaurantedadi:"s",
      sabordaroça:"s",
      selahtgrill:"s",
    
      
      // sorveteria
      limone:"s",
      santtinogelateria:"s",
  
      //// FIM COMERCIO ////////////////////////////////////////////////////////////////////////////////////////
  
      //// INICIO SERVIÇOS ////////////////////////////////////////////////////////////////////////////////////////////////
  
     
  
      //anuncio
      piodoanuncio: "s",

      //barbeiro
      luisbarbeiro:"s",
  
      // churrasqueiro
      flaviochurrasqueiro:"s",
      pituca: "s",

  
      //diarista
      rose: "s",

      //frete
      anselmofrete:"s",
      erickson:"s",
  
      // pedreiro
      deniscenturion: "s",
  
      // guia de pesca
      fabiosushimoto: "s",

      // montador de moveis
      hirancastro:"s",
      
  
      // taxista
      douglasdotaxi: "s",

      // VETERINARIO

      celsogolçalves:"s",
      jurandirmachado:"s",
  
      //// FIM SERVIÇOS
  
      //// INICIO INFORMAÇOES UTEIS
      
  
    
  


      // FIMMMM SERVIÇOSSSSSS

/// INICIO SETOR PUBLICO



/// FIM SETOR PUBLICO
      asilo:"s",
      agenciatrabalhador:"s",
      copel: "s",
      correio:"s",    
      // cheches:
      ainzararossisallescmei:"s",
      isabeldallabdasilvacmeiprofa:"s",
      marinhafogacadeoliveiracmei:"s",
      
      delegacia: "s",
      // escolas

      beneditorodriguesdecamargo:"s",
      cmeiraymundasantanasalles:"s",
      carolinalupion:"s",
      escolamunicipaljosésalles:"s",     
      hercíliadepaulaesilva:"s",
      //posto de saude
      ubseugênionevessoares:"s",
      centrodesaudedrjosé:"s",
     
      
    
      
      hospitalsãojose: "s",
      prefeitura: "s",
      duvidasereclamações: "s",
      sanepar: "s",
      
      rodoviaria:"s",


      //// INICIO INFORMAÇOES UTEIS
  //Eventos
  calendarioeventos: "s",
  lixoeletronico: "s",
  triathlon: "s",
  pescar: "s",
  coletalixoeletronico: "s",
  feiradalua: "s",


      ///

      
    };
  
    const body = document.querySelector("body");
    const darkLight = document.querySelector("#darkLight");
    const sidebar = document.querySelector(".sidebar");
    const contentArea = document.querySelector(".content_area");
    const submenuItems = document.querySelectorAll(".submenu_item");
    const sidebarOpen = document.querySelector("#sidebarOpen");
    const sidebarClose = document.querySelector(".collapse_sidebar");
    const sidebarExpand = document.querySelector(".expand_sidebar");
    const novidades = document.getElementById("novidades");
    const subMenuLinks = document.querySelectorAll(".nav_link.sublink"); // Apenas subitens do menu
    const homeLink = document.querySelector(".nav_link[href='index.html']"); // Link "Início"
    const searchInput = document.getElementById("searchSidebar");
    const overlay = document.querySelector("#overlay");
    const menuLinks = document.querySelectorAll(".sidebar .nav_link"); // Seleciona os itens do menu
    const clearSearch = document.getElementById("clearSearch");
  
    // Função para adicionar contadores de slides
    function addSlideCounters(swiperInstance, containerSelector) {
      const container = document.querySelector(containerSelector);
      if (!container) return;
  
      // Cria o elemento do contador
      const counter = document.createElement("div");
      counter.className = "swiper-counter";
  
      // Atualiza o contador
      function updateCounter() {
        counter.textContent = `${swiperInstance.realIndex + 1} / ${
          swiperInstance.slides.length
        }`;
      }
  
      // Adiciona o contador ao container
      container.appendChild(counter);
  
      // Atualiza inicialmente e adiciona listeners
      updateCounter();
      swiperInstance.on("slideChange", updateCounter);
    }
  
    // Inicializa o carrossel de Turismo
    const swiperTurismo = new Swiper(".swiper-turismo", {
      loop: true, // Permite rolagem infinita
      navigation: {
        nextEl: ".swiper-button-next",
        prevEl: ".swiper-button-prev",
      },
      autoplay: {
        delay: 4000, // Troca de slide a cada 3 segundos
      },
      effect: "fade", // Efeito de fade entre os slides
      fadeEffect: {
        crossFade: true, // Faz o fade suave entre os slides
      },
    });
    addSlideCounters(swiperTurismo, ".swiper-turismo");
  
    // Inicializa o carrossel de Eventos
    const swiperEventos = new Swiper(".swiper-eventos", {
      loop: true, // Permite rolagem infinita
      navigation: {
        nextEl: ".swiper-button-next",
        prevEl: ".swiper-button-prev",
      },
      autoplay: {
        delay: 5000, // Troca de slide a cada 3 segundos
      },
      effect: "fade", // Efeito de fade entre os slides
      fadeEffect: {
        crossFade: true, // Faz o fade suave entre os slides
      },
    });
    addSlideCounters(swiperEventos, ".swiper-eventos");
    ///////////
    // Inicializa o carrossel de Novidades
    const swiperNovidades = new Swiper(".swiper-novidades", {
      loop: true, // Permite rolagem infinita
      navigation: {
        nextEl: ".swiper-button-next",
        prevEl: ".swiper-button-prev",
      },
      autoplay: {
        delay: 6500, // Troca de slide a cada 3 segundos
      },
      effect: "fade", // Efeito de fade entre os slides
      fadeEffect: {
        crossFade: true, // Faz o fade suave entre os slides
      },
    });
    addSlideCounters(swiperNovidades, ".swiper-novidades");
  
   
  
    // Quando clicar no menu, abre a sidebar e ativa o fundo escuro
    sidebarOpen.addEventListener("click", function () {
      sidebar.classList.toggle("open");
      overlay.classList.toggle("active");
    });
  
    // Quando clicar fora do menu, fecha a sidebar
    overlay.addEventListener("click", function () {
      sidebar.classList.remove("open");
      overlay.classList.remove("active");
    });
  
    // Criar um botão "X" para fechar o menu
    const closeButton = document.createElement("button");
    closeButton.innerHTML = "&times;";
    closeButton.classList.add("close-btn");
    closeButton.addEventListener("click", function () {
      sidebar.classList.remove("open");
      overlay.classList.remove("active");
    });
  
    sidebar.appendChild(closeButton);
  
    // Quando um item do menu for clicado, fecha o menu automaticamente
    // Quando um item do menu for clicado, fecha o menu automaticamente
menuLinks.forEach((link) => {
  link.addEventListener("click", function (e) {
    const isParent = this.classList.contains("submenu_item");
    const submenu = this.nextElementSibling;

    if (isParent) {
      e.preventDefault();

      const isOpen = this.classList.contains("show_submenu");

      // Se já estiver aberto, fecha tudo e mostra os grupos principais
      if (isOpen) {
        document.querySelectorAll(".submenu_item").forEach(item => item.classList.remove("show_submenu"));
        document.querySelectorAll(".submenu").forEach(sub => sub.style.display = "none");

        // Restaurar todos os grupos principais
        document.querySelectorAll(".menu_items > li").forEach(item => {
          item.style.display = "block";
        });

        document.querySelectorAll(".menu_title").forEach(title => {
          title.style.display = "block";
        });

        return;
      }

      // Se não estiver aberto, fecha os outros e abre o atual
      document.querySelectorAll(".submenu_item").forEach(item => item.classList.remove("show_submenu"));
      document.querySelectorAll(".submenu").forEach(sub => sub.style.display = "none");

      this.classList.add("show_submenu");
      if (submenu) submenu.style.display = "block";

      return;
    }

    // CATEGORIA COMUM - sem submenu (carrega conteúdo)
    sidebar.classList.remove("open");
    overlay.classList.remove("active");

    document.querySelectorAll(".submenu_item").forEach(item => item.classList.remove("show_submenu"));
    document.querySelectorAll(".submenu").forEach(sub => sub.style.display = "none");

    if (searchInput && clearSearch) {
      searchInput.value = "";
      clearSearch.style.display = "none";
    }

    // Restaurar visual completo
    document.querySelectorAll(".menu_items > li").forEach(item => {
      item.style.display = "block";
      item.querySelectorAll(".nav_link").forEach(link => link.style.display = "flex");
    });

    document.querySelectorAll(".menu_title").forEach(title => {
      title.style.display = "block";
    });
  });
});



    function resetarMenuLateral() {
      // Restaura visual
        document.querySelectorAll(".menu_items > li").forEach(item => {
          item.style.display = "block";
      
          const links = item.querySelectorAll(".nav_link");
          links.forEach(link => {
            link.style.display = "flex";
          });
    
          const submenu = item.querySelector(".submenu");
          if (submenu) submenu.style.display = "none";
        
            const submenuItem = item.querySelector(".submenu_item");
            if (submenuItem) submenuItem.classList.remove("show_submenu");
          });
        
        // Mostra todos os títulos
        document.querySelectorAll(".menu_title").forEach(title => {
          title.style.display = "block";
        });
          



            // Reanexa eventos dos submenus
          document.querySelectorAll(".submenu_item").forEach(item => {
        item.onclick = function () {
          const submenu = this.nextElementSibling;
          const isOpen = this.classList.contains("show_submenu");

          // Fecha todos os outros
        document.querySelectorAll(".submenu_item").forEach(i => i.classList.remove("show_submenu"));
        document.querySelectorAll(".submenu").forEach(s => s.style.display = "none");

          // Se já estiver aberto, recolhe. Se não estiver, expande
          if (!isOpen && submenu) {
            this.classList.add("show_submenu");
            submenu.style.display = "block";
          } else if (isOpen && submenu) {
            this.classList.remove("show_submenu");
            submenu.style.display = "none";
          }
        };
      });


    }
    

    
  


    document.addEventListener("DOMContentLoaded", function () {
      document.getElementById("content_area").classList.remove("hidden");
    });
    if (!searchInput) return; // Evita erro se o campo de busca não existir
  
    function normalizeName(name) {
      return name
        .toLowerCase()
        .replace(/\s*\(.*?\)\s*/g, "")
        .replace(/\s+/g, "");
    }
  
    function sendPaymentReminder(establishment) {
      alert(
        `Atenção! O pagamento do site para ${establishment.name} vence hoje.`
      );
    }












  ///////////////////////////////////////////////
    // Carregar informações de categorias
    const gruposPrincipais = ["comercios", "servicos", "setorPublico", "informacoesUteis"];

    window.dadosSite = {}; // armazenar tudo aqui para consulta posterior
    
    gruposPrincipais.forEach(grupo => {
      firebase.database().ref(grupo).once("value").then(snapshot => {
        const categorias = snapshot.val();
        for (const nomeCategoria in categorias) {
          const estabelecimentos = categorias[nomeCategoria];
    
          // Monta o menu (você pode adaptar para criar submenus, ícones etc.)
          montarMenuLateral(grupo, nomeCategoria);
    
          // Armazena os dados
          window.dadosSite[grupo] = window.dadosSite[grupo] || {};
          window.dadosSite[grupo][nomeCategoria] = estabelecimentos;
        }
      });
    });
    
    function montarMenuLateral(grupo, categoria) {
      const menuContainer = document.querySelector(".menu_items");
    
      const link = document.createElement("a");
      link.href = "#";
      link.classList.add("nav_link", "sublink");
      link.innerHTML = `<span class="navlink_icon"><i class="fas fa-store"></i></span><span class="navlink">${categoria}</span>`;
      link.addEventListener("click", (e) => {
        e.preventDefault();
        mostrarEstabelecimentos(grupo, categoria);
      });
    
      // Opcional: pode agrupar por grupo pai (comercios, serviços...)
      menuContainer.appendChild(link);
    }

    
function mostrarEstabelecimentos(grupo, categoria) {
  const contentArea = document.querySelector(".content_area");
  contentArea.innerHTML = "";

  const dados = window.dadosSite?.[grupo]?.[categoria];
  if (!dados) {
    contentArea.innerHTML = `<h2>${categoria}</h2><p>Nenhum estabelecimento encontrado.</p>`;
    return;
  }

  contentArea.innerHTML = `<h2 class="highlighted">${categoria}</h2><br><ul>`;

  for (const id in dados) {
    const e = dados[id];

    const fullNumber = (e.whatsapp || e.telefone || "").replace(/\D/g, "").replace(/^55?/, "55");

    contentArea.innerHTML += `
      <li id="\${normalizeName(e.nome)}">
        \${e.imagem ? `<img src="\${e.imagem}" alt="\${e.nome}" class="content_image">` : ""}
        <strong class="locais_nomes">\${e.nome}</strong><br>
        <div class="info-boxes-container">

          \${e.plantaoHorario ? `
            <div class="card-plantao detalhe-esquerda">
              <div class="conteudo-plantao">
                <div class="titulo-plantao">
                  <i class="fas fa-clinic-medical"></i> Plantão
                </div>
                <p><strong><i class="fas fa-clock"></i> Horário:</strong> \${e.plantaoHorario}</p>
                \${e.plantaoData ? `<p><strong><i class="fas fa-calendar-alt"></i> Data:</strong> \${e.plantaoData}</p>` : ""}
              </div>
            </div>
          ` : ""}

          \${e.horario ? `
            <div class="info-box">
              <i class="fas fa-clock info-icon"></i>
              <div>
                <div class="info-label">Funcionamento</div>
                <div class="info-value">\${e.horario}</div>
              </div>
            </div>` : ""}

          \${e.endereco ? `
            <div class="info-box">
              <a href="https://www.google.com/maps/search/?api=1&query=\${encodeURIComponent(e.endereco.replace(/<br>/g, ' '))}" target="_blank">
                <i class='bx bx-map info-icon' style="color: #f44336;font-size:26px;"></i>
              </a>
              <div>
                <div class="info-label">Endereço</div>
                <div class="info-value">\${e.endereco}</div>
              </div>
            </div>` : ""}

          \${e.telefone ? `
            <div class="info-box">
              <a href="https://api.whatsapp.com/send?phone=\${fullNumber}" target="_blank">
                <i class='bx bxl-whatsapp info-icon' style="color: #25D366;font-size:26px;"></i>
              </a>
              <div>
                <div class="info-label">Contato</div>
                <div class="info-value">\${e.telefone}</div>
              </div>
            </div>` : ""}

          \${e.delivery ? `
            <div class="info-box">
              <i class="fas fa-truck info-icon"></i>
              <div>
                <div class="info-label">Entrega</div>
                <div class="info-value">\${e.delivery}</div>
              </div>
            </div>` : ""}

          \${e.taxaEntrega ? `
            <div class="info-box">
              <i class="fas fa-money-bill-wave info-icon"></i>
              <div>
                <div class="info-label">Taxa de Entrega</div>
                <div class="info-value">\${e.taxaEntrega === 'sim' ? 'Possui taxa' : 'Sem taxa'}</div>
              </div>
            </div>` : ""}

          \${e.vagaTrabalho ? `
            <div class="info-box vaga">
              <i class="fas fa-briefcase info-icon"></i>
              <div>
                <div class="info-label">Vaga de Trabalho</div>
                <div class="info-value">\${e.vagaTrabalho}</div>
              </div>
            </div>` : ""}

          \${e.infoAdicional ? `
            <div class="info-box">
              <i class="fas fa-circle-info info-icon"></i>
              <div>
                <div class="info-label">Informações Adicionais</div>
                <div class="info-value">\${e.infoAdicional}</div>
              </div>
            </div>` : ""}

          \${(e.instagram || e.facebook || e.site) ? `
            <div class="info-box">
              <i class="fas fa-share-alt info-icon"></i>
              <div>
                <div class="info-label">Redes Sociais</div>
                <div class="social-icons">
                  \${e.facebook ? `<a href="\${e.facebook}" target="_blank"><i class="fab fa-facebook"></i> Facebook</a>` : ""}
                  \${e.instagram ? `<a href="\${e.instagram}" target="_blank"><i class="fab fa-instagram"></i> Instagram</a>` : ""}
                  \${e.site ? `<a href="\${e.site}" target="_blank"><i class="fas fa-globe"></i> Site</a>` : ""}
                </div>
              </div>
            </div>` : ""}

        </div>
        <div class="separador_categorias"></div>
      </li>
    `;
  }

  contentArea.innerHTML += `</ul>`;
}

    




    
    
//////////////////////////////














    
  
  
    searchInput.addEventListener("input", function () {
      const filter = searchInput.value.toLowerCase().trim();
      const allItems = document.querySelectorAll(".menu_items .item");
    
      allItems.forEach((item) => {
        const navLinks = item.querySelectorAll(".nav_link");
        let showItem = false;
    
        navLinks.forEach((link) => {
          const text = link.textContent.toLowerCase();
          if (filter === "" || text.includes(filter)) {
            link.style.display = "flex";
            showItem = true;
          } else {
            link.style.display = "none";
          }
        });
    
        const submenu = item.querySelector(".submenu");
        const submenuItem = item.querySelector(".submenu_item");
    
        // Exibe ou oculta item pai com base nos filhos visíveis
        if (submenu) {
          const visibleSublinks = item.querySelectorAll(".sublink");
          const hasVisible = Array.from(visibleSublinks).some(
            (sublink) => sublink.style.display !== "none"
          );
    
          submenu.style.display = hasVisible ? "block" : "none";
          if (submenuItem) {
            submenuItem.classList.toggle("show_submenu", hasVisible);
          }
    
          item.style.display = hasVisible ? "block" : "none";
        } else {
          item.style.display = showItem ? "block" : "none";
        }
      });
    });
    
    
     

    if (searchInput && clearSearch) {
      searchInput.addEventListener("input", function () {
        clearSearch.style.display = searchInput.value.length > 0 ? "block" : "none";
      });
    


      clearSearch.addEventListener("click", function() {
  searchInput.value = "";
  clearSearch.style.display = "none";
    restaurarMenuOriginal(); // <- volta ao estado padrão
  
  // Mostrar todos os itens e resetar o estado
  const allItems = document.querySelectorAll(".menu_items > li");
  allItems.forEach(item => {
    item.style.display = "block";
    
    const links = item.querySelectorAll(".nav_link");
    links.forEach(link => {
      link.style.display = "flex";
    });
    
    // Resetar submenus
    const submenu = item.querySelector(".submenu");
    if (submenu) {
      submenu.style.display = "none";
    }
    
    const submenuItem = item.querySelector(".submenu_item");
    if (submenuItem) {
      submenuItem.classList.remove("show_submenu");
    }
  });
  
  // Mostrar todos os títulos
  document.querySelectorAll(".menu_title").forEach(title => {
    title.style.display = "block";
  });
  resetarMenuLateral();
});


    // Função para restaurar o menu ao estado original
function restaurarMenuOriginal() {
  document.querySelectorAll(".item").forEach((item) => {
    item.style.display = "block";
  });
  document.querySelectorAll(".submenu_item").forEach(item => {
    item.classList.remove("show_submenu");
  });
  document.querySelectorAll(".submenu").forEach(sub => {
    sub.style.display = "none";
  });
}

      
      
    }
    
  
    // Função para carregar conteúdo
    function loadContent(title, establishments) {
      const paidEstablishments = establishments.filter((establishment) => {
        const key = normalizeName(establishment.name);
        return statusEstabelecimentos[key] === "s";
      });
  
      /*  contentArea.classList.remove("hidden");*/
      const contentArea = document.querySelector(".content_area");
      if (!contentArea) return;
  
      if (paidEstablishments.length === 0) {
        contentArea.innerHTML = `<h2 class="highlighted">${title}</h2><p>Nenhum estabelecimento se cadastrou ainda.</p>`;
        return;
      }
  
      contentArea.innerHTML = `<h2 class="highlighted">${title}</h2><br><ul>
      

      
          
            ${paidEstablishments
              .map(
                (establishment) => `
     <li  id="${normalizeName(establishment.name)}">  
     
       <!-- Exibe a imagem do estabelecimento, se existir -->
      ${
        establishment.image
          ? `
           <img id="imagem-${normalizeName(establishment.name)}" src="${establishment.image}" title="${establishment.name}"  alt="Imagem de ${establishment.name}">


          `
          : ""
      }
  
     
     <strong class="locais_nomes">${establishment.name}</strong><br>
  
 
  
      
${
  establishment.plantaoHorario
    ? `
    <div class="card-plantao detalhe-esquerda">
      <div class="conteudo-plantao">
        <div class="titulo-plantao">
          <i class="fas fa-clinic-medical"></i> Plantão
        </div>
        <p><strong><i class="fas fa-clock"></i> Horário:</strong> ${establishment.plantaoHorario}</p>
        ${establishment.plantaoData ? `<p><strong><i class="fas fa-calendar-alt"></i> Data:</strong> ${establishment.plantaoData}</p>` : ""}
      </div>
    </div>
    `
    : ""
}




<div class="info-boxes-container">


 ${establishment.date ? `
    <div class="info-box">
      <i class="fas fa-calendar-alt info-icon"></i>
      <div>
        <div class="info-label">Data do Evento</div>
        <div class="info-value">${establishment.date}</div>
      </div>
    </div>` : ""
  }






  ${establishment.hours ? `
    <div class="info-box">
      <i class="fas fa-clock info-icon"></i>
      <div>
        <div class="info-label">Funcionamento</div>
        <div class="info-value">${establishment.hours}</div>
      </div>
    </div>` : ""
  }

 ${establishment.address ? `
  <div class="info-box">
    <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(establishment.address.replace(/<br>/g, " "))}" 
       target="_blank">
      <i class='bx bx-map info-icon' style="color: #f44336;font-size:26px;"></i>
    </a>
    <div>
      <div class="info-label">Endereço</div>
      <div class="info-value">${establishment.address}</div>
    </div>
  </div>
` : ""}


${establishment.contact ? (() => {
  const rawNumber = (establishment.whatsapp || establishment.contact || "").replace(/\D/g, "");
  const fullNumber = rawNumber.startsWith("55") ? rawNumber : `55${rawNumber}`;
  return `
    <div class="info-box">
      <a href="https://api.whatsapp.com/send?phone=${fullNumber}&text=${encodeURIComponent(
        "Olá! Encontrei seu número no Site Olá Carlópolis e gostaria de uma informação!"
      )}" target="_blank">
        <i class='bx bxl-whatsapp info-icon' style="color: #25D366;font-size:26px;"></i>
      </a>
      <div>
        <div class="info-label">Contato</div>
        <div class="info-value">${establishment.contact}</div>
      </div>
    </div>
  `;
})() : ""}


  ${establishment.delivery ? `
    <div class="info-box">
      <i class="fas fa-truck info-icon"></i>
      <div>
        <div class="info-label">Entrega</div>
        <div class="info-value">${establishment.delivery}</div>
      </div>
    </div>` : ""
  }

  ${establishment.taxaEntrega ? `
    <div class="info-box">
      <i class="fas fa-money-bill-wave info-icon"></i>
      <div>
        <div class="info-label">Taxa de Entrega</div>
        <div class="info-value">${establishment.taxaEntrega === 'sim' ? 'Possui taxa' : 'Sem taxa'}</div>
      </div>
    </div>` : ""
  }

  ${establishment.infoVagaTrabalho ? `
    <div class="info-box vaga">
      <i class="fas fa-briefcase info-icon"></i>
      <div>
        <div class="info-label">Vaga de Trabalho</div>
        <div class="info-value">${establishment.infoVagaTrabalho}</div>
      </div>
    </div>` : ""
  }

  ${establishment.infoAdicional ? `
    <div class="info-box">
      <i class="fas fa-circle-info info-icon"></i>
      <div>
        <div class="info-label">Informações Adicionais</div>
        <div class="info-value">${establishment.infoAdicional}</div>
      </div>
    </div>` : ""
  }

 

  ${(establishment.instagram || establishment.facebook || establishment.site) ? `
    <div class="info-box">
    
      <i class="fas fa-share-alt info-icon"></i>
      <div>
        <div class="info-label">Redes Sociais</div>
        <div class="social-icons">
        ${establishment.facebook ? `<a href="${establishment.facebook}" target="_blank"><i class="fab fa-facebook" style="color: #1877F2; font-size: 16px;"></i> Facebook</a>` : ""}
          ${establishment.instagram ? `<a href="${establishment.instagram}" target="_blank"><i class="fab fa-instagram" style="color: #C13584; font-size: 16px;"></i> Instagram</a>` : ""}          
          ${establishment.site ? `<a href="${establishment.site}" target="_blank"><i class="fas fa-globe" style="color: #4caf50; font-size: 16px;"></i> Site</a>` : ""}
        </div>
      </div>
    </div>` : ""
  }
</div>

   
      <br>
  

  <div class="button-container">
          ${establishment.novidadesImages && establishment.novidadesImages.length > 0 ? `
            <button id="novidadesButton" class="novidades-btn" data-name="${establishment.name}" data-id="${normalizeName(establishment.name)}">
              Divulgação (${establishment.novidadesImages.length})
            </button>
          ` : ''}
          
          ${establishment.menuImages && establishment.menuImages.length > 0 ? `
            <button  id="cardapioButton" class="menu-btn" data-name="${establishment.name}" data-id="${normalizeName(establishment.name)}">
              Cardápio (${establishment.menuImages.length})
            </button>
          ` : ''}
        </div>
        
      
            ${establishment.novidadesImages && establishment.novidadesImages.length > 0 ? `
                <div class="novidades-container swiper" id="novidades-${encodeURIComponent(establishment.name)}">
                    <div class="swiper-wrapper">
                       ${establishment.novidadesImages.map((img, index) => `
  <div class="swiper-slide">
    <img src="${img}" alt="Novidades ${index + 1} de ${establishment.name}">
    ${establishment.novidadesDescriptions && establishment.novidadesDescriptions[index] ? `
      <p class="novidade-descricao">${establishment.novidadesDescriptions[index]}</p>
    ` : ""}
  </div>
`).join('')}

                    </div>

                    <div class="swiper-button-next"></div>
                    <div class="swiper-button-prev"></div>
                    <div class="swiper-pagination"></div>
                 
                </div>
                 ` : ''}
          
           ${establishment.menuImages && establishment.menuImages.length > 0 ? `
                <div class="menu-cardapio swiper" id="menu-${encodeURIComponent(establishment.name)}">
                    <div class="swiper-wrapper">
                        ${establishment.menuImages.map((img, index) => `
                        <div class="swiper-slide">
                            <img src="${img}" alt="Cardápio ${index + 1} de ${establishment.name}">
                        </div>
                        `).join('')}
                    </div>
                    <div class="swiper-button-next"></div>
                    <div class="swiper-button-prev"></div>
                    <div class="swiper-pagination"></div>
                      
                </div>
                 ` : ''}
       
         <div class="separador_categorias"></div> <!-- Separador visual entre os itens -->
     
      </li>
    `).join('')}
  </ul>
    `;
  


    function criarInfoCards(establishment) {
      const wrapper = document.createElement("div");
    
      const infos = [
        {
          icon: "fa-clock",
          label: "Horário",
          valor: establishment.hours?.replace(/<br>/g, " | ") || "Não informado",
        },
        {
          icon: "fa-map-marker-alt",
          label: "Endereço",
          valor: establishment.address?.replace(/<br>/g, "") || "Não informado",
        },
        {
          icon: "fa-phone",
          label: "Contato",
          valor: establishment.contact || establishment.whatsapp || "Não informado",
        },
        {
          icon: "fa-truck",
          label: "Entrega",
          valor: establishment.delivery || "Não informado",
        },
      ];
    
      infos.forEach(({ icon, label, valor }) => {
        const card = document.createElement("div");
        card.className = "info-card";
        card.innerHTML = `
          <i class="fas ${icon}"></i>
          <div class="info-card-text">
            <span class="info-card-label">${label}</span>
            <span class="info-card-value">${valor}</span>
          </div>
        `;
        wrapper.appendChild(card);
      });
    
      return wrapper;
    }
    
      


      let lastClickedButton = null;
    // Função para alternar entre cardápio e novidades
    function toggleContent(button, contentId, otherButtons) {
    const content = document.getElementById(contentId);
    const isActive = button.classList.contains('active');
   
    // Fecha todos os conteúdos primeiro
    closeAllContents();
  
    if (!isActive) {
      // Abre o conteúdo clicado
      button.classList.add('active');
      content.classList.add('visible');
      content.style.display = 'block';

// NOVO scroll até o separador dentro do item clicado
setTimeout(() => {
  const targetId = button.dataset.id;
  const liEstabelecimento = document.getElementById(targetId);
  if (liEstabelecimento) {
    const separador = liEstabelecimento.querySelector(".separador_categorias");
    if (separador) {
      const separadorTop = separador.getBoundingClientRect().top + window.pageYOffset;
      const scrollToY = separadorTop - (window.innerHeight - separador.offsetHeight);
      window.scrollTo({ top: scrollToY, behavior: "smooth" });
    }
  }
}, 100);
      
      // Inicializa o Swiper se necessário
      if (content.classList.contains('swiper') && !content.swiperInstance) {
        content.swiperInstance = new Swiper(content, {
          loop: true,
          navigation: {
            nextEl: content.querySelector('.swiper-button-next'),
            prevEl: content.querySelector('.swiper-button-prev'),
          },
          pagination: {
            el: content.querySelector('.swiper-pagination'),
            clickable: true,
          },
        });
      }
    }
  }
  

  
  // Função para fechar todos os conteúdos
  function closeAllContents() {
    document.querySelectorAll('.menu-cardapio, .novidades-container').forEach(content => {
      content.style.display = 'none';
      content.classList.remove('visible');
      
      // Destrói a instância do Swiper para liberar memória
      if (content.swiperInstance) {
        content.swiperInstance.destroy(true, true);
        content.swiperInstance = null;
      }
    });
  
    // Remove a classe active de todos os botões
    document.querySelectorAll('.menu-btn, .novidades-btn').forEach(btn => {
      btn.classList.remove('active');
      if (btn.classList.contains('menu-btn')) {
        btn.style.backgroundColor = '#dfa529';
      } else if (btn.classList.contains('novidades-btn')) {
        btn.style.backgroundColor = '#3726d1';
      }
    });
  }
  
  // Eventos para os botões de Novidades
  document.querySelectorAll('.novidades-btn').forEach(button => {
    button.addEventListener('click', function() {
      const contentId = `novidades-${encodeURIComponent(this.dataset.name)}`;
      lastClickedButton = this; // <-- Salva o botão clicado
      toggleContent(this, contentId);
    });
  });
  
  // Eventos para os botões de Cardápio
  document.querySelectorAll('.menu-btn').forEach(button => {
    button.addEventListener('click', function() {
      const contentId = `menu-${encodeURIComponent(this.dataset.name)}`;
      lastClickedButton = this; // <-- Salva o botão clicado
      toggleContent(this, contentId);
    });
  });
  
      // Inicializa todos os carrosséis visíveis quando a página carrega
      document
        .querySelectorAll(".menu-cardapio, .novidades-container")
        .forEach((container) => {
          if (window.getComputedStyle(container).display !== "none") {
            container.swiperInstance = new Swiper(container, {
              loop: true,
              navigation: {
                nextEl: container.querySelector(".swiper-button-next"),
                prevEl: container.querySelector(".swiper-button-prev"),
              },
              pagination: {
                el: container.querySelector(".swiper-pagination"),
                clickable: true,
              },
            });
          }
        });
  
  

      
  
      // Eventos para fechar o Cardápio, 
      document
        .querySelectorAll(
          ".fechar-menu, .fechar-novidades"
        )
        .forEach((button) => {
          button.addEventListener("click", function () {
            closeAllContents(); // Fecha todos os conteúdos

        // Rola de volta para o estabelecimento
        if (lastClickedButton) {
          const targetId = lastClickedButton.getAttribute("data-id");
          const liEstabelecimento = document.getElementById(targetId);
          if (liEstabelecimento) {
            const y = liEstabelecimento.getBoundingClientRect().top + window.pageYOffset - 20;
            window.scrollTo({ top: y, behavior: "smooth" });
          }
        }


          });
        });

    }
  
    
  
  
  
    // Função para esconder o novidades e mostrar o conteúdo
    function mostrarConteudo() {
      if (novidades) {
        novidades.classList.add("hidden"); // Esconde o novidades
      }
      if (contentArea) {
        contentArea.classList.remove("hidden"); // Mostra a área de conteúdo
      }
    }
  
    // Adiciona evento SOMENTE aos subitens do menu
    subMenuLinks.forEach((link) => {
      link.addEventListener("click", function (event) {
        event.preventDefault(); // Evita recarregar a página
        mostrarConteudo(); // Esconde o novidades e mostra o conteúdo
  
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
  
    // Garante que ao recarregar a página inicial, o novidades apareça
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
  
    
  
    // Adicionar eventos para os links do menu
    categories.forEach((category) => {
      if (category.link) {
        // 🔹 Só adicionamos o evento se o link existir
        category.link.addEventListener("click", function (event) {
          event.preventDefault();
          // Remove a classe ativa de todos os itens
          categories.forEach((cat) => cat.link?.classList.remove("active"));
          // Adiciona a classe ativa ao item clicado
          this.classList.add("active");
          // Carrega o conteúdo correspondente
       


          carregarComerciosPorCategoria(normalizeName(category.title));


          // Expande a sidebar, se estiver fechada
          if (sidebar.classList.contains("close")) {
            sidebar.classList.remove("close");
          }
        });
      }
    });
  
   
    
    
    
    
    
    ///// FIM AREA DE PAGAMENTO
  
    document.addEventListener("click", function (event) {
      if (
        window.innerWidth < 768 &&
        !sidebar.contains(event.target) &&
        event.target !== sidebarOpen &&
        !event.target.closest(".submenu_item") &&
        !event.target.closest(".menu_content") &&
        !event.target.closest(".menu_items")
      ) {
        sidebar.classList.add("close");
      }
    });






    function carregarComerciosPorCategoria(categoria) {
      const ref = firebase.database().ref(`comercios/${categoria}`);
      ref.once("value").then(snapshot => {
        const dados = snapshot.val();
        console.log("DADOS CARREGADOS:", dados);
    
        if (!dados) {
          document.getElementById("conteudo").innerHTML = "<p>Nenhum comércio encontrado.</p>";
          return;
        }
    
        let html = "";
        for (let chave in dados) {
          const item = dados[chave];
          html += `
            <div class="novidade-item">
              <div class="img-container">
                ${item.imagem ? `<img src="${item.imagem}" class="content_image">` : ""}
              </div>
    
              <h2 class="locais_nomes">${item.nome || "Nome não informado"}</h2>
    
              <div class="novidade-description">
                ${item.endereco ? `<p><b>Endereço:</b> ${item.endereco}</p>` : ""}
                ${item.telefone ? `<p><b>Telefone:</b> ${item.telefone}</p>` : ""}
                ${item.horario ? `<p><b>Horário:</b> ${item.horario}</p>` : ""}
                ${item.entrega ? `<p><b>Entrega:</b> ${item.entrega}</p>` : ""}
                ${item.infoAdicional ? `<p><b>Info:</b> ${item.infoAdicional}</p>` : ""}
                ${item.instagram ? `<p><a href="${item.instagram}" target="_blank">Instagram</a></p>` : ""}
                ${item.facebook ? `<p><a href="${item.facebook}" target="_blank">Facebook</a></p>` : ""}
              </div>
    
              <div class="botoesToggle">
                ${item.novidades ? `<button class="btnNovidades">Novidades</button>` : ""}
                ${item.cardapio ? `<button class="btnCardapio">Cardápio</button>` : ""}
              </div>
    
              ${item.novidades ? `
                <div class="novidadesContent" style="display:none;">
                  ${item.novidades.map((src, i) => `
                    <div class="img-container">
                      <img src="${src}" class="novidade-image">
                      ${item.descricaoNovidades && item.descricaoNovidades[i] ? `<p class="image-description">${item.descricaoNovidades[i]}</p>` : ""}
                    </div>
                  `).join("")}
                </div>
              ` : ""}
    
              ${item.cardapio ? `
                <div class="cardapioContent" style="display:none;">
                  ${item.cardapio.map(src => `
                    <div class="img-container">
                      <img src="${src}" class="novidade-image">
                    </div>
                  `).join("")}
                </div>
              ` : ""}
            </div>
          `;
        }
    
        document.getElementById("conteudo").innerHTML = `<div class="container">${html}</div>`;
    
        // Reativar botões dinamicamente
        setTimeout(() => {
          document.querySelectorAll(".btnNovidades").forEach(btn => {
            btn.addEventListener("click", function () {
              const content = this.closest(".novidade-item").querySelector(".novidadesContent");
              content.style.display = content.style.display === "none" ? "block" : "none";
            });
          });
    
          document.querySelectorAll(".btnCardapio").forEach(btn => {
            btn.addEventListener("click", function () {
              const content = this.closest(".novidade-item").querySelector(".cardapioContent");
              content.style.display = content.style.display === "none" ? "block" : "none";
            });
          });
        }, 100);
      });
    }
    
    
    


  document.addEventListener("DOMContentLoaded", function () {
    const links = document.querySelectorAll(".nav_link[data-categoria]");
    links.forEach(link => {
      link.addEventListener("click", function () {
        const categoria = this.getAttribute("data-categoria");
        registrarClique(categoria); // 👈 adicione aqui
        carregarComerciosPorCategoria(categoria);
      });
    });
  });

  
  


    
  });
  
  function registrarClique(categoria) {
    const dataAtual = new Date();
    const anoMesDia = dataAtual.toISOString().slice(0, 10); // ex: 2025-04-22
    const horario = dataAtual.toLocaleTimeString("pt-BR");
  
    const refTotal = firebase.database().ref(`cliquesPorMenu/${anoMesDia}/${categoria}/total`);
    const refDetalhado = firebase.database().ref(`cliquesPorMenu/${anoMesDia}/${categoria}/horarios`).push();
  
    // Incrementa o total
    refTotal.transaction((atual) => (atual || 0) + 1);
  
    // Registra horário individual
    refDetalhado.set(horario);
  }