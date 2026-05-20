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
  uploadBytesResumable,
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
  numero: 74,
  label: "v74",
  data: "2026-05-20",
  nota: "Adiciona filtros por periodo nos relatorios."
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
  notasFalecimento: [],
  categorias: [],
  pagamentoSistema: {},
  metricas: {},
  reportPeriod: {
    type: "mensal",
    start: "",
    end: ""
  },
  selectedClientId: null,
  selectedEventId: null,
  selectedDeathNoticeId: null,
  selectedCategoryId: null,
  duplicateCleanupPlan: null,
  clientImages: [],
  clientMenuImages: [],
  lastFirebaseClientCount: 0,
  lastVisibleClientCount: 0
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
  categorias: $("categoriasView"),
  eventos: $("eventosView"),
  informacoes: $("informacoesView"),
  financeiro: $("financeiroView"),
  relatorios: $("relatoriosView"),
  pagamentoSistema: $("pagamentoSistemaView"),
  usuarios: $("usuariosView"),
  minhaEmpresa: $("minhaEmpresaView"),
  faturas: $("faturasView")
};

const viewCopy = {
  dashboard: ["Visao geral", "Resumo do ambiente administrativo."],
  clientes: ["Clientes", "Cadastre e edite os dados comerciais."],
  categorias: ["Categorias", "Organize categorias, subcategorias e icones do menu."],
  eventos: ["Eventos", "Configure eventos e divulgacoes."],
  informacoes: ["Informacoes", "Gerencie os conteudos do menu Informacoes."],
  financeiro: ["Financeiro", "Visao consolidada dos clientes e faturas."],
  relatorios: ["Relatorios", "Indicadores e pontos de atencao do painel."],
  pagamentoSistema: ["Pagamento", "Configure a chave Pix usada nas faturas."],
  usuarios: ["Usuarios", "Crie acessos e vincule clientes."],
  minhaEmpresa: ["Minha empresa", "Edite os dados liberados para seu cadastro."],
  faturas: ["Faturas", "Pix mensal, QR Code e comprovantes."]
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

function addAliasKey(target, value) {
  const slug = slugify(value);
  const normalized = normalizeName(value);
  if (slug) target[slug] = true;
  if (normalized) target[normalized] = true;
}

function buildClientPublicAliases(clientId, payload, sourceClient = null, useFormContext = true) {
  const form = useFormContext ? $("clientForm") : null;
  const aliases = { ...(sourceClient?.aliases || {}) };
  const add = (value) => addAliasKey(aliases, value);
  const names = [
    clientId,
    payload?.nome,
    payload?.nomeNormalizado,
    sourceClient?.id,
    sourceClient?.nome,
    sourceClient?.name,
    sourceClient?.nomeNormalizado,
    form?.dataset.originalClientId,
    form?.dataset.originalName
  ].filter(Boolean);
  const categories = [
    payload?.categoria,
    payload?.categoriaId,
    sourceClient?.categoria,
    sourceClient?.categoriaId,
    sourceClient?.category,
    form?.dataset.originalCategory
  ].filter(Boolean);

  names.forEach(add);
  categories.forEach((category) => {
    names.forEach((name) => add(`${category}-${name}`));
  });

  return aliases;
}

function clientCanonicalId(client) {
  return getCanonicalClientId(client?.categoria || client?.categoriaId || "outros", client?.nome || client?.name || client?.id || "cliente");
}

function currentRole() {
  return String(state.profile?.role || "").trim().toLowerCase();
}

function canManageClients() {
  return ["master", "admin"].includes(currentRole());
}

function isMaster() {
  return currentRole() === "master";
}

function hasPermission(permission) {
  if (canManageClients()) return true;
  return Boolean(state.profile?.permissoes?.[permission]);
}

function canManageInformacoes() {
  return hasPermission("informacoes") || hasPermission("informacoes_nota_falecimento");
}

function canAccessView(viewName) {
  if (canManageClients()) {
    if (viewName === "pagamentoSistema") return isMaster();
    return true;
  }
  if (viewName === "faturas") return hasPermission("faturas");
  if (viewName === "informacoes") return canManageInformacoes();
  if (viewName === "minhaEmpresa") return true;
  return false;
}

function moneyBR(value) {
  return Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function textPix(value, maxLength = 25) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9 $%*+\-./:]/g, "")
    .trim()
    .slice(0, maxLength);
}

