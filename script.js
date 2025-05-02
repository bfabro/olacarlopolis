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
      const ipTratado = info.ip.replace(/\./g, "-");  // Substitui os pontos por hífens
      const refUsuarioUnico = firebase.database().ref(`usuariosUnicos/${hoje}/${ipTratado}`);
      refUsuarioUnico.set(true)
        .then(() => {
          console.log("Usuário único registrado:", ipTratado); // Log para confirmar
        })
        .catch(error => {
          console.error("Erro ao registrar IP no Firebase:", error);
        });
      
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
      
// auto peças
paulinhoautopeças:"s",

      //confecção
      yellowjeans:"s",
  
      // borracharia
      vidanova: "s",
  // deposito de gas
  liagas:"s",
  cncasadogas:"s",

// clinica veterinaria

clínicaveterináriacarlópolis:"s",

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

      //moveis
      movepar:"s",

      //mototaxi
      mototaximodesto: "s",

      //motocenter
      binhomotocenter:"s",

      // padaria
      bomjesus:"s",
      sãofrancisco:"s",
      prelie:"s",      
  
      //pizzaria
      fornalhapizzaria: "s",
      tonnypizzaria:"s",
  
      // quitanda
      pimentadoce: "s",
  
      //lanchonete
      ocasarao: "s", // Casarao pagou      
      ione:"s",
      cantinhodapraça:"s",
      caldodecanaamaral:"s",
      kidog:"s",
      didog:"s",
      xisbauinea:"s",
      mycoffe:"s",
  
      //supermercado
      bompreço:"s",
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
      cantinaitaliana:"s",
      delfino:"s",
      portal:"s",
      neia:"s",
      churrascoegastronomiapaiol: "s", // Paiol pagou
      restaurantedadi:"s",
      sabordaroça:"s",
      selahtgrill:"s",
      yingyang:"s",
    
      
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



      agendamento:"s",
      asilo:"s",
      agenciatrabalhador:"s",
      copel: "s",
      correio:"s",    
      cras:"s",
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
      samuzinho:"s",
      
      rodoviaria:"s",
      secretariadasaude:"s",
      
      vigilanciasanitaria:"s",
