document.addEventListener("DOMContentLoaded", function () {
    // pagou? defina por s pago n nao pago // PAGx
    const statusEstabelecimentos = {
      // COMERCIOS:

      //AÇAI
      turminhadoaçai:"s",

      // ADEGAS
      adegacuenca: "s",
  
      //ADVOCACIA
  
      advocaciaabilio: "s",
  
      //Açougue
      açouguedocarlinho: "s",
  
      // Agropecuaria
      agrovida: "s",
      armazémrei:"s",

      //confecção
      yellowjeans:"s",
  
      // borracharia
      vidanova: "s",
  
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

      // mercearia
      seiza:"s",

      // padaria
      bomjesus:"s",
      sãofrancisco:"s",
      
  
      //pizzaria
      fornalhapizzaria: "s",
  
      // quitanda
      pimentadoce: "s",
  
      //lanchonete
      ocasarao: "s", // Casarao pagou
      paiol: "s", // Paiol pagou
  
      //supermercado
      mercadorocha: "s", // Mercado Rocha pagou
      carreiro: "s", // Carreiro pagou
      obarateiro: "s", // O Barateiro pagou
      kelve: "s", // Kelve não pagou
      rocha: "s", // Rocha pagou
  
      // pesqueiro
      peskepagueaguamarine: "s",

      // restaurantes
      cabanas:"s",
      delfino:"s",
      portal:"s",
      neia:"s",
      sabordaroça:"s",
  
      //// FIM COMERCIO ////////////////////////////////////////////////////////////////////////////////////////
  
      //// INICIO SERCIÇOS ////////////////////////////////////////////////////////////////////////////////////////////////
  
     
  
      //anuncio
      piodoanuncio: "s",
  
      // churrasqueiro
      pituka: "s",
  
      //diarista
      rose: "s",
  
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
      copel: "s",
      delegacia: "s",
      hospitalsãojose: "s",
      prefeitura: "s",
      duvidasereclamações: "s",
      sanepar: "s",
      mototaximodesto: "s",
  
      //Eventos
      calendarioeventos: "s",
      lixoeletronico: "s",
      triathlon: "s",
      pescar: "s",
      coletalixoeletronico: "s",
      feiradalua: "s",
  
      //// INICIO INFORMAÇOES UTEIS



      ///

      rodoviaria:"s",
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
    menuLinks.forEach((link) => {
      link.addEventListener("click", function () {
        if (!this.classList.contains("submenu_item")) {
          // Fecha o menu lateral
          sidebar.classList.remove("open");
          overlay.classList.remove("active");
    
          // Limpa campo de busca
          searchInput.value = "";
          clearSearch.style.display = "none";
    
          // Força o menu a voltar completo na próxima vez
          searchInput.dispatchEvent(new Event("input"));
        }
      });
    });
    
  
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
                {
                    link: document.querySelector("#menuAcai"),    
                    title: "Açai",
                    establishments: [
                        {
                            image: "images/comercios/acai/faxada.png",
                            name: "Turminha do Açai",
                            hours: "<br>Qua a Seg: 14h - 23h </br> Ter: Fechado",
                            address: "<br>Rua Benedito Salles, 409",
                            contact: "<br>(43) 99176-7871",
                            delivery: "Sim / Com Taxa",
                            instagram: "https://www.instagram.com/turminha_do_acai/",
                            infoAdicional:"<br>Espetinhos a partir de Quinta até<br> Domingo",
                            novidadesImages: [            
                            "images/comercios/acai/novidades/1.png",                                            
                            ],
                            novidadesDescriptions: [                            
                              "Promoção especial de pães e bolos nesta semana!",
                          ],
                            menuImages: [                    
                                "images/comercios/acai/cardapio/1.png",
                                "images/comercios/acai/cardapio/2.png",
                                "images/comercios/acai/cardapio/3.png",
                            ],
                        
                        },
                    ],
                },

                {
                    link: document.querySelector("#menuAcougue"),  
                    title: "Açougues",
                    establishments: [
                        {
                            image: "images/comercios/acougue/acougue.png",
                            name: "Açougue do Carlinho",
                            hours: "seg a sex: 8h - 18h </br> sab: 08 - 12h",
                            address: "Rua Benedito Salles, 409",
                            contact: "(43) 99635-1001",
                            delivery: "Sim / Sem Taxa",
                            novidadesImages: [ 
                            "images/comercios/acougue/banner/banner_1.jpg",
                            "images/comercios/acougue/banner/banner_2.jpg",
                            ],
                        },
                    ],
                },

                {
                    link: document.querySelector("#menuAdega"),    
                    title: "Adegas",
                    establishments: [
                        {
                            image: "images/comercios/adega/adega_cuenca.jpg",
                            name: "Adega Cuenca",
                            hours:
                            "</br>seg 09:00h - 19:30h </br> ter e qua 09:00 - 22:00h </br> qui a sab 09:00 - 23:50 </br> dom 09:00 - 22:00h",
                            address: "<br>R. Kalil Keder, 752",
                            contact: "</br>(43) 99800-1680",
                            delivery: "</br>Sim / Sem Taxa",
                        },
                    ],
                },

                {
                    link: document.querySelector("#menuAgropecuaria"),  
                    title: "Agropecuarias",
                    establishments: [

                        {
                            image: "images/comercios/agropecuaria/armazem Rei/armazemRei.png",
                            name: "ARMAZÉM REI",
                            hours: "</br>seg a Sab: 8h - 19h </br> Dom: 08h - 12h",
                            address: "<br>R. Kalil Keder, 718",
                            contact: "</br> (43) 99185-6532",
                            delivery: "</br>Sim / Sem Taxa",
                            facebook: "#",
                            instagram: "#",
                            novidadesImages: [
                                // Novo array de imagens de novidades
                                "images/comercios/agropecuaria/armazem rei/novidades/1.png",
                              "images/comercios/agropecuaria/armazem rei/novidades/2.png",
                            ],
                        },
                        {
                            image: "images/comercios/agropecuaria/vida nova/vidanova.png",
                            name: "Agro Vida",
                            hours: "</br>seg a sex: 8h - 18h </br> sab: 08 - 16h",
                            address: "<br>rua benedito salles 309",
                            contact: "</br>(43) 99158-9047",
                            delivery: "</br>Sim / Sem Taxa",
                            facebook: "https://www.facebook.com/AgroVidaCarlopolis/?locale=pt_BR",
                            instagram: "https://www.instagram.com/agrovida_carlopolis/",
                            
                        },

                        
                    ],
                },

                {
                    link: document.querySelector("#menuAdvocacia"),    
                    title: "Escritorio de Advocacia",
                    establishments: [
                        {
                            name: "ADVOCACIA ABILIO",
                            hours: "</br>seg a sex: 9h - 11:30h, 13:00-17:00",
                            address: "<br>R. Salvira Marquês, 315",
                            contact: "</br>(43) 3566-1368",
                        },
                    ],
                },

                {
                    link: document.querySelector("#menuConfecção"),    
                    title: "Confecção",
                    establishments: [
                        {
                            name: "Yellow Jeans",
                            hours: "</br>seg a sex: 9h - 11:30h, 13:00-17:00",
                            address: "<br>Rua Maria Pereira da Rocha Aleixo, 435",
                            contact: "</br>(43) 998070671",
                        },
                    ],
                },

                {
                    link: document.querySelector("#menuLanchonete"),
                    title: "Lanchonetes",
                    establishments: [
                        {
                            image: "images/comercios/lanchonete/casarao/faxada_casarao.png",
                            name: "O Casarao",
                            hours: "</br>Ter - Dom - 18h - 00:30h",
                            address: "<br>R. Benedito Salles, 1340",
                            contact: "</br>(43) 99693-0565",
                            delivery: "</br>Sim / Com Taxa",
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
                              // Novo array de imagens de novidades
                              "images/comercios/lanchonete/casarao/novidades/1.png",
                             "images/comercios/lanchonete/casarao/novidades/2.png",
                             "images/comercios/lanchonete/casarao/novidades/3.png",
                             "images/comercios/lanchonete/casarao/novidades/4.png",
                             "images/comercios/lanchonete/casarao/novidades/5.png",
                          ],               
                        },
                  

                {
                    image: "images/comercios/lanchonete/paiol/paiol.png",
                    name: "Paiol",
                    hours: "qua - dom 19 - 00h",
                    address: "Av. Elson Soares, 767 ",
                    contact: "(43) 99159-0070",
                    delivery: "Sim / Sem Taxa",
                    facebook: "www.facebook.com/uahh",
                    instagram: "www.instagram.com/uahh",
                    site: "www.google.com",  
                    menuImages: [
                        // Agora é um array de imagens
                        "images/comercios/lanchonete/paiol/cardapio/1.png",
                        "images/comercios/lanchonete/paiol/cardapio/2.png",
                        "images/comercios/lanchonete/paiol/cardapio/3.png",
                               
                    ],
                    novidadesImages: [
                        // Novo array de imagens de novidades
                        "images/comercios/lanchonete/paiol/novidades/1.png",
                       "images/comercios/lanchonete/paiol/novidades/2.png",
                       "images/comercios/lanchonete/paiol/novidades/3.png",
                       "images/comercios/lanchonete/paiol/novidades/4.png",
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
                    image: "images/comercios/pizzaria/fornalha.png",
                    name: "Fornalha Pizzaria",
                    hours:"</br>Quarta - Quinta: 18 - 23h </br> Sexta - Sabado: 18 - 00h </br> Domingo: 18 - 23h",
                    address: "<br>R. Benedito Salles, 837",
                    contact: "</br>(43) 99632-1310",
                    delivery: "</br>Sim / Com Taxa",
                    facebook: "https://www.facebook.com/p/Fornalha-Fornalha-100054510698755/?locale=pt_BR",
                    instagram: "https://www.instagram.com/_fornalhapizzaria_/",    
                    menuImages: [                
                        "images/comercios/pizzaria/cardapio_fornalha.jpg",
                        "images/comercios/pizzaria/cardapio_fornalha_2.jpg",
                    ],            
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
                    hours: "</br>Sex a  - Dom: 09:30 - 18",
                    address: "<br>Rod. Jose Alves Pereira",
                    contact: "</br>(43) 98808-1911",
                    delivery: "</br>Sim / Com Taxa",
                    facebook: "www.facebook.com/uahh",
                    instagram: "www.instagram.com/uahh",
                    menuImages: [
                    // Agora é um array de imagens
                     "images/comercios/pesqueiro/cardapio_aguamarine.jpg",
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
                    hours: "</br>seg a Sab: 6h - 19h </br> Dom: 06 - 14h",
                    address: "R. Benedito Salles, 615",
                    contact: " (43) 99653-9285",
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
                  image: "images/comercios/padaria/saoFrancisco/saoFrancisco.png",
                  name: "São Francisco",
                  hours: "</br>seg a Sab: 5:30h - 19h </br> Dom: 5:30h - 12h",
                  address: "R. Benedito Salles, 881",
                  contact: " (43) 98873-1488",
                  delivery: "Sim / Com Taxa",
                  facebook: "#",
                  instagram: "#",
                  novidadesImages: [
                      // Novo array de imagens de novidades
                      "images/comercios/padaria/saoFrancisco/novidades/4.png",
                      "images/comercios/padaria/saoFrancisco/novidades/3.png",
                      "images/comercios/padaria/saoFrancisco/novidades/5.png",
                      "images/comercios/padaria/saoFrancisco/novidades/2.png",
                      "images/comercios/padaria/saoFrancisco/novidades/1.png",
                     
                  ],
              },







            ],
        },






      // Eventos
        {
            link: document.querySelector("#menuEventos"),
            title: "Eventos em Carlópolis",
            establishments: [
                {
                    name: "Calendario Eventos",
                    image: "images/info_uteis/eventos/evento_1/calendario_evento.png",
                    contact: "",
                },
    
                {
                    image: "images/info_uteis/eventos/evento_3/lixoEletronico.png",
                    name: "Coleta Lixo Eletronico",
                    date: "05/03/25 a 20/04/2025",
                    address: "Paroquia Senhor Bom Jesus",
                    contact: "",
                    menuFlyer: "#",
                },
  
                {
                    image: "images/info_uteis/eventos/evento_5/triathlon.png",
                    name: "Triathlon",
                    date: "06/04/25",
                    address: "Ilha do Ponciano",
                    contact: "(43) 99964-6136",
                    menuFlyer: "#",
                },
  
                {
                    image: "images/info_uteis/eventos/evento_4/pescar.png",
                    name: "Pescar",
                    date: "03/05/25 a 04/05/2025",
                    address: "Ilha do Ponciano",
                    contact: "(41) 99950-9291",
                    menuFlyer: "#",
                },
  
                {
                    image: "images/info_uteis/eventos/evento_2/feira_lua_1.png",
                    name: "Feira da Lua",
                    date: "Sex das 19 - 00h",
                    address: "Praça Igreja Matriz ",
                    contact: "(11) 99898-5930",
                    facebook: "https://www.facebook.com/people/Feira-Da-Lua-Carl%C3%B3polis/100089210937457/?_rdr",
                  instagram: "https://www.instagram.com/feiradaluacarlopolis/",
                    novidadesImages: [
                      // Novo array de imagens de novidades                      
                      "images/info_uteis/eventos/feiraLua/novidades/2.png",
                      "images/info_uteis/eventos/feiraLua/novidades/1.png",
                     
                  ],
                },
            ],
        },
  
        {
            link: document.querySelector("#menuMercado"),
            title: "Supermercados ",
            establishments: [
                {
                    image: "images/comercios/supermercado/carreiro.png",
                    name: "Carreiro",
                    address: "<br>R. Benedito Salles, 341 ",
                    hours: "</br>Seg a Sex 8h - 19h </br> dom: 08 - 12h",
                    contact: "</br>(43) 3566-1520",
                    delivery: "</br>Sim / Com Taxa",
                    facebook: "https://www.facebook.com/p/Supermercado-Carreiro-100066342918723/?locale=pt_BR",
                    instagram: "https://www.instagram.com/mercadocarreiroclps/",
                },
                {
                    image: "images/comercios/supermercado/obarateiro.png",
                    name: "O Barateiro",
                    address: "<br>Bendito Salles, 1168 ",
                    hours: "</br>Seg a Sex 8h - 21h </br> dom: 08 - 12h",
                    contact: "</br>(43) 99196-7816",
                    delivery: "</br>Sim / Sem Taxa",
                    facebook: "https://www.facebook.com/MercadoObarateiro",
                    instagram: "https://www.instagram.com/supermercado_obarateiro/p/DFgIRupxbr-/",
                },
                {
                    image: "images/comercios/supermercado/kelve.png",
                    name: "Kelve",
                    address: "<br>R. Paul Harris,104",
                    hours: "</br>Seg a Sex 8h - 19:30h </br> dom: 08:30 - 12:30h",
                    contact: "</br>(43) 99844-6105",
                    delivery: "</br>Sim / Sem Taxa",
                    facebook: "https://www.facebook.com/p/Kelve-Carl%C3%B3polis-100010521284877/?locale=pt_BR",
                    instagram: "https://www.instagram.com/kelvesupermercadosoficial/",
                },
    
                {
                    image: "images/comercios/supermercado/rocha.jpg",
                    name: "Rocha",
                    hours: "<br>Seg a Sex 6h - 20h </br> dom: 06 - 12h",
                    address: "<br>Av. Elson Soares, 767 ",
                    contact: "</br>(43) 3566-2436",
                    delivery: "</br>Sim / Sem Taxa",
                    facebook: "https://www.facebook.com/p/Kelve-Carl%C3%B3polis-100010521284877/?locale=pt_BR",
                    instagram: "https://www.instagram.com/kelvesupermercadosoficial/",
                },
    
                {
                    name: "Carriel",
                    address: "<br>PR-218, 1168 ",
                    hours: "</br>Seg a Sex 8h - 21h </br> dom: 07 - 12h",
                    contact: "</br>(43) 3456-7890",
                    delivery: "</br>Sim / Sem Taxa",
                },
                {
                    name: "Compre Bem +",
                    address: "<br>PR-218, 1168 ",
                    hours: "</br>Seg a Sex 8h - 21h </br> Dom: 07 - 12h",
                    contact: "</br>(43) 3456-7890",
                    delivery: "</br>Sim / Sem Taxa",
                },
    
                {
                    name: "Zero Japan",
                    address: "<br>PR-218, 1168 ",
                    hours: "</br>Seg a Sex 8h - 21h </br> dom: 07 - 12h",
                    contact: "</br>(43) 3456-7890",
                    delivery: "</br>Sim / Sem Taxa",
                },
            ],
        },


         //// farmacias
        {
            link: document.querySelector("#menuFarmacia"),
            title: "Farmácias ",
            establishments: [

                {
                    image: "images/comercios/farmacia/biofarma.png",
                    name: "Bio Farma",
                    address: "<br>Rua Laurindo Franco Godoy, 464",
                    hours: "</br>Seg a Sex: 8h - 18h </br> Sab: 08 - 12h",
                    contact: "</br>(43) 3566-1473",
                    delivery: "</br>Sim / Sem Taxa",
                    facebook: "www.facebook.com/uahh",
                    instagram: "www.instagram.com/uahh",
                    site: "www.google.com",
                    novidadesImages: [               
                        "images/comercios/farmacia/novidade_biofarma/1.png",
                        "images/comercios/farmacia/novidade_biofarma/2.png",     
                        "images/comercios/farmacia/novidade_biofarma/3.png",
                        "images/comercios/farmacia/novidade_biofarma/4.png",
                    ],  
                },
          
  
                {
                    image: "images/comercios/farmacia/farmafacil.png",
                    name: "Desconto Facil 1",
                    address: "<br>R. Benedito Salles, 574",
                    hours: "</br>Seg a Sex: 8h - 18h </br> Sab: 08 - 12h",
                    contact: "</br>(43) 99966-9812",
                    delivery: "</br>Sim / Sem Taxa",
                    facebook:"https://www.facebook.com/people/Farm%C3%A1cias-Desconto-F%C3%A1cil-Carl%C3%B3polis/100054221361992/",
                    instagram: "https://www.instagram.com/descontofacil.clps/",
                    site: "https://www.grupoasfar.com.br/",
                    novidadesImages: [               
                        "images/comercios/farmacia/novidade_biofarma/1.png",
                        "images/comercios/farmacia/novidade_biofarma/2.png",     
                        "images/comercios/farmacia/novidade_biofarma/3.png",
                        "images/comercios/farmacia/novidade_biofarma/4.png",
                    ], 
                },

                {
                    image: "images/comercios/farmacia/drogamais.png",
                    name: "DrogaMais",
                    hours: "</br>Seg a Sex: 8h - 18h </br> Sab: 08 - 12h",
                    address: "<br>Rua Benedito Salles, 903",
                    contact: "</br>(43) 98411-9145",
                    delivery: "</br>Sim / Sem Taxa",
                    facebook:"https://www.facebook.com/p/Drogamais-Jorginho-61560211252826/?locale=pt_BR",
                    instagram: "https://www.instagram.com/drogamaisjorginho/",
                    site: "www.google.com",
                    novidadesImages: [               
                        "images/comercios/farmacia/novidade_biofarma/1.png",
                        "images/comercios/farmacia/novidade_biofarma/2.png",     
                        "images/comercios/farmacia/novidade_biofarma/3.png",
                        "images/comercios/farmacia/novidade_biofarma/4.png",
                    ], 
                },
        
                {
                    image: "images/comercios/farmacia/elshaday.png",
                    name: "El Shaday",
                    address: "<br>R. Benedito Sales, 353",
                    hours: "</br>Seg a Sex: 8h - 18h </br> Sab: 08 - 12h",
                    contact: "</br>(43) 98488-9420",
                    delivery: "</br>Sim / Sem Taxa",
                    facebook: "https://www.facebook.com/fciaelshaday/?locale=pt_BR",
                    instagram: "www.instagram.com/uahh",
                    site: "www.google.com",
                    novidadesImages: [               
                        "images/comercios/farmacia/novidade_biofarma/1.png",
                        "images/comercios/farmacia/novidade_biofarma/2.png",     
                        "images/comercios/farmacia/novidade_biofarma/3.png",
                        "images/comercios/farmacia/novidade_biofarma/4.png",
                    ], 
                },
        
                {
                    image: "images/comercios/farmacia/farmaciaDaVila.png",
                    name: "Farmacia da Vila",
                    address: "<br>Rua Manguba, 320",
                    hours: "</br>Seg a Sex: 8h - 18h </br> Sab: 08 - 12h",
                    contact: "</br>(43) 99148-8478",
                    delivery: "</br>Sim / Sem Taxa",
                    facebook: "#",
                    instagram: "https://www.instagram.com/farmaciadavilaclps/",
                    site: "#",
                    novidadesImages: [               
                        "images/comercios/farmacia/novidade_biofarma/1.png",
                        "images/comercios/farmacia/novidade_biofarma/2.png",     
                        "images/comercios/farmacia/novidade_biofarma/3.png",
                        "images/comercios/farmacia/novidade_biofarma/4.png",
                    ], 
                },
        
                {
                    image: "images/comercios/farmacia/farmais.png",
                    name: "FarMais",
                    address: "<br>R. Benedito Salles, 1188",
                    hours: "</br>Seg a Sex: 8h - 18h </br> Sab: 08 - 12h",
                    contact: "</br>(43) 3566-1211",
                    delivery: "</br>Sim / Sem Taxa",
                    facebook: "https://www.facebook.com/farmaiscarlopolis1/?locale=pt_BR",
                    instagram: "https://www.instagram.com/farmaiscarlopolis/",
                    site: "#",
                    novidadesImages: [               
                        "images/comercios/farmacia/novidade_biofarma/1.png",
                        "images/comercios/farmacia/novidade_biofarma/2.png",     
                        "images/comercios/farmacia/novidade_biofarma/3.png",
                        "images/comercios/farmacia/novidade_biofarma/4.png",
                    ], 
                },
        
                {
                    image: "images/comercios/farmacia/masterfarma.png",
                    name: "MasterFarma",
                    address: "<br>R. Laurindo Franco de Godoi, 90",
                    hours: "</br>Seg a Sex: 8h - 18h </br> Sab: 08 - 12h",
                    contact: "</br>(43) 99951-1540",
                    delivery: "</br>Sim / Sem Taxa",
                    facebook: "https://www.facebook.com/zurdo.farmacentro/?locale=pt_BR",
                    instagram: "https://www.instagram.com/masterfarma_carlopolis/",
                    site: "#",
                    novidadesImages: [               
                        "images/comercios/farmacia/novidade_biofarma/1.png",
                        "images/comercios/farmacia/novidade_biofarma/2.png",     
                        "images/comercios/farmacia/novidade_biofarma/3.png",
                        "images/comercios/farmacia/novidade_biofarma/4.png",
                    ], 
                },
                
                {
                    
                    name: "PopularMais",
                    address: "<br>Elson Soares, 787, Sala 2",
                    hours: "</br>Seg a Sex: 8h - 18h </br> Sab: 08 - 12h",
                    contact: "</br>(43) 99647-6266",
                    delivery: "</br>Sim / Sem Taxa",
                    image: "images/comercios/farmacia/popularMais.png",
                    facebook:
                    "https://www.facebook.com/people/Popular-Mais-a-Farm%C3%A1cia-do-Jeremias/100075024257599/#",
                    instagram:
                    "https://www.instagram.com/popularmais_farmaciadojeremias/",
                    site: "#",
                    novidadesImages: [                  
                        "images/comercios/farmacia/novidades_popularmais/1.png",
                        "images/comercios/farmacia/novidades_popularmais/2.png",
                                    
                    ],
                },

                {
                    image: "images/comercios/farmacia/santamaria.png",
                    name: "Santa Maria",
                    address: "<br>Praça Coronel Leite, nº 711",
                    hours: "</br>Seg a Sex: 8h - 18h </br> Sab: 08 - 12h",
                    contact: "</br>(43) 3566-1471",
                    delivery: "</br>Sim / Sem Taxa",
                    facebook: "https://www.facebook.com/farmaciasantamaria.carlopolis/",
                    instagram: "https://www.instagram.com/santamaria.farmaciaclps/",
                    site: "#",
                    novidadesImages: [               
                        "images/comercios/farmacia/novidade_biofarma/1.png",
                        "images/comercios/farmacia/novidade_biofarma/2.png",     
                        "images/comercios/farmacia/novidade_biofarma/3.png",
                        "images/comercios/farmacia/novidade_biofarma/4.png",
                    ], 
                },
        
                {
                    image: "images/comercios/farmacia/saudeFarma.png",
                    name: "Saude Farma",
                    address: "<br>Rua Benedito Salles, 951",
                    hours: "</br>Seg a Sex: 8h - 18h </br> Sab: 08 - 12h",
                    contact: "</br>(43) 99956-8938",
                    delivery: "</br>Sim / Sem Taxa",
                    facebook:
                    "https://www.facebook.com/people/Sa%C3%BAde-Farma-Carl%C3%B3polis/100077692803333/",
                    instagram: "#",
                    site: "www.google.com",
                    novidadesImages: [               
                        "images/comercios/farmacia/saudeFarma/novidade/1.png",
                        "images/comercios/farmacia/novidade_biofarma/2.png",     
                        "images/comercios/farmacia/novidade_biofarma/3.png",
                        "images/comercios/farmacia/novidade_biofarma/4.png",
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
            link: document.querySelector("#menuChurrasqueiro"),
            title: "Churrasqueiros ",
            establishments: [
                {
                name: "Pituka",
                contact: "(43) 99984-5074",
                },

                {
                    name: "Gustavo",
                    contact: "(43) 8901-2345",
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
            link: document.querySelector("#menuGuiaPesca"),
            title: "Guia de Pesca",
            establishments: [
                {
                    image:"images/servicos/guiapesca/fabio.png",
                    name: "Fabio Sushimoto",
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
  
        {
            link: document.querySelector("#menufarmaciaPlantao"),
            title: "Farmacia de Plantão",
            establishments: [

                {
                    /*
                    title: "Farmacia de Plantão",
                    establishments: [{
                    name: "MasterFarma ( Zurdo ) ",
                    address: "R. Laurindo Franco de Godoi, 90",
                    contact: "(43) 99951-1540",
                    plantaoHorario: "Das 7h às 21h , Do dia 7 a 14  Março 2025",
                    delivery: "Sim / Sem Taxa",
                    image: "images/info_uteis/farmacia_plantao/masterFarma.png",
                    facebook: "www.facebook.com/uahh",
                    instagram: "www.instagram.com/uahh",
                    site: "www.google.com",
                        
                    */

                    /*
                    title: "Farmacia de Plantão",
                    establishments: [{
                    name: "El Shaday ( Daniel )",
                    address: "R. Benedito Sales, 353",
                    contact: "(43) 98488-9420",
                    plantaoHorario: "</br>Das 8h às 21h , De 15/03 a 21/03",
                    delivery: "Sim / Sem Taxa",
                    image: "images/info_uteis/farmacia_plantao/elshaday.png",
                    facebook: "www.facebook.com/uahh",
                    instagram: "www.instagram.com/uahh",
                    site: "www.google.com",

                    */


                    /*
                    title: "Farmacia de Plantão",
                    establishments: [{
                    name: "DrogaMais ( Jorginho )",
                    address: "<br>Rua Benedito Salles, 903",
                    contact: "</br>(43) 98411-9145",
                    plantaoHorario: "</br>Das 8h às 21h , De 22/03 a 28/03",
                    delivery: "</br>Sim / Sem Taxa",
                    image: "images/comercios/farmacia/drogamais.png",
                    facebook: "www.facebook.com/uahh",
                    instagram: "www.instagram.com/uahh",
                    site: "www.google.com",
                    
                    */

                    /*
                    
                    name: "Desconto Facil 1 ( Joao )",
                    address: "<br>R. Benedito Salles, 574",
                    contact: "</br>(43) 99966-9812",
                    plantaoHorario: "</br>Das 8h às 21h , De 29/03 a 04/04",
                    delivery: "</br>Sim / Sem Taxa",
                    image: "images/comercios/farmacia/farmafacil.png",
                    facebook:
                    "https://www.facebook.com/people/Farm%C3%A1cias-Desconto-F%C3%A1cil-Carl%C3%B3polis/100054221361992/",
                    instagram: "https://www.instagram.com/descontofacil.clps/",
                    site: "https://www.grupoasfar.com.br/",

                    */

                    /*
                
                    name: "Popularmais ( Jeremias )",
                    address: "<br>Av. Elson Soares, 787",
                    contact: "</br>(43) 99647-6266",
                    plantaoHorario: "</br>Das 8h às 21h </br> De 05/04 a 11/04",
                    delivery: "</br>Sim / Sem Taxa",
                    image: "images/comercios/farmacia/popularMais.png",
                    facebook:"https://www.facebook.com/people/Popular-Mais-a-Farm%C3%A1cia-do-Jeremias/100075024257599/#",
                    instagram:"https://www.instagram.com/popularmais_farmaciadojeremias/",
                    site: "#",
                    novidadesImages: [               
                        "images/comercios/farmacia/novidades_popularmais/1.png",
                        "images/comercios/farmacia/novidades_popularmais/2.png",
                    ],
                   
                    */

                    image: "images/comercios/farmacia/saudeFarma.png",
                    name: "Saude Farma",
                    address: "<br>Rua Benedito Salles, 951",
                    contact: "</br>(43) 99956-8938",
                    plantaoHorario: "</br>Das 8h às 21h </br> De 12/04 a 18/04",                   
                    delivery: "</br>Sim / Sem Taxa", 
                    
                      facebook:
                      "https://www.facebook.com/people/Sa%C3%BAde-Farma-Carl%C3%B3polis/100077692803333/",
                      instagram: "https://www.instagram.com/saudefarmacarlopolis/",                     
                      novidadesImages: [               
                          "images/comercios/farmacia/saudeFarma/novidade/1.png",
                          "images/comercios/farmacia/novidade_biofarma/2.png",     
                          "images/comercios/farmacia/novidade_biofarma/3.png",
                          "images/comercios/farmacia/novidade_biofarma/4.png",
                      ], 
                  


                },
            ],
        
        },
  
        {
            link: document.querySelector("#menuHospital"),
            title: "Hospital",
            establishments: [
                {
                    name: "Hospital São Jose",
                    address: "<br>R. Cap. Estácio, 460",
                    contact: "<br>(43) 99174-2539",
                    hours: "<br>24 horas",
                    image: "images/info_uteis/hospital/hospital.png",
                },
            ],
        },

        {
          link: document.querySelector("#menuRodoviaria"),
          title: "Rodoviaria",
          establishments: [
              {
                  name: "Rodoviaria",
                  address: "<br>R. Kaliu keder, 0",
                  contact: "<br>(43) 3566-1393",
                  hours: "<br>24 horas",
                  image: "images/info_uteis/rodoviaria/rodoviaria.png",
              },
          ],
        },
  
        {
            link: document.querySelector("#menuPrefeitura"),
    
            title: "Prefeitura",
            establishments: [
                {
                    name: "Prefeitura",
                    address: "<br>R. Benedito Salles, 1060 - Centro",
                    contact: "<br>(43) 3566-1291",
                    hours: "<br>8h as 17h",
                    image: "images/info_uteis/prefeitura/prefeitura.png",
                    facebook: "https://www.facebook.com/profile.php?id=200531799983410&_rdr",
                    instagram: "www.instagram.com/uahhhttps://www.instagram.com/prefeitura.carlopolis/?locale=zh_CN&hl=af",
                    site: "http://www.carlopolis.pr.gov.br/",
                },
        
                {
                    name: "Duvidas e  Reclamações",
                    contact: "(43) 99825-0360",
                    hours: "8h as 17h",
                    image: "images/info_uteis/prefeitura/prefeitura.png",
                },
            ],
        },
    
        {
            link: document.querySelector("#menuCopel"),    
            title: "Copel",
            establishments: [
                {
                    image: "images/info_uteis/copel/copel.png",
                    name: "Copel",
                    hours: "<br>seg a sex: 8h - 12h",
                    address: "<br>R. Benedito Salles, 1094",
                    contact: "<br>(41) 3013-8973",
                },
            ],
        },
  
        {
            link: document.querySelector("#menuDelegacia"),
    
            title: "Delegacia",
            establishments: [
                {
                    image: "images/info_uteis/delegacia/delegacia.jpg",
                    name: "Delegacia",
                    hours: "seg a sex: 9h - 18h",
                    address: "R. Alfeneiro, 215 ",
                    contact: "(43) 3566-1202",
                },
            ],
        },
  
        {
            link: document.querySelector("#menuSanepar"),    
            title: "Sanepar",
            establishments: [
                {
                    name: "Sanepar",
                    hours: "seg a sex: 8:30h - 12h, 13:30 as 17h",
                    address: "R. André Jorge Cleli, 148 ",
                    contact: "0800 200 0115",
                    image: "images/info_uteis/sanepar/sanepar.png",
                },
            ],
        },


        {
            link: document.querySelector("#menuVagasTrabalho"),    
            title: "Vagas de Trabalho",
            establishments: [
                {
                    name: "Moto Taxi Modesto",
                    hours: "</br>Seg a Dom: 7h - 20h",
                    address: "<br>R. Kelil Keder, 603, 148 ",
                    contact: "</br>(43) 99137-5516",
                    image: "images/info_uteis/VagasTrabalho/modesto/modesto.png",
                    infoVagaTrabalho:"</br>Precisa-se de motoboy",
                },
            ],
        },
  
        {
            link: document.querySelector("#menuMotoCenter"),  
            title: "Moto Center",
            establishments: [
                {
                    name: "Binho Moto Center",
                    hours: "seg a sex: 8h - 18h </br> sab: 08 - 12h",
                    address: "R. Laurindo Franco de Godoi, 90",
                    contact: "(43) 99951-1540",
                    delivery: "Sim / Sem Taxa",
                },
            ],
        },

        
        {
            link: document.querySelector("#menuBorracharia"),  
            title: "Borracharia",
            establishments: [
                {
                    name: "Vida Nova",
                    hours: "</br>seg a sex: 7h - 18h </br>sab: 07 - 16h",
                    address: "<br>Rua genova 10 Anexo ao Posto Garbelotti - Res. Italia",
                    contact: "(43) 99900-2991",
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
                    hours: "seg a sex: 8h - 18h </br> sab: 08 - 12h",
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
                    name: "Lia Gas",
                    hours: "seg a sex: 8h - 18h </br> sab: 08 - 12h",
                    address: "R. Laurindo Franco de Godoi, 90",
                    contact: "(43) 99951-1540",
                    delivery: "Sim / Sem Taxa",
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
                    hours: "</br>Seg a Qui 9h - 18:30h </br>Sex 9h - 16:30 </br> sab: 09 - 12h",
                    address: "<br>R. Fidêncio de Melo, 212 - Sala B",
                    contact: "</br>(43) 99103-4187",
                    delivery: "</br>Sim / Sem Taxa",            
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
                    name: "Pimenta Doce",
                    hours: "</br>seg a sex: 8h - 18h </br> sab: 08 - 12h",
                    address: "<br>R. Kalil Keder ",
                    contact: "</br>(43) 98806-5747",
                    delivery: "</br>Sim / Sem Taxa",
                    image: "images/comercios/quitanda/pimentadoce.png",
                    novidadesImages: [
                        "images/comercios/quitanda/novidades/1.png",
                        "images/comercios/quitanda/novidades/2.png",
                        "images/comercios/quitanda/novidades/3.png",
                        "images/comercios/quitanda/novidades/4.png",
                        "images/comercios/quitanda/novidades/5.png",
                    ],
                },
            ],
        },
  
        {
            link: document.querySelector("#menuRestaurantes"),    
            title: "Restaurante",
            establishments: [

                {
                    name: "Cabanas",
                    hours: "</br>seg a sex: 8h - 18h </br> sab: 08 - 12h",
                    address: "<br>R. Laurindo Franco de Godoi, 90",
                    contact: "</br>(43) 99951-1540",
                    delivery: "</br>Sim / Com Taxa",
                    infoAdicional:"</br>Somente Marmita"
                },
                {
                    image: "images/comercios/restaurante/delfino/delfino.png",
                    name: "Delfino",
                    hours: "</br>seg a sex: 11h - 15h / 18h - 22:30</br> sab: 11 - 16h",
                    address: "<br>R. Kalil Keder, 90",
                    contact: "</br>(43) 9111-9484",
                    delivery: "</br>Sim / Com Taxa",
                    menuImages: [                        
                         "images/comercios/restaurante/delfino/cardapio/cardapio_1.png",
                                 
                        ],    
                },
                {
                  image: "images/comercios/restaurante/neia/neia.png",
                  name: "Neia",
                  hours: "</br>seg a sex: 11h - 14h <br>sab: 11 - 16h",
                  address: "<br>R. Kalil Keder, 262 ",
                  contact: "</br>(43) 99847-1137",
                  delivery: "</br>Sim / Com Taxa",
                  menuImages: [                        
                       "images/comercios/restaurante/neia/cardapio/cardapio_1.png",                               
                      ],    
              },
                {
                    name: "Portal",
                    hours: "</br>Seg a Qui: 19h - 21h",
                    address: "<br>R. Benedito Salles, 2023",
                    contact: "</br>(43) 3566-2174",
                    delivery: "</br>Sim / Com Taxa",
                    infoAdicional:"</br>Fica dentro do Hotel Portal"
                },

                {
                  image: "images/comercios/restaurante/saborRoca/saborRoca.png",
                  name: "Sabor da Roça",
                  hours: "</br>Seg a Sab: 10:30h - 14h",
                  address: "<br>R. Benedito Salles, 365",
                  contact: "</br>(43) 99832-3050",
                  delivery: "</br>Sim / Com Taxa",
                
              },
            ],
        },
  
        {
            link: document.querySelector("#menuPapelaria"),    
            title: "Papelaria",
            establishments: [
                {
                    name: "Haruo",
                    hours: "seg a sex: 8h - 18h </br> sab: 08 - 12h",
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
                    hours: "seg a sex: 8h - 18h </br> sab: 08 - 12h",
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
                    hours: "</br>Seg a Sab: 7h - 20h </br> Dom: 07 - 00h",
                    address: "<br>Em Frente ao banco Itau",
                    contact: "</br>(43) 88807-8515",
                },
            ],
        },
    
        {
            link: document.querySelector("#menuAssistenciaCelular"),    
            title: "Assistencia Celular",
            establishments: [
                {
                    name: "Soraya",
                    hours: "seg a sex: 8h - 18h </br> sab: 08 - 12h",
                    address: "R. Laurindo Franco de Godoi, 90",
                    contact: "(43) 99951-1540",
                    delivery: "Sim / Sem Taxa",
                },
            ],
        },
        /////////

    ]; // fim dos setores



    
  
  
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
    
      clearSearch.addEventListener("click", function () {
        searchInput.value = "";
        clearSearch.style.display = "none";
        searchInput.dispatchEvent(new Event("input")); // força reprocessamento
      });
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
     <li>  
     
       <!-- Exibe a imagem do estabelecimento, se existir -->
      ${
        establishment.image
          ? `
            <img src="${establishment.image}" title="${establishment.name}"  alt="Imagem de ${establishment.name}">
          `
          : ""
      }
  
     
     <strong class="locais_nomes">${establishment.name}</strong><br>
  
  ${
    establishment.date ? `<b>Data do Evento:</b> ${establishment.date}<br>` : ""
  } <!-- Exibe a data do evento se existir -->
  
  
       ${
         establishment.hours
           ? `<b>Funcionamento:</b> ${establishment.hours}<br>`
           : ""
       }
       ${
         establishment.plantaoHorario
           ? `<b class="highlight-plantao">Plantão:</b> <span class="plantao-text">${establishment.plantaoHorario}</span><br>`
           : ""
       }  <!-- Exibe o horário de plantão -->
       ${
         establishment.address
           ? `
         <b>Endereço: </b>${establishment.address}</br>`
           : ""
       }
  
           <b>Contato:</b> ${establishment.contact} 
       <br>
       ${
         establishment.delivery
           ? `<b>Entrega:</b> ${establishment.delivery}<br>`
           : ""
       }

       ${
         establishment.infoAdicional
           ? `<b>Informação Adicional:</b> ${establishment.infoAdicional}<br>`
           : ""
       }

       ${
         establishment.infoVagaTrabalho
           ? `<b>Info Vaga de Trabalho:</b> <span class="plantao-text">${establishment.infoVagaTrabalho}</span><br>`
           : ""
       }
      
   <!-- Ícones de redes sociais e contato -->
          <div class="social-icons">
            ${
              establishment.address
                ? `
              <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(establishment.address.replace(/<br>/g, " "))}" target="_blank" class="icon-link">
                <i style="color:rgb(250, 9, 9);" class='bx bx-map'></i> Localização
              </a>
            `
                : ""
            }
          
           
            ${
              establishment.contact
                ? `
              <a href="https://api.whatsapp.com/send?phone=${establishment.contact
                .replace("+", "")
                .replace(/\D/g, "")}&text=${encodeURIComponent(
                    "Olá! Encontrei seu número no Site Olá Carlópolis e gostaria de uma informação!"
                  )}" target="_blank" class="icon-link">
                <i class='bx bxl-whatsapp' style="color: #25D366;"></i> WhatsApp
              </a>  
            `
                : ""
            } 
  
            
  
             </div>  <div class="social-icons">
            ${
              establishment.facebook
                ? `
              <a href="${establishment.facebook}" target="_blank" class="icon-link">
                <i class='bx bxl-facebook' style="color: #1877F2;"></i> Facebook
              </a>
            `
                : ""
            }
            
            ${
              establishment.instagram
                ? `
              <a href="${establishment.instagram}" target="_blank" class="icon-link">
                <i class='bx bxl-instagram' style="color: #E4405F;"></i> Instagram
              </a>
            `
                : ""
            }
            
            ${
              establishment.site
                ? `
              <a href="${establishment.site}" target="_blank" class="icon-link">
                <i class='bx bx-globe'></i> Site
              </a>
            `
                : ""
            }



            
          </div>
      </br>
  










  <div class="button-container">
          ${establishment.novidadesImages && establishment.novidadesImages.length > 0 ? `
            <button id="novidadesButton" class="novidades-btn" data-name="${establishment.name}">
              Novidades (${establishment.novidadesImages.length})
            </button>
          ` : ''}
          
          ${establishment.menuImages && establishment.menuImages.length > 0 ? `
            <button  id="cardapioButton" class="menu-btn" data-name="${establishment.name}">
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
  











      
      ///// inicio




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
      toggleContent(this, contentId);
    });
  });
  
  // Eventos para os botões de Cardápio
  document.querySelectorAll('.menu-btn').forEach(button => {
    button.addEventListener('click', function() {
      const contentId = `menu-${encodeURIComponent(this.dataset.name)}`;
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
  
    // Alternar submenu
    submenuItems.forEach((item) => {
      item.addEventListener("click", (event) => {
        event.stopPropagation(); // Evita que o clique feche a sidebar
  
        // Verifica se já está aberto
        const isOpen = item.classList.contains("show_submenu");
  
        // Fecha todos os submenus antes de abrir o atual
        submenuItems.forEach((i) => i.classList.remove("show_submenu"));
  
        // Se não estava aberto, abre novamente
        if (!isOpen) {
          item.classList.add("show_submenu");
        }
      });
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
  
    ///// INICIO area de pagamento:
  
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
  