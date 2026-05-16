import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getDatabase,
  ref,
  get,
  set,
  update,
  remove,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyDWHsZSHwVFpD88ChUywjw_GdZPifdrRGI",
  authDomain: "contadoracessos.firebaseapp.com",
  databaseURL: "https://contadoracessos-default-rtdb.firebaseio.com",
  projectId: "contadoracessos",
  storageBucket: "contadoracessos.firebasestorage.app",
  messagingSenderId: "521517291315",
  appId: "1:521517291315:web:74f8d878d2d8769460d046",
  measurementId: "G-BXPWYWK61F"
};

const MASTER_EMAILS = ["bruno.4and@gmail.com"];
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const storage = getStorage(app);

let state = {
  user: null,
  profile: null,
  clientes: [],
  usuarios: [],
  eventos: [],
  selectedClientId: null,
  selectedEventId: null,
  clientImages: []
};

const $ = (id) => document.getElementById(id);

const views = {
  dashboard: $("dashboardView"),
  clientes: $("clientesView"),
  eventos: $("eventosView"),
  financeiro: $("financeiroView"),
  usuarios: $("usuariosView"),
  minhaEmpresa: $("minhaEmpresaView")
};

const viewCopy = {
  dashboard: ["Visao geral", "Resumo do ambiente administrativo."],
  clientes: ["Clientes", "Cadastre e edite os dados comerciais."],
  eventos: ["Eventos", "Configure eventos e divulgacoes."],
  financeiro: ["Financeiro", "Visao consolidada dos clientes e faturas."],
  usuarios: ["Usuarios", "Crie acessos e vincule clientes."],
  minhaEmpresa: ["Minha empresa", "Edite os dados liberados para seu cadastro."]
};

function emailKey(email) {
  return String(email || "").trim().toLowerCase().replace(/\./g, "_");
}