/// FIM SETOR PUBLICO

      //// INICIO INFORMAÇOES UTEIS
  //Eventos
  calendarioeventos: "s",

  triathlon: "s",
  pescar: "s",
  coletalixoeletronico: "s",
  feiradalua: "s",
  frutfest:"s",

  etapalestevelocross:"s",

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
  
    // Carregar informações de categorias
    const categories = 
    [
// DADOS COMERCIOS
      {
        link: document.querySelector("#menuAcademia"),  
        title: "Academia",
        establishments: [
            {
                image: "images/comercios/academia/lobofitness/lobofitness.png",
                        
                name: "Lobo Fitness",
                hours: "Seg a Qui: 06h a 13h - 15h a 21h <br> Sex: 06h a 13h - 15h a 20:30h<br> Sab: 15h - 18h <br>Dom: Fechado ",
                address: "R. Delfino Mendes, 264 - Centro",
                contact: "(43) 99112-1009",                          
                facebook: "#",
                instagram: "https://www.instagram.com/academialobocarlopolis/",
                novidadesImages: [ 
                "images/comercios/academia/lobofitness/divulgacao/1.png",
                "images/comercios/academia/lobofitness/divulgacao/2.png",
                ],
                novidadesDescriptions: [                            
                  "Venham Conferir nosso espaço",
                ],
            },
        ],
      },


                {
                    link: document.querySelector("#menuAcai"),    
                    title: "Açai",
                    establishments: [
                        {
                            image: "images/comercios/acai/turminhaAcai/turminhaAcai.png",
                            name: "Turminha do Açai",
                            hours: "Qua a Seg: 14h - 23h <br> Ter: Fechado",
                            address: "Rua Benedito Salles, 409",
                            contact: "(43) 99176-7871",
                            delivery: "Sim / Com Taxa",
                            instagram: "https://www.instagram.com/turminha_do_acai/",
                            facebook:"#",
                            site:"#",
                            infoAdicional:"Espetinhos de Quinta a Sabado",
                            novidadesImages: [            
                            "images/comercios/acai/turminhaAcai/novidades/1.png",                                            
                            ],
                            novidadesDescriptions: [                            
                            "Marmita de Açai! Voce só encontra aqui!",
                          ],
                            menuImages: [                    
                                "images/comercios/acai/turminhaAcai/cardapio/1.png",
                                "images/comercios/acai/turminhaAcai/cardapio/2.png",
                                "images/comercios/acai/turminhaAcai/cardapio/3.png",
                            ],
                        
                        },
                    ],
                },

               

                {
                    link: document.querySelector("#menuAcougue"),  
                    title: "Açougues",
                    establishments: [
                        {
                            image: "images/comercios/acougue/curitiba/curitiba.png",
                            name: "Açougue Curitiba",
                            hours: "seg a sex: 8h - 18h </br> sab: 08 - 12h",
                            address: "Rua Benedito Salles, 409",
                            contact: "(43) 99635-1001",
                            delivery: "Sim / Sem Taxa",
                            novidadesImages: [ 
                            "images/comercios/acougue/curitiba/banner/banner_1.jpg",
                            "images/comercios/acougue/curitiba/banner/banner_2.jpg",
                            ],
                            novidadesDescriptions: [                            
                              "Carnes de primeiras!",
                            ],
                        },
                    ],
                },

                {
                    link: document.querySelector("#menuAdega"),    
                    title: "Adegas",
                    establishments: [
                        {
                            image: "images/comercios/adega/cuenca/adega_cuenca.jpg",
                            name: "Adega Cuenca",
                            hours:
                            "seg 09:00h - 19:30h </br> ter e qua 09:00 - 22:00h </br> qui a sab 09:00 - 23:50 </br> dom 09:00 - 22:00h",
                            address: "R. Kalil Keder, 752",
                            contact: "(43) 99800-1680",
                            delivery: "Sim / Sem Taxa",
                            instagram: "#",
                            facebook:"https://www.facebook.com/adega.carlopolis.37/",

                            novidadesImages: [ 
                              "images/comercios/adega/cuenca/divulgacao/1.png",
                              "images/comercios/adega/cuenca/divulgacao/2.png",
                              "images/comercios/adega/cuenca/divulgacao/3.png",
                              "images/comercios/adega/cuenca/divulgacao/4.png",
                              "images/comercios/adega/cuenca/divulgacao/5.png",
                              ],
                              novidadesDescriptions: [                            
                                "Chop Brahma encontra aqui!",
                                "Chop HASS encontra aqui!",
                              ],
                              
                        },

                        {
                          image: "images/comercios/adega/assao/assao.png",
                          name: "Assao",
                          hours:"seg 09:00h - 22h ",
                          address: "R. Benedito Sales, 1551",
                          contact: "-",                          
                          instagram: "https://www.instagram.com/casadecarneassao/",                     

                         
                            
                      },
                    ],
                },

                {
                  link: document.querySelector("#menuAdvocacia"),    
                  title: "Escritorio de Advocacia",
                  establishments: [
                      {
                          name: "ADVOCACIA ABILIO",
                          hours: "seg a sex: 9h - 11:30h, 13:00-17:00",
                          address: "R. Salvira Marquês, 315",
                          contact: "(43) 3566-1368",
                      },
                  ],
              },

              {
                link: document.querySelector("#menuAgenciaViagem"),    
                title: "Agencia de Viagem",
                establishments: [
                    {
                      image: "images/comercios/agenciaViagem/cvc/cvc.png",
                        name: "CVC Carlopolis",
                        hours: "Seg a Sab: 11h - 22h",
                        address: "Rua Padre Hugo, 450, Sala 10",
                        contact: "(43) 99177-2244",
                        instagram:"https://www.instagram.com/cvc.pr.carlopolis/",
                        facebook:"https://www.facebook.com/CVC.PR.Carlopolis?mibextid=LQQJ4d",
                    },
                ],
            },



                {
                    link: document.querySelector("#menuAgropecuaria"),  
                    title: "Agropecuarias",
                    establishments: [

                       
                        {
                            image: "images/comercios/agropecuaria/agroVida/agrovida.png",
                            name: "Agro Vida",
                            hours: "Seg a Sex: 8h - 18h </br> Sab: 08H - 16h",
                            address: "rua benedito salles 309",
                            contact: "(43) 99158-9047",
                            delivery: "Sim / Sem Taxa",
                            facebook: "https://www.facebook.com/AgroVidaCarlopolis/?locale=pt_BR",
                            instagram: "https://www.instagram.com/agrovida_carlopolis/",
                            novidadesImages: [
                    
                              "images/comercios/agropecuaria/agroVida/divulgacao/2.png",
                              "images/comercios/agropecuaria/agroVida/divulgacao/1.png",
                          ],
                          novidadesDescriptions: [  
                            "Temos sacos de milho 40kg",                          
                            "Special Dog no Precinho",
                           
                          ],
                        },

                        
                    ],
                },


                {
                  link: document.querySelector("#menuAssistenciaCelular"),    
                  title: "Assistencia Celular",
                  establishments: [
                      {
                          image: "images/comercios/assistenciaCelular/oficinaCelular/oficinaCelular.png",
                          name: "Oficina do Celular",
                          hours: "Seg a Sex: 8h - 18:00h<br> Sab: 08:00-17:00",
                          address: "Rua Dr Paula e Silva 676",
                          contact: "(43) 3566-1600",
                          facebook: "https://www.facebook.com/oficinadocelularclps/",
                          instagram: "https://www.instagram.com/oficinadocelular_carlopolis/",
                          novidadesImages: [                  
                            "images/comercios/assistenciaCelular/oficinaCelular/divulgacao/2.png",
                            "images/comercios/assistenciaCelular/oficinaCelular/divulgacao/1.png"
                        ],
                        novidadesDescriptions: [  
                          "Fazemos sua capinha!",                          
                          "Temos Assistencia Tecnica!"
                         
                        ],
                      },
                  ],
                },




                {
                  link: document.querySelector("#menuAutoPecas"),
                  title: "Auto Peças",
                  establishments: [
                      {
                          image: "images/comercios/autopecas/paulinho/perfil.png",
                                 
                          name: "Paulinho auto peças",
                          hours: "Seg a Sex - 07:00 - 18:00<br> Sab: 07:00 a 12:00",
                          address: "R. Paul Harris, 98 - Centro, Carlópolis",
                          contact: "(43) 3566-1306",                         
                          instagram: "https://www.instagram.com/autopecas_paulinho/",
                          novidadesImages: [                 
                            
                            "images/comercios/autopecas/paulinho/divulgacao/1.png",
                            "images/comercios/autopecas/paulinho/divulgacao/2.png",
                        ],                
                      },
                  ],
              },





              {
                link: document.querySelector("#menuClinicaVeterinaria"),
                title: "Clinica Veterinaria",
                establishments: [
                    {
                        image: "images/comercios/clinicaVeterinaria/jurandir/perfil.png",
                        name: "Clínica Veterinária Carlópolis",
                        hours: "Seg a Sex: 09:00 - 18h <br>Sab: 09:00 a 17:00<br>Dom: Fechado",
                        address: "Rua Ataliba Leonel, 410, Carlópolis, PR,",
                        contact: "(43) 3566-1664",
                        contact2:"(43) 99642-1494",                      
                        facebook: "https://www.facebook.com/veterinariacarlopolis/?locale=pt_BR",
                        instagram: "https://www.instagram.com/clinicavetcarlopolis/",
                        novidadesImages: [
                     
                         "images/comercios/clinicaVeterinaria/jurandir/divulgacao/1.png",
                         "images/comercios/clinicaVeterinaria/jurandir/divulgacao/2.png",
                         "images/comercios/clinicaVeterinaria/jurandir/divulgacao/3.png",
                         "images/comercios/clinicaVeterinaria/jurandir/divulgacao/4.png",
                         "images/comercios/clinicaVeterinaria/jurandir/divulgacao/5.png",
                        ],                    
                    },
                ],
            },




                

                {
                    link: document.querySelector("#menuConfecção"),    
                    title: "Confecção",
                    establishments: [
                        {
                            name: "Yellow Jeans",
                            hours: "seg a sex: 9h - 11:30h, 13:00-17:00",
                            address: "Rua Maria Pereira da Rocha Aleixo, 435",
                            contact: "</br>(43) 998070671",
                        },
                    ],
                },


                {
                  link: document.querySelector("#menuFerroVelho"),
                  title: "Ferro Velho",
                  establishments: [
                      {
                          image: "images/comercios/ferroVelho/reiDoFerro/reiDoFerro.png",
                          name: "Rei do Ferro",
                          hours: "Seg a Sex - 08:00 - 18:00",
                          address: "Rodovia PR 218",
                          contact: "(43) 3566-2505",                         
                          instagram: "https://www.instagram.com/rei_do.ferro/",
                          novidadesImages: [                  
                            "images/comercios/ferroVelho/reiDoFerro/divulgacao/2.png",
                            "images/comercios/ferroVelho/reiDoFerro/divulgacao/1.png"
                        ],                
                      },
                  ],
              },


              {
                link: document.querySelector("#menuFeiraLua"),
                title: "Feira da Lua",
                establishments: [
                    {
                        image: "images/comercios/feiraLua/perfil.png",
                               
                        name: "Feira da Lua",
                        hours: "Sex - 19:00 - 23:30",
                        address: "Praça Igreja Matriz",
                        contact: "(43) 99965-2084",                         
                        instagram: "https://www.instagram.com/feiradaluacarlopolis/",
                        novidadesImages: [                 
                          
                          "images/comercios/feiraLua/divulgacao/1.png",
                          "images/comercios/feiraLua/divulgacao/2.png",
                          "images/comercios/feiraLua/divulgacao/3.png",
                          "images/comercios/feiraLua/divulgacao/4.png",
                          "images/comercios/feiraLua/divulgacao/5.png",
                          "images/comercios/feiraLua/divulgacao/6.png"
                      ],                
                    },
                ],
            },




                {
                    link: document.querySelector("#menuLanchonete"),
                    title: "Lanchonetes",
                    establishments: [


                      {
                        image: "images/comercios/lanchonete/caldodecanaamaral/perfil.png",
                        name: "Caldo de Cana Amaral",
                        hours: "Dom a Dom - 13h as 18:30h",
                        address: "Rua Benedito Salles, 2639, Carlópolis",
                        contact: "(43) 99977-8839",
                        delivery: "Sim / Com Taxa",
                        infoAdicional:"<a style='color:#2da6ff;' href='https://www.youtube.com/watch?v=LkTSbakmFrE'>Conheça nossas especiarias!</a>",
                
                      
                        instagram:"https://www.instagram.com/caldodecanaamaral/" ,
                        facebook:"https://www.facebook.com/CaldodecanaAmaral",                       
                        menuImages: [                   
                            "images/comercios/lanchonete/caldodecanaamaral/cardapio/1.jpg",
                            "images/comercios/lanchonete/caldodecanaamaral/cardapio/2.jpg",
                            "images/comercios/lanchonete/caldodecanaamaral/cardapio/3.jpg",
                            "images/comercios/lanchonete/caldodecanaamaral/cardapio/4.jpg",
                            "images/comercios/lanchonete/caldodecanaamaral/cardapio/5.jpg",
                            "images/comercios/lanchonete/caldodecanaamaral/cardapio/6.jpg",
                            "images/comercios/lanchonete/caldodecanaamaral/cardapio/7.jpg",
                            "images/comercios/lanchonete/caldodecanaamaral/cardapio/8.jpg",
                            "images/comercios/lanchonete/caldodecanaamaral/cardapio/9.jpg",
                            "images/comercios/lanchonete/caldodecanaamaral/cardapio/10.jpg",
                           
                        ],     
                        novidadesImages: [
                        
                          "images/comercios/lanchonete/caldodecanaamaral/divulgacao/1.png",
                          "images/comercios/lanchonete/caldodecanaamaral/divulgacao/2.png",
                          "images/comercios/lanchonete/caldodecanaamaral/divulgacao/3.png",
                          "images/comercios/lanchonete/caldodecanaamaral/divulgacao/4.png",
                          "images/comercios/lanchonete/caldodecanaamaral/divulgacao/5.png",
                        
                      ],               
                    },



                      {
                        image: "images/comercios/lanchonete/cantinhoPraca/perfil.png",
                        name: "Cantinho da Praça",
                        hours: "Ter a Dom - 18h - 23:30h",
                        address: "R. Padre Hugo, 478 , Carlópolis",
                        contact: "(43) 99604-9187",
                        delivery: "Sim / Com Taxa",                        
                        menuImages: [                   
                            "images/comercios/lanchonete/cantinhoPraca/cardapio/1.png",
                            "images/comercios/lanchonete/cantinhoPraca/cardapio/2.png",
                            "images/comercios/lanchonete/cantinhoPraca/cardapio/3.png",
                            "images/comercios/lanchonete/cantinhoPraca/cardapio/4.png",
                            "images/comercios/lanchonete/cantinhoPraca/cardapio/5.png",
                           
                        ],     
                        novidadesImages: [
                        
                          "images/comercios/lanchonete/cantinhoPraca/divulgacao/1.png",
                          "images/comercios/lanchonete/cantinhoPraca/divulgacao/2.png",
                        
                      ],               
                    },



                    {
                      image: "images/comercios/lanchonete/didog/perfil.png",
                      name: "Di Dog",
                      hours: "Ter - Dom - 18h - 23:30h",
                      address: "R. Benedito Salles, 350, Carlopolis",
                      contact: "(43) 99161-8381",
                      delivery: "Sim / Com Taxa",   
                           
                  },




                    {
                      image: "images/comercios/lanchonete/kidog/perfil.png",
                      name: "Ki Dog",
                      hours: "Ter - Dom - 18h - 23:30h",
                      address: "R. Padre Hugo, 478 , Carlópolis",
                      contact: "(43) 99604-9187",
                      delivery: "Sim / Com Taxa",   
                      facebook:"https://www.facebook.com/p/Ki-dog-lanches-100063348873193/",
                                        
                      menuImages: [                   
                          "images/comercios/lanchonete/kidog/cardapio/1.png",
                          "images/comercios/lanchonete/kidog/cardapio/2.png",
                          
                         
                      ],     
                      novidadesImages: [
                      
                        "images/comercios/lanchonete/kidog/divulgacao/1.png",
                        "images/comercios/lanchonete/kidog/divulgacao/2.png",
                      
                    ],               
                  },



                  {
                    image: "images/comercios/lanchonete/mycoffe/perfil.png",
                    name: "My Coffe",
                    hours: "Seg: Fechado<br>Ter a Qui - 13h - 20:00h <br>Sex: 13h a 18h<br>Sab: 13h a 20h<br>Dom: 13h a 19h",
                    address: "R. Benedito Salles, 1205 - Centro",
                    contact: "(43) 99126-5705",
                    delivery: "Não",   
                    instagram:"https://www.instagram.com/mycoffeecarlopolis/",
                                      
                      
                    novidadesImages: [
                    
                      "images/comercios/lanchonete/mycoffe/divulgacao/1.png",
                      "images/comercios/lanchonete/mycoffe/divulgacao/2.png",
                      "images/comercios/lanchonete/mycoffe/divulgacao/3.png",
                      "images/comercios/lanchonete/mycoffe/divulgacao/4.png",
                      "images/comercios/lanchonete/mycoffe/divulgacao/5.png",
                
                    
                  ],               
                },















                        {
                            image: "images/comercios/lanchonete/casarao/faxada_casarao.png",
                            name: "O Casarao",
                            hours: "Ter - Dom - 18h - 00:30h",
                            address: "R. Benedito Salles, 1340",
                            contact: "(43) 99693-0565",
                            delivery: "Sim / Com Taxa",
                            facebook: "https://www.facebook.com/ocasaraoph/?locale=pt_BR",
                            instagram: "https://www.instagram.com/ocasaraoph/",       
                            menuImages: [                   
                                "images/comercios/lanchonete/casarao/cardapio/1.png",
                                "images/comercios/lanchonete/casarao/cardapio/2.png",
                                "images/comercios/lanchonete/casarao/cardapio/3.png",
                                "images/comercios/lanchonete/casarao/cardapio/4.png",
                                "images/comercios/lanchonete/casarao/cardapio/5.png",
                                "images/comercios/lanchonete/casarao/cardapio/6.png",
                                "images/comercios/lanchonete/casarao/cardapio/7.png",
                                "images/comercios/lanchonete/casarao/cardapio/8.png",
                                "images/comercios/lanchonete/casarao/cardapio/9.png",
                                "images/comercios/lanchonete/casarao/cardapio/10.png",
                            ],     
                            novidadesImages: [
                            
                              "images/comercios/lanchonete/casarao/novidades/1.png",
                             "images/comercios/lanchonete/casarao/novidades/2.png",
                             "images/comercios/lanchonete/casarao/novidades/3.png",
                             "images/comercios/lanchonete/casarao/novidades/4.png",
                             "images/comercios/lanchonete/casarao/novidades/5.png",
                          ],               
                        },

                        {
                          image: "images/comercios/lanchonete/ione/ione.png",
                          name: "Ione",
                          hours: "Seg - Sab - 9:30h - 19:30h",
                          address: "R. Benedito Salles, 1233",
                          contact: "(43) 99180-4287",
                          delivery: "Sim / Com Taxa",
                          facebook: "https://www.facebook.com/IoneSalgados1687Fabiana/?locale=pt_BR",
                          instagram: "https://www.instagram.com/salgadosione29/",       
                              
                          novidadesImages: [
                          
                            "images/comercios/lanchonete/ione/divulgacao/1.png",
                           "images/comercios/lanchonete/ione/divulgacao/2.png",
                          ]
                      },




                      {
                        image: "images/comercios/lanchonete/xisBauinea/perfil.png",
                        name: "Xis Bauinea",
                        hours: "Qui a Ter - 18h - 23h<br>Qua: Fechado",
                        address: "R. Benedito Salles, 1188, Carlópolis",
                        contact: "(43) 99957-6197",
                        delivery: "Sim / Com Taxa",   
                        instagram:"https://www.instagram.com/_xisbauinea/",
                                          
                        menuImages: [                   
                            "images/comercios/lanchonete/xisBauinea/cardapio/1.png",
                            "images/comercios/lanchonete/xisBauinea/cardapio/2.png",                            
                           
                        ],     
                        novidadesImages: [
                        
                          "images/comercios/lanchonete/xisBauinea/divulgacao/1.png",
                          "images/comercios/lanchonete/xisBauinea/divulgacao/2.png",
                          "images/comercios/lanchonete/xisBauinea/divulgacao/3.png",
                          "images/comercios/lanchonete/xisBauinea/divulgacao/4.png",
                          "images/comercios/lanchonete/xisBauinea/divulgacao/5.png",
                        
                      ],               
                    },
                  

                
              ],
            },
        
  
      // pizzaria
        {
            link: document.querySelector("#menuPizzaria"),
            title: "Pizzarias",
            establishments: [
                {
                    image: "images/comercios/pizzaria/fornalha/fornalha.png",
                    name: "Fornalha Pizzaria",
                    hours:"Quarta - Quinta: 18 - 23h </br> Sexta - Sabado: 18 - 00h </br> Domingo: 18 - 23h",
                    address: "R. Benedito Salles, 837",
                    contact: "(43) 99632-1310",
                    delivery: "Sim / Com Taxa",
                    facebook: "https://www.facebook.com/p/Fornalha-Fornalha-100054510698755/?locale=pt_BR",
                    instagram: "https://www.instagram.com/_fornalhapizzaria_/",    
                     
                    novidadesImages: [
                          
                      "images/comercios/pizzaria/fornalha/divulgacao/1.png",
                      "images/comercios/pizzaria/fornalha/divulgacao/2.png",
                      "images/comercios/pizzaria/fornalha/divulgacao/3.png",
                      "images/comercios/pizzaria/fornalha/divulgacao/4.png",
                      "images/comercios/pizzaria/fornalha/divulgacao/5.png",
                    ]        
                },


                {
                  image: "images/comercios/pizzaria/tonnyPizzaria/perfil.png",
                  name: "Tonny Pizzaria",
                  hours:"Seg a Ter: 18h - 23:30h <br> Qua: Fechado<br>Qui a Dom: 18h - 23:30h",
                  address: "R. Paul Harris, 52 - Carlópolis",
                  contact: "(43) 99191-7686",
                  delivery: "Sim / Com Taxa",
                  facebook: "https://www.facebook.com/p/Tonny-Pizzaria-100084516954612/",
                    
                  menuImages: [                
                      "images/comercios/pizzaria/tonnyPizzaria/cardapio/1.png",
                      "images/comercios/pizzaria/tonnyPizzaria/cardapio/2.png",
                      "images/comercios/pizzaria/tonnyPizzaria/cardapio/3.png",
                      "images/comercios/pizzaria/tonnyPizzaria/cardapio/4.png",
                      "images/comercios/pizzaria/tonnyPizzaria/cardapio/5.png",
                      "images/comercios/pizzaria/tonnyPizzaria/cardapio/6.png",
                      "images/comercios/pizzaria/tonnyPizzaria/cardapio/7.png",
                      "images/comercios/pizzaria/tonnyPizzaria/cardapio/8.png",
                      "images/comercios/pizzaria/tonnyPizzaria/cardapio/9.png",
                      
                  ],    
                  novidadesImages: [
                        
                    "images/comercios/pizzaria/tonnyPizzaria/divulgacao/1.png",
                    "images/comercios/pizzaria/tonnyPizzaria/divulgacao/2.png",
                    "images/comercios/pizzaria/tonnyPizzaria/divulgacao/3.png",
                 
                  ]        
              },


            ],
        },

         // pesqueiro
        {
            link: document.querySelector("#menuPesqueiro"),
            title: "Pesqueiro",
            establishments: [
                {
                    image: "images/comercios/pesqueiro/aguamarine.jpg",
                    name: "Pesk e Pague Agua Marine",
                    hours: "Sex a  - Dom: 09:30 - 18",
                    address: "Rod. Jose Alves Pereira",
                    contact: "(43) 98808-1911",
                    delivery: "Sim / Com Taxa",
                    facebook: "www.facebook.com/uahh",
                    instagram: "www.instagram.com/uahh",
                    menuImages: [
                 
                     "images/comercios/pesqueiro/cardapio_aguamarine.jpg",
                    ],                    
                },
            ],
        },


        {
          link: document.querySelector("#menuSorveteria"),
          title: "Sorveteria",
          establishments: [
              {
                  image: "images/comercios/sorveteria/limone/limone.png",
                  name: "Limone",
                  hours: "Seg - Sab: 13:00 - 23h<br>Dom: 14:00 a 00:00",
                  address: "Rua Benedito Salles n° 619",
                  contact: "(43) 99922-8336",
                  contact2:"(43) 98863-3040",
                  delivery: "Sim / Com Taxa",
                  facebook: "#",
                  instagram: "https://www.instagram.com/limone.sorvetes/?hl=pt",
                  menuImages: [
                 
                    "images/comercios/sorveteria/limone/cardapio/1.jpeg",
                    "images/comercios/sorveteria/limone/cardapio/2.jpeg",
                    "images/comercios/sorveteria/limone/cardapio/3.jpeg",
                    "images/comercios/sorveteria/limone/cardapio/4.jpeg",
                    "images/comercios/sorveteria/limone/cardapio/5.jpeg",
                    "images/comercios/sorveteria/limone/cardapio/6.jpeg",
                   ],  
                  
                  novidadesImages: [              
                   "images/comercios/sorveteria/limone/divulgacao/1.jpeg",
                   "images/comercios/sorveteria/limone/divulgacao/2.jpeg",
                   "images/comercios/sorveteria/limone/divulgacao/3.jpeg",
                   "images/comercios/sorveteria/limone/divulgacao/4.jpeg",
                   "images/comercios/sorveteria/limone/divulgacao/5.jpeg",                  
                  ],                    
              },


              {
                image: "images/comercios/sorveteria/santino/santino.png",
                name: "Santtino Gelateria",
                hours: "Dom - Sex: 13:00 - 22h<br>Sab 13h - 23h",
                address: "R. Kalil Keder, 583 - Centro",
                contact: "(43) 99971-3535",
                delivery: "Sim / Sem Taxa",
                facebook: "https://www.facebook.com/santtinogelateria/?locale=pt_BR",
                instagram: "https://www.instagram.com/santtinogelateria/",
                novidadesImages: [              
                 "images/comercios/sorveteria/santino/divulgacao/1.png",
                 "images/comercios/sorveteria/santino/divulgacao/2.png",
                ],     
                novidadesDescriptions: [                            
                  "Nossa Barca",
                  "Açai e Fruta!",
              
                ],               
            },

          ],
      },




        {
            link: document.querySelector("#menuPadaria"),    
            title: "Padarias",
            establishments: [
                {
                    image: "images/comercios/padaria/bom jesus/bomjesus.png",
                    name: "Bom Jesus",
                    hours: "Seg a Sab: 6h - 19h </br> Dom: 06 - 14h",
                    address: "R. Benedito Salles, 615",
                    contact: "43) 99653-9285",
                    delivery: "Sim / Com Taxa",
                    facebook: "https://www.facebook.com/PanificadoraRestauranteBomJesus/?locale=pt_BR",
                    instagram: "https://www.instagram.com/bom_jesus_panificadora/",
                    novidadesImages: [
                        // Novo array de imagens de novidades
                        "images/comercios/padaria/bom jesus/novidades/1.png",
                        "images/comercios/padaria/bom jesus/novidades/2.png",
                        "images/comercios/padaria/bom jesus/novidades/3.png",
                        "images/comercios/padaria/bom jesus/novidades/4.png",
                        "images/comercios/padaria/bom jesus/novidades/5.png",
                       
                    ],
                },

                {
                  image: "images/comercios/padaria/prelie/prelie.png",
                  name: "Prelie",
                  hours: "seg a Sab: 5:30h - 19h </br> Dom: 5:30h - 12h",
                  address: "R. Benedito Salles, 1098",
                  contact: "(43) 99954-0863",
                  delivery: "Sim / Com Taxa",
                  
                  instagram: "https://www.instagram.com/prelie.confeitaria/",
                  novidadesImages: [                   
                      "images/comercios/padaria/prelie/divulgacao/1.png",
                     
                     
                  ],
              },

                {
                  image: "images/comercios/padaria/saoFrancisco/saoFrancisco.png",
                  name: "São Francisco",
                  hours: "seg a Sab: 5:30h - 19h </br> Dom: 5:30h - 12h",
                  address: "R. Benedito Salles, 881",
                  contact: "(43) 98873-1488",
                  delivery: "Sim / Com Taxa",
                  facebook: "#",
                  instagram: "#",
                  novidadesImages: [                   
                      "images/comercios/padaria/saoFrancisco/novidades/4.png",
                      "images/comercios/padaria/saoFrancisco/novidades/3.png",
                      "images/comercios/padaria/saoFrancisco/novidades/5.png",
                      "images/comercios/padaria/saoFrancisco/novidades/2.png",
                      "images/comercios/padaria/saoFrancisco/novidades/1.png",
                     
                  ],
              },



            ],
        },



      
        {
            link: document.querySelector("#menuMercado"),
            title: "Supermercados ",
            establishments: [

              {
                image: "images/comercios/supermercado/bomPreco/perfil.png",
                name: "Bom Preço",
                address: "R. Chuva de Ouro, 397 - Vista Alegre, Carlópolis",
                hours: "Dom a Dom 8h - 19:30h",
                contact: "(43) 98821-4701",
                delivery: "Sim / Sem Taxa",                
                instagram: "https://www.instagram.com/bomprecocarlopolis/?locale=ne_NP&hl=ar",
                novidadesImages: [               
                  "images/comercios/supermercado/bomPreco/divulgacao/1.png",
                
              ], 
              novidadesDescriptions: [                            
                "Nosso Horti Fruti",
             
              ],
            },


                {
                    image: "images/comercios/supermercado/carreiro.png",
                    name: "Carreiro",
                    address: "R. Benedito Salles, 341 ",
                    hours: "Seg a Sex 8h - 19h </br> dom: 08 - 12h",
                    contact: "(43) 3566-1520",
                    delivery: "Sim / Com Taxa",
                    facebook: "https://www.facebook.com/p/Supermercado-Carreiro-100066342918723/?locale=pt_BR",
                    instagram: "https://www.instagram.com/mercadocarreiroclps/",
                    novidadesImages: [               
                      "images/comercios/supermercado/carreiro/divulgacao/1.png",
                     "images/comercios/supermercado/carreiro/divulgacao/2.png",    
                      "images/comercios/supermercado/carreiro/divulgacao/3.png",
                      "images/comercios/supermercado/carreiro/divulgacao/4.png",
                      "images/comercios/supermercado/carreiro/divulgacao/5.png",
                  ], 
                  novidadesDescriptions: [                            
                    "Nosso Horti Fruti",
                    "Carnes Frescas toda quinta!",
                    "Paozinho Frances a partir das 8hrs",
                    "Chocolates Importados" ,
                    "Area de Promoçoes de Leite Condensado!",
                  ],
                },


                {
                  image: "images/comercios/supermercado/compreBemMais/compreBemMais.png",
                  name: "Compre Bem Mais",
                  address: "R. Andrino Soares, 355",
                  hours: "Seg a Sex 7h - 20h </br> Dom: 08 - 12h",
                  contact: "(43) 99977-6613",
                  delivery: "Sim / Sem Taxa",
                  facebook: "https://www.facebook.com/people/Compre-bem-Mais/61559328414681/?_rdr",
                  instagram: "#",
                  novidadesImages: [               
                    "images/comercios/supermercado/compreBemMais/divulgacao/1.png",
                     
                    
                ], 
                novidadesDescriptions: [                            
                  "Nosso Horti Fruti",
                
                  
                ],
              },



                {
                    image: "images/comercios/supermercado/obarateiro.png",
                    name: "O Barateiro",
                    address: "Bendito Salles, 1168 ",
                    hours: "Seg a Sex 8h - 21h </br> dom: 08 - 12h",
                    contact: "(43) 99196-7816",
                    delivery: "Sim / Sem Taxa",
                    facebook: "https://www.facebook.com/MercadoObarateiro",
                    instagram: "https://www.instagram.com/supermercado_obarateiro/p/DFgIRupxbr-/",
                },
                {
                    image: "images/comercios/supermercado/kelve.png",
                    name: "Kelve",
                    address: "R. Paul Harris,104",
                    hours: "Seg a Sex 8h - 19:30h </br> dom: 08:30 - 12:30h",
                    contact: "(43) 99844-6105",
                    delivery: "Sim / Sem Taxa",
                    facebook: "https://www.facebook.com/p/Kelve-Carl%C3%B3polis-100010521284877/?locale=pt_BR",
                    instagram: "https://www.instagram.com/kelvesupermercadosoficial/",
                },
    
                {
                    image: "images/comercios/supermercado/rocha.jpg",
                    name: "Rocha",
                    hours: "Seg a Sex 6h - 20h </br> Dom: 06 - 12h",
                    address: "Av. Elson Soares, 767 ",
                    contact: "(43) 3566-2436",
                    delivery: "Sim / Sem Taxa",
                    facebook: "https://www.facebook.com/p/Kelve-Carl%C3%B3polis-100010521284877/?locale=pt_BR",
                    instagram: "https://www.instagram.com/kelvesupermercadosoficial/",
                },
    
                {
                    name: "Carriel",
                    address: "PR-218, 1168 ",
                    hours: "Seg a Sex 8h - 21h </br> Dom: 07 - 12h",
                    contact: "(43) 3456-7890",
                    delivery: "Sim / Sem Taxa",
                },
                {
                    name: "Compre Bem +",
                    address: "PR-218, 1168 ",
                    hours: "Seg a Sex 8h - 21h </br> Dom: 07 - 12h",
                    contact: "(43) 3456-7890",
                    delivery: "Sim / Sem Taxa",
                },
    
                {
                  image: "images/comercios/supermercado/zerojapan.png",
                    name: "Zero Japan",
                    address: "Rua Doutora Paula e Silva, 445 ",
                    hours: "Seg a Seg 8h - 20h ",
                    contact: "(43) 3142-2005", 
                    whatsapp: "4331422005", 
                    delivery: "Sim / Sem Taxa",
                },
            ],
        },


         //// farmacias
        {
            link: document.querySelector("#menuFarmacia"),
            title: "Farmácias ",
            establishments: [

                {
                    image: "images/comercios/farmacia/bioFarma/biofarma.jpg",
                    name: "Bio Farma",
                    address: "Rua Laurindo Franco Godoy, 464",
                    hours: "Seg a Sex: 8h - 18h </br> Sab: 08 - 12h</br> Dom e feriado: Fechado",
                    contact: "(43) 3566-1473",
                    delivery: "Sim / Sem Taxa",
                    facebook: "www.facebook.com/uahh",
                    instagram: "www.instagram.com/uahh",
                    site: "www.google.com",
                    novidadesImages: [               
                      "images/comercios/farmacia/bioFarma/divulgacao/1.png",
                      "images/comercios/farmacia/bioFarma/divulgacao/2.png",
                      "images/comercios/farmacia/bioFarma/divulgacao/3.png",
                      "images/comercios/farmacia/bioFarma/divulgacao/4.png",
                      "images/comercios/farmacia/bioFarma/divulgacao/5.png",
                    ],  
                    novidadesDescriptions: [                            
                      "Analgésico de alívio eficaz para dores intensas",
                      "Cólicas do trato gastrintestinal",
                      "Analgésico (para dor) antitérmico (para febre)",
                      "Alívio da dor associada a contraturas musculares, incluindo dor de cabeça tensional.",
                      "Redução da febre e para o alívio de dores",
                    ],
                },
          
  
                {
                    image: "images/comercios/farmacia/descontoFacil/descontoFacil.png",
                    name: "Desconto Facil 1",
                    address: "R. Benedito Salles, 574",
                    hours: "Seg a Sex: 8h - 18h </br> Sab: 08 - 12h",
                    contact: "(43) 99966-9812",
                    delivery: "Sim / Sem Taxa",
                    facebook:"https://www.facebook.com/people/Farm%C3%A1cias-Desconto-F%C3%A1cil-Carl%C3%B3polis/100054221361992/",
                    instagram: "https://www.instagram.com/descontofacil.clps/",
                    site: "https://www.grupoasfar.com.br/",
                    novidadesImages: [               
                      "images/comercios/farmacia/descontoFacil/divulgacao/1.png",
                      "images/comercios/farmacia/descontoFacil/divulgacao/2.png",
                      "images/comercios/farmacia/descontoFacil/divulgacao/3.png",
                      "images/comercios/farmacia/descontoFacil/divulgacao/4.png",
                      "images/comercios/farmacia/descontoFacil/divulgacao/5.png",
                    ], 
                    novidadesDescriptions: [                            
                      "Analgésico de alívio eficaz para dores intensas",
                      "Cólicas do trato gastrintestinal",
                      "Analgésico (para dor) antitérmico (para febre)",
                      "Alívio da dor associada a contraturas musculares, incluindo dor de cabeça tensional.",
                      "Redução da febre e para o alívio de dores",
                    ],
                },

                {
                    image: "images/comercios/farmacia/drogaMais/drogamais.png",
                    name: "DrogaMais",
                    hours: "Seg a Sex: 8h - 18h </br> Sab: 08 - 12h",
                    address: "Rua Benedito Salles, 903",
                    contact: "(43) 98411-9145",
                    delivery: "Sim / Sem Taxa",
                    facebook:"https://www.facebook.com/p/Drogamais-Jorginho-61560211252826/?locale=pt_BR",
                    instagram: "https://www.instagram.com/drogamaisjorginho/",
                    site: "www.google.com",
                    novidadesImages: [               
                      "images/comercios/farmacia/drogaMais/divulgacao/1.png",
                      "images/comercios/farmacia/drogaMais/divulgacao/2.png",
                      "images/comercios/farmacia/drogaMais/divulgacao/3.png",
                      "images/comercios/farmacia/drogaMais/divulgacao/4.png",
                      "images/comercios/farmacia/drogaMais/divulgacao/5.png",
                    ], 
                    novidadesDescriptions: [                            
                      "Analgésico de alívio eficaz para dores intensas",
                      "Cólicas do trato gastrintestinal",
                      "Analgésico (para dor) antitérmico (para febre)",
                      "Alívio da dor associada a contraturas musculares, incluindo dor de cabeça tensional.",
                      "Redução da febre e para o alívio de dores",
                    ],
                },
        
                {
                    image: "images/comercios/farmacia/elShaday/elshaday.png",
                    name: "El Shaday",
                    address: "R. Benedito Sales, 353",
                    hours: "Seg a Sex: 8h - 18h </br> Sab: 08 - 12h",
                    contact: "(43) 98488-9420",
                    delivery: "Sim / Sem Taxa",
                    facebook: "https://www.facebook.com/fciaelshaday/?locale=pt_BR",
                    instagram: "www.instagram.com/uahh",
                    site: "www.google.com",
                    novidadesImages: [               
                      "images/comercios/farmacia/elShaday/divulgacao/1.png",
                      "images/comercios/farmacia/elShaday/divulgacao/2.png",
                      "images/comercios/farmacia/elShaday/divulgacao/3.png",
                      "images/comercios/farmacia/elShaday/divulgacao/4.png",
                      "images/comercios/farmacia/elShaday/divulgacao/5.png",
                    ], 
                    novidadesDescriptions: [                            
                      "Analgésico de alívio eficaz para dores intensas",
                      "Cólicas do trato gastrintestinal",
                      "Analgésico (para dor) antitérmico (para febre)",
                      "Alívio da dor associada a contraturas musculares, incluindo dor de cabeça tensional.",
                      "Redução da febre e para o alívio de dores",
                    ],
                },
        
                {
                  image: "images/comercios/farmacia/farmaciaDaVila/farmaciaDaVila.png",
                    name: "Farmacia da Vila",
                    address: "Rua Manguba, 320, Carlopolis",
                    hours: "Seg a Sex: 8h - 18h </br> Sab: 08 - 12h",
                    contact: "(43) 99148-8478",
                    delivery: "Sim / Sem Taxa",
                    facebook: "#",
                    instagram: "https://www.instagram.com/farmaciadavilaclps/",
                    site: "#",
                    novidadesImages: [               
                      "images/comercios/farmacia/farmaciaDaVila/divulgacao/1.png",
                      "images/comercios/farmacia/farmaciaDaVila/divulgacao/2.png",     
                      "images/comercios/farmacia/farmaciaDaVila/divulgacao/3.png",
                      "images/comercios/farmacia/farmaciaDaVila/divulgacao/4.png",
                      "images/comercios/farmacia/farmaciaDaVila/divulgacao/5.png",
                  ], 
                  novidadesDescriptions: [                            
                    "Analgésico de alívio eficaz para dores intensas",
                    "Cólicas do trato gastrintestinal",
                    "Analgésico (para dor) antitérmico (para febre)",
                    "Alívio da dor associada a contraturas musculares, incluindo dor de cabeça tensional.",
                    "Redução da febre e para o alívio de dores",
                  ],
                },
        
                {
                    image: "images/comercios/farmacia/farmais/farmais.png",
                    name: "FarMais",
                    address: "R. Benedito Salles, 1188",
                    hours: "Seg a Sex: 8h - 18h </br> Sab: 08 - 12h",
                    contact: "(43) 3566-1211",
                    delivery: "Sim / Sem Taxa",
                    facebook: "https://www.facebook.com/farmaiscarlopolis1/?locale=pt_BR",
                    instagram: "https://www.instagram.com/farmaiscarlopolis/",
                    site: "#",
                    novidadesImages: [               
                      "images/comercios/farmacia/farmais/divulgacao/1.png",
                      "images/comercios/farmacia/farmais/divulgacao/2.png",
                      "images/comercios/farmacia/farmais/divulgacao/3.png",
                      "images/comercios/farmacia/farmais/divulgacao/4.png",
                      "images/comercios/farmacia/farmais/divulgacao/5.png",
                    ], 
                    novidadesDescriptions: [                            
                      "Analgésico de alívio eficaz para dores intensas",
                      "Cólicas do trato gastrintestinal",
                      "Analgésico (para dor) antitérmico (para febre)",
                      "Alívio da dor associada a contraturas musculares, incluindo dor de cabeça tensional.",
                      "Redução da febre e para o alívio de dores",
                    ],
                },
        
                {
                    image: "images/comercios/farmacia/masterFarma/masterfarma.png",
                    name: "MasterFarma",
                    address: "R. Laurindo Franco de Godoi, 90",
                    hours: "Seg a Sex: 8h - 18h </br> Sab: 08 - 12h",
                    contact: "(43) 99951-1540",
                    delivery: "Sim / Sem Taxa",
                    facebook: "https://www.facebook.com/zurdo.farmacentro/?locale=pt_BR",
                    instagram: "https://www.instagram.com/masterfarma_carlopolis/",
                    site: "#",
                    novidadesImages: [               
                      "images/comercios/farmacia/masterFarma/divulgacao/1.png",
                      "images/comercios/farmacia/masterFarma/divulgacao/2.png",
                      "images/comercios/farmacia/masterFarma/divulgacao/3.png",
                      "images/comercios/farmacia/masterFarma/divulgacao/4.png",
                      "images/comercios/farmacia/masterFarma/divulgacao/5.png",
                    ], 
                    novidadesDescriptions: [                            
                      "Analgésico de alívio eficaz para dores intensas",
                      "Cólicas do trato gastrintestinal",
                      "Analgésico (para dor) antitérmico (para febre)",
                      "Alívio da dor associada a contraturas musculares, incluindo dor de cabeça tensional.",
                      "Redução da febre e para o alívio de dores",
                    ],
                },
                
                {
                    
                    name: "PopularMais",
                    address: "Elson Soares, 787, Sala 2",
                    hours: "Seg a Sex: 8h - 18h </br> Sab: 08 - 12h",
                    contact: "(43) 99647-6266",
                    delivery: "Sim / Sem Taxa",
                    image: "images/comercios/farmacia/popularMais/popularMais.png",
                    facebook:
                    "https://www.facebook.com/people/Popular-Mais-a-Farm%C3%A1cia-do-Jeremias/100075024257599/#",
                    instagram:
                    "https://www.instagram.com/popularmais_farmaciadojeremias/",
                    site: "#",
                    novidadesImages: [                  
                        
                        "images/comercios/farmacia/popularMais/divulgacao/1.png",
                        "images/comercios/farmacia/popularMais/divulgacao/2.png",
                        "images/comercios/farmacia/popularMais/divulgacao/3.png",
                        "images/comercios/farmacia/popularMais/divulgacao/4.png",
                        "images/comercios/farmacia/popularMais/divulgacao/5.png",
                                    
                    ],
                    novidadesDescriptions: [                            
                      "Analgésico de alívio eficaz para dores intensas",
                      "Cólicas do trato gastrintestinal",
                      "Analgésico (para dor) antitérmico (para febre)",
                      "Alívio da dor associada a contraturas musculares, incluindo dor de cabeça tensional.",
                      "Redução da febre e para o alívio de dores",
                    ],
                },

                {
                    image: "images/comercios/farmacia/santaMaria/santamaria.png",
                    name: "Santa Maria",
                    address: "R. Benedito Salles, nº 711, Carlopols",
                    hours: "Seg a Sex: 8h - 18h </br> Sab: 08 - 12h",
                    contact: "(43) 99840-9658",
                    delivery: "Sim / Sem Taxa",
                    facebook: "https://www.facebook.com/farmaciasantamaria.carlopolis/",
                    instagram: "https://www.instagram.com/santamaria.farmaciaclps/",
                    site: "#",
                    novidadesImages: [               
                        "images/comercios/farmacia/santaMaria/divulgacao/1.png",
                        "images/comercios/farmacia/santaMaria/divulgacao/2.png",     
                        "images/comercios/farmacia/santaMaria/divulgacao/3.png",
                        "images/comercios/farmacia/santaMaria/divulgacao/4.png",
                        "images/comercios/farmacia/santaMaria/divulgacao/5.png",
                    ], 
                    novidadesDescriptions: [                            
                      "Venham nos Visitar",
                      "Cólicas do trato gastrintestinal",
                      "Analgésico (para dor) antitérmico (para febre)",
                      "Alívio da dor associada a contraturas musculares, incluindo dor de cabeça tensional.",
                      "Redução da febre e para o alívio de dores",
                    ],
                },
        
                {
                    image: "images/comercios/farmacia/saudeFarma/saudeFarma.png",
                    name: "Saude Farma",
                    address: "Rua Benedito Salles, 951",
                    hours: "Seg a Sex: 8h - 18h </br> Sab: 08 - 12h",
                    contact: "(43) 99956-8938",
                    delivery: "Sim / Sem Taxa",
                    facebook:
                    "https://www.facebook.com/people/Sa%C3%BAde-Farma-Carl%C3%B3polis/100077692803333/",
                    instagram: "#",
                    site: "www.google.com",
                    novidadesImages: [               
                        "images/comercios/farmacia/saudeFarma/divulgacao/1.png",
                        "images/comercios/farmacia/saudeFarma/divulgacao/2.png",     
                        "images/comercios/farmacia/saudeFarma/divulgacao/3.png",
                        "images/comercios/farmacia/saudeFarma/divulgacao/4.png",
                        "images/comercios/farmacia/saudeFarma/divulgacao/5.png",
                    ], 
                    novidadesDescriptions: [                            
                      "Analgésico de alívio eficaz para dores intensas",
                      "Cólicas do trato gastrintestinal",
                      "Analgésico (para dor) antitérmico (para febre)",
                      "Alívio da dor associada a contraturas musculares, incluindo dor de cabeça tensional.",
                      "Redução da febre e para o alívio de dores",
                    ],
                },
            ],
        },
  
      ///////////////////
  
        {
            link: document.querySelector("#menuAnuncio"),
            title: "Anuncio",
            establishments: [
                {
                    name: "Pio do Anuncio",
                    contact: "(43) 7890-1234",
                },
            ],
        },


        {
          link: document.querySelector("#menuBarbeiro"),
          title: "Barbeiros ",
          establishments: [
              {
                image: "images/servicos/barbeiro/luis/luis.png",
                  name: "Luis Barbeiro",
                  contact: "(43) 99663-3256",
              },
              {
                  name: "Antonia",
                  contact: "(43) 8901-2345",
              },
          ],
      },


  
        {
            link: document.querySelector("#menuChurrasqueiro"),
            title: "Churrasqueiros ",
            establishments: [
                

                {
                  image: "images/servicos/churrasqueiro/flavio/flavio.png",
                    name: "Flavio Churrasqueiro",
                    contact: "(43) 99906-1349",
                    instagram:"https://www.instagram.com/donascimentoflaviogiovani/",
                    novidadesImages: [               
                      "images/servicos/churrasqueiro/flavio/divulgacao/1.png",
                      "images/servicos/churrasqueiro/flavio/divulgacao/2.png",
                     
                  ], 
                    
                },

                {
                image: "images/servicos/churrasqueiro/pituka/pituka.png",
                name: "Pituca",
                contact: "(43) 99984-5074",
                instagram:"https://www.instagram.com/pituca.abilio/",
                },
            ],
        },
  
        {
            link: document.querySelector("#menuBabas"),
            title: "Babas ",
            establishments: [
                {
                    name: "Maria",
                    contact: "(43) 7890-1234",
                },
                {
                    name: "Antonia",
                    contact: "(43) 8901-2345",
                },
            ],
        },
  
        {
            link: document.querySelector("#menuDiarista"),
            title: "Diaristas",
            establishments: [
                {
                    name: "Rose",
                    contact: "(43) 7890-1234",
                },
                {
                    name: "Maria",
                    contact: "(43) 8901-2345",
                },
            ],
        },
  
        {
            link: document.querySelector("#menuEletricista"),
            title: "Eletrecistas",
            establishments: [
                {
                    name: "Juca",
                    contact: "(43) 7890-1234",
                },

                {
                    name: "Jurandir",
                    contact: "(43) 8901-2345",
                },
            ],
        },
  
        {
            link: document.querySelector("#menuEncanador"),
            title: "Encanador",
            establishments: [
                {
                    name: "Rubens",
                    contact: "(43) 7890-1234",
                },
                {
                    name: "Jose",
                    contact: "(43) 8901-2345",
                },
            ],
        },

        {
          link: document.querySelector("#menuFretes"),
          title: "Fretes ",
          establishments: [
              {
                image: "images/servicos/fretes/anselmo/anselmo.png",
                  name: "Anselmo Frete",
                  contact: "(43) 99695-7449",
              },
              {
                image: "images/servicos/fretes/erickson/erickson.png",
                  name: "Erickson",
                  contact: "(43) 99611-5261",
              },
          ],
      },
  
        {
            link: document.querySelector("#menuGuiaPesca"),
            title: "Guia de Pesca",
            establishments: [
                {
                    image:"images/servicos/guiapesca/fabio.png",
                    name: "Fabio Katsumi",
                    contact: "(43) 99904-3894",
                    instagram: "https://www.instagram.com/suguimotofishing/",
                    facebook:"https://www.facebook.com/fabio.katsumisuguimoto/",
                },

                
                {
                    name: "Thiago Aguera",
                    contact: "(43) 8901-2345",
                },
            ],
        },
    
        {
            link: document.querySelector("#menuJardineiro"),
            title: "Jardineiros ",
            establishments: [
                {
                    name: "Antonio Gil",
                    contact: "(43) 7890-1234",
                },
                {
                    name: "Ruan",
                    contact: "(43) 8901-2345",
                },
            ],
        },
  
        {
            link: document.querySelector("#menuMarceneiro"),
            title: "Marceneiros ",
            establishments: [
                {
                    name: "Pedro alvez",
                    contact: "(43) 7890-1234",
                },
                {
                    name: "Rodrigo",
                    contact: "(43) 8901-2345",
                },
            ],
        },


        {
          link: document.querySelector("#menuMontadorMoveis"),
          title: "Montador de Moveis",
          establishments: [
              {      
                image:"images/servicos/montadorMoveis/hiran/hiran.png",                                          
                  name: "Hiran Castro",
                  contact: "(43) 99174-4396",
                  novidadesImages: [               
                    "images/servicos/montadorMoveis/hiran/novidades/1.png",
                    "images/servicos/montadorMoveis/hiran/novidades/2.png",
                    "images/servicos/montadorMoveis/hiran/novidades/3.png",
                ], 
              },
            
          ],
        },


        {
            link: document.querySelector("#menuPedreiro"),
            title: "Pedreiros",
            establishments: [
                {
                    image: "images/servicos/pedreiro/pedreiro.jpg",
                    name: "Denis centurion",
                    contact: "(43) 94587-2485",
                },
                {
                    name: "Kauan",
                    contact: "(43) 8901-2345",
                },
            ],
        },
  
        {
            link: document.querySelector("#menuPintor"),
            title: "Pintor ",
            establishments: [
                {
                    name: "Rafael portes",
                    contact: "(43) 7890-1234",
                },
                {
                    name: "Yuri",
                    contact: "(43) 8901-2345",
                },
            ],
        },
  
        {
            link: document.querySelector("#menuVeterinario"),
            title: "Veterinario ",
            establishments: [
                {
                    name: "Celso Golçalves",
                    contact: "(43) 98851-3310",
                },
                {
                    name: "Jurandir Machado",
                    contact: "(43) 99642-1494",
                },
            ],
        },





        // inicio Eventos
        {
          link: document.querySelector("#menuEventos"),
          title: "Eventos em Carlópolis",
          establishments: [
              {
                  name: "Calendario Eventos",
                  image: "images/informacoes/eventos/evento_1/calendario_evento.png",
                  contact: "",
              },

            

         
              {
                image: "images/informacoes/eventos/evento_4/pescar.png",
                name: "Pescar",
                date: "03/05/25 a 04/05/2025",
                address: "Ilha do Ponciano",
                contact: "(41) 99950-9291",
                contact2:"(43) 99604-1013",
                instagram:"https://www.instagram.com/p/DJAoxh4gRPS/",
               
            },


            {
              image: "images/informacoes/eventos/evento_6/velocross.png",
              name: "Etapa Leste VeloCross",
              date: "24/05/25 a 25/05/2025",
              address: "Centro de Eventos Ilha do Ponciano",
              contact: "(43) 99636-2971",
              
            
             
          },
            
                  

              {
                  image: "images/informacoes/eventos/evento_5/frutFest.png",
                  name: "FrutFest",
                  date: "04/07/25",
                  address: "Ilha do Ponciano",
                  contact: "(43) 99825-0570",
                
              },



            

             
          ],
      },


      // fim eventos
  
        {
            link: document.querySelector("#menuFarmaciaPlantao"),
            title: "Farmacia de Plantão",
            establishments: [
/*
                { 
                  image: "images/comercios/farmacia/farmaciaDaVila/farmaciaDaVila.png",
                  name: "Farmacia da Vila",
                  address: "Rua Manguba, 320, Carlopolis",
                  contact: "(43) 99148-8478",
                  plantaoHorario: "8:00h às 21:00h", 
                  plantaoData:"19/04 a 25/04",                  
                  delivery: "Sim / Sem Taxa",                     
                  facebook: "#",
                  instagram: "https://www.instagram.com/farmaciadavilaclps/",                     
                  novidadesImages: [               
                      "images/comercios/farmacia/farmaciaDaVila/divulgacao/1.png",
                      "images/comercios/farmacia/farmaciaDaVila/divulgacao/2.png",     
                      "images/comercios/farmacia/farmaciaDaVila/divulgacao/3.png",
                      "images/comercios/farmacia/farmaciaDaVila/divulgacao/4.png",
                      "images/comercios/farmacia/farmaciaDaVila/divulgacao/5.png",
                  ], 
                  novidadesDescriptions: [                            
                    "Venham nos visitar!",
                    "Indicado cólicas do trato gastrintestinal",
                    "indicado como analgésico (para dor) e antitérmico (para febre)",
                    "Indicado no alívio da dor associada a contraturas musculares, incluindo dor de cabeça tensional",
                    "Indicado para redução da febre e para o alívio de dores",
                  ],

                },


*/

                {
                  image: "images/comercios/farmacia/santaMaria/santamaria.png",
                  name: "Santa Maria",
                  address: "R. Benedito Salles, nº 711, Carlopols",
                  contact: "(43) 99840-9658",
                  plantaoHorario: "8:00h às 21:00h", 
                  plantaoData:"26/04 a 02/05",
                  
                  delivery: "Sim / Sem Taxa",
                  facebook: "https://www.facebook.com/farmaciasantamaria.carlopolis/",
                  instagram: "https://www.instagram.com/santamaria.farmaciaclps/",
                  
                  novidadesImages: [               
                      "images/comercios/farmacia/santaMaria/divulgacao/1.png",
                      "images/comercios/farmacia/santaMaria/divulgacao/2.png",     
                      "images/comercios/farmacia/santaMaria/divulgacao/3.png",
                      "images/comercios/farmacia/santaMaria/divulgacao/4.png",
                      "images/comercios/farmacia/santaMaria/divulgacao/5.png",
                  ], 
                  novidadesDescriptions: [                            
                    "Venham nos Visitar",
                    "Cólicas do trato gastrintestinal",
                    "Analgésico (para dor) antitérmico (para febre)",
                    "Alívio da dor associada a contraturas musculares, incluindo dor de cabeça tensional.",
                    "Redução da febre e para o alívio de dores",
                  ],
              },
















            ],
        
        },


  // INICIO SETOR PUBLICO



  {
    link: document.querySelector("#menuAgendamento"),    
    title: "Agendamento",
    establishments: [
        {
         
            name: "Agendamento",
            hours: "Seg a Sex: 8:30h - 12h, 13:30 as 17h",
            address: "-",
            contact: "(43) 99825-0996",
            contact2: "(43) 98872-8504",
            
        },
    ],
 },



  {
    link: document.querySelector("#menuAsilo"),    
    title: "Asilo",
    establishments: [
        {
            image: "images/setorPublico/asilo/asilo.png",
            name: "Asilo",
            hours: "Seg a Sex: 9h - 12h",
            address: "Rua Andrino Soares, 26",
            contact: "(43) 3566-1196",
        },
    ],
  },

  {
    link: document.querySelector("#menuAgenciaTrabalhador"),    
    title: "Agencia Trabalhador",
    establishments: [
        {
            image: "images/setorPublico/agenciaTrabalhador/AgenciaTrabalhador.png",
            name: "Agencia Trabalhador",
            hours: "Seg a Sex: 9h - 15h",
            address: "Rua Padre Hugo, 1025",
            contact: "(43) 3566-1291",
        },
    ],
  },

  {
    link: document.querySelector("#menuCras"),    
    title: "Cras",
    establishments: [
        {
            image: "images/setorPublico/cras/cras.png",
            name: "Cras",
            hours: "Seg a Sex: 9h - 15h",
            address: "R. Salvira Marquês, 366",
            contact: "(43) 98485-1626",
            facebook:"https://www.facebook.com/p/Cras-Carl%C3%B3polis-100013825331932/?locale=pt_PT",
        },
    ],
  },

  {
    link: document.querySelector("#menuCorreio"),    
    title: "Correio",
    establishments: [
        {
            image: "images/setorPublico/correio/correio.png",
            name: "Correio",
            hours: "Seg a Sex: 10h as 12h e 13h30 as 15:30",
            address: "R. Padre Hugo, 843 ",
            contact: "(43) 3566-1113",
            contact2:"(43) 3377-5023",
            facebook:"https://www.facebook.com/p/Cras-Carl%C3%B3polis-100013825331932/?locale=pt_PT",
        },
    ],
  },




  {
    link: document.querySelector("#menuCreche"),    
    title: "Creches",
    establishments: [
        {
        
            name: "Ainzara Rossi Salles C M e I",
            hours: "-",
            address: "Rua Jose Salles, 313",
            contact: "(43) 3566-1349 ",
            facebook:"#",
        },
     

        {
          
          name: "Isabel Dalla B da Silva C M e I Profa",
          hours: "-",
          address: "Av dos Diogossn",
          contact: "(43) 3566-2330",
          facebook:"#",
      },

      {
           
        name: "Marinha Fogaca de Oliveira C M e I",
        hours: "-",
        address: "Est Mun Espirito Santo, 95",
        contact: "(43) 3566-2705",
        facebook:"#",
      },
    ],
  },

        {
            link: document.querySelector("#menuHospital"),
            title: "Hospital",
            establishments: [
                {
                  image: "images/setorPublico/hospital/hospital.png",
                    name: "Hospital São Jose",
                    address: "R. Cap. Estácio, 460",
                    contact: "(43) 99174-2539",
                    hours: "24 horas",
                    
                },
            ],
        },

        {
          link: document.querySelector("#menuRodoviaria"),
          title: "Rodoviaria",
          establishments: [
              {
                image: "images/setorPublico/rodoviaria/rodoviaria.png",
                  name: "Rodoviaria",
                  address: "R. Kaliu keder, 0",
                  contact: "(43) 99926-6484",
                  hours: "Seg a Sex - 08:30 as 11:00, 13:30 as 16:00, 23:00 as 23:40<br>Sab: 08:30 as 11:00<br>Dom: 23:30 as 23:40",
                  infoAdicional:"<a style='color:#2da6ff;' href='https://queropassagem.com.br/rodoviaria-de-carlopolis-pr?wpsrc=Google%20AdWords&wpcid=15361090317&wpsnetn=x&wpkwn=&wpkmatch=&wpcrid=&wpscid=&wpkwid=&gad_source=1&gad_campaignid=15361092411&gbraid=0AAAAADpKqgF9tpsAwMZNVxXOyQz1HO5FS&gclid=Cj0KCQjwt8zABhDKARIsAHXuD7bNWFyJzC0hKW5n8saZVgNqiBJbBtlcDLdxbyVAsun4w8d07isBGGIaAnL7EALw_wcB'>Compre sua Passagem</a>",
                
                  
              },
          ],
        },
  
        {
            link: document.querySelector("#menuPrefeitura"),
    
            title: "Prefeitura",
            establishments: [
                {
                  image: "images/setorPublico/prefeitura/prefeitura.png",
                    name: "Prefeitura",
                    address: "R. Benedito Salles, 1060 - Centro",
                    contact: "(43) 3566-1291",
                    hours: "8h as 11:30 - 13h as 17h",
                   
                    facebook: "https://www.facebook.com/profile.php?id=200531799983410&_rdr",
                    instagram: "www.instagram.com/uahhhttps://www.instagram.com/prefeitura.carlopolis/?locale=zh_CN&hl=af",
                    site: "http://www.carlopolis.pr.gov.br/",
                },
        
                {
                  image: "images/setorPublico/prefeitura/prefeitura.png",
                    name: "Duvidas e  Reclamações",
                    contact: "(43) 99825-0360",
                    hours: "8h as 17h",
                
                },
            ],
        },


    
        {
            link: document.querySelector("#menuCopel"),    
            title: "Copel",
            establishments: [
                {
                    image: "images/setorPublico/copel/copel.png",
                    name: "Copel",
                    hours: "Seg a Sex: 8h - 12h",
                    address: "R. Benedito Salles, 1094",
                    contact: "(41) 3013-8973",
                },
            ],
        },
  
        {
            link: document.querySelector("#menuDelegacia"),
    
            title: "Delegacia",
            establishments: [
                {
                    image: "images/setorPublico/delegacia/delegacia.jpg",
                    name: "Delegacia",
                    hours: "Seg a Sex: 9h - 18h",
                    address: "R. Alfeneiro, 215 ",
                    contact: "(43) 3566-1202",
                },
            ],
        },



        {
          link: document.querySelector("#menuEscolaPublica"),
  
          title: "Escola Publica",
          establishments: [


            {
              image: "images/setorPublico/escolaPublica/benedito.png",
              name: "Benedito Rodrigues de Camargo",
              hours: "Seg a Ssex: 9h - 18h",
              address: "Avenida Elson Soares, 295",
              contact: "(43) 3566-1496",
              infoAdicional:"Turno: Manha e Tarde",
          },

            {
              image: "images/setorPublico/escolaPublica/carolinaLupion.png",
              name: "Carolina Lupion",
              hours: "Seg a Sex: 9h - 18h",
              address: "R. Jorge Barros, 1095",
              contact: "(43) 3566-1295",
              infoAdicional:"Turno: Manha e Tarde",
          },



              {
                  image: "images/setorPublico/escolaPublica/raymunda.png",
                  name: "CMEI Raymunda Santana Salles",
                  hours: "Seg a sex: 9h - 18h",
                  address: "Rua Nicolau Miguel, 233",
                  contact: "(43) 3566-2273",
                  infoAdicional:"Turno: Manha",
              },

             

            {
              image: "images/setorPublico/escolaPublica/joseSalles.png",
              name: "Escola Municipal José Salles",
              hours: "Seg a Sex: 07:45h - 17h",
              address: "R. Quaresmeira Roxa, 418-458",
              contact: "(43) 3566-1275",
              infoAdicional:"Turno: Manha e Tarde",
          },

          {
            image: "images/setorPublico/escolaPublica/hercilia.png",
            name: "Hercília de Paula e Silva",
            hours: "Seg a Sex: 06:30h - 18:30h",
            address: "Av. Elson Soares, 34",
            contact: "(43) 3566-1282",
            infoAdicional:"Turno: Manha e Tarde",
        },
          ],
      },


      {
        link: document.querySelector("#menuPostoSaude"),    
        title: "Posto de Saude",
        establishments: [
            {
                image: "images/setorPublico/postoSaude/joseAparecido.png",
                name: "Centro de Saude Dr José",                
                hours: "Seg a Sex: 8:00h as 17h",
                address: "Avenida Elson Soares,769",
                contact: "(43) 3566-1328",
               
            },
           
            {
              image: "images/setorPublico/postoSaude/eugenioNeves.png",
                name: "UBS Eugênio Neves Soares",
                hours: "Seg a Sex: 8:00h as 17h",
                address: "Rua Bauínea,79",
                contact: "(43) 3566-1932",
               
            },
        ],
      },



  
        {
            link: document.querySelector("#menuSanepar"),    
            title: "Sanepar",
            establishments: [
                {
                  image: "images/setorPublico/sanepar/sanepar.png",
                    name: "Sanepar",
                    hours: "Seg a Sex: 8:30h - 12h, 13:30 as 17h",
                    address: "R. André Jorge Cleli, 148 ",
                    contact: "0800 200 0115",
                    
                },
            ],
        },

        {
          link: document.querySelector("#menuSamuzinho"),    
          title: "Samuzinho",
          establishments: [
              {
                
                  name: "Samuzinho",
                  hours: "Seg a Sex: 8:30h - 12h, 13:30 as 17h",
                  address: "-",
                  contact: "(43) 99825-0248",
                  
              },
          ],
      },


      {
        link: document.querySelector("#menuSecretariaSaude"),    
        title: "Secretaria da Saude",
        establishments: [
            {
             
                name: "Secretaria da Saude",
                hours: "Seg a Sex: 8:30h - 12h, 13:30 as 17h",
                address: "-",
                contact: "(43) 3566-1328",
                
            },
        ],
     },


     {
      link: document.querySelector("#menuVigilanciaSanitaria"),    
      title: "Vigilancia Sanitaria",
      establishments: [
          {
           
              name: "Vigilancia Sanitaria",
              hours: "Seg a Sex: 8:30h - 12h, 13:30 as 17h",
              address: "-",
              contact: "(43) 99825-1079",
              
          },
      ],
   },


// FIM SETOR PUBLICO

        {
            link: document.querySelector("#menuVagasTrabalho"),    
            title: "Vagas de Trabalho",
            establishments: [
                {
                    name: "Moto Taxi Modesto",
                    hours: "Seg a Dom: 7h - 20h",
                    address: "R. Kelil Keder, 603",
                    contact: "(43) 99137-5516",
                    image: "images/informacoes/VagasTrabalho/modesto/modesto.png",
                    infoVagaTrabalho:"Precisa-se de motoboy",
                },
            ],
        },
  
        {
            link: document.querySelector("#menuMotoCenter"),  
            title: "Moto Center",
            establishments: [
                {
                  image: "images/comercios/motoCenter/binho/perfil.png",
                    name: "Binho Moto Center",
                    hours: "Seg a Sex: 8h - 18h </br> Sab: 08h - 14h",
                    address: "R. Luis Consulmagno de Proenca, 451 - Carlópolis",
                    contact: " (43) 99903-3447",
                    delivery: "Sim / Sem Taxa",
                    instagram:"https://www.instagram.com/binhomotocenter/",
                    facebook:"https://www.facebook.com/Motocenterbinho/?locale=pt_BR",
                    novidadesImages: [               
                      "images/comercios/motoCenter/binho/divulgacao/1.png",
                      "images/comercios/motoCenter/binho/divulgacao/2.png",     
                      "images/comercios/motoCenter/binho/divulgacao/3.png",
                     
                  ], 
                  novidadesDescriptions: [                            
                    "1",
                    "2",
                    "3",
                  
                  ],
                },
            ],
        },

        
        {
            link: document.querySelector("#menuBorracharia"),  
            title: "Borracharia",
            establishments: [
                {
                    image: "images/comercios/borracharia/vidaNova/vidanova.png",
                    name: "Vida Nova",
                    hours: "Seg a Sex: 7h - 18h </br>Sab: 07 - 16h",
                    address: "Rua genova 10 Anexo ao Posto Garbelotti - Res. Italia",
                    contact: "(43) 99900-2991",
                    novidadesImages: [               
                      "images/comercios/borracharia/vidaNova/divulgacao/1.png",
                      "images/comercios/borracharia/vidaNova/divulgacao/2.png",     
                      "images/comercios/borracharia/vidaNova/divulgacao/3.png",
                     
                  ], 
                  novidadesDescriptions: [                            
                    "Pneus para Tratores",
                    "Manutenção no local",
                    "Manutenção no local",
                  
                  ],
                },
            ],
        },
  
        {
            link: document.querySelector("#menuAutoCenter"),    
            title: "Auto Center",
            establishments: [
                {
                    name: "Auto center bairro",
                    hours: "seg a sex: 8h - 18h </br> sab: 08 - 12h",
                    address: "R. Laurindo Franco de Godoi, 90",
                    contact: "(43) 99951-1540",
                    delivery: "Sim / Sem Taxa",
                },
            ],
        },
  
        {
            link: document.querySelector("#menuBrinquedos"),    
            title: "Loja de Brinquedos",
            establishments: [
                {
                    name: "Filho Otaviano",
                    hours: "Seg a Sex: 8h - 18h </br> Sab: 08h - 12h",
                    address: "R. Laurindo Franco de Godoi, 90",
                    contact: "(43) 99951-1540",
                    delivery: "Sim / Sem Taxa",
                },
            ],
        },
  
        {
            link: document.querySelector("#menuDiskGas"),    
            title: "Deposito de Gas",
            establishments: [
                {
                  image: "images/comercios/depositoGas/liaGas/liaGas.png",
                    name: "Lia Gas",
                    hours: "Seg a Sab: 8h - 20h </br> Dom: 08h - 12h",
                    address: "R. Kalil Keder, 910",
                    contact: "(43) 99821-7243",
                    delivery: "Sim / Sem Taxa",
                    facebook:"https://www.facebook.com/liagasclps/",
                    novidadesImages: [               
                      "images/comercios/depositoGas/liaGas/divulgacao/1.png",
                      "images/comercios/depositoGas/liaGas/divulgacao/2.png",                    
                     
                  ], 
                  novidadesDescriptions: [                            
                    "Botijao em estoque",
                    "Temos agua Cristal",                   
                  ],
                },

                {
                  image: "images/comercios/depositoGas/cnCasaDoGas/perfil.png",
                    name: "CN Casa do Gas",
                    hours: "Seg a Sab: 8h - 19h </br> Dom: 08h - 12h",
                    address: "Avenida Elson Soares, 1048, Carlopolis",
                    contact: "(43) 99829-5216",
                    delivery: "Sim / Sem Taxa",
                    facebook:"https://www.facebook.com/people/CN-Casa-do-G%C3%A1s/100068139145901/",
                    instagram:"https://www.instagram.com/ultracarlopolis/",
                    novidadesImages: [               
                      "images/comercios/depositoGas/cnCasaDoGas/divulgacao/1.png",
                                          
                     
                  ], 
                  novidadesDescriptions: [                            
                    "Botijao em estoque",
                                    
                  ],
                },
            ],
        },
  
        {
            link: document.querySelector("#menuFuneraria"),    
            title: "Funerarias",
            establishments: [
                {
                    name: "Bom Jesus",
                    hours: "seg a sex: 8h - 18h </br> sab: 08 - 12h",
                    address: "R. Laurindo Franco de Godoi, 90",
                    contact: "(43) 99951-1540",
                    delivery: "Sim / Sem Taxa",
                },
            ],
        },


        {
            link: document.querySelector("#menuMercearia"),  
            title: "Mercearia",
            establishments: [
                {
                    image: "images/comercios/mercearia/seiza/seiza.png",
                    name: "Seiza",
                    hours: "Seg a Qui 9h - 18:30h </br>Sex 9h - 16:30 </br> sab: 09 - 12h",
                    address: "R. Fidêncio de Melo, 212 - Sala B",
                    contact: "(43) 99103-4187",
                    delivery: "Sim / Sem Taxa",            
                    instagram: "https://www.instagram.com/seizapr/",
                
                },
            ],
        },

        {
            link: document.querySelector("#menuMaterialContrucao"),    
            title: "Material de Construção",
            establishments: [
                {
                    name: "Carriel",
                    hours: "seg a sex: 8h - 18h </br> sab: 08 - 12h",
                    address: "R. Laurindo Franco de Godoi, 90",
                    contact: "(43) 99951-1540",
                    delivery: "Sim / Sem Taxa",
                },
            ],
        },
  
        
  
        {
            link: document.querySelector("#menuPetShop"),    
            title: "Pet Shop",
            establishments: [
                {
                    name: "Paraiso dos Animais",
                    hours: "seg a sex: 8h - 18h </br> sab: 08 - 12h",
                    address: "R. Laurindo Franco de Godoi, 90",
                    contact: "(43) 99951-1540",
                    delivery: "Sim / Sem Taxa",
                },
            ],
        },
  
        {
            link: document.querySelector("#menuQuitanda"),  
            title: "Quitanda",
            establishments: [
                {
                  image: "images/comercios/quitanda/pimentadoce.png",
                    name: "Pimenta Doce",
                    hours: "Dom a Dom: 8h - 20h",
                    address: "Rua kalil keder 491 centro",
                    contact: "(43) 98806-5747",
                    delivery: "Não",
                    
                    novidadesImages: [
                        "images/comercios/quitanda/divulgacao/1.png",
                        "images/comercios/quitanda/divulgacao/2.png",
                        "images/comercios/quitanda/divulgacao/3.png",
                        "images/comercios/quitanda/divulgacao/4.png",
                        "images/comercios/quitanda/divulgacao/5.png",
                    ],
                },
            ],
        },
  
        {
            link: document.querySelector("#menuRestaurantes"),    
            title: "Restaurante",
            establishments: [
              {
                image: "images/comercios/restaurante/assadaoRussao/assadaoRussao.png",
                name: "Assadão do Russão",
                hours: "Seg a Sab: 10:30h - 14h",
                address: "Rua Benedito Salles 1241",
                contact: "(43) 9838-7570",
                delivery: "Sim / Com Taxa",
                
              novidadesImages: [                    
                  "images/comercios/restaurante/assadaoRussao/divulgacao/1.png",                        
                 "images/comercios/restaurante/assadaoRussao/divulgacao/2.png",
                 "images/comercios/restaurante/assadaoRussao/divulgacao/3.png",
                 
              ],
              
            },

            {
              image: "images/comercios/restaurante/cantinaItaliana/perfil.png",
              name: "Cantina Italiana",
              hours: "Seg: 17:30h a 23h <br> Ter: Fechado<br>Qua a Dom: 17:30h a 23h",
              address: "R. Padre Hugo - Carlópolis",
              contact: "(43) 99640-4484",
              delivery: "Sim / Com Taxa", 
              novidadesImages: [                    
                "images/comercios/restaurante/cantinaItaliana/divulgacao/1.png",
                 "images/comercios/restaurante/cantinaItaliana/divulgacao/2.png",
                 "images/comercios/restaurante/cantinaItaliana/divulgacao/3.png",
                 "images/comercios/restaurante/cantinaItaliana/divulgacao/4.png",
                 "images/comercios/restaurante/cantinaItaliana/divulgacao/5.png",
              ],
              menuImages: [                   
                "images/comercios/restaurante/cantinaItaliana/cardapio/1.png",
                "images/comercios/restaurante/cantinaItaliana/cardapio/2.png", 
                "images/comercios/restaurante/cantinaItaliana/cardapio/3.png",           
                       
            ],
      
          },

            {
              image: "images/comercios/restaurante/paiol/paiol.png",
              name: "Paiol",
              hours: "Ter: 10h a 15h<br>Qua - Sab: 10h a 15h - 18h30 a 23h <br> Dom: 11h a 15h<br>Seg: Fechado",
              address: "Rua Benedito Salles 10, Carlópolis,",
              contact: "(43) 99159-0070",
              delivery: "Sim / Com Taxa",
              facebook: "https://www.facebook.com/SaleBrasaCarlopolis/?locale=pt_BR",
              instagram: "https://www.instagram.com/paiolpizzaburguer/",
              infoAdicional:"<a style='color:#2da6ff;' href='https://shop.beetech.com.br/churrascoegastronomia'>Cardapio On Line</a>",
             
             
              novidadesImages: [                    
                  "images/comercios/restaurante/paiol/divulgacao/1.png",
                 "images/comercios/restaurante/paiol/divulgacao/2.png",
                 "images/comercios/restaurante/paiol/divulgacao/3.png",
                 "images/comercios/restaurante/paiol/divulgacao/4.png",
              ],
      
          },




          





                {
                    image: "images/comercios/restaurante/delfino/delfino.png",
                    name: "Delfino",
                    hours: "Seg a Sex: 11h - 15h / 18h - 22:30h</br> Sab: 11h - 16h",
                    address: "R. Kalil Keder, 90",
                    contact: "(43) 9111-9484",
                    delivery: "Sim / Com Taxa",
                  
                },
                {
                  image: "images/comercios/restaurante/neia/neia.png",
                  name: "Neia",
                  hours: "Seg a Sex: 11h - 14h <br>Sab: 11h - 16h",
                  address: "R. Kalil Keder, 262 ",
                  contact: "(43) 99847-1137",
                  delivery: "Sim / Com Taxa",
                  
              },

              






                {
                  image: "images/comercios/restaurante/portal/portal.png",
                    name: "Portal",
                    hours: "Seg a Qui: 19h - 21h",
                    address: "R. Benedito Salles, 2023",
                    contact: "(43) 3566-2174",
                    delivery: "Sim / Com Taxa",
                    infoAdicional:"Fica dentro do Hotel Portal",
                    novidadesImages: [                    
                      "images/comercios/restaurante/portal/divulgacao/1.png",
                     "images/comercios/restaurante/portal/divulgacao/2.png",
                     "images/comercios/restaurante/portal/divulgacao/3.png",
                     "images/comercios/restaurante/portal/divulgacao/4.png",
                     "images/comercios/restaurante/portal/divulgacao/5.png",
                  ],
                    
                },


              

                {
                  image: "images/comercios/restaurante/saborRoca/saborRoca.png",
                  name: "Sabor da Roça",
                  hours: "Seg a Sab: 10:30h - 14h",
                  address: "R. Benedito Salles, 365",
                  contact: "(43) 99832-3050",
                  delivery: "Sim / Com Taxa",
                
              },

              {
                image: "images/comercios/restaurante/selaht/selaht.png",
                name: "Selaht Grill",
                hours: "Ter a Dom: 11h - 23h",
                address: "R. Padre Hugo, 460",
                contact: "(43) 9 9160-5120",
                delivery: "Sim / Com Taxa",
                facebook:"https://www.facebook.com/selaht.gastronomia",
                instagram:"https://www.instagram.com/selaht.gastronomia/",
                infoAdicional:"<a style='color:#2da6ff;' href='https://eatfood.app/cardapio/58qt9yj5dqgt2timpqd7'>Cardapio On Line</a>",
                menuImages: [                   
                  "images/comercios/restaurante/selaht/cardapio/1.png",          
                         
              ],
              novidadesImages: [                    
                  "images/comercios/restaurante/selaht/divulgacao/1.png",
                 "images/comercios/restaurante/selaht/divulgacao/2.png",
                 "images/comercios/restaurante/selaht/divulgacao/3.png",
                 "images/comercios/restaurante/selaht/divulgacao/4.png",
              ],
            },


            {
              image: "images/comercios/restaurante/restauranteDaDi/restauranteDaDi.png",
              name: "Restaurante da Di",
              hours: "Seg a Sab: 10:30h - 14h",
              address: "Benedito Salles n°910",
              contact: "(43) 99632-3418",
              delivery: "Sim / Com Taxa",
              instagram:"https://www.instagram.com/marmitasdadiih/",
              novidadesImages: [                    
                "images/comercios/restaurante/restauranteDaDi/divulgacao/1.png",
               "images/comercios/restaurante/restauranteDaDi/divulgacao/2.png",
               "images/comercios/restaurante/restauranteDaDi/divulgacao/3.png",
               "images/comercios/restaurante/restauranteDaDi/divulgacao/4.png",
            ],
            
          },


          {
            image: "images/comercios/restaurante/yingyang/yingyang.png",
            name: "Ying Yang",
            hours: "Seg a Sab: 18h - 23h <br> Sab e Dom: 10h30 - 14h",
            address: "Benedito Salles n°910",
            contact: "(43) 99954-0831",
            delivery: "Sim / Com Taxa",
            instagram:"https://www.instagram.com/yingyang_comidachinesa/",
            facebook:"https://www.facebook.com/p/Ying-yang-100063519044209/",
            menuImages: [                   
              "images/comercios/restaurante/yingyang/cardapio/1.jpeg",  
              "images/comercios/restaurante/yingyang/cardapio/2.jpeg", 
              "images/comercios/restaurante/yingyang/cardapio/3.jpeg", 
              "images/comercios/restaurante/yingyang/cardapio/4.jpeg", 
              "images/comercios/restaurante/yingyang/cardapio/5.jpeg", 
              "images/comercios/restaurante/yingyang/cardapio/6.jpeg", 
              "images/comercios/restaurante/yingyang/cardapio/7.jpeg",  
              "images/comercios/restaurante/yingyang/cardapio/8.jpeg",        
                     
          ],
            novidadesImages: [                    
            "images/comercios/restaurante/yingyang/divulgacao/1.png",
             "images/comercios/restaurante/yingyang/divulgacao/2.png",
             "images/comercios/restaurante/yingyang/divulgacao/3.png",
             "images/comercios/restaurante/yingyang/divulgacao/4.png",
             "images/comercios/restaurante/yingyang/divulgacao/5.png",
          ],
          novidadesDescriptions: [  

         "1",
         "2",
         "3",
         "4",
         "5",
          ],
        },



            ],
        },


        {
          link: document.querySelector("#menuMoveis"),    
          title: "Moveis",
          establishments: [
              {
                image: "images/comercios/moveis/movepar/perfil.png",
                  name: "Movepar",
                  hours: "Seg a Sex: 8h - 18h </br> Sab: 08h - 12h<br> Dom: Fechado",
                  address: "R. Benedito Salles, 627 - Carlópolis",
                  contact: "(43) 3566-2749",
                  instagram:"https://www.instagram.com/movepar_carlopolis/",
                  novidadesImages: [                    
                    "images/comercios/moveis/movepar/divulgacao/1.png",
                     "images/comercios/moveis/movepar/divulgacao/2.png",
                   
                  ],
                  novidadesDescriptions: [  
        
                 "1",
                 "2",
                
                  ],
              },
          ],
      },


  
        {
            link: document.querySelector("#menuPapelaria"),    
            title: "Papelaria",
            establishments: [
                {
                    name: "Haruo",
                    hours: "Seg a Sex: 8h - 18h </br> Sab: 08h - 12h",
                    address: "R. Laurindo Franco de Godoi, 90",
                    contact: "(43) 99951-1540",
                },
            ],
        },
  
        {
            link: document.querySelector("#menuImobiliaria"),  
            title: "Imobiliaria",
            establishments: [
                {
                    name: "Rafael Bandeira",
                    hours: "Seg a Sex: 8h - 18h </br> Sab: 08h - 12h",
                    address: "R. Laurindo Franco de Godoi, 90",
                    contact: "(43) 99951-1540",
                },
            ],
        },
  
       
  
        
  
        {
            link: document.querySelector("#menuTaxista"),  
            title: "Taxista",
            establishments: [
                {
                    name: "Douglas do Taxi",
                    hours: "Seg a Sab: 7h - 20h </br> Dom: 07 - 00h",
                    address: "Em Frente ao banco Itau",
                    contact: "(43) 88807-8515",
                },
            ],
        },
    
      
        

    ]; 
    

    



    
  
  
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




