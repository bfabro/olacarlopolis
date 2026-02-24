
//



// ===== LOGIN ADMIN (único) =====// ===== LOGIN ADMIN (Firebase Auth + Perfil no RTDB) =====
document.addEventListener("DOMContentLoaded", () => {
  const formLogin = document.getElementById("formLogin");
  if (!formLogin) return;

  formLogin.addEventListener("submit", async (e) => {
    e.preventDefault();

    const emailDigitado = document.getElementById("usuario").value.trim().toLowerCase();
    const senhaDigitada = document.getElementById("senha").value.trim();

    try {
      // 1) Login pelo Firebase Auth
      const cred = await firebase.auth().signInWithEmailAndPassword(emailDigitado, senhaDigitada);
      const user = cred.user;

      // 2) Carrega perfil/permissões do RTDB
      // Opção preferida: usuariosByUid/{uid}
      let perfilSnap = await firebase.database().ref(`usuariosByUid/${user.uid}`).once("value");
      let perfil = perfilSnap.val();

      // Compat com seu formato antigo: usuarios/{email_sem_ponto}
      if (!perfil) {
        const userId = emailDigitado.replace(/\./g, "_");
        perfilSnap = await firebase.database().ref(`usuarios/${userId}`).once("value");
        perfil = perfilSnap.val();
      }

      if (!perfil) {
        alert("Seu usuário existe no Auth, mas não tem perfil/permissões no banco.");
        return;
      }

      // 3) Normaliza dados do usuário logado (o painel usa role/permissoes/email)
      const usuarioLogado = {
        uid: user.uid,
        email: user.email,
        role: perfil.role || "cliente",
        permissoes: perfil.permissoes || {}
      };

      // 4) Fecha modal e monta painel
      document.getElementById("modalLogin").classList.add("hidden");
      montarPainelAdmin(usuarioLogado);

    } catch (err) {
      console.error(err);
      alert("E-mail ou senha inválidos (Auth).");
    }
  });
});




// 2. Função que REALMENTE mostra as opções na tela
function mostrarOpcoesCadastro(usuario) {
  const pageAdmin = document.getElementById("page-admin");
  const adminSuperPanel = document.getElementById("admin-super-panel");
  const adminContent = document.getElementById("admin-content");

  // Se o cargo no Firebase for 'superadmin', liberamos a tela de cadastro
  if (usuario.role === "superadmin") {
    if (pageAdmin) pageAdmin.style.display = "block"; // Mostra a seção principal
    if (adminContent) adminContent.style.display = "block"; // Mostra o conteúdo
    if (adminSuperPanel) {
      adminSuperPanel.style.display = "block"; // ESTA É A TELA DE OPÇÕES (CADASTRO)
      console.log("Opções de cadastro liberadas para:", usuario.email);
    }
  } else {
    // Lógica para cliente comum (se houver)
    alert("Você não tem permissão de Super Admin.");
  }
}









// Certifique-se de que esta função está solta no script.js
function liberarPainelPorNivel(usuario) {
  const pageAdmin = document.getElementById("page-admin");
  const adminSuperPanel = document.getElementById("admin-super-panel");

  if (pageAdmin) pageAdmin.style.display = "block";

  if (usuario.role === "superadmin") {
    if (adminSuperPanel) adminSuperPanel.style.display = "block";
  }
}


// Função para você cadastrar clientes no seu painel
document.getElementById("form-config-cliente")?.addEventListener("submit", (e) => {
  e.preventDefault();
  const email = document.getElementById("novo-cliente-email").value;
  const senha = document.getElementById("novo-cliente-senha").value;
  const checkboxes = e.target.querySelectorAll('input[type="checkbox"]');

  let permissoes = {};
  checkboxes.forEach(cb => {
    permissoes[cb.value] = cb.checked;
  });

  const userPath = email.replace(/\./g, '_'); // Firebase não aceita pontos na chave

  firebase.database().ref('usuarios/' + userPath).set({
    email: email,
    senha: senha,
    role: "cliente",
    permissoes: permissoes
  }).then(() => alert("Cliente cadastrado com sucesso!"));
});
// Função para SALVAR um novo cliente e suas permissões no Firebase
document.getElementById("form-permissoes-cliente")?.addEventListener("submit", function (e) {
  e.preventDefault();

  const emailCliente = document.getElementById("cliente-id").value.trim();
  const senhaCliente = document.getElementById("senha-provisoria").value.trim();

  // Captura quais checkboxes foram marcados
  const permissoes = {};
  document.querySelectorAll('input[name="func"]').forEach(checkbox => {
    permissoes[checkbox.value] = checkbox.checked;
  });

  const dadosNovoCliente = {
    email: emailCliente,
    senha: senhaCliente,
    role: "cliente",
    permissoes: permissoes
  };

  // Gera um ID limpo para o Firebase (substituindo pontos por underscores)
  const userId = emailCliente.replace(/\./g, '_');

  firebase.database().ref('usuarios/' + userId).set(dadosNovoCliente)
    .then(() => {
      alert("Cliente " + emailCliente + " configurado com sucesso no Firebase!");
      this.reset();
    })
    .catch(error => alert("Erro ao salvar: " + error.message));
});



// Função para abrir o painel que você usará para configurar clientes
function mostrarPainelSuperAdmin(dados) {
  const pageAdmin = document.getElementById("page-admin");
  const superPanel = document.getElementById("admin-super-panel");

  if (pageAdmin) pageAdmin.style.display = "block";
  if (superPanel) superPanel.style.display = "block";

  console.log("Modo Super Admin: Você pode configurar novos clientes agora.");
}

// Função para o cliente logar e ver apenas o que você liberou
function mostrarPainelCliente(dados) {
  const pageAdmin = document.getElementById("page-admin");
  const adminContent = document.getElementById("admin-content");

  if (pageAdmin) pageAdmin.style.display = "block";
  if (adminContent) adminContent.style.display = "block";

  // Aqui usamos as permissões vindas do Firebase para esconder/mostrar botões
  console.log("Permissões do cliente:", dados.permissoes);
  // Exemplo: if (!dados.permissoes.veiculos) document.getElementById('btn-veiculos').remove();
}



// Função para simular o salvamento das permissões
document.getElementById("form-permissoes-cliente")?.addEventListener("submit", (e) => {
  e.preventDefault();

  const emailCliente = document.getElementById("cliente-id").value;
  const senhaProvisoria = document.getElementById("senha-provisoria").value;

  // Captura as permissões marcadas nos checkboxes
  const permissoes = {};
  document.querySelectorAll('input[name="func"]').forEach(cb => {
    permissoes[cb.value] = cb.checked;
  });

  const novoUsuario = {
    email: emailCliente,
    senha: senhaProvisoria,
    role: "cliente",
    permissoes: permissoes
  };

  // Salva no Firebase (substituindo pontos por underscores no email para usar como ID)
  const userId = emailCliente.replace(/\./g, '_');
  firebase.database().ref('usuarios/' + userId).set(novoUsuario)
    .then(() => {
      alert("Cliente cadastrado e permissões salvas no Firebase!");
      e.target.reset();
    })
    .catch(err => alert("Erro ao salvar: " + err));
});
//
//


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






























