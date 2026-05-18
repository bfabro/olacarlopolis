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
const PANEL_VERSION = {
  numero: 23,
  label: "v23",
  data: "2026-05-18",
  nota: "Site publico resolve clientes duplicados pelo registro mais recente."
};
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
  categorias: [],
  selectedClientId: null,
  selectedEventId: null,
  clientImages: []
};

const $ = (id) => document.getElementById(id);
const WEEK_DAYS = [
  ["seg", "Segunda"],
  ["ter", "Terca"],
  ["qua", "Quarta"],
  ["qui", "Quinta"],
  ["sex", "Sexta"],
  ["sab", "Sabado"],
  ["dom", "Domingo"]
];

function renderPanelVersion() {
  const text = `Versao ${PANEL_VERSION.label}`;
  if ($("loginVersion")) $("loginVersion").textContent = text;
  if ($("sidebarVersion")) $("sidebarVersion").textContent = text;
  if ($("dashboardVersion")) $("dashboardVersion").textContent = `${text} - atualizacao ${PANEL_VERSION.numero}`;
  if ($("dashboardVersionDate")) {
    $("dashboardVersionDate").textContent = `${PANEL_VERSION.data}: ${PANEL_VERSION.nota}`;
  }
}

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

function normalizeImageItems(images) {
  return (Array.isArray(images) ? images : [])
    .map((item) => {
      if (typeof item === "string") return { url: item, texto: "" };
      return { url: item?.url || "", texto: item?.texto || "" };
    })
    .filter((item) => item.url)
    .slice(0, 10);
}

function cleanForFirebase(value) {
  if (Array.isArray(value)) {
    return value
      .map(cleanForFirebase)
      .filter((item) => item !== undefined);
  }

  if (value && typeof value === "object") {
    const cleaned = {};
    Object.entries(value).forEach(([key, val]) => {
      if (val === undefined || typeof val === "function") return;
      cleaned[key] = cleanForFirebase(val);
    });
    return cleaned;
  }

  return value === undefined ? null : value;
}

function getImportClientId(categoryName, clientName) {
  const categoryId = slugify(categoryName || "outros");
  const clientId = slugify(clientName || "cliente");
  return `${categoryId}-${clientId}`.slice(0, 120);
}

function findExistingClientForImport(categoryName, clientName) {
  const categoryId = slugify(categoryName || "outros");
  const clientNameNorm = normalizeName(clientName);
  return state.clientes.find((client) => {
    const sameCategory = slugify(client.categoria || client.categoriaId || "outros") === categoryId;
    const sameName = normalizeName(client.nome || client.name || "") === clientNameNorm;
    return sameCategory && sameName;
  }) || {};
}

