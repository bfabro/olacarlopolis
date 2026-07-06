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
  query,
  limitToLast,
  onValue,
  set as firebaseSet,
  update as firebaseUpdate,
  remove as firebaseRemove,
  serverTimestamp,
  runTransaction
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import {
  getStorage,
  ref as storageRef,
  uploadBytesResumable,
  getDownloadURL,
  getBlob
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
  numero: 393,
  label: "v399",
  data: "2026-07-06",
  nota: "Logo Ola Carlopolis no layout 3 fotos ficou um pouco maior e mais proxima do canto direito."
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const storage = getStorage(app);
const ADMIN_IDLE_TIMEOUT_MS = 10 * 60 * 1000;
let adminIdleTimer = null;
let clientMetricsRealtimeUnsubscribers = [];
let clientMetricsRealtimeSignature = "";
let automovelArtePreviewTimer = null;
let automovelArteDragState = null;
let automovelArteDragFrame = null;
let automovelArtePreviewRendering = false;
let automovelArtePreviewQueued = false;

let state = {
  user: null,
  profile: null,
  clientes: [],
  clientesFinanceiro: {},
  usuarios: [],
  eventos: [],
  noticias: [],
  noticiaExtraImages: [],
  imoveis: [],
  automoveis: [],
  notasFalecimento: [],
  gruposWhatsapp: [],
  categorias: [],
  pagamentoSistema: {},
  paginaInicialSite: {},
  novidadesConfig: {},
  xadrezConfig: {},
  metricas: {},
  auditLogs: [],
  reportSection: "analytics",
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
  selectedAutomovelArtId: "",
  selectedAutomovelArtLayout: "showroom",
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

const AUDIT_IGNORED_ROOTS = new Set(["auditLogs", "novidades"]);
const NOVIDADES_TOPICS = {
  novoCliente: ["Novo cliente", "Cadastro de um novo comércio, serviço ou instituição."],
  nomeCliente: ["Nome do cliente", "Alteração do nome comercial."],
  endereco: ["Endereço", "Alteração do endereço do cliente."],
  telefone: ["Telefone / WhatsApp", "Alteração dos contatos do cliente."],
  horario: ["Horário de atendimento", "Alteração de horários ou atendimento 24 horas."],
  imagens: ["Imagens", "Novas fotos adicionadas ao cadastro."],
  promocao: ["Promoções", "Nova promoção ou atualização de oferta."],
  imovel: ["Imóveis", "Novo imóvel ou atualização do cadastro."],
  nomeImovel: ["Nome do imóvel", "Alteração do título ou identificação do imóvel."],
  automovel: ["Automóveis", "Novo veículo ou atualização do cadastro."],
  preco: ["Preços", "Redução ou atualização de preço em promoções, imóveis e veículos."],
  vaga: ["Vagas de trabalho", "Nova vaga ou atualização de oportunidade."],
  evento: ["Eventos", "Novo evento ou atualização dos dados."],
  grupoWhatsapp: ["Grupos de WhatsApp", "Novo grupo ou atualização do grupo."],
  noticia: ["Notícias", "Notícias cadastradas ou integradas futuramente."],
  cardapio: ["Cardápio", "Alteração ou inclusão de cardápio."],
  redesSociais: ["Redes sociais e site", "Alteração de Instagram, Facebook, TikTok ou site."],
  destaque: ["Destaque comercial", "Cliente incluído ou atualizado nos destaques."],
  categoria: ["Categoria", "Mudança de categoria do cliente."]
};
const AUDIT_CATEGORY_LABELS = {
  clientes: "Clientes",
  clientesFinanceiro: "Financeiro",
  usuarios: "Usuarios",
  usuariosByUid: "Usuarios",
  categorias: "Categorias",
  eventos: "Eventos",
  conteudosInformativos: "Informacoes",
  configuracoes: "Configuracoes",
  importacoes: "Importacoes"
};

function auditCategoryFromPath(path = "") {
  const parts = String(path || "").split("/").filter(Boolean);
  const root = parts[0] || "";
  const section = parts[1] || "";
  if (root === "conteudosInformativos") {
    return {
      imoveis: "Imoveis",
      automoveis: "Automoveis",
      notaFalecimento: "Notas de falecimento",
      gruposWhatsapp: "Grupos WhatsApp"
    }[section] || "Informacoes";
  }
  if (root === "configuracoes") {
    return {
      pagamento: "Configuracoes financeiras",
      paginaInicial: "Pagina inicial"
    }[section] || "Configuracoes";
  }
  return AUDIT_CATEGORY_LABELS[root] || root;
}

function databaseReferencePath(reference) {
  try {
    const url = new URL(reference.toString());
    return decodeURIComponent(url.pathname.replace(/^\/+|\/+$/g, ""));
  } catch {
    return "";
  }
}

function auditTargetFromWrite(reference, value = null) {
  const basePath = databaseReferencePath(reference);
  const paths = basePath
    ? [basePath]
    : Object.keys(value && typeof value === "object" ? value : {});
  const relevantPaths = paths.filter((path) => {
    const root = String(path || "").split("/")[0];
    return root && !AUDIT_IGNORED_ROOTS.has(root);
  });
  if (!relevantPaths.length) return null;
  const categories = [...new Set(relevantPaths.map(auditCategoryFromPath))];
  const category = categories.length === 1
    ? categories[0]
    : "Multiplas categorias";
  return {
    category,
    target: relevantPaths.slice(0, 6).join(", "),
    total: relevantPaths.length
  };
}

async function registrarLogAuditoria(action, category, details = "", target = "") {
  const user = auth.currentUser || state.user;
  if (!user || !state.profile) return;
  const id = `${Date.now()}-${user.uid}-${Math.random().toString(36).slice(2, 9)}`;
  try {
    await firebaseSet(ref(db, `auditLogs/${id}`), {
      uid: user.uid,
      email: String(user.email || state.profile.email || "").trim(),
      role: currentRole() || state.profile.role || "",
      action,
      category,
      details: String(details || "").slice(0, 500),
      target: String(target || "").slice(0, 500),
      createdAt: serverTimestamp()
    });
  } catch (error) {
    console.warn("Nao foi possivel registrar o log de auditoria.", error);
  }
}

async function update(reference, value) {
  await firebaseUpdate(reference, value);
  const audit = auditTargetFromWrite(reference, value);
  if (audit) {
    const hasRemoval = Object.values(value || {}).some((item) => item === null);
    const action = hasRemoval ? "Exclusao/atualizacao" : "Atualizacao";
    await registrarLogAuditoria(action, audit.category, `${audit.total} registro(s) alterado(s)`, audit.target);
  }
}

async function set(reference, value) {
  await firebaseSet(reference, value);
  const audit = auditTargetFromWrite(reference, value);
  if (audit) await registrarLogAuditoria("Gravacao", audit.category, "Registro salvo", audit.target);
}

async function remove(reference) {
  const audit = auditTargetFromWrite(reference);
  await firebaseRemove(reference);
  if (audit) await registrarLogAuditoria("Exclusao", audit.category, "Registro removido", audit.target);
}

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
  noticias: $("noticiasView"),
  imoveis: $("imoveisView"),
  automoveis: $("automoveisView"),
  informacoes: $("informacoesView"),
  financeiro: $("financeiroView"),
  relatorios: $("relatoriosView"),
  pagamentoSistema: $("pagamentoSistemaView"),
  paginaInicialSite: $("paginaInicialSiteView"),
  novidadesConfig: $("novidadesConfigView"),
  xadrezConfig: $("xadrezConfigView"),
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
  noticias: ["Noticias", "Cadastre materias para a home e para a pagina publica de noticias."],
  imoveis: ["Imoveis", "Cadastre imoveis para venda ou aluguel no site publico."],
  automoveis: ["Automoveis", "Cadastre veiculos para venda no site publico."],
  informacoes: ["Informacoes", "Gerencie os conteudos do menu Informacoes."],
  financeiro: ["Financeiro", "Visao consolidada dos clientes e faturas."],
  relatorios: ["Relatorios", "Indicadores e pontos de atencao do painel."],
  pagamentoSistema: ["Pagamento", "Configure a chave Pix usada nas faturas."],
  storiesComerciais: ["Stories comerciais", "Crie artes premium para clientes e conquiste novos anunciantes."],
  paginaInicialSite: ["Página Inicial Site", "Configure o banner principal de acessos rapidos."],
  novidadesConfig: ["Novidades do site", "Defina quais atualizações aparecem na tela principal pública."],
  xadrezConfig: ["Xadrez", "Configure campeonato e premio do jogo de xadrez."],
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

function aliasKeyVariants(value) {
  const raw = String(value || "").trim();
  if (!raw) return [];
  const variants = new Set([raw, slugify(raw), normalizeName(raw)]);
  const parts = slugify(raw).split("-").filter(Boolean);
  if (parts.length > 1) {
    variants.add(parts.slice(0, 2).join("-"));
    variants.add(parts.slice(0, 2).join(""));
    variants.add(parts.slice(0, 3).join("-"));
    variants.add(parts.slice(0, 3).join(""));
    variants.add(parts.slice(1).join("-"));
    variants.add(parts.slice(1).join(""));
    variants.add(parts.slice(-2).join("-"));
    variants.add(parts.slice(-2).join(""));
    variants.add(parts.slice(-3).join("-"));
    variants.add(parts.slice(-3).join(""));
  }
  return [...variants].filter(Boolean);
}

function addAliasVariants(target, value) {
  aliasKeyVariants(value).forEach((variant) => addAliasKey(target, variant));
}

function buildClientPublicAliases(clientId, payload, sourceClient = null, useFormContext = true) {
  const form = useFormContext ? $("clientForm") : null;
  const aliases = { ...(sourceClient?.aliases || {}) };
  const add = (value) => addAliasVariants(aliases, value);
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

function clienteAssociadoAutomoveis(client = {}, includeCurrentPermission = false) {
  const category = normalizeName(client.categoria || client.category || client.categoriaId || client.tipoCliente || client.tipo || "");
  const categoryMatches = /automovel|veiculo|revenda|carro|moto/.test(category);
  const permissionMatches = includeCurrentPermission && Boolean(state.profile?.permissoes?.veiculos);
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

function canGenerateVeiculoImages() {
  if (canManageClients()) return true;
  const permissions = state.profile?.permissoes || {};
  if (Object.prototype.hasOwnProperty.call(permissions, "gerar_imagens_veiculos")) {
    return Boolean(permissions.gerar_imagens_veiculos);
  }
  return Boolean(permissions.veiculos);
}

function canAccessImoveis() {
  return hasPermission("imoveis") || canGenerateImovelImages();
}

function canAccessAutomoveis() {
  return hasPermission("veiculos") || canGenerateVeiculoImages() || clienteAssociadoAutomoveis(currentClientRecord());
}

function currentClientId() {
  return state.profile?.clienteId || "";
}

function currentClientRecord() {
  const id = currentClientId();
  if (!id) return null;
  return state.clientes.find((client) => client.id === id) || null;
}

function isBillableClientType(clientOrType = "") {
  const type = normalizeName(
    typeof clientOrType === "string"
      ? clientOrType
      : (clientOrType?.tipoCliente || clientOrType?.tipo || "")
  );
  return type === "comercio" || type === "servico";
}

function syncClientPaymentByType(resetWhenBecomingBillable = false) {
  const type = $("clientType")?.value || "comercio";
  const payment = $("clientPaymentStatus");
  if (!payment) return;
  const billable = isBillableClientType(type);
  const wasDisabled = payment.disabled;
  if (!billable) payment.value = "isento";
  if (billable && resetWhenBecomingBillable && wasDisabled) payment.value = "em_aberto";
  payment.disabled = !billable;
  payment.title = billable ? "" : "Clientes institucionais ou de outro tipo sao isentos de cobranca.";
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
  if (viewName === "dashboard") return canManageClients();
  if (canManageClients()) {
    if (viewName === "pagamentoSistema") return isMaster();
    if (viewName === "paginaInicialSite") return isMaster();
    if (viewName === "novidadesConfig") return isMaster();
    if (viewName === "xadrezConfig") return isMaster();
    if (viewName === "storiesComerciais") return isMaster();
    return true;
  }
  if (viewName === "faturas") return hasPermission("faturas") || clientHasOpenInvoice(currentClientRecord());
  if (viewName === "imoveis") return canAccessImoveis();
  if (viewName === "automoveis") return canAccessAutomoveis();
  if (viewName === "noticias") return canManageClients() || hasPermission("noticias");
  if (viewName === "informacoes") return canManageInformacoes();
  if (viewName === "minhaEmpresa") return true;
  return false;
}

function initialViewForProfile() {
  return canManageClients() ? "dashboard" : "minhaEmpresa";
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
  return normalizeClientContactDetails(client).map((item) => item.numero);
}

function normalizeClientContactDetails(client = {}) {
  const detailed = Array.isArray(client.contatosDetalhados)
    ? client.contatosDetalhados.map((item) => ({
      numero: String(item?.numero || item?.telefone || "").trim(),
      referencia: String(item?.referencia || item?.nome || item?.local || "").trim(),
      whatsapp: Boolean(item?.whatsapp)
    }))
    : [];
  const legacyWhatsappDigits = String(client.whatsapp || "").replace(/\D/g, "");
  const candidates = [
    ...detailed,
    ...(Array.isArray(client.contatos) ? client.contatos.map((numero) => ({ numero, whatsapp: false })) : []),
    { numero: client.contato, whatsapp: false },
    { numero: client.contact, whatsapp: false },
    { numero: client.whatsapp, whatsapp: true },
    { numero: client.contato2, whatsapp: false },
    { numero: client.contact2, whatsapp: false },
    { numero: client.contato3, whatsapp: false },
    { numero: client.contact3, whatsapp: false },
    { numero: client.telefone, whatsapp: false }
  ];
  const byNumber = new Map();
  candidates.forEach((item) => {
    const numero = String(item?.numero || "").trim();
    const key = numero.replace(/\D/g, "");
    if (!key) return;
    const existing = byNumber.get(key);
    byNumber.set(key, {
      numero: existing?.numero || numero,
      referencia: existing?.referencia || String(item?.referencia || "").trim(),
      whatsapp: Boolean(existing?.whatsapp || item?.whatsapp || (legacyWhatsappDigits && key === legacyWhatsappDigits))
    });
  });
  return [...byNumber.values()]
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

const CLIENT_FINANCE_FIELDS = [
  "pagamentoStatus",
  "tipoPlano",
  "valorPlano",
  "valorMensal",
  "descontoValor",
  "vencimentoDia",
  "vencimentoDataPlano",
  "financeiroObs",
  "mesesEmAberto",
  "faturas",
  "financeiroStatus",
  "statusFinanceiro",
  "observacaoAdmin",
  "observacaoFinanceira"
];

function pickClientFinanceFields(source = {}) {
  const safeSource = source && typeof source === "object" ? source : {};
  const picked = {};
  CLIENT_FINANCE_FIELDS.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(safeSource, field)) {
      picked[field] = safeSource[field];
    }
  });
  return picked;
}

function splitClientFinancePayload(payload = {}) {
  const publicPayload = { ...payload };
  const financePayload = pickClientFinanceFields(publicPayload);
  CLIENT_FINANCE_FIELDS.forEach((field) => {
    delete publicPayload[field];
  });
  return { publicPayload, financePayload };
}

function clientFinanceMapFromSnapshot(snapshot, singleClientId = "") {
  const map = {};
  if (!snapshot?.exists()) return map;

  if (singleClientId) {
    map[singleClientId] = snapshot.val() || {};
    return map;
  }

  snapshot.forEach((child) => {
    map[child.key] = child.val() || {};
    return false;
  });
  return map;
}

function mergeClientFinanceData(client, privateFinance = {}) {
  const legacyFinance = pickClientFinanceFields(client);
  const privateFields = {
    ...pickClientFinanceFields(privateFinance?.financeiro || {}),
    ...pickClientFinanceFields(privateFinance)
  };
  const mergedFinance = { ...legacyFinance, ...privateFields };
  const hasFinance = Object.keys(mergedFinance).length > 0;
  if (!hasFinance) return client;
  return {
    ...client,
    ...mergedFinance,
    financeiroUpdatedAt: privateFinance?.updatedAt || privateFinance?.financeiro?.updatedAt || 0,
    financeiroUpdatedBy: privateFinance?.updatedBy || privateFinance?.financeiro?.updatedBy || "",
    financeiro: {
      ...(client.financeiro || {}),
      ...mergedFinance
    }
  };
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

const EMPTY_SNAPSHOT = {
  exists: () => false,
  forEach: () => false,
  val: () => null,
  numChildren: () => 0
};

async function getPanelSnapshot(path, options = {}) {
  const { enabled = true, required = false } = options;
  if (!enabled) return EMPTY_SNAPSHOT;
  try {
    return await get(ref(db, path));
  } catch (error) {
    if (required) throw error;
    console.warn(`Leitura opcional bloqueada ou indisponivel: ${path}`, error);
    return EMPTY_SNAPSHOT;
  }
}

function scopedClientMetricsFromSnapshot(snapshot, clientKey = "") {
  const metrics = {
    cliquesBotoes: {},
    cliquesMenu: {},
    acessos: {},
    ondeComerCardapios: {},
    ondeComerWhats: {},
    ondeComerFotos: {},
    promocoes: {},
    cliquesBotoesDetalhado: {},
    cliquesOndeComerDetalhado: {},
    cliquesPromocoesDetalhado: {},
    cliquesPorMenuDetalhado: {},
    origemAcessos: {},
    instalacoesPWA: {},
    usoPWA: {}
  };
  const data = snapshot?.exists() ? snapshot.val() : {};

  Object.entries(data || {}).forEach(([date, day]) => {
    const botoes = day?.botoes || {};
    const ondeComer = day?.ondeComer || {};
    const promocoes = day?.promocoes || {};
    const detalhes = day?.detalhes || {};

    if (Object.keys(botoes).length) metrics.cliquesBotoes[date] = { [clientKey]: botoes };
    ["whatsapp_promocao", "instagram_promocao", "facebook", "tiktok", "site"].forEach((tipo) => {
      if (!Number(promocoes[tipo] || 0)) return;
      if (!metrics.cliquesBotoes[date]) metrics.cliquesBotoes[date] = { [clientKey]: {} };
      metrics.cliquesBotoes[date][clientKey][tipo] = Number(promocoes[tipo]);
    });
    if (Number(ondeComer.cardapio || 0)) metrics.ondeComerCardapios[date] = { [clientKey]: Number(ondeComer.cardapio) };
    if (Number(ondeComer.whatsapp || 0)) metrics.ondeComerWhats[date] = { [clientKey]: Number(ondeComer.whatsapp) };
    if (Number(ondeComer.fotos || 0)) metrics.ondeComerFotos[date] = { [clientKey]: Number(ondeComer.fotos) };

    const totalPromocoes = Object.values(promocoes).reduce((sum, count) => sum + Number(count || 0), 0);
    if (totalPromocoes) metrics.promocoes[date] = { [clientKey]: totalPromocoes };

    Object.entries(detalhes).forEach(([logId, item]) => {
      const group = item?.grupo || "botoes";
      const target = group === "ondeComer"
        ? "cliquesOndeComerDetalhado"
        : (group === "promocoes" ? "cliquesPromocoesDetalhado" : "cliquesBotoesDetalhado");
      if (!metrics[target][date]) metrics[target][date] = { [clientKey]: {} };
      metrics[target][date][clientKey][logId] = item;
    });
  });

  return metrics;
}

function mergeMetricTrees(target = {}, source = {}) {
  Object.entries(source || {}).forEach(([key, value]) => {
    if (typeof value === "number") {
      target[key] = Number(target[key] || 0) + value;
      return;
    }
    if (value && typeof value === "object") {
      if (!target[key] || typeof target[key] !== "object") target[key] = {};
      mergeMetricTrees(target[key], value);
      return;
    }
    target[key] = value;
  });
  return target;
}

function clientMetricScopeKeys(client = currentClientRecord()) {
  return [...new Set([
    currentClientId(),
    client?.id,
    client?.nomeNormalizado,
    clientCanonicalId(client),
    normalizeName(client?.nome || client?.name || ""),
    ...Object.keys(client?.aliases || {})
  ].flatMap(aliasKeyVariants).map((value) => String(value || "").trim()).filter(Boolean))];
}

function stopClientMetricsRealtime() {
  clientMetricsRealtimeUnsubscribers.forEach((unsubscribe) => {
    try {
      unsubscribe();
    } catch (error) {
      console.warn("Nao foi possivel encerrar uma assinatura de metricas.", error);
    }
  });
  clientMetricsRealtimeUnsubscribers = [];
  clientMetricsRealtimeSignature = "";
}

function refreshClientMetricReport(client = currentClientRecord()) {
  const root = $("clientMetricReportMount");
  if (!root || !client) return;
  root.innerHTML = renderClientMetricReportContent(client);
  bindClientMetricReportControls(client);
}

function startClientMetricsRealtime(client = currentClientRecord()) {
  if (canManageClients() || !client) {
    stopClientMetricsRealtime();
    return;
  }

  const keys = clientMetricScopeKeys(client);
  const signature = keys.slice().sort().join("|");
  if (!signature || signature === clientMetricsRealtimeSignature) return;

  stopClientMetricsRealtime();
  clientMetricsRealtimeSignature = signature;
  const snapshotsByKey = new Map();

  const applyRealtimeMetrics = () => {
    const metrics = {};
    snapshotsByKey.forEach((snapshot, clientKey) => {
      mergeMetricTrees(metrics, scopedClientMetricsFromSnapshot(snapshot, clientKey));
    });
    state.metricas = metrics;
    refreshClientMetricReport(currentClientRecord() || client);
  };

  clientMetricsRealtimeUnsubscribers = keys.map((clientKey) => onValue(
    ref(db, `metricasClientes/${clientKey}`),
    (snapshot) => {
      snapshotsByKey.set(clientKey, snapshot);
      applyRealtimeMetrics();
    },
    (error) => {
      console.warn(`Metricas em tempo real indisponiveis para ${clientKey}.`, error);
    }
  ));
}

async function loadAuditLogs() {
  state.auditLogs = [];
  if (!isMaster()) return;
  try {
    const snapshot = await get(query(ref(db, "auditLogs"), limitToLast(1000)));
    if (snapshot.exists()) {
      snapshot.forEach((child) => {
        state.auditLogs.push({ id: child.key, ...child.val() });
        return false;
      });
    }
    state.auditLogs.sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
  } catch (error) {
    console.warn("Leitura dos logs de auditoria bloqueada ou indisponivel.", error);
  }
}

function applyClientsSnapshot(snapshot, financeSnapshot = null, financeClientId = "") {
  const financeByClientId = clientFinanceMapFromSnapshot(financeSnapshot, financeClientId);
  const allClients = consolidateClientsForAdmin(snapshotToClientList(snapshot))
    .map((client) => mergeClientFinanceData(client, financeByClientId[client.id]));
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
          <span>${label}</span>
        </label>
        <strong class="schedule-status">${open ? "Aberto" : "Fechado"}</strong>
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
      const row = input.closest(".schedule-day");
      row?.classList.toggle("closed", !input.checked);
      const status = row?.querySelector(".schedule-status");
      if (status) status.textContent = input.checked ? "Aberto" : "Fechado";
    });
  });
}

