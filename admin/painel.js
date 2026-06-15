import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getDatabase,
  ref,
  get,
  set,
  update,
  remove,
  serverTimestamp,
  runTransaction
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
  numero: 285,
  label: "v291",
  data: "2026-06-14",
  nota: "Cadastro e exibicao de ate tres telefones ou WhatsApps por cliente."
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const storage = getStorage(app);
const ADMIN_IDLE_TIMEOUT_MS = 10 * 60 * 1000;
let adminIdleTimer = null;

let state = {
  user: null,
  profile: null,
  clientes: [],
  usuarios: [],
  eventos: [],
  imoveis: [],
  automoveis: [],
  notasFalecimento: [],
  gruposWhatsapp: [],
  categorias: [],
  pagamentoSistema: {},
  paginaInicialSite: {},
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
  selectedWhatsappGroupId: null,
  selectedCategoryId: null,
  duplicateCleanupPlan: null,
  clientImages: [],
  clientMenuImages: [],
  clientPromocoes: [],
  clientPromoEditIndex: null,
  staffPromoEditIndex: null,
  selectedPromoArtId: "",
  selectedStoryTemplate: "vitrine",
  storyCustomImage: "",
  pendingClientModuleTarget: "",
  selectedPromoClientId: "",
  imovelImages: [],
  imovelCsEditorItemId: "",
  imovelCsBrokerImage: "",
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
  promocoesClientes: $("promocoesClientesView"),
  categorias: $("categoriasView"),
  eventos: $("eventosView"),
  imoveis: $("imoveisView"),
  automoveis: $("automoveisView"),
  informacoes: $("informacoesView"),
  financeiro: $("financeiroView"),
  relatorios: $("relatoriosView"),
  pagamentoSistema: $("pagamentoSistemaView"),
  paginaInicialSite: $("paginaInicialSiteView"),
  storiesComerciais: $("storiesComerciaisView"),
  usuarios: $("usuariosView"),
  minhaEmpresa: $("minhaEmpresaView"),
  faturas: $("faturasView")
};

const viewCopy = {
  dashboard: ["Visao geral", "Resumo do ambiente administrativo."],
  clientes: ["Clientes", "Cadastre e edite os dados comerciais."],
  promocoesClientes: ["Promocoes", "Cadastre e ajuste promocoes em nome dos clientes."],
  categorias: ["Categorias", "Organize categorias, subcategorias e icones do menu."],
  eventos: ["Eventos", "Configure eventos e divulgacoes."],
  imoveis: ["Imoveis", "Cadastre imoveis para venda ou aluguel no site publico."],
  automoveis: ["Automoveis", "Cadastre veiculos para venda no site publico."],
  informacoes: ["Informacoes", "Gerencie os conteudos do menu Informacoes."],
  financeiro: ["Financeiro", "Visao consolidada dos clientes e faturas."],
  relatorios: ["Relatorios", "Indicadores e pontos de atencao do painel."],
  pagamentoSistema: ["Pagamento", "Configure a chave Pix usada nas faturas."],
  storiesComerciais: ["Stories comerciais", "Crie artes premium para clientes e conquiste novos anunciantes."],
  paginaInicialSite: ["Página Inicial Site", "Configure o banner principal de acessos rapidos."],
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

function isMasterEmail(email = state.user?.email || state.profile?.email || "") {
  return MASTER_EMAILS.includes(String(email || "").trim().toLowerCase());
}

function canManageClients() {
  return isMasterEmail() || ["master", "admin"].includes(currentRole());
}

function clienteAssociadoImoveis(client = {}, includeCurrentPermission = false) {
  const category = normalizeName(client.categoria || client.category || client.categoriaId || "");
  const categoryMatches = category.includes("imove") || category.includes("imobili");
  const permissionMatches = includeCurrentPermission && Boolean(state.profile?.permissoes?.imoveis);
  return categoryMatches || permissionMatches;
}

function atualizarVisibilidadeCreciCliente() {
  const field = $("clientCreciField");
  if (!field) return;
  const category = $("clientNewCategory")?.value.trim() || $("clientCategory")?.value.trim() || "";
  const currentClient = state.clientes.find((client) => client.id === state.selectedClientId) || {};
  field.classList.toggle("hidden", !clienteAssociadoImoveis({ ...currentClient, categoria: category }));
}

function isMaster() {
  return isMasterEmail() || currentRole() === "master";
}

function hasPermission(permission) {
  if (canManageClients()) return true;
  return Boolean(state.profile?.permissoes?.[permission]);
}

function canGenerateImovelImages() {
  if (canManageClients()) return true;
  const permissions = state.profile?.permissoes || {};
  if (Object.prototype.hasOwnProperty.call(permissions, "gerar_imagens_imoveis")) {
    return Boolean(permissions.gerar_imagens_imoveis);
  }
  return Boolean(permissions.imoveis);
}

function canAccessImoveis() {
  return hasPermission("imoveis") || canGenerateImovelImages();
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
    if (viewName === "paginaInicialSite") return isMaster();
    if (viewName === "storiesComerciais") return isMaster();
    return true;
  }
  if (viewName === "faturas") return hasPermission("faturas") || clientHasOpenMonthlyInvoice(currentClientRecord());
  if (viewName === "imoveis") return canAccessImoveis();
  if (viewName === "automoveis") return hasPermission("veiculos");
  if (viewName === "informacoes") return canManageInformacoes();
  if (viewName === "minhaEmpresa") return true;
  return false;
}

function initialViewForProfile() {
  if (canManageClients()) return "dashboard";
  if (hasPermission("veiculos")) return "automoveis";
  if (canAccessImoveis()) return "imoveis";
  return "minhaEmpresa";
}

function moneyBR(value) {
  return Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatPhoneMask(value) {
  const digitsOnly = String(value || "").replace(/\D/g, "");
  const digits = digitsOnly.length > 11 && digitsOnly.startsWith("55")
    ? digitsOnly.slice(2, 13)
    : digitsOnly.slice(0, 11);
  if (digits.length <= 2) return digits ? `(${digits}` : "";
  const ddd = digits.slice(0, 2);
  const rest = digits.slice(2);
  if (rest.length <= 4) return `(${ddd}) ${rest}`;
  if (rest.length <= 8) return `(${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
  return `(${ddd}) ${rest.slice(0, 5)}-${rest.slice(5, 9)}`;
}

function bindPhoneMask(inputId) {
  const input = $(inputId);
  if (!input) return;
  const applyMask = () => {
    input.value = formatPhoneMask(input.value);
  };
  applyMask();
  input.addEventListener("input", applyMask);
}

function formatCurrencyInput(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "";
  const cents = Number(digits) / 100;
  return moneyBR(cents);
}

function formatExistingCurrency(value) {
  if (value === null || value === undefined || value === "") return "";
  if (typeof value === "number") return moneyBR(value);
  const text = String(value).trim();
  if (!text) return "";
  if (/R\$/i.test(text)) return moneyBR(numberFromMoney(text));
  const digits = text.replace(/\D/g, "");
  if (!digits) return text;
  if (/[,.]/.test(text)) return moneyBR(numberFromMoney(text));
  return moneyBR(Number(digits));
}

function bindCurrencyMask(input) {
  if (!input || input.dataset.currencyMaskBound) return;
  input.dataset.currencyMaskBound = "true";
  input.setAttribute("inputmode", "numeric");
  input.addEventListener("input", () => {
    input.value = formatCurrencyInput(input.value);
  });
  input.addEventListener("blur", () => {
    input.value = formatExistingCurrency(input.value);
  });
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

function normalizeClientContacts(client = {}) {
  const candidates = [
    ...(Array.isArray(client.contatos) ? client.contatos : []),
    client.contato,
    client.contact,
    client.whatsapp,
    client.contato2,
    client.contact2,
    client.contato3,
    client.contact3,
    client.telefone
  ];
  const seen = new Set();
  return candidates
    .map((value) => String(value || "").trim())
    .filter((value) => {
      const key = value.replace(/\D/g, "");
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 3);
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
      tipoOferta: String(item?.tipoOferta || "").trim(),
      entregaRetirada: String(item?.entregaRetirada || "").trim(),
      faixaPreco: String(item?.faixaPreco || "").trim(),
      modoPreco: String(item?.modoPreco || "").trim(),
      precoAntigo: String(item?.precoAntigo || "").trim(),
      unidade: String(item?.unidade || "").trim(),
      imagem: String(item?.imagem || item?.image || "").trim(),
      validadeInicio: String(item?.validadeInicio || "").trim(),
      validadeFim: String(item?.validadeFim || item?.validade || "").trim(),
      diasSemana: normalizePromoWeekDays(item?.diasSemana || item?.dias || item?.recorrenciaDias || item?.diaSemana),
      obs: String(item?.obs || item?.descricao || "").trim(),
      instagramMensagem: String(item?.instagramMensagem || item?.mensagemInstagram || item?.chamadaInstagram || "").trim(),
      ativo: item?.ativo === false ? false : true
    }))
    .filter((item) => item.titulo)
    .slice(0, 30);
}

function normalizeVagasTrabalho(items, legacy = null) {
  const source = Array.isArray(items) ? items : [];
  const legacyItem = !source.length && legacy && (legacy.infoVagaTrabalho || legacy.vagaTitulo || legacy.vagaCargo || legacy.vagaDescricao || legacy.vagaPreRequisito)
    ? [{
      id: "vaga-principal",
      ativo: legacy.vagaAtiva !== false,
      titulo: legacy.vagaTitulo || legacy.vagaCargo || "",
      descricao: legacy.infoVagaTrabalho || legacy.vagaDescricao || "",
      requisitos: legacy.vagaPreRequisito || legacy.vagaRequisitos || "",
      salario: legacy.vagaSalario || "",
      jornada: legacy.vagaJornada || "",
      local: legacy.vagaLocal || "",
      contato: legacy.vagaContato || "",
      comoCandidatar: legacy.vagaComoCandidatar || "",
      validade: legacy.vagaValidade || ""
    }]
    : [];
  return [...source, ...legacyItem]
    .map((item, index) => ({
      id: item?.id || `vaga-${Date.now()}-${index}`,
      ativo: item?.ativo === false ? false : true,
      titulo: String(item?.titulo || item?.vagaTitulo || item?.vagaCargo || "").trim(),
      descricao: String(item?.descricao || item?.infoVagaTrabalho || item?.vagaDescricao || "").trim(),
      requisitos: String(item?.requisitos || item?.vagaPreRequisito || item?.vagaRequisitos || "").trim(),
      salario: String(item?.salario || item?.vagaSalario || "").trim(),
      jornada: String(item?.jornada || item?.vagaJornada || "").trim(),
      local: String(item?.local || item?.vagaLocal || "").trim(),
      contato: String(item?.contato || item?.vagaContato || "").trim(),
      comoCandidatar: String(item?.comoCandidatar || item?.vagaComoCandidatar || "").trim(),
      validade: String(item?.validade || item?.vagaValidade || "").trim()
    }))
    .filter((item, index, arr) => item.titulo || item.descricao || item.requisitos)
    .filter((item, index, arr) => arr.findIndex((other) => other.id === item.id) === index)
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

function eventEndOfDayMs(evento = {}) {
  const iso = normalizeEventDate(evento.dataFim || evento.fim || evento.endDate || evento.dateEnd || eventRawDate(evento));
  if (!iso) return null;
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day, 23, 59, 59, 999).getTime();
}

function eventAlreadyDone(evento = {}) {
  const endMs = eventEndOfDayMs(evento);
  return typeof endMs === "number" && endMs < Date.now();
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
        .filter((slot) => slot && (slot.vinteQuatroHoras === true || (slot.inicio && slot.fim)))
        .map((slot) => slot.vinteQuatroHoras === true
          ? { vinteQuatroHoras: true }
          : { inicio: slot.inicio, fim: slot.fim })
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
    const allDay = slots.some((slot) => slot.vinteQuatroHoras === true);
    const timeSlots = slots.filter((slot) => !slot.vinteQuatroHoras);
    return `
      <article class="schedule-day ${open ? "" : "closed"} ${allDay ? "all-day" : ""}" data-day="${key}">
        <label class="schedule-open">
          <input type="checkbox" data-schedule-open ${open ? "checked" : ""}>
          <span>${label}</span>
        </label>
        <strong class="schedule-status">${allDay ? "24 horas" : (open ? "Aberto" : "Fechado")}</strong>
        <label class="schedule-all-day">
          <input type="checkbox" data-schedule-all-day ${allDay ? "checked" : ""}>
          <span>24 horas</span>
        </label>
        <div class="schedule-slots">
          <input type="time" data-slot="0" data-field="inicio" value="${escapeAttr(timeSlots[0]?.inicio || "")}" ${allDay ? "disabled" : ""}>
          <input type="time" data-slot="0" data-field="fim" value="${escapeAttr(timeSlots[0]?.fim || "")}" ${allDay ? "disabled" : ""}>
          <input type="time" data-slot="1" data-field="inicio" value="${escapeAttr(timeSlots[1]?.inicio || "")}" ${allDay ? "disabled" : ""}>
          <input type="time" data-slot="1" data-field="fim" value="${escapeAttr(timeSlots[1]?.fim || "")}" ${allDay ? "disabled" : ""}>
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
      const row = input.closest(".schedule-day");
      row?.classList.toggle("closed", !input.checked);
      if (!input.checked) {
        const allDayInput = row?.querySelector("[data-schedule-all-day]");
        if (allDayInput) allDayInput.checked = false;
        row?.classList.remove("all-day");
        row?.querySelectorAll('input[type="time"]').forEach((timeInput) => {
          timeInput.disabled = false;
        });
      }
      const status = row?.querySelector(".schedule-status");
      const allDay = row?.querySelector("[data-schedule-all-day]")?.checked;
      if (status) status.textContent = input.checked ? (allDay ? "24 horas" : "Aberto") : "Fechado";
    });
  });
  box.querySelectorAll("[data-schedule-all-day]").forEach((input) => {
    input.addEventListener("change", () => {
      box.dataset.touchedSchedule = "true";
      const row = input.closest(".schedule-day");
      const open = row?.querySelector("[data-schedule-open]");
      if (input.checked && open) open.checked = true;
      row?.classList.toggle("closed", !open?.checked);
      row?.classList.toggle("all-day", input.checked);
      row?.querySelectorAll('input[type="time"]').forEach((timeInput) => {
        timeInput.disabled = input.checked;
      });
      const status = row?.querySelector(".schedule-status");
      if (status) status.textContent = input.checked ? "24 horas" : (open?.checked ? "Aberto" : "Fechado");
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
    const allDay = row.querySelector("[data-schedule-all-day]")?.checked;
    const slots = [];
    if (isOpen && allDay) {
      horarios[day] = [{ vinteQuatroHoras: true }];
      return;
    }
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
    if (slots.some((slot) => slot.vinteQuatroHoras === true)) return `${label}: 24 horas`;
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

function confirmarExclusao(nomeItem, tipoItem = "item") {
  return new Promise((resolve) => {
    document.querySelector(".delete-confirm-overlay")?.remove();
    const nome = String(nomeItem || "este item").trim() || "este item";
    const overlay = document.createElement("div");
    overlay.className = "delete-confirm-overlay";
    overlay.innerHTML = `
      <section class="delete-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="deleteConfirmTitle">
        <div class="delete-confirm-icon"><i class="fa-solid fa-triangle-exclamation"></i></div>
        <h3 id="deleteConfirmTitle">Confirmar exclusao</h3>
        <p>Tem certeza que deseja excluir o <strong>${escapeHtml(tipoItem)}</strong>:</p>
        <div class="delete-confirm-name">${escapeHtml(nome)}</div>
        <div class="delete-confirm-actions">
          <button type="button" class="ghost-button" data-delete-cancel>Cancelar</button>
          <button type="button" class="danger-button" data-delete-confirm><i class="fa-solid fa-trash"></i> Excluir</button>
        </div>
      </section>
    `;
    document.body.appendChild(overlay);
    const close = (ok) => {
      overlay.remove();
      document.removeEventListener("keydown", onKey);
      resolve(Boolean(ok));
    };
    const onKey = (event) => {
      if (event.key === "Escape") close(false);
      if (event.key === "Enter") close(true);
    };
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay || event.target.closest("[data-delete-cancel]")) close(false);
      if (event.target.closest("[data-delete-confirm]")) close(true);
    });
    document.addEventListener("keydown", onKey);
    overlay.querySelector("[data-delete-confirm]")?.focus();
  });
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
  const masterEmail = isMasterEmail(user.email);
  const masterPermissions = { dados: true, destaque: true, vagas: true, imagens: true, cardapio: true, promocoes: true, gerar_imagens_promocoes: true, relatorios: true, faturas: true, financeiro: true, imoveis: true, gerar_imagens_imoveis: true, veiculos: true, informacoes: true, informacoes_nota_falecimento: true };
  const uidSnap = await get(ref(db, `usuariosByUid/${user.uid}`));
  if (uidSnap.exists()) {
    const profile = { uid: user.uid, ...uidSnap.val() };
    if (masterEmail && (profile.role !== "master" || profile.status !== "ativo")) {
      const upgraded = {
        ...profile,
        email: user.email,
        role: "master",
        status: "ativo",
        clienteId: "",
        permissoes: { ...masterPermissions, ...(profile.permissoes || {}) }
      };
      await saveUserProfile(upgraded);
      return upgraded;
    }
    return profile;
  }

  const legacySnap = await get(ref(db, `usuarios/${emailKey(user.email)}`));
  if (legacySnap.exists()) {
    const profile = { uid: user.uid, ...legacySnap.val() };
    if (masterEmail) {
      const upgraded = {
        ...profile,
        email: user.email,
        role: "master",
        status: "ativo",
        clienteId: "",
        permissoes: { ...masterPermissions, ...(profile.permissoes || {}) }
      };
      await saveUserProfile(upgraded);
      return upgraded;
    }
    return profile;
  }

  if (masterEmail) {
    const profile = {
      uid: user.uid,
      email: user.email,
      role: "master",
      status: "ativo",
      permissoes: masterPermissions
    };
    await saveUserProfile(profile);
    return profile;
  }

  return null;
}

async function saveUserProfile(profile) {
  const masterEmail = isMasterEmail(profile.email);
  const masterPermissions = { dados: true, destaque: true, vagas: true, imagens: true, cardapio: true, promocoes: true, gerar_imagens_promocoes: true, relatorios: true, faturas: true, financeiro: true, imoveis: true, gerar_imagens_imoveis: true, veiculos: true, informacoes: true, informacoes_nota_falecimento: true };
  const payload = {
    uid: profile.uid,
    email: String(profile.email || "").toLowerCase(),
    role: masterEmail ? "master" : (profile.role || "cliente"),
    clienteId: masterEmail ? "" : (profile.clienteId || ""),
    status: masterEmail ? "ativo" : (profile.status || "ativo"),
    permissoes: masterEmail ? { ...masterPermissions, ...(profile.permissoes || {}) } : (profile.permissoes || {}),
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
    gruposWhatsappSnap,
    pagamentoSnap,
    paginaInicialSnap,
    cliquesBotoesSnap,
    cliquesMenuSnap,
    acessosSnap,
    ondeComerCardapiosSnap,
    ondeComerWhatsSnap,
    ondeComerFotosSnap,
    promocoesSnap,
    cliquesBotoesDetalhadoSnap,
    cliquesOndeComerDetalhadoSnap,
    cliquesPromocoesDetalhadoSnap,
    cliquesPorMenuSnap,
    origemAcessosSnap,
    instalacoesPWASnap,
    usoPWASnap
  ] = await Promise.all([
    get(ref(db, "clientes")),
    get(ref(db, "usuariosByUid")),
    get(ref(db, "eventos")),
    get(ref(db, "conteudosInformativos/imoveis")),
    get(ref(db, "conteudosInformativos/automoveis")),
    get(ref(db, "categorias")),
    get(ref(db, "conteudosInformativos/notaFalecimento")),
    get(ref(db, "conteudosInformativos/gruposWhatsapp")),
    get(ref(db, "configuracoes/pagamento")),
    get(ref(db, "configuracoes/paginaInicial")),
    get(ref(db, "cliquesPorBotao")),
    get(ref(db, "cliquesMenuLateral")),
    get(ref(db, "acessosPorDia")),
    get(ref(db, "cliquesCardapiosOndeComer")),
    get(ref(db, "cliquesWhatsOndeComer")),
    get(ref(db, "cliquesFotosOndeComer")),
    get(ref(db, "cliquesPromocoesPorComercio")),
    get(ref(db, "cliquesPorBotaoDetalhado")),
    get(ref(db, "cliquesOndeComerDetalhado")),
    get(ref(db, "cliquesPromocoesDetalhado")),
    get(ref(db, "cliquesPorMenu")),
    get(ref(db, "origemAcessos")),
    get(ref(db, "instalacoesPWA")),
    get(ref(db, "usoPWA"))
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
  state.gruposWhatsapp = [];
  if (gruposWhatsappSnap.exists()) {
    gruposWhatsappSnap.forEach((child) => {
      state.gruposWhatsapp.push({ id: child.key, ...child.val() });
      return false;
    });
  }
  state.gruposWhatsapp.sort((a, b) => String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR"));
  state.pagamentoSistema = pagamentoSnap.exists() ? pagamentoSnap.val() : {};
  state.paginaInicialSite = paginaInicialSnap.exists() ? paginaInicialSnap.val() : {};
  state.metricas = {
    cliquesBotoes: cliquesBotoesSnap.exists() ? cliquesBotoesSnap.val() : {},
    cliquesMenu: cliquesMenuSnap.exists() ? cliquesMenuSnap.val() : {},
    acessos: acessosSnap.exists() ? acessosSnap.val() : {},
    ondeComerCardapios: ondeComerCardapiosSnap.exists() ? ondeComerCardapiosSnap.val() : {},
    ondeComerWhats: ondeComerWhatsSnap.exists() ? ondeComerWhatsSnap.val() : {},
    ondeComerFotos: ondeComerFotosSnap.exists() ? ondeComerFotosSnap.val() : {},
    promocoes: promocoesSnap.exists() ? promocoesSnap.val() : {},
    cliquesBotoesDetalhado: cliquesBotoesDetalhadoSnap.exists() ? cliquesBotoesDetalhadoSnap.val() : {},
    cliquesOndeComerDetalhado: cliquesOndeComerDetalhadoSnap.exists() ? cliquesOndeComerDetalhadoSnap.val() : {},
    cliquesPromocoesDetalhado: cliquesPromocoesDetalhadoSnap.exists() ? cliquesPromocoesDetalhadoSnap.val() : {},
    cliquesPorMenuDetalhado: cliquesPorMenuSnap.exists() ? cliquesPorMenuSnap.val() : {},
    origemAcessos: origemAcessosSnap.exists() ? origemAcessosSnap.val() : {},
    instalacoesPWA: instalacoesPWASnap.exists() ? instalacoesPWASnap.val() : {},
    usoPWA: usoPWASnap.exists() ? usoPWASnap.val() : {}
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
  renderInfoWhatsappGroupsList();
  renderFinanceiro();
  renderReports();
  renderPaymentSettings();
  renderHomePageSettings();
  renderStoriesComerciaisView();
  renderClientInvoices();
  renderClientBillingAlert();

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
  const today = dateKeyFromDate(new Date());
  const clienteAtivo = (client) => String(client?.status || "ativo").toLowerCase() === "ativo";
  const itemCadastrado = (item) => {
    const status = String(item?.status || "ativo").toLowerCase();
    return !item?.deletedAt && !["excluido", "excluida", "removido", "removida"].includes(status);
  };
  const promocaoAtiva = (promo, client) => {
    const status = String(promo?.status || "ativo").toLowerCase();
    const fim = promo?.validadeFim || promo?.validade || promo?.fim || promo?.dataFim || "";
    return clienteAtivo(client) && !["inativo", "inativa", "expirado", "expirada", "excluido", "excluida"].includes(status) && (!fim || String(fim).slice(0, 10) >= today);
  };
  const promocoesAtivas = state.clientes.reduce((total, client) => (
    total + normalizePromocoes(client.promocoes).filter((promo) => promocaoAtiva(promo, client)).length
  ), 0);
  $("statClientes").textContent = String(state.clientes.length);
  $("statUsuarios").textContent = String(state.usuarios.length);
  $("statAtivos").textContent = String(state.clientes.filter((c) => c.status === "ativo").length);
  $("statPendentes").textContent = String(state.clientes.filter((c) => c.status === "pendente").length);
  if ($("statInativos")) $("statInativos").textContent = String(state.clientes.filter((c) => c.status === "inativo").length);
  $("statEventos").textContent = String(state.eventos.filter(eventVisible).length);
  if ($("statPromocoesAtivas")) $("statPromocoesAtivas").textContent = String(promocoesAtivas);
  if ($("statImoveis")) $("statImoveis").textContent = String(state.imoveis.filter(itemCadastrado).length);
  if ($("statAutomoveis")) $("statAutomoveis").textContent = String(state.automoveis.filter(itemCadastrado).length);
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
  document.querySelectorAll("[data-client-root-nav='true']").forEach((el) => {
    el.classList.add("hidden");
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
    el.classList.toggle("hidden", !canAccessImoveis());
  });
  document.querySelectorAll("[data-permission='veiculos']").forEach((el) => {
    el.classList.toggle("hidden", !hasPermission("veiculos"));
  });
  document.querySelectorAll("[data-permission='gerar_imagens_imoveis']").forEach((el) => {
    el.classList.toggle("hidden", !canGenerateImovelImages());
  });
  document.querySelectorAll("[data-classified-nav='true']").forEach((el) => {
    el.classList.toggle("hidden", !canManageClients() && !canAccessImoveis() && !hasPermission("veiculos"));
  });

  const masterOption = $("newUserRole")?.querySelector("option[value='master']");
  if (masterOption) masterOption.disabled = !isMaster();
}

function renderClientBillingAlert() {
  const box = $("clientBillingAlert");
  if (!box) return;
  const client = currentClientRecord();
  if (!clientHasOpenMonthlyInvoice(client)) {
    box.classList.add("hidden");
    box.innerHTML = "";
    return;
  }

  const months = pendingMonthsForClient(client);
  const firstMonth = months[0] || currentMonthKey();
  const dueDate = invoiceDueDateForMonth(client, firstMonth);
  const total = months
    .map((month) => buildClientInvoice(client, month, state.pagamentoSistema || {}))
    .reduce((sum, invoice) => sum + invoice.valorTotal, 0);

  box.classList.remove("hidden");
  box.innerHTML = `
    <div>
      <strong><i class="fa-solid fa-triangle-exclamation"></i> Fatura em aberto</strong>
      <p>Existe pagamento mensal pendente no plano ${escapeHtml(planLabel(client.tipoPlano))}, com vencimento em ${escapeHtml(formatDateBR(dueDate))}. O nao pagamento podera causar a inativacao do cadastro ate a regularizacao.</p>
    </div>
    <button type="button" data-open-client-invoices>
      <i class="fa-solid fa-qrcode"></i> Ver faturas ${total > 0 ? `(${moneyBR(total)})` : ""}
    </button>
  `;
  box.querySelector("[data-open-client-invoices]")?.addEventListener("click", () => {
    switchView("faturas");
    closeAdminMenuOnMobile();
  });
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
  if (target === "paginaInicialSite") renderHomePageSettings();
  if (target === "storiesComerciais") renderStoriesComerciaisView();
  if (target === "relatorios") renderReports();
  if (target === "promocoesClientes") renderStaffPromocoesView();
  if (target === "imoveis") renderImoveisList();
  if (target === "automoveis") renderAutomoveisList();
  if (target === "informacoes" && !canManageInformacoes()) {
    switchView(canManageClients() ? "dashboard" : "minhaEmpresa");
    return;
  }
  if (target !== "clientes") setClientFocusMode(false);
}

function prepareInitialView(name) {
  const target = views[name] ? name : initialViewForProfile();
  Object.entries(views).forEach(([key, el]) => el?.classList.toggle("hidden", key !== target));
  document.querySelectorAll(".nav-admin button").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.view === target);
  });
  const [title, subtitle] = viewCopy[target] || viewCopy.dashboard;
  $("viewTitle").textContent = title;
  $("viewSubtitle").textContent = subtitle;
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
  if ($("clientCreci")) $("clientCreci").value = "";
  if ($("clientMenuEnabled")) $("clientMenuEnabled").checked = false;
  if ($("clientJobActive")) $("clientJobActive").checked = false;
  if ($("clientFeaturedWeeks")) $("clientFeaturedWeeks").value = "1";
  if ($("clientFeaturedBilling")) $("clientFeaturedBilling").value = "mensalidade";
  refreshClientFeaturedSummary();
  ["clientJobTitle", "clientJobDescription", "clientJobRequirements", "clientJobSalary", "clientJobSchedule", "clientJobPlace", "clientJobContact", "clientJobApply", "clientJobValidUntil"].forEach((id) => {
    if ($(id)) $(id).value = "";
  });
  fillClientCategorySelect();
  atualizarVisibilidadeCreciCliente();
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
  const contatos = [
    $("clientContact").value.trim(),
    $("clientWhatsapp").value.trim(),
    $("clientContact3")?.value.trim() || ""
  ].filter(Boolean);
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
    contatos,
    contato: contatos[0] || "",
    whatsapp: contatos[1] || contatos[0] || "",
    contato2: contatos[1] || "",
    contato3: contatos[2] || "",
    creci: $("clientCreci")?.value.trim() || "",
    endereco: $("clientAddress").value.trim(),
    horario: horarioTexto,
    ...(shouldSaveSchedule ? { horarios: normalizeSchedule(horarios) } : {}),
    instagram: $("clientInstagram").value.trim(),
    facebook: $("clientFacebook").value.trim(),
    tiktok: $("clientTiktok").value.trim(),
    site: $("clientSite").value.trim(),
    destaqueSemanal: $("clientFeaturedWeek").checked,
    destaqueSemanas: destaqueWeeksForClient({ destaqueSemanas: $("clientFeaturedWeeks")?.value || 1 }),
    destaqueDias: destaqueDaysForClient({ destaqueSemanas: $("clientFeaturedWeeks")?.value || 1 }),
    destaqueInicio: $("clientFeaturedWeek").checked ? (currentClient?.destaqueInicio || dateKeyFromDate(new Date())) : "",
    destaqueFim: $("clientFeaturedWeek").checked ? dateKeyFromDate(addDays(new Date(`${currentClient?.destaqueInicio || dateKeyFromDate(new Date())}T12:00:00`), destaqueDaysForClient({ destaqueSemanas: $("clientFeaturedWeeks")?.value || 1 }) - 1)) : "",
    destaqueCobranca: $("clientFeaturedBilling")?.value || "mensalidade",
    destaqueValor: $("clientFeaturedWeek").checked ? destaqueValueForClient({ destaqueSemanas: $("clientFeaturedWeeks")?.value || 1 }) : 0,
    imagem: $("clientImage").value.trim(),
    imagens: normalizeImageItems(state.clientImages),
    cardapioAtivo: Boolean($("clientMenuEnabled")?.checked),
    cardapioLink: $("clientMenuLink").value.trim(),
    menuImages: normalizeUrlList(state.clientMenuImages),
    promocoes: normalizePromocoes(state.clientPromocoes),
    vagaAtiva: Boolean($("clientJobActive")?.checked),
    vagaTitulo: $("clientJobTitle")?.value.trim() || "",
    vagaCargo: $("clientJobTitle")?.value.trim() || "",
    infoVagaTrabalho: $("clientJobDescription")?.value.trim() || "",
    vagaDescricao: $("clientJobDescription")?.value.trim() || "",
    vagaPreRequisito: $("clientJobRequirements")?.value.trim() || "",
    vagaRequisitos: $("clientJobRequirements")?.value.trim() || "",
    vagaSalario: $("clientJobSalary")?.value.trim() || "",
    vagaJornada: $("clientJobSchedule")?.value.trim() || "",
    vagaLocal: $("clientJobPlace")?.value.trim() || "",
    vagaContato: $("clientJobContact")?.value.trim() || "",
    vagaComoCandidatar: $("clientJobApply")?.value.trim() || "",
    vagaValidade: $("clientJobValidUntil")?.value || "",
    infoAdicional: $("clientInfo").value.trim(),
    observacaoAdmin: $("clientAdminNote").value.trim(),
    origem: "painel",
    editadoNoPainel: true,
    updatedAt: serverTimestamp(),
    updatedBy: state.user?.uid || ""
  };
}

function imagemPrincipalNovidade(payload = {}) {
  return payload.imagem || payload.image || payload.logo || payload.imagens?.[0] || payload.menuImages?.[0] || "";
}

function tituloConteudoNovidadeAdmin(tipo, payload = {}) {
  const key = normalizeName(tipo || "");
  if (key.includes("veiculo") || key.includes("automovel")) return [payload.marca, payload.modelo, payload.ano].filter(Boolean).join(" ") || "Veiculo";
  if (key.includes("imovel")) return payload.titulo || payload.endereco || "Imovel";
  if (key.includes("promoc")) return payload.titulo || "Promocao";
  if (key.includes("evento")) return payload.titulo || payload.nome || "Evento";
  if (key.includes("vaga")) return payload.titulo || payload.vagaTitulo || payload.vagaCargo || "Vaga de trabalho";
  if (key.includes("grupo")) return payload.nome || payload.titulo || "Grupo WhatsApp";
  return payload.nome || payload.titulo || "";
}

function acaoNovidadeAdmin(tipo, isNew, payload = {}, original = {}) {
  const key = normalizeName(tipo || "");
  if (key.includes("veiculo") || key.includes("automovel")) {
    if (isNew) return "Veiculo inserido";
    const antes = numberFromMoney(original.preco || original.valor || "");
    const agora = numberFromMoney(payload.preco || payload.valor || "");
    if (antes > 0 && agora > 0 && agora < antes) return "Preco abaixou";
    if (antes > 0 && agora > 0 && agora !== antes) return "Preco atualizado";
    return "Veiculo atualizado";
  }
  if (key.includes("imovel")) {
    if (isNew) return "Imovel inserido";
    const antes = numberFromMoney(original.valor || original.preco || "");
    const agora = numberFromMoney(payload.valor || payload.preco || "");
    if (antes > 0 && agora > 0 && agora < antes) return "Preco abaixou";
    if (antes > 0 && agora > 0 && agora !== antes) return "Preco atualizado";
    return "Imovel atualizado";
  }
  if (key.includes("promoc")) {
    if (isNew) return "Promocao inserida";
    const antes = numberFromMoney(original.preco || "");
    const agora = numberFromMoney(payload.preco || "");
    if (antes > 0 && agora > 0 && agora < antes) return "Preco da promocao abaixou";
    return "Promocao atualizada";
  }
  if (key.includes("vaga")) return isNew ? "Vaga de trabalho inserida" : "Vaga de trabalho atualizada";
  if (key.includes("evento")) return isNew ? "Evento inserido" : "Evento atualizado";
  if (key.includes("grupo")) return isNew ? "Grupo WhatsApp inserido" : "Grupo WhatsApp atualizado";
  return isNew ? "Cadastro novo" : "Cadastro atualizado";
}

async function registrarNovidadeAdmin(payload = {}) {
  try {
    const tipo = payload.tipo || payload.destinoTipo || "estabelecimento";
    const destinoId = payload.destinoId || payload.itemId || payload.estabelecimentoId || payload.clienteId || "";
    await removerNovidadesPorDestino(tipo, destinoId, payload.itemId || payload.destinoCardId || "");
    const id = `${slugify(tipo)}-${slugify(destinoId || payload.estabelecimento || payload.titulo || "item")}-${Date.now()}`;
    await update(ref(db, `novidades/${id}`), {
      tipo,
      titulo: payload.titulo || "Novidade adicionada",
      acao: payload.acao || payload.titulo || "Novidade adicionada",
      tituloConteudo: payload.tituloConteudo || payload.destinoTitulo || payload.nomeItem || "",
      descricao: payload.descricao || payload.titulo || "",
      estabelecimento: payload.estabelecimento || payload.clienteNome || "",
      imagem: payload.imagem || "",
      imagens: Array.isArray(payload.imagens) ? payload.imagens.filter(Boolean) : (payload.imagem ? [payload.imagem] : []),
      valor: payload.valor || "",
      categoria: payload.categoria || "",
      destinoTipo: payload.destinoTipo || tipo,
      destinoId,
      itemId: payload.itemId || "",
      destinoCardId: payload.destinoCardId || "",
      dataCriacao: serverTimestamp(),
      criadoPor: state.user?.uid || "",
      origem: "painel"
    });
  } catch (error) {
    console.warn("Nao foi possivel registrar novidade.", error);
  }
}

async function removerNovidadesPorDestino(tipo, destinoId, itemId = "") {
  try {
    const snap = await get(ref(db, "novidades"));
    if (!snap.exists()) return;
    const tipoNorm = normalizeName(tipo || "");
    const destino = String(destinoId || "");
    const item = String(itemId || "");
    const updates = {};
    snap.forEach((child) => {
      const novidade = child.val() || {};
      const novidadeTipo = normalizeName(novidade.destinoTipo || novidade.tipo || "");
      const mesmoTipo = !tipoNorm || novidadeTipo.includes(tipoNorm) || tipoNorm.includes(novidadeTipo);
      const mesmoDestino = destino && String(novidade.destinoId || "") === destino;
      const mesmoItem = item && (
        String(novidade.itemId || "") === item ||
        String(novidade.destinoCardId || "").includes(item) ||
        String(item).includes(String(novidade.itemId || "")) ||
        String(item).includes(String(novidade.destinoCardId || "")) ||
        String(novidade.id || "").includes(item)
      );
      if (mesmoTipo && (mesmoItem || (!item && mesmoDestino))) updates[`novidades/${child.key}`] = null;
      return false;
    });
    if (Object.keys(updates).length) await update(ref(db), updates);
  } catch (error) {
    console.warn("Nao foi possivel remover novidades antigas.", error);
  }
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
  if ($("clientCreci")) $("clientCreci").value = client.creci || client.registroCreci || "";
  $("clientNewCategory").value = "";
  atualizarVisibilidadeCreciCliente();
  $("clientStatus").value = client.status || "ativo";
  $("clientPaymentStatus").value = client.pagamentoStatus || "em_aberto";
  const contatos = normalizeClientContacts(client);
  $("clientContact").value = contatos[0] || "";
  $("clientWhatsapp").value = contatos[1] || "";
  if ($("clientContact3")) $("clientContact3").value = contatos[2] || "";
  $("clientAddress").value = client.endereco || client.address || "";
  $("clientHours").value = client.horario || client.hours || "";
  $("clientInstagram").value = client.instagram || "";
  $("clientFacebook").value = client.facebook || "";
  $("clientTiktok").value = client.tiktok || "";
  $("clientSite").value = client.site || "";
  $("clientFeaturedWeek").checked = Boolean(client.destaqueSemanal);
  if ($("clientFeaturedWeeks")) $("clientFeaturedWeeks").value = destaqueWeeksForClient(client);
  if ($("clientFeaturedBilling")) $("clientFeaturedBilling").value = destaqueBillingForClient(client);
  refreshClientFeaturedSummary();
  $("clientImage").value = client.imagem || client.image || "";
  renderProfilePreview("clientImage", "clientProfilePreview");
  state.clientImages = normalizeImageItems(client.imagens);
  renderScheduleEditor("clientScheduleEditor", client.horarios || {});
  if ($("clientMenuEnabled")) $("clientMenuEnabled").checked = Boolean(client.cardapioAtivo || client.menuAtivo || client.exibirCardapio || client.cardapioLink || (Array.isArray(client.menuImages) && client.menuImages.length));
  $("clientMenuLink").value = client.cardapioLink || "";
  state.clientMenuImages = normalizeUrlList(client.menuImages);
  state.clientPromocoes = normalizePromocoes(client.promocoes);
  if ($("clientJobActive")) $("clientJobActive").checked = client.vagaAtiva !== false && Boolean(client.infoVagaTrabalho || client.vagaTitulo || client.vagaCargo || client.vagaDescricao);
  if ($("clientJobTitle")) $("clientJobTitle").value = client.vagaTitulo || client.vagaCargo || "";
  if ($("clientJobDescription")) $("clientJobDescription").value = client.infoVagaTrabalho || client.vagaDescricao || "";
  if ($("clientJobRequirements")) $("clientJobRequirements").value = client.vagaPreRequisito || client.vagaRequisitos || "";
  if ($("clientJobSalary")) $("clientJobSalary").value = client.vagaSalario || "";
  if ($("clientJobSchedule")) $("clientJobSchedule").value = client.vagaJornada || "";
  if ($("clientJobPlace")) $("clientJobPlace").value = client.vagaLocal || "";
  if ($("clientJobContact")) $("clientJobContact").value = client.vagaContato || "";
  if ($("clientJobApply")) $("clientJobApply").value = client.vagaComoCandidatar || "";
  if ($("clientJobValidUntil")) $("clientJobValidUntil").value = client.vagaValidade || "";
  $("clientInfo").value = client.infoAdicional || "";
  $("clientAdminNote").value = client.observacaoAdmin || "";
  $("deleteClientButton").classList.remove("hidden");
  renderClientImagesPreview();
  renderClientMenuPreview();
  renderClientPromocoesPreview();
  setClientFocusMode(true);
}

function refreshClientFeaturedSummary() {
  const active = Boolean($("clientFeaturedWeek")?.checked);
  const weeks = destaqueWeeksForClient({ destaqueSemanas: $("clientFeaturedWeeks")?.value || 1 });
  const days = weeks * 7;
  const value = active ? destaqueValueForClient({ destaqueSemanas: weeks }) : 0;
  const end = active ? dateKeyFromDate(addDays(new Date(), days - 1)) : "";
  if ($("clientFeaturedValue")) $("clientFeaturedValue").value = value ? moneyBR(value) : "";
  if ($("clientFeaturedSummary")) {
    $("clientFeaturedSummary").textContent = active
      ? `${weeks} semana${weeks === 1 ? "" : "s"} (${days} dias) - ${moneyBR(value)} - valido ate ${formatDateBR(end)}. Se houver mais de 20 destaques ativos, a exibicao alterna por semana pela ordem de contratacao.`
      : `Valor definido pelo admin master: ${moneyBR(destaqueWeeklyValue())} por semana. Limite de 20 destaques exibidos por semana.`;
  }
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
  ["clientPromoTitle", "clientPromoPrice", "clientPromoDiscount", "clientPromoOldPrice", "clientPromoUnit", "clientPromoVolume", "clientPromoPack", "clientPromoStart", "clientPromoEnd", "clientPromoOfferType", "clientPromoFulfillment", "clientPromoPriceRange", "clientPromoPriceMode", "clientPromoObs", "clientPromoInstagramMsg", "clientPromoImageUrl"].forEach((id) => {
    if ($(id)) $(id).value = "";
  });
  if ($("clientPromoImageUpload")) $("clientPromoImageUpload").value = "";
  document.querySelectorAll("input[name='clientPromoWeekday']").forEach((input) => { input.checked = false; });
  if ($("addClientPromoButton")) $("addClientPromoButton").innerHTML = `<i class="fa-solid fa-plus"></i> Adicionar promocao`;
  $("cancelClientPromoEditButton")?.classList.add("hidden");
}

function clearPromoFields(prefix, scope = document) {
  ["Title", "Price", "Discount", "OldPrice", "Unit", "Volume", "Pack", "Start", "End", "OfferType", "Fulfillment", "PriceRange", "PriceMode", "Obs", "InstagramMsg", "ImageUrl"].forEach((suffix) => {
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
  set("OfferType", promo.tipoOferta);
  set("Fulfillment", promo.entregaRetirada);
  set("PriceRange", promo.faixaPreco);
  set("PriceMode", promo.modoPreco);
  set("Obs", promo.obs);
  set("InstagramMsg", promo.instagramMensagem);
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
    tipoOferta: get("OfferType"),
    entregaRetirada: get("Fulfillment"),
    faixaPreco: get("PriceRange"),
    modoPreco: get("PriceMode"),
    diasSemana: Array.from(scope.querySelectorAll(`input[name='${prefix}PromoWeekday']:checked`)).map((input) => Number(input.value)),
    obs: get("Obs"),
    instagramMensagem: get("InstagramMsg"),
    imagem: get("ImageUrl"),
    ativo: true
  };
}

function clearJobFields(prefix, scope = document) {
  ["Title", "Salary", "Schedule", "ValidUntil", "Place", "Contact", "Description", "Requirements", "Apply"].forEach((suffix) => {
    const field = scope.querySelector(`#${prefix}Job${suffix}`);
    if (field) field.value = "";
  });
  const active = scope.querySelector(`#${prefix}JobActive`);
  if (active) active.checked = true;
}

function fillJobFields(prefix, vaga, scope = document) {
  const set = (suffix, value) => {
    const field = scope.querySelector(`#${prefix}Job${suffix}`);
    if (field) field.value = value || "";
  };
  const active = scope.querySelector(`#${prefix}JobActive`);
  if (active) active.checked = vaga?.ativo !== false;
  set("Title", vaga?.titulo);
  set("Salary", vaga?.salario);
  set("Schedule", vaga?.jornada);
  set("ValidUntil", vaga?.validade);
  set("Place", vaga?.local);
  set("Contact", vaga?.contato);
  set("Description", vaga?.descricao);
  set("Requirements", vaga?.requisitos);
  set("Apply", vaga?.comoCandidatar);
}

function readJobFields(prefix, scope = document, fallbackId = "") {
  const get = (suffix) => scope.querySelector(`#${prefix}Job${suffix}`)?.value.trim() || "";
  return {
    id: fallbackId || `vaga-${Date.now()}`,
    ativo: scope.querySelector(`#${prefix}JobActive`)?.checked !== false,
    titulo: get("Title"),
    salario: get("Salary"),
    jornada: get("Schedule"),
    validade: scope.querySelector(`#${prefix}JobValidUntil`)?.value || "",
    local: get("Place"),
    contato: get("Contact"),
    descricao: get("Description"),
    requisitos: get("Requirements"),
    comoCandidatar: get("Apply")
  };
}

function renderVagasTrabalhoMarkup(vagas, removeAttr = "job-remove", editAttr = "job-edit") {
  const list = normalizeVagasTrabalho(vagas);
  if (!list.length) return `<div class="list-meta">Nenhuma vaga cadastrada ainda.</div>`;
  return list.map((vaga, index) => `
    <article class="promo-admin-item job-admin-item">
      <div class="promo-admin-empty"><i class="fa-solid fa-briefcase"></i></div>
      <div>
        <strong>${escapeHtml(vaga.titulo || "Vaga de trabalho")}</strong>
        <span>${escapeHtml([vaga.salario, vaga.validade ? `ate ${vaga.validade}` : ""].filter(Boolean).join(" - ") || "Sem salario/validade")}</span>
        ${vaga.descricao ? `<small>${escapeHtml(vaga.descricao)}</small>` : ""}
        ${vaga.ativo === false ? `<small>Inativa no site publico</small>` : ""}
      </div>
      <div class="promo-admin-actions">
        <button type="button" data-${editAttr}="${index}" class="ghost-mini"><i class="fa-solid fa-pen"></i> Editar</button>
        <button type="button" data-${removeAttr}="${index}" class="danger-mini"><i class="fa-solid fa-trash"></i> Remover</button>
      </div>
    </article>
  `).join("");
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
    button.addEventListener("click", async () => {
      const index = Number(button.dataset.clientPromoRemove);
      const promo = state.clientPromocoes[index];
      if (!promo || !(await confirmarExclusao(promo.titulo || "sem titulo", "promocao"))) return;
      state.clientPromocoes.splice(index, 1);
      state.clientPromoEditIndex = null;
      clearClientPromoFields();
      renderClientPromocoesPreview();
      const saved = await persistClientPromocoesIfEditing("Promocao removida e salva.");
      if (saved) await removerNovidadesPorDestino("promocao", normalizeName($("clientName")?.value.trim() || $("clientId")?.value || ""), promo.id || "");
      if (!saved) showToast("Promocao removida. Clique em salvar cliente para gravar.");
    });
  });
}

