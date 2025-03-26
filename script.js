

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
    const overlay = document.querySelector("#overlay");
    const menuLinks = document.querySelectorAll(".sidebar .nav_link"); // Seleciona os itens do menu
    const clearSearch = document.getElementById("clearSearch");



    // Inicio pesquisa nome no menu lateral

    // Inicializa o carrossel de Turismo
    const swiperTurismo = new Swiper('.swiper-turismo', {
        loop: true, // Permite rolagem infinita
        navigation: {
            nextEl: '.swiper-button-next',
            prevEl: '.swiper-button-prev',
        },
        autoplay: {
            delay: 4000, // Troca de slide a cada 3 segundos
        },
        effect: 'fade', // Efeito de fade entre os slides
        fadeEffect: {
            crossFade: true, // Faz o fade suave entre os slides
        },
    });

    // Inicializa o carrossel de Eventos
    const swiperEventos = new Swiper('.swiper-eventos', {
        loop: true, // Permite rolagem infinita
        navigation: {
            nextEl: '.swiper-button-next',
            prevEl: '.swiper-button-prev',
        },
        autoplay: {
            delay: 5000, // Troca de slide a cada 3 segundos
        },
        effect: 'fade', // Efeito de fade entre os slides
        fadeEffect: {
            crossFade: true, // Faz o fade suave entre os slides
        },
    });

    ///////////
    // Inicializa o carrossel de Novidades
    const swiperNovidades = new Swiper('.swiper-novidades', {
        loop: true, // Permite rolagem infinita
        navigation: {
            nextEl: '.swiper-button-next',
            prevEl: '.swiper-button-prev',
        },
        autoplay: {
            delay: 6000, // Troca de slide a cada 3 segundos
        },
        effect: 'fade', // Efeito de fade entre os slides
        fadeEffect: {
            crossFade: true, // Faz o fade suave entre os slides
        },
    });


    ///////////
    if (searchInput && clearSearch) {
        // Mostrar ou esconder o botão X ao digitar
        searchInput.addEventListener("input", function () {
          if (searchInput.value.length > 0) {
            clearSearch.style.display = "block";
          } else {
            clearSearch.style.display = "none";
          }
        });
    
        // Limpar o campo ao clicar no "X"
        clearSearch.addEventListener("click", function () {
          searchInput.value = "";
          clearSearch.style.display = "none";
    
          // Dispara um evento de input para garantir que a pesquisa seja resetada
          searchInput.dispatchEvent(new Event("input"));
        });
      }

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
    menuLinks.forEach(link => {
        link.addEventListener("click", function () {
            // Verifica se o item do menu tem a classe "submenu_item"
            if (!this.classList.contains("submenu_item")) {
                // Se for um link válido (não um menu pai), fecha o menu
                sidebar.classList.remove("open");
                overlay.classList.remove("active");
            }
        });
    });



    document.addEventListener("DOMContentLoaded", function () {
        document.getElementById("content_area").classList.remove("hidden");
    });
    if (!searchInput) return; // Evita erro se o campo de busca não existir



    // pagou? defina por s pago n nao pago // PAGx
    const statusEstabelecimentos = {
        // ADEGAS
        adegacuenca: "s",

        //ADVOCACIA
        ruanabilio: "s",

        //Açougue
        açouguedocarlinho: "s",

        // Agropecuaria
        agrovida: "s",

        //farmacia
        elshaday: "s",
        farmais: "s", // Farmais não pagou
        descontofacil1: "s", // Desconto Facil 1 (Joao) não pagou
        drogamais: "s",
        masterfarma: "s",
        popularmais: "s",
        santamaria: "s",
        saudefarma: "s",

        // quitanda
        pimentadoce:"s",


        //lanchonete
        casarao: "s", // Casarao pagou
        paiol: "s", // Paiol pagou

        //supermercado
        mercadorocha: "s", // Mercado Rocha pagou
        carreiro: "s", // Carreiro pagou
        obarateiro: "s", // O Barateiro pagou
        kelve: "s", // Kelve não pagou
        rocha: "s", // Rocha pagou

        // MENU INFORMACOES UTEIS
        hospitalsãojose: "s",
        calendarioeventos: "s",
        feiradalua: "s",
        passeatacontraabarriga: "s",
        prefeitura: "s",
        duvidasereclamações: "s",
        copel:"s",
        sanepar:"s",

        // Adicione outros estabelecimentos aqui

        // pedreiro
        deniscenturion: "s",
    };



    function normalizeName(name) {
        return name
            .toLowerCase()
            .replace(/\s*\(.*?\)\s*/g, '')
            .replace(/\s+/g, '');
            
    }

    function sendPaymentReminder(establishment) {
        alert(`Atenção! O pagamento do site para ${establishment.name} vence hoje.`);
    }


    // Carregar informações de categorias
    const categories = [{
        link: document.querySelector("#menuLanchonete"),
        title: "Lanchonetes",
        establishments: [{
            image: "images/comercios/lanchonete/paiol/paiol.png",
            name: "Paiol",
            hours: "qua - dom 19 - 00h",
            address: "Av. Elson Soares, 767 ",
            // contact: "(11) 99898-5930",   
            contact: "(43) 99159-0070",
            delivery: "Sim / Sem Taxa",
            facebook: "www.facebook.com/uahh",
            instagram: "www.instagram.com/uahh",
            site: "www.google.com",
            menuImage: "images/comercios/lanchonete/paiol/cardapio_1.jpg",
            info: " <strong>Promoção especial:</strong><ul>Compre 1 pizza e ganhe uma sobremesa grátis!</br>Desconto de 15% para pedidos acima de R$ 50,00. </ul> " // Informação personalizada      
        },
        {
            image: "images/comercios/lanchonete/casarao/faxada_casarao.png",
            name: "Casarao",
            hours: "seg - seg - 19h - 00h e dom: 07 - 12h",
            address: "R. Benedito Salles, 341 ",
            contact: "(43) 99693-0565",
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
            image: "images/info_uteis/eventos/evento_1/calendario_evento.png",
            contact: "(43) 2345-6789",
            menuFlyer: "images/info_uteis/eventos/evento_1/calendario_evento.png"

        },
        {
            image: "images/info_uteis/eventos/evento_2/feira_lua_1.png",
            name: "Feira da Lua",
            hours: "sex 19 - 00h",
            address: "Praça Igreja Matriz ",
            contact: "(11) 99898-5930",
            menuFlyer: "images/info_uteis/eventos/evento_2/feira_lua_1.png"
        },
        {
            image: "images/info_uteis/eventos/evento_3/corrida_10.jpg",
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
        title: "Supermercados ",
        establishments: [


            {
                image: "images/comercios/supermercado/carreiro.png",
                name: "Carreiro",
                address: "</br>R. Benedito Salles, 341 ",
                hours: "</br>7h - 20h e dom: 07 - 12h",
                contact: "</br>(43) 2345-6789",
                delivery: "</br>Sim / Com Taxa"
            },
            {
                image: "images/comercios/supermercado/obarateiro.png",
                name: "O Barateiro",
                address: "</br>PR-218, 1168 ",
                hours: "</br>8h - 21h e dom: 07 - 12h",
                contact: "</br>(43) 3456-7890",
                delivery: "</br>Sim / Sem Taxa"
            },
            {
                name: "Kelve",
                address: "</br>PR-218, 1168 ",
                hours: "</br>8h - 21h e dom: 07 - 12h",
                contact: "</br>(43) 3456-7890",
                delivery: "</br>Sim / Sem Taxa"
            },

            {
                name: "Rocha",
                hours: "</br>6h - 20h e dom: 06 - 12h",
                address: "</br>Av. Elson Soares, 767 ",
                contact: "</br>(43) 3566-2436",
                delivery: "</br>Sim / Sem Taxa"
            },

            {
                name: "Carriel",
                address: "</br>PR-218, 1168 ",
                hours: "</br>8h - 21h e dom: 07 - 12h",
                contact: "</br>(43) 3456-7890",
                delivery: "</br>Sim / Sem Taxa"
            },
            {
                name: "Compre Bem +",
                address: "</br>PR-218, 1168 ",
                hours: "</br>8h - 21h e dom: 07 - 12h",
                contact: "</br>(43) 3456-7890",
                delivery: "</br>Sim / Sem Taxa"
            },

            {
                name: "Zero Japan",
                address: "</br>PR-218, 1168 ",
                hours: "</br>8h - 21h e dom: 07 - 12h",
                contact: "</br>(43) 3456-7890",
                delivery: "</br>Sim / Sem Taxa"
            },


        ]
    },


    {
        link: document.querySelector("#menuFarmacia"),
        title: "Farmácias ",
        establishments: [

            {
                image: "images/comercios/farmacia/farmafacil.png",
                name: "Desconto Facil 1 ( Joao )",
                address: "</br>R. Benedito Salles, 574",
                hours: "</br>Seg a Sex: 8h - 18h e Sab: 08 - 12h",
                contact: "</br>(43) 3566-1119",
                delivery: "</br>Sim / Sem Taxa",
                facebook: "www.facebook.com/uahh",
                instagram: "www.instagram.com/uahh",
                site: "www.google.com"

            },
            {
                image: "images/comercios/farmacia/drogamais.png",
                name: "DrogaMais ( Jorginho )",
                hours: "</br>Seg a Sex: 8h - 18h e Sab: 08 - 12h",
                address: "</br>Rua Benedito Salles, 903",
                contact: "</br>(43) 98411-9145",
                delivery: "</br>Sim / Sem Taxa",
                facebook: "www.facebook.com/uahh",
                instagram: "www.instagram.com/uahh",
                site: "www.google.com",
                info: " <strong>Descontao:</strong><ul>Procure o Jorginho e fala que veio atravez do site</br>Receba teu desconto de 1%</ul> " // Informação personalizada      

            },

            {
                image: "images/comercios/farmacia/elshaday.png",
                name: "El Shaday ( Daniel )",
                address: "</br>R. Benedito Sales, 353",
                hours: "</br>Seg a Sex: 8h - 18h e Sab: 08 - 12h",
                contact: "</br>(43) 98488-9420",
                delivery: "</br>Sim / Sem Taxa",
                facebook: "www.facebook.com/uahh",
                instagram: "www.instagram.com/uahh",
                site: "www.google.com"
            },

            {
                image: "images/comercios/farmacia/farmais.png",
                name: "FarMais",
                address: "</br>R. Benedito Salles, 1188",
                hours: "</br>Seg a Sex: 8h - 18h e Sab: 08 - 12h",
                contact: "</br>(43) 3566-1211",
                delivery: "</br>Sim / Sem Taxa",
                facebook: "www.facebook.com/uahh",
                instagram: "www.instagram.com/uahh",
                site: "www.google.com"
            },



            {
                image: "images/comercios/farmacia/masterfarma.png",
                name: "MasterFarma ( Zurdo )",
                address: "</br>R. Laurindo Franco de Godoi, 90",
                hours: "</br>Seg a Sex: 8h - 18h e Sab: 08 - 12h",
                contact: "</br>(43) 3566-1471",
                delivery: "</br>Sim / Sem Taxa",
                facebook: "www.facebook.com/uahh",
                instagram: "www.instagram.com/uahh",
                site: "www.google.com"
            },
            {
                image: "images/comercios/farmacia/popularMais.png",
                name: "PopularMais ( Jeremias )",
                address: "</br>R. Laurindo Franco de Godói, 787",
                hours: "</br>Seg a Sex: 8h - 18h e Sab: 08 - 12h",
                contact: "</br>(43) 3566-1471",
                delivery: "</br>Sim / Sem Taxa",
                facebook: "www.facebook.com/uahh",
                instagram: "www.instagram.com/uahh",
                site: "www.google.com"
            },
            {
                image: "images/comercios/farmacia/santamaria.png",
                name: "Santa Maria ( Aguera )",
                address: "</br>Praça Coronel Leite, nº 711",
                hours: "</br>Seg a Sex: 8h - 18h e Sab: 08 - 12h",
                contact: "</br>(43) 3566-1471",
                delivery: "</br>Sim / Sem Taxa",
                facebook: "www.facebook.com/uahh",
                instagram: "www.instagram.com/uahh",
                site: "www.google.com"
            },

            {
                image: "images/comercios/farmacia/saudeFarma.png",
                name: "Saude Farma",
                address: "</br>Praça Coronel Leite, nº 711",
                hours: "</br>Seg a Sex: 8h - 18h e Sab: 08 - 12h",
                contact: "</br>(43) 99956-8938",
                delivery: "</br>Sim / Sem Taxa",
                facebook: "www.facebook.com/uahh",
                instagram: "www.instagram.com/uahh",
                site: "www.google.com"
            }

        ]
    },

    {
        link: document.querySelector("#menuChurrasqueiro"),
        title: "Churrasqueiros ",
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
        title: "Babas ",
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
        title: "Diaristas",
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
        title: "Eletrecistas",
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
        title: "Encanador",
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
        title: "Guia de Pesca",
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
        title: "Jardineiros ",
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
        title: "Marceneiros ",
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
        title: "Pedreiros ",
        establishments: [{
            image: "images/servicos/pedreiro/denis2.png",
            name: "Denis centurion",
            contact: "(11) 9.5982-2485"
        },
        {
            name: "Kauan",
            contact: "(43) 8901-2345"
        },
        ]
    },

    {
        link: document.querySelector("#menuPintor"),
        title: "Pintor ",
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
        title: "Veterinario ",
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
    info: " <strong>Descontao:</strong><ul>Procure o Zurdo e fala que veio atravez do site</br>Receba teu descontao de 1%</ul> " // Informação personalizada      
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
                    info: " <strong>Descontao:</strong><ul>Procure o Daniel e fala que veio atravez do site</br>Receba teu descontao de 1%</ul> " // Informação personalizada      
        */

        title: "Farmacia de Plantão",
        establishments: [{
            name: "DrogaMais ( Jorginho )",
            address: "Rua Benedito Salles, 903",
            contact: "(43) 98411-9145",
            plantaoHorario: "</br>Das 8h às 21h , De 22/03 a 28/03",
            delivery: "Sim / Sem Taxa",
            image: "images/comercios/farmacia/drogamais.png",
            facebook: "www.facebook.com/uahh",
            instagram: "www.instagram.com/uahh",
            site: "www.google.com",
            info: " <strong>Descontao:</strong><ul>Procure o Jorginho e fala que veio atravez do site</br>Receba teu descontao de 1%</ul> " // Informação personalizada      


        },]
    },


    {

        link: document.querySelector("#menuHospital"),
        title: "Hospital",
        establishments: [{
            name: "Hospital São Jose",
            address: "R. Cap. Estácio, 460",
            contact: "(43) 99174-2539",
            hours: "24 horas",
            image: "images/info_uteis/hospital/hospital.png",
            facebook: "www.facebook.com/uahh",
            instagram: "www.instagram.com/uahh",
            site: "www.google.com"


        },]
    },

    {

        link: document.querySelector("#menuPrefeitura"),

        title: "Prefeitura",
        establishments: [{
            name: "Prefeitura",
            address: "R. Benedito Salles, 1060 - Centro",
            contact: "(43) 3566-1291",
            hours: "8h as 17h",
            image: "images/info_uteis/prefeitura/prefeitura.png",
            facebook: "www.facebook.com/uahh",
            instagram: "www.instagram.com/uahh",
            site: "www.google.com"

        },

        {
            name: "Duvidas e  Reclamações",            
            contact: "(43) 99825-0360",
            hours: "8h as 17h",
            image: "images/info_uteis/prefeitura/prefeitura.png", 

        }



        ]
    },

    {

        link: document.querySelector("#menuHorarioOnibus"),
        title: "Horario de Onibus em Carlópolis",
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
        link: document.querySelector("#menuCopel"),

        title: "Copel",
        establishments: [{


            name: "Copel",
            hours: "seg a sex: 8h - 12h",
            address: "R. Benedito Salles, 1094",
            contact: "(41) 3013-8973",
            image: "images/info_uteis/copel/copel.png", 


        },]
    },

    {
        link: document.querySelector("#menuSanepar"),

        title: "Sanepar",
        establishments: [{


            name: "Sanepar",
            hours: "seg a sex: 8:30h - 12h, 13:30 as 17h",
            address: "R. André Jorge Cleli, 148 ",
            contact: "0800 200 0115",
            image: "images/info_uteis/sanepar/sanepar.png", 


        },]
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


            name: "Açougue do Carlinho",
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



            name: "Agro Vida",
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
            address: "R. Kalil Keder ",
            contact: "(43) 3566-1554",
            delivery: "Sim / Sem Taxa",
            image: "images/comercios/quitanda/pimentadoce.png", 


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
    },

    {
        link: document.querySelector("#menuAdvocacia"),

        title: "Escritorio de Advocacia",
        establishments: [{

            name: "Ruan ABILIO",
            hours: "seg a sex: 8h - 18h e sab: 08 - 12h",
            address: "R. Laurindo Franco de Godoi, 90",
            contact: "(43) 99951-1540",
            delivery: "Sim / Sem Taxa"

        },]
    },

    {
        link: document.querySelector("#menuAssistenciaCelular"),

        title: "Assistencia Celular",
        establishments: [{

            name: "Soraya",
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
        const paidEstablishments = establishments.filter(establishment => {
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
        
          ${paidEstablishments.map(establishment => `
   <li>  
   
     <!-- Exibe a imagem do estabelecimento, se existir -->
${establishment.image ? `
          <img src="${establishment.image}" title="${establishment.name}"  alt="Imagem de ${establishment.name}">
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
            <a href="https://api.whatsapp.com/send?phone=${establishment.contact.replace('+', '').replace(/\D/g, '')}&text=${encodeURIComponent('Olá! Encontrei seu número no Olá Carlópolis e gostaria de uma informação!')}" target="_blank" class="icon-link">
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
             <!-- <button class="flyer-btn" data-name="${establishment.name}" style=" #dfa529; color: white; border: none; padding: 5px 10px; border-radius: 5px; cursor: pointer;">
                Ver Flyer
              </button>-->
              <div class="menu-content" id="menu-${encodeURIComponent(establishment.name)}" style="display: none; text-align: center;">
                <img src="${establishment.menuFlyer}" alt="Flyer de ${establishment.name}" style="width: 100%; max-width: 400px; border-radius: 10px; margin-top: 10px;">
              </div>` : ""}


   </li>
 `).join('')}
</ul>`;

        ///// inicio


        // Função para fechar todos os conteúdos abertos
        function closeAllContents() {
            document.querySelectorAll(".detalhes-content, .menu-content").forEach(content => {
                content.style.display = "none";
            });

            // Restaura o texto e a cor dos botões
            document.querySelectorAll(".detalhes-btn, .menu-btn, .flyer-btn").forEach(button => {
                if (button.classList.contains("detalhes-btn")) {
                    button.textContent = "+ Informações";
                    button.style.backgroundColor = "#007bff"; // Cor original do botão de informações
                } else if (button.classList.contains("menu-btn")) {
                    button.textContent = "Ver Cardápio";
                    button.style.backgroundColor = "#dfa529"; // Cor original do botão de cardápio
                } else if (button.classList.contains("flyer-btn")) {
                    button.textContent = "Ver Flyer";
                    button.style.backgroundColor = "#dfa529"; // Cor original do botão de flyer
                }
            });
        }

        // Função para alternar a exibição de um elemento
        function toggleElement(button, elementId, openText, closeText, openColor, closeColor) {
            const element = document.getElementById(elementId);

            if (!element) {
                console.error(`Elemento #${elementId} não encontrado.`);
                return;
            }

            // Verifica se o conteúdo já está aberto
            if (element.style.display === "block") {
                // Fecha o conteúdo
                element.style.display = "none";
                button.textContent = openText; // Retorna o texto original
                button.style.backgroundColor = closeColor; // Retorna a cor original
            } else {
                // Fecha todos os conteúdos antes de abrir o atual
                closeAllContents();

                // Abre o conteúdo
                element.style.display = "block";
                button.textContent = closeText; // Atualiza o texto do botão
                button.style.backgroundColor = openColor; // Muda a cor do botão
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
                closeAllContents(); // Fecha todos os conteúdos
            });
        });



        // Fim pesquisa nome no menu lateral
    }


    function loadPaidEstablishments() {
        const categories = window.categories || [];
        categories.forEach(category => {
            loadContent(category.title, category.establishments);
        });
    }



    document.addEventListener("DOMContentLoaded", function () {
        loadPaidEstablishments();

    });







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


    // Adicionar eventos para os links do menu
    categories.forEach(category => {
        if (category.link) { // 🔹 Só adicionamos o evento se o link existir
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



    ///// INICIO area de pagamento: 





    ///// FIM AREA DE PAGAMENTO

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