function numberFromMoney(value) {
  const cleaned = String(value || "").replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function pixField(id, value) {
  const text = String(value || "");
  return `${id}${String(text.length).padStart(2, "0")}${text}`;
}

function pixCrc16(payload) {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i += 1) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function gerarPixCopiaCola({ chave, nome, cidade, valor, txid }) {
  const pixKey = String(chave || "").trim();
  if (!pixKey) return "";
  const merchantName = textPix(nome || "OLA CARLOPOLIS", 25) || "OLA CARLOPOLIS";
  const merchantCity = textPix(cidade || "CARLOPOLIS", 15) || "CARLOPOLIS";
  const amount = Number(valor || 0).toFixed(2);
  const merchantAccount = pixField("00", "br.gov.bcb.pix") + pixField("01", pixKey);
  const additionalData = pixField("05", textPix(txid || "FATURA", 25) || "FATURA");
  const payloadSemCrc = [
    pixField("00", "01"),
    pixField("26", merchantAccount),
    pixField("52", "0000"),
    pixField("53", "986"),
    valor > 0 ? pixField("54", amount) : "",
    pixField("58", "BR"),
    pixField("59", merchantName),
    pixField("60", merchantCity),
    pixField("62", additionalData),
    "6304"
  ].join("");
  return `${payloadSemCrc}${pixCrc16(payloadSemCrc)}`;
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

function normalizeUrlList(items) {
  return (Array.isArray(items) ? items : [])
    .map((item) => typeof item === "string" ? item : (item?.url || ""))
    .map((url) => String(url || "").trim())
    .filter(Boolean)
    .slice(0, 30);
}

function normalizePromocoes(items) {
  return (Array.isArray(items) ? items : [])
    .map((item, index) => ({
      id: item?.id || `promo-${Date.now()}-${index}`,
      titulo: String(item?.titulo || item?.nome || "").trim(),
      volume: String(item?.volume || "").trim(),
      embalagem: String(item?.embalagem || "").trim(),
      preco: String(item?.preco || "").trim(),
      precoAntigo: String(item?.precoAntigo || "").trim(),
      unidade: String(item?.unidade || "").trim(),
      imagem: String(item?.imagem || item?.image || "").trim(),
      validadeInicio: String(item?.validadeInicio || "").trim(),
      validadeFim: String(item?.validadeFim || item?.validade || "").trim(),
      obs: String(item?.obs || item?.descricao || "").trim(),
      ativo: item?.ativo === false ? false : true
    }))
    .filter((item) => item.titulo)
    .slice(0, 30);
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
  return getCanonicalClientId(categoryName, clientName);
}

function getCanonicalClientId(categoryName, clientName) {
  const categoryId = slugify(categoryName || "outros");
  const clientId = slugify(clientName || "cliente");
  if (!categoryId) return clientId.slice(0, 120);
  if (!clientId) return categoryId.slice(0, 120);
  if (clientId === categoryId || clientId.startsWith(`${categoryId}-`)) return clientId.slice(0, 120);
  return `${categoryId}-${clientId}`.slice(0, 120);
}

function getLegacyRepeatedClientId(categoryName, clientName) {
  const categoryId = slugify(categoryName || "outros");
  const clientId = slugify(clientName || "cliente");
  if (!categoryId || !clientId) return "";
  return `${categoryId}-${clientId}`.slice(0, 120);
}

function findExistingClientForImport(categoryName, clientName) {
  const expectedId = getImportClientId(categoryName, clientName);
  const legacyId = getLegacyRepeatedClientId(categoryName, clientName);
  const categoryId = slugify(categoryName || "outros");
  const clientNameNorm = normalizeName(clientName);
  return state.clientes.find((client) => {
    if (client.id === expectedId) return true;
    if (legacyId && client.id === legacyId) return true;
    const sameCategory = slugify(client.categoria || client.categoriaId || "outros") === categoryId;
    const sameName = normalizeName(client.nome || client.name || "") === clientNameNorm;
    return sameCategory && sameName;
  }) || {};
}

function sortClientsInState() {
  state.clientes.sort((a, b) => {
    const updated = clientUpdatedValue(b) - clientUpdatedValue(a);
    if (updated) return updated;
    return String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR");
  });
}

function clientUpdatedValue(client) {
  const value = client?.updatedAt;
  if (typeof value === "number") return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function clientSourceRank(client) {
  if (client?.editadoNoPainel || client?.origem === "painel") return 2;
  if (client?.origem === "script.js") return 0;
  return 1;
}

function clientStrongKeys(client) {
  const keys = new Set();
  const add = (value) => {
    const slug = slugify(value);
    const normalized = normalizeName(value);
    if (slug) keys.add(slug);
    if (normalized) keys.add(normalized);
  };
  add(client?.id);
  add(clientCanonicalId(client));
  add(getLegacyRepeatedClientId(client?.categoria || client?.categoriaId || "outros", client?.nome || client?.name || client?.id || "cliente"));
  if (client?.categoria || client?.categoriaId || client?.nome || client?.name) {
    add(`${client.categoria || client.categoriaId || "outros"}-${client.nome || client.name || client.id}`);
  }
  return Array.from(keys);
}

function chooseNewestClient(current, candidate) {
  if (!current) return candidate;
  const sourceDiff = clientSourceRank(candidate) - clientSourceRank(current);
  if (sourceDiff) return sourceDiff > 0 ? candidate : current;
  const updatedDiff = clientUpdatedValue(candidate) - clientUpdatedValue(current);
  if (updatedDiff) return updatedDiff > 0 ? candidate : current;
  const completenessDiff = clientCompletenessScore(candidate) - clientCompletenessScore(current);
  return completenessDiff > 0 ? candidate : current;
}

function consolidateClientsForAdmin(clients) {
  return Array.isArray(clients) ? clients : [];
}

function snapshotToClientList(snapshot) {
  const clients = [];
  if (snapshot?.exists()) {
    snapshot.forEach((child) => {
      clients.push({ id: child.key, ...child.val() });
      return false;
    });
  }
  return clients;
}

function applyClientsSnapshot(snapshot) {
  const allClients = consolidateClientsForAdmin(snapshotToClientList(snapshot));
  state.lastFirebaseClientCount = allClients.length;

  if (!canManageClients() && state.profile?.clienteId) {
    state.clientes = allClients.filter((client) => client.id === state.profile.clienteId);
  } else {
    state.clientes = allClients;
  }

  state.lastVisibleClientCount = state.clientes.length;
  sortClientsInState();
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

function normalizeCategory(cat) {
  const name = cat.nome || cat.title || cat.id || "Sem nome";
  const id = cat.id || slugify(name);
  return {
    status: "ativo",
    origem: "painel",
    ...cat,
    id,
    nome: name,
    parentId: cat.parentId || "",
    icon: cat.icon || "fa-solid fa-store",
    iconColor: cat.iconColor || "#2563eb",
    ordem: Number(cat.ordem || 0)
  };
}

function sortCategoriesInState() {
  state.categorias = state.categorias
    .map(normalizeCategory)
    .sort((a, b) => {
      const order = Number(a.ordem || 0) - Number(b.ordem || 0);
      if (order) return order;
      return String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR");
    });
}

function mergeCategoryIntoMap(map, category) {
  const normalized = normalizeCategory(category);
  const existing = map.get(normalized.id);
  if (existing) {
    map.set(normalized.id, normalizeCategory({
      ...normalized,
      ...existing,
      origem: existing.origem || normalized.origem
    }));
  } else {
    map.set(normalized.id, normalized);
  }
}

async function loadScriptCategoriesForPanel() {
  try {
    const source = await getScriptImportSource();
    return (source.categories || []).map((category, index) => normalizeCategory({
      id: slugify(category.title || `categoria-${index + 1}`),
      nome: category.title || `Categoria ${index + 1}`,
      origem: "script.js",
      ordem: index + 1
    }));
  } catch (error) {
    console.warn("Nao foi possivel carregar categorias base do script.js.", error);
    return [];
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
  box.dataset.touchedSchedule = "false";
  box.querySelectorAll('input[type="time"]').forEach((input) => {
    input.addEventListener("input", () => {
      box.dataset.touchedSchedule = "true";
      const row = input.closest(".schedule-day");
      if (input.value) {
        const open = row?.querySelector("[data-schedule-open]");
        if (open) open.checked = true;
      }
    });
  });
  box.querySelectorAll("[data-schedule-open]").forEach((input) => {
    input.addEventListener("change", () => {
      box.dataset.touchedSchedule = "true";
    });
  });
}

function readScheduleEditor(containerId) {
  const box = $(containerId);
  const horarios = emptySchedule();
  if (!box) return horarios;

  box.querySelectorAll(".schedule-day").forEach((row) => {
    const day = row.dataset.day;
    const isOpen = row.querySelector("[data-schedule-open]")?.checked;
    const slots = [];
    [0, 1].forEach((index) => {
      const inicio = row.querySelector(`[data-slot="${index}"][data-field="inicio"]`)?.value || "";
      const fim = row.querySelector(`[data-slot="${index}"][data-field="fim"]`)?.value || "";
      if (inicio && fim) slots.push({ inicio, fim });
    });
    horarios[day] = isOpen || slots.length ? slots : [];
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

function lazyImageAttrs() {
  return `loading="lazy" decoding="async"`;
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

function ensureUploadProgressBox() {
  let box = $("uploadProgressBox");
  if (box) return box;
  box = document.createElement("div");
  box.id = "uploadProgressBox";
  box.className = "upload-progress-box hidden";
  box.innerHTML = `
    <div class="upload-progress-head">
      <strong id="uploadProgressTitle">Enviando arquivo</strong>
      <span id="uploadProgressPercent">0%</span>
    </div>
    <div class="upload-progress-bar"><span id="uploadProgressFill"></span></div>
    <div id="uploadProgressDetail" class="upload-progress-detail">Preparando envio...</div>
  `;
  document.body.appendChild(box);
  return box;
}

function setUploadProgress(percent, title = "Enviando arquivo", detail = "") {
  const box = ensureUploadProgressBox();
  const safePercent = Math.max(0, Math.min(100, Math.round(percent || 0)));
  box.classList.remove("hidden");
  $("uploadProgressTitle").textContent = title;
  $("uploadProgressPercent").textContent = `${safePercent}%`;
  $("uploadProgressFill").style.width = `${safePercent}%`;
  $("uploadProgressDetail").textContent = detail || "Aguarde enquanto o arquivo e salvo.";
}

function hideUploadProgress(delay = 800) {
  setTimeout(() => {
    const box = $("uploadProgressBox");
    if (box) box.classList.add("hidden");
  }, delay);
}

function uploadFileWithProgress(fileRef, file, title = "Enviando arquivo", detail = "") {
  return new Promise((resolve, reject) => {
    setUploadProgress(0, title, detail || file?.name || "");
    const task = uploadBytesResumable(fileRef, file);
    task.on("state_changed", (snapshot) => {
      const percent = snapshot.totalBytes
        ? (snapshot.bytesTransferred / snapshot.totalBytes) * 100
        : 0;
      setUploadProgress(percent, title, detail || file?.name || "");
    }, (error) => {
      hideUploadProgress(0);
      reject(error);
    }, async () => {
      setUploadProgress(100, title, "Envio concluido. Finalizando...");
      try {
        resolve(await getDownloadURL(task.snapshot.ref));
      } catch (error) {
        reject(error);
      } finally {
        hideUploadProgress();
      }
    });
  });
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
      permissoes: { dados: true, imagens: true, cardapio: true, promocoes: true, faturas: true, financeiro: true, imoveis: true, veiculos: true, informacoes: true, informacoes_nota_falecimento: true }
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
  const [
    clientesSnap,
    usersSnap,
    eventosSnap,
    categoriasSnap,
    notasFalecimentoSnap,
    pagamentoSnap,
    cliquesBotoesSnap,
    cliquesMenuSnap,
    acessosSnap,
    ondeComerCardapiosSnap,
    ondeComerWhatsSnap,
    ondeComerFotosSnap,
    promocoesSnap
  ] = await Promise.all([
    get(ref(db, "clientes")),
    get(ref(db, "usuariosByUid")),
    get(ref(db, "eventos")),
    get(ref(db, "categorias")),
    get(ref(db, "conteudosInformativos/notaFalecimento")),
    get(ref(db, "configuracoes/pagamento")),
    get(ref(db, "cliquesPorBotao")),
    get(ref(db, "cliquesMenuLateral")),
    get(ref(db, "acessosPorDia")),
    get(ref(db, "cliquesCardapiosOndeComer")),
    get(ref(db, "cliquesWhatsOndeComer")),
    get(ref(db, "cliquesFotosOndeComer")),
    get(ref(db, "cliquesPromocoesPorComercio"))
  ]);

  applyClientsSnapshot(clientesSnap);

  state.usuarios = [];
  if (usersSnap.exists()) {
    usersSnap.forEach((child) => {
      state.usuarios.push({ uid: child.key, ...child.val() });
      return false;
    });
  }
  state.usuarios.sort((a, b) => String(a.email || "").localeCompare(String(b.email || "")));
  state.pagamentoSistema = pagamentoSnap.exists() ? pagamentoSnap.val() : {};
  state.metricas = {
    cliquesBotoes: cliquesBotoesSnap.exists() ? cliquesBotoesSnap.val() : {},
    cliquesMenu: cliquesMenuSnap.exists() ? cliquesMenuSnap.val() : {},
    acessos: acessosSnap.exists() ? acessosSnap.val() : {},
    ondeComerCardapios: ondeComerCardapiosSnap.exists() ? ondeComerCardapiosSnap.val() : {},
    ondeComerWhats: ondeComerWhatsSnap.exists() ? ondeComerWhatsSnap.val() : {},
    ondeComerFotos: ondeComerFotosSnap.exists() ? ondeComerFotosSnap.val() : {},
    promocoes: promocoesSnap.exists() ? promocoesSnap.val() : {}
  };

  state.eventos = [];
  if (eventosSnap.exists()) {
    eventosSnap.forEach((child) => {
      state.eventos.push({ id: child.key, ...child.val() });
      return false;
    });
  }
  state.eventos.sort((a, b) => String(b.data || "").localeCompare(String(a.data || "")));

  state.categorias = [];
  if (categoriasSnap.exists()) {
    categoriasSnap.forEach((child) => {
      state.categorias.push({ id: child.key, ...child.val() });
      return false;
    });
  }

  state.notasFalecimento = [];
  if (notasFalecimentoSnap.exists()) {
    notasFalecimentoSnap.forEach((child) => {
      state.notasFalecimento.push({ id: child.key, ...child.val() });
      return false;
    });
  }
  state.notasFalecimento.sort((a, b) => String(b.data || "").localeCompare(String(a.data || "")));

  const fromClients = new Map();
  state.clientes.forEach((client) => {
    const title = String(client.categoria || "").trim();
    if (title) mergeCategoryIntoMap(fromClients, { id: slugify(title), nome: title, origem: "clientes" });
  });
  state.categorias.forEach((cat) => mergeCategoryIntoMap(fromClients, cat));
  state.categorias = Array.from(fromClients.values());
  sortCategoriesInState();
  if (!state.categorias.some((cat) => slugify(cat.nome || cat.id) === "outros")) {
    state.categorias.push(normalizeCategory({ id: "outros", nome: "Outros", origem: "padrao" }));
    sortCategoriesInState();
  }

  renderStats();
  renderClientsList();
  renderUsersList();
  renderCategoriesList();
  fillClientCategorySelect();
  fillCategoryParentSelect();
  fillUserClientSelect();
  fillEventClientSelect();
  renderEventsList();
  renderInfoDeathNoticeList();
  renderFinanceiro();
  renderReports();
  renderPaymentSettings();
  renderClientInvoices();

  // A importacao agora fica manual para nao sobrescrever edicoes feitas no Firebase.
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
  return;
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
  document.querySelectorAll("[data-master='true']").forEach((el) => {
    el.classList.toggle("hidden", !isMaster());
  });
  document.querySelectorAll("[data-permission='informacoes']").forEach((el) => {
    el.classList.toggle("hidden", !canManageInformacoes());
  });
  document.querySelectorAll("[data-permission='faturas']").forEach((el) => {
    el.classList.toggle("hidden", !hasPermission("faturas") || canManageClients());
  });

  const masterOption = $("newUserRole")?.querySelector("option[value='master']");
  if (masterOption) masterOption.disabled = !isMaster();
}

function roleLabel(role) {
  const key = String(role || "").trim().toLowerCase();
  return {
    master: "Usuario master",
    admin: "Admin geral",
    cliente: "Admin do cliente"
  }[key] || "Sem perfil";
}

function switchView(name) {
  const target = views[name] ? name : "dashboard";
  if (!canAccessView(target)) {
    switchView(canManageClients() ? "dashboard" : "minhaEmpresa");
    return;
  }
  Object.entries(views).forEach(([key, el]) => el.classList.toggle("hidden", key !== target));
  document.querySelectorAll(".nav-admin button").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.view === target);
  });
  const [title, subtitle] = viewCopy[target];
  $("viewTitle").textContent = title;
  $("viewSubtitle").textContent = subtitle;

  if (target === "minhaEmpresa") renderClientOnlyEditor();
  if (target === "faturas") renderClientInvoices();
  if (target === "pagamentoSistema") renderPaymentSettings();
  if (target === "relatorios") renderReports();
  if (target === "informacoes" && !canManageInformacoes()) {
    switchView(canManageClients() ? "dashboard" : "minhaEmpresa");
    return;
  }
  if (target !== "clientes") setClientFocusMode(false);
}

function setClientFocusMode(enabled) {
  const view = $("clientesView");
  const closeButton = $("closeClientFormButton");
  if (!view) return;
  view.classList.toggle("client-focus-mode", Boolean(enabled));
  closeButton?.classList.toggle("hidden", !enabled);
}

function closeClientFormToDashboard() {
  resetClientForm();
  switchView("dashboard");
}

function resetClientForm() {
  state.selectedClientId = null;
  state.clientImages = [];
  state.clientMenuImages = [];
  $("clientForm").reset();
  delete $("clientForm").dataset.originalCategory;
  delete $("clientForm").dataset.originalClientId;
  delete $("clientForm").dataset.originalName;
  $("clientId").value = "";
  fillClientCategorySelect();
  $("deleteClientButton").classList.add("hidden");
  renderProfilePreview("clientImage", "clientProfilePreview");
  renderScheduleEditor("clientScheduleEditor", emptySchedule());
  renderClientImagesPreview();
  renderClientMenuPreview();
  setClientFocusMode(false);
}

function getClientFormData() {
  const name = $("clientName").value.trim();
  const id = $("clientId").value || slugify(name);
  const newCategory = $("clientNewCategory").value.trim();
  const currentClient = state.clientes.find((client) => client.id === state.selectedClientId);
  const category = newCategory || $("clientCategory").value.trim() || currentClient?.categoria || currentClient?.category || $("clientForm").dataset.originalCategory || "Outros";
  const horarios = readScheduleEditor("clientScheduleEditor");
  const scheduleBox = $("clientScheduleEditor");
  const shouldSaveSchedule = scheduleHasAnyOpen(horarios) || scheduleBox?.dataset.initialSchedule === "true" || scheduleBox?.dataset.touchedSchedule === "true";
  const horarioTexto = shouldSaveSchedule ? scheduleToText(horarios) : $("clientHours").value.trim();
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
    ...(shouldSaveSchedule ? { horarios: normalizeSchedule(horarios) } : {}),
    instagram: $("clientInstagram").value.trim(),
    facebook: $("clientFacebook").value.trim(),
    tiktok: $("clientTiktok").value.trim(),
    site: $("clientSite").value.trim(),
    destaqueSemanal: $("clientFeaturedWeek").checked,
    destaqueValor: numberFromMoney($("clientFeaturedValue").value),
    imagem: $("clientImage").value.trim(),
    imagens: normalizeImageItems(state.clientImages),
    cardapioLink: $("clientMenuLink").value.trim(),
    menuImages: normalizeUrlList(state.clientMenuImages),
    infoAdicional: $("clientInfo").value.trim(),
    observacaoAdmin: $("clientAdminNote").value.trim(),
    origem: "painel",
    editadoNoPainel: true,
    updatedAt: serverTimestamp(),
    updatedBy: state.user?.uid || ""
  };
}

function fillClientForm(client) {
  state.selectedClientId = client.id;
  $("clientForm").dataset.originalCategory = client.categoria || client.category || "";
  $("clientForm").dataset.originalClientId = client.id || "";
  $("clientForm").dataset.originalName = client.nome || client.name || "";
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
  $("clientTiktok").value = client.tiktok || "";
  $("clientSite").value = client.site || "";
  $("clientFeaturedWeek").checked = Boolean(client.destaqueSemanal);
  $("clientFeaturedValue").value = client.destaqueValor ? moneyBR(client.destaqueValor) : "";
  $("clientImage").value = client.imagem || client.image || "";
  renderProfilePreview("clientImage", "clientProfilePreview");
  state.clientImages = normalizeImageItems(client.imagens);
  renderScheduleEditor("clientScheduleEditor", client.horarios || {});
  $("clientMenuLink").value = client.cardapioLink || "";
  state.clientMenuImages = normalizeUrlList(client.menuImages);
  $("clientInfo").value = client.infoAdicional || "";
  $("clientAdminNote").value = client.observacaoAdmin || "";
  $("deleteClientButton").classList.remove("hidden");
  renderClientImagesPreview();
  renderClientMenuPreview();
  setClientFocusMode(true);
}

async function deleteClientById(clientId) {
  if (!clientId) return;
  await remove(ref(db, `clientes/${clientId}`));
  state.clientes = state.clientes.filter((client) => client.id !== clientId);
  if (state.selectedClientId === clientId) resetClientForm();
  sortClientsInState();
  renderStats();
  renderClientsList();
  renderFinanceiro();
  fillUserClientSelect();
  fillEventClientSelect();
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
      <img src="${escapeAttr(displayImageUrl(imageUrl(item)))}" alt="Imagem ${index + 1}" ${lazyImageAttrs()} ${imageFallbackAttr()}>
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

function renderClientMenuPreview() {
  const box = $("clientMenuPreview");
  const count = $("clientMenuImagesCount");
  if (!box || !count) return;

  const images = normalizeUrlList(state.clientMenuImages);
  state.clientMenuImages = images;
  count.textContent = `${images.length} imagem${images.length === 1 ? "" : "s"}`;

  if (!images.length) {
    box.innerHTML = `<div class="list-meta">Nenhuma imagem de cardapio enviada ainda.</div>`;
    return;
  }

  box.innerHTML = images.map((url, index) => `
    <article class="image-tile">
      <img src="${escapeAttr(displayImageUrl(url))}" alt="Cardapio ${index + 1}" ${lazyImageAttrs()} ${imageFallbackAttr()}>
      <div>
        <button type="button" data-remove-menu-image="${index}" class="danger-mini">Remover</button>
      </div>
    </article>
  `).join("");

  box.querySelectorAll("[data-remove-menu-image]").forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.removeMenuImage);
      state.clientMenuImages.splice(index, 1);
      renderClientMenuPreview();
      showToast("Imagem do cardapio removida. Clique em salvar cliente para gravar.");
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

function isPdfFile(file) {
  return file?.type === "application/pdf" || /\.pdf$/i.test(file?.name || "");
}

async function uploadMenuFilesForClient(clientId, files) {
  const result = { images: [], pdf: "" };
  for (const file of Array.from(files || [])) {
    const kind = isPdfFile(file) ? "pdf" : "imagens";
    const path = `clientes/${clientId}/cardapio/${kind}/${Date.now()}-${slugify(file.name || "cardapio")}`;
    const fileRef = storageRef(storage, path);
    const url = await uploadFileWithProgress(fileRef, file, "Enviando cardapio", `${file.name || "arquivo"} (${result.images.length + (result.pdf ? 1 : 0) + 1}/${Array.from(files || []).length})`);
    if (kind === "pdf" && !result.pdf) {
      result.pdf = url;
    } else if (kind === "imagens") {
      result.images.push(url);
    }
  }
  return result;
}

async function saveClientMenuForCanonicalClient(sourceClient, targetId) {
  const oldId = sourceClient?.id || "";
  const { id: _ignored, ...clientData } = sourceClient || {};
  const payload = cleanForFirebase({
    ...clientData,
    cardapioLink: $("clientMenuLink").value.trim(),
    menuImages: normalizeUrlList(state.clientMenuImages),
    origem: "painel",
    editadoNoPainel: true,
    updatedAt: serverTimestamp(),
    updatedBy: state.user?.uid || ""
  });
  const updates = { [`clientes/${targetId}`]: payload };
  if (oldId && oldId !== targetId) updates[`clientes/${oldId}`] = null;
  await update(ref(db), updates);
  if (oldId && oldId !== targetId) state.clientes = state.clientes.filter((item) => item.id !== oldId);
  upsertClientInState(targetId, payload);
  state.selectedClientId = targetId;
}

async function uploadClientMenuFiles(files) {
  const selected = Array.from(files || []);
  if (!selected.length) return;

  const name = $("clientName").value.trim();
  const category = $("clientNewCategory").value.trim() || $("clientCategory").value.trim() || $("clientForm").dataset.originalCategory || "Outros";
  const targetId = getCanonicalClientId(category, name);
  if (!targetId) {
    showToast("Informe o nome do cliente antes de enviar o cardapio.");
    return;
  }

  showToast("Enviando cardapio...");
  const result = await uploadMenuFilesForClient(targetId, selected);
  if (result.pdf) $("clientMenuLink").value = result.pdf;
  state.clientMenuImages.push(...result.images);
  renderClientMenuPreview();

  if (state.selectedClientId) {
    const sourceClient = state.clientes.find((client) => client.id === state.selectedClientId || client.id === targetId) || {};
    await saveClientMenuForCanonicalClient(sourceClient, targetId);
    renderClientsList();
  }

  showToast(state.selectedClientId ? "Cardapio salvo." : "Cardapio enviado. Salve o cliente para concluir.");
}

async function uploadProfileImageForClient(clientId, file) {
  const path = `clientes/${clientId}/perfil/${Date.now()}-${slugify(file.name || "foto")}`;
  const fileRef = storageRef(storage, path);
  return uploadFileWithProgress(fileRef, file, "Enviando foto de perfil", file.name || "foto");
}

async function saveProfileImageForCanonicalClient(client, targetId, url) {
  const oldId = client?.id || "";
  const { id: _ignored, ...clientData } = client || {};
  const payload = cleanForFirebase({
    ...clientData,
    imagem: url,
    origem: "painel",
    editadoNoPainel: true,
    imagemAtualizadaEm: Date.now(),
    updatedAt: serverTimestamp(),
    updatedBy: state.user?.uid || ""
  });
  const updates = { [`clientes/${targetId}`]: payload };
  if (oldId && oldId !== targetId) updates[`clientes/${oldId}`] = null;
  state.usuarios.filter((user) => user.clienteId === oldId && oldId !== targetId).forEach((user) => {
    updates[`usuariosByUid/${user.uid}/clienteId`] = targetId;
  });
  if (state.profile?.clienteId === oldId && oldId !== targetId) {
    updates[`usuariosByUid/${state.user.uid}/clienteId`] = targetId;
  }
  await update(ref(db), updates);
  state.clientes = state.clientes.filter((item) => item.id !== oldId || oldId === targetId);
  upsertClientInState(targetId, payload);
  if (state.selectedClientId === oldId) state.selectedClientId = targetId;
  if (state.profile?.clienteId === oldId) state.profile.clienteId = targetId;
  state.usuarios.filter((user) => user.clienteId === oldId).forEach((user) => { user.clienteId = targetId; });
  return payload;
}

async function uploadClientProfileImage(file) {
  if (!file) return;
  const name = $("clientName").value.trim();
  const category = $("clientNewCategory").value.trim() || $("clientCategory").value.trim() || $("clientForm").dataset.originalCategory || "Outros";
  const targetId = getCanonicalClientId(category, name);
  if (!targetId) {
    showToast("Informe o nome do cliente antes de enviar a foto.");
    $("clientProfileUpload").value = "";
    return;
  }

  showToast("Enviando foto de perfil...");
  const url = await uploadProfileImageForClient(targetId, file);
  $("clientId").value = targetId;
  $("clientImage").value = url;
  renderProfilePreview("clientImage", "clientProfilePreview");

  if (state.selectedClientId) {
    const sourceClient = state.clientes.find((client) => client.id === state.selectedClientId || client.id === targetId) || {};
    await saveProfileImageForCanonicalClient(sourceClient, targetId, url);
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
    urls.push(await uploadFileWithProgress(fileRef, file, "Enviando imagens", `${file.name || "imagem"} (${urls.length + 1}/${Array.from(files || []).length})`));
  }
  return urls;
}

async function uploadPromoImageForClient(clientId, file) {
  const path = `clientes/${clientId}/promocoes/${Date.now()}-${slugify(file.name || "promocao")}`;
  const fileRef = storageRef(storage, path);
  return uploadFileWithProgress(fileRef, file, "Enviando imagem da promocao", file.name || "promocao");
}

async function uploadInvoiceReceiptForClient(clientId, file) {
  const path = `clientes/${clientId}/faturas/${Date.now()}-${slugify(file.name || "comprovante")}`;
  const fileRef = storageRef(storage, path);
  return uploadFileWithProgress(fileRef, file, "Enviando comprovante", file.name || "comprovante");
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
  const storageUrl = await uploadFileWithProgress(fileRef, blob, "Migrando imagens", `Imagem ${index}`);

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
      <img src="${escapeAttr(displayImageUrl(client.imagem || imageUrl(client.imagens && client.imagens[0])) || "../images/img_padrao_site/logo_1.png")}" alt="${escapeAttr(client.nome || "Cliente")}" ${lazyImageAttrs()} ${imageFallbackAttr()}>
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
      <div class="client-actions">
        <button type="button" data-edit-client="${escapeAttr(client.id)}">Editar</button>
        <button type="button" class="danger-mini" data-delete-client-list="${escapeAttr(client.id)}">Excluir</button>
      </div>
    </article>
  `).join("");

  box.querySelectorAll("[data-edit-client]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const client = state.clientes.find((item) => item.id === btn.dataset.editClient);
      if (client) fillClientForm(client);
    });
  });
  box.querySelectorAll("[data-delete-client-list]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const client = state.clientes.find((item) => item.id === btn.dataset.deleteClientList);
      if (!client || !confirm(`Excluir o cliente "${client.nome || client.id}"?`)) return;
      await deleteClientById(client.id);
      showToast("Cliente excluido.");
    });
  });
}

function clientDuplicateKey(client, includeCategory = true) {
  const nameKey = normalizeName(client.nome || client.name || client.id || "");
  const categoryKey = slugify(client.categoria || client.categoriaId || "sem-categoria");
  return includeCategory ? `${nameKey}__${categoryKey}` : nameKey;
}

function clientUpdatedAt(client) {
  const value = client.updatedAt;
  if (typeof value === "number") return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function clientCompletenessScore(client) {
  let score = 0;
  if (client.origem && client.origem !== "script.js") score += 30;
  if (client.imagem) score += 10;
  if (Array.isArray(client.imagens) && client.imagens.length) score += client.imagens.length;
  if (client.contato || client.whatsapp) score += 5;
  if (client.status === "ativo") score += 3;
  if (client.pagamentoStatus === "pago" || client.pagamentoStatus === "isento") score += 3;
  return score;
}

function chooseClientToKeep(group) {
  return [...group].sort((a, b) => {
    const updated = clientUpdatedAt(b) - clientUpdatedAt(a);
    if (updated) return updated;
    const completeness = clientCompletenessScore(b) - clientCompletenessScore(a);
    if (completeness) return completeness;
    return String(a.id || "").localeCompare(String(b.id || ""));
  })[0];
}

function buildDuplicateCleanupPlan() {
  const exactGroups = new Map();
  const nameGroups = new Map();
  state.clientes.forEach((client) => {
    const exactKey = clientDuplicateKey(client, true);
    const nameKey = clientDuplicateKey(client, false);
    if (!exactKey || exactKey.startsWith("__")) return;
    if (!exactGroups.has(exactKey)) exactGroups.set(exactKey, []);
    exactGroups.get(exactKey).push(client);
    if (!nameGroups.has(nameKey)) nameGroups.set(nameKey, []);
    nameGroups.get(nameKey).push(client);
  });

  const safeGroups = [];
  exactGroups.forEach((group) => {
    if (group.length < 2) return;
    const keep = chooseClientToKeep(group);
    safeGroups.push({
      key: clientDuplicateKey(keep, true),
      keep,
      remove: group.filter((client) => client.id !== keep.id)
    });
  });

  const reviewGroups = [];
  nameGroups.forEach((group) => {
    const categories = new Set(group.map((client) => slugify(client.categoria || client.categoriaId || "sem-categoria")));
    if (group.length > 1 && categories.size > 1) reviewGroups.push(group);
  });

  return {
    safeGroups,
    reviewGroups,
    removeIds: safeGroups.flatMap((group) => group.remove.map((client) => client.id))
  };
}

function renderDuplicatesReport() {
  const box = $("duplicatesReport");
  const cleanupButton = $("cleanupDuplicatesButton");
  if (!box || !cleanupButton) return;

  const plan = buildDuplicateCleanupPlan();
  state.duplicateCleanupPlan = plan;
  cleanupButton.classList.toggle("hidden", !plan.removeIds.length);
  box.classList.remove("hidden");

  const safePreview = plan.safeGroups.slice(0, 12).map((group) => `
    <article class="duplicate-group">
      <div>
        <strong>${escapeHtml(group.keep.nome || group.keep.id)}</strong>
        <span>${escapeHtml(group.keep.categoria || "Sem categoria")}</span>
      </div>
      <div class="list-meta">Manter: ${escapeHtml(group.keep.id)} | Remover: ${group.remove.map((client) => escapeHtml(client.id)).join(", ")}</div>
    </article>
  `).join("");

  const reviewPreview = plan.reviewGroups.slice(0, 8).map((group) => `
    <article class="duplicate-group review">
      <strong>${escapeHtml(group[0].nome || group[0].id)}</strong>
      <div class="list-meta">${group.map((client) => `${escapeHtml(client.id)} (${escapeHtml(client.categoria || "Sem categoria")})`).join(" | ")}</div>
    </article>
  `).join("");

  box.innerHTML = `
    <div class="duplicate-summary">
      <strong>${plan.removeIds.length}</strong> duplicados seguros para remover
      <span>${plan.reviewGroups.length} grupos com mesmo nome em categorias diferentes para revisar manualmente</span>
    </div>
    ${safePreview || `<div class="list-meta">Nenhum duplicado seguro encontrado.</div>`}
    ${reviewPreview ? `<h3>Revisar manualmente</h3>${reviewPreview}` : ""}
  `;
}

function fillClientCategorySelect(selectedName = "") {
  const select = $("clientCategory");
  if (!select) return;
  const selectedSlug = slugify(selectedName);
  const parents = new Map(state.categorias.map((cat) => [cat.id, cat.nome || cat.id]));
  const options = state.categorias
    .filter((cat) => cat.status !== "inativo")
    .map((cat) => {
    const value = cat.nome || cat.title || cat.id;
    const isSelected = slugify(value) === selectedSlug;
    const prefix = cat.parentId ? `${parents.get(cat.parentId) || "Principal"} / ` : "";
    return `<option value="${escapeAttr(value)}" ${isSelected ? "selected" : ""}>${escapeHtml(prefix + value)}</option>`;
  });
  select.innerHTML = `<option value="">Selecione uma categoria</option>` + options.join("");
}

function fillCategoryParentSelect(selectedId = "") {
  const select = $("categoryParent");
  if (!select) return;
  const currentId = $("categoryId")?.value || "";
  const options = state.categorias
    .filter((cat) => cat.id !== currentId && !cat.parentId && cat.status !== "inativo")
    .map((cat) => `<option value="${escapeAttr(cat.id)}" ${cat.id === selectedId ? "selected" : ""}>${escapeHtml(cat.nome || cat.id)}</option>`);
  select.innerHTML = `<option value="">Categoria principal</option>` + options.join("");
}

function resetCategoryForm() {
  state.selectedCategoryId = null;
  $("categoryForm").reset();
  $("categoryId").value = "";
  $("categoryIcon").value = "fa-solid fa-store";
  $("categoryIconColor").value = "#2563eb";
  $("categoryStatus").value = "ativo";
  $("deleteCategoryButton").classList.add("hidden");
  fillCategoryParentSelect();
}

function getCategoryFormData() {
  const name = $("categoryName").value.trim();
  const id = $("categoryId").value || slugify(name);
  return normalizeCategory({
    id,
    nome: name,
    nomeNormalizado: normalizeName(name),
    parentId: $("categoryParent").value,
    icon: $("categoryIcon").value.trim() || "fa-solid fa-store",
    iconColor: $("categoryIconColor").value || "#2563eb",
    status: $("categoryStatus").value,
    ordem: Number($("categoryOrder").value || 0),
    observacaoAdmin: $("categoryNote").value.trim(),
    origem: "painel",
    updatedAt: serverTimestamp(),
    updatedBy: state.user?.uid || ""
  });
}

function fillCategoryForm(category) {
  state.selectedCategoryId = category.id;
  $("categoryId").value = category.id || "";
  $("categoryName").value = category.nome || category.title || "";
  $("categoryIcon").value = category.icon || "fa-solid fa-store";
  $("categoryIconColor").value = category.iconColor || "#2563eb";
  $("categoryStatus").value = category.status || "ativo";
  $("categoryOrder").value = category.ordem || "";
  $("categoryNote").value = category.observacaoAdmin || "";
  fillCategoryParentSelect(category.parentId || "");
  $("deleteCategoryButton").classList.remove("hidden");
}

function renderCategoriesList() {
  const box = $("categoriesList");
  if (!box) return;
  const q = String($("categorySearch")?.value || "").toLowerCase().trim();
  const parents = new Map(state.categorias.map((cat) => [cat.id, cat.nome || cat.id]));
  const list = state.categorias.filter((cat) => {
    const hay = `${cat.nome || ""} ${cat.parentId ? parents.get(cat.parentId) : ""} ${cat.icon || ""}`.toLowerCase();
    return !q || hay.includes(q);
  });

  if (!list.length) {
    box.innerHTML = `<div class="list-meta">Nenhuma categoria cadastrada.</div>`;
    return;
  }

  box.innerHTML = list.map((cat) => `
    <article class="list-card category-row">
      <span class="category-icon-preview" style="color:${escapeAttr(cat.iconColor || "#2563eb")}"><i class="${escapeAttr(cat.icon || "fa-solid fa-store")}"></i></span>
      <div>
        <div class="list-title">${escapeHtml(cat.nome || cat.id)}</div>
        <div class="list-meta">${cat.parentId ? `Subcategoria de ${escapeHtml(parents.get(cat.parentId) || cat.parentId)}` : "Categoria principal"} - ${statusLabel(cat.status)}</div>
        <div class="list-meta">${escapeHtml(cat.icon || "fa-solid fa-store")}</div>
      </div>
      <button type="button" data-edit-category="${escapeAttr(cat.id)}">Editar</button>
    </article>
  `).join("");

  box.querySelectorAll("[data-edit-category]").forEach((button) => {
    button.addEventListener("click", () => {
      const category = state.categorias.find((cat) => cat.id === button.dataset.editCategory);
      if (category) fillCategoryForm(category);
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

function valorTotalFaturaCliente(client) {
  return valorFinalPlano(client) + (client?.destaqueSemanal ? Number(client.destaqueValor || 0) : 0);
}

function planLabel(tipoPlano) {
  return {
    mensal: "Mensal",
    semestral: "Semestral",
    anual: "Anual"
  }[tipoPlano] || "Mensal";
}

function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(monthKey) {
  if (!/^\d{4}-\d{2}$/.test(String(monthKey || ""))) return String(monthKey || "");
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

function pendingMonthsForClient(client) {
  const months = new Set(Array.isArray(client?.mesesEmAberto) ? client.mesesEmAberto : []);
  Object.entries(client?.faturas || {}).forEach(([mes, fatura]) => {
    if (!fatura?.status || ["em_aberto", "em_analise"].includes(fatura.status)) months.add(mes);
  });
  if (!months.size && (!client?.pagamentoStatus || client.pagamentoStatus === "em_aberto")) {
    months.add(currentMonthKey());
  }
  return [...months].filter(Boolean).sort();
}

function splitMonthsInput(value) {
  return String(value || "")
    .split(/[,\s;]+/)
    .map((item) => item.trim())
    .filter((item) => /^\d{4}-\d{2}$/.test(item));
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
      ${evento.imagem ? `<img src="${escapeAttr(displayImageUrl(evento.imagem))}" alt="${escapeAttr(evento.titulo || "Evento")}" ${lazyImageAttrs()} ${imageFallbackAttr()}>` : ""}
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
  $("eventImage").value = await uploadFileWithProgress(fileRef, file, "Enviando imagem do evento", file.name || "evento");
  showToast("Imagem do evento enviada.");
}

function resetInfoDeathNoticeForm() {
  state.selectedDeathNoticeId = null;
  $("infoDeathNoticeForm")?.reset();
  if ($("infoDeathNoticeId")) $("infoDeathNoticeId").value = "";
  $("deleteInfoDeathNoticeButton")?.classList.add("hidden");
}

function fillInfoDeathNoticeForm(item) {
  state.selectedDeathNoticeId = item.id;
  $("infoDeathNoticeId").value = item.id || "";
  $("infoDeathNoticeName").value = item.name || item.nome || "";
  $("infoDeathNoticeDate").value = item.date || item.data || "";
  $("infoDeathNoticeStatus").value = item.status || "ativo";
  $("infoDeathNoticeImage").value = item.image || item.imagem || "";
  $("infoDeathNoticeDescription").value = item.descricaoFalecido || item.descricao || "";
  $("deleteInfoDeathNoticeButton").classList.remove("hidden");
}

function getInfoDeathNoticeFormData() {
  const name = $("infoDeathNoticeName").value.trim();
  const date = $("infoDeathNoticeDate").value;
  const baseId = $("infoDeathNoticeId").value || `${slugify(name || "nota")}-${date || Date.now()}`;
  return cleanForFirebase({
    id: baseId,
    name,
    nome: name,
    date,
    data: date,
    status: $("infoDeathNoticeStatus").value,
    image: $("infoDeathNoticeImage").value.trim(),
    imagem: $("infoDeathNoticeImage").value.trim(),
    descricaoFalecido: $("infoDeathNoticeDescription").value.trim(),
    origem: "painel",
    updatedAt: serverTimestamp(),
    updatedBy: state.user?.uid || ""
  });
}

function renderInfoDeathNoticeList() {
  const box = $("infoDeathNoticeList");
  if (!box) return;

  const q = String($("infoDeathNoticeSearch")?.value || "").toLowerCase().trim();
  const list = state.notasFalecimento.filter((item) => {
    const hay = `${item.name || item.nome || ""} ${item.date || item.data || ""} ${item.descricaoFalecido || ""}`.toLowerCase();
    return !q || hay.includes(q);
  });

  if (!list.length) {
    box.innerHTML = `<div class="list-meta">Nenhuma nota cadastrada no Firebase.</div>`;
    return;
  }

  box.innerHTML = list.map((item) => `
    <article class="list-card event-card">
      ${item.image || item.imagem ? `<img src="${escapeAttr(displayImageUrl(item.image || item.imagem))}" alt="${escapeAttr(item.name || "Nota")}" ${lazyImageAttrs()} ${imageFallbackAttr()}>` : ""}
      <div class="list-title">${escapeHtml(item.name || item.nome || item.id)}</div>
      <div class="list-meta">${escapeHtml(item.date || item.data || "Sem data")}</div>
      <span class="badge ${escapeAttr(item.status || "ativo")}">${statusLabel(item.status)}</span>
      <button type="button" data-edit-death-notice="${escapeAttr(item.id)}">Editar</button>
    </article>
  `).join("");

  box.querySelectorAll("[data-edit-death-notice]").forEach((button) => {
    button.addEventListener("click", () => {
      const item = state.notasFalecimento.find((notice) => notice.id === button.dataset.editDeathNotice);
      if (item) fillInfoDeathNoticeForm(item);
    });
  });
}

async function uploadInfoDeathNoticeImage(file) {
  if (!file) return;
  if (!canManageInformacoes()) return;
  const id = $("infoDeathNoticeId").value || `${slugify($("infoDeathNoticeName").value.trim() || "nota")}-${Date.now()}`;
  const path = `conteudosInformativos/notaFalecimento/${id}/${Date.now()}-${slugify(file.name || "imagem")}`;
  const fileRef = storageRef(storage, path);
  showToast("Enviando imagem da nota...");
  $("infoDeathNoticeImage").value = await uploadFileWithProgress(fileRef, file, "Enviando imagem da nota", file.name || "imagem");
  showToast("Imagem da nota enviada.");
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
  const total = paid.reduce((sum, c) => sum + valorTotalFaturaCliente(c), 0);

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
        <div class="list-meta">Plano: ${planLabel(client.tipoPlano)} - Valor final: ${moneyBR(valorTotalFaturaCliente(client))}${client.destaqueSemanal ? ` - destaque ${moneyBR(client.destaqueValor || 0)}` : ""}</div>
        <div class="list-meta">Meses em aberto: ${pendingMonthsForClient(client).map(monthLabel).join(", ") || "Nenhum"}</div>
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
      <label class="finance-months">Meses devendo<input data-finance-months value="${escapeAttr(pendingMonthsForClient(client).join(", "))}" placeholder="2026-05, 2026-06"></label>
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
      const mesesEmAberto = splitMonthsInput(row.querySelector("[data-finance-months]")?.value || "");
      const currentClient = state.clientes.find((client) => client.id === id) || {};
      const nextClient = { ...currentClient, ...payload };
      const valorPlanoFatura = valorFinalPlano(nextClient);
      const valorDestaqueFatura = nextClient.destaqueSemanal ? Number(nextClient.destaqueValor || 0) : 0;
      const valorTotalFatura = valorPlanoFatura + valorDestaqueFatura;
      payload.mesesEmAberto = mesesEmAberto;
      mesesEmAberto.forEach((mes) => {
        payload[`faturas/${mes}/mes`] = mes;
        payload[`faturas/${mes}/status`] = "em_aberto";
        payload[`faturas/${mes}/valorPlano`] = valorPlanoFatura;
        payload[`faturas/${mes}/valorDestaque`] = valorDestaqueFatura;
        payload[`faturas/${mes}/valorTotal`] = valorTotalFatura;
        payload[`faturas/${mes}/updatedAt`] = Date.now();
      });
      if (!isMaster()) delete payload.valorPlano;
      payload.updatedAt = serverTimestamp();
      payload.updatedBy = state.user?.uid || "";
      payload.origem = "painel";
      payload.editadoNoPainel = true;
      await update(ref(db, `clientes/${id}`), payload);
      const index = state.clientes.findIndex((client) => client.id === id);
      if (index >= 0) state.clientes[index] = { ...state.clientes[index], ...payload };
      renderStats();
      renderClientsList();
      fillUserClientSelect();
      fillEventClientSelect();
      showToast("Financeiro atualizado.");
      renderFinanceiro();
      renderReports();
    });
  });
}

function latestClientInvoice(client) {
  const entries = Object.entries(client?.faturas || {});
  if (!entries.length) return null;
  entries.sort(([a], [b]) => String(b).localeCompare(String(a)));
  const [mes, data] = entries[0];
  return { mes, ...(data || {}) };
}

function reportPercent(value, total) {
  if (!total) return "0%";
  return `${Math.round((value / total) * 100)}%`;
}

function renderReportList(items, emptyText = "Nenhum item encontrado.") {
  if (!items.length) return `<div class="list-meta">${escapeHtml(emptyText)}</div>`;
  return items.map((item) => `
    <article class="report-item">
      <strong>${escapeHtml(item.title)}</strong>
      <span>${escapeHtml(item.meta || "")}</span>
    </article>
  `).join("");
}

const REPORT_BLOCKED_CATEGORY_SLUGS = new Set([
  "eventosemcarlopolis",
  "agendamento",
  "ambulatoriodohospital",
  "asilo",
  "agenciatrabalhador",
  "cras",
  "clubedexadrez",
  "correio",
  "creches",
  "hospital",
  "rodoviaria",
  "prefeitura",
  "copel",
  "delegacia",
  "escolapublica",
  "farmaciamunicipal",
  "postodesaude",
  "sanepar",
  "samuzinho",
  "secretariadasaude",
  "secretariadaeducacao",
  "sindicatorural",
  "vigilanciasanitaria",
  "coletadelixo",
  "notadefalecimento",
  "vagasdetrabalho",
  "farmaciadeplantao"
]);

function isReportClient(client) {
  const slug = slugify(client?.categoria || client?.category || "").replace(/-/g, "");
  if (!slug || REPORT_BLOCKED_CATEGORY_SLUGS.has(slug)) return false;
  return !/evento|publico|publica|informacao|informacoes|falecimento|plantao|coletadelixo|vagasdetrabalho/.test(slug);
}

function receitaPlanoValor(client) {
  const valor = valorTotalFaturaCliente(client);
  const plano = client?.tipoPlano || "mensal";
  if (plano === "semestral") return { mensal: valor / 6, semestral: valor, anual: valor * 2 };
  if (plano === "anual") return { mensal: valor / 12, semestral: valor / 2, anual: valor };
  return { mensal: valor, semestral: valor * 6, anual: valor * 12 };
}

function incrementMetric(map, key, amount = 1) {
  const safeKey = key || "sem-identificacao";
  map.set(safeKey, (map.get(safeKey) || 0) + Number(amount || 0));
}

function topFromMap(map, limit = 10, singular = "clique", plural = "cliques") {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([title, count]) => ({ title, meta: `${count} ${count === 1 ? singular : plural}` }));
}

function dateKeyFromDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function addDays(date, amount) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function getReportDateRange() {
  const today = new Date();
  const type = state.reportPeriod?.type || "mensal";
  if (type === "dia") return { start: dateKeyFromDate(today), end: dateKeyFromDate(today), label: "Hoje" };
  if (type === "semanal") {
    const start = addDays(today, -6);
    return { start: dateKeyFromDate(start), end: dateKeyFromDate(today), label: "Ultimos 7 dias" };
  }
  if (type === "anual") {
    return { start: `${today.getFullYear()}-01-01`, end: dateKeyFromDate(today), label: String(today.getFullYear()) };
  }
  if (type === "personalizado") {
    const start = state.reportPeriod.start || dateKeyFromDate(today);
    const end = state.reportPeriod.end || start;
    return { start, end, label: `${start} ate ${end}` };
  }
  return { start: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`, end: dateKeyFromDate(today), label: "Mes atual" };
}

function filterDailyMetrics(data = {}, range = getReportDateRange()) {
  return Object.fromEntries(Object.entries(data || {}).filter(([date]) => date >= range.start && date <= range.end));
}

function aggregateCliquesPorBotao(data = {}) {
  const porCliente = new Map();
  const porTipo = new Map();
  Object.values(data || {}).forEach((dia) => {
    Object.entries(dia || {}).forEach(([clienteId, tipos]) => {
      Object.entries(tipos || {}).forEach(([tipo, count]) => {
        incrementMetric(porCliente, clienteId, count);
        incrementMetric(porTipo, tipo, count);
      });
    });
  });
  return { porCliente, porTipo };
}

function aggregateSimpleDaily(data = {}) {
  const map = new Map();
  Object.values(data || {}).forEach((dia) => {
    Object.entries(dia || {}).forEach(([key, count]) => incrementMetric(map, key, count));
  });
  return map;
}

function aggregateCidadesAcesso(data = {}) {
  const map = new Map();
  Object.values(data || {}).forEach((dia) => {
    Object.values(dia?.detalhados || {}).forEach((item) => {
      const cidade = [item?.cidade || "Desconhecida", item?.estado || ""].filter(Boolean).join(" - ");
      incrementMetric(map, cidade, 1);
    });
  });
  return map;
}

function renderReports() {
  const mount = $("reportsMount");
  if (!mount) return;
  const periodRange = getReportDateRange();
  const filteredMetrics = {
    cliquesBotoes: filterDailyMetrics(state.metricas.cliquesBotoes, periodRange),
    cliquesMenu: filterDailyMetrics(state.metricas.cliquesMenu, periodRange),
    acessos: filterDailyMetrics(state.metricas.acessos, periodRange),
    ondeComerCardapios: filterDailyMetrics(state.metricas.ondeComerCardapios, periodRange),
    ondeComerWhats: filterDailyMetrics(state.metricas.ondeComerWhats, periodRange),
    ondeComerFotos: filterDailyMetrics(state.metricas.ondeComerFotos, periodRange),
    promocoes: filterDailyMetrics(state.metricas.promocoes, periodRange)
  };

  const reportClients = state.clientes.filter(isReportClient);
  const totalClientes = reportClients.length;
  const ativos = reportClients.filter((c) => c.status === "ativo");
  const inativos = reportClients.filter((c) => c.status === "inativo");
  const pendentes = reportClients.filter((c) => c.status === "pendente");
  const pagos = reportClients.filter((c) => c.pagamentoStatus === "pago");
  const abertos = reportClients.filter((c) => !c.pagamentoStatus || c.pagamentoStatus === "em_aberto");
  const isentos = reportClients.filter((c) => c.pagamentoStatus === "isento");
  const destaques = reportClients.filter((c) => c.destaqueSemanal);
  const comImagem = reportClients.filter((c) => c.imagem || normalizeImageItems(c.imagens).length);
  const comHorarios = reportClients.filter((c) => scheduleHasAnyOpen(c.horarios || {}));
  const valorReceber = reportClients
    .filter((c) => c.status !== "inativo" && c.pagamentoStatus !== "isento")
    .reduce((sum, c) => sum + valorTotalFaturaCliente(c), 0);
  const valorPago = pagos.reduce((sum, c) => sum + valorTotalFaturaCliente(c), 0);
  const valorAberto = abertos.reduce((sum, c) => sum + valorTotalFaturaCliente(c), 0);
  const receitas = reportClients
    .filter((c) => c.status !== "inativo" && c.pagamentoStatus !== "isento")
    .reduce((acc, client) => {
      const valores = receitaPlanoValor(client);
      acc.mensal += valores.mensal;
      acc.semestral += valores.semestral;
      acc.anual += valores.anual;
      return acc;
    }, { mensal: 0, semestral: 0, anual: 0 });
  const porPlano = reportClients.reduce((acc, client) => {
    const plano = client.tipoPlano || "mensal";
    acc[plano] = (acc[plano] || 0) + 1;
    return acc;
  }, {});

  const categoriasMap = new Map();
  reportClients.forEach((client) => {
    const key = client.categoria || "Sem categoria";
    categoriasMap.set(key, (categoriasMap.get(key) || 0) + 1);
  });
  const topCategorias = [...categoriasMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([title, count]) => ({ title, meta: `${count} cliente${count === 1 ? "" : "s"}` }));

  const cliquesBotoes = aggregateCliquesPorBotao(filteredMetrics.cliquesBotoes);
  const cliquesMenu = aggregateSimpleDaily(filteredMetrics.cliquesMenu);
  const cliquesOndeComerCardapios = aggregateSimpleDaily(filteredMetrics.ondeComerCardapios);
  const cliquesOndeComerWhats = aggregateSimpleDaily(filteredMetrics.ondeComerWhats);
  const cliquesOndeComerFotos = aggregateSimpleDaily(filteredMetrics.ondeComerFotos);
  const cliquesPromocoes = aggregateSimpleDaily(filteredMetrics.promocoes);
  const cidadesAcesso = aggregateCidadesAcesso(filteredMetrics.acessos);

  const clientesAtencao = reportClients
    .filter((client) => client.status !== "inativo")
    .map((client) => {
      const faltas = [];
      if (!client.imagem && !normalizeImageItems(client.imagens).length) faltas.push("sem foto");
      if (!client.contato && !client.whatsapp) faltas.push("sem telefone");
      if (!client.categoria) faltas.push("sem categoria");
      if (!scheduleHasAnyOpen(client.horarios || {})) faltas.push("sem horarios");
      if (!client.pagamentoStatus || client.pagamentoStatus === "em_aberto") faltas.push("financeiro em aberto");
      return { client, faltas };
    })
    .filter((item) => item.faltas.length)
    .slice(0, 10)
    .map((item) => ({ title: item.client.nome || item.client.id, meta: item.faltas.join(", ") }));

  const faturasComComprovante = reportClients
    .map((client) => ({ client, invoice: latestClientInvoice(client) }))
    .filter(({ invoice }) => invoice?.comprovanteUrl)
    .slice(0, 10)
    .map(({ client, invoice }) => ({
      title: client.nome || client.id,
      meta: `${invoice.mes || "Fatura"} - ${paymentLabel(invoice.status || "em_analise")} - ${moneyBR(invoice.valorTotal || valorTotalFaturaCliente(client))}`
    }));

  const roles = state.usuarios.reduce((acc, user) => {
    const role = user.role || "cliente";
    acc[role] = (acc[role] || 0) + 1;
    return acc;
  }, {});
  const usuariosSemCliente = state.usuarios
    .filter((user) => user.role === "cliente" && !user.clienteId)
    .map((user) => ({ title: user.email || user.uid, meta: "Usuario cliente sem cliente vinculado" }));

  const hoje = dateKeyFromDate(new Date());
  const eventosAtivos = state.eventos.filter((event) => (event.status || "ativo") === "ativo");
  const proximosEventos = eventosAtivos
    .filter((event) => !event.data || event.data >= hoje)
    .sort((a, b) => String(a.data || "").localeCompare(String(b.data || "")))
    .slice(0, 6)
    .map((event) => ({ title: event.titulo || event.nome || event.id, meta: `${event.data || "Sem data"} - ${event.local || "Sem local"}` }));

  mount.innerHTML = `
    <section class="panel-card report-period-card">
      <div class="section-head compact">
        <div>
          <h2>Periodo dos relatorios</h2>
          <p>Filtra acessos, cliques, menu lateral, Onde Comer e Promocoes. Base financeira usa os clientes atuais.</p>
        </div>
        <span class="badge ativo">${escapeHtml(periodRange.label)}</span>
      </div>
      <div class="report-period-tabs">
        <button type="button" data-report-period="dia" class="period-day ${state.reportPeriod.type === "dia" ? "active" : ""}"><i class="fa-solid fa-sun"></i> Dia</button>
        <button type="button" data-report-period="semanal" class="period-week ${state.reportPeriod.type === "semanal" ? "active" : ""}"><i class="fa-solid fa-calendar-week"></i> Semanal</button>
        <button type="button" data-report-period="mensal" class="period-month ${state.reportPeriod.type === "mensal" ? "active" : ""}"><i class="fa-solid fa-calendar-days"></i> Mensal</button>
        <button type="button" data-report-period="anual" class="period-year ${state.reportPeriod.type === "anual" ? "active" : ""}"><i class="fa-solid fa-chart-line"></i> Anual</button>
        <button type="button" data-report-period="personalizado" class="period-custom ${state.reportPeriod.type === "personalizado" ? "active" : ""}"><i class="fa-solid fa-sliders"></i> Personalizado</button>
      </div>
      <div class="report-custom-range ${state.reportPeriod.type === "personalizado" ? "" : "hidden"}">
        <label>Inicio<input id="reportStartDate" type="date" value="${escapeAttr(state.reportPeriod.start || periodRange.start)}"></label>
        <label>Fim<input id="reportEndDate" type="date" value="${escapeAttr(state.reportPeriod.end || periodRange.end)}"></label>
        <button id="applyReportRangeButton" type="button" class="ghost-button"><i class="fa-solid fa-check"></i> Aplicar</button>
      </div>
    </section>

    <div class="stats-grid">
      <article class="stat-card"><span>Clientes ativos</span><strong>${ativos.length}</strong><small>${reportPercent(ativos.length, totalClientes)} da base</small></article>
      <article class="stat-card"><span>Financeiro em aberto</span><strong>${abertos.length}</strong><small>${moneyBR(valorAberto)}</small></article>
      <article class="stat-card"><span>Receita prevista</span><strong>${moneyBR(valorReceber)}</strong><small>Clientes nao isentos</small></article>
      <article class="stat-card"><span>Receita mensal</span><strong>${moneyBR(receitas.mensal)}</strong><small>Projecao por planos</small></article>
      <article class="stat-card"><span>Receita semestral</span><strong>${moneyBR(receitas.semestral)}</strong><small>Projecao por planos</small></article>
      <article class="stat-card"><span>Receita anual</span><strong>${moneyBR(receitas.anual)}</strong><small>Projecao por planos</small></article>
      <article class="stat-card"><span>Receita paga</span><strong>${moneyBR(valorPago)}</strong><small>${pagos.length} cliente${pagos.length === 1 ? "" : "s"}</small></article>
      <article class="stat-card"><span>Destaques semanais</span><strong>${destaques.length}</strong><small>${moneyBR(destaques.reduce((sum, c) => sum + Number(c.destaqueValor || 0), 0))}</small></article>
      <article class="stat-card"><span>Com foto</span><strong>${comImagem.length}</strong><small>${reportPercent(comImagem.length, totalClientes)} dos clientes</small></article>
    </div>

    <div class="reports-grid">
      <section class="panel-card report-card">
        <h2>Resumo operacional</h2>
        <div class="report-kpis">
          <span>Ativos: <strong>${ativos.length}</strong></span>
          <span>Pendentes: <strong>${pendentes.length}</strong></span>
          <span>Inativos: <strong>${inativos.length}</strong></span>
          <span>Isentos: <strong>${isentos.length}</strong></span>
          <span>Com horarios: <strong>${comHorarios.length}</strong></span>
          <span>Categorias usadas: <strong>${categoriasMap.size}</strong></span>
          <span>Plano mensal: <strong>${porPlano.mensal || 0}</strong></span>
          <span>Plano semestral: <strong>${porPlano.semestral || 0}</strong></span>
          <span>Plano anual: <strong>${porPlano.anual || 0}</strong></span>
        </div>
      </section>

      <section class="panel-card report-card">
        <h2>Mais acessados por comercio</h2>
        ${renderReportList(topFromMap(cliquesBotoes.porCliente, 12), "Ainda nao ha cliques de comercio registrados.")}
      </section>

      <section class="panel-card report-card">
        <h2>Cliques por botao</h2>
        ${renderReportList(topFromMap(cliquesBotoes.porTipo, 12), "Ainda nao ha cliques por botao registrados.")}
      </section>

      <section class="panel-card report-card">
        <h2>Cidades dos acessos</h2>
        ${renderReportList(topFromMap(cidadesAcesso, 12, "acesso", "acessos"), "Ainda nao ha dados de cidade nos acessos.")}
      </section>

      <section class="panel-card report-card">
        <h2>Menu lateral</h2>
        ${renderReportList(topFromMap(cliquesMenu, 12), "Ainda nao ha cliques de menu registrados.")}
      </section>

      <section class="panel-card report-card">
        <h2>Onde Comer</h2>
        <div class="report-kpis">
          <span>Cardapios: <strong>${[...cliquesOndeComerCardapios.values()].reduce((s, v) => s + v, 0)}</strong></span>
          <span>WhatsApp: <strong>${[...cliquesOndeComerWhats.values()].reduce((s, v) => s + v, 0)}</strong></span>
          <span>Fotos: <strong>${[...cliquesOndeComerFotos.values()].reduce((s, v) => s + v, 0)}</strong></span>
        </div>
        ${renderReportList(topFromMap(cliquesOndeComerWhats, 8), "Ainda nao ha cliques no Onde Comer.")}
      </section>

      <section class="panel-card report-card">
        <h2>Promocoes</h2>
        ${renderReportList(topFromMap(cliquesPromocoes, 12), "Ainda nao ha cliques em promocoes registrados.")}
      </section>

      <section class="panel-card report-card">
        <h2>Clientes que precisam de atencao</h2>
        ${renderReportList(clientesAtencao, "Nenhuma pendencia importante encontrada.")}
      </section>

      <section class="panel-card report-card">
        <h2>Top categorias</h2>
        ${renderReportList(topCategorias, "Nenhuma categoria com cliente.")}
      </section>

      <section class="panel-card report-card">
        <h2>Comprovantes recentes</h2>
        ${renderReportList(faturasComComprovante, "Nenhum comprovante anexado ainda.")}
      </section>

      <section class="panel-card report-card">
        <h2>Usuarios</h2>
        <div class="report-kpis">
          <span>Master: <strong>${roles.master || 0}</strong></span>
          <span>Admin: <strong>${roles.admin || 0}</strong></span>
          <span>Clientes: <strong>${roles.cliente || 0}</strong></span>
          <span>Sem vinculo: <strong>${usuariosSemCliente.length}</strong></span>
        </div>
        ${renderReportList(usuariosSemCliente.slice(0, 6), "Todos os usuarios cliente estao vinculados.")}
      </section>

      <section class="panel-card report-card">
        <h2>Proximos eventos</h2>
        ${renderReportList(proximosEventos, "Nenhum evento ativo futuro encontrado.")}
      </section>
    </div>
  `;

  mount.querySelectorAll("[data-report-period]").forEach((button) => {
    button.addEventListener("click", () => {
      state.reportPeriod.type = button.dataset.reportPeriod;
      renderReports();
    });
  });
  mount.querySelector("#applyReportRangeButton")?.addEventListener("click", () => {
    state.reportPeriod.type = "personalizado";
    state.reportPeriod.start = $("reportStartDate")?.value || "";
    state.reportPeriod.end = $("reportEndDate")?.value || state.reportPeriod.start;
    renderReports();
  });
}

function renderPaymentSettings() {
  if (!$("paymentSettingsForm")) return;
  const config = state.pagamentoSistema || {};
  $("paymentPixKey").value = config.pixChave || "";
  $("paymentPixName").value = config.pixNome || "Ola Carlopolis";
  $("paymentPixCity").value = config.pixCidade || "CARLOPOLIS";
  $("paymentInvoiceNote").value = config.observacaoFatura || "";
}

function renderClientOnlyEditor() {
  const mount = $("clientOnlyMount");
  const client = state.clientes.find((item) => item.id === state.profile?.clienteId);
  if (!client) {
    mount.innerHTML = `<p>Nenhum cliente vinculado a este usuario. Fale com o administrador.</p>`;
    return;
  }

  const imagens = normalizeImageItems(client.imagens);
  const menuImages = normalizeUrlList(client.menuImages);
  const promocoes = normalizePromocoes(client.promocoes);

  mount.innerHTML = `
    <form id="clientOnlyForm" class="grid-form">
      <section class="wide profile-upload-panel profile-upload-top">
        <div class="section-head compact">
          <div>
            <h3>Foto de perfil</h3>
            <p>Imagem principal da sua empresa. Ela fica salva no Firebase Storage.</p>
          </div>
        </div>
        <div class="profile-upload-row">
          <img id="coProfilePreview" src="${escapeAttr(displayImageUrl(client.imagem || ""))}" alt="Foto de perfil" class="${client.imagem ? "" : "empty"}" ${lazyImageAttrs()} ${imageFallbackAttr()}>
          <label>Enviar foto de perfil<input id="coProfileUpload" type="file" accept="image/*"></label>
        </div>
        <input id="coImage" type="hidden" value="${escapeAttr(client.imagem || "")}">
      </section>
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
      <label>Facebook<input id="coFacebook" value="${escapeAttr(client.facebook || "")}"></label>
      <label>TikTok<input id="coTiktok" value="${escapeAttr(client.tiktok || "")}"></label>
      <label>Site<input id="coSite" value="${escapeAttr(client.site || "")}"></label>
      <label>Link do cardapio<input id="coMenuLink" value="${escapeAttr(client.cardapioLink || "")}" placeholder="Link externo ou PDF enviado"></label>
      <section class="wide upload-panel">
        <div class="section-head compact">
          <div>
            <h3>Meu cardapio</h3>
            <p>Envie um PDF para abrir no botao Cardapio, ou imagens para aparecerem em modal.</p>
          </div>
          <span id="coMenuImagesCount" class="badge">${menuImages.length} imagem${menuImages.length === 1 ? "" : "s"}</span>
        </div>
        <input id="coMenuUpload" type="file" accept="image/*,application/pdf" multiple>
        <div id="coMenuPreview" class="image-grid">
          ${renderMenuImagesMarkup(menuImages, "comenu")}
        </div>
      </section>
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
      <section class="wide upload-panel">
        <div class="section-head compact">
          <div>
            <h3>Promocoes</h3>
            <p>Cadastre ofertas que aparecem no menu Promocoes do site publico.</p>
          </div>
          <span id="coPromosCount" class="badge">${promocoes.length} ativa${promocoes.length === 1 ? "" : "s"}</span>
        </div>
        <div class="promo-admin-form">
          <label>Titulo da promocao<input id="coPromoTitle" placeholder="Ex.: Pizza grande"></label>
          <label>Preco atual<input id="coPromoPrice" placeholder="Ex.: 49,90"></label>
          <label>Preco antigo<input id="coPromoOldPrice" placeholder="Opcional"></label>
          <label>Unidade<input id="coPromoUnit" placeholder="Ex.: A unidade"></label>
          <label>Volume<input id="coPromoVolume" placeholder="Opcional"></label>
          <label>Embalagem<input id="coPromoPack" placeholder="Opcional"></label>
          <label>Validade inicio<input id="coPromoStart" type="date"></label>
          <label>Validade fim<input id="coPromoEnd" type="date"></label>
          <label class="wide">Observacao<textarea id="coPromoObs" rows="3" placeholder="Detalhes da oferta"></textarea></label>
          <label>Imagem da promocao<input id="coPromoImageUpload" type="file" accept="image/*"></label>
          <label>Ou URL da imagem<input id="coPromoImageUrl" placeholder="https://..."></label>
          <button id="coAddPromoButton" type="button" class="ghost-button wide"><i class="fa-solid fa-plus"></i> Adicionar promocao</button>
        </div>
        <div id="coPromosPreview" class="promo-admin-list">
          ${renderPromocoesMarkup(promocoes)}
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
    const targetId = clientCanonicalId(client);
    const url = await uploadProfileImageForClient(targetId, file);
    $("coImage").value = url;
    renderProfilePreview("coImage", "coProfilePreview");
    await saveProfileImageForCanonicalClient(client, targetId, url);
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

  mount.querySelector("#coMenuUpload").addEventListener("change", async (event) => {
    const selected = Array.from(event.target.files || []);
    if (!selected.length) return;
    showToast("Enviando cardapio...");
    const result = await uploadMenuFilesForClient(client.id, selected);
    if (result.pdf) $("coMenuLink").value = result.pdf;
    menuImages.push(...result.images);
    await update(ref(db, `clientes/${client.id}`), {
      menuImages,
      cardapioLink: $("coMenuLink").value.trim(),
      origem: "painel",
      editadoNoPainel: true,
      updatedAt: serverTimestamp(),
      updatedBy: state.user.uid
    });
    showToast("Cardapio enviado.");
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

  mount.querySelector("#coAddPromoButton").addEventListener("click", async () => {
    const title = $("coPromoTitle").value.trim();
    if (!title) {
      showToast("Informe o titulo da promocao.");
      return;
    }

    let image = $("coPromoImageUrl").value.trim();
    const imageFile = $("coPromoImageUpload").files?.[0];
    if (imageFile) {
      showToast("Enviando imagem da promocao...");
      image = await uploadPromoImageForClient(client.id, imageFile);
    }

    promocoes.unshift({
      id: `promo-${Date.now()}`,
      titulo: title,
      preco: $("coPromoPrice").value.trim(),
      precoAntigo: $("coPromoOldPrice").value.trim(),
      unidade: $("coPromoUnit").value.trim(),
      volume: $("coPromoVolume").value.trim(),
      embalagem: $("coPromoPack").value.trim(),
      validadeInicio: $("coPromoStart").value,
      validadeFim: $("coPromoEnd").value,
      obs: $("coPromoObs").value.trim(),
      imagem: image,
      ativo: true
    });

    await update(ref(db, `clientes/${client.id}`), {
      promocoes: normalizePromocoes(promocoes),
      origem: "painel",
      editadoNoPainel: true,
      updatedAt: serverTimestamp(),
      updatedBy: state.user.uid
    });
    showToast("Promocao adicionada.");
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

  mount.querySelectorAll("[data-comenu-remove]").forEach((button) => {
    button.addEventListener("click", async () => {
      const index = Number(button.dataset.comenuRemove);
      menuImages.splice(index, 1);
      await update(ref(db, `clientes/${client.id}`), {
        menuImages,
        origem: "painel",
        editadoNoPainel: true,
        updatedAt: serverTimestamp(),
        updatedBy: state.user.uid
      });
      showToast("Imagem do cardapio removida.");
      await loadAllData();
      renderClientOnlyEditor();
    });
  });

  mount.querySelectorAll("[data-promo-remove]").forEach((button) => {
    button.addEventListener("click", async () => {
      const index = Number(button.dataset.promoRemove);
      promocoes.splice(index, 1);
      await update(ref(db, `clientes/${client.id}`), {
        promocoes: normalizePromocoes(promocoes),
        origem: "painel",
        editadoNoPainel: true,
        updatedAt: serverTimestamp(),
        updatedBy: state.user.uid
      });
      showToast("Promocao removida.");
      await loadAllData();
      renderClientOnlyEditor();
    });
  });

  $("clientOnlyForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const horarios = readScheduleEditor("coScheduleEditor");
    const scheduleBox = $("coScheduleEditor");
    const shouldSaveSchedule = scheduleHasAnyOpen(horarios) || scheduleBox?.dataset.initialSchedule === "true" || scheduleBox?.dataset.touchedSchedule === "true";
    const horarioTexto = shouldSaveSchedule ? scheduleToText(horarios) : $("coHours").value.trim();
    const payload = {
      nome: $("coName").value.trim(),
      nomeNormalizado: normalizeName($("coName").value.trim()),
      contato: $("coContact").value.trim(),
      whatsapp: $("coWhatsapp").value.trim(),
      endereco: $("coAddress").value.trim(),
      horario: horarioTexto,
      ...(shouldSaveSchedule ? { horarios: normalizeSchedule(horarios) } : {}),
      instagram: $("coInstagram").value.trim(),
      facebook: $("coFacebook").value.trim(),
      tiktok: $("coTiktok").value.trim(),
      site: $("coSite").value.trim(),
      imagem: $("coImage").value.trim(),
      imagens,
      cardapioLink: $("coMenuLink").value.trim(),
      menuImages,
      promocoes: normalizePromocoes(promocoes),
      infoAdicional: $("coInfo").value.trim(),
      origem: "painel",
      editadoNoPainel: true,
      updatedAt: serverTimestamp(),
      updatedBy: state.user.uid
    };
    payload.aliases = buildClientPublicAliases(client.id, payload, client, false);
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
      <img src="${escapeAttr(displayImageUrl(imageUrl(item)))}" alt="Imagem ${index + 1}" ${lazyImageAttrs()} ${imageFallbackAttr()}>
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

function renderMenuImagesMarkup(images, prefix) {
  const list = normalizeUrlList(images);
  if (!list.length) return `<div class="list-meta">Nenhuma imagem de cardapio enviada ainda.</div>`;
  return list.map((url, index) => `
    <article class="image-tile">
      <img src="${escapeAttr(displayImageUrl(url))}" alt="Cardapio ${index + 1}" ${lazyImageAttrs()} ${imageFallbackAttr()}>
      <div>
        <button type="button" data-${prefix}-remove="${index}" class="danger-mini">Remover</button>
      </div>
    </article>
  `).join("");
}

function renderPromocoesMarkup(promocoes) {
  const list = normalizePromocoes(promocoes);
  if (!list.length) return `<div class="list-meta">Nenhuma promocao cadastrada ainda.</div>`;
  return list.map((promo, index) => `
    <article class="promo-admin-item">
      ${promo.imagem ? `<img src="${escapeAttr(displayImageUrl(promo.imagem))}" alt="${escapeAttr(promo.titulo)}" ${lazyImageAttrs()} ${imageFallbackAttr()}>` : `<div class="promo-admin-empty">sem imagem</div>`}
      <div>
        <strong>${escapeHtml(promo.titulo)}</strong>
        <span>${escapeHtml([promo.preco ? `R$ ${promo.preco}` : "", promo.validadeFim ? `ate ${promo.validadeFim}` : ""].filter(Boolean).join(" - ") || "Sem preco/validade")}</span>
        ${promo.obs ? `<small>${escapeHtml(promo.obs)}</small>` : ""}
      </div>
      <button type="button" data-promo-remove="${index}" class="danger-mini">Remover</button>
    </article>
  `).join("");
}

async function syncClientsFromScript(options = {}) {
  const { silent = false, source = null } = options;
  const button = $("syncClientsButton");
  if (!silent) setBusy(button, true, "Importando ausentes...");
  try {
    await loadAllData();
    const { categories, statusMap } = source || await getScriptImportSource();
    const categoryPayloads = [];
    const clientPayloads = [];
    const importStats = {
      categorias: 0,
      clientes: 0,
      clientesSalvos: 0,
      clientesExistentes: 0,
      categoriasExistentes: 0,
      categoriasSalvas: 0,
      erros: []
    };

    categories.forEach((category) => {
      const categoryName = category.title || "Outros";
      const categoryId = slugify(categoryName);
      const existingCategory = state.categorias.find((cat) => cat.id === categoryId) || {};
      importStats.categorias += 1;
      if (existingCategory.id) {
        importStats.categoriasExistentes += 1;
      } else {
      categoryPayloads.push({
        id: categoryId,
        data: cleanForFirebase({
        nome: categoryName,
        nomeNormalizado: normalizeName(categoryName),
        parentId: "",
        icon: "fa-solid fa-store",
        iconColor: "#2563eb",
        status: "ativo",
        ordem: importStats.categorias,
        origem: "script.js",
        updatedAt: serverTimestamp(),
        updatedBy: state.user.uid
        })
      });
      }

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
          ...(est.horarios ? { horarios: est.horarios } : {}),
          instagram: est.instagram || "",
          facebook: est.facebook || "",
          imagem: est.image || "",
          imagens: importedImages,
          cardapioLink: est.cardapioLink || "",
          infoAdicional: est.infoAdicional || "",
          aliases: buildClientPublicAliases(id, {
            nome: name,
            nomeNormalizado: normalizeName(name),
            categoria: categoryName,
            categoriaId: categoryId
          }, null, false),
          origem: "script.js",
          updatedAt: serverTimestamp(),
          updatedBy: state.user.uid
          })
        });
      });
    });

    showImportReport([
      `Encontrados: ${importStats.clientes} clientes e ${importStats.categorias} categorias.`,
      "Gravando no Firebase apenas clientes que ainda nao existem. Existentes serao preservados."
    ]);

    const chunkSize = 25;
    for (let i = 0; i < clientPayloads.length; i += chunkSize) {
      const chunk = clientPayloads.slice(i, i + chunkSize);
      await Promise.all(chunk.map(async (item) => {
        try {
          await set(ref(db, `clientes/${item.id}`), item.data);
          importStats.clientesSalvos += 1;
        } catch (err) {
          importStats.erros.push(`Cliente ${item.data.nome || item.id}: ${err.code || err.message}`);
        }
      }));
      const persistedSnap = await get(ref(db, "clientes"));
      const persistedCount = persistedSnap.exists() ? persistedSnap.numChildren() : 0;
      if ((i + chunk.length) % 25 === 0 || i + chunk.length === clientPayloads.length) {
        showImportReport([
          `Clientes novos salvos: ${importStats.clientesSalvos}/${importStats.clientes}`,
          `Existentes preservados: ${importStats.clientesExistentes}`,
          `Clientes confirmados no Firebase: ${persistedCount}`,
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

    const persistedFinalSnap = await get(ref(db, "clientes"));
    applyClientsSnapshot(persistedFinalSnap);
    renderStats();
    renderClientsList();
    renderFinanceiro();
    renderReports();
    fillClientCategorySelect();
    fillUserClientSelect();
    fillEventClientSelect();
    const persistedFinalCount = state.lastFirebaseClientCount;

    const report = [
      `Importacao segura concluida.`,
      `Clientes novos salvos: ${importStats.clientesSalvos}/${importStats.clientes}`,
      `Clientes existentes preservados: ${importStats.clientesExistentes}`,
      `Clientes confirmados no Firebase: ${persistedFinalCount}`,
      `Categorias novas salvas: ${importStats.categoriasSalvas}/${importStats.categorias}`,
      `Categorias existentes preservadas: ${importStats.categoriasExistentes}`,
      `Clientes visiveis no painel: ${state.lastVisibleClientCount}`
    ];
    if (importStats.erros.length) {
      report.push(`Erros: ${importStats.erros.length}`);
      report.push(...importStats.erros.slice(0, 5));
    }
    showImportReport(report, importStats.erros.length ? "error" : "ok");
    showToast(`Importacao segura: ${importStats.clientesSalvos} clientes ausentes salvos.`);
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

function renderClientInvoices() {
  const mount = $("clientInvoicesMount");
  if (!mount) return;
  const client = state.clientes.find((item) => item.id === state.profile?.clienteId);
  if (!client) {
    mount.innerHTML = `<p>Nenhum cliente vinculado a este usuario. Fale com o administrador.</p>`;
    return;
  }

  const paymentConfig = state.pagamentoSistema || {};
  const meses = pendingMonthsForClient(client);
  const faturas = meses.map((mes) => {
    const saved = client.faturas?.[mes] || {};
    const valorPlano = Number(saved.valorPlano ?? valorFinalPlano(client));
    const valorDestaque = Number(saved.valorDestaque ?? (client.destaqueSemanal ? Number(client.destaqueValor || 0) : 0));
    const valorTotal = Number(saved.valorTotal ?? (valorPlano + valorDestaque));
    const txid = `OC${normalizeName(client.nome || client.id).slice(0, 8).toUpperCase()}${mes.replace("-", "")}`;
    const pixCode = gerarPixCopiaCola({
      chave: paymentConfig.pixChave,
      nome: paymentConfig.pixNome || "Ola Carlopolis",
      cidade: paymentConfig.pixCidade || "CARLOPOLIS",
      valor: valorTotal,
      txid
    });
    return {
      mes,
      saved,
      valorPlano,
      valorDestaque,
      valorTotal,
      pixCode,
      qrUrl: pixCode ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(pixCode)}` : ""
    };
  });

  if (!faturas.length) {
    mount.innerHTML = `<div class="list-meta">Nenhuma fatura em aberto para este cliente.</div>`;
    return;
  }

  mount.innerHTML = `
    <div class="invoice-list">
    ${faturas.map((fatura) => `
      <article class="invoice-card" data-invoice-month="${escapeAttr(fatura.mes)}">
        <div class="section-head compact">
          <div>
            <h3>Fatura ${escapeHtml(monthLabel(fatura.mes))}</h3>
            <p>${escapeHtml(client.nome || "")}</p>
          </div>
          <span class="badge ${escapeAttr(fatura.saved.status || client.pagamentoStatus || "em_aberto")}">${paymentLabel(fatura.saved.status || client.pagamentoStatus || "em_aberto")}</span>
        </div>
        <div class="stats-grid">
          <article class="stat-card"><span>Plano</span><strong>${moneyBR(fatura.valorPlano)}</strong></article>
          <article class="stat-card"><span>Destaque</span><strong>${moneyBR(fatura.valorDestaque)}</strong></article>
          <article class="stat-card"><span>Total</span><strong>${moneyBR(fatura.valorTotal)}</strong></article>
        </div>
        ${fatura.pixCode ? `
        <div class="pix-box">
          <img src="${escapeAttr(fatura.qrUrl)}" alt="QR Code Pix" loading="lazy" decoding="async">
          <label class="wide">Codigo Pix copia e cola<textarea data-invoice-pix-code rows="5" readonly>${escapeHtml(fatura.pixCode)}</textarea></label>
          <div class="form-actions">
            <button data-copy-invoice-pix="${escapeAttr(fatura.mes)}" type="button" class="ghost-button"><i class="fa-solid fa-copy"></i> Copiar codigo Pix</button>
            <button data-copy-invoice-key type="button" class="ghost-button"><i class="fa-solid fa-key"></i> Copiar chave Pix</button>
          </div>
          ${paymentConfig.observacaoFatura ? `<div class="list-meta wide">${escapeHtml(paymentConfig.observacaoFatura)}</div>` : ""}
        </div>
      ` : `<div class="list-meta">A chave Pix ainda nao foi configurada pelo admin master.</div>`}
      <div class="upload-panel">
        <h3>Comprovante</h3>
        <input data-invoice-receipt="${escapeAttr(fatura.mes)}" type="file" accept="image/*,application/pdf">
        ${fatura.saved.comprovanteUrl ? `<a class="ghost-button" href="${escapeAttr(fatura.saved.comprovanteUrl)}" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-paperclip"></i> Ver comprovante enviado</a>` : `<div class="list-meta">Nenhum comprovante anexado.</div>`}
      </div>
    </article>`).join("")}
    </div>
  `;

  mount.querySelectorAll("[data-copy-invoice-pix]").forEach((button) => button.addEventListener("click", async () => {
    const card = button.closest("[data-invoice-month]");
    await navigator.clipboard?.writeText(card?.querySelector("[data-invoice-pix-code]")?.value || "");
    showToast("Codigo Pix copiado.");
  }));
  mount.querySelectorAll("[data-copy-invoice-key]").forEach((button) => button.addEventListener("click", async () => {
    await navigator.clipboard?.writeText(paymentConfig.pixChave || "");
    showToast("Chave Pix copiada.");
  }));
  mount.querySelectorAll("[data-invoice-receipt]").forEach((input) => input.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const mes = input.dataset.invoiceReceipt;
    const fatura = faturas.find((item) => item.mes === mes);
    if (!fatura) return;
    showToast("Enviando comprovante...");
    const comprovanteUrl = await uploadInvoiceReceiptForClient(client.id, file);
    const payload = {
      [`faturas/${mes}`]: {
        mes,
        valorPlano: fatura.valorPlano,
        valorDestaque: fatura.valorDestaque,
        valorTotal: fatura.valorTotal,
        pixChave: paymentConfig.pixChave || "",
        pixCodigo: fatura.pixCode,
        comprovanteUrl,
        status: "em_analise",
        updatedAt: Date.now()
      },
      updatedAt: serverTimestamp(),
      updatedBy: state.user.uid
    };
    await update(ref(db, `clientes/${client.id}`), payload);
    showToast("Comprovante anexado.");
    await loadAllData();
    renderClientInvoices();
  }));
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
    isento: "Isento",
    em_analise: "Em analise"
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
  $("newClientButton").addEventListener("click", () => {
    resetClientForm();
    setClientFocusMode(true);
  });
  $("closeClientFormButton").addEventListener("click", closeClientFormToDashboard);
  $("newCategoryButton").addEventListener("click", resetCategoryForm);
  $("syncClientsButton").addEventListener("click", syncClientsFromScript);
  $("migrateImagesButton").addEventListener("click", migrateClientImagesToStorage);
  $("analyzeDuplicatesButton").addEventListener("click", renderDuplicatesReport);
  $("cleanupDuplicatesButton").addEventListener("click", async () => {
    const plan = state.duplicateCleanupPlan || buildDuplicateCleanupPlan();
    if (!plan.removeIds.length) {
      showToast("Nenhum duplicado seguro para remover.");
      return;
    }
    if (!confirm(`Remover ${plan.removeIds.length} clientes duplicados seguros?`)) return;
    const updates = {};
    plan.removeIds.forEach((id) => {
      updates[`clientes/${id}`] = null;
    });
    await update(ref(db), updates);
    state.clientes = state.clientes.filter((client) => !plan.removeIds.includes(client.id));
    state.duplicateCleanupPlan = null;
    sortClientsInState();
    renderStats();
    renderClientsList();
    renderFinanceiro();
    fillUserClientSelect();
    fillEventClientSelect();
    renderDuplicatesReport();
    showToast("Duplicados seguros removidos.");
  });
  $("clientSearch").addEventListener("input", renderClientsList);
  $("clientImagesUpload").addEventListener("change", async (event) => {
    await uploadClientImages(event.target.files);
    event.target.value = "";
  });
  $("clientMenuUpload").addEventListener("change", async (event) => {
    await uploadClientMenuFiles(event.target.files);
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
  $("newInfoDeathNoticeButton")?.addEventListener("click", resetInfoDeathNoticeForm);
  $("infoDeathNoticeSearch")?.addEventListener("input", renderInfoDeathNoticeList);
  $("infoDeathNoticeImageUpload")?.addEventListener("change", async (event) => {
    await uploadInfoDeathNoticeImage(event.target.files?.[0]);
    event.target.value = "";
  });
  $("financeSearch").addEventListener("input", renderFinanceiro);
  $("financeFilter").addEventListener("change", renderFinanceiro);
  $("categorySearch").addEventListener("input", renderCategoriesList);
  $("paymentSettingsForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!isMaster()) {
      showToast("Somente master pode alterar os dados de pagamento.");
      return;
    }
    const payload = {
      pixChave: $("paymentPixKey").value.trim(),
      pixNome: $("paymentPixName").value.trim(),
      pixCidade: $("paymentPixCity").value.trim(),
      observacaoFatura: $("paymentInvoiceNote").value.trim(),
      updatedAt: serverTimestamp(),
      updatedBy: state.user?.uid || ""
    };
    await update(ref(db, "configuracoes/pagamento"), payload);
    state.pagamentoSistema = payload;
    showToast("Dados de pagamento salvos.");
    renderClientInvoices();
  });
  $("userForm").addEventListener("submit", createPanelUser);

  document.querySelectorAll(".nav-admin button").forEach((button) => {
    button.addEventListener("click", () => switchView(button.dataset.view));
  });

  $("clientForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!canManageClients()) return;
    const payload = getClientFormData();
    const formId = payload.id;
    const id = getCanonicalClientId(payload.categoria, payload.nome);
    const sourceClient = state.clientes.find((client) => client.id === state.selectedClientId || client.id === formId || client.id === id) || null;
    payload.aliases = buildClientPublicAliases(id, payload, sourceClient);
    addAliasKey(payload.aliases, formId);
    addAliasKey(payload.aliases, state.selectedClientId);
    delete payload.id;
    if (!state.selectedClientId) payload.createdAt = serverTimestamp();
    const updates = { [`clientes/${id}`]: payload };
    [formId, state.selectedClientId].filter((oldId) => oldId && oldId !== id).forEach((oldId) => {
      updates[`clientes/${oldId}`] = null;
      state.usuarios.filter((user) => user.clienteId === oldId).forEach((user) => {
        updates[`usuariosByUid/${user.uid}/clienteId`] = id;
      });
    });
    if (payload.categoria) {
      const categoryId = payload.categoriaId || slugify(payload.categoria);
      const existingCategory = state.categorias.find((cat) => cat.id === categoryId) || {};
      updates[`categorias/${categoryId}`] = {
        ...existingCategory,
        nome: payload.categoria,
        nomeNormalizado: normalizeName(payload.categoria),
        parentId: existingCategory.parentId || "",
        icon: existingCategory.icon || "fa-solid fa-store",
        iconColor: existingCategory.iconColor || "#2563eb",
        status: existingCategory.status || "ativo",
        ordem: existingCategory.ordem || 0,
        origem: existingCategory.origem || "painel",
        updatedAt: serverTimestamp(),
        updatedBy: state.user?.uid || ""
      };
    }
    await update(ref(db), updates);
    [formId, state.selectedClientId].filter((oldId) => oldId && oldId !== id).forEach((oldId) => {
      state.clientes = state.clientes.filter((client) => client.id !== oldId);
      state.usuarios.filter((user) => user.clienteId === oldId).forEach((user) => { user.clienteId = id; });
    });
    upsertClientInState(id, payload);
    if (payload.categoria) {
      const categoryId = payload.categoriaId || slugify(payload.categoria);
      const existingCategory = state.categorias.find((cat) => cat.id === categoryId);
      if (existingCategory) {
        existingCategory.nome = payload.categoria;
        existingCategory.nomeNormalizado = normalizeName(payload.categoria);
        existingCategory.origem = "painel";
      } else {
        state.categorias.push(normalizeCategory({ id: categoryId, nome: payload.categoria, origem: "painel" }));
      }
      state.categorias.sort((a, b) => String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR"));
    }
    sortClientsInState();
    renderStats();
    renderClientsList();
    renderCategoriesList();
    renderFinanceiro();
    renderReports();
    fillClientCategorySelect();
    fillUserClientSelect();
    fillEventClientSelect();
    showToast("Cliente salvo.");
    resetClientForm();
  });

  $("categoryForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!canManageClients()) return;
    const payload = getCategoryFormData();
    const id = payload.id;
    delete payload.id;
    await update(ref(db), { [`categorias/${id}`]: payload });
    const existing = state.categorias.findIndex((cat) => cat.id === id);
    const next = { id, ...payload };
    if (existing >= 0) state.categorias[existing] = next;
    else state.categorias.push(next);
    sortCategoriesInState();
    renderCategoriesList();
    fillClientCategorySelect();
    fillCategoryParentSelect();
    showToast("Categoria salva.");
    resetCategoryForm();
  });

  $("deleteCategoryButton").addEventListener("click", async () => {
    if (!state.selectedCategoryId || !confirm("Excluir esta categoria?")) return;
    const id = state.selectedCategoryId;
    const hasChildren = state.categorias.some((cat) => cat.parentId === id);
    if (hasChildren) {
      showToast("Remova ou altere as subcategorias antes de excluir.");
      return;
    }
    await remove(ref(db, `categorias/${id}`));
    state.categorias = state.categorias.filter((cat) => cat.id !== id);
    renderCategoriesList();
    fillClientCategorySelect();
    fillCategoryParentSelect();
    resetCategoryForm();
    showToast("Categoria excluida.");
  });

  $("deleteClientButton").addEventListener("click", async () => {
    if (!state.selectedClientId || !confirm("Excluir este cliente?")) return;
    await deleteClientById(state.selectedClientId);
    showToast("Cliente excluido.");
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

  $("infoDeathNoticeForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!canManageInformacoes()) return;
    const payload = getInfoDeathNoticeFormData();
    const id = payload.id;
    delete payload.id;
    if (!state.selectedDeathNoticeId) payload.createdAt = serverTimestamp();
    await update(ref(db, `conteudosInformativos/notaFalecimento/${id}`), payload);
    showToast("Nota de falecimento salva.");
    resetInfoDeathNoticeForm();
    await loadAllData();
  });

  $("deleteInfoDeathNoticeButton")?.addEventListener("click", async () => {
    if (!state.selectedDeathNoticeId || !confirm("Excluir esta nota de falecimento?")) return;
    await remove(ref(db, `conteudosInformativos/notaFalecimento/${state.selectedDeathNoticeId}`));
    showToast("Nota de falecimento excluida.");
    resetInfoDeathNoticeForm();
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
  switchView(canManageClients() ? "dashboard" : (canManageInformacoes() ? "informacoes" : "minhaEmpresa"));
});
