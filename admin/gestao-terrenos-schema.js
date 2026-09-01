export const TERRAIN_MANAGEMENT_SCHEMA_VERSION = "2026-09-01_v9";

export const OWNER_STATUSES = Object.freeze([
  "potencial_cliente",
  "cliente",
  "aguardando_resposta",
  "ativo",
  "nao_interessado",
  "inativo"
]);

export const OWNER_STATUS_OPTIONS = Object.freeze([
  Object.freeze({ value: "potencial_cliente", label: "Potencial cliente", tone: "potential" }),
  Object.freeze({ value: "cliente", label: "Cliente", tone: "client" }),
  Object.freeze({ value: "aguardando_resposta", label: "Aguardando resposta", tone: "waiting" }),
  Object.freeze({ value: "ativo", label: "Cliente ativo", tone: "active" }),
  Object.freeze({ value: "nao_interessado", label: "N\u00e3o interessado", tone: "not-interested" }),
  Object.freeze({ value: "inativo", label: "Inativo", tone: "inactive" })
]);

export const OWNER_ORIGIN_OPTIONS = Object.freeze([
  Object.freeze({ value: "indicacao", label: "Indica\u00e7\u00e3o" }),
  Object.freeze({ value: "whatsapp", label: "WhatsApp" }),
  Object.freeze({ value: "instagram", label: "Instagram" }),
  Object.freeze({ value: "ola_carlopolis", label: "Ol\u00e1 Carl\u00f3polis" }),
  Object.freeze({ value: "cliente_antigo", label: "Cliente antigo" }),
  Object.freeze({ value: "prospeccao", label: "Prospec\u00e7\u00e3o" }),
  Object.freeze({ value: "outro", label: "Outro" })
]);

export const TERRAIN_STATUSES = Object.freeze([
  "sem_informacao",
  "limpo",
  "monitorar",
  "pode_precisar_limpeza",
  "precisa_limpeza",
  "servico_agendado",
  "proprietario_desconhecido",
  "inativo"
]);

export const TERRAIN_STATUS_OPTIONS = Object.freeze([
  Object.freeze({ value: "sem_informacao", label: "Sem informa\u00e7\u00e3o", tone: "neutral" }),
  Object.freeze({ value: "limpo", label: "Limpo", tone: "clean" }),
  Object.freeze({ value: "monitorar", label: "Monitorar", tone: "monitor" }),
  Object.freeze({ value: "pode_precisar_limpeza", label: "Pode precisar de limpeza", tone: "attention" }),
  Object.freeze({ value: "precisa_limpeza", label: "Precisa de limpeza", tone: "danger" }),
  Object.freeze({ value: "servico_agendado", label: "Servi\u00e7o agendado", tone: "scheduled" }),
  Object.freeze({ value: "proprietario_desconhecido", label: "Propriet\u00e1rio desconhecido", tone: "unknown" }),
  Object.freeze({ value: "inativo", label: "Inativo", tone: "inactive" })
]);

export const TERRAIN_DIFFICULTY_OPTIONS = Object.freeze([
  Object.freeze({ value: "facil", label: "F\u00e1cil" }),
  Object.freeze({ value: "medio", label: "M\u00e9dio" }),
  Object.freeze({ value: "dificil", label: "Dif\u00edcil" }),
  Object.freeze({ value: "muito_dificil", label: "Muito dif\u00edcil" })
]);

export const TERRAIN_GRASS_HEIGHT_OPTIONS = Object.freeze([
  Object.freeze({ value: "ate_30_cm", label: "At\u00e9 30 cm" }),
  Object.freeze({ value: "de_30_a_60_cm", label: "30 a 60 cm" }),
  Object.freeze({ value: "de_60_cm_a_1_m", label: "60 cm a 1 metro" }),
  Object.freeze({ value: "acima_1_m", label: "Acima de 1 metro" })
]);

export const TERRAIN_CHARACTERISTIC_OPTIONS = Object.freeze([
  Object.freeze({ value: "entulho", label: "Entulho" }),
  Object.freeze({ value: "pedras", label: "Pedras" }),
  Object.freeze({ value: "arvores", label: "\u00c1rvores" }),
  Object.freeze({ value: "cerca", label: "Cerca" }),
  Object.freeze({ value: "declive", label: "Declive" }),
  Object.freeze({ value: "construcao", label: "Constru\u00e7\u00e3o" }),
  Object.freeze({ value: "poste", label: "Poste" }),
  Object.freeze({ value: "objetos_abandonados", label: "Objetos abandonados" }),
  Object.freeze({ value: "possivel_presenca_animais", label: "Poss\u00edvel presen\u00e7a de animais" }),
  Object.freeze({ value: "acesso_dificil", label: "Acesso dif\u00edcil" }),
  Object.freeze({ value: "outro", label: "Outro" })
]);

export const TERRAIN_PHOTO_CATEGORY_OPTIONS = Object.freeze([
  Object.freeze({ value: "frente", label: "Frente" }),
  Object.freeze({ value: "lateral", label: "Lateral" }),
  Object.freeze({ value: "rua", label: "Rua" }),
  Object.freeze({ value: "ponto_referencia", label: "Ponto de refer\u00eancia" }),
  Object.freeze({ value: "geral", label: "Geral" }),
  Object.freeze({ value: "outra", label: "Outra" })
]);

export const TERRAIN_BUDGET_STATUS_OPTIONS = Object.freeze([
  Object.freeze({ value: "rascunho", label: "Rascunho", tone: "muted" }),
  Object.freeze({ value: "enviado", label: "Enviado", tone: "info" }),
  Object.freeze({ value: "visualizado", label: "Visualizado", tone: "warning" }),
  Object.freeze({ value: "aprovado", label: "Aprovado", tone: "success" }),
  Object.freeze({ value: "recusado", label: "Recusado", tone: "danger" }),
  Object.freeze({ value: "expirado", label: "Expirado", tone: "muted" })
]);

export const TERRAIN_SERVICE_TYPE_OPTIONS = Object.freeze([
  ["rocada", "Roçada"], ["limpeza_completa", "Limpeza completa"], ["retirada_entulho", "Retirada de entulho"],
  ["recolhimento_galhos", "Recolhimento de galhos"], ["poda", "Poda"], ["aplicacao_produto", "Aplicação de produto"],
  ["limpeza_calcada", "Limpeza de calçada"], ["transporte_residuos", "Transporte de resíduos"], ["outro", "Outro"]
].map(([value, label]) => Object.freeze({ value, label })));

export const TERRAIN_SERVICE_STATUS_OPTIONS = Object.freeze([
  Object.freeze({ value: "aguardando", label: "Aguardando", tone: "muted" }),
  Object.freeze({ value: "agendado", label: "Agendado", tone: "info" }),
  Object.freeze({ value: "em_andamento", label: "Em andamento", tone: "warning" }),
  Object.freeze({ value: "concluido", label: "Concluído", tone: "success" }),
  Object.freeze({ value: "cancelado", label: "Cancelado", tone: "danger" })
]);

export const TERRAIN_PAYMENT_METHOD_OPTIONS = Object.freeze([
  ["pix", "Pix"], ["dinheiro", "Dinheiro"], ["cartao", "Cartão"],
  ["transferencia", "Transferência"], ["outro", "Outro"]
].map(([value, label]) => Object.freeze({ value, label })));

export const TERRAIN_PAYMENT_STATUS_OPTIONS = Object.freeze([
  Object.freeze({ value: "pendente", label: "Pendente", tone: "warning" }),
  Object.freeze({ value: "parcial", label: "Parcial", tone: "info" }),
  Object.freeze({ value: "pago", label: "Pago", tone: "success" }),
  Object.freeze({ value: "cancelado", label: "Cancelado", tone: "danger" })
]);

export const TERRAIN_TIMELINE_TYPE_OPTIONS = Object.freeze([
  ["terrain_created", "Terreno criado", "fa-vector-square", "created"],
  ["owner_linked", "Proprietário vinculado", "fa-link", "owner"],
  ["owner_changed", "Proprietário alterado", "fa-user-pen", "owner"],
  ["inspection_completed", "Vistoria realizada", "fa-clipboard-check", "inspection"],
  ["photo_added", "Foto adicionada", "fa-image", "photo"],
  ["budget_created", "Orçamento criado", "fa-file-invoice-dollar", "budget"],
  ["budget_sent", "Orçamento enviado", "fa-paper-plane", "budget"],
  ["budget_approved", "Orçamento aprovado", "fa-circle-check", "approved"],
  ["service_scheduled", "Serviço agendado", "fa-calendar-check", "service"],
  ["service_completed", "Serviço concluído", "fa-broom", "completed"],
  ["payment_recorded", "Pagamento registrado", "fa-money-bill-transfer", "payment"],
  ["reminder_created", "Lembrete criado", "fa-bell", "reminder"],
  ["contact_recorded", "Contato realizado", "fa-phone-volume", "contact"],
  ["status_changed", "Status alterado", "fa-arrows-rotate", "status"]
].map(([value, label, icon, tone]) => Object.freeze({ value, label, icon, tone })));

