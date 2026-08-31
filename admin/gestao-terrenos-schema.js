export const TERRAIN_MANAGEMENT_SCHEMA_VERSION = "2026-08-31_v7";

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

export const TERRAIN_MANAGEMENT_ENTITIES = Object.freeze({
  owners: Object.freeze({
    path: "terrenosProprietarios",
    fields: Object.freeze([
      "id", "nome", "cpf_cnpj", "telefone", "whatsapp", "telefone_secundario", "email", "endereco",
      "numero", "bairro", "cidade", "estado", "cep", "observacoes", "origem_cliente",
      "status", "created_at", "updated_at"
    ]),
    optionalFields: Object.freeze(["cpf_cnpj", "telefone_secundario", "email"]),
    statuses: OWNER_STATUSES
  }),
  terrains: Object.freeze({
    path: "terrenos",
    fields: Object.freeze([
      "id", "owner_id", "development_id", "apelido", "bairro", "rua", "numero",
      "quadra", "lote", "area_m2", "frente_m", "fundo_m", "matricula",
      "inscricao_imobiliaria", "latitude", "longitude", "google_maps_url", "observacoes",
      "grau_dificuldade", "altura_mato", "caracteristicas", "status", "created_at", "updated_at"
    ]),
    optionalFields: Object.freeze([
      "owner_id", "development_id", "matricula", "inscricao_imobiliaria", "latitude",
      "longitude", "google_maps_url", "caracteristicas"
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
  return {
    id,
    ...normalized,
    created_at: existing.created_at || timestamp,
    updated_at: timestamp
  };
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
  return {
    id,
    ...normalizeTerrainInput(input),
    created_at: existing.created_at || timestamp,
    updated_at: timestamp
  };
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