function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function normalizeName(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function canManageClients() {
  return ["master", "admin"].includes(state.profile?.role);
}

function isMaster() {
  return state.profile?.role === "master";
}

function moneyBR(value) {
  return Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function numberFromMoney(value) {
  const cleaned = String(value || "").replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function showToast(message) {
  const toast = $("toast");
  toast.textContent = message;
  toast.classList.remove("hidden");
  setTimeout(() => toast.classList.add("hidden"), 3200);
}

function setBusy(button, busy, text) {
  if (!button) return;
  button.disabled = busy;
  if (text) button.dataset.originalText = button.dataset.originalText || button.innerHTML;
  if (busy && text) button.innerHTML = text;
  if (!busy && button.dataset.originalText) button.innerHTML = button.dataset.originalText;
}

async function loadProfile(user) {
  const uidSnap = await get(ref(db, `usuariosByUid/${user.uid}`));
  if (uidSnap.exists()) return { uid: user.uid, ...uidSnap.val() };

  const legacySnap = await get(ref(db, `usuarios/${emailKey(user.email)}`));
  if (legacySnap.exists()) return { uid: user.uid, ...legacySnap.val() };

  if (MASTER_EMAILS.includes(String(user.email || "").toLowerCase())) {
    const profile = {
      uid: user.uid,
      email: user.email,
      role: "master",
      status: "ativo",
      permissoes: { dados: true, imagens: true, cardapio: true, promocoes: true, financeiro: true }
    };
    await saveUserProfile(profile);
    return profile;
  }

  return null;
}

async function saveUserProfile(profile) {
  const payload = {
    uid: profile.uid,
    email: String(profile.email || "").toLowerCase(),
    role: profile.role || "cliente",
    clienteId: profile.clienteId || "",
    status: profile.status || "ativo",
    permissoes: profile.permissoes || {},
    updatedAt: serverTimestamp()
  };
  await set(ref(db, `usuariosByUid/${profile.uid}`), payload);
  await set(ref(db, `usuarios/${emailKey(payload.email)}`), payload);
}

async function loadAllData() {
  const [clientesSnap, usersSnap, eventosSnap] = await Promise.all([
    get(ref(db, "clientes")),
    get(ref(db, "usuariosByUid")),
    get(ref(db, "eventos"))
  ]);

  state.clientes = [];
  if (clientesSnap.exists()) {
    clientesSnap.forEach((child) => state.clientes.push({ id: child.key, ...child.val() }));
  }
  state.clientes.sort((a, b) => String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR"));

  state.usuarios = [];
  if (usersSnap.exists()) {
    usersSnap.forEach((child) => state.usuarios.push({ uid: child.key, ...child.val() }));
  }
  state.usuarios.sort((a, b) => String(a.email || "").localeCompare(String(b.email || "")));

  state.eventos = [];
  if (eventosSnap.exists()) {
    eventosSnap.forEach((child) => state.eventos.push({ id: child.key, ...child.val() }));
  }
  state.eventos.sort((a, b) => String(b.data || "").localeCompare(String(a.data || "")));

  renderStats();
  renderClientsList();
  renderUsersList();
  fillUserClientSelect();
  fillEventClientSelect();
  renderEventsList();
  renderFinanceiro();
}

function renderStats() {
  $("statClientes").textContent = String(state.clientes.length);
  $("statUsuarios").textContent = String(state.usuarios.length);
  $("statAtivos").textContent = String(state.clientes.filter((c) => c.status === "ativo").length);
  $("statPendentes").textContent = String(state.clientes.filter((c) => c.status === "pendente").length);
  $("statEventos").textContent = String(state.eventos.length);
}

function updateChrome() {
  $("profileEmail").textContent = state.user?.email || "-";
  $("profileRole").textContent = roleLabel(state.profile?.role);

  document.querySelectorAll("[data-role='staff']").forEach((el) => {
    el.classList.toggle("hidden", !canManageClients());
  });
  document.querySelectorAll("[data-role='cliente']").forEach((el) => {
    el.classList.toggle("hidden", canManageClients());
  });

  const masterOption = $("newUserRole")?.querySelector("option[value='master']");
  if (masterOption) masterOption.disabled = !isMaster();
}

function roleLabel(role) {
  return {
    master: "Usuario master",
    admin: "Admin geral",
    cliente: "Admin do cliente"
  }[role] || "Sem perfil";
}

function switchView(name) {
  const target = views[name] ? name : "dashboard";
  Object.entries(views).forEach(([key, el]) => el.classList.toggle("hidden", key !== target));
  document.querySelectorAll(".nav-admin button").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.view === target);
  });
  const [title, subtitle] = viewCopy[target];
  $("viewTitle").textContent = title;
  $("viewSubtitle").textContent = subtitle;

  if (target === "minhaEmpresa") renderClientOnlyEditor();
}

function resetClientForm() {
  state.selectedClientId = null;
  state.clientImages = [];
  $("clientForm").reset();
  $("clientId").value = "";
  $("deleteClientButton").classList.add("hidden");
  renderClientImagesPreview();
}

function getClientFormData() {
  const name = $("clientName").value.trim();
  const id = $("clientId").value || slugify(name);
  return {
    id,
    nome: name,
    nomeNormalizado: normalizeName(name),
    categoria: $("clientCategory").value.trim(),
    status: $("clientStatus").value,
    pagamentoStatus: $("clientPaymentStatus").value,
    contato: $("clientContact").value.trim(),
    whatsapp: $("clientWhatsapp").value.trim(),
    endereco: $("clientAddress").value.trim(),
    horario: $("clientHours").value.trim(),
    instagram: $("clientInstagram").value.trim(),
    facebook: $("clientFacebook").value.trim(),
    imagem: $("clientImage").value.trim(),
    imagens: state.clientImages.slice(0, 10),
    cardapioLink: $("clientMenuLink").value.trim(),
    infoAdicional: $("clientInfo").value.trim(),
    observacaoAdmin: $("clientAdminNote").value.trim(),
    updatedAt: serverTimestamp(),
    updatedBy: state.user?.uid || ""
  };
}

function fillClientForm(client) {
  state.selectedClientId = client.id;
  $("clientId").value = client.id || "";
  $("clientName").value = client.nome || client.name || "";
  $("clientCategory").value = client.categoria || client.category || "";
  $("clientStatus").value = client.status || "ativo";
  $("clientPaymentStatus").value = client.pagamentoStatus || "em_aberto";
  $("clientContact").value = client.contato || client.contact || "";
  $("clientWhatsapp").value = client.whatsapp || "";
  $("clientAddress").value = client.endereco || client.address || "";
  $("clientHours").value = client.horario || client.hours || "";
  $("clientInstagram").value = client.instagram || "";
  $("clientFacebook").value = client.facebook || "";
  $("clientImage").value = client.imagem || client.image || "";
  state.clientImages = Array.isArray(client.imagens) ? client.imagens.slice(0, 10) : [];
  $("clientMenuLink").value = client.cardapioLink || "";
  $("clientInfo").value = client.infoAdicional || "";
  $("clientAdminNote").value = client.observacaoAdmin || "";
  $("deleteClientButton").classList.remove("hidden");
  renderClientImagesPreview();
}

function renderClientImagesPreview() {
  const box = $("clientImagesPreview");
  const count = $("clientImagesCount");
  if (!box || !count) return;

  count.textContent = `${state.clientImages.length}/10`;
  if (!state.clientImages.length) {
    box.innerHTML = `<div class="list-meta">Nenhuma imagem enviada ainda.</div>`;
    return;
  }

  box.innerHTML = state.clientImages.map((url, index) => `
    <article class="image-tile">
      <img src="${escapeAttr(url)}" alt="Imagem ${index + 1}">
      <div>
        <button type="button" data-main-image="${index}">Destaque</button>
        <button type="button" data-remove-image="${index}" class="danger-mini">Remover</button>
      </div>
    </article>
  `).join("");

  box.querySelectorAll("[data-main-image]").forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.mainImage);
      $("clientImage").value = state.clientImages[index] || "";
      showToast("Imagem principal selecionada.");
    });
  });

  box.querySelectorAll("[data-remove-image]").forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.removeImage);
      state.clientImages.splice(index, 1);
      if (!state.clientImages.includes($("clientImage").value)) {
        $("clientImage").value = state.clientImages[0] || "";
      }
      renderClientImagesPreview();
    });
  });
}