function sortClientsInState() {
  state.clientes.sort((a, b) => String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR"));
}

function upsertClientInState(id, data) {
  const index = state.clientes.findIndex((client) => client.id === id);
  const item = { id, ...data };
  if (index >= 0) {
    state.clientes[index] = item;
  } else {
    state.clientes.push(item);
  }
}

function imageUrl(item) {
  return typeof item === "string" ? item : (item?.url || "");
}

function renderProfilePreview(imageFieldId, previewId) {
  const preview = $(previewId);
  const field = $(imageFieldId);
  if (!preview || !field) return;
  const url = displayImageUrl(field.value);
  preview.src = url || "";
  preview.classList.toggle("empty", !url);
}

function emptySchedule() {
  return WEEK_DAYS.reduce((acc, [key]) => {
    acc[key] = [];
    return acc;
  }, {});
}

function normalizeSchedule(schedule) {
  const base = emptySchedule();
  if (!schedule || typeof schedule !== "object") return base;
  WEEK_DAYS.forEach(([key]) => {
    base[key] = Array.isArray(schedule[key])
      ? schedule[key]
        .filter((slot) => slot && slot.inicio && slot.fim)
        .map((slot) => ({ inicio: slot.inicio, fim: slot.fim }))
        .slice(0, 2)
      : [];
  });
  return base;
}

function renderScheduleEditor(containerId, schedule = {}) {
  const box = $(containerId);
  if (!box) return;
  const data = normalizeSchedule(schedule);
  box.dataset.initialSchedule = scheduleHasAnyOpen(data) ? "true" : "false";
  box.innerHTML = WEEK_DAYS.map(([key, label]) => {
    const slots = data[key] || [];
    const open = slots.length > 0;
    return `
      <article class="schedule-day" data-day="${key}">
        <label class="schedule-open">
          <input type="checkbox" data-schedule-open ${open ? "checked" : ""}>
          ${label}
        </label>
        <div class="schedule-slots">
          <input type="time" data-slot="0" data-field="inicio" value="${escapeAttr(slots[0]?.inicio || "")}">
          <input type="time" data-slot="0" data-field="fim" value="${escapeAttr(slots[0]?.fim || "")}">
          <input type="time" data-slot="1" data-field="inicio" value="${escapeAttr(slots[1]?.inicio || "")}">
          <input type="time" data-slot="1" data-field="fim" value="${escapeAttr(slots[1]?.fim || "")}">
        </div>
      </article>
    `;
  }).join("");
}

function readScheduleEditor(containerId) {
  const box = $(containerId);
  const horarios = emptySchedule();
  if (!box) return horarios;

  box.querySelectorAll(".schedule-day").forEach((row) => {
    const day = row.dataset.day;
    const isOpen = row.querySelector("[data-schedule-open]")?.checked;
    if (!isOpen) {
      horarios[day] = [];
      return;
    }

    const slots = [];
    [0, 1].forEach((index) => {
      const inicio = row.querySelector(`[data-slot="${index}"][data-field="inicio"]`)?.value || "";
      const fim = row.querySelector(`[data-slot="${index}"][data-field="fim"]`)?.value || "";
      if (inicio && fim) slots.push({ inicio, fim });
    });
    horarios[day] = slots;
  });

  return horarios;
}

function scheduleToText(schedule) {
  const data = normalizeSchedule(schedule);
  return WEEK_DAYS.map(([key, label]) => {
    const slots = data[key] || [];
    if (!slots.length) return `${label}: Fechado`;
    return `${label}: ${slots.map((s) => `${s.inicio} as ${s.fim}`).join(" / ")}`;
  }).join("<br>");
}

function scheduleHasAnyOpen(schedule) {
  const data = normalizeSchedule(schedule);
  return WEEK_DAYS.some(([key]) => (data[key] || []).length > 0);
}

function displayImageUrl(url) {
  const raw = String(url || "").trim();
  if (!raw) return "";
  if (/^(https?:|data:|blob:|\/)/i.test(raw)) return raw;
  return `../${raw.replace(/^\.?\//, "")}`;
}

function imageFallbackAttr() {
  return `onerror="this.onerror=null;this.src='../images/img_padrao_site/logo_1.png';"`;
}

function sameOriginImageUrl(url) {
  const raw = String(url || "").trim();
  if (!raw) return "";
  if (/^(data:|blob:)/i.test(raw)) return "";
  if (/^https?:\/\//i.test(raw)) {
    const parsed = new URL(raw);
    return parsed.origin === window.location.origin ? parsed.toString() : "";
  }
  if (raw.startsWith("/")) return new URL(raw, window.location.origin).toString();
  return new URL(`../${raw.replace(/^\.?\//, "")}`, window.location.href).toString();
}

function showToast(message) {
  const toast = $("toast");
  toast.textContent = message;
  toast.classList.remove("hidden");
  setTimeout(() => toast.classList.add("hidden"), 3200);
}

function showImportReport(lines, type = "info") {
  const box = $("importReport");
  if (!box) return;
  box.className = `import-report ${type}`;
  box.innerHTML = (Array.isArray(lines) ? lines : [lines])
    .map((line) => `<div>${escapeHtml(line)}</div>`)
    .join("");
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
  const [clientesSnap, usersSnap, eventosSnap, categoriasSnap] = await Promise.all([
    get(ref(db, "clientes")),
    get(ref(db, "usuariosByUid")),
    get(ref(db, "eventos")),
    get(ref(db, "categorias"))
  ]);

  state.clientes = [];
  if (clientesSnap.exists()) {
    clientesSnap.forEach((child) => state.clientes.push({ id: child.key, ...child.val() }));
  }
  sortClientsInState();

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

  state.categorias = [];
  if (categoriasSnap.exists()) {
    categoriasSnap.forEach((child) => state.categorias.push({ id: child.key, ...child.val() }));
  }
  const fromClients = new Map();
  state.clientes.forEach((client) => {
    const title = String(client.categoria || "").trim();
    if (title) fromClients.set(slugify(title), { id: slugify(title), nome: title, origem: "clientes" });
  });
  state.categorias.forEach((cat) => fromClients.set(cat.id, cat));
  state.categorias = Array.from(fromClients.values())
    .sort((a, b) => String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR"));
  if (!state.categorias.some((cat) => slugify(cat.nome || cat.id) === "outros")) {
    state.categorias.push({ id: "outros", nome: "Outros", origem: "padrao" });
  }

  renderStats();
  renderClientsList();
  renderUsersList();
  fillClientCategorySelect();
  fillUserClientSelect();
  fillEventClientSelect();
  renderEventsList();
  renderFinanceiro();

  await autoEnsureImportedClients();
}

async function getScriptImportSource() {
  const scriptUrl = new URL("../script.js", window.location.href);
  scriptUrl.searchParams.set("importVersion", String(Date.now()));
  const res = await fetch(scriptUrl.toString(), { cache: "reload" });
  if (!res.ok) throw new Error(`Falha ao buscar script.js: HTTP ${res.status}`);
  const code = await res.text();
  const match = code.match(/const\s+categories\s*=\s*(\[[\s\S]*?\]);/m);
  if (!match) throw new Error("Nao encontrei a lista categories no script.js.");

  const statusMatch = code.match(/const\s+statusEstabelecimentos\s*=\s*(\{[\s\S]*?\});?/m);
  const statusMap = statusMatch
    ? new Function(`return (${statusMatch[1].replace(/,(\s*[}\]])/g, "$1")});`)()
    : {};

  const safeCode = match[1].replace(/document\.querySelector\([^)]+\)/g, "null");
  const categories = new Function(`return (${safeCode});`)();
  const expectedClientIds = new Set();
  categories.forEach((category) => {
    const categoryName = category.title || "Outros";
    (category.establishments || []).forEach((est) => {
      const name = est.name || est.nome;
      if (name) expectedClientIds.add(getImportClientId(categoryName, name));
    });
  });
  const totalClients = expectedClientIds.size;

  return { categories, statusMap, totalClients };
}

let autoImportRunning = false;

async function autoEnsureImportedClients() {
  if (autoImportRunning || !canManageClients()) return;

  try {
    autoImportRunning = true;
    const source = await getScriptImportSource();
    const { totalClients } = source;
    if (!totalClients || state.clientes.length >= totalClients) return;

    showImportReport([
      `Firebase carregou ${state.clientes.length}/${totalClients} clientes.`,
      "Completando importacao automaticamente..."
    ], "info");
    await syncClientsFromScript({ silent: true, source });
  } catch (error) {
    console.warn("Nao foi possivel completar clientes automaticamente.", error);
  } finally {
    autoImportRunning = false;
  }
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
  fillClientCategorySelect();
  $("deleteClientButton").classList.add("hidden");
  renderProfilePreview("clientImage", "clientProfilePreview");
  renderScheduleEditor("clientScheduleEditor", emptySchedule());
  renderClientImagesPreview();
}

function getClientFormData() {
  const name = $("clientName").value.trim();
  const id = $("clientId").value || slugify(name);
  const newCategory = $("clientNewCategory").value.trim();
  const category = newCategory || $("clientCategory").value.trim() || "Outros";
  const horarios = readScheduleEditor("clientScheduleEditor");
  const shouldSaveSchedule = scheduleHasAnyOpen(horarios) || $("clientScheduleEditor")?.dataset.initialSchedule === "true";
  const horarioTexto = $("clientHours").value.trim() || (shouldSaveSchedule ? scheduleToText(horarios) : "");
  return {
    id,
    nome: name,
    nomeNormalizado: normalizeName(name),
    categoria: category,
    categoriaId: slugify(category),
    status: $("clientStatus").value,
    pagamentoStatus: $("clientPaymentStatus").value,
    contato: $("clientContact").value.trim(),
    whatsapp: $("clientWhatsapp").value.trim(),
    endereco: $("clientAddress").value.trim(),
    horario: horarioTexto,
    ...(shouldSaveSchedule ? { horarios } : {}),
    instagram: $("clientInstagram").value.trim(),
    facebook: $("clientFacebook").value.trim(),
    imagem: $("clientImage").value.trim(),
    imagens: normalizeImageItems(state.clientImages),
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
  fillClientCategorySelect(client.categoria || client.category || "");
  $("clientNewCategory").value = "";
  $("clientStatus").value = client.status || "ativo";
  $("clientPaymentStatus").value = client.pagamentoStatus || "em_aberto";
  $("clientContact").value = client.contato || client.contact || "";
  $("clientWhatsapp").value = client.whatsapp || "";
  $("clientAddress").value = client.endereco || client.address || "";
  $("clientHours").value = client.horario || client.hours || "";
  $("clientInstagram").value = client.instagram || "";
  $("clientFacebook").value = client.facebook || "";
  $("clientImage").value = client.imagem || client.image || "";
  renderProfilePreview("clientImage", "clientProfilePreview");
  state.clientImages = normalizeImageItems(client.imagens);
  renderScheduleEditor("clientScheduleEditor", client.horarios || {});
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

  box.innerHTML = state.clientImages.map((item, index) => `
    <article class="image-tile">
      <img src="${escapeAttr(displayImageUrl(imageUrl(item)))}" alt="Imagem ${index + 1}" ${imageFallbackAttr()}>
      <label class="image-caption-label">Texto desta imagem
        <textarea data-image-text="${index}" rows="3" placeholder="Ex.: Promoção, descrição ou legenda opcional">${escapeHtml(item.texto || "")}</textarea>
      </label>
      <div>
        <button type="button" data-main-image="${index}">Usar como foto de perfil</button>
        <button type="button" data-remove-image="${index}" class="danger-mini">Remover</button>
      </div>
    </article>
  `).join("");

  box.querySelectorAll("[data-main-image]").forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.mainImage);
      $("clientImage").value = imageUrl(state.clientImages[index]);
      renderProfilePreview("clientImage", "clientProfilePreview");
      showToast("Foto de perfil selecionada.");
    });
  });

  box.querySelectorAll("[data-image-text]").forEach((field) => {
    field.addEventListener("input", () => {
      const index = Number(field.dataset.imageText);
      if (state.clientImages[index]) state.clientImages[index].texto = field.value;
    });
  });

  box.querySelectorAll("[data-remove-image]").forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.removeImage);
      state.clientImages.splice(index, 1);
      if (!state.clientImages.some((item) => imageUrl(item) === $("clientImage").value)) {
        $("clientImage").value = imageUrl(state.clientImages[0]);
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
  state.clientImages.push(...urls.map((url) => ({ url, texto: "" })));

  if (!$("clientImage").value && state.clientImages[0]) $("clientImage").value = imageUrl(state.clientImages[0]);
  renderClientImagesPreview();
  showToast("Imagens enviadas.");
}

