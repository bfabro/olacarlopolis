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
  numero: 137,
  label: "v137",
  data: "2026-05-22",
  nota: "Ajusta vitrine publica de promocoes e campo de desconto."
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
  imoveis: [],
  automoveis: [],
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
  selectedImovelId: null,
  selectedAutomovelId: null,
  selectedDeathNoticeId: null,
  selectedCategoryId: null,
  duplicateCleanupPlan: null,
  clientImages: [],
  clientMenuImages: [],
  clientPromocoes: [],
  clientPromoEditIndex: null,
  imovelImages: [],
  automovelImages: [],
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
  imoveis: $("imoveisView"),
  automoveis: $("automoveisView"),
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
  imoveis: ["Imoveis", "Cadastre imoveis para venda ou aluguel no site publico."],
  automoveis: ["Automoveis", "Cadastre veiculos para venda no site publico."],
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

function currentClientId() {
  return state.profile?.clienteId || "";
}

function currentClientRecord() {
  const id = currentClientId();
  if (!id) return null;
  return state.clientes.find((client) => client.id === id) || null;
}

function itemBelongsToCurrentClient(item = {}) {
  if (canManageClients()) return true;
  const clientId = currentClientId();
  if (!clientId) return false;
  const client = currentClientRecord();
  const candidates = [
    item.clienteId,
    item.clientId,
    item.estabelecimentoId,
    item.clienteNome,
    item.vendedor,
    item.loja,
    item.corretor,
    ...(Array.isArray(item.corretores) ? item.corretores : []),
    item.proprietario
  ].filter(Boolean).map((value) => normalizeName(value));
  const ownKeys = [
    clientId,
    client?.id,
    client?.nome,
    client?.nomeNormalizado
  ].filter(Boolean).map((value) => normalizeName(value));
  return ownKeys.some((key) => candidates.some((candidate) => candidate === key || candidate.includes(key) || key.includes(candidate)));
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
  if (viewName === "imoveis") return hasPermission("imoveis");
  if (viewName === "automoveis") return hasPermission("veiculos");
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
    .toUpperCase()
    .slice(0, maxLength);
}

function normalizePixKey(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  const digits = text.replace(/\D/g, "");
  if (/^\d{11}$/.test(digits) || /^\d{14}$/.test(digits)) return digits;
  const compact = text.replace(/\s/g, "");
  if (/^\+?\d{10,15}$/.test(compact)) {
    const phone = compact.replace(/[^\d+]/g, "");
    return phone.startsWith("+") ? phone : `+55${digits}`;
  }
  return text;
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

function qrCodeUrl(text, provider = "qrserver") {
  const encoded = encodeURIComponent(text || "");
  if (!encoded) return "";
  if (provider === "quickchart") return `https://quickchart.io/qr?size=220&text=${encoded}`;
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encoded}`;
}

function gerarPixCopiaCola({ chave, nome, cidade, valor, txid }) {
  const pixKey = normalizePixKey(chave);
  if (!pixKey) return "";
  const merchantName = textPix(nome || "OLA CARLOPOLIS", 25) || "OLA CARLOPOLIS";
  const merchantCity = textPix(cidade || "CARLOPOLIS", 15) || "CARLOPOLIS";
  const amountValue = Number(valor || 0);
  const amount = amountValue.toFixed(2);
  const merchantAccount = pixField("00", "br.gov.bcb.pix") + pixField("01", pixKey);
  const additionalData = pixField("05", textPix(txid || "FATURA", 25) || "FATURA");
  const payloadSemCrc = [
    pixField("00", "01"),
    pixField("01", "12"),
    pixField("26", merchantAccount),
    pixField("52", "0000"),
    pixField("53", "986"),
    amountValue > 0 ? pixField("54", amount) : "",
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
      desconto: String(item?.desconto || item?.discount || "").trim(),
      precoAntigo: String(item?.precoAntigo || "").trim(),
      unidade: String(item?.unidade || "").trim(),
      imagem: String(item?.imagem || item?.image || "").trim(),
      validadeInicio: String(item?.validadeInicio || "").trim(),
      validadeFim: String(item?.validadeFim || item?.validade || "").trim(),
      diasSemana: normalizePromoWeekDays(item?.diasSemana || item?.dias || item?.recorrenciaDias || item?.diaSemana),
      obs: String(item?.obs || item?.descricao || "").trim(),
      ativo: item?.ativo === false ? false : true
    }))
    .filter((item) => item.titulo)
    .slice(0, 30);
}

const PROMO_WEEK_DAYS = [
  { value: 0, label: "Domingo", short: "Dom" },
  { value: 1, label: "Segunda", short: "Seg" },
  { value: 2, label: "Terca", short: "Ter" },
  { value: 3, label: "Quarta", short: "Qua" },
  { value: 4, label: "Quinta", short: "Qui" },
  { value: 5, label: "Sexta", short: "Sex" },
  { value: 6, label: "Sabado", short: "Sab" }
];

function normalizePromoWeekDays(value) {
  const values = Array.isArray(value) ? value : (value === undefined || value === null || value === "" ? [] : [value]);
  return [...new Set(values
    .map((item) => Number(item))
    .filter((item) => Number.isInteger(item) && item >= 0 && item <= 6))]
    .sort((a, b) => a - b);
}

function promoWeekDaysLabel(days) {
  const normalized = normalizePromoWeekDays(days);
  if (!normalized.length) return "Todos os dias";
  return normalized
    .map((day) => PROMO_WEEK_DAYS.find((item) => item.value === day)?.short || "")
    .filter(Boolean)
    .join(", ");
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
    menuLetter: String(cat.menuLetter || cat.letraMenu || "").toUpperCase().slice(0, 1),
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

function eventRawDate(evento = {}) {
  return evento.data || evento.date || evento.dataEvento || evento.eventDate || "";
}

function normalizeEventDate(value) {
  const text = String(value || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const br = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (br) return `${br[3]}-${String(br[2]).padStart(2, "0")}-${String(br[1]).padStart(2, "0")}`;
  return "";
}

function displayEventDate(value) {
  const text = String(value || "").trim();
  if (!text) return "Sem data";
  const iso = normalizeEventDate(text);
  if (iso) {
    const [year, month, day] = iso.split("-");
    return `${day}/${month}/${year}`;
  }
  return text;
}

function eventSortDate(evento = {}) {
  return normalizeEventDate(eventRawDate(evento)) || "9999-12-31";
}

function eventIdentity(evento = {}) {
  return slugify(evento.titulo || evento.nome || evento.name || evento.id || "");
}

function eventVisible(evento = {}) {
  const status = String(evento.status || "ativo").toLowerCase();
  return !["excluido", "excluida", "removido", "removida"].includes(status);
}

const PUBLIC_EVENTS_FALLBACK = [
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
    address: "Campo da Acecar"
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
    infoAdicional: "Em Breve Mais informacoes"
  },
  {
    image: "images/informacoes/eventos/13.jpg",
    name: "Low City 043 Fest",
    date: "18/10/2026",
    address: "Ilha do Ponciano",
    instagram: "https://www.instagram.com/p/DTfq3ICka4e/",
    infoAdicional: "3a Edicao do Low City 043 Fest"
  },
  {
    image: "images/informacoes/eventos/2.jpg",
    name: "Tooronagashi",
    date: "24/10/2026",
    address: "Ilha do Ponciano"
  }
];

function normalizeScriptEvent(est, index = 0) {
  const title = est.name || est.nome || est.titulo || `Evento ${index + 1}`;
  const rawDate = eventRawDate(est);
  return cleanForFirebase({
    id: `evento-${slugify(title)}-${index + 1}`,
    titulo: title,
    clienteId: "",
    clienteNome: "",
    data: normalizeEventDate(rawDate),
    dataOriginal: rawDate,
    horario: est.horario || est.time || "",
    local: est.address || est.local || "",
    status: est.status || "ativo",
    imagem: est.image || est.imagem || "",
    descricao: est.infoAdicional || est.descricao || est.description || "",
    instagram: est.instagram || "",
    origem: "script.js"
  });
}

function normalizeScriptImovel(item = {}, index = 0) {
  const imagens = Array.isArray(item.imagens) ? item.imagens.filter(Boolean) : (item.imagem ? [item.imagem] : []);
  const corretor = item.corretor || (Array.isArray(item.corretores) ? item.corretores[0] : "") || "";
  return {
    ...item,
    id: item.id || `imovel-script-${index + 1}`,
    titulo: item.titulo || item.nome || `Imovel ${index + 1}`,
    tipo: item.tipo || "venda",
    procura: item.procura || item.tipoImovel || "casa",
    status: item.status || "ativo",
    codRef: item.codRef || item.codigo || item.id || `IM_${index + 1}`,
    imagem: item.imagem || imagens[0] || "",
    imagens,
    corretor,
    telefone: item.telefone || item.contato || item.whatsapp || "",
    clienteNome: item.clienteNome || corretor,
    estabelecimentoId: item.estabelecimentoId || normalizeName(corretor),
    origem: "script.js",
    origemBase: "script.js"
  };
}

function extractConstArrayFromCode(code, constName) {
  const marker = new RegExp(`const\\s+${constName}\\s*=\\s*\\[`, "m").exec(code);
  if (!marker) return "[]";
  const start = marker.index + marker[0].lastIndexOf("[");
  let depth = 0;
  let quote = "";
  let escaped = false;
  for (let i = start; i < code.length; i += 1) {
    const ch = code[i];
    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === quote) {
        quote = "";
      }
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      quote = ch;
      continue;
    }
    if (ch === "[") depth += 1;
    if (ch === "]") {
      depth -= 1;
      if (depth === 0) return code.slice(start, i + 1);
    }
  }
  return "[]";
}

async function loadScriptEventsForPanel() {
  try {
    const source = await getScriptImportSource();
    const eventsCategory = (source.categories || []).find((category) => {
      const title = category.title || "";
      return slugify(title) === "eventosemcarlopolis" || normalizeName(title).includes("eventos");
    });
    const fromScript = (eventsCategory?.establishments || [])
      .filter((item) => item?.name || item?.nome || item?.titulo)
      .map((item, index) => normalizeScriptEvent(item, index));
    const byKey = new Map();
    [...fromScript, ...PUBLIC_EVENTS_FALLBACK.map((item, index) => normalizeScriptEvent(item, index + 100))].forEach((event) => {
      byKey.set(eventIdentity(event), event);
    });
    return [...byKey.values()];
  } catch (error) {
    console.warn("Nao foi possivel carregar eventos base do script.js.", error);
    return PUBLIC_EVENTS_FALLBACK.map((item, index) => normalizeScriptEvent(item, index + 100));
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
      <article class="schedule-day ${open ? "" : "closed"}" data-day="${key}">
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
      input.closest(".schedule-day")?.classList.toggle("closed", !input.checked);
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
    horarios[day] = isOpen ? slots : [];
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
    imoveisSnap,
    automoveisSnap,
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
    get(ref(db, "conteudosInformativos/imoveis")),
    get(ref(db, "conteudosInformativos/automoveis")),
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
  const scriptImoveis = await loadScriptImoveisForPanel();
  const firebaseImoveis = [];
  if (imoveisSnap.exists()) {
    imoveisSnap.forEach((child) => {
      firebaseImoveis.push({ id: child.key, ...child.val(), origem: child.val()?.origem || "firebase" });
      return false;
    });
  }
  state.imoveis = mergeImoveisBaseComFirebase(scriptImoveis, firebaseImoveis);
  if (!canManageClients()) {
    state.imoveis = state.imoveis.filter(itemBelongsToCurrentClient);
  }
  state.imoveis.sort((a, b) => String(a.titulo || "").localeCompare(String(b.titulo || ""), "pt-BR"));
  state.automoveis = [];
  if (automoveisSnap.exists()) {
    automoveisSnap.forEach((child) => {
      state.automoveis.push({ id: child.key, ...child.val() });
      return false;
    });
  }
  if (!canManageClients()) {
    state.automoveis = state.automoveis.filter(itemBelongsToCurrentClient);
  }
  state.automoveis.sort((a, b) => String(a.marca || "").localeCompare(String(b.marca || ""), "pt-BR"));
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
  const eventosBase = await loadScriptEventsForPanel();
  const eventKeys = new Set(state.eventos.map((evento) => eventIdentity(evento)));
  const eventosBaseAusentes = {};
  eventosBase.forEach((evento) => {
    const key = eventIdentity(evento);
    if (!key || eventKeys.has(key)) return;
    state.eventos.push(evento);
    eventKeys.add(key);
    eventosBaseAusentes[`eventos/${evento.id}`] = {
      ...evento,
      importedAt: serverTimestamp(),
      importedBy: state.user?.uid || ""
    };
  });
  if (Object.keys(eventosBaseAusentes).length) {
    try {
      await update(ref(db), eventosBaseAusentes);
    } catch (error) {
      console.warn("Nao foi possivel salvar eventos base no Firebase.", error);
    }
  }
  state.eventos.sort((a, b) => eventSortDate(a).localeCompare(eventSortDate(b)));

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
  renderImoveisList();
  renderAutomoveisList();
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
  const imoveisBase = new Function(`return (${extractConstArrayFromCode(code, "IM_DADOS")});`)();
  const expectedClientIds = new Set();
  categories.forEach((category) => {
    const categoryName = category.title || "Outros";
    (category.establishments || []).forEach((est) => {
      const name = est.name || est.nome;
      if (name) expectedClientIds.add(getImportClientId(categoryName, name));
    });
  });
  const totalClients = expectedClientIds.size;

  return { categories, statusMap, totalClients, imoveisBase };
}

let autoImportRunning = false;

async function autoEnsureImportedClients() {
  return;
}

async function loadScriptImoveisForPanel() {
  try {
    const source = await getScriptImportSource();
    return (source.imoveisBase || []).map(normalizeScriptImovel);
  } catch (error) {
    console.warn("Nao foi possivel carregar imoveis base do script.js.", error);
    return [];
  }
}

function mergeImoveisBaseComFirebase(scriptImoveis, firebaseImoveis) {
  const map = new Map();
  (scriptImoveis || []).forEach((item) => {
    map.set(String(item.id), item);
  });
  (firebaseImoveis || []).forEach((item) => {
    map.set(String(item.id), {
      ...(map.get(String(item.id)) || {}),
      ...item,
      origemBase: map.has(String(item.id)) ? "script.js" : (item.origemBase || item.origem || "firebase")
    });
  });
  return [...map.values()];
}

function renderStats() {
  $("statClientes").textContent = String(state.clientes.length);
  $("statUsuarios").textContent = String(state.usuarios.length);
  $("statAtivos").textContent = String(state.clientes.filter((c) => c.status === "ativo").length);
  $("statPendentes").textContent = String(state.clientes.filter((c) => c.status === "pendente").length);
  $("statEventos").textContent = String(state.eventos.filter(eventVisible).length);
}

function updateChrome() {
  $("profileEmail").textContent = state.user?.email || "-";
  $("profileRole").textContent = roleLabel(state.profile?.role);
  if ($("sidebarLoggedUser")) {
    const email = state.user?.email || state.profile?.email || "-";
    $("sidebarLoggedUser").textContent = `Logado: ${email}`;
  }

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
  document.querySelectorAll("[data-permission='imoveis']").forEach((el) => {
    el.classList.toggle("hidden", !hasPermission("imoveis"));
  });
  document.querySelectorAll("[data-permission='veiculos']").forEach((el) => {
    el.classList.toggle("hidden", !hasPermission("veiculos"));
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
  collapseEntryFormsForView(target);

  if (target === "minhaEmpresa") renderClientOnlyEditor();
  if (target === "faturas") renderClientInvoices();
  if (target === "pagamentoSistema") renderPaymentSettings();
  if (target === "relatorios") renderReports();
  if (target === "imoveis") renderImoveisList();
  if (target === "automoveis") renderAutomoveisList();
  if (target === "informacoes" && !canManageInformacoes()) {
    switchView(canManageClients() ? "dashboard" : "minhaEmpresa");
    return;
  }
  if (target !== "clientes") setClientFocusMode(false);
}

function collapseEntryFormsForView(target) {
  const formsByView = {
    clientes: ["clientForm"],
    categorias: ["categoryForm"],
    eventos: ["eventForm"],
    informacoes: ["infoDeathNoticeForm"],
    imoveis: ["imovelForm"],
    automoveis: ["automovelForm"],
    usuarios: ["userForm"]
  };
  (formsByView[target] || []).forEach((formId) => {
    if (formId === "clientForm") setClientFocusMode(false);
    else setFormCardOpen(formId, false);
  });
}

function setClientFocusMode(enabled) {
  const view = $("clientesView");
  const closeButton = $("closeClientFormButton");
  if (!view) return;
  view.classList.toggle("client-focus-mode", Boolean(enabled));
  closeButton?.classList.toggle("hidden", !enabled);
  setFormCardOpen("clientForm", enabled);
}

function closeClientFormToDashboard() {
  resetClientForm();
  setClientFocusMode(false);
}

function setFormCardOpen(formId, isOpen) {
  const form = $(formId);
  const card = form?.closest(".panel-card");
  const closeButtonMap = {
    categoryForm: "closeCategoryFormButton",
    eventForm: "closeEventFormButton",
    infoDeathNoticeForm: "closeInfoDeathNoticeFormButton",
    imovelForm: "closeImovelFormButton",
    automovelForm: "closeAutomovelFormButton",
    userForm: "closeUserFormButton"
  };
  card?.classList.toggle("form-collapsed", !isOpen);
  if (closeButtonMap[formId]) {
    $(closeButtonMap[formId])?.classList.toggle("hidden", !isOpen);
  }
}

function openFormForEdit(formId) {
  setFormCardOpen(formId, true);
  const form = $(formId);
  if (form && window.matchMedia("(max-width: 980px)").matches) {
    form.closest(".panel-card")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function resetClientForm() {
  state.selectedClientId = null;
  state.clientImages = [];
  state.clientMenuImages = [];
  state.clientPromocoes = [];
  state.clientPromoEditIndex = null;
  $("clientForm").reset();
  delete $("clientForm").dataset.originalCategory;
  delete $("clientForm").dataset.originalClientId;
  delete $("clientForm").dataset.originalName;
  $("clientId").value = "";
  if ($("clientType")) $("clientType").value = "comercio";
  if ($("clientMenuEnabled")) $("clientMenuEnabled").checked = false;
  fillClientCategorySelect();
  $("deleteClientButton").classList.add("hidden");
  renderProfilePreview("clientImage", "clientProfilePreview");
  renderScheduleEditor("clientScheduleEditor", emptySchedule());
  renderClientImagesPreview();
  renderClientMenuPreview();
  renderClientPromocoesPreview();
  setClientFocusMode(false);
}

function getClientFormData() {
  const name = $("clientName").value.trim();
  const id = $("clientId").value || slugify(name);
  const newCategory = $("clientNewCategory").value.trim();
  const currentClient = state.clientes.find((client) => client.id === state.selectedClientId);
  const category = newCategory || $("clientCategory").value.trim() || currentClient?.categoria || currentClient?.category || $("clientForm").dataset.originalCategory || "Outros";
  const tipoCliente = $("clientType")?.value || currentClient?.tipoCliente || currentClient?.tipo || "comercio";
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
    tipoCliente,
    tipo: tipoCliente,
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
    cardapioAtivo: Boolean($("clientMenuEnabled")?.checked),
    cardapioLink: $("clientMenuLink").value.trim(),
    menuImages: normalizeUrlList(state.clientMenuImages),
    promocoes: normalizePromocoes(state.clientPromocoes),
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
  if ($("clientType")) $("clientType").value = client.tipoCliente || client.tipo || "comercio";
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
  if ($("clientMenuEnabled")) $("clientMenuEnabled").checked = Boolean(client.cardapioAtivo || client.menuAtivo || client.exibirCardapio);
  $("clientMenuLink").value = client.cardapioLink || "";
  state.clientMenuImages = normalizeUrlList(client.menuImages);
  state.clientPromocoes = normalizePromocoes(client.promocoes);
  $("clientInfo").value = client.infoAdicional || "";
  $("clientAdminNote").value = client.observacaoAdmin || "";
  $("deleteClientButton").classList.remove("hidden");
  renderClientImagesPreview();
  renderClientMenuPreview();
  renderClientPromocoesPreview();
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

function clearClientPromoFields() {
  ["clientPromoTitle", "clientPromoPrice", "clientPromoDiscount", "clientPromoOldPrice", "clientPromoUnit", "clientPromoVolume", "clientPromoPack", "clientPromoStart", "clientPromoEnd", "clientPromoObs", "clientPromoImageUrl"].forEach((id) => {
    if ($(id)) $(id).value = "";
  });
  if ($("clientPromoImageUpload")) $("clientPromoImageUpload").value = "";
  document.querySelectorAll("input[name='clientPromoWeekday']").forEach((input) => { input.checked = false; });
  if ($("addClientPromoButton")) $("addClientPromoButton").innerHTML = `<i class="fa-solid fa-plus"></i> Adicionar promocao`;
  $("cancelClientPromoEditButton")?.classList.add("hidden");
}

function clearPromoFields(prefix, scope = document) {
  ["Title", "Price", "Discount", "OldPrice", "Unit", "Volume", "Pack", "Start", "End", "Obs", "ImageUrl"].forEach((suffix) => {
    const field = scope.querySelector(`#${prefix}Promo${suffix}`);
    if (field) field.value = "";
  });
  const upload = scope.querySelector(`#${prefix}PromoImageUpload`);
  if (upload) upload.value = "";
  scope.querySelectorAll(`input[name='${prefix}PromoWeekday']`).forEach((input) => { input.checked = false; });
}