async function uploadClientImages(files) {
  const currentId = $("clientId").value || slugify($("clientName").value.trim()) || `cliente-${Date.now()}`;
  const remaining = Math.max(0, 10 - state.clientImages.length);
  const selected = Array.from(files || []).slice(0, remaining);

  if (!selected.length) {
    showToast("Limite de 10 imagens atingido.");
    return;
  }

  showToast("Enviando imagens...");
  const urls = await uploadImagesForClient(currentId, selected);
  state.clientImages.push(...urls);

  if (!$("clientImage").value && state.clientImages[0]) $("clientImage").value = state.clientImages[0];
  renderClientImagesPreview();
  showToast("Imagens enviadas.");
}

async function uploadImagesForClient(clientId, files) {
  const urls = [];
  for (const file of Array.from(files || [])) {
    const path = `clientes/${clientId}/imagens/${Date.now()}-${slugify(file.name)}`;
    const fileRef = storageRef(storage, path);
    await uploadBytes(fileRef, file);
    urls.push(await getDownloadURL(fileRef));
  }
  return urls;
}

function renderClientsList() {
  const box = $("clientsList");
  if (!box) return;

  const q = String($("clientSearch")?.value || "").toLowerCase().trim();
  const list = state.clientes.filter((client) => {
    const hay = `${client.nome || ""} ${client.categoria || ""} ${client.contato || ""}`.toLowerCase();
    return !q || hay.includes(q);
  });

  if (!list.length) {
    box.innerHTML = `<div class="list-meta">Nenhum cliente encontrado.</div>`;
    return;
  }

  box.innerHTML = list.map((client) => `
    <article class="client-row">
      <img src="${escapeAttr(client.imagem || (client.imagens && client.imagens[0]) || "../images/img_padrao_site/logo_1.png")}" alt="${escapeAttr(client.nome || "Cliente")}">
      <div class="client-main">
        <div class="list-title">${escapeHtml(client.nome || client.id)}</div>
        <div class="list-meta">${escapeHtml(client.categoria || "Sem categoria")} - ${escapeHtml(client.contato || "Sem telefone")}</div>
        <div class="client-tags">
          <span class="badge ${escapeAttr(client.status || "pendente")}">${statusLabel(client.status)}</span>
          <span class="badge ${escapeAttr(client.pagamentoStatus || "em_aberto")}">${paymentLabel(client.pagamentoStatus)}</span>
          <span class="badge">${Array.isArray(client.imagens) ? client.imagens.length : 0} imagens</span>
        </div>
      </div>
      <div class="client-money">
        <strong>${moneyBR(client.valorMensal || 0)}</strong>
        <span>Venc. ${client.vencimentoDia || "-"}</span>
      </div>
      <button type="button" data-edit-client="${escapeAttr(client.id)}">Editar</button>
    </article>
  `).join("");

  box.querySelectorAll("[data-edit-client]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const client = state.clientes.find((item) => item.id === btn.dataset.editClient);
      if (client) fillClientForm(client);
    });
  });
}