async function uploadProfileImageForClient(clientId, file) {
  const path = `clientes/${clientId}/perfil/${Date.now()}-${slugify(file.name || "foto")}`;
  const fileRef = storageRef(storage, path);
  await uploadBytes(fileRef, file);
  return getDownloadURL(fileRef);
}

async function uploadClientProfileImage(file) {
  if (!file) return;
  const currentId = $("clientId").value || slugify($("clientName").value.trim());
  if (!currentId) {
    showToast("Informe o nome do cliente antes de enviar a foto.");
    $("clientProfileUpload").value = "";
    return;
  }

  showToast("Enviando foto de perfil...");
  const url = await uploadProfileImageForClient(currentId, file);
  $("clientImage").value = url;
  renderProfilePreview("clientImage", "clientProfilePreview");

  if (state.selectedClientId) {
    await update(ref(db, `clientes/${currentId}`), {
      imagem: url,
      updatedAt: serverTimestamp(),
      updatedBy: state.user?.uid || ""
    });
    const index = state.clientes.findIndex((client) => client.id === currentId);
    if (index >= 0) state.clientes[index] = { ...state.clientes[index], imagem: url };
    renderClientsList();
  }

  showToast(state.selectedClientId ? "Foto de perfil salva." : "Foto enviada. Salve o cliente para concluir.");
}