function fillPromoFields(prefix, promo, scope = document) {
  const set = (suffix, value) => {
    const field = scope.querySelector(`#${prefix}Promo${suffix}`);
    if (field) field.value = value || "";
  };
  set("Title", promo.titulo);
  set("Price", promo.preco);
  set("Discount", promo.desconto);
  set("OldPrice", promo.precoAntigo);
  set("Unit", promo.unidade);
  set("Volume", promo.volume);
  set("Pack", promo.embalagem);
  set("Start", promo.validadeInicio);
  set("End", promo.validadeFim);
  set("Obs", promo.obs);
  set("ImageUrl", promo.imagem);
  const days = new Set(normalizePromoWeekDays(promo.diasSemana).map(String));
  scope.querySelectorAll(`input[name='${prefix}PromoWeekday']`).forEach((input) => {
    input.checked = days.has(String(input.value));
  });
}

function readPromoFields(prefix, scope = document, fallbackId = "") {
  const get = (suffix) => scope.querySelector(`#${prefix}Promo${suffix}`)?.value.trim() || "";
  return {
    id: fallbackId || `promo-${Date.now()}`,
    titulo: get("Title"),
    preco: get("Price"),
    desconto: get("Discount"),
    precoAntigo: get("OldPrice"),
    unidade: get("Unit"),
    volume: get("Volume"),
    embalagem: get("Pack"),
    validadeInicio: scope.querySelector(`#${prefix}PromoStart`)?.value || "",
    validadeFim: scope.querySelector(`#${prefix}PromoEnd`)?.value || "",
    diasSemana: Array.from(scope.querySelectorAll(`input[name='${prefix}PromoWeekday']:checked`)).map((input) => Number(input.value)),
    obs: get("Obs"),
    imagem: get("ImageUrl"),
    ativo: true
  };
}

function renderClientPromocoesPreview() {
  const box = $("clientPromosPreview");
  const count = $("clientPromosCount");
  const weekBox = $("clientPromoWeekdays");
  if (weekBox && !weekBox.dataset.rendered) {
    weekBox.innerHTML = PROMO_WEEK_DAYS.map((day) => `<label><input type="checkbox" name="clientPromoWeekday" value="${day.value}"> ${day.label}</label>`).join("");
    weekBox.dataset.rendered = "true";
  }
  if (!box || !count) return;
  state.clientPromocoes = normalizePromocoes(state.clientPromocoes);
  count.textContent = `${state.clientPromocoes.length} ativa${state.clientPromocoes.length === 1 ? "" : "s"}`;
  box.innerHTML = renderPromocoesMarkup(state.clientPromocoes, "client-promo-remove", "client-promo-edit");
  box.querySelectorAll("[data-client-promo-edit]").forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.clientPromoEdit);
      const promo = state.clientPromocoes[index];
      if (!promo) return;
      state.clientPromoEditIndex = index;
      fillPromoFields("client", promo);
      $("addClientPromoButton").innerHTML = `<i class="fa-solid fa-floppy-disk"></i> Salvar alteracoes`;
      $("cancelClientPromoEditButton")?.classList.remove("hidden");
      $("clientPromoTitle")?.focus();
    });
  });
  box.querySelectorAll("[data-client-promo-remove]").forEach((button) => {
    button.addEventListener("click", () => {
      state.clientPromocoes.splice(Number(button.dataset.clientPromoRemove), 1);
      state.clientPromoEditIndex = null;
      clearClientPromoFields();
      renderClientPromocoesPreview();
      showToast("Promocao removida. Clique em salvar cliente para gravar.");
    });
  });
}