function renderUsersList() {
  const box = $("usersList");
  if (!box) return;

  if (!state.usuarios.length) {
    box.innerHTML = `<div class="list-meta">Nenhum usuario encontrado.</div>`;
    return;
  }

  box.innerHTML = state.usuarios.map((user) => {
    const client = state.clientes.find((item) => item.id === user.clienteId);
    return `
      <article class="list-card">
        <div class="list-title">${escapeHtml(user.email || user.uid)}</div>
        <div class="list-meta">${roleLabel(user.role)}${client ? ` - ${escapeHtml(client.nome)}` : ""}</div>
        <span class="badge ${escapeAttr(user.status || "ativo")}">${statusLabel(user.status)}</span>
      </article>
    `;
  }).join("");
}

function fillUserClientSelect() {
  const select = $("newUserClient");
  if (!select) return;
  select.innerHTML = `<option value="">Sem vinculo</option>` + state.clientes.map((client) => (
    `<option value="${escapeAttr(client.id)}">${escapeHtml(client.nome || client.id)}</option>`
  )).join("");
}

function fillEventClientSelect() {
  const select = $("eventClient");
  if (!select) return;
  select.innerHTML = `<option value="">Sem cliente vinculado</option>` + state.clientes.map((client) => (
    `<option value="${escapeAttr(client.id)}">${escapeHtml(client.nome || client.id)}</option>`
  )).join("");
}

function resetEventForm() {
  state.selectedEventId = null;
  $("eventForm").reset();
  $("eventId").value = "";
  $("deleteEventButton").classList.add("hidden");
}

function fillEventForm(evento) {
  state.selectedEventId = evento.id;
  $("eventId").value = evento.id || "";
  $("eventTitle").value = evento.titulo || "";
  $("eventClient").value = evento.clienteId || "";
  $("eventDate").value = evento.data || "";
  $("eventTime").value = evento.horario || "";
  $("eventPlace").value = evento.local || "";
  $("eventStatus").value = evento.status || "ativo";
  $("eventImage").value = evento.imagem || "";
  $("eventDescription").value = evento.descricao || "";
  $("deleteEventButton").classList.remove("hidden");
}

function getEventFormData() {
  const title = $("eventTitle").value.trim();
  const clienteId = $("eventClient").value;
  const client = state.clientes.find((item) => item.id === clienteId);
  return {
    id: $("eventId").value || `${slugify(title)}-${Date.now()}`,
    titulo: title,
    clienteId,
    clienteNome: client?.nome || "",
    data: $("eventDate").value,
    horario: $("eventTime").value,
    local: $("eventPlace").value.trim(),
    status: $("eventStatus").value,
    imagem: $("eventImage").value.trim(),
    descricao: $("eventDescription").value.trim(),
    updatedAt: serverTimestamp(),
    updatedBy: state.user?.uid || ""
  };
}

function renderEventsList() {
  const box = $("eventsList");
  if (!box) return;

  const q = String($("eventSearch")?.value || "").toLowerCase().trim();
  const list = state.eventos.filter((evento) => {
    const hay = `${evento.titulo || ""} ${evento.clienteNome || ""} ${evento.local || ""}`.toLowerCase();
    return !q || hay.includes(q);
  });

  if (!list.length) {
    box.innerHTML = `<div class="list-meta">Nenhum evento cadastrado.</div>`;
    return;
  }

  box.innerHTML = list.map((evento) => `
    <article class="list-card event-card">
      ${evento.imagem ? `<img src="${escapeAttr(evento.imagem)}" alt="${escapeAttr(evento.titulo || "Evento")}">` : ""}
      <div class="list-title">${escapeHtml(evento.titulo || evento.id)}</div>
      <div class="list-meta">${escapeHtml(evento.clienteNome || "Sem cliente")} - ${escapeHtml(evento.data || "Sem data")} ${escapeHtml(evento.horario || "")}</div>
      <div class="list-meta">${escapeHtml(evento.local || "Sem local")}</div>
      <span class="badge ${escapeAttr(evento.status || "ativo")}">${eventStatusLabel(evento.status)}</span>
      <button type="button" data-edit-event="${escapeAttr(evento.id)}">Editar</button>
    </article>
  `).join("");

  box.querySelectorAll("[data-edit-event]").forEach((button) => {
    button.addEventListener("click", () => {
      const evento = state.eventos.find((item) => item.id === button.dataset.editEvent);
      if (evento) fillEventForm(evento);
    });
  });
}

