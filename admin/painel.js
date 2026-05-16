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

let state = {
  user: null,
  profile: null,
  clientes: [],
  usuarios: [],
  selectedClientId: null
};

const $ = (id) => document.getElementById(id);

const views = {
  dashboard: $("dashboardView"),
  clientes: $("clientesView"),
  usuarios: $("usuariosView"),
  minhaEmpresa: $("minhaEmpresaView")
};

const viewCopy = {
  dashboard: ["Visao geral", "Resumo do ambiente administrativo."],
  clientes: ["Clientes", "Cadastre e edite os dados comerciais."],
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
  const [clientesSnap, usersSnap] = await Promise.all([
    get(ref(db, "clientes")),
    get(ref(db, "usuariosByUid"))
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

  renderStats();
  renderClientsList();
  renderUsersList();
  fillUserClientSelect();
}

function renderStats() {
  $("statClientes").textContent = String(state.clientes.length);
  $("statUsuarios").textContent = String(state.usuarios.length);
  $("statAtivos").textContent = String(state.clientes.filter((c) => c.status === "ativo").length);
  $("statPendentes").textContent = String(state.clientes.filter((c) => c.status === "pendente").length);
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
  $("clientForm").reset();
  $("clientId").value = "";
  $("deleteClientButton").classList.add("hidden");
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
  $("clientMenuLink").value = client.cardapioLink || "";
  $("clientInfo").value = client.infoAdicional || "";
  $("clientAdminNote").value = client.observacaoAdmin || "";
  $("deleteClientButton").classList.remove("hidden");
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
    <article class="list-card">
      <div class="list-title">${escapeHtml(client.nome || client.id)}</div>
      <div class="list-meta">${escapeHtml(client.categoria || "Sem categoria")} - ${escapeHtml(client.contato || "Sem telefone")}</div>
      <div>
        <span class="badge ${escapeAttr(client.status || "pendente")}">${statusLabel(client.status)}</span>
        <span class="badge ${escapeAttr(client.pagamentoStatus || "em_aberto")}">${paymentLabel(client.pagamentoStatus)}</span>
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

function renderClientOnlyEditor() {
  const mount = $("clientOnlyMount");
  const client = state.clientes.find((item) => item.id === state.profile?.clienteId);
  if (!client) {
    mount.innerHTML = `<p>Nenhum cliente vinculado a este usuario. Fale com o administrador.</p>`;
    return;
  }

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
      <label class="wide">Informacoes adicionais<textarea id="coInfo" rows="4">${escapeHtml(client.infoAdicional || "")}</textarea></label>
      <div class="form-actions wide"><button type="submit">Salvar meus dados</button></div>
    </form>
  `;

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