export const TERRAIN_MANAGEMENT_ENTITIES = Object.freeze({
  owners: Object.freeze({
    path: "terrenosProprietarios",
    fields: Object.freeze([
      "id", "nome", "cpf_cnpj", "telefone", "whatsapp", "telefone_secundario", "email", "endereco",
      "numero", "bairro", "cidade", "estado", "cep", "observacoes", "origem_cliente",
      "ultimo_contato_em", "status", "created_at", "updated_at"
    ]),
    optionalFields: Object.freeze(["cpf_cnpj", "telefone_secundario", "email", "ultimo_contato_em"]),
    statuses: OWNER_STATUSES
  }),
  terrains: Object.freeze({
    path: "terrenos",
    fields: Object.freeze([
      "id", "owner_id", "development_id", "apelido", "bairro", "rua", "numero",
      "quadra", "lote", "area_m2", "frente_m", "fundo_m", "matricula",
      "inscricao_imobiliaria", "latitude", "longitude", "google_maps_url", "observacoes",
      "grau_dificuldade", "altura_mato", "caracteristicas", "ultima_limpeza_em",
      "intervalo_vistoria", "proxima_vistoria_em", "proxima_vistoria_personalizada",
      "lembrete_verificado_em", "oportunidade_nao_precisa_ate", "status", "created_at", "updated_at"
    ]),
    optionalFields: Object.freeze([
      "owner_id", "development_id", "matricula", "inscricao_imobiliaria", "latitude",
      "longitude", "google_maps_url", "caracteristicas", "ultima_limpeza_em",
      "intervalo_vistoria", "proxima_vistoria_em", "proxima_vistoria_personalizada",
      "lembrete_verificado_em", "oportunidade_nao_precisa_ate"
    ]),
    statuses: TERRAIN_STATUSES
  }),
  developments: Object.freeze({
    path: "terrenosLoteamentos",
    fields: Object.freeze([
      "id", "nome", "bairro", "cidade", "descricao", "observacoes", "planta_imagem_url",
      "planta_imagem_path", "planta_pdf_url", "planta_pdf_path", "created_at", "updated_at"
    ]),
    optionalFields: Object.freeze([
      "planta_imagem_url", "planta_imagem_path", "planta_pdf_url", "planta_pdf_path"
    ])
  }),
  photos: Object.freeze({
    path: "terrenosFotos",
    fields: Object.freeze([
      "id", "terrain_id", "categoria", "url", "path", "created_by_uid",
      "created_by_name", "created_at", "updated_at"
    ]),
    optionalFields: Object.freeze([])
  }),
  inspections: Object.freeze({
    path: "terrenosVistorias",
    fields: Object.freeze([
      "id", "terrain_id", "data", "hora", "responsavel_uid", "responsavel_nome",
      "responsavel_email", "situacao_atual", "altura_mato", "grau_dificuldade",
      "observacoes", "precisa_limpeza", "recomendar_contato", "fotos",
      "created_at", "updated_at"
    ]),
    optionalFields: Object.freeze(["fotos"])
  }),
  budgets: Object.freeze({
    path: "terrenosOrcamentos",
    fields: Object.freeze([
      "id", "numero", "owner_id", "terrain_id", "development_id", "data",
      "validade", "area_m2", "tipo_servico", "descricao", "valor",
      "observacoes", "status", "created_at", "updated_at"
    ]),
    optionalFields: Object.freeze(["development_id"])
  }),
  services: Object.freeze({
    path: "terrenosServicos",
    fields: Object.freeze(["id", "owner_id", "terrain_id", "budget_id", "data_prevista", "data_realizada", "horario", "area_m2", "tipo_servico", "equipamentos", "responsaveis", "tempo_gasto", "valor_cobrado", "valor_recebido", "saldo", "custo", "lucro_estimado", "forma_pagamento", "status_pagamento", "data_pagamento", "observacoes_pagamento", "status", "observacoes", "created_at", "updated_at"]),
    optionalFields: Object.freeze(["budget_id", "data_realizada", "data_pagamento"])
  }),
  servicePhotos: Object.freeze({
    path: "terrenosServicosFotos",
    fields: Object.freeze(["id", "service_id", "terrain_id", "tipo", "url", "path", "created_at", "updated_at"]),
    optionalFields: Object.freeze([])
  }),
  timeline: Object.freeze({
    path: "terrenosTimeline",
    fields: Object.freeze([
      "id", "terrain_id", "data", "hora", "tipo", "descricao",
      "referencia_tipo", "referencia_id", "created_at", "updated_at"
    ]),
    optionalFields: Object.freeze(["referencia_tipo", "referencia_id"])
  })
});

const OWNER_ORIGIN_VALUES = new Set(OWNER_ORIGIN_OPTIONS.map((item) => item.value));
const OWNER_STATUS_VALUES = new Set(OWNER_STATUS_OPTIONS.map((item) => item.value));
const TERRAIN_STATUS_VALUES = new Set(TERRAIN_STATUS_OPTIONS.map((item) => item.value));
const TERRAIN_DIFFICULTY_VALUES = new Set(TERRAIN_DIFFICULTY_OPTIONS.map((item) => item.value));
const TERRAIN_GRASS_HEIGHT_VALUES = new Set(TERRAIN_GRASS_HEIGHT_OPTIONS.map((item) => item.value));
const TERRAIN_CHARACTERISTIC_VALUES = new Set(TERRAIN_CHARACTERISTIC_OPTIONS.map((item) => item.value));
const TERRAIN_PHOTO_CATEGORY_VALUES = new Set(TERRAIN_PHOTO_CATEGORY_OPTIONS.map((item) => item.value));
const TERRAIN_BUDGET_STATUS_VALUES = new Set(TERRAIN_BUDGET_STATUS_OPTIONS.map((item) => item.value));
const TERRAIN_SERVICE_TYPE_VALUES = new Set(TERRAIN_SERVICE_TYPE_OPTIONS.map((item) => item.value));
const TERRAIN_SERVICE_STATUS_VALUES = new Set(TERRAIN_SERVICE_STATUS_OPTIONS.map((item) => item.value));
const TERRAIN_PAYMENT_METHOD_VALUES = new Set(TERRAIN_PAYMENT_METHOD_OPTIONS.map((item) => item.value));
const TERRAIN_PAYMENT_STATUS_VALUES = new Set(TERRAIN_PAYMENT_STATUS_OPTIONS.map((item) => item.value));
const TERRAIN_TIMELINE_TYPE_VALUES = new Set(TERRAIN_TIMELINE_TYPE_OPTIONS.map((item) => item.value));

export function normalizeTerrainOwnerInput(input = {}) {
  const value = (key) => String(input[key] ?? "").trim();
  const owner = {
    nome: value("nome"),
    cpf_cnpj: value("cpf_cnpj"),
    telefone: value("telefone"),
    whatsapp: value("whatsapp"),
    telefone_secundario: value("telefone_secundario"),
    email: value("email").toLowerCase(),
    endereco: value("endereco"),
    numero: value("numero"),
    bairro: value("bairro"),
    cidade: value("cidade"),
    estado: value("estado").toUpperCase().slice(0, 2),
    cep: value("cep"),
    observacoes: value("observacoes"),
    origem_cliente: OWNER_ORIGIN_VALUES.has(value("origem_cliente")) ? value("origem_cliente") : "outro",
    status: OWNER_STATUS_VALUES.has(value("status")) ? value("status") : "potencial_cliente"
  };
  const required = ["nome", "telefone", "whatsapp", "endereco", "numero", "bairro", "cidade", "estado", "cep"];
  const missing = required.filter((key) => !owner[key]);
  if (missing.length) throw new Error(`Campos obrigatorios ausentes: ${missing.join(", ")}`);
  return owner;
}

export function buildTerrainOwnerRecord(input, { id, existing = {}, timestamp = Date.now() } = {}) {
  if (!id) throw new Error("O proprietario precisa de um id.");
  const normalized = normalizeTerrainOwnerInput(input);
  const record = {
    id,
    ...normalized,
    created_at: existing.created_at || timestamp,
    updated_at: timestamp
  };
  if (existing.ultimo_contato_em) record.ultimo_contato_em = existing.ultimo_contato_em;
  return record;
}