async function addClientPromocao() {
  const title = $("clientPromoTitle")?.value.trim();
  if (!title) {
    showToast("Informe o titulo da promocao.");
    return;
  }
  const currentId = $("clientId")?.value || slugify($("clientName")?.value.trim()) || `cliente-${Date.now()}`;
  let image = $("clientPromoImageUrl")?.value.trim() || "";
  const file = $("clientPromoImageUpload")?.files?.[0];
  if (file && !image) {
    showToast("Enviando imagem da promocao...");
    image = await uploadPromoImageForClient(currentId, file);
  }
  const editingIndex = Number.isInteger(state.clientPromoEditIndex) ? state.clientPromoEditIndex : -1;
  const current = editingIndex >= 0 ? state.clientPromocoes[editingIndex] : null;
  const payload = readPromoFields("client", document, current?.id || `promo-${Date.now()}`);
  payload.imagem = image;
  if (editingIndex >= 0 && current) state.clientPromocoes[editingIndex] = payload;
  else state.clientPromocoes.unshift(payload);
  state.clientPromoEditIndex = null;
  clearClientPromoFields();
  $("addClientPromoButton").innerHTML = `<i class="fa-solid fa-plus"></i> Adicionar promocao`;
  $("cancelClientPromoEditButton")?.classList.add("hidden");
  renderClientPromocoesPreview();
  showToast(`${editingIndex >= 0 ? "Promocao atualizada" : "Promocao adicionada"}. Clique em salvar cliente para gravar.`);
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
    cardapioAtivo: Boolean($("clientMenuEnabled")?.checked || clientData.cardapioAtivo),
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

async function uploadSelectedPromoImage(inputId, targetInputId, clientId) {
  const input = $(inputId);
  const target = $(targetInputId);
  const file = input?.files?.[0];
  if (!file || !target) return "";
  const id = clientId || slugify($("clientName")?.value.trim()) || $("clientId")?.value || `cliente-${Date.now()}`;
  try {
    setBusy(input, true);
    showToast("Enviando imagem da promocao...");
    const url = await uploadPromoImageForClient(id, file);
    target.value = url;
    showToast("Imagem da promocao enviada.");
    return url;
  } catch (error) {
    console.error(error);
    showToast("Nao foi possivel enviar a imagem da promocao.");
    return "";
  } finally {
    setBusy(input, false);
  }
}

async function uploadAutomovelImages(id, files) {
  const urls = [];
  for (const file of Array.from(files || [])) {
    const path = `conteudosInformativos/automoveis/${id}/${Date.now()}-${slugify(file.name || "automovel")}`;
    const fileRef = storageRef(storage, path);
    urls.push(await uploadFileWithProgress(fileRef, file, "Enviando fotos do automovel", `${file.name || "imagem"} (${urls.length + 1}/${Array.from(files || []).length})`));
  }
  return urls;
}

async function uploadImovelImages(id, files) {
  const urls = [];
  for (const file of Array.from(files || [])) {
    const path = `conteudosInformativos/imoveis/${id}/${Date.now()}-${slugify(file.name || "imovel")}`;
    const fileRef = storageRef(storage, path);
    urls.push(await uploadFileWithProgress(fileRef, file, "Enviando fotos do imovel", `${file.name || "imagem"} (${urls.length + 1}/${Array.from(files || []).length})`));
  }
  return urls;
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
  $("categoryMenuLetter").value = "";
  $("categoryStatus").value = "ativo";
  $("deleteCategoryButton").classList.add("hidden");
  fillCategoryParentSelect();
  setFormCardOpen("categoryForm", false);
}

function getCategoryFormData() {
  const name = $("categoryName").value.trim();
  const id = $("categoryId").value || slugify(name);
  return normalizeCategory({
    id,
    nome: name,
    nomeNormalizado: normalizeName(name),
    parentId: $("categoryParent").value,
    menuLetter: $("categoryMenuLetter").value,
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
  $("categoryMenuLetter").value = category.menuLetter || "";
  $("categoryStatus").value = category.status || "ativo";
  $("categoryOrder").value = category.ordem || "";
  $("categoryNote").value = category.observacaoAdmin || "";
  fillCategoryParentSelect(category.parentId || "");
  $("deleteCategoryButton").classList.remove("hidden");
  openFormForEdit("categoryForm");
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
        <div class="list-meta">${escapeHtml(cat.icon || "fa-solid fa-store")} - Letra ${escapeHtml(cat.menuLetter || "automatica")}</div>
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
        <div class="list-meta">Permissoes: ${Object.entries(user.permissoes || {}).filter(([, value]) => value).map(([key]) => escapeHtml(key)).join(", ") || "nenhuma"}</div>
        <span class="badge ${escapeAttr(user.status || "ativo")}">${statusLabel(user.status)}</span>
        <button type="button" data-edit-user="${escapeAttr(user.uid)}">Editar</button>
      </article>
    `;
  }).join("");
  box.querySelectorAll("[data-edit-user]").forEach((button) => {
    button.addEventListener("click", () => {
      const user = state.usuarios.find((item) => item.uid === button.dataset.editUser);
      if (user) fillUserForm(user);
    });
  });
}

function resetUserForm() {
  $("userForm")?.reset();
  $("editUserUid").value = "";
  $("newUserEmail").readOnly = false;
  $("newUserPassword").required = true;
  $("editUserStatus").value = "ativo";
  $("saveUserButton").innerHTML = `<i class="fa-solid fa-user-plus"></i> Criar usuario`;
  $("deleteUserButton")?.classList.add("hidden");
  document.querySelectorAll(".permissions-box input[type='checkbox']").forEach((input) => {
    input.checked = ["dados", "imagens", "cardapio", "promocoes", "faturas"].includes(input.value);
  });
  setFormCardOpen("userForm", false);
}

function fillUserForm(user) {
  $("editUserUid").value = user.uid || "";
  $("newUserEmail").value = user.email || "";
  $("newUserEmail").readOnly = true;
  $("newUserPassword").value = "";
  $("newUserPassword").required = false;
  $("newUserRole").value = user.role || "cliente";
  $("newUserClient").value = user.clienteId || "";
  $("editUserStatus").value = user.status || "ativo";
  document.querySelectorAll(".permissions-box input[type='checkbox']").forEach((input) => {
    input.checked = Boolean(user.permissoes?.[input.value]);
  });
  $("saveUserButton").innerHTML = `<i class="fa-solid fa-floppy-disk"></i> Salvar usuario`;
  $("deleteUserButton")?.classList.remove("hidden");
  openFormForEdit("userForm");
}

async function deletePanelUser() {
  const uid = $("editUserUid")?.value || "";
  const user = state.usuarios.find((item) => item.uid === uid);
  if (!uid || !user) {
    showToast("Selecione um usuario para excluir.");
    return;
  }
  if (uid === state.user?.uid) {
    showToast("Nao e possivel excluir o usuario logado.");
    return;
  }
  if (user.role === "master" && !isMaster()) {
    showToast("Somente master pode excluir outro master.");
    return;
  }
  const email = String(user.email || $("newUserEmail")?.value || "").toLowerCase();
  const ok = confirm(`Excluir o usuario ${email || uid}? Esta acao remove o acesso do painel.`);
  if (!ok) return;

  const button = $("deleteUserButton");
  setBusy(button, true, "Excluindo...");
  try {
    const updates = {
      [`usuariosByUid/${uid}`]: null
    };
    if (email) updates[`usuarios/${emailKey(email)}`] = null;
    await update(ref(db), updates);
    state.usuarios = state.usuarios.filter((item) => item.uid !== uid);
    resetUserForm();
    renderUsersList();
    renderStats();
    showToast("Usuario excluido.");
  } catch (error) {
    console.error(error);
    showToast(error.message || "Nao foi possivel excluir o usuario.");
  } finally {
    setBusy(button, false);
  }
}

function fillUserClientSelect(selectedId = "") {
  const select = $("newUserClient");
  if (!select) return;
  select.innerHTML = `<option value="">Sem vinculo</option>` + state.clientes.map((client) => (
    `<option value="${escapeAttr(client.id)}" ${client.id === selectedId ? "selected" : ""}>${escapeHtml(client.nome || client.id)}</option>`
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
  const config = state.pagamentoSistema || {};
  const defaults = {
    mensal: Number(config.valorPlanoMensal || config.planoMensalValor || 0),
    semestral: Number(config.valorPlanoSemestral || config.planoSemestralValor || 0),
    anual: Number(config.valorPlanoAnual || config.planoAnualValor || 0)
  };
  return defaults[tipoPlano || "mensal"] || 0;
}

function clientForInvoicePlan(client, tipoPlano) {
  return {
    ...client,
    tipoPlano: tipoPlano || client?.tipoPlano || "mensal",
    valorPlano: defaultPlanValue(tipoPlano || client?.tipoPlano || "mensal")
  };
}

function valorFinalPlano(client) {
  const valorCliente = Number(client.valorPlano ?? client.valorMensal ?? 0);
  const bruto = valorCliente > 0 ? valorCliente : defaultPlanValue(client.tipoPlano);
  const desconto = Number(client.descontoValor || 0);
  return Math.max(0, bruto - desconto);
}

function destaqueValueForClient(client) {
  const config = state.pagamentoSistema || {};
  const valorCliente = Number(client?.destaqueValor || 0);
  if (valorCliente > 0) return valorCliente;
  return Number(config.valorDestaqueSemanal || config.destaqueSemanalValor || 0);
}

function valorTotalFaturaCliente(client) {
  return valorFinalPlano(client) + (client?.destaqueSemanal ? destaqueValueForClient(client) : 0);
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

function monthKeyFromParts(year, monthIndex) {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
}

function financeMonthOptionsForClient(client) {
  const now = new Date();
  const startYear = now.getFullYear();
  const months = new Set();
  for (let month = 0; month <= now.getMonth(); month += 1) {
    months.add(monthKeyFromParts(startYear, month));
  }
  pendingMonthsForClient(client).forEach((month) => months.add(month));
  Object.keys(client?.faturas || {}).forEach((month) => {
    if (/^\d{4}-\d{2}$/.test(month)) months.add(month);
  });
  return [...months].sort();
}

function buildClientInvoice(client, mes, paymentConfig = {}, totalOverride = null, options = {}) {
  const saved = client.faturas?.[mes] || {};
  const savedPlano = options.ignoreSaved ? 0 : Number(saved.valorPlano || 0);
  const savedDestaque = options.ignoreSaved ? 0 : Number(saved.valorDestaque || 0);
  const savedTotal = options.ignoreSaved ? 0 : Number(saved.valorTotal || 0);
  const valorPlano = savedPlano > 0 ? savedPlano : valorFinalPlano(client);
  const valorDestaque = savedDestaque > 0 ? savedDestaque : (client.destaqueSemanal ? destaqueValueForClient(client) : 0);
  const valorTotal = Number(totalOverride ?? (savedTotal > 0 ? savedTotal : valorPlano + valorDestaque));
  const txid = `OC${normalizeName(client.nome || client.id).slice(0, 8).toUpperCase()}${String(mes).replace(/\W/g, "").slice(0, 12)}`;
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
    qrUrl: qrCodeUrl(pixCode)
  };
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
  setFormCardOpen("eventForm", false);
}

function fillEventForm(evento) {
  state.selectedEventId = evento.id;
  $("eventId").value = evento.id || "";
  $("eventTitle").value = evento.titulo || "";
  $("eventClient").value = evento.clienteId || "";
  $("eventDate").value = normalizeEventDate(eventRawDate(evento));
  $("eventTime").value = evento.horario || "";
  $("eventPlace").value = evento.local || "";
  $("eventStatus").value = evento.status || "ativo";
  $("eventImage").value = evento.imagem || "";
  $("eventDescription").value = evento.descricao || "";
  $("deleteEventButton").classList.remove("hidden");
  openFormForEdit("eventForm");
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
  const list = state.eventos.filter(eventVisible).filter((evento) => {
    const hay = `${evento.titulo || ""} ${evento.clienteNome || ""} ${evento.local || ""} ${displayEventDate(eventRawDate(evento))}`.toLowerCase();
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
      <div class="event-date-row"><i class="fa-solid fa-calendar-days"></i><strong>${escapeHtml(displayEventDate(eventRawDate(evento)))}</strong>${evento.horario ? `<span>${escapeHtml(evento.horario)}</span>` : ""}</div>
      <div class="list-meta">${escapeHtml(evento.clienteNome || "Sem cliente")} - ${escapeHtml(evento.origem === "script.js" ? "Base inicial" : "Firebase")}</div>
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

function resetAutomovelForm() {
  state.selectedAutomovelId = null;
  state.automovelImages = [];
  $("automovelForm")?.reset();
  if ($("automovelId")) $("automovelId").value = "";
  if ($("automovelStatus")) $("automovelStatus").value = "ativo";
  $("deleteAutomovelButton")?.classList.add("hidden");
  renderAutomovelImagesPreview();
  setFormCardOpen("automovelForm", false);
}

function fillAutomovelForm(item) {
  if (!itemBelongsToCurrentClient(item)) {
    showToast("Voce nao tem permissao para editar este automovel.");
    return;
  }
  state.selectedAutomovelId = item.id;
  state.automovelImages = Array.isArray(item.imagens) ? item.imagens : (item.imagem ? [item.imagem] : []);
  $("automovelId").value = item.id || "";
  $("automovelMarca").value = item.marca || "";
  $("automovelModelo").value = item.modelo || "";
  $("automovelAno").value = item.ano || "";
  $("automovelPreco").value = item.preco || "";
  $("automovelTipo").value = item.tipo || "";
  $("automovelCondicao").value = item.condicao || "";
  $("automovelKm").value = item.km || "";
  $("automovelStatus").value = item.status || "ativo";
  $("automovelContato").value = item.contato || "";
  $("automovelVendedor").value = item.vendedor || item.loja || "";
  $("automovelInstagram").value = item.instagram || "";
  $("automovelCombustivel").value = item.combustivel || "";
  $("automovelCambio").value = item.cambio || "";
  $("automovelCor").value = item.cor || "";
  $("automovelCidade").value = item.cidade || "";
  $("automovelOpcionais").value = item.opcionais || "";
  $("automovelDescricao").value = item.descricao || "";
  $("automovelImagem").value = item.imagem || state.automovelImages[0] || "";
  $("deleteAutomovelButton")?.classList.remove("hidden");
  renderAutomovelImagesPreview();
  openFormForEdit("automovelForm");
}

function getAutomovelFormData() {
  const marca = $("automovelMarca").value.trim();
  const modelo = $("automovelModelo").value.trim();
  const id = $("automovelId").value || `${slugify(`${marca}-${modelo}`)}-${Date.now()}`;
  const imagens = [...state.automovelImages].filter(Boolean);
  const imagem = $("automovelImagem")?.value.trim() || imagens[0] || "";
  const linkedClient = currentClientRecord();
  const vendedor = $("automovelVendedor").value.trim() || linkedClient?.nome || "";
  return {
    id,
    marca,
    modelo,
    ano: $("automovelAno").value.trim(),
    preco: $("automovelPreco").value.trim(),
    tipo: $("automovelTipo").value,
    condicao: $("automovelCondicao").value,
    km: $("automovelKm").value.trim(),
    status: $("automovelStatus").value,
    contato: $("automovelContato").value.trim() || linkedClient?.whatsapp || linkedClient?.contato || "",
    vendedor,
    loja: vendedor,
    clienteId: linkedClient?.id || state.profile?.clienteId || "",
    clienteNome: linkedClient?.nome || vendedor,
    estabelecimentoId: linkedClient?.nomeNormalizado || slugify(linkedClient?.nome || vendedor),
    instagram: $("automovelInstagram").value.trim() || linkedClient?.instagram || "",
    combustivel: $("automovelCombustivel").value.trim(),
    cambio: $("automovelCambio").value.trim(),
    cor: $("automovelCor").value.trim(),
    cidade: $("automovelCidade").value.trim() || linkedClient?.cidade || "",
    opcionais: $("automovelOpcionais").value.trim(),
    descricao: $("automovelDescricao").value.trim(),
    imagem,
    imagens,
    updatedAt: serverTimestamp(),
    updatedBy: state.user?.uid || ""
  };
}

function renderAutomovelImagesPreview() {
  const box = $("automovelImagesPreview");
  if (!box) return;
  $("automovelImagesCount").textContent = `${state.automovelImages.length} imagen${state.automovelImages.length === 1 ? "" : "s"}`;
  box.innerHTML = state.automovelImages.map((url, index) => `
    <article>
      <img src="${escapeAttr(displayImageUrl(url))}" alt="Foto ${index + 1}" ${lazyImageAttrs()} ${imageFallbackAttr()}>
      <button type="button" data-remove-auto-image="${index}">Remover</button>
    </article>
  `).join("") || `<div class="list-meta">Nenhuma foto adicionada.</div>`;
  box.querySelectorAll("[data-remove-auto-image]").forEach((button) => {
    button.addEventListener("click", () => {
      state.automovelImages.splice(Number(button.dataset.removeAutoImage), 1);
      if (!state.automovelImages.includes($("automovelImagem").value)) $("automovelImagem").value = state.automovelImages[0] || "";
      renderAutomovelImagesPreview();
    });
  });
}

function renderAutomoveisList() {
  const box = $("automoveisList");
  if (!box) return;
  const q = String($("automovelSearch")?.value || "").toLowerCase().trim();
  const list = state.automoveis.filter(itemBelongsToCurrentClient).filter((item) => {
    const hay = `${item.tipo || ""} ${item.marca || ""} ${item.modelo || ""} ${item.ano || ""} ${item.preco || ""} ${item.vendedor || ""} ${item.loja || ""}`.toLowerCase();
    return !q || hay.includes(q);
  });
  if (!list.length) {
    box.innerHTML = `<div class="list-meta">Nenhum automovel cadastrado.</div>`;
    return;
  }
  box.innerHTML = list.map((item) => {
    const titulo = [item.marca, item.modelo].filter(Boolean).join(" ") || item.id;
    return `
      <article class="list-card event-card">
        ${item.imagem ? `<img src="${escapeAttr(displayImageUrl(item.imagem))}" alt="${escapeAttr(titulo)}" ${lazyImageAttrs()} ${imageFallbackAttr()}>` : ""}
        <div class="list-title">${escapeHtml(titulo)}</div>
        <div class="list-meta">${escapeHtml([item.tipo, item.condicao, item.ano, item.preco].filter(Boolean).join(" - ") || "Sem valor")}</div>
        <div class="list-meta">${escapeHtml([item.vendedor || item.loja, item.contato].filter(Boolean).join(" - ") || "Sem contato")}</div>
        <span class="badge ${escapeAttr(item.status || "ativo")}">${statusLabel(item.status || "ativo")}</span>
        <button type="button" data-edit-automovel="${escapeAttr(item.id)}">Editar</button>
      </article>
    `;
  }).join("");
  box.querySelectorAll("[data-edit-automovel]").forEach((button) => {
    button.addEventListener("click", () => {
      const item = state.automoveis.find((auto) => auto.id === button.dataset.editAutomovel && itemBelongsToCurrentClient(auto));
      if (item) fillAutomovelForm(item);
    });
  });
}

function resetImovelForm() {
  state.selectedImovelId = null;
  state.imovelImages = [];
  $("imovelForm")?.reset();
  if ($("imovelId")) $("imovelId").value = "";
  if ($("imovelTipo")) $("imovelTipo").value = "venda";
  if ($("imovelProcura")) $("imovelProcura").value = "casa";
  if ($("imovelStatus")) $("imovelStatus").value = "ativo";
  $("deleteImovelButton")?.classList.add("hidden");
  renderImovelImagesPreview();
  setFormCardOpen("imovelForm", false);
}

function fillImovelForm(item) {
  if (!itemBelongsToCurrentClient(item)) {
    showToast("Voce nao tem permissao para editar este imovel.");
    return;
  }
  state.selectedImovelId = item.id;
  state.imovelImages = Array.isArray(item.imagens) ? item.imagens : (item.imagem ? [item.imagem] : []);
  $("imovelId").value = item.id || "";
  $("imovelTitulo").value = item.titulo || "";
  $("imovelTipo").value = item.tipo || "venda";
  $("imovelProcura").value = item.procura || "casa";
  $("imovelStatus").value = item.status || "ativo";
  $("imovelValor").value = item.valor || "";
  $("imovelCodRef").value = item.codRef || "";
  $("imovelEndereco").value = item.endereco || "";
  $("imovelLat").value = item.lat || "";
  $("imovelLng").value = item.lng || "";
  $("imovelQuartos").value = item.quartos || "";
  $("imovelSuite").value = item.suite || "";
  $("imovelBanheiros").value = item.banheiros || "";
  $("imovelVagas").value = item.vagas || "";
  $("imovelSalas").value = item.salas || "";
  $("imovelCozinhas").value = item.cozinhas || "";
  $("imovelArea").value = item.area || "";
  $("imovelConstrucao").value = item.construcao || "";
  $("imovelPiscina").value = item.piscina || "";
  $("imovelChurrasqueira").value = item.churrasqueira || "";
  $("imovelQuintal").value = item.quintal || "";
  $("imovelOutros").value = item.outros || "";
  $("imovelCorretor").value = item.corretor || (Array.isArray(item.corretores) ? item.corretores[0] : "") || item.vendedor || "";
  $("imovelTelefone").value = item.telefone || item.contato || "";
  $("imovelProprietario").value = item.proprietario || "";
  $("imovelDescricao").value = item.descricao || "";
  $("imovelImagem").value = item.imagem || state.imovelImages[0] || "";
  $("deleteImovelButton")?.classList.remove("hidden");
  renderImovelImagesPreview();
  openFormForEdit("imovelForm");
}

function numberOrText(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  const number = Number(text.replace(/\./g, "").replace(",", ".").replace(/[^\d.]/g, ""));
  return Number.isFinite(number) && /\d/.test(text) && !/[a-zA-Z]/.test(text) ? number : text;
}

function getImovelFormData() {
  const titulo = $("imovelTitulo").value.trim();
  const id = $("imovelId").value || `${slugify(titulo || "imovel")}-${Date.now()}`;
  const imagens = [...state.imovelImages].filter(Boolean);
  const imagem = $("imovelImagem")?.value.trim() || imagens[0] || "";
  const linkedClient = currentClientRecord();
  const corretor = $("imovelCorretor").value.trim() || linkedClient?.nome || "";
  const telefone = $("imovelTelefone").value.trim() || linkedClient?.whatsapp || linkedClient?.contato || "";
  return {
    id,
    titulo,
    tipo: $("imovelTipo").value,
    procura: $("imovelProcura").value,
    status: $("imovelStatus").value,
    valor: numberOrText($("imovelValor").value),
    codRef: $("imovelCodRef").value.trim() || id.slice(0, 10).toUpperCase(),
    endereco: $("imovelEndereco").value.trim(),
    lat: Number($("imovelLat").value) || "",
    lng: Number($("imovelLng").value) || "",
    quartos: Number($("imovelQuartos").value) || "",
    suite: Number($("imovelSuite").value) || "",
    banheiros: Number($("imovelBanheiros").value) || "",
    vagas: Number($("imovelVagas").value) || "",
    salas: Number($("imovelSalas").value) || "",
    cozinhas: Number($("imovelCozinhas").value) || "",
    area: numberOrText($("imovelArea").value),
    construcao: numberOrText($("imovelConstrucao").value),
    piscina: $("imovelPiscina").value.trim(),
    churrasqueira: $("imovelChurrasqueira").value.trim(),
    quintal: $("imovelQuintal").value.trim(),
    outros: $("imovelOutros").value.trim(),
    corretor,
    corretores: corretor ? [corretor] : [],
    telefone,
    contato: telefone,
    proprietario: $("imovelProprietario").value.trim(),
    descricao: $("imovelDescricao").value.trim(),
    imagem,
    imagens,
    clienteId: linkedClient?.id || state.profile?.clienteId || "",
    clienteNome: linkedClient?.nome || corretor,
    estabelecimentoId: linkedClient?.nomeNormalizado || slugify(linkedClient?.nome || corretor),
    origem: "painel",
    origemBase: state.selectedImovelId
      ? (state.imoveis.find((item) => item.id === state.selectedImovelId)?.origemBase || "firebase")
      : "painel",
    updatedAt: serverTimestamp(),
    updatedBy: state.user?.uid || ""
  };
}

function renderImovelImagesPreview() {
  const box = $("imovelImagesPreview");
  if (!box) return;
  $("imovelImagesCount").textContent = `${state.imovelImages.length} imagen${state.imovelImages.length === 1 ? "" : "s"}`;
  box.innerHTML = state.imovelImages.map((url, index) => `
    <article>
      <img src="${escapeAttr(displayImageUrl(url))}" alt="Foto ${index + 1}" ${lazyImageAttrs()} ${imageFallbackAttr()}>
      <button type="button" data-remove-imovel-image="${index}">Remover</button>
    </article>
  `).join("") || `<div class="list-meta">Nenhuma foto adicionada.</div>`;
  box.querySelectorAll("[data-remove-imovel-image]").forEach((button) => {
    button.addEventListener("click", () => {
      state.imovelImages.splice(Number(button.dataset.removeImovelImage), 1);
      if (!state.imovelImages.includes($("imovelImagem").value)) $("imovelImagem").value = state.imovelImages[0] || "";
      renderImovelImagesPreview();
    });
  });
}

function renderImoveisList() {
  const box = $("imoveisList");
  if (!box) return;
  const q = String($("imovelSearch")?.value || "").toLowerCase().trim();
  const list = state.imoveis.filter(itemBelongsToCurrentClient).filter((item) => {
    const hay = `${item.titulo || ""} ${item.tipo || ""} ${item.procura || ""} ${item.valor || ""} ${item.corretor || ""} ${item.endereco || ""}`.toLowerCase();
    return !q || hay.includes(q);
  });
  if (!list.length) {
    box.innerHTML = `<div class="list-meta">Nenhum imovel cadastrado.</div>`;
    return;
  }
  box.innerHTML = list.map((item) => `
    <article class="list-card event-card">
      ${item.imagem ? `<img src="${escapeAttr(displayImageUrl(item.imagem))}" alt="${escapeAttr(item.titulo || "Imovel")}" ${lazyImageAttrs()} ${imageFallbackAttr()}>` : ""}
      <div class="list-title">${escapeHtml(item.titulo || item.id)}</div>
      <div class="list-meta">${escapeHtml([item.tipo, item.procura, item.valor ? moneyBR(item.valor) : ""].filter(Boolean).join(" - ") || "Sem valor")}</div>
      <div class="list-meta">${escapeHtml([item.corretor || item.clienteNome, item.telefone].filter(Boolean).join(" - ") || "Sem contato")}</div>
      <div class="list-meta">${escapeHtml(item.origemBase === "script.js" && item.origem !== "painel" ? "Base inicial do site" : "Firebase / Painel")}</div>
      <span class="badge ${escapeAttr(item.status || "ativo")}">${statusLabel(item.status || "ativo")}</span>
      <button type="button" data-edit-imovel="${escapeAttr(item.id)}">Editar</button>
    </article>
  `).join("");
  box.querySelectorAll("[data-edit-imovel]").forEach((button) => {
    button.addEventListener("click", () => {
      const item = state.imoveis.find((imovel) => imovel.id === button.dataset.editImovel && itemBelongsToCurrentClient(imovel));
      if (item) fillImovelForm(item);
    });
  });
}

function resetInfoDeathNoticeForm() {
  state.selectedDeathNoticeId = null;
  $("infoDeathNoticeForm")?.reset();
  if ($("infoDeathNoticeId")) $("infoDeathNoticeId").value = "";
  $("deleteInfoDeathNoticeButton")?.classList.add("hidden");
  setFormCardOpen("infoDeathNoticeForm", false);
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
  openFormForEdit("infoDeathNoticeForm");
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

  box.innerHTML = list.map((client) => {
    const pendingMonths = new Set(pendingMonthsForClient(client));
    const monthOptions = financeMonthOptionsForClient(client);
    const latestInvoice = latestClientInvoice(client);
    return `
    <article class="finance-row" data-client-id="${escapeAttr(client.id)}">
      <div>
        <div class="list-title">${escapeHtml(client.nome || client.id)}</div>
        <div class="list-meta">${escapeHtml(client.categoria || "Sem categoria")} - ${escapeHtml(client.contato || "Sem telefone")}</div>
        <div class="list-meta">Plano: ${planLabel(client.tipoPlano)} - Valor final: ${moneyBR(valorTotalFaturaCliente(client))}${client.destaqueSemanal ? ` - destaque ${moneyBR(destaqueValueForClient(client))}` : ""}</div>
        <div class="list-meta">Meses em aberto: ${pendingMonthsForClient(client).map(monthLabel).join(", ") || "Nenhum"}</div>
      </div>
      <label>Status
        <select data-finance-field="pagamentoStatus">
          <option value="em_aberto" ${client.pagamentoStatus === "em_aberto" || !client.pagamentoStatus ? "selected" : ""}>Em aberto</option>
          <option value="pago" ${client.pagamentoStatus === "pago" ? "selected" : ""}>Pago</option>
          <option value="isento" ${client.pagamentoStatus === "isento" ? "selected" : ""}>Isento</option>
        </select>
      </label>
      <label>Cliente
        <select data-finance-field="status">
          <option value="ativo" ${client.status === "ativo" || !client.status ? "selected" : ""}>Ativo</option>
          <option value="pendente" ${client.status === "pendente" ? "selected" : ""}>Pendente</option>
          <option value="inativo" ${client.status === "inativo" ? "selected" : ""}>Inativo</option>
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
      <div class="finance-months">
        <span>Meses devendo</span>
        <div class="finance-month-checks">
          ${monthOptions.map((mes) => `
            <label class="finance-month-check">
              <input type="checkbox" data-finance-month value="${escapeAttr(mes)}" ${pendingMonths.has(mes) ? "checked" : ""}>
              ${escapeHtml(monthLabel(mes))}
            </label>
          `).join("")}
        </div>
      </div>
      <label class="finance-receipt">Comprovante
        <input data-finance-receipt="${escapeAttr(client.id)}" type="file" accept="image/*,application/pdf">
        ${latestInvoice?.comprovanteUrl ? `<a href="${escapeAttr(latestInvoice.comprovanteUrl)}" target="_blank" rel="noopener noreferrer">Ver comprovante</a>` : ""}
      </label>
      <button type="button" data-save-finance="${escapeAttr(client.id)}">Salvar</button>
    </article>
  `; }).join("");

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
      const mesesEmAberto = [...row.querySelectorAll("[data-finance-month]:checked")].map((input) => input.value).sort();
      const currentClient = state.clientes.find((client) => client.id === id) || {};
      const nextClient = { ...currentClient, ...payload };
      const valorPlanoFatura = valorFinalPlano(nextClient);
      const valorDestaqueFatura = nextClient.destaqueSemanal ? destaqueValueForClient(nextClient) : 0;
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

  box.querySelectorAll("[data-finance-receipt]").forEach((input) => {
    input.addEventListener("change", async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      const row = input.closest(".finance-row");
      const id = input.dataset.financeReceipt;
      const currentClient = state.clientes.find((client) => client.id === id) || {};
      const mesesEmAberto = [...row.querySelectorAll("[data-finance-month]:checked")].map((checkbox) => checkbox.value).sort();
      if (!mesesEmAberto.length) {
        showToast("Marque pelo menos um mes devendo para anexar o comprovante.");
        event.target.value = "";
        return;
      }
      const payloadBase = {};
      row.querySelectorAll("[data-finance-field]").forEach((field) => {
        payloadBase[field.dataset.financeField] = ["valorPlano", "descontoValor"].includes(field.dataset.financeField)
          ? numberFromMoney(field.value)
          : field.value.trim();
      });
      const nextClient = { ...currentClient, ...payloadBase };
      const valorPlanoFatura = valorFinalPlano(nextClient);
      const valorDestaqueFatura = nextClient.destaqueSemanal ? destaqueValueForClient(nextClient) : 0;
      const valorTotalFatura = valorPlanoFatura + valorDestaqueFatura;
      showToast("Enviando comprovante do financeiro...");
      const comprovanteUrl = await uploadInvoiceReceiptForClient(id, file);
      if (!isMaster()) delete payloadBase.valorPlano;
      const payload = {
        ...payloadBase,
        mesesEmAberto,
        updatedAt: serverTimestamp(),
        updatedBy: state.user?.uid || "",
        origem: "painel",
        editadoNoPainel: true
      };
      mesesEmAberto.forEach((mes) => {
        payload[`faturas/${mes}`] = {
          mes,
          valorPlano: valorPlanoFatura,
          valorDestaque: valorDestaqueFatura,
          valorTotal: valorTotalFatura,
          comprovanteUrl,
          status: payloadBase.pagamentoStatus === "pago" ? "pago" : "em_analise",
          updatedAt: Date.now()
        };
      });
      await update(ref(db, `clientes/${id}`), payload);
      showToast("Comprovante anexado pelo financeiro.");
      await loadAllData();
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

function renderReportCardHeader(title, periodRange) {
  return `
    <div class="report-card-head">
      <h2>${escapeHtml(title)}</h2>
      <span class="report-card-date"><i class="fa-solid fa-calendar-days"></i> ${escapeHtml(periodRange.label)}</span>
    </div>
  `;
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
  const detalhes = new Map();
  Object.values(data || {}).forEach((dia) => {
    Object.entries(dia || {}).forEach(([clienteId, tipos]) => {
      Object.entries(tipos || {}).forEach(([tipo, count]) => {
        incrementMetric(porCliente, clienteId, count);
        incrementMetric(porTipo, tipo, count);
        if (!detalhes.has(clienteId)) detalhes.set(clienteId, new Map());
        incrementMetric(detalhes.get(clienteId), tipo, count);
      });
    });
  });
  return { porCliente, porTipo, detalhes };
}

function aggregateSimpleDaily(data = {}) {
  const map = new Map();
  Object.values(data || {}).forEach((dia) => {
    Object.entries(dia || {}).forEach(([key, count]) => incrementMetric(map, key, count));
  });
  return map;
}

function clientLabelFromMetricKey(key) {
  const normalized = normalizeName(key);
  const client = state.clientes.find((item) => {
    const candidates = [
      item.id,
      item.nome,
      item.name,
      normalizeName(item.nome || item.name || ""),
      clientCanonicalId(item)
    ].filter(Boolean).map((value) => normalizeName(value));
    return candidates.includes(normalized);
  });
  return client?.nome || client?.name || String(key || "Cliente");
}

function metricButtonLabel(tipo) {
  return {
    telefone: "Telefone",
    whatsapp: "WhatsApp",
    grupoWhatsapp: "Grupo WhatsApp",
    cardapio: "Cardapio",
    "gerar-card": "Gerar card",
    fotos: "Fotos",
    divulgacao: "Divulgacao",
    instagram_onde_comer: "Instagram"
  }[tipo] || String(tipo || "Clique").replace(/[_-]/g, " ");
}

function buildGeneralClickRows(details = new Map()) {
  const types = new Set();
  const rows = [...details.entries()].map(([clientId, map]) => {
    const clicks = {};
    let total = 0;
    map.forEach((count, type) => {
      types.add(type);
      clicks[type] = count;
      total += count;
    });
    return {
      id: clientId,
      nome: clientLabelFromMetricKey(clientId),
      categoria: state.clientes.find((client) => normalizeName(client.id) === normalizeName(clientId) || normalizeName(client.nome) === normalizeName(clientId))?.categoria || "Estabelecimento/servico",
      clicks,
      total
    };
  }).filter((row) => row.total > 0).sort((a, b) => b.total - a.total);
  return { rows, types: [...types].sort((a, b) => metricButtonLabel(a).localeCompare(metricButtonLabel(b), "pt-BR")) };
}

function buildOndeComerClickRows(cardapios = new Map(), whats = new Map(), fotos = new Map()) {
  const keys = new Set([...cardapios.keys(), ...whats.keys(), ...fotos.keys()]);
  return [...keys].map((key) => {
    const clicks = {
      cardapio: Number(cardapios.get(key) || 0),
      whatsapp: Number(whats.get(key) || 0),
      fotos: Number(fotos.get(key) || 0)
    };
    return {
      id: key,
      nome: clientLabelFromMetricKey(key),
      categoria: "Onde Comer",
      clicks,
      total: clicks.cardapio + clicks.whatsapp + clicks.fotos
    };
  }).filter((row) => row.total > 0).sort((a, b) => b.total - a.total);
}

function renderClickReportTable(rows, types, emptyMessage) {
  if (!rows.length) return `<div class="list-meta">${emptyMessage}</div>`;
  return `
    <div class="report-table-wrap">
      <table class="report-click-table">
        <thead>
          <tr>
            <th>Cliente</th>
            <th>Area</th>
            ${types.map((type) => `<th>${escapeHtml(metricButtonLabel(type))}</th>`).join("")}
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          ${rows.slice(0, 30).map((row) => `
            <tr>
              <td><strong>${escapeHtml(row.nome)}</strong></td>
              <td>${escapeHtml(row.categoria || "-")}</td>
              ${types.map((type) => `<td>${Number(row.clicks[type] || 0)}</td>`).join("")}
              <td><strong>${row.total}</strong></td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
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
  const generalClickReport = buildGeneralClickRows(cliquesBotoes.detalhes);
  const ondeComerClickRows = buildOndeComerClickRows(cliquesOndeComerCardapios, cliquesOndeComerWhats, cliquesOndeComerFotos);

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
      <article class="stat-card" data-report-period="${escapeAttr(periodRange.label)}"><span>Clientes ativos</span><strong>${ativos.length}</strong><small>${reportPercent(ativos.length, totalClientes)} da base</small></article>
      <article class="stat-card" data-report-period="${escapeAttr(periodRange.label)}"><span>Financeiro em aberto</span><strong>${abertos.length}</strong><small>${moneyBR(valorAberto)}</small></article>
      <article class="stat-card" data-report-period="${escapeAttr(periodRange.label)}"><span>Receita prevista</span><strong>${moneyBR(valorReceber)}</strong><small>Clientes nao isentos</small></article>
      <article class="stat-card" data-report-period="${escapeAttr(periodRange.label)}"><span>Receita mensal</span><strong>${moneyBR(receitas.mensal)}</strong><small>Projecao por planos</small></article>
      <article class="stat-card" data-report-period="${escapeAttr(periodRange.label)}"><span>Receita semestral</span><strong>${moneyBR(receitas.semestral)}</strong><small>Projecao por planos</small></article>
      <article class="stat-card" data-report-period="${escapeAttr(periodRange.label)}"><span>Receita anual</span><strong>${moneyBR(receitas.anual)}</strong><small>Projecao por planos</small></article>
      <article class="stat-card" data-report-period="${escapeAttr(periodRange.label)}"><span>Receita paga</span><strong>${moneyBR(valorPago)}</strong><small>${pagos.length} cliente${pagos.length === 1 ? "" : "s"}</small></article>
      <article class="stat-card" data-report-period="${escapeAttr(periodRange.label)}"><span>Destaques semanais</span><strong>${destaques.length}</strong><small>${moneyBR(destaques.reduce((sum, c) => sum + Number(c.destaqueValor || 0), 0))}</small></article>
      <article class="stat-card" data-report-period="${escapeAttr(periodRange.label)}"><span>Com foto</span><strong>${comImagem.length}</strong><small>${reportPercent(comImagem.length, totalClientes)} dos clientes</small></article>
    </div>

    <div class="reports-grid">
      <section class="panel-card report-card">
        ${renderReportCardHeader("Resumo operacional", periodRange)}
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
        ${renderReportCardHeader("Mais acessados por comercio", periodRange)}
        ${renderReportList(topFromMap(cliquesBotoes.porCliente, 12), "Ainda nao ha cliques de comercio registrados.")}
      </section>

      <section class="panel-card report-card report-wide">
        ${renderReportCardHeader("Cliques por estabelecimento/servico", periodRange)}
        ${renderClickReportTable(generalClickReport.rows, generalClickReport.types, "Ainda nao ha cliques por estabelecimento ou servico.")}
      </section>

      <section class="panel-card report-card">
        ${renderReportCardHeader("Cliques por botao", periodRange)}
        ${renderReportList(topFromMap(cliquesBotoes.porTipo, 12), "Ainda nao ha cliques por botao registrados.")}
      </section>

      <section class="panel-card report-card">
        ${renderReportCardHeader("Cidades dos acessos", periodRange)}
        ${renderReportList(topFromMap(cidadesAcesso, 12, "acesso", "acessos"), "Ainda nao ha dados de cidade nos acessos.")}
      </section>

      <section class="panel-card report-card">
        ${renderReportCardHeader("Menu lateral", periodRange)}
        ${renderReportList(topFromMap(cliquesMenu, 12), "Ainda nao ha cliques de menu registrados.")}
      </section>

      <section class="panel-card report-card">
        ${renderReportCardHeader("Onde Comer", periodRange)}
        <div class="report-kpis">
          <span>Cardapios: <strong>${[...cliquesOndeComerCardapios.values()].reduce((s, v) => s + v, 0)}</strong></span>
          <span>WhatsApp: <strong>${[...cliquesOndeComerWhats.values()].reduce((s, v) => s + v, 0)}</strong></span>
          <span>Fotos: <strong>${[...cliquesOndeComerFotos.values()].reduce((s, v) => s + v, 0)}</strong></span>
        </div>
        ${renderReportList(topFromMap(cliquesOndeComerWhats, 8), "Ainda nao ha cliques no Onde Comer.")}
      </section>

      <section class="panel-card report-card report-wide">
        ${renderReportCardHeader("Cliques por estabelecimento - Onde Comer", periodRange)}
        ${renderClickReportTable(ondeComerClickRows, ["whatsapp", "cardapio", "fotos"], "Ainda nao ha cliques no Onde Comer.")}
      </section>

      <section class="panel-card report-card">
        ${renderReportCardHeader("Promocoes", periodRange)}
        ${renderReportList(topFromMap(cliquesPromocoes, 12), "Ainda nao ha cliques em promocoes registrados.")}
      </section>

      <section class="panel-card report-card">
        ${renderReportCardHeader("Clientes que precisam de atencao", periodRange)}
        ${renderReportList(clientesAtencao, "Nenhuma pendencia importante encontrada.")}
      </section>

      <section class="panel-card report-card">
        ${renderReportCardHeader("Top categorias", periodRange)}
        ${renderReportList(topCategorias, "Nenhuma categoria com cliente.")}
      </section>

      <section class="panel-card report-card">
        ${renderReportCardHeader("Comprovantes recentes", periodRange)}
        ${renderReportList(faturasComComprovante, "Nenhum comprovante anexado ainda.")}
      </section>

      <section class="panel-card report-card">
        ${renderReportCardHeader("Usuarios", periodRange)}
        <div class="report-kpis">
          <span>Master: <strong>${roles.master || 0}</strong></span>
          <span>Admin: <strong>${roles.admin || 0}</strong></span>
          <span>Clientes: <strong>${roles.cliente || 0}</strong></span>
          <span>Sem vinculo: <strong>${usuariosSemCliente.length}</strong></span>
        </div>
        ${renderReportList(usuariosSemCliente.slice(0, 6), "Todos os usuarios cliente estao vinculados.")}
      </section>

      <section class="panel-card report-card">
        ${renderReportCardHeader("Proximos eventos", periodRange)}
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
  $("paymentPlanMonthly").value = config.valorPlanoMensal ? moneyBR(config.valorPlanoMensal) : "";
  $("paymentPlanSemiannual").value = config.valorPlanoSemestral ? moneyBR(config.valorPlanoSemestral) : "";
  $("paymentPlanAnnual").value = config.valorPlanoAnual ? moneyBR(config.valorPlanoAnual) : "";
  $("paymentFeaturedWeekly").value = config.valorDestaqueSemanal ? moneyBR(config.valorDestaqueSemanal) : "";
  $("paymentFeaturedWeekend").value = config.valorDestaqueFimSemana ? moneyBR(config.valorDestaqueFimSemana) : "";
  $("paymentFeaturedMonthly").value = config.valorDestaqueMensal ? moneyBR(config.valorDestaqueMensal) : "";
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
  const canEditDados = hasPermission("dados");
  const canEditImages = hasPermission("imagens");
  const canEditCardapio = hasPermission("cardapio");
  const canEditPromocoes = hasPermission("promocoes");
  const hasAnyClientEditPermission = canEditDados || canEditImages || canEditCardapio || canEditPromocoes;
  let coPromoEditIndex = -1;
  const setCoPromoEditMode = (index = -1) => {
    coPromoEditIndex = index;
    const editing = index >= 0;
    const addButton = $("coAddPromoButton");
    if (addButton) {
      addButton.innerHTML = editing
        ? `<i class="fa-solid fa-floppy-disk"></i> Salvar alteracoes`
        : `<i class="fa-solid fa-plus"></i> Adicionar promocao`;
    }
    $("coCancelPromoEditButton")?.classList.toggle("hidden", !editing);
  };

  mount.innerHTML = `
    <form id="clientOnlyForm" class="grid-form">
      ${canEditImages ? `
        <section class="wide profile-upload-panel profile-upload-top client-feature-card feature-foto">
          <div class="section-head compact feature-card-head">
            <div>
              <span class="feature-kicker">Imagem principal</span>
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
      ` : ""}
      ${canEditDados ? `
        <section class="wide client-feature-card feature-dados">
        <div class="form-section-title">
          <i class="fa-solid fa-id-card"></i>
          <div>
            <strong>Dados da empresa</strong>
            <span>Nome, contatos, endereco e canais publicos.</span>
          </div>
        </div>
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
        <div class="form-section-title wide">
          <i class="fa-solid fa-note-sticky"></i>
          <div>
            <strong>Informacoes complementares</strong>
            <span>Texto extra exibido junto aos dados da empresa.</span>
          </div>
        </div>
        <label class="wide">Informacoes adicionais<textarea id="coInfo" rows="4">${escapeHtml(client.infoAdicional || "")}</textarea></label>
        </section>
      ` : ""}
      ${canEditCardapio ? `
        <section class="wide upload-panel client-feature-card feature-cardapio">
          <div class="section-head compact feature-card-head">
            <div>
              <span class="feature-kicker">Menu e PDF</span>
              <h3>Meu cardapio</h3>
              <p>Configure o link/PDF e as imagens que aparecem no botao Cardapio.</p>
            </div>
            <span id="coMenuImagesCount" class="badge">${menuImages.length} imagem${menuImages.length === 1 ? "" : "s"}</span>
          </div>
          <div class="section-fields">
            <label>Link do cardapio<input id="coMenuLink" value="${escapeAttr(client.cardapioLink || "")}" placeholder="Link externo ou PDF enviado"></label>
          </div>
          <input id="coMenuUpload" type="file" accept="image/*,application/pdf" multiple>
          <div id="coMenuPreview" class="image-grid">
            ${renderMenuImagesMarkup(menuImages, "comenu")}
          </div>
        </section>
      ` : ""}
      ${canEditImages ? `
        <section class="wide upload-panel client-feature-card feature-galeria">
          <div class="section-head compact feature-card-head">
            <div>
              <span class="feature-kicker">Vitrine visual</span>
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
      ` : ""}
      ${canEditPromocoes ? `
        <section class="wide upload-panel client-feature-card feature-promocoes">
          <div class="section-head compact feature-card-head">
            <div>
              <span class="feature-kicker">Ofertas publicas</span>
              <h3>Promocoes</h3>
              <p>Cadastre e edite ofertas que aparecem no menu Promocoes do site publico.</p>
            </div>
            <span id="coPromosCount" class="badge">${promocoes.length} ativa${promocoes.length === 1 ? "" : "s"}</span>
          </div>
          <div class="promo-admin-form">
            <label>Titulo da promocao<input id="coPromoTitle" placeholder="Ex.: Pizza grande"></label>
            <label>Preco atual<input id="coPromoPrice" placeholder="Ex.: 49,90"></label>
            <label>Desconto / chamada<input id="coPromoDiscount" placeholder="Ex.: 20% OFF ou ATE 30% OFF"></label>
            <label>Preco antigo<input id="coPromoOldPrice" placeholder="Opcional"></label>
            <label>Unidade<input id="coPromoUnit" placeholder="Ex.: A unidade"></label>
            <label>Volume<input id="coPromoVolume" placeholder="Opcional"></label>
            <label>Embalagem<input id="coPromoPack" placeholder="Opcional"></label>
            <label>Validade inicio<input id="coPromoStart" type="date"></label>
            <label>Validade fim<input id="coPromoEnd" type="date"></label>
            <fieldset class="promo-weekdays wide">
              <legend>Dias que fica disponivel</legend>
              <p>Para promocoes recorrentes, marque os dias. Se nao marcar nenhum, aparece todos os dias dentro da validade.</p>
              <div>
                ${PROMO_WEEK_DAYS.map((day) => `<label><input type="checkbox" name="coPromoWeekday" value="${day.value}"> ${day.label}</label>`).join("")}
              </div>
            </fieldset>
            <label class="wide">Observacao<textarea id="coPromoObs" rows="3" placeholder="Detalhes da oferta"></textarea></label>
            <label>Imagem da promocao<input id="coPromoImageUpload" type="file" accept="image/*"></label>
            <label>Ou URL da imagem<input id="coPromoImageUrl" placeholder="https://..."></label>
            <div class="promo-form-actions wide">
              <button id="coAddPromoButton" type="button" class="ghost-button"><i class="fa-solid fa-plus"></i> Adicionar promocao</button>
              <button id="coCancelPromoEditButton" type="button" class="ghost-button hidden"><i class="fa-solid fa-xmark"></i> Cancelar edicao</button>
            </div>
          </div>
          <div id="coPromosPreview" class="promo-admin-list">
            ${renderPromocoesMarkup(promocoes)}
          </div>
        </section>
      ` : ""}
      ${hasAnyClientEditPermission ? `
        <div class="form-actions wide"><button type="submit">Salvar meus dados</button></div>
      ` : `<section class="wide panel-card"><p>Nenhuma permissao de edicao foi liberada para este usuario.</p></section>`}
    </form>
  `;
  if (canEditDados) renderScheduleEditor("coScheduleEditor", client.horarios || {});

  mount.querySelector("#coProfileUpload")?.addEventListener("change", async (event) => {
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

  mount.querySelector("#coImagesUpload")?.addEventListener("change", async (event) => {
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

  mount.querySelector("#coMenuUpload")?.addEventListener("change", async (event) => {
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

  mount.querySelector("#coAddImageUrlButton")?.addEventListener("click", async () => {
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

  mount.querySelector("#coAddPromoButton")?.addEventListener("click", async () => {
    const title = $("coPromoTitle").value.trim();
    if (!title) {
      showToast("Informe o titulo da promocao.");
      return;
    }

    let image = $("coPromoImageUrl").value.trim();
    const imageFile = $("coPromoImageUpload").files?.[0];
    if (imageFile && !image) {
      showToast("Enviando imagem da promocao...");
      image = await uploadPromoImageForClient(client.id, imageFile);
    }

    const current = coPromoEditIndex >= 0 ? promocoes[coPromoEditIndex] : null;
    const payload = readPromoFields("co", mount, current?.id || `promo-${Date.now()}`);
    payload.imagem = image;
    if (coPromoEditIndex >= 0 && current) promocoes[coPromoEditIndex] = payload;
    else promocoes.unshift(payload);

    await update(ref(db, `clientes/${client.id}`), {
      promocoes: normalizePromocoes(promocoes),
      origem: "painel",
      editadoNoPainel: true,
      updatedAt: serverTimestamp(),
      updatedBy: state.user.uid
    });
    showToast(coPromoEditIndex >= 0 ? "Promocao atualizada." : "Promocao adicionada.");
    clearPromoFields("co", mount);
    setCoPromoEditMode(-1);
    await loadAllData();
    renderClientOnlyEditor();
  });

  mount.querySelector("#coCancelPromoEditButton")?.addEventListener("click", () => {
    clearPromoFields("co", mount);
    setCoPromoEditMode(-1);
  });

  mount.querySelector("#coPromoImageUpload")?.addEventListener("change", async (event) => {
    await uploadSelectedPromoImage("coPromoImageUpload", "coPromoImageUrl", client.id);
    event.target.value = "";
  });

  mount.querySelectorAll("[data-co-main]").forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.coMain);
      if (!$("coImage")) return;
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
        imagem: imagens.some((item) => imageUrl(item) === $("coImage")?.value) ? $("coImage").value : imageUrl(imagens[0]),
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

  mount.querySelectorAll("[data-promo-edit]").forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.promoEdit);
      const promo = promocoes[index];
      if (!promo) return;
      fillPromoFields("co", promo, mount);
      setCoPromoEditMode(index);
      $("coPromoTitle")?.focus();
      $("coPromoTitle")?.scrollIntoView({ behavior: "smooth", block: "center" });
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
    const payload = {
      origem: "painel",
      editadoNoPainel: true,
      updatedAt: serverTimestamp(),
      updatedBy: state.user.uid
    };
    if (canEditDados) {
      const horarios = readScheduleEditor("coScheduleEditor");
      const scheduleBox = $("coScheduleEditor");
      const shouldSaveSchedule = scheduleHasAnyOpen(horarios) || scheduleBox?.dataset.initialSchedule === "true" || scheduleBox?.dataset.touchedSchedule === "true";
      const horarioTexto = shouldSaveSchedule ? scheduleToText(horarios) : $("coHours").value.trim();
      const nome = $("coName").value.trim();
      Object.assign(payload, {
        nome,
        nomeNormalizado: normalizeName(nome),
        contato: $("coContact").value.trim(),
        whatsapp: $("coWhatsapp").value.trim(),
        endereco: $("coAddress").value.trim(),
        horario: horarioTexto,
        ...(shouldSaveSchedule ? { horarios: normalizeSchedule(horarios) } : {}),
        instagram: $("coInstagram").value.trim(),
        facebook: $("coFacebook").value.trim(),
        tiktok: $("coTiktok").value.trim(),
        site: $("coSite").value.trim(),
        infoAdicional: $("coInfo").value.trim()
      });
    }
    if (canEditImages) {
      Object.assign(payload, {
        imagem: $("coImage")?.value.trim() || "",
        imagens
      });
    }
    if (canEditCardapio) {
      Object.assign(payload, {
        cardapioLink: $("coMenuLink")?.value.trim() || "",
        menuImages
      });
    }
    if (canEditPromocoes) {
      payload.promocoes = normalizePromocoes(promocoes);
    }
    payload.aliases = buildClientPublicAliases(client.id, { ...client, ...payload }, client, false);
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

function renderPromocoesMarkup(promocoes, removeAttr = "promo-remove", editAttr = "promo-edit") {
  const list = normalizePromocoes(promocoes);
  if (!list.length) return `<div class="list-meta">Nenhuma promocao cadastrada ainda.</div>`;
  return list.map((promo, index) => `
    <article class="promo-admin-item">
      ${promo.imagem ? `<img src="${escapeAttr(displayImageUrl(promo.imagem))}" alt="${escapeAttr(promo.titulo)}" ${lazyImageAttrs()} ${imageFallbackAttr()}>` : `<div class="promo-admin-empty">sem imagem</div>`}
      <div>
        <strong>${escapeHtml(promo.titulo)}</strong>
        <span>${escapeHtml([promo.preco ? `R$ ${promo.preco}` : "", promo.validadeFim ? `ate ${promo.validadeFim}` : ""].filter(Boolean).join(" - ") || "Sem preco/validade")}</span>
        ${promo.desconto ? `<small>Destaque: ${escapeHtml(promo.desconto)}</small>` : ""}
        <small>Disponivel: ${escapeHtml(promoWeekDaysLabel(promo.diasSemana))}</small>
        ${promo.obs ? `<small>${escapeHtml(promo.obs)}</small>` : ""}
      </div>
      <div class="promo-admin-actions">
        <button type="button" data-${editAttr}="${index}" class="ghost-mini"><i class="fa-solid fa-pen"></i> Editar</button>
        <button type="button" data-${removeAttr}="${index}" class="danger-mini"><i class="fa-solid fa-trash"></i> Remover</button>
      </div>
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
          tipoCliente: "comercio",
          tipo: "comercio",
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
          cardapioAtivo: Boolean(est.cardapioLink || (Array.isArray(est.menuImages) && est.menuImages.length)),
          cardapioLink: est.cardapioLink || "",
          menuImages: normalizeUrlList(est.menuImages || []),
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
  const faturas = meses.map((mes) => buildClientInvoice(client, mes, paymentConfig));

  if (!faturas.length) {
    mount.innerHTML = `
      <article class="invoice-card invoice-summary-card">
        <div class="section-head compact">
          <div>
            <h3>Faturas</h3>
            <p>Nenhuma fatura em aberto para este cliente.</p>
          </div>
          <span class="badge pago">Em dia</span>
        </div>
        <div class="invoice-plan-row">
          <label>Plano atual
            <select id="clientInvoicePlan">
              <option value="mensal" ${client.tipoPlano === "mensal" || !client.tipoPlano ? "selected" : ""}>Mensal</option>
              <option value="semestral" ${client.tipoPlano === "semestral" ? "selected" : ""}>Semestral</option>
              <option value="anual" ${client.tipoPlano === "anual" ? "selected" : ""}>Anual</option>
            </select>
          </label>
          <button id="saveClientInvoicePlan" type="button" class="ghost-button"><i class="fa-solid fa-arrows-rotate"></i> Atualizar plano</button>
        </div>
      </article>
    `;
    $("saveClientInvoicePlan")?.addEventListener("click", async () => {
      const tipoPlano = $("clientInvoicePlan")?.value || "mensal";
      await update(ref(db, `clientes/${client.id}`), {
        tipoPlano,
        updatedAt: serverTimestamp(),
        updatedBy: state.user.uid,
        origem: "painel"
      });
      showToast("Plano atualizado.");
      await loadAllData();
      renderClientInvoices();
    });
    return;
  }

  const totalAberto = faturas.reduce((sum, fatura) => sum + fatura.valorTotal, 0);

  mount.innerHTML = `
    <div class="invoice-list">
      <article class="invoice-card invoice-summary-card">
        <div class="section-head compact">
          <div>
            <h3>Resumo do pagamento</h3>
            <p>Selecione os meses que deseja pagar agora. O Pix abaixo soma somente os meses marcados.</p>
          </div>
          <span class="badge em_aberto">${moneyBR(totalAberto)} em aberto</span>
        </div>
        <div class="invoice-plan-row">
          <label>Plano atual
            <select id="clientInvoicePlan">
              <option value="mensal" ${client.tipoPlano === "mensal" || !client.tipoPlano ? "selected" : ""}>Mensal</option>
              <option value="semestral" ${client.tipoPlano === "semestral" ? "selected" : ""}>Semestral</option>
              <option value="anual" ${client.tipoPlano === "anual" ? "selected" : ""}>Anual</option>
            </select>
          </label>
          <button id="saveClientInvoicePlan" type="button" class="ghost-button"><i class="fa-solid fa-arrows-rotate"></i> Atualizar plano</button>
        </div>
        <div class="invoice-month-selector">
          ${faturas.map((fatura) => `
            <label class="invoice-month-option">
              <input type="checkbox" data-invoice-select value="${escapeAttr(fatura.mes)}" checked>
              <span>
                <strong>${escapeHtml(monthLabel(fatura.mes))}</strong>
                <small>Plano ${moneyBR(fatura.valorPlano)}${fatura.valorDestaque ? ` + destaque ${moneyBR(fatura.valorDestaque)}` : ""}</small>
              </span>
              <b>${moneyBR(fatura.valorTotal)}</b>
            </label>
          `).join("")}
        </div>
        <div class="invoice-selected-total">
          <span>Total selecionado</span>
          <strong id="selectedInvoiceTotal">${moneyBR(totalAberto)}</strong>
        </div>
        ${paymentConfig.pixChave ? `
          <div class="form-actions">
            <button id="generateSelectedInvoicePix" type="button"><i class="fa-solid fa-qrcode"></i> Gerar QR Code/Pix</button>
          </div>
          <div id="selectedInvoicePixBox" class="pix-box invoice-selected-pix hidden">
            <img id="selectedInvoiceQr" alt="QR Code Pix" loading="lazy" decoding="async">
            <label class="wide">Codigo Pix dos meses selecionados<textarea id="selectedInvoicePixCode" rows="5" readonly></textarea></label>
            <div class="list-meta wide">Chave Pix: <strong>${escapeHtml(paymentConfig.pixChave || "")}</strong></div>
            <div class="form-actions">
              <button id="copySelectedInvoicePix" type="button" class="ghost-button"><i class="fa-solid fa-copy"></i> Copiar codigo Pix</button>
              <button data-copy-invoice-key type="button" class="ghost-button"><i class="fa-solid fa-key"></i> Copiar chave Pix</button>
            </div>
            ${paymentConfig.observacaoFatura ? `<div class="list-meta wide">${escapeHtml(paymentConfig.observacaoFatura)}</div>` : ""}
          </div>
          <div class="upload-panel">
            <h3>Comprovante dos meses selecionados</h3>
            <input id="selectedInvoiceReceipt" type="file" accept="image/*,application/pdf">
            <div class="list-meta">Ao anexar aqui, o mesmo comprovante sera vinculado aos meses marcados.</div>
          </div>
        ` : `<div class="list-meta">A chave Pix ainda nao foi configurada pelo admin master.</div>`}
      </article>
    </div>
  `;

  const selectedPixCode = $("selectedInvoicePixCode");
  const selectedQr = $("selectedInvoiceQr");
  const selectedPixBox = $("selectedInvoicePixBox");
  const selectedInvoiceData = () => {
    const selected = [...mount.querySelectorAll("[data-invoice-select]:checked")].map((input) => input.value);
    const selectedPlan = $("clientInvoicePlan")?.value || client.tipoPlano || "mensal";
    const plannedClient = clientForInvoicePlan(client, selectedPlan);
    const selectedInvoices = selected.map((mes) => buildClientInvoice(plannedClient, mes, paymentConfig, null, { ignoreSaved: true }));
    const selectedTotal = selectedInvoices.reduce((sum, fatura) => sum + fatura.valorTotal, 0);
    const selectedLabel = selected.length === 1 ? selected[0] : `${selected[0] || currentMonthKey()}-${selected.length}M`;
    const unified = buildClientInvoice(plannedClient, selectedLabel, paymentConfig, selectedTotal, { ignoreSaved: true });
    return { selected, selectedPlan, selectedInvoices, selectedTotal, unified };
  };
  const refreshSelectedInvoicePayment = () => {
    const { selectedTotal } = selectedInvoiceData();
    $("selectedInvoiceTotal").textContent = moneyBR(selectedTotal);
    if (selectedPixCode) selectedPixCode.value = "";
    if (selectedQr) selectedQr.removeAttribute("src");
    selectedPixBox?.classList.add("hidden");
  };

  mount.querySelectorAll("[data-invoice-select]").forEach((input) => {
    input.addEventListener("change", refreshSelectedInvoicePayment);
  });
  $("clientInvoicePlan")?.addEventListener("change", refreshSelectedInvoicePayment);
  refreshSelectedInvoicePayment();

  $("generateSelectedInvoicePix")?.addEventListener("click", () => {
    const { selectedTotal, unified } = selectedInvoiceData();
    if (selectedTotal <= 0 || !unified.pixCode) {
      showToast("Selecione pelo menos um mes para gerar o Pix.");
      return;
    }
    if (selectedPixCode) selectedPixCode.value = unified.pixCode;
    if (selectedQr) {
      selectedQr.onerror = () => {
        selectedQr.onerror = null;
        selectedQr.src = qrCodeUrl(unified.pixCode, "quickchart");
      };
      selectedQr.src = unified.qrUrl;
    }
    selectedPixBox?.classList.remove("hidden");
    showToast("QR Code/Pix gerado.");
  });

  $("saveClientInvoicePlan")?.addEventListener("click", async () => {
    const tipoPlano = $("clientInvoicePlan")?.value || "mensal";
    await update(ref(db, `clientes/${client.id}`), {
      tipoPlano,
      updatedAt: serverTimestamp(),
      updatedBy: state.user.uid,
      origem: "painel"
    });
    showToast("Plano atualizado.");
    await loadAllData();
    renderClientInvoices();
  });

  $("copySelectedInvoicePix")?.addEventListener("click", async () => {
    await navigator.clipboard?.writeText($("selectedInvoicePixCode")?.value || "");
    showToast("Codigo Pix dos meses selecionados copiado.");
  });

  mount.querySelectorAll("[data-copy-invoice-key]").forEach((button) => button.addEventListener("click", async () => {
    await navigator.clipboard?.writeText(paymentConfig.pixChave || "");
    showToast("Chave Pix copiada.");
  }));

  $("selectedInvoiceReceipt")?.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const selectedMonths = [...mount.querySelectorAll("[data-invoice-select]:checked")].map((input) => input.value);
    if (!selectedMonths.length) {
      showToast("Selecione pelo menos um mes para anexar o comprovante.");
      event.target.value = "";
      return;
    }
    showToast("Enviando comprovante dos meses selecionados...");
    const comprovanteUrl = await uploadInvoiceReceiptForClient(client.id, file);
    const { selectedPlan, selectedInvoices, unified } = selectedInvoiceData();
    const pixCodigo = $("selectedInvoicePixCode")?.value || unified.pixCode || "";
    const payload = {
      tipoPlano: selectedPlan,
      updatedAt: serverTimestamp(),
      updatedBy: state.user.uid
    };
    selectedMonths.forEach((mes) => {
      const fatura = selectedInvoices.find((item) => item.mes === mes);
      if (!fatura) return;
      payload[`faturas/${mes}`] = {
        mes,
        valorPlano: fatura.valorPlano,
        valorDestaque: fatura.valorDestaque,
        valorTotal: fatura.valorTotal,
        pixChave: paymentConfig.pixChave || "",
        pixCodigo,
        comprovanteUrl,
        status: "em_analise",
        updatedAt: Date.now()
      };
    });
    await update(ref(db, `clientes/${client.id}`), payload);
    showToast("Comprovante anexado aos meses selecionados.");
    await loadAllData();
    renderClientInvoices();
  });
}

async function createPanelUser(event) {
  event.preventDefault();
  if (!canManageClients()) return;

  const editingUid = $("editUserUid")?.value || "";
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
  setBusy(button, true, editingUid ? "Salvando..." : "Criando...");
  try {
    if (editingUid) {
      await saveUserProfile({
        uid: editingUid,
        email,
        role,
        clienteId: role === "cliente" ? clienteId : "",
        status: $("editUserStatus").value || "ativo",
        permissoes
      });
      resetUserForm();
      showToast("Usuario atualizado.");
      await loadAllData();
      return;
    }

    if (!password) {
      showToast("Informe uma senha provisoria para criar novo usuario.");
      return;
    }

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

    resetUserForm();
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
    inativo: "Inativo",
    vendido: "Vendido"
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

function setAdminMenuOpen(isOpen) {
  const sidebar = $("adminSidebar");
  const overlay = $("adminSidebarOverlay");
  const toggle = $("adminMenuToggle");
  sidebar?.classList.toggle("mobile-open", isOpen);
  overlay?.classList.toggle("hidden", !isOpen);
  document.body.classList.toggle("admin-menu-open", isOpen);
  toggle?.setAttribute("aria-expanded", isOpen ? "true" : "false");
  toggle?.setAttribute("aria-label", isOpen ? "Fechar menu" : "Abrir menu");
}

function closeAdminMenuOnMobile() {
  if (window.matchMedia("(max-width: 980px)").matches) setAdminMenuOpen(false);
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
  $("newCategoryButton").addEventListener("click", () => {
    resetCategoryForm();
    openFormForEdit("categoryForm");
  });
  $("closeCategoryFormButton")?.addEventListener("click", resetCategoryForm);
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
  $("addClientPromoButton")?.addEventListener("click", addClientPromocao);
  $("cancelClientPromoEditButton")?.addEventListener("click", () => {
    state.clientPromoEditIndex = null;
    clearClientPromoFields();
    $("addClientPromoButton").innerHTML = `<i class="fa-solid fa-plus"></i> Adicionar promocao`;
    $("cancelClientPromoEditButton")?.classList.add("hidden");
  });
  $("clientPromoImageUpload")?.addEventListener("change", async (event) => {
    const targetId = $("clientId")?.value || slugify($("clientName")?.value.trim()) || `cliente-${Date.now()}`;
    await uploadSelectedPromoImage("clientPromoImageUpload", "clientPromoImageUrl", targetId);
    event.target.value = "";
  });
  $("newEventButton").addEventListener("click", () => {
    resetEventForm();
    openFormForEdit("eventForm");
  });
  $("closeEventFormButton")?.addEventListener("click", resetEventForm);
  $("eventSearch").addEventListener("input", renderEventsList);
  $("eventImageUpload").addEventListener("change", async (event) => {
    await uploadEventImage(event.target.files?.[0]);
    event.target.value = "";
  });
  $("newImovelButton")?.addEventListener("click", () => {
    resetImovelForm();
    openFormForEdit("imovelForm");
  });
  $("closeImovelFormButton")?.addEventListener("click", resetImovelForm);
  $("imovelSearch")?.addEventListener("input", renderImoveisList);
  $("imovelImagesUpload")?.addEventListener("change", async (event) => {
    const id = $("imovelId").value || slugify($("imovelTitulo").value) || `imovel-${Date.now()}`;
    const urls = await uploadImovelImages(id, event.target.files);
    state.imovelImages.push(...urls);
    if (!$("imovelImagem").value && state.imovelImages[0]) $("imovelImagem").value = state.imovelImages[0];
    renderImovelImagesPreview();
    event.target.value = "";
  });
  $("newAutomovelButton")?.addEventListener("click", () => {
    resetAutomovelForm();
    openFormForEdit("automovelForm");
  });
  $("closeAutomovelFormButton")?.addEventListener("click", resetAutomovelForm);
  $("automovelSearch")?.addEventListener("input", renderAutomoveisList);
  $("automovelImagesUpload")?.addEventListener("change", async (event) => {
    const id = $("automovelId").value || slugify(`${$("automovelMarca").value}-${$("automovelModelo").value}`) || `automovel-${Date.now()}`;
    const urls = await uploadAutomovelImages(id, event.target.files);
    state.automovelImages.push(...urls);
    if (!$("automovelImagem").value && state.automovelImages[0]) $("automovelImagem").value = state.automovelImages[0];
    renderAutomovelImagesPreview();
    event.target.value = "";
  });
  $("newInfoDeathNoticeButton")?.addEventListener("click", () => {
    resetInfoDeathNoticeForm();
    openFormForEdit("infoDeathNoticeForm");
  });
  $("closeInfoDeathNoticeFormButton")?.addEventListener("click", resetInfoDeathNoticeForm);
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
      valorPlanoMensal: numberFromMoney($("paymentPlanMonthly").value),
      valorPlanoSemestral: numberFromMoney($("paymentPlanSemiannual").value),
      valorPlanoAnual: numberFromMoney($("paymentPlanAnnual").value),
      valorDestaqueSemanal: numberFromMoney($("paymentFeaturedWeekly").value),
      valorDestaqueFimSemana: numberFromMoney($("paymentFeaturedWeekend").value),
      valorDestaqueMensal: numberFromMoney($("paymentFeaturedMonthly").value),
      observacaoFatura: $("paymentInvoiceNote").value.trim(),
      updatedAt: serverTimestamp(),
      updatedBy: state.user?.uid || ""
    };
    await update(ref(db, "configuracoes/pagamento"), payload);
    state.pagamentoSistema = payload;
    showToast("Dados de pagamento salvos.");
    renderFinanceiro();
    renderReports();
    renderClientInvoices();
  });
  $("newUserButton")?.addEventListener("click", () => {
    resetUserForm();
    openFormForEdit("userForm");
  });
  $("closeUserFormButton")?.addEventListener("click", resetUserForm);
  $("userForm").addEventListener("submit", createPanelUser);
  $("deleteUserButton")?.addEventListener("click", deletePanelUser);

  $("adminMenuToggle")?.addEventListener("click", () => {
    const isOpen = $("adminSidebar")?.classList.contains("mobile-open");
    setAdminMenuOpen(!isOpen);
  });
  $("adminSidebarOverlay")?.addEventListener("click", () => setAdminMenuOpen(false));
  const desktopMenuQuery = window.matchMedia("(min-width: 981px)");
  const handleDesktopMenuChange = (event) => {
    if (event.matches) setAdminMenuOpen(false);
  };
  if (desktopMenuQuery.addEventListener) {
    desktopMenuQuery.addEventListener("change", handleDesktopMenuChange);
  } else {
    desktopMenuQuery.addListener(handleDesktopMenuChange);
  }
  document.querySelectorAll(".nav-admin button").forEach((button) => {
    button.addEventListener("click", () => {
      switchView(button.dataset.view);
      closeAdminMenuOnMobile();
    });
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
      const categoryMenuGroup = payload.tipoCliente === "servico" ? "servicos" : (existingCategory.menuGroup || "comercios");
      updates[`categorias/${categoryId}`] = {
        ...existingCategory,
        nome: payload.categoria,
        nomeNormalizado: normalizeName(payload.categoria),
        parentId: existingCategory.parentId || "",
        menuGroup: categoryMenuGroup,
        tipoCliente: payload.tipoCliente,
        menuLetter: existingCategory.menuLetter || "",
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
        existingCategory.menuGroup = payload.tipoCliente === "servico" ? "servicos" : (existingCategory.menuGroup || "comercios");
        existingCategory.tipoCliente = payload.tipoCliente;
        existingCategory.origem = "painel";
      } else {
        state.categorias.push(normalizeCategory({ id: categoryId, nome: payload.categoria, menuGroup: payload.tipoCliente === "servico" ? "servicos" : "comercios", tipoCliente: payload.tipoCliente, origem: "painel" }));
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
    await update(ref(db, `eventos/${state.selectedEventId}`), {
      status: "excluido",
      deletedAt: serverTimestamp(),
      deletedBy: state.user?.uid || ""
    });
    showToast("Evento excluido.");
    resetEventForm();
    await loadAllData();
  });

  $("imovelForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!hasPermission("imoveis")) return;
    if (!canManageClients() && !currentClientId()) {
      showToast("Usuario sem cliente vinculado. Nao e possivel salvar imovel.");
      return;
    }
    if (state.selectedImovelId) {
      const original = state.imoveis.find((item) => item.id === state.selectedImovelId);
      if (!original || !itemBelongsToCurrentClient(original)) {
        showToast("Voce nao tem permissao para alterar este imovel.");
        return;
      }
    }
    const payload = getImovelFormData();
    const id = payload.id;
    delete payload.id;
    if (!state.selectedImovelId) payload.createdAt = serverTimestamp();
    const updates = { [`conteudosInformativos/imoveis/${id}`]: payload };
    if (state.selectedImovelId && state.selectedImovelId !== id) {
      updates[`conteudosInformativos/imoveis/${state.selectedImovelId}`] = null;
    }
    await update(ref(db), updates);
    showToast("Imovel salvo.");
    resetImovelForm();
    await loadAllData();
  });

  $("deleteImovelButton")?.addEventListener("click", async () => {
    if (!state.selectedImovelId || !confirm("Excluir este imovel?")) return;
    const original = state.imoveis.find((item) => item.id === state.selectedImovelId);
    if (!original || !itemBelongsToCurrentClient(original)) {
      showToast("Voce nao tem permissao para excluir este imovel.");
      return;
    }
    if (original.origemBase === "script.js") {
      const tombstone = cleanForFirebase({
        ...original,
        status: "inativo",
        ocultarBaseInicial: true,
        origem: "painel",
        origemBase: "script.js",
        deletedAt: serverTimestamp(),
        deletedBy: state.user?.uid || ""
      });
      await update(ref(db, `conteudosInformativos/imoveis/${state.selectedImovelId}`), tombstone);
    } else {
      await remove(ref(db, `conteudosInformativos/imoveis/${state.selectedImovelId}`));
    }
    showToast("Imovel excluido.");
    resetImovelForm();
    await loadAllData();
  });

  $("automovelForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!hasPermission("veiculos")) return;
    if (!canManageClients() && !currentClientId()) {
      showToast("Usuario sem cliente vinculado. Nao e possivel salvar automovel.");
      return;
    }
    if (state.selectedAutomovelId) {
      const original = state.automoveis.find((item) => item.id === state.selectedAutomovelId);
      if (!original || !itemBelongsToCurrentClient(original)) {
        showToast("Voce nao tem permissao para alterar este automovel.");
        return;
      }
    }
    const payload = getAutomovelFormData();
    const id = payload.id;
    delete payload.id;
    if (!state.selectedAutomovelId) payload.createdAt = serverTimestamp();
    const updates = { [`conteudosInformativos/automoveis/${id}`]: payload };
    if (state.selectedAutomovelId && state.selectedAutomovelId !== id) {
      updates[`conteudosInformativos/automoveis/${state.selectedAutomovelId}`] = null;
    }
    await update(ref(db), updates);
    showToast("Automovel salvo.");
    resetAutomovelForm();
    await loadAllData();
  });

  $("deleteAutomovelButton")?.addEventListener("click", async () => {
    if (!state.selectedAutomovelId || !confirm("Excluir este automovel?")) return;
    const original = state.automoveis.find((item) => item.id === state.selectedAutomovelId);
    if (!original || !itemBelongsToCurrentClient(original)) {
      showToast("Voce nao tem permissao para excluir este automovel.");
      return;
    }
    await remove(ref(db, `conteudosInformativos/automoveis/${state.selectedAutomovelId}`));
    showToast("Automovel excluido.");
    resetAutomovelForm();
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