async function uploadEventImage(file) {
  if (!file) return;
  const id = $("eventId").value || slugify($("eventTitle").value.trim()) || `evento-${Date.now()}`;
  const path = `eventos/${id}/${Date.now()}-${slugify(file.name)}`;
  const fileRef = storageRef(storage, path);
  showToast("Enviando imagem do evento...");
  await uploadBytes(fileRef, file);
  $("eventImage").value = await getDownloadURL(fileRef);
  showToast("Imagem do evento enviada.");
}

function renderFinanceiro() {
  const box = $("financeList");
  if (!box) return;

  const filter = $("financeFilter")?.value || "todos";
  const q = String($("financeSearch")?.value || "").toLowerCase().trim();
  const list = state.clientes.filter((client) => {
    const matchesFilter = filter === "todos" || (client.pagamentoStatus || "em_aberto") === filter;
    const hay = `${client.nome || ""} ${client.categoria || ""} ${client.contato || ""}`.toLowerCase();
    return matchesFilter && (!q || hay.includes(q));
  });

  const paid = state.clientes.filter((c) => c.pagamentoStatus === "pago");
  const open = state.clientes.filter((c) => !c.pagamentoStatus || c.pagamentoStatus === "em_aberto");
  const free = state.clientes.filter((c) => c.pagamentoStatus === "isento");
  const total = paid.reduce((sum, c) => sum + Number(c.valorMensal || 0), 0);

  $("financePaid").textContent = String(paid.length);
  $("financeOpen").textContent = String(open.length);
  $("financeFree").textContent = String(free.length);
  $("financeTotal").textContent = moneyBR(total);

  if (!list.length) {
    box.innerHTML = `<div class="list-meta">Nenhum cliente no filtro selecionado.</div>`;
    return;
  }

  box.innerHTML = list.map((client) => `
    <article class="finance-row" data-client-id="${escapeAttr(client.id)}">
      <div>
        <div class="list-title">${escapeHtml(client.nome || client.id)}</div>
        <div class="list-meta">${escapeHtml(client.categoria || "Sem categoria")} - ${escapeHtml(client.contato || "Sem telefone")}</div>
      </div>
      <label>Status
        <select data-finance-field="pagamentoStatus">
          <option value="em_aberto" ${client.pagamentoStatus === "em_aberto" || !client.pagamentoStatus ? "selected" : ""}>Em aberto</option>
          <option value="pago" ${client.pagamentoStatus === "pago" ? "selected" : ""}>Pago</option>
          <option value="isento" ${client.pagamentoStatus === "isento" ? "selected" : ""}>Isento</option>
        </select>
      </label>
      <label>Plano<input data-finance-field="plano" value="${escapeAttr(client.plano || "")}" placeholder="Ex.: Mensal"></label>
      <label>Valor<input data-finance-field="valorMensal" value="${escapeAttr(client.valorMensal || "")}" placeholder="R$"></label>
      <label>Venc.<input data-finance-field="vencimentoDia" value="${escapeAttr(client.vencimentoDia || "")}" placeholder="Dia"></label>
      <label class="finance-note">Obs.<input data-finance-field="financeiroObs" value="${escapeAttr(client.financeiroObs || "")}"></label>
      <button type="button" data-save-finance="${escapeAttr(client.id)}">Salvar</button>
    </article>
  `).join("");

  box.querySelectorAll("[data-save-finance]").forEach((button) => {
    button.addEventListener("click", async () => {
      const row = button.closest(".finance-row");
      const id = button.dataset.saveFinance;
      const payload = {};
      row.querySelectorAll("[data-finance-field]").forEach((field) => {
        payload[field.dataset.financeField] = field.dataset.financeField === "valorMensal"
          ? numberFromMoney(field.value)
          : field.value.trim();
      });
      payload.updatedAt = serverTimestamp();
      payload.updatedBy = state.user?.uid || "";
      await update(ref(db, `clientes/${id}`), payload);
      showToast("Financeiro atualizado.");
      await loadAllData();
    });
  });
}