${establishment.contact || establishment.contact2 ? (() => {
  const formatPhone = (number) => {
    const rawNumber = (number || "").replace(/\D/g, "");
    const fullNumber = rawNumber.startsWith("55") ? rawNumber : `55${rawNumber}`;
    return fullNumber;
  }

  const firstNumber = formatPhone(establishment.whatsapp || establishment.contact || "");
  const secondNumber = establishment.contact2 ? formatPhone(establishment.contact2) : null;

  return `
    <div class="info-box">
      <div>
        <div class="info-label">Contato</div>
        <div class="info-value">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
            <a href="https://api.whatsapp.com/send?phone=${firstNumber}&text=${encodeURIComponent(
              "Olá! Encontrei seu número no Site Olá Carlópolis e gostaria de uma informação!"
            )}" target="_blank">
              <i class='bx bxl-whatsapp info-icon' style="color: #25D366; font-size: 24px;"></i>
            </a>
            <span>${establishment.contact}</span>
          </div>
          ${
            secondNumber
              ? `<div style="display: flex; align-items: center; gap: 8px;">
                  <a href="https://api.whatsapp.com/send?phone=${secondNumber}&text=${encodeURIComponent(
                    "Olá! Encontrei seu número no Site Olá Carlópolis e gostaria de uma informação!"
                  )}" target="_blank">
                    <i class='bx bxl-whatsapp info-icon' style="color: #25D366; font-size: 24px;"></i>
                  </a>
                  <span>${establishment.contact2}</span>
                </div>`
              : ""
          }
        </div>
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
              <i class="fas fa-camera"></i>  Divulgação (${establishment.novidadesImages.length})
            </button>
          ` : ''}
          
          ${establishment.menuImages && establishment.menuImages.length > 0 ? `
            <button  id="cardapioButton" class="menu-btn" data-name="${establishment.name}" data-id="${normalizeName(establishment.name)}">
              <i class="fas fa-utensils"></i>  Cardápio (${establishment.menuImages.length})
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
  
    function loadPaidEstablishments() {
      const categories = window.categories || [];
      categories.forEach((category) => {
        loadContent(category.title, category.establishments);
      });
    }
  
    document.addEventListener("DOMContentLoaded", function () {
      loadPaidEstablishments();
    });
  
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
          loadContent(category.title, category.establishments);
  
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




    
  });
  