function toggleSchedule24Hours(containerId, enabled) {
  const box = $(containerId);
  if (!box) return;
  box.classList.toggle("schedule-disabled", Boolean(enabled));
  box.querySelectorAll("input").forEach((input) => {
    input.disabled = Boolean(enabled);
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

let toastTimer = null;

function showToast(message, options = {}) {
  const toast = $("toast");
  if (!toast) return;
  if (toastTimer) clearTimeout(toastTimer);
  toast.textContent = message;
  const success = /salv|atualizad|criad[oa] com sucesso|concluid[oa]/i.test(String(message || ""));
  toast.classList.toggle("success", success);
  toast.classList.toggle("prominent", Boolean(options.prominent));
  toast.classList.remove("hidden");
  toastTimer = setTimeout(() => {
    toast.classList.add("hidden");
    toast.classList.remove("prominent");
  }, success ? 5200 : 3600);
}

const ADMIN_ACTION_LOADING_DELAY = 280;
const ADMIN_ACTION_LOADING_MIN_VISIBLE = 450;
let adminActionLoadingCount = 0;
let adminActionLoadingTimer = null;
let adminActionLoadingVisibleAt = 0;

function adminActionLoadingLabel(target) {
  const text = String(target?.innerText || target?.textContent || "").replace(/\s+/g, " ").trim();
  if (/salvar|gravar|publicar|atualizar/i.test(text)) return "Salvando alterações...";
  if (/excluir|remover|limpar/i.test(text)) return "Processando exclusão...";
  if (/gerar|baixar|download|boleto|pix|arte|story/i.test(text)) return "Gerando informações...";
  if (/enviar|upload|imagem|foto|logo/i.test(text)) return "Enviando arquivo...";
  if (/entrar|login/i.test(text)) return "Validando acesso...";
  if (/atualizar|sincronizar|migrar|auditar/i.test(text)) return "Atualizando dados...";
  return text ? `Carregando ${text}...` : "Carregando...";
}

function showAdminActionLoading(message = "Carregando...", sourceButton = null) {
  const box = $("adminActionLoading");
  if (!box) return;
  $("adminActionLoadingText").textContent = message;
  box.classList.remove("hidden");
  adminActionLoadingVisibleAt = Date.now();
  sourceButton?.classList?.add("admin-button-loading");
}

function beginAdminActionLoading(message = "Carregando...", sourceButton = null) {
  adminActionLoadingCount += 1;
  if (!adminActionLoadingTimer && $("adminActionLoading")?.classList.contains("hidden")) {
    adminActionLoadingTimer = setTimeout(() => {
      adminActionLoadingTimer = null;
      if (adminActionLoadingCount > 0) showAdminActionLoading(message, sourceButton);
    }, ADMIN_ACTION_LOADING_DELAY);
  } else if (adminActionLoadingCount > 0 && !$("adminActionLoading")?.classList.contains("hidden")) {
    $("adminActionLoadingText").textContent = message;
    sourceButton?.classList?.add("admin-button-loading");
  }
  let finished = false;
  return () => {
    if (finished) return;
    finished = true;
    adminActionLoadingCount = Math.max(0, adminActionLoadingCount - 1);
    sourceButton?.classList?.remove("admin-button-loading");
    if (adminActionLoadingCount > 0) return;
    if (adminActionLoadingTimer) {
      clearTimeout(adminActionLoadingTimer);
      adminActionLoadingTimer = null;
      return;
    }
    const hide = () => $("adminActionLoading")?.classList.add("hidden");
    const elapsed = Date.now() - adminActionLoadingVisibleAt;
    setTimeout(hide, Math.max(0, ADMIN_ACTION_LOADING_MIN_VISIBLE - elapsed));
  };
}

window.beginAdminActionLoading = beginAdminActionLoading;

function installAdminActionLoadingInterceptor() {
  if (window.__adminActionLoadingInterceptorInstalled) return;
  window.__adminActionLoadingInterceptorInstalled = true;
  const originalAddEventListener = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function patchedAddEventListener(type, listener, options) {
    const shouldWrap = (type === "click" || type === "submit") && typeof listener === "function";
    if (!shouldWrap || listener.__adminLoadingWrapped) {
      return originalAddEventListener.call(this, type, listener, options);
    }
    const wrapped = function adminLoadingWrappedListener(event) {
      const target = event?.target?.closest?.("button, [role='button'], input[type='submit'], form") || event?.target;
      const insideAdmin = Boolean(target?.closest?.("#appView, #loginView, #panelLoadingView"));
      const skip = target?.matches?.("[data-no-loading], .admin-no-loading") || target?.closest?.("[data-no-loading], .admin-no-loading");
      if (!insideAdmin || skip) return listener.call(this, event);
      const button = target?.closest?.("button, [role='button'], input[type='submit']");
      const finish = beginAdminActionLoading(adminActionLoadingLabel(button || target), button);
      try {
        const result = listener.call(this, event);
        if (result && typeof result.finally === "function") result.finally(finish);
        else queueMicrotask(finish);
        return result;
      } catch (error) {
        finish();
        throw error;
      }
    };
    wrapped.__adminLoadingWrapped = true;
    return originalAddEventListener.call(this, type, wrapped, options);
  };
}

installAdminActionLoadingInterceptor();

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

function uploadPrivateFileWithProgress(fileRef, file, title = "Enviando arquivo", detail = "") {
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
    }, () => {
      setUploadProgress(100, title, "Envio concluido.");
      resolve({
        path: task.snapshot.ref.fullPath,
        name: file?.name || task.snapshot.ref.name || "comprovante",
        contentType: file?.type || task.snapshot.metadata?.contentType || ""
      });
      hideUploadProgress();
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

function setPanelLoadingProgress(percent = 0, message = "") {
  const value = Math.max(0, Math.min(100, Math.round(Number(percent) || 0)));
  const bar = $("panelLoadingBar");
  const label = $("panelLoadingPercent");
  const track = document.querySelector(".panel-loading-track");
  if (bar) bar.style.width = `${value}%`;
  if (label) label.textContent = `${value}%`;
  if (track) track.setAttribute("aria-valuenow", String(value));
  if (message && $("panelLoadingMessage")) $("panelLoadingMessage").textContent = message;
}

function showPanelLoading(message = "Validando seu acesso...") {
  $("loginView")?.classList.add("hidden");
  $("appView")?.classList.add("hidden");
  $("panelLoadingView")?.classList.remove("hidden");
  setPanelLoadingProgress(5, message);
}

function hidePanelLoading() {
  $("panelLoadingView")?.classList.add("hidden");
}

async function loadProfile(user) {
  const masterEmail = isMasterEmail(user.email);
  const masterPermissions = { dados: true, destaque: true, vagas: true, imagens: true, cardapio: true, promocoes: true, noticias: true, gerar_imagens_promocoes: true, relatorios: true, faturas: true, financeiro: true, imoveis: true, gerar_imagens_imoveis: true, veiculos: true, gerar_imagens_veiculos: true, informacoes: true, informacoes_nota_falecimento: true };
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
  const masterPermissions = { dados: true, destaque: true, vagas: true, imagens: true, cardapio: true, promocoes: true, noticias: true, gerar_imagens_promocoes: true, relatorios: true, faturas: true, financeiro: true, imoveis: true, gerar_imagens_imoveis: true, veiculos: true, gerar_imagens_veiculos: true, informacoes: true, informacoes_nota_falecimento: true };
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

async function createAuthUserWithTemporaryPassword(email, password) {
  const secondaryName = `creator-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const secondary = initializeApp(firebaseConfig, secondaryName);
  const secondaryAuth = getAuth(secondary);
  const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
  await signOut(secondaryAuth);
  return cred.user;
}

async function migratePanelUserEmail({ currentUser, email, password, role, clienteId, status, permissoes }) {
  if (!isMaster()) {
    showToast("Somente master pode trocar o e-mail de acesso.");
    return false;
  }
  if (!currentUser?.uid || currentUser.uid === state.user?.uid) {
    showToast("Nao e possivel trocar o e-mail do usuario logado por aqui.");
    return false;
  }
  if (!password) {
    showToast("Informe uma senha provisoria para criar o novo acesso.");
    return false;
  }
  const oldEmail = String(currentUser.email || "").trim().toLowerCase();
  const ok = confirm(`Trocar o acesso de ${oldEmail || currentUser.uid} para ${email}?\n\nUm novo login sera criado e o perfil antigo sera removido do painel.`);
  if (!ok) return false;

  const authUser = await createAuthUserWithTemporaryPassword(email, password);
  await saveUserProfile({
    uid: authUser.uid,
    email,
    role,
    clienteId: role === "cliente" ? clienteId : "",
    status,
    permissoes
  });

  const updates = {
    [`usuariosByUid/${currentUser.uid}`]: null
  };
  if (oldEmail) updates[`usuarios/${emailKey(oldEmail)}`] = null;
  await update(ref(db), updates);
  return true;
}

async function loadAllData(onProgress = null) {
  const progress = (percent, message) => {
    if (typeof onProgress === "function") onProgress(percent, message);
  };
  progress(35, "Buscando dados do sistema...");
  const canManage = canManageClients();
  const financeClientId = canManage ? "" : currentClientId();
  const financePath = financeClientId ? `clientesFinanceiro/${financeClientId}` : "clientesFinanceiro";
  const [
    clientesSnap,
    clientesFinanceiroSnap,
    usersSnap,
    eventosSnap,
    imoveisSnap,
    automoveisSnap,
    categoriasSnap,
    notasFalecimentoSnap,
    gruposWhatsappSnap,
    pagamentoSnap,
    paginaInicialSnap,
    novidadesConfigSnap,
    xadrezConfigSnap,
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
    getPanelSnapshot("clientes", { required: true }),
    getPanelSnapshot(financePath),
    getPanelSnapshot("usuariosByUid", { enabled: canManage }),
    getPanelSnapshot("eventos"),
    getPanelSnapshot("conteudosInformativos/imoveis"),
    getPanelSnapshot("conteudosInformativos/automoveis"),
    getPanelSnapshot("categorias"),
    getPanelSnapshot("conteudosInformativos/notaFalecimento"),
    getPanelSnapshot("conteudosInformativos/gruposWhatsapp"),
    getPanelSnapshot("configuracoes/pagamento"),
    getPanelSnapshot("configuracoes/paginaInicial"),
    getPanelSnapshot("configuracoes/novidades"),
    getPanelSnapshot("jogos/xadrez/config"),
    getPanelSnapshot("cliquesPorBotao", { enabled: canManage }),
    getPanelSnapshot("cliquesMenuLateral", { enabled: canManage }),
    getPanelSnapshot("acessosPorDia", { enabled: canManage }),
    getPanelSnapshot("cliquesCardapiosOndeComer", { enabled: canManage }),
    getPanelSnapshot("cliquesWhatsOndeComer", { enabled: canManage }),
    getPanelSnapshot("cliquesFotosOndeComer", { enabled: canManage }),
    getPanelSnapshot("cliquesPromocoesPorComercio", { enabled: canManage }),
    getPanelSnapshot("cliquesPorBotaoDetalhado", { enabled: canManage }),
    getPanelSnapshot("cliquesOndeComerDetalhado", { enabled: canManage }),
    getPanelSnapshot("cliquesPromocoesDetalhado", { enabled: canManage }),
    getPanelSnapshot("cliquesPorMenu", { enabled: canManage }),
    getPanelSnapshot("origemAcessos", { enabled: canManage }),
    getPanelSnapshot("instalacoesPWA", { enabled: canManage }),
    getPanelSnapshot("usoPWA", { enabled: canManage })
  ]);
  const noticiasSnap = await getPanelSnapshot("noticias");

  progress(58, "Organizando clientes e acessos...");
  state.clientesFinanceiro = clientFinanceMapFromSnapshot(clientesFinanceiroSnap, financeClientId);
  applyClientsSnapshot(clientesSnap, clientesFinanceiroSnap, financeClientId);
  let scopedClientMetrics = null;
  if (!canManage) {
    const client = currentClientRecord();
    const clientMetricKeys = clientMetricScopeKeys(client);
    scopedClientMetrics = {};
    for (const clientMetricKey of clientMetricKeys) {
      const scopedMetricsSnap = await getPanelSnapshot(`metricasClientes/${clientMetricKey}`);
      mergeMetricTrees(scopedClientMetrics, scopedClientMetricsFromSnapshot(scopedMetricsSnap, clientMetricKey));
    }
  }

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
      const value = child.val() || {};
      const linkedClient = state.clientes.find((client) => client.grupoWhatsappId === child.key);
      state.gruposWhatsapp.push({
        id: child.key,
        ...value,
        clienteId: value.clienteId || linkedClient?.id || "",
        clienteNome: value.clienteNome || linkedClient?.nome || ""
      });
      return false;
    });
  }
  state.gruposWhatsapp.sort((a, b) => String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR"));
  state.pagamentoSistema = pagamentoSnap.exists() ? pagamentoSnap.val() : {};
  state.paginaInicialSite = paginaInicialSnap.exists() ? paginaInicialSnap.val() : {};
  state.novidadesConfig = novidadesConfigSnap.exists() ? novidadesConfigSnap.val() : {};
  state.xadrezConfig = xadrezConfigSnap.exists() ? xadrezConfigSnap.val() : {};
  progress(72, "Preparando informações do painel...");
  state.metricas = scopedClientMetrics || {
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
  state.noticias = [];
  if (noticiasSnap.exists()) {
    noticiasSnap.forEach((child) => {
      const item = { id: child.key, ...child.val() };
      if (canManageClients() || item.createdBy === state.user?.uid) state.noticias.push(item);
      return false;
    });
  }
  state.noticias.sort((a, b) => String(b.dataPublicacao || "").localeCompare(String(a.dataPublicacao || "")) || Number(b.createdAt || 0) - Number(a.createdAt || 0));

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

  progress(86, "Montando telas e indicadores...");
  renderStats();
  renderClientsList();
  renderUsersList();
  renderCategoriesList();
  fillClientCategorySelect();
  fillCategoryParentSelect();
  fillUserClientSelect();
  fillEventClientSelect();
  renderEventsList();
  renderNewsAdminList();
  renderImoveisList();
  renderAutomoveisList();
  renderInfoDeathNoticeList();
  renderInfoWhatsappGroupsList();
  try {
    renderFinanceiro();
  } catch (error) {
    console.error("Falha ao renderizar o financeiro.", error);
    if ($("financeList")) $("financeList").innerHTML = `<div class="list-meta">Nao foi possivel montar o financeiro. Use Atualizar para tentar novamente.</div>`;
  }
  try {
    renderReports();
  } catch (error) {
    console.error("Falha ao renderizar os relatorios.", error);
    if ($("reportsMount")) $("reportsMount").innerHTML = `<section class="panel-card"><p>Nao foi possivel montar os relatorios. Use Atualizar para tentar novamente.</p></section>`;
  }
  renderPaymentSettings();
  renderHomePageSettings();
  renderNovidadesConfig();
  renderStoriesComerciaisView();
  renderClientInvoices();
  renderClientBillingAlert();
  progress(96, "Finalizando a navegação...");
  loadAuditLogs().then(() => {
    const reportsVisible = !$("relatoriosView")?.classList.contains("hidden");
    if (reportsVisible && state.reportSection === "actions") renderReports();
  });

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
  const clientTypeCounts = state.clientes.reduce((counts, client) => {
    const type = String(client.tipoCliente || client.tipo || "comercio").toLowerCase();
    if (Object.prototype.hasOwnProperty.call(counts, type)) counts[type] += 1;
    return counts;
  }, { comercio: 0, servico: 0, institucional: 0 });
  if ($("statComercios")) $("statComercios").textContent = String(clientTypeCounts.comercio);
  if ($("statServicos")) $("statServicos").textContent = String(clientTypeCounts.servico);
  if ($("statInstitucionais")) $("statInstitucionais").textContent = String(clientTypeCounts.institucional);
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
  document.querySelectorAll("[data-permission='noticias']").forEach((el) => {
    el.classList.toggle("hidden", !hasPermission("noticias"));
  });
  document.querySelectorAll("[data-permission='faturas']").forEach((el) => {
    el.classList.toggle("hidden", !hasPermission("faturas") || canManageClients());
  });
  document.querySelectorAll("[data-permission='imoveis']").forEach((el) => {
    el.classList.toggle("hidden", !canAccessImoveis());
  });
  document.querySelectorAll("[data-permission='veiculos']").forEach((el) => {
    el.classList.toggle("hidden", !canAccessAutomoveis());
  });
  document.querySelectorAll("[data-permission='veiculos_manage']").forEach((el) => {
    el.classList.toggle("hidden", !hasPermission("veiculos"));
  });
  document.querySelectorAll("[data-permission='gerar_imagens_veiculos']").forEach((el) => {
    el.classList.toggle("hidden", !canGenerateVeiculoImages());
  });
  document.querySelectorAll("[data-permission='gerar_imagens_imoveis']").forEach((el) => {
    el.classList.toggle("hidden", !canGenerateImovelImages());
  });
  document.querySelectorAll("[data-classified-nav='true']").forEach((el) => {
    el.classList.toggle("hidden", !canManageClients() && !hasPermission("noticias") && !canAccessImoveis() && !canAccessAutomoveis());
  });

  const masterOption = $("newUserRole")?.querySelector("option[value='master']");
  if (masterOption) masterOption.disabled = !isMaster();
}

function renderClientBillingAlert() {
  const box = $("clientBillingAlert");
  if (!box) return;
  const client = currentClientRecord();
  if (!clientHasOpenInvoice(client)) {
    box.classList.add("hidden");
    box.innerHTML = "";
    return;
  }

  const months = pendingMonthsForClient(client);
  const firstMonth = months[0] || currentMonthKey();
  const invoices = months.map((month) => buildClientInvoice(client, month, state.pagamentoSistema || {}));
  const firstInvoice = invoices[0] || buildClientInvoice(client, firstMonth, state.pagamentoSistema || {});
  const dueDate = (client.tipoPlano !== "mensal" ? financePlanDueDate(client) : "") || firstInvoice.dueDate;
  const daysUntilDue = calendarDaysBetween(dateKeyFromDate(new Date()), dueDate);
  const reminderMessages = {
    5: `Sua mensalidade vence em 5 dias, no dia ${formatDateBR(dueDate)}.`,
    3: `Sua mensalidade vence em 3 dias, no dia ${formatDateBR(dueDate)}.`,
    1: `Sua mensalidade vence amanhã, dia ${formatDateBR(dueDate)}.`
  };
  const isOverdue = Number.isFinite(daysUntilDue) && daysUntilDue < 0;
  const message = isOverdue
    ? `Sua mensalidade está vencida desde ${formatDateBR(dueDate)}. Caso o pagamento não seja regularizado, o cadastro poderá ser inativado em até 5 dias.`
    : reminderMessages[daysUntilDue];

  if (!message) {
    box.classList.add("hidden");
    box.innerHTML = "";
    return;
  }

  const total = invoices.reduce((sum, invoice) => sum + invoice.valorTotal, 0);
  const billingWhatsapp = billingWhatsappNumber();
  const clientName = client.nome || client.id || "cliente";
  const paidWhatsappUrl = billingWhatsapp
    ? whatsappUrl(billingWhatsapp, `Olá! Sou do estabelecimento ${clientName}. Já realizei o pagamento da mensalidade com vencimento em ${formatDateBR(dueDate)} e gostaria de confirmar a baixa.`)
    : "";
  const supportWhatsappUrl = billingWhatsapp
    ? whatsappUrl(billingWhatsapp, `Olá! Sou do estabelecimento ${clientName}. Preciso de ajuda com a mensalidade com vencimento em ${formatDateBR(dueDate)}.`)
    : "";

  box.classList.toggle("is-overdue", isOverdue);
  box.classList.toggle("is-upcoming", !isOverdue);
  box.classList.remove("hidden");
  box.innerHTML = `
    <div class="client-billing-alert-copy">
      <strong><i class="fa-solid ${isOverdue ? "fa-triangle-exclamation" : "fa-calendar-day"}"></i> ${isOverdue ? "Mensalidade vencida" : "Lembrete de vencimento"}</strong>
      <p>${escapeHtml(message)}</p>
      <small>Plano ${escapeHtml(planLabel(client.tipoPlano))}${total > 0 ? ` - ${escapeHtml(moneyBR(total))}` : ""}</small>
    </div>
    <div class="client-billing-alert-actions">
      ${paidWhatsappUrl ? `<a href="${escapeAttr(paidWhatsappUrl)}" target="_blank" rel="noopener noreferrer"><i class="fa-brands fa-whatsapp"></i> Já realizei o pagamento</a>` : ""}
      ${supportWhatsappUrl ? `<a class="billing-support-button" href="${escapeAttr(supportWhatsappUrl)}" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-headset"></i> Falar com o suporte</a>` : ""}
      <button type="button" data-open-client-invoices><i class="fa-solid fa-qrcode"></i> Ver faturas</button>
    </div>
  `;
  box.querySelector("[data-open-client-invoices]")?.addEventListener("click", () => {
    switchView("faturas");
    closeAdminMenuOnMobile();
  });
}

function calendarDaysBetween(fromDateKey = "", toDateKey = "") {
  const parseDateKey = (value) => {
    const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return NaN;
    return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  };
  const from = parseDateKey(fromDateKey);
  const to = parseDateKey(toDateKey);
  if (!Number.isFinite(from) || !Number.isFinite(to)) return NaN;
  return Math.round((to - from) / 86400000);
}

function billingWhatsappNumber() {
  const configured = state.pagamentoSistema?.whatsappCobranca || "";
  const digits = String(configured || "5543991766639").replace(/\D/g, "");
  if (!digits) return "";
  return digits.startsWith("55") ? digits : `55${digits}`;
}

function whatsappUrl(number, message) {
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
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

  if (target === "minhaEmpresa") {
    state.pendingClientModuleTarget = "";
    renderClientOnlyEditor();
  }
  if (target === "faturas") renderClientInvoices();
  if (target === "pagamentoSistema") renderPaymentSettings();
  if (target === "paginaInicialSite") renderHomePageSettings();
  if (target === "novidadesConfig") renderNovidadesConfig();
  if (target === "xadrezConfig") renderXadrezConfig();
  if (target === "storiesComerciais") renderStoriesComerciaisView();
  if (target === "relatorios") renderReports();
  if (target === "promocoesClientes") renderStaffPromocoesView();
  if (target === "noticias") renderNewsAdminList();
  if (target === "imoveis") renderImoveisList();
  if (target === "automoveis") {
    renderAutomoveisList();
    aplicarPermissaoLogoArteAutomovel();
  }
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

function clientSectionTitle(section) {
  return section.querySelector(".form-section-title strong, .section-head h3")?.textContent?.trim() || "Bloco do cadastro";
}

function setClientSectionExpanded(section, expanded) {
  if (!section) return;
  section.classList.toggle("is-collapsed", !expanded);
  const button = section.querySelector(":scope > .client-section-header [data-client-section-toggle]");
  button?.setAttribute("aria-expanded", expanded ? "true" : "false");
  const icon = button?.querySelector("i");
  if (icon) icon.className = expanded ? "fa-solid fa-chevron-up" : "fa-solid fa-chevron-down";
}

function setAllClientSectionsExpanded(expanded) {
  document.querySelectorAll("#clientForm > [data-client-edit-section]").forEach((section) => {
    setClientSectionExpanded(section, expanded);
  });
  if ($("clientShowAllSections")) $("clientShowAllSections").checked = expanded;
}

function addClientSectionToggle(section, header) {
  if (!section || !header || header.querySelector("[data-client-section-toggle]")) return;
  header.classList.add("client-section-header");
  const button = document.createElement("button");
  button.type = "button";
  button.className = "client-section-toggle";
  button.dataset.clientSectionToggle = "";
  button.setAttribute("aria-label", `Expandir ou retrair ${clientSectionTitle(section)}`);
  button.setAttribute("aria-expanded", "false");
  button.innerHTML = `<i class="fa-solid fa-chevron-down"></i>`;
  header.appendChild(button);
  header.addEventListener("click", (event) => {
    if (event.target.closest("input, select, textarea, a")) return;
    setClientSectionExpanded(section, section.classList.contains("is-collapsed"));
    if ($("clientShowAllSections")) {
      const sections = [...document.querySelectorAll("#clientForm > [data-client-edit-section]")];
      $("clientShowAllSections").checked = sections.length > 0 && sections.every((item) => !item.classList.contains("is-collapsed"));
    }
  });
}

function prepareClientFormSections() {
  const form = $("clientForm");
  if (!form || form.dataset.sectionsPrepared === "true") return;
  form.dataset.sectionsPrepared = "true";
  const children = [...form.children];
  const isStandaloneSection = (element) => element.matches("section.profile-upload-panel, section.upload-panel");
  const isStart = (element) => element.matches(".form-section-title") || isStandaloneSection(element);

  children.forEach((child, index) => {
    if (!isStart(child) || child.closest("[data-client-edit-section]")) return;
    if (isStandaloneSection(child)) {
      child.dataset.clientEditSection = "";
      const header = child.querySelector(":scope > .section-head");
      if (header) {
        [...child.children].filter((item) => item !== header).forEach((item) => item.classList.add("client-section-content"));
        addClientSectionToggle(child, header);
      }
      setClientSectionExpanded(child, false);
      return;
    }

    const wrapper = document.createElement("section");
    wrapper.className = "client-edit-section wide";
    wrapper.dataset.clientEditSection = "";
    form.insertBefore(wrapper, child);
    wrapper.appendChild(child);
    child.classList.add("client-section-header");
    const content = document.createElement("div");
    content.className = "client-section-body grid-form client-section-content";
    wrapper.appendChild(content);
    for (let nextIndex = index + 1; nextIndex < children.length; nextIndex += 1) {
      const next = children[nextIndex];
      if (isStart(next) || next.matches(".form-actions")) break;
      content.appendChild(next);
    }
    addClientSectionToggle(wrapper, child);
    setClientSectionExpanded(wrapper, false);
  });
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
  if ($("clientPaymentStatus")) $("clientPaymentStatus").value = "em_aberto";
  syncClientPaymentByType();
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
  if ($("clientOpen24Hours")) $("clientOpen24Hours").checked = false;
  toggleSchedule24Hours("clientScheduleEditor", false);
  renderClientImagesPreview();
  renderClientMenuPreview();
  renderClientPromocoesPreview();
  setAllClientSectionsExpanded(false);
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
  const funcionamento24Horas = Boolean($("clientOpen24Hours")?.checked);
  const horarioTexto = funcionamento24Horas ? "24 horas" : (shouldSaveSchedule ? scheduleToText(horarios) : $("clientHours").value.trim());
  const contatosDetalhados = [
    { numero: $("clientContact").value.trim(), referencia: $("clientContactReference")?.value.trim() || "", whatsapp: Boolean($("clientContactIsWhatsapp")?.checked) },
    { numero: $("clientWhatsapp").value.trim(), referencia: $("clientWhatsappReference")?.value.trim() || "", whatsapp: Boolean($("clientWhatsappIsWhatsapp")?.checked) },
    { numero: $("clientContact3")?.value.trim() || "", referencia: $("clientContact3Reference")?.value.trim() || "", whatsapp: Boolean($("clientContact3IsWhatsapp")?.checked) }
  ].filter((item) => item.numero);
  const contatos = contatosDetalhados.map((item) => item.numero);
  const whatsappPrincipal = contatosDetalhados.find((item) => item.whatsapp)?.numero || "";
  const pagamentoStatus = isBillableClientType(tipoCliente)
    ? $("clientPaymentStatus").value
    : "isento";
  return {
    id,
    nome: name,
    nomeNormalizado: normalizeName(name),
    categoria: category,
    categoriaId: slugify(category),
    tipoCliente,
    tipo: tipoCliente,
    status: $("clientStatus").value,
    pagamentoStatus,
    contatosDetalhados,
    contatos,
    contato: contatos[0] || "",
    whatsapp: whatsappPrincipal,
    contato2: contatos[1] || "",
    contato3: contatos[2] || "",
    creci: $("clientCreci")?.value.trim() || "",
    endereco: $("clientAddress").value.trim(),
    funcionamento24Horas,
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
  if (key.includes("grupo")) return isNew ? "Novo grupo de WhatsApp criado" : "Grupo de WhatsApp atualizado";
  return isNew ? "Cadastro novo" : "Cadastro atualizado";
}

function novidadeTopicFromPayload(payload = {}) {
  if (payload.novidadeTema && NOVIDADES_TOPICS[payload.novidadeTema]) return payload.novidadeTema;
  const tipo = normalizeName(payload.destinoTipo || payload.tipo || "");
  const acao = normalizeName(`${payload.acao || ""} ${payload.titulo || ""}`);
  if (acao.includes("preco")) return "preco";
  if (tipo.includes("promoc")) return "promocao";
  if (tipo.includes("imovel")) return "imovel";
  if (tipo.includes("veiculo") || tipo.includes("automovel")) return "automovel";
  if (tipo.includes("vaga")) return "vaga";
  if (tipo.includes("evento")) return "evento";
  if (tipo.includes("grupo") || tipo.includes("whatsapp")) return "grupoWhatsapp";
  if (tipo.includes("noticia")) return "noticia";
  if (tipo.includes("endereco")) return "endereco";
  if (tipo.includes("telefone") || tipo.includes("contato")) return "telefone";
  if (tipo.includes("horario")) return "horario";
  if (tipo.includes("imagem") || acao.includes("foto")) return "imagens";
  if (tipo.includes("cardapio")) return "cardapio";
  if (tipo.includes("rede")) return "redesSociais";
  if (tipo.includes("destaque")) return "destaque";
  if (tipo.includes("categoria")) return "categoria";
  return "novoCliente";
}

function novidadeTopicEnabled(topic) {
  const value = state.novidadesConfig?.temas?.[topic];
  return value !== false;
}

function renderNovidadesConfig() {
  const box = $("novidadesConfigOptions");
  if (!box) return;
  box.innerHTML = Object.entries(NOVIDADES_TOPICS).map(([key, [label, description]]) => `
    <label class="novidades-config-option">
      <input type="checkbox" value="${escapeAttr(key)}" ${novidadeTopicEnabled(key) ? "checked" : ""}>
      <span><strong>${escapeHtml(label)}</strong><small>${escapeHtml(description)}</small></span>
    </label>
  `).join("");
}

function renderXadrezConfig() {
  if (!$("xadrezConfigForm")) return;
  const config = state.xadrezConfig || {};
  $("xadrezConfigActive").checked = config.ativo !== false;
  $("xadrezConfigName").value = config.campeonatoNome || "";
  $("xadrezConfigPrize").value = config.premio || "";
}

async function registrarNovidadeAdmin(payload = {}) {
  try {
    const actionText = normalizeName(`${payload.acao || ""} ${payload.titulo || ""} ${payload.descricao || ""}`);
    if (/(removid|excluid|desativad|retirad|ocultad|cancelad|encerrad|apagado)/.test(actionText)) return;
    const novidadeTema = novidadeTopicFromPayload(payload);
    if (!novidadeTopicEnabled(novidadeTema)) return;
    const tipo = payload.tipo || payload.destinoTipo || "estabelecimento";
    const destinoId = payload.destinoId || payload.itemId || payload.estabelecimentoId || payload.clienteId || "";
    const itemId = payload.itemId || payload.destinoCardId || "";
    await removerNovidadesPorDestino(tipo, destinoId, itemId);
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
      itemId,
      destinoCardId: payload.destinoCardId || "",
      link: payload.link || payload.url || "",
      novidadeTema,
      dataCriacao: serverTimestamp(),
      criadoPor: state.user?.uid || "",
      origem: "painel"
    });
  } catch (error) {
    console.warn("Nao foi possivel registrar novidade.", error);
  }
}

async function registrarAtualizacoesClienteNovidade(clientId, payload = {}, original = null) {
  const effective = { ...(original || {}), ...payload };
  const profileImage = String(
    effective.imagem
    || effective.profileImage
    || effective.imagemPerfil
    || effective.perfil
    || effective.logo
    || ""
  ).trim();
  const showcaseImages = normalizeImageItems(effective.imagens)
    .map((item) => item.url)
    .filter(Boolean);
  const noveltyImages = [...new Set([profileImage, ...showcaseImages].filter(Boolean))];
  const base = {
    estabelecimento: effective.nome || clientId,
    tituloConteudo: effective.nome || clientId,
    imagem: profileImage,
    imagens: noveltyImages,
    categoria: effective.categoria || "",
    destinoTipo: "estabelecimento",
    destinoId: effective.nomeNormalizado || normalizeName(effective.nome || clientId)
  };
  if (!original) {
    await registrarNovidadeAdmin({ ...base, tipo: "estabelecimento", novidadeTema: "novoCliente", itemId: "novoCliente", titulo: "Cadastro novo", acao: "Cadastro novo", descricao: "Cadastro novo" });
    return;
  }

  const updates = [];
  const removals = [];
  const add = (tema, tipo, acao) => updates.push({ ...base, tipo, destinoTipo: tipo, novidadeTema: tema, itemId: tema, titulo: acao, acao, descricao: acao });
  const remove = (tipo, tema) => removals.push(removerNovidadesPorDestino(tipo, base.destinoId, tema));
  if (String(original.nome || "") !== String(effective.nome || "")) add("nomeCliente", "cliente-nome", "Nome do cliente atualizado");
  if (String(original.endereco || "") !== String(effective.endereco || "")) {
    if (String(effective.endereco || "").trim()) add("endereco", "cliente-endereco", "Endereço atualizado");
    else remove("cliente-endereco", "endereco");
  }
  const contactFingerprint = (client) => JSON.stringify(normalizeClientContactDetails(client).map((item) => ({
    numero: String(item.numero || "").replace(/\D/g, ""),
    referencia: String(item.referencia || "").trim(),
    whatsapp: Boolean(item.whatsapp)
  })));
  const oldPhones = contactFingerprint(original);
  const newPhones = contactFingerprint(effective);
  if (oldPhones !== newPhones) {
    if (normalizeClientContactDetails(effective).length) add("telefone", "cliente-telefone", "Telefone atualizado");
    else remove("cliente-telefone", "telefone");
  }
  const scheduleFingerprint = (client) => {
    const horarios = normalizeSchedule(client.horarios || {});
    const hasStructuredSchedule = scheduleHasAnyOpen(horarios);
    return JSON.stringify({
      funcionamento24Horas: Boolean(client.funcionamento24Horas),
      horarios: hasStructuredSchedule ? horarios : null,
      horario: hasStructuredSchedule ? "" : String(client.horario || "").replace(/\s+/g, " ").trim()
    });
  };
  const oldHours = scheduleFingerprint(original);
  const newHours = scheduleFingerprint(effective);
  if (oldHours !== newHours) {
    const hasHours = Boolean(effective.funcionamento24Horas || String(effective.horario || "").trim() || scheduleHasAnyOpen(normalizeSchedule(effective.horarios || {})));
    if (hasHours) add("horario", "cliente-horario", "Horário de atendimento atualizado");
    else remove("cliente-horario", "horario");
  }
  if (normalizeImageItems(effective.imagens).length > normalizeImageItems(original.imagens).length) add("imagens", "cliente-imagens", "Novas fotos adicionadas");
  if (String(original.categoria || "") !== String(effective.categoria || "")) add("categoria", "cliente-categoria", "Categoria atualizada");
  const oldSocial = JSON.stringify([original.instagram, original.facebook, original.tiktok, original.site]);
  const newSocial = JSON.stringify([effective.instagram, effective.facebook, effective.tiktok, effective.site]);
  if (oldSocial !== newSocial) {
    if ([effective.instagram, effective.facebook, effective.tiktok, effective.site].some((value) => String(value || "").trim())) add("redesSociais", "cliente-redes", "Redes sociais atualizadas");
    else remove("cliente-redes", "redesSociais");
  }
  const oldMenu = JSON.stringify([original.cardapioAtivo, original.cardapioLink, original.menuImages]);
  const newMenu = JSON.stringify([effective.cardapioAtivo, effective.cardapioLink, effective.menuImages]);
  if (oldMenu !== newMenu) {
    if (effective.cardapioAtivo || String(effective.cardapioLink || "").trim() || normalizeUrlList(effective.menuImages).length) add("cardapio", "cliente-cardapio", "Cardápio atualizado");
    else remove("cliente-cardapio", "cardapio");
  }
  if (Boolean(original.destaqueSemanal) !== Boolean(effective.destaqueSemanal) || String(original.destaqueFim || "") !== String(effective.destaqueFim || "")) {
    if (effective.destaqueSemanal) add("destaque", "cliente-destaque", "Destaque comercial atualizado");
    else remove("cliente-destaque", "destaque");
  }
  await Promise.all([...removals, ...updates.map(registrarNovidadeAdmin)]);
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
  $("clientPaymentStatus").value = isBillableClientType(client)
    ? (client.pagamentoStatus || "em_aberto")
    : "isento";
  syncClientPaymentByType();
  const contatos = normalizeClientContactDetails(client);
  $("clientContact").value = contatos[0]?.numero || "";
  $("clientWhatsapp").value = contatos[1]?.numero || "";
  if ($("clientContact3")) $("clientContact3").value = contatos[2]?.numero || "";
  if ($("clientContactReference")) $("clientContactReference").value = contatos[0]?.referencia || "";
  if ($("clientWhatsappReference")) $("clientWhatsappReference").value = contatos[1]?.referencia || "";
  if ($("clientContact3Reference")) $("clientContact3Reference").value = contatos[2]?.referencia || "";
  if ($("clientContactIsWhatsapp")) $("clientContactIsWhatsapp").checked = Boolean(contatos[0]?.whatsapp);
  if ($("clientWhatsappIsWhatsapp")) $("clientWhatsappIsWhatsapp").checked = Boolean(contatos[1]?.whatsapp);
  if ($("clientContact3IsWhatsapp")) $("clientContact3IsWhatsapp").checked = Boolean(contatos[2]?.whatsapp);
  setAllClientSectionsExpanded(false);
  $("clientAddress").value = client.endereco || client.address || "";
  $("clientHours").value = client.horario || client.hours || "";
  if ($("clientOpen24Hours")) $("clientOpen24Hours").checked = Boolean(client.funcionamento24Horas);
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
  toggleSchedule24Hours("clientScheduleEditor", Boolean(client.funcionamento24Horas));
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
  const { publicPayload: publicClientData } = splitClientFinancePayload(clientData);
  const payload = cleanForFirebase({
    ...publicClientData,
    cardapioAtivo: Boolean($("clientMenuEnabled")?.checked || clientData.cardapioAtivo),
    cardapioLink: $("clientMenuLink").value.trim(),
    menuImages: normalizeUrlList(state.clientMenuImages),
    origem: "painel",
    editadoNoPainel: true,
    updatedAt: serverTimestamp(),
    updatedBy: state.user?.uid || ""
  });
  const updates = { [`clientes/${targetId}`]: payload };
  if (oldId && oldId !== targetId) {
    updates[`clientes/${oldId}`] = null;
    if (state.clientesFinanceiro[oldId]) updates[`clientesFinanceiro/${targetId}`] = state.clientesFinanceiro[oldId];
    updates[`clientesFinanceiro/${oldId}`] = null;
  }
  await update(ref(db), updates);
  if (oldId && oldId !== targetId) {
    state.clientes = state.clientes.filter((item) => item.id !== oldId);
    if (state.clientesFinanceiro[oldId]) {
      state.clientesFinanceiro[targetId] = state.clientesFinanceiro[oldId];
      delete state.clientesFinanceiro[oldId];
    }
  }
  upsertClientInState(targetId, mergeClientFinanceData({ id: targetId, ...payload }, state.clientesFinanceiro[targetId]));
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
  const { publicPayload: publicClientData } = splitClientFinancePayload(clientData);
  const payload = cleanForFirebase({
    ...publicClientData,
    imagem: url,
    origem: "painel",
    editadoNoPainel: true,
    imagemAtualizadaEm: Date.now(),
    updatedAt: serverTimestamp(),
    updatedBy: state.user?.uid || ""
  });
  const updates = { [`clientes/${targetId}`]: payload };
  if (oldId && oldId !== targetId) {
    updates[`clientes/${oldId}`] = null;
    if (state.clientesFinanceiro[oldId]) updates[`clientesFinanceiro/${targetId}`] = state.clientesFinanceiro[oldId];
    updates[`clientesFinanceiro/${oldId}`] = null;
  }
  state.usuarios.filter((user) => user.clienteId === oldId && oldId !== targetId).forEach((user) => {
    updates[`usuariosByUid/${user.uid}/clienteId`] = targetId;
  });
  if (state.profile?.clienteId === oldId && oldId !== targetId) {
    updates[`usuariosByUid/${state.user.uid}/clienteId`] = targetId;
  }
  await update(ref(db), updates);
  state.clientes = state.clientes.filter((item) => item.id !== oldId || oldId === targetId);
  if (oldId && oldId !== targetId && state.clientesFinanceiro[oldId]) {
    state.clientesFinanceiro[targetId] = state.clientesFinanceiro[oldId];
    delete state.clientesFinanceiro[oldId];
  }
  upsertClientInState(targetId, mergeClientFinanceData({ id: targetId, ...payload }, state.clientesFinanceiro[targetId]));
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
  return uploadPrivateFileWithProgress(fileRef, file, "Enviando comprovante", file.name || "comprovante");
}

function invoiceHasReceipt(invoice = {}) {
  if (!invoice || typeof invoice !== "object") return false;
  return Boolean(invoice.comprovantePath || invoice.comprovanteUrl);
}

function invoiceReceiptButton(invoice = {}) {
  if (!invoiceHasReceipt(invoice)) return "";
  const safeInvoice = invoice || {};
  return `<button type="button" class="ghost-mini" data-open-receipt-path="${escapeAttr(safeInvoice.comprovantePath || "")}" data-open-receipt-url="${escapeAttr(safeInvoice.comprovanteUrl || "")}" data-open-receipt-name="${escapeAttr(safeInvoice.comprovanteNome || "comprovante")}">Ver comprovante</button>`;
}

async function openInvoiceReceipt(path, legacyUrl = "", fileName = "comprovante") {
  if (path) {
    try {
      showToast("Carregando comprovante...");
      const blob = await getBlob(storageRef(storage, path));
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.download = fileName || "comprovante";
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
      return;
    } catch (error) {
      console.error(error);
      if (!legacyUrl) {
        showToast("Nao foi possivel abrir o comprovante.");
        return;
      }
    }
  }

  if (legacyUrl) {
    window.open(legacyUrl, "_blank", "noopener,noreferrer");
  }
}

function bindInvoiceReceiptButtons(scope = document) {
  scope.querySelectorAll("[data-open-receipt-path], [data-open-receipt-url]").forEach((button) => {
    button.addEventListener("click", () => {
      openInvoiceReceipt(
        button.dataset.openReceiptPath || "",
        button.dataset.openReceiptUrl || "",
        button.dataset.openReceiptName || "comprovante"
      );
    });
  });
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

async function migrateClientFinanceToPrivate() {
  const button = $("migrateFinanceButton");
  if (!isMaster()) {
    showToast("Somente master pode migrar dados financeiros.");
    return;
  }
  if (!confirm("Copiar dados financeiros antigos de clientes para clientesFinanceiro? Nada sera apagado de clientes.")) return;

  setBusy(button, true, "Migrando...");
  const stats = { analisados: 0, comFinanceiro: 0, migrados: 0, preservados: 0, erros: [] };

  try {
    const [clientesSnap, financeiroSnap] = await Promise.all([
      get(ref(db, "clientes")),
      getPanelSnapshot("clientesFinanceiro")
    ]);
    const privateByClientId = clientFinanceMapFromSnapshot(financeiroSnap);
    const updates = {};

    if (clientesSnap.exists()) {
      clientesSnap.forEach((child) => {
        stats.analisados += 1;
        const clientId = child.key;
        const client = child.val() || {};
        const legacyFinance = pickClientFinanceFields(client);
        const legacyKeys = Object.keys(legacyFinance);
        if (!legacyKeys.length) return false;

        stats.comFinanceiro += 1;
        const existingFinance = privateByClientId[clientId] || {};
        const merged = cleanForFirebase({
          ...legacyFinance,
          ...existingFinance,
          migratedFromClientesAt: existingFinance.migratedFromClientesAt || Date.now(),
          migratedFromClientesBy: existingFinance.migratedFromClientesBy || state.user?.uid || "",
          updatedAt: existingFinance.updatedAt || serverTimestamp(),
          updatedBy: existingFinance.updatedBy || state.user?.uid || "",
          origem: existingFinance.origem || "migracao-clientes"
        });

        const changed = legacyKeys.some((field) => !Object.prototype.hasOwnProperty.call(existingFinance, field));
        if (changed || !Object.keys(existingFinance).length) {
          updates[`clientesFinanceiro/${clientId}`] = merged;
          stats.migrados += 1;
        } else {
          stats.preservados += 1;
        }
        return false;
      });
    }

    const entries = Object.entries(updates);
    const chunkSize = 50;
    for (let i = 0; i < entries.length; i += chunkSize) {
      const chunk = Object.fromEntries(entries.slice(i, i + chunkSize));
      try {
        await update(ref(db), chunk);
      } catch (error) {
        stats.erros.push(error.code || error.message || String(error));
      }
      showImportReport([
        `Migracao financeira em andamento: ${Math.min(i + chunkSize, entries.length)}/${entries.length}`,
        `Clientes analisados: ${stats.analisados}`,
        `Clientes com financeiro antigo: ${stats.comFinanceiro}`,
        `Erros: ${stats.erros.length}`
      ], stats.erros.length ? "error" : "info");
    }

    showImportReport([
      "Migracao financeira concluida.",
      `Clientes analisados: ${stats.analisados}`,
      `Clientes com dados financeiros antigos: ${stats.comFinanceiro}`,
      `Copiados/atualizados em clientesFinanceiro: ${stats.migrados}`,
      `Ja tinham dados privados preservados: ${stats.preservados}`,
      `Erros: ${stats.erros.length}`,
      ...stats.erros.slice(0, 5)
    ], stats.erros.length ? "error" : "ok");
    showToast("Migracao financeira concluida.");
    await loadAllData();
    renderFinanceiro();
    renderReports();
  } catch (error) {
    console.error(error);
    showImportReport(["Falha na migracao financeira.", error.code || error.message || String(error)], "error");
    showToast("Falha na migracao financeira.");
  } finally {
    setBusy(button, false);
  }
}

async function auditClientFinanceCleanup() {
  const button = $("auditFinanceCleanupButton");
  if (!isMaster()) {
    showToast("Somente master pode auditar a limpeza financeira.");
    return;
  }

  setBusy(button, true, "Auditando...");
  const stats = {
    clientes: 0,
    comCamposPublicos: 0,
    segurosParaLimpar: 0,
    incompletosNoPrivado: 0,
    semFinanceiroPrivado: 0
  };
  const fieldCounts = {};
  CLIENT_FINANCE_FIELDS.forEach((field) => { fieldCounts[field] = 0; });
  const examples = [];

  try {
    const [clientesSnap, financeiroSnap] = await Promise.all([
      get(ref(db, "clientes")),
      getPanelSnapshot("clientesFinanceiro")
    ]);
    const privateByClientId = clientFinanceMapFromSnapshot(financeiroSnap);

    if (clientesSnap.exists()) {
      clientesSnap.forEach((child) => {
        stats.clientes += 1;
        const clientId = child.key;
        const client = child.val() || {};
        const publicFinance = pickClientFinanceFields(client);
        const publicFields = Object.keys(publicFinance);
        if (!publicFields.length) return false;

        stats.comCamposPublicos += 1;
        publicFields.forEach((field) => { fieldCounts[field] += 1; });

        const privateFinance = privateByClientId[clientId] || {};
        if (!Object.keys(privateFinance).length) {
          stats.semFinanceiroPrivado += 1;
          if (examples.length < 8) examples.push(`${client.nome || clientId}: sem clientesFinanceiro`);
          return false;
        }

        const missing = publicFields.filter((field) => !Object.prototype.hasOwnProperty.call(privateFinance, field));
        if (missing.length) {
          stats.incompletosNoPrivado += 1;
          if (examples.length < 8) examples.push(`${client.nome || clientId}: faltando ${missing.join(", ")}`);
        } else {
          stats.segurosParaLimpar += 1;
        }
        return false;
      });
    }

    const fieldLines = Object.entries(fieldCounts)
      .filter(([, count]) => count > 0)
      .map(([field, count]) => `${field}: ${count}`);

    showImportReport([
      "Auditoria da limpeza financeira concluida. Nenhum dado foi apagado.",
      `Clientes analisados: ${stats.clientes}`,
      `Clientes ainda com campos financeiros em clientes: ${stats.comCamposPublicos}`,
      `Clientes seguros para limpar depois: ${stats.segurosParaLimpar}`,
      `Clientes com privado incompleto: ${stats.incompletosNoPrivado}`,
      `Clientes sem financeiro privado: ${stats.semFinanceiroPrivado}`,
      fieldLines.length ? `Campos encontrados: ${fieldLines.join(" | ")}` : "Nenhum campo financeiro publico encontrado.",
      ...examples
    ], (stats.incompletosNoPrivado || stats.semFinanceiroPrivado) ? "error" : "ok");
    showToast("Auditoria da limpeza concluida.");
  } catch (error) {
    console.error(error);
    showImportReport(["Falha na auditoria da limpeza financeira.", error.code || error.message || String(error)], "error");
    showToast("Falha na auditoria da limpeza.");
  } finally {
    setBusy(button, false);
  }
}

async function cleanupPublicClientFinanceFields() {
  const button = $("cleanupFinanceButton");
  if (!isMaster()) {
    showToast("Somente master pode limpar campos financeiros publicos.");
    return;
  }

  const confirmation = prompt("Esta acao remove campos financeiros antigos de clientes. Digite LIMPAR FINANCEIRO para confirmar.");
  if (confirmation !== "LIMPAR FINANCEIRO") {
    showToast("Limpeza cancelada.");
    return;
  }

  setBusy(button, true, "Limpando...");
  const stats = {
    clientes: 0,
    comCamposPublicos: 0,
    limpos: 0,
    ignorados: 0,
    camposRemovidos: 0,
    erros: []
  };

  try {
    const [clientesSnap, financeiroSnap] = await Promise.all([
      get(ref(db, "clientes")),
      getPanelSnapshot("clientesFinanceiro")
    ]);
    const privateByClientId = clientFinanceMapFromSnapshot(financeiroSnap);
    const updates = {};

    if (clientesSnap.exists()) {
      clientesSnap.forEach((child) => {
        stats.clientes += 1;
        const clientId = child.key;
        const client = child.val() || {};
        const publicFinance = pickClientFinanceFields(client);
        const publicFields = Object.keys(publicFinance);
        if (!publicFields.length) return false;

        stats.comCamposPublicos += 1;
        const privateFinance = privateByClientId[clientId] || {};
        const safeToClean = publicFields.every((field) => Object.prototype.hasOwnProperty.call(privateFinance, field));
        if (!safeToClean) {
          stats.ignorados += 1;
          if (stats.erros.length < 8) stats.erros.push(`${client.nome || clientId}: privado incompleto`);
          return false;
        }

        publicFields.forEach((field) => {
          updates[`clientes/${clientId}/${field}`] = null;
          stats.camposRemovidos += 1;
        });
        stats.limpos += 1;
        return false;
      });
    }

    const entries = Object.entries(updates);
    const chunkSize = 100;
    for (let i = 0; i < entries.length; i += chunkSize) {
      const chunk = Object.fromEntries(entries.slice(i, i + chunkSize));
      try {
        await update(ref(db), chunk);
      } catch (error) {
        stats.erros.push(error.code || error.message || String(error));
      }
      showImportReport([
        `Limpeza em andamento: ${Math.min(i + chunkSize, entries.length)}/${entries.length} campos`,
        `Clientes limpos: ${stats.limpos}`,
        `Clientes ignorados: ${stats.ignorados}`,
        `Erros: ${stats.erros.length}`
      ], stats.erros.length ? "error" : "info");
    }

    showImportReport([
      "Limpeza financeira concluida.",
      `Clientes analisados: ${stats.clientes}`,
      `Clientes que tinham campos financeiros publicos: ${stats.comCamposPublicos}`,
      `Clientes limpos: ${stats.limpos}`,
      `Campos removidos de clientes: ${stats.camposRemovidos}`,
      `Clientes ignorados por seguranca: ${stats.ignorados}`,
      `Erros: ${stats.erros.length}`,
      ...stats.erros.slice(0, 8)
    ], stats.erros.length ? "error" : "ok");
    showToast("Limpeza financeira concluida.");
    await loadAllData();
    renderFinanceiro();
    renderReports();
  } catch (error) {
    console.error(error);
    showImportReport(["Falha na limpeza financeira.", error.code || error.message || String(error)], "error");
    showToast("Falha na limpeza financeira.");
  } finally {
    setBusy(button, false);
  }
}

function isClientOverdue(client) {
  if (!client || !isBillableClientType(client) || client.status === "inativo" || client.pagamentoStatus === "pago" || client.pagamentoStatus === "isento") return false;
  const today = new Date();
  const currentMonth = currentMonthKey();
  const hasPreviousPendingInvoice = pendingMonthsForClient(client).some((month) => month && month < currentMonth);
  const dueDay = Number(client.vencimentoDia);
  const hasExpiredDueDay = Number.isFinite(dueDay) && dueDay > 0 && dueDay < today.getDate();
  return hasPreviousPendingInvoice || hasExpiredDueDay;
}

function clientLastUpdate(client = {}) {
  const publicAt = clientUpdatedValue(client);
  const financeAt = clientUpdatedValue({ updatedAt: client.financeiroUpdatedAt });
  const useFinance = financeAt > publicAt;
  return {
    timestamp: useFinance ? financeAt : publicAt,
    uid: useFinance ? client.financeiroUpdatedBy : client.updatedBy
  };
}

function clientUpdateAuthor(client = {}, uid = "") {
  if (!uid) return client.origem === "painel" || client.editadoNoPainel ? "Painel administrativo" : "";
  const user = state.usuarios.find((item) => item.uid === uid);
  const role = String(user?.role || "").toLowerCase();
  if (role === "master") return "Admin Master";
  if (role === "admin") return "Admin Geral";
  if (role === "cliente" || user?.clienteId === client.id) return "Proprio cliente";
  if (uid === state.user?.uid) {
    if (isMaster()) return "Admin Master";
    if (currentRole() === "admin") return "Admin Geral";
    return "Proprio cliente";
  }
  return user?.email || "Usuario do painel";
}

function formatClientLastUpdate(client = {}) {
  const update = clientLastUpdate(client);
  if (!update.timestamp) return "Ultima atualizacao: nao registrada";
  const date = new Date(update.timestamp);
  if (Number.isNaN(date.getTime())) return "Ultima atualizacao: nao registrada";
  const author = clientUpdateAuthor(client, update.uid);
  const formatted = date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
  return `Ultima atualizacao: ${formatted}${author ? ` - ${author}` : ""}`;
}

function sortClientsByUpdate(clients = [], order = "recentes") {
  return [...clients].sort((a, b) => {
    if (order === "alfabetica") {
      return String(a.nome || a.id || "").localeCompare(String(b.nome || b.id || ""), "pt-BR");
    }

    const aTime = clientLastUpdate(a).timestamp;
    const bTime = clientLastUpdate(b).timestamp;
    if (!aTime && !bTime) {
      return String(a.nome || a.id || "").localeCompare(String(b.nome || b.id || ""), "pt-BR");
    }
    if (!aTime) return 1;
    if (!bTime) return -1;
    return order === "antigas" ? aTime - bTime : bTime - aTime;
  });
}

function updateClientFilterCounts() {
  const statusCounts = state.clientes.reduce((total, client) => {
    const status = String(client.status || "pendente").toLowerCase();
    if (Object.prototype.hasOwnProperty.call(total, status)) total[status] += 1;
    return total;
  }, { ativo: 0, pendente: 0, inativo: 0 });

  const statusLabels = {
    todos: "Todos",
    ativo: "Ativo",
    pendente: "Pendente",
    inativo: "Inativo"
  };

  const statusFilter = $("clientStatusFilter");
  Object.entries(statusLabels).forEach(([status, label]) => {
    const option = statusFilter?.querySelector(`option[value="${status}"]`);
    const count = status === "todos" ? state.clientes.length : statusCounts[status];
    if (option) option.textContent = `${label} - ${count}`;
  });

  const typeCounts = state.clientes.reduce((total, client) => {
    const type = String(client.tipoCliente || client.tipo || "comercio").toLowerCase();
    if (Object.prototype.hasOwnProperty.call(total, type)) total[type] += 1;
    return total;
  }, { comercio: 0, servico: 0, institucional: 0, outro: 0 });

  const typeLabels = {
    todos: "Todos",
    comercio: "Comercio",
    servico: "Servico",
    institucional: "Institucional",
    outro: "Outro"
  };

  const typeFilter = $("clientTypeFilter");
  Object.entries(typeLabels).forEach(([type, label]) => {
    const option = typeFilter?.querySelector(`option[value="${type}"]`);
    const count = type === "todos" ? state.clientes.length : typeCounts[type];
    if (option) option.textContent = `${label} - ${count}`;
  });
}

function renderClientsList() {
  const box = $("clientsList");
  if (!box) return;

  updateClientFilterCounts();

  const q = String($("clientSearch")?.value || "").toLowerCase().trim();
  const statusFilter = $("clientStatusFilter")?.value || "todos";
  const dueFilter = $("clientDueFilter")?.value || "todos";
  const typeFilter = $("clientTypeFilter")?.value || "todos";
  const updatedOrder = $("clientUpdatedOrder")?.value || "recentes";
  const filteredClients = state.clientes.filter((client) => {
    const hay = `${client.nome || ""} ${client.categoria || ""} ${client.contato || ""}`.toLowerCase();
    const matchesSearch = !q || hay.includes(q);
    const matchesStatus = statusFilter === "todos" || (client.status || "pendente") === statusFilter;
    const overdue = isClientOverdue(client);
    const matchesDue = dueFilter === "todos" || (dueFilter === "vencidos" ? overdue : !overdue);
    const matchesType = typeFilter === "todos" || (client.tipoCliente || client.tipo || "comercio") === typeFilter;
    return matchesSearch && matchesStatus && matchesDue && matchesType;
  });
  const list = sortClientsByUpdate(filteredClients, updatedOrder);

  if (!list.length) {
    box.innerHTML = `<div class="list-meta">Nenhum cliente encontrado.</div>`;
    return;
  }

  box.innerHTML = list.map((client) => {
    const systemUsers = state.usuarios
      .filter((user) => user.clienteId === client.id)
      .map((user) => user.email || user.uid)
      .filter(Boolean);
    return `
    <article class="client-row">
      <img src="${escapeAttr(displayImageUrl(client.imagem || imageUrl(client.imagens && client.imagens[0])) || "../images/img_padrao_site/logo_1.png")}" alt="${escapeAttr(client.nome || "Cliente")}" ${lazyImageAttrs()} ${imageFallbackAttr()}>
      <div class="client-main">
        <div class="list-title">${escapeHtml(client.nome || client.id)}</div>
        <div class="list-meta">${escapeHtml(client.categoria || "Sem categoria")} - ${escapeHtml(client.contato || "Sem telefone")}</div>
        ${systemUsers.length ? `<div class="list-meta"><i class="fa-solid fa-user"></i> Usuário do sistema: ${systemUsers.map(escapeHtml).join(", ")}</div>` : ""}
        <div class="client-tags">
          <span class="badge ${escapeAttr(client.status || "pendente")}">${statusLabel(client.status)}</span>
          <span class="badge ${escapeAttr(effectivePaymentStatus(client))}">${paymentLabel(effectivePaymentStatus(client))}</span>
          <span class="badge">${Array.isArray(client.imagens) ? client.imagens.length : 0} imagens</span>
        </div>
      </div>
      <div class="client-money">
        <strong>${moneyBR(valorFinalPlano(client))}</strong>
        <span>Venc. dia ${client.vencimentoDia || state.pagamentoSistema?.vencimentoDiaPadrao || "último"}</span>
        <small class="client-last-update">${escapeHtml(formatClientLastUpdate(client))}</small>
      </div>
      <div class="client-actions">
        <button type="button" data-edit-client="${escapeAttr(client.id)}">Editar</button>
        <button type="button" class="danger-mini" data-delete-client-list="${escapeAttr(client.id)}">Excluir</button>
      </div>
    </article>
  `;
  }).join("");

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
  if (["pago", "isento"].includes(effectivePaymentStatus(client))) score += 3;
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
  const query = normalizeName($("userSearch")?.value || "");
  const users = state.usuarios.filter((user) => {
    if (!query) return true;
    const client = state.clientes.find((item) => item.id === user.clienteId);
    return normalizeName([
      client?.nome,
      client?.name,
      client?.nomeNormalizado,
      client?.id,
      user.email,
      user.uid,
      roleLabel(user.role),
      statusLabel(user.status)
    ].filter(Boolean).join(" ")).includes(query);
  });

  if (!users.length) {
    box.innerHTML = `<div class="list-meta">${query ? "Nenhum usuario encontrado para esta pesquisa." : "Nenhum usuario encontrado."}</div>`;
    return;
  }

  box.innerHTML = users.map((user) => {
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
  delete $("userForm").dataset.originalEmail;
  $("editUserUid").value = "";
  $("newUserEmail").readOnly = false;
  $("newUserPassword").required = true;
  $("newUserPassword").placeholder = "Obrigatoria para novo usuario ou troca de e-mail";
  if ($("newUserClientSearch")) $("newUserClientSearch").value = "";
  fillUserClientSelect();
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
  $("userForm").dataset.originalEmail = String(user.email || "").trim().toLowerCase();
  $("newUserEmail").value = user.email || "";
  $("newUserEmail").readOnly = !isMaster();
  $("newUserPassword").value = "";
  $("newUserPassword").required = false;
  $("newUserPassword").placeholder = isMaster() ? "Preencha somente se for trocar o e-mail" : "Nao necessario ao editar";
  $("newUserRole").value = user.role || "cliente";
  const linkedClient = state.clientes.find((client) => client.id === user.clienteId);
  if ($("newUserClientSearch")) $("newUserClientSearch").value = linkedClient?.nome || "";
  fillUserClientSelect(user.clienteId || "");
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
  const currentSelectedId = selectedId || select.value || "";
  const query = normalizeName($("newUserClientSearch")?.value || "");
  const clients = [...state.clientes]
    .sort((a, b) => String(a.nome || a.id || "").localeCompare(String(b.nome || b.id || ""), "pt-BR", { sensitivity: "base" }))
    .filter((client) => {
      if (!query || client.id === currentSelectedId) return true;
      return normalizeName(`${client.nome || ""} ${client.id || ""} ${client.categoria || ""}`).includes(query);
    });
  select.innerHTML = `<option value="">Sem vinculo</option>` + clients.map((client) => (
    `<option value="${escapeAttr(client.id)}" ${client.id === selectedId ? "selected" : ""}>${escapeHtml(client.nome || client.id)}</option>`
  )).join("");
  if (currentSelectedId && clients.some((client) => client.id === currentSelectedId)) {
    select.value = currentSelectedId;
  }
}

function fillEventClientSelect(selectedId = "") {
  const select = $("eventClient");
  if (!select) return;
  const currentSelectedId = selectedId || select.value || "";
  const query = normalizeName($("eventClientSearch")?.value || "");
  const clients = [...state.clientes]
    .sort((a, b) => String(a.nome || a.id || "").localeCompare(String(b.nome || b.id || ""), "pt-BR", { sensitivity: "base" }))
    .filter((client) => {
      if (!query || client.id === currentSelectedId) return true;
      return normalizeName(`${client.nome || ""} ${client.id || ""} ${client.categoria || ""}`).includes(query);
    });
  select.innerHTML = `<option value="">Sem cliente vinculado</option>` + clients.map((client) => (
    `<option value="${escapeAttr(client.id)}" ${client.id === selectedId ? "selected" : ""}>${escapeHtml(client.nome || client.id)}</option>`
  )).join("");
  if (currentSelectedId && clients.some((client) => client.id === currentSelectedId)) {
    select.value = currentSelectedId;
  }
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

function financePlanValue(client, tipoPlano) {
  if (!isBillableClientType(client)) return 0;
  const configuredValue = defaultPlanValue(tipoPlano);
  if (configuredValue > 0) return configuredValue;
  if ((client?.tipoPlano || "mensal") === (tipoPlano || "mensal")) {
    return Number(client?.valorPlano ?? client?.valorMensal ?? 0);
  }
  return 0;
}

function syncFinanceRowPlanValue(row) {
  if (!row) return;
  const client = state.clientes.find((item) => item.id === row.dataset.clientId) || {};
  const planSelect = row.querySelector('[data-finance-field="tipoPlano"]');
  const valueInput = row.querySelector('[data-finance-field="valorPlano"]');
  if (!planSelect || !valueInput) return;
  const value = financePlanValue(client, planSelect.value);
  valueInput.value = moneyBR(value);
  valueInput.dataset.planValue = String(value);
  const summary = row.querySelector("[data-finance-plan-summary]");
  if (summary) {
    const discountInput = row.querySelector('[data-finance-field="descontoValor"]');
    const discount = numberFromMoney(discountInput?.value || 0);
    const finalValue = Math.max(0, value - discount);
    summary.textContent = `Plano: ${planLabel(planSelect.value)} - Valor final: ${moneyBR(finalValue)}`;
  }
}

function clientForInvoicePlan(client, tipoPlano) {
  return {
    ...client,
    tipoPlano: tipoPlano || client?.tipoPlano || "mensal",
    valorPlano: defaultPlanValue(tipoPlano || client?.tipoPlano || "mensal")
  };
}

function valorFinalPlano(client) {
  if (!isBillableClientType(client)) return 0;
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

function destaqueIncludedInInvoiceMonth(client, monthKey = currentMonthKey()) {
  if (!client?.destaqueSemanal || destaqueBillingForClient(client) !== "mensalidade") return false;
  const [year, month] = String(monthKey || currentMonthKey()).split("-").map(Number);
  if (!year || !month) return destaqueIncludedInInvoice(client);
  const monthStart = dateKeyFromDate(new Date(year, month - 1, 1));
  const monthEnd = dateKeyFromDate(new Date(year, month, 0));
  const start = client.destaqueInicio || currentMonthKey() + "-01";
  const end = destaqueEndDateForClient(client) || start;
  return start <= monthEnd && end >= monthStart;
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
  if (!isBillableClientType(client)) return 0;
  return valorFinalPlano(client) + (destaqueIncludedInInvoice(client) ? destaqueValueForClient(client) : 0);
}

function effectivePaymentStatus(client) {
  if (!isBillableClientType(client)) return "isento";
  return client?.pagamentoStatus || "em_aberto";
}

function financePaymentStatusForMonth(client, monthKey = currentMonthKey()) {
  if (!isBillableClientType(client)) return "isento";
  const invoiceStatus = client?.faturas?.[monthKey]?.status;
  if (invoiceStatus === "pago") return "pago";
  if (["em_aberto", "em_analise"].includes(invoiceStatus)) return "em_aberto";
  if (Array.isArray(client?.mesesEmAberto) && client.mesesEmAberto.includes(monthKey)) return "em_aberto";
  return effectivePaymentStatus(client);
}

function financeInvoiceValueForMonth(client, monthKey = currentMonthKey()) {
  const savedValue = Number(client?.faturas?.[monthKey]?.valorTotal || 0);
  return savedValue > 0 ? savedValue : valorTotalFaturaCliente(client);
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
  const clientDay = Number(client?.vencimentoDia);
  const defaultDay = Number(state.pagamentoSistema?.vencimentoDiaPadrao);
  const configuredDay = Number.isFinite(clientDay) && clientDay >= 1 && clientDay <= 31
    ? clientDay
    : defaultDay;
  const dueDay = Number.isFinite(configuredDay) && configuredDay >= 1
    ? Math.min(configuredDay, lastDay)
    : lastDay;
  return dateKeyFromDate(new Date(year, month - 1, dueDay));
}

function normalizeDueDay(value) {
  if (String(value || "").trim() === "") return "";
  const day = Number(value);
  return Number.isFinite(day) ? String(Math.max(1, Math.min(31, Math.round(day)))) : "";
}

function clientHasOpenInvoice(client) {
  if (!client || !isBillableClientType(client) || canManageClients()) return false;
  if (client.status === "inativo" || effectivePaymentStatus(client) !== "em_aberto") return false;
  return pendingMonthsForClient(client).length > 0;
}

function pendingMonthsForClient(client) {
  if (!isBillableClientType(client)) return [];
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
  const valorDestaque = savedDestaque > 0 ? savedDestaque : (destaqueIncludedInInvoiceMonth(client, mes) ? destaqueValueForClient(client) : 0);
  const valorTotal = Number(totalOverride ?? (savedTotal > 0 ? savedTotal : valorPlano + valorDestaque));
  const planDueDate = ["anual", "semestral"].includes(client?.tipoPlano) ? financePlanDueDate(client) : "";
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
    dueDate: saved.vencimento || saved.dataVencimento || options.dueDateOverride || planDueDate || invoiceDueDateForMonth(client, mes),
    valorPlano,
    valorDestaque,
    valorTotal,
    pixCode,
    qrUrl: qrCodeUrl(pixCode)
  };
}

function monthKeyOffset(monthKey = currentMonthKey(), offset = 0) {
  const [year, month] = String(monthKey || currentMonthKey()).split("-").map(Number);
  const date = new Date(year || new Date().getFullYear(), (month || 1) - 1 + offset, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function dateKeyOffsetMonths(dateKey = "", offset = 0) {
  const match = String(dateKey || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return "";
  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1 + offset;
  const day = Number(match[3]);
  const target = new Date(year, monthIndex, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  return dateKeyFromDate(new Date(target.getFullYear(), target.getMonth(), Math.min(day, lastDay)));
}

function buildInvoiceBatch(client, quantity = 1, startMonth = currentMonthKey(), options = {}) {
  const total = Math.max(1, Math.min(12, Number(quantity) || 1));
  const paymentConfig = state.pagamentoSistema || {};
  const planDueDate = financePlanDueDate(client);
  const recurrenceMonths = client?.tipoPlano === "anual" ? 12 : (client?.tipoPlano === "semestral" ? 6 : 0);
  return Array.from({ length: total }, (_, index) => {
    const dueDateOverride = recurrenceMonths && planDueDate
      ? dateKeyOffsetMonths(planDueDate, index * recurrenceMonths)
      : "";
    const month = dueDateOverride ? dueDateOverride.slice(0, 7) : monthKeyOffset(startMonth, index);
    return buildClientInvoice(client, month, paymentConfig, null, { ...options, dueDateOverride });
  });
}

function boletoLogoUrl(paymentConfig = {}) {
  return displayImageUrl(paymentConfig.logoBoleto || paymentConfig.boletoLogo || "")
    || new URL("../images/img_padrao_site/logo_1.png", window.location.href).href;
}

function printableBoletoHtml(client, invoice, paymentConfig = {}) {
  const contact = client.whatsapp || client.contato || client.telefone || "Não informado";
  const olaPhone = formatPhoneMask(paymentConfig.whatsappCobranca || "43991766639") || "Não informado";
  return `
    <article class="boleto">
      <header>
        <img src="${escapeAttr(boletoLogoUrl(paymentConfig))}" alt="Logo">
        <div>
          <strong>Olá Carlópolis</strong>
          <span>Boleto de pagamento via Pix</span>
        </div>
        <b>${escapeHtml(moneyBR(invoice.valorTotal))}</b>
      </header>
      <div class="boleto-body">
        <section class="boleto-details">
          <div><span>Cliente</span><strong>${escapeHtml(client.nome || client.id || "Cliente")}</strong></div>
          <div><span>Contato</span><strong>${escapeHtml(contact)}</strong></div>
          <div><span>Competência</span><strong>${escapeHtml(monthLabel(invoice.mes))}</strong></div>
          <div><span>Vencimento</span><strong>${escapeHtml(formatDateBR(invoice.dueDate))}</strong></div>
          <div><span>Plano</span><strong>${escapeHtml(planLabel(client.tipoPlano || "mensal"))}</strong></div>
          <div><span>Recebedor</span><strong>${escapeHtml(paymentConfig.pixNome || "Ola Carlopolis")}</strong></div>
          <div><span>Telefone Olá Carlópolis</span><strong>${escapeHtml(olaPhone)}</strong></div>
          <div><span>Mensalidade</span><strong>${escapeHtml(moneyBR(invoice.valorPlano))}</strong></div>
          ${invoice.valorDestaque > 0 ? `<div class="destaque-value"><span>Adicional de destaque</span><strong>${escapeHtml(moneyBR(invoice.valorDestaque))}</strong></div>` : ""}
          <div class="wide"><span>Chave Pix</span><strong>${escapeHtml(paymentConfig.pixChave || "Não configurada")}</strong></div>
          ${invoice.valorDestaque > 0 ? `<div class="wide destaque-description"><span>Descrição do adicional</span><strong>Destaque comercial contratado durante ${escapeHtml(monthLabel(invoice.mes))}, somado ao valor da mensalidade.</strong></div>` : ""}
          ${paymentConfig.observacaoFatura ? `<div class="wide note"><span>Observação</span><strong>${escapeHtml(paymentConfig.observacaoFatura)}</strong></div>` : ""}
        </section>
        <section class="boleto-qr">
          <img src="${escapeAttr(qrCodeUrl(invoice.pixCode))}" alt="QR Code Pix">
          <span>Escaneie para pagar</span>
        </section>
      </div>
      <footer>
        ${paymentConfig.mensagemRodapeBoleto ? `<strong>${escapeHtml(paymentConfig.mensagemRodapeBoleto)}</strong>` : ""}
        <div><span>Documento gerado em ${escapeHtml(new Date().toLocaleDateString("pt-BR"))}</span><span>${escapeHtml(paymentConfig.pixCidade || "CARLOPOLIS")}</span></div>
      </footer>
    </article>
  `;
}

function showBoletoOpenFallback(url, fileName = "boletos.html") {
  document.querySelector(".boleto-open-fallback")?.remove();
  const box = document.createElement("div");
  box.className = "boleto-open-fallback";
  box.innerHTML = `
    <div class="boleto-open-card">
      <strong>Boleto gerado</strong>
      <p>Se o celular bloqueou a abertura automática, toque abaixo para abrir ou baixar o boleto.</p>
      <div>
        <a href="${escapeAttr(url)}" target="_blank" rel="noopener">Abrir boleto</a>
        <a href="${escapeAttr(url)}" download="${escapeAttr(fileName)}">Baixar arquivo</a>
        <button type="button">Fechar</button>
      </div>
    </div>
  `;
  box.querySelector("button")?.addEventListener("click", () => box.remove());
  document.body.appendChild(box);
}

function openPrintableBoletos(client, invoices = []) {
  const paymentConfig = state.pagamentoSistema || {};
  if (!paymentConfig.pixChave) {
    showToast("Configure a chave Pix na tela de Pagamento antes de gerar boletos.");
    return;
  }
  const validInvoices = invoices.filter((invoice) => invoice?.pixCode && invoice.valorTotal > 0);
  if (!validInvoices.length) {
    showToast("Nenhum boleto válido para gerar.");
    return;
  }

  const sheets = [];
  for (let index = 0; index < validInvoices.length; index += 3) {
    sheets.push(`<main class="sheet">${validInvoices.slice(index, index + 3).map((invoice) => printableBoletoHtml(client, invoice, paymentConfig)).join("")}</main>`);
  }

  const html = `<!DOCTYPE html>
  <html lang="pt-BR">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Boletos - ${escapeHtml(client.nome || client.id || "Cliente")}</title>
    <style>
      *{box-sizing:border-box} body{margin:0;background:#e5e7eb;color:#172033;font-family:Arial,sans-serif}
      .print-actions{position:sticky;top:0;z-index:5;display:flex;justify-content:center;gap:10px;padding:10px;background:#172033}
      .print-actions button{border:0;border-radius:8px;padding:10px 18px;background:#2563eb;color:#fff;font-weight:700;cursor:pointer}
      .sheet{position:relative;width:210mm;min-height:297mm;margin:12px auto;padding:7mm 7mm 7mm 24mm;display:grid;grid-template-rows:repeat(3,minmax(0,1fr));gap:0;background:#fff;box-shadow:0 8px 25px #0002;page-break-after:always}
      .sheet:before{content:"ÁREA PARA GRAMPEAR";position:absolute;left:5mm;top:50%;width:14mm;color:#94a3b8;font-size:8px;font-weight:700;letter-spacing:.5px;text-align:center;transform:translateY(-50%) rotate(-90deg);white-space:nowrap}
      .sheet:after{content:"";position:absolute;left:18mm;top:7mm;bottom:7mm;border-left:1.5px dashed #94a3b8}
      .sheet:last-child{page-break-after:auto}
      .boleto{position:relative;min-height:0;overflow:visible;border:1.5px solid #334155;border-radius:8px;display:grid;grid-template-rows:auto 1fr auto;background:#fff}
      .boleto:not(:last-child){margin-bottom:5mm}
      .boleto:not(:last-child):after{content:"✂  CORTE AQUI";position:absolute;left:-6mm;right:-1mm;bottom:-3mm;border-bottom:1.5px dashed #64748b;color:#64748b;font-size:8px;font-weight:700;line-height:1;text-align:center}
      .boleto header{display:grid;grid-template-columns:64px 1fr auto;gap:12px;align-items:center;padding:9px 12px;border-bottom:1px solid #cbd5e1;background:#f8fafc}
      .boleto header img{width:64px;height:48px;object-fit:contain}.boleto header strong{display:block;font-size:18px}.boleto header span{font-size:13px;color:#64748b}.boleto header b{font-size:22px;color:#0f766e}
      .boleto-body{display:grid;grid-template-columns:1fr 112px;gap:10px;padding:9px 12px}
      .boleto-details{display:grid;grid-template-columns:repeat(3,1fr);gap:6px 10px;align-content:start}.boleto-details div{min-width:0}.boleto-details .wide{grid-column:1/-1}.boleto-details span{display:block;font-size:10px;text-transform:uppercase;color:#64748b;font-weight:700}.boleto-details strong{display:block;font-size:13px;line-height:1.2;overflow-wrap:anywhere}.boleto-details .note strong,.boleto-details .destaque-description strong{font-size:11px;font-weight:600}.boleto-details .destaque-value strong{color:#b45309}
      .boleto-qr{display:grid;justify-items:center;align-content:center;border-left:1px dashed #94a3b8;padding-left:10px}.boleto-qr img{width:104px;height:104px}.boleto-qr span{font-size:11px;font-weight:700;margin-top:3px}
      .boleto footer{display:grid;gap:3px;padding:6px 12px;border-top:1px solid #e2e8f0;color:#64748b;font-size:10px}.boleto footer>strong{color:#334155;font-size:11px;text-align:center}.boleto footer>div{display:flex;justify-content:space-between}
      @page{size:A4 portrait;margin:0}
      @media print{body{background:#fff}.print-actions{display:none}.sheet{margin:0;box-shadow:none;width:210mm;height:297mm;min-height:297mm}}
    </style>
  </head>
  <body>
    <div class="print-actions"><button onclick="window.print()">Imprimir / Salvar em PDF</button><button onclick="window.close()">Fechar</button></div>
    ${sheets.join("")}
  </body>
  </html>`;

  const fileName = `boletos-${slugify(client.nome || client.id || "cliente")}-${Date.now()}.html`;
  const isMobileBoleto = window.matchMedia?.("(max-width: 768px)")?.matches
    || /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || "");
  if (isMobileBoleto) {
    const mobileBlob = new Blob([html], { type: "text/html;charset=utf-8" });
    const mobileUrl = URL.createObjectURL(mobileBlob);
    showBoletoOpenFallback(mobileUrl, fileName);
    showToast("Boleto gerado. Toque em Abrir boleto ou Baixar arquivo.");
    return;
  }

  const printWindow = window.open("", "_blank", "width=1000,height=850");

  try {
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    return;
  } catch (error) {
    try { printWindow.close(); } catch (e) { }
  }

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const opened = window.open(url, "_blank", "noopener,noreferrer");
  if (opened) {
    try { opened.focus(); } catch (e) { }
    setTimeout(() => URL.revokeObjectURL(url), 120000);
    return;
  }
  showBoletoOpenFallback(url, fileName);
  showToast("Boleto gerado. Toque em Abrir boleto para visualizar no celular.");
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
  if ($("eventClientSearch")) $("eventClientSearch").value = "";
  fillEventClientSelect();
  $("deleteEventButton").classList.add("hidden");
  setFormCardOpen("eventForm", false);
}

function fillEventForm(evento) {
  state.selectedEventId = evento.id;
  $("eventId").value = evento.id || "";
  $("eventTitle").value = evento.titulo || "";
  const linkedClient = state.clientes.find((client) => client.id === evento.clienteId);
  if ($("eventClientSearch")) $("eventClientSearch").value = linkedClient?.nome || "";
  fillEventClientSelect(evento.clienteId || "");
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
  atualizarCamposTipoAutomovel();
  $("deleteAutomovelButton")?.classList.add("hidden");
  renderAutomovelImagesPreview();
  setFormCardOpen("automovelForm", false);
}

function preencherDadosEstabelecimentoAutomovelNovo() {
  const linkedClient = currentClientRecord();
  if (!linkedClient) return;
  const telefone = linkedClient.whatsapp || linkedClient.contato || linkedClient.telefone || "";
  if ($("automovelContato")) $("automovelContato").value = telefone;
  if ($("automovelVendedor")) $("automovelVendedor").value = linkedClient.nome || "";
  if ($("automovelInstagram")) $("automovelInstagram").value = linkedClient.instagram || "";
  if ($("automovelCidade") && linkedClient.cidade) $("automovelCidade").value = linkedClient.cidade;
}

function toggleAutomovelFieldGroup(ids = [], visible = true) {
  ids.forEach((id) => {
    const field = $(id);
    field?.closest("label")?.classList.toggle("hidden", !visible);
  });
}

function atualizarCamposTipoAutomovel() {
  const tipo = normalizeName($("automovelTipo")?.value || "");
  const isMoto = tipo.includes("moto");
  const hasType = Boolean(tipo);
  const motoFields = ["automovelCilindrada", "automovelPartida", "automovelFreio", "automovelInjecaoEletronica"];
  const veiculoFields = ["automovelMotor", "automovelDirecao", "automovelVidroEletrico", "automovelTravaEletrica", "automovelPortas", "automovelFreioAbs"];
  toggleAutomovelFieldGroup(motoFields, !hasType || isMoto);
  toggleAutomovelFieldGroup(veiculoFields, !hasType || !isMoto);
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
  $("automovelConsumoMedio").value = item.consumoMedio || "";
  $("automovelAceitaTroca").value = item.aceitaTroca || "";
  $("automovelAceitaFinanciamento").value = item.aceitaFinanciamento || "";
  $("automovelDocumentacao").value = item.documentacao || "";
  $("automovelMotor").value = item.motor || "";
  $("automovelDirecao").value = item.direcao || "";
  $("automovelVidroEletrico").value = item.vidroEletrico || "";
  $("automovelTravaEletrica").value = item.travaEletrica || "";
  $("automovelPortas").value = item.portas || "";
  $("automovelFreioAbs").value = item.freioAbs || "";
  $("automovelCilindrada").value = item.cilindrada || "";
  $("automovelPartida").value = item.partida || "";
  $("automovelFreio").value = item.freio || "";
  $("automovelInjecaoEletronica").value = item.injecaoEletronica || "";
  $("automovelCidade").value = item.cidade || "";
  $("automovelAcessorios").value = item.acessorios || "";
  $("automovelOpcionais").value = item.opcionais || "";
  $("automovelDescricao").value = item.descricao || "";
  $("automovelImagem").value = item.imagem || state.automovelImages[0] || "";
  atualizarCamposTipoAutomovel();
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
    consumoMedio: $("automovelConsumoMedio").value.trim(),
    aceitaTroca: $("automovelAceitaTroca").value,
    aceitaFinanciamento: $("automovelAceitaFinanciamento").value,
    documentacao: $("automovelDocumentacao").value.trim(),
    motor: $("automovelMotor").value.trim(),
    direcao: $("automovelDirecao").value.trim(),
    vidroEletrico: $("automovelVidroEletrico").value,
    travaEletrica: $("automovelTravaEletrica").value,
    portas: $("automovelPortas").value.trim(),
    freioAbs: $("automovelFreioAbs").value,
    cilindrada: $("automovelCilindrada").value.trim(),
    partida: $("automovelPartida").value.trim(),
    freio: $("automovelFreio").value.trim(),
    injecaoEletronica: $("automovelInjecaoEletronica").value,
    cidade: $("automovelCidade").value.trim() || linkedClient?.cidade || "",
    acessorios: $("automovelAcessorios").value.trim(),
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

const AUTOMOVEL_ARTE_LAYOUTS = {
  showroom: { nome: "Showroom premium", bg: "#0f172a", panel: "#111827", accent: "#facc15", accent2: "#fff7ad", infoText: "#fff7ad", text: "#ffffff", priceBg: "#facc15", priceText: "#ffe66d" },
  premium4x4: { nome: "Premium bronze", bg: "#050505", panel: "#101010", accent: "#c47a4a", accent2: "#f4c19b", infoText: "#ffd1a8", text: "#f8fafc", priceBg: "#120f0d", priceText: "#ffad66" },
  dark: { nome: "Noite esportiva", bg: "#050505", panel: "#171717", accent: "#ef4444", accent2: "#fecaca", infoText: "#ff6b6b", text: "#ffffff", priceBg: "#ef4444", priceText: "#ff6b6b" },
  clean: { nome: "Clean destaque", bg: "#f8fafc", panel: "#ffffff", accent: "#2563eb", accent2: "#93c5fd", infoText: "#60a5fa", text: "#ffffff", priceBg: "#0f172a", priceText: "#60a5fa" },
  orange: { nome: "Oferta laranja", bg: "#431407", panel: "#7c2d12", accent: "#fb923c", accent2: "#ffedd5", infoText: "#ffb86b", text: "#ffffff", priceBg: "#fb923c", priceText: "#ffb86b" },
  blue: { nome: "Azul concessionaria", bg: "#082f49", panel: "#075985", accent: "#38bdf8", accent2: "#e0f2fe", infoText: "#67e8f9", text: "#ffffff", priceBg: "#38bdf8", priceText: "#67e8f9" },
  magazine: { nome: "Revista automotiva", bg: "#122018", panel: "#183525", accent: "#22c55e", accent2: "#bbf7d0", infoText: "#86efac", text: "#ffffff", priceBg: "#22c55e", priceText: "#86efac" }
};

function hexParaRgbaArte(hex, alpha = 1) {
  const value = String(hex || "").replace("#", "").trim();
  if (!/^[0-9a-f]{6}$/i.test(value)) return `rgba(244,193,155,${alpha})`;
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function donoAutomovelAdmin(item = {}) {
  const candidatos = [
    item.clienteId,
    item.estabelecimentoId,
    item.clienteNome,
    item.vendedor,
    item.loja
  ].map((valor) => normalizeName(valor || "")).filter(Boolean);
  const cliente = state.clientes.find((client) => {
    const ids = [client.id, client.nome, client.name, client.nomeNormalizado]
      .map((valor) => normalizeName(valor || ""))
      .filter(Boolean);
    return ids.some((id) => candidatos.some((cand) => id === cand || id.includes(cand) || cand.includes(id)));
  }) || currentClientRecord();
  return cliente || { nome: item.clienteNome || item.vendedor || item.loja || "Ola Carlopolis", imagem: "" };
}

function automovelImagensCandidatasAdmin(item = {}) {
  const imagens = Array.isArray(item.imagens) ? item.imagens : [];
  return [...new Set([
    ...imagens,
    item.imagem,
    item.image,
    item.foto
  ].map(normalizarImagemArteAdmin).filter(Boolean))];
}

function tituloAutomovelArte(item = {}) {
  return textoCurtoArte([item.marca, item.modelo].filter(Boolean).join(" ") || item.titulo || "Veiculo em destaque", 38).toUpperCase();
}

function precoAutomovelArte(item = {}) {
  const valor = String(item.preco || item.valor || "").trim();
  if (!valor) return "CONSULTE";
  if (/^R\$/i.test(valor)) return valor.toUpperCase();
  const number = numberFromMoney(valor);
  return number ? moneyBR(number) : valor.toUpperCase();
}

function detalhesAutomovelArte(item = {}) {
  const detalhes = [
    item.ano ? { label: "ANO", value: item.ano } : null,
    item.km ? { label: "KM", value: item.km } : null,
    item.cambio ? { label: "CAMBIO", value: item.cambio } : null,
    item.combustivel ? { label: "COMBUSTIVEL", value: item.combustivel } : null,
    item.cor ? { label: "COR", value: item.cor } : null,
    item.contato ? { label: "WHATSAPP", value: telefoneArteAdmin(item.contato) || item.contato } : null
  ].filter(Boolean);
  return detalhes.slice(0, 4);
}

function desenharImagemAutoInteira(ctx, img, x, y, w, h, r = 0, fill = "#f8fafc") {
  preencherRoundRect(ctx, x, y, w, h, r, fill);
  desenharImagemContain(ctx, img, x, y, w, h, r, fill);
}

function desenharAutoThumbs(ctx, fotos = [], x, y, w, h, layout, vertical = true) {
  const thumbs = fotos.slice(1, 4);
  if (!thumbs.length) return;
  const gap = 14;
  const count = thumbs.length;
  thumbs.forEach((foto, index) => {
    const tx = vertical ? x : x + index * ((w - gap * (count - 1)) / count + gap);
    const ty = vertical ? y + index * ((h - gap * (count - 1)) / count + gap) : y;
    const tw = vertical ? w : (w - gap * (count - 1)) / count;
    const th = vertical ? (h - gap * (count - 1)) / count : h;
    preencherRoundRect(ctx, tx - 5, ty - 5, tw + 10, th + 10, 24, layout.accent);
    desenharImagemAutoInteira(ctx, foto, tx, ty, tw, th, 20, "#ffffff");
  });
}

function desenharAutoInfoCards(ctx, item, layout, x, y, w) {
  const detalhes = detalhesAutomovelArte(item);
  while (detalhes.length < 4) detalhes.push({ label: "STATUS", value: item.status || "Disponivel" });
  const gap = 10;
  const cardW = (w - gap * 3) / 4;
  detalhes.slice(0, 4).forEach((detail, index) => {
    const cx = x + index * (cardW + gap);
    preencherRoundRect(ctx, cx, y, cardW, 78, 18, layout.panel);
    desenharBordaRoundRect(ctx, cx, y, cardW, 78, 18, layout.accent, 2);
    ctx.fillStyle = layout.accent;
    ctx.textAlign = "center";
    fonteQueCabeCanvas(ctx, detail.label, 900, 15, 10, cardW - 18);
    ctx.fillText(detail.label, cx + cardW / 2, y + 27);
    ctx.fillStyle = layout.text;
    fonteQueCabeCanvas(ctx, String(detail.value).toUpperCase(), 900, 21, 12, cardW - 18);
    ctx.fillText(String(detail.value).toUpperCase(), cx + cardW / 2, y + 58);
  });
}

function desenharLogosAutoArte(ctx, client, logo, siteLogo, showSiteLogo, layout, x = 48, y = 48) {
  desenharImagemContain(ctx, logo, x, y, 118, 118, 22, "#ffffff");
  ctx.fillStyle = layout.text;
  ctx.textAlign = "left";
  fonteQueCabeCanvas(ctx, client?.nome || "Cliente", 900, 27, 15, 410);
  ctx.fillText(String(client?.nome || "Cliente").toUpperCase(), x + 140, y + 48);
  ctx.font = "800 18px Arial";
  ctx.fillStyle = layout.accent;
  ctx.fillText("VEICULO EM DESTAQUE", x + 140, y + 78);
  if (showSiteLogo) desenharImagemContain(ctx, siteLogo, 860, 48, 165, 88, 0, "rgba(255,255,255,0)");
}

function opcoesArteAutomovel() {
  const podeEscolherLogoSite = clientePodeEscolherLogoArteAutomovel();
  return {
    formato: $("automovelArteLayout")?.value || "premium45",
    tema: $("automovelArteTema")?.value || "premium4x4",
    title: $("automovelArteTitulo")?.value.trim() || "",
    subtitle: $("automovelArteSubtitulo")?.value.trim() || "",
    subtitle2: $("automovelArteSubtitulo2")?.value.trim() || "",
    footer: $("automovelArteRodape")?.value.trim() || "Olá Carlópolis • veículos e oportunidades locais",
    showSiteLogo: podeEscolherLogoSite ? $("automovelArteShowSiteLogo")?.checked !== false : true,
    threePhotos: {
      line1: $("automovelArteTarjaLinha1")?.value.trim() || "",
      line2: $("automovelArteTarjaLinha2")?.value.trim() || "",
      price: $("automovelArteTarjaPreco")?.value.trim() || "",
      bandColor: $("automovelArteTarjaTituloCor")?.value || $("automovelArteTarjaCor")?.value || "#050505",
      titleBandColor: $("automovelArteTarjaTituloCor")?.value || $("automovelArteTarjaCor")?.value || "#050505",
      priceBandColor: $("automovelArteTarjaPrecoCor")?.value || $("automovelArteTarjaCor")?.value || "#050505",
      clientBandColor: $("automovelArteTarjaClienteCor")?.value || $("automovelArteTarjaCor")?.value || "#050505",
      titleFontSize: Number($("automovelArteTarjaTituloFonte")?.value || 48) || 48,
      priceFontSize: Number($("automovelArteTarjaPrecoFonte")?.value || 54) || 54,
      showTitle: $("automovelArteTarjaTituloShow")?.checked !== false,
      titleOffsetX: Number($("automovelArteTarjaTituloX")?.value || 0) || 0,
      titleOffsetY: Number($("automovelArteTarjaTituloY")?.value || 0) || 0,
      showPrice: $("automovelArteTarjaPrecoShow")?.checked !== false,
      priceOffsetX: Number($("automovelArteTarjaPrecoX")?.value || 0) || 0,
      priceOffsetY: Number($("automovelArteTarjaPrecoY")?.value || 0) || 0,
      showClient: $("automovelArteTarjaClienteShow")?.checked !== false,
      clientOffsetX: Number($("automovelArteTarjaClienteX")?.value || 0) || 0,
      clientOffsetY: Number($("automovelArteTarjaClienteY")?.value || 0) || 0,
      siteLogoOffsetX: Number($("automovelArteSiteLogoX")?.value || 0) || 0,
      siteLogoOffsetY: Number($("automovelArteSiteLogoY")?.value || 0) || 0
    },
    imageSettings: {
      scale: Number($("automovelArteImageScale")?.value || 1) || 1,
      offsetX: Number($("automovelArteImageOffsetX")?.value || 0) || 0,
      offsetY: Number($("automovelArteImageOffsetY")?.value || 0) || 0,
      darkOverlay: Number($("automovelArteDarkOverlay")?.value || 0.22) || 0
    }
  };
}

function clientePodeEscolherLogoArteAutomovel() {
  return canManageClients() || Boolean(state.paginaInicialSite?.permitirClienteOcultarLogoArteVeiculo);
}

function aplicarPermissaoLogoArteAutomovel() {
  const input = $("automovelArteShowSiteLogo");
  if (!input) return;
  const podeEscolher = clientePodeEscolherLogoArteAutomovel();
  if (!podeEscolher) input.checked = true;
  input.disabled = !podeEscolher;
  input.closest(".auto-art-logo-check")?.classList.toggle("hidden", !podeEscolher);
}

function automovelArteSelecionado() {
  const id = $("automovelArteItem")?.value || state.selectedAutomovelArtId || "";
  return state.automoveis.find((auto) => auto.id === id && itemBelongsToCurrentClient(auto)) || null;
}

function defaultsTarjaAutomovel(item = {}) {
  return {
    line1: [item.marca, item.modelo].filter(Boolean).join(" ") || item.titulo || "Veiculo em destaque",
    line2: item.ano ? `Ano ${item.ano}` : (item.tipo || "Pronto para negociar"),
    price: precoAutomovelArte(item)
  };
}

function preencherDefaultsTarjaAutomovel(force = false) {
  const item = automovelArteSelecionado();
  if (!item) return;
  const defaults = defaultsTarjaAutomovel(item);
  const line1 = $("automovelArteTarjaLinha1");
  const line2 = $("automovelArteTarjaLinha2");
  const price = $("automovelArteTarjaPreco");
  if (line1 && (force || !line1.value.trim())) line1.value = defaults.line1;
  if (line2 && (force || !line2.value.trim())) line2.value = defaults.line2;
  if (price && (force || !price.value.trim())) price.value = defaults.price;
}

function atualizarVisibilidadeLayoutAutomovelArte() {
  aplicarPermissaoLogoArteAutomovel();
  const isThree = ($("automovelArteLayout")?.value || "premium45") === "tresFotosTarjas";
  const panel = document.querySelector(".automovel-art-panel");
  panel?.classList.toggle("auto-art-layout-three", isThree);
  panel?.classList.toggle("auto-art-layout-premium", !isThree);
  automovelArteDragState = null;
  if (isThree) preencherDefaultsTarjaAutomovel(false);
}

function clampNumero(valor, min, max) {
  const numero = Number(valor) || 0;
  return Math.max(min, Math.min(max, numero));
}

function setValorControleArteAutomovel(id, valor, dispatch = true) {
  const input = $(id);
  if (!input) return;
  input.value = String(valor);
  if (dispatch) input.dispatchEvent(new Event("input", { bubbles: true }));
}

function redesenharArteAutomovelDuranteArraste() {
  if (automovelArteDragFrame) return;
  automovelArteDragFrame = requestAnimationFrame(() => {
    automovelArteDragFrame = null;
    atualizarPreviaArteAutomovel({ silent: true });
  });
}

function pontoCanvasArteAutomovel(event, canvas = $("automovelArtePreview")) {
  if (!canvas) return null;
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;
  return {
    x: (event.clientX - rect.left) * (canvas.width / rect.width),
    y: (event.clientY - rect.top) * (canvas.height / rect.height)
  };
}

function pontoDentroRetanguloArteAutomovel(ponto, rect) {
  return ponto && rect && ponto.x >= rect.x && ponto.x <= rect.x + rect.w && ponto.y >= rect.y && ponto.y <= rect.y + rect.h;
}

function retanguloLogoSiteTresFotosArteAutomovel() {
  const largura = 170;
  const altura = 80;
  const margemDireita = 20;
  const margemInferior = 45;
  return {
    x: 1080 - margemDireita - largura,
    y: 1350 - margemInferior - altura,
    w: largura,
    h: altura
  };
}

function retangulosArrastaveisArteAutomovel(options = opcoesArteAutomovel()) {
  if ((options.formato || "premium45") === "tresFotosTarjas") {
    const config = options.threePhotos || {};
    const rects = [];
    if (config.showClient !== false) {
      rects.push({
        tipo: "tarjaCliente",
        x: 42 + Number(config.clientOffsetX || 0),
        y: 1186 + Number(config.clientOffsetY || 0),
        w: 486,
        h: 110,
        inputX: "automovelArteTarjaClienteX",
        inputY: "automovelArteTarjaClienteY",
        minX: -900,
        maxX: 900,
        minY: -900,
        maxY: 900
      });
    }
    if (config.showPrice !== false) {
      rects.push({
        tipo: "tarjaPreco",
        x: 215 + Number(config.priceOffsetX || 0),
        y: 856 + Number(config.priceOffsetY || 0),
        w: 650,
        h: 88,
        inputX: "automovelArteTarjaPrecoX",
        inputY: "automovelArteTarjaPrecoY",
        minX: -900,
        maxX: 900,
        minY: -900,
        maxY: 900
      });
    }
    if (config.showTitle !== false) {
      rects.push({
        tipo: "tarjaTitulo",
        x: 130 + Number(config.titleOffsetX || 0),
        y: 402 + Number(config.titleOffsetY || 0),
        w: 820,
        h: 96,
        inputX: "automovelArteTarjaTituloX",
        inputY: "automovelArteTarjaTituloY",
        minX: -900,
        maxX: 900,
        minY: -900,
        maxY: 900
      });
    }
    return rects;
  }
  return [{
    tipo: "fotoPrincipal",
    x: 305,
    y: 375,
    w: 730,
    h: 445,
    inputX: "automovelArteImageOffsetX",
    inputY: "automovelArteImageOffsetY",
    minX: -420,
    maxX: 420,
    minY: -320,
    maxY: 320
  }];
}

function elementoArrastavelArteAutomovel(ponto) {
  return retangulosArrastaveisArteAutomovel().find((rect) => pontoDentroRetanguloArteAutomovel(ponto, rect)) || null;
}

function atualizarCursorArteAutomovel(event) {
  const canvas = $("automovelArtePreview");
  if (!canvas || automovelArteDragState) return;
  const ponto = pontoCanvasArteAutomovel(event, canvas);
  canvas.style.cursor = elementoArrastavelArteAutomovel(ponto) ? "grab" : "default";
}

function iniciarArrasteArteAutomovel(event) {
  const canvas = $("automovelArtePreview");
  const ponto = pontoCanvasArteAutomovel(event, canvas);
  const alvo = elementoArrastavelArteAutomovel(ponto);
  if (!canvas || !ponto || !alvo) return;
  event.preventDefault();
  automovelArteDragState = {
    pointerId: event.pointerId,
    alvo,
    startX: ponto.x,
    startY: ponto.y,
    initialX: Number($(alvo.inputX)?.value || 0) || 0,
    initialY: Number($(alvo.inputY)?.value || 0) || 0
  };
  canvas.setPointerCapture?.(event.pointerId);
  canvas.style.cursor = "grabbing";
}

function moverArrasteArteAutomovel(event) {
  const canvas = $("automovelArtePreview");
  if (!automovelArteDragState || !canvas || event.pointerId !== automovelArteDragState.pointerId) {
    atualizarCursorArteAutomovel(event);
    return;
  }
  const ponto = pontoCanvasArteAutomovel(event, canvas);
  if (!ponto) return;
  event.preventDefault();
  const { alvo, startX, startY, initialX, initialY } = automovelArteDragState;
  const nextX = Math.round(clampNumero(initialX + ponto.x - startX, alvo.minX, alvo.maxX));
  const nextY = Math.round(clampNumero(initialY + ponto.y - startY, alvo.minY, alvo.maxY));
  setValorControleArteAutomovel(alvo.inputX, nextX, false);
  setValorControleArteAutomovel(alvo.inputY, nextY, false);
  redesenharArteAutomovelDuranteArraste();
}

function finalizarArrasteArteAutomovel(event) {
  const canvas = $("automovelArtePreview");
  if (!automovelArteDragState || event.pointerId !== automovelArteDragState.pointerId) return;
  canvas?.releasePointerCapture?.(event.pointerId);
  automovelArteDragState = null;
  if (canvas) canvas.style.cursor = "grab";
  atualizarPreviaArteAutomovel({ silent: true });
}

function textoTituloAutomovelArte(item = {}, options = {}) {
  return textoCurtoArte(options.title || tituloAutomovelArte(item), 44).toUpperCase();
}

function textoSubtituloAutomovelArte(item = {}, options = {}) {
  return textoCurtoArte(options.subtitle || [item.tipo, item.cidade].filter(Boolean).join(" • ") || "Veículo em destaque no Olá Carlópolis", 95);
}

function desenharRodapeAutomovelArte(ctx, texto, layout, w, y) {
  const safe = textoCurtoArte(texto || "Olá Carlópolis • veículos e oportunidades locais", 95);
  preencherRoundRect(ctx, 70, y, w - 140, 44, 18, layout.panel);
  desenharBordaRoundRect(ctx, 70, y, w - 140, 44, 18, layout.accent, 2);
  ctx.fillStyle = layout.text;
  ctx.textAlign = "center";
  fonteQueCabeCanvas(ctx, safe, 900, 18, 11, w - 190);
  ctx.fillText(safe, w / 2, y + 29);
}

function desenharArteAutomovelUmaFoto(ctx, item, client, fotos, logo, siteLogo, layout, options = {}) {
  const main = fotos[0] || logo || siteLogo;
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  const isStory = h > w;
  const title = textoTituloAutomovelArte(item, options);
  const subtitle = textoSubtituloAutomovelArte(item, options);
  ctx.fillStyle = layout.bg;
  ctx.fillRect(0, 0, w, h);
  desenharLogosAutoArte(ctx, client, logo, siteLogo, options.showSiteLogo !== false, layout, 58, isStory ? 58 : 48);

  if (isStory) {
    desenharImagemAutoInteira(ctx, main, 58, 250, 964, 890, 44, "#ffffff");
    ctx.fillStyle = layout.text;
    ctx.textAlign = "center";
    desenharTextoInteiroCanvas(ctx, title, w / 2, 1210, 930, 3, { peso: 900, tamanho: 82, minimo: 46, lineHeight: 86, blockHeight: 238 });
    preencherRoundRect(ctx, 250, 1460, 580, 105, 30, layout.priceBg);
    ctx.fillStyle = layout.priceText;
    fonteQueCabeCanvas(ctx, precoAutomovelArte(item), 900, 50, 28, 520);
    ctx.fillText(precoAutomovelArte(item), w / 2, 1528);
    ctx.fillStyle = layout.accent;
    desenharTextoInteiroCanvas(ctx, subtitle, w / 2, 1585, 870, 2, { peso: 800, tamanho: 42, minimo: 24, lineHeight: 46, blockHeight: 104 });
    desenharAutoInfoCards(ctx, item, layout, 82, 1710, 916);
    desenharRodapeAutomovelArte(ctx, options.footer, layout, w, 1848);
    return;
  }

  desenharImagemAutoInteira(ctx, main, 58, 175, 964, 560, 42, "#ffffff");
  ctx.fillStyle = layout.text;
  ctx.textAlign = "left";
  desenharTextoInteiroCanvas(ctx, title, 80, 778, 670, 2, { peso: 900, tamanho: 54, minimo: 30, lineHeight: 58, blockHeight: 126 });
  preencherRoundRect(ctx, 690, 786, 315, 82, 24, layout.priceBg);
  ctx.fillStyle = layout.priceText;
  ctx.textAlign = "center";
  fonteQueCabeCanvas(ctx, precoAutomovelArte(item), 900, 36, 22, 275);
  ctx.fillText(precoAutomovelArte(item), 848, 838);
  ctx.fillStyle = layout.accent;
  desenharTextoInteiroCanvas(ctx, subtitle, 80, 902, 900, 2, { peso: 800, tamanho: 24, minimo: 15, lineHeight: 28, blockHeight: 62 });
  desenharAutoInfoCards(ctx, item, layout, 70, 958, 940);
  desenharRodapeAutomovelArte(ctx, options.footer, layout, w, 1022);
}

function desenharArteAutomovelStories(ctx, item, client, fotos, logo, siteLogo, layout, options = {}) {
  const main = fotos[0] || logo || siteLogo;
  const hasThumbs = fotos.length > 1;
  const title = textoTituloAutomovelArte(item, options);
  const subtitle = textoSubtituloAutomovelArte(item, options);
  ctx.fillStyle = layout.bg;
  ctx.fillRect(0, 0, 1080, 1920);
  desenharLogosAutoArte(ctx, client, logo, siteLogo, options.showSiteLogo !== false, layout, 58, 58);
  if (hasThumbs) {
    desenharImagemAutoInteira(ctx, main, 58, 245, 720, 835, 44, "#ffffff");
    desenharAutoThumbs(ctx, fotos, 806, 245, 216, 835, layout, true);
  } else {
    desenharImagemAutoInteira(ctx, main, 58, 245, 964, 835, 44, "#ffffff");
  }
  ctx.fillStyle = layout.text;
  ctx.textAlign = "center";
  desenharTextoInteiroCanvas(ctx, title, 540, 1158, 920, 3, { peso: 900, tamanho: 82, minimo: 46, lineHeight: 86, blockHeight: 245 });
  preencherRoundRect(ctx, 250, 1408, 580, 106, 30, layout.priceBg);
  ctx.fillStyle = layout.priceText;
  fonteQueCabeCanvas(ctx, precoAutomovelArte(item), 900, 50, 28, 520);
  ctx.fillText(precoAutomovelArte(item), 540, 1478);
  ctx.fillStyle = layout.accent;
  desenharTextoInteiroCanvas(ctx, subtitle, 540, 1532, 870, 2, { peso: 800, tamanho: 42, minimo: 24, lineHeight: 46, blockHeight: 110 });
  desenharAutoInfoCards(ctx, item, layout, 82, 1682, 916);
  desenharRodapeAutomovelArte(ctx, options.footer, layout, 1080, 1848);
}

function detalheAutomovelValorPremium(item = {}, campos = []) {
  for (const campo of campos) {
    const valor = String(item[campo] || "").trim();
    if (valor) return valor.toUpperCase();
  }
  return "";
}

function tituloAutomovelPremium(item = {}, options = {}) {
  const base = String(options.title || [item.marca, item.modelo].filter(Boolean).join(" ") || item.titulo || "Veiculo premium").replace(/\s+/g, " ").trim().toUpperCase();
  return base || "VEICULO PREMIUM";
}

function desenharFundoPremiumAutomovel(ctx, w, h, layout) {
  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, "#030303");
  grad.addColorStop(.45, "#101010");
  grad.addColorStop(1, "#23140d");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "rgba(255,255,255,.035)";
  for (let x = -60; x < w; x += 42) ctx.fillRect(x, h - 110, 22, 110);
}

function desenharSeparadorPremium(ctx, x1, y, x2, color = "rgba(244,193,155,.45)") {
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x1, y);
  ctx.lineTo(x2, y);
  ctx.stroke();
}

function desenharInfoPremium(ctx, label, value, x, y, w, h, layout) {
  if (!value) return;
  preencherRoundRect(ctx, x, y, w, h, 16, "rgba(255,255,255,.035)");
  desenharBordaRoundRect(ctx, x, y, w, h, 16, layout.accent, 2);
  ctx.fillStyle = layout.accent2;
  ctx.textAlign = "left";
  fonteQueCabeCanvas(ctx, label, 900, 18, 11, w - 34);
  ctx.fillText(label, x + 16, y + 26);
  ctx.fillStyle = "#ffffff";
  fonteQueCabeCanvas(ctx, String(value).toUpperCase(), 900, 25, 13, w - 34);
  ctx.fillText(String(value).toUpperCase(), x + 16, y + h - 18);
}

function desenharAssinaturaPremiumAutomovel(ctx, client, logo, siteLogo, showSiteLogo, layout, isStory = false) {
  const y = isStory ? 48 : 40;
  desenharImagemContain(ctx, logo, isStory ? 58 : 786, y, isStory ? 94 : 76, isStory ? 94 : 76, 16, "#ffffff");
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "left";
  fonteQueCabeCanvas(ctx, client?.nome || "Cliente", 900, isStory ? 25 : 19, 12, isStory ? 370 : 128);
  ctx.fillText(String(client?.nome || "Cliente").toUpperCase(), isStory ? 168 : 872, y + (isStory ? 42 : 30));
  ctx.fillStyle = layout.accent2;
  ctx.font = `800 ${isStory ? 18 : 13}px Arial`;
  ctx.fillText("VEICULO EM DESTAQUE", isStory ? 168 : 872, y + (isStory ? 70 : 52));
  if (showSiteLogo) desenharImagemContain(ctx, siteLogo, isStory ? 845 : 950, y + 6, isStory ? 150 : 86, isStory ? 82 : 48, 0, "rgba(255,255,255,0)");
}

function desenharListaPremium(ctx, detalhes, x, y, w, rowH, layout) {
  detalhes.filter((detail) => detail.value).slice(0, 5).forEach((detail, index) => {
    const ty = y + index * rowH;
    ctx.strokeStyle = "rgba(244,193,155,.45)";
    ctx.lineWidth = 1.5;
    if (index) {
      ctx.beginPath();
      ctx.moveTo(x, ty - 8);
      ctx.lineTo(x + w, ty - 8);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(196,122,74,.16)";
    ctx.beginPath();
    ctx.arc(x + 28, ty + 24, 23, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = layout.accent;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = layout.accent2;
    ctx.textAlign = "center";
    fonteQueCabeCanvas(ctx, detail.icon || "•", 900, 22, 14, 30);
    ctx.fillText(detail.icon || "•", x + 28, ty + 32);
    ctx.textAlign = "left";
    ctx.fillStyle = "#ffffff";
    fonteQueCabeCanvas(ctx, detail.label, 900, 22, 13, w - 76);
    ctx.fillText(detail.label, x + 66, ty + 20);
    ctx.fillStyle = "#e5e7eb";
    fonteQueCabeCanvas(ctx, String(detail.value).toUpperCase(), 700, 19, 12, w - 76);
    ctx.fillText(String(detail.value).toUpperCase(), x + 66, ty + 47);
  });
}

function detalhesAutomovelPremium(item = {}) {
  return [
    { icon: "▣", label: "ANO", value: detalheAutomovelValorPremium(item, ["ano"]) },
    { icon: "◆", label: "COMBUSTIVEL", value: detalheAutomovelValorPremium(item, ["combustivel"]) },
    { icon: "●", label: "KM", value: detalheAutomovelValorPremium(item, ["km", "quilometragem"]) },
    { icon: "⚙", label: "CAMBIO", value: detalheAutomovelValorPremium(item, ["cambio"]) },
    { icon: "✦", label: "COR", value: detalheAutomovelValorPremium(item, ["cor"]) }
  ].filter((detail) => detail.value);
}

function desenharArteAutomovelPremium(ctx, item, client, fotos, logo, siteLogo, layout, options = {}) {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  const isStory = h > w;
  const main = fotos[0] || logo || siteLogo;
  const title = tituloAutomovelPremium(item, options);
  const subtitle = textoCurtoArte(options.subtitle || "FORCA, CONFORTO E DESEMPENHO PARA O SEU PROXIMO NEGOCIO", 82).toUpperCase();
  const detalhes = detalhesAutomovelPremium(item);
  const contato = telefoneArteAdmin(item.contato || client?.whatsapp || client?.contato || client?.telefone || "") || "(00) 00000-0000";

  desenharFundoPremiumAutomovel(ctx, w, h, layout);
  desenharAssinaturaPremiumAutomovel(ctx, client, logo, siteLogo, options.showSiteLogo !== false, layout, isStory);

  if (isStory) {
    ctx.fillStyle = layout.accent2;
    ctx.textAlign = "center";
    ctx.font = "900 34px Arial";
    ctx.fillText("OPORTUNIDADE PREMIUM", w / 2, 220);
    ctx.fillStyle = "#ffffff";
    desenharTextoInteiroCanvas(ctx, title, w / 2, 270, 960, 3, { peso: 900, tamanho: 92, minimo: 48, lineHeight: 96, blockHeight: 285 });
    ctx.fillStyle = layout.accent2;
    desenharTextoInteiroCanvas(ctx, subtitle, w / 2, 560, 880, 2, { peso: 800, tamanho: 34, minimo: 20, lineHeight: 40, blockHeight: 90 });
    desenharImagemAutoInteira(ctx, main, 70, 670, 940, 520, 36, "#141414");
    desenharListaPremium(ctx, detalhes, 88, 1235, 395, 78, layout);
    desenharListaPremium(ctx, [
      { icon: "✓", label: "DESTAQUE", value: "PRONTO PARA NEGOCIAR" },
      { icon: "☎", label: "CONTATO", value: contato }
    ], 565, 1235, 415, 92, layout);
    preencherRoundRect(ctx, 80, 1620, 920, 155, 18, "rgba(0,0,0,.82)");
    desenharBordaRoundRect(ctx, 80, 1620, 920, 155, 18, layout.accent, 3);
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.font = "900 34px Arial";
    ctx.fillText("POR APENAS", 540, 1672);
    ctx.fillStyle = layout.priceText;
    fonteQueCabeCanvas(ctx, precoAutomovelArte(item), 900, 86, 46, 820);
    ctx.fillText(precoAutomovelArte(item), 540, 1748);
    desenharRodapeAutomovelArte(ctx, options.footer || `Contato: ${contato}`, layout, w, 1848);
    return;
  }

  ctx.fillStyle = layout.accent2;
  ctx.textAlign = "center";
  ctx.font = "900 31px Arial";
  ctx.fillText("OPORTUNIDADE PREMIUM", 305, 118);
  desenharSeparadorPremium(ctx, 58, 142, 565, layout.accent);
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "left";
  desenharTextoInteiroCanvas(ctx, title, 58, 164, 555, 2, { peso: 900, tamanho: 82, minimo: 44, lineHeight: 84, blockHeight: 180 });
  ctx.fillStyle = layout.accent2;
  desenharTextoInteiroCanvas(ctx, subtitle, 60, 352, 430, 3, { peso: 800, tamanho: 27, minimo: 16, lineHeight: 34, blockHeight: 120 });

  desenharImagemAutoInteira(ctx, main, 430, 120, 610, 510, 28, "#171717");
  ctx.strokeStyle = layout.accent;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(430, 120);
  ctx.lineTo(390, 650);
  ctx.stroke();

  detalhes.slice(0, 3).forEach((detail, index) => desenharInfoPremium(ctx, detail.label, detail.value, 58, 460 + index * 92, 190, 74, layout));

  preencherRoundRect(ctx, 58, 760, 590, 150, 18, "rgba(0,0,0,.82)");
  desenharBordaRoundRect(ctx, 58, 760, 590, 150, 18, layout.accent, 3);
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.font = "900 27px Arial";
  ctx.fillText("POR APENAS", 353, 810);
  ctx.fillStyle = layout.priceText;
  fonteQueCabeCanvas(ctx, precoAutomovelArte(item), 900, 82, 42, 520);
  ctx.fillText(precoAutomovelArte(item), 353, 882);

  const sideDetails = [
    ...detalhes.slice(3),
    { icon: "✓", label: "NEGOCIACAO", value: "FACILITADA" },
    { icon: "☎", label: "CONTATO", value: contato }
  ];
  preencherRoundRect(ctx, 710, 615, 315, 300, 24, "rgba(0,0,0,.62)");
  desenharBordaRoundRect(ctx, 710, 615, 315, 300, 24, layout.accent, 2);
  desenharListaPremium(ctx, sideDetails, 735, 645, 265, 74, layout);

  preencherRoundRect(ctx, 60, 936, 610, 86, 18, "rgba(196,122,74,.16)");
  desenharBordaRoundRect(ctx, 60, 936, 610, 86, 18, layout.accent, 2);
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "left";
  ctx.font = "900 26px Arial";
  ctx.fillText("FINANCIAMENTO FACILITADO", 92, 972);
  ctx.fillStyle = "#e5e7eb";
  fonteQueCabeCanvas(ctx, options.footer || "As melhores condicoes para voce sair de carro novo.", 800, 20, 12, 535);
  ctx.fillText(options.footer || "As melhores condicoes para voce sair de carro novo.", 92, 1000);

  preencherRoundRect(ctx, 710, 940, 315, 82, 18, layout.accent);
  ctx.fillStyle = "#111111";
  ctx.textAlign = "center";
  ctx.font = "900 28px Arial";
  ctx.fillText("SAIBA MAIS", 868, 975);
  ctx.font = "900 22px Arial";
  ctx.fillText(contato, 868, 1004);
}

function desenharImagemVeiculoPremium45(ctx, img, x, y, w, h, settings = {}) {
  preencherRoundRect(ctx, x, y, w, h, 34, "#151515");
  const scale = Math.max(.75, Math.min(1.35, Number(settings.scale || 1)));
  const offsetX = Number(settings.offsetX || 0);
  const offsetY = Number(settings.offsetY || 0);
  const ratio = Math.max(w / img.width, h / img.height) * scale;
  const iw = img.width * ratio;
  const ih = img.height * ratio;
  const ix = x + (w - iw) / 2 + offsetX;
  const iy = y + (h - ih) / 2 + offsetY;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 34);
  ctx.clip();
  ctx.drawImage(img, ix, iy, iw, ih);
  const overlay = Math.max(0, Math.min(.55, Number(settings.darkOverlay ?? .22)));
  if (overlay) {
    ctx.fillStyle = `rgba(0,0,0,${overlay})`;
    ctx.fillRect(x, y, w, h);
  }
  const grad = ctx.createLinearGradient(x, y, x + w, y + h);
  grad.addColorStop(0, "rgba(0,0,0,.25)");
  grad.addColorStop(.52, "rgba(0,0,0,0)");
  grad.addColorStop(1, "rgba(0,0,0,.48)");
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
  ctx.fillStyle = "rgba(0,0,0,.42)";
  ctx.beginPath();
  ctx.ellipse(x + w * .55, y + h + 18, w * .34, 22, 0, 0, Math.PI * 2);
  ctx.fill();
}

function desenharLogoSemFundoCanvas(ctx, img, x, y, w, h) {
  if (!img) return;
  const scale = Math.min(w / img.width, h / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

function specsAutomovelPremium45(item = {}) {
  const isMoto = normalizeName(item.tipo || "").includes("moto");
  const specs = (isMoto ? [
    item.cilindrada ? { title: "CILINDRADA", detail: item.cilindrada } : null,
    item.partida ? { title: "PARTIDA", detail: item.partida } : null,
    item.freio ? { title: "FREIO", detail: item.freio } : null,
    item.injecaoEletronica ? { title: "INJECAO ELETRONICA", detail: item.injecaoEletronica } : null,
    item.consumoMedio ? { title: "CONSUMO MEDIO", detail: item.consumoMedio } : null,
    item.documentacao ? { title: "DOCUMENTACAO", detail: item.documentacao } : null
  ] : [
    item.motor ? { title: `MOTOR ${String(item.motor).toUpperCase()}`, detail: item.combustivel || "" } : null,
    item.cambio ? { title: "CAMBIO", detail: item.cambio } : null,
    item.direcao ? { title: "DIRECAO", detail: item.direcao } : null,
    item.portas ? { title: "PORTAS", detail: item.portas } : null,
    item.freioAbs ? { title: "FREIO ABS", detail: item.freioAbs } : null,
    item.vidroEletrico ? { title: "VIDRO ELETRICO", detail: item.vidroEletrico } : null,
    item.travaEletrica ? { title: "TRAVA ELETRICA", detail: item.travaEletrica } : null,
    item.consumoMedio ? { title: "CONSUMO MEDIO", detail: item.consumoMedio } : null,
    item.documentacao ? { title: "DOCUMENTACAO", detail: item.documentacao } : null
  ]).filter(Boolean);
  if (item.aceitaFinanciamento) specs.push({ title: "FINANCIAMENTO", detail: item.aceitaFinanciamento });
  if (item.aceitaTroca) specs.push({ title: "ACEITA TROCA", detail: item.aceitaTroca });
  if (item.acessorios) specs.push({ title: "ACESSORIOS", detail: textoCurtoArte(item.acessorios, 28) });
  if (item.opcionais) specs.push({ title: "OPCIONAIS", detail: textoCurtoArte(item.opcionais, 28) });
  while (specs.length < 5) {
    const fallback = [
      { title: "NEGOCIACAO", detail: "FACILITADA" },
      { title: "VEICULO", detail: "EM DESTAQUE" },
      { title: "CONTATO", detail: "WHATSAPP" }
    ][specs.length % 3];
    specs.push(fallback);
  }
  return specs.slice(0, 6);
}

function desenharMiniInfoPremium45(ctx, label, value, x, y, layout) {
  const infoColor = layout.infoText || layout.accent2 || "#f4c19b";
  ctx.save();
  ctx.shadowColor = hexParaRgbaArte(infoColor, .42);
  ctx.shadowBlur = 12;
  desenharBordaRoundRect(ctx, x, y, 172, 84, 16, layout.accent, 2);
  ctx.restore();
  preencherRoundRect(ctx, x, y, 172, 84, 16, "rgba(255,255,255,.035)");
  desenharBordaRoundRect(ctx, x, y, 172, 84, 16, layout.accent, 2);
  ctx.fillStyle = "#f8fafc";
  ctx.textAlign = "left";
  ctx.font = "900 18px Arial";
  ctx.fillText(label, x + 18, y + 30);
  ctx.fillStyle = infoColor;
  fonteQueCabeCanvas(ctx, String(value || "-").toUpperCase(), 900, 25, 14, 136);
  ctx.fillText(String(value || "-").toUpperCase(), x + 18, y + 64);
}

function desenharArteAutomovelPremium45(ctx, item, client, fotos, logo, siteLogo, options = {}) {
  const layout = AUTOMOVEL_ARTE_LAYOUTS[options.tema] || AUTOMOVEL_ARTE_LAYOUTS.premium4x4;
  const main = fotos[0] || logo || siteLogo;
  const settings = options.imageSettings || {};
  const contato = telefoneArteAdmin(item.contato || client?.whatsapp || client?.contato || client?.telefone || "") || "(00) 00000-0000";
  const title = tituloAutomovelPremium(item, options);
  const subtitle1 = textoCurtoArte(options.subtitle || "FORCA, CONFORTO E DESEMPENHO", 52).toUpperCase();
  const subtitle2 = textoCurtoArte(options.subtitle2 || "CARACTERISTICAS", 52).toUpperCase();
  const specs = specsAutomovelPremium45(item);
  const infoColor = layout.infoText || layout.accent2 || "#f4c19b";
  const priceColor = layout.priceText || infoColor;

  desenharFundoPremiumAutomovel(ctx, 1080, 1350, layout);
  ctx.fillStyle = "rgba(255,255,255,.035)";
  for (let x = 0; x < 1080; x += 28) ctx.fillRect(x, 1232, 14, 118);

  desenharImagemVeiculoPremium45(ctx, main, 305, 375, 730, 445, settings);
  ctx.strokeStyle = layout.accent;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(298, 356);
  ctx.lineTo(276, 840);
  ctx.stroke();
  if (options.showSiteLogo !== false) desenharImagemContain(ctx, siteLogo, 886, 34, 146, 76, 0, "rgba(255,255,255,0)");

  ctx.save();
  ctx.shadowColor = hexParaRgbaArte(infoColor, .58);
  ctx.shadowBlur = 20;
  desenharBordaRoundRect(ctx, 42, 126, 996, 210, 24, layout.accent, 3);
  ctx.restore();
  preencherRoundRect(ctx, 42, 126, 996, 210, 24, "rgba(0,0,0,.86)");
  desenharBordaRoundRect(ctx, 42, 126, 996, 210, 24, hexParaRgbaArte(layout.accent, .72), 2);
  ctx.fillStyle = infoColor;
  ctx.textAlign = "center";
  ctx.font = "900 38px Arial";
  ctx.fillText("OPORTUNIDADE PREMIUM", 540, 96);
  ctx.fillStyle = "#f8fafc";
  ctx.textAlign = "center";
  desenharTextoInteiroCanvas(ctx, title, 540, 148, 904, 2, { peso: 900, tamanho: 58, minimo: 24, lineHeight: 60, blockHeight: 114, align: "center" });
  ctx.fillStyle = "#f8fafc";
  desenharTextoInteiroCanvas(ctx, subtitle1, 540, 270, 864, 2, { peso: 900, tamanho: 25, minimo: 13, lineHeight: 29, blockHeight: 52, align: "center" });

  desenharMiniInfoPremium45(ctx, "ANO", item.ano || "-", 58, 375, layout);
  desenharMiniInfoPremium45(ctx, "COMB.", item.combustivel || "-", 58, 473, layout);
  desenharMiniInfoPremium45(ctx, "KM", item.km || item.quilometragem || "-", 58, 571, layout);
  desenharMiniInfoPremium45(ctx, normalizeName(item.tipo || "").includes("moto") ? "CIL." : "MOTOR", normalizeName(item.tipo || "").includes("moto") ? (item.cilindrada || item.motor || "-") : (item.motor || "-"), 58, 669, layout);
  desenharMiniInfoPremium45(ctx, "CAMBIO", item.cambio || item.partida || "-", 58, 767, layout);

  ctx.save();
  ctx.shadowColor = hexParaRgbaArte(infoColor, .75);
  ctx.shadowBlur = 22;
  desenharBordaRoundRect(ctx, 58, 900, 602, 154, 18, layout.accent, 4);
  ctx.restore();
  preencherRoundRect(ctx, 58, 900, 602, 154, 18, "rgba(0,0,0,.82)");
  desenharBordaRoundRect(ctx, 58, 900, 602, 154, 18, layout.accent, 3);
  const priceGlow = ctx.createLinearGradient(58, 900, 660, 1054);
  priceGlow.addColorStop(0, hexParaRgbaArte(infoColor, .32));
  priceGlow.addColorStop(.35, "rgba(255,255,255,.08)");
  priceGlow.addColorStop(.72, hexParaRgbaArte(infoColor, .22));
  priceGlow.addColorStop(1, hexParaRgbaArte(layout.accent, .34));
  desenharBordaRoundRect(ctx, 64, 906, 590, 142, 15, priceGlow, 2);
  ctx.fillStyle = "#f8fafc";
  ctx.textAlign = "center";
  ctx.font = "900 28px Arial";
  ctx.fillText("POR APENAS", 359, 954);
  ctx.fillStyle = priceColor;
  fonteQueCabeCanvas(ctx, precoAutomovelArte(item), 900, 84, 44, 540);
  ctx.fillText(precoAutomovelArte(item), 359, 1030);

  ctx.save();
  ctx.shadowColor = hexParaRgbaArte(infoColor, .52);
  ctx.shadowBlur = 16;
  desenharBordaRoundRect(ctx, 690, 830, 338, 412, 24, layout.accent, 3);
  ctx.restore();
  preencherRoundRect(ctx, 690, 830, 338, 412, 24, "rgba(0,0,0,.70)");
  desenharBordaRoundRect(ctx, 690, 830, 338, 412, 24, layout.accent, 2);
  ctx.fillStyle = infoColor;
  ctx.textAlign = "left";
  desenharTextoInteiroCanvas(ctx, subtitle2, 720, 852, 278, 1, { peso: 900, tamanho: 22, minimo: 13, lineHeight: 25, blockHeight: 34, align: "left" });
  specs.forEach((spec, index) => {
    const y = 920 + index * 50;
    if (index) desenharSeparadorPremium(ctx, 720, y - 16, 1000, hexParaRgbaArte(infoColor, .35));
    ctx.fillStyle = infoColor;
    ctx.textAlign = "center";
    ctx.font = "900 15px Arial";
    ctx.fillText(String(index + 1).padStart(2, "0"), 736, y + 10);
    ctx.textAlign = "left";
    ctx.fillStyle = "#ffffff";
    fonteQueCabeCanvas(ctx, spec.title, 900, 18, 11, 230);
    ctx.fillText(spec.title, 768, y);
    ctx.fillStyle = "#e5e7eb";
    fonteQueCabeCanvas(ctx, spec.detail || "", 700, 15, 9, 230);
    ctx.fillText(String(spec.detail || "").toUpperCase(), 768, y + 24);
  });

  preencherRoundRect(ctx, 58, 1168, 610, 74, 18, hexParaRgbaArte(layout.accent, .16));
  desenharBordaRoundRect(ctx, 58, 1168, 610, 74, 18, layout.accent, 2);
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "left";
  ctx.font = "900 24px Arial";
  ctx.fillText("FINANCIAMENTO", 92, 1198);
  ctx.fillStyle = priceColor;
  ctx.font = "900 29px Arial";
  ctx.fillText("FACILITADO", 92, 1230);
  ctx.strokeStyle = "rgba(255,255,255,.42)";
  ctx.beginPath();
  ctx.moveTo(344, 1180);
  ctx.lineTo(344, 1230);
  ctx.stroke();
  ctx.fillStyle = "#f8fafc";
  desenharTextoInteiroCanvas(ctx, options.footer || "As melhores condicoes para voce sair de carro novo.", 370, 1178, 265, 3, { peso: 800, tamanho: 16, minimo: 9, lineHeight: 19, blockHeight: 54, align: "left" });

  preencherRoundRect(ctx, 90, 1248, 380, 62, 24, layout.accent);
  ctx.fillStyle = "#111111";
  ctx.textAlign = "center";
  ctx.font = "900 31px Arial";
  ctx.fillText("SAIBA MAIS", 280, 1289);
  ctx.strokeStyle = "rgba(255,255,255,.35)";
  ctx.beginPath();
  ctx.moveTo(515, 1248);
  ctx.lineTo(515, 1310);
  ctx.stroke();
  ctx.fillStyle = infoColor;
  ctx.textAlign = "left";
  ctx.font = "900 20px Arial";
  ctx.fillText("CONTATO:", 565, 1270);
  ctx.fillStyle = "#ffffff";
  fonteQueCabeCanvas(ctx, contato, 900, 35, 18, 330);
  ctx.fillText(contato, 565, 1304);
  desenharLogoSemFundoCanvas(ctx, logo, 910, 1262, 112, 58);
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "right";
  fonteQueCabeCanvas(ctx, client?.nome || item.vendedor || item.loja || "Cliente", 900, 15, 9, 210);
  ctx.fillText(String(client?.nome || item.vendedor || item.loja || "Cliente").toUpperCase(), 1026, 1334);
}

function desenharArteAutomovelTresFotosTarjas(ctx, item, client, fotos, logo, siteLogo, options = {}) {
  const w = 1080;
  const h = 1350;
  const config = options.threePhotos || {};
  const defaults = defaultsTarjaAutomovel(item);
  const imgs = [fotos[0], fotos[1] || fotos[0], fotos[2] || fotos[1] || fotos[0]].filter(Boolean);
  const corHexTarja = (value, fallback = "#050505") => /^#[0-9a-f]{6}$/i.test(String(value || "")) ? value : fallback;
  const titleBandColor = corHexTarja(config.titleBandColor || config.bandColor);
  const priceBandColor = corHexTarja(config.priceBandColor || config.bandColor);
  const clientBandColor = corHexTarja(config.clientBandColor || config.bandColor);
  const titleFontSize = Math.max(26, Math.min(74, Number(config.titleFontSize || 48)));
  const priceFontSize = Math.max(28, Math.min(76, Number(config.priceFontSize || 54)));
  const line1 = textoCurtoArte(config.line1 || defaults.line1, 38).toUpperCase();
  const line2 = textoCurtoArte(config.line2 || defaults.line2, 38).toUpperCase();
  const price = textoCurtoArte(config.price || defaults.price, 34).toUpperCase();
  const establishment = String(client?.nome || item.vendedor || item.loja || "Estabelecimento").trim();

  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, 0, w, h);
  const photoH = h / 3;
  for (let index = 0; index < 3; index += 1) {
    const img = imgs[index] || logo || siteLogo;
    desenharImagemCover(ctx, img, 0, index * photoH, w, photoH, 0);
    ctx.fillStyle = "rgba(0,0,0,.08)";
    ctx.fillRect(0, index * photoH, w, photoH);
  }

  const topGrad = ctx.createLinearGradient(0, 0, 0, 190);
  topGrad.addColorStop(0, "rgba(0,0,0,.58)");
  topGrad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = topGrad;
  ctx.fillRect(0, 0, w, 190);

  if (config.showTitle !== false) {
    const titleW = 820;
    const titleH = 96;
    const titleX = 130 + Number(config.titleOffsetX || 0);
    const titleY = 402 + Number(config.titleOffsetY || 0);
    preencherRoundRect(ctx, titleX, titleY, titleW, titleH, 22, hexParaRgbaArte(titleBandColor, .86));
    ctx.fillStyle = "rgba(255,255,255,.10)";
    preencherRoundRect(ctx, titleX + 16, titleY + 8, titleW - 32, 2, 1, "rgba(255,255,255,.10)");
    preencherRoundRect(ctx, titleX + 16, titleY + titleH - 10, titleW - 32, 2, 1, "rgba(255,255,255,.10)");
    desenharLogoSemFundoCanvas(ctx, logo, titleX + 18, titleY + 12, 74, 72);
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "left";
    desenharTextoInteiroCanvas(ctx, line1, titleX + 112, titleY + 12, titleW - 140, 1, {
      peso: 900,
      tamanho: titleFontSize,
      minimo: 22,
      lineHeight: Math.round(titleFontSize * 1.02),
      blockHeight: Math.round(titleFontSize * 1.08),
      align: "left"
    });
    ctx.fillStyle = "rgba(255,255,255,.88)";
    desenharTextoInteiroCanvas(ctx, line2, titleX + 112, titleY + 56, titleW - 140, 1, {
      peso: 800,
      tamanho: Math.max(20, Math.round(titleFontSize * .58)),
      minimo: 16,
      lineHeight: Math.round(titleFontSize * .68),
      blockHeight: Math.round(titleFontSize * .72),
      align: "left"
    });
  }

  if (config.showPrice !== false) {
    const priceW = 650;
    const priceH = 88;
    const priceX = 215 + Number(config.priceOffsetX || 0);
    const priceY = 856 + Number(config.priceOffsetY || 0);
    preencherRoundRect(ctx, priceX, priceY, priceW, priceH, 22, hexParaRgbaArte(priceBandColor, .9));
    ctx.fillStyle = "rgba(255,255,255,.10)";
    preencherRoundRect(ctx, priceX + 16, priceY + 8, priceW - 32, 2, 1, "rgba(255,255,255,.10)");
    preencherRoundRect(ctx, priceX + 16, priceY + priceH - 10, priceW - 32, 2, 1, "rgba(255,255,255,.10)");
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.font = "900 18px Arial";
    ctx.fillText("POR APENAS", priceX + priceW / 2, priceY + 28);
    fonteQueCabeCanvas(ctx, price, 900, priceFontSize, 26, priceW - 52);
    ctx.fillText(price, priceX + priceW / 2, priceY + 70);
  }

  const logoY = 1186;
  if (config.showClient !== false) {
    const clientX = 42 + Number(config.clientOffsetX || 0);
    const clientY = logoY + Number(config.clientOffsetY || 0);
    preencherRoundRect(ctx, clientX, clientY, 486, 110, 22, hexParaRgbaArte(clientBandColor, .62));
    desenharLogoSemFundoCanvas(ctx, logo, clientX + 20, clientY + 18, 92, 74);
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "left";
    fonteQueCabeCanvas(ctx, establishment.toUpperCase(), 900, 24, 13, 340);
    ctx.fillText(establishment.toUpperCase(), clientX + 130, clientY + 50);
    ctx.fillStyle = "rgba(255,255,255,.72)";
    ctx.font = "800 15px Arial";
    ctx.fillText("VEICULO EM DESTAQUE", clientX + 130, clientY + 76);
  }

  if (options.showSiteLogo !== false) {
    const logoRect = retanguloLogoSiteTresFotosArteAutomovel(config);
    desenharImagemContain(
      ctx,
      siteLogo,
      logoRect.x,
      logoRect.y,
      logoRect.w,
      logoRect.h,
      0,
      "rgba(255,255,255,0)"
    );
  }
}

function desenharArteAutomovel(ctx, item, client, fotos, logo, siteLogo, layoutKey, options = {}) {
  const layout = AUTOMOVEL_ARTE_LAYOUTS[layoutKey] || AUTOMOVEL_ARTE_LAYOUTS.showroom;
  const main = fotos[0] || logo || siteLogo;
  const showSiteLogo = options.showSiteLogo !== false;
  const titleAuto = textoTituloAutomovelArte(item, options);
  const footerText = options.footer || "Olá Carlópolis • veículos e oportunidades locais";
  if (layoutKey === "premium4x4") {
    desenharArteAutomovelPremium(ctx, item, client, fotos, logo, siteLogo, layout, options);
    return;
  }
  if (options.formato === "stories") {
    desenharArteAutomovelStories(ctx, item, client, fotos, logo, siteLogo, layout, options);
    return;
  }
  if (fotos.length < 2) {
    desenharArteAutomovelUmaFoto(ctx, item, client, fotos, logo, siteLogo, layout, options);
    return;
  }
  ctx.fillStyle = layout.bg;
  ctx.fillRect(0, 0, 1080, 1080);

  if (layoutKey === "clean") {
    preencherRoundRect(ctx, 38, 38, 1004, 1004, 38, "#ffffff");
    desenharImagemAutoInteira(ctx, main, 70, 160, 655, 520, 30, "#ffffff");
    desenharAutoThumbs(ctx, fotos, 750, 160, 250, 520, layout, true);
    desenharLogosAutoArte(ctx, client, logo, siteLogo, showSiteLogo, layout, 76, 62);
    ctx.fillStyle = layout.accent2;
    ctx.textAlign = "left";
    fonteQueCabeCanvas(ctx, titleAuto, 900, 54, 30, 900);
    ctx.fillText(titleAuto, 78, 744);
    preencherRoundRect(ctx, 78, 790, 405, 82, 22, layout.priceBg);
    ctx.fillStyle = layout.priceText;
    ctx.textAlign = "center";
    fonteQueCabeCanvas(ctx, precoAutomovelArte(item), 900, 39, 23, 360);
    ctx.fillText(precoAutomovelArte(item), 280, 842);
    desenharAutoInfoCards(ctx, item, layout, 78, 905, 925);
  } else if (layoutKey === "dark") {
    desenharImagemAutoInteira(ctx, main, 0, 0, 1080, 690, 0, "#111111");
    const grad = ctx.createLinearGradient(0, 350, 0, 780);
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(.78, layout.bg);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 300, 1080, 500);
    desenharLogosAutoArte(ctx, client, logo, siteLogo, showSiteLogo, layout, 52, 46);
    desenharAutoThumbs(ctx, fotos, 60, 710, 350, 170, layout, false);
    ctx.fillStyle = "#fff";
    ctx.textAlign = "left";
    fonteQueCabeCanvas(ctx, titleAuto, 900, 62, 34, 870);
    ctx.fillText(titleAuto, 54, 630);
    preencherRoundRect(ctx, 620, 704, 382, 92, 26, layout.priceBg);
    ctx.fillStyle = layout.priceText;
    ctx.textAlign = "center";
    fonteQueCabeCanvas(ctx, precoAutomovelArte(item), 900, 43, 25, 330);
    ctx.fillText(precoAutomovelArte(item), 811, 762);
    desenharAutoInfoCards(ctx, item, layout, 54, 915, 972);
  } else if (layoutKey === "orange") {
    preencherRoundRect(ctx, 44, 44, 992, 992, 42, layout.panel);
    desenharImagemAutoInteira(ctx, main, 76, 120, 670, 610, 34, "#ffffff");
    desenharAutoThumbs(ctx, fotos, 770, 120, 218, 610, layout, true);
    desenharLogosAutoArte(ctx, client, logo, siteLogo, showSiteLogo, layout, 80, 780);
    ctx.fillStyle = layout.text;
    ctx.textAlign = "left";
    fonteQueCabeCanvas(ctx, titleAuto, 900, 52, 30, 650);
    ctx.fillText(titleAuto, 80, 792);
    preencherRoundRect(ctx, 612, 780, 370, 88, 24, layout.priceBg);
    ctx.fillStyle = layout.priceText;
    ctx.textAlign = "center";
    fonteQueCabeCanvas(ctx, precoAutomovelArte(item), 900, 40, 24, 320);
    ctx.fillText(precoAutomovelArte(item), 797, 836);
    desenharAutoInfoCards(ctx, item, layout, 80, 912, 900);
  } else if (layoutKey === "blue") {
    preencherRoundRect(ctx, 50, 54, 980, 150, 30, layout.panel);
    desenharLogosAutoArte(ctx, client, logo, siteLogo, showSiteLogo, layout, 74, 70);
    desenharImagemAutoInteira(ctx, main, 50, 230, 980, 520, 36, "#ffffff");
    desenharAutoThumbs(ctx, fotos, 70, 770, 470, 135, layout, false);
    ctx.fillStyle = layout.text;
    ctx.textAlign = "left";
    fonteQueCabeCanvas(ctx, titleAuto, 900, 48, 28, 570);
    ctx.fillText(titleAuto, 580, 812);
    preencherRoundRect(ctx, 580, 840, 390, 74, 22, layout.priceBg);
    ctx.fillStyle = layout.priceText;
    ctx.textAlign = "center";
    fonteQueCabeCanvas(ctx, precoAutomovelArte(item), 900, 36, 22, 340);
    ctx.fillText(precoAutomovelArte(item), 775, 887);
    desenharAutoInfoCards(ctx, item, layout, 70, 948, 940);
  } else if (layoutKey === "magazine") {
    ctx.fillStyle = "#f9fafb";
    ctx.fillRect(40, 40, 1000, 1000);
    desenharImagemAutoInteira(ctx, main, 70, 260, 580, 520, 0, "#ffffff");
    desenharAutoThumbs(ctx, fotos, 680, 260, 300, 520, layout, true);
    desenharLogosAutoArte(ctx, client, logo, siteLogo, showSiteLogo, layout, 70, 70);
    ctx.fillStyle = layout.text;
    ctx.textAlign = "left";
    fonteQueCabeCanvas(ctx, titleAuto, 900, 58, 32, 880);
    ctx.fillText(titleAuto, 70, 180);
    ctx.fillStyle = layout.accent;
    ctx.font = "900 23px Arial";
    ctx.fillText("OPORTUNIDADE AUTOMOTIVA", 70, 220);
    preencherRoundRect(ctx, 70, 810, 425, 82, 0, layout.priceBg);
    ctx.fillStyle = layout.priceText;
    ctx.textAlign = "center";
    fonteQueCabeCanvas(ctx, precoAutomovelArte(item), 900, 39, 23, 370);
    ctx.fillText(precoAutomovelArte(item), 282, 862);
    desenharAutoInfoCards(ctx, item, layout, 70, 930, 900);
  } else {
    desenharImagemAutoInteira(ctx, main, 44, 155, 700, 610, 34, "#ffffff");
    desenharAutoThumbs(ctx, fotos, 770, 155, 235, 610, layout, true);
    desenharLogosAutoArte(ctx, client, logo, siteLogo, showSiteLogo, layout, 54, 42);
    ctx.fillStyle = layout.text;
    ctx.textAlign = "left";
    fonteQueCabeCanvas(ctx, titleAuto, 900, 55, 31, 920);
    ctx.fillText(titleAuto, 54, 835);
    preencherRoundRect(ctx, 54, 872, 410, 80, 22, layout.priceBg);
    ctx.fillStyle = layout.priceText;
    ctx.textAlign = "center";
    fonteQueCabeCanvas(ctx, precoAutomovelArte(item), 900, 38, 23, 360);
    ctx.fillText(precoAutomovelArte(item), 259, 923);
    desenharAutoInfoCards(ctx, item, layout, 54, 978, 970);
  }

  desenharRodapeAutomovelArte(ctx, footerText, layout, 1080, 1022);
}

function renderAutomovelArteOptions() {
  const select = $("automovelArteItem");
  if (!select) return;
  const atual = select.value || state.selectedAutomovelArtId;
  const anterior = state.selectedAutomovelArtId;
  const list = state.automoveis.filter(itemBelongsToCurrentClient);
  select.innerHTML = list.length
    ? list.map((item) => {
      const titulo = [item.marca, item.modelo, item.ano].filter(Boolean).join(" ") || item.id;
      return `<option value="${escapeAttr(item.id)}" ${item.id === atual ? "selected" : ""}>${escapeHtml(titulo)}</option>`;
    }).join("")
    : `<option value="">Nenhum veiculo cadastrado</option>`;
  if (atual && list.some((item) => item.id === atual)) select.value = atual;
  state.selectedAutomovelArtId = select.value || "";
  if (state.selectedAutomovelArtId && state.selectedAutomovelArtId !== anterior && $("automovelArtePreview")) {
    agendarPreviaArteAutomovel(150);
  }
}

async function criarCanvasArteAutomovel(autoId = $("automovelArteItem")?.value, layoutKey = "premium45", options = opcoesArteAutomovel()) {
  if (!canGenerateVeiculoImages()) return showToast("A geracao de imagens de veiculos nao esta liberada para este usuario.");
  const item = state.automoveis.find((auto) => auto.id === autoId && itemBelongsToCurrentClient(auto));
  if (!item) return showToast("Selecione um veiculo para gerar a imagem.");
  const client = donoAutomovelAdmin(item);
  const fotosCandidatas = automovelImagensCandidatasAdmin(item);
  const [logo, siteLogo, ...loadedFotos] = await Promise.all([
    carregarImagemCanvas(logoClienteImovelAdmin(client)),
    carregarImagemCanvas("../images/img_padrao_site/logo_1.png"),
    ...fotosCandidatas.slice(0, 4).map((url) => carregarImagemCanvas(url))
  ]);
  const fotos = loadedFotos.filter(Boolean);
  if (!fotos.length) {
    showToast("Nao foi possivel carregar as fotos deste veiculo.");
    return null;
  }
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1350;
  const ctx = canvas.getContext("2d");
  if ((options.formato || layoutKey) === "tresFotosTarjas") {
    desenharArteAutomovelTresFotosTarjas(ctx, item, client, fotos, logo || siteLogo, siteLogo, options);
  } else {
    desenharArteAutomovelPremium45(ctx, item, client, fotos, logo || siteLogo, siteLogo, options);
  }
  return { canvas, item };
}

function agendarPreviaArteAutomovel(delay = 450) {
  clearTimeout(automovelArtePreviewTimer);
  automovelArtePreviewTimer = setTimeout(() => atualizarPreviaArteAutomovel({ silent: true }), delay);
}

async function atualizarPreviaArteAutomovel({ silent = false } = {}) {
  const preview = $("automovelArtePreview");
  if (!preview) return;
  if (automovelArtePreviewRendering) {
    automovelArtePreviewQueued = true;
    return;
  }
  automovelArtePreviewRendering = true;
  const button = $("previewAutomovelArtButton");
  if (button) button.disabled = true;
  if (!silent) showToast("Atualizando previa do veiculo...");
  try {
    const result = await criarCanvasArteAutomovel($("automovelArteItem")?.value || state.selectedAutomovelArtId, "premium45", opcoesArteAutomovel());
    if (!result?.canvas) return;
    preview.width = result.canvas.width;
    preview.height = result.canvas.height;
    const ctx = preview.getContext("2d");
    ctx.clearRect(0, 0, preview.width, preview.height);
    ctx.drawImage(result.canvas, 0, 0);
    if (!silent) showToast("Previa atualizada.");
  } catch (error) {
    console.error("Erro ao atualizar previa do automovel.", error);
    if (!silent) showToast("Nao foi possivel atualizar a previa.");
  } finally {
    automovelArtePreviewRendering = false;
    if (button) button.disabled = false;
    if (automovelArtePreviewQueued) {
      automovelArtePreviewQueued = false;
      atualizarPreviaArteAutomovel({ silent: true });
    }
  }
}

async function gerarArteInstagramAutomovel(autoId = $("automovelArteItem")?.value, layoutKey = "premium45", options = opcoesArteAutomovel()) {
  const button = $("generateAutomovelArtButton");
  if (button) button.disabled = true;
  showToast("Gerando arte premium do veiculo...");
  try {
    const result = await criarCanvasArteAutomovel(autoId, layoutKey, options);
    if (!result?.canvas) return;
    const blob = await canvasParaBlob(result.canvas);
    baixarBlobCanvas(blob, `arte-premium-veiculo-${slugify(result.item.codRef || result.item.marca || result.item.id)}.png`);
    showToast("Arte premium do veiculo gerada.");
  } catch (error) {
    console.error("Erro ao gerar post do automovel.", error);
    showToast("Nao foi possivel gerar o post do veiculo.");
  } finally {
    if (button) button.disabled = false;
  }
}

function renderAutomoveisList() {
  const box = $("automoveisList");
  if (!box) return;
  renderAutomovelArteOptions();
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
        <div class="list-card-actions">
          ${canGenerateVeiculoImages() ? `<button type="button" data-art-automovel="${escapeAttr(item.id)}"><i class="fa-solid fa-wand-magic-sparkles"></i> Arte premium</button>` : ""}
          ${hasPermission("veiculos") ? `<button type="button" data-edit-automovel="${escapeAttr(item.id)}">Editar</button>` : ""}
          ${hasPermission("veiculos") ? `<button type="button" class="danger-mini" data-delete-automovel="${escapeAttr(item.id)}"><i class="fa-solid fa-trash"></i> Excluir</button>` : ""}
        </div>
      </article>
    `;
  }).join("");
  box.querySelectorAll("[data-art-automovel]").forEach((button) => {
    button.addEventListener("click", () => {
      if ($("automovelArteItem")) $("automovelArteItem").value = button.dataset.artAutomovel || "";
      state.selectedAutomovelArtId = button.dataset.artAutomovel || "";
      gerarArteInstagramAutomovel(button.dataset.artAutomovel, "premium45");
    });
  });
  box.querySelectorAll("[data-edit-automovel]").forEach((button) => {
    button.addEventListener("click", () => {
      const item = state.automoveis.find((auto) => auto.id === button.dataset.editAutomovel && itemBelongsToCurrentClient(auto));
      if (item) fillAutomovelForm(item);
    });
  });
  box.querySelectorAll("[data-delete-automovel]").forEach((button) => {
    button.addEventListener("click", async () => {
      await excluirAutomovelPorId(button.dataset.deleteAutomovel || "");
    });
  });
}

async function excluirAutomovelPorId(automovelId) {
  if (!automovelId) return;
  const original = state.automoveis.find((item) => item.id === automovelId);
  if (!original || !itemBelongsToCurrentClient(original)) {
    showToast("Voce nao tem permissao para excluir este automovel.");
    return;
  }
  const titulo = [original.marca, original.modelo, original.ano].filter(Boolean).join(" ") || original.codRef || original.id;
  if (!(await confirmarExclusao(titulo, "automovel"))) return;
  await remove(ref(db, `conteudosInformativos/automoveis/${automovelId}`));
  await removerNovidadesPorDestino("veiculo", automovelId, automovelId);
  showToast("Automovel excluido.");
  if (state.selectedAutomovelId === automovelId) resetAutomovelForm();
  await loadAllData();
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
  if ($("infoWhatsappGroupClientSearch")) $("infoWhatsappGroupClientSearch").value = "";
  fillInfoWhatsappGroupClientSelect();
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
  const client = state.clientes.find((entry) => entry.id === item.clienteId);
  if ($("infoWhatsappGroupClientSearch")) $("infoWhatsappGroupClientSearch").value = client?.nome || item.clienteNome || "";
  fillInfoWhatsappGroupClientSelect(item.clienteId || "");
  $("deleteInfoWhatsappGroupButton")?.classList.remove("hidden");
  openFormForEdit("infoWhatsappGroupForm");
}

function getInfoWhatsappGroupFormData() {
  const nome = $("infoWhatsappGroupName").value.trim();
  const link = $("infoWhatsappGroupLink").value.trim();
  const image = $("infoWhatsappGroupImage").value.trim() || $("infoWhatsappGroupImageUrl").value.trim();
  const baseId = $("infoWhatsappGroupId").value || slugify(nome || `grupo-${Date.now()}`);
  const clienteId = $("infoWhatsappGroupClient")?.value || "";
  const client = state.clientes.find((item) => item.id === clienteId);
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
    clienteId,
    clienteNome: client?.nome || "",
    origem: "painel",
    updatedAt: serverTimestamp(),
    updatedBy: state.user?.uid || ""
  });
}

function fillInfoWhatsappGroupClientSelect(selectedId = "") {
  const select = $("infoWhatsappGroupClient");
  if (!select) return;
  const currentSelectedId = selectedId || select.value || "";
  const query = normalizeName($("infoWhatsappGroupClientSearch")?.value || "");
  const clients = [...state.clientes]
    .sort((a, b) => String(a.nome || a.id || "").localeCompare(String(b.nome || b.id || ""), "pt-BR", { sensitivity: "base" }))
    .filter((client) => {
      if (!query || client.id === currentSelectedId) return true;
      return normalizeName(`${client.nome || ""} ${client.id || ""} ${client.categoria || ""}`).includes(query);
    });
  select.innerHTML = `<option value="">Sem cliente associado</option>` + clients.map((client) => (
    `<option value="${escapeAttr(client.id)}">${escapeHtml(client.nome || client.id)}</option>`
  )).join("");
  if (currentSelectedId && clients.some((client) => client.id === currentSelectedId)) select.value = currentSelectedId;
}

function renderInfoWhatsappGroupsList() {
  const box = $("infoWhatsappGroupList");
  if (!box) return;

  const q = normalizeName($("infoWhatsappGroupSearch")?.value || "");
  const list = state.gruposWhatsapp.filter((item) => {
    const client = state.clientes.find((entry) => entry.id === item.clienteId);
    const hay = normalizeName(`${item.nome || item.name || ""} ${item.descricao || item.description || ""} ${item.link || ""} ${client?.nome || item.clienteNome || ""}`);
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
      <div class="list-meta"><strong>Cliente:</strong> ${escapeHtml(state.clientes.find((client) => client.id === item.clienteId)?.nome || item.clienteNome || "Nao associado")}</div>
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

function resetNewsForm() {
  $("newsForm")?.reset();
  if ($("newsId")) $("newsId").value = "";
  if ($("newsMainImageUrl")) $("newsMainImageUrl").value = "";
  if ($("newsDate")) $("newsDate").value = new Date().toISOString().slice(0, 10);
  if ($("newsTime")) $("newsTime").value = new Date().toTimeString().slice(0, 5);
  if ($("newsShowHome")) $("newsShowHome").checked = true;
  state.noticiaExtraImages = [];
  $("deleteNewsButton")?.classList.add("hidden");
  renderNewsImagesPreview();
  updateNewsSummaryCount();
}

function updateNewsSummaryCount() {
  if ($("newsSummaryCount")) $("newsSummaryCount").textContent = `${$("newsSummary")?.value.length || 0}/240`;
}

function renderNewsImagesPreview() {
  const main = $("newsMainImagePreview");
  const mainUrl = $("newsMainImageUrl")?.value || "";
  if (main) main.innerHTML = mainUrl ? `<img src="${escapeAttr(mainUrl)}" alt="Imagem principal da noticia">` : `<div class="list-meta">Nenhuma imagem principal enviada.</div>`;
  const extras = $("newsExtraImagesPreview");
  if (!extras) return;
  extras.innerHTML = state.noticiaExtraImages.length
    ? state.noticiaExtraImages.map((url, index) => `<article class="image-card"><img src="${escapeAttr(url)}" alt="Imagem extra"><button type="button" data-remove-news-image="${index}" class="danger-button"><i class="fa-solid fa-trash"></i></button></article>`).join("")
    : `<div class="list-meta">Nenhuma imagem extra.</div>`;
  extras.querySelectorAll("[data-remove-news-image]").forEach((button) => button.addEventListener("click", () => {
    state.noticiaExtraImages.splice(Number(button.dataset.removeNewsImage), 1);
    renderNewsImagesPreview();
  }));
}

async function uploadNewsImage(file, extra = false) {
  if (!file) return "";
  const owner = state.user?.uid || "admin";
  const newsId = $("newsId")?.value || slugify($("newsTitle")?.value || `noticia-${Date.now()}`);
  const path = `noticias/${owner}/${newsId}/${extra ? "extras" : "principal"}/${Date.now()}-${slugify(file.name || "imagem")}`;
  return uploadFileWithProgress(storageRef(storage, path), file, "Enviando imagem da noticia", file.name || "imagem");
}

function newsFormPayload(forcedStatus = "") {
  const current = state.noticias.find((item) => item.id === $("newsId")?.value) || {};
  const title = $("newsTitle").value.trim();
  const status = forcedStatus || $("newsStatus").value || "rascunho";
  return cleanForFirebase({
    id: $("newsId").value || slugify(`${title}-${Date.now()}`),
    tipoInformacao: $("newsCategory").value,
    categoria: $("newsCategory").value,
    titulo: title,
    resumoCurto: $("newsSummary").value.trim(),
    textoCompleto: $("newsContent").value.trim(),
    imagemPrincipalUrl: $("newsMainImageUrl").value.trim(),
    imagensExtrasUrls: [...state.noticiaExtraImages],
    dataPublicacao: $("newsDate").value,
    horaPublicacao: $("newsTime").value,
    local: $("newsLocation").value.trim(),
    fonteMateria: $("newsSource").value.trim(),
    linkPublicacaoOficial: $("newsOfficialLink").value.trim(),
    whatsappContato: $("newsWhatsapp").value.trim(),
    textoBotaoWhatsapp: $("newsWhatsappText").value.trim(),
    status,
    exibirNaHome: $("newsShowHome").checked,
    destaquePrincipal: $("newsFeatured").checked,
    patrocinado: $("newsSponsored").checked,
    textoPatrocinado: $("newsSponsoredText").value.trim(),
    dataExpiracao: $("newsExpiration").value || "",
    ordem: Number($("newsOrder").value || 0),
    slug: slugify($("newsSlug").value.trim() || title),
    createdAt: current.createdAt || serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: current.createdBy || state.user?.uid || "",
    createdByName: current.createdByName || state.profile?.nome || state.user?.email || "",
    updatedBy: state.user?.uid || "",
    updatedByName: state.profile?.nome || state.user?.email || ""
  });
}

async function saveNews(forcedStatus = "") {
  const payload = newsFormPayload(forcedStatus);
  if (!payload.titulo || !payload.tipoInformacao) return showToast("Informe titulo e categoria.");
  if (payload.status === "publicado" && (!payload.resumoCurto || !payload.textoCompleto)) return showToast("Para publicar, informe resumo e texto completo.");
  await firebaseSet(ref(db, `noticias/${payload.id}`), payload);
  showToast(payload.status === "rascunho" ? "Rascunho salvo." : "Noticia salva.");
  await loadAllData();
  resetNewsForm();
}

function fillNewsForm(item) {
  $("newsId").value = item.id || "";
  $("newsCategory").value = item.tipoInformacao || item.categoria || "";
  $("newsStatus").value = item.status || "rascunho";
  $("newsTitle").value = item.titulo || "";
  $("newsSlug").value = item.slug || "";
  $("newsSummary").value = item.resumoCurto || "";
  $("newsContent").value = item.textoCompleto || "";
  $("newsDate").value = item.dataPublicacao || "";
  $("newsTime").value = item.horaPublicacao || "";
  $("newsLocation").value = item.local || "";
  $("newsSource").value = item.fonteMateria || "";
  $("newsOfficialLink").value = item.linkPublicacaoOficial || "";
  $("newsWhatsapp").value = item.whatsappContato || "";
  $("newsWhatsappText").value = item.textoBotaoWhatsapp || "";
  $("newsExpiration").value = item.dataExpiracao || "";
  $("newsOrder").value = Number(item.ordem || 0);
  $("newsShowHome").checked = item.exibirNaHome !== false;
  $("newsFeatured").checked = Boolean(item.destaquePrincipal);
  $("newsSponsored").checked = Boolean(item.patrocinado);
  $("newsSponsoredText").value = item.textoPatrocinado || "";
  $("newsMainImageUrl").value = item.imagemPrincipalUrl || "";
  state.noticiaExtraImages = Array.isArray(item.imagensExtrasUrls) ? [...item.imagensExtrasUrls] : [];
  $("deleteNewsButton").classList.remove("hidden");
  updateNewsSummaryCount();
  renderNewsImagesPreview();
}

function renderNewsAdminList() {
  const box = $("newsAdminList");
  if (!box) return;
  const q = normalizeName($("newsAdminSearch")?.value || "");
  const list = state.noticias.filter((item) => !q || normalizeName(`${item.titulo} ${item.tipoInformacao} ${item.status}`).includes(q));
  box.innerHTML = list.length ? list.map((item) => `
    <article class="list-card news-admin-card">
      ${item.imagemPrincipalUrl ? `<img src="${escapeAttr(item.imagemPrincipalUrl)}" alt="${escapeAttr(item.titulo)}">` : `<div class="news-admin-placeholder"><i class="fa-solid fa-newspaper"></i></div>`}
      <div class="list-title">${escapeHtml(item.titulo || "Sem titulo")}</div>
      <div class="list-meta">${escapeHtml(item.tipoInformacao || "Sem categoria")} · ${escapeHtml(item.dataPublicacao || "Sem data")}</div>
      <div class="news-admin-badges"><span class="badge ${escapeAttr(item.status || "rascunho")}">${escapeHtml(item.status || "rascunho")}</span>${item.exibirNaHome ? `<span class="badge ativo">Home</span>` : ""}${item.destaquePrincipal ? `<span class="badge pendente">Destaque</span>` : ""}</div>
      <div class="form-actions">
        <button type="button" data-edit-news="${escapeAttr(item.id)}"><i class="fa-solid fa-pen"></i> Editar</button>
        <button type="button" class="ghost-button" data-preview-news="${escapeAttr(item.slug || item.id)}"><i class="fa-solid fa-eye"></i> Visualizar</button>
        <button type="button" class="ghost-button" data-toggle-news="${escapeAttr(item.id)}">${item.status === "publicado" ? "Inativar" : "Publicar"}</button>
      </div>
    </article>`).join("") : `<div class="list-meta">Nenhuma noticia cadastrada.</div>`;
  box.querySelectorAll("[data-edit-news]").forEach((button) => button.addEventListener("click", () => {
    const item = state.noticias.find((news) => news.id === button.dataset.editNews);
    if (item) fillNewsForm(item);
  }));
  box.querySelectorAll("[data-preview-news]").forEach((button) => button.addEventListener("click", () => window.open(`../index.html?noticia=${encodeURIComponent(button.dataset.previewNews)}`, "_blank")));
  box.querySelectorAll("[data-toggle-news]").forEach((button) => button.addEventListener("click", async () => {
    const item = state.noticias.find((news) => news.id === button.dataset.toggleNews);
    if (!item) return;
    if (item.status !== "publicado" && (!item.resumoCurto || !item.textoCompleto)) return showToast("Complete resumo e texto antes de publicar.");
    await firebaseUpdate(ref(db, `noticias/${item.id}`), { status: item.status === "publicado" ? "inativo" : "publicado", updatedAt: serverTimestamp(), updatedBy: state.user?.uid || "" });
    await loadAllData();
  }));
}

function renderFinanceiro() {
  const box = $("financeList");
  if (!box) return;

  const filter = $("financeFilter")?.value || "todos";
  const planFilter = $("financePlanFilter")?.value || "todos";
  const q = String($("financeSearch")?.value || "").toLowerCase().trim();
  const list = state.clientes.filter((client) => {
    const matchesFilter = filter === "todos" || effectivePaymentStatus(client) === filter;
    const matchesPlan = planFilter === "todos" || (client.tipoPlano || "mensal") === planFilter;
    const hay = `${client.nome || ""} ${client.categoria || ""} ${client.contato || ""}`.toLowerCase();
    return matchesFilter && matchesPlan && (!q || hay.includes(q));
  });

  const activeBillable = state.clientes.filter((client) => client.status === "ativo" && isBillableClientType(client));
  const currentMonth = currentMonthKey();
  const monthlyClients = activeBillable.filter((client) => (client.tipoPlano || "mensal") === "mensal");
  const paid = monthlyClients.filter((client) => financePaymentStatusForMonth(client, currentMonth) === "pago");
  const open = monthlyClients.filter((client) => financePaymentStatusForMonth(client, currentMonth) === "em_aberto");
  const free = activeBillable.filter((client) => effectivePaymentStatus(client) === "isento");
  const paidValue = paid.reduce((sum, client) => sum + financeInvoiceValueForMonth(client, currentMonth), 0);
  const openValue = open.reduce((sum, client) => sum + financeInvoiceValueForMonth(client, currentMonth), 0);
  const revenueClients = activeBillable.filter((client) => effectivePaymentStatus(client) !== "isento");
  const annualActiveClients = revenueClients.filter((client) => client.tipoPlano === "anual");
  const annualPaidClients = annualActiveClients.filter((client) => effectivePaymentStatus(client) === "pago");
  const clientsByPlan = {
    mensal: revenueClients.filter((client) => (client.tipoPlano || "mensal") === "mensal"),
    semestral: revenueClients.filter((client) => client.tipoPlano === "semestral"),
    anual: annualPaidClients
  };
  const revenues = Object.fromEntries(Object.entries(clientsByPlan).map(([plan, clients]) => [
    plan,
    clients.reduce((sum, client) => sum + valorFinalPlano(client), 0)
  ]));

  $("financePaid").textContent = `${paid.length} - ${moneyBR(paidValue)}`;
  $("financeOpen").textContent = `${open.length} - ${moneyBR(openValue)}`;
  $("financeFree").textContent = String(free.length);
  $("financeMonthlyRevenue").textContent = moneyBR(revenues.mensal);
  $("financeSemiannualRevenue").textContent = moneyBR(revenues.semestral);
  $("financeAnnualRevenue").textContent = moneyBR(revenues.anual);
  $("financeMonthlyCount").textContent = `${clientsByPlan.mensal.length} cliente${clientsByPlan.mensal.length === 1 ? "" : "s"}`;
  $("financeSemiannualCount").textContent = `${clientsByPlan.semestral.length} cliente${clientsByPlan.semestral.length === 1 ? "" : "s"}`;
  $("financeAnnualCount").textContent = `${clientsByPlan.anual.length} cliente${clientsByPlan.anual.length === 1 ? "" : "s"}`;

  const annualDueList = $("financeAnnualDueList");
  $("financeAnnualSummary")?.classList.toggle("hidden", !isMaster());
  if (annualDueList) {
    const dueOrder = $("financeAnnualDueOrder")?.value || "proximos";
    annualDueList.innerHTML = annualActiveClients.length
      ? [...annualActiveClients]
        .sort((a, b) => {
          if (dueOrder === "nome") {
            return String(a.nome || a.id || "").localeCompare(String(b.nome || b.id || ""), "pt-BR");
          }
          const aDate = financePlanDueDate(a);
          const bDate = financePlanDueDate(b);
          if (!aDate && !bDate) return String(a.nome || a.id || "").localeCompare(String(b.nome || b.id || ""), "pt-BR");
          if (!aDate) return 1;
          if (!bDate) return -1;
          const dateCompare = aDate.localeCompare(bDate);
          return dueOrder === "distantes" ? -dateCompare : dateCompare;
        })
        .map((client) => {
          const dueDate = financePlanDueDate(client);
          const renewal = financePlanRenewalStatus(dueDate);
          return `
            <article class="finance-due-item ${renewal.warning ? "renewal-warning" : ""}">
              <strong>${escapeHtml(client.nome || client.id)}</strong>
              <span>${moneyBR(valorFinalPlano(client))}</span>
              <small>${dueDate ? `${escapeHtml(renewal.label)}: ${escapeHtml(formatDateBR(dueDate))}` : "Vencimento anual nao definido"}</small>
            </article>
          `;
        }).join("")
      : `<div class="list-meta">Nenhum plano anual ativo para contabilizar.</div>`;
  }

  if (!list.length) {
    box.innerHTML = `<div class="list-meta">Nenhum cliente no filtro selecionado.</div>`;
    return;
  }

  box.innerHTML = list.map((client) => {
    const pendingMonths = new Set(pendingMonthsForClient(client));
    const monthOptions = financeMonthOptionsForClient(client);
    const latestInvoice = latestClientInvoice(client);
    const selectedPlan = client.tipoPlano || "mensal";
    const selectedPlanValue = financePlanValue(client, selectedPlan);
    return `
    <article class="finance-row" data-client-id="${escapeAttr(client.id)}">
      <div>
        <div class="list-title">${escapeHtml(client.nome || client.id)}</div>
        <div class="list-meta">${escapeHtml(client.categoria || "Sem categoria")} - ${escapeHtml(client.contato || "Sem telefone")}</div>
        <div class="list-meta" data-finance-plan-summary>Plano: ${planLabel(selectedPlan)} - Valor final: ${moneyBR(Math.max(0, selectedPlanValue - numberFromMoney(client.descontoValor || 0)))}</div>
        ${selectedPlan === "anual" || selectedPlan === "semestral"
          ? `<div class="list-meta">Vencimento do plano: ${financePlanDueDate(client) ? escapeHtml(formatDateBR(financePlanDueDate(client))) : "nao definido"}</div>`
          : ""}
        ${client.destaqueSemanal ? `<div class="list-meta">Destaque: ${moneyBR(destaqueValueForClient(client))} (${destaqueBillingForClient(client) === "pix_separado" ? "Pix separado" : "mensalidade"})</div>` : ""}
        <div class="list-meta">Meses em aberto: ${pendingMonthsForClient(client).map(monthLabel).join(", ") || "Nenhum"}</div>
      </div>
      <label>Status
        <select data-finance-field="pagamentoStatus" ${isBillableClientType(client) ? "" : "disabled"}>
          <option value="em_aberto" ${effectivePaymentStatus(client) === "em_aberto" ? "selected" : ""}>Em aberto</option>
          <option value="pago" ${effectivePaymentStatus(client) === "pago" ? "selected" : ""}>Pago</option>
          <option value="isento" ${effectivePaymentStatus(client) === "isento" ? "selected" : ""}>Isento</option>
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
          <option value="mensal" ${selectedPlan === "mensal" ? "selected" : ""}>Mensal</option>
          <option value="semestral" ${selectedPlan === "semestral" ? "selected" : ""}>Semestral</option>
          <option value="anual" ${selectedPlan === "anual" ? "selected" : ""}>Anual</option>
        </select>
      </label>
      <label>Valor<input data-finance-field="valorPlano" value="${escapeAttr(moneyBR(selectedPlanValue))}" data-plan-value="${escapeAttr(selectedPlanValue)}" placeholder="R$" ${isMaster() ? "" : "readonly"}></label>
      <label>Desconto<input data-finance-field="descontoValor" value="${escapeAttr(client.descontoValor || "")}" placeholder="R$"></label>
      <label>Dia de vencimento
        <input data-finance-field="vencimentoDia" type="number" min="1" max="31" step="1" inputmode="numeric" value="${escapeAttr(client.vencimentoDia || "")}" placeholder="Padrão: ${escapeAttr(state.pagamentoSistema?.vencimentoDiaPadrao || "último dia")}">
      </label>
      <label>Data venc. do plano<input data-finance-field="vencimentoDataPlano" type="date" value="${escapeAttr(selectedPlan === "anual" || selectedPlan === "semestral" ? financePlanDueDate(client) : "")}"></label>
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
        ${invoiceReceiptButton(latestInvoice)}
      </label>
      <div class="finance-boleto-actions">
        <label>Qtd. boletos
          <select data-finance-boleto-quantity>
            ${Array.from({ length: 12 }, (_, index) => `<option value="${index + 1}">${index + 1}</option>`).join("")}
          </select>
        </label>
        <button type="button" data-generate-finance-boletos="${escapeAttr(client.id)}"><i class="fa-solid fa-print"></i> Gerar boleto</button>
      </div>
      <button type="button" data-save-finance="${escapeAttr(client.id)}">Salvar</button>
    </article>
  `; }).join("");

  bindInvoiceReceiptButtons(box);

  box.querySelectorAll(".finance-row").forEach((row) => {
    row.querySelector('[data-finance-field="tipoPlano"]')?.addEventListener("change", () => {
      syncFinanceRowPlanValue(row);
    });
    row.querySelector('[data-finance-field="descontoValor"]')?.addEventListener("input", () => {
      const planSelect = row.querySelector('[data-finance-field="tipoPlano"]');
      const valueInput = row.querySelector('[data-finance-field="valorPlano"]');
      const summary = row.querySelector("[data-finance-plan-summary]");
      if (!planSelect || !valueInput || !summary) return;
      const finalValue = Math.max(0, numberFromMoney(valueInput.value) - numberFromMoney(row.querySelector('[data-finance-field="descontoValor"]')?.value || 0));
      summary.textContent = `Plano: ${planLabel(planSelect.value)} - Valor final: ${moneyBR(finalValue)}`;
    });
  });

  box.querySelectorAll("[data-save-finance]").forEach((button) => {
    button.addEventListener("click", async () => {
      const row = button.closest(".finance-row");
      const id = button.dataset.saveFinance;
      const payload = {};
      row.querySelectorAll("[data-finance-field]").forEach((field) => {
        payload[field.dataset.financeField] = ["valorPlano", "descontoValor"].includes(field.dataset.financeField)
          ? numberFromMoney(field.value)
          : (field.dataset.financeField === "vencimentoDia" ? normalizeDueDay(field.value) : field.value.trim());
      });
      const mesesEmAberto = [...row.querySelectorAll("[data-finance-month]:checked")].map((input) => input.value).sort();
      const currentClient = state.clientes.find((client) => client.id === id) || {};
      const nextClient = { ...currentClient, ...payload };
      const publicPayload = {};
      if (Object.prototype.hasOwnProperty.call(payload, "status")) {
        publicPayload.status = payload.status;
        delete payload.status;
      }
      const valorPlanoFatura = valorFinalPlano(nextClient);
      payload.mesesEmAberto = mesesEmAberto;
      mesesEmAberto.forEach((mes) => {
        const valorDestaqueFatura = destaqueIncludedInInvoiceMonth(nextClient, mes) ? destaqueValueForClient(nextClient) : 0;
        payload[`faturas/${mes}/mes`] = mes;
        payload[`faturas/${mes}/status`] = "em_aberto";
        payload[`faturas/${mes}/valorPlano`] = valorPlanoFatura;
        payload[`faturas/${mes}/valorDestaque`] = valorDestaqueFatura;
        payload[`faturas/${mes}/valorTotal`] = valorPlanoFatura + valorDestaqueFatura;
        payload[`faturas/${mes}/updatedAt`] = Date.now();
      });
      if (!isMaster()) delete payload.valorPlano;
      payload.updatedAt = serverTimestamp();
      payload.updatedBy = state.user?.uid || "";
      payload.origem = "painel";
      payload.editadoNoPainel = true;
      if (Object.keys(publicPayload).length) {
        publicPayload.updatedAt = serverTimestamp();
        publicPayload.updatedBy = state.user?.uid || "";
        publicPayload.origem = "painel";
        publicPayload.editadoNoPainel = true;
        await update(ref(db, `clientes/${id}`), publicPayload);
      }
      await update(ref(db, `clientesFinanceiro/${id}`), payload);
      await loadAllData();
      renderStats();
      renderClientsList();
      fillUserClientSelect();
      fillEventClientSelect();
      showToast("Financeiro atualizado.");
      renderFinanceiro();
      renderReports();
    });
  });

  box.querySelectorAll("[data-generate-finance-boletos]").forEach((button) => {
    button.addEventListener("click", () => {
      const row = button.closest(".finance-row");
      const client = state.clientes.find((item) => item.id === button.dataset.generateFinanceBoletos);
      if (!row || !client) return;
      const quantity = Number(row.querySelector("[data-finance-boleto-quantity]")?.value || 1);
      const selectedMonths = [...row.querySelectorAll("[data-finance-month]:checked")].map((input) => input.value).sort();
      const startMonth = selectedMonths[0] || currentMonthKey();
      const payload = {};
      row.querySelectorAll("[data-finance-field]").forEach((field) => {
        payload[field.dataset.financeField] = ["valorPlano", "descontoValor"].includes(field.dataset.financeField)
          ? numberFromMoney(field.value)
          : (field.dataset.financeField === "vencimentoDia" ? normalizeDueDay(field.value) : field.value.trim());
      });
      const plannedClient = { ...client, ...payload };
      const invoices = buildInvoiceBatch(plannedClient, quantity, startMonth, { ignoreSaved: true });
      openPrintableBoletos(plannedClient, invoices);
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
          : (field.dataset.financeField === "vencimentoDia" ? normalizeDueDay(field.value) : field.value.trim());
      });
      const nextClient = { ...currentClient, ...payloadBase };
      const publicPayload = {};
      if (Object.prototype.hasOwnProperty.call(payloadBase, "status")) {
        publicPayload.status = payloadBase.status;
        delete payloadBase.status;
      }
      const valorPlanoFatura = valorFinalPlano(nextClient);
      showToast("Enviando comprovante do financeiro...");
      const receipt = await uploadInvoiceReceiptForClient(id, file);
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
        const valorDestaqueFatura = destaqueIncludedInInvoiceMonth(nextClient, mes) ? destaqueValueForClient(nextClient) : 0;
        payload[`faturas/${mes}`] = {
          mes,
          valorPlano: valorPlanoFatura,
          valorDestaque: valorDestaqueFatura,
          valorTotal: valorPlanoFatura + valorDestaqueFatura,
          comprovantePath: receipt.path,
          comprovanteNome: receipt.name,
          comprovanteTipo: receipt.contentType,
          status: payloadBase.pagamentoStatus === "pago" ? "pago" : "em_analise",
          updatedAt: Date.now()
        };
      });
      if (Object.keys(publicPayload).length) {
        publicPayload.updatedAt = serverTimestamp();
        publicPayload.updatedBy = state.user?.uid || "";
        publicPayload.origem = "painel";
        publicPayload.editadoNoPainel = true;
        await update(ref(db, `clientes/${id}`), publicPayload);
      }
      await update(ref(db, `clientesFinanceiro/${id}`), payload);
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

function financePlanDueDate(client = {}) {
  const configured = client.vencimentoDataPlano || client.dataVencimentoPlano || client.vencimentoAnual || "";
  if (configured) return String(configured).slice(0, 10);
  const invoice = latestClientInvoice(client);
  return String(invoice?.vencimento || invoice?.dataVencimento || "").slice(0, 10);
}

function financePlanRenewalStatus(dueDate = "") {
  if (!dueDate) return { warning: false, label: "Vencimento" };
  const date = new Date(`${dueDate}T12:00:00`);
  if (Number.isNaN(date.getTime())) return { warning: false, label: "Vencimento" };
  const now = new Date();
  const currentMonth = now.getFullYear() * 12 + now.getMonth();
  const dueMonth = date.getFullYear() * 12 + date.getMonth();
  if (dueMonth < currentMonth) return { warning: true, label: "Vencido - renovar" };
  if (dueMonth === currentMonth) return { warning: true, label: "Vence neste mes - renovar" };
  return { warning: false, label: "Vencimento" };
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
  if (normalized === "noticiasdacidade") return "Notícias da Cidade";
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
    perfil: "Visualizacao do perfil",
    whatsapp: "WhatsApp",
    whatsapp_promocao: "WhatsApp da promocao",
    grupoWhatsapp: "Grupo WhatsApp",
    cardapio: "Cardapio",
    novidades: "Novidades",
    "gerar-card": "Gerar card",
    fotos: "Fotos",
    divulgacao: "Divulgacao",
    instagram_onde_comer: "Instagram",
    instagram: "Instagram",
    instagram_promocao: "Instagram",
    facebook: "Facebook",
    tiktok: "TikTok",
    site: "Site",
    destaque: "Destaque",
    compartilhamento: "Compartilhamento",
    imovel_visualizacao: "Visualizacao do imovel",
    imovel_fotos: "Fotos do imovel",
    imovel_whatsapp: "WhatsApp do imovel",
    imovel_instagram: "Instagram do imovel",
    veiculo_visualizacao: "Visualizacao do veiculo",
    veiculo_fotos: "Fotos do veiculo",
    veiculo_whatsapp: "WhatsApp do veiculo",
    veiculo_instagram: "Instagram do veiculo",
    noticia_visualizacao: "Visualizacao da noticia",
    noticia_compartilhar: "Compartilhamento da noticia",
    noticia_whatsapp: "WhatsApp da noticia",
    noticia_oficial: "Materia oficial"
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

function buildNewsClickRows(metrics = {}, range = getReportDateRange()) {
  const rows = new Map();
  Object.entries(metrics.cliquesBotoesDetalhado || {}).forEach(([date, dia]) => {
    if (date < range.start || date > range.end) return;
    Object.values(dia || {}).forEach((logs) => {
      Object.values(logs || {}).forEach((item) => {
        if ((item?.area || "") !== "noticias-cidade") return;
        const key = item.noticiaId || item.noticiaSlug || item.tituloConteudo || "noticia-sem-id";
        if (!rows.has(key)) {
          rows.set(key, {
            titulo: item.tituloConteudo || item.titulo || "Notícia",
            tipoInformacao: item.tipoInformacao || "Notícia",
            clicks: {},
            total: 0,
            ultimoAcesso: ""
          });
        }
        const row = rows.get(key);
        const tipo = item.tipo || `noticia_${item.acao || "visualizacao"}`;
        row.clicks[tipo] = Number(row.clicks[tipo] || 0) + 1;
        row.total += 1;
        const ultimo = `${date} ${formatReportTime(item, "")}`;
        if (ultimo > row.ultimoAcesso) row.ultimoAcesso = ultimo;
      });
    });
  });
  return [...rows.values()].sort((a, b) => b.total - a.total);
}

function renderNewsClickReportTable(rows, emptyMessage) {
  if (!rows.length) return `<div class="list-meta">${emptyMessage}</div>`;
  const types = ["noticia_visualizacao", "noticia_oficial", "noticia_whatsapp", "noticia_compartilhar"];
  return `
    <div class="report-table-wrap">
      <table class="report-click-table">
        <thead>
          <tr>
            <th>Notícia</th>
            <th>Tipo</th>
            ${types.map((type) => `<th>${escapeHtml(metricButtonLabel(type))}</th>`).join("")}
            <th>Total</th>
            <th>Último acesso</th>
          </tr>
        </thead>
        <tbody>
          ${rows.slice(0, 30).map((row) => `
            <tr>
              <td><strong>${escapeHtml(row.titulo)}</strong></td>
              <td>${escapeHtml(row.tipoInformacao || "Notícia")}</td>
              ${types.map((type) => `<td>${Number(row.clicks[type] || 0)}</td>`).join("")}
              <td><strong>${row.total}</strong></td>
              <td>${escapeHtml(row.ultimoAcesso ? row.ultimoAcesso.replace(/^(\d{4})-(\d{2})-(\d{2})/, "$3/$2/$1") : "-")}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
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
      codigoReferencia: item.codRef || item.codigoReferencia || "",
      itemId: item.imovelId || item.veiculoId || "",
      origemDescricao: {
        "perfil-cliente": "Pagina do cliente",
        "atalho-home": "Destaques da pagina inicial",
        imoveis: "Tela de imoveis",
        veiculos: "Tela de veiculos",
        promocoes: "Tela de promocoes",
        "onde-comer": "Tela Onde Comer",
        "redes-sociais": "Redes sociais do cliente",
        "noticias-cidade": "Notícias da Cidade"
      }[item.area || area] || item.origem || area || "Site publico",
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

function buildItemAccessRows(metrics = {}, range = getReportDateRange(), clientKeys = null) {
  const rows = new Map();
  const sources = [
    metrics.cliquesBotoesDetalhado || {},
    metrics.cliquesOndeComerDetalhado || {},
    metrics.cliquesPromocoesDetalhado || {}
  ];
  sources.forEach((source) => {
    Object.entries(source).forEach(([date, day]) => {
      if (date < range.start || date > range.end) return;
      Object.entries(day || {}).forEach(([clientKey, logs]) => {
        if (clientKeys && !metricKeyBelongsToClient(clientKey, clientKeys)) return;
        Object.values(logs || {}).forEach((item) => {
          const type = String(item?.tipo || "");
          const match = type.match(/^(imovel|veiculo)_(visualizacao|fotos|whatsapp|instagram)$/);
          if (!match) return;
          const kind = match[1];
          const action = match[2];
          const itemId = item.imovelId || item.veiculoId || item.codRef || item.tituloConteudo || "sem-id";
          const key = `${kind}|${itemId}`;
          if (!rows.has(key)) {
            rows.set(key, {
              kind,
              clientKey,
              codigo: item.codRef || itemId,
              titulo: item.tituloConteudo || itemId,
              visualizacao: 0,
              fotos: 0,
              whatsapp: 0,
              instagram: 0,
              total: 0
            });
          }
          const row = rows.get(key);
          row[action] += 1;
          row.total += 1;
        });
      });
    });
  });
  return [...rows.values()].sort((a, b) => b.total - a.total || String(a.codigo).localeCompare(String(b.codigo), "pt-BR"));
}

function renderItemAccessTable(rows = [], emptyMessage = "Nenhum acesso registrado.") {
  if (!rows.length) return `<div class="list-meta">${escapeHtml(emptyMessage)}</div>`;
  return `
    <div class="report-table-wrap">
      <table class="report-click-table">
        <thead><tr><th>Tipo</th><th>Codigo de referencia</th><th>Anuncio</th><th>Visualizacoes</th><th>WhatsApp</th><th>Fotos</th><th>Instagram</th><th>Total</th></tr></thead>
        <tbody>
          ${rows.map((row) => `
            <tr>
              <td><strong>${row.kind === "imovel" ? "Imovel" : "Veiculo"}</strong></td>
              <td>${escapeHtml(row.codigo || "-")}</td>
              <td>${escapeHtml(row.titulo || "-")}</td>
              <td>${row.visualizacao}</td>
              <td>${row.whatsapp}</td>
              <td>${row.fotos}</td>
              <td>${row.instagram}</td>
              <td><strong>${row.total}</strong></td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
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
  return [...new Set(values.flatMap(aliasKeyVariants).map((value) => normalizeName(value)).filter(Boolean))];
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
  if (/imovel/.test(text)) return "Imoveis";
  if (/veiculo|automovel/.test(text)) return "Veiculos";
  if (/perfil/.test(text)) return "Visualizacao do perfil";
  if (/destaque/.test(text)) return "Destaques";
  if (/compartilh/.test(text)) return "Compartilhamentos";
  if (/grupowhatsapp|grupowhats|grupozap/.test(text)) return "Grupo WhatsApp";
  if (/whatsapppromocao/.test(text)) return "WhatsApp da promocao";
  if (/whatsapp|telefone|contato|zap/.test(text)) return "WhatsApp / telefone";
  if (/cardapio|menu/.test(text)) return "Cardapio";
  if (/foto|fotos|imagem|divulgacao/.test(text)) return "Fotos / divulgacao";
  if (/instagrampromocao/.test(text)) return "Redes sociais / links";
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
            <th>Origem do clique</th>
            <th>Descricao</th>
          </tr>
        </thead>
        <tbody>
          ${rows.slice(0, 200).map((row) => {
            const details = [
              row.promocao ? `Promocao: ${row.promocao}` : "",
              row.tituloConteudo || "",
              row.codigoReferencia ? `Referencia: ${row.codigoReferencia}` : "",
              row.acao || row.tipo || "",
              row.clicouWhatsAppPromocao ? "Clique no WhatsApp da promocao" : ""
            ].filter(Boolean);
            return `
              <tr title="${escapeAttr(row.pagina || "")}">
                <td><strong>${escapeHtml(clientReportCategory(row))}</strong></td>
                <td>${escapeHtml(formatDateBR(row.date))}</td>
                <td><strong>${escapeHtml(row.hora)}</strong></td>
                <td>${escapeHtml(row.origemDescricao || row.area || "Site publico")}</td>
                <td>${escapeHtml(details.join(" - ") || "-")}</td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderClientModuleTimelineTable(rows, moduleLabel, emptyMessage) {
  if (!rows.length) return `<div class="list-meta">${escapeHtml(emptyMessage)}</div>`;
  return `
    <div class="report-table-wrap">
      <table class="report-click-table client-report-click-table">
        <thead><tr><th>Data</th><th>Horario</th><th>Acao</th><th>Codigo de referencia</th><th>Anuncio</th><th>Origem do clique</th></tr></thead>
        <tbody>
          ${rows.slice(0, 200).map((row) => `
            <tr title="${escapeAttr(row.pagina || "")}">
              <td>${escapeHtml(formatDateBR(row.date))}</td>
              <td><strong>${escapeHtml(row.hora)}</strong></td>
              <td>${escapeHtml(row.tipo || moduleLabel)}</td>
              <td>${escapeHtml(row.codigoReferencia || row.itemId || "-")}</td>
              <td>${escapeHtml(row.tituloConteudo || "-")}</td>
              <td>${escapeHtml(row.origemDescricao || row.area || "Site publico")}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function clientReportAvailability(client = {}, counts = {}) {
  const hasContacts = normalizeClientContactDetails(client).length > 0;
  const hasImages = Boolean(client.imagem || client.image || normalizeImageItems(client.imagens).length);
  const hasMenu = Boolean(client.cardapioAtivo || client.menuAtivo || client.exibirCardapio || client.cardapioLink || normalizeUrlList(client.menuImages).length);
  const hasPromotions = normalizePromocoes(client.promocoes).length > 0
    || Boolean(counts.historicoPromocoes)
    || Number(counts.promocoes || 0) > 0
    || Number(counts.whatsappPromocao || 0) > 0;
  const hasWhatsappGroup = Boolean(client.grupoWhatsappAtivo !== false && client.grupoWhatsappLink);
  const hasImoveis = canAccessImoveis() || clienteAssociadoImoveis(client, true) || Number(counts.imoveis || 0) > 0;
  const hasVeiculos = hasPermission("veiculos") || clienteAssociadoAutomoveis(client, true) || Number(counts.veiculos || 0) > 0;
  return {
    whats: hasContacts,
    whatsappPromocao: hasPromotions,
    cardapios: hasPermission("cardapio") && hasMenu,
    fotos: (hasPermission("imagens") || hasPermission("destaque")) && hasImages,
    novidades: Number(counts.novidades || 0) > 0,
    perfil: true,
    imoveis: hasImoveis,
    veiculos: hasVeiculos,
    destaques: Boolean(client.destaqueSemanal),
    promocoes: hasPermission("promocoes") && hasPromotions,
    gruposWhatsapp: hasWhatsappGroup,
    instagram: Boolean(String(client.instagram || "").trim()),
    facebook: Boolean(String(client.facebook || "").trim()),
    tiktok: Boolean(String(client.tiktok || "").trim()),
    site: Boolean(String(client.site || "").trim()),
    outrasRedes: Number(counts.outrasRedes || 0) > 0,
    compartilhamentos: true,
    outros: Number(counts.outros || 0) > 0
  };
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
  const promocoesTotal = clientReportResourceAllowed("Promocoes")
    ? sumMetricMapForClient(aggregateSimpleDaily(filtered.promocoes), keys)
    : 0;
  const whatsappPromocao = Number(tiposPermitidos.get("whatsapp_promocao") || 0);
  const promocoes = Math.max(0, promocoesTotal - whatsappPromocao);
  const novidades = Number(tiposPermitidos.get("novidades") || 0);
  const perfil = Number(tiposPermitidos.get("perfil") || 0);
  const imoveisVisualizacoes = Number(tiposPermitidos.get("imovel_visualizacao") || 0);
  const imoveisFotos = Number(tiposPermitidos.get("imovel_fotos") || 0);
  const imoveisWhatsapp = Number(tiposPermitidos.get("imovel_whatsapp") || 0);
  const imoveisInstagram = Number(tiposPermitidos.get("imovel_instagram") || 0);
  const imoveis = imoveisVisualizacoes + imoveisFotos + imoveisWhatsapp + imoveisInstagram;
  const veiculosVisualizacoes = Number(tiposPermitidos.get("veiculo_visualizacao") || 0);
  const veiculosFotos = Number(tiposPermitidos.get("veiculo_fotos") || 0);
  const veiculosWhatsapp = Number(tiposPermitidos.get("veiculo_whatsapp") || 0);
  const veiculosInstagram = Number(tiposPermitidos.get("veiculo_instagram") || 0);
  const veiculos = veiculosVisualizacoes + veiculosFotos + veiculosWhatsapp + veiculosInstagram;
  const destaques = Number(tiposPermitidos.get("destaque") || 0);
  const gruposWhatsapp = Number(tiposPermitidos.get("grupoWhatsapp") || 0);
  const compartilhamentos = Number(tiposPermitidos.get("compartilhamento") || 0);
  const instagramPromocao = Number(tiposPermitidos.get("instagram_promocao") || 0);
  const instagram = Number(tiposPermitidos.get("instagram") || 0) + Number(tiposPermitidos.get("instagram_onde_comer") || 0) + instagramPromocao;
  const facebook = Number(tiposPermitidos.get("facebook") || 0);
  const tiktok = Number(tiposPermitidos.get("tiktok") || 0);
  const site = Number(tiposPermitidos.get("site") || 0);
  const outrasRedes = [...tiposPermitidos.entries()]
    .filter(([tipo]) => /youtube|linkedin|rede|social|link/i.test(String(tipo)))
    .reduce((sum, [, count]) => sum + Number(count || 0), 0);
  const redes = instagram + facebook + tiktok + site + outrasRedes;
  const promocoesLiquidas = Math.max(0, promocoes - instagramPromocao);
  const totalBotoes = [...tiposPermitidos.values()].reduce((sum, count) => sum + Number(count || 0), 0);
  const categorizedTotal = cardapios + whats + whatsappPromocao + fotos + promocoesLiquidas + novidades + perfil + imoveis + veiculos + destaques + gruposWhatsapp + compartilhamentos + redes;
  const outros = Math.max(0, totalBotoes - categorizedTotal);
  const historicoPromocoes = sumMetricMapForClient(aggregateSimpleDaily(state.metricas.promocoes), keys) > 0;
  const availability = clientReportAvailability(client, {
    promocoes: promocoesLiquidas,
    whatsappPromocao,
    historicoPromocoes,
    imoveis,
    veiculos,
    novidades,
    outrasRedes,
    outros
  });
  const resourceEntries = [
    { key: "whats", label: "WhatsApp / telefone", count: whats, note: "Telefone e contato" },
    { key: "whatsappPromocao", label: "WhatsApp da promocao", count: whatsappPromocao, note: "Interesse direto nas ofertas" },
    { key: "cardapios", label: "Cardapio", count: cardapios, note: "Cliques no cardapio" },
    { key: "fotos", label: "Fotos / divulgacao", count: fotos, note: "Fotos e divulgacoes" },
    { key: "novidades", label: "Novidades", count: novidades, note: "Cliques na tela inicial" },
    { key: "perfil", label: "Visualizacao do perfil", count: perfil, note: "Aberturas da area do cliente" },
    { key: "imoveis", label: "Imoveis - visualizacoes", count: imoveisVisualizacoes, note: "Aberturas dos anuncios" },
    { key: "imoveis", label: "Imoveis - fotos", count: imoveisFotos, note: "Cliques para ampliar as fotos" },
    { key: "imoveis", label: "Imoveis - WhatsApp", count: imoveisWhatsapp, note: "Cliques no botao Falar no WhatsApp" },
    { key: "imoveis", label: "Imoveis - Instagram", count: imoveisInstagram, note: "Cliques no Instagram do anunciante" },
    { key: "veiculos", label: "Automoveis - visualizacoes", count: veiculosVisualizacoes, note: "Aberturas dos anuncios" },
    { key: "veiculos", label: "Automoveis - fotos", count: veiculosFotos, note: "Cliques para ampliar as fotos" },
    { key: "veiculos", label: "Automoveis - WhatsApp", count: veiculosWhatsapp, note: "Cliques no botao Chamar no Whats" },
    { key: "veiculos", label: "Automoveis - Instagram", count: veiculosInstagram, note: "Cliques no Instagram do anunciante" },
    { key: "destaques", label: "Destaques", count: destaques, note: "Cards e slides em destaque" },
    { key: "promocoes", label: "Promocoes", count: promocoesLiquidas, note: "Cliques em ofertas" },
    { key: "gruposWhatsapp", label: "Grupo WhatsApp", count: gruposWhatsapp, note: "Entradas pelo link do grupo" },
    { key: "instagram", label: "Instagram", count: instagram, note: "Cliques no Instagram" },
    { key: "facebook", label: "Facebook", count: facebook, note: "Cliques no Facebook" },
    { key: "tiktok", label: "TikTok", count: tiktok, note: "Cliques no TikTok" },
    { key: "site", label: "Site", count: site, note: "Cliques no site do cliente" },
    { key: "outrasRedes", label: "Outras redes / links", count: outrasRedes, note: "Outros links cadastrados" },
    { key: "compartilhamentos", label: "Compartilhamentos", count: compartilhamentos, note: "Botao de compartilhar cliente" },
    { key: "outros", label: "Outros botoes", count: outros, note: "Demais interacoes" }
  ].filter((entry) => availability[entry.key]);
  const total = resourceEntries.reduce((sum, entry) => sum + Number(entry.count || 0), 0);
  const timeline = buildClickTimeline(state.metricas, range)
    .filter((row) => metricKeyBelongsToClient(row.cliente, keys) || normalizeName(row.cliente) === normalizeName(client.nome || client.name || ""))
    .map((row) => ({ ...row, categoria: clientReportCategory(row) }))
    .filter((row) => clientReportResourceAllowed(row.categoria));
  const moduleTypes = {
    imoveis: (row) => row.categoria === "Imoveis",
    veiculos: (row) => row.categoria === "Veiculos"
  };
  const imoveisTimeline = timeline.filter(moduleTypes.imoveis);
  const veiculosTimeline = timeline.filter(moduleTypes.veiculos);
  const categoryIsAvailable = (row = {}) => {
    const normalized = normalizeName(row.categoria);
    const type = normalizeName(row.tipo);
    if (/instagram/.test(type)) return availability.instagram;
    if (/facebook/.test(type)) return availability.facebook;
    if (/tiktok/.test(type)) return availability.tiktok;
    if (/^site$|sitecliente/.test(type)) return availability.site;
    if (/whatsapppromocao/.test(normalized)) return availability.whatsappPromocao;
    if (/whatsapptelefone/.test(normalized)) return availability.whats;
    if (/cardapio/.test(normalized)) return availability.cardapios;
    if (/fotosdivulgacao/.test(normalized)) return availability.fotos;
    if (/novidade/.test(normalized)) return availability.novidades;
    if (/visualizacaodoperfil/.test(normalized)) return availability.perfil;
    if (/destaque/.test(normalized)) return availability.destaques;
    if (/promoc/.test(normalized)) return availability.promocoes;
    if (/grupowhatsapp/.test(normalized)) return availability.gruposWhatsapp;
    if (/redessociaislinks/.test(normalized)) return availability.instagram || availability.facebook || availability.tiktok || availability.site || availability.outrasRedes;
    if (/compartilh/.test(normalized)) return availability.compartilhamentos;
    return availability.outros;
  };
  const commonTimeline = timeline.filter((row) => (
    !moduleTypes.imoveis(row)
    && !moduleTypes.veiculos(row)
    && categoryIsAvailable(row)
  ));
  const recursosTexto = resourceEntries.map((entry) => entry.label).join(", ");
  const itemAccessRows = buildItemAccessRows(state.metricas, range, keys);
  const imovelAccessRows = itemAccessRows.filter((row) => row.kind === "imovel");
  const veiculoAccessRows = itemAccessRows.filter((row) => row.kind === "veiculo");

  return `
    ${renderClientReportPeriodControls(range)}
    <div class="client-report-summary">
      <div class="stats-grid client-report-stats">
        <article class="stat-card"><span>Total de interacoes</span><strong>${total}</strong><small>${escapeHtml(range.label)}</small></article>
        ${resourceEntries.map((entry) => `<article class="stat-card"><span>${escapeHtml(entry.label)}</span><strong>${entry.count}</strong><small>${escapeHtml(entry.note)}</small></article>`).join("")}
      </div>
      <div class="reports-grid client-report-grid">
        <section class="panel-card report-card">
          <h3>Resumo por tipo</h3>
          ${renderReportList(resourceEntries.filter((entry) => entry.count > 0).map((entry) => ({ title: entry.label, meta: `${entry.count} clique${entry.count === 1 ? "" : "s"}` })), "Ainda nao ha cliques registrados para este cliente no periodo.")}
        </section>
        ${availability.imoveis ? `<section class="panel-card report-card report-wide">
          <h3>Modulo especial: Imoveis</h3>
          <p class="list-meta">Acessos dos imoveis vinculados ao cliente, separados por referencia.</p>
          ${renderItemAccessTable(imovelAccessRows, "Ainda nao ha acessos nos imoveis neste periodo.")}
          <h3>Cliques detalhados dos imoveis por data e horario</h3>
          ${renderClientModuleTimelineTable(imoveisTimeline, "Imoveis", "Ainda nao ha horarios de cliques nos imoveis neste periodo.")}
        </section>` : ""}
        ${availability.veiculos ? `<section class="panel-card report-card report-wide">
          <h3>Modulo especial: Veiculos</h3>
          <p class="list-meta">Acessos dos veiculos vinculados ao cliente, separados por referencia.</p>
          ${renderItemAccessTable(veiculoAccessRows, "Ainda nao ha acessos nos veiculos neste periodo.")}
          <h3>Cliques detalhados dos veiculos por data e horario</h3>
          ${renderClientModuleTimelineTable(veiculosTimeline, "Veiculos", "Ainda nao ha horarios de cliques nos veiculos neste periodo.")}
        </section>` : ""}
        <section class="panel-card report-card report-wide">
          <h3>Cliques detalhados da pagina do cliente</h3>
          <p class="list-meta">Use essa tabela para conferir interacoes reais em ${escapeHtml(recursosTexto)}.</p>
          ${renderClientTimelineTable(commonTimeline, "Ainda nao ha horarios detalhados para a pagina do cliente neste periodo.")}
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

function renderReportSectionTabs() {
  if (!isMaster()) return "";
  return `
    <section class="panel-card report-section-card">
      <div class="section-head compact">
        <div>
          <h2>Relatorios do painel</h2>
          <p>Separe os indicadores de acesso da auditoria das atividades administrativas.</p>
        </div>
      </div>
      <div class="report-section-tabs">
        <button type="button" data-report-section="analytics" class="${state.reportSection === "analytics" ? "active" : ""}">
          <i class="fa-solid fa-chart-line"></i> Relatorio analitico de acessos
        </button>
        <button type="button" data-report-section="actions" class="${state.reportSection === "actions" ? "active" : ""}">
          <i class="fa-solid fa-list-check"></i> Acoes dos usuarios
        </button>
      </div>
    </section>
  `;
}

function auditLogDateKey(log = {}) {
  const date = new Date(Number(log.createdAt || 0));
  return Number.isNaN(date.getTime()) ? "" : dateKeyFromDate(date);
}

function auditLogDateTime(log = {}) {
  const date = new Date(Number(log.createdAt || 0));
  if (Number.isNaN(date.getTime())) return { date: "-", time: "-" };
  return {
    date: date.toLocaleDateString("pt-BR"),
    time: date.toLocaleTimeString("pt-BR")
  };
}

function renderUserActionReport(mount, periodRange) {
  const query = normalizeName($("auditLogSearch")?.value || "");
  const categoryFilter = $("auditLogCategory")?.value || "todas";
  const logs = state.auditLogs.filter((log) => {
    const dateKey = auditLogDateKey(log);
    const inPeriod = dateKey && dateKey >= periodRange.start && dateKey <= periodRange.end;
    const categoryMatches = categoryFilter === "todas" || log.category === categoryFilter;
    const haystack = normalizeName(`${log.email || ""} ${log.action || ""} ${log.category || ""} ${log.details || ""} ${log.target || ""}`);
    return inPeriod && categoryMatches && (!query || haystack.includes(query));
  });
  const categories = [...new Set(state.auditLogs.map((log) => log.category).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "pt-BR"));
  const uniqueUsers = new Set(logs.map((log) => log.uid || log.email).filter(Boolean)).size;
  const logins = logs.filter((log) => log.action === "Login").length;

  mount.innerHTML = `
    ${renderReportSectionTabs()}
    <section class="panel-card report-period-card">
      <div class="section-head compact">
        <div>
          <h2>Relatorio de acoes dos usuarios</h2>
          <p>Historico de login e alteracoes realizadas no painel. Disponivel somente para o Admin Master.</p>
        </div>
        <span class="badge ativo">${escapeHtml(periodRange.label)}</span>
      </div>
      <div class="report-period-tabs">
        <button type="button" data-report-period="dia" class="period-day ${state.reportPeriod.type === "dia" ? "active" : ""}">Dia</button>
        <button type="button" data-report-period="semanal" class="period-week ${state.reportPeriod.type === "semanal" ? "active" : ""}">Semanal</button>
        <button type="button" data-report-period="mensal" class="period-month ${state.reportPeriod.type === "mensal" ? "active" : ""}">Mensal</button>
        <button type="button" data-report-period="anual" class="period-year ${state.reportPeriod.type === "anual" ? "active" : ""}">Anual</button>
      </div>
      <div class="audit-log-filters">
        <label>Pesquisar
          <input id="auditLogSearch" type="search" value="${escapeAttr($("auditLogSearch")?.value || "")}" placeholder="Usuario, acao ou registro...">
        </label>
        <label>Categoria
          <select id="auditLogCategory">
            <option value="todas">Todas</option>
            ${categories.map((category) => `<option value="${escapeAttr(category)}" ${category === categoryFilter ? "selected" : ""}>${escapeHtml(category)}</option>`).join("")}
          </select>
        </label>
      </div>
    </section>
    <div class="stats-grid">
      <article class="stat-card"><span>Acoes registradas</span><strong>${logs.length}</strong><small>${escapeHtml(periodRange.label)}</small></article>
      <article class="stat-card"><span>Usuarios ativos</span><strong>${uniqueUsers}</strong><small>Com atividade no periodo</small></article>
      <article class="stat-card"><span>Logins</span><strong>${logins}</strong><small>Entradas no painel</small></article>
    </div>
    <section class="panel-card report-card">
      <div class="report-card-head">
        <h2>Historico de atividades</h2>
        <span class="report-card-date"><i class="fa-solid fa-clock-rotate-left"></i> ${logs.length} registro(s)</span>
      </div>
      <div class="report-table-wrap">
        <table class="report-click-table audit-log-table">
          <thead><tr><th>Data</th><th>Horario</th><th>Usuario</th><th>Perfil</th><th>Categoria</th><th>Acao</th><th>Registro</th><th>Detalhes</th></tr></thead>
          <tbody>
            ${logs.length ? logs.slice(0, 500).map((log) => {
              const when = auditLogDateTime(log);
              return `<tr>
                <td>${escapeHtml(when.date)}</td>
                <td>${escapeHtml(when.time)}</td>
                <td><strong>${escapeHtml(log.email || log.uid || "-")}</strong></td>
                <td>${escapeHtml(roleLabel(log.role))}</td>
                <td>${escapeHtml(log.category || "-")}</td>
                <td>${escapeHtml(log.action || "-")}</td>
                <td>${escapeHtml(log.target || "-")}</td>
                <td>${escapeHtml(log.details || "-")}</td>
              </tr>`;
            }).join("") : `<tr><td colspan="8">Nenhuma atividade encontrada neste periodo.</td></tr>`}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function bindReportControls(mount) {
  mount.querySelectorAll("[data-report-section]").forEach((button) => {
    button.addEventListener("click", () => {
      state.reportSection = button.dataset.reportSection;
      renderReports();
    });
  });
  mount.querySelectorAll("[data-report-period]").forEach((button) => {
    button.addEventListener("click", () => {
      state.reportPeriod.type = button.dataset.reportPeriod;
      renderReports();
    });
  });
  mount.querySelector("#auditLogSearch")?.addEventListener("change", renderReports);
  mount.querySelector("#auditLogCategory")?.addEventListener("change", renderReports);
}

function renderReports() {
  const mount = $("reportsMount");
  if (!mount) return;
  if (!isMaster()) state.reportSection = "analytics";
  const periodRange = getReportDateRange();
  if (isMaster() && state.reportSection === "actions") {
    renderUserActionReport(mount, periodRange);
    bindReportControls(mount);
    return;
  }
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
  const pagos = reportClients.filter((c) => effectivePaymentStatus(c) === "pago");
  const abertos = reportClients.filter((c) => effectivePaymentStatus(c) === "em_aberto");
  const isentos = reportClients.filter((c) => effectivePaymentStatus(c) === "isento");
  const destaques = reportClients.filter((c) => destaqueIsActive(c));
  const comImagem = reportClients.filter((c) => c.imagem || normalizeImageItems(c.imagens).length);
  const comHorarios = reportClients.filter((c) => scheduleHasAnyOpen(c.horarios || {}));
  const valorReceber = reportClients
    .filter((c) => c.status !== "inativo" && isBillableClientType(c) && effectivePaymentStatus(c) !== "isento")
    .reduce((sum, c) => sum + valorTotalFaturaCliente(c), 0);
  const valorPago = pagos.reduce((sum, c) => sum + valorTotalFaturaCliente(c), 0);
  const valorAberto = abertos.reduce((sum, c) => sum + valorTotalFaturaCliente(c), 0);
  const receitas = reportClients
    .filter((c) => c.status !== "inativo" && isBillableClientType(c) && effectivePaymentStatus(c) !== "isento")
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
  const itemAccessRows = buildItemAccessRows(state.metricas, periodRange);
  const accessTimeline = buildAccessTimeline(filteredMetrics.acessos, periodRange);
  const generalClickReport = buildGeneralClickRows(cliquesBotoes.detalhes);
  const ondeComerClickRows = buildOndeComerClickRows(cliquesOndeComerCardapios, cliquesOndeComerWhats, cliquesOndeComerFotos);
  const newsClickRows = buildNewsClickRows(state.metricas, periodRange);

  const clientesAtencao = reportClients
    .filter((client) => client.status !== "inativo")
    .map((client) => {
      const faltas = [];
      if (!client.imagem && !normalizeImageItems(client.imagens).length) faltas.push("sem foto");
      if (!client.contato && !client.whatsapp) faltas.push("sem telefone");
      if (!client.categoria) faltas.push("sem categoria");
      if (!scheduleHasAnyOpen(client.horarios || {})) faltas.push("sem horarios");
      if (effectivePaymentStatus(client) === "em_aberto") faltas.push("financeiro em aberto");
      return { client, faltas };
    })
    .filter((item) => item.faltas.length)
    .slice(0, 10)
    .map((item) => ({ title: item.client.nome || item.client.id, meta: item.faltas.join(", ") }));

  const faturasComComprovante = reportClients
    .map((client) => ({ client, invoice: latestClientInvoice(client) }))
    .filter(({ invoice }) => invoiceHasReceipt(invoice))
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
    ${renderReportSectionTabs()}
    <section class="panel-card report-title-card">
      <div class="section-head compact">
        <div>
          <h2>Relatorio analitico de informacoes de acessos</h2>
          <p>Indicadores do site, cliques, origem dos acessos, clientes e resultados financeiros.</p>
        </div>
      </div>
    </section>
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

      <section class="panel-card report-card report-wide">
        ${renderReportCardHeader("Cliques nas noticias da cidade", periodRange)}
        <p class="list-meta">Mostra visualizacoes, compartilhamentos, WhatsApp e acessos para a materia oficial de cada noticia.</p>
        ${renderNewsClickReportTable(newsClickRows, "Ainda nao ha cliques em noticias registrados neste periodo.")}
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
        ${renderReportCardHeader("Acessos por imovel e veiculo", periodRange)}
        <p class="list-meta">Visualizacoes, WhatsApp e fotos separados pelo codigo de referencia do anuncio.</p>
        ${renderItemAccessTable(itemAccessRows, "Ainda nao ha acessos em imoveis ou veiculos neste periodo.")}
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

  bindReportControls(mount);
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
  $("paymentBillingWhatsapp").value = formatPhoneMask(config.whatsappCobranca || "43991766639");
  $("paymentDefaultDueDay").value = config.vencimentoDiaPadrao || "";
  $("paymentInvoiceLogo").value = config.logoBoleto || "";
  $("paymentInvoiceLogoPreview").src = boletoLogoUrl(config);
  $("paymentPlanMonthly").value = config.valorPlanoMensal ? moneyBR(config.valorPlanoMensal) : "";
  $("paymentPlanSemiannual").value = config.valorPlanoSemestral ? moneyBR(config.valorPlanoSemestral) : "";
  $("paymentPlanAnnual").value = config.valorPlanoAnual ? moneyBR(config.valorPlanoAnual) : "";
  $("paymentFeaturedWeekly").value = config.valorDestaqueSemanal ? moneyBR(config.valorDestaqueSemanal) : "";
  $("paymentFeaturedWeekend").value = config.valorDestaqueFimSemana ? moneyBR(config.valorDestaqueFimSemana) : "";
  $("paymentFeaturedMonthly").value = config.valorDestaqueMensal ? moneyBR(config.valorDestaqueMensal) : "";
  if ($("paymentNewsVisibleDays")) $("paymentNewsVisibleDays").value = config.diasNovidadesVisiveis || 5;
  $("paymentInvoiceNote").value = config.observacaoFatura || "";
  $("paymentInvoiceFooterMessage").value = config.mensagemRodapeBoleto || "";
}

async function uploadPaymentInvoiceLogo(file) {
  if (!file || !isMaster()) return;
  const extension = String(file.name || "logo.png").split(".").pop() || "png";
  const path = `configuracoes/pagamento/logo-boleto-${Date.now()}.${slugify(extension)}`;
  const fileRef = storageRef(storage, path);
  const url = await uploadFileWithProgress(fileRef, file, "Enviando logo dos boletos", file.name || "logo");
  $("paymentInvoiceLogo").value = url;
  $("paymentInvoiceLogoPreview").src = displayImageUrl(url);
  showToast("Logo enviada. Clique em Salvar pagamento para confirmar.");
}

function renderHomePageSettings() {
  if (!$("homePageForm")) return;
  const config = state.paginaInicialSite || {};
  const imagens = Array.isArray(config.imagens) ? config.imagens.filter(Boolean) : [];
  $("homeBannerActive").checked = config.ativo !== false;
  $("homeBannerTitle").value = config.titulo || "Carlópolis em tempo real";
  $("homeBannerSubtitle").value = config.subtitulo || "Acesse os principais serviços, eventos, novidades e promoções da cidade.";
  if ($("homeAllowClientHideVehicleArtLogo")) {
    $("homeAllowClientHideVehicleArtLogo").checked = Boolean(config.permitirClienteOcultarLogoArteVeiculo);
  }
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
        ${(() => {
          const contactDetails = normalizeClientContactDetails(client);
          return [0, 1, 2].map((index) => `
            <div class="contact-admin-field">
              <label class="admin-field-line">Telefone ${index + 1}<input id="${index === 0 ? "coContact" : (index === 1 ? "coWhatsapp" : "coContact3")}" value="${escapeAttr(contactDetails[index]?.numero || "")}"></label>
              <label class="admin-field-line">Referencia do telefone<input id="coContact${index + 1}Reference" maxlength="50" value="${escapeAttr(contactDetails[index]?.referencia || "")}" placeholder="Ex.: Nome / Local"></label>
              <label class="contact-whatsapp-flag"><input id="coContact${index + 1}IsWhatsapp" type="checkbox" ${contactDetails[index]?.whatsapp ? "checked" : ""}> É WhatsApp</label>
            </div>
          `).join("");
        })()}
        ${isRealEstateClient ? `<label class="admin-field-line field-creci">CRECI (opcional)<input id="coCreci" value="${escapeAttr(client.creci || client.registroCreci || "")}" placeholder="Ex.: 38.105 F"></label>` : ""}
        
        
        <section class="wide schedule-panel">
          <div class="section-head compact">
            <div>
              <h3>Dias e horarios de funcionamento</h3>
              <p>Marque os dias abertos. Dias desmarcados aparecem como fechado.</p>
            </div>
          </div>
          <label class="schedule-global-all-day">
            <input id="coOpen24Hours" type="checkbox" ${client.funcionamento24Horas ? "checked" : ""}>
            <span><strong>Funcionamento 24 horas</strong><small>Ative quando o estabelecimento trabalha 24 horas por dia.</small></span>
          </label>
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
    toggleSchedule24Hours("coScheduleEditor", Boolean(client.funcionamento24Horas));
    $("coOpen24Hours")?.addEventListener("change", (event) => {
      toggleSchedule24Hours("coScheduleEditor", event.target.checked);
    });
    bindPhoneMask("coContact");
    bindPhoneMask("coWhatsapp");
    bindPhoneMask("coContact3");
  }
  if (canViewRelatorios) {
    bindClientMetricReportControls(client);
    startClientMetricsRealtime(client);
  } else {
    stopClientMetricsRealtime();
  }
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
        : `Valores definidos: ${moneyBR(destaqueWeeklyValue())} por semana e ${moneyBR(destaqueWeekendValue())} por fim de semana.`;
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
      [`clientes/${client.id}/grupoWhatsappImagem`]: imagem,
      [`clientes/${client.id}/grupoWhatsappAtivo`]: enabled
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
        itemId: clientWhatsappGroupId,
        link
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
      [`clientes/${client.id}/grupoWhatsappImagem`]: null,
      [`clientes/${client.id}/grupoWhatsappAtivo`]: null
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
      const funcionamento24Horas = Boolean($("coOpen24Hours")?.checked);
      const horarioTexto = funcionamento24Horas ? "24 horas" : (shouldSaveSchedule ? scheduleToText(horarios) : $("coHours").value.trim());
      const nome = $("coName").value.trim();
      const contatosDetalhados = [
        { numero: $("coContact").value.trim(), referencia: $("coContact1Reference")?.value.trim() || "", whatsapp: Boolean($("coContact1IsWhatsapp")?.checked) },
        { numero: $("coWhatsapp").value.trim(), referencia: $("coContact2Reference")?.value.trim() || "", whatsapp: Boolean($("coContact2IsWhatsapp")?.checked) },
        { numero: $("coContact3")?.value.trim() || "", referencia: $("coContact3Reference")?.value.trim() || "", whatsapp: Boolean($("coContact3IsWhatsapp")?.checked) }
      ].filter((item) => item.numero);
      const contatos = contatosDetalhados.map((item) => item.numero);
      const whatsappPrincipal = contatosDetalhados.find((item) => item.whatsapp)?.numero || "";
      Object.assign(payload, {
        nome,
        nomeNormalizado: normalizeName(nome),
        contatosDetalhados,
        contatos,
        contato: contatos[0] || "",
        whatsapp: whatsappPrincipal,
        contato2: contatos[1] || "",
        contato3: contatos[2] || "",
        ...(isRealEstateClient ? { creci: $("coCreci")?.value.trim() || "" } : {}),
        endereco: $("coAddress").value.trim(),
        funcionamento24Horas,
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
    await registrarAtualizacoesClienteNovidade(client.id, { ...client, ...payload }, client);
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
        const importedPayload = cleanForFirebase({
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
        });
        const { publicPayload, financePayload } = splitClientFinancePayload(importedPayload);
        clientPayloads.push({
          id,
          data: publicPayload,
          financeData: cleanForFirebase({
            ...financePayload,
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
          if (Object.keys(item.financeData || {}).length) {
            await set(ref(db, `clientesFinanceiro/${item.id}`), item.financeData);
          }
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
  const canWriteClientFinance = canManageClients();
  const planChangeNotice = `<div class="list-meta">Alteracoes de plano e comprovantes devem ser solicitados ao administrador.</div>`;
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
          <small>${client.vencimentoDia
            ? `Dia individual: ${escapeHtml(client.vencimentoDia)}`
            : `Dia padrão: ${escapeHtml(state.pagamentoSistema?.vencimentoDiaPadrao || "último dia do mês")}`}</small>
        </div>
        <div>
          <span>Pagamento</span>
          <strong>${escapeHtml(planLabel(client.tipoPlano || "mensal"))}</strong>
          <small>${escapeHtml(paymentLabel(effectivePaymentStatus(client)))}</small>
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
          <div class="pix-generated-total"><span>Valor do Pix gerado</span><strong id="featuredInvoicePixTotal">${moneyBR(featuredPix.valorDestaque)}</strong></div>
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
        ${canWriteClientFinance ? `
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
        ` : planChangeNotice}
        ${paymentConfig.pixChave ? `
          <div class="invoice-boleto-actions">
            <label>Quantidade de meses
              <select id="clientBoletoQuantity">
                ${Array.from({ length: 12 }, (_, index) => `<option value="${index + 1}">${index + 1}</option>`).join("")}
              </select>
            </label>
            <button id="generateClientBoletos" type="button"><i class="fa-solid fa-print"></i> Gerar boletos A4</button>
          </div>
        ` : ""}
      </article>
    `;
    bindFeaturedInvoicePix(featuredPix);
    $("generateClientBoletos")?.addEventListener("click", () => {
      const quantity = Number($("clientBoletoQuantity")?.value || 1);
      openPrintableBoletos(client, buildInvoiceBatch(client, quantity, currentMonthKey()));
    });
    if (canWriteClientFinance) $("saveClientInvoicePlan")?.addEventListener("click", async () => {
      const tipoPlano = $("clientInvoicePlan")?.value || "mensal";
      await update(ref(db, `clientesFinanceiro/${client.id}`), {
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
          ${canWriteClientFinance ? `
            <label>Plano atual
              <select id="clientInvoicePlan">
                <option value="mensal" ${client.tipoPlano === "mensal" || !client.tipoPlano ? "selected" : ""}>Mensal</option>
                <option value="semestral" ${client.tipoPlano === "semestral" ? "selected" : ""}>Semestral</option>
                <option value="anual" ${client.tipoPlano === "anual" ? "selected" : ""}>Anual</option>
              </select>
            </label>
            <button id="saveClientInvoicePlan" type="button" class="ghost-button"><i class="fa-solid fa-arrows-rotate"></i> Atualizar plano</button>
          ` : planChangeNotice}
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
          <div class="invoice-boleto-actions">
            <label>Quantidade de meses
              <select id="clientBoletoQuantity">
                ${Array.from({ length: 12 }, (_, index) => `<option value="${index + 1}" ${index + 1 === Math.min(12, faturas.length) ? "selected" : ""}>${index + 1}</option>`).join("")}
              </select>
            </label>
            <button id="generateSelectedInvoicePix" type="button"><i class="fa-solid fa-qrcode"></i> Gerar QR Code/Pix</button>
            <button id="generateClientBoletos" type="button" class="ghost-button"><i class="fa-solid fa-print"></i> Gerar boletos A4</button>
          </div>
          <div id="selectedInvoicePixBox" class="pix-box invoice-selected-pix hidden">
            <div class="pix-generated-total"><span>Valor do Pix gerado</span><strong id="selectedInvoicePixTotalGenerated">${moneyBR(totalAberto)}</strong></div>
            <img id="selectedInvoiceQr" alt="QR Code Pix" loading="lazy" decoding="async">
            <label class="wide">Codigo Pix dos meses selecionados<textarea id="selectedInvoicePixCode" rows="5" readonly></textarea></label>
            <div class="list-meta wide">Chave Pix: <strong>${escapeHtml(paymentConfig.pixChave || "")}</strong></div>
            <div class="form-actions">
              <button id="copySelectedInvoicePix" type="button" class="ghost-button"><i class="fa-solid fa-copy"></i> Copiar codigo Pix</button>
              <button data-copy-invoice-key type="button" class="ghost-button"><i class="fa-solid fa-key"></i> Copiar chave Pix</button>
            </div>
            ${paymentConfig.observacaoFatura ? `<div class="list-meta wide">${escapeHtml(paymentConfig.observacaoFatura)}</div>` : ""}
          </div>
          ${canWriteClientFinance ? `
            <div class="upload-panel">
              <h3>Comprovante dos meses selecionados</h3>
              <input id="selectedInvoiceReceipt" type="file" accept="image/*,application/pdf">
              <div class="list-meta">Ao anexar aqui, o mesmo comprovante sera vinculado aos meses marcados.</div>
            </div>
          ` : `<div class="list-meta">Depois de pagar, envie o comprovante ao administrador para baixa manual.</div>`}
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
    const selectedPlan = canWriteClientFinance ? ($("clientInvoicePlan")?.value || client.tipoPlano || "mensal") : (client.tipoPlano || "mensal");
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
  if (canWriteClientFinance) $("clientInvoicePlan")?.addEventListener("change", refreshSelectedInvoicePayment);
  refreshSelectedInvoicePayment();

  $("generateSelectedInvoicePix")?.addEventListener("click", () => {
    const { selectedTotal, unified } = selectedInvoiceData();
    if (selectedTotal <= 0 || !unified.pixCode) {
      showToast("Selecione pelo menos um mes para gerar o Pix.");
      return;
    }
    if (selectedPixCode) selectedPixCode.value = unified.pixCode;
    if ($("selectedInvoicePixTotalGenerated")) $("selectedInvoicePixTotalGenerated").textContent = moneyBR(selectedTotal);
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

  $("generateClientBoletos")?.addEventListener("click", () => {
    const { selected } = selectedInvoiceData();
    const quantity = Number($("clientBoletoQuantity")?.value || 1);
    const startMonth = selected.sort()[0] || currentMonthKey();
    const invoices = buildInvoiceBatch(client, quantity, startMonth);
    openPrintableBoletos(client, invoices);
  });

  if (canWriteClientFinance) $("saveClientInvoicePlan")?.addEventListener("click", async () => {
    const tipoPlano = $("clientInvoicePlan")?.value || "mensal";
    await update(ref(db, `clientesFinanceiro/${client.id}`), {
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

  if (canWriteClientFinance) $("selectedInvoiceReceipt")?.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const selectedMonths = [...mount.querySelectorAll("[data-invoice-select]:checked")].map((input) => input.value);
    if (!selectedMonths.length) {
      showToast("Selecione pelo menos um mes para anexar o comprovante.");
      event.target.value = "";
      return;
    }
    showToast("Enviando comprovante dos meses selecionados...");
    const receipt = await uploadInvoiceReceiptForClient(client.id, file);
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
        comprovantePath: receipt.path,
        comprovanteNome: receipt.name,
        comprovanteTipo: receipt.contentType,
        status: "em_analise",
        updatedAt: Date.now()
      };
    });
    await update(ref(db, `clientesFinanceiro/${client.id}`), payload);
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
      const currentUser = state.usuarios.find((item) => item.uid === editingUid);
      const originalEmail = String(currentUser?.email || "").trim().toLowerCase();
      if (email !== originalEmail) {
        const migrated = await migratePanelUserEmail({
          currentUser,
          email,
          password,
          role,
          clienteId,
          status: $("editUserStatus").value || "ativo",
          permissoes
        });
        if (!migrated) return;
        resetUserForm();
        showToast("E-mail de acesso trocado. Passe o novo e-mail e a senha provisoria ao cliente.");
        await loadAllData();
        return;
      }

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

    const authUser = await createAuthUserWithTemporaryPassword(email, password);

    await saveUserProfile({
      uid: authUser.uid,
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
      await registrarLogAuditoria("Saida", "Acesso", "Sessao encerrada por inatividade");
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
  prepareClientFormSections();
  bindCurrencyMask($("imovelValor"));
  bindCurrencyMask($("automovelPreco"));
  bindPhoneMask("imovelTelefone");
  bindPhoneMask("clientContact");
  bindPhoneMask("clientWhatsapp");
  bindPhoneMask("clientContact3");
  bindPhoneMask("paymentBillingWhatsapp");
  bindPhoneMask("newsWhatsapp");
  resetNewsForm();

  $("newNewsButton")?.addEventListener("click", resetNewsForm);
  $("newsSummary")?.addEventListener("input", updateNewsSummaryCount);
  $("newsTitle")?.addEventListener("input", () => {
    if (!$("newsId")?.value || !$("newsSlug")?.value) $("newsSlug").value = slugify($("newsTitle").value);
  });
  $("newsAdminSearch")?.addEventListener("input", renderNewsAdminList);
  $("newsMainImageUpload")?.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    $("newsMainImageUrl").value = await uploadNewsImage(file);
    renderNewsImagesPreview();
    event.target.value = "";
  });
  $("newsExtraImagesUpload")?.addEventListener("change", async (event) => {
    const files = [...(event.target.files || [])].slice(0, Math.max(0, 10 - state.noticiaExtraImages.length));
    for (const file of files) state.noticiaExtraImages.push(await uploadNewsImage(file, true));
    renderNewsImagesPreview();
    event.target.value = "";
  });
  $("newsForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    await saveNews();
  });
  $("saveNewsDraftButton")?.addEventListener("click", () => saveNews("rascunho"));
  $("deleteNewsButton")?.addEventListener("click", async () => {
    const id = $("newsId")?.value;
    if (!id) return;
    const item = state.noticias.find((news) => news.id === id);
    if (!(await confirmarExclusao(item?.titulo || id, "noticia"))) return;
    await firebaseRemove(ref(db, `noticias/${id}`));
    resetNewsForm();
    await loadAllData();
  });

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

  $("logoutButton").addEventListener("click", async () => {
    await registrarLogAuditoria("Saida", "Acesso", "Usuario saiu do painel");
    await signOut(auth);
  });
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
  $("migrateFinanceButton")?.addEventListener("click", migrateClientFinanceToPrivate);
  $("auditFinanceCleanupButton")?.addEventListener("click", auditClientFinanceCleanup);
  $("cleanupFinanceButton")?.addEventListener("click", cleanupPublicClientFinanceFields);
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
  $("clientUpdatedOrder")?.addEventListener("change", renderClientsList);
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
  $("clientOpen24Hours")?.addEventListener("change", (event) => {
    toggleSchedule24Hours("clientScheduleEditor", event.target.checked);
  });
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
    preencherDadosEstabelecimentoAutomovelNovo();
    openFormForEdit("automovelForm");
  });
  $("closeAutomovelFormButton")?.addEventListener("click", resetAutomovelForm);
  $("automovelTipo")?.addEventListener("change", atualizarCamposTipoAutomovel);
  $("automovelSearch")?.addEventListener("input", renderAutomoveisList);
  $("automovelArteItem")?.addEventListener("change", (event) => {
    state.selectedAutomovelArtId = event.target.value || "";
    preencherDefaultsTarjaAutomovel(true);
    atualizarVisibilidadeLayoutAutomovelArte();
    atualizarPreviaArteAutomovel({ silent: true });
  });
  ["automovelArteTitulo", "automovelArteLayout", "automovelArteSubtitulo", "automovelArteTema", "automovelArteSubtitulo2", "automovelArteRodape", "automovelArteShowSiteLogo", "automovelArteTarjaLinha1", "automovelArteTarjaLinha2", "automovelArteTarjaPreco", "automovelArteTarjaTituloCor", "automovelArteTarjaPrecoCor", "automovelArteTarjaClienteCor", "automovelArteTarjaTituloFonte", "automovelArteTarjaPrecoFonte", "automovelArteTarjaTituloShow", "automovelArteTarjaTituloX", "automovelArteTarjaTituloY", "automovelArteTarjaPrecoShow", "automovelArteTarjaPrecoX", "automovelArteTarjaPrecoY", "automovelArteTarjaClienteShow", "automovelArteTarjaClienteX", "automovelArteTarjaClienteY", "automovelArteSiteLogoX", "automovelArteSiteLogoY", "automovelArteImageScale", "automovelArteImageOffsetX", "automovelArteImageOffsetY", "automovelArteDarkOverlay"].forEach((id) => {
    $(id)?.addEventListener("input", () => agendarPreviaArteAutomovel());
    $(id)?.addEventListener("change", () => {
      if (id === "automovelArteLayout") atualizarVisibilidadeLayoutAutomovelArte();
      atualizarPreviaArteAutomovel({ silent: true });
    });
  });
  preencherDefaultsTarjaAutomovel(false);
  atualizarVisibilidadeLayoutAutomovelArte();
  $("previewAutomovelArtButton")?.addEventListener("click", () => {
    atualizarPreviaArteAutomovel();
  });
  $("automovelArtePreview")?.addEventListener("pointerdown", iniciarArrasteArteAutomovel);
  $("automovelArtePreview")?.addEventListener("pointermove", moverArrasteArteAutomovel);
  $("automovelArtePreview")?.addEventListener("pointerup", finalizarArrasteArteAutomovel);
  $("automovelArtePreview")?.addEventListener("pointercancel", finalizarArrasteArteAutomovel);
  $("automovelArtePreview")?.addEventListener("pointerleave", atualizarCursorArteAutomovel);
  $("generateAutomovelArtButton")?.addEventListener("click", () => {
    gerarArteInstagramAutomovel($("automovelArteItem")?.value || state.selectedAutomovelArtId, "premium45", opcoesArteAutomovel());
  });
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
  $("infoWhatsappGroupClientSearch")?.addEventListener("input", () => fillInfoWhatsappGroupClientSelect());
  $("infoWhatsappGroupClient")?.addEventListener("change", () => {
    const client = state.clientes.find((item) => item.id === $("infoWhatsappGroupClient").value);
    if ($("infoWhatsappGroupClientSearch")) $("infoWhatsappGroupClientSearch").value = client?.nome || "";
    fillInfoWhatsappGroupClientSelect(client?.id || "");
  });
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
  $("financePlanFilter")?.addEventListener("change", renderFinanceiro);
  $("financeAnnualDueOrder")?.addEventListener("change", renderFinanceiro);
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
      whatsappCobranca: $("paymentBillingWhatsapp").value.trim(),
      vencimentoDiaPadrao: Math.max(1, Math.min(31, Number($("paymentDefaultDueDay").value || 31) || 31)),
      logoBoleto: $("paymentInvoiceLogo").value.trim(),
      valorPlanoMensal: numberFromMoney($("paymentPlanMonthly").value),
      valorPlanoSemestral: numberFromMoney($("paymentPlanSemiannual").value),
      valorPlanoAnual: numberFromMoney($("paymentPlanAnnual").value),
      valorDestaqueSemanal: numberFromMoney($("paymentFeaturedWeekly").value),
      valorDestaqueFimSemana: numberFromMoney($("paymentFeaturedWeekend").value),
      valorDestaqueMensal: numberFromMoney($("paymentFeaturedMonthly").value),
      diasNovidadesVisiveis: Math.max(1, Number($("paymentNewsVisibleDays")?.value || 5) || 5),
      observacaoFatura: $("paymentInvoiceNote").value.trim(),
      mensagemRodapeBoleto: $("paymentInvoiceFooterMessage").value.trim(),
      updatedAt: serverTimestamp(),
      updatedBy: state.user?.uid || ""
    };
    await update(ref(db, "configuracoes/pagamento"), payload);
    state.pagamentoSistema = payload;
    showToast("Dados de pagamento salvos.");
    renderFinanceiro();
    renderReports();
    renderClientInvoices();
    renderClientBillingAlert();
  });
  $("paymentInvoiceLogoUpload")?.addEventListener("change", async (event) => {
    if (!isMaster()) {
      showToast("Somente master pode alterar a logo dos boletos.");
      event.target.value = "";
      return;
    }
    await uploadPaymentInvoiceLogo(event.target.files?.[0]);
    event.target.value = "";
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
      permitirClienteOcultarLogoArteVeiculo: Boolean($("homeAllowClientHideVehicleArtLogo")?.checked),
      updatedAt: serverTimestamp(),
      updatedBy: state.user?.uid || ""
    };
    await update(ref(db, "configuracoes/paginaInicial"), payload);
    state.paginaInicialSite = payload;
    renderHomePageSettings();
    showToast("Pagina inicial salva.");
  });
  $("novidadesConfigForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!isMaster()) return;
    const temas = {};
    $("novidadesConfigOptions")?.querySelectorAll('input[type="checkbox"]').forEach((input) => {
      temas[input.value] = input.checked;
    });
    const payload = {
      temas,
      updatedAt: serverTimestamp(),
      updatedBy: state.user?.uid || ""
    };
    await update(ref(db, "configuracoes/novidades"), payload);
    state.novidadesConfig = payload;
    showToast("Configuração de novidades salva.");
  });
  $("xadrezConfigForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!isMaster()) {
      showToast("Somente master pode alterar o xadrez.");
      return;
    }
    const payload = {
      ativo: $("xadrezConfigActive")?.checked !== false,
      campeonatoNome: $("xadrezConfigName")?.value.trim().slice(0, 80) || "",
      premio: $("xadrezConfigPrize")?.value.trim().slice(0, 180) || "",
      updatedAt: serverTimestamp(),
      updatedBy: state.user?.uid || ""
    };
    await update(ref(db, "jogos/xadrez/config"), payload);
    state.xadrezConfig = payload;
    showToast("Configuracao do xadrez salva.");
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
  $("userSearch")?.addEventListener("input", renderUsersList);
  $("newUserClientSearch")?.addEventListener("input", () => fillUserClientSelect());
  $("newUserClient")?.addEventListener("change", () => {
    const client = state.clientes.find((item) => item.id === $("newUserClient").value);
    if ($("newUserClientSearch")) $("newUserClientSearch").value = client?.nome || "";
    fillUserClientSelect(client?.id || "");
  });

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
      if (button.dataset.view === "relatorios") {
        const finish = beginAdminActionLoading("Montando relatórios...", button);
        showAdminActionLoading("Montando relatórios...", button);
        return new Promise((resolve) => {
          requestAnimationFrame(() => {
            setTimeout(() => {
              try {
                switchView(button.dataset.view);
                closeAdminMenuOnMobile();
              } finally {
                finish();
                resolve();
              }
            }, 0);
          });
        });
      }
      switchView(button.dataset.view);
      closeAdminMenuOnMobile();
    });
  });

  $("clientForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!canManageClients()) return;
    const rawPayload = getClientFormData();
    const formId = rawPayload.id;
    const id = getCanonicalClientId(rawPayload.categoria, rawPayload.nome);
    const sourceClient = state.clientes.find((client) => client.id === state.selectedClientId || client.id === formId || client.id === id) || null;
    rawPayload.aliases = buildClientPublicAliases(id, rawPayload, sourceClient);
    addAliasKey(rawPayload.aliases, formId);
    addAliasKey(rawPayload.aliases, state.selectedClientId);
    const splitPayload = splitClientFinancePayload(rawPayload);
    const payload = cleanForFirebase(splitPayload.publicPayload);
    const financePayload = cleanForFirebase(splitPayload.financePayload);
    delete payload.id;
    if (!sourceClient) {
      payload.createdAt = serverTimestamp();
      payload.dataCadastro = dateKeyFromDate(new Date());
    } else {
      if (sourceClient.createdAt) payload.createdAt = sourceClient.createdAt;
      if (sourceClient.dataCadastro) payload.dataCadastro = sourceClient.dataCadastro;
    }
    const updates = { [`clientes/${id}`]: payload };
    if (Object.keys(financePayload).length) {
      updates[`clientesFinanceiro/${id}`] = {
        ...pickClientFinanceFields(sourceClient),
        ...state.clientesFinanceiro[id],
        ...financePayload,
        updatedAt: serverTimestamp(),
        updatedBy: state.user?.uid || "",
        origem: "painel"
      };
    }
    [formId, state.selectedClientId].filter((oldId) => oldId && oldId !== id).forEach((oldId) => {
      updates[`clientes/${oldId}`] = null;
      updates[`clientesFinanceiro/${oldId}`] = null;
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
    await registrarAtualizacoesClienteNovidade(id, payload, sourceClient);
    [formId, state.selectedClientId].filter((oldId) => oldId && oldId !== id).forEach((oldId) => {
      state.clientes = state.clientes.filter((client) => client.id !== oldId);
      delete state.clientesFinanceiro[oldId];
      state.usuarios.filter((user) => user.clienteId === oldId).forEach((user) => { user.clienteId = id; });
    });
    state.clientesFinanceiro[id] = { ...(state.clientesFinanceiro[id] || {}), ...financePayload };
    upsertClientInState(id, mergeClientFinanceData({ id, ...payload }, state.clientesFinanceiro[id]));
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
    resetClientForm();
    showToast("Cliente salvo com sucesso.", { prominent: true });
  });
  $("clientCategory")?.addEventListener("change", atualizarVisibilidadeCreciCliente);
  $("clientNewCategory")?.addEventListener("input", atualizarVisibilidadeCreciCliente);
  $("clientType")?.addEventListener("change", () => syncClientPaymentByType(true));
  $("clientShowAllSections")?.addEventListener("change", (event) => {
    setAllClientSectionsExpanded(Boolean(event.target.checked));
  });
  $("eventClientSearch")?.addEventListener("input", () => fillEventClientSelect());
  $("eventClient")?.addEventListener("change", () => {
    const client = state.clientes.find((item) => item.id === $("eventClient").value);
    if ($("eventClientSearch")) $("eventClientSearch").value = client?.nome || "";
    fillEventClientSelect(client?.id || "");
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
      destinoId: id,
      itemId: id
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
    const imovelTema = !isNewImovel && String(originalImovelNovidade.titulo || "") !== String(payload.titulo || "")
      ? "nomeImovel"
      : (normalizeName(acao).includes("preco") ? "preco" : "imovel");
    await registrarNovidadeAdmin({
      tipo: "imovel",
      novidadeTema: imovelTema,
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
      destinoId: id,
      itemId: id
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
      novidadeTema: normalizeName(acao).includes("preco") ? "preco" : "automovel",
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
      destinoId: id,
      itemId: id
    });
    showToast("Automovel salvo.");
    resetAutomovelForm();
    await loadAllData();
  });

  $("deleteAutomovelButton")?.addEventListener("click", async () => {
    await excluirAutomovelPorId(state.selectedAutomovelId);
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
    const originalGroup = state.gruposWhatsapp.find((item) => item.id === state.selectedWhatsappGroupId) || {};
    if (isNewGroup) payload.createdAt = serverTimestamp();
    const updates = { [`conteudosInformativos/gruposWhatsapp/${id}`]: payload };
    if (state.selectedWhatsappGroupId && state.selectedWhatsappGroupId !== id) {
      updates[`conteudosInformativos/gruposWhatsapp/${state.selectedWhatsappGroupId}`] = null;
    }
    if (originalGroup.clienteId && originalGroup.clienteId !== payload.clienteId) {
      const originalClient = state.clientes.find((client) => client.id === originalGroup.clienteId);
      if (!originalClient?.grupoWhatsappId || originalClient.grupoWhatsappId === state.selectedWhatsappGroupId) {
        updates[`clientes/${originalGroup.clienteId}/grupoWhatsappId`] = null;
        updates[`clientes/${originalGroup.clienteId}/grupoWhatsappNome`] = null;
        updates[`clientes/${originalGroup.clienteId}/grupoWhatsappLink`] = null;
        updates[`clientes/${originalGroup.clienteId}/grupoWhatsappDescricao`] = null;
        updates[`clientes/${originalGroup.clienteId}/grupoWhatsappImagem`] = null;
        updates[`clientes/${originalGroup.clienteId}/grupoWhatsappAtivo`] = null;
      }
    }
    if (payload.clienteId) {
      const targetClient = state.clientes.find((client) => client.id === payload.clienteId);
      if (targetClient?.grupoWhatsappId && targetClient.grupoWhatsappId !== id) {
        updates[`conteudosInformativos/gruposWhatsapp/${targetClient.grupoWhatsappId}/clienteId`] = null;
        updates[`conteudosInformativos/gruposWhatsapp/${targetClient.grupoWhatsappId}/clienteNome`] = null;
      }
      updates[`clientes/${payload.clienteId}/grupoWhatsappId`] = id;
      updates[`clientes/${payload.clienteId}/grupoWhatsappNome`] = payload.nome;
      updates[`clientes/${payload.clienteId}/grupoWhatsappLink`] = payload.link;
      updates[`clientes/${payload.clienteId}/grupoWhatsappDescricao`] = payload.descricao || "";
      updates[`clientes/${payload.clienteId}/grupoWhatsappImagem`] = payload.imagem || "";
      updates[`clientes/${payload.clienteId}/grupoWhatsappAtivo`] = payload.status === "ativo";
    }
    await update(ref(db), updates);
    const acao = acaoNovidadeAdmin("grupoWhatsapp", isNewGroup, payload);
    await registrarNovidadeAdmin({
      tipo: "grupoWhatsapp",
      titulo: acao,
      acao,
      descricao: acao,
      tituloConteudo: tituloConteudoNovidadeAdmin("grupoWhatsapp", payload),
      estabelecimento: payload.clienteNome || "Olá Carlópolis",
      imagem: imagemPrincipalNovidade(payload),
      categoria: "Grupos WhatsApp",
      destinoTipo: "grupoWhatsapp",
      destinoId: id,
      itemId: id,
      link: payload.link || ""
    });
    showToast("Grupo WhatsApp salvo.");
    resetInfoWhatsappGroupForm();
    await loadAllData();
  });

  $("deleteInfoWhatsappGroupButton")?.addEventListener("click", async () => {
    if (!state.selectedWhatsappGroupId) return;
    const grupo = state.gruposWhatsapp.find((item) => item.id === state.selectedWhatsappGroupId);
    if (!(await confirmarExclusao(grupo?.nome || grupo?.name || state.selectedWhatsappGroupId, "grupo WhatsApp"))) return;
    const updates = { [`conteudosInformativos/gruposWhatsapp/${state.selectedWhatsappGroupId}`]: null };
    if (grupo?.clienteId) {
      const client = state.clientes.find((item) => item.id === grupo.clienteId);
      if (!client?.grupoWhatsappId || client.grupoWhatsappId === state.selectedWhatsappGroupId) {
        updates[`clientes/${grupo.clienteId}/grupoWhatsappId`] = null;
        updates[`clientes/${grupo.clienteId}/grupoWhatsappNome`] = null;
        updates[`clientes/${grupo.clienteId}/grupoWhatsappLink`] = null;
        updates[`clientes/${grupo.clienteId}/grupoWhatsappDescricao`] = null;
        updates[`clientes/${grupo.clienteId}/grupoWhatsappImagem`] = null;
        updates[`clientes/${grupo.clienteId}/grupoWhatsappAtivo`] = null;
      }
    }
    await update(ref(db), updates);
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
    stopClientMetricsRealtime();
    state.profile = null;
    hidePanelLoading();
    $("loginView").classList.remove("hidden");
    $("appView").classList.add("hidden");
    renderClientBillingAlert();
    return;
  }

  showPanelLoading("Validando seu perfil de acesso...");
  try {
    setPanelLoadingProgress(15, "Validando seu perfil de acesso...");
    const profile = await loadProfile(user);
    if (!profile || profile.status === "inativo") {
      await signOut(auth);
      $("loginMessage").textContent = "Usuario sem perfil administrativo ativo.";
      return;
    }

    state.profile = profile;
    setPanelLoadingProgress(25, "Acesso confirmado. Iniciando o painel...");
    await registrarLogAuditoria("Login", "Acesso", "Login realizado no painel");
    resetAdminIdleTimer();
    const initialView = initialViewForProfile();
    prepareInitialView(initialView);
    updateChrome();
    await loadAllData(setPanelLoadingProgress);
    renderClientBillingAlert();
    if (!canManageClients()) renderClientOnlyEditor();
    switchView(initialView);
    setPanelLoadingProgress(100, "Tudo pronto!");
    await new Promise((resolve) => setTimeout(resolve, 250));
    $("appView").classList.remove("hidden");
    hidePanelLoading();
  } catch (error) {
    console.error("Falha ao carregar o painel.", error);
    hidePanelLoading();
    $("appView").classList.add("hidden");
    $("loginView").classList.remove("hidden");
    $("loginMessage").textContent = "Nao foi possivel carregar os dados do painel. Tente entrar novamente.";
    await signOut(auth).catch(() => {});
  }
});