function renderClientOnlyEditor() {
  const mount = $("clientOnlyMount");
  const client = state.clientes.find((item) => item.id === state.profile?.clienteId);
  if (!client) {
    mount.innerHTML = `<p>Nenhum cliente vinculado a este usuario. Fale com o administrador.</p>`;
    return;
  }

  const imagens = Array.isArray(client.imagens) ? client.imagens.slice(0, 10) : [];

  mount.innerHTML = `
    <form id="clientOnlyForm" class="grid-form">
      <label>Nome<input id="coName" value="${escapeAttr(client.nome || "")}"></label>
      <label>Telefone<input id="coContact" value="${escapeAttr(client.contato || "")}"></label>
      <label>WhatsApp<input id="coWhatsapp" value="${escapeAttr(client.whatsapp || "")}"></label>
      <label>Endereco<input id="coAddress" value="${escapeAttr(client.endereco || "")}"></label>
      <label>Horario<input id="coHours" value="${escapeAttr(client.horario || "")}"></label>
      <label>Instagram<input id="coInstagram" value="${escapeAttr(client.instagram || "")}"></label>
      <label>Imagem principal<input id="coImage" value="${escapeAttr(client.imagem || "")}"></label>
      <label>Link do cardapio<input id="coMenuLink" value="${escapeAttr(client.cardapioLink || "")}"></label>
      <section class="wide upload-panel">
        <div class="section-head compact">
          <div>
            <h3>Minhas imagens</h3>
            <p>Envie ate 10 imagens para sua empresa.</p>
          </div>
          <span id="coImagesCount" class="badge">${imagens.length}/10</span>
        </div>
        <input id="coImagesUpload" type="file" accept="image/*" multiple>
        <div id="coImagesPreview" class="image-grid">
          ${renderImagesMarkup(imagens, "co")}
        </div>
      </section>
      <label class="wide">Informacoes adicionais<textarea id="coInfo" rows="4">${escapeHtml(client.infoAdicional || "")}</textarea></label>
      <div class="form-actions wide"><button type="submit">Salvar meus dados</button></div>
    </form>
  `;

  mount.querySelector("#coImagesUpload").addEventListener("change", async (event) => {
    const remaining = Math.max(0, 10 - imagens.length);
    const selected = Array.from(event.target.files || []).slice(0, remaining);
    if (!selected.length) {
      showToast("Limite de 10 imagens atingido.");
      return;
    }
    showToast("Enviando imagens...");
    const urls = await uploadImagesForClient(client.id, selected);
    imagens.push(...urls);
    await update(ref(db, `clientes/${client.id}`), {
      imagens,
      imagem: $("coImage").value || imagens[0] || "",
      updatedAt: serverTimestamp(),
      updatedBy: state.user.uid
    });
    showToast("Imagens enviadas.");
    await loadAllData();
    renderClientOnlyEditor();
  });

  mount.querySelectorAll("[data-co-main]").forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.coMain);
      $("coImage").value = imagens[index] || "";
    });
  });

  mount.querySelectorAll("[data-co-remove]").forEach((button) => {
    button.addEventListener("click", async () => {
      const index = Number(button.dataset.coRemove);
      imagens.splice(index, 1);
      await update(ref(db, `clientes/${client.id}`), {
        imagens,
        imagem: imagens.includes($("coImage").value) ? $("coImage").value : (imagens[0] || ""),
        updatedAt: serverTimestamp(),
        updatedBy: state.user.uid
      });
      showToast("Imagem removida.");
      await loadAllData();
      renderClientOnlyEditor();
    });
  });

  $("clientOnlyForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = {
      nome: $("coName").value.trim(),
      nomeNormalizado: normalizeName($("coName").value.trim()),
      contato: $("coContact").value.trim(),
      whatsapp: $("coWhatsapp").value.trim(),
      endereco: $("coAddress").value.trim(),
      horario: $("coHours").value.trim(),
      instagram: $("coInstagram").value.trim(),
      imagem: $("coImage").value.trim(),
      imagens,
      cardapioLink: $("coMenuLink").value.trim(),
      infoAdicional: $("coInfo").value.trim(),
      updatedAt: serverTimestamp(),
      updatedBy: state.user.uid
    };
    await update(ref(db, `clientes/${client.id}`), payload);
    showToast("Dados salvos.");
    await loadAllData();
    renderClientOnlyEditor();
  });
}