async function gerarImagemCardImovel(imovel, categoriaAtual) {
  try {
    const corDestaque = "#0095f6";
    const logoSiteUrl = window.location.origin + "/images/img_padrao_site/logo_1.png";

    const titulo = (imovel.titulo || "IMÓVEL DISPONÍVEL").toUpperCase();
    const endereco = imovel.endereco || "Consulte localização";
    const preco = imovel.valor ? imovel.valor.toLocaleString('pt-br', { style: 'currency', currency: 'BRL' }) : "Consulte";
    const descricao = imovel.descricao || "";

    // 1. TRATAMENTO DE IMAGENS (Grade Inteligente)
    const imagensRaw = imovel.imagens || [];
    const fotos = imagensRaw.slice(0, 4).map(url => {
      if (!url.startsWith('http')) return window.location.origin + '/' + url.replace(/^\//, '');
      return url;
    });
    const totalFotos = fotos.length;

    // 2. LISTA COMPLETA DE ATRIBUTOS (CONFORME SOLICITADO)
    const attrs = [];
    if (imovel.quartos) attrs.push({ l: `${imovel.quartos} Quartos`, i: "🛏️" });
    if (imovel.suite) attrs.push({ l: `${imovel.suite} Suíte`, i: "🚿" });
    if (imovel.banheiros) attrs.push({ l: `${imovel.banheiros} Banheiro`, i: "🚽" });
    if (imovel.vagas) attrs.push({ l: `${imovel.vagas} Vagas`, i: "🚗" });
    if (imovel.salas) attrs.push({ l: `${imovel.salas} Salas`, i: "🛋️" });
    if (imovel.cozinhas) attrs.push({ l: `${imovel.cozinhas} Cozinha`, i: "🍳" });
    if (imovel.area) attrs.push({ l: `${imovel.area}m² Área`, i: "📐" });
    if (imovel.construcao) attrs.push({ l: `${imovel.construcao}m² Constr.`, i: "🏗️" });
    if (imovel.piscina === true || imovel.piscina === "Sim") attrs.push({ l: `Piscina`, i: "🏊" });
    if (imovel.churrasqueira === true || imovel.churrasqueira === "Sim") attrs.push({ l: `Churrasqueira`, i: "🔥" });
    if (imovel.quintal && imovel.quintal !== "Não") attrs.push({ l: `Quintal`, i: "🌳" });

    const atributosHTML = attrs.map(a => `
      <div style="background: #f8f9fa; padding: 10px 15px; border-radius: 12px; display: flex; align-items: center; gap: 8px; border: 1px solid #eee;">
         <span style="font-size: 40px;">${a.i}</span>
         <span style="font-size: 26px; font-weight: 700; color: #333;">${a.l}</span>
      </div>
    `).join('');

    const host = document.createElement("div");
    host.style.cssText = "position: fixed; left: -9999px; top: 0; width: 1080px; height: 1920px; background: white;";
    document.body.appendChild(host);

    host.innerHTML = `
      <div id="captureArea" style="width: 1080px; height: 1920px; display: flex; flex-direction: column; background: #ffffff; font-family: 'Poppins', Arial, sans-serif;">
        
        <div style="padding: 50px 60px 20px; display: flex; justify-content: space-between; align-items: center;">
          <div style="flex: 1;">
            <h1 style="margin: 0; font-size: 42px; color: #1a1a1a; font-weight: 900; line-height: 1.1;">${titulo}</h1>
            <div style="display: flex; align-items: center; gap: 10px; margin-top: 10px;">
                <div style="background: ${corDestaque}; height: 6px; width: 50px; border-radius: 3px;"></div>
                <span style="font-size: 22px; color: ${corDestaque}; font-weight: 800; text-transform: uppercase;">${categoriaAtual || "Imóveis"}</span>
            </div>
          </div>
          <img src="${logoSiteUrl}" style="height: 110px; width: auto; object-fit: contain;">
        </div>

        <div style="width: 1080px; height: 780px; padding: 0 60px; box-sizing: border-box; display: grid; 
             grid-template-columns: ${totalFotos === 1 ? '1fr' : '1fr 1fr'}; 
             grid-template-rows: ${totalFotos <= 2 ? '1fr' : '1fr 1fr'}; gap: 15px;">
          ${totalFotos === 3 ? `
            <div style="grid-column: span 2; background: url('${fotos[0]}') center/cover; border-radius: 20px;"></div>
            <div style="background: url('${fotos[1]}') center/cover; border-radius: 20px;"></div>
            <div style="background: url('${fotos[2]}') center/cover; border-radius: 20px;"></div>
          ` : fotos.map(f => `<div style="background: url('${f}') center/cover; border-radius: 20px;"></div>`).join('')}
        </div>

        <div style="flex: 1; padding: 30px 60px; display: flex; flex-direction: column; gap: 25px;">
          
          <div style="background: #fff; border-left: 8px solid ${corDestaque}; padding: 10px 20px;">
            <p style="font-size: 38px; color: #444; margin: 0; line-height: 1.4; font-style: italic;">
              "${descricao.length > 180 ? descricao.substring(0, 180) + '...' : descricao}"
            </p>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px;">
            ${atributosHTML}
          </div>

          <div style="margin-top: auto; background: #1a1a1aff; padding: 40px; border-radius: 30px; color: white; position: relative; overflow: hidden;">
            <div style="position: absolute; right: -20px; top: -18px; font-size: 150px; opacity: 0.1; color: white;">💰</div>
            <span style="font-size: 26px; color: ${corDestaque}; font-weight: 800; text-transform: uppercase; letter-spacing: 2px;">Valor do Investimento</span>
            <div style="font-size: 42px; font-weight: 900; margin: 5px 0;">${preco}</div>
            <div style="font-size: 26px; color: #ccc; display: flex; align-items: center; gap: 10px;">
                <span>📍</span> ${endereco}
            </div>
          </div>

          <div style="text-align: center; padding: 0px 0 0px;">
            <div style="font-size: 40px; font-weight: 800; color: #999; margin-bottom: 5px;">PARA MAIS INFORMAÇÕES ACESSE:</div>
            <div style="font-size: 30px; font-weight: 900; margin-top:25px;color: #1a1a1a; letter-spacing: 2px;">olacarlopolis.com</div>
          </div>

        </div>
      </div>
    `;

    // AGUARDAR CARREGAMENTO
    const imgs = host.querySelectorAll('img');
    await Promise.all(Array.from(imgs).map(img => {
      if (img.complete) return Promise.resolve();
      return new Promise(resolve => { img.onload = resolve; img.onerror = resolve; });
    }));
    await new Promise(r => setTimeout(r, 1200));

    const canvas = await html2canvas(document.querySelector("#captureArea"), {
      scale: 2, useCORS: true, allowTaint: true, backgroundColor: "#ffffff"
    });

    const link = document.createElement("a");
    link.download = `card-imovel-${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    host.remove();

  } catch (err) {
    console.error("Erro:", err);
  }
}





















async function gerarImagemCardEstabelecimento(establishment, categoriaAtual, slugId) {
  try {
    const nomeRaw = (establishment.name ?? establishment.nome ?? establishment.title ?? "");
    const nomeLimpo = String(nomeRaw)
      .replace(/<[^>]*>/g, "")
      .replace(/\s+/g, " ")
      .trim();
    const nome = (nomeLimpo || "Estabelecimento").toUpperCase();


    const logoSiteUrl = window.location.origin + "/images/img_padrao_site/logo_1.png";

    // --- COLETA DE DADOS ---
    const telefone = getPrimeiroContato(establishment.contact || establishment.whatsapp || establishment.telefone || "");
    const endereco = establishment.address || establishment.endereco || "";
    const descricoes = establishment.novidadesDescriptions || [];
    const legendaGourmet = descricoes.length > 0 ? descricoes[0] : "";

    // --- LÓGICA DE HORÁRIO ---
    let horarioRaw = establishment.hours || establishment.horario || "";
    if (typeof horarioRaw === "object") horarioRaw = "Consulte no site";

    let horarioProcessado = horarioRaw
      .replace(/<br\s*\/?>/gi, "|")
      .replace(/;/g, "|")
      .replace(/<[^>]+>/g, "")
      .split("|")
      .map(item => item.trim())
      .filter(item => item !== "");

    let horarioHtmlFinal = horarioProcessado
      .map(linha => `<div style="margin-bottom: 5px; line-height: 1.2;">${linha}</div>`)
      .join("");

    const imagens = establishment.novidadesImages || establishment.divulgacaoImages || [];
    let fotoUrl = establishment.image || establishment.logo || (imagens.length ? imagens[0] : "");
    const fotoFinal = fotoUrl.trim() ? fotoUrl : logoSiteUrl;

    const host = document.createElement("div");
    host.id = "insta-card-host";
    host.style.cssText = "position: fixed; left: -9999px; top: 0; width: 1080px; height: 1920px; z-index: 99999;";

    host.innerHTML = `
      <div id="instaCard" style="
        width: 1080px; height: 1920px; position: relative;
        background: #FFFFFF; font-family: 'Poppins', sans-serif;
        display: flex; flex-direction: column; overflow: hidden;
      ">
        
        <div style="padding: 70px 60px 30px; display: flex; align-items: center; justify-content: space-between; height: 190px; box-sizing: border-box;">
  <div style="flex: 1; padding-right: 10px; min-width: 0;">
    <h2 style="
  margin: 0px;
  font-size: 48px;
  font-weight: 900;
  color: #1a1a1a;
  line-height: 1;
  letter-spacing: 0px;
  white-space: nowrap;
">
  Estamos no <span style="color:#0095f6;">olacarlopolis.com</span>
</h2>


    <div style="margin-top: 5px;">
      <span style="display:inline-block; width: 210px; height: 6px; background: #0095f6; border-radius: 10px;"></span>
    </div>
  </div>

  <div style="width: 260px; height: 150px; background: url('${logoSiteUrl}') no-repeat center right; background-size: contain; flex-shrink: 0;"></div>
</div>


        <div style="width: 1080px; height: 900px; padding: 0 60px;">
          <div style="
            width: 100%; height: 100%; border-radius: 40px; 
            background: #fcfcfc url('${fotoFinal}') center/contain no-repeat;
            box-shadow: 0 20px 40px rgba(0,0,0,0.08);
            border: 1px solid #f0f0f0;
          "></div>
        </div>



        <div style="padding: 30px 80px 12px; display: flex; justify-content: center;">
  <div style="text-align: center; max-width: 900px;">

   

    <!-- Nome do comércio -->
    <h1 style="
      margin: 0;
      font-size: 58px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: -1px;
      line-height: 1.15;
      color: #1a1a1a;
      text-align: center;
      word-break: break-word;

      /* Efeito 3D elegante */
         text-shadow:
                0 2px 0 #e6e6e6,
                0 5px 0 #dcdcdc,
                0 12px 22px rgba(0,0,0,0.18);
    ">
      ${nome}
    </h1>

  </div>
</div>









     

        <div style="flex: 1; padding: 30px 80px; display: flex; flex-direction: column; gap: 30px;">
          
          ${legendaGourmet ? `
            <div style="margin-bottom: 5px; position: relative; padding-left: 30px;">
              <span style="position: absolute; left: -20px; top: -12px; font-size: 100px; color: #0095f6; opacity: 0.2; font-family: serif;">“   </span>
              <p style="font-size: 32px; font-weight: 600; color: #6c6c6cff; margin: 0; line-height: 1.3; font-style: italic;">
                ${legendaGourmet}
              </p>
            </div>
          ` : ""}

          <div style="display: flex; flex-direction: column; gap: 25px;">
            ${horarioHtmlFinal ? `
              <div style="display: flex; align-items: flex-start; gap: 20px; padding: 15px 25px; background: #f9f9f9; border-radius: 20px;">
                <span style="font-size: 40px; margin-top: 5px;">🕒</span>
                <div>
                  <small style="display: block; font-size: 26px; color: #bbb; text-transform: uppercase; font-weight: 800; letter-spacing: 1px; margin-bottom: 8px;">Horário de Funcionamento</small>
                  <div style="font-size: 36px; color: #444; font-weight: 600; line-height: 1.4;">
                    ${horarioHtmlFinal}
                  </div>
                </div>
              </div>
            ` : ""}

            ${endereco ? `
              <div style="display: flex; align-items: flex-start; gap: 20px; padding: 15px 25px; background: #f9f9f9; border-radius: 20px;">
                <span style="font-size: 35px;">📍</span>
                <div>
                  <small style="display: block; font-size: 22px; color: #aaa; text-transform: uppercase; font-weight: 800;">Localização</small>
                  <p style="font-size: 32px; color: #444; margin: 0; line-height: 1.3; font-weight: 500;">${endereco}</p>
                </div>
              </div>
            ` : ""}

            <div style="background: #e9f7ef; border-radius: 30px; padding: 25px 40px; display: flex; justify-content: space-between; align-items: center; border: 1px solid #d4f0de;">
              <div>
                <small style="display: block; font-size: 22px; color: #2ecc71; text-transform: uppercase; font-weight: 800;">WhatsApp / Contato</small>
                <p style="font-size: 38px; margin: 5px 0 0 0; color: #1ebea5; font-weight: 900; letter-spacing: -1px;">${telefone || 'Ver no site'}</p>
              </div>
            </div>
          </div>

          <div style="margin-top: auto; padding-bottom: 30px;">
            <div style="margin-top: 25px;width: 100%; height: 2px; background: linear-gradient(to right, transparent, #eee, transparent); margin-bottom: 25px;"></div>
            
          </div>

        </div>
      </div>
    `;

    document.body.appendChild(host);
    await new Promise(resolve => setTimeout(resolve, 1000));

    const canvas = await html2canvas(document.querySelector("#instaCard"), {
      scale: 1,
      useCORS: true,
      backgroundColor: "#FFFFFF"
    });

    const link = document.createElement('a');
    link.download = `card-${nome.toLowerCase().replace(/\s+/g, '-')}.png`;
    link.href = canvas.toDataURL('image/png', 1.0);
    link.click();
    host.remove();
  } catch (err) {
    console.error("Erro ao gerar card:", err);
    if (document.getElementById("insta-card-host")) document.getElementById("insta-card-host").remove();
  }
}



























// === INJETAR BOTÃO DE GERAR CARD DENTRO DA ABA INFO ===
function injetarBotaoGerarCard(establishment, containerInfo) {
  if (!containerInfo) return;

  const estId = establishment.nomeNormalizado || normalizeName(establishment.name || "");

  const box = document.createElement("div");
  box.className = "info-box";

  box.innerHTML = `
        <button class="btn-gerar-card"
                data-estab-id="${estId}">
            <i class="fa-solid fa-image"></i> Gerar card para divulgação
        </button>
    `;

  containerInfo.appendChild(box);
}




// Responsável do imóvel mesmo sem "corretor" explícito
function getResponsavelImovel(im) {
  // Se já houver util oficial, prioriza
  if (typeof getCorretorPrincipal === "function") {
    const c = getCorretorPrincipal(im);
    if (c) return c;
  }
  // Fallbacks comuns de dados
  return (
    im.proprietario ||
    im.dono ||
    (Array.isArray(im.corretores) && im.corretores.length ? im.corretores[0] : "") ||
    im.corretor ||
    "Proprietário não informado"
  );
}


function getHojeBR() {
  const agora = new Date();
  agora.setHours(agora.getHours() - 3); // UTC-3 (Brasília)
  return agora.toISOString().slice(0, 10);
}

// Função para registrar clique no Firebase (contador + detalhado)
function registrarCliqueBotao(tipo, idEstabelecimento, area = "botoes") {
  const hoje = getHojeBR();
  const db = firebase.database();

  const refContador = db.ref(`cliquesPorBotao/${hoje}/${idEstabelecimento}/${tipo}`);
  const refLog = db.ref(`cliquesPorBotaoDetalhado/${hoje}/${idEstabelecimento}`).push();

  const agora = new Date();
  const payload = {
    area,
    tipo,
    horario: agora.toLocaleTimeString("pt-BR"),
    dataHoraISO: agora.toISOString(),
    ts: firebase.database.ServerValue.TIMESTAMP,
    pagina: window.location.href
  };

  return new Promise((resolve) => {
    refContador.transaction(
      (atual) => (atual || 0) + 1,
      async (erro) => {
        if (erro) {
          console.error("[CliqueBotao] Erro no contador:", erro);
          resolve({ ok: false, erroContador: true });
          return;
        }
        try {
          await refLog.set(payload);
          resolve({ ok: true });
        } catch (e) {
          console.error("[CliqueBotao] Erro ao salvar detalhado:", e);
          resolve({ ok: true, logFalhou: true });
        }
      }
    );
  });
}
window.registrarCliqueBotao = registrarCliqueBotao;



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

// === Capivarinha: helpers para ranking ==
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

/////////////////////////////////
////////////////////////////////

// ====== Página: Represa de Chavantes ======
function classificarComparacao(atual, referencia) {
  const a = Number(atual), r = Number(referencia);
  if (Number.isFinite(a) && Number.isFinite(r)) {
    if (a > r) return "high";
    if (a < r) return "low";
  }
  return "equal";
}

// Ajuste aqui se seus campos tiverem outros nomes/origem:
async function carregarDadosRepresa() {
  // TODO: substitua por seu fetch real (ONS/Vercel/etc.)
  // Estrutura sugerida:
  // { ultimaAtualizacaoISO, sobre, cotaAtual_m, cotaRef_m, volumeAtual_pct, volumeRef_pct }
  return {
    ultimaAtualizacaoISO: new Date().toISOString(),
    sobre: "Reservatório de Chavantes – dados diários do ONS.",
    cotaAtual_m: window.nivelChavantes?.cota ?? 474.32,    // se já existir algo global, usa
    cotaRef_m: 474.00,
    volumeAtual_pct: window.nivelChavantes?.volume ?? 58.7,
    volumeRef_pct: 60.0
  };
}

function formatarDataBR(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch (_) { return "—"; }
}

async function mostrarRepresa() {
  location.hash = "#represa-chavantes"; // âncora amigável

  const area = document.querySelector(".content_area");
  if (!area) return;

  // carrega dados (troque pelo seu fetch real)
  const dados = await carregarDadosRepresa();

  const statusCota = classificarComparacao(dados.cotaAtual_m, dados.cotaRef_m);
  const statusVol = classificarComparacao(dados.volumeAtual_pct, dados.volumeRef_pct);

  // --- Comparação direta: Nível de Referência x Cota Atual ---
  const nivelRef = Number(dados.cotaRef_m ?? 0);
  const cotaAtual = Number(dados.cotaAtual_m ?? 0);
  const statusComparativo = classificarComparacao(cotaAtual, nivelRef);
  const badgeComp = statusComparativo === "high" ? "high" : (statusComparativo === "low" ? "low" : "equal");
  const cardClasseComp = statusComparativo === "high" ? "status-high" : (statusComparativo === "low" ? "status-low" : "");
  const diffAbs = (Number.isFinite(cotaAtual) && Number.isFinite(nivelRef)) ? (cotaAtual - nivelRef) : 0;
  const diffPct = (Number.isFinite(nivelRef) && nivelRef !== 0) ? (diffAbs / nivelRef) * 100 : 0;



  const badgeCota = statusCota === "high" ? "high" : (statusCota === "low" ? "low" : "equal");
  const badgeVol = statusVol === "high" ? "high" : (statusVol === "low" ? "low" : "equal");

  const cardClasseCota = statusCota === "high" ? "status-high" : (statusCota === "low" ? "status-low" : "");
  const cardClasseVol = statusVol === "high" ? "status-high" : (statusVol === "low" ? "status-low" : "");

  const ultima = formatarDataBR(dados.ultimaAtualizacaoISO);

  area.innerHTML = `
    <div class="represa-wrap">
      <div class="represa-header">
        <h2>💧 Represa de Chavantes</h2>
        <div class="sub">Fonte: ONS • Atualização diária</div>
      </div>

      <div class="represa-grid">

        <!-- Card: Cota (nível) com comparação -->
        <div class="represa-card ${cardClasseCota}">
          <div class="card-meta">
            <div class="meta-row"><b>Última Atualização:</b> ${ultima}</div>
            <div class="meta-row"><b>Sobre a Represa:</b> ${dados.sobre}</div>
          </div>
          <div class="card-body">
            <div class="represa-label">Cota (nível)</div>
            <div class="represa-metric">
              <div class="val">${Number(dados.cotaAtual_m ?? 0).toFixed(2)}</div>
              <div class="unit">m</div>
            </div>
            <div>
              Ref.: <b>${Number(dados.cotaRef_m ?? 0).toFixed(2)} m</b>
              &nbsp;•&nbsp;
              <span class="represa-badge ${badgeCota}">
                ${statusCota === "high" ? "ALTO" : statusCota === "low" ? "BAIXO" : "IGUAL"}
              </span>
            </div>
          </div>
        </div>

                <!-- Card: Volume Útil (%) com comparação -->
        <div class="represa-card ${cardClasseVol}">
          <div class="card-meta">
            <div class="meta-row"><b>Última Atualização:</b> ${ultima}</div>
            <div class="meta-row"><b>Sobre a Represa:</b> ${dados.sobre}</div>
          </div>
          <div class="card-body">
            <div class="represa-label">Volume Útil</div>
            <div class="represa-metric">
              <div class="val">${Number(dados.volumeAtual_pct ?? 0).toFixed(1)}</div>
              <div class="unit">%</div>
            </div>
            <div>
              Ref.: <b>${Number(dados.volumeRef_pct ?? 0).toFixed(1)}%</b>
              &nbsp;•&nbsp;
              <span class="represa-badge ${badgeVol}">
                ${statusVol === "high" ? "ALTO" : statusVol === "low" ? "BAIXO" : "IGUAL"}
              </span>
            </div>
          </div>
        </div>

        <!-- Card: Comparação Nível de Referência × Cota Atual -->
        <div class="represa-card ${cardClasseComp}">
          <div class="card-meta">
            <div class="meta-row"><b>Última Atualização:</b> ${ultima}</div>
            <div class="meta-row"><b>Sobre a Represa:</b> ${dados.sobre}</div>
          </div>
          <div class="card-body">
            <div class="represa-label">Nível de Referência × Cota Atual</div>

            <div class="represa-compare">
              <div class="rep-item">
                <div class="rep-title">Referência</div>
                <div class="rep-value">${nivelRef.toFixed(2)} <span class="unit">m</span></div>
              </div>
              <div class="rep-item">
                <div class="rep-title">Cota Atual</div>
                <div class="rep-value">${cotaAtual.toFixed(2)} <span class="unit">m</span></div>
              </div>
            </div>

            <div class="represa-diff">
              <span class="rep-diff-number">${diffAbs >= 0 ? "+" : ""}${diffAbs.toFixed(2)} m</span>
              <span class="rep-diff-number">(${diffPct >= 0 ? "+" : ""}${diffPct.toFixed(2)}%)</span>
              <span class="represa-badge ${badgeComp}">
                ${statusComparativo === "high" ? "ALTO" : statusComparativo === "low" ? "BAIXO" : "IGUAL"}
              </span>
            </div>

            <div class="rep-note">Comparação direta entre o valor de referência configurado e a cota atual.</div>
          </div>
        </div>


        <!-- Exemplo de mais um card informativo (opcional) -->
        <div class="represa-card">
          <div class="card-meta">
            <div class="meta-row"><b>Última Atualização:</b> ${ultima}</div>
            <div class="meta-row"><b>Sobre a Represa:</b> ${dados.sobre}</div>
          </div>
          <div class="card-body">
            <div class="represa-label">Observações</div>
            <div style="font-size:13px;color:#333">
              • Valores sujeitos a revisão pelo ONS<br>
              • Comparação feita contra o valor de referência configurado
            </div>
          </div>
        </div>

      </div>
    </div>
  `;
}

////////////////////////////////
///////////////////////////////////




let _sharing = false;

async function compartilharEstabelecimento(id, nome, categoria) {

  if (!id || typeof id !== "string") {
    console.warn("ID inválido:", id);
    mostrarToast("❌ Erro ao compartilhar: ID inválido");
    return;
  }
  if (_sharing) return;
  _sharing = true;

  const url = `${window.location.origin}${window.location.pathname}#${id}`;
  const texto = `Confira: ${nome} (${categoria}) no Olá Carlópolis!`;

  try {
    if (navigator.share) {
      await navigator.share({
        title: nome,
        text: texto,
        url
      });
    } else {
      await navigator.clipboard.writeText(`${texto}\n${url}`);
      mostrarToast("🔗 Link copiado com descrição!");
    }
  } catch (err) {
    if (!(err && (err.name === "AbortError" || err.name === "NotAllowedError"))) {
      console.warn("Falha ao compartilhar:", err);
      mostrarToast("❌ Não foi possível compartilhar.");
    }
  } finally {
    _sharing = false;
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


  // ================================
  // 🔗 CAPTURA ORIGEM DO ACESSO (?o=xxx)
  // ================================
  (function registrarOrigemAcesso() {
    try {
      const params = new URLSearchParams(window.location.search);
      const origem = params.get("o");

      if (!origem) return;

      const origemLimpa = origem.toLowerCase().trim();

      const hoje = new Date();
      hoje.setHours(hoje.getHours() - 3); // UTC-3
      const data = hoje.toISOString().slice(0, 10);

      const ref = firebase.database().ref(`origemAcessos/${data}/${origemLimpa}`);
      ref.transaction(atual => (atual || 0) + 1);

      firebase.database().ref("acessos").push({
        origem: origemLimpa,
        data: data,
        timestamp: firebase.database.ServerValue.TIMESTAMP,
        userAgent: navigator.userAgent,
        isPWA: window.matchMedia('(display-mode: standalone)').matches
      });

    } catch (e) {
      console.warn("Erro ao registrar origem:", e);
    }
  })();


  /// funçao para todas as paginas
  ///
  document.addEventListener("click", (ev) => {
    const btn = ev.target.closest(".share-btn");
    if (!btn) return;

    const id = btn.getAttribute("data-share-id");
    const nome = btn.getAttribute("data-share-nome") || "";
    const categoria = btn.getAttribute("data-share-categoria") || "";

    if (id) {
      compartilharEstabelecimento(id, nome, categoria);
    }
  });


  // 🔹 Botão "Gerar card para divulgação"
  document.addEventListener("click", (ev) => {
    const btnCard = ev.target.closest(".btn-gerar-card");
    if (!btnCard) return;

    ev.preventDefault();
    ev.stopPropagation();

    const estId = btnCard.getAttribute("data-estab-id");
    if (!estId) {
      console.warn("Botão de gerar card sem data-estab-id");
      if (typeof mostrarToast === "function") {
        mostrarToast("❌ Não consegui identificar o comércio.");
      }
      return;
    }

    // Procura o estabelecimento e sua categoria
    const fonteCategorias =
      typeof categories !== "undefined"
        ? categories
        : (window.categories || []);

    let estEncontrado = null;
    let categoriaAtual = "";

    for (const cat of fonteCategorias) {
      if (!cat || !Array.isArray(cat.establishments)) continue;

      for (const est of cat.establishments) {
        const norm =
          est.nomeNormalizado ||
          (typeof normalizeName === "function"
            ? normalizeName(est.name || "")
            : String(est.name || "")
              .toLowerCase()
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "")
              .replace(/\s+/g, "-"));

        if (norm === estId) {
          estEncontrado = est;
          categoriaAtual = cat.title || "";
          break;
        }
      }

      if (estEncontrado) break;
    }

    if (!estEncontrado) {
      console.warn("Estabelecimento não encontrado para gerar card:", estId);
      if (typeof mostrarToast === "function") {
        mostrarToast("❌ Não encontrei os dados deste comércio para gerar o card.");
      } else {
        alert("Não encontrei os dados deste comércio para gerar o card.");
      }
      return;
    }

    // Gera a imagem do card
    if (typeof gerarImagemCardEstabelecimento === "function") {
      gerarImagemCardEstabelecimento(estEncontrado, categoriaAtual, estId);
    } else {
      console.error("Função gerarImagemCardEstabelecimento não disponível");
      if (typeof mostrarToast === "function") {
        mostrarToast("❌ Função de gerar card não está disponível.");
      } else {
        alert("Função de gerar card não está disponível.");
      }
      return;
    }

    // 🔸 Registra clique no Firebase (opcional, já que você tem registrarCliqueBotao)
    if (typeof registrarCliqueBotao === "function") {
      registrarCliqueBotao("gerar-card", estId).catch(() => { });
    }
  });




  // === ÍCONE info-icon (fa-share-alt) TAMBÉM GERA O CARD ===
  document.addEventListener("click", (ev) => {
    // só reage ao ícone de compartilhar das redes sociais
    const icone = ev.target.closest(".info-icon.fa-share-alt");
    if (!icone) return;

    ev.preventDefault();
    ev.stopPropagation();

    // pega o ID do estabelecimento a partir do container das abas
    const abasConteudo = icone.closest(".abas-conteudo");
    const estId = abasConteudo?.dataset.estab;

    if (!estId) {
      console.warn("Não consegui achar data-estab no container das abas");
      if (typeof mostrarToast === "function") {
        mostrarToast("❌ Não consegui identificar o comércio.");
      }
      return;
    }

    const fonteCategorias =
      typeof categories !== "undefined"
        ? categories
        : (window.categories || []);

    let est = null;
    let categoriaAtual = "";

    for (const cat of fonteCategorias) {
      if (!cat?.establishments) continue;

      for (const e of cat.establishments) {
        const norm = e.nomeNormalizado ||
          (typeof normalizeName === "function"
            ? normalizeName(e.name || "")
            : String(e.name || "")
              .toLowerCase()
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "")
              .replace(/\s+/g, "-"));

        if (norm === estId) {
          est = e;
          categoriaAtual = cat.title || "";
          break;
        }
      }
      if (est) break;
    }

    if (!est) {
      console.warn("Dados do comércio não encontrados para gerar card:", estId);
      if (typeof mostrarToast === "function") {
        mostrarToast("❌ Dados do comércio não encontrados.");
      }
      return;
    }

    if (typeof gerarImagemCardEstabelecimento === "function") {
      gerarImagemCardEstabelecimento(est, categoriaAtual, estId);
    } else {
      console.error("Função gerarImagemCardEstabelecimento não disponível");
      if (typeof mostrarToast === "function") {
        mostrarToast("❌ Função de gerar card não está disponível.");
      }
      return;
    }

    // registra clique no firebase (se quiser manter a métrica)
    if (typeof registrarCliqueBotao === "function") {
      registrarCliqueBotao("gerar-card", estId).catch(() => { });
    }
  });

  // === Botão para gerar card de IMÓVEL ===
  document.addEventListener("click", (ev) => {
    const btn = ev.target.closest(".btn-gerar-card-imovel");
    if (!btn) return;

    ev.preventDefault();
    ev.stopPropagation();

    const imovelId = btn.getAttribute("data-imovel-id");
    if (!imovelId) {
      mostrarToast("❌ Não consegui identificar o imóvel.");
      return;
    }

    // procura o imóvel na lista global
    const lista = window.imoveis || [];
    const imovel = lista.find(im =>
      im.slug === imovelId ||
      im.id === imovelId ||
      im.nomeNormalizado === imovelId
    );

    if (!imovel) {
      mostrarToast("❌ Imóvel não encontrado.");
      return;
    }

    if (typeof gerarImagemCardImovel === "function") {
      gerarImagemCardImovel(imovel, imovelId);
    } else {
      mostrarToast("❌ Função de gerar card não disponível.");
    }
  });



  // Compartilhar a página/rota atual (preserva a rota exata)
  async function compartilharPagina(hash = location.hash, titulo = document.title || "Olá Carlópolis", texto = "Confira esta página!") {
    let h = String(hash || "");
    if (h && !h.startsWith("#")) h = "#" + h;

    // 🔧 remove index.html do caminho
    const base = location.origin + location.pathname.replace(/index\.html$/i, "");
    const url = `${base}${h}`;

    try {
      if (navigator.share) {
        await navigator.share({ title: titulo, text: texto, url });
      } else {
        await navigator.clipboard.writeText(url);
        mostrarToast("🔗 Link copiado com sucesso!");
      }
    } catch (err) {
      if (err && (err.name === "AbortError" || err.name === "NotAllowedError")) return;
      mostrarToast("❌ Não foi possível compartilhar.");
    }
  }

  window.compartilharPagina = compartilharPagina;





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
      let texto;

      // Se a página for a de busca CEP, mantém mensagem especial
      if (location.hash.includes("busca-cep")) {
        texto = "Pesquise o CEP da sua rua";
      } else {
        // Mensagem padrão para qualquer setor/categoria
        texto = `Segue página referente a "${titulo}"`;
      }

      compartilharPagina(location.hash, titulo, texto);
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

  //////




  // Função para identificar a origem do acesso
  function getOrigemAcesso() {
    const urlParams = new URLSearchParams(window.location.search);
    const origemUrl = urlParams.get('o'); // Detecta se tem ?o=instagram na URL

    // 1. Verifica se veio do Instagram
    if (origemUrl === 'instagram' || document.referrer.includes('instagram.com')) {
      return 'insta';
    }
    // 2. Verifica se veio do App (PWA)
    // Nota: Aqui usei a lógica da sua função detectarCanalAcesso()
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
      return 'app';
    }
    // 3. Padrão: Site
    return 'site';
  }

  // Variável global para controle do pulso
  let contadorAnterior = 0;

  function inicializarContadorOnline() {
    // 1. Captura os elementos exatos do seu HTML
    const contadorEl = document.getElementById("contadorOnline");
    const iconeEl = document.getElementById("iconeUsuarios");

    if (!contadorEl) {
      console.warn("Elemento 'contadorOnline' não encontrado no HTML.");
      return;
    }

    // 2. Referência do Firebase
    const onlineUsersRef = firebase.database().ref("onlineUsers");
    const connectedRef = firebase.database().ref(".info/connected");

    // 3. Gerenciamento de Presença (O "pulo do gato")
    connectedRef.on("value", (snap) => {
      if (snap.val() === true) {
        // Cria uma entrada única para esta aba
        const myUserRef = onlineUsersRef.push();

        myUserRef.set({
          origem: getOrigemAcesso(), // <--- ADICIONE ESTA LINHA
          timestamp: firebase.database.ServerValue.TIMESTAMP
        });

        // Quando desconectar, remove
        myUserRef.onDisconnect().remove();


      }
    });



    // 4. Atualização em tempo real do contador
    onlineUsersRef.on("value", (snapshot) => {
      const userCount = snapshot.numChildren() || 0;

      if (contadorEl) {
        contadorEl.textContent = userCount;
      }

      // DISPARA O EFEITO EM CONJUNTO
      if (iconeEl && userCount > contadorAnterior) {
        // iconeEl deve ser o container que envolve <i> e <span>
        iconeEl.classList.add("icone-notificacao");

        // Remove após 5 segundos
        setTimeout(() => {
          iconeEl.classList.remove("icone-notificacao");
          // Se precisar voltar para a cor original (ex: cinza):
          iconeEl.style.color = "";
        }, 5000);
      }

      contadorAnterior = userCount;
    });
  }

  // Inicialização segura
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", inicializarContadorOnline);
  } else {
    inicializarContadorOnline();
  }








  /////



  /// inicio detecta usuarios online e desconecta x

  onlineUsersRef.on("value", (snapshot) => {
    const userCount = snapshot.numChildren() || 0;

    if (contadorEl) {
      contadorEl.textContent = userCount;
    }

    // DISPARA O EFEITO (Vermelho + Pulso)
    if (iconeEl && userCount > contadorAnterior) {
      // Adiciona a classe ao elemento pai (iconeUsuarios)
      iconeEl.classList.add("icone-notificacao");

      // Remove tudo após 5 segundos
      setTimeout(() => {
        iconeEl.classList.remove("icone-notificacao");
      }, 5000);
    }

    contadorAnterior = userCount;
  });





  function detectarCanalAcesso() {
    const isStandalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      window.matchMedia?.("(display-mode: fullscreen)").matches ||
      window.matchMedia?.("(display-mode: minimal-ui)").matches ||
      window.navigator.standalone === true; // iOS

    return isStandalone ? "App (PWA)" : "Site (Navegador)";
  }







  // Função para registrar o acesso diário
  function registrarAcesso() {
    const hoje = getHojeBR();


    // 1. IDENTIFICAR A ORIGEM (Prioridade: Link > App > Site)
    const urlParams = new URLSearchParams(window.location.search);
    const origemLink = urlParams.get("o");
    const isApp = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;




    let origemFinal = "Site";
    if (origemLink) {
      origemFinal = origemLink; // Se tiver ?o=xxx, usa o que estiver escrito
    } else if (isApp) {
      origemFinal = "App"; // Se for o App instalado
    }

    const refTotal = firebase.database().ref(`acessosPorDia/${hoje}/total`);
    const refDetalhado = firebase.database().ref(`acessosPorDia/${hoje}/detalhados`).push();

    refTotal.transaction((acessos) => (acessos || 0) + 1);

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
        // origem: new URLSearchParams(window.location.search).get("o") || "acesso direto",
        // SALVANDO A ORIGEM IDENTIFICADA
        origem: origemFinal,
        canal: detectarCanalAcesso(), // ✅ NOVO (Site vs App)
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

  const destaquesFixos = [
    // "hime",
    //    "seiza", "hime"
  ];

  function montarCarrosselDivulgacao() {
    const listaTodos = [];

    // monta lista com todos os estabelecimentos que têm novidades ativas
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
    const sorteados = restantes
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.max(0, 20 - fixos.length));

    const totalExibir = [...fixos, ...sorteados].slice(0, 22);

    const swiperWrapper = document.querySelector(".swiper-novidades .swiper-wrapper");
    const gradeDivulgacao = document.getElementById("grade-divulgacao");

    if (!swiperWrapper) return;

    swiperWrapper.innerHTML = "";
    if (gradeDivulgacao) gradeDivulgacao.innerHTML = "";

    totalExibir.forEach(est => {
      const categoria = categories.find(cat =>
        cat.establishments?.some(e => e.name === est.name)
      )?.title || "";

      // 🔹 Monta o array de imagens da home:
      //    - primeiro a foto de perfil / logo
      //    - depois as fotos de novidades
      const imagensPerfil = [];
      if (est.image) imagensPerfil.push(est.image);     // foto de perfil do comércio
      if (est.logo && est.logo !== est.image) {
        imagensPerfil.push(est.logo);                   // logo, se for diferente
      }

      const imagensBase = Array.isArray(est.novidadesImages)
        ? est.novidadesImages
        : [];

      const imagens = [...new Set([...imagensPerfil, ...imagensBase])]; // remove duplicadas

      // 🔥 Sempre começa pela foto de perfil/logo
      const imagemInicial = imagens[0];




      const indexImagem = imagens.indexOf(imagemInicial);
      const texto = est.novidadesDescriptions?.[indexImagem] || "Confira nossas novidades!";

      // ====== SLIDE GRANDE DO CARROSSEL (mantém como era) ======
      const slide = document.createElement("div");
      slide.classList.add("swiper-slide");

      slide.innerHTML = `
      <img class="content_image" src="${imagemInicial}" alt="${est.name}" loading="lazy">
      <div class="info_divulgacao">
        <h3>${categoria ? categoria + " - " + est.name : est.name}</h3>
        <p>${texto}</p>

        ${est.instagram ? `<a href="${fixUrl(est.instagram)}" target="_blank" rel="noopener noreferrer" class="mais-info">+ informações</a>` : ""}
      </div>
    `;

      swiperWrapper.appendChild(slide);

      // ====== CARD PEQUENO NA GRADE DE DESTAQUES ======
      if (gradeDivulgacao) {
        const card = document.createElement("div");
        card.className = "card-divulgacao-pequeno";
        const idEst = est.nomeNormalizado || normalizeName(est.name || "");
        card.dataset.id = idEst;

        card.innerHTML = `
        <div class="card-divulgacao-img-wrap">
          <img src="${imagemInicial}" alt="${est.name}" loading="lazy">
        </div>
        <div class="card-divulgacao-info">
          <span class="card-divulgacao-categoria">
            ${categoria || "Divulgação"}
          </span>
          <div class="card-divulgacao-linha">
            <h4>${est.name}</h4>
            ${est.instagram
            ? `<a href="${fixInstagramUrl(est.instagram)}" class="card-divulgacao-ig-btn" aria-label="Abrir Instagram" target="_blank" rel="noopener noreferrer">
                     <i class="fa-brands fa-instagram"></i>
                   </a>`
            : ""
          }
          </div>
        </div>
      `;

        // 👉 Clique no CARD leva para o comércio dentro do site
        card.addEventListener("click", () => {
          abrirEstabelecimentoDaHome(idEst);
        });

        // 👉 Clique no ícone do Instagram abre o insta, sem perder o clique do card
        const igBtn = card.querySelector(".card-divulgacao-ig-btn");
        if (igBtn && est.instagram) {
          igBtn.addEventListener("click", (ev) => {
            ev.stopPropagation();

          });
        }

        // 👉 MINI CARROSSEL: troca automática das imagens desse estabelecimento
        if (imagens.length > 1) {
          const imgTag = card.querySelector(".card-divulgacao-img-wrap img");
          let idx = imagens.indexOf(imagemInicial);
          if (idx < 0) idx = 0;

          setInterval(() => {
            idx = (idx + 1) % imagens.length;
            imgTag.src = imagens[idx];
          }, 5000); // troca a cada 4 segundos (ajuste se quiser)
        }

        gradeDivulgacao.appendChild(card);
      }
    });
  }







  function montarGradeEventos() {
    const grade = document.getElementById("grade-eventos");
    if (!grade) return;

    // Usa a mesma fonte de dados dos comércios (categories)
    const fonteCategorias =
      typeof categories !== "undefined"
        ? categories
        : (window.categories || []);

    const eventosCat = fonteCategorias.find(
      (cat) => cat.title === "Eventos em Carlópolis"
    );

    if (!eventosCat || !Array.isArray(eventosCat.establishments)) {
      console.warn("Categoria 'Eventos em Carlópolis' não encontrada ou sem establishments.");
      grade.innerHTML = "";
      return;
    }

    // Só pega os eventos "reais" (com imagem, nome e instagram)
    const listaEventos = eventosCat.establishments.filter(
      (ev) => ev && ev.image && ev.name
    );

    grade.innerHTML = "";

    listaEventos.forEach((ev, idx) => {
      const card = document.createElement("div");
      card.className = "card-divulgacao-pequeno";

      const nome = ev.name || "Evento";
      const data = ev.date || "";
      const endereco = ev.address || "";

      card.innerHTML = `
      <div class="card-divulgacao-img-wrap">
        <img src="${ev.image}" alt="${nome}" loading="lazy">
      </div>
      <div class="card-divulgacao-info">
        <span class="card-divulgacao-categoria">Evento</span>
        <div class="card-divulgacao-linha">
          <h4>${nome}</h4>
          ${ev.instagram
          ? `<a href="${fixInstagramUrl(ev.instagram)}" class="card-divulgacao-ig-btn"
                         aria-label="Abrir Instagram do evento"
                         target="_blank" rel="noopener noreferrer">
                   <i class="fa-brands fa-instagram"></i>
                 </a>`
          : ""
        }
        </div>
        ${data || endereco
          ? `<small>${[data, endereco].filter(Boolean).join(" • ")}</small>`
          : ""
        }
      </div>
    `;

      // Clique no CARD → abre a seção de eventos e vai pro slide correspondente
      card.addEventListener("click", () => {
        const id = normalizeName(ev.name); // mesmo formato dos comércios
        if (id) {
          location.hash = "#" + id;       // ativa o carregamento automático
          carregarEstabelecimentoPeloHash(); // força a abertura imediata
        }
      });


      // Clique no ícone do Instagram → abre o Insta sem disparar o clique do card
      const igBtn = card.querySelector(".card-divulgacao-ig-btn");
      if (igBtn && ev.instagram) {
        igBtn.addEventListener("click", (e) => {
          e.stopPropagation();

        });
      }

      grade.appendChild(card);
    });
  }




  // Abre a categoria certa e rola até o comércio correspondente
  function abrirEstabelecimentoDaHome(idEst) {
    if (!idEst) return;

    // 1) Descobre em qual categoria esse estabelecimento está
    let categoriaEncontrada = null;

    categories.forEach(cat => {
      if (categoriaEncontrada) return;
      cat.establishments?.forEach(est => {
        const norm = normalizeName(est.name || "");
        if (norm === idEst) {
          categoriaEncontrada = cat;
        }
      });
    });

    if (!categoriaEncontrada) {
      console.warn("Estabelecimento não encontrado para id:", idEst);
      return;
    }

    // 2) Se existir link no menu lateral para essa categoria, clica nele
    if (categoriaEncontrada.link && typeof categoriaEncontrada.link.click === "function") {
      categoriaEncontrada.link.click();
    } else if (typeof loadContent === "function") {
      // fallback: monta a categoria manualmente
      loadContent(categoriaEncontrada.title, categoriaEncontrada.establishments);
    }

    // 3) Atualiza o hash amigável


    // 4) Depois que a categoria carregar, rola até o li do comércio e destaca
    setTimeout(() => {
      const alvo = document.getElementById(idEst);
      if (alvo) {
        alvo.scrollIntoView({ behavior: "smooth", block: "start" });
        alvo.classList.add("destaque-home");
        setTimeout(() => alvo.classList.remove("destaque-home"), 1500);
      }
    }, 500);
  }

  // Observa o hash (#alguma-coisa) e, se for um estabelecimento válido,
  // abre a categoria correta e rola até o comércio
  function tratarHashEstabelecimento() {
    const h = window.location.hash || "";
    if (!h.startsWith("#")) return;

    const id = h.slice(1).trim();
    if (!id) return;

    // Verifica se esse id corresponde a algum comércio
    let existe = false;
    categories.forEach(cat => {
      if (existe) return;
      cat.establishments?.forEach(est => {
        const norm = normalizeName(est.name || "");
        if (norm === id) {
          existe = true;
        }
      });
    });

    // Se não for um comércio, deixa outras rotas funcionarem normalmente
    if (!existe) return;

    // Agora sim abre o comércio
    abrirEstabelecimentoDaHome(id);
  }

  // Ao carregar a página e quando o hash mudar (#thebestacai, #cacaushow, etc.)
  // verifica se precisa abrir um comércio específico
  window.addEventListener("hashchange", tratarHashEstabelecimento);
  document.addEventListener("DOMContentLoaded", tratarHashEstabelecimento);


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

    // INICIO COMERCIOS

    //academia
    lobofitness: "n",
    teamvieira: "s",

    //acabamento
    tokfino: "s",


    //AÇAI
    turminhadoacai: "s",
    thebestacai: "s",

    //Açougue
    acouguecuritiba: "s",

    // ADEGAS
    adegacuenca: "s",
    assao: "s",

    //ADVOCACIA  


    // Agropecuaria
    agrovida: "s",
    racoessaojose: "s",
    agrocasavaraschin: "s",


    // assessocia balistica
    betogunsassessoriaarmaria: "s",



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
    judite: "n",
    patymaosdeouro: "n",

    //calhas
    nelsoncalhas: "s",

    // cartorio
    registrocivileimoveis: "s",
    tabelionatodenotas: "s",

    //chaveiro
    chaveirocentral: "s",


    //confecção

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
    suedveterinariaepetshop: "n",

    //DESPACHANTE
    rodriguinho: "s",

    //desentupidora
    gcyvazamentos: "s",

    // estudio de beleza
    veronicakataoka: "n",

    //farmacia
    elshaday: "s",
    farmais: "s",
    descontofacil1: "s",
    drogamais: "s",
    masterfarma: "s",
    popularmais: "s",
    santamaria: "s",
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
    pescaepresente: "n",
    lojathiagoaguera: "s",

    //lojaderoupas

    "t&mcollection": "n",

    // mercearia
    seiza: "s",

    radarmeteorologico: "s",

    //moveis
    movepar: "s",

    //mototaxi
    mototaximodesto: "s",

    //motocenter
    binhomotocenter: "s",


    //otica

    oticavisualcenter: "s",

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

    //revendedor
    taticonik: "s",
    leozindetailer: "n",

    //pizzaria
    fornalhapizzaria: "s",
    tonnypizzaria: "n",
    happyhour: "n",

    // quitanda
    pimentadoce: "s",

    //lanchonete
    ocasarao: "s",
    ione: "s",
    cantinhodapraca: "s",
    caldodecanaamaral: "n",
    levisalgados: "n",
    espacogourmet: "s",
    kidoglanches: "s",
    pracalanches: "s",
    didog: "s",
    xisbauinea: "s",
    mycoffee: "s",
    mrpotato: "s",
    noponto: "s",

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
    carlopolitana: "n",

    // relojoaria
    relojoariamartini: "n",

    // restaurantes
    assadaodorussao: "s",

    cantinaitaliana: "s",
    emporiosaovictor: "s",
    hime: "s",
    pesqueirodogalego: "s",
    restauranteportal: "n",
    neia: "n",
    namigojapanese: "s",
    //oficinadosabor:"s",
    paiol: "n",
    restaurantedadi: "s",
    toninhoparana: "s",
    sabordaroca: "s",
    selahtgrill: "s",
    yingyang: "n",

    // produtos de limpeza
    jmprodutosdelimpeza: "s",

    funerariacristorei: "s",
    funerariagrupocastilho: "s",



    //materiais eletricos

    acendemateriaiseletricos: "s",

    // sorveteria
    limone: "s",
    sorvetessallesferreira: "s",
    santtinogelateria: "s",
    fortyshake: "s",

    // topografia
    da2engenharia: "s",

    //vidraçadia
    sallesvidros: "s",

    // FIM COMERCIOS

    // INICIO SERVIÇOS 

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

    erickson: "s",

    // guia de pesca
    fabiosushimoto: "n",

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
    ederluis: "s",

    // VETERINARIO

    celsogolcalves: "s",
    jurandirmachado: "s",


    // INICIO SERVIÇOS 

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

    // creches:
    ainzararossisallescmei: "s",
    isabeldallabdasilvacmeiprofa: "s",
    marinhafogacadeoliveiracmei: "s",

    //delegacia

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
    "secretariadaeducacao": "s",
    sindicatorural: "s",
    vigilanciasanitaria: "s",


    /// FIM SETOR PUBLICO

    // INFORMAÇOES

    funerariasaovicentedepaulo: "s",
    funerariabomjesus: "s",

    // FIM NOTA DE FALECIMENTO
    // GRUPO WHATS
    carlopolis24hrs: "s",

    // INICIO EVENTOS 
    //calendarioeventos: "s",
    feiradalua: "n",
    arenagoldenhits: "n",

    pescar: "s",
    bloquinhodoagro: "s",
    cafedamanhadosamigos: "s",
    "festadesaojose": "s",
    undokai2026: "s",
    cfccarlopolisfight: "s",
    festadaapae: "s",
    sunsetcaravela: "s",
    lowcity043fest: "s",
    "7encontrodemotociclistas-lobodafronteira": "s",
    "2cafecoloniallarsaovicente": "s",
    frutfest2026: "s",
    tooronagashi: "s",



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
    { id: "farmaciaVila", nome: "Farmacia da Vila", descricao: "Para vocês ficarem por dentro de todas as PROMOÇÕES e NOVIDADES aqui da Farmácia da Vila ❤️", link: "https://chat.whatsapp.com/DD4Q5CZVsXLGeraeSNjyhK?mode=wwt", imagem: "images/informacoes/gruposWhats/13.jpg" },


    { id: "movepar", nome: "Movepar Promoções", descricao: "Todos os dias promoções imperdíveis para renovar os moveis e eletros da sua casa!", link: "https://chat.whatsapp.com/L2hNB5RAoRhAAoWx2XrRUw?mode=ems_wa_t", imagem: "images/informacoes/gruposWhats/8.jpg" },
    { id: "noticiasclps", nome: "Noticias CLPS & REGIÃO", descricao: "Notícias e utilidades da cidade.", link: "https://chat.whatsapp.com/FpIvEbPjLrxHqwtcCnVp3G?mode=ems_wa_t", imagem: "images/informacoes/gruposWhats/1.jpg" },
    { id: "oficinadeXadrez", nome: "Oficina Xadrez Carlopolis", descricao: "A Oficina de Xadrez tem como objetivo ensinar fundamentos, estimular o raciocínio lógico e desenvolver habilidades estratégicas por meio da prática do jogo", link: "https://chat.whatsapp.com/HAJ1N5n0BlK2IM3J8CUbpz?mode=ems_copy_t", imagem: "images/informacoes/gruposWhats/4.jpg" },
    { id: "soberanoLanches", nome: "Soberano Lanches", descricao: "Acompanhe nossas novidades e promoçoes", link: "https://chat.whatsapp.com/F2B9b5YGBvA0sEoqfe1ovW?mode=wwt", imagem: "images/informacoes/gruposWhats/12.jpg" },

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
          window.registrarCliqueBotao("grupoWhatsapp", id);
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



  // ===============================
  // iGreen — Desconto na conta de luz (Página interna)
  // ===============================
  const IGREEN_AUTO_CADASTRO =
    "https://digital.igreenenergy.com.br/?id=116411&sendcontract=true&desc=10";

  function mostrarIgreenDescontoLuz() {
    if (location.hash !== "#luz") location.hash = "#luz";

    const area = document.querySelector(".content_area");
    if (!area) return;

    const html = `
  <div class="page-header" data-share-hash="#luz">
    <h2>⚡ Desconto na Conta de Luz</h2>
    <i class="fa-solid fa-share-nodes share-btn"
      onclick="compartilharPagina('#luz','Economia na Conta de Luz','Economize em sua fatura de energia através do nosso cadastro.')"></i>
  </div>

  <div class="igreen-wrap">
    <div class="igreen-card igreen-hero">
      <div class="igreen-hero-inner">
        <div class="igreen-hero-left">
       

          <h3 class="igreen-title">
            Desconto na conta de luz com <span>energia limpa IGREEN</span>
          </h3>

          <p class="igreen-sub">
            Faça o <b>cadastro</b> e participe do programa de desconto.<BR> 
            
            Sem obra, sem instalar nada só com processo digital.<br>

            Após concluir o cadastro e a ativação do benefício, você passa a ter ao menos<b> 10% de desconto</b> na sua conta de luz.
          </p>

          <div class="igreen-highlight">
            <div class="igreen-highlight-item">
              <i class="fa-solid fa-scale-balanced"></i>
              <div>
                <b>Amparo legal</b>
                <small>                
              Marco legal da micro/mini geração distribuída e o
            Sistema de Compensação de Energia Elétrica (SCEE), (Lei 14.300/22).                
                </small>
              </div>
            </div>

            <div class="igreen-highlight-item">
              <i class="fa-solid fa-file-lines"></i>
              <div>
                <b>Documentos necessários</b>
                <small>Fatura atual + documentos do titular</small>
              </div>
            </div>

            <div class="igreen-highlight-item">
              <i class="fa-solid fa-bolt"></i>
              <div>
                <b>Rápido, simples e gratuito</b>
                <small>Cadastro em poucos minutos</small>
              </div>
            </div>
          </div>

         <div class="igreen-actions igreen-actions-cta">
  <a class="igreen-btn igreen-btn-big"  id="btnIgreenCadastro" href="${IGREEN_AUTO_CADASTRO}" target="_blank" rel="noopener">
    👉 Fazer cadastro agora
  </a>




 

  
</div>


        </div>

        <div class="igreen-hero-right">
          <div class="igreen-sidecard">
                  

            <div class="igreen-steps-title">🚀 Como funciona</div>
            <ol class="igreen-steps">
              <li>Você preenche os teus dados e da conta de luz.</li>
              <li>O cadastro é analisado conforme a distribuidora/região.</li>
              <li>Quando aprovado, o desconto passa a aparecer nas faturas seguintes em até 90 dias.</li>
            </ol>

            <div class="igreen-side-note">
              * Condições podem variar por região/distribuidora e regras do programa.
            </div>
          </div>

          <div class="igreen-faq">
            <div class="igreen-faq-title">❓ Dúvidas rápidas</div>
            <details>
              <summary>Precisa instalar placas?</summary>
              <p>Não. A proposta é adesão digital (sem obra/instalação na sua casa).</p>
            </details>
            <details>
              <summary>Tem custo para aderir?</summary>
              <p>O cadastro divulgado aqui é gratuito e feito online.</p>
            </details>
            <details>
              <summary>Quanto tempo leva para cadastrar?</summary>
              <p>O preenchimento costuma ser rápido (em torno de 10 minutos, se estiver com a fatura em mãos).</p>
            </details>
          </div>

             <div class="igreen-faq">
 <a class="igreen-btn-whats" id="btnIgreenWhats"
     href="https://wa.me/5543991766639?text=Olá!%20Vi%20a%20página%20de%20Desconto%20na%20Conta%20de%20Luz%20no%20Olá%20Carlópolis%20e%20gostaria%20de%20tirar%20algumas%20dúvidas."
     target="_blank"
     rel="noopener">
     <i class="fa-brands fa-whatsapp"></i> Tirar dúvidas no WhatsApp
  </a></div>


        </div>
      </div>
    </div>
  </div>
`;


    area.innerHTML = html;

    // Registrar cliques dos botões da página iGreen
    function registrarCliqueIgreen(tipo) {
      // Usa sua função existente (Firebase)
      if (typeof window.registrarCliqueBotao === "function") {
        // idEstabelecimento aqui é fixo pra iGreen (pra ficar fácil de filtrar no relatório)
        window.registrarCliqueBotao(tipo, "igreen");
      }
    }

    const btnCadastro = document.getElementById("btnIgreenCadastro");
    if (btnCadastro) {
      btnCadastro.addEventListener("click", () => {
        registrarCliqueIgreen("cadastro");
      });
    }

    const btnWhats = document.getElementById("btnIgreenWhats");
    if (btnWhats) {
      btnWhats.addEventListener("click", () => {
        registrarCliqueIgreen("whats_duvidas");
      });
    }


    const btn = document.getElementById("btnCopiarLinkIgreen");
    if (btn) {
      btn.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(IGREEN_AUTO_CADASTRO);
          btn.textContent = "✅ Copiado!";
          setTimeout(() => (btn.textContent = "Copiar link"), 1500);
        } catch (e) {
          alert("Não foi possível copiar automaticamente. Copie manualmente o link exibido.");
        }
      });
    }
  }

  // rota via hash (pra abrir direto por link compartilhado)
  function rotaIgreenIntercept() {
    const h = (location.hash || "").toLowerCase();
    if (h === "#luz" || h.startsWith("#luz")) {
      document.querySelector(".content_area")?.classList.remove("hidden");
      mostrarIgreenDescontoLuz();
      return true;
    }
    return false;
  }

  window.addEventListener("hashchange", () => rotaIgreenIntercept());
  document.addEventListener("DOMContentLoaded", () => rotaIgreenIntercept());



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


  // ativar PLANO ACADEMIA IA pelo menu
  document.addEventListener("click", (e) => {
    const a = e.target.closest("#menuAcademiaIA");
    if (a) {
      e.preventDefault();
      mostrarPaginaAcademiaIA();
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
   <button class="btn-fotos_onde" onclick="registrarCliqueFotosOndeComer('${normalizeName(est.name)}'); mostrarFotos('${normalizeName(est.name)}')">
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
      id: "casa1v",
      codRef: "C_001",
      status: "vendido",
      tipo: "venda",
      //status: "disponível",
      titulo: "Residencial Villa Ray (Horizonte 3)",
      endereco: "Agende uma visita",
      quartos: 2,
      banheiros: 2,
      vagas: 1,
      salas: 1,
      cozinhas: 1,
      piscina: false,
      churrasqueira: false,
      area: 90,
      construcao: 63,
      valor: 230000,
      suite: "1",
      quintal: "Não",
      telefone: "43 99678-9652",
      imagens: [
        "images/imoveis/cesar/venda/casa1/1.png",
        "images/imoveis/cesar/venda/casa1/10.jpg",
        "images/imoveis/cesar/venda/casa1/2.jpg",
        "images/imoveis/cesar/venda/casa1/3.JPG",
        "images/imoveis/cesar/venda/casa1/4.jpg",
        "images/imoveis/cesar/venda/casa1/5.jpg",
        "images/imoveis/cesar/venda/casa1/6.jpg",
        "images/imoveis/cesar/venda/casa1/7.jpg",
        "images/imoveis/cesar/venda/casa1/8.jpg",
        "images/imoveis/cesar/venda/casa1/9.jpg",


      ],
      descricao: "Ambientes bem iluminados e ventilados, prontos para receber sua família. Documentação OK",

      procura: "casa", // ou "terreno", "rural", etc.   

      // corretores: ["Cesar Melo - 38.105 F", "João Souza", "Ana Lima"]
      corretores: ["Cesar Melo - 38.105 F"]

    },


    {
      id: "casa3v",
      codRef: "C_003",
      tipo: "venda",
      procura: "casa", // ou "terreno", "rural", etc.
      quartos: 3,
      valor: 380000,
      piscina: false,
      churrasqueira: "Sim",
      vagas: 2,
      corretores: ["Cesar Melo - 38.105 F"],
      // corretores: ["Cesar Melo - 38.105 F", "João Souza", "Ana Lima"]
      ////////////////////////////////////////////////////////////
      titulo: "Casa a venda em Carlópolis",
      descricao: "Documentação OK.",
      endereco: "Novo Horizonte 1",
      suite: "1",
      banheiros: 3,
      salas: 1,
      cozinhas: 1,
      area: 180,
      construcao: 125,          // << NOVO: m² de construção
      quintal: "Não",
      telefone: "43 99678-9652",  // Corretor ou propretario
      imagens: [
        "images/imoveis/cesar/venda/casa3/1.jpg",
        "images/imoveis/cesar/venda/casa3/2.jpg",
        "images/imoveis/cesar/venda/casa3/3.JPG",
        "images/imoveis/cesar/venda/casa3/4.jpg",
        "images/imoveis/cesar/venda/casa3/5.jpg",
        "images/imoveis/cesar/venda/casa3/6.jpg",
        "images/imoveis/cesar/venda/casa3/7.jpg",
        "images/imoveis/cesar/venda/casa3/8.jpg",
        "images/imoveis/cesar/venda/casa3/9.jpg"

      ],
      //lat: -23.3953,
      //lng: -49.7232,

    },


    {
      id: "casa4v",
      codRef: "C_004",
      tipo: "venda",
      procura: "casa", // ou "terreno", "rural", etc.
      quartos: 2,
      valor: 1150000,
      piscina: "Sim",
      churrasqueira: false,
      vagas: 4,
      corretores: ["Rafael Bandeira - 29.802"],
      titulo: "Imóvel no Residencial Ilhabela",
      descricao: "Acabamentos sofisticados, design moderno e ambientes integrados. Documentação OK",
      endereco: "Condominio Ilha bela",
      suite: "Não",
      banheiros: 1,
      salas: 1,
      cozinhas: 1,
      area: 390,
      construcao: 120,          // << NOVO: m² de construção
      quintal: "Sim",
      telefone: "43 99686-4716", // Corretor ou propretario
      imagens: [
        "images/imoveis/rafaelBandeira/venda/casa1/1.jpg",
        "images/imoveis/rafaelBandeira/venda/casa1/2.jpg",
        "images/imoveis/rafaelBandeira/venda/casa1/3.jpg",
        "images/imoveis/rafaelBandeira/venda/casa1/4.jpg",
        "images/imoveis/rafaelBandeira/venda/casa1/5.jpg",
        "images/imoveis/rafaelBandeira/venda/casa1/6.jpg",
        "images/imoveis/rafaelBandeira/venda/casa1/7.jpg",
        "images/imoveis/rafaelBandeira/venda/casa1/8.jpg",
        "images/imoveis/rafaelBandeira/venda/casa1/9.jpg",
      ],
      //lat: -23.3953,
      //lng: -49.7232,

    },



    {
      id: "casa6v",
      codRef: "C_006",
      status: "vendido",
      tipo: "venda",
      procura: "casa", // ou "terreno", "rural", etc.
      quartos: 2,
      valor: 320000,
      piscina: false,
      churrasqueira: "Sim",
      vagas: 2,
      corretores: ["Cesar Melo - 38.105 F"],
      // corretores: ["Cesar Melo - 38.105 F", "João Souza", "Ana Lima"]
      ////////////////////////////////////////////////////////////
      titulo: "Casa a venda com área gourmet",
      descricao: "Documentação Ok.",
      endereco: "Residencial Murador ",
      suite: "Não",
      banheiros: 2,
      salas: 1,
      cozinhas: 1,
      area: 180,
      construcao: 97,          // << NOVO: m² de construção
      quintal: "Sim",
      telefone: "43 99678-9652",  // Corretor ou propretario
      imagens: [
        "images/imoveis/cesar/venda/casa6/1.jpg",
        "images/imoveis/cesar/venda/casa6/2.jpg",
        "images/imoveis/cesar/venda/casa6/3.JPG",
        "images/imoveis/cesar/venda/casa6/4.jpg",
        "images/imoveis/cesar/venda/casa6/5.jpg",
        "images/imoveis/cesar/venda/casa6/6.jpg",
        "images/imoveis/cesar/venda/casa6/7.jpg",
        "images/imoveis/cesar/venda/casa6/8.jpg",
        "images/imoveis/cesar/venda/casa6/9.jpg",
        "images/imoveis/cesar/venda/casa6/10.jpg",

      ],
      //lat: -23.3953,
      //lng: -49.7232,

    },


    {
      id: "casa7v",
      codRef: "C_007",
      tipo: "venda",
      status: "vendido",
      procura: "casa", // ou "terreno", "rural", etc.
      quartos: 3,
      valor: 300000,
      piscina: "Sim",
      churrasqueira: false,
      vagas: 2,
      corretores: ["Cesar Melo - 38.105 F"],
      // corretores: ["Cesar Melo - 38.105 F", "João Souza", "Ana Lima"]
      ////////////////////////////////////////////////////////////
      titulo: "Casa com Piscina",
      descricao: "Documentação Ok.",
      endereco: "Residencial Murador ",
      suite: "1",
      banheiros: 3,
      salas: 1,
      cozinhas: 1,
      area: 180,
      construcao: 120,          // << NOVO: m² de construção
      quintal: "Sim",
      telefone: "43 99678-9652",  // Corretor ou propretario
      imagens: [
        "images/imoveis/cesar/venda/casa7/1.jpg",
        "images/imoveis/cesar/venda/casa7/2.jpg",
        "images/imoveis/cesar/venda/casa7/3.JPG",
        "images/imoveis/cesar/venda/casa7/4.jpg",
        "images/imoveis/cesar/venda/casa7/5.jpg",
        "images/imoveis/cesar/venda/casa7/6.jpg",
        "images/imoveis/cesar/venda/casa7/7.jpg",
        "images/imoveis/cesar/venda/casa7/8.jpg",
        "images/imoveis/cesar/venda/casa7/9.jpg",
        "images/imoveis/cesar/venda/casa7/10.jpg",
        "images/imoveis/cesar/venda/casa7/11.jpg",
        "images/imoveis/cesar/venda/casa7/12.jpg",


      ],
      //lat: -23.3953,
      //lng: -49.7232,

    },



    {
      id: "casa8v",
      codRef: "C_008",
      tipo: "venda",
      procura: "casa", // ou "terreno", "rural", etc.
      quartos: 3,
      valor: 500000,
      piscina: "Sim",
      churrasqueira: "Sim",
      vagas: 3,
      corretores: ["Cesar Melo - 38.105 F"],
      titulo: "Casa a venda mobiliada (chave na porta)",
      descricao: "Conta com uma área de churrasqueira. Documentação Ok.",
      endereco: "Novo Horizonte l",
      suite: "Não",
      banheiros: 2,
      salas: 1,
      cozinhas: 1,
      area: 180,
      construcao: 165,          // << NOVO: m² de construção
      quintal: "Sim",
      telefone: "43 99678-9652",  // Corretor ou propretario
      imagens: [
        "images/imoveis/cesar/venda/casa8/1.jpg",
        "images/imoveis/cesar/venda/casa8/2.jpg",
        "images/imoveis/cesar/venda/casa8/3.jpg",
        "images/imoveis/cesar/venda/casa8/4.jpg",
        "images/imoveis/cesar/venda/casa8/5.jpg",
        "images/imoveis/cesar/venda/casa8/6.jpg",
        "images/imoveis/cesar/venda/casa8/7.jpg",
        "images/imoveis/cesar/venda/casa8/8.jpg",
        "images/imoveis/cesar/venda/casa8/9.jpg",
        "images/imoveis/cesar/venda/casa8/10.jpg",
        "images/imoveis/cesar/venda/casa8/11.jpg",

      ],
      //lat: -23.3953,
      //lng: -49.7232,

    },



    {
      id: "casa9v",
      codRef: "C_009",
      procura: "casa", // ou "terreno", "rural", etc.
      tipo: "venda",
      titulo: "Casa moderna a venda",
      descricao: "Documentação Ok.",
      endereco: "Residencial Lê Blanc",
      valor: 420000,
      construcao: 110,          // << NOVO: m² de construção
      area: 165,
      banheiros: 2,
      churrasqueira: "Sim",
      cozinhas: 1,
      quartos: 3,
      quintal: "Sim",
      piscina: false,
      salas: 1,
      suite: "1",
      vagas: 2,
      corretores: ["Cesar Melo - 38.105 F"],
      telefone: "43 99678-9652",  // Corretor ou propretario
      imagens: [
        "images/imoveis/cesar/venda/casa9/1.jpg",
        "images/imoveis/cesar/venda/casa9/2.jpg",
        "images/imoveis/cesar/venda/casa9/3.jpg",
        "images/imoveis/cesar/venda/casa9/4.jpg",
        "images/imoveis/cesar/venda/casa9/5.jpg",
        "images/imoveis/cesar/venda/casa9/6.jpg",
        "images/imoveis/cesar/venda/casa9/7.jpg",
        "images/imoveis/cesar/venda/casa9/8.jpg",
        "images/imoveis/cesar/venda/casa9/9.jpg",


      ],

    },


    {
      id: "casa10v",
      codRef: "C_010",
      procura: "casa", // ou "terreno", "rural", etc.
      tipo: "venda",
      titulo: "Apartamento a Venda, Condominio Alvorada",
      descricao: "Condominio fechado, Aceita financiamento, Guarda roupa e cabiceira planejado e Documentação Ok.",
      endereco: "Residencial Lê Blanc",
      valor: 250000,
      construcao: 75,          // << NOVO: m² de construção
      //area: 165,
      banheiros: 1,
      churrasqueira: "Sim",
      cozinhas: 1,
      quartos: 3,
      quintal: "Sim",
      piscina: false,
      salas: 1,
      suite: "Não",
      vagas: 2,
      corretores: ["Cesar Melo - 38.105 F"],
      telefone: "43 99678-9652",  // Corretor ou propretario
      imagens: [
        "images/imoveis/cesar/venda/casa10/1.jpg",
        "images/imoveis/cesar/venda/casa10/2.jpg",
        "images/imoveis/cesar/venda/casa10/3.jpg",
        "images/imoveis/cesar/venda/casa10/4.jpg",
        "images/imoveis/cesar/venda/casa10/5.jpg",
        "images/imoveis/cesar/venda/casa10/6.jpg",
        "images/imoveis/cesar/venda/casa10/7.jpg",
        "images/imoveis/cesar/venda/casa10/8.jpg",
        "images/imoveis/cesar/venda/casa10/9.jpg",
        "images/imoveis/cesar/venda/casa10/10.jpg",
        "images/imoveis/cesar/venda/casa10/11.jpg",
        "images/imoveis/cesar/venda/casa10/12.jpg",
        "images/imoveis/cesar/venda/casa10/13.jpg",
        "images/imoveis/cesar/venda/casa10/14.jpg",


      ],

    },

    {
      id: "casa11v",
      codRef: "C_011",
      procura: "casa", // ou "terreno", "rural", etc.
      tipo: "venda",
      titulo: "Casa recém construída",
      descricao: "Casa Nova com piscina, Portão Eletronico, Sala ampla com porta pivotante, Aceita Financiamento de TODOS OS BANCOS, Documentação Ok.",
      endereco: "Residencial Murador ",
      valor: 500000,
      construcao: 138,          // << NOVO: m² de construção
      area: 180,
      banheiros: 2,
      churrasqueira: "Sim",
      cozinhas: 1,
      quartos: 3,
      quintal: "Sim",
      piscina: "Sim",
      salas: 1,
      suite: "1",
      vagas: 2,
      corretores: ["Cesar Melo - 38.105 F"],
      telefone: "43 99678-9652",  // Corretor ou propretario
      imagens: [
        "images/imoveis/cesar/venda/casa11/1.jpg",
        "images/imoveis/cesar/venda/casa11/2.jpg",
        "images/imoveis/cesar/venda/casa11/3.jpg",
        "images/imoveis/cesar/venda/casa11/4.jpg",
        "images/imoveis/cesar/venda/casa11/5.jpg",
        "images/imoveis/cesar/venda/casa11/6.jpg",
        "images/imoveis/cesar/venda/casa11/7.jpg",
        "images/imoveis/cesar/venda/casa11/8.jpg",
        "images/imoveis/cesar/venda/casa11/9.jpg",
        "images/imoveis/cesar/venda/casa11/10.jpg",
        "images/imoveis/cesar/venda/casa11/11.jpg",
        "images/imoveis/cesar/venda/casa11/12.jpg",



      ],

    },




    {
      id: "casa13v",
      codRef: "C_013",
      tipo: "venda",
      procura: "casa", // ou "terreno", "rural", etc.
      quartos: 4,
      valor: 3000000,
      piscina: "Sim",
      churrasqueira: "Sim",
      vagas: 8,
      corretores: ["Rafael Bandeira - 29.802"],
      titulo: "Imóvel no Residencial Garden Club",
      descricao: "Piscina privativa com espaço gourmet, Living espaçoso e integrado, Acabamentos de alto padrão, Iluminação natural e ambientes climatizados. Documentação OK",
      endereco: "Residencial Garden Club - Carlópolis",
      suite: "1",
      banheiros: 4,
      salas: 2,
      cozinhas: 1,
      area: 1000,
      //construcao: 120,          // << NOVO: m² de construção
      quintal: "Sim",
      telefone: "43 99686-4716", // Corretor ou propretario
      imagens: [

        "images/imoveis/rafaelBandeira/venda/casa2/2.jpg",
        "images/imoveis/rafaelBandeira/venda/casa2/3.jpg",
        "images/imoveis/rafaelBandeira/venda/casa2/4.jpg",
        "images/imoveis/rafaelBandeira/venda/casa2/5.jpg",
        "images/imoveis/rafaelBandeira/venda/casa2/6.jpg",
        "images/imoveis/rafaelBandeira/venda/casa2/7.jpg",
        "images/imoveis/rafaelBandeira/venda/casa2/8.jpg",
        "images/imoveis/rafaelBandeira/venda/casa2/9.jpg",
        "images/imoveis/rafaelBandeira/venda/casa2/10.jpg",
        "images/imoveis/rafaelBandeira/venda/casa2/11.jpg",
        "images/imoveis/rafaelBandeira/venda/casa2/12.jpg",
        "images/imoveis/rafaelBandeira/venda/casa2/13.jpg",
        "images/imoveis/rafaelBandeira/venda/casa2/14.jpg",
        "images/imoveis/rafaelBandeira/venda/casa2/15.jpg",
        "images/imoveis/rafaelBandeira/venda/casa2/16.jpg",
      ],
      //lat: -23.3953,
      //lng: -49.7232,

    },



    {
      id: "casa14v",
      codRef: "C_014",
      tipo: "venda",
      procura: "casa",
      titulo: "Casa à venda no Residencial Itália",
      quartos: 3,
      valor: 400000,
      piscina: false,
      churrasqueira: false,
      vagas: 2,
      corretores: ["Luiz Vilas Boas - 52.194"],
      descricao: "Imóvel moderno e bem distribuído, localizado em bairro tranquilo e valorizado. Aceita veículo na negociação.",
      endereco: "Residencial Itália",
      suite: "1",
      banheiros: 1,
      salas: 1,
      cozinhas: 1,
      area: 180,
      construcao: 78,          // << NOVO: m² de construção
      quintal: "Sim",
      telefone: "43 98803-4095", // Corretor ou propretario
      imagens: [
        "images/imoveis/luiz/venda/casa1/1.jpg",
        "images/imoveis/luiz/venda/casa1/2.jpg",
        "images/imoveis/luiz/venda/casa1/3.jpg",
        "images/imoveis/luiz/venda/casa1/4.jpg",
        "images/imoveis/luiz/venda/casa1/5.jpg",
        "images/imoveis/luiz/venda/casa1/6.jpg",
        "images/imoveis/luiz/venda/casa1/7.jpg",
        "images/imoveis/luiz/venda/casa1/8.jpg",
        "images/imoveis/luiz/venda/casa1/9.jpg",
        "images/imoveis/luiz/venda/casa1/10.jpg",
        "images/imoveis/luiz/venda/casa1/11.jpg",

      ],


    },

    {
      id: "casa15v",
      codRef: "C_015",
      tipo: "venda",
      procura: "casa",
      titulo: "Casa no Residencial Novo Horizonte III",
      quartos: 2,
      valor: 215000,
      piscina: false,
      churrasqueira: false,
      vagas: 1,
      corretores: ["Luiz Vilas Boas - 52.194"],
      descricao: "Imóvel pronto para morar, bem planejado, terreno de esquina. Fica em um bairro tranquilo e valorizado, ideal para sair do aluguel. Aceita financiamento e negociações com carro ou terreno como parte do pagamento.",
      endereco: "Novo Horizonte III",
      suite: "Não",
      banheiros: 1,
      salas: 1,
      cozinhas: 1,
      area: 117,
      construcao: 49,          // << NOVO: m² de construção
      quintal: "Sim",
      telefone: "43 98803-4095", // Corretor ou propretario
      imagens: [
        "images/imoveis/luiz/venda/casa2/01.jpeg",
        "images/imoveis/luiz/venda/casa2/02.jpeg",
        "images/imoveis/luiz/venda/casa2/03.jpeg",
        "images/imoveis/luiz/venda/casa2/04.jpeg",
        "images/imoveis/luiz/venda/casa2/05.jpeg",
        "images/imoveis/luiz/venda/casa2/04.jpeg",
        "images/imoveis/luiz/venda/casa2/07.jpeg",
        "images/imoveis/luiz/venda/casa2/08.jpeg",
        "images/imoveis/luiz/venda/casa2/09.jpeg",
        "images/imoveis/luiz/venda/casa2/10.jpeg",
        "images/imoveis/luiz/venda/casa2/11.jpeg",

      ],


    },

    {
      id: "casa16v",
      codRef: "C_016",
      procura: "casa", // ou "terreno", "rural", etc.
      tipo: "venda",
      titulo: "Casa Nova à venda",
      descricao: "Ao lado da área de laser com um lago e um lindo pôr do sol, Documentação Ok.",
      endereco: "Residencial Vila Ray (horizonte 3)",
      valor: 280000,
      construcao: 56,          // << NOVO: m² de construção
      area: "180 m²",
      banheiros: 1,
      cozinhas: 1,
      quartos: 2,
      quintal: "Sim",
      piscina: "Não",
      salas: 1,
      vagas: 2,
      corretores: ["Cesar Melo - 38.105 F"],
      telefone: "43 99678-9652",  // Corretor ou propretario
      imagens: [
        "images/imoveis/cesar/venda/casa12/1.jpg",
        "images/imoveis/cesar/venda/casa12/2.jpg",
        "images/imoveis/cesar/venda/casa12/3.jpg",
        "images/imoveis/cesar/venda/casa12/4.jpg",
        "images/imoveis/cesar/venda/casa12/5.jpg",
        "images/imoveis/cesar/venda/casa12/6.jpg",
        "images/imoveis/cesar/venda/casa12/7.jpg",
        "images/imoveis/cesar/venda/casa12/8.jpg",
        "images/imoveis/cesar/venda/casa12/9.jpg",





      ],

    },


    {
      id: "casa17v",
      codRef: "C_017",
      procura: "casa", // ou "terreno", "rural", etc.
      tipo: "venda",
      titulo: "Sua Nova Casa de Luxo Espera por Você!",
      descricao: "Descubra um refúgio moderno com a vista que você sempre sonhou, Casa Inteligente, toda equipada para sua moradia. Documentação Ok.",
      endereco: "Ilha Bella",
      valor: 2500000,
      construcao: 306,          // << NOVO: m² de construção
      area: 453.33,
      banheiros: 6,
      churrasqueira: "Sim",
      cozinhas: 1,
      quartos: 4,
      quintal: "Sim",
      piscina: "Sim",
      salas: 1,
      suite: "4",
      vagas: 4,
      corretores: ["Cesar Melo - 38.105 F"],
      telefone: "43 99678-9652",  // Corretor ou propretario
      imagens: [
        "images/imoveis/cesar/venda/casa17/1.jpg",
        "images/imoveis/cesar/venda/casa17/2.jpg",
        "images/imoveis/cesar/venda/casa17/3.jpg",
        "images/imoveis/cesar/venda/casa17/4.jpg",
        "images/imoveis/cesar/venda/casa17/5.jpg",
        "images/imoveis/cesar/venda/casa17/6.jpg",
        "images/imoveis/cesar/venda/casa17/7.jpg",
        "images/imoveis/cesar/venda/casa17/8.jpg",
        "images/imoveis/cesar/venda/casa17/9.jpg",
        "images/imoveis/cesar/venda/casa17/10.jpg",
        "images/imoveis/cesar/venda/casa17/11.jpg",
        "images/imoveis/cesar/venda/casa17/12.jpg",
        "images/imoveis/cesar/venda/casa17/13.jpg",



      ],

    },




    {
      id: "casa18v",
      codRef: "C_018",
      procura: "casa", // ou "terreno", "rural", etc.
      tipo: "venda",
      titulo: "Casa alto padrao na Ilha Bela",
      descricao: "Toda Fechada no Blindex<br>Otima oportuindade para tambem ser mais uma fonte de renda!",
      endereco: "Ilha Bella",
      valor: 950000,
      construcao: 270,          // << NOVO: m² de construção
      area: 514,
      banheiros: 2,
      churrasqueira: "Sim",
      cozinhas: 1,
      quartos: 4,
      quintal: "Sim",
      piscina: "Sim",
      salas: 1,
      suite: "1",
      vagas: 4,
      corretores: ["Cesar Melo - 38.105 F"],
      telefone: "43 99678-9652",  // Corretor ou propretario
      imagens: [
        "images/imoveis/cesar/venda/casa/casa18/1.jpg",
        "images/imoveis/cesar/venda/casa/casa18/2.jpg",
        "images/imoveis/cesar/venda/casa/casa18/3.jpg",
        "images/imoveis/cesar/venda/casa/casa18/4.jpg",





      ],

    },










    // SITIO
    /*
        {
          id: "sitio1v",
          codRef: "ST_001",
          tipo: "venda",
          procura: "sitio",
          titulo: "Sítio à Beira da Represa",    
          valor: 600000,    
          corretores: ["Luiz Vilas Boas - 52.194"],
          descricao: "Sítio com acesso exclusivo à represa, linha elétrica instalada e documentação pronta para transferência. Localizado a menos de 6 km do centro de Carlópolis, ideal para lazer, investimento ou construção",
       
          area: "22.550 m²",
    
    
          telefone: "43 98803-4095", // Corretor ou propretario
          imagens: [
            "images/imoveis/luiz/venda/sitio1/1.jpg",
            "images/imoveis/luiz/venda/sitio1/2.jpg",
            "images/imoveis/luiz/venda/sitio1/3.jpg",
            "images/imoveis/luiz/venda/sitio1/4.jpg",
            "images/imoveis/luiz/venda/sitio1/5.jpg",
            "images/imoveis/luiz/venda/sitio1/6.jpg",
    
          ],
    
    
        },
    
    
    */

    // CHACARA

    {
      id: "chacara1",
      codRef: "Ch_001",
      procura: "chacara", // ou "terreno", "rural", etc.
      tipo: "venda",
      titulo: "Vende - se chácara em Carlópolis a 5 Km da Cidade",
      descricao: "- Nascente de água <br>- 03 açudes <br> - 800 de pés de goiabas IRRIGADOS <br>- Reserva de mata bem preservada<Br> - Área de lazer com fogão de lenha<Br> - Entrada fechada de muro, com portão<br> - Vista para cidade",
      endereco: "São Pedro",
      valor: 850000,
      // construcao: 306,          // << NOVO: m² de construção
      area: "30.000 mts",
      banheiros: 2,
      churrasqueira: "Sim",
      cozinhas: 1,
      quartos: 2,
      quintal: "Sim",
      piscina: "Sim",
      salas: 1,
      suite: "0",
      //vagas: 4,
      corretores: ["Cesar Melo - 38.105 F"],
      telefone: "43 99678-9652",  // Corretor ou propretario
      imagens: [
        "images/imoveis/cesar/venda/chacara/chacara1/1.jpg",
        "images/imoveis/cesar/venda/chacara/chacara1/2.jpg",
        "images/imoveis/cesar/venda/chacara/chacara1/3.jpg",
        "images/imoveis/cesar/venda/chacara/chacara1/4.jpg",
        "images/imoveis/cesar/venda/chacara/chacara1/5.jpg",
        "images/imoveis/cesar/venda/chacara/chacara1/6.jpg",
        "images/imoveis/cesar/venda/chacara/chacara1/7.jpg",
        "images/imoveis/cesar/venda/chacara/chacara1/8.jpg",
        "images/imoveis/cesar/venda/chacara/chacara1/9.jpg",
        "images/imoveis/cesar/venda/chacara/chacara1/10.jpg",



      ],

    },




    // TERRENOS 
    {
      id: "ter2",
      codRef: "T_002",
      tipo: "venda",
      procura: "terreno", // ou "terreno", "rural", etc.
      titulo: "Terreno - Novo horizonte 1",
      descricao: "Ideal para quem deseja investir em moradia ou construção de aluguel",
      endereco: "Novo horizonte 1",
      area: 180,
      valor: 65000,
      telefone: "43 99678-9652",

      imagens: ["images/imoveis/cesar/venda/terreno/3.jpg",],
      corretores: ["Cesar Melo - 38.105 F"],

    },

    {
      id: "ter3",
      codRef: "T_003",
      tipo: "venda",
      procura: "terreno", // ou "terreno", "rural", etc.
      titulo: "Terreno em Condomínio - Lagoa azul 2",
      descricao: "Vista privilegiada e excelente topografia para construção de alto padrão",
      endereco: "Lagoa azul 2",
      area: 388,
      valor: 120000,
      telefone: "43 99686-4716",
      imagens: ["images/imoveis/rafaelBandeira/venda/terreno/1.jpg",
        "images/imoveis/rafaelBandeira/venda/terreno/2.jpg",
        "images/imoveis/rafaelBandeira/venda/terreno/3.jpg",
        "images/imoveis/rafaelBandeira/venda/terreno/4.jpg",
        "images/imoveis/rafaelBandeira/venda/terreno/5.jpg",
      ],
      corretores: ["Rafael Bandeira - 29.802"],

    },

    {
      id: "ter4",
      codRef: "T_004",
      tipo: "venda",
      procura: "terreno", // ou "terreno", "rural", etc.
      titulo: "Terreno - Residencial Itália ll",
      descricao: "Ideal para quem busca tranquilidade e qualidade de vida sem abrir mão da praticidade",
      endereco: "Próximo ao mercado carriel",
      area: 336,
      valor: 185000,
      telefone: "43 99678-9652",
      imagens: [
        "images/imoveis/cesar/venda/terreno/terreno1/1.jpg",
        "images/imoveis/cesar/venda/terreno/terreno1/2.jpg",

      ],
      corretores: ["Cesar Melo - 38.105 F"],

    },




    //Modelo
    {
      id: "ter5",
      codRef: "T_005",
      tipo: "venda",
      procura: "terreno", // ou "terreno", "rural", etc.
      titulo: "Terreno na Principal no Murador",
      descricao: "Próxima as Igrejas Quadrangular, Assembleia de Deus, Posto de Saúde<br>Rua já asfaltada com excelente localização para investimento, residência ou comercio.",
      endereco: "Murador",
      area: "250 m² (10x25)",
      valor: 85000,
      telefone: "43 99637-2328",
      imagens: [
        "images/imoveis/pauloTobias/venda/terreno/1.jpg",
        "images/imoveis/pauloTobias/venda/terreno/2.jpg",
        "images/imoveis/pauloTobias/venda/terreno/3.jpg",
        "images/imoveis/pauloTobias/venda/terreno/4.jpg",

      ],


    },



    {
      id: "ter6",
      codRef: "T_006",
      tipo: "venda",
      procura: "terreno", // ou "terreno", "rural", etc.
      titulo: "Terreno no Murador",
      descricao: "Excelente localização para investimento ou residência.<Br> Terreno quitado.",
      endereco: "Murador",
      area: "180 m² (10x18)",
      valor: 52000,
      telefone: "43 99637-2328",
      proprietario: "Paulo Tobia",
      imagens: [
        "images/imoveis/pauloTobias/venda/terreno/terreno2/1.jpg",
        "images/imoveis/pauloTobias/venda/terreno/terreno2/2.jpg",

      ],


    },


    {
      id: "ter7",
      codRef: "T_007",
      tipo: "venda",
      procura: "terreno", // ou "terreno", "rural", etc.
      titulo: "Terreno bem localizado no bairro Novo Horizonte 3",
      descricao: "Excelente localização para investimento ou residência.<Br>Lote 04 da quadra 05 <br> Terreno quitado.<br>Obs: Pego carro no negócio!",
      endereco: "Novo Horizonte 3",
      area: "234 m² (13x18)",
      valor: 70000,
      proprietario: "Vitor Tobia",
      telefone: "43 99630-1627",
      imagens: [
        "images/imoveis/vitorTobia/venda/terreno/terreno1/1.jpg",
        "images/imoveis/vitorTobia/venda/terreno/terreno1/2.jpg",
        "images/imoveis/vitorTobia/venda/terreno/terreno1/3.jpg",


      ],


    },


    {
      id: "ter8",
      codRef: "T_008",
      tipo: "venda",
      procura: "terreno", // ou "terreno", "rural", etc.
      titulo: "Terreno no bairro Novo Horizonte 4",
      descricao: "Documento Ok",
      endereco: "Novo Horizonte 4",
      area: "180 m² (10x18)",
      valor: 50000,
      telefone: "43 99975-7785",
      proprietario: "Fabio Tobia",
      imagens: [
        "images/imoveis/fabioTobia/venda/terreno/terreno1/1.jpg",
      ],


    },



    {
      id: "ter9",
      codRef: "T_009",
      procura: "terreno", // ou "terreno", "rural", etc.   
      tipo: "venda",
      titulo: "Terreno de esquina à venda no Residencial Novo Horizonte II",
      descricao: "Terreno murado, pronto para iniciar a obra, com padrão de energia elétrica e água já instalados",
      endereco: "Residencial Novo Horizonte II",
      area: "234m² 13x18",
      valor: 95000,
      telefone: "43 98803-4095",
      corretores: ["Luiz Vilas Boas - 52.194"],
      imagens: [

        "images/imoveis/luiz/venda/terreno1/01.jpg",
        "images/imoveis/luiz/venda/terreno1/02.jpg",
        "images/imoveis/luiz/venda/terreno1/03.jpg",
        "images/imoveis/luiz/venda/terreno1/04.jpg",

      ],


    },


    {
      id: "ter10",
      codRef: "T_010",
      procura: "terreno", // ou "terreno", "rural", etc.   
      tipo: "venda",
      titulo: "Terreno à venda no Residencial Amaral",
      descricao: "Terreno plano e acima do nível da rua, localizado em um bairro tranquilo e em crescimento, oferece um excelente custo-benefício. Aceita veículo como parte do pagamento.",
      endereco: "Residencial Amaral",
      area: "242m² 11x22",
      valor: 87000,
      telefone: "43 98803-4095",
      corretores: ["Luiz Vilas Boas - 52.194"],
      imagens: [

        "images/imoveis/luiz/venda/terreno2/01.jpeg",
        "images/imoveis/luiz/venda/terreno2/02.jpeg",
        "images/imoveis/luiz/venda/terreno2/03.jpeg",
        "images/imoveis/luiz/venda/terreno2/04.jpeg",

      ],


    },

    {
      id: "ter11",
      codRef: "T_011",
      procura: "terreno", // ou "terreno", "rural", etc.   
      tipo: "venda",
      titulo: "Terreno à venda no Residencial Itália",
      descricao: "Terreno localizado em uma região urbana valorizada, oferece ótimo potencial de aproveitamento, fácil acesso e excelente perspectiva de valorização. Uma oportunidade para quem deseja planejar o futuro em um imóvel bem localizado.",
      endereco: "Residencial Itália",
      area: "360m² 14x25",
      valor: 165000,
      telefone: "43 98803-4095",
      corretores: ["Luiz Vilas Boas - 52.194"],
      imagens: [

        "images/imoveis/luiz/venda/terreno3/01.jpeg",
        "images/imoveis/luiz/venda/terreno3/02.jpeg",
        "images/imoveis/luiz/venda/terreno3/03.jpeg",
        "images/imoveis/luiz/venda/terreno3/04.jpeg",
        "images/imoveis/luiz/venda/terreno3/05.jpeg",
        "images/imoveis/luiz/venda/terreno3/06.jpeg",
        "images/imoveis/luiz/venda/terreno3/07.jpeg",

      ],


    },






    {
      id: "ter12",
      codRef: "T_012",
      procura: "terreno", // ou "terreno", "rural", etc.   
      tipo: "venda",
      titulo: "Terreno à venda no Residencial Jardim Primavera",
      descricao: "Terreno amplo com formato diferenciado, ideal para um projeto moderno. Excelente localização, perfeito para construção de casa térrea, sobrado ou investimento.",
      endereco: "Residencial Jardim Primavera",
      area: "387m²",
      valor: 135000,
      telefone: "43 98803-4095",
      corretores: ["Luiz Vilas Boas - 52.194"],
      imagens: [

        "images/imoveis/luiz/venda/terreno4/01.jpeg",
        "images/imoveis/luiz/venda/terreno4/02.jpeg",
        "images/imoveis/luiz/venda/terreno4/03.jpeg",
        "images/imoveis/luiz/venda/terreno4/04.jpeg",
        "images/imoveis/luiz/venda/terreno4/05.jpeg",
        "images/imoveis/luiz/venda/terreno4/06.jpeg",


      ],


    },




    {
      id: "ter13",
      codRef: "T_013",
      procura: "terreno", // ou "terreno", "rural", etc.   
      tipo: "venda",
      titulo: "Terreno de esquina com vista para represa – Residencial Amaral II",
      descricao: "Terreno de esquina localizado no Residencial Amaral II, um dos bairros mais desejados de Carlópolis, com vista para a represa, ideal para projetos modernos de médio e alto padrão. Um lote que une exclusividade, qualidade de vida e potencial de valorização.",
      endereco: "Residencial Amaral II",
      area: "308m² - 14x22",
      valor: 120000,
      telefone: "43 98803-4095",
      corretores: ["Luiz Vilas Boas - 52.194"],
      imagens: [

        "images/imoveis/luiz/venda/terreno5/01.jpeg",
        "images/imoveis/luiz/venda/terreno5/02.jpeg",
        "images/imoveis/luiz/venda/terreno5/03.jpeg",
        "images/imoveis/luiz/venda/terreno5/04.jpeg",
        "images/imoveis/luiz/venda/terreno5/05.jpeg",

      ],
    },




    {
      id: "ter14",
      codRef: "T_014",
      status: "vendido",
      procura: "terreno", // ou "terreno", "rural", etc.   
      tipo: "venda",
      titulo: "Terreno à venda no Residencial Vila Ray",
      descricao: "Terreno de esquina com ótima localização, por  valor abaixo de mercado, ideal para quem busca comprar bem e lucrar com a valorização.",
      endereco: "Residencial Vila Ray",
      area: "234m² - 13x18",
      valor: 60000,
      telefone: "43 98803-4095",
      corretores: ["Luiz Vilas Boas - 52.194"],
      imagens: [

        "images/imoveis/luiz/venda/terreno6/01.jpg",
        "images/imoveis/luiz/venda/terreno6/02.jpg",


      ],
    },

    {
      id: "ter15",
      codRef: "T_015",
      tipo: "venda",
      procura: "terreno", // ou "terreno", "rural", etc.
      titulo: "Terreno 500m2 Garden Residence",
      descricao: "Documentação ok",
      endereco: "Garden Residence",
      area: "11x34",
      valor: 230000,
      telefone: "43 99678-9652",
      imagens: [
        "images/imoveis/cesar/venda/terreno/terreno3/1.jpg",
        "images/imoveis/cesar/venda/terreno/terreno3/2.jpg",
        "images/imoveis/cesar/venda/terreno/terreno3/3.jpg",

      ],
      corretores: ["Cesar Melo - 38.105 F"],

    },


    {
      id: "ter16",
      codRef: "T_016",
      tipo: "venda",
      procura: "terreno", // ou "terreno", "rural", etc.
      titulo: "Chácara com acesso a represa",
      descricao: " - Escriturada e registrada<BR> - Com energia enfrente <BR>- 7km da cidade",
      endereco: "Água da Limeira",
      area: "3000 m²",
      valor: 350000,
      telefone: "43 99678-9652",
      imagens: [
        "images/imoveis/cesar/venda/terreno/terreno4/1.jpg",
        "images/imoveis/cesar/venda/terreno/terreno4/2.jpg",
        "images/imoveis/cesar/venda/terreno/terreno4/3.jpg",
        "images/imoveis/cesar/venda/terreno/terreno4/4.jpg",
        "images/imoveis/cesar/venda/terreno/terreno4/5.jpg",
        "images/imoveis/cesar/venda/terreno/terreno4/6.jpg",

      ],
      corretores: ["Cesar Melo - 38.105 F"],

    },


    /////////////////// GALPAO

    //Modelo
    {
      id: "galpao1",
      codRef: "G_001",
      tipo: "venda",
      procura: "galpao", // ou "terreno", "rural", etc.
      titulo: "Galpão - Residencial Murador",
      descricao: "Galpão amplo, ideal para indústria, depósito ou centro de distribuição",
      endereco: "Residencial Murador",
      banheiros: 1,
      outros: "Mezanino",
      escritorio: "Sim",
      area: 300,
      valor: 600000,
      telefone: "43 99678-9652",
      imagens: [
        "images/imoveis/cesar/venda/galpao/galpao1/1.jpg",
        "images/imoveis/cesar/venda/galpao/galpao1/2.jpg",
        "images/imoveis/cesar/venda/galpao/galpao1/3.jpg",
        "images/imoveis/cesar/venda/galpao/galpao1/4.jpg",

        "images/imoveis/cesar/venda/galpao/galpao1/5.jpg",
        "images/imoveis/cesar/venda/galpao/galpao1/6.jpg",
      ],
      corretores: ["Cesar Melo - 38.105 F"],

    },


    //Modelo
    {
      id: "galpao2",
      codRef: "G_002",
      tipo: "aluguel",
      procura: "galpao", // ou "terreno", "rural", etc.
      titulo: "Galpão - Residencial Murador",
      descricao: "Galpão amplo, ideal para indústria, depósito ou centro de distribuição",
      endereco: "Residencial Murador",
      banheiros: 1,
      outros: "Mezanino",
      escritorio: "Sim",
      area: 300,
      valor: 5000,
      telefone: "43 99678-9652",
      imagens: [
        "images/imoveis/cesar/venda/galpao/galpao1/1.jpg",
        "images/imoveis/cesar/venda/galpao/galpao1/2.jpg",
        "images/imoveis/cesar/venda/galpao/galpao1/3.jpg",
        "images/imoveis/cesar/venda/galpao/galpao1/4.jpg",

        "images/imoveis/cesar/venda/galpao/galpao1/5.jpg",
        "images/imoveis/cesar/venda/galpao/galpao1/6.jpg",
      ],
      corretores: ["Cesar Melo - 38.105 F"],

    },


    // GALPAO

    //Modelo
    {
      id: "galpao3",
      codRef: "G_003",
      tipo: "venda",
      procura: "galpao", // ou "terreno", "rural", etc.
      titulo: "Galpão de 180m2",
      descricao: "Telhado com isolação térmica e acústica Estrutura de madeira tratada para mezanino ",
      endereco: "Novo horizonte 1",
      area: 180,
      valor: 270000,
      telefone: "43 99678-9652",
      banheiros: 2,
      imagens: [

        "images/imoveis/cesar/venda/galpao/galpao2/1.jpg",
        "images/imoveis/cesar/venda/galpao/galpao2/2.jpg",
        "images/imoveis/cesar/venda/galpao/galpao2/3.jpg",
        "images/imoveis/cesar/venda/galpao/galpao2/4.jpg",
        "images/imoveis/cesar/venda/galpao/galpao2/5.jpg",

      ],
      corretores: ["Cesar Melo - 38.105 F"],

    },



    /*
        {
          id: "casa1a",
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
          telefone: "43 99678-9652",
          imagens: [ "images/imoveis/cesar/aluguel/2.jpg", "images/imoveis/cesar/aluguel/3.jpg"],
          descricao: "Apartamento novo, bem ventilado e com ótima vista.",
          suite: "Sim",
          quintal: "Sim",
           procura: "casa", // ou "terreno", "rural", etc.
          corretores: ["Rubao - 11.111 F"],
          construcao: 68,           // << NOVO
        },
    
    
    
    
        */
  ];




  /// C



  // monta página
  function mostrarImoveisV2() {
    if (location.hash !== "#imoveis") location.hash = "#imoveis";

    const area = document.querySelector(".content_area");
    area.innerHTML = `
    <div class="page-header">
      <h2 >🏠 Imóveis</h2>
      <i class="fa-solid fa-share-nodes share-btn"
         onclick="compartilharPagina('#imoveis','Imóveis em Carlópolis','Encontre imóveis disponíveis!')"></i>
    </div>



    <div class="imoveis-wrap">
  <!-- Painel de filtros -->
  <aside id="filtrosImoveis" class="im-filtros painel-filtros">

    <div class="topbar">
      <h4 class="filtro-titulo">Filtrar</h4>

      <!-- Mantém o mesmo checkbox -->
      <label class="switch">
        <input type="checkbox" id="somenteDisponiveis">
        <span class="track"><span class="thumb"></span></span>
        <span>Disponíveis</span>
      </label>
    </div>

    <div class="grid-filtros">
      <div class="campo">
        <label for="imTipo">Tipo de Negociação</label>
        <select id="imTipo">
          <option value="">Todos</option>
          <option value="aluguel">Aluguel</option>
          <option value="venda">Venda</option>
        </select>
      </div>

      <div class="campo">
        <label for="ordenacaoImoveis">Ordenar por</label>
        <select id="ordenacaoImoveis">
          <option value="">Padrão</option>
          <!-- <option value="disponiveis">Disponíveis primeiro</option> -->
          <option value="preco_asc">Preço: Menor → Maior</option>
          <option value="preco_desc">Preço: Maior → Menor</option>
        </select>
      </div>

      <div class="campo">
        <label for="filtroProcura">Procuro por</label>
        <select id="filtroProcura">
          <option value="">Todos</option>
          <option value="casa">Casa</option>
          <option value="chacara">Chacara</option>
          <option value="comercial">Comercial</option>
          <option value="condominio">Condomínio</option>          
          <option value="galpao">Galpão</option>
          <option value="represa">Represa</option>
          <option value="sitio">Sitio</option>
          <option value="terreno">Terreno</option>
        </select>
      </div>

     

      <div class="campo">
        <label for="imPreco">Preço até</label>
        <select id="imPreco">
          <option value="">Sem teto</option>
          <option value="600">R$ 600 (aluguel)</option>
          <option value="1200">R$ 1.200 (aluguel)</option>
          <option value="200000">R$ 200 mil</option>
          <option value="500000">R$ 500 mil</option>
          <option value="1000000">R$ 1 milhão</option>
        </select>
      </div>

       <div class="campo">
        <label for="imQuartos">Qtd de Quartos</label>
        <select id="imQuartos">
          <option value="">Qualquer</option>
          <option value="1">1+</option>
          <option value="2">2+</option>
          <option value="3">3+</option>
          <option value="4">4+</option>
        </select>
      </div>

      <div class="campo">
        <label for="filtroCorretor">Corretor / Imobiliaria</label>
        <select id="filtroCorretor">
          <option value="">Todos</option>
          <!-- opções via JS -->
        </select>
      </div>

      <div class="campo grid-span-2">
        <label>Comodidades <span class="help">(selecione para filtrar)</span></label>
        <div class="chips amenities">
          <!-- Mantém a classe/atributo usados no seu JS -->
          <button type="button" class="chip amenity-chip" data-key="vagas">+2 vagas</button>
          <button type="button" class="chip amenity-chip" data-key="churrasqueira">Churrasqueira</button>
          <button type="button" class="chip amenity-chip" data-key="piscina">Piscina</button>          
          
        </div>
      </div>

      
    </div>
  </aside>

  <!-- Lista/grade de imóveis -->
  <section class="im-grid" id="imGrid"></section>
</div>

<!-- Modal de imagens de imóveis (inalterado) -->
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



    // === Controle visual dos botões de comodidades ===
    document.querySelectorAll('.amenity-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        // Alterna a classe de seleção
        btn.classList.toggle('is-active');
      });
    });

    // 'Somente disponíveis'
    const chkDisp = document.getElementById("somenteDisponiveis");
    if (chkDisp) chkDisp.addEventListener("change", aplicarFiltrosImoveis);

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
    const amen = Array.from(document.querySelectorAll(".amenity-chip.active")).map(c => c.dataset.key);
    const corretorSelecionado = document.getElementById("filtroCorretor")?.value || "";
    const procuraSelecionado = document.getElementById("filtroProcura")?.value || "";
    const somenteDisp = document.getElementById("somenteDisponiveis")?.checked || false;
    const ordenacao = document.getElementById("ordenacaoImoveis")?.value || "";

    const isFechado = (st) => {
      if (!st) return false;
      const s = String(st).toLowerCase();
      return s.includes("vendido") || s.includes("alugado") || s.includes("negociado");
    };

    // 1) FILTRAR
    stateImoveis.filtered = stateImoveis.all.filter(im => {
      const tipoOk = !tipo || im.tipo === tipo;
      const qOk = !q || (im.quartos >= q);
      const pOk = !p || (im.valor <= p);

      const corretorOk =
        !corretorSelecionado ||
        (Array.isArray(im.corretores)
          ? im.corretores.some(c => String(c).toLowerCase().includes(corretorSelecionado.toLowerCase()))
          : String(im.corretor || "").toLowerCase().includes(corretorSelecionado.toLowerCase()));

      const procuraOk =
        !procuraSelecionado ||
        (String(im.procura || "").toLowerCase() === procuraSelecionado.toLowerCase());

      let amenOk = true;
      if (amen.includes("piscina")) amenOk = amenOk && !!im.piscina;
      if (amen.includes("churrasqueira")) amenOk = amenOk && !!im.churrasqueira;
      if (amen.includes("vagas")) amenOk = amenOk && (im.vagas >= 2);

      const disponivelOk = !somenteDisp || !isFechado(im.status);

      return tipoOk && qOk && pOk && corretorOk && procuraOk && amenOk && disponivelOk;
    });

    // 2) ORDENAR
    if (ordenacao === "disponiveis") {
      stateImoveis.filtered.sort((a, b) => {
        const A = isFechado(a.status) ? 1 : 0;
        const B = isFechado(b.status) ? 1 : 0;
        if (A !== B) return A - B; // disponíveis (0) antes de vendidos (1)
        return 0;
      });
    } else if (ordenacao === "preco_asc") {
      stateImoveis.filtered.sort((a, b) => (a.valor || 0) - (b.valor || 0));
    } else if (ordenacao === "preco_desc") {
      stateImoveis.filtered.sort((a, b) => (b.valor || 0) - (a.valor || 0));
    }

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
    // [FOTOS] – abre a galeria E registra clique "fotos"
    // permitir abrir a galeria clicando na imagem ou no botão de lupa
    el.querySelectorAll(".card-imovel .swiper-imovel-mini img, .card-imovel .zoom-thumb").forEach(node => {
      node.addEventListener("click", (ev) => {
        ev.stopPropagation();
        const card = ev.currentTarget.closest(".card-imovel");
        const id = card?.getAttribute("data-id") || ev.currentTarget.getAttribute("data-id");
        if (!id) return;
        const im = stateImoveis.all.find(x => x.id === id);
        if (im) {
          registrarCliqueImovel('fotos', im);   // <<< ADICIONE ESTA LINHA
          abrirModalImoveis(im);
        }
      });
    });




    // WhatsApp – abrir aba imediatamente; registrar em paralelo
    function abrirModalContatoImovel(im) {
      const nomeSalvo = localStorage.getItem("visitante_nome");

      // ✅ Se já existir nome salvo, pula a modal e envia direto
      if (nomeSalvo) {
        enviarWhatsAppImovel(im, nomeSalvo);
        return;
      }

      // remove modais anteriores
      document.querySelectorAll(".im-contato-modal").forEach(m => m.remove());

      const modal = document.createElement("div");
      modal.className = "im-contato-modal";
      modal.innerHTML = `
    <div class="im-contato-box" role="dialog" aria-modal="true">
      <button class="im-contato-close" title="Fechar">&times;</button>
      <h3>Antes de falar no WhatsApp</h3>
      <p>Digite seu nome para eu me apresentar ao corretor:</p>
      <input type="hidden" id="imResponsavel" value="${getResponsavelImovel(im)}"> <!-- NOVO -->
      <label class="im-contato-label" for="imContatoNome">Seu nome</label>
      <input id="imContatoNome" class="im-contato-input" type="text" placeholder="Ex.: Maria Silva" maxlength="40">
      <div class="im-contato-actions">
        <button class="im-contato-cancel">Cancelar</button>
        <button class="im-contato-send">
          <i class="fa-brands fa-whatsapp"></i> Enviar no WhatsApp
        </button>
      </div>
    </div>
  `;
      document.body.appendChild(modal);

      const input = modal.querySelector("#imContatoNome");
      setTimeout(() => input.focus(), 50);

      function fechar() { modal.remove(); }
      modal.addEventListener("click", (e) => { if (e.target === modal) fechar(); });
      modal.querySelector(".im-contato-close").addEventListener("click", fechar);
      modal.querySelector(".im-contato-cancel").addEventListener("click", fechar);

      // botão enviar
      modal.querySelector(".im-contato-send").addEventListener("click", () => {
        let nome = (input.value || "").trim();
        if (!nome) {
          input.focus();
          input.classList.add("im-contato-input--err");
          setTimeout(() => input.classList.remove("im-contato-input--err"), 600);
          return;
        }

        localStorage.setItem("visitante_nome", nome);
        enviarWhatsAppImovel(im, nome);
        fechar();
      });
    }

    // --- Função para abrir WhatsApp com saudação e salvar no Firebase ---
    function enviarWhatsAppImovel(im, nome) {
      const numero = somenteDigitos(im.telefone || "");

      // Saudação (sem “Encontrei seu número no Olá Carlópolis”)
      let saudacao = (typeof gerarMensagemWhatsApp === "function")
        ? (gerarMensagemWhatsApp().trim() || "Olá!")
        : "Olá!";
      saudacao = saudacao.replace(/Encontrei seu numero no Ola Carlopolis\.?/i, "")
        .replace(/Encontrei seu número no Olá Carlópolis\.?/i, "")
        .trim();

      const codigo = im.codRef ? im.codRef : (im.id ? im.id.toUpperCase() : "N/D");
      const msg = `${saudacao ? saudacao + " " : ""}Meu nome é ${nome}. Vi o imóvel "${im.titulo}", cod de ref: ( ${codigo} ) no Olá Carlópolis e gostaria de mais informações.`;
      const url = `https://wa.me/55${numero}?text=${encodeURIComponent(msg)}`;

      // 1) sempre registra o clique do botão (contador)
      try {
        // se você já tem essa função, mantém:
        if (typeof registrarCliqueImovel === "function") {
          registrarCliqueImovel("whatsapp", im).catch(() => { });
        } else if (window.firebase && firebase.database) {
          // fallback simples: soma em imoveisCliquesPorDia/YYYY-MM-DD/<imovelId>/whatsapp
          const hoje = new Date().toISOString().slice(0, 10);
          const ref = firebase.database().ref(`imoveisCliquesPorDia/${hoje}/${im.id}`);
          ref.transaction(cur => {
            const v = cur || {};
            v.whatsapp = (Number(v.whatsapp || 0) + 1);
            if (!v.titulo && im.titulo) v.titulo = im.titulo;


            if (!v.corretor) v.corretor = (typeof getCorretorPrincipal === "function" ? getCorretorPrincipal(im) : (im.corretor || ""));
            if (!v.responsavel) v.responsavel = getResponsavelImovel(im); // <-- NOVO


            return v;
          }).catch(() => { });
        }

        // 2) salva a confirmação com o NOME (para aparecer no relatório)
        salvarContatoImovel(im, nome);

        if (typeof logEventoCliqueImovel === "function") {
          logEventoCliqueImovel("whatsapp", im);
        }
      } catch (e) { }

      // abre o WhatsApp (gesto do usuário)
      window.open(url, "_blank");
    }

    function salvarContatoImovel(im, nome) {
      try {
        if (!window.firebase || !firebase.database) return;
        const hoje = new Date().toISOString().slice(0, 10);
        const ref = firebase.database()
          .ref(`imoveis/contatos/${hoje}/${im.id}`)
          .push();

        ref.set({
          nome: String(nome || "").slice(0, 80),
          imovelId: im.id,
          imovelTitulo: im.titulo || "",
          destinoFone: somenteDigitos(im.telefone || ""),
          corretor: (typeof getCorretorPrincipal === "function" ? getCorretorPrincipal(im) : (im.corretor || "")) || "",
          responsavel: getResponsavelImovel(im), // <-- NOVO: sempre preenche
          pagina: location.href,
          userAgent: navigator.userAgent,
          ts: firebase.database.ServerValue.TIMESTAMP
        }).catch(() => { });
      } catch (e) { }
    }




    // --- Conecta os botões "Falar no WhatsApp" (um único listener por botão)
    el.querySelectorAll("[data-action='whats']").forEach(btn => {
      if (btn.dataset.bindWhats === "1") return; // evita rebind
      btn.dataset.bindWhats = "1";

      btn.addEventListener("click", (ev) => {
        ev.preventDefault();
        const id = ev.currentTarget.getAttribute("data-id");
        const im = stateImoveis.all.find(x => x.id === id);
        if (!im) return;
        abrirModalContatoImovel(im); // aqui NÃO registra clique
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

  } function isTerreno(im) {
    const t = String(im.procura || im.tipoImovel || im.categoria || "").toLowerCase();
    const noTitulo = String(im.titulo || "").toLowerCase().includes("terreno");
    return t === "terreno" || noTitulo;
  }
  function hasNum(v) { return Number.isFinite(Number(v)) && Number(v) > 0; }

  function renderChips(im) {
    const terr = isTerreno(im);
    const chips = [];

    // Para casas/apês (não mostra em terreno se não fizer sentido)
    if (!terr && hasNum(im.quartos)) chips.push(`<div class="spec-chip"><span class="k">Quartos</span><span class="v">${im.quartos}</span></div>`);
    if (!terr && im.suite) chips.push(`<div class="spec-chip chip-mini"><span class="k">Suíte</span><span class="v">${im.suite}</span></div>`);
    if (!terr && hasNum(im.banheiros)) chips.push(`<div class="spec-chip"><span class="k">Banheiros</span><span class="v">${im.banheiros}</span></div>`);
    if (!terr && hasNum(im.vagas)) chips.push(`<div class="spec-chip"><span class="k">Vagas</span><span class="v">${im.vagas}</span></div>`);
    if (!terr && hasNum(im.salas)) chips.push(`<div class="spec-chip"><span class="k">Salas</span><span class="v">${im.salas}</span></div>`);
    if (!terr && hasNum(im.cozinhas)) chips.push(`<div class="spec-chip"><span class="k">Cozinhas</span><span class="v">${im.cozinhas}</span></div>`);
    if (!terr && im.churrasqueira) chips.push(`<div class="spec-chip"><span class="k">Churrasqueira</span><span class="v">${im.churrasqueira}</span></div>`);
    if (!terr && im.piscina) chips.push(`<div class="spec-chip"><span class="k">Piscina</span><span class="v">${im.piscina}</span></div>`);
    if (!terr && im.quintal) chips.push(`<div class="spec-chip chip-mini"><span class="k">Quintal</span><span class="v">${im.quintal}</span></div>`);

    if (!terr && im.escritorio) chips.push(`<div class="spec-chip chip-mini"><span class="k">Escritorio</span><span class="v">${im.escritorio}</span></div>`);
    if (!terr && im.outros) chips.push(`<div class="spec-chip chip-mini"><span class="k">Outros</span><span class="v">${im.outros}</span></div>`);


    // Área (aceita TEXTO ou NÚMERO)
    if (im.area !== undefined && im.area !== null && String(im.area).trim() !== "") {
      const areaStr = hasNum(im.area) ? `${Number(im.area)} m²` : String(im.area);
      chips.push(
        `<div class="spec-chip"><span class="k">Área</span><span class="v">${areaStr} </span></div>`
      );
    }



    // Construção (normalmente não para terreno)
    if (!terr && hasNum(im.construcao)) chips.push(`<div class="spec-chip"><span class="k">Construção</span><span class="v">${Number(im.construcao)} m²</span></div>`);

    return chips.join("");
  }


  function cardImovelHTML(im) {
    const tag = im.tipo; // "venda" | "aluguel"
    const st = (im.status || "").toLowerCase();
    const isFechado = ["vendido", "alugado", "negociado"].includes(st);


    const precoFmt = im.tipo === "aluguel"
      ? `R$ ${Number(im.valor).toLocaleString()} / mês`
      : `R$ ${Number(im.valor).toLocaleString()}`;

    const responsavel = nomeResponsavel(im);




    return `
  <article class="card-imovel ${tag} ${isFechado ? "is-sold" : ""}" data-id="${im.id}" onclick="focarNoMapa && focarNoMapa('${im.id}')">
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

      ${isFechado ? `<div class="ribbon ribbon-${st}">${st.toUpperCase()}</div>` : ""}
      

      <div class="price-pill ${tag}">
        ${im.tipo === "aluguel"
        ? `R$ ${Number(im.valor).toLocaleString()} <span class="pill-sub">/ mês</span>`
        : `R$ ${Number(im.valor).toLocaleString()}`
      }
      </div>
    </div>

   <div class="card-body">
  <div class="card-title">${im.titulo}</div>
  ${im.descricao ? `<div class="descricaoImovel" style="margin-top:8px"><p>${im.descricao}</p></div>` : ""}
  
  <!-- Bairro -->
  <div class="card-addr2">
    <i class="fa-solid fa-map-pin"></i> ${im.endereco}
  </div>

  

  <div class="specs-chips">${renderChips(im)}</div>


      <div class="price-line" style="margin-top:12px">
        <div class="price">${precoFmt}</div>
        <div class="badges">
          ${st && st !== "disponível" ? `<span class="badge">${im.status}</span>` : ""}
        </div>
      </div>
  


      <div class="card-actions">
        <button class="btn-whats" data-action="whats" data-id="${im.id}" ${isFechado ? 'disabled aria-disabled="true"' : ""}>
          <i class="fa-brands fa-whatsapp"></i> Falar no WhatsApp
        </button>
      </div>

   

      ${responsavel ? `<div class="spec-chip chip-mini corretor-banner"><span class="k">Corretor</span><span class="v">${responsavel}</span></div>` : ``}

     <!-- Código de referência -->
  <div class="card-addr2 card-ref"
     style="cursor:pointer"
     onclick="gerarImagemCardImovel(${JSON.stringify(im).replace(/"/g, '&quot;')})">
  <i class="fa-solid fa-hashtag"></i>
  Ref.: ${String(im.codRef || im.id || "").toUpperCase()}
</div>
  </div>

    
  </article>`;
  }






  // ---------- Modal (galeria full) ----------
  function abrirModalImoveis(im) {
    // Remove qualquer modal aberto antes
    const existente = document.querySelector(".im-modal");
    if (existente) existente.remove();

    // Cria e injeta o modal
    const modal = document.createElement("div");
    modal.className = "im-modal";
    modal.innerHTML = `
    <div class="im-modal-content">
      <button class="btn-fechar-modal" title="Fechar">&times;</button>
      <div class="swiper swiper-imovel-full">
        <div class="swiper-wrapper">
          ${im.imagens.map(src => `
            <div class="swiper-slide"><img src="${src}" alt="${im.titulo || ''}"></div>
          `).join("")}
        </div>
        <div class="swiper-pagination"></div>
      </div>
    </div>`;
    document.body.appendChild(modal);

    // Swiper
    new Swiper(".swiper-imovel-full", {
      loop: true,
      pagination: { el: ".swiper-pagination" },
      autoplay: { delay: 3000 },
    });

    // Fechamentos centralizados
    function cleanup() {
      document.removeEventListener("keydown", onEsc);
      modal.remove();
    }
    function onEsc(e) { if (e.key === "Escape") cleanup(); }
    document.addEventListener("keydown", onEsc);

    // fechar no botão × (se existir)
    const btnX = modal.querySelector(".btn-fechar-modal");
    if (btnX) btnX.addEventListener("click", cleanup);

    // fechar quando clicar FORA do conteúdo
    modal.addEventListener("click", (e) => {
      const content = modal.querySelector(".im-modal");
      if (!content || !content.contains(e.target)) {
        cleanup();
      }
    });

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




  // Função que consulta a API ViaCEP
  // ===== CEP: rota #cep + busca por endereço (ViaCEP) =====

  // normaliza acentos p/ ViaCEP
  // ===== CEP: rota #cep + busca por endereço (ViaCEP) [v2 layout] =====
  function stripDiacritics(s) { return String(s || "").normalize("NFD").replace(/\p{Diacritic}/gu, ""); }

  function mostrarConsultaCEP() {
    const area = document.querySelector(".content_area");
    if (location.hash !== "#cep") location.hash = "#cep";
    if (!area) return;

    area.innerHTML = `
    <div class="cep-wrap">
      <h2 class="highlighted">Buscar CEP por endereço</h2>
   
      <div class="cep-card">
       

        <form class="cep-form" id="cepForm">
          <div class="cep-field">
            <label class="cep-label">UF</label>
            <select id="cepUf" class="cep-select">
              <option value="PR" selected>PR</option><option>SP</option><option>RJ</option><option>MG</option><option>SC</option><option>RS</option>
            </select>
            <i class="bx bx-buildings cep-ico"></i>
          </div>
          <div class="cep-field">
            <label class="cep-label">Cidade</label>
            <input id="cepCidade" class="cep-input" type="text" placeholder="Ex.: Carlópolis" value="Carlópolis">
            <i class="bx bx-current-location cep-ico"></i>
          </div>
         
          <div class="cep-field">
            <label class="cep-label">Endereço</label>
            <input id="cepEndereco" class="cep-input" type="text" placeholder="Ex.: Rua Paraná">
            <i class="bx bx-map cep-ico"></i>
          </div>
          <button id="btnBuscarCep" class="cep-btn" type="submit"><i class="bx bx-search"></i>&nbsp;Buscar CEP</button>
        
        </form>

        <div class="cep-tips">Dica: quanto mais específico o logradouro (ex.: “Av. Paraná, Centro”), melhores os resultados.</div>
        <div id="cepStatus" class="cep-status"></div>
        <div id="cepResultados" class="cep-results"></div>
      </div>
    </div>
  `;

    document.getElementById("cepForm").addEventListener("submit", (e) => {
      e.preventDefault(); buscarCepPorEndereco();
    });

    // suporta deep-link: #cep?uf=PR&cidade=Carlópolis&rua=Paraná
    const params = new URLSearchParams(location.hash.split("?")[1] || "");
    if (params.get("rua")) document.getElementById("cepEndereco").value = decodeURIComponent(params.get("rua"));
    if (params.get("cidade")) document.getElementById("cepCidade").value = decodeURIComponent(params.get("cidade"));
    if (params.get("uf")) document.getElementById("cepUf").value = params.get("uf").toUpperCase();
  }

  async function buscarCepPorEndereco() {
    const btn = document.getElementById("btnBuscarCep");
    const out = document.getElementById("cepResultados");
    const stt = document.getElementById("cepStatus");

    const uf = (document.getElementById("cepUf").value || "").trim().toUpperCase();
    let cidade = (document.getElementById("cepCidade").value || "").trim();
    let rua = (document.getElementById("cepEndereco").value || "").trim();

    out.innerHTML = "";
    stt.textContent = "";

    if (!rua || !cidade || !uf) { stt.textContent = "Preencha UF, cidade e logradouro."; return; }

    // skeletons de carregamento
    out.innerHTML = `<div class="cep-skel"></div><div class="cep-skel"></div><div class="cep-skel"></div>`;
    btn.disabled = true;
    stt.textContent = "Buscando…";

    const url = `https://viacep.com.br/ws/${uf}/${encodeURIComponent(stripDiacritics(cidade))}/${encodeURIComponent(stripDiacritics(rua))}/json/`;

    try {
      const resp = await fetch(url);
      const data = await resp.json();

      btn.disabled = false;

      if (!Array.isArray(data) || !data.length || data?.erro) {
        stt.textContent = "Nenhum CEP encontrado para esse endereço.";
        out.innerHTML = "";
        return;
      }

      stt.textContent = `Encontrados ${data.length} resultado(s).`;
      out.innerHTML = data.map((it) => {
        const cep = it.cep || "—";
        const addr = `${it.logradouro || "—"}${it.bairro ? ", " + it.bairro : ""} — ${it.localidade || ""}/${it.uf || ""}`;
        const mapQ = encodeURIComponent(`${it.logradouro || ""}, ${it.localidade || ""} - ${it.uf || ""}`);
        return `
        <div class="cep-card-item">
          <span class="cep-badge">CEP: <b>${cep}</b></span>
          <div class="cep-addr">${addr}</div>
          <div class="cep-actions">
            <button class="cep-copy" data-cep="${cep}" type="button"><i class="bx bx-copy"></i> Copiar CEP</button>
            <a class="cep-map" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${mapQ}">
              <i class="bx bx-map"></i> Ver no mapa
            </a>
          </div>
        </div>
      `;
      }).join("");

      // copiar CEP
      out.querySelectorAll(".cep-copy").forEach(btn => {
        btn.addEventListener("click", () => {
          const val = btn.getAttribute("data-cep") || "";
          navigator.clipboard.writeText(val).then(() => {
            stt.textContent = `CEP ${val} copiado.`;
          }).catch(() => { stt.textContent = "Não consegui copiar o CEP."; });
        });
      });

    } catch (e) {
      console.error("ViaCEP erro:", e);
      btn.disabled = false;
      stt.textContent = "Falha na consulta. Tente novamente.";
      out.innerHTML = "";
    }
  }

  // roteador mínimo p/ #cep
  function rotaCEPIntercept() {
    const h = (location.hash || "").toLowerCase();
    if (h.startsWith("#cep")) {
      document.querySelector(".content_area")?.classList.remove("hidden");
      mostrarConsultaCEP();
      return true;
    }
    return false;
  }
  addEventListener("hashchange", rotaCEPIntercept);
  addEventListener("DOMContentLoaded", rotaCEPIntercept);


  // chama ViaCEP /ws/UF/Cidade/Logradouro/json/
  async function buscarCepPorEndereco() {
    const btn = document.getElementById("btnBuscarCep");
    const out = document.getElementById("cepResultados");
    const stt = document.getElementById("cepStatus");

    const uf = (document.getElementById("cepUf").value || "").trim().toUpperCase();
    let cidade = (document.getElementById("cepCidade").value || "").trim();
    let rua = (document.getElementById("cepEndereco").value || "").trim();

    out.innerHTML = "";
    stt.textContent = "";

    if (!rua || !cidade || !uf) {
      stt.textContent = "Preencha UF, cidade e logradouro.";
      return;
    }

    // ViaCEP não lida bem com acentos; removemos diacríticos
    const cidadeQuery = encodeURIComponent(stripDiacritics(cidade));
    const ruaQuery = encodeURIComponent(stripDiacritics(rua));
    const url = `https://viacep.com.br/ws/${uf}/${cidadeQuery}/${ruaQuery}/json/`;

    btn.disabled = true;
    stt.textContent = "Buscando…";

    try {
      const resp = await fetch(url);
      const data = await resp.json();

      btn.disabled = false;

      if (!Array.isArray(data) || data.length === 0 || data?.erro) {
        stt.textContent = "Nenhum CEP encontrado para esse endereço.";
        return;
      }

      stt.textContent = `Encontrados ${data.length} resultado(s).`;
      out.innerHTML = data.map((it) => {
        const endereco = [it.logradouro, it.bairro, it.localidade, it.uf, it.cep].filter(Boolean).join(", ");
        const mapQ = encodeURIComponent(`${it.logradouro || ""}, ${it.localidade || ""} - ${it.uf || ""}`);
        return `
        <div class="cep-item">
          <b>${it.cep || "—"}</b>
          ${it.logradouro || "—"}<br>
          ${it.bairro || "—"} — ${it.localidade || ""}/${it.uf || ""}<br>
          <a class="map-icon" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${mapQ}">Ver no mapa</a>
        </div>
      `;
      }).join("");

    } catch (err) {
      btn.disabled = false;
      stt.textContent = "Falha na consulta. Tente novamente.";
      console.error("ViaCEP erro:", err);
    }
  }

  // roteador mínimo: integra com o seu hash router existente
  function rotaCEPIntercept() {
    const h = (location.hash || "").toLowerCase();
    if (h.startsWith("#cep")) {
      // garante que a área de conteúdo apareça quando for sublink
      document.querySelector(".content_area")?.classList.remove("hidden");
      mostrarConsultaCEP();
      return true;
    }
    return false;
  }

  // liga o roteador para #cep sem brigar com o restante
  window.addEventListener("hashchange", () => { rotaCEPIntercept(); });
  document.addEventListener("DOMContentLoaded", () => {
    // se o usuário entrar direto em #cep
    rotaCEPIntercept();
  });



  // Função da busca
  function buscarCEP() {
    const cep = document.getElementById("cepInput").value.replace(/\D/g, "");
    const resultado = document.getElementById("resultadoCEP");

    if (cep.length !== 8) {
      resultado.innerHTML = "<p style='color:red'>❌ CEP inválido. Digite 8 números.</p>";
      return;
    }

    resultado.innerHTML = "<p>🔎 Buscando informações...</p>";

    fetch(`https://viacep.com.br/ws/${cep}/json/`)
      .then(r => r.json())
      .then(data => {
        if (data.erro) {
          resultado.innerHTML = "<p style='color:red'>⚠️ CEP não encontrado.</p>";
        } else {
          resultado.innerHTML = `
          <p><b>Logradouro:</b> ${data.logradouro || '-'}</p>
          <p><b>Bairro:</b> ${data.bairro || '-'}</p>
          <p><b>Cidade:</b> ${data.localidade || '-'}</p>
          <p><b>Estado:</b> ${data.uf || '-'}</p>
          <p><b>IBGE:</b> ${data.ibge || '-'}</p>
        `;
        }
      })
      .catch(() => {
        resultado.innerHTML = "<p style='color:red'>⚠️ Erro ao consultar o CEP.</p>";
      });
  }




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





  function fixInstagramUrl(instagram) {
    if (!instagram) return "";

    let ig = String(instagram).trim();

    // remove apenas rótulo no início (ex: "Instagram:", "Instagram -", "Instagram Instagram")
    ig = ig.replace(/^\s*instagram\s*[:\-]?\s*/i, "").trim();
    ig = ig.replace(/^\s*instagram\s+/i, "").trim(); // se repetiu

    // se já é link completo, não mexe
    if (/^https?:\/\//i.test(ig)) return ig;

    // remove @
    ig = ig.replace(/^@/, "");

    // se vier "instagram.com/usuario" ou "www.instagram.com/usuario"
    if (/^(www\.)?instagram\.com/i.test(ig)) {
      return "https://" + ig.replace(/^https?:\/\//i, "");
    }

    // se vier só "usuario"
    return "https://www.instagram.com/" + ig;
  }


  // Extrai o username de QUALQUER coisa (link, @, texto)
  function extractInstagramUsername(input) {
    if (!input) return "";

    let s = String(input).trim();

    // Se for só "Instagram" (ou variação), não é username
    if (/^instagram\s*[:\-]?\s*$/i.test(s)) return "";

    // Se NÃO tiver domínio, remove apenas prefixos tipo "instagram:" (sem destruir "instagram.com")
    if (!/instagram\.com/i.test(s)) {
      s = s.replace(/^instagram\s*[:\-]?\s*/i, "").trim();
    }

    // remove protocolo
    s = s.replace(/^https?:\/\//i, "");

    // remove www.
    s = s.replace(/^www\./i, "");

    // se contiver instagram.com em qualquer lugar, corta até depois do domínio
    if (/instagram\.com/i.test(s)) {
      s = s.replace(/.*instagram\.com\/?/i, "");
    }

    // remove query/hash
    s = s.split("?")[0].split("#")[0];

    // remove @ e barras
    s = s.replace(/^@/, "").replace(/^\/+/, "").replace(/\/+$/, "");

    const parts = s.split("/").filter(Boolean);
    if (!parts.length) return "";

    // Se for link de post/reel/stories, não dá pra garantir perfil
    const first = parts[0].toLowerCase();
    if (["p", "reel", "tv", "stories", "explore"].includes(first)) return "";

    // Proteção: quando vira ".com" por erro de parsing
    if (first === "com") return "";

    // username válido
    const user = parts[0].replace(/[^a-zA-Z0-9._]/g, "");
    return user || "";
  }

  function buildInstagramWebUrl(instagram) {
    const user = extractInstagramUsername(instagram);
    if (user) return `https://www.instagram.com/${user}/`;

    // fallback (mantém o que você já tinha)
    const u = fixInstagramUrl(instagram);
    // garante https
    return /^https?:\/\//i.test(u) ? u : ("https://" + u.replace(/^\/+/, ""));
  }










  function isStandalonePWA() {
    return window.matchMedia('(display-mode: standalone)').matches
      || window.navigator.standalone === true; // iOS antigo
  }

  function normalizeInstagramUrl(raw) {
    if (!raw) return "";
    let s = String(raw).trim();

    // Se já é URL completa, só retorna
    if (/^https?:\/\//i.test(s)) return s;

    // remove @ e espaços
    s = s.replace(/^@/, "").replace(/\s+/g, "");

    // se veio tipo instagram.com/xxx
    s = s.replace(/^www\./i, "");
    if (/^instagram\.com\//i.test(s)) s = "https://" + s;

    // se veio só o username
    if (!/^https?:\/\//i.test(s)) s = "https://www.instagram.com/" + s + "/";

    return s;
  }

  function openInstagramSmart(instagramRaw) {
    const webUrl = normalizeInstagramUrl(instagramRaw);
    if (!webUrl) return;

    // ✅ PWA instalado: usar navegação direta (mais confiável)
    if (isStandalonePWA()) {
      window.location.href = webUrl;
      return;
    }

    // ✅ Browser normal: nova aba
    window.open(webUrl, "_blank", "noopener,noreferrer");
  }














  // Interceptor de cliques corrigido
  // Intercepta cliques em links do Instagram criados no card (funciona no celular e no modo APP/PWA)
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



  //// MODULOS
  // 1. Definição Universal de Campos (Adicione todos que precisar aqui)
  const CONFIG_MODULOS = {
    veiculos: { nome: "Veículos", campos: ["Marca", "Modelo", "Ano", "Preço", "Link_Imagem"] },
    promocoes: { nome: "Promoções", campos: ["Título", "Descrição", "Desconto", "Link_Imagem"] },
    cardapio: { nome: "Cardápio", campos: ["Prato", "Preço", "Ingredientes", "Link_Imagem"] },
    imoveis: { nome: "Imóveis", campos: ["Tipo", "Cidade", "Valor", "Link_Imagem"] }
  };

  // ===== ESTADO GLOBAL DO ADMIN =====
  let ADMIN_USER = null;           // dados do usuário logado
  let ADMIN_OWNER_EMAIL = null;    // "dono" atual (cliente selecionado)
  let ADMIN_TIPO_ATUAL = null;     // módulo atual (promocoes, veiculos, etc)
  let ADMIN_EDIT_KEY = null;       // chave do item em edição (Realtime DB)

  function isSuperAdmin(u) {
    return String(u?.role || "").toLowerCase() === "superadmin";
  }

  // 2. Função que constrói o Painel após o Login
  async function montarPainelAdmin(dadosUsuario) {
    ADMIN_USER = dadosUsuario;

    const pageAdmin = document.getElementById("page-admin");
    pageAdmin.style.display = "block"; // no seu HTML está como section escondida :contentReference[oaicite:5]{index=5}

    document.getElementById("nome-usuario-logado").innerText =
      isSuperAdmin(dadosUsuario) ? "Painel Administrativo (Master)" : dadosUsuario.email;

    const menu = document.getElementById("admin-menu-dinamico");
    menu.innerHTML = "";

    // superadmin: mostra gestão de clientes
    const superControl = document.getElementById("super-admin-control");
    if (superControl) superControl.style.display = isSuperAdmin(dadosUsuario) ? "block" : "none";

    // ✅ define owner padrão
    ADMIN_OWNER_EMAIL = isSuperAdmin(dadosUsuario) ? "__todos__" : dadosUsuario.email;

    // ✅ se superadmin, cria seletor de cliente no sidebar
    if (isSuperAdmin(dadosUsuario)) {
      await injetarSeletorClientesSidebar();
    } else {
      removerSeletorClientesSidebar();
    }

    // ✅ monta botões do menu:
    // - superadmin: todos módulos
    // - cliente: só os permitidos
    if (isSuperAdmin(dadosUsuario)) {
      Object.keys(CONFIG_MODULOS).forEach((chave) => {
        const btn = document.createElement("button");
        btn.className = "btn-menu-item";
        btn.innerHTML = `<i class="fas fa-plus"></i> ${CONFIG_MODULOS[chave].nome}`;
        btn.onclick = () => abrirFormularioCadastro(chave);
        menu.appendChild(btn);
      });
    } else {
      Object.keys(dadosUsuario.permissoes || {}).forEach((chave) => {
        if (dadosUsuario.permissoes[chave] === true && CONFIG_MODULOS[chave]) {
          const btn = document.createElement("button");
          btn.className = "btn-menu-item";
          btn.innerHTML = `<i class="fas fa-plus"></i> ${CONFIG_MODULOS[chave].nome}`;
          btn.onclick = () => abrirFormularioCadastro(chave);
          menu.appendChild(btn);
        }
      });
    }
  }

  // ===== Seletor de clientes (somente superadmin) =====
  async function injetarSeletorClientesSidebar() {
    const host = document.querySelector(".admin-user-info");
    if (!host) return;

    // evita duplicar
    if (document.getElementById("admin-client-select")) return;

    const wrap = document.createElement("div");
    wrap.style.marginTop = "10px";
    wrap.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:6px;">
      <small style="opacity:.9;">Cliente para gerenciar</small>
      <select id="admin-client-select" style="padding:10px;border-radius:10px;border:1px solid #2d3748;background:#0f172a;color:#fff;">
        <option value="__todos__">Todos (ver geral)</option>
      </select>
    </div>
  `;
    host.appendChild(wrap);

    const sel = document.getElementById("admin-client-select");

    // carrega lista de clientes
    const snap = await firebase.database().ref("usuarios").once("value");
    const clientes = [];
    snap.forEach((ch) => {
      const u = ch.val();
      if (String(u?.role || "") === "cliente" && u?.email) clientes.push(String(u.email));
    });

    clientes.sort((a, b) => a.localeCompare(b, "pt-BR"));

    clientes.forEach((email) => {
      const opt = document.createElement("option");
      opt.value = email;
      opt.textContent = email;
      sel.appendChild(opt);
    });

    sel.value = ADMIN_OWNER_EMAIL || "__todos__";

    sel.addEventListener("change", () => {
      ADMIN_OWNER_EMAIL = sel.value;
      // se já estiver em algum módulo aberto, recarrega lista
      if (ADMIN_TIPO_ATUAL) {
        listarItensDoModulo(ADMIN_TIPO_ATUAL);
      }
    });
  }

  function removerSeletorClientesSidebar() {
    const sel = document.getElementById("admin-client-select");
    if (sel?.parentElement?.parentElement) sel.parentElement.parentElement.remove();
  }


  // 3. Gera o formulário de cadastro dinamicamente
  function abrirFormularioCadastro(tipo) {
    ADMIN_TIPO_ATUAL = tipo;
    ADMIN_EDIT_KEY = null;

    const editor = document.getElementById("editor-de-conteudo");
    const container = document.getElementById("container-campos-dinamicos");
    const titulo = document.getElementById("titulo-modulo-atual");
    const form = document.getElementById("form-cadastro-geral");

    editor.style.display = "block";
    titulo.innerText = "Gerenciar " + CONFIG_MODULOS[tipo].nome;

    // cria campos
    container.innerHTML = "";
    CONFIG_MODULOS[tipo].campos.forEach((campo) => {
      container.innerHTML += `
      <div class="input-group">
        <label>${campo}:</label>
        <input type="text" name="${campo}" placeholder="Digite ${campo}">
      </div>
    `;
    });

    // cria/garante a área de lista abaixo do form
    garantirAreaListaItens();

    // submit = criar ou editar
    form.onsubmit = async (e) => {
      e.preventDefault();

      // regra: cliente só mexe no próprio
      if (!isSuperAdmin(ADMIN_USER) && ADMIN_OWNER_EMAIL !== ADMIN_USER.email) {
        alert("Permissão negada.");
        return;
      }

      const formData = new FormData(e.target);
      const payload = Object.fromEntries(formData.entries());

      payload.dono = isSuperAdmin(ADMIN_USER)
        ? (ADMIN_OWNER_EMAIL === "__todos__" ? ADMIN_USER.email : ADMIN_OWNER_EMAIL)
        : ADMIN_USER.email;

      payload.updatedAt = Date.now();

      const refBase = firebase.database().ref(`conteudo/${tipo}`);

      try {
        if (ADMIN_EDIT_KEY) {
          await refBase.child(ADMIN_EDIT_KEY).update(payload);
          alert("Item atualizado!");
        } else {
          payload.createdAt = Date.now();
          await refBase.push(payload);
          alert("Item criado!");
        }

        ADMIN_EDIT_KEY = null;
        e.target.reset();
        listarItensDoModulo(tipo);
      } catch (err) {
        console.error(err);
        alert("Erro ao salvar.");
      }
    };

    // carrega lista
    listarItensDoModulo(tipo);
  }

  function garantirAreaListaItens() {
    const editor = document.getElementById("editor-de-conteudo");
    if (!editor) return;

    if (document.getElementById("admin-lista-itens")) return;

    const div = document.createElement("div");
    div.id = "admin-lista-itens";
    div.style.marginTop = "14px";
    div.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;">
      <h4 style="margin:0;">Itens cadastrados</h4>
      <button type="button" id="btn-admin-novo" class="btn-save-database" style="width:auto;padding:10px 14px;">
        Novo item
      </button>
    </div>
    <div id="admin-lista-itens-conteudo" style="margin-top:10px; display:flex; flex-direction:column; gap:10px;"></div>
  `;

    editor.appendChild(div);

    document.getElementById("btn-admin-novo").onclick = () => {
      ADMIN_EDIT_KEY = null;
      document.getElementById("form-cadastro-geral").reset();
    };
  }

  async function listarItensDoModulo(tipo) {
    const box = document.getElementById("admin-lista-itens-conteudo");
    if (!box) return;

    box.innerHTML = "Carregando...";

    const refBase = firebase.database().ref(`conteudo/${tipo}`);
    let snap;

    // superadmin pode ver todos ou filtrar por cliente
    if (isSuperAdmin(ADMIN_USER)) {
      if (ADMIN_OWNER_EMAIL === "__todos__") {
        snap = await refBase.once("value");
      } else {
        snap = await refBase.orderByChild("dono").equalTo(ADMIN_OWNER_EMAIL).once("value");
      }
    } else {
      // cliente: sempre apenas dele
      snap = await refBase.orderByChild("dono").equalTo(ADMIN_USER.email).once("value");
    }

    const itens = [];
    snap.forEach((ch) => itens.push({ key: ch.key, ...ch.val() }));
    itens.sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0));

    if (!itens.length) {
      box.innerHTML = `<div style="opacity:.8;">Nenhum item cadastrado ainda.</div>`;
      return;
    }

    box.innerHTML = "";
    itens.forEach((it) => {
      const card = document.createElement("div");
      card.style.cssText = "border:1px solid #e5e7eb;border-radius:12px;padding:12px;background:#fff;";
      const donoInfo = it.dono ? `<div style="font-size:12px;opacity:.7;">Dono: ${it.dono}</div>` : "";

      card.innerHTML = `
      <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;flex-wrap:wrap;">
        <div style="flex:1;min-width:220px;">
          <div style="font-weight:800;">${resumoItem(tipo, it)}</div>
          ${donoInfo}
        </div>
        <div style="display:flex;gap:8px;">
          <button type="button" data-edit="${it.key}" class="btn-save-database" style="width:auto;padding:8px 12px;">Editar</button>
          <button type="button" data-del="${it.key}" class="btn-logout" style="width:auto;padding:8px 12px;">Excluir</button>
        </div>
      </div>
    `;

      box.appendChild(card);
    });

    // bind editar/excluir
    box.querySelectorAll("[data-edit]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const key = btn.getAttribute("data-edit");
        await carregarItemParaEdicao(tipo, key);
      });
    });

    box.querySelectorAll("[data-del]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const key = btn.getAttribute("data-del");
        if (!confirm("Excluir este item?")) return;
        await firebase.database().ref(`conteudo/${tipo}/${key}`).remove();
        listarItensDoModulo(tipo);
      });
    });
  }

  function resumoItem(tipo, item) {
    // pega o primeiro campo do módulo como título
    const campos = CONFIG_MODULOS[tipo]?.campos || [];
    const c0 = campos[0];
    if (c0 && item[c0]) return String(item[c0]);
    // fallback
    const keys = Object.keys(item).filter(k => !["dono", "createdAt", "updatedAt", "timestamp"].includes(k));
    return keys.length ? `${keys[0]}: ${String(item[keys[0]])}` : "Item";
  }

  async function carregarItemParaEdicao(tipo, key) {
    const snap = await firebase.database().ref(`conteudo/${tipo}/${key}`).once("value");
    const data = snap.val();
    if (!data) return;

    // cliente não edita item de outro dono
    if (!isSuperAdmin(ADMIN_USER) && data.dono !== ADMIN_USER.email) {
      alert("Permissão negada.");
      return;
    }

    ADMIN_EDIT_KEY = key;

    // preenche o form
    const form = document.getElementById("form-cadastro-geral");
    const campos = CONFIG_MODULOS[tipo].campos || [];
    campos.forEach((campo) => {
      const input = form.querySelector(`[name="${campo}"]`);
      if (input) input.value = data[campo] ?? "";
    });
  }




  // FIM MODULOS 



  // FUNCIONALIDADES ON LINE


  // 1. Definição das funcionalidades possíveis
  const FUNCIONALIDADES = {
    veiculos: { nome: "Veículos", campos: ["Marca", "Modelo", "Preço", "Ano", "Imagem URL"] },
    cardapio: { nome: "Cardápio", campos: ["Prato", "Descrição", "Preço", "Imagem URL"] },
    promocoes: { nome: "Promoções", campos: ["Título", "Desconto", "Validade", "Imagem URL"] }
    // Adicione as outras conforme sua lista
  };

  // 2. Função de Login atualizada com Filtro
  function realizarLogin(email, senha) {
    firebase.database().ref('usuarios').once('value', (snapshot) => {
      let user = null;
      snapshot.forEach(child => {
        if (child.val().email === email && child.val().senha === senha) user = child.val();
      });

      if (user) {
        abrirPainelAdmin(user);
      } else {
        alert("Acesso negado.");
      }
    });
  }

  // 3. Gerador de Menu por Permissão
  function abrirPainelAdmin(user) {
    document.getElementById("modalLogin").classList.add("hidden");
    document.getElementById("page-admin").style.display = "flex";

    const menu = document.getElementById("admin-menu");
    menu.innerHTML = ""; // Limpa menu

    // Se for Super Admin, ele ganha todos os botões e o filtro de clientes
    if (user.role === "superadmin") {
      document.getElementById("super-admin-area").style.display = "block";
      gerarMenuCompleto();
    } else {
      // Se for cliente, gera apenas o que você marcou no checkbox
      Object.keys(user.permissoes).forEach(key => {
        if (user.permissoes[key]) {
          const btn = document.createElement("button");
          btn.innerText = FUNCIONALIDADES[key].nome;
          btn.onclick = () => carregarFormulario(key, user.email);
          menu.appendChild(btn);
        }
      });
    }
  }








  // FIM FUNCIONALIDADES ON LINE

















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
        link: document.querySelector("#menuAcabamentos"),
        title: "Acabamento e Decoração",
        establishments: [
          {
            image: "images/comercios/acabamentos/tokfino/perfil.jpg",
            name: "Tok Fino",
            hours: "Seg a Sex: 08:00h as 18:00h <br> Sab: 08:00h as 12:00h",
            statusAberto: "a",
            horarios: {

              seg: [{ inicio: "08:00", fim: "18:00" }],
              ter: [{ inicio: "08:00", fim: "18:00" }],
              qua: [{ inicio: "08:00", fim: "18:00" }],
              qui: [{ inicio: "08:00", fim: "18:00" }],
              sex: [{ inicio: "08:00", fim: "18:00" }],
              sab: [{ inicio: "08:00", fim: "12:00" }],
              dom: []
            },
            address: "Rodovia Jayme Canet, 1490 - Carlópolis",
            contact: "(43) 99971-2977",
            infoAdicional: "<br>⏰ Atendimento 24h conforme demanda do cliente. <br>🧱 Serviços oferecidos e ja instalados!<br>🚪 Cortinas sob medida<br>🌱 Grama sintética<br>💎 Mármore e acabamentos<br>🧱 Papel de parede (instalação e venda)<br>📏 Persianas sob medida<br>🧩 Piso laminado<br>🧩 Piso vinílico<Br><br>📐 Projetos e Instalação<br>Trabalhamos com instalação profissional e materiais de alta qualidade, garantindo acabamento perfeito para qualquer ambiente.<br><br>🏗️ Atendemos também obras e projetos de construção civil.<Br><br>🏡 Transforme seu espaço<br>Se você quer renovar sua casa com estilo, conforto e durabilidade, fale com a gente! Temos soluções completas para interiores, com consultoria personalizada.<br><br>Será um prazer ajudar você a criar um ambiente ainda mais bonito e acolhedor!",

            instagram: "https://www.instagram.com/tokfinodecor/",
            facebook: "https://www.facebook.com/tokfinodecor/",
            novidadesImages: [
              "images/comercios/acabamentos/tokfino/divulgacao/9.jpg",
              "images/comercios/acabamentos/tokfino/divulgacao/2.jpg",
              "images/comercios/acabamentos/tokfino/divulgacao/3.jpg",
              "images/comercios/acabamentos/tokfino/divulgacao/4.jpg",
              "images/comercios/acabamentos/tokfino/divulgacao/5.jpg",
              "images/comercios/acabamentos/tokfino/divulgacao/6.jpg",
              "images/comercios/acabamentos/tokfino/divulgacao/7.jpg",
              "images/comercios/acabamentos/tokfino/divulgacao/8.jpg",

              "images/comercios/acabamentos/tokfino/divulgacao/1.jpg",

            ],
            novidadesDescriptions: [
              "Realizamos serviços completos desde a base até os acabamentos finais, garantindo qualidade em todas as etapas da obra.",
              "Grama sintética instalada.<br>A grama sintética além de super prática. Ela é extremamente linda, causa um conforto tanto visualmente quanto utilizando-a",
              "A sofisticação e praticidade que uma persiana proporciona é fora de base.",
              "Cortinas em tecido, para quem não abre mão do bom gosto e sofisticação.",
              "Piso vinílico passa um ar de aconchego e praticidade, deixa o ambiente ainda mais belo!",
              "Piso laminado é perfeito para deixar o ambiente aconchegante e com um visual lindíssimo!",
              "Papel de parede<BR> ✨Ótimo para mudar o visual do seu ambiente. Deixando da forma que você quiser, prático e rápido!",
              "Persianas são um investimento excelente para o seu ambiente, deixando um espaço confortável e extremamente lindo.",


              "Papel de parede, mude o visual do teu ambiente de forma rapida e pratica",

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
            hours: "Seg a Sab: 12:30h as 23:00h<br>Dom e Feriado: 13:00 as 22:00",
            statusAberto: ".",
            horarios: {
              seg: [{ inicio: "12:30", fim: "23:00" }],
              ter: [{ inicio: "12:30", fim: "23:00" }],
              qua: [{ inicio: "12:30", fim: "23:00" }],
              qui: [{ inicio: "12:30", fim: "23:00" }],
              sex: [{ inicio: "12:30", fim: "23:00" }],
              sab: [{ inicio: "12:30", fim: "23:00" }],
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
              "Pizza de Açai! Voce só encontra aqui!",
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
            hours: "Seg a Sab: 08:00h as 20:00h <br> Dom: 08:00h as 12:00h",
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
            address: "Rua Benedito Salles, 409 - Carlopolis",
            contact: "(43) 99635-1001",
            delivery: "Sim / Sem Taxa",
            instagram: "https://www.instagram.com/acougue.curitiba/",
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
              "images/comercios/acougue/curitiba/divulgacao/9.jpg",

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
              "Aquela peça Marmorada",
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
              "Seg 09:00h as 19:30h <br> Ter e Qua 09:00h as 22:00h <br> Qui a Sab 09:00h as 23:50h <br> Dom 09:00h as 22:00h",
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

        ],
      },





      {
        link: document.querySelector("#menuAgropecuaria"),
        title: "Agropecuaria",
        establishments: [

          {
            image: "images/comercios/agropecuaria/varaschin/perfil.jpg",
            name: "AgroCasa Varaschin",
            hours: "Seg a Sex: 08:00h as 18:00h <br> Sab: 08:00h as 16:00h",
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
            hours: "Seg a Sex: 08:00h as 18:00h <br> Sab: 08:00h as 16:00h",
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
                titulo: "Ração Special Dog Carne ",
                volume: "15kg",
                preco: 95.00,
                precoAntigo: 110.00,
                unidade: "A UNIDADE",
                imagem: "images/comercios/agropecuaria/agroVida/promocao/1.jpg",
                validadeFim: "2025-12-30",
                obs: "Oferta válida até durar o estoque"
              },

              {
                titulo: "Ração Top Canis ",
                volume: "14kg",
                preco: 64.90,
                precoAntigo: 73.00,
                unidade: "A UNIDADE",
                imagem: "images/comercios/agropecuaria/agroVida/promocao/2.jpg",
                validadeFim: "2025-12-30",
                obs: "Oferta válida até durar o estoque"
              },

              {
                titulo: "Ração Bionatural ",
                volume: "15kg",
                preco: 225.90,
                precoAntigo: 279.00,
                unidade: "A UNIDADE",
                imagem: "images/comercios/agropecuaria/agroVida/promocao/3.jpg",
                validadeFim: "2025-12-30",
                obs: "Oferta válida até durar o estoque"
              },

              {
                titulo: "Ração Golden Special - Frango e Carne ",
                volume: "15kg",
                preco: 159.90,
                precoAntigo: 220.00,
                unidade: "A UNIDADE",
                imagem: "images/comercios/agropecuaria/agroVida/promocao/4.jpg",
                validadeFim: "2025-12-30",
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
                validadeFim: "2025-11-15"
              },

              {
                titulo: "Petisco Turma da Monica - Enriquecido com Whey Protein",
                // volume: "2L",
                //  embalagem: "fardo c/6",

                precoAntigo: 24.00,
                preco: 20.00,
                imagem: "images/comercios/agropecuaria/agroVida/promocao/3.jpg",
                // validade: "2025-09-28"
                validadeFim: "2025-11-15"
              }
            ]
          },


          {
            image: "images/comercios/agropecuaria/saoJose/perfil.png",
            name: "Rações São Jose",
            hours: "Seg a Sex: 08:00h as 19:00h <br> Sab: 08:00h as 19:00h",
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
            contact: "(43) 99691-6466",
            contact2: "(43) 3566-1600",
            facebook: "https://www.facebook.com/oficinadocelularclps/",
            instagram: "https://www.instagram.com/oficinadocelular_carlopolis/",
            novidadesImages: [

              "images/comercios/assistenciaCelular/oficinaCelular/divulgacao/2.jpg",

            ],
            novidadesDescriptions: [
              "Temos Assistencia Tecnica em todos modelos de celular"

            ],


            promocoes: [
              {
                imagem: "images/comercios/assistenciaCelular/oficinaCelular/promocao/1.jpg",
                titulo: "Pelicula 3D",
                precoAntigo: 20.00,
                preco: 15.00,
                unidade: "A UNIDADE",
                validadeFim: "2025-12-30",
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
            hours: "Seg a Sex: 08:00h as 18:00h<br>Sab: 08:0h as 12:00h",
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
            instagram: "https://www.instagram.com/edias230/",
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
              "images/comercios/sorveteria/limone/cardapio/3.jpg",
              "images/comercios/sorveteria/limone/cardapio/4.jpg",
              "images/comercios/sorveteria/limone/cardapio/5.jpg",
              "images/comercios/sorveteria/limone/cardapio/6.jpg",
              "images/comercios/sorveteria/limone/cardapio/7.jpeg",
              "images/comercios/sorveteria/limone/cardapio/8.jpg",
              "images/comercios/sorveteria/limone/cardapio/9.jpeg",
              "images/comercios/sorveteria/limone/cardapio/10.jpeg",
              "images/comercios/sorveteria/limone/cardapio/11.jpeg",
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
            hours: "Seg: Fechado <br> Ter a Qui: 13:00h as 19:00h <br> Sex: 13:00h as 18:00h <br> Sab e Dom: 13:00h as 20:00h",
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
              "images/comercios/lanchonete/mycoffe/divulgacao/6.jpg",
              "images/comercios/lanchonete/mycoffe/divulgacao/7.jpg",
              "images/comercios/lanchonete/mycoffe/divulgacao/8.jpg",
              "images/comercios/lanchonete/mycoffe/divulgacao/9.jpg",
              "images/comercios/lanchonete/mycoffe/divulgacao/10.jpg",
              "images/comercios/lanchonete/mycoffe/divulgacao/11.jpg",


            ],

            novidadesDescriptions: [

              "",
              "",
              "",
              "",
              "",
              "Torta de Doce de Leite com Crocante de Amendoim — doce, cremosa ",
              "Fubá + goiabada = a dupla perfeita 💛 <br>Agora em versão bolo nuvem, fofinho e delicado",
              " bolo Chiffon de morango — leve, fofinho e com o toque delicado do morango na massa!",
              "Torta de Limão",
              "A Cheesecake Japonesa é diferente de tudo o que você já provou! Com textura super leve e sabor delicado, ela desmancha na boca e conquista no primeiro pedaço.",
              "Tonkatsu Obentô!<Br>Um prato perfeito para quem ama a cozinha japonesa: tonkatsu crocante (porco empanado e frito), acompanhado de arroz japonês e salada de repolho.",

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




          ///////////////////
          ///////////////

          {
            image: "images/comercios/lanchonete/noponto/perfil.jpg",
            name: "No Ponto",
            hours: "Qua a Seg: 19:00h as 23:00h",
            statusAberto: ".",
            horarios: {
              seg: [{ inicio: "19:00", fim: "23:00" }],
              ter: [],
              qua: [{ inicio: "19:00", fim: "23:00" }],
              qui: [{ inicio: "19:00", fim: "23:00" }],
              sex: [{ inicio: "19:00", fim: "23:00" }],
              sab: [{ inicio: "19:00", fim: "23:00" }],
              dom: [{ inicio: "19:00", fim: "23:00" }]
            },
            address: " Av Elson Soares, 1342 - Carlopolis",
            contact: "(43) 99661-9032",
            delivery: "Sim / Com Taxa",
            instagram: "https://www.instagram.com/no_ponto_carlopolis/",
            novidadesImages: [

              "images/comercios/lanchonete/noponto/divulgacao/1.jpg",
              "images/comercios/lanchonete/noponto/divulgacao/2.jpg",
            ],

            menuImages: [
              "images/comercios/lanchonete/noponto/cardapio/1.jpg",
              "images/comercios/lanchonete/noponto/cardapio/2.jpg",
            ],
          },




          ///////////////
          //////////////////////









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


              "images/comercios/piscina/mhpiscinas/divulgacao/2.jpg",
              "images/comercios/piscina/mhpiscinas/divulgacao/3.jpg",
              "images/comercios/piscina/mhpiscinas/divulgacao/4.jpg",
              "images/comercios/piscina/mhpiscinas/divulgacao/5.jpg",
              "images/comercios/piscina/mhpiscinas/divulgacao/6.jpg",
              "images/comercios/piscina/mhpiscinas/divulgacao/7.jpg",
              "images/comercios/piscina/mhpiscinas/divulgacao/8.jpg",
              "images/comercios/piscina/mhpiscinas/divulgacao/9.jpg",

            ],

            novidadesDescriptions: [
              "Sua Piscina merece um cuidado especial! <br>Com a MhPiscinas voce pode contar!",


            ],

          },
        ],
      },


      ////////
      //////
      ////////
      // pizzaria
      {
        link: document.querySelector("#menuPizzaria"),
        title: "Pizzaria",
        establishments: [
          {
            image: "images/comercios/pizzaria/fornalha/perfil.jpg",
            name: "Fornalha Pizzaria",
            hours: "Qua a Qui: 18:00h as 23:00h <br>Sex a Sab: 18:00h as 00:00h <br> Dom: 18:00 as 23:00h",
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
              "images/comercios/sorveteria/fortyshake/divulgacao/1.jpg",
              "images/comercios/sorveteria/fortyshake/divulgacao/2.jpg",
              "images/comercios/sorveteria/fortyshake/divulgacao/3.jpg",
              "images/comercios/sorveteria/fortyshake/divulgacao/4.jpg",
              "images/comercios/sorveteria/fortyshake/divulgacao/5.jpg",

              "images/comercios/sorveteria/fortyshake/divulgacao/6.jpg",
              "images/comercios/sorveteria/fortyshake/divulgacao/7.jpg",
              "images/comercios/sorveteria/fortyshake/divulgacao/8.jpg",
              "images/comercios/sorveteria/fortyshake/divulgacao/9.jpg",
              "images/comercios/sorveteria/fortyshake/divulgacao/10.jpg",
              "images/comercios/sorveteria/fortyshake/divulgacao/11.jpg",
            ],
            novidadesDescriptions: [
              "",

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


          {
            image: "images/comercios/padaria/esquinadopao/perfil.png",
            name: "Esquina do Pão",
            hours: "Seg a Sab: 06:00h as 19:00h <br> Dom: 06:00h as 12:00h",
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
            hours: "Seg a Sab: 05:45h as 19:00h <br> Dom: 05:45h as 12:00h",
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
            hours: "Seg a Sab: 05:30h as 19:00h <br> Dom: 5:30h as 12:00h",
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
            infoAdicional: "⚠️ 2° Via CRV,<br>⚠️ Atpv-e,<br> ⚠️ Comunicação de Venda,<br> ⚠️ Emplacamentos,<br>⚠️ Guia de Multas, IPVA,<br>⚠️ Licenciamento, <br>⚠️ Transferências  ",
            instagram: "https://www.instagram.com/despachante_rodriguinho/",
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
            hours: "Seg a Sex: 07:00h as 20:00h <br> Dom: 08:00 as 12:00h",
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
            hours: "Seg a Sex: 8:00h as 21:00h <br> Dom: 08:00h as 12:00h",
            statusAberto: ".",
            horarios: {
              seg: [{ inicio: "08:00", fim: "21:00" }],
              ter: [{ inicio: "08:00", fim: "21:00" }],
              qua: [{ inicio: "08:00", fim: "21:00" }],
              qui: [{ inicio: "08:00", fim: "21:00" }],
              sex: [{ inicio: "08:00", fim: "21:00" }],
              sab: [{ inicio: "08:00", fim: "21:00" }],
              dom: [{ inicio: "08:00", fim: "12:00" }],
            },
            contact: "(43) 99196-7816",
            delivery: "Sim / Sem Taxa",
            facebook: "https://www.facebook.com/MercadoObarateiro",
            instagram: "https://www.instagram.com/supermercado_obarateiro/p/DFgIRupxbr-/",
          },



          {
            image: "images/comercios/supermercado/kelve.png",
            name: "Kelve",
            address: "R. Paul Harris,104",
            hours: "Seg a Sex: 8:00h as 19:30h <br> Dom: 08:30h as 12:30h",
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
            hours: "Seg a Sex: 08:00h as 18:00h <br> Sab: 08:00h as 12:00h",
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
              "images/comercios/estudioDeBeleza/veronica/divulgacao/6.jpg",
              "images/comercios/estudioDeBeleza/veronica/divulgacao/1.jpg",
              "images/comercios/estudioDeBeleza/veronica/divulgacao/2.jpg",
              "images/comercios/estudioDeBeleza/veronica/divulgacao/3.jpg",
              "images/comercios/estudioDeBeleza/veronica/divulgacao/4.jpg",
              "images/comercios/estudioDeBeleza/veronica/divulgacao/5.jpg",

            ],
            novidadesDescriptions: [
              "Meninasaaaass aproveitemmmm🤩🤩<Br>Ja imagino ficar mais lindas ainda nesse final de ano e ainda com preços arrasadores🤩🤩<Br>📍 Estúdio Beleza e Harmonia – Verônica Kataoka<Br>📞 (14) 99830-8893<Br>Lembrando que atendemos no horario noturno também, olha só que maravilha 😍<Br>Então o que você está esperando para agendar e ficar mais bela ainda??<Br>Você pode também presentear alguém da sua família com um vale combo especifico🤩Para seu natal ",

              "Presentão de fim de ano? Beleza renovada com preços que cabem no bolso!",

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
            hours: "Seg a Sex:</strong> 08:00h as 18:00h <br>Sab: </strong>08:00h as 12:00h",

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
              "images/comercios/farmacia/bioFarma/divulgacao/4.jpg",
              "images/comercios/farmacia/bioFarma/divulgacao/5.jpg",


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


            hours: "Seg a Sex: 08:00h as 20:00h <br> Sab: 08:00h as 15:00h",
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
            hours: "Dom a Dom: 08:00h as 22:00h",
            statusAberto: ".",
            horarios: {
              seg: [{ inicio: "08:00", fim: "22:00" }],
              ter: [{ inicio: "08:00", fim: "22:00" }],
              qua: [{ inicio: "08:00", fim: "22:00" }],
              qui: [{ inicio: "08:00", fim: "22:00" }],
              sex: [{ inicio: "08:00", fim: "22:00" }],
              sab: [{ inicio: "08:00", fim: "22:00" }],
              dom: []
            },
            contact: "(43) 3566-1211",
            delivery: "Sim / Sem Taxa",
            facebook: "https://www.facebook.com/farmaiscarlopolis1/?locale=pt_BR",
            instagram: "https://www.instagram.com/farmaiscarlopolis/",
            novidadesImages: [

              "images/comercios/farmacia/farmais/divulgacao/2.jpg",
              "images/comercios/farmacia/farmais/divulgacao/3.jpg",
              "images/comercios/farmacia/farmais/divulgacao/4.jpg",

            ],
            novidadesDescriptions: [

              "Tome no horário certo – Respeite os intervalos indicados.",
              "Como fortalecer a imunidade? Comece pelo prato! Invista em alimentos ricos",
              "Tome no horário certo – Respeite os intervalos indicados.",

            ],
          },

          {
            image: "images/comercios/farmacia/masterFarma/masterfarma.png",
            name: "Master Farma",
            address: "R. Laurindo Franco de Godoi, 90 - Carlopolis",
            hours: "Seg a Sab: 08:00h as 20:00h <br>Dom: 08:00h as 13:00h",

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
            hours: "Seg a Sab: 08:00h as 20:00h <br> Dom: 08:00h as 13:00h",
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

              "images/comercios/farmacia/santaMaria/divulgacao/3.jpg",
              "images/comercios/farmacia/santaMaria/divulgacao/4.jpg",
              "images/comercios/farmacia/santaMaria/divulgacao/5.jpg",
              "images/comercios/farmacia/santaMaria/divulgacao/6.jpg",

            ],
            novidadesDescriptions: [

              "Nutricolin - Silício orgânico!Estimula as proteínas da beleza na pele, cabelos e unhas.Peça já o seu manipulado ❤️",
              "Emagreça com saúde! Fórmula manipulada completa.",
              "Colágeno Verisol em sachê.",
              "Equilibre seu corpo e mente!",

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
            image: "images/servicos/montadorMoveis/hiran/perfil.jpg",
            name: "Hiran Castro",
            contact: "(43) 99174-4396",

            hours: "Seg a Sex: 08:00h as 19:00h<br>Sab:08:00h as 16:00h",
            statusAberto: ".",
            horarios: {
              seg: [{ inicio: "08:00", fim: "19:00" }],
              ter: [{ inicio: "08:00", fim: "19:00" }],
              qua: [{ inicio: "08:00", fim: "19:00" }],
              qui: [{ inicio: "08:00", fim: "19:00" }],
              sex: [{ inicio: "08:00", fim: "19:00" }],
              sab: [{ inicio: "08:00", fim: "16:00" }],
              dom: [],
            },



            infoAdicional: "Se você precisa montar um móvel na caixa, desmontar e montar, fazer instalações ou outros tipos de serviço, solicite um orçamento!:<br><br>🪑 Montagens de móveis convencionais e planejados!<br>🧰 Assistência técnica em geral!<br>🚿 Instalação de acessórios de cozinha e banheiro <br>🖼️ Instalação de nichos, prateleiras, painéis de TV, cortinas, quadros etc!<br><br>🚚 Faço sua mudança com responsabilidade, qualidade e preço justo!",
            instagram: "https://www.instagram.com/montador_de_moveis_hiran/",

            novidadesImages: [
              "images/servicos/montadorMoveis/hiran/divulgacao/1.jpg",
              "images/servicos/montadorMoveis/hiran/divulgacao/2.jpg",
              "images/servicos/montadorMoveis/hiran/divulgacao/3.jpg",




            ],
            novidadesDescriptions: [

              "",


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
              "Sou Especialista no Tratamento em Diabético, <Br> Calos,  Unhas encravadas, Reflexologia podal entre outros tratamento nos pés",
            ],


          },

        ],
      },



      {
        link: document.querySelector("#menuRevendedor"),
        title: "Revendedor",
        establishments: [
          {
            image: "images/servicos/revendedor/tati/perfil.jpg",
            name: "Tati Conik",

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
            address: "R.  Dra. Paula e Silva, 648 - Carlópolis",
            contact: "(43) 99153-4883",

            instagram: "https://www.instagram.com/eu_tatyconik/",
            infoAdicional: "Especialistas em cuidados capilares, desenvolvemos produtos de alta performance para salões de beleza.<br> Nossas linhas unem tecnologia e qualidade profissional para proporcionar fios mais saudáveis, lisos e radiantes.<br>📗 <a href='images/servicos/revendedor/tati/divulgacao/Catalogo.pdf' target='_blank' rel='noopener'><br>Acesse Nosso Catálogo</a>",

            novidadesImages: [
              //"images/servicos/revendedor/tati/divulgacao/00.jpg",
              // "images/servicos/revendedor/tati/divulgacao/0.jpg",
              "images/servicos/revendedor/tati/divulgacao/2.jpg",

              "images/servicos/revendedor/tati/divulgacao/1.jpg",
              "images/servicos/revendedor/tati/divulgacao/3.jpg",
              "images/servicos/revendedor/tati/divulgacao/4.jpg",
              "images/servicos/revendedor/tati/divulgacao/5.jpg",
              "images/servicos/revendedor/tati/divulgacao/6.jpg",
              "images/servicos/revendedor/tati/divulgacao/7.jpg",
              "images/servicos/revendedor/tati/divulgacao/8.jpg",
              "images/servicos/revendedor/tati/divulgacao/9.jpg",
              "images/servicos/revendedor/tati/divulgacao/10.jpg",
            ],
            novidadesDescriptions: [
              //  "Promoçao de Fim de semana!",
              // "30% De desconto em todos os produtos, entre em contato e aproveite!!!",
              "Quer fios mais fortes, hidratados e com brilho de salão? ✨<br>Experimente o poder da linha Lizz Ante Profissional <br>Resultado que se vê, sente e apaixona! 💕",
            ],

            promocoes: [
              {
                imagem: "images/servicos/revendedor/tati/promocao/2.jpg",
                titulo: "Combo Safira - 2 kits",
                precoAntigo: 208.00,
                preco: 129.00,
                unidade: "A UNIDADE",
                validadeFim: "2025-10-31",
                obs: "Oferta válida até durar o estoque",

              },

              {
                imagem: "images/servicos/revendedor/tati/promocao/3.jpg",
                titulo: "Super Promo - 11.11",

                preco: 199.00,

                validadeFim: "2025-11-11",
                obs: "Oferta válida até durar o estoque",

              },

            ]


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


      ///
      ///
      ///

      // teste de salvar o horario dos cliques tambem
      ///

      ///
      ///
      // inicio Eventos
      {
        link: document.querySelector("#menuEventos"),
        title: "Eventos em Carlópolis",
        establishments: [



          {
            image: "images/informacoes/eventos/8.jpg",
            name: "Bloquinho do Agro",
            date: "28/02/2026",
            address: "Clube Caravela",
            contact: "(43)99191-6037",
            instagram: "https://www.instagram.com/p/DSa8T1WD9Z8/",
            infoAdicional: "CountryBeat fazendo o chão tremer <br>🍺 Agro, música boa e energia lá em cima!"
          },

          {
            image: "images/informacoes/eventos/7.jpg",
            name: "Pescar",
            date: "01/03/2026",
            address: "Ilha do Ponciano",
            instagram: "https://www.instagram.com/p/DTcy3uwAI2n/",
            infoAdicional: " 21º PESCAR - 28 de fevereiro e 1º de março<br><a target='_blank' style='color:#2da6ff;' href='https://pescar2026.carlopolisdigital.com.br/?fbclid=PAb21jcAPu91hleHRuA2FlbQIxMQBzcnRjBmFwcF9pZA81NjcwNjczNDMzNTI0MjcAAaeYdq9yrDWsux-9eziXvpUi8ZMy7qhyOl4zuJ21_4Dq1ey3KAiOXvAzQUDXcA_aem_WOcr9vb6UNybZj8xfxee1w'  >Clique aqui para Inscrição</a> "
          },


          {
            image: "images/informacoes/eventos/20.jpg",
            name: "2 Café Colonial Lar Sao Vicente",
            date: "07/03/2026",
            contact: "(43) 3566-1196",
            address: "Lar Sao Vicente de Paulo - Rua Andrino Soares, 26, Centro",
            instagram: "https://www.instagram.com/p/DUibKB9EfQF/",
            infoAdicional: "CAFÉ COLONIAL ☕<br>Queridos amigos e comunidade, com muita alegria, anunciamos nosso 2° Café Colonial com Bingo! Dessa vez, está ainda mais especial pois o café acontecerá em nosso lar.<br>Anote aí:<br>📆 7 de março de 2026 | A partir das 15h<br>📍 Lar São Vicente de Paulo de Carlópolis<br>💲 R$35,00 (na compra do convite, ganhe 1 cartela para o bingo)<br>Teremos muitos prêmios imperdíveis e mais de 20 variedades no café. Venha participar e colaborar com nosso lar!"
          },

          {
            image: "images/informacoes/eventos/19.jpg",
            name: "Festa de São José",
            date: "13/03/2026",
            contact: "(43)99960-9608",
            address: "Paroquia São José Pantaleão",
            instagram: "https://www.instagram.com/p/DUdDSD4FmUP/",
            infoAdicional: "🙏 Festa de São José 🙏🎉<br>Haverá vendas de pastéis, mini pizza, refrigerante e bolo 🍰🥤🍕<br>🎁 Binguinho e Intens Show de Prêmios 🎁<br>1️⃣ Bicicleta aro 29<br>2️⃣ Celular<br>3️⃣ TV 32 polegadas<br>4️⃣ 💰 3 mil reais<br><br>👉 Venha participar, traga sua família e viva esse momento de fé, alegria e confraternização!<br>Pontos de vendas das cartelas do show de prêmios<br>@paroquiasaojosesaopantelea<br>@paroquiacarlopolis<br>@elizconceicao<br>@drogamaisjorginho<br>@starmaistech<br>@baggiocarlopolis<br>@funerariagrupocastilho"
          },


          {
            image: "images/informacoes/eventos/17.jpg",
            name: "Sunset Caravela",
            date: "21/03/2026",
            address: "Caravela Clube",
            instagram: "https://www.instagram.com/p/DUihXMYjQiL/",
            infoAdicional: "🔥 DJ & Produtor Musical<br>🎧 +1 Milhão de streams nas plataformas<br>📻 Tocando em mais de 500 rádios pelo mundo<br>🌍 Suporte de DJs nacionais e internacionais<br>🚀 Um sucesso por onde passa — e sempre volta!"
          },


          {
            image: "images/informacoes/eventos/3.jpg",
            name: "Cafe da manha dos amigos",
            date: "29/03/2026",
            address: "R. Benedito Salles, 2671 - Carlópolis",
            contact: "(43)99837-5390",
            instagram: "https://www.instagram.com/rotapr218/",
            infoAdicional: "A partir do dia 28 de março, já estaremos recebendo os irmãos de estrada!<br>Durante o fim de semana, teremos passeios mototurísticos pela região Angra Doce"
          },



          {
            image: "images/informacoes/eventos/10.jpg",
            name: "CFC Carlopolis Fight",
            date: "09/05/2026",
            address: "Ginasio de esportes",
            instagram: "https://www.instagram.com/p/DUJa9irANR3/",
            infoAdicional: "2 - Edição<br> Entrada Franca 1 kg de alimento<br>Mesas na area VIP<br>20 Lutas <Br> 4 Modalidades em um só lugar"
          },

          {
            image: "images/informacoes/eventos/18.jpg",
            name: "Festa da APAE",
            date: "13/06/2026",
            address: "Festa da APAE",
            instagram: "https://www.instagram.com/p/DUbTl7rkbEG/",
            infoAdicional: "A tradicional festa da apae"
          },

          {
            image: "images/informacoes/eventos/1.jpg",
            name: "Undokai 2026",
            date: "12/07/2026",
            address: "Campo da Acecar",


          },


          {
            image: "images/informacoes/eventos/14.jpg",
            name: "FrutFest 2026",
            date: "03/09/2026",
            address: "Ilha do Ponciano",
            instagram: "https://www.instagram.com/p/DT_RNkUjoSW/",
            infoAdicional: "FrutFest 2026, de 03 a 06 de Setembro<br> Qui 03/09: Cesar Menotti e Fabiano<br>Sex 04/09: Matheus e Kauan + US AgroBoy<br> Sab 05/09: Victor e Leo + Jyraia Uai<br>Dom 06/09 Alexandre Pires + Luan Pereira"
          },


          {
            image: "images/informacoes/eventos/11.jpg",
            name: "7 Encontro de Motociclistas - Lobo da fronteira",
            date: "10/10/2026",
            address: "-",
            instagram: "https://www.instagram.com/p/DT_RNkUjoSW/",
            infoAdicional: "Em Breve Mais informações"
          },



          {
            image: "images/informacoes/eventos/13.jpg",
            name: "Low City 043 Fest",
            date: "18/10/2026",
            address: "Ilha do Ponciano",
            instagram: "https://www.instagram.com/p/DTfq3ICka4e/",
            infoAdicional: "🔥Essa vai pra quem esta na espera do GTA VI 🔥<br>Estao preparados para a 3ª Edição do Low City 043 Fest?<br>Carlópolis Pr mais uma vez vai ficar pequena..."
          },

          {
            image: "images/informacoes/eventos/2.jpg",
            name: "Tooronagashi",
            date: "24/10/2026",
            address: "Ilha do Ponciano",


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
            contact: " (43) 99157-5835",
            contact2: "(43) 3566-1932",

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
        link: document.querySelector("#menuSecretariaEducacao"),
        title: "Secretaria da Educação",
        establishments: [
          {

            name: "Secretaria da Educação",
            hours: "Seg a Sex: 07:00h as 11:00h - 13:00 as 17:00h",
            address: "-",
            contact: "(43) 99825-1062",
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
            novidadesImages: [
              "images/comercios/borracharia/juninho/divulgacao/1.jpg",


            ],
            novidadesDescriptions: [
              "",



            ],

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
              "images/comercios/autoEletrica/renan/divulgacao/2.jpg",


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
            infoAdicional: "🏠 - Atendemos a Domicilio<br>🚜 - Fazemos Socorro em sitios<br>🚗 - Serviço de Leva e Tras!<br>🔲 - Insufilme<br>🔋 - Baterias<br>🚙 - Pneus<br>⚡ - Remap<br>🛑 - Freios<Br>❄️ - Manutençao e instalaçao de ar condicionados em veiculos",
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
            hours: "Seg a Sex: 8h - 18h <br> Sab: 08h - 12h",
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
        link: document.querySelector("#menuLojaRoupas"),
        title: "Loja de Roupa",
        establishments: [
          {
            image: "images/comercios/lojaDeRoupa/tsmCollection/perfil.jpg",
            name: "T&M Collection",
            hours: "Seg a Sab: 08:30h as 19:00h",
            statusAberto: ".",
            horarios: {
              seg: [{ inicio: "08:30", fim: "19:00" }],
              ter: [{ inicio: "08:30", fim: "19:00" }],
              qua: [{ inicio: "08:30", fim: "19:00" }],
              qui: [{ inicio: "08:30", fim: "19:00" }],
              sex: [{ inicio: "08:30", fim: "19:00" }],
              sab: [{ inicio: "08:30", fim: "19:00" }],
              dom: []
            },
            address: " R. Sadatoshi Hamada, 96 - Vista Bella - Carlópolis",
            contact: "(11) 97217-8952",

            instagram: "https://www.instagram.com/_temcollection/",
            infoAdicional: "📅 Dom e Feriados: Atendimento Agendado Personalizado<Br>📦 Enviamos para todo o Brasil",
            novidadesImages: [
              "images/comercios/lojaDeRoupa/tsmCollection/divulgacao/11.jpg",
              "images/comercios/lojaDeRoupa/tsmCollection/divulgacao/1.jpg",
              "images/comercios/lojaDeRoupa/tsmCollection/divulgacao/2.jpg",
              "images/comercios/lojaDeRoupa/tsmCollection/divulgacao/3.jpg",
              "images/comercios/lojaDeRoupa/tsmCollection/divulgacao/4.jpg",
              "images/comercios/lojaDeRoupa/tsmCollection/divulgacao/5.jpg",
              "images/comercios/lojaDeRoupa/tsmCollection/divulgacao/6.jpg",
              "images/comercios/lojaDeRoupa/tsmCollection/divulgacao/7.jpg",
              "images/comercios/lojaDeRoupa/tsmCollection/divulgacao/8.jpg",
              "images/comercios/lojaDeRoupa/tsmCollection/divulgacao/9.jpg",
              "images/comercios/lojaDeRoupa/tsmCollection/divulgacao/10.jpg",



            ],
            novidadesDescriptions: [
              "",
              "Temos varios modelos e tamanhos, encontrea sua preferido por aqui!",
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
            hours: "Seg a Sab: 08:00h as 19:00h <br>Dom: 09:00h as 12:00h",
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
            instagram: "https://www.instagram.com/eliana.cristiano/",
            novidadesImages: [
              "images/comercios/depositoGas/liaGas/divulgacao/1.jpg",
              "images/comercios/depositoGas/liaGas/divulgacao/2.jpg",



            ],
            novidadesDescriptions: [
              "Lia Gás, entrega que não falha jamais! Temos Gás e Galão de Agua 20 Litros",
              "Nosso estoque para nao deixar na mão quando mais precisar!",

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
            hours: "Seg a Qui: 09:00h as 18:30h <br>Sex: 09:00h as 16:30h <br> Sab: 09:00 as 12:00h",
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
            hours: "Seg a Sex: 07:00h as 18:00h <br> Sab: 08:00h as 13:00h",
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
            hours: "Seg a Sex: 07:00h as 18:00h <br> Sab: 08:00h as 17:00h",
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
              "images/comercios/materialConstrucao/ferreira/divulgacao/1.png",
              //  "images/comercios/materialConstrucao/ferreira/divulgacao/11.png",
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
        link: document.querySelector("#menuMaterialEletrico"),
        title: "Materiais Eletricos",
        establishments: [
          {
            image: "images/comercios/materiaisEletricos/acende/perfil.jpg",
            name: "Acende Materiais Eletricos",
            hours: "Seg a Sex: 07:00h as 18:00h <br> Sab: 08:00h as 12:00h",
            statusAberto: ".",
            horarios: {
              seg: [{ inicio: "07:00", fim: "18:00" }],
              ter: [{ inicio: "07:00", fim: "18:00" }],
              qua: [{ inicio: "07:00", fim: "18:00" }],
              qui: [{ inicio: "07:00", fim: "18:00" }],
              sex: [{ inicio: "07:00", fim: "18:00" }],
              sab: [{ inicio: "07:00", fim: "12:00" }],
              dom: []
            },
            address: "R. Benedito Salles, 467 - Carlopolis",
            contact: "(43) 99185-2185",
            delivery: "Sim / Sem Taxa",
            instagram: "https://www.instagram.com/acendeclps01/",
            novidadesImages: [
              "images/comercios/materiaisEletricos/acende/divulgacao/1.jpg",
              "images/comercios/materiaisEletricos/acende/divulgacao/2.jpg",
              "images/comercios/materiaisEletricos/acende/divulgacao/3.jpg",

            ],
            novidadesDescriptions: [
              "🌟 Pendente Lupi<br>Um toque de design e personalidade para o seu ambiente!<br>Com curvas elegantes e luz aconchegante, o Lupi é perfeito para quem quer transformar o espaço com modernidade e estilo.",
              "Tesoura de Poda DeWalt! 🌳<Br>Chegou a ferramenta que vai transformar sua poda: Tesoura de Poda DeWalt a bateria, com alto desempenho, corte preciso e praticidade no dia a dia.<Br>Ideal para jardinagem, agricultura e manutenção de áreas verdes e o melhor: com a qualidade e durabilidade que só a DeWalt oferece!",
              "Verniz Imbuia e Mogno<br>✨ Deixe seus móveis ou madeiras com acabamento impecável e sofisticado.<Br>✨ Luxo, elegância e economia no mesmo pacote.<Br>⚠️ Promoção até durar o estoque.",


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
            hours: "seg a sex: 8h - 18h <br> sab: 08 - 12h",
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
            hours: "Seg a Sab: 08:00h as 21:00h<BR>Dom: 08:00h as 20:00h",
            statusAberto: ".",
            horarios: {
              seg: [{ inicio: "08:00", fim: "21:00" }],
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
                validadeFim: "2025-11-30",
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
            hours: "Seg a Sex: 11:00h as 15:00h - 18:00h as 22:30h<br> Sab: 11:00h as 16:00h",
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
            address: "R. Kalil Keder, 1204 - Carlopolis",
            contact: "(43) 99686-5040",
            delivery: "Sim / Com Taxa",
            instagram: "https://www.instagram.com/restaurantehimeclps/",
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
              "images/comercios/restaurante/hime/divulgacao/4.jpg",
              "images/comercios/restaurante/hime/divulgacao/5.jpg",



            ],
            novidadesDescriptions: [
              "Reserve sua mesa!  ",
              "Sabiam quem temos Rodizio todas as Sextas-ferias?  ",
              "Nosso famoso Yaki Soba!",
              "Amplo espaço para atendermos toda sua familia! ",
            ],

          },


          {
            image: "images/comercios/restaurante/namigo/perfil.jpg",
            name: "NamiGO Japanese",
            hours: "Ter a Dom: 16:00h as 00:00h",
            statusAberto: ".",
            horarios: {
              seg: [],
              ter: [{ inicio: "16:00", fim: "00:00" }],
              qua: [{ inicio: "16:00", fim: "00:00" }],
              qui: [{ inicio: "16:00", fim: "00:00" }],
              sex: [{ inicio: "16:00", fim: "00:00" }],
              sab: [{ inicio: "16:00", fim: "00:00" }],
              dom: [{ inicio: "16:00", fim: "00:00" }]
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
            name: "Resraurante Portal",
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
            hours: "Ter a Dom: 11:00h - 00:00h",
            statusAberto: ".",
            horarios: {
              seg: [],
              ter: [{ inicio: "11:00", fim: "00:00" }],
              qua: [{ inicio: "11:00", fim: "00:00" }],
              qui: [{ inicio: "11:00", fim: "00:00" }],
              sex: [{ inicio: "11:00", fim: "00:00" }],
              sab: [{ inicio: "11:00", fim: "00:00" }],
              dom: [{ inicio: "11:00", fim: "00:00" }]
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
        link: document.querySelector("#menuOtica"),
        title: "Otica",
        establishments: [
          {
            image: "images/comercios/otica/oticaVisual/perfil.jpg",
            name: "Otica Visual Center",
            hours: "Seg a Sex: 08:30h as 18:00h <br> Sab: 09:00h as 13:00h",
            statusAberto: ".",
            horarios: {
              seg: [{ inicio: "08:30", fim: "18:00" }],
              ter: [{ inicio: "08:30", fim: "18:00" }],
              qua: [{ inicio: "08:30", fim: "18:00" }],
              qui: [{ inicio: "08:30", fim: "18:00" }],
              sex: [{ inicio: "08:30", fim: "18:00" }],
              sab: [{ inicio: "09:00", fim: "13:00" }],
              dom: []
            },
            address: "R. Benedito Salles, 583 - Carlópolis",
            contact: "(43) 99908-1510",
            instagram: "https://www.instagram.com/oticavisualcenter.oficial/",
            novidadesImages: [
              // "images/comercios/otica/oticaVisual/divulgacao/0.jpg",
              "images/comercios/otica/oticaVisual/divulgacao/1.jpg",
              "images/comercios/otica/oticaVisual/divulgacao/2.jpg",
              "images/comercios/otica/oticaVisual/divulgacao/3.jpg",
              "images/comercios/otica/oticaVisual/divulgacao/4.jpg",


            ],
            novidadesDescriptions: [
              // "Venha realizar seu exame de vista com a Otica Visual Center",
              "Diga adeus aos reflexos e olá à visão nítida de verdade! 👋✨<Br>O tratamento Antirreflexo é aquele upgrade que transforma suas lentes — e sua rotina.<Br>👁️ Mais beleza: fotos sem brilhos e olhar sempre em destaque.<Br>💻 Mais conforto: menos cansaço com telas e luzes fortes.<Br>🚗 Mais segurança: visão noturna mais clara pra dirigir tranquilo.<Br>💪 Mais durabilidade: protege suas lentes de arranhões leves.<Br>Experimente o poder da clareza total e enxergue o mundo com outros olhos.Venha conferir nossos moveis",
              "Diga adeus aos reflexos e olá à visão nítida de verdade! 👋✨<Br>O tratamento Antirreflexo é aquele upgrade que transforma suas lentes — e sua rotina.<Br>👁️ Mais beleza: fotos sem brilhos e olhar sempre em destaque.<Br>💻 Mais conforto: menos cansaço com telas e luzes fortes.<Br>🚗 Mais segurança: visão noturna mais clara pra dirigir tranquilo.<Br>💪 Mais durabilidade: protege suas lentes de arranhões leves.<Br>Experimente o poder da clareza total e enxergue o mundo com outros olhos.Venha conferir nossos moveis",
              "Dificuldade pra enxergar de longe e de perto?<br>Você pode estar precisando de lentes multifocais.<br>Elas têm vários campos de visão em uma só lente:<br>🔹 Parte superior: visão de longe<br>🔹 Meio da lente: visão intermediária (computador, por exemplo)<br>🔹 Parte inferior: leitura e visão de perto<br>✅ Sem precisar trocar de óculos o tempo todo.<br>✅ Sem aquele “sobe e desce” do modelo bifocal.<br>✅ Com adaptação cada vez mais fácil, graças à tecnologia atual.<br>Na Ótica Visual Center, a gente te orienta sobre o melhor tipo de multifocal pra sua rotina.<br>Tem diferença entre marcas, tratamentos e modelos — e a escolha certa faz TODA a diferença.",
              "🚨Agende agora mesmo o seu exame de vista!!<br>Lembre se que a troca periódica dos óculos é muito importante para a saúde dos seus olhos. 👀🧐👓",
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
        link: document.querySelector("#menuTaxiApp"),
        title: "Taxi e Apps",
        establishments: [



          {
            image: "images/servicos/taxi/via43/perfil2.jpg",
            name: "Eder Luis",
            hours: "Dom a Dom: <span style='color:red'>24horas</span>",
            address: "R Benedito Salles, 1546 - Centro / Carlopolis",
            contact: "(43) 99631-3421 ",
            instagram: "https://www.instagram.com/eder.luis_pacheco/",
            infoAdicional: "Baixe o App e comece a usar!<br><a target='_blank' style='color:#2e7d32;' href='https://play.google.com/store/apps/details?id=br.com.via43.passenger.drivermachine&pcampaignid=web_share'><i class='fab fa-android'></i> Instalar no Android</a>  <br>  <a target='_blank' style='color:#db0d0d;' href='https://apps.apple.com/br/app/via43-pe%C3%A7a-sua-viagem-entrega/id6744256463'><i class='fab fa-apple'></i> Instalar no Iphone </a><Br><BR> Pagamentos em:<br>Dinheiro <br>Cartão de crédito ou débito <br> Pix",
            novidadesImages: [
              // "images/comercios/otica/oticaVisual/divulgacao/0.jpg",
              "images/servicos/taxi/via43/divulgacao/1.jpg",
              


            ],
            novidadesDescriptions: [
              "",
           ],
          },

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




            novidadesImages: [
              "images/servicos/taxi/sereia/divulgacao/1.jpg",



            ],
            novidadesDescriptions: [
              "Atendimento 24hrs",],





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
          /*
          
                    {
                      name: "Funeraria Cristo Rei",
                      image: "images/informacoes/notaFalecimento/cristoRei/72.jpg",
                      date: "16/01/2026",
                      descricaoFalecido: "",          
                    },

                     {
                      name: "Funeraria Grupo Castilho",
                      image: "images/informacoes/notaFalecimento/castilho/36.jpg",
                      date: "01/01/2026",
                      descricaoFalecido: "",          
                    },
          */


          {
            name: "Funeraria Cristo Rei",
            image: "images/informacoes/notaFalecimento/cristoRei/72.jpg",
            date: "03/02/2026",
            descricaoFalecido: "É com profundo pesar que comunicamos o falecimento da Sra. Adarziza María Leite de Souza, aos 90 anos de idade, ocorrido em Carlópolis.<br>O velório inicia hoje, às 10:00 horas, na residência localizada na Rua Januário Francisco, nº 29, em Carlópolis.<br>A cerimônia de sepultamento será realizada amanhã, às 10:00 horas, no Cemitério Municipal de Carlópolis.<br>Expressamos nossos sinceros pêsames aos familiares e amigos neste momento de luto.🙏🏼",
          },


          {
            name: "Funeraria Cristo Rei",
            image: "images/informacoes/notaFalecimento/cristoRei/71.jpg",
            date: "27/01/2026",
            descricaoFalecido: "É com pesar que comunicamos o falecimento da Sra. LOURDES FURLAN MACHADO, aos 93 anos, ocorrido em Carlópolis<Br>O velório iniciará hoje às 14:30 horas no Velório Municipal Lauro Soares<Br>A cerimônia do sepultamento ocorrerá amanhã 28/01/2026 às 09:00 horas, no Cemitério Municipal de Carlópolis.<Br>Expressamos nossos mais sinceros sentimentos aos familiares e amigos neste momento de dor!🙏🏼",
          },

          {
            name: "Funeraria Cristo Rei",
            image: "images/informacoes/notaFalecimento/cristoRei/70.jpg",
            date: "18/01/2026",
            descricaoFalecido: "É com pesar que comunicamos o falecimento do Sr. EDERO PEREIRA JUNIOR, aos 78 anos, ocorrido em Jacarezinho, nosso querido Tutão<br>O velório será realizado no Velório Municipal Lauro Soares em horário a ser definido.<br>A cerimônia do sepultamento ocorrerá amanhã, Também em horário a ser definido no Cemitério Municipal de Carlópolis.<br>Expressamos nossos mais sinceros sentimentos aos familiares e amigos neste momento de dor!🙏🏼"
          },

          {
            name: "Funeraria Cristo Rei",
            image: "images/informacoes/notaFalecimento/cristoRei/69.jpg",
            date: "16/01/2026",
            descricaoFalecido: "É com pesar que comunicamos o falecimento da Sra. TEREZA FERNANDES DA SILVA SOUZA, aos 85 anos, ocorrido em Carlópolis<br>O velório iniciará hoje às 12:30 horas no Velório Municipal.<br>A cerimônia do sepultamento ocorrerá amanhã às 09:00 horas, no Cemitério Municipal de Carlópolis.<br>Expressamos nossos mais sinceros sentimentos aos familiares e amigos neste momento de dor!🙏🏼",
          },


          {
            name: "Funeraria Cristo Rei",
            image: "images/informacoes/notaFalecimento/cristoRei/68.jpg",
            date: "15/01/2026",
            descricaoFalecido: "É com pesar que comunicamos o falecimento do Sr. ANTÔNIO JOSÉ DA SILVA, aos 83 anos, ocorrido em Jacarezinho, nosso querido Tunico da Sorveteria!<BR>O velório será realizado no Velório Municipal Lauro Soares.<BR>A cerimônia do sepultamento ocorrerá amanhã 16/01/2026 em horário a ser definido, no Cemitério Municipal de Carlópolis.<BR>Expressamos nossos mais sinceros sentimentos aos familiares e amigos neste momento de dor!🙏🏼",
          },

          {
            name: "Funeraria Cristo Rei",
            image: "images/informacoes/notaFalecimento/cristoRei/67.jpg",
            date: "15/01/2026",
            descricaoFalecido: "É com pesar que comunicamos o falecimento da Sra. CRISTIANE YOSHIRO KANASHIRO, aos 51 anos, ocorrido em Londrina.<BR>O velório iniciará hoje às 15:30 horas no Velório Municipal.<BR>A cerimônia do sepultamento ocorrerá amanhã às 09:00 horas, no Cemitério Municipal de Carlópolis.<BR>Expressamos nossos mais sinceros sentimentos aos familiares e amigos neste momento de dor!🙏🏼",
          },

          {
            name: "Funeraria Cristo Rei",
            image: "images/informacoes/notaFalecimento/cristoRei/66.jpg",
            date: "05/01/2026",
            descricaoFalecido: "É com pesar que comunicamos o falecimento do Sr. JOSÉ CAMILO DE SOUZA aos 75 anos, mais conhecido como “Zé Camilo da Farmácia”, ocorrido em Londrina.<BR>O velório iniciará hoje às 15:45 horas no Municipal.<BR>A cerimônia do sepultamento será amanhã às 08:00 horas.<BR>Expressamos nossos mais sinceros sentimentos aos familiares e amigos neste momento de dor!🙏🏼",
          },

          {
            name: "Funeraria Cristo Rei",
            image: "images/informacoes/notaFalecimento/cristoRei/65.jpg",
            date: "03/01/2026",
            descricaoFalecido: "É com pesar que comunicamos o falecimento do Sr. JORGE DA SILVA aos 94 anos, Irmão do falecido Teleco ocorrido em Carlópolis.<BR>O velório iniciará hoje às 17:30 horas no Velório Municipal.<BR>A cerimônia do sepultamento ocorrerá amanhã às 09:00 horas no Cemitério Municipal de Carlópolis<BR>Expressamos nossos mais sinceros sentimentos aos familiares e amigos neste momento de dor!🙏🏼",
          },

          {
            name: "Funeraria Cristo Rei",
            image: "images/informacoes/notaFalecimento/cristoRei/64.jpg",
            date: "27/12/2025",
            descricaoFalecido: "É com pesar que comunicamos o falecimento da Sra. MARIA AUGUSTA DE OLIVEIRA LAERSON, aos 65 anos, ocorrido em Londrina.<Br>O velório iniciará hoje às 22:00 horas no Velório Municipal.<Br>A cerimônia do sepultamento ocorrerá amanhã 07:00 horas, no Cemitério Municipal de Carlópolis.<Br>Expressamos nossos mais sinceros sentimentos aos familiares e amigos neste momento de dor!🙏🏼",
          },



          {
            name: "Funeraria Cristo Rei",
            image: "images/informacoes/notaFalecimento/cristoRei/63.jpg",
            date: "24/12/2025",
            descricaoFalecido: "É com pesar que comunicamos o falecimento da Sra. NOEMIA ROSA DA SILVA DO NASCIMENTO, aos 87 anos, mãe do Tuco e do Vardinho, ocorrido em Carlópolis.<br>O velório iniciará hoje às 18:30 horas no Velório Municipal.<br>A cerimônia do sepultamento ocorrerá amanhã 10:00 horas, no Cemitério Municipal de Carlópolis.<br>Expressamos nossos mais sinceros sentimentos aos familiares e amigos neste momento de dor!🙏🏼",
          },

          {
            name: "Funeraria Cristo Rei",
            image: "images/informacoes/notaFalecimento/cristoRei/62.jpg",
            date: "24/12/2025",
            descricaoFalecido: "É com pesar que comunicamos o falecimento da Sra. PALMIRA FERREIRA, aos 83 anos, ocorrido em Arapongas.<br>O velório iniciará hoje às 07:00 horas no Velório Municipal.<br>A cerimônia do sepultamento ocorrerá hoje às 15:00 horas, no Cemitério Municipal de Carlópolis.<br>Expressamos nossos mais sinceros sentimentos aos familiares e amigos neste momento de dor!🙏🏼",
          },


          {
            name: "Funeraria Cristo Rei",
            image: "images/informacoes/notaFalecimento/cristoRei/61.jpg",
            date: "23/12/2025",
            descricaoFalecido: "É com pesar que comunicamos o falecimento do Sr. EMERSON BENEDITO BRANCO aos 49 anos, filho do Sr Hélio do Ônibus, ocorrido em Carlópolis.<br>O velório será realizado no Velório Municipal, às 20:00 horas.<br>A cerimônia do sepultamento ocorrerá amanhã às 10:00 horas no Cemitério Municipal de Carlópolis<br>Expressamos nossos mais sinceros sentimentos aos familiares e amigos neste momento de dor!🙏🏼",
          },


          {
            name: "Funeraria Cristo Rei",
            image: "images/informacoes/notaFalecimento/cristoRei/60.jpg",
            date: "12/12/2025",
            descricaoFalecido: "É com pesar que comunicamos o falecimento da Sra. ANA FELLET DA SILVA, aos 81 anos, ocorrido em Carlópolis.<Br>O velório está sendo realizado no Velório Municipal Lauro Soares.<Br>A cerimônia do sepultamento ocorrerá amanhã 12/12/2025 às 16:30 horas, no Cemitério Municipal de Carlópolis.<Br>Expressamos nossos mais sinceros sentimentos aos familiares e amigos neste momento de dor!🙏🏼",
          },
          {
            name: "Funeraria Cristo Rei",
            image: "images/informacoes/notaFalecimento/cristoRei/59.jpg",
            date: "10/12/2025",
            descricaoFalecido: "É com pesar que comunicamos o falecimento do Sr. GERSON CORREA DE LIMA aos 71 anos, ocorrido em Ribeirão Claro PR.<Br>O velório dará inicio hoje as 15:00 horas no Velório Municipal.<Br>A cerimônia do sepultamento ocorrerá hoje, 09/12/2025 às 17:30 horas horas, no Cemitério Municipal de Carlópolis<Br>Expressamos nossos mais sinceros sentimentos aos familiares e amigos neste momento de dor!🙏🏼",
          },


          {
            name: "Funeraria Cristo Rei",
            image: "images/informacoes/notaFalecimento/cristoRei/58.jpg",
            date: "10/12/2025",
            descricaoFalecido: "É com pesar que comunicamos o falecimento do Sr. VALTER LUIS MURADOR aos 67 anos, ocorrido em São Bernardo SP.<Br>O velório iniciará amanhã às 07:45 horas no Velório Municipal Lauro Soares.<Br>A cerimônia do sepultamento ocorrerá hoje às 09/12/2025 às 16:00 horas, no Cemitério Municipal de Carlópolis<Br>Expressamos nossos mais sinceros sentimentos aos familiares e amigos neste momento de dor!🙏🏼",
          },

          {
            name: "Funeraria Cristo Rei",
            image: "images/informacoes/notaFalecimento/cristoRei/57.jpg",
            date: "08/12/2025",
            descricaoFalecido: "É com pesar que comunicamos o falecimento da Sra. AKEMI NISHIGUCH aos 61 anos, ocorrido em Londrina.<Br>O velório iniciará amanhã às 07:00 horas no Velório Municipal Lauro Soares.<Br>A cerimônia do sepultamento ocorrerá amanhã 08/12/2025 às 09:00 horas, no Cemitério Municipal de Carlópolis<Br>Expressamos nossos mais sinceros sentimentos aos familiares e amigos neste momento de dor!🙏🏼",
          },

          {
            name: "Funeraria Cristo Rei",
            image: "images/informacoes/notaFalecimento/cristoRei/56.jpg",
            date: "04/12/2025",
            descricaoFalecido: "É com pesar que comunicamos o falecimento da Sra. LUZIA LIZETE DE LIMA ALMEIDA, aos 82 anos, ocorrido em Arapongas.<br>O velório está sendo realizado no Velório Municipal.<br>A cerimônia do sepultamento ocorrerá hoje 29/11/2025 às 16:45 horas, no Cemitério Municipal de Carlópolis<br>Expressamos nossos mais sinceros sentimentos aos familiares e amigos neste momento de dor!🙏🏼",
          },

          {
            name: "Funeraria Cristo Rei",
            image: "images/informacoes/notaFalecimento/cristoRei/55.jpg",
            date: "17/11/2025",
            descricaoFalecido: "É com pesar que comunicamos o falecimento da Sra. HELENA ALMEIDA CARDOSO aos 82 anos, ocorrido em Carlópolis.<BR>O velório está sendo realizado no Velório Municipal Lauro Soares.<BR>A cerimônia do sepultamento ocorrerá amanhã 18/11/2025 às 14:00 horas, no Cemitério Municipal de Carlópolis<BR>Expressamos nossos mais sinceros sentimentos aos familiares e amigos neste momento de dor!🙏🏼",
          },

          {
            name: "Funeraria Cristo Rei",
            image: "images/informacoes/notaFalecimento/cristoRei/54.jpg",
            date: "17/11/2025",
            descricaoFalecido: "É com pesar que comunicamos o falecimento da a Jovem GISELE APARECIDA DE PAULA aos 38 anos, ocorrido em Carlópolis<br>O velório será realizado hoje em horário a ser definido no velório Municipal de Ribeirão Claro<br>A cerimônia do sepultamento ocorrerá amanhã em horário a ser definido, no Cemitério Municipal de Ribeirão Claro<br>Expressamos nossos mais sinceros sentimentos aos familiares e amigos neste momento de dor!🙏🏼",
          },

          {
            name: "Funeraria Cristo Rei",
            image: "images/informacoes/notaFalecimento/cristoRei/52.jpg",
            date: "16/11/2025",
            descricaoFalecido: "É com pesar que comunicamos o falecimento da Sra. MARIA LEITE DA SILVA RODRIGUES, aos 79 anos, ocorrido em Sorocaba.<br>O velório será realizado amanhã à partir das 07:30 horas no velório Municipal de Carlópolis<br>A cerimônia do sepultamento ocorrerá amanhã às 14:00 horas, no Cemitério Municipal de Carlópolis.<br>Expressamos nossos mais sinceros sentimentos aos familiares e amigos neste momento de dor!🙏🏼",
          },


          {
            name: "Funeraria Cristo Rei",
            image: "images/informacoes/notaFalecimento/cristoRei/53.jpg",
            date: "16/11/2025",
            descricaoFalecido: "Com muito pesar comunicamos o falecimento do jovem ESLEY BRUNO DA ROCHA, aos 26 anos, ocorrido em Carlópolis.<Br>Seu corpo será encaminhado ao IML de Jacarezinho.<Br>O velório e sepultamento serão realizados amanhã, em data e horário a serem confirmados no cemitério municipal de Carlópolis.<Br>Manifestamos nossos sentimentos de solidariedade e força aos familiares e amigos neste momento de profunda dor. 🙏🏼",
          },



          {
            name: "Funeraria Cristo Rei",
            image: "images/informacoes/notaFalecimento/cristoRei/51.jpg",
            date: "02/10/2025",
            descricaoFalecido: "É com pesar que comunicamos o falecimento da Sra. NADIR MARIA FERNANDES DA SILVA, aos 88 anos, ocorrido em Jacarezinho.<br>O velório será realizado hoje á partir das 19:30 horas no velório municipal<br>A cerimônia do sepultamento ocorrerá amanhã às 11:00 horas, no Cemitério Municipal de Carlópolis.<br>Expressamos nossos mais sinceros sentimentos aos familiares e amigos neste momento de dor!🙏🏼",
          },


          {
            name: "Funeraria Cristo Rei",
            image: "images/informacoes/notaFalecimento/cristoRei/50.jpg",
            date: "02/11/2025",
            descricaoFalecido: "É com pesar que comunicamos o falecimento do Anjo RODRIGO DE FARIAS, aos 40 anos. Ocorrido em Carlópolis.<br>A cerimônia de despedida terá início hoje às 16:30 horas no Velório Municipal de Carlópolis.<br>O sepultamento será realizado amanhã, às 09:00 horas no Cemitério Municipal de Carlópolis.<br>Nossos sinceros sentimentos à família e amigos neste momento de dor. 🙏",
          },




          {
            name: "Funeraria Grupo Castilho",
            image: "images/informacoes/notaFalecimento/castilho/37.jpg",
            date: "23/10/2025",
            descricaoFalecido: "Comunicamos o falecimento do Sr. ERNESTO RODRIGUES LOBO aos 71 anos de idade.<Br>‌O velório será na CAPELA MUNICIPAL DE CARLOPOLIS - PR<Br>O sepultamento será realizado 24/10/2025 as 08:00 no CEMITÉRIO MUNICIPAL DE CARLOPOLIS - PR.",
          },

          {
            name: "Funeraria Cristo Rei",
            image: "images/informacoes/notaFalecimento/cristoRei/49.jpg",
            date: "22/10/2025",
            descricaoFalecido: "É com pesar que comunicamos o falecimento do Sr. CLAUDIO CARMO DE SOUZA aos 60 anos. Ocorrido em Carlópolis.<br>A cerimônia de despedida terá início amanhã , às 08:00 horas no Velório Municipal de Carlópolis.<br>O sepultamento será realizado amanhã, às 10:00 horas no Cemitério Municipal de Carlópolis.<br>Nossos sinceros sentimentos à família e amigos neste momento de dor. 🙏",

          },

          {
            name: "Funeraria Grupo Castilho",
            image: "images/informacoes/notaFalecimento/castilho/36.jpg",
            date: "21/10/2025",
            descricaoFalecido: "Comunicamos o falecimento do Sr. SALVADOR RODRIGUES DE CAMPOS aos 62 anos de idade.<br>‌O velório será na CAPELA MUNICIPAL DE CARLOPOLIS - PR<br>O sepultamento será realizado 22/10/2025 as 10:30 no CEMITÉRIO MUNICIPAL DE CARLOPOLIS - PR.",

          },

          {
            name: "Funeraria Cristo Rei",
            image: "images/informacoes/notaFalecimento/cristoRei/48.jpg",
            date: "19/10/2025",
            descricaoFalecido: "É com pesar que comunicamos o falecimento da Sra. ZÉLIA CASSIMIRO NAGAKI, aos 79 anos, ocorrido em Santo Antônio da Platina.<br>O velório será realizado hoje Domingo em horário a ser definido em sua residência na Rua: Jorge Barros 1197.<br>A cerimônia do sepultamento ocorrerá hoje às 16:00 horas, no Cemitério Municipal de Carlópolis.<br>Expressamos nossos sinceros sentimentos aos familiares e amigos neste momento de dor. 🙏",

          },

          {
            name: "Funeraria Cristo Rei",
            image: "images/informacoes/notaFalecimento/cristoRei/47.jpg",
            date: "17/10/2025",
            descricaoFalecido: "É com pesar que comunicamos o falecimento do Sr. João Carlos Roviler, carinhosamente conhecido como Jhonny, aos 58 anos. Ocorrido em Carlópolis.<Br>A cerimônia de despedida terá início hoje, às 23h30, no Velório Municipal de Carlópolis.<Br>O sepultamento será realizado amanhã, às 16h00, no Cemitério Municipal de Carlópolis.<Br>Nossos sinceros sentimentos à família e amigos neste momento de dor. 🙏",

          },

          {
            name: "Funeraria Grupo Castilho",
            image: "images/informacoes/notaFalecimento/castilho/35.jpg",
            date: "16/10/2025",
            descricaoFalecido: "Comunicamos o falecimento da Sr. VILMA CLEA MARQUES aos 90 anos de idade.<Br>‌O velório será na CAPELA MUNICIPAL DE CARLOPOLIS - PR<Br>O sepultamento será realizado 17/10/2025 as 16:00 no CEMITÉRIO MUNICIPAL DE CARLOPOLIS - PR.",

          },

          {
            name: "Funeraria Cristo Rei",
            image: "images/informacoes/notaFalecimento/cristoRei/46.jpg",
            date: "16/10/2025",
            descricaoFalecido: "Faleceu em Santo Antônio da Platina aos 47 anos de idade, o Sr. ALTAMIR PEREIRA DE SOUZA mais conhecido como Tamiro.<Br>A pedido da família a cerimônia e sepultamento será hoje 16:45 horas no velório municipal de Carlópolis.<Br>Nossos profundos sentimentos a todos familiares 🙏",

          },

          {
            name: "Funeraria Cristo Rei",
            image: "images/informacoes/notaFalecimento/cristoRei/45.jpg",
            date: "13/10/2025",
            descricaoFalecido: "É com pesar que comunicamos o falecimento da Sra. ALZIRA FERNANDES DA SILVA, aos 81 anos, ocorrido em Carlópolis. A Sra. Alzira era irmã do saudoso Ataíde.<br>O velório será realizado hoje, segunda-feira, a partir das 17:00 horas, no Velório Municipal.<br>A cerimônia de despedida e o sepultamento ocorrerão amanhã, às 13:00 horas, no Cemitério Municipal de Carlópolis.<br>Expressamos nossos sinceros sentimentos aos familiares e amigos neste momento de dor. 🙏",

          },


          {
            name: "Funeraria Cristo Rei",
            image: "images/informacoes/notaFalecimento/cristoRei/44.jpg",
            date: "11/10/2025",
            descricaoFalecido: "Faleceu em Santo Antônio da Platina aos 63 anos de idade, o Sr. JOSÉ PAULO FERREIRA DO PRADO<Br>A cerimônia iniciará hoje às 07:00 horas no velório municipal de Carlópolis.<Br>Sua despedida e sepultamento será hoje às 16:30 horas no Cemitério Municipal de Carlópolis.<Br>Nossos profundos sentimentos a todos familiares 🙏",

          },

          {
            name: "Funeraria Grupo Castilho",
            image: "images/informacoes/notaFalecimento/castilho/34.jpg",
            date: "05/10/2025",
            descricaoFalecido: "Comunicamos o falecimento do Sr. JOSE CARLOS DE SALES aos 59 anos de idade.<Br>‌O velório será a partir das 08:30 na CAPELA MUNICIPAL DE CARLOPOLIS - PR<Br>O sepultamento será realizado 06/10/2025 as 16:00 no CEMITÉRIO MUNICIPAL DE CARLOPOLIS - ",

          },


          {
            name: "Funeraria Cristo Rei",
            image: "images/informacoes/notaFalecimento/cristoRei/43.jpg",
            date: "03/10/2025",
            descricaoFalecido: "Faleceu em Carlópolis aos 55 anos de idade, a Sra. CLEIDE DO NASCIMENTO SILVA<br>A cerimônia terá início hoje sexta-feira às 07:30 horas no velório Municipal.<br>Sua despedida e sepultamento será realizada hoje às 16:30 horas no cemitério Municipal de Carlópolis!<br>Nossos profundos sentimentos aos familiares e amigos! 🙏",

          },



          //01/10
          {
            name: "Funeraria Cristo Rei",
            image: "images/informacoes/notaFalecimento/cristoRei/42.jpg",
            date: "01/10/2025",
            descricaoFalecido: "Faleceu em Jacarezinho aos 95 anos de idade, o Sr. EZOARDO DIAS<Br>A cerimônia iniciará hoje às 21:30 horas no velório municipal de Carlópolis.<Br>Sua despedida e sepultamento será amanhã às 10:30 horas no Cemitério Municipal de Carlópolis.<Br>Nossos profundos sentimentos a todos familiares 🙏",

          },





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
            infoVagaTrabalho: "1 - Atendente<br>1 - Auxiliar de Cozinha",
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
            image: "images/comercios/supermercado/rocha/perfil.jpg",
            name: "Rocha",

            address: "Av. Elson Soares, 767 - Carlopolis",
            contact: "(43) 99105-9324",

            facebook: "https://www.facebook.com/p/Kelve-Carl%C3%B3polis-100010521284877/?locale=pt_BR",
            instagram: "https://www.instagram.com/kelvesupermercadosoficial/",

            infoVagaTrabalho: "1 - Vaga Para Padaria<br>1 - Vaga Para Repositor",

          },

        ],
      },




    ];
  document.getElementById("menuPromocoes").addEventListener("click", function (e) {
    e.preventDefault();
    location.hash = "promocoes";
    mostrarPromocoes();
  });

  document.getElementById("menuConsultaCEP").addEventListener("click", mostrarConsultaCEP);


  const menuIgreenLuz = document.getElementById("menuEconomiaLuz");
  if (menuIgreenLuz) {
    menuIgreenLuz.addEventListener("click", function (e) {
      e.preventDefault();
      mostrarIgreenDescontoLuz();
    });
  }


  const menuPrevisaoTempo = document.getElementById("menuPrevisaoTempo");

  if (menuPrevisaoTempo) {
    menuPrevisaoTempo.addEventListener("click", function (e) {
      e.preventDefault();
      window.open("https://www.ipmetradar.com.br/2animRadar.php", "_blank");
    });
  }
  // Menu: Nascer & Pôr do Sol
  document.addEventListener("click", (ev) => {
    const t = ev.target.closest("#menuSol");
    if (!t) return;
    ev.preventDefault();
    mostrarSol(); // abre a página
  });


  montarCarrosselDivulgacao(); // Agora sim, já com categories carregado
  window.addEventListener("DOMContentLoaded", () => {
    montarGradeEventos();
  });



  // ✅ Instagram: abre certo no PWA (standalone) e no navegador normal
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a.js-ig-link");
    if (!a) return;

    e.preventDefault();
    e.stopPropagation();

    const ig = a.getAttribute("data-ig") || "";
    openInstagramSmart(ig);
  });


  // ✅ Nosso Instagram — abre certo no PWA e fora dele
  document.addEventListener("click", (e) => {
    const link = e.target.closest(".js-ig-nosso");
    if (!link) return;

    e.preventDefault();
    e.stopPropagation();

    const igUrl = link.getAttribute("data-ig");
    openInstagramSmart(igUrl);
  });




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


              
     <li id="${normalizeName(establishment.name)}" data-id="${normalizeName(establishment.name)}">



    
      ${establishment.image
          ? `
           <img  id="imagem-${normalizeName(establishment.name)}" src="${establishment.image}" title="${establishment.name}"  alt="Imagem de ${establishment.name}">


          `
          : ""
        }
  
     
     
  <span class="locais_nomes">${establishment.name}</span>
${!establishment.descricaoFalecido ? `
  <button 
    class="share-btn" 
    data-share-id="${normalizeName(establishment.name)}"
    data-share-nome="${establishment.name}"
    data-share-categoria="${title}">
    <i class="fa-solid fa-share-nodes"></i>
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
                         
                         
                          ${establishment.instagram ? `<a href="#" class="js-ig-link" data-ig="${fixInstagramUrl(establishment.instagram)}" rel="noopener">
  <i class="fab fa-instagram" style="color: #C13584; font-size: 16px;"></i> Instagram
</a>` : ""} 

                         
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
        registrarCliqueBotao(tipo, id, "servicos-comercios");

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
    if (h === "#cep") { return mostrarConsultaCEP(); }
    if (h === "#imoveis") { return mostrarImoveisV2(); }
    if (h === "#climaDoDia" || h === "#clima-do-dia") { return mostrarSol(); }

    if (h === "#represa-chavantes") { return mostrarRepresa(); };
    if (h === "#luz") { return mostrarIgreenDescontoLuz(); };






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

  // === NASCER & PÔR DO SOL (Carlópolis-PR) ===

  // Coordenadas fixas de Carlópolis-PR
  const COORDS_CARLOPOLIS = { lat: -23.4267, lng: -49.7239 };

  // Formata data YYYY-MM-DD no fuso de São Paulo
  function hojeISO_BR() {
    const tz = 'America/Sao_Paulo';
    const d = new Date();
    // garante data local correta:
    const y = d.toLocaleString('en-CA', { timeZone: tz, year: 'numeric' });
    const m = d.toLocaleString('en-CA', { timeZone: tz, month: '2-digit' });
    const dd = d.toLocaleString('en-CA', { timeZone: tz, day: '2-digit' });
    return `${y}-${m}-${dd}`;
  }

  // Converte um ISO para "HH:mm" em São Paulo
  function toHoraMinBR(iso) {
    if (!iso) return "--:--";
    const d = new Date(iso);
    return d.toLocaleTimeString("pt-BR", {
      hour: "2-digit", minute: "2-digit",
      timeZone: "America/Sao_Paulo"
    });
  }

  // Converte "HH:MM:SS" (day_length) para "H h M min"
  function duracaoHumana(valor) {
    // Se vier número (Open-Meteo): converte para "HH:MM:SS"
    if (typeof valor === "number" && Number.isFinite(valor)) {
      const h = Math.floor(valor / 3600);
      const m = Math.floor((valor % 3600) / 60);
      // s não é necessário para o texto final, mas calculo por completude
      // const s = Math.floor(valor % 60);
      const partes = [];
      if (h) partes.push(`${h} h`);
      if (m || !h) partes.push(`${m} min`);
      return partes.join(" ");
    }

    // Se vier string "HH:MM:SS" (sunrise-sunset.org): trata como antes
    if (typeof valor === "string" && valor.includes(":")) {
      const [h, m] = valor.split(":").map(Number);
      const partes = [];
      if (h) partes.push(`${h} h`);
      if (m || !h) partes.push(`${m} min`);
      return partes.join(" ");
    }

    return "-";
  }


  // Busca na API sunrise-sunset (UTC; formatted=0 entrega ISO)
  async function buscarSol(dateISO) {
    const { lat, lng } = COORDS_CARLOPOLIS;
    const url = `https://api.sunrise-sunset.org/json?lat=${lat}&lng=${lng}&date=${dateISO}&formatted=0`;
    const r = await fetch(url);
    if (!r.ok) throw new Error("Falha ao consultar horários");
    const j = await r.json();
    if (j.status !== "OK") throw new Error("Resposta inválida");
    return j.results; // sunrise, sunset, solar_noon, day_length, civil_twilight_begin/end, etc.
  }


  // === Clima diário (Open-Meteo) ===
  // Retorna { tmax, tmin, wind, rainProb } para a data
  async function buscarTempo(dateISO) {
    const { lat, lng } = COORDS_CARLOPOLIS;
    const base = "https://api.open-meteo.com/v1/forecast";
    const params = new URLSearchParams({
      latitude: lat,
      longitude: lng,
      daily: "temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max",
      timezone: "America/Sao_Paulo",
      temperature_unit: "celsius",
      wind_speed_unit: "kmh",
      start_date: dateISO,
      end_date: dateISO
    });
    const resp = await fetch(`${base}?${params.toString()}`);
    if (!resp.ok) throw new Error("Falha ao consultar clima");
    const j = await resp.json();
    if (!j?.daily) throw new Error("Resposta inválida (clima)");

    const i = 0; // só 1 dia
    return {
      tmax: j.daily.temperature_2m_max?.[i],
      tmin: j.daily.temperature_2m_min?.[i],
      wind: j.daily.wind_speed_10m_max?.[i],
      rainProb: j.daily.precipitation_probability_max?.[i]
    };
  }


  function mostrarSol(dateISO) {
    if (location.hash !== "#climaDoDia") location.hash = "#climaDoDia";

    const area = document.querySelector(".content_area");
    const hoje = hojeISO_BR();
    const dataInicial = dateISO || hoje;

    area.innerHTML = `
    <div class="page-header">
      <h2 >🌞 Clima do Dia</h2>
      <i class="fa-solid fa-share-nodes share-btn"
         onclick="compartilharPagina('#climaDoDia','Nascer & Pôr do Sol','Veja o clima do Dia em Carlópolis')"></i>
    </div>

    <div class="sol-wrap">
      <div class="sol-toolbar">
        <label for="solData"><b>Escolha a data:</b></label>
        <input id="solData" type="date" value="${dataInicial}">
<!-- <button id="solAtualizar" class="btn-rank">Atualizar</button> -->
      </div>

       <div class="sol-card" style="margin-top:12px">
  <div style="margin-bottom:10px"><b>☁️ Clima do dia em Carlópolis</b></div>
  <div class="sol-row-4">
  <div class="sol-box">
      <h4>Temp. Mínima</h4>
      <div class="time" id="wxMin">--°C</div>
    </div>
    <div class="sol-box">
      <h4>Temp. Máxima</h4>
      <div class="time" id="wxMax">--°C</div>
    </div>
    
    <div class="sol-box">
      <h4>Vento Máx</h4>
      <div class="time" id="wxWind">-- km/h</div>
    </div>
    <div class="sol-box">
      <h4>Prob. de Chuva</h4>
      <div class="time" id="wxRain">--%</div>
    </div>
  </div>
</div>

      <div class="sol-card">
        <div id="solStatus" style="margin-bottom:10px">⏳ Carregando horários...</div>
        <div class="sol-row">
          <div class="sol-box">
            <h4>Nascer do Sol</h4>
            <div class="time" id="solSunrise">--:--</div>
          </div>
          <div class="sol-box">
            <h4>Pôr do Sol</h4>
            <div class="time" id="solSunset">--:--</div>
          </div>
          <div class="sol-box">
            <h4>Meio-dia Solar</h4>
            <div class="time" id="solNoon">--:--</div>
          </div>
          <div class="sol-box">
            <h4>Duração do dia</h4>
            <div class="time" id="solDuracao">-</div>
          </div>
        </div>

       


        <div style="margin-top:12px; font-size:13px; opacity:.85">
          <span>📍 Coordenadas: ${COORDS_CARLOPOLIS.lat.toFixed(4)}, ${COORDS_CARLOPOLIS.lng.toFixed(4)}</span>
        </div>

      </div>
    </div>
  `






    // após area.innerHTML = `...` em mostrarSol()
    const luaCard = document.createElement("div");
    luaCard.className = "lua-card";
    luaCard.innerHTML = `
  <div id="lua-desenho" class="lua-img" aria-hidden="true"></div>
  <p id="lua-fase" class="lua-fase">Carregando fase da Lua...</p>
  <p id="lua-iluminacao" class="lua-iluminacao"></p>
  <hr style="border-color:#223;opacity:.35;margin:10px 0">
  <div style="font-weight:700;margin-bottom:6px;">🌠 Meteoros</div>
  <p id="meteor-prob" class="lua-fase">Calculando...</p>
  <p id="meteor-det" class="lua-iluminacao"></p>
`;

    (area.querySelector(".sol-wrap") || area).appendChild(luaCard);

    const fase = obterFaseLua(new Date());
    const iluminacaoPct = Math.round((1 - Math.cos(2 * Math.PI * fase.fraction)) * 50);

    area.querySelector("#lua-desenho").innerHTML = svgLua(fase.fraction, fase.waxing);
    area.querySelector("#lua-fase").textContent = `Fase: ${rotuloFaseParaExibicao(fase.fraction, fase.name)}`;
    area.querySelector("#lua-iluminacao").textContent = `Iluminação aproximada: ${iluminacaoPct}%`;

    const met0 = calcularProbMeteoros(new Date(), fase.fraction);
    area.querySelector("#meteor-prob").textContent = `Probabilidade: ${met0.classe} (${met0.score}%)`;
    area.querySelector("#meteor-det").textContent = met0.detalhe + " • Obs.: sem nuvens/seeing";


    // função interna para carregar/atualizar
    // Dentro de mostrarSol(...), na função interna carregar(dateStr)
    async function carregar(dateStr) {
      const st = document.getElementById("solStatus");
      try {
        st.textContent = "⏳ Carregando horários...";
        const res = await buscarSol(dateStr);
        document.getElementById("solSunrise").textContent = toHoraMinBR(res.sunrise);
        document.getElementById("solSunset").textContent = toHoraMinBR(res.sunset);
        document.getElementById("solNoon").textContent = toHoraMinBR(res.solar_noon);
        document.getElementById("solDuracao").textContent = duracaoHumana(res.day_length);

        const tempo = await buscarTempo(dateStr);
        document.getElementById("wxMax").textContent = (tempo.tmax ?? "--") + "°C";
        document.getElementById("wxMin").textContent = (tempo.tmin ?? "--") + "°C";
        document.getElementById("wxWind").textContent = (tempo.wind ?? "--") + " km/h";
        document.getElementById("wxRain").textContent = (tempo.rainProb ?? "--") + "%";

        // === Lua na DATA SELECIONADA ===
        const dataLua = new Date(dateStr + "T12:00:00"); // meio-dia evita trocas por fuso
        const f = obterFaseLua(dataLua);
        const iluminacaoPctLua = Math.round((1 - Math.cos(2 * Math.PI * f.fraction)) * 50);

        const slotLua = document.querySelector("#lua-desenho");
        if (slotLua) slotLua.innerHTML = svgLua(f.fraction, f.waxing);

        const lblFase = document.querySelector("#lua-fase");
        const lblIlum = document.querySelector("#lua-iluminacao");
        if (lblFase) lblFase.textContent = `Fase: ${rotuloFaseParaExibicao(f.fraction, f.name)}`;
        if (lblIlum) lblIlum.textContent = `Iluminação aproximada: ${iluminacaoPctLua}%`;
      } catch (e) {
        st.textContent = "⚠️ Não foi possível carregar os dados.";
      }
    }





    // listeners
    const inp = document.getElementById("solData");
    const btn = document.getElementById("solAtualizar");
    if (btn) btn.addEventListener("click", () => carregar(inp.value || hoje));
    if (inp) inp.addEventListener("change", () => carregar(inp.value || hoje));

    // carrega inicial
    carregar(dataInicial);
  }




  //// inicio validador nome imoveis





  //// fim valdador nome imoveis

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
    registrarCliqueBotao('telefone', estId || '', 'servicos-comercios')
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







function registrarCliqueOndeComerDetalhado(nomeEstabelecimento, tipo) {
  const hoje = getHojeBR();
  const db = firebase.database();
  const ref = db.ref(`cliquesOndeComerDetalhado/${hoje}/${nomeEstabelecimento}`).push();
  const agora = new Date();
  return ref.set({
    area: "onde-comer",
    tipo,
    horario: agora.toLocaleTimeString("pt-BR"),
    dataHoraISO: agora.toISOString(),
    ts: firebase.database.ServerValue.TIMESTAMP,
    pagina: window.location.href
  }).catch((e) => console.error("[OndeComerDetalhado] Erro:", e));
}

function registrarCliqueCardapioOndeComer(nomeEstabelecimento) {
  const hoje = getHojeBR();
  const ref = firebase.database().ref(`cliquesCardapiosOndeComer/${hoje}/${nomeEstabelecimento}`);
  ref.transaction(valorAtual => (valorAtual || 0) + 1);
  registrarCliqueOndeComerDetalhado(nomeEstabelecimento, "cardapio");
}

function registrarCliqueWhatsOndeComer(nomeEstabelecimento) {
  const hoje = getHojeBR();
  const ref = firebase.database().ref(`cliquesWhatsOndeComer/${hoje}/${nomeEstabelecimento}`);
  ref.transaction(valorAtual => (valorAtual || 0) + 1);
  registrarCliqueOndeComerDetalhado(nomeEstabelecimento, "whatsapp");
}

function registrarCliqueFotosOndeComer(nomeEstabelecimento) {
  const hoje = getHojeBR();
  const ref = firebase.database().ref(`cliquesFotosOndeComer/${hoje}/${nomeEstabelecimento}`);
  ref.transaction(valorAtual => (valorAtual || 0) + 1);
  registrarCliqueOndeComerDetalhado(nomeEstabelecimento, "fotos");
}

window.registrarCliqueCardapioOndeComer = registrarCliqueCardapioOndeComer;
window.registrarCliqueWhatsOndeComer = registrarCliqueWhatsOndeComer;
window.registrarCliqueFotosOndeComer = registrarCliqueFotosOndeComer;

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















////////////// inicio salvar imoveis
// gera a chave do imóvel: usa id; se não tiver, usa titulo higienizado
function keyImovel(im) {
  if (im?.id) return String(im.id);
  const titulo = String(im?.titulo || "imovel-sem-titulo");
  return titulo.replace(/[.#$/[\]]/g, "-");
}

// salva CONTADOR por dia, mantendo também o titulo no nó do dia
// util: pega o 1º corretor do imóvel
function getCorretorPrincipal(im) {
  if (!im) return "";
  if (Array.isArray(im.corretores) && im.corretores.length) return String(im.corretores[0]);
  if (im.corretor) return String(im.corretor);
  return "";
}

// salva CONTADOR por dia + titulo + corretor
// salva CONTADOR por dia + titulo + corretor + proprietario
function registrarCliqueImovelDia(tipo, im) {
  if (!window.firebase || !firebase.database) return Promise.resolve(false);
  const hoje = getHojeBR(); // YYYY-MM-DD
  const chave = keyImovel(im);
  const ref = firebase.database().ref(`imoveisCliquesPorDia/${hoje}/${chave}`);

  return ref.transaction(curr => {
    const base = curr || {};
    base.titulo = im?.titulo || base.titulo || "";
    base.corretor = getCorretorPrincipal(im) || base.corretor || "";
    base.proprietario = im?.proprietario || im?.proprietaria || base.proprietario || ""; // ← NOVO
    base[tipo] = (base[tipo] || 0) + 1;
    return base;
  });
}

// salva RESUMO acumulado + corretor + proprietario
function registrarCliqueImovelResumo(tipo, im) {
  if (!window.firebase || !firebase.database) return Promise.resolve(false);
  const hoje = getHojeBR(); // YYYY-MM-DD
  const chave = keyImovel(im);
  const ref = firebase.database().ref(`imoveisCliquesResumo/${hoje}/${chave}`);

  return ref.transaction(curr => {
    const base = curr || { totalFotos: 0, totalWhats: 0 };
    base.titulo = im?.titulo || base.titulo || "";
    base.corretor = getCorretorPrincipal(im) || base.corretor || "";
    base.proprietario = im?.proprietario || im?.proprietaria || base.proprietario || ""; // ← NOVO
    if (tipo === "fotos") base.totalFotos = (base.totalFotos || 0) + 1;
    if (tipo === "whatsapp") base.totalWhats = (base.totalWhats || 0) + 1;
    base.ultimoClique = firebase.database.ServerValue.TIMESTAMP;
    return base;
  });
}


// salva RESUMO acumulado + corretor
function registrarCliqueImovelResumo(tipo, im) {
  if (!window.firebase || !firebase.database) return Promise.resolve(false);
  const hoje = getHojeBR(); // YYYY-MM-DD
  const chave = keyImovel(im);
  const ref = firebase.database().ref(`imoveisCliquesResumo/${hoje}/${chave}`);

  return ref.transaction(curr => {
    const base = curr || { totalFotos: 0, totalWhats: 0 };
    base.titulo = im?.titulo || base.titulo || "";
    base.corretor = getCorretorPrincipal(im) || base.corretor || "";
    if (tipo === "fotos") base.totalFotos = (base.totalFotos || 0) + 1;
    if (tipo === "whatsapp") base.totalWhats = (base.totalWhats || 0) + 1;
    base.ultimoClique = firebase.database.ServerValue.TIMESTAMP;
    return base;
  });
}



// atalho: registra nos dois nós (dia + resumo)
function registrarCliqueImovel(tipo, im) {
  return Promise.allSettled([
    registrarCliqueImovelDia(tipo, im),
    registrarCliqueImovelResumo(tipo, im)
  ]);
}



/////////////// fim salvar  imoveis

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


// === Âncora de estabelecimento via ?est=ID (scroll após render) ===
let _pendingEstId = null;

function lerEstIdDaQuery() {
  const q = new URLSearchParams(location.search);
  const id = q.get("est");
  _pendingEstId = id ? String(id) : null;
}

function tentarRolarParaEst() {
  if (!_pendingEstId) return;
  const alvo =
    document.getElementById(_pendingEstId) ||
    document.querySelector(`[data-id="${_pendingEstId}"]`);
  if (!alvo) return; // ainda não renderizou

  alvo.scrollIntoView({ behavior: "smooth", block: "start" });
  _pendingEstId = null;

  // limpa a query (?est=...) e mantém apenas origin+pathname+hash
  const urlLimpa = `${location.origin}${location.pathname}${location.hash}`;
  history.replaceState({}, "", urlLimpa);
}

// ler no carregamento
document.addEventListener("DOMContentLoaded", lerEstIdDaQuery);

// observar a área de conteúdo; assim que a página montar, faz o scroll
document.addEventListener("DOMContentLoaded", () => {
  const area = document.querySelector(".content_area");
  if (!area) return;

  // tenta já (caso a página já esteja pronta)
  tentarRolarParaEst();

  const obs = new MutationObserver(() => tentarRolarParaEst());
  obs.observe(area, { childList: true, subtree: true });

  // também tenta quando o hash muda (você troca de tela)
  window.addEventListener("hashchange", () => {
    // se a query desaparecer, não há mais o que rolar
    lerEstIdDaQuery();
    // dá um tempo mínimo pro conteúdo montar e tenta de novo
    setTimeout(tentarRolarParaEst, 0);
  });
});





/***** ================== CLIMA DO DIA — LUA DINÂMICA ================== *****/

/* 1) Função de fase da Lua (aproximação robusta, erro típico < ~1 dia)
   Retorna: { fraction: 0..1 (0=nova, 0.5=cheia), waxing: true/false, name: "..." }
*/

// 1) Cálculo da fase (0..1) com nomes humanizados
function obterFaseLua(date = new Date()) {
  const msDia = 86400000;
  const data = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const jd = Math.floor(data.getTime() / msDia) + 2440587.5; // Julian Day

  const epoch = 2451550.1;        // 2000-01-06 18:14 UT
  const periodo = 29.530588861;   // período sinódico

  let dias = jd - epoch;
  dias = dias % periodo;
  if (dias < 0) dias += periodo;

  const fraction = dias / periodo;         // [0..1]
  const waxing = fraction < 0.5;           // crescente antes da cheia
  const nome = (function (f) {
    if (f < 0.03 || f > 0.97) return "Lua Nova";
    if (f < 0.22) return "Crescente Inicial";
    if (f < 0.28) return "Quarto Crescente";
    if (f < 0.47) return "Gibosa Crescente";
    if (f < 0.53) return "Lua Cheia";
    if (f < 0.72) return "Gibosa Minguante";
    if (f < 0.78) return "Quarto Minguante";
    if (f < 0.97) return "Minguante Final";
    return "Lua Nova";
  })(fraction);

  return { fraction, waxing, name: nome };
}




// 👇 colocar logo depois de obterFaseLua(...)
// 2) Rótulo humanizado
function rotuloFaseParaExibicao(fraction, nomeBasico) {
  const f = Number(fraction);

  if (f >= 0.48 && f <= 0.52) return "Lua Cheia";

  if ((f >= 0.44 && f < 0.48) || (f > 0.52 && f <= 0.56)) {
    const lado = f < 0.5 ? "gibosa crescente" : "gibosa minguante";
    return `Quase Cheia (${lado})`;
  }

  if ((f >= 0.00 && f <= 0.06) || (f >= 0.94 && f <= 1.00)) {
    const lado = f < 0.5 ? "crescente" : "minguante";
    return `Quase Nova (${lado})`;
  }

  return nomeBasico;
}





// === SVG da Lua com CLIP correto e orientação do hemisfério Sul ===
// 3) Desenho SVG com clip correto e orientação do hemisfério sul
function svgLua(fraction, waxing) {
  // % de iluminação física: p = (1 - cos(2πf)) / 2  →  0..1
  const p = (1 - Math.cos(2 * Math.PI * fraction)) / 2;

  const R = 60, cx = 70, cy = 70;

  const isNova = p <= 0.02;
  const isCheia = p >= 0.98;

  const baseDark = `<circle cx="${cx}" cy="${cy}" r="${R}" fill="#0c0f1a"/>`;
  const grad = `
    <defs>
      <radialGradient id="g" cx="50%" cy="45%">
        <stop offset="0%"  stop-color="#e8e8ea"/>
        <stop offset="70%" stop-color="#cfcfd4"/>
        <stop offset="100%" stop-color="#bdbdc4"/>
      </radialGradient>
    </defs>`;

  if (isNova) {
    return `<svg viewBox="0 0 140 140" width="140" height="140" role="img" aria-label="Lua Nova">
      ${baseDark}
    </svg>`;
  }

  if (isCheia) {
    return `<svg viewBox="0 0 140 140" width="140" height="140" role="img" aria-label="Lua Cheia">
      ${grad}
      <circle cx="${cx}" cy="${cy}" r="${R}" fill="url(#g)"/>
      <circle cx="${cx - 20}" cy="${cy - 20}" r="${R * 0.15}" fill="#ffffff20"/>
    </svg>`;
  }

  // deslocamento do "círculo de sombra" proporcional à iluminação:
  // dx = (1 - 2p) * R  →  p=0.5 (meia-lua) dá dx=0, p→1 aproxima dx→-R, p→0 aproxima dx→+R
  const dxMag = (1 - 2 * p) * R;
  // Hemisfério Sul: crescente (waxing) = luz à ESQUERDA, minguante = luz à DIREITA
  const dx = (waxing ? +1 : -1) * dxMag;

  // Máscara: começa tudo visível (retângulo branco + círculo branco),
  // e “recorta” a parte escura com um círculo preto deslocado por dx.
  return `<svg viewBox="0 0 140 140" width="140" height="140" role="img" aria-label="Fase da Lua">
    ${grad}
    <defs>
      <mask id="m">
        <rect x="0" y="0" width="140" height="140" fill="black"/>
        <circle cx="${cx}" cy="${cy}" r="${R}" fill="white"/>
        <circle cx="${cx + dx}" cy="${cy}" r="${R}" fill="black"/>
      </mask>
    </defs>
    ${baseDark}
    <circle cx="${cx}" cy="${cy}" r="${R}" fill="url(#g)" mask="url(#m)"/>
  </svg>`;
}




// === Utilitários: iluminação percentual e janelinhas de pico
function iluminacaoPctDaFracao(frac) {
  // 0..1 -> 0..100 (simétrica em torno da Cheia)
  return Math.round(frac <= 0.5 ? frac * 2 * 100 : (1 - frac) * 2 * 100);
}

// Usa a iluminação para “suavizar” o nome mostrado ao usuário
function rotuloFaseParaExibicao(fraction, nomeBase) {
  const pct = iluminacaoPctDaFracao(fraction); // 0..100
  // Se estiver com 90% ou mais, mostramos "Quase Cheia"
  if (pct >= 90 && pct < 100) return "Quase Cheia";
  return nomeBase;
}


// Tabela mínima de chuvas de meteoros (valores típicos de ZHR; aproximação)
const CHUVAS_METEOROS = [
  { nome: "Quadrântidas", inicio: "01-01", pico: "01-03", fim: "01-05", zhr: 110, hemisferio: "N" },
  { nome: "Líridas", inicio: "04-14", pico: "04-22", fim: "04-30", zhr: 18, hemisferio: "N" },
  { nome: "Eta Aquáridas", inicio: "04-19", pico: "05-05", fim: "05-28", zhr: 50, hemisferio: "S" },
  { nome: "Delta Aquáridas", inicio: "07-12", pico: "07-29", fim: "08-23", zhr: 20, hemisferio: "S" },
  { nome: "Perseidas", inicio: "07-17", pico: "08-12", fim: "08-24", zhr: 100, hemisferio: "N" },
  { nome: "Oriônidas", inicio: "10-02", pico: "10-21", fim: "11-07", zhr: 20, hemisferio: "ambos" },
  { nome: "Taurídeas", inicio: "10-20", pico: "11-05", fim: "11-20", zhr: 10, hemisferio: "ambos" },
  { nome: "Leônidas", inicio: "11-06", pico: "11-17", fim: "11-30", zhr: 15, hemisferio: "N" },
  { nome: "Geminidas", inicio: "12-04", pico: "12-14", fim: "12-17", zhr: 120, hemisferio: "ambos" },
];

// Carlópolis ~ Hemisfério Sul: penaliza levemente chuvas do Norte, e favorece as do Sul
function fatorHemisphere(chuva) {
  if (chuva.hemisferio === "ambos") return 1.0;
  if (chuva.hemisferio === "S") return 1.0;
  if (chuva.hemisferio === "N") return 0.6; // visíveis, mas mais baixas no céu
  return 0.9;
}

// Proximidade do pico (janela ±3 dias em torno do “pico” = 1.0; caindo até as bordas)
function fatorProximidadeDaData(date, chuva) {
  const y = date.getFullYear();
  const toDate = (mmdd) => new Date(`${y}-${mmdd}T00:00:00`);
  const di = toDate(chuva.inicio), dp = toDate(chuva.pico), df = toDate(chuva.fim);

  if (date < di || date > df) return 0;

  const d = (a, b) => Math.abs((a - b) / 86400000);
  const distanciaDoPico = d(date, dp);
  // Dentro de ±3 dias do pico: 1; depois decai linear até bordas da janela
  if (distanciaDoPico <= 3) return 1.0;

  // Atenua conforme distância ao pico e às bordas
  const span = Math.max(d(di, dp), d(df, dp));
  const decai = 1 - (distanciaDoPico / (span || 1));
  return Math.max(0, Math.min(1, decai));
}

// Calcula um “score” 0–100 baseado em (ZHR normalizada) × (céu escuro) × (hemisfério) × (proximidade do pico)
function calcularProbMeteoros(date, fracLua) {
  const ilum = iluminacaoPctDaFracao(fracLua) / 100; // 0..1
  const ceuEscuro = 1 - ilum;                        // 1 = escuro, 0 = claro (lua cheia)
  let melhor = { score: 0, detalhe: "Sem chuvas relevantes hoje." };

  for (const chuva of CHUVAS_METEOROS) {
    const prox = fatorProximidadeDaData(date, chuva);
    if (prox <= 0) continue;

    const hemis = fatorHemisphere(chuva);
    const zhrNorm = Math.min(1, chuva.zhr / 120); // 120 ~ Gemínidas como base alta
    const score = Math.round(100 * zhrNorm * ceuEscuro * hemis * prox);

    if (score > melhor.score) {
      melhor = {
        score,
        detalhe: `${chuva.nome} • pico: ${chuva.pico} • céu: ${Math.round(ceuEscuro * 100)}% escuro`
      };
    }
  }

  // Classificação textual
  let classe = "Baixa";
  if (melhor.score >= 65) classe = "Alta";
  else if (melhor.score >= 35) classe = "Média";

  return { score: melhor.score, classe, detalhe: melhor.detalhe };
}









// Função para carregar dados da represa (simulação - você pode integrar com API real)
async function carregarDadosRepresa() {
  const btn = document.querySelector('.btn-refresh');
  const original = btn ? btn.innerHTML : null;

  const setTxt = (sel, val) => { const el = document.querySelector(sel); if (el) el.textContent = val; };
  const show = (sel, yes) => { const el = document.querySelector(sel); if (el) el.style.display = yes ? '' : 'none'; };
  const fmtBR = (dIso) => {
    try {
      const d = new Date(dIso);
      return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
    } catch { return '—'; }
  };

  try {
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Atualizando...'; }

    const r = await fetch(API_REPRESA, { cache: 'no-store' });
    const data = await r.json();

    if (!data?.success) throw new Error(data?.error || 'Falha ao obter dados da represa');

    // --- Preenche Cota (m) ---
    setTxt('#cotaAtual', data.cotaAtual ?? '—');

    // --- Volume % (pode vir null) ---
    if (data.volumeUtil != null) {
      setTxt('#nr-volume', data.volumeUtil);
      setTxt('#volumeUtil', data.volumeUtil);
      show('#blocoVolumeUtil', true);     // <div id="blocoVolumeUtil">...</div> (opcional)
    } else {
      show('#blocoVolumeUtil', false);
    }

    // --- Vazões m³/s (podem vir null) ---
    if (data.vazaoAfluente != null) {
      setTxt('#vazaoAfluente', data.vazaoAfluente);
      show('#linhaVazaoAfluente', true);  // <div id="linhaVazaoAfluente">...</div> (opcional)
    } else {
      show('#linhaVazaoAfluente', false);
    }

    if (data.vazaoDefluente != null) {
      setTxt('#vazaoDefluente', data.vazaoDefluente);
      show('#linhaVazaoDefluente', true); // <div id="linhaVazaoDefluente">...</div> (opcional)
    } else {
      show('#linhaVazaoDefluente', false);
    }

    // --- Data / Fonte ---
    setTxt('#ultimaAtualizacao', fmtBR(data.atualizadoEm || Date.now()));
    setTxt('#fonteDados', `Fonte: ${data.fonte || '—'}`);

    // --- IDs alternativos (se você usa o bloco NR na home) ---
    setTxt('#nr-cota', data.cotaAtual ?? '—');
    setTxt('#nr-data', (data.atualizadoEm ? new Date(data.atualizadoEm).toLocaleDateString('pt-BR') : '—'));

    // realce visual, se você tiver essa função
    if (typeof destacarMudancas === 'function') destacarMudancas();

  } catch (err) {
    console.error('Represa:', err);
    // seu fallback visual de erro
    if (typeof mostrarErroCarregamento === 'function') {
      mostrarErroCarregamento();
    } else {
      // fallback simples
      alert('Não foi possível atualizar os dados da represa agora.');
    }
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = original; }
  }
}



// Busca os dados diretamente da página pública da CTG usando o reader "r.jina.ai"
// Esse endpoint retorna o HTML renderizado como texto, liberando CORS para leitura.
async function buscarCTGviaJina() {
  const url = 'https://r.jina.ai/http://www.ctgbr.com.br/operacoes/energia-hidreletrica/niveis-de-reservatorios/';
  const resp = await fetch(url, { cache: 'no-store' });
  if (!resp.ok) throw new Error('Falha ao acessar CTG');
  const txt = await resp.text();

  // Tenta capturar data/nota de atualização geral da página
  const atualizacao = extrairAtualizacao(txt) || 'Atualização recente';

  // Localiza o bloco onde aparece "Chavantes" e extrai métricas próximas
  const parsed = extrairLinhaChavantes(txt);
  if (!parsed) throw new Error('Não encontrou seção de Chavantes');

  const { cota, volume } = parsed;

  return {
    cota: cota || '—',
    volume: volume || '—',
    // Essas duas não vêm tabeladas de forma estável no site; mantemos traço por enquanto:
    vazaoAfluente: null,
    vazaoDefluente: null,
    atualizacao,
    fonte: 'CTG Brasil (via r.jina.ai)'
  };
}

// Procura uma linha com "Chavantes" e tenta ler números (cota e volume) próximos
function extrairLinhaChavantes(txt) {
  const lines = txt.split('\n').map(l => l.trim()).filter(Boolean);
  const i = lines.findIndex(l => /chavantes/i.test(l));
  if (i === -1) return null;

  let cota = null, volume = null;

  for (let k = i; k < Math.min(i + 80, lines.length); k++) {
    const l = lines[k];

    // Procura algo como "Cota 416,32" ou "416,32 m"
    if (!cota) {
      const m1 = l.match(/cota[^0-9]*([\d]{3}[.,]\d{1,2})/i);
      const m2 = l.match(/^([\d]{3}[.,]\d{1,2})\s*m\b/i);
      if (m1) cota = m1[1].replace(',', '.');
      else if (m2) cota = m2[1].replace(',', '.');
    }

    // Procura número com % próximo (ex.: "52,31 %")
    if (!volume) {
      const mv = l.match(/(\d{1,3}[.,]\d{1,2})\s*%/);
      if (mv) volume = mv[1].replace(',', '.');
    }

    if (cota && volume) break;
  }

  return { cota, volume };
}

// Extrai uma data ou linha de "Atualizado em ..." se existir no topo/rodapé
function extrairAtualizacao(txt) {
  const m = txt.match(/atualiza(?:do|ção)[^0-9]*(\d{1,2}\/\d{1,2}\/\d{2,4})/i);
  if (m) {
    // Formata PT-BR preservando a string da página:
    return `Atualizado em ${m[1]}`;
  }
  return null;
}

/*
async function obterDadosReaisRepresa() {
  try {
    const response = await fetch('http://localhost:3001/api/represa/chavantes');
    const data = await response.json();
    
    if (data.success) {
      return {
        cotaAtual: data.cotaAtual || 'N/D',
        vazaoAfluente: data.vazaoAfluente || 'N/D',
        vazaoDefluente: data.vazaoDefluente || 'N/D',
        ultimaAtualizacao: new Date().toLocaleString('pt-BR'),
        fonte: data.fonte
      };
    }
  } catch (error) {
    console.error('Erro ao acessar proxy:', error);
    // Fallback para dados locais
    return await obterDadosHistoricos();
  }
}

*/

async function obterDadosSiteAlternativo() {
  try {
    // Exemplo usando site da Duke Energy (ajuste conforme necessário)
    const response = await fetch('/api/proxy-represa'); // Você precisaria criar um proxy
    if (response.ok) {
      const data = await response.json();
      return {
        cotaAtual: data.nivel || '416.25',
        vazaoAfluente: data.afluente || '150',
        vazaoDefluente: data.defluente || '145',
        ultimaAtualizacao: new Date().toLocaleString('pt-BR'),
        fonte: 'Duke Energy'
      };
    }
  } catch (error) {
    console.log('Fonte alternativa indisponível');
  }

  // Fallback para dados históricos/estimados
  return await obterDadosHistoricos();
}

// Função fallback com dados históricos
async function obterDadosHistoricos() {
  // Dados baseados em médias históricas com pequena variação
  const data = new Date();
  const hora = data.getHours();

  // Simula variação diária baseada na hora do dia
  const variacaoHora = Math.sin(hora * Math.PI / 12) * 0.05;
  const variacaoAleatoria = (Math.random() - 0.5) * 0.1;

  const cotaBase = 416.20; // Cota média histórica
  const cotaAtual = cotaBase + variacaoHora + variacaoAleatoria;

  // Vazões baseadas em padrões sazonais
  const vazaoBase = 120;
  const vazaoVariacao = Math.random() * 50;

  return {
    cotaAtual: cotaAtual.toFixed(2),
    vazaoAfluente: Math.floor(vazaoBase + vazaoVariacao).toString(),
    vazaoDefluente: Math.floor(vazaoBase + vazaoVariacao * 0.8).toString(),
    ultimaAtualizacao: new Date().toLocaleString('pt-BR'),
    fonte: 'Dados Estimados'
  };
}



// Atualize a função carregarDadosRepresa:
// Função para carregar dados REAIS da represa (CTG via proxy sem CORS)
// === NOVO: URL do seu endpoint (troque pelo seu domínio do Vercel) ===
const API_REPRESA = 'https://olacarlopolis.vercel.app/api/represa/chavantes';

// === util: setar texto seguro no DOM ===
function setTexto(sel, val) {
  const el = document.querySelector(sel);
  if (el) el.textContent = (val ?? '—');
}

async function carregarDadosRepresa() {
  const btn = document.querySelector('.btn-refresh');
  const originalText = btn ? btn.innerHTML : null;

  try {
    if (btn) {
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Atualizando...';
      btn.disabled = true;
    }

    // 1) Tenta a API própria (serverless, sem CORS no cliente)
    const r = await fetch(API_REPRESA, { cache: 'no-store' });
    const data = await r.json();

    if (!data?.success) throw new Error('API retornou sem sucesso');

    // Preenche UI principal
    setTexto('#cotaAtual', data.cotaAtual);
    setTexto('#vazaoAfluente', data.vazaoAfluente ?? '—');
    setTexto('#vazaoDefluente', data.vazaoDefluente ?? '—');
    setTexto('#ultimaAtualizacao',
      new Date(data.atualizadoEm || Date.now()).toLocaleString('pt-BR'));

    // Exibe fonte e, se existir UI “NR” (carrossel da home), também preenche
    setTexto('#fonteDados', `Fonte: ${data.fonte}`);
    setTexto('#nr-cota', data.cotaAtual);
    setTexto('#nr-volume', data.volumeUtil);
    setTexto('#nr-data', new Date(data.atualizadoEm || Date.now()).toLocaleDateString('pt-BR'));

    // Destaque visual
    if (typeof destacarMudancas === 'function') destacarMudancas();
  } catch (err) {
    console.error('Erro ao carregar dados:', err);

    // 2) Fallback: tenta seu leitor atual (se quiser manter)
    try {
      if (typeof buscarCTGviaJina === 'function') {
        const dados = await buscarCTGviaJina(); // mantém seu leitor como 2ª opção
        setTexto('#cotaAtual', dados.cota);
        setTexto('#vazaoAfluente', dados.vazaoAfluente ?? '—');
        setTexto('#vazaoDefluente', dados.vazaoDefluente ?? '—');
        setTexto('#ultimaAtualizacao', dados.atualizacao);
        setTexto('#fonteDados', `Fonte: ${dados.fonte}`);
        setTexto('#nr-cota', dados.cota);
        setTexto('#nr-volume', dados.volume);
        setTexto('#nr-data', dados.atualizacao);
        if (typeof destacarMudancas === 'function') destacarMudancas();
        return;
      }
      // 3) Último fallback (estimado/local) se o leitor também falhar
      if (typeof obterDadosHistoricos === 'function') {
        const alt = await obterDadosHistoricos();
        setTexto('#cotaAtual', alt.cotaAtual);
        setTexto('#vazaoAfluente', alt.vazaoAfluente);
        setTexto('#vazaoDefluente', alt.vazaoDefluente);
        setTexto('#ultimaAtualizacao', alt.ultimaAtualizacao);
        setTexto('#fonteDados', `Fonte: ${alt.fonte}`);
        setTexto('#nr-cota', alt.cotaAtual);
        setTexto('#nr-volume', alt.volumeUtil || alt.volume || '—');
        setTexto('#nr-data', alt.ultimaAtualizacao);
        if (typeof destacarMudancas === 'function') destacarMudancas();
        return;
      }
      throw new Error('Sem fallback disponível');
    } catch (e2) {
      console.error('Fallback falhou:', e2);
      if (typeof mostrarErroCarregamento === 'function') mostrarErroCarregamento();
    }
  } finally {
    if (btn) {
      btn.innerHTML = originalText;
      btn.disabled = false;
    }
  }
}



// Função para mostrar erro de carregamento
function mostrarErroCarregamento() {
  document.getElementById('cotaAtual').textContent = 'Erro';
  document.getElementById('vazaoAfluente').textContent = 'Erro';
  document.getElementById('vazaoDefluente').textContent = 'Erro';
  document.getElementById('ultimaAtualizacao').textContent = 'Falha ao carregar';

  const erroElement = document.getElementById('erroCarregamento') || (() => {
    const el = document.createElement('div');
    el.id = 'erroCarregamento';
    el.style.cssText = 'background: #f8d7da; color: #721c24; padding: 1rem; border-radius: 6px; margin: 1rem 0;';
    document.querySelector('.represa-card').insertBefore(el, document.querySelector('.represa-note'));
    return el;
  })();

  erroElement.innerHTML = `
    <strong>⚠️ Erro de conexão</strong>
    <div style="font-size: 0.9rem; margin-top: 0.5rem;">
      Não foi possível conectar às fontes de dados oficiais. 
      Tente novamente em alguns instantes.
    </div>
  `;
}


// Atualize o HTML da página represa para incluir os novos elementos:
function mostrarRepresaChavantes() {
  if (location.hash !== "#represa-chavantes") location.hash = "#represa-chavantes";

  const area = document.querySelector(".content_area");
  area.innerHTML = `
    <div class="page-header">
      <h2>💧 Represa de Chavantes</h2>
      <i class="fa-solid fa-share-nodes share-btn" 
         onclick="compartilharPagina('#represa','Represa de Chavantes','Acompanhe o nível da água da Represa de Chavantes')"></i>
    </div>

    <div class="represa-wrap">
      <div class="represa-card">
        <div class="represa-header">
          <i class="fas fa-water" style="font-size: 3rem; color: #1e90ff; margin-bottom: 1rem;"></i>
          <h3>Nível da Água - Tempo Real</h3>
          <p>Monitoramento da Represa de Chavantes</p>
          <div id="fonteDados" style="font-size: 0.8rem; color: #666; margin-top: 0.5rem;"></div>
        </div>

       

        <!-- Espaço para análise dinâmica do nível -->

        <div class="represa-info">
         

          <div class="info-box">
            <h4>ℹ️ Represa:</h4>
            <p><strong>Capacidade:</strong> 9.410 hm³<br>
               <strong>Rio:</strong> Paranapanema<br>
               <strong>Operadora:</strong> Duke Energy</p>
          </div>
        </div>

        <div class="represa-actions">
          
          <a href="https://www.ctgbr.com.br/operacoes/energia-hidreletrica/niveis-de-reservatorios/" 
             target="_blank" 
             class="btn-external">
            <i class="fas fa-external-link-alt"></i> Site Oficial
          </a>
        </div>

      

     
      </div>
    </div>
  `;

  // Carrega os dados ao abrir a página
  carregarDadosRepresa();

  // e, no botão "Atualizar Dados", mantenha:
  document.addEventListener('click', (ev) => {
    const t = ev.target.closest('.btn-refresh');
    if (t) carregarDadosRepresa();
  });

  // Atualização automática a cada 5 minutos
  if (window.represaInterval) clearInterval(window.represaInterval);
  window.represaInterval = setInterval(carregarDadosRepresa, 5 * 60 * 1000);
}




// Função para destacar mudanças nos valores
function destacarMudancas() {
  const valores = document.querySelectorAll('.dado-valor');
  valores.forEach(valor => {
    valor.classList.add('destaque');
    setTimeout(() => {
      valor.classList.remove('destaque');
    }, 2000);
  });
}

// Adicione este evento listener para o menu (procure onde estão os outros event listeners do menu):
document.addEventListener("click", (e) => {
  const menuRepresa = e.target.closest("#menuRepresa");
  if (menuRepresa) {
    e.preventDefault();
    mostrarRepresaChavantes();
  }
});



const linkRepresa = document.getElementById("menuRepresa");
if (linkRepresa) {
  linkRepresa.addEventListener("click", (e) => {
    e.preventDefault();
    mostrarRepresaChavantes();
  });
}






// Torna o array categories acessível para o painel admin
try { window.statusEstabelecimentos = statusEstabelecimentos; } catch (e) { }





document.addEventListener("DOMContentLoaded", () => {
  const iconeContador = document.getElementById("iconeUsuarios"); // Altere para o ID real do ícone
  const modal = document.getElementById("modalLogin");
  const btnFechar = document.querySelector(".close-modal");

  if (iconeContador && modal) {
    iconeContador.addEventListener("click", (e) => {
      e.preventDefault();
      modal.classList.remove("hidden");
    });
  }

  if (btnFechar) {
    btnFechar.addEventListener("click", () => {
      modal.classList.add("hidden");
    });
  }

  // Fechar ao clicar fora da modal
  window.addEventListener("click", (event) => {
    if (event.target == modal) {
      modal.classList.add("hidden");
    }
  });
});



document.addEventListener("click", (e) => {
  const a = e.target.closest("a[data-ig], a.js-ig-link");
  if (!a) return;

  // pega o username/valor do instagram do dataset, ou do href
  const raw = a.getAttribute("data-ig") || a.dataset.ig || a.getAttribute("href") || "";
  if (!raw) return;

  // Só intercepta links que sejam Instagram
  if (!/instagram\.com/i.test(raw) && !/instagram/i.test(raw)) return;

  e.preventDefault();
  openInstagramSmart(raw);
});



document.addEventListener("click", (e) => {
  const a = e.target.closest("a");
  if (!a) return;

  const href = a.getAttribute("href") || "";
  const isIG = /instagram\.com/i.test(href) || a.classList.contains("js-ig-link") || a.dataset.ig;

  if (!isIG) return;

  e.preventDefault();
  e.stopPropagation();

  const raw = a.dataset.ig || href;
  openInstagramSmart(raw);
});






