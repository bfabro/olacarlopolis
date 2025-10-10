
function isAppInstalado() {
  const isStandaloneAndroid = window.matchMedia('(display-mode: standalone)').matches;
  const isStandaloneIos = ('standalone' in window.navigator) && window.navigator.standalone;
  return isStandaloneAndroid || isStandaloneIos;
}

function gerarMensagemWhatsApp() {
  const agora = new Date();
  const hora = agora.getHours();
  let saudacao;

  if (hora >= 5 && hora < 12) {
    saudacao = "Bom dia!";
  } else if (hora >= 12 && hora < 18) {
    saudacao = "Boa tarde!";
  } else if (hora >= 18 && hora <= 23) {
    saudacao = "Boa noite!";
  } else {
    saudacao = "Desculpe pelo horário,";
  }

  return `${saudacao} Encontrei seu numero no Ola Carlopolis.`;
}

// Retorna o primeiro telefone do contact (array ou string)
function getPrimeiroContato(contact) {
  if (!contact) return "";
  if (Array.isArray(contact)) return String(contact.find(Boolean) || "").trim();
  // divide por separadores comuns: / , ; " e " " ou "
  return String(contact).split(/\s*(?:\/|,|;|\bou\b|\be\b)\s*/i)[0].trim();
}

// Mantém só dígitos (para montar o link do WhatsApp)
function somenteDigitos(str) {
  return String(str || "").replace(/\D/g, "");
}





function getHojeBR() {
  const agora = new Date();
  agora.setHours(agora.getHours() - 3); // UTC-3 (Brasília)
  return agora.toISOString().slice(0, 10);
}


// === VALIDADE: helpers (expira só DEPOIS da data final) ===
function isDepoisDeHojeStr(dataISO) {
  const hoje = getHojeBR();              // 'YYYY-MM-DD' em UTC-3
  return hoje > String(dataISO || "");   // só considera expirado no DIA SEGUINTE
}

function promoExpirada(p) {
  return Boolean(p?.validadeFim) && isDepoisDeHojeStr(p.validadeFim);
}

// === Identidade local do jogador (permite atualizar recorde sem repedir nome) ===
function getOrCreatePlayerId() {
  let id = localStorage.getItem("capivarinha_player_id");
  if (!id) {
    id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
    localStorage.setItem("capivarinha_player_id", id);
  }
  return id;
}

// === Capivarinha: helpers para ranking ===
function getPlayerName() {
  // guarda localmente para não perguntar toda hora
  let nm = localStorage.getItem("capivarinha_player_name") || "";
  if (!nm) {
    nm = prompt("Qual seu nome para o Ranking? (exibido publicamente)") || "";
    nm = nm.trim().slice(0, 30);
    if (nm) localStorage.setItem("capivarinha_player_name", nm);
  }
  return nm;
}

function setPlayerName(newName) {
  const nm = String(newName || "").trim().slice(0, 30);
  if (!nm) return false;
  localStorage.setItem("capivarinha_player_name", nm);
  return true;
}

function salvarScoreCapivarinha(score) {
  try {
    if (!window.firebase || !firebase.database) {
      console.warn("Firebase não disponível");
      return;
    }
    if (!(score > 0)) return;

    const uid = getOrCreatePlayerId();
    const name = getPlayerName();
    if (!name) return;

    const db = firebase.database();
    const userRef = db.ref(`jogos/capivarinha/users/${uid}`);

    // Atualiza histórico opcional (mantém cada partida, se você quiser estatística)
    db.ref("jogos/capivarinha/scores").push({
      uid, name, score: Number(score),
      ts: firebase.database.ServerValue.TIMESTAMP
    }).catch(() => { });

    // Transaction para manter o MELHOR score (best) do usuário
    userRef.transaction((curr) => {
      const best = curr?.best ?? 0;
      if (!curr) {
        // primeira vez
        return {
          name,
          best: Number(score),
          updatedAt: firebase.database.ServerValue.TIMESTAMP
        };
      }
      // atualiza nome (pode ter sido trocado) e recorde se for maior
      return {
        name,
        best: Math.max(Number(best), Number(score)),
        updatedAt: firebase.database.ServerValue.TIMESTAMP
      };
    }).then(() => {
      console.log("Recorde verificado/atualizado:", name, score);
    }).catch(err => console.error("Falha ao salvar/atualizar recorde:", err));
  } catch (e) {
    console.error("Erro salvarScoreCapivarinha:", e);
  }
}


function mostrarRankingCapivarinha() {
  if (location.hash !== "#ranking-capivarinha") location.hash = "#ranking-capivarinha";

  const area = document.querySelector(".content_area");
  area.innerHTML = `
    <div class="page-header">
      <h2>🏆 Ranking Capivarinha</h2>
      <i class="fa-solid fa-share-nodes share-btn"
         onclick="compartilharPagina('#ranking-capivarinha','Ranking Capivarinha','Veja o ranking do jogo Capivarinha!')"></i>
    </div>

    <div class="rank-wrap" style="padding:8px 12px">
      <div class="rank-title">
  🏅 Top Records <span><br>(melhor pontuação por jogador)</span>
</div>
      <ul id="rankList" class="rank-list"></ul>

      <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn-rank" onclick="location.hash='canos'; mostrarCanos()">⬅️ Voltar ao Capivarinha</button>
        <!--<button class="btn-rank" id="btnTrocarNome">✏️ Trocar nome</button>-->
        <button class="btn-rank" id="btnMeuRecorde">👤 Meu recorde</button>
      </div>
    </div>
  `;

  const ul = document.getElementById("rankList");

  // segurança: sem Firebase, mostra aviso e sai
  if (!window.firebase || !firebase.database) {
    ul.innerHTML = `<li class="rank-empty">⚠️ Firebase indisponível.</li>`;
    return;
  }

  // pega/gera meu id local (já existe no seu arquivo)
  const myUid = getOrCreatePlayerId();

  // consulta os usuários ordenando por "best" (melhor recorde) — pega até 50
  const ref = firebase.database()
    .ref("jogos/capivarinha/users")
    .orderByChild("best")
    .limitToLast(50);

  // listener que redesenha a lista
  ref.on("value", (snap) => {
    const arr = [];
    snap.forEach(ch => {
      const v = ch.val();
      if (v && typeof v.best === "number") {
        // guardo a chave do nó para identificar quem sou eu
        arr.push({ ...v, _id: ch.key });
      }
    });

    // ordena do maior para o menor
    arr.sort((a, b) => b.best - a.best);

    if (!arr.length) {
      ul.innerHTML = `<li class="rank-empty">Ninguém no ranking ainda. Jogue e salve seu score! 🎮</li>`;
      return;
    }

    const top = arr[0]?.best || 1;

    ul.innerHTML = arr.map((it, i) => {
      const pos = i + 1;
      const medalClass = pos === 1 ? "medal-1" : pos === 2 ? "medal-2" : pos === 3 ? "medal-3" : "";
      const fillPct = Math.max(6, Math.round((Number(it.best || 0) / top) * 100));
      const isMe = it._id === myUid;

      return `
    <li class="rank-item rank-item--compact ${isMe ? "me" : ""}">
      <div class="rank-pos ${medalClass}">${pos}</div>
      <div class="rank-main">
        <div class="rank-row">
          <div class="rank-name" title="${(it.name || "Jogador").toString().slice(0, 60)}">
            ${(it.name || "Jogador").toString().slice(0, 30)}
          </div>
          <div class="score-number">${Number(it.best || 0)}</div>
        </div>
        <div class="score-bar">
          <div class="score-fill" style="width:${fillPct}%"></div>
        </div>
      </div>
    </li>
  `;
    }).join("");



    // rolar até minha posição (se eu estiver na lista)
    const myItem = ul.querySelector(".rank-item.me");
    if (myItem) myItem.scrollIntoView({ behavior: "smooth", block: "center" });
  });

  // Botão "Trocar nome"
  const btnTrocar = document.getElementById("btnTrocarNome");
  if (btnTrocar) btnTrocar.addEventListener("click", () => {
    const novo = prompt("Novo nome para o Ranking:");
    if (setPlayerName(novo)) {
      const uid = getOrCreatePlayerId();
      firebase.database().ref(`jogos/capivarinha/users/${uid}/name`)
        .set(localStorage.getItem("capivarinha_player_name"))
        .then(() => alert("Nome atualizado!"));
    }
  });

  // Botão "Meu recorde" — rola até mim
  // Botão "Meu recorde" — mostra o valor e rola até mim
  const btnMeuRecorde = document.getElementById("btnMeuRecorde");
  if (btnMeuRecorde) btnMeuRecorde.addEventListener("click", async () => {
    try {
      const uid = getOrCreatePlayerId();
      const snap = await firebase.database()
        .ref(`jogos/capivarinha/users/${uid}`)
        .once("value");

      const data = snap.val();
      if (data && typeof data.best === "number") {
        alert(`Seu recorde: ${data.best}`);

        // tenta rolar até sua linha, se ela estiver no Top exibido
        const myItem = document.querySelector(".rank-item.me");
        if (myItem) myItem.scrollIntoView({ behavior: "smooth", block: "center" });
      } else {
        alert("Você ainda não tem recorde salvo. Jogue uma partida para entrar no ranking!");
      }
    } catch (e) {
      console.error(e);
      alert("Não consegui carregar seu recorde agora. Tente novamente.");
    }
  });

}






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


  /// funçao para todas as paginas
  ///

  // Compartilha a página atual (inclui hash) ou copia o link
  function compartilharPagina(hash = location.hash, titulo = "Olá Carlópolis", texto = "Confira esta página!") {
    const url = `${location.origin}${location.pathname}${hash || ""}`;
    if (navigator.share) {
      navigator.share({ title: titulo, text: texto, url })
        .catch(() => mostrarToast("❌ Não foi possível compartilhar."));
    } else {
      navigator.clipboard.writeText(url)
        .then(() => mostrarToast("🔗 Link copiado com sucesso!"))
        .catch(() => alert("Não foi possível copiar o link."));
    }
  }
  window.compartilharPagina = compartilharPagina; // <<< adicione isto
  // Cria um botão flutuante único que sempre compartilha a página atual
  function criarShareFAB() {
    if (document.querySelector(".fab-share")) return; // evita duplicar

    const fab = document.createElement("button");
    fab.className = "fab-share";
    fab.title = "Compartilhar esta página";
    fab.innerHTML = '<i class="fas fa-share-alt"></i>';
    document.body.appendChild(fab);

    fab.addEventListener("click", () => {
      const titulo = document.title || "Olá Carlópolis";
      // tenta pegar o título H2 atual para enriquecer o texto
      const h2 = document.querySelector(".content_area h2");
      const texto = h2 ? h2.textContent.trim() : "Confira esta página!";
      compartilharPagina(location.hash, titulo, texto);
    });
  }

  // Injeta um botão de compartilhar ao lado do H2 da tela, automaticamente
  function injetarShareNoTitulo() {
    const h2 = document.querySelector(".content_area h2.highlighted");
    if (!h2) return;
    if (h2.querySelector(".btn-share")) return; // já tem, não duplica

    const btn = document.createElement("i");
    btn.className = "fa-solid fa-share-nodes btn-share";
    btn.title = "Compartilhar esta página";

    // usa o hash atual como rota; ajuste o título/descrição se quiser
    btn.onclick = () => {
      const titulo = h2.textContent.trim() || "Página";
      const hash = location.hash || "#grupos";
      compartilharPagina(hash, titulo, "Compartilhe esta página");
    };

    h2.appendChild(btn);
  }

  // Observa mudanças na área de conteúdo para reinjetar o botão no título
  function iniciarShareObserver() {
    const area = document.querySelector(".content_area");
    if (!area) return;

    // roda uma vez agora
    injetarShareNoTitulo();

    const obs = new MutationObserver(() => injetarShareNoTitulo());
    obs.observe(area, { childList: true, subtree: true });
  }



  //criarShareFAB();
  iniciarShareObserver();





  ///
  ///




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
  /// inicio detecta usuarios online e desconecta


  document.addEventListener("DOMContentLoaded", function () {
    registrarAcesso();

    const onlineUsersRef = firebase.database().ref("onlineUsers");

    // Cria um ID único para cada usuário
    const userId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const userRef = onlineUsersRef.child(userId);

    // Salva o usuário como online
    userRef.set({
      hora: new Date().toLocaleTimeString(),
      navegador: navigator.userAgent,
      tela: `${window.screen.width}x${window.screen.height}`
    });

    // Remove automaticamente do banco quando o usuário fecha o site
    userRef.onDisconnect().remove();

    // Atualiza o contador de usuários online
    onlineUsersRef.on("value", (snapshot) => {
      const userCount = snapshot.numChildren();
      const contador = document.getElementById("contador");
      if (contador) {
        contador.textContent = userCount;
      }
    });
  });




  /// inicio detecta usuarios online e desconecta


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
    const hoje = getHojeBR();
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
        origem: new URLSearchParams(window.location.search).get("o") || "acesso direto",
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
    const hoje = getHojeBR();
    const ref = firebase.database().ref(`cliquesPorBotao/${hoje}/${idEstabelecimento}/${tipo}`);
    return new Promise((resolve) => {
      ref.transaction(
        (atual) => (atual || 0) + 1,
        (_erro, _committed, _snap) => resolve({ ok: !_erro })
      );
    });
  }

  const destaquesFixos = [
    "lojaferreira", "oficinadocelular", "gerson", "promissorseguros", "sabordaroca"

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
      <img class="content_image" src="${imagem}" alt="${est.name}" loading="lazy">
      <div class="info_divulgacao">
        <h3>${categoria ? categoria + " - " + est.name : est.name}</h3>
        <p>${texto}</p>

        ${est.instagram ? `<a href="${fixUrl(est.instagram)}" target="_blank" rel="noopener noreferrer" class="mais-info">+ informações</a>` : ""}

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


  function abrirPromocoes() {
    location.hash = "#promocoes";
    if (typeof mostrarPromocoes === "function") {
      mostrarPromocoes(); // chama a função já existente que monta a página de promoções
    } else {
      console.warn("Função mostrarPromocoes não encontrada.");
    }
  }



  // pagou? defina por s pago n nao pago // PAGx
  const statusEstabelecimentos = {

    // COMERCIOS:

    //academia
    lobofitness: "n",
    teamvieira: "s",
    //AÇAI
    turminhadoacai: "s",
    thebestacai: "s",

    //Açougue
    acouguecuritiba: "s",

    // ADEGAS
    adegacuenca: "s",
    assao: "s",

    //ADVOCACIA  
    advocaciaabilio: "s",

    // Agropecuaria
    agrovida: "s",
    racoessaojose: "s",
    agrocasavaraschin: "s",


    // assessocia balistica
    betogunsassessoriaarmaria: "s",
    //agencia turismo
    cvccarlopolis: "s",

    // assistencia celular
    oficinadocelular: "s",
    cevassistenciacelular: "s",
    imperiumcell: "s",
    efcell: "s",

    // auto peças
    paulinhoautopecas: "n",
    norbaautopecas: "s",

    //autoeletrica
    renanautoeletrica: "s",

    //autocenter
    bodyautocenter: "s",


    // artesanato
    judite: "s",
    patymaosdeouro: "s",

    //calhas
    nelsoncalhas: "s",

    // cartorio
    registrocivileimoveis: "s",
    tabelionatodenotas: "s",

    //chaveiro
    chaveirocentral: "s",


    //confecção
    yellowjeans: "s",
    panacea: "s",

    // borracharia
    vidanova: "n",
    borrachariajr: "s",
    // deposito de gas
    liagas: "s",
    cncasadogas: "s",

    //doces e chocolates
    cacaushow: "s",

    // clinica veterinaria

    veterinariacarlopolis: "s",
    suedveterinariaepetshop: "s",

    //DESPACHANTE
    rodriguinho: "s",

    //desentupidora
    gcyvazamentos: "s",

    // estudio de beleza
    veronicakataoka: "s",

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
    reidoferro: "s",

    //feira da lua
    feiradalua: "s",

    //floricultura
    rosadesarom: "s",

    //imobiliaria      
    imobiliariacarlopolis: "s",

    // foodtruck
    celeiro: "n",

    //funeraria
    cristorei: "s",
    grupocastilho: "s",


    // grafica

    serigraf: "s",

    // hotel
    nortepioneiro: "s",
    pousadanortepioneiro: "n",

    //loja de pesca
    pescaepresente: "s",
    lojathiagoaguera: "s",

    // mercearia
    seiza: "s",

    radarmeteorologico: "s",

    //moveis
    movepar: "s",

    //mototaxi
    mototaximodesto: "s",

    //motocenter
    binhomotocenter: "s",

    // padaria
    bomjesus: "n",
    esquinadopao: "s",
    //saofrancisco:"s",
    prelie: "s",

    //produtosNaturais
    cantinhosaudavel: "s",

    //piscina
    mhpiscinas: "s",

    //Lava Rapido
    leozindetailer: "s",

    //pizzaria
    fornalhapizzaria: "s",
    tonnypizzaria: "n",
    happyhour: "s",

    // quitanda
    pimentadoce: "s",

    //lanchonete
    ocasarao: "s",
    ione: "s",
    cantinhodapraca: "s",
    caldodecanaamaral: "s",
    levisalgados: "n",
    espacogourmet: "s",
    kidoglanches: "s",
    pracalanches: "s",
    didog: "s",
    xisbauinea: "s",
    mycoffee: "s",
    mrpotato: "s",

    // material de construcao
    lojaferreira: "s",

    //marmoraria
    marmoraria2irmaos: "s",

    //supermercado
    bompreco: "s",
    carreiro: "n",
    comprebemmais: "s",
    kelve: "n",
    obarateiro: "s",
    mercadodoze: "s",
    rocha: "s",
    zerojapan: "s",

    // peixaria
    coopanorpi: "s",

    //corretora de seguros
    promissorseguros: "s",

    // pesqueiro
    peskepagueaguamarine: "n",

    // radio
    carlopolitana: "s",

    // relojoaria
    relojoariamartini: "s",

    // restaurantes
    assadaodorussao: "s",
    cabanas: "s",
    cantinaitaliana: "s",
    emporiosaovictor: "s",
    hime: "s",
    pesqueirodogalego: "s",
    portal: "n",
    neia: "n",
    namigojapaneserestaurant: "s",
    //oficinadosabor:"s",
    paiol: "n",
    restaurantedadi: "s",
    toninhoparana: "s",
    sabordaroca: "s",
    selahtgrill: "s",
    yingyang: "n",

    // produtos de limpeza
    jmprodutosdelimpeza: "s",


    // sorveteria
    limone: "s",
    sorvetessallesferreira: "s",
    santtinogelateria: "s",
    fortyshake: "s",

    // topografia
    da2engenharia: "s",

    //vidraçadia
    sallesvidros: "s",

    //// FIM COMERCIO ////////////////////////////////////////////////////////////////////////////////////////

    //// INICIO SERVIÇOS ////////////////////////////////////////////////////////////////////////////////////////////////

    //anuncio
    piodoanuncio: "n",

    //barbeiro
    luisbarbeiro: "s",

    //cantor
    foguinho: "s",

    // churrasqueiro
    flaviogiovani: "s",
    gustavinho: "s",

    //diarista
    rose: "n",

    //frete
    anselmofrete: "s",
    erickson: "s",

    // guia de pesca
    fabiosushimoto: "s",

    //eletrecista
    cyberneticosinstalacoes: "s",

    //encanador
    gerson: "s",
    // montador de moveis
    hirancastro: "n",

    //podologa
    vania: "s",

    // taxista
    sereia: "s",
    dorivalmattos: "s",

    // VETERINARIO

    celsogolcalves: "s",
    jurandirmachado: "s",




    // FIMMMM SERVIÇOSSSSSS

    /// INICIO SETOR PUBLICO
    agendamentosaude: "s",
    agendamentodeviagens: "s",
    ambulatoriodohospital: "s",
    asilo: "s",
    agenciatrabalhador: "s",
    copel: "s",
    farmaciamunicipal: "s",
    correio: "s",
    cras: "s",
    clubedexadrez: "s",
    ubsceleiderobles: "s",

    // cheches:
    ainzararossisallescmei: "s",
    isabeldallabdasilvacmeiprofa: "s",
    marinhafogacadeoliveiracmei: "s",

    delegacia: "s",

    // escolas
    beneditorodriguesdecamargo: "s",
    cmeiraymundasantanasalles: "s",
    carolinalupion: "s",
    escolamunicipaljosesalles: "s",
    herciliadepaulaesilva: "s",

    //posto de saude
    ubseugenionevessoares: "s",
    centrodesaudedrjose: "s",

    hospitalsaojose: "s",
    prefeitura: "s",
    duvidasereclamacoes: "s",
    sanepar: "s",
    samuzinho: "s",
    rodoviaria: "s",
    secretariadasaude: "s",
    sindicatorural: "s",
    vigilanciasanitaria: "s",


    /// FIM SETOR PUBLICO

    // INFORMAÇOES

    // INICIO NOTA DE FALECIMENTO
    funerariacristorei: "s",
    funerariagrupocastilho: "s",
    funerariasaovicentedepaulo: "s",
    funerariabomjesus: "s",

    // FIM NOTA DE FALECIMENTO
    // GRUPO WHATS
    carlopolis24hrs: "s",

    // INICIO EVENTOS 
    //calendarioeventos: "s",
    feiradalua: "s",

    lowcity: "n",
    aniversariomclobosdafronteira: "s",
    regisdanese: "s",
    passeiociclisticorotary: "s",
    toroonagashi: "s",
    erosprado: "s",



    /// FIM EVENTOS 


  };

  const body = document.querySelector("body");

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
      counter.textContent = `${swiperInstance.realIndex + 1} / ${swiperInstance.slides.length
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

  const iconesCategorias = {
    "Abertos": "🟢",
    "Lanchonete": "🥪",
    "Restaurante": "🍽️",
    "Pizzaria": "🍕",
    "Padaria": "🍞",
    "Sorveteria": "🍦",
    "Açai": "🥤",

  };

  // ====== GRUPOS WHATSAPP ======
  const gruposWhatsapp = [
    // Edite/adicione aqui:
    { id: "adegacuenca", nome: "Adega Cuenca Carlopolis", descricao: "Acesse e acompanhe nossas novidades e promoções", link: "https://chat.whatsapp.com/GeYROS9KhCOESMJ4n4jm9p", imagem: "images/informacoes/gruposWhats/7.jpg" },
    { id: "amigosdopet", nome: "Amigos do Pet", descricao: "Aqui você encontra apoio para resgates, doações, adoções responsáveis e orientações gerais sobre animais. <br>🚫 Não é um grupo de vendas.", link: " https://chat.whatsapp.com/FtIOQRQzHgw0gFYPnxoodS?mode=ems_wa_t", imagem: "images/informacoes/gruposWhats/5.jpg" },
    { id: "brechoAmigosPet", nome: "Brecho Amigos do Pet", descricao: "Vendas em prol de animais em risco", link: "https://chat.whatsapp.com/DW7AdwoVHIg8WfLaIqhGHa", imagem: "images/informacoes/gruposWhats/9.jpg" },
    { id: "carlopolis24hrs", nome: "Carlópolis 24h", descricao: "Notícias e utilidades da cidade.", link: "https://chat.whatsapp.com/JuvQ7V58aOXBP85fvxXtjl?mode=ems_wa_t", imagem: "images/informacoes/gruposWhats/2.jpg" },
    { id: "descontofacil", nome: "Farmacia Desconto Facil", descricao: "Promoções e Descontos da Desconto Facil", link: "https://chat.whatsapp.com/FuxGPdMc6qU33jLS3C4HRT", imagem: "images/comercios/farmacia/descontoFacil/descontoFacil.jpg" },
    { id: "movepar", nome: "Movepar Promoções", descricao: "Todos os dias promoções imperdíveis para renovar os moveis e eletros da sua casa!", link: "https://chat.whatsapp.com/L2hNB5RAoRhAAoWx2XrRUw?mode=ems_wa_t", imagem: "images/informacoes/gruposWhats/8.jpg" },
    { id: "noticiasclps", nome: "Noticias CLPS & REGIÃO", descricao: "Notícias e utilidades da cidade.", link: "https://chat.whatsapp.com/FpIvEbPjLrxHqwtcCnVp3G?mode=ems_wa_t", imagem: "images/informacoes/gruposWhats/1.jpg" },
    { id: "oficinadeXadrez", nome: "Oficina Xadrez Carlopolis", descricao: "A Oficina de Xadrez tem como objetivo ensinar fundamentos, estimular o raciocínio lógico e desenvolver habilidades estratégicas por meio da prática do jogo", link: "https://chat.whatsapp.com/HAJ1N5n0BlK2IM3J8CUbpz?mode=ems_copy_t", imagem: "images/informacoes/gruposWhats/4.jpg" },

    { id: "lojaThiagoAgueraRifa", nome: "Loja Thiago Aguera - Rifa", descricao: "Grupo exclusivo para as rifas do Thiago Aguera.<br>Venda de materiais de pesca em até 12x no cartão.", link: "https://chat.whatsapp.com/EOXDZReaRDYLY3OOXmUYIt", imagem: "images/informacoes/gruposWhats/11.jpg" },
    // { id: "lojaThiagoAgueraOfertas", nome: "Loja Thiago Aguera - Ofertas", descricao: "Grupo exclusivo para as rifas do Thiago Aguera.<br>Venda de materiais de pesca em até 12x no cartão.", link: "https://tr.ee/EylHAMYMbS", imagem: "images/informacoes/gruposWhats/11.jpg"},



    { id: "seiza", nome: "Seiza Produtos Orientais", descricao: "Receba Novidades, Promoções e tambem informativos da loja.", link: "https://chat.whatsapp.com/CFr4ebifZzgE6fFu4CXb6F?mode=ems_copy_t", imagem: "images/informacoes/gruposWhats/6.jpg" },
    { id: "vagasEmprego1", nome: "Vagas de Empregos 1", descricao: "Acompanhe as vagas de empregos pelo grupo.", link: "https://chat.whatsapp.com/EKbKwH3hnbHF85tUC2Nb8Q?mode=ems_copy_t", imagem: "images/informacoes/gruposWhats/10.jpg" },


  ];

  function slug(s) {
    return String(s || "")
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  }

  function cardGrupoHTML(g) {
    const id = g.id || slug(g.nome);
    const foto = g.imagem || "img/grupos/default.jpg"; // fallback opcional
    return `
    <div class="grupo-card" data-id="${id}">
      <div class="grupo-head">
        <div class="grupo-icon">
          <img src="${foto}" alt="Imagem do grupo ${g.nome}" class="grupo-img" loading="lazy">
        </div>
        <div class="grupo-txt">
          <div class="grupo-title">${g.nome}</div>
          ${g.descricao ? `<div class="grupo-desc">${g.descricao}</div>` : ""}
        </div>
      </div>
      <div class="grupo-actions">
        <a class="btn-grupo" target="_blank" rel="noopener noreferrer"
           href="${g.link}"
           data-id="${id}">
          Entrar no grupo
        </a>
      </div>
    </div>
  `;
  }


  function montarListaGrupos(lista) {
    const wrap = document.getElementById("gruposLista");
    if (!wrap) return;
    if (!lista?.length) {
      wrap.innerHTML = `<div class="grupos-empty">Nenhum grupo encontrado.</div>`;
      return;
    }
    wrap.innerHTML = lista.map(cardGrupoHTML).join("");

    // Clique -> registra e abre
    wrap.querySelectorAll(".btn-grupo").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        // registra clique (não bloqueia navegação)
        if (typeof registrarCliqueBotao === "function") {
          registrarCliqueBotao("grupoWhatsapp", id);
        }
      });
    });
  }

  function filtrarGrupos(term) {
    const t = (term || "").trim().toLowerCase();
    if (!t) return gruposWhatsapp;
    return gruposWhatsapp.filter(g =>
      String(g.nome).toLowerCase().includes(t) ||
      String(g.descricao || "").toLowerCase().includes(t)
    );
  }

  function mostrarGruposWhatsApp() {
    if (location.hash !== "#grupos") location.hash = "#grupos";

    const html = `
    <div class="page-header" data-share-hash="#grupos">
  <h2>🤝 Grupos de WhatsApp</h2>
  <i class="fa-solid fa-share-nodes share-btn"  onclick="compartilharPagina('#grupos','Grupos de WhatsApp','Encontre e entre nos grupos de Carlópolis')"></i>


  </div>

    <div class="grupos-wrap">
      <div class="grupos-top">
        <input id="buscaGrupos" class="grupos-search" placeholder="Pesquisar grupos por nome..." autocomplete="off" />
      </div>
      <div class="grupos-note"><b>⚠️ Respeite as regras de cada grupo.<Br>⚠️ Links são de responsabilidade dos administradores.</b></div>
      <div id="gruposLista" class="grupos-list"></div>
      
    </div>
  `;

    const area = document.querySelector(".content_area");
    area.innerHTML = html;

    const input = document.getElementById("buscaGrupos");
    montarListaGrupos(gruposWhatsapp);

    input.addEventListener("input", () => {
      montarListaGrupos(filtrarGrupos(input.value));
    });
  }

  // ativar pelo menu
  document.addEventListener("click", (e) => {
    const a = e.target.closest("#menuGruposWhats");
    if (a) {
      e.preventDefault();
      mostrarGruposWhatsApp();
    }
  });





  ///
  /// mostrar jogos

  function mostrarJogos() {
    if (location.hash !== "#jogos") location.hash = "#jogos"; // garante URL compartilhável
    const html = `
    <div class="page-header">
  <h2>🎮 Jogos</h2>
  <i class="fa-solid fa-share-nodes share-btn"  onclick="compartilharPagina('#jogos','Jogos','Venha jogar no Olá Carlópolis!')"></i>
</div>

<div class="games-message">🎉 Divirta-se nesta sessão!</div>

      

      <div class="games-list">
       

        <!-- Jogo 2: Capivarinha -->
        <div class="game-item">
          <div class="game-icon"><i class="fa-solid fa-water" style="color:#0ea5e9"></i></div>
          <div class="game-body">
            <div class="game-title">Capivarinha</div>
            <div class="game-desc">Entre na represa, desvie dos objetos e acumule pontos. E confira o Ranking</div>
          </div>
          <div class="game-actions">
            <button class="btn-play" id="playCanos">Jogar</button>
          </div>
        </div>




           <!-- Jogo 1: Tetrix 
        <div class="game-item">
            <div class="game-icon"><i class="fa-solid fa-puzzle-piece" style="color:#6a5acd"></i></div>
            <div class="game-body">
               <div class="game-title">Tetrix</div>
               <div class="game-desc">Tetris clássico com placar, níveis e controles mobile.</div>
            </div>



          <div class="game-actions">
            <button class="btn-play" id="playTetrix">Jogar</button>
          </div>
        </div>

-->


      </div>
    </div>
  `;

    const barra = document.getElementById("barraInstalacao");
    if (barra) barra.style.display = "none";
    const iosBox = document.getElementById("iosInstallBox");
    if (iosBox) iosBox.classList.add("hidden");
    const iosModal = document.getElementById("iosInstallPrompt");
    if (iosModal) iosModal.classList.add("hidden");


    const area = document.querySelector(".content_area");
    area.innerHTML = html;

    const t = document.getElementById("playTetrix");
    if (t) t.addEventListener("click", (e) => {
      e.preventDefault();
      location.hash = "tetrix";
      mostrarTetrix();
    });

    const c = document.getElementById("playCanos");
    if (c) c.addEventListener("click", (e) => {
      e.preventDefault();
      location.hash = "canos";
      mostrarCanos();
    });
  }





  function mostrarTetrix() {
    document.querySelector(".content_area").innerHTML = `
    <div class="game-wrap">
      <div class="game-header">
        
        <h2 >🧩 Tetrix</h2>
        <div class="tetrix-info">Pontos: <span id="t-score">0</span> • Linhas: <span id="t-lines">0</span> • Nível: <span id="t-level">1</span></div>
        <button class="fechar-menu" onclick="location.hash='jogos'; mostrarJogos()">Voltar</button>
      </div>

     <div class="canvas-box">
  <canvas id="tetrixCanvas" width="350" height="512" aria-label="Tetrix"></canvas>
  <div class="game-hint" id="tetrixHint">
    👆 Toque rápido = girar • ✋ Segurar = queda rápida • ↔️ Arrastar = mover
  </div>
</div>


      <div class="tetrix-actions" style="display:flex;gap:8px;justify-content:center">
        <button id="t-restart" class="tbtn" style="padding:8px 12px;border:0;border-radius:10px;background:#16a34a;color:#fff;font-weight:700">Reiniciar</button>
      </div>

      <!-- NOVO: controles mobile -->
      <div class="tetrix-keys">

  <!-- NOVO: segure para descer continuamente -->
 
</div>

     
    </div>
  `;

    // ===== Canvas 288x512 (mesmo esquema do Capivarinha) =====
    const cvs = document.getElementById("tetrixCanvas");
    const ctx = cvs.getContext("2d");


    // esconde a dica após 3.5s ou no primeiro toque
    const hint = document.getElementById("tetrixHint");
    const sumir = () => hint && hint.classList.add("hidden");
    setTimeout(sumir, 3500);
    cvs.addEventListener("pointerdown", sumir, { once: true });

    (function scaleForDPR() {
      const dpr = window.devicePixelRatio || 1;
      const w = cvs.width, h = cvs.height; // 288x512
      cvs.width = Math.round(w * dpr);
      cvs.height = Math.round(h * dpr);
      cvs.style.width = w + "px";
      cvs.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    })();


    // responsivo: reduz o canvas no browser conforme a largura disponível
    (function ajustarCanvasCSS() {
      const box = document.querySelector(".canvas-box");
      if (!box) return;

      function setSize() {
        // espaço máximo e mínimo para o canvas (desktop fica mais enxuto)
        const maxW = Math.min(360, box.clientWidth - 8);
        const target = Math.max(260, maxW);     // clamp
        const ratio = 512 / 350;                // mesmo aspecto do jogo

        cvs.style.width = target + "px";
        cvs.style.height = Math.round(target * ratio) + "px";
      }

      setSize();
      window.addEventListener("resize", setSize);
    })();


    const W = 350, H = 512;
    const COLS = 10, ROWS = 20;

    // campo 10x20 centralizado dentro de 288x512
    const SIZE = Math.floor(Math.min(W / COLS, H / ROWS));
    const OFFSET_X = Math.floor((W - (SIZE * COLS)) / 2);
    const OFFSET_Y = Math.floor((H - (SIZE * ROWS)) / 2);

    const board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    const colors = ["#000", "#00f0f0", "#0000f0", "#f0a000", "#f0f000", "#00f000", "#a000f0", "#f00000"];
    const SHAPES = {
      I: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
      J: [[2, 0, 0], [2, 2, 2], [0, 0, 0]],
      L: [[0, 0, 3], [3, 3, 3], [0, 0, 0]],
      O: [[4, 4], [4, 4]],
      S: [[0, 5, 5], [5, 5, 0], [0, 0, 0]],
      T: [[0, 6, 0], [6, 6, 6], [0, 0, 0]],
      Z: [[7, 7, 0], [0, 7, 7], [0, 0, 0]]
    };
    const TYPES = Object.keys(SHAPES);



    // ===== Gestos no canvas: arrastar move, toque curto gira =====
    // ===== Gestos no canvas: arrastar move, toque curto gira, segurar = queda rápida =====
    (() => {
      const rectOf = () => cvs.getBoundingClientRect();

      const gesture = {
        active: false,
        startX: 0,
        lastStepX: 0,
        moved: false,
        t0: 0
      };

      const STEP_PX = Math.max(10, Math.floor(SIZE * 0.6)); // deslocamento p/ 1 passo lateral
      const LONG_PRESS_MS = 300;  // tempo para acionar queda rápida
      const FAST_INTERVAL_MS = 30;

      let longTO = null;   // timeout para começar a queda rápida
      let fastTimer = null;// interval enquanto segurando
      let fastActive = false;

      const startFast = () => {
        if (fastActive) return;
        fastActive = true;
        fastTimer = setInterval(() => { move(0, 1); }, FAST_INTERVAL_MS);
      };
      const stopFast = () => {
        fastActive = false;
        if (fastTimer) { clearInterval(fastTimer); fastTimer = null; }
      };
      const clearLong = () => { if (longTO) { clearTimeout(longTO); longTO = null; } };

      const toCanvasX = (clientX) => clientX - rectOf().left;

      function onDown(e) {
        e.preventDefault();
        const clientX = (e.touches ? e.touches[0].clientX : e.clientX);
        const x = toCanvasX(clientX);

        gesture.active = true;
        gesture.startX = x;
        gesture.lastStepX = x;
        gesture.moved = false;
        gesture.t0 = performance.now();

        // programa long-press (queda rápida)
        clearLong();
        stopFast();
        longTO = setTimeout(startFast, LONG_PRESS_MS);

        if (cvs.setPointerCapture && e.pointerId !== undefined) {
          cvs.setPointerCapture(e.pointerId);
        }
      }

      function onMove(e) {
        if (!gesture.active) return;
        const clientX = (e.touches ? e.touches[0].clientX : e.clientX);
        const x = toCanvasX(clientX);

        const dx = x - gesture.lastStepX;

        // Se começou a arrastar lateral, cancela o long-press (para não ativar queda)
        if (!gesture.moved && Math.abs(x - gesture.startX) > 12) {
          clearLong();
        }

        if (Math.abs(dx) >= STEP_PX) {
          const steps = Math.trunc(dx / STEP_PX);
          const dir = Math.sign(steps);
          const times = Math.abs(steps);
          for (let i = 0; i < times; i++) move(dir, 0);
          gesture.lastStepX += steps * STEP_PX;
          gesture.moved = true;
        }
      }

      function onUp(e) {
        if (!gesture.active) return;
        e.preventDefault();

        const elapsed = performance.now() - gesture.t0;

        // Se não arrastou, não acionou fast e foi um toque curto -> gira
        if (!gesture.moved && !fastActive && elapsed < 250) {
          rotateTry();
        }

        // encerra estados do gesto
        gesture.active = false;
        clearLong();
        stopFast();

        if (cvs.releasePointerCapture && e.pointerId !== undefined) {
          try { cvs.releasePointerCapture(e.pointerId); } catch { }
        }
      }

      if ("onpointerdown" in window) {
        cvs.addEventListener("pointerdown", onDown, { passive: false });
        cvs.addEventListener("pointermove", onMove, { passive: false });
        cvs.addEventListener("pointerup", onUp, { passive: false });
        cvs.addEventListener("pointercancel", onUp, { passive: false });
      } else {
        cvs.addEventListener("touchstart", onDown, { passive: false });
        cvs.addEventListener("touchmove", onMove, { passive: false });
        cvs.addEventListener("touchend", onUp, { passive: false });
        cvs.addEventListener("mousedown", onDown);
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
      }
    })();



    let grid, px, py, running = true;
    let score = 0, lines = 0, level = 1, drop = 800, last = 0, acc = 0;

    function newPiece() {
      const t = TYPES[(Math.random() * TYPES.length) | 0];
      grid = SHAPES[t].map(r => r.slice());
      px = ((COLS / 2) | 0) - ((grid[0].length / 2) | 0);
      py = 0;
      if (collide(px, py, grid)) { running = false; draw(); }
    }
    function rotate(m) {
      const N = m.length, r = Array.from({ length: N }, () => Array(N).fill(0));
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) r[x][N - 1 - y] = m[y][x];
      return r;
    }
    function collide(nx, ny, m) {
      for (let y = 0; y < m.length; y++) for (let x = 0; x < m[y].length; x++) {
        if (!m[y][x]) continue;
        const X = nx + x, Y = ny + y;
        if (X < 0 || X >= COLS || Y >= ROWS) return true;
        if (Y >= 0 && board[Y][X]) return true;
      }
      return false;
    }
    function merge() {
      for (let y = 0; y < grid.length; y++)
        for (let x = 0; x < grid[y].length; x++)
          if (grid[y][x] && py + y >= 0) board[py + y][px + x] = grid[y][x];
      let c = 0;
      outer: for (let y = ROWS - 1; y >= 0; y--) {
        for (let x = 0; x < COLS; x++) if (!board[y][x]) continue outer;
        board.splice(y, 1); board.unshift(Array(COLS).fill(0));
        c++; y++;
      }
      if (c) {
        lines += c;
        score += [0, 40, 100, 300, 1200][c] * level;
        if (lines >= level * 10 && level < 20) { level++; drop = Math.max(100, drop - 60); }
        hud();
      }
    }
    function move(dx, dy) {
      if (!running) return false;
      const nx = px + dx, ny = py + dy;
      if (!collide(nx, ny, grid)) { px = nx; py = ny; return true; }
      return false;
    }
    function rotateTry() {
      const r = rotate(grid);
      if (!collide(px, py, r)) { grid = r; return; }
      if (!collide(px - 1, py, r)) { px--; grid = r; return; }
      if (!collide(px + 1, py, r)) { px++; grid = r; return; }
    }
    function hardDrop() { while (!collide(px, py + 1, grid)) py++; step(); }
    function step() { merge(); newPiece(); }

    function drawCell(x, y, v) {
      ctx.fillStyle = colors[v];
      ctx.fillRect(OFFSET_X + x * SIZE, OFFSET_Y + y * SIZE, SIZE - 1, SIZE - 1);
    }
    function draw() {
      ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = "#222"; ctx.lineWidth = 2;
      ctx.strokeRect(OFFSET_X - 2, OFFSET_Y - 2, SIZE * COLS + 4, SIZE * ROWS + 4);
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) drawCell(x, y, board[y][x]);
      if (running) {
        for (let y = 0; y < grid.length; y++)
          for (let x = 0; x < grid[y].length; x++) {
            const v = grid[y][x]; if (!v) continue;
            const Y = py + y, X = px + x; if (Y >= 0) drawCell(X, Y, v);
          }
      } else {
        ctx.fillStyle = "#fff"; ctx.font = "bold 20px Poppins,Arial";
        ctx.fillText("GAME OVER", 84, 250);
        ctx.font = "14px Poppins,Arial"; ctx.fillText("Toque em Reiniciar", 86, 278);
      }
    }
    function hud() {
      document.getElementById("t-score").textContent = score;
      document.getElementById("t-lines").textContent = lines;
      document.getElementById("t-level").textContent = level;
    }
    function loop(t = 0) {
      if (!running) return draw();
      const dt = t - last; last = t; acc += dt;
      if (acc >= drop) { acc = 0; if (!move(0, 1)) step(); }
      draw(); requestAnimationFrame(loop);
    }





    // Teclado (desktop)
    addEventListener("keydown", e => {
      if (!running) return;
      if (e.key === "ArrowLeft") move(-1, 0);
      else if (e.key === "ArrowRight") move(1, 0);
      else if (e.key === "ArrowDown") move(0, 1);
      else if (e.key === "ArrowUp") rotateTry();
      else if (e.code === "Space") hardDrop();
    });

    // Botões mobile (NOVO)
    const onTap = (id, fn) => {
      const el = document.getElementById(id);
      if (!el) return;
      const handler = (e) => { e.preventDefault(); fn(); };
      el.addEventListener("click", handler);
      el.addEventListener("touchstart", handler, { passive: false });
    };
    onTap("t-left", () => move(-1, 0));
    onTap("t-right", () => move(1, 0));
    onTap("t-down", () => move(0, 1));
    onTap("t-rot", () => rotateTry());
    onTap("t-drop", () => hardDrop());


    // Descer continuamente enquanto o botão estiver pressionado
    (function setupFastHold() {
      const fastBtn = document.getElementById("t-fast");


      if (fastBtn) {
        // bloqueia seleção, clique padrão e menu de contexto
        ["selectstart", "contextmenu"].forEach(ev =>
          fastBtn.addEventListener(ev, e => e.preventDefault())
        );

        // já deve existir algo assim para acelerar; garanta preventDefault/stopPropagation:
        fastBtn.addEventListener("mousedown", (e) => { e.preventDefault(); e.stopPropagation(); /* startFast() */ });
        fastBtn.addEventListener("touchstart", (e) => { e.preventDefault(); e.stopPropagation(); /* startFast() */ }, { passive: false });
      }

      if (!fastBtn) return;

      let fastTimer = null;

      const startFast = () => {
        if (!running || fastTimer) return;
        // desce suavemente a cada 30ms
        fastTimer = setInterval(() => { move(0, 1); }, 30);
      };
      const stopFast = () => {
        if (fastTimer) {
          clearInterval(fastTimer);
          fastTimer = null;
        }
      };

      // mouse
      fastBtn.addEventListener("mousedown", (e) => { e.preventDefault(); startFast(); });
      window.addEventListener("mouseup", stopFast);
      fastBtn.addEventListener("mouseleave", stopFast);

      // touch
      fastBtn.addEventListener("touchstart", (e) => { e.preventDefault(); startFast(); }, { passive: false });
      window.addEventListener("touchend", stopFast);
      window.addEventListener("touchcancel", stopFast);
    })();


    document.getElementById("t-restart").onclick = () => {
      for (let y = 0; y < ROWS; y++) board[y].fill(0);
      score = 0; lines = 0; level = 1; drop = 800; running = true; hud(); newPiece(); last = 0; acc = 0;
      requestAnimationFrame(loop);
    };

    // Start
    hud(); newPiece(); draw(); requestAnimationFrame(loop);
  }





  //// flayyoo canos


  // ======== CAPIVARINHA (rio serpenteando) — FUNÇÃO ÚNICA, LIMPA ========
  function mostrarCanos() {
    const html = `
    <div class="game-wrap">
      <div class="game-header">
        <h2>Capivarinha</h2>
        <div class="flappy-ui">
          <div class="scorebox">Pontos: <span id="f-score">0</span></div>
          <div class="scorebox">Recorde: <span id="f-best">0</span></div>
          
        </div>
      </div>

      <canvas id="flappyCanvas" width="350" height="512" aria-label="Capivarinha"></canvas>

      <div class="flappy-buttons">
      <button id="f-voltar" class="fechar-menu" onclick="location.hash='jogos'; mostrarJogos()">Voltar</button>
        
        <button id="f-restart">Reiniciar</button>
        <button id="f-ranking" class="btn-rank">🏆 Ranking</button>
        <button id="f-jump">Pular</button>
        
        
      </div>
    </div>
    `;
    document.querySelector(".content_area").innerHTML = html;

    // ===== Plaquinha comemorativa (aparece ao bater 50 pts) =====
    //  let olacShown = false;       // garante que só aparece uma vez


    // ===== Plaquinhas olacarlopolis =====
    const SIGN_FIRST = 5;   // valor inicial para aparecer
    const SIGN_STEP = 50;   // repete a cada 50




    // Canvas com DPR
    const cvs = document.getElementById("flappyCanvas");
    const ctx = cvs.getContext("2d");
    (function scaleForDPR() {
      const dpr = window.devicePixelRatio || 1;
      const w = cvs.width, h = cvs.height;
      cvs.width = Math.round(w * dpr);
      cvs.height = Math.round(h * dpr);
      cvs.style.width = w + "px";
      cvs.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    })();

    const W = 350, H = 512;

    // Capivara (inicia na grama)
    //const capy = { x: 28, y: H - 40, r: 12, vy: 0, gravity: 0.35, jump: -6.0 };
    const capy = { x: 28, y: H - 40, r: 12, vy: 0, gravity: 0.35, jump: -6.0, lookRight: true };

    // ===== Rio serpenteando =====
    const RIVER_STEP = 8;

    // Agora mais largo por padrão:
    const GAP0 = 300;          // era 120
    const GAP_MIN = 180;       // era 80 (mantém um mínimo confortável)
    const BOAT_GAP = 220;      // largura alvo quando há barco na tela

    // Velocidade do “mundo”
    const SPEED0 = 2.0, SPEED_MAX = 5.0;



    let gap = GAP0, speed = SPEED0, phase = 0;
    let timeSinceStart = 0, distForScore = 0;
    const SCORE_EVERY = 120;

    // === Velocidade do rio em km/h (de-para) ===
    const KMH_START = 0;   // km/h quando speed = SPEED0
    const KMH_MAX = 50;  // km/h quando speed = SPEED_MAX
    function kmhFromSpeed(v) {
      const t = Math.max(0, Math.min(1, (v - SPEED0) / (SPEED_MAX - SPEED0)));
      return Math.round(KMH_START + t * (KMH_MAX - KMH_START));
    }


    // Meandros do rio
    const amp1 = 70, freq1 = 0.010;
    const amp2 = 28, freq2 = 0.022;

    const riverCenterAt = (x) => H * 0.5
      + Math.sin((x + phase) * freq1) * amp1
      + Math.sin((x * 0.5 + phase * 1.3) * freq2) * amp2;
    const riverTopAt = (x) => riverCenterAt(x) - gap / 2;
    const riverBottomAt = (x) => riverCenterAt(x) + gap / 2;

    // ===== Barcos ocasionais =====
    const boats = [];
    const BOAT_W = 36, BOAT_H = 14;
    const BOAT_EXTRA_SPEED = 0.9;        // barco “vem” mais rápido que o rio
    let nextBoatIn = 3000 + Math.random() * 5000; // 3–8s para o primeiro


    // ===== Capivara no rio (extra) =====
    let riverCapy = null;
    let nextRiverCapyIn = 4000 + Math.random() * 7000;  // 4–11s para a primeira
    const RIVERCAPY_R = 10;            // raio para desenhar/colisão se quiser
    const RIVERCAPY_EXTRA_SPEED = 0.6; // um pouco mais “rápida” que o rio

    // ===== Plaquinhas olacarlopolis =====
    let nextSignAt = 50;      // primeira meta de pontos
    const signs = [];         // lista de plaquinhas na tela



    // ===== Peixes no rio =====
    let fishes = [];
    let nextFishIn = 3000 + Math.random() * 5000; // de 3 a 8s para spawn

    function spawnFish() {
      const x = W + 20;
      const y = riverCenterAt(x) + (Math.random() * 20 - 10); // um pouco acima/abaixo do centro
      fishes.push({
        x, y,
        r: 6 + Math.random() * 4, // tamanho aleatório
        speed: speed + 1 + Math.random() * 0.5,
        dir: Math.random() < 0.5 ? 1 : -1, // peixe pode virar para cima/baixo
        bob: 0
      });
    }

    function drawFish(f) {
      ctx.save();
      ctx.translate(f.x, f.y);

      // usa o score do Capivarinha (variável local do jogo)
      const sc = score;




      // define a cor conforme a faixa de pontos
      let fishColor = "#56da2e"; // verde
      if (sc >= 150) {
        fishColor = "#ffffffff";   // vermelho
      } else if (sc >= 100) {
        fishColor = "#ff1d1dff";   // amarelo
      } else if (sc >= 50) {
        fishColor = "#fcfc27ff";   // azul
      }

      // define a cor conforme a faixa de pontos
      let fishColorA = "#000000ff"; // verde
      if (sc >= 150) {
        fishColorA = "#3444f2ff";   // vermelho
      } else if (sc >= 100) {
        fishColorA = "#ffffffff";   // amarelo
      } else if (sc >= 50) {
        fishColorA = "#fc2727ff";   // azul
      }



      // corpo
      ctx.fillStyle = fishColor;
      ctx.beginPath();
      ctx.ellipse(0, 0, f.r * 1.6, f.r, 0, 0, Math.PI * 2);
      ctx.fill();

      // cauda (mesma cor)
      ctx.fillStyle = fishColorA;
      ctx.beginPath();
      ctx.moveTo(-f.r * 1.6, 0);
      ctx.lineTo(-f.r * 2.2, f.r * 0.8);
      ctx.lineTo(-f.r * 2.2, -f.r * 0.8);
      ctx.closePath();
      ctx.fill();

      // olho
      ctx.fillStyle = "#000";
      ctx.beginPath();
      ctx.arc(f.r * 0.8, -f.r * 0.3, 1.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    function spawnOlacSign() {
      const x = W + 30;                 // nasce fora da tela
      const sideTop = Math.random() < 0.5; // escolhe margem
      const yRiver = riverCenterAt(x);
      const gapHalf = gap / 2;
      const y = sideTop ? (yRiver - gapHalf - 12) : (yRiver + gapHalf + 12);

      signs.push({ x, y, sideTop, wobble: 0 });
    }

    function drawOlacSign(s) {
      ctx.save();
      ctx.translate(s.x, s.y);

      // balanço
      s.wobble += 0.06;
      ctx.rotate(Math.sin(s.wobble) * 0.06);

      // poste
      ctx.fillStyle = "#7a5d3a";
      ctx.fillRect(-2, -22, 4, 24);

      // placa
      const PW = 84, PH = 22;
      ctx.fillStyle = "#fff8d6";
      ctx.strokeStyle = "#b39b6a";
      ctx.lineWidth = 2;
      ctx.fillRect(-PW / 2, -22 - PH, PW, PH);
      ctx.strokeRect(-PW / 2, -22 - PH, PW, PH);

      // texto
      ctx.fillStyle = "#1f2937";
      ctx.font = "bold 12px Poppins,Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("olacarlopolis", 0, -22 - PH / 2);

      ctx.restore();
    }




    function spawnRiverCapy() {
      // nasce à direita, no centro do rio naquele x
      const x = W + 20;
      const y = riverCenterAt(x);
      riverCapy = {
        x, y, r: RIVERCAPY_R, alive: true,
        bob: 0, bobAmp: 2 + Math.random() * 2 // balancinho na água
      };
    }

    function drawRiverCapy(rc) {
      // corpo simples (marrom) + focinho
      ctx.fillStyle = "#7a5d3a";
      ctx.beginPath();
      ctx.ellipse(rc.x, rc.y, rc.r + 6, rc.r, 0, 0, Math.PI * 2);
      ctx.fill();

      // cabecinha
      ctx.beginPath();
      ctx.arc(rc.x + rc.r, rc.y - 2, rc.r * 0.7, 0, Math.PI * 2);
      ctx.fill();

      // orelhinhas
      ctx.fillRect(rc.x + rc.r + 3, rc.y - 8, 2, 4);
      ctx.fillRect(rc.x + rc.r + 1, rc.y - 8, 2, 4);

      // olho
      ctx.fillStyle = "#000";
      ctx.beginPath();
      ctx.arc(rc.x + rc.r + 3, rc.y - 3, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }


    function spawnBoat() {
      // nasce à direita, no centro do rio naquele x
      const x = W + BOAT_W + 10;
      const y = riverCenterAt(x);
      boats.push({
        x, y,
        w: 48, h: 24,       // ajuste se quiser maior/menor
        bob: Math.random() * Math.PI * 2,
        bobAmp: 0.8 + Math.random() * 0.6 // amplitude do “balanço”
      });
    }

    function circleRectCollide(cx, cy, cr, r) {
      const nx = Math.max(r.x, Math.min(cx, r.x + r.w));
      const ny = Math.max(r.y, Math.min(cy, r.y + r.h));
      const dx = cx - nx, dy = cy - ny;
      return dx * dx + dy * dy <= cr * cr;
    }

    // HUD
    let score = 0;
    const BEST_KEY = "capivarinha_best";
    let best = +(localStorage.getItem(BEST_KEY) || 0);
    const updateHUD = () => {
      document.getElementById("f-score").textContent = score;
      document.getElementById("f-best").textContent = best;
    };
    updateHUD();

    // Estado geral
    let running = true, started = false, last = 0, rafId = null;
    const GRACE_MS = 300;

    // Mensagens de fim de jogo
    let deathMsg = "";
    const MSGS = {
      peixe: "A Capivarinha parou pra comer o peixe",
      capivara: "A Capivarinha parou pra conversar",
      default: "A Capivarinha saiu da represa",
      barco: "A Capivarinha bateu no barco",
    };


    function snapIntoRiver() {
      const x = 50; // posição de jogo
      const top = riverTopAt(x), bot = riverBottomAt(x);
      const center = (top + bot) / 2;
      capy.x = x;
      capy.y = Math.max(top + capy.r + 1, Math.min(center, bot - capy.r - 1));
    }

    const reset = () => {
      phase = 0; speed = SPEED0;

      // reabre o rio no início
      gap = GAP0;

      // zera relógios/placar e reprograma spawns
      timeSinceStart = 0; distForScore = 0;
      boats.length = 0; nextBoatIn = 3000 + Math.random() * 5000;

      // NOVO: limpar peixes e capivara do rio e reagendar
      fishes.length = 0;
      riverCapy = null;
      nextFishIn = 3000 + Math.random() * 5000;
      nextRiverCapyIn = 4000 + Math.random() * 7000;

      // NOVO: limpar mensagem de morte
      deathMsg = "";

      started = false; running = true; last = 0;
      capy.x = 28; capy.y = H - 40; capy.vy = 0;
      capy.lookRight = true; // garante início olhando para a direita
      score = 0; updateHUD(); draw();
    };


    const jump = () => {
      if (!running) return;
      // vira a cabeça a cada pulo
      capy.lookRight = !capy.lookRight;
      if (!started) {
        snapIntoRiver();
        capy.vy = capy.jump;
        started = true;
        timeSinceStart = 0;
        return;
      }
      capy.vy = capy.jump;
    };

    // Controles
    document.getElementById("f-jump").onclick = jump;
    document.getElementById("f-restart").onclick = () => {
      if (rafId) cancelAnimationFrame(rafId);
      reset();
      rafId = requestAnimationFrame(loop);
    };
    window.addEventListener("keydown", (e) => {
      if (e.code === "Space" || e.key === "ArrowUp") { e.preventDefault(); jump(); }
    }, { passive: false });
    // Antes estava: cvs.addEventListener("pointerdown", jump);
    cvs.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      if (!running) {
        // vira também no toque que reinicia (opcional)
        capy.lookRight = !capy.lookRight;
        // se o jogo estiver parado (game over), um toque reinicia
        if (rafId) cancelAnimationFrame(rafId);
        reset();
        rafId = requestAnimationFrame(loop);
        return;
      }
      // se estiver rodando, mantém o comportamento de pular
      jump();
    });


    const gameOver = (reason = "default") => {
      deathMsg = MSGS[reason] || MSGS.default;
      running = false;
      salvarScoreCapivarinha(score); // <<< salva no Firebase pedindo o nome
      draw();
    };


    function update(dt) {
      if (!running) return;

      // o rio “vive” mesmo antes de começar


      if (started) {
        timeSinceStart += dt;
        const t = timeSinceStart / 1000;
        phase += speed * 0.6;

        // velocidade/dificuldade
        speed = Math.min(SPEED_MAX, SPEED0 + t * 0.12);




        // alvo de largura do rio:
        let targetGap = Math.max(GAP_MIN, GAP0 - t * 1.2); // fecha mais devagar (mais largo no geral)
        if (boats.length) targetGap = Math.max(targetGap, BOAT_GAP); // ABRE BEM quando tem barco
        // aproxima suavemente do alvo
        gap += (targetGap - gap) * 0.1;

        // barcos: spawn e movimento
        nextBoatIn -= dt;
        if (nextBoatIn <= 0) {
          spawnBoat();
          nextBoatIn = 5000 + Math.random() * 8000; // novo barco entre 5–13s
        }

        for (let i = boats.length - 1; i >= 0; i--) {
          const b = boats[i];
          // “vem descendo”:
          b.x -= (speed + BOAT_EXTRA_SPEED);
          // acompanha o leito:
          b.y = riverCenterAt(b.x);
          // colisão
          const rect = { x: b.x - b.w / 2, y: b.y - b.h / 2, w: b.w, h: b.h };
          if (circleRectCollide(capy.x, capy.y, capy.r, rect)) gameOver("barco");
          // saiu da tela à esquerda?
          if (b.x + b.w / 2 < -10) boats.splice(i, 1);
        }



        // colisão com PEIXES (capy vs círculo do peixe)
        for (let i = 0; i < fishes.length; i++) {
          const f = fishes[i];
          const dx = capy.x - f.x;
          const dy = capy.y - f.y;
          const rr = (capy.r + f.r) * (capy.r + f.r);
          if (dx * dx + dy * dy <= rr) {
            gameOver("peixe"); // <- aqui!
            break;
          }
        }


        // capivara do rio: spawn e movimento
        nextRiverCapyIn -= dt;
        if (!riverCapy && nextRiverCapyIn <= 0) {
          spawnRiverCapy();
          nextRiverCapyIn = 6000 + Math.random() * 9000; // próximas em 6–15s
        }

        if (riverCapy) {
          // “vem descendo” como o barco: anda para a esquerda
          riverCapy.x -= (speed + RIVERCAPY_EXTRA_SPEED);
          // acompanha o leito do rio e balança um pouquinho
          riverCapy.bob += dt * 0.006;
          riverCapy.y = riverCenterAt(riverCapy.x) + Math.sin(riverCapy.bob) * riverCapy.bobAmp;

          // saiu da tela?
          if (riverCapy.x < -30) riverCapy = null;
        }

        // colisão com a outra capivara no rio
        if (riverCapy) {
          const dxRC = capy.x - riverCapy.x;
          const dyRC = capy.y - riverCapy.y;
          const rrRC = (capy.r + RIVERCAPY_R) * (capy.r + RIVERCAPY_R);
          if (dxRC * dxRC + dyRC * dyRC <= rrRC) {
            gameOver("capivara");
          }
        }

        // === Peixes ===
        nextFishIn -= dt;
        if (nextFishIn <= 0) {
          spawnFish();
          nextFishIn = 4000 + Math.random() * 6000; // próximos em 4 a 10s
        }

        for (let i = fishes.length - 1; i >= 0; i--) {
          const f = fishes[i];
          f.x -= f.speed; // anda para a esquerda
          f.bob += dt * 0.004;
          f.y = riverCenterAt(f.x) + Math.sin(f.bob) * 6 * f.dir;

          if (f.x < -40) fishes.splice(i, 1); // remove quando sai da tela
        }


        // Física da capivara
        capy.vy += capy.gravity;
        capy.y += capy.vy;
        if (capy.y - capy.r < 0) { capy.y = capy.r; capy.vy = 0; }
        if (capy.y + capy.r > H - 20) { capy.y = H - 20 - capy.r; gameOver(); }

        // colisão com as margens (após GRACE)
        if (timeSinceStart > GRACE_MS) {
          const top = riverTopAt(capy.x), bot = riverBottomAt(capy.x);
          if (capy.y - capy.r < top || capy.y + capy.r > bot) gameOver();
        }

        // Pontuação por distância
        distForScore += speed;
        if (distForScore >= SCORE_EVERY) {
          distForScore -= SCORE_EVERY;
          score++;
          if (score > best) { best = score; localStorage.setItem(BEST_KEY, best); }
          updateHUD();
        }

        // Dispara placa sempre que atingir a meta atual (50, 100, 150, ...)
        while (score >= nextSignAt) {
          spawnOlacSign();
          nextSignAt += SIGN_STEP;  // prepara a próxima
        }

        // === Item 3: dispara plaquinha sempre que bater a meta (50, 100, 150...) ===
        if (score >= nextSignAt) {
          spawnOlacSign();   // sua função que cria a plaquinha
          nextSignAt += 50;  // prepara a próxima meta
        }

      }
    }


    function spawnOlacSign() {
      const x = W + 30;                 // nasce fora da tela à direita
      const sideTop = Math.random() < 0.5;  // escolhe margem superior ou inferior
      const yRiver = riverCenterAt(x);
      const gapHalf = gap / 2;

      // posição na margem (um pouco afastado da água)
      const y = sideTop ? (yRiver - gapHalf - 12) : (yRiver + gapHalf + 12);

      signs.push({
        x,
        y,
        sideTop,        // true = margem superior, false = margem inferior
        wobble: 0       // leve balanço
      });
    }

    function drawOlacSign(s) {
      ctx.save();
      ctx.translate(s.x, s.y);

      // Leve balanço para dar vida
      s.wobble += 0.06;
      const tilt = Math.sin(s.wobble) * 0.06; // ~3.5°
      ctx.rotate(tilt * (s.sideTop ? -1 : 1));

      // Poste
      ctx.fillStyle = "#7a5d3a";
      ctx.fillRect(-2, -22, 4, 24);

      // Placa
      const PW = 84, PH = 22;
      ctx.fillStyle = "#fff8d6";
      ctx.strokeStyle = "#b39b6a";
      ctx.lineWidth = 2;
      ctx.fillRect(-PW / 2, -22 - PH, PW, PH);
      ctx.strokeRect(-PW / 2, -22 - PH, PW, PH);

      // Texto
      ctx.fillStyle = "#1f2937";
      ctx.font = "bold 12px Poppins,Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("olacarlopolis", 0, -22 - PH / 2);

      ctx.restore();
    }


    function drawCapivara(x, y, r) {
      const dir = capy.lookRight ? 1 : -1;
      ctx.fillStyle = "#8b5a2b";
      ctx.beginPath(); ctx.ellipse(x, y, r * 1.4, r, 0, 0, Math.PI * 2); ctx.fill();

      ctx.beginPath(); ctx.ellipse(x + r * 1.2, y - r * 0.3, r * 0.8, r * 0.6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + r * 1.4, y - r * 0.3, r * 0.15, 0, Math.PI * 2); ctx.fillStyle = "#000"; ctx.fill();
      ctx.beginPath(); ctx.arc(x + r * 0.8, y - r * 0.9, r * 0.2, 0, Math.PI * 2); ctx.fillStyle = "#5a3820"; ctx.fill();
    }

    function drawBoat(b) {
      ctx.save();
      ctx.translate(b.x, b.y);

      // Casco do barco
      ctx.fillStyle = "#8B4513"; // marrom
      ctx.beginPath();
      ctx.moveTo(-BOAT_W / 2, 0);
      ctx.lineTo(0, BOAT_H);
      ctx.lineTo(BOAT_W / 2, 0);
      ctx.closePath();
      ctx.fill();

      // Detalhe do casco (borda)
      ctx.strokeStyle = "#5C3317";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Vela (opcional, deixa mais visível)
      ctx.fillStyle = "#fefefe";
      ctx.beginPath();
      ctx.moveTo(0, -BOAT_H * 1.5);
      ctx.lineTo(0, 0);
      ctx.lineTo(BOAT_W / 2.5, -BOAT_H * 0.5);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    }




    function draw() {
      // Céu + chão + grama
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "#66ae39ff"; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#c9d09a"; ctx.fillRect(0, H - 20, W, 20);
      ctx.fillStyle = "#66ae39ff"; ctx.fillRect(0, 0, 56, H - 20);

      // Rio (polígono entre top e bottom)
      const topY = (x) => riverTopAt(x), botY = (x) => riverBottomAt(x);
      ctx.beginPath();
      ctx.moveTo(0, topY(0));
      for (let x = 0; x <= W; x += RIVER_STEP) ctx.lineTo(x, topY(x));
      ctx.lineTo(W, topY(W));
      for (let x = W; x >= 0; x -= RIVER_STEP) ctx.lineTo(x, botY(x));
      ctx.closePath();
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, "#46a6d8"); grad.addColorStop(1, "#2e89b8");
      ctx.fillStyle = grad; ctx.fill();


      // === HUD: velocidade do rio (km/h) no canto superior esquerdo ===
      ctx.save();
      ctx.font = "bold 12px Poppins,Arial";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      // contorno para legibilidade
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fillText(`🌊 ${kmhFromSpeed(speed)} km/h`, 9, 9);
      ctx.fillText(`🌊 ${kmhFromSpeed(speed)} km/h`, 8, 9);
      ctx.fillText(`🌊 ${kmhFromSpeed(speed)} km/h`, 9, 8);
      // texto principal
      ctx.fillStyle = "#fff";
      ctx.fillText(`🌊 ${kmhFromSpeed(speed)} km/h`, 8, 8);
      ctx.restore();


      // Barcos (desenha por cima da água)
      // Barcos (por cima da água)

      for (const b of boats) drawBoat(b);

      // Plaquinhas
      for (let i = signs.length - 1; i >= 0; i--) {
        const s = signs[i];
        s.x -= speed;
        drawOlacSign(s);
        if (s.x < -100) signs.splice(i, 1);
      }


      // Capivara no rio (extra)
      if (riverCapy) drawRiverCapy(riverCapy);

      // Peixes
      for (const f of fishes) drawFish(f);

      // Capivara
      drawCapivara(capy.x, capy.y, capy.r);

      // Overlays
      if (!started && running) {
        ctx.fillStyle = "#fff";
        ctx.font = "16px Poppins,Arial";
        ctx.textAlign = "center";              // centraliza no x informado

        const msg = "Toque em Pular\npara entrar na represa\n\nToque na Tela para nadar\n\nDesvie dos obstaculos\n\nNao deixe voltar para as margens";
        drawMultiline(ctx, msg, W / 2, 160, 18); // x, y inicial e altura da linha
      }

      // helper: quebra por \n
      function drawMultiline(ctx, text, x, y, lineHeight = 18) {
        text.split("\n").forEach((line, i) => {
          ctx.fillText(line, x, y + i * lineHeight);
        });
      }

      if (!running) {
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(0, 0, W, H);

        ctx.fillStyle = "#fff";
        ctx.font = "bold 20px Poppins, Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        // quebra mensagem em várias linhas se for grande
        const palavras = (deathMsg || "A capivara saiu do rio").split(" ");
        const linhas = [];
        let atual = "";

        for (let p of palavras) {
          const teste = atual ? atual + " " + p : p;
          if (ctx.measureText(teste).width > W * 0.8) {
            linhas.push(atual);
            atual = p;
          } else {
            atual = teste;
          }
        }
        if (atual) linhas.push(atual);

        const startY = H / 2 - (linhas.length - 1) * 14; // centraliza vertical
        linhas.forEach((linha, i) => {
          ctx.fillText(linha, W / 2, startY + i * 28);
        });

        ctx.font = "14px Poppins, Arial";
        ctx.fillText("Toque na tela para reiniciar", W / 2, H * 0.75);
      }

    }

    function loop(ts) {
      if (!last) last = ts;
      const dt = ts - last; last = ts;
      if (running) { update(dt); draw(); rafId = requestAnimationFrame(loop); }
      else { draw(); }
    }

    // Botões de Ranking
    const btnRank = document.getElementById("f-ranking");
    const btnLink = document.getElementById("f-ranking-link");
    if (btnRank) btnRank.addEventListener("click", () => mostrarRankingCapivarinha());
    if (btnLink) btnLink.addEventListener("click", () => {
      location.hash = "#ranking-capivarinha";
      mostrarRankingCapivarinha();
    });


    // start
    reset();
    // === Item 5: reset das plaquinhas ===
    nextSignAt = SIGN_FIRST;
    signs.length = 0;
    spawnOlacSign();
    rafId = requestAnimationFrame(loop);
  }




  ///
  // mostrar onde comer
  function mostrarOndeComer(filtroCategoria = "Todos") {
    const categoriasComida = [
      "Abertos", "Açai", "Lanchonete", "Padaria", "Pizzaria", "Restaurante", "Sorveteria",
    ];

    // 1. Monta o filtro
    let html = `
  <h2 class="highlighted">🍽️ Onde Comer </h2>
  <div class="filtro-comidas-card">
    <label for="filtroComidas">Filtrar por:</label>
  <select id="filtroComidas">
  <option value="Todos">🍽️ Todos</option>
  ${categoriasComida.map(cat =>
      `<option value="${cat}" ${filtroCategoria === cat ? 'selected' : ''}>${iconesCategorias[cat] || '🍽️'} ${cat}</option>`
    ).join("")}
</select>

  </div>
  <div class="onde-comer-lista">
`;

    // 2. Lista filtrada
    let lista = [];
    categories.forEach(cat => {
      if (categoriasComida.includes(cat.title)) {
        cat.establishments.forEach(est => {
          const nomeNorm = normalizeName(est.name);
          const abertoAgora = est.horarios ? estaAbertoAgora(est.horarios) : false;

          if (
            statusEstabelecimentos[nomeNorm] === "s" &&
            (
              filtroCategoria === "Todos" ||
              (filtroCategoria === "Abertos" && abertoAgora) ||
              (filtroCategoria !== "Abertos" && cat.title === filtroCategoria)
            )
          ) {

            lista.push({
              ...est,
              categoria: cat.title
            });
          }
        });
      }
    });

    lista.sort((a, b) => a.name.localeCompare(b.name));

    // 3. Renderiza cards
    lista.forEach(est => {
      // ...código anterior...
      let statusAberto = '';
      if (est.horarios) {
        const aberto = estaAbertoAgora(est.horarios);
        if (aberto) {
          const fechamento = horarioFechamentoAtual(est.horarios);
          statusAberto = `<span class='status-tag aberto'>ABERTO${fechamento ? ' ATÉ ' + fechamento : ''}</span>`;
        } else {
          const proximo = proximoHorarioDeAbertura(est.horarios);
          statusAberto = `<span class='status-tag fechado'>FECHADO</span> <span class='status-tag proximo'>Abre: ${proximo}</span>`;
        }
      }
      html += `
  <div class="onde-comer-card">
   
  
    <div class="onde-comer-card-esq">

      <img src="${est.image}" alt="${est.name}" class="onde-comer-img imagem-expandivel">
  ${est.novidadesImages && est.novidadesImages.length ? `
   <button class="btn-fotos_onde" onclick="mostrarFotos('${normalizeName(est.name)}')"">
  📷 Fotos
</button>
  ` : ''}

      
    </div>
    <div class="onde-comer-info">
    
      <span class="onde-comer-categoria">${est.categoria}</span> ${est.horarios ? `
   <span class="status-tag_comer ${estaAbertoAgora(est.horarios) ? 'aberto' : 'fechado'}">
  ${estaAbertoAgora(est.horarios)
            ? `ABERTO <div class="ate-hora">até ${horarioFechamentoAtual(est.horarios) || '--:--'}</div>`
            : 'FECHADO'}
</span>` : ""}

    
      <h3>${est.name}</h3>
      
    <span class="onde-comer-endereco endereco-uma-linha" title="${est.address}">
  ${est.address && est.address.trim().toLowerCase() !== "somente delivery"
          ? `<a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(est.address)}" target="_blank">${est.address}</a>`
          : `<span style="color:#ff0000; font-weight:bold">${est.address}</span>`
        }
</span>

   


${(est.cardapioLink || (est.menuImages && est.menuImages.length) || est.contact) ? `
  <div class="botoes-abaixo-nome">
    ${est.cardapioLink ? `
        <button class="btn-cardapio" onclick="registrarCliqueCardapioOndeComer('${normalizeName(est.name)}'); window.open('${est.cardapioLink}', '_blank')">Cardápio</button>
      ` : (est.menuImages && est.menuImages.length ? `
        <button class="btn-cardapio" onclick="registrarCliqueCardapioOndeComer('${normalizeName(est.name)}'); mostrarCardapio('${normalizeName(est.name)}')">Cardápio</button>
      ` : '')
          }
    ${est.contact ? `
      <a href="https://wa.me/55${est.contact.replace(/\D/g, '')}?text=${encodeURIComponent(gerarMensagemWhatsApp())}"
         target="_blank"
         class="btn-whatsapp_onde"
         onclick="registrarCliqueWhatsOndeComer('${normalizeName(est.name)}');">
         
        <i class="fab fa-whatsapp"></i> ${est.contact}
      </a>
    ` : ""}
  </div>
` : ""}



   


    </div>
    
  </div>
`;

    });
    html += `</div>`;
    document.querySelector(".content_area").innerHTML = html;

    // 4. Evento do filtro
    document.getElementById("filtroComidas").addEventListener("change", function () {
      mostrarOndeComer(this.value);
    });





  }

  // ====== JOGOS (lista) ======
  document.getElementById("menuJogos").addEventListener("click", function (e) {
    e.preventDefault();
    location.hash = "jogos";
    mostrarJogos();
  });

  window.addEventListener("DOMContentLoaded", () => {
    const h = (location.hash || "").replace("#", "");
    if (h === "jogos") mostrarJogos();
    else if (h === "tetrix") mostrarTetrix();
    else if (h === "canos") mostrarCanos();
  });
  window.addEventListener("hashchange", () => {
    const h = (location.hash || "").replace("#", "");
    if (h === "jogos") mostrarJogos();
    else if (h === "tetrix") mostrarTetrix();
    else if (h === "canos") mostrarCanos();
  });




  document.getElementById("menuOndeComer").addEventListener("click", function (e) {
    e.preventDefault();
    location.hash = "ondecomer";   // atualiza a URL
    mostrarOndeComer();
  });


  ///
  ///
  ///


  // ============ PROMOÇÕES ============

  // Coleta TODAS as promoções percorrendo categories/establishments
  function coletarTodasPromocoes() {
    const itens = [];
    (categories || []).forEach(cat => {
      (cat.establishments || []).forEach(est => {
        const nomeEst = est.name;
        const idEst = normalizeName(nomeEst);
        const lista = est.promocoes || est.promotions || [];
        lista.forEach(p => {
          itens.push({
            estabelecimento: nomeEst,
            estabelecimentoId: idEst,
            titulo: p.titulo || p.nome || "",
            volume: p.volume || "",             // ex: "350 ml", "600 ml"
            embalagem: p.embalagem || "",       // ex: "caixa c/18", "fardo c/6"
            preco: p.preco,                     // número ou string
            precoAntigo: p.precoAntigo || null, // opcional
            unidade: p.unidade || "",           // ex: "A UNIDADE", "NO FARDO"
            imagem: p.imagem || p.image || "",  // url opcional
            validadeInicio: p.validadeInicio || p.validade || null,
            validadeFim: p.validadeFim || null,
            obs: p.obs || "",                    // qualquer extra
            contact: getPrimeiroContato(est.contact) || ""
          });
        });
      });
    });
    return itens;
  }

  function boolStr(v) { return v ? "Sim" : "Não"; }
  function m2(v) { return v ? `${v} m²` : "-"; }

  function nomeResponsavel(im) {
    if (im.corretor) return String(im.corretor);
    if (Array.isArray(im.corretores) && im.corretores.length) return String(im.corretores[0]);
    return "";
  }



  // ---------- IMÓVEIS 2.0 ---------- CADASTRO IMOVEIS
  const IM_DADOS = [
    // Substitua depois por dados do Firebase
    {
      id: "imv1",
      tipo: "venda",
      status: "disponível",
      titulo: "Casa ampla no Centro",
      endereco: "Rua Paraná, 250 - Centro",
      lat: -23.3953,
      lng: -49.7232,
      quartos: 3,
      banheiros: 2,
      vagas: 2,
      salas: 2,
      cozinhas: 1,
      piscina: true,
      churrasqueira: false,
      area: 240,
      valor: 420000,
      telefone: "11 99898-5930",
      imagens: ["images/imoveis/cesar/venda/1.jpg", "images/imoveis/cesar/venda/2.jpg", "images/imoveis/cesar/venda/3.jpg"],
      descricao: "Casa iluminada, próxima a escolas e comércio. Documentação ok.",
      suite: "Sim",
      quintal: "Sim",
      procura: "casa", // ou "terreno", "rural", etc.   
      construcao: 180,          // << NOVO: m² de construção      
      corretores: ["Cezar Melo - 38.105 F", "João Souza", "Ana Lima"]

    },
    {
      id: "imv2",
      tipo: "aluguel",
   //   status: "Disponivel",
      titulo: "Apartamento Jardim Primavera",
      endereco: "Av. Brasil, 1234 - Jardim Primavera",
      lat: -23.3979,
      lng: -49.7285,
      quartos: 2,
      banheiros: 1,
      vagas: 1,
      salas: 1,
      cozinhas: 1,
      piscina: false,
      churrasqueira: true,
      area: 68,
      valor: 1200,
      telefone: "11 99898-5930",
      imagens: ["images/imoveis/cesar/aluguel/1.jpg", "images/imoveis/cesar/aluguel/2.jpg", "images/imoveis/cesar/aluguel/3.jpg"],
      descricao: "Apartamento novo, bem ventilado e com ótima vista.",
      suite: "Sim",
      quintal: "Sim",
      corretores: ["Cezar Melo - 38.105 F", "João Souza", "Ana Lima"],
      construcao: 68,           // << NOVO
    }
  ];

  // monta página
  function mostrarImoveisV2() {
    location.hash = "#imoveis";
    const area = document.querySelector(".content_area");
    area.innerHTML = `
    <div class="page-header">
      <h2 >🏠 Imóveis</h2>
      <i class="fa-solid fa-share-nodes share-btn"
         onclick="compartilharPagina('#imoveis','Imóveis em Carlópolis','Veja o mapa e imóveis disponíveis!')"></i>
    </div>

    <div class="imoveis-wrap">
      <aside class="im-filtros">
        <h4>Filtrar</h4>
        <div class="field">
          <label>Tipo Negociação</label>
          <select id="imTipo">
            <option value="">Todos</option>
             <option value="aluguel">Aluguel</option>
            <option value="venda">Venda</option>
           
          </select>
        </div>

        <!-- Filtro: O que procura -->
<label for="filtroProcura">O que procura:</label>
<select id="filtroProcura">
  <option value="">Todos</option>
  <option value="casa">Casa</option>
   <option value="comercial">Comercial</option>
   <option value="condominio">Condomínio</option>
<option value="galpao">Galpão</option>
<option value="represa">Represa</option>  
  <option value="rural">Rural</option>
  <option value="terreno">Terreno</option>
  
 
  
  
</select>





        <div class="field">
          <label>Quantidade de Quartos (mín.)</label>
          <select id="imQuartos">
            <option value="">Qualquer</option>
            <option value="1">1+</option>
            <option value="2">2+</option>
            <option value="3">3+</option>
            <option value="4">4+</option>
          </select>
        </div>
        <div class="field">
          <label>Preço até</label>
          <select id="imPreco">
            <option value="">Sem teto</option>
            <option value="600">R$ 600 (aluguel)</option>
            <option value="1200">R$ 1.200 (aluguel)</option>            
            <option value="200000">R$ 200 mil</option>
            <option value="500000">R$ 500 mil</option>
            <option value="1000000">R$ 1 milhão</option>
          </select>
        </div>

        <div class="field"><label>Comodidades ( Selecione para filtro )</label>
          <div class="amenities">
            <span class="amenity-chip" data-key="piscina">🏊 Piscina</span>
            <span class="amenity-chip" data-key="churrasqueira">🍖 Churrasqueira</span>
            <span class="amenity-chip" data-key="vagas">🚗 2+ vagas</span>
          </div>
        </div>

        <!-- Filtro Corretor -->
        <label for="filtroCorretor">Corretor / Imobiliaria:</label>
        <select id="filtroCorretor">
          <option value="">Todos</option>
          <!-- Opções via JS -->
        </select>

      </aside>

      <section class="im-grid" id="imGrid"></section>

    
    </div>

    <div class="im-modal" id="imModal">
      <div class="inner">
        <button class="close" onclick="fecharModalImoveis()">Fechar ✖</button>
        <div class="title" id="imModalTitle"></div>
        <div class="swiper swiper-imovel-full">
          <div class="swiper-wrapper" id="imModalSlides"></div>
        </div>
      </div>
    </div>
  `;

    function updatePrecoOptions(tipo) {
      const sel = document.getElementById("imPreco");
      if (!sel) return;
      const prev = sel.value; // lembra a escolha anterior

      // limpa
      sel.innerHTML = "";

      // opção padrão
      const opt0 = document.createElement("option");
      opt0.value = "";
      opt0.textContent = " ";
      sel.appendChild(opt0);

      // opções por tipo
      if (tipo === "aluguel") {
        [
          ["600", "R$ 600"],
          ["1200", "R$ 1.200"],
          ["2000", "R$ 2.000"],
          ["3000", "R$ 3.000"],
          ["4000", "R$ 4.000"],
          ["5000", "R$ 5.000"],
        ].forEach(([v, t]) => {
          const o = document.createElement("option");
          o.value = v; o.textContent = t;
          sel.appendChild(o);
        });
      } else if (tipo === "venda") {
        [
          ["200000", "R$ 200 mil"],
          ["400000", "R$ 400 mil"],
          ["800000", "R$ 800 mil"],
          ["1500000", "R$ 1.500 milhão"],
          ["3000000", "R$ 3.000 milhões"],
          ["10000000", "R$ 10.000 milhões"],
        ].forEach(([v, t]) => {
          const o = document.createElement("option");
          o.value = v; o.textContent = t;
          sel.appendChild(o);
        });
      } else {
        // "Todos": pode mostrar um mix ou deixar só “Sem teto”
        [
          ["1200", "R$ 1.200 (aluguel)"],
          ["200000", "R$ 200 mil (venda)"],
          ["500000", "R$ 500 mil (venda)"]
        ].forEach(([v, t]) => {
          const o = document.createElement("option");
          o.value = v; o.textContent = t;
          sel.appendChild(o);
        });
      }

      // se a seleção anterior não existir mais, fica no "Sem teto"
      if (![...sel.options].some(o => o.value === prev)) sel.value = "";
    }

    // chama ao iniciar
    updatePrecoOptions(document.getElementById("imTipo").value);

    // atualiza quando mudar o tipo
    document.getElementById("imTipo").addEventListener("change", (e) => {
      updatePrecoOptions(e.target.value);
      // dispara o filtro para refletir a troca
      aplicarFiltrosImoveis();
    });

    // listeners filtros
    document.querySelectorAll(".im-filtros select").forEach(s => s.addEventListener("change", aplicarFiltrosImoveis));
    document.querySelectorAll(".amenity-chip").forEach(chip => {
      chip.addEventListener("click", () => {
        chip.classList.toggle("active");
        aplicarFiltrosImoveis();
      });
    });

    // inicia grid + mapa
    stateImoveis.all = IM_DADOS.slice();
    stateImoveis.filtered = stateImoveis.all.slice();
    popularFiltroCorretor();
    document.getElementById("filtroCorretor")
      ?.addEventListener("change", aplicarFiltrosImoveis);
    desenharGridImoveis(stateImoveis.filtered);
    iniciarMapaImoveis();
    plotarPinsImoveis(stateImoveis.filtered);
  }

  const stateImoveis = { all: [], filtered: [], map: null, markers: [] };

  function aplicarFiltrosImoveis() {
    const tipo = document.getElementById("imTipo").value;
    const q = parseInt(document.getElementById("imQuartos").value || 0, 10);
    const p = parseInt(document.getElementById("imPreco").value || 0, 10);
    const amen = Array.from(document.querySelectorAll(".amenity-chip.active"))
      .map(c => c.dataset.key);
    const corretorSelecionado = document.getElementById("filtroCorretor")?.value || "";
    const procuraSelecionado = document.getElementById("filtroProcura")?.value || "";

    stateImoveis.filtered = stateImoveis.all.filter(im => {
      const tipoOk = !tipo || im.tipo === tipo;
      const qOk = !q || (im.quartos >= q);
      const pOk = !p || (im.valor <= p);
      const corretorOk =
        !corretorSelecionado ||
        (Array.isArray(im.corretores)
          ? im.corretores.includes(corretorSelecionado)
          : im.corretor === corretorSelecionado);
      const procuraOk =
        !procuraSelecionado ||
        (String(im.procura || "").toLowerCase() === procuraSelecionado.toLowerCase());

      let amenOk = true;
      if (amen.includes("piscina")) amenOk = amenOk && !!im.piscina;
      if (amen.includes("churrasqueira")) amenOk = amenOk && !!im.churrasqueira;
      if (amen.includes("vagas")) amenOk = amenOk && (im.vagas >= 2);

      return tipoOk && qOk && pOk && corretorOk && procuraOk && amenOk;
    });

    desenharGridImoveis(stateImoveis.filtered);
    plotarPinsImoveis(stateImoveis.filtered);
  }



  function desenharGridImoveis(lista) {
    const el = document.getElementById("imGrid");
    if (!lista.length) {
      el.innerHTML = `<p style="text-align:center">Nenhum imóvel encontrado.</p>`;
      return;
    }
    el.innerHTML = lista.map(im => cardImovelHTML(im)).join("");

    // inicia swipers compactos por card
    setTimeout(() => {
      document.querySelectorAll(".swiper-imovel-mini").forEach((box) => {
        new Swiper(box, { loop: true, autoplay: { delay: 4000 } });
      });
    }, 0);

    // conecta botões
    el.querySelectorAll("[data-action='fotos']").forEach(btn => {
      btn.addEventListener("click", (ev) => {
        const id = ev.currentTarget.getAttribute("data-id");
        abrirModalImoveis(stateImoveis.all.find(x => x.id === id));
      });
    });

    el.querySelectorAll("[data-action='whats']").forEach(btn => {
      btn.addEventListener("click", (ev) => {
        const id = ev.currentTarget.getAttribute("data-id");
        const im = stateImoveis.all.find(x => x.id === id);
        if (!im) return;
        const numero = (im.telefone || "").replace(/\D/g, "");
        const txt = encodeURIComponent(`Olá! Vi o imóvel "${im.titulo}" no site Olá Carlópolis e gostaria de mais informações.`);
        window.open(`https://wa.me/55${numero}?text=${txt}`, "_blank");
      });
    });

    // permitir abrir a galeria clicando na imagem ou no botão de lupa
el.querySelectorAll(".card-imovel .swiper-imovel-mini img, .card-imovel .zoom-thumb").forEach(node => {
  node.addEventListener("click", (ev) => {
    ev.stopPropagation(); // evita acionar o click do card (mapa)
    const card = ev.currentTarget.closest(".card-imovel");
    const id = card?.getAttribute("data-id") || ev.currentTarget.getAttribute("data-id");
    if (!id) return;
    const im = stateImoveis.all.find(x => x.id === id);
    if (im) abrirModalImoveis(im);
  });
});

  }

  function cardImovelHTML(im) {
    const tag = im.tipo; // venda | aluguel
    const st = (im.status || "").toLowerCase();
    const precoFmt = im.tipo === "aluguel"
      ? `R$ ${Number(im.valor).toLocaleString()} / mês`
      : `R$ ${Number(im.valor).toLocaleString()}`;
    const responsavel = nomeResponsavel(im); // << NOVO

    return `
  <article class="card-imovel" data-id="${im.id}" onclick="focarNoMapa && focarNoMapa('${im.id}')">
    <div class="card-top">
      <div class="swiper swiper-imovel-mini">
        <div class="swiper-wrapper">
          ${im.imagens.map(src => `<div class="swiper-slide"><img src="${src}" alt="${im.titulo}"></div>`).join("")}
        </div>
      </div>
      <button class="zoom-thumb" data-id="${im.id}" title="Ampliar">
  <i class="fa-solid fa-magnifying-glass"></i>
</button>
      <span class="tag ${tag}">${tag.toUpperCase()}</span>
    </div>

    <div class="card-body">
      <div class="card-title">${im.titulo}</div>
      <div class="card-addr"><i class="fa-solid fa-map-pin"></i> ${im.endereco}</div>

      <!-- Chips compactos, harmoniosos -->
      <div class="specs-chips">
      
        <div class="spec-chip"><span class="k">Quartos</span><span class="v">${im.quartos ?? "-"}</span></div>
        ${im.suite ? `<div class="spec-chip chip-mini"><span class="k">Suíte</span><span class="v">${boolStr(!!im.suite)}</span></div>` : ``}
        <div class="spec-chip"><span class="k">Banheiros</span><span class="v">${im.banheiros ?? "-"}</span></div>
        <div class="spec-chip"><span class="k">Vagas</span><span class="v">${im.vagas ?? "-"}</span></div>

        <div class="spec-chip"><span class="k">Salas</span><span class="v">${im.salas ?? "-"}</span></div>
        <div class="spec-chip"><span class="k">Cozinhas</span><span class="v">${im.cozinhas ?? "-"}</span></div>
        <div class="spec-chip"><span class="k">Área</span><span class="v">${m2(im.area)}</span></div>

        <div class="spec-chip chip-mini"><span class="k">Piscina</span><span class="v">${boolStr(!!im.piscina)}</span></div>
        <div class="spec-chip chip-mini"><span class="k">Área de lazer</span><span class="v">${boolStr(!!im.churrasqueira)}</span></div>
        <div class="spec-chip chip-mini"><span class="k">Quintal</span><span class="v">${boolStr(!!im.quintal)}</span></div>
        <div class="spec-chip"><span class="k">Construção</span><span class="v">${m2(im.construcao)}</span></div>
      </div>

        
 
      </div>
      <div class="price-line" style="margin-top:12px">
        <div class="price">${precoFmt}</div>
        <div class="badges">
          ${st && st !== "disponível" ? `<span class="badge">${im.status}</span>` : ""}
        </div>
      </div>

      ${im.descricao ? `<div class="descricao" style="margin-top:8px">${im.descricao}</div>` : ""}

      <div class="card-actions">
        <button class="btn-whats" data-action="whats" data-id="${im.id}">
          <i class="fa-brands fa-whatsapp"></i> Falar no WhatsApp
        </button>
        
       
      </div>
 <div><br>
            ${responsavel ? `<div class="spec-chip chip-mini"><span class="k">Corretor</span><span class="v">${responsavel}</span></div>` : ``}</div>

      
       
    </div>
  </article>`;
  }




  // ---------- Modal (galeria full) ----------
  function abrirModalImoveis(im) {
    if (!im) return;
    const modal = document.getElementById("imModal");
    const title = document.getElementById("imModalTitle");
    const slides = document.getElementById("imModalSlides");
    title.textContent = im.titulo;
    slides.innerHTML = im.imagens.map(src => `<div class="swiper-slide"><img src="${src}"/></div>`).join("");
    modal.classList.add("open");
    // inicia/renova swiper
    setTimeout(() => new Swiper(".swiper-imovel-full", { loop: true }), 0);

    // atalhos teclado
    document.addEventListener("keydown", escFecharModal);
  }

  function fecharModalImoveis() {
    document.getElementById("imModal").classList.remove("open");
    document.removeEventListener("keydown", escFecharModal);
  }
  function escFecharModal(e) { if (e.key === "Escape") fecharModalImoveis(); }

  // ---------- Mapa (Leaflet) ----------
  function iniciarMapaImoveis() {
    // Leaflet CSS já está no index; use o bundle padrão
    stateImoveis.map = L.map('imMap', { scrollWheelZoom: true }).setView([-23.3958, -49.7240], 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap'
    }).addTo(stateImoveis.map);
  }
  function plotarPinsImoveis(lista) {
    // limpa marcadores antigos
    stateImoveis.markers.forEach(m => stateImoveis.map.removeLayer(m));
    stateImoveis.markers = [];

    lista.forEach(im => {
      const marker = L.marker([im.lat, im.lng]).addTo(stateImoveis.map);
      marker.on("click", () => {
        // centraliza e abre galeria mini
        stateImoveis.map.panTo([im.lat, im.lng]);
        // destaque visual: dá scroll pro card
        const card = document.querySelector(`.card-imovel[data-id="${im.id}"]`);
        if (card) card.scrollIntoView({ behavior: "smooth", block: "center" });
      });
      stateImoveis.markers.push(marker);
    });

    if (lista.length) {
      const group = new L.featureGroup(stateImoveis.markers);
      try { stateImoveis.map.fitBounds(group.getBounds().pad(0.2)); } catch (e) { }
    }
  }
  function focarNoMapa(id) {
    const im = stateImoveis.all.find(x => x.id === id);
    if (!im || !stateImoveis.map) return;
    stateImoveis.map.setView([im.lat, im.lng], 16);
  }

  function popularFiltroCorretor() {
    const sel = document.getElementById("filtroCorretor");
    if (!sel) return;

    // Coleta TODOS os corretores (string ou array) e cria um conjunto único
    const set = new Set();
    stateImoveis.all.forEach(im => {
      if (Array.isArray(im.corretores)) {
        im.corretores.filter(Boolean).forEach(nome => set.add(String(nome).trim()));
      } else if (im.corretor) {
        set.add(String(im.corretor).trim());
      }
    });

    // Limpa e recria opções (mantém "Todos")
    sel.innerHTML = `<option value="">Todos</option>` +
      Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"))
        .map(nome => `<option value="${nome}">${nome}</option>`).join("");
  }

  // Exemplo: após carregar os imóveis
  // stateImoveis.all = ... (carregou)
  // popularFiltroCorretor();
  // document.getElementById("filtroCorretor").addEventListener("change", aplicarFiltrosImoveis);


  // conectar no menu
  const elMenuImoveis = document.getElementById("menuImoveis");
  if (elMenuImoveis) elMenuImoveis.addEventListener("click", mostrarImoveisV2);






  // Renderiza a página Promoções
  function mostrarPromocoes(filtroEstabId = "todos") {
    const todos = coletarTodasPromocoes();

    // prepara lista de estabelecimentos que têm promo
    const estabelecimentos = Array.from(
      new Set(todos.map(i => JSON.stringify({ id: i.estabelecimentoId, nome: i.estabelecimento })))
    ).map(s => JSON.parse(s))
      .sort((a, b) => a.nome.localeCompare(b.nome));

    // aplica filtro (força comparação por string para evitar mismatch)
    const filtro = String(filtroEstabId || "todos").trim();
    const itens = (filtro === "todos")
      ? todos
      : todos.filter(i => String(i.estabelecimentoId).trim() === filtro);

    // ⚠️ Remover itens vencidos (no próprio dia da validade já some)
    const itensFiltrados = itens.filter(i => !promoExpirada(i));




    // título + filtro
    let html = `
    <section class="promo-hero">
       <h2 class="highlighted"><span>🔥 Promoções</span>
    </h2>
     <div class="filtro-comidas-card">
    <label for="filtroEstab">Filtrar por:</label>
    <select id="filtroEstab">
  <option value="todos">🔥 Todos</option>
 ${estabelecimentos.map(e => `
  <option value="${String(e.id).trim()}" ${String(filtroEstabId || "todos").trim() === String(e.id).trim() ? "selected" : ""}>
    ${e.nome}
  </option>
`).join("")}
</select>

    </div>

    </section>
    `;

    // grid de cards
    html += `<section class="promo-grid">`;

    if (itensFiltrados.length === 0) {
      html += `<div class="promo-vazio">Nenhuma promoção cadastrada.</div>`;
    } else {
      itensFiltrados.forEach(i => {
        const precoFmt = (typeof i.preco === "number")
          ? i.preco.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
          : i.preco;

        const precoAntFmt = (i.precoAntigo && typeof i.precoAntigo === "number")
          ? i.precoAntigo.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
          : (i.precoAntigo || "");

        // validade
        let validadeTxt = "";
        if (i.validadeInicio && i.validadeFim) {
          validadeTxt = `Ofertas válidas de ${i.validadeInicio} a ${i.validadeFim}`;
        } else if (i.validadeFim) {
          validadeTxt = `Válidade: ${i.validadeFim}`;
        } else if (i.validadeInicio) {
          validadeTxt = `Válido a partir de ${i.validadeInicio}`;
        }




        html += `
    <article class="promo-card">
    <div class="promo-card-body">
      <div class="promo-produto">
        ${i.imagem
            ? `<img class="promo-img-zoom" src="${i.imagem}" alt="${i.titulo}" loading="lazy">`
            : `<div class="promo-sem-imagem">sem imagem</div>`}
        
        <div class="promo-info">
          <div class="promo-nome">${i.titulo}</div>
          ${(i.volume || i.embalagem)
            ? `<div class="promo-det">${[i.volume, i.embalagem].filter(Boolean).join(" · ")}</div>` : ""}
          <div class="promo-estab">${i.estabelecimento}</div>
          ${i.obs ? `<div class="promo-obs">${i.obs}</div>` : ""}
          
        </div>
      </div>

     <div class="promo-preco">
      ${precoAntFmt ? `<div class="promo-preco-antigo">${precoAntFmt}</div>` : ""}
      <div class="promo-preco-atual">${precoFmt}</div>
      ${i.unidade ? `<div class="promo-unidade">${i.unidade}</div>` : ""}
      ${(i.validadeInicio && i.validadeFim)
            ? `<div class="promo-validade">Ofertas válidas de ${formatarDataBR(i.validadeInicio)} a ${formatarDataBR(i.validadeFim)}</div>`
            : (i.validadeFim ? `<div class="promo-validade">Até ${formatarDataBR(i.validadeFim)}</div>`
              : (i.validadeInicio ? `<div class="promo-validade">Válido a partir de ${formatarDataBR(i.validadeInicio)}</div>` : ""))}
    </div>


     
    </div>

    <div class="promo-rodape">
    ${i.contact
            ? `<a href="https://wa.me/55${somenteDigitos(getPrimeiroContato(i.contact))}?text=${encodeURIComponent(`Olá, encontrei o produto ${i.titulo} no Olá Carlópolis. Está disponível ainda?`)
            }" 
          target="_blank" 
          class="icon-link">
          <i class="fab fa-whatsapp" style="color:#25D366"></i>${i.contact}
        </a>`
            : ""}

    ${i.estabelecimentoId && categories
            .flatMap(c => c.establishments || [])
            .find(e => normalizeName(e.name) === i.estabelecimentoId)?.instagram
            ? `<a href="${fixUrl(categories.flatMap(c => c.establishments || [])
              .find(e => normalizeName(e.name) === i.estabelecimentoId).instagram)}"
        target="_blank"
        class="icon-link">
        <i class="fab fa-instagram" style="color:#C13584"></i> Instagram
      </a>`
            : ""}

    
    </div>

      </article>
    `;


      });
    }





    html += `</section>`;

    document.querySelector(".content_area").innerHTML = html;



    // Converte "2025-09-15" em "15-09-2025"
    function formatarDataBR(dataISO) {
      if (!dataISO) return "";
      const [ano, mes, dia] = dataISO.split("-");
      return `${dia}/${mes}/${ano.slice(-2)}`;
    }


    // === Auto-remover com animação se virar o dia/validade durante a sessão ===
    function removerExpiradasComAnimacao() {
      const cards = document.querySelectorAll('.promo-card[data-validade-fim]');
      const hoje = getHojeBR();
      cards.forEach(card => {
        const fim = card.getAttribute('data-validade-fim');
        if (fim && hoje >= fim && !card.classList.contains('promo-hide')) {
          card.classList.add('promo-hide');           // aplica animação
          setTimeout(() => card.remove(), 450);       // remove após a transição
        }
      });
    }

    // roda na entrada e a cada 60s (leve)
    removerExpiradasComAnimacao();
    if (!window.__promoExpireTimer) {
      window.__promoExpireTimer = setInterval(removerExpiradasComAnimacao, 60000);
    }





    // Ampliar imagem do produto
    document.querySelectorAll('.promo-img-zoom').forEach(img => {
      img.addEventListener('click', () => {
        const overlay = document.createElement('div');
        overlay.className = 'fullscreen-img-bg';
        overlay.innerHTML = `
      <button class="fullscreen-close" aria-label="Fechar">&times;</button>
      <img src="${img.src}" alt="${img.alt}">
    `;
        overlay.addEventListener('click', (e) => {
          if (e.target === overlay || e.target.classList.contains('fullscreen-close')) {
            overlay.remove();
          }
        });
        document.body.appendChild(overlay);
      });
    });


    // listeners do filtro

    document.querySelector(".content_area").innerHTML = html;

    const select = document.getElementById("filtroEstab");
    if (select) {
      // remove listeners antigos se houverem (via cloneNode)
      const clone = select.cloneNode(true);
      select.parentNode.replaceChild(clone, select);

      clone.value = String(filtroEstabId || "todos").trim();
      clone.addEventListener("change", (e) => {
        // Atualiza a URL para permitir voltar/compartilhar já filtrado
        const id = String(e.target.value || "todos").trim();
        location.hash = id === "todos" ? "#promocoes" : `#promocoes-${id}`;
        mostrarPromocoes(id);
      });
    }


  }


  /////

  // Atalho no menu
  const linkPromo = document.getElementById("menuPromocoes");
  if (linkPromo) {
    linkPromo.addEventListener("click", (e) => {
      e.preventDefault();
      mostrarPromocoes("todos"); // sempre abre com todas as promoções
    });
  }




  function mostrarFotos(nomeNormalizado) {
    // Procura o estabelecimento pelo nome normalizado
    let est = null;
    categories.forEach(cat => {
      cat.establishments.forEach(e => {
        if (normalizeName(e.name) === nomeNormalizado && e.novidadesImages && e.novidadesImages.length) {
          est = e;
        }
      });
    });

    if (!est) {
      alert("Nenhuma foto de divulgação encontrada!");
      return;
    }

    // Remove qualquer modal anterior
    document.querySelectorAll('.modal-fotos-overlay').forEach(el => el.remove());

    // Monta o HTML do modal de fotos
    let html = `
    <div class="modal-fotos-overlay" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.90); z-index: 9999; display: flex; align-items: center; justify-content: center;">
      <div class="modal-fotos" style="background: #fff; border-radius: 16px; max-width: 90vw; max-height: 90vh; overflow: auto; padding: 24px; position: relative;">
        <button class="close-modal-fotos" style="position: absolute; top: 12px; right: 16px; font-size: 2rem; background: none; border: none; color: #333; cursor: pointer;">&times;</button>
        <h2 style="text-align: center; margin-bottom: 20px;">Fotos de ${est.name}</h2>
        <div class="modal-fotos-imgs" style="display: flex; flex-wrap: wrap; gap: 30px; justify-content: center;">
    `;

    est.novidadesImages.forEach((img, idx) => {
      const descricao = est.novidadesDescriptions?.[idx] || '';
      html += `
        <div style="text-align: center;">
          <img src="${img}" alt="Foto ${idx + 1}" style="max-width: 370px; max-height: 425px;border-radius: 10px; box-shadow:0 2px 12px #0002;" loading="lazy">
          <div style="margin-top:8px; color: #444; font-size: 1rem;">${descricao}</div>
        </div>
      `;
    });

    html += `
          </div>
        </div>
      </div>
    `;

    // Insere o modal no body
    document.body.insertAdjacentHTML('beforeend', html);

    // Evento para fechar ao clicar no botão
    document.querySelector('.close-modal-fotos').onclick = function () {
      document.querySelector('.modal-fotos-overlay').remove();
    };

    // Fecha ao clicar fora do modal
    document.querySelector('.modal-fotos-overlay').onclick = function (e) {
      if (e.target === this) this.remove();
    };
  }
  window.mostrarFotos = mostrarFotos;




  function mostrarCardapio(nomeNormalizado) {
    // Procura sempre o PRIMEIRO que tem menuImages
    let est = null;
    categories.forEach(cat => {
      cat.establishments.forEach(e => {
        if (normalizeName(e.name) === nomeNormalizado && e.menuImages && e.menuImages.length) {
          est = e;
        }
      });
    });


    if (!est) return;




    // Remove modal antiga se existir
    document.querySelectorAll('.modal-cardapio-overlay').forEach(el => el.remove());

    // Monta HTML do modal
    let html = `
    <div class="modal-cardapio-overlay">
      <div class="modal-cardapio">
        <button class="close-modal-cardapio" title="Fechar">&times;</button>
        <h2>Cardápio - ${est.name}</h2>
        <div class="modal-cardapio-imgs">
    `;

    est.menuImages.forEach(img => {
      html += `<img src="${img}" class="cardapio-img" loading="lazy">`;
    });

    html += `
          </div>
        </div>
      </div>
    `;

    // Adiciona modal ao body
    document.body.insertAdjacentHTML('beforeend', html);

    // Evento para fechar ao clicar no botão
    document.querySelector('.close-modal-cardapio').onclick = function () {
      document.querySelector('.modal-cardapio-overlay').remove();
    };

    // Fecha ao clicar fora do modal
    document.querySelector('.modal-cardapio-overlay').onclick = function (e) {
      if (e.target === this) this.remove();
    };
  }
  window.mostrarCardapio = mostrarCardapio;

  ///////// fim onde comer









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

  function fixUrl(u) {
    if (!u) return "";
    u = String(u).trim();
    // se não começar com http/https, prefixa https://
    if (!/^https?:\/\//i.test(u)) u = "https://" + u.replace(/^\/+/, "");
    return u;
  }

  function sendPaymentReminder(establishment) {
    alert(
      `Atenção! O pagamento do site para ${establishment.name} vence hoje.`
    );
  }



  function abrirCarrosselPromocoes(idxComercio) {
    // Remove overlay antigo se existir
    document.querySelectorAll('.promo-carousel-overlay').forEach(el => el.remove());

    const comercio = promocoesPorComercio[idxComercio];
    const promoSlides = comercio.promocoes.slice(0, 10).map((promo, i) => `


  <div class="swiper-slide">
    <div class="promo-carousel-slide">
      <img src="${promo.imagem}" class="promo-carousel-img" />
      <div class="promo-info-cards">
        <div class="promo-card descricao">
          <i class="fa-solid fa-tag"></i>
          <span>${promo.descricao}</span>
        </div>
        ${promo.desconto ? `
          <div class="promo-card desconto">
               <i class="fa-solid fa-percent" ></i>
            <span><b>Desconto:</b> -${promo.desconto}%</span>
          </div>
        ` : ""}
        ${promo.preco ? `
          <div class="promo-card preco">
            <i class="fa-solid fa-dollar-sign" style="color: red;"></i>
            <span><b>De:</b> <span class="preco-original">R$ ${promo.preco}</span></span>
          </div>
        ` : ""}
        ${promo.preco_com_desconto ? `
  <div class="promo-card preco">
    <i class="fa-solid fa-dollar-sign"></i>
    <span><b>Por:</b> R$ ${promo.preco_com_desconto}</span>
  </div>
` : ""}
        <div class="promo-card validade">
          <i class="fa-solid fa-clock"></i>
          <span class="preco-desconto"><b>Validade:</b> ${new Date(promo.validade).toLocaleDateString()}</span>
          
        </div>
       ${promo.whatsapp ? `
  <div class="promo-card whatsapp">
    <a href="https://wa.me/55${promo.whatsapp}?text=${encodeURIComponent(
      `Olá! vi esta oferta: ${promo.descricao || ''}` +
      `${promo.preco_com_desconto ? ` de R$ ${promo.preco_com_desconto}` : ''}` +
      ` no site Olá Carlópolis, estão tendo ainda?!`
    )}"target="_blank"
               class="btn-whatsapp-promo"
               rel="noopener">
               <b>Chamar no WhatsApp</b>
            </a>
          </div>
        ` : ""}
      </div>
    </div>
  </div>
`).join('');







    const overlay = document.createElement('div');

    overlay.className = 'promo-carousel-overlay';
    overlay.innerHTML = `
  <div class="promo-carousel-modal">
    <button class="close-promo-carousel" title="Fechar">&times;</button>
    <h2>${comercio.nome}</h2>
    <div class="swiper promoSwiperUnica">
      <div class="swiper-wrapper">
        ${promoSlides}
      </div>
      <div class="swiper-pagination"></div>
      <div class="swiper-button-prev"></div>
      <div class="swiper-button-next"></div>
    </div>
  </div>
`;
    overlay.querySelector('.close-promo-carousel').onclick = () => {
      overlay.remove();
    };
    overlay.querySelectorAll('.promo-countdown').forEach(el => {
      iniciarCountdown(el);
    });

    document.body.appendChild(overlay);

    // Fecha o modal ao clicar fora
    overlay.addEventListener('click', function (e) {
      // Se clicou direto no fundo (overlay), remove!
      if (e.target === overlay) {
        overlay.remove();
      }
    });


    // Inicia Swiper
    new Swiper('.promoSwiperUnica', {
      slidesPerView: 1,
      navigation: {
        nextEl: '.swiper-button-next',
        prevEl: '.swiper-button-prev'
      },
      pagination: {
        el: '.swiper-pagination'
      }
    });

    overlay.querySelector('.close-promo-carousel').onclick = () => {
      overlay.remove();
    };

    // Inicia os countdowns de cada slide
    overlay.querySelectorAll('.promo-countdown').forEach(el => {
      iniciarCountdown(el);
    });
  }





  // inicio relogio contador

  function iniciarCountdown(element) {
    const dataExpira = element.getAttribute('data-expira');
    if (!dataExpira) return;

    function atualizar() {
      const agora = new Date();
      const fim = new Date(dataExpira);
      const diff = fim - agora;
      if (diff <= 0) {
        element.innerHTML = "<span style='color:#B22222;font-weight:bold;'>Promoção expirada</span>";
        return;
      }
      const dias = Math.floor(diff / (1000 * 60 * 60 * 24));
      const horas = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const mins = Math.floor((diff / (1000 * 60)) % 60);
      const segs = Math.floor((diff / 1000) % 60);

      element.innerHTML = `
      <span class="relogio-countdown">
        ⏰ Termina: ${dias} D ${String(horas).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(segs).padStart(2, '0')}
      </span>
    `;
      setTimeout(atualizar, 1000);
    }

    atualizar();
  }



  /// fim relogio contador



  // Carregar informações de categorias
  const categories =
    [


      // dentro de um establishment

      // DADOS COMERCIOS
      {
        link: document.querySelector("#menuAcademia"),
        title: "Academia",
        establishments: [
          {
            image: "images/comercios/academia/lobofitness/lobofitness.png",

            name: "Lobo Fitness",
            hours: "Seg a Qui: 06:00h as 13:00h - 15:00h as 21:00h <br> Sex: 06:00h as 13:00h - 15:00h as 20:30h<br> Sab: 15:00h as 18:00h <br>Dom: Fechado ",
            statusAberto: " ",
            horarios: {
              dom: [], // fechado
              seg: [{ inicio: "06:00", fim: "13:00" }, { inicio: "15:00", fim: "21:00" }],
              ter: [{ inicio: "06:00", fim: "13:00" }, { inicio: "15:00", fim: "21:00" }],
              qua: [{ inicio: "06:00", fim: "13:00" }, { inicio: "15:00", fim: "21:00" }],
              qui: [{ inicio: "06:00", fim: "13:00" }, { inicio: "15:00", fim: "21:00" }],
              sex: [{ inicio: "06:00", fim: "13:00" }, { inicio: "15:00", fim: "20:30" }],
              sab: [{ inicio: "15:00", fim: "18:00" }]
            },
            address: "R. Delfino Mendes, 264 - Carlopolis",
            contact: "(43) 99112-1009",
            facebook: "https://www.facebook.com/teamlobofitnesscarlopolis",
            instagram: "https://www.instagram.com/academialobocarlopolis/",
            novidadesImages: [
              "images/comercios/academia/lobofitness/divulgacao/1.png",
              "images/comercios/academia/lobofitness/divulgacao/2.png",
              "images/comercios/academia/lobofitness/divulgacao/3.webp",
            ],
            novidadesDescriptions: [
              "Venham Conferir nosso espaço",
            ],
          },
        ],
      },



      {
        link: document.querySelector("#menuAcademiaLuta"),
        title: "Academia de Luta",
        establishments: [
          {
            image: "images/comercios/academiaLuta/teamVieira/perfil.jpg",

            name: "Team Vieira",
            hours: "Seg a Sex: 06:00h as 08:00h - 17:00h as 21:00h ",
            statusAberto: " ",
            horarios: {
              dom: [], // fechado
              seg: [{ inicio: "06:00", fim: "08:00" }],
              ter: [{ inicio: "06:00", fim: "08:00" }],
              qua: [{ inicio: "06:00", fim: "08:00" }],
              qui: [{ inicio: "06:00", fim: "08:00" }],
              sex: [{ inicio: "06:00", fim: "08:00" }],
              sab: []
            },
            address: "Rua Dr. Paulo e Silva, 1182 - Carlopolis",
            contact: "(43) 99136-5029",

            instagram: "https://www.instagram.com/romeuteamvieira_oficial/",
            infoAdicional: "🔸Muay Thay<Br>🔸MMA<Br>🔸Jiu-Jitsu",
            novidadesImages: [
              "images/comercios/academiaLuta/teamVieira/divulgacao/1.jpg",
              "images/comercios/academiaLuta/teamVieira/divulgacao/2.jpg",
              "images/comercios/academiaLuta/teamVieira/divulgacao/3.jpg",
            ],
            novidadesDescriptions: [
              "Venham conferir nosso espaço, e fazer uma aula gratis!",
              "Nosso time em peso",
              "Confira nossos treinos e melhore seu bem estar!"
            ],
          },
        ],
      },




      {
        link: document.querySelector("#menuAcai"),
        title: "Açai",
        establishments: [

          {
            image: "images/comercios/acai/thebestacai/perfil.jpg",
            name: "The Best Açaí",
            hours: "Seg a Sab: 12:30h as 22:30h<br>Dom e Feriado: 13:00 as 22:00",
            statusAberto: ".",
            horarios: {
              seg: [{ inicio: "12:30", fim: "22:30" }],
              ter: [{ inicio: "12:30", fim: "22:30" }],
              qua: [{ inicio: "12:30", fim: "22:30" }],
              qui: [{ inicio: "12:30", fim: "22:30" }],
              sex: [{ inicio: "12:30", fim: "22:30" }],
              sab: [{ inicio: "12:30", fim: "22:30" }],
              dom: [{ inicio: "13:00", fim: "22:00" }],
            },
            address: "R. Benedito Salles, 519 - Carlopolis",
            contact: "(43) 98814-0469",
            delivery: "Não",
            instagram: "https://www.instagram.com/carlopolis.thebestacai/",
            novidadesImages: [
              "images/comercios/acai/thebestacai/divulgacao/1.jpg",
              "images/comercios/acai/thebestacai/divulgacao/2.jpg",
              "images/comercios/acai/thebestacai/divulgacao/3.jpg",
              "images/comercios/acai/thebestacai/divulgacao/4.jpg",
              "images/comercios/acai/thebestacai/divulgacao/5.jpg",
              "images/comercios/acai/thebestacai/divulgacao/6.jpg",
              "images/comercios/acai/thebestacai/divulgacao/7.jpg",
              "images/comercios/acai/thebestacai/divulgacao/8.jpg",
            ],
            novidadesDescriptions: [
              "Monte seu THE BEST Waffle - Depois, só ano que vem!",
              'Agora na The Best Açai, você pode levar para casa, ou entao pedir pelo WhatsApp<Br><a href="https://wa.me/5543988140469?text=Olá!%20Vi%20sua%20divulgação%20no%20site%20Olá%20Carlópolis." target="_blank" style="color:#25D366;">43 98814-0469</a>.',
              "E aí já provou nossa piscininha de inverno? Não 😳. <br>Então vem se deliciar 😋",
              "Quem ama açaí, ama The Best.<br> São 12 sabores de açaí, sendo tradicional, do Pará e zero açúcar e mais 9 com sabor e trufado.<br> Aqui no the best Carlopolis você faz do seu jeito!!!!!",
              "Explosão de sabores com morango apenas no the best açaí!",
              "Variedades é no the best açai Carlopolis!!!!",
              "Quando cores vibrantes se unem a sabores deliciosos, a experiência gastronômica se torna uma obra de arte.",
              "Faça sua coleção de SnackCups",
            ],
            menuImages: [
              "images/comercios/acai/thebestacai/cardapio/1.jpg",
              "images/comercios/acai/thebestacai/cardapio/2.jpg",
              "images/comercios/acai/thebestacai/cardapio/3.jpg",
              "images/comercios/acai/thebestacai/cardapio/4.jpg",
            ],

          },


          {
            image: "images/comercios/acai/turminhaAcai/turminhaAcai.png",
            name: "Turminha do Açai",
            hours: "Qua a Seg: 14:00h as 23:00h <br> Ter: Fechado",
            statusAberto: ".",
            horarios: {
              dom: [{ inicio: "14:00", fim: "23:00" }],
              seg: [{ inicio: "14:00", fim: "23:00" }],
              ter: [], // fechado
              qua: [{ inicio: "14:00", fim: "23:00" }],
              qui: [{ inicio: "14:00", fim: "23:00" }],
              sex: [{ inicio: "14:00", fim: "23:00" }],
              sab: [{ inicio: "14:00", fim: "23:00" }]
            },
            address: "R. Benedito Salles, 409 - Carlopolis",
            contact: "(43) 99639-9374",

            delivery: "Sim / Com Taxa",
            instagram: "https://www.instagram.com/turminha_do_acai/",


            infoAdicional: "Espetinhos de Quinta a Sabado",
            novidadesImages: [
              "images/comercios/acai/turminhaAcai/novidades/1.png",
              "images/comercios/acai/turminhaAcai/novidades/2.png",
              "images/comercios/acai/turminhaAcai/novidades/3.png",
              "images/comercios/acai/turminhaAcai/novidades/4.png",
              "images/comercios/acai/turminhaAcai/novidades/5.jpg",
            ],
            novidadesDescriptions: [
              "Marmita de Açai! Voce só encontra aqui!",
              "Nossos espetos montados na hora",
              "Açai com bombom, irresistivel",
              "Espetinhos Diferenciados",
              "O nosso lanche é tradicional com pão francês, molho especial da casa, hambúrguer de costela com mussarela, alface, tomate e cebola roxa.",
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
            hours: "Seg a Sab: 08:00h as 20:00h </br> Dom: 08:00h as 12:00h",
            statusAberto: "a",
            horarios: {

              seg: [{ inicio: "08:00", fim: "20:00" }],
              ter: [{ inicio: "08:00", fim: "20:00" }],
              qua: [{ inicio: "08:00", fim: "20:00" }],
              qui: [{ inicio: "08:00", fim: "20:00" }],
              sex: [{ inicio: "08:00", fim: "20:00" }],
              sab: [{ inicio: "08:00", fim: "20:00" }],
              dom: [{ inicio: "08:00", fim: "12:00" }]
            },
            address: "Rua Benedito Salles, 409",
            contact: "(43) 99635-1001",
            delivery: "Sim / Sem Taxa",
            infoAdicional: "Fazemos espetinhos assados de quarta e sabado até as 20:00hrs",
            novidadesImages: [
              "images/comercios/acougue/curitiba/divulgacao/1.jpg",
              "images/comercios/acougue/curitiba/divulgacao/2.jpg",
              "images/comercios/acougue/curitiba/divulgacao/3.jpg",
              "images/comercios/acougue/curitiba/divulgacao/4.jpg",
              "images/comercios/acougue/curitiba/divulgacao/5.jpg",
              "images/comercios/acougue/curitiba/divulgacao/6.jpg",
              "images/comercios/acougue/curitiba/divulgacao/7.jpg",
              "images/comercios/acougue/curitiba/divulgacao/8.jpg",
            ],
            novidadesDescriptions: [
              "Aquele Chouriço feito no capricho!",
              "Espetinhos preparados por nos, faça seu pedido",
              "Temos queijos de Minas",
              "Temos tambem: Espetinho de boi, kafta, linguicinha suína, linguiça apimentada, 'Luis gordo', coração e muitos mais!",
              "Linguiça defumada artesanal suína, lombo e pernil",
              "Sabiam que temos, torresmo pré frito? Facilitando sua vida na hora de preparar essa delicia!",
              "Temos Banha suína 1 kg porco caipira, Gordura boa!",
              "Linguiça defumada artesanal mista, boi e porco",
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
            statusAberto: ".",
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
            facebook: "https://www.facebook.com/adega.carlopolis.37/",

            novidadesImages: [
              "images/comercios/adega/cuenca/divulgacao/1.png",
              "images/comercios/adega/cuenca/divulgacao/2.png",
              "images/comercios/adega/cuenca/divulgacao/3.png",
              "images/comercios/adega/cuenca/divulgacao/4.png",
              "images/comercios/adega/cuenca/divulgacao/5.png",
              "images/comercios/adega/cuenca/divulgacao/6.png",
              "images/comercios/adega/cuenca/divulgacao/7.jpg",
            ],
            novidadesDescriptions: [
              "Chop Brahma encontra aqui!",
              "Chop HASS encontra aqui!",
              " ",
              " ",
              " ",
              "Pediu chegou! Delivery de bebidas!",
              "NOVIDADE! Caipirinha congelada!",
            ],

          },

          {
            image: "images/comercios/adega/assao/assao.png",
            name: "Assao",
            hours: "Dom a Dom - 09:00h as 22:00h ",
            statusAberto: "a",
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
        link: document.querySelector("#menuArtesanato"),
        title: "Artesanato",
        establishments: [
          {
            image: "images/comercios/artesanato/judite/perfil.jpg",
            name: "Judite",
            hours: "Seg a Sab: 08:00h as 18:00h",
            statusAberto: "a",
            horarios: {

              seg: [{ inicio: "08:00", fim: "18:00" }],
              ter: [{ inicio: "08:00", fim: "18:00" }],
              qua: [{ inicio: "08:00", fim: "18:00" }],
              qui: [{ inicio: "08:00", fim: "18:00" }],
              sex: [{ inicio: "08:00", fim: "18:00" }],
              sab: [{ inicio: "08:00", fim: "18:00" }],
              dom: []
            },
            address: "Rua Elidia Maria de Jesus, 36 - Carlopolis",
            contact: "(43) 99871-3498",

            novidadesImages: [
              "images/comercios/artesanato/judite/divulgacao/1.jpg",
              "images/comercios/artesanato/judite/divulgacao/2.jpg",
            ],
            novidadesDescriptions: [
              "Bonecas de Pano",
              "Bolsas de croche!",

            ],
          },



          {
            image: "images/comercios/artesanato/patricia/perfil.jpg",
            name: "Paty Mãos De Ouro",
            contact: "(43) 99954-0753",
            hours: "Somente encomendas!",
            infoAdicional: "<br>🧵 Serviços oferecidos:<br>👗 Bordados personalizados<br>🎨 Artesanato criativo<br>🎁 Lembrancinhas para datas especiais<br>🛍️ Presentes únicos feitos à mão<br>🏡 Itens decorativos<br>📦 Produtos sob encomenda<Br><br>📬 Entregas e Encomendas<br>Trabalho por encomenda e envio tudo com muito cuidado! Combinamos tudo certinho pelo WhatsApp<br><br>Cada peça é feita com amor e atenção aos detalhes — ideal para presentear, decorar ou guardar como lembrança! Se você procura algo único, artesanal e cheio de afeto, fale comigo. Vai ser um prazer criar algo para você!",
            instagram: "https://www.instagram.com/patymaosdeouro/",
            novidadesImages: [
              "images/comercios/artesanato/patricia/divulgacao/1.jpg",
              "images/comercios/artesanato/patricia/divulgacao/2.jpg",
              "images/comercios/artesanato/patricia/divulgacao/3.jpg",
              "images/comercios/artesanato/patricia/divulgacao/4.jpg",
              "images/comercios/artesanato/patricia/divulgacao/5.jpg",
              "images/comercios/artesanato/patricia/divulgacao/6.jpg",
              "images/comercios/artesanato/patricia/divulgacao/7.jpg",
              "images/comercios/artesanato/patricia/divulgacao/8.jpg",

            ],
            novidadesDescriptions: [
              "Capas exclusivas para almofadas, produzidas artesanalmente e sob medida para o seu espaço. Perfeitas para presentear ou dar um toque especial à decoração.",
              "Panos de prato bordados à mão, perfeitos para dar charme e personalidade à sua cozinha!",
              "Aconchego e beleza em cada detalhe: capas de travesseiro feitas para você!",
              "Dê um toque especial aos seus livros com marca páginas únicos, criados artesanalmente para encantar leitores de todas as idades.",
              "Fraldinhas de ombro feitas à mão, um mimo indispensável para enxoval ou para presentear com carinho!",
              "Fraldinhas de boca exclusivas, perfeitas para completar o enxoval ou presentear com afeto.",
              "Sobre lençóis personalizados, confeccionados com atenção aos detalhes para proporcionar noites de sono ainda mais agradáveis.",
              "Deixe seu banho ainda mais especial com toalhas personalizadas, únicas como você! Ideais para dar um toque pessoal ao seu dia a dia ou surpreender alguém querido.",


            ],
            promocoes: [
              {
                imagem: "images/comercios/artesanato/patricia/promocoes/1.jpg",
                titulo: "Pano de prato - Flores ",
                precoAntigo: 40.00,
                preco: 35.00,
                unidade: "A UNIDADE",
                validadeFim: "2025-09-30",
                obs: "Oferta válida até durar o estoque"
              },

              {
                imagem: "images/comercios/artesanato/patricia/promocoes/2.jpg",
                titulo: "Pano de prato - Frutas ",
                precoAntigo: 40.00,
                preco: 35.00,
                unidade: "A UNIDADE",
                validadeFim: "2025-09-28",
                obs: "Oferta válida até durar o estoque"
              },

              {
                imagem: "images/comercios/artesanato/patricia/promocoes/3.jpg",
                titulo: "Pano de prato - Plantas ",
                precoAntigo: 40.00,
                preco: 35.00,
                unidade: "A UNIDADE",
                validadeFim: "2025-09-28",
                obs: "Oferta válida até durar o estoque"
              },

              {
                imagem: "images/comercios/artesanato/patricia/promocoes/4.jpg",
                titulo: "Pano de prato - Melancia ",
                precoAntigo: 40.00,
                preco: 35.00,
                unidade: "A UNIDADE",
                validadeFim: "2025-09-28",
                obs: "Oferta válida até durar o estoque"
              }
            ]
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
        link: document.querySelector("#menuAgropecuaria"),
        title: "Agropecuaria",
        establishments: [

          {
            image: "images/comercios/agropecuaria/varaschin/perfil.jpg",
            name: "AgroCasa Varaschin",
            hours: "Seg a Sex: 08:00h as 18:00h </br> Sab: 08:00h as 16:00h",
            statusAberto: "a",
            horarios: {

              seg: [{ inicio: "08:00", fim: "18:00" }],
              ter: [{ inicio: "08:00", fim: "18:00" }],
              qua: [{ inicio: "08:00", fim: "18:00" }],
              qui: [{ inicio: "08:00", fim: "18:00" }],
              sex: [{ inicio: "08:00", fim: "18:00" }],
              sab: [{ inicio: "08:00", fim: "16:00" }],
              dom: []
            },
            address: "Rua Jorge Barros, 861 - Carlopolis",
            contact: "(43) 99657-7021",
            delivery: "Sim / Sem Taxa",
            facebook: "https://www.facebook.com/agro.varaschin/",
            instagram: "https://www.instagram.com/agro.varaschin/",
            novidadesImages: [

              "images/comercios/agropecuaria/varaschin/divulgacao/1.jpg",

            ],
            novidadesDescriptions: [
              "Amplo espaço e muita variedade de rações",


            ],
          },


          {
            image: "images/comercios/agropecuaria/agroVida/agrovida.png",
            name: "Agro Vida",
            hours: "Seg a Sex: 08:00h as 18:00h </br> Sab: 08:00h as 16:00h",
            statusAberto: "a",
            horarios: {

              seg: [{ inicio: "08:00", fim: "18:00" }],
              ter: [{ inicio: "08:00", fim: "18:00" }],
              qua: [{ inicio: "08:00", fim: "18:00" }],
              qui: [{ inicio: "08:00", fim: "18:00" }],
              sex: [{ inicio: "08:00", fim: "18:00" }],
              sab: [{ inicio: "08:00", fim: "16:00" }],
              dom: []
            },
            address: "Rua Benedito salles, 309 - Carlopolis",
            contact: "(43) 99158-9047",
            delivery: "Sim / Sem Taxa",
            facebook: "https://www.facebook.com/AgroVidaCarlopolis/?locale=pt_BR",
            instagram: "https://www.instagram.com/agrovida_carlopolis/",
            novidadesImages: [
              "images/comercios/agropecuaria/agroVida/divulgacao/1.jpg",
              "images/comercios/agropecuaria/agroVida/divulgacao/2.jpg",
              "images/comercios/agropecuaria/agroVida/divulgacao/3.jpg",
              "images/comercios/agropecuaria/agroVida/divulgacao/4.jpg",
              "images/comercios/agropecuaria/agroVida/divulgacao/5.jpg",
              "images/comercios/agropecuaria/agroVida/divulgacao/6.jpg",
              "images/comercios/agropecuaria/agroVida/divulgacao/7.jpg",
              "images/comercios/agropecuaria/agroVida/divulgacao/8.jpg",
              "images/comercios/agropecuaria/agroVida/divulgacao/9.jpg",

            ],
            novidadesDescriptions: [
              "",
              "",
              "",
              "",
              "",
              "",
              "",
              "",

            ],

            promocoes: [
              {
                titulo: "Ração Unna ",
                volume: "15kg",
                preco: 99.90,
                precoAntigo: 110.00,
                unidade: "A UNIDADE",
                imagem: "images/comercios/agropecuaria/agroVida/promocao/1.jpg",
                validadeFim: "2025-10-30",
                obs: "Oferta válida até durar o estoque"
              },

              {
                titulo: "Petisco Turma da Monica - Frutas Vermelhas",
                // volume: "2L",
                //  embalagem: "fardo c/6",

                precoAntigo: 24.00,
                preco: 20.00,
                imagem: "images/comercios/agropecuaria/agroVida/promocao/2.jpg",
                // validade: "2025-09-28"
                validadeFim: "2025-10-15"
              },

              {
                titulo: "Petisco Turma da Monica - Enriquecido com Whey Protein",
                // volume: "2L",
                //  embalagem: "fardo c/6",

                precoAntigo: 24.00,
                preco: 20.00,
                imagem: "images/comercios/agropecuaria/agroVida/promocao/3.jpg",
                // validade: "2025-09-28"
                validadeFim: "2025-10-15"
              }
            ]
          },


          {
            image: "images/comercios/agropecuaria/saoJose/perfil.png",
            name: "Rações São Jose",
            hours: "Seg a Sex: 08:00h as 19:00h </br> Sab: 08:00h as 19:00h",
            statusAberto: "a",
            horarios: {

              seg: [{ inicio: "08:00", fim: "19:00" }],
              ter: [{ inicio: "08:00", fim: "19:00" }],
              qua: [{ inicio: "08:00", fim: "19:00" }],
              qui: [{ inicio: "08:00", fim: "19:00" }],
              sex: [{ inicio: "08:00", fim: "19:00" }],
              sab: [{ inicio: "08:00", fim: "19:00" }],
              dom: []
            },
            address: "Rua Benedito Salles, 35 - Carlópolis",
            contact: "(43) 99682-9898",
            delivery: "Sim / Sem Taxa",
            facebook: "https://www.facebook.com/p/Ra%C3%A7%C3%B5es-S%C3%A3o-Jos%C3%A9-100088108752876/",
            instagram: "https://www.instagram.com/racoessaojosecarlopolis/",

            novidadesImages: [
              "images/comercios/agropecuaria/saoJose/divulgacao/1.png",


            ],
            novidadesDescriptions: [
              "Venham nos conhecer, temos variedades em produtos para toda sua criação!<br> Trabalhamos até as 19hrs",
              "Ração QUIDOG no precinho",


            ],



            promocoes: [
              {
                imagem: "images/comercios/agropecuaria/saojose/promocao/1.jpg",
                titulo: "Cintos",
                precoAntigo: "R$ 130,00",
                preco: "R$ 99,00",
                unidade: "A UNIDADE",
                validadeFim: "2025-10-30",
                obs: "Oferta válida até durar o estoque",

              },


            ]






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
            statusAberto: ".",
            horarios: {
              seg: [{ inicio: "09:00", fim: "16:30" }],
              ter: [{ inicio: "09:00", fim: "16:30" }],
              qua: [{ inicio: "09:00", fim: "16:30" }],
              qui: [{ inicio: "09:00", fim: "16:30" }],
              sex: [{ inicio: "09:00", fim: "16:30" }],
              sab: [],
              dom: [],
            },
            address: "R. Nicolau Miguel, 452 - Carlópolis",
            contact: "(43) 99135-4012",
            infoAdicional: "IAT e Armeiro Credenciado • Port. SR/PF/PR N° 1821 de 08/23<br> Perito cred TJPR<br>Despachante<br>Assessoria<br>Cursos",

            facebook: "https://www.facebook.com/betopedreira.instrutor.armeiro/",
            instagram: "https://www.instagram.com/betopedreira.instrutor.armeiro/",
            novidadesImages: [

              "images/comercios/assessoriaBalistica/betogun/divulgacao/1.png",
              "images/comercios/assessoriaBalistica/betogun/divulgacao/2.png",
              "images/comercios/assessoriaBalistica/betogun/divulgacao/3.png",

            ],
            novidadesDescriptions: [
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
            image: "images/comercios/assistenciaCelular/cev/perfil.jpg",
            name: "C e V Assistencia Celular",
            hours: "Seg a Sex: 08:00h as 18:30h<br> Sab: 08:00h as 13:00h",
            statusAberto: ".",
            horarios: {
              seg: [{ inicio: "08:00", fim: "18:30" }],
              ter: [{ inicio: "08:00", fim: "18:30" }],
              qua: [{ inicio: "08:00", fim: "18:30" }],
              qui: [{ inicio: "08:00", fim: "18:30" }],
              sex: [{ inicio: "08:00", fim: "18:30" }],
              sab: [{ inicio: "08:00", fim: "13:00" }],
              dom: [],
            },
            address: "R. Dra. Paula e Silva, 445 - Carlópolis",
            contact: "(14) 99607-5513",
            instagram: "https://www.instagram.com/claudiamira225/",
            novidadesImages: [
              "images/comercios/assistenciaCelular/cev/divulgacao/1.jpg",
              "images/comercios/assistenciaCelular/cev/divulgacao/2.jpg",

            ],
            novidadesDescriptions: [
              "",


            ],
          },




          {
            image: "images/comercios/assistenciaCelular/efcell/perfil.jpg",
            name: "EF Cell",
            hours: "Seg a Sex: 8:00h as 18:30h<br> Sab: 08:00h as 13:00h",
            statusAberto: ".",
            horarios: {
              seg: [{ inicio: "08:00", fim: "18:30" }],
              ter: [{ inicio: "08:00", fim: "18:30" }],
              qua: [{ inicio: "08:00", fim: "18:30" }],
              qui: [{ inicio: "08:00", fim: "18:30" }],
              sex: [{ inicio: "08:00", fim: "18:30" }],
              sab: [{ inicio: "08:00", fim: "13:00" }],
              dom: [],
            },
            address: "R. Benedito Salles, 1188 - Carlopolis",
            contact: "(43) 99131-4642",
            facebook: "https://www.facebook.com/p/EF-CELL-Clinica-do-Celular-100026836159338/",
            instagram: "https://www.instagram.com/ef_clinica/",

            novidadesImages: [
              "images/comercios/assistenciaCelular/efcell/divulgacao/1.jpg",
              "images/comercios/assistenciaCelular/efcell/divulgacao/2.jpg",

            ],
            novidadesDescriptions: [
              "Aqui na EF CELL CLÍNICA DO CELULAR <br>resolvemos todos os teus problemas 📲",
              "Temos o melhor APLICATIVO de ENTRETENIMENTO do BRASIL<br>Lembrando só que precisa de internet e mais nada,conteúdos para toda a família 😉 <br>Não fiquem de fora eeeeee chama aiii que explicamos tudo para vocês",

            ],
          },




          {
            image: "images/comercios/assistenciaCelular/imperiumCell/perfil.jpg",
            name: "Imperium Cell",
            hours: "Seg a Sex: 8:00h as 18:00h<br> Sab: 08:00h as 17:00h",
            statusAberto: ".",
            horarios: {
              seg: [{ inicio: "08:00", fim: "18:00" }],
              ter: [{ inicio: "08:00", fim: "18:00" }],
              qua: [{ inicio: "08:00", fim: "18:00" }],
              qui: [{ inicio: "08:00", fim: "18:00" }],
              sex: [{ inicio: "08:00", fim: "18:00" }],
              sab: [{ inicio: "08:00", fim: "17:00" }],
              dom: [],
            },
            address: "R. Benedito Salles, 1076 - Carlopolis",
            contact: "(43) 99661-1347",
            instagram: "https://www.instagram.com/imperiumcell043/",
            novidadesImages: [
              "images/comercios/assistenciaCelular/imperiumCell/divulgacao/1.jpg",
              "images/comercios/assistenciaCelular/imperiumCell/divulgacao/2.jpg",
              "images/comercios/assistenciaCelular/imperiumCell/divulgacao/3.jpg",


            ],
            novidadesDescriptions: [
              " ",

            ],
          },


















          {
            image: "images/comercios/assistenciaCelular/oficinaCelular/oficinaCelular.png",
            name: "Oficina do Celular",
            hours: "Seg a Sex: 8:00h as 18:00h<br> Sab: 08:00h as 17:00h",
            statusAberto: ".",
            horarios: {
              seg: [{ inicio: "08:00", fim: "18:00" }],
              ter: [{ inicio: "08:00", fim: "18:00" }],
              qua: [{ inicio: "08:00", fim: "18:00" }],
              qui: [{ inicio: "08:00", fim: "18:00" }],
              sex: [{ inicio: "08:00", fim: "18:00" }],
              sab: [{ inicio: "08:00", fim: "17:00" }],
              dom: [],
            },
            address: "R. Dra. Paula e Silva, 676 - Carlopolis",
            contact: "(43) 3566-1600",
            facebook: "https://www.facebook.com/oficinadocelularclps/",
            instagram: "https://www.instagram.com/oficinadocelular_carlopolis/",
            novidadesImages: [
              "images/comercios/assistenciaCelular/oficinaCelular/divulgacao/1.jpg",
              "images/comercios/assistenciaCelular/oficinaCelular/divulgacao/2.jpg",

            ],
            novidadesDescriptions: [
              "CURTIR O POST!<br>• SEGUIR O INSTAGRAM DA LOJA!<br>• COMPARTILHAR NO STORY E MARCAR A LOJA!<br>• MARCAR 5 AMIGOS NOS COMENTÁRIOS (quanto mais amigos marcar, maior a chance de ganhar) obs: não pode marcar a mesma pessoa 2 vezes!<br>•Ganhador ou ganhadora deve estar seguindo todas as regras do sorteio corretamente, caso contrário será sorteado novamente!!!<br>O SORTEIO OCORRERÁ NO DIA 22/12/2025 BOA SORTE A TODOS",
              "Temos Assistencia Tecnica, todos modelos de celular"

            ],


            promocoes: [
              {
                imagem: "images/comercios/assistenciaCelular/oficinaCelular/promocao/1.jpg",
                titulo: "Pelicula 3D",
                precoAntigo: 20.00,
                preco: 15.00,
                unidade: "A UNIDADE",
                validadeFim: "2025-10-30",
                obs: "Oferta válida até durar o estoque",

              },

            ]
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
            contact2: "(43) 99610-1135",
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
            address: "R. Paul Harris, 98 - Carlópolis",
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
            statusAberto: "a",
            horarios: {
              dom: [{ inicio: "08:00", fim: "20:00" }],
              seg: [{ inicio: "08:00", fim: "20:00" }],
              ter: [{ inicio: "08:00", fim: "20:00" }],
              qua: [{ inicio: "08:00", fim: "20:00" }],
              qui: [{ inicio: "08:00", fim: "20:00" }],
              sex: [{ inicio: "08:00", fim: "20:00" }],
              sab: [{ inicio: "08:00", fim: "20:00" }]
            },
            address: "R. Ataliba Leonel, 287 - Carlopolis",
            contact: "(43) 99632-3898",
            infoAdicional: "Atendemos Emergêncas<br>Confecções de chaves automotivas<br>Confecções de chaves residenciasis<br>Abertua de veiculos<br>Abertura de residencias<br>Codificação de chaves automotivas<br>Codificação de controles residenciais",
            instagram: "https://www.instagram.com/chaveiro.central.77/",
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
        link: document.querySelector("#menuCalhas"),
        title: "Calhas",
        establishments: [


          {
            image: "images/comercios/calhas/nelson/perfil.jpg",
            name: "Nelson Calhas",
            hours: "Seg a Sex: 8:00h as 18:00h<br>Sab:08:0h as 12:00h",
            statusAberto: "a",
            horarios: {

              seg: [{ inicio: "08:00", fim: "18:00" }],
              ter: [{ inicio: "08:00", fim: "18:00" }],
              qua: [{ inicio: "08:00", fim: "18:00" }],
              qui: [{ inicio: "08:00", fim: "18:00" }],
              sex: [{ inicio: "08:00", fim: "18:00" }],
              sab: [{ inicio: "08:00", fim: "12:00" }],
              dom: [],
            },
            address: "Atendimento a domicílio",
            contact: "(43) 99938-8281",
            infoAdicional: "🏗️ Instalação de novas calhas<Br>🛠️ Reformas<Br>🧹 Manutenção e limpeza para residências e comércios<Br>💡 Soluções sob medida para evitar entupimentos e vazamentos<Br>✅ Garantia de funcionamento eficiente do seu sistema de calhas",
            facebook: "https://www.facebook.com/nelsoncalhaa",
            novidadesImages: [
              "images/comercios/calhas/nelson/divulgacao/1.jpg",
              "images/comercios/calhas/nelson/divulgacao/2.jpg",
              "images/comercios/calhas/nelson/divulgacao/3.jpg",
              "images/comercios/calhas/nelson/divulgacao/4.jpg",
              "images/comercios/calhas/nelson/divulgacao/5.jpg",
              "images/comercios/calhas/nelson/divulgacao/6.jpg",
              "images/comercios/calhas/nelson/divulgacao/7.jpg",
              "images/comercios/calhas/nelson/divulgacao/8.jpg",
              "images/comercios/calhas/nelson/divulgacao/9.jpg",
            ],
            novidadesDescriptions: [
              "Trabalho finalizado! Calhas limpas, instaladas e funcionando perfeitamente com a qualidade Nelson Calhas.",
              "Trabalho finalizado! Calhas limpas, instaladas e funcionando perfeitamente com a qualidade Nelson Calhas.",
              "Trabalho finalizado! Calhas limpas, instaladas e funcionando perfeitamente com a qualidade Nelson Calhas.",
              "Trabalho finalizado! Calhas limpas, instaladas e funcionando perfeitamente com a qualidade Nelson Calhas.",
              "Trabalho finalizado! Calhas limpas, instaladas e funcionando perfeitamente com a qualidade Nelson Calhas.",
              "Trabalho finalizado! Calhas limpas, instaladas e funcionando perfeitamente com a qualidade Nelson Calhas.",
              "Trabalho finalizado! Calhas limpas, instaladas e funcionando perfeitamente com a qualidade Nelson Calhas.",
              "Trabalho finalizado! Calhas limpas, instaladas e funcionando perfeitamente com a qualidade Nelson Calhas.",
              "Trabalho finalizado! Calhas limpas, instaladas e funcionando perfeitamente com a qualidade Nelson Calhas.",
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
            name: "Registro Civil e Imóveis",
            hours: "Seg a Sex: 8:30h as 11:00h - 13:00h as 17:00h",
            statusAberto: "a",
            horarios: {

              seg: [{ inicio: "08:30", fim: "11:00" }, { inicio: "13:00", fim: "17:00" }],
              ter: [{ inicio: "08:30", fim: "11:00" }, { inicio: "13:00", fim: "17:00" }],
              qua: [{ inicio: "08:30", fim: "11:00" }, { inicio: "13:00", fim: "17:00" }],
              qui: [{ inicio: "08:30", fim: "11:00" }, { inicio: "13:00", fim: "17:00" }],
              sex: [{ inicio: "08:30", fim: "11:00" }, { inicio: "13:00", fim: "17:00" }],
              sab: [],
              dom: [],
            },
            address: "R. Salvira Marquês, 453 - Carlópolis",
            contact: "(43) 99621-5094",
            infoAdicional: "📜 Registro de Imóveis<br>➡️ Segurança jurídica na compra, venda e regularização de imóveis<br><br>👨‍👩‍👧‍👦 Registro Civil<br>➡️ Certidões de nascimento, casamento e óbito com validade oficial<br><br>📂 Títulos e Documentos<br>➡️ Autenticação, registro e conservação de documentos importantes<br><br>🏢 Registro de Pessoas Jurídicas<br>➡️ Constituição, alteração e dissolução de empresas e associações.",


          },



          {
            image: "images/comercios/cartorio/tabelionatoNotas/perfil.jpg",
            name: "Tabelionato de Notas",
            hours: "Seg a Sex: 8:30h as 11:00h - 13:00h as 17:00h",
            statusAberto: "a",
            horarios: {

              seg: [{ inicio: "08:30", fim: "11:00" }, { inicio: "13:00", fim: "17:00" }],
              ter: [{ inicio: "08:30", fim: "11:00" }, { inicio: "13:00", fim: "17:00" }],
              qua: [{ inicio: "08:30", fim: "11:00" }, { inicio: "13:00", fim: "17:00" }],
              qui: [{ inicio: "08:30", fim: "11:00" }, { inicio: "13:00", fim: "17:00" }],
              sex: [{ inicio: "08:30", fim: "11:00" }, { inicio: "13:00", fim: "17:00" }],
              sab: [],
              dom: [],
            },
            address: "R. Antônio Jonas Ferreira Pinto, 279 - Carlópolis",
            contact: "(43) 99600-1801",
            infoAdicional: "📄 Ata Notarial<br>🖋️ Autenticação<br>📜 Carta de Sentença<br>📝 Declaração Pública<br>💔 Divórcio<br>👶 Emancipação<br>🏠 Escritura de Compra e Venda<br>🎁 Escritura de Doação<br>📂 Inventário<br>💍 Pacto Antenupcial<br>✒️ Reconhecimento de Firma<br>📑 Testamento Público<br>👥 União Estável<br>🗺️ Usucapião<br>📃 Certidões e E-Notariado",
            instagram: "https://www.instagram.com/tabelionatocarlopolispr/",
            novidadesImages: [

              "images/comercios/cartorio/tabelionatoNotas/divulgacao/1.jpg",
              "images/comercios/cartorio/tabelionatoNotas/divulgacao/2.jpg",

            ],

          },


        ],




      },





      {
        link: document.querySelector("#menuClinicaVeterinaria"),
        title: "Clinica Veterinaria",
        establishments: [


          {
            image: "images/comercios/clinicaVeterinaria/sued/perfil.jpg",
            name: "Sued Veterinária e Petshop",
            hours: "Seg a Sex: 08:30h as 18:00h <br>Sab: 08:30h a 12:00h",
            statusAberto: "a",
            horarios: {

              seg: [{ inicio: "08:30", fim: "18:00" }],
              ter: [{ inicio: "08:30", fim: "18:00" }],
              qua: [{ inicio: "08:30", fim: "18:00" }],
              qui: [{ inicio: "08:30", fim: "18:00" }],
              sex: [{ inicio: "08:30", fim: "18:00" }],
              sab: [{ inicio: "08:30", fim: "12:00" }],
              dom: [],
            },
            address: "Av. Elson Soares, 649 - Carlópolis",
            contact: "(43) 98851-3310 ",

            facebook: "https://www.facebook.com/clinicavetsued",
            instagram: "https://www.instagram.com/clinicasued.vet/",
            infoAdicional: "Agende o horario para banho e tosa!",
            novidadesImages: [

              "images/comercios/clinicaVeterinaria/sued/divulgacao/1.jpg",
              "images/comercios/clinicaVeterinaria/sued/divulgacao/2.jpg",
              "images/comercios/clinicaVeterinaria/sued/divulgacao/3.jpg",
              "images/comercios/clinicaVeterinaria/sued/divulgacao/4.jpg",
              "images/comercios/clinicaVeterinaria/sued/divulgacao/5.jpg",
            ],

            novidadesDescriptions: [
              "Os gatos são animais independentes, mas isso não significa que não precisam de cuidados especiais! Se liga nessas 3 dicas para garantir o bem-estar do seu bichano:",
              "Você sabia que manter a vacinação em dia é a forma mais eficaz de proteger seu pet contra doenças graves como raiva, leptospirose, cinomose e parvovirose?",
              "🛁 Seu pet merece um banho cheio de carinho! 🐶💛 Nada como um banho relaxante pra deixar seu amigo de quatro patas limpinho, cheiroso e feliz! Além de remover sujeiras e odores, o banho também ajuda a manter a pele e os pelos saudáveis.",
              "🐾 Castração é um ato de cuidado, amor e responsabilidade! Ao optar pela castração, você está garantindo mais saúde e bem-estar para o seu pet. Confira os principais benefícios",
              "💚 Amor pelos pets e dedicação para cuidar de quem você mais ama! Aqui, cada consulta, banho ou procedimento é feito com o máximo de carinho e profissionalismo. Nosso compromisso é garantir o bem-estar e a saúde do seu melhor amigo.",


            ],


          },


          {
            image: "images/comercios/clinicaVeterinaria/jurandir/perfil.png",
            name: "Veterinária Carlópolis",
            hours: "Seg a Sex: 09:00h as 18:00h <br>Sab: 09:00h a 17:00h",
            statusAberto: "a",
            horarios: {

              seg: [{ inicio: "09:00", fim: "18:00" }],
              ter: [{ inicio: "09:00", fim: "18:00" }],
              qua: [{ inicio: "09:00", fim: "18:00" }],
              qui: [{ inicio: "09:00", fim: "18:00" }],
              sex: [{ inicio: "09:00", fim: "18:00" }],
              sab: [{ inicio: "09:00", fim: "17:00" }],
              dom: [],
            },
            address: "Rua Ataliba Leonel, 410, Carlópolis, PR,",
            contact: "(43) 3566-1664",
            contact2: "(43) 99642-1494",
            facebook: "https://www.facebook.com/veterinariacarlopolis/?locale=pt_BR",
            instagram: "https://www.instagram.com/clinicavetcarlopolis/",
            infoAdicional: "Agende o horario para banho e tosa!",
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
            statusAberto: "a",
            horarios: {

              seg: [{ inicio: "08:00", fim: "18:00" }],
              ter: [{ inicio: "08:00", fim: "18:00" }],
              qua: [{ inicio: "08:00", fim: "18:00" }],
              qui: [{ inicio: "08:00", fim: "18:00" }],
              sex: [{ inicio: "08:00", fim: "18:00" }],
              sab: [{ inicio: "08:00", fim: "12:00" }],
              dom: [],
            },
            address: "Padre Hugo, 475 - Carlópolis",
            contact: "(43) 99606-1356",
            contact2: "(43) 3566-1383",
            instagram: "https://www.instagram.com/panaceaconfeccoes/",
            facebook: "https://www.facebook.com/panacea.conf/?locale=pt_BR",
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
              "images/comercios/feiraLua/divulgacao/1.jpg",
              "images/comercios/feiraLua/divulgacao/2.png",
              "images/comercios/feiraLua/divulgacao/3.png",
              "images/comercios/feiraLua/divulgacao/4.png",
              "images/comercios/feiraLua/divulgacao/5.png",
              "images/comercios/feiraLua/divulgacao/6.png",
              "images/comercios/feiraLua/divulgacao/7.png",
            ],

            novidadesDescriptions: [
              "Cantando para vocês Celso e Adriano <br>29/08 a partir das 19:00hrs",
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
            statusAberto: ".",
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
            statusAberto: ".",
            horarios: {
              seg: [{ inicio: "08:00", fim: "18:00" }],
              ter: [{ inicio: "08:00", fim: "18:00" }],
              qua: [{ inicio: "08:00", fim: "18:00" }],
              qui: [{ inicio: "08:00", fim: "18:00" }],
              sex: [{ inicio: "08:00", fim: "18:00" }],
              sab: [{ inicio: "08:00", fim: "18:00" }],
              dom: [],
            },
            address: "Rua Capitão Estácio, 329 - Carlópolis",
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
            statusAberto: ".",
            horarios: {
              seg: [{ inicio: "08:00", fim: "12:00" }, { inicio: "13:00", fim: "17:00" },],
              ter: [{ inicio: "08:00", fim: "12:00" }, { inicio: "13:00", fim: "17:00" },],
              qua: [{ inicio: "08:00", fim: "12:00" }, { inicio: "13:00", fim: "17:00" },],
              qui: [{ inicio: "08:00", fim: "12:00" }, { inicio: "13:00", fim: "17:00" },],
              sex: [{ inicio: "08:00", fim: "12:00" }, { inicio: "13:00", fim: "17:00" },],
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
        link: document.querySelector("#menuHotel"),
        title: "Hotel / Pousadas",
        establishments: [
          {
            image: "images/comercios/hotel/nortepioneiro/perfil.JPG",
            name: "Norte Pioneiro",
            hours: "24 horas",
            statusAberto: ".",
            horarios: {
              seg: [{ inicio: "00:00", fim: "23:59" }],
              ter: [{ inicio: "00:00", fim: "23:59" }],
              qua: [{ inicio: "00:00", fim: "23:59" }],
              qui: [{ inicio: "00:00", fim: "00:00" }],
              sex: [{ inicio: "00:00", fim: "23:59" }],
              sab: [{ inicio: "00:00", fim: "23:59" }],
              dom: [{ inicio: "00:00", fim: "23:59" }],
            },
            address: "Rua Benedito Sales, 556 - Carlópolis",

            contact: "(43) 99961-4308",
            contact2: "(43) 3566-2682",
            infoAdicional: "Temos 3 opções de quartos disponíveis. Os preços variam de acordo com cada quarto ( Opções com Banheiro Privativo e Ar-Condicionado).<Br><Br> Verifique a disponibilidade através dos nossos telefones.<Br>🛏️ 11 QUARTOS (7 SUÍTES)<Br>☕ CAFÉ DA MANHÃ<Br>📶 WI-FI GRÁTIS<Br>🛎️ RECEPÇÃO 24 HORAS<Br>🧊 FRIGOBAR<Br>❄️ AR-CONDICIONADO<Br>📺 TV<Br>🧴 TOALHAS DE BANHO<Br>🛁 KIT BANHO",
            instagram: "https://www.instagram.com/nortepioneirohotel/",
            site: "https://hotelnortepioneiro.com.br/",
            novidadesImages: [

              "images/comercios/hotel/nortepioneiro/divulgacao/1.jpg",
              "images/comercios/hotel/nortepioneiro/divulgacao/1.jpg",
              "images/comercios/hotel/nortepioneiro/divulgacao/1.jpg",
              "images/comercios/hotel/nortepioneiro/divulgacao/1.jpg",
              "images/comercios/hotel/nortepioneiro/divulgacao/1.jpg",

            ],
            novidadesDescriptions: [
              "",
              "",
              "",
              "",
              "",
              "",

            ],
          },


          {
            image: "images/comercios/hotel/pousadanortepioneiro/perfil.jpg",
            name: "Pousada Norte Pioneiro",
            hours: "Seg a Sex: 08:00h as 12:00h - 13:00h as 17:00h",
            statusAberto: ".",
            horarios: {
              seg: [{ inicio: "08:00", fim: "12:00" }, { inicio: "13:00", fim: "17:00" },],
              ter: [{ inicio: "08:00", fim: "12:00" }, { inicio: "13:00", fim: "17:00" },],
              qua: [{ inicio: "08:00", fim: "12:00" }, { inicio: "13:00", fim: "17:00" },],
              qui: [{ inicio: "08:00", fim: "12:00" }, { inicio: "13:00", fim: "17:00" },],
              sex: [{ inicio: "08:00", fim: "12:00" }, { inicio: "13:00", fim: "17:00" },],
              sab: [],
              dom: [],
            },
            address: "Rua Capitão Estacio, 800 - Carlópolis",

            contact: "(43) 99989-0255",

            infoAdicional: "Temos 3 opções de quartos disponíveis. Os preços variam de acordo com cada quarto ( Opções com Banheiro Privativo e Ar-Condicionado).<Br> Verifique a disponibilidade através dos nossos telefones.<Br>11 QUARTOS (7 SUÍTES)<Br>CAFÉ DA MANHÃ<Br>WI-FI GRÁTIS<Br>RECEPÇÃO 24 HORAS<Br>FRIGOBAR<Br>AR-CONDICIONADO<Br>TV<Br>TOALHAS DE BANHO<Br>KIT BANHO",
            instagram: "https://www.instagram.com/nortepioneirohotel/",
            site: "https://hotelnortepioneiro.com.br/",
            novidadesImages: [

              "images/comercios/hotel/nortepioneiro/divulgacao/1.jpg",
              "images/comercios/hotel/nortepioneiro/divulgacao/2.jpg",
              "images/comercios/hotel/nortepioneiro/divulgacao/3.jpg",
              "images/comercios/hotel/nortepioneiro/divulgacao/4.jpg",
              "images/comercios/hotel/nortepioneiro/divulgacao/5.jpg",
              "images/comercios/hotel/nortepioneiro/divulgacao/6.jpg",


            ],
            novidadesDescriptions: [
              "Suíte principal: Cama de casal box, banheiro espaçoso, armário, mesa, Tv, ar condicionado e frigobar.",
              "Quarto Duplo solteiro: Duas camas de solteiro, armário, mesa, Tv e frigobar",
              "Amplo espaço",
              "Cozinha aconchegante e familiar",
              "Quarto Duplo solteiro: Duas camas de solteiro, armário, mesa, Tv e frigobar",
              "Quarto Família: Cama de casal + cama de solteiro, armário, mesa, Tv, ar condicionado e frigobar. (Com ou sem banheiro, opcional).",


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
            statusAberto: ".",
            horarios: {

              seg: [{ inicio: "08:00", fim: "20:00" }],
              ter: [{ inicio: "08:00", fim: "20:00" }],
              qua: [{ inicio: "08:00", fim: "20:00" }],
              qui: [{ inicio: "08:00", fim: "20:00" }],
              sex: [{ inicio: "08:00", fim: "20:00" }],
              sab: [{ inicio: "08:00", fim: "12:00" }],
              dom: []
            },
            address: "Rua Benedito Salles n°1.033 - Carlópolis",
            contact: "(43) 99686-4716",
            infoAdicional: "Somos Correspondente Caixa",
            instagram: "https://www.instagram.com/imobiliariacarlopolis/",
            facebook: "https://www.facebook.com/imobiliariacarlopolis/?locale=pt_BR",
            site: "https://www.imobiliariacarlopolis.com.br/",
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
            statusAberto: ".",
            horarios: {
              seg: [{ inicio: "13:00", fim: "18:30" }],
              ter: [{ inicio: "13:00", fim: "18:30" }],
              qua: [{ inicio: "13:00", fim: "18:30" }],
              qui: [{ inicio: "13:00", fim: "18:30" }],
              sex: [{ inicio: "13:00", fim: "18:30" }],
              sab: [{ inicio: "13:00", fim: "18:30" }],
              dom: [{ inicio: "13:00", fim: "18:30" }]
            },
            address: "R. Benedito Salles, 2639 - Carlópolis",
            contact: "(43) 99977-8839",
            instagram: "https://www.instagram.com/caldodecanaamaral/",
            facebook: "https://www.facebook.com/CaldodecanaAmaral",
            delivery: "Sim / Com Taxa",
            infoAdicional: "<a target='_blank' style='color:#2da6ff;' href='https://www.youtube.com/watch?v=LkTSbakmFrE'>Conheça nossas especiarias!</a>",
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
            statusAberto: ".",
            horarios: {

              seg: [],
              ter: [{ inicio: "18:00", fim: "23:30" }],
              qua: [{ inicio: "18:00", fim: "23:30" }],
              qui: [{ inicio: "18:00", fim: "23:30" }],
              sex: [{ inicio: "18:00", fim: "23:30" }],
              sab: [{ inicio: "18:00", fim: "23:30" }],
              dom: [{ inicio: "18:00", fim: "23:30" }]
            },
            address: "R. Padre Hugo, 478 - Carlópolis",
            contact: "(43) 99604-9187",
            delivery: "Sim / Com Taxa",
            instagram: "https://www.instagram.com/cantinhodapraca043/",
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
            image: "images/comercios/lanchonete/celeiro/perfil.png",
            name: "Celeiro",
            hours: "Sex: 19:00h as 23:00h",
            statusAberto: ".",
            horarios: {
              seg: [],
              ter: [],
              qua: [],
              qui: [],
              sex: [{ inicio: "19:00", fim: "23:00" }],
              sab: [],
              dom: []
            },
            infoAdicional: "Realizamos Eventos Particulares, Festas, servindo muitas variedades de espetinhos e temos tambem Chop!",
            address: "Feira da Lua",
            contact: "(43) 99965-2084",

            novidadesImages: [
              "images/comercios/lanchonete/celeiro/divulgacao/1.png",


            ],
            novidadesDescriptions: [
              "Eventos Publicos",

            ],
          },



          {
            image: "images/comercios/lanchonete/didog/perfil.png",
            name: "Di Dog",
            hours: "Seg a Dom: 19:00h as 23:30h",
            statusAberto: ".",
            horarios: {

              seg: [{ inicio: "19:00", fim: "23:30" }],
              ter: [{ inicio: "19:00", fim: "23:30" }],
              qua: [{ inicio: "19:00", fim: "23:30" }],
              qui: [{ inicio: "19:00", fim: "23:30" }],
              sex: [{ inicio: "19:00", fim: "23:30" }],
              sab: [{ inicio: "19:00", fim: "23:30" }],
              dom: [{ inicio: "19:00", fim: "23:30" }]
            },
            address: "R. Benedito Salles, 380 - Carlopolis",
            contact: "(43) 99161-8381",
            delivery: "Sim / Com Taxa",
            instagram: "https://www.instagram.com/didog_prensados/",
            menuImages: [
              "images/comercios/lanchonete/didog/cardapio/1.png",
              "images/comercios/lanchonete/didog/cardapio/2.png",
              "images/comercios/lanchonete/didog/cardapio/3.png",


            ], novidadesImages: [

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
            hours: "Ter a Sab: 11:00h as 23:00h",
            statusAberto: ".",
            horarios: {

              seg: [],
              ter: [{ inicio: "11:00", fim: "23:00" }],
              qua: [{ inicio: "11:00", fim: "23:00" }],
              qui: [{ inicio: "11:00", fim: "23:00" }],
              sex: [{ inicio: "11:00", fim: "23:00" }],
              sab: [{ inicio: "11:00", fim: "23:00" }],
              dom: []
            },
            address: "Av. Turística Elias Mansur, 738 - Carlopolis",
            contact: "(43) 99105-6257",
            delivery: "Sim / Com Taxa",

            infoAdicional: "<a target='_blank' style='color:#2da6ff;' href='https://pediucomeu.com.br/espacogourmet' >Cardapio On Line</a>",


            facebook: "https://www.facebook.com/p/Espa%C3%A7o-Gourmet-100063553480172/",
            instagram: "https://www.instagram.com/lsor.veteriaespacogourmet?igsh=MTF0OXdzdDF6dDA5aQ%3D%3D&utm_source=qr",

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
            hours: "Seg a Sab: 09:30h as 19:30h",
            statusAberto: ".",
            horarios: {
              seg: [{ inicio: "09:30", fim: "19:30" }],
              ter: [{ inicio: "09:30", fim: "19:30" }],
              qua: [{ inicio: "09:30", fim: "19:30" }],
              qui: [{ inicio: "09:30", fim: "19:30" }],
              sex: [{ inicio: "09:30", fim: "19:30" }],
              sab: [{ inicio: "09:30", fim: "19:30" }],
              dom: []
            },
            address: "R. Benedito Salles, 1233 - Carlopolis",
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
            image: "images/comercios/lanchonete/levisalgados/perfil.jpg",
            name: "Levi Salgados",
            hours: "Seg a Sab: 08:00h as 19:00h",
            statusAberto: ".",
            horarios: {
              seg: [{ inicio: "08:00", fim: "19:00" }],
              ter: [{ inicio: "08:00", fim: "19:00" }],
              qua: [{ inicio: "08:00", fim: "19:00" }],
              qui: [{ inicio: "08:00", fim: "19:00" }],
              sex: [{ inicio: "08:00", fim: "19:00" }],
              sab: [{ inicio: "08:00", fim: "19:00" }],
              dom: []
            },
            address: "R. Padre Hugo, 488 , Carlópolis",
            contact: "(43) 98850-7966",
            delivery: "Sim / Com Taxa",
            instagram: "https://www.instagram.com/levisalgados.clps/",
            novidadesImages: [
              "images/comercios/lanchonete/levisalgados/divulgacao/1.png",
              "images/comercios/lanchonete/levisalgados/divulgacao/2.png",

            ],
            novidadesDescriptions: [

              "A melhor coxinha da cidade!",
              "Mais uma novidade na loja, nosso delicioso kibe com queijo! Uma nova sensação a cada mordida 🥰Venha experimentar 🤤",



            ],

          },




          {
            image: "images/comercios/sorveteria/limone/limone.png",
            name: "Limone",
            hours: "Seg a Sab: 13:00h as 23:00h<br>Dom: 14:00h as 00:00h",
            statusAberto: ".",
            horarios: {
              seg: [{ inicio: "13:00", fim: "23:00" }],
              ter: [{ inicio: "13:00", fim: "23:00" }],
              qua: [{ inicio: "13:00", fim: "23:00" }],
              qui: [{ inicio: "13:00", fim: "23:00" }],
              sex: [{ inicio: "13:00", fim: "23:00" }],
              sab: [{ inicio: "13:00", fim: "23:00" }],
              dom: [{ inicio: "14:00", fim: "00:00" }],
            },
            address: "R. Benedito Salles, 619 - Carlopolis",
            contact: "(43) 99922-8336",
            contact2: "(43) 98863-3040",
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
            image: "images/comercios/lanchonete/kidog/perfil.png",
            name: "Ki Dog lanches",
            hours: "Ter a Dom: 18:00h as 23:30h",
            statusAberto: ".",
            horarios: {

              seg: [],
              ter: [{ inicio: "18:00", fim: "23:30" }],
              qua: [{ inicio: "18:00", fim: "23:30" }],
              qui: [{ inicio: "18:00", fim: "23:30" }],
              sex: [{ inicio: "18:00", fim: "23:30" }],
              sab: [{ inicio: "18:00", fim: "23:30" }],
              dom: [{ inicio: "18:00", fim: "23:30" }]
            },
            address: "R. Padre Hugo, 463 - Carlópolis",
            contact: "(43) 99952-7826",
            delivery: "Sim / Com Taxa",
            facebook: "https://www.facebook.com/p/Ki-dog-lanches-100063348873193/",

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
            hours: "Seg: Fechado<br>Ter a Qui: 13:00h as 19:00h <br>Sex: 13:00h as 18:00h<br>Sab e Dom: 13:00h as 20:00h",
            statusAberto: ".",
            horarios: {

              seg: [],
              ter: [{ inicio: "13:00", fim: "19:00" }],
              qua: [{ inicio: "13:00", fim: "19:00" }],
              qui: [{ inicio: "13:00", fim: "19:00" }],
              sex: [{ inicio: "13:00", fim: "19:00" }],
              sab: [{ inicio: "13:00", fim: "20:00" }],
              dom: [{ inicio: "13:00", fim: "20:00" }]
            },
            address: "R. Benedito Salles, 1205 - Carlopolis",
            contact: "(43) 99126-5705",
            delivery: "Não",
            instagram: "https://www.instagram.com/mycoffeecarlopolis/",
            novidadesImages: [

              "images/comercios/lanchonete/mycoffe/divulgacao/1.png",
              "images/comercios/lanchonete/mycoffe/divulgacao/2.png",
              "images/comercios/lanchonete/mycoffe/divulgacao/3.png",
              "images/comercios/lanchonete/mycoffe/divulgacao/4.png",
              "images/comercios/lanchonete/mycoffe/divulgacao/5.png",


            ],
          },




          {
            image: "images/comercios/lanchonete/mrpotato/perfil.jpg",
            name: "Mr Potato",
            hours: "Qui a Ter: 18:30h as 23:00h",
            statusAberto: ".",
            horarios: {

              seg: [{ inicio: "18:30", fim: "23:00" }],
              ter: [{ inicio: "18:30", fim: "23:00" }],
              qua: [],
              qui: [{ inicio: "18:30", fim: "23:00" }],
              sex: [{ inicio: "18:30", fim: "23:00" }],
              sab: [{ inicio: "18:30", fim: "23:00" }],
              dom: [{ inicio: "18:30", fim: "23:00" }]
            },
            address: "Somente Delivery",
            contact: "(43) 99128-0341",
            delivery: "Sim / Com Taxa",
            instagram: "https://www.instagram.com/mr.potato_carlopolis/",

            infoAdicional: "<a target='_blank' style='color:#2da6ff;' href='https://mrpotato-2.ola.click/products?utm_source=Chatbot&utm_campaign=greetings.open%F0%9F%8D%9F%F0%9F%94%A5'  >Cardapio On Line</a><br>Abrangência da entrega: CENTRO, VISTA ALEGRE, VISTA BELLA, TOMODATI, NOVO HORIZONTE 1, NOVO HORIZONTE 2, NOVO HORIZONTE 3, ITALIA, MURADOR, BELA VISTA, EL DORADO, AMARAL, ILHA BELLA, CTG, outro, ATRÁS DO CAMPO",
            cardapioLink: "https://mrpotato-2.ola.click/products?utm_source=Chatbot&utm_campaign=greetings.open%F0%9F%8D%9F%F0%9F%94%A5",
            menuImages: [
              "images/comercios/lanchonete/mrpotato/cardapio/1.jpg",
              "images/comercios/lanchonete/mrpotato/cardapio/2.jpg",
              "images/comercios/lanchonete/mrpotato/cardapio/3.jpg",
              "images/comercios/lanchonete/mrpotato/cardapio/4.jpg",
              "images/comercios/lanchonete/mrpotato/cardapio/5.jpg",
              "images/comercios/lanchonete/mrpotato/cardapio/6.jpg",

            ],


            novidadesImages: [
              "images/comercios/lanchonete/mrpotato/divulgacao/1.jpg",
              "images/comercios/lanchonete/mrpotato/divulgacao/2.jpg",
              "images/comercios/lanchonete/mrpotato/divulgacao/3.jpg",
              "images/comercios/lanchonete/mrpotato/divulgacao/4.jpg",


            ],

            novidadesDescriptions: [
              "Umas das mais aclamadas…<br> MR. Potato Chef: Batata recheada com costela de boi desfiada e cream cheese, trazendo um sabor defumado irresistível. Ideal para quem busca um sabor intenso e marcante.<Br><Br> E também a outra opção de Frango com cheddar e bacon: Batata recheada com frango desfiado, cheddar cremoso e pedacinhos crocantes de bacon. Acompanha cebolinha para um toque especial.",
              "",
              "",
              "Fazemos com muito carinho e dedicação para ser incrível no visual e espetacular no sabor!",


            ],
          },



          {
            image: "images/comercios/lanchonete/pracaLanches/perfil.jpg",
            name: "Praça Lanches",
            hours: "Qua a Seg: 18:30h as 23:00h",
            statusAberto: ".",
            horarios: {

              seg: [{ inicio: "18:30", fim: "23:00" }],
              ter: [],
              qua: [{ inicio: "18:30", fim: "23:00" }],
              qui: [{ inicio: "18:30", fim: "23:00" }],
              sex: [{ inicio: "18:30", fim: "23:00" }],
              sab: [{ inicio: "18:30", fim: "23:00" }],
              dom: [{ inicio: "18:30", fim: "23:00" }]
            },
            address: "R. Padre Hugo, 463 - Carlópolis",
            contact: "(43) 98830-2776",
            delivery: "Sim / Com Taxa",
            facebook: "https://www.facebook.com/people/Pra%C3%A7a-lanches/100063527200560/?rdid=AGSo5y3TPRtYDFnG&share_url=https%3A%2F%2Fwww.facebook.com%2Fshare%2F16aKgCqDDv%2F",

            novidadesImages: [

              "images/comercios/lanchonete/pracaLanches/divulgacao/1.jpg",
              "images/comercios/lanchonete/pracaLanches/divulgacao/2.jpg",
              "images/comercios/lanchonete/pracaLanches/divulgacao/3.jpg",
              "images/comercios/lanchonete/pracaLanches/divulgacao/4.jpg",
              "images/comercios/lanchonete/pracaLanches/divulgacao/5.jpg",
              "images/comercios/lanchonete/pracaLanches/divulgacao/6.jpg",
              "images/comercios/lanchonete/pracaLanches/divulgacao/7.jpg",
              "images/comercios/lanchonete/pracaLanches/divulgacao/8.jpg",
              "images/comercios/lanchonete/pracaLanches/divulgacao/9.jpg",
            ],

            novidadesDescriptions: [
              "Nossa Variedade para sua escolha!",
              "Dogão muito bem recheado!",
              "Cortamos ao meio, praticidade na hora da fome",
              "X-Gaucho!",
              "X-Gaucho!",
              "Aquele Dogão no capricho!",
              "Temos Pizzas tambem!",
              "Pizzas de 8 pedaços",
              "Pizza Recheadissima!",

            ],
          },



          {
            image: "images/comercios/lanchonete/casarao/faxada_casarao.png",
            name: "O Casarao",
            hours: "Ter a Dom: 18:00h as 00:30h",
            statusAberto: ".",
            horarios: {

              seg: [],
              ter: [{ inicio: "18:00", fim: "00:30" }],
              qua: [{ inicio: "18:00", fim: "00:30" }],
              qui: [{ inicio: "18:00", fim: "00:30" }],
              sex: [{ inicio: "18:00", fim: "00:30" }],
              sab: [{ inicio: "18:00", fim: "00:30" }],
              dom: [{ inicio: "18:00", fim: "00:30" }]
            },
            address: "R. Benedito Salles, 1340 - Carlopolis",
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
            statusAberto: ".",
            horarios: {
              seg: [{ inicio: "18:00", fim: "23:00" }],
              ter: [{ inicio: "18:00", fim: "23:00" }],
              qua: [],
              qui: [{ inicio: "18:00", fim: "23:00" }],
              sex: [{ inicio: "18:00", fim: "23:00" }],
              sab: [{ inicio: "18:00", fim: "23:00" }],
              dom: [{ inicio: "18:00", fim: "23:00" }]
            },
            address: "R. Benedito Salles, 1188 - Carlópolis",
            contact: "(43) 99957-6197",
            delivery: "Sim / Com Taxa",
            instagram: "https://www.instagram.com/_xisbauinea/",

            menuImages: [
              "images/comercios/lanchonete/xisBauinea/cardapio/1.png",
              "images/comercios/lanchonete/xisBauinea/cardapio/2.png",

            ],
            novidadesImages: [

              "images/comercios/lanchonete/xisBauinea/divulgacao/1.jpg",
              "images/comercios/lanchonete/xisBauinea/divulgacao/2.jpg",
              "images/comercios/lanchonete/xisBauinea/divulgacao/3.jpg",
              "images/comercios/lanchonete/xisBauinea/divulgacao/4.jpg",
              "images/comercios/lanchonete/xisBauinea/divulgacao/5.jpg",

            ],
            novidadesDescriptions: [
              "Xis Bacon adicional de frango desfiado ao molho",
              "Xis Calabacon",
              "Xis Bacon",
              "Xis Salada com adicional de frango desfiado ao molho",
              "Cachorro Quente simples com adicional de bacon",


            ],
          },



        ],
      },




      {
        link: document.querySelector("#menuLavaRapido"),
        title: "Lava Rapido",
        establishments: [
          {
            image: "images/comercios/lavaRapido/leozin/perfil.jpg",
            name: "Leozin Detailer",
            hours: "Seg a Sex: 08:30h as 18:00h<br>Sab: 08:00h as 13:00",
            statusAberto: ".",
            horarios: {
              seg: [{ inicio: "08:30", fim: "18:00" }],
              ter: [{ inicio: "08:30", fim: "18:00" }],
              qua: [{ inicio: "08:30", fim: "18:00" }],
              qui: [{ inicio: "08:30", fim: "18:00" }],
              sex: [{ inicio: "08:30", fim: "18:00" }],
              sab: [{ inicio: "08:30", fim: "13:00" }],
              dom: [],
            },
            address: "R. Benedito Salles, 1284 - Carlopolis",
            contact: "(43) 99166-0168",
            instagram: "https://www.instagram.com/leozin_detailer/",
            infoAdicional: "📗 <a href='images/comercios/lavaRapido/leozin/divulgacao/catalogo.pdf' target='_blank' rel='noopener'><br>Acesse Nosso Catálogo</a><Br>🚘 Lavagem Tradicional e Detalhada <Br>🚘 Polimento Tecnico e Comercial<br>🚘 Polimento em Farois<br>🚘 Vitrificação<br>🚘 Higienização<br>🚘 Enceramento<br>🚘 Limpeza de Bancos e Estofados<br>🚘 Higienização de Bancos de Couro",
            novidadesImages: [


              "images/comercios/lavaRapido/leozin/divulgacao/1.jpg",
              "images/comercios/lavaRapido/leozin/divulgacao/2.jpg",
              "images/comercios/lavaRapido/leozin/divulgacao/3.jpg",
              "images/comercios/lavaRapido/leozin/divulgacao/4.jpg",
              "images/comercios/lavaRapido/leozin/divulgacao/5.jpg",
              "images/comercios/lavaRapido/leozin/divulgacao/6.jpg",

            ],

            novidadesDescriptions: [
              "Agende e garanta teu atendimento exclusivo!",
              "Garantido e especializado!",
              "Amplo espaço e preparado para um trabalho de qualidade",
              "Produtos importados com o minimo de agreção a sua pintura",
              "Polimento Tecnico e Proteção",
              "Lavagem Detalhada",


            ],

          },
        ],
      },



      {
        link: document.querySelector("#menuPiscina"),
        title: "Piscinas",
        establishments: [
          {
            image: "images/comercios/piscina/mhpiscinas/perfil.jpg",
            name: "MH Piscinas",
            hours: "Seg a Sex: 07:30h as 17:30h",
            statusAberto: ".",
            horarios: {
              seg: [{ inicio: "07:30", fim: "17:30" }],
              ter: [{ inicio: "07:30", fim: "17:30" }],
              qua: [{ inicio: "07:30", fim: "17:30" }],
              qui: [{ inicio: "07:30", fim: "17:30" }],
              sex: [{ inicio: "07:30", fim: "17:30" }],
              sab: [],
              dom: [],
            },
            address: "Atendimento a domicílio",
            contact: "(43) 99985-4044",
            instagram: "https://www.instagram.com/mhpiscinas/",
            infoAdicional: "⏲️ Instalação de timer<br>🧪 + 🧹 Limpezas química e física<br>🏖️ Troca de areia<br>💧 Recuperação de água,",
            novidadesImages: [

              "images/comercios/piscina/mhpiscinas/divulgacao/1.jpg",

            ],

            novidadesDescriptions: [
              "Sua Piscina merece um cuidado especial! <br>Com a MhPiscinas voce pode contar!",


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
            image: "images/comercios/pizzaria/fornalha/perfil.jpg",
            name: "Fornalha Pizzaria",
            hours: "Qua a Qui: 18:00h as 23:00h </br>Sex a Sab: 18:00h as 00:00h </br> Dom: 18:00 as 23:00h",
            statusAberto: ".",
            horarios: {
              seg: [],
              ter: [],
              qua: [{ inicio: "18:00", fim: "23:00" }],
              qui: [{ inicio: "18:00", fim: "23:00" }],
              sex: [{ inicio: "18:00", fim: "00:00" }],
              sab: [{ inicio: "18:00", fim: "00:00" }],
              dom: [{ inicio: "18:00", fim: "23:00" }],
            },
            address: "R. Benedito Salles, 837 - Carlopolis",
            contact: "(43) 99632-1310",
            delivery: "Sim / Com Taxa",
            facebook: "https://www.facebook.com/p/Fornalha-Fornalha-100054510698755/?locale=pt_BR",
            instagram: "https://www.instagram.com/_fornalhapizzaria_/",
            infoAdicional: "<a target='_blank' style='color:#2da6ff;' href='https://fornalha.menudino.com/'  >Cardapio On Line</a>",
            cardapioLink: "https://fornalha.menudino.com/",

            novidadesImages: [

              "images/comercios/pizzaria/fornalha/divulgacao/1.png",
              "images/comercios/pizzaria/fornalha/divulgacao/2.png",
              "images/comercios/pizzaria/fornalha/divulgacao/3.png",
              "images/comercios/pizzaria/fornalha/divulgacao/4.png",
              "images/comercios/pizzaria/fornalha/divulgacao/5.png",
              "images/comercios/pizzaria/fornalha/divulgacao/6.jpg",
            ],
            novidadesDescriptions: [

              "",
              "",
              "",
              "",
              "",
              "Temos um Amplo espaço para realizar seu evento!",

            ]
          },




          {
            image: "images/comercios/pizzaria/happyhour/perfil.jpg",
            name: "Happy Hour",
            hours: "Seg a Ter: 07:00h as 18:00h<br>Qua a Sex: 07:00 as 23:00<br>Sab: 07:00h as 14:00h - 18:00 as 23:00<br>Dom: 18:00h as 23:00h",
            statusAberto: ".",
            horarios: {
              seg: [{ inicio: "07:00", fim: "18:00" }],
              ter: [{ inicio: "07:00", fim: "18:00" }],
              qua: [{ inicio: "07:00", fim: "23:00" }],
              qui: [{ inicio: "07:00", fim: "23:00" }],
              sex: [{ inicio: "07:00", fim: "23:00" }],
              sab: [{ inicio: "07:00", fim: "14:00" }, { inicio: "18:00", fim: "23:00" }],
              dom: [{ inicio: "18:00", fim: "23:00" }],
            },
            address: "R. Kalil Keder, 753 - Carlopolis",
            contact: "(43) 99636-3463",
            delivery: "Sim / Com Taxa",

            menuImages: [
              "images/comercios/pizzaria/happyhour/cardapio/1.jpg",

              "images/comercios/pizzaria/happyhour/cardapio/2.jpg",
              "images/comercios/pizzaria/happyhour/cardapio/3.jpg",
              "images/comercios/pizzaria/happyhour/cardapio/4.jpg",
              "images/comercios/pizzaria/happyhour/cardapio/5.jpg",
              "images/comercios/pizzaria/happyhour/cardapio/6.jpg",



            ],


            novidadesImages: [

              "images/comercios/pizzaria/happyhour/divulgacao/1.jpg",
              "images/comercios/pizzaria/happyhour/divulgacao/2.jpg",
              "images/comercios/pizzaria/happyhour/divulgacao/3.jpg",
              "images/comercios/pizzaria/happyhour/divulgacao/4.jpg",

            ],
            novidadesDescriptions: [

              "",
              "",
              "",
              "",
              "",


            ]
          },














          {
            image: "images/comercios/pizzaria/tonnyPizzaria/perfil.png",
            name: "Tonny Pizzaria",
            hours: "Seg a Ter: 18:00h as 23:30h <br> Qua: Fechado<br>Qui a Dom: 18:00h as 23:30h",
            statusAberto: ".",
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



      {
        link: document.querySelector("#menuPeixaria"),
        title: "Peixaria",
        establishments: [
          {
            image: "images/comercios/peixaria/coopanorpi/perfil.jpg",
            name: "Coopanorpi",
            hours: "Dom a Dom: 07:00h as 18:00h",
            statusAberto: ".",
            horarios: {
              seg: [{ inicio: "07:00", fim: "18:30" }],
              ter: [{ inicio: "07:00", fim: "18:30" }],
              qua: [{ inicio: "07:00", fim: "18:30" }],
              qui: [{ inicio: "07:00", fim: "18:30" }],
              sex: [{ inicio: "07:00", fim: "18:30" }],
              sab: [{ inicio: "07:00", fim: "18:30" }],
              dom: [{ inicio: "07:00", fim: "18:30" }],
            },
            address: "PR-218, km 1 - Passos do Leite, Carlópolis",
            contact: " (14) 98130-9957",
            delivery: "Não",
            facebook: "https://www.facebook.com/p/Coopanorpi-Cooperativa-de-Pescadores-e-Aquicultores-do-Norte-Pioneiro-100063664195364/",
            instagram: "https://www.instagram.com/coopanorpi/",

            novidadesImages: [

              "images/comercios/peixaria/coopanorpi/divulgacao/1.jpg",
              "images/comercios/peixaria/coopanorpi/divulgacao/2.jpg",
              "images/comercios/peixaria/coopanorpi/divulgacao/3.jpg",
              "images/comercios/peixaria/coopanorpi/divulgacao/4.jpg",
              "images/comercios/peixaria/coopanorpi/divulgacao/5.jpg",



            ],
            novidadesDescriptions: [
              "Variedades em peixes frescos",
              "Camarao  Barbas",
              "Filé de Tilapia",
              "Postas de Tilapia",
              "Pintado",

            ],
          },
        ],
      },




      {
        link: document.querySelector("#menuCorretoraSeguros"),
        title: "Corretora de Seguros",
        establishments: [
          {
            image: "images/comercios/corretoraSeguros/promissor/perfil.jpg",
            name: "Promissor Seguros",
            hours: "Seg a Sex: 08:00h as 18:00h",
            statusAberto: ".",
            horarios: {
              seg: [{ inicio: "08:00", fim: "18:00" }],
              ter: [{ inicio: "08:00", fim: "18:00" }],
              qua: [{ inicio: "08:00", fim: "18:00" }],
              qui: [{ inicio: "08:00", fim: "18:00" }],
              sex: [{ inicio: "08:00", fim: "18:00" }],
              sab: [],
              dom: [],
            },
            address: "Rua Fidêncio de Melo, 240 - Sala B, Carlópolis",
            contact: " (43) 99144-7164",
            contact2: " (43) 99197-9235",
            instagram: "https://www.instagram.com/promissorseguroscarlopolis/",

            novidadesImages: [

              "images/comercios/corretoraSeguros/promissor/divulgacao/1.jpg",
              "images/comercios/corretoraSeguros/promissor/divulgacao/2.jpg",
              "images/comercios/corretoraSeguros/promissor/divulgacao/3.jpg",
              "images/comercios/corretoraSeguros/promissor/divulgacao/4.jpg",
              "images/comercios/corretoraSeguros/promissor/divulgacao/5.jpg",
              "images/comercios/corretoraSeguros/promissor/divulgacao/6.jpg",
              "images/comercios/corretoraSeguros/promissor/divulgacao/7.jpg",
              "images/comercios/corretoraSeguros/promissor/divulgacao/8.jpg",
              "images/comercios/corretoraSeguros/promissor/divulgacao/9.jpg",
              "images/comercios/corretoraSeguros/promissor/divulgacao/10.jpg",




            ],
            novidadesDescriptions: [
              "Viajar é viver novas experiências — e estar protegido é parte essencial desse roteiro.<Br>Com um bom seguro, você garante assistência médica, cobertura de bagagem, suporte em imprevistos e muito mais.<Br>🌍 Vá longe. Mas vá seguro.",
              "Seu veículo é mais que um meio de transporte — é parte do seu patrimônio.<BR>Não deixe seu patrimônio desprotegido.<BR>Conte com um seguro que oferece a proteção que você merece, para dirigir tranquilo em qualquer situação. 🔒 🚗",
              "🚛 Seguro de frotas: a ferramenta poderosa para sua empresa!<br>Se você quer mais economia, proteção e segurança na gestão dos seus veículos, essa é a solução ideal.<br>Garanta tranquilidade para sua operação e cuide do seu patrimônio com quem entende do assunto.",

              "🏡✨ Tranquilidade começa com proteção!<Br>Seu lar é o seu refúgio — e merece estar sempre seguro.<Br>Com o seguro residencial certo, você protege não só o imóvel, mas também todos os seus momentos mais importantes.",

              "🚁 Com essa tecnologia, o produtor ganha em agilidade, economia e melhores resultados na lavoura. Monitoramento detalhado, aplicação precisa e muito mais controle, tudo do alto!<Br>E para proteger esse investimento tecnológico, conte com o seguro especializado para drones. Segurança que acompanha a inovação no campo!",
              "Imprevistos acontecem — e quando você trabalha por conta própria, qualquer erro pode virar um grande prejuízo!<br>O Seguro de Responsabilidade Civil protege você de danos involuntários causados a terceiros durante a sua atividade profissional.<br>📌 Desde um equipamento que quebra até um serviço que não sai como o esperado, você não precisa arcar com tudo sozinho.<br>💬 Fale com a gente e descubra como esse seguro pode te dar mais tranquilidade para focar no que você faz de melhor.",

              "Hoje, o celular carrega muito mais do que contatos e fotos…<br>Ele guarda sua vida digital, seus acessos, seu trabalho, sua rotina.<br>🔐 Um bom seguro pode evitar transtornos e garantir reposição rápida.<br>Fale com a Promissor e proteja seu aparelho com quem entende do assunto!",
              "O frio chega de repente, mas a proteção pode estar garantida com antecedência…<Br>🌬❄ Se você cultiva e se dedica ao campo, não deixe a geada te pegar desprevenido.<Br>📲 Fale com a Promissor e conheça as opções de seguro agrícola com cobertura para GEADA, ideal para proteger sua lavoura neste inverno. Link direto na Bio!",

              "A estrada pode ser cheia de desafios, mas com a proteção certa, você pode aproveitar cada momento com mais tranquilidade. Tenha sempre um seguro para garantir sua segurança em qualquer imprevisto! 🏍️✅<br>⚠️ Não arrisque, proteja-se! Fale com a Promissor e saiba como garantir o seu seguro. 📲",

              "🐶🐱💙 Proteção e cuidado para quem você ama! 💙🐾<br>Seu pet faz parte da família e merece toda a segurança e assistência necessárias para viver com saúde e bem-estar. Com a cobertura certa, você garante tranquilidade para qualquer imprevisto!",
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
            hours: "Sex a Dom: 09:30h as 18:00h",
            statusAberto: ".",
            horarios: {
              seg: [],
              ter: [],
              qua: [],
              qui: [],
              sex: [{ inicio: "09:30", fim: "18:00" }],
              sab: [{ inicio: "09:30", fim: "18:00" }],
              dom: [{ inicio: "09:30", fim: "18:00" }],
            },
            address: "Rod. Jose Alves Pereira - Carlopolis",
            contact: "(43) 98808-1911",
            delivery: "Sim / Com Taxa",


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
            hours: "Seg a Sex: 06:00h as 19:00h<br>Sab: 08:00h as 17:00h<br>Dom: 08:00h as 12:00h",
            statusAberto: ".",
            horarios: {
              seg: [{ inicio: "06:00", fim: "19:00" }],
              ter: [{ inicio: "06:00", fim: "19:00" }],
              qua: [{ inicio: "06:00", fim: "19:00" }],
              qui: [{ inicio: "06:00", fim: "19:00" }],
              sex: [{ inicio: "06:00", fim: "19:00" }],
              sab: [{ inicio: "08:00", fim: "17:00" }],
              dom: [{ inicio: "08:00", fim: "12:00" }],
            },
            address: "R. Januario Francisco Falarz, 128 - Carlópolis",
            contact: "(43) 99628-6686",
            contact2: "(43) 3566-2328",
            facebook: "https://www.facebook.com/carlopolitanafm/?locale=pt_BR",
            instagram: "https://www.instagram.com/carlopolitanafm/",
            site: "https://www.carlopolitanafm.com.br/?fbclid=PAZXh0bgNhZW0CMTEAAad8PhwvElNeRofoPTlpyFT1nz4Uh9etElI-3EtwgvmWVFQyKt0FxbPmWizd0Q_aem_27nMAxQanrHJ1awpU0BLTA",


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
            image: "images/comercios/sorveteria/fortyshake/perfil.jpg",
            name: "Forty Shake",
            hours: "Dom a Dom: 13:00h as 23:00h",
            statusAberto: ".",
            horarios: {
              seg: [{ inicio: "13:00", fim: "23:00" }],
              ter: [{ inicio: "13:00", fim: "23:00" }],
              qua: [{ inicio: "13:00", fim: "23:00" }],
              qui: [{ inicio: "13:00", fim: "23:00" }],
              sex: [{ inicio: "13:00", fim: "23:00" }],
              sab: [{ inicio: "13:00", fim: "23:00" }],
              dom: [{ inicio: "13:00", fim: "23:00" }],
            },
            address: "R. Benedito Salles, 832 - Carlopolis",
            contact: "(43) 99630-9935",
            delivery: "Sim / Sem Taxa",
            facebook: "https://www.facebook.com/FortyShakeSorvetes/",
            instagram: "https://www.instagram.com/forty_shake_carlopolis_oficial/",
            novidadesImages: [
              "images/comercios/sorveteria/fortyshake/divulgacao/1.png",
              "images/comercios/sorveteria/fortyshake/divulgacao/2.png",
              "images/comercios/sorveteria/fortyshake/divulgacao/3.png",
              "images/comercios/sorveteria/fortyshake/divulgacao/4.png",
              "images/comercios/sorveteria/fortyshake/divulgacao/5.png",
            ],
            novidadesDescriptions: [
              "Salada de fruta com açai!",
              "Milk Kinder ❤💕🥤",
              "Milk Sundae fini💕🎀",
              "",
              "Milk Shake de Ovomaltine!",

            ],
          },




          {
            image: "images/comercios/sorveteria/salles/perfil.png",
            name: "Sorvetes Salles Ferreira",
            hours: "Dom a Dom: 13:30h as 22:00h",
            statusAberto: ".",
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

              "images/comercios/sorveteria/salles/divulgacao/6.png",
              "images/comercios/sorveteria/salles/divulgacao/7.png",
              "images/comercios/sorveteria/salles/divulgacao/8.png",
              "images/comercios/sorveteria/salles/divulgacao/9.png",
              "images/comercios/sorveteria/salles/divulgacao/10.png",
            ],
            novidadesDescriptions: [
              "🍌 Banana Split<br> Perfeita para adoçar o seu dia!<br> 😋 Venha experimentar essa delícia!",

              "Está planejando uma confraternização inesquecível? Ou está planejando algo especial? Nossa caixa de sorvetes é a escolha perfeita para refrescar os momentos de confraternização",
              "Qual seria o sabor que você escolheria para acompanhar?",
              "Quer se refrescar com muito sabor? Experimente nossos milkshakes deliciosos e cremosos! Escolha seu sabor favorito e venha se deliciar! ",
              "Nosso petit gâteau com sorvete é a combinação perfeita entre o quente e o frio. Venha provar e se encantar!",

              "Temos mais de 25 sabores de Picolés!",
              "Quem aí também não resiste a um açaí caprichado? 😍🍓🍌 Vem para a Sorvetes Ferreira e garanta a sua dose de energia e sabor hoje mesmo!",
              "Uma explosão de cores e sabores! 🌈🍦✨ Delicie-se com o nosso sorvete especial de unicórnio, recheado com guloseimas irresistíveis.",
              "Açaí irresistível do jeito que você ama, cheio de complementos deliciosos! Venha experimentar na Sorveteria Salles Ferreira",
              "Já experimentou o sabor autêntico do nosso sorvete de café?Um sabor que combina tradição e refrescância! ☕🍦 Experimente o nosso sorvete de café e sinta o sabor da roça em cada colherada",



            ],
          },



          {
            image: "images/comercios/sorveteria/santino/santino.png",
            name: "Santtino Gelateria",
            hours: "Dom a Sex: 13:00h as 22:00h<br>Sab: 13:00h as 23:00h",
            statusAberto: ".",
            horarios: {
              seg: [{ inicio: "13:00", fim: "22:00" }],
              ter: [{ inicio: "13:00", fim: "22:00" }],
              qua: [{ inicio: "13:00", fim: "22:00" }],
              qui: [{ inicio: "13:00", fim: "22:00" }],
              sex: [{ inicio: "13:00", fim: "22:00" }],
              sab: [{ inicio: "13:00", fim: "23:00" }],
              dom: [{ inicio: "13:00", fim: "22:00" }],
            },
            address: "R. Kalil Keder, 583 - Carlopolis",
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
          /*
          {
            image: "images/comercios/padaria/bomjesus/bomjesus.png",
            name: "Bom Jesus",
            hours: "Seg a Sab: 06:00h as 20:00h ",
            statusAberto: ".",
            horarios: {
              seg: [{ inicio: "06:00", fim: "20:00" }],
              ter: [{ inicio: "06:00", fim: "20:00" }],
              qua: [{ inicio: "06:00", fim: "20:00" }],
              qui: [{ inicio: "06:00", fim: "20:00" }],
              sex: [{ inicio: "06:00", fim: "20:00" }],
              sab: [{ inicio: "06:00", fim: "20:00" }],
              dom: [],
            },
            address: "R. Benedito Salles, 615 - Carlopolis",
            contact: "(43) 99653-9285",
            delivery: "Sim / Com Taxa",
            facebook: "https://www.facebook.com/PanificadoraRestauranteBomJesus/?locale=pt_BR",
            instagram: "https://www.instagram.com/bom_jesus_panificadora/",
            menuImages: [
              "images/comercios/padaria/bomjesus/cardapio/1.png",
              "images/comercios/padaria/bomjesus/cardapio/2.png",
              "images/comercios/padaria/bomjesus/cardapio/3.png",
            ],
            novidadesImages: [
              "images/comercios/padaria/bomjesus/novidades/1.jpg",
              "images/comercios/padaria/bomjesus/novidades/2.jpg",
              "images/comercios/padaria/bomjesus/novidades/3.jpg",
              "images/comercios/padaria/bomjesus/novidades/4.jpg",
              "images/comercios/padaria/bomjesus/novidades/5.jpg",
              "images/comercios/padaria/bomjesus/novidades/6.jpg",
              "images/comercios/padaria/bomjesus/novidades/7.jpg",

            ],
            novidadesDescriptions: [
              "Quer um bolo decorado mas não teve tempo de encomendar ? Aqui no Bom Jesus temos a pronto entrega esperando por vocês ! 🎂💖", 
              "Pães de queijo quentinho aqui na Panificadora Lilia",
               "Temos Pizzas em pedaços, varios sabores",
                "Coxinhas Diferenciadas, venha conferir", 
                "Bom dia, para deixar seu café ainda mais gostoso que tal um pão Curitibano?",
                "Seja para um café da manhã fresquinho ou um churrasco de dar água na boca, a Panificadora e Churrascaria Bom Jesus é parada obrigatória!<BR>Com um ambiente acolhedor, atendimento atencioso e uma seleção impecável de pães e carnes, o local é uma excelente opção para quem deseja vivenciar a culinária local.",
              "Balcão de pães e roscas no capricho 😋",
            ],

          },
*/

          {
            image: "images/comercios/padaria/esquinadopao/perfil.png",
            name: "Esquina do Pão",
            hours: "Seg a Sab: 06:00h as 19:00h </br> Dom: 06:00h as 12:00h",
            statusAberto: ".",
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
            hours: "Seg a Sab: 05:45h as 19:00h </br> Dom: 05:45h as 12:00h",
            statusAberto: ".",
            horarios: {
              seg: [{ inicio: "05:45", fim: "19:00" }],
              ter: [{ inicio: "05:45", fim: "19:00" }],
              qua: [{ inicio: "05:45", fim: "19:00" }],
              qui: [{ inicio: "05:45", fim: "19:00" }],
              sex: [{ inicio: "05:45", fim: "19:00" }],
              sab: [{ inicio: "05:45", fim: "19:00" }],
              dom: [{ inicio: "05:45", fim: "12:00" }],
            },
            address: "R. Benedito Salles, 1094 - Carlopolis",
            contact: "(43) 99954-0863",
            delivery: "Sim / Com Taxa",

            instagram: "https://www.instagram.com/prelie.confeitaria/",
            novidadesImages: [
              "images/comercios/padaria/prelie/divulgacao/1.png",
              "images/comercios/padaria/prelie/divulgacao/2.png",
              "images/comercios/padaria/prelie/divulgacao/3.png",
              "images/comercios/padaria/prelie/divulgacao/4.png",
              "images/comercios/padaria/prelie/divulgacao/5.png",


            ],
            novidadesDescriptions: [
              "Folhado de nutella com morango 🍓",
              "Bolo decorado de leite ninho!",

              "Rosquinha de coco",
              "Faça seu orçamento conosco! 🎂🎉",
              "Novidades aqui na Prelie, venham experimentar. Cappuccino",


            ],
          },

          {
            image: "images/comercios/padaria/saoFrancisco/saoFrancisco.png",
            name: "São Francisco",
            hours: "Seg a Sab: 05:30h as 19:00h </br> Dom: 5:30h as 12:00h",
            statusAberto: ".",
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
            statusAberto: ".",
            horarios: {
              seg: [{ inicio: "08:30", fim: "11:30" }, { inicio: "13:00", fim: "17:00" }],
              ter: [{ inicio: "08:30", fim: "11:30" }, { inicio: "13:00", fim: "17:00" }],
              qua: [{ inicio: "08:30", fim: "11:30" }, { inicio: "13:00", fim: "17:00" }],
              qui: [{ inicio: "08:30", fim: "11:30" }, { inicio: "13:00", fim: "17:00" }],
              sex: [{ inicio: "08:30", fim: "11:10" }, { inicio: "13:00", fim: "17:00" }],
              sab: [],
              dom: [],
            },
            address: "Rodovia PR 218, 91 - Carlopolis",
            contact: "(43) 99812-5120",
            infoAdicional: "⚠️ 2° Via CRV,<br>⚠️ Atpv-e,<br> ⚠️ Comunicação de Venda,<br> ⚠️ Emplacamentos,<br>⚠️ Guia de Multas, IPVA,<br>⚠️ Licenciamento, <br>⚠️ Transferências  "
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
            statusAberto: ".",
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
            address: "R. Benedito Salles, 341 - Carlopolis",
            hours: "Seg a Sex: 08:00h as 19:00h <br> Dom: 08:00 as 12:00h",
            statusAberto: ".",
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
              "Chocolates Importados",
              "Area de Promoçoes de Leite Condensado!",
            ],
          },


          {
            image: "images/comercios/supermercado/compreBemMais/compreBemMais.png",
            name: "Compre Bem Mais",
            address: "R. Andrino Soares, 355 - Carlopolis",
            hours: "Seg a Sex: 07:00h as 20:00h </br> Dom: 08:00 as 12:00h",
            statusAberto: ".",
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
            image: "images/comercios/supermercado/mercadoDoZe/perfil.jpg",
            name: "Mercado do Ze",
            hours: "Seg a Sex: 08:00h as 20:30h <br> Dom: 08:00h as 13:30h",
            statusAberto: ".",
            horarios: {
              seg: [{ inicio: "08:00", fim: "20:30" }],
              ter: [{ inicio: "08:00", fim: "20:30" }],
              qua: [{ inicio: "08:00", fim: "20:30" }],
              qui: [{ inicio: "08:00", fim: "20:30" }],
              sex: [{ inicio: "08:00", fim: "20:30" }],
              sab: [{ inicio: "08:00", fim: "20:30" }],
              dom: [{ inicio: "08:00", fim: "13:30" }],
            },
            address: "R. Magnólia, 616 - Carlopolis",
            contact: "(43) 99654-8573",
            delivery: "Não",
            instagram: "https://www.instagram.com/mercado_do__ze/",
            novidadesImages: [
              "images/comercios/supermercado/mercadoDoZe/divulgacao/1.jpg",
              "images/comercios/supermercado/mercadoDoZe/divulgacao/2.jpg",
              "images/comercios/supermercado/mercadoDoZe/divulgacao/3.jpg",



            ],
            novidadesDescriptions: [
              "",
              "",
              "",

            ],
          },
          ////
          /////
          /////
          ////
          /////


          ////
          ////
          ///



          {
            image: "images/comercios/supermercado/obarateiro.png",
            name: "O Barateiro",
            address: "Bendito Salles, 1168 - Carlopolis",
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
            statusAberto: ".",
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
            image: "images/comercios/supermercado/rocha/perfil.jpg",
            name: "Rocha",
            hours: "Seg a Sex: 06:00h as 20:00h <br> Dom: 06:00h as 12:00h",
            statusAberto: ".",
            horarios: {
              seg: [{ inicio: "06:00", fim: "20:00" }],
              ter: [{ inicio: "06:00", fim: "20:00" }],
              qua: [{ inicio: "06:00", fim: "20:00" }],
              qui: [{ inicio: "06:00", fim: "20:00" }],
              sex: [{ inicio: "06:00", fim: "20:00" }],
              sab: [{ inicio: "06:00", fim: "20:00" }],
              dom: [{ inicio: "06:00", fim: "20:00" }],
            },
            address: "Av. Elson Soares, 767 - Carlopolis",
            contact: "(43) 99149-8546",
            contact2: "(43) 99105-9324",
            delivery: "Sim / Sem Taxa",
            facebook: "https://www.facebook.com/supermercadorochaclps",
            instagram: "https://www.instagram.com/_supermercado.rocha/",
          },



          {
            image: "images/comercios/supermercado/zerojapan/zerojapan.png",
            name: "Zero Japan",
            address: "R. Doutora Paula e Silva, 445 - Carlopolis",
            hours: "Dom a Dom: 08:00h as 20:00h",
            statusAberto: ".",
            horarios: {
              seg: [{ inicio: "08:00", fim: "20:00" }],
              ter: [{ inicio: "08:00", fim: "20:00" }],
              qua: [{ inicio: "08:00", fim: "20:00" }],
              qui: [{ inicio: "08:00", fim: "20:00" }],
              sex: [{ inicio: "08:00", fim: "20:00" }],
              sab: [{ inicio: "08:00", fim: "20:00" }],
              dom: [{ inicio: "08:00", fim: "20:00" }],
            },
            contact: "(43) 3142-2005",
            whatsapp: "4331422005",
            facebook: "https://www.facebook.com/zerojapangroup/",
            instagram: "https://www.instagram.com/mercadozerojapan/",
            delivery: "Sim / Sem Taxa",
            novidadesImages: [
              "images/comercios/supermercado/zerojapan/divulgacao/1.png",
              "images/comercios/supermercado/zerojapan/divulgacao/2.png",
              "images/comercios/supermercado/zerojapan/divulgacao/3.png",
              "images/comercios/supermercado/zerojapan/divulgacao/4.png",
              "images/comercios/supermercado/zerojapan/divulgacao/5.png",


            ],
            novidadesDescriptions: [
              "Temos a Famosa La fufu",
              "Tilapia disponível aqui no Zero Japan",
              "Hidratante beijavel mais famoso, chegou no Zero Japan",
              "Venha fazer seu cartão na ZeroJapan",
              "Cerveja Geladinha, aqui no Zero Japan",
            ],
          },
        ],
      },


      {
        link: document.querySelector("#menuProdutosNaturais"),
        title: "Produtos Naturais",
        establishments: [
          {
            image: "images/comercios/produtosNaturais/cantinhoSaudavel/perfil.jpg",
            name: "Cantinho Saudável",
            hours: "Seg a Sex: 09:00h as 18:00h<br>Sab: 09:00h as 12:40h",
            statusAberto: "a",
            horarios: {

              seg: [{ inicio: "09:00", fim: "18:00" }],
              ter: [{ inicio: "09:00", fim: "18:00" }],
              qua: [{ inicio: "09:00", fim: "18:00" }],
              qui: [{ inicio: "09:00", fim: "18:00" }],
              sex: [{ inicio: "09:00", fim: "18:00" }],
              sab: [{ inicio: "09:00", fim: "12:40" }],
              dom: []
            },
            address: " R. Laurindo Franco de Godói, 403 - Carlópolis ",
            contact: "(43) 99630-2465",
            instagram: "https://www.instagram.com/_cantinho.saudavel_/",
            facebook: "https://www.facebook.com/people/Cantinho-Sauda%CC%81vel/100083758940743/#",
            novidadesImages: [
              "images/comercios/produtosNaturais/cantinhoSaudavel/divulgacao/1.jpg",
              "images/comercios/produtosNaturais/cantinhoSaudavel/divulgacao/2.jpg",
              "images/comercios/produtosNaturais/cantinhoSaudavel/divulgacao/3.jpg",
              "images/comercios/produtosNaturais/cantinhoSaudavel/divulgacao/4.jpg",
              "images/comercios/produtosNaturais/cantinhoSaudavel/divulgacao/5.jpg",
              "images/comercios/produtosNaturais/cantinhoSaudavel/divulgacao/6.jpg",



            ],
            novidadesDescriptions: [
              "A compra de temperos a granel proporciona um consumo consciente, podendo comprar em quantidades necessárias, e o melhor de tudo…com muito mais economia!<br> Além da qualidade que importa muito!  Os temperos fazem toda diferença nas receitas caseiras e o Cantinho possui uma variedade imeeeensa, não só em temperos como ervas, especiarias, farinhas e muito mais!<br>Vem conferir com a gente, você merece o Cantinho na sua casa 💚",
              "Uma xícara para resolver seu problema ☕️ <br><br>Chás como o dente de leão, cavalinha e salsinha são aliados poderosos para o seu trato urinário. <br><br>Confie no poder das ervas!⚠️ Não dispensa acompanhamento médico!",
              "POTENCIALIZE SEUS TREINOS COM A CREATINA DUX! 🔥<br> Está preparado para elevar seus treinos a um novo nível? <br>Preço imperdível aqui no Cantinho, corre conferir e garantir a sua!! 💪🏻",
              "Está com algum desses sintomas? Nós te ajudamos 💚",
              "Também chamada como “MARAVILHA”, é uma flor vibrante conhecida por suas propriedades medicinais.<br> É ótima para ser usada em tratamentos de pele podendo ser incorporada em óleos, extratos, pomadas, máscaras, chás, infusões e mais uma infinidade de maneiras. <br>Descubra a magia da calêndula em nossa loja! 💚",
              "PARA UM INTESTINO FELIZ 💚🌿<br> O Psyllium é uma fibra solúvel derivada das sementes da planta Plantago Ovata possuindo inúmeros benefícios para nossa saúde intestinal, tendo a capacidade de absorver água e formar um gel viscoso, proporcionando diversos efeitos positivos em nosso sistema digestivo, regulando o trânsito intestinal.<br>É muito importante que seu uso seja aliado com um bom consumo de água, devendo sempre ser consumido com moderação. 💦",


            ],


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
            statusAberto: ".",
            horarios: {
              seg: [{ inicio: "08:00", fim: "18:00" }],
              ter: [{ inicio: "08:00", fim: "18:00" }],
              qua: [{ inicio: "08:00", fim: "18:00" }],
              qui: [{ inicio: "08:00", fim: "18:00" }],
              sex: [{ inicio: "08:00", fim: "18:00" }],
              sab: [{ inicio: "08:00", fim: "12:00" }],
              dom: [],
            },
            address: " R. Kalil Keder, 503 - Carlópolis",
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




      {
        link: document.querySelector("#menuRelojoaria"),
        title: "Relojoaria",
        establishments: [
          {
            image: "images/comercios/relojoaria/martini/perfil.jpg",
            name: "Relojoaria Martini",
            hours: "Seg a Sex: 09:00h as 18:00h<br> Sab: 09:00h as 14:00h ",
            statusAberto: " ",
            horarios: {

              seg: [{ inicio: "09:00", fim: "18:00" }],
              ter: [{ inicio: "09:00", fim: "18:00" }],
              qua: [{ inicio: "09:00", fim: "18:00" }],
              qui: [{ inicio: "09:00", fim: "18:00" }],
              sex: [{ inicio: "09:00", fim: "18:00" }],
              sab: [{ inicio: "09:00", fim: "14:00" }],
              dom: [], // fechado
            },
            address: "R. Benedito Salles, 1031 - Carlópolis",
            contact: "(43) 99917-8632",
            facebook: "https://www.facebook.com/vidracariamartini/",
            instagram: "https://www.instagram.com/vidracariamartini/",
            novidadesImages: [
              "images/comercios/relojoaria/martini/divulgacao/1.jpg",
              "images/comercios/relojoaria/martini/divulgacao/2.jpg",
              "images/comercios/relojoaria/martini/divulgacao/3.jpg",
              "images/comercios/relojoaria/martini/divulgacao/4.jpg",
              "images/comercios/relojoaria/martini/divulgacao/5.jpg",
              "images/comercios/relojoaria/martini/divulgacao/6.jpg",
              //"images/comercios/relojoaria/martini/divulgacao/7.jpg",
            ],
            novidadesDescriptions: [
              "A Relojoaria Martini oferece serviços completos para o seu relógio, como troca de baterias, ajuste de pulseiras, substituição de vidros, além de alianças de moeda, acessórios em prata 925 e venda de relógios. Com entrega rápida, qualidade garantida e atendimento em Carlópolis, solicite seu orçamento sem compromisso pelo WhatsApp!",
              "Alianças a partir de R$ 139,00 o par, venha escolher o modelo e fazer aquela pessoa feliz",
              "Trabalhamos com os Relogios Champion!",
              "Consertamos o teu relogio, fazemos limpeza e entregamos como se fosse novo! faça um orçamento sem compromisso! ",
              "Muitas peças em prata",
              "Montamos o teu box do tamanho e jeito que quiser! nos chame para um orçamento!",


            ],
          },
        ],
      },





      {
        link: document.querySelector("#menuEstudioBeleza"),
        title: "Estudio De Beleza",
        establishments: [
          {
            image: "images/comercios/estudioDeBeleza/veronica/perfil2.jpg",
            name: "Veronica Kataoka",
            hours: "Seg a Sab: 13:00h as 19:00h",
            statusAberto: " ",
            horarios: {

              seg: [{ inicio: "13:00", fim: "19:00" }],
              ter: [{ inicio: "13:00", fim: "19:00" }],
              qua: [{ inicio: "13:00", fim: "19:00" }],
              qui: [{ inicio: "13:00", fim: "19:00" }],
              sex: [{ inicio: "13:00", fim: "19:00" }],
              sab: [{ inicio: "13:00", fim: "19:00" }],
              dom: [], // fechado
            },
            address: "R. Antonio Jonas Ferreira, 744 - Carlopolis",
            contact: "(14) 99830-8893",
            infoAdicional: "<b>Agende seu Horario:</b><br> <br>✍️ Designer de sobrancelha: Precisão e detalhe no traço<br> 🔄 Lash Lifting: Cílios levantados e efeito de curvatura<br>🎀 Brow Lamination: Sobrancelha modelada e organizada<br>👁️ Extensão de cílios: Destaque direto no olho<br>💄 Hidragloss: Brilho e hidratação nos lábios",
            facebook: "https://www.facebook.com/people/Veronica-Kataoka-Lash-Designer/61578629999055/#",
            instagram: "https://www.instagram.com/veronicakataokalashdesigner",
            novidadesImages: [
              "images/comercios/estudioDeBeleza/veronica/divulgacao/0.jpg",
              "images/comercios/estudioDeBeleza/veronica/divulgacao/1.jpg",
              "images/comercios/estudioDeBeleza/veronica/divulgacao/2.jpg",
              "images/comercios/estudioDeBeleza/veronica/divulgacao/3.jpg",
              "images/comercios/estudioDeBeleza/veronica/divulgacao/4.jpg",
              "images/comercios/estudioDeBeleza/veronica/divulgacao/5.jpg",

            ],
            novidadesDescriptions: [
              "",

              "",

              "",

              "",

              "",


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
            address: "R. Laurindo Franco Godoy, 464 - Carlopolis",
            hours: "Seg a Sex:</strong> 08:00h as 18:00h </br>Sab: </strong>08:00h as 12:00h",

            statusAberto: ".",
            horarios: {
              seg: [{ inicio: "08:00", fim: "18:00" }],
              ter: [{ inicio: "08:00", fim: "18:00" }],
              qua: [{ inicio: "08:00", fim: "18:00" }],
              qui: [{ inicio: "08:00", fim: "18:00" }],
              sex: [{ inicio: "08:00", fim: "18:00" }],
              sab: [{ inicio: "08:00", fim: "12:00" }],
              dom: []
            },

            contact: "(43) 99988-9376",
            contact2: "(43) 3566-1473",
            delivery: "Sim / Sem Taxa",
            facebook: "https://www.facebook.com/p/Farm%C3%A1cia-Bio-Farma-100063579070016/?_rdr",
            instagram: "https://www.instagram.com/farmaciabiofarmaa/",

            novidadesImages: [
              "images/comercios/farmacia/bioFarma/divulgacao/1.png",
              "images/comercios/farmacia/bioFarma/divulgacao/2.png",
              "images/comercios/farmacia/bioFarma/divulgacao/3.png",


            ],
            novidadesDescriptions: [

              "Venham Nos Visitar, na BioFarma encontre o que precisa!",
              "Cabelo seco igual a um turista perdido no deserto da Austrália?Sorte a sua que a linha tem tudo o que Você precisa para deixar os cabelos macios e intensamente hidratados!!",
              "Linha completa da Gota Dourada para o seu cabelo ficar Maravilhoso e causar inveja a todoos❤️",

            ],
          },


          {
            image: "images/comercios/farmacia/descontoFacil/descontoFacil.jpg",
            name: "Desconto Facil 1",
            address: "R. Benedito Salles, 574 - Carlopolis",


            hours: "Seg a Sex: 08:00h as 20:00h </br> Sab: 08:00h as 15:00h",
            statusAberto: ".",
            horarios: {
              seg: [{ inicio: "08:00", fim: "20:00" }],
              ter: [{ inicio: "08:00", fim: "20:00" }],
              qua: [{ inicio: "08:00", fim: "20:00" }],
              qui: [{ inicio: "08:00", fim: "20:00" }],
              sex: [{ inicio: "08:00", fim: "20:00" }],
              sab: [{ inicio: "08:00", fim: "15:00" }],
              dom: []
            },
            contact: "(43) 99966-9812",
            delivery: "Sim / Sem Taxa",
            facebook: "https://www.facebook.com/people/Farm%C3%A1cias-Desconto-F%C3%A1cil-Carl%C3%B3polis/100054221361992/",
            instagram: "https://www.instagram.com/descontofacil.clps/",
            site: "https://www.grupoasfar.com.br/",
            novidadesImages: [
              "images/comercios/farmacia/descontoFacil/divulgacao/1.jpg",
              "images/comercios/farmacia/descontoFacil/divulgacao/2.jpg",
              "images/comercios/farmacia/descontoFacil/divulgacao/3.jpg",
              "images/comercios/farmacia/descontoFacil/divulgacao/4.jpg",
              "images/comercios/farmacia/descontoFacil/divulgacao/5.jpg",
              "images/comercios/farmacia/descontoFacil/divulgacao/6.jpg",
              "images/comercios/farmacia/descontoFacil/divulgacao/7.jpg",
              "images/comercios/farmacia/descontoFacil/divulgacao/8.jpg",
              "images/comercios/farmacia/descontoFacil/divulgacao/9.jpg",
            ],
            novidadesDescriptions: [
              "Carmed",
              "Proteja e cuide da sua pele!",
              "",
              "",
              "",
              "",
              "",
              "",
              "",
            ],
          },



          {
            image: "images/comercios/farmacia/drogaMais/drogamais.png",
            name: "DrogaMais",
            hours: "Seg a Sab: 08:00h as 20:00h<br>Dom: 08:00h as 13:00h",
            statusAberto: ".",
            horarios: {
              seg: [{ inicio: "08:00", fim: "20:00" }],
              ter: [{ inicio: "08:00", fim: "20:00" }],
              qua: [{ inicio: "08:00", fim: "20:00" }],
              qui: [{ inicio: "08:00", fim: "20:00" }],
              sex: [{ inicio: "08:00", fim: "20:00" }],
              sab: [{ inicio: "08:00", fim: "20:00" }],
              dom: [{ inicio: "08:00", fim: "13:00" }]
            },
            address: "R. Benedito Salles, 903 - Carlopolis",
            contact: "(43) 98411-9145",
            delivery: "Sim / Sem Taxa",
            facebook: "https://www.facebook.com/p/Drogamais-Jorginho-61560211252826/?locale=pt_BR",
            instagram: "https://www.instagram.com/drogamaisjorginho/",

            novidadesImages: [
              "images/comercios/farmacia/drogaMais/divulgacao/1.png",
              "images/comercios/farmacia/drogaMais/divulgacao/2.png",
              "images/comercios/farmacia/drogaMais/divulgacao/3.png",
              "images/comercios/farmacia/drogaMais/divulgacao/4.png",
              "images/comercios/farmacia/drogaMais/divulgacao/5.png",

            ],
            novidadesDescriptions: [

              "Quer garantir o melhor para o seu bebê?<br> Passe na Drogamais ou peça pelos nossos canais de atendimento!",
              "Tudo o que você precisa tem na DROGAMAIS! ❤️ <br>• Medicamentos • Perfumaria • Itens de beleza • Produtos de higiene! Vem pra Drogamais e encontre tudo em um só lugar! ",
              "Em dúvidas sobre sua receita?<br> Passe na Drogamais que a gente te ajuda!",
              "Aqui na Drogamais do Jorginho você encontra! <br>✨Uma linha completa de brinquedos e acessórios infantis Pimpolho! 👶 • Produtos de qualidade para deixar a infância ainda mais divertida e segura.• Tudo o que seu filho precisa para brincar com alegria!",
              "Você conhece a Linha LIFE, a própria marca da Drogamais?<br> ✨Produtos de ótima qualidade com um preço que você só encontra aqui! Venha conferir e aproveite!",

            ],

            promocoes: [
              {
                imagem: "images/comercios/farmacia/drogamais/promocao/1.jpg",
                titulo: "Repelente Infantil Off Kids 200ml",
                precoAntigo: "R$ 26.50",
                preco: "R$ 17,90",
                unidade: "A UNIDADE",
                validadeFim: "2025-10-31",
                obs: "Oferta válida até durar o estoque",

              },

              {
                imagem: "images/comercios/farmacia/drogamais/promocao/2.jpg",
                titulo: "Protetor Solar Facial Principia 60",
                precoAntigo: "R$ 51.75",
                preco: "R$ 44,00",
                unidade: "A UNIDADE",
                validadeFim: "2025-10-31",
                obs: "Oferta válida até durar o estoque",

              },

              {
                imagem: "images/comercios/farmacia/drogamais/promocao/3.jpg",
                titulo: "Oleo + Serum Bifasico Dove Bond 110Mml",
                precoAntigo: "R$ 36,45",
                preco: "R$ 30,99",
                unidade: "A UNIDADE",
                validadeFim: "2025-10-31",
                obs: "Oferta válida até durar o estoque",

              },

              {
                imagem: "images/comercios/farmacia/drogamais/promocao/4.jpg",
                titulo: "Gel Fixador Red Apple Capilar 230g",
                precoAntigo: "R$ 11,65",
                preco: "R$ 9,90",
                unidade: "A UNIDADE",
                validadeFim: "2025-10-31",
                obs: "Oferta válida até durar o estoque",

              },

              {
                imagem: "images/comercios/farmacia/drogamais/promocao/5.jpg",
                titulo: "Sabonete Farnese 85g",
                precoAntigo: "R$ 2,10",
                preco: "R$ 1,75",
                unidade: "A UNIDADE",
                validadeFim: "2025-10-31",
                obs: "Oferta válida até durar o estoque",

              },

              {
                imagem: "images/comercios/farmacia/drogamais/promocao/6.jpg",
                titulo: "Desodorante axe aerosol 89g urban",
                precoAntigo: "R$ 11,65",
                preco: "R$ 9,90",
                unidade: "A UNIDADE",
                validadeFim: "2025-10-31",
                obs: "Oferta válida até durar o estoque",

              },

              {
                imagem: "images/comercios/farmacia/drogamais/promocao/7.jpg",
                titulo: "Creme Dental Colgate Luminous White 70g",
                precoAntigo: "R$ 8,85",
                preco: "R$ 7,49",
                unidade: "A UNIDADE",
                validadeFim: "2025-10-31",
                obs: "Oferta válida até durar o estoque",

              },

              {
                imagem: "images/comercios/farmacia/drogamais/promocao/8.jpg",
                titulo: "Absorvente sempre livre adpat c16un",
                precoAntigo: "R$ 12,35",
                preco: "R$ 10,49",
                unidade: "A UNIDADE",
                validadeFim: "2025-10-31",
                obs: "Oferta válida até durar o estoque",

              },


              {
                imagem: "images/comercios/farmacia/drogamais/promocao/9.jpg",
                titulo: "Toalhas Umedecidas Petty Baby c50",
                precoAntigo: "R$ 5,75",
                preco: "R$ 4,90",
                unidade: "A UNIDADE",
                validadeFim: "2025-10-31",
                obs: "Oferta válida até durar o estoque",

              },


            ]



          },

          {
            image: "images/comercios/farmacia/elShaday/elshaday.png",
            name: "El Shaday",
            address: "R. Benedito Sales, 353 - Carlopolis",
            hours: "Seg a Sex: 08:00h as 18:00h </br> Sab: 08:00h as 12:00h",

            statusAberto: ".",
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
            facebook: "https://www.facebook.com/fciaelshaday",
            instagram: "https://www.instagram.com/farmaciaels/",

            novidadesImages: [

              "images/comercios/farmacia/elShaday/divulgacao/1.png",
              "images/comercios/farmacia/elShaday/divulgacao/2.png",
              "images/comercios/farmacia/elShaday/divulgacao/3.png",
              "images/comercios/farmacia/elShaday/divulgacao/4.png",
              "images/comercios/farmacia/elShaday/divulgacao/5.png",
            ],
            novidadesDescriptions: [
              "Estamos de Plantão!",
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
            address: "R. Manguba, 320 - Carlopolis",
            hours: "Seg a Sex: 08:00h as 19:00h<br>Sab: 08:00h as 15:00h",

            statusAberto: ".",
            horarios: {
              seg: [{ inicio: "08:00", fim: "19:00" }],
              ter: [{ inicio: "08:00", fim: "19:00" }],
              qua: [{ inicio: "08:00", fim: "19:00" }],
              qui: [{ inicio: "08:00", fim: "19:00" }],
              sex: [{ inicio: "08:00", fim: "19:00" }],
              sab: [{ inicio: "08:00", fim: "15:00" }],
              dom: []
            },
            contact: "(43) 99148-8478",
            delivery: "Sim / Sem Taxa",

            instagram: "https://www.instagram.com/farmaciadavilaclps/",

            novidadesImages: [
              "images/comercios/farmacia/farmaciaDaVila/divulgacao/1.jpg",
              "images/comercios/farmacia/farmaciaDaVila/divulgacao/2.jpg",
              "images/comercios/farmacia/farmaciaDaVila/divulgacao/3.jpg",

            ],
            novidadesDescriptions: [
              "💊✨ Na Farmácia da Vila, cuidamos de você de todas as formas! ✨💊",
              "A gripe é uma doença respiratória altamente transmissível causada pelos vírus Influenza A e B, sendo mais comum durante os meses frios. Com a chegada do inverno, realizar um teste de influenza é essencial para um diagnóstico rápido e preciso.",
              "🦟 FIQUE ATENTO AOS SINTOMAS DA DENGUE! 🚨A dengue pode começar com sintomas parecidos com os da gripe, mas merece atenção! Se sentir:",

            ],
          },

          {
            image: "images/comercios/farmacia/farmais/farmais.png",
            name: "FarMais",
            address: "R. Benedito Salles, 979 - Carlopolis",
            hours: "Seg a Sex: 08:00h as 19:00h </br> Sab: 08:00h as 12:00h",
            statusAberto: ".",
            horarios: {
              seg: [{ inicio: "08:00", fim: "19:00" }],
              ter: [{ inicio: "08:00", fim: "19:00" }],
              qua: [{ inicio: "08:00", fim: "19:00" }],
              qui: [{ inicio: "08:00", fim: "19:00" }],
              sex: [{ inicio: "08:00", fim: "19:00" }],
              sab: [{ inicio: "08:00", fim: "12:00" }],
              dom: []
            },
            contact: "(43) 3566-1211",
            delivery: "Sim / Sem Taxa",
            facebook: "https://www.facebook.com/farmaiscarlopolis1/?locale=pt_BR",
            instagram: "https://www.instagram.com/farmaiscarlopolis/",
            novidadesImages: [
              //  "images/comercios/farmacia/farmais/divulgacao/1.jpg",
              "images/comercios/farmacia/farmais/divulgacao/2.jpg",
              "images/comercios/farmacia/farmais/divulgacao/3.jpg",
              "images/comercios/farmacia/farmais/divulgacao/4.jpg",

            ],
            novidadesDescriptions: [
              // "Estamos de Plantão!",
              "Tome no horário certo – Respeite os intervalos indicados.",
              "Como fortalecer a imunidade? Comece pelo prato! Invista em alimentos ricos",
              "Tome no horário certo – Respeite os intervalos indicados.",

            ],
          },

          {
            image: "images/comercios/farmacia/masterFarma/masterfarma.png",
            name: "Master Farma",
            address: "R. Laurindo Franco de Godoi, 90 - Carlopolis",
            hours: "Seg a Sab: 08:00h as 20:00h </br>Dom: 08:00h as 13:00h",

            statusAberto: ".",
            horarios: {
              seg: [{ inicio: "08:00", fim: "20:00" }],
              ter: [{ inicio: "08:00", fim: "20:00" }],
              qua: [{ inicio: "08:00", fim: "20:00" }],
              qui: [{ inicio: "08:00", fim: "20:00" }],
              sex: [{ inicio: "08:00", fim: "20:00" }],
              sab: [{ inicio: "08:00", fim: "20:00" }],
              dom: [{ inicio: "08:00", fim: "13:00" }]
            },
            contact: "(43) 99951-1540",
            contact2: "(43) 3566-1141",
            delivery: "Sim / Sem Taxa",
            facebook: "https://www.facebook.com/zurdo.farmacentro/?locale=pt_BR",
            instagram: "https://www.instagram.com/masterfarmacarlopolis/",

            novidadesImages: [

              "images/comercios/farmacia/masterFarma/divulgacao/2.png",
              "images/comercios/farmacia/masterFarma/divulgacao/3.png",
              "images/comercios/farmacia/masterFarma/divulgacao/4.png",
              "images/comercios/farmacia/masterFarma/divulgacao/5.png",
              "images/comercios/farmacia/masterFarma/divulgacao/6.png",
              "images/comercios/farmacia/masterFarma/divulgacao/7.png",

            ],
            novidadesDescriptions: [

              "Pensado para atender às necessidades do organismo feminino, MASTERFORCE Pró Mulher auxilia na sua saúde e bem-estar diário! ",
              "Coração saudável e mente afiada! 🧠Conheça os benefícios do Ômega 3 para o seu bem-estar diário.",
              "Para os pequenos explorarem o mundo com mais disposição! 🌟 Cuidar da imunidade é um ato de amor.",
              "MELATONINA LÍQUIDA Dormir bem faz toda a diferença para a sua saúde! 😴 A melatonina ajuda a regular o sono de forma natural, promovendo noites mais tranquilas",
              "Com o Cartão Crediário da Master Farma, você parcela suas compras e cuida da sua saúde sem pesar no bolso!",
              "Venha nos conhecer!"
            ],
          },

          {

            name: "PopularMais",
            address: "Elson Soares, 787, Sala 2 - Carlopolis",
            hours: "Dom a Dom: 08:00h as 22:00h",

            statusAberto: ".",
            horarios: {
              seg: [{ inicio: "08:00", fim: "22:00" }],
              ter: [{ inicio: "08:00", fim: "22:00" }],
              qua: [{ inicio: "08:00", fim: "22:00" }],
              qui: [{ inicio: "08:00", fim: "22:00" }],
              sex: [{ inicio: "08:00", fim: "22:00" }],
              sab: [{ inicio: "08:00", fim: "22:00" }],
              dom: [{ inicio: "08:00", fim: "22:00" }]
            },
            contact: "(43) 99647-6266",
            delivery: "Sim / Sem Taxa",
            image: "images/comercios/farmacia/popularMais/popularMais.png",
            facebook:
              "https://www.facebook.com/people/Popular-Mais-a-Farm%C3%A1cia-do-Jeremias/100075024257599/#",
            instagram:
              "https://www.instagram.com/popularmais_farmaciadojeremias/",

            novidadesImages: [

              "images/comercios/farmacia/popularMais/divulgacao/1.jpg",
              "images/comercios/farmacia/popularMais/divulgacao/2.jpg",
              "images/comercios/farmacia/popularMais/divulgacao/3.jpg",
              "images/comercios/farmacia/popularMais/divulgacao/4.jpg",


            ],
            novidadesDescriptions: [
              "💳🔥 Cartão Fidelidade Popular Mais: COMPROU, GANHOU! 🔥💳Quer mais vantagens nas suas compras? Agora, na Farmácia do Jeremias, você acumula pontos a cada compra e pode trocar por descontos imperdíveis ou produtos exclusivos! 🎁💰",
              "Diga adeus aos insetos com proteção de verdade",
              "A diversão agora também está na hora de escovar os dentes<br>O Gel Dental CARMED Fini chegou para deixar a escovação da meninada muito mais gostosa e divertida!",
              "🦠🤧 Dengue ou H1N1? Tire a dúvida agora! ✅Na Farmácia do Jeremias, você faz o teste rápido para Dengue e H1N1 com resultado confiável e sem complicação! ⏳🔬",

            ],
          },

          {
            image: "images/comercios/farmacia/santaMaria/santamaria.png",
            name: "Santa Maria",
            address: "R. Benedito Salles, nº 711 - Carlopols",
            hours: "Seg a Sab: 08:00h as 20h </br> Dom: 08:00h as 13:00h",
            statusAberto: ".",
            horarios: {
              seg: [{ inicio: "08:00", fim: "20:00" }],
              ter: [{ inicio: "08:00", fim: "20:00" }],
              qua: [{ inicio: "08:00", fim: "20:00" }],
              qui: [{ inicio: "08:00", fim: "20:00" }],
              sex: [{ inicio: "08:00", fim: "20:00" }],
              sab: [{ inicio: "08:00", fim: "20:00" }],
              dom: [{ inicio: "08:00", fim: "13:00" }]
            },
            contact: "(43) 99840-9658",
            delivery: "Sim / Sem Taxa",
            facebook: "https://www.facebook.com/farmaciasantamaria.carlopolis/",
            instagram: "https://www.instagram.com/santamaria.farmaciaclps/",

            novidadesImages: [
              "images/comercios/farmacia/santaMaria/divulgacao/1.jpg",
              "images/comercios/farmacia/santaMaria/divulgacao/2.jpg",
              "images/comercios/farmacia/santaMaria/divulgacao/3.jpg",
              "images/comercios/farmacia/santaMaria/divulgacao/4.jpg",
              "images/comercios/farmacia/santaMaria/divulgacao/5.jpg",
              "images/comercios/farmacia/santaMaria/divulgacao/6.jpg",

            ],
            novidadesDescriptions: [
              "Aniversário de 30 anos da Farmácia Santa Maria, e quem ganha o presente é você! ❤️🎁❤️ Venha comemorar com a gente",
              "Estamos de Plantao! Conte com nós!",
              "Nutricolin - Silício orgânico!Estimula as proteínas da beleza na pele, cabelos e unhas.Peça já o seu manipulado ❤️",
              "Emagreça com saúde! Fórmula manipulada completa.",
              "Colágeno Verisol em sachê.",
              "Equilibre seu corpo e mente!",

            ],
          },

          {
            image: "images/comercios/farmacia/saudeFarma/saudeFarma.png",
            name: "Saude Farma",
            address: "Rua Benedito Salles, 951 - Carlopolis",
            hours: "Dom a Dom: 08:00h as 22:00h",
            statusAberto: ".",
            horarios: {
              seg: [{ inicio: "08:00", fim: "22:00" }],
              ter: [{ inicio: "08:00", fim: "22:00" }],
              qua: [{ inicio: "08:00", fim: "22:00" }],
              qui: [{ inicio: "08:00", fim: "22:00" }],
              sex: [{ inicio: "08:00", fim: "22:00" }],
              sab: [{ inicio: "08:00", fim: "22:00" }],
              dom: [{ inicio: "08:00", fim: "22:00" }]
            },
            contact: "(43) 99956-8938",
            delivery: "Sim / Sem Taxa",
            facebook: "https://www.facebook.com/share/1BrGP14Pbc/",
            instagram: "https://www.instagram.com/saudefarmacarlopolis/",

            novidadesImages: [
              "images/comercios/farmacia/saudeFarma/divulgacao/2.jpg",
              "images/comercios/farmacia/saudeFarma/divulgacao/1.jpg",

              "images/comercios/farmacia/saudeFarma/divulgacao/3.jpg",

            ],
            novidadesDescriptions: [
              "Esses são alguns dos sinais que sua pressão pode estar alta, é importante ficar atento nesse checklisk!",
              "Faça o aferimento de glicemia e pressão aqui conosco!",

              "Fraudas e lenço do Scooby doo você encontra na Saúde Farma, venha conferir!",


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
            hours: "Seg a Sex: 08:00h as 12:00h - 13:30h as 17:30h",
            statusAberto: ".",
            horarios: {
              seg: [{ inicio: "08:00", fim: "12:00" }, { inicio: "13:30", fim: "17:30" }],
              ter: [{ inicio: "08:00", fim: "12:00" }, { inicio: "13:30", fim: "17:30" }],
              qua: [{ inicio: "08:00", fim: "12:00" }, { inicio: "13:30", fim: "17:30" }],
              qui: [{ inicio: "08:00", fim: "12:00" }, { inicio: "13:30", fim: "17:30" }],
              sex: [{ inicio: "08:00", fim: "12:00" }, { inicio: "13:30", fim: "17:30" }],
              sab: [],
              dom: []
            },
            address: "Rua Antônio Jonas Ferreira Pinto, 395 - Carlópolis ",
            contact: "Anderson: (43) 99128-6761",
            contact2: "Mingo: (43) 99146-4264",
            infoAdicional: "Somos Especialista em Georreferenciamento<br>Eng. Florestal<br>Eng. de Segurança do Trabalho<br>CAR",
            instagram: "https://www.instagram.com/da2engenharia/",

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






      //// vidraçaria
      {
        link: document.querySelector("#menuVidracaria"),
        title: "Vidraçaria",
        establishments: [
          {
            image: "images/comercios/vidracaria/sallesVidros/perfil.jpg",
            name: "Salles Vidros",
            hours: "Seg a Sex: 08:30h as 11:30h - 13:30h as 17:30h",
            statusAberto: ".",
            horarios: {
              seg: [{ inicio: "08:30", fim: "11:30" }, { inicio: "13:30", fim: "17:30" }],
              ter: [{ inicio: "08:30", fim: "11:30" }, { inicio: "13:30", fim: "17:30" }],
              qua: [{ inicio: "08:30", fim: "11:30" }, { inicio: "13:30", fim: "17:30" }],
              qui: [{ inicio: "08:30", fim: "11:30" }, { inicio: "13:30", fim: "17:30" }],
              sex: [{ inicio: "08:30", fim: "11:30" }, { inicio: "13:30", fim: "17:30" }],
              sab: [],
              dom: []
            },
            address: "R. Benedito Salles, 1225 - Carlópolis",
            contact: "(43) 99901-0269",
            contact2: "(43) 99618-4867",
            infoAdicional: "<strong>Somos Especialistas em:</strong><br>🧊 - Vidros Temperados<br>🚪 - Portas e Janelas<br>🚿 - Box<br>🏠 - Coberturas<br>🏢 - Sacadas e Fachadas<br>🔲 - Espelhos<br>🔒 - Fechaduras para Portas de Vidro",
            instagram: "https://www.instagram.com/salles_vidross/",

            novidadesImages: [
              "images/comercios/vidracaria/sallesVidros/divulgacao/1.jpg",
              "images/comercios/vidracaria/sallesVidros/divulgacao/2.jpg",
              "images/comercios/vidracaria/sallesVidros/divulgacao/3.jpg",
              "images/comercios/vidracaria/sallesVidros/divulgacao/4.jpg",
              "images/comercios/vidracaria/sallesVidros/divulgacao/5.jpg",
              "images/comercios/vidracaria/sallesVidros/divulgacao/6.jpg",

            ],
            novidadesDescriptions: [
              "Painel de Espelho 04mm lapidado e polido com a qualidade Belga.",
              "Portinhas de pia no vidro temperado fumê!!",
              "Portas 4 folhas 10mm incolor!!!",
              "Box em vidro temperado fume com acabamento na cor preto.",
              "Muro em vidro temperado fume com acabamento na cor preto.",
              "Obra com portas 4 folhas, janelas 2 e folhas, fixo, basculante e box em vidro temperado incolor com acabamento preto.",
            ],
          },
        ],
      },

      /// vidraçaria



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

            instagram: "https://www.instagram.com/edisonfoguinho/",
            infoAdicional: "Baterista e Cantor Popular",

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
            instagram: "https://www.instagram.com/donascimentoflaviogiovani/",
            novidadesImages: [
              "images/servicos/churrasqueiro/flavio/divulgacao/1.jpg",
              "images/servicos/churrasqueiro/flavio/divulgacao/2.png",
              "images/servicos/churrasqueiro/flavio/divulgacao/3.png",

            ], novidadesDescriptions: [
              "🔥 Churrasco de verdade tem carne no ponto, fogo controlado e zero preocupação pra você. Deixa comigo e curta sua festa!",
            ],

          },

          {
            image: "images/servicos/churrasqueiro/gustavo/perfil.jpg",
            name: "Gustavinho",
            contact: "(43) 99654-5053",
            instagram: "https://www.instagram.com/gustavo.cunha_/",

            novidadesImages: [
              "images/servicos/churrasqueiro/gustavo/divulgacao/1.jpg",
              "images/servicos/churrasqueiro/gustavo/divulgacao/2.jpg",
              "images/servicos/churrasqueiro/gustavo/divulgacao/3.jpg",
              "images/servicos/churrasqueiro/gustavo/divulgacao/4.jpg",
              "images/servicos/churrasqueiro/gustavo/divulgacao/5.jpg",
              "images/servicos/churrasqueiro/gustavo/divulgacao/6.jpg",
              "images/servicos/churrasqueiro/gustavo/divulgacao/7.jpg",


            ], novidadesDescriptions: [
              "Fogo, brasa e paixão: aqui o churrasco é tratado como arte!",
            ],
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
        title: "Eletricista",
        establishments: [
          {
            image: "images/servicos/eletrecista/cybernetico/perfil.jpg",
            name: "Cyberneticos instalações",
            address: "R. Laurindo Franco Godoi, 1028 - Carlopolis",
            hours: "Seg a Sab: 08:00h as 18:00h",
            statusAberto: ".",
            horarios: {
              seg: [{ inicio: "08:00", fim: "18:00" }],
              ter: [{ inicio: "08:00", fim: "18:00" }],
              qua: [{ inicio: "08:00", fim: "18:00" }],
              qui: [{ inicio: "08:00", fim: "18:00" }],
              sex: [{ inicio: "08:00", fim: "18:00" }],
              sab: [{ inicio: "08:00", fim: "18:00" }],
              dom: []
            },
            contact: "(43) 98854-4318",
            instagram: "https://www.instagram.com/cyberneticos.pr/",
            infoAdicional: "⚠️ - Atendemos Emergencias <br> 🔧 - Fazemos instalações:<br> 🏭 - Eletrica Industriais<br>🌾 - Eletrica em sitios. ",
            novidadesImages: [
              "images/servicos/eletrecista/cybernetico/divulgacao/1.jpg",
              "images/servicos/eletrecista/cybernetico/divulgacao/2.jpg",
              "images/servicos/eletrecista/cybernetico/divulgacao/3.jpg",
              "images/servicos/eletrecista/cybernetico/divulgacao/4.jpg",

            ],
            novidadesDescriptions: [
              "Instalação completa de consultorio.",
              "Instalação de TV de de 72pol.",
              "", ""
            ],
          },


        ],
      },

      {
        link: document.querySelector("#menuEncanador"),
        title: "Encanador",
        establishments: [
          {
            image: "images/servicos/encanador/gerson/perfil.jpg",
            name: "Gerson",
            hours: "Seg a Sab: 07:30h as 19:00h",
            statusAberto: ".",
            horarios: {
              seg: [{ inicio: "07:30", fim: "19:00" }],
              ter: [{ inicio: "07:30", fim: "19:00" }],
              qua: [{ inicio: "07:30", fim: "19:00" }],
              qui: [{ inicio: "07:30", fim: "19:00" }],
              sex: [{ inicio: "07:30", fim: "19:00" }],
              sab: [{ inicio: "07:30", fim: "19:00" }],
              dom: []
            },
            address: "R. José Talim, 449 - Carlópolis",
            contact: "(43) 99196-7618",
            facebook: "https://www.facebook.com/gcyvazamentos",
            instagram: "https://www.instagram.com/gcyvazamentos/",
            infoAdicional: "🚽 Desentupimento de esgotos<br>🔎 Detecção de vazamentos<br>🧼 Limpeza de caixa de gordura<br>🔧 Manutenção hidráulica em geral<br>💧 Ralos e pias<br>🛠️ Ramais de esgoto",
            novidadesImages: [
              "images/comercios/desentupidora/gcyVazamentos/divulgacao/1.jpg",
              "images/comercios/desentupidora/gcyVazamentos/divulgacao/2.jpg",
              "images/comercios/desentupidora/gcyVazamentos/divulgacao/3.jpg",
              "images/comercios/desentupidora/gcyVazamentos/divulgacao/4.jpg",
              "images/comercios/desentupidora/gcyVazamentos/divulgacao/5.jpg",

            ],
            novidadesDescriptions: [
              "Se você procura soluções hidráulicas para seu imóvel como: vazamento, limpeza de caixa d'água, desentupimento, manutenção de esgoto e tubulações, serviços de Geofone para caça vazamentos em profundidade, fale conosco",
              "O primeiro sinal de um vazamento de água imperceptível antes de conseguir notar a olho nu, é o aumento notável na conta de água da sua casa. Normalmente quando há um vazamento de água, a conta passa a vir muito mais alta. Fique atento, e caso note o aumento, é melhor começar a procurar logo pelo vazamento e evitar maiores danos e transtornos.",
              "você sabia?<BR>Uma torneira gotejando pode gastar 46 litros por dia, chegando a 1.380 litros por mês? E que um micro vazamento de apenas 2 milímetros no encanamento pode causar um gasto de 3.200 litros por dia? É impressionante o quanto nós podemos gastar sem perceber, por exemplo, se 1m³(que equivale a 1 litro de água) custar R$2,99, com um micro vazamento de 2 milímetros você terá um gasto de R$9,56 por dia, totalizando R$ 286,80 por mês, ou seja, um alto valor que poderia ter outro investimento. Agora pensando no prejuízo que terá durante um ano com o vazamento, o gasto será equivalente a R$3.441,60, isso sem contar o gasto com a mão de obra que terá para reparar os danos causados pelo vazamento. Agora pense em quantas possibilidades você teria para gastar esse valor? Depois de entender os riscos e prejuízos causados por um vazamento, irei apresentar três maneiras fáceis de descobrir se realmente há um vazamento de água.",
              "Sua piscina está com vazamento? Ou tem suspeita do de algo errado?<bR>Os vazamentos de água são comuns, porém perturbadores. Quando digo perturbadores, me refiro ao trabalho que da para encontrar um simples vazamento, principalmente numa piscina, sem contar a conta de água que vai lá para as alturas.",
              "1- Para verificar se há vazamentos no vaso sanitário, jogue um pouco de borra de café ou cinzas no fundo do vaso. <BR><BR>2- Caso a parede de sua casa esteja úmida, procure imediatamente um encanador.<BR><BR>3- Vazamentos na torneira podem ser facilmente verificados quando se é fechada .",

            ],
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
            image: "images/servicos/guiapesca/fabio.png",
            name: "Fabio Katsumi",
            contact: "(43) 99904-3894",
            instagram: "https://www.instagram.com/suguimotofishing/",
            facebook: "https://www.facebook.com/fabio.katsumisuguimoto/",
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
            image: "images/servicos/montadorMoveis/hiran/hiran.png",
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
        title: "Podóloga",
        establishments: [
          {
            image: "images/servicos/podologa/vania/perfil.png",
            name: "Vania",
            contact: "(43) 99834-3496",

            instagram: "https://www.instagram.com/me_vania/",
            infoAdicional: "👣 Tratamentos em Diabeticos , <br>👣 Calos , <br>👣 Unhas encravadas , <br>👣 Reflexologia podal entre outros tratamento nos pés<br>",

            novidadesImages: [
              "images/servicos/podologa/vania/divulgacao/1.png",
              "images/servicos/podologa/vania/divulgacao/2.jpg",
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
            image: "images/informacoes/eventos/copaComercio.jpg",
            name: "Copa Comercio Municipal",
            date: "23/09/2025",
            address: "Av Turistica Elias Merhi Mansur",
            contact: "(43) 99825-0870",
            infoAdicional: "🚨 Vem aí a Copa dos Comércios! ⚽<br>Chegou a hora de reunir sua equipe e representar o comércio do nosso município em mais um grande campeonato.<br>✅ Garanta já a inscrição do seu time – as vagas são limitadas!<br>ℹ️ Para mais informações, procure a Secretaria de Esportes e Lazer.<br>Não fique de fora dessa disputa que promete agitar Carlópolis!",
            instagram: "https://www.instagram.com/esportes_carlopolis/",



          },


          {
            image: "images/informacoes/eventos/CampeonatoVoleiAreia.jpg",
            name: "Campeonato Volei de Areia Municipal",
            date: "23/09/2025",
            address: "Av Turistica Elias Merhi Mansur",
            contact: "(43) 99825-0870",
            infoAdicional: "🏐 Preparem-se!<br>Setembro promete muita emoção no esporte de Carlópolis!<br>Vem aí o Torneio Municipal de Vôlei de Areia – Dupla Mista.<br>Não fique de fora! Para mais informações, procure a Secretaria de Esportes e Lazer.",
            instagram: "https://www.instagram.com/esportes_carlopolis/",



          },



          {
            image: "images/informacoes/eventos/torneioPenalti.jpg",
            name: "Torneio Penalti Municipal",
            date: "28/09/2025",
            address: "Campo Society do Vista Alegre",
            contact: "(43) 99825-0870",
            infoAdicional: "Torneio de pênaltis!!!<br>Prepare sua dupla e venha participar do torneio municipal de pênaltis.<br>Garanta sua vaga, inscrições limitadas.<br>Mais informações entre em contato com a Secretaria de Esportes e Lazer.",
            instagram: "https://www.instagram.com/esportes_carlopolis/",


          },







          //////

          ////

          ////



          {
            image: "images/informacoes/eventos/lowCity.png",
            name: "LowCity",
            date: "05/10/2025",
            address: "Centro de Eventos Ilha do Ponciano",
            contact: "-",
            instagram: "https://www.instagram.com/lowcity_043club/",


          },


          {
            image: "images/informacoes/eventos/loboFronteira.jpg",
            name: "Aniversario MC Lobos da Fronteira",
            date: "11/10/2025 e 12/10/2025",
            address: "Centro de Eventos Ilha do Ponciano",
            contact: "(43) 99909-2933",
            instagram: "https://www.instagram.com/lobosdafronteiramc/",


          },





          {
            image: "images/informacoes/eventos/regisDanese.jpg",
            name: "Regis Danese",
            date: "18/10/2025",
            address: "Centro de Eventos Ilha do Ponciano",
            contact: "-",
            infoAdicional: "Prepare-se para uma noite INESQUECÍVEL! Regis Danese traz um SUPER SHOW GOSPEL que vai TOCAR SEU CORAÇÃO  🎤❤️<Br>Uma experiência PODEROSA de música e fé que você NÃO PODE PERDER!",
            instagram: "https://www.instagram.com/turismocarlopolis/",


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

          {
            image: "images/informacoes/eventos/erosPrado.jpg",
            name: "Eros Prado",
            date: "16/11/2025",
            address: "Thac Thal",
            contact: "(43) 99667-4021",
            instagram: "https://www.instagram.com/clubevaledossonhos/",
            infoAdicional: "Se prepara que o riso vai ser garantido! 😂<br>Eros Prado, direto do “Pagode da Ofensa”, tá chegando no nosso palco com aquele stand up que não perdoa ninguém!<br> Adquira teu ingresso aqui: <a target='_blank' style='color:#2da6ff;' href='https://ingressosweb.com.br/shop/eros-prado/stand-up-eros-prado'>Comprar Ingresso</a>"
          },



        ],
      },





      // fim eventos





      {
        link: document.querySelector("#menuFarmaciaPlantao"),
        title: "Farmacia de Plantão",
        establishments: [


          /* [ 1 ] */
          /*
              {
                image: "images/comercios/farmacia/farmaciaDaVila/farmaciaDaVila.png",
                  name: "Farmacia da Vila",
                  address: "Rua Manguba, 320 - Carlopolis",
                  plantaoHorario: "08:00h às 21:00h", 
                  plantaoData:"28/06 a 04/07",
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
                  contact: "(43) 99148-8478",
                  delivery: "Sim / Sem Taxa",
                  facebook: "#",
                  instagram: "https://www.instagram.com/farmaciadavilaclps/",
                
                  novidadesImages: [               
                    "images/comercios/farmacia/farmaciaDaVila/divulgacao/1.jpg",
                    "images/comercios/farmacia/farmaciaDaVila/divulgacao/2.jpg", 
                     "images/comercios/farmacia/farmaciaDaVila/divulgacao/3.jpg", 
                       "images/comercios/farmacia/farmaciaDaVila/divulgacao/4.jpg", 
                     "images/comercios/farmacia/farmaciaDaVila/divulgacao/5.jpg",      
                 
                ], 
                novidadesDescriptions: [                            
                  "💊✨ Na Farmácia da Vila, cuidamos de você de todas as formas! ✨💊",
                   "A gripe é uma doença respiratória altamente transmissível causada pelos vírus Influenza A e B, sendo mais comum durante os meses frios. Com a chegada do inverno, realizar um teste de influenza é essencial para um diagnóstico rápido e preciso.",
                    "🦟 FIQUE ATENTO AOS SINTOMAS DA DENGUE! 🚨A dengue pode começar com sintomas parecidos com os da gripe, mas merece atenção! Se sentir:",
                     "Faça seu pedido e jaja entregaremos!",
                  "Sabia que aqui na Farmacia da vila, voce pode estar pagando suas contas?",
                ],
              },
            */


          /* [ 2 ]  */
          /* 
                    {
                      image: "images/comercios/farmacia/santaMaria/santamaria.png",
                      name: "Santa Maria",
                      address: "R. Benedito Salles, nº 711 - Carlopols",
                      hours: "Seg a Sex: 08:00h as 18h </br> Sab: 08:00h as 12:00h",
                      plantaoHorario: "08:00h às 21:00h",
                      plantaoData: "05/07 a 11/07",
                      hours: "Seg a Sex: 08:00h as 18:00h </br> Sab: 08:00h as 12:00h",
                      statusAberto: ".",
                      horarios: {
                        seg: [{ inicio: "08:00", fim: "21:00" }],
                        ter: [{ inicio: "08:00", fim: "21:00" }],
                        qua: [{ inicio: "08:00", fim: "21:00" }],
                        qui: [{ inicio: "08:00", fim: "21:00" }],
                        sex: [{ inicio: "08:00", fim: "21:00" }],
                        sab: [{ inicio: "08:00", fim: "21:00" }],
                        dom: [{ inicio: "08:00", fim: "21:00" }]
                      },
                      contact: "(43) 99840-9658",
                      delivery: "Sim / Sem Taxa",
                      facebook: "https://www.facebook.com/farmaciasantamaria.carlopolis/",
                      instagram: "https://www.instagram.com/santamaria.farmaciaclps/",
          
                      novidadesImages: [
                        "images/comercios/farmacia/santaMaria/divulgacao/1.jpg",
                        "images/comercios/farmacia/santaMaria/divulgacao/2.jpg",
                        "images/comercios/farmacia/santaMaria/divulgacao/3.jpg",
                        "images/comercios/farmacia/santaMaria/divulgacao/4.jpg",
                        "images/comercios/farmacia/santaMaria/divulgacao/5.jpg",
                        "images/comercios/farmacia/santaMaria/divulgacao/6.jpg",
          
                      ],
                      novidadesDescriptions: [
                        "Aniversário de 30 anos da Farmácia Santa Maria, e quem ganha o presente é você! ❤️🎁❤️ Venha comemorar com a gente",
                        "Estamos de Plantao! Conte com nós!",
                        "Nutricolin - Silício orgânico!Estimula as proteínas da beleza na pele, cabelos e unhas.Peça já o seu manipulado ❤️",
                        "Emagreça com saúde! Fórmula manipulada completa.",
                        "Colágeno Verisol em sachê.",
                        "Equilibre seu corpo e mente!",
          
                      ],
                    },
          
          */
          /* [ 3 ]

            {
              image: "images/comercios/farmacia/bioFarma/biofarma.jpg",
              name: "Bio Farma",
                  address: "Rua Laurindo Franco Godoy, 464 - Carlopolis",
                  contact:"(43) 99988-9376",
                  contact2: "(43) 3566-1473",
                  delivery: "Sim / Sem Taxa",
              plantaoHorario: "08:00h às 21:00h", 
              plantaoData:"12/07 a 18/07",     
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
                "images/comercios/farmacia/bioFarma/divulgacao/1.jpg",              
                  "images/comercios/farmacia/bioFarma/divulgacao/2.png",
                  "images/comercios/farmacia/bioFarma/divulgacao/3.png",     
                  "images/comercios/farmacia/bioFarma/divulgacao/4.png",
              
              ], 
              novidadesDescriptions: [   
                "Estamos de Plantão!",                         
              "Venham Nos Visitar, na BioFarma encontre o que precisa!",
              "Cabelo seco igual a um turista perdido no deserto da Austrália?Sorte a sua que a linha tem tudo o que Você precisa para deixar os cabelos macios e intensamente hidratados!!",
              "Linha completa da Gota Dourada para o seu cabelo ficar Maravilhoso e causar inveja a todoos❤️",
              ],
          },
          
              */

          /* [ 4 ]*/
          /*
          {
            image: "images/comercios/farmacia/masterFarma/masterfarma.png",
            name: "Master Farma",
            address: "R. Laurindo Franco de Godoi, 90 - Carlopolis",
            plantaoHorario: "08:00h às 21:00h",
            plantaoData: "19/07 a 25/07",
            hours: "Seg a Sex: 08:00h as 18:00h </br>Sab: 08:00h as 12:00h",
            statusAberto: ".",
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
            contact2: "(43) 3566-1141",
            delivery: "Sim / Sem Taxa",
            facebook: "https://www.facebook.com/zurdo.farmacentro/?locale=pt_BR",
            instagram: "https://www.instagram.com/masterfarma_carlopolis/",

            novidadesImages: [
              "images/comercios/farmacia/masterFarma/divulgacao/1.jpg",
              "images/comercios/farmacia/masterFarma/divulgacao/2.png",
              "images/comercios/farmacia/masterFarma/divulgacao/3.png",
              "images/comercios/farmacia/masterFarma/divulgacao/4.png",
              "images/comercios/farmacia/masterFarma/divulgacao/5.png",
              "images/comercios/farmacia/masterFarma/divulgacao/6.png",
              "images/comercios/farmacia/masterFarma/divulgacao/7.png",

            ],
            novidadesDescriptions: [
              "Estamos de Plantão!!",
              "Pensado para atender às necessidades do organismo feminino, MASTERFORCE Pró Mulher auxilia na sua saúde e bem-estar diário! ",
              "Coração saudável e mente afiada! 🧠Conheça os benefícios do Ômega 3 para o seu bem-estar diário.",
              "Para os pequenos explorarem o mundo com mais disposição! 🌟 Cuidar da imunidade é um ato de amor.",
              "MELATONINA LÍQUIDA Dormir bem faz toda a diferença para a sua saúde! 😴 A melatonina ajuda a regular o sono de forma natural, promovendo noites mais tranquilas",
              "Com o Cartão Crediário da Master Farma, você parcela suas compras e cuida da sua saúde sem pesar no bolso!",
              "Venha nos conhecer!"
            ],
          },
*/


          /* [ 5 ]

          {
            image: "images/comercios/farmacia/farmais/farmais.png",
            name: "FarMais",
            address: "R. Benedito Salles, 979 - Carlopolis",
            hours: "Seg a Sex: 08:00h as 18:00h </br> Sab: 08:00h as 12:00h",
            plantaoHorario: "08:00h às 21:00h",
            plantaoData: "Sab 26/07 a Sex 01/08",
            statusAberto: ".",
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
            facebook: "https://www.facebook.com/farmaiscarlopolis1/",
            instagram: "https://www.instagram.com/farmaiscarlopolis/",

            novidadesImages: [
              "images/comercios/farmacia/farmais/divulgacao/1.jpg",
              "images/comercios/farmacia/farmais/divulgacao/2.jpg",
              "images/comercios/farmacia/farmais/divulgacao/3.jpg",
              "images/comercios/farmacia/farmais/divulgacao/4.jpg",

            ],
            novidadesDescriptions: [
              "Estamos de Plantão!",
              "Tome no horário certo – Respeite os intervalos indicados.",
              "Como fortalecer a imunidade? Comece pelo prato! Invista em alimentos ricos",
              "Tome no horário certo – Respeite os intervalos indicados.",

            ],
          },

*/
          /* [ 6 ]

          {
            image: "images/comercios/farmacia/elShaday/elshaday.png",
            name: "El Shaday",
            address: "Rua Benedito Sales, 353 - Carlopolis",
            plantaoHorario: "08:00h às 21:00h",
            plantaoData: "Sab 02/08 a Sex 08/08",
            statusAberto: ".",
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
            facebook: "https://www.facebook.com/fciaelshaday",
            instagram: "https://www.instagram.com/farmaciaels/",

            novidadesImages: [
              "images/comercios/farmacia/elShaday/divulgacao/11.jpg",
              "images/comercios/farmacia/elShaday/divulgacao/1.png",
              "images/comercios/farmacia/elShaday/divulgacao/2.png",
              "images/comercios/farmacia/elShaday/divulgacao/3.png",
              "images/comercios/farmacia/elShaday/divulgacao/4.png",
              "images/comercios/farmacia/elShaday/divulgacao/5.png",
            ],
            novidadesDescriptions: [
              "Estamos de Plantão!",
              "Agora ficou ainda mais fácil cuidar da sua saúde! Na Farmácia El Shaday, você encontra os medicamentos do Programa Farmácia Popular, com preços acessíveis e descontos especiais para quem precisa!",
              "Tosse, febre, cansaço ou dor no corpo? Pode ser COVID-19! Não fique na dúvida!<br>Na Farmácia El Shaday, você faz o teste rápido de COVID-19 e tem o resultado em poucos minutos! Rápido, seguro e confiável!",
              "Dengue não é brincadeira! Se você está com febre alta, dor no corpo, manchas na pele e fraqueza, faça já o teste rápido de dengue!<br>Na Farmácia El Shaday, você tem um resultado confiável em poucos minutos, sem precisar esperar para saber o diagnóstico!",
              "Manter os níveis de glicose sob controle é essencial para quem vive com diabetes ou busca prevenir problemas de saúde. O teste rápido de glicemia é um exame simples e eficaz, que permite acompanhar os níveis de açúcar no sangue e identificar eventuais alterações.<br>Em nossa farmácia, você pode realizar o teste de glicemia com rapidez e segurança, sempre com o acompanhamento de profissionais qualificados.",
              "A hipertensão, conhecida como “pressão alta”, é uma condição que pode levar a sérios problemas de saúde se não for monitorada e tratada adequadamente. Felizmente, pequenas mudanças na rotina ajudam a controlar a pressão e a proteger o coração.",
            ],
          },


*/

          /* [ 7 ]*/


          {
            image: "images/comercios/farmacia/descontoFacil/descontoFacil.jpg",
            name: "Desconto Facil 1",
            address: "R. Benedito Salles, 574 - Carlopolis",
            hours: "Seg a Sex: 08:00h as 20:00h </br> Sab: 08:00h as 15:00h",
            statusAberto: ".",
            horarios: {
              seg: [{ inicio: "08:00", fim: "20:00" }],
              ter: [{ inicio: "08:00", fim: "20:00" }],
              qua: [{ inicio: "08:00", fim: "20:00" }],
              qui: [{ inicio: "08:00", fim: "20:00" }],
              sex: [{ inicio: "08:00", fim: "20:00" }],
              sab: [{ inicio: "08:00", fim: "15:00" }],
              dom: []
            },
            contact: "(43) 99966-9812",
            delivery: "Sim / Sem Taxa",
            facebook: "https://www.facebook.com/people/Farm%C3%A1cias-Desconto-F%C3%A1cil-Carl%C3%B3polis/100054221361992/",
            instagram: "https://www.instagram.com/descontofacil.clps/",
            site: "https://www.grupoasfar.com.br/",
            novidadesImages: [
              "images/comercios/farmacia/descontoFacil/divulgacao/1.png",
              "images/comercios/farmacia/descontoFacil/divulgacao/2.png",
              "images/comercios/farmacia/descontoFacil/divulgacao/3.png",
              "images/comercios/farmacia/descontoFacil/divulgacao/4.jpg",
              "images/comercios/farmacia/descontoFacil/divulgacao/5.jpg",
            ],
            novidadesDescriptions: [
              "Carmed",
              "Proteja e cuide da sua pele!",
              "Analgésico (para dor) antitérmico (para febre)",
              "Alívio da dor associada a contraturas musculares, incluindo dor de cabeça tensional.",
              "Redução da febre e para o alívio de dores",
            ],
          },





          /* [ 8 ] 

          {
            image: "images/comercios/farmacia/drogaMais/drogamais.png",
            name: "DrogaMais",
            hours: "Seg a Sex: 08:00h as 18:00h </br>Sab: 08:00h as 12:00h",
            plantaoHorario: "08:00h às 21:00h",
            plantaoData: "Sab 09/08 a Sex 15/08",
            statusAberto: ".",
            horarios: {
              seg: [{ inicio: "08:00", fim: "21:00" }],
              ter: [{ inicio: "08:00", fim: "21:00" }],
              qua: [{ inicio: "08:00", fim: "21:00" }],
              qui: [{ inicio: "08:00", fim: "21:00" }],
              sex: [{ inicio: "08:00", fim: "21:00" }],
              sab: [{ inicio: "08:00", fim: "21:00" }],
              dom: [{ inicio: "08:00", fim: "21:00" }]
            },
            address: "Rua Benedito Salles, 903 - Carlopolis",

            plantaoHorario: "08:00h às 21:00h",
            plantaoData: "Sab 09/08 a Sex 15/08",
            contact: "(43) 98411-9145",
            delivery: "Sim / Sem Taxa",
            facebook: "https://www.facebook.com/p/Drogamais-Jorginho-61560211252826/?locale=pt_BR",
            instagram: "https://www.instagram.com/drogamaisjorginho/",

            novidadesImages: [
              "images/comercios/farmacia/drogaMais/divulgacao/1.png",
              "images/comercios/farmacia/drogaMais/divulgacao/2.png",
              "images/comercios/farmacia/drogaMais/divulgacao/3.png",
              "images/comercios/farmacia/drogaMais/divulgacao/4.png",
              "images/comercios/farmacia/drogaMais/divulgacao/5.png",
              "images/comercios/farmacia/drogaMais/divulgacao/6.png",
            ],
            novidadesDescriptions: [
              "Arraia de Ofertas na semana do plantão! Venha conferir!",
              "Quer garantir o melhor para o seu bebê?<br> Passe na Drogamais ou peça pelos nossos canais de atendimento!",
              "Tudo o que você precisa tem na DROGAMAIS! ❤️ <br>• Medicamentos • Perfumaria • Itens de beleza • Produtos de higiene! Vem pra Drogamais e encontre tudo em um só lugar! ",
              "Em dúvidas sobre sua receita?<br> Passe na Drogamais que a gente te ajuda!",
              "Aqui na Drogamais do Jorginho você encontra! <br>✨Uma linha completa de brinquedos e acessórios infantis Pimpolho! 👶 • Produtos de qualidade para deixar a infância ainda mais divertida e segura.• Tudo o que seu filho precisa para brincar com alegria!",
              "Você conhece a Linha LIFE, a própria marca da Drogamais?<br> ✨Produtos de ótima qualidade com um preço que você só encontra aqui! Venha conferir e aproveite!",

            ],
          },


*/

          /* [ 9 ]
                          {
                              
                              name: "PopularMais",
                              address: "Elson Soares, 787, Sala 2",
                              hours: "Seg a Sex: 08:00h as 18:00h <br>Sab: 08:00h as 12:00h",
                               plantaoHorario: "08:00h às 21:00h", 
                              plantaoData:"Sab 14/06 a Sex 20/06",
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
                              contact: "(43) 99647-6266",
                              delivery: "Sim / Sem Taxa",
                              image: "images/comercios/farmacia/popularMais/popularMais.png",
                              facebook:
                              "https://www.facebook.com/people/Popular-Mais-a-Farm%C3%A1cia-do-Jeremias/100075024257599/#",
                              instagram:
                              "https://www.instagram.com/popularmais_farmaciadojeremias/",
                             
                              novidadesImages: [                  
                                  
                                  "images/comercios/farmacia/popularMais/divulgacao/1.jpg",
                                  "images/comercios/farmacia/popularMais/divulgacao/2.jpg",
                                  "images/comercios/farmacia/popularMais/divulgacao/3.jpg",
                                  "images/comercios/farmacia/popularMais/divulgacao/4.jpg",
                                 
                                              
                              ],
                              novidadesDescriptions: [ 
                                   "💳🔥 Cartão Fidelidade Popular Mais: COMPROU, GANHOU! 🔥💳Quer mais vantagens nas suas compras? Agora, na Farmácia do Jeremias, você acumula pontos a cada compra e pode trocar por descontos imperdíveis ou produtos exclusivos! 🎁💰",
                             "Diga adeus aos insetos com proteção de verdade",
                              "A diversão agora também está na hora de escovar os dentes<br>O Gel Dental CARMED Fini chegou para deixar a escovação da meninada muito mais gostosa e divertida!",
                                 "🦠🤧 Dengue ou H1N1? Tire a dúvida agora! ✅Na Farmácia do Jeremias, você faz o teste rápido para Dengue e H1N1 com resultado confiável e sem complicação! ⏳🔬",
                                
                              ],
                          },
          */


          // aqui 
          /* [10 ]
          {
                              image: "images/comercios/farmacia/saudeFarma/saudeFarma.png",
                              name: "Saude Farma",
                              address: "Rua Benedito Salles, 951 - Carlopolis",
                              hours: "Seg a Sex: 08:00h as 18:00h </br> Sab: 08:00h as 12:00h",
                                plantaoHorario: "08:00h às 21:00h", 
                              plantaoData:"Sab 21/06 a Sex 27/06",
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
                              contact: "(43) 99956-8938",
                              delivery: "Sim / Sem Taxa",
                              facebook: "https://www.facebook.com/share/1BrGP14Pbc/",
                              instagram: "https://www.instagram.com/saudefarmacarlopolis/",
                            
                              novidadesImages: [  
                                 "images/comercios/farmacia/saudeFarma/divulgacao/2.jpg",              
                                  "images/comercios/farmacia/saudeFarma/divulgacao/1.jpg",
                                     
                                  "images/comercios/farmacia/saudeFarma/divulgacao/3.jpg",
                                 
                              ], 
                              novidadesDescriptions: [  
                                 "Esses são alguns dos sinais que sua pressão pode estar alta, é importante ficar atento nesse checklisk!",                          
                                "Faça o aferimento de glicemia e pressão aqui conosco!",
                                  
                                      "Fraudas e lenço do Scooby doo você encontra na Saúde Farma, venha conferir!",
                                        
                                
                              ],
                          },
          */
          // aqui









        ],

      },


      // INICIO SETOR PUBLICO



      {
        link: document.querySelector("#menuAgendamento"),
        title: "Agendamento",
        establishments: [
          {

            name: "Agendamento Saude",
            hours: "Seg a Sex: 8:30h as 12:00h - 13:30 as 17:00h",
            address: "-",
            contact: "(43) 99825-0996",
            contact2: "(43) 98872-8504",

          },

          {

            name: "Agendamento De Viagens",
            hours: "Seg a Sex: 8:30h as 12:00h, 13:30 as 17:00h",
            address: "-",

            contact: "(43) 99825-1005",


          },
        ],
      },

      {
        link: document.querySelector("#menuAmbulatorio"),
        title: "Ambulatorio Do Hospital",
        establishments: [
          {
            image: "images/setorPublico/ambulatorio/perfil.jpg",
            name: "Ambulatorio Do Hospital",
            hours: "Seg a Sex: 8:00h as 17:00h",
            statusAberto: ".",
            horarios: {
              seg: [{ inicio: "08:00", fim: "17:00" }],
              ter: [{ inicio: "08:00", fim: "17:00" }],
              qua: [{ inicio: "08:00", fim: "17:00" }],
              qui: [{ inicio: "08:00", fim: "17:00" }],
              sex: [{ inicio: "08:00", fim: "17:00" }],
              sab: [],
              dom: []
            },
            address: "R. Marcos Rodrigues do Amaral, S/N - Carlopolis",
            contact: "(43) 99113-3084",


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
            hours: "Seg a Sex: 09:00h as 12:00h",
            statusAberto: ".",
            horarios: {
              seg: [{ inicio: "09:00", fim: "12:00" }],
              ter: [{ inicio: "09:00", fim: "12:00" }],
              qua: [{ inicio: "09:00", fim: "12:00" }],
              qui: [{ inicio: "09:00", fim: "12:00" }],
              sex: [{ inicio: "09:00", fim: "12:00" }],
              sab: [],
              dom: []
            },
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
            hours: "Seg a Sex: 08:00h as 12:00h - 13:00h as 17:00h",
            statusAberto: ".",
            horarios: {
              seg: [{ inicio: "08:00", fim: "12:00" }, { inicio: "13:00", fim: "17:00" }],
              ter: [{ inicio: "08:00", fim: "12:00" }, { inicio: "13:00", fim: "17:00" }],
              qua: [{ inicio: "08:00", fim: "12:00" }, { inicio: "13:00", fim: "17:00" }],
              qui: [{ inicio: "08:00", fim: "12:00" }, { inicio: "13:00", fim: "17:00" }],
              sex: [{ inicio: "08:00", fim: "12:00" }, { inicio: "13:00", fim: "17:00" }],
              sab: [],
              dom: []
            },
            address: "Rua Padre Hugo, 1025 - Carlopolis",
            contact: "(43) 3566-2354",
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
            statusAberto: ".",
            horarios: {
              seg: [{ inicio: "09:00", fim: "15:00" }],
              ter: [{ inicio: "09:00", fim: "15:00" }],
              qua: [{ inicio: "09:00", fim: "15:00" }],
              qui: [{ inicio: "09:00", fim: "15:00" }],
              sex: [{ inicio: "09:00", fim: "15:00" }],
              sab: [],
              dom: []
            },
            address: "R. Salvira Marquês, 366",
            contact: "(43) 98485-1626",
            facebook: "https://www.facebook.com/p/Cras-Carl%C3%B3polis-100013825331932/?locale=pt_PT",
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
            hours: "Seg a Sex: 08:30h as 12:30h ",
            statusAberto: ".",
            horarios: {
              seg: [{ inicio: "08:30", fim: "12:30" }],
              ter: [{ inicio: "08:30", fim: "12:30" }],
              qua: [{ inicio: "08:30", fim: "12:30" }],
              qui: [{ inicio: "08:30", fim: "12:30" }],
              sex: [{ inicio: "08:30", fim: "12:30" }],
              sab: [],
              dom: []
            },
            address: "R. Padre Hugo, 843 ",
            contact: "(43) 3377-5023",
            facebook: "https://www.facebook.com/p/Cras-Carl%C3%B3polis-100013825331932/?locale=pt_PT",
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
            facebook: "#",
          },


          {
            image: "images/setorPublico/creche/perfil.png",
            name: "Isabel Dalla B da Silva C M e I Profa",
            hours: "-",
            address: "Av dos Diogossn",
            contact: "(43) 3566-2330",
            instagram: "https://www.instagram.com/cmeiisabel/",
          },

          {

            name: "Marinha Fogaca de Oliveira C M e I",
            hours: "-",
            address: "Est Mun Espirito Santo, 95",
            contact: "(43) 3566-2705",
            facebook: "#",
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
            address: "R. Kaliu keder, 620 - Carlopolis",
            contact: "Rodoviaria: (43) 3566-1393",
            contact2: "Princesa: (43) 99926-6484",
            contact3: "Pedro (43) 99641-0412",
            hours: "Seg a Sex - 08:30 as 11:00<br> 13:30 as 16:00 e 23:00 as 23:40<br>Sab: 08:30 as 11:00<br>Dom: 23:30 as 23:40",
            infoAdicional: "<a target='_blank'  style='color:#2da6ff;' href='https://queropassagem.com.br/rodoviaria-de-carlopolis-pr?wpsrc=Google%20AdWords&wpcid=15361090317&wpsnetn=x&wpkwn=&wpkmatch=&wpcrid=&wpscid=&wpkwid=&gad_source=1&gad_campaignid=15361092411&gbraid=0AAAAADpKqgF9tpsAwMZNVxXOyQz1HO5FS&gclid=Cj0KCQjwt8zABhDKARIsAHXuD7bNWFyJzC0hKW5n8saZVgNqiBJbBtlcDLdxbyVAsun4w8d07isBGGIaAnL7EALw_wcB'>Compre sua Passagem</a>",


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
            address: "R. Benedito Salles, 1060 - Carlopolis",
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
            address: "R. Benedito Salles, 1232 - Carlopolis",
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
            address: "R. Kali Keder, 350 - Carlopolis ",
            contact: "(43) 3566-1202",
          },
        ],
      },



      {
        link: document.querySelector("#menuEscolaPublica"),

        title: "Escola Publica",
        establishments: [


          {

            name: "Benedito Rodrigues de Camargo",
            hours: "Seg a Sex: 09:00h - 18:00h",
            address: "Av. Elson Soares, 295 - Carlopolis",
            contact: "(43) 3566-1496",
            infoAdicional: "Turno: Manha e Tarde",
          },

          {
            image: "images/setorPublico/escolaPublica/carolinaLupion.png",
            name: "Carolina Lupion",
            hours: "Seg a Sex: 09:00h as 18:00h",
            address: "R. Jorge Barros, 1095 - Carlopolis",
            contact: "(43) 3566-1295",
            infoAdicional: "Turno: Manha e Tarde",
          },



          {
            image: "images/setorPublico/escolaPublica/raymunda.png",
            name: "CMEI Raymunda Santana Salles",
            hours: "Seg a Sex: 09:00h as 18:00h",
            address: "Rua Nicolau Miguel, 233 - Carlopolis",
            contact: "(43) 3566-2273",
            infoAdicional: "Turno: Manha",
          },



          {
            image: "images/setorPublico/escolaPublica/joseSalles.png",
            name: "Escola Municipal José Salles",
            hours: "Seg a Sex: 07:45h - 17h",
            address: "R. Quaresmeira Roxa, Jardim Vista Alegre - 400 - Carlopolis",
            contact: "(43) 3566-1275",
            contact2: "(43) 98868-1323",
            infoAdicional: "Turno: Manha e Tarde",
          },

          {
            image: "images/setorPublico/escolaPublica/hercilia.png",
            name: "Hercília de Paula e Silva",
            hours: "Seg a Sex: 06:30h - 18:30h",
            address: "Av. Elson Soares, 34",
            contact: "(43) 3566-1282",
            contact2: "(43) 98840-0984",
            infoAdicional: "Turno: Manha e Tarde",
          },
        ],
      },


      {
        link: document.querySelector("#menuFarmaciaMunicipal"),
        title: "Farmacia Municipal",
        establishments: [
          {
            image: "images/setorPublico/farmaciaMunicipal/perfil.jpg",
            name: "Farmacia Municipal",
            hours: "Seg a Sex: 08:00h as 11:00h -  13:00 as 17:00h",
            address: "R. Laurindo Franco de Godói, 787 - Carlópolis",
            contact: "#",


          },
        ],
      },


      {
        link: document.querySelector("#menuPostoSaude"),
        title: "Posto de Saude",
        establishments: [
          {
            image: "images/setorPublico/postoSaude/drjose.jpg",
            name: "Centro de Saude Dr José",
            hours: "Seg a Sex: 07:00h as 11:00h - 13:00 as 17:00h",
            statusAberto: ".",
            horarios: {
              seg: [{ inicio: "07:00", fim: "11:00" }, { inicio: "13:00", fim: "17:00" }],
              ter: [{ inicio: "07:00", fim: "11:00" }, { inicio: "13:00", fim: "17:00" }],
              qua: [{ inicio: "07:00", fim: "11:00" }, { inicio: "13:00", fim: "17:00" }],
              qui: [{ inicio: "07:00", fim: "11:00" }, { inicio: "13:00", fim: "17:00" }],
              sex: [{ inicio: "07:00", fim: "11:00" }, { inicio: "13:00", fim: "17:00" }],
              sab: [],
              dom: []
            },
            address: "Av. Elson Soares,769 - Carlópolis",
            contact: "(43) 3566-1328",

          },

          {
            image: "images/setorPublico/postoSaude/celeide.jpg",
            name: "UBS Celeide Robles",
            hours: "Seg a Sex: 07:00h as 11h - 13:00h as 17:00h",
            statusAberto: ".",
            horarios: {
              seg: [{ inicio: "07:00", fim: "11:00" }, { inicio: "13:00", fim: "17:00" }],
              ter: [{ inicio: "07:00", fim: "11:00" }, { inicio: "13:00", fim: "17:00" }],
              qua: [{ inicio: "07:00", fim: "11:00" }, { inicio: "13:00", fim: "17:00" }],
              qui: [{ inicio: "07:00", fim: "11:00" }, { inicio: "13:00", fim: "17:00" }],
              sex: [{ inicio: "07:00", fim: "11:00" }, { inicio: "13:00", fim: "17:00" }],
              sab: [],
              dom: []
            },
            address: "R. Laurindo Franco de Godói, 71 - Carlópolis",
            contact: "(43) 99177-9432",

          },

          {
            image: "images/setorPublico/postoSaude/eugenioNeves.png",
            name: "UBS Eugênio Neves Soares",
            hours: "Seg a Sex: 8:00h as 17h",
            statusAberto: ".",
            horarios: {
              seg: [{ inicio: "08:00", fim: "11:00" }, { inicio: "13:00", fim: "17:00" }],
              ter: [{ inicio: "08:00", fim: "11:00" }, { inicio: "13:00", fim: "17:00" }],
              qua: [{ inicio: "08:00", fim: "11:00" }, { inicio: "13:00", fim: "17:00" }],
              qui: [{ inicio: "08:00", fim: "11:00" }, { inicio: "13:00", fim: "17:00" }],
              sex: [{ inicio: "08:00", fim: "11:00" }, { inicio: "13:00", fim: "17:00" }],
              sab: [],
              dom: []
            },
            address: "Rua Bauínea,79 - Carlópolis",
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
            hours: "Seg a Sex: 08:30h - 12:00h -  13:30 as 17:00h",
            statusAberto: ".",
            horarios: {
              seg: [{ inicio: "08:30", fim: "12:00" }, { inicio: "13:30", fim: "17:00" }],
              ter: [{ inicio: "08:30", fim: "12:00" }, { inicio: "13:30", fim: "17:00" }],
              qua: [{ inicio: "08:30", fim: "12:00" }, { inicio: "13:30", fim: "17:00" }],
              qui: [{ inicio: "08:30", fim: "12:00" }, { inicio: "13:30", fim: "17:00" }],
              sex: [{ inicio: "08:30", fim: "12:00" }, { inicio: "13:30", fim: "17:00" }],
              sab: [],
              dom: []
            },
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
            statusAberto: ".",
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
            statusAberto: ".",
            horarios: {
              seg: [{ inicio: "07:00", fim: "11:00" }, { inicio: "13:00", fim: "17:00" }],
              ter: [{ inicio: "07:00", fim: "11:00" }, { inicio: "13:00", fim: "17:00" }],
              qua: [{ inicio: "07:00", fim: "11:00" }, { inicio: "13:00", fim: "17:00" }],
              qui: [{ inicio: "07:00", fim: "11:00" }, { inicio: "13:00", fim: "17:00" }],
              sex: [{ inicio: "07:00", fim: "11:00" }, { inicio: "13:00", fim: "17:00" }],
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
            statusAberto: ".",
            horarios: {
              seg: [{ inicio: "08:00", fim: "11:30" }, { inicio: "13:00", fim: "17:00" }],
              ter: [{ inicio: "08:00", fim: "11:30" }, { inicio: "13:00", fim: "17:00" }],
              qua: [{ inicio: "08:00", fim: "11:30" }, { inicio: "13:00", fim: "17:00" }],
              qui: [{ inicio: "08:00", fim: "11:30" }, { inicio: "13:00", fim: "17:00" }],
              sex: [{ inicio: "08:00", fim: "11:30" }, { inicio: "13:00", fim: "17:00" }],
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
            statusAberto: ".",
            horarios: {
              seg: [{ inicio: "08:00", fim: "11:00" }, { inicio: "13:00", fim: "17:00" }],
              ter: [{ inicio: "08:00", fim: "11:00" }, { inicio: "13:00", fim: "17:00" }],
              qua: [{ inicio: "08:00", fim: "11:00" }, { inicio: "13:00", fim: "17:00" }],
              qui: [{ inicio: "08:00", fim: "11:00" }, { inicio: "13:00", fim: "17:00" }],
              sex: [{ inicio: "08:00", fim: "11:00" }, { inicio: "13:00", fim: "17:00" }],
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
            statusAberto: ".",
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
            contact2: " (43) 99630-7501",
            delivery: "Sim / Sem Taxa",
            instagram: "https://www.instagram.com/binhomotocenter/",
            facebook: "https://www.facebook.com/Motocenterbinho",
            novidadesImages: [
              "images/comercios/motoCenter/binho/divulgacao/1.jpg",
              "images/comercios/motoCenter/binho/divulgacao/2.jpg",
              "images/comercios/motoCenter/binho/divulgacao/3.jpg",

              "images/comercios/motoCenter/binho/divulgacao/4.jpg",
              "images/comercios/motoCenter/binho/divulgacao/5.jpg",
              "images/comercios/motoCenter/binho/divulgacao/6.jpg",

              "images/comercios/motoCenter/binho/divulgacao/7.jpg",



            ],
            novidadesDescriptions: [
              "Linha completa em capacetes!",
              "Muitos acessorios",
              "Muitos acessorios",
              "Linha de oleo para todos os tipos de motores de motos",
              "Linha de escapamentos",
              "Temos pneus para todas as rodagens",
              "Uma Oficina ampla e estruturada",


            ],
          },
        ],
      },









      {
        link: document.querySelector("#menuMotoTaxi"),
        title: "Moto Taxi",
        establishments: [
          {
            image: "images/comercios/motoTaxi/modesto/perfil.jpg",
            name: "Moto Taxi Modesto",
            hours: "Seg a Sab: 06:00h as 21:30h",
            statusAberto: ".",
            horarios: {
              seg: [{ inicio: "06:00", fim: "21:30" }],
              ter: [{ inicio: "06:00", fim: "21:30" }],
              qua: [{ inicio: "06:00", fim: "21:30" }],
              qui: [{ inicio: "06:00", fim: "21:30" }],
              sex: [{ inicio: "06:00", fim: "21:30" }],
              sab: [{ inicio: "06:00", fim: "21:30" }],
              dom: [],
            },
            address: "R. Andrino Soares, 370 - Carlópolis",
            contact: " (43) 99137-5516",
            contact2: " (43) 98831-1691",

            infoAdicional: "Nossos Serviços:<br><br>📦 Coletar<br>📦📦Encomendas<br>🚚 Entregas<br>🛵 Transporte de pessoas<br><br>Formas de Pagamento:<br><br>💳 Cartão de Credito<br>💵 Dinheiro em especie<br> 📲 Pix",
            instagram: "https://www.instagram.com/mototaximodesto_carlopolis/",

            novidadesImages: [
              "images/comercios/motoTaxi/modesto/divulgacao/1.jpg",
              "images/comercios/motoTaxi/modesto/divulgacao/2.jpg",
              "images/comercios/motoTaxi/modesto/divulgacao/3.jpg",
              //"images/comercios/motoTaxi/modesto/divulgacao/4.jpg",


            ],
            novidadesDescriptions: [

              "",


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
            statusAberto: ".",
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
            instagram: "https://www.instagram.com/borracharia.vidanova/",
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


          {
            image: "images/comercios/borracharia/juninho/perfil.jpg",
            name: "Borracharia JR",
            hours: "Seg a Sex: 06:30h as 18:00h <br>Sab: 06:30 as 14:00h",
            statusAberto: ".",
            horarios: {
              seg: [{ inicio: "06:30", fim: "18:00" }],
              ter: [{ inicio: "06:30", fim: "18:00" }],
              qua: [{ inicio: "06:30", fim: "18:00" }],
              qui: [{ inicio: "06:30", fim: "18:00" }],
              sex: [{ inicio: "06:30", fim: "18:00" }],
              sab: [{ inicio: "06:30", fim: "14:00" }],
              dom: [],
            },
            address: "R. Benedito Sales, 1560 - Carlopolis",
            contact: "(43) 99167-4917",
            infoAdicional: "Balanceamento de carro e caminhonete<br>Vulcanização laterais<br>Pneus Remoldi<br>Camera de Ar",
            instagram: "#",

          },
        ],
      },




      {
        link: document.querySelector("#menuAutoEletrico"),
        title: "Auto Eletrico",
        establishments: [
          {
            image: "images/comercios/autoEletrica/renan/perfil.jpg",
            name: "Renan Auto Elétrica",
            hours: "Seg a Sex: 08:00h as 18:00h",
            statusAberto: ".",
            horarios: {
              seg: [{ inicio: "08:00", fim: "18:00" }],
              ter: [{ inicio: "08:00", fim: "18:00" }],
              qua: [{ inicio: "08:00", fim: "18:00" }],
              qui: [{ inicio: "08:00", fim: "18:00" }],
              sex: [{ inicio: "08:00", fim: "18:00" }],
              sab: [],
              dom: [],
            },
            address: "R. Genova, 20 - Carlopolis",
            contact: "(43) 99956-2443",
            instagram: "https://www.instagram.com/renan_autoeletrica/",
            infoAdicional: "🏠 - Atendemos a Domicilio<br>🚜 - Fazemos Socorro em sitios<br>❄️ - Manutençao e instalaçao de ar condicionados em veiculos<br>🚗 - Serviço de Leva e Tras!",
            novidadesImages: [
              "images/comercios/autoEletrica/renan/divulgacao/1.jpg",


            ],
            novidadesDescriptions: [
              "Ampla area para tambem atendimento em Caminhoes, Tratores e maquinario agricola",



            ],



          },
        ],
      },



      {
        link: document.querySelector("#menuAutoCenter"),
        title: "Auto Center",
        establishments: [
          {
            image: "images/comercios/autoCenter/body/perfil.jpg",
            name: "Body Auto Center",
            hours: "Seg a Sex: 08:00h as 18:00h<br>Sab: 08:00h as 12:00h",
            statusAberto: ".",
            horarios: {
              seg: [{ inicio: "08:00", fim: "18:00" }],
              ter: [{ inicio: "08:00", fim: "18:00" }],
              qua: [{ inicio: "08:00", fim: "18:00" }],
              qui: [{ inicio: "08:00", fim: "18:00" }],
              sex: [{ inicio: "08:00", fim: "18:00" }],
              sab: [{ inicio: "08:00", fim: "12:00" }],
              dom: [],
            },
            address: "R. Nicolau Miguel, 577 - Carlopolis",
            contact: "(43) 99921-2122",
            contact2: "(43) 3566-2419",
            instagram: "https://www.instagram.com/bodysomacessorios/",
            infoAdicional: "🏠 - Atendemos a Domicilio<br>🚜 - Fazemos Socorro em sitios<br>❄️ - Manutençao e instalaçao de ar condicionados em veiculos<br>🚗 - Serviço de Leva e Tras!<br> Insufilme<br>🔋 Baterias<br>Pneus<br>⚡ Remap<br>🛑 Freios",
            novidadesImages: [
              "images/comercios/autoCenter/body/divulgacao/1.jpg",
              "images/comercios/autoCenter/body/divulgacao/2.jpg",
              "images/comercios/autoCenter/body/divulgacao/3.jpg",
              "images/comercios/autoCenter/body/divulgacao/4.jpg",
              "images/comercios/autoCenter/body/divulgacao/5.jpg",
              "images/comercios/autoCenter/body/divulgacao/6.jpg",
              "images/comercios/autoCenter/body/divulgacao/7.jpg",
              "images/comercios/autoCenter/body/divulgacao/8.jpg",
              "images/comercios/autoCenter/body/divulgacao/9.jpg",


            ],
            novidadesDescriptions: [
              "Rodas procuradas em toda América Latina, qualidade e com preço só aqui no Body",




            ],



          },
        ],
      },

      ///////

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
        link: document.querySelector("#menuFloricultura"),
        title: "Floricultura",
        establishments: [
          {
            image: "images/comercios/floricultura/rosadesaron/perfil.jpg",
            name: "Rosa de Sarom",
            hours: "Seg a Sab: 08:30h as 18:00h<br>2 ultimos Sab: 08:30h as 12:00h<br>",
            statusAberto: ".",
            horarios: {
              seg: [{ inicio: "08:30", fim: "18:00" }],
              ter: [{ inicio: "08:30", fim: "18:00" }],
              qua: [{ inicio: "08:30", fim: "18:00" }],
              qui: [{ inicio: "08:30", fim: "18:00" }],
              sex: [{ inicio: "08:30", fim: "18:00" }],
              sab: [{ inicio: "08:30", fim: "18:00" }],
              dom: [],
            },
            address: "Rua Padre Hugo, 818 - Carlopolis",
            contact: "(43) 99632-0028",
            contact2: "(43) 99805-9591",
            instagram: "https://www.instagram.com/saromflores/",
            facebook: "https://www.facebook.com/www.rosadesarom/",
            novidadesImages: [
              "images/comercios/floricultura/rosadesaron/divulgacao/1.jpg",
              "images/comercios/floricultura/rosadesaron/divulgacao/2.jpg",
              "images/comercios/floricultura/rosadesaron/divulgacao/3.jpg",
              "images/comercios/floricultura/rosadesaron/divulgacao/4.jpg",
              "images/comercios/floricultura/rosadesaron/divulgacao/5.jpg",
              "images/comercios/floricultura/rosadesaron/divulgacao/6.jpg",
              "images/comercios/floricultura/rosadesaron/divulgacao/7.jpg",
              "images/comercios/floricultura/rosadesaron/divulgacao/8.jpg",
              "images/comercios/floricultura/rosadesaron/divulgacao/9.jpg",
              "images/comercios/floricultura/rosadesaron/divulgacao/10.jpg",
            ],
            novidadesDescriptions: [
              "Lindos Buques de Rosas",
              "Lindos Buques de Rosas Amarelas",
              "Temos Orquideas",
              "Lindos Buques de flores mistas",
              "Presenteie quem voce gosta com nossas cestas de chocolate ",
              "Presenteie quem voce gosta com nossas cestas de café da manha",
              "Lindos crisântemos",
              "Buques de rosas com decoração",
              "Temos varios itens para que voce possa presentear",
              "Montamos o presente do jeito que pedir",


            ],
          },
        ],
      },




      {
        link: document.querySelector("#menuLojaPesca"),
        title: "Loja de Pesca",
        establishments: [




          {
            image: "images/comercios/lojadepesca/thiago/perfil.jpg",
            name: "Loja Thiago Aguera",
            hours: "Seg a Sex: 07:30h as 19:30h<br>Sab: 07:00h as 17:00h",
            statusAberto: ".",
            horarios: {
              seg: [{ inicio: "07:30", fim: "19:30" }],
              ter: [{ inicio: "07:30", fim: "19:00" }],
              qua: [{ inicio: "07:30", fim: "19:00" }],
              qui: [{ inicio: "07:30", fim: "19:00" }],
              sex: [{ inicio: "07:30", fim: "19:00" }],
              sab: [{ inicio: "07:00", fim: "17:00" }],
              dom: [],
            },
            address: "R. Benedito Salles, 637 - Carlopolis",
            contact: "(43) 99177-5226",
            instagram: "https://www.instagram.com/lojathiagoaguera/",
            facebook: "https://www.facebook.com/thiagoagueraparanafishingteam",
            site: "https://thiagoaguera.com.br/",
            infoAdicional: "Participe dos nossos grupos, acesse: <a target='_blank' style='color:#2da6ff;' href='https://linktr.ee/thiagoaguera?fbclid=PAZXh0bgNhZW0CMTEAAac0ZKqOBGEodhRS0HLfsGrN_c8ezIX72_c4icn9ZXQvUkI8_YfxE02fT-AJeQ_aem_GjbNm-TtqQr33uPA79l21Q'  >LinkTree</a>",

            novidadesImages: [
              "images/comercios/lojadepesca/thiago/divulgacao/1.jpg",
              "images/comercios/lojadepesca/thiago/divulgacao/2.jpg",
              "images/comercios/lojadepesca/thiago/divulgacao/3.jpg",
              "images/comercios/lojadepesca/thiago/divulgacao/4.jpg",
              "images/comercios/lojadepesca/thiago/divulgacao/5.jpg",
              "images/comercios/lojadepesca/thiago/divulgacao/6.jpg",
              "images/comercios/lojadepesca/thiago/divulgacao/7.jpg",
            ],
            novidadesDescriptions: [

              "A Jackall Squad Shad 65SP é uma isca japonesa de alta performance, projetada para pescadores que exigem precisão e eficiência. Com 6,5 cm de comprimento e 5,8 g, ela possui ação suspending, mantendo-se na mesma profundidade mesmo durante as pausas, ideal para dias em que os predadores estão mais cautelosos. Seu sistema interno de balanceamento proporciona um nado errático que simula um peixe ferido, aumentando a atratividade para espécies como tucunaré, robalo e black bass. Equipada com garatéias afiadas e acabamento detalhado, é uma escolha confiável para diversas condições de pesca",
              "A máquina +1 veio pra complementar ainda mais sua caixa de iscas! Com sua nova barbela maior, a máquina agora chega a profundidade de 2,20, atingindo águas mais profundas para sua captura perfeita!",
              "O molinete Daisen Inverse 10 é uma opção robusta e versátil para pescadores que buscam desempenho e confiabilidade. Com 11 rolamentos em aço inoxidável (10 de esferas e 1 de roletes), oferece recolhimento suave e eficiente. Seu sistema de carretel flutuante com eixo curto reduz o atrito, proporcionando arremessos mais longos e precisos. O chassi em grafite de alta densidade garante leveza e resistência, enquanto o freio magnético e o drag de 8 kg asseguram controle durante as capturas. A manivela em alumínio com knob em EVA de alta densidade oferece conforto mesmo em longas jornadas de pesca.",
              "A Shimano SLX DC XT 70/71 XG é uma carretilha de perfil baixo que combina tecnologias avançadas para oferecer desempenho superior na pesca esportiva. Equipada com o sistema de freio digital I-DC5, ela ajusta automaticamente a força de frenagem, proporcionando arremessos longos e precisos, mesmo em condições adversas. O carretel MGL Spool III de baixa inércia facilita o uso de iscas leves, enquanto a engrenagem MicroModule e o sistema X-Ship garantem uma recuperação suave e potente. Com uma relação de recolhimento de 8.1:1, peso de 195 g e drag máximo de 5,5 kg, esta carretilha é ideal para pescarias que exigem velocidade e precisão",
              "A ￼ Vara Redai Silverback By Jansen é o mais recente lançamento da @redai. Inspirada na força e liderança do gorila Silverback, esta vara foi projetada para oferecer potência, tecnologia e alto desempenho nas pescarias mais desafiadoras. <BR>A Silverback possui ação rápida, ideal para fisgadas precisas e controle durante o trabalho com iscas. Seu blank de carbono de alto módulo proporciona leveza e sensibilidade, enquanto os passadores Fuji Concept O garantem arremessos suaves e durabilidade. O cabo e o reel seat ergonômico oferecem conforto e firmeza durante o uso.",
              "A linha 4x da @kastkingbrazilofficial Hammer Braid é uma escolha de alto desempenho para pescadores que buscam resistência, sensibilidade e durabilidade. Utilizando fibras microfilamentadas de UHMWPE em um padrão exclusivo de trançado Diamond Braid, esta linha oferece até 10% mais resistência do que trançados convencionais de 4 fios na mesma libragem. Seu processo de pré-tratamento com revestimento proprietário (EPC) garante cor duradoura, praticamente sem desbotamento, e maior resistência ao nó. Com uma superfície mais lisa e diâmetro reduzido, proporciona arremessos mais longos e silenciosos, além de excelente resistência à abrasão. Disponível em diversas libragens e cores, é ideal para diversas condições de pesca.",
              "Pescaria top de inverno ! Pouco tempo de pesca e bastante tucunaré amarelo na linha.<br>Todos peixes foram capturado na isca cometa da @itaipujigs",
            ],
          },

















          {
            image: "images/comercios/lojadepesca/pescaepresente/perfil.png",
            name: "Pesca e Presente",
            hours: "Seg a Sab: 08:30h as 18:00h",
            statusAberto: ".",
            horarios: {
              seg: [{ inicio: "08:30", fim: "18:00" }],
              ter: [{ inicio: "08:30", fim: "18:00" }],
              qua: [{ inicio: "08:30", fim: "18:00" }],
              qui: [{ inicio: "08:30", fim: "18:00" }],
              sex: [{ inicio: "08:30", fim: "18:00" }],
              sab: [{ inicio: "08:30", fim: "18:00" }],
              dom: [],
            },
            address: "Rua Benedito Salles, 854 - Carlópolis",
            contact: "(43) 99921-9959",
            instagram: "https://www.instagram.com/pescaepresentes/",

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
        link: document.querySelector("#menuDesentupidora"),
        title: "Desentupidora",
        establishments: [
          {
            image: "images/comercios/desentupidora/gcyVazamentos/perfil.jpg",
            name: "GCY VAZAMENTOS",
            hours: "Seg a Sab: 07:30h as 19:00h",
            statusAberto: ".",
            horarios: {
              seg: [{ inicio: "07:30", fim: "19:00" }],
              ter: [{ inicio: "07:30", fim: "19:00" }],
              qua: [{ inicio: "07:30", fim: "19:00" }],
              qui: [{ inicio: "07:30", fim: "19:00" }],
              sex: [{ inicio: "07:30", fim: "19:00" }],
              sab: [{ inicio: "07:30", fim: "19:00" }],
              dom: []
            },
            address: "R. José Talim, 449 - Carlópolis",
            contact: "(43) 99196-7618",
            facebook: "https://www.facebook.com/gcyvazamentos",
            instagram: "https://www.instagram.com/gcyvazamentos/",
            infoAdicional: "🚽 Desentupimento de esgotos<br>🔎 Detecção de vazamentos<br>🧼 Limpeza de caixa de gordura<br>🔧 Manutenção hidráulica em geral<br>💧 Ralos e pias<br>🛠️ Ramais de esgoto",
            novidadesImages: [
              "images/comercios/desentupidora/gcyVazamentos/divulgacao/1.jpg",
              "images/comercios/desentupidora/gcyVazamentos/divulgacao/2.jpg",
              "images/comercios/desentupidora/gcyVazamentos/divulgacao/3.jpg",
              "images/comercios/desentupidora/gcyVazamentos/divulgacao/4.jpg",
              "images/comercios/desentupidora/gcyVazamentos/divulgacao/5.jpg",

            ],
            novidadesDescriptions: [
              "Se você procura soluções hidráulicas para seu imóvel como: vazamento, limpeza de caixa d'água, desentupimento, manutenção de esgoto e tubulações, serviços de Geofone para caça vazamentos em profundidade, fale conosco",
              "O primeiro sinal de um vazamento de água imperceptível antes de conseguir notar a olho nu, é o aumento notável na conta de água da sua casa. Normalmente quando há um vazamento de água, a conta passa a vir muito mais alta. Fique atento, e caso note o aumento, é melhor começar a procurar logo pelo vazamento e evitar maiores danos e transtornos.",
              "você sabia?<BR>Uma torneira gotejando pode gastar 46 litros por dia, chegando a 1.380 litros por mês? E que um micro vazamento de apenas 2 milímetros no encanamento pode causar um gasto de 3.200 litros por dia? É impressionante o quanto nós podemos gastar sem perceber, por exemplo, se 1m³(que equivale a 1 litro de água) custar R$2,99, com um micro vazamento de 2 milímetros você terá um gasto de R$9,56 por dia, totalizando R$ 286,80 por mês, ou seja, um alto valor que poderia ter outro investimento. Agora pensando no prejuízo que terá durante um ano com o vazamento, o gasto será equivalente a R$3.441,60, isso sem contar o gasto com a mão de obra que terá para reparar os danos causados pelo vazamento. Agora pense em quantas possibilidades você teria para gastar esse valor? Depois de entender os riscos e prejuízos causados por um vazamento, irei apresentar três maneiras fáceis de descobrir se realmente há um vazamento de água.",
              "Sua piscina está com vazamento? Ou tem suspeita do de algo errado?<bR>Os vazamentos de água são comuns, porém perturbadores. Quando digo perturbadores, me refiro ao trabalho que da para encontrar um simples vazamento, principalmente numa piscina, sem contar a conta de água que vai lá para as alturas.",
              "1- Para verificar se há vazamentos no vaso sanitário, jogue um pouco de borra de café ou cinzas no fundo do vaso. <BR><BR>2- Caso a parede de sua casa esteja úmida, procure imediatamente um encanador.<BR><BR>3- Vazamentos na torneira podem ser facilmente verificados quando se é fechada .",

            ],
          },
        ],
      },





      {
        link: document.querySelector("#menuDiskGas"),
        title: "Deposito de Gas",
        establishments: [

          {
            image: "images/comercios/depositoGas/cnCasaDoGas/perfil.jpg",
            name: "CN Casa do Gas",
            hours: "Seg a Sab: 08:00h as 19:00h </br>Dom: 09:00h as 12:00h",
            statusAberto: ".",
            horarios: {
              seg: [{ inicio: "08:00", fim: "19:00" }],
              ter: [{ inicio: "08:00", fim: "19:00" }],
              qua: [{ inicio: "08:00", fim: "19:00" }],
              qui: [{ inicio: "08:00", fim: "19:00" }],
              sex: [{ inicio: "08:00", fim: "19:00" }],
              sab: [{ inicio: "08:00", fim: "19:00" }],
              dom: [{ inicio: "09:00", fim: "12:00" }]
            },
            address: "Av. Elson Soares, 1048 - Carlopolis",
            contact: "(43) 99829-5216",
            delivery: "Sim / Com Taxa",
            facebook: "https://www.facebook.com/people/CN-Casa-do-G%C3%A1s/100068139145901/",
            instagram: "https://www.instagram.com/ultracarlopolis/",
            novidadesImages: [
              "images/comercios/depositoGas/cnCasaDoGas/divulgacao/1.png",
              "images/comercios/depositoGas/cnCasaDoGas/divulgacao/2.jpg",
              "images/comercios/depositoGas/cnCasaDoGas/divulgacao/3.jpg",


            ],
            novidadesDescriptions: [
              "Nossos Modelos de botijões",
              "",
              "Temos Galões de 20lts de agua e carvão",
            ],
          },

          {
            image: "images/comercios/depositoGas/liaGas/liaGas.png",
            name: "Lia Gas",
            hours: "Seg a Sex: 08:00h as 20:00h<br>Sab: 08:00h as 19:00h",
            statusAberto: ".",
            horarios: {
              seg: [{ inicio: "08:00", fim: "20:00" }],
              ter: [{ inicio: "08:00", fim: "20:00" }],
              qua: [{ inicio: "08:00", fim: "20:00" }],
              qui: [{ inicio: "08:00", fim: "20:00" }],
              sex: [{ inicio: "08:00", fim: "20:00" }],
              sab: [{ inicio: "08:00", fim: "19:00" }],
              dom: []
            },
            address: "R. Kalil Keder, 910 - Carlopolis",
            contact: "(43) 99821-7243",
            contact2: "(43) 99844-5345",
            delivery: "Sim / Sem Taxa",
            facebook: "https://www.facebook.com/liagasclps/",
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



      ////////////

      {
        link: document.querySelector("#menuDoces"),
        title: "Doces e Chocolates",
        establishments: [

          {
            image: "images/comercios/docesChocolates/cacauShow/perfil.jpg",
            name: "Cacau Show",
            hours: "Seg a Sab: 11:00h as 23:00h",
            statusAberto: ".",
            horarios: {
              seg: [{ inicio: "11:00", fim: "23:00" }],
              ter: [{ inicio: "11:00", fim: "23:00" }],
              qua: [{ inicio: "11:00", fim: "23:00" }],
              qui: [{ inicio: "11:00", fim: "23:00" }],
              sex: [{ inicio: "11:00", fim: "23:00" }],
              sab: [{ inicio: "11:00", fim: "23:00" }],
              dom: []
            },
            address: "Rua: Padre Hugo, 460 - Carlopolis",
            contact: "(43) 99105-3711",
            delivery: "Não",

            instagram: "https://www.instagram.com/lojacacaushowcarlopolis/",
            novidadesImages: [
              "images/comercios/docesChocolates/cacauShow/divulgacao/1.jpg",
              "images/comercios/docesChocolates/cacauShow/divulgacao/2.jpg",
              "images/comercios/docesChocolates/cacauShow/divulgacao/3.jpg",
              "images/comercios/docesChocolates/cacauShow/divulgacao/4.jpg",
              "images/comercios/docesChocolates/cacauShow/divulgacao/5.jpg",
              "images/comercios/docesChocolates/cacauShow/divulgacao/6.jpg",
            ],
            novidadesDescriptions: [
              "O Cacau é a moeda digital do programa Cacau Lovers! Acesse o Link <a href='https://lovers.cacaushow.com.br/momentos-especiais'>-- Cacau Lovers --</a> e venha ser cliente Cacau Lovers ",
              "Resgate Lovers",
              "É hora de LaNut e LaCreme<br>Nessa campanha, nas quintas temos promoção desses tabletes deliciosos!😋<br>2 Tabletes especiais de 100g por apenas R$ 29,99.",
              "Biscoitos crocantes com o melhor chocolate!",
              "Quando o amor é verdadeiro, a combinação é perfeita.",
              "Tem carinho que se transforma em chocolate.<br>E tem presente que carrega todo o amor do mundo.<br>Quando o amor é único, o presente também precisa ser.",
            ],



            promocoes: [
              {
                imagem: "images/comercios/docesChocolates/cacauShow/promocao/1.jpg",
                titulo: "Trufas 13,5g",
                preco: 2.62,
                unidade: "A UNIDADE",
                validadeFim: "2025-09-30",
                obs: "Oferta válida até durar o estoque"
              },

              {
                imagem: "images/comercios/docesChocolates/cacauShow/promocao/2.jpg",
                titulo: "Trufas Classicas 30g",
                preco: "R$ 3,74",
                unidade: "A UNIDADE",
                validadeFim: "2025-09-28",
                obs: "Oferta válida até durar o estoque"
              },

              {
                imagem: "images/comercios/docesChocolates/cacauShow/promocao/3.jpg",
                titulo: "Trufas Artesanais 30g",
                preco: "R$ 4,49",
                unidade: "A UNIDADE",
                validadeFim: "2025-09-28",
                obs: "Oferta válida até durar o estoque"
              },

              {
                imagem: "images/comercios/docesChocolates/cacauShow/promocao/4.jpg",
                titulo: "Trufas Zero Açucar 30g",
                preco: "R$ 4,87",
                unidade: "A UNIDADE",
                validadeFim: "2025-09-28",
                obs: "Oferta válida até durar o estoque"
              }
            ]


          },


        ],
      },

      //////////////



      {
        link: document.querySelector("#menuProdutosOrientais"),
        title: "Produtos Orientais",
        establishments: [
          {
            image: "images/comercios/produtosOrientais/seiza/seiza.png",
            name: "Seiza",
            hours: "Seg a Qui: 09:00h as 18:30h <br>Sex: 09:00h as 16:30h </br> Sab: 09:00 as 12:00h",
            statusAberto: ".",
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
            infoAdicional: "Link para nosso Grupo de Ofertas e Novidades: <a target='_blank' style='color:#2da6ff;' href='https://chat.whatsapp.com/CFr4ebifZzgE6fFu4CXb6F?fbclid=PAZXh0bgNhZW0CMTEAAacHiXLLmyzhMTzrCrfIEnjku_fr9ECJp14YSjDGVRbWZkWDjd3JsGY_K91mEg_aem_SLISaT9eNaCaW5Q1NUGKJQ'>Entrar</a>",

            novidadesImages: [
              "images/comercios/produtosOrientais/seiza/divulgacao/9.jpg",
              "images/comercios/produtosOrientais/seiza/divulgacao/2.png",
              "images/comercios/produtosOrientais/seiza/divulgacao/1.jpg",
              "images/comercios/produtosOrientais/seiza/divulgacao/3.png",
              "images/comercios/produtosOrientais/seiza/divulgacao/4.png",
              "images/comercios/produtosOrientais/seiza/divulgacao/5.png",
              "images/comercios/produtosOrientais/seiza/divulgacao/6.png",
              "images/comercios/produtosOrientais/seiza/divulgacao/7.png",
              "images/comercios/produtosOrientais/seiza/divulgacao/8.png",

              "images/comercios/produtosOrientais/seiza/divulgacao/10.jpg",
              "images/comercios/produtosOrientais/seiza/divulgacao/11.jpg",
              "images/comercios/produtosOrientais/seiza/divulgacao/12.jpg",
              "images/comercios/produtosOrientais/seiza/divulgacao/13.jpg",
              "images/comercios/produtosOrientais/seiza/divulgacao/14.jpg",



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
              "Shiro Moti: feito de arroz glutinoso (motigome), geralmente assado na chapa até ficar crocante por fora e macio por dentro, servido com açúcar e shoyu!",



              "Yaki manju: doce oriental assado com recheio de anko (doce de feijão azuki)",
              "Ampan: Pão fofinho com recheio de anko (pasta de doce de feijão azuki)",
              "Moti com anko: massa de moti recheado de anko (pasta de doce de feijão azuki)",
              "Kanten: Doce de gelatina de algas",
            ],

          },
        ],
      },


      {
        link: document.querySelector("#menuMarmoraria"),
        title: "Marmoraria",
        establishments: [
          {
            image: "images/comercios/marmoraria/2irmaos/perfil.jpg",
            name: "Marmoraria 2 Irmaos",
            hours: "Seg a Sex: 07:00h as 18:00h </br> Sab: 08:00h as 13:00h",
            statusAberto: ".",
            horarios: {
              seg: [{ inicio: "07:00", fim: "18:00" }],
              ter: [{ inicio: "07:00", fim: "18:00" }],
              qua: [{ inicio: "07:00", fim: "18:00" }],
              qui: [{ inicio: "07:00", fim: "18:00" }],
              sex: [{ inicio: "07:00", fim: "18:00" }],
              sab: [{ inicio: "07:00", fim: "17:00" }],
              dom: []
            },
            address: "Rua Paul Harris, 116 - Carlópolis",
            contact: "(43) 99181-1412",
            instagram: "https://www.instagram.com/marmoraria2irmaos.oficial/",
            infoAdicional: "⛰️ MÁRMORES E GRANITOS<br>🧼 PIAS<br>🚰 LAVATÓRIOS<br>⚰️ TÚMULOS<br>🚪 Soleiras",
            novidadesImages: [
              "images/comercios/marmoraria/2irmaos/divulgacao/1.jpg",
              "images/comercios/marmoraria/2irmaos/divulgacao/2.jpg",
              "images/comercios/marmoraria/2irmaos/divulgacao/3.jpg",
              "images/comercios/marmoraria/2irmaos/divulgacao/4.jpg",


            ],
            novidadesDescriptions: [
              "Pia no preto Negresco",
              "Cozinha no branco Siena.",
              "Banheira no Mármore branco",
              "Escada feita no mármore Crema Marfil",





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
            statusAberto: ".",
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
            instagram: "https://www.instagram.com/lojaferreira1/",
            novidadesImages: [
              "images/comercios/materialConstrucao/ferreira/divulgacao/1.jpg",
              //  "images/comercios/materialConstrucao/ferreira/divulgacao/11.png",
              "images/comercios/materialConstrucao/ferreira/divulgacao/2.png",
              "images/comercios/materialConstrucao/ferreira/divulgacao/3.png",
              "images/comercios/materialConstrucao/ferreira/divulgacao/4.png",
              "images/comercios/materialConstrucao/ferreira/divulgacao/5.png",
            ],
            novidadesDescriptions: [
              "Venha participar! e tambem teremos o sorteio de Furadeira Worker 550W 🔧⚡<br>📌 Para participar é simples:<br>➡️ Acesse a página @carlopolitanafm<br>➡️ Siga as regras do post oficial<br>🗓 O sorteio será no dia 11 de Outubro!<br>💙 Quanto mais cedo participar, mais chances de ganhar!",
              //  "Proteja o que é seu com segurança e qualidade! A Loja Ferreira TEM fechadura trava lateral DOVALE, ideal para garantir mais proteção ao seu espaço",
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
            image: "images/comercios/quitanda/pimentaDoce/pimentadoce.png",
            name: "Pimenta Doce",
            hours: "Ter a Sab: 08:00h as 21:00h<BR>Dom: 08:00h as 20:00h",
            statusAberto: ".",
            horarios: {
              seg: [],
              ter: [{ inicio: "08:00", fim: "21:00" }],
              qua: [{ inicio: "08:00", fim: "21:00" }],
              qui: [{ inicio: "08:00", fim: "21:00" }],
              sex: [{ inicio: "08:00", fim: "21:00" }],
              sab: [{ inicio: "08:00", fim: "21:00" }],
              dom: [{ inicio: "08:00", fim: "20:00" }]
            },
            address: "R Kalil Keder, 491 - Carlopolis",
            contact: "(43) 98806-5747",
            delivery: "Não",
            instagram: "https://www.instagram.com/quintanda.pimenta.doce/",

            novidadesImages: [
              "images/comercios/quitanda/pimentaDoce/divulgacao/1.png",
              "images/comercios/quitanda/pimentaDoce/divulgacao/2.png",
              "images/comercios/quitanda/pimentaDoce/divulgacao/3.png",
              "images/comercios/quitanda/pimentaDoce/divulgacao/4.png",
              "images/comercios/quitanda/pimentaDoce/divulgacao/5.png",
            ],
            novidadesDescriptions: [

              "Temos Porco, Costela e Frango Assados todos os domingos",
              "Temos Massas todas as quartas",
              "Frutas exoticas",
              "Frutas Frescas",
              "Verduras frescas",
            ],
            promocoes: [
              {
                imagem: "images/comercios/quitanda/pimentaDoce/promocao/4.jpg",
                titulo: "Vassoura Caipira",
                precoAntigo: 24.00,
                preco: 19.50,
                unidade: "A UNIDADE",
                validadeFim: "2025-10-30",
                obs: "Oferta válida até durar o estoque",

              },

              {
                imagem: "images/comercios/quitanda/pimentaDoce/promocao/5.jpg",
                titulo: "Tomate",
                precoAntigo: 4.50,
                preco: 2.99,
                unidade: "KG",
                validadeFim: "2025-09-28",
                obs: "Oferta válida até durar o estoque",

              },

              {
                imagem: "images/comercios/quitanda/pimentaDoce/promocao/6.jpg",
                titulo: "Alface Crespa",
                precoAntigo: 3.50,
                preco: 1.95,
                unidade: "A unidade",
                validadeFim: "2025-09-28",
                obs: "Oferta válida até durar o estoque",

              },


            ]









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
            hours: "Dom a Dom: 10:30h as 14:00h",
            statusAberto: ".",
            horarios: {
              seg: [{ inicio: "10:30", fim: "14:00" }],
              ter: [{ inicio: "10:30", fim: "14:00" }],
              qua: [{ inicio: "10:30", fim: "14:00" }],
              qui: [{ inicio: "10:30", fim: "14:00" }],
              sex: [{ inicio: "10:30", fim: "14:00" }],
              sab: [{ inicio: "10:30", fim: "14:00" }],
              dom: [{ inicio: "10:30", fim: "14:00" }]
            },
            address: "R. Benedito Salles, 1241 - Carlopolis",
            contact: "(43) 98844-8407",
            contact2: "(43) 99838-7570",
            delivery: "Sim / Com Taxa",
            novidadesImages: [
              "images/comercios/restaurante/assadaoRussao/divulgacao/1.png",
              "images/comercios/restaurante/assadaoRussao/divulgacao/2.png",
              "images/comercios/restaurante/assadaoRussao/divulgacao/3.png",
              "images/comercios/restaurante/assadaoRussao/divulgacao/4.jpg",
              "images/comercios/restaurante/assadaoRussao/divulgacao/5.jpg",




            ],
            novidadesDescriptions: [
              "Marmita Churrasco!",
              "Marmita de Salada",
              "Marmita com Feijoada",
              "Temos Assados aos domingos: Frango Assado pupuricado",
              "Todos os Domingos, temos Frangos Assados!, encomende o teu!",


            ],

          },

          {
            image: "images/comercios/restaurante/cantinaItaliana/perfil.png",
            name: "Cantina Italiana",
            hours: "Seg: 17:30h a 23:00h <br> Ter: Fechado<br>Qua a Dom: 17:30h a 23:00h",
            statusAberto: ".",
            horarios: {
              seg: [{ inicio: "17:30", fim: "23:00" }],
              ter: [],
              qua: [{ inicio: "17:30", fim: "23:00" }],
              qui: [{ inicio: "17:30", fim: "23:00" }],
              sex: [{ inicio: "17:30", fim: "23:00" }],
              sab: [{ inicio: "17:30", fim: "23:00" }],
              dom: [{ inicio: "17:30", fim: "23:00" }]
            },
            address: "R. Padre Hugo , 463 - Carlópolis",
            contact: "(43) 99640-4484",
            delivery: "Sim / Com Taxa",
            instagram: "https://www.instagram.com/cantina_italiana_joao/",
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
            name: "Emporio São Victor",
            hours: "Seg a Sex: 11:00h as 15:00h - 18:00h as 22:30h</br> Sab: 11:00h as 16:00h",
            statusAberto: ".",
            horarios: {
              seg: [{ inicio: "11:00", fim: "15:00" }, { inicio: "18:00", fim: "22:30" }],
              ter: [{ inicio: "11:00", fim: "15:00" }, { inicio: "18:00", fim: "22:30" }],
              qua: [{ inicio: "11:00", fim: "15:00" }, { inicio: "18:00", fim: "22:30" }],
              qui: [{ inicio: "11:00", fim: "15:00" }, { inicio: "18:00", fim: "22:30" }],
              sex: [{ inicio: "11:00", fim: "15:00" }, { inicio: "18:00", fim: "22:30" }],
              sab: [{ inicio: "11:00", fim: "16:00" }],
              dom: []
            },
            address: "R. Kalil Keder, 90 - Carlopolis",
            contact: "(43) 99111-9484",
            delivery: "Sim / Com Taxa",
            instagram: "https://www.instagram.com/delfinos.mendes1/",
            menuImages: [
              "images/comercios/restaurante/delfino/cardapio/1.jpg",
              "images/comercios/restaurante/delfino/cardapio/2.jpg",
              "images/comercios/restaurante/delfino/cardapio/3.jpg",
              "images/comercios/restaurante/delfino/cardapio/4.jpg",

            ],

            novidadesImages: [
              "images/comercios/restaurante/delfino/divulgacao/1.jpg",
              "images/comercios/restaurante/delfino/divulgacao/2.jpg",
              "images/comercios/restaurante/delfino/divulgacao/3.jpg",
              "images/comercios/restaurante/delfino/divulgacao/4.jpg",

            ], novidadesDescriptions: [

              "Nossa famosa Parmegiana",
              "Venha conhecer nosso ambiente!",
              "Temos porções de tilapia com maionese verde da casa!",
              "Fazemos um Salmãozinho com alcaparras! Divino!",


            ],

          },


          {
            image: "images/comercios/pizzaria/happyhour/perfil.jpg",
            name: "Happy Hour",
            hours: "Seg a Ter: 07:00h as 18:00h<br>Qua a Sex: 07:00 as 23:00<br>Sab: 07:00h as 14:00h - 18:00 as 23:00<br>Dom: 18:00h as 23:00h",
            statusAberto: ".",
            horarios: {
              seg: [{ inicio: "07:00", fim: "18:00" }],
              ter: [{ inicio: "07:00", fim: "18:00" }],
              qua: [{ inicio: "07:00", fim: "23:00" }],
              qui: [{ inicio: "07:00", fim: "23:00" }],
              sex: [{ inicio: "07:00", fim: "23:00" }],
              sab: [{ inicio: "07:00", fim: "14:00" }, { inicio: "18:00", fim: "23:00" }],
              dom: [{ inicio: "18:00", fim: "23:00" }],
            },
            address: "R. Kalil Keder, 753 - Carlopolis",
            contact: "(43) 99636-3463",
            delivery: "Sim / Com Taxa",

            menuImages: [

              "images/comercios/pizzaria/happyhour/cardapio/1.jpg",

              "images/comercios/pizzaria/happyhour/cardapio/2.jpg",
              "images/comercios/pizzaria/happyhour/cardapio/3.jpg",
              "images/comercios/pizzaria/happyhour/cardapio/4.jpg",
              "images/comercios/pizzaria/happyhour/cardapio/5.jpg",
              "images/comercios/pizzaria/happyhour/cardapio/6.jpg",



            ],


            novidadesImages: [

              "images/comercios/pizzaria/happyhour/divulgacao/1.jpg",
              "images/comercios/pizzaria/happyhour/divulgacao/2.jpg",
              "images/comercios/pizzaria/happyhour/divulgacao/3.jpg",
              "images/comercios/pizzaria/happyhour/divulgacao/4.jpg",

            ],
            novidadesDescriptions: [

              "",
              "",
              "",
              "",
              "",


            ]
          },






          {
            image: "images/comercios/restaurante/hime/perfil.jpg",
            name: "Hime",
            hours: "Qui a Sab: 19:00h as 22:00h",
            statusAberto: ".",
            horarios: {
              seg: [],
              ter: [],
              qua: [],
              qui: [{ inicio: "19:00", fim: "22:00" }],
              sex: [{ inicio: "19:00", fim: "22:00" }],
              sab: [{ inicio: "19:00", fim: "22:00" }],
              dom: []
            },
            address: "R. Kalil Keder, 1204 - saída para Ribeirão Claro",
            contact: "(43) 99686-5040",
            delivery: "Sim / Com Taxa",
            menuImages: [
              "images/comercios/restaurante/hime/cardapio/1.jpg",
              "images/comercios/restaurante/hime/cardapio/2.jpg",
              "images/comercios/restaurante/hime/cardapio/3.jpg",
              "images/comercios/restaurante/hime/cardapio/4.jpg",
              "images/comercios/restaurante/hime/cardapio/5.jpg",
              "images/comercios/restaurante/hime/cardapio/6.jpg",
              "images/comercios/restaurante/hime/cardapio/7.jpg",
              "images/comercios/restaurante/hime/cardapio/8.jpg",


            ],


            novidadesImages: [
              "images/comercios/restaurante/hime/divulgacao/1.jpg",
              "images/comercios/restaurante/hime/divulgacao/2.jpg",
              "images/comercios/restaurante/hime/divulgacao/3.jpg",



            ],
            novidadesDescriptions: [
              "Sabiam quem temos Rodizio todas as Sextas-ferias?  ",
              "Nosso famoso Yaki Soba!",
              "Amplo espaço para atendermos toda sua familia! ",
            ],

          },


          {
            image: "images/comercios/restaurante/namigo/perfil.jpg",
            name: "NamiGO Japanese Restaurant",
            hours: "Seg a Sab:16:00h as 00:00h",
            statusAberto: ".",
            horarios: {
              seg: [{ inicio: "16:00", fim: "00:00" }],
              ter: [{ inicio: "16:00", fim: "00:00" }],
              qua: [{ inicio: "16:00", fim: "00:00" }],
              qui: [{ inicio: "16:00", fim: "00:00" }],
              sex: [{ inicio: "16:00", fim: "00:00" }],
              sab: [{ inicio: "16:00", fim: "00:00" }],
              dom: []
            },
            address: "R. Padre Hugo, 460 - Carlopolis",
            contact: "(43) 99166-5381",
            delivery: "Sim / Com Taxa",
            infoAdicional: "<a target='_blank' style='color:#2da6ff;' href='https://namigocarlopolis.eatfood.app/'>Cardapio On Line</a>",

            instagram: "https://www.instagram.com/nami_g0/",
            cardapioLink: "https://namigocarlopolis.eatfood.app/",

            menuImages: [
              "images/comercios/restaurante/namigo/cardapio/1.jpg",
              "images/comercios/restaurante/namigo/cardapio/2.jpg",
              "images/comercios/restaurante/namigo/cardapio/3.jpg",
              "images/comercios/restaurante/namigo/cardapio/4.jpg",
              "images/comercios/restaurante/namigo/cardapio/5.jpg",
              "images/comercios/restaurante/namigo/cardapio/6.jpg",
              "images/comercios/restaurante/namigo/cardapio/7.jpg",
              "images/comercios/restaurante/namigo/cardapio/8.jpg",
              "images/comercios/restaurante/namigo/cardapio/9.jpg",

            ],

            novidadesImages: [
              "images/comercios/restaurante/namigo/divulgacao/1.jpg",
              "images/comercios/restaurante/namigo/divulgacao/2.jpg",
              "images/comercios/restaurante/namigo/divulgacao/3.jpg",
              "images/comercios/restaurante/namigo/divulgacao/4.jpg",
              "images/comercios/restaurante/namigo/divulgacao/5.jpg",

            ], novidadesDescriptions: [
              "🍔 Sushi Burger: criatividade japonesa com alma brasileira! <br>Unindo tradição e inovação, o Sushi Burger traz uma explosão de texturas e sabores. No lugar do pão, discos empanados de arroz temperado com cream cheese, douradinhos por fora e cremosos por dentro.<br>🐟 O recheio é montado com salmão (grelhado ou cru), couve crispy, batata-doce crocante e um toque generoso de cream cheese — tudo finalizado com molho tarê.<br>✨ No NamiGO, cada Sushi Burger é uma experiência única: ousado, surpreendente e irresistível desde a primeira mordida.",
              "🍄 Shimeji na manteiga: simplicidade que encanta!<br>Clássico da culinária japonesa, o shimeji é um cogumelo delicado, de sabor marcante e textura macia. Salteado na manteiga com shoyu, ele se transforma em um prato aromático, reconfortante e cheio de umami.<br>🔥 No NamiGO, o shimeji é preparado na hora, com manteiga derretida e o ponto perfeito entre maciez e sabor intenso. Ideal como entrada ou acompanhamento — impossível resistir!",
              "🌊 Ceviche: frescor, tradição e sabor no mesmo prato!<br>De origem peruana, originalmente o ceviche é um prato à base de peixe cru marinado no limão, com toques de cebola roxa, coentro e pimenta. Uma explosão cítrica e refrescante que atravessou fronteiras e ganhou o coração dos amantes da culinária oriental e latino-americana.<br>🐟 No NamiGO, o ceviche é preparado com cortes frescos e tempero equilibrado especial da casa, perfeito para quem busca leveza sem abrir mão do sabor.",
              "🍣 Joy (jyo ou Jow): o sushi que virou paixão nacional!<BR>Inspirado no gunkan maki, o Joy é um sushi envolto em salmão fresco, recheado com combinações cremosas e irresistíveis — como shimeji, camarão ou o clássico salmão com cream cheese.<Br>✨ No NamiGO, cada Joy é montado na hora, com cortes delicados e sabor que derrete na boca. Uma explosão de textura e frescor em cada mordida!",
              "🔥 Você já provou um verdadeiro Teppan-yaki?<Br>Tradicional e cheio de técnica, o teppan-yaki nasceu no Japão pós-guerra e conquistou o mundo com sua combinação de sabor, performance e frescor.<BR>Na chapa quente (teppan), carnes, legumes e frutos do mar ganham vida em uma explosão de aromas e texturas!<BR>🍱 No NamiGO, o teppan é preparado na hora, com ingredientes selecionados e aquele toque que transforma cada refeição em experiência.",


            ],

          },


          {
            image: "images/comercios/restaurante/neia/neia.png",
            name: "Neia",
            hours: "Seg a Sex: 11:00h as 14:00h <br>Sab: 11:00h as 16:00h",
            statusAberto: ".",
            horarios: {
              seg: [{ inicio: "11:00", fim: "14:00" }],
              ter: [{ inicio: "11:00", fim: "14:00" }],
              qua: [{ inicio: "11:00", fim: "14:00" }],
              qui: [{ inicio: "11:00", fim: "14:00" }],
              sex: [{ inicio: "11:00", fim: "14:00" }],
              sab: [{ inicio: "11:00", fim: "16:00" }],
              dom: []
            },
            address: "R. Kalil Keder, 262 - Carlopolis",
            contact: "(43) 99847-1137",
            delivery: "Sim / Com Taxa",

          },

          {
            image: "images/comercios/restaurante/oficinaSabor/perfil.png",
            name: "Oficina do Sabor",
            hours: "Dom a Dom: 10:30h as 14:00h",
            statusAberto: ".",
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
            instagram: "https://www.instagram.com/oficinadosabor_clps/",
            facebook: "https://www.facebook.com/people/Oficina-do-Sabor/100051036652126/",


            novidadesImages: [
              "images/comercios/restaurante/oficinaSabor/divulgacao/1.png",
              "images/comercios/restaurante/oficinaSabor/divulgacao/2.png",
              "images/comercios/restaurante/oficinaSabor/divulgacao/3.png",
              "images/comercios/restaurante/oficinaSabor/divulgacao/4.png",
              "images/comercios/restaurante/oficinaSabor/divulgacao/5.png",

            ],
            novidadesDescriptions: [
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
            statusAberto: ".",
            horarios: {
              seg: [],
              ter: [{ inicio: "10:00", fim: "15:00" }],
              qua: [{ inicio: "10:00", fim: "15:00" }, { inicio: "18:30", fim: "23:00" }],
              qui: [{ inicio: "10:00", fim: "15:00" }, { inicio: "18:30", fim: "23:00" }],
              sex: [{ inicio: "10:00", fim: "15:00" }, { inicio: "18:30", fim: "23:00" }],
              sab: [{ inicio: "10:00", fim: "15:00" }, { inicio: "18:30", fim: "23:00" }],
              dom: [{ inicio: "10:00", fim: "15:00" }, { inicio: "18:30", fim: "23:00" }]
            },
            address: "R. Benedito Salles 10, Carlópolis,",
            contact: "(43) 99159-0070",
            delivery: "Sim / Com Taxa",
            facebook: "https://www.facebook.com/SaleBrasaCarlopolis/?locale=pt_BR",
            instagram: "https://www.instagram.com/paiolpizzaburguer/",
            infoAdicional: "<a target='_blank' style='color:#2da6ff;' href='https://shop.beetech.com.br/churrascoegastronomia'  >Cardapio On Line</a>",
            cardapioLink: "https://shop.beetech.com.br/churrascoegastronomia",

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
            statusAberto: ".",
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
            instagram: "https://www.instagram.com/pesqueirodogalego",
            facebook: "https://www.facebook.com/pesqueirodogalegoclps/",
            menuImages: [
              "images/comercios/restaurante/galego/cardapio/1.png",


            ],

            novidadesImages: [
              "images/comercios/restaurante/galego/divulgacao/1.png",
              "images/comercios/restaurante/galego/divulgacao/2.png",
              "images/comercios/restaurante/galego/divulgacao/3.png",
              "images/comercios/restaurante/galego/divulgacao/4.png",
              "images/comercios/restaurante/galego/divulgacao/5.png",

            ], novidadesDescriptions: [
              "Venha Conferir nossas porções!",
              "Cerveja sempre gelada!",
              "Estacionamento amplo!",
              "Espaço para seu filho se divertir",
              "As quintas temos tilapia aberta assada! tradição da casa!"

            ],

          },



          {
            image: "images/comercios/restaurante/portal/portal.png",
            name: "Portal",
            hours: "Seg a Sex: 11:30h as 14:00h - 19:00h as 21:00h",
            statusAberto: ".",
            horarios: {
              seg: [{ inicio: "11:30", fim: "14:00" }, { inicio: "19:00", fim: "21:00" }],
              ter: [{ inicio: "11:30", fim: "14:00" }, { inicio: "19:00", fim: "21:00" }],
              qua: [{ inicio: "11:30", fim: "14:00" }, { inicio: "19:00", fim: "21:00" }],
              qui: [{ inicio: "11:30", fim: "14:00" }, { inicio: "19:00", fim: "21:00" }],
              sex: [{ inicio: "11:30", fim: "14:00" }, { inicio: "19:00", fim: "21:00" }],
              sab: [],
              dom: []
            },
            address: "R. Benedito Salles, 2023 - Carlopolis",
            contact: "(43) 3566-2174",
            delivery: "Sim / Com Taxa",
            infoAdicional: "Fica dentro do Hotel Portal",
            site: "http://www.hotelportalpr.com.br/restaurante",
            novidadesImages: [
              "images/comercios/restaurante/portal/divulgacao/1.png",
              "images/comercios/restaurante/portal/divulgacao/2.png",
              "images/comercios/restaurante/portal/divulgacao/3.png",
              "images/comercios/restaurante/portal/divulgacao/4.png",
              "images/comercios/restaurante/portal/divulgacao/5.png",
            ],

          },
          {
            image: "images/comercios/restaurante/restauranteDaDi/restauranteDaDi.jpg",
            name: "Restaurante da Di",
            hours: "Dom a Dom: 10:30h as 14:00h",
            statusAberto: ".",
            horarios: {
              seg: [{ inicio: "10:30", fim: "14:00" }],
              ter: [{ inicio: "10:30", fim: "14:00" }],
              qua: [{ inicio: "10:30", fim: "14:00" }],
              qui: [{ inicio: "10:30", fim: "14:00" }],
              sex: [{ inicio: "10:30", fim: "14:00" }],
              sab: [{ inicio: "10:30", fim: "14:00" }],
              dom: [{ inicio: "10:30", fim: "14:00" }]
            },
            address: "R. Benedito Salles, 910 - Carlopolis",
            contact: "(43) 99632-3418",
            delivery: "Sim / Com Taxa",
            instagram: "https://www.instagram.com/marmitasdadiih/",
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
              "Todo Domingo temos os Assados e maionese",
            ],

          },








          {
            image: "images/comercios/restaurante/saborRoca/saborRoca.png",
            name: "Sabor da Roça",
            hours: "Seg a Sab: 10:30h as 14:00h",
            statusAberto: ".",
            horarios: {
              seg: [{ inicio: "10:30", fim: "14:00" }],
              ter: [{ inicio: "10:30", fim: "14:00" }],
              qua: [{ inicio: "10:30", fim: "14:00" }],
              qui: [{ inicio: "10:30", fim: "14:00" }],
              sex: [{ inicio: "10:30", fim: "14:00" }],
              sab: [{ inicio: "10:30", fim: "14:00" }],
              dom: []
            },
            address: "R. Benedito Salles, 365 - Carlopolis",
            contact: "(43) 99832-3050",
            delivery: "Sim / Sem Taxa",
            novidadesImages: [
              "images/comercios/restaurante/saborRoca/divulgacao/1.jpg",
              "images/comercios/restaurante/saborRoca/divulgacao/2.jpg",
              "images/comercios/restaurante/saborRoca/divulgacao/3.jpg",
              "images/comercios/restaurante/saborRoca/divulgacao/4.jpg",
              "images/comercios/restaurante/saborRoca/divulgacao/5.jpg",

            ],

            novidadesDescriptions: [
              "Cada prato carrega o aroma da roça, o tempero da tradição e o carinho de quem cozinha com alma.",
              "Cada prato carrega o aroma da roça, o tempero da tradição e o carinho de quem cozinha com alma.",
              "Do campo direto para o prato — saladas fresquinhas, nutritivas e cheias de vida",
              "Nada de industrial — aqui é tudo feito na hora, com ingredientes frescos e tempero de verdade",
              "Nada de industrial — aqui é tudo feito na hora, com ingredientes frescos e tempero de verdade",



            ],

          },

          {
            image: "images/comercios/restaurante/selaht/selaht.png",
            name: "Selaht Grill",
            /* hours: "<span style='color:#FF0000;font-weight:bold;'>VOLTAMOS DIA 10/07/2025</span>",*/
            hours: "Seg a Sab: 11:00h - 00:00h",
            statusAberto: ".",
            horarios: {
              seg: [{ inicio: "11:00", fim: "00:00" }],
              ter: [{ inicio: "11:00", fim: "00:00" }],
              qua: [{ inicio: "11:00", fim: "00:00" }],
              qui: [{ inicio: "11:00", fim: "00:00" }],
              sex: [{ inicio: "11:00", fim: "00:00" }],
              sab: [{ inicio: "11:00", fim: "00:00" }],
              dom: []
            },
            address: "R. Padre Hugo, 460 - Carlopolis",
            contact: "(43) 99160-5120",
            delivery: "Sim / Com Taxa",
            facebook: "https://www.facebook.com/selaht.gastronomia",
            instagram: "https://www.instagram.com/selaht.gastronomia/",
            infoAdicional: "<a target='_blank' style='color:#2da6ff;' href='https://eatfood.app/cardapio/58qt9yj5dqgt2timpqd7'>Cardapio On Line</a>",
            cardapioLink: "https://eatfood.app/cardapio/58qt9yj5dqgt2timpqd7",
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
            image: "images/comercios/restaurante/toninhoParana/perfil.jpg",
            name: "Toninho Parana",
            hours: "Seg a Sab: 11:00h as 14:30h - 19:00h as 23:00h",
            statusAberto: ".",
            horarios: {
              seg: [{ inicio: "11:00", fim: "14:30" }, { inicio: "19:00", fim: "23:00" }],
              ter: [{ inicio: "11:00", fim: "14:30" }, { inicio: "19:00", fim: "23:00" }],
              qua: [{ inicio: "11:00", fim: "14:30" }, { inicio: "19:00", fim: "23:00" }],
              qui: [{ inicio: "11:00", fim: "14:30" }, { inicio: "19:00", fim: "23:00" }],
              sex: [{ inicio: "11:00", fim: "14:30" }, { inicio: "19:00", fim: "23:00" }],
              sab: [{ inicio: "11:00", fim: "14:30" }, { inicio: "19:00", fim: "23:00" }],
              dom: []
            },
            address: "R. Benedito Salles, 1287 - Carlópolis",
            contact: "(43) 99938-2720",
            delivery: "Sim / Com Taxa",
            instagram: "https://www.instagram.com/restaurante_toninho_parana/",
            infoAdicional: "Temos Janta para entragas tambem",
            menuImages: [
              "images/comercios/restaurante/toninhoParana/cardapio/1.jpg",
              "images/comercios/restaurante/toninhoParana/cardapio/2.jpg",
              "images/comercios/restaurante/toninhoParana/cardapio/3.jpg",
              "images/comercios/restaurante/toninhoParana/cardapio/4.jpg",


            ],

            novidadesImages: [
              "images/comercios/restaurante/toninhoParana/divulgacao/1.jpg",
              "images/comercios/restaurante/toninhoParana/divulgacao/2.jpg",
              "images/comercios/restaurante/toninhoParana/divulgacao/3.jpg",
              "images/comercios/restaurante/toninhoParana/divulgacao/4.jpg",


            ], novidadesDescriptions: [
              "Venha se deliciar com nosso buffet completo, fresquinho e variado todos os dias!<Br>➡️ Comida feita com carinho, tempero de casa e aquele toque especial da roça!<Br>✅ Arroz, feijão, saladas, carnes, legumes, frituras, farofas, ovos e muito mais!<Br>Ideal para quem busca qualidade, fartura e preço justo",
              "🥗 Buffet de Saladas Fresquinhas e Coloridas! 🌈<br>Comece sua refeição com leveza, sabor e muita variedade!<br>Nosso buffet conta com:<br>✅ Alface crocante com cebola<br>✅ Ovos cozidos com tempero especial<br>✅ Maionese, beterraba, cenoura, tomate, vinagrete e muito mais!<br>Tudo preparado com ingredientes selecionados, higiene e carinho para garantir sua saúde e satisfação.<br>🕛 Servido todos os dias no almoço!<br>📍 Venha conferir de perto ou faça sua encomenda!",
              "🥣 Sábado é dia de Feijoada Completa!<br>Preparada com ingredientes selecionados, carnes nobres e muito sabor!<br>Feijão bem cozido, aquele tempero caseiro e o aroma que conquista de longe... é tradição que se sente no paladar!<br>✅ Acompanhada de arroz, couve refogada, farofa, laranja e torresmo (opcional).<br>📍 No prato ou marmitex!",
              "🔥 Leitão à Pururuca Especial da Casa 🔥<br>Sabor, tradição e crocância em cada pedaço!<br>Nosso leitão assado inteiro é preparado com tempero caseiro, assado lentamente até atingir o ponto perfeito de maciez por dentro e pele pururuca por fora.<br>Servido sobre uma cama de folhas frescas, ideal para compartilhar em ocasiões especiais."

            ],

          },


          {
            image: "images/comercios/restaurante/yingyang/yingyang.png",
            name: "Ying Yang",
            hours: "Seg a Sab: 18:00h as 23:00h <br> Sab e Dom: 10:30h as 14:00h - 18:00h as 23:00h",
            statusAberto: ".",
            horarios: {
              seg: [{ inicio: "18:00", fim: "23:00" }],
              ter: [{ inicio: "18:00", fim: "23:00" }],
              qua: [{ inicio: "18:00", fim: "23:00" }],
              qui: [{ inicio: "18:00", fim: "23:00" }],
              sex: [{ inicio: "18:00", fim: "23:00" }],
              sab: [{ inicio: "10:30", fim: "14:00" }, { inicio: "18:00", fim: "23:00" }],
              dom: [{ inicio: "10:30", fim: "14:00" }, { inicio: "18:00", fim: "23:00" }]
            },
            address: "R. Benedito Salles, 910 - Carlopolis",
            contact: "(43) 99954-0831",
            delivery: "Sim / Com Taxa",
            instagram: "https://www.instagram.com/yingyang_comidachinesa/",
            facebook: "https://www.facebook.com/p/Ying-yang-100063519044209/",
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
            statusAberto: ".",
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
            contact: "(43) 99118-6909",
            contact2: "(43) 3566-2749",

            instagram: "https://www.instagram.com/movepar_carlopolis/",
            novidadesImages: [
              "images/comercios/moveis/movepar/divulgacao/1.png",
              "images/comercios/moveis/movepar/divulgacao/2.png",

            ],
            novidadesDescriptions: [

              "Venha conferir nossos moveis",
              "Venha conferir nossos eletronicos",

            ],
            promocoes: [
              {
                imagem: "images/comercios/moveis/movepar/promocao/3.jpg",
                titulo: "Fogão Monaco Atlas 5 Bocas",
                precoAntigo: "R$ 1.990,00",
                preco: "R$ 1.190,00",
                unidade: "A UNIDADE",
                validadeFim: "2025-09-30",
                obs: "Oferta válida até durar o estoque",

              },


            ]
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
            statusAberto: ".",
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
            image: "images/servicos/taxi/dorival/perfil.jpg",
            name: "Dorival Mattos",
            hours: "Dom a Dom: <span style='color:red'>24horas</span>",
            address: "Ponto N2 - Em Frente a Igreja Matriz",
            contact: "(43) 99620-9900",
            contact2: "(43) 98830-2110",

            facebook: "https://www.facebook.com/dorival.mattos.1",
            instagram: "https://www.instagram.com/mattostaxi/",
            infoAdicional: "Viagens e Serviços <span style='color:red'>24horas</span><br> Area Rural, Urbana e Aeroporto",
          },


          {

            image: "images/servicos/taxi/sereia/perfil.jpg",
            name: "Sereia",
            hours: "Dom a Dom: <span style='color:red'>24horas</span>",
            address: "Ponto N2 - Em Frente a Igreja Matriz",
            contact: "(43) 99933-6915",
            contact2: "(43) 98860-7629",


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
            infoVagaTrabalho: "Precisa-se de motoboy",
          },
        ],
      },






      {
        link: document.querySelector("#menuNotaFalecimento"),
        title: "Nota de Falecimento",
        establishments: [

          //26/09
          {
            name: "Funeraria Cristo Rei",
            image: "images/informacoes/notaFalecimento/cristoRei/41.jpg",
            date: "26/09/2025",
            descricaoFalecido: "Hoje nossos corações se entristecem com a partida da querida *Andressa*, uma alma doce, cheia de luz, que marcou a vida de todos com sua alegria, fé e coragem.<br>Foram dias de luta, esperança e oração... mas Deus, em Sua infinita sabedoria, decidiu acolhê-la em Seus braços, concedendo-lhe o descanso eterno.<br>À família e amigos, nosso carinho, respeito e solidariedade. Que o consolo divino alcance cada coração e que a saudade seja suavizada pelas doces lembranças que ela nos deixou.<br>*Andressa jamais será esquecida.<Br>*Seu sorriso, sua força e sua essência viverão para sempre entre nós",

          },



          {
            name: "Funeraria Cristo Rei",
            image: "images/informacoes/notaFalecimento/cristoRei/40.jpg",
            date: "19/09/2025",
            descricaoFalecido: "Faleceu em Carlópolis aos 52 anos de idade, a Sra. KATIA APARECIDA LEMES carinhosamente conhecida como esposa do Toninho Abeeiro.<Br>A cerimônia terá início nessa madrugada de sexta-feira às 03:00 horas no velório Municipal<Br>Sua despedida e sepultamento será realizada hoje às 16:30 horas no cemitério Municipal de Carlópolis!<Br>Nossos profundos sentimentos aos familiares e amigos! 🙏",

          },



          {
            name: "Funeraria Cristo Rei",
            image: "images/informacoes/notaFalecimento/cristoRei/39.jpg",
            date: "11/09/2025",
            descricaoFalecido: "Faleceu em Londrina aos 86 anos de idade, a Sra MARIA APARECIDA DA SILVA ABÍLIO<br>A cerimônia iniciará hoje às 20:00 horas no velório municipal de Carlópolis.<br>Sua despedida e sepultamento será amanhã às 09:00 horas no Cemitério Municipal de Carlópolis.<br>Nossos profundos sentimentos a todos familiares 🙏",

          },


          ////

          {
            name: "Funeraria Grupo Castilho",
            image: "images/informacoes/notaFalecimento/castilho/33.jpg",
            descricaoFalecido: "Comunicamos o falecimento do Sr. CEME ELIAS MANSUR aos 93 anos de idade.<Br>‌O velório será na CAPELA MUNICIPAL DE CARLOPOLIS - PR.<Br>O sepultamento será realizado 10/09/2025 as 16:30 no CEMITÉRIO MUNICIPAL DE CARLOPOLIS - PR.",
            date: "09/09/2025"
          },

          {
            name: "Funeraria Cristo Rei",
            image: "images/informacoes/notaFalecimento/cristoRei/38.jpg",
            date: "07/09/2025",
            descricaoFalecido: "Faleceu em Arapongas aos 71 anos de idade, o Sr. LUIS CARLOS DE MOURA mais conhecido como: Fião.<Br>A cerimônia iniciará hoje às 06:00 horas no velório municipal de Carlópolis.<Br>Sua despedida e sepultamento será hoje em horário a ser definido no Cemitério Municipal de Carlópolis.<Br>Nossos profundos sentimentos a todos familiares 🙏",

          },

          {
            name: "Funeraria Cristo Rei",
            image: "images/informacoes/notaFalecimento/cristoRei/37.jpg",
            date: "06/09/2025",
            descricaoFalecido: "Hoje nos despedimos de uma alma querida, alegre e inesquecível: *Maria de Fátima Marcelino Terra*, que aos 45 anos partiu deixando saudade, sorrisos e lembranças que jamais se apagarão.<br>A cerimônia de velório teve início às 15:00 horas e seu sepultamento será amanhã, às 10:00 horas da manhã, no Cemitério Municipal<br>Nosso coração chora sua partida, mas a gratidão pela sua vida e pelo privilégio de tê-la conhecido é ainda maior. Que Deus a receba em paz e conforte toda a família.<br>*Você sempre será lembrada com alegria, Fátima.* 🕊️💐",

          },

          {
            name: "Funeraria Cristo Rei",
            image: "images/informacoes/notaFalecimento/cristoRei/36.jpg",
            date: "06/09/2025",
            descricaoFalecido: "Faleceu em Monte Mor aos 62 anos de idade, o Sr. LIOVALDO GARCIA DUARTE, mais conhecido como: filho da dona Lurdinha da loja.<Br>A cerimônia iniciará hoje às 18:00 horas no velório municipal de Carlópolis.<Br>Sua despedida e sepultamento será amanhã às 16:30 horas no Cemitério Municipal de Carlópolis.<Br>Nossos profundos sentimentos a todos familiares 🙏",

          },

          {
            name: "Funeraria Cristo Rei",
            image: "images/informacoes/notaFalecimento/cristoRei/35.jpg",
            date: "05/09/2025",
            descricaoFalecido: "Faleceu em Carlópolis aos 88 anos de idade, o Sr. LAURA RIBEIRO DE QUEIROZ.<br>A cerimônia iniciará hoje às 00:00 horas no velório municipal de Carlópolis.<br>Sua despedida e sepultamento será amanhã às 11:00 horas no Cemitério Municipal de Carlópolis.<br>Nossos profundos sentimentos a todos familiares 🙏",

          },



          {
            name: "Funeraria Cristo Rei",
            image: "images/informacoes/notaFalecimento/cristoRei/34.jpg",
            date: "04/09/2025",
            descricaoFalecido: "Faleceu em Carlópolis aos 78 anos de idade, Sr Pedro Soares da Silva.<br>A cerimônia de velório será hoje às 00:00 horas em sua residência, Sítio São João Bairro espírito santo.<br>Sua despedida e sepultamento será amanhã às 16:00 horas no Cemitério Municipal de Carlópolis.<br>Nossos profundos sentimentos a todos familiares 🙏",

          },





          {
            name: "Funeraria Cristo Rei",
            image: "images/informacoes/notaFalecimento/cristoRei/33.jpg",
            date: "19/08/2025",
            descricaoFalecido: "Faleceu em Jacarezinho aos 64 anos de idade, a Sra. NEIDE APARECIDA BRAZ mais conhecida como: mãe da Débora machado<br>A cerimônia de velório iniciará hoje às 16:30 horas no Velório Municipal de Carlópolis.<br>Sua despedida e sepultamento será amanhã às 08:30 horas no Cemitério Municipal de Carlópolis.<br>Nossos profundos sentimentos a todos familiares 🙏",

          },





          {
            name: "Funeraria Cristo Rei",
            image: "images/informacoes/notaFalecimento/cristoRei/31.jpg",
            date: "16/08/2025",
            descricaoFalecido: "Faleceu em Carlópolis aos 82 anos de idade, o Sr 'JORGE FERREIRA' mais conhecido como: pai do José do lojão<br>A cerimônia iniciará hoje às 19:00 horas no velório municipal de Carlópolis.<br>Seu sepultamento será amanhã às 09:00 horas no Cemitério Municipal de Carlópolis.<br>Nossos profundos sentimentos a todos familiares 🙏",

          },



          {
            name: "Funeraria Bom Jesus",
            image: "images/informacoes/notaFalecimento/bomjesus/1.jpg",
            date: "14/08/2025",
            descricaoFalecido: "É com profundo pesar que anunciamos o falecimento de SILVIO DE PAULA<br>Nossas condolencias aos familiares e amigos por essa perda irreparavel<br>Sera velado na Capela Municipal de Carlopolis",

          },






          {
            name: "Funeraria Grupo Castilho",
            image: "images/informacoes/notaFalecimento/castilho/32.jpg",
            date: "09/08/2025",
            descricaoFalecido: "Comunicamos o falecimento da Sr. CONCEIÇÃO DE SOUZA NAVARRO aos 85 anos de idade.<Br>‌O velório será na CAPELA MUNICIPAL DE CARLOPOLIS - PR.<Br>O sepultamento será realizado 10/08/2025 as 16:00 no CEMITÉRIO MUNICIPAL DE CARLOPOLIS - PR.",

          },

          {
            name: "Funeraria Cristo Rei",
            image: "images/informacoes/notaFalecimento/cristoRei/30.jpg",
            date: "08/08/2025",
            descricaoFalecido: "Faleceu em Londrina aos 59 anos de idade, a Sra. 'LILIAN ZURDO COSTA'<br>A cerimônia de velório iniciará hoje às 07:00 horas no Velório Municipal de Carlópolis.<br>Sua despedida e sepultamento será hoje 08/08/2025 às 16:00 horas no Cemitério Municipal de Carlópolis.<br>Nossos profundos sentimentos a todos familiares 🙏",

          },

          {
            name: "Funeraria Cristo Rei",
            image: "images/informacoes/notaFalecimento/cristoRei/29.jpg",
            date: "08/08/2025",
            descricaoFalecido: "Faleceu em Carlópolis aos 90 anos de idade, a Sra. 'BEATRIZ DE MIRANDA SANTOS'.<Br>A cerimônia de velório iniciará hoje às 01:30 horas no Velório Municipal de Carlópolis.<Br>Sua despedida e sepultamento será hoje 08/08/2025 às 16:30 horas no Cemitério Municipal de Carlópolis.<Br>Nossos profundos sentimentos a todos familiares 🙏",

          },




          {
            name: "Funeraria Cristo Rei",
            image: "images/informacoes/notaFalecimento/castilho/31.jpg",
            date: "06/08/2025",
            descricaoFalecido: "Comunicamos o falecimento do Sr. FAUSTINO BERNARDO RIBEIRO aos 79 anos de idade.<Br>‌O velório será na CAPELA MUNICIPAL DE CARLOPOLIS - PR.<Br>O sepultamento será realizado 06/08/2025 as 16:00 no CEMITÉRIO MUNICIPAL DE CARLOPOLIS - PR.",

          },



          {
            name: "Funeraria Cristo Rei",
            image: "images/informacoes/notaFalecimento/cristoRei/28.jpg",
            date: "05/08/2025",
            descricaoFalecido: "Faleceu em Carlópolis aos 91 anos de idade, Sra 'OLIBIA RIBEIRO LEITE' mãe da Nilza.<Br>A cerimônia iniciará hoje às 18:00 horas no velório municipal de Carlópolis.<Br>Seu sepultamento será amanhã às 13:30 horas no Cemitério Municipal de Carlópolis.<Br>Nossos profundos sentimentos a todos familiares 🙏",

          },

          {
            name: "Funeraria Cristo Rei",
            image: "images/informacoes/notaFalecimento/cristoRei/27.jpg",
            date: "04/08/2025",
            descricaoFalecido: "Faleceu em Carlópolis aos 65 anos de idade, o Sr 'JOSÉ MARCOS BARBOSA', mais conhecido Márcio do Bar<br>A cerimônia iniciará hoje às 18:00 horas no velório municipal de Carlópolis.<br>Seu sepultamento será amanhã às 12:00 horas no Cemitério Municipal de Carlópolis.<br>Nossos profundos sentimentos a todos familiares 🙏",

          },

          {
            name: "Funeraria Cristo Rei",
            image: "images/informacoes/notaFalecimento/cristoRei/26.jpg",
            date: "02/08/2025",
            descricaoFalecido: "Faleceu em Carlópolis aos 72 anos de idade, o Sr 'Francisco Gonçalves dos Santos' mais conhecido como: Irmão do Zé do óculos<br>A cerimônia iniciará hoje às 21:30 horas no velório municipal de Carlópolis.<br>Seu sepultamento será amanhã às 16:30 horas no Cemitério Municipal de Carlópolis.<br>Nossos profundos sentimentos a todos familiares 🙏",

          },



          ///////////////////////////////


          {
            name: "Funeraria São Vicente de Paulo",
            image: "images/informacoes/notaFalecimento/cristoRei/24.jpg",
            date: "31/07/2025",
            descricaoFalecido: "Faleceu em Carlopolis, Sr 'ALFREDO VARASQUIM',<br>Seu sepultamento será (31/07) às 10:00 horas no Cemitério Municipal de Carlópolis.<br>Nossos profundos sentimentos a todos familiares 🙏 ",

          },

          {
            name: "Funeraria Cristo Rei",
            image: "images/informacoes/notaFalecimento/cristoRei/25.jpg",
            descricaoFalecido: "Faleceu em Londrina aos 75 anos de idade, Sr 'LUIS LEANDRO', mais conhecido como: Pai do Jaba.<Br>A cerimônia iniciará hoje às 08:00 horas deste Terça - feira no velório municipal de Carlópolis.<Br>Seu sepultamento será hoje às 13:30 horas no Cemitério Municipal de Carlópolis.<Br>Nossos profundos sentimentos a todos familiares 🙏"

          },
          ///
          /// 20/07

          {
            name: "Funeraria Cristo Rei",
            image: "images/informacoes/notaFalecimento/cristoRei/23.jpg",
            descricaoFalecido: "Faleceu em Bandeirantes aos 79 anos de idade, Sr 'MILTON ALVES DA SILVA', mais conhecido como: Cunhado da Zuzu.<br>A cerimônia iniciou-se hoje às 10:00 horas deste Sabado no velório municipal de Carlópolis.<br>Seu sepultamento será hoje às 15:00 horas no Cemitério Municipal de Carlópolis.<br>Nossos profundos sentimentos a todos familiares 🙏"

          },


          //15/07


          {
            name: "Funeraria Cristo Rei",
            image: "images/informacoes/notaFalecimento/cristoRei/22.jpg",
            descricaoFalecido: "Faleceu em Londrina aos 47 anos de idade, Sra 'IRACI DA SILVA PEREIRA'.<Br>A cerimônia iniciará hoje às 10:45 horas no velório municipal de Carlópolis.<Br>Seu sepultamento será hoje às 16:30 horas no Cemitério Municipal de Carlópolis.<Br>Nossos profundos sentimentos a todos familiares 🙏"

          },

          {
            name: "Funeraria Cristo Rei",
            image: "images/informacoes/notaFalecimento/cristoRei/21.jpg",
            descricaoFalecido: "Faleceu em Joaquim Távora aos 74 anos de idade, Sra 'JOANA NOGUEIRA BRESSANI', mais conhecida como: filha do Expedicionário Agrícola Alves Nogueira.<br>A cerimônia iniciará hoje às 19:15 horas desta Quarta - Feira no velório municipal de Carlópolis.<br>Seu sepultamento será amanhã às 11:00 horas no Cemitério Municipal de Carlópolis.<br>Nossos profundos sentimentos a todos familiares 🙏"

          },

          {
            name: "Funeraria Cristo Rei",
            image: "images/informacoes/notaFalecimento/cristoRei/20.jpg",
            descricaoFalecido: "Faleceu em Carlópolis aos 76 anos de idade, Sra 'SUZANA LOURDES DE SOUSA HERNANDES', mais conhecida como: Mãe do Daniel pedreiro.<br>A cerimônia iniciará hoje às 17:45 horas desta Segunda - Feira no velório municipal de Carlópolis.<br>Seu sepultamento será amanhã às 13:30 horas no Cemitério Municipal de Carlópolis.<br>Nossos profundos sentimentos a todos familiares 🙏"

          },


          {
            name: "Funeraria Cristo Rei",
            image: "images/informacoes/notaFalecimento/cristoRei/19.jpg",
            descricaoFalecido: "Faleceu em Carlópolis aos 80 anos de idade, Sra 'MARIA APARECIDA DE OLIVEIRA', mais conhecida como: Mãe da Preta Manicure.<br>A cerimônia iniciará hoje às 02:00 horas desta Segunda - Feira no velório municipal de Carlópolis.<br>Seu sepultamento será hoje às 13:30 horas Cemitério Municipal de Carlópolis.<br>Nossos profundos sentimentos a todos familiares 🙏"

          },



          //01/07

          {
            name: "Funeraria Cristo Rei",
            image: "images/informacoes/notaFalecimento/cristoRei/18.jpg",
            descricaoFalecido: "Faleceu em Carlópolis aos 94 anos de idade, Sr 'JOÃO ROSSI'<br> O horário da cerimônia dará início amanhã às 07:00 horas no velório municipal de Carlópolis.<br>Seu sepultamento será amanhã às  16:30 horas no Cemitério Municipal de Carlópolis.<br>Nossos profundos sentimentos a toda família e amigos"

          },


          {
            name: "Funeraria Cristo Rei",
            image: "images/informacoes/notaFalecimento/cristoRei/17.jpg",
            descricaoFalecido: "Faleceu em Jacarezinho aos 71 anos de idade, Sra 'MARIA CRISTINA RODRIGUES YAMACITA'.<Br> A cerimônia iníciara hoje às 21:00 horas desta Segunda - Feira  no velório municipal de Carlópolis.<Br>Seu sepultamento será amanhã às 09:00 horas Cemitério Municipal de Carlópolis.<Br>Nossos profundos sentimentos a toda família e amigos"

          },


          //30/06
          {
            name: "Funeraria Cristo Rei",
            image: "images/informacoes/notaFalecimento/cristoRei/16.jpg",
            descricaoFalecido: "Faleceu em Timbó - Santa Catarina aos 47 anos de idade, Sr 'Alexandre Ernst Braun'.<Br> O horário da cerimônia dará início hoje às 13:30 horas no velório municipal de Carlópolis.<Br>Seu sepultamento será hoje às  16:30 horas no Cemitério Municipal de Carlópolis.<Br>Nossos profundos sentimentos a esposa: Adriane, Mãe Irmã, Irmãos Ivana, Haroldo, Erlin e a todos familiares"

          },


          //16/06
          {
            name: "Funeraria Cristo Rei",
            image: "images/informacoes/notaFalecimento/cristoRei/15.jpg",
            descricaoFalecido: "Faleceu em Carlópolis aos 78 anos de idade, Sr 'ANIBAL MENDES DA SILVA' mais conhecido como: Aníbal do Quinzote<br> O horário da cerimônia dará início hoje às 10:30 horas no velório municipal de Carlópolis.<br>Seu sepultamento será hoje às  17:00 horas no Cemitério Municipal de Carlópolis.<br>Nossos profundos sentimentos a toda família e amigos"

          },



          //16/06
          {
            name: "Funeraria Cristo Rei",
            image: "images/informacoes/notaFalecimento/cristoRei/14.jpg",
            descricaoFalecido: "Faleceu em Londrina aos 69 anos de idade, Sra 'MARIA APARECIDA PEREIRA DE LIMA'<br>A cerimônia terá início nessa madrugada de terça - feira em horário a ser definido no velório municipal de Carlópolis.<br>Seu sepultamento será amanhã no período da tarde, no Cemitério Municipal de Carlópolis.<br>Nossos profundos sentimentos a toda família e amigos"

          },

          //11/06
          {
            name: "Funeraria Cristo Rei",
            image: "images/informacoes/notaFalecimento/cristoRei/13.jpg",
            descricaoFalecido: "Faleceu em Carlópolis aos 86 anos de idade, Sra 'KIMICO IKEDA'<Br>mais conhecida como: Dona Tereza Viúva do Sr Zé Ikeda .<Br>O horário da cerimônia será às 11:00 horas desta Quarta - feira no velório municipal de Carlópolis.<Br>Seu sepultamento será hoje às  17:00 horas no Cemitério Municipal de Carlópolis.<Br>Nossos profundos sentimentos a toda família e amigos"

          },


        ]
      },


      {
        link: document.querySelector("#menuVagasTrabalho"),
        title: "Vagas de Trabalho",
        establishments: [


          {
            image: "images/comercios/sorveteria/salles/perfil.png",
            name: "Sorvetes Salles Ferreira",
            address: "R. Kalil Keder, n° 525 - Carlópolis",
            contact: "(43) 99600-1919",
            facebook: "https://www.facebook.com/sorvetessalles/?locale=pt_BR",
            instagram: "https://www.instagram.com/sorvetessalles/",
            vagaPreRequisito: "<br> Ser Maior de 18 anos<br> Ser Comunicativa",
            infoVagaTrabalho: "1 - Atendimento ao publico",
          },

          {
            image: "images/comercios/lanchonete/caldodecanaamaral/perfil.png",
            name: "Caldo de Cana Amaral",
            address: "R. Benedito Salles, 2639 - Carlópolis",
            contact: "(43) 99977-8839",
            instagram: "https://www.instagram.com/caldodecanaamaral/",
            facebook: "https://www.facebook.com/CaldodecanaAmaral",
            vagaPreRequisito: "<br> Que possa trabalhar aos finais de semana e feriados",
            infoVagaTrabalho: "1 - Auxiliar de Restaurante<br>1 - Atendente<br>1 - Auxiliar de Cozinha<br>1 - Garçom",
          },


          {
            image: "images/comercios/assistenciaCelular/oficinaCelular/oficinaCelular.png",
            name: "Oficina do Celular",
            address: "R. Dra. Paula e Silva, 676 - Carlopolis",
            contact: "(43) 3566-1600",
            facebook: "https://www.facebook.com/oficinadocelularclps/",
            instagram: "https://www.instagram.com/oficinadocelular_carlopolis/",
            vagaPreRequisito: "<br> Responsável<br> Pontual<BR>Boa Comunicação<br>Disponibilidade de Horário",
            infoVagaTrabalho: "1 - Atendimento ao publico",



          },


          {
            image: "images/comercios/motoTaxi/modesto/perfil.jpg",
            name: "Moto Taxi Modesto",

            address: "R. Andrino Soares, 370 - Carlópolis",
            contact: " (41) 99982-3075",

            instagram: "https://www.instagram.com/mototaximodesto_carlopolis/",
            vagaPreRequisito: "<br> CNH<br>Experiência<br>Boa Comunicação<br>Responsabilidade<br>Disponibilidade de Horário<br>Compromisso",
            infoVagaTrabalho: "1 - MotoBoy / MotoGirl ",



          },

          {
            image: "images/comercios/restaurante/toninhoParana/perfil.jpg",
            name: "Toninho Parana",

            address: "R. Benedito Salles, 1287 - Carlópolis",
            contact: "(43) 99938-2720",

            instagram: "https://www.instagram.com/restaurante_toninho_parana/",
            vagaPreRequisito: "<br> Maior de 18 Anos",
            infoVagaTrabalho: "1 - Auxiliar de Serviços Gerais ",



          },



          {
            image: "images/comercios/restaurante/delfino/delfino.png",
            name: "Emporio São Victor",

            address: "R. Kalil Keder, 90 - Carlopolis",
            contact: "(43) 99111-9484",
            instagram: "https://www.instagram.com/delfinos.mendes1/",
            vagaPreRequisito: "<br> Ter experiência como garçon",
            infoVagaTrabalho: "1 - Vaga Para Garçon ",



          },
          {
            image: "images/comercios/supermercado/rocha/perfil.jpg",
            name: "Rocha",

            address: "Av. Elson Soares, 767 - Carlopolis",
            contact: "(43) 99105-9324",

            facebook: "https://www.facebook.com/p/Kelve-Carl%C3%B3polis-100010521284877/?locale=pt_BR",
            instagram: "https://www.instagram.com/kelvesupermercadosoficial/",

            infoVagaTrabalho: "1 - Vaga Para Açougueiro<br>1 - Vaga Para Feira<br>1 - Vaga Para Padaria<br>1 - Vaga Para Repositor<br> ",

          },

        ],
      },




    ];
  document.getElementById("menuPromocoes").addEventListener("click", function (e) {
    e.preventDefault();
    location.hash = "promocoes";
    mostrarPromocoes();
  });

  const menuPrevisaoTempo = document.getElementById("menuPrevisaoTempo");

  if (menuPrevisaoTempo) {
    menuPrevisaoTempo.addEventListener("click", function (e) {
      e.preventDefault();
      window.open("https://www.ipmetradar.com.br/2animRadar.php", "_blank");
    });
  }


  montarCarrosselDivulgacao(); // Agora sim, já com categories carregado



  searchInput.addEventListener("input", function () {
    const termo = searchInput.value.toLowerCase().trim();
    clearSearch.style.display = termo ? "inline-block" : "none";

    // Esconde todos os separadores enquanto pesquisa
    document.querySelectorAll(".separador-letra, .separadorr").forEach(sep => {
      sep.style.display = termo ? "none" : "block";
    });

    // Para cada grupo/item do menu (inclui submenus e categorias principais)
    document.querySelectorAll(".menu_items .item").forEach(item => {
      let showItem = false;

      // Procura todos os links dentro deste item
      item.querySelectorAll(".nav_link").forEach(link => {
        const texto = link.textContent.toLowerCase();
        if (!termo || texto.includes(termo)) {
          link.style.display = "flex";
          showItem = true;
        } else {
          link.style.display = "none";
        }
      });

      // Trata submenus
      const submenu = item.querySelector(".submenu");
      const submenuItem = item.querySelector(".submenu_item");

      if (submenu) {
        // Mostra submenu apenas se algum filho for visível
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
        // Se não é grupo, mostra apenas se o próprio item bate
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























  // teste de trocar abas















  // teste de trocar abas


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


    
      ${establishment.image
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
  


${establishment.infoVagaTrabalho
          ? `
    <div class="card-plantao detalhe-esquerda">
      <div class="conteudo-plantao">
        <div class="titulo-plantao">
          <i class="fas fa-briefcase"></i> Vaga de Trabalho
        </div>
        <p>${establishment.infoVagaTrabalho}</p>
        ${establishment.vagaPreRequisito ? `<p><strong><i class="fas fa-list-check"></i> Pré-requisito:</strong> ${establishment.vagaPreRequisito}</p>` : ""}
      </div>
    </div>
  `
          : ""
        }
      
        ${establishment.plantaoHorario
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


            <div class="abas-nav">
          <button class="aba-tab active"  data-target="info-${normalizeName(establishment.name)}"><i class="fas fa-circle-info tab-icon"></i> Info</button>

  ${(establishment.novidadesImages && establishment.novidadesImages.length) ? `
    <button class="aba-tab"   data-target="fotos-${normalizeName(establishment.name)}">📷 Fotos (${establishment.novidadesImages.length})</button>
  ` : ''}

  ${((establishment.menuImages && establishment.menuImages.length) || establishment.cardapioLink) ? `
    <button class="aba-tab"       data-target="cardapio-${normalizeName(establishment.name)}"
            ${establishment.cardapioLink ? `data-link="${establishment.cardapioLink}"` : ''}>
      🍽️ Cardápio${(establishment.menuImages && establishment.menuImages.length) ? ` (${establishment.menuImages.length})` : ``}
    </button>
  ` : ''}
</div>

<div class="abas-conteudo" data-estab="${normalizeName(establishment.name)}">
  <div class="aba aba-info visible" id="info-${normalizeName(establishment.name)}">
       <!-- TODO: aqui ficam as info-box (funcionamento, endereço, etc.) -->

         ${establishment.statusAberto ? `
                    <div class="info-box">
                      
                      <div>
                        <div class="info-label"> ${statusAberto}</div>
                        
                      </div>
                    </div>` : ""
        }


        ${establishment.date ? `
            <div class="info-box">
              <i class="fas fa-calendar-alt info-icon" style="color: #000000ff;font-size:20px;"></i>
              <div>
                <div class="info-label">Data</div>
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
        ` : ""
        }




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

                      <a href="https://api.whatsapp.com/send?phone=${firstNumber}&text=${encodeURIComponent('Olá! Encontrei seu número no Site Olá Carlópolis e gostaria de uma informação!')}"
   target="_blank"
   class="zap-link telefone-link"
   data-id="${normalizeName(establishment.name)}"
   data-tel="${firstNumber}">
  <i class='bx bxl-whatsapp info-icon' style="color: #25D366; font-size: 24px;"></i>
  <span>${establishment.contact}</span>
</a>


                      </div>` : ""
            }

                    ${secondNumber ? `
                        <div style="display: flex; align-items: center;  margin-bottom: 4px;">
                          <a href="https://api.whatsapp.com/send?phone=${secondNumber}&text=${encodeURIComponent("Olá! Encontrei seu número no Site Olá Carlópolis e gostaria de uma informação!")}" target="_blank" class="link-whatsapp">
                                        <i class='bx bxl-whatsapp info-icon' style="color: #25D366; font-size: 24px;"></i>
                                  
                                                <span>${establishment.contact2}</span></a>
                      </div>` : ""
            }

                  ${thirdNumber ? `
                  <div style="display: flex; align-items: center; ">
                    <a href="https://api.whatsapp.com/send?phone=${thirdNumber}&text=${encodeURIComponent("Olá! Encontrei seu número no Site Olá Carlópolis e gostaria de uma informação!")}" target="_blank">
                      <i class='bx bxl-whatsapp info-icon' style="color: #25D366; font-size: 24px;"></i>
                    
                    <span>${establishment.contact3}</span></a>
                  </div>` : ""
            }
                                </div>
                              </div>
                            </div>

                            `;
        })() : ""

        }






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
                          ${establishment.facebook ? `<a href="${fixUrl(establishment.facebook)}" target="_blank"><i class="fab fa-facebook" style="color: #1877F2; font-size: 16px;"></i> Facebook</a>` : ""}
                          ${establishment.instagram ? `<a href="${fixUrl(establishment.instagram)}" target="_blank"><i class="fab fa-instagram" style="color: #C13584; font-size: 16px;"></i> Instagram</a>` : ""}          
                          ${establishment.site ? `<a href="${fixUrl(establishment.site)}" target="_blank"><i class="fas fa-globe" style="color: #4caf50; font-size: 16px;"></i> Site</a>` : ""}
                       

                        </div>
                      </div>
                    </div>` : ""
        }



            </div>



    </div>




 
   

       <!-- FOTOS -->
${(establishment.novidadesImages && establishment.novidadesImages.length > 0) ? `
  <div class="aba" id="fotos-${normalizeName(establishment.name)}" style="display:none">
    <div class="swiper" id="novidades-${encodeURIComponent(establishment.name)}">
      <div class="swiper-wrapper">
        ${establishment.novidadesImages.map((img, idx) => `
          <div class="swiper-slide">
            <img src="${img}" alt="Foto ${idx + 1}" loading="lazy">
            ${establishment.novidadesDescriptions && establishment.novidadesDescriptions[idx]
            ? `<div class="descricao-foto">${establishment.novidadesDescriptions[idx]}</div>` : ''}
          </div>
        `).join('')}
      </div>
      <div class="swiper-pagination"></div>
      <div class="swiper-button-prev"></div>
      <div class="swiper-button-next"></div>
    </div>
  </div>
` : ``}

<!-- CARDÁPIO -->
${(establishment.menuImages && establishment.menuImages.length > 0) ? `
  <div class="aba" id="cardapio-${normalizeName(establishment.name)}" style="display:none">
    <div class="swiper" id="menu-${encodeURIComponent(establishment.name)}">
      <div class="swiper-wrapper">
        ${establishment.menuImages.map((img, idx) => `
          <div class="swiper-slide">
            <img src="${img}" alt="Cardápio ${idx + 1}" loading="lazy">
            ${establishment.menuDescriptions && establishment.menuDescriptions[idx]
                ? `<div class="descricao-foto">${establishment.menuDescriptions[idx]}</div>` : ''}
          </div>
        `).join('')}
      </div>
      <div class="swiper-pagination"></div>
      <div class="swiper-button-prev"></div>
      <div class="swiper-button-next"></div>
    </div>
  </div>
` : ``}






</div>



  

                

                
                        
                      
                       
                      
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

      // ***** SUBSTITUA a criação do card dentro do infos.forEach(...) por este bloco *****
      infos.forEach(({ icon, label, valor }) => {
        const card = document.createElement("div");
        card.className = "info-card";

        // Se for o contato, renderiza como link clicável com classe e atributos
        if (label === "Contato") {
          if (label === "Contato") {
            // 1) string bonita
            const numeroRaw = getPrimeiroContato(valor || "");
            // 2) apenas dígitos (para href tel:)
            const numeroDigits = somenteDigitos(numeroRaw);
            // 3) id do estabelecimento normalizado (igual ao usado nos outros contadores)
            const estId = normalizeName(establishment.name);

            card.innerHTML = `
    <i class="fas ${icon}"></i>
    <div class="info-card-text">
      <span class="info-card-label">${label}</span>
      <span class="info-card-value">
        <a href="tel:${numeroDigits}"
           class="telefone-link"
           data-id="${estId}"
           data-tel="${numeroDigits}">
          ${numeroRaw}
        </a>
      </span>
    </div>
  `;
          } else {
            card.innerHTML = `
    <i class="fas ${icon}"></i>
    <div class="info-card-text">
      <span class="info-card-label">${label}</span>
      <span class="info-card-value">${valor}</span>
    </div>
  `;
          }
        }


        wrapper.appendChild(card);
      });

      ///////////
      /////
      /////
      // Delegated listener para cliques em telefones



      /////
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
      button.addEventListener('click', function () {
        const contentId = `novidades-${encodeURIComponent(this.dataset.name)}`;
        lastClickedButton = this; // <-- Salva o botão clicado
        toggleContent(this, contentId);
      });
    });

    // Eventos para os botões de Cardápio
    document.querySelectorAll('.menu-btn').forEach(button => {
      button.addEventListener('click', function () {
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
    if (!category.link) return;
    category.link.addEventListener("click", function (event) {
      event.preventDefault();
      categories.forEach((cat) => cat.link?.classList.remove("active"));
      this.classList.add("active");

      // define a rota da categoria; o roteador renderiza
      location.hash = "#comercios-" + normalizeName(category.title);

      if (sidebar.classList.contains("close")) {
        sidebar.classList.remove("close");
      }
    });
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





  function handleHashRoute() {
    const h = (location.hash || "").toLowerCase();

    if (h === "#ondecomer") { return mostrarOndeComer(); }
    if (h === "#promocoes") { return mostrarPromocoes(); }
    if (h === "#coletalixo" || h === "#menucoletralixo") return montarPaginaColetaLixo();
    if (h === "#jogos") { return mostrarJogos(); }
    if (h === "#grupos") { return mostrarGruposWhatsApp(); }
    if (h === "#ranking-capivarinha") { return mostrarRankingCapivarinha(); }

    // categorias de "Comércios"
    const m = h.match(/^#comercios-(.+)$/);
    if (m) {
      const slug = m[1]; // ex.: "adega"
      const cat = categories.find(c => normalizeName(c.title) === slug);
      if (cat) return loadContent(cat.title, cat.establishments);
    }
  }
  window.addEventListener("hashchange", handleHashRoute);
  window.addEventListener("DOMContentLoaded", handleHashRoute);


  function getPromoFiltroFromHash() {
    const h = (location.hash || "").toLowerCase();
    // aceita "#promocoes" ou "#promocoes-<id>"
    const m = h.match(/^#promocoes-([a-z0-9\-_.]+)$/i);
    return m ? m[1] : "todos";
  }

  // quando clicar no menu, define o hash base

  if (linkPromo) {
    linkPromo.addEventListener("click", (e) => {
      e.preventDefault();
      location.hash = "#promocoes";
      mostrarPromocoes("todos");
    });
  }

  // ao carregar a página e ao trocar o hash, re-renderiza com o filtro
  window.addEventListener("DOMContentLoaded", () => {
    const h = (location.hash || "").toLowerCase();
    if (h.startsWith("#promocoes")) {
      mostrarPromocoes(getPromoFiltroFromHash());
    }
  });
  window.addEventListener("hashchange", () => {
    const h = (location.hash || "").toLowerCase();
    if (h.startsWith("#promocoes")) {
      mostrarPromocoes(getPromoFiltroFromHash());
    }
  });





  ////

  // Função para registrar clique no Firebase
  function registrarCliqueBotao(tipo, idEstabelecimento) {
    const hoje = getHojeBR();
    const ref = firebase.database().ref(`cliquesPorBotao/${hoje}/${idEstabelecimento}/${tipo}`);
    // retorna uma Promise e resolve quando a transação completa
    return new Promise((resolve) => {
      ref.transaction(
        (atual) => (atual || 0) + 1,
        (_erro, _committed, _snap) => resolve({ ok: !_erro })
      );
    });
  }

  // === Contador: clique em telefone (link tel: dentro da área de info) ===
  document.addEventListener('click', function (ev) {
    const a = ev.target.closest?.('.telefone-link');
    if (!a) return;

    ev.preventDefault(); // registra primeiro

    const href = a.getAttribute('href') || '';
    const tel = a.dataset.tel || somenteDigitos(href);
    const estId = a.dataset.id || a.closest('[data-est-id]')?.dataset.estId || '';


    // se for link do WhatsApp, mantenha o href original (com text=...);
    // senão, caia para tel:
    const isWhats = /^https?:\/\/(?:api\.whatsapp\.com|wa\.me)\//i.test(href);
    const navegar = () => {
      if (isWhats) {
        window.open(href, '_blank');  // abre Whats em nova aba
      } else {
        window.open(`tel:${tel}`, '_blank');  // abre discador em nova aba
      }
    };



    let navegou = false;
    registrarCliqueBotao('telefone', estId || '')
      .finally(() => { navegou = true; navegar(); });

    // fallback caso a rede esteja lenta: garante navegação mesmo sem callback
    setTimeout(() => { if (!navegou) navegar(); }, 600);
  });





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
    // se já instalado, não mostra nunca
    if (isAppInstalado()) return;

    // se estiver nos jogos, não guarda o prompt nem mostra barra
    if (estaNosJogos()) {
      e.preventDefault();
      deferredPrompt = null;
      const barra = document.getElementById("barraInstalacao");
      if (barra) barra.style.display = "none";
      return;
    }

    // fora dos jogos, seguir fluxo normal
    e.preventDefault();
    deferredPrompt = e;
    const barra = document.getElementById("barraInstalacao");
    if (barra) barra.style.display = "flex";
  });




  document.addEventListener("DOMContentLoaded", () => {
    // Se já está instalado, esconde a barra
    if (isAppInstalado()) {
      const barra = document.getElementById("barraInstalacao");
      if (barra) barra.style.display = "none";

      const iosPrompt = document.getElementById("iosInstallPrompt");
      if (iosPrompt) iosPrompt.style.display = "none";
    }
  });




  const btnInstalar = document.getElementById("btnInstalar");
  btnInstalar?.addEventListener("click", () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === "accepted") {
          const barra = document.getElementById("barraInstalacao");
          if (barra) barra.style.display = "none";
        }
        deferredPrompt = null;
      });
    }
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
      alert("📱 Para IPhone, no navegador SAFARI, toque em 'Compartilhar' (ícone com a seta para cima), arraste pra cima, e va até 'Adicionar à Tela de Início' ");
    }
    fecharInstalador();
  });




  // Quando clicar no botão DO RODAPE
  document.getElementById("barraInstalacao").addEventListener("click", () => {
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
      alert("📱 Para IPhone, no navegador SAFARI, toque em 'Compartilhar' (ícone com a seta para cima), arraste pra cima, e va até 'Adicionar à Tela de Início' ");
    }
    fecharInstalador();
  });


  function isIos() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent);
  }

  function isInStandaloneMode() {
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  }

  // iOS: caixinha fixa
  document.addEventListener("DOMContentLoaded", () => {
    if (isIos() && !isInStandaloneMode() && !estaNosJogos()) {
      const box = document.getElementById("iosInstallBox");
      if (box) box.classList.remove("hidden");
    }
  });

  // iOS (Safari): modal temporizada
  document.addEventListener("DOMContentLoaded", () => {
    if (isIosSafari() && !isInStandaloneMode() && !estaNosJogos()) {
      setTimeout(() => {
        const modal = document.getElementById("iosInstallPrompt");
        if (modal) modal.classList.remove("hidden");
      }, 2500);
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
    if (isIosSafari() && !isInStandaloneMode() && !estaNosJogos()) {
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
  const hoje = getHojeBR();

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

window.addEventListener("beforeinstallprompt", (e) => {
  // NUNCA mostrar no hub de jogos ou dentro dos jogos
  if (estaNosJogos()) {
    e.preventDefault();
    promptInstalacao = null;
    document.getElementById("instalarAppBox")?.classList.add("hidden");
    document.getElementById("barraInstalacao")?.style && (document.getElementById("barraInstalacao").style.display = "none");
    return;
  }

  // fora dos jogos, segue o fluxo normal
  e.preventDefault();
  promptInstalacao = e;
  document.getElementById("instalarAppBox")?.classList.remove("hidden");
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

function expandirImagem(url) {
  // Remove overlay antigo, se existir
  const old = document.querySelector('.img-expand-overlay');
  if (old) old.remove();

  // Cria overlay de fundo
  const overlay = document.createElement('div');
  overlay.className = 'img-expand-overlay';
  overlay.style.position = 'fixed';
  overlay.style.top = 0;
  overlay.style.left = 0;
  overlay.style.width = '100vw';
  overlay.style.height = '100vh';
  overlay.style.background = 'rgba(0,0,0,0.85)';
  overlay.style.display = 'flex';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';
  overlay.style.zIndex = 9999;

  // Cria a imagem expandida
  const img = document.createElement('img');
  img.src = url;
  img.style.maxWidth = '92vw';
  img.style.maxHeight = '85vh';
  img.style.borderRadius = '16px';
  img.style.boxShadow = '0 4px 32px rgba(0,0,0,0.9)';
  img.style.background = '#fff';
  // ESSENCIAL:
  img.style.objectFit = 'contain';
  img.style.display = 'block';

  // Fechar ao clicar fora da imagem
  overlay.onclick = function (e) {
    if (e.target === overlay) document.body.removeChild(overlay);
  };

  overlay.appendChild(img);
  document.body.appendChild(overlay);
}


// 1. Ao abrir o menu lateral, reseta tudo:
document.getElementById("sidebarOpen").addEventListener("click", function () {
  setTimeout(() => {
    document.querySelectorAll(".separador-letra").forEach(el => {
      el.style.display = "";
      el.style.visibility = "";
      el.style.height = "";
      el.style.padding = "";
      el.style.margin = "";
    });
    // Se tiver campo de busca, limpa também:
    if (document.getElementById("searchSidebar")) document.getElementById("searchSidebar").value = "";
  }, 100);
});

// 2. Ao clicar para abrir o submenu "Comércios", SEMPRE reseta todas as letras:
document.querySelectorAll(".submenu_item").forEach(item => {
  item.addEventListener("click", function () {
    setTimeout(() => {
      document.querySelectorAll(".separador-letra").forEach(el => {
        el.style.display = "";
        el.style.visibility = "";
        el.style.height = "";
        el.style.padding = "";
        el.style.margin = "";
      });
    }, 100);
  });
});

// 3. Ao limpar a pesquisa:
if (document.getElementById("clearSearch")) {
  document.getElementById("clearSearch").addEventListener("click", function () {
    setTimeout(() => {
      document.querySelectorAll(".separador-letra").forEach(el => {
        el.style.display = "";
        el.style.visibility = "";
        el.style.height = "";
        el.style.padding = "";
        el.style.margin = "";
      });
    }, 100);
  });
}

// pre carregar as imagens 
function preCarregarImagensCardapio(imagens) {
  if (!Array.isArray(imagens)) return;
  imagens.forEach(src => {
    const img = new Image();
    img.src = src;
  });
}






document.body.addEventListener('click', function (e) {
  const img = e.target.closest('.promo-img-zoom, .promo-carousel-img, .imagem-cardapio, .imagem-expandivel');
  if (!img) return;

  const src = img.src;
  const bg = document.createElement('div');
  bg.className = 'fullscreen-img-bg';
  bg.innerHTML = `<img src="${src}" alt="Ampliada" />`;
  bg.onclick = () => bg.remove();
  document.body.appendChild(bg);
});















document.body.addEventListener('click', function (e) {
  if (e.target.classList.contains('btn-cardapio')) {
    const link = e.target.getAttribute("data-link");

    if (link) {
      window.open(link, '_blank');
    } else {
      const nome = e.target.getAttribute("data-name");
      const id = e.target.getAttribute("data-id");
      abrirCardapio(nome, id);
    }
  }
});







function registrarCliqueCardapioOndeComer(nomeEstabelecimento) {
  const hoje = getHojeBR();
  const ref = firebase.database().ref(`cliquesCardapiosOndeComer/${hoje}/${nomeEstabelecimento}`);
  ref.transaction(valorAtual => (valorAtual || 0) + 1);
}

function registrarCliqueWhatsOndeComer(nomeEstabelecimento) {
  const hoje = getHojeBR();
  const ref = firebase.database().ref(`cliquesWhatsOndeComer/${hoje}/${nomeEstabelecimento}`);
  ref.transaction(valorAtual => (valorAtual || 0) + 1);
}

function registrarCliqueNaPromocao(nomeComercio) {
  const hoje = getHojeBR();
  const ref = firebase.database().ref(`cliquesPromocoesPorComercio/${hoje}/${nomeComercio}`);
  ref.transaction(valorAtual => (valorAtual || 0) + 1);
}



function estaNosJogos() {
  // via hash OU pela presença de um container de jogo
  const h = (location.hash || '').toLowerCase();
  if (h.includes('jogos') || h.includes('tetrix') || h.includes('canos')) return true;
  return !!document.querySelector('.game-wrap');
}




function vindoDoInstagram() {
  return navigator.userAgent.toLowerCase().includes('instagram');
}

function mostrarAvisoInstagram() {
  const aviso = document.createElement('div');
  aviso.style = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    padding: 15px;
    background: #ffcc00;
    color: #000;
    font-weight: bold;
    text-align: center;
    z-index: 9999;
  `;
  aviso.innerHTML = `
    ⚠️ Voce esta utilizando o acesso pelo Instagram!<br>Para instalar o App, toque nos 3 pontinhos (⋮) no canto superior e selecione "Abrir no navegador".
        <span style="margin-left:10px; cursor:pointer;" onclick="this.parentElement.remove()">✖️</span>
  `;
  document.body.appendChild(aviso);
}

// Quando o DOM estiver carregado
document.addEventListener("DOMContentLoaded", () => {
  const botaoApp = document.getElementById("menuApp"); // ⬅️ Substitua pelo ID correto, se for diferente

  if (botaoApp) {
    botaoApp.addEventListener("click", function (e) {
      e.preventDefault();

      if (vindoDoInstagram()) {
        mostrarAvisoInstagram();
      } else {
        // Redireciona para a explicação ou inicia instalação
        window.location.href = "#menuApp"; // ou qualquer outra ação que você deseje
      }
    });
  }
});

// (seu conteúdo original permanece acima)

// ✅ REGISTRO DO SERVICE WORKER
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('service-worker.js')
    .then(reg => {
      console.log('🛡️ Service Worker registrado com sucesso:', reg.scope);
    })
    .catch(err => {
      console.error('❌ Falha ao registrar o Service Worker:', err);
    });
}

// ✅ DETECÇÃO DE INSTALAÇÃO DO PWA
window.addEventListener('appinstalled', () => {
  console.log('✅ PWA instalado detectado');

  const hoje = new Date().toLocaleDateString('pt-BR').split('/').reverse().join('-');

  fetch(`https://contadoracessos-default-rtdb.firebaseio.com/instalacoesPWA/${hoje}.json`, {
    method: "POST",
    body: JSON.stringify({
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent
    }),
    headers: {
      "Content-Type": "application/json"
    }
  })
    .then(() => {
      console.log('📤 Instalação registrada no Firebase');
    })
    .catch((err) => {
      console.error('❌ Erro ao registrar instalação:', err);
    });
});


/* TABS ABAS HANDLER — ÚNICO */
document.addEventListener('click', function (e) {
  const tab = e.target.closest('.aba-tab');   // <— pega o botão mesmo se clicar no ícone/texto
  if (!tab) return;

  const container = tab.closest('li') || tab.closest('.estabelecimento-card') || document;

  // ativa/desativa botões
  container.querySelectorAll('.aba-tab').forEach(b => b.classList.remove('active'));
  tab.classList.add('active');

  // esconde/mostra conteúdos
  container.querySelectorAll('.aba').forEach(sec => { sec.style.display = 'none'; sec.classList.remove('visible'); });

  const targetId = tab.dataset.target || tab.getAttribute('data-target') || '';
  const nome = targetId.replace(/^(info-|fotos-|cardapio-)/, '');

  // 🔢 CONTAGEM
  if (targetId.startsWith('fotos-')) window.registrarCliqueBotao?.('fotos', nome);
  if (targetId.startsWith('cardapio-')) window.registrarCliqueBotao?.('cardapio', nome);

  // abre a seção alvo
  const alvo = container.querySelector('#' + CSS.escape(targetId));
  if (alvo) {
    alvo.style.display = 'block';
    alvo.classList.add('visible');
    ajustarAbaViewport(alvo); // <<< adicione esta linha

    // inicia Swiper se existir
    const node = alvo.querySelector('.swiper');
    if (node && !alvo.swiperInstance) {
      alvo.swiperInstance = new Swiper(node, {
        loop: true,
        navigation: { nextEl: node.querySelector('.swiper-button-next'), prevEl: node.querySelector('.swiper-button-prev') },
        pagination: { el: node.querySelector('.swiper-pagination'), clickable: true },
      });
    }
  } else if (targetId.startsWith('cardapio-')) {
    // cardápio com link externo
    const link = tab.dataset.cardapioLink || tab.dataset.link;
    if (link) window.open(link, '_blank');
  }
});




/* INIT ABAS: garante que todas as abas (exceto Info) comecem fechadas */
(function initAbasDefault() {
  try {
    document.querySelectorAll('.abas-conteudo').forEach(wrapper => {
      wrapper.querySelectorAll('.aba').forEach(sec => {
        if (!sec.classList.contains('aba-info')) {
          sec.style.display = 'none';
          sec.classList.remove('visible');
        } else {
          // Info aberta por padrão
          sec.style.display = 'block';
          sec.classList.add('visible');
        }
      });
    });
  } catch (err) { console.warn('initAbasDefault:', err); }
})();







/* TAB SLIDER (pílula deslizante) */
function moveTabSlider(nav) {
  if (!nav) return;
  let s = nav.querySelector('.tab-slider');
  if (!s) {
    s = document.createElement('div');
    s.className = 'tab-slider';
    nav.appendChild(s);
  }
  const active = nav.querySelector('.aba-tab.active') || nav.querySelector('.aba-tab');
  if (!active) return;
  const r = active.getBoundingClientRect();
  const rn = nav.getBoundingClientRect();
  s.style.left = (r.left - rn.left + nav.scrollLeft) + 'px';
  s.style.width = r.width + 'px';
}

/* atualiza quando clica numa aba (depois do handler marcar .active) */
document.addEventListener('click', function (e) {
  const tab = e.target.closest('.aba-tab');
  if (!tab) return;
  const nav = tab.closest('.abas-nav');
  requestAnimationFrame(() => moveTabSlider(nav));
});

/* posiciona ao abrir a tela e ao redimensionar */
window.addEventListener('load', () => document.querySelectorAll('.abas-nav').forEach(moveTabSlider));
window.addEventListener('resize', () => document.querySelectorAll('.abas-nav').forEach(moveTabSlider));

/* se os cards são inseridos dinamicamente, observa o DOM e posiciona o slider quando surgir uma nova .abas-nav */
new MutationObserver((mutations) => {
  for (const m of mutations) {
    m.addedNodes && m.addedNodes.forEach(node => {
      if (!(node instanceof HTMLElement)) return;
      if (node.classList && node.classList.contains('abas-nav')) moveTabSlider(node);
      else node.querySelectorAll?.('.abas-nav').forEach(moveTabSlider);
    });
  }
}).observe(document.body, { childList: true, subtree: true });




/* === AJUSTE DE VIEWPORT PARA FOTOS/CARDÁPIO === */
function _abaHeaderOffset(pane) {
  try {
    const header = document.querySelector('.navbar');
    const headerH = header ? header.offsetHeight : 0;
    let nav = pane.closest('.estabelecimento-card, .onde-comer-card, li, [data-estab]');
    nav = nav ? nav.querySelector('.abas-nav') : null;
    const navH = nav ? nav.offsetHeight : 0;
    const margem = 2;
    return { headerH, navH, margem };
  } catch (_e) { return { headerH: 0, navH: 0, margem: 12 }; }
}

function ajustarAbaViewport(pane) {
  // alturas de topo/abas (ajuste os seletores se forem diferentes no seu HTML)
  const headerH = document.querySelector('.topo, header')?.offsetHeight || 0;
  const tabsH = pane.closest('.abas-container')?.offsetHeight
    || document.querySelector('.tabs, .abas')?.offsetHeight
    || 0;
  const margem = 8;

  // espaço disponível na tela (mínimo pra evitar "colapso")
  const disponivel = Math.max(220, window.innerHeight - headerH - tabsH - margem);

  // limita a altura do carrossel para não empurrar o layout
  const swiperEl = pane.querySelector('.swiper-fotos');
  if (swiperEl) {
    swiperEl.style.maxHeight = disponivel + 'px';
  }

  // mantém o carrossel esperto com a nova altura
  const swiper = swiperEl?.swiper;
  if (swiper?.updateAutoHeight) {
    swiper.updateAutoHeight();
    // garante ajuste depois que o DOM assenta
    setTimeout(() => { swiper.updateAutoHeight(); swiper.update(); }, 0);
  }

  // ✅ sem scrollIntoView e sem window.scrollTo aqui
}



/* RESIZE GUARDED FOR FOTOS/CARDAPIO */
window.addEventListener('resize', function () {
  document.querySelectorAll('.aba.visible').forEach(function (pane) {
    const id = pane.id || '';
    if ((/^fotos-|^cardapio-/.test(id)) && pane.querySelector('.swiper')) {
      ajustarAbaViewport(pane);
    }
  });
});


// Só ajusta quando a aba aberta é FOTOS ou CARDÁPIO (evita rolar pelos "Info" de todos os cards)
window.addEventListener('resize', function () {
  document.querySelectorAll('.aba.visible').forEach(function (pane) {
    const id = pane.id || '';
    if ((/^fotos-|^cardapio-/.test(id)) && pane.querySelector('.swiper')) {
      ajustarAbaViewport(pane);
    }
  });
});


/* Hook de clique: ao abrir FOTOS/CARDÁPIO, ajustar viewport e rolar até o carrossel ficar visível */
document.addEventListener('click', function (e) {
  const tab = e.target.closest('.aba-tab');
  if (!tab) return;
  const tgt = tab.dataset && tab.dataset.target || '';
  if (!/^fotos-|^cardapio-/.test(tgt)) return;
  const container = tab.closest('.estabelecimento-card, .onde-comer-card, li, [data-estab]');
  if (!container) return;
  const pane = container.querySelector('#' + CSS.escape(tgt));
  if (!pane) return;
  requestAnimationFrame(() => ajustarAbaViewport(pane));
});


// Função para registrar clique no Firebase
function registrarCliqueBotao(tipo, idEstabelecimento) {
  const hoje = getHojeBR(); // ou new Date().toISOString().slice(0,10) se for o seu caso
  const ref = firebase.database().ref(`cliquesPorBotao/${hoje}/${idEstabelecimento}/${tipo}`);
  return new Promise((resolve) => {
    ref.transaction(
      (atual) => (atual || 0) + 1,
      (_erro, _committed, _snap) => resolve({ ok: !_erro })
    );
  });
}

// 👇 adicione esta linha logo após a função:
window.registrarCliqueBotao = registrarCliqueBotao;



// ====== COLETA DE LIXO — DIA A DIA ======
// Preenchido: segunda-feira (como você enviou)
// Os demais dias ficam prontos pra você editar livremente
const COLETA_LIXO = {
  seg: [
    { hora: "06:05", bairros: ["Garagem"], Equipe: "Leonil" },
    { hora: "06:10", bairros: ["CTG"], Equipe: "Leonil" },
    { hora: "06:35", bairros: ["Centro"], Equipe: "Leonil" },
    { hora: "07:10", bairros: ["Rocha"], Equipe: "Leonil" },
    { hora: "07:30", bairros: ["Caravela"], Equipe: "Leonil" },
    { hora: "08:40", bairros: ["SABESP"], Equipe: "Leonil" },
    { hora: "09:00", bairros: ["Fogaça"], Equipe: "Leonil" },
    { hora: "09:20", bairros: ["Usina"], Equipe: "Leonil" },
    { hora: "09:40", bairros: ["Amaral"], Equipe: "Leonil" },
    { hora: "09:55", bairros: ["Matadouro"], Equipe: "Leonil" },
    { hora: "10:05", bairros: ["Caixa na Vila Rural"], Equipe: "Leonil" },
    { hora: "10:10", bairros: ["Caixa Ilha Bela"], Equipe: "Leonil" },
    { hora: "10:20", bairros: ["Harmonia"], Equipe: "Leonil" },
    { hora: "10:30", bairros: ["Tanque Rede"], Equipe: "Leonil" },
    { hora: "10:40", bairros: ["Marina"], Equipe: "Leonil" },
    { hora: "10:50", bairros: ["Garden"], Equipe: "Leonil" },
    { hora: "11:15", bairros: ["Ilha Bela"], Equipe: "Leonil" },
    { hora: "12:00", bairros: ["Mosteiro"], Equipe: "Leonil" },
    { hora: "12:20", bairros: ["Agua da Limeira"], Equipe: "Leonil" },
    { hora: "12:30", bairros: ["Bairro dos Diogo"], Equipe: "Leonil" },
    { hora: "10:50", bairros: ["Pedra de Fogo"], Equipe: "Leonil" },
    { hora: "11:50", bairros: ["Graciana"], Equipe: "Leonil" },
    { hora: "11:30", bairros: ["Fazendinha"], Equipe: "Leonil" },
    { hora: "11:30", bairros: ["Lagoa Azul"], Equipe: "Leonil" },
    { hora: "11:30", bairros: ["Pedro Salles"], Equipe: "Leonil" },
    { hora: "13:50", bairros: ["Nova Brasilia"], Equipe: "Leonil" },
    { hora: "14:00", bairros: ["Caixa 1 Nova Brasilia"], Equipe: "Leonil" },
    { hora: "14:20", bairros: ["Kaliu Keder"], Equipe: "Leonil" },

    { hora: "06:05", bairros: ["Garagem"], Equipe: "Bruno" },
    { hora: "07:30", bairros: ["Murador"], Equipe: "Bruno" },
    { hora: "08:00", bairros: ["Vista Alegre"], Equipe: "Bruno" },
    { hora: "08:30", bairros: ["Novo Horizonte 1"], Equipe: "Bruno" },
    { hora: "09:00", bairros: ["Novo Horizonte 2"], Equipe: "Bruno" },
    { hora: "09:30", bairros: ["Novo Horizonte 3"], Equipe: "Bruno" },
    { hora: "10:00", bairros: ["Novo Horizonte 4"], Equipe: "Bruno" },
    { hora: "10:20", bairros: ["Usina"], Equipe: "Bruno" },
    { hora: "10:35", bairros: ["Lazaro"], Equipe: "Bruno" },
    { hora: "12:05", bairros: ["Bairro da Cachoeira"], Equipe: "Bruno" },


  ],

  // Edite dia a dia aqui embaixo:
  ter: [
    { hora: "06:05", bairros: ["Garagem"], Equipe: "Leonil" },
    { hora: "06:10", bairros: ["CTG"], Equipe: "Leonil" },
    { hora: "06:35", bairros: ["Centro"], Equipe: "Leonil" },
    { hora: "07:10", bairros: ["Rocha"], Equipe: "Leonil" },
    { hora: "07:30", bairros: ["Caravela"], Equipe: "Leonil" },
    { hora: "08:40", bairros: ["SABESP"], Equipe: "Leonil" },
    { hora: "09:00", bairros: ["Fogaça"], Equipe: "Leonil" },
    { hora: "09:20", bairros: ["Usina"], Equipe: "Leonil" },
    { hora: "09:40", bairros: ["Amaral"], Equipe: "Leonil" },
    { hora: "09:55", bairros: ["Matadouro"], Equipe: "Leonil" },
    { hora: "10:05", bairros: ["Caixa na Vila Rural"], Equipe: "Leonil" },
    { hora: "10:10", bairros: ["Caixa Ilha Bela"], Equipe: "Leonil" },
    { hora: "10:20", bairros: ["Harmonia"], Equipe: "Leonil" },
    { hora: "10:30", bairros: ["Tanque Rede"], Equipe: "Leonil" },
    { hora: "10:40", bairros: ["Marina"], Equipe: "Leonil" },
    { hora: "10:50", bairros: ["Garden"], Equipe: "Leonil" },
    { hora: "11:15", bairros: ["Ilha Bela"], Equipe: "Leonil" },
    { hora: "12:00", bairros: ["Mosteiro"], Equipe: "Leonil" },
    { hora: "12:20", bairros: ["Agua da Limeira"], Equipe: "Leonil" },
    { hora: "12:30", bairros: ["Bairro dos Diogo"], Equipe: "Leonil" },
    { hora: "10:50", bairros: ["Pedra de Fogo"], Equipe: "Leonil" },
    { hora: "11:50", bairros: ["Graciana"], Equipe: "Leonil" },
    { hora: "11:30", bairros: ["Fazendinha"], Equipe: "Leonil" },
    { hora: "11:30", bairros: ["Lagoa Azul"], Equipe: "Leonil" },
    { hora: "11:30", bairros: ["Pedro Salles"], Equipe: "Leonil" },
    { hora: "13:50", bairros: ["Nova Brasilia"], Equipe: "Leonil" },
    { hora: "14:00", bairros: ["Caixa 1 Nova Brasilia"], Equipe: "Leonil" },
    { hora: "14:20", bairros: ["Kaliu Keder"], Equipe: "Leonil" },

    { hora: "06:05", bairros: ["Garagem"], Equipe: "Bruno" },
    { hora: "07:30", bairros: ["Murador"], Equipe: "Bruno" },
    { hora: "08:00", bairros: ["Vista Alegre"], Equipe: "Bruno" },
    { hora: "08:30", bairros: ["Novo Horizonte 1"], Equipe: "Bruno" },
    { hora: "09:00", bairros: ["Novo Horizonte 2"], Equipe: "Bruno" },
    { hora: "09:30", bairros: ["Novo Horizonte 3"], Equipe: "Bruno" },
    { hora: "10:00", bairros: ["Novo Horizonte 4"], Equipe: "Bruno" },
    { hora: "10:20", bairros: ["Usina"], Equipe: "Bruno" },
    { hora: "10:35", bairros: ["Lazaro"], Equipe: "Bruno" },
    { hora: "12:05", bairros: ["Bairro da Cachoeira"], Equipe: "Bruno" },
  ],
  qua: [
    { hora: "06:05", bairros: ["Garagem"], Equipe: "Leonil" },
    { hora: "06:10", bairros: ["CTG"], Equipe: "Leonil" },
    { hora: "06:35", bairros: ["Centro"], Equipe: "Leonil" },
    { hora: "07:10", bairros: ["Rocha"], Equipe: "Leonil" },
    { hora: "07:30", bairros: ["Caravela"], Equipe: "Leonil" },
    { hora: "08:40", bairros: ["SABESP"], Equipe: "Leonil" },
    { hora: "09:00", bairros: ["Fogaça"], Equipe: "Leonil" },
    { hora: "09:20", bairros: ["Usina"], Equipe: "Leonil" },
    { hora: "09:40", bairros: ["Amaral"], Equipe: "Leonil" },
    { hora: "09:55", bairros: ["Matadouro"], Equipe: "Leonil" },
    { hora: "10:05", bairros: ["Caixa na Vila Rural"], Equipe: "Leonil" },
    { hora: "10:10", bairros: ["Caixa Ilha Bela"], Equipe: "Leonil" },
    { hora: "10:20", bairros: ["Harmonia"], Equipe: "Leonil" },
    { hora: "10:30", bairros: ["Tanque Rede"], Equipe: "Leonil" },
    { hora: "10:40", bairros: ["Marina"], Equipe: "Leonil" },
    { hora: "10:50", bairros: ["Garden"], Equipe: "Leonil" },
    { hora: "11:15", bairros: ["Ilha Bela"], Equipe: "Leonil" },
    { hora: "12:00", bairros: ["Mosteiro"], Equipe: "Leonil" },
    { hora: "12:20", bairros: ["Agua da Limeira"], Equipe: "Leonil" },
    { hora: "12:30", bairros: ["Bairro dos Diogo"], Equipe: "Leonil" },
    { hora: "10:50", bairros: ["Pedra de Fogo"], Equipe: "Leonil" },
    { hora: "11:50", bairros: ["Graciana"], Equipe: "Leonil" },
    { hora: "11:30", bairros: ["Fazendinha"], Equipe: "Leonil" },
    { hora: "11:30", bairros: ["Lagoa Azul"], Equipe: "Leonil" },
    { hora: "11:30", bairros: ["Pedro Salles"], Equipe: "Leonil" },
    { hora: "13:50", bairros: ["Nova Brasilia"], Equipe: "Leonil" },
    { hora: "14:00", bairros: ["Caixa 1 Nova Brasilia"], Equipe: "Leonil" },
    { hora: "14:20", bairros: ["Kaliu Keder"], Equipe: "Leonil" },

    { hora: "06:05", bairros: ["Garagem"], Equipe: "Bruno" },
    { hora: "07:30", bairros: ["Murador"], Equipe: "Bruno" },
    { hora: "08:00", bairros: ["Vista Alegre"], Equipe: "Bruno" },
    { hora: "08:30", bairros: ["Novo Horizonte 1"], Equipe: "Bruno" },
    { hora: "09:00", bairros: ["Novo Horizonte 2"], Equipe: "Bruno" },
    { hora: "09:30", bairros: ["Novo Horizonte 3"], Equipe: "Bruno" },
    { hora: "10:00", bairros: ["Novo Horizonte 4"], Equipe: "Bruno" },
    { hora: "10:20", bairros: ["Usina"], Equipe: "Bruno" },
    { hora: "10:35", bairros: ["Lazaro"], Equipe: "Bruno" },
    { hora: "12:05", bairros: ["Bairro da Cachoeira"], Equipe: "Bruno" },
  ],
  qui: [
    { hora: "06:05", bairros: ["Garagem"], Equipe: "Leonil" },
    { hora: "06:10", bairros: ["CTG"], Equipe: "Leonil" },
    { hora: "06:35", bairros: ["Centro"], Equipe: "Leonil" },
    { hora: "07:10", bairros: ["Rocha"], Equipe: "Leonil" },
    { hora: "07:30", bairros: ["Caravela"], Equipe: "Leonil" },
    { hora: "08:40", bairros: ["SABESP"], Equipe: "Leonil" },
    { hora: "09:00", bairros: ["Fogaça"], Equipe: "Leonil" },
    { hora: "09:20", bairros: ["Usina"], Equipe: "Leonil" },
    { hora: "09:40", bairros: ["Amaral"], Equipe: "Leonil" },
    { hora: "09:55", bairros: ["Matadouro"], Equipe: "Leonil" },
    { hora: "10:05", bairros: ["Caixa na Vila Rural"], Equipe: "Leonil" },
    { hora: "10:10", bairros: ["Caixa Ilha Bela"], Equipe: "Leonil" },
    { hora: "10:20", bairros: ["Harmonia"], Equipe: "Leonil" },
    { hora: "10:30", bairros: ["Tanque Rede"], Equipe: "Leonil" },
    { hora: "10:40", bairros: ["Marina"], Equipe: "Leonil" },
    { hora: "10:50", bairros: ["Garden"], Equipe: "Leonil" },
    { hora: "11:15", bairros: ["Ilha Bela"], Equipe: "Leonil" },
    { hora: "12:00", bairros: ["Mosteiro"], Equipe: "Leonil" },
    { hora: "12:20", bairros: ["Agua da Limeira"], Equipe: "Leonil" },
    { hora: "12:30", bairros: ["Bairro dos Diogo"], Equipe: "Leonil" },
    { hora: "10:50", bairros: ["Pedra de Fogo"], Equipe: "Leonil" },
    { hora: "11:50", bairros: ["Graciana"], Equipe: "Leonil" },
    { hora: "11:30", bairros: ["Fazendinha"], Equipe: "Leonil" },
    { hora: "11:30", bairros: ["Lagoa Azul"], Equipe: "Leonil" },
    { hora: "11:30", bairros: ["Pedro Salles"], Equipe: "Leonil" },
    { hora: "13:50", bairros: ["Nova Brasilia"], Equipe: "Leonil" },
    { hora: "14:00", bairros: ["Caixa 1 Nova Brasilia"], Equipe: "Leonil" },
    { hora: "14:20", bairros: ["Kaliu Keder"], Equipe: "Leonil" },

    { hora: "06:05", bairros: ["Garagem"], Equipe: "Bruno" },
    { hora: "07:30", bairros: ["Murador"], Equipe: "Bruno" },
    { hora: "08:00", bairros: ["Vista Alegre"], Equipe: "Bruno" },
    { hora: "08:30", bairros: ["Novo Horizonte 1"], Equipe: "Bruno" },
    { hora: "09:00", bairros: ["Novo Horizonte 2"], Equipe: "Bruno" },
    { hora: "09:30", bairros: ["Novo Horizonte 3"], Equipe: "Bruno" },
    { hora: "10:00", bairros: ["Novo Horizonte 4"], Equipe: "Bruno" },
    { hora: "10:20", bairros: ["Usina"], Equipe: "Bruno" },
    { hora: "10:35", bairros: ["Lazaro"], Equipe: "Bruno" },
    { hora: "12:05", bairros: ["Bairro da Cachoeira"], Equipe: "Bruno" },

  ],
  sex: [
    { hora: "06:05", bairros: ["Garagem"], Equipe: "Leonil" },
    { hora: "06:10", bairros: ["CTG"], Equipe: "Leonil" },
    { hora: "06:35", bairros: ["Centro"], Equipe: "Leonil" },
    { hora: "07:10", bairros: ["Rocha"], Equipe: "Leonil" },
    { hora: "07:30", bairros: ["Caravela"], Equipe: "Leonil" },
    { hora: "08:40", bairros: ["SABESP"], Equipe: "Leonil" },
    { hora: "09:00", bairros: ["Fogaça"], Equipe: "Leonil" },
    { hora: "09:20", bairros: ["Usina"], Equipe: "Leonil" },
    { hora: "09:40", bairros: ["Amaral"], Equipe: "Leonil" },
    { hora: "09:55", bairros: ["Matadouro"], Equipe: "Leonil" },
    { hora: "10:05", bairros: ["Caixa na Vila Rural"], Equipe: "Leonil" },
    { hora: "10:10", bairros: ["Caixa Ilha Bela"], Equipe: "Leonil" },
    { hora: "10:20", bairros: ["Harmonia"], Equipe: "Leonil" },
    { hora: "10:30", bairros: ["Tanque Rede"], Equipe: "Leonil" },
    { hora: "10:40", bairros: ["Marina"], Equipe: "Leonil" },
    { hora: "10:50", bairros: ["Garden"], Equipe: "Leonil" },
    { hora: "11:15", bairros: ["Ilha Bela"], Equipe: "Leonil" },
    { hora: "12:00", bairros: ["Mosteiro"], Equipe: "Leonil" },
    { hora: "12:20", bairros: ["Agua da Limeira"], Equipe: "Leonil" },
    { hora: "12:30", bairros: ["Bairro dos Diogo"], Equipe: "Leonil" },
    { hora: "10:50", bairros: ["Pedra de Fogo"], Equipe: "Leonil" },
    { hora: "11:50", bairros: ["Graciana"], Equipe: "Leonil" },
    { hora: "11:30", bairros: ["Fazendinha"], Equipe: "Leonil" },
    { hora: "11:30", bairros: ["Lagoa Azul"], Equipe: "Leonil" },
    { hora: "11:30", bairros: ["Pedro Salles"], Equipe: "Leonil" },
    { hora: "13:50", bairros: ["Nova Brasilia"], Equipe: "Leonil" },
    { hora: "14:00", bairros: ["Caixa 1 Nova Brasilia"], Equipe: "Leonil" },
    { hora: "14:20", bairros: ["Kaliu Keder"], Equipe: "Leonil" },

    { hora: "06:05", bairros: ["Garagem"], Equipe: "Bruno" },
    { hora: "07:30", bairros: ["Murador"], Equipe: "Bruno" },
    { hora: "08:00", bairros: ["Vista Alegre"], Equipe: "Bruno" },
    { hora: "08:30", bairros: ["Novo Horizonte 1"], Equipe: "Bruno" },
    { hora: "09:00", bairros: ["Novo Horizonte 2"], Equipe: "Bruno" },
    { hora: "09:30", bairros: ["Novo Horizonte 3"], Equipe: "Bruno" },
    { hora: "10:00", bairros: ["Novo Horizonte 4"], Equipe: "Bruno" },
    { hora: "10:20", bairros: ["Usina"], Equipe: "Bruno" },
    { hora: "10:35", bairros: ["Lazaro"], Equipe: "Bruno" },
    { hora: "12:05", bairros: ["Bairro da Cachoeira"], Equipe: "Bruno" },
  ],
  sab: [
    { hora: "06:05", bairros: ["Garagem"], Equipe: "Leonil" },
    { hora: "06:10", bairros: ["CTG"], Equipe: "Leonil" },
    { hora: "06:35", bairros: ["Centro"], Equipe: "Leonil" },
    { hora: "07:10", bairros: ["Rocha"], Equipe: "Leonil" },
    { hora: "07:30", bairros: ["Caravela"], Equipe: "Leonil" },
    { hora: "08:40", bairros: ["SABESP"], Equipe: "Leonil" },
    { hora: "09:00", bairros: ["Fogaça"], Equipe: "Leonil" },
    { hora: "09:20", bairros: ["Usina"], Equipe: "Leonil" },
    { hora: "09:40", bairros: ["Amaral"], Equipe: "Leonil" },
    { hora: "09:55", bairros: ["Matadouro"], Equipe: "Leonil" },
    { hora: "10:05", bairros: ["Caixa na Vila Rural"], Equipe: "Leonil" },
    { hora: "10:10", bairros: ["Caixa Ilha Bela"], Equipe: "Leonil" },
    { hora: "10:20", bairros: ["Harmonia"], Equipe: "Leonil" },
    { hora: "10:30", bairros: ["Tanque Rede"], Equipe: "Leonil" },
    { hora: "10:40", bairros: ["Marina"], Equipe: "Leonil" },
    { hora: "10:50", bairros: ["Garden"], Equipe: "Leonil" },
    { hora: "11:15", bairros: ["Ilha Bela"], Equipe: "Leonil" },
    { hora: "12:00", bairros: ["Mosteiro"], Equipe: "Leonil" },
    { hora: "12:20", bairros: ["Agua da Limeira"], Equipe: "Leonil" },
    { hora: "12:30", bairros: ["Bairro dos Diogo"], Equipe: "Leonil" },
    { hora: "10:50", bairros: ["Pedra de Fogo"], Equipe: "Leonil" },
    { hora: "11:50", bairros: ["Graciana"], Equipe: "Leonil" },
    { hora: "11:30", bairros: ["Fazendinha"], Equipe: "Leonil" },
    { hora: "11:30", bairros: ["Lagoa Azul"], Equipe: "Leonil" },
    { hora: "11:30", bairros: ["Pedro Salles"], Equipe: "Leonil" },
    { hora: "13:50", bairros: ["Nova Brasilia"], Equipe: "Leonil" },
    { hora: "14:00", bairros: ["Caixa 1 Nova Brasilia"], Equipe: "Leonil" },
    { hora: "14:20", bairros: ["Kaliu Keder"], Equipe: "Leonil" },

    { hora: "06:05", bairros: ["Garagem"], Equipe: "Bruno" },
    { hora: "07:30", bairros: ["Murador"], Equipe: "Bruno" },
    { hora: "08:00", bairros: ["Vista Alegre"], Equipe: "Bruno" },
    { hora: "08:30", bairros: ["Novo Horizonte 1"], Equipe: "Bruno" },
    { hora: "09:00", bairros: ["Novo Horizonte 2"], Equipe: "Bruno" },
    { hora: "09:30", bairros: ["Novo Horizonte 3"], Equipe: "Bruno" },
    { hora: "10:00", bairros: ["Novo Horizonte 4"], Equipe: "Bruno" },
    { hora: "10:20", bairros: ["Usina"], Equipe: "Bruno" },
    { hora: "10:35", bairros: ["Lazaro"], Equipe: "Bruno" },
    { hora: "12:05", bairros: ["Bairro da Cachoeira"], Equipe: "Bruno" },
  ],
  dom: [
  ],

  // Se quiser um "padrão" pra quando um dia estiver vazio, preencha aqui.
  // Se não quiser padrão, deixe como []:
  geral: []
};

// (Opcional) helper pra você adicionar horários rapidamente no console:
// addHorario("ter","07:00","Centro","Vila Nova");
window.addHorario = function (dia, hora, ...bairros) {
  if (!COLETA_LIXO[dia]) { alert("Dia inválido. Use: seg, ter, qua, qui, sex, sab, dom."); return; }
  COLETA_LIXO[dia].push({ hora, bairros });
};


function categoriaHash(catTitle) {
  // usa o mesmo normalizador que você já usa para nomes
  return "#comercios-" + normalizeName(catTitle);
}



// Util para ordenar "HH:mm"
function toMin(hhmm) { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; }

// Renderizador
function montarPaginaColetaLixo() {
  // métricas (ok se falhar)
  try {
    const hoje = getHojeBR();
    const ref = firebase.database().ref(`cliquesPorBotao/${hoje}/coletaDeLixo/abrir`);
    ref.transaction(v => (v || 0) + 1);
  } catch (e) { console.warn("Métrica coleta:", e); }

  // dia atual
  const dias = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"];
  const hojeKey = dias[new Date().getDay()];

  // UI
  const html = `
  <h2 class="highlighted">🧹 Coleta de Lixo</h2>
  <div class="coleta-wrap">

    <div class="coleta-header">
      <!-- Toolbar de filtros (visual + intuitiva) -->
      <div class="coleta-toolbar" role="region" aria-label="Filtros da coleta">

        <div class="coleta-field">
           <label for="buscaBairro" class="coleta-label">Bairro</label>
          <div class="coleta-input-wrap">
            <span class="input-icon"><i class="fa-solid fa-magnifying-glass"></i></span>
            <input id="buscaBairro" type="text" placeholder="Ex.: Vista Alegre" autocomplete="off" inputmode="search" />
            <button type="button" id="coletaClear" class="clear-btn" aria-label="Limpar busca">&times;</button>
          </div>
        </div>

        <div class="coleta-field">
          <label for="seletorDia" class="coleta-label">Dia</label>
          <select id="seletorDia">
            <option value="seg">Segunda</option>
            <option value="ter">Terça</option>
            <option value="qua">Quarta</option>
            <option value="qui">Quinta</option>
            <option value="sex">Sexta</option>
            <option value="sab">Sábado</option>
           
          </select>
        </div>

      </div><!-- /.coleta-toolbar -->

      <!-- Aviso: horários aproximados (bem chamativo) -->
      <div class="coleta-aten" role="alert">
        <i class="fa-solid fa-triangle-exclamation"></i>
        <span><strong>Atenção!</strong> Os horários são aproximados — use como referência.</span>
      </div>

      <!-- (Opcional) seu aviso de atualização existente -->
      <div class="coleta-alert">Estamos em atualização. <br>Em breve horários corretos ✅</div>
    </div><!-- /.coleta-header -->

    <!-- >>> ESTE CONTAINER É OBRIGATÓRIO PARA OS CARDS APARECEREM <<< -->
    <div id="coletaGrid" class="coleta-grid"></div>

  </div><!-- /.coleta-wrap -->
`;

  document.querySelector(".content_area").innerHTML = html;

  // Botão "X" para limpar e manter o render funcionando
  const _busca = document.getElementById("buscaBairro");
  const _clear = document.getElementById("coletaClear");
  if (_clear && _busca) {
    _clear.addEventListener("click", () => {
      _busca.value = "";
      _busca.dispatchEvent(new Event("input"));
      _busca.focus();
    });
  }


  // Atualiza destaque "agora" a cada 60s respeitando o dia escolhido e o filtro de texto
  setInterval(() => {
    const seletor = document.getElementById("seletorDia");
    const dia = seletor.value;
    const base = (COLETA_LIXO[dia] && COLETA_LIXO[dia].length) ? COLETA_LIXO[dia] : COLETA_LIXO.geral;

    const txt = (document.getElementById("buscaBairro").value || "").trim().toLowerCase();
    const norm = s => String(s || "")
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // acento-insensível

    const txtNorm = norm(txt);

    const dados = txt
      ? base
        .map(item => {
          // equipes podem vir em chaves diferentes
          const eqRaw = item.Equipe ?? item.equipe ?? item.caminhao ?? item.caminhoes;
          const eqArr = Array.isArray(eqRaw) ? eqRaw : (eqRaw != null ? [eqRaw] : []);

          const matchEquipe = eqArr.some(v => norm(v).includes(txtNorm));
          const bairrosOrig = Array.isArray(item.bairros) ? item.bairros : [];
          const bairrosFiltr = bairrosOrig.filter(b => norm(b).includes(txtNorm));

          // Se bateu por bairro, mantém só os bairros filtrados;
          // Se bateu pela equipe, mantém todos os bairros (pra não “sumir” o contexto).
          if (bairrosFiltr.length || matchEquipe) {
            return { ...item, bairros: bairrosFiltr.length ? bairrosFiltr : bairrosOrig };
          }
          return null;
        })
        .filter(Boolean)
      : base;


    desenhar(dados, dia);
  }, 300);


  // helpers p/ rótulos/cores
  const norm = t => (t || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  function tipoCard(bloco) {
    const txt = bloco.bairros.map(norm).join(" | ");
    if (txt.includes("usina")) return "apoio";   // "Descarrega na Usina"
    if (txt.includes("garagem")) return "garagem"; // "Saída da garagem"
    return "";
  }
  // Filtra mantendo equipes (acento-insensível)
  function filtraDados(base, texto) {
    const norm = s => String(s || "")
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // remove acentos

    const txtNorm = norm(texto || "");

    if (!txtNorm) return base;

    return base
      .map(item => {
        // equipes podem vir em várias chaves
        const eqRaw = item.Equipe ?? item.equipe ?? item.caminhao ?? item.caminhoes;
        const eqArr = Array.isArray(eqRaw) ? eqRaw : (eqRaw != null ? [eqRaw] : []);

        const matchEquipe = eqArr.some(v => norm(v).includes(txtNorm));
        const bairrosOrig = Array.isArray(item.bairros) ? item.bairros : [];
        const bairrosFiltr = bairrosOrig.filter(b => norm(b).includes(txtNorm));

        // Bateu por bairro → devolve só os bairros filtrados
        // Bateu por equipe → devolve todos os bairros
        if (bairrosFiltr.length || matchEquipe) {
          return { ...item, bairros: bairrosFiltr.length ? bairrosFiltr : bairrosOrig };
        }
        return null;
      })
      .filter(Boolean);
  }



  function desenhar(dados, diaUsado) {
    const grid = document.getElementById("coletaGrid");
    if (!grid) return;
    grid.innerHTML = "";

    // --- ordena por horário (HH:MM)
    const ordenado = [...dados].sort((a, b) => {
      const [h1, m1] = String(a.hora || "00:00").split(":").map(Number);
      const [h2, m2] = String(b.hora || "00:00").split(":").map(Number);
      return (h1 * 60 + m1) - (h2 * 60 + m2);
    });

    // --- índice do "agora" somente se diaUsado == hoje
    const dias = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"];
    const hojeKey = dias[new Date().getDay()];
    let ativoIdx = -1;
    if (diaUsado === hojeKey) {
      const now = new Date();
      const minutos = now.getHours() * 60 + now.getMinutes();
      ativoIdx = ordenado.findIndex(b => {
        const [h, m] = String(b.hora || "00:00").split(":").map(Number);
        return (h * 60 + m) >= minutos;
      });
    }

    // --- util p/ normalizar texto
    const norm = s => String(s || "")
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    // --- vai ficar lado a lado: esquerda (Leonel) | direita (Bruno)
    const leftCards = []; // Leonel / sem equipe
    const rightCards = []; // Bruno

    function buildCard(bloco, idx, extraColClass) {
      const classeTipo = (typeof tipoCard === "function") ? tipoCard(bloco) : ""; // "", "apoio", "garagem"
      const classeAgora = (idx === ativoIdx) ? "agora" : "";
      const badgeDia = diaUsado ? `<span class="badge-dia">${diaUsado.toUpperCase()}</span>` : "";

      // chips de bairros
      const chipsBairros = (bloco.bairros || []).map(b => `<span class="bairro-chip">${b}</span>`).join("");

      // equipe pode vir em chaves diferentes
      const eqRaw = bloco.Equipe ?? bloco.equipe ?? bloco.caminhao ?? bloco.caminhoes;
      const eqArr = Array.isArray(eqRaw) ? eqRaw : (eqRaw != null ? [eqRaw] : []);

      const chipsEquipe = eqArr.map(val => {
        const label = String(val).trim();
        const texto = /^equipe/i.test(label) ? label : (isNaN(label) ? `Equipe ${label}` : `Equipe ${val}`);
        const n = norm(texto);
        let extra = "";
        if (n.includes("bruno")) {
          extra = "eq-bruno";
        } else if (n.includes("leonel") || n.includes("leonil") || n.includes("lionil")) {
          extra = "eq-leonil";
        }

        return `<span class="truck-chip ${extra}">${texto}</span>`;
      }).join("");

      // detecção da equipe
      const hasBruno = eqArr.some(v => norm(v).includes("bruno"));
      const hasLeonel = eqArr.some(v => {
        const n = norm(v);
        return n.includes("leonel") || n.includes("leonil") || n.includes("lionil");
      });

      // classes de borda já usadas no seu CSS
      const equipeClass = (hasBruno ? "eq-bruno-card " : "") + (hasLeonel ? "eq-leonel-card " : "");

      return `
      <div class="coleta-card ${extraColClass} ${classeTipo} ${classeAgora} ${equipeClass}">
        <div class="coleta-hora">${bloco.hora || ""}${badgeDia}</div>
        <div class="coleta-meta">${chipsBairros}</div>
        <div class="coleta-meta">${chipsEquipe}</div>
      </div>
    `;
    }

    // --- separa por equipe
    ordenado.forEach((bloco, idx) => {
      const eqRaw = bloco.Equipe ?? bloco.equipe ?? bloco.caminhao ?? bloco.caminhoes;
      const eqArr = Array.isArray(eqRaw) ? eqRaw : (eqRaw != null ? [eqRaw] : []);
      const hasBruno = eqArr.some(v => norm(v).includes("bruno"));
      const hasLeonel = eqArr.some(v => {
        const n = norm(v);
        return n.includes("leonel") || n.includes("leonil") || n.includes("lionil");
      });

      if (hasLeonel) leftCards.push(buildCard(bloco, idx, "col-left"));
      if (hasBruno) rightCards.push(buildCard(bloco, idx, "col-right"));

      // sem equipe → vai para a esquerda
      if (!hasBruno && !hasLeonel) leftCards.push(buildCard(bloco, idx, "col-left"));
    });

    // --- marca o grid para 2 colunas no desktop
    grid.classList.add("colunas-por-equipe");

    // --- intercala: [esq1][dir1][esq2][dir2] ... (garante lado a lado linha a linha)
    let html = "";
    const max = Math.max(leftCards.length, rightCards.length);
    for (let i = 0; i < max; i++) {
      if (leftCards[i]) html += leftCards[i];
      if (rightCards[i]) html += rightCards[i];
    }
    grid.innerHTML = html;
  }


  // seleciona HOJE por padrão (se não houver, cai para "geral")
  const seletor = document.getElementById("seletorDia");
  const temHoje = COLETA_LIXO[hojeKey] && COLETA_LIXO[hojeKey].length;
  seletor.value = temHoje ? hojeKey : "geral";
  desenhar(temHoje ? COLETA_LIXO[hojeKey] : COLETA_LIXO.geral, seletor.value);

  // trocar dia
  seletor.addEventListener("change", (e) => {
    const dia = e.target.value;
    const base = (COLETA_LIXO[dia] && COLETA_LIXO[dia].length) ? COLETA_LIXO[dia] : COLETA_LIXO.geral;
    desenhar(base, dia);
  });

  // busca por bairro
  document.getElementById("buscaBairro").addEventListener("input", (e) => {
    const txt = e.target.value.trim().toLowerCase();
    const dia = seletor.value;
    const base = (COLETA_LIXO[dia] && COLETA_LIXO[dia].length) ? COLETA_LIXO[dia] : COLETA_LIXO.geral;
    const filtrado = base.map(item => ({
      hora: item.hora,
      bairros: item.bairros.filter(b => b.toLowerCase().includes(txt))
    })).filter(item => item.bairros.length);
    desenhar(filtrado, dia);
  });
}


















// Listener do menu (segue seu padrão)
document.addEventListener("DOMContentLoaded", () => {
  const menuColeta = document.getElementById("menuColetaLixo");
  if (menuColeta) {
    menuColeta.addEventListener("click", (e) => {
      e.preventDefault();
      location.hash = "coletalixo";     // ✅ define o hash
      montarPaginaColetaLixo();         // abre a página
      // fecha a sidebar no mobile
      const sidebar = document.querySelector(".sidebar");
      const overlay = document.querySelector("#overlay");
      if (sidebar && overlay) { sidebar.classList.remove("open"); overlay.classList.remove("active"); }
    });
  }
});

document.addEventListener("click", (e) => {
  const a = e.target.closest('a[href="#coletalixo"], a[href="#menuColetaLixo"], a[href="#menucoletralixo"]');
  if (!a) return;
  e.preventDefault();
  location.hash = "coletalixo";
  montarPaginaColetaLixo();
});


