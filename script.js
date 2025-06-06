

function compartilharEstabelecimento(id) {
  if (!id || typeof id !== "string") {
    console.warn("ID inválido para compartilhamento:", id);
    mostrarToast("❌ Erro ao compartilhar: ID inválido");
    return;
  }

  const url = `${window.location.origin}#${id}`;

  if (navigator.share) {
    navigator.share({
      title: "Olá Carlópolis",
      text: "Segue o Link!",
      url: url
    }).catch((err) => {
      console.warn("Compartilhamento cancelado ou falhou:", err);
      mostrarToast("❌ Não foi possível compartilhar.");
    });
  } else {
    navigator.clipboard.writeText(url)
      .then(() => mostrarToast("🔗 Link copiado com sucesso!"))
      .catch(() => alert("Não foi possível copiar o link."));
  }
}


function mostrarToast(mensagem) {
  const toast = document.createElement("div");
  toast.textContent = mensagem;
  toast.className = "toast-compartilhar";
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add("ativo"), 100);
  setTimeout(() => {
    toast.classList.remove("ativo");
    setTimeout(() => document.body.removeChild(toast), 300);
  }, 2000);
}

document.addEventListener("DOMContentLoaded", function () {




////////////// fim botao para compartilha estabelecimento





  function estaAbertoAgora(horarios) {
    const agora = new Date();
    const dias = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"];
    const hoje = dias[agora.getDay()];
    const horaAtualMinutos = agora.getHours() * 60 + agora.getMinutes();
  
    const turnosHoje = horarios[hoje] || [];
  
    for (const turno of turnosHoje) {
      if (!turno || !turno.inicio || !turno.fim) continue;
  
      const [hInicio, mInicio] = turno.inicio.split(":").map(Number);
      const [hFim, mFim] = turno.fim.split(":").map(Number);
  
      if (isNaN(hInicio) || isNaN(mInicio) || isNaN(hFim) || isNaN(mFim)) continue;
  
      const inicioMinutos = hInicio * 60 + mInicio;
      let fimMinutos = hFim * 60 + mFim;
  
      // Caso o horário cruze a meia-noite
      if (fimMinutos <= inicioMinutos) fimMinutos += 1440;
  
      let horaComparada = horaAtualMinutos;
      if (horaAtualMinutos < inicioMinutos) horaComparada += 1440;
  
      if (horaComparada >= inicioMinutos && horaComparada <= fimMinutos) {
        return true;
      }
    }
  
    return false;
  }
  
  

  function proximoHorarioDeAbertura(horarios) {
    const agora = new Date();
    const horaAtual = agora.getHours() + agora.getMinutes() / 60;
  
    const dias = [
      { chave: "dom", nome: "Domingo" },
      { chave: "seg", nome: "Segunda" },
      { chave: "ter", nome: "Terça" },
      { chave: "qua", nome: "Quarta" },
      { chave: "qui", nome: "Quinta" },
      { chave: "sex", nome: "Sexta" },
      { chave: "sab", nome: "Sábado" },
    ];
  
    for (let i = 0; i < 7; i++) {
      const diaIndex = (agora.getDay() + i) % 7;
      const { chave, nome } = dias[diaIndex];
      const faixas = horarios[chave] || [];
  
      for (const faixa of faixas) {
        const [h, m] = faixa.inicio.split(":").map(Number);
        const horaInicio = h + m / 60;
        if (i > 0 || horaInicio > horaAtual) {
          const horaFormatada = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
          return `${nome} às ${horaFormatada}`;
        }
      }
    }
  
    return "em breve"; // se não houver horários futuros
  }
  
  
  function horarioFechamentoAtual(horarios) {
    if (!horarios || typeof horarios !== "object") return null;
  
    const agora = new Date();
    const dias = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"];
    const hoje = dias[agora.getDay()];
    const turnosHoje = horarios[hoje] || [];
  
    const horaAgoraMinutos = agora.getHours() * 60 + agora.getMinutes();
  
    for (const turno of turnosHoje) {
      if (!turno || !turno.inicio || !turno.fim) continue;
  
      const [hInicio, mInicio] = turno.inicio.split(":").map(Number);
      const [hFim, mFim] = turno.fim.split(":").map(Number);
  
      if (isNaN(hInicio) || isNaN(mInicio) || isNaN(hFim) || isNaN(mFim)) continue;
  
      const inicioMinutos = hInicio * 60 + mInicio;
      let fimMinutos = hFim * 60 + mFim;
      let horaComparada = horaAgoraMinutos;
  
      // Caso o horário vá além da meia-noite
      if (fimMinutos <= inicioMinutos) {
        fimMinutos += 1440;
        if (horaComparada < inicioMinutos) horaComparada += 1440;
      }
  
      if (horaComparada >= inicioMinutos && horaComparada <= fimMinutos) {
        return turno.fim;
      }
    }
  
    return null;
  }
  
  
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

// Função para registrar clique no Firebase
function registrarCliqueBotao(tipo, idEstabelecimento) {
  const hoje = new Date().toISOString().slice(0, 10);
  const ref = firebase.database().ref(`cliquesPorBotao/${hoje}/${idEstabelecimento}/${tipo}`);
  ref.transaction((atual) => (atual || 0) + 1);
}

const destaquesFixos = [
  "feiradalua", "seiza","vania", "esquinadopao", "limone","pesqueirodogalego"
  
]; 

function montarCarrosselDivulgacao() {
  const listaTodos = [];

  categories.forEach(cat => {
    cat.establishments?.forEach(est => {
      const nomeNormalizado = normalizeName(est.name);
      const imagens = est.novidadesImages || [];

      if (statusEstabelecimentos[nomeNormalizado] === "s" && imagens.length > 0) {
        listaTodos.push({ ...est, nomeNormalizado });
      }
    });
  });

  const fixos = destaquesFixos
  .map(nome => listaTodos.find(e => e.nomeNormalizado === nome))
  .filter(Boolean);

  const restantes = listaTodos.filter(e => !destaquesFixos.includes(e.nomeNormalizado));
  //const sorteados = restantes.sort(() => Math.random() - 0.5).slice(0, Math.max(0, 20 - fixos.length)); RAMDOMICO
  //const sorteados = restantes.slice(0, Math.max(0, 20 - fixos.length)); fixo sempre os primeiro do
  const sorteados = restantes.sort(() => Math.random() - 0.5).slice(0, Math.max(0, 20 - fixos.length));


  const totalExibir = [...fixos, ...sorteados].slice(0, 22);

  const swiperWrapper = document.querySelector(".swiper-novidades .swiper-wrapper");
  if (!swiperWrapper) return;

  swiperWrapper.innerHTML = ""; // Limpa conteúdo atual

  totalExibir.forEach(est => {
    const categoria = categories.find(cat =>
      cat.establishments?.some(e => e.name === est.name)
    )?.title || "";
  
    const imagem = destaquesFixos.includes(est.nomeNormalizado)
      ? est.novidadesImages[0] // sempre a primeira imagem para fixos
      : est.novidadesImages[Math.floor(Math.random() * est.novidadesImages.length)];
  
    const indexImagem = est.novidadesImages.indexOf(imagem);
    const texto = est.novidadesDescriptions?.[indexImagem] || "Confira nossas novidades!";
  
    const slide = document.createElement("div");
    slide.classList.add("swiper-slide");
  
    slide.innerHTML = `
      <img class="content_image" src="${imagem}" alt="${est.name}">
      <div class="info_divulgacao">
        <h3>${categoria ? categoria + " - " + est.name : est.name}</h3>
        <p>${texto}</p>
        ${est.instagram ? `<a href="${est.instagram}" target="_blank" class="mais-info">+ informações</a>` : ""}
      </div>
    `;
  
    swiperWrapper.appendChild(slide);
  });
  
  
  setTimeout(() => {
    document.querySelectorAll(".share-btn").forEach((botao) => {
      botao.addEventListener("click", () => {
        const id = botao.getAttribute("data-share-id");
        if (id) compartilharEstabelecimento(id);
      });
    });
  }, 300);
  
  
  
}


    // pagou? defina por s pago n nao pago // PAGx
    const statusEstabelecimentos = {

      // COMERCIOS:

      //academia
      lobofitness:"s",

      //AÇAI
      turminhadoacai:"s",

      //Açougue
      acouguecuritiba: "s",

      // ADEGAS
      adegacuenca: "s",
      assao:"s",
  
      //ADVOCACIA  
      advocaciaabilio: "s",
  
      // Agropecuaria
      agrovida: "s", 
      saojose:"s", 
  

      // assessocia balistica
      betogunsassessoriaarmaria:"s",
      //agencia turismo
      cvccarlopolis:"s",

        // assistencia celular
        oficinadocelular:"s",
      
// auto peças
paulinhoautopecas:"s",
norbaautopecas:"s",

// cartorip
cartoriomariazelia:"s",

//chaveiro
chaveirocentral:"s",


      //confecção
      yellowjeans:"s",
      panacea:"s",
  
      // borracharia
      vidanova: "s",
  // deposito de gas
  liagas:"s",
  cncasadogas:"s",

// clinica veterinaria

clinicaveterinariacarlopolis:"s",

//DESPACHANTE
rodriguinho:"s",

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

      //imobiliaria      
      imobiliariacarlopolis:"s",

      // foodtruck
      celeiro:"s",

      //funeraria
      cristorei:"s",
      grupocastilho:"s",
      

      // grafica
     
      serigraf:"s",

      //loja de pesca
      pescaepresente:"s",

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
      esquinadopao:"s",
      saofrancisco:"s",
      prelie:"s",      
  
      //pizzaria
      fornalhapizzaria: "s",
      tonnypizzaria:"s",
  
      // quitanda
      pimentadoce: "s",
  
      //lanchonete
      ocasarao: "s",       
      ione:"s",
      cantinhodapraca:"s",
      caldodecanaamaral:"s",
      espacogourmet:"s",
      kidoglanches:"s",
      didog:"s",
      xisbauinea:"s",
      mycoffee:"s",
  
      // material de construcao
      lojaferreira:"s",

      //supermercado
      bompreco:"s",      
      carreiro: "s", 
      comprebemmais:"s",
      obarateiro: "s", 
      kelve: "s", 
      rocha: "s", 
      zerojapan:"s",
  
      // pesqueiro
      peskepagueaguamarine: "s",

      // radio
      carlopolitana:"s",

      // restaurantes
      assadaodorussao:"s",
      cabanas:"s",
      cantinaitaliana:"s",
      delfino:"s",
      pesqueirodogalego:"s",
      portal:"s",
      neia:"s",
      oficinadosabor:"s",
      paiol: "s", 
      restaurantedadi:"s",
      sabordaroca:"s",
      selahtgrill:"s",
      yingyang:"s",

      // produtos de limpeza
      jmprodutosdelimpeza:"s",
    
      
      // sorveteria
      limone:"s",
      sorvetessallesferreira:"s",
      santtinogelateria:"s",

      // topografia
      da2engenharia:"s",
  
      //// FIM COMERCIO ////////////////////////////////////////////////////////////////////////////////////////
  
      //// INICIO SERVIÇOS ////////////////////////////////////////////////////////////////////////////////////////////////
  
      //anuncio
      piodoanuncio: "s",

      //barbeiro
      luisbarbeiro:"s",

      //cantor
      foguinho:"s",
  
      // churrasqueiro
      flaviogiovani:"s", 
  
      //diarista
      rose: "s",

      //frete
      anselmofrete:"s",
      erickson:"s",
  
      // guia de pesca
      fabiosushimoto: "s",

      // montador de moveis
      hirancastro:"s",     
      
      //podologa
      vania:"s",
  
      // taxista
      douglasdotaxi: "s",
        lucianodotaxi: "s",
          rogerdotaxi: "s",

      // VETERINARIO

      celsogolcalves:"s",
      jurandirmachado:"s",
  
      


      // FIMMMM SERVIÇOSSSSSS

/// INICIO SETOR PUBLICO
      agendamentosaude:"s",
      agendamentodeviagens:"s",
      asilo:"s",
      agenciatrabalhador:"s",
      copel: "s",
      correio:"s",    
      cras:"s",
      clubedexadrez:"s",
      
      // cheches:
      ainzararossisallescmei:"s",
      isabeldallabdasilvacmeiprofa:"s",
      marinhafogacadeoliveiracmei:"s",
      
      delegacia: "s",

      // escolas
      beneditorodriguesdecamargo:"s",
      cmeiraymundasantanasalles:"s",
      carolinalupion:"s",
      escolamunicipaljosesalles:"s",     
      herciliadepaulaesilva:"s",

      //posto de saude
      ubseugenionevessoares:"s",
      centrodesaudedrjose:"s",
      
      hospitalsaojose: "s",
      prefeitura: "s",
      duvidasereclamacoes: "s",
      sanepar: "s",
      samuzinho:"s",      
      rodoviaria:"s",
      secretariadasaude:"s",
      sindicatorural:"s",      
      vigilanciasanitaria:"s",


/// FIM SETOR PUBLICO

// INFORMAÇOES

// INICIO NOTA DE FALECIMENTO
funerariacristorei:"s",
funerariagrupocastilho:"s",

// FIM NOTA DE FALECIMENTO

     
  // INICIO EVENTOS 
  feiradalua: "s",
  calendarioeventos: "s",
  
  festajuninaapae:"s",
  frutfest:"s",
  cresolrun:"s",
  truco:"s",
  beachvolleyball:"s",
  encontrocarroantigo:"s",
  festadosenhorbomjesus:"s",
  standup:"s", 
  campeonatoparanafishing:"s",
  lowcity:"s",  
  toroonagashi:"s",
  passeiociclisticorotary:"s",

 

      /// FIM EVENTOS 

      
    };
  
    const body = document.querySelector("body");
    //const darkLight = document.querySelector("#darkLight");
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
   window.swiperTurismo = new Swiper(".swiper-turismo", {
  loop: true,
  navigation: {
    nextEl: ".swiper-button-next",
    prevEl: ".swiper-button-prev",
  },
  autoplay: { delay: 4000 },
  effect: "fade",
  fadeEffect: { crossFade: true }
});
addSlideCounters(window.swiperTurismo, ".swiper-turismo");

window.swiperEventos = new Swiper(".swiper-eventos", {
  loop: true,
  navigation: {
    nextEl: ".swiper-button-next",
    prevEl: ".swiper-button-prev",
  },
  autoplay: { delay: 5000 },
  effect: "fade",
  fadeEffect: { crossFade: true }
});
addSlideCounters(window.swiperEventos, ".swiper-eventos");

window.swiperNovidades = new Swiper(".swiper-novidades", {
  loop: true,
  navigation: {
    nextEl: ".swiper-button-next",
    prevEl: ".swiper-button-prev",
  },
  autoplay: { delay: 6500 },
  effect: "fade",
  fadeEffect: { crossFade: true }
});
addSlideCounters(window.swiperNovidades, ".swiper-novidades");

  
   
  
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
    .normalize("NFD")                // separa letras de acentos
    .replace(/[\u0300-\u036f]/g, "") // remove acentos
    .replace(/[ç]/g, "c")            // substitui cedilha
    .replace(/\s+/g, "");            // remove espaços
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
                hours: "Seg a Qui: 06:00h as 13:00h - 15:00h as 21:00h <br> Sex: 06:00h as 13:00h - 15:00h as 20:30h<br> Sab: 15:00h as 18:00h <br>Dom: Fechado ",
                statusAberto:" ",
                horarios: {
                  dom: [], // fechado
                  seg: [{ inicio: "06:00", fim: "13:00" },{ inicio: "15:00", fim: "21:00" }],
                  ter: [{ inicio: "06:00", fim: "13:00" },{ inicio: "15:00", fim: "21:00" }],
                  qua: [{ inicio: "06:00", fim: "13:00" },{ inicio: "15:00", fim: "21:00" }],
                  qui: [{ inicio: "06:00", fim: "13:00" },{ inicio: "15:00", fim: "21:00" }],
                  sex: [{ inicio: "06:00", fim: "13:00" },{ inicio: "15:00", fim: "20:30" }],
                  sab: [{ inicio: "15:00", fim: "18:00" }]
                },
                address: "R. Delfino Mendes, 264 - Centro",
                contact: "(43) 99112-1009",                          
                facebook: "https://www.facebook.com/teamlobofitnesscarlopolis",
                instagram: "https://www.instagram.com/academialobocarlopolis/",
                novidadesImages: [ 
                "images/comercios/academia/lobofitness/divulgacao/1.png",
                "images/comercios/academia/lobofitness/divulgacao/2.png",
                "images/comercios/academia/lobofitness/divulgacao/3.png",
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
                            hours: "Qua a Seg: 14:00h as 23:00h <br> Ter: Fechado",
                            statusAberto:".",
                            horarios: {
                              dom: [{ inicio: "14:00", fim: "23:00" }],
                              seg: [{ inicio: "14:00", fim: "23:00" }],
                              ter: [], // fechado
                              qua: [{ inicio: "14:00", fim: "23:00" }],
                              qui: [{ inicio: "14:00", fim: "23:00" }],
                              sex: [{ inicio: "14:00", fim: "23:00" }],
                              sab: [{ inicio: "14:00", fim: "23:00" }]
                            },
                            address: "Rua Benedito Salles, 409",
                            contact: "(43) 99176-7871",
                            contact2:" (43) 98868-7038",
                            delivery: "Sim / Com Taxa",
                            instagram: "https://www.instagram.com/turminha_do_acai/",
                            
                            
                            infoAdicional:"Espetinhos de Quinta a Sabado",
                            novidadesImages: [            
                            "images/comercios/acai/turminhaAcai/novidades/1.png", 
                            "images/comercios/acai/turminhaAcai/novidades/2.png",
                            "images/comercios/acai/turminhaAcai/novidades/3.png",  
                            "images/comercios/acai/turminhaAcai/novidades/4.png",                                            
                            ],
                            novidadesDescriptions: [                            
                            "Marmita de Açai! Voce só encontra aqui!",
                            "Nossos espetos montados na hora",
                            "3",
                            "Espetinhos Diferenciados",
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
                    title: "Açougue",
                    establishments: [
                        {
                            image: "images/comercios/acougue/curitiba/curitiba.png",
                            name: "Açougue Curitiba",
                            hours: "Seg a Sex: 8:00h as 18:00h </br> Sab: 08:00h as 12:00h",
                            statusAberto:"a",
                            horarios: {
                              dom: [{ inicio: "08:00", fim: "18:00" }],
                              seg: [{ inicio: "08:00", fim: "18:00" }],
                              ter: [{ inicio: "08:00", fim: "18:00" }],
                              qua: [{ inicio: "08:00", fim: "18:00" }],
                              qui: [{ inicio: "08:00", fim: "18:00" }],
                              sex: [{ inicio: "08:00", fim: "18:00" }],
                              sab: [{ inicio: "08:00", fim: "12:00" }]
                            },
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
                    title: "Adega",
                    establishments: [
                        {
                            image: "images/comercios/adega/cuenca/adega_cuenca.jpg",
                            name: "Adega Cuenca",
                            hours:
                            "Seg 09:00h as 19:30h </br> Ter e Qua 09:00h as 22:00h </br> Qui a Sab 09:00h as 23:50h </br> Dom 09:00h as 22:00h",
                            statusAberto:".",
                            horarios: {
                              
                              seg: [{ inicio: "09:00", fim: "19:30" }],
                              ter: [{ inicio: "09:00", fim: "22:00" }],
                              qua: [{ inicio: "09:00", fim: "22:00" }],
                              qui: [{ inicio: "09:00", fim: "23:50" }],
                              sex: [{ inicio: "09:00", fim: "23:50" }],
                              sab: [{ inicio: "09:00", fim: "23:50" }],
                              dom: [{ inicio: "09:00", fim: "22:00" }],
                            },
                            address: "R. Kalil Keder, 752",
                            contact: "(43) 99800-1680",
                            delivery: "Sim / Sem Taxa",
                            instagram: "https://www.instagram.com/adegaclps/",
                            facebook:"https://www.facebook.com/adega.carlopolis.37/",

                            novidadesImages: [ 
                              "images/comercios/adega/cuenca/divulgacao/1.png",
                              "images/comercios/adega/cuenca/divulgacao/2.png",
                              "images/comercios/adega/cuenca/divulgacao/3.png",
                              "images/comercios/adega/cuenca/divulgacao/4.png",
                              "images/comercios/adega/cuenca/divulgacao/5.png",
                              "images/comercios/adega/cuenca/divulgacao/6.png",
                              ],
                              novidadesDescriptions: [                            
                                "Chop Brahma encontra aqui!",
                                "Chop HASS encontra aqui!",
                                " ",
                                " ",
                                " ",
                                "Pediu chegou! Delivery de bebidas!",
                              ],
                              
                        },

                        {
                          image: "images/comercios/adega/assao/assao.png",
                          name: "Assao",
                          hours:"Dom a Dom - 09:00h as 22:00h ",
                          statusAberto:"a",
                            horarios: {
                              
                              seg: [{ inicio: "09:00", fim: "22:00" }],
                              ter: [{ inicio: "09:00", fim: "22:00" }],
                              qua: [{ inicio: "09:00", fim: "22:00" }],
                              qui: [{ inicio: "09:00", fim: "22:00" }],
                              sex: [{ inicio: "09:00", fim: "22:00" }],
                              sab: [{ inicio: "09:00", fim: "22:00" }],
                              dom: [{ inicio: "09:00", fim: "22:00" }]
                            },
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
                        hours: "Seg a Sab: 11:00h as 22:00h",
                        statusAberto:"a",
                            horarios: {
                              
                              seg: [{ inicio: "11:00", fim: "22:00" }],
                              ter: [{ inicio: "11:00", fim: "22:00" }],
                              qua: [{ inicio: "11:00", fim: "22:00" }],
                              qui: [{ inicio: "11:00", fim: "22:00" }],
                              sex: [{ inicio: "11:00", fim: "22:00" }],
                              sab: [{ inicio: "11:00", fim: "22:00" }],
                              dom: []
                            },
                        address: "Rua Padre Hugo, 450, Sala 10",
                        contact: "(43) 99177-2244",
                        instagram:"https://www.instagram.com/cvc.pr.carlopolis/",
                        facebook:"https://www.facebook.com/CVC.PR.Carlopolis?mibextid=LQQJ4d",
                    },
                ],
            },



                {
                    link: document.querySelector("#menuAgropecuaria"),  
                    title: "Agropecuaria",
                    establishments: [

                       
                        {
                            image: "images/comercios/agropecuaria/agroVida/agrovida.png",
                            name: "Agro Vida",
                            hours: "Seg a Sex: 08:00h as 18:00h </br> Sab: 08:00h as 16:00h",
                            statusAberto:"a",
                            horarios: {
                              
                              seg: [{ inicio: "08:00", fim: "18:00" }],
                              ter: [{ inicio: "08:00", fim: "18:00" }],
                              qua: [{ inicio: "08:00", fim: "18:00" }],
                              qui: [{ inicio: "08:00", fim: "18:00" }],
                              sex: [{ inicio: "08:00", fim: "18:00" }],
                              sab: [{ inicio: "08:00", fim: "16:00" }],
                              dom: []
                            },
                            address: "Rua Benedito salles,309 - Carlopolis",
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


                        {
                            image: "images/comercios/agropecuaria/saoJose/perfil.png",
                            name: "São Jose",
                            hours: "Seg a Sex: 8:00h as 19:00h </br> Sab: 08:00h as 19:00h",
                            statusAberto:"a",
                            horarios: {
                              
                              seg: [{ inicio: "08:00", fim: "19:00" }],
                              ter: [{ inicio: "08:00", fim: "19:00" }],
                              qua: [{ inicio: "08:00", fim: "19:00" }],
                              qui: [{ inicio: "08:00", fim: "19:00" }],
                              sex: [{ inicio: "08:00", fim: "19:00" }],
                              sab: [{ inicio: "08:00", fim: "19:00" }],
                              dom: []
                            },
                            address: "Rua Benedito Salles 35, Carlópolis",
                            contact: "(43) 99682-9898",
                            delivery: "Sim / Sem Taxa",
                            facebook: "https://www.facebook.com/p/Ra%C3%A7%C3%B5es-S%C3%A3o-Jos%C3%A9-100088108752876/",
                            
                            novidadesImages: [
                              "images/comercios/agropecuaria/saoJose/divulgacao/1.png",
                            
                              
                          ],
                          novidadesDescriptions: [  
                            "Ração QUIDOG no precinho",                          
                            
                           
                          ],
                        },

                        
                    ],
                },



                {
    link: document.querySelector("#menuAssessoriaBalistica"),
    title: "Assessoria Balistica",
    establishments: [
        {
            image: "images/comercios/assessoriaBalistica/betogun/perfil.png",
            name: "Beto Guns Assessoria Armaria",
            hours: "Seg a Sex: 09:00h as 16:30h",
            statusAberto:".",
            horarios: {                          
              seg: [{ inicio: "09:00", fim: "16:30" }],
              ter: [{ inicio: "09:00", fim: "16:30" }],
              qua: [{ inicio: "09:00", fim: "16:30" }],
              qui: [{ inicio: "09:00", fim: "16:30" }],
              sex: [{ inicio: "09:00", fim: "16:30" }],
              sab: [],
              dom: [],
            }, 
            address: "R. Nicolau Miguel, 452 - sala 1 - centro, Carlópolis",
            contact: "(43) 99135-4012", 
            infoAdicional:"IAT e Armeiro Credenciado • Port. SR/PF/PR N° 1821 de 08/23<br> Perito cred TJPR<br>Despachante<br>Assessoria<br>Cursos",          
          
            facebook: "https://www.facebook.com/betopedreira.instrutor.armeiro/",
            instagram: "https://www.instagram.com/betopedreira.instrutor.armeiro/",
            novidadesImages: [
         
             "images/comercios/assessoriaBalistica/betogun/divulgacao/1.png",
             "images/comercios/assessoriaBalistica/betogun/divulgacao/2.png",
             "images/comercios/assessoriaBalistica/betogun/divulgacao/3.png",
           
            ],   
            novidadesDescriptions : [  
"Confiança em primeiro Lugar",
"Entre em contato para tirar qualquer tipo de duvida sobre armamentos",
"Treinamento teorico e pratico!",



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
                          hours: "Seg a Sex: 8:00h as 18:00h<br> Sab: 08:00h as 17:00h",
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
                  title: "Auto Peça",
                  establishments: [

{
                          image: "images/comercios/autopecas/norba/perfil.png",
                                 
                          name: "Norba Auto Peças",
                          hours: "Seg a Sex: 07:00h as 18:00h<br> Sab: 07:00h as 12:00h",
                          address: "Av Anesio Fernandes Machado, 341 - Carlopolis",
                          contact: "(43) 99620-3108",         
                          contact2:"(43) 99610-1135",               
                          instagram: "https://www.instagram.com/norba_comerciodepecas/",
                          novidadesImages: [                 
                            
                            "images/comercios/autopecas/norba/divulgacao/1.png",
                            "images/comercios/autopecas/norba/divulgacao/2.png",
                            "images/comercios/autopecas/norba/divulgacao/3.png",
                            "images/comercios/autopecas/norba/divulgacao/4.png",
                            "images/comercios/autopecas/norba/divulgacao/5.png",
                        ],                
                      },



                      {
                          image: "images/comercios/autopecas/paulinho/perfil.png",
                                 
                          name: "Paulinho auto peças",
                          hours: "Seg a Sex: 07:00h as 18:00h<br> Sab: 07:00h as 12:00h",
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
                link: document.querySelector("#menuChaveiro"),  
                title: "Chaveiro",
                establishments: [
                    {
                        image: "images/comercios/chaveiro/central/perfil.png",
                        name: "Chaveiro Central",
                        hours: "Dom a Dom: 8:00h as 20:00h",
                        statusAberto:"a",
                        horarios: {
                          dom: [{ inicio: "08:00", fim: "20:00" }],
                          seg: [{ inicio: "08:00", fim: "20:00" }],
                          ter: [ {inicio: "08:00", fim: "20:00" }],
                          qua: [{ inicio: "08:00", fim: "20:00" }],
                          qui: [{ inicio: "08:00", fim: "20:00" }],
                          sex: [{ inicio: "08:00", fim: "20:00" }],
                          sab: [{ inicio: "08:00", fim: "20:00" }]
                        },
                        address: "R. Ataliba Leonel, 287 - Carlopolis",
                        contact: "(43) 99632-3898",
                        infoAdicional:"Atendemos Emergêncas<br>Confecções de chaves automotivas<br>Confecções de chaves residenciasis<br>Abertua de veiculos<br>Abertura de residencias<br>Codificação de chaves automotivas<br>Codificação de controles residenciais",
                        instagram:"https://www.instagram.com/chaveiro.central.77/",
                        novidadesImages: [ 
                        "images/comercios/chaveiro/central/divulgacao/1.png",
                        "images/comercios/chaveiro/central/divulgacao/2.png",
                        "images/comercios/chaveiro/central/divulgacao/3.png",
                        "images/comercios/chaveiro/central/divulgacao/4.png",
                        "images/comercios/chaveiro/central/divulgacao/5.png",
                        ],
                        novidadesDescriptions: [                            
                          "Transponder",
                          "Evite falhas na multimídia e preserve a originalidade do seu veículo! Com a remoção do chip, sua central continua funcionando perfeitamente, sem erros ou travamentos.",
                        "Com design compacto e funcional, nossos canivetes oferecem facilidade no uso e segurança, combinando tecnologia e estilo",
                        "Garanta a segurança que você merece com nossas chaves Yale simples por apenas R$8,00! Qualidade e durabilidade por um preço que cabe no seu bolso",
                        "Temos uma grande variedade de cilindros de ignição para diferentes modelos de veículos, garantindo que você encontre a peça perfeita para o seu carro",
                        
                        ],
                    },
                ],
            },





            {
                    link: document.querySelector("#menuCartorios"),  
                    title: "Cartorio",
                    establishments: [

                       
                        {
                            image: "images/comercios/cartorio/fabiano/perfil.png",
                            name: "Cartorio Maria Zelia",
                            hours: "Seg a Sex: 8:30h as 11:00h - 13:00h as 17:00h",
                            statusAberto:"a",
                            horarios: {
                          
                            seg: [{ inicio: "08:30", fim: "11:00" },{ inicio: "13:00", fim: "17:00" }],
                            ter: [{ inicio: "08:30", fim: "11:00" },{ inicio: "13:00", fim: "17:00" }],
                            qua: [{ inicio: "08:30", fim: "11:00" },{ inicio: "13:00", fim: "17:00" }],
                            qui: [{ inicio: "08:30", fim: "11:00" },{ inicio: "13:00", fim: "17:00" }],
                            sex: [{ inicio: "08:30", fim: "11:00" },{ inicio: "13:00", fim: "17:00" }],
                            sab: [],
                            dom: [],
                        },
                            address: "R. Salvira Marquês, 453 - Carlópolis",
                            contact: "(43) 99621-5094",  
                            infoAdicional:"Registro: de nascimento, de casamento, de obito, averbações e certidões.",           
                            
                           
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
                        hours: "Seg a Sex: 09:00h as 18:00h <br>Sab: 09:00h a 17:00h<br>Dom: Fechado",
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
                        image: "images/comercios/confeccao/panaceia/perfil.png",
                        name: "Panacea",
                        hours: "Seg a Sex: 8:00h as 18:00h<br>Sab: 08:00h as 12:00h",
                        statusAberto:"a",
                        horarios: {
                          
                          seg: [{ inicio: "08:00", fim: "18:00" }],
                          ter: [ {inicio: "08:00", fim: "18:00" }],
                          qua: [{ inicio: "08:00", fim: "18:00" }],
                          qui: [{ inicio: "08:00", fim: "18:00" }],
                          sex: [{ inicio: "08:00", fim: "18:00" }],
                          sab: [{ inicio: "08:00", fim: "12:00" }],
                          dom: [],
                        },
                        address: "Padre Hugo, 475, Centro - Carlópolis",
                        contact: "(43) 99606-1356",
                        contact2: "(43) 3566-1383",
                        instagram:"https://www.instagram.com/panaceaconfeccoes/",
                        facebook:"https://www.facebook.com/panacea.conf/?locale=pt_BR",
                        novidadesImages: [ 
                          "images/comercios/confeccao/panaceia/divulgacao/1.png",
                          "images/comercios/confeccao/panaceia/divulgacao/2.png",
                          "images/comercios/confeccao/panaceia/divulgacao/3.png",
                          "images/comercios/confeccao/panaceia/divulgacao/4.png",
                        
                          ],
                          novidadesDescriptions: [                            
                            "Camisa para ciclista.",
                            "Body de bebê e camisetas personalizadas ",
                            "Camisa de pesca em sublimação total.",
                            "Uniformes esportivos",
                          
                          ],
                    },


                        {
                            name: "Yellow Jeans",
                            hours: "Seg a Sex: 9:00h as 11:30h -  13:00h as 17:00h",
                            address: "Rua Maria Pereira da Rocha Aleixo, 435",
                            contact: "(43) 998070671",
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
                          hours: "Seg a Sex: 08:00h as 18:00h",
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
                        hours: "Sex: 19:00h as 23:30h",
                        address: "Praça Igreja Matriz",
                        contact: "(43) 99965-2084",                         
                        instagram: "https://www.instagram.com/feiradaluacarlopolis/",
                        novidadesImages: [                 
                          
                          "images/comercios/feiraLua/divulgacao/1.png",
                          "images/comercios/feiraLua/divulgacao/2.png",
                          "images/comercios/feiraLua/divulgacao/3.png",
                          "images/comercios/feiraLua/divulgacao/4.png",
                          "images/comercios/feiraLua/divulgacao/5.png",
                          "images/comercios/feiraLua/divulgacao/6.png",
                          "images/comercios/feiraLua/divulgacao/7.png",
                      ],     
                      
                      novidadesDescriptions: [ 
"Fernando e Mary - 06/06 a partir das 19:00hrs",


                      ],
                    },
                ],
            },




  {
    link: document.querySelector("#menuFuneraria"),
    title: "Funeraria",
    establishments: [
        {
            image: "images/comercios/funeraria/cristorei/perfil.png",
            name: "Cristo Rei",
            hours: "Seg a Sab: 08:00h as 18:00h",
            statusAberto:".",
            horarios: {                          
              seg: [{ inicio: "08:00", fim: "18:00" }],
              ter: [{ inicio: "08:00", fim: "18:00" }],
              qua: [{ inicio: "08:00", fim: "18:00" }],
              qui: [{ inicio: "08:00", fim: "18:00" }],
              sex: [{ inicio: "08:00", fim: "18:00" }],
              sab: [{ inicio: "08:00", fim: "18:00" }],
              dom: [],
            }, 
            address: "Av Benedito Salles N°1277, Carlópolis",
            contact: "(43) 99637-2328",           
            facebook: "https://www.facebook.com/funerariacristoreicarlopolispr",
            instagram: "https://www.instagram.com/funeraria_cristoreiclps/",
            novidadesImages: [
         
             "images/comercios/funeraria/cristorei/divulgacao/1.png",
             
             
            ],     
            novidadesDescriptions: [ 
"Mais do que uma despedida, nós oferecemos uma homenagem",
"Resolvemos tudo para que você não precise pensar em burocracia em um momento de tanta dor",

             

             ],              
        },



{
            image: "images/comercios/funeraria/castilho/perfil.png",
            name: "Grupo Castilho",
            hours: "Seg a Sab: 08:00h as 18:00h<br> Plantão 24hrs",
            statusAberto:".",
            horarios: {                          
              seg: [{ inicio: "08:00", fim: "18:00" }],
              ter: [{ inicio: "08:00", fim: "18:00" }],
              qua: [{ inicio: "08:00", fim: "18:00" }],
              qui: [{ inicio: "08:00", fim: "18:00" }],
              sex: [{ inicio: "08:00", fim: "18:00" }],
              sab: [{ inicio: "08:00", fim: "18:00" }],
              dom: [],
            }, 
            address: "Rua Capitão Estácio, 329 - Centro, Carlópolis",
            contact: "(43) 99668-9078", 
            contact2: "(43) 99972-2809", 
             contact3: "(43) 99932-1983",         
            facebook: "https://www.facebook.com/funerariagrupocastilho",
            instagram: "https://www.instagram.com/funerariagrupocastilho/",
            novidadesImages: [
         
             "images/comercios/funeraria/castilho/divulgacao/1.png",
             
             
            ],     
            novidadesDescriptions: [ 
"A coroa de flores representa mais do que um arranjo, é um gesto de amor, respeito e despedida, uma forma delicada de expressar sentimentos eternos e honrar memórias que jamais serão esquecidas.",


             

             ],              
        },

    ],
},






                {
                  link: document.querySelector("#menuGrafica"),
                  title: "Grafica",
                  establishments: [
                      {
                          image: "images/comercios/grafica/serigraf/perfil.png",
                          name: "Serigraf",
                          hours: "Seg a Sex: 08:00h as 12:00h - 13:00h as 17:00h",
                          statusAberto:".",
                          horarios: {                          
                            seg: [{ inicio: "08:00", fim: "12:00" },{ inicio: "13:00", fim: "17:00" },],
                            ter: [{ inicio: "08:00", fim: "12:00" },{ inicio: "13:00", fim: "17:00" },],
                            qua: [{ inicio: "08:00", fim: "12:00" },{ inicio: "13:00", fim: "17:00" },],
                            qui: [{ inicio: "08:00", fim: "12:00" },{ inicio: "13:00", fim: "17:00" },],
                            sex: [{ inicio: "08:00", fim: "12:00" },{ inicio: "13:00", fim: "17:00" },],
                            sab: [],
                            dom: [],
                          }, 
                          address: "R. Padre Hugo, 486 - Carlópolis,",
                          contact: "(43) 99906-4434",            
                          delivery: "Sim / Com Taxa",
                          facebook: "https://www.facebook.com/serigraf.carlopolis/?locale=pt_BR",
                          instagram: "https://www.instagram.com/serigraf.carlopolis/",
                          novidadesImages: [
                      
                          "images/comercios/grafica/serigraf/divulgacao/1.png",
                          "images/comercios/grafica/serigraf/divulgacao/2.png",
                          "images/comercios/grafica/serigraf/divulgacao/3.png",
                          "images/comercios/grafica/serigraf/divulgacao/4.png",
                          "images/comercios/grafica/serigraf/divulgacao/5.png",
                          ],                    
                      },
                  ],
              },



            {
              link: document.querySelector("#menuImobiliaria"),  
              title: "Imobiliaria",
              establishments: [
                  {
                      image: "images/comercios/imobiliaria/imobiliariaCarlopolis/perfil.png",
                      name: "Imobiliaria Carlopolis",
                      hours: "Seg a Sex: 08:00h as 18:00h<br>Sab: 08:00h as 12:00h",
                      statusAberto:".",
                      horarios: {
                        
                        seg: [{ inicio: "08:00", fim: "20:00" }],
                        ter: [ {inicio: "08:00", fim: "20:00" }],
                        qua: [{ inicio: "08:00", fim: "20:00" }],
                        qui: [{ inicio: "08:00", fim: "20:00" }],
                        sex: [{ inicio: "08:00", fim: "20:00" }],
                        sab: [{ inicio: "08:00", fim: "12:00" }],
                        dom: []
                      },
                      address: "Rua Benedito Salles n°1.033 - Centro, Carlópolis",
                      contact: "(43) 99686-4716",
                      infoAdicional:"Somos Correspondente Caixa",
                      instagram:"https://www.instagram.com/imobiliariacarlopolis/",
                      facebook:"https://www.facebook.com/imobiliariacarlopolis/?locale=pt_BR",
                      site:"https://www.imobiliariacarlopolis.com.br/",
                      novidadesImages: [ 
                      "images/comercios/imobiliaria/imobiliariaCarlopolis/divulgacao/1.png",
                      "images/comercios/imobiliaria/imobiliariaCarlopolis/divulgacao/2.png",
                      "images/comercios/imobiliaria/imobiliariaCarlopolis/divulgacao/3.png",
                      
                      ],
                      novidadesDescriptions: [                            
                        "Terrenos exclusivos em Barão de Antonina!",
                        "Loteamento Bela Vista",
                         "Correspondente Caixa",
                        
                      ],
                  },
              ],
            },




                {
                    link: document.querySelector("#menuLanchonete"),
                    title: "Lanchonete",
                    establishments: [


                      {
                        image: "images/comercios/lanchonete/caldodecanaamaral/perfil.png",
                        name: "Caldo de Cana Amaral",
                        hours: "Dom a Dom: 13:00h as 18:30h",
                        statusAberto:".",
                        horarios: {                          
                          seg: [{ inicio: "13:00", fim: "18:30" }],
                          ter: [{ inicio: "13:00", fim: "18:30" }],
                          qua: [{ inicio: "13:00", fim: "18:30" }],
                          qui: [{ inicio: "13:00", fim: "18:30" }],
                          sex: [{ inicio: "13:00", fim: "18:30" }],
                          sab: [{ inicio: "13:00", fim: "18:30" }],
                          dom: [{ inicio: "13:00", fim: "18:30" }]
                        },
                        address: "Rua Benedito Salles, 2639, Carlópolis",
                        contact: "(43) 99977-8839",
                        delivery: "Sim / Com Taxa",
                        infoAdicional:"<a target='_blank' style='color:#2da6ff;' href='https://www.youtube.com/watch?v=LkTSbakmFrE'>Conheça nossas especiarias!</a>",
                
                      
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
                        hours: "Ter a Dom: 18:00h as 23:30h",
                        statusAberto:".",
                        horarios: {
                          
                          seg: [],
                          ter: [{ inicio: "18:00", fim: "23:30" }],
                          qua: [{ inicio: "18:00", fim: "23:30" }],
                          qui: [{ inicio: "18:00", fim: "23:30" }],
                          sex: [{ inicio: "18:00", fim: "23:30" }],
                          sab: [{ inicio: "18:00", fim: "23:30" }],
                          dom: [{ inicio: "18:00", fim: "23:30" }]
                        },
                        address: "R. Padre Hugo, 478 , Carlópolis",
                        contact: "(43) 99604-9187",
                        delivery: "Sim / Com Taxa",  
                        instagram:"https://www.instagram.com/cantinhodapraca043/",                      
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
                      hours: "Seg a Dom: 19:00h as 23:30h",
                      statusAberto:".",
                      horarios: {
                        
                        seg: [{ inicio: "19:00", fim: "23:30" }],
                        ter: [{ inicio: "19:00", fim: "23:30" }],
                        qua: [{ inicio: "19:00", fim: "23:30" }],
                        qui: [{ inicio: "19:00", fim: "23:30" }],
                        sex: [{ inicio: "19:00", fim: "23:30" }],
                        sab: [{ inicio: "19:00", fim: "23:30" }],
                        dom: [{ inicio: "19:00", fim: "23:30" }]
                      },
                      address: "R. Benedito Salles, 350, Carlopolis",
                      contact: "(43) 99161-8381",
                      delivery: "Sim / Com Taxa",   
                      instagram:"https://www.instagram.com/didog_prensados/",
                      menuImages: [                   
                        "images/comercios/lanchonete/didog/cardapio/1.png",
                        "images/comercios/lanchonete/didog/cardapio/2.png",
                        "images/comercios/lanchonete/didog/cardapio/3.png",
                        
                       
                    ],  novidadesImages: [
                        
                      "images/comercios/lanchonete/didog/divulgacao/1.png",
                      "images/comercios/lanchonete/didog/divulgacao/2.png",
                      "images/comercios/lanchonete/didog/divulgacao/3.png",
                      "images/comercios/lanchonete/didog/divulgacao/4.png",
                      "images/comercios/lanchonete/didog/divulgacao/5.png",
                     
                    
                  ],   
                  novidadesDescriptions: [
                           "Dogão Caprichado",
                           "Suco do Bill 100% natural",
                           "Dog Paulista,venha experimentar",
                           "Dog Paulista com Doritos",
                           "Dog em recheado!",

                  ], 
                  },





                  {
                    image: "images/comercios/lanchonete/espacoGourmet/perfil.png",
                    name: "Espaço Gourmet",
                    hours: "Ter a Sab: 17:00h as 23:30h<br>Dom: 15:00h a 23:30h",
                    statusAberto:".",
                    horarios: {
                      
                      seg: [],
                      ter: [{ inicio: "17:00", fim: "23:30" }],
                      qua: [{ inicio: "17:00", fim: "23:30" }],
                      qui: [{ inicio: "17:00", fim: "23:30" }],
                      sex: [{ inicio: "17:00", fim: "23:30" }],
                      sab: [{ inicio: "17:30", fim: "23:30" }],
                      dom: [{ inicio: "15:00", fim: "23:30" }]
                    },
                    address: "Avenida Turística Elias Mehi Mansur 738",
                    contact: "(43) 99105-6257",
                    delivery: "Sim / Com Taxa",   
                    
                      infoAdicional:"<a target='_blank' style='color:#2da6ff;' href='https://pediucomeu.com.br/espacogourmet' >Cardapio On Line</a>",
             
             
                    facebook:"https://www.facebook.com/p/Espa%C3%A7o-Gourmet-100063553480172/",
                    instagram:"https://www.instagram.com/pamellaoizumidasilva/",
                                      
                    menuImages: [                   
                        "images/comercios/lanchonete/espacoGourmet/cardapio/1.png",
                        "images/comercios/lanchonete/espacoGourmet/cardapio/2.png",   
                        "images/comercios/lanchonete/espacoGourmet/cardapio/3.png",
                        "images/comercios/lanchonete/espacoGourmet/cardapio/4.png", 
                        "images/comercios/lanchonete/espacoGourmet/cardapio/5.png",
                        "images/comercios/lanchonete/espacoGourmet/cardapio/6.png",
                        "images/comercios/lanchonete/espacoGourmet/cardapio/7.png", 
                        "images/comercios/lanchonete/espacoGourmet/cardapio/8.png",
                        "images/comercios/lanchonete/espacoGourmet/cardapio/9.png"                        
                    ],     
                    novidadesImages: [                      
                      "images/comercios/lanchonete/espacoGourmet/divulgacao/1.png",
                      "images/comercios/lanchonete/espacoGourmet/divulgacao/2.png",
                      "images/comercios/lanchonete/espacoGourmet/divulgacao/3.png",
                      "images/comercios/lanchonete/espacoGourmet/divulgacao/4.png",                      
                  ],               
                },


{
                          image: "images/comercios/lanchonete/ione/ione.png",
                          name: "Ione",
                          hours: "Seg a Sab: 9:30h as 19:30h",
                          statusAberto:".",
                          horarios: {                            
                            seg: [{ inicio: "09:30", fim: "19:30" }],
                            ter: [{ inicio: "09:30", fim: "19:30" }],
                            qua: [{ inicio: "09:30", fim: "19:30" }],
                            qui: [{ inicio: "09:30", fim: "19:30" }],
                            sex: [{ inicio: "09:30", fim: "19:30" }],
                            sab: [{ inicio: "09:30", fim: "19:30" }],
                            dom: []
                          },
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
                      image: "images/comercios/lanchonete/kidog/perfil.png",
                      name: "Ki Dog lanches",
                      hours: "Ter a Dom: 18:00h as 23:30h",
                      statusAberto:".",
                      horarios: {
                        
                        seg: [],
                        ter: [{ inicio: "18:00", fim: "23:30" }],
                        qua: [{ inicio: "18:00", fim: "23:30" }],
                        qui: [{ inicio: "18:00", fim: "23:30" }],
                        sex: [{ inicio: "18:00", fim: "23:30" }],
                        sab: [{ inicio: "18:00", fim: "23:30" }],
                        dom: [{ inicio: "18:00", fim: "23:30" }]
                      },
                      address: "R. Padre Hugo, 478 , Carlópolis",
                      contact: "(43) 99952-7826",
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
                    name: "My Coffee",
                    hours: "Seg: Fechado<br>Ter a Qui: 13:00h as 19:00h <br>Sex: 13:00h as 18:00h<br>Sab: 13:00h as 20:00h<br>Dom: 13:00h as 20:00h",
                    statusAberto:".",
                    horarios: {
                      
                      seg: [],
                      ter: [{ inicio: "13:00", fim: "19:00" }],
                      qua: [{ inicio: "13:00", fim: "19:00" }],
                      qui: [{ inicio: "13:00", fim: "19:00" }],
                      sex: [{ inicio: "13:00", fim: "19:00" }],
                      sab: [],
                      dom: [{ inicio: "13:00", fim: "20:00" }]
                    },
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
                            hours: "Ter a Dom: 18:00h as 00:30h",
                            statusAberto:".",
                            horarios: {
                              
                              seg: [],
                              ter: [{ inicio: "18:00", fim: "00:30" }],
                              qua: [{ inicio: "18:00", fim: "00:30" }],
                              qui: [{ inicio: "18:00", fim: "00:30" }],
                              sex: [{ inicio: "18:00", fim: "00:30" }],
                              sab: [{ inicio: "18:00", fim: "00:30" }],
                              dom: [{ inicio: "18:00", fim: "00:30" }]
                            },
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
                        image: "images/comercios/lanchonete/xisBauinea/perfil.png",
                        name: "Xis Bauinea",
                        hours: "Qui a Ter: 18:00h as 23:00h<br>Qua: Fechado",
                        statusAberto:".",
                        horarios: {                            
                          seg: [{ inicio: "18:00", fim: "23:00" }],
                          ter: [{ inicio: "18:00", fim: "23:00" }],
                          qua: [],
                          qui: [{ inicio: "18:00", fim: "23:00" }],
                          sex: [{ inicio: "18:00", fim: "23:00" }],
                          sab: [{ inicio: "18:00", fim: "23:00" }],
                          dom: [{ inicio: "18:00", fim: "23:00" }]
                        },
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
            title: "Pizzaria",
            establishments: [
                {
                    image: "images/comercios/pizzaria/fornalha/fornalha.png",
                    name: "Fornalha Pizzaria",
                    hours:"Qua a Qui: 18:00h as 23:00h </br>Sex a Sab: 18:00h as 00:00h </br> Dom: 18:00 as 23:00h",
                    statusAberto:".",
                    horarios: {                          
                      seg: [],
                      ter: [],
                      qua: [{ inicio: "18:00", fim: "23:00" }],
                      qui: [{ inicio: "18:00", fim: "23:00" }],
                      sex: [{ inicio: "18:00", fim: "00:00" }],
                      sab: [{ inicio: "18:00", fim: "00:00" }],
                      dom: [{ inicio: "18:00", fim: "23:00" }],
                    }, 
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
                  hours:"Seg a Ter: 18:00h as 23:30h <br> Qua: Fechado<br>Qui a Dom: 18:00h as 23:30h",
                  statusAberto:".",
                  horarios: {                          
                    seg: [{ inicio: "18:00", fim: "23:30" }],
                    ter: [{ inicio: "18:00", fim: "23:30" }],
                    qua: [],
                    qui: [{ inicio: "18:00", fim: "23:30" }],
                    sex: [{ inicio: "18:00", fim: "23:30" }],
                    sab: [{ inicio: "18:00", fim: "23:30" }],
                    dom: [{ inicio: "18:00", fim: "23:30" }],
                  }, 
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
                    hours: "Sex a Dom: 09:30h as 18:00h",
                    statusAberto:".",
                    horarios: {                          
                      seg: [],
                      ter: [],
                      qua: [],
                      qui: [],
                      sex: [{ inicio: "09:30", fim: "18:00" }],
                      sab: [{ inicio: "09:30", fim: "18:00" }],
                      dom: [{ inicio: "09:30", fim: "18:00" }],
                    }, 
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
          link: document.querySelector("#menuRadio"),
          title: "Radio",
          establishments: [
              {
                  image: "images/comercios/radio/carlopolitana/perfil.png",
                  name: "Carlopolitana",
                  hours: "Seg a Sex: 06:00h as 19:00h<br>Sab: 08:00h as 17:00h<br>08:00h as 12:00h",
                  statusAberto:".",
                  horarios: {                          
                    seg: [{ inicio: "06:00", fim: "19:00" }],
                    ter: [{ inicio: "06:00", fim: "19:00" }],
                    qua: [{ inicio: "06:00", fim: "19:00" }],
                    qui: [{ inicio: "06:00", fim: "19:00" }],
                    sex: [{ inicio: "06:00", fim: "19:00" }],
                    sab: [{ inicio: "08:00", fim: "17:00" }],
                    dom: [{ inicio: "08:00", fim: "12:00" }],
                  }, 
                  address: "Rua Januario Francisco Falarz, 128, Carlópolis",
                  contact:"(43) 99628-6686",
                  contact2: "(43) 3566-2328",                 
                  facebook: "https://www.facebook.com/carlopolitanafm/?locale=pt_BR",
                  instagram: "https://www.instagram.com/carlopolitanafm/",
                  site:"https://www.carlopolitanafm.com.br/?fbclid=PAZXh0bgNhZW0CMTEAAad8PhwvElNeRofoPTlpyFT1nz4Uh9etElI-3EtwgvmWVFQyKt0FxbPmWizd0Q_aem_27nMAxQanrHJ1awpU0BLTA",
                  
                  
                  infoAdicional: "Baixe o App da Rádio:<br><a target='_blank' style='color:#2e7d32;' href='https://play.google.com/store/apps/details?id=carlopolitana.virtues.ag.appradio.pro&hl=pt_BR&pli=1'><i class='fab fa-android'></i> Android</a>  ou  <a target='_blank' style='color:#db0d0d;' href='https://apps.apple.com/br/app/radiosnet/id1089290449'><i class='fab fa-apple'></i> Apple</a><br> ou escute <a target='_blank' style='color:#007bff' href='https://apps.apple.com/br/app/radiosnet/id1089290449'> On-line:</a> ",

                  
                  novidadesImages: [               
                   "images/comercios/radio/carlopolitana/divulgacao/1.jpg",
                   "images/comercios/radio/carlopolitana/divulgacao/2.jpeg",
                   "images/comercios/radio/carlopolitana/divulgacao/3.jpeg",
                   "images/comercios/radio/carlopolitana/divulgacao/4.jpeg",
                   "images/comercios/radio/carlopolitana/divulgacao/5.jpeg",
                   "images/comercios/radio/carlopolitana/divulgacao/6.jpeg",
                   "images/comercios/radio/carlopolitana/divulgacao/7.jpeg",
                   "images/comercios/radio/carlopolitana/divulgacao/8.jpeg",
                   "images/comercios/radio/carlopolitana/divulgacao/9.jpeg",
                  ],
                  novidadesDescriptions: [               
                    "Nos escute em qualquer plataforma!",
                    "Entre em contato pelo WhatsApp!",
                    "Temos aplicativos para voce ouvir e receber notificações em qualquer lugar!",
                    "",
                    "Fique informado com noticias da cidade e região!",
                    "Suas noites com o melhor do passado",
                    "",
                    "Nos siga nas redes sociais!",
                    "E não pode faltar nosso programa de modão!",
                    "24hrs transmitindo",
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
                  hours: "Seg a Sab: 13:00h as 23:00h<br>Dom: 14:00h as 00:00h",
                  statusAberto:".",
                  horarios: {                          
                    seg: [{ inicio: "13:00", fim: "23:00" }],
                    ter: [{ inicio: "13:00", fim: "23:00" }],
                    qua: [{ inicio: "13:00", fim: "23:00" }],
                    qui: [{ inicio: "13:00", fim: "23:00" }],
                    sex: [{ inicio: "13:00", fim: "23:00" }],
                    sab: [{ inicio: "13:00", fim: "23:00" }],
                    dom: [{ inicio: "14:00", fim: "00:00" }],
                  }, 
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
                image: "images/comercios/sorveteria/salles/perfil.png",
                name: "Sorvetes Salles Ferreira",
                hours: "Dom a Dom: 13:30h as 22:00h",
                statusAberto:".",
                horarios: {                            
                  seg: [{ inicio: "13:30", fim: "22:00" }],
                  ter: [{ inicio: "13:30", fim: "22:00" }],
                  qua: [{ inicio: "13:30", fim: "22:00" }],
                  qui: [{ inicio: "13:30", fim: "22:00" }],
                  sex: [{ inicio: "13:30", fim: "22:00" }],
                  sab: [{ inicio: "13:30", fim: "22:00" }],
                  dom: [{ inicio: "13:30", fim: "22:00" }]
                },
                address: "R. Kalil Keder, n° 525 - Carlópolis",
                contact: "(43) 99600-1919",
                delivery: "Não",
                facebook: "https://www.facebook.com/sorvetessalles/?locale=pt_BR",
                instagram: "https://www.instagram.com/sorvetessalles/",
                menuImages: [
                 
                  "images/comercios/sorveteria/salles/cardapio/1.jpeg",
                  "images/comercios/sorveteria/salles/cardapio/2.jpeg",
                
                 ], 
                novidadesImages: [              
                 "images/comercios/sorveteria/salles/divulgacao/1.png",
                 "images/comercios/sorveteria/salles/divulgacao/2.png",
                 "images/comercios/sorveteria/salles/divulgacao/3.png",
                 "images/comercios/sorveteria/salles/divulgacao/4.png",
                 "images/comercios/sorveteria/salles/divulgacao/5.png",
                ],     
                novidadesDescriptions: [                            
                  "Açaí irresistível do jeito que você ama, cheio de complementos deliciosos! Venha experimentar na Sorveteria Salles Ferreira",
                  "Está planejando uma confraternização inesquecível? Ou está planejando algo especial? Nossa caixa de sorvetes é a escolha perfeita para refrescar os momentos de confraternização",
                  "Qual seria o sabor que você escolheria para acompanhar?",
                  "Quer se refrescar com muito sabor? Experimente nossos milkshakes deliciosos e cremosos! Escolha seu sabor favorito e venha se deliciar! ",
                  "Nosso petit gâteau com sorvete é a combinação perfeita entre o quente e o frio. Venha provar e se encantar!",
              
                ],               
            },



              {
                image: "images/comercios/sorveteria/santino/santino.png",
                name: "Santtino Gelateria",
                hours: "Dom a Sex: 13:00h as 22:00h<br>Sab: 13:00h as 23:00h",
                statusAberto:".",
                horarios: {                          
                  seg: [{ inicio: "13:00", fim: "22:00" }],
                  ter: [{ inicio: "13:00", fim: "22:00" }],
                  qua: [{ inicio: "13:00", fim: "22:00" }],
                  qui: [{ inicio: "13:00", fim: "22:00" }],
                  sex: [{ inicio: "13:00", fim: "22:00" }],
                  sab: [{ inicio: "13:00", fim: "23:00" }],
                  dom: [{ inicio: "13:00", fim: "22:00" }],
                }, 
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
            title: "Padaria",
            establishments: [
                {
                    image: "images/comercios/padaria/bom jesus/bomjesus.png",
                    name: "Bom Jesus",
                    hours: "Seg a Sab: 6:00h as 19:00h </br> Dom: 06:00h as 14:00h",
                    statusAberto:".",
                    horarios: {                          
                      seg: [{ inicio: "06:00", fim: "19:00" }],
                      ter: [{ inicio: "06:00", fim: "19:00" }],
                      qua: [{ inicio: "06:00", fim: "19:00" }],
                      qui: [{ inicio: "06:00", fim: "19:00" }],
                      sex: [{ inicio: "06:00", fim: "19:00" }],
                      sab: [{ inicio: "06:00", fim: "19:00" }],
                      dom: [{ inicio: "06:00", fim: "14:00" }],
                    }, 
                    address: "R. Benedito Salles, 615",
                    contact: "43) 99653-9285",
                    delivery: "Sim / Com Taxa",
                    facebook: "https://www.facebook.com/PanificadoraRestauranteBomJesus/?locale=pt_BR",
                    instagram: "https://www.instagram.com/bom_jesus_panificadora/",
                    novidadesImages: [
                      
                        "images/comercios/padaria/bom jesus/novidades/1.png",
                        "images/comercios/padaria/bom jesus/novidades/2.png",
                        "images/comercios/padaria/bom jesus/novidades/3.png",
                        "images/comercios/padaria/bom jesus/novidades/4.png",
                        "images/comercios/padaria/bom jesus/novidades/5.png",
                       
                    ],
                    novidadesDescriptions:[
                      "Pão Frances","Tortinhas","Mini Churros","Mistos Quente","Sucos de Frutas",

                    ],
                    menuImages: [
                 
                      "images/comercios/padaria/bom jesus/cardapio/1.png",
                      "images/comercios/padaria/bom jesus/cardapio/2.png",
                      "images/comercios/padaria/bom jesus/cardapio/3.png",
                     
                     ],  
                },


{
                  image: "images/comercios/padaria/esquinadopao/perfil.png",
                  name: "Esquina do Pão",
                  hours: "Seg a Sab: 06:00h as 19:00h </br> Dom: 06:00h as 12:00h",
                  statusAberto:".",
                  horarios: {                          
                    seg: [{ inicio: "06:00", fim: "19:00" }],
                    ter: [{ inicio: "06:00", fim: "19:00" }],
                    qua: [{ inicio: "06:00", fim: "19:00" }],
                    qui: [{ inicio: "06:00", fim: "19:00" }],
                    sex: [{ inicio: "06:00", fim: "19:00" }],
                    sab: [{ inicio: "06:00", fim: "19:00" }],
                    dom: [{ inicio: "06:00", fim: "12:00" }],
                  }, 
                  address: "R. Ipê Roxo, 209 - Carlópolis",
                  contact: "(43) 99808-0362",
                  delivery: "Não",                  
                  instagram: "https://www.instagram.com/esquinadopaoclps/",
                  novidadesImages: [                   
                      "images/comercios/padaria/esquinadopao/divulgacao/1.png",
                      "images/comercios/padaria/esquinadopao/divulgacao/2.png",
                      "images/comercios/padaria/esquinadopao/divulgacao/3.png",
                      "images/comercios/padaria/esquinadopao/divulgacao/4.png",
                      "images/comercios/padaria/esquinadopao/divulgacao/5.png",
                     
                     
                  ],
                  novidadesDescriptions: [

"Precisando de um bolo de última hora? Não se preocupe! Temos opções prontinhas para você: Leite Ninho, Brigadeiro e Dois Amores",
"Nosso rocambole fresquinho, com recheio de leite ninho ou doce de leite, é a escolha perfeita para adoçar o dia com muito sabor e carinho!",
"Temos pizza pré-assada 🍕🍕",
"Surpreenda sua família com o nosso pudim de leite condensado no almoço de domingo. É sucesso garantido! 🧡",
"Experimente esse delicioso lanche de forno, perfeito para qualquer momento do dia.",

                  ],
              },



                {
                  image: "images/comercios/padaria/prelie/prelie.png",
                  name: "Prelie",
                  hours: "Seg a Sab: 05:30h as 19:00h </br> Dom: 05:30h as 12:00h",
                  statusAberto:".",
                  horarios: {                          
                    seg: [{ inicio: "05:30", fim: "19:00" }],
                    ter: [{ inicio: "05:30", fim: "19:00" }],
                    qua: [{ inicio: "05:30", fim: "19:00" }],
                    qui: [{ inicio: "05:30", fim: "19:00" }],
                    sex: [{ inicio: "05:30", fim: "19:00" }],
                    sab: [{ inicio: "05:30", fim: "19:00" }],
                    dom: [{ inicio: "05:30", fim: "12:00" }],
                  }, 
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
                  hours: "Seg a Sab: 05:30h as 19:00h </br> Dom: 5:30h as 12:00h",
                  statusAberto:".",
                horarios: {                          
                  seg: [{ inicio: "05:30", fim: "19:00" }],
                  ter: [{ inicio: "05:30", fim: "19:00" }],
                  qua: [{ inicio: "05:30", fim: "19:00" }],
                  qui: [{ inicio: "05:30", fim: "19:00" }],
                  sex: [{ inicio: "05:30", fim: "19:00" }],
                  sab: [{ inicio: "05:30", fim: "19:00" }],
                  dom: [{ inicio: "05:30", fim: "12:00" }],
                }, 
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
            link: document.querySelector("#menuDespachante"),    
            title: "Despachante",
            establishments: [
                {

image: "images/comercios/despachante/rodriguinho/perfil.png",
                    name: "Rodriguinho",
                    hours: "Seg a Sex: 08:30h as 11:30h - 13:00h as 17:00h",
                      statusAberto:".",
                horarios: {                          
                  seg: [{ inicio: "08:30", fim: "11:30" },{inicio: "13:00", fim: "17:00" }],
                  ter: [{ inicio: "08:30", fim: "11:30" },{inicio: "13:00", fim: "17:00" }],
                  qua: [{ inicio: "08:30", fim: "11:30" },{inicio: "13:00", fim: "17:00" }],
                  qui: [{ inicio: "08:30", fim: "11:30" },{inicio: "13:00", fim: "17:00" }],
                  sex: [{ inicio: "08:30", fim: "11:10" },{inicio: "13:00", fim: "17:00" }],
                  sab: [],
                  dom: [],
                }, 
                    address: "Rodovia PR 218, 91 - Carlopolis",
                    contact: "(43) 99812-5120",
                    infoAdicional:"⚠️ 2° Via CRV,<br>⚠️ Atpv-e,<br> ⚠️ Comunicação de Venda,<br> ⚠️ Emplacamentos,<br>⚠️ Guia de Multas, IPVA,<br>⚠️ Licenciamento, <br>⚠️ Transferências  "
                },
            ],
        },




      
        {
            link: document.querySelector("#menuMercado"),
            title: "Supermercado",
            establishments: [

              {
                image: "images/comercios/supermercado/bomPreco/perfil.png",
                name: "Bom Preço",
                address: "R. Chuva de Ouro, 397 - Vista Alegre, Carlópolis",
                hours: "Dom a Dom: 8:00h as 19:30h",
                statusAberto:".",
                horarios: {                          
                  seg: [{ inicio: "08:00", fim: "19:30" }],
                  ter: [{ inicio: "08:00", fim: "19:30" }],
                  qua: [{ inicio: "08:00", fim: "19:30" }],
                  qui: [{ inicio: "08:00", fim: "19:30" }],
                  sex: [{ inicio: "08:00", fim: "19:30" }],
                  sab: [{ inicio: "08:00", fim: "19:30" }],
                  dom: [{ inicio: "08:00", fim: "19:30" }],
                },  
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
                    hours: "Seg a Sex: 08:00h as 19:00h <br> Dom: 08:00 as 12:00h",
                    statusAberto:".",
                    horarios: {                          
                      seg: [{ inicio: "08:00", fim: "19:00" }],
                      ter: [{ inicio: "08:00", fim: "19:00" }],
                      qua: [{ inicio: "08:00", fim: "19:00" }],
                      qui: [{ inicio: "08:00", fim: "19:00" }],
                      sex: [{ inicio: "08:00", fim: "19:00" }],
                      sab: [{ inicio: "08:00", fim: "19:00" }],
                      dom: [{ inicio: "08:00", fim: "12:00" }],
                    },  
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
                  hours: "Seg a Sex: 07:00h as 20:00h </br> Dom: 08:00 as 12:00h",
                  statusAberto:".",
                  horarios: {                          
                    seg: [{ inicio: "07:00", fim: "20:00" }],
                    ter: [{ inicio: "07:00", fim: "20:00" }],
                    qua: [{ inicio: "07:00", fim: "20:00" }],
                    qui: [{ inicio: "07:00", fim: "20:00" }],
                    sex: [{ inicio: "07:00", fim: "20:00" }],
                    sab: [{ inicio: "07:00", fim: "20:00" }],
                    dom: [{ inicio: "08:00", fim: "12:00" }],
                  },  
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
                    hours: "Seg a Sex: 8:00h as 21:00h </br> Dom: 08:00h as 12:00h",
                    contact: "(43) 99196-7816",
                    delivery: "Sim / Sem Taxa",
                    facebook: "https://www.facebook.com/MercadoObarateiro",
                    instagram: "https://www.instagram.com/supermercado_obarateiro/p/DFgIRupxbr-/",
                },
                {
                    image: "images/comercios/supermercado/kelve.png",
                    name: "Kelve",
                    address: "R. Paul Harris,104",
                    hours: "Seg a Sex: 8:00h as 19:30h </br> Dom: 08:30h as 12:30h",
                    statusAberto:".",
                    horarios: {                          
                      seg: [{ inicio: "08:00", fim: "19:30" }],
                      ter: [{ inicio: "08:00", fim: "19:30" }],
                      qua: [{ inicio: "08:00", fim: "19:30" }],
                      qui: [{ inicio: "08:00", fim: "19:30" }],
                      sex: [{ inicio: "08:00", fim: "19:30" }],
                      sab: [{ inicio: "08:00", fim: "19:30" }],
                      dom: [{ inicio: "08:30", fim: "12:30" }],
                    },  
                    contact: "(43) 99844-6105",
                    delivery: "Sim / Sem Taxa",
                    facebook: "https://www.facebook.com/p/Kelve-Carl%C3%B3polis-100010521284877/?locale=pt_BR",
                    instagram: "https://www.instagram.com/kelvesupermercadosoficial/",
                },
    
                {
                    image: "images/comercios/supermercado/rocha.jpg",
                    name: "Rocha",
                    hours: "Seg a Sex: 06:00h as 20:00h <br> Dom: 06:00h as 12:00h",
                    statusAberto:".",
                    horarios: {                          
                      seg: [{ inicio: "06:00", fim: "20:00" }],
                      ter: [{ inicio: "06:00", fim: "20:00" }],
                      qua: [{ inicio: "06:00", fim: "20:00" }],
                      qui: [{ inicio: "06:00", fim: "20:00" }],
                      sex: [{ inicio: "06:00", fim: "20:00" }],
                      sab: [{ inicio: "06:00", fim: "20:00" }],
                      dom: [{ inicio: "06:00", fim: "20:00" }],
                    },  
                    address: "Av. Elson Soares, 767 ",
                    contact: "(43) 99105-9324",
                    delivery: "Sim / Sem Taxa",
                    facebook: "https://www.facebook.com/p/Kelve-Carl%C3%B3polis-100010521284877/?locale=pt_BR",
                    instagram: "https://www.instagram.com/kelvesupermercadosoficial/",
                },
    
                {
                    name: "Carriel",
                    address: "PR-218, 1168 ",
                    hours: "Seg a Sex: 8:00h as 21:00h </br> Dom: 07:00h as 12:00h",
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
                    hours: "Seg a Seg: 8:00h as 20:00h",
                    contact: "(43) 3142-2005", 
                    whatsapp: "4331422005", 
                    delivery: "Sim / Sem Taxa",
                },
            ],
        },






{
                    link: document.querySelector("#menuProdutosLimpeza"),  
                    title: "Produtos de Limpeza",
                    establishments: [
                       
                        {
                            image: "images/comercios/produtosLimpeza/jm/perfil.png",
                            name: "J M Produtos de Limpeza",
                            hours: "Seg a Sex: 08:00h as 18:00h </br> Sab: 08:00h as 12:00h",
                            statusAberto:".",
                            horarios: {                          
                            seg: [{ inicio: "08:00", fim: "18:00" }],
                            ter: [{ inicio: "08:00", fim: "18:00" }],
                            qua: [{ inicio: "08:00", fim: "18:00" }],
                            qui: [{ inicio: "08:00", fim: "18:00" }],
                            sex: [{ inicio: "08:00", fim: "18:00" }],
                            sab: [{ inicio: "08:00", fim: "12:00" }],
                            dom: [],
                            }, 
                            address: " R. Kalil Keder, 503 - Centro, Carlópolis",
                            contact: "(43) 99692-9674",
                            delivery: "Sim / Sem Taxa",
                            facebook: "https://www.facebook.com/p/JM-Produtos-de-Limpeza-100076385972701/",
                            instagram: "https://www.instagram.com/jmprodutosdelimpezacarlopolis/",
                            novidadesImages: [
                              "images/comercios/produtosLimpeza/jm/divulgacao/1.png",
                              "images/comercios/produtosLimpeza/jm/divulgacao/2.png",
                              "images/comercios/produtosLimpeza/jm/divulgacao/3.png",
                              "images/comercios/produtosLimpeza/jm/divulgacao/4.png",
                              "images/comercios/produtosLimpeza/jm/divulgacao/5.png",
                              "images/comercios/produtosLimpeza/jm/divulgacao/6.png",
                              
                              
                          ],
                          novidadesDescriptions: [ 
                            "Temos produtos para limpeza de todos os setores!", 
                            "Muitas Variedades em protudos de limpeza, venha conferir!",                          
                            "Temos Lixos de todos os tipos e tamanhos!",   
                            "Linha completa para limpeza de piscinas",                          
                            "Linha completa para limpeza de piscinas", 
                            "Linha completa para limpeza automotiva",                         
                            
                          ],
                        },

                        
                    ],
                },






         //// farmacias
        {
            link: document.querySelector("#menuFarmacia"),
            title: "Farmácia",
            establishments: [

                {
                    image: "images/comercios/farmacia/bioFarma/biofarma.jpg",
                    name: "Bio Farma",
                    address: "Rua Laurindo Franco Godoy, 464",
                    hours: "<strong>Seg a Sex:</strong> 08:00h as 18:00h </br><strong>Sab: </strong>08:00h as 12:00h",
                    statusAberto:".",
                    horarios: {                          
                      seg: [{ inicio: "08:00", fim: "18:00" }],
                      ter: [{ inicio: "08:00", fim: "18:00" }],
                      qua: [{ inicio: "08:00", fim: "18:00" }],
                      qui: [{ inicio: "08:00", fim: "18:00" }],
                      sex: [{ inicio: "08:00", fim: "18:00" }],
                      sab: [{ inicio: "08:00", fim: "18:00" }],
                      dom: [{ inicio: "08:00", fim: "18:00" }]
                    },  
                    
                    contact: "(43) 3566-1473",
                    delivery: "Sim / Sem Taxa",
              
                    instagram: "https://www.instagram.com/farmaciabiofarmaa/",
                    
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
                    address: "R. Benedito Salles, 574 - Carlopolis",
                    plantaoHorario: "08:00h às 21:00h", 
                    plantaoData:"Sab 31/05 a Sex 06/06",
                    hours: "Seg a Sex: 08:00h as 18:00h </br> Sab: 08:00h as 12:00h",
                    
                    statusAberto:".",
                    horarios: {                          
                      seg: [{ inicio: "08:00", fim: "21:00" }],
                      ter: [{ inicio: "08:00", fim: "21:00" }],
                      qua: [{ inicio: "08:00", fim: "21:00" }],
                      qui: [{ inicio: "08:00", fim: "21:00" }],
                      sex: [{ inicio: "08:00", fim: "21:00" }],
                      sab: [{ inicio: "08:00", fim: "21:00" }],
                      dom: [{ inicio: "08:00", fim: "21:00" }]
                    },  
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
                      "Carmed",
                      "Proteja e cuide da sua pele!",
                      "Analgésico (para dor) antitérmico (para febre)",
                      "Alívio da dor associada a contraturas musculares, incluindo dor de cabeça tensional.",
                      "Redução da febre e para o alívio de dores",
                    ],
                },

                {
                    image: "images/comercios/farmacia/drogaMais/drogamais.png",
                    name: "DrogaMais",
                    hours: "Seg a Sex: 08:00h as 18:00h </br>Sab: 08:00h as 12:00h",
                    statusAberto:".",
                    horarios: {                          
                      seg: [{ inicio: "08:00", fim: "18:00" }],
                      ter: [{ inicio: "08:00", fim: "18:00" }],
                      qua: [{ inicio: "08:00", fim: "18:00" }],
                      qui: [{ inicio: "08:00", fim: "18:00" }],
                      sex: [{ inicio: "08:00", fim: "18:00" }],
                      sab: [{ inicio: "08:00", fim: "12:00" }],
                      dom: []
                    },  
                    address: "Rua Benedito Salles, 903",
                    contact: "(43) 98411-9145",
                    delivery: "Sim / Sem Taxa",
                    facebook:"https://www.facebook.com/p/Drogamais-Jorginho-61560211252826/?locale=pt_BR",
                    instagram: "https://www.instagram.com/drogamaisjorginho/",
                    
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
                    address: "R. Benedito Sales, 353 - Carlopolis",
                    hours: "Seg a Sex: 08:00h as 18:00h </br> Sab: 08:00h as 12:00h",
                    
                    statusAberto:".",
                    horarios: {                          
                      seg: [{ inicio: "08:00", fim: "18:00" }],
                      ter: [{ inicio: "08:00", fim: "18:00" }],
                      qua: [{ inicio: "08:00", fim: "18:00" }],
                      qui: [{ inicio: "08:00", fim: "18:00" }],
                      sex: [{ inicio: "08:00", fim: "18:00" }],
                      sab: [{ inicio: "08:00", fim: "12:00" }],
                      dom: []
                    },  
                    contact: "(43) 98488-9420",
                    delivery: "Sim / Sem Taxa",
                    facebook: "https://www.facebook.com/fciaelshaday/?locale=pt_BR",
                    instagram: "https://www.instagram.com/farmaciaels/",
                   
                    novidadesImages: [               
                      "images/comercios/farmacia/elShaday/divulgacao/1.png",
                      "images/comercios/farmacia/elShaday/divulgacao/2.png",
                      "images/comercios/farmacia/elShaday/divulgacao/3.png",
                      "images/comercios/farmacia/elShaday/divulgacao/4.png",
                      "images/comercios/farmacia/elShaday/divulgacao/5.png",
                    ], 
                       novidadesDescriptions: [                            
                      "Agora ficou ainda mais fácil cuidar da sua saúde! Na Farmácia El Shaday, você encontra os medicamentos do Programa Farmácia Popular, com preços acessíveis e descontos especiais para quem precisa!",
                      "Tosse, febre, cansaço ou dor no corpo? Pode ser COVID-19! Não fique na dúvida!<br>Na Farmácia El Shaday, você faz o teste rápido de COVID-19 e tem o resultado em poucos minutos! Rápido, seguro e confiável!",
                      "Dengue não é brincadeira! Se você está com febre alta, dor no corpo, manchas na pele e fraqueza, faça já o teste rápido de dengue!<br>Na Farmácia El Shaday, você tem um resultado confiável em poucos minutos, sem precisar esperar para saber o diagnóstico!",
                      "Manter os níveis de glicose sob controle é essencial para quem vive com diabetes ou busca prevenir problemas de saúde. O teste rápido de glicemia é um exame simples e eficaz, que permite acompanhar os níveis de açúcar no sangue e identificar eventuais alterações.<br>Em nossa farmácia, você pode realizar o teste de glicemia com rapidez e segurança, sempre com o acompanhamento de profissionais qualificados.",
                      "A hipertensão, conhecida como “pressão alta”, é uma condição que pode levar a sérios problemas de saúde se não for monitorada e tratada adequadamente. Felizmente, pequenas mudanças na rotina ajudam a controlar a pressão e a proteger o coração.",
                    ],
                },
        
                {
                  image: "images/comercios/farmacia/farmaciaDaVila/farmaciaDaVila.png",
                    name: "Farmacia da Vila",
                    address: "Rua Manguba, 320, Carlopolis",
                    hours: "Seg a Sex: 08:00h as 18:00h </br> Sab: 08:00h as 12:00h",
                    statusAberto:".",
                    horarios: {                          
                      seg: [{ inicio: "08:00", fim: "18:00" }],
                      ter: [{ inicio: "08:00", fim: "18:00" }],
                      qua: [{ inicio: "08:00", fim: "18:00" }],
                      qui: [{ inicio: "08:00", fim: "18:00" }],
                      sex: [{ inicio: "08:00", fim: "18:00" }],
                      sab: [{ inicio: "08:00", fim: "12:00" }],
                      dom: []
                    },  
                    contact: "(43) 99148-8478",
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
                    address: "R. Benedito Salles, 979 - Carlopolis",
                     
                    hours: "Seg a Sex: 08:00h as 18:00h </br> Sab: 08:00h as 12:00h",
                    statusAberto:".",
                  horarios: {                          
                seg: [{ inicio: "08:00", fim: "18:00" }],
                ter: [{ inicio: "08:00", fim: "18:00" }],
                qua: [{ inicio: "08:00", fim: "18:00" }],
                qui: [{ inicio: "08:00", fim: "18:00" }],
                sex: [{ inicio: "08:00", fim: "18:00" }],
                sab: [{ inicio: "08:00", fim: "18:00" }],
                dom: []
              },  
                    contact: "(43) 3566-1211",
                    delivery: "Sim / Sem Taxa",
                    facebook: "https://www.facebook.com/farmaiscarlopolis1/?locale=pt_BR",
                    instagram: "https://www.instagram.com/farmaiscarlopolis/",
                    
                    novidadesImages: [               
                      "images/comercios/farmacia/farmais/divulgacao/1.png",
                      "images/comercios/farmacia/farmais/divulgacao/2.png",
                      "images/comercios/farmacia/farmais/divulgacao/3.png",
                      "images/comercios/farmacia/farmais/divulgacao/4.png",
                      "images/comercios/farmacia/farmais/divulgacao/5.png",
                    ], 
                    novidadesDescriptions: [                            
                      "ome no horário certo – Respeite os intervalos indicados.",
                      "Como fortalecer a imunidade? Comece pelo prato! Invista em alimentos ricos",
                      "Analgésico (para dor) antitérmico (para febre)",
                      "Alívio da dor associada a contraturas musculares, incluindo dor de cabeça tensional.",
                      "Redução da febre e para o alívio de dores",
                    ],
                },
        
                {
                    image: "images/comercios/farmacia/masterFarma/masterfarma.png",
                    name: "Master Farma",
                    address: "R. Laurindo Franco de Godoi, 90 - Carlopolis",
                    hours: "Seg a Sex: 08:00h as 18:00h </br>Sab: 08:00h as 12:00h",                   
                    statusAberto:".",
                    horarios: {                          
                      seg: [{ inicio: "08:00", fim: "18:00" }],
                      ter: [{ inicio: "08:00", fim: "18:00" }],
                      qua: [{ inicio: "08:00", fim: "18:00" }],
                      qui: [{ inicio: "08:00", fim: "18:00" }],
                      sex: [{ inicio: "08:00", fim: "18:00" }],
                      sab: [{ inicio: "08:00", fim: "12:00" }],
                      dom: []
                    },  
                    contact: "(43) 99951-1540",
                    contact2:"(43) 3566-1141",
                    delivery: "Sim / Sem Taxa",
                    facebook: "https://www.facebook.com/zurdo.farmacentro/?locale=pt_BR",
                    instagram: "https://www.instagram.com/masterfarma_carlopolis/",
                   
                    novidadesImages: [               
                      "images/comercios/farmacia/masterFarma/divulgacao/1.png",
                      "images/comercios/farmacia/masterFarma/divulgacao/2.png",
                      "images/comercios/farmacia/masterFarma/divulgacao/3.png",
                      "images/comercios/farmacia/masterFarma/divulgacao/4.png",
                      "images/comercios/farmacia/masterFarma/divulgacao/5.png",
                    ], 
                    novidadesDescriptions: [                            
                      "Pensado para atender às necessidades do organismo feminino, MASTERFORCE Pró Mulher auxilia na sua saúde e bem-estar diário! ",
                      "Coração saudável e mente afiada! 🧠Conheça os benefícios do Ômega 3 para o seu bem-estar diário.",
                      "Para os pequenos explorarem o mundo com mais disposição! 🌟 Cuidar da imunidade é um ato de amor.",
                       "MELATONINA LÍQUIDA Dormir bem faz toda a diferença para a sua saúde! 😴 A melatonina ajuda a regular o sono de forma natural, promovendo noites mais tranquilas",
                        "Com o Cartão Crediário da Master Farma, você parcela suas compras e cuida da sua saúde sem pesar no bolso!",
                    ],
                },
                
                {
                    
                    name: "PopularMais",
                    address: "Elson Soares, 787, Sala 2",
                    hours: "Seg a Sex: 08:00h as 18:00h <br>Sab: 08:00h as 12:00h",
                    statusAberto:".",
                    horarios: {                          
                      seg: [{ inicio: "08:00", fim: "18:00" }],
                      ter: [{ inicio: "08:00", fim: "18:00" }],
                      qua: [{ inicio: "08:00", fim: "18:00" }],
                      qui: [{ inicio: "08:00", fim: "18:00" }],
                      sex: [{ inicio: "08:00", fim: "18:00" }],
                      sab: [{ inicio: "08:00", fim: "12:00" }],
                      dom: []
                    },  
                    contact: "(43) 99647-6266",
                    delivery: "Sim / Sem Taxa",
                    image: "images/comercios/farmacia/popularMais/popularMais.png",
                    facebook:
                    "https://www.facebook.com/people/Popular-Mais-a-Farm%C3%A1cia-do-Jeremias/100075024257599/#",
                    instagram:
                    "https://www.instagram.com/popularmais_farmaciadojeremias/",
                   
                    novidadesImages: [                  
                        
                        "images/comercios/farmacia/popularMais/divulgacao/1.png",
                        "images/comercios/farmacia/popularMais/divulgacao/2.png",
                        "images/comercios/farmacia/popularMais/divulgacao/3.png",
                        "images/comercios/farmacia/popularMais/divulgacao/4.png",
                        "images/comercios/farmacia/popularMais/divulgacao/5.png",
                                    
                    ],
                    novidadesDescriptions: [                            
                      "A diversão agora também está na hora de escovar os dentes<br>O Gel Dental CARMED Fini chegou para deixar a escovação da meninada muito mais gostosa e divertida!",
                      "Diga adeus aos insetos com proteção de verdade",
                      "Analgésico (para dor) antitérmico (para febre)",
                      "Alívio da dor associada a contraturas musculares, incluindo dor de cabeça tensional.",
                      "Redução da febre e para o alívio de dores",
                    ],
                },

                {
                    image: "images/comercios/farmacia/santaMaria/santamaria.png",
                    name: "Santa Maria",
                    address: "R. Benedito Salles, nº 711, Carlopols",
                    hours: "Seg a Sex: 08:00h as 18h </br> Sab: 08:00h as 12:00h",
                    statusAberto:".",
                    horarios: {                          
                      seg: [{ inicio: "08:00", fim: "18:00" }],
                      ter: [{ inicio: "08:00", fim: "18:00" }],
                      qua: [{ inicio: "08:00", fim: "18:00" }],
                      qui: [{ inicio: "08:00", fim: "18:00" }],
                      sex: [{ inicio: "08:00", fim: "18:00" }],
                      sab: [{ inicio: "08:00", fim: "12:00" }],
                      dom: []
                    },  
                    contact: "(43) 99840-9658",
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
        
                {
                    image: "images/comercios/farmacia/saudeFarma/saudeFarma.png",
                    name: "Saude Farma",
                    address: "Rua Benedito Salles, 951",
                    hours: "Seg a Sex: 08:00h as 18:00h </br> Sab: 08:00h as 12:00h",
                    statusAberto:".",
                    horarios: {                          
                      seg: [{ inicio: "08:00", fim: "18:00" }],
                      ter: [{ inicio: "08:00", fim: "18:00" }],
                      qua: [{ inicio: "08:00", fim: "18:00" }],
                      qui: [{ inicio: "08:00", fim: "18:00" }],
                      sex: [{ inicio: "08:00", fim: "18:00" }],
                      sab: [{ inicio: "08:00", fim: "12:00" }],
                      dom: []
                    },  
                    contact: "(43) 99956-8938",
                    delivery: "Sim / Sem Taxa",
                    facebook:
                    "https://www.facebook.com/people/Sa%C3%BAde-Farma-Carl%C3%B3polis/100077692803333/",
                    instagram: "https://www.instagram.com/saudefarmacarlopolis/",
                  
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





        {
          link: document.querySelector("#menuTopografia"),  
          title: "Topografia",
          establishments: [
              {
                  image: "images/comercios/topografia/da2/perfil.png",
                  name: "DA2 Engenharia",
                  hours: "Seg a Sex: 8:00h as 12:00h - 13:30h as 17:30h<br>Sab e Dom: Fechado",
                  statusAberto:".",
                  horarios: {                    
                    seg: [{ inicio: "08:00", fim: "12:00" },{ inicio: "13:30", fim: "17:30" }],
                    ter: [{ inicio: "08:00", fim: "12:00" },{ inicio: "13:30", fim: "17:30" }],
                    qua: [{ inicio: "08:00", fim: "12:00" },{ inicio: "13:30", fim: "17:30" }],
                    qui: [{ inicio: "08:00", fim: "12:00" },{ inicio: "13:30", fim: "17:30" }],
                    sex: [{ inicio: "08:00", fim: "12:00" },{ inicio: "13:30", fim: "17:30" }],
                    sab: [],
                    dom: []
                  },
                  address: "Rua Antônio Jonas Ferreira Pinto, 395, Carlópolis ",
                  contact: "Anderson: (43) 99128-6761",
                  contact2:"Mingo: (43) 99146-4264",
                  infoAdicional:"Somos Especialista em Georreferenciamento<br>Eng. Florestal<br>Eng. de Segurança do Trabalho<br>CAR",
                  instagram:"https://www.instagram.com/da2engenharia/",                 
                  
                  novidadesImages: [ 
                  "images/comercios/topografia/da2/divulgacao/1.png",
                  "images/comercios/topografia/da2/divulgacao/2.png",
                  "images/comercios/topografia/da2/divulgacao/3.png",
                  "images/comercios/topografia/da2/divulgacao/4.png",
                  "images/comercios/topografia/da2/divulgacao/5.png",
                  
                  ],
                  novidadesDescriptions: [                            
                    "Venha nos Visitar!",
                    "Nos serviços prestados pela DA2 Engenharia, além de contarmos com equipamentos de última geração, também dispomos de profissionais com a expertise que exige as normas atinentes aos trabalhos",
                     "Regularização Imobiliária é o processo que legaliza imóveis com pendências, garantindo o direito de propriedade e a regularidade das construções",
                    "A documentação como os elencados acima, dentro do Georreferenciamento, consideramos como sendo a Fase de Planejamento( inicial de todo o processo), é nesta etapa inclusive que elaboramos o orçamento, bem como determinamos a melhor alternativa para a regularização do imóvel rural, Matricula, CCIR e CAR",
                    "Prazo para fazer o GEO do teu imovel vai até 25/11/2025",
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
          title: "Barbeiro",
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
        link: document.querySelector("#menuCantor"),
        title: "Cantor",
        establishments: [
            {
              image: "images/servicos/cantor/foguinho/perfil.png",
                name: "Foguinho",
                contact: "(43) 99106-8957",

                instagram:"https://www.instagram.com/edisonfoguinho/",   
                infoAdicional:"Baterista e Cantor Popular",              
                  
                novidadesImages: [ 
                "images/servicos/cantor/foguinho/divulgacao/1.png",
               "images/servicos/cantor/foguinho/divulgacao/2.png",
               "images/servicos/cantor/foguinho/divulgacao/3.png",
               "images/servicos/cantor/foguinho/divulgacao/4.png",
               
                
                ],
                novidadesDescriptions: [                            
                  "Aquele bom som ao vivo sempre",
                  "2",
                  "3",
                  "4",
                
                
                ],


            },
            
        ],
    },


  
        {
            link: document.querySelector("#menuChurrasqueiro"),
            title: "Churrasqueiro",
            establishments: [
                

                {
                  image: "images/servicos/churrasqueiro/flavio/flavio.png",
                    name: "Flavio Giovani",
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
            title: "Baba",
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
            title: "Diarista",
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
            title: "Eletrecista",
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
          title: "Frete",
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
            title: "Jardineiro",
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
            title: "Marceneiro",
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
            title: "Pedreiro",
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
            title: "Pintor",
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
        link: document.querySelector("#menuPodologa"),
        title: "Podologa",
        establishments: [
            {
              image: "images/servicos/podologa/vania/perfil.png",
                name: "Vania",
                contact: "(43) 99834-3496",

                instagram:"https://www.instagram.com/me_vania/",   
                infoAdicional:"👣 Tratamentos em Diabeticos , <br>👣 Calos , <br>👣 Unhas encravadas , <br>👣 Reflexologia podal entre outros tratamento nos pés<br>",              
                  
                novidadesImages: [ 
                "images/servicos/podologa/vania/divulgacao/1.png",
              
               
                
                ],
                novidadesDescriptions: [                            
                  "Especialista no Tratamento em Diabético",
                
                
                
                ],


            },
            
        ],
    },








  
        {
            link: document.querySelector("#menuVeterinario"),
            title: "Veterinario",
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
                  image: "images/informacoes/eventos/calendario_evento.png",
                  contact: "",
              },

           




             {
                  image: "images/informacoes/eventos/festaJuninaApae.png",
                  name: "Festa Junina APAE",
                  date: "07/06/25 Abertura da Festa<br> 08/07/2025 Leilão as 14hrs",
                  address: "R. Jorge Barros, 1777 - Carlópolis",
                  contact: "(43) 99833-9638",
                  instagram:"https://www.instagram.com/apaeclps/",
                  facebook:"https://www.facebook.com/p/APAE-Carl%C3%B3polis-100067016812454/?locale=pt_BR&_rdr",
                
                    
              },

              {
                  image: "images/informacoes/eventos/paranaFishing1.png",
                  name: "Campeonato Parana Fishing",
                  date: "Inscrições até 05/06/2025<br> Campeonato: 07/06/25 ",
                  address: "Represa de Chavantes",
                  contact: "(43) 99980-0495",
                  instagram:"https://www.instagram.com/parana_fishing/",
                  facebook:"https://www.facebook.com/thiagoagueraparanafishingteam/?locale=pt_BR",
                
                    
              },



{
              image: "images/informacoes/eventos/standUp.png",
              name: "Stand Up",
              date: "16/06/2025",
              address: "Rua Padre Hugo, 460, Carlopolis ( Thac Thal )",
              contact: "(43) 99160-5120",
              instagram:"https://www.instagram.com/p/DKAe7CkxUzQ/?img_index=1",
              infoAdicional:"Os ingressos já estão à venda! Garanta o seu agora mesmo — ou junte a galera e reserve uma mesa exclusiva só pra vocês! 🍻👯‍♀️📲 Para mais informações e reservas: (43) 99160-5120",
              
              
             
          },


          {
              image: "images/informacoes/eventos/truco.png",
              name: "Truco",
              date: "21/06/2025",
              address: "Pedro Salles - Casa do Elton",
              contact: "(43) 99243-2345",
              instagram:"https://www.instagram.com/veterano_pedro_salles?igsh=NmhobzJscnI0NWxo",
              infoAdicional:"A partir das 11hrs começa o barulho! venha participar",
              
              
             
          },




{
                  image: "images/informacoes/eventos/volley.png",
                  name: "Beach Volleyball",
                  date: "22/06/25",
                  address: "Arena Seu Luiz",
                  contact: "(43) 99627-2094",
                  contact2: "(43) 99860-4291",
                  contact3: "(43) 99659-5510",
                  instagram:"https://www.instagram.com/volleyball_beach_carlopolis/",
                  infoAdicional:"",
                  infoAdicional:"Inscrições até 19 de Junho",
                
                   
              },







         {
                  image: "images/informacoes/eventos/cresolRun.png",
                  name: "Cresol Run",
                  date: "22/06/25",
                  address: "Av Turistica",
                  contact: "(43) 99950-9291",
                  instagram:"https://www.instagram.com/carlopolisrunning/p/DJw_BS6SObU/?img_index=2",
                  infoAdicional:"",
                  infoAdicional:"<a target='_blank'  style='color:#2da6ff;' href='www.cronocorridas.com.br'>Faça sua inscrição</a>",
                
                    novidadesImages: [               
                    "images/informacoes/eventos/cresolRun2.png",
                
                ], novidadesDescriptions:[ 
                 "INSCRIÇÕES ABERTAS GARANTA JÁ SUA VAGA!",
                 ],
              },





               {
              image: "images/informacoes/eventos/carroAntigo.png",
              name: "Encontro Carro Antigo",
              date: "20/07/2025",
              address: "Centro de Eventos Ilha do Ponciano",
              contact: "(43) 99825-0570",
              instagram:"https://www.instagram.com/turismocarlopolis/",
              
              
             
          },

                {
                  image: "images/informacoes/eventos/senhorbomjesus.png",
                  name: "Festa Do Senhor Bom Jesus",
                  date: "28/07/25 Programação Religiosa<br> 01/08/2025 Programação Social",
                  address: "Em Frente a Igreja Matriz",
                  contact: "(43) 99833-9638",
                  instagram:"https://www.instagram.com/paroquiacarlopolis/",
                
                    
              },
                  

              {
                  image: "images/informacoes/eventos/frutFest.png",
                  name: "FrutFest",
                  date: "04/09/25 a 07/09/25",
                  address: "Centro de Eventos Ilha do Ponciano",
                  contact: "(43) 99825-0570",
                  instagram:"https://www.instagram.com/frutfestoficial/",
                 
                 
              },

              {
                image: "images/informacoes/eventos/lowCity.png",
                name: "LowCity",
                date: "05/10/2025",
                address: "Centro de Eventos Ilha do Ponciano",
                contact: "-",
                instagram:"https://www.instagram.com/lowcity_043club/",
               
               
            },

             {
                  image: "images/informacoes/eventos/rotary.png",
                  name: "Passeio Ciclistico Rotary",
                  date: "19/10/2025",
                  address: "Rodovia PR218",
                  contact: "-",
               
                
                    
              },


                {
                  image: "images/informacoes/eventos/toroonagashi.png",
                  name: "Toroonagashi",
                  date: "25/10/2025",
                  address: "Ponte interstadual Benedito Garcia Ribeiro (Carlopolis x Fartura)",
                  contact: "-",
               
                
                    
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
/*
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
*/
/*

              {
                image: "images/comercios/farmacia/bioFarma/biofarma.jpg",
                name: "Bio Farma",
                    address: "Rua Laurindo Franco Godoy, 464",
                    contact:"(43) 99988-9376",
                    contact2: "(43) 3566-1473",
                    delivery: "Sim / Sem Taxa",
                plantaoHorario: "08:00h às 21:00h", 
                plantaoData:"03/05 a 09/05",     
                statusAberto:".",
                horarios: {                          
                  seg: [{ inicio: "08:00", fim: "21:00" }],
                  ter: [{ inicio: "08:00", fim: "21:00" }],
                  qua: [{ inicio: "08:00", fim: "21:00" }],
                  qui: [{ inicio: "08:00", fim: "21:00" }],
                  sex: [{ inicio: "08:00", fim: "21:00" }],
                  sab: [{ inicio: "08:00", fim: "21:00" }],
                  dom: [{ inicio: "08:00", fim: "21:00" }]
                },        
                
                facebook: "https://www.facebook.com/p/Farm%C3%A1cia-Bio-Farma-100063579070016/?_rdr",
                instagram: "https://www.instagram.com/farmaciabiofarmaa/",
                
                novidadesImages: [               
                    "images/comercios/farmacia/bioFarma/divulgacao/1.png",
                    "images/comercios/farmacia/bioFarma/divulgacao/2.png",     
                    "images/comercios/farmacia/bioFarma/divulgacao/3.png",
                    "images/comercios/farmacia/bioFarma/divulgacao/4.png",
                    "images/comercios/farmacia/bioFarma/divulgacao/5.png",
                ], 
                novidadesDescriptions: [                            
                  "Venham nos Visitar",
                  "Cólicas do trato gastrintestinal",
                  "Analgésico (para dor) antitérmico (para febre)",
                  "Alívio da dor associada a contraturas musculares, incluindo dor de cabeça tensional.",
                  "Redução da febre e para o alívio de dores",
                ],
            },
            */
/*
            {
              image: "images/comercios/farmacia/masterFarma/masterfarma.png",
              name: "Master Farma",
              address: "R. Laurindo Franco de Godoi, 90",
              
              plantaoHorario: "08:00h às 21:00h", 
              plantaoData:"Sab 10/05 a Sex 16/05", 
              statusAberto:".",
              horarios: {                          
                seg: [{ inicio: "08:00", fim: "21:00" }],
                ter: [{ inicio: "08:00", fim: "21:00" }],
                qua: [{ inicio: "08:00", fim: "21:00" }],
                qui: [{ inicio: "08:00", fim: "21:00" }],
                sex: [{ inicio: "08:00", fim: "21:00" }],
                sab: [{ inicio: "08:00", fim: "21:00" }],
                dom: [{ inicio: "08:00", fim: "21:00" }]
              },  
              contact: "(43) 99951-1540",
              contact2:"(43) 3566-1141",
              delivery: "Sim / Sem Taxa",
              facebook: "https://www.facebook.com/zurdo.farmacentro/?locale=pt_BR",
              instagram: "https://www.instagram.com/masterfarma_carlopolis/",

              novidadesImages: [               
                "images/comercios/farmacia/masterFarma/divulgacao/1.png",
                "images/comercios/farmacia/masterFarma/divulgacao/2.png",
                "images/comercios/farmacia/masterFarma/divulgacao/3.png",
                "images/comercios/farmacia/masterFarma/divulgacao/4.png",
                "images/comercios/farmacia/masterFarma/divulgacao/5.png",
              ], 
              novidadesDescriptions: [                            
                "Estamos de Plantão!",
                "Cólicas do trato gastrintestinal",
                "Analgésico (para dor) antitérmico (para febre)",
                "Alívio da dor associada a contraturas musculares, incluindo dor de cabeça tensional.",
                "Redução da febre e para o alívio de dores",
              ],
          },

*/

/*
          {
                    image: "images/comercios/farmacia/farmais/farmais.png",
                    name: "FarMais",
                    address: "R. Benedito Salles, 979 - Carlopolis",
                    plantaoHorario: "08:00h às 21:00h", 
              plantaoData:"Sab 17/05 a Sex 23/05", 
              statusAberto:".",
              horarios: {                          
                seg: [{ inicio: "08:00", fim: "21:00" }],
                ter: [{ inicio: "08:00", fim: "21:00" }],
                qua: [{ inicio: "08:00", fim: "21:00" }],
                qui: [{ inicio: "08:00", fim: "21:00" }],
                sex: [{ inicio: "08:00", fim: "21:00" }],
                sab: [{ inicio: "08:00", fim: "21:00" }],
                dom: [{ inicio: "08:00", fim: "21:00" }]
              },  
                     
                    contact: "(43) 3566-1211",
                    delivery: "Sim / Sem Taxa",
                    facebook: "https://www.facebook.com/farmaiscarlopolis1/?locale=pt_BR",
                    instagram: "https://www.instagram.com/farmaiscarlopolis/",
                    
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
*/

/*
          {
                    image: "images/comercios/farmacia/elShaday/elshaday.png",
                    name: "El Shaday",
                    address: "Rua Benedito Sales, 353 - Carlopolis",
                    plantaoHorario: "08:00h às 21:00h", 
              plantaoData:"Sab 24/05 a Sex 30/05", 
              statusAberto:".",
              horarios: {                          
                seg: [{ inicio: "08:00", fim: "21:00" }],
                ter: [{ inicio: "08:00", fim: "21:00" }],
                qua: [{ inicio: "08:00", fim: "21:00" }],
                qui: [{ inicio: "08:00", fim: "21:00" }],
                sex: [{ inicio: "08:00", fim: "21:00" }],
                sab: [{ inicio: "08:00", fim: "21:00" }],
                dom: [{ inicio: "08:00", fim: "21:00" }]
              },  
                     
                    contact: "(43) 98488-9420",
                    contact2: "(43) 3566-2789",
                    delivery: "Sim / Sem Taxa",
                    facebook: "https://www.facebook.com/fciaelshaday/?locale=pt_BR",
                    instagram: "https://www.instagram.com/farmaciaels/",
                    
                   novidadesImages: [               
                      "images/comercios/farmacia/elShaday/divulgacao/1.png",
                      "images/comercios/farmacia/elShaday/divulgacao/2.png",
                      "images/comercios/farmacia/elShaday/divulgacao/3.png",
                      "images/comercios/farmacia/elShaday/divulgacao/4.png",
                      "images/comercios/farmacia/elShaday/divulgacao/5.png",
                    ], 
                    novidadesDescriptions: [                            
                      "Agora ficou ainda mais fácil cuidar da sua saúde! Na Farmácia El Shaday, você encontra os medicamentos do Programa Farmácia Popular, com preços acessíveis e descontos especiais para quem precisa!",
                      "Tosse, febre, cansaço ou dor no corpo? Pode ser COVID-19! Não fique na dúvida!<br>Na Farmácia El Shaday, você faz o teste rápido de COVID-19 e tem o resultado em poucos minutos! Rápido, seguro e confiável!",
                      "Dengue não é brincadeira! Se você está com febre alta, dor no corpo, manchas na pele e fraqueza, faça já o teste rápido de dengue!<br>Na Farmácia El Shaday, você tem um resultado confiável em poucos minutos, sem precisar esperar para saber o diagnóstico!",
                      "Manter os níveis de glicose sob controle é essencial para quem vive com diabetes ou busca prevenir problemas de saúde. O teste rápido de glicemia é um exame simples e eficaz, que permite acompanhar os níveis de açúcar no sangue e identificar eventuais alterações.<br>Em nossa farmácia, você pode realizar o teste de glicemia com rapidez e segurança, sempre com o acompanhamento de profissionais qualificados.",
                      "A hipertensão, conhecida como “pressão alta”, é uma condição que pode levar a sérios problemas de saúde se não for monitorada e tratada adequadamente. Felizmente, pequenas mudanças na rotina ajudam a controlar a pressão e a proteger o coração.",
                    ],
                },


                */





                {
                    image: "images/comercios/farmacia/descontoFacil/descontoFacil.png",
                    name: "Desconto Facil 1",
                    address: "R. Benedito Salles, 574 - Carlopolis",
                    plantaoHorario: "08:00h às 21:00h", 
                    plantaoData:"Sab 31/05 a Sex 06/06",
                    hours: "Seg a Sex: 08:00h as 18:00h </br> Sab: 08:00h as 12:00h",
                    statusAberto:".",
                    horarios: {                          
                     seg: [{ inicio: "08:00", fim: "21:00" }],
                      ter: [{ inicio: "08:00", fim: "21:00" }],
                      qua: [{ inicio: "08:00", fim: "21:00" }],
                      qui: [{ inicio: "08:00", fim: "21:00" }],
                      sex: [{ inicio: "08:00", fim: "21:00" }],
                      sab: [{ inicio: "08:00", fim: "21:00" }],
                      dom: [{ inicio: "08:00", fim: "21:00" }]
                    },  
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
                      "Carmed",
                      "Proteja e cuide da sua pele!",
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
         
            name: "Agendamento Saude",
            hours: "Seg a Sex: 8:30h as 12h - 13:30 as 17h",
            address: "-",
            contact: "(43) 99825-0996",
            contact2: "(43) 98872-8504",
            
        },

         {
         
            name: "Agendamento De Viagens",
            hours: "Seg a Sex: 8:30h - 12h, 13:30 as 17h",
            address: "-",
            contact: "(43) 99825-1005",
            
            
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
            hours: "Seg a Sex: 09:00h as 15:00h",
            address: "R. Salvira Marquês, 366",
            contact: "(43) 98485-1626",
            facebook:"https://www.facebook.com/p/Cras-Carl%C3%B3polis-100013825331932/?locale=pt_PT",
        },
    ],
  },


    {
    link: document.querySelector("#menuXadrez"),    
    title: "Clube de Xadrez",
    establishments: [
        {
            image: "images/setorPublico/xadrez/perfil.png",
            name: "Clube de Xadrez",
            hours: "Ter: 18:00 as 20:00h ( Adulto )<br> Sab: 09:00 as 11:00h ( 6 a 17 anos )",
            address: "Elson Soares, 787, Sala 22",
            contact: "(43) 99639-6503",
             novidadesImages: [               
                      "images/setorPublico/xadrez/divulgacao/1.png",
                      "images/setorPublico/xadrez/divulgacao/2.png",
                      "images/setorPublico/xadrez/divulgacao/3.png",
                    ], 
                    novidadesDescriptions: [                            
                     "Venha jogar com nós!",
                     "Aquela resenha boa",
                      "Duelo de Gigantes",
                    ],
            
           
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
            hours: "Seg a Sex: 10:00h as 12;00h e 13:30h as 15:30h",
            address: "R. Padre Hugo, 843 ",           
            contact:"(43) 3377-5023",
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
                  contact: "Rodoviaria: (43) 3566-1393",
                  contact2:"Princesa: (43) 99926-6484",
                  contact3:"Pedro (43) 99641-0412",
                  hours: "Seg a Sex - 08:30 as 11:00<br> 13:30 as 16:00 e 23:00 as 23:40<br>Sab: 08:30 as 11:00<br>Dom: 23:30 as 23:40",
                  infoAdicional:"<a target='_blank'  style='color:#2da6ff;' href='https://queropassagem.com.br/rodoviaria-de-carlopolis-pr?wpsrc=Google%20AdWords&wpcid=15361090317&wpsnetn=x&wpkwn=&wpkmatch=&wpcrid=&wpscid=&wpkwid=&gad_source=1&gad_campaignid=15361092411&gbraid=0AAAAADpKqgF9tpsAwMZNVxXOyQz1HO5FS&gclid=Cj0KCQjwt8zABhDKARIsAHXuD7bNWFyJzC0hKW5n8saZVgNqiBJbBtlcDLdxbyVAsun4w8d07isBGGIaAnL7EALw_wcB'>Compre sua Passagem</a>",
                
                  
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
                    hours: "Seg a Sex: 08:00h as 11:30 - 13:00h as 17:00h",                   
                   
                    instagram: "https://www.instagram.com/prefeitura.carlopolis/?locale=zh_CN&hl=da",
                    site: "http://www.carlopolis.pr.gov.br/",
                },
        
                {
                  image: "images/setorPublico/prefeitura/prefeitura.png",
                    name: "Duvidas e Reclamações",
                    contact: "(43) 99825-0360",
                    hours: "08:00h as 17:00h",
                
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
                    hours: "Seg a Sex: 08:00h - 12:00h",
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
                    image: "images/setorPublico/delegacia/1.png",
                    name: "Delegacia",
                    hours: "Seg a Sex: 09:00h - 18:00h",
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
              hours: "Seg a Sex: 09:00h - 18:00h",
              address: "Avenida Elson Soares, 295",
              contact: "(43) 3566-1496",
              infoAdicional:"Turno: Manha e Tarde",
          },

            {
              image: "images/setorPublico/escolaPublica/carolinaLupion.png",
              name: "Carolina Lupion",
              hours: "Seg a Sex: 09:00h - 18:00h",
              address: "R. Jorge Barros, 1095",
              contact: "(43) 3566-1295",
              infoAdicional:"Turno: Manha e Tarde",
          },



              {
                  image: "images/setorPublico/escolaPublica/raymunda.png",
                  name: "CMEI Raymunda Santana Salles",
                  hours: "Seg a sex: 09:00h - 18:00h",
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
            contact2:"(43) 98840-0984",
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
                hours: "Seg a Sex: 07:00h as 11:00h - 13:00 as 17:00h",
                statusAberto:".",
                horarios: {                    
                  seg: [{ inicio: "07:00", fim: "11:00" },{ inicio: "13:00", fim: "17:00" }],
                  ter: [{ inicio: "07:00", fim: "11:00" },{ inicio: "13:00", fim: "17:00" }],
                  qua: [{ inicio: "07:00", fim: "11:00" },{ inicio: "13:00", fim: "17:00" }],
                  qui: [{ inicio: "07:00", fim: "11:00" },{ inicio: "13:00", fim: "17:00" }],
                  sex: [{ inicio: "07:00", fim: "11:00" },{ inicio: "13:00", fim: "17:00" }],
                  sab: [],
                  dom: []
                },
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
                    contact: "(41) 9544-0115",
                    contact2: "0800 200 0115",
                    
                },
            ],
        },

        {
          link: document.querySelector("#menuSamuzinho"),    
          title: "Samuzinho",
          establishments: [
              {
                
                  name: "Samuzinho",
                  hours: "24 horas",                  
                  contact: "(43) 99825-0248",
                  statusAberto:".",
                  horarios: {                    
                    seg: [{ inicio: "00:00", fim: "23:59" }],
                    ter: [{ inicio: "00:00", fim: "23:59" }],
                    qua: [{ inicio: "00:00", fim: "23:59" }],
                    qui: [{ inicio: "00:00", fim: "23:59" }],
                    sex: [{ inicio: "00:00", fim: "23:59" }],
                    sab: [{ inicio: "00:00", fim: "23:59" }],
                    dom: [{ inicio: "00:00", fim: "23:59" }]
                  },
                  
              },
          ],
      },


      {
        link: document.querySelector("#menuSecretariaSaude"),    
        title: "Secretaria da Saude",
        establishments: [
            {
             
                name: "Secretaria da Saude",
                hours: "Seg a Sex: 07:00h as 11:00h - 13:00 as 17:00h",
                address: "-",
                contact: "(43) 3566-1328",
                statusAberto:".",
                horarios: {                    
                  seg: [{ inicio: "07:00", fim: "11:00" },{ inicio: "13:00", fim: "17:00" }],
                  ter: [{ inicio: "07:00", fim: "11:00" },{ inicio: "13:00", fim: "17:00" }],
                  qua: [{ inicio: "07:00", fim: "11:00" },{ inicio: "13:00", fim: "17:00" }],
                  qui: [{ inicio: "07:00", fim: "11:00" },{ inicio: "13:00", fim: "17:00" }],
                  sex: [{ inicio: "07:00", fim: "11:00" },{ inicio: "13:00", fim: "17:00" }],
                  sab: [],
                  dom: []
                },
                
            },
        ],
     },



     {
      link: document.querySelector("#menuSindicatoRural"),    
      title: "Sindicato Rural",
      establishments: [
          {
           
              name: "Sindicato Rural",
              hours: "Seg a Sex: 08:00h as 11:30h - 13:00 as 17:00h",
              address: "Av. Elson Soares, 1147 - Carlopolis",
              contact: "(43) 3566-1292",
              statusAberto:".",
              horarios: {                    
                seg: [{ inicio: "08:00", fim: "11:30" },{ inicio: "13:00", fim: "17:00" }],
                ter: [{ inicio: "08:00", fim: "11:30" },{ inicio: "13:00", fim: "17:00" }],
                qua: [{ inicio: "08:00", fim: "11:30" },{ inicio: "13:00", fim: "17:00" }],
                qui: [{ inicio: "08:00", fim: "11:30" },{ inicio: "13:00", fim: "17:00" }],
                sex: [{ inicio: "08:00", fim: "11:30" },{ inicio: "13:00", fim: "17:00" }],
                sab: [],
                dom: []
              },
              
          },
      ],
   },


     {
      link: document.querySelector("#menuVigilanciaSanitaria"),    
      title: "Vigilancia Sanitaria",
      establishments: [
          {
           
              name: "Vigilancia Sanitaria",
              hours: "Seg a Sex: 08:00h as 11:00h - 13:00 as 17:00h",
              address: "-",
              contact: "(43) 99825-1079",
              statusAberto:".",
              horarios: {                    
                seg: [{ inicio: "08:00", fim: "11:00" },{ inicio: "13:00", fim: "17:00" }],
                ter: [{ inicio: "08:00", fim: "11:00" },{ inicio: "13:00", fim: "17:00" }],
                qua: [{ inicio: "08:00", fim: "11:00" },{ inicio: "13:00", fim: "17:00" }],
                qui: [{ inicio: "08:00", fim: "11:00" },{ inicio: "13:00", fim: "17:00" }],
                sex: [{ inicio: "08:00", fim: "11:00" },{ inicio: "13:00", fim: "17:00" }],
                sab: [],
                dom: []
              },
              
          },
      ],
   },


// FIM SETOR PUBLICO

       
  
        {
            link: document.querySelector("#menuMotoCenter"),  
            title: "Moto Center",
            establishments: [
                {
                  image: "images/comercios/motoCenter/binho/perfil.png",
                    name: "Binho Moto Center",
                    hours: "Seg a Sex: 08:00h as 18:00h <br> Sab: 08:00h as 14:00h",
                    statusAberto:".",
                  horarios: {                          
                    seg: [{ inicio: "08:00", fim: "18:00" }],
                    ter: [{ inicio: "08:00", fim: "18:00" }],
                    qua: [{ inicio: "08:00", fim: "18:00" }],
                    qui: [{ inicio: "08:00", fim: "18:00" }],
                    sex: [{ inicio: "08:00", fim: "18:00" }],
                    sab: [{ inicio: "08:00", fim: "14:00" }],
                    dom: [],
                  },
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
                    "Venha conhecer nosso espaço",
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
                    hours: "Seg a Sex: 07:00h as 18:00h <br>Sab: 07:00 as 16:00h",
                    statusAberto:".",
                    horarios: {                          
                      seg: [{ inicio: "07:00", fim: "18:00" }],
                      ter: [{ inicio: "07:00", fim: "18:00" }],
                      qua: [{ inicio: "07:00", fim: "18:00" }],
                      qui: [{ inicio: "07:00", fim: "18:00" }],
                      sex: [{ inicio: "07:00", fim: "18:00" }],
                      sab: [{ inicio: "07:00", fim: "16:00" }],
                      dom: [],
                    },
                    address: "Rua genova 10 Anexo ao Posto Garbelotti - Res. Italia",
                    contact: "(43) 99900-2991",
                    instagram:"https://www.instagram.com/borracharia.vidanova/",
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
            title: "Loja de Brinquedo",
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
            link: document.querySelector("#menuLojaPesca"),  
            title: "Loja de Pesca",
            establishments: [
                {
                  image: "images/comercios/lojadepesca/pescaepresente/perfil.png",
                    name: "Pesca e Presente",
                    hours: "Seg a Sexta: 08:00h as 18:00h<Br>Sab: 08:00h as 12:00h",
                    statusAberto:".",
                    horarios: {                          
                      seg: [{ inicio: "08:00", fim: "18:00" }],
                      ter: [{ inicio: "08:00", fim: "18:00" }],
                      qua: [{ inicio: "08:00", fim: "18:00" }],
                      qui: [{ inicio: "08:00", fim: "18:00" }],
                      sex: [{ inicio: "08:00", fim: "18:00" }],
                      sab: [{ inicio: "08:00", fim: "12:00" }],
                      dom: [],
                    },
                    address: "Rua Benedito Salles, 854 - Carlópolis",
                    contact: "(43) 99921-9959",                    
                    instagram:"https://www.instagram.com/pescaepresentes/",
                    
                    novidadesImages: [
                        "images/comercios/lojadepesca/pescaepresente/divulgacao/1.png",
                        "images/comercios/lojadepesca/pescaepresente/divulgacao/2.png",
                        "images/comercios/lojadepesca/pescaepresente/divulgacao/3.png",
                        "images/comercios/lojadepesca/pescaepresente/divulgacao/4.png",
                        "images/comercios/lojadepesca/pescaepresente/divulgacao/5.png",
                        "images/comercios/lojadepesca/pescaepresente/divulgacao/6.png",
                        "images/comercios/lojadepesca/pescaepresente/divulgacao/7.png",
                        "images/comercios/lojadepesca/pescaepresente/divulgacao/8.png",
                        "images/comercios/lojadepesca/pescaepresente/divulgacao/9.png",
                        "images/comercios/lojadepesca/pescaepresente/divulgacao/10.png",
                    ],
                    novidadesDescriptions: [ 
                      
                      "Variedade em Iscas",
                      "Variedade em Linhas",
                      "Variedade em Chumbos",
                      "Variedade em Molinetes e Carretilhas",
                      "Variedade em Facas",
                      "Variedade em Varas",
                      "Variedade em Coletes",
                      "Loja Ampla com Presentes",
                      "Variedades em Camisas para Pescas",
                      "Variedade em Oculos UV",

                    
                    ],
                },
            ],
        },









  
        {
            link: document.querySelector("#menuDiskGas"),    
            title: "Deposito de Gas",
            establishments: [

              {
                image: "images/comercios/depositoGas/cnCasaDoGas/perfil.png",
                  name: "CN Casa do Gas",
                  hours: "Seg a Sab: 08:00h as 19:00h </br>Dom: 09:00h as 12:00h",
                  statusAberto:".",
                  horarios: {                          
                    seg: [{ inicio: "08:00", fim: "19:00" }],
                    ter: [{ inicio: "08:00", fim: "19:00" }],
                    qua: [{ inicio: "08:00", fim: "19:00" }],
                    qui: [{ inicio: "08:00", fim: "19:00" }],
                    sex: [{ inicio: "08:00", fim: "19:00" }],
                    sab: [{ inicio: "08:00", fim: "19:00" }],
                    dom: [{ inicio: "09:00", fim: "12:00" }]
                  }, 
                  address: "Avenida Elson Soares, 1048, Carlopolis",
                  contact: "(43) 99829-5216",
                  delivery: "Sim / Com Taxa",
                  facebook:"https://www.facebook.com/people/CN-Casa-do-G%C3%A1s/100068139145901/",
                  instagram:"https://www.instagram.com/ultracarlopolis/",
                  novidadesImages: [               
                    "images/comercios/depositoGas/cnCasaDoGas/divulgacao/1.png",
                                        
                   
                ], 
                novidadesDescriptions: [                            
                  "Botijao em estoque",
                                  
                ],
              },

                {
                  image: "images/comercios/depositoGas/liaGas/liaGas.png",
                    name: "Lia Gas",
                    hours: "Seg a Sab: 08:00h as 20:00h </br>Dom: 08:00h as 20:00h",
                    statusAberto:".",
                    horarios: {                          
                      seg: [{ inicio: "08:00", fim: "20:00" }],
                      ter: [{ inicio: "08:00", fim: "20:00" }],
                      qua: [{ inicio: "08:00", fim: "20:00" }],
                      qui: [{ inicio: "08:00", fim: "20:00" }],
                      sex: [{ inicio: "08:00", fim: "20:00" }],
                      sab: [{ inicio: "08:00", fim: "20:00" }],
                      dom: []
                    }, 
                    address: "R. Kalil Keder, 910",
                    contact: "(43) 99821-7243",
                    contact2: "(43) 99844-5345",
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

                
            ],
        },
  
    
 {
            link: document.querySelector("#menuFoodTruck"),    
            title: "Food Truck",
            establishments: [
                {
                  image: "images/comercios/foodtruck/celeiro/perfil.png",
                    name: "Celeiro",
                    hours: "Sex: 19:00h as 23:00",
                    statusAberto:".",
                    horarios: {                    
                      seg: [],
                      ter: [],
                      qua: [],
                      qui: [],
                      sex: [{ inicio: "019:00", fim: "23:00" }],
                      sab: [],
                      dom: []
                    },
                    infoAdicional:"Realizamos Eventos Particulares, Festas, servindo muitas variedades de espetinhos e temos tambem Chop!",
                    address: "Feira da Lua",
                    contact: "(43) 99965-2084",

                     novidadesImages: [               
                      "images/comercios/foodtruck/celeiro/divulgacao/1.png",
                                         
                     
                  ], 
                  novidadesDescriptions: [                            
                    "Eventos Publicos",
                    
                  ],
                },
            ],
        },

        


        {
          link: document.querySelector("#menuProdutosOrientais"),  
          title: "Produtos Orientais",
          establishments: [
              {
                  image: "images/comercios/produtosOrientais/seiza/seiza.png",
                  name: "Seiza",
                  hours: "Seg a Qui: 09:00h as 18:30h <br>Sex: 09:00h as 16:30h </br> Sab: 09:00 as 12:00h",
                  statusAberto:".",
                  horarios: {                          
                    seg: [{ inicio: "09:00", fim: "18:30" }],
                    ter: [{ inicio: "09:00", fim: "18:30" }],
                    qua: [{ inicio: "09:00", fim: "18:30" }],
                    qui: [{ inicio: "09:00", fim: "18:30" }],
                    sex: [{ inicio: "08:00", fim: "16:30" }],
                    sab: [{ inicio: "09:00", fim: "12:00" }],
                    dom: []
                  },  
                  address: "R. Fidêncio de Melo, 212 - Sala B",
                  contact: "(43) 99103-4187",
                  delivery: "Sim / Sem Taxa",            
                  instagram: "https://www.instagram.com/seizapr/",
                  novidadesImages: [                  
                       "images/comercios/produtosOrientais/seiza/divulgacao/9.png",
                    "images/comercios/produtosOrientais/seiza/divulgacao/2.png",
                    "images/comercios/produtosOrientais/seiza/divulgacao/1.png",
                    "images/comercios/produtosOrientais/seiza/divulgacao/3.png",
                    "images/comercios/produtosOrientais/seiza/divulgacao/4.png",
                    "images/comercios/produtosOrientais/seiza/divulgacao/5.png",
                    "images/comercios/produtosOrientais/seiza/divulgacao/6.png",
                    "images/comercios/produtosOrientais/seiza/divulgacao/7.png",
                    "images/comercios/produtosOrientais/seiza/divulgacao/8.png",
                   
                    
                                
                ],
                novidadesDescriptions: [ 
                   "Snacks orientais para todos os gostos! Sembeis doces e salgados, salgadinhos crocantes, lula desidratada — experimente sabores autênticos do Japão, Coreia e China!",
                
                  "O segredo da culinária oriental começa aqui! Shoyu, óleo de gergelim, saquê mirin, molho tarê, hondashi, aji-no-moto e muito mais para deixar suas receitas com o sabor autêntico do Japão, China e Coreia!",
                  "Na Seiza você encontra uma seleção incrível de lámens e massas orientais — coreanos, japoneses e muito mais. Vem experimentar!",
                                                
                
                  "Farinha Panko, mistura para tempurá, kinako (soja em pó), papel de arroz e os ingredientes perfeitos pra dar aquele toque autêntico nas suas receitas japonesas!",
                  "Bebidas orientais alcóolicas mais procuradas: Soju (vários sabores), Makgeolli (vinho de arroz) e o tradicional saquê japonês.",
                  "Direto da Coreia! Experimente os sorvetes orientais mais amados: Samanco, Melona e Power Cap! Sabores únicos e refrescantes que conquistam todos os paladares!",
                  "Aqui na Seiza você encontra uma seleção especial de balas japonesas e coreanas!",
                  "Clássicos orientais que encantam todas as idades! Famosos biscoitos Pocky, Pepero, Koalas, Toppo e muitos mais!",
                  "Tradição e sabor em cada mordida! Temos os doces tradicionais da culinária japonesa com recheio de feijão azuki (anko) sempre fresquinhos para vocês!",
               
                ],
              
              },
          ],
      },

        {
            link: document.querySelector("#menuMaterialContrucao"),    
            title: "Material de Construção",
            establishments: [
                {
                  image: "images/comercios/materialConstrucao/ferreira/perfil.png",
                    name: "Loja Ferreira",
                    hours: "Seg a Sex: 07:00h as 18:00h </br> Sab: 08:00h as 17:00h",
                    statusAberto:".",
                    horarios: {                          
                    seg: [{ inicio: "07:00", fim: "18:00" }],
                    ter: [{ inicio: "07:00", fim: "18:00" }],
                    qua: [{ inicio: "07:00", fim: "18:00" }],
                    qui: [{ inicio: "07:00", fim: "18:00" }],
                    sex: [{ inicio: "07:00", fim: "18:00" }],
                    sab: [{ inicio: "07:00", fim: "17:00" }],
                    dom: []
                  },
                    address: "R. Ataliba Leonel, 442 - Carlopolis",
                    contact: "(43) 99653-8400",
                    delivery: "Sim / Sem Taxa",
                    instagram:"https://www.instagram.com/lojaferreira1/",
                      novidadesImages: [
                        "images/comercios/materialConstrucao/ferreira/divulgacao/1.png",
                        "images/comercios/materialConstrucao/ferreira/divulgacao/2.png",
                        "images/comercios/materialConstrucao/ferreira/divulgacao/3.png",
                        "images/comercios/materialConstrucao/ferreira/divulgacao/4.png",
                        "images/comercios/materialConstrucao/ferreira/divulgacao/5.png",
                    ],
                    novidadesDescriptions: [ 
                      
                      "Proteja o que é seu com segurança e qualidade! A Loja Ferreira TEM fechadura trava lateral DOVALE, ideal para garantir mais proteção ao seu espaço",
                      "tela Morlan na Loja Ferreira!Se você está procurando qualidade e resistência para cercas e proteções, aqui TEM!",
                      "A Loja Ferreira tem tudo que você precisa! Luvas, lonas, rastelos e muito mais para a colheita do café. ",
                      "Precisando de um container para sua obra?Na Loja Ferreira, você aluga por apenas R$200,00 por mês!Ideal para guardar ferramentas, materiais e manter tudo organizado e seguro.",
                      "Quer reformar com rapidez e praticidade? O drywall é a solução perfeita! Transforme seus ambientes com agilidade e qualidade!",
                      

                    
                    ],

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
                    instagram:"https://www.instagram.com/quintanda.pimenta.doce/",
                    
                    novidadesImages: [
                        "images/comercios/quitanda/divulgacao/1.png",
                        "images/comercios/quitanda/divulgacao/2.png",
                        "images/comercios/quitanda/divulgacao/3.png",
                        "images/comercios/quitanda/divulgacao/4.png",
                        "images/comercios/quitanda/divulgacao/5.png",
                    ],
                    novidadesDescriptions: [ 
                      
                      "Temos Assados agora todo domingo",
                      "Temos Massas todas as quartas",
                      "Frutas exoticas",
                      "Frutas Frescas",
                      "Verduras frescas",

                    
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
                hours: "Seg a Sab: 10:30h as 13:00h<br>Seg a Sex: 18:30h as 21:00h",
                statusAberto:".",
                  horarios: {                    
                    seg: [{ inicio: "10:00", fim: "13:00" },{ inicio: "18:30", fim: "21:00" }],
                    ter: [{ inicio: "10:00", fim: "13:00" },{ inicio: "18:30", fim: "21:00" }],
                    qua: [{ inicio: "10:00", fim: "13:00" },{ inicio: "18:30", fim: "21:00" }],
                    qui: [{ inicio: "10:00", fim: "13:00" },{ inicio: "18:30", fim: "21:00" }],
                    sex: [{ inicio: "10:00", fim: "13:00" },{ inicio: "18:30", fim: "21:00" }],
                    sab: [{ inicio: "10:00", fim: "13:00" },],
                    dom: []
                  },
                address: "Rua Benedito Salles 1241",
                contact: "(43) 98844-8407",
                contact2: "(43) 99838-7570",
                delivery: "Sim / Com Taxa",                
              novidadesImages: [                    
                  "images/comercios/restaurante/assadaoRussao/divulgacao/1.png",                        
                 "images/comercios/restaurante/assadaoRussao/divulgacao/2.png",
                 "images/comercios/restaurante/assadaoRussao/divulgacao/3.png",
                 "images/comercios/restaurante/assadaoRussao/divulgacao/4.png", 
                 
              ],
              novidadesDescriptions:[
                "Sua noite merece um sabor especial! Venha saborear nossos pratos feitos e marmitex quentinhos, de segunda a sexta, das 18h30 às 21h!",
                "m1",
                "m2",
                "m3",
      
                ],
              
            },

            {
              image: "images/comercios/restaurante/cantinaItaliana/perfil.png",
              name: "Cantina Italiana",
              hours: "Seg: 17:30h a 23h <br> Ter: Fechado<br>Qua a Dom: 17:30h a 23h",
              statusAberto:".",
                  horarios: {                    
                    seg: [{ inicio: "17:30", fim: "23:00" }],
                    ter: [],
                    qua: [{ inicio: "17:30", fim: "23:00" }],
                    qui: [{ inicio: "17:30", fim: "23:00" }],
                    sex: [{ inicio: "17:30", fim: "23:00" }],
                    sab: [{ inicio: "17:30", fim: "23:00" }],
                    dom: [{ inicio: "17:30", fim: "23:00" }]
                  },
              address: "R. Padre Hugo - Carlópolis",
              contact: "(43) 99640-4484",
              delivery: "Sim / Com Taxa", 
              instagram:"https://www.instagram.com/cantina_italiana_joao/",
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
                    image: "images/comercios/restaurante/delfino/delfino.png",
                    name: "Delfino",
                    hours: "Seg a Sex: 11:00h as 15:00h - 18:00h as 22:30h</br> Sab: 11:00h as 16:00h",
                    statusAberto:".",
                    horarios: {                    
                      seg: [{ inicio: "11:00", fim: "15:00" },{ inicio: "18:00", fim: "22:30" }],
                      ter: [{ inicio: "11:00", fim: "15:00" },{ inicio: "18:00", fim: "22:30" }],
                      qua: [{ inicio: "11:00", fim: "15:00" },{ inicio: "18:00", fim: "22:30" }],
                      qui: [{ inicio: "11:00", fim: "15:00" },{ inicio: "18:00", fim: "22:30" }],
                      sex: [{ inicio: "11:00", fim: "15:00" },{ inicio: "18:00", fim: "22:30" }],
                      sab: [{ inicio: "11:00", fim: "16:00" }],
                      dom: []
                    },
                    address: "R. Kalil Keder, 90",
                    contact: "(43) 9111-9484",
                    delivery: "Sim / Com Taxa",
                  
                },


          {
            image: "images/comercios/restaurante/oficinaSabor/perfil.png",
            name: "Oficina do Sabor",
            hours: "Dom a Dom: 10:30h as 14:00h",
            statusAberto:".",
                  horarios: {                    
                    seg: [{ inicio: "10:30", fim: "14:00" }],
                    ter: [{ inicio: "10:30", fim: "14:00" }],
                    qua: [{ inicio: "10:30", fim: "14:00" }],
                    qui: [{ inicio: "10:30", fim: "14:00" }],
                    sex: [{ inicio: "10:30", fim: "14:00" }],
                    sab: [{ inicio: "10:30", fim: "14:00" }],
                    dom: [{ inicio: "10:30", fim: "14:00" }]
                  },
            
            address: "Rua Capitão Estácio 604, Carlópolis",
            contact: "(43) 99601-5543",
            delivery: "Sim / Com Taxa",
            instagram:"https://www.instagram.com/oficinadosabor_clps/",
            facebook:"https://www.facebook.com/people/Oficina-do-Sabor/100051036652126/",
           
            
          novidadesImages: [                    
              "images/comercios/restaurante/oficinaSabor/divulgacao/1.png",                        
             "images/comercios/restaurante/oficinaSabor/divulgacao/2.png",
             "images/comercios/restaurante/oficinaSabor/divulgacao/3.png",
             "images/comercios/restaurante/oficinaSabor/divulgacao/4.png",
             "images/comercios/restaurante/oficinaSabor/divulgacao/5.png",
             
                    ],
                    novidadesDescriptions:[
          "A COMIDA CASEIRA PASSANDO DE GERAÇÃO PARA GERAÇÃO!!",
          "Espetinho de Quarta a Sexta",
          "Você que procura aquele assado, aquela costela de qualidade para o seu almoço de domingo, encontrou o lugar certo!!!",
          "Temos Marmitas! Confira os preços",
          "Nossa famosa Maionese!",

          ],
          
        },

{
              image: "images/comercios/restaurante/paiol/paiol.png",
              name: "Paiol",
              hours: "Ter: 10:00h as 15:00h<br>Qua - Sab: 10:00h as 15:00h - 18h30 as 23:00h <br> Dom: 11:00h as 15:00h - 18h30 as 23:00h<br>Seg: Fechado",
              statusAberto:".",
            horarios: {                    
              seg: [],
              ter: [{ inicio: "10:00", fim: "15:00" }],
              qua: [{ inicio: "10:00", fim: "15:00" },{ inicio: "18:30", fim: "23:00" }],
              qui: [{ inicio: "10:00", fim: "15:00" },{ inicio: "18:30", fim: "23:00" }],
              sex: [{ inicio: "10:00", fim: "15:00" },{ inicio: "18:30", fim: "23:00" }],
              sab: [{ inicio: "10:00", fim: "15:00" },{ inicio: "18:30", fim: "23:00" }],
              dom: [{ inicio: "10:00", fim: "15:00" },{ inicio: "18:30", fim: "23:00" }]
            },
              address: "Rua Benedito Salles 10, Carlópolis,",
              contact: "(43) 99159-0070",
              delivery: "Sim / Com Taxa",
              facebook: "https://www.facebook.com/SaleBrasaCarlopolis/?locale=pt_BR",
              instagram: "https://www.instagram.com/paiolpizzaburguer/",
              infoAdicional:"<a target='_blank' style='color:#2da6ff;' href='https://shop.beetech.com.br/churrascoegastronomia'  >Cardapio On Line</a>",
             
             
              novidadesImages: [                    
                  "images/comercios/restaurante/paiol/divulgacao/1.png",
                 "images/comercios/restaurante/paiol/divulgacao/2.png",
                 "images/comercios/restaurante/paiol/divulgacao/3.png",
                 "images/comercios/restaurante/paiol/divulgacao/4.png",
              ],
      
          },


          {
            image: "images/comercios/restaurante/galego/perfil.png",
            name: "Pesqueiro do Galego",
            hours: "Qua a Sab: 11:00h - 21:30h<br>Dom: 11:00h - 16:00h ",
            statusAberto:".",
            horarios: {                    
              seg: [],
              ter: [],
              qua: [{ inicio: "11:00", fim: "21:30" }],
              qui: [{ inicio: "11:00", fim: "21:30" }],
              sex: [{ inicio: "11:00", fim: "21:30" }],
              sab: [{ inicio: "11:00", fim: "21:30" }],
              dom: [{ inicio: "11:00", fim: "16:00" }]
            },
            address: "Estr. Fazendinha, 158 - Carlópolis",
            contact: "(43) 99619-1971",
            delivery: "Sim / Com Taxa",
            instagram:"https://www.instagram.com/pesqueirodogalego",
            facebook:"https://www.facebook.com/pesqueirodogalegoclps/",
            menuImages: [                   
              "images/comercios/restaurante/galego/cardapio/1.png",
               
                     
          ],
            
          novidadesImages: [                    
              "images/comercios/restaurante/galego/divulgacao/1.png",                        
             "images/comercios/restaurante/galego/divulgacao/2.png",
             "images/comercios/restaurante/galego/divulgacao/3.png",
             "images/comercios/restaurante/galego/divulgacao/4.png",
             "images/comercios/restaurante/galego/divulgacao/5.png",
             
          ],novidadesDescriptions:[
            "Venha Conferir nossas porções!", 
            "Cerveja sempre gelada!",
            "Estacionamento amplo!",
            "Espaço para seu filho se divertir",
            "As quintas temos tilapia aberta assada! tradição da casa!"
          
          ],
          
        },



            


                
                {
                  image: "images/comercios/restaurante/neia/neia.png",
                  name: "Neia",
                  hours: "Seg a Sex: 11:00h as 14:00h <br>Sab: 11:00h as 16:00h",
                  statusAberto:".",
                  horarios: {                    
                    seg: [{ inicio: "11:00", fim: "14:00" }],
                    ter: [{ inicio: "11:00", fim: "14:00" }],
                    qua: [{ inicio: "11:00", fim: "14:00" }],
                    qui: [{ inicio: "11:00", fim: "14:00" }],
                    sex: [{ inicio: "11:00", fim: "14:00" }],
                    sab: [{ inicio: "11:00", fim: "16:00" }],
                    dom: []
                  },
                  address: "R. Kalil Keder, 262 ",
                  contact: "(43) 99847-1137",
                  delivery: "Sim / Com Taxa",
                  
              },

              
                {
                  image: "images/comercios/restaurante/portal/portal.png",
                    name: "Portal",
                    hours: "Seg a Sex: 11:30h as 14:00h - 19:00h as 21:00h",
                    statusAberto:".",
                    horarios: {                    
                      seg: [{ inicio: "11:30", fim: "14:00" },{ inicio: "19:00", fim: "21:00" }],
                      ter: [{ inicio: "11:30", fim: "14:00" },{ inicio: "19:00", fim: "21:00" }],
                      qua: [{ inicio: "11:30", fim: "14:00" },{ inicio: "19:00", fim: "21:00" }],
                      qui: [{ inicio: "11:30", fim: "14:00" },{ inicio: "19:00", fim: "21:00" }],
                      sex: [{ inicio: "11:30", fim: "14:00" },{ inicio: "19:00", fim: "21:00" }],
                      sab: [],
                      dom: []
                    },
                    address: "R. Benedito Salles, 2023",
                    contact: "(43) 3566-2174",
                    delivery: "Sim / Com Taxa",
                    infoAdicional:"Fica dentro do Hotel Portal",
                    site:"http://www.hotelportalpr.com.br/restaurante",
                    novidadesImages: [                    
                      "images/comercios/restaurante/portal/divulgacao/1.png",
                     "images/comercios/restaurante/portal/divulgacao/2.png",
                     "images/comercios/restaurante/portal/divulgacao/3.png",
                     "images/comercios/restaurante/portal/divulgacao/4.png",
                     "images/comercios/restaurante/portal/divulgacao/5.png",
                  ],
                    
                },
 {
              image: "images/comercios/restaurante/restauranteDaDi/restauranteDaDi.png",
              name: "Restaurante da Di",
              hours: "Dom a Dom: 10:30h as 14:00h",
              statusAberto:".",
              horarios: {                    
                seg: [{ inicio: "10:30", fim: "14:00" }],
                ter: [{ inicio: "10:30", fim: "14:00" }],
                qua: [{ inicio: "10:30", fim: "14:00" }],
                qui: [{ inicio: "10:30", fim: "14:00" }],
                sex: [{ inicio: "10:30", fim: "14:00" }],
                sab: [{ inicio: "10:30", fim: "14:00" }],
                dom: [{ inicio: "10:30", fim: "14:00" }]
              },
              address: "Benedito Salles n°910",
              contact: "(43) 99632-3418",
              delivery: "Sim / Com Taxa",
              instagram:"https://www.instagram.com/marmitasdadiih/",
              novidadesImages: [                    
                "images/comercios/restaurante/restauranteDaDi/divulgacao/1.png",
               "images/comercios/restaurante/restauranteDaDi/divulgacao/2.png",
               "images/comercios/restaurante/restauranteDaDi/divulgacao/3.png",
               "images/comercios/restaurante/restauranteDaDi/divulgacao/4.png",
               "images/comercios/restaurante/restauranteDaDi/divulgacao/5.png",
            ],
            novidadesDescriptions: [    
              "Toda Quinta-feira temos Panqueca",
              "Toda Sexta-feira temos Parmegiana",              
              "Todo Sabado temos Feijoada",              
              "Todo Sábado temos A Porção de Feijoada ( 3 pessoas)",
              "Todo Domingo temos os Assados",
             ],
            
          },

              

                {
                  image: "images/comercios/restaurante/saborRoca/saborRoca.png",
                  name: "Sabor da Roça",
                  hours: "Seg a Sab: 10:30h as 14:00h",
                  statusAberto:".",
                    horarios: {                    
                      seg: [{ inicio: "10:30", fim: "14:00" }],
                      ter: [{ inicio: "10:30", fim: "14:00" }],
                      qua: [{ inicio: "10:30", fim: "14:00" }],
                      qui: [{ inicio: "10:30", fim: "14:00" }],
                      sex: [{ inicio: "10:30", fim: "14:00" }],
                      sab: [{ inicio: "10:30", fim: "14:00" }],
                      dom: []
                    },
                  address: "R. Benedito Salles, 365",
                  contact: "(43) 99832-3050",
                  delivery: "Sim / Sem Taxa",
                
              },

              {
                image: "images/comercios/restaurante/selaht/selaht.png",
                name: "Selaht Grill",
                hours: "Ter a Dom: 11:00h as 23:00h",
                statusAberto:".",
                    horarios: {                    
                      seg: [],
                      ter: [{ inicio: "11:00", fim: "23:00" }],
                      qua: [{ inicio: "11:00", fim: "23:00" }],
                      qui: [{ inicio: "11:00", fim: "23:00" }],
                      sex: [{ inicio: "11:00", fim: "23:00" }],
                      sab: [{ inicio: "11:00", fim: "23:00" }],
                      dom: [{ inicio: "11:00", fim: "23:00" }]
                    },
                address: "R. Padre Hugo, 460",
                contact: "(43) 9 9160-5120",
                delivery: "Sim / Com Taxa",
                facebook:"https://www.facebook.com/selaht.gastronomia",
                instagram:"https://www.instagram.com/selaht.gastronomia/",
                infoAdicional:"<a target='_blank' style='color:#2da6ff;' href='https://eatfood.app/cardapio/58qt9yj5dqgt2timpqd7'>Cardapio On Line</a>",
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
            image: "images/comercios/restaurante/yingyang/yingyang.png",
            name: "Ying Yang",
            hours: "Seg a Sab: 18:00h as 23:00h <br> Sab e Dom: 10:30h as 14:00h - 18:00h as 23:00h",
            statusAberto:".",
            horarios: {                    
              seg: [{ inicio: "18:00", fim: "23:00" }],
              ter: [{ inicio: "18:00", fim: "23:00" }],
              qua: [{ inicio: "18:00", fim: "23:00" }],
              qui: [{ inicio: "18:00", fim: "23:00" }],
              sex: [{ inicio: "18:00", fim: "23:00" }],
              sab: [{ inicio: "10:30", fim: "14:00" },{ inicio: "18:00", fim: "23:00" }],
              dom: [{ inicio: "10:30", fim: "14:00" },{ inicio: "18:00", fim: "23:00" }]
            },
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
                  hours: "Seg a Sex: 08:00h as 18:00h <br> Sab: 08:00h as 12:00h",
                  statusAberto:".",
                  horarios: {                    
                    seg: [{ inicio: "08:00", fim: "18:00" }],
                    ter: [{ inicio: "08:00", fim: "18:00" }],
                    qua: [{ inicio: "08:00", fim: "18:00" }],
                    qui: [{ inicio: "08:00", fim: "18:00" }],
                    sex: [{ inicio: "08:00", fim: "18:00" }],
                    sab: [{ inicio: "08:00", fim: "12:00" }],
                    dom: []
                  },
                  address: "R. Benedito Salles, 627 - Carlópolis",
                  contact: "(43) 3566-2749",
                  instagram:"https://www.instagram.com/movepar_carlopolis/",
                  novidadesImages: [                    
                    "images/comercios/moveis/movepar/divulgacao/1.png",
                     "images/comercios/moveis/movepar/divulgacao/2.png",
                   
                  ],
                  novidadesDescriptions: [  
        
                 "Venha conferir nossos moveis",
                 "Venha conferir nossos eletronicos",
                
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
                    hours: "Seg a Sex: 8:00h as 18:00h <br> Sab: 08:00h as 12:00h",
                    statusAberto:".",
                    horarios: {                    
                      seg: [{ inicio: "08:00", fim: "18:00" }],
                      ter: [{ inicio: "08:00", fim: "18:00" }],
                      qua: [{ inicio: "08:00", fim: "18:00" }],
                      qui: [{ inicio: "08:00", fim: "18:00" }],
                      sex: [{ inicio: "08:00", fim: "18:00" }],
                      sab: [{ inicio: "08:00", fim: "12:00" }],
                      dom: []
                    },
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

                  {
                    name: "Luciano do Taxi",
                    hours: "Seg a Sab: 7h - 20h </br> Dom: 07 - 00h",
                    address: "Em Frente ao banco Itau",
                    contact: "(43) 99631-5034",
                },

                {
                    name: "Roger do Taxi",
                    hours: "Seg a Sab: 7h - 20h </br> Dom: 07 - 00h",
                    address: "Em Frente ao banco Itau",
                    contact: "(43) 99175-8283",
                },
            ],
        },



        {
          link: document.querySelector("#menuColetaLixo"),    
          title: "Coleta de Lixo",
          establishments: [
              {
                  name: "Coleta de Lix",
                  hours: "Seg a Dom: 7h - 20h",
                  address: "R. Kelil Keder, 603",
                  contact: "(43) 99137-5516",
                  image: "images/informacoes/VagasTrabalho/modesto/modesto.png",
                  infoVagaTrabalho:"Precisa-se de motoboy",
              },
          ],
      },






         {
  link: document.querySelector("#menuNotaFalecimento"),
  title: "Nota de Falecimento",
  establishments: [
///
///
///

//06/06
{
      name: "Funeraria Cristo Rei",    
      image: "images/informacoes/notaFalecimento/cristoRei/12.png",
     descricaoFalecido: "Faleceu em Carlópolis o Anjinho 'LUIS MIGUEL' com pouco meses de vida.<br> A cerimônia do velório iniciará hoje às 11:10 horas no Cemitério Municipal de Carlópolis.<br>Sua despedida será hoje às 13:30 horas no Cemitério Municipal de Carlópolis.<br>Nossos profundos sentimentos a toda família e amigos!"

    },



//05/06
{
      name: "Funeraria Cristo Rei",    
      image: "images/informacoes/notaFalecimento/cristoRei/11.png",
     descricaoFalecido: "Faleceu em Carlópolis aos 95 anos de idade, Sr 'OLIVINO CÂNDIDO DE SOUZA', mais conhecido como: Livino Souza<br>O horário da cerimônia será às 12:00 horas desta Quinta - feira no velório municipal de Carlópolis.<br>Seu sepultamento será amanhã às 09:00 horas no Cemitério Municipal de Carlópolis.<br>Nossos profundos sentimentos a toda família e amigo"

    },



{
      name: "Funeraria Cristo Rei",    
      image: "images/informacoes/notaFalecimento/cristoRei/10.png",
     descricaoFalecido: "Faleceu em Carlópolis aos 66 anos de idade, Sr 'JOSÉ RODRIGUES CAMARGO', mais conhecido como: Zé Gordo<br> O horário da cerimônia será definido juntamente com os familiares no velório municipal de Carlópolis.<br>Seu sepultamento será amanhã às  09:00 horas no Cemitério Municipal de Carlópolis.<br>Nossos profundos sentimentos a toda família e amigos"

    },

{
      name: "Funeraria Cristo Rei",    
      image: "images/informacoes/notaFalecimento/cristoRei/9.png",
     descricaoFalecido: "Faleceu em Carlópolis aos 81 anos de idade, Sra 'ANGÉLICA BERGAMO GABRIEL'.<br>A cerimônia do velório iniciará hoje às 12:00 horas no Velório Municipal de Carlópolis.<br>Seu sepultamento será hoje às 16:30 horas no Cemitério Municipal de Carlópolis.<br>Nossos profundos sentimentos a toda família e amigos!"

    },


{
      name: "Funeraria Cristo Rei",    
      image: "images/informacoes/notaFalecimento/cristoRei/8.png",
     descricaoFalecido: "Faleceu em Carlópolis aos 78 anos de idade, Sr 'ANTÔNIO BARBOSA DA SILVA'.<Br> A cerimônia iniciará a pedido da família às 08:00 desta Sexta-Feira 30.05.25 no velório Municipal de Carlópolis.<Br>Seu sepultamento será hoje às 16:45 horas no Cemitério Municipal de Carlópolis.<Br>Nossos profundos sentimentos a toda família e amigos"
    },

     {
      name: "Funeraria Grupo Castilho",    
      image: "images/informacoes/notaFalecimento/castilho/1.png",
     descricaoFalecido: "Comunicamos o falecimento da Sr. ANA MARIA TELES ALVES aos 83 anos de idade.<br>‌O velório será na CAPELA MUNICIPAL DE CARLÓPOLIS - PR.<br>O sepultamento será realizado 23/05/2025 as 09:00 no CEMITÉRIO MUNICIPAL DE CARLÓPOLIS - PR."
    },


/// 25/05
    {
      name: "Funeraria Cristo Rei",    
      image: "images/informacoes/notaFalecimento/cristoRei/6.png",
     descricaoFalecido: "Faleceu em Carlópolis aos 79 anos de idade, Sr 'JOSÉ PEREIRA VIEIRA', mais conhecido como: Zé do Margarida Lima.<br>A cerimônia iniciará nesta madrugada de Domingo às 02:00 horas no velório Municipal de Carlópolis.<br>Seu sepultamento será hoje às 17:00 horas no Cemitério Municipal de Carlópolis.<br>Nossos profundos sentimentos a toda família e amigo"
    },

//24/05

 {
      name: "Funeraria Cristo Rei",    
      image: "images/informacoes/notaFalecimento/cristoRei/5.png",
     descricaoFalecido: "Faleceu em Carlópolis aos 85 anos de idade, Sr 'WENCESLAU GONÇALVES DE ALMEIDA'. Mais conhecido como: Wenceslau Gino.<br>A cerimônia iniciará nesta madrugada de sábado às 02:00 horas no velório Municipal de Carlópolis.<br>Seu sepultamento será hoje às 16:30 horas no Cemitério Municipal de Carlópolis.<br>Nossos profundos sentimentos a toda família e amigos"
    },


// 20/05
    {
      name: "Funeraria Cristo Rei",    
      image: "images/informacoes/notaFalecimento/cristoRei/4.png",
     descricaoFalecido: "Faleceu em Jacarezinho aos 80 anos de idade, Sra 'IRACEMA DA SILVA DE OLIVEIRA'.<br>A cerimônia do velório iniciará hoje às 19:00 horas na Igreja Paróquia  Senhor Bom Jesus (Matriz).<br>Seu sepultamento será amanhã às 10:00 horas no Cemitério Municipal de Carlópolis.<br>Nossos profundos sentimentos a toda família e amigos!"
    },


 {
      name: "Funeraria Cristo Rei",    
      image: "images/informacoes/notaFalecimento/cristoRei/3.png",
     descricaoFalecido: " Faleceu em Jacarezinho aos 75 anos de idade, Sr 'GERALDO MAJOR DA SILVA', mais conhecido como: De Reto.<br> A cerimônia do velório iniciará às 14:30 horas em sua residência na vila rural do lado do sapé.<br>Seu sepultamento será amanhã às 09:00 horas no Cemitério Municipal de Quatiguá.<br>Nossos profundos sentimentos a toda família e amigos!"
    },

    {
      name: "Funeraria Cristo Rei",    
      image: "images/informacoes/notaFalecimento/cristoRei/1.png",
     descricaoFalecido: "Faleceu em Campo Largo aos 79 anos de idade, Sr 'NELSON DE OLIVEIRA', mais conhecido como: Nelson Marinho.<br> A cerimônia do velório iniciou às 11:30 horas no Velório Municipal.<br>Seu sepultamento será hoje às 17:00 horas no Cemitério Municipal de Carlópolis.<br>Nossos profundos sentimentos a toda família e amigos!"
    },

    // 20/05/2025
     {
      name: "Funeraria Cristo Rei",      
      image: "images/informacoes/notaFalecimento/cristoRei/2.png",
      descricaoFalecido: "Faleceu em Carlópolis aos 88 anos de idade, Sr 'JOÃO ANTÔNIO DE OLIVEIRA NETO' mais conhecido como: João Amâncio <br>A cerimônia do velório iniciará hoje às 17:00 horas no Cemitério Municipal de Carlópolis.<br>Sua despedida será amanhã às 12:00 horas no Cemitério Municipal de Carlópolis.<br>Nossos profundos sentimentos a toda família e amigos!"
    }
  ]
},





        {
          link: document.querySelector("#menuVagasTrabalho"),    
          title: "Vagas de Trabalho",
          establishments: [
              {
                    image: "images/comercios/supermercado/rocha.jpg",
                    name: "Rocha",
                    hours: "Seg a Sex: 06:30h as 20:00h <br> Dom: 06:00h as 12:00h",
                    statusAberto:".",
                    horarios: {                          
                      seg: [{ inicio: "06:30", fim: "20:00" }],
                      ter: [{ inicio: "06:30", fim: "20:00" }],
                      qua: [{ inicio: "06:30", fim: "20:00" }],
                      qui: [{ inicio: "06:30", fim: "20:00" }],
                      sex: [{ inicio: "06:30", fim: "20:00" }],
                      sab: [{ inicio: "06:30", fim: "20:00" }],
                      dom: [{ inicio: "06:30", fim: "20:00" }],
                    },  
                    address: "Av. Elson Soares, 767 ",
                    contact: "(43) 99105-9324",
                   
                    facebook: "https://www.facebook.com/p/Kelve-Carl%C3%B3polis-100010521284877/?locale=pt_BR",
                    instagram: "https://www.instagram.com/kelvesupermercadosoficial/",
                    infoVagaTrabalho:"1 Vaga Para Açougueiro<br> 1 Vaga Para Feira<br>2 Vagas Para Padaria<br>1 Vaga Para Repositor<br> ",
                },



                {
                    image: "images/comercios/padaria/bom jesus/bomjesus.png",
                    name: "Bom Jesus",
                    hours: "Seg a Sab: 6:00h as 19:00h </br> Dom: 06:00h as 14:00h",
                    statusAberto:".",
                    horarios: {                          
                      seg: [{ inicio: "06:00", fim: "19:00" }],
                      ter: [{ inicio: "06:00", fim: "19:00" }],
                      qua: [{ inicio: "06:00", fim: "19:00" }],
                      qui: [{ inicio: "06:00", fim: "19:00" }],
                      sex: [{ inicio: "06:00", fim: "19:00" }],
                      sab: [{ inicio: "06:00", fim: "19:00" }],
                      dom: [{ inicio: "06:00", fim: "14:00" }],
                    }, 
                    address: "R. Benedito Salles, 615",
                    contact: "(43) 99653-9285",                    
                    facebook: "https://www.facebook.com/PanificadoraRestauranteBomJesus/?locale=pt_BR",
                    instagram: "https://www.instagram.com/bom_jesus_panificadora/",
                         infoVagaTrabalho:"1 Vaga Para Balconista<br> 1 Vaga Para Serviços Gerais<br>1 Vaga Para Auxiliar de Cozinha<br>1 Vaga Para Padeiro / Confeiteiro<br> ",
               
                     
                },






          ],
      },
    
      
        

    ]; 
    

    


    montarCarrosselDivulgacao(); // Agora sim, já com categories carregado
    
  
  
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
      

      
          
      ${paidEstablishments.map((establishment) => {
        let statusAberto = "";
        if (establishment.horarios) {
          const aberto = estaAbertoAgora(establishment.horarios);
          if (aberto) {
            const fechamento = horarioFechamentoAtual(establishment.horarios);
            statusAberto = `<span class='status-tag aberto'>ABERTO ATÉ ${fechamento}</span>`;
          } else {
            const proximo = proximoHorarioDeAbertura(establishment.horarios);
            statusAberto = `<span class='status-tag fechado'>FECHADO</span><span class='proximo-horario'>Abre ${proximo}</span>`;
          }
        }

        return `


              
     <li  id="${normalizeName(establishment.name)}">  







     
     
    
      ${
        establishment.image
          ? `
           <img  id="imagem-${normalizeName(establishment.name)}" src="${establishment.image}" title="${establishment.name}"  alt="Imagem de ${establishment.name}">


          `
          : ""
      }
  
     
     
   <span class="locais_nomes">${establishment.name}</span>
${!establishment.descricaoFalecido ? `
  <button class="share-btn" data-share-id="${normalizeName(establishment.name)}">
    <i class="fas fa-share-alt"></i>
  </button>
` : ""}
  



      
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

               

                 ${establishment.statusAberto ? `
                    <div class="info-box">
                      
                      <div>
                        <div class="info-label"> ${statusAberto}</div>
                        
                      </div>
                    </div>` : ""
                  }


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
                        <div class="info-label">Funcionamento: </div>
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




                ${establishment.contact || establishment.contact2 || establishment.contact3 ? (() => {
                  const formatPhone = (number) => {
                    const rawNumber = (number || "").replace(/\D/g, "");
                    const fullNumber = rawNumber.startsWith("55") ? rawNumber : `55${rawNumber}`;
                    return fullNumber;
                  }

                  const firstNumber = formatPhone(establishment.whatsapp || establishment.contact || "");
                  const secondNumber = establishment.contact2 ? formatPhone(establishment.contact2) : null;
                const thirdNumber = establishment.contact3 ? formatPhone(establishment.contact3) : null;

                return `
                    <div class="info-box">
  <i class="fas fa-phone info-icon"></i>
  <div>
    <div class="info-label">Contato</div>
    <div class="info-value">
      ${establishment.contact ? `
        <div style="display: flex; align-items: center;  margin-bottom: 4px;">
          <a href="https://api.whatsapp.com/send?phone=${firstNumber}&text=${encodeURIComponent("Olá! Encontrei seu número no Site Olá Carlópolis e gostaria de uma informação!")}" target="_blank">
            <i class='bx bxl-whatsapp info-icon' style="color: #25D366; font-size: 24px;"></i>
          </a>
          <span>${establishment.contact}</span>
        </div>` : ""}

      ${secondNumber ? `
        <div style="display: flex; align-items: center;  margin-bottom: 4px;">
          <a href="https://api.whatsapp.com/send?phone=${secondNumber}&text=${encodeURIComponent("Olá! Encontrei seu número no Site Olá Carlópolis e gostaria de uma informação!")}" target="_blank">
            <i class='bx bxl-whatsapp info-icon' style="color: #25D366; font-size: 24px;"></i>
          </a>
          <span>${establishment.contact2}</span>
        </div>` : ""}

      ${thirdNumber ? `
        <div style="display: flex; align-items: center; ">
          <a href="https://api.whatsapp.com/send?phone=${thirdNumber}&text=${encodeURIComponent("Olá! Encontrei seu número no Site Olá Carlópolis e gostaria de uma informação!")}" target="_blank">
            <i class='bx bxl-whatsapp info-icon' style="color: #25D366; font-size: 24px;"></i>
          </a>
          <span>${establishment.contact3}</span>
        </div>` : ""}
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

                      ${establishment.funeraria ? `
                    <div class="info-box">
                      <i class="fas fa-circle-info info-icon"></i>
                      <div>
                        <div class="info-label">Funeraria:</div>
                        <div class="info-value">${establishment.funeraria}</div>
                      </div>
                    </div>` : ""
                  }

                      ${establishment.descricaoFalecido ? `
                    <div class="info-box">
                      <i class="fas fa-circle-info info-icon"></i>
                      <div>
                        <div class="info-label">Nota de Falecimento:</div>
                        <div class="info-value">${establishment.descricaoFalecido}</div>
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
    <button id="novidadesButton" class="novidades-btn" data-name="${establishment.name}" data-id="${normalizeName(establishment.name)}"
      onclick="registrarClique('${normalizeName(establishment.name)}', 'divulgacao')">
      <i class="fas fa-camera"></i> Divulgação (${establishment.novidadesImages.length})
    </button>
  ` : ''}

  ${establishment.menuImages && establishment.menuImages.length > 0 ? `
    <button id="cardapioButton" class="menu-btn" data-name="${establishment.name}" data-id="${normalizeName(establishment.name)}"
      onclick="registrarClique('${normalizeName(establishment.name)}', 'cardapio')">
      <i class="fas fa-utensils"></i> Cardápio (${establishment.menuImages.length})
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
  `;
}).join('')}
                  </ul>
                    `;
                  
// Ativa os botões de compartilhar
setTimeout(() => {
  document.querySelectorAll(".share-btn").forEach((botao) => {
    botao.addEventListener("click", () => {
      const id = botao.getAttribute("data-share-id");
      if (id) compartilharEstabelecimento(id);
    });
  });
}, 300);





                    function criarInfoCards(establishment) {
                      const wrapper = document.createElement("div");
                    
                      const infos = [

                        {
                          icon: "fa-clock",
                          label: "Status",
                          valor: statusAberto,
                        },

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


                      const tipo = button.classList.contains('novidades-btn') ? "divulgacao" : "cardapio";
    const id = button.getAttribute("data-id");
    registrarCliqueBotao(tipo, id);

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
                  //  darkLight.addEventListener("click", () => {
                 //     body.classList.toggle("dark");
                 //     darkLight.classList.toggle("bx-moon");
                 //     darkLight.classList.toggle("bx-sun");
                 //   });
                  
                    
                  
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

                

                    if (window.location.hash) {
                      // Garante que o menu comece fechado mas com textos prontos para exibir
                      sidebar.classList.add("close");
                    
                      // Ao clicar no menu, garante que os textos sejam mostrados
                      sidebarOpen.addEventListener("click", function () {
                        sidebar.classList.remove("close");
                      }, { once: true }); // executa só na primeira vez
                    }

                    // Mostra o loader só se veio de link compartilhado
// Mostra o loader só se veio de link compartilhado
if (window.location.hash) {
  const loader = document.getElementById("loader");
  if (loader) {
    setTimeout(() => {
      loader.style.display = "none"; // esconde após tudo carregar
    }, 1000); // tempo mínimo para efeito visual
  }
} else {
  // Se não veio de link, remove o loader imediatamente
  const loader = document.getElementById("loader");
  if (loader) loader.style.display = "none";
}


              
                    
////

// Função para registrar clique no Firebase
function registrarCliqueBotao(tipo, idEstabelecimento) {
  const hoje = new Date().toISOString().slice(0, 10);
  const ref = firebase.database().ref(`cliquesPorBotao/${hoje}/${idEstabelecimento}/${tipo}`);
  
  ref.transaction((atual) => (atual || 0) + 1);
}



 ///////////// inicio botao compartilhamento

 document.addEventListener("DOMContentLoaded", () => {
  const hash = window.location.hash.replace("#", "").toLowerCase();
  if (!hash) return;

  // Procura o estabelecimento com nome normalizado igual ao hash
  categories.forEach((categoria) => {
    categoria.establishments?.forEach((est) => {
      const nomeNormalizado = normalizeName(est.name);
      if (nomeNormalizado === hash) {
        // Abre o menu correspondente
        if (categoria.link) categoria.link.click();

        // Espera carregar o conteúdo e então rola até o elemento
        setTimeout(() => {
          const elementoEst = document.querySelector(`[data-id="${nomeNormalizado}"]`);
          if (elementoEst) {
            elementoEst.scrollIntoView({ behavior: "smooth", block: "center" });
            elementoEst.classList.add("highlighted"); // opcional, destaque visual
          }
        }, 500);
      }
    });
  });
});







window.addEventListener("load", () => {
  const hash = window.location.hash.replace("#", "");
  if (!hash) return;

  const categoriaAlvo = categories.find(cat =>
    cat.establishments?.some(est => normalizeName(est.name) === hash)
  );

  if (categoriaAlvo && categoriaAlvo.link) {
    categoriaAlvo.link.click(); // simula o clique

    const tentarRolar = () => {
      const alvo = document.getElementById(hash);
      const imagem = alvo?.querySelector("img");

      if (alvo && imagem) {
        alvo.scrollIntoView({ behavior: "smooth", block: "center" });
      } else {
        setTimeout(tentarRolar, 300);
      }
    };

    setTimeout(tentarRolar, 500);
  }
});




document.querySelectorAll('.botao-menu-topo').forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.target;

    // Remove classe ativo
    document.querySelectorAll('.botao-menu-topo').forEach(b => b.classList.remove('ativo'));
    btn.classList.add('ativo');

    // Esconde todas
    document.querySelectorAll('.carrossel-container').forEach(secao => {
      secao.style.display = 'none';
    });

    // Mostra a correta
    const secaoAlvo = document.getElementById('secao-' + target);
    if (secaoAlvo) {
      secaoAlvo.style.display = 'block';
    }

    // Atualiza swiper correto
    setTimeout(() => {
      if (target === "turismo" && window.swiperTurismo) {
        window.swiperTurismo.update();
        window.swiperTurismo.slideTo(0);
      }
      if (target === "eventos" && window.swiperEventos) {
        window.swiperEventos.update();
        window.swiperEventos.slideTo(0);
      }
      if (target === "divulgacao" && window.swiperNovidades) {
        window.swiperNovidades.update();
        window.swiperNovidades.slideTo(0);
      }
    }, 150);
  });
});

window.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll('.carrossel-container').forEach(secao => {
    secao.style.display = 'none';
  });
  const primeira = document.getElementById('secao-divulgacao');
  if (primeira) primeira.style.display = 'block';
});

let deferredPrompt = null;

// Captura o evento nativo do Android
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
});

// Quando clicar no botão do menu APP
document.getElementById("menuApp").addEventListener("click", () => {
  document.getElementById("instalarAppBox").classList.remove("hidden");
});

document.getElementById("btnInstalarPWA").addEventListener("click", () => {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        console.log("Usuário aceitou instalar o app");
      }
      deferredPrompt = null;
    });
  } else {
    alert("📱 Para IPhone, no navegador, toque em 'Compartilhar' (ícone com a seta para cima) e depois em 'Adicionar à Tela de Início' ");
  }
  fecharInstalador();
});




// Detecta quando o app for instalado como PWA
window.addEventListener('appinstalled', () => {
  console.log('✅ PWA instalado detectado');

  const hoje = new Date().toISOString().split('T')[0];

  fetch(`https://contadoracessos-default-rtdb.firebaseio.com/instalacoesPWA/${hoje}.json`, {
    method: "POST",
    body: JSON.stringify({
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent
    }),
    headers: {
      "Content-Type": "application/json"
    }
  }).then(() => {
    console.log('📦 Instalação registrada no Firebase');
  }).catch((err) => {
    console.error('❌ Falha ao registrar instalação:', err);
  });
});





function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isInStandaloneMode() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

document.addEventListener("DOMContentLoaded", () => {
  if (isIos() && !isInStandaloneMode()) {
    const box = document.getElementById("iosInstallBox");
    if (box) box.classList.remove("hidden");
  }
});



function isIosSafari() {
  const ua = window.navigator.userAgent;
  return /iPhone|iPad|iPod/i.test(ua) && /Safari/i.test(ua) && !/CriOS|FxiOS/i.test(ua);
}

function isInStandaloneMode() {
  return 'standalone' in window.navigator && window.navigator.standalone;
}

document.addEventListener("DOMContentLoaded", () => {
  if (isIosSafari() && !isInStandaloneMode()) {
    setTimeout(() => {
      const modal = document.getElementById("iosInstallPrompt");
      if (modal) modal.classList.remove("hidden");
    }, 2500);
  }
});











                    
                  });






       function fecharInstalador() {
  const modal = document.getElementById("instalarAppBox");
  if (modal) modal.classList.add("hidden");
}

document.addEventListener("DOMContentLoaded", () => {
  const botaoApp = document.getElementById("menuApp");
  if (botaoApp) {
    botaoApp.addEventListener("click", (e) => {
      e.preventDefault();
      const modal = document.getElementById("instalarAppBox");
      if (modal) modal.classList.remove("hidden");
    });
  }
});


if (window.matchMedia('(display-mode: standalone)').matches) {
  const hoje = new Date().toISOString().split('T')[0];

  const tipoConexao = navigator.connection?.effectiveType || "desconhecido";

  fetch("https://contadoracessos-default-rtdb.firebaseio.com/usoPWA/" + hoje + ".json", {
    method: "POST",
    body: JSON.stringify({
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      conexao: tipoConexao
    }),
    headers: {
      "Content-Type": "application/json"
    }
  });
}

let promptInstalacao = null;

// Detecta o momento em que o navegador permite instalar o PWA
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault(); // Impede o prompt automático
  promptInstalacao = e;

  // Exibe a modal personalizada
  const box = document.getElementById("instalarAppBox");
  if (box) box.classList.remove("hidden");
});

// Quando o usuário clicar no botão "Adicionar"
document.getElementById("btnInstalarPWA")?.addEventListener("click", () => {
  if (promptInstalacao) {
    promptInstalacao.prompt();
    promptInstalacao.userChoice.then((choiceResult) => {
      promptInstalacao = null;
      document.getElementById("instalarAppBox")?.classList.add("hidden");
    });
  }
});

// Quando o usuário clicar no botão "Fechar"
document.getElementById("fecharPWABox")?.addEventListener("click", () => {
  document.getElementById("instalarAppBox")?.classList.add("hidden");
});





                  