function renderImagesMarkup(images, prefix) {
  if (!images.length) return `<div class="list-meta">Nenhuma imagem enviada ainda.</div>`;
  return images.map((url, index) => `
    <article class="image-tile">
      <img src="${escapeAttr(url)}" alt="Imagem ${index + 1}">
      <div>
        <button type="button" data-${prefix}-main="${index}">Destaque</button>
        <button type="button" data-${prefix}-remove="${index}" class="danger-mini">Remover</button>
      </div>
    </article>
  `).join("");
}

async function syncClientsFromScript() {
  const button = $("syncClientsButton");
  setBusy(button, true, "Importando...");
  try {
    const res = await fetch("../script.js", { cache: "no-store" });
    const code = await res.text();
    const match = code.match(/const\s+categories\s*=\s*(\[[\s\S]*?\]);/m);
    if (!match) throw new Error("Nao encontrei a lista categories no script.js.");

    const statusMatch = code.match(/const\s+statusEstabelecimentos\s*=\s*(\{[\s\S]*?\});?/m);
    const statusMap = statusMatch
      ? new Function(`return (${statusMatch[1].replace(/,(\s*[}\]])/g, "$1")});`)()
      : {};

    const safeCode = match[1].replace(/document\.querySelector\([^)]+\)/g, "null");
    const categories = new Function(`return (${safeCode});`)();
    const updates = {};

    categories.forEach((category) => {
      (category.establishments || []).forEach((est) => {
        const name = est.name || est.nome;
        if (!name) return;
        const id = slugify(name);
        const existing = state.clientes.find((client) => client.id === id) || {};
        const paidInScript = statusMap[normalizeName(name)] === "s";
        const importedImages = [
          ...(est.novidadesImages || []),
          ...(est.divulgacaoImages || []),
          ...(est.menuImages || [])
        ].slice(0, 10);
        updates[`clientes/${id}`] = {
          ...existing,
          nome: existing.nome || name,
          nomeNormalizado: existing.nomeNormalizado || normalizeName(name),
          categoria: existing.categoria || category.title || "",
          status: existing.status || "ativo",
          pagamentoStatus: existing.pagamentoStatus || (paidInScript ? "pago" : "em_aberto"),
          contato: existing.contato || est.contact || "",
          whatsapp: existing.whatsapp || est.whatsapp || "",
          endereco: existing.endereco || est.address || "",
          horario: existing.horario || est.hours || "",
          instagram: existing.instagram || est.instagram || "",
          facebook: existing.facebook || est.facebook || "",
          imagem: existing.imagem || est.image || "",
          imagens: Array.isArray(existing.imagens) && existing.imagens.length ? existing.imagens : importedImages,
          cardapioLink: existing.cardapioLink || est.cardapioLink || "",
          infoAdicional: existing.infoAdicional || est.infoAdicional || "",
          origem: existing.origem || "script.js",
          updatedAt: serverTimestamp(),
          updatedBy: state.user.uid
        };
      });
    });

    await update(ref(db), updates);
    showToast("Clientes importados do script.js.");
    await loadAllData();
  } catch (error) {
    console.error(error);
    showToast(error.message || "Falha ao importar clientes.");
  } finally {
    setBusy(button, false);
  }
}

async function createPanelUser(event) {
  event.preventDefault();
  if (!canManageClients()) return;

  const role = $("newUserRole").value;
  if (role === "master" && !isMaster()) {
    showToast("Somente master pode criar outro master.");
    return;
  }

  const email = $("newUserEmail").value.trim().toLowerCase();
  const password = $("newUserPassword").value.trim();
  const clienteId = $("newUserClient").value;
  const permissoes = {};
  document.querySelectorAll(".permissions-box input[type='checkbox']").forEach((input) => {
    permissoes[input.value] = input.checked;
  });

  const button = event.submitter;
  setBusy(button, true, "Criando...");
  try {
    const secondaryName = `creator-${Date.now()}`;
    const secondary = initializeApp(firebaseConfig, secondaryName);
    const secondaryAuth = getAuth(secondary);
    const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    await signOut(secondaryAuth);

    await saveUserProfile({
      uid: cred.user.uid,
      email,
      role,
      clienteId: role === "cliente" ? clienteId : "",
      status: "ativo",
      permissoes
    });

    event.target.reset();
    showToast("Usuario criado com sucesso.");
    await loadAllData();
  } catch (error) {
    console.error(error);
    showToast(error.message || "Nao foi possivel criar o usuario.");
  } finally {
    setBusy(button, false);
  }
}