export function normalizeTerrainOwnerSearch(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function terrainOwnerRecords(records = {}) {
  const list = Array.isArray(records)
    ? records
    : Object.entries(records || {}).map(([id, owner]) => ({ id, ...(owner || {}) }));
  return list
    .filter((owner) => owner?.id)
    .sort((a, b) => String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR"));
}

export function filterTerrainOwners(records, { name = "", phone = "", status = "" } = {}) {
  const normalizedName = normalizeTerrainOwnerSearch(name);
  const phoneDigits = String(phone || "").replace(/\D/g, "");
  return terrainOwnerRecords(records).filter((owner) => {
    const matchesName = !normalizedName || normalizeTerrainOwnerSearch(owner.nome).includes(normalizedName);
    const ownerPhones = [owner.telefone, owner.whatsapp, owner.telefone_secundario]
      .map((value) => String(value || "").replace(/\D/g, ""))
      .join(" ");
    const matchesPhone = !phoneDigits || ownerPhones.includes(phoneDigits);
    const matchesStatus = !status || owner.status === status;
    return matchesName && matchesPhone && matchesStatus;
  });
}

export function terrainOwnerLinkedTerrains(ownerId, terrains = {}) {
  const list = Array.isArray(terrains)
    ? terrains
    : Object.entries(terrains || {}).map(([id, terrain]) => ({ id, ...(terrain || {}) }));
  return list.filter((terrain) => String(terrain.owner_id || "") === String(ownerId || ""));
}

export function canDeleteTerrainOwner(ownerId, terrains = {}) {
  return terrainOwnerLinkedTerrains(ownerId, terrains).length === 0;
}

export function terrainOwnerStatusMeta(status) {
  return OWNER_STATUS_OPTIONS.find((item) => item.value === status) || OWNER_STATUS_OPTIONS[0];
}

export function terrainOwnerOriginLabel(origin) {
  return OWNER_ORIGIN_OPTIONS.find((item) => item.value === origin)?.label || "Outro";
}

export function terrainOwnerWhatsappUrl(owner = {}) {
  let digits = String(owner.whatsapp || owner.telefone || "").replace(/\D/g, "");
  if (!digits) return "";
  if (!digits.startsWith("55")) digits = `55${digits}`;
  return `https://wa.me/${digits}`;
}

export function formatTerrainOwnerDocument(value) {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 14);
  if (digits.length <= 11) {
    return digits
      .replace(/^(\d{3})(\d)/, "$1.$2")
      .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1-$2");
  }
  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

export function formatTerrainOwnerCep(value) {
  return String(value || "").replace(/\D/g, "").slice(0, 8).replace(/^(\d{5})(\d)/, "$1-$2");
}

function terrainNumber(value, field) {
  if (value === "" || value === null || value === undefined) {
    throw new Error(`Valor inv\u00e1lido para ${field}.`);
  }
  const normalized = typeof value === "string" ? value.replace(",", ".").trim() : value;
  const number = Number(normalized);
  if (!Number.isFinite(number) || number < 0) throw new Error(`Valor inv\u00e1lido para ${field}.`);
  return number;
}

function terrainOptionalCoordinate(value, field, min, max) {
  if (value === "" || value === null || value === undefined) return null;
  const number = Number(String(value).replace(",", "."));
  if (!Number.isFinite(number) || number < min || number > max) {
    throw new Error(`Coordenada inv\u00e1lida para ${field}.`);
  }
  return number;
}

export function normalizeTerrainInput(input = {}) {
  const value = (key) => String(input[key] ?? "").trim();
  const selectedCharacteristics = Array.isArray(input.caracteristicas)
    ? input.caracteristicas
    : Object.entries(input.caracteristicas || {}).filter(([, selected]) => selected).map(([key]) => key);
  const characteristics = selectedCharacteristics.reduce((result, item) => {
    if (TERRAIN_CHARACTERISTIC_VALUES.has(item)) result[item] = true;
    return result;
  }, {});
  const terrain = {
    owner_id: value("owner_id") || null,
    development_id: value("development_id") || null,
    apelido: value("apelido"),
    bairro: value("bairro"),
    rua: value("rua"),
    numero: value("numero"),
    quadra: value("quadra"),
    lote: value("lote"),
    area_m2: terrainNumber(input.area_m2, "\u00e1rea"),
    frente_m: terrainNumber(input.frente_m, "frente"),
    fundo_m: terrainNumber(input.fundo_m, "fundo"),
    matricula: value("matricula") || null,
    inscricao_imobiliaria: value("inscricao_imobiliaria") || null,
    latitude: terrainOptionalCoordinate(input.latitude, "latitude", -90, 90),
    longitude: terrainOptionalCoordinate(input.longitude, "longitude", -180, 180),
    google_maps_url: value("google_maps_url") || null,
    observacoes: value("observacoes"),
    grau_dificuldade: TERRAIN_DIFFICULTY_VALUES.has(value("grau_dificuldade")) ? value("grau_dificuldade") : "",
    altura_mato: TERRAIN_GRASS_HEIGHT_VALUES.has(value("altura_mato")) ? value("altura_mato") : "",
    caracteristicas: Object.keys(characteristics).length ? characteristics : null,
    status: TERRAIN_STATUS_VALUES.has(value("status")) ? value("status") : "sem_informacao"
  };
  const required = [
    "apelido", "bairro", "rua", "numero", "quadra", "lote", "grau_dificuldade", "altura_mato"
  ];
  const missing = required.filter((key) => !terrain[key]);
  if (missing.length) throw new Error(`Campos obrigatorios ausentes: ${missing.join(", ")}`);
  if (terrain.google_maps_url && !/^https?:\/\//i.test(terrain.google_maps_url)) {
    throw new Error("O link do Google Maps precisa iniciar com http:// ou https://.");
  }
  return terrain;
}

export function buildTerrainRecord(input, { id, existing = {}, timestamp = Date.now() } = {}) {
  if (!id) throw new Error("O terreno precisa de um id.");
  const record = {
    id,
    ...normalizeTerrainInput(input),
    created_at: existing.created_at || timestamp,
    updated_at: timestamp
  };
  ["ultima_limpeza_em", "intervalo_vistoria", "proxima_vistoria_em", "proxima_vistoria_personalizada", "lembrete_verificado_em", "oportunidade_nao_precisa_ate"].forEach((key) => {
    if (existing[key]) record[key] = existing[key];
  });
  return record;
}

export function terrainRecords(records = {}) {
  const list = Array.isArray(records)
    ? records
    : Object.entries(records || {}).map(([id, terrain]) => ({ id, ...(terrain || {}) }));
  return list
    .filter((terrain) => terrain?.id)
    .sort((a, b) => {
      const byNeighborhood = String(a.bairro || "").localeCompare(String(b.bairro || ""), "pt-BR");
      if (byNeighborhood) return byNeighborhood;
      const byBlock = String(a.quadra || "").localeCompare(String(b.quadra || ""), "pt-BR", { numeric: true });
      if (byBlock) return byBlock;
      return String(a.lote || "").localeCompare(String(b.lote || ""), "pt-BR", { numeric: true });
    });
}

const TERRAIN_REMINDER_INTERVALS = new Set(["30", "45", "60", "90", "120", "personalizado"]);

function terrainIsoDate(value, field = "data") {
  const normalized = String(value || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) throw new Error(`Valor inválido para ${field}.`);
  const [year, month, day] = normalized.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new Error(`Valor inválido para ${field}.`);
  }
  return normalized;
}

function terrainDateAtUtc(value, field = "data") {
  return new Date(`${terrainIsoDate(value, field)}T00:00:00.000Z`);
}

export function terrainAddDays(value, days) {
  const date = terrainDateAtUtc(value);
  date.setUTCDate(date.getUTCDate() + Number(days || 0));
  return date.toISOString().slice(0, 10);
}

export function buildTerrainReminderSchedule(lastCleaningDate, interval, customDate = "") {
  const lastCleaning = terrainIsoDate(lastCleaningDate, "última limpeza");
  const selectedInterval = TERRAIN_REMINDER_INTERVALS.has(String(interval)) ? String(interval) : "";
  if (!selectedInterval) throw new Error("Selecione quando o terreno deve ser verificado novamente.");
  if (customDate) {
    const custom = terrainIsoDate(customDate, "próxima vistoria personalizada");
    if (custom < lastCleaning) throw new Error("A próxima vistoria não pode ser anterior à última limpeza.");
    return {
      ultima_limpeza_em: lastCleaning,
      intervalo_vistoria: "personalizado",
      proxima_vistoria_em: custom,
      proxima_vistoria_personalizada: custom,
      lembrete_verificado_em: null
    };
  }
  if (selectedInterval === "personalizado") throw new Error("Informe a data personalizada da próxima vistoria.");
  return {
    ultima_limpeza_em: lastCleaning,
    intervalo_vistoria: selectedInterval,
    proxima_vistoria_em: terrainAddDays(lastCleaning, Number(selectedInterval)),
    proxima_vistoria_personalizada: null,
    lembrete_verificado_em: null
  };
}

export function terrainReminderClassification(terrain = {}, today = new Date().toISOString().slice(0, 10)) {
  if (!terrain.ultima_limpeza_em) return null;
  try {
    const lastCleaning = terrainDateAtUtc(terrain.ultima_limpeza_em, "última limpeza");
    const currentDate = terrainDateAtUtc(today, "data atual");
    const elapsedDays = Math.max(0, Math.floor((currentDate - lastCleaning) / 86400000));
    if (elapsedDays <= 30) return { key: "recent", label: "Limpo recentemente", status: "limpo", elapsedDays };
    if (elapsedDays <= 60) return { key: "monitor", label: "Monitorar", status: "monitorar", elapsedDays };
    if (elapsedDays <= 90) return { key: "attention", label: "Pode precisar de limpeza", status: "pode_precisar_limpeza", elapsedDays };
    return { key: "overdue", label: "Precisa de atenção", status: "precisa_limpeza", elapsedDays };
  } catch {
    return null;
  }
}

export function terrainReminderAutomaticStatus(terrain = {}, today = new Date().toISOString().slice(0, 10)) {
  const statusRank = { sem_informacao: -1, limpo: 0, monitorar: 1, pode_precisar_limpeza: 2, precisa_limpeza: 3 };
  if (!Object.prototype.hasOwnProperty.call(statusRank, terrain.status)) return terrain.status || "sem_informacao";
  const classification = terrainReminderClassification(terrain, today);
  if (!classification || statusRank[classification.status] <= statusRank[terrain.status]) return terrain.status;
  return classification.status;
}

export function terrainReminderGroups(records = {}, today = new Date().toISOString().slice(0, 10)) {
  const currentDate = terrainDateAtUtc(today, "data atual");
  const groups = { hoje: [], atrasados: [], proximos_7_dias: [], proximos_30_dias: [] };
  terrainRecords(records).forEach((terrain) => {
    if (!terrain.proxima_vistoria_em || terrain.status === "inativo") return;
    let reminderDate;
    try {
      reminderDate = terrainDateAtUtc(terrain.proxima_vistoria_em, "próxima vistoria");
    } catch {
      return;
    }
    const daysUntil = Math.floor((reminderDate - currentDate) / 86400000);
    const item = { ...terrain, daysUntil, classification: terrainReminderClassification(terrain, today) };
    if (daysUntil < 0) groups.atrasados.push(item);
    else if (daysUntil === 0) groups.hoje.push(item);
    else if (daysUntil <= 7) groups.proximos_7_dias.push(item);
    else if (daysUntil <= 30) groups.proximos_30_dias.push(item);
  });
  Object.values(groups).forEach((items) => items.sort((a, b) => String(a.proxima_vistoria_em).localeCompare(String(b.proxima_vistoria_em))));
  return groups;
}

function terrainOpportunityDaysBetween(from, to) {
  try {
    return Math.floor((terrainDateAtUtc(to) - terrainDateAtUtc(from)) / 86400000);
  } catch {
    return null;
  }
}

function terrainOpportunityDateLabel(value) {
  const parts = String(value || "").split("-");
  return parts.length === 3 ? parts.reverse().join("/") : "";
}

export function terrainOpportunityRecords(data = {}, today = new Date().toISOString().slice(0, 10)) {
  terrainIsoDate(today, "data atual");
  const terrains = data.terrains || {};
  const owners = data.owners || {};
  const developments = data.developments || {};
  const inspections = data.inspections || {};
  const budgets = terrainBudgetRecords(data.budgets || {});
  const services = terrainServiceRecords(data.services || {});
  const completedServices = services.filter((service) => service.status === "concluido" && Number(service.valor_cobrado || 0) > 0);
  const pricedServices = completedServices.filter((service) => Number(service.area_m2 || 0) > 0);
  const totalServiceArea = pricedServices.reduce((total, service) => total + Number(service.area_m2 || 0), 0);
  const averageSquareMeter = totalServiceArea > 0
    ? pricedServices.reduce((total, service) => total + Number(service.valor_cobrado || 0), 0) / totalServiceArea
    : 0;
  return terrainRecords(terrains).flatMap((terrain) => {
    if (terrain.status === "inativo" || (terrain.oportunidade_nao_precisa_ate && terrain.oportunidade_nao_precisa_ate >= today)) return [];
    const owner = terrain.owner_id ? owners[terrain.owner_id] || null : null;
    const development = terrain.development_id ? developments[terrain.development_id] || null : null;
    const latestInspection = terrainInspectionRecords(inspections, terrain.id)[0] || null;
    const terrainBudgets = budgets.filter((budget) => budget.terrain_id === terrain.id);
    const pendingBudget = terrainBudgets.find((budget) => ["rascunho", "enviado", "visualizado"].includes(budget.status)) || null;
    const terrainServices = completedServices
      .filter((service) => service.terrain_id === terrain.id)
      .sort((a, b) => String(b.data_realizada || b.data_prevista || "").localeCompare(String(a.data_realizada || a.data_prevista || "")));
    const latestService = terrainServices[0] || null;
    const latestValuedBudget = terrainBudgets.find((budget) => Number(budget.valor || 0) > 0) || null;
    const priceCandidates = [
      latestService ? { date: latestService.data_realizada || latestService.data_prevista || "", value: Number(latestService.valor_cobrado || 0) } : null,
      latestValuedBudget ? { date: latestValuedBudget.data || "", value: Number(latestValuedBudget.valor || 0) } : null
    ].filter((item) => item && item.value > 0).sort((a, b) => String(b.date).localeCompare(String(a.date)));
    const lastValue = Number(priceCandidates[0]?.value || 0);
    const estimatedValue = lastValue > 0 ? lastValue : Number(terrain.area_m2 || 0) * averageSquareMeter;
    const classification = terrainReminderClassification(terrain, today);
    const daysSinceCleaning = classification?.elapsedDays ?? null;
    const daysUntilInspection = terrain.proxima_vistoria_em ? terrainOpportunityDaysBetween(today, terrain.proxima_vistoria_em) : null;
    const daysSinceContact = owner?.ultimo_contato_em ? terrainOpportunityDaysBetween(owner.ultimo_contato_em, today) : null;
    const needsCleaning = terrain.status === "precisa_limpeza" || latestInspection?.precisa_limpeza === true || latestInspection?.situacao_atual === "precisa_limpeza";
    const inspectionRecommendsContact = latestInspection?.recomendar_contato === true;
    const overdue = daysUntilInspection !== null && daysUntilInspection < 0;
    const next7Days = daysUntilInspection !== null && daysUntilInspection >= 1 && daysUntilInspection <= 7;
    const next30Days = daysUntilInspection !== null && daysUntilInspection >= 8 && daysUntilInspection <= 30;
    const dueToday = daysUntilInspection === 0;
    const longPeriod = daysSinceCleaning !== null && daysSinceCleaning > 90;
    const neverCleaned = !terrain.ultima_limpeza_em;
    const unknownOwner = !owner;
    const contactDue = Boolean(owner) && (daysSinceContact === null || daysSinceContact >= 30);
    const hasOpportunity = needsCleaning || inspectionRecommendsContact || overdue || dueToday || next7Days || next30Days || longPeriod || neverCleaned || unknownOwner || Boolean(pendingBudget) || contactDue;
    if (!hasOpportunity) return [];
    let statusKey = "proxima_vistoria";
    let statusLabel = "Próxima vistoria";
    if (needsCleaning) [statusKey, statusLabel] = ["precisa_limpeza", "Precisa de limpeza"];
    else if (overdue) [statusKey, statusLabel] = ["vistoria_atrasada", "Vistoria atrasada"];
    else if (inspectionRecommendsContact) [statusKey, statusLabel] = ["contato_recomendado", "Contato recomendado"];
    else if (longPeriod) [statusKey, statusLabel] = ["longo_periodo", "Precisa de atenção"];
    else if (pendingBudget) [statusKey, statusLabel] = ["orcamento_pendente", "Orçamento pendente"];
    else if (neverCleaned) [statusKey, statusLabel] = ["nunca_limpo", "Nunca limpo"];
    else if (unknownOwner) [statusKey, statusLabel] = ["proprietario_desconhecido", "Proprietário desconhecido"];
    else if (contactDue) [statusKey, statusLabel] = ["contato_pendente", "Contato pendente"];
    const contactToday = needsCleaning || inspectionRecommendsContact || overdue || dueToday || longPeriod || Boolean(pendingBudget) || contactDue;
    return [{
      id: terrain.id,
      terrain_id: terrain.id,
      owner_id: terrain.owner_id || "",
      development_id: terrain.development_id || "",
      proprietario: owner?.nome || "Proprietário desconhecido",
      whatsapp: owner?.whatsapp || owner?.telefone || "",
      loteamento: development?.nome || "Sem loteamento",
      quadra: terrain.quadra || "",
      lote: terrain.lote || "",
      apelido: terrain.apelido || "",
      ultima_limpeza_em: terrain.ultima_limpeza_em || "",
      dias_desde_ultima_limpeza: daysSinceCleaning,
      proxima_vistoria_em: terrain.proxima_vistoria_em || "",
      ultimo_contato_em: owner?.ultimo_contato_em || "",
      ultimo_valor: lastValue,
      valor_estimado: estimatedValue,
      status: statusKey,
      status_label: statusLabel,
      pending_budget_id: pendingBudget?.id || "",
      flags: {
        contatar_hoje: contactToday,
        atrasado: overdue,
        proximos_7_dias: next7Days,
        proximos_30_dias: next30Days,
        precisa_limpeza: needsCleaning,
        nunca_limpo: neverCleaned,
        proprietario_desconhecido: unknownOwner,
        orcamento_pendente: Boolean(pendingBudget)
      }
    }];
  }).sort((a, b) => {
    if (a.flags.contatar_hoje !== b.flags.contatar_hoje) return a.flags.contatar_hoje ? -1 : 1;
    return String(a.proxima_vistoria_em || "9999-12-31").localeCompare(String(b.proxima_vistoria_em || "9999-12-31"));
  });
}

export function filterTerrainOpportunities(records = [], filter = "todos") {
  const opportunities = Array.isArray(records) ? records : [];
  const flagByFilter = {
    contatar_hoje: "contatar_hoje",
    atrasados: "atrasado",
    proximos_7_dias: "proximos_7_dias",
    proximos_30_dias: "proximos_30_dias",
    precisa_limpeza: "precisa_limpeza",
    nunca_limpos: "nunca_limpo",
    proprietario_desconhecido: "proprietario_desconhecido",
    orcamento_pendente: "orcamento_pendente"
  };
  const flag = flagByFilter[filter];
  return flag ? opportunities.filter((opportunity) => opportunity.flags?.[flag]) : opportunities;
}

export function terrainOpportunityWhatsappUrl(opportunity = {}) {
  let digits = String(opportunity.whatsapp || "").replace(/\D/g, "");
  if (!digits) return "";
  if (!digits.startsWith("55")) digits = `55${digits}`;
  const location = [
    opportunity.loteamento && opportunity.loteamento !== "Sem loteamento" ? `no ${opportunity.loteamento}` : "",
    opportunity.quadra ? `quadra ${opportunity.quadra}` : "",
    opportunity.lote ? `lote ${opportunity.lote}` : ""
  ].filter(Boolean).join(", ");
  const referenceValue = Number(opportunity.ultimo_valor || opportunity.valor_estimado || 0);
  const message = [
    `Olá, ${opportunity.proprietario || "tudo bem"}!`,
    `Estamos acompanhando o terreno ${opportunity.apelido || "cadastrado"}${location ? `, ${location}` : ""}.`,
    opportunity.ultima_limpeza_em
      ? `A última limpeza registrada foi em ${terrainOpportunityDateLabel(opportunity.ultima_limpeza_em)}.`
      : "Ainda não há uma limpeza registrada para este terreno.",
    `Situação atual: ${opportunity.status_label || "acompanhamento pendente"}.`,
    referenceValue > 0 ? `A referência registrada é ${referenceValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }).replace(/\u00a0/g, " ")}.` : "",
    "Podemos agendar uma vistoria ou preparar um orçamento atualizado?"
  ].filter(Boolean).join("\n");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function buildTerrainOpportunityActionUpdate(action, { today = new Date().toISOString().slice(0, 10), days = 30 } = {}) {
  const date = terrainIsoDate(today, "data do contato");
  if (action === "contact") return { ultimo_contato_em: date };
  if (action === "not_needed") {
    const delayDays = Number(days);
    if (!Number.isInteger(delayDays) || delayDays < 1 || delayDays > 365) throw new Error("O adiamento deve ficar entre 1 e 365 dias.");
    return { oportunidade_nao_precisa_ate: terrainAddDays(date, delayDays) };
  }
  throw new Error("Ação de oportunidade inválida.");
}

export function terrainOwnerName(terrain = {}, owners = {}) {
  return terrain.owner_id ? (owners?.[terrain.owner_id]?.nome || "Propriet\u00e1rio n\u00e3o encontrado") : "Sem propriet\u00e1rio";
}

export function terrainDevelopmentName(terrain = {}, developments = {}) {
  return terrain.development_id ? (developments?.[terrain.development_id]?.nome || "Loteamento n\u00e3o encontrado") : "Sem loteamento";
}

export function filterTerrains(records, filters = {}, owners = {}, developments = {}) {
  const search = normalizeTerrainOwnerSearch(filters.search);
  const neighborhood = normalizeTerrainOwnerSearch(filters.bairro);
  const block = normalizeTerrainOwnerSearch(filters.quadra);
  const lot = normalizeTerrainOwnerSearch(filters.lote);
  return terrainRecords(records).filter((terrain) => {
    const haystack = normalizeTerrainOwnerSearch([
      terrain.apelido, terrain.bairro, terrain.rua, terrain.numero, terrain.quadra, terrain.lote,
      terrain.matricula, terrain.inscricao_imobiliaria,
      terrainOwnerName(terrain, owners), terrainDevelopmentName(terrain, developments)
    ].filter(Boolean).join(" "));
    return (!search || haystack.includes(search))
      && (!filters.owner_id || terrain.owner_id === filters.owner_id)
      && (!filters.development_id || terrain.development_id === filters.development_id)
      && (!neighborhood || normalizeTerrainOwnerSearch(terrain.bairro) === neighborhood)
      && (!filters.status || terrain.status === filters.status)
      && (!block || normalizeTerrainOwnerSearch(terrain.quadra).includes(block))
      && (!lot || normalizeTerrainOwnerSearch(terrain.lote).includes(lot));
  });
}

export function terrainStatusMeta(status) {
  return TERRAIN_STATUS_OPTIONS.find((item) => item.value === status) || TERRAIN_STATUS_OPTIONS[0];
}

export function terrainDifficultyLabel(value) {
  return TERRAIN_DIFFICULTY_OPTIONS.find((item) => item.value === value)?.label || "-";
}

export function terrainGrassHeightLabel(value) {
  return TERRAIN_GRASS_HEIGHT_OPTIONS.find((item) => item.value === value)?.label || "-";
}

export function terrainCharacteristicLabels(characteristics = {}) {
  return TERRAIN_CHARACTERISTIC_OPTIONS
    .filter((item) => characteristics?.[item.value])
    .map((item) => item.label);
}

export function terrainMapsUrl(terrain = {}) {
  const explicitUrl = String(terrain.google_maps_url || "").trim();
  if (/^https?:\/\//i.test(explicitUrl)) return explicitUrl;
  if (terrain.latitude === "" || terrain.latitude === null || terrain.latitude === undefined) return "";
  if (terrain.longitude === "" || terrain.longitude === null || terrain.longitude === undefined) return "";
  const latitude = Number(terrain.latitude);
  const longitude = Number(terrain.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return "";
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return "";
  return `https://www.google.com/maps?q=${latitude},${longitude}`;
}

export function normalizeTerrainDevelopmentInput(input = {}) {
  const value = (key) => String(input[key] ?? "").trim();
  const development = {
    nome: value("nome"),
    bairro: value("bairro"),
    cidade: value("cidade"),
    descricao: value("descricao"),
    observacoes: value("observacoes"),
    planta_imagem_url: value("planta_imagem_url") || null,
    planta_imagem_path: value("planta_imagem_path") || null,
    planta_pdf_url: value("planta_pdf_url") || null,
    planta_pdf_path: value("planta_pdf_path") || null
  };
  const required = ["nome", "bairro", "cidade", "descricao", "observacoes"];
  const missing = required.filter((key) => !development[key]);
  if (missing.length) throw new Error(`Campos obrigatorios ausentes: ${missing.join(", ")}`);
  return development;
}

export function buildTerrainDevelopmentRecord(input, { id, existing = {}, timestamp = Date.now() } = {}) {
  if (!id) throw new Error("O loteamento precisa de um id.");
  return {
    id,
    ...normalizeTerrainDevelopmentInput(input),
    created_at: existing.created_at || timestamp,
    updated_at: timestamp
  };
}

export function terrainDevelopmentRecords(records = {}) {
  const list = Array.isArray(records)
    ? records
    : Object.entries(records || {}).map(([id, development]) => ({ id, ...(development || {}) }));
  return list
    .filter((development) => development?.id)
    .sort((a, b) => String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR"));
}

export function filterTerrainDevelopments(records, search = "") {
  const term = normalizeTerrainOwnerSearch(search);
  return terrainDevelopmentRecords(records).filter((development) => {
    if (!term) return true;
    return normalizeTerrainOwnerSearch([
      development.nome, development.bairro, development.cidade, development.descricao
    ].filter(Boolean).join(" ")).includes(term);
  });
}

export function terrainDevelopmentLinkedTerrains(developmentId, terrains = {}) {
  return terrainRecords(terrains).filter(
    (terrain) => String(terrain.development_id || "") === String(developmentId || "")
  );
}

export function canDeleteTerrainDevelopment(developmentId, terrains = {}) {
  return terrainDevelopmentLinkedTerrains(developmentId, terrains).length === 0;
}

export function terrainDevelopmentPlanContext(developmentId, terrains = {}, owners = {}) {
  return terrainDevelopmentLinkedTerrains(developmentId, terrains).map((terrain) => ({
    development_id: developmentId,
    terrain_id: terrain.id,
    quadra: terrain.quadra || "",
    lote: terrain.lote || "",
    owner_id: terrain.owner_id || null,
    owner_name: terrainOwnerName(terrain, owners)
  }));
}

export function validateTerrainDevelopmentPlanFile(file = {}, kind = "image") {
  const type = String(file.type || "").toLowerCase();
  const name = String(file.name || "");
  const size = Number(file.size || 0);
  const isImage = type.startsWith("image/") || /\.(png|jpe?g|webp|gif)$/i.test(name);
  const isPdf = type === "application/pdf" || /\.pdf$/i.test(name);
  if (kind === "image" && !isImage) throw new Error("Selecione uma imagem válida para a planta.");
  if (kind === "pdf" && !isPdf) throw new Error("Selecione um arquivo PDF válido para a planta.");
  const maxSize = kind === "pdf" ? 15 * 1024 * 1024 : 8 * 1024 * 1024;
  if (!size || size > maxSize) {
    throw new Error(kind === "pdf" ? "O PDF deve ter no máximo 15 MB." : "A imagem deve ter no máximo 8 MB.");
  }
  return true;
}

export function terrainDevelopmentPlanStoragePath(developmentId, file = {}, kind = "image", timestamp = Date.now()) {
  if (!developmentId) throw new Error("O loteamento precisa de um id para receber a planta.");
  validateTerrainDevelopmentPlanFile(file, kind);
  const folder = kind === "pdf" ? "pdf" : "imagem";
  const filename = String(file.name || `planta-${folder}`)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || `planta-${folder}`;
  return `gestao-terrenos/loteamentos/${developmentId}/${folder}/${timestamp}-${filename}`;
}

export function clampTerrainPlanZoom(value) {
  return Math.min(4, Math.max(1, Number(value) || 1));
}

export function validateTerrainImageFile(file = {}) {
  const type = String(file.type || "").toLowerCase();
  const name = String(file.name || "");
  const size = Number(file.size || 0);
  const isImage = type.startsWith("image/") || /\.(png|jpe?g|webp|gif|heic|heif|avif)$/i.test(name);
  if (!isImage) throw new Error("Selecione somente arquivos de imagem.");
  if (!size || size > 8 * 1024 * 1024) throw new Error("Cada imagem deve ter no m\u00e1ximo 8 MB.");
  return true;
}

function terrainImageFilename(file = {}) {
  return String(file.name || "foto")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "foto";
}

export function terrainGeneralPhotoStoragePath(terrainId, file = {}, timestamp = Date.now(), index = 0) {
  if (!terrainId) throw new Error("O terreno precisa de um id para receber fotos.");
  validateTerrainImageFile(file);
  return `gestao-terrenos/terrenos/${terrainId}/fotos-gerais/${timestamp}-${index}-${terrainImageFilename(file)}`;
}

export function terrainInspectionPhotoStoragePath(terrainId, inspectionId, file = {}, timestamp = Date.now(), index = 0) {
  if (!terrainId || !inspectionId) throw new Error("A vistoria precisa estar vinculada a um terreno.");
  validateTerrainImageFile(file);
  return `gestao-terrenos/terrenos/${terrainId}/vistorias/${inspectionId}/${timestamp}-${index}-${terrainImageFilename(file)}`;
}

export function buildTerrainPhotoRecord(input = {}, { id, timestamp = Date.now() } = {}) {
  if (!id) throw new Error("A foto precisa de um id.");
  const value = (key) => String(input[key] ?? "").trim();
  const category = TERRAIN_PHOTO_CATEGORY_VALUES.has(value("categoria")) ? value("categoria") : "geral";
  const record = {
    id,
    terrain_id: value("terrain_id"),
    categoria: category,
    url: value("url"),
    path: value("path"),
    created_by_uid: value("created_by_uid"),
    created_by_name: value("created_by_name"),
    created_at: timestamp,
    updated_at: timestamp
  };
  const missing = ["terrain_id", "url", "path", "created_by_uid", "created_by_name"].filter((key) => !record[key]);
  if (missing.length) throw new Error(`Campos obrigatorios ausentes: ${missing.join(", ")}`);
  return record;
}

export function terrainPhotoRecords(records = {}, terrainId = "") {
  const list = Array.isArray(records)
    ? records
    : Object.entries(records || {}).map(([id, photo]) => ({ id, ...(photo || {}) }));
  return list
    .filter((photo) => photo?.id && (!terrainId || photo.terrain_id === terrainId))
    .sort((a, b) => Number(b.created_at || 0) - Number(a.created_at || 0));
}

export function terrainPhotoCategoryLabel(category) {
  return TERRAIN_PHOTO_CATEGORY_OPTIONS.find((item) => item.value === category)?.label || "Geral";
}

export function normalizeTerrainInspectionInput(input = {}) {
  const value = (key) => String(input[key] ?? "").trim();
  const inspection = {
    terrain_id: value("terrain_id"),
    data: value("data"),
    hora: value("hora"),
    responsavel_uid: value("responsavel_uid"),
    responsavel_nome: value("responsavel_nome"),
    responsavel_email: value("responsavel_email").toLowerCase(),
    situacao_atual: TERRAIN_STATUS_VALUES.has(value("situacao_atual")) ? value("situacao_atual") : "sem_informacao",
    altura_mato: TERRAIN_GRASS_HEIGHT_VALUES.has(value("altura_mato")) ? value("altura_mato") : "",
    grau_dificuldade: TERRAIN_DIFFICULTY_VALUES.has(value("grau_dificuldade")) ? value("grau_dificuldade") : "",
    observacoes: value("observacoes"),
    precisa_limpeza: input.precisa_limpeza === true || input.precisa_limpeza === "true",
    recomendar_contato: input.recomendar_contato === true || input.recomendar_contato === "true",
    fotos: input.fotos && typeof input.fotos === "object" && Object.keys(input.fotos).length ? input.fotos : null
  };
  const required = [
    "terrain_id", "data", "hora", "responsavel_uid", "responsavel_nome", "responsavel_email",
    "situacao_atual", "altura_mato", "grau_dificuldade", "observacoes"
  ];
  const missing = required.filter((key) => !inspection[key]);
  if (missing.length) throw new Error(`Campos obrigatorios ausentes: ${missing.join(", ")}`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(inspection.data)) throw new Error("Data da vistoria inv\u00e1lida.");
  if (!/^\d{2}:\d{2}$/.test(inspection.hora)) throw new Error("Hora da vistoria inv\u00e1lida.");
  return inspection;
}

export function buildTerrainInspectionRecord(input, { id, timestamp = Date.now() } = {}) {
  if (!id) throw new Error("A vistoria precisa de um id.");
  return {
    id,
    ...normalizeTerrainInspectionInput(input),
    created_at: timestamp,
    updated_at: timestamp
  };
}

export function terrainInspectionRecords(records = {}, terrainId = "") {
  const list = Array.isArray(records)
    ? records
    : Object.entries(records || {}).map(([id, inspection]) => ({ id, ...(inspection || {}) }));
  return list
    .filter((inspection) => inspection?.id && (!terrainId || inspection.terrain_id === terrainId))
    .sort((a, b) => {
      const dateCompare = `${b.data || ""}T${b.hora || ""}`.localeCompare(`${a.data || ""}T${a.hora || ""}`);
      return dateCompare || Number(b.created_at || 0) - Number(a.created_at || 0);
    });
}

export function terrainStatusAfterInspection(currentStatus, inspection = {}) {
  if (currentStatus === "inativo") return "inativo";
  if (inspection.precisa_limpeza === true) return "precisa_limpeza";
  return TERRAIN_STATUS_VALUES.has(inspection.situacao_atual)
    ? inspection.situacao_atual
    : (TERRAIN_STATUS_VALUES.has(currentStatus) ? currentStatus : "sem_informacao");
}

export function formatTerrainBudgetNumber(sequence, year = new Date().getFullYear()) {
  const number = Math.max(1, Math.trunc(Number(sequence) || 1));
  const normalizedYear = Math.trunc(Number(year) || new Date().getFullYear());
  return `ORC-${normalizedYear}-${String(number).padStart(4, "0")}`;
}

export function normalizeTerrainBudgetInput(input = {}) {
  const value = (key) => String(input[key] ?? "").trim();
  const budget = {
    numero: value("numero"),
    owner_id: value("owner_id"),
    terrain_id: value("terrain_id"),
    development_id: value("development_id") || null,
    data: value("data"),
    validade: value("validade"),
    area_m2: terrainNumber(input.area_m2, "\u00e1rea"),
    tipo_servico: value("tipo_servico"),
    descricao: value("descricao"),
    valor: terrainNumber(input.valor, "valor"),
    observacoes: value("observacoes"),
    status: TERRAIN_BUDGET_STATUS_VALUES.has(value("status")) ? value("status") : "rascunho"
  };
  const required = [
    "numero", "owner_id", "terrain_id", "data", "validade", "tipo_servico", "descricao"
  ];
  const missing = required.filter((key) => !budget[key]);
  if (missing.length) throw new Error(`Campos obrigatorios ausentes: ${missing.join(", ")}`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(budget.data) || !/^\d{4}-\d{2}-\d{2}$/.test(budget.validade)) {
    throw new Error("Data ou validade do or\u00e7amento inv\u00e1lida.");
  }
  if (budget.validade < budget.data) throw new Error("A validade não pode ser anterior à data do orçamento.");
  return budget;
}

export function buildTerrainBudgetRecord(input, { id, existing = {}, timestamp = Date.now() } = {}) {
  if (!id) throw new Error("O or\u00e7amento precisa de um id.");
  return {
    id,
    ...normalizeTerrainBudgetInput(input),
    created_at: existing.created_at || timestamp,
    updated_at: timestamp
  };
}

export function terrainBudgetRecords(records = {}) {
  const list = Array.isArray(records)
    ? records
    : Object.entries(records || {}).map(([id, budget]) => ({ id, ...(budget || {}) }));
  return list
    .filter((budget) => budget?.id)
    .sort((a, b) => {
      const byDate = String(b.data || "").localeCompare(String(a.data || ""));
      return byDate || String(b.numero || "").localeCompare(String(a.numero || ""), "pt-BR", { numeric: true });
    });
}

export function filterTerrainBudgets(records, filters = {}, terrains = {}) {
  const from = String(filters.date_from || "");
  const to = String(filters.date_to || "");
  return terrainBudgetRecords(records).filter((budget) => {
    const developmentId = budget.development_id || terrains?.[budget.terrain_id]?.development_id || "";
    if (filters.status && budget.status !== filters.status) return false;
    if (filters.owner_id && budget.owner_id !== filters.owner_id) return false;
    if (filters.development_id && developmentId !== filters.development_id) return false;
    if (from && String(budget.data || "") < from) return false;
    if (to && String(budget.data || "") > to) return false;
    return true;
  });
}

export function terrainBudgetStatusMeta(status) {
  return TERRAIN_BUDGET_STATUS_OPTIONS.find((item) => item.value === status)
    || TERRAIN_BUDGET_STATUS_OPTIONS[0];
}

export function terrainBudgetWhatsappUrl(budget = {}, owner = {}, terrain = {}) {
  let digits = String(owner.whatsapp || owner.telefone || "").replace(/\D/g, "");
  if (!digits) return "";
  if (!digits.startsWith("55")) digits = `55${digits}`;
  const amount = Number(budget.valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).replace(/\u00a0/g, " ");
  const validity = String(budget.validade || "").split("-").reverse().join("/");
  const message = [
    `Olá, ${owner.nome || "tudo bem"}!`,
    `Segue o orçamento ${budget.numero || ""} para o terreno ${terrain.apelido || ""}.`,
    `Serviço: ${budget.tipo_servico || "-"}.`,
    `Valor: ${amount}.`,
    `Validade: ${validity || "-"}.`
  ].join("\n");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function terrainServiceTypeLabel(type) {
  return TERRAIN_SERVICE_TYPE_OPTIONS.find((item) => item.value === type)?.label || "Outro";
}

export function terrainServiceStatusMeta(status) {
  return TERRAIN_SERVICE_STATUS_OPTIONS.find((item) => item.value === status) || TERRAIN_SERVICE_STATUS_OPTIONS[0];
}

export function terrainServiceTypeFromText(text) {
  const value = String(text || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (value.includes("rocada")) return "rocada";
  if (value.includes("entulho")) return "retirada_entulho";
  if (value.includes("galho")) return "recolhimento_galhos";
  if (value.includes("poda")) return "poda";
  if (value.includes("produto")) return "aplicacao_produto";
  if (value.includes("calcada")) return "limpeza_calcada";
  if (value.includes("transporte") || value.includes("residuo")) return "transporte_residuos";
  if (value.includes("limpeza")) return "limpeza_completa";
  return "outro";
}

export function terrainServiceInputFromBudget(budget = {}, terrain = {}, today = "") {
  return {
    owner_id: budget.owner_id || terrain.owner_id || "", terrain_id: budget.terrain_id || terrain.id || "",
    budget_id: budget.id || "", data_prevista: today, data_realizada: "", horario: "",
    area_m2: budget.area_m2 ?? terrain.area_m2 ?? 0, tipo_servico: terrainServiceTypeFromText(budget.tipo_servico),
    equipamentos: "", responsaveis: "", tempo_gasto: "", valor_cobrado: budget.valor ?? 0, custo: 0,
    forma_pagamento: "pix", status_pagamento: "pendente", valor_recebido: 0, saldo: Number(budget.valor || 0),
    data_pagamento: "", observacoes_pagamento: "", status: "aguardando",
    observacoes: [budget.descricao, budget.observacoes].filter(Boolean).join("\n")
  };
}

export function normalizeTerrainServiceInput(input = {}) {
  const value = (key) => String(input[key] ?? "").trim();
  const charged = terrainNumber(input.valor_cobrado, "valor cobrado");
  const received = terrainNumber(input.valor_recebido ?? 0, "valor recebido");
  const cost = terrainNumber(input.custo, "custo");
  if (received > charged) throw new Error("O valor recebido não pode ser maior que o valor total.");
  const balance = Math.max(charged - received, 0);
  const requestedPaymentStatus = value("status_pagamento");
  const paymentStatus = requestedPaymentStatus === "cancelado"
    ? "cancelado"
    : (received <= 0 ? "pendente" : (balance <= 0 ? "pago" : "parcial"));
  const normalizedPaymentMethod = value("forma_pagamento").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const service = {
    owner_id: value("owner_id"), terrain_id: value("terrain_id"), budget_id: value("budget_id") || null,
    data_prevista: value("data_prevista"), data_realizada: value("data_realizada") || null, horario: value("horario"),
    area_m2: terrainNumber(input.area_m2, "área"),
    tipo_servico: TERRAIN_SERVICE_TYPE_VALUES.has(value("tipo_servico")) ? value("tipo_servico") : "outro",
    equipamentos: value("equipamentos"), responsaveis: value("responsaveis"), tempo_gasto: value("tempo_gasto"),
    valor_cobrado: charged, valor_recebido: received, saldo: balance,
    custo: cost, lucro_estimado: charged - cost,
    forma_pagamento: TERRAIN_PAYMENT_METHOD_VALUES.has(normalizedPaymentMethod) ? normalizedPaymentMethod : "outro",
    status_pagamento: TERRAIN_PAYMENT_STATUS_VALUES.has(paymentStatus) ? paymentStatus : "pendente",
    data_pagamento: value("data_pagamento") || null, observacoes_pagamento: value("observacoes_pagamento"),
    status: TERRAIN_SERVICE_STATUS_VALUES.has(value("status")) ? value("status") : "aguardando",
    observacoes: value("observacoes")
  };
  const missing = ["owner_id", "terrain_id", "data_prevista", "horario", "responsaveis", "forma_pagamento"].filter((key) => !service[key]);
  if (missing.length) throw new Error(`Campos obrigatorios ausentes: ${missing.join(", ")}`);
  return service;
}

export function buildTerrainServiceRecord(input, { id, existing = {}, timestamp = Date.now(), today = "" } = {}) {
  if (!id) throw new Error("O serviço precisa de um id.");
  const service = normalizeTerrainServiceInput(input);
  if (service.status === "concluido" && !service.data_realizada) service.data_realizada = today || service.data_prevista;
  return { id, ...service, created_at: existing.created_at || timestamp, updated_at: timestamp };
}

export function terrainServiceRecords(records = {}) {
  const list = Array.isArray(records) ? records : Object.entries(records || {}).map(([id, item]) => ({ id, ...(item || {}) }));
  return list.filter((item) => item?.id).sort((a, b) => String(b.data_prevista || "").localeCompare(String(a.data_prevista || "")));
}

export function terrainPaymentMethodLabel(method) {
  return TERRAIN_PAYMENT_METHOD_OPTIONS.find((item) => item.value === method)?.label || "Outro";
}

export function terrainPaymentStatusMeta(status) {
  return TERRAIN_PAYMENT_STATUS_OPTIONS.find((item) => item.value === status) || TERRAIN_PAYMENT_STATUS_OPTIONS[0];
}

function terrainFinanceReferenceDate(service = {}) {
  return String(service.data_realizada || service.data_prevista || "").slice(0, 10);
}

export function calculateTerrainFinance(records = {}, filters = {}) {
  const now = new Date();
  const year = String(filters.year || now.getFullYear());
  const month = String(filters.month || (now.getMonth() + 1)).padStart(2, "0");
  const paymentStatus = String(filters.paymentStatus || "todos");
  const eligible = terrainServiceRecords(records).filter((service) => service.status !== "cancelado" && service.status_pagamento !== "cancelado");
  const statusFiltered = paymentStatus === "todos" ? eligible : eligible.filter((service) => service.status_pagamento === paymentStatus);
  const annual = statusFiltered.filter((service) => terrainFinanceReferenceDate(service).startsWith(`${year}-`));
  const monthly = annual.filter((service) => terrainFinanceReferenceDate(service).startsWith(`${year}-${month}-`));
  const sum = (items, field) => items.reduce((total, item) => total + Number(item[field] || 0), 0);
  const billing = sum(monthly, "valor_cobrado");
  const area = sum(monthly, "area_m2");
  return {
    year,
    month,
    records: monthly,
    pendingRecords: monthly.filter((service) => ["pendente", "parcial"].includes(service.status_pagamento) && Number(service.saldo ?? service.valor_cobrado) > 0),
    faturamento_mes: billing,
    faturamento_anual: sum(annual, "valor_cobrado"),
    valores_pagos: sum(monthly, "valor_recebido"),
    valores_pendentes: monthly.reduce((total, service) => total + Number(service.saldo ?? Math.max(Number(service.valor_cobrado || 0) - Number(service.valor_recebido || 0), 0)), 0),
    custos: sum(monthly, "custo"),
    lucro_estimado: billing - sum(monthly, "custo"),
    ticket_medio: monthly.length ? billing / monthly.length : 0,
    valor_medio_m2: area > 0 ? billing / area : 0
  };
}

export function terrainServicePhotoStoragePath(terrainId, serviceId, type, file = {}, timestamp = Date.now(), index = 0) {
  if (!terrainId || !serviceId || !["antes", "depois"].includes(type)) throw new Error("Destino da foto inválido.");
  validateTerrainImageFile(file);
  return `gestao-terrenos/terrenos/${terrainId}/servicos/${serviceId}/${type}/${timestamp}-${index}-${terrainImageFilename(file)}`;
}

export function buildTerrainServicePhotoRecord(input = {}, { id, timestamp = Date.now() } = {}) {
  if (!id) throw new Error("A foto precisa de um id.");
  const record = { id, service_id: String(input.service_id || ""), terrain_id: String(input.terrain_id || ""), tipo: ["antes", "depois"].includes(input.tipo) ? input.tipo : "antes", url: String(input.url || ""), path: String(input.path || ""), created_at: timestamp, updated_at: timestamp };
  if (["service_id", "terrain_id", "url", "path"].some((key) => !record[key])) throw new Error("Dados incompletos da foto.");
  return record;
}

export function terrainServicePhotoRecords(records = {}, serviceId = "", type = "") {
  const list = Array.isArray(records) ? records : Object.entries(records || {}).map(([id, item]) => ({ id, ...(item || {}) }));
  return list.filter((photo) => photo?.id && (!serviceId || photo.service_id === serviceId) && (!type || photo.tipo === type));
}

function terrainTimelineKeyPart(value, fallback = "registro") {
  const normalized = String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
  return normalized || fallback;
}

export function terrainTimelineEventId(terrainId, type, referenceId = "", qualifier = "") {
  if (!terrainId || !TERRAIN_TIMELINE_TYPE_VALUES.has(String(type || ""))) {
    throw new Error("Terreno ou tipo inválido para a timeline.");
  }
  return [
    terrainTimelineKeyPart(terrainId, "terreno"),
    terrainTimelineKeyPart(type, "evento"),
    terrainTimelineKeyPart(referenceId, "terreno"),
    qualifier ? terrainTimelineKeyPart(qualifier, "ocorrencia") : ""
  ].filter(Boolean).join("__").slice(0, 240);
}

export function buildTerrainTimelineEvent(input = {}, { id, timestamp = Date.now() } = {}) {
  const terrainId = String(input.terrain_id || "").trim();
  const type = String(input.tipo || "").trim();
  const description = String(input.descricao || "").trim();
  const date = String(input.data || "").trim();
  const time = String(input.hora || "").trim().slice(0, 5);
  if (!id || !terrainId || !description || !TERRAIN_TIMELINE_TYPE_VALUES.has(type)) {
    throw new Error("Dados incompletos do evento da timeline.");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
    throw new Error("Data ou hora inválida na timeline.");
  }
  return {
    id,
    terrain_id: terrainId,
    data: date,
    hora: time,
    tipo: type,
    descricao: description,
    referencia_tipo: String(input.referencia_tipo || "").trim() || null,
    referencia_id: String(input.referencia_id || "").trim() || null,
    created_at: timestamp,
    updated_at: timestamp
  };
}

export function terrainTimelineRecords(records = {}, terrainId = "") {
  const list = Array.isArray(records)
    ? records
    : Object.entries(records || {}).map(([id, item]) => ({ id, ...(item || {}) }));
  return list.filter((item) => item?.id && (!terrainId || item.terrain_id === terrainId)).sort((a, b) => {
    const byMoment = `${b.data || ""}T${b.hora || ""}`.localeCompare(`${a.data || ""}T${a.hora || ""}`);
    return byMoment || Number(b.created_at || 0) - Number(a.created_at || 0) || String(b.id).localeCompare(String(a.id));
  });
}

export function terrainTimelineTypeMeta(type) {
  return TERRAIN_TIMELINE_TYPE_OPTIONS.find((item) => item.value === type)
    || Object.freeze({ value: type || "status_changed", label: "Atualização", icon: "fa-clock-rotate-left", tone: "status" });
}

function terrainReportDate(value) {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  const timestamp = Number(value || 0);
  if (!Number.isFinite(timestamp) || timestamp <= 0) return "";
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function terrainRecordInPeriod(value, from, to) {
  const date = terrainReportDate(value);
  if (!date) return false;
  return (!from || date >= from) && (!to || date <= to);
}

function terrainGroupCount(records, field, emptyLabel) {
  return records.reduce((groups, record) => {
    const key = String(record?.[field] || "").trim() || emptyLabel;
    groups[key] = (groups[key] || 0) + 1;
    return groups;
  }, {});
}

function terrainServiceMinutes(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return 0;
  if (/^\d{1,3}:\d{2}$/.test(raw)) {
    const [hours, minutes] = raw.split(":").map(Number);
    return hours * 60 + minutes;
  }
  const hours = Number(raw.match(/([\d.,]+)\s*h/)?.[1]?.replace(",", ".") || 0);
  const minutes = Number(raw.match(/([\d.,]+)\s*m/)?.[1]?.replace(",", ".") || 0);
  if (hours || minutes) return Math.round(hours * 60 + minutes);
  const numeric = Number(raw.replace(",", "."));
  return Number.isFinite(numeric) ? Math.round(numeric * 60) : 0;
}

function terrainDaysBetween(first, second) {
  const start = Date.parse(`${first}T12:00:00Z`);
  const end = Date.parse(`${second}T12:00:00Z`);
  return Number.isFinite(start) && Number.isFinite(end) ? Math.round((end - start) / 86400000) : 0;
}

export function calculateTerrainRevenueForecast(data = {}, today = new Date().toISOString().slice(0, 10)) {
  const terrains = terrainRecords(data.terrains || {});
  const services = terrainServiceRecords(data.services || {}).filter((service) => (
    service.status === "concluido"
    && service.status_pagamento !== "cancelado"
    && terrainReportDate(service.data_realizada || service.data_prevista) <= today
  ));
  const predictions = [];
  terrains.forEach((terrain) => {
    const history = services.filter((service) => service.terrain_id === terrain.id)
      .sort((a, b) => String(a.data_realizada || "").localeCompare(String(b.data_realizada || "")));
    if (!history.length) return;
    const dates = history.map((service) => terrainReportDate(service.data_realizada)).filter(Boolean);
    const intervals = dates.slice(1).map((date, index) => terrainDaysBetween(dates[index], date)).filter((days) => days > 0);
    const configuredInterval = Number.parseInt(terrain.intervalo_vistoria, 10);
    const averageInterval = intervals.length
      ? Math.max(1, Math.round(intervals.reduce((sum, days) => sum + days, 0) / intervals.length))
      : ([30, 45, 60, 90, 120].includes(configuredInterval) ? configuredInterval : 0);
    const lastCleaning = terrainReportDate(terrain.ultima_limpeza_em) || dates.at(-1);
    const values = history.map((service) => Number(service.valor_cobrado || 0)).filter((value) => value > 0);
    const averageValue = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
    if (!lastCleaning || !averageInterval || !averageValue) return;
    let expectedDate = terrainAddDays(lastCleaning, averageInterval);
    while (expectedDate < today) expectedDate = terrainAddDays(expectedDate, averageInterval);
    const horizon = terrainAddDays(today, 90);
    while (expectedDate <= horizon) {
      predictions.push({
        terrain_id: terrain.id,
        owner_id: terrain.owner_id || "",
        expected_date: expectedDate,
        estimated_value: averageValue,
        average_interval_days: averageInterval,
        last_cleaning: lastCleaning
      });
      expectedDate = terrainAddDays(expectedDate, averageInterval);
    }
  });
  predictions.sort((a, b) => a.expected_date.localeCompare(b.expected_date));
  const sumUntil = (days) => {
    const limit = terrainAddDays(today, days);
    return predictions.filter((item) => item.expected_date <= limit).reduce((sum, item) => sum + item.estimated_value, 0);
  };
  const byMonth = predictions.reduce((months, item) => {
    const month = item.expected_date.slice(0, 7);
    months[month] = (months[month] || 0) + item.estimated_value;
    return months;
  }, {});
  return { predictions, next_30_days: sumUntil(30), next_60_days: sumUntil(60), next_90_days: sumUntil(90), by_month: byMonth };
}

export function calculateTerrainDashboard(data = {}, today = new Date().toISOString().slice(0, 10)) {
  const terrains = terrainRecords(data.terrains || {});
  const owners = terrainOwnerRecords(data.owners || {});
  const services = terrainServiceRecords(data.services || {});
  const budgets = terrainBudgetRecords(data.budgets || {});
  const reminders = terrainReminderGroups(data.terrains || {}, today);
  const opportunities = terrainOpportunityRecords(data, today);
  const month = today.slice(0, 7);
  const completedThisMonth = services.filter((service) => service.status === "concluido" && terrainReportDate(service.data_realizada).startsWith(month));
  const activeServices = services.filter((service) => service.status === "agendado" && String(service.data_prevista || "") >= today)
    .sort((a, b) => `${a.data_prevista || ""}T${a.horario || ""}`.localeCompare(`${b.data_prevista || ""}T${b.horario || ""}`));
  const pendingBudgets = budgets.filter((budget) => ["rascunho", "enviado", "visualizado"].includes(budget.status));
  const pendingValues = services.filter((service) => service.status_pagamento !== "cancelado")
    .reduce((sum, service) => sum + Number(service.saldo ?? Math.max(Number(service.valor_cobrado || 0) - Number(service.valor_recebido || 0), 0)), 0);
  const priorityRank = {
    precisa_limpeza: 0,
    vistoria_atrasada: 1,
    contato_recomendado: 2,
    longo_periodo: 3,
    orcamento_pendente: 4,
    contato_pendente: 5,
    proxima_vistoria: 6,
    nunca_limpo: 7,
    proprietario_desconhecido: 8
  };
  const priorityOpportunities = [...opportunities].sort((a, b) =>
    (priorityRank[a.status] ?? 9) - (priorityRank[b.status] ?? 9)
    || Number(b.dias_desde_ultima_limpeza || 0) - Number(a.dias_desde_ultima_limpeza || 0));
  return {
    total_terrains: terrains.length,
    total_owners: owners.length,
    terrains_to_verify: reminders.hoje.length + reminders.atrasados.length,
    scheduled_services: activeServices.length,
    pending_budgets: pendingBudgets.length,
    completed_services_month: completedThisMonth.length,
    monthly_billing: completedThisMonth.reduce((sum, service) => sum + Number(service.valor_cobrado || 0), 0),
    pending_values: pendingValues,
    open_opportunities: opportunities.length,
    potential_revenue: opportunities.reduce((sum, item) => sum + Number(item.valor_estimado || 0), 0),
    today_terrains: reminders.hoje,
    upcoming_services: activeServices,
    priority_opportunities: priorityOpportunities
  };
}

export function calculateTerrainReports(data = {}, filters = {}) {
  const today = String(filters.today || new Date().toISOString().slice(0, 10));
  const from = String(filters.date_from || "");
  const to = String(filters.date_to || "");
  const owners = terrainOwnerRecords(data.owners || {});
  const terrains = terrainRecords(data.terrains || {});
  const services = terrainServiceRecords(data.services || {}).filter((service) => terrainRecordInPeriod(service.data_realizada || service.data_prevista, from, to));
  const completed = services.filter((service) => service.status === "concluido");
  const budgets = terrainBudgetRecords(data.budgets || {}).filter((budget) => terrainRecordInPeriod(budget.data, from, to));
  const periodOwners = owners.filter((owner) => terrainRecordInPeriod(owner.created_at, from, to));
  const periodTerrains = terrains.filter((terrain) => terrainRecordInPeriod(terrain.created_at, from, to));
  const completedByOwner = completed.reduce((counts, service) => {
    counts[service.owner_id] = (counts[service.owner_id] || 0) + 1;
    return counts;
  }, {});
  const serviceIntervals = [];
  const byTerrain = completed.reduce((groups, service) => {
    (groups[service.terrain_id] ||= []).push(terrainReportDate(service.data_realizada));
    return groups;
  }, {});
  Object.values(byTerrain).forEach((dates) => {
    const sortedDates = dates.filter(Boolean).sort();
    sortedDates.slice(1).forEach((date, index) => {
      const days = terrainDaysBetween(sortedDates[index], date);
      if (days > 0) serviceIntervals.push(days);
    });
  });
  const minutes = completed.map((service) => terrainServiceMinutes(service.tempo_gasto)).filter((value) => value > 0);
  const totalServiceValue = completed.reduce((sum, service) => sum + Number(service.valor_cobrado || 0), 0);
  const totalServiceArea = completed.reduce((sum, service) => sum + Number(service.area_m2 || 0), 0);
  const sentIds = new Set(terrainTimelineRecords(data.timeline || {}).filter((event) => event.tipo === "budget_sent").map((event) => event.referencia_id));
  const sentBudgets = budgets.filter((budget) => sentIds.has(budget.id) || budget.status !== "rascunho");
  const approved = budgets.filter((budget) => budget.status === "aprovado");
  const refused = budgets.filter((budget) => budget.status === "recusado");
  const validServices = services.filter((service) => service.status !== "cancelado" && service.status_pagamento !== "cancelado");
  const billing = validServices.reduce((sum, service) => sum + Number(service.valor_cobrado || 0), 0);
  const costs = validServices.reduce((sum, service) => sum + Number(service.custo || 0), 0);
  return {
    period: { from, to, today },
    clients: {
      active: owners.filter((owner) => owner.status === "ativo").length,
      new: periodOwners.length,
      recurring: Object.values(completedByOwner).filter((count) => count >= 2).length,
      inactive: owners.filter((owner) => owner.status === "inativo").length
    },
    terrains: {
      total: periodTerrains.length,
      total_area: periodTerrains.reduce((sum, terrain) => sum + Number(terrain.area_m2 || 0), 0),
      by_neighborhood: terrainGroupCount(periodTerrains, "bairro", "Não informado"),
      by_development: periodTerrains.reduce((groups, terrain) => {
        const key = data.developments?.[terrain.development_id]?.nome || "Sem loteamento";
        groups[key] = (groups[key] || 0) + 1;
        return groups;
      }, {}),
      by_status: terrainGroupCount(periodTerrains, "status", "sem_informacao"),
      without_owner: periodTerrains.filter((terrain) => !terrain.owner_id).length
    },
    services: {
      count: completed.length,
      total_area: totalServiceArea,
      average_ticket: completed.length ? totalServiceValue / completed.length : 0,
      average_per_m2: totalServiceArea ? totalServiceValue / totalServiceArea : 0,
      average_minutes: minutes.length ? minutes.reduce((sum, value) => sum + value, 0) / minutes.length : 0,
      average_cleaning_interval_days: serviceIntervals.length ? serviceIntervals.reduce((sum, value) => sum + value, 0) / serviceIntervals.length : 0
    },
    budgets: {
      sent: sentBudgets.length,
      approved: approved.length,
      refused: refused.length,
      pending: budgets.filter((budget) => ["rascunho", "enviado", "visualizado"].includes(budget.status)).length,
      conversion_rate: sentBudgets.length ? approved.length / sentBudgets.length * 100 : 0,
      quoted_value: budgets.reduce((sum, budget) => sum + Number(budget.valor || 0), 0),
      approved_value: approved.reduce((sum, budget) => sum + Number(budget.valor || 0), 0)
    },
    finance: {
      billing,
      costs,
      profit: billing - costs,
      pending: validServices.reduce((sum, service) => sum + Number(service.saldo ?? Math.max(Number(service.valor_cobrado || 0) - Number(service.valor_recebido || 0), 0)), 0)
    },
    forecast: calculateTerrainRevenueForecast(data, today)
  };
}