function addClientImageFromUrl() {
  const url = $("clientImageUrl").value.trim();
  const texto = $("clientImageText").value.trim();

  if (!url) {
    showToast("Informe a URL da imagem.");
    return;
  }
  if (state.clientImages.length >= 10) {
    showToast("Limite de 10 imagens atingido.");
    return;
  }

  state.clientImages.push({ url, texto });
  if (!$("clientImage").value) $("clientImage").value = url;
  $("clientImageUrl").value = "";
  $("clientImageText").value = "";
  renderClientImagesPreview();
  showToast("Imagem com texto adicionada. Clique em salvar cliente para gravar.");
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

function isFirebaseStorageUrl(url) {
  return /firebasestorage\.googleapis\.com|storage\.googleapis\.com/i.test(String(url || ""));
}

async function uploadUrlToClientStorage(clientId, imageItem, index) {
  const url = imageUrl(imageItem);
  if (!url || isFirebaseStorageUrl(url)) return imageItem;

  const absoluteUrl = sameOriginImageUrl(url);
  if (!absoluteUrl) return imageItem;

  const response = await fetch(absoluteUrl, { cache: "reload" });
  if (!response.ok) throw new Error(`HTTP ${response.status} em ${url}`);

  const blob = await response.blob();
  const extFromType = (blob.type && blob.type.split("/")[1]) || "jpg";
  const fileName = `${Date.now()}-${index}.${extFromType.replace("jpeg", "jpg")}`;
  const fileRef = storageRef(storage, `clientes/${clientId}/imagens/${fileName}`);
  await uploadBytes(fileRef, blob);
  const storageUrl = await getDownloadURL(fileRef);

  return {
    url: storageUrl,
    texto: imageItem?.texto || ""
  };
}

async function migrateClientImagesToStorage() {
  const button = $("migrateImagesButton");
  setBusy(button, true, "Subindo...");
  const stats = { clientes: 0, imagens: 0, erros: [] };

  try {
    const clients = state.clientes.filter((client) => normalizeImageItems(client.imagens).length);
    showImportReport([
      `Migrando imagens de ${clients.length} clientes para o Firebase Storage.`,
      "Isso pode demorar alguns minutos."
    ]);

    for (const client of clients) {
      const imagens = normalizeImageItems(client.imagens);
      let changed = false;
      const migrated = [];

      for (let i = 0; i < imagens.length; i += 1) {
        const item = imagens[i];
        try {
          const next = await uploadUrlToClientStorage(client.id, item, i + 1);
          migrated.push(next);
          if (imageUrl(next) !== imageUrl(item)) {
            changed = true;
            stats.imagens += 1;
          }
        } catch (err) {
          migrated.push(item);
          stats.erros.push(`${client.nome || client.id} / imagem ${i + 1}: ${err.message}`);
        }
      }

      if (changed) {
        await update(ref(db, `clientes/${client.id}`), {
          imagens: migrated,
          imagem: migrated[0]?.url || client.imagem || "",
          updatedAt: serverTimestamp(),
          updatedBy: state.user?.uid || ""
        });
        client.imagens = migrated;
        client.imagem = migrated[0]?.url || client.imagem || "";
        stats.clientes += 1;
      }

      if ((stats.clientes + stats.erros.length) % 5 === 0) {
        showImportReport([
          `Clientes atualizados: ${stats.clientes}`,
          `Imagens enviadas: ${stats.imagens}`,
          `Erros: ${stats.erros.length}`
        ], stats.erros.length ? "error" : "info");
      }
    }

    showImportReport([
      "Migracao de imagens concluida.",
      `Clientes atualizados: ${stats.clientes}`,
      `Imagens enviadas ao Storage: ${stats.imagens}`,
      `Erros: ${stats.erros.length}`,
      ...stats.erros.slice(0, 5)
    ], stats.erros.length ? "error" : "ok");
    renderClientsList();
    showToast("Migracao de imagens concluida.");
  } catch (err) {
    showImportReport(["Falha na migracao de imagens.", err.message || String(err)], "error");
    showToast("Falha na migracao de imagens.");
  } finally {
    setBusy(button, false);
  }
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
      <img src="${escapeAttr(displayImageUrl(client.imagem || imageUrl(client.imagens && client.imagens[0])) || "../images/img_padrao_site/logo_1.png")}" alt="${escapeAttr(client.nome || "Cliente")}" ${imageFallbackAttr()}>
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
        <strong>${moneyBR(valorFinalPlano(client))}</strong>
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

function fillClientCategorySelect(selectedName = "") {
  const select = $("clientCategory");
  if (!select) return;
  const selectedSlug = slugify(selectedName);
  const options = state.categorias.map((cat) => {
    const value = cat.nome || cat.title || cat.id;
    const isSelected = slugify(value) === selectedSlug;
    return `<option value="${escapeAttr(value)}" ${isSelected ? "selected" : ""}>${escapeHtml(value)}</option>`;
  });
  select.innerHTML = `<option value="">Selecione uma categoria</option>` + options.join("");
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

function defaultPlanValue(tipoPlano) {
  const defaults = {
    mensal: 0,
    semestral: 0,
    anual: 0
  };
  return defaults[tipoPlano || "mensal"] || 0;
}

function valorFinalPlano(client) {
  const bruto = Number(client.valorPlano ?? client.valorMensal ?? defaultPlanValue(client.tipoPlano));
  const desconto = Number(client.descontoValor || 0);
  return Math.max(0, bruto - desconto);
}

function planLabel(tipoPlano) {
  return {
    mensal: "Mensal",
    semestral: "Semestral",
    anual: "Anual"
  }[tipoPlano] || "Mensal";
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
      ${evento.imagem ? `<img src="${escapeAttr(displayImageUrl(evento.imagem))}" alt="${escapeAttr(evento.titulo || "Evento")}" ${imageFallbackAttr()}>` : ""}
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
  const total = paid.reduce((sum, c) => sum + valorFinalPlano(c), 0);

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
        <div class="list-meta">Plano: ${planLabel(client.tipoPlano)} - Valor final: ${moneyBR(valorFinalPlano(client))}</div>
      </div>
      <label>Status
        <select data-finance-field="pagamentoStatus">
          <option value="em_aberto" ${client.pagamentoStatus === "em_aberto" || !client.pagamentoStatus ? "selected" : ""}>Em aberto</option>
          <option value="pago" ${client.pagamentoStatus === "pago" ? "selected" : ""}>Pago</option>
          <option value="isento" ${client.pagamentoStatus === "isento" ? "selected" : ""}>Isento</option>
        </select>
      </label>
      <label>Plano
        <select data-finance-field="tipoPlano">
          <option value="mensal" ${client.tipoPlano === "mensal" || !client.tipoPlano ? "selected" : ""}>Mensal</option>
          <option value="semestral" ${client.tipoPlano === "semestral" ? "selected" : ""}>Semestral</option>
          <option value="anual" ${client.tipoPlano === "anual" ? "selected" : ""}>Anual</option>
        </select>
      </label>
      <label>Valor<input data-finance-field="valorPlano" value="${escapeAttr(client.valorPlano ?? defaultPlanValue(client.tipoPlano))}" placeholder="R$" ${isMaster() ? "" : "readonly"}></label>
      <label>Desconto<input data-finance-field="descontoValor" value="${escapeAttr(client.descontoValor || "")}" placeholder="R$"></label>
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
        payload[field.dataset.financeField] = ["valorPlano", "descontoValor"].includes(field.dataset.financeField)
          ? numberFromMoney(field.value)
          : field.value.trim();
      });
      if (!isMaster()) delete payload.valorPlano;
      payload.updatedAt = serverTimestamp();
      payload.updatedBy = state.user?.uid || "";
      await update(ref(db, `clientes/${id}`), payload);
      const index = state.clientes.findIndex((client) => client.id === id);
      if (index >= 0) state.clientes[index] = { ...state.clientes[index], ...payload };
      renderStats();
      renderClientsList();
      fillUserClientSelect();
      fillEventClientSelect();
      showToast("Financeiro atualizado.");
      renderFinanceiro();
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

  const imagens = normalizeImageItems(client.imagens);

  mount.innerHTML = `
    <form id="clientOnlyForm" class="grid-form">
      <label>Nome<input id="coName" value="${escapeAttr(client.nome || "")}"></label>
      <label>Telefone<input id="coContact" value="${escapeAttr(client.contato || "")}"></label>
      <label>WhatsApp<input id="coWhatsapp" value="${escapeAttr(client.whatsapp || "")}"></label>
      <label>Endereco<input id="coAddress" value="${escapeAttr(client.endereco || "")}"></label>
      <label>Horario<input id="coHours" value="${escapeAttr(client.horario || "")}"></label>
      <section class="wide schedule-panel">
        <div class="section-head compact">
          <div>
            <h3>Dias e horarios de funcionamento</h3>
            <p>Marque os dias abertos. Dias desmarcados aparecem como fechado.</p>
          </div>
        </div>
        <div id="coScheduleEditor" class="schedule-editor"></div>
      </section>
      <label>Instagram<input id="coInstagram" value="${escapeAttr(client.instagram || "")}"></label>
      <section class="wide profile-upload-panel">
        <div class="section-head compact">
          <div>
            <h3>Foto de perfil</h3>
            <p>Envie a imagem principal da sua empresa. Ela fica salva no Firebase Storage.</p>
          </div>
        </div>
        <div class="profile-upload-row">
          <img id="coProfilePreview" src="${escapeAttr(displayImageUrl(client.imagem || ""))}" alt="Foto de perfil" class="${client.imagem ? "" : "empty"}" ${imageFallbackAttr()}>
          <label>Enviar foto de perfil<input id="coProfileUpload" type="file" accept="image/*"></label>
        </div>
        <input id="coImage" type="hidden" value="${escapeAttr(client.imagem || "")}">
      </section>
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
        <div class="manual-image-form">
          <label>URL da imagem
            <input id="coImageUrl" placeholder="https://... ou images/...">
          </label>
          <label>Texto desta imagem
            <textarea id="coImageText" rows="3" placeholder="Texto opcional que aparece junto da imagem no site"></textarea>
          </label>
          <button id="coAddImageUrlButton" type="button" class="ghost-button"><i class="fa-solid fa-plus"></i> Adicionar imagem com texto</button>
        </div>
        <div id="coImagesPreview" class="image-grid">
          ${renderImagesMarkup(imagens, "co")}
        </div>
      </section>
      <label class="wide">Informacoes adicionais<textarea id="coInfo" rows="4">${escapeHtml(client.infoAdicional || "")}</textarea></label>
      <div class="form-actions wide"><button type="submit">Salvar meus dados</button></div>
    </form>
  `;
  renderScheduleEditor("coScheduleEditor", client.horarios || {});

  mount.querySelector("#coProfileUpload").addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    showToast("Enviando foto de perfil...");
    const url = await uploadProfileImageForClient(client.id, file);
    $("coImage").value = url;
    renderProfilePreview("coImage", "coProfilePreview");
    await update(ref(db, `clientes/${client.id}`), {
      imagem: url,
      updatedAt: serverTimestamp(),
      updatedBy: state.user.uid
    });
    showToast("Foto de perfil salva.");
    await loadAllData();
    renderClientOnlyEditor();
  });

  mount.querySelector("#coImagesUpload").addEventListener("change", async (event) => {
    const remaining = Math.max(0, 10 - imagens.length);
    const selected = Array.from(event.target.files || []).slice(0, remaining);
    if (!selected.length) {
      showToast("Limite de 10 imagens atingido.");
      return;
    }
    showToast("Enviando imagens...");
    const urls = await uploadImagesForClient(client.id, selected);
    imagens.push(...urls.map((url) => ({ url, texto: "" })));
    await update(ref(db, `clientes/${client.id}`), {
      imagens,
      imagem: $("coImage").value || imageUrl(imagens[0]) || "",
      updatedAt: serverTimestamp(),
      updatedBy: state.user.uid
    });
    showToast("Imagens enviadas.");
    await loadAllData();
    renderClientOnlyEditor();
  });

  mount.querySelector("#coAddImageUrlButton").addEventListener("click", async () => {
    const url = mount.querySelector("#coImageUrl").value.trim();
    const texto = mount.querySelector("#coImageText").value.trim();
    if (!url) {
      showToast("Informe a URL da imagem.");
      return;
    }
    if (imagens.length >= 10) {
      showToast("Limite de 10 imagens atingido.");
      return;
    }
    imagens.push({ url, texto });
    await update(ref(db, `clientes/${client.id}`), {
      imagens,
      imagem: $("coImage").value || url,
      updatedAt: serverTimestamp(),
      updatedBy: state.user.uid
    });
    showToast("Imagem com texto adicionada.");
    await loadAllData();
    renderClientOnlyEditor();
  });

  mount.querySelectorAll("[data-co-main]").forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.coMain);
      $("coImage").value = imageUrl(imagens[index]);
      renderProfilePreview("coImage", "coProfilePreview");
    });
  });

  mount.querySelectorAll("[data-co-text]").forEach((field) => {
    field.addEventListener("input", () => {
      const index = Number(field.dataset.coText);
      if (imagens[index]) imagens[index].texto = field.value;
    });
  });

  mount.querySelectorAll("[data-co-remove]").forEach((button) => {
    button.addEventListener("click", async () => {
      const index = Number(button.dataset.coRemove);
      imagens.splice(index, 1);
      await update(ref(db, `clientes/${client.id}`), {
        imagens,
        imagem: imagens.some((item) => imageUrl(item) === $("coImage").value) ? $("coImage").value : imageUrl(imagens[0]),
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
    const horarios = readScheduleEditor("coScheduleEditor");
    const shouldSaveSchedule = scheduleHasAnyOpen(horarios) || $("coScheduleEditor")?.dataset.initialSchedule === "true";
    const horarioTexto = $("coHours").value.trim() || (shouldSaveSchedule ? scheduleToText(horarios) : "");
    const payload = {
      nome: $("coName").value.trim(),
      nomeNormalizado: normalizeName($("coName").value.trim()),
      contato: $("coContact").value.trim(),
      whatsapp: $("coWhatsapp").value.trim(),
      endereco: $("coAddress").value.trim(),
      horario: horarioTexto,
      ...(shouldSaveSchedule ? { horarios } : {}),
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
  return images.map((item, index) => `
    <article class="image-tile">
      <img src="${escapeAttr(displayImageUrl(imageUrl(item)))}" alt="Imagem ${index + 1}" ${imageFallbackAttr()}>
      <label class="image-caption-label">Texto desta imagem
        <textarea data-${prefix}-text="${index}" rows="3" placeholder="Ex.: Promoção, descrição ou legenda opcional">${escapeHtml(item.texto || "")}</textarea>
      </label>
      <div>
        <button type="button" data-${prefix}-main="${index}">Usar como foto de perfil</button>
        <button type="button" data-${prefix}-remove="${index}" class="danger-mini">Remover</button>
      </div>
    </article>
  `).join("");
}

async function syncClientsFromScript(options = {}) {
  const { silent = false, source = null } = options;
  const button = $("syncClientsButton");
  if (!silent) setBusy(button, true, "Importando...");
  try {
    const { categories, statusMap } = source || await getScriptImportSource();
    const categoryPayloads = [];
    const clientPayloads = [];
    const importStats = {
      categorias: 0,
      clientes: 0,
      clientesSalvos: 0,
      clientesExistentes: 0,
      categoriasSalvas: 0,
      erros: []
    };

    categories.forEach((category) => {
      const categoryName = category.title || "Outros";
      const categoryId = slugify(categoryName);
      importStats.categorias += 1;
      categoryPayloads.push({
        id: categoryId,
        data: cleanForFirebase({
        nome: categoryName,
        origem: "script.js",
        updatedAt: serverTimestamp(),
        updatedBy: state.user.uid
        })
      });

      (category.establishments || []).forEach((est) => {
        const name = est.name || est.nome;
        if (!name) return;
        importStats.clientes += 1;
        const id = getImportClientId(categoryName, name);
        const existing = findExistingClientForImport(categoryName, name);
        if (existing.id) {
          importStats.clientesExistentes += 1;
          return;
        }
        const paidInScript = statusMap[normalizeName(name)] === "s";
        const importedImages = [
          ...(est.novidadesImages || []),
          ...(est.divulgacaoImages || []),
          ...(est.menuImages || [])
        ].slice(0, 10).map((url, index) => ({
          url,
          texto: (est.novidadesDescriptions || [])[index] || ""
        }));
        clientPayloads.push({
          id,
          data: cleanForFirebase({
          nome: name,
          nomeNormalizado: normalizeName(name),
          categoria: categoryName,
          categoriaId: categoryId,
          status: "ativo",
          pagamentoStatus: paidInScript ? "pago" : "em_aberto",
          contato: est.contact || "",
          whatsapp: est.whatsapp || "",
          endereco: est.address || "",
          horario: est.hours || "",
          instagram: est.instagram || "",
          facebook: est.facebook || "",
          imagem: est.image || "",
          imagens: importedImages,
          cardapioLink: est.cardapioLink || "",
          infoAdicional: est.infoAdicional || "",
          origem: "script.js",
          updatedAt: serverTimestamp(),
          updatedBy: state.user.uid
          })
        });
      });
    });

    showImportReport([
      `Encontrados: ${importStats.clientes} clientes e ${importStats.categorias} categorias.`,
      "Gravando clientes no Firebase..."
    ]);

    const chunkSize = 25;
    for (let i = 0; i < clientPayloads.length; i += chunkSize) {
      const chunk = clientPayloads.slice(i, i + chunkSize);
      const updates = {};
      chunk.forEach((item) => {
        updates[`clientes/${item.id}`] = item.data;
      });
      try {
        await update(ref(db), updates);
        chunk.forEach((item) => upsertClientInState(item.id, item.data));
        importStats.clientesSalvos += chunk.length;
      } catch (err) {
        chunk.forEach((item) => {
          importStats.erros.push(`Cliente ${item.data.nome || item.id}: ${err.code || err.message}`);
        });
      }
      if ((i + chunk.length) % 25 === 0 || i + chunk.length === clientPayloads.length) {
        showImportReport([
          `Clientes salvos: ${importStats.clientesSalvos}/${importStats.clientes}`,
          `Ja existiam no Firebase: ${importStats.clientesExistentes}`,
          `Erros: ${importStats.erros.length}`
        ], importStats.erros.length ? "error" : "info");
      }
    }

    for (let i = 0; i < categoryPayloads.length; i += chunkSize) {
      const chunk = categoryPayloads.slice(i, i + chunkSize);
      const updates = {};
      chunk.forEach((item) => {
        updates[`categorias/${item.id}`] = item.data;
      });
      try {
        await update(ref(db), updates);
        importStats.categoriasSalvas += chunk.length;
      } catch (err) {
        chunk.forEach((item) => {
          importStats.erros.push(`Categoria ${item.data.nome || item.id}: ${err.code || err.message}`);
        });
      }
    }

    try {
      await set(ref(db, "importacoes/ultimaImportacaoClientes"), {
        ...importStats,
        origem: "script.js",
        updatedAt: serverTimestamp(),
        updatedBy: state.user.uid
      });
    } catch (err) {
      importStats.erros.push(`Resumo da importacao: ${err.code || err.message}`);
    }

    const report = [
      `Importacao concluida.`,
      `Clientes salvos: ${importStats.clientesSalvos}/${importStats.clientes}`,
      `Clientes ja existentes mantidos: ${importStats.clientesExistentes}`,
      `Categorias salvas: ${importStats.categoriasSalvas}/${importStats.categorias}`,
      `Clientes na tela: ${state.clientes.length}`
    ];
    if (importStats.erros.length) {
      report.push(`Erros: ${importStats.erros.length}`);
      report.push(...importStats.erros.slice(0, 5));
    }
    showImportReport(report, importStats.erros.length ? "error" : "ok");
    showToast(`Importacao concluida: ${importStats.clientesSalvos} clientes salvos.`);
    sortClientsInState();
    renderStats();
    renderClientsList();
    renderFinanceiro();
    fillClientCategorySelect();
    fillUserClientSelect();
    fillEventClientSelect();
  } catch (error) {
    console.error(error);
    showImportReport([
      "Falha geral na importacao.",
      error.code || error.message || String(error)
    ], "error");
    showToast(error.message || "Falha ao importar clientes. Abra o console para detalhes.");
  } finally {
    if (!silent) setBusy(button, false);
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
  $("migrateImagesButton").addEventListener("click", migrateClientImagesToStorage);
  $("clientSearch").addEventListener("input", renderClientsList);
  $("clientImagesUpload").addEventListener("change", async (event) => {
    await uploadClientImages(event.target.files);
    event.target.value = "";
  });
  $("clientProfileUpload").addEventListener("change", async (event) => {
    await uploadClientProfileImage(event.target.files?.[0]);
    event.target.value = "";
  });
  $("addClientImageUrlButton").addEventListener("click", addClientImageFromUrl);
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
    const updates = { [`clientes/${id}`]: payload };
    if (payload.categoria) {
      updates[`categorias/${payload.categoriaId || slugify(payload.categoria)}`] = {
        nome: payload.categoria,
        origem: "painel",
        updatedAt: serverTimestamp(),
        updatedBy: state.user?.uid || ""
      };
    }
    await update(ref(db), updates);
    upsertClientInState(id, payload);
    if (payload.categoria) {
      const categoryId = payload.categoriaId || slugify(payload.categoria);
      const existingCategory = state.categorias.find((cat) => cat.id === categoryId);
      if (existingCategory) {
        existingCategory.nome = payload.categoria;
        existingCategory.origem = "painel";
      } else {
        state.categorias.push({ id: categoryId, nome: payload.categoria, origem: "painel" });
      }
      state.categorias.sort((a, b) => String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR"));
    }
    sortClientsInState();
    renderStats();
    renderClientsList();
    renderFinanceiro();
    fillClientCategorySelect();
    fillUserClientSelect();
    fillEventClientSelect();
    showToast("Cliente salvo.");
    resetClientForm();
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

renderPanelVersion();
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