async function persistClientPromocoesIfEditing(message = "Promocoes salvas.") {
  if (!canManageClients() || !state.selectedClientId) return false;
  const client = state.clientes.find((item) => item.id === state.selectedClientId) || null;
  const targetId = client?.id || state.selectedClientId;
  await update(ref(db, `clientes/${targetId}`), {
    promocoes: normalizePromocoes(state.clientPromocoes),
    origem: "painel",
    editadoNoPainel: true,
    updatedAt: serverTimestamp(),
    updatedBy: state.user?.uid || ""
  });
  upsertClientInState(targetId, {
    ...(client || {}),
    promocoes: normalizePromocoes(state.clientPromocoes),
    origem: "painel",
    editadoNoPainel: true
  });
  showToast(message);
  return true;
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
  const saved = await persistClientPromocoesIfEditing(editingIndex >= 0 ? "Promocao atualizada e salva." : "Promocao adicionada e salva.");
  if (saved) {
    const acao = acaoNovidadeAdmin("promocao", editingIndex < 0, payload, current || {});
    await registrarNovidadeAdmin({
      tipo: "promocao",
      titulo: acao,
      acao,
      descricao: acao,
      tituloConteudo: tituloConteudoNovidadeAdmin("promocao", payload),
      estabelecimento: $("clientName")?.value.trim() || currentId,
      imagem: payload.imagem,
      valor: payload.preco || payload.desconto || payload.valorTexto || "",
      categoria: $("clientCategory")?.value || "",
      destinoTipo: "promocao",
      destinoId: normalizeName($("clientName")?.value.trim() || currentId),
      itemId: payload.id,
      destinoCardId: `promocao-${payload.id}-${normalizeName($("clientName")?.value.trim() || currentId)}`
    });
  }
  if (!saved) showToast(`${editingIndex >= 0 ? "Promocao atualizada" : "Promocao adicionada"}. Clique em salvar cliente para gravar.`);
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

function isClientOverdue(client) {
  if (!client || client.status === "inativo" || client.pagamentoStatus === "pago" || client.pagamentoStatus === "isento") return false;
  const today = new Date();
  const currentMonth = currentMonthKey();
  const hasPreviousPendingInvoice = pendingMonthsForClient(client).some((month) => month && month < currentMonth);
  const dueDay = Number(client.vencimentoDia);
  const hasExpiredDueDay = Number.isFinite(dueDay) && dueDay > 0 && dueDay < today.getDate();
  return hasPreviousPendingInvoice || hasExpiredDueDay;
}

function renderClientsList() {
  const box = $("clientsList");
  if (!box) return;

  const q = String($("clientSearch")?.value || "").toLowerCase().trim();
  const statusFilter = $("clientStatusFilter")?.value || "todos";
  const dueFilter = $("clientDueFilter")?.value || "todos";
  const typeFilter = $("clientTypeFilter")?.value || "todos";
  const list = state.clientes.filter((client) => {
    const hay = `${client.nome || ""} ${client.categoria || ""} ${client.contato || ""}`.toLowerCase();
    const matchesSearch = !q || hay.includes(q);
    const matchesStatus = statusFilter === "todos" || (client.status || "pendente") === statusFilter;
    const overdue = isClientOverdue(client);
    const matchesDue = dueFilter === "todos" || (dueFilter === "vencidos" ? overdue : !overdue);
    const matchesType = typeFilter === "todos" || (client.tipo || "comercio") === typeFilter;
    return matchesSearch && matchesStatus && matchesDue && matchesType;
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
  atualizarVisibilidadeCreciCliente();
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
    input.checked = ["dados", "destaque", "vagas", "imagens", "cardapio", "promocoes", "faturas"].includes(input.value);
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

function destaqueWeeklyValue() {
  const config = state.pagamentoSistema || {};
  return Number(config.valorDestaqueSemanal || config.destaqueSemanalValor || 0);
}

function destaqueWeekendValue() {
  const config = state.pagamentoSistema || {};
  return Number(config.valorDestaqueFimSemana || config.destaqueFimSemanaValor || 0);
}

function destaqueTypeForClient(client) {
  return client?.destaqueTipo || client?.destaquePeriodo || (client?.destaqueFimSemana ? "fim_semana" : "semanal");
}

function destaqueWeeksForClient(client) {
  const weeks = Number(client?.destaqueSemanas || client?.destaqueQtdSemanas || 1);
  return Math.max(1, Math.min(52, Number.isFinite(weeks) ? Math.round(weeks) : 1));
}

function destaqueDaysForClient(client) {
  return destaqueTypeForClient(client) === "fim_semana"
    ? destaqueWeeksForClient(client) * 2
    : destaqueWeeksForClient(client) * 7;
}

function destaqueValueForClient(client) {
  const valorCliente = Number(client?.destaqueValor || 0);
  if (valorCliente > 0) return valorCliente;
  const unitValue = destaqueTypeForClient(client) === "fim_semana"
    ? destaqueWeekendValue()
    : destaqueWeeklyValue();
  return unitValue * destaqueWeeksForClient(client);
}

function destaqueBillingForClient(client) {
  return client?.destaqueCobranca || client?.destaqueFormaPagamento || "mensalidade";
}

function destaqueIncludedInInvoice(client) {
  return destaqueIsActive(client) && destaqueBillingForClient(client) === "mensalidade";
}

function destaqueEndDateForClient(client) {
  if (client?.destaqueFim) return client.destaqueFim;
  if (!client?.destaqueInicio) return "";
  const start = new Date(`${client.destaqueInicio}T12:00:00`);
  if (Number.isNaN(start.getTime())) return "";
  return dateKeyFromDate(addDays(start, destaqueDaysForClient(client) - 1));
}

function destaqueIsActive(client) {
  if (!client?.destaqueSemanal) return false;
  const end = destaqueEndDateForClient(client);
  return !end || end >= dateKeyFromDate(new Date());
}

function destaqueTxidForClient(client) {
  return `DST${normalizeName(client?.nome || client?.id || "CLIENTE").slice(0, 10).toUpperCase()}${Date.now().toString().slice(-6)}`;
}

function valorTotalFaturaCliente(client) {
  return valorFinalPlano(client) + (destaqueIncludedInInvoice(client) ? destaqueValueForClient(client) : 0);
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

function invoiceDueDateForMonth(client, monthKey = currentMonthKey()) {
  const [year, month] = String(monthKey || currentMonthKey()).split("-").map(Number);
  if (!year || !month) return "";
  const lastDay = new Date(year, month, 0).getDate();
  const configuredDay = Number(client?.vencimentoDia);
  const dueDay = Number.isFinite(configuredDay) && configuredDay > 0 ? Math.min(configuredDay, lastDay) : lastDay;
  return dateKeyFromDate(new Date(year, month - 1, dueDay));
}

function clientHasOpenMonthlyInvoice(client) {
  if (!client || canManageClients()) return false;
  if ((client.tipoPlano || "mensal") !== "mensal") return false;
  if (client.status === "inativo" || client.pagamentoStatus === "pago" || client.pagamentoStatus === "isento") return false;
  return pendingMonthsForClient(client).length > 0;
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
  const valorDestaque = savedDestaque > 0 ? savedDestaque : (destaqueIncludedInInvoice(client) ? destaqueValueForClient(client) : 0);
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
    dueDate: saved.vencimento || saved.dataVencimento || invoiceDueDateForMonth(client, mes),
    valorPlano,
    valorDestaque,
    valorTotal,
    pixCode,
    qrUrl: qrCodeUrl(pixCode)
  };
}

function buildDestaquePix(client, paymentConfig = {}) {
  const valorDestaque = destaqueValueForClient(client);
  const pixCode = gerarPixCopiaCola({
    chave: paymentConfig.pixChave,
    nome: paymentConfig.pixNome || "Ola Carlopolis",
    cidade: paymentConfig.pixCidade || "CARLOPOLIS",
    valor: valorDestaque,
    txid: destaqueTxidForClient(client)
  });
  return {
    valorDestaque,
    pixCode,
    qrUrl: qrCodeUrl(pixCode),
    semanas: destaqueWeeksForClient(client),
    dias: destaqueDaysForClient(client),
    inicio: client?.destaqueInicio || dateKeyFromDate(new Date()),
    fim: destaqueEndDateForClient(client)
  };
}

function bindFeaturedInvoicePix(featuredPix) {
  if (!featuredPix) return;
  $("generateFeaturedInvoicePix")?.addEventListener("click", () => {
    if (!featuredPix.pixCode) {
      showToast("Nao foi possivel gerar o Pix do destaque.");
      return;
    }
    if ($("featuredInvoicePixCode")) $("featuredInvoicePixCode").value = featuredPix.pixCode;
    if ($("featuredInvoiceQr")) $("featuredInvoiceQr").src = featuredPix.qrUrl;
    $("featuredInvoicePixBox")?.classList.remove("hidden");
    showToast("Pix do destaque gerado.");
  });
  $("copyFeaturedInvoicePix")?.addEventListener("click", async () => {
    await navigator.clipboard?.writeText($("featuredInvoicePixCode")?.value || featuredPix.pixCode || "");
    showToast("Codigo Pix do destaque copiado.");
  });
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

  box.innerHTML = list.map((evento) => {
    const realizado = eventAlreadyDone(evento);
    return `
    <article class="list-card event-card${realizado ? " event-card-done" : ""}">
      ${evento.imagem ? `<img src="${escapeAttr(displayImageUrl(evento.imagem))}" alt="${escapeAttr(evento.titulo || "Evento")}" ${lazyImageAttrs()} ${imageFallbackAttr()}>` : ""}
      <div class="list-title">${escapeHtml(evento.titulo || evento.id)}</div>
      <div class="event-date-row"><i class="fa-solid fa-calendar-days"></i><strong>${escapeHtml(displayEventDate(eventRawDate(evento)))}</strong>${evento.horario ? `<span>${escapeHtml(evento.horario)}</span>` : ""}</div>
      ${realizado ? `<div class="event-done-note"><i class="fa-solid fa-circle-check"></i> Evento ja realizado</div>` : ""}
      <div class="list-meta">${escapeHtml(evento.clienteNome || "Sem cliente")} - ${escapeHtml(evento.origem === "script.js" ? "Base inicial" : "Firebase")}</div>
      <div class="list-meta">${escapeHtml(evento.local || "Sem local")}</div>
      <span class="badge ${escapeAttr(evento.status || "ativo")}">${eventStatusLabel(evento.status)}</span>
      <button type="button" data-edit-event="${escapeAttr(evento.id)}">Editar</button>
    </article>
  `;
  }).join("");

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
  $("automovelPreco").value = formatExistingCurrency(item.preco || "");
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
    const hay = `${item.codRef || ""} ${item.codigo || ""} ${item.tipo || ""} ${item.marca || ""} ${item.modelo || ""} ${item.ano || ""} ${item.preco || ""} ${item.vendedor || ""} ${item.loja || ""}`.toLowerCase();
    return !q || hay.includes(q);
  });
  if (!list.length) {
    box.innerHTML = `<div class="list-meta">Nenhum automovel cadastrado.</div>`;
    return;
  }
  box.innerHTML = list.map((item) => {
    const titulo = [item.marca, item.modelo].filter(Boolean).join(" ") || item.id;
    const codigoRef = item.codRef || item.codigo || item.id || "";
    return `
      <article class="list-card event-card">
        ${item.imagem ? `<img src="${escapeAttr(displayImageUrl(item.imagem))}" alt="${escapeAttr(titulo)}" ${lazyImageAttrs()} ${imageFallbackAttr()}>` : ""}
        <div class="list-title">${escapeHtml(titulo)}</div>
        <div class="list-meta"><strong>Codigo de referencia:</strong> ${escapeHtml(codigoRef || "Sem codigo")}</div>
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
  $("imovelValor").value = formatExistingCurrency(item.valor || "");
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
  $("imovelTelefone").value = telefoneArteAdmin(item.telefone || item.contato || "");
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

async function gerarCodigoReferenciaIncremental(tipo) {
  const config = {
    imovel: { path: "contadores/codigosReferencia/imoveis", prefix: "Imv_" },
    automovel: { path: "contadores/codigosReferencia/automoveis", prefix: "car_" }
  }[tipo];
  if (!config) throw new Error("Tipo de codigo de referencia invalido.");
  const counterRef = ref(db, config.path);
  const result = await runTransaction(counterRef, (current) => (Number(current) || 0) + 1);
  const next = Number(result.snapshot.val()) || 1;
  return `${config.prefix}${next}`;
}

function getImovelFormData() {
  const titulo = $("imovelTitulo").value.trim();
  const id = $("imovelId").value || `${slugify(titulo || "imovel")}-${Date.now()}`;
  const imagens = [...state.imovelImages].filter(Boolean);
  const imagem = $("imovelImagem")?.value.trim() || imagens[0] || "";
  const linkedClient = currentClientRecord();
  const corretor = $("imovelCorretor").value.trim() || linkedClient?.nome || "";
  const telefone = telefoneArteAdmin($("imovelTelefone").value.trim() || linkedClient?.whatsapp || linkedClient?.contato || "");
  return {
    id,
    titulo,
    tipo: $("imovelTipo").value,
    procura: $("imovelProcura").value,
    status: $("imovelStatus").value,
    valor: numberFromMoney($("imovelValor").value),
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

const IMOVEL_ARTE_LAYOUTS = {
  navyGold: { nome: "Azul marinho e dourado", bg: "#03152d", panel: "#071f3e", accent: "#f5c451", accent2: "#fff0ad", action: "#16a34a", text: "#ffffff" },
  blackRed: { nome: "Preto e vermelho", bg: "#111111", panel: "#202020", accent: "#ef4444", accent2: "#fecaca", action: "#dc2626", text: "#ffffff" },
  graphiteCyan: { nome: "Grafite e azul ciano", bg: "#18212b", panel: "#263442", accent: "#22d3ee", accent2: "#cffafe", action: "#0891b2", text: "#ffffff" },
  forestGold: { nome: "Verde floresta e dourado", bg: "#092b25", panel: "#123f36", accent: "#f4c95d", accent2: "#fff1b5", action: "#16a34a", text: "#ffffff" },
  purpleGold: { nome: "Roxo profundo e dourado", bg: "#27113f", panel: "#3b1b59", accent: "#f6c85f", accent2: "#fff0b0", action: "#7c3aed", text: "#ffffff" },
  petrolOrange: { nome: "Azul petroleo e laranja", bg: "#07333c", panel: "#0c4a56", accent: "#fb923c", accent2: "#ffedd5", action: "#ea580c", text: "#ffffff" },
  cs: { nome: "CS", model: "cs", bg: "#101010", panel: "#111111", accent: "#e30613", accent2: "#ffffff", action: "#e30613", text: "#ffffff" }
};

function donoImovelAdmin(item = {}) {
  const candidatos = [
    item.clienteId,
    item.estabelecimentoId,
    item.clienteNome,
    item.corretor,
    item.vendedor,
    item.proprietario
  ].map((valor) => normalizeName(valor || "")).filter(Boolean);
  const cliente = state.clientes.find((client) => {
    const ids = [client.id, client.nome, client.name, client.nomeNormalizado]
      .map((valor) => normalizeName(valor || ""))
      .filter(Boolean);
    return ids.some((id) => candidatos.some((cand) => id === cand || id.includes(cand) || cand.includes(id)));
  }) || currentClientRecord();
  return cliente || {
    nome: item.clienteNome || item.corretor || "Ola Carlopolis",
    imagem: ""
  };
}

function logoClienteImovelAdmin(client = {}) {
  return displayImageUrl(client.imagem || imageUrl(client.imagens?.[0]) || client.logo || client.logoUrl || "../images/img_padrao_site/logo_1.png");
}

function normalizarImagemArteAdmin(valor) {
  if (!valor) return "";
  const url = typeof valor === "string"
    ? valor
    : (imageUrl(valor) || valor.url || valor.src || valor.imagem || valor.image || "");
  const raw = String(url || "").trim();
  if (!raw) return "";
  if (/^(https?:|data:|blob:|\/|\.\.?\/)/i.test(raw)) return raw;
  return displayImageUrl(raw);
}

function imovelImagensCandidatasAdmin(item = {}) {
  const imagens = Array.isArray(item.imagens) ? item.imagens : [];
  const candidatos = [
    ...imagens,
    item.imagem,
    item.image,
    item.foto
  ];
  return [...new Set(candidatos.map(normalizarImagemArteAdmin).filter(Boolean))];
}

function imovelImagemPrincipalAdmin(item = {}) {
  return imovelImagensCandidatasAdmin(item)[0] || "../images/img_padrao_site/logo_1.png";
}

function imagemCanvasUrlAdmin(url) {
  const resolved = /^(data:|blob:)/i.test(url)
    ? url
    : new URL(url, window.location.href).toString();
  if (!isFirebaseStorageUrl(resolved)) return resolved;

  const proxyOrigin = /^(localhost|127\.0\.0\.1)$/i.test(window.location.hostname)
    ? "https://www.olacarlopolis.com"
    : window.location.origin;
  return `${proxyOrigin}/api/image-proxy?url=${encodeURIComponent(resolved)}`;
}

function formatarValorArteImovel(valor) {
  if (valor === undefined || valor === null || String(valor).trim() === "") return "Consulte";
  return moneyBR(typeof valor === "number" ? valor : numberFromMoney(valor));
}

function textoCurtoArte(valor, limite = 72) {
  const texto = String(valor || "").replace(/\s+/g, " ").trim();
  return texto.length > limite ? `${texto.slice(0, limite - 3)}...` : texto;
}

function imagemDeBlobCanvas(blob) {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(blob);
    const img = new Image();
    const timeout = window.setTimeout(() => {
      URL.revokeObjectURL(objectUrl);
      resolve(null);
    }, 12000);
    img.onload = () => {
      window.clearTimeout(timeout);
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = () => {
      window.clearTimeout(timeout);
      URL.revokeObjectURL(objectUrl);
      resolve(null);
    };
    img.src = objectUrl;
  });
}

async function carregarImagemCanvas(url) {
  const src = normalizarImagemArteAdmin(url);
  if (!src) return null;
  const resolved = imagemCanvasUrlAdmin(src);
  const controller = new AbortController();
  const fetchTimeout = window.setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(resolved, {
      mode: "cors",
      cache: "no-store",
      signal: controller.signal
    });
    if (response.ok) {
      const imagem = await imagemDeBlobCanvas(await response.blob());
      if (imagem) return imagem;
    }
  } catch (error) {
    console.warn("Falha ao buscar imagem para a arte.", resolved, error);
  } finally {
    window.clearTimeout(fetchTimeout);
  }
  return new Promise((resolve) => {
    const img = new Image();
    const timeout = window.setTimeout(() => resolve(null), 12000);
    img.crossOrigin = "anonymous";
    img.onload = () => {
      window.clearTimeout(timeout);
      resolve(img);
    };
    img.onerror = () => {
      window.clearTimeout(timeout);
      resolve(null);
    };
    img.src = resolved;
  });
}

async function carregarPrimeiraImagemCanvas(urls = []) {
  for (const url of urls) {
    const imagem = await carregarImagemCanvas(url);
    if (imagem) return imagem;
  }
  return null;
}

function canvasParaBlob(canvas) {
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("O navegador nao retornou a imagem gerada."));
      }, "image/png");
    } catch (error) {
      reject(error);
    }
  });
}

function baixarBlobCanvas(blob, nomeArquivo) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nomeArquivo;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  window.setTimeout(() => {
    link.remove();
    URL.revokeObjectURL(url);
  }, 1500);
}

function canvasRoundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function preencherRoundRect(ctx, x, y, w, h, r, fill) {
  canvasRoundRect(ctx, x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
}

function desenharImagemCover(ctx, img, x, y, w, h, r = 0) {
  if (!img) {
    preencherRoundRect(ctx, x, y, w, h, r, "#dbeafe");
    ctx.fillStyle = "#2563eb";
    ctx.font = "900 54px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Ola Carlopolis", x + w / 2, y + h / 2);
    return;
  }
  const scale = Math.max(w / img.width, h / img.height);
  const sw = w / scale;
  const sh = h / scale;
  const sx = (img.width - sw) / 2;
  const sy = (img.height - sh) / 2;
  ctx.save();
  if (r) {
    canvasRoundRect(ctx, x, y, w, h, r);
    ctx.clip();
  }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  ctx.restore();
}

function desenharImagemContain(ctx, img, x, y, w, h, r = 0, fill = "#ffffff") {
  preencherRoundRect(ctx, x, y, w, h, r, fill);
  if (!img) return;
  const scale = Math.min(w / img.width, h / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  ctx.save();
  if (r) {
    canvasRoundRect(ctx, x, y, w, h, r);
    ctx.clip();
  }
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  ctx.restore();
}

function textoQuebradoCanvas(ctx, texto, x, y, maxWidth, lineHeight, maxLines = 3) {
  const words = String(texto || "").split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  words.forEach((word) => {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  });
  if (line) lines.push(line);
  const finalLines = lines.slice(0, maxLines);
  if (lines.length > maxLines) finalLines[maxLines - 1] = `${finalLines[maxLines - 1].replace(/\.*$/, "")}...`;
  finalLines.forEach((l, idx) => ctx.fillText(l, x, y + idx * lineHeight));
  return finalLines.length * lineHeight;
}

function linhasCanvas(ctx, texto, maxWidth) {
  const words = String(texto || "").split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  words.forEach((word) => {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  });
  if (line) lines.push(line);
  return lines;
}

function desenharTextoInteiroCanvas(ctx, texto, x, y, maxWidth, maxLines, options = {}) {
  const content = String(texto || "").trim();
  if (!content) return 0;
  const {
    peso = 800,
    tamanho = 18,
    minimo = 10,
    lineHeight = 20,
    familia = "Arial",
    align = "center",
    blockHeight = 0
  } = options;
  let fontSize = tamanho;
  let lines = [];
  do {
    ctx.font = `${peso} ${fontSize}px ${familia}`;
    lines = linhasCanvas(ctx, content, maxWidth);
    if (lines.length <= maxLines) break;
    fontSize -= 1;
  } while (fontSize > minimo);

  const fittedLineHeight = Math.max(minimo + 3, Math.round(lineHeight * (fontSize / tamanho)));
  ctx.textAlign = align;
  const startY = blockHeight
    ? y + (blockHeight - lines.length * fittedLineHeight) / 2 + fontSize * .82
    : y;
  lines.forEach((line, index) => {
    ctx.fillText(line, x, startY + index * fittedLineHeight, maxWidth);
  });
  return lines.length * fittedLineHeight;
}

function telefoneArteAdmin(value) {
  const original = String(value || "").trim();
  const rawDigits = original.replace(/\D/g, "");
  let digits = rawDigits.length > 11 && rawDigits.startsWith("55")
    ? rawDigits.slice(2)
    : rawDigits;
  if (digits.length > 10 && digits.startsWith("0")) digits = digits.slice(1);
  digits = digits.slice(0, 11);
  if (digits.length < 10) return original;
  return formatPhoneMask(digits);
}

function desenharPillCanvas(ctx, texto, x, y, fill, color = "#fff") {
  ctx.font = "900 30px Arial";
  const w = ctx.measureText(texto).width + 42;
  preencherRoundRect(ctx, x, y, w, 52, 26, fill);
  ctx.fillStyle = color;
  ctx.textAlign = "left";
  ctx.fillText(texto, x + 21, y + 36);
  return w;
}

function caracteristicasArteImovel(item = {}) {
  const dados = [];
  if (item.quartos) dados.push(`${item.quartos} quartos`);
  if (item.banheiros) dados.push(`${item.banheiros} banheiros`);
  if (item.vagas) dados.push(`${item.vagas} vagas`);
  if (item.area) dados.push(`${item.area}m2`);
  if (item.construcao) dados.push(`${item.construcao}m2 constr.`);
  if (item.piscina) dados.push("piscina");
  if (item.churrasqueira) dados.push("churrasqueira");
  if (item.outros) dados.push(String(item.outros));
  return dados.slice(0, 4);
}

function dadosModelCs(item = {}) {
  const dados = [];
  const add = (icone, principal, secundario = "") => {
    if (principal === undefined || principal === null || String(principal).trim() === "") return;
    dados.push({ icone, principal: String(principal), secundario: String(secundario || "") });
  };
  if (item.construcao) add("AC", `${item.construcao}m2`, "construcao");
  if (item.area) add("AT", `${item.area}m2`, "area total");
  if (item.quartos) add("Q", `${item.quartos} quarto${Number(item.quartos) === 1 ? "" : "s"}`, item.suite ? `${item.suite} suite${Number(item.suite) === 1 ? "" : "s"}` : "");
  if (item.salas) add("S", `${item.salas} sala${Number(item.salas) === 1 ? "" : "s"}`, item.cozinhas ? `${item.cozinhas} cozinha${Number(item.cozinhas) === 1 ? "" : "s"}` : "");
  if (item.endereco) add("L", textoCurtoArte(item.endereco, 28), "localizacao");
  if (item.outros) add("+", textoCurtoArte(item.outros, 24), "");
  if (item.vagas) add("V", `${item.vagas} vaga${Number(item.vagas) === 1 ? "" : "s"}`, "");
  if (item.banheiros) add("B", `${item.banheiros} banheiro${Number(item.banheiros) === 1 ? "" : "s"}`, "");
  return dados.slice(0, 6);
}

function desenharInfoModelCs(ctx, info, x, y, maxWidth = 300) {
  ctx.fillStyle = "#050505";
  ctx.beginPath();
  ctx.arc(x + 24, y + 24, 24, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = "900 17px Arial";
  ctx.textAlign = "center";
  ctx.fillText(info.icone, x + 24, y + 30);
  ctx.textAlign = "left";
  ctx.fillStyle = "#090909";
  ctx.font = "900 28px Arial";
  ctx.fillText(textoCurtoArte(info.principal, 24), x + 60, y + 22, maxWidth - 60);
  if (info.secundario) {
    ctx.font = "800 23px Arial";
    ctx.fillText(textoCurtoArte(info.secundario, 27), x + 60, y + 49, maxWidth - 60);
  }
}

function desenharModeloCs(ctx, item, client, foto, logo, siteLogo) {
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, 1080, 1350);
  ctx.fillStyle = "#111111";
  ctx.fillRect(0, 0, 1080, 1230);
  ctx.fillStyle = "#e30613";
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(78, 0);
  ctx.lineTo(0, 88);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.moveTo(660, 0);
  ctx.lineTo(1080, 0);
  ctx.lineTo(1080, 252);
  ctx.quadraticCurveTo(910, 254, 838, 214);
  ctx.quadraticCurveTo(740, 158, 690, 58);
  ctx.closePath();
  ctx.fill();
  desenharImagemContain(ctx, logo, 744, 28, 270, 136, 0, "#ffffff");
  ctx.fillStyle = "#111111";
  ctx.textAlign = "center";
  const nome = String(client?.nome || item.clienteNome || item.corretor || "CESAR MELO");
  fonteQueCabeCanvas(ctx, nome.toUpperCase(), 900, 30, 18, 300);
  ctx.fillText(nome.toUpperCase(), 880, 178);
  ctx.font = "800 17px Arial";
  ctx.fillText("CORRETOR DE IMOVEIS", 880, 205);

  const procura = String(item.procura || "CASA").toUpperCase();
  ctx.textAlign = "left";
  ctx.fillStyle = "#e30613";
  fonteQueCabeCanvas(ctx, procura, 900, 82, 48, 470);
  ctx.fillText(procura, 72, 110);
  ctx.fillStyle = "#ffffff";
  ctx.font = "900 82px Arial";
  ctx.fillText("SUPER", 72, 205);
  ctx.font = "900 40px Arial";
  ctx.fillText("ACONCHEGANTE", 72, 257);
  ctx.strokeStyle = "#e30613";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(72, 272);
  ctx.lineTo(522, 272);
  ctx.stroke();
  ctx.fillStyle = "#d8d8d8";
  ctx.font = "500 24px Arial";
  ctx.fillText("CONFORTO, ESPACO E QUALIDADE", 72, 314);
  ctx.fillText("PARA SUA FAMILIA!", 72, 346);

  desenharImagemCover(ctx, foto, 336, 350, 744, 678, 0);
  const imgGrad = ctx.createLinearGradient(336, 350, 540, 350);
  imgGrad.addColorStop(0, "#111111");
  imgGrad.addColorStop(1, "rgba(17,17,17,0)");
  ctx.fillStyle = imgGrad;
  ctx.fillRect(336, 350, 245, 678);

  const endereco = textoCurtoArte(item.endereco || "CARLOPOLIS - PR", 28).toUpperCase();
  preencherRoundRect(ctx, 795, 292, 250, 48, 24, "#e30613");
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.font = "900 22px Arial";
  ctx.fillText(endereco.includes("CARLOPOLIS") ? "CARLOPOLIS - PR" : endereco, 920, 324);

  const infos = dadosModelCs(item);
  preencherRoundRect(ctx, 36, 405, 300, 626, 20, "#101010");
  desenharBordaRoundRect(ctx, 36, 405, 300, 626, 20, "#e30613", 5);
  infos.slice(0, 7).forEach((info, index) => {
    const y = 438 + index * 83;
    if (index) {
      ctx.strokeStyle = "rgba(255,255,255,.24)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(98, y - 28);
      ctx.lineTo(310, y - 28);
      ctx.stroke();
    }
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(78, y, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#e30613";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = "#e30613";
    ctx.textAlign = "center";
    ctx.font = "900 18px Arial";
    ctx.fillText(info.icone, 78, y + 6);
    ctx.fillStyle = "#ffffff";
    desenharTextoInteiroCanvas(ctx, `${info.principal}${info.secundario ? ` ${info.secundario}` : ""}`.toUpperCase(), 124, y - 27, 178, 3, {
      peso: 900,
      tamanho: 18,
      minimo: 12,
      lineHeight: 18,
      align: "left"
    });
  });

  ctx.fillStyle = "#111111";
  ctx.fillRect(0, 1030, 1080, 178);
  ctx.fillStyle = "#e30613";
  ctx.beginPath();
  ctx.moveTo(570, 1030);
  ctx.lineTo(1080, 1030);
  ctx.lineTo(1080, 1208);
  ctx.lineTo(520, 1208);
  ctx.lineTo(590, 1030);
  ctx.closePath();
  ctx.fill();
  const valor = formatarValorArteImovel(item.valor);
  const valorLimpo = valor === "Consulte" ? "CONSULTE" : valor.replace("R$", "").trim();
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "left";
  ctx.font = "900 22px Arial";
  ctx.fillText("APENAS", 610, 1092);
  ctx.font = "900 30px Arial";
  ctx.fillText("R$", 610, 1140);
  ctx.textAlign = "center";
  fonteQueCabeCanvas(ctx, valorLimpo, 900, 108, 52, 340);
  ctx.fillText(valorLimpo, 815, 1162);

  ctx.fillStyle = "#e30613";
  ctx.beginPath();
  ctx.arc(82, 1118, 38, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = "900 42px Arial";
  ctx.textAlign = "center";
  ctx.fillText("•", 82, 1128);
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "left";
  ctx.font = "500 25px Arial";
  ctx.fillText("LOCALIZACAO", 140, 1102);
  ctx.font = "900 30px Arial";
  ctx.fillText(endereco, 140, 1144);

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 1208, 1080, 142);
  const rodape = [
    ["✓", "DOCUMENTACAO", "REGULARIZADA"],
    ["OK", "COMPRA SEGURA E", "TRANSPARENTE"],
    ["→", "PRONTO PARA", "MORAR"]
  ];
  rodape.forEach(([icon, a, b], index) => {
    const x = 170 + index * 330;
    ctx.fillStyle = "#e30613";
    ctx.textAlign = "center";
    ctx.font = "900 34px Arial";
    ctx.fillText(icon, x - 64, 1285);
    ctx.fillStyle = "#111111";
    ctx.textAlign = "left";
    ctx.font = "900 16px Arial";
    ctx.fillText(a, x - 18, 1278);
    ctx.fillText(b, x - 18, 1302);
  });
  desenharImagemContain(ctx, siteLogo, 828, 1218, 180, 86, 0, "#ffffff");
}

function desenharIconeCaracteristicaCs(ctx, id, cx, cy, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2.8;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const line = (...points) => {
    ctx.beginPath();
    points.forEach(([x, y], index) => index ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
    ctx.stroke();
  };
  if (["quartos", "suite"].includes(id)) {
    ctx.strokeRect(cx - 13, cy, 26, 9);
    ctx.strokeRect(cx - 12, cy - 8, 9, 8);
    line([cx - 13, cy + 9], [cx - 13, cy + 14], [cx - 9, cy + 14]);
    line([cx + 13, cy + 9], [cx + 13, cy + 14], [cx + 9, cy + 14]);
  } else if (id === "banheiros") {
    ctx.beginPath();
    ctx.arc(cx - 6, cy - 7, 4, 0, Math.PI * 2);
    ctx.stroke();
    line([cx - 13, cy + 1], [cx + 13, cy + 1], [cx + 10, cy + 11], [cx - 10, cy + 11], [cx - 13, cy + 1]);
  } else if (id === "vagas") {
    ctx.strokeRect(cx - 14, cy - 6, 28, 13);
    line([cx - 10, cy - 6], [cx - 5, cy - 12], [cx + 7, cy - 12], [cx + 12, cy - 6]);
    [cx - 8, cx + 8].forEach((x) => {
      ctx.beginPath();
      ctx.arc(x, cy + 9, 3, 0, Math.PI * 2);
      ctx.fill();
    });
  } else if (["area", "construcao"].includes(id)) {
    ctx.strokeRect(cx - 12, cy - 12, 24, 24);
    line([cx - 17, cy - 8], [cx - 17, cy - 17], [cx - 8, cy - 17]);
    line([cx + 17, cy + 8], [cx + 17, cy + 17], [cx + 8, cy + 17]);
  } else if (id === "cozinhas") {
    ctx.strokeRect(cx - 14, cy - 11, 28, 22);
    ctx.beginPath();
    ctx.arc(cx - 6, cy - 3, 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx + 6, cy - 3, 4, 0, Math.PI * 2);
    ctx.stroke();
    line([cx - 9, cy + 6], [cx + 9, cy + 6]);
  } else if (id === "salas") {
    ctx.strokeRect(cx - 14, cy - 3, 28, 13);
    ctx.strokeRect(cx - 11, cy - 11, 22, 10);
    line([cx - 14, cy + 10], [cx - 14, cy + 15]);
    line([cx + 14, cy + 10], [cx + 14, cy + 15]);
  } else if (id === "piscina") {
    line([cx - 15, cy - 5], [cx - 7, cy - 8], [cx, cy - 5], [cx + 7, cy - 8], [cx + 15, cy - 5]);
    line([cx - 15, cy + 4], [cx - 7, cy + 1], [cx, cy + 4], [cx + 7, cy + 1], [cx + 15, cy + 4]);
  } else if (id === "churrasqueira") {
    ctx.beginPath();
    ctx.arc(cx, cy - 3, 12, 0, Math.PI);
    ctx.stroke();
    line([cx - 9, cy + 1], [cx - 5, cy + 14]);
    line([cx + 9, cy + 1], [cx + 5, cy + 14]);
    line([cx - 12, cy - 3], [cx + 12, cy - 3]);
  } else if (id === "quintal") {
    line([cx, cy + 14], [cx, cy - 4]);
    ctx.beginPath();
    ctx.arc(cx - 7, cy - 6, 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx + 7, cy - 8, 8, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(cx, cy, 12, 0, Math.PI * 2);
    ctx.stroke();
    line([cx - 6, cy], [cx + 6, cy]);
    line([cx, cy - 6], [cx, cy + 6]);
  }
  ctx.restore();
}

function desenharIconeRodapeCs(ctx, index, cx, cy, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2.8;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (index === 0) {
    ctx.beginPath();
    ctx.moveTo(cx, cy - 15);
    ctx.lineTo(cx + 13, cy - 9);
    ctx.lineTo(cx + 10, cy + 9);
    ctx.lineTo(cx, cy + 16);
    ctx.lineTo(cx - 10, cy + 9);
    ctx.lineTo(cx - 13, cy - 9);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - 6, cy);
    ctx.lineTo(cx - 1, cy + 5);
    ctx.lineTo(cx + 7, cy - 5);
    ctx.stroke();
  } else if (index === 1) {
    ctx.beginPath();
    ctx.moveTo(cx - 16, cy - 2);
    ctx.lineTo(cx - 7, cy - 9);
    ctx.lineTo(cx, cy - 4);
    ctx.lineTo(cx + 7, cy - 9);
    ctx.lineTo(cx + 16, cy - 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - 16, cy - 2);
    ctx.lineTo(cx - 6, cy + 11);
    ctx.lineTo(cx, cy + 6);
    ctx.lineTo(cx + 6, cy + 11);
    ctx.lineTo(cx + 16, cy - 2);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(cx - 6, cy - 2, 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + 2, cy - 2);
    ctx.lineTo(cx + 17, cy - 2);
    ctx.lineTo(cx + 17, cy + 5);
    ctx.moveTo(cx + 10, cy - 2);
    ctx.lineTo(cx + 10, cy + 5);
    ctx.stroke();
  }
  ctx.restore();
}

function desenharModeloCsQuadrado(ctx, item, client, foto, logo, siteLogo, options = {}) {
  const red = "#e30613";
  const black = "#101010";
  const city = String(item.cidade || "CARLOPOLIS - PR").trim().toUpperCase();
  const titleParts = String(options.title || tituloAutomaticoCs(item)).trim().toUpperCase().split(/\s+/).filter(Boolean);
  const titleWord = String(item.procura || "IMOVEL").trim().toUpperCase();
  if (normalizeName(titleParts[0] || "") === normalizeName(titleWord)) titleParts.shift();
  const titleSecond = titleParts.shift() || "SUPER";
  const titleThird = titleParts.join(" ");
  const brokerName = String(item.corretor || client?.nome || item.clienteNome || item.proprietario || "").trim();
  const broker = (brokerName || "ANUNCIANTE").toUpperCase();
  const brokerRole = item.corretor || client?.nome ? "CORRETOR DE IMOVEIS" : "ANUNCIANTE";
  const creci = String(item.creci || client?.creci || client?.registroCreci || "").trim().toUpperCase();

  ctx.fillStyle = black;
  ctx.fillRect(0, 0, 1080, 1080);
  ctx.save();
  ctx.filter = "brightness(1.1) contrast(1.04)";
  desenharImagemCover(ctx, foto, 0, 0, 1080, 960, 0);
  ctx.restore();

  const photoShade = ctx.createLinearGradient(0, 0, 600, 0);
  photoShade.addColorStop(0, "rgba(16,16,16,.94)");
  photoShade.addColorStop(.62, "rgba(16,16,16,.68)");
  photoShade.addColorStop(1, "rgba(16,16,16,0)");
  ctx.fillStyle = photoShade;
  ctx.fillRect(0, 0, 620, 960);

  const topShade = ctx.createLinearGradient(0, 0, 0, 365);
  topShade.addColorStop(0, "rgba(16,16,16,.76)");
  topShade.addColorStop(.72, "rgba(16,16,16,.42)");
  topShade.addColorStop(1, "rgba(16,16,16,0)");
  ctx.fillStyle = topShade;
  ctx.fillRect(0, 0, 760, 380);

  const titlePanel = ctx.createLinearGradient(0, 0, 650, 250);
  titlePanel.addColorStop(0, "rgba(16,16,16,.92)");
  titlePanel.addColorStop(.72, "rgba(16,16,16,.55)");
  titlePanel.addColorStop(1, "rgba(16,16,16,0)");
  ctx.fillStyle = titlePanel;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(650, 0);
  ctx.lineTo(515, 250);
  ctx.lineTo(0, 320);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = red;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(72, 0);
  ctx.lineTo(0, 72);
  ctx.closePath();
  ctx.fill();

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,.32)";
  ctx.shadowBlur = 22;
  ctx.shadowOffsetY = 8;
  preencherRoundRect(ctx, 690, 24, 366, 186, 24, "rgba(245,238,222,.92)");
  ctx.restore();
  desenharBordaRoundRect(ctx, 690, 24, 366, 186, 24, "rgba(255,255,255,.78)", 2);
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,.3)";
  ctx.shadowBlur = 13;
  ctx.shadowOffsetY = 5;
  preencherRoundRect(ctx, 708, 42, 136, 146, 18, "#ffffff");
  ctx.restore();
  desenharImagemCover(ctx, logo, 714, 48, 124, 134, 14);
  desenharBordaRoundRect(ctx, 708, 42, 136, 146, 18, "rgba(227,6,19,.34)", 2);
  ctx.fillStyle = "#171717";
  desenharTextoInteiroCanvas(ctx, broker, 864, 44, 172, 3, {
    peso: 800,
    tamanho: 23,
    minimo: 13,
    lineHeight: 22,
    familia: '"Arial Narrow", Arial, sans-serif',
    align: "left",
    blockHeight: 62
  });
  ctx.fillStyle = red;
  ctx.fillRect(864, 112, 170, 3);
  ctx.fillStyle = "#353535";
  ctx.textAlign = "left";
  ctx.font = '700 13px "Arial Narrow", Arial, sans-serif';
  ctx.fillText(brokerRole, 864, 138);
  if (creci) {
    fonteQueCabeCanvas(ctx, creci, 700, 13, 10, 170, '"Arial Narrow", Arial, sans-serif');
    ctx.fillText(creci, 864, 161);
  }

  ctx.textAlign = "left";
  ctx.fillStyle = red;
  fonteQueCabeCanvas(ctx, titleWord, 900, 84, 46, 470);
  ctx.fillText(titleWord, 68, 104);
  ctx.fillStyle = "#fff";
  fonteQueCabeCanvas(ctx, titleSecond, 900, 92, 54, 500);
  ctx.fillText(titleSecond, 68, 205);
  if (titleThird) {
    fonteQueCabeCanvas(ctx, titleThird, 900, 42, 24, 500);
    ctx.fillText(titleThird, 68, 254);
  }
  ctx.strokeStyle = red;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(68, 270);
  ctx.lineTo(520, 270);
  ctx.stroke();
  ctx.fillStyle = options.messageColor || "#d7d7d7";
  desenharTextoInteiroCanvas(ctx, options.message || "Conforto, espaco e qualidade para sua familia!", 68, 306, 500, 2, {
    peso: 700,
    tamanho: 28,
    minimo: 18,
    lineHeight: 31,
    align: "left"
  });

  const infos = Array.isArray(options.features) ? options.features.slice(0, 6) : [];
  const featureRowHeight = 78;
  const featurePanelHeight = Math.max(104, 42 + infos.length * featureRowHeight);
  preencherRoundRect(ctx, 32, 360, 302, featurePanelHeight, 18, "rgba(8,8,8,.52)");
  desenharBordaRoundRect(ctx, 32, 360, 302, featurePanelHeight, 18, "rgba(255,255,255,.76)", 2);
  infos.forEach((info, index) => {
    const y = 404 + index * 78;
    if (index) {
      ctx.strokeStyle = "rgba(255,255,255,.22)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(100, y - 29);
      ctx.lineTo(310, y - 29);
      ctx.stroke();
    }
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(77, y, 27, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = red;
    ctx.lineWidth = 3;
    ctx.stroke();
    desenharIconeCaracteristicaCs(ctx, info.id, 77, y, red);
    ctx.fillStyle = "#fff";
    desenharTextoInteiroCanvas(ctx, String(info.text || `${info.principal || ""} ${info.secundario || ""}`).trim().toUpperCase(), 122, y - featureRowHeight / 2, 182, 3, {
      peso: 900,
      tamanho: 17,
      minimo: 11,
      lineHeight: 17,
      align: "left",
      blockHeight: featureRowHeight
    });
  });

  ctx.fillStyle = "#151515";
  ctx.fillRect(0, 875, 1080, 95);
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,.4)";
  ctx.shadowBlur = 18;
  const priceGradient = ctx.createLinearGradient(555, 850, 1080, 970);
  priceGradient.addColorStop(0, "#7f0009");
  priceGradient.addColorStop(.55, "#b70412");
  priceGradient.addColorStop(1, "#df1020");
  preencherRoundRect(ctx, 555, 850, 525, 120, 28, priceGradient);
  ctx.restore();

  ctx.fillStyle = red;
  ctx.beginPath();
  ctx.arc(82, 922, 36, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.font = "900 38px Arial";
  ctx.fillText("L", 82, 934);
  ctx.textAlign = "left";
  ctx.font = "500 22px Arial";
  ctx.fillText("LOCALIZACAO", 138, 908);
  ctx.font = "900 27px Arial";
  ctx.fillText(city, 138, 944);

  const rawPrice = String(item.valor ?? "").trim().replace(/[^\d,.-]/g, "");
  const normalizedPrice = rawPrice.includes(",")
    ? rawPrice.replace(/\./g, "").replace(",", ".")
    : (/^\d{1,3}(?:\.\d{3})+$/.test(rawPrice) ? rawPrice.replace(/\./g, "") : rawPrice);
  const numericValue = Number(normalizedPrice) || 0;
  const isRental = /alug|loca/i.test(String(item.tipo || ""));
  const mainValue = numericValue
    ? numericValue.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : "";
  ctx.fillStyle = "#fff";
  ctx.textAlign = "left";
  const finalidade = isRental ? "PARA ALUGAR" : "PARA VENDA";
  ctx.font = "800 15px Arial";
  ctx.fillText("APENAS", 585, 879);
  preencherRoundRect(ctx, 842, 858, 208, 32, 14, "#ffffff");
  ctx.fillStyle = red;
  ctx.textAlign = "right";
  fonteQueCabeCanvas(ctx, finalidade, 900, 16, 11, 176);
  ctx.fillText(finalidade, 1034, 880);
  ctx.fillStyle = "#fff";
  ctx.textAlign = "left";
  if (!numericValue) {
    ctx.textAlign = "center";
    fonteQueCabeCanvas(ctx, "CONSULTE O VALOR", 900, 38, 24, 430);
    ctx.fillText("CONSULTE O VALOR", 815, 941);
  } else {
    ctx.textAlign = "center";
    const displayPrice = `R$ ${mainValue}${isRental ? " / M\u00caS" : ""}`;
    fonteQueCabeCanvas(ctx, displayPrice, 900, 52, 30, 465);
    ctx.fillText(displayPrice, 815, 944);
  }

  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 970, 1080, 110);
  const benefits = (Array.isArray(options.footer) ? options.footer : []).slice(0, 3);
  while (benefits.length < 3) benefits.push("");
  benefits.forEach((text, index) => {
    const x = 72 + index * 270;
    desenharIconeRodapeCs(ctx, index, x, 1030, red);
    ctx.fillStyle = "#111";
    desenharTextoInteiroCanvas(ctx, text, x + 112, 995, 170, 2, {
      peso: 900,
      tamanho: 19,
      minimo: 13,
      lineHeight: 22,
      blockHeight: 70
    });
  });
  if (options.showSiteLogo) {
    desenharImagemContain(ctx, siteLogo, 895, 990, 145, 60, 0, "#fff");
  }
}

function fonteQueCabeCanvas(ctx, texto, peso, tamanho, minimo, maxWidth, familia = "Arial") {
  let atual = tamanho;
  do {
    ctx.font = `${peso} ${atual}px ${familia}`;
    if (ctx.measureText(String(texto || "")).width <= maxWidth) break;
    atual -= 2;
  } while (atual > minimo);
  return atual;
}

function desenharBordaRoundRect(ctx, x, y, w, h, r, cor, largura = 2) {
  ctx.save();
  canvasRoundRect(ctx, x, y, w, h, r);
  ctx.strokeStyle = cor;
  ctx.lineWidth = largura;
  ctx.stroke();
  ctx.restore();
}

function desenharIconeWhatsappCanvas(ctx, cx, cy, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 3.2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.arc(cx, cy, 12, 0.2 * Math.PI, 1.95 * Math.PI);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - 8, cy + 9);
  ctx.lineTo(cx - 13, cy + 14);
  ctx.lineTo(cx - 5, cy + 12);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - 5, cy - 6);
  ctx.bezierCurveTo(cx - 1, cy + 4, cx + 4, cy + 8, cx + 9, cy + 5);
  ctx.lineTo(cx + 5, cy + 1);
  ctx.bezierCurveTo(cx + 3, cy + 3, cx, cy + 1, cx - 2, cy - 2);
  ctx.lineTo(cx - 5, cy - 6);
  ctx.fill();
  ctx.restore();
}

function tituloPrincipalArte(item = {}) {
  const procura = String(item.procura || "").trim();
  const tipo = String(item.tipo || "venda").trim();
  if (procura) return `${procura} para ${tipo}`.toUpperCase();
  return textoCurtoArte(item.titulo || "Imovel em destaque", 34).toUpperCase();
}

function tagNegociacaoArte(item = {}) {
  const tipo = String(item.tipo || "").trim().toLowerCase();
  if (/alug|loca/.test(tipo)) return "PARA ALUGUEL";
  if (/vend/.test(tipo)) return "PARA VENDA";
  return tipo ? `PARA ${tipo.toUpperCase()}` : "IMOVEL DISPONIVEL";
}

function itensDestaqueArte(item = {}) {
  const itens = [];
  const add = (sigla, valor, rotulo) => {
    if (valor === undefined || valor === null || String(valor).trim() === "") return;
    itens.push({ sigla, valor: String(valor), rotulo });
  };
  add("Q", item.quartos, Number(item.quartos) === 1 ? "QUARTO" : "QUARTOS");
  add("B", item.banheiros, Number(item.banheiros) === 1 ? "BANHEIRO" : "BANHEIROS");
  add("V", item.vagas, Number(item.vagas) === 1 ? "VAGA" : "VAGAS");
  if (item.suite) add("S", item.suite, Number(item.suite) === 1 ? "SUITE" : "SUITES");
  if (item.area) add("A", item.area, "AREA TOTAL");
  if (item.construcao) add("C", item.construcao, "AREA CONSTRUIDA");
  if (item.piscina && !/^n(ao|ão)$/i.test(String(item.piscina))) add("P", "", "PISCINA");
  if (item.churrasqueira && !/^n(ao|ão)$/i.test(String(item.churrasqueira))) add("G", "", "AREA GOURMET");
  if (item.outros) add("+", "", textoCurtoArte(item.outros, 18).toUpperCase());
  while (itens.length < 4) {
    const fallbacks = [
      { sigla: "R", valor: "", rotulo: "DOCUMENTACAO" },
      { sigla: "L", valor: "", rotulo: "BOA LOCALIZACAO" },
      { sigla: "+", valor: "", rotulo: "SAIBA MAIS" }
    ];
    itens.push(fallbacks[(itens.length - 1) % fallbacks.length]);
  }
  return itens.slice(0, 4);
}

function desenharFaixaDestaque(ctx, layout, item = {}) {
  const grad = ctx.createLinearGradient(180, 0, 900, 0);
  grad.addColorStop(0, layout.accent);
  grad.addColorStop(.5, layout.accent2);
  grad.addColorStop(1, layout.accent);
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,.5)";
  ctx.shadowBlur = 20;
  ctx.beginPath();
  ctx.moveTo(170, 28);
  ctx.lineTo(910, 28);
  ctx.lineTo(880, 68);
  ctx.lineTo(910, 108);
  ctx.lineTo(170, 108);
  ctx.lineTo(200, 68);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = layout.accent2;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = layout.bg;
  ctx.textAlign = "center";
  ctx.font = "900 43px Arial";
  ctx.fillText("*  IMOVEL EM DESTAQUE  *", 540, 84);
}

function desenharCaracteristicasPremium(ctx, item, layout, y = 874, endereco = "") {
  const itens = itensDestaqueArte(item);
  const hasEndereco = Boolean(String(endereco || "").trim());
  const boxHeight = hasEndereco ? 178 : 116;
  preencherRoundRect(ctx, 72, y, 936, boxHeight, 26, layout.panel);
  desenharBordaRoundRect(ctx, 72, y, 936, boxHeight, 26, layout.accent, 2);
  itens.forEach((info, index) => {
    const x = 72 + index * 234;
    const centerX = x + 117;
    if (index) {
      ctx.fillStyle = "rgba(255,255,255,.65)";
      ctx.fillRect(x, y + 20, 2, 76);
    }
    ctx.fillStyle = layout.text;
    ctx.textAlign = "center";
    if (info.valor) {
      const valor = /AREA/.test(info.rotulo) ? `${info.valor} m2` : String(info.valor);
      fonteQueCabeCanvas(ctx, valor, 900, 28, 16, 194);
      ctx.fillText(valor, centerX, y + 54);
      fonteQueCabeCanvas(ctx, info.rotulo, 900, 20, 12, 194);
      desenharTextoInteiroCanvas(ctx, info.rotulo, centerX, y + 84, 194, 2, {
        peso: 900,
        tamanho: 20,
        minimo: 12,
        lineHeight: 21
      });
    } else {
      desenharTextoInteiroCanvas(ctx, info.rotulo, centerX, y + 56, 194, 3, {
        peso: 900,
        tamanho: 23,
        minimo: 12,
        lineHeight: 24
      });
    }
  });
  if (hasEndereco) {
    ctx.fillStyle = layout.accent;
    ctx.globalAlpha = .72;
    ctx.fillRect(112, y + 116, 856, 2);
    ctx.globalAlpha = 1;
    ctx.fillStyle = layout.text;
    desenharTextoInteiroCanvas(ctx, String(endereco).toUpperCase(), 540, y + 120, 800, 2, {
      peso: 900,
      tamanho: 19,
      minimo: 11,
      lineHeight: 20,
      blockHeight: 56
    });
  }
}

function desenharModeloPremiumImovel(ctx, item, client, foto, logo, layout, siteLogo) {
  ctx.fillStyle = layout.bg;
  ctx.fillRect(0, 0, 1080, 1350);
  ctx.save();
  ctx.filter = "brightness(1.12) contrast(1.04)";
  desenharImagemCover(ctx, foto, 0, 92, 1080, 650, 0);
  ctx.restore();

  const topo = ctx.createLinearGradient(0, 92, 0, 260);
  topo.addColorStop(0, layout.bg);
  topo.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = topo;
  ctx.fillRect(0, 92, 1080, 180);

  const baseFoto = ctx.createLinearGradient(0, 500, 0, 780);
  baseFoto.addColorStop(0, "rgba(0,0,0,0)");
  baseFoto.addColorStop(.72, layout.bg);
  baseFoto.addColorStop(1, layout.bg);
  ctx.fillStyle = baseFoto;
  ctx.fillRect(0, 490, 1080, 300);
  desenharFaixaDestaque(ctx, layout, item);

  const titulo = tituloPrincipalArte(item);
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,.9)";
  ctx.shadowBlur = 10;
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  fonteQueCabeCanvas(ctx, titulo, 900, 66, 38, 950);
  ctx.fillText(titulo, 540, 676);
  ctx.restore();

  ctx.save();
  ctx.shadowColor = layout.accent;
  ctx.shadowBlur = 18;
  desenharBordaRoundRect(ctx, 236, 724, 608, 118, 24, layout.accent, 5);
  ctx.restore();
  preencherRoundRect(ctx, 236, 724, 608, 118, 24, layout.panel);
  desenharBordaRoundRect(ctx, 236, 724, 608, 118, 24, layout.accent, 3);
  ctx.fillStyle = layout.text;
  ctx.textAlign = "left";
  ctx.font = "800 19px Arial";
  ctx.fillText("POR APENAS", 270, 762);
  const valor = formatarValorArteImovel(item.valor);
  const valorTexto = valor === "Consulte" ? "CONSULTE" : valor.replace(/\s/g, "");
  const valorGrad = ctx.createLinearGradient(290, 802, 790, 858);
  valorGrad.addColorStop(0, layout.accent);
  valorGrad.addColorStop(.5, layout.accent2);
  valorGrad.addColorStop(1, layout.accent);
  ctx.fillStyle = valorGrad;
  ctx.textAlign = "center";
  fonteQueCabeCanvas(ctx, valorTexto, 900, 64, 36, 520);
  ctx.fillText(valorTexto, 540, 822);

  const enderecoCompleto = String(item.endereco || "CARLOPOLIS - PR").trim().toUpperCase();
  desenharCaracteristicasPremium(ctx, item, layout, 858, enderecoCompleto);

  preencherRoundRect(ctx, 38, 1062, 250, 250, 30, layout.panel);
  desenharBordaRoundRect(ctx, 38, 1062, 250, 250, 30, layout.accent, 4);
  desenharImagemCover(ctx, logo, 55, 1079, 216, 216, 20);

  const responsavel = textoCurtoArte(client?.nome || item.clienteNome || item.corretor || "Ola Carlopolis", 32).toUpperCase();
  ctx.fillStyle = layout.accent;
  ctx.textAlign = "left";
  ctx.font = "900 24px Arial";
  ctx.fillText("IMOVEIS", 330, 1095);
  ctx.fillStyle = layout.text;
  fonteQueCabeCanvas(ctx, responsavel, 900, 39, 25, 690);
  ctx.fillText(responsavel, 330, 1137);

  const telefone = telefoneArteAdmin(item.telefone || client?.whatsapp || client?.contato || client?.telefone || "");
  preencherRoundRect(ctx, 322, 1162, 454, 72, 22, layout.action);
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(362, 1198, 24, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = layout.action;
  ctx.textAlign = "center";
  desenharIconeWhatsappCanvas(ctx, 362, 1198, layout.action);
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "left";
  fonteQueCabeCanvas(ctx, telefone || "FALE COM O ANUNCIANTE", 900, 31, 20, 360);
  ctx.fillText(telefone || "FALE COM O ANUNCIANTE", 399, 1208);

  const ref = String(item.codRef || item.codigo || item.id || "").toUpperCase();
  preencherRoundRect(ctx, 322, 1252, 454, 50, 18, layout.accent);
  ctx.fillStyle = layout.bg;
  ctx.textAlign = "center";
  const agendaTexto = ref ? `AGENDE SUA VISITA  |  REF. ${ref}` : "AGENDE SUA VISITA";
  fonteQueCabeCanvas(ctx, agendaTexto, 900, 22, 13, 400);
  ctx.fillText(agendaTexto, 549, 1285);

  desenharImagemContain(ctx, siteLogo, 796, 1136, 250, 132, 0, "rgba(255,255,255,0)");
  ctx.fillStyle = layout.text;
  ctx.textAlign = "center";
  fonteQueCabeCanvas(ctx, "www.olacarlopolis.com", 900, 18, 11, 230);
  ctx.fillText("www.olacarlopolis.com", 921, 1292);
}

function caracteristicasEditaveisCs(item = {}) {
  const list = [];
  const add = (id, label, text, icon) => {
    if (text === undefined || text === null || String(text).trim() === "") return;
    list.push({ id, label, text: String(text), icon });
  };
  const suiteValue = String(item.suite ?? "").trim();
  const semSuite = /^(0|n[aã]o|nao|sem)$/i.test(suiteValue);
  const suiteText = suiteValue
    ? (semSuite ? "SEM SU\u00cdTE" : `${suiteValue} suite${Number(suiteValue) === 1 ? "" : "s"}`)
    : "";
  add("quartos", "Dormitorios", item.quartos ? `${item.quartos} dormitorio${Number(item.quartos) === 1 ? "" : "s"}` : "", "Q");
  add("suite", "Suites", suiteText, "S");
  add("banheiros", "Banheiros", item.banheiros ? `${item.banheiros} banheiro${Number(item.banheiros) === 1 ? "" : "s"}` : "", "B");
  add("vagas", "Vagas", item.vagas ? `${item.vagas} vaga${Number(item.vagas) === 1 ? "" : "s"}` : "", "V");
  add("construcao", "Area construida", item.construcao ? `${item.construcao} m2 de area construida` : "", "AC");
  add("area", "Area do terreno", item.area ? `${item.area} m2 de area do terreno` : "", "AT");
  add("cozinhas", "Cozinha", item.cozinhas ? `${item.cozinhas} cozinha${Number(item.cozinhas) === 1 ? "" : "s"}` : "", "C");
  add("salas", "Sala", item.salas ? `${item.salas} sala${Number(item.salas) === 1 ? "" : "s"}` : "", "SL");
  add("piscina", "Piscina", item.piscina && !/^n(ao|ão)$/i.test(String(item.piscina)) ? `Piscina: ${item.piscina}` : "", "P");
  add("churrasqueira", "Churrasqueira", item.churrasqueira && !/^n(ao|ão)$/i.test(String(item.churrasqueira)) ? `Churrasqueira: ${item.churrasqueira}` : "", "CH");
  add("quintal", "Quintal", item.quintal && !/^n(ao|ão)$/i.test(String(item.quintal)) ? `Quintal: ${item.quintal}` : "", "QT");
  add("outros", "Outros diferenciais", item.outros, "+");
  return list;
}

function tituloAutomaticoCs(item = {}) {
  return `${String(item.procura || "IMOVEL").toUpperCase()} SUPER`;
}

function logoCsAtivaPorPadrao() {
  const config = state.paginaInicialSite || {};
  return Boolean(config.exibirLogoArteCs || config.logoArteCsAtiva || false);
}

function preencherEditorCs(item, force = false) {
  const editor = $("imovelCsEditor");
  if (!editor || !item) return;
  const changedItem = state.imovelCsEditorItemId !== item.id;
  if (!force && !changedItem) return;
  state.imovelCsEditorItemId = item.id;
  state.imovelCsBrokerImage = "";
  const client = donoImovelAdmin(item);
  $("imovelCsTitle").value = tituloAutomaticoCs(item);
  $("imovelCsMessage").value = "Conforto, espaco e qualidade para sua familia!";
  $("imovelCsMessageColor").value = "#d7d7d7";
  $("imovelCsFooter1").value = "Documentacao Regularizada";
  $("imovelCsFooter2").value = "Compra segura e transparente";
  $("imovelCsFooter3").value = "Pronto para Morar";
  $("imovelCsShowSiteLogo").checked = logoCsAtivaPorPadrao();
  $("imovelCsBrokerImage").value = "";
  $("imovelCsBrokerPreview").src = logoClienteImovelAdmin(client);
  const features = caracteristicasEditaveisCs(item);
  $("imovelCsFeatures").innerHTML = features.length
    ? features.map((feature) => `
      <label>
        <input type="checkbox" data-cs-feature="${escapeAttr(feature.id)}" data-cs-icon="${escapeAttr(feature.icon)}" data-cs-text="${escapeAttr(feature.text)}" checked>
        ${escapeHtml(feature.label)}: ${escapeHtml(feature.text)}
      </label>
    `).join("")
    : `<span class="list-meta">Nenhuma caracteristica preenchida no cadastro.</span>`;
}

function atualizarVisibilidadeEditorCs(force = false) {
  const isCs = canGenerateImovelImages() && $("imovelArteLayout")?.value === "cs";
  $("imovelCsEditor")?.classList.toggle("hidden", !isCs);
  if (!isCs) return;
  const item = state.imoveis.find((imovel) => imovel.id === $("imovelArteItem")?.value && itemBelongsToCurrentClient(imovel));
  if (item) preencherEditorCs(item, force);
}

function opcoesEditorCs() {
  const features = [...document.querySelectorAll("#imovelCsFeatures [data-cs-feature]:checked")].map((input) => ({
    id: input.dataset.csFeature || "",
    icon: input.dataset.csIcon || "+",
    text: input.dataset.csText || ""
  }));
  return {
    title: $("imovelCsTitle")?.value.trim() || "",
    message: $("imovelCsMessage")?.value.trim() || "",
    messageColor: $("imovelCsMessageColor")?.value || "#d7d7d7",
    features,
    footer: [
      $("imovelCsFooter1")?.value.trim() || "",
      $("imovelCsFooter2")?.value.trim() || "",
      $("imovelCsFooter3")?.value.trim() || ""
    ],
    showSiteLogo: Boolean($("imovelCsShowSiteLogo")?.checked),
    brokerImage: state.imovelCsBrokerImage || ""
  };
}

function renderImovelArteOptions() {
  const select = $("imovelArteItem");
  const layout = $("imovelArteLayout");
  if (!select || !layout) return;
  const atual = select.value;
  const list = state.imoveis.filter(itemBelongsToCurrentClient);
  select.innerHTML = list.map((item) => {
    const label = [item.codRef || item.codigo || item.id, item.titulo || "Imovel"].filter(Boolean).join(" - ");
    return `<option value="${escapeAttr(item.id)}">${escapeHtml(label)}</option>`;
  }).join("");
  if (atual && list.some((item) => item.id === atual)) select.value = atual;
  atualizarVisibilidadeEditorCs();
}

async function gerarArteInstagramImovel(imovelId = $("imovelArteItem")?.value, layoutKey = $("imovelArteLayout")?.value || "navyGold") {
  if (!canGenerateImovelImages()) return showToast("A geracao de imagens de imoveis nao esta liberada para este usuario.");
  const item = state.imoveis.find((imovel) => imovel.id === imovelId && itemBelongsToCurrentClient(imovel));
  if (!item) return showToast("Selecione um imovel para gerar a arte.");
  const layout = IMOVEL_ARTE_LAYOUTS[layoutKey] || IMOVEL_ARTE_LAYOUTS.navyGold;
  const button = $("generateImovelArtButton");
  if (button) button.disabled = true;
  showToast("Gerando arte do imovel...");
  try {
    const client = donoImovelAdmin(item);
    const csOptions = layout.model === "cs" ? opcoesEditorCs() : {};
    const fotosCandidatas = imovelImagensCandidatasAdmin(item);
    const [foto, logo, siteLogo] = await Promise.all([
      carregarPrimeiraImagemCanvas(fotosCandidatas),
      carregarImagemCanvas(csOptions.brokerImage || logoClienteImovelAdmin(client)),
      carregarImagemCanvas("../images/img_padrao_site/logo_1.png")
    ]);
    if (!foto) {
      console.error("Nenhuma foto do imovel carregou para a arte.", {
        imovelId: item.id,
        fotosCandidatas
      });
      showToast("Nao foi possivel carregar a foto deste imovel. Confira as imagens cadastradas.");
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = layout.model === "cs" ? 1080 : 1350;
    const ctx = canvas.getContext("2d");
    if (layout.model === "cs") {
      desenharModeloCsQuadrado(ctx, item, client, foto, logo, siteLogo, csOptions);
    } else {
      desenharModeloPremiumImovel(ctx, item, client, foto, logo, layout, siteLogo);
    }

    const blob = await canvasParaBlob(canvas);
    baixarBlobCanvas(
      blob,
      `arte-imovel-${slugify(item.codRef || item.titulo || item.id)}-${layoutKey}.png`
    );
    showToast("Arte gerada e download iniciado.");
  } catch (error) {
    console.error("Erro ao gerar arte do imovel.", error);
    showToast("Nao foi possivel gerar a arte.");
  } finally {
    if (button) button.disabled = false;
  }
}

function renderImoveisList() {
  const box = $("imoveisList");
  if (!box) return;
  renderImovelArteOptions();
  const q = String($("imovelSearch")?.value || "").toLowerCase().trim();
  const list = state.imoveis.filter(itemBelongsToCurrentClient).filter((item) => {
    const hay = `${item.codRef || ""} ${item.codigo || ""} ${item.titulo || ""} ${item.tipo || ""} ${item.procura || ""} ${item.valor || ""} ${item.corretor || ""} ${item.endereco || ""}`.toLowerCase();
    return !q || hay.includes(q);
  });
  if (!list.length) {
    box.innerHTML = `<div class="list-meta">Nenhum imovel cadastrado.</div>`;
    return;
  }
  box.innerHTML = list.map((item) => {
    const codigoRef = item.codRef || item.codigo || item.id || "";
    return `
    <article class="list-card event-card">
      ${item.imagem ? `<img src="${escapeAttr(displayImageUrl(item.imagem))}" alt="${escapeAttr(item.titulo || "Imovel")}" ${lazyImageAttrs()} ${imageFallbackAttr()}>` : ""}
      <div class="list-title">${escapeHtml(item.titulo || item.id)}</div>
      <div class="list-meta"><strong>Codigo de referencia:</strong> ${escapeHtml(codigoRef || "Sem codigo")}</div>
      <div class="list-meta">${escapeHtml([item.tipo, item.procura, item.valor ? moneyBR(item.valor) : ""].filter(Boolean).join(" - ") || "Sem valor")}</div>
      <div class="list-meta">${escapeHtml([item.corretor || item.clienteNome, item.telefone].filter(Boolean).join(" - ") || "Sem contato")}</div>
      <div class="list-meta">${escapeHtml(item.origemBase === "script.js" && item.origem !== "painel" ? "Base inicial do site" : "Firebase / Painel")}</div>
      <span class="badge ${escapeAttr(item.status || "ativo")}">${statusLabel(item.status || "ativo")}</span>
      ${canGenerateImovelImages() ? `<button type="button" data-art-imovel="${escapeAttr(item.id)}"><i class="fa-solid fa-wand-magic-sparkles"></i> Arte Instagram</button>` : ""}
      <button type="button" data-edit-imovel="${escapeAttr(item.id)}">Editar</button>
      <button type="button" class="danger" data-delete-imovel="${escapeAttr(item.id)}">Excluir</button>
    </article>
  `; }).join("");
  box.querySelectorAll("[data-art-imovel]").forEach((button) => {
    button.addEventListener("click", () => {
      if ($("imovelArteItem")) $("imovelArteItem").value = button.dataset.artImovel || "";
      gerarArteInstagramImovel(button.dataset.artImovel, $("imovelArteLayout")?.value || "navyGold");
    });
  });
  box.querySelectorAll("[data-edit-imovel]").forEach((button) => {
    button.addEventListener("click", () => {
      const item = state.imoveis.find((imovel) => imovel.id === button.dataset.editImovel && itemBelongsToCurrentClient(imovel));
      if (item) fillImovelForm(item);
    });
  });
  box.querySelectorAll("[data-delete-imovel]").forEach((button) => {
    button.addEventListener("click", () => excluirImovelPorId(button.dataset.deleteImovel));
  });
}

async function excluirImovelPorId(imovelId) {
  if (!imovelId) return;
  if (!hasPermission("imoveis")) return;
  const original = state.imoveis.find((item) => item.id === imovelId);
  if (!original || !itemBelongsToCurrentClient(original)) {
    showToast("Voce nao tem permissao para excluir este imovel.");
    return;
  }
  if (!(await confirmarExclusao(original.titulo || original.codRef || original.id, "imovel"))) return;
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
    await update(ref(db, `conteudosInformativos/imoveis/${imovelId}`), tombstone);
  } else {
    await remove(ref(db, `conteudosInformativos/imoveis/${imovelId}`));
  }
  await removerNovidadesPorDestino("imovel", imovelId, imovelId);
  showToast("Imovel excluido.");
  resetImovelForm();
  await loadAllData();
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
  $("infoDeathNoticeName").value = item.nomeFalecido || item.falecidoNome || item.name || item.nome || "";
  if ($("infoDeathNoticeAge")) $("infoDeathNoticeAge").value = item.idade || item.age || "";
  $("infoDeathNoticeDate").value = item.dataFalecimento || item.date || item.data || "";
  if ($("infoDeathNoticeFuneralHome")) $("infoDeathNoticeFuneralHome").value = item.funeraria || item.funerariaNome || "";
  $("infoDeathNoticeStatus").value = item.status || "ativo";
  $("infoDeathNoticeImage").value = item.image || item.imagem || "";
  $("infoDeathNoticeDescription").value = item.mensagem || item.descricaoFalecido || item.descricao || "";
  $("deleteInfoDeathNoticeButton").classList.remove("hidden");
  openFormForEdit("infoDeathNoticeForm");
}

function getInfoDeathNoticeFormData() {
  const name = $("infoDeathNoticeName").value.trim();
  const date = $("infoDeathNoticeDate").value;
  const idade = $("infoDeathNoticeAge")?.value.trim() || "";
  const funeraria = $("infoDeathNoticeFuneralHome")?.value.trim() || "";
  const mensagem = $("infoDeathNoticeDescription").value.trim();
  const baseId = $("infoDeathNoticeId").value || `${slugify(name || "nota")}-${date || Date.now()}`;
  return cleanForFirebase({
    id: baseId,
    name,
    nome: name,
    nomeFalecido: name,
    falecidoNome: name,
    date,
    data: date,
    dataFalecimento: date,
    idade,
    age: idade,
    funeraria,
    funerariaNome: funeraria,
    status: $("infoDeathNoticeStatus").value,
    image: $("infoDeathNoticeImage").value.trim(),
    imagem: $("infoDeathNoticeImage").value.trim(),
    descricaoFalecido: mensagem,
    mensagem,
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
    const hay = `${item.nomeFalecido || item.falecidoNome || item.name || item.nome || ""} ${item.funeraria || ""} ${item.date || item.data || ""} ${item.descricaoFalecido || ""}`.toLowerCase();
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

function resetInfoWhatsappGroupForm() {
  state.selectedWhatsappGroupId = null;
  $("infoWhatsappGroupForm")?.reset();
  if ($("infoWhatsappGroupId")) $("infoWhatsappGroupId").value = "";
  if ($("infoWhatsappGroupImage")) $("infoWhatsappGroupImage").value = "";
  $("deleteInfoWhatsappGroupButton")?.classList.add("hidden");
  setFormCardOpen("infoWhatsappGroupForm", false);
}

function fillInfoWhatsappGroupForm(item) {
  state.selectedWhatsappGroupId = item.id;
  $("infoWhatsappGroupId").value = item.id || "";
  $("infoWhatsappGroupName").value = item.nome || item.name || "";
  $("infoWhatsappGroupLink").value = item.link || "";
  $("infoWhatsappGroupStatus").value = item.status || "ativo";
  $("infoWhatsappGroupImage").value = item.imagem || item.image || "";
  $("infoWhatsappGroupImageUrl").value = item.imagem || item.image || "";
  $("infoWhatsappGroupDescription").value = item.descricao || item.description || "";
  $("deleteInfoWhatsappGroupButton")?.classList.remove("hidden");
  openFormForEdit("infoWhatsappGroupForm");
}

function getInfoWhatsappGroupFormData() {
  const nome = $("infoWhatsappGroupName").value.trim();
  const link = $("infoWhatsappGroupLink").value.trim();
  const image = $("infoWhatsappGroupImage").value.trim() || $("infoWhatsappGroupImageUrl").value.trim();
  const baseId = $("infoWhatsappGroupId").value || slugify(nome || `grupo-${Date.now()}`);
  return cleanForFirebase({
    id: baseId,
    nome,
    name: nome,
    descricao: $("infoWhatsappGroupDescription").value.trim(),
    description: $("infoWhatsappGroupDescription").value.trim(),
    link,
    imagem: image,
    image,
    status: $("infoWhatsappGroupStatus").value || "ativo",
    origem: "painel",
    updatedAt: serverTimestamp(),
    updatedBy: state.user?.uid || ""
  });
}

function renderInfoWhatsappGroupsList() {
  const box = $("infoWhatsappGroupList");
  if (!box) return;

  const q = String($("infoWhatsappGroupSearch")?.value || "").toLowerCase().trim();
  const list = state.gruposWhatsapp.filter((item) => {
    const hay = `${item.nome || item.name || ""} ${item.descricao || item.description || ""} ${item.link || ""}`.toLowerCase();
    return !q || hay.includes(q);
  });

  if (!list.length) {
    box.innerHTML = `<div class="list-meta">Nenhum grupo cadastrado no Firebase.</div>`;
    return;
  }

  box.innerHTML = list.map((item) => `
    <article class="list-card event-card">
      ${item.imagem || item.image ? `<img src="${escapeAttr(displayImageUrl(item.imagem || item.image))}" alt="${escapeAttr(item.nome || "Grupo")}" ${lazyImageAttrs()} ${imageFallbackAttr()}>` : ""}
      <div class="list-title">${escapeHtml(item.nome || item.name || item.id)}</div>
      <div class="list-meta">${escapeHtml(item.descricao || item.description || "Sem descricao")}</div>
      <div class="list-meta">${escapeHtml(item.link || "Sem link")}</div>
      <span class="badge ${escapeAttr(item.status || "ativo")}">${statusLabel(item.status)}</span>
      <button type="button" data-edit-whatsapp-group="${escapeAttr(item.id)}">Editar</button>
    </article>
  `).join("");

  box.querySelectorAll("[data-edit-whatsapp-group]").forEach((button) => {
    button.addEventListener("click", () => {
      const item = state.gruposWhatsapp.find((group) => group.id === button.dataset.editWhatsappGroup);
      if (item) fillInfoWhatsappGroupForm(item);
    });
  });
}

async function uploadInfoWhatsappGroupImage(file) {
  if (!file) return;
  if (!canManageInformacoes()) return;
  const id = $("infoWhatsappGroupId").value || `${slugify($("infoWhatsappGroupName").value.trim() || "grupo")}-${Date.now()}`;
  const path = `conteudosInformativos/gruposWhatsapp/${id}/${Date.now()}-${slugify(file.name || "imagem")}`;
  const fileRef = storageRef(storage, path);
  showToast("Enviando imagem do grupo...");
  const url = await uploadFileWithProgress(fileRef, file, "Enviando imagem do grupo", file.name || "imagem");
  $("infoWhatsappGroupImage").value = url;
  $("infoWhatsappGroupImageUrl").value = url;
  showToast("Imagem do grupo enviada.");
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
        <div class="list-meta">Plano: ${planLabel(client.tipoPlano)} - Valor final: ${moneyBR(valorTotalFaturaCliente(client))}${client.destaqueSemanal ? ` - destaque ${moneyBR(destaqueValueForClient(client))} (${destaqueBillingForClient(client) === "pix_separado" ? "Pix separado" : "mensalidade"})` : ""}</div>
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
      const valorDestaqueFatura = destaqueIncludedInInvoice(nextClient) ? destaqueValueForClient(nextClient) : 0;
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
      const valorDestaqueFatura = destaqueIncludedInInvoice(nextClient) ? destaqueValueForClient(nextClient) : 0;
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

function formatDateBR(dateKey = "") {
  const match = String(dateKey || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return String(dateKey || "-");
  return `${match[3]}/${match[2]}/${match[1]}`;
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
    novidades: "Novidades",
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

function origemLabel(value) {
  const raw = String(value || "").trim();
  const normalized = normalizeName(raw);
  if (!raw) return "Acesso direto";
  if (/instagram|insta/.test(normalized)) return "Instagram";
  if (/facebook|face/.test(normalized)) return "Facebook";
  if (/whatsapp|zap/.test(normalized)) return "WhatsApp";
  if (/pwa|app/.test(normalized)) return "App / PWA";
  if (/site|navegador/.test(normalized)) return "Site";
  if (/google/.test(normalized)) return "Google";
  return raw;
}

function aggregateOrigemAcessos(acessos = {}, origemAcessos = {}) {
  const map = new Map();
  Object.values(acessos || {}).forEach((dia) => {
    Object.values(dia?.detalhados || {}).forEach((item) => {
      incrementMetric(map, origemLabel(item?.origem || item?.canal || item?.referrer), 1);
    });
  });
  Object.values(origemAcessos || {}).forEach((dia) => {
    Object.entries(dia || {}).forEach(([origem, count]) => incrementMetric(map, origemLabel(origem), count));
  });
  return map;
}

function aggregatePWAInstalls(data = {}) {
  let total = 0;
  Object.values(data || {}).forEach((dia) => {
    if (typeof dia === "number") total += dia;
    else total += Object.keys(dia || {}).length;
  });
  return total;
}

function aggregateUsoPWA(data = {}) {
  let total = 0;
  Object.values(data || {}).forEach((dia) => {
    if (typeof dia === "number") total += dia;
    else if (dia && typeof dia === "object") {
      total += Number(dia.total || 0);
      if (!dia.total) total += Object.keys(dia).length;
    }
  });
  return total;
}

function formatReportTime(item = {}, fallbackDate = "") {
  if (item.horario) return String(item.horario);
  if (item.dataHoraISO || item.timestamp) {
    const date = new Date(item.dataHoraISO || item.timestamp);
    if (!Number.isNaN(date.getTime())) return date.toLocaleTimeString("pt-BR");
  }
  return fallbackDate || "-";
}

function buildClickTimeline(metrics = {}, range = getReportDateRange()) {
  const rows = [];
  const pushRow = (date, area, cliente, tipo, item = {}) => {
    rows.push({
      date,
      hora: formatReportTime(item, date),
      area,
      cliente: clientLabelFromMetricKey(cliente),
      tipo: metricButtonLabel(tipo || item.tipo || area),
      pagina: item.pagina || "",
      promocao: item.promocaoTitulo || item.promoTitulo || item.tituloPromocao || item.titulo || "",
      promocaoId: item.promocaoId || item.promoId || "",
      tituloConteudo: item.tituloConteudo || item.estabelecimento || "",
      acao: item.acao || "",
      clicouWhatsAppPromocao: Boolean(item.clicouWhatsAppPromocao || item.acao === "whatsapp" || item.tipo === "whatsapp_promocao")
    });
  };

  Object.entries(metrics.cliquesBotoesDetalhado || {}).forEach(([date, dia]) => {
    if (date < range.start || date > range.end) return;
    Object.entries(dia || {}).forEach(([cliente, logs]) => {
      Object.values(logs || {}).forEach((item) => pushRow(date, item?.area || "Botoes", cliente, item?.tipo, item));
    });
  });
  Object.entries(metrics.cliquesOndeComerDetalhado || {}).forEach(([date, dia]) => {
    if (date < range.start || date > range.end) return;
    Object.entries(dia || {}).forEach(([cliente, logs]) => {
      Object.values(logs || {}).forEach((item) => pushRow(date, "Onde Comer", cliente, item?.tipo, item));
    });
  });
  Object.entries(metrics.cliquesPromocoesDetalhado || {}).forEach(([date, dia]) => {
    if (date < range.start || date > range.end) return;
    Object.entries(dia || {}).forEach(([cliente, logs]) => {
      Object.values(logs || {}).forEach((item) => pushRow(date, "Promocoes", cliente, item?.tipo || "promocao", item));
    });
  });
  Object.entries(metrics.cliquesPorMenuDetalhado || {}).forEach(([date, dia]) => {
    if (date < range.start || date > range.end) return;
    Object.entries(dia || {}).forEach(([menuId, value]) => {
      Object.values(value?.detalhes || {}).forEach((item) => pushRow(date, "Menu", item?.texto || menuId, "menu", item));
    });
  });

  return rows.sort((a, b) => `${b.date} ${b.hora}`.localeCompare(`${a.date} ${a.hora}`));
}

function buildAccessTimeline(acessos = {}, range = getReportDateRange()) {
  const rows = [];
  Object.entries(acessos || {}).forEach(([date, dia]) => {
    if (date < range.start || date > range.end) return;
    Object.values(dia?.detalhados || {}).forEach((item) => {
      rows.push({
        date,
        hora: formatReportTime(item, date),
        origem: origemLabel(item?.origem || item?.canal || item?.referrer),
        canal: item?.canal || "-",
        cidade: [item?.cidade || "Desconhecida", item?.estado || ""].filter(Boolean).join(" - "),
        dispositivo: item?.dispositivo || "-",
        pagina: item?.pagina || ""
      });
    });
  });
  return rows.sort((a, b) => `${b.date} ${b.hora}`.localeCompare(`${a.date} ${a.hora}`));
}

function clientMetricKeys(client = {}) {
  const values = [
    client.id,
    client.nome,
    client.name,
    client.nomeNormalizado,
    client.estabelecimentoId,
    clientCanonicalId(client),
    ...(client.aliases ? Object.keys(client.aliases) : [])
  ];
  return [...new Set(values.map((value) => normalizeName(value)).filter(Boolean))];
}

function metricKeyBelongsToClient(metricKey, keys = []) {
  const key = normalizeName(metricKey);
  if (!key) return false;
  return keys.some((candidate) => {
    if (!candidate) return false;
    if (key === candidate) return true;
    return candidate.length > 4 && (key.includes(candidate) || candidate.includes(key));
  });
}

function sumMetricMapForClient(map = new Map(), keys = []) {
  let total = 0;
  map.forEach((count, key) => {
    if (metricKeyBelongsToClient(key, keys)) total += Number(count || 0);
  });
  return total;
}

function aggregateButtonTypesForClient(details = new Map(), keys = []) {
  const tipos = new Map();
  details.forEach((typeMap, clientKey) => {
    if (!metricKeyBelongsToClient(clientKey, keys)) return;
    typeMap.forEach((count, type) => incrementMetric(tipos, type, count));
  });
  return tipos;
}

function clientReportCategory(row = {}) {
  const text = normalizeName(`${row.area || ""} ${row.tipo || ""}`);
  if (/novidade|novidades/.test(text)) return "Novidades";
  if (/whatsapp|telefone|contato|zap/.test(text)) return "WhatsApp / telefone";
  if (/cardapio|menu/.test(text)) return "Cardapio";
  if (/foto|fotos|imagem|divulgacao/.test(text)) return "Fotos / divulgacao";
  if (/promocao|promocoes|oferta/.test(text)) return "Promocoes";
  if (/instagram|facebook|tiktok|site|rede|social|link/.test(text)) return "Redes sociais / links";
  return row.tipo || row.area || "Clique";
}

function clientReportResourceAllowed(category = "") {
  const normalized = normalizeName(category);
  if (/cardapio/.test(normalized)) return hasPermission("cardapio");
  if (/novidade/.test(normalized)) return true;
  if (/promoc/.test(normalized)) return hasPermission("promocoes");
  if (/foto|divulgacao|imagem/.test(normalized)) return hasPermission("imagens") || hasPermission("destaque");
  return true;
}

function renderClientReportPeriodControls(range = getReportDateRange()) {
  return `
    <section class="panel-card report-period-card client-report-period-card">
      <div class="section-head compact">
        <div>
          <h3>Periodo do relatorio</h3>
          <p>Filtre os cliques por dia, semana, mes, ano ou intervalo personalizado.</p>
        </div>
        <span class="report-card-date"><i class="fa-solid fa-calendar-days"></i> ${escapeHtml(range.label)}</span>
      </div>
      <div class="report-period-tabs">
        <button type="button" data-client-report-period="dia" class="period-day ${state.reportPeriod.type === "dia" ? "active" : ""}"><i class="fa-solid fa-sun"></i> Dia</button>
        <button type="button" data-client-report-period="semanal" class="period-week ${state.reportPeriod.type === "semanal" ? "active" : ""}"><i class="fa-solid fa-calendar-week"></i> Semana</button>
        <button type="button" data-client-report-period="mensal" class="period-month ${state.reportPeriod.type === "mensal" ? "active" : ""}"><i class="fa-solid fa-calendar-days"></i> Mes</button>
        <button type="button" data-client-report-period="anual" class="period-year ${state.reportPeriod.type === "anual" ? "active" : ""}"><i class="fa-solid fa-chart-line"></i> Ano</button>
        <button type="button" data-client-report-period="personalizado" class="period-custom ${state.reportPeriod.type === "personalizado" ? "active" : ""}"><i class="fa-solid fa-sliders"></i> Data personalizada</button>
      </div>
      <div class="report-custom-range ${state.reportPeriod.type === "personalizado" ? "" : "hidden"}">
        <label>Inicio<input id="clientReportStartDate" type="date" value="${escapeAttr(state.reportPeriod.start || range.start)}"></label>
        <label>Fim<input id="clientReportEndDate" type="date" value="${escapeAttr(state.reportPeriod.end || range.end)}"></label>
        <button id="applyClientReportRangeButton" type="button" class="ghost-button"><i class="fa-solid fa-filter"></i> Aplicar</button>
      </div>
    </section>
  `;
}

function renderClientTimelineTable(rows, emptyMessage) {
  if (!rows.length) return `<div class="list-meta">${escapeHtml(emptyMessage)}</div>`;
  return `
    <div class="report-table-wrap">
      <table class="report-click-table client-report-click-table">
        <thead>
          <tr>
            <th>Recurso</th>
            <th>Data</th>
            <th>Horario</th>
            <th>Promocao</th>
            <th>WhatsApp promocao</th>
            <th>Origem / card</th>
            <th>Detalhe</th>
          </tr>
        </thead>
        <tbody>
          ${rows.slice(0, 200).map((row) => `
            <tr title="${escapeAttr(row.pagina || "")}">
              <td><strong>${escapeHtml(clientReportCategory(row))}</strong></td>
              <td>${escapeHtml(formatDateBR(row.date))}</td>
              <td><strong>${escapeHtml(row.hora)}</strong></td>
              <td>${escapeHtml(row.promocao || "-")}</td>
              <td>${row.promocao || row.promocaoId || /promoc/i.test(String(row.area || row.tipo || "")) ? (row.clicouWhatsAppPromocao ? "Sim" : "Nao") : "-"}</td>
              <td>${escapeHtml(row.area || "-")}</td>
              <td>${escapeHtml(row.tituloConteudo || row.acao || row.tipo || "-")}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderClientMetricReportContent(client = {}) {
  const range = getReportDateRange();
  const keys = clientMetricKeys(client);
  const filtered = {
    cliquesBotoes: filterDailyMetrics(state.metricas.cliquesBotoes, range),
    ondeComerCardapios: filterDailyMetrics(state.metricas.ondeComerCardapios, range),
    ondeComerWhats: filterDailyMetrics(state.metricas.ondeComerWhats, range),
    ondeComerFotos: filterDailyMetrics(state.metricas.ondeComerFotos, range),
    promocoes: filterDailyMetrics(state.metricas.promocoes, range)
  };
  const botoes = aggregateCliquesPorBotao(filtered.cliquesBotoes);
  const tipos = aggregateButtonTypesForClient(botoes.detalhes, keys);
  const tiposPermitidos = new Map([...tipos.entries()].filter(([tipo]) => clientReportResourceAllowed(clientReportCategory({ tipo }))));
  const canShowCardapioReport = clientReportResourceAllowed("Cardapio");
  const cardapios = canShowCardapioReport
    ? sumMetricMapForClient(aggregateSimpleDaily(filtered.ondeComerCardapios), keys) + Number(tiposPermitidos.get("cardapio") || 0)
    : 0;
  const whats = sumMetricMapForClient(aggregateSimpleDaily(filtered.ondeComerWhats), keys) + Number(tiposPermitidos.get("whatsapp") || 0) + Number(tiposPermitidos.get("telefone") || 0);
  const fotos = clientReportResourceAllowed("Fotos / divulgacao")
    ? sumMetricMapForClient(aggregateSimpleDaily(filtered.ondeComerFotos), keys) + Number(tiposPermitidos.get("fotos") || 0) + Number(tiposPermitidos.get("divulgacao") || 0)
    : 0;
  const promocoes = clientReportResourceAllowed("Promocoes")
    ? sumMetricMapForClient(aggregateSimpleDaily(filtered.promocoes), keys)
    : 0;
  const novidades = Number(tiposPermitidos.get("novidades") || 0);
  const redes = [...tiposPermitidos.entries()]
    .filter(([tipo]) => /instagram|facebook|tiktok|site|rede|social/i.test(String(tipo)))
    .reduce((sum, [, count]) => sum + Number(count || 0), 0);
  const totalBotoes = [...tiposPermitidos.values()].reduce((sum, count) => sum + Number(count || 0), 0);
  const total = cardapios + whats + fotos + promocoes + novidades + redes;
  const outros = Math.max(0, totalBotoes - (cardapios + whats + fotos + promocoes + novidades + redes));
  const timeline = buildClickTimeline(state.metricas, range)
    .filter((row) => metricKeyBelongsToClient(row.cliente, keys) || normalizeName(row.cliente) === normalizeName(client.nome || client.name || ""))
    .map((row) => ({ ...row, categoria: clientReportCategory(row) }))
    .filter((row) => clientReportResourceAllowed(row.categoria));
  const rows = [
    ["WhatsApp / telefone", whats],
    ...(canShowCardapioReport ? [["Cardapio", cardapios]] : []),
    ["Fotos / divulgacao", fotos],
    ["Novidades", novidades],
    ["Promocoes", promocoes],
    ["Redes sociais / links", redes],
    ["Outros botoes", outros]
  ];
  const recursosTexto = [
    "telefone",
    ...(canShowCardapioReport ? ["cardapio"] : []),
    ...(clientReportResourceAllowed("Fotos / divulgacao") ? ["fotos"] : []),
    "novidades",
    ...(clientReportResourceAllowed("Promocoes") ? ["promocoes"] : []),
    "redes sociais",
    "demais botoes"
  ].join(", ");

  return `
    ${renderClientReportPeriodControls(range)}
    <div class="client-report-summary">
      <div class="stats-grid client-report-stats">
        <article class="stat-card"><span>Total de interacoes</span><strong>${total + outros}</strong><small>${escapeHtml(range.label)}</small></article>
        <article class="stat-card"><span>WhatsApp</span><strong>${whats}</strong><small>Telefone e contato</small></article>
        ${canShowCardapioReport ? `<article class="stat-card"><span>Cardapio</span><strong>${cardapios}</strong><small>Cliques no cardapio</small></article>` : ""}
        <article class="stat-card"><span>Novidades</span><strong>${novidades}</strong><small>Cliques na tela inicial</small></article>
        <article class="stat-card"><span>Promocoes</span><strong>${promocoes}</strong><small>Cliques em ofertas</small></article>
      </div>
      <div class="reports-grid client-report-grid">
        <section class="panel-card report-card">
          <h3>Resumo por tipo</h3>
          ${renderReportList(rows.filter(([, count]) => count > 0).map(([title, count]) => ({ title, meta: `${count} clique${count === 1 ? "" : "s"}` })), "Ainda nao ha cliques registrados para este cliente no periodo.")}
        </section>
        <section class="panel-card report-card report-wide">
          <h3>Cliques detalhados por data e horario</h3>
          <p class="list-meta">Use essa tabela para conferir interacoes reais em ${escapeHtml(recursosTexto)}.</p>
          ${renderClientTimelineTable(timeline, "Ainda nao ha horarios detalhados para este cliente neste periodo.")}
        </section>
      </div>
    </div>
  `;
}

function renderClientMetricReport(client = {}) {
  return `<div id="clientMetricReportMount">${renderClientMetricReportContent(client)}</div>`;
}

function bindClientMetricReportControls(client = {}) {
  const root = $("clientMetricReportMount");
  if (!root) return;
  const refresh = () => {
    root.innerHTML = renderClientMetricReportContent(client);
    bindClientMetricReportControls(client);
  };
  root.querySelectorAll("[data-client-report-period]").forEach((button) => {
    button.addEventListener("click", () => {
      state.reportPeriod.type = button.dataset.clientReportPeriod;
      refresh();
    });
  });
  root.querySelector("#applyClientReportRangeButton")?.addEventListener("click", () => {
    state.reportPeriod.type = "personalizado";
    state.reportPeriod.start = root.querySelector("#clientReportStartDate")?.value || "";
    state.reportPeriod.end = root.querySelector("#clientReportEndDate")?.value || state.reportPeriod.start;
    refresh();
  });
}

function renderTimelineTable(rows, emptyMessage, type = "clicks") {
  if (!rows.length) return `<div class="list-meta">${escapeHtml(emptyMessage)}</div>`;
  const isAccess = type === "access";
  return `
    <div class="report-table-wrap">
      <table class="report-click-table report-timeline-table">
        <thead>
          <tr>
            <th>Data</th>
            <th>Hora</th>
            ${isAccess ? `<th>Origem</th><th>Canal</th><th>Cidade</th><th>Dispositivo</th>` : `<th>Area</th><th>Cliente/card</th><th>Tipo</th>`}
          </tr>
        </thead>
        <tbody>
          ${rows.slice(0, 80).map((row) => `
            <tr title="${escapeAttr(row.pagina || "")}">
              <td>${escapeHtml(row.date)}</td>
              <td><strong>${escapeHtml(row.hora)}</strong></td>
              ${isAccess
                ? `<td>${escapeHtml(row.origem)}</td><td>${escapeHtml(row.canal)}</td><td>${escapeHtml(row.cidade)}</td><td>${escapeHtml(row.dispositivo)}</td>`
                : `<td>${escapeHtml(row.area)}</td><td>${escapeHtml(row.cliente)}</td><td>${escapeHtml(row.tipo)}</td>`}
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
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
    promocoes: filterDailyMetrics(state.metricas.promocoes, periodRange),
    origemAcessos: filterDailyMetrics(state.metricas.origemAcessos, periodRange),
    instalacoesPWA: filterDailyMetrics(state.metricas.instalacoesPWA, periodRange),
    usoPWA: filterDailyMetrics(state.metricas.usoPWA, periodRange)
  };

  const reportClients = state.clientes.filter(isReportClient);
  const totalClientes = reportClients.length;
  const ativos = reportClients.filter((c) => c.status === "ativo");
  const inativos = reportClients.filter((c) => c.status === "inativo");
  const pendentes = reportClients.filter((c) => c.status === "pendente");
  const pagos = reportClients.filter((c) => c.pagamentoStatus === "pago");
  const abertos = reportClients.filter((c) => !c.pagamentoStatus || c.pagamentoStatus === "em_aberto");
  const isentos = reportClients.filter((c) => c.pagamentoStatus === "isento");
  const destaques = reportClients.filter((c) => destaqueIsActive(c));
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
  const origensAcesso = aggregateOrigemAcessos(filteredMetrics.acessos, filteredMetrics.origemAcessos);
  const instalacoesPWA = aggregatePWAInstalls(filteredMetrics.instalacoesPWA);
  const usoPWA = aggregateUsoPWA(filteredMetrics.usoPWA);
  const totalAcessos = Object.values(filteredMetrics.acessos || {}).reduce((sum, dia) => sum + Number(dia?.total || 0), 0);
  const clickTimeline = buildClickTimeline(state.metricas, periodRange);
  const accessTimeline = buildAccessTimeline(filteredMetrics.acessos, periodRange);
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
      <article class="stat-card" data-report-period="${escapeAttr(periodRange.label)}"><span>Destaques semanais</span><strong>${destaques.length}</strong><small>${moneyBR(destaques.reduce((sum, c) => sum + destaqueValueForClient(c), 0))}</small></article>
      <article class="stat-card" data-report-period="${escapeAttr(periodRange.label)}"><span>Com foto</span><strong>${comImagem.length}</strong><small>${reportPercent(comImagem.length, totalClientes)} dos clientes</small></article>
      <article class="stat-card" data-report-period="${escapeAttr(periodRange.label)}"><span>Acessos no site</span><strong>${totalAcessos}</strong><small>Registros do periodo</small></article>
      <article class="stat-card" data-report-period="${escapeAttr(periodRange.label)}"><span>Instalacoes PWA</span><strong>${instalacoesPWA}</strong><small>App instalado</small></article>
      <article class="stat-card" data-report-period="${escapeAttr(periodRange.label)}"><span>Uso via PWA</span><strong>${usoPWA}</strong><small>Acessos pelo app</small></article>
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
        ${renderReportCardHeader("Meios de acesso", periodRange)}
        ${renderReportList(topFromMap(origensAcesso, 12, "acesso", "acessos"), "Ainda nao ha origem de acesso registrada.")}
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

      <section class="panel-card report-card report-wide">
        ${renderReportCardHeader("Horarios dos cliques dos cards", periodRange)}
        ${renderTimelineTable(clickTimeline, "Ainda nao ha horarios detalhados de cliques neste periodo.")}
      </section>

      <section class="panel-card report-card report-wide">
        ${renderReportCardHeader("Horarios e origem dos acessos", periodRange)}
        ${renderTimelineTable(accessTimeline, "Ainda nao ha acessos detalhados neste periodo.", "access")}
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
  if ($("paymentNewsVisibleDays")) $("paymentNewsVisibleDays").value = config.diasNovidadesVisiveis || 5;
  $("paymentInvoiceNote").value = config.observacaoFatura || "";
}

function renderHomePageSettings() {
  if (!$("homePageForm")) return;
  const config = state.paginaInicialSite || {};
  const imagens = Array.isArray(config.imagens) ? config.imagens.filter(Boolean) : [];
  $("homeBannerActive").checked = config.ativo !== false;
  $("homeBannerTitle").value = config.titulo || "Carlópolis em tempo real";
  $("homeBannerSubtitle").value = config.subtitulo || "Acesse os principais serviços, eventos, novidades e promoções da cidade.";
  const list = $("homeBannerImagesList");
  if (!list) return;
  list.innerHTML = imagens.length ? imagens.map((url, index) => `
    <article class="home-banner-admin-item">
      <img src="${escapeAttr(url)}" alt="Foto ${index + 1} do banner" loading="lazy">
      <button type="button" class="danger-mini" data-remove-home-banner-image="${index}">
        <i class="fa-solid fa-trash"></i> Remover
      </button>
    </article>
  `).join("") : `<div class="list-meta">Nenhuma foto cadastrada. O site usara a imagem padrao ate voce adicionar fotos.</div>`;

  list.querySelectorAll("[data-remove-home-banner-image]").forEach((button) => {
    button.addEventListener("click", async () => {
      const index = Number(button.dataset.removeHomeBannerImage);
      const nextImages = imagens.filter((_, imgIndex) => imgIndex !== index);
      await update(ref(db, "configuracoes/paginaInicial"), {
        imagens: nextImages,
        updatedAt: serverTimestamp(),
        updatedBy: state.user.uid
      });
      state.paginaInicialSite = { ...state.paginaInicialSite, imagens: nextImages };
      renderHomePageSettings();
      showToast("Foto removida do banner.");
    });
  });
}

async function uploadHomeBannerImages(files) {
  const selected = Array.from(files || []).filter((file) => file.type?.startsWith("image/"));
  if (!selected.length) return;
  const currentImages = Array.isArray(state.paginaInicialSite?.imagens) ? state.paginaInicialSite.imagens.filter(Boolean) : [];
  const uploaded = [];
  for (const file of selected) {
    const path = `configuracoes/paginaInicial/banner/${Date.now()}-${slugify(file.name || "banner")}`;
    const fileRef = storageRef(storage, path);
    const url = await uploadFileWithProgress(fileRef, file, "Enviando foto do banner", `${file.name || "imagem"} (${uploaded.length + 1}/${selected.length})`);
    uploaded.push(url);
  }
  const imagens = [...currentImages, ...uploaded];
  await update(ref(db, "configuracoes/paginaInicial"), {
    imagens,
    updatedAt: serverTimestamp(),
    updatedBy: state.user.uid
  });
  state.paginaInicialSite = { ...state.paginaInicialSite, imagens };
  renderHomePageSettings();
  showToast("Fotos do banner enviadas.");
}

const STORY_TEMPLATE_NAMES = {
  vitrine: "Vitrine",
  humor: "Humor",
  seriedade: "Seriedade",
  alegria: "Alegria",
  marketing: "Marketing Pro",
  acolhimento: "Acolhimento",
  exclusivo: "Exclusivo"
};

let storyPreviewRequest = 0;
let storyPreviewTimer = null;

function scheduleStoryPreview() {
  window.clearTimeout(storyPreviewTimer);
  storyPreviewTimer = window.setTimeout(atualizarPreviaStory, 180);
}

function storyCurrentClient() {
  return state.clientes.find((client) => client.id === $("storyClient")?.value) || state.clientes[0] || null;
}

function storyClientImages(client = {}) {
  const items = normalizeImageItems(client.imagens);
  const urls = [
    ...items.map((item) => item.url),
    client.imagem,
    client.logo,
    client.logoUrl
  ].map(normalizarImagemArteAdmin).filter(Boolean);
  return [...new Set(urls)];
}

function fillStoryClientImages(client, preserveValue = true) {
  const select = $("storyClientImage");
  if (!select) return;
  const previous = preserveValue ? select.value : "";
  const images = storyClientImages(client);
  select.innerHTML = images.length
    ? images.map((url, index) => `<option value="${escapeAttr(url)}">Imagem ${index + 1}${index === 0 ? " - principal" : ""}</option>`).join("")
    : `<option value="">Usar logo do Ola Carlopolis</option>`;
  if (previous && images.includes(previous)) select.value = previous;
}

function renderStoriesComerciaisView() {
  if (!isMaster() || !$("storyClient")) return;
  const clients = [...state.clientes].sort((a, b) => String(a.nome || a.id || "").localeCompare(String(b.nome || b.id || ""), "pt-BR"));
  const previous = $("storyClient").value;
  $("storyClient").innerHTML = clients.length
    ? clients.map((client) => `<option value="${escapeAttr(client.id)}">${escapeHtml(client.nome || client.id)}</option>`).join("")
    : `<option value="">Nenhum cliente cadastrado</option>`;
  if (previous && clients.some((client) => client.id === previous)) $("storyClient").value = previous;
  fillStoryClientImages(storyCurrentClient());
  atualizarPreviaStory();
}

function storyContactLine(client = {}) {
  const phone = telefoneArteAdmin(client.whatsapp || client.contato || "");
  const instagramRaw = String(client.instagram || "").trim();
  const instagram = instagramRaw
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "@")
    .replace(/\/$/, "");
  return [phone, instagram && (instagram.startsWith("@") ? instagram : `@${instagram}`)].filter(Boolean).join("  |  ");
}

function storyDrawText(ctx, text, x, y, width, lines, color, size, align = "left", weight = 900, lineHeight = size * 1.08) {
  ctx.fillStyle = color;
  return desenharTextoInteiroCanvas(ctx, text, x, y, width, lines, {
    peso: weight,
    tamanho: size,
    minimo: Math.max(22, Math.round(size * .55)),
    lineHeight,
    align,
    familia: "Arial"
  });
}

function storyDrawLogo(ctx, logo, client, x, y, size, borderColor = "#ffffff") {
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,.28)";
  ctx.shadowBlur = 28;
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size / 2 - 3, 0, Math.PI * 2);
  ctx.stroke();
  if (logo) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2 - 10, 0, Math.PI * 2);
    ctx.clip();
    desenharImagemContain(ctx, logo, x + 10, y + 10, size - 20, size - 20, 0, "#fff");
    ctx.restore();
  } else {
    ctx.fillStyle = "#111827";
    ctx.textAlign = "center";
    ctx.font = "900 28px Arial";
    ctx.fillText(String(client.nome || "OC").slice(0, 2).toUpperCase(), x + size / 2, y + size / 2 + 10);
  }
}

function storyDrawProspectFooter(ctx, showProspect, dark = true) {
  if (!showProspect) return;
  const bg = dark ? "rgba(8,12,20,.92)" : "rgba(255,255,255,.94)";
  const ink = dark ? "#fff" : "#172033";
  preencherRoundRect(ctx, 64, 1740, 952, 118, 28, bg);
  ctx.fillStyle = ink;
  ctx.textAlign = "left";
  ctx.font = "900 27px Arial";
  ctx.fillText("Quer sua empresa aparecendo assim?", 104, 1791);
  ctx.font = "700 21px Arial";
  ctx.fillText("Anuncie no Ola Carlopolis e seja encontrado por quem esta perto.", 104, 1830, 790);
  ctx.fillStyle = "#f4b942";
  ctx.beginPath();
  ctx.arc(958, 1798, 30, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#111827";
  ctx.textAlign = "center";
  ctx.font = "900 30px Arial";
  ctx.fillText(">", 958, 1808);
}

function storyDrawContact(ctx, client, showContact, x, y, width, color, align = "left") {
  if (!showContact) return;
  const contact = storyContactLine(client);
  if (!contact) return;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.font = "800 23px Arial";
  ctx.fillText(contact, x, y, width);
}

function storyDrawSmartPhoto(ctx, img, x, y, w, h, radius = 30, frame = "#ffffff") {
  ctx.save();
  canvasRoundRect(ctx, x, y, w, h, radius);
  ctx.clip();
  ctx.fillStyle = frame;
  ctx.fillRect(x, y, w, h);
  if (img) {
    ctx.save();
    ctx.filter = "blur(24px) saturate(.8)";
    ctx.globalAlpha = .56;
    desenharImagemCover(ctx, img, x - 35, y - 35, w + 70, h + 70, 0);
    ctx.restore();
    ctx.fillStyle = "rgba(8,15,28,.18)";
    ctx.fillRect(x, y, w, h);
    desenharImagemContain(ctx, img, x + 22, y + 22, w - 44, h - 44, Math.max(8, radius - 10), "rgba(255,255,255,.9)");
  } else {
    desenharImagemCover(ctx, null, x, y, w, h, 0);
  }
  ctx.restore();
  desenharBordaRoundRect(ctx, x, y, w, h, radius, "rgba(255,255,255,.8)", 4);
}

function desenharStoryVitrine(ctx, data) {
  const { photo, logo, client, headline, message, cta, accent, showContact, showProspect } = data;
  const bg = ctx.createLinearGradient(0, 0, 1080, 1920);
  bg.addColorStop(0, "#ff4d35");
  bg.addColorStop(.55, "#7c2bd4");
  bg.addColorStop(1, "#3b1685");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1080, 1920);
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(900, 185, 220, 0, Math.PI * 2);
  ctx.fill();
  storyDrawLogo(ctx, logo, client, 70, 78, 135, "#fff");
  storyDrawText(ctx, client.nome || "Cliente", 230, 125, 650, 2, "#fff", 39);
  ctx.save();
  ctx.rotate(-4 * Math.PI / 180);
  preencherRoundRect(ctx, 95, 330, 890, 780, 54, "#fff");
  storyDrawSmartPhoto(ctx, photo || logo, 120, 355, 840, 730, 36);
  ctx.restore();
  preencherRoundRect(ctx, 62, 1100, 956, 430, 38, "rgba(255,255,255,.96)");
  storyDrawText(ctx, headline, 105, 1180, 870, 4, "#22103f", 64);
  storyDrawText(ctx, message, 105, 1420, 810, 3, "#5b4a70", 28, "left", 700);
  preencherRoundRect(ctx, 105, 1580, 410, 82, 41, accent);
  storyDrawText(ctx, cta, 310, 1612, 360, 1, "#111827", 25, "center");
  storyDrawContact(ctx, client, showContact, 970, 1628, 390, "#fff", "right");
  storyDrawProspectFooter(ctx, showProspect, true);
}

function desenharStoryHumor(ctx, data) {
  const { photo, logo, client, headline, message, cta, accent, showContact, showProspect } = data;
  ctx.fillStyle = "#24d4c4";
  ctx.fillRect(0, 0, 1080, 1920);
  ctx.fillStyle = "#ffe04b";
  ctx.beginPath();
  ctx.arc(930, 150, 250, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ff6b6b";
  ctx.beginPath();
  ctx.arc(65, 1080, 170, 0, Math.PI * 2);
  ctx.fill();
  storyDrawLogo(ctx, logo, client, 64, 58, 132, "#fff");
  storyDrawText(ctx, client.nome || "Cliente", 225, 105, 650, 2, "#123047", 38);
  preencherRoundRect(ctx, 65, 250, 950, 205, 34, "#fff");
  storyDrawText(ctx, headline, 540, 315, 860, 3, "#123047", 57, "center");
  ctx.save();
  ctx.translate(540, 850);
  ctx.rotate(3 * Math.PI / 180);
  storyDrawSmartPhoto(ctx, photo || logo, -430, -340, 860, 680, 45);
  ctx.restore();
  preencherRoundRect(ctx, 130, 1225, 820, 170, 70, "#123047");
  storyDrawText(ctx, message, 540, 1270, 720, 3, "#fff", 28, "center", 700);
  preencherRoundRect(ctx, 285, 1455, 510, 88, 44, accent);
  storyDrawText(ctx, cta, 540, 1490, 450, 1, "#123047", 27, "center");
  storyDrawContact(ctx, client, showContact, 540, 1640, 780, "#123047", "center");
  storyDrawProspectFooter(ctx, showProspect, false);
}

function desenharStorySeriedade(ctx, data) {
  const { photo, logo, client, headline, message, cta, accent, showContact, showProspect } = data;
  ctx.fillStyle = "#081b33";
  ctx.fillRect(0, 0, 1080, 1920);
  ctx.fillStyle = "#3b82a0";
  ctx.fillRect(0, 0, 18, 1920);
  storyDrawLogo(ctx, logo, client, 72, 70, 128, "#9fc4d5");
  storyDrawText(ctx, client.nome || "Cliente", 230, 112, 730, 2, "#fff", 39);
  storyDrawSmartPhoto(ctx, photo || logo, 62, 265, 956, 720, 18);
  ctx.fillStyle = "#d7e2ef";
  ctx.fillRect(62, 1045, 956, 3);
  storyDrawText(ctx, headline, 62, 1135, 920, 4, "#fff", 68);
  storyDrawText(ctx, message, 62, 1430, 850, 3, "#afc0d2", 29, "left", 650);
  preencherRoundRect(ctx, 62, 1570, 430, 84, 8, accent);
  storyDrawText(ctx, cta, 277, 1603, 380, 1, "#081b33", 26, "center");
  storyDrawContact(ctx, client, showContact, 1015, 1622, 460, "#d7e2ef", "right");
  storyDrawProspectFooter(ctx, showProspect, true);
}

function desenharStoryAlegria(ctx, data) {
  const { photo, logo, client, headline, message, cta, accent, showContact, showProspect } = data;
  const bg = ctx.createLinearGradient(0, 0, 1080, 1920);
  bg.addColorStop(0, "#ff963f");
  bg.addColorStop(.55, "#ffcf4a");
  bg.addColorStop(1, "#ef4e7b");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1080, 1920);
  ctx.fillStyle = "rgba(255,255,255,.24)";
  ctx.beginPath();
  ctx.arc(540, 610, 500, 0, Math.PI * 2);
  ctx.fill();
  storyDrawLogo(ctx, logo, client, 70, 65, 132, "#fff");
  storyDrawText(ctx, client.nome || "Cliente", 230, 110, 700, 2, "#6c2745", 40);
  storyDrawText(ctx, headline, 540, 270, 900, 3, "#6c2745", 64, "center");
  storyDrawSmartPhoto(ctx, photo || logo, 120, 555, 840, 650, 90);
  preencherRoundRect(ctx, 80, 1260, 920, 235, 45, "rgba(255,255,255,.92)");
  storyDrawText(ctx, message, 540, 1325, 820, 4, "#6c2745", 30, "center", 700);
  preencherRoundRect(ctx, 300, 1535, 480, 86, 43, accent);
  storyDrawText(ctx, cta, 540, 1569, 430, 1, "#52203a", 27, "center");
  storyDrawContact(ctx, client, showContact, 540, 1680, 800, "#6c2745", "center");
  storyDrawProspectFooter(ctx, showProspect, false);
}

function desenharStoryMarketing(ctx, data) {
  const { photo, logo, client, headline, message, cta, accent, showContact, showProspect } = data;
  ctx.fillStyle = "#101828";
  ctx.fillRect(0, 0, 1080, 1920);
  ctx.fillStyle = "#2f6bff";
  ctx.fillRect(0, 0, 1080, 20);
  storyDrawLogo(ctx, logo, client, 66, 62, 126, "#64e572");
  storyDrawText(ctx, client.nome || "Cliente", 220, 106, 690, 2, "#fff", 38);
  preencherRoundRect(ctx, 65, 235, 950, 265, 26, "#17233a");
  ctx.fillStyle = "#64e572";
  ctx.font = "900 22px Arial";
  ctx.textAlign = "left";
  ctx.fillText("MARCA LOCAL EM DESTAQUE", 102, 292);
  storyDrawText(ctx, headline, 102, 350, 860, 3, "#fff", 55);
  storyDrawSmartPhoto(ctx, photo || logo, 65, 550, 950, 680, 26);
  preencherRoundRect(ctx, 65, 1280, 950, 220, 26, "#eaf0ff");
  storyDrawText(ctx, message, 105, 1340, 870, 4, "#26334d", 29, "left", 700);
  preencherRoundRect(ctx, 65, 1545, 455, 86, 12, accent);
  storyDrawText(ctx, cta, 292, 1578, 400, 1, "#101828", 26, "center");
  ctx.fillStyle = "#64e572";
  ctx.font = "900 18px Arial";
  ctx.textAlign = "right";
  ctx.fillText("VISIBILIDADE  •  PRESENCA  •  RESULTADO", 1015, 1598);
  storyDrawContact(ctx, client, showContact, 65, 1690, 820, "#d6e1f3");
  storyDrawProspectFooter(ctx, showProspect, true);
}

function desenharStoryAcolhimento(ctx, data) {
  const { photo, logo, client, headline, message, cta, accent, showContact, showProspect } = data;
  ctx.fillStyle = "#f4eadc";
  ctx.fillRect(0, 0, 1080, 1920);
  ctx.fillStyle = "#9b4f3f";
  ctx.fillRect(0, 0, 1080, 510);
  storyDrawLogo(ctx, logo, client, 70, 65, 132, "#f4d2ad");
  storyDrawText(ctx, client.nome || "Cliente", 230, 110, 700, 2, "#fff", 40);
  storyDrawText(ctx, headline, 70, 255, 920, 4, "#fff", 59);
  storyDrawSmartPhoto(ctx, photo || logo, 105, 570, 870, 690, 100, "#f8efe4");
  storyDrawText(ctx, message, 540, 1335, 860, 4, "#6d3c33", 31, "center", 650);
  preencherRoundRect(ctx, 310, 1535, 460, 86, 43, accent);
  storyDrawText(ctx, cta, 540, 1569, 410, 1, "#5a3028", 27, "center");
  storyDrawContact(ctx, client, showContact, 540, 1680, 790, "#6d3c33", "center");
  storyDrawProspectFooter(ctx, showProspect, false);
}

function desenharStoryExclusivo(ctx, data) {
  const { photo, logo, client, headline, message, cta, accent, showContact, showProspect } = data;
  ctx.fillStyle = "#090909";
  ctx.fillRect(0, 0, 1080, 1920);
  const gold = ctx.createLinearGradient(0, 0, 1080, 0);
  gold.addColorStop(0, "#8a6a2c");
  gold.addColorStop(.5, "#f0d58b");
  gold.addColorStop(1, "#8a6a2c");
  ctx.fillStyle = gold;
  ctx.fillRect(60, 55, 960, 5);
  storyDrawLogo(ctx, logo, client, 72, 95, 130, "#d7b667");
  storyDrawText(ctx, client.nome || "Cliente", 230, 140, 720, 2, "#f4ead2", 39);
  storyDrawSmartPhoto(ctx, photo || logo, 75, 310, 930, 780, 8, "#18140e");
  storyDrawText(ctx, headline, 540, 1170, 920, 4, "#f4ead2", 62, "center");
  ctx.fillStyle = "#c9a24f";
  ctx.fillRect(430, 1430, 220, 3);
  storyDrawText(ctx, message, 540, 1490, 820, 3, "#b8ad98", 27, "center", 650);
  preencherRoundRect(ctx, 315, 1610, 450, 78, 4, accent);
  storyDrawText(ctx, cta, 540, 1640, 400, 1, "#090909", 25, "center");
  storyDrawContact(ctx, client, showContact, 540, 1718, 780, "#f4ead2", "center");
  storyDrawProspectFooter(ctx, showProspect, true);
}

async function atualizarPreviaStory() {
  const canvas = $("storyCanvas");
  const client = storyCurrentClient();
  if (!canvas || !client) return;
  const requestId = ++storyPreviewRequest;
  const ctx = canvas.getContext("2d");
  const selectedImage = state.storyCustomImage || $("storyClientImage")?.value || storyClientImages(client)[0] || "";
  const [photo, logo] = await Promise.all([
    carregarImagemCanvas(selectedImage),
    carregarImagemCanvas(logoClienteImovelAdmin(client))
  ]);
  if (requestId !== storyPreviewRequest) return;
  const data = {
    photo,
    logo,
    client,
    headline: $("storyHeadline")?.value.trim() || "Sua marca merece ser vista.",
    message: $("storyMessage")?.value.trim() || "Perto das pessoas, todos os dias.",
    cta: $("storyCta")?.value.trim() || "Conheca este cliente",
    accent: $("storyAccent")?.value || "#f4b942",
    showContact: $("storyShowContact")?.checked !== false,
    showProspect: $("storyShowProspect")?.checked !== false
  };
  const template = state.selectedStoryTemplate || "vitrine";
  const drawers = {
    vitrine: desenharStoryVitrine,
    humor: desenharStoryHumor,
    seriedade: desenharStorySeriedade,
    alegria: desenharStoryAlegria,
    marketing: desenharStoryMarketing,
    acolhimento: desenharStoryAcolhimento,
    exclusivo: desenharStoryExclusivo
  };
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  (drawers[template] || drawers.vitrine)(ctx, data);
  if ($("storyPreviewModel")) $("storyPreviewModel").textContent = `Modelo ${STORY_TEMPLATE_NAMES[template] || "Vitrine"}`;
}

async function baixarStoryComercial() {
  const client = storyCurrentClient();
  if (!client) return showToast("Selecione um cliente.");
  const button = $("storyDownload");
  if (button) button.disabled = true;
  try {
    await atualizarPreviaStory();
    const blob = await canvasParaBlob($("storyCanvas"));
    baixarBlobCanvas(blob, `story-${slugify(client.nome || client.id)}-${state.selectedStoryTemplate}.png`);
    showToast("Story comercial gerado em alta resolucao.");
  } catch (error) {
    console.error("Falha ao gerar story comercial.", error);
    showToast("Nao foi possivel gerar o story.");
  } finally {
    if (button) button.disabled = false;
  }
}

const PROMO_ARTE_LAYOUTS = {
  classico: { nome: "Classico", primary: "#e7192d", primaryDark: "#a90d1d", secondary: "#fde9ec", dark: "#202124", variant: 0 },
  elegante: { nome: "Elegante", primary: "#b58a21", primaryDark: "#71520b", secondary: "#f7efd7", dark: "#171717", variant: 1 },
  moderno: { nome: "Moderno", primary: "#2166d1", primaryDark: "#123b82", secondary: "#e4edff", dark: "#162033", variant: 2 },
  comercial: { nome: "Comercial", primary: "#f05a18", primaryDark: "#aa3105", secondary: "#ffeadf", dark: "#201815", variant: 3 },
  suave: { nome: "Suave", primary: "#138a72", primaryDark: "#075848", secondary: "#def5ef", dark: "#15332c", variant: 4 },
  destaque: { nome: "Destaque", primary: "#7c3aed", primaryDark: "#4c1d95", secondary: "#eee5ff", dark: "#25143d", variant: 5 }
};

function promoImagemPrincipalAdmin(promo = {}, client = {}) {
  return normalizarImagemArteAdmin(promo.imagem || "");
}

function promoPrecoArte(valor) {
  const raw = String(valor || "").trim();
  if (!raw) return "CONSULTE";
  const numeric = numberFromMoney(raw);
  return numeric > 0
    ? numeric.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : raw.replace(/^R\$\s*/i, "");
}

function promoValidadeArte(promo = {}, validadeEditada = "") {
  if (validadeEditada) return `VALIDA ATE ${formatDateBR(validadeEditada)}`;
  if (promo.validadeFim) return `VALIDA ATE ${formatDateBR(promo.validadeFim)}`;
  if (promo.validadeInicio) return `A PARTIR DE ${formatDateBR(promo.validadeInicio)}`;
  return "OFERTA POR TEMPO LIMITADO";
}

function desenharTextoPromoCanvas(ctx, text, x, y, maxWidth, maxLines, options = {}) {
  return desenharTextoInteiroCanvas(ctx, String(text || "").toUpperCase(), x, y, maxWidth, maxLines, {
    peso: options.peso || 900,
    tamanho: options.tamanho || 54,
    minimo: options.minimo || 22,
    lineHeight: options.lineHeight || 58,
    familia: options.familia || "Arial",
    align: options.align || "left",
    blockHeight: options.blockHeight || 0
  });
}

function desenharLogoClientePromo(ctx, logo, client, layout, x, y, w, h, inverted = false) {
  const cardColor = inverted ? "rgba(17,19,24,.9)" : "rgba(255,255,255,.94)";
  preencherRoundRect(ctx, x, y, w, h, 22, cardColor);
  desenharBordaRoundRect(ctx, x, y, w, h, 22, inverted ? "rgba(255,255,255,.25)" : "rgba(17,19,24,.1)", 2);
  if (logo) desenharImagemContain(ctx, logo, x + 16, y + 14, 96, h - 28, 14, "rgba(255,255,255,0)");
  ctx.fillStyle = inverted ? "#fff" : layout.dark;
  desenharTextoPromoCanvas(ctx, client.nome || "ANUNCIANTE", x + 128, y + 28, w - 150, 2, {
    tamanho: 27,
    minimo: 15,
    lineHeight: 28,
    blockHeight: h - 48
  });
}

function desenharRodapePromo(ctx, promo, client, layout, siteLogo) {
  ctx.fillStyle = layout.dark;
  ctx.fillRect(0, 970, 1080, 110);
  ctx.fillStyle = "#fff";
  ctx.textAlign = "left";
  const contact = telefoneArteAdmin(client.whatsapp || client.contato || "");
  const detail = [promo.unidade, promo.volume, promo.embalagem].filter(Boolean).join(" • ");
  ctx.font = "800 20px Arial";
  ctx.fillText(detail || promoValidadeArte(promo), 42, 1014, 650);
  ctx.font = "900 25px Arial";
  ctx.fillText(contact ? `WHATSAPP ${contact}` : promoValidadeArte(promo), 42, 1052, 650);
  if (siteLogo) desenharImagemContain(ctx, siteLogo, 875, 986, 165, 72, 0, "rgba(255,255,255,0)");
}

function desenharArtePromocao(ctx, promo, client, foto, logo, siteLogo, layout) {
  const price = promoPrecoArte(promo.preco);
  const oldPrice = promo.precoAntigo ? promoPrecoArte(promo.precoAntigo) : "";
  const callout = promo.desconto || promo.instagramMensagem || "OFERTA ESPECIAL";
  const description = promo.obs || [promo.volume, promo.embalagem, promo.unidade].filter(Boolean).join(" • ") || "Aproveite esta promocao";
  ctx.fillStyle = layout.light;
  ctx.fillRect(0, 0, 1080, 1080);

  if (layout.variant === 0 || layout.variant === 3) {
    desenharImagemCover(ctx, foto, 0, 230, 1080, 740, 0);
    const shade = ctx.createLinearGradient(0, 490, 0, 970);
    shade.addColorStop(0, "rgba(0,0,0,0)");
    shade.addColorStop(1, "rgba(0,0,0,.82)");
    ctx.fillStyle = shade;
    ctx.fillRect(0, 430, 1080, 540);
    ctx.fillStyle = layout.dark;
    ctx.fillRect(0, 0, 1080, 230);
    ctx.fillStyle = layout.primary;
    ctx.fillRect(0, 0, layout.variant === 0 ? 32 : 1080, layout.variant === 0 ? 230 : 18);
    desenharLogoClientePromo(ctx, logo, client, layout, 650, 42, 390, 142, true);
    ctx.fillStyle = layout.variant === 3 ? layout.secondary : layout.primary;
    desenharTextoPromoCanvas(ctx, callout, 48, 62, 550, 2, { tamanho: 52, minimo: 24, lineHeight: 52 });
    ctx.fillStyle = "#fff";
    desenharTextoPromoCanvas(ctx, promo.titulo, 54, 610, 670, 3, { tamanho: 66, minimo: 32, lineHeight: 67 });
    preencherRoundRect(ctx, 655, 710, 385, 210, 28, layout.primary);
    ctx.fillStyle = layout.variant === 3 ? layout.dark : "#fff";
    ctx.font = "800 20px Arial";
    ctx.fillText("POR APENAS", 690, 758);
    ctx.font = "900 34px Arial";
    ctx.fillText("R$", 690, 838);
    ctx.textAlign = "right";
    fonteQueCabeCanvas(ctx, price, 900, 72, 38, 275);
    ctx.fillText(price, 1010, 850);
  } else if (layout.variant === 1 || layout.variant === 5) {
    ctx.fillStyle = layout.dark;
    ctx.fillRect(0, 0, 1080, 1080);
    desenharImagemCover(ctx, foto, 340, 180, 740, 790, 0);
    const shade = ctx.createLinearGradient(300, 0, 760, 0);
    shade.addColorStop(0, layout.dark);
    shade.addColorStop(1, "rgba(17,17,17,0)");
    ctx.fillStyle = shade;
    ctx.fillRect(260, 180, 580, 790);
    desenharLogoClientePromo(ctx, logo, client, layout, 610, 34, 430, 132, false);
    ctx.fillStyle = layout.primary;
    preencherRoundRect(ctx, 42, 42, 300, 54, 24, layout.primary);
    ctx.fillStyle = layout.variant === 1 ? layout.dark : "#fff";
    ctx.textAlign = "center";
    ctx.font = "900 24px Arial";
    ctx.fillText(callout.toUpperCase(), 192, 78, 260);
    ctx.textAlign = "left";
    ctx.fillStyle = "#fff";
    desenharTextoPromoCanvas(ctx, promo.titulo, 48, 238, 490, 4, { tamanho: 69, minimo: 32, lineHeight: 68 });
    ctx.fillStyle = layout.secondary;
    desenharTextoPromoCanvas(ctx, description, 50, 560, 400, 3, { tamanho: 27, minimo: 17, lineHeight: 30, peso: 700 });
    preencherRoundRect(ctx, 45, 730, 500, 190, 26, layout.primary);
    ctx.fillStyle = layout.variant === 1 ? layout.dark : "#fff";
    ctx.font = "800 19px Arial";
    ctx.fillText("OFERTA", 78, 775);
    ctx.font = "900 31px Arial";
    ctx.fillText("R$", 78, 856);
    ctx.textAlign = "right";
    fonteQueCabeCanvas(ctx, price, 900, 72, 38, 350);
    ctx.fillText(price, 512, 866);
  } else {
    const topColor = layout.variant === 2 ? layout.secondary : layout.dark;
    ctx.fillStyle = topColor;
    ctx.fillRect(0, 0, 1080, 290);
    desenharLogoClientePromo(ctx, logo, client, layout, 600, 34, 440, 134, layout.variant === 4);
    ctx.fillStyle = layout.primary;
    preencherRoundRect(ctx, 42, 42, 310, 52, 22, layout.primary);
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.font = "900 23px Arial";
    ctx.fillText(callout.toUpperCase(), 197, 77, 280);
    ctx.textAlign = "left";
    ctx.fillStyle = layout.variant === 2 ? layout.dark : "#fff";
    desenharTextoPromoCanvas(ctx, promo.titulo, 48, 135, 520, 2, { tamanho: 55, minimo: 28, lineHeight: 55 });
    desenharImagemCover(ctx, foto, 40, 320, 1000, 500, 28);
    desenharBordaRoundRect(ctx, 40, 320, 1000, 500, 28, layout.primary, 5);
    preencherRoundRect(ctx, 555, 690, 455, 220, 30, layout.primary);
    ctx.fillStyle = "#fff";
    ctx.font = "800 20px Arial";
    ctx.fillText("PRECO PROMOCIONAL", 590, 738);
    ctx.font = "900 34px Arial";
    ctx.fillText("R$", 590, 838);
    ctx.textAlign = "right";
    fonteQueCabeCanvas(ctx, price, 900, 74, 38, 330);
    ctx.fillText(price, 974, 850);
    ctx.fillStyle = layout.dark;
    preencherRoundRect(ctx, 70, 835, 430, 92, 20, layout.secondary);
    ctx.fillStyle = layout.dark;
    desenharTextoPromoCanvas(ctx, description, 95, 852, 380, 2, { tamanho: 24, minimo: 15, lineHeight: 26, blockHeight: 58 });
  }

  if (oldPrice) {
    ctx.fillStyle = layout.secondary;
    preencherRoundRect(ctx, 730, 650, 280, 44, 18, layout.secondary);
    ctx.fillStyle = layout.dark;
    ctx.textAlign = "center";
    ctx.font = "800 18px Arial";
    ctx.fillText(`DE R$ ${oldPrice}`, 870, 679, 250);
  }
  ctx.fillStyle = "#fff";
  ctx.textAlign = "left";
  ctx.font = "800 18px Arial";
  ctx.fillText(promoValidadeArte(promo), 50, 950, 510);
  desenharRodapePromo(ctx, promo, client, layout, siteLogo);
}

function promoPrecoPartes(valor) {
  const formatted = promoPrecoArte(valor);
  if (formatted === "CONSULTE") return { inteiro: "CONSULTE", centavos: "", consulta: true };
  const [inteiro, centavos = "00"] = formatted.split(",");
  return { inteiro, centavos: `,${centavos}`, consulta: false };
}

function desenharBordaTracejadaPromo(ctx, x, y, w, h, radius, color, width = 3) {
  ctx.save();
  canvasRoundRect(ctx, x, y, w, h, radius);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.setLineDash([10, 8]);
  ctx.stroke();
  ctx.restore();
}

function desenharDecoracaoPromoNova(ctx, layout) {
  const bg = ctx.createLinearGradient(0, 0, 1080, 1080);
  bg.addColorStop(0, "#ffffff");
  bg.addColorStop(1, "#f1f2f4");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1080, 1080);
  ctx.fillStyle = layout.primary;
  ctx.beginPath();
  ctx.moveTo(840, 0);
  ctx.quadraticCurveTo(1060, 25, 1080, 250);
  ctx.lineTo(1080, 0);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(0, 780);
  ctx.quadraticCurveTo(135, 920, 310, 1080);
  ctx.lineTo(0, 1080);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = layout.dark;
  ctx.beginPath();
  ctx.moveTo(925, 1080);
  ctx.lineTo(1080, 900);
  ctx.lineTo(1080, 1080);
  ctx.closePath();
  ctx.fill();
  [[48, 42], [72, 42], [96, 42], [992, 68], [1016, 68]].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
  });
}

function desenharLogoPromoNova(ctx, logo, client, layout) {
  ctx.save();
  ctx.shadowColor = "rgba(17,24,39,.34)";
  ctx.shadowBlur = 28;
  ctx.shadowOffsetY = 10;
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(245, 125, 84, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = layout.primary;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(245, 125, 84, 0, Math.PI * 2);
  ctx.stroke();
  if (logo) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(245, 125, 74, 0, Math.PI * 2);
    ctx.clip();
    desenharImagemContain(ctx, logo, 171, 51, 148, 148, 0, "#fff");
    ctx.restore();
  } else {
    ctx.strokeStyle = layout.primary;
    ctx.lineWidth = 4;
    ctx.strokeRect(215, 108, 60, 44);
    ctx.beginPath();
    ctx.arc(245, 108, 17, Math.PI, 0);
    ctx.stroke();
    ctx.fillStyle = layout.dark;
    ctx.textAlign = "center";
    ctx.font = "800 11px Arial";
    ctx.fillText("SUA LOGO AQUI", 245, 184);
  }
  ctx.fillStyle = layout.dark;
  ctx.textAlign = "center";
  desenharTextoPromoCanvas(ctx, client.nome || "EMPRESA", 245, 215, 380, 2, {
    tamanho: 31,
    minimo: 17,
    lineHeight: 31,
    align: "center",
    blockHeight: 72
  });
  ctx.strokeStyle = layout.primary;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(130, 305);
  ctx.lineTo(220, 305);
  ctx.moveTo(270, 305);
  ctx.lineTo(360, 305);
  ctx.stroke();
  ctx.fillStyle = layout.primary;
  ctx.beginPath();
  ctx.arc(245, 305, 6, 0, Math.PI * 2);
  ctx.fill();
}

function desenharImagemPromoNova(ctx, foto, layout, fit = "cover") {
  const geometries = [
    [535, 120, 500, 625],
    [45, 120, 500, 625],
    [575, 82, 450, 665],
    [22, 165, 525, 580],
    [515, 155, 520, 590],
    [72, 88, 455, 660]
  ];
  const [x, y, w, h] = geometries[layout.variant] || geometries[0];
  ctx.save();
  ctx.shadowColor = "rgba(17,24,39,.22)";
  ctx.shadowBlur = layout.variant % 2 ? 30 : 22;
  ctx.shadowOffsetY = 14;
  preencherRoundRect(ctx, x, y, w, h, 42, "#fff");
  ctx.restore();
  desenharBordaRoundRect(ctx, x, y, w, h, 42, "rgba(255,255,255,.9)", 3);
  desenharBordaTracejadaPromo(ctx, x + 18, y + 18, w - 36, h - 36, 30, layout.primary, 3);
  if (foto) {
    const imageX = x + 34;
    const imageY = y + 34;
    const imageW = w - 68;
    const imageH = h - 68;
    if (fit === "contain") desenharImagemContain(ctx, foto, imageX, imageY, imageW, imageH, 24, "#f5f5f5");
    else desenharImagemCover(ctx, foto, imageX, imageY, imageW, imageH, 24);
    return;
  }
  ctx.strokeStyle = layout.primary;
  ctx.lineWidth = 5;
  const centerX = x + w / 2;
  const centerY = y + h / 2;
  ctx.strokeRect(centerX - 75, centerY - 75, 150, 118);
  ctx.beginPath();
  ctx.arc(centerX + 37, centerY - 40, 18, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(centerX - 63, centerY + 25);
  ctx.lineTo(centerX - 19, centerY - 20);
  ctx.lineTo(centerX + 17, centerY + 12);
  ctx.lineTo(centerX + 50, centerY - 18);
  ctx.lineTo(centerX + 65, centerY + 25);
  ctx.stroke();
  ctx.fillStyle = layout.dark;
  ctx.textAlign = "center";
  ctx.font = "800 21px Arial";
  ctx.fillText("SUA IMAGEM AQUI", centerX, centerY + 90);
}

function desenharIconeBeneficioPromo(ctx, type, cx, cy, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (type === 0) {
    ctx.beginPath();
    ctx.arc(cx, cy - 4, 12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - 7, cy + 7);
    ctx.lineTo(cx - 10, cy + 21);
    ctx.lineTo(cx, cy + 16);
    ctx.lineTo(cx + 10, cy + 21);
    ctx.lineTo(cx + 7, cy + 7);
    ctx.stroke();
  } else if (type === 1) {
    ctx.beginPath();
    ctx.arc(cx, cy, 15, Math.PI, 0);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - 15, cy);
    ctx.lineTo(cx - 15, cy + 13);
    ctx.moveTo(cx + 15, cy);
    ctx.lineTo(cx + 15, cy + 13);
    ctx.lineTo(cx + 7, cy + 13);
    ctx.stroke();
  } else {
    ctx.strokeRect(cx - 18, cy - 11, 25, 19);
    ctx.beginPath();
    ctx.moveTo(cx + 7, cy - 6);
    ctx.lineTo(cx + 17, cy - 6);
    ctx.lineTo(cx + 22, cy + 2);
    ctx.lineTo(cx + 22, cy + 8);
    ctx.lineTo(cx + 7, cy + 8);
    ctx.stroke();
    [cx - 10, cx + 15].forEach((wheelX) => {
      ctx.beginPath();
      ctx.arc(wheelX, cy + 12, 5, 0, Math.PI * 2);
      ctx.stroke();
    });
  }
  ctx.restore();
}

function desenharBeneficiosPromoNova(ctx, layout, benefits = []) {
  const visible = benefits.filter((item) => item?.enabled !== false && String(item?.title || item?.text || "").trim());
  if (!visible.length) return;
  preencherRoundRect(ctx, 34, 805, 1012, 135, 22, "rgba(255,255,255,.94)");
  const blockWidth = 980 / visible.length;
  visible.forEach((benefit, index) => {
    const x = 50 + index * blockWidth;
    if (index) {
      ctx.strokeStyle = "#d5d7db";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, 820);
      ctx.lineTo(x, 922);
      ctx.stroke();
    }
    ctx.fillStyle = layout.secondary;
    ctx.beginPath();
    ctx.arc(x + 48, 874, 34, 0, Math.PI * 2);
    ctx.fill();
    desenharIconeBeneficioPromo(ctx, benefit.icon ?? index, x + 48, 874, layout.primary);
    ctx.fillStyle = layout.dark;
    desenharTextoPromoCanvas(ctx, benefit.title, x + 94, 838, blockWidth - 110, 1, {
      tamanho: 23,
      minimo: 15,
      lineHeight: 24
    });
    ctx.fillStyle = "#5f6368";
    desenharTextoInteiroCanvas(ctx, benefit.text, x + 94, 872, blockWidth - 110, 3, {
      peso: 600,
      tamanho: 17,
      minimo: 12,
      lineHeight: 19,
      align: "left"
    });
  });
}

function promocaoTeveReducao(promo = {}) {
  const atual = numberFromMoney(promo.preco || "");
  const antigo = numberFromMoney(promo.precoAntigo || "");
  return atual > 0 && antigo > atual;
}

function desenharIconeInstagramPromo(ctx, cx, cy, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  canvasRoundRect(ctx, cx - 15, cy - 15, 30, 30, 8);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, 7, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cx + 9, cy - 9, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function desenharRodapeContatosPromo(ctx, client, layout, siteLogo, showSiteLogo = true) {
  const instagramRaw = String(client.instagram || "@seuinstagram").trim();
  const instagram = instagramRaw.replace(/^https?:\/\/(www\.)?instagram\.com\//i, "@").replace(/\/$/, "");
  const instagramLabel = instagram.startsWith("@") ? instagram : `@${instagram}`;
  const phone = telefoneArteAdmin(client.whatsapp || client.contato || "") || "(00) 00000-0000";
  const cards = showSiteLogo
    ? [
      { x: 34, w: 330, label: instagramLabel, type: "instagram" },
      { x: 375, w: 360, label: phone, type: "whatsapp" }
    ]
    : [
      { x: 34, w: 496, label: instagramLabel, type: "instagram" },
      { x: 550, w: 496, label: phone, type: "whatsapp" }
    ];
  cards.forEach((card) => {
    ctx.save();
    ctx.shadowColor = "rgba(17,24,39,.12)";
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 5;
    preencherRoundRect(ctx, card.x, 958, card.w, 88, 20, "rgba(255,255,255,.97)");
    ctx.restore();
    desenharBordaRoundRect(ctx, card.x, 958, card.w, 88, 20, "rgba(17,24,39,.1)", 2);
    ctx.fillStyle = layout.secondary;
    ctx.beginPath();
    ctx.arc(card.x + 46, 1002, 27, 0, Math.PI * 2);
    ctx.fill();
    if (card.type === "instagram") desenharIconeInstagramPromo(ctx, card.x + 46, 1002, layout.primary);
    else desenharIconeWhatsappCanvas(ctx, card.x + 46, 1002, layout.primary);
    ctx.fillStyle = layout.dark;
    ctx.textAlign = "left";
    fonteQueCabeCanvas(ctx, card.label, 900, 21, 14, card.w - 100);
    ctx.fillText(card.label, card.x + 88, 1010);
  });

  if (showSiteLogo) {
    ctx.save();
    ctx.shadowColor = "rgba(17,24,39,.12)";
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 5;
    preencherRoundRect(ctx, 746, 958, 300, 88, 20, "rgba(255,255,255,.97)");
    ctx.restore();
    desenharBordaRoundRect(ctx, 746, 958, 300, 88, 20, "rgba(17,24,39,.1)", 2);
    if (siteLogo) desenharImagemContain(ctx, siteLogo, 768, 966, 256, 72, 0, "rgba(255,255,255,0)");
  }
}

function desenharLogoPromoDireita(ctx, logo, client, layout) {
  ctx.save();
  ctx.shadowColor = "rgba(17,24,39,.34)";
  ctx.shadowBlur = 28;
  ctx.shadowOffsetY = 10;
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(815, 130, 84, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = layout.primary;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(815, 130, 84, 0, Math.PI * 2);
  ctx.stroke();
  if (logo) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(815, 130, 74, 0, Math.PI * 2);
    ctx.clip();
    desenharImagemContain(ctx, logo, 741, 56, 148, 148, 0, "#fff");
    ctx.restore();
  }
  ctx.fillStyle = layout.dark;
  ctx.textAlign = "center";
  desenharTextoPromoCanvas(ctx, client.nome || "EMPRESA", 815, 220, 400, 2, {
    tamanho: 31,
    minimo: 17,
    lineHeight: 31,
    align: "center",
    blockHeight: 72
  });
}

function desenharArtePromocaoInvertida(ctx, promo, client, foto, logo, siteLogo, layout, options = {}) {
  const price = promoPrecoPartes(promo.preco);
  const oldPrice = promo.precoAntigo ? promoPrecoArte(promo.precoAntigo) : "";
  desenharDecoracaoPromoNova(ctx, layout);
  desenharImagemPromoNova(ctx, foto, layout, options.imageFit || "cover");
  desenharLogoPromoDireita(ctx, logo, client, layout);

  ctx.fillStyle = layout.primary;
  desenharTextoPromoCanvas(ctx, "PROMO\u00c7\u00c3O", 810, 330, 420, 2, {
    tamanho: 59,
    minimo: 35,
    lineHeight: 59,
    align: "center",
    blockHeight: 102,
    familia: '"Arial Narrow", Arial, sans-serif'
  });
  ctx.fillStyle = layout.dark;
  desenharTextoPromoCanvas(ctx, promo.titulo || promo.desconto || "OFERTA ESPECIAL", 810, 425, 330, 2, {
    tamanho: 29,
    minimo: 17,
    lineHeight: 29,
    align: "center",
    blockHeight: 62,
    peso: 800
  });

  const priceGradient = ctx.createLinearGradient(625, 510, 1010, 670);
  priceGradient.addColorStop(0, layout.primary);
  priceGradient.addColorStop(1, layout.primaryDark);
  preencherRoundRect(ctx, 625, 510, 385, 160, 40, priceGradient);
  desenharBordaTracejadaPromo(ctx, 640, 525, 355, 130, 29, "rgba(255,255,255,.92)", 3);
  ctx.fillStyle = "#fff";
  if (price.consulta) {
    ctx.textAlign = "center";
    fonteQueCabeCanvas(ctx, "CONSULTE", 900, 52, 30, 310);
    ctx.fillText("CONSULTE", 817, 612);
  } else {
    ctx.textAlign = "left";
    ctx.font = "900 32px Arial";
    ctx.fillText("R$", 660, 610);
    ctx.textAlign = "right";
    fonteQueCabeCanvas(ctx, price.inteiro, 900, 70, 40, 230);
    ctx.fillText(price.inteiro, 910, 623);
    ctx.textAlign = "left";
    ctx.font = "900 29px Arial";
    ctx.fillText(price.centavos, 914, 598);
  }
  if (oldPrice) {
    const reduced = promocaoTeveReducao(promo);
    ctx.fillStyle = layout.dark;
    ctx.textAlign = "center";
    ctx.font = `${reduced ? 900 : 700} ${reduced ? 28 : 21}px Arial`;
    const oldText = `DE R$ ${oldPrice}`;
    ctx.fillText(oldText, 817, 714);
    const oldWidth = ctx.measureText(oldText).width;
    ctx.strokeStyle = layout.primary;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(817 - oldWidth / 2, 705);
    ctx.lineTo(817 + oldWidth / 2, 705);
    ctx.stroke();
  }
  ctx.fillStyle = "#5f6368";
  ctx.textAlign = "center";
  ctx.font = "800 17px Arial";
  ctx.fillText(promoValidadeArte(promo, options.validityDate), 817, oldPrice ? 758 : 720, 350);

  desenharBeneficiosPromoNova(ctx, layout, options.benefits || []);
  desenharRodapeContatosPromo(ctx, client, layout, siteLogo, options.showSiteLogo);
}

function desenharArtePromocaoNova(ctx, promo, client, foto, logo, siteLogo, layout, options = {}) {
  if (layout.variant % 2 === 1) {
    desenharArtePromocaoInvertida(ctx, promo, client, foto, logo, siteLogo, layout, options);
    return;
  }
  const price = promoPrecoPartes(promo.preco);
  const oldPrice = promo.precoAntigo ? promoPrecoArte(promo.precoAntigo) : "";
  desenharDecoracaoPromoNova(ctx, layout);
  desenharLogoPromoNova(ctx, logo, client, layout);
  desenharImagemPromoNova(ctx, foto, layout, options.imageFit || "cover");

  ctx.fillStyle = layout.primary;
  desenharTextoPromoCanvas(ctx, "PROMO\u00c7\u00c3O", 245, 330, 420, 2, {
    tamanho: 61,
    minimo: 36,
    lineHeight: 60,
    align: "center",
    blockHeight: 105,
    familia: '"Arial Narrow", Arial, sans-serif'
  });
  ctx.strokeStyle = layout.primary;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(105, 478);
  ctx.lineTo(165, 478);
  ctx.moveTo(325, 478);
  ctx.lineTo(385, 478);
  ctx.stroke();
  ctx.fillStyle = layout.dark;
  desenharTextoPromoCanvas(ctx, promo.titulo || promo.desconto || "OFERTA ESPECIAL", 245, 430, 280, 2, {
    tamanho: 28,
    minimo: 17,
    lineHeight: 28,
    align: "center",
    blockHeight: 62,
    peso: 800
  });

  const priceGradient = ctx.createLinearGradient(60, 525, 430, 698);
  priceGradient.addColorStop(0, layout.primary);
  priceGradient.addColorStop(1, layout.primaryDark);
  ctx.save();
  ctx.shadowColor = "rgba(183,13,37,.28)";
  ctx.shadowBlur = 22;
  ctx.shadowOffsetY = 10;
  preencherRoundRect(ctx, 60, 525, 370, 170, 40, priceGradient);
  ctx.restore();
  desenharBordaTracejadaPromo(ctx, 75, 540, 340, 140, 29, "rgba(255,255,255,.92)", 3);
  ctx.fillStyle = "#fff";
  if (price.consulta) {
    ctx.textAlign = "center";
    fonteQueCabeCanvas(ctx, "CONSULTE", 900, 52, 30, 300);
    ctx.fillText("CONSULTE", 245, 628);
  } else {
    ctx.textAlign = "left";
    ctx.font = "900 32px Arial";
    ctx.fillText("R$", 92, 626);
    ctx.textAlign = "right";
    fonteQueCabeCanvas(ctx, price.inteiro, 900, 70, 40, 220);
    ctx.fillText(price.inteiro, 340, 639);
    ctx.textAlign = "left";
    ctx.font = "900 29px Arial";
    ctx.fillText(price.centavos, 342, 614);
  }
  if (oldPrice) {
    const reduced = promocaoTeveReducao(promo);
    ctx.fillStyle = "#55585d";
    ctx.textAlign = "center";
    ctx.font = `${reduced ? 900 : 700} ${reduced ? 28 : 21}px Arial`;
    const oldText = `DE R$ ${oldPrice}`;
    ctx.fillText(oldText, 245, 739);
    const oldWidth = ctx.measureText(oldText).width;
    ctx.strokeStyle = layout.primary;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(245 - oldWidth / 2, 730);
    ctx.lineTo(245 + oldWidth / 2, 730);
    ctx.stroke();
  }
  ctx.fillStyle = "#606369";
  ctx.textAlign = "center";
  ctx.font = "800 17px Arial";
  ctx.fillText(promoValidadeArte(promo, options.validityDate), 245, oldPrice ? 779 : 744, 390);

  desenharBeneficiosPromoNova(ctx, layout, options.benefits || []);
  desenharRodapeContatosPromo(ctx, client, layout, siteLogo, options.showSiteLogo);
}

function opcoesArtePromocao(prefix = "promoArt", scope = document) {
  const field = (suffix) => scope.querySelector(`#${prefix}${suffix}`);
  const benefits = [1, 2, 3].map((index) => ({
    enabled: Boolean(field(`Benefit${index}Enabled`)?.checked),
    title: field(`Benefit${index}Title`)?.value.trim() || "",
    text: field(`Benefit${index}Text`)?.value.trim() || "",
    icon: index - 1
  }));
  return {
    imageFit: field("ImageFit")?.value || "cover",
    validityDate: field("ValidityDate")?.value || "",
    showSiteLogo: Boolean(field("ShowSiteLogo")?.checked),
    benefits
  };
}

async function gerarArteInstagramPromocao(clientId, promoId, layoutKey = "classico", options = null) {
  if (!hasPermission("gerar_imagens_promocoes")) return showToast("A geracao de imagens de promocoes nao esta liberada para este usuario.");
  const client = state.clientes.find((item) => item.id === clientId);
  const promo = normalizePromocoes(client?.promocoes).find((item) => item.id === promoId);
  if (!client || !promo) return showToast("Selecione uma promocao para gerar a arte.");
  const layout = PROMO_ARTE_LAYOUTS[layoutKey] || PROMO_ARTE_LAYOUTS.classico;
  const button = $("generatePromoArtButton") || $("coGeneratePromoArtButton");
  if (button) button.disabled = true;
  showToast("Gerando arte da promocao...");
  try {
    const [foto, logo, siteLogo] = await Promise.all([
      carregarImagemCanvas(promoImagemPrincipalAdmin(promo, client)),
      carregarImagemCanvas(logoClienteImovelAdmin(client)),
      carregarImagemCanvas("../images/img_padrao_site/logo_1.png")
    ]);
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1080;
    const ctx = canvas.getContext("2d");
    desenharArtePromocaoNova(ctx, promo, client, foto, logo, siteLogo, layout, options || opcoesArtePromocao());
    const blob = await canvasParaBlob(canvas);
    baixarBlobCanvas(blob, `arte-promocao-${slugify(client.nome || client.id)}-${slugify(promo.titulo)}-${layoutKey}.png`);
    showToast("Arte da promocao gerada.");
  } catch (error) {
    console.error("Erro ao gerar arte da promocao.", error);
    showToast("Nao foi possivel gerar a arte da promocao.");
  } finally {
    if (button) button.disabled = false;
  }
}

function renderStaffPromocoesView() {
  const mount = $("staffPromocoesMount");
  if (!mount) return;
  if (!canManageClients()) {
    mount.innerHTML = `<section class="panel-card"><p>Somente master ou admin geral pode acessar as promocoes dos clientes.</p></section>`;
    return;
  }

  const clientes = [...state.clientes].sort((a, b) => String(a.nome || a.id || "").localeCompare(String(b.nome || b.id || ""), "pt-BR"));
  if (!clientes.length) {
    mount.innerHTML = `<section class="panel-card"><p>Nenhum cliente cadastrado ainda.</p></section>`;
    return;
  }

  if (!state.selectedPromoClientId || !clientes.some((client) => client.id === state.selectedPromoClientId)) {
    state.selectedPromoClientId = clientes[0].id;
  }

  const client = clientes.find((item) => item.id === state.selectedPromoClientId) || clientes[0];
  const promocoes = normalizePromocoes(client.promocoes);
  const selectedId = client.id;
  if (!state.selectedPromoArtId || !promocoes.some((promo) => promo.id === state.selectedPromoArtId)) {
    state.selectedPromoArtId = promocoes[0]?.id || "";
  }
  const editing = Number.isInteger(state.staffPromoEditIndex) && state.staffPromoEditIndex >= 0;

  mount.innerHTML = `
    <section class="panel-card staff-promos-panel">
      <div class="section-head">
        <div>
          <h2>Promocoes dos clientes</h2>
          <p>Selecione um cliente para inserir, editar ou remover ofertas exibidas no site publico.</p>
        </div>
        <span class="badge">${promocoes.length} ativa${promocoes.length === 1 ? "" : "s"}</span>
      </div>
      <label class="wide">Cliente
        <select id="staffPromoClientSelect">
          ${clientes.map((item) => `<option value="${escapeAttr(item.id)}" ${item.id === selectedId ? "selected" : ""}>${escapeHtml(item.nome || item.id)}${item.status && item.status !== "ativo" ? ` (${escapeHtml(statusLabel(item.status))})` : ""}</option>`).join("")}
        </select>
      </label>
      <div class="staff-promo-client-card">
        <img src="${escapeAttr(displayImageUrl(client.imagem || imageUrl(client.imagens && client.imagens[0])) || "../images/img_padrao_site/logo_1.png")}" alt="${escapeAttr(client.nome || "Cliente")}" ${lazyImageAttrs()} ${imageFallbackAttr()}>
        <div>
          <strong>${escapeHtml(client.nome || client.id)}</strong>
          <span>${escapeHtml(client.categoria || "Sem categoria")} - ${escapeHtml(client.contato || client.whatsapp || "Sem contato")}</span>
        </div>
      </div>
    </section>
    <section class="panel-card promo-art-generator">
      <div class="section-head">
        <div>
          <h3>Arte para Instagram</h3>
          <p>Gere uma imagem quadrada usando os dados do cliente e da promocao selecionada.</p>
        </div>
        <span class="badge">1080 x 1080</span>
      </div>
      ${promocoes.length ? `
        <div class="promo-art-controls">
          <label>Promocao
            <select id="promoArtItem">
              ${promocoes.map((promo) => `<option value="${escapeAttr(promo.id)}" ${promo.id === state.selectedPromoArtId ? "selected" : ""}>${escapeHtml(promo.titulo)}</option>`).join("")}
            </select>
          </label>
          <label>Modelo
            <select id="promoArtLayout">
              ${Object.entries(PROMO_ARTE_LAYOUTS).map(([key, layout]) => `<option value="${key}">${escapeHtml(layout.nome)}</option>`).join("")}
            </select>
          </label>
          <button id="generatePromoArtButton" type="button"><i class="fa-solid fa-wand-magic-sparkles"></i> Gerar imagem</button>
        </div>
        <div class="promo-layout-swatches">
          ${Object.entries(PROMO_ARTE_LAYOUTS).map(([key, layout]) => `
            <button type="button" data-promo-layout="${key}" title="Usar modelo ${escapeAttr(layout.nome)}">
              <span style="--promo-main:${layout.primary};--promo-dark:${layout.dark};--promo-light:${layout.secondary}"></span>
              ${escapeHtml(layout.nome)}
            </button>
          `).join("")}
        </div>
        <div class="promo-art-editor">
          <label>Ajuste da imagem
            <select id="promoArtImageFit">
              <option value="cover">Preencher a moldura</option>
              <option value="contain">Mostrar imagem inteira</option>
            </select>
          </label>
          <label>Validade da promocao
            <input id="promoArtValidityDate" type="date" value="${escapeAttr(promocoes.find((promo) => promo.id === state.selectedPromoArtId)?.validadeFim || "")}">
          </label>
          <label class="check-row"><input id="promoArtShowSiteLogo" type="checkbox" checked> Exibir logo Ola Carlopolis</label>
          <div class="promo-art-benefit">
            <label class="check-row"><input id="promoArtBenefit1Enabled" type="checkbox" checked> Exibir beneficio 1</label>
            <input id="promoArtBenefit1Title" value="QUALIDADE" aria-label="Titulo do beneficio 1">
            <textarea id="promoArtBenefit1Text" rows="2" aria-label="Texto do beneficio 1">Produtos de qualidade que voce confia.</textarea>
          </div>
          <div class="promo-art-benefit">
            <label class="check-row"><input id="promoArtBenefit2Enabled" type="checkbox" checked> Exibir beneficio 2</label>
            <input id="promoArtBenefit2Title" value="ATENDIMENTO" aria-label="Titulo do beneficio 2">
            <textarea id="promoArtBenefit2Text" rows="2" aria-label="Texto do beneficio 2">Atendimento proximo e personalizado.</textarea>
          </div>
          <div class="promo-art-benefit">
            <label class="check-row"><input id="promoArtBenefit3Enabled" type="checkbox" checked> Exibir beneficio 3</label>
            <input id="promoArtBenefit3Title" value="ENTREGA RAPIDA" aria-label="Titulo do beneficio 3">
            <textarea id="promoArtBenefit3Text" rows="2" aria-label="Texto do beneficio 3">Mais agilidade e seguranca para voce.</textarea>
          </div>
        </div>
      ` : `<div class="list-meta">Cadastre uma promocao para liberar a geracao da arte.</div>`}
    </section>
    <section class="panel-card staff-promos-panel">
      <div class="section-head compact">
        <div>
          <h3>${editing ? "Editar promocao" : "Nova promocao"}</h3>
          <p>As alteracoes sao salvas diretamente no cadastro do cliente selecionado.</p>
        </div>
      </div>
      <div class="promo-admin-form">
        <label>Titulo da promocao<input id="staffPromoTitle" placeholder="Ex.: Pizza grande"></label>
        <label>Preco atual<input id="staffPromoPrice" placeholder="Ex.: 49,90"></label>
        <label>Desconto / chamada<input id="staffPromoDiscount" placeholder="Ex.: 20% OFF ou ATE 30% OFF"></label>
        <label>Preco antigo<input id="staffPromoOldPrice" placeholder="Opcional"></label>
        <label>Unidade<input id="staffPromoUnit" placeholder="Ex.: A unidade"></label>
        <label>Volume<input id="staffPromoVolume" placeholder="Opcional"></label>
        <label>Embalagem<input id="staffPromoPack" placeholder="Opcional"></label>
        <label>Validade inicio<input id="staffPromoStart" type="date"></label>
        <label>Validade fim<input id="staffPromoEnd" type="date"></label>
        <label>Tipo de oferta<select id="staffPromoOfferType"><option value="">Selecione</option><option value="produto">Produto</option><option value="servico">Servico</option><option value="combo">Combo</option><option value="cupom">Cupom</option></select></label>
        <label>Entrega / retirada<select id="staffPromoFulfillment"><option value="">Nao informar</option><option value="entrega">Entrega</option><option value="retirada">Retirada</option><option value="ambos">Entrega e retirada</option></select></label>
        <label>Faixa de preco<select id="staffPromoPriceRange"><option value="">Automatico</option><option value="ate-50">Ate R$ 50</option><option value="50-100">R$ 50 a R$ 100</option><option value="100-200">R$ 100 a R$ 200</option><option value="acima-200">Acima de R$ 200</option></select></label>
        <label>Com preco?<select id="staffPromoPriceMode"><option value="">Automatico</option><option value="com-preco">Com preco</option><option value="sem-preco">Sem preco</option></select></label>
        <fieldset class="promo-weekdays wide">
          <legend>Dias que fica disponivel</legend>
          <p>Se nao marcar nenhum dia, aparece todos os dias dentro da validade.</p>
          <div>${PROMO_WEEK_DAYS.map((day) => `<label><input type="checkbox" name="staffPromoWeekday" value="${day.value}"> ${day.label}</label>`).join("")}</div>
        </fieldset>
        <label class="wide">Observacao<textarea id="staffPromoObs" rows="3" placeholder="Detalhes da oferta"></textarea></label>
        <label class="wide">Mensagem abaixo do cliente / Instagram<textarea id="staffPromoInstagramMsg" rows="2" placeholder="Ex.: Siga no Instagram e fique por dentro das novidades!"></textarea></label>
        <label>Imagem da promocao<input id="staffPromoImageUpload" type="file" accept="image/*"></label>
        <label>Ou URL da imagem<input id="staffPromoImageUrl" placeholder="https://..."></label>
        <div class="promo-form-actions wide">
          <button id="staffAddPromoButton" type="button" class="ghost-button"><i class="fa-solid ${editing ? "fa-floppy-disk" : "fa-plus"}"></i> ${editing ? "Salvar alteracoes" : "Adicionar promocao"}</button>
          <button id="staffCancelPromoEditButton" type="button" class="ghost-button ${editing ? "" : "hidden"}"><i class="fa-solid fa-xmark"></i> Cancelar edicao</button>
        </div>
      </div>
    </section>
    <section class="panel-card staff-promos-panel">
      <div class="section-head compact">
        <div>
          <h3>Promocoes cadastradas</h3>
          <p>Lista atual do cliente selecionado.</p>
        </div>
      </div>
      <div id="staffPromosPreview" class="promo-admin-list">${renderPromocoesMarkup(promocoes, "staff-promo-remove", "staff-promo-edit")}</div>
    </section>
  `;

  if (editing && promocoes[state.staffPromoEditIndex]) {
    fillPromoFields("staff", promocoes[state.staffPromoEditIndex], mount);
  }

  mount.querySelector("#staffPromoClientSelect")?.addEventListener("change", (event) => {
    state.selectedPromoClientId = event.target.value;
    state.staffPromoEditIndex = null;
    state.selectedPromoArtId = "";
    renderStaffPromocoesView();
  });

  mount.querySelector("#promoArtItem")?.addEventListener("change", (event) => {
    state.selectedPromoArtId = event.target.value;
    const promo = promocoes.find((item) => item.id === event.target.value);
    const validityField = mount.querySelector("#promoArtValidityDate");
    if (validityField) validityField.value = promo?.validadeFim || "";
  });

  mount.querySelectorAll("[data-promo-layout]").forEach((button) => {
    button.addEventListener("click", () => {
      const select = mount.querySelector("#promoArtLayout");
      if (select) select.value = button.dataset.promoLayout;
      mount.querySelectorAll("[data-promo-layout]").forEach((item) => item.classList.toggle("active", item === button));
    });
  });

  mount.querySelector("[data-promo-layout='classico']")?.classList.add("active");
  mount.querySelector("#promoArtLayout")?.addEventListener("change", (event) => {
    mount.querySelectorAll("[data-promo-layout]").forEach((item) => {
      item.classList.toggle("active", item.dataset.promoLayout === event.target.value);
    });
  });

  mount.querySelector("#generatePromoArtButton")?.addEventListener("click", () => {
    const promoId = mount.querySelector("#promoArtItem")?.value || state.selectedPromoArtId;
    const layoutKey = mount.querySelector("#promoArtLayout")?.value || "classico";
    gerarArteInstagramPromocao(selectedId, promoId, layoutKey);
  });

  mount.querySelector("#staffPromoImageUpload")?.addEventListener("change", async (event) => {
    await uploadSelectedPromoImage("staffPromoImageUpload", "staffPromoImageUrl", selectedId);
    event.target.value = "";
  });

  mount.querySelector("#staffAddPromoButton")?.addEventListener("click", async () => {
    const title = mount.querySelector("#staffPromoTitle")?.value.trim();
    if (!title) {
      showToast("Informe o titulo da promocao.");
      return;
    }
    let image = mount.querySelector("#staffPromoImageUrl")?.value.trim() || "";
    const imageFile = mount.querySelector("#staffPromoImageUpload")?.files?.[0];
    if (imageFile && !image) {
      showToast("Enviando imagem da promocao...");
      image = await uploadPromoImageForClient(selectedId, imageFile);
    }
    const editIndex = Number.isInteger(state.staffPromoEditIndex) ? state.staffPromoEditIndex : -1;
    const current = editIndex >= 0 ? promocoes[editIndex] : null;
    const payload = readPromoFields("staff", mount, current?.id || `promo-${Date.now()}`);
    payload.imagem = image;
    if (editIndex >= 0 && current) promocoes[editIndex] = payload;
    else promocoes.unshift(payload);
    await update(ref(db, `clientes/${selectedId}`), {
      promocoes: normalizePromocoes(promocoes),
      origem: "painel-admin",
      editadoNoPainel: true,
      updatedAt: serverTimestamp(),
      updatedBy: state.user?.uid || ""
    });
    const acao = acaoNovidadeAdmin("promocao", editIndex < 0, payload, current || {});
    await registrarNovidadeAdmin({
      tipo: "promocao",
      titulo: acao,
      acao,
      descricao: acao,
      tituloConteudo: tituloConteudoNovidadeAdmin("promocao", payload),
      estabelecimento: client.nome || selectedId,
      imagem: payload.imagem,
      valor: payload.preco || payload.desconto || payload.valorTexto || "",
      categoria: client.categoria || "",
      destinoTipo: "promocao",
      destinoId: client.nomeNormalizado || normalizeName(client.nome || selectedId),
      itemId: payload.id,
      destinoCardId: `promocao-${payload.id}-${client.nomeNormalizado || normalizeName(client.nome || selectedId)}`
    });
    showToast(editIndex >= 0 ? "Promocao atualizada." : "Promocao adicionada.");
    state.staffPromoEditIndex = null;
    await loadAllData();
    state.selectedPromoClientId = selectedId;
    renderStaffPromocoesView();
  });

  mount.querySelector("#staffCancelPromoEditButton")?.addEventListener("click", () => {
    state.staffPromoEditIndex = null;
    renderStaffPromocoesView();
  });

  mount.querySelectorAll("[data-staff-promo-edit]").forEach((button) => {
    button.addEventListener("click", () => {
      state.staffPromoEditIndex = Number(button.dataset.staffPromoEdit);
      renderStaffPromocoesView();
      $("staffPromoTitle")?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  });

  mount.querySelectorAll("[data-staff-promo-remove]").forEach((button) => {
    button.addEventListener("click", async () => {
      const index = Number(button.dataset.staffPromoRemove);
      const promo = promocoes[index];
      if (!promo || !(await confirmarExclusao(`${promo.titulo || "sem titulo"} - ${client.nome || client.id}`, "promocao"))) return;
      promocoes.splice(index, 1);
      await update(ref(db, `clientes/${selectedId}`), {
        promocoes: normalizePromocoes(promocoes),
        origem: "painel-admin",
        editadoNoPainel: true,
        updatedAt: serverTimestamp(),
        updatedBy: state.user?.uid || ""
      });
      await removerNovidadesPorDestino("promocao", client.nomeNormalizado || normalizeName(client.nome || selectedId), promo.id || "");
      showToast("Promocao removida.");
      state.staffPromoEditIndex = null;
      await loadAllData();
      state.selectedPromoClientId = selectedId;
      renderStaffPromocoesView();
    });
  });
}
function renderClientOnlyEditor() {
  const mount = $("clientOnlyMount");
  const client = state.clientes.find((item) => item.id === state.profile?.clienteId);
  if (!client) {
    mount.innerHTML = `<p>Nenhum cliente vinculado a este usuario. Fale com o administrador.</p>`;
    if ($("clientModuleSidebar")) {
      $("clientModuleSidebar").innerHTML = "";
      $("clientModuleSidebar").classList.add("hidden");
    }
    return;
  }

  const imagens = normalizeImageItems(client.imagens);
  const menuImages = normalizeUrlList(client.menuImages);
  const promocoes = normalizePromocoes(client.promocoes);
  const vagasTrabalho = normalizeVagasTrabalho(client.vagasTrabalho, client);
  const canEditDados = hasPermission("dados");
  const canEditImages = hasPermission("imagens");
  const canEditVagas = hasPermission("vagas");
  const canEditCardapio = hasPermission("cardapio");
  const canEditPromocoes = hasPermission("promocoes");
  const canGeneratePromoImages = hasPermission("gerar_imagens_promocoes");
  const canEditDestaque = hasPermission("destaque") || hasPermission("dados");
  const isRealEstateClient = clienteAssociadoImoveis(client, true);
  const canViewRelatorios = hasPermission("relatorios");
  const clientWhatsappGroupId = client.grupoWhatsappId || `cliente-${slugify(client.id || client.nome || "grupo")}`;
  const clientWhatsappGroup = state.gruposWhatsapp.find((item) => (
    item.id === clientWhatsappGroupId ||
    item.clienteId === client.id
  )) || {};
  const hasAnyClientEditPermission = canEditDados || canEditVagas || canEditImages || canEditCardapio || canEditPromocoes || canGeneratePromoImages || canEditDestaque;
  const hasAnyClientModule = true;
  let coPromoEditIndex = -1;
  let coJobEditIndex = -1;
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
  const setCoJobEditMode = (index = -1) => {
    coJobEditIndex = index;
    const editing = index >= 0;
    const addButton = $("coAddJobButton");
    if (addButton) {
      addButton.innerHTML = editing
        ? `<i class="fa-solid fa-floppy-disk"></i> Salvar alteracoes`
        : `<i class="fa-solid fa-plus"></i> Adicionar vaga`;
    }
    $("coCancelJobEditButton")?.classList.toggle("hidden", !editing);
  };
  const clientModuleGroups = [
    {
      label: "Cadastro",
      items: [
        { id: "client-module-dados", icon: "fa-solid fa-building", label: "Dados da empresa", show: canEditDados },
        { id: "client-module-imagens", icon: "fa-solid fa-images", label: "Fotos e imagens", show: canEditImages },
        { id: "client-module-cardapio", icon: "fa-solid fa-utensils", label: "Cardapio", show: canEditCardapio }
      ]
    },
    {
      label: "Negocio",
      items: [
        { id: "client-module-vagas", icon: "fa-solid fa-briefcase", label: "Vagas de trabalho", show: canEditVagas },
        { id: "client-module-promocoes", icon: "fa-solid fa-tags", label: "Promocoes", show: canEditPromocoes || canGeneratePromoImages },
        { id: "client-module-grupo-whatsapp", icon: "fa-brands fa-whatsapp", label: "Grupos WhatsApp", show: true },
        { id: "client-module-destaque", icon: "fa-solid fa-star", label: "Destaque da semana", show: canEditDestaque }
      ]
    },
    {
      label: "Gestao",
      items: [
        { id: "client-module-relatorios", icon: "fa-solid fa-chart-line", label: "Relatorios", show: canViewRelatorios }
      ]
    }
  ].map((group) => ({
    ...group,
    items: group.items.filter((item) => item.show)
  })).filter((group) => group.items.length);
  const clientModules = clientModuleGroups.flatMap((group) => group.items);
  const requestedClientModule = clientModules.some((item) => item.id === state.pendingClientModuleTarget)
    ? state.pendingClientModuleTarget
    : "";
  const initialClientModule = requestedClientModule || (clientModules.find((item) => item.id === "client-module-dados") || clientModules[0] || {}).id || "";
  const clientSidebarNav = clientModuleGroups.map((group) => `
    <div class="client-module-sidebar-group">
      <span class="client-module-sidebar-title">${group.label}</span>
      ${group.items.map((item) => `
        <button type="button" class="sidebar-client-module-item${item.id === initialClientModule ? " active" : ""}" data-client-module-target="${item.id}">
          <i class="${item.icon}"></i><span>${item.label}</span>
        </button>
      `).join("")}
    </div>
  `).join("");
  if ($("clientModuleSidebar")) {
    $("clientModuleSidebar").innerHTML = clientSidebarNav;
    $("clientModuleSidebar").classList.toggle("hidden", !clientModules.length);
  }

  mount.innerHTML = `
    <form id="clientOnlyForm" class="grid-form">
      <div class="client-module-shell wide">
        <div class="client-module-content">
      ${canEditImages ? `
        <section id="client-module-foto" data-client-module-group="client-module-imagens" class="wide profile-upload-panel profile-upload-top client-feature-card feature-foto client-module-panel">
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
        <section id="client-module-dados" class="wide client-feature-card feature-dados client-module-panel">
        <div class="form-section-title">
          <i class="fa-solid fa-id-card"></i>
          <div>
            <strong>Dados principais</strong>
            <span>Informacoes basicas da sua empresa.</span>
          </div>
        </div>
        <label class="admin-field-line field-company">Nome da empresa<input id="coName" value="${escapeAttr(client.nome || "")}"></label>
        <label class="admin-field-line field-address wide">Endereco<input id="coAddress" value="${escapeAttr(client.endereco || "")}"></label>
        <label class="admin-field-line field-phone">Telefone / WhatsApp 1<input id="coContact" value="${escapeAttr(normalizeClientContacts(client)[0] || "")}"></label>
        <label class="admin-field-line field-whatsapp">Telefone / WhatsApp 2<input id="coWhatsapp" value="${escapeAttr(normalizeClientContacts(client)[1] || "")}"></label>
        <label class="admin-field-line field-phone-extra">Telefone / WhatsApp 3<input id="coContact3" value="${escapeAttr(normalizeClientContacts(client)[2] || "")}"></label>
        ${isRealEstateClient ? `<label class="admin-field-line field-creci">CRECI (opcional)<input id="coCreci" value="${escapeAttr(client.creci || client.registroCreci || "")}" placeholder="Ex.: 38.105 F"></label>` : ""}
        
        
        <section class="wide schedule-panel">
          <div class="section-head compact">
            <div>
              <h3>Dias e horarios de funcionamento</h3>
              <p>Marque os dias abertos. Dias desmarcados aparecem como fechado.</p>
            </div>
          </div>
          <div id="coScheduleEditor" class="schedule-editor"></div>
        </section>
        <label class="admin-field-line field-instagram">Instagram<input id="coInstagram" value="${escapeAttr(client.instagram || "")}"></label>
        <label class="admin-field-line field-facebook">Facebook<input id="coFacebook" value="${escapeAttr(client.facebook || "")}"></label>
        <label class="admin-field-line field-tiktok">TikTok<input id="coTiktok" value="${escapeAttr(client.tiktok || "")}"></label>
        <label class="admin-field-line field-site">Site<input id="coSite" value="${escapeAttr(client.site || "")}"></label>
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
      ${canEditVagas ? `
        <section id="client-module-vagas" class="wide upload-panel client-feature-card feature-vagas client-jobs-panel client-module-panel">
          <div class="section-head compact feature-card-head">
            <div>
              <span class="feature-kicker">Contratacao</span>
              <h3>Vagas de trabalho</h3>
              <p>Cadastre quantas oportunidades precisar para aparecer no site publico.</p>
            </div>
            <span id="coJobsCount" class="badge">${vagasTrabalho.length} vaga${vagasTrabalho.length === 1 ? "" : "s"}</span>
          </div>
          <label class="check-row"><input id="coJobActive" type="checkbox" checked> Exibir esta vaga no site publico</label>
          <div class="section-fields">
            <label class="admin-field-line field-job">Cargo / titulo da vaga<input id="coJobTitle" placeholder="Ex.: Atendente"></label>
            <label class="admin-field-line field-salary">Salario / beneficio<input id="coJobSalary" placeholder="Ex.: A combinar"></label>
            <label class="admin-field-line field-schedule">Jornada / horario<input id="coJobSchedule" placeholder="Ex.: Segunda a sabado"></label>
            <label class="admin-field-line field-date">Validade da vaga<input id="coJobValidUntil" type="date"></label>
            <label class="admin-field-line field-place">Local da vaga<input id="coJobPlace" placeholder="Opcional"></label>
            <label class="admin-field-line field-contact">Contato da vaga<input id="coJobContact" placeholder="WhatsApp, telefone ou e-mail"></label>
          </div>
          <label class="wide">Descricao da vaga<textarea id="coJobDescription" rows="3" placeholder="Conte o que a pessoa vai fazer"></textarea></label>
          <label class="wide">Pre-requisitos<textarea id="coJobRequirements" rows="3" placeholder="Ex.: Maior de 18 anos, experiencia"></textarea></label>
          <label class="wide">Como se candidatar<textarea id="coJobApply" rows="2" placeholder="Ex.: Enviar curriculo pelo WhatsApp"></textarea></label>
          <div class="form-actions wide promo-edit-actions">
            <button id="coAddJobButton" type="button"><i class="fa-solid fa-plus"></i> Adicionar vaga</button>
            <button id="coCancelJobEditButton" type="button" class="ghost-button hidden"><i class="fa-solid fa-xmark"></i> Cancelar edicao</button>
          </div>
          <div id="coJobsPreview" class="promo-admin-list">
            ${renderVagasTrabalhoMarkup(vagasTrabalho)}
          </div>
        </section>
      ` : ""}
      ${canEditCardapio ? `
        <section id="client-module-cardapio" class="wide upload-panel client-feature-card feature-cardapio client-module-panel">
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
            <label class="check-row"><input id="coMenuEnabled" type="checkbox" ${client.cardapioAtivo || client.menuAtivo || client.exibirCardapio || client.cardapioLink || menuImages.length ? "checked" : ""}> Exibir botao Cardapio no site publico</label>
          </div>
          <input id="coMenuUpload" type="file" accept="image/*,application/pdf" multiple>
          <div id="coMenuPreview" class="image-grid">
            ${renderMenuImagesMarkup(menuImages, "comenu")}
          </div>
        </section>
      ` : ""}
      ${canEditImages ? `
        <section id="client-module-galeria" data-client-module-group="client-module-imagens" class="wide upload-panel client-feature-card feature-galeria client-module-panel">
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
      ${canEditPromocoes || canGeneratePromoImages ? `
        <section id="client-module-promocoes" class="wide upload-panel client-feature-card feature-promocoes client-module-panel">
          <div class="section-head compact feature-card-head">
            <div>
              <span class="feature-kicker">Ofertas publicas</span>
              <h3>Promocoes</h3>
              <p>Cadastre e edite ofertas que aparecem no menu Promocoes do site publico.</p>
            </div>
            <span id="coPromosCount" class="badge">${promocoes.length} ativa${promocoes.length === 1 ? "" : "s"}</span>
          </div>
          ${canGeneratePromoImages ? `
          <section class="promo-art-generator client-promo-art-generator">
            <div class="section-head compact">
              <div>
                <h3>Arte para Instagram</h3>
                <p>Escolha uma promocao e gere a imagem quadrada para postagem.</p>
              </div>
              <span class="badge">1080 x 1080</span>
            </div>
            ${promocoes.length ? `
              <div class="promo-art-controls">
                <label>Promocao
                  <select id="coPromoArtItem">
                    ${promocoes.map((promo) => `<option value="${escapeAttr(promo.id)}">${escapeHtml(promo.titulo)}</option>`).join("")}
                  </select>
                </label>
                <label>Modelo
                  <select id="coPromoArtLayout">
                    ${Object.entries(PROMO_ARTE_LAYOUTS).map(([key, layout]) => `<option value="${key}">${escapeHtml(layout.nome)}</option>`).join("")}
                  </select>
                </label>
                <button id="coGeneratePromoArtButton" type="button"><i class="fa-solid fa-wand-magic-sparkles"></i> Gerar imagem</button>
              </div>
              <div class="promo-layout-swatches">
                ${Object.entries(PROMO_ARTE_LAYOUTS).map(([key, layout]) => `
                  <button type="button" data-co-promo-layout="${key}">
                    <span style="--promo-main:${layout.primary};--promo-dark:${layout.dark};--promo-light:${layout.secondary}"></span>
                    ${escapeHtml(layout.nome)}
                  </button>
                `).join("")}
              </div>
              <div class="promo-art-editor">
                <label>Ajuste da imagem
                  <select id="coPromoArtImageFit">
                    <option value="cover">Preencher a moldura</option>
                    <option value="contain">Mostrar imagem inteira</option>
                  </select>
                </label>
                <label>Validade da promocao
                  <input id="coPromoArtValidityDate" type="date" value="${escapeAttr(promocoes[0]?.validadeFim || "")}">
                </label>
                <label class="check-row"><input id="coPromoArtShowSiteLogo" type="checkbox" checked> Exibir logo Ola Carlopolis</label>
                ${[
                  ["QUALIDADE", "Produtos de qualidade que voce confia."],
                  ["ATENDIMENTO", "Atendimento proximo e personalizado."],
                  ["ENTREGA RAPIDA", "Mais agilidade e seguranca para voce."]
                ].map((benefit, index) => `
                  <div class="promo-art-benefit">
                    <label class="check-row"><input id="coPromoArtBenefit${index + 1}Enabled" type="checkbox" checked> Exibir beneficio ${index + 1}</label>
                    <input id="coPromoArtBenefit${index + 1}Title" value="${benefit[0]}">
                    <textarea id="coPromoArtBenefit${index + 1}Text" rows="2">${benefit[1]}</textarea>
                  </div>
                `).join("")}
              </div>
            ` : `<div class="list-meta">Cadastre uma promocao para liberar a geracao da arte.</div>`}
          </section>
          ` : ""}
          ${canEditPromocoes ? `
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
            <label>Tipo de oferta<select id="coPromoOfferType"><option value="">Selecione</option><option value="produto">Produto</option><option value="servico">Servico</option><option value="combo">Combo</option><option value="cupom">Cupom</option></select></label>
            <label>Entrega / retirada<select id="coPromoFulfillment"><option value="">Nao informar</option><option value="entrega">Entrega</option><option value="retirada">Retirada</option><option value="ambos">Entrega e retirada</option></select></label>
            <label>Faixa de preco<select id="coPromoPriceRange"><option value="">Automatico</option><option value="ate-50">Ate R$ 50</option><option value="50-100">R$ 50 a R$ 100</option><option value="100-200">R$ 100 a R$ 200</option><option value="acima-200">Acima de R$ 200</option></select></label>
            <label>Com preco?<select id="coPromoPriceMode"><option value="">Automatico</option><option value="com-preco">Com preco</option><option value="sem-preco">Sem preco</option></select></label>
            <fieldset class="promo-weekdays wide">
              <legend>Dias que fica disponivel</legend>
              <p>Para promocoes recorrentes, marque os dias. Se nao marcar nenhum, aparece todos os dias dentro da validade.</p>
              <div>
                ${PROMO_WEEK_DAYS.map((day) => `<label><input type="checkbox" name="coPromoWeekday" value="${day.value}"> ${day.label}</label>`).join("")}
              </div>
            </fieldset>
            <label class="wide">Observacao<textarea id="coPromoObs" rows="3" placeholder="Detalhes da oferta"></textarea></label>
            <label class="wide">Mensagem abaixo do cliente / Instagram<textarea id="coPromoInstagramMsg" rows="2" placeholder="Ex.: Siga no Instagram e fique por dentro das novidades!"></textarea></label>
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
          ` : ""}
        </section>
      ` : ""}
      <section id="client-module-grupo-whatsapp" class="wide upload-panel client-feature-card feature-whatsapp-group client-module-panel">
        <div class="section-head compact feature-card-head">
          <div>
            <span class="feature-kicker">Comunidade</span>
            <h3>Grupo WhatsApp</h3>
            <p>Cadastre o grupo da sua empresa para aparecer no menu publico Grupos WhatsApp.</p>
          </div>
          <span class="badge ${escapeAttr(clientWhatsappGroup.status || "inativo")}">${clientWhatsappGroup.link && clientWhatsappGroup.status !== "inativo" ? "Publicado" : "Nao publicado"}</span>
        </div>
        <div class="client-whatsapp-group-editor">
          <div class="client-whatsapp-group-image">
            <img id="coWhatsappGroupPreview" src="${escapeAttr(displayImageUrl(clientWhatsappGroup.imagem || clientWhatsappGroup.image || client.grupoWhatsappImagem || "../images/img_padrao_site/logo_1.png"))}" alt="Imagem do grupo WhatsApp" ${lazyImageAttrs()} ${imageFallbackAttr()}>
            <label>Imagem do grupo
              <input id="coWhatsappGroupImageUpload" type="file" accept="image/*">
            </label>
            <input id="coWhatsappGroupImage" type="hidden" value="${escapeAttr(clientWhatsappGroup.imagem || clientWhatsappGroup.image || client.grupoWhatsappImagem || "")}">
          </div>
          <div class="client-whatsapp-group-fields">
            <label>Nome do grupo
              <input id="coWhatsappGroupName" value="${escapeAttr(clientWhatsappGroup.nome || clientWhatsappGroup.name || client.grupoWhatsappNome || client.nome || "")}" placeholder="Ex.: Ofertas da minha empresa">
            </label>
            <label>Link do grupo
              <input id="coWhatsappGroupLink" type="url" value="${escapeAttr(clientWhatsappGroup.link || client.grupoWhatsappLink || "")}" placeholder="https://chat.whatsapp.com/...">
            </label>
            <label class="wide">Descricao do grupo
              <textarea id="coWhatsappGroupDescription" rows="5" placeholder="Explique o objetivo e o conteúdo do grupo">${escapeHtml(clientWhatsappGroup.descricao || clientWhatsappGroup.description || client.grupoWhatsappDescricao || "")}</textarea>
            </label>
            <label class="check-row wide">
              <input id="coWhatsappGroupEnabled" type="checkbox" ${clientWhatsappGroup.link && clientWhatsappGroup.status !== "inativo" ? "checked" : ""}>
              Exibir no menu publico Grupos WhatsApp
            </label>
            <div class="form-actions wide">
              <button id="coSaveWhatsappGroupButton" type="button"><i class="fa-solid fa-floppy-disk"></i> Salvar grupo</button>
              ${clientWhatsappGroup.link ? `<button id="coDeleteWhatsappGroupButton" type="button" class="danger-button"><i class="fa-solid fa-trash"></i> Excluir grupo</button>` : ""}
            </div>
          </div>
        </div>
      </section>
      ${canEditDestaque ? `
        <section id="client-module-destaque" class="wide upload-panel client-feature-card feature-destaque client-module-panel">
          <div class="section-head compact feature-card-head">
            <div>
              <span class="feature-kicker">Pagina inicial</span>
              <h3>Destaque da semana</h3>
              <p>Sua empresa entra na fila semanal da tela inicial. O site mostra ate 20 destaques por semana.</p>
            </div>
            <span class="badge">${destaqueIsActive(client) ? "Ativo" : "Inativo"}</span>
          </div>
          <label class="check-row"><input id="coFeaturedWeek" type="checkbox" ${client.destaqueSemanal ? "checked" : ""}> Ativar destaque na pagina inicial</label>
          <div class="section-fields">
            <label>Tipo de destaque
              <select id="coFeaturedType">
                <option value="semanal" ${destaqueTypeForClient(client) === "semanal" ? "selected" : ""}>Destaque semanal</option>
                <option value="fim_semana" ${destaqueTypeForClient(client) === "fim_semana" ? "selected" : ""}>Destaque fim de semana</option>
              </select>
            </label>
            <label>Quantidade<input id="coFeaturedWeeks" type="number" min="1" max="52" value="${escapeAttr(destaqueWeeksForClient(client))}"></label>
            <label>Cobranca
              <select id="coFeaturedBilling">
                <option value="mensalidade" ${destaqueBillingForClient(client) === "mensalidade" ? "selected" : ""}>Junto da mensalidade</option>
                <option value="pix_separado" ${destaqueBillingForClient(client) === "pix_separado" ? "selected" : ""}>Pix separado</option>
              </select>
            </label>
            <label>Valor calculado<input id="coFeaturedValue" value="${escapeAttr(client.destaqueSemanal ? moneyBR(destaqueValueForClient(client)) : "")}" readonly></label>
          </div>
          <div id="coFeaturedSummary" class="list-meta wide"></div>
          <div class="form-actions wide">
            <button id="coGenerateFeaturedPix" type="button" class="ghost-button"><i class="fa-solid fa-qrcode"></i> Gerar Pix do destaque</button>
          </div>
          <div id="coFeaturedPixBox" class="pix-box hidden">
            <img id="coFeaturedQr" alt="QR Code Pix destaque" loading="lazy" decoding="async">
            <label class="wide">Codigo Pix do destaque<textarea id="coFeaturedPixCode" rows="5" readonly></textarea></label>
            <div class="form-actions wide">
              <button id="coCopyFeaturedPix" type="button" class="ghost-button"><i class="fa-solid fa-copy"></i> Copiar codigo Pix</button>
            </div>
          </div>
        </section>
      ` : ""}
      ${canViewRelatorios ? `
        <section id="client-module-relatorios" class="wide client-feature-card feature-relatorios client-module-panel">
          <div class="section-head compact feature-card-head">
            <div>
              <span class="feature-kicker">Metricas</span>
              <h3>Relatorio do meu cadastro</h3>
              <p>Resumo dos cliques relacionados a ${escapeHtml(client.nome || "sua empresa")} no periodo atual.</p>
            </div>
          </div>
          ${renderClientMetricReport(client)}
        </section>
      ` : ""}
        </div>
      </div>
      ${hasAnyClientEditPermission ? `
        <div class="form-actions wide"><button type="submit">Salvar meus dados</button></div>
      ` : (!hasAnyClientModule ? `<section class="wide panel-card"><p>Nenhuma permissao foi liberada para este usuario.</p></section>` : "")}
    </form>
  `;
  if (canEditDados) {
    renderScheduleEditor("coScheduleEditor", client.horarios || {});
    bindPhoneMask("coContact");
    bindPhoneMask("coWhatsapp");
    bindPhoneMask("coContact3");
  }
  if (canViewRelatorios) bindClientMetricReportControls(client);
  const moduleNavButtons = [...document.querySelectorAll("#clientModuleSidebar [data-client-module-target]")];
  const activateClientModule = (targetId) => {
    const target = mount.querySelector(`#${targetId}`) || mount.querySelector(`[data-client-module-group="${targetId}"]`);
    if (!target) return;
    mount.querySelectorAll(".client-module-panel").forEach((panel) => {
      panel.classList.toggle("active", panel.id === targetId || panel.dataset.clientModuleGroup === targetId);
    });
    moduleNavButtons.forEach((item) => item.classList.toggle("active", item.dataset.clientModuleTarget === targetId));
  };
  if (initialClientModule) {
    activateClientModule(initialClientModule);
    state.pendingClientModuleTarget = "";
  }
  moduleNavButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const targetModule = button.dataset.clientModuleTarget;
      state.pendingClientModuleTarget = targetModule;
      if (views.minhaEmpresa?.classList.contains("hidden")) {
        switchView("minhaEmpresa");
      } else {
        activateClientModule(targetModule);
        state.pendingClientModuleTarget = "";
      }
      closeAdminMenuOnMobile();
    });
  });
  const refreshCoFeaturedSummary = () => {
    const active = Boolean(mount.querySelector("#coFeaturedWeek")?.checked);
    const weeks = destaqueWeeksForClient({ destaqueSemanas: mount.querySelector("#coFeaturedWeeks")?.value || 1 });
    const type = mount.querySelector("#coFeaturedType")?.value || "semanal";
    const kindLabel = type === "fim_semana" ? "fim de semana" : "semana";
    const days = destaqueDaysForClient({ destaqueSemanas: weeks, destaqueTipo: type });
    const value = active ? destaqueValueForClient({ destaqueSemanas: weeks, destaqueTipo: type }) : 0;
    const end = active ? dateKeyFromDate(addDays(new Date(), days - 1)) : "";
    const billing = mount.querySelector("#coFeaturedBilling")?.value || "mensalidade";
    const valueInput = mount.querySelector("#coFeaturedValue");
    const summary = mount.querySelector("#coFeaturedSummary");
    if (valueInput) valueInput.value = value ? moneyBR(value) : "";
    if (summary) {
      summary.textContent = active
        ? `${weeks} ${kindLabel}${weeks === 1 ? "" : "s"} (${days} dias), ${moneyBR(value)}, valido ate ${formatDateBR(end)}. Cobranca: ${billing === "pix_separado" ? "Pix separado" : "junto da mensalidade"}. Se houver mais de 20 ativos, os destaques alternam conforme a fila de contratacao.`
        : `Valores definidos pelo admin master: ${moneyBR(destaqueWeeklyValue())} por semana e ${moneyBR(destaqueWeekendValue())} por fim de semana.`;
    }
  };
  ["coFeaturedWeek", "coFeaturedType", "coFeaturedWeeks", "coFeaturedBilling"].forEach((id) => {
    mount.querySelector(`#${id}`)?.addEventListener("input", refreshCoFeaturedSummary);
    mount.querySelector(`#${id}`)?.addEventListener("change", refreshCoFeaturedSummary);
  });
  refreshCoFeaturedSummary();

  mount.querySelector("#coGenerateFeaturedPix")?.addEventListener("click", () => {
    if (!state.pagamentoSistema?.pixChave) {
      showToast("A chave Pix ainda nao foi configurada pelo admin master.");
      return;
    }
    const active = Boolean(mount.querySelector("#coFeaturedWeek")?.checked);
    if (!active) {
      showToast("Ative o destaque para gerar o Pix.");
      return;
    }
    const plannedClient = {
      ...client,
      destaqueSemanal: true,
      destaqueSemanas: mount.querySelector("#coFeaturedWeeks")?.value || 1,
      destaqueTipo: mount.querySelector("#coFeaturedType")?.value || "semanal",
      destaqueCobranca: "pix_separado"
    };
    const pix = buildDestaquePix(plannedClient, state.pagamentoSistema);
    const code = mount.querySelector("#coFeaturedPixCode");
    const qr = mount.querySelector("#coFeaturedQr");
    if (code) code.value = pix.pixCode;
    if (qr) qr.src = pix.qrUrl;
    mount.querySelector("#coFeaturedPixBox")?.classList.remove("hidden");
    showToast("Pix do destaque gerado.");
  });
  mount.querySelector("#coCopyFeaturedPix")?.addEventListener("click", async () => {
    await navigator.clipboard?.writeText(mount.querySelector("#coFeaturedPixCode")?.value || "");
    showToast("Codigo Pix do destaque copiado.");
  });

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
    await registrarNovidadeAdmin({
      tipo: "estabelecimento",
      titulo: "Novas fotos adicionadas",
      acao: "Novas fotos adicionadas",
      descricao: "Novas fotos adicionadas",
      tituloConteudo: client.nome || client.id,
      estabelecimento: client.nome || client.id,
      imagem: urls[0] || imagemPrincipalNovidade(client),
      imagens: urls,
      categoria: client.categoria || "",
      destinoTipo: "estabelecimento",
      destinoId: client.nomeNormalizado || normalizeName(client.nome || client.id)
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
      cardapioAtivo: true,
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
    await registrarNovidadeAdmin({
      tipo: "estabelecimento",
      titulo: "Novas fotos adicionadas",
      acao: "Novas fotos adicionadas",
      descricao: "Novas fotos adicionadas",
      tituloConteudo: client.nome || client.id,
      estabelecimento: client.nome || client.id,
      imagem: url,
      imagens: [url],
      categoria: client.categoria || "",
      destinoTipo: "estabelecimento",
      destinoId: client.nomeNormalizado || normalizeName(client.nome || client.id)
    });
    showToast("Imagem com texto adicionada.");
    await loadAllData();
    renderClientOnlyEditor();
  });

  mount.querySelectorAll("[data-co-promo-layout]").forEach((button) => {
    button.addEventListener("click", () => {
      const select = mount.querySelector("#coPromoArtLayout");
      if (select) select.value = button.dataset.coPromoLayout;
      mount.querySelectorAll("[data-co-promo-layout]").forEach((item) => item.classList.toggle("active", item === button));
    });
  });
  mount.querySelector("[data-co-promo-layout='classico']")?.classList.add("active");
  mount.querySelector("#coPromoArtLayout")?.addEventListener("change", (event) => {
    mount.querySelectorAll("[data-co-promo-layout]").forEach((item) => {
      item.classList.toggle("active", item.dataset.coPromoLayout === event.target.value);
    });
  });
  mount.querySelector("#coPromoArtItem")?.addEventListener("change", (event) => {
    const promo = promocoes.find((item) => item.id === event.target.value);
    const validityField = mount.querySelector("#coPromoArtValidityDate");
    if (validityField) validityField.value = promo?.validadeFim || "";
  });
  mount.querySelector("#coGeneratePromoArtButton")?.addEventListener("click", () => {
    gerarArteInstagramPromocao(
      client.id,
      mount.querySelector("#coPromoArtItem")?.value || "",
      mount.querySelector("#coPromoArtLayout")?.value || "classico",
      opcoesArtePromocao("coPromoArt", mount)
    );
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
    const acao = acaoNovidadeAdmin("promocao", coPromoEditIndex < 0, payload, current || {});
    await registrarNovidadeAdmin({
      tipo: "promocao",
      titulo: acao,
      acao,
      descricao: acao,
      tituloConteudo: tituloConteudoNovidadeAdmin("promocao", payload),
      estabelecimento: client.nome || client.id,
      imagem: payload.imagem,
      valor: payload.preco || payload.desconto || payload.valorTexto || "",
      categoria: client.categoria || "",
      destinoTipo: "promocao",
      destinoId: client.nomeNormalizado || normalizeName(client.nome || client.id),
      itemId: payload.id,
      destinoCardId: `promocao-${payload.id}-${client.nomeNormalizado || normalizeName(client.nome || client.id)}`
    });
    showToast(coPromoEditIndex >= 0 ? "Promocao atualizada." : "Promocao adicionada.");
    clearPromoFields("co", mount);
    setCoPromoEditMode(-1);
    await loadAllData();
    renderClientOnlyEditor();
  });

  mount.querySelector("#coAddJobButton")?.addEventListener("click", async () => {
    const title = $("coJobTitle").value.trim();
    const description = $("coJobDescription").value.trim();
    if (!title && !description) {
      showToast("Informe o titulo ou a descricao da vaga.");
      return;
    }
    const current = coJobEditIndex >= 0 ? vagasTrabalho[coJobEditIndex] : null;
    const payload = readJobFields("co", mount, current?.id || `vaga-${Date.now()}`);
    if (coJobEditIndex >= 0 && current) vagasTrabalho[coJobEditIndex] = payload;
    else vagasTrabalho.unshift(payload);
    const normalizedJobs = normalizeVagasTrabalho(vagasTrabalho);
    const mainJob = normalizedJobs.find((item) => item.ativo !== false) || normalizedJobs[0] || {};
    await update(ref(db, `clientes/${client.id}`), {
      vagasTrabalho: normalizedJobs,
      vagaAtiva: Boolean(mainJob.titulo || mainJob.descricao || mainJob.requisitos),
      vagaTitulo: mainJob.titulo || "",
      vagaCargo: mainJob.titulo || "",
      infoVagaTrabalho: mainJob.descricao || "",
      vagaDescricao: mainJob.descricao || "",
      vagaPreRequisito: mainJob.requisitos || "",
      vagaRequisitos: mainJob.requisitos || "",
      vagaSalario: mainJob.salario || "",
      vagaJornada: mainJob.jornada || "",
      vagaLocal: mainJob.local || "",
      vagaContato: mainJob.contato || "",
      vagaComoCandidatar: mainJob.comoCandidatar || "",
      vagaValidade: mainJob.validade || "",
      origem: "painel",
      editadoNoPainel: true,
      updatedAt: serverTimestamp(),
      updatedBy: state.user.uid
    });
    const acao = acaoNovidadeAdmin("vaga", coJobEditIndex < 0, payload, current || {});
    await registrarNovidadeAdmin({
      tipo: "vaga",
      titulo: acao,
      acao,
      descricao: acao,
      tituloConteudo: tituloConteudoNovidadeAdmin("vaga", payload),
      estabelecimento: client.nome || client.id,
      imagem: imagemPrincipalNovidade(client),
      categoria: client.categoria || "Vagas de trabalho",
      destinoTipo: "vaga",
      destinoId: client.nomeNormalizado || normalizeName(client.nome || client.id),
      itemId: payload.id
    });
    showToast(coJobEditIndex >= 0 ? "Vaga atualizada." : "Vaga adicionada.");
    clearJobFields("co", mount);
    setCoJobEditMode(-1);
    await loadAllData();
    renderClientOnlyEditor();
  });

  mount.querySelector("#coCancelJobEditButton")?.addEventListener("click", () => {
    clearJobFields("co", mount);
    setCoJobEditMode(-1);
  });

  mount.querySelector("#coCancelPromoEditButton")?.addEventListener("click", () => {
    clearPromoFields("co", mount);
    setCoPromoEditMode(-1);
  });

  mount.querySelector("#coPromoImageUpload")?.addEventListener("change", async (event) => {
    await uploadSelectedPromoImage("coPromoImageUpload", "coPromoImageUrl", client.id);
    event.target.value = "";
  });

  mount.querySelector("#coWhatsappGroupImageUpload")?.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const path = `clientes/${client.id}/grupo-whatsapp/${Date.now()}-${slugify(file.name || "imagem")}`;
    const url = await uploadFileWithProgress(
      storageRef(storage, path),
      file,
      "Enviando imagem do grupo",
      file.name || "imagem"
    );
    const imageField = mount.querySelector("#coWhatsappGroupImage");
    const preview = mount.querySelector("#coWhatsappGroupPreview");
    if (imageField) imageField.value = url;
    if (preview) preview.src = displayImageUrl(url);
    event.target.value = "";
    showToast("Imagem do grupo enviada.");
  });

  mount.querySelector("#coSaveWhatsappGroupButton")?.addEventListener("click", async () => {
    const nome = mount.querySelector("#coWhatsappGroupName")?.value.trim() || client.nome || "";
    const link = mount.querySelector("#coWhatsappGroupLink")?.value.trim() || "";
    const descricao = mount.querySelector("#coWhatsappGroupDescription")?.value.trim() || "";
    const imagem = mount.querySelector("#coWhatsappGroupImage")?.value.trim() || "";
    const enabled = Boolean(mount.querySelector("#coWhatsappGroupEnabled")?.checked);
    if (!nome || !link) {
      showToast("Informe o nome e o link do grupo.");
      return;
    }
    if (!/^https:\/\/chat\.whatsapp\.com\//i.test(link)) {
      showToast("Informe um link valido de grupo do WhatsApp.");
      return;
    }
    const isNewGroup = !clientWhatsappGroup.link;
    const payload = cleanForFirebase({
      nome,
      name: nome,
      descricao,
      description: descricao,
      link,
      imagem,
      image: imagem,
      status: enabled ? "ativo" : "inativo",
      clienteId: client.id,
      clienteNome: client.nome || "",
      origem: "painel-cliente",
      ...(isNewGroup ? { createdAt: serverTimestamp() } : {}),
      updatedAt: serverTimestamp(),
      updatedBy: state.user.uid
    });
    await update(ref(db), {
      [`conteudosInformativos/gruposWhatsapp/${clientWhatsappGroupId}`]: payload,
      [`clientes/${client.id}/grupoWhatsappId`]: clientWhatsappGroupId,
      [`clientes/${client.id}/grupoWhatsappNome`]: nome,
      [`clientes/${client.id}/grupoWhatsappLink`]: link,
      [`clientes/${client.id}/grupoWhatsappDescricao`]: descricao,
      [`clientes/${client.id}/grupoWhatsappImagem`]: imagem
    });
    if (enabled) {
      const acao = acaoNovidadeAdmin("grupoWhatsapp", isNewGroup, payload);
      await registrarNovidadeAdmin({
        tipo: "grupoWhatsapp",
        titulo: acao,
        acao,
        descricao: acao,
        tituloConteudo: nome,
        estabelecimento: client.nome || client.id,
        imagem,
        categoria: "Grupos WhatsApp",
        destinoTipo: "grupoWhatsapp",
        destinoId: clientWhatsappGroupId,
        itemId: clientWhatsappGroupId
      });
    }
    showToast(enabled ? "Grupo WhatsApp publicado." : "Grupo WhatsApp salvo como oculto.");
    await loadAllData();
    state.pendingClientModuleTarget = "client-module-grupo-whatsapp";
    renderClientOnlyEditor();
  });

  mount.querySelector("#coDeleteWhatsappGroupButton")?.addEventListener("click", async () => {
    if (!(await confirmarExclusao(clientWhatsappGroup.nome || client.nome || "grupo", "grupo WhatsApp"))) return;
    await update(ref(db), {
      [`conteudosInformativos/gruposWhatsapp/${clientWhatsappGroupId}`]: null,
      [`clientes/${client.id}/grupoWhatsappId`]: null,
      [`clientes/${client.id}/grupoWhatsappNome`]: null,
      [`clientes/${client.id}/grupoWhatsappLink`]: null,
      [`clientes/${client.id}/grupoWhatsappDescricao`]: null,
      [`clientes/${client.id}/grupoWhatsappImagem`]: null
    });
    await removerNovidadesPorDestino("grupoWhatsapp", clientWhatsappGroupId, clientWhatsappGroupId);
    showToast("Grupo WhatsApp excluido.");
    await loadAllData();
    state.pendingClientModuleTarget = "client-module-grupo-whatsapp";
    renderClientOnlyEditor();
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
      const promo = promocoes[index];
      if (!promo || !(await confirmarExclusao(promo.titulo || "sem titulo", "promocao"))) return;
      promocoes.splice(index, 1);
      await update(ref(db, `clientes/${client.id}`), {
        promocoes: normalizePromocoes(promocoes),
        origem: "painel",
        editadoNoPainel: true,
        updatedAt: serverTimestamp(),
        updatedBy: state.user.uid
      });
      await removerNovidadesPorDestino("promocao", client.nomeNormalizado || normalizeName(client.nome || client.id), promo.id || "");
      showToast("Promocao removida.");
      await loadAllData();
      renderClientOnlyEditor();
    });
  });

  mount.querySelectorAll("[data-job-edit]").forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.jobEdit);
      const vaga = vagasTrabalho[index];
      if (!vaga) return;
      fillJobFields("co", vaga, mount);
      setCoJobEditMode(index);
      $("coJobTitle")?.focus();
      $("coJobTitle")?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  });

  mount.querySelectorAll("[data-job-remove]").forEach((button) => {
    button.addEventListener("click", async () => {
      const index = Number(button.dataset.jobRemove);
      const vagaRemovida = vagasTrabalho[index];
      vagasTrabalho.splice(index, 1);
      const normalizedJobs = normalizeVagasTrabalho(vagasTrabalho);
      const mainJob = normalizedJobs.find((item) => item.ativo !== false) || normalizedJobs[0] || {};
      await update(ref(db, `clientes/${client.id}`), {
        vagasTrabalho: normalizedJobs,
        vagaAtiva: Boolean(mainJob.titulo || mainJob.descricao || mainJob.requisitos),
        vagaTitulo: mainJob.titulo || "",
        vagaCargo: mainJob.titulo || "",
        infoVagaTrabalho: mainJob.descricao || "",
        vagaDescricao: mainJob.descricao || "",
        vagaPreRequisito: mainJob.requisitos || "",
        vagaRequisitos: mainJob.requisitos || "",
        vagaSalario: mainJob.salario || "",
        vagaJornada: mainJob.jornada || "",
        vagaLocal: mainJob.local || "",
        vagaContato: mainJob.contato || "",
        vagaComoCandidatar: mainJob.comoCandidatar || "",
        vagaValidade: mainJob.validade || "",
        origem: "painel",
        editadoNoPainel: true,
        updatedAt: serverTimestamp(),
        updatedBy: state.user.uid
      });
      await removerNovidadesPorDestino("vaga", client.nomeNormalizado || normalizeName(client.nome || client.id), vagaRemovida?.id || "");
      showToast("Vaga removida.");
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
      const contatos = [
        $("coContact").value.trim(),
        $("coWhatsapp").value.trim(),
        $("coContact3")?.value.trim() || ""
      ].filter(Boolean);
      Object.assign(payload, {
        nome,
        nomeNormalizado: normalizeName(nome),
        contatos,
        contato: contatos[0] || "",
        whatsapp: contatos[1] || contatos[0] || "",
        contato2: contatos[1] || "",
        contato3: contatos[2] || "",
        ...(isRealEstateClient ? { creci: $("coCreci")?.value.trim() || "" } : {}),
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
    if (canEditVagas) {
      const normalizedJobs = normalizeVagasTrabalho(vagasTrabalho);
      const mainJob = normalizedJobs.find((item) => item.ativo !== false) || normalizedJobs[0] || {};
      Object.assign(payload, {
        vagasTrabalho: normalizedJobs,
        vagaAtiva: Boolean(mainJob.titulo || mainJob.descricao || mainJob.requisitos),
        vagaTitulo: mainJob.titulo || "",
        vagaCargo: mainJob.titulo || "",
        infoVagaTrabalho: mainJob.descricao || "",
        vagaDescricao: mainJob.descricao || "",
        vagaPreRequisito: mainJob.requisitos || "",
        vagaRequisitos: mainJob.requisitos || "",
        vagaSalario: mainJob.salario || "",
        vagaJornada: mainJob.jornada || "",
        vagaLocal: mainJob.local || "",
        vagaContato: mainJob.contato || "",
        vagaComoCandidatar: mainJob.comoCandidatar || "",
        vagaValidade: mainJob.validade || ""
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
        cardapioAtivo: Boolean($("coMenuEnabled")?.checked),
        cardapioLink: $("coMenuLink")?.value.trim() || "",
        menuImages
      });
    }
    if (canEditPromocoes) {
      payload.promocoes = normalizePromocoes(promocoes);
    }
    if (canEditDestaque) {
      const destaqueAtivo = Boolean($("coFeaturedWeek")?.checked);
      const destaqueTipo = $("coFeaturedType")?.value || "semanal";
      const weeks = destaqueWeeksForClient({ destaqueSemanas: $("coFeaturedWeeks")?.value || 1 });
      const days = destaqueDaysForClient({ destaqueSemanas: weeks, destaqueTipo });
      const start = destaqueAtivo ? (client.destaqueInicio || dateKeyFromDate(new Date())) : "";
      Object.assign(payload, {
        destaqueSemanal: destaqueAtivo,
        destaqueTipo,
        destaqueSemanas: weeks,
        destaqueDias: days,
        destaqueInicio: start,
        destaqueFim: destaqueAtivo ? dateKeyFromDate(addDays(new Date(`${start}T12:00:00`), days - 1)) : "",
        destaqueCobranca: $("coFeaturedBilling")?.value || "mensalidade",
        destaqueValor: destaqueAtivo ? destaqueValueForClient({ destaqueSemanas: weeks, destaqueTipo }) : 0
      });
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
        ${promo.instagramMensagem ? `<small>Instagram: ${escapeHtml(promo.instagramMensagem)}</small>` : ""}
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
    if ($("clientModuleSidebar")) {
      $("clientModuleSidebar").innerHTML = "";
      $("clientModuleSidebar").classList.add("hidden");
    }
    return;
  }

  const paymentConfig = state.pagamentoSistema || {};
  const meses = pendingMonthsForClient(client);
  const faturas = meses.map((mes) => buildClientInvoice(client, mes, paymentConfig));
  const firstInvoice = faturas[0] || buildClientInvoice(client, currentMonthKey(), paymentConfig, null, { ignoreSaved: true });
  const planOverviewCard = `
    <article class="invoice-card invoice-contract-card">
      <div class="invoice-contract-grid">
        <div>
          <span>Plano contratado</span>
          <strong>${escapeHtml(planLabel(client.tipoPlano))}</strong>
          <small>${moneyBR(valorTotalFaturaCliente(client))}${destaqueIncludedInInvoice(client) ? " com destaque incluso" : ""}</small>
        </div>
        <div>
          <span>Vencimento</span>
          <strong>${escapeHtml(formatDateBR(firstInvoice.dueDate))}</strong>
          <small>${client.vencimentoDia ? `Todo dia ${escapeHtml(client.vencimentoDia)}` : "Data definida pelo fechamento da fatura"}</small>
        </div>
        <div>
          <span>Pagamento</span>
          <strong>${escapeHtml(planLabel(client.tipoPlano || "mensal"))}</strong>
          <small>${escapeHtml(paymentLabel(client.pagamentoStatus || "em_aberto"))}</small>
        </div>
      </div>
    </article>
  `;
  const showFeaturedPix = destaqueIsActive(client) && (destaqueBillingForClient(client) === "pix_separado" || client.tipoPlano === "anual");
  const featuredPix = showFeaturedPix ? buildDestaquePix(client, paymentConfig) : null;
  const featuredPixCard = showFeaturedPix ? `
    <article class="invoice-card invoice-summary-card">
      <div class="section-head compact">
        <div>
          <h3>Destaque da semana</h3>
          <p>${featuredPix.semanas} semana${featuredPix.semanas === 1 ? "" : "s"} (${featuredPix.dias} dias)${featuredPix.fim ? ` - valido ate ${formatDateBR(featuredPix.fim)}` : ""}.</p>
        </div>
        <span class="badge em_aberto">${moneyBR(featuredPix.valorDestaque)}</span>
      </div>
      ${paymentConfig.pixChave ? `
        <div class="form-actions">
          <button id="generateFeaturedInvoicePix" type="button"><i class="fa-solid fa-qrcode"></i> Gerar Pix do destaque</button>
        </div>
        <div id="featuredInvoicePixBox" class="pix-box invoice-selected-pix hidden">
          <img id="featuredInvoiceQr" alt="QR Code Pix destaque" loading="lazy" decoding="async">
          <label class="wide">Codigo Pix do destaque<textarea id="featuredInvoicePixCode" rows="5" readonly></textarea></label>
          <div class="list-meta wide">Chave Pix: <strong>${escapeHtml(paymentConfig.pixChave || "")}</strong></div>
          <div class="form-actions">
            <button id="copyFeaturedInvoicePix" type="button" class="ghost-button"><i class="fa-solid fa-copy"></i> Copiar codigo Pix</button>
          </div>
        </div>
      ` : `<div class="list-meta">A chave Pix ainda nao foi configurada pelo admin master.</div>`}
    </article>
  ` : "";

  if (!faturas.length) {
    mount.innerHTML = `
      ${planOverviewCard}
      ${featuredPixCard}
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
    bindFeaturedInvoicePix(featuredPix);
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
      ${planOverviewCard}
      ${featuredPixCard}
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
                <small>Plano ${moneyBR(fatura.valorPlano)}${fatura.valorDestaque ? ` + destaque ${moneyBR(fatura.valorDestaque)}` : ""} - venc. ${escapeHtml(formatDateBR(fatura.dueDate))}</small>
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
  bindFeaturedInvoicePix(featuredPix);

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

function stopAdminIdleTimer() {
  if (adminIdleTimer) clearTimeout(adminIdleTimer);
  adminIdleTimer = null;
}

function resetAdminIdleTimer() {
  stopAdminIdleTimer();
  if (!auth.currentUser) return;
  adminIdleTimer = setTimeout(async () => {
    stopAdminIdleTimer();
    try {
      await signOut(auth);
      if ($("loginMessage")) $("loginMessage").textContent = "Sessao encerrada por inatividade. Entre novamente.";
    } catch (error) {
      console.warn("Nao foi possivel encerrar a sessao por inatividade.", error);
    }
  }, ADMIN_IDLE_TIMEOUT_MS);
}

function bindAdminIdleTimer() {
  const events = ["click", "keydown", "input", "mousemove", "touchstart", "scroll"];
  events.forEach((eventName) => {
    document.addEventListener(eventName, resetAdminIdleTimer, { passive: true });
  });
}

function bindEvents() {
  bindCurrencyMask($("imovelValor"));
  bindCurrencyMask($("automovelPreco"));
  bindPhoneMask("imovelTelefone");
  bindPhoneMask("clientContact");
  bindPhoneMask("clientWhatsapp");
  bindPhoneMask("clientContact3");

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

  $("resetPasswordButton")?.addEventListener("click", async () => {
    const email = $("loginEmail")?.value.trim().toLowerCase() || "";
    $("loginMessage").textContent = "";
    if (!email) {
      $("loginMessage").textContent = "Informe seu e-mail para receber o link de redefinicao.";
      $("loginEmail")?.focus();
      return;
    }
    setBusy($("resetPasswordButton"), true, "Enviando...");
    try {
      await sendPasswordResetEmail(auth, email);
      $("loginMessage").textContent = "Enviamos um link de redefinicao para este e-mail. Abra o e-mail e crie sua nova senha.";
    } catch (error) {
      console.warn("Falha ao enviar redefinicao de senha.", error);
      $("loginMessage").textContent = "Nao foi possivel enviar o link agora. Confira o e-mail informado ou tente novamente.";
    } finally {
      setBusy($("resetPasswordButton"), false);
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
  $("clientStatusFilter")?.addEventListener("change", renderClientsList);
  $("clientDueFilter")?.addEventListener("change", renderClientsList);
  $("clientTypeFilter")?.addEventListener("change", renderClientsList);
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
  ["clientFeaturedWeek", "clientFeaturedWeeks", "clientFeaturedBilling"].forEach((id) => {
    $(id)?.addEventListener("input", refreshClientFeaturedSummary);
    $(id)?.addEventListener("change", refreshClientFeaturedSummary);
  });
  refreshClientFeaturedSummary();
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
  $("generateImovelArtButton")?.addEventListener("click", () => gerarArteInstagramImovel());
  $("imovelArteLayout")?.addEventListener("change", () => atualizarVisibilidadeEditorCs());
  $("imovelArteItem")?.addEventListener("change", () => atualizarVisibilidadeEditorCs(true));
  $("imovelCsBrokerImage")?.addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      state.imovelCsBrokerImage = String(reader.result || "");
      if ($("imovelCsBrokerPreview")) $("imovelCsBrokerPreview").src = state.imovelCsBrokerImage;
    };
    reader.readAsDataURL(file);
  });
  $("imovelCsResetBrokerImage")?.addEventListener("click", () => {
    const item = state.imoveis.find((imovel) => imovel.id === $("imovelArteItem")?.value && itemBelongsToCurrentClient(imovel));
    if (!item) return;
    state.imovelCsBrokerImage = "";
    if ($("imovelCsBrokerImage")) $("imovelCsBrokerImage").value = "";
    if ($("imovelCsBrokerPreview")) $("imovelCsBrokerPreview").src = logoClienteImovelAdmin(donoImovelAdmin(item));
  });
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
  const handleAutomovelImagesUpload = async (event) => {
    const id = $("automovelId").value || slugify(`${$("automovelMarca").value}-${$("automovelModelo").value}`) || `automovel-${Date.now()}`;
    const urls = await uploadAutomovelImages(id, event.target.files);
    state.automovelImages.push(...urls);
    if (!$("automovelImagem").value && state.automovelImages[0]) $("automovelImagem").value = state.automovelImages[0];
    renderAutomovelImagesPreview();
    event.target.value = "";
  };
  $("automovelImagesUpload")?.addEventListener("change", handleAutomovelImagesUpload);
  $("automovelCameraUpload")?.addEventListener("change", handleAutomovelImagesUpload);
  $("automovelCameraButton")?.addEventListener("click", () => {
    $("automovelCameraUpload")?.click();
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
  $("newInfoWhatsappGroupButton")?.addEventListener("click", () => {
    resetInfoWhatsappGroupForm();
    openFormForEdit("infoWhatsappGroupForm");
  });
  $("closeInfoWhatsappGroupFormButton")?.addEventListener("click", resetInfoWhatsappGroupForm);
  $("infoWhatsappGroupSearch")?.addEventListener("input", renderInfoWhatsappGroupsList);
  $("infoWhatsappGroupImageUpload")?.addEventListener("change", async (event) => {
    await uploadInfoWhatsappGroupImage(event.target.files?.[0]);
    event.target.value = "";
  });
  document.querySelectorAll("[data-info-module-target]").forEach((button) => {
    button.addEventListener("click", () => {
      const targetId = button.dataset.infoModuleTarget;
      document.querySelectorAll("[data-info-module-target]").forEach((item) => item.classList.toggle("active", item === button));
      document.querySelectorAll("#informacoesView .info-module-panel").forEach((panel) => {
        panel.classList.toggle("active", panel.id === targetId);
      });
    });
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
      diasNovidadesVisiveis: Math.max(1, Number($("paymentNewsVisibleDays")?.value || 5) || 5),
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
  $("homePageForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!isMaster()) {
      showToast("Somente master pode alterar a pagina inicial.");
      return;
    }
    const payload = {
      ativo: $("homeBannerActive")?.checked !== false,
      titulo: $("homeBannerTitle")?.value.trim() || "Carlópolis em tempo real",
      subtitulo: $("homeBannerSubtitle")?.value.trim() || "Acesse os principais serviços, eventos, novidades e promoções da cidade.",
      imagens: Array.isArray(state.paginaInicialSite?.imagens) ? state.paginaInicialSite.imagens.filter(Boolean) : [],
      updatedAt: serverTimestamp(),
      updatedBy: state.user?.uid || ""
    };
    await update(ref(db, "configuracoes/paginaInicial"), payload);
    state.paginaInicialSite = payload;
    renderHomePageSettings();
    showToast("Pagina inicial salva.");
  });
  $("homeBannerImagesUpload")?.addEventListener("change", async (event) => {
    if (!isMaster()) {
      showToast("Somente master pode enviar fotos do banner.");
      event.target.value = "";
      return;
    }
    await uploadHomeBannerImages(event.target.files);
    event.target.value = "";
  });
  $("storyClient")?.addEventListener("change", () => {
    state.storyCustomImage = "";
    if ($("storyCustomImage")) $("storyCustomImage").value = "";
    if ($("storyCustomImageName")) $("storyCustomImageName").textContent = "Nenhuma imagem personalizada.";
    fillStoryClientImages(storyCurrentClient(), false);
    atualizarPreviaStory();
  });
  $("storyClientImage")?.addEventListener("change", () => {
    state.storyCustomImage = "";
    if ($("storyCustomImage")) $("storyCustomImage").value = "";
    if ($("storyCustomImageName")) $("storyCustomImageName").textContent = "Nenhuma imagem personalizada.";
    atualizarPreviaStory();
  });
  $("storyCustomImage")?.addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      state.storyCustomImage = String(reader.result || "");
      if ($("storyCustomImageName")) $("storyCustomImageName").textContent = file.name;
      atualizarPreviaStory();
    };
    reader.readAsDataURL(file);
  });
  document.querySelectorAll("[data-story-template]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedStoryTemplate = button.dataset.storyTemplate || "vitrine";
      document.querySelectorAll("[data-story-template]").forEach((item) => item.classList.toggle("active", item === button));
      atualizarPreviaStory();
    });
  });
  ["storyHeadline", "storyMessage", "storyCta", "storyAccent", "storyShowContact", "storyShowProspect"].forEach((id) => {
    $(id)?.addEventListener("input", scheduleStoryPreview);
    $(id)?.addEventListener("change", scheduleStoryPreview);
  });
  $("storyRefreshPreview")?.addEventListener("click", atualizarPreviaStory);
  $("storyDownload")?.addEventListener("click", baixarStoryComercial);
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
    const isNewClient = !state.selectedClientId;
    const oldImagesCount = normalizeImageItems(sourceClient?.imagens).length;
    const newImagesCount = normalizeImageItems(payload.imagens).length;
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
    if (isNewClient || newImagesCount > oldImagesCount) {
      const acao = isNewClient ? "Cadastro novo" : "Novas fotos adicionadas";
      await registrarNovidadeAdmin({
      tipo: "estabelecimento",
      titulo: acao,
      acao,
      descricao: acao,
      tituloConteudo: payload.nome,
      estabelecimento: payload.nome,
      imagem: imagemPrincipalNovidade(payload),
      imagens: normalizeImageItems(payload.imagens).map((item) => item.url || item).filter(Boolean),
      categoria: payload.categoria,
      destinoTipo: "estabelecimento",
      destinoId: payload.nomeNormalizado || id
      });
    }
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
  $("clientCategory")?.addEventListener("change", atualizarVisibilidadeCreciCliente);
  $("clientNewCategory")?.addEventListener("input", atualizarVisibilidadeCreciCliente);

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
    const isNewEvent = !state.selectedEventId;
    if (isNewEvent) payload.createdAt = serverTimestamp();
    await update(ref(db, `eventos/${id}`), payload);
    const acao = acaoNovidadeAdmin("evento", isNewEvent, payload);
    await registrarNovidadeAdmin({
      tipo: "evento",
      titulo: acao,
      acao,
      descricao: acao,
      tituloConteudo: tituloConteudoNovidadeAdmin("evento", payload),
      estabelecimento: payload.titulo || payload.nome || "Evento",
      imagem: payload.imagem,
      categoria: "Eventos",
      destinoTipo: "evento",
      destinoId: id
    });
    showToast("Evento salvo.");
    resetEventForm();
    await loadAllData();
  });

  $("deleteEventButton").addEventListener("click", async () => {
    if (!state.selectedEventId) return;
    const evento = state.eventos.find((item) => item.id === state.selectedEventId);
    if (!(await confirmarExclusao(evento?.titulo || evento?.nome || state.selectedEventId, "evento"))) return;
    await update(ref(db, `eventos/${state.selectedEventId}`), {
      status: "excluido",
      deletedAt: serverTimestamp(),
      deletedBy: state.user?.uid || ""
    });
    await removerNovidadesPorDestino("evento", state.selectedEventId, state.selectedEventId);
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
    const isNewImovel = !state.selectedImovelId;
    const originalImovelNovidade = isNewImovel ? {} : (state.imoveis.find((item) => item.id === state.selectedImovelId) || {});
    if (isNewImovel) {
      payload.createdAt = serverTimestamp();
      payload.codRef = await gerarCodigoReferenciaIncremental("imovel");
    } else {
      const original = state.imoveis.find((item) => item.id === state.selectedImovelId) || {};
      payload.codRef = original.codRef || original.codigo || await gerarCodigoReferenciaIncremental("imovel");
    }
    const updates = { [`conteudosInformativos/imoveis/${id}`]: payload };
    if (state.selectedImovelId && state.selectedImovelId !== id) {
      updates[`conteudosInformativos/imoveis/${state.selectedImovelId}`] = null;
    }
    await update(ref(db), updates);
    const acao = acaoNovidadeAdmin("imovel", isNewImovel, payload, originalImovelNovidade);
    await registrarNovidadeAdmin({
      tipo: "imovel",
      titulo: acao,
      acao,
      descricao: acao,
      tituloConteudo: tituloConteudoNovidadeAdmin("imovel", payload),
      estabelecimento: payload.clienteNome || payload.corretor || "",
      imagem: imagemPrincipalNovidade(payload),
      imagens: payload.imagens || [],
      valor: payload.valor || "",
      categoria: "Imóveis",
      destinoTipo: "imovel",
      destinoId: id
    });
    showToast("Imovel salvo.");
    resetImovelForm();
    await loadAllData();
  });

  $("deleteImovelButton")?.addEventListener("click", async () => {
    await excluirImovelPorId(state.selectedImovelId);
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
    const isNewAutomovel = !state.selectedAutomovelId;
    const originalAutomovelNovidade = isNewAutomovel ? {} : (state.automoveis.find((item) => item.id === state.selectedAutomovelId) || {});
    if (isNewAutomovel) {
      payload.createdAt = serverTimestamp();
      payload.codRef = await gerarCodigoReferenciaIncremental("automovel");
    } else {
      const original = state.automoveis.find((item) => item.id === state.selectedAutomovelId) || {};
      payload.codRef = original.codRef || original.codigo || await gerarCodigoReferenciaIncremental("automovel");
    }
    const updates = { [`conteudosInformativos/automoveis/${id}`]: payload };
    if (state.selectedAutomovelId && state.selectedAutomovelId !== id) {
      updates[`conteudosInformativos/automoveis/${state.selectedAutomovelId}`] = null;
    }
    await update(ref(db), updates);
    const acao = acaoNovidadeAdmin("veiculo", isNewAutomovel, payload, originalAutomovelNovidade);
    await registrarNovidadeAdmin({
      tipo: "veiculo",
      titulo: acao,
      acao,
      descricao: acao,
      tituloConteudo: tituloConteudoNovidadeAdmin("veiculo", payload),
      estabelecimento: payload.clienteNome || payload.vendedor || payload.loja || "",
      imagem: imagemPrincipalNovidade(payload),
      imagens: payload.imagens || [],
      valor: payload.preco || "",
      categoria: "Automóveis",
      destinoTipo: "veiculo",
      destinoId: id
    });
    showToast("Automovel salvo.");
    resetAutomovelForm();
    await loadAllData();
  });

  $("deleteAutomovelButton")?.addEventListener("click", async () => {
    if (!state.selectedAutomovelId) return;
    const original = state.automoveis.find((item) => item.id === state.selectedAutomovelId);
    if (!original || !itemBelongsToCurrentClient(original)) {
      showToast("Voce nao tem permissao para excluir este automovel.");
      return;
    }
    const titulo = [original.marca, original.modelo, original.ano].filter(Boolean).join(" ") || original.codRef || original.id;
    if (!(await confirmarExclusao(titulo, "automovel"))) return;
    await remove(ref(db, `conteudosInformativos/automoveis/${state.selectedAutomovelId}`));
    await removerNovidadesPorDestino("veiculo", state.selectedAutomovelId, state.selectedAutomovelId);
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
    const nota = state.notasFalecimento.find((item) => item.id === state.selectedDeathNoticeId);
    if (!state.selectedDeathNoticeId || !(await confirmarExclusao(nota?.nomeFalecido || nota?.name || state.selectedDeathNoticeId, "nota de falecimento"))) return;
    await remove(ref(db, `conteudosInformativos/notaFalecimento/${state.selectedDeathNoticeId}`));
    showToast("Nota de falecimento excluida.");
    resetInfoDeathNoticeForm();
    await loadAllData();
  });

  $("infoWhatsappGroupForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!canManageInformacoes()) return;
    const payload = getInfoWhatsappGroupFormData();
    if (!payload.nome || !payload.link) {
      showToast("Informe nome e link do grupo.");
      return;
    }
    const id = payload.id;
    delete payload.id;
    const isNewGroup = !state.selectedWhatsappGroupId;
    if (isNewGroup) payload.createdAt = serverTimestamp();
    const updates = { [`conteudosInformativos/gruposWhatsapp/${id}`]: payload };
    if (state.selectedWhatsappGroupId && state.selectedWhatsappGroupId !== id) {
      updates[`conteudosInformativos/gruposWhatsapp/${state.selectedWhatsappGroupId}`] = null;
    }
    await update(ref(db), updates);
    const acao = acaoNovidadeAdmin("grupoWhatsapp", isNewGroup, payload);
    await registrarNovidadeAdmin({
      tipo: "grupoWhatsapp",
      titulo: acao,
      acao,
      descricao: acao,
      tituloConteudo: tituloConteudoNovidadeAdmin("grupoWhatsapp", payload),
      estabelecimento: "Olá Carlópolis",
      imagem: imagemPrincipalNovidade(payload),
      categoria: "Grupos WhatsApp",
      destinoTipo: "grupoWhatsapp",
      destinoId: id,
      itemId: id
    });
    showToast("Grupo WhatsApp salvo.");
    resetInfoWhatsappGroupForm();
    await loadAllData();
  });

  $("deleteInfoWhatsappGroupButton")?.addEventListener("click", async () => {
    if (!state.selectedWhatsappGroupId) return;
    const grupo = state.gruposWhatsapp.find((item) => item.id === state.selectedWhatsappGroupId);
    if (!(await confirmarExclusao(grupo?.nome || grupo?.name || state.selectedWhatsappGroupId, "grupo WhatsApp"))) return;
    await remove(ref(db, `conteudosInformativos/gruposWhatsapp/${state.selectedWhatsappGroupId}`));
    await removerNovidadesPorDestino("grupoWhatsapp", state.selectedWhatsappGroupId, state.selectedWhatsappGroupId);
    showToast("Grupo WhatsApp excluido.");
    resetInfoWhatsappGroupForm();
    await loadAllData();
  });
}

renderPanelVersion();
bindEvents();
bindAdminIdleTimer();

onAuthStateChanged(auth, async (user) => {
  state.user = user;
  if (!user) {
    stopAdminIdleTimer();
    state.profile = null;
    $("loginView").classList.remove("hidden");
    $("appView").classList.add("hidden");
    renderClientBillingAlert();
    return;
  }

  const profile = await loadProfile(user);
  if (!profile || profile.status === "inativo") {
    await signOut(auth);
    $("loginMessage").textContent = "Usuario sem perfil administrativo ativo.";
    return;
  }

  state.profile = profile;
  resetAdminIdleTimer();
  const initialView = initialViewForProfile();
  prepareInitialView(initialView);
  $("loginView").classList.add("hidden");
  $("appView").classList.remove("hidden");
  updateChrome();
  await loadAllData();
  renderClientBillingAlert();
  if (!canManageClients()) renderClientOnlyEditor();
  switchView(initialView);
});