function statusLabel(status) {
  return {
    ativo: "Ativo",
    pendente: "Pendente",
    inativo: "Inativo"
  }[status] || "Pendente";
}

function paymentLabel(status) {
  return {
    pago: "Pago",
    em_aberto: "Em aberto",
    isento: "Isento"
  }[status] || "Em aberto";
}

function eventStatusLabel(status) {
  return {
    ativo: "Ativo",
    rascunho: "Rascunho",
    encerrado: "Encerrado"
  }[status] || "Ativo";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, "&#096;");
}

function bindEvents() {
  $("loginForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    $("loginMessage").textContent = "";
    setBusy($("loginButton"), true, "Entrando...");
    try {
      await signInWithEmailAndPassword(auth, $("loginEmail").value.trim(), $("loginPassword").value.trim());
    } catch (error) {
      $("loginMessage").textContent = "Falha ao entrar. Confira e-mail e senha.";
    } finally {
      setBusy($("loginButton"), false);
    }
  });

  $("logoutButton").addEventListener("click", () => signOut(auth));
  $("refreshButton").addEventListener("click", loadAllData);
  $("newClientButton").addEventListener("click", resetClientForm);
  $("syncClientsButton").addEventListener("click", syncClientsFromScript);
  $("clientSearch").addEventListener("input", renderClientsList);
  $("clientImagesUpload").addEventListener("change", async (event) => {
    await uploadClientImages(event.target.files);
    event.target.value = "";
  });
  $("newEventButton").addEventListener("click", resetEventForm);
  $("eventSearch").addEventListener("input", renderEventsList);
  $("eventImageUpload").addEventListener("change", async (event) => {
    await uploadEventImage(event.target.files?.[0]);
    event.target.value = "";
  });
  $("financeSearch").addEventListener("input", renderFinanceiro);
  $("financeFilter").addEventListener("change", renderFinanceiro);
  $("userForm").addEventListener("submit", createPanelUser);

  document.querySelectorAll(".nav-admin button").forEach((button) => {
    button.addEventListener("click", () => switchView(button.dataset.view));
  });

  $("clientForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!canManageClients()) return;
    const payload = getClientFormData();
    const id = payload.id;
    delete payload.id;
    if (!state.selectedClientId) payload.createdAt = serverTimestamp();
    await update(ref(db, `clientes/${id}`), payload);
    showToast("Cliente salvo.");
    resetClientForm();
    await loadAllData();
  });

  $("deleteClientButton").addEventListener("click", async () => {
    if (!state.selectedClientId || !confirm("Excluir este cliente?")) return;
    await remove(ref(db, `clientes/${state.selectedClientId}`));
    showToast("Cliente excluido.");
    resetClientForm();
    await loadAllData();
  });

  $("eventForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!canManageClients()) return;
    const payload = getEventFormData();
    const id = payload.id;
    delete payload.id;
    if (!state.selectedEventId) payload.createdAt = serverTimestamp();
    await update(ref(db, `eventos/${id}`), payload);
    showToast("Evento salvo.");
    resetEventForm();
    await loadAllData();
  });

  $("deleteEventButton").addEventListener("click", async () => {
    if (!state.selectedEventId || !confirm("Excluir este evento?")) return;
    await remove(ref(db, `eventos/${state.selectedEventId}`));
    showToast("Evento excluido.");
    resetEventForm();
    await loadAllData();
  });
}

bindEvents();

onAuthStateChanged(auth, async (user) => {
  state.user = user;
  if (!user) {
    state.profile = null;
    $("loginView").classList.remove("hidden");
    $("appView").classList.add("hidden");
    return;
  }

  const profile = await loadProfile(user);
  if (!profile || profile.status === "inativo") {
    await signOut(auth);
    $("loginMessage").textContent = "Usuario sem perfil administrativo ativo.";
    return;
  }

  state.profile = profile;
  $("loginView").classList.add("hidden");
  $("appView").classList.remove("hidden");
  updateChrome();
  await loadAllData();
  switchView(canManageClients() ? "dashboard" : "minhaEmpresa");
});
