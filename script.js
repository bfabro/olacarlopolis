document.addEventListener("DOMContentLoaded", function () {
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
      selahtgrillpizzariaeesfiharia:"s",
    
      
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
                hours: "<br>seg a Qui:06h a 13h - 15h a 21h <br> Sex: 06h a 13h - 15h a 20:30h<br> Sab: 15h - 18h <br>Dom: Fechado ",
                address: "<br>R. Delfino Mendes, 264 - Centro",
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
                            hours: "<br>Qua a Seg: 14h - 23h </br> Ter: Fechado",
                            address: "<br>Rua Benedito Salles, 409",
                            contact: "<br>(43) 99176-7871",
                            delivery: "Sim / Com Taxa",
                            instagram: "https://www.instagram.com/turminha_do_acai/",
                            infoAdicional:"<br>Espetinhos a partir de Quinta até<br> Domingo",
                            novidadesImages: [            
                            "images/comercios/acai/turminhaAcai/novidades/1.png",                                            
                            ],
                            novidadesDescriptions: [                            
                            "Marmita de Açai <br>Voce só encontra aqui!",
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
                            hours: "<br>seg a sex: 8h - 18h </br> sab: 08 - 12h",
                            address: "<br>Rua Benedito Salles, 409",
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
                            "</br>seg 09:00h - 19:30h </br> ter e qua 09:00 - 22:00h </br> qui a sab 09:00 - 23:50 </br> dom 09:00 - 22:00h",
                            address: "<br>R. Kalil Keder, 752",
                            contact: "</br>(43) 99800-1680",
                            delivery: "</br>Sim / Sem Taxa",
                            instagram: "https://www.instagram.com/turminha_do_acai/",
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
                          hours:"</br>seg 09:00h - 22h ",
                          address: "<br>R. Benedito Sales, 1551",
                          contact: "</br>-",                          
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
                          hours: "</br>seg a sex: 9h - 11:30h, 13:00-17:00",
                          address: "<br>R. Salvira Marquês, 315",
                          contact: "</br>(43) 3566-1368",
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
                        hours: "</br>Seg a Sab: 11h - 22h",
                        address: "<br>Rua Padre Hugo, 450, Sala 10",
                        contact: "</br>(43) 99177-2244",
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
                            image: "images/comercios/agropecuaria/armazem Rei/armazemRei.png",
                            name: "Armazem Rei",
                            hours: "</br>seg a Sab: 8h - 19h </br> Dom: 08h - 12h",
                            address: "<br>R. Kalil Keder, 718",
                            contact: "</br> (43) 99185-6532",
                            delivery: "</br>Sim / Sem Taxa",
                            facebook: "#",
                            instagram: "#",
                            novidadesImages: [
                                // Novo array de imagens de novidades
                                "images/comercios/agropecuaria/armazem rei/divulgacao/1.png",
                              "images/comercios/agropecuaria/armazem rei/divulgacao/2.png",
                            ],
                            novidadesDescriptions: [                            
                              "Special Dog no Precinho",
                              "Temos sacos de milho 40kg",
                            ],
                        },
                        {
                            image: "images/comercios/agropecuaria/agroVida/agrovida.png",
                            name: "Agro Vida",
                            hours: "</br>seg a sex: 8h - 18h </br> sab: 08 - 16h",
                            address: "<br>rua benedito salles 309",
                            contact: "</br>(43) 99158-9047",
                            delivery: "</br>Sim / Sem Taxa",
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
                          hours: "</br>seg a sex: 8h - 18:00h<br> Sab: 08:00-17:00",
                          address: "<br>Rua Dr Paula e Silva 676",
                          contact: "</br>(43) 3566-1600",
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
                  link: document.querySelector("#menuFerroVelho"),
                  title: "Ferro Velho",
                  establishments: [
                      {
                          image: "images/comercios/ferroVelho/reiDoFerro/reiDoFerro.png",
                          name: "Rei do Ferro",
                          hours: "</br>Seg a Sex - 08:00 - 18:00",
                          address: "<br>Rodovia PR 218",
                          contact: "</br>(43) 3566-2505",                         
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
                        image: "images/comercios/feiraLua/feiraLua.png",
                               
                        name: "Feira da Lua",
                        hours: "</br>Sex - 19:00 - 123:30",
                        address: "<br>Praça Igreja Matriz",
                        contact: "</br>(43) 99965-2084",                         
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
                          image: "images/comercios/lanchonete/ione/ione.png",
                          name: "Ione",
                          hours: "</br>Seg - Sab - 9:30h - 19:30h",
                          address: "<br>R. Benedito Salles, 1233",
                          contact: "</br>(43) 99180-4287",
                          delivery: "</br>Sim / Com Taxa",
                          facebook: "https://www.facebook.com/IoneSalgados1687Fabiana/?locale=pt_BR",
                          instagram: "https://www.instagram.com/salgadosione29/",       
                              
                          novidadesImages: [
                          
                            "images/comercios/lanchonete/ione/divulgacao/1.png",
                           "images/comercios/lanchonete/ione/divulgacao/2.png",
                          ]
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
                  hours: "</br>Seg - Dom: 13:00 - 22h",
                  address: "<br>Rua Benedito Salles n° 619",
                  contact: "</br>(43) 99922-8336",
                  delivery: "</br>Sim / Com Taxa",
                  facebook: "#",
                  instagram: "https://www.instagram.com/limone.sorvetes/?hl=pt",
                  novidadesImages: [              
                   "images/comercios/sorveteria/limone/divulgacao/1.png",
                   "images/comercios/sorveteria/limone/divulgacao/2.png",
                  ],                    
              },


              {
                image: "images/comercios/sorveteria/santino/santino.png",
                name: "Santtino Gelateria",
                hours: "</br>Dom - Sex: 13:00 - 22h<br>Sab 13h - 23h",
                address: "<br>R. Kalil Keder, 583 - Centro",
                contact: "</br>(43) 99971-3535",
                delivery: "</br>Sim / Sem Taxa",
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
                    hours: "</br>seg a Sab: 6h - 19h </br> Dom: 06 - 14h",
                    address: "<br>R. Benedito Salles, 615",
                    contact: "<br>(43) 99653-9285",
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
                  hours: "</br>seg a Sab: 5:30h - 19h </br> Dom: 5:30h - 12h",
                  address: "<br>R. Benedito Salles, 1098",
                  contact: "<br>(43) 99954-0863",
                  delivery: "Sim / Com Taxa",
                  
                  instagram: "https://www.instagram.com/prelie.confeitaria/",
                  novidadesImages: [                   
                      "images/comercios/padaria/prelie/divulgacao/1.png",
                     
                     
                  ],
              },

                {
                  image: "images/comercios/padaria/saoFrancisco/saoFrancisco.png",
                  name: "São Francisco",
                  hours: "</br>seg a Sab: 5:30h - 19h </br> Dom: 5:30h - 12h",
                  address: "<br>R. Benedito Salles, 881",
                  contact: "<br>(43) 98873-1488",
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
                    image: "images/comercios/supermercado/carreiro.png",
                    name: "Carreiro",
                    address: "<br>R. Benedito Salles, 341 ",
                    hours: "</br>Seg a Sex 8h - 19h </br> dom: 08 - 12h",
                    contact: "</br>(43) 3566-1520",
                    delivery: "</br>Sim / Com Taxa",
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
                    "Area de Promoçoes de <br> Leite Condensado!",
                  ],
                },


                {
                  image: "images/comercios/supermercado/compreBemMais/compreBemMais.png",
                  name: "Compre Bem Mais",
                  address: "<br>R. Andrino Soares, 355",
                  hours: "</br>Seg a Sex 7h - 20h </br> dom: 08 - 12h",
                  contact: "</br>(43) 99977-6613",
                  delivery: "</br>Sim / Sem Taxa",
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
                    contact: "<br>(43) 99844-6105",
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
                  image: "images/comercios/supermercado/zerojapan.png",
                    name: "Zero Japan",
                    address: "<br>Rua Doutora Paula e Silva, 445 ",
                    hours: "</br>Seg a Seg 8h - 20h ",
                    contact: "<br>(43) 3142-2005", // telefone fixo
                    whatsapp: "4331422005", // novo campo para o WhatsApp real
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





        // inicio Eventos
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


      // fim eventos
  
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
                      novidadesDescriptions: [                            
                        "Venham nos visitar!",
                        "Flanax 660mg R$ 900,00",
                        "Xadago 50mg em promoçao!",
                        "Dipirona, resolve em 10 minutos",
                      ],
                  


                },
            ],
        
        },


  // INICIO SETOR PUBLICO
  {
    link: document.querySelector("#menuAsilo"),    
    title: "Asilo",
    establishments: [
        {
            image: "images/info_uteis/asilo/asilo.png",
            name: "Asilo",
            hours: "<br>seg a sex: 9h - 12h",
            address: "<br>Rua Andrino Soares, 26",
            contact: "<br> 43 3566-1196",
        },
    ],
  },

  {
    link: document.querySelector("#menuAgenciaTrabalhador"),    
    title: "Agencia Trabalhador",
    establishments: [
        {
            image: "images/info_uteis/agenciaTrabalhador/AgenciaTrabalhador.png",
            name: "Agencia Trabalhador",
            hours: "<br>seg a sex: 9h - 15h",
            address: "<br>Rua Padre Hugo, 1025",
            contact: "<br> (43) 3566-1291",
        },
    ],
  },

  {
    link: document.querySelector("#menuCras"),    
    title: "Cras",
    establishments: [
        {
            image: "images/info_uteis/cras/cras.png",
            name: "Cras",
            hours: "<br>seg a sex: 9h - 15h",
            address: "<br>R. Salvira Marquês, 366",
            contact: "<br>(43) 98485-1626",
            facebook:"https://www.facebook.com/p/Cras-Carl%C3%B3polis-100013825331932/?locale=pt_PT",
        },
    ],
  },

  {
    link: document.querySelector("#menuCorreio"),    
    title: "Correio",
    establishments: [
        {
            image: "images/info_uteis/correio/correio.png",
            name: "Correio",
            hours: "<br>seg a sex: 9h - 13h",
            address: "<br>R. Padre Hugo, 843 ",
            contact: "<br>(43) 3566-1113",
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
            hours: "<br>-",
            address: "<br>Rua Jose Salles, 313",
            contact: "<br>(43) 3566-1349 ",
            facebook:"#",
        },
     

        {
          
          name: "Isabel Dalla B da Silva C M e I Profa",
          hours: "<br>-",
          address: "<br>Av dos Diogossn",
          contact: "<br>(43) 3566-2330",
          facebook:"#",
      },

      {
           
        name: "Marinha Fogaca de Oliveira C M e I",
        hours: "<br>-",
        address: "<br>Est Mun Espirito Santo, 95",
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
                    hours: "<br>8h as 11:30 - 13h as 17h",
                    image: "images/info_uteis/prefeitura/prefeitura.png",
                    facebook: "https://www.facebook.com/profile.php?id=200531799983410&_rdr",
                    instagram: "www.instagram.com/uahhhttps://www.instagram.com/prefeitura.carlopolis/?locale=zh_CN&hl=af",
                    site: "http://www.carlopolis.pr.gov.br/",
                },
        
                {
                    name: "Duvidas e  Reclamações",
                    contact: "<br>(43) 99825-0360",
                    hours: "<br>8h as 17h",
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
                    hours: "<br>seg a sex: 9h - 18h",
                    address: "<br>R. Alfeneiro, 215 ",
                    contact: "(43) 3566-1202",
                },
            ],
        },



        {
          link: document.querySelector("#menuEscolaPublica"),
  
          title: "Escola Publica",
          establishments: [


            {
              image: "images/info_uteis/escolaPublica/benedito.png",
              name: "Benedito Rodrigues de Camargo",
              hours: "<br>seg a sex: 9h - 18h",
              address: "<br>Avenida Elson Soares, 295",
              contact: "<br>(43) 3566-1496",
              infoAdicional:"Turno: Manha e Tarde",
          },

            {
              image: "images/info_uteis/escolaPublica/carolinaLupion.png",
              name: "Carolina Lupion",
              hours: "<br>seg a sex: 9h - 18h",
              address: "<br>R. Jorge Barros, 1095",
              contact: "<br>(43) 3566-1295",
              infoAdicional:"Turno: Manha e Tarde",
          },



              {
                  image: "images/info_uteis/escolaPublica/raymunda.png",
                  name: "CMEI Raymunda Santana Salles",
                  hours: "<br>seg a sex: 9h - 18h",
                  address: "<br>Rua Nicolau Miguel, 233",
                  contact: "<br>(43) 3566-2273",
                  infoAdicional:"Turno: Manha",
              },

             

            {
              image: "images/info_uteis/escolaPublica/joseSalles.png",
              name: "Escola Municipal José Salles",
              hours: "<br>seg a sex: 07:45h - 17h",
              address: "<br>R. Quaresmeira Roxa, 418-458",
              contact: "<br>(43) 3566-1275",
              infoAdicional:"Turno: Manha e Tarde",
          },

          {
            image: "images/info_uteis/escolaPublica/hercilia.png",
            name: "Hercília de Paula e Silva",
            hours: "<br>seg a sex: 06:30h - 18:30h",
            address: "<br> Av. Elson Soares, 34",
            contact: "<br>(43) 3566-1282",
            infoAdicional:"Turno: Manha e Tarde",
        },
          ],
      },


      {
        link: document.querySelector("#menuPostoSaude"),    
        title: "Posto de Saude",
        establishments: [
            {
                image: "images/info_uteis/postoSaude/joseAparecido.png",
                name: "Centro de Saude Dr José",                
                hours: "<br>seg a sex: 8:00h as 17h",
                address: "<br>Avenida Elson Soares,769",
                contact: "<br>(43) 3566-1328",
               
            },
           
            {
              image: "images/info_uteis/postoSaude/eugenioNeves.png",
                name: "UBS Eugênio Neves Soares",
                hours: "<br>seg a sex: 8:00h as 17h",
                address: "<br>Rua Bauínea,79",
                contact: "<br>(43) 3566-1932",
               
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













// FIM SETOR PUBLICO

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
                image: "images/comercios/restaurante/assadaoRussao/assadaoRussao.png",
                name: "Assadão do Russão",
                hours: "</br>Seg a Sab: 10:30h - 14h",
                address: "<br>Rua Benedito Salles 1241",
                contact: "</br>(43) 9838-7570",
                delivery: "</br>Sim / Com Taxa",
                menuImages: [                   
                  "images/comercios/restaurante/assadaoRussao/cardapio/1.png",
                 
                         
              ],
              novidadesImages: [                    
                  "images/comercios/restaurante/assadaoRussao/divulgacao/1.png",                        
                 "images/comercios/restaurante/assadaoRussao/divulgacao/2.png",
                 "images/comercios/restaurante/assadaoRussao/divulgacao/3.png",
                 
              ],
              
            },
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
                image: "images/comercios/lanchonete/paiol/paiol.png",
                name: "Paiol",
                hours: "qua - dom 19 - 00h",
                address: "Av. Elson Soares, 767 ",
                contact: "(43) 99159-0070",
                delivery: "Sim / Sem Taxa",
                facebook: "www.facebook.com/uahh",
                instagram: "www.instagram.com/uahh",
                infoAdicional:"<a style='color:#2da6ff;' href='https://shop.beetech.com.br/churrascoegastronomia'>Cardapio On Line</a>",
               
                menuImages: [                   
                    "images/comercios/restaurante/paiol/cardapio/1.png",
                    "images/comercios/restaurante/paiol/cardapio/2.png",
                    "images/comercios/restaurante/paiol/cardapio/3.png",
                           
                ],
                novidadesImages: [                    
                    "images/comercios/restaurante/paiol/divulgacao/1.png",
                   "images/comercios/restaurante/paiol/divulgacao/2.png",
                   "images/comercios/restaurante/paiol/divulgacao/3.png",
                   "images/comercios/restaurante/paiol/divulgacao/4.png",
                ],
        
            },






                {
                  image: "images/comercios/restaurante/portal/portal.png",
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

              {
                image: "images/comercios/restaurante/selaht/selaht.png",
                name: "Selaht Grill Pizzaria e Esfiharia",
                hours: "</br>Ter a Dom: 11h - 23h",
                address: "<br>R. Padre Hugo, 460",
                contact: "<br>(43) 9 9160-5120",
                delivery: "</br>Sim / Com Taxa",
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
              hours: "</br>Seg a Sab: 10:30h - 14h",
              address: "<br>Benedito Salles n°910",
              contact: "</br>(43) 99632-3418",
              delivery: "</br>Sim / Com Taxa",
              instagram:"https://www.instagram.com/marmitasdadiih/",
              novidadesImages: [                    
                "images/comercios/restaurante/restauranteDaDi/divulgacao/1.png",
               "images/comercios/restaurante/restauranteDaDi/divulgacao/2.png",
               "images/comercios/restaurante/restauranteDaDi/divulgacao/3.png",
               "images/comercios/restaurante/restauranteDaDi/divulgacao/4.png",
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
    
    
    
    ////////////////////////////////////////////////
    ///////////////////////////////////////////////












    









    //////////////////////////////////////////////
    //////////////////////////////////////////////
    

    
     

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
    ? (() => {
        const rawNumber = (establishment.whatsapp || establishment.contact || "").replace(/\D/g, "");
        const fullNumber = rawNumber.startsWith("55") ? rawNumber : `55${rawNumber}`;
        return `
          <a href="https://api.whatsapp.com/send?phone=${fullNumber}&text=${encodeURIComponent(
            "Olá! Encontrei seu número no Site Olá Carlópolis e gostaria de uma informação!"
          )}" target="_blank" class="icon-link">
            <i class='bx bxl-whatsapp' style="color: #25D366;"></i> WhatsApp
          </a>
        `;
      })()
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
  











      
      ///// inicio



